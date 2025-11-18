import prisma from '../db';
import { Prisma } from '@prisma/client';
import DashboardQueries from '../queries/dashboard';

export interface ExportOptions {
  merchantId: string;
  startDate: Date;
  endDate: Date;
  format: 'csv' | 'json';
  includeMetadata?: boolean;
}

export interface MonthlyReport {
  merchantInfo: {
    id: string;
    name: string;
    email: string;
  };
  period: {
    start: string;
    end: string;
    month: string;
  };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
    averageTransactionValue: number;
    uniquePayers: number;
  };
  topResources: Array<{
    url: string;
    revenue: number;
    transactionCount: number;
  }>;
  paymentMethods: Array<{
    type: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    transactionCount: number;
    uniquePayers: number;
  }>;
}

/**
 * Export Service
 * Generates reports and exports in various formats
 */
export class ExportService {
  /**
   * Export transactions as CSV
   */
  static async exportTransactionsCSV(options: ExportOptions): Promise<string> {
    const { merchantId, startDate, endDate } = options;

    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
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
        createdAt: true,
        settledAt: true,
        expiresAt: true,
        metadata: options.includeMetadata,
      },
    });

    // Build CSV header
    const headers = [
      'Transaction ID',
      'Amount',
      'Currency',
      'Status',
      'Resource URL',
      'Blockchain TX ID',
      'Payment Hash',
      'Confirmations',
      'Client Address',
      'Created At',
      'Settled At',
      'Expires At',
    ];

    if (options.includeMetadata) {
      headers.push('Metadata');
    }

    // Build CSV rows
    const rows = transactions.map((tx) => {
      const row = [
        tx.id,
        tx.amount.toString(),
        tx.currency,
        tx.status,
        `"${tx.resourceUrl}"`, // Quote URLs to handle commas
        tx.transactionId || '',
        tx.paymentHash || '',
        tx.confirmations?.toString() || '0',
        tx.clientAddress || '',
        tx.createdAt.toISOString(),
        tx.settledAt?.toISOString() || '',
        tx.expiresAt?.toISOString() || '',
      ];

      if (options.includeMetadata && tx.metadata) {
        row.push(`"${JSON.stringify(tx.metadata).replace(/"/g, '""')}"`);
      }

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export transactions as JSON
   */
  static async exportTransactionsJSON(options: ExportOptions): Promise<string> {
    const { merchantId, startDate, endDate } = options;

    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'desc' },
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
        createdAt: true,
        settledAt: true,
        expiresAt: true,
        metadata: options.includeMetadata,
      },
    });

    return JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        transactionCount: transactions.length,
        transactions: transactions.map((tx) => ({
          ...tx,
          amount: Number(tx.amount),
        })),
      },
      null,
      2
    );
  }

  /**
   * Generate monthly report
   */
  static async generateMonthlyReport(
    merchantId: string,
    month: Date
  ): Promise<MonthlyReport> {
    // Get merchant info
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Calculate date range
    const startDate = new Date(month);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get summary statistics
    const [
      revenue,
      transactionStats,
      uniquePayers,
      topResources,
      paymentMethods,
      dailyBreakdown,
    ] = await Promise.all([
      // Total revenue
      prisma.transaction.aggregate({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: true,
      }),
      // Transaction counts by status
      prisma.transaction.groupBy({
        by: ['status'],
        where: {
          merchantId,
          createdAt: { gte: startDate, lt: endDate },
        },
        _count: true,
      }),
      // Unique payers
      prisma.transaction.findMany({
        where: {
          merchantId,
          status: 'SETTLED',
          createdAt: { gte: startDate, lt: endDate },
          clientAddress: { not: null },
        },
        select: { clientAddress: true },
        distinct: ['clientAddress'],
      }),
      // Top resources
      DashboardQueries.getTopResources(
        merchantId,
        10,
        Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      ),
      // Payment methods
      DashboardQueries.getPaymentMethodBreakdown(
        merchantId,
        Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      ),
      // Daily breakdown
      prisma.$queryRaw<
        Array<{
          date: Date;
          revenue: Prisma.Decimal;
          count: bigint;
          unique_payers: bigint;
        }>
      >`
        SELECT
          bucket as date,
          total_revenue as revenue,
          transaction_count as count,
          unique_payers
        FROM analytics_daily_revenue
        WHERE
          merchant_id = ${merchantId}
          AND bucket >= ${startDate}
          AND bucket < ${endDate}
        ORDER BY bucket ASC
      `,
    ]);

    const totalTransactions = transactionStats.reduce((sum, s) => sum + s._count, 0);
    const settled = transactionStats.find((s) => s.status === 'SETTLED')?._count || 0;
    const failed = transactionStats.find((s) => s.status === 'FAILED')?._count || 0;
    const successRate = totalTransactions > 0 ? (settled / totalTransactions) * 100 : 0;

    return {
      merchantInfo: merchant,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        month: startDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
      },
      summary: {
        totalRevenue: Number(revenue._sum.amount || 0),
        totalTransactions,
        successfulTransactions: settled,
        failedTransactions: failed,
        successRate,
        averageTransactionValue: Number(revenue._avg.amount || 0),
        uniquePayers: uniquePayers.length,
      },
      topResources: topResources.map((r) => ({
        url: r.url,
        revenue: r.revenue,
        transactionCount: r.transactionCount,
      })),
      paymentMethods: paymentMethods.map((pm) => ({
        type: pm.method,
        count: pm.count,
        revenue: pm.revenue,
        percentage: pm.percentage,
      })),
      dailyBreakdown: dailyBreakdown.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        revenue: Number(d.revenue),
        transactionCount: Number(d.count),
        uniquePayers: Number(d.unique_payers),
      })),
    };
  }

  /**
   * Export monthly report as PDF-friendly HTML
   */
  static async exportMonthlyReportHTML(
    merchantId: string,
    month: Date
  ): Promise<string> {
    const report = await this.generateMonthlyReport(merchantId, month);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Z402 Monthly Report - ${report.period.month}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .header p {
      margin: 10px 0 0;
      color: #666;
      font-size: 18px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .metric {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
    }
    .metric-label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #000;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 24px;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Monthly Report</h1>
    <p>${report.merchantInfo.name}</p>
    <p>${report.period.month}</p>
  </div>

  <div class="summary">
    <div class="metric">
      <div class="metric-label">Total Revenue</div>
      <div class="metric-value">${report.summary.totalRevenue.toFixed(4)} ZEC</div>
    </div>
    <div class="metric">
      <div class="metric-label">Transactions</div>
      <div class="metric-value">${report.summary.totalTransactions.toLocaleString()}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Success Rate</div>
      <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
    </div>
    <div class="metric">
      <div class="metric-label">Unique Payers</div>
      <div class="metric-value">${report.summary.uniquePayers.toLocaleString()}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Avg Transaction</div>
      <div class="metric-value">${report.summary.averageTransactionValue.toFixed(4)} ZEC</div>
    </div>
  </div>

  <div class="section">
    <h2>Top Resources</h2>
    <table>
      <thead>
        <tr>
          <th>Resource URL</th>
          <th>Revenue</th>
          <th>Transactions</th>
        </tr>
      </thead>
      <tbody>
        ${report.topResources
          .map(
            (r) => `
          <tr>
            <td>${r.url}</td>
            <td>${r.revenue.toFixed(4)} ZEC</td>
            <td>${r.transactionCount.toLocaleString()}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Payment Methods</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Count</th>
          <th>Revenue</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${report.paymentMethods
          .map(
            (pm) => `
          <tr>
            <td style="text-transform: capitalize;">${pm.type}</td>
            <td>${pm.count.toLocaleString()}</td>
            <td>${pm.revenue.toFixed(4)} ZEC</td>
            <td>${pm.percentage.toFixed(1)}%</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Generated by Z402 on ${new Date().toLocaleDateString()}</p>
    <p>This report is confidential and intended for ${report.merchantInfo.name} only.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Export analytics data for accounting
   */
  static async exportForAccounting(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const transactions = await prisma.transaction.findMany({
      where: {
        merchantId,
        status: 'SETTLED',
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { settledAt: 'asc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        settledAt: true,
        transactionId: true,
        clientAddress: true,
        resourceUrl: true,
      },
    });

    // Build CSV for accounting software
    const headers = [
      'Date',
      'Transaction ID',
      'Description',
      'Amount',
      'Currency',
      'Client',
      'Blockchain TX',
    ];

    const rows = transactions.map((tx) => [
      tx.settledAt?.toISOString().split('T')[0] || '',
      tx.id,
      `Payment for ${tx.resourceUrl}`,
      tx.amount.toString(),
      tx.currency,
      tx.clientAddress || 'Unknown',
      tx.transactionId || '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export default ExportService;
