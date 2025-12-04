import { Router } from 'express';
import paymentsRouter from './payments.routes';
import merchantsRouter from './merchants.routes';
import webhooksRouter from './webhooks.routes';
import x402Router from './x402.routes';
import authRouter from './auth.routes';
import keysRouter from './keys.routes';
import transactionsRouter from './transactions.routes';
import webhookManagementRouter from './webhook-management.routes';
import analyticsRouter from './analytics.routes';
import nearPaymentsRouter from './near-payments.routes';
import {
  apiRateLimit,
  authRateLimit,
  analyticsRateLimit,
  webhookTestRateLimit,
  apiKeyCreationRateLimit,
} from '../middleware/rateLimit';

const router = Router();

// Authentication routes (with stricter rate limiting)
router.use('/auth', authRateLimit, authRouter);

// API Routes (with general rate limiting)
router.use('/payments', apiRateLimit, paymentsRouter);
router.use('/near-payments', apiRateLimit, nearPaymentsRouter);
router.use('/merchants', apiRateLimit, merchantsRouter);
router.use('/webhooks', apiRateLimit, webhooksRouter);
router.use('/x402', apiRateLimit, x402Router);

// Merchant dashboard routes (with appropriate rate limits)
router.use('/keys', apiKeyCreationRateLimit, keysRouter);
router.use('/transactions', apiRateLimit, transactionsRouter);
router.use('/webhook-management', webhookTestRateLimit, webhookManagementRouter);
router.use('/analytics', analyticsRateLimit, analyticsRouter);

// API Info
router.get('/', (_req, res) => {
  res.json({
    name: 'Z402 API',
    version: '1.0.0',
    description: 'x402 payment facilitator for Zcash',
    documentation: '/api/v1/docs',
    endpoints: {
      // Authentication
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        verifyEmail: 'POST /api/v1/auth/verify-email',
        resetPassword: 'POST /api/v1/auth/reset-password',
        me: 'GET /api/v1/auth/me',
      },
      // API Keys
      keys: {
        list: 'GET /api/v1/keys',
        create: 'POST /api/v1/keys',
        get: 'GET /api/v1/keys/:id',
        update: 'PUT /api/v1/keys/:id',
        delete: 'DELETE /api/v1/keys/:id',
      },
      // Transactions
      transactions: {
        list: 'GET /api/v1/transactions',
        get: 'GET /api/v1/transactions/:id',
        refund: 'POST /api/v1/transactions/:id/refund',
        export: 'GET /api/v1/transactions/export/data',
        stats: 'GET /api/v1/transactions/stats/summary',
      },
      // Webhook Management
      webhookManagement: {
        configure: 'PUT /api/v1/webhook-management',
        get: 'GET /api/v1/webhook-management',
        test: 'POST /api/v1/webhook-management/test',
        logs: 'GET /api/v1/webhook-management/logs',
        retry: 'POST /api/v1/webhook-management/:id/retry',
        stats: 'GET /api/v1/webhook-management/stats',
      },
      // Analytics
      analytics: {
        overview: 'GET /api/v1/analytics/overview',
        revenue: 'GET /api/v1/analytics/revenue',
        transactions: 'GET /api/v1/analytics/transactions',
        topResources: 'GET /api/v1/analytics/top-resources',
        paymentMethods: 'GET /api/v1/analytics/payment-methods',
        customers: 'GET /api/v1/analytics/customers',
      },
      // X402 Protocol
      x402: {
        challenge: 'POST /api/v1/x402/challenge',
        verify: 'POST /api/v1/x402/verify',
        settle: 'POST /api/v1/x402/settle',
        status: 'GET /api/v1/x402/status/:id',
        health: 'GET /api/v1/x402/health',
      },
      // NEAR Intents Cross-Chain Payments
      nearPayments: {
        createIntent: 'POST /api/v1/near-payments/intents',
        submitDeposit: 'POST /api/v1/near-payments/deposit',
        getStatus: 'GET /api/v1/near-payments/status/:id',
        supportedTokens: 'GET /api/v1/near-payments/supported-tokens',
      },
      // Legacy endpoints
      payments: '/api/v1/payments',
      merchants: '/api/v1/merchants',
      webhooks: '/api/v1/webhooks',
    },
  });
});

export default router;
