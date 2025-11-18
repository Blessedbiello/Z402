import type { Z402Client } from '../client';
import type {
  Merchant,
  UpdateMerchantParams,
  ApiKey,
  CreateApiKeyParams,
} from '../types';

export class MerchantsAPI {
  constructor(private client: Z402Client) {}

  async getProfile(): Promise<Merchant> {
    return this.client.request<Merchant>('GET', '/merchants/profile');
  }

  async updateProfile(params: UpdateMerchantParams): Promise<Merchant> {
    return this.client.request<Merchant>('PUT', '/merchants/profile', {
      body: params,
    });
  }

  async listApiKeys(): Promise<ApiKey[]> {
    return this.client.request<ApiKey[]>('GET', '/merchants/api-keys');
  }

  async createApiKey(params: CreateApiKeyParams): Promise<ApiKey> {
    return this.client.request<ApiKey>('POST', '/merchants/api-keys', {
      body: params,
    });
  }

  async revokeApiKey(keyId: string): Promise<void> {
    await this.client.request<void>('DELETE', `/merchants/api-keys/${keyId}`);
  }
}
