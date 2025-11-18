import { Router } from 'express';
import paymentsRouter from './payments.routes';
import merchantsRouter from './merchants.routes';
import webhooksRouter from './webhooks.routes';

const router = Router();

// API Routes
router.use('/payments', paymentsRouter);
router.use('/merchants', merchantsRouter);
router.use('/webhooks', webhooksRouter);

// API Info
router.get('/', (req, res) => {
  res.json({
    name: 'Z402 API',
    version: '1.0.0',
    description: 'x402 payment facilitator for Zcash',
    documentation: '/api/v1/docs',
  });
});

export default router;
