import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createApiKeySchema,
  updateApiKeySchema,
  deleteApiKeySchema,
} from '../validators/apikey.validators';
import { apikeyQueries } from '../db/queries';
import prisma from '../db';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/keys
 * List all API keys for the authenticated merchant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;

    const keys = await apikeyQueries.listByMerchant(merchantId);

    res.status(200).json({
      success: true,
      keys,
      total: keys.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
    });
  }
});

/**
 * POST /api/v1/keys
 * Create a new API key
 */
router.post('/', validate(createApiKeySchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;

    const result = await apikeyQueries.create({
      merchantId,
      name: req.body.name,
      permissions: req.body.permissions,
      scopes: req.body.scopes,
      rateLimit: req.body.rateLimit,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'API_KEY_CREATED',
        resourceType: 'ApiKey',
        resourceId: result.id,
        metadata: {
          keyName: result.name,
          keyPrefix: result.keyPrefix,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      key: {
        id: result.id,
        name: result.name,
        keyPrefix: result.keyPrefix,
        apiKey: result.apiKey, // Only returned once!
        permissions: result.permissions,
        scopes: result.scopes,
        rateLimit: result.rateLimit,
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
      },
      warning: 'Save this API key securely. It will not be shown again.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
    });
  }
});

/**
 * PUT /api/v1/keys/:id
 * Update an API key
 */
router.put('/:id', validate(updateApiKeySchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const keyId = req.params.id;

    const updated = await apikeyQueries.update(keyId, merchantId, {
      name: req.body.name,
      permissions: req.body.permissions,
      scopes: req.body.scopes,
      rateLimit: req.body.rateLimit,
    });

    res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      key: {
        id: updated.id,
        name: updated.name,
        keyPrefix: updated.keyPrefix,
        permissions: updated.permissions,
        scopes: updated.scopes,
        rateLimit: updated.rateLimit,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update API key',
    });
  }
});

/**
 * DELETE /api/v1/keys/:id
 * Revoke an API key
 */
router.delete('/:id', validate(deleteApiKeySchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const keyId = req.params.id;

    await apikeyQueries.revoke(keyId, merchantId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'API_KEY_REVOKED',
        resourceType: 'ApiKey',
        resourceId: keyId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
    });
  }
});

/**
 * GET /api/v1/keys/:id
 * Get API key details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const keyId = req.params.id;

    const key = await prisma.apiKey.findUnique({
      where: {
        id: keyId,
        merchantId,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!key) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      key,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get API key',
    });
  }
});

export default router;
