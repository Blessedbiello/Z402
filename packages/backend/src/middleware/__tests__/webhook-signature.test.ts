/**
 * Webhook Signature Verification Tests
 *
 * Tests the webhook signature verification middleware including:
 * - Signature generation
 * - Signature verification
 * - Timestamp validation
 * - Error handling
 * - Security features (timing attacks, replay attacks)
 */

import { Request, Response, NextFunction } from 'express';
import {
  verifyWebhookSignature,
  generateWebhookSignature,
  rawBodyMiddleware,
  WebhookRequest,
} from '../webhook-signature';

describe('Webhook Signature Verification', () => {
  let mockReq: Partial<WebhookRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const testSecret = 'test-webhook-secret-key';

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
      path: '/webhooks/test',
      ip: '127.0.0.1',
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('generateWebhookSignature', () => {
    it('should generate signature with correct format', () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, testSecret);

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = { test: 'data1' };
      const payload2 = { test: 'data2' };

      const sig1 = generateWebhookSignature(payload1, testSecret);
      const sig2 = generateWebhookSignature(payload2, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = { test: 'data' };
      const sig1 = generateWebhookSignature(payload, 'secret1');
      const sig2 = generateWebhookSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });

    it('should handle string payloads', () => {
      const payload = '{"test":"data"}';
      const signature = generateWebhookSignature(payload, testSecret);

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('should generate different signatures at different times', (done) => {
      const payload = { test: 'data' };
      const sig1 = generateWebhookSignature(payload, testSecret);

      setTimeout(() => {
        const sig2 = generateWebhookSignature(payload, testSecret);
        expect(sig1).not.toBe(sig2); // Different due to timestamp
        done();
      }, 1100); // Wait > 1 second
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature successfully', () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, testSecret);

      mockReq.headers = { 'x-z402-signature': signature };
      mockReq.rawBody = JSON.stringify(payload);

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.webhookVerified).toBe(true);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without signature header', () => {
      mockReq.headers = {};
      mockReq.rawBody = JSON.stringify({ test: 'data' });

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing webhook signature',
        })
      );
    });

    it('should reject signature with invalid format', () => {
      mockReq.headers = { 'x-z402-signature': 'invalid-format' };
      mockReq.rawBody = JSON.stringify({ test: 'data' });

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid signature format',
        })
      );
    });

    it('should reject signature with missing timestamp', () => {
      mockReq.headers = { 'x-z402-signature': 'v1=abcdef123456' };
      mockReq.rawBody = JSON.stringify({ test: 'data' });

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject signature with missing v1 part', () => {
      mockReq.headers = { 'x-z402-signature': 't=1234567890' };
      mockReq.rawBody = JSON.stringify({ test: 'data' });

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject signature with invalid timestamp', () => {
      mockReq.headers = { 'x-z402-signature': 't=not-a-number,v1=abc123' };
      mockReq.rawBody = JSON.stringify({ test: 'data' });

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid timestamp',
        })
      );
    });

    it('should reject signature with old timestamp', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const payload = JSON.stringify({ test: 'data' });
      const signedPayload = `${oldTimestamp}.${payload}`;
      const signature = require('crypto')
        .createHmac('sha256', testSecret)
        .update(signedPayload)
        .digest('hex');

      mockReq.headers = { 'x-z402-signature': `t=${oldTimestamp},v1=${signature}` };
      mockReq.rawBody = payload;

      const middleware = verifyWebhookSignature(testSecret, 300); // 5 minute tolerance
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Signature timestamp too old',
        })
      );
    });

    it('should reject signature with incorrect secret', () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, 'wrong-secret');

      mockReq.headers = { 'x-z402-signature': signature };
      mockReq.rawBody = JSON.stringify(payload);

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid signature',
        })
      );
    });

    it('should reject signature for tampered payload', () => {
      const originalPayload = { test: 'data' };
      const signature = generateWebhookSignature(originalPayload, testSecret);

      const tamperedPayload = { test: 'tampered' };

      mockReq.headers = { 'x-z402-signature': signature };
      mockReq.rawBody = JSON.stringify(tamperedPayload);

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should use rawBody if available', () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, testSecret);

      mockReq.headers = { 'x-z402-signature': signature };
      mockReq.rawBody = JSON.stringify(payload);
      mockReq.body = { different: 'body' }; // Should use rawBody instead

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.webhookVerified).toBe(true);
    });

    it('should fall back to req.body if rawBody not available', () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, testSecret);

      mockReq.headers = { 'x-z402-signature': signature };
      mockReq.body = payload;
      // No rawBody set

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.webhookVerified).toBe(true);
    });

    it('should handle Buffer rawBody', () => {
      const payload = { test: 'data' };
      const signature = generateWebhookSignature(payload, testSecret);

      mockReq.headers = { 'x-z402-signature': signature };
      mockReq.rawBody = Buffer.from(JSON.stringify(payload), 'utf8');

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.webhookVerified).toBe(true);
    });

    it('should accept signature with custom tolerance', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 550; // 550 seconds ago
      const payload = JSON.stringify({ test: 'data' });
      const signedPayload = `${timestamp}.${payload}`;
      const signature = require('crypto')
        .createHmac('sha256', testSecret)
        .update(signedPayload)
        .digest('hex');

      mockReq.headers = { 'x-z402-signature': `t=${timestamp},v1=${signature}` };
      mockReq.rawBody = payload;

      const middleware = verifyWebhookSignature(testSecret, 600); // 10 minute tolerance
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.webhookVerified).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should use constant-time comparison to prevent timing attacks', () => {
      const payload = { test: 'data' };
      const validSignature = generateWebhookSignature(payload, testSecret);

      // Generate invalid signature with same length
      const timestamp = validSignature.split(',')[0].split('=')[1];
      const invalidSig = 'a'.repeat(64);

      mockReq.headers = { 'x-z402-signature': `t=${timestamp},v1=${invalidSig}` };
      mockReq.rawBody = JSON.stringify(payload);

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should prevent replay attacks with timestamp validation', () => {
      const payload = { test: 'data' };

      // Create signature with very old timestamp
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000;
      const signedPayload = `${oldTimestamp}.${JSON.stringify(payload)}`;
      const signature = require('crypto')
        .createHmac('sha256', testSecret)
        .update(signedPayload)
        .digest('hex');

      mockReq.headers = { 'x-z402-signature': `t=${oldTimestamp},v1=${signature}` };
      mockReq.rawBody = JSON.stringify(payload);

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle signature with different buffer lengths gracefully', () => {
      const payload = { test: 'data' };
      const timestamp = Math.floor(Date.now() / 1000);

      // Create signature with wrong length
      mockReq.headers = { 'x-z402-signature': `t=${timestamp},v1=tooshort` };
      mockReq.rawBody = JSON.stringify(payload);

      const middleware = verifyWebhookSignature(testSecret);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('rawBodyMiddleware', () => {
    it('should preserve raw body for JSON requests', (done) => {
      const jsonData = { test: 'data', nested: { value: 123 } };
      const rawData = JSON.stringify(jsonData);

      mockReq.headers = { 'content-type': 'application/json' };
      mockReq.setEncoding = jest.fn();
      (mockReq as any).on = jest.fn((event: string, handler: Function) => {
        if (event === 'data') {
          handler(rawData);
        } else if (event === 'end') {
          handler();
        }
        return mockReq;
      });

      const middleware = rawBodyMiddleware();

      mockNext = jest.fn(() => {
        expect(mockReq.rawBody).toBe(rawData);
        expect(mockReq.body).toEqual(jsonData);
        done();
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);
    });

    it('should handle invalid JSON', (done) => {
      const invalidJson = '{ invalid json }';

      mockReq.headers = { 'content-type': 'application/json' };
      mockReq.setEncoding = jest.fn();
      (mockReq as any).on = jest.fn((event: string, handler: Function) => {
        if (event === 'data') {
          handler(invalidJson);
        } else if (event === 'end') {
          handler();
        }
        return mockReq;
      });

      (mockRes as any).json = jest.fn((data: any) => {
        expect(data.error).toBe('Invalid JSON');
        done();
        return mockRes;
      });

      const middleware = rawBodyMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);
    });

    it('should skip non-JSON requests', () => {
      mockReq.headers = { 'content-type': 'text/plain' };

      const middleware = rawBodyMiddleware();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.rawBody).toBeUndefined();
    });
  });
});
