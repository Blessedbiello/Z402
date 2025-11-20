export interface Z402Config {
  apiKey: string;
  baseUrl?: string;
  apiVersion?: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface PaymentIntent {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  zcashAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface ListPaymentsParams {
  limit?: number;
  offset?: number;
  status?: PaymentStatus;
}

export interface Merchant {
  id: string;
  email: string;
  name: string;
  zcashAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMerchantParams {
  name?: string;
  email?: string;
}

export interface ApiKey {
  id: string;
  merchantId: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyParams {
  name: string;
}

export interface Webhook {
  id: string;
  merchantId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum WebhookEvent {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
}

export interface CreateWebhookParams {
  url: string;
  events: WebhookEvent[];
}

export interface UpdateWebhookParams {
  url?: string;
  events?: WebhookEvent[];
  isActive?: boolean;
}
