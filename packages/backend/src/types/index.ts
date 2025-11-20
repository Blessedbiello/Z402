export interface PaymentIntent {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface Merchant {
  id: string;
  email: string;
  name: string;
  zcashAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  merchantId: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface Webhook {
  id: string;
  merchantId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum WebhookEvent {
  PAYMENT_CREATED = 'payment.created',
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
}

export interface ZcashTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  timestamp: Date;
  from: string;
  to: string;
}
