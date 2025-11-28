/**
 * X-402 Protocol Utility Functions
 *
 * Provides encoding, decoding, and validation utilities for the
 * standard X-402 payment protocol.
 */

import {
  X402PaymentHeader,
  X402Version,
  PaymentScheme,
  BlockchainNetwork,
  X402PaymentRequirements,
  ZcashTransparentPayload,
  ZcashShieldedPayload,
} from '../types/x402.types';
import { logger } from '../config/logger';

/**
 * Decode base64-encoded X-PAYMENT header
 * @param paymentHeader Base64-encoded payment header string
 * @returns Decoded payment header object
 * @throws Error if decoding or parsing fails
 */
export function decodePaymentHeader(paymentHeader: string): X402PaymentHeader {
  try {
    const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    // Validate structure
    if (!parsed.x402Version || !parsed.scheme || !parsed.network || !parsed.payload) {
      throw new Error('Invalid payment header structure');
    }

    return parsed as X402PaymentHeader;
  } catch (error) {
    logger.error('Failed to decode payment header:', error);
    throw new Error('Invalid payment header encoding');
  }
}

/**
 * Encode payment header to base64
 * @param header Payment header object
 * @returns Base64-encoded string
 */
export function encodePaymentHeader(header: X402PaymentHeader): string {
  try {
    const json = JSON.stringify(header);
    return Buffer.from(json, 'utf-8').toString('base64');
  } catch (error) {
    logger.error('Failed to encode payment header:', error);
    throw new Error('Failed to encode payment header');
  }
}

/**
 * Validate X-402 protocol version
 * @param version Version number to validate
 * @returns True if valid, false otherwise
 */
export function validateX402Version(version: number): version is X402Version {
  return version === 1;
}

/**
 * Validate payment scheme
 * @param scheme Scheme string to validate
 * @returns True if valid, false otherwise
 */
export function validatePaymentScheme(scheme: string): scheme is PaymentScheme {
  return scheme === 'zcash-transparent' || scheme === 'zcash-shielded';
}

/**
 * Validate blockchain network
 * @param network Network string to validate
 * @returns True if valid, false otherwise
 */
export function validateBlockchainNetwork(network: string): network is BlockchainNetwork {
  return network === 'mainnet' || network === 'testnet';
}

/**
 * Validate scheme and network match
 * @param headerScheme Scheme from payment header
 * @param headerNetwork Network from payment header
 * @param reqScheme Scheme from payment requirements
 * @param reqNetwork Network from payment requirements
 * @returns Object with isValid and error message
 */
export function validateSchemeNetworkMatch(
  headerScheme: string,
  headerNetwork: string,
  reqScheme: string,
  reqNetwork: string
): { isValid: boolean; error: string | null } {
  if (headerScheme !== reqScheme) {
    return {
      isValid: false,
      error: `Scheme mismatch: header="${headerScheme}", requirements="${reqScheme}"`,
    };
  }

  if (headerNetwork !== reqNetwork) {
    return {
      isValid: false,
      error: `Network mismatch: header="${headerNetwork}", requirements="${reqNetwork}"`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Convert zatoshis (atomic units) to ZEC
 * @param zatoshis Amount in zatoshis (string or number)
 * @returns Amount in ZEC as number
 */
export function zatoshisToZec(zatoshis: string | number): number {
  const zatoshisNum = typeof zatoshis === 'string' ? parseFloat(zatoshis) : zatoshis;
  return zatoshisNum / 100000000;
}

/**
 * Convert ZEC to zatoshis (atomic units)
 * @param zec Amount in ZEC
 * @returns Amount in zatoshis as string
 */
export function zecToZatoshis(zec: number): string {
  return Math.floor(zec * 100000000).toString();
}

/**
 * Validate payment amount meets requirements
 * @param paymentAmount Amount from payment (in zatoshis)
 * @param requiredAmount Required amount (in zatoshis)
 * @param tolerance Tolerance in zatoshis (default: 1 satoshi)
 * @returns Object with isValid and error message
 */
export function validatePaymentAmount(
  paymentAmount: string,
  requiredAmount: string,
  tolerance: number = 1
): { isValid: boolean; error: string | null } {
  const paymentZec = zatoshisToZec(paymentAmount);
  const requiredZec = zatoshisToZec(requiredAmount);
  const toleranceZec = zatoshisToZec(tolerance);

  if (paymentZec < requiredZec - toleranceZec) {
    return {
      isValid: false,
      error: `Insufficient amount: paid=${paymentZec} ZEC, required=${requiredZec} ZEC`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate recipient address matches
 * @param paymentTo Recipient address from payment
 * @param requirementsPayTo Required recipient address
 * @returns Object with isValid and error message
 */
export function validateRecipientAddress(
  paymentTo: string,
  requirementsPayTo: string
): { isValid: boolean; error: string | null } {
  if (paymentTo !== requirementsPayTo) {
    return {
      isValid: false,
      error: `Recipient address mismatch: payment="${paymentTo}", required="${requirementsPayTo}"`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validate timestamp is not too old (prevent replay attacks)
 * @param timestamp Unix timestamp from payment
 * @param maxAgeSeconds Maximum age in seconds (default: 3600 = 1 hour)
 * @returns Object with isValid and error message
 */
export function validateTimestamp(
  timestamp: number,
  maxAgeSeconds: number = 3600
): { isValid: boolean; error: string | null } {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > maxAgeSeconds) {
    return {
      isValid: false,
      error: `Timestamp too old: age=${age}s, max=${maxAgeSeconds}s`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Extract transparent payload from payment header
 * @param header Payment header
 * @returns Transparent payload or null if not transparent
 */
export function extractTransparentPayload(
  header: X402PaymentHeader
): ZcashTransparentPayload | null {
  if (header.scheme !== 'zcash-transparent') {
    return null;
  }

  const payload = header.payload as ZcashTransparentPayload;

  // Validate required fields
  if (!payload.txid || !payload.amount || !payload.from || !payload.to || !payload.signature) {
    logger.warn('Invalid transparent payload structure');
    return null;
  }

  return payload;
}

/**
 * Extract shielded payload from payment header
 * @param header Payment header
 * @returns Shielded payload or null if not shielded
 */
export function extractShieldedPayload(
  header: X402PaymentHeader
): ZcashShieldedPayload | null {
  if (header.scheme !== 'zcash-shielded') {
    return null;
  }

  const payload = header.payload as ZcashShieldedPayload;

  // Validate required fields
  if (!payload.txid || !payload.amount || !payload.to) {
    logger.warn('Invalid shielded payload structure');
    return null;
  }

  return payload;
}

/**
 * Create payment requirements object
 * @param params Payment requirements parameters
 * @returns X402PaymentRequirements object
 */
export function createPaymentRequirements(params: {
  scheme: PaymentScheme;
  network: BlockchainNetwork;
  amount: number; // in ZEC
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  timeoutSeconds?: number;
  extra?: object;
}): X402PaymentRequirements {
  return {
    scheme: params.scheme,
    network: params.network,
    maxAmountRequired: zecToZatoshis(params.amount),
    resource: params.resource,
    description: params.description,
    mimeType: params.mimeType,
    outputSchema: null,
    payTo: params.payTo,
    maxTimeoutSeconds: params.timeoutSeconds || 3600,
    asset: 'ZEC',
    extra: params.extra || null,
  };
}

/**
 * Create X-PAYMENT-RESPONSE header
 * @param params Response parameters
 * @returns Base64-encoded response header
 */
export function createPaymentResponse(params: {
  success: boolean;
  txHash: string;
  confirmations: number;
  settledAt?: Date;
}): string {
  const response = {
    success: params.success,
    txHash: params.txHash,
    confirmations: params.confirmations,
    settledAt: (params.settledAt || new Date()).toISOString(),
  };

  return Buffer.from(JSON.stringify(response), 'utf-8').toString('base64');
}

/**
 * Validate complete payment header structure
 * @param header Payment header to validate
 * @returns Object with isValid and error message
 */
export function validatePaymentHeader(
  header: X402PaymentHeader
): { isValid: boolean; error: string | null } {
  // Validate version
  if (!validateX402Version(header.x402Version)) {
    return {
      isValid: false,
      error: `Unsupported X-402 version: ${header.x402Version}`,
    };
  }

  // Validate scheme
  if (!validatePaymentScheme(header.scheme)) {
    return {
      isValid: false,
      error: `Invalid payment scheme: ${header.scheme}`,
    };
  }

  // Validate network
  if (!validateBlockchainNetwork(header.network)) {
    return {
      isValid: false,
      error: `Invalid blockchain network: ${header.network}`,
    };
  }

  // Validate payload exists
  if (!header.payload) {
    return {
      isValid: false,
      error: 'Missing payment payload',
    };
  }

  // Scheme-specific validation
  if (header.scheme === 'zcash-transparent') {
    const payload = extractTransparentPayload(header);
    if (!payload) {
      return {
        isValid: false,
        error: 'Invalid transparent payment payload',
      };
    }
  } else if (header.scheme === 'zcash-shielded') {
    const payload = extractShieldedPayload(header);
    if (!payload) {
      return {
        isValid: false,
        error: 'Invalid shielded payment payload',
      };
    }
  }

  return { isValid: true, error: null };
}
