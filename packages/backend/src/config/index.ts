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
