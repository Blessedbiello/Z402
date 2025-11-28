# Z402 X402 Payment Facilitator Guide

Complete guide for implementing x402 micropayments with Zcash using the Z402 platform.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Middleware Usage](#middleware-usage)
6. [Client Implementation](#client-implementation)
7. [Payment Flow](#payment-flow)
8. [Configuration](#configuration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The x402 protocol enables HTTP-based micropayments using the `402 Payment Required` status code. Z402 implements this protocol for Zcash, providing a Stripe-like developer experience for cryptocurrency payments.

### Key Features

- **HTTP 402 Payment Required** - Standard protocol for payment challenges
- **Zcash Integration** - Support for both transparent and shielded addresses
- **Express Middleware** - Easy integration into existing applications
- **Automatic Verification** - Blockchain transaction verification
- **Settlement Tracking** - Confirmation monitoring and settlement
- **Webhook Support** - Real-time payment notifications
- **Double-Spend Prevention** - Built-in security measures

## Core Components

### 1. Zcash Integration (`src/integrations/zcash.ts`)

Handles all blockchain interactions:

```typescript
import { zcashClient } from './integrations/zcash';

// Check node health
const health = await zcashClient.healthCheck();

// Validate address
const validation = await zcashClient.validateAddress('t1ABC...');

// Get transaction
const tx = await zcashClient.getTransaction(txid);

// Send payment
const txid = await zcashClient.sendTransaction({
  to: 'zs1ABC...',
  amount: 0.1,
  memo: 'Payment for API access',
});
```

### 2. X402 Protocol (`src/core/x402-protocol.ts`)

Implements the x402 payment protocol:

```typescript
import { X402Protocol } from './core/x402-protocol';

// Generate payment challenge
const challenge = await X402Protocol.generateChallenge({
  merchantId: 'merchant_123',
  resourceUrl: 'https://api.example.com/data',
  amount: 0.1,
  metadata: { user: 'alice' },
});

// Verify authorization
const result = await X402Protocol.verifyAuthorization({
  paymentId: 'pi_123',
  clientAddress: 't1ABC...',
  signature: 'signature_here',
  timestamp: Date.now(),
});
```

### 3. Verification Service (`src/services/verify.service.ts`)

Handles payment verification:

```typescript
import { VerificationService } from './services/verify.service';

// Verify payment
const result = await VerificationService.verifyPayment({
  authorization: {
    paymentId: 'pi_123',
    clientAddress: 't1ABC...',
    txid: 'txid_here',
    signature: 'sig_here',
    timestamp: Date.now(),
  },
});

// Batch verify
const results = await VerificationService.batchVerify([
  'tx_1',
  'tx_2',
  'tx_3',
]);
```

### 4. Settlement Service (`src/services/settle.service.ts`)

Finalizes payments after confirmation:

```typescript
import { SettlementService } from './services/settle.service';

// Settle payment
const result = await SettlementService.settlePayment({
  transactionId: 'tx_123',
  minConfirmations: 6,
});

// Auto-settle eligible transactions
const settled = await SettlementService.autoSettle();

// Get statistics
const stats = await SettlementService.getStatistics('merchant_123');
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp packages/backend/.env.example packages/backend/.env

# Edit configuration
ZCASH_NETWORK=testnet
ZCASH_RPC_URL=http://localhost:18232
ZCASH_RPC_USER=your_rpc_user
ZCASH_RPC_PASSWORD=your_rpc_password
```

### 3. Protect a Route

```typescript
import express from 'express';
import { requirePayment } from './middleware/x402.middleware';

const app = express();

app.get(
  '/api/premium-data',
  requirePayment({
    amount: 0.1, // 0.1 ZEC
  }),
  (req, res) => {
    res.json({ data: 'Premium content here' });
  }
);
```

### 4. Test the Endpoint

```bash
# Request without payment
curl http://localhost:3001/api/premium-data

# Response: 402 Payment Required
# {
#   "error": "Payment Required",
#   "amount": 0.1,
#   "paymentId": "pi_abc123",
#   "merchantAddress": "zs1ABC..."
# }
```

## API Reference

### Endpoints

#### POST /api/v1/x402/challenge

Generate a payment challenge.

**Request:**
```json
{
  "amount": 0.1,
  "resourceUrl": "https://api.example.com/data",
  "metadata": { "user": "alice" },
  "expiresInSeconds": 3600
}
```

**Response:**
```json
{
  "paymentId": "pi_abc123",
  "amount": 0.1,
  "currency": "ZEC",
  "merchantAddress": "zs1ABC...",
  "resourceUrl": "https://api.example.com/data",
  "expiresAt": "2024-01-01T12:00:00Z",
  "nonce": "random_nonce",
  "signature": "hmac_signature"
}
```

#### POST /api/v1/x402/verify

Verify a payment authorization.

**Request:**
```json
{
  "paymentId": "pi_abc123",
  "clientAddress": "t1ABC...",
  "txid": "blockchain_txid",
  "signature": "client_signature",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "pi_abc123",
  "transactionId": "tx_123",
  "status": "VERIFIED",
  "details": {
    "confirmations": 3,
    "blockHeight": 2450123,
    "verified": true
  }
}
```

#### POST /api/v1/x402/settle

Settle a payment after confirmations.

**Request:**
```json
{
  "transactionId": "tx_123",
  "minConfirmations": 6,
  "force": false
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "tx_123",
  "status": "SETTLED",
  "confirmations": 10,
  "settled": true
}
```

#### GET /api/v1/x402/status/:paymentId

Check payment status.

**Response:**
```json
{
  "status": "SUCCEEDED",
  "transactionId": "txid_here",
  "confirmations": 10,
  "settled": true
}
```

#### GET /api/v1/x402/health

Check Zcash node health.

**Response:**
```json
{
  "healthy": true,
  "network": "test",
  "blockHeight": 2450123,
  "synced": true,
  "connections": 8
}
```

## Middleware Usage

### Basic Protection

```typescript
import { requirePayment } from './middleware/x402.middleware';

app.get(
  '/protected-route',
  requirePayment({
    amount: 0.1,
  }),
  handler
);
```

### Dynamic Pricing

```typescript
app.get(
  '/api/data/:size',
  requirePayment({
    amount: (req) => {
      const size = req.params.size;
      return size === 'small' ? 0.05 : 0.1;
    },
  }),
  handler
);
```

### With Confirmations Requirement

```typescript
import { requirePayment, requireConfirmations } from './middleware/x402.middleware';

app.get(
  '/high-value-data',
  requirePayment({ amount: 1.0 }),
  requireConfirmations(6), // Wait for 6 confirmations
  handler
);
```

### Rate Limiting by Payment

```typescript
import { requirePayment, paymentRateLimit } from './middleware/x402.middleware';

app.get(
  '/limited-api',
  requirePayment({ amount: 0.1 }),
  paymentRateLimit({
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  }),
  handler
);
```

### Payment Verified Callback

```typescript
app.get(
  '/tracked-content',
  requirePayment({
    amount: 0.1,
    onPaymentVerified: async (req, res) => {
      const payment = (req as any).payment;
      // Log to analytics
      await analytics.track('payment_verified', payment);
    },
  }),
  handler
);
```

## Client Implementation

### Basic Client

```typescript
import axios from 'axios';

async function requestWithPayment(url: string) {
  try {
    // Try to access resource
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response?.status === 402) {
      const payment = error.response.data;

      // Send Zcash payment
      const txid = await sendZcashPayment(
        payment.merchantAddress,
        payment.amount
      );

      // Generate authorization
      const auth = generateAuthorization(payment.paymentId, txid);

      // Retry with authorization
      const retry = await axios.get(url, {
        headers: { Authorization: auth },
      });

      return retry.data;
    }
    throw error;
  }
}
```

### Authorization Format

```
X402 paymentId="pi_123", clientAddress="t1ABC...", txid="tx_123", signature="sig_123", timestamp="1234567890"
```

### Signature Generation

```typescript
function generateSignature(
  paymentId: string,
  clientAddress: string,
  timestamp: number,
  nonce: string
): string {
  const data = `${paymentId}|${clientAddress}|${timestamp}|${nonce}`;
  return crypto
    .createHmac('sha256', signingSecret)
    .update(data)
    .digest('hex');
}
```

## Payment Flow

### Standard Flow

```
1. Client → Server: GET /api/protected-resource
2. Server → Client: 402 Payment Required + Challenge
   {
     "paymentId": "pi_123",
     "amount": 0.1,
     "merchantAddress": "zs1ABC..."
   }

3. Client → Zcash: Send payment transaction
4. Zcash → Client: Transaction ID (txid)

5. Client → Server: GET /api/protected-resource
   Authorization: X402 paymentId="...", txid="...", signature="..."

6. Server → Zcash: Verify transaction
7. Zcash → Server: Transaction confirmed

8. Server → Client: 200 OK + Protected resource
```

### Settlement Flow

```
1. Transaction verified (1+ confirmations)
   Status: VERIFIED

2. Wait for minimum confirmations (default: 6)

3. Auto-settlement service runs
   - Checks all VERIFIED transactions
   - Settles those with enough confirmations

4. Transaction settled
   Status: SETTLED
   - Webhook triggered
   - Analytics recorded
   - Audit log created
```

## Configuration

### Zcash Node Configuration

```env
# Network (testnet or mainnet)
ZCASH_NETWORK=testnet

# RPC Connection
ZCASH_RPC_URL=http://localhost:18232
ZCASH_RPC_USER=zcashrpc
ZCASH_RPC_PASSWORD=your_password
```

### Merchant Configuration

```typescript
// In database or merchant settings
{
  "confirmations": 6,  // Required confirmations before settlement
  "autoSettle": true,  // Enable automatic settlement
  "webhookUrl": "https://example.com/webhooks",
  "webhookSecret": "secret_key"
}
```

### Security Configuration

```env
# Challenge signing secret
CHALLENGE_SIGNING_SECRET=your-secure-random-secret

# JWT secret for API authentication
JWT_SECRET=your-jwt-secret
```

## Best Practices

### 1. Set Appropriate Amounts

```typescript
// Good: Micropayments for API calls
requirePayment({ amount: 0.001 }) // $0.05-$0.10 worth

// Good: Higher amounts for valuable content
requirePayment({ amount: 0.1 }) // $5-$10 worth

// Avoid: Too low (transaction fees > payment)
requirePayment({ amount: 0.000001 })
```

### 2. Use Confirmations Wisely

```typescript
// Low-value: Accept with few confirmations
requirePayment({ amount: 0.01 })
// No confirmation requirement needed

// Medium-value: Require some confirmations
requireConfirmations(3) // ~30 minutes

// High-value: Require full confirmations
requireConfirmations(6) // ~60 minutes
```

### 3. Handle Errors Gracefully

```typescript
app.use((error, req, res, next) => {
  if (error.code === 'PAYMENT_EXPIRED') {
    res.status(402).json({
      error: 'Payment expired, please try again',
      newChallenge: true,
    });
  }
  // ... other error handling
});
```

### 4. Monitor Settlement

```typescript
// Run auto-settlement periodically
setInterval(async () => {
  const result = await SettlementService.autoSettle();
  console.log(`Settled ${result.settled} transactions`);
}, 5 * 60 * 1000); // Every 5 minutes
```

### 5. Use Webhooks

```typescript
// Configure webhook URL in merchant settings
await prisma.merchant.update({
  where: { id: merchantId },
  data: {
    webhookUrl: 'https://example.com/webhooks/z402',
    webhookSecret: crypto.randomBytes(32).toString('hex'),
  },
});

// Handle webhook events
app.post('/webhooks/z402', (req, res) => {
  const signature = req.headers['x-z402-signature'];
  const payload = req.body;

  // Verify signature
  if (!WebhookService.verifySignature(payload, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  switch (payload.type) {
    case 'payment.settled':
      // Handle settled payment
      break;
    // ... other events
  }

  res.json({ received: true });
});
```

## Troubleshooting

### Payment Not Verifying

**Problem:** Payment authorization fails

**Solutions:**
1. Check signature generation
2. Verify timestamp is recent (< 5 minutes old)
3. Ensure txid is correct
4. Check Zcash node is synced

```typescript
// Debug verification
const health = await zcashClient.healthCheck();
console.log('Node health:', health);

const tx = await zcashClient.getTransaction(txid);
console.log('Transaction:', tx);
```

### Insufficient Confirmations

**Problem:** Settlement fails due to confirmations

**Solution:** Wait for more confirmations or reduce requirement

```typescript
// Check current confirmations
const tx = await zcashClient.getTransaction(txid);
console.log(`Confirmations: ${tx.confirmations}/6`);

// Force settlement (use with caution)
await SettlementService.settlePayment({
  transactionId,
  force: true,
});
```

### Webhook Not Delivering

**Problem:** Webhooks not reaching endpoint

**Solutions:**
1. Check webhook URL is accessible
2. Verify webhook secret
3. Check firewall/network settings
4. Review webhook delivery logs

```typescript
// Check webhook deliveries
const deliveries = await prisma.webhookDelivery.findMany({
  where: { merchantId },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

// Retry failed webhooks
await WebhookService.retryFailed();
```

### Zcash Node Connection Issues

**Problem:** Cannot connect to Zcash node

**Solutions:**
1. Check RPC credentials
2. Verify node is running
3. Check network accessibility
4. Review node logs

```bash
# Test RPC connection
curl --user zcashrpc:password \
  --data-binary '{"jsonrpc":"2.0","id":"test","method":"getblockchaininfo","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

## Additional Resources

- [X-402 Protocol Specification (Coinbase)](https://github.com/coinbase/x-402-protocol)
- [Zcash RPC Documentation](https://zcash.readthedocs.io/en/latest/rtd_pages/rpc.html)
- [Z402 REST API Documentation](./API_SUMMARY.md)
- [Database Schema](./DATABASE.md)
- [Zcash Integration Guide](./ZCASH_INTEGRATION.md)
- [Example Implementations](../../examples/)

## Support

For questions and support:
- GitHub Issues: https://github.com/bprime/Z402/issues
- Main Documentation: [README.md](../../README.md)
