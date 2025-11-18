# Z402 SDK

Official JavaScript/TypeScript SDK for Z402 - the x402 payment facilitator for Zcash.

## Installation

```bash
npm install @z402/sdk
# or
pnpm add @z402/sdk
# or
yarn add @z402/sdk
```

## Quick Start

```typescript
import { Z402Client } from '@z402/sdk';

const z402 = new Z402Client({
  apiKey: 'your-api-key',
});

// Create a payment intent
const payment = await z402.payments.create({
  amount: 100,
  currency: 'ZEC',
  metadata: {
    orderId: '12345',
  },
});

console.log('Payment created:', payment.id);
```

## API Reference

### Payments

```typescript
// Create payment intent
const payment = await z402.payments.create({
  amount: 100,
  currency: 'ZEC',
});

// Retrieve payment
const payment = await z402.payments.retrieve('payment_id');

// List payments
const payments = await z402.payments.list({
  limit: 10,
  status: PaymentStatus.CONFIRMED,
});

// Confirm payment
await z402.payments.confirm('payment_id');

// Refund payment
await z402.payments.refund('payment_id');
```

### Merchants

```typescript
// Get profile
const profile = await z402.merchants.getProfile();

// Update profile
await z402.merchants.updateProfile({
  name: 'My Store',
});

// Manage API keys
const keys = await z402.merchants.listApiKeys();
const newKey = await z402.merchants.createApiKey({ name: 'Production' });
await z402.merchants.revokeApiKey('key_id');
```

### Webhooks

```typescript
// Create webhook
const webhook = await z402.webhooks.create({
  url: 'https://example.com/webhooks',
  events: [WebhookEvent.PAYMENT_CONFIRMED],
});

// List webhooks
const webhooks = await z402.webhooks.list();

// Update webhook
await z402.webhooks.update('webhook_id', {
  isActive: false,
});

// Delete webhook
await z402.webhooks.delete('webhook_id');
```

## License

MIT
