import { Request, Response, NextFunction } from 'express';
import { X402Protocol, X402PaymentRequest } from '../core/x402-protocol';
import { VerificationService } from '../services/verify.service';
import { logger } from '../config/logger';
import { apikeyQueries } from '../db/queries';

/**
 * X402 Payment Middleware
 * Express middleware for protecting routes with x402 payment requirements
 */

export interface X402MiddlewareOptions {
  amount: number | ((req: Request) => number);
  merchantId?: string;
  resourceUrl?: string | ((req: Request) => string);
  metadata?: Record<string, unknown> | ((req: Request) => Record<string, unknown>);
  skipAuth?: boolean;
  onPaymentVerified?: (req: Request, res: Response) => void;
}

/**
 * Create X402 payment middleware
 */
export function requirePayment(options: X402MiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('X402 ')) {
        // No authorization provided, send payment challenge
        await sendPaymentChallenge(req, res, options);
        return;
      }

      // Parse authorization
      const authorization = X402Protocol.parseAuthorizationHeader(authHeader);

      if (!authorization) {
        res.status(400).json({
          error: 'Invalid authorization header',
        });
        return;
      }

      // Verify payment
      const verification = await VerificationService.verifyPayment({
        authorization,
      });

      if (!verification.success) {
        res.status(402).json({
          error: verification.error || 'Payment verification failed',
        });
        return;
      }

      // Payment verified, attach to request
      (req as any).payment = {
        paymentId: verification.paymentId,
        transactionId: verification.transactionId,
        status: verification.status,
      };

      // Call callback if provided
      if (options.onPaymentVerified) {
        options.onPaymentVerified(req, res);
      }

      // Continue to protected resource
      next();
    } catch (error) {
      logger.error('X402 middleware error', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Send payment challenge (402 response)
 */
async function sendPaymentChallenge(
  req: Request,
  res: Response,
  options: X402MiddlewareOptions
) {
  try {
    // Get merchant ID (from options or API key)
    let merchantId = options.merchantId;

    if (!merchantId && !options.skipAuth) {
      // Extract from API key
      const apiKey = extractApiKey(req);
      if (!apiKey) {
        res.status(401).json({
          error: 'API key required',
        });
        return;
      }

      const keyData = await apikeyQueries.findByKey(apiKey);
      if (!keyData) {
        res.status(401).json({
          error: 'Invalid API key',
        });
        return;
      }

      merchantId = keyData.merchantId;
    }

    if (!merchantId) {
      res.status(500).json({
        error: 'Merchant ID not configured',
      });
      return;
    }

    // Calculate amount
    const amount =
      typeof options.amount === 'function'
        ? options.amount(req)
        : options.amount;

    // Get resource URL
    const resourceUrl =
      typeof options.resourceUrl === 'function'
        ? options.resourceUrl(req)
        : options.resourceUrl || `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Get metadata
    const metadata =
      typeof options.metadata === 'function'
        ? options.metadata(req)
        : options.metadata;

    // Generate payment challenge
    const challenge = await X402Protocol.generateChallenge({
      merchantId,
      resourceUrl,
      amount,
      metadata,
    });

    // Format 402 response
    const headers = X402Protocol.format402Headers(challenge);

    res.status(402)
      .set(headers)
      .json({
        error: 'Payment Required',
        paymentRequired: true,
        amount: challenge.amount,
        currency: challenge.currency,
        paymentId: challenge.paymentId,
        merchantAddress: challenge.merchantAddress,
        resourceUrl: challenge.resourceUrl,
        expiresAt: challenge.expiresAt,
        instructions: {
          message: 'Send payment to the provided address and include the authorization header in your next request',
          authorizationFormat: 'X402 paymentId="...", clientAddress="...", txid="...", signature="...", timestamp="..."',
        },
      });

    logger.info('Payment challenge sent', {
      paymentId: challenge.paymentId,
      amount: challenge.amount,
      resourceUrl: challenge.resourceUrl,
    });
  } catch (error) {
    logger.error('Failed to send payment challenge', error);
    res.status(500).json({
      error: 'Failed to generate payment challenge',
    });
  }
}

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | null {
  // Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter
  const queryApiKey = req.query.apiKey || req.query.api_key;
  if (queryApiKey && typeof queryApiKey === 'string') {
    return queryApiKey;
  }

  return null;
}

/**
 * Middleware to verify payment status
 */
export function verifyPaymentStatus(req: Request, res: Response, next: NextFunction) {
  const payment = (req as any).payment;

  if (!payment) {
    res.status(402).json({
      error: 'Payment required',
    });
    return;
  }

  if (payment.status === 'SETTLED') {
    next();
  } else if (payment.status === 'VERIFIED') {
    res.status(202).json({
      message: 'Payment verified but not yet settled',
      payment,
    });
  } else {
    res.status(402).json({
      error: 'Payment not verified',
      payment,
    });
  }
}

/**
 * Rate limiting based on payment
 */
export function paymentRateLimit(options: {
  maxRequests: number;
  windowMs: number;
}) {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const payment = (req as any).payment;

    if (!payment) {
      next();
      return;
    }

    const key = payment.paymentId;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Get request timestamps for this payment
    let timestamps = requests.get(key) || [];

    // Filter out old timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if rate limit exceeded
    if (timestamps.length >= options.maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded for this payment',
        retryAfter: Math.ceil((timestamps[0] + options.windowMs - now) / 1000),
      });
      return;
    }

    // Add current timestamp
    timestamps.push(now);
    requests.set(key, timestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of requests.entries()) {
        if (v.every((ts) => ts < windowStart)) {
          requests.delete(k);
        }
      }
    }

    next();
  };
}

/**
 * Require minimum confirmations
 */
export function requireConfirmations(minConfirmations: number = 6) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const payment = (req as any).payment;

    if (!payment || !payment.transactionId) {
      res.status(402).json({
        error: 'Payment required',
      });
      return;
    }

    const status = await VerificationService.getVerificationStatus(
      payment.paymentId
    );

    if (status.confirmations < minConfirmations) {
      res.status(202).json({
        message: `Waiting for confirmations (${status.confirmations}/${minConfirmations})`,
        payment: {
          ...payment,
          confirmations: status.confirmations,
          required: minConfirmations,
        },
      });
      return;
    }

    next();
  };
}
