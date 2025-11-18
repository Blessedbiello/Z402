import prisma from '../index';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * API Key Database Queries
 */

export const apikeyQueries = {
  /**
   * Generate a new API key
   */
  generateKey: (prefix: 'sk_test_' | 'sk_live_' = 'sk_test_'): string => {
    const randomPart = crypto.randomBytes(24).toString('hex');
    return `${prefix}${randomPart}`;
  },

  /**
   * Create a new API key
   */
  create: async (data: {
    merchantId: string;
    name: string;
    permissions?: string[];
    scopes?: string[];
    rateLimit?: number;
    expiresAt?: Date;
  }) => {
    const apiKey = apikeyQueries.generateKey();
    const keyHash = await bcrypt.hash(apiKey, 10);
    const keyPrefix = apiKey.substring(0, 12); // e.g., "sk_test_abc1"

    const createdKey = await prisma.apiKey.create({
      data: {
        merchantId: data.merchantId,
        name: data.name,
        keyHash,
        keyPrefix,
        permissions: data.permissions || [],
        scopes: data.scopes || ['read', 'write'],
        rateLimit: data.rateLimit,
        expiresAt: data.expiresAt,
      },
    });

    // Return the plain API key only once
    return {
      ...createdKey,
      apiKey, // Only returned on creation
    };
  },

  /**
   * Find API key by hash
   */
  findByKey: async (apiKey: string) => {
    // Find all active keys
    const keys = await prisma.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        merchant: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            zcashAddress: true,
          },
        },
      },
    });

    // Check each key hash
    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        // Update last used
        await prisma.apiKey.update({
          where: { id: key.id },
          data: {
            lastUsedAt: new Date(),
            usageCount: { increment: 1 },
          },
        });
        return key;
      }
    }

    return null;
  },

  /**
   * List API keys for a merchant
   */
  listByMerchant: async (merchantId: string) => {
    return prisma.apiKey.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        usageCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  },

  /**
   * Revoke an API key
   */
  revoke: async (id: string, merchantId: string) => {
    return prisma.apiKey.update({
      where: {
        id,
        merchantId,
      },
      data: {
        isActive: false,
      },
    });
  },

  /**
   * Update API key
   */
  update: async (
    id: string,
    merchantId: string,
    data: {
      name?: string;
      permissions?: string[];
      scopes?: string[];
      rateLimit?: number;
    }
  ) => {
    return prisma.apiKey.update({
      where: {
        id,
        merchantId,
      },
      data,
    });
  },

  /**
   * Clean up expired keys
   */
  cleanupExpired: async () => {
    return prisma.apiKey.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  },
};
