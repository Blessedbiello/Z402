import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { WebhookService } from '../services/webhook.service';
import { VerificationService } from '../services/verify.service';
import prisma from '../db';
import { logger } from '../config/logger';
import { WebhookEventType } from '@prisma/client';
import crypto from 'crypto';

const router = Router();

/**
 * Validation schemas
 */
const zcashNotificationSchema = z.object({
  txid: z.string().min(1, 'Transaction ID is required'),
  amount: z.number().positive('Amount must be positive'),
  confirmations: z.number().int().min(0),
  address: z.string().min(1, 'Address is required'),
  blockHeight: z.number().int().positive().optional(),
  timestamp: z.number().int().positive().optional(),
  memo: z.string().optional(),
});

const configureWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL').optional().nullable(),
  secret: z.string().min(32, 'Webhook secret must be at least 32 characters').optional().nullable(),
  enabled: z.boolean().optional(),
  events: z.array(z.nativeEnum(WebhookEventType)).optional(),
});

/**
 * GET /api/v1/webhooks
 * Get webhook configuration for authenticated merchant
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.user!.id },
      select: {
        webhookUrl: true,
        webhookSecret: true,
        settings: true,
      },
    });

    if (!merchant) {
      return res.status(404).json({
        error: 'Merchant not found',
      });
    }

    const settings = merchant.settings as any || {};

    res.json({
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      enabled: settings.webhookEnabled ?? true,
      events: settings.webhookEvents || [
        'PAYMENT_VERIFIED',
        'PAYMENT_SETTLED',
        'PAYMENT_FAILED',
        'PAYMENT_EXPIRED',
      ],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/webhooks
 * Create or update webhook configuration
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = configureWebhookSchema.parse(req.body);

    const merchant = await prisma.merchant.findUnique({
      where: { id: req.user!.id },
      select: { id: true, webhookUrl: true, webhookSecret: true, settings: true },
    });

    if (!merchant) {
      return res.status(404).json({
        error: 'Merchant not found',
      });
    }

    // Build update data
    const updateData: any = {};

    if (validatedData.url !== undefined) {
      updateData.webhookUrl = validatedData.url;
    }

    if (validatedData.secret !== undefined) {
      updateData.webhookSecret = validatedData.secret;
    }

    // If URL is being set and no secret provided, generate one
    if (validatedData.url && !validatedData.secret && !merchant.webhookSecret) {
      updateData.webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    // Update settings
    if (validatedData.enabled !== undefined || validatedData.events !== undefined) {
      const currentSettings = merchant.settings as any || {};
      updateData.settings = {
        ...currentSettings,
        webhookEnabled: validatedData.enabled ?? currentSettings.webhookEnabled ?? true,
        webhookEvents: validatedData.events || currentSettings.webhookEvents || [
          'PAYMENT_VERIFIED',
          'PAYMENT_SETTLED',
          'PAYMENT_FAILED',
          'PAYMENT_EXPIRED',
        ],
      };
    }

    const updatedMerchant = await prisma.merchant.update({
      where: { id: req.user!.id },
      data: updateData,
    });

    logger.info('Webhook configuration updated', {
      merchantId: req.user!.id,
      webhookUrl: updatedMerchant.webhookUrl,
    });

    const updatedSettings = updatedMerchant.settings as any || {};

    res.status(201).json({
      message: 'Webhook configured successfully',
      webhookUrl: updatedMerchant.webhookUrl,
      webhookSecret: updatedMerchant.webhookSecret,
      enabled: updatedSettings.webhookEnabled ?? true,
      events: updatedSettings.webhookEvents || ['PAYMENT_VERIFIED', 'PAYMENT_SETTLED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED'],
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
 * GET /api/v1/webhooks/:webhookId
 * Get webhook delivery details
 */
router.get('/:webhookId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { webhookId } = req.params;

    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        id: webhookId,
        merchantId: req.user!.id,
      },
      include: {
        transaction: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            transactionId: true,
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({
        error: 'Webhook delivery not found',
      });
    }

    res.json({
      id: delivery.id,
      eventType: delivery.eventType,
      eventId: delivery.eventId,
      status: delivery.status,
      payload: delivery.payload,
      httpStatusCode: delivery.httpStatusCode,
      responseBody: delivery.responseBody,
      errorMessage: delivery.errorMessage,
      attempts: delivery.attempts,
      maxAttempts: delivery.maxAttempts,
      lastAttemptAt: delivery.lastAttemptAt,
      nextAttemptAt: delivery.nextAttemptAt,
      createdAt: delivery.createdAt,
      deliveredAt: delivery.deliveredAt,
      transaction: delivery.transaction,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/webhooks/:webhookId
 * Update webhook configuration (alias to POST /)
 */
router.put('/:webhookId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Redirect to POST / for updating configuration
  return router.stack.find((layer) => layer.route?.path === '/' && layer.route?.methods?.post)?.route?.stack[0].handle(req, res, next);
});

/**
 * DELETE /api/v1/webhooks/:webhookId
 * Disable webhook configuration
 */
router.delete('/:webhookId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Delete webhook configuration
    await prisma.merchant.update({
      where: { id: req.user!.id },
      data: {
        webhookUrl: null,
        webhookSecret: null,
        settings: {
          ...(await prisma.merchant.findUnique({ where: { id: req.user!.id } }).then(m => m?.settings as any || {})),
          webhookEnabled: false,
        },
      },
    });

    logger.info('Webhook configuration deleted', {
      merchantId: req.user!.id,
    });

    res.json({
      message: 'Webhook configuration deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/webhooks/zcash/notify
 * Webhook endpoint for receiving Zcash blockchain notifications
 * This endpoint receives notifications from Zcash node or blockchain monitoring service
 */
router.post('/zcash/notify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate notification payload
    const validatedData = zcashNotificationSchema.parse(req.body);

    logger.info('Received Zcash notification', {
      txid: validatedData.txid,
      amount: validatedData.amount,
      confirmations: validatedData.confirmations,
      address: validatedData.address,
    });

    // Find payment intent by Zcash address
    const paymentIntent = await prisma.paymentIntent.findFirst({
      where: {
        zcashAddress: validatedData.address,
        status: {
          in: ['CREATED', 'PENDING', 'PAID'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!paymentIntent) {
      logger.warn('No matching payment intent found for Zcash notification', {
        txid: validatedData.txid,
        address: validatedData.address,
      });

      return res.status(404).json({
        error: 'No matching payment intent found',
        message: 'This notification will be ignored',
      });
    }

    // Check if transaction already exists
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        transactionId: validatedData.txid,
        paymentIntentId: paymentIntent.id,
      },
    });

    if (existingTransaction) {
      logger.info('Transaction already exists, updating confirmations', {
        transactionId: existingTransaction.id,
        txid: validatedData.txid,
        confirmations: validatedData.confirmations,
      });

      // Update confirmations
      await prisma.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          confirmations: validatedData.confirmations,
          blockHeight: validatedData.blockHeight,
          updatedAt: new Date(),
        },
      });

      return res.json({
        message: 'Notification received - transaction updated',
        transactionId: existingTransaction.id,
        confirmations: validatedData.confirmations,
      });
    }

    // Update payment intent with transaction ID
    await prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        transactionId: validatedData.txid,
        clientAddress: validatedData.address,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    logger.info('Payment intent updated with transaction ID', {
      paymentIntentId: paymentIntent.id,
      txid: validatedData.txid,
    });

    // Trigger verification in background
    VerificationService.verifyPayment({
      authorization: {
        paymentId: paymentIntent.id,
        txid: validatedData.txid,
        clientAddress: validatedData.address,
        signature: '',
        timestamp: Date.now(),
      },
    }).catch((error) => {
      logger.error('Background verification failed', {
        paymentId: paymentIntent.id,
        error: error.message,
      });
    });

    // Send webhook notification to merchant
    WebhookService.sendWebhook({
      merchantId: paymentIntent.merchantId,
      transactionId: validatedData.txid,
      eventType: 'PAYMENT_PENDING',
      payload: {
        type: 'payment.pending',
        id: paymentIntent.id,
        paymentId: paymentIntent.id,
        txid: validatedData.txid,
        amount: paymentIntent.amount.toString(),
        currency: paymentIntent.currency,
        confirmations: validatedData.confirmations,
        address: validatedData.address,
        blockHeight: validatedData.blockHeight,
        timestamp: new Date().toISOString(),
      },
    }).catch((error) => {
      logger.error('Failed to send webhook notification', {
        paymentId: paymentIntent.id,
        error: error.message,
      });
    });

    res.json({
      message: 'Notification received and processed',
      paymentId: paymentIntent.id,
      txid: validatedData.txid,
      confirmations: validatedData.confirmations,
      status: 'PAID',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    logger.error('Zcash notification processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body,
    });

    next(error);
  }
});

export default router;
