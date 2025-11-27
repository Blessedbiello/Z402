/**
 * Zcash Cryptography Service
 *
 * Handles cryptographic operations for Zcash, including:
 * - Address validation and decoding
 * - Signature verification for transparent addresses
 * - Message signing and verification
 *
 * Security: This replaces the insecure HMAC-based signature scheme
 * with proper Zcash cryptographic signatures.
 */

import * as secp256k1 from 'secp256k1';
import bs58check from 'bs58check';
import crypto from 'crypto';
import { logger } from '../config/logger';

// Zcash address prefixes (Base58Check encoded)
const ZCASH_ADDRESS_PREFIXES = {
  // Mainnet
  MAINNET_P2PKH: [0x1c, 0xb8], // t1
  MAINNET_P2SH: [0x1c, 0xbd],  // t3
  MAINNET_SAPLING: [0x16, 0x9a], // zs

  // Testnet
  TESTNET_P2PKH: [0x1d, 0x25], // tm or tn
  TESTNET_P2SH: [0x1c, 0xba],  // t2
  TESTNET_SAPLING: [0x16, 0xb6], // ztestsapling
};

export interface ZcashAddress {
  type: 'transparent' | 'shielded';
  network: 'mainnet' | 'testnet';
  address: string;
  pubKeyHash?: Buffer; // For transparent addresses
}

export interface SignatureVerificationResult {
  valid: boolean;
  address?: string;
  message?: string;
  error?: string;
}

export class ZcashCryptoService {

  /**
   * Validates and decodes a Zcash address
   * Returns address information if valid, throws if invalid
   */
  static validateAddress(address: string): ZcashAddress {
    try {
      // Check if it's a shielded address (starts with 'z')
      if (address.startsWith('z')) {
        return this.validateShieldedAddress(address);
      }

      // Otherwise it's a transparent address (starts with 't')
      if (address.startsWith('t')) {
        return this.validateTransparentAddress(address);
      }

      throw new Error('Invalid Zcash address: must start with t or z');
    } catch (error) {
      logger.error('Address validation failed:', error);
      throw new Error(`Invalid Zcash address: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Validates a transparent Zcash address (t-addr)
   * Uses Base58Check decoding to validate and extract public key hash
   */
  private static validateTransparentAddress(address: string): ZcashAddress {
    try {
      // Decode Base58Check
      const decoded = bs58check.decode(address);

      // Check prefix (first 2 bytes)
      const prefix = Array.from(decoded.slice(0, 2));

      // Determine network and type
      let network: 'mainnet' | 'testnet';

      if (this.arrayEquals(prefix, ZCASH_ADDRESS_PREFIXES.MAINNET_P2PKH) ||
          this.arrayEquals(prefix, ZCASH_ADDRESS_PREFIXES.MAINNET_P2SH)) {
        network = 'mainnet';
      } else if (this.arrayEquals(prefix, ZCASH_ADDRESS_PREFIXES.TESTNET_P2PKH) ||
                 this.arrayEquals(prefix, ZCASH_ADDRESS_PREFIXES.TESTNET_P2SH)) {
        network = 'testnet';
      } else {
        throw new Error('Unknown transparent address prefix');
      }

      // Extract public key hash (bytes 2-22)
      const pubKeyHash = decoded.slice(2);

      if (pubKeyHash.length !== 20) {
        throw new Error('Invalid public key hash length');
      }

      return {
        type: 'transparent',
        network,
        address,
        pubKeyHash: Buffer.from(pubKeyHash),
      };
    } catch (error) {
      throw new Error(`Invalid transparent address: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  /**
   * Validates a shielded Zcash address (z-addr)
   * Note: Full shielded address validation requires the Zcash node
   * This performs basic format validation
   */
  private static validateShieldedAddress(address: string): ZcashAddress {
    // Determine network based on prefix
    let network: 'mainnet' | 'testnet';

    if (address.startsWith('zs')) {
      network = 'mainnet'; // Sapling mainnet
    } else if (address.startsWith('ztestsapling')) {
      network = 'testnet'; // Sapling testnet
    } else if (address.startsWith('z')) {
      // Could be mainnet or testnet, need to decode to determine
      // For now, default to testnet for development
      network = 'testnet';
    } else {
      throw new Error('Invalid shielded address prefix');
    }

    // Shielded addresses are Base58Check encoded
    // Perform basic length validation (Sapling addresses are 78 chars)
    if (address.length < 50 || address.length > 100) {
      throw new Error('Invalid shielded address length');
    }

    return {
      type: 'shielded',
      network,
      address,
    };
  }

  /**
   * Verifies a signature for a transparent Zcash address
   *
   * @param message - The original message that was signed
   * @param signature - The signature in hex format (65 bytes: recovery ID + r + s)
   * @param address - The Zcash transparent address that allegedly signed the message
   * @returns Verification result with validity and details
   */
  static async verifyTransparentSignature(
    message: string,
    signature: string,
    address: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Validate the address
      const addressInfo = this.validateAddress(address);

      if (addressInfo.type !== 'transparent') {
        return {
          valid: false,
          error: 'Can only verify signatures for transparent addresses',
        };
      }

      // Hash the message (Bitcoin/Zcash message signing convention)
      const messageHash = this.hashMessage(message);

      // Decode signature (r, s, recoveryId format - 65 bytes total)
      // Format: [recoveryId (1 byte)][r (32 bytes)][s (32 bytes)]
      const sigBytes = Buffer.from(signature, 'hex');

      if (sigBytes.length !== 65) {
        return {
          valid: false,
          error: 'Invalid signature format: expected 65 bytes',
        };
      }

      // Extract components
      const recoveryId = sigBytes[0] - 27; // Bitcoin-style recovery ID (converts 27-30 to 0-3)
      const r = sigBytes.slice(1, 33);
      const s = sigBytes.slice(33, 65);

      // Validate recovery ID
      if (recoveryId < 0 || recoveryId > 3) {
        return {
          valid: false,
          error: 'Invalid recovery ID in signature',
        };
      }

      // Combine r and s into compact signature format (64 bytes)
      const compactSig = Buffer.concat([r, s]);

      try {
        // Recover the public key from the signature using native secp256k1
        const recoveredPublicKey = secp256k1.ecdsaRecover(
          compactSig,
          recoveryId,
          messageHash,
          false // uncompressed format
        );

        // Verify the signature with the recovered public key
        const isValid = secp256k1.ecdsaVerify(
          compactSig,
          messageHash,
          recoveredPublicKey
        );

        if (!isValid) {
          return {
            valid: false,
            error: 'Signature verification failed',
          };
        }

        // Derive the address from the recovered public key
        const derivedAddress = this.publicKeyToAddress(
          Buffer.from(recoveredPublicKey),
          addressInfo.network
        );

        // Verify that the derived address matches the claimed address
        if (derivedAddress !== address) {
          return {
            valid: false,
            error: 'Signature is valid but does not match the claimed address',
          };
        }

        // All checks passed
        return {
          valid: true,
          address,
          message,
        };
      } catch (verifyError) {
        logger.error('Signature verification error:', verifyError);
        return {
          valid: false,
          error: `Signature verification error: ${verifyError instanceof Error ? verifyError.message : 'unknown'}`,
        };
      }
    } catch (error) {
      logger.error('Address validation or parsing error:', error);
      return {
        valid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      };
    }
  }

  /**
   * Hashes a message using Bitcoin/Zcash message signing convention
   * Format: "\x18Bitcoin Signed Message:\n" + message_length + message
   * (Zcash uses the same convention as Bitcoin for transparent addresses)
   */
  private static hashMessage(message: string): Buffer {
    const prefix = Buffer.from('\x18Bitcoin Signed Message:\n', 'utf8');
    const messageBuffer = Buffer.from(message, 'utf8');
    const lengthBuffer = Buffer.from(messageBuffer.length.toString(), 'utf8');

    const fullMessage = Buffer.concat([prefix, lengthBuffer, messageBuffer]);

    // Double SHA-256 hash
    const hash1 = crypto.createHash('sha256').update(fullMessage).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();

    return hash2;
  }

  /**
   * Derives a Zcash transparent address from a public key
   */
  private static publicKeyToAddress(publicKey: Buffer, network: 'mainnet' | 'testnet'): string {
    // Hash the public key (SHA-256 then RIPEMD-160)
    const sha256Hash = crypto.createHash('sha256').update(publicKey).digest();
    const ripemd160Hash = crypto.createHash('ripemd160').update(sha256Hash).digest();

    // Add version prefix
    const prefix = network === 'mainnet'
      ? Buffer.from(ZCASH_ADDRESS_PREFIXES.MAINNET_P2PKH)
      : Buffer.from(ZCASH_ADDRESS_PREFIXES.TESTNET_P2PKH);

    const payload = Buffer.concat([prefix, ripemd160Hash]);

    // Encode with Base58Check
    return bs58check.encode(payload);
  }

  /**
   * Creates a challenge string for X-402 protocol
   * The client must sign this challenge with their Zcash private key
   *
   * @param paymentIntentId - The payment intent ID
   * @param amount - The payment amount in ZEC
   * @param merchantAddress - The merchant's Zcash address
   * @param timestamp - Challenge creation timestamp
   * @returns Challenge string to be signed
   */
  static createChallenge(
    paymentIntentId: string,
    amount: string,
    merchantAddress: string,
    timestamp: number
  ): string {
    // Create deterministic challenge string
    const challenge = JSON.stringify({
      paymentIntentId,
      amount,
      merchantAddress,
      timestamp,
      protocol: 'x402-zcash',
      version: '1.0',
    });

    return challenge;
  }

  /**
   * Verifies an X-402 authorization signature
   *
   * @param challenge - The original challenge string
   * @param signature - The signature from the client
   * @param clientAddress - The client's Zcash address
   * @returns Verification result
   */
  static async verifyX402Authorization(
    challenge: string,
    signature: string,
    clientAddress: string
  ): Promise<SignatureVerificationResult> {
    // Verify the challenge hasn't expired (5 minutes)
    try {
      const challengeData = JSON.parse(challenge);
      const age = Date.now() - challengeData.timestamp;

      if (age > 5 * 60 * 1000) {
        return {
          valid: false,
          error: 'Challenge has expired',
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid challenge format',
      };
    }

    // Verify the signature
    return this.verifyTransparentSignature(challenge, signature, clientAddress);
  }

  /**
   * Generates a secure payment proof hash
   * This hash can be used to verify payment details without exposing sensitive info
   */
  static generatePaymentProof(
    txid: string,
    amount: string,
    fromAddress: string,
    toAddress: string
  ): string {
    const data = `${txid}:${amount}:${fromAddress}:${toAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Utility: Compare two arrays for equality
   */
  private static arrayEquals(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, idx) => val === b[idx]);
  }
}
