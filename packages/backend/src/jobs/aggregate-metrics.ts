import { CronJob } from 'cron';
import prisma from '../db';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger';
import AnalyticsService from '../services/analytics';

/**
 * Metric Aggregation Jobs
 * Runs periodic aggregations and calculations for analytics
 */

/**
 * Hourly Revenue Aggregation
 * Runs every hour to aggregate transaction data
 */
export const hourlyRevenueAggregation = new CronJob(
  '0 * * * *', // Every hour at minute 0
  async () => {
    try {
      logger.info('Starting hourly revenue aggregation');

      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1, 0, 0, 0);

      const twoHoursAgo = new Date(oneHourAgo);
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 1);

      // Get all active merchants
      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const merchant of merchants) {
        // Aggregate revenue for the past hour
        const hourlyStats = await prisma.transaction.aggregate({
          where: {
            merchantId: merchant.id,
            status: 'SETTLED',
            createdAt: { gte: oneHourAgo, lt: new Date() },
          },
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true },
        });

        if (hourlyStats._count > 0) {
          // Record aggregated metrics
          await prisma.analytics.create({
            data: {
              merchantId: merchant.id,
              metricType: 'HOURLY_REVENUE',
              value: hourlyStats._sum.amount || new Prisma.Decimal(0),
              metadata: {
                hour: oneHourAgo.toISOString(),
                transactionCount: hourlyStats._count,
                averageValue: hourlyStats._avg.amount,
              },
            },
          });

          logger.info(
            `Aggregated hourly revenue for merchant ${merchant.id}: ${hourlyStats._sum.amount} ZEC`
          );
        }

        // Invalidate cache
        await AnalyticsService.invalidateCache(merchant.id);
      }

      logger.info('Completed hourly revenue aggregation');
    } catch (error) {
      logger.error('Error in hourly revenue aggregation:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Daily Statistics Aggregation
 * Runs once per day at midnight UTC
 */
export const dailyStatsAggregation = new CronJob(
  '0 0 * * *', // Daily at midnight
  async () => {
    try {
      logger.info('Starting daily statistics aggregation');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const merchant of merchants) {
        // Get daily stats
        const [revenue, transactionCount, uniquePayers, successRate] =
          await Promise.all([
            // Total revenue
            prisma.transaction.aggregate({
              where: {
                merchantId: merchant.id,
                status: 'SETTLED',
                createdAt: { gte: yesterday, lt: today },
              },
              _sum: { amount: true },
            }),
            // Transaction count
            prisma.transaction.count({
              where: {
                merchantId: merchant.id,
                createdAt: { gte: yesterday, lt: today },
              },
            }),
            // Unique payers
            prisma.transaction.findMany({
              where: {
                merchantId: merchant.id,
                status: 'SETTLED',
                createdAt: { gte: yesterday, lt: today },
                clientAddress: { not: null },
              },
              select: { clientAddress: true },
              distinct: ['clientAddress'],
            }),
            // Success rate
            prisma.transaction.groupBy({
              by: ['status'],
              where: {
                merchantId: merchant.id,
                createdAt: { gte: yesterday, lt: today },
              },
              _count: true,
            }),
          ]);

        const settled = successRate.find((s) => s.status === 'SETTLED')?._count || 0;
        const rate = transactionCount > 0 ? (settled / transactionCount) * 100 : 0;

        // Record daily metrics
        await prisma.analytics.createMany({
          data: [
            {
              merchantId: merchant.id,
              metricType: 'DAILY_REVENUE',
              value: revenue._sum.amount || new Prisma.Decimal(0),
              metadata: {
                date: yesterday.toISOString().split('T')[0],
                transactionCount,
              },
            },
            {
              merchantId: merchant.id,
              metricType: 'DAILY_UNIQUE_PAYERS',
              value: new Prisma.Decimal(uniquePayers.length),
              metadata: {
                date: yesterday.toISOString().split('T')[0],
              },
            },
            {
              merchantId: merchant.id,
              metricType: 'DAILY_SUCCESS_RATE',
              value: new Prisma.Decimal(rate),
              metadata: {
                date: yesterday.toISOString().split('T')[0],
                settled,
                total: transactionCount,
              },
            },
          ],
        });

        logger.info(
          `Aggregated daily stats for merchant ${merchant.id}: Revenue=${revenue._sum.amount}, Unique Payers=${uniquePayers.length}`
        );

        // Invalidate cache
        await AnalyticsService.invalidateCache(merchant.id);
      }

      logger.info('Completed daily statistics aggregation');
    } catch (error) {
      logger.error('Error in daily statistics aggregation:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Weekly Summary Aggregation
 * Runs once per week on Sunday at midnight
 */
export const weeklySummaryAggregation = new CronJob(
  '0 0 * * 0', // Every Sunday at midnight
  async () => {
    try {
      logger.info('Starting weekly summary aggregation');

      const weekEnd = new Date();
      weekEnd.setHours(0, 0, 0, 0);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const merchant of merchants) {
        // Get weekly stats
        const [revenue, transactionCount, topResources] = await Promise.all([
          prisma.transaction.aggregate({
            where: {
              merchantId: merchant.id,
              status: 'SETTLED',
              createdAt: { gte: weekStart, lt: weekEnd },
            },
            _sum: { amount: true },
            _avg: { amount: true },
          }),
          prisma.transaction.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: weekStart, lt: weekEnd },
            },
          }),
          prisma.transaction.groupBy({
            by: ['resourceUrl'],
            where: {
              merchantId: merchant.id,
              status: 'SETTLED',
              createdAt: { gte: weekStart, lt: weekEnd },
            },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
            take: 5,
          }),
        ]);

        // Record weekly summary
        await prisma.analytics.create({
          data: {
            merchantId: merchant.id,
            metricType: 'WEEKLY_SUMMARY',
            value: revenue._sum.amount || new Prisma.Decimal(0),
            metadata: {
              weekStart: weekStart.toISOString().split('T')[0],
              weekEnd: weekEnd.toISOString().split('T')[0],
              transactionCount,
              averageValue: revenue._avg.amount,
              topResources: topResources.map((r) => ({
                url: r.resourceUrl,
                revenue: r._sum.amount,
                count: r._count,
              })),
            },
          },
        });

        logger.info(
          `Aggregated weekly summary for merchant ${merchant.id}: Revenue=${revenue._sum.amount}`
        );
      }

      logger.info('Completed weekly summary aggregation');
    } catch (error) {
      logger.error('Error in weekly summary aggregation:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Monthly Report Generation
 * Runs on the first day of each month
 */
export const monthlyReportGeneration = new CronJob(
  '0 1 1 * *', // 1st of month at 1:00 AM
  async () => {
    try {
      logger.info('Starting monthly report generation');

      const monthEnd = new Date();
      monthEnd.setDate(1);
      monthEnd.setHours(0, 0, 0, 0);

      const monthStart = new Date(monthEnd);
      monthStart.setMonth(monthStart.getMonth() - 1);

      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: { id: true, email: true, name: true },
      });

      for (const merchant of merchants) {
        // Get comprehensive monthly stats
        const [
          revenue,
          transactionStats,
          uniquePayers,
          topResources,
          paymentMethods,
          successRate,
        ] = await Promise.all([
          // Total revenue
          prisma.transaction.aggregate({
            where: {
              merchantId: merchant.id,
              status: 'SETTLED',
              createdAt: { gte: monthStart, lt: monthEnd },
            },
            _sum: { amount: true },
            _avg: { amount: true },
            _min: { amount: true },
            _max: { amount: true },
          }),
          // Transaction counts
          prisma.transaction.groupBy({
            by: ['status'],
            where: {
              merchantId: merchant.id,
              createdAt: { gte: monthStart, lt: monthEnd },
            },
            _count: true,
          }),
          // Unique payers
          prisma.transaction.findMany({
            where: {
              merchantId: merchant.id,
              status: 'SETTLED',
              createdAt: { gte: monthStart, lt: monthEnd },
              clientAddress: { not: null },
            },
            select: { clientAddress: true },
            distinct: ['clientAddress'],
          }),
          // Top resources
          prisma.transaction.groupBy({
            by: ['resourceUrl'],
            where: {
              merchantId: merchant.id,
              status: 'SETTLED',
              createdAt: { gte: monthStart, lt: monthEnd },
            },
            _sum: { amount: true },
            _count: true,
            orderBy: { _sum: { amount: 'desc' } },
            take: 10,
          }),
          // Payment method breakdown
          prisma.$queryRaw<
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
              merchant_id = ${merchant.id}
              AND status = 'SETTLED'
              AND created_at >= ${monthStart}
              AND created_at < ${monthEnd}
              AND client_address IS NOT NULL
            GROUP BY type
          `,
          // Success rate
          prisma.transaction.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }),
        ]);

        const settled = transactionStats.find((s) => s.status === 'SETTLED')?._count || 0;
        const successRatePercent = successRate > 0 ? (settled / successRate) * 100 : 0;

        // Create monthly report
        const report = {
          merchantId: merchant.id,
          merchantName: merchant.name,
          period: {
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
            month: monthStart.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            }),
          },
          revenue: {
            total: Number(revenue._sum.amount || 0),
            average: Number(revenue._avg.amount || 0),
            min: Number(revenue._min.amount || 0),
            max: Number(revenue._max.amount || 0),
          },
          transactions: {
            total: successRate,
            byStatus: transactionStats.map((s) => ({
              status: s.status,
              count: s._count,
            })),
            successRate: successRatePercent,
          },
          customers: {
            unique: uniquePayers.length,
          },
          topResources: topResources.map((r) => ({
            url: r.resourceUrl,
            revenue: Number(r._sum.amount || 0),
            count: r._count,
          })),
          paymentMethods: paymentMethods.map((pm) => ({
            type: pm.type,
            count: Number(pm.count),
            revenue: Number(pm.revenue),
          })),
        };

        // Store monthly report
        await prisma.analytics.create({
          data: {
            merchantId: merchant.id,
            metricType: 'MONTHLY_REPORT',
            value: revenue._sum.amount || new Prisma.Decimal(0),
            metadata: report,
          },
        });

        logger.info(
          `Generated monthly report for merchant ${merchant.id}: Revenue=${revenue._sum.amount}`
        );

        // TODO: Send email with monthly report
        // await EmailService.sendMonthlyReport(merchant.email, report);
      }

      logger.info('Completed monthly report generation');
    } catch (error) {
      logger.error('Error in monthly report generation:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Cache Warming Job
 * Runs every 5 minutes to pre-populate frequently accessed metrics
 */
export const cacheWarmingJob = new CronJob(
  '*/5 * * * *', // Every 5 minutes
  async () => {
    try {
      const merchants = await prisma.merchant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const merchant of merchants) {
        // Pre-populate real-time metrics cache
        await AnalyticsService.getRealTimeMetrics(merchant.id);

        // Pre-populate dashboard metrics cache
        await AnalyticsService.getDashboardMetrics(merchant.id);
      }

      logger.debug('Cache warming completed');
    } catch (error) {
      logger.error('Error in cache warming:', error);
    }
  },
  null,
  false,
  'UTC'
);

/**
 * Start all aggregation jobs
 */
export function startAggregationJobs(): void {
  logger.info('Starting aggregation jobs...');

  hourlyRevenueAggregation.start();
  dailyStatsAggregation.start();
  weeklySummaryAggregation.start();
  monthlyReportGeneration.start();
  cacheWarmingJob.start();

  logger.info('All aggregation jobs started');
}

/**
 * Stop all aggregation jobs
 */
export function stopAggregationJobs(): void {
  logger.info('Stopping aggregation jobs...');

  hourlyRevenueAggregation.stop();
  dailyStatsAggregation.stop();
  weeklySummaryAggregation.stop();
  monthlyReportGeneration.stop();
  cacheWarmingJob.stop();

  logger.info('All aggregation jobs stopped');
}

export default {
  hourlyRevenueAggregation,
  dailyStatsAggregation,
  weeklySummaryAggregation,
  monthlyReportGeneration,
  cacheWarmingJob,
  startAggregationJobs,
  stopAggregationJobs,
};
