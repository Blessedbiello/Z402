/**
 * Basic X402 Middleware Usage Example
 *
 * This example shows how to protect routes with x402 payment requirements
 */

import express from 'express';
import { requirePayment, verifyPaymentStatus, requireConfirmations } from '../src/middleware/x402.middleware';

const app = express();

// Example 1: Simple protected endpoint
app.get(
  '/api/premium-content',
  requirePayment({
    amount: 0.1, // 0.1 ZEC
    merchantId: 'merchant_id_here',
  }),
  (req, res) => {
    res.json({
      message: 'Welcome to premium content!',
      content: 'This is the protected data',
    });
  }
);

// Example 2: Dynamic pricing based on request
app.get(
  '/api/variable-price/:tier',
  requirePayment({
    amount: (req) => {
      const tier = req.params.tier;
      const prices: Record<string, number> = {
        basic: 0.05,
        premium: 0.1,
        enterprise: 0.5,
      };
      return prices[tier] || 0.1;
    },
  }),
  (req, res) => {
    res.json({
      tier: req.params.tier,
      content: `Access granted to ${req.params.tier} tier`,
    });
  }
);

// Example 3: Require payment confirmation
app.get(
  '/api/high-value-content',
  requirePayment({
    amount: 1.0,
  }),
  requireConfirmations(6), // Require 6 confirmations
  (req, res) => {
    res.json({
      message: 'High-value content unlocked',
      payment: (req as any).payment,
    });
  }
);

// Example 4: Payment verified callback
app.get(
  '/api/tracked-content',
  requirePayment({
    amount: 0.1,
    onPaymentVerified: (req, res) => {
      console.log('Payment verified for:', (req as any).payment);
      // Log to analytics, update database, etc.
    },
  }),
  (req, res) => {
    res.json({ message: 'Content delivered' });
  }
);

// Example 5: Custom metadata
app.post(
  '/api/download/:fileId',
  requirePayment({
    amount: 0.2,
    metadata: (req) => ({
      fileId: req.params.fileId,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    }),
  }),
  (req, res) => {
    res.json({
      downloadUrl: `https://example.com/files/${req.params.fileId}`,
      expiresIn: 3600,
    });
  }
);

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
