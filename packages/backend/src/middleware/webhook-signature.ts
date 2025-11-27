/**
 * Webhook Signature Verification Middleware
 *
 * Verifies incoming webhook signatures to ensure authenticity.
 * Implements the same signature scheme as Stripe for consistency.
 *
 * Signature Format: t=timestamp,v1=signature
 * - timestamp: Unix timestamp when signature was created
 * - signature: HMAC-SHA256 of "timestamp.payload"
 *
 * Security Features:
 * - Timestamp validation (prevents replay attacks)
 * - Constant-time comparison (prevents timing attacks)
 * - Raw body preservation (prevents tampering)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

export interface WebhookRequest extends Request {
  rawBody?: Buffer | string;
  webhookVerified?: boolean;
}

/**
 * Middleware to verify webhook signatures
 */
export function verifyWebhookSignature(secret: string, toleranceSeconds: number = 300) {
  return async (req: WebhookRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-z402-signature'] as string;

      if (!signature) {
        logger.warn('Webhook received without signature', {
          path: req.path,
          ip: req.ip,
        });
        res.status(401).json({
          error: 'Missing webhook signature',
          message: 'X-Z402-Signature header is required',
        });
        return;
      }

      // Get raw body (must be preserved by raw body middleware)
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

      // Parse signature (format: t=timestamp,v1=signature)
      const parts = signature.split(',');
      const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
      const providedSignature = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

      if (!timestamp || !providedSignature) {
        logger.warn('Invalid webhook signature format', {
          path: req.path,
          signature,
        });
        res.status(401).json({
          error: 'Invalid signature format',
          message: 'Signature must be in format: t=timestamp,v1=signature',
        });
        return;
      }

      // Validate timestamp (prevent replay attacks)
      const timestampMs = parseInt(timestamp, 10) * 1000;
      const now = Date.now();
      const tolerance = toleranceSeconds * 1000;

      if (isNaN(timestampMs)) {
        res.status(401).json({
          error: 'Invalid timestamp',
          message: 'Signature timestamp must be a valid Unix timestamp',
        });
        return;
      }

      if (Math.abs(now - timestampMs) > tolerance) {
        logger.warn('Webhook signature timestamp too old', {
          path: req.path,
          timestamp,
          age: Math.abs(now - timestampMs) / 1000,
          tolerance: toleranceSeconds,
        });
        res.status(401).json({
          error: 'Signature timestamp too old',
          message: `Timestamp must be within ${toleranceSeconds} seconds of current time`,
        });
        return;
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Compare signatures (constant time to prevent timing attacks)
      let signaturesMatch = false;
      try {
        signaturesMatch = crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(providedSignature)
        );
      } catch (error) {
        // timingSafeEqual throws if buffer lengths don't match
        signaturesMatch = false;
      }

      if (!signaturesMatch) {
        logger.warn('Webhook signature verification failed', {
          path: req.path,
          providedLength: providedSignature.length,
          expectedLength: expectedSignature.length,
        });
        res.status(401).json({
          error: 'Invalid signature',
          message: 'Webhook signature verification failed',
        });
        return;
      }

      // Signature verified successfully
      req.webhookVerified = true;
      logger.debug('Webhook signature verified successfully', {
        path: req.path,
        timestamp,
      });

      next();
    } catch (error) {
      logger.error('Webhook signature verification error:', error);
      res.status(500).json({
        error: 'Signature verification error',
        message: 'An error occurred while verifying the webhook signature',
      });
    }
  };
}

/**
 * Generate webhook signature for outgoing webhooks
 * Uses the same format as verification for consistency
 */
export function generateWebhookSignature(
  payload: string | Record<string, unknown>,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Middleware to preserve raw request body for signature verification
 * Must be used BEFORE json() middleware
 */
export function rawBodyMiddleware() {
  return (req: WebhookRequest, res: Response, next: NextFunction) => {
    if (req.headers['content-type'] === 'application/json') {
      let data = '';
      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        data += chunk;
      });

      req.on('end', () => {
        req.rawBody = data;
        try {
          req.body = JSON.parse(data);
          next();
        } catch (error) {
          res.status(400).json({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON',
          });
        }
      });
    } else {
      next();
    }
  };
}

/**
 * Express middleware to verify webhook signature for specific merchant
 * Looks up merchant's webhook secret from database
 */
export function verifyMerchantWebhook() {
  return async (req: WebhookRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract merchant ID from request (could be in params, body, or headers)
      const merchantId = req.params.merchantId || req.body?.merchantId || req.headers['x-merchant-id'];

      if (!merchantId) {
        res.status(400).json({
          error: 'Missing merchant ID',
          message: 'Merchant ID is required for webhook verification',
        });
        return;
      }

      // Get merchant's webhook secret from database
      const prisma = (await import('../db')).default;
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId as string },
        select: { webhookSecret: true },
      });

      if (!merchant?.webhookSecret) {
        logger.warn('Merchant has no webhook secret configured', {
          merchantId,
          path: req.path,
        });
        res.status(401).json({
          error: 'Webhook secret not configured',
          message: 'Please configure your webhook secret in the dashboard',
        });
        return;
      }

      // Verify signature using merchant's secret
      await verifyWebhookSignature(merchant.webhookSecret)(req, res, next);
    } catch (error) {
      logger.error('Error verifying merchant webhook:', error);
      res.status(500).json({
        error: 'Webhook verification error',
        message: 'An error occurred while verifying the webhook',
      });
    }
  };
}
