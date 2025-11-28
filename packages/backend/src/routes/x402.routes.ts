import { Router, Request, Response } from 'express';
import { X402Protocol } from '../core/x402-protocol';
import { VerificationService } from '../services/verify.service';
import { SettlementService } from '../services/settle.service';
import { zcashClient } from '../integrations/zcash';
import { ZcashCryptoService } from '../services/zcash-crypto.service';
import { authenticate } from '../middleware/auth';
import { logger } from '../config/logger';
import prisma from '../db';
import { Decimal } from '@prisma/client/runtime/library';
import {
  X402VerifyRequest,
  X402SettleRequest,
  X402VerifyResponse,
  X402SettleResponse,
  X402SupportedResponse,
  X402PaymentHeader,
} from '../types/x402.types';
import {
  decodePaymentHeader,
  validateX402Version,
  validateSchemeNetworkMatch,
  validatePaymentAmount,
  validateRecipientAddress,
  validateTimestamp,
  validatePaymentHeader,
  extractTransparentPayload,
  zatoshisToZec,
} from '../utils/x402.utils';

const router = Router();

// ============================================================================
// STANDARD X-402 FACILITATOR ENDPOINTS (Coinbase X-402 Spec)
// ============================================================================
// These endpoints implement the standard X-402 protocol for interoperability
// with other X-402 compatible systems and clients.
// ============================================================================

/**
 * GET /api/v1/x402/supported
 * Returns supported payment schemes and networks
 *
 * Standard X-402 endpoint (public, no authentication required)
 */
router.get('/supported', async (_req: Request, res: Response) => {
  try {
    const network = process.env.ZCASH_NETWORK || 'testnet';

    const response: X402SupportedResponse = {
      kinds: [
        {
          scheme: 'zcash-transparent',
          network: network as 'mainnet' | 'testnet',
        },
        {
          scheme: 'zcash-shielded',
          network: network as 'mainnet' | 'testnet',
        },
      ],
    };

    res.status(200).json(response);
      return;
  } catch (error) {
    logger.error('GET /supported failed:', error);
    res.status(500).json({ error: 'Failed to fetch supported payment methods' });
  }
});

/**
 * POST /api/v1/x402/verify
 * Verify payment without settlement (Standard X-402)
 *
 * This is the standard X-402 verification endpoint that accepts
 * base64-encoded payment headers and payment requirements.
 *
 * Public endpoint (called by clients)
 */
router.post('/verify-standard', async (req: Request, res: Response): Promise<void> => {
  try {
    const { x402Version, paymentHeader, paymentRequirements }: X402VerifyRequest = req.body;

    // Validate version
    if (!validateX402Version(x402Version)) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: `Unsupported X-402 version: ${x402Version}`,
      };
      res.status(200).json(response);
      return;
    }

    // Decode payment header
    let decodedHeader: X402PaymentHeader;
    try {
      decodedHeader = decodePaymentHeader(paymentHeader);
    } catch (error) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: 'Invalid payment header encoding',
      };
      res.status(200).json(response);
      return;
    }

    // Validate payment header structure
    const headerValidation = validatePaymentHeader(decodedHeader);
    if (!headerValidation.isValid) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: headerValidation.error,
      };
      res.status(200).json(response);
      return;
    }

    // Validate scheme/network match
    const schemeNetworkValidation = validateSchemeNetworkMatch(
      decodedHeader.scheme,
      decodedHeader.network,
      paymentRequirements.scheme,
      paymentRequirements.network
    );

    if (!schemeNetworkValidation.isValid) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: schemeNetworkValidation.error,
      };
      res.status(200).json(response);
      return;
    }

    // Extract transparent payload (currently only transparent is fully supported)
    const payload = extractTransparentPayload(decodedHeader);
    if (!payload) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: 'Only zcash-transparent scheme is currently supported',
      };
      res.status(200).json(response);
      return;
    }

    // Validate timestamp
    const timestampValidation = validateTimestamp(payload.timestamp);
    if (!timestampValidation.isValid) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: timestampValidation.error,
      };
      res.status(200).json(response);
      return;
    }

    // Verify blockchain transaction exists
    const zcashTx = await zcashClient.getTransaction(payload.txid);
    if (!zcashTx) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: 'Transaction not found on blockchain',
      };
      res.status(200).json(response);
      return;
    }

    // Validate amount
    const amountValidation = validatePaymentAmount(
      payload.amount,
      paymentRequirements.maxAmountRequired
    );

    if (!amountValidation.isValid) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: amountValidation.error,
      };
      res.status(200).json(response);
      return;
    }

    // Validate recipient address
    const recipientValidation = validateRecipientAddress(
      payload.to,
      paymentRequirements.payTo
    );

    if (!recipientValidation.isValid) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: recipientValidation.error,
      };
      res.status(200).json(response);
      return;
    }

    // Verify signature (proves sender controls from address)
    const challengeString = `${payload.txid}|${payload.amount}|${payload.from}|${payload.to}|${payload.timestamp}`;
    const signatureResult = await ZcashCryptoService.verifyX402Authorization(
      challengeString,
      payload.signature,
      payload.from
    );

    if (!signatureResult.valid) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: 'Invalid signature',
      };
      res.status(200).json(response);
      return;
    }

    // Check double-spend (if transaction already used for this resource)
    const isDoubleSpend = await VerificationService.checkDoubleSpend(
      paymentRequirements.resource,
      payload.txid
    );

    if (isDoubleSpend) {
      const response: X402VerifyResponse = {
        isValid: false,
        invalidReason: 'Transaction already used for this resource',
      };
      res.status(200).json(response);
      return;
    }

    // All validations passed
    const response: X402VerifyResponse = {
      isValid: true,
      invalidReason: null,
    };

    logger.info('X-402 payment verified successfully', {
      txid: payload.txid,
      resource: paymentRequirements.resource,
    });

    res.status(200).json(response);
      return;
  } catch (error) {
    logger.error('Standard X-402 verify failed:', error);
    const response: X402VerifyResponse = {
      isValid: false,
      invalidReason: 'Verification failed',
    };
    res.status(200).json(response);
      return;
  }
});

/**
 * POST /api/v1/x402/settle-standard
 * Execute payment settlement (Standard X-402)
 *
 * This is the standard X-402 settlement endpoint that executes
 * payment settlement after verification.
 *
 * Public endpoint (called by clients)
 */
router.post('/settle-standard', async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentHeader, paymentRequirements }: X402SettleRequest = req.body;

    // Decode payment header
    let decodedHeader: X402PaymentHeader;
    try {
      decodedHeader = decodePaymentHeader(paymentHeader);
    } catch (error) {
      const response: X402SettleResponse = {
        success: false,
        error: 'Invalid payment header encoding',
        txHash: null,
        networkId: null,
      };
      res.status(200).json(response);
      return;
    }

    const payload = extractTransparentPayload(decodedHeader);
    if (!payload) {
      const response: X402SettleResponse = {
        success: false,
        error: 'Invalid payment payload',
        txHash: null,
        networkId: null,
      };
      res.status(200).json(response);
      return;
    }

    const { txid } = payload;

    // Note: Settlement assumes verification already happened client-side
    // In production, you might want to re-verify here for security

    // Check if already settled (idempotency)
    const existingTx = await prisma.transaction.findFirst({
      where: {
        transactionId: txid,
        status: 'SETTLED',
      },
    });

    if (existingTx) {
      const response: X402SettleResponse = {
        success: true,
        error: null,
        txHash: txid,
        networkId: decodedHeader.network,
      };
      res.status(200).json(response);
      return;
    }

    // Get blockchain transaction
    const zcashTx = await zcashClient.getTransaction(txid);
    if (!zcashTx) {
      const response: X402SettleResponse = {
        success: false,
        error: 'Transaction not found on blockchain',
        txHash: null,
        networkId: null,
      };
      res.status(200).json(response);
      return;
    }

    // Check confirmations
    const minConfirmations = parseInt(process.env.MIN_CONFIRMATIONS || '6', 10);
    if (zcashTx.confirmations < minConfirmations) {
      const response: X402SettleResponse = {
        success: false,
        error: `Insufficient confirmations: ${zcashTx.confirmations}/${minConfirmations}`,
        txHash: txid,
        networkId: decodedHeader.network,
      };
      res.status(200).json(response);
      return;
    }

    // Lookup merchant by address
    const merchant = await prisma.merchant.findFirst({
      where: { zcashAddress: paymentRequirements.payTo },
    });

    if (!merchant) {
      const response: X402SettleResponse = {
        success: false,
        error: 'Merchant not found for address',
        txHash: null,
        networkId: null,
      };
      res.status(200).json(response);
      return;
    }

    // Create or update transaction record
    const amount = new Decimal(zatoshisToZec(payload.amount));

    let transaction = await prisma.transaction.findFirst({
      where: { transactionId: txid },
    });

    if (!transaction) {
      // Create new transaction
      transaction = await prisma.transaction.create({
        data: {
          merchantId: merchant.id,
          amount,
          currency: 'ZEC',
          status: 'SETTLED',
          transactionId: txid,
          resourceUrl: paymentRequirements.resource,
          clientAddress: payload.from,
          confirmations: zcashTx.confirmations,
          blockHeight: zcashTx.blockHeight,
          settledAt: new Date(),
          metadata: {
            description: paymentRequirements.description,
            scheme: decodedHeader.scheme,
            network: decodedHeader.network,
            extra: paymentRequirements.extra,
          },
        },
      });
    } else {
      // Update existing transaction
      transaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SETTLED',
          confirmations: zcashTx.confirmations,
          blockHeight: zcashTx.blockHeight,
          settledAt: new Date(),
        },
      });
    }

    logger.info('X-402 payment settled successfully', {
      txid,
      transactionId: transaction.id,
      merchantId: merchant.id,
      amount: amount.toString(),
    });

    const response: X402SettleResponse = {
      success: true,
      error: null,
      txHash: txid,
      networkId: decodedHeader.network,
    };

    res.status(200).json(response);
      return;
  } catch (error) {
    logger.error('Standard X-402 settle failed:', error);
    const response: X402SettleResponse = {
      success: false,
      error: 'Settlement failed',
      txHash: null,
      networkId: null,
    };
    res.status(200).json(response);
      return;
  }
});

// ============================================================================
// Z402 CUSTOM ENDPOINTS (Stripe-like API)
// ============================================================================
// These endpoints provide a developer-friendly, Stripe-inspired API
// for merchant integrations and dashboard functionality.
// ============================================================================

/**
 * POST /api/v1/x402/challenge
 * Generate payment challenge (Z402 Custom)
 */
router.post('/challenge', authenticate, async (req: Request, res: Response) => {
  try {
    const { amount, resourceUrl, metadata, expiresInSeconds } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!resourceUrl) {
      res.status(400).json({ error: 'Resource URL required' });
      return;
    }

    const merchantId = (req as any).user.id;

    const challenge = await X402Protocol.generateChallenge({
      merchantId,
      resourceUrl,
      amount,
      metadata,
      expiresInSeconds,
    });

    const headers = X402Protocol.format402Headers(challenge);

    res.status(200).set(headers).json({
      paymentId: challenge.paymentId,
      amount: challenge.amount,
      currency: challenge.currency,
      merchantAddress: challenge.merchantAddress,
      resourceUrl: challenge.resourceUrl,
      expiresAt: challenge.expiresAt,
      nonce: challenge.nonce,
      signature: challenge.signature,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

/**
 * POST /api/v1/x402/verify
 * Verify payment authorization
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { paymentId, clientAddress, signature, timestamp, txid } = req.body;

    if (!paymentId || !clientAddress || !signature) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const authorization = {
      paymentId,
      clientAddress,
      signature,
      timestamp: timestamp || Date.now(),
      txid,
    };

    const result = await VerificationService.verifyPayment({
      authorization,
      skipBlockchainCheck: !txid,
    });

    if (!result.success) {
      res.status(402).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      paymentId: result.paymentId,
      transactionId: result.transactionId,
      status: result.status,
      details: result.details,
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/v1/x402/settle
 * Settle a payment
 */
router.post('/settle', authenticate, async (req: Request, res: Response) => {
  try {
    const { transactionId, minConfirmations, force } = req.body;

    if (!transactionId) {
      res.status(400).json({ error: 'Transaction ID required' });
      return;
    }

    const result = await SettlementService.settlePayment({
      transactionId,
      minConfirmations,
      force,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        status: result.status,
        confirmations: result.confirmations,
      });
      return;
    }

    res.status(200).json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      confirmations: result.confirmations,
      settled: result.settled,
    });
  } catch (error) {
    res.status(500).json({ error: 'Settlement failed' });
  }
});

/**
 * GET /api/v1/x402/status/:paymentId
 * Get payment status
 */
router.get('/status/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const status = await X402Protocol.getPaymentStatus(paymentId);

    res.status(200).json(status);
  } catch (error) {
    res.status(404).json({ error: 'Payment not found' });
  }
});

/**
 * GET /api/v1/x402/health
 * Health check for Zcash connection
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await zcashClient.healthCheck();

    res.status(health.healthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      healthy: false,
      error: 'Failed to check Zcash node health',
    });
  }
});

/**
 * POST /api/v1/x402/batch-verify
 * Batch verify multiple transactions
 */
router.post('/batch-verify', authenticate, async (req: Request, res: Response) => {
  try {
    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      res.status(400).json({ error: 'Transaction IDs array required' });
      return;
    }

    const results = await VerificationService.batchVerify(transactionIds);

    res.status(200).json({
      results,
      total: results.length,
      verified: results.filter((r) => r.verified).length,
      failed: results.filter((r) => !r.verified).length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Batch verification failed' });
  }
});

/**
 * POST /api/v1/x402/auto-settle
 * Auto-settle eligible transactions
 */
router.post('/auto-settle', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await SettlementService.autoSettle();

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Auto-settlement failed' });
  }
});

/**
 * GET /api/v1/x402/statistics
 * Get settlement statistics
 */
router.get('/statistics', authenticate, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const stats = await SettlementService.getStatistics(merchantId);

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
