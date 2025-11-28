/**
 * Standard X-402 Payment Required Middleware
 *
 * This middleware implements the standard X-402 protocol for protecting
 * resources behind a payment requirement. It follows the Coinbase X-402
 * specification for maximum interoperability.
 *
 * Usage:
 * ```typescript
 * router.get('/premium-data',
 *   requireX402Payment({
 *     facilitatorUrl: 'https://z402.io/api/v1/x402',
 *     payTo: 't1merchantAddress123',
 *     amount: '100000000', // 1 ZEC in zatoshis
 *     resource: 'https://api.example.com/premium-data',
 *     description: 'Premium API access',
 *   }),
 *   (req, res) => {
 *     res.json({ premium: 'data' });
 *   }
 * );
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import {
  X402PaymentRequired,
  X402PaymentRequirements,
  PaymentScheme,
  BlockchainNetwork,
} from '../types/x402.types';
import { createPaymentResponse } from '../utils/x402.utils';

export interface X402MiddlewareOptions {
  /** Facilitator API base URL (e.g., 'https://z402.io/api/v1/x402') */
  facilitatorUrl: string;

  /** Merchant's Zcash address (recipient) */
  payTo: string;

  /** Payment amount in zatoshis (string) */
  amount: string;

  /** Resource URL being protected */
  resource: string;

  /** Human-readable description */
  description: string;

  /** Payment scheme (default: 'zcash-transparent') */
  scheme?: PaymentScheme;

  /** Blockchain network (default: from env or 'testnet') */
  network?: BlockchainNetwork;

  /** Minimum confirmations required (default: 6) */
  minConfirmations?: number;

  /** Response content type (default: 'application/json') */
  mimeType?: string;

  /** Maximum timeout in seconds (default: 3600 = 1 hour) */
  maxTimeoutSeconds?: number;

  /** Extra metadata for payment requirements */
  extra?: object;
}

export interface X402Request extends Request {
  /** Payment information attached after successful verification */
  payment?: {
    txHash: string;
    network: string;
    confirmations: number;
    amount: string;
  };
}

/**
 * Middleware to require X-402 payment for resource access
 *
 * This middleware:
 * 1. Checks for X-PAYMENT header
 * 2. If missing, returns 402 Payment Required with payment requirements
 * 3. If present, verifies payment with facilitator
 * 4. If verification succeeds, settles payment
 * 5. If settlement succeeds, allows access and adds X-PAYMENT-RESPONSE header
 * 6. Attaches payment info to req.payment for downstream handlers
 *
 * @param options Middleware configuration options
 * @returns Express middleware function
 */
export function requireX402Payment(options: X402MiddlewareOptions) {
  return async (req: X402Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const xPaymentHeader = req.headers['x-payment'] as string;

      // Step 1: Check if payment header is present
      if (!xPaymentHeader) {
        // Return 402 Payment Required with payment requirements
        const paymentRequirements: X402PaymentRequirements = {
          scheme: options.scheme || 'zcash-transparent',
          network: options.network || (process.env.ZCASH_NETWORK as BlockchainNetwork) || 'testnet',
          maxAmountRequired: options.amount,
          resource: options.resource,
          description: options.description,
          mimeType: options.mimeType || 'application/json',
          outputSchema: null,
          payTo: options.payTo,
          maxTimeoutSeconds: options.maxTimeoutSeconds || 3600,
          asset: 'ZEC',
          extra: options.extra || null,
        };

        const response: X402PaymentRequired = {
          x402Version: 1,
          accepts: [paymentRequirements],
          error: 'Payment required to access this resource',
        };

        logger.info('402 Payment Required returned', {
          resource: options.resource,
          amount: options.amount,
          ip: req.ip,
        });

        res.status(402).json(response);
        return;
      }

      // Step 2: Verify payment with facilitator
      const paymentRequirements: X402PaymentRequirements = {
        scheme: options.scheme || 'zcash-transparent',
        network: options.network || (process.env.ZCASH_NETWORK as BlockchainNetwork) || 'testnet',
        maxAmountRequired: options.amount,
        resource: options.resource,
        description: options.description,
        mimeType: options.mimeType || 'application/json',
        outputSchema: null,
        payTo: options.payTo,
        maxTimeoutSeconds: options.maxTimeoutSeconds || 3600,
        asset: 'ZEC',
        extra: options.extra || null,
      };

      const verifyResponse = await fetch(`${options.facilitatorUrl}/verify-standard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x402Version: 1,
          paymentHeader: xPaymentHeader,
          paymentRequirements,
        }),
      });

      if (!verifyResponse.ok) {
        logger.warn('Facilitator verify request failed', {
          status: verifyResponse.status,
          resource: options.resource,
        });

        res.status(402).json({
          error: 'Payment verification failed',
          reason: 'Unable to contact payment facilitator',
        });
        return;
      }

      const verifyResult = (await verifyResponse.json()) as {
        isValid: boolean;
        invalidReason: string | null;
      };

      if (!verifyResult.isValid) {
        logger.warn('Payment verification failed', {
          reason: verifyResult.invalidReason,
          resource: options.resource,
        });

        res.status(402).json({
          error: 'Payment verification failed',
          reason: verifyResult.invalidReason,
        });
        return;
      }

      // Step 3: Settle payment with facilitator
      const settleResponse = await fetch(`${options.facilitatorUrl}/settle-standard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x402Version: 1,
          paymentHeader: xPaymentHeader,
          paymentRequirements,
        }),
      });

      if (!settleResponse.ok) {
        logger.warn('Facilitator settle request failed', {
          status: settleResponse.status,
          resource: options.resource,
        });

        res.status(402).json({
          error: 'Payment settlement failed',
          reason: 'Unable to contact payment facilitator',
        });
        return;
      }

      const settleResult = (await settleResponse.json()) as {
        success: boolean;
        error: string | null;
        txHash: string | null;
        networkId: string | null;
      };

      if (!settleResult.success) {
        logger.warn('Payment settlement failed', {
          error: settleResult.error,
          resource: options.resource,
        });

        res.status(402).json({
          error: 'Payment settlement failed',
          reason: settleResult.error,
        });
        return;
      }

      // Step 4: Payment successful
      // Attach payment info to request
      req.payment = {
        txHash: settleResult.txHash || 'unknown',
        network: settleResult.networkId || 'unknown',
        confirmations: 6, // Minimum required for settlement
        amount: options.amount,
      };

      // Add X-PAYMENT-RESPONSE header
      const paymentResponse = createPaymentResponse({
        success: true,
        txHash: settleResult.txHash || 'unknown',
        confirmations: 6,
        settledAt: new Date(),
      });

      res.setHeader('X-PAYMENT-RESPONSE', paymentResponse);

      logger.info('X-402 payment accepted', {
        txHash: settleResult.txHash,
        resource: options.resource,
        amount: options.amount,
      });

      // Payment verified and settled - allow access
      next();
    } catch (error) {
      logger.error('X-402 middleware error:', error);

      res.status(500).json({
        error: 'Payment processing error',
        message: 'An error occurred while processing your payment',
      });
    }
  };
}

/**
 * Helper to create X-402 payment requirements object
 * Useful for generating payment requirements outside of middleware
 *
 * @param options Payment requirement options
 * @returns X402PaymentRequirements object
 */
export function createX402PaymentRequirements(
  options: Omit<X402MiddlewareOptions, 'facilitatorUrl'>
): X402PaymentRequirements {
  return {
    scheme: options.scheme || 'zcash-transparent',
    network: options.network || (process.env.ZCASH_NETWORK as BlockchainNetwork) || 'testnet',
    maxAmountRequired: options.amount,
    resource: options.resource,
    description: options.description,
    mimeType: options.mimeType || 'application/json',
    outputSchema: null,
    payTo: options.payTo,
    maxTimeoutSeconds: options.maxTimeoutSeconds || 3600,
    asset: 'ZEC',
    extra: options.extra || null,
  };
}

/**
 * Extract payment info from request
 * Returns payment details if payment was verified, null otherwise
 *
 * @param req Express request object
 * @returns Payment info or null
 */
export function getPaymentInfo(req: X402Request): X402Request['payment'] | null {
  return req.payment || null;
}
