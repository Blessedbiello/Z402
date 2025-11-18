import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  getOverviewSchema,
  getRevenueSchema,
  getTransactionMetricsSchema,
  getTopResourcesSchema,
  getPaymentMethodsSchema,
  getCustomerMetricsSchema,
} from '../validators/analytics.validators';
import prisma from '../db';
import { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Helper function to get date range from period
 */
function getDateRangeFromPeriod(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2020, 0, 1); // Beginning of time for this platform
      break;
  }

  return { startDate, endDate };
}

/**
 * GET /api/v1/analytics/overview
 * Get dashboard overview statistics
 */
router.get('/overview', validate(getOverviewSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { period } = req.query as any;

    const { startDate, endDate } = getDateRangeFromPeriod(period);

    // Get overview stats
    const [
      totalRevenue,
      transactionCount,
      successfulTransactions,
      averageTransactionValue,
      topResource,
      recentTransactions,
    ] = await Promise.all([
      // Total revenue (settled transactions)
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Total transactions
      prisma.transaction.count({
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Successful transactions
      prisma.transaction.count({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Average transaction value
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _avg: { amount: true },
      }),
      // Top resource
      prisma.transaction.groupBy({
        by: ['resourceUrl'],
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
      // Recent transactions
      prisma.transaction.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          resourceUrl: true,
        },
      }),
    ]);

    // Calculate growth (compare with previous period)
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);

    const [previousRevenue, previousTransactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: previousStartDate, lt: startDate },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          merchantId,
          createdAt: { gte: previousStartDate, lt: startDate },
        },
      }),
    ]);

    const revenueGrowth =
      previousRevenue._sum.amount && previousRevenue._sum.amount > 0
        ? ((Number(totalRevenue._sum.amount || 0) - Number(previousRevenue._sum.amount)) /
            Number(previousRevenue._sum.amount)) *
          100
        : 0;

    const transactionGrowth =
      previousTransactionCount > 0
        ? ((transactionCount - previousTransactionCount) / previousTransactionCount) * 100
        : 0;

    res.status(200).json({
      success: true,
      overview: {
        revenue: {
          total: totalRevenue._sum.amount || 0,
          currency: 'ZEC',
          growth: revenueGrowth,
        },
        transactions: {
          total: transactionCount,
          successful: successfulTransactions,
          successRate: transactionCount > 0 ? (successfulTransactions / transactionCount) * 100 : 0,
          growth: transactionGrowth,
        },
        averageValue: {
          amount: averageTransactionValue._avg.amount || 0,
          currency: 'ZEC',
        },
        topResource: topResource[0]
          ? {
              url: topResource[0].resourceUrl,
              revenue: topResource[0]._sum.amount,
              count: topResource[0]._count,
            }
          : null,
        recentTransactions,
      },
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overview statistics',
    });
  }
});

/**
 * GET /api/v1/analytics/revenue
 * Get revenue over time
 */
router.get('/revenue', validate(getRevenueSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { startDate: startDateStr, endDate: endDateStr, interval, currency } = req.query as any;

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // Use TimescaleDB time_bucket for efficient time-series aggregation
    // For now, use standard SQL grouping
    let timeFormat: string;
    switch (interval) {
      case 'hour':
        timeFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'day':
        timeFormat = '%Y-%m-%d';
        break;
      case 'week':
        timeFormat = '%Y-W%W';
        break;
      case 'month':
        timeFormat = '%Y-%m';
        break;
    }

    // Get revenue data grouped by time interval
    const revenueData = await prisma.$queryRaw<
      Array<{ time: string; revenue: Prisma.Decimal; count: bigint }>
    >`
      SELECT
        DATE_FORMAT(created_at, ${timeFormat}) as time,
        SUM(amount) as revenue,
        COUNT(*) as count
      FROM Transaction
      WHERE
        merchant_id = ${merchantId}
        AND status = 'SETTLED'
        AND currency = ${currency}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY time
      ORDER BY time ASC
    `;

    // Calculate total and average
    const total = revenueData.reduce((sum, item) => sum + Number(item.revenue), 0);
    const average = revenueData.length > 0 ? total / revenueData.length : 0;

    res.status(200).json({
      success: true,
      revenue: {
        data: revenueData.map((item) => ({
          time: item.time,
          revenue: Number(item.revenue),
          count: Number(item.count),
        })),
        total,
        average,
        currency,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval,
      },
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue data',
    });
  }
});

/**
 * GET /api/v1/analytics/transactions
 * Get transaction metrics over time
 */
router.get('/transactions', validate(getTransactionMetricsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { startDate: startDateStr, endDate: endDateStr, interval, groupBy } = req.query as any;

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    if (groupBy === 'status') {
      // Group by status
      const byStatus = await prisma.transaction.groupBy({
        by: ['status'],
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        _sum: { amount: true },
      });

      res.status(200).json({
        success: true,
        metrics: {
          byStatus: byStatus.map((item) => ({
            status: item.status,
            count: item._count,
            revenue: item._sum.amount || 0,
          })),
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return;
    }

    if (groupBy === 'currency') {
      // Group by currency
      const byCurrency = await prisma.transaction.groupBy({
        by: ['currency'],
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
        _sum: { amount: true },
      });

      res.status(200).json({
        success: true,
        metrics: {
          byCurrency: byCurrency.map((item) => ({
            currency: item.currency,
            count: item._count,
            revenue: item._sum.amount || 0,
          })),
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      return;
    }

    // Group by time
    let timeFormat: string;
    switch (interval) {
      case 'hour':
        timeFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'day':
        timeFormat = '%Y-%m-%d';
        break;
      case 'week':
        timeFormat = '%Y-W%W';
        break;
      case 'month':
        timeFormat = '%Y-%m';
        break;
    }

    const byTime = await prisma.$queryRaw<
      Array<{ time: string; count: bigint; settled: bigint; failed: bigint; pending: bigint }>
    >`
      SELECT
        DATE_FORMAT(created_at, ${timeFormat}) as time,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'SETTLED' THEN 1 ELSE 0 END) as settled,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
      FROM Transaction
      WHERE
        merchant_id = ${merchantId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY time
      ORDER BY time ASC
    `;

    res.status(200).json({
      success: true,
      metrics: {
        byTime: byTime.map((item) => ({
          time: item.time,
          count: Number(item.count),
          settled: Number(item.settled),
          failed: Number(item.failed),
          pending: Number(item.pending),
        })),
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval,
      },
    });
  } catch (error) {
    console.error('Get transaction metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction metrics',
    });
  }
});

/**
 * GET /api/v1/analytics/top-resources
 * Get most accessed resources
 */
router.get('/top-resources', validate(getTopResourcesSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { period, limit, sortBy } = req.query as any;

    const { startDate, endDate } = getDateRangeFromPeriod(period);

    // Get top resources
    const topResources = await prisma.transaction.groupBy({
      by: ['resourceUrl'],
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
      orderBy:
        sortBy === 'count'
          ? { _count: { resourceUrl: 'desc' } }
          : { _sum: { amount: 'desc' } },
      take: limit,
    });

    // Get total for percentage calculation
    const total = await prisma.transaction.aggregate({
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalRevenue = Number(total._sum.amount || 0);
    const totalCount = total._count;

    res.status(200).json({
      success: true,
      resources: topResources.map((item) => ({
        url: item.resourceUrl,
        revenue: item._sum.amount || 0,
        count: item._count,
        revenuePercentage: totalRevenue > 0 ? (Number(item._sum.amount || 0) / totalRevenue) * 100 : 0,
        countPercentage: totalCount > 0 ? (item._count / totalCount) * 100 : 0,
      })),
      total: {
        revenue: totalRevenue,
        count: totalCount,
      },
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get top resources error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top resources',
    });
  }
});

/**
 * GET /api/v1/analytics/payment-methods
 * Get payment method breakdown (transparent vs shielded)
 */
router.get('/payment-methods', validate(getPaymentMethodsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { period } = req.query as any;

    const { startDate, endDate } = getDateRangeFromPeriod(period);

    // Count transactions by address type (transparent starts with 't', shielded with 'z')
    const paymentMethods = await prisma.$queryRaw<
      Array<{ type: string; count: bigint; revenue: Prisma.Decimal }>
    >`
      SELECT
        CASE
          WHEN client_address LIKE 't%' THEN 'transparent'
          WHEN client_address LIKE 'z%' THEN 'shielded'
          ELSE 'unknown'
        END as type,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM Transaction
      WHERE
        merchant_id = ${merchantId}
        AND status = 'SETTLED'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        AND client_address IS NOT NULL
      GROUP BY type
    `;

    const total = paymentMethods.reduce((sum, item) => sum + Number(item.count), 0);
    const totalRevenue = paymentMethods.reduce((sum, item) => sum + Number(item.revenue), 0);

    res.status(200).json({
      success: true,
      paymentMethods: paymentMethods.map((item) => ({
        type: item.type,
        count: Number(item.count),
        revenue: Number(item.revenue),
        percentage: total > 0 ? (Number(item.count) / total) * 100 : 0,
        revenuePercentage: totalRevenue > 0 ? (Number(item.revenue) / totalRevenue) * 100 : 0,
      })),
      total: {
        count: total,
        revenue: totalRevenue,
      },
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment method breakdown',
    });
  }
});

/**
 * GET /api/v1/analytics/customers
 * Get customer metrics (unique client addresses)
 */
router.get('/customers', validate(getCustomerMetricsSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { period, metric } = req.query as any;

    const { startDate, endDate } = getDateRangeFromPeriod(period);

    // Get unique customer count
    const uniqueCustomers = await prisma.transaction.findMany({
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
        clientAddress: { not: null },
      },
      select: { clientAddress: true },
      distinct: ['clientAddress'],
    });

    // Get top customers by spend
    const topCustomers = await prisma.transaction.groupBy({
      by: ['clientAddress'],
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
        clientAddress: { not: null },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    // Get returning customers (more than 1 transaction)
    const returningCustomers = topCustomers.filter((c) => c._count > 1);

    res.status(200).json({
      success: true,
      customers: {
        total: uniqueCustomers.length,
        new: uniqueCustomers.length - returningCustomers.length,
        returning: returningCustomers.length,
        returningRate:
          uniqueCustomers.length > 0
            ? (returningCustomers.length / uniqueCustomers.length) * 100
            : 0,
        topCustomers: topCustomers.map((c) => ({
          address: c.clientAddress,
          revenue: c._sum.amount || 0,
          transactionCount: c._count,
        })),
      },
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get customer metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer metrics',
    });
  }
});

export default router;
