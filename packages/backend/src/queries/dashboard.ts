import prisma from '../db';
import { Redis } from 'ioredis';
import config from '../config';
import { Prisma } from '@prisma/client';

// Redis client for caching
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db || 0,
});

export interface RevenueTrend {
  date: string;
  revenue: number;
  transactionCount: number;
  uniquePayers: number;
}

export interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface PeakTime {
  hour: number;
  label: string;
  transactionCount: number;
  revenue: number;
}

export interface ResourcePerformance {
  url: string;
  revenue: number;
  transactionCount: number;
  uniqueUsers: number;
  averageValue: number;
  conversionRate: number;
}

/**
 * Dashboard Query Service
 * Optimized queries for dashboard with Redis caching
 */
export class DashboardQueries {
  private static CACHE_TTL = {
    realtime: 30, // 30 seconds
    hourly: 300, // 5 minutes
    daily: 1800, // 30 minutes
    weekly: 3600, // 1 hour
  };

  /**
   * Get today's revenue vs yesterday
   */
  static async getTodayVsYesterday(
    merchantId: string
  ): Promise<{
    today: ComparisonData & { hourly: Array<{ hour: number; revenue: number }> };
  }> {
    const cacheKey = `dashboard:today-vs-yesterday:${merchantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Use TimescaleDB continuous aggregate for hourly data
    const [todayHourly, yesterdayTotal] = await Promise.all([
      prisma.$queryRaw<
        Array<{ hour: number; revenue: Prisma.Decimal; count: bigint }>
      >`
        SELECT
          EXTRACT(HOUR FROM bucket) as hour,
          SUM(total_revenue) as revenue,
          SUM(transaction_count) as count
        FROM analytics_hourly_revenue
        WHERE
          merchant_id = ${merchantId}
          AND bucket >= ${todayStart}
          AND bucket < ${now}
        GROUP BY hour
        ORDER BY hour
      `,
      prisma.$queryRaw<Array<{ revenue: Prisma.Decimal }>>`
        SELECT SUM(total_revenue) as revenue
        FROM analytics_daily_revenue
        WHERE
          merchant_id = ${merchantId}
          AND bucket >= ${yesterdayStart}
          AND bucket < ${todayStart}
      `,
    ]);

    const todayTotal = todayHourly.reduce((sum, h) => sum + Number(h.revenue), 0);
    const yesterdayRevenue = Number(yesterdayTotal[0]?.revenue || 0);

    const change = todayTotal - yesterdayRevenue;
    const changePercent = yesterdayRevenue > 0 ? (change / yesterdayRevenue) * 100 : 0;

    const result = {
      today: {
        current: todayTotal,
        previous: yesterdayRevenue,
        change,
        changePercent,
        hourly: todayHourly.map((h) => ({
          hour: h.hour,
          revenue: Number(h.revenue),
        })),
      },
    };

    await redis.setex(cacheKey, this.CACHE_TTL.hourly, JSON.stringify(result));

    return result;
  }

  /**
   * Get 7-day revenue trend
   */
  static async get7DayTrend(merchantId: string): Promise<Array<RevenueTrend>> {
    const cacheKey = `dashboard:7-day-trend:${merchantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    // Use TimescaleDB continuous aggregate
    const trends = await prisma.$queryRaw<
      Array<{
        bucket: Date;
        revenue: Prisma.Decimal;
        count: bigint;
        unique_payers: bigint;
      }>
    >`
      SELECT
        bucket,
        total_revenue as revenue,
        transaction_count as count,
        unique_payers
      FROM analytics_daily_revenue
      WHERE
        merchant_id = ${merchantId}
        AND bucket >= ${startDate}
        AND bucket < ${endDate}
      ORDER BY bucket ASC
    `;

    const result = trends.map((t) => ({
      date: t.bucket.toISOString().split('T')[0],
      revenue: Number(t.revenue),
      transactionCount: Number(t.count),
      uniquePayers: Number(t.unique_payers),
    }));

    await redis.setex(cacheKey, this.CACHE_TTL.daily, JSON.stringify(result));

    return result;
  }

  /**
   * Get 30-day comparison
   */
  static async get30DayComparison(merchantId: string): Promise<{
    thisMonth: ComparisonData & { daily: Array<RevenueTrend> };
  }> {
    const cacheKey = `dashboard:30-day-comparison:${merchantId}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const thisMonthStart = new Date(endDate);
    thisMonthStart.setDate(thisMonthStart.getDate() - 30);

    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setDate(lastMonthStart.getDate() - 30);

    const [thisMonthData, lastMonthTotal] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          bucket: Date;
          revenue: Prisma.Decimal;
          count: bigint;
          unique_payers: bigint;
        }>
      >`
        SELECT
          bucket,
          total_revenue as revenue,
          transaction_count as count,
          unique_payers
        FROM analytics_daily_revenue
        WHERE
          merchant_id = ${merchantId}
          AND bucket >= ${thisMonthStart}
          AND bucket < ${endDate}
        ORDER BY bucket ASC
      `,
      prisma.$queryRaw<Array<{ revenue: Prisma.Decimal }>>`
        SELECT SUM(total_revenue) as revenue
        FROM analytics_daily_revenue
        WHERE
          merchant_id = ${merchantId}
          AND bucket >= ${lastMonthStart}
          AND bucket < ${thisMonthStart}
      `,
    ]);

    const thisMonthTotal = thisMonthData.reduce((sum, d) => sum + Number(d.revenue), 0);
    const lastMonthRevenue = Number(lastMonthTotal[0]?.revenue || 0);

    const change = thisMonthTotal - lastMonthRevenue;
    const changePercent = lastMonthRevenue > 0 ? (change / lastMonthRevenue) * 100 : 0;

    const result = {
      thisMonth: {
        current: thisMonthTotal,
        previous: lastMonthRevenue,
        change,
        changePercent,
        daily: thisMonthData.map((d) => ({
          date: d.bucket.toISOString().split('T')[0],
          revenue: Number(d.revenue),
          transactionCount: Number(d.count),
          uniquePayers: Number(d.unique_payers),
        })),
      },
    };

    await redis.setex(cacheKey, this.CACHE_TTL.daily, JSON.stringify(result));

    return result;
  }

  /**
   * Get top performing resources
   */
  static async getTopResources(
    merchantId: string,
    limit: number = 10,
    days: number = 30
  ): Promise<Array<ResourcePerformance>> {
    const cacheKey = `dashboard:top-resources:${merchantId}:${limit}:${days}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use TimescaleDB continuous aggregate
    const resources = await prisma.$queryRaw<
      Array<{
        resource_url: string;
        revenue: Prisma.Decimal;
        access_count: bigint;
        avg_revenue: Prisma.Decimal;
      }>
    >`
      SELECT
        resource_url,
        SUM(total_revenue) as revenue,
        SUM(access_count) as access_count,
        AVG(avg_revenue_per_access) as avg_revenue
      FROM analytics_resource_access
      WHERE
        merchant_id = ${merchantId}
        AND bucket >= ${startDate}
      GROUP BY resource_url
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    // Get unique users for each resource
    const resourceWithUsers = await Promise.all(
      resources.map(async (r) => {
        const uniqueUsers = await prisma.transaction.findMany({
          where: {
            merchantId,
            resourceUrl: r.resource_url,
            status: 'SETTLED',
            clientAddress: { not: null },
            createdAt: { gte: startDate },
          },
          select: { clientAddress: true },
          distinct: ['clientAddress'],
        });

        // Get total access attempts for conversion rate
        const totalAttempts = await prisma.transaction.count({
          where: {
            merchantId,
            resourceUrl: r.resource_url,
            createdAt: { gte: startDate },
          },
        });

        const successfulAccess = Number(r.access_count);
        const conversionRate =
          totalAttempts > 0 ? (successfulAccess / totalAttempts) * 100 : 0;

        return {
          url: r.resource_url,
          revenue: Number(r.revenue),
          transactionCount: Number(r.access_count),
          uniqueUsers: uniqueUsers.length,
          averageValue: Number(r.avg_revenue),
          conversionRate,
        };
      })
    );

    await redis.setex(cacheKey, this.CACHE_TTL.daily, JSON.stringify(resourceWithUsers));

    return resourceWithUsers;
  }

  /**
   * Get peak transaction times
   */
  static async getPeakTimes(
    merchantId: string,
    days: number = 30
  ): Promise<Array<PeakTime>> {
    const cacheKey = `dashboard:peak-times:${merchantId}:${days}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query hourly aggregates
    const peakData = await prisma.$queryRaw<
      Array<{ hour: number; count: bigint; revenue: Prisma.Decimal }>
    >`
      SELECT
        EXTRACT(HOUR FROM bucket) as hour,
        SUM(transaction_count) as count,
        SUM(total_revenue) as revenue
      FROM analytics_hourly_revenue
      WHERE
        merchant_id = ${merchantId}
        AND bucket >= ${startDate}
      GROUP BY hour
      ORDER BY count DESC
    `;

    const hourLabels = [
      '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM',
      '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
      '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM',
      '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM',
    ];

    const result = peakData.map((p) => ({
      hour: p.hour,
      label: hourLabels[p.hour],
      transactionCount: Number(p.count),
      revenue: Number(p.revenue),
    }));

    await redis.setex(cacheKey, this.CACHE_TTL.weekly, JSON.stringify(result));

    return result;
  }

  /**
   * Get payment method breakdown
   */
  static async getPaymentMethodBreakdown(
    merchantId: string,
    days: number = 30
  ): Promise<Array<{
    method: 'transparent' | 'shielded' | 'unknown';
    count: number;
    revenue: number;
    percentage: number;
  }>> {
    const cacheKey = `dashboard:payment-methods:${merchantId}:${days}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use TimescaleDB continuous aggregate
    const methods = await prisma.$queryRaw<
      Array<{
        payment_method: string;
        count: bigint;
        revenue: Prisma.Decimal;
      }>
    >`
      SELECT
        payment_method,
        SUM(transaction_count) as count,
        SUM(total_revenue) as revenue
      FROM analytics_payment_methods
      WHERE
        merchant_id = ${merchantId}
        AND bucket >= ${startDate}
      GROUP BY payment_method
    `;

    const total = methods.reduce((sum, m) => sum + Number(m.count), 0);

    const result = methods.map((m) => ({
      method: m.payment_method as 'transparent' | 'shielded' | 'unknown',
      count: Number(m.count),
      revenue: Number(m.revenue),
      percentage: total > 0 ? (Number(m.count) / total) * 100 : 0,
    }));

    await redis.setex(cacheKey, this.CACHE_TTL.weekly, JSON.stringify(result));

    return result;
  }

  /**
   * Get success rate over time
   */
  static async getSuccessRateOverTime(
    merchantId: string,
    days: number = 7
  ): Promise<
    Array<{
      date: string;
      successRate: number;
      total: number;
      successful: number;
      failed: number;
    }>
  > {
    const cacheKey = `dashboard:success-rate:${merchantId}:${days}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate hourly data to daily
    const rateData = await prisma.$queryRaw<
      Array<{
        date: string;
        total: bigint;
        successful: bigint;
        failed: bigint;
      }>
    >`
      SELECT
        DATE(bucket) as date,
        SUM(total_transactions) as total,
        SUM(successful) as successful,
        SUM(failed) as failed
      FROM analytics_success_rate
      WHERE
        merchant_id = ${merchantId}
        AND bucket >= ${startDate}
      GROUP BY date
      ORDER BY date ASC
    `;

    const result = rateData.map((r) => {
      const total = Number(r.total);
      const successful = Number(r.successful);
      return {
        date: r.date,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        total,
        successful,
        failed: Number(r.failed),
      };
    });

    await redis.setex(cacheKey, this.CACHE_TTL.daily, JSON.stringify(result));

    return result;
  }

  /**
   * Invalidate all dashboard caches for a merchant
   */
  static async invalidateCache(merchantId: string): Promise<void> {
    const keys = await redis.keys(`dashboard:*:${merchantId}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export default DashboardQueries;
