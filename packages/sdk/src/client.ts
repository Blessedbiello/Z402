import { PaymentsAPI } from './resources/payments';
import { MerchantsAPI } from './resources/merchants';
import { WebhooksAPI } from './resources/webhooks';
import { Z402Error } from './errors';
import type { Z402Config, RequestOptions } from './types';

export class Z402Client {
  private apiKey: string;
  private baseUrl: string;
  private apiVersion: string;

  public payments: PaymentsAPI;
  public merchants: MerchantsAPI;
  public webhooks: WebhooksAPI;

  constructor(config: Z402Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.z402.com';
    this.apiVersion = config.apiVersion || 'v1';

    // Initialize resource APIs
    this.payments = new PaymentsAPI(this);
    this.merchants = new MerchantsAPI(this);
    this.webhooks = new WebhooksAPI(this);
  }

  async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${this.apiVersion}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Z402Error(
          error.message || 'Request failed',
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Z402Error) {
        throw error;
      }
      throw new Z402Error(
        error instanceof Error ? error.message : 'Unknown error',
        500
      );
    }
  }
}
