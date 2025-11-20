import { z } from 'zod';

/**
 * Get dashboard overview
 * GET /api/v1/analytics/overview
 */
export const getOverviewSchema = z.object({
  query: z.object({
    period: z
      .enum(['24h', '7d', '30d', '90d', '1y', 'all'])
      .optional()
      .default('30d'),
  }),
});

/**
 * Get revenue over time
 * GET /api/v1/analytics/revenue
 */
export const getRevenueSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    interval: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
    currency: z.string().optional().default('ZEC'),
  }),
});

/**
 * Get transaction metrics
 * GET /api/v1/analytics/transactions
 */
export const getTransactionMetricsSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    interval: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
    groupBy: z
      .enum(['status', 'currency', 'time'])
      .optional()
      .default('time'),
  }),
});

/**
 * Get top resources
 * GET /api/v1/analytics/top-resources
 */
export const getTopResourcesSchema = z.object({
  query: z.object({
    period: z
      .enum(['24h', '7d', '30d', '90d', '1y', 'all'])
      .optional()
      .default('30d'),
    limit: z
      .string()
      .optional()
      .default('10')
      .transform((val) => {
        const num = parseInt(val, 10);
        return Math.min(num, 100); // Max 100
      }),
    sortBy: z.enum(['count', 'revenue']).optional().default('revenue'),
  }),
});

/**
 * Get payment method breakdown
 * GET /api/v1/analytics/payment-methods
 */
export const getPaymentMethodsSchema = z.object({
  query: z.object({
    period: z
      .enum(['24h', '7d', '30d', '90d', '1y', 'all'])
      .optional()
      .default('30d'),
  }),
});

/**
 * Get customer metrics
 * GET /api/v1/analytics/customers
 */
export const getCustomerMetricsSchema = z.object({
  query: z.object({
    period: z
      .enum(['24h', '7d', '30d', '90d', '1y', 'all'])
      .optional()
      .default('30d'),
    metric: z.enum(['new', 'returning', 'active']).optional().default('active'),
  }),
});

export type GetOverviewQuery = z.infer<typeof getOverviewSchema>['query'];
export type GetRevenueQuery = z.infer<typeof getRevenueSchema>['query'];
export type GetTransactionMetricsQuery = z.infer<
  typeof getTransactionMetricsSchema
>['query'];
export type GetTopResourcesQuery = z.infer<
  typeof getTopResourcesSchema
>['query'];
export type GetPaymentMethodsQuery = z.infer<
  typeof getPaymentMethodsSchema
>['query'];
export type GetCustomerMetricsQuery = z.infer<
  typeof getCustomerMetricsSchema
>['query'];
