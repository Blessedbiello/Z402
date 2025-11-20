# Z402 Database Documentation

Complete database schema documentation for the Z402 payment facilitator platform.

## Overview

Z402 uses PostgreSQL 15 with TimescaleDB extension for time-series analytics. The database is managed using Prisma ORM with additional TimescaleDB-specific features.

## Database Models

### Merchants

Core merchant account information.

**Table:** `merchants`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| email | String (unique) | Merchant email address |
| passwordHash | String | Bcrypt hashed password |
| name | String | Merchant display name |
| zcashAddress | String (unique) | Transparent Zcash address (t-addr) |
| zcashShieldedAddress | String? (unique) | Shielded Zcash address (z-addr) |
| apiKeyHash | String? (unique) | Master API key hash |
| webhookUrl | String? | Webhook endpoint URL |
| webhookSecret | String? | Webhook signing secret |
| isActive | Boolean | Account active status |
| isVerified | Boolean | Email verification status |
| verifiedAt | DateTime? | Verification timestamp |
| businessName | String? | Legal business name |
| businessType | String? | Type of business |
| website | String? | Business website |
| settings | JSON | Merchant preferences |
| createdAt | DateTime | Account creation |
| updatedAt | DateTime | Last update |
| lastLoginAt | DateTime? | Last login timestamp |

**Indexes:**
- `email` - Fast email lookup
- `zcashAddress` - Address validation
- `isActive` - Filter active merchants
- `createdAt` - Chronological sorting

**Relations:**
- Has many: transactions, apiKeys, webhookDeliveries, paymentIntents, analytics

### Transactions

X402 payment transactions.

**Table:** `transactions`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| merchantId | String | Foreign key to merchant |
| amount | Decimal(18,8) | Payment amount in ZEC |
| currency | String | Currency code (default: ZEC) |
| status | TransactionStatus | PENDING, VERIFIED, SETTLED, FAILED, REFUNDED |
| paymentHash | String? (unique) | X402 payment hash |
| transactionId | String? (unique) | Zcash blockchain txid |
| blockHeight | Int? | Block number |
| confirmations | Int | Current confirmation count |
| resourceUrl | String | Protected resource URL |
| clientAddress | String? | Payer's Zcash address |
| paymentIntentId | String? | Associated payment intent |
| metadata | JSON? | Merchant-defined data |
| internalNotes | String? | Private notes |
| createdAt | DateTime | Transaction created |
| updatedAt | DateTime | Last update |
| settledAt | DateTime? | Settlement timestamp |
| expiresAt | DateTime? | Expiration time |

**Indexes:**
- `merchantId` - Merchant's transactions
- `status` - Filter by status
- `transactionId` - Blockchain lookup
- `paymentHash` - X402 protocol lookup
- `createdAt` - Chronological sorting
- `settledAt` - Settlement queries
- `(merchantId, status)` - Composite for filtering
- `(merchantId, createdAt)` - Composite for pagination

**Relations:**
- Belongs to: merchant, paymentIntent
- Has many: webhookDeliveries

### API Keys

API authentication and authorization.

**Table:** `api_keys`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| merchantId | String | Foreign key to merchant |
| name | String | Key identifier name |
| keyHash | String (unique) | Bcrypt hashed key |
| keyPrefix | String | First 12 chars (e.g., "sk_test_abc1") |
| permissions | JSON | Array of permission strings |
| scopes | JSON | API scopes (read, write) |
| isActive | Boolean | Key active status |
| lastUsedAt | DateTime? | Last usage timestamp |
| usageCount | Int | Total usage counter |
| rateLimit | Int? | Requests/hour (null = default) |
| expiresAt | DateTime? | Expiration timestamp |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update |

**Indexes:**
- `merchantId` - Merchant's keys
- `keyHash` - Authentication lookup
- `keyPrefix` - Partial match for UI
- `isActive` - Filter active keys
- `expiresAt` - Cleanup expired keys

**Relations:**
- Belongs to: merchant

### Payment Intents

Pre-payment sessions (similar to Stripe Payment Intents).

**Table:** `payment_intents`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| merchantId | String | Foreign key to merchant |
| amount | Decimal(18,8) | Payment amount |
| currency | String | Currency code |
| status | PaymentIntentStatus | CREATED, PROCESSING, SUCCEEDED, EXPIRED, CANCELLED |
| resourceUrl | String | Resource being paid for |
| resourceType | String? | Type (api, content, service) |
| zcashAddress | String | Payment destination address |
| paymentHash | String? (unique) | Generated payment hash |
| clientIp | String? | Client IP address |
| clientUserAgent | String? | Client user agent |
| metadata | JSON? | Merchant metadata |
| description | String? | Human-readable description |
| expiresAt | DateTime | Intent expiration |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Last update |
| completedAt | DateTime? | Completion timestamp |

**Indexes:**
- `merchantId` - Merchant's intents
- `status` - Filter by status
- `paymentHash` - Hash lookup
- `expiresAt` - Cleanup expired intents
- `createdAt` - Chronological sorting
- `(merchantId, status)` - Composite filtering

**Relations:**
- Belongs to: merchant
- Has many: transactions

### Webhook Deliveries

Webhook event delivery logs.

**Table:** `webhook_deliveries`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| merchantId | String | Foreign key to merchant |
| transactionId | String? | Associated transaction |
| eventType | WebhookEventType | Event type enum |
| eventId | String (unique) | Idempotency key |
| payload | JSON | Complete webhook payload |
| status | WebhookDeliveryStatus | PENDING, SENT, FAILED, RETRYING |
| httpStatusCode | Int? | HTTP response code |
| responseBody | String? | Response body |
| errorMessage | String? | Error details |
| attempts | Int | Delivery attempt count |
| maxAttempts | Int | Maximum retries (default: 5) |
| lastAttemptAt | DateTime? | Last delivery attempt |
| nextAttemptAt | DateTime? | Next scheduled attempt |
| createdAt | DateTime | Created timestamp |
| updatedAt | DateTime | Last update |
| deliveredAt | DateTime? | Successful delivery time |

**Indexes:**
- `merchantId` - Merchant's deliveries
- `transactionId` - Transaction's webhooks
- `eventType` - Filter by event
- `status` - Delivery status
- `createdAt` - Chronological
- `nextAttemptAt` - Retry queue
- `(merchantId, eventType)` - Composite filtering

**Relations:**
- Belongs to: merchant, transaction

### Analytics (TimescaleDB Hypertable)

Time-series analytics and metrics.

**Table:** `analytics`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| timestamp | DateTime | Metric timestamp (partition key) |
| merchantId | String? | Associated merchant |
| metricType | MetricType | Type of metric |
| value | Decimal(18,8) | Metric value |
| metadata | JSON? | Additional context |
| tags | JSON? | Filterable tags |

**MetricType Enum:**
- `PAYMENT_VOLUME` - Total payment volume
- `PAYMENT_COUNT` - Number of payments
- `SUCCESS_RATE` - Success rate percentage
- `AVERAGE_AMOUNT` - Average transaction amount
- `UNIQUE_CLIENTS` - Unique client addresses
- `API_REQUESTS` - API request count
- `WEBHOOK_DELIVERIES` - Webhook delivery count
- `RESPONSE_TIME` - API response time

**Indexes:**
- `timestamp` - Time-based queries
- `(merchantId, timestamp)` - Merchant time-series
- `(metricType, timestamp)` - Metric time-series
- `(merchantId, metricType, timestamp)` - Full composite

**TimescaleDB Features:**
- Hypertable with 1-day chunks
- Continuous aggregates: hourly and daily
- Compression after 7 days
- Retention policy: 90 days

**Relations:**
- Belongs to: merchant

### Refunds

Refund transaction tracking.

**Table:** `refunds`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| transactionId | String (unique) | Original transaction |
| amount | Decimal(18,8) | Refund amount |
| currency | String | Currency code |
| status | RefundStatus | PENDING, PROCESSING, COMPLETED, FAILED |
| refundTxid | String? (unique) | Refund blockchain txid |
| reason | String? | Refund reason |
| internalNotes | String? | Private notes |
| createdAt | DateTime | Refund initiated |
| updatedAt | DateTime | Last update |
| completedAt | DateTime? | Completion timestamp |

**Indexes:**
- `transactionId` - Lookup by transaction
- `status` - Filter by status
- `createdAt` - Chronological

### Audit Log

Security and compliance audit trail.

**Table:** `audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | String (CUID) | Primary key |
| merchantId | String? | Acting merchant |
| apiKeyId | String? | API key used |
| action | AuditAction | Action type enum |
| resourceType | String | Resource affected |
| resourceId | String? | Resource identifier |
| ipAddress | String? | Request IP |
| userAgent | String? | Request user agent |
| changes | JSON? | Before/after values |
| metadata | JSON? | Additional context |
| createdAt | DateTime | Action timestamp |

**AuditAction Enum:**
- CREATE, UPDATE, DELETE
- LOGIN, LOGOUT
- API_KEY_CREATED, API_KEY_REVOKED
- WEBHOOK_CONFIGURED
- PAYMENT_CREATED, PAYMENT_SETTLED
- REFUND_ISSUED

**Indexes:**
- `merchantId` - Merchant's actions
- `action` - Filter by action type
- `(resourceType, resourceId)` - Resource lookup
- `createdAt` - Chronological
- `(merchantId, createdAt)` - Merchant timeline

## TimescaleDB Integration

### Continuous Aggregates

**analytics_hourly**
```sql
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  merchant_id,
  metric_type,
  COUNT(*) as count,
  AVG(value) as avg_value,
  SUM(value) as sum_value,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM analytics
GROUP BY bucket, merchant_id, metric_type
```

**analytics_daily**
```sql
SELECT
  time_bucket('1 day', timestamp) AS bucket,
  merchant_id,
  metric_type,
  COUNT(*) as count,
  AVG(value) as avg_value,
  SUM(value) as sum_value,
  MIN(value) as min_value,
  MAX(value) as max_value
FROM analytics
GROUP BY bucket, merchant_id, metric_type
```

### Policies

- **Refresh Policy**: Hourly aggregates refresh every hour, daily aggregates refresh daily
- **Retention Policy**: Raw analytics data retained for 90 days
- **Compression Policy**: Data older than 7 days is compressed

### Helpful Views

**analytics_last_24h**
```sql
SELECT * FROM analytics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
```

**merchant_daily_summary**
```sql
SELECT
  merchant_id,
  bucket::date as date,
  metric_type,
  count,
  avg_value,
  sum_value
FROM analytics_daily
ORDER BY bucket DESC
```

## Setup Instructions

### 1. Initial Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run Prisma migrations
pnpm db:migrate
```

### 2. Enable TimescaleDB

```bash
# Make the script executable
chmod +x packages/backend/scripts/setup-timescaledb.sh

# Run TimescaleDB setup
./packages/backend/scripts/setup-timescaledb.sh
```

### 3. Seed Database

```bash
# Populate with test data
pnpm --filter @z402/backend db:seed
```

## Common Queries

### Get Merchant Dashboard Stats

```typescript
import { merchantQueries } from './db/queries';

const stats = await merchantQueries.getDashboardStats(merchantId, 30);
```

### List Transactions with Filtering

```typescript
import { transactionQueries } from './db/queries';

const result = await transactionQueries.listByMerchant(merchantId, {
  status: 'SETTLED',
  limit: 50,
  offset: 0,
  startDate: new Date('2024-01-01'),
});
```

### Get Analytics Summary

```typescript
import { analyticsQueries } from './db/queries';

const summary = await analyticsQueries.getMerchantSummary(merchantId, 30);
```

### Create API Key

```typescript
import { apikeyQueries } from './db/queries';

const { apiKey, ...keyData } = await apikeyQueries.create({
  merchantId,
  name: 'Production Key',
  permissions: ['payments.read', 'payments.write'],
  scopes: ['read', 'write'],
});

// Store apiKey securely - it's only shown once!
```

## Performance Considerations

1. **Indexes**: All foreign keys and commonly queried fields are indexed
2. **Composite Indexes**: Used for common query patterns (merchantId + status, etc.)
3. **TimescaleDB Compression**: Older analytics data is automatically compressed
4. **Continuous Aggregates**: Pre-computed rollups for fast dashboard queries
5. **Connection Pooling**: Configure appropriately for your workload

## Backup and Maintenance

### Backup

```bash
# Full database backup
pg_dump $DATABASE_URL > z402_backup_$(date +%Y%m%d).sql

# TimescaleDB-aware backup
pg_dump -Fc $DATABASE_URL > z402_backup_$(date +%Y%m%d).dump
```

### Restore

```bash
# From SQL file
psql $DATABASE_URL < z402_backup_20240101.sql

# From custom format
pg_restore -d $DATABASE_URL z402_backup_20240101.dump
```

### Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE z402_db;

-- Check TimescaleDB stats
SELECT * FROM timescaledb_information.hypertables;
SELECT * FROM timescaledb_information.continuous_aggregates;
```

## Security Best Practices

1. **Passwords**: Always use bcrypt with salt rounds >= 10
2. **API Keys**: Hash with bcrypt, never store plaintext
3. **Secrets**: Use environment variables, never commit
4. **Audit Logs**: Track all sensitive operations
5. **Indexes on Auth Fields**: Ensure fast authentication queries
6. **Row-Level Security**: Consider implementing for multi-tenancy

## Migration Strategy

When adding new models or fields:

1. Update `schema.prisma`
2. Run `prisma migrate dev --name descriptive_name`
3. Update TypeScript types and queries
4. Test thoroughly before deploying
5. Consider backwards compatibility

## Monitoring

Monitor these metrics:

- Query performance (slow queries)
- Connection pool usage
- TimescaleDB chunk statistics
- Continuous aggregate freshness
- Storage usage and growth
- Index usage statistics

## Troubleshooting

### Common Issues

**Issue**: Prisma can't connect to database
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Issue**: TimescaleDB extension not found
```sql
-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

**Issue**: Slow queries
```sql
-- Check running queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Explain query
EXPLAIN ANALYZE <your_query>;
```

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
