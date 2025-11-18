import { z } from 'zod';
import { TransactionStatus } from '@prisma/client';

/**
 * Zod validation schemas for transactions
 */

export const listTransactionsSchema = z.object({
  query: z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('20').transform(Number),
    status: z.nativeEnum(TransactionStatus).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    minAmount: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    maxAmount: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'amount', 'status', 'settledAt']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export const getTransactionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
});

export const refundTransactionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
  body: z.object({
    amount: z.number().positive().optional(),
    reason: z.string().optional(),
  }),
});

export const exportTransactionsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(TransactionStatus).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    format: z.enum(['csv', 'json']).optional().default('csv'),
  }),
});

export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>['query'];
export type GetTransactionInput = z.infer<typeof getTransactionSchema>['params'];
export type RefundTransactionInput = z.infer<typeof refundTransactionSchema>;
export type ExportTransactionsInput = z.infer<typeof exportTransactionsSchema>['query'];
