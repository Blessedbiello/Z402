import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new merchant account
 */
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.register(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(201).json({
      success: true,
      merchant: result.merchant,
      tokens: result.tokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(req.body);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      merchant: result.merchant,
      tokens: result.tokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.refreshToken(req.body.refreshToken);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      tokens: result.tokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

/**
 * POST /api/v1/auth/verify-email
 * Verify email address
 */
router.post('/verify-email', validate(verifyEmailSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.verifyEmail(req.body.token);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Email verification failed',
    });
  }
});

/**
 * POST /api/v1/auth/request-password-reset
 * Request password reset email
 */
router.post(
  '/request-password-reset',
  validate(requestPasswordResetSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.requestPasswordReset(req.body.email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
    } catch (error) {
      res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
    }
  }
);

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.resetPassword(req.body.token, req.body.password);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Password reset failed',
      });
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Logout (revoke tokens)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await AuthService.logout(userId);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const merchant = await require('../db').default.merchant.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        businessType: true,
        website: true,
        zcashAddress: true,
        zcashShieldedAddress: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      merchant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get merchant info',
    });
  }
});

export default router;
