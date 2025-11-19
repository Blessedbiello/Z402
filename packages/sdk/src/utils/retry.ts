/**
 * Retry logic with exponential backoff
 */

import { RateLimitError, NetworkError } from '../errors';

export interface RetryOptions {
  maxRetries: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Executes a function with exponential backoff retry logic
 * @param fn Function to execute
 * @param options Retry options
 * @returns Promise resolving to function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Handle rate limit with custom delay
      if (error instanceof RateLimitError && error.retryAfter) {
        delay = error.retryAfter * 1000;
      }

      // Wait before retrying
      await sleep(Math.min(delay, maxDelay));

      // Increase delay for next attempt
      delay *= backoffMultiplier;
    }
  }

  throw lastError!;
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry network errors
  if (error instanceof NetworkError) {
    return true;
  }

  // Retry rate limit errors
  if (error instanceof RateLimitError) {
    return true;
  }

  // Retry server errors (5xx)
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  // Retry timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
