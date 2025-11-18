import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listTransactionsSchema,
  getTransactionSchema,
  refundTransactionSchema,
  exportTransactionsSchema,
} from '../validators/transaction.validators';
import { transactionQueries } from '../db/queries';
import prisma from '../db';
import { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/transactions
 * List transactions with filtering, pagination, and sorting
 */
router.get('/', validate(listTransactionsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const {
      page,
      limit,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      sortBy,
      sortOrder,
    } = req.query as any;

    // Build where clause
    const where: any = { merchantId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { resourceUrl: { contains: search, mode: 'insensitive' } },
        { clientAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.transaction.count({ where });

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        resourceUrl: true,
        transactionId: true,
        paymentHash: true,
        confirmations: true,
        clientAddress: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        settledAt: true,
        expiresAt: true,
      },
    });

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list transactions',
    });
  }
});

/**
 * GET /api/v1/transactions/:id
 * Get transaction details
 */
router.get('/:id', validate(getTransactionSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const transactionId = req.params.id;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        merchantId,
      },
      include: {
        paymentIntent: {
          select: {
            id: true,
            amount: true,
            resourceUrl: true,
            description: true,
            expiresAt: true,
          },
        },
        webhookDeliveries: {
          select: {
            id: true,
            eventType: true,
            status: true,
            attempts: true,
            deliveredAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction',
    });
  }
});

/**
 * POST /api/v1/transactions/:id/refund
 * Issue a refund for a transaction
 */
router.post(
  '/:id/refund',
  validate(refundTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = (req as any).user.id;
      const transactionId = req.params.id;

      // Get transaction
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          merchantId,
        },
      });

      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
        return;
      }

      // Check if transaction is settled
      if (transaction.status !== 'SETTLED') {
        res.status(400).json({
          success: false,
          error: 'Can only refund settled transactions',
        });
        return;
      }

      // Check if already refunded
      const existingRefund = await prisma.refund.findUnique({
        where: { transactionId: transaction.id },
      });

      if (existingRefund) {
        res.status(400).json({
          success: false,
          error: 'Transaction already refunded',
        });
        return;
      }

      // Calculate refund amount
      const refundAmount = req.body.amount
        ? new Prisma.Decimal(req.body.amount)
        : transaction.amount;

      if (refundAmount.greaterThan(transaction.amount)) {
        res.status(400).json({
          success: false,
          error: 'Refund amount exceeds transaction amount',
        });
        return;
      }

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          transactionId: transaction.id,
          amount: refundAmount,
          currency: transaction.currency,
          status: 'PENDING',
          reason: req.body.reason,
        },
      });

      // Update transaction status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'REFUNDED' },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          merchantId,
          action: 'REFUND_ISSUED',
          resourceType: 'Transaction',
          resourceId: transaction.id,
          metadata: {
            refundId: refund.id,
            amount: refundAmount.toString(),
            reason: req.body.reason,
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Refund initiated successfully',
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          createdAt: refund.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to process refund',
      });
    }
  }
);

/**
 * GET /api/v1/transactions/export
 * Export transactions as CSV or JSON
 */
router.get('/export/data', validate(exportTransactionsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { status, startDate, endDate, format } = req.query as any;

    // Build where clause
    const where: any = { merchantId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        resourceUrl: true,
        transactionId: true,
        confirmations: true,
        clientAddress: true,
        createdAt: true,
        settledAt: true,
      },
    });

    if (format === 'json') {
      res.status(200).json({
        success: true,
        transactions,
        exportedAt: new Date().toISOString(),
      });
      return;
    }

    // CSV export
    const csv = [
      // Header
      'ID,Amount,Currency,Status,Transaction ID,Confirmations,Resource URL,Client Address,Created At,Settled At',
      // Rows
      ...transactions.map((tx) =>
        [
          tx.id,
          tx.amount,
          tx.currency,
          tx.status,
          tx.transactionId || '',
          tx.confirmations,
          `"${tx.resourceUrl}"`,
          tx.clientAddress || '',
          tx.createdAt.toISOString(),
          tx.settledAt?.toISOString() || '',
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transactions-${Date.now()}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export transactions',
    });
  }
});

/**
 * GET /api/v1/transactions/stats/summary
 * Get transaction summary statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;

    const [total, settled, pending, verified, failed, volume] = await Promise.all([
      prisma.transaction.count({ where: { merchantId } }),
      prisma.transaction.count({
        where: { merchantId, status: 'SETTLED' },
      }),
      prisma.transaction.count({
        where: { merchantId, status: 'PENDING' },
      }),
      prisma.transaction.count({
        where: { merchantId, status: 'VERIFIED' },
      }),
      prisma.transaction.count({
        where: { merchantId, status: 'FAILED' },
      }),
      prisma.transaction.aggregate({
        where: { merchantId, status: 'SETTLED' },
        _sum: { amount: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        settled,
        pending,
        verified,
        failed,
        totalVolume: volume._sum.amount || 0,
        successRate: total > 0 ? (settled / total) * 100 : 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction stats',
    });
  }
});

export default router;
