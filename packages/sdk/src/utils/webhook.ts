/**
 * Webhook signature verification utilities
 */

import * as crypto from 'crypto';
import { WebhookVerificationError } from '../errors';
import type { WebhookEvent } from '../types';

/**
 * Verifies webhook signature and returns parsed event
 * @param payload Raw request body as string or buffer
 * @param signature Signature from z402-signature header
 * @param secret Your webhook secret
 * @returns Parsed webhook event
 * @throws WebhookVerificationError if signature is invalid
 */
export function verifyWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
): WebhookEvent {
  if (!signature) {
    throw new WebhookVerificationError('Missing signature header');
  }

  if (!secret) {
    throw new WebhookVerificationError('Webhook secret not provided');
  }

  // Parse signature (format: t=timestamp,v1=signature)
  const parts = signature.split(',');
  const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
  const providedSignature = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !providedSignature) {
    throw new WebhookVerificationError('Invalid signature format');
  }

  // Check timestamp is within 5 minutes
  const timestampMs = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  const tolerance = 5 * 60 * 1000; // 5 minutes

  if (Math.abs(now - timestampMs) > tolerance) {
    throw new WebhookVerificationError('Signature timestamp too old');
  }

  // Compute expected signature
  const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
  const signedPayload = `${timestamp}.${payloadString}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (constant time to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
    throw new WebhookVerificationError('Invalid signature');
  }

  // Parse and return event
  try {
    return JSON.parse(payloadString);
  } catch (error) {
    throw new WebhookVerificationError('Invalid JSON payload');
  }
}

/**
 * Constructs webhook signature (for testing purposes)
 * @param payload Webhook payload
 * @param secret Webhook secret
 * @returns Signature string
 */
export function constructWebhookSignature(payload: string | object, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
