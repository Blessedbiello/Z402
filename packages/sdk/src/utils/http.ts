/**
 * HTTP client with retry logic and error handling
 */

import { withRetry } from './retry';
import {
  AuthenticationError,
  InvalidRequestError,
  NotFoundError,
  RateLimitError,
  APIError,
  NetworkError,
} from '../errors';
import type { Z402Config } from '../types';

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private readonly debug: boolean;

  constructor(config: Z402Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl(config.network || 'testnet');
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30000;
    this.debug = config.debug ?? false;
  }

  private getDefaultBaseUrl(network: 'testnet' | 'mainnet'): string {
    return network === 'mainnet'
      ? 'https://api.z402.io/v1'
      : 'https://api-testnet.z402.io/v1';
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);

    return withRetry(
      async () => {
        const startTime = Date.now();

        if (this.debug) {
          console.log(`[Z402 SDK] ${options.method} ${url}`);
          if (options.body) {
            console.log('[Z402 SDK] Request body:', options.body);
          }
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);

          const response = await fetch(url, {
            method: options.method,
            headers: this.buildHeaders(options.headers),
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseTime = Date.now() - startTime;

          if (this.debug) {
            console.log(`[Z402 SDK] Response ${response.status} (${responseTime}ms)`);
          }

          return await this.handleResponse<T>(response);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            throw new NetworkError('Request timeout');
          }
          if (error instanceof Error && !error.hasOwnProperty('statusCode')) {
            throw new NetworkError(error.message, error);
          }
          throw error;
        }
      },
      { maxRetries: this.maxRetries }
    );
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, query?: Record<string, any>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'User-Agent': 'z402-sdk-js/1.0.0',
      ...customHeaders,
    };
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }

    if (this.debug && data) {
      console.log('[Z402 SDK] Response data:', data);
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.message || 'API request failed';
      const details = data?.error?.details || data?.details;

      switch (response.status) {
        case 401:
          throw new AuthenticationError(message, details);
        case 400:
          throw new InvalidRequestError(message, details);
        case 404:
          throw new NotFoundError(message, details);
        case 429:
          const retryAfter = response.headers.get('retry-after');
          throw new RateLimitError(
            message,
            retryAfter ? parseInt(retryAfter, 10) : undefined,
            details
          );
        default:
          throw new APIError(message, response.status, details);
      }
    }

    return data as T;
  }

  /**
   * GET request
   */
  async get<T>(path: string, query?: Record<string, any>): Promise<T> {
    return this.request<T>({ method: 'GET', path, query });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>({ method: 'POST', path, body });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>({ method: 'PUT', path, body });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', path });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: any): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body });
  }
}
