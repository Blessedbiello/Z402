-- TimescaleDB Continuous Aggregates for Z402 Analytics
-- Run this after the main TimescaleDB migration

-- Hourly Revenue Rollup
-- Pre-aggregates revenue by merchant and hour
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_hourly_revenue
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 hour', timestamp) AS bucket,
  COUNT(*) AS transaction_count,
  SUM(value) AS total_revenue,
  AVG(value) AS avg_transaction_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value
FROM analytics
WHERE metric_type IN ('PAYMENT_SETTLED', 'PAYMENT_VERIFIED')
GROUP BY merchant_id, bucket
WITH NO DATA;

-- Refresh policy: update hourly data every 30 minutes
SELECT add_continuous_aggregate_policy('analytics_hourly_revenue',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '30 minutes');

-- Daily Revenue Rollup
-- Pre-aggregates revenue by merchant and day
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_revenue
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 day', timestamp) AS bucket,
  COUNT(*) AS transaction_count,
  SUM(value) AS total_revenue,
  AVG(value) AS avg_transaction_value,
  COUNT(DISTINCT (metadata->>'clientAddress')) AS unique_payers
FROM analytics
WHERE metric_type IN ('PAYMENT_SETTLED', 'PAYMENT_VERIFIED')
  AND metadata->>'clientAddress' IS NOT NULL
GROUP BY merchant_id, bucket
WITH NO DATA;

-- Refresh policy: update daily data every 6 hours
SELECT add_continuous_aggregate_policy('analytics_daily_revenue',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '6 hours');

-- Weekly Revenue Rollup
-- Pre-aggregates revenue by merchant and week
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_weekly_revenue
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 week', timestamp) AS bucket,
  COUNT(*) AS transaction_count,
  SUM(value) AS total_revenue,
  AVG(value) AS avg_transaction_value,
  COUNT(DISTINCT (metadata->>'clientAddress')) AS unique_payers
FROM analytics
WHERE metric_type IN ('PAYMENT_SETTLED', 'PAYMENT_VERIFIED')
  AND metadata->>'clientAddress' IS NOT NULL
GROUP BY merchant_id, bucket
WITH NO DATA;

-- Refresh policy: update weekly data once per day
SELECT add_continuous_aggregate_policy('analytics_weekly_revenue',
  start_offset => INTERVAL '4 weeks',
  end_offset => INTERVAL '1 week',
  schedule_interval => INTERVAL '1 day');

-- Monthly Revenue Rollup
-- Pre-aggregates revenue by merchant and month
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_monthly_revenue
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 month', timestamp) AS bucket,
  COUNT(*) AS transaction_count,
  SUM(value) AS total_revenue,
  AVG(value) AS avg_transaction_value,
  COUNT(DISTINCT (metadata->>'clientAddress')) AS unique_payers
FROM analytics
WHERE metric_type IN ('PAYMENT_SETTLED', 'PAYMENT_VERIFIED')
  AND metadata->>'clientAddress' IS NOT NULL
GROUP BY merchant_id, bucket
WITH NO DATA;

-- Refresh policy: update monthly data once per day
SELECT add_continuous_aggregate_policy('analytics_monthly_revenue',
  start_offset => INTERVAL '6 months',
  end_offset => INTERVAL '1 month',
  schedule_interval => INTERVAL '1 day');

-- Resource Access Rollup
-- Pre-aggregates resource access patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_resource_access
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  metadata->>'resourceUrl' AS resource_url,
  time_bucket('1 day', timestamp) AS bucket,
  COUNT(*) AS access_count,
  SUM(value) AS total_revenue,
  AVG(value) AS avg_revenue_per_access
FROM analytics
WHERE metric_type = 'RESOURCE_ACCESS'
  AND metadata->>'resourceUrl' IS NOT NULL
GROUP BY merchant_id, resource_url, bucket
WITH NO DATA;

-- Refresh policy: update resource access data every hour
SELECT add_continuous_aggregate_policy('analytics_resource_access',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Payment Method Breakdown
-- Pre-aggregates by transparent vs shielded addresses
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_payment_methods
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 day', timestamp) AS bucket,
  CASE
    WHEN metadata->>'clientAddress' LIKE 't%' THEN 'transparent'
    WHEN metadata->>'clientAddress' LIKE 'z%' THEN 'shielded'
    ELSE 'unknown'
  END AS payment_method,
  COUNT(*) AS transaction_count,
  SUM(value) AS total_revenue
FROM analytics
WHERE metric_type = 'PAYMENT_SETTLED'
  AND metadata->>'clientAddress' IS NOT NULL
GROUP BY merchant_id, bucket, payment_method
WITH NO DATA;

-- Refresh policy: update payment method data every 6 hours
SELECT add_continuous_aggregate_policy('analytics_payment_methods',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '6 hours');

-- Success Rate Rollup
-- Pre-aggregates success/failure rates by hour
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_success_rate
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 hour', timestamp) AS bucket,
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE metric_type = 'PAYMENT_SETTLED') AS successful,
  COUNT(*) FILTER (WHERE metric_type = 'PAYMENT_FAILED') AS failed,
  COUNT(*) FILTER (WHERE metric_type = 'PAYMENT_EXPIRED') AS expired
FROM analytics
WHERE metric_type IN ('PAYMENT_SETTLED', 'PAYMENT_FAILED', 'PAYMENT_EXPIRED')
GROUP BY merchant_id, bucket
WITH NO DATA;

-- Refresh policy: update success rate data every 30 minutes
SELECT add_continuous_aggregate_policy('analytics_success_rate',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '30 minutes');

-- Webhook Delivery Metrics Rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_webhook_metrics
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 hour', timestamp) AS bucket,
  metadata->>'eventType' AS event_type,
  COUNT(*) AS total_deliveries,
  COUNT(*) FILTER (WHERE metadata->>'status' = 'DELIVERED') AS successful,
  COUNT(*) FILTER (WHERE metadata->>'status' = 'FAILED') AS failed,
  AVG((metadata->>'deliveryTime')::numeric) AS avg_delivery_time
FROM analytics
WHERE metric_type = 'WEBHOOK_DELIVERY'
GROUP BY merchant_id, bucket, event_type
WITH NO DATA;

-- Refresh policy: update webhook metrics every hour
SELECT add_continuous_aggregate_policy('analytics_webhook_metrics',
  start_offset => INTERVAL '7 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Unique Payers Rollup
-- Track unique payers per day
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_unique_payers
WITH (timescaledb.continuous) AS
SELECT
  merchant_id,
  time_bucket('1 day', timestamp) AS bucket,
  COUNT(DISTINCT (metadata->>'clientAddress')) AS unique_payers,
  COUNT(*) AS total_transactions,
  SUM(value) AS total_revenue
FROM analytics
WHERE metric_type IN ('PAYMENT_SETTLED', 'PAYMENT_VERIFIED')
  AND metadata->>'clientAddress' IS NOT NULL
GROUP BY merchant_id, bucket
WITH NO DATA;

-- Refresh policy: update unique payers data every 6 hours
SELECT add_continuous_aggregate_policy('analytics_unique_payers',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '6 hours');

-- Create indexes on materialized views for faster queries
CREATE INDEX IF NOT EXISTS idx_hourly_revenue_merchant_bucket
  ON analytics_hourly_revenue (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_daily_revenue_merchant_bucket
  ON analytics_daily_revenue (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_revenue_merchant_bucket
  ON analytics_weekly_revenue (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_revenue_merchant_bucket
  ON analytics_monthly_revenue (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_resource_access_merchant_resource
  ON analytics_resource_access (merchant_id, resource_url, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_payment_methods_merchant_bucket
  ON analytics_payment_methods (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_success_rate_merchant_bucket
  ON analytics_success_rate (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_metrics_merchant_bucket
  ON analytics_webhook_metrics (merchant_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_unique_payers_merchant_bucket
  ON analytics_unique_payers (merchant_id, bucket DESC);

-- Initial refresh of all continuous aggregates
CALL refresh_continuous_aggregate('analytics_hourly_revenue', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_daily_revenue', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_weekly_revenue', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_monthly_revenue', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_resource_access', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_payment_methods', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_success_rate', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_webhook_metrics', NULL, NULL);
CALL refresh_continuous_aggregate('analytics_unique_payers', NULL, NULL);
