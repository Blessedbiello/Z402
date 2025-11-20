import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper to generate random Zcash addresses (for testing only)
const generateTestAddress = (type: 't' | 'z' = 't'): string => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = type === 't' ? 't1' : 'zs1';
  for (let i = 0; i < 32; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
};

// Helper to generate random payment hash
const generatePaymentHash = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

async function main() {
  console.log('🌱 Seeding Z402 database...');

  // ============================================================================
  // MERCHANTS
  // ============================================================================

  console.log('\n📦 Creating merchants...');

  const passwordHash = await bcrypt.hash('testpassword', 10);

  // Main test merchant
  const merchant1 = await prisma.merchant.upsert({
    where: { email: 'demo@z402.com' },
    update: {},
    create: {
      email: 'demo@z402.com',
      passwordHash,
      name: 'Demo Merchant',
      zcashAddress: generateTestAddress('t'),
      zcashShieldedAddress: generateTestAddress('z'),
      businessName: 'Demo Store Inc.',
      businessType: 'E-commerce',
      website: 'https://demo.z402.com',
      isVerified: true,
      verifiedAt: new Date(),
      webhookUrl: 'https://demo.z402.com/webhooks',
      webhookSecret: crypto.randomBytes(32).toString('hex'),
      settings: {
        notifications: { email: true, webhook: true },
        confirmations: 6,
        autoSettle: true,
      },
    },
  });

  console.log('✅ Created merchant:', merchant1.email);

  // Second test merchant
  const merchant2 = await prisma.merchant.upsert({
    where: { email: 'test@z402.com' },
    update: {},
    create: {
      email: 'test@z402.com',
      passwordHash,
      name: 'Test Merchant',
      zcashAddress: generateTestAddress('t'),
      businessName: 'Test Business LLC',
      businessType: 'API Service',
      website: 'https://test.z402.com',
      settings: {
        notifications: { email: true },
        confirmations: 3,
      },
    },
  });

  console.log('✅ Created merchant:', merchant2.email);

  // ============================================================================
  // API KEYS
  // ============================================================================

  console.log('\n🔑 Creating API keys...');

  const apiKey1Hash = await bcrypt.hash('sk_test_demo123456789abcdef', 10);
  const apiKey2Hash = await bcrypt.hash('sk_live_demo123456789abcdef', 10);

  const apiKeys = await prisma.apiKey.createMany({
    data: [
      {
        merchantId: merchant1.id,
        name: 'Development Key',
        keyHash: apiKey1Hash,
        keyPrefix: 'sk_test_demo',
        permissions: ['payments.read', 'payments.write'],
        scopes: ['read', 'write'],
        rateLimit: 1000,
      },
      {
        merchantId: merchant1.id,
        name: 'Production Key',
        keyHash: apiKey2Hash,
        keyPrefix: 'sk_live_demo',
        permissions: ['payments.read', 'payments.write', 'refunds.write'],
        scopes: ['read', 'write'],
        rateLimit: 5000,
      },
      {
        merchantId: merchant2.id,
        name: 'Test Key',
        keyHash: await bcrypt.hash('sk_test_test123456789abcdef', 10),
        keyPrefix: 'sk_test_test',
        permissions: ['payments.read'],
        scopes: ['read'],
      },
    ],
  });

  console.log(`✅ Created ${apiKeys.count} API keys`);

  // ============================================================================
  // PAYMENT INTENTS
  // ============================================================================

  console.log('\n💰 Creating payment intents...');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const paymentIntents = await prisma.paymentIntent.createMany({
    data: [
      {
        merchantId: merchant1.id,
        amount: new Prisma.Decimal('0.5'),
        currency: 'ZEC',
        status: 'CREATED',
        resourceUrl: 'https://demo.z402.com/api/premium-content/article-123',
        resourceType: 'api',
        zcashAddress: merchant1.zcashAddress,
        paymentHash: generatePaymentHash(),
        description: 'Access to premium article',
        metadata: { articleId: '123', tier: 'premium' },
        expiresAt: tomorrow,
      },
      {
        merchantId: merchant1.id,
        amount: new Prisma.Decimal('1.0'),
        currency: 'ZEC',
        status: 'SUCCEEDED',
        resourceUrl: 'https://demo.z402.com/api/download/file-456',
        resourceType: 'content',
        zcashAddress: merchant1.zcashAddress,
        paymentHash: generatePaymentHash(),
        description: 'Download access',
        metadata: { fileId: '456', size: '25MB' },
        expiresAt: tomorrow,
        completedAt: now,
      },
    ],
  });

  console.log(`✅ Created ${paymentIntents.count} payment intents`);

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================

  console.log('\n💸 Creating transactions...');

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const transactions = await prisma.transaction.createMany({
    data: [
      // Settled transaction
      {
        merchantId: merchant1.id,
        amount: new Prisma.Decimal('0.5'),
        currency: 'ZEC',
        status: 'SETTLED',
        paymentHash: generatePaymentHash(),
        transactionId: crypto.randomBytes(32).toString('hex'),
        blockHeight: 2450123,
        confirmations: 10,
        resourceUrl: 'https://demo.z402.com/api/data',
        clientAddress: generateTestAddress('t'),
        metadata: { orderId: 'ORD-001', customer: 'alice@example.com' },
        createdAt: lastWeek,
        settledAt: new Date(lastWeek.getTime() + 60 * 60 * 1000),
      },
      // Verified transaction
      {
        merchantId: merchant1.id,
        amount: new Prisma.Decimal('1.2'),
        currency: 'ZEC',
        status: 'VERIFIED',
        paymentHash: generatePaymentHash(),
        transactionId: crypto.randomBytes(32).toString('hex'),
        blockHeight: 2450567,
        confirmations: 3,
        resourceUrl: 'https://demo.z402.com/api/service',
        clientAddress: generateTestAddress('t'),
        metadata: { orderId: 'ORD-002' },
        createdAt: yesterday,
      },
      // Pending transaction
      {
        merchantId: merchant1.id,
        amount: new Prisma.Decimal('0.8'),
        currency: 'ZEC',
        status: 'PENDING',
        paymentHash: generatePaymentHash(),
        resourceUrl: 'https://demo.z402.com/api/access',
        metadata: { orderId: 'ORD-003' },
        createdAt: now,
        expiresAt: tomorrow,
      },
      // Multiple settled transactions for merchant 2
      {
        merchantId: merchant2.id,
        amount: new Prisma.Decimal('2.5'),
        currency: 'ZEC',
        status: 'SETTLED',
        paymentHash: generatePaymentHash(),
        transactionId: crypto.randomBytes(32).toString('hex'),
        blockHeight: 2450100,
        confirmations: 15,
        resourceUrl: 'https://test.z402.com/premium',
        clientAddress: generateTestAddress('t'),
        createdAt: lastWeek,
        settledAt: new Date(lastWeek.getTime() + 90 * 60 * 1000),
      },
      {
        merchantId: merchant2.id,
        amount: new Prisma.Decimal('0.3'),
        currency: 'ZEC',
        status: 'SETTLED',
        paymentHash: generatePaymentHash(),
        transactionId: crypto.randomBytes(32).toString('hex'),
        blockHeight: 2450400,
        confirmations: 8,
        resourceUrl: 'https://test.z402.com/api',
        clientAddress: generateTestAddress('t'),
        createdAt: yesterday,
        settledAt: new Date(yesterday.getTime() + 120 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Created ${transactions.count} transactions`);

  // ============================================================================
  // WEBHOOK DELIVERIES
  // ============================================================================

  console.log('\n🔔 Creating webhook deliveries...');

  const webhooks = await prisma.webhookDelivery.createMany({
    data: [
      {
        merchantId: merchant1.id,
        eventType: 'PAYMENT_SETTLED',
        eventId: crypto.randomUUID(),
        payload: {
          type: 'payment.settled',
          data: {
            id: 'tx_123',
            amount: 0.5,
            status: 'settled',
          },
        },
        status: 'SENT',
        httpStatusCode: 200,
        responseBody: '{"received": true}',
        attempts: 1,
        lastAttemptAt: lastWeek,
        deliveredAt: lastWeek,
      },
      {
        merchantId: merchant1.id,
        eventType: 'PAYMENT_VERIFIED',
        eventId: crypto.randomUUID(),
        payload: {
          type: 'payment.verified',
          data: {
            id: 'tx_456',
            amount: 1.2,
            confirmations: 3,
          },
        },
        status: 'SENT',
        httpStatusCode: 200,
        attempts: 1,
        lastAttemptAt: yesterday,
        deliveredAt: yesterday,
      },
    ],
  });

  console.log(`✅ Created ${webhooks.count} webhook deliveries`);

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  console.log('\n📊 Creating analytics data...');

  const analyticsData = [];

  // Generate daily metrics for the past 30 days
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    analyticsData.push(
      // Payment volume
      {
        merchantId: merchant1.id,
        metricType: 'PAYMENT_VOLUME',
        value: new Prisma.Decimal((Math.random() * 10).toFixed(2)),
        timestamp: date,
        tags: { period: 'daily' },
      },
      // Payment count
      {
        merchantId: merchant1.id,
        metricType: 'PAYMENT_COUNT',
        value: new Prisma.Decimal(Math.floor(Math.random() * 20)),
        timestamp: date,
        tags: { period: 'daily' },
      },
      // Success rate
      {
        merchantId: merchant1.id,
        metricType: 'SUCCESS_RATE',
        value: new Prisma.Decimal((85 + Math.random() * 10).toFixed(2)),
        timestamp: date,
        tags: { period: 'daily' },
      }
    );
  }

  const analytics = await prisma.analytics.createMany({
    data: analyticsData,
  });

  console.log(`✅ Created ${analytics.count} analytics records`);

  // ============================================================================
  // AUDIT LOG
  // ============================================================================

  console.log('\n📝 Creating audit log entries...');

  const auditLogs = await prisma.auditLog.createMany({
    data: [
      {
        merchantId: merchant1.id,
        action: 'LOGIN',
        resourceType: 'Merchant',
        resourceId: merchant1.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        createdAt: lastWeek,
      },
      {
        merchantId: merchant1.id,
        action: 'API_KEY_CREATED',
        resourceType: 'ApiKey',
        ipAddress: '192.168.1.100',
        metadata: { keyName: 'Development Key' },
        createdAt: lastWeek,
      },
      {
        merchantId: merchant1.id,
        action: 'PAYMENT_CREATED',
        resourceType: 'Transaction',
        ipAddress: '192.168.1.100',
        metadata: { amount: '0.5 ZEC' },
        createdAt: lastWeek,
      },
      {
        merchantId: merchant1.id,
        action: 'PAYMENT_SETTLED',
        resourceType: 'Transaction',
        metadata: { amount: '0.5 ZEC', confirmations: 10 },
        createdAt: new Date(lastWeek.getTime() + 60 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Created ${auditLogs.count} audit log entries`);

  // ============================================================================
  // SUMMARY
  // ============================================================================

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Database seeding completed successfully!');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log(`   Merchants: 2`);
  console.log(`   API Keys: ${apiKeys.count}`);
  console.log(`   Payment Intents: ${paymentIntents.count}`);
  console.log(`   Transactions: ${transactions.count}`);
  console.log(`   Webhook Deliveries: ${webhooks.count}`);
  console.log(`   Analytics Records: ${analytics.count}`);
  console.log(`   Audit Logs: ${auditLogs.count}`);
  console.log('\n🔑 Test Credentials:');
  console.log(`   Email: demo@z402.com`);
  console.log(`   Password: testpassword`);
  console.log(`   API Key: sk_test_demo123456789abcdef`);
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
