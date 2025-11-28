import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../config/logger';
import prisma from '../db';
import { ZcashCryptoService } from '../services/zcash-crypto.service';

/**
 * X402 Protocol Implementation
 * HTTP 402 Payment Required protocol for Zcash micropayments
 */

export interface X402Challenge {
  paymentId: string;
  amount: number;
  currency: string;
  merchantAddress: string;
  resourceUrl: string;
  expiresAt: Date;
  nonce: string;
  signature: string;
}

export interface X402Authorization {
  paymentId: string;
  txid?: string;
  clientAddress: string;
  signature: string;
  timestamp: number;
}

export interface X402PaymentRequest {
  merchantId: string;
  resourceUrl: string;
  amount: number;
  metadata?: Record<string, unknown>;
  expiresInSeconds?: number;
}

export interface X402VerificationResult {
  valid: boolean;
  paymentId?: string;
  transactionId?: string;
  error?: string;
}

export class X402Protocol {
  /**
   * Generate payment challenge (402 response)
   */
  static async generateChallenge(
    request: X402PaymentRequest
  ): Promise<X402Challenge> {
    try {
      // Get merchant details
      const merchant = await prisma.merchant.findUnique({
        where: { id: request.merchantId },
        select: {
          id: true,
          zcashAddress: true,
          zcashShieldedAddress: true,
          settings: true,
        },
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Determine which address to use (prefer shielded if available)
      const merchantAddress =
        merchant.zcashShieldedAddress || merchant.zcashAddress;

      // Calculate expiration
      const expiresInSeconds = request.expiresInSeconds || 3600; // Default 1 hour
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      // Generate nonce for uniqueness
      const nonce = crypto.randomBytes(16).toString('hex');

      // Create payment intent in database
      const paymentIntent = await prisma.paymentIntent.create({
        data: {
          merchantId: request.merchantId,
          amount: new Decimal(request.amount),
          currency: 'ZEC',
          status: 'CREATED',
          resourceUrl: request.resourceUrl,
          zcashAddress: merchantAddress,
          paymentHash: nonce,
          metadata: request.metadata,
          expiresAt,
        },
      });

      // Create challenge string for client to sign with their Zcash private key
      // Note: The signature field here is the challenge string itself, not a server signature
      // The client must sign this challenge with their private key
      const challengeString = ZcashCryptoService.createChallenge(
        paymentIntent.id,
        request.amount.toString(),
        merchantAddress,
        Date.now()
      );

      const signature = challengeString; // This will be signed by the client

      logger.info('X402 challenge generated', {
        paymentId: paymentIntent.id,
        amount: request.amount,
        resourceUrl: request.resourceUrl,
      });

      return {
        paymentId: paymentIntent.id,
        amount: request.amount,
        currency: 'ZEC',
        merchantAddress,
        resourceUrl: request.resourceUrl,
        expiresAt,
        nonce,
        signature,
      };
    } catch (error) {
      logger.error('Failed to generate X402 challenge', error);
      throw error;
    }
  }

  /**
   * Verify payment authorization
   */
  static async verifyAuthorization(
    authorization: X402Authorization
  ): Promise<X402VerificationResult> {
    try {
      // Find payment intent
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { id: authorization.paymentId },
        include: { merchant: true },
      });

      if (!paymentIntent) {
        return {
          valid: false,
          error: 'Payment intent not found',
        };
      }

      // Check expiration
      if (paymentIntent.expiresAt < new Date()) {
        await prisma.paymentIntent.update({
          where: { id: authorization.paymentId },
          data: { status: 'EXPIRED' },
        });

        return {
          valid: false,
          error: 'Payment intent expired',
        };
      }

      // Check if already processed
      if (paymentIntent.status !== 'CREATED') {
        return {
          valid: false,
          error: `Payment intent already ${paymentIntent.status.toLowerCase()}`,
        };
      }

      // Verify Zcash cryptographic signature
      // The client should have signed the challenge with their private key
      const challengeString = ZcashCryptoService.createChallenge(
        paymentIntent.id,
        paymentIntent.amount.toString(),
        paymentIntent.zcashAddress,
        paymentIntent.createdAt.getTime()
      );

      const signatureVerification = await ZcashCryptoService.verifyX402Authorization(
        challengeString,
        authorization.signature,
        authorization.clientAddress
      );

      if (!signatureVerification.valid) {
        logger.warn('X402 signature verification failed', {
          paymentId: authorization.paymentId,
          clientAddress: authorization.clientAddress,
          error: signatureVerification.error,
        });
        return {
          valid: false,
          error: signatureVerification.error || 'Invalid signature',
        };
      }

      // Check for existing transaction with same payment intent
      const existingTx = await prisma.transaction.findFirst({
        where: {
          paymentIntentId: authorization.paymentId,
          status: { in: ['PENDING', 'VERIFIED', 'SETTLED'] },
        },
      });

      if (existingTx) {
        return {
          valid: false,
          error: 'Payment already submitted',
        };
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          merchantId: paymentIntent.merchantId,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: 'ZEC',
          status: 'PENDING',
          resourceUrl: paymentIntent.resourceUrl,
          clientAddress: authorization.clientAddress,
          transactionId: authorization.txid,
          paymentHash: paymentIntent.paymentHash,
          metadata: paymentIntent.metadata,
          expiresAt: paymentIntent.expiresAt,
        },
      });

      // Update payment intent status
      await prisma.paymentIntent.update({
        where: { id: authorization.paymentId },
        data: { status: 'PROCESSING' },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          merchantId: paymentIntent.merchantId,
          action: 'PAYMENT_CREATED',
          resourceType: 'Transaction',
          resourceId: transaction.id,
          metadata: {
            paymentId: authorization.paymentId,
            amount: paymentIntent.amount.toString(),
            clientAddress: authorization.clientAddress,
          },
        },
      });

      logger.info('X402 authorization verified', {
        paymentId: authorization.paymentId,
        transactionId: transaction.id,
      });

      return {
        valid: true,
        paymentId: authorization.paymentId,
        transactionId: transaction.id,
      };
    } catch (error) {
      logger.error('Failed to verify X402 authorization', error);
      return {
        valid: false,
        error: 'Verification failed',
      };
    }
  }

  /**
   * Format 402 response headers
   */
  static format402Headers(challenge: X402Challenge): Record<string, string> {
    const challengeHeader = [
      `paymentId="${challenge.paymentId}"`,
      `amount="${challenge.amount}"`,
      `currency="${challenge.currency}"`,
      `address="${challenge.merchantAddress}"`,
      `resource="${challenge.resourceUrl}"`,
      `expires="${challenge.expiresAt.toISOString()}"`,
      `nonce="${challenge.nonce}"`,
      `signature="${challenge.signature}"`,
    ].join(', ');

    return {
      'WWW-Authenticate': `X402 ${challengeHeader}`,
      'X-Payment-Required': 'true',
      'X-Payment-Amount': challenge.amount.toString(),
      'X-Payment-Currency': challenge.currency,
      'X-Payment-Address': challenge.merchantAddress,
    };
  }

  /**
   * Parse Authorization header
   */
  static parseAuthorizationHeader(header: string): X402Authorization | null {
    try {
      // Expected format: X402 paymentId="...", clientAddress="...", signature="...", timestamp="..."
      if (!header.startsWith('X402 ')) {
        return null;
      }

      const params = header.substring(5);
      const matches = params.matchAll(/(\w+)="([^"]+)"/g);

      const data: Record<string, string> = {};
      for (const match of matches) {
        data[match[1]] = match[2];
      }

      if (!data.paymentId || !data.clientAddress || !data.signature) {
        return null;
      }

      return {
        paymentId: data.paymentId,
        txid: data.txid,
        clientAddress: data.clientAddress,
        signature: data.signature,
        timestamp: parseInt(data.timestamp || Date.now().toString(), 10),
      };
    } catch (error) {
      logger.error('Failed to parse Authorization header', error);
      return null;
    }
  }

  /**
   * DEPRECATED: Old HMAC-based methods removed
   * Now using proper Zcash cryptographic signatures via ZcashCryptoService
   *
   * Security: Signatures are now verified using ECDSA (secp256k1) for transparent addresses,
   * proving that the client controls the private key for their claimed Zcash address.
   */

  /**
   * Check payment status
   */
  static async getPaymentStatus(paymentId: string): Promise<{
    status: string;
    transactionId?: string;
    confirmations?: number;
    settled?: boolean;
  }> {
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id: paymentId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!paymentIntent) {
      throw new Error('Payment not found');
    }

    const transaction = paymentIntent.transactions[0];

    return {
      status: paymentIntent.status,
      transactionId: transaction?.transactionId || undefined,
      confirmations: transaction?.confirmations || 0,
      settled: transaction?.status === 'SETTLED',
    };
  }

  /**
   * Generate payment proof hash (for verification without exposing details)
   * Note: The actual payment proof with signature should be generated client-side
   * using the client's Zcash private key
   */
  static generatePaymentProofHash(
    transactionId: string,
    amount: string,
    fromAddress: string,
    toAddress: string
  ): string {
    return ZcashCryptoService.generatePaymentProof(
      transactionId,
      amount,
      fromAddress,
      toAddress
    );
  }
}
