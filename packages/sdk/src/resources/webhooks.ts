import type { Z402Client } from '../client';
import type {
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
} from '../types';

export class WebhooksAPI {
  constructor(private client: Z402Client) {}

  async list(): Promise<Webhook[]> {
    return this.client.request<Webhook[]>('GET', '/webhooks');
  }

  async create(params: CreateWebhookParams): Promise<Webhook> {
    return this.client.request<Webhook>('POST', '/webhooks', {
      body: params,
    });
  }

  async retrieve(webhookId: string): Promise<Webhook> {
    return this.client.request<Webhook>('GET', `/webhooks/${webhookId}`);
  }

  async update(
    webhookId: string,
    params: UpdateWebhookParams
  ): Promise<Webhook> {
    return this.client.request<Webhook>('PUT', `/webhooks/${webhookId}`, {
      body: params,
    });
  }

  async delete(webhookId: string): Promise<void> {
    await this.client.request<void>('DELETE', `/webhooks/${webhookId}`);
  }
}
