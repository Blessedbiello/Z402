/**
 * Transactions resource
 */

import type { HttpClient } from '../utils/http';
import type {
  Transaction,
  ListTransactionsParams,
  ListTransactionsResponse,
  RefundParams,
} from '../types/index';

export class Transactions {
  constructor(private readonly http: HttpClient) {}

  /**
   * List transactions
   * @param params Query parameters
   * @returns List of transactions
   * @example
   * ```typescript
   * const { transactions, total, hasMore } = await z402.transactions.list({
   *   limit: 100,
   *   status: 'settled',
   *   dateFrom: '2025-01-01'
   * });
   * ```
   */
  async list(params?: ListTransactionsParams): Promise<ListTransactionsResponse> {
    return this.http.get<ListTransactionsResponse>('/transactions', params);
  }

  /**
   * Get a specific transaction
   * @param id Transaction ID
   * @returns Transaction details
   * @example
   * ```typescript
   * const tx = await z402.transactions.get('tx_...');
   * console.log(tx.status, tx.amount);
   * ```
   */
  async get(id: string): Promise<Transaction> {
    return this.http.get<Transaction>(`/transactions/${id}`);
  }

  /**
   * Issue a refund for a transaction
   * @param id Transaction ID
   * @param params Refund parameters
   * @returns Updated transaction
   * @example
   * ```typescript
   * await z402.transactions.refund('tx_...', {
   *   reason: 'Customer requested refund'
   * });
   * ```
   */
  async refund(id: string, params?: RefundParams): Promise<Transaction> {
    return this.http.post<Transaction>(`/transactions/${id}/refund`, params);
  }

  /**
   * Export transactions to CSV
   * @param params Query parameters
   * @returns CSV string
   * @example
   * ```typescript
   * const csv = await z402.transactions.exportCSV({
   *   dateFrom: '2025-01-01',
   *   dateTo: '2025-01-31'
   * });
   * // Download or save the CSV
   * ```
   */
  async exportCSV(params?: ListTransactionsParams): Promise<string> {
    const response = await this.http.get<{ csv: string }>('/transactions/export/csv', params);
    return response.csv;
  }

  /**
   * Export transactions to JSON
   * @param params Query parameters
   * @returns Transaction array
   * @example
   * ```typescript
   * const data = await z402.transactions.exportJSON({
   *   dateFrom: '2025-01-01'
   * });
   * ```
   */
  async exportJSON(params?: ListTransactionsParams): Promise<Transaction[]> {
    const response = await this.http.get<{ transactions: Transaction[] }>(
      '/transactions/export/json',
      params
    );
    return response.transactions;
  }
}
