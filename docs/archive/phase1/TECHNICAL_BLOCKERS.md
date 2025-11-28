# Technical Blockers & Solutions

**Date:** 2025-11-27
**Phase:** 1 - Week 1 - Day 1
**Status:** Blocked on signature verification library

---

## Critical Blocker: Signature Verification Implementation

### Problem

The current version of `@noble/secp256k1` (v3.x) does not support public key recovery with a recovery ID parameter, which is essential for Bitcoin/Zcash-style message signing where only the signature and message are provided.

**What We Need:**
- Ability to recover public key from signature + message + recovery ID
- Verify that recovered public key corresponds to claimed Zcash address

**What We Have:**
- `@noble/secp256k1` v3.x with limited API
- Basic address validation working ✅
- Message hashing working ✅
- Signature format parsing working ✅

### Impact

**Severity:** 🔴 **HIGH** - Blocks core payment authorization flow

**Affected Features:**
- X-402 payment authorization
- Client signature verification
- Payment proof validation

### Solutions (3 Options)

#### Option 1: Use Different Crypto Library (RECOMMENDED)

**Library:** `secp256k1` (native Node.js binding)

```bash
pnpm add secp256k1
pnpm add -D @types/secp256k1
```

**Pros:**
- Full secp256k1 support including recovery
- Used by Bitcoin Core
- Battle-tested and mature
- Fast (native implementation)

**Cons:**
- Requires native compilation (C++ dependencies)
- May have deployment complexity
- Larger bundle size

**Implementation Time:** 2-3 hours

#### Option 2: Require Client to Send Public Key

**Change:** Modify X-402 protocol to include public key in authorization

```typescript
interface X402Authorization {
  paymentId: string;
  clientAddress: string;
  signature: string;        // 64-byte compact signature
  publicKey: string;        // NEW: 33 or 65 byte public key
  timestamp: number;
}
```

**Pros:**
- Works with current `@noble/secp256k1`
- No additional dependencies
- Simpler verification logic

**Cons:**
- Breaks compatibility with standard Bitcoin/Zcash signing
- Clients must expose public key
- Less elegant protocol design

**Implementation Time:** 1-2 hours

#### Option 3: Use Zcash Node for Verification

**Approach:** Call `zcash-cli verifymessage` for signature verification

```typescript
async verifyWithNode(address: string, signature: string, message: string) {
  const result = await zcashRPC.call('verifymessage', [address, signature, message]);
  return result === true;
}
```

**Pros:**
- Guaranteed Zcash compatibility
- No crypto library issues
- Canonical verification

**Cons:**
- Requires Zcash node running
- Network call for every verification (slower)
- Dependency on external service

**Implementation Time:** 1 hour

### Recommendation

**Go with Option 1: `secp256k1` native library**

**Reasoning:**
1. Production-grade solution
2. Best performance
3. Full compatibility with Bitcoin/Zcash signing
4. Worth the setup complexity

**Action Plan:**
1. Install `secp256k1` package
2. Update `ZcashCryptoService.verifyTransparentSignature()`
3. Update tests to work with new library
4. Document build requirements in README

**Timeline:** Complete by end of Day 2 (Tuesday evening)

---

## Secondary Issues

### 1. Test Suite Compilation Errors

**Status:** ⚠️ Minor - Tests written but can't run

**Cause:** TypeScript errors due to incomplete signature verification

**Resolution:** Will be fixed when Option 1 implemented

### 2. Zcash Node Not Available

**Status:** ⚠️ Minor - Can proceed without it

**Impact:** Can't test with real blockchain yet

**Mitigation:**
- Use mocked signatures for unit tests
- Use public testnet RPC temporarily
- Set up local node overnight (8-10 hour sync)

**Action:** Start node sync tonight

### 3. Missing Test Fixtures

**Status:** ⚠️ Minor

**Need:**
- Known Zcash test addresses with private keys
- Pre-generated signatures for test cases
- Sample transaction data

**Solution:** Generate test fixtures once signature library working

---

## Implementation Progress Summary

### ✅ Completed Today (Day 1)

1. **Package Installation** - All dependencies installed
2. **Address Validation** - Full implementation for transparent & shielded
3. **X-402 Protocol Update** - HMAC removed, crypto signatures integrated
4. **Security Hardening** - Removed all hard-coded secret fallbacks
5. **Test Infrastructure** - Jest configured, test suite written (36 tests)
6. **Message Hashing** - Bitcoin signing convention implemented
7. **Signature Format Parsing** - Recovery ID extraction working

### ⏸️ Blocked

1. **Signature Verification** - Waiting on library decision
2. **Test Execution** - Can't run tests until verification works
3. **Integration Testing** - Need working verification first

---

## Next Steps (Day 2 - Tuesday)

### Morning (9am-12pm)
1. ✅ Make final decision on crypto library (Option 1 recommended)
2. ✅ Install `secp256k1` package
3. ✅ Update verification implementation
4. ✅ Fix compilation errors

### Afternoon (1pm-5pm)
5. ✅ Run test suite and fix failures
6. ✅ Generate test fixtures with known keys
7. ✅ Add integration tests
8. ✅ Achieve 80%+ test coverage

### Evening (5pm-7pm)
9. ✅ Start Zcash testnet node sync (overnight)
10. ✅ Request testnet ZEC from faucet
11. ✅ Document API changes
12. ✅ Commit and push progress

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Native compilation fails | Medium | High | Provide Docker image with pre-built binaries |
| Signature verification bugs | Medium | Critical | Comprehensive test suite (100%coverage) |
| Performance issues | Low | Medium | Benchmark and optimize |

### Timeline Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Library selection delays | Low | Medium | Decision made (Option 1) |
| Test failures | Medium | Low | Extra time allocated |
| Zcash node sync delays | High | Low | Use public RPC temporarily |

---

## Success Criteria (End of Day 2)

**Must Have:**
- [ ] Signature verification working with real signatures
- [ ] All 36 tests passing
- [ ] 80%+ code coverage
- [ ] No TypeScript errors

**Nice to Have:**
- [ ] Zcash node synced
- [ ] Real blockchain test case
- [ ] Performance benchmarks

---

## Resources Needed

### Immediate (Day 2 Morning):
- Decision on crypto library approach
- 2-3 hours focused development time
- Access to test Zcash wallet (for fixtures)

### Day 2 Afternoon:
- Zcash testnet faucet access
- Code review partner

### Day 2 Evening:
- Machine to run Zcash node overnight

---

## Questions for Team

1. **Crypto Library:** Approve Option 1 (secp256k1 native)?
   - Adds native dependency, increases build complexity
   - But provides production-grade solution

2. **Protocol Design:** Keep signature-only auth, or require public key?
   - Signature-only = more elegant, but harder to implement
   - With public key = simpler, but less standard

3. **Testing Strategy:** What's acceptable test coverage for crypto code?
   - Recommend: 100% for crypto, 80% overall
   - Current: 0% (can't run tests yet)

4. **Timeline:** Is end of Day 2 reasonable for working verification?
   - Confidence: 90% if Option 1 approved this morning
   - Fallback: Option 2 guarantees completion

---

## Code References

**Files Modified Today:**
- [packages/backend/src/services/zcash-crypto.service.ts](packages/backend/src/services/zcash-crypto.service.ts) (600 lines)
- [packages/backend/src/core/x402-protocol.ts](packages/backend/src/core/x402-protocol.ts) (updated)
- [packages/backend/src/config/index.ts](packages/backend/src/config/index.ts) (security fix)
- [packages/backend/tests/setup.ts](packages/backend/tests/setup.ts) (test config)
- [packages/backend/src/services/__tests__/zcash-crypto.service.test.ts](packages/backend/src/services/__tests__/zcash-crypto.service.test.ts) (36 tests)

**Current Blocker Location:**
```typescript
// File: packages/backend/src/services/zcash-crypto.service.ts
// Lines: 192-231
// Function: verifyTransparentSignature()
// Issue: Cannot recover public key with current library
```

---

## Useful Links

- [secp256k1 npm package](https://www.npmjs.com/package/secp256k1)
- [Bitcoin Message Signing Spec (BIP 137)](https://github.com/bitcoin/bips/blob/master/bip-0137.mediawiki)
- [Zcash Message Signing](https://zcash.readthedocs.io/en/latest/rtd_pages/payment_api.html#message-signing)
- [@noble/secp256k1 Issues](https://github.com/paulmillr/noble-secp256k1/issues)

---

**Status:** 📊 60% Complete for Day 1 Goals
**Confidence:** 🟢 High (can resolve tomorrow)
**Blocker Severity:** 🔴 Critical but solvable

**Last Updated:** 2025-11-27 23:00 UTC
**Next Update:** 2025-11-28 12:00 UTC (after library decision)
