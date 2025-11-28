/**
 * Standard X-402 Protocol Type Definitions
 *
 * Based on Coinbase X-402 specification:
 * https://github.com/coinbase/x402
 *
 * These types define the standard X-402 facilitator API format,
 * separate from Z402's custom Stripe-like API.
 */

/**
 * X-402 Protocol Version
 * Currently only version 1 is supported
 */
export type X402Version = 1;

/**
 * Payment scheme identifier
 * For Zcash: 'zcash-transparent' or 'zcash-shielded'
 */
export type PaymentScheme = 'zcash-transparent' | 'zcash-shielded';

/**
 * Blockchain network identifier
 */
export type BlockchainNetwork = 'mainnet' | 'testnet';

/**
 * Supported payment kind (scheme + network combination)
 */
export interface X402PaymentKind {
  scheme: PaymentScheme;
  network: BlockchainNetwork;
}

/**
 * Response from GET /supported endpoint
 * Lists all payment scheme/network combinations the facilitator supports
 */
export interface X402SupportedResponse {
  kinds: X402PaymentKind[];
}

/**
 * Payment requirements specification
 * Describes what payment is required to access a resource
 */
export interface X402PaymentRequirements {
  /** Payment scheme (e.g., 'zcash-transparent') */
  scheme: PaymentScheme;

  /** Blockchain network (e.g., 'testnet', 'mainnet') */
  network: BlockchainNetwork;

  /** Maximum amount required in atomic units (zatoshis for Zcash) */
  maxAmountRequired: string;

  /** Target resource URI */
  resource: string;

  /** Human-readable resource description */
  description: string;

  /** Response content type */
  mimeType: string;

  /** Response structure definition (optional) */
  outputSchema?: object | null;

  /** Recipient address (merchant's address) */
  payTo: string;

  /** Response deadline in seconds */
  maxTimeoutSeconds: number;

  /** Asset identifier (e.g., 'ZEC') */
  asset: string;

  /** Scheme-specific metadata (optional) */
  extra?: object | null;
}

/**
 * Zcash transparent payment payload
 * Contains transaction details and proof of ownership
 */
export interface ZcashTransparentPayload {
  /** Blockchain transaction ID */
  txid: string;

  /** Amount in zatoshis */
  amount: string;

  /** Client's transparent address */
  from: string;

  /** Merchant's address (recipient) */
  to: string;

  /** ECDSA signature proving ownership of 'from' address */
  signature: string;

  /** Unix timestamp when payment was created */
  timestamp: number;
}

/**
 * Zcash shielded payment payload
 * Contains encrypted transaction details for privacy
 */
export interface ZcashShieldedPayload {
  /** Blockchain transaction ID */
  txid: string;

  /** Amount in zatoshis (may be encrypted) */
  amount: string;

  /** Client's shielded address (optional for privacy) */
  from?: string;

  /** Merchant's shielded address */
  to: string;

  /** Viewing key for merchant to decrypt (optional) */
  viewingKey?: string;

  /** Encrypted memo field (optional) */
  memo?: string;

  /** Unix timestamp when payment was created */
  timestamp: number;
}

/**
 * X-PAYMENT header structure (transmitted as base64-encoded JSON)
 * Contains payment proof and transaction details
 */
export interface X402PaymentHeader {
  /** Protocol version */
  x402Version: X402Version;

  /** Payment scheme */
  scheme: PaymentScheme;

  /** Blockchain network */
  network: BlockchainNetwork;

  /** Scheme-specific payment payload */
  payload: ZcashTransparentPayload | ZcashShieldedPayload;
}

/**
 * Request to POST /verify endpoint
 * Validates payment without executing settlement
 */
export interface X402VerifyRequest {
  /** Protocol version */
  x402Version: X402Version;

  /** Base64-encoded X-PAYMENT header JSON */
  paymentHeader: string;

  /** Payment requirements specification */
  paymentRequirements: X402PaymentRequirements;
}

/**
 * Response from POST /verify endpoint
 * Indicates whether payment is valid
 */
export interface X402VerifyResponse {
  /** Whether the payment is valid */
  isValid: boolean;

  /** Reason for invalidity (null if valid) */
  invalidReason: string | null;
}

/**
 * Request to POST /settle endpoint
 * Executes payment settlement on blockchain
 */
export interface X402SettleRequest {
  /** Protocol version */
  x402Version: X402Version;

  /** Base64-encoded X-PAYMENT header JSON */
  paymentHeader: string;

  /** Payment requirements specification */
  paymentRequirements: X402PaymentRequirements;
}

/**
 * Response from POST /settle endpoint
 * Indicates settlement success/failure
 */
export interface X402SettleResponse {
  /** Whether settlement succeeded */
  success: boolean;

  /** Error message (null if successful) */
  error: string | null;

  /** Blockchain transaction hash (null if failed) */
  txHash: string | null;

  /** Network identifier (null if failed) */
  networkId: string | null;
}

/**
 * 402 Payment Required response format
 * Returned when a resource requires payment
 */
export interface X402PaymentRequired {
  /** Protocol version */
  x402Version: X402Version;

  /** List of acceptable payment methods */
  accepts: X402PaymentRequirements[];

  /** Error message */
  error: string;
}

/**
 * X-PAYMENT-RESPONSE header structure
 * Returned after successful settlement
 */
export interface X402PaymentResponse {
  /** Whether payment was successful */
  success: boolean;

  /** Blockchain transaction hash */
  txHash: string;

  /** Number of confirmations */
  confirmations: number;

  /** Settlement timestamp */
  settledAt: string;
}

/**
 * Type guard to check if payload is transparent
 */
export function isTransparentPayload(
  payload: ZcashTransparentPayload | ZcashShieldedPayload
): payload is ZcashTransparentPayload {
  return 'signature' in payload && 'from' in payload;
}

/**
 * Type guard to check if payload is shielded
 */
export function isShieldedPayload(
  payload: ZcashTransparentPayload | ZcashShieldedPayload
): payload is ZcashShieldedPayload {
  return 'viewingKey' in payload || 'memo' in payload;
}
