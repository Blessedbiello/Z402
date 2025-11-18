#!/bin/bash

# Setup TimescaleDB for Z402
# This script should be run after initial Prisma migration

set -e

echo "🔧 Setting up TimescaleDB for Z402..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL in your .env file"
  exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=${DATABASE_URL:-"postgresql://z402:z402password@localhost:5432/z402_db"}

echo "📊 Enabling TimescaleDB extension..."

# Run the TimescaleDB migration
psql "$DB_URL" -f "$(dirname "$0")/../prisma/migrations/00001_enable_timescaledb/migration.sql"

if [ $? -eq 0 ]; then
  echo "✅ TimescaleDB setup completed successfully!"
  echo ""
  echo "📋 What was created:"
  echo "   - TimescaleDB extension enabled"
  echo "   - Analytics table converted to hypertable"
  echo "   - Hourly continuous aggregate (analytics_hourly)"
  echo "   - Daily continuous aggregate (analytics_daily)"
  echo "   - Retention policy (90 days for raw data)"
  echo "   - Compression policy (compress after 7 days)"
  echo ""
  echo "🎉 Your database is now optimized for time-series analytics!"
else
  echo "❌ TimescaleDB setup failed"
  exit 1
fi
