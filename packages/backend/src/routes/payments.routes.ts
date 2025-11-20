import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { X402Protocol } from '../core/x402-protocol';
import { VerificationService } from '../services/verify.service';
import { SettlementService } from '../services/settle.service';
import prisma from '../db';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * Validation schemas
 */
const createPaymentIntentSchema = z.object({
  amount: z.string().or(z.number()).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return num;
  }),
  resourceUrl: z.string().url('Invalid resource URL'),
  metadata: z.record(z.unknown()).optional(),
  expiresInSeconds: z.number().positive().optional(),
});

const payPaymentIntentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  clientAddress: z.string().min(1, 'Client address is required'),
});

const refundPaymentSchema = z.object({
  reason: z.string().optional(),
  amount: z.string().or(z.number()).optional().transform((val) => {
    if (val === undefined) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Amount must be a positive number');
    }
    return num;
  }),
});

/**
 * POST /api/v1/payments/intents
 * Create a new payment intent
 */
router.post('/intents', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = createPaymentIntentSchema.parse(req.body);

    // Generate payment challenge using X402 Protocol
    const challenge = await X402Protocol.generateChallenge({
      merchantId: req.user!.id,
      resourceUrl: validatedData.resourceUrl,
      amount: validatedData.amount,
      metadata: validatedData.metadata,
      expiresInSeconds: validatedData.expiresInSeconds,
    });

    logger.info('Payment intent created', {
      merchantId: req.user!.id,
      paymentId: challenge.paymentId,
      amount: validatedData.amount,
    });

    res.status(201).json({
      id: challenge.paymentId,
      amount: challenge.amount,
      currency: challenge.currency,
      merchantAddress: challenge.merchantAddress,
      resourceUrl: challenge.resourceUrl,
      expiresAt: challenge.expiresAt,
      nonce: challenge.nonce,
      signature: challenge.signature,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/payments/intents/:id
 * Get payment intent details
 */
router.get('/intents/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
      },
    });

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment intent not found',
      });
    }

    // Check if merchant owns this payment intent
    if (paymentIntent.merchantId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    res.json({
      id: paymentIntent.id,
      amount: paymentIntent.amount.toString(),
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      resourceUrl: paymentIntent.resourceUrl,
      zcashAddress: paymentIntent.zcashAddress,
      transactionId: paymentIntent.transactionId,
      metadata: paymentIntent.metadata,
      expiresAt: paymentIntent.expiresAt,
      createdAt: paymentIntent.createdAt,
      paidAt: paymentIntent.paidAt,
      verifiedAt: paymentIntent.verifiedAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payments/intents/:id/pay
 * Mark payment intent as paid (submit transaction ID)
 */
router.post('/intents/:id/pay', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validatedData = payPaymentIntentSchema.parse(req.body);

    // Get payment intent
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id },
    });

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment intent not found',
      });
    }

    // Check if already paid
    if (paymentIntent.status !== 'CREATED' && paymentIntent.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Payment intent already processed',
        status: paymentIntent.status,
      });
    }

    // Check if expired
    if (paymentIntent.expiresAt && paymentIntent.expiresAt < new Date()) {
      return res.status(400).json({
        error: 'Payment intent expired',
      });
    }

    // Update payment intent with transaction details
    const updatedIntent = await prisma.paymentIntent.update({
      where: { id },
      data: {
        status: 'PAID',
        transactionId: validatedData.transactionId,
        clientAddress: validatedData.clientAddress,
        paidAt: new Date(),
      },
    });

    logger.info('Payment marked as paid', {
      paymentId: id,
      transactionId: validatedData.transactionId,
    });

    // Trigger verification in background (don't wait)
    VerificationService.verifyPayment({
      authorization: {
        paymentId: id,
        txid: validatedData.transactionId,
        clientAddress: validatedData.clientAddress,
        signature: '', // Not required for this flow
        timestamp: Date.now(),
      },
    }).catch((error) => {
      logger.error('Background verification failed', {
        paymentId: id,
        error: error.message,
      });
    });

    res.json({
      id: updatedIntent.id,
      status: updatedIntent.status,
      transactionId: updatedIntent.transactionId,
      paidAt: updatedIntent.paidAt,
      message: 'Payment submitted for verification',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/payments/intents/:id/verify
 * Manually verify a payment
 */
router.post('/intents/:id/verify', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get payment intent
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id },
    });

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment intent not found',
      });
    }

    // Check ownership
    if (paymentIntent.merchantId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    if (!paymentIntent.transactionId) {
      return res.status(400).json({
        error: 'No transaction ID associated with this payment',
      });
    }

    // Verify payment
    const verificationResult = await VerificationService.verifyPayment({
      authorization: {
        paymentId: id,
        txid: paymentIntent.transactionId,
        clientAddress: paymentIntent.clientAddress || '',
        signature: '',
        timestamp: Date.now(),
      },
    });

    if (!verificationResult.success) {
      return res.status(400).json({
        error: 'Verification failed',
        details: verificationResult.error,
      });
    }

    // Get updated payment intent
    const updatedIntent = await prisma.paymentIntent.findUnique({
      where: { id },
    });

    res.json({
      id: updatedIntent!.id,
      status: updatedIntent!.status,
      verified: true,
      verifiedAt: updatedIntent!.verifiedAt,
      confirmations: verificationResult.details?.confirmations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/payments
 * List payments for the authenticated merchant
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.PaymentIntentWhereInput = {
      merchantId: req.user!.id,
    };

    if (status) {
      where.status = status as string;
    }

    // Get payments
    const [payments, total] = await Promise.all([
      prisma.paymentIntent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          [sortBy as string]: sortOrder as 'asc' | 'desc',
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          resourceUrl: true,
          transactionId: true,
          clientAddress: true,
          createdAt: true,
          paidAt: true,
          verifiedAt: true,
          expiresAt: true,
        },
      }),
      prisma.paymentIntent.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      payments: payments.map((p) => ({
        ...p,
        amount: p.amount.toString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/payments/:paymentId
 * Get payment details (alias for /intents/:id for backward compatibility)
 */
router.get('/:paymentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id: paymentId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            businessName: true,
          },
        },
      },
    });

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment not found',
      });
    }

    // Check ownership
    if (paymentIntent.merchantId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    res.json({
      id: paymentIntent.id,
      amount: paymentIntent.amount.toString(),
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      resourceUrl: paymentIntent.resourceUrl,
      zcashAddress: paymentIntent.zcashAddress,
      transactionId: paymentIntent.transactionId,
      clientAddress: paymentIntent.clientAddress,
      metadata: paymentIntent.metadata,
      expiresAt: paymentIntent.expiresAt,
      createdAt: paymentIntent.createdAt,
      paidAt: paymentIntent.paidAt,
      verifiedAt: paymentIntent.verifiedAt,
      merchant: paymentIntent.merchant,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payments/:paymentId/refund
 * Refund a payment
 */
router.post('/:paymentId/refund', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId } = req.params;

    // Validate request body
    const validatedData = refundPaymentSchema.parse(req.body);

    // Get payment intent
    const paymentIntent = await prisma.paymentIntent.findUnique({
      where: { id: paymentId },
    });

    if (!paymentIntent) {
      return res.status(404).json({
        error: 'Payment not found',
      });
    }

    // Check ownership
    if (paymentIntent.merchantId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    // Check if payment can be refunded
    if (paymentIntent.status !== 'VERIFIED' && paymentIntent.status !== 'SETTLED') {
      return res.status(400).json({
        error: 'Payment cannot be refunded',
        details: `Payment status is ${paymentIntent.status}. Only VERIFIED or SETTLED payments can be refunded.`,
      });
    }

    if (paymentIntent.refundedAt) {
      return res.status(400).json({
        error: 'Payment already refunded',
        refundedAt: paymentIntent.refundedAt,
      });
    }

    // Determine refund amount
    const refundAmount = validatedData.amount
      ? new Prisma.Decimal(validatedData.amount)
      : paymentIntent.amount;

    // Check if refund amount is valid
    if (refundAmount.greaterThan(paymentIntent.amount)) {
      return res.status(400).json({
        error: 'Refund amount exceeds payment amount',
      });
    }

    // Create refund transaction
    const transaction = await prisma.transaction.create({
      data: {
        merchantId: paymentIntent.merchantId,
        type: 'REFUND',
        amount: refundAmount.negated(),
        currency: paymentIntent.currency,
        status: 'PENDING',
        paymentIntentId: paymentIntent.id,
        metadata: {
          reason: validatedData.reason || 'Merchant initiated refund',
          originalAmount: paymentIntent.amount.toString(),
          refundAmount: refundAmount.toString(),
        },
      },
    });

    // Update payment intent
    const updatedIntent = await prisma.paymentIntent.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundReason: validatedData.reason,
        refundAmount: refundAmount,
      },
    });

    logger.info('Payment refunded', {
      paymentId,
      refundAmount: refundAmount.toString(),
      transactionId: transaction.id,
    });

    res.json({
      id: updatedIntent.id,
      status: updatedIntent.status,
      refundedAt: updatedIntent.refundedAt,
      refundAmount: updatedIntent.refundAmount?.toString(),
      refundReason: updatedIntent.refundReason,
      transaction: {
        id: transaction.id,
        amount: transaction.amount.toString(),
        status: transaction.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/payments/:paymentId/confirm
 * Alias for verify endpoint (for backward compatibility)
 */
router.post('/:paymentId/confirm', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Redirect to verify endpoint
  req.params.id = req.params.paymentId;
  return router.stack.find((layer) => layer.route?.path === '/intents/:id/verify')?.route?.stack[0].handle(req, res, next);
});

export default router;
