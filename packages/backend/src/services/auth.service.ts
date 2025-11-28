import bcrypt from 'bcrypt';
import prisma from '../db';
import { JWTService, TokenPair } from '../utils/jwt';
import { logger } from '../config/logger';
import { zcashClient } from '../integrations/zcash';
import { EmailService } from './email.service';

/**
 * Authentication Service
 */

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  businessName?: string;
  businessType?: string;
  website?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  merchant?: {
    id: string;
    email: string;
    name: string;
    isVerified: boolean;
  };
  tokens?: TokenPair;
  error?: string;
}

export class AuthService {
  /**
   * Register a new merchant
   */
  static async register(input: RegisterInput): Promise<AuthResult> {
    try {
      // Check if email already exists
      const existing = await prisma.merchant.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Generate Zcash addresses
      const zcashAddress = await zcashClient.createTransparentAddress();
      const zcashShieldedAddress = await zcashClient.createShieldedAddress();

      // Create merchant
      const merchant = await prisma.merchant.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          businessName: input.businessName,
          businessType: input.businessType,
          website: input.website,
          zcashAddress,
          zcashShieldedAddress,
          isActive: true,
          isVerified: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
        },
      });

      // Generate tokens
      const tokens = JWTService.generateTokenPair(merchant.id, merchant.email);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          action: 'CREATE',
          resourceType: 'Merchant',
          resourceId: merchant.id,
          metadata: {
            email: merchant.email,
            name: merchant.name,
          },
        },
      });

      // Send verification email
      try {
        const verificationToken = JWTService.generateEmailVerificationToken(merchant.email);
        await EmailService.sendVerificationEmail(merchant.email, verificationToken);
        logger.info('Verification email sent', { merchantId: merchant.id, email: merchant.email });
      } catch (emailError) {
        logger.error('Failed to send verification email', {
          merchantId: merchant.id,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
        // Don't fail registration if email fails
      }

      logger.info('Merchant registered', { merchantId: merchant.id, email: merchant.email });

      return {
        success: true,
        merchant,
        tokens,
      };
    } catch (error) {
      logger.error('Registration failed', error);
      return {
        success: false,
        error: 'Registration failed',
      };
    }
  }

  /**
   * Login merchant
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    try {
      // Find merchant
      const merchant = await prisma.merchant.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          isActive: true,
          isVerified: true,
        },
      });

      if (!merchant) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check if account is active
      if (!merchant.isActive) {
        return {
          success: false,
          error: 'Account is inactive',
        };
      }

      // Verify password
      const validPassword = await bcrypt.compare(input.password, merchant.passwordHash);

      if (!validPassword) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Generate tokens
      const tokens = JWTService.generateTokenPair(merchant.id, merchant.email);

      // Update last login
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { lastLoginAt: new Date() },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          merchantId: merchant.id,
          action: 'LOGIN',
          resourceType: 'Merchant',
          resourceId: merchant.id,
        },
      });

      logger.info('Merchant logged in', { merchantId: merchant.id });

      return {
        success: true,
        merchant: {
          id: merchant.id,
          email: merchant.email,
          name: merchant.name,
          isVerified: merchant.isVerified,
        },
        tokens,
      };
    } catch (error) {
      logger.error('Login failed', error);
      return {
        success: false,
        error: 'Login failed',
      };
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(refreshToken);

      if (!payload) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      // Get merchant
      const merchant = await prisma.merchant.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          isVerified: true,
        },
      });

      if (!merchant || !merchant.isActive) {
        return {
          success: false,
          error: 'Invalid merchant',
        };
      }

      // Generate new token pair
      const tokens = JWTService.generateTokenPair(merchant.id, merchant.email);

      return {
        success: true,
        merchant: {
          id: merchant.id,
          email: merchant.email,
          name: merchant.name,
          isVerified: merchant.isVerified,
        },
        tokens,
      };
    } catch (error) {
      logger.error('Token refresh failed', error);
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const email = JWTService.verifyEmailVerificationToken(token);

      if (!email) {
        return {
          success: false,
          error: 'Invalid verification token',
        };
      }

      // Update merchant
      const merchant = await prisma.merchant.update({
        where: { email },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      logger.info('Email verified', { merchantId: merchant.id });

      return { success: true };
    } catch (error) {
      logger.error('Email verification failed', error);
      return {
        success: false,
        error: 'Verification failed',
      };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string }> {
    try {
      // Check if merchant exists
      const merchant = await prisma.merchant.findUnique({
        where: { email },
      });

      if (!merchant) {
        // Don't reveal if email exists
        return { success: true };
      }

      // Generate reset token
      const token = JWTService.generatePasswordResetToken(email);

      // Send password reset email
      try {
        await EmailService.sendPasswordResetEmail(email, token);
        logger.info('Password reset email sent', { email });
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          email,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
        // Don't fail the request if email fails
      }

      logger.info('Password reset requested', { email });

      return { success: true, token };
    } catch (error) {
      logger.error('Password reset request failed', error);
      return { success: false };
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const email = JWTService.verifyPasswordResetToken(token);

      if (!email) {
        return {
          success: false,
          error: 'Invalid reset token',
        };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update merchant
      await prisma.merchant.update({
        where: { email },
        data: { passwordHash },
      });

      logger.info('Password reset', { email });

      return { success: true };
    } catch (error) {
      logger.error('Password reset failed', error);
      return {
        success: false,
        error: 'Password reset failed',
      };
    }
  }

  /**
   * Logout (revoke tokens)
   */
  static async logout(userId: string): Promise<void> {
    try {
      // Create audit log
      await prisma.auditLog.create({
        data: {
          merchantId: userId,
          action: 'LOGOUT',
          resourceType: 'Merchant',
          resourceId: userId,
        },
      });

      // In a production system, you might invalidate tokens here
      // For now, we rely on short-lived access tokens

      logger.info('Merchant logged out', { userId });
    } catch (error) {
      logger.error('Logout failed', error);
    }
  }
}
