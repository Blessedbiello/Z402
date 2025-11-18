import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';
import { config } from '../config';

/**
 * Zcash RPC Client
 * Provides integration with Zcash nodes (zebrad or zcashd)
 */

export interface ZcashRPCConfig {
  url: string;
  user: string;
  password: string;
  network: 'testnet' | 'mainnet';
}

export interface ZcashAddress {
  address: string;
  type: 'transparent' | 'shielded';
}

export interface ZcashTransaction {
  txid: string;
  amount: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
  from: string;
  to: string;
}

export interface TransactionInput {
  to: string;
  amount: number;
  from?: string;
  memo?: string; // For shielded transactions
}

export interface ZcashBalance {
  total: number;
  transparent: number;
  shielded: number;
}

export class ZcashRPCClient {
  private client: AxiosInstance;
  private network: 'testnet' | 'mainnet';

  constructor(configOverride?: Partial<ZcashRPCConfig>) {
    const rpcConfig: ZcashRPCConfig = {
      url: configOverride?.url || config.zcash.rpcUrl,
      user: configOverride?.user || config.zcash.rpcUser,
      password: configOverride?.password || config.zcash.rpcPassword,
      network: (configOverride?.network || config.zcash.network) as 'testnet' | 'mainnet',
    };

    this.network = rpcConfig.network;

    this.client = axios.create({
      baseURL: rpcConfig.url,
      auth: {
        username: rpcConfig.user,
        password: rpcConfig.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    logger.info(`Zcash RPC client initialized for ${this.network}`);
  }

  /**
   * Make RPC call to Zcash node
   */
  private async rpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      });

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }

      return response.data.result as T;
    } catch (error) {
      logger.error(`Zcash RPC call failed: ${method}`, error);
      throw error;
    }
  }

  /**
   * Get blockchain info
   */
  async getBlockchainInfo(): Promise<{
    chain: string;
    blocks: number;
    headers: number;
    verificationprogress: number;
  }> {
    return this.rpcCall('getblockchaininfo');
  }

  /**
   * Get network info
   */
  async getNetworkInfo(): Promise<{
    version: number;
    subversion: string;
    protocolversion: number;
    connections: number;
  }> {
    return this.rpcCall('getnetworkinfo');
  }

  /**
   * Validate Zcash address
   */
  async validateAddress(address: string): Promise<{
    isvalid: boolean;
    address?: string;
    type?: 'transparent' | 'shielded';
    ismine?: boolean;
  }> {
    try {
      const result = await this.rpcCall<{
        isvalid: boolean;
        address?: string;
        scriptPubKey?: string;
        ismine?: boolean;
        iswatchonly?: boolean;
      }>('validateaddress', [address]);

      let type: 'transparent' | 'shielded' | undefined;
      if (result.isvalid && result.address) {
        // Determine address type based on prefix
        if (address.startsWith('t1') || address.startsWith('t3')) {
          type = 'transparent';
        } else if (address.startsWith('zs1') || address.startsWith('ztestsapling')) {
          type = 'shielded';
        }
      }

      return {
        isvalid: result.isvalid,
        address: result.address,
        type,
        ismine: result.ismine,
      };
    } catch (error) {
      logger.error('Address validation failed', { address, error });
      return { isvalid: false };
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address?: string): Promise<ZcashBalance> {
    try {
      if (address) {
        const validation = await this.validateAddress(address);
        if (!validation.isvalid) {
          throw new Error('Invalid address');
        }

        // Get balance for specific address
        const balance = await this.rpcCall<number>('z_getbalance', [address]);

        return {
          total: balance,
          transparent: validation.type === 'transparent' ? balance : 0,
          shielded: validation.type === 'shielded' ? balance : 0,
        };
      }

      // Get wallet balance
      const transparentBalance = await this.rpcCall<number>('getbalance', []);
      const shieldedBalance = await this.rpcCall<number>('z_gettotalbalance', [])
        .then((result: any) => parseFloat(result.private || '0'))
        .catch(() => 0);

      return {
        total: transparentBalance + shieldedBalance,
        transparent: transparentBalance,
        shielded: shieldedBalance,
      };
    } catch (error) {
      logger.error('Failed to get balance', { address, error });
      throw error;
    }
  }

  /**
   * Get transaction by txid
   */
  async getTransaction(txid: string): Promise<ZcashTransaction | null> {
    try {
      const tx = await this.rpcCall<{
        txid: string;
        amount: number;
        confirmations: number;
        blockheight?: number;
        time: number;
        details: Array<{
          address: string;
          category: string;
          amount: number;
        }>;
      }>('gettransaction', [txid]);

      // Extract from/to addresses
      const receivedDetail = tx.details.find((d) => d.category === 'receive');
      const sentDetail = tx.details.find((d) => d.category === 'send');

      return {
        txid: tx.txid,
        amount: Math.abs(tx.amount),
        confirmations: tx.confirmations,
        blockHeight: tx.blockheight,
        timestamp: tx.time,
        from: sentDetail?.address || '',
        to: receivedDetail?.address || '',
      };
    } catch (error) {
      logger.error('Failed to get transaction', { txid, error });
      return null;
    }
  }

  /**
   * List transactions for an address
   */
  async listTransactions(
    address?: string,
    count: number = 10,
    skip: number = 0
  ): Promise<ZcashTransaction[]> {
    try {
      const txs = await this.rpcCall<Array<{
        txid: string;
        amount: number;
        confirmations: number;
        blockheight?: number;
        time: number;
        address: string;
      }>>('listtransactions', ['*', count, skip]);

      return txs
        .filter((tx) => !address || tx.address === address)
        .map((tx) => ({
          txid: tx.txid,
          amount: Math.abs(tx.amount),
          confirmations: tx.confirmations,
          blockHeight: tx.blockheight,
          timestamp: tx.time,
          from: '',
          to: tx.address,
        }));
    } catch (error) {
      logger.error('Failed to list transactions', { error });
      return [];
    }
  }

  /**
   * Send transparent transaction
   */
  async sendTransparent(
    to: string,
    amount: number,
    from?: string
  ): Promise<string> {
    try {
      // Validate recipient address
      const validation = await this.validateAddress(to);
      if (!validation.isvalid || validation.type !== 'transparent') {
        throw new Error('Invalid transparent address');
      }

      let txid: string;

      if (from) {
        // Send from specific address
        txid = await this.rpcCall('sendfrom', ['', to, amount, 1, '', '', from]);
      } else {
        // Send from default wallet
        txid = await this.rpcCall('sendtoaddress', [to, amount]);
      }

      logger.info('Transparent transaction sent', { txid, to, amount });
      return txid;
    } catch (error) {
      logger.error('Failed to send transparent transaction', {
        to,
        amount,
        error,
      });
      throw error;
    }
  }

  /**
   * Send shielded transaction
   */
  async sendShielded(
    to: string,
    amount: number,
    from?: string,
    memo?: string
  ): Promise<string> {
    try {
      // Validate recipient address
      const validation = await this.validateAddress(to);
      if (!validation.isvalid || validation.type !== 'shielded') {
        throw new Error('Invalid shielded address');
      }

      // Prepare transaction
      const recipients = [
        {
          address: to,
          amount,
          memo: memo ? Buffer.from(memo).toString('hex') : undefined,
        },
      ];

      // Send shielded transaction
      const opid = await this.rpcCall<string>('z_sendmany', [
        from || 'ANY_TADDR',
        recipients,
        1, // minconf
        0.0001, // fee
      ]);

      // Wait for operation to complete
      const result = await this.waitForOperation(opid);

      if (result.status === 'failed') {
        throw new Error(result.error?.message || 'Transaction failed');
      }

      logger.info('Shielded transaction sent', {
        txid: result.result?.txid,
        to,
        amount,
      });
      return result.result?.txid || '';
    } catch (error) {
      logger.error('Failed to send shielded transaction', {
        to,
        amount,
        error,
      });
      throw error;
    }
  }

  /**
   * Send transaction (auto-detect type)
   */
  async sendTransaction(input: TransactionInput): Promise<string> {
    const validation = await this.validateAddress(input.to);
    if (!validation.isvalid) {
      throw new Error('Invalid recipient address');
    }

    if (validation.type === 'transparent') {
      return this.sendTransparent(input.to, input.amount, input.from);
    } else {
      return this.sendShielded(
        input.to,
        input.amount,
        input.from,
        input.memo
      );
    }
  }

  /**
   * Wait for async operation to complete
   */
  private async waitForOperation(
    opid: string,
    maxAttempts: number = 60
  ): Promise<{
    status: 'success' | 'failed' | 'executing';
    result?: { txid: string };
    error?: { message: string };
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.rpcCall<Array<{
        id: string;
        status: string;
        result?: { txid: string };
        error?: { message: string };
      }>>('z_getoperationstatus', [[opid]]);

      if (status && status.length > 0) {
        const op = status[0];
        if (op.status === 'success' || op.status === 'failed') {
          return {
            status: op.status as 'success' | 'failed',
            result: op.result,
            error: op.error,
          };
        }
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { status: 'executing' };
  }

  /**
   * Get confirmations for a transaction
   */
  async getConfirmations(txid: string): Promise<number> {
    try {
      const tx = await this.getTransaction(txid);
      return tx?.confirmations || 0;
    } catch (error) {
      logger.error('Failed to get confirmations', { txid, error });
      return 0;
    }
  }

  /**
   * Check if transaction is confirmed
   */
  async isConfirmed(
    txid: string,
    minConfirmations: number = 6
  ): Promise<boolean> {
    const confirmations = await this.getConfirmations(txid);
    return confirmations >= minConfirmations;
  }

  /**
   * Create new transparent address
   */
  async createTransparentAddress(): Promise<string> {
    return this.rpcCall('getnewaddress');
  }

  /**
   * Create new shielded address
   */
  async createShieldedAddress(): Promise<string> {
    return this.rpcCall('z_getnewaddress', ['sapling']);
  }

  /**
   * Create address (auto-detect type)
   */
  async createAddress(type: 'transparent' | 'shielded'): Promise<string> {
    if (type === 'transparent') {
      return this.createTransparentAddress();
    } else {
      return this.createShieldedAddress();
    }
  }

  /**
   * Get current block height
   */
  async getBlockHeight(): Promise<number> {
    const info = await this.getBlockchainInfo();
    return info.blocks;
  }

  /**
   * Check if node is synced
   */
  async isSynced(): Promise<boolean> {
    const info = await this.getBlockchainInfo();
    return info.verificationprogress > 0.99;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    network: string;
    blockHeight: number;
    synced: boolean;
    connections: number;
  }> {
    try {
      const [blockchainInfo, networkInfo] = await Promise.all([
        this.getBlockchainInfo(),
        this.getNetworkInfo(),
      ]);

      const synced = blockchainInfo.verificationprogress > 0.99;

      return {
        healthy: synced && networkInfo.connections > 0,
        network: blockchainInfo.chain,
        blockHeight: blockchainInfo.blocks,
        synced,
        connections: networkInfo.connections,
      };
    } catch (error) {
      logger.error('Zcash health check failed', error);
      return {
        healthy: false,
        network: this.network,
        blockHeight: 0,
        synced: false,
        connections: 0,
      };
    }
  }
}

// Export singleton instance
export const zcashClient = new ZcashRPCClient();
