/**
 * Webhooks resource
 */

import type { HttpClient } from '../utils/http';
import type {
  WebhookConfig,
  UpdateWebhookParams,
} from '../types/index';

export class Webhooks {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get webhook configuration
   * @returns Webhook configuration
   * @example
   * ```typescript
   * const config = await z402.webhooks.get();
   * console.log(config.url, config.secret);
   * ```
   */
  async get(): Promise<WebhookConfig> {
    return this.http.get<WebhookConfig>('/webhook-management');
  }

  /**
   * Update webhook configuration
   * @param params Webhook parameters
   * @returns Updated webhook configuration
   * @example
   * ```typescript
   * await z402.webhooks.update({
   *   webhookUrl: 'https://example.com/webhooks/z402',
   *   events: ['payment.settled', 'payment.failed']
   * });
   * ```
   */
  async update(params: UpdateWebhookParams): Promise<WebhookConfig> {
    return this.http.put<WebhookConfig>('/webhook-management', params);
  }

  /**
   * Delete webhook configuration
   * @example
   * ```typescript
   * await z402.webhooks.delete();
   * ```
   */
  async delete(): Promise<void> {
    await this.http.delete<void>('/webhook-management');
  }

  /**
   * Test webhook by sending a test event
   * @returns Test result
   * @example
   * ```typescript
   * const result = await z402.webhooks.test();
   * console.log(result.success, result.response);
   * ```
   */
  async test(): Promise<{ success: boolean; response?: any }> {
    return this.http.post<{ success: boolean; response?: any }>('/webhook-management/test');
  }
}
