/**
 * X402 Client Implementation Example
 *
 * This shows how a client would interact with an x402-protected API
 */

import axios from 'axios';
import crypto from 'crypto';

// Mock Zcash wallet (in real implementation, use actual Zcash SDK)
class MockZcashWallet {
  private address: string;

  constructor(address: string) {
    this.address = address;
  }

  async sendPayment(to: string, amount: number): Promise<string> {
    // In real implementation, create and broadcast Zcash transaction
    // For this example, return a mock txid
    return crypto.randomBytes(32).toString('hex');
  }

  getAddress(): string {
    return this.address;
  }

  signMessage(message: string): string {
    // In real implementation, sign with private key
    // For this example, return mock signature
    const secret = 'your-signing-secret';
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }
}

/**
 * X402 Client
 */
class X402Client {
  private baseUrl: string;
  private wallet: MockZcashWallet;

  constructor(baseUrl: string, wallet: MockZcashWallet) {
    this.baseUrl = baseUrl;
    this.wallet = wallet;
  }

  /**
   * Make request to x402-protected resource
   */
  async request(path: string, options: any = {}): Promise<any> {
    try {
      // Step 1: Try to access resource
      const response = await axios.get(`${this.baseUrl}${path}`, options);
      return response.data;
    } catch (error: any) {
      // Step 2: Check if payment required (402)
      if (error.response?.status === 402) {
        const paymentDetails = error.response.data;

        console.log('Payment required:', paymentDetails);

        // Step 3: Send payment
        const txid = await this.wallet.sendPayment(
          paymentDetails.merchantAddress,
          paymentDetails.amount
        );

        console.log('Payment sent, txid:', txid);

        // Step 4: Generate authorization
        const authorization = this.generateAuthorization(
          paymentDetails.paymentId,
          txid
        );

        // Step 5: Retry request with authorization
        const retryResponse = await axios.get(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: authorization,
          },
        });

        return retryResponse.data;
      }

      throw error;
    }
  }

  /**
   * Generate x402 authorization header
   */
  private generateAuthorization(paymentId: string, txid: string): string {
    const clientAddress = this.wallet.getAddress();
    const timestamp = Date.now();

    // Create signature
    const signatureData = `${paymentId}|${clientAddress}|${timestamp}`;
    const signature = this.wallet.signMessage(signatureData);

    // Format authorization header
    return `X402 paymentId="${paymentId}", clientAddress="${clientAddress}", txid="${txid}", signature="${signature}", timestamp="${timestamp}"`;
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<any> {
    const response = await axios.get(
      `${this.baseUrl}/api/v1/x402/status/${paymentId}`
    );
    return response.data;
  }
}

// Usage Example
async function main() {
  // Initialize wallet
  const wallet = new MockZcashWallet('t1YourTestZcashAddressHere');

  // Initialize client
  const client = new X402Client('http://localhost:3001', wallet);

  try {
    // Request premium content (will trigger payment)
    console.log('Requesting premium content...');
    const content = await client.request('/api/premium-content');

    console.log('Content received:', content);
  } catch (error) {
    console.error('Request failed:', error);
  }

  // Check payment status
  try {
    const status = await client.checkPaymentStatus('payment_id_here');
    console.log('Payment status:', status);
  } catch (error) {
    console.error('Status check failed:', error);
  }
}

// Run example
if (require.main === module) {
  main().catch(console.error);
}

export { X402Client, MockZcashWallet };
