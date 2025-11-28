import { zcashClient } from '../integrations/zcash';
import { logger } from '../config/logger';
import prisma from '../db';
import { analyticsQueries } from '../db/queries';
import { WebhookService } from './webhook.service';

/**
 * Payment Settlement Service
 * Handles finalization of payments after blockchain confirmation
 */

export interface SettlePaymentRequest {
  transactionId: string;
  minConfirmations?: number;
  force?: boolean;
}

export interface SettlePaymentResponse {
  success: boolean;
  transactionId: string;
  status: string;
  confirmations: number;
  settled: boolean;
  error?: string;
}

export class SettlementService {
  private static readonly DEFAULT_MIN_CONFIRMATIONS = 6;

  /**
   * Settle a payment
   */
  static async settlePayment(
    request: SettlePaymentRequest
  ): Promise<SettlePaymentResponse> {
    try {
      logger.info('Settling payment', {
        transactionId: request.transactionId,
      });

      // Get transaction from database
      const transaction = await prisma.transaction.findUnique({
        where: { id: request.transactionId },
        include: {
          merchant: true,
          paymentIntent: true,
        },
      });

      if (!transaction) {
        return {
          success: false,
          transactionId: request.transactionId,
          status: 'NOT_FOUND',
          confirmations: 0,
          settled: false,
          error: 'Transaction not found',
        };
      }

      // Check if already settled
      if (transaction.status === 'SETTLED') {
        return {
          success: true,
          transactionId: request.transactionId,
          status: 'SETTLED',
          confirmations: transaction.confirmations,
          settled: true,
        };
      }

      // Check if failed
      if (transaction.status === 'FAILED' || transaction.status === 'REFUNDED') {
        return {
          success: false,
          transactionId: request.transactionId,
          status: transaction.status,
          confirmations: transaction.confirmations,
          settled: false,
          error: `Transaction ${transaction.status.toLowerCase()}`,
        };
      }

      // Verify transaction on blockchain
      if (!transaction.transactionId) {
        return {
          success: false,
          transactionId: request.transactionId,
          status: 'PENDING',
          confirmations: 0,
          settled: false,
          error: 'No blockchain transaction ID',
        };
      }

      const zcashTx = await zcashClient.getTransaction(
        transaction.transactionId
      );

      if (!zcashTx) {
        return {
          success: false,
          transactionId: request.transactionId,
          status: 'PENDING',
          confirmations: 0,
          settled: false,
          error: 'Transaction not found on blockchain',
        };
      }

      // Update confirmations
      await prisma.transaction.update({
        where: { id: request.transactionId },
        data: {
          confirmations: zcashTx.confirmations,
          blockHeight: zcashTx.blockHeight,
        },
      });

      // Check if enough confirmations
      const minConfirmations =
        request.minConfirmations ||
        (transaction.merchant.settings as any)?.confirmations ||
        this.DEFAULT_MIN_CONFIRMATIONS;

      if (zcashTx.confirmations < minConfirmations && !request.force) {
        return {
          success: false,
          transactionId: request.transactionId,
          status: 'VERIFIED',
          confirmations: zcashTx.confirmations,
          settled: false,
          error: `Insufficient confirmations (${zcashTx.confirmations}/${minConfirmations})`,
        };
      }

      // Settle the transaction
      await this.finalizeSettlement(
        transaction.id,
        zcashTx.confirmations,
        zcashTx.blockHeight
      );

      logger.info('Payment settled successfully', {
        transactionId: request.transactionId,
        confirmations: zcashTx.confirmations,
      });

      return {
        success: true,
        transactionId: request.transactionId,
        status: 'SETTLED',
        confirmations: zcashTx.confirmations,
        settled: true,
      };
    } catch (error) {
      logger.error('Payment settlement failed', error);
      return {
        success: false,
        transactionId: request.transactionId,
        status: 'ERROR',
        confirmations: 0,
        settled: false,
        error: 'Settlement failed',
      };
    }
  }

  /**
   * Finalize settlement (update database, trigger webhooks, record analytics)
   */
  private static async finalizeSettlement(
    transactionId: string,
    confirmations: number,
    blockHeight?: number
  ) {
    return prisma.$transaction(async (tx) => {
      // Update transaction
      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'SETTLED',
          confirmations,
          blockHeight,
          settledAt: new Date(),
        },
        include: {
          merchant: true,
          paymentIntent: true,
        },
      });

      // Update payment intent
      if (transaction.paymentIntentId) {
        await tx.paymentIntent.update({
          where: { id: transaction.paymentIntentId },
          data: {
            status: 'SUCCEEDED',
            completedAt: new Date(),
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          merchantId: transaction.merchantId,
          action: 'PAYMENT_SETTLED',
          resourceType: 'Transaction',
          resourceId: transaction.id,
          metadata: {
            amount: transaction.amount.toString(),
            confirmations,
            blockHeight,
          },
        },
      });

      // Record analytics
      await analyticsQueries.recordMetric({
        merchantId: transaction.merchantId,
        metricType: 'PAYMENT_VOLUME',
        value: transaction.amount,
        tags: { status: 'settled' },
      });

      await analyticsQueries.recordMetric({
        merchantId: transaction.merchantId,
        metricType: 'PAYMENT_COUNT',
        value: 1,
        tags: { status: 'settled' },
      });

      // Trigger webhook (async, don't wait)
      WebhookService.sendWebhook({
        merchantId: transaction.merchantId,
        eventType: 'PAYMENT_SETTLED',
        payload: {
          type: 'payment.settled',
          data: {
            id: transaction.id,
            paymentId: transaction.paymentIntentId,
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            confirmations,
            blockHeight,
            settledAt: transaction.settledAt?.toISOString(),
            resourceUrl: transaction.resourceUrl,
          },
        },
      }).catch((error) => {
        logger.error('Failed to send settlement webhook', error);
      });

      return transaction;
    });
  }

  /**
   * Auto-settle eligible transactions
   */
  static async autoSettle(): Promise<{
    total: number;
    settled: number;
    failed: number;
  }> {
    try {
      logger.info('Starting auto-settlement');

      // Get all verified transactions
      const transactions = await prisma.transaction.findMany({
        where: {
          status: 'VERIFIED',
          transactionId: { not: null },
        },
        include: {
          merchant: true,
        },
      });

      let settled = 0;
      let failed = 0;

      for (const transaction of transactions) {
        const minConfirmations =
          (transaction.merchant.settings as any)?.confirmations ||
          this.DEFAULT_MIN_CONFIRMATIONS;

        const result = await this.settlePayment({
          transactionId: transaction.id,
          minConfirmations,
        });

        if (result.settled) {
          settled++;
        } else if (result.error && !result.error.includes('Insufficient')) {
          failed++;
        }
      }

      logger.info('Auto-settlement complete', {
        total: transactions.length,
        settled,
        failed,
      });

      return {
        total: transactions.length,
        settled,
        failed,
      };
    } catch (error) {
      logger.error('Auto-settlement failed', error);
      throw error;
    }
  }

  /**
   * Expire old pending payments
   */
  static async expireOldPayments(): Promise<number> {
    try {
      const result = await prisma.transaction.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: 'FAILED',
        },
      });

      // Also expire payment intents
      await prisma.paymentIntent.updateMany({
        where: {
          status: { in: ['CREATED', 'PROCESSING'] },
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      logger.info('Expired old payments', { count: result.count });

      return result.count;
    } catch (error) {
      logger.error('Failed to expire old payments', error);
      throw error;
    }
  }

  /**
   * Get settlement statistics
   */
  static async getStatistics(merchantId?: string): Promise<{
    pending: number;
    verified: number;
    settled: number;
    failed: number;
    totalVolume: number;
  }> {
    const where = merchantId ? { merchantId } : {};

    const [pending, verified, settled, failed, volume] = await Promise.all([
      prisma.transaction.count({
        where: { ...where, status: 'PENDING' },
      }),
      prisma.transaction.count({
        where: { ...where, status: 'VERIFIED' },
      }),
      prisma.transaction.count({
        where: { ...where, status: 'SETTLED' },
      }),
      prisma.transaction.count({
        where: { ...where, status: 'FAILED' },
      }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'SETTLED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      verified,
      settled,
      failed,
      totalVolume: parseFloat(volume._sum.amount?.toString() || '0'),
    };
  }

  /**
   * Monitor confirmations for a transaction
   */
  static async monitorConfirmations(
    transactionId: string,
    callback: (confirmations: number) => void | Promise<void>,
    targetConfirmations: number = 6,
    checkIntervalMs: number = 60000 // 1 minute
  ): Promise<void> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || !transaction.transactionId) {
      throw new Error('Transaction not found or no txid');
    }

    let currentConfirmations = transaction.confirmations;

    const intervalId = setInterval(async () => {
      try {
        const zcashTx = await zcashClient.getTransaction(
          transaction.transactionId!
        );

        if (zcashTx && zcashTx.confirmations !== currentConfirmations) {
          currentConfirmations = zcashTx.confirmations;

          // Update database
          await prisma.transaction.update({
            where: { id: transactionId },
            data: {
              confirmations: currentConfirmations,
              blockHeight: zcashTx.blockHeight,
            },
          });

          // Call callback
          await callback(currentConfirmations);

          // Auto-settle if target reached
          if (currentConfirmations >= targetConfirmations) {
            clearInterval(intervalId);
            await this.settlePayment({ transactionId });
          }
        }
      } catch (error) {
        logger.error('Error monitoring confirmations', { transactionId, error });
      }
    }, checkIntervalMs);

    // Clean up after 24 hours
    setTimeout(() => clearInterval(intervalId), 24 * 60 * 60 * 1000);
  }
}
