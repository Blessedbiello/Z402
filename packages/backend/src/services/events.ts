import prisma from '../db';
import { Prisma } from '@prisma/client';
import AnalyticsService from './analytics';

export interface PaymentEvent {
  id: string;
  type: 'created' | 'verified' | 'settled' | 'failed' | 'expired' | 'refunded';
  transactionId: string;
  merchantId: string;
  amount: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface FailureAnalysis {
  totalFailed: number;
  failureRate: number;
  commonReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  failuresByHour: Array<{
    hour: number;
    count: number;
  }>;
  retryPatterns: {
    averageRetries: number;
    successfulRetries: number;
    failedRetries: number;
  };
}

export interface WebhookMetrics {
  totalDeliveries: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  averageDeliveryTime: number;
  byEventType: Array<{
    eventType: string;
    count: number;
    successRate: number;
  }>;
}

/**
 * Event Tracking Service
 */
export class EventTrackingService {
  /**
   * Track payment event
   */
  static async trackPayment(event: Omit<PaymentEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Record in analytics
      await AnalyticsService.trackPaymentEvent(
        event.merchantId,
        event.type,
        event.transactionId,
        event.metadata
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          merchantId: event.merchantId,
          action: `PAYMENT_${event.type.toUpperCase()}`,
          resourceType: 'Transaction',
          resourceId: event.transactionId,
          metadata: event.metadata,
        },
      });
    } catch (error) {
      console.error('Error tracking payment event:', error);
    }
  }

  /**
   * Track resource access
   */
  static async trackResourceAccess(
    merchantId: string,
    resourceUrl: string,
    amount: number,
    clientAddress?: string
  ): Promise<void> {
    try {
      await AnalyticsService.trackResourceAccess(merchantId, resourceUrl, amount);

      // Track unique resource access
      await prisma.analytics.create({
        data: {
          merchantId,
          metricType: 'RESOURCE_ACCESS',
          value: new Prisma.Decimal(amount),
          metadata: {
            resourceUrl,
            clientAddress,
          },
        },
      });
    } catch (error) {
      console.error('Error tracking resource access:', error);
    }
  }

  /**
   * Analyze payment failures
   */
  static async analyzeFailures(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FailureAnalysis> {
    // Get failed transactions
    const failed = await prisma.transaction.findMany({
      where: {
        merchantId,
        status: 'FAILED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        metadata: true,
        createdAt: true,
      },
    });

    const total = await prisma.transaction.count({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Extract failure reasons
    const reasonCounts = new Map<string, number>();
    const hourCounts = new Map<number, number>();

    failed.forEach((tx) => {
      const metadata = tx.metadata as any;
      const reason = metadata?.failureReason || 'Unknown';

      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);

      const hour = tx.createdAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Convert to arrays and sort
    const commonReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: (count / failed.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const failuresByHour = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // Analyze retry patterns
    const retries = await prisma.transaction.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
        metadata: {
          path: ['retryCount'],
          not: Prisma.DbNull,
        },
      },
      select: {
        status: true,
        metadata: true,
      },
    });

    const totalRetries = retries.reduce((sum, tx) => {
      const metadata = tx.metadata as any;
      return sum + (metadata?.retryCount || 0);
    }, 0);

    const successfulRetries = retries.filter((tx) => tx.status === 'SETTLED').length;
    const failedRetries = retries.filter((tx) => tx.status === 'FAILED').length;

    return {
      totalFailed: failed.length,
      failureRate: total > 0 ? (failed.length / total) * 100 : 0,
      commonReasons,
      failuresByHour,
      retryPatterns: {
        averageRetries: retries.length > 0 ? totalRetries / retries.length : 0,
        successfulRetries,
        failedRetries,
      },
    };
  }

  /**
   * Get webhook delivery metrics
   */
  static async getWebhookMetrics(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WebhookMetrics> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        status: true,
        eventType: true,
        deliveredAt: true,
        createdAt: true,
      },
    });

    const total = deliveries.length;
    const successful = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const failed = deliveries.filter((d) => d.status === 'FAILED').length;
    const pending = deliveries.filter((d) => d.status === 'PENDING').length;

    // Calculate average delivery time
    const deliveryTimes = deliveries
      .filter((d) => d.deliveredAt)
      .map((d) => d.deliveredAt!.getTime() - d.createdAt.getTime());

    const averageDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        : 0;

    // Group by event type
    const byEventType = new Map<string, { total: number; successful: number }>();

    deliveries.forEach((d) => {
      const current = byEventType.get(d.eventType) || { total: 0, successful: 0 };
      current.total += 1;
      if (d.status === 'DELIVERED') {
        current.successful += 1;
      }
      byEventType.set(d.eventType, current);
    });

    const eventTypeMetrics = Array.from(byEventType.entries()).map(
      ([eventType, stats]) => ({
        eventType,
        count: stats.total,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
      })
    );

    return {
      totalDeliveries: total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageDeliveryTime: Math.round(averageDeliveryTime), // milliseconds
      byEventType: eventTypeMetrics,
    };
  }

  /**
   * Track unique payer
   */
  static async trackUniquePayer(
    merchantId: string,
    clientAddress: string,
    amount: number
  ): Promise<void> {
    try {
      await prisma.analytics.create({
        data: {
          merchantId,
          metricType: 'UNIQUE_PAYER',
          value: new Prisma.Decimal(amount),
          metadata: {
            clientAddress,
          },
        },
      });
    } catch (error) {
      console.error('Error tracking unique payer:', error);
    }
  }

  /**
   * Get payment latency metrics
   */
  static async getPaymentLatency(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    average: number;
    median: number;
    p95: number;
    p99: number;
  }> {
    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
        settledAt: { not: null },
      },
      select: {
        createdAt: true,
        settledAt: true,
      },
    });

    const latencies = transactions
      .map((tx) => tx.settledAt!.getTime() - tx.createdAt.getTime())
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return { average: 0, median: 0, p95: 0, p99: 0 };
    }

    const average =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    return {
      average: Math.round(average),
      median: Math.round(median),
      p95: Math.round(p95),
      p99: Math.round(p99),
    };
  }

  /**
   * Get geographic distribution (from IP headers if available)
   */
  static async getGeographicDistribution(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      country?: string;
      region?: string;
      count: number;
      revenue: number;
    }>
  > {
    // This would require storing IP geolocation data
    // For now, return empty array or placeholder
    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        metadata: true,
        amount: true,
      },
    });

    const distribution = new Map<
      string,
      { count: number; revenue: number }
    >();

    transactions.forEach((tx) => {
      const metadata = tx.metadata as any;
      const country = metadata?.country || 'Unknown';

      const current = distribution.get(country) || { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += Number(tx.amount);
      distribution.set(country, current);
    });

    return Array.from(distribution.entries())
      .map(([country, stats]) => ({
        country,
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Track API latency
   */
  static async trackApiLatency(
    merchantId: string,
    endpoint: string,
    latency: number,
    statusCode: number
  ): Promise<void> {
    try {
      await prisma.analytics.create({
        data: {
          merchantId,
          metricType: 'API_LATENCY',
          value: new Prisma.Decimal(latency),
          metadata: {
            endpoint,
            statusCode,
          },
        },
      });
    } catch (error) {
      console.error('Error tracking API latency:', error);
    }
  }
}

export default EventTrackingService;
