import prisma from '../index';
import { MetricType, Prisma } from '@prisma/client';

/**
 * Analytics Database Queries
 */

export const analyticsQueries = {
  /**
   * Record a metric
   */
  recordMetric: async (data: {
    merchantId?: string;
    metricType: MetricType;
    value: number | Prisma.Decimal;
    metadata?: Prisma.InputJsonValue;
    tags?: Prisma.InputJsonValue;
    timestamp?: Date;
  }) => {
    return prisma.analytics.create({
      data: {
        merchantId: data.merchantId,
        metricType: data.metricType,
        value: data.value,
        metadata: data.metadata,
        tags: data.tags,
        timestamp: data.timestamp || new Date(),
      },
    });
  },

  /**
   * Get metrics by type and time range
   */
  getMetrics: async (
    metricType: MetricType,
    startDate: Date,
    endDate: Date,
    merchantId?: string
  ) => {
    return prisma.analytics.findMany({
      where: {
        metricType,
        merchantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  },

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics: async (
    metricType: MetricType,
    startDate: Date,
    endDate: Date,
    merchantId?: string
  ) => {
    return prisma.analytics.aggregate({
      where: {
        metricType,
        merchantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _avg: {
        value: true,
      },
      _sum: {
        value: true,
      },
      _min: {
        value: true,
      },
      _max: {
        value: true,
      },
      _count: true,
    });
  },

  /**
   * Get daily rollup for a metric
   */
  getDailyRollup: async (
    merchantId: string,
    metricType: MetricType,
    days: number = 30
  ) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This would ideally use TimescaleDB continuous aggregates
    // For now, we'll do application-level aggregation
    const metrics = await prisma.analytics.findMany({
      where: {
        merchantId,
        metricType,
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group by day
    const dailyData = metrics.reduce(
      (acc, metric) => {
        const date = metric.timestamp.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            sum: new Prisma.Decimal(0),
            avg: new Prisma.Decimal(0),
          };
        }
        acc[date].count++;
        acc[date].sum = acc[date].sum.add(metric.value);
        return acc;
      },
      {} as Record<
        string,
        {
          date: string;
          count: number;
          sum: Prisma.Decimal;
          avg: Prisma.Decimal;
        }
      >
    );

    // Calculate averages
    Object.values(dailyData).forEach((day) => {
      day.avg = day.sum.dividedBy(day.count);
    });

    return Object.values(dailyData);
  },

  /**
   * Record payment metrics automatically
   */
  recordPaymentMetrics: async (transaction: {
    id: string;
    merchantId: string;
    amount: Prisma.Decimal;
    status: string;
    createdAt: Date;
  }) => {
    const metrics: Array<{
      merchantId: string;
      metricType: any;
      value: any;
      tags: any;
      timestamp: Date;
    }> = [
      // Payment count
      {
        merchantId: transaction.merchantId,
        metricType: MetricType.PAYMENT_COUNT,
        value: 1,
        tags: { status: transaction.status },
        timestamp: transaction.createdAt,
      },
    ];

    // Only record volume for settled payments
    if (transaction.status === 'SETTLED') {
      metrics.push({
        merchantId: transaction.merchantId,
        metricType: MetricType.PAYMENT_VOLUME,
        value: transaction.amount.toNumber(),
        tags: { status: transaction.status },
        timestamp: transaction.createdAt,
      });
    }

    await prisma.analytics.createMany({
      data: metrics,
    });
  },

  /**
   * Get merchant performance summary
   */
  getMerchantSummary: async (merchantId: string, days: number = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [volumeData, , transactions] = await Promise.all([
      // Total volume
      prisma.analytics.aggregate({
        where: {
          merchantId,
          metricType: MetricType.PAYMENT_VOLUME,
          timestamp: { gte: startDate },
        },
        _sum: { value: true },
      }),

      // Payment count by status
      prisma.analytics.groupBy({
        by: ['tags'],
        where: {
          merchantId,
          metricType: MetricType.PAYMENT_COUNT,
          timestamp: { gte: startDate },
        },
        _sum: { value: true },
      }),

      // Get actual transaction data for accuracy
      prisma.transaction.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate },
        },
        select: {
          status: true,
          amount: true,
          clientAddress: true,
        },
      }),
    ]);

    // Calculate unique clients
    const uniqueClients = new Set(
      transactions
        .map((t) => t.clientAddress)
        .filter((addr): addr is string => addr !== null)
    );

    // Calculate success rate
    const totalPayments = transactions.length;
    const settledPayments = transactions.filter(
      (t) => t.status === 'SETTLED'
    ).length;
    const successRate =
      totalPayments > 0 ? (settledPayments / totalPayments) * 100 : 0;

    // Calculate average amount
    const settledTransactions = transactions.filter((t) => t.status === 'SETTLED');
    const totalVolume = settledTransactions.reduce(
      (sum, t) => sum.add(t.amount),
      new Prisma.Decimal(0)
    );
    const avgAmount =
      settledTransactions.length > 0
        ? totalVolume.dividedBy(settledTransactions.length)
        : new Prisma.Decimal(0);

    return {
      totalVolume: volumeData._sum.value || 0,
      totalPayments,
      settledPayments,
      successRate,
      averageAmount: avgAmount,
      uniqueClients: uniqueClients.size,
    };
  },

  /**
   * Cleanup old analytics data
   */
  cleanupOldData: async (daysToKeep: number = 90) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return prisma.analytics.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });
  },
};
