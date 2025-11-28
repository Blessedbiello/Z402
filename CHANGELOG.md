# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentation cleanup and organization
- Comprehensive test coverage for X-402 endpoints
- Examples directory with demo implementations

### Changed
- Improved README with X-402 protocol information
- Updated documentation links to fix broken references

## [0.2.0] - 2025-11-28

### Added
- **X-402 Protocol Implementation** - Full compliance with Coinbase X-402 Payment Required specification
  - `GET /api/v1/x402/supported` - Payment schemes endpoint
  - `POST /api/v1/x402/verify-standard` - Payment verification endpoint
  - `POST /api/v1/x402/settle-standard` - Payment settlement endpoint
- **X-402 Middleware** - `requireX402Payment()` for protecting routes
- **Real Zcash Cryptography**
  - ECDSA signature verification using secp256k1
  - Zcash address validation with bs58check
  - Public key recovery and verification
- **Payment Header Utilities** - Encoding/decoding X-402 payment headers
- **Comprehensive Type Definitions** - TypeScript types for X-402 protocol
- **Test Suite** - 18 comprehensive tests for X-402 endpoints
- **Blockchain Monitoring Service** - Automatic payment detection and matching
- **Documentation**
  - Complete X-402 implementation guide
  - REST API documentation
  - Database schema documentation

### Changed
- Enhanced security with real cryptographic verification (replaced mock implementations)
- Improved webhook signature verification
- Updated database models for X-402 support

### Fixed
- TypeScript compilation errors in middleware
- Webhook signature verification edge cases
- Payment verification flow improvements

## [0.1.0] - 2025-11-25

### Added
- **Monorepo Structure** - pnpm workspaces with backend, frontend, SDK, CLI, and docs packages
- **Backend API Server**
  - Express.js with TypeScript
  - Prisma ORM with PostgreSQL + TimescaleDB
  - Redis caching
  - JWT authentication
  - API key management
- **Database Schema**
  - Merchant accounts
  - API keys
  - Payment intents
  - Transactions
  - Webhooks and delivery logs
  - Analytics with TimescaleDB
- **Webhook System**
  - HMAC signature generation
  - Signature verification middleware
  - Automatic retry logic with exponential backoff
  - Delivery status tracking
- **Analytics Engine**
  - Real-time metrics collection
  - TimescaleDB continuous aggregates
  - Merchant performance dashboard data
- **Zcash Integration**
  - RPC client for zcashd/zebrad
  - Transaction fetching and validation
  - Address validation (transparent and shielded)
  - Balance queries
- **Frontend Dashboard** - Next.js 14 framework setup
- **SDK Package** - TypeScript SDK for client integration
- **Python SDK** - Python SDK for client integration
- **CLI Tool** - Command-line interface for Z402 operations
- **Documentation Site** - Fumadocs-based documentation portal
- **Security Features**
  - Rate limiting
  - Input validation
  - SQL injection prevention
  - XSS protection
  - CSRF protection
- **CI/CD**
  - GitHub Actions workflows
  - Automated testing
  - Code quality checks
- **Docker Support**
  - Development environment with Docker Compose
  - PostgreSQL, Redis, backend services

### Security
- Implemented secure secret management guidelines
- Added security policy (SECURITY.md)
- Vulnerability reporting process established

---

## Release Notes

### v0.2.0 Highlights

This release implements the **X-402 Payment Required protocol**, bringing full compliance with the Coinbase standard for blockchain-based resource payments. The implementation includes:

- Production-ready cryptographic verification
- Standard facilitator endpoints for interoperability
- Middleware for easy route protection
- Comprehensive test coverage (18/18 tests passing)

This makes Z402 compatible with any X-402 compliant client or payment system.

### v0.1.0 Highlights

Initial release establishing the foundation of the Z402 payment platform:

- Complete monorepo structure with all core packages
- RESTful API for payment processing
- Zcash blockchain integration
- Merchant dashboard framework
- Webhook system with signature verification
- Real-time analytics engine
- Comprehensive security measures

---

## Migration Guides

### Upgrading to v0.2.0

No breaking changes from v0.1.0. New X-402 endpoints are additive.

**New Features Available:**
- Use `requireX402Payment()` middleware to protect routes
- Clients can use X-402 standard protocol for payments
- Enhanced security with real cryptographic verification

---

## Future Roadmap

See [docs/archive/phase1/IMPLEMENTATION_RESOURCES.md](docs/archive/phase1/IMPLEMENTATION_RESOURCES.md) for detailed Phase 1 implementation notes.

### Planned Features
- [ ] Shielded address support (full implementation)
- [ ] Multi-currency support beyond ZEC
- [ ] Enhanced merchant analytics dashboard
- [ ] Mobile SDKs (iOS, Android)
- [ ] GraphQL API
- [ ] Subscription payment support
- [ ] Dispute resolution system

### Under Consideration
- Lightning Network integration
- Cross-chain bridges
- Fiat on/off ramps
- Merchant POS applications

---

## Contributors

Built with ❤️ for the Zcash community.

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md)
