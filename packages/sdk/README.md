# @z402/sdk

Developer-friendly TypeScript SDK for Z402 payment facilitator. Accept Zcash payments with dead simple integration.

## Features

- 🎯 **Simple API** - Intuitive, promise-based interface
- 🔄 **Automatic Retries** - Built-in exponential backoff for reliability
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive types
- 🔐 **Webhook Verification** - Secure webhook signature validation
- ⚡ **Express & Next.js** - Ready-to-use middleware
- 🌐 **Universal** - Works in Node.js and browsers
- 📦 **Tree-Shakeable** - Only bundle what you use
- 🎨 **Well Documented** - Extensive JSDoc comments

## Installation

```bash
npm install @z402/sdk
# or
yarn add @z402/sdk
# or
pnpm add @z402/sdk
```

## Quick Start

```typescript
import { Z402 } from '@z402/sdk';

const z402 = new Z402({
  apiKey: 'z402_test_...',
  network: 'testnet' // or 'mainnet'
});

// Create payment intent
const intent = await z402.payments.create({
  amount: '0.01',
  resource: '/api/premium/data',
  metadata: { userId: '123' }
});

// Client pays using the intent...

// Verify payment
const verified = await z402.payments.verify(intent.id);
if (verified.status === 'settled') {
  // Grant access to resource
  console.log('Payment verified!');
}
```

## Configuration

```typescript
const z402 = new Z402({
  apiKey: 'z402_test_...',       // Required: Your API key
  network: 'testnet',             // Optional: 'testnet' or 'mainnet'
  baseUrl: 'https://...',         // Optional: Custom API URL
  maxRetries: 3,                  // Optional: Retry attempts (default: 3)
  timeout: 30000,                 // Optional: Request timeout in ms
  debug: true                     // Optional: Enable logging
});
```

## API Reference

### Payments

#### Create Payment Intent

```typescript
const intent = await z402.payments.create({
  amount: '0.01',
  resource: '/api/premium/data',
  metadata: { userId: '123' },
  expiresIn: 3600 // Optional: seconds until expiration
});
```

#### Get Payment Intent

```typescript
const intent = await z402.payments.get('pi_...');
```

#### Submit Payment

```typescript
const payment = await z402.payments.pay('pi_...', {
  fromAddress: 'zs1...',
  txId: '...'
});
```

#### Verify Payment

```typescript
const verified = await z402.payments.verify('pi_...');
console.log(verified.status); // 'pending', 'paid', 'settled', 'failed', 'expired'
```

#### Cancel Payment Intent

```typescript
await z402.payments.cancel('pi_...');
```

### Transactions

#### List Transactions

```typescript
const { transactions, total, hasMore } = await z402.transactions.list({
  limit: 100,
  offset: 0,
  status: 'settled',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31',
  resource: '/api/premium'
});
```

#### Get Transaction

```typescript
const tx = await z402.transactions.get('tx_...');
```

#### Refund Transaction

```typescript
await z402.transactions.refund('tx_...', {
  reason: 'Customer requested refund',
  metadata: { support_ticket: '12345' }
});
```

#### Export Transactions

```typescript
// Export to CSV
const csv = await z402.transactions.exportCSV({
  dateFrom: '2025-01-01',
  dateTo: '2025-01-31'
});

// Export to JSON
const data = await z402.transactions.exportJSON({
  status: 'settled'
});
```

### Webhooks

#### Get Webhook Configuration

```typescript
const config = await z402.webhooks.get();
console.log(config.url, config.secret);
```

#### Update Webhook

```typescript
await z402.webhooks.update({
  webhookUrl: 'https://example.com/webhooks/z402',
  events: ['payment.settled', 'payment.failed']
});
```

#### Test Webhook

```typescript
const result = await z402.webhooks.test();
console.log(result.success);
```

#### Delete Webhook

```typescript
await z402.webhooks.delete();
```

## Webhook Handling

### Verify Webhook Signatures

```typescript
import { verifyWebhook } from '@z402/sdk';

app.post('/webhooks/z402', (req, res) => {
  const signature = req.headers['z402-signature'];
  const secret = 'your_webhook_secret';

  try {
    const event = verifyWebhook(
      req.body,
      signature,
      secret
    );

    // Handle event
    switch (event.type) {
      case 'payment.settled':
        console.log('Payment settled:', event.data);
        break;
      case 'payment.failed':
        console.log('Payment failed:', event.data);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook verification failed:', error);
    res.status(400).send('Invalid signature');
  }
});
```

## Express Middleware

Protect routes with Z402 payment requirement:

```typescript
import express from 'express';
import { z402Middleware } from '@z402/sdk';

const app = express();

app.use('/api/premium', z402Middleware({
  amount: '0.01',
  resource: '/api/premium/data',
  apiKey: process.env.Z402_API_KEY,
  onError: (error, req, res) => {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
}));

app.get('/api/premium/data', (req, res) => {
  // Access payment info
  console.log(req.z402Payment);
  res.json({ data: 'Premium content' });
});
```

## Next.js Integration

### App Router (Next.js 13+)

```typescript
// app/api/premium/route.ts
import { withZ402 } from '@z402/sdk';

export const GET = withZ402(
  async (request, { payment }) => {
    return Response.json({
      data: 'Premium content',
      payment
    });
  },
  {
    amount: '0.01',
    resource: '/api/premium',
    apiKey: process.env.Z402_API_KEY
  }
);
```

### Pages Router (Next.js 12 and below)

```typescript
// pages/api/premium.ts
import { z402Handler } from '@z402/sdk';

export default z402Handler(
  async (req, res, { payment }) => {
    res.json({
      data: 'Premium content',
      payment
    });
  },
  {
    amount: '0.01',
    resource: '/api/premium',
    apiKey: process.env.Z402_API_KEY
  }
);
```

### Client-Side Usage

```typescript
'use client';

import { useZ402Payment } from '@z402/sdk';

function PremiumContent({ paymentIntentId }: { paymentIntentId: string }) {
  const { headers } = useZ402Payment(paymentIntentId);

  const fetchPremiumData = async () => {
    const response = await fetch('/api/premium', { headers });
    const data = await response.json();
    return data;
  };

  // ... rest of component
}
```

## Error Handling

The SDK throws specific error types for different scenarios:

```typescript
import {
  Z402Error,
  AuthenticationError,
  InvalidRequestError,
  NotFoundError,
  RateLimitError,
  APIError,
  NetworkError
} from '@z402/sdk';

try {
  await z402.payments.create({ amount: '0.01', resource: '/api/data' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  } else if (error instanceof NetworkError) {
    console.error('Network request failed');
  } else if (error instanceof Z402Error) {
    console.error('API error:', error.message, error.statusCode);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  PaymentIntent,
  Transaction,
  WebhookEvent,
  Z402Config
} from '@z402/sdk';

const intent: PaymentIntent = await z402.payments.create({
  amount: '0.01',
  resource: '/api/data'
});
```

## Retry Logic

The SDK automatically retries failed requests with exponential backoff:

- **Retryable errors**: Network failures, rate limits, server errors (5xx)
- **Default retries**: 3 attempts
- **Backoff**: 1s → 2s → 4s → 8s
- **Max delay**: 30 seconds

Configure retry behavior:

```typescript
const z402 = new Z402({
  apiKey: '...',
  maxRetries: 5  // Increase retry attempts
});
```

## Environment Variables

```bash
# .env
Z402_API_KEY=z402_test_...
Z402_API_URL=https://api-testnet.z402.io/v1
Z402_WEBHOOK_SECRET=whsec_...
```

## License

MIT
