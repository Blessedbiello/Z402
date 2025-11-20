import { Router, Request, Response } from 'express';
import { X402Protocol } from '../core/x402-protocol';
import { VerificationService } from '../services/verify.service';
import { SettlementService } from '../services/settle.service';
import { zcashClient } from '../integrations/zcash';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/x402/challenge
 * Generate payment challenge
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
router.get('/health', async (req: Request, res: Response) => {
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
router.post('/auto-settle', authenticate, async (req: Request, res: Response) => {
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
