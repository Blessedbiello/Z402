import type { Z402Client } from '../client';
import type {
  PaymentIntent,
  CreatePaymentIntentParams,
  ListPaymentsParams,
} from '../types';

export class PaymentsAPI {
  constructor(private client: Z402Client) {}

  async create(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>('POST', '/payments/intents', {
      body: params,
    });
  }

  async retrieve(paymentId: string): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>(
      'GET',
      `/payments/${paymentId}`
    );
  }

  async list(params?: ListPaymentsParams): Promise<PaymentIntent[]> {
    return this.client.request<PaymentIntent[]>('GET', '/payments', {
      params: params as Record<string, string>,
    });
  }

  async confirm(paymentId: string): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>(
      'POST',
      `/payments/${paymentId}/confirm`
    );
  }

  async refund(paymentId: string): Promise<PaymentIntent> {
    return this.client.request<PaymentIntent>(
      'POST',
      `/payments/${paymentId}/refund`
    );
  }
}
