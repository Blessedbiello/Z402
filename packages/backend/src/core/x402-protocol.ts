import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import prisma from '../db';

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
          amount: new Prisma.Decimal(request.amount),
          currency: 'ZEC',
          status: 'CREATED',
          resourceUrl: request.resourceUrl,
          zcashAddress: merchantAddress,
          paymentHash: nonce,
          metadata: request.metadata,
          expiresAt,
        },
      });

      // Generate signature for challenge
      const challengeData = {
        paymentId: paymentIntent.id,
        amount: request.amount,
        currency: 'ZEC',
        merchantAddress,
        resourceUrl: request.resourceUrl,
        expiresAt: expiresAt.toISOString(),
        nonce,
      };

      const signature = this.signChallenge(challengeData);

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

      // Verify signature
      const signatureValid = this.verifySignature(
        authorization,
        paymentIntent.paymentHash || ''
      );

      if (!signatureValid) {
        return {
          valid: false,
          error: 'Invalid signature',
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
   * Sign challenge data
   */
  private static signChallenge(data: Record<string, unknown>): string {
    const message = JSON.stringify(data);
    // In production, use merchant's private key for signing
    // For now, use HMAC with server secret
    const secret = process.env.CHALLENGE_SIGNING_SECRET || 'change-me-in-production';
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }

  /**
   * Verify authorization signature
   */
  private static verifySignature(
    authorization: X402Authorization,
    nonce: string
  ): boolean {
    try {
      // Verify timestamp (within 5 minutes)
      const timeDiff = Math.abs(Date.now() - authorization.timestamp);
      if (timeDiff > 5 * 60 * 1000) {
        logger.warn('Authorization timestamp too old', {
          timeDiff,
          paymentId: authorization.paymentId,
        });
        return false;
      }

      // Reconstruct signature data
      const signatureData = [
        authorization.paymentId,
        authorization.clientAddress,
        authorization.timestamp,
        nonce,
      ].join('|');

      // In production, verify with client's public key
      // For now, verify HMAC
      const secret = process.env.CHALLENGE_SIGNING_SECRET || 'change-me-in-production';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signatureData)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(authorization.signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Signature verification failed', error);
      return false;
    }
  }

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
   * Generate payment proof (for client)
   */
  static generatePaymentProof(
    paymentId: string,
    clientAddress: string,
    nonce: string
  ): string {
    const timestamp = Date.now();
    const signatureData = [paymentId, clientAddress, timestamp, nonce].join(
      '|'
    );

    const secret = process.env.CHALLENGE_SIGNING_SECRET || 'change-me-in-production';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signatureData)
      .digest('hex');

    return `X402 paymentId="${paymentId}", clientAddress="${clientAddress}", signature="${signature}", timestamp="${timestamp}"`;
  }
}
