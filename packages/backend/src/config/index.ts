import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  // Zcash Configuration
  zcash: {
    network: process.env.ZCASH_NETWORK || 'testnet', // 'testnet' or 'mainnet'
    rpcUrl: process.env.ZCASH_RPC_URL || '',
    rpcUser: process.env.ZCASH_RPC_USER || '',
    rpcPassword: process.env.ZCASH_RPC_PASSWORD || '',
  },

  // API Keys
  apiKeys: {
    encryptionKey: process.env.API_KEY_ENCRYPTION_KEY || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'console', // 'sendgrid' | 'aws-ses' | 'smtp' | 'console'
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@z402.io',
    fromName: process.env.EMAIL_FROM_NAME || 'Z402',

    // SendGrid
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },

    // AWS SES
    awsSes: {
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    },

    // SMTP
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    },
  },

  // Frontend URL (for email links)
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
} as const;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

if (config.nodeEnv === 'production') {
  requiredEnvVars.push('ZCASH_RPC_URL', 'ZCASH_RPC_USER', 'ZCASH_RPC_PASSWORD', 'API_KEY_ENCRYPTION_KEY');
}

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}
