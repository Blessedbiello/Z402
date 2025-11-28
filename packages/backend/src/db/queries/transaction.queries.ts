import prisma from '../index';
import { Prisma, TransactionStatus } from '@prisma/client';

/**
 * Transaction Database Queries
 */

export const transactionQueries = {
  /**
   * Create a new transaction
   */
  create: async (data: {
    merchantId: string;
    amount: Prisma.Decimal;
    resourceUrl: string;
    paymentIntentId?: string;
    metadata?: Prisma.InputJsonValue;
    expiresAt?: Date;
  }) => {
    return prisma.transaction.create({
      data: {
        ...data,
        status: 'PENDING',
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
            zcashAddress: true,
          },
        },
      },
    });
  },

  /**
   * Find transaction by ID
   */
  findById: async (id: string) => {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            zcashAddress: true,
          },
        },
        paymentIntent: true,
      },
    });
  },

  /**
   * Find transaction by payment hash
   */
  findByPaymentHash: async (paymentHash: string) => {
    return prisma.transaction.findUnique({
      where: { paymentHash },
      include: {
        merchant: true,
      },
    });
  },

  /**
   * Find transaction by Zcash txid
   */
  findByTxid: async (transactionId: string) => {
    return prisma.transaction.findUnique({
      where: { transactionId },
    });
  },

  /**
   * Update transaction status
   */
  updateStatus: async (
    id: string,
    status: TransactionStatus,
    additionalData?: {
      transactionId?: string;
      blockHeight?: number;
      confirmations?: number;
      settledAt?: Date;
    }
  ) => {
    return prisma.transaction.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  },

  /**
   * List transactions for a merchant
   */
  listByMerchant: async (
    merchantId: string,
    options?: {
      status?: TransactionStatus;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) => {
    const where: Prisma.TransactionWhereInput = {
      merchantId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          resourceUrl: true,
          transactionId: true,
          confirmations: true,
          createdAt: true,
          settledAt: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    };
  },

  /**
   * Get pending transactions
   */
  getPending: async (merchantId?: string) => {
    return prisma.transaction.findMany({
      where: {
        merchantId,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Get transactions pending verification
   */
  getPendingVerification: async () => {
    return prisma.transaction.findMany({
      where: {
        status: 'VERIFIED',
        confirmations: {
          lt: 6, // Assuming 6 confirmations needed
        },
      },
      include: {
        merchant: {
          select: {
            id: true,
            webhookUrl: true,
            webhookSecret: true,
          },
        },
      },
    });
  },

  /**
   * Update confirmations
   */
  updateConfirmations: async (transactionId: string, confirmations: number) => {
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction) return null;

    const newStatus = confirmations >= 6 ? 'SETTLED' : 'VERIFIED';
    const settledAt = confirmations >= 6 ? new Date() : null;

    return prisma.transaction.update({
      where: { transactionId },
      data: {
        confirmations,
        status: newStatus,
        settledAt,
      },
    });
  },

  /**
   * Expire old pending transactions
   */
  expireOldTransactions: async () => {
    return prisma.transaction.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'FAILED',
      },
    });
  },

  /**
   * Get transaction volume by period
   */
  getVolumeByPeriod: async (
    merchantId: string,
    startDate: Date,
    endDate: Date
  ) => {
    return prisma.transaction.groupBy({
      by: ['status'],
      where: {
        merchantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
      _sum: {
        amount: true,
      },
    });
  },
};
