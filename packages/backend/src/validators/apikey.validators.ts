import { z } from 'zod';

/**
 * Zod validation schemas for API keys
 */

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    permissions: z.array(z.string()).optional().default([]),
    scopes: z.array(z.enum(['read', 'write'])).optional().default(['read', 'write']),
    rateLimit: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
});

export const updateApiKeySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    permissions: z.array(z.string()).optional(),
    scopes: z.array(z.enum(['read', 'write'])).optional(),
    rateLimit: z.number().int().positive().optional(),
  }),
});

export const deleteApiKeySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>['body'];
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
