import express, { Request, Response, NextFunction } from 'express';
import { Z402 } from '@z402/sdk';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Z402
const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: (process.env.Z402_NETWORK as 'testnet' | 'mainnet') || 'testnet',
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Public endpoint
app.get('/', async (req: Request, res: Response) => {
  res.json({
    message: 'Z402-integrated API',
    version: '0.1.0',
    docs: 'https://docs.z402.io',
    network: process.env.Z402_NETWORK || 'testnet',
  });
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected endpoint - requires payment
app.get('/api/premium', z402.requirePayment({ amount: 0.01 }), async (req: Request, res: Response) => {
  res.json({
    message: 'This is premium content!',
    data: {
      secret: 'Only paid users see this',
      timestamp: new Date().toISOString()
    },
  });
});

// Webhook endpoint
app.post('/webhooks/z402', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const signature = req.headers['x-z402-signature'] as string;

    console.log('Webhook received:', event.type);

    // Verify webhook signature
    const isValid = z402.verifyWebhook(req.body, signature);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle event
    switch (event.type) {
      case 'payment.created':
        console.log('Payment created:', event.data.id);
        break;
      case 'payment.verified':
        console.log('Payment verified:', event.data.id);
        // Grant access to content
        break;
      case 'payment.settled':
        console.log('Payment settled:', event.data.id);
        break;
      case 'payment.failed':
        console.log('Payment failed:', event.data.id);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Network: ${process.env.Z402_NETWORK || 'testnet'}`);
  console.log('Protected endpoint: http://localhost:${port}/api/premium');
  console.log('Webhook endpoint: http://localhost:${port}/webhooks/z402');
});
