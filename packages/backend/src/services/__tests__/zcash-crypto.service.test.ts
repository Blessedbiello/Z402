/**
 * Unit tests for ZcashCryptoService
 *
 * Tests cover:
 * - Address validation (transparent and shielded)
 * - Signature verification (ECDSA)
 * - Challenge creation and verification
 * - Payment proof generation
 */

import { ZcashCryptoService } from '../zcash-crypto.service';

describe('ZcashCryptoService', () => {
  describe('Address Validation', () => {
    describe('validateAddress - Transparent Addresses', () => {
      it('should validate mainnet transparent P2PKH address (t1)', () => {
        const address = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
        const result = ZcashCryptoService.validateAddress(address);

        expect(result.type).toBe('transparent');
        expect(result.network).toBe('mainnet');
        expect(result.address).toBe(address);
        expect(result.pubKeyHash).toBeDefined();
        expect(result.pubKeyHash?.length).toBe(20);
      });

      it('should validate mainnet transparent P2SH address (t3)', () => {
        const address = 't3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd';
        const result = ZcashCryptoService.validateAddress(address);

        expect(result.type).toBe('transparent');
        expect(result.network).toBe('mainnet');
        expect(result.address).toBe(address);
      });

      it('should validate testnet transparent address (tm)', () => {
        const address = 'tmBsTi2xWTjUdEXnuTceL7fecEQKeWaPDJd';
        const result = ZcashCryptoService.validateAddress(address);

        expect(result.type).toBe('transparent');
        expect(result.network).toBe('testnet');
        expect(result.address).toBe(address);
        expect(result.pubKeyHash).toBeDefined();
      });

      it('should reject invalid transparent address (bad checksum)', () => {
        const invalidAddress = 't1Invalid1Address1With1Bad1Checksum';

        expect(() => {
          ZcashCryptoService.validateAddress(invalidAddress);
        }).toThrow('Invalid Zcash address');
      });

      it('should reject address with invalid prefix', () => {
        const invalidAddress = 'x1InvalidPrefixAddress123456789';

        expect(() => {
          ZcashCryptoService.validateAddress(invalidAddress);
        }).toThrow('must start with t or z');
      });

      it('should reject empty address', () => {
        expect(() => {
          ZcashCryptoService.validateAddress('');
        }).toThrow();
      });
    });

    describe('validateAddress - Shielded Addresses', () => {
      it('should validate mainnet Sapling address (zs)', () => {
        const address = 'zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly';
        const result = ZcashCryptoService.validateAddress(address);

        expect(result.type).toBe('shielded');
        expect(result.network).toBe('mainnet');
        expect(result.address).toBe(address);
        expect(result.pubKeyHash).toBeUndefined(); // Shielded addresses don't expose pubKeyHash
      });

      it('should validate testnet Sapling address', () => {
        const address = 'ztestsapling1xyzabc123def456ghi789jkl012mno345pqr678stu901vwx234yz567';
        const result = ZcashCryptoService.validateAddress(address);

        expect(result.type).toBe('shielded');
        expect(result.network).toBe('testnet');
        expect(result.address).toBe(address);
      });

      it('should reject shielded address that is too short', () => {
        const tooShort = 'zs1tooshort';

        expect(() => {
          ZcashCryptoService.validateAddress(tooShort);
        }).toThrow('Invalid shielded address length');
      });

      it('should reject shielded address that is too long', () => {
        const tooLong = 'zs1' + 'a'.repeat(200);

        expect(() => {
          ZcashCryptoService.validateAddress(tooLong);
        }).toThrow('Invalid shielded address length');
      });
    });
  });

  describe('Signature Verification', () => {
    // Test data: Known Zcash address and signature for testing
    // Note: These are example values - in real tests, generate fresh signatures
    const testMessage = 'Test message for signing';

    describe('verifyTransparentSignature', () => {
      it('should return error for shielded address', async () => {
        const shieldedAddress = 'zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly';
        const dummySignature = '00'.repeat(65);

        const result = await ZcashCryptoService.verifyTransparentSignature(
          testMessage,
          dummySignature,
          shieldedAddress
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('transparent addresses');
      });

      it('should reject signature with invalid length', async () => {
        const address = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
        const invalidSignature = '00'.repeat(32); // Too short

        const result = await ZcashCryptoService.verifyTransparentSignature(
          testMessage,
          invalidSignature,
          address
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('65 bytes');
      });

      it('should reject signature with invalid format', async () => {
        const address = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
        const invalidSignature = 'not-a-hex-string';

        const result = await ZcashCryptoService.verifyTransparentSignature(
          testMessage,
          invalidSignature,
          address
        );

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should handle invalid address in signature verification', async () => {
        const invalidAddress = 't1InvalidAddress123';
        const signature = '00'.repeat(65);

        await expect(
          ZcashCryptoService.verifyTransparentSignature(
            testMessage,
            signature,
            invalidAddress
          )
        ).rejects.toThrow();
      });

      // Integration test - requires real signature generation
      // This would typically use a test wallet with known private key
      it.skip('should verify valid signature from known test wallet', async () => {
        // This test requires:
        // 1. A Zcash testnet address with known private key
        // 2. A signature generated with that private key
        // 3. Implementation in test setup to generate signatures

        const testAddress = 'tmTestAddress123456789'; // From test wallet
        const testSignature = '00'.repeat(65); // Generated signature

        const result = await ZcashCryptoService.verifyTransparentSignature(
          testMessage,
          testSignature,
          testAddress
        );

        expect(result.valid).toBe(true);
        expect(result.address).toBe(testAddress);
        expect(result.message).toBe(testMessage);
      });
    });
  });

  describe('Challenge Creation', () => {
    describe('createChallenge', () => {
      it('should create deterministic challenge string', () => {
        const paymentIntentId = 'payment_123';
        const amount = '0.01';
        const merchantAddress = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
        const timestamp = 1700000000000;

        const challenge = ZcashCryptoService.createChallenge(
          paymentIntentId,
          amount,
          merchantAddress,
          timestamp
        );

        expect(challenge).toBeDefined();
        expect(typeof challenge).toBe('string');

        // Should be valid JSON
        const parsed = JSON.parse(challenge);
        expect(parsed.paymentIntentId).toBe(paymentIntentId);
        expect(parsed.amount).toBe(amount);
        expect(parsed.merchantAddress).toBe(merchantAddress);
        expect(parsed.timestamp).toBe(timestamp);
        expect(parsed.protocol).toBe('x402-zcash');
        expect(parsed.version).toBe('1.0');
      });

      it('should create different challenges for different inputs', () => {
        const timestamp = Date.now();

        const challenge1 = ZcashCryptoService.createChallenge(
          'payment_1',
          '0.01',
          't1Address1',
          timestamp
        );

        const challenge2 = ZcashCryptoService.createChallenge(
          'payment_2',
          '0.01',
          't1Address1',
          timestamp
        );

        expect(challenge1).not.toBe(challenge2);
      });

      it('should create same challenge for same inputs (deterministic)', () => {
        const params = {
          paymentIntentId: 'payment_123',
          amount: '0.01',
          merchantAddress: 't1Address',
          timestamp: 1700000000000,
        };

        const challenge1 = ZcashCryptoService.createChallenge(
          params.paymentIntentId,
          params.amount,
          params.merchantAddress,
          params.timestamp
        );

        const challenge2 = ZcashCryptoService.createChallenge(
          params.paymentIntentId,
          params.amount,
          params.merchantAddress,
          params.timestamp
        );

        expect(challenge1).toBe(challenge2);
      });

      it('should include all required fields in challenge', () => {
        const challenge = ZcashCryptoService.createChallenge(
          'payment_123',
          '0.01',
          't1Address',
          1700000000000
        );

        const parsed = JSON.parse(challenge);

        expect(parsed).toHaveProperty('paymentIntentId');
        expect(parsed).toHaveProperty('amount');
        expect(parsed).toHaveProperty('merchantAddress');
        expect(parsed).toHaveProperty('timestamp');
        expect(parsed).toHaveProperty('protocol');
        expect(parsed).toHaveProperty('version');
      });
    });

    describe('verifyX402Authorization', () => {
      it('should reject expired challenge', async () => {
        const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
        const challenge = ZcashCryptoService.createChallenge(
          'payment_123',
          '0.01',
          't1Address',
          oldTimestamp
        );

        const result = await ZcashCryptoService.verifyX402Authorization(
          challenge,
          '00'.repeat(65),
          't1TestAddress'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('expired');
      });

      it('should reject challenge with invalid format', async () => {
        const invalidChallenge = 'not-a-json-string';

        const result = await ZcashCryptoService.verifyX402Authorization(
          invalidChallenge,
          '00'.repeat(65),
          't1TestAddress'
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid challenge format');
      });

      it('should accept recent challenge (within 5 minutes)', async () => {
        const recentTimestamp = Date.now() - (2 * 60 * 1000); // 2 minutes ago
        const challenge = ZcashCryptoService.createChallenge(
          'payment_123',
          '0.01',
          't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY',
          recentTimestamp
        );

        const result = await ZcashCryptoService.verifyX402Authorization(
          challenge,
          '00'.repeat(65),
          't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY'
        );

        // Will fail signature verification, but should pass expiration check
        expect(result.valid).toBe(false);
        expect(result.error).not.toContain('expired');
      });
    });
  });

  describe('Payment Proof Generation', () => {
    describe('generatePaymentProof', () => {
      it('should generate payment proof hash', () => {
        const txid = 'abc123def456';
        const amount = '0.01';
        const fromAddress = 't1From';
        const toAddress = 't1To';

        const proof = ZcashCryptoService.generatePaymentProof(
          txid,
          amount,
          fromAddress,
          toAddress
        );

        expect(proof).toBeDefined();
        expect(typeof proof).toBe('string');
        expect(proof.length).toBe(64); // SHA-256 produces 64 hex characters
      });

      it('should generate different proofs for different inputs', () => {
        const proof1 = ZcashCryptoService.generatePaymentProof(
          'txid1',
          '0.01',
          't1From',
          't1To'
        );

        const proof2 = ZcashCryptoService.generatePaymentProof(
          'txid2',
          '0.01',
          't1From',
          't1To'
        );

        expect(proof1).not.toBe(proof2);
      });

      it('should generate same proof for same inputs (deterministic)', () => {
        const params = {
          txid: 'abc123',
          amount: '0.01',
          from: 't1From',
          to: 't1To',
        };

        const proof1 = ZcashCryptoService.generatePaymentProof(
          params.txid,
          params.amount,
          params.from,
          params.to
        );

        const proof2 = ZcashCryptoService.generatePaymentProof(
          params.txid,
          params.amount,
          params.from,
          params.to
        );

        expect(proof1).toBe(proof2);
      });

      it('should be sensitive to all input parameters', () => {
        const base = {
          txid: 'abc123',
          amount: '0.01',
          from: 't1From',
          to: 't1To',
        };

        const baseProof = ZcashCryptoService.generatePaymentProof(
          base.txid,
          base.amount,
          base.from,
          base.to
        );

        // Change each parameter and verify proof changes
        const proofDiffTxid = ZcashCryptoService.generatePaymentProof(
          'different',
          base.amount,
          base.from,
          base.to
        );
        expect(proofDiffTxid).not.toBe(baseProof);

        const proofDiffAmount = ZcashCryptoService.generatePaymentProof(
          base.txid,
          '0.02',
          base.from,
          base.to
        );
        expect(proofDiffAmount).not.toBe(baseProof);

        const proofDiffFrom = ZcashCryptoService.generatePaymentProof(
          base.txid,
          base.amount,
          't1Different',
          base.to
        );
        expect(proofDiffFrom).not.toBe(baseProof);

        const proofDiffTo = ZcashCryptoService.generatePaymentProof(
          base.txid,
          base.amount,
          base.from,
          't1Different'
        );
        expect(proofDiffTo).not.toBe(baseProof);
      });
    });
  });

  describe('Security Properties', () => {
    it('should not expose private information in errors', async () => {
      const result = await ZcashCryptoService.verifyTransparentSignature(
        'test',
        '00'.repeat(65),
        't1TestAddress'
      );

      // Error messages should be generic, not expose internal state
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('private');
      expect(result.error).not.toContain('secret');
    });

    it('should handle malformed input gracefully', async () => {
      // Should not throw, should return error result
      const result = await ZcashCryptoService.verifyTransparentSignature(
        '',
        '',
        ''
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate address before signature verification', async () => {
      const invalidAddress = 'not-an-address';
      const signature = '00'.repeat(65);

      await expect(
        ZcashCryptoService.verifyTransparentSignature(
          'test',
          signature,
          invalidAddress
        )
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(10000);
      const address = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
      const signature = '00'.repeat(65);

      const result = await ZcashCryptoService.verifyTransparentSignature(
        longMessage,
        signature,
        address
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(false); // Will fail verification, but should handle gracefully
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = '!@#$%^&*()_+{}|:"<>?[]\\;\',./<emoji>🚀';
      const address = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
      const signature = '00'.repeat(65);

      const result = await ZcashCryptoService.verifyTransparentSignature(
        specialMessage,
        signature,
        address
      );

      expect(result).toBeDefined();
    });

    it('should handle unicode in messages', async () => {
      const unicodeMessage = '你好世界 مرحبا בשלום';
      const address = 't1Uzd4rAfHhL8gwHxfzQc8iJESLNKjPdmNY';
      const signature = '00'.repeat(65);

      const result = await ZcashCryptoService.verifyTransparentSignature(
        unicodeMessage,
        signature,
        address
      );

      expect(result).toBeDefined();
    });
  });
});
