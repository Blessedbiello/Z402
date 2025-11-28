import axios from 'axios';
import { logger } from '../config/logger';
import prisma from '../db';
import { WebhookEventType } from '@prisma/client';
import { generateWebhookSignature } from '../middleware/webhook-signature';

/**
 * Webhook Service
 * Handles webhook delivery with retry logic
 */

export interface WebhookPayload {
  merchantId: string;
  transactionId?: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
}

export class WebhookService {
  private static readonly MAX_RETRIES = 5;
  private static readonly RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

  /**
   * Send webhook to merchant
   */
  static async sendWebhook(data: WebhookPayload): Promise<void> {
    try {
      // Get merchant webhook configuration
      const merchant = await prisma.merchant.findUnique({
        where: { id: data.merchantId },
        select: {
          id: true,
          webhookUrl: true,
          webhookSecret: true,
        },
      });

      if (!merchant?.webhookUrl) {
        logger.debug('No webhook URL configured for merchant', {
          merchantId: data.merchantId,
        });
        return;
      }

      // Create webhook delivery record
      const delivery = await prisma.webhookDelivery.create({
        data: {
          merchantId: data.merchantId,
          transactionId: data.transactionId,
          eventType: data.eventType,
          payload: data.payload as any,
          status: 'PENDING',
          attempts: 0,
          maxAttempts: this.MAX_RETRIES,
        },
      });

      // Attempt delivery
      await this.attemptDelivery(
        delivery.id,
        merchant.webhookUrl,
        merchant.webhookSecret || '',
        data.payload
      );
    } catch (error) {
      logger.error('Failed to initiate webhook delivery', error);
    }
  }

  /**
   * Attempt webhook delivery
   */
  private static async attemptDelivery(
    deliveryId: string,
    url: string,
    secret: string,
    payload: Record<string, unknown>,
    attemptNumber: number = 0
  ): Promise<void> {
    try {
      logger.info('Attempting webhook delivery', {
        deliveryId,
        attempt: attemptNumber + 1,
      });

      // Generate signature with timestamp
      const signature = generateWebhookSignature(payload, secret);

      // Send webhook
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Z402-Signature': signature,
          'X-Z402-Event': payload.type as string,
          'X-Z402-Delivery-ID': deliveryId,
          'User-Agent': 'Z402-Webhook/1.0',
        },
        timeout: 10000, // 10 seconds
        validateStatus: (status) => status >= 200 && status < 300,
      });

      // Success
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SENT',
          httpStatusCode: response.status,
          responseBody: JSON.stringify(response.data).substring(0, 1000),
          attempts: attemptNumber + 1,
          lastAttemptAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      logger.info('Webhook delivered successfully', {
        deliveryId,
        statusCode: response.status,
      });
    } catch (error: any) {
      logger.error('Webhook delivery failed', {
        deliveryId,
        attempt: attemptNumber + 1,
        error: error.message,
      });

      const httpStatusCode = error.response?.status;
      const responseBody = error.response?.data
        ? JSON.stringify(error.response.data).substring(0, 1000)
        : error.message;

      // Update delivery record
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: attemptNumber + 1 >= this.MAX_RETRIES ? 'FAILED' : 'RETRYING',
          httpStatusCode,
          responseBody,
          errorMessage: error.message,
          attempts: attemptNumber + 1,
          lastAttemptAt: new Date(),
          nextAttemptAt:
            attemptNumber + 1 < this.MAX_RETRIES
              ? new Date(Date.now() + this.RETRY_DELAYS[attemptNumber])
              : null,
        },
      });

      // Retry if not exceeded max attempts
      if (attemptNumber + 1 < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attemptNumber];
        logger.info('Scheduling webhook retry', {
          deliveryId,
          delay,
          nextAttempt: attemptNumber + 2,
        });

        setTimeout(() => {
          this.attemptDelivery(
            deliveryId,
            url,
            secret,
            payload,
            attemptNumber + 1
          );
        }, delay);
      }
    }
  }


  /**
   * Retry failed webhooks
   */
  static async retryFailed(): Promise<number> {
    try {
      const failedDeliveries = await prisma.webhookDelivery.findMany({
        where: {
          status: 'RETRYING',
          nextAttemptAt: {
            lte: new Date(),
          },
          attempts: {
            lt: this.MAX_RETRIES,
          },
        },
        include: {
          merchant: {
            select: {
              webhookUrl: true,
              webhookSecret: true,
            },
          },
        },
      });

      for (const delivery of failedDeliveries) {
        if (!delivery.merchant.webhookUrl) continue;

        await this.attemptDelivery(
          delivery.id,
          delivery.merchant.webhookUrl,
          delivery.merchant.webhookSecret || '',
          delivery.payload as Record<string, unknown>,
          delivery.attempts
        );
      }

      return failedDeliveries.length;
    } catch (error) {
      logger.error('Failed to retry webhooks', error);
      return 0;
    }
  }
}
