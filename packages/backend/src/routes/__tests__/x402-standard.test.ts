/**
 * Standard X-402 Protocol Endpoints Tests
 *
 * Tests the standard X-402 facilitator endpoints including:
 * - GET /supported (payment schemes)
 * - POST /verify-standard (payment verification)
 * - POST /settle-standard (payment settlement)
 *
 * These tests ensure compliance with the Coinbase X-402 specification.
 */

import request from 'supertest';
import express from 'express';
import router from '../x402.routes';
import { zcashClient } from '../../integrations/zcash';
import { ZcashCryptoService } from '../../services/zcash-crypto.service';
import { VerificationService } from '../../services/verify.service';
import prisma from '../../db';
import { encodePaymentHeader, zecToZatoshis } from '../../utils/x402.utils';
import {
  X402PaymentHeader,
  ZcashTransparentPayload,
  X402PaymentRequirements,
} from '../../types/x402.types';
import { Decimal } from '@prisma/client/runtime/library';

// Mock dependencies
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  hashSync: jest.fn(),
  compareSync: jest.fn(),
}));
jest.mock('../../integrations/zcash');
jest.mock('../../services/zcash-crypto.service');
jest.mock('../../services/verify.service');
jest.mock('../../db', () => ({
  __esModule: true,
  default: {
    merchant: {
      findFirst: jest.fn(),
    },
    transaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/x402', router);

describe('Standard X-402 Facilitator Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/x402/supported', () => {
    it('should return supported payment schemes', async () => {
      const response = await request(app).get('/api/v1/x402/supported');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('kinds');
      expect(Array.isArray(response.body.kinds)).toBe(true);
      expect(response.body.kinds.length).toBeGreaterThan(0);
    });

    it('should include zcash-transparent scheme', async () => {
      const response = await request(app).get('/api/v1/x402/supported');

      const transparentScheme = response.body.kinds.find(
        (kind: any) => kind.scheme === 'zcash-transparent'
      );

      expect(transparentScheme).toBeDefined();
      expect(transparentScheme.network).toMatch(/^(mainnet|testnet)$/);
    });

    it('should include zcash-shielded scheme', async () => {
      const response = await request(app).get('/api/v1/x402/supported');

      const shieldedScheme = response.body.kinds.find(
        (kind: any) => kind.scheme === 'zcash-shielded'
      );

      expect(shieldedScheme).toBeDefined();
      expect(shieldedScheme.network).toMatch(/^(mainnet|testnet)$/);
    });
  });

  describe('POST /api/v1/x402/verify-standard', () => {
    const mockPaymentRequirements: X402PaymentRequirements = {
      scheme: 'zcash-transparent',
      network: 'testnet',
      maxAmountRequired: zecToZatoshis(1.0), // 1 ZEC
      resource: 'https://api.example.com/premium-data',
      description: 'Premium API access',
      mimeType: 'application/json',
      outputSchema: null,
      payTo: 't1MerchantAddress123',
      maxTimeoutSeconds: 3600,
      asset: 'ZEC',
      extra: null,
    };

    const mockPayload: ZcashTransparentPayload = {
      txid: 'mock-txid-123',
      amount: zecToZatoshis(1.0),
      from: 't1ClientAddress456',
      to: 't1MerchantAddress123',
      signature: 'mock-signature-hex',
      timestamp: Math.floor(Date.now() / 1000),
    };

    const mockPaymentHeader: X402PaymentHeader = {
      x402Version: 1,
      scheme: 'zcash-transparent',
      network: 'testnet',
      payload: mockPayload,
    };

    it('should verify valid payment successfully', async () => {
      // Mock blockchain transaction
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 3,
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      // Mock signature verification
      (ZcashCryptoService.verifyX402Authorization as jest.Mock).mockResolvedValue({
        valid: true,
      });

      // Mock double-spend check
      (VerificationService.checkDoubleSpend as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(true);
      expect(response.body.invalidReason).toBeNull();
    });

    it('should reject payment with invalid version', async () => {
      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 2, // Invalid version
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('version');
    });

    it('should reject payment with invalid base64 encoding', async () => {
      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: 'not-valid-base64!!!',
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('encoding');
    });

    it('should reject payment with scheme mismatch', async () => {
      const mismatchedHeader = {
        ...mockPaymentHeader,
        scheme: 'zcash-shielded' as const,
      };

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mismatchedHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('mismatch');
    });

    it('should reject payment with old timestamp', async () => {
      const oldTimestampPayload = {
        ...mockPayload,
        timestamp: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      };

      const oldHeader: X402PaymentHeader = {
        ...mockPaymentHeader,
        payload: oldTimestampPayload,
      };

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(oldHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('Timestamp');
    });

    it('should reject payment with transaction not found on blockchain', async () => {
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('not found');
    });

    it('should reject payment with insufficient amount', async () => {
      const insufficientPayload = {
        ...mockPayload,
        amount: zecToZatoshis(0.5), // Only 0.5 ZEC instead of 1.0
      };

      const insufficientHeader: X402PaymentHeader = {
        ...mockPaymentHeader,
        payload: insufficientPayload,
      };

      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 0.5,
        confirmations: 3,
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(insufficientHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('amount');
    });

    it('should reject payment to wrong address', async () => {
      const wrongAddressPayload = {
        ...mockPayload,
        to: 't1WrongAddress999',
      };

      const wrongHeader: X402PaymentHeader = {
        ...mockPaymentHeader,
        payload: wrongAddressPayload,
      };

      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 3,
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: wrongAddressPayload.to,
      });

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(wrongHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('address');
    });

    it('should reject payment with invalid signature', async () => {
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 3,
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      (ZcashCryptoService.verifyX402Authorization as jest.Mock).mockResolvedValue({
        valid: false,
      });

      (VerificationService.checkDoubleSpend as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('signature');
    });

    it('should reject double-spend attempt', async () => {
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 3,
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      (ZcashCryptoService.verifyX402Authorization as jest.Mock).mockResolvedValue({
        valid: true,
      });

      (VerificationService.checkDoubleSpend as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/x402/verify-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.isValid).toBe(false);
      expect(response.body.invalidReason).toContain('already used');
    });
  });

  describe('POST /api/v1/x402/settle-standard', () => {
    const mockPaymentRequirements: X402PaymentRequirements = {
      scheme: 'zcash-transparent',
      network: 'testnet',
      maxAmountRequired: zecToZatoshis(1.0),
      resource: 'https://api.example.com/premium-data',
      description: 'Premium API access',
      mimeType: 'application/json',
      outputSchema: null,
      payTo: 't1MerchantAddress123',
      maxTimeoutSeconds: 3600,
      asset: 'ZEC',
      extra: null,
    };

    const mockPayload: ZcashTransparentPayload = {
      txid: 'mock-txid-settle-123',
      amount: zecToZatoshis(1.0),
      from: 't1ClientAddress456',
      to: 't1MerchantAddress123',
      signature: 'mock-signature-hex',
      timestamp: Math.floor(Date.now() / 1000),
    };

    const mockPaymentHeader: X402PaymentHeader = {
      x402Version: 1,
      scheme: 'zcash-transparent',
      network: 'testnet',
      payload: mockPayload,
    };

    it('should settle valid payment with sufficient confirmations', async () => {
      // Mock merchant lookup
      (prisma.merchant.findFirst as jest.Mock).mockResolvedValue({
        id: 'merchant-123',
        zcashAddress: 't1MerchantAddress123',
      });

      // Mock blockchain transaction with sufficient confirmations
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 6, // Sufficient confirmations
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      // Mock no existing transaction
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock transaction creation
      (prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx-123',
        merchantId: 'merchant-123',
        amount: new Decimal(1.0),
        status: 'SETTLED',
        transactionId: mockPayload.txid,
      });

      const response = await request(app)
        .post('/api/v1/x402/settle-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.error).toBeNull();
      expect(response.body.txHash).toBe(mockPayload.txid);
      expect(response.body.networkId).toBe('testnet');
    });

    it('should reject settlement with insufficient confirmations', async () => {
      // Mock merchant lookup
      (prisma.merchant.findFirst as jest.Mock).mockResolvedValue({
        id: 'merchant-123',
        zcashAddress: 't1MerchantAddress123',
      });

      // Mock blockchain transaction with insufficient confirmations
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 3, // Less than required 6
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      const response = await request(app)
        .post('/api/v1/x402/settle-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('confirmations');
    });

    it('should be idempotent for already settled transactions', async () => {
      // Mock existing settled transaction
      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: 'tx-123',
        transactionId: mockPayload.txid,
        status: 'SETTLED',
      });

      const response = await request(app)
        .post('/api/v1/x402/settle-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.txHash).toBe(mockPayload.txid);

      // Should not create new transaction
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('should reject settlement when merchant not found', async () => {
      // Mock merchant not found
      (prisma.merchant.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock blockchain transaction
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue({
        txid: mockPayload.txid,
        amount: 1.0,
        confirmations: 6,
        blockHeight: 1000,
        timestamp: Date.now() / 1000,
        from: mockPayload.from,
        to: mockPayload.to,
      });

      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/x402/settle-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Merchant not found');
    });

    it('should reject settlement when transaction not on blockchain', async () => {
      // Mock merchant lookup
      (prisma.merchant.findFirst as jest.Mock).mockResolvedValue({
        id: 'merchant-123',
        zcashAddress: 't1MerchantAddress123',
      });

      // Mock transaction not found on blockchain
      (zcashClient.getTransaction as jest.Mock).mockResolvedValue(null);

      (prisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/x402/settle-standard')
        .send({
          x402Version: 1,
          paymentHeader: encodePaymentHeader(mockPaymentHeader),
          paymentRequirements: mockPaymentRequirements,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found on blockchain');
    });
  });
});
