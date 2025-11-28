import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { config } from '../config';

// Initialize Redis client for rate limiting
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (error) => {
  console.error('Redis rate limit error:', error);
});

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the window
   */
  max: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Message to send when rate limit is exceeded
   */
  message?: string;

  /**
   * Status code to send when rate limit is exceeded
   */
  statusCode?: number;

  /**
   * Key generator function to identify the client
   * Defaults to IP address
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Skip function to bypass rate limiting for certain requests
   */
  skip?: (req: Request) => boolean;

  /**
   * Handler function to execute when rate limit is exceeded
   */
  handler?: (req: Request, res: Response) => void;
}

/**
 * Create a rate limiting middleware
 */
export function createRateLimit(options: RateLimitOptions) {
  const {
    max,
    windowMs,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    keyGenerator = (req) => {
      // Try to get merchant ID from auth, otherwise use IP
      const merchantId = (req as any).user?.id;
      if (merchantId) {
        return `merchant:${merchantId}`;
      }
      // Fallback to IP address
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
    skip = () => false,
    handler,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if we should skip rate limiting for this request
      if (skip(req)) {
        return next();
      }

      // Generate key for this client
      const key = `ratelimit:${keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set to track requests
      const multi = redis.multi();

      // Remove old entries outside the window
      multi.zremrangebyscore(key, 0, windowStart);

      // Add current request
      multi.zadd(key, now, `${now}-${Math.random()}`);

      // Count requests in window
      multi.zcard(key);

      // Set expiry on the key
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();

      if (!results) {
        // Redis error, allow the request
        console.error('Rate limit Redis error');
        return next();
      }

      // Get count from ZCARD result
      const count = results[2][1] as number;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // Check if limit exceeded
      if (count > max) {
        if (handler) {
          return handler(req, res);
        }

        return res.status(statusCode).json({
          success: false,
          error: message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      // On error, allow the request to proceed
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
}

/**
 * Preset rate limiters for different endpoint types
 */

/**
 * General API rate limit
 * 100 requests per 15 minutes per merchant
 */
export const apiRateLimit = createRateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many API requests, please try again later',
});

/**
 * Authentication rate limit
 * 5 requests per 15 minutes per IP
 */
export const authRateLimit = createRateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req) => {
    // Use IP for auth endpoints to prevent brute force
    return `auth:${req.ip || req.socket.remoteAddress || 'unknown'}`;
  },
});

/**
 * Webhook rate limit
 * 10 test webhooks per hour
 */
export const webhookTestRateLimit = createRateLimit({
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many webhook tests, please try again later',
});

/**
 * API key creation rate limit
 * 10 keys per day
 */
export const apiKeyCreationRateLimit = createRateLimit({
  max: 10,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  message: 'Too many API key creation requests, please try again tomorrow',
});

/**
 * Analytics rate limit
 * 30 requests per minute (analytics can be expensive)
 */
export const analyticsRateLimit = createRateLimit({
  max: 30,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many analytics requests, please slow down',
});

/**
 * Transaction export rate limit
 * 5 exports per hour
 */
export const exportRateLimit = createRateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many export requests, please try again later',
});

/**
 * X402 verification rate limit
 * 60 verifications per minute
 */
export const x402VerificationRateLimit = createRateLimit({
  max: 60,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many payment verification requests, please slow down',
});

/**
 * Cleanup function to close Redis connection
 */
export async function closeRateLimitRedis() {
  await redis.quit();
}

export default {
  createRateLimit,
  apiRateLimit,
  authRateLimit,
  webhookTestRateLimit,
  apiKeyCreationRateLimit,
  analyticsRateLimit,
  exportRateLimit,
  x402VerificationRateLimit,
  closeRateLimitRedis,
};
