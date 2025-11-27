import { CronJob } from 'cron';
import { SettlementService } from '../services/settle.service';
import { VerificationService } from '../services/verify.service';
import { WebhookService } from '../services/webhook.service';
import { blockchainMonitor } from '../services/blockchain-monitor.service';
import { apikeyQueries } from '../db/queries';
import { logger } from '../config/logger';

/**
 * Scheduled Payment Jobs
 * Handles automatic settlement, verification, cleanup, and blockchain monitoring
 */

export class PaymentJobs {
  private jobs: CronJob[] = [];

  /**
   * Start all payment jobs
   */
  async start(): Promise<void> {
    logger.info('Starting payment jobs...');

    // Start blockchain monitoring service
    try {
      await blockchainMonitor.start();
      logger.info('Blockchain monitor started successfully');

      // Set up event listeners for blockchain monitor
      blockchainMonitor.on('payment_detected', (match) => {
        logger.info('Payment detected on blockchain', {
          paymentIntentId: match.paymentIntentId,
          txid: match.txid,
          confirmations: match.confirmations,
        });
      });

      blockchainMonitor.on('payment_confirmed', (match) => {
        logger.info('Payment confirmed on blockchain', {
          paymentIntentId: match.paymentIntentId,
          txid: match.txid,
          confirmations: match.confirmations,
        });
      });

      blockchainMonitor.on('transaction_lost', (txid) => {
        logger.error('Transaction lost in blockchain reorganization', { txid });
      });

      blockchainMonitor.on('error', (error) => {
        logger.error('Blockchain monitor error:', error);
      });
    } catch (error) {
      logger.error('Failed to start blockchain monitor:', error);
      // Continue with other jobs even if blockchain monitor fails
    }

    // Auto-settle verified transactions (every 5 minutes)
    this.jobs.push(
      new CronJob('*/5 * * * *', async () => {
        try {
          logger.info('Running auto-settlement job');
          const result = await SettlementService.autoSettle();
          logger.info('Auto-settlement complete', result);
        } catch (error) {
          logger.error('Auto-settlement job failed', error);
        }
      })
    );

    // Re-verify pending transactions (every 2 minutes)
    this.jobs.push(
      new CronJob('*/2 * * * *', async () => {
        try {
          logger.info('Running re-verification job');
          const result = await VerificationService.reVerifyPending();
          logger.info('Re-verification complete', result);
        } catch (error) {
          logger.error('Re-verification job failed', error);
        }
      })
    );

    // Expire old payments (every hour)
    this.jobs.push(
      new CronJob('0 * * * *', async () => {
        try {
          logger.info('Running payment expiration job');
          const count = await SettlementService.expireOldPayments();
          logger.info('Expired payments', { count });
        } catch (error) {
          logger.error('Payment expiration job failed', error);
        }
      })
    );

    // Retry failed webhooks (every 10 minutes)
    this.jobs.push(
      new CronJob('*/10 * * * *', async () => {
        try {
          logger.info('Running webhook retry job');
          const count = await WebhookService.retryFailed();
          logger.info('Retried webhooks', { count });
        } catch (error) {
          logger.error('Webhook retry job failed', error);
        }
      })
    );

    // Clean up expired API keys (daily at 2 AM)
    this.jobs.push(
      new CronJob('0 2 * * *', async () => {
        try {
          logger.info('Running API key cleanup job');
          await apikeyQueries.cleanupExpired();
          logger.info('API key cleanup complete');
        } catch (error) {
          logger.error('API key cleanup job failed', error);
        }
      })
    );

    // Start all jobs
    this.jobs.forEach((job) => job.start());

    logger.info(`Started ${this.jobs.length} payment jobs`);
  }

  /**
   * Stop all payment jobs
   */
  stop(): void {
    logger.info('Stopping payment jobs...');

    // Stop blockchain monitor
    try {
      blockchainMonitor.stop();
      logger.info('Blockchain monitor stopped');
    } catch (error) {
      logger.error('Failed to stop blockchain monitor:', error);
    }

    // Stop cron jobs
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    logger.info('All payment jobs stopped');
  }

  /**
   * Get job status
   */
  getStatus(): {
    running: boolean;
    jobCount: number;
    blockchainMonitor: {
      isMonitoring: boolean;
      lastScannedBlock: number;
      processedTransactions: number;
    };
  } {
    const monitorStatus = blockchainMonitor.getStatus();

    return {
      running: this.jobs.length > 0 && this.jobs[0].running,
      jobCount: this.jobs.length,
      blockchainMonitor: {
        isMonitoring: monitorStatus.isMonitoring,
        lastScannedBlock: monitorStatus.lastScannedBlock,
        processedTransactions: monitorStatus.processedTransactions,
      },
    };
  }
}

// Export singleton instance
export const paymentJobs = new PaymentJobs();
