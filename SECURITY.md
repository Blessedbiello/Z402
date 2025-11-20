# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to security@z402.io (or create a private security advisory on GitHub).

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Best Practices

### Environment Variables

**Never commit actual secrets to version control.** All sensitive configuration should be stored in environment variables:

1. **Development**: Use `.env` files (gitignored)
2. **Production**: Use your deployment platform's secret management (e.g., Railway secrets, Vercel environment variables)
3. **CI/CD**: Use GitHub Secrets or your CI platform's secret management

### Required Environment Variables

All applications require the following security-sensitive variables:

```bash
# CRITICAL: Change these in production!
JWT_SECRET=                     # Use a strong random string (min 32 characters)
API_KEY_ENCRYPTION_KEY=         # Use a strong random string (min 32 characters)
DATABASE_URL=                   # Should include strong password
ZCASH_RPC_PASSWORD=            # Should be strong and unique
```

To generate secure secrets, use:

```bash
# Linux/macOS
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Test Secrets

**Test files may contain hardcoded secrets for testing purposes only.** These are:

1. Located in `tests/` or `src/test/` directories
2. Clearly marked as test-only values
3. Never used in production code
4. Examples:
   - `tests/setup.ts`: `JWT_SECRET = 'test-secret-key-for-testing-only'`
   - `.github/workflows/`: `JWT_SECRET: test-secret-key-for-load`

These test secrets are intentionally simple and documented. They pose no security risk as they are:
- Only used in isolated test environments
- Never exposed to production
- Reset before each test run
- Clearly labeled as test values

### API Keys

API keys follow this format:
- Test keys: `sk_test_` prefix (32+ random characters)
- Live keys: `sk_live_` prefix (32+ random characters)

**Never commit live API keys.** Test keys in examples and documentation are acceptable.

### Database Security

1. **Never use default passwords** in production
2. Use connection pooling with limits
3. Enable SSL/TLS for database connections
4. Regularly rotate database credentials
5. Use principle of least privilege for database users

### Code Security

We follow these practices to keep the codebase secure:

1. **Input Validation**: All user input is validated and sanitized
2. **Output Encoding**: All output is properly encoded to prevent XSS
3. **SQL Injection Prevention**: We use parameterized queries via Prisma ORM
4. **Authentication**: JWT tokens with secure signing and validation
5. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
6. **CORS**: Properly configured CORS policies
7. **Helmet**: Security headers via Helmet.js middleware

### Zcash Security

1. **Private Keys**: Never store private keys in the backend
2. **Shielded Addresses**: Support for z-addresses for privacy
3. **Transaction Verification**: Multi-step verification process
4. **Network Isolation**: Separate testnet and mainnet configurations

## Security Updates

We regularly:

1. Monitor security advisories for our dependencies
2. Run automated security scans via GitHub Dependabot
3. Conduct security reviews before major releases
4. Update dependencies to patch known vulnerabilities

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible
5. Credit the reporter (unless they wish to remain anonymous)

## Security Testing

Our test suite includes:

- **Authentication tests**: Verify secure authentication flows
- **Authorization tests**: Check access control
- **Injection tests**: SQL injection, XSS, command injection
- **CSRF tests**: Cross-site request forgery protection
- **Rate limiting tests**: API rate limit enforcement

See `packages/backend/tests/security/` for our security test suite.

## Dependencies

We use:

- Dependabot for automated dependency updates
- `npm audit` for vulnerability scanning
- Regular manual security reviews

## Compliance

Z402 is designed to comply with:

- GDPR (for European users)
- PCI DSS (for payment processing)
- SOC 2 (security practices)

## Questions?

If you have questions about security that don't involve reporting a vulnerability, please open a GitHub issue or email security@z402.io.
