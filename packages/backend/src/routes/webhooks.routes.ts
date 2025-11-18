import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// List webhooks
router.get('/', authenticate, (req, res) => {
  res.json({
    message: 'List webhooks',
  });
});

// Create webhook
router.post('/', authenticate, (req, res) => {
  res.status(201).json({
    message: 'Webhook created',
    data: req.body,
  });
});

// Get webhook
router.get('/:webhookId', authenticate, (req, res) => {
  res.json({
    message: 'Webhook details',
    webhookId: req.params.webhookId,
  });
});

// Update webhook
router.put('/:webhookId', authenticate, (req, res) => {
  res.json({
    message: 'Webhook updated',
    webhookId: req.params.webhookId,
  });
});

// Delete webhook
router.delete('/:webhookId', authenticate, (req, res) => {
  res.json({
    message: 'Webhook deleted',
    webhookId: req.params.webhookId,
  });
});

// Webhook endpoint for receiving Zcash notifications
router.post('/zcash/notify', (req, res) => {
  // TODO: Implement Zcash notification handler
  res.json({
    message: 'Notification received',
  });
});

export default router;
