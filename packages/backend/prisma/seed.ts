import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test merchant
  const passwordHash = await bcrypt.hash('testpassword', 10);

  const merchant = await prisma.merchant.upsert({
    where: { email: 'test@z402.com' },
    update: {},
    create: {
      email: 'test@z402.com',
      passwordHash,
      name: 'Test Merchant',
      zcashAddress: 't1YourTestZcashAddressHere',
    },
  });

  console.log('✅ Created test merchant:', merchant.email);

  // Create a test API key
  const apiKeyHash = await bcrypt.hash('test_api_key_123', 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      merchantId: merchant.id,
      keyHash: apiKeyHash,
      name: 'Test API Key',
    },
  });

  console.log('✅ Created test API key:', apiKey.name);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
