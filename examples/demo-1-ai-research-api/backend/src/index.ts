import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { z402Middleware } from '@z402/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// In-memory storage for demo analytics
interface PaymentRecord {
  timestamp: Date;
  amount: string;
  endpoint: string;
  paymentId: string;
}

const payments: PaymentRecord[] = [];

// Public endpoint - no payment required
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'AI Research API' });
});

// Public endpoint - info about paid endpoints
app.get('/api/info', (req, res) => {
  res.json({
    name: 'AI Research API',
    description: 'Premium research data powered by Z402 payments',
    endpoints: [
      {
        path: '/api/research/market-trends',
        price: '0.01 ZEC',
        description: 'Real-time market trend analysis',
      },
      {
        path: '/api/research/competitor-analysis',
        price: '0.01 ZEC',
        description: 'Comprehensive competitor intelligence',
      },
      {
        path: '/api/research/sentiment-analysis',
        price: '0.01 ZEC',
        description: 'Social media sentiment analysis',
      },
      {
        path: '/api/research/predictions',
        price: '0.015 ZEC',
        description: 'AI-powered market predictions',
      },
    ],
  });
});

// Analytics endpoint for dashboard
app.get('/api/analytics', (req, res) => {
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const last24h = payments.filter(
    (p) => Date.now() - p.timestamp.getTime() < 24 * 60 * 60 * 1000
  );

  res.json({
    totalPayments: payments.length,
    totalRevenue: totalRevenue.toFixed(4),
    paymentsLast24h: last24h.length,
    revenueLast24h: last24h
      .reduce((sum, p) => sum + parseFloat(p.amount), 0)
      .toFixed(4),
    recentPayments: payments.slice(-10).reverse(),
    endpointStats: getEndpointStats(),
  });
});

function getEndpointStats() {
  const stats: Record<string, { count: number; revenue: string }> = {};

  payments.forEach((p) => {
    if (!stats[p.endpoint]) {
      stats[p.endpoint] = { count: 0, revenue: '0' };
    }
    stats[p.endpoint].count++;
    stats[p.endpoint].revenue = (
      parseFloat(stats[p.endpoint].revenue) + parseFloat(p.amount)
    ).toFixed(4);
  });

  return stats;
}

// Protected endpoints - require Z402 payment

// Market Trends endpoint
app.use(
  '/api/research/market-trends',
  z402Middleware({
    amount: '0.01',
    resource: '/api/research/market-trends',
    apiKey: process.env.Z402_API_KEY,
    onError: (error, req, res) => {
      console.error('Z402 Error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    },
  })
);

app.get('/api/research/market-trends', (req, res) => {
  // Record payment
  if (req.z402Payment) {
    payments.push({
      timestamp: new Date(),
      amount: '0.01',
      endpoint: '/api/research/market-trends',
      paymentId: req.z402Payment.id,
    });
  }

  // Return premium research data
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      trends: [
        {
          sector: 'Technology',
          sentiment: 0.78,
          momentum: 'bullish',
          keyFactors: ['AI adoption', 'Cloud growth', 'Semiconductor demand'],
        },
        {
          sector: 'Healthcare',
          sentiment: 0.65,
          momentum: 'neutral',
          keyFactors: ['Biotech advances', 'Regulatory changes'],
        },
        {
          sector: 'Finance',
          sentiment: 0.72,
          momentum: 'bullish',
          keyFactors: ['Interest rate cuts', 'Digital banking growth'],
        },
      ],
      marketOverview: {
        volatilityIndex: 15.2,
        trendStrength: 'moderate',
        riskLevel: 'medium',
      },
    },
    payment: {
      verified: true,
      amount: '0.01 ZEC',
      endpoint: '/api/research/market-trends',
    },
  });
});

// Competitor Analysis endpoint
app.use(
  '/api/research/competitor-analysis',
  z402Middleware({
    amount: '0.01',
    resource: '/api/research/competitor-analysis',
    apiKey: process.env.Z402_API_KEY,
  })
);

app.get('/api/research/competitor-analysis', (req, res) => {
  if (req.z402Payment) {
    payments.push({
      timestamp: new Date(),
      amount: '0.01',
      endpoint: '/api/research/competitor-analysis',
      paymentId: req.z402Payment.id,
    });
  }

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      competitors: [
        {
          name: 'Competitor A',
          marketShare: 32.5,
          strengths: ['Brand recognition', 'Distribution network'],
          weaknesses: ['High prices', 'Slow innovation'],
          threatLevel: 'high',
        },
        {
          name: 'Competitor B',
          marketShare: 28.3,
          strengths: ['Innovation', 'Customer service'],
          weaknesses: ['Limited reach', 'Cash flow'],
          threatLevel: 'medium',
        },
        {
          name: 'Competitor C',
          marketShare: 18.7,
          strengths: ['Price advantage', 'Agility'],
          weaknesses: ['Quality concerns', 'Brand awareness'],
          threatLevel: 'low',
        },
      ],
      analysis: {
        yourPosition: 'challenger',
        opportunities: ['Market expansion', 'Product differentiation'],
        recommendations: [
          'Focus on innovation',
          'Strengthen distribution',
          'Improve customer experience',
        ],
      },
    },
    payment: {
      verified: true,
      amount: '0.01 ZEC',
    },
  });
});

// Sentiment Analysis endpoint
app.use(
  '/api/research/sentiment-analysis',
  z402Middleware({
    amount: '0.01',
    resource: '/api/research/sentiment-analysis',
    apiKey: process.env.Z402_API_KEY,
  })
);

app.get('/api/research/sentiment-analysis', (req, res) => {
  if (req.z402Payment) {
    payments.push({
      timestamp: new Date(),
      amount: '0.01',
      endpoint: '/api/research/sentiment-analysis',
      paymentId: req.z402Payment.id,
    });
  }

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      overallSentiment: 0.68,
      sentiment: 'positive',
      sources: [
        {
          platform: 'Twitter',
          sentiment: 0.72,
          volume: 45230,
          trending: ['#innovation', '#growth', '#bullish'],
        },
        {
          platform: 'Reddit',
          sentiment: 0.65,
          volume: 12340,
          trending: ['analysis', 'opportunity', 'investing'],
        },
        {
          platform: 'News',
          sentiment: 0.67,
          volume: 2341,
          trending: ['market rally', 'earnings beat', 'expansion'],
        },
      ],
      insights: {
        positiveDrivers: ['Strong earnings', 'Innovation news', 'Market expansion'],
        negativeDrivers: ['Regulatory concerns', 'Competition'],
        netSentiment: '+23% vs last week',
      },
    },
    payment: {
      verified: true,
      amount: '0.01 ZEC',
    },
  });
});

// Predictions endpoint - premium pricing
app.use(
  '/api/research/predictions',
  z402Middleware({
    amount: '0.015',
    resource: '/api/research/predictions',
    apiKey: process.env.Z402_API_KEY,
  })
);

app.get('/api/research/predictions', (req, res) => {
  if (req.z402Payment) {
    payments.push({
      timestamp: new Date(),
      amount: '0.015',
      endpoint: '/api/research/predictions',
      paymentId: req.z402Payment.id,
    });
  }

  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      predictions: [
        {
          asset: 'BTC',
          current: 42350,
          prediction1d: 43200,
          prediction7d: 45800,
          confidence: 0.78,
          factors: ['Technical breakout', 'Institutional buying'],
        },
        {
          asset: 'ETH',
          current: 2240,
          prediction1d: 2310,
          prediction7d: 2450,
          confidence: 0.72,
          factors: ['Network upgrades', 'DeFi growth'],
        },
        {
          asset: 'ZEC',
          current: 28.5,
          prediction1d: 29.2,
          prediction7d: 31.5,
          confidence: 0.68,
          factors: ['Privacy demand', 'Adoption growth'],
        },
      ],
      methodology: 'AI-powered ensemble model (95% historical accuracy)',
      disclaimer: 'Not financial advice. Past performance does not guarantee future results.',
    },
    payment: {
      verified: true,
      amount: '0.015 ZEC',
    },
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Research API running on port ${PORT}`);
  console.log(`📊 Analytics available at http://localhost:${PORT}/api/analytics`);
  console.log(`💰 Z402 payment protection enabled`);
});
