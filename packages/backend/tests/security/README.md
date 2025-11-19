# Security Tests for Z402

Comprehensive security testing suite covering OWASP Top 10 vulnerabilities and best practices.

## Test Coverage

### 1. Authentication Security (`authentication.test.ts`)

**Covers:**
- API key validation and format checking
- JWT token security (expiration, signatures, tampering)
- Password strength requirements
- Timing-safe password comparison
- Rate limiting on auth endpoints
- Session management and invalidation

**Key Tests:**
- ✓ Reject requests without/with invalid API keys
- ✓ Reject expired or tampered JWT tokens
- ✓ Enforce strong password requirements
- ✓ Prevent timing attacks on authentication
- ✓ Rate limit login attempts
- ✓ Invalidate sessions on logout

### 2. Injection Attack Prevention (`injection-attacks.test.ts`)

**Covers:**
- SQL injection (URL params, query params, body)
- NoSQL injection (MongoDB-like attacks)
- Command injection
- LDAP injection
- XML External Entity (XXE) attacks
- Template injection
- Path traversal
- Input validation (types, lengths, ranges, formats)

**Key Tests:**
- ✓ Prevent SQL injection in all input vectors
- ✓ Use parameterized queries (Prisma ORM)
- ✓ Sanitize special characters
- ✓ Prevent command injection in file operations
- ✓ Validate data types, string lengths, numeric ranges
- ✓ Validate email and Zcash address formats

### 3. XSS and CSRF Protection (`xss-csrf.test.ts`)

**Covers:**
- Reflected XSS
- Stored XSS
- DOM-based XSS
- CSRF token validation
- SameSite cookie attributes
- CORS configuration
- Security headers (CSP, X-Frame-Options, etc.)

**Key Tests:**
- ✓ Sanitize user input in API responses
- ✓ Encode HTML entities
- ✓ Set Content-Security-Policy headers
- ✓ Require CSRF tokens for state-changing operations
- ✓ Validate CSRF token matches session
- ✓ Set SameSite, Secure, HttpOnly cookie flags
- ✓ Proper CORS configuration

### 4. Authorization & Data Exposure (`authorization.test.ts`)

**Covers:**
- Role-Based Access Control (RBAC)
- Resource ownership validation
- Privilege escalation prevention
- Insecure Direct Object References (IDOR)
- Mass assignment vulnerabilities
- Sensitive data in responses
- Information disclosure
- PII protection
- API abuse prevention

**Key Tests:**
- ✓ Deny access to resources without proper role
- ✓ Prevent accessing another merchant's data
- ✓ Prevent privilege escalation via requests
- ✓ Validate resource IDs against ownership
- ✓ Protect fields from mass assignment
- ✓ Don't expose passwords, API keys, or internal IDs
- ✓ Use generic error messages
- ✓ Rate limit by IP and API key

## Running Security Tests

### Run all security tests:

```bash
npm test -- tests/security
```

### Run specific security test suite:

```bash
# Authentication tests
npm test -- tests/security/authentication.test.ts

# Injection attack tests
npm test -- tests/security/injection-attacks.test.ts

# XSS and CSRF tests
npm test -- tests/security/xss-csrf.test.ts

# Authorization tests
npm test -- tests/security/authorization.test.ts
```

### Run with coverage:

```bash
npm test -- tests/security --coverage
```

## Security Checklist

Before deploying to production, ensure all these security measures are in place:

### Authentication & Authorization
- [ ] API keys start with `z402_` prefix
- [ ] API keys are validated against database
- [ ] JWT tokens have expiration
- [ ] JWT signatures are verified
- [ ] Strong password requirements (min 8 chars, mixed case, numbers, symbols)
- [ ] Passwords are hashed with bcrypt (cost factor ≥ 12)
- [ ] Timing-safe password comparison
- [ ] Rate limiting on authentication endpoints
- [ ] Session invalidation on logout
- [ ] Role-based access control implemented
- [ ] Resource ownership validation
- [ ] Privilege escalation prevention

### Injection Prevention
- [ ] Parameterized queries (Prisma ORM)
- [ ] Input validation on all user inputs
- [ ] No raw SQL queries
- [ ] File path validation (prevent path traversal)
- [ ] Command injection prevention
- [ ] Zcash address format validation

### XSS & CSRF
- [ ] Output encoding/escaping
- [ ] Content-Security-Policy header
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY or SAMEORIGIN
- [ ] CSRF token on state-changing operations
- [ ] SameSite cookies (Strict or Lax)
- [ ] Secure flag on cookies (HTTPS only)
- [ ] HttpOnly flag on session cookies

### Data Protection
- [ ] No sensitive data in responses (passwords, full API keys)
- [ ] No internal IDs exposed
- [ ] Generic error messages (no user enumeration)
- [ ] PII encryption at rest
- [ ] Secure logging (no PII in logs)
- [ ] Field filtering on API responses

### Infrastructure Security
- [ ] HTTPS/TLS in production
- [ ] Strict-Transport-Security header (HSTS)
- [ ] Rate limiting by IP and API key
- [ ] Request body size limits
- [ ] Pagination size limits
- [ ] Request timeouts
- [ ] CORS whitelist (not *)

## OWASP Top 10 Coverage

| OWASP Risk | Covered | Test Files |
|------------|---------|------------|
| A01:2021 – Broken Access Control | ✓ | authorization.test.ts |
| A02:2021 – Cryptographic Failures | ✓ | authentication.test.ts, authorization.test.ts |
| A03:2021 – Injection | ✓ | injection-attacks.test.ts |
| A04:2021 – Insecure Design | ✓ | All tests |
| A05:2021 – Security Misconfiguration | ✓ | xss-csrf.test.ts |
| A06:2021 – Vulnerable Components | Manual | Dependencies audit |
| A07:2021 – Identification & Auth Failures | ✓ | authentication.test.ts |
| A08:2021 – Software & Data Integrity | ✓ | xss-csrf.test.ts |
| A09:2021 – Security Logging & Monitoring | Partial | authorization.test.ts |
| A10:2021 – Server-Side Request Forgery | Partial | injection-attacks.test.ts |

## Additional Security Tools

### Static Analysis

```bash
# Run ESLint with security rules
npm run lint

# Security audit with npm
npm audit

# Check for known vulnerabilities
npm audit fix
```

### Dependency Security

```bash
# Snyk security scanning
npx snyk test

# OWASP Dependency Check
dependency-check --project Z402 --scan ./node_modules
```

### Dynamic Analysis

Use the load tests to check security under stress:

```bash
cd tests/load
k6 run rate-limiting.js
```

## Penetration Testing

For comprehensive security validation, consider:

1. **Automated Scanners:**
   - OWASP ZAP
   - Burp Suite
   - Nikto

2. **Manual Testing:**
   - API fuzzing with Postman/Insomnia
   - Authentication bypass attempts
   - Authorization boundary testing

3. **Third-Party Audit:**
   - Professional penetration testing
   - Security code review
   - Compliance audit (PCI DSS if handling payments)

## Security Incident Response

If a security vulnerability is discovered:

1. **Assess severity** (Critical/High/Medium/Low)
2. **Contain the threat** (disable affected endpoints if necessary)
3. **Patch immediately** for critical vulnerabilities
4. **Notify affected users** if data was exposed
5. **Document the incident** and lessons learned
6. **Update tests** to prevent regression

## Best Practices

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal permissions by default
3. **Fail Secure**: System should fail to a secure state
4. **Security by Default**: Secure settings out of the box
5. **Regular Updates**: Keep dependencies current
6. **Security Training**: Educate development team
7. **Code Review**: Security-focused code reviews
8. **Automated Testing**: Run security tests in CI/CD

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security issues, please email: security@z402.io

**Do not** open public GitHub issues for security vulnerabilities.
