# Z402 Database Schema Diagram

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│    Merchant      │
│──────────────────│
│ id (PK)          │──┐
│ email *          │  │
│ passwordHash     │  │
│ name             │  │
│ zcashAddress *   │  │
│ zcashShielded... │  │
│ webhookUrl       │  │
│ webhookSecret    │  │
│ businessName     │  │
│ settings (JSON)  │  │
│ isActive         │  │
│ createdAt        │  │
└──────────────────┘  │
         │            │
         │ 1          │
         │            │
         ├────────────┼──────────────┬───────────────┐
         │            │              │               │
         │ *          │ *            │ *             │ *
         │            │              │               │
┌────────▼──────┐ ┌──▼────────────┐ ┌▼─────────────┐ ┌▼─────────────┐
│  Transaction  │ │    ApiKey     │ │PaymentIntent │ │  Analytics   │
│───────────────│ │───────────────│ │──────────────│ │──────────────│
│ id (PK)       │ │ id (PK)       │ │ id (PK)      │ │ id (PK)      │
│ merchantId FK │ │ merchantId FK │ │ merchantId FK│ │ timestamp **─┼──[TimescaleDB]
│ amount        │ │ name          │ │ amount       │ │ merchantId FK│  [Hypertable]
│ currency      │ │ keyHash *     │ │ currency     │ │ metricType   │
│ status        │ │ keyPrefix     │ │ status       │ │ value        │
│ paymentHash * │ │ permissions   │ │ resourceUrl  │ │ metadata     │
│ transactionId*│ │ scopes        │ │ zcashAddress │ │ tags         │
│ blockHeight   │ │ isActive      │ │ paymentHash *│ └──────────────┘
│ confirmations │ │ lastUsedAt    │ │ expiresAt    │
│ resourceUrl   │ │ usageCount    │ │ createdAt    │      │
│ clientAddress │ │ rateLimit     │ └──────────────┘      │
│ metadata(JSON)│ │ expiresAt     │        │              │
│ createdAt     │ │ createdAt     │        │ 1            │
│ settledAt     │ └───────────────┘        │              │
│ expiresAt     │                          │              │
└───────────────┘                          │ *            │
         │                                 │              │
         │ 1                          ┌────▼──────┐       │
         │                            │ (relates  │       │
         │ *                          │to txns)   │       │
         │                            └───────────┘       │
┌────────▼──────────┐                                     │
│ WebhookDelivery   │                                     │
│───────────────────│              [Continuous Aggregates]│
│ id (PK)           │                      │              │
│ merchantId FK     │              ┌───────▼──────────┐   │
│ transactionId FK  │              │analytics_hourly  │   │
│ eventType         │              │──────────────────│   │
│ eventId *         │              │ bucket (1 hour)  │   │
│ payload (JSON)    │              │ merchant_id      │   │
│ status            │              │ metric_type      │   │
│ httpStatusCode    │              │ count, avg, sum  │   │
│ responseBody      │              │ min, max         │   │
│ attempts          │              └──────────────────┘   │
│ maxAttempts       │                                     │
│ lastAttemptAt     │              ┌────────────────────┐ │
│ nextAttemptAt     │              │ analytics_daily    │ │
│ deliveredAt       │              │────────────────────│ │
│ createdAt         │              │ bucket (1 day)     │ │
└───────────────────┘              │ merchant_id        │ │
                                   │ metric_type        │ │
┌──────────────────┐               │ count, avg, sum    │ │
│     Refund       │               │ min, max           │ │
│──────────────────│               └────────────────────┘ │
│ id (PK)          │                                       │
│ transactionId FK │                                       │
│ amount           │                                       │
│ currency         │                                       │
│ status           │                                       │
│ refundTxid *     │                                       │
│ reason           │                                       │
│ createdAt        │                                       │
│ completedAt      │                                       │
└──────────────────┘                                       │
                                                           │
┌──────────────────┐                                       │
│    AuditLog      │                                       │
│──────────────────│                                       │
│ id (PK)          │                                       │
│ merchantId FK    │◄──────────────────────────────────────┘
│ apiKeyId         │
│ action           │
│ resourceType     │
│ resourceId       │
│ ipAddress        │
│ userAgent        │
│ changes (JSON)   │
│ metadata (JSON)  │
│ createdAt        │
└──────────────────┘

Legend:
  PK  = Primary Key
  FK  = Foreign Key
  *   = Unique constraint
  ** = Hypertable partition key
  JSON = JSON/JSONB field
  1   = One
  *   = Many
```

## Transaction Status Flow

```
┌─────────┐
│ PENDING │──┐
└─────────┘  │
             │ Payment detected on blockchain
             │
             ▼
       ┌──────────┐
       │ VERIFIED │──┐
       └──────────┘  │
                     │ Confirmations >= threshold (6)
                     │
                     ▼
                ┌─────────┐
                │ SETTLED │
                └─────────┘
                     │
                     │ Refund requested
                     │
                     ▼
                ┌──────────┐
                │ REFUNDED │
                └──────────┘

Alternative flows:
  PENDING ──(timeout)──> FAILED
  VERIFIED ─(error)───> FAILED
```

## Payment Intent Flow

```
┌─────────┐
│ CREATED │──┐
└─────────┘  │
             │ Payment detected
             │
             ▼
      ┌────────────┐
      │ PROCESSING │──┐
      └────────────┘  │
                      │ Payment confirmed
                      │
                      ▼
                 ┌───────────┐
                 │ SUCCEEDED │
                 └───────────┘

Alternative flows:
  CREATED ───(timeout)──> EXPIRED
  CREATED ───(cancel)───> CANCELLED
  PROCESSING ─(error)──> CANCELLED
```

## Webhook Delivery Flow

```
┌─────────┐
│ PENDING │──┐
└─────────┘  │
             │ Attempt delivery
             │
             ├───(success)──> ┌──────┐
             │                │ SENT │
             │                └──────┘
             │
             └───(failure)──> ┌──────────┐
                              │ FAILED   │
                              └──────────┘
                                    │
                                    │ Retry < maxAttempts
                                    │
                                    ▼
                              ┌───────────┐
                              │ RETRYING  │──┐
                              └───────────┘  │
                                    ▲        │
                                    │        │
                                    └────────┘
```

## Key Relationships

### Merchant Relationships
- **1:N with Transactions** - A merchant has many transactions
- **1:N with ApiKeys** - A merchant has multiple API keys
- **1:N with PaymentIntents** - A merchant creates payment intents
- **1:N with WebhookDeliveries** - A merchant receives webhook deliveries
- **1:N with Analytics** - A merchant's metrics are tracked

### Transaction Relationships
- **N:1 with Merchant** - Each transaction belongs to one merchant
- **N:1 with PaymentIntent** - A transaction may be created from a payment intent
- **1:N with WebhookDeliveries** - A transaction triggers webhook events
- **1:1 with Refund** - A transaction may have one refund

### Analytics (TimescaleDB)
- **Hypertable** - Partitioned by timestamp (1-day chunks)
- **Continuous Aggregates**:
  - `analytics_hourly` - Hourly rollups (refreshed every hour)
  - `analytics_daily` - Daily rollups (refreshed daily)
- **Compression** - Data >7 days compressed
- **Retention** - Raw data kept for 90 days

## Index Strategy

### Primary Indexes
All tables have primary keys on `id` field (CUID)

### Unique Indexes
- `merchants.email`
- `merchants.zcashAddress`
- `merchants.zcashShieldedAddress`
- `transactions.paymentHash`
- `transactions.transactionId`
- `apiKeys.keyHash`
- `paymentIntents.paymentHash`
- `webhookDeliveries.eventId`

### Performance Indexes
- `merchants.(email, zcashAddress, isActive, createdAt)`
- `transactions.(merchantId, status, transactionId, paymentHash, createdAt, settledAt)`
- `transactions.(merchantId, status)` - Composite
- `transactions.(merchantId, createdAt)` - Composite
- `apiKeys.(merchantId, keyHash, keyPrefix, isActive, expiresAt)`
- `paymentIntents.(merchantId, status, paymentHash, expiresAt, createdAt)`
- `paymentIntents.(merchantId, status)` - Composite
- `webhookDeliveries.(merchantId, transactionId, eventType, status, nextAttemptAt)`
- `webhookDeliveries.(merchantId, eventType)` - Composite
- `analytics.(timestamp, merchantId, metricType)` - Multiple combinations
- `refunds.(transactionId, status, createdAt)`
- `auditLogs.(merchantId, action, createdAt, resourceType+resourceId)`

## Data Types

### Decimal Precision
All monetary amounts use `Decimal(18, 8)`:
- 18 total digits
- 8 decimal places
- Supports ZEC amounts with precision

### JSON Fields
- `merchants.settings` - Merchant preferences
- `transactions.metadata` - Custom merchant data
- `paymentIntents.metadata` - Payment context
- `webhookDeliveries.payload` - Event data
- `analytics.metadata` - Metric context
- `analytics.tags` - Filterable tags
- `auditLogs.changes` - Before/after values
- `auditLogs.metadata` - Audit context
- `apiKeys.permissions` - Permission array
- `apiKeys.scopes` - Scope array

### Enums

**TransactionStatus**
- PENDING, VERIFIED, SETTLED, FAILED, REFUNDED

**PaymentIntentStatus**
- CREATED, PROCESSING, SUCCEEDED, EXPIRED, CANCELLED

**WebhookEventType**
- PAYMENT_CREATED, PAYMENT_PENDING, PAYMENT_VERIFIED
- PAYMENT_SETTLED, PAYMENT_FAILED, PAYMENT_REFUNDED, PAYMENT_EXPIRED

**WebhookDeliveryStatus**
- PENDING, SENT, FAILED, RETRYING

**MetricType**
- PAYMENT_VOLUME, PAYMENT_COUNT, SUCCESS_RATE, AVERAGE_AMOUNT
- UNIQUE_CLIENTS, API_REQUESTS, WEBHOOK_DELIVERIES, RESPONSE_TIME

**RefundStatus**
- PENDING, PROCESSING, COMPLETED, FAILED

**AuditAction**
- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
- API_KEY_CREATED, API_KEY_REVOKED, WEBHOOK_CONFIGURED
- PAYMENT_CREATED, PAYMENT_SETTLED, REFUND_ISSUED

## Security Considerations

1. **Password Hashing**: bcrypt with 10+ rounds
2. **API Key Hashing**: bcrypt, never store plaintext
3. **Webhook Secrets**: Cryptographically random, 32+ bytes
4. **Audit Logging**: Track all sensitive operations
5. **Soft Deletes**: Consider for compliance (currently using CASCADE)
6. **Encryption at Rest**: Configure at PostgreSQL level
7. **SSL/TLS**: Always use encrypted connections

## Scalability Features

1. **TimescaleDB Hypertables** - Efficient time-series storage
2. **Continuous Aggregates** - Pre-computed rollups
3. **Data Compression** - Automatic compression of old data
4. **Retention Policies** - Automatic cleanup of old data
5. **Composite Indexes** - Optimized for common queries
6. **Connection Pooling** - Managed by Prisma
7. **Read Replicas** - Can be added for read scaling

## Backup Strategy

- **Frequency**: Daily full backups, hourly incrementals
- **Retention**: 30 days for full backups, 7 days for incrementals
- **Tools**: `pg_dump` or `pg_basebackup`
- **TimescaleDB**: Use TimescaleDB-aware backup tools
- **Testing**: Regular restore testing in staging environment
