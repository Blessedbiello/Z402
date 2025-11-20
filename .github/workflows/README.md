# Z402 CI/CD Pipelines

Comprehensive CI/CD workflows for automated testing, security scanning, and deployment.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)

**Triggers:** Push to main/develop, Pull Requests

**Jobs:**
- **Lint**: ESLint + TypeScript type checking
- **Unit Tests**: Jest unit tests with coverage
- **Integration Tests**: API integration tests with PostgreSQL + Redis
- **Security Tests**: OWASP security test suite
- **Build**: Build all packages
- **Coverage Report**: PR comments with coverage stats

**Requirements:**
- Node.js 20.x
- pnpm 8.x
- PostgreSQL (TimescaleDB)
- Redis

**Duration:** ~10-15 minutes

### 2. E2E Tests (`e2e.yml`)

**Triggers:** Push to main/develop, Pull Requests, Daily schedule

**Jobs:**
- **E2E Tests (Playwright)**: Desktop browsers (Chromium, Firefox, WebKit)
- **Mobile E2E**: Mobile viewports (Chrome, Safari)

**Features:**
- Matrix strategy for parallel browser testing
- Screenshot/video capture on failure
- Full application stack (backend + frontend + databases)

**Duration:** ~20-30 minutes per browser

### 3. Load Tests (`load-tests.yml`)

**Triggers:** Manual dispatch, Weekly schedule

**Scenarios:**
1. Payment Intent Creation (baseline performance)
2. Complete Payment Flow (realistic user journey)
3. API Endpoints (stress test)
4. Rate Limiting (verify limits work)

**Features:**
- k6 load testing tool
- Configurable VUs and duration
- JSON results export
- Threshold checking (error rate, latency)
- PR comments with results

**Duration:** 5-60 minutes (configurable)

### 4. Security Audit (`security-audit.yml`)

**Triggers:** Push to main/develop, Pull Requests, Daily schedule

**Scans:**
- **NPM Audit**: Package vulnerabilities
- **Snyk**: Dependency security
- **CodeQL**: Static code analysis
- **Dependency Review**: PR dependency changes
- **TruffleHog**: Secret scanning
- **License Compliance**: Verify approved licenses
- **Trivy**: Container image scanning

**Duration:** ~15-20 minutes

### 5. Deploy (`deploy.yml`)

**Triggers:** Push to main, Tags (v*), Manual dispatch

**Environments:**
- **Staging**: Auto-deploy on main branch
- **Production**: Deploy on tags or manual trigger

**Jobs:**
1. Build: Test + build all packages
2. Docker Build: Build and push images to GHCR
3. Database Migration: Run Prisma migrations
4. Deploy: Update services
5. Post-Deployment: Cache warming, monitoring updates

**Duration:** ~20-30 minutes

## Setup Instructions

### 1. Repository Secrets

Configure these secrets in GitHub Settings → Secrets and variables → Actions:

#### Required Secrets

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/z402_production

# Security Scanning
SNYK_TOKEN=your_snyk_token

# Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/...

# Deployment (choose based on your platform)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Or Railway
RAILWAY_TOKEN=your_railway_token

# Or Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

#### Optional Secrets

```bash
# Code Coverage
CODECOV_TOKEN=your_codecov_token

# Monitoring
DATADOG_API_KEY=your_datadog_key
SENTRY_AUTH_TOKEN=your_sentry_token

# CDN
CLOUDFLARE_API_TOKEN=your_cf_token
```

### 2. Branch Protection Rules

Configure in Settings → Branches → Add rule:

**For `main` branch:**
- ✅ Require pull request reviews (1 approver)
- ✅ Require status checks to pass:
  - `Lint`
  - `Unit Tests`
  - `Integration Tests`
  - `Security Tests`
  - `Build`
- ✅ Require branches to be up to date
- ✅ Include administrators
- ✅ Restrict pushes (only allow via PR)

**For `develop` branch:**
- ✅ Require status checks to pass
- ✅ Require branches to be up to date

### 3. GitHub Environments

Create environments in Settings → Environments:

#### Staging Environment
- **Protection rules:** None (auto-deploy)
- **Environment secrets:**
  - `DATABASE_URL` (staging database)
  - `REDIS_URL` (staging Redis)

#### Production Environment
- **Protection rules:**
  - ✅ Required reviewers (1-2 people)
  - ✅ Wait timer (5 minutes)
- **Environment secrets:**
  - `DATABASE_URL` (production database)
  - `REDIS_URL` (production Redis)

### 4. Enable GitHub Features

- **Settings → Code security and analysis:**
  - ✅ Dependency graph
  - ✅ Dependabot alerts
  - ✅ Dependabot security updates
  - ✅ Code scanning (CodeQL)
  - ✅ Secret scanning

- **Settings → Actions → General:**
  - ✅ Allow all actions and reusable workflows
  - ✅ Read and write permissions
  - ✅ Allow GitHub Actions to create PRs

## Workflow Triggers

### Automatic Triggers

| Workflow | Push (main) | Push (develop) | PR | Schedule |
|----------|------------|----------------|-----|----------|
| CI | ✓ | ✓ | ✓ | - |
| E2E Tests | ✓ | ✓ | ✓ | Daily 2AM UTC |
| Load Tests | - | - | - | Weekly Sunday 3AM UTC |
| Security Audit | ✓ | ✓ | ✓ | Daily 1AM UTC |
| Deploy | ✓ (staging) | - | - | - |

### Manual Triggers

All workflows support manual dispatch via Actions tab:

```bash
# Trigger workflow via GitHub CLI
gh workflow run ci.yml
gh workflow run e2e.yml
gh workflow run load-tests.yml --field scenario=all
gh workflow run deploy.yml --field environment=staging
```

## Workflow Dependencies

```mermaid
graph TD
    A[CI: Lint] --> B[CI: Build]
    C[CI: Unit Tests] --> B
    D[CI: Integration Tests] --> B
    E[CI: Security Tests] --> B
    B --> F[Deploy: Build]
    F --> G[Deploy: Docker Build]
    F --> H[Deploy: Database Migration]
    G --> I[Deploy: Staging]
    H --> I
    I --> J[Deploy: Production]
```

## Local Development

### Run CI checks locally:

```bash
# Lint
pnpm run lint

# Type check
pnpm run type-check

# Unit tests
pnpm run test:unit

# Integration tests
docker-compose -f docker-compose.test.yml up -d
pnpm run test:integration
docker-compose -f docker-compose.test.yml down

# E2E tests
pnpm --filter @z402/frontend exec playwright test

# Load tests
k6 run packages/backend/tests/load/payment-intent-creation.js

# Security tests
pnpm run test:security
pnpm audit
```

### Act - Run GitHub Actions locally

Install [Act](https://github.com/nektos/act):

```bash
# macOS
brew install act

# Run workflow locally
act -j lint
act -j unit-tests
act pull_request
```

## Monitoring Workflows

### GitHub Actions Dashboard

View all workflows: `https://github.com/[owner]/[repo]/actions`

### Badges

Add to README.md:

```markdown
![CI](https://github.com/[owner]/[repo]/actions/workflows/ci.yml/badge.svg)
![E2E](https://github.com/[owner]/[repo]/actions/workflows/e2e.yml/badge.svg)
![Security](https://github.com/[owner]/[repo]/actions/workflows/security-audit.yml/badge.svg)
```

### Notifications

Configure Slack notifications:

1. Create Slack webhook
2. Add `SLACK_WEBHOOK` secret
3. Notifications sent on:
   - Deployment success/failure
   - Security vulnerabilities found
   - Failed builds on main

## Performance Optimization

### Cache Strategy

Workflows cache:
- pnpm dependencies (~2 minutes saved)
- Docker build layers (~5 minutes saved)
- Playwright browsers (~3 minutes saved)

### Parallelization

- E2E tests run in parallel per browser (3x faster)
- Unit + Integration + Security tests run in parallel
- Matrix strategy for cross-browser testing

### Conditional Jobs

- Snyk scan: Skip on PRs (save API credits)
- Container scanning: Only on pushes
- Deployment: Only on main/tags
- Load tests: Manual or scheduled only

## Troubleshooting

### Common Issues

#### Tests timing out
- Increase `timeout-minutes` in job config
- Check if services (Postgres/Redis) are healthy
- Review service logs in workflow output

#### Database migration failures
- Verify `DATABASE_URL` secret is correct
- Check if database is accessible from GitHub Actions
- Review migration files for errors

#### Docker build failures
- Check Dockerfile syntax
- Verify base images are accessible
- Review build logs for missing dependencies

#### E2E tests flaky
- Add retry logic in Playwright config
- Increase wait times for slow operations
- Check if selectors are stable

### Debug Mode

Enable debug logging:

1. Settings → Secrets → Add repository secret:
   - Name: `ACTIONS_STEP_DEBUG`
   - Value: `true`

2. Re-run workflow to see verbose logs

## Cost Optimization

### GitHub Actions Minutes

- Free tier: 2,000 minutes/month (public repos unlimited)
- Optimization tips:
  - Run expensive tests (E2E, load) on schedule, not every PR
  - Use caching aggressively
  - Cancel duplicate workflow runs
  - Self-hosted runners for heavy workloads

### Third-Party Services

- Codecov: Free for open source
- Snyk: Free tier (200 tests/month)
- CodeQL: Free for public repos

## Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets
2. **Minimize secret access** - Use environment-specific secrets
3. **Review third-party actions** - Pin to specific versions
4. **Use OIDC tokens** - For cloud provider authentication
5. **Audit workflow changes** - Require approval for `.github/workflows/` changes
6. **Limit permissions** - Use minimal token permissions

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
- [k6 Load Testing](https://k6.io/docs/)
- [Docker Build CI/CD](https://docs.docker.com/build/ci/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

## Support

For CI/CD issues:
1. Check workflow logs in Actions tab
2. Review this README
3. Search GitHub Issues
4. Open new issue with `ci` label
