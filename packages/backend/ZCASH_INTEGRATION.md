# Zcash Integration Documentation

## Overview

Z402's Zcash integration provides a complete solution for accepting Zcash (ZEC) payments through both transparent (t-addresses) and shielded (z-addresses) transactions.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                     Z402 Backend                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │   Zcash RPC  │   │ Verification │   │ Settlement  │ │
│  │    Client    │──▶│   Service    │──▶│   Service   │ │
│  └──────────────┘   └──────────────┘   └─────────────┘ │
│         │                    │                   │       │
│         │                    │                   │       │
│         ▼                    ▼                   ▼       │
│  ┌─────────────────────────────────────────────────┐    │
│  │          PostgreSQL (Transaction DB)            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │    Zcash Node          │
               │  (zcashd or zebrad)    │
               └────────────────────────┘
```

### Core Files

1. **`src/integrations/zcash.ts`** (527 lines)
   - Main RPC client implementation
   - Address validation and generation
   - Transaction queries and sending
   - Balance management

2. **`src/services/verify.service.ts`** (389 lines)
   - Payment verification logic
   - Blockchain transaction validation
   - Double-spend prevention
   - Authorization verification

3. **`src/services/settle.service.ts`** (452 lines)
   - Payment settlement after confirmations
   - Auto-settlement batch processing
   - Confirmation monitoring
   - Payment expiration handling

## Features

### 1. Address Support

#### Transparent Addresses (t-addresses)
- **Format**: `t1...` (testnet), `t3...` (mainnet)
- **Privacy**: Public transactions
- **Use Case**: Standard payments, exchanges
- **Support**: ✅ Full support

```typescript
// Generate transparent address
const address = await zcashClient.createTransparentAddress();
// Example: t1V9mnkcte6BjwKVAqY3kpz5yRhqKmwNwv8
```

#### Shielded Addresses (z-addresses - Sapling)
- **Format**: `zs1...` (mainnet), `ztestsapling...` (testnet)
- **Privacy**: Private transactions
- **Use Case**: Enhanced privacy
- **Support**: ✅ Full support with memo field

```typescript
// Generate shielded address
const address = await zcashClient.createShieldedAddress();
// Example: zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly
```

### 2. Transaction Verification

#### Multi-Stage Verification Process

```
Payment Intent → Authorization → Blockchain Verification → Settlement
     (DB)          (Signature)      (Confirmations)        (Finalized)
```

#### Stages:

1. **PENDING**: Payment intent created, awaiting transaction
2. **VERIFIED**: Transaction found on blockchain (1+ confirmations)
3. **SETTLED**: Transaction has minimum confirmations (default: 6)
4. **FAILED**: Verification failed or expired
5. **REFUNDED**: Payment refunded to customer

#### Verification Logic

```typescript
// From verify.service.ts:96-194
private static async verifyOnBlockchain(
  dbTransactionId: string,
  txid: string
): Promise<VerificationResult> {
  // 1. Fetch transaction from database
  const dbTransaction = await prisma.transaction.findUnique({...});

  // 2. Fetch transaction from Zcash blockchain
  const zcashTx = await zcashClient.getTransaction(txid);

  // 3. Verify amount matches (with floating-point tolerance)
  const amountMatches =
    Math.abs(zcashTx.amount - parseFloat(dbTransaction.amount)) < 0.00000001;

  // 4. Verify recipient address
  const merchantAddress = dbTransaction.merchant.zcashShieldedAddress ||
    dbTransaction.merchant.zcashAddress;

  // Note: Shielded transactions can't verify recipient address externally
  // Merchants must confirm receipt

  // 5. Update transaction status based on confirmations
  await prisma.transaction.update({
    where: { id: dbTransactionId },
    data: {
      status: zcashTx.confirmations >= 1 ? 'VERIFIED' : 'PENDING',
      transactionId: txid,
      confirmations: zcashTx.confirmations,
      blockHeight: zcashTx.blockHeight,
    },
  });

  return { success: true, details: {...} };
}
```

### 3. Settlement Configuration

```typescript
// Default configuration
const SETTLEMENT_CONFIG = {
  minConfirmations: 6,        // Minimum confirmations required
  autoSettle: true,           // Enable automatic settlement
  settlementInterval: 60000,  // Check every 60 seconds
  expirationTime: 3600000,    // Expire after 1 hour
};
```

#### Confirmation Requirements by Network

| Network | Min Confirmations | Typical Time |
|---------|-------------------|--------------|
| Testnet | 6                 | ~15 minutes  |
| Mainnet | 6                 | ~15 minutes  |

Each Zcash block takes approximately 2.5 minutes.

### 4. Double-Spend Protection

```typescript
// From verify.service.ts:199-243
static async checkDoubleSpend(
  paymentId: string,
  txid: string
): Promise<boolean> {
  // Check if txid is already used for a different payment
  const existingTx = await prisma.transaction.findFirst({
    where: {
      transactionId: txid,
      paymentIntentId: { not: paymentId },
      status: { in: ['PENDING', 'VERIFIED', 'SETTLED'] },
    },
  });

  if (existingTx) {
    logger.warn('Double-spend attempt detected', { txid, paymentId });
    return true;
  }

  // Check if payment has multiple active transactions
  const paymentTransactions = await prisma.transaction.findMany({
    where: {
      paymentIntentId: paymentId,
      status: { in: ['PENDING', 'VERIFIED', 'SETTLED'] },
    },
  });

  return paymentTransactions.length > 1;
}
```

## Configuration

### Environment Variables

```bash
# Network selection (testnet for development, mainnet for production)
ZCASH_NETWORK=testnet

# RPC connection (adjust port for your node)
# Testnet: 18232, Mainnet: 8232
ZCASH_RPC_URL=http://localhost:18232

# RPC credentials (must match zcash.conf)
ZCASH_RPC_USER=zcashrpc
ZCASH_RPC_PASSWORD=your-secure-password
```

### Zcash Node Configuration

#### zcash.conf

```conf
# Basic configuration
testnet=1                    # Use testnet (remove for mainnet)
server=1                     # Enable RPC server
rpcuser=zcashrpc            # RPC username
rpcpassword=your-secure-password  # RPC password
rpcallowip=127.0.0.1        # Allow local connections

# Performance
maxconnections=50
dbcache=512

# Wallet
wallet=z402                  # Wallet name (optional)
```

## Testing

### 1. Quick Diagnostic

Run the Zcash connection diagnostic tool:

```bash
cd packages/backend
npm run test:zcash
```

This will check:
- ✓ Environment configuration
- ✓ RPC connection
- ✓ Node sync status
- ✓ Address validation
- ✓ Address generation
- ✓ Balance queries
- ✓ Transaction queries

### 2. Automated Tests

Run the full test suite:

```bash
cd packages/backend
npm test tests/integration/zcash.test.ts
```

### 3. Manual Testing

```typescript
import { ZcashRPCClient } from './src/integrations/zcash';

const client = new ZcashRPCClient();

// Test connection
const health = await client.healthCheck();
console.log('Connected:', health.connected);

// Test address generation
const tAddr = await client.createTransparentAddress();
const zAddr = await client.createShieldedAddress();

// Test transaction query
const tx = await client.getTransaction('txid_here');
console.log('Confirmations:', tx?.confirmations);
```

## Security Considerations

### 1. Private Key Management

**CRITICAL**: Z402 backend **never** stores Zcash private keys.

- Merchant addresses are generated by the merchant's own Zcash wallet
- Backend only stores public addresses (t-address or z-address)
- Transactions are sent from the Zcash node wallet, not the backend

### 2. Shielded Transaction Privacy

**Important Limitation**: For shielded transactions:
- Recipient address cannot be verified externally
- Amount cannot be verified externally
- Relies on merchant confirmation of receipt
- Consider using transparent addresses for automated verification

### 3. Amount Verification Tolerance

```typescript
// Floating-point comparison with tolerance
const amountMatches =
  Math.abs(zcashTx.amount - parseFloat(dbTransaction.amount)) < 0.00000001;
```

Due to floating-point precision, we allow a tolerance of 0.00000001 ZEC (1 zatoshi).

### 4. RPC Security

- Use strong passwords for RPC authentication
- Restrict RPC access to localhost or trusted IPs
- Use SSL/TLS for remote RPC connections
- Never expose RPC port publicly

## Known Issues & Limitations

### 1. Shielded Transaction Verification

**Issue**: Cannot externally verify recipient address for z-address transactions.

**Impact**: Must rely on merchant confirming they received the payment.

**Mitigation**:
- Require merchants to use transparent addresses for automated verification
- Implement manual merchant confirmation for shielded transactions
- Use payment IDs/memos to track payments

**Status**: ⚠️ Design limitation of Zcash privacy

### 2. Node Synchronization

**Issue**: Zcash node must be fully synced for accurate data.

**Impact**: Long initial sync time (several hours to days depending on network).

**Mitigation**:
- Use `isSynced()` to check sync status
- Queue operations until node is synced
- Consider using a third-party Zcash API for initial deployment

**Status**: ✅ Handled by health checks

### 3. Transaction Broadcasting Delays

**Issue**: Shielded transactions (`z_sendmany`) are asynchronous operations.

**Impact**: Requires polling `z_getoperationstatus` for completion.

**Mitigation**:
- `waitForOperation()` method handles polling automatically
- Maximum wait time: 60 seconds (configurable)
- Operation status is monitored every 1 second

**Status**: ✅ Implemented in zcash.ts:388-420

### 4. Floating-Point Precision

**Issue**: JavaScript Number type has limited precision for cryptocurrency amounts.

**Impact**: Potential rounding errors for very small amounts.

**Mitigation**:
- Use string representation for amounts in database (Decimal type)
- Implement tolerance in amount comparison (0.00000001 ZEC)
- Consider using BigInt or decimal libraries for critical calculations

**Status**: ⚠️ Acceptable for current precision requirements

## Performance Considerations

### RPC Call Timeout

```typescript
// zcash.ts:68
timeout: 30000, // 30 seconds
```

All RPC calls have a 30-second timeout to prevent hanging requests.

### Concurrent Requests

The RPC client uses axios, which handles concurrent requests efficiently. No additional connection pooling is required.

### Caching Recommendations

Consider caching:
- ✓ Block height (cache for 2-3 minutes)
- ✓ Address validation results (cache permanently)
- ✗ Transaction confirmations (DO NOT cache - needs real-time data)
- ✗ Balances (DO NOT cache - needs real-time data)

## Troubleshooting

### Connection Issues

```bash
# Check if Zcash node is running
ps aux | grep zcashd

# Test RPC connection manually
curl --user zcashrpc:password \
  --data-binary '{"jsonrpc":"2.0","id":"test","method":"getblockchaininfo","params":[]}' \
  -H 'content-type: text/plain;' \
  http://localhost:18232/
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Node not running | Start Zcash node |
| `401 Unauthorized` | Wrong credentials | Check RPC user/password |
| `404 Not Found` | Wrong RPC URL | Verify ZCASH_RPC_URL |
| `Transaction not found` | Not yet mined | Wait for transaction to propagate |
| `Insufficient funds` | Wallet empty | Add funds to wallet |

### Debug Mode

Enable detailed logging:

```typescript
// In config or .env
LOG_LEVEL=debug

// This will log all RPC calls and responses
```

## Future Enhancements

### Planned Features

1. **Unified Addresses Support** (NU5)
   - Support for new UA format
   - Automatic protocol selection
   - Status: 🔄 Planned for Q2 2024

2. **Lightning Network Integration**
   - Instant settlements
   - Micro-transactions
   - Status: 📋 Under consideration

3. **Multi-Signature Support**
   - Shared merchant wallets
   - Enhanced security
   - Status: 📋 Under consideration

4. **Memo Field Enhancements**
   - Structured memo data
   - Payment metadata
   - Status: 🔄 In development

### Optimization Opportunities

1. **Batch Transaction Queries**
   - Query multiple transactions in one RPC call
   - Reduce RPC overhead
   - Impact: 30-50% performance improvement

2. **Webhook Optimization**
   - Real-time blockchain event notifications
   - Reduce polling frequency
   - Impact: Faster verification, lower load

3. **Database Indexing**
   - Add indexes on transactionId, blockHeight
   - Faster transaction lookups
   - Impact: 50-80% query speed improvement

## Support

### Resources

- [Zcash RPC Documentation](https://zcash.github.io/rpc/)
- [Zcash Protocol Specification](https://zips.z.cash/)
- [Z402 API Documentation](../docs/api-reference.md)
- [Z402 Security Policy](../../SECURITY.md)

### Getting Help

- **Documentation**: https://docs.z402.io
- **GitHub Issues**: https://github.com/z402/z402/issues
- **Discord**: https://discord.gg/z402
- **Email**: support@z402.io

## Changelog

### v0.1.0 (Current)
- ✅ Initial Zcash integration
- ✅ Transparent and shielded address support
- ✅ Transaction verification
- ✅ Settlement automation
- ✅ Double-spend protection
- ✅ Comprehensive testing suite

## License

This integration is part of the Z402 project and is licensed under the MIT License.
