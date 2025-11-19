/**
 * Z402 SDK Client
 *
 * @example
 * ```typescript
 * import { Z402 } from '@z402/sdk';
 *
 * const z402 = new Z402({
 *   apiKey: 'z402_test_...',
 *   network: 'testnet'
 * });
 *
 * // Create payment intent
 * const intent = await z402.payments.create({
 *   amount: '0.01',
 *   resource: '/api/premium/data'
 * });
 * ```
 */

import { HttpClient } from './utils/http';
import { Payments } from './resources/payments';
import { Transactions } from './resources/transactions';
import { Webhooks } from './resources/webhooks';
import type { Z402Config } from './types/index';

export class Z402 {
  private readonly http: HttpClient;

  /** Payments API */
  public readonly payments: Payments;

  /** Transactions API */
  public readonly transactions: Transactions;

  /** Webhooks API */
  public readonly webhooks: Webhooks;

  /**
   * Create a new Z402 client
   * @param config Configuration options
   */
  constructor(config: Z402Config) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    if (!config.apiKey.startsWith('z402_')) {
      throw new Error('Invalid API key format. API keys should start with "z402_"');
    }

    this.http = new HttpClient(config);

    // Initialize resource APIs
    this.payments = new Payments(this.http);
    this.transactions = new Transactions(this.http);
    this.webhooks = new Webhooks(this.http);
  }
}

// Export for backward compatibility
export { Z402 as Z402Client };
