/**
 * Next.js middleware and helpers for Z402
 *
 * @example App Router API Route
 * ```typescript
 * // app/api/premium/route.ts
 * import { withZ402 } from '@z402/sdk/nextjs';
 *
 * export const GET = withZ402(
 *   async (request, { payment }) => {
 *     return Response.json({ data: 'Premium content', payment });
 *   },
 *   { amount: '0.01', resource: '/api/premium' }
 * );
 * ```
 *
 * @example Pages Router API Route
 * ```typescript
 * // pages/api/premium.ts
 * import { z402Handler } from '@z402/sdk/nextjs';
 *
 * export default z402Handler(
 *   async (req, res, { payment }) => {
 *     res.json({ data: 'Premium content', payment });
 *   },
 *   { amount: '0.01', resource: '/api/premium' }
 * );
 * ```
 */

import type { NextRequest } from 'next/server';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface Z402Options {
  /** Amount required in ZEC */
  amount: string;
  /** Resource identifier */
  resource: string;
  /** Optional API key */
  apiKey?: string;
  /** Base URL for Z402 API */
  baseUrl?: string;
}

export interface Z402Context {
  payment: any;
}

/**
 * Higher-order function for Next.js App Router API routes
 */
export function withZ402<T = any>(
  handler: (request: NextRequest, context: Z402Context) => Promise<Response>,
  options: Z402Options
) {
  return async (request: NextRequest): Promise<Response> => {
    const { amount, resource, apiKey, baseUrl = process.env.Z402_API_URL || 'https://api.z402.io/v1' } = options;

    try {
      // Check for payment intent ID in header
      const paymentIntentId = request.headers.get('z402-payment-intent');

      if (!paymentIntentId) {
        // No payment intent - return 402
        return Response.json(
          {
            error: {
              code: 'payment_required',
              message: 'Payment required to access this resource',
            },
            payment: {
              amount,
              currency: 'ZEC',
              resource,
            },
          },
          { status: 402 }
        );
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
        return Response.json(
          {
            error: {
              code: 'payment_not_settled',
              message: 'Payment has not been settled yet',
            },
            payment: {
              status: paymentIntent.status,
              amount: paymentIntent.amount,
            },
          },
          { status: 402 }
        );
      }

      // Check if amount matches
      if (parseFloat(paymentIntent.amount) < parseFloat(amount)) {
        return Response.json(
          {
            error: {
              code: 'insufficient_payment',
              message: 'Payment amount is insufficient',
            },
            payment: {
              required: amount,
              paid: paymentIntent.amount,
            },
          },
          { status: 402 }
        );
      }

      // Check if resource matches
      if (paymentIntent.resource !== resource) {
        return Response.json(
          {
            error: {
              code: 'resource_mismatch',
              message: 'Payment is for a different resource',
            },
          },
          { status: 403 }
        );
      }

      // Payment verified - call handler
      return handler(request, { payment: paymentIntent });
    } catch (error) {
      console.error('[Z402] Error:', error);
      return Response.json(
        {
          error: {
            code: 'internal_error',
            message: 'Failed to verify payment',
          },
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function for Next.js Pages Router API routes
 */
export function z402Handler<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse, context: Z402Context) => Promise<void> | void,
  options: Z402Options
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const { amount, resource, apiKey, baseUrl = process.env.Z402_API_URL || 'https://api.z402.io/v1' } = options;

    try {
      // Check for payment intent ID in header
      const paymentIntentId = req.headers['z402-payment-intent'] as string;

      if (!paymentIntentId) {
        // No payment intent - return 402
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

      // Payment verified - call handler
      await handler(req, res, { payment: paymentIntent });
    } catch (error) {
      console.error('[Z402] Error:', error);
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
 * Client-side hook for Next.js (use in components)
 */
export function useZ402Payment(paymentIntentId: string) {
  // This would typically use React hooks, but keeping it simple
  return {
    paymentIntentId,
    // Add to request headers
    headers: {
      'z402-payment-intent': paymentIntentId,
    },
  };
}
