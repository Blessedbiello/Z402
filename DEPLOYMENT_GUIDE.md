# Z402 Deployment Guide

> **Status**: Production-Ready Code | Infrastructure Setup Required

The Z402 codebase is complete and production-ready, including:
- ✅ Real Zcash cryptography (secp256k1, bs58check)
- ✅ X-402 protocol implementation
- ✅ Blockchain integration (RPC client ready)
- ✅ All services implemented

**What's needed**: Infrastructure setup (Zcash node, PostgreSQL, Redis) and configuration.

---

## Prerequisites

### Required Services

1. **Zcash Node** (zcashd or zebrad)
   - Testnet or Mainnet
   - Fully synced
   - RPC access enabled

2. **PostgreSQL 15+** with TimescaleDB extension
   - For application database
   - Recommended: 10GB+ storage

3. **Redis 7+**
   - For caching and session management
   - Recommended: 2GB RAM

4. **Node.js 20+**
   - For running the backend application

---

## Step 1: Set Up Zcash Node

### Option A: Local Zcash Node (Recommended for Production)

```bash
# Download zcashd
wget https://z.cash/downloads/zcash-6.0.0-linux64-debian-bullseye.tar.gz
tar -xvf zcash-6.0.0-linux64-debian-bullseye.tar.gz

# Configure zcash.conf
mkdir -p ~/.zcash
cat > ~/.zcash/zcash.conf <<EOF
# Network (testnet=1 for testnet, comment out for mainnet)
testnet=1

# RPC Settings
rpcuser=zcashrpc
rpcpassword=$(openssl rand -hex 32)
rpcbind=127.0.0.1
rpcport=18232
rpcallowip=127.0.0.1
server=1
txindex=1

# Performance
dbcache=4000
maxmempool=300
EOF

# Start zcashd
./zcashd -daemon

# Check sync status (this will take 8-10 hours for testnet, 1-2 days for mainnet)
./zcash-cli -testnet getblockchaininfo
```

**Hardware Requirements:**
- **Testnet**: 30GB disk, 4GB RAM
- **Mainnet**: 60GB disk, 8GB RAM

### Option B: Managed Zcash Node Service

If available, use a managed Zcash RPC provider:
- Easier setup, no sync wait
- Less infrastructure to maintain
- May have rate limits or costs

---

## Step 2: Set Up PostgreSQL + TimescaleDB

### Using Docker (Development/Testing)

```bash
docker run -d \
  --name z402-postgres \
  -e POSTGRES_USER=z402 \
  -e POSTGRES_PASSWORD=<SECURE_PASSWORD> \
  -e POSTGRES_DB=z402_db \
  -p 5432:5432 \
  -v z402-postgres-data:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg15
```

### Using Hosted PostgreSQL (Production)

Recommended providers with TimescaleDB support:
- **Timescale Cloud** (native TimescaleDB)
- **AWS RDS** (add TimescaleDB extension)
- **Digital Ocean Managed Databases**
- **Render** (with TimescaleDB)

After provisioning:
```sql
-- Connect to database and enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

---

## Step 3: Set Up Redis

### Using Docker (Development/Testing)

```bash
docker run -d \
  --name z402-redis \
  -p 6379:6379 \
  -v z402-redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

### Using Hosted Redis (Production)

Recommended providers:
- **Redis Cloud** (formerly Redis Labs)
- **AWS ElastiCache**
- **Digital Ocean Managed Redis**
- **Upstash** (serverless Redis)

---

## Step 4: Configure Environment Variables

Create `.env` file in `packages/backend/`:

```bash
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3001
API_BASE_URL=https://api.yourdomain.com

# Database
DATABASE_URL=postgresql://z402:PASSWORD@localhost:5432/z402_db?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Zcash Node
ZCASH_NETWORK=testnet  # or 'mainnet'
ZCASH_RPC_URL=http://localhost:18232
ZCASH_RPC_USER=zcashrpc
ZCASH_RPC_PASSWORD=<from zcash.conf>
MIN_CONFIRMATIONS=6

# Security (GENERATE THESE - DO NOT USE DEFAULTS)
JWT_SECRET=$(openssl rand -hex 64)
API_KEY_SALT=$(openssl rand -hex 32)
WEBHOOK_SIGNING_SECRET=$(openssl rand -hex 64)

# Monitoring (Optional but Recommended)
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ Security Notes:**
- NEVER commit `.env` to version control
- Use unique, cryptographically random secrets
- Rotate secrets periodically
- Use environment-specific configurations

---

## Step 5: Deploy Backend Application

### Build the Application

```bash
cd Z402
pnpm install
pnpm build
```

### Run Database Migrations

```bash
cd packages/backend
pnpm db:migrate:deploy
```

### Start the Application

#### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd packages/backend
pm2 start dist/index.js --name z402-backend

# Configure auto-restart on system boot
pm2 startup
pm2 save
```

#### Option B: Using systemd

Create `/etc/systemd/system/z402-backend.service`:

```ini
[Unit]
Description=Z402 Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=z402
WorkingDirectory=/home/z402/Z402/packages/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable z402-backend
sudo systemctl start z402-backend
```

#### Option C: Using Docker

```bash
# Build Docker image
docker build -t z402-backend:latest -f docker/Dockerfile.backend .

# Run container
docker run -d \
  --name z402-backend \
  -p 3001:3001 \
  --env-file packages/backend/.env \
  z402-backend:latest
```

---

## Step 6: Verify Deployment

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Zcash connection health
curl http://localhost:3001/api/v1/x402/health

# Expected response:
{
  "healthy": true,
  "blockchain": "zcash",
  "network": "testnet",
  "blockHeight": 2847291,
  "connections": 8
}
```

### Test X-402 Endpoints

```bash
# Get supported payment schemes
curl http://localhost:3001/api/v1/x402/supported

# Expected response:
{
  "kinds": [
    {
      "scheme": "zcash-transparent",
      "network": "testnet"
    },
    {
      "scheme": "zcash-shielded",
      "network": "testnet"
    }
  ]
}
```

---

## Step 7: Set Up Reverse Proxy (Production)

### Using Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Using Caddy (Automatic HTTPS)

```caddyfile
api.yourdomain.com {
    reverse_proxy localhost:3001
}
```

---

## Step 8: Monitoring & Maintenance

### Set Up Logging

```bash
# View logs with PM2
pm2 logs z402-backend

# Or with systemd
journalctl -u z402-backend -f
```

### Set Up Monitoring

1. **Sentry** for error tracking (configure SENTRY_DSN in `.env`)
2. **Prometheus** + **Grafana** for metrics (optional)
3. **UptimeRobot** or **Pingdom** for uptime monitoring

### Backup Strategy

```bash
# Automated PostgreSQL backups
0 2 * * * pg_dump z402_db > /backup/z402_$(date +\%Y\%m\%d).sql

# Backup Zcash wallet (if applicable)
0 3 * * * ./zcash-cli backupwallet /backup/zcash_wallet_$(date +\%Y\%m\%d).dat
```

---

## Step 9: Testing with Real Payments

### Get Testnet ZEC

1. Visit Zcash testnet faucet: https://faucet.testnet.z.cash/
2. Request 10-20 testnet ZEC to your test address
3. Wait for confirmations (≈2.5 minutes per block)

### Test Payment Flow

1. Create a merchant account
2. Protect a route with X-402 middleware
3. Make a real testnet payment
4. Verify payment is detected and settled

See [packages/backend/X402_GUIDE.md](packages/backend/X402_GUIDE.md) for complete testing guide.

---

## Production Checklist

### Security
- [ ] All secrets are cryptographically random and unique
- [ ] `.env` files are NOT in version control
- [ ] HTTPS/TLS enabled on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation enabled
- [ ] SQL injection protection verified
- [ ] XSS protection enabled

### Infrastructure
- [ ] Zcash node fully synced
- [ ] PostgreSQL + TimescaleDB running
- [ ] Redis running
- [ ] Automated backups configured
- [ ] Monitoring/alerting set up
- [ ] Logs are being collected
- [ ] Health checks passing

### Application
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Application builds without errors
- [ ] Tests passing (18/18 X-402 tests)
- [ ] API endpoints responding correctly
- [ ] Webhooks delivering successfully

### Documentation
- [ ] API documentation accessible
- [ ] Webhook signature verification documented
- [ ] Error codes documented
- [ ] Rate limits published

---

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, HAProxy, or cloud LB)
- Run multiple backend instances
- Share Redis for session state
- Use connection pooling for PostgreSQL

### Performance Optimization

- Enable PostgreSQL query caching
- Use Redis for hot data
- Implement CDN for static assets
- Optimize Zcash RPC calls (batch when possible)

---

## Troubleshooting

### Common Issues

**Zcash Node Not Syncing**
```bash
# Check node status
./zcash-cli getblockchaininfo

# Check connections
./zcash-cli getpeerinfo

# Restart with debug logging
./zcashd -daemon -debug=net
```

**Database Connection Errors**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U z402 -d z402_db

# Check TimescaleDB extension
psql z402_db -c "SELECT * FROM pg_extension WHERE extname='timescaledb';"
```

**Redis Connection Errors**
```bash
# Check Redis is running
redis-cli ping

# Check memory usage
redis-cli info memory
```

---

## Support

For deployment assistance:
- GitHub Issues: https://github.com/bprime/Z402/issues
- Documentation: [README.md](README.md)
- X-402 Guide: [packages/backend/X402_GUIDE.md](packages/backend/X402_GUIDE.md)

---

**Last Updated**: 2025-11-28
**Version**: 0.2.0
