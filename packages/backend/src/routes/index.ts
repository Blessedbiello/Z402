import { Router } from 'express';
import paymentsRouter from './payments.routes';
import merchantsRouter from './merchants.routes';
import webhooksRouter from './webhooks.routes';
import x402Router from './x402.routes';

const router = Router();

// API Routes
router.use('/payments', paymentsRouter);
router.use('/merchants', merchantsRouter);
router.use('/webhooks', webhooksRouter);
router.use('/x402', x402Router);

// API Info
router.get('/', (req, res) => {
  res.json({
    name: 'Z402 API',
    version: '1.0.0',
    description: 'x402 payment facilitator for Zcash',
    documentation: '/api/v1/docs',
    endpoints: {
      payments: '/api/v1/payments',
      merchants: '/api/v1/merchants',
      webhooks: '/api/v1/webhooks',
      x402: '/api/v1/x402',
    },
  });
});

export default router;
