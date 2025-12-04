import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

/**
 * NEAR Intents Service
 * Integrates with NEAR 1Click API for cross-chain payments
 * Enables users to pay with any token (ETH, USDC, SOL, BTC) and receive ZEC
 */

// Types based on NEAR 1Click API
export interface TokenInfo {
  assetId: string;
  blockchain: string;
  address?: string;
  decimals: number;
  symbol: string;
  name: string;
  priceUsd?: string;
  logoUri?: string;
}

export interface QuoteRequest {
  originAsset: string; // e.g., "evm-1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" (USDC on Ethereum)
  destinationAsset: string; // e.g., "zcash:mainnet" or specific ZEC asset ID
  amount: string; // Amount in smallest unit (e.g., wei for ETH)
  swapType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT' | 'ANY_INPUT';
  slippageBps: number; // Slippage tolerance in basis points (100 = 1%)
  recipient: {
    address: string;
    chainType: string; // e.g., "zcash"
  };
  refund: {
    address: string;
    chainType: string;
  };
  deadline: string; // ISO 8601 timestamp
}

export interface QuoteResponse {
  requestId: string;
  swapType: string;
  quote: {
    originAsset: string;
    destinationAsset: string;
    originAmount: string;
    destinationAmount: string;
    depositAddress: string;
    memo?: string;
    expiresAt: string;
    estimatedTimeSeconds: number;
  };
  recipient: {
    address: string;
    chainType: string;
  };
  refund: {
    address: string;
    chainType: string;
  };
}

export interface SwapStatus {
  requestId: string;
  state: 'PENDING_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'INCOMPLETE_DEPOSIT' | 'REFUNDED' | 'FAILED';
  depositAddress: string;
  originAmount?: string;
  destinationAmount?: string;
  depositTxHash?: string;
  outputTxHash?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export class NearIntentsService {
  private client: AxiosInstance;
  private baseUrl: string;
  private jwtToken?: string;

  constructor() {
    this.baseUrl = process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com';
    this.jwtToken = process.env.ONE_CLICK_JWT;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(this.jwtToken && { Authorization: `Bearer ${this.jwtToken}` }),
      },
      timeout: 30000,
    });

    logger.info('NEAR Intents Service initialized', {
      baseUrl: this.baseUrl,
      hasJwt: !!this.jwtToken,
    });
  }

  /**
   * Get list of supported tokens across all chains
   */
  async getSupportedTokens(): Promise<TokenInfo[]> {
    try {
      logger.info('Fetching supported tokens from NEAR Intents');

      const response = await this.client.get<{ tokens: TokenInfo[] }>('/v0/tokens');

      logger.info('Retrieved supported tokens', { count: response.data.tokens.length });
      return response.data.tokens;
    } catch (error) {
      logger.error('Failed to fetch supported tokens', error);
      throw new Error('Failed to retrieve supported tokens from NEAR Intents');
    }
  }

  /**
   * Find Zcash (ZEC) asset ID from supported tokens
   */
  async getZcashAssetId(): Promise<string | null> {
    try {
      const tokens = await this.getSupportedTokens();

      // Look for Zcash mainnet token
      const zecToken = tokens.find(
        (token) =>
          token.blockchain.toLowerCase() === 'zcash' ||
          token.symbol.toLowerCase() === 'zec' ||
          token.name.toLowerCase().includes('zcash')
      );

      if (zecToken) {
        logger.info('Found Zcash asset', { assetId: zecToken.assetId, symbol: zecToken.symbol });
        return zecToken.assetId;
      }

      logger.warn('Zcash (ZEC) not found in supported tokens');
      return null;
    } catch (error) {
      logger.error('Failed to find Zcash asset ID', error);
      return null;
    }
  }

  /**
   * Get quote for cross-chain swap to ZEC
   */
  async getQuoteToZec(params: {
    originAsset: string; // Asset user wants to pay with (e.g., USDC, ETH, SOL)
    amountOrigin: string; // Amount in smallest unit
    recipientZcashAddress: string; // Where to send ZEC
    refundAddress: string; // Where to refund if swap fails
    refundChainType: string; // Chain type for refund address
    slippageBps?: number; // Default: 100 (1%)
    deadlineMinutes?: number; // Default: 30 minutes
  }): Promise<QuoteResponse> {
    try {
      logger.info('Requesting quote for cross-chain swap to ZEC', {
        originAsset: params.originAsset,
        amount: params.amountOrigin,
        recipient: params.recipientZcashAddress,
      });

      // Get ZEC asset ID
      const zecAssetId = await this.getZcashAssetId();
      if (!zecAssetId) {
        throw new Error('Zcash (ZEC) is not supported by NEAR Intents at this time');
      }

      // Calculate deadline
      const deadline = new Date();
      deadline.setMinutes(deadline.getMinutes() + (params.deadlineMinutes || 30));

      const quoteRequest: QuoteRequest = {
        originAsset: params.originAsset,
        destinationAsset: zecAssetId,
        amount: params.amountOrigin,
        swapType: 'EXACT_INPUT',
        slippageBps: params.slippageBps || 100, // 1% slippage
        recipient: {
          address: params.recipientZcashAddress,
          chainType: 'zcash',
        },
        refund: {
          address: params.refundAddress,
          chainType: params.refundChainType,
        },
        deadline: deadline.toISOString(),
      };

      const response = await this.client.post<QuoteResponse>('/v0/quote', quoteRequest);

      logger.info('Received quote from NEAR Intents', {
        requestId: response.data.requestId,
        depositAddress: response.data.quote.depositAddress,
        originAmount: response.data.quote.originAmount,
        destinationAmount: response.data.quote.destinationAmount,
        estimatedTime: response.data.quote.estimatedTimeSeconds,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get quote from NEAR Intents', error);
      throw new Error('Failed to generate swap quote');
    }
  }

  /**
   * Submit deposit transaction hash to speed up processing (optional)
   */
  async submitDeposit(params: {
    depositAddress: string;
    txHash: string;
    memo?: string;
  }): Promise<{ success: boolean }> {
    try {
      logger.info('Submitting deposit transaction to NEAR Intents', {
        depositAddress: params.depositAddress,
        txHash: params.txHash,
      });

      await this.client.post('/v0/deposit/submit', {
        depositAddress: params.depositAddress,
        txHash: params.txHash,
        ...(params.memo && { memo: params.memo }),
      });

      logger.info('Deposit transaction submitted successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to submit deposit transaction', error);
      // Non-critical - swap will still process automatically
      return { success: false };
    }
  }

  /**
   * Check status of cross-chain swap
   */
  async getSwapStatus(depositAddress: string, memo?: string): Promise<SwapStatus> {
    try {
      logger.info('Checking swap status', { depositAddress });

      const params = new URLSearchParams({ depositAddress });
      if (memo) {
        params.append('memo', memo);
      }

      const response = await this.client.get<SwapStatus>(`/v0/status?${params.toString()}`);

      logger.info('Retrieved swap status', {
        depositAddress,
        state: response.data.state,
        outputTxHash: response.data.outputTxHash,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get swap status', error);
      throw new Error('Failed to retrieve swap status');
    }
  }

  /**
   * Monitor swap until completion or failure
   * Returns the Zcash transaction hash when successful
   */
  async monitorSwapUntilComplete(
    depositAddress: string,
    memo?: string,
    maxWaitMinutes: number = 15
  ): Promise<{ success: boolean; zcashTxHash?: string; error?: string }> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitMinutes * 60 * 1000;
    const pollIntervalMs = 10000; // Poll every 10 seconds

    logger.info('Starting swap monitoring', { depositAddress, maxWaitMinutes });

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.getSwapStatus(depositAddress, memo);

        switch (status.state) {
          case 'SUCCESS':
            logger.info('Swap completed successfully', {
              depositAddress,
              zcashTxHash: status.outputTxHash,
            });
            return {
              success: true,
              zcashTxHash: status.outputTxHash,
            };

          case 'FAILED':
          case 'INCOMPLETE_DEPOSIT':
          case 'REFUNDED':
            logger.error('Swap failed', {
              depositAddress,
              state: status.state,
              error: status.errorMessage,
            });
            return {
              success: false,
              error: status.errorMessage || `Swap ${status.state.toLowerCase()}`,
            };

          case 'PENDING_DEPOSIT':
          case 'PROCESSING':
            logger.info('Swap in progress', {
              depositAddress,
              state: status.state,
              elapsed: Math.round((Date.now() - startTime) / 1000),
            });
            // Continue polling
            break;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        logger.error('Error monitoring swap', error);
        // Continue polling despite errors
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    logger.warn('Swap monitoring timed out', { depositAddress, maxWaitMinutes });
    return {
      success: false,
      error: `Swap monitoring timed out after ${maxWaitMinutes} minutes`,
    };
  }
}

// Export singleton instance
export const nearIntentsService = new NearIntentsService();
