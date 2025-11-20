# Z402 Real-Time Analytics Engine

Stripe-level analytics engine for Z402 payment facilitator with real-time metrics, trend analysis, and automated reporting.

## Features

- **Real-time metrics** - Updated every 30 seconds with Redis caching
- **Trend analysis** - Compare today vs yesterday, week, month with growth percentages
- **TimescaleDB aggregates** - Efficient time-series queries with continuous aggregates
- **Automated jobs** - Hourly, daily, weekly, and monthly aggregation jobs
- **Event tracking** - Track all payment events, failures, retries, and webhooks
- **Export functions** - CSV, JSON, and HTML reports for accounting and analysis
- **Dashboard queries** - Optimized queries for dashboard with smart caching
- **Failure analysis** - Analyze payment failures, retry patterns, and common issues
- **Latency monitoring** - Track payment processing times (average, median, p95, p99)
- **Webhook metrics** - Monitor webhook delivery success rates and latency

## Architecture

### Data Flow

```
Payment Event → EventTrackingService → Analytics Table → TimescaleDB Aggregates
                        ↓
                  Redis Cache (30s-1h TTL)
                        ↓
                Dashboard Queries → API Endpoints
```

### Components

1. **AnalyticsService** (`src/services/analytics.ts`)
   - Real-time metrics calculation
   - Dashboard metrics with trends
   - Peak time analysis
   - Cache management

2. **EventTrackingService** (`src/services/events.ts`)
   - Payment event tracking
   - Failure analysis
   - Webhook metrics
   - Latency monitoring
   - Geographic distribution

3. **DashboardQueries** (`src/queries/dashboard.ts`)
   - Optimized queries using TimescaleDB
   - Redis caching (30s-1h TTL)
   - Trend calculations
   - Resource performance metrics

4. **ExportService** (`src/services/export.service.ts`)
   - CSV/JSON transaction exports
   - Monthly report generation
   - HTML reports for email
   - Accounting-friendly exports

5. **Aggregation Jobs** (`src/jobs/aggregate-metrics.ts`)
   - Hourly revenue rollups
   - Daily statistics
   - Weekly summaries
   - Monthly reports
   - Cache warming

## API Endpoints

### Real-Time Metrics

```http
GET /api/v1/analytics/realtime
```

Returns metrics updated every 30 seconds:
- Current hour revenue and transaction count
- Today's total revenue and unique payers
- Live pending/verifying transactions
- Recent successful payments

**Response:**
```json
{
  "success": true,
  "metrics": {
    "currentHour": {
      "revenue": 1.25,
      "transactionCount": 45,
      "successfulCount": 42,
      "failedCount": 3,
      "successRate": 93.33
    },
    "today": {
      "revenue": 12.5,
      "transactionCount": 450,
      "successfulCount": 425,
      "uniquePayers": 127,
      "averageValue": 0.028
    },
    "live": {
      "pendingTransactions": 5,
      "activeVerifications": 2,
      "recentPayments": [...]
    }
  }
}
```

### Dashboard Metrics

```http
GET /api/v1/analytics/dashboard
```

Complete dashboard with trends:
- Revenue trends (today, week, month)
- Transaction trends with growth %
- Success rates
- Average transaction values

**Response:**
```json
{
  "success": true,
  "metrics": {
    "revenue": {
      "today": {
        "current": 12.5,
        "previous": 10.2,
        "change": 2.3,
        "changePercent": 22.5,
        "direction": "up"
      },
      "thisWeek": {...},
      "thisMonth": {...}
    },
    "transactions": {...},
    "successRate": {...},
    "averageValue": {...}
  }
}
```

### Trend Analysis

```http
GET /api/v1/analytics/trends/today
GET /api/v1/analytics/trends/week
GET /api/v1/analytics/trends/month
```

Detailed trend data with hourly/daily breakdowns.

### Peak Times

```http
GET /api/v1/analytics/peak-times?days=30
```

Returns transaction volume by hour of day:

```json
{
  "success": true,
  "peakTimes": [
    {
      "hour": 14,
      "label": "2 PM",
      "transactionCount": 1250,
      "revenue": 35.5
    },
    ...
  ]
}
```

### Success Rate Over Time

```http
GET /api/v1/analytics/success-rate?days=7
```

Success rate trends with daily breakdown.

### Failure Analysis

```http
GET /api/v1/analytics/failures?days=30
```

Comprehensive failure analysis:
- Total failed transactions and failure rate
- Common failure reasons with percentages
- Failures by hour of day
- Retry patterns (average retries, success/fail)

**Response:**
```json
{
  "success": true,
  "analysis": {
    "totalFailed": 45,
    "failureRate": 4.5,
    "commonReasons": [
      {
        "reason": "Insufficient confirmations",
        "count": 20,
        "percentage": 44.4
      },
      ...
    ],
    "failuresByHour": [...],
    "retryPatterns": {
      "averageRetries": 1.8,
      "successfulRetries": 12,
      "failedRetries": 8
    }
  }
}
```

### Webhook Metrics

```http
GET /api/v1/analytics/webhook-metrics?days=30
```

Webhook delivery statistics:
- Total deliveries, successful, failed, pending
- Success rate
- Average delivery time
- Breakdown by event type

### Payment Latency

```http
GET /api/v1/analytics/latency?days=7
```

Payment processing latency metrics:

```json
{
  "success": true,
  "latency": {
    "average": 45000,
    "median": 42000,
    "p95": 68000,
    "p99": 95000
  }
}
```

All times in milliseconds.

### Monthly Reports

```http
GET /api/v1/analytics/reports/monthly?month=2024-01&format=json
GET /api/v1/analytics/reports/monthly?month=2024-01&format=html
```

Comprehensive monthly report with:
- Summary statistics
- Top resources
- Payment method breakdown
- Daily revenue breakdown

HTML format returns a print-ready report for email.

### Legacy Endpoints

The following endpoints from the original implementation are still available:

```http
GET /api/v1/analytics/overview?period=30d
GET /api/v1/analytics/revenue?startDate=...&interval=day
GET /api/v1/analytics/transactions?groupBy=status
GET /api/v1/analytics/top-resources?limit=10
GET /api/v1/analytics/payment-methods?period=30d
GET /api/v1/analytics/customers?period=30d
```

## TimescaleDB Continuous Aggregates

The analytics engine uses TimescaleDB continuous aggregates for efficient time-series queries.

### Available Aggregates

1. **analytics_hourly_revenue** - Updated every 30 minutes
   - Transaction count, revenue, average value by hour

2. **analytics_daily_revenue** - Updated every 6 hours
   - Daily revenue, transaction count, unique payers

3. **analytics_weekly_revenue** - Updated daily
   - Weekly aggregations

4. **analytics_monthly_revenue** - Updated daily
   - Monthly aggregations

5. **analytics_resource_access** - Updated hourly
   - Resource access patterns and revenue

6. **analytics_payment_methods** - Updated every 6 hours
   - Transparent vs shielded breakdown

7. **analytics_success_rate** - Updated every 30 minutes
   - Success/failure rates by hour

8. **analytics_webhook_metrics** - Updated hourly
   - Webhook delivery statistics

9. **analytics_unique_payers** - Updated every 6 hours
   - Unique payer tracking

### Setup

Run the continuous aggregates migration:

```bash
psql -U postgres -d z402 -f packages/backend/prisma/migrations/timescaledb_continuous_aggregates.sql
```

This creates all materialized views with automatic refresh policies.

## Aggregation Jobs

Scheduled jobs run automatically to keep data fresh.

### Job Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Hourly Revenue | Every hour | Aggregate last hour's transactions |
| Daily Stats | Daily at midnight | Calculate daily statistics |
| Weekly Summary | Sundays at midnight | Generate weekly summaries |
| Monthly Report | 1st of month at 1 AM | Create monthly reports |
| Cache Warming | Every 5 minutes | Pre-populate frequently accessed metrics |

### Job Control

Jobs start automatically with the server:

```typescript
import { startAggregationJobs, stopAggregationJobs } from './jobs/aggregate-metrics';

// Start all jobs
startAggregationJobs();

// Stop all jobs
stopAggregationJobs();
```

## Caching Strategy

The analytics engine uses Redis for intelligent caching with different TTLs based on data volatility.

### Cache TTLs

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Real-time metrics | 30 seconds | Fast-changing data |
| Hourly aggregates | 5 minutes | Moderate volatility |
| Daily aggregates | 30 minutes | Slow-changing |
| Weekly aggregates | 1 hour | Very slow-changing |

### Cache Keys

```
analytics:realtime:{merchantId}
analytics:dashboard:{merchantId}
analytics:peak-times:{merchantId}:{days}
dashboard:today-vs-yesterday:{merchantId}
dashboard:7-day-trend:{merchantId}
dashboard:30-day-comparison:{merchantId}
```

### Cache Invalidation

Caches are automatically invalidated:
- When new transactions are created
- When payments are settled
- When analytics jobs run

Manual invalidation:

```typescript
import AnalyticsService from './services/analytics';
import DashboardQueries from './queries/dashboard';

// Invalidate all caches for a merchant
await AnalyticsService.invalidateCache(merchantId);
await DashboardQueries.invalidateCache(merchantId);
```

## Event Tracking

Track all important events for comprehensive analytics.

### Payment Events

```typescript
import EventTrackingService from './services/events';

// Track payment event
await EventTrackingService.trackPayment({
  type: 'settled',
  transactionId: 'tx_123',
  merchantId: 'merchant_123',
  amount: 0.1,
  metadata: { ... }
});

// Track resource access
await EventTrackingService.trackResourceAccess(
  'merchant_123',
  'https://api.example.com/premium',
  0.1,
  't1ClientAddress'
);

// Track unique payer
await EventTrackingService.trackUniquePayer(
  'merchant_123',
  't1ClientAddress',
  0.1
);
```

### Tracked Metrics

- Payment created/verified/settled/failed/expired
- Resource access
- Unique payers
- API latency
- Webhook deliveries

## Export Functions

Generate reports for accounting and analysis.

### Transaction Export

```typescript
import ExportService from './services/export.service';

// Export as CSV
const csv = await ExportService.exportTransactionsCSV({
  merchantId: 'merchant_123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  format: 'csv',
  includeMetadata: false
});

// Export as JSON
const json = await ExportService.exportTransactionsJSON({
  merchantId: 'merchant_123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  format: 'json',
  includeMetadata: true
});
```

### Monthly Reports

```typescript
// Generate monthly report
const report = await ExportService.generateMonthlyReport(
  'merchant_123',
  new Date('2024-01-01')
);

// Export as HTML
const html = await ExportService.exportMonthlyReportHTML(
  'merchant_123',
  new Date('2024-01-01')
);

// Export for accounting software
const accounting = await ExportService.exportForAccounting(
  'merchant_123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

## Performance Optimization

### Database Optimization

1. **TimescaleDB continuous aggregates** - Pre-compute aggregations
2. **Proper indexes** - All aggregates have optimal indexes
3. **Query optimization** - Use aggregates instead of raw data
4. **Connection pooling** - Prisma connection pool

### Caching Strategy

1. **Redis caching** - Reduce database load
2. **Smart TTLs** - Balance freshness and performance
3. **Cache warming** - Pre-populate hot data
4. **Automatic invalidation** - Keep data consistent

### Query Patterns

```typescript
// Good: Use TimescaleDB aggregates
const revenue = await prisma.$queryRaw`
  SELECT SUM(total_revenue) as revenue
  FROM analytics_daily_revenue
  WHERE merchant_id = ${merchantId}
  AND bucket >= ${startDate}
`;

// Avoid: Querying raw transactions for aggregations
const revenue = await prisma.transaction.aggregate({
  where: { merchantId, createdAt: { gte: startDate } },
  _sum: { amount: true }
});
```

## Monitoring

### Health Checks

```bash
# Check if aggregation jobs are running
curl http://localhost:3001/health

# Check Redis connection
redis-cli ping

# Check TimescaleDB
psql -U postgres -d z402 -c "SELECT * FROM timescaledb_information.continuous_aggregates;"
```

### Logs

All analytics operations are logged:

```
📈 Analytics aggregation jobs started
✅ Aggregated hourly revenue for merchant merchant_123: 1.25 ZEC
✅ Aggregated daily stats for merchant merchant_123: Revenue=10.5, Unique Payers=45
✅ Generated monthly report for merchant merchant_123: Revenue=125.5
```

### Error Handling

All analytics functions include comprehensive error handling and will not crash the application if analytics fail.

## Best Practices

### 1. Use Appropriate Endpoints

- **Real-time data** → `/analytics/realtime`
- **Dashboard** → `/analytics/dashboard`
- **Trends** → `/analytics/trends/*`
- **Reports** → `/analytics/reports/*`

### 2. Leverage Caching

- Don't poll real-time endpoints faster than 30 seconds
- Cache dashboard data on the frontend for 5 minutes
- Use trend endpoints for historical analysis

### 3. Optimize Queries

- Use TimescaleDB aggregates for time-series data
- Limit date ranges when possible
- Use pagination for large datasets

### 4. Monitor Performance

- Track cache hit rates
- Monitor query execution times
- Set up alerts for slow queries

## Troubleshooting

### Slow Queries

1. Check if TimescaleDB aggregates are up to date:
```sql
SELECT view_name, refresh_lag
FROM timescaledb_information.continuous_aggregates;
```

2. Manually refresh if needed:
```sql
CALL refresh_continuous_aggregate('analytics_hourly_revenue', NULL, NULL);
```

### Cache Issues

1. Check Redis connection:
```bash
redis-cli ping
```

2. Clear all caches:
```bash
redis-cli FLUSHDB
```

3. Restart cache warming job:
```typescript
cacheWarmingJob.start();
```

### Job Not Running

1. Check job status in logs
2. Verify cron expressions
3. Restart jobs:
```typescript
stopAggregationJobs();
startAggregationJobs();
```

## Future Enhancements

- Real-time WebSocket updates for live dashboards
- Machine learning for anomaly detection
- Predictive analytics for revenue forecasting
- Custom dashboards and widget builder
- Advanced segmentation and cohort analysis
- A/B testing framework
- Revenue optimization recommendations

## License

MIT
