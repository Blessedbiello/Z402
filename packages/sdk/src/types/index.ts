/**
 * Z402 SDK Type Definitions
 */

export interface Z402Config {
  /** Your Z402 API key */
  apiKey: string;
  /** Network to use: testnet or mainnet */
  network?: 'testnet' | 'mainnet';
  /** Base URL for API calls (optional, auto-detected from network) */
  baseUrl?: string;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Enable request/response logging */
  debug?: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: string;
  resource: string;
  status: 'pending' | 'paid' | 'settled' | 'failed' | 'expired';
  zcashAddress: string;
  expiresAt: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentIntentParams {
  /** Amount in ZEC */
  amount: string;
  /** Resource URL being protected */
  resource: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
  /** Optional custom expiration time in seconds (default: 3600) */
  expiresIn?: number;
}

export interface PaymentParams {
  /** Sender's Zcash address */
  fromAddress: string;
  /** Transaction ID on Zcash blockchain */
  txId: string;
}

export interface Transaction {
  id: string;
  merchantId: string;
  amount: string;
  currency: 'ZEC';
  status: 'pending' | 'settled' | 'failed' | 'refunded';
  paymentIntentId: string;
  resourceUrl: string;
  fromAddress?: string;
  toAddress: string;
  txId?: string;
  confirmations: number;
  metadata?: Record<string, any>;
  failureReason?: string;
  refundedAt?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTransactionsParams {
  /** Number of transactions to return (max 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by status */
  status?: Transaction['status'];
  /** Filter by date from (ISO 8601) */
  dateFrom?: string;
  /** Filter by date to (ISO 8601) */
  dateTo?: string;
  /** Filter by resource URL */
  resource?: string;
}

export interface ListTransactionsResponse {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

export interface RefundParams {
  /** Reason for refund */
  reason?: string;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  id: string;
  type: 'payment.pending' | 'payment.settled' | 'payment.failed' | 'payment.refunded';
  data: Transaction;
  createdAt: string;
}

export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateAPIKeyParams {
  /** Name for the API key */
  name: string;
  /** Permissions for the key */
  permissions?: string[];
}

export interface Z402Error {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
}

export interface UpdateWebhookParams {
  /** Webhook URL */
  webhookUrl: string;
  /** Events to subscribe to */
  events?: string[];
}
