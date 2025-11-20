import { zcashClient } from '../integrations/zcash';
import { X402Protocol, X402Authorization } from '../core/x402-protocol';
import { logger } from '../config/logger';
import prisma from '../db';
import { analyticsQueries } from '../db/queries';

/**
 * Payment Verification Service
 * Handles verification of payment authorizations and blockchain transactions
 */

export interface VerifyPaymentRequest {
  authorization: X402Authorization;
  skipBlockchainCheck?: boolean;
}

export interface VerifyPaymentResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  status?: string;
  error?: string;
  details?: {
    confirmations?: number;
    blockHeight?: number;
    verified?: boolean;
  };
}

export class VerificationService {
  /**
   * Verify payment authorization
   */
  static async verifyPayment(
    request: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> {
    try {
      logger.info('Verifying payment', {
        paymentId: request.authorization.paymentId,
      });

      // Step 1: Verify authorization signature and intent
      const authResult = await X402Protocol.verifyAuthorization(
        request.authorization
      );

      if (!authResult.valid) {
        return {
          success: false,
          error: authResult.error || 'Authorization verification failed',
        };
      }

      // Step 2: If txid provided, verify on blockchain
      if (request.authorization.txid && !request.skipBlockchainCheck) {
        const blockchainVerification = await this.verifyOnBlockchain(
          authResult.transactionId!,
          request.authorization.txid
        );

        if (!blockchainVerification.success) {
          return {
            success: false,
            error: blockchainVerification.error,
          };
        }

        return {
          success: true,
          paymentId: authResult.paymentId,
          transactionId: authResult.transactionId,
          status: 'VERIFIED',
          details: blockchainVerification.details,
        };
      }

      // Step 3: Return successful authorization (pending blockchain verification)
      return {
        success: true,
        paymentId: authResult.paymentId,
        transactionId: authResult.transactionId,
        status: 'PENDING',
      };
    } catch (error) {
      logger.error('Payment verification failed', error);
      return {
        success: false,
        error: 'Verification failed',
      };
    }
  }

  /**
   * Verify transaction on Zcash blockchain
   */
  private static async verifyOnBlockchain(
    dbTransactionId: string,
    txid: string
  ): Promise<{
    success: boolean;
    error?: string;
    details?: {
      confirmations: number;
      blockHeight?: number;
      verified: boolean;
    };
  }> {
    try {
      // Get transaction from database
      const dbTransaction = await prisma.transaction.findUnique({
        where: { id: dbTransactionId },
        include: { merchant: true },
      });

      if (!dbTransaction) {
        return {
          success: false,
          error: 'Transaction not found in database',
        };
      }

      // Get transaction from blockchain
      const zcashTx = await zcashClient.getTransaction(txid);

      if (!zcashTx) {
        return {
          success: false,
          error: 'Transaction not found on blockchain',
        };
      }

      // Verify transaction details
      const amountMatches =
        Math.abs(zcashTx.amount - parseFloat(dbTransaction.amount.toString())) <
        0.00000001;

      if (!amountMatches) {
        logger.warn('Transaction amount mismatch', {
          expected: dbTransaction.amount.toString(),
          actual: zcashTx.amount,
        });
        return {
          success: false,
          error: 'Transaction amount mismatch',
        };
      }

      // Verify recipient address
      const merchantAddress = dbTransaction.merchant.zcashShieldedAddress ||
        dbTransaction.merchant.zcashAddress;

      // For shielded transactions, we can't verify the recipient address
      // We rely on the merchant confirming they received it

      // Update transaction in database
      await prisma.transaction.update({
        where: { id: dbTransactionId },
        data: {
          status: zcashTx.confirmations >= 1 ? 'VERIFIED' : 'PENDING',
          transactionId: txid,
          confirmations: zcashTx.confirmations,
          blockHeight: zcashTx.blockHeight,
        },
      });

      // Record analytics
      await analyticsQueries.recordMetric({
        merchantId: dbTransaction.merchantId,
        metricType: 'PAYMENT_COUNT',
        value: 1,
        tags: { status: 'verified' },
      });

      logger.info('Blockchain verification successful', {
        txid,
        confirmations: zcashTx.confirmations,
      });

      return {
        success: true,
        details: {
          confirmations: zcashTx.confirmations,
          blockHeight: zcashTx.blockHeight,
          verified: zcashTx.confirmations >= 1,
        },
      };
    } catch (error) {
      logger.error('Blockchain verification failed', error);
      return {
        success: false,
        error: 'Blockchain verification failed',
      };
    }
  }

  /**
   * Check for double-spending
   */
  static async checkDoubleSpend(
    paymentId: string,
    txid: string
  ): Promise<boolean> {
    try {
      // Check if this txid is already used for a different payment
      const existingTx = await prisma.transaction.findFirst({
        where: {
          transactionId: txid,
          paymentIntentId: { not: paymentId },
          status: { in: ['PENDING', 'VERIFIED', 'SETTLED'] },
        },
      });

      if (existingTx) {
        logger.warn('Double-spend attempt detected', {
          txid,
          paymentId,
          existingPaymentId: existingTx.paymentIntentId,
        });
        return true;
      }

      // Check if this payment has multiple transactions
      const paymentTransactions = await prisma.transaction.findMany({
        where: {
          paymentIntentId: paymentId,
          status: { in: ['PENDING', 'VERIFIED', 'SETTLED'] },
        },
      });

      if (paymentTransactions.length > 1) {
        logger.warn('Multiple transactions for same payment', {
          paymentId,
          transactionCount: paymentTransactions.length,
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Double-spend check failed', error);
      return true; // Fail safe: treat as potential double-spend
    }
  }

  /**
   * Get payment verification status
   */
  static async getVerificationStatus(paymentId: string): Promise<{
    verified: boolean;
    status: string;
    confirmations: number;
    transactionId?: string;
  }> {
    const transaction = await prisma.transaction.findFirst({
      where: { paymentIntentId: paymentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!transaction) {
      return {
        verified: false,
        status: 'NOT_FOUND',
        confirmations: 0,
      };
    }

    return {
      verified: transaction.status === 'VERIFIED' || transaction.status === 'SETTLED',
      status: transaction.status,
      confirmations: transaction.confirmations,
      transactionId: transaction.transactionId || undefined,
    };
  }

  /**
   * Batch verify multiple transactions
   */
  static async batchVerify(
    transactionIds: string[]
  ): Promise<
    Array<{
      transactionId: string;
      verified: boolean;
      confirmations: number;
      error?: string;
    }>
  > {
    const results = await Promise.all(
      transactionIds.map(async (dbTxId) => {
        try {
          const tx = await prisma.transaction.findUnique({
            where: { id: dbTxId },
          });

          if (!tx || !tx.transactionId) {
            return {
              transactionId: dbTxId,
              verified: false,
              confirmations: 0,
              error: 'Transaction not found or no txid',
            };
          }

          const zcashTx = await zcashClient.getTransaction(tx.transactionId);

          if (!zcashTx) {
            return {
              transactionId: dbTxId,
              verified: false,
              confirmations: 0,
              error: 'Not found on blockchain',
            };
          }

          // Update confirmations
          await prisma.transaction.update({
            where: { id: dbTxId },
            data: {
              confirmations: zcashTx.confirmations,
              blockHeight: zcashTx.blockHeight,
            },
          });

          return {
            transactionId: dbTxId,
            verified: zcashTx.confirmations >= 1,
            confirmations: zcashTx.confirmations,
          };
        } catch (error) {
          logger.error('Batch verification failed for transaction', {
            transactionId: dbTxId,
            error,
          });
          return {
            transactionId: dbTxId,
            verified: false,
            confirmations: 0,
            error: 'Verification failed',
          };
        }
      })
    );

    return results;
  }

  /**
   * Re-verify all pending transactions
   */
  static async reVerifyPending(): Promise<{
    total: number;
    verified: number;
    failed: number;
  }> {
    try {
      // Get all pending and verified transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          status: { in: ['PENDING', 'VERIFIED'] },
          transactionId: { not: null },
        },
        select: { id: true },
      });

      const results = await this.batchVerify(
        transactions.map((tx) => tx.id)
      );

      const verified = results.filter((r) => r.verified).length;
      const failed = results.filter((r) => !r.verified).length;

      logger.info('Re-verification complete', {
        total: transactions.length,
        verified,
        failed,
      });

      return {
        total: transactions.length,
        verified,
        failed,
      };
    } catch (error) {
      logger.error('Re-verification failed', error);
      throw error;
    }
  }
}
