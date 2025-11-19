/**
 * Express middleware for Z402 payment protection
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { z402Middleware } from '@z402/sdk/express';
 *
 * const app = express();
 *
 * app.use('/api/premium', z402Middleware({
 *   amount: '0.01',
 *   resource: '/api/premium/data'
 * }));
 *
 * app.get('/api/premium/data', (req, res) => {
 *   res.json({ data: 'Premium content' });
 * });
 * ```
 */

import type { Request, Response, NextFunction } from 'express';

export interface Z402MiddlewareOptions {
  /** Amount required in ZEC */
  amount: string;
  /** Resource identifier */
  resource: string;
  /** Optional API key (if not using Z402-Payment-Intent header) */
  apiKey?: string;
  /** Base URL for Z402 API */
  baseUrl?: string;
  /** Custom error handler */
  onError?: (error: Error, req: Request, res: Response) => void;
}

/**
 * Express middleware to protect routes with Z402 payment
 */
export function z402Middleware(options: Z402MiddlewareOptions) {
  const {
    amount,
    resource,
    apiKey,
    baseUrl = process.env.Z402_API_URL || 'https://api.z402.io/v1',
    onError,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for payment intent ID in header
      const paymentIntentId = req.headers['z402-payment-intent'] as string;

      if (!paymentIntentId) {
        // No payment intent - return 402 with payment required info
        return res.status(402).json({
          error: {
            code: 'payment_required',
            message: 'Payment required to access this resource',
          },
          payment: {
            amount,
            currency: 'ZEC',
            resource,
          },
        });
      }

      // Verify payment intent
      const verifyUrl = `${baseUrl}/payment-intents/${paymentIntentId}/verify`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(verifyUrl, { headers });

      if (!response.ok) {
        throw new Error(`Payment verification failed: ${response.statusText}`);
      }

      const paymentIntent = await response.json();

      // Check if payment is settled
      if (paymentIntent.status !== 'settled') {
        return res.status(402).json({
          error: {
            code: 'payment_not_settled',
            message: 'Payment has not been settled yet',
          },
          payment: {
            status: paymentIntent.status,
            amount: paymentIntent.amount,
          },
        });
      }

      // Check if amount matches
      if (parseFloat(paymentIntent.amount) < parseFloat(amount)) {
        return res.status(402).json({
          error: {
            code: 'insufficient_payment',
            message: 'Payment amount is insufficient',
          },
          payment: {
            required: amount,
            paid: paymentIntent.amount,
          },
        });
      }

      // Check if resource matches
      if (paymentIntent.resource !== resource) {
        return res.status(403).json({
          error: {
            code: 'resource_mismatch',
            message: 'Payment is for a different resource',
          },
        });
      }

      // Payment verified - attach to request and continue
      (req as any).z402Payment = paymentIntent;
      next();
    } catch (error) {
      if (onError) {
        return onError(error as Error, req, res);
      }

      console.error('[Z402 Middleware] Error:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to verify payment',
        },
      });
    }
  };
}

/**
 * Type augmentation for Express Request
 */
declare global {
  namespace Express {
    interface Request {
      z402Payment?: any;
    }
  }
}
