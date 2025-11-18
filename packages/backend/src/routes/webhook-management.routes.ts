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

    // Store enabled state in metadata
    if (enabled !== undefined || events !== undefined) {
      const currentMetadata = (merchant.metadata as any) || {};
      updateData.metadata = {
        ...currentMetadata,
        webhookEnabled: enabled !== undefined ? enabled : currentMetadata.webhookEnabled ?? true,
        webhookEvents: events || currentMetadata.webhookEvents || [
          'payment.verified',
          'payment.settled',
          'payment.failed',
          'payment.expired',
          'refund.created',
          'refund.completed',
        ],
      };
    }

    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'WEBHOOK_CONFIGURED',
        resourceType: 'Merchant',
        resourceId: merchantId,
        metadata: {
          webhookUrl: updatedMerchant.webhookUrl,
          hasSecret: !!updatedMerchant.webhookSecret,
          enabled: (updatedMerchant.metadata as any)?.webhookEnabled,
          events: (updatedMerchant.metadata as any)?.webhookEvents,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Webhook configuration updated',
      webhook: {
        url: updatedMerchant.webhookUrl,
        secret: updatedMerchant.webhookSecret,
        enabled: (updatedMerchant.metadata as any)?.webhookEnabled ?? true,
        events: (updatedMerchant.metadata as any)?.webhookEvents || [
          'payment.verified',
          'payment.settled',
          'payment.failed',
          'payment.expired',
          'refund.created',
          'refund.completed',
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
        metadata: true,
      },
    });

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      webhook: {
        url: merchant.webhookUrl,
        secret: merchant.webhookSecret,
        enabled: (merchant.metadata as any)?.webhookEnabled ?? true,
        events: (merchant.metadata as any)?.webhookEvents || [
          'payment.verified',
          'payment.settled',
          'payment.failed',
          'payment.expired',
          'refund.created',
          'refund.completed',
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

    // Deliver test webhook
    const result = await WebhookService.deliver({
      merchantId,
      eventType: eventType as any,
      payload: testPayload,
      isTest: true,
    });

    res.status(200).json({
      success: true,
      message: 'Test webhook sent',
      delivery: {
        id: result.id,
        status: result.status,
        attempts: result.attempts,
        response: result.response,
        deliveredAt: result.deliveredAt,
      },
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
        response: true,
        deliveredAt: true,
        createdAt: true,
        nextRetryAt: true,
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
    if (delivery.status === 'DELIVERED') {
      res.status(400).json({
        success: false,
        error: 'Webhook already delivered successfully',
      });
      return;
    }

    // Check if max retries reached
    if (delivery.attempts >= 5) {
      res.status(400).json({
        success: false,
        error: 'Maximum retry attempts reached',
      });
      return;
    }

    // Retry webhook delivery
    const result = await WebhookService.retry(deliveryId);

    res.status(200).json({
      success: true,
      message: 'Webhook retry initiated',
      delivery: {
        id: result.id,
        status: result.status,
        attempts: result.attempts,
        response: result.response,
        deliveredAt: result.deliveredAt,
        nextRetryAt: result.nextRetryAt,
      },
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
    const [total, delivered, failed, pending] = await Promise.all([
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          createdAt: { gte: startDate },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          merchantId,
          status: 'DELIVERED',
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
        delivered,
        failed,
        pending,
        successRate: total > 0 ? (delivered / total) * 100 : 0,
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
