import axios, { AxiosInstance } from 'axios';
import { getConfig, getApiKey } from './config';
import { ApiKey, Transaction, Analytics } from '../types/index';

class Z402API {
  private client: AxiosInstance;

  constructor() {
    const config = getConfig();
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.z402.io',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const apiKey = getApiKey();
      if (apiKey) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      return config;
    });
  }

  // Authentication
  async login(email: string, password: string): Promise<{ token: string; merchantId: string }> {
    const response = await this.client.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(data: { email: string; password: string; name: string }): Promise<any> {
    const response = await this.client.post('/api/v1/merchants/register', data);
    return response.data;
  }

  // API Keys
  async listApiKeys(): Promise<ApiKey[]> {
    const response = await this.client.get('/api/v1/merchants/api-keys');
    return response.data;
  }

  async createApiKey(name: string): Promise<{ apiKey: string; id: string }> {
    const response = await this.client.post('/api/v1/merchants/api-keys', { name });
    return response.data;
  }

  async revokeApiKey(keyId: string): Promise<void> {
    await this.client.delete(`/api/v1/merchants/api-keys/${keyId}`);
  }

  // Transactions
  async listTransactions(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const response = await this.client.get('/api/v1/payments', { params });
    return response.data;
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await this.client.get(`/api/v1/payments/${id}`);
    return response.data;
  }

  // Analytics
  async getAnalytics(params?: { startDate?: string; endDate?: string }): Promise<Analytics> {
    const response = await this.client.get('/api/v1/analytics/summary', { params });
    return response.data;
  }

  // Webhooks
  async getWebhookConfig(): Promise<any> {
    const response = await this.client.get('/api/v1/webhooks');
    return response.data;
  }

  async updateWebhookConfig(config: {
    url?: string;
    secret?: string;
    enabled?: boolean;
  }): Promise<any> {
    const response = await this.client.post('/api/v1/webhooks', config);
    return response.data;
  }

  async listWebhookDeliveries(params?: {
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await this.client.get('/api/v1/webhook-management/logs', { params });
    return response.data;
  }

  // Profile
  async getProfile(): Promise<any> {
    const response = await this.client.get('/api/v1/merchants/profile');
    return response.data;
  }
}

export const api = new Z402API();
