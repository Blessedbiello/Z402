import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AuthService, RegisterInput } from '../services/auth.service';
import { apikeyQueries } from '../db/queries/apikey.queries';
import prisma from '../db';
import { logger } from '../config/logger';

const router = Router();

/**
 * Validation schemas
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  notificationEmail: z.string().email().optional(),
  settings: z.record(z.unknown()).optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required'),
  permissions: z.array(z.string()).optional(),
  scopes: z.array(z.string()).optional(),
  expiresInDays: z.number().positive().optional(),
});

/**
 * POST /api/v1/merchants/register
 * Register a new merchant
 */
router.post('/register', async (req, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Register merchant
    const result = await AuthService.register(validatedData as RegisterInput);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    logger.info('Merchant registered via API', {
      merchantId: result.merchant!.id,
      email: result.merchant!.email,
    });

    res.status(201).json({
      merchant: result.merchant,
      tokens: result.tokens,
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
 * GET /api/v1/merchants/profile
 * Get merchant profile
 */
router.get('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        businessType: true,
        website: true,
        notificationEmail: true,
        zcashAddress: true,
        zcashShieldedAddress: true,
        isActive: true,
        isVerified: true,
        verifiedAt: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            paymentIntents: true,
            transactions: true,
            apiKeys: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!merchant) {
      return res.status(404).json({
        error: 'Merchant not found',
      });
    }

    res.json({
      id: merchant.id,
      email: merchant.email,
      name: merchant.name,
      businessName: merchant.businessName,
      businessType: merchant.businessType,
      website: merchant.website,
      notificationEmail: merchant.notificationEmail,
      zcashAddress: merchant.zcashAddress,
      zcashShieldedAddress: merchant.zcashShieldedAddress,
      isActive: merchant.isActive,
      isVerified: merchant.isVerified,
      verifiedAt: merchant.verifiedAt,
      settings: merchant.settings,
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
      lastLoginAt: merchant.lastLoginAt,
      stats: {
        totalPayments: merchant._count.paymentIntents,
        totalTransactions: merchant._count.transactions,
        activeApiKeys: merchant._count.apiKeys,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/merchants/profile
 * Update merchant profile
 */
router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validatedData = updateProfileSchema.parse(req.body);

    // Update merchant
    const merchant = await prisma.merchant.update({
      where: { id: req.user!.id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        businessType: true,
        website: true,
        notificationEmail: true,
        settings: true,
        updatedAt: true,
      },
    });

    logger.info('Merchant profile updated', {
      merchantId: req.user!.id,
    });

    res.json(merchant);
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
 * GET /api/v1/merchants/api-keys
 * List merchant's API keys
 */
router.get('/api-keys', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        merchantId: req.user!.id,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        permissions: key.permissions,
        scopes: key.scopes,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        // Never return the actual key hash
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/merchants/api-keys
 * Generate a new API key
 */
router.post('/api-keys', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createApiKeySchema.parse(req.body);

    // Check if merchant already has too many active keys
    const activeKeysCount = await prisma.apiKey.count({
      where: {
        merchantId: req.user!.id,
        isActive: true,
      },
    });

    if (activeKeysCount >= 10) {
      return res.status(400).json({
        error: 'Maximum number of active API keys reached (10)',
        details: 'Please revoke an existing key before creating a new one',
      });
    }

    // Calculate expiration date if specified
    const expiresAt = validatedData.expiresInDays
      ? new Date(Date.now() + validatedData.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Create API key
    const result = await apikeyQueries.create({
      merchantId: req.user!.id,
      name: validatedData.name,
      permissions: validatedData.permissions,
      scopes: validatedData.scopes,
      expiresAt,
    });

    logger.info('API key created', {
      merchantId: req.user!.id,
      keyId: result.id,
      keyName: result.name,
    });

    // Return the API key only once (never stored or returned again)
    res.status(201).json({
      id: result.id,
      name: result.name,
      apiKey: result.apiKey, // ⚠️ ONLY returned on creation!
      keyPrefix: result.keyPrefix,
      permissions: result.permissions,
      scopes: result.scopes,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
      warning: 'Store this API key securely. It will not be shown again.',
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
 * DELETE /api/v1/merchants/api-keys/:keyId
 * Revoke an API key
 */
router.delete('/api-keys/:keyId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { keyId } = req.params;

    // Check if key exists and belongs to merchant
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    if (apiKey.merchantId !== req.user!.id) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    // Revoke the key (soft delete)
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    logger.info('API key revoked', {
      merchantId: req.user!.id,
      keyId,
    });

    res.json({
      message: 'API key revoked successfully',
      keyId,
      revokedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/merchants/stats
 * Get merchant statistics
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const merchantId = req.user!.id;

    // Get various stats in parallel
    const [
      totalPayments,
      completedPayments,
      totalRevenue,
      last30DaysRevenue,
      activeApiKeys,
    ] = await Promise.all([
      // Total payments count
      prisma.paymentIntent.count({
        where: { merchantId },
      }),

      // Completed payments count
      prisma.paymentIntent.count({
        where: {
          merchantId,
          status: { in: ['VERIFIED', 'SETTLED'] },
        },
      }),

      // Total revenue
      prisma.paymentIntent.aggregate({
        where: {
          merchantId,
          status: { in: ['VERIFIED', 'SETTLED'] },
        },
        _sum: {
          amount: true,
        },
      }),

      // Last 30 days revenue
      prisma.paymentIntent.aggregate({
        where: {
          merchantId,
          status: { in: ['VERIFIED', 'SETTLED'] },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          amount: true,
        },
      }),

      // Active API keys count
      prisma.apiKey.count({
        where: {
          merchantId,
          isActive: true,
        },
      }),
    ]);

    const successRate = totalPayments > 0
      ? (completedPayments / totalPayments) * 100
      : 0;

    res.json({
      totalPayments,
      completedPayments,
      successRate: successRate.toFixed(2),
      totalRevenue: totalRevenue._sum.amount?.toString() || '0',
      last30DaysRevenue: last30DaysRevenue._sum.amount?.toString() || '0',
      activeApiKeys,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
