import { test, expect } from '@playwright/test';

test.describe('Payment Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create a payment intent via API', async ({ page, request }) => {
    // Get API key from developers page
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // Create payment intent via API
    const response = await request.post('http://localhost:3000/api/payment-intents', {
      headers: {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      },
      data: {
        amount: '0.01',
        resource: '/api/test/resource',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('zcashAddress');
    expect(data.status).toBe('pending');
  });

  test('should see new payment in transactions', async ({ page, request }) => {
    // Get API key
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // Create payment intent
    const response = await request.post('http://localhost:3000/api/payment-intents', {
      headers: {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      },
      data: {
        amount: '0.05',
        resource: '/api/premium/data',
      },
    });

    const payment = await response.json();

    // Navigate to transactions
    await page.goto('/dashboard/transactions');

    // Search for the payment
    await page.fill('[data-testid="search-input"]', payment.id);
    await page.waitForTimeout(500);

    // Should find the payment
    await expect(page.locator(`text=${payment.id}`)).toBeVisible();
    await expect(page.locator('text=0.05')).toBeVisible();
  });

  test('should complete payment flow', async ({ page, request }) => {
    // Get API key
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // 1. Create payment intent
    const createResponse = await request.post('http://localhost:3000/api/payment-intents', {
      headers: {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      },
      data: {
        amount: '0.01',
        resource: '/api/test/resource',
      },
    });

    const intent = await createResponse.json();
    expect(intent.status).toBe('pending');

    // 2. Simulate payment (in real scenario, this would be a Zcash transaction)
    const payResponse = await request.post(
      `http://localhost:3000/api/payment-intents/${intent.id}/pay`,
      {
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
        data: {
          transactionId: `zcash_tx_${Date.now()}`,
        },
      }
    );

    const paidIntent = await payResponse.json();
    expect(paidIntent.status).toBe('paid');

    // 3. Check transaction appears in dashboard
    await page.goto('/dashboard/transactions');
    await page.fill('[data-testid="search-input"]', intent.id);
    await page.waitForTimeout(500);

    // Should show as paid
    const row = page.locator(`tr:has-text("${intent.id}")`);
    await expect(row.locator('[data-status="paid"]')).toBeVisible();
  });

  test('should handle payment expiration', async ({ page, request }) => {
    // Get API key
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // Create payment intent
    const response = await request.post('http://localhost:3000/api/payment-intents', {
      headers: {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      },
      data: {
        amount: '0.01',
        resource: '/api/test/resource',
      },
    });

    const intent = await response.json();

    // Check expiration time is set
    expect(intent.expiresAt).toBeDefined();
    const expiresAt = new Date(intent.expiresAt);
    const now = new Date();
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());

    // In a real test, we'd wait or mock time to check expiration handling
    // For now, just verify the intent has an expiration time
  });

  test('should track payment analytics', async ({ page, request }) => {
    // Get API key
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // Create and complete multiple payments
    const payments = [];
    for (let i = 0; i < 3; i++) {
      const createResponse = await request.post('http://localhost:3000/api/payment-intents', {
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
        data: {
          amount: '0.01',
          resource: `/api/test/resource-${i}`,
        },
      });
      payments.push(await createResponse.json());
    }

    // Go to analytics page
    await page.goto('/dashboard/analytics');

    // Wait for metrics to load
    await page.waitForTimeout(1000);

    // Check that analytics reflect the new payments
    const totalTransactions = page.locator('[data-testid="total-transactions"]');
    const transactionCount = await totalTransactions.textContent();

    // Should have at least 3 transactions
    expect(parseInt(transactionCount || '0')).toBeGreaterThanOrEqual(3);
  });

  test('should handle refund flow', async ({ page, request }) => {
    // Get API key
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // Create and pay for a payment intent
    const createResponse = await request.post('http://localhost:3000/api/payment-intents', {
      headers: {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      },
      data: {
        amount: '0.02',
        resource: '/api/test/refund-test',
      },
    });

    const intent = await createResponse.json();

    await request.post(`http://localhost:3000/api/payment-intents/${intent.id}/pay`, {
      headers: {
        'x-api-key': apiKey || '',
        'Content-Type': 'application/json',
      },
      data: {
        transactionId: `zcash_tx_${Date.now()}`,
      },
    });

    // Go to transactions and find the payment
    await page.goto('/dashboard/transactions');
    await page.fill('[data-testid="search-input"]', intent.id);
    await page.waitForTimeout(500);

    // Click on transaction to open details
    await page.click(`text=${intent.id}`);

    // Click refund button
    await page.click('[data-testid="refund-button"]');

    // Confirm refund
    await page.fill('[data-testid="refund-reason"]', 'Customer request');
    await page.click('[data-testid="confirm-refund"]');

    // Should show success message
    await expect(page.locator('text=/Refunded|Refund successful/i')).toBeVisible();

    // Status should update to refunded
    await page.waitForTimeout(500);
    const status = page.locator('[data-testid="transaction-status"]');
    await expect(status).toContainText(/refunded/i);
  });

  test('should receive webhook for payment events', async ({ page, request }) => {
    // This test would require a webhook testing service or mock server
    // For now, we'll test the webhook configuration

    await page.goto('/dashboard/developers');

    // Configure webhook
    await page.fill('input[name="webhookUrl"]', 'https://webhook.site/unique-id');
    await page.check('input[value="payment.succeeded"]');
    await page.check('input[value="payment.failed"]');
    await page.click('button:has-text("Save")');

    // Verify saved
    await expect(page.locator('text=/Saved|Updated successfully/i')).toBeVisible();

    // Test webhook
    await page.click('[data-testid="test-webhook"]');
    await page.waitForTimeout(2000);

    // Should show result
    await expect(page.locator('text=/sent|delivered/i')).toBeVisible();
  });

  test('should handle multiple concurrent payments', async ({ page, request }) => {
    // Get API key
    await page.goto('/dashboard/developers');
    const apiKey = await page.locator('[data-testid="api-key"]').textContent();

    // Create multiple payment intents concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      request.post('http://localhost:3000/api/payment-intents', {
        headers: {
          'x-api-key': apiKey || '',
          'Content-Type': 'application/json',
        },
        data: {
          amount: '0.01',
          resource: `/api/test/concurrent-${i}`,
        },
      })
    );

    const responses = await Promise.all(promises);

    // All should succeed
    for (const response of responses) {
      expect(response.ok()).toBeTruthy();
    }

    const intents = await Promise.all(responses.map(r => r.json()));

    // All should have unique IDs
    const ids = intents.map(i => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);

    // All should be visible in transactions
    await page.goto('/dashboard/transactions');
    await page.waitForTimeout(500);

    for (const intent of intents) {
      await page.fill('[data-testid="search-input"]', intent.id);
      await page.waitForTimeout(300);
      await expect(page.locator(`text=${intent.id}`)).toBeVisible();
    }
  });
});
