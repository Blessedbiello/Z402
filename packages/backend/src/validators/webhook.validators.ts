import { z } from 'zod';

/**
 * Configure webhook endpoint
 * PUT /api/v1/webhooks
 */
export const configureWebhookSchema = z.object({
  body: z.object({
    webhookUrl: z
      .string()
      .url('Invalid webhook URL')
      .optional()
      .nullable()
      .transform((val) => val || null),
    webhookSecret: z
      .string()
      .min(32, 'Webhook secret must be at least 32 characters')
      .max(128, 'Webhook secret must be at most 128 characters')
      .optional()
      .nullable()
      .transform((val) => val || null),
    enabled: z.boolean().optional(),
    events: z
      .array(
        z.enum([
          'payment.verified',
          'payment.settled',
          'payment.failed',
          'payment.expired',
          'refund.created',
          'refund.completed',
        ])
      )
      .optional(),
  }),
});

/**
 * Test webhook endpoint
 * POST /api/v1/webhooks/test
 */
export const testWebhookSchema = z.object({
  body: z.object({
    eventType: z
      .enum([
        'payment.verified',
        'payment.settled',
        'payment.failed',
        'payment.expired',
        'refund.created',
        'refund.completed',
      ])
      .optional()
      .default('payment.verified'),
    testData: z.record(z.any()).optional(),
  }),
});

/**
 * Get webhook delivery logs
 * GET /api/v1/webhooks/logs
 */
export const getWebhookLogsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10)),
    limit: z
      .string()
      .optional()
      .default('50')
      .transform((val) => {
        const num = parseInt(val, 10);
        return Math.min(num, 100); // Max 100 per page
      }),
    status: z.enum(['PENDING', 'DELIVERED', 'FAILED']).optional(),
    eventType: z
      .enum([
        'payment.verified',
        'payment.settled',
        'payment.failed',
        'payment.expired',
        'refund.created',
        'refund.completed',
      ])
      .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

/**
 * Retry failed webhook
 * POST /api/v1/webhooks/:id/retry
 */
export const retryWebhookSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Webhook delivery ID is required'),
  }),
});

/**
 * Get webhook statistics
 * GET /api/v1/webhooks/stats
 */
export const getWebhookStatsSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .default('7')
      .transform((val) => parseInt(val, 10)),
  }),
});

export type ConfigureWebhookInput = z.infer<
  typeof configureWebhookSchema
>['body'];
export type TestWebhookInput = z.infer<typeof testWebhookSchema>['body'];
export type GetWebhookLogsQuery = z.infer<typeof getWebhookLogsSchema>['query'];
export type RetryWebhookParams = z.infer<typeof retryWebhookSchema>['params'];
export type GetWebhookStatsQuery = z.infer<
  typeof getWebhookStatsSchema
>['query'];
