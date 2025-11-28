import prisma from '../db';
import { Redis } from 'ioredis';
import { config } from '../config';
import { Prisma } from '@prisma/client';

// Redis client for caching
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db || 0,
});

redis.on('error', (error) => {
  console.error('Analytics Redis error:', error);
});

export interface RealTimeMetrics {
  currentHour: {
    revenue: number;
    transactionCount: number;
    successfulCount: number;
    failedCount: number;
    successRate: number;
  };
  today: {
    revenue: number;
    transactionCount: number;
    successfulCount: number;
    uniquePayers: number;
    averageValue: number;
  };
  live: {
    pendingTransactions: number;
    activeVerifications: number;
    recentPayments: Array<{
      id: string;
      amount: number;
      status: string;
      createdAt: Date;
    }>;
  };
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface DashboardMetrics {
  revenue: {
    today: TrendData;
    thisWeek: TrendData;
    thisMonth: TrendData;
  };
  transactions: {
    today: TrendData;
    thisWeek: TrendData;
    thisMonth: TrendData;
  };
  successRate: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  averageValue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

/**
 * Real-Time Analytics Service
 */
export class AnalyticsService {
  private static CACHE_TTL = {
    realtime: 30, // 30 seconds for real-time data
    hourly: 300, // 5 minutes for hourly data
    daily: 3600, // 1 hour for daily data
    weekly: 21600, // 6 hours for weekly data
  };

  /**
   * Get real-time metrics for a merchant
   */
  static async getRealTimeMetrics(merchantId: string): Promise<RealTimeMetrics> {
    const cacheKey = `analytics:realtime:${merchantId}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Current hour metrics
    const [hourRevenue, hourStats] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: hourStart },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.groupBy({
        by: ['status'],
        where: {
          merchantId,
          createdAt: { gte: hourStart },
        },
        _count: true,
      }),
    ]);

    const hourTotal = hourStats.reduce((sum, s) => sum + s._count, 0);
    const hourSuccessful = hourStats.find(s => s.status === 'SETTLED')?._count || 0;
    const hourFailed = hourStats.find(s => s.status === 'FAILED')?._count || 0;

    // Today metrics
    const [todayRevenue, todayCount, todayUniquePayers, todayAverage] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: {
          merchantId,
          createdAt: { gte: todayStart },
        },
      }),
      prisma.transaction.findMany({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: todayStart },
          clientAddress: { not: null },
        },
        select: { clientAddress: true },
        distinct: ['clientAddress'],
      }),
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: todayStart },
        },
        _avg: { amount: true },
      }),
    ]);

    // Live data
    const [pending, verifying, recent] = await Promise.all([
      prisma.transaction.count({
        where: {
          merchantId,
          status: 'PENDING',
        },
      }),
      prisma.transaction.count({
        where: {
          merchantId,
          status: 'VERIFIED',
        },
      }),
      prisma.transaction.findMany({
        where: {
          merchantId,
          status: 'SETTLED',
        },
        orderBy: { settledAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const metrics: RealTimeMetrics = {
      currentHour: {
        revenue: Number(hourRevenue._sum.amount || 0),
        transactionCount: hourTotal,
        successfulCount: hourSuccessful,
        failedCount: hourFailed,
        successRate: hourTotal > 0 ? (hourSuccessful / hourTotal) * 100 : 0,
      },
      today: {
        revenue: Number(todayRevenue._sum.amount || 0),
        transactionCount: todayCount,
        successfulCount: todayCount - hourFailed,
        uniquePayers: todayUniquePayers.length,
        averageValue: Number(todayAverage._avg.amount || 0),
      },
      live: {
        pendingTransactions: pending,
        activeVerifications: verifying,
        recentPayments: recent,
      },
    };

    // Cache for 30 seconds
    await redis.setex(cacheKey, this.CACHE_TTL.realtime, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * Get dashboard metrics with trends
   */
  static async getDashboardMetrics(merchantId: string): Promise<DashboardMetrics> {
    const cacheKey = `analytics:dashboard:${merchantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();

    // Calculate date ranges
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);

    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setDate(lastMonthStart.getDate() - 30);

    // Get all metrics in parallel
    const [
      todayRevenue,
      yesterdayRevenue,
      weekRevenue,
      lastWeekRevenue,
      monthRevenue,
      lastMonthRevenue,
      todayCount,
      yesterdayCount,
      weekCount,
      lastWeekCount,
      monthCount,
      lastMonthCount,
      todaySuccess,
      weekSuccess,
      monthSuccess,
    ] = await Promise.all([
      // Revenue
      this.getRevenue(merchantId, todayStart, now),
      this.getRevenue(merchantId, yesterdayStart, todayStart),
      this.getRevenue(merchantId, weekStart, now),
      this.getRevenue(merchantId, lastWeekStart, weekStart),
      this.getRevenue(merchantId, monthStart, now),
      this.getRevenue(merchantId, lastMonthStart, monthStart),
      // Transaction counts
      this.getTransactionCount(merchantId, todayStart, now),
      this.getTransactionCount(merchantId, yesterdayStart, todayStart),
      this.getTransactionCount(merchantId, weekStart, now),
      this.getTransactionCount(merchantId, lastWeekStart, weekStart),
      this.getTransactionCount(merchantId, monthStart, now),
      this.getTransactionCount(merchantId, lastMonthStart, monthStart),
      // Success rates
      this.getSuccessRate(merchantId, todayStart, now),
      this.getSuccessRate(merchantId, weekStart, now),
      this.getSuccessRate(merchantId, monthStart, now),
    ]);

    const metrics: DashboardMetrics = {
      revenue: {
        today: this.calculateTrend(todayRevenue, yesterdayRevenue),
        thisWeek: this.calculateTrend(weekRevenue, lastWeekRevenue),
        thisMonth: this.calculateTrend(monthRevenue, lastMonthRevenue),
      },
      transactions: {
        today: this.calculateTrend(todayCount, yesterdayCount),
        thisWeek: this.calculateTrend(weekCount, lastWeekCount),
        thisMonth: this.calculateTrend(monthCount, lastMonthCount),
      },
      successRate: {
        today: todaySuccess,
        thisWeek: weekSuccess,
        thisMonth: monthSuccess,
      },
      averageValue: {
        today: todayCount > 0 ? todayRevenue / todayCount : 0,
        thisWeek: weekCount > 0 ? weekRevenue / weekCount : 0,
        thisMonth: monthCount > 0 ? monthRevenue / monthCount : 0,
      },
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, this.CACHE_TTL.hourly, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * Track payment event
   */
  static async trackPaymentEvent(
    merchantId: string,
    eventType: 'created' | 'verified' | 'settled' | 'failed' | 'expired',
    transactionId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Record in analytics table
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return;

    await prisma.analytics.create({
      data: {
        merchantId,
        metricType: `PAYMENT_${eventType.toUpperCase()}` as any,
        value: transaction.amount,
        metadata: {
          transactionId,
          eventType,
          ...metadata,
        },
      },
    });

    // Invalidate relevant caches
    await this.invalidateCache(merchantId);
  }

  /**
   * Track resource access
   */
  static async trackResourceAccess(
    merchantId: string,
    resourceUrl: string,
    amount: number
  ): Promise<void> {
    await prisma.analytics.create({
      data: {
        merchantId,
        metricType: 'RESOURCE_ACCESS',
        value: new Prisma.Decimal(amount),
        metadata: {
          resourceUrl,
        },
      },
    });
  }

  /**
   * Get revenue for date range
   */
  private static async getRevenue(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await prisma.transaction.aggregate({
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }

  /**
   * Get transaction count for date range
   */
  private static async getTransactionCount(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    return await prisma.transaction.count({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  /**
   * Get success rate for date range
   */
  private static async getSuccessRate(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const [total, successful] = await Promise.all([
      prisma.transaction.count({
        where: {
          merchantId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.transaction.count({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    return total > 0 ? (successful / total) * 100 : 0;
  }

  /**
   * Calculate trend data
   */
  private static calculateTrend(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (change > 0) direction = 'up';
    else if (change < 0) direction = 'down';

    return {
      current,
      previous,
      change,
      changePercent,
      direction,
    };
  }

  /**
   * Invalidate cache for a merchant
   */
  static async invalidateCache(merchantId: string): Promise<void> {
    const keys = await redis.keys(`analytics:*:${merchantId}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get peak transaction times
   */
  static async getPeakTimes(
    merchantId: string,
    days: number = 30
  ): Promise<Array<{ hour: number; count: number; revenue: number }>> {
    const cacheKey = `analytics:peak-times:${merchantId}:${days}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await prisma.$queryRaw<
      Array<{ hour: number; count: bigint; revenue: Prisma.Decimal }>
    >`
      SELECT
        HOUR(created_at) as hour,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM Transaction
      WHERE
        merchant_id = ${merchantId}
        AND status = 'SETTLED'
        AND created_at >= ${startDate}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const peakTimes = results.map((r) => ({
      hour: r.hour,
      count: Number(r.count),
      revenue: Number(r.revenue),
    }));

    // Cache for 6 hours
    await redis.setex(cacheKey, this.CACHE_TTL.weekly, JSON.stringify(peakTimes));

    return peakTimes;
  }

  /**
   * Cleanup - close Redis connection
   */
  static async cleanup(): Promise<void> {
    await redis.quit();
  }
}

export default AnalyticsService;
