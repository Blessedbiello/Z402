# Z402

> X-402 Payment Required protocol facilitator for Zcash with Stripe-like developer experience

[![X-402 Protocol](https://img.shields.io/badge/X--402-Compliant-green)](https://github.com/coinbase/x-402-protocol)
[![Tests](https://img.shields.io/badge/tests-18%2F18%20passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Z402 is a modern payment processing platform that brings the ease of use and developer experience of Stripe to Zcash transactions. It implements the **X-402 Payment Required** protocol standard for maximum interoperability with compatible systems.

## Features

- **X-402 Protocol**: Full implementation of Coinbase's X-402 Payment Required specification
- **Stripe-like API**: Familiar, intuitive API design for merchants
- **Real Zcash Crypto**: Production-ready cryptographic verification (secp256k1, bs58check)
- **Privacy-First**: Built on Zcash for enhanced privacy (transparent & shielded addresses)
- **Developer-Friendly**: Comprehensive SDK, CLI tools, and documentation
- **Real-time Updates**: Webhook support for payment events with HMAC signatures
- **Blockchain Monitoring**: Automatic payment detection and matching
- **Dashboard**: Beautiful merchant dashboard for managing payments
- **Type-Safe**: Full TypeScript support across the stack

## Tech Stack

- **Backend**: Node.js 20, Express, TypeScript, Prisma
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL 15 with TimescaleDB extension
- **Cache**: Redis 7
- **Monorepo**: pnpm workspaces

## Project Structure

```
Z402/
├── packages/
│   ├── backend/          # Express API server
│   ├── frontend/         # Next.js merchant dashboard
│   └── sdk/              # TypeScript SDK for clients
├── docker/               # Docker configurations
├── docker-compose.yml    # Docker Compose setup
└── package.json          # Root package configuration
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose (for local development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/bprime/Z402.git
cd Z402
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
```

4. Start the development environment with Docker:

```bash
pnpm docker:up
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3001)
- Frontend dashboard (port 3000)

5. Run database migrations:

```bash
pnpm db:migrate
```

6. (Optional) Seed the database with test data:

```bash
pnpm --filter @z402/backend db:seed
```

### Access the Applications

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## Development

### Running Without Docker

If you prefer to run services locally without Docker:

1. Start PostgreSQL and Redis manually
2. Update the `.env` files with your local connection strings
3. Run the development servers:

```bash
# Run all packages in development mode
pnpm dev

# Or run individually
pnpm dev:backend
pnpm dev:frontend
```

### Available Scripts

```bash
# Development
pnpm dev                  # Start all packages in dev mode
pnpm dev:backend          # Start backend only
pnpm dev:frontend         # Start frontend only

# Building
pnpm build                # Build all packages
pnpm build:backend        # Build backend only
pnpm build:frontend       # Build frontend only
pnpm build:sdk            # Build SDK only

# Testing
pnpm test                 # Run tests in all packages
pnpm test:watch           # Run tests in watch mode

# Linting & Formatting
pnpm lint                 # Lint all packages
pnpm lint:fix             # Fix linting issues
pnpm format               # Format code with Prettier
pnpm format:check         # Check code formatting

# Type Checking
pnpm type-check           # Type check all packages

# Database
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema changes (dev)
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Prisma Studio

# Docker
pnpm docker:up            # Start Docker services
pnpm docker:down          # Stop Docker services
pnpm docker:logs          # View Docker logs
pnpm docker:clean         # Stop and remove volumes

# Cleanup
pnpm clean                # Clean all build artifacts
```

## Using the SDK

Install the SDK in your project:

```bash
npm install @z402/sdk
```

Example usage:

```typescript
import { Z402Client } from '@z402/sdk';

const z402 = new Z402Client({
  apiKey: process.env.Z402_API_KEY,
});

// Create a payment
const payment = await z402.payments.create({
  amount: 100,
  currency: 'ZEC',
  metadata: {
    orderId: '12345',
  },
});

console.log('Payment URL:', payment.zcashAddress);

// Check payment status
const status = await z402.payments.retrieve(payment.id);
console.log('Status:', status.status);
```

## X-402 Protocol Implementation

Z402 implements the full X-402 Payment Required protocol for resource protection:

### Standard X-402 Endpoints

- `GET /api/v1/x402/supported` - Get supported payment schemes and networks
- `POST /api/v1/x402/verify-standard` - Verify payment without settlement
- `POST /api/v1/x402/settle-standard` - Settle verified payment

### Using X-402 Middleware

```typescript
import { requireX402Payment } from '@z402/backend/middleware/x402-standard';

// Protect a route with X-402 payment requirement
router.get('/premium-data',
  requireX402Payment({
    facilitatorUrl: 'https://z402.io/api/v1/x402',
    payTo: 't1YourZcashAddress123...',
    amount: '100000000', // 1 ZEC in zatoshis
    resource: 'https://api.example.com/premium-data',
    description: 'Premium API access',
  }),
  (req, res) => {
    res.json({ premium: 'data' });
  }
);
```

For complete X-402 documentation, see [packages/backend/X402_GUIDE.md](packages/backend/X402_GUIDE.md)

## API Documentation

### Payments

- `POST /api/v1/payments/intents` - Create a payment intent
- `GET /api/v1/payments/:id` - Get payment status
- `GET /api/v1/payments` - List payments
- `POST /api/v1/payments/:id/confirm` - Confirm payment
- `POST /api/v1/payments/:id/refund` - Refund payment

### Merchants

- `POST /api/v1/merchants/register` - Register merchant
- `GET /api/v1/merchants/profile` - Get merchant profile
- `PUT /api/v1/merchants/profile` - Update merchant profile
- `GET /api/v1/merchants/api-keys` - List API keys
- `POST /api/v1/merchants/api-keys` - Create API key
- `DELETE /api/v1/merchants/api-keys/:id` - Revoke API key

### Webhooks

- `GET /api/v1/webhooks` - List webhooks
- `POST /api/v1/webhooks` - Create webhook
- `GET /api/v1/webhooks/:id` - Get webhook
- `PUT /api/v1/webhooks/:id` - Update webhook
- `DELETE /api/v1/webhooks/:id` - Delete webhook

## Environment Variables

### Backend

See `packages/backend/.env.example` for all available variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - JWT signing secret
- `ZCASH_NETWORK` - Zcash network (testnet/mainnet)
- `ZCASH_RPC_URL` - Zcash RPC endpoint
- And more...

### Frontend

See `packages/frontend/.env.example`:

- `NEXT_PUBLIC_API_URL` - Backend API URL

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models:

- **Merchant**: Merchant accounts
- **ApiKey**: API authentication keys
- **Payment**: Payment transactions
- **Transaction**: Zcash blockchain transactions
- **Webhook**: Webhook configurations
- **WebhookDelivery**: Webhook delivery logs

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For questions and support, please open an issue on GitHub.

---

Built with ❤️ for the Zcash community
