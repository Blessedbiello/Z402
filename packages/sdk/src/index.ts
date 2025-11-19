/**
 * Z402 SDK - Developer-friendly TypeScript SDK for Z402 payment facilitator
 *
 * @example
 * ```typescript
 * import { Z402 } from '@z402/sdk';
 *
 * const z402 = new Z402({
 *   apiKey: 'z402_test_...',
 *   network: 'testnet'
 * });
 *
 * // Create payment intent
 * const intent = await z402.payments.create({
 *   amount: '0.01',
 *   resource: '/api/premium/data',
 *   metadata: { userId: '123' }
 * });
 *
 * // Verify payment
 * const verified = await z402.payments.verify(intent.id);
 *
 * // List transactions
 * const { transactions } = await z402.transactions.list({
 *   limit: 100,
 *   status: 'settled'
 * });
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { Z402, Z402Client } from './client';

// Resources
export { Payments } from './resources/payments';
export { Transactions } from './resources/transactions';
export { Webhooks } from './resources/webhooks';

// Utilities
export { verifyWebhook, constructWebhookSignature } from './utils/webhook';
export { HttpClient } from './utils/http';

// Middleware
export { z402Middleware } from './middleware/express';
export { withZ402, z402Handler, useZ402Payment } from './middleware/nextjs';

// Types
export type {
  Z402Config,
  PaymentIntent,
  CreatePaymentIntentParams,
  PaymentParams,
  Transaction,
  ListTransactionsParams,
  ListTransactionsResponse,
  RefundParams,
  WebhookEvent,
  WebhookConfig,
  UpdateWebhookParams,
  APIKey,
  CreateAPIKeyParams,
  Z402Error as Z402ErrorType,
} from './types/index';

// Errors
export {
  Z402Error,
  AuthenticationError,
  InvalidRequestError,
  NotFoundError,
  RateLimitError,
  APIError,
  NetworkError,
  WebhookVerificationError,
} from './errors/index';

// Default export
export { Z402 as default } from './client';
