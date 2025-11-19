/**
 * Payments resource
 */

import type { HttpClient } from '../utils/http';
import type {
  PaymentIntent,
  CreatePaymentIntentParams,
  PaymentParams,
} from '../types/index';

export class Payments {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a payment intent
   * @param params Payment intent parameters
   * @returns Created payment intent
   * @example
   * ```typescript
   * const intent = await z402.payments.create({
   *   amount: '0.01',
   *   resource: '/api/premium/data',
   *   metadata: { userId: '123' }
   * });
   * ```
   */
  async create(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    return this.http.post<PaymentIntent>('/payment-intents', params);
  }

  /**
   * Get a payment intent by ID
   * @param id Payment intent ID
   * @returns Payment intent
   * @example
   * ```typescript
   * const intent = await z402.payments.get('pi_...');
   * ```
   */
  async get(id: string): Promise<PaymentIntent> {
    return this.http.get<PaymentIntent>(`/payment-intents/${id}`);
  }

  /**
   * Submit payment for a payment intent
   * @param id Payment intent ID
   * @param params Payment parameters
   * @returns Updated payment intent
   * @example
   * ```typescript
   * const payment = await z402.payments.pay('pi_...', {
   *   fromAddress: 'zs1...',
   *   txId: '...'
   * });
   * ```
   */
  async pay(id: string, params: PaymentParams): Promise<PaymentIntent> {
    return this.http.post<PaymentIntent>(`/payment-intents/${id}/pay`, params);
  }

  /**
   * Verify a payment
   * @param id Payment intent ID
   * @returns Verified payment intent with settlement status
   * @example
   * ```typescript
   * const verified = await z402.payments.verify('pi_...');
   * if (verified.status === 'settled') {
   *   // Grant access to resource
   * }
   * ```
   */
  async verify(id: string): Promise<PaymentIntent> {
    return this.http.get<PaymentIntent>(`/payment-intents/${id}/verify`);
  }

  /**
   * Cancel a payment intent
   * @param id Payment intent ID
   * @returns Cancelled payment intent
   * @example
   * ```typescript
   * await z402.payments.cancel('pi_...');
   * ```
   */
  async cancel(id: string): Promise<PaymentIntent> {
    return this.http.post<PaymentIntent>(`/payment-intents/${id}/cancel`);
  }
}
