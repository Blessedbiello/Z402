# NEAR Intents Cross-Chain Payment Integration

## Overview

Z402 now supports **cross-chain payments** via NEAR Intents, allowing users to pay with **any token** (USDC, ETH, SOL, BTC, etc.) while merchants receive **ZEC** (Zcash) privately.

This integration removes the barrier of requiring users to have ZEC to use Z402-powered services, making privacy-first payments accessible to everyone.

---

## How It Works

### Traditional Z402 Flow:
1. User needs ZEC to pay
2. User sends ZEC to merchant address
3. Z402 verifies payment on Zcash blockchain
4. Access granted

### NEAR Intents Flow:
1. User has USDC (or ETH, SOL, BTC, etc.)
2. Z402 creates NEAR intent with unique deposit address
3. User sends USDC to deposit address
4. NEAR Intents automatically converts USDC → ZEC
5. ZEC arrives at merchant's address
6. Z402 verifies ZEC payment on blockchain
7. Access granted

**Key Benefit**: Users can pay with tokens they already have, merchants still receive ZEC privately.

---

## Architecture

```
┌──────────┐         ┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│  User    │────────▶│  Z402 API    │────────▶│ NEAR Intents│────────▶│   Zcash      │
│  (USDC)  │         │  /near-pay   │         │   1Click    │         │  Blockchain  │
└──────────┘         └──────────────┘         └─────────────┘         └──────────────┘
                            │                         │                       │
                            │                         │                       │
                            │    ┌────────────────────┘                       │
                            │    │  (Convert USDC to ZEC)                     │
                            │    │                                            │
                            └────┴────────────────────────────────────────────┘
                                      (Verify ZEC receipt)
```

---

## API Endpoints

### 1. Create NEAR Payment Intent

**POST** `/api/v1/near-payments/intents`

Creates a payment intent with cross-chain support.

#### Request:

```typescript
{
  "amount": 0.001,                    // Amount in ZEC merchant wants to receive
  "resourceUrl": "https://api.example.com/premium-data",
  "originAsset": "evm-1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC on Ethereum
  "originAmount": "1000000",         // 1 USDC in smallest unit (6 decimals)
  "refundAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "refundChainType": "evm",
  "metadata": {
    "userId": "user_123",
    "description": "Premium API access"
  },
  "slippageBps": 100,               // Optional: 1% slippage tolerance
  "deadlineMinutes": 30             // Optional: Quote expires in 30 minutes
}
```

#### Response:

```typescript
{
  "id": "pi_abc123",                // Z402 payment intent ID
  "amount": 0.001,
  "currency": "ZEC",
  "merchantAddress": "t1abc...",
  "resourceUrl": "https://api.example.com/premium-data",
  "expiresAt": "2025-12-04T12:00:00Z",

  // NEAR Intents cross-chain payment info
  "nearIntent": {
    "id": "near_xyz789",
    "originAsset": "evm-1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "originAmount": "1000000",
    "destinationAmount": "0.001",
    "depositAddress": "0xUNIQUE_DEPOSIT_ADDRESS",  // Send USDC here
    "memo": null,
    "estimatedTimeSeconds": 180,    // ~3 minutes
    "expiresAt": "2025-12-04T11:30:00Z",
    "instructions": {
      "step1": "Send 1000000 of evm-1-0xa0b... to deposit address",
      "step2": "NEAR Intents will automatically convert to ZEC and send to merchant",
      "step3": "Z402 will verify ZEC receipt and grant access to resource"
    }
  }
}
```

---

### 2. Submit Deposit Transaction (Optional)

**POST** `/api/v1/near-payments/deposit`

Optionally submit the deposit transaction hash to speed up processing.

#### Request:

```typescript
{
  "nearIntentId": "near_xyz789",
  "depositTxHash": "0x1234567890abcdef..."
}
```

#### Response:

```typescript
{
  "success": true,
  "message": "Deposit submitted, swap will process automatically"
}
```

---

### 3. Check NEAR Intent Status

**GET** `/api/v1/near-payments/status/:id`

Check the status of a cross-chain payment.

#### Response:

```typescript
{
  "nearIntentId": "near_xyz789",
  "paymentIntentId": "pi_abc123",
  "status": "SUCCESS",              // PENDING, PROCESSING, SUCCESS, FAILED
  "depositAddress": "0xUNIQUE_DEPOSIT_ADDRESS",
  "depositTxHash": "0x1234...",     // User's deposit transaction
  "outputTxHash": "abc123...",      // ZEC transaction to merchant
  "originAmount": "1000000",
  "destinationAmount": "0.001",
  "verified": true,                 // Whether Z402 verified ZEC receipt
  "errorMessage": null,
  "createdAt": "2025-12-04T10:00:00Z",
  "updatedAt": "2025-12-04T10:03:00Z"
}
```

---

### 4. Get Supported Tokens

**GET** `/api/v1/near-payments/supported-tokens`

Get list of tokens users can pay with.

#### Response:

```typescript
{
  "tokens": [
    {
      "assetId": "evm-1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "blockchain": "ethereum",
      "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "decimals": 6,
      "symbol": "USDC",
      "name": "USD Coin",
      "priceUsd": "1.00",
      "logoUri": "https://..."
    },
    {
      "assetId": "evm-1-native",
      "blockchain": "ethereum",
      "decimals": 18,
      "symbol": "ETH",
      "name": "Ethereum",
      "priceUsd": "3500.00"
    }
    // ... more tokens
  ],
  "total": 150
}
```

---

## Integration Example

### Backend (Node.js/Express)

```typescript
import express from 'express';
import axios from 'axios';

const app = express();

// Protect API endpoint with NEAR cross-chain payment
app.get('/api/premium-data', async (req, res) => {
  try {
    // Step 1: Create NEAR payment intent
    const paymentIntent = await axios.post('http://localhost:3001/api/v1/near-payments/intents', {
      amount: 0.001,                  // 0.001 ZEC
      resourceUrl: 'https://api.example.com/premium-data',
      originAsset: 'evm-1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      originAmount: '1000000',        // 1 USDC
      refundAddress: req.body.userAddress,
      refundChainType: 'evm',
      metadata: { userId: req.user.id }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.Z402_API_KEY}`
      }
    });

    // Step 2: Return payment instructions to user
    res.status(402).json({
      error: 'Payment Required',
      paymentIntent: paymentIntent.data
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Webhook endpoint to receive payment notifications
app.post('/webhooks/z402', (req, res) => {
  const event = req.body;

  if (event.type === 'payment.verified' && event.nearIntentId) {
    // Cross-chain payment completed
    console.log('ZEC received via NEAR intents:', event.nearIntentId);

    // Grant access to user
    grantAccess(event.paymentIntentId);
  }

  res.status(200).send('OK');
});
```

---

### Frontend (React)

```typescript
import { useState } from 'react';
import { ethers } from 'ethers';

function PaymentFlow() {
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [status, setStatus] = useState('idle');

  async function handlePay() {
    try {
      setStatus('creating-intent');

      // Step 1: Request payment intent from your backend
      const response = await fetch('/api/premium-data');
      const data = await response.json();

      if (response.status === 402) {
        setPaymentIntent(data.paymentIntent);
        setStatus('awaiting-payment');

        // Step 2: User sends USDC to deposit address
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        const usdcContract = new ethers.Contract(
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC contract
          ['function transfer(address to, uint256 amount) public returns (bool)'],
          signer
        );

        const tx = await usdcContract.transfer(
          data.paymentIntent.nearIntent.depositAddress,
          data.paymentIntent.nearIntent.originAmount
        );

        setStatus('processing');

        // Step 3: Wait for transaction confirmation
        await tx.wait();

        // Step 4: Submit deposit hash to speed up processing (optional)
        await fetch('/api/v1/near-payments/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nearIntentId: data.paymentIntent.nearIntent.id,
            depositTxHash: tx.hash
          })
        });

        // Step 5: Poll for completion
        await pollForCompletion(data.paymentIntent.nearIntent.id);

        setStatus('completed');

        // Access granted - refetch premium data
        window.location.reload();
      }

    } catch (error) {
      console.error('Payment failed:', error);
      setStatus('failed');
    }
  }

  async function pollForCompletion(nearIntentId) {
    for (let i = 0; i < 60; i++) {  // Poll for up to 5 minutes
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

      const statusResponse = await fetch(`/api/v1/near-payments/status/${nearIntentId}`);
      const statusData = await statusResponse.json();

      if (statusData.status === 'SUCCESS') {
        return; // Payment completed
      } else if (statusData.status === 'FAILED') {
        throw new Error('Payment failed');
      }
    }
    throw new Error('Payment timeout');
  }

  return (
    <div>
      <h2>Premium Data Access</h2>
      <p>Pay 1 USDC (receives 0.001 ZEC)</p>

      {status === 'idle' && (
        <button onClick={handlePay}>Pay with USDC</button>
      )}

      {status === 'creating-intent' && <p>Creating payment intent...</p>}
      {status === 'awaiting-payment' && <p>Confirm transaction in your wallet...</p>}
      {status === 'processing' && <p>Processing payment... (~3 minutes)</p>}
      {status === 'completed' && <p>✓ Payment successful! Access granted.</p>}
      {status === 'failed' && <p>✗ Payment failed. Please try again.</p>}
    </div>
  );
}
```

---

## Supported Tokens

NEAR Intents supports:

- **Ethereum**: ETH, USDC, USDT, DAI, WETH, and 100+ ERC-20 tokens
- **Solana**: SOL, USDC, USDT
- **Bitcoin**: BTC
- **NEAR**: NEAR, wrapped tokens
- **Arbitrum, Optimism, Base**: Native and bridged tokens

For the full list, call:
```
GET /api/v1/near-payments/supported-tokens
```

---

## Payment Flow States

| State | Description |
|-------|-------------|
| `PENDING_DEPOSIT` | Waiting for user to send deposit |
| `PROCESSING` | NEAR Intents converting tokens |
| `SUCCESS` | ZEC received by merchant, verified by Z402 |
| `INCOMPLETE_DEPOSIT` | User sent incorrect amount |
| `REFUNDED` | Payment refunded to user |
| `FAILED` | Swap failed (rare) |

---

## Configuration

### Environment Variables

```bash
# NEAR Intents API (default: https://1click.chaindefuser.com)
NEAR_INTENTS_API_URL=https://1click.chaindefuser.com

# Optional: JWT token to avoid 0.1% fee
# Get from: https://forms.gle/[form-id]
ONE_CLICK_JWT=eyJhbGciOiJIUzI1NiIs...
```

### Rate Limits

- Creating intents: 10/minute per merchant
- Checking status: 60/minute per merchant
- Getting supported tokens: 10/minute (no auth required)

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "originAmount",
      "message": "Origin amount is required"
    }
  ]
}
```

**404 Not Found**
```json
{
  "error": "NEAR intent not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to generate swap quote"
}
```

### Handling Failed Swaps

If a NEAR intent fails (`status: "FAILED"`), funds are automatically refunded to the `refundAddress` specified in the original request.

Monitor the status endpoint to detect failures:

```typescript
const status = await fetch(`/api/v1/near-payments/status/${nearIntentId}`);
const data = await status.json();

if (data.status === 'FAILED') {
  console.error('Payment failed:', data.errorMessage);
  // Notify user funds will be refunded
  alert('Payment failed. Funds will be refunded to your address.');
}
```

---

## Security Considerations

1. **Validate Merchant Ownership**: NEAR payment routes require authentication
2. **Verify ZEC Receipt**: Z402 automatically verifies ZEC blockchain transactions
3. **Expiration**: Payment intents expire after 30 minutes (configurable)
4. **Refund Protection**: Always specify valid `refundAddress` and `refundChainType`
5. **Slippage**: Set appropriate `slippageBps` to protect against price movements
6. **Webhook Signatures**: Verify Z402 webhook signatures with HMAC

---

## Testing

### Testnet Flow

1. Set `ZCASH_NETWORK=testnet` in Z402 config
2. Use testnet tokens (e.g., Sepolia USDC)
3. Test NEAR intent creation
4. Monitor logs for cross-chain swap progress
5. Verify testnet ZEC receipt

### Mock NEAR Intents (Development)

For local development without NEAR Intents:

```typescript
// packages/backend/src/services/near-intents.service.ts

// Add mock mode
if (process.env.NEAR_INTENTS_MOCK_MODE === 'true') {
  // Return mock data instead of calling API
  return {
    requestId: 'mock_' + Date.now(),
    quote: {
      depositAddress: '0xMOCK_ADDRESS',
      // ... mock data
    }
  };
}
```

---

## Monitoring & Analytics

### Key Metrics

Track these metrics for NEAR intents:

```typescript
// Query near_intents table
SELECT
  status,
  COUNT(*) as count,
  SUM(CAST(origin_amount AS DECIMAL)) as total_origin,
  SUM(CAST(destination_amount AS DECIMAL)) as total_zec,
  AVG(estimated_time_seconds) as avg_time
FROM near_intents
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Webhook Events

Z402 sends webhooks for NEAR intent events:

```typescript
{
  "type": "near_intent.completed",
  "nearIntentId": "near_xyz789",
  "paymentIntentId": "pi_abc123",
  "status": "SUCCESS",
  "zcashTxHash": "abc123...",
  "timestamp": "2025-12-04T10:03:00Z"
}
```

---

## Troubleshooting

### Issue: "Zcash (ZEC) not supported"

**Solution**: NEAR Intents might not support ZEC yet. Check supported tokens:
```
GET /api/v1/near-payments/supported-tokens
```

If ZEC is not listed, consider:
- Using a different output token
- Contacting NEAR Intents support to add ZEC
- Using alternative bridge (Axelar, LayerZero)

### Issue: Swap stuck in "PROCESSING"

**Solution**: Cross-chain swaps can take 3-10 minutes. If stuck > 15 minutes:
1. Check NEAR Intents status directly: `https://1click.chaindefuser.com/v0/status?depositAddress=...`
2. Verify deposit transaction was confirmed on origin chain
3. Contact NEAR Intents support with `requestId`

### Issue: "User sent wrong amount"

**Solution**: If `status: "INCOMPLETE_DEPOSIT"`, user sent incorrect amount. Funds will be refunded automatically.

---

## Roadmap

Future enhancements for NEAR intents integration:

- [ ] Automatic token selection based on user wallet
- [ ] Multi-token payment options (user chooses)
- [ ] Gas fee estimation
- [ ] Slippage protection UI
- [ ] Real-time price quotes with auto-refresh
- [ ] Direct wallet integration (MetaMask, Phantom)

---

## Resources

- [NEAR Intents Documentation](https://docs.near-intents.org)
- [NEAR 1Click API Reference](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api)
- [NEAR Intents Examples](https://github.com/near-examples/near-intents-examples)
- [Z402 Main Documentation](../README.md)

---

## Support

For NEAR intents integration support:
- GitHub Issues: https://github.com/bprime/Z402/issues
- Z402 Discord: [Link]
- NEAR Intents Discord: [Link]

---

**Last Updated**: 2025-12-04
**Integration Version**: 1.0.0
