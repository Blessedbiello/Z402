import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  configureWebhookSchema,
  testWebhookSchema,
  getWebhookLogsSchema,
  retryWebhookSchema,
  getWebhookStatsSchema,
} from '../validators/webhook.validators';
import prisma from '../db';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../config/logger';
import crypto from 'crypto';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * PUT /api/v1/webhooks
 * Configure webhook endpoint and settings
 */
router.put('/', validate(configureWebhookSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { webhookUrl, webhookSecret, enabled, events } = req.body;

    // Get current merchant settings
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant not found',
      });
      return;
    }

    // Update webhook configuration
    const updateData: any = {};

    if (webhookUrl !== undefined) {
      updateData.webhookUrl = webhookUrl;
    }

    if (webhookSecret !== undefined) {
      updateData.webhookSecret = webhookSecret;
    }

    // If webhook URL is being set and no secret provided, generate one
    if (webhookUrl && !webhookSecret && !merchant.webhookSecret) {
      updateData.webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    // Store enabled state in settings
    if (enabled !== undefined || events !== undefined) {
      const currentSettings = (merchant.settings as any) || {};
      updateData.settings = {
        ...currentSettings,
        webhookEnabled: enabled !== undefined ? enabled : currentSettings.webhookEnabled ?? true,
        webhookEvents: events || currentSettings.webhookEvents || [
          'PAYMENT_VERIFIED',
          'PAYMENT_SETTLED',
          'PAYMENT_FAILED',
          'PAYMENT_EXPIRED',
          'PAYMENT_REFUNDED',
        ],
      };
    }

    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
    });

    logger.info('Webhook configuration updated via webhook-management', {
      merchantId,
      webhookUrl: updatedMerchant.webhookUrl,
      hasSecret: !!updatedMerchant.webhookSecret,
    });

    const updatedSettings = (updatedMerchant.settings as any) || {};

    res.status(200).json({
      success: true,
      message: 'Webhook configuration updated',
      webhook: {
        url: updatedMerchant.webhookUrl,
        secret: updatedMerchant.webhookSecret,
        enabled: updatedSettings.webhookEnabled ?? true,
        events: updatedSettings.webhookEvents || [
          'PAYMENT_VERIFIED',
          'PAYMENT_SETTLED',
          'PAYMENT_FAILED',
          'PAYMENT_EXPIRED',
          'PAYMENT_REFUNDED',
        ],
      },
    });
  } catch (error) {
    console.error('Configure webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure webhook',
    });
  }
});

/**
 * GET /api/v1/webhooks
 * Get current webhook configuration
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        webhookUrl: true,
        webhookSecret: true,
        settings: true,
      },
    });

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant not found',
      });
      return;
    }

    const settings = (merchant.settings as any) || {};

    res.status(200).json({
      success: true,
      webhook: {
        url: merchant.webhookUrl,
        secret: merchant.webhookSecret,
        enabled: settings.webhookEnabled ?? true,
        events: settings.webhookEvents || [
          'PAYMENT_VERIFIED',
          'PAYMENT_SETTLED',
          'PAYMENT_FAILED',
          'PAYMENT_EXPIRED',
          'PAYMENT_REFUNDED',
        ],
      },
    });
  } catch (error) {
    console.error('Get webhook config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook configuration',
    });
  }
});

/**
 * POST /api/v1/webhooks/test
 * Send a test webhook to verify endpoint
 */
router.post('/test', validate(testWebhookSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { eventType, testData } = req.body;

    // Get merchant webhook configuration
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant || !merchant.webhookUrl) {
      res.status(400).json({
        success: false,
        error: 'Webhook URL not configured',
      });
      return;
    }

    // Create test webhook payload
    const testPayload = {
      id: `test_${crypto.randomBytes(8).toString('hex')}`,
      type: eventType,
      data: testData || {
        id: 'test_123',
        amount: 1.0,
        status: 'SETTLED',
        test: true,
      },
      timestamp: new Date().toISOString(),
      test: true,
    };

    // Send test webhook
    await WebhookService.sendWebhook({
      merchantId,
      eventType: 'PAYMENT_VERIFIED' as any, // Map to enum value
      payload: testPayload,
    });

    // Get the most recent webhook delivery for this merchant
    const delivery = await prisma.webhookDelivery.findFirst({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      message: 'Test webhook sent',
      delivery: delivery ? {
        id: delivery.id,
        status: delivery.status,
        attempts: delivery.attempts,
        httpStatusCode: delivery.httpStatusCode,
        deliveredAt: delivery.deliveredAt,
      } : null,
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test webhook',
    });
  }
});

/**
 * GET /api/v1/webhooks/logs
 * Get webhook delivery logs with filtering
 */
router.get('/logs', validate(getWebhookLogsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { page, limit, status, eventType, startDate, endDate } = req.query as any;

    // Build where clause
    const where: any = { merchantId };

    if (status) {
      where.status = status;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get total count
    const total = await prisma.webhookDelivery.count({ where });

    // Get deliveries
    const deliveries = await prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        eventType: true,
        status: true,
        attempts: true,
        httpStatusCode: true,
        responseBody: true,
        errorMessage: true,
        deliveredAt: true,
        createdAt: true,
        nextAttemptAt: true,
      },
    });

    res.status(200).json({
      success: true,
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook logs',
    });
  }
});

/**
 * POST /api/v1/webhooks/:id/retry
 * Retry a failed webhook delivery
 */
router.post('/:id/retry', validate(retryWebhookSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const deliveryId = req.params.id;

    // Get webhook delivery
    const delivery = await prisma.webhookDelivery.findFirst({
      where: {
        id: deliveryId,
        merchantId,
      },
    });

    if (!delivery) {
      res.status(404).json({
        success: false,
        error: 'Webhook delivery not found',
      });
      return;
    }

    // Check if already delivered
    if (delivery.status === 'SENT') {
      res.status(400).json({
        success: false,
        error: 'Webhook already delivered successfully',
      });
      return;
    }

    // Check if max retries reached
    if (delivery.attempts >= delivery.maxAttempts) {
      res.status(400).json({
        success: false,
        error: 'Maximum retry attempts reached',
      });
      return;
    }

    // Get merchant webhook configuration
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!merchant?.webhookUrl) {
      res.status(400).json({
        success: false,
        error: 'Webhook URL not configured',
      });
      return;
    }

    // Retry by resending webhook
    await WebhookService.sendWebhook({
      merchantId,
      transactionId: delivery.transactionId || undefined,
      eventType: delivery.eventType,
      payload: delivery.payload as Record<string, unknown>,
    });

    // Get updated delivery
    const updatedDelivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    res.status(200).json({
      success: true,
      message: 'Webhook retry initiated',
      delivery: updatedDelivery ? {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        attempts: updatedDelivery.attempts,
        httpStatusCode: updatedDelivery.httpStatusCode,
        deliveredAt: updatedDelivery.deliveredAt,
        nextAttemptAt: updatedDelivery.nextAttemptAt,
      } : null,
    });
  } catch (error) {
    console.error('Retry webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry webhook',
    });
  }
});

/**
 * GET /api/v1/webhooks/stats
 * Get webhook delivery statistics
 */
router.get('/stats', validate(getWebhookStatsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { days } = req.query as any;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get stats
    const [total, sent, failed, pending, retrying] = await Promise.all([
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          status: 'SENT',
          createdAt: { gte: startDate },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          status: 'FAILED',
          createdAt: { gte: startDate },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          status: 'PENDING',
          createdAt: { gte: startDate },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          status: 'RETRYING',
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // Get by event type
    const byEventType = await prisma.webhookDelivery.groupBy({
      by: ['eventType'],
      where: {
        merchantId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        sent,
        failed,
        pending,
        retrying,
        successRate: total > 0 ? (sent / total) * 100 : 0,
        byEventType: byEventType.reduce((acc, item) => {
          acc[item.eventType] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get webhook stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get webhook statistics',
    });
  }
});

export default router;
