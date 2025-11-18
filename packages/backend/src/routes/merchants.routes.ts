import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Register a new merchant
router.post('/register', (req, res) => {
  // TODO: Implement merchant registration
  res.status(201).json({
    message: 'Merchant registered',
    data: req.body,
  });
});

// Get merchant profile
router.get('/profile', authenticate, (req, res) => {
  res.json({
    message: 'Merchant profile',
    // user: req.user,
  });
});

// Update merchant profile
router.put('/profile', authenticate, (req, res) => {
  res.json({
    message: 'Merchant profile updated',
    data: req.body,
  });
});

// Get API keys
router.get('/api-keys', authenticate, (req, res) => {
  res.json({
    message: 'API keys',
  });
});

// Generate new API key
router.post('/api-keys', authenticate, (req, res) => {
  res.status(201).json({
    message: 'API key generated',
  });
});

// Revoke API key
router.delete('/api-keys/:keyId', authenticate, (req, res) => {
  res.json({
    message: 'API key revoked',
    keyId: req.params.keyId,
  });
});

export default router;
