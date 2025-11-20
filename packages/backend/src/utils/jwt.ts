import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../config/logger';
import prisma from '../db';

/**
 * JWT Utilities for Authentication
 */

export interface JWTPayload {
  id: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

  /**
   * Generate access and refresh tokens
   */
  static generateTokenPair(userId: string, email: string): TokenPair {
    const accessToken = this.generateAccessToken(userId, email);
    const refreshToken = this.generateRefreshToken(userId, email);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Generate access token
   */
  private static generateAccessToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      id: userId,
      email,
      type: 'access',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token
   */
  private static generateRefreshToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      id: userId,
      email,
      type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

      if (payload.type !== 'access') {
        logger.warn('Invalid token type', { type: payload.type });
        return null;
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('JWT verification failed', { error: error.message });
      }
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;

      if (payload.type !== 'refresh') {
        logger.warn('Invalid token type', { type: payload.type });
        return null;
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.debug('JWT verification failed', { error: error.message });
      }
      return null;
    }
  }

  /**
   * Generate email verification token
   */
  static generateEmailVerificationToken(email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    // Store hash in database (would need to add to schema)
    // For now, return a signed JWT
    return jwt.sign({ email, purpose: 'email-verification' }, config.jwt.secret, {
      expiresIn: '24h',
    });
  }

  /**
   * Verify email verification token
   */
  static verifyEmailVerificationToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;

      if (payload.purpose !== 'email-verification') {
        return null;
      }

      return payload.email;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(email: string): string {
    return jwt.sign({ email, purpose: 'password-reset' }, config.jwt.secret, {
      expiresIn: '1h',
    });
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): string | null {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;

      if (payload.purpose !== 'password-reset') {
        return null;
      }

      return payload.email;
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke all tokens for a user (by updating a token version in DB)
   */
  static async revokeAllTokens(userId: string): Promise<void> {
    // This would require adding a tokenVersion field to merchant table
    // For now, we'll just log
    logger.info('Revoking all tokens for user', { userId });
  }
}
