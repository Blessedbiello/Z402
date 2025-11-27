# Z402 Phase 1 Implementation Resources

> **Timeline**: 4 weeks (Weeks 1-4)
> **Team Size**: 2 developers (1 senior backend + 1 full-stack)
> **Status**: Pre-Production Critical Path

---

## 1. INFRASTRUCTURE REQUIREMENTS

### 1.1 Development Environment (Already Have ✅)

**Current Stack:**
- ✅ Node.js 20+
- ✅ pnpm 8+
- ✅ Docker & Docker Compose
- ✅ PostgreSQL 15 (TimescaleDB)
- ✅ Redis 7

### 1.2 Zcash Node (⚠️ CRITICAL - MISSING)

**Required:**
```bash
# Option A: Local Zcash Testnet Node (Recommended for Development)
# Install zcashd
wget https://z.cash/downloads/zcash-6.0.0-linux64-debian-bullseye.tar.gz
tar -xvf zcash-6.0.0-linux64-debian-bullseye.tar.gz

# Configure zcash.conf
mkdir -p ~/.zcash
cat > ~/.zcash/zcash.conf <<EOF
testnet=1
rpcuser=zcashrpc
rpcpassword=<GENERATE_STRONG_PASSWORD>
rpcbind=127.0.0.1
rpcport=18232
rpcallowip=127.0.0.1
server=1
txindex=1
EOF

# Start zcashd (sync will take 6-8 hours for testnet)
./zcashd -daemon

# Check sync status
./zcash-cli getblockchaininfo
```

**Alternative: Use Zcash Testnet Public Node (Quick Start)**
```bash
# Free testnet RPC endpoints (rate-limited)
ZCASH_RPC_URL=https://testnet.zcashd.electriccoin.co:18232
# Note: Not recommended for production testing
```

**Estimated Setup Time:**
- Local node: 8-10 hours (including sync)
- Public node: Immediate

**Disk Space Requirements:**
- Testnet: ~30 GB
- Mainnet: ~60 GB

### 1.3 Testing Infrastructure (⚠️ NEED TO SET UP)

**Required Tools:**

```bash
# Install testing dependencies (add to package.json)
pnpm add -D \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @types/supertest \
  @jest/globals \
  jest-mock-extended \
  nock # for mocking HTTP requests
```

**Test Database:**
```bash
# Add test database to docker-compose.yml
postgres-test:
  image: timescale/timescaledb:latest-pg15
  environment:
    POSTGRES_USER: z402_test
    POSTGRES_PASSWORD: test_password
    POSTGRES_DB: z402_test_db
  ports:
    - '5433:5432'
```

**Test Environment Variables:**
```bash
# packages/backend/.env.test
DATABASE_URL=postgresql://z402_test:test_password@localhost:5433/z402_test_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6380 # separate Redis instance for tests
ZCASH_NETWORK=testnet
ZCASH_RPC_URL=http://localhost:18232
NODE_ENV=test
```

### 1.4 CI/CD Infrastructure (✅ Already Configured)

**GitHub Actions:**
- ✅ CI workflow configured (.github/workflows/ci.yml)
- ✅ Security audit workflow
- ✅ E2E test workflow

**What's Missing:**
- Test coverage reporting (Codecov/Coveralls integration)
- Automated test database setup in CI

---

## 2. EXTERNAL SERVICES & ACCOUNTS

### 2.1 Monitoring & Error Tracking (⚠️ NEED TO SET UP)

**Sentry (Error Tracking) - Required**
```bash
# Sign up at https://sentry.io (free tier: 5k errors/month)
# Create new project: "Z402 Backend"
# Get DSN: https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx

# Install SDK
pnpm add @sentry/node @sentry/tracing
```

**Estimated Cost:** $0-26/month (Developer tier sufficient for Phase 1)

**Setup Time:** 30 minutes

### 2.2 Testing Tools (Optional but Recommended)

**Postman/Insomnia:**
- Free API testing workspace
- Import OpenAPI/Swagger spec
- Share collection with team

**k6 (Load Testing):**
```bash
# Install k6 for load testing
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux
```

### 2.3 Zcash Test Funds (⚠️ REQUIRED)

**Get Testnet ZEC:**
```bash
# Option 1: Zcash Testnet Faucet
https://faucet.testnet.z.cash/

# Option 2: Zcash Foundation Faucet
https://zcash-testnet-faucet.zcashblockexplorer.com/

# Request 10-20 testnet ZEC for testing
# Store private keys securely (NOT in git)
```

**Estimated Time:** 15 minutes
**Cost:** Free (testnet)

---

## 3. DEVELOPMENT TOOLS

### 3.1 Code Quality Tools (✅ Mostly Set Up)

**Already Configured:**
- ✅ ESLint
- ✅ Prettier
- ✅ TypeScript strict mode
- ✅ Husky (git hooks) - check if installed

**Need to Verify:**
```bash
# Install if missing
pnpm add -D husky lint-staged

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "pnpm lint-staged"
```

### 3.2 Recommended IDE Extensions

**VS Code:**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "orta.vscode-jest",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 3.3 Documentation Tools (Optional)

**For API Documentation:**
```bash
# Already have Swagger, but consider adding
pnpm add -D @redocly/cli
# Generate beautiful API docs from OpenAPI spec
```

---

## 4. NPM PACKAGES TO INSTALL

### 4.1 Zcash Signature Verification (⚠️ CRITICAL)

**Required Libraries:**

```bash
# For Zcash cryptography
pnpm add \
  @noble/secp256k1 \  # ECDSA signature verification
  bs58check \          # Zcash address encoding/decoding
  bip32 \              # HD wallet support (optional)
  bip39                # Mnemonic support (optional)

# For enhanced security
pnpm add \
  crypto-js \          # Additional crypto utilities
  tweetnacl \          # Ed25519 signatures (if needed)
  tweetnacl-util

# Type definitions
pnpm add -D \
  @types/bs58check \
  @types/crypto-js
```

**Alternative: Zcash-specific Library**
```bash
# Research if available (as of 2024)
pnpm add zcash-js  # Check if this exists and is maintained
```

### 4.2 Testing Libraries (⚠️ REQUIRED)

```bash
# Testing utilities
pnpm add -D \
  @faker-js/faker \     # Generate fake test data
  nock \                # HTTP request mocking
  jest-mock-extended \  # Advanced mocking
  supertest \           # API endpoint testing
  @types/supertest

# For testing async operations
pnpm add -D \
  wait-for-expect      # Async assertion helper
```

### 4.3 Blockchain Monitoring (⚠️ REQUIRED)

```bash
# For websocket support (if using Zcash node ws)
pnpm add ws
pnpm add -D @types/ws

# For efficient polling
pnpm add \
  p-queue \            # Promise queue for rate limiting
  p-retry              # Retry failed operations

# For caching blockchain data
pnpm add \
  lru-cache           # In-memory cache
```

### 4.4 Security Enhancements (⚠️ REQUIRED)

```bash
# Enhanced validation
pnpm add \
  validator \          # String validation utilities
  express-validator    # Express-specific validation

# Security utilities
pnpm add \
  crypto-random-string  # Secure random generation
  xss-clean            # XSS protection middleware

# Type definitions
pnpm add -D \
  @types/validator
```

### 4.5 Monitoring & Observability

```bash
# Sentry integration
pnpm add @sentry/node @sentry/tracing

# Prometheus metrics (optional for Phase 1)
pnpm add prom-client

# Better logging
pnpm add winston-daily-rotate-file  # Log rotation
```

---

## 5. DOCUMENTATION & KNOWLEDGE RESOURCES

### 5.1 Zcash Documentation (⚠️ MUST READ)

**Essential Reading:**
1. **Zcash RPC Documentation**
   - https://zcash.readthedocs.io/en/latest/rtd_pages/rpc.html
   - Focus on: `z_sendmany`, `z_getbalance`, `z_listreceivedbyaddress`

2. **Zcash Protocol Specification**
   - https://zips.z.cash/
   - Read: ZIP-32 (HD Wallets), ZIP-32 (Shielded Addresses)

3. **Zcash Transaction Structure**
   - https://zcash.readthedocs.io/en/latest/rtd_pages/shield_coinbase.html

4. **Signature Schemes in Zcash**
   - Transparent: ECDSA (secp256k1) - same as Bitcoin
   - Shielded: Spend Authorization Signatures

**Estimated Reading Time:** 6-8 hours

### 5.2 Testing Best Practices

**Resources:**
1. **Testing Blockchain Applications**
   - https://www.toptal.com/ethereum/testing-ethereum-contracts
   - Adapt patterns for Zcash

2. **Jest Best Practices**
   - https://github.com/goldbergyoni/javascript-testing-best-practices

3. **Prisma Testing**
   - https://www.prisma.io/docs/guides/testing/integration-testing

**Estimated Reading Time:** 4 hours

### 5.3 Security Resources

**Essential Reading:**
1. **OWASP Top 10**
   - https://owasp.org/www-project-top-ten/
   - Focus on: Injection, Broken Auth, Sensitive Data

2. **JWT Security Best Practices**
   - https://curity.io/resources/learn/jwt-best-practices/

3. **Webhook Security**
   - https://webhooks.fyi/security/hmac

**Estimated Reading Time:** 3 hours

---

## 6. PHASE 1 TASK BREAKDOWN & RESOURCES

### Week 1: Zcash Signature Verification (Backend Dev)

**Resources Needed:**
- ✅ Local Zcash testnet node (set up on Day 1)
- ✅ @noble/secp256k1 library installed
- ✅ bs58check library installed
- ✅ 5-10 testnet ZEC in test wallet
- ✅ Zcash RPC documentation open
- ✅ Test wallet with known private key

**Deliverables:**
1. `zcash-crypto.service.ts` - Signature verification utilities
2. `x402-protocol.ts` - Replace HMAC with Zcash signatures
3. Unit tests for signature verification (10+ test cases)

**Acceptance Criteria:**
- [ ] Client can sign challenge with Zcash private key
- [ ] Server verifies signature matches claimed address
- [ ] Works for both transparent and shielded addresses
- [ ] All tests pass (100% coverage for crypto code)

---

### Week 2: Blockchain Monitoring Service (Backend Dev)

**Resources Needed:**
- ✅ Zcash node fully synced
- ✅ ws library installed (if using websockets)
- ✅ p-queue library installed
- ✅ Redis running (for caching block data)
- ✅ Test transactions on testnet

**Deliverables:**
1. `blockchain-monitor.service.ts` - Scan blockchain for payments
2. `mempool-watcher.service.ts` - Watch unconfirmed transactions
3. `payment-matcher.service.ts` - Match blockchain txs to intents
4. Integration tests with real testnet transactions

**Acceptance Criteria:**
- [ ] Automatically detects incoming payments to merchant addresses
- [ ] Matches payments to PaymentIntents without client-provided txid
- [ ] Handles blockchain reorgs gracefully
- [ ] Performance: Scans block in <2 seconds

---

### Week 3: Comprehensive Test Suite (Both Devs)

**Resources Needed:**
- ✅ Test database running (PostgreSQL on port 5433)
- ✅ Jest configured with coverage reporting
- ✅ @faker-js/faker for test data generation
- ✅ Supertest for API testing
- ✅ Nock for HTTP mocking
- ✅ CI pipeline running tests automatically

**Deliverables:**
1. **Unit Tests** (200+ tests)
   - All services (analytics, auth, verify, webhook, etc.)
   - All middleware (auth, rate-limit, x402, validation)
   - All utilities (jwt, crypto)

2. **Integration Tests** (50+ tests)
   - API endpoints (all routes)
   - Zcash RPC client (with mocked node)
   - Database queries (Prisma)

3. **E2E Tests** (10+ scenarios)
   - Complete payment flow (intent → auth → payment → verification → webhook)
   - Error handling scenarios
   - Rate limiting behavior

**Acceptance Criteria:**
- [ ] Overall code coverage: 80%+
- [ ] Critical paths coverage: 100% (payment flow, auth, crypto)
- [ ] All tests run in <60 seconds
- [ ] CI pipeline passes on every commit
- [ ] Coverage report integrated (Codecov badge in README)

---

### Week 4: Security Fixes & Hardening (Both Devs)

**Resources Needed:**
- ✅ ESLint security plugin installed
- ✅ npm audit results reviewed
- ✅ OWASP Testing Guide as reference
- ✅ Sentry account set up for error tracking
- ✅ Security testing tools (OWASP ZAP optional)

**Deliverables:**
1. **Secret Management**
   - Remove all hard-coded fallback secrets
   - Add secret validation on app startup
   - Implement secret rotation strategy
   - Document secret generation (`.env.example`)

2. **Input Validation**
   - Add Joi/Zod schemas to all routes
   - Implement XSS protection middleware
   - Add SQL injection prevention checks
   - Validate all external inputs (headers, query params, body)

3. **Webhook Security**
   - Implement HMAC signature generation for webhooks
   - Add signature verification utility for SDK
   - Document webhook security in README
   - Add replay attack protection (timestamp validation)

4. **Security Testing**
   - Run OWASP ZAP scan (or manual penetration testing)
   - Fix all HIGH/CRITICAL vulnerabilities
   - Document security assumptions
   - Create SECURITY.md with vulnerability reporting process

**Acceptance Criteria:**
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] No hard-coded secrets in codebase (git grep)
- [ ] All routes have input validation
- [ ] Webhook signatures verified in SDK examples
- [ ] Sentry integration capturing errors
- [ ] Security tests pass in CI pipeline

---

## 7. BUDGET ESTIMATE

### 7.1 Development Costs

**Team:**
- Senior Backend Developer: $100-150/hr × 160 hours = **$16,000 - $24,000**
- Full-Stack Developer: $80-120/hr × 160 hours = **$12,800 - $19,200**

**Total Labor:** **$28,800 - $43,200** (4 weeks)

### 7.2 Infrastructure Costs (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| **Development** |  |  |
| Zcash Testnet Node | Self-hosted | $0 (use laptop/PC) |
| PostgreSQL (TimescaleDB) | Docker | $0 |
| Redis | Docker | $0 |
| **Monitoring** |  |  |
| Sentry (Error Tracking) | Developer Tier | $26/month |
| **Testing** |  |  |
| Codecov | Free (open source) | $0 |
| GitHub Actions | Free (2000 mins) | $0 |
| **Total Monthly** |  | **~$26** |

### 7.3 One-Time Costs

| Item | Cost |
|------|------|
| Postman Team (optional) | $0 (free tier) |
| API Design Tools | $0 |
| Additional development machines (if needed) | $0-2000 |
| **Total One-Time** | **$0-2000** |

### 7.4 Total Phase 1 Budget

**Conservative Estimate:**
- Development: $43,200
- Infrastructure: $26/month × 1 = $26
- One-time: $0
- **Total: ~$43,226**

**Aggressive Estimate:**
- Development: $28,800
- Infrastructure: $26
- One-time: $0
- **Total: ~$28,826**

**Average: ~$36,000 for Phase 1**

---

## 8. RISK MITIGATION RESOURCES

### 8.1 Zcash Node Sync Issues

**Backup Plan:**
- Use Zcash testnet public RPC endpoint temporarily
- Document local node setup issues
- Consider managed Zcash node services (if available)

**Resources:**
```bash
# Zcash node debug commands
zcash-cli getblockchaininfo
zcash-cli getnetworkinfo
zcash-cli getnettotals

# Check logs
tail -f ~/.zcash/testnet3/debug.log
```

### 8.2 Testing Infrastructure Issues

**Backup Plan:**
- Use in-memory SQLite for unit tests (Prisma supports)
- Mock Zcash RPC entirely (nock)
- Reduce test parallelization if flaky

**Resources:**
```typescript
// Prisma SQLite config for tests
datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}
```

### 8.3 Signature Verification Complexity

**Backup Plan:**
- Start with transparent address signatures only (ECDSA)
- Defer shielded address signatures to Phase 2
- Use existing Bitcoin libraries (secp256k1) as Zcash transparent uses same curve

**Resources:**
- Bitcoin signature verification examples (adapt for Zcash)
- @noble/secp256k1 documentation: https://github.com/paulmillr/noble-secp256k1

---

## 9. DAILY CHECKLIST (First Week)

### Day 1 (Monday):
- [ ] Set up Zcash testnet node (start sync overnight)
- [ ] Install all required npm packages
- [ ] Set up test database (docker-compose)
- [ ] Create feature branch: `feat/phase1-zcash-signatures`
- [ ] Read Zcash signature documentation (2 hours)

### Day 2 (Tuesday):
- [ ] Check Zcash node sync status (should be ~30% done)
- [ ] Write unit tests for signature verification (TDD approach)
- [ ] Implement `zcash-crypto.service.ts` (transparent addresses only)
- [ ] Generate test wallets with known private keys

### Day 3 (Wednesday):
- [ ] Zcash node should be 60-70% synced
- [ ] Complete signature verification implementation
- [ ] Integrate with `x402-protocol.ts` (replace HMAC)
- [ ] Test end-to-end signature flow (manual testing)

### Day 4 (Thursday):
- [ ] Zcash node should be 90%+ synced
- [ ] Write integration tests (signature verification + protocol)
- [ ] Request testnet ZEC from faucet
- [ ] Test with real blockchain transactions

### Day 5 (Friday):
- [ ] Code review with team
- [ ] Refactor based on feedback
- [ ] Update documentation (API changes)
- [ ] Merge to main if tests pass

---

## 10. SUCCESS METRICS

### Technical Metrics (Week 4 Targets):

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Code Coverage** | 80%+ | Jest coverage report |
| **Test Count** | 250+ | `npm test -- --verbose` |
| **Test Execution Time** | <60s | CI pipeline logs |
| **API Response Time** | p95 <200ms | Load test results |
| **Security Vulnerabilities** | 0 high/critical | `npm audit` |
| **Type Coverage** | 100% | `tsc --noEmit` |
| **Lint Errors** | 0 | `pnpm lint` |

### Process Metrics:

| Metric | Target |
|--------|--------|
| **Daily Commits** | 3-5 per developer |
| **PR Review Time** | <24 hours |
| **Bug Fix Time** | <4 hours |
| **Documentation Update** | With every feature |

---

## 11. GETTING STARTED CHECKLIST

### Immediate Actions (Day 1 - 2 hours):

```bash
# 1. Set up Zcash testnet node
□ Download and install zcashd
□ Configure zcash.conf for testnet
□ Start sync (will run overnight)

# 2. Install dependencies
□ pnpm install
□ pnpm add @noble/secp256k1 bs58check
□ pnpm add -D @faker-js/faker nock jest-mock-extended

# 3. Set up test infrastructure
□ Add postgres-test service to docker-compose.yml
□ Create .env.test file
□ Verify tests can connect to test database

# 4. Sign up for external services
□ Create Sentry account (sentry.io)
□ Configure Sentry DSN in .env
□ Test error capture

# 5. Documentation review
□ Read Zcash RPC docs (2 hours)
□ Read OWASP security guide (1 hour)
□ Review Z402 codebase architecture

# 6. Team sync
□ Schedule daily standups (15 min)
□ Set up project board (GitHub Projects)
□ Assign tasks for Week 1
```

---

## 12. QUESTIONS TO RESOLVE

### Before Starting:

1. **Zcash Node**: Can we use a managed Zcash node service, or must we run our own?
2. **Budget**: Is the $36k Phase 1 budget approved?
3. **Timeline**: Is 4 weeks acceptable, or do we need to compress?
4. **Testing**: What's the minimum acceptable code coverage? (Recommend 80%+)
5. **Monitoring**: Do you have existing Sentry/monitoring accounts we should use?
6. **CI/CD**: Are GitHub Actions sufficient, or do you prefer Jenkins/CircleCI?
7. **Deployment**: When do you want to deploy to a staging environment?

### For Week 1 Planning:

8. **Signature Verification**: Should we support shielded addresses in Phase 1, or just transparent?
9. **Testing Strategy**: Real blockchain tests vs mocked? (Recommend both)
10. **Documentation**: Update as we go, or dedicated docs sprint at the end?

---

## 13. NEXT STEPS

**Immediate (Today):**
1. ✅ Review this resource document with team
2. ✅ Answer questions in Section 12
3. ✅ Get budget approval
4. ✅ Start Zcash node sync (8-10 hours)
5. ✅ Schedule Week 1 kickoff meeting

**Tomorrow:**
1. ✅ Set up development environment (all team members)
2. ✅ Install dependencies
3. ✅ Create GitHub project board with Phase 1 tasks
4. ✅ Assign Week 1 tasks
5. ✅ Begin Zcash signature verification implementation

**This Week:**
1. Complete Zcash signature verification
2. Set up comprehensive test infrastructure
3. Daily commits and code reviews
4. Update project roadmap based on learnings

---

## APPENDIX A: Useful Commands

### Zcash Node Management
```bash
# Start node
zcashd -daemon

# Stop node
zcash-cli stop

# Check sync status
zcash-cli getblockchaininfo | jq '.verificationprogress'

# Get new transparent address
zcash-cli getnewaddress

# Get new shielded address
zcash-cli z_getnewaddress

# Check balance
zcash-cli getbalance
zcash-cli z_getbalance <address>

# Send transaction
zcash-cli sendtoaddress <address> <amount>
zcash-cli z_sendmany <from> '[{"address":"<to>","amount":<amount>}]'

# Get transaction
zcash-cli gettransaction <txid>
zcash-cli getrawtransaction <txid> 1

# List received transactions
zcash-cli listreceivedbyaddress
zcash-cli z_listreceivedbyaddress <address>
```

### Testing Commands
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/services/verify.service.test.ts

# Run tests in watch mode
pnpm test:watch

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Database Commands
```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Create migration
pnpm db:migrate

# Run migrations
pnpm db:migrate:deploy

# Open Prisma Studio
pnpm db:studio

# Seed database
pnpm db:seed
```

### Docker Commands
```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs
docker-compose logs -f backend

# Rebuild services
docker-compose up --build

# Access database
docker exec -it z402-postgres psql -U z402 -d z402_db

# Access Redis CLI
docker exec -it z402-redis redis-cli
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
**Maintained By:** Z402 Engineering Team
**Review Cycle:** Weekly during Phase 1
