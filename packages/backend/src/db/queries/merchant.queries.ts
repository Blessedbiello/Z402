import prisma from '../index';
import { Prisma } from '@prisma/client';

/**
 * Merchant Database Queries
 */

export const merchantQueries = {
  /**
   * Find merchant by email
   */
  findByEmail: async (email: string) => {
    return prisma.merchant.findUnique({
      where: { email },
      include: {
        apiKeys: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
      },
    });
  },

  /**
   * Find merchant by ID with stats
   */
  findByIdWithStats: async (id: string) => {
    const merchant = await prisma.merchant.findUnique({
      where: { id },
    });

    if (!merchant) return null;

    // Get transaction stats
    const stats = await prisma.transaction.groupBy({
      by: ['status'],
      where: { merchantId: id },
      _count: true,
      _sum: {
        amount: true,
      },
    });

    return {
      ...merchant,
      stats: {
        transactions: stats.reduce(
          (acc, stat) => {
            acc[stat.status.toLowerCase()] = {
              count: stat._count,
              volume: stat._sum.amount || 0,
            };
            return acc;
          },
          {} as Record<string, { count: number; volume: number | Prisma.Decimal }>
        ),
      },
    };
  },

  /**
   * Create merchant with initial setup
   */
  create: async (data: {
    email: string;
    passwordHash: string;
    name: string;
    zcashAddress: string;
    zcashShieldedAddress?: string;
  }) => {
    return prisma.merchant.create({
      data,
    });
  },

  /**
   * Update merchant settings
   */
  updateSettings: async (id: string, settings: Record<string, unknown>) => {
    return prisma.merchant.update({
      where: { id },
      data: { settings },
    });
  },

  /**
   * Update last login timestamp
   */
  updateLastLogin: async (id: string) => {
    return prisma.merchant.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  /**
   * Get merchant dashboard stats
   */
  getDashboardStats: async (merchantId: string, days: number = 30) => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalTransactions, settledTransactions, totalVolume, recentTransactions] =
      await Promise.all([
        // Total transaction count
        prisma.transaction.count({
          where: {
            merchantId,
            createdAt: { gte: since },
          },
        }),

        // Settled transaction count
        prisma.transaction.count({
          where: {
            merchantId,
            status: 'SETTLED',
            createdAt: { gte: since },
          },
        }),

        // Total volume
        prisma.transaction.aggregate({
          where: {
            merchantId,
            status: 'SETTLED',
            createdAt: { gte: since },
          },
          _sum: {
            amount: true,
          },
        }),

        // Recent transactions
        prisma.transaction.findMany({
          where: { merchantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            amount: true,
            status: true,
            resourceUrl: true,
            createdAt: true,
            settledAt: true,
          },
        }),
      ]);

    return {
      totalTransactions,
      settledTransactions,
      successRate:
        totalTransactions > 0
          ? (settledTransactions / totalTransactions) * 100
          : 0,
      totalVolume: totalVolume._sum.amount || 0,
      recentTransactions,
    };
  },
};
