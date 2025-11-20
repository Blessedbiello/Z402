export interface Z402Config {
  apiKey?: string;
  merchantId?: string;
  environment?: 'testnet' | 'mainnet';
  apiUrl?: string;
  telemetry?: boolean;
}

export interface ProjectConfig {
  name: string;
  type: 'express' | 'nextjs' | 'fastapi' | 'nestjs' | 'nodejs';
  language: 'typescript' | 'javascript' | 'python';
  features: {
    webhooks: boolean;
    analytics: boolean;
    shieldedOnly: boolean;
  };
  network: 'testnet' | 'mainnet';
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface Transaction {
  id: string;
  amount: string;
  currency: string;
  status: string;
  resourceUrl: string;
  transactionId?: string;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
}

export interface Analytics {
  totalRevenue: string;
  totalTransactions: number;
  successRate: number;
  period: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}
