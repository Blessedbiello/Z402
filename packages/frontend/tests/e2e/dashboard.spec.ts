import { test, expect } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.describe('Overview Page', () => {
    test('should display key metrics', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for stat cards
      await expect(page.locator('text=/Total Revenue/i')).toBeVisible();
      await expect(page.locator('text=/Total Transactions/i')).toBeVisible();
      await expect(page.locator('text=/Success Rate/i')).toBeVisible();
      await expect(page.locator('text=/Active/i')).toBeVisible();

      // Check for numeric values
      const revenueValue = page.locator('[data-testid="total-revenue"]');
      await expect(revenueValue).toBeVisible();
    });

    test('should display revenue chart', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for chart container
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();

      // Check for chart elements (Recharts creates SVG)
      await expect(page.locator('svg')).toBeVisible();
    });

    test('should display recent transactions table', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for table
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("Amount")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();

      // Check for at least one transaction row
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    });

    test('should navigate to transactions page', async ({ page }) => {
      await page.goto('/dashboard');

      // Click "View all" link in transactions section
      await page.click('text=/View all transactions|See all/i');

      // Should navigate to transactions page
      await expect(page).toHaveURL(/\/dashboard\/transactions/);
    });
  });

  test.describe('Transactions Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/transactions');
    });

    test('should display transactions table', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/Transactions/i);
      await expect(page.locator('table')).toBeVisible();

      // Check table headers
      await expect(page.locator('th:has-text("ID")')).toBeVisible();
      await expect(page.locator('th:has-text("Amount")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Date")')).toBeVisible();
    });

    test('should filter transactions by status', async ({ page }) => {
      // Open filter dropdown
      await page.click('[data-testid="status-filter"]');

      // Select "Paid" status
      await page.click('text=Paid');

      // Wait for filtered results
      await page.waitForTimeout(500);

      // All visible transactions should have "Paid" status
      const statusCells = page.locator('td[data-status]');
      const count = await statusCells.count();

      for (let i = 0; i < count; i++) {
        const status = await statusCells.nth(i).getAttribute('data-status');
        expect(status?.toLowerCase()).toBe('paid');
      }
    });

    test('should search transactions', async ({ page }) => {
      // Enter search query
      await page.fill('[data-testid="search-input"]', 'pi_test');

      // Wait for search results
      await page.waitForTimeout(500);

      // Check that results contain search term
      const firstRow = page.locator('tbody tr').first();
      await expect(firstRow).toContainText(/pi_test/i);
    });

    test('should paginate through transactions', async ({ page }) => {
      // Check if pagination exists (only if there are enough transactions)
      const pagination = page.locator('[data-testid="pagination"]');

      if (await pagination.isVisible()) {
        // Get current page transactions
        const firstPageFirstRow = await page.locator('tbody tr').first().textContent();

        // Click next page
        await page.click('[data-testid="next-page"]');
        await page.waitForTimeout(500);

        // Should show different transactions
        const secondPageFirstRow = await page.locator('tbody tr').first().textContent();
        expect(secondPageFirstRow).not.toBe(firstPageFirstRow);

        // Click previous page
        await page.click('[data-testid="prev-page"]');
        await page.waitForTimeout(500);

        // Should be back to first page
        const backToFirstRow = await page.locator('tbody tr').first().textContent();
        expect(backToFirstRow).toBe(firstPageFirstRow);
      }
    });

    test('should view transaction details', async ({ page }) => {
      // Click on first transaction
      await page.click('tbody tr:first-child');

      // Should open details modal/page
      await expect(page.locator('[data-testid="transaction-details"]')).toBeVisible();

      // Check for transaction details
      await expect(page.locator('text=/Transaction ID/i')).toBeVisible();
      await expect(page.locator('text=/Amount/i')).toBeVisible();
      await expect(page.locator('text=/Status/i')).toBeVisible();
    });

    test('should export transactions', async ({ page }) => {
      // Click export button
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-button"]');

      // Wait for download
      const download = await downloadPromise;

      // Check filename
      expect(download.suggestedFilename()).toMatch(/transactions.*\.(csv|xlsx)/);
    });
  });

  test.describe('Analytics Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/analytics');
    });

    test('should display analytics charts', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/Analytics/i);

      // Check for multiple charts
      const charts = page.locator('svg');
      const chartCount = await charts.count();
      expect(chartCount).toBeGreaterThan(0);
    });

    test('should change date range', async ({ page }) => {
      // Click date range selector
      await page.click('[data-testid="date-range"]');

      // Select "Last 7 days"
      await page.click('text=Last 7 days');

      // Wait for data to update
      await page.waitForTimeout(500);

      // Check that date range is applied
      await expect(page.locator('[data-testid="date-range"]')).toContainText(/7 days/i);
    });

    test('should display breakdown by resource', async ({ page }) => {
      // Check for resource breakdown section
      await expect(page.locator('text=/By Resource|Resource Breakdown/i')).toBeVisible();

      // Check for resource list
      const resources = page.locator('[data-testid="resource-item"]');
      await expect(resources.first()).toBeVisible();
    });
  });

  test.describe('Developers Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/developers');
    });

    test('should display API keys', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/Developers|API Keys/i);

      // Check for API key section
      await expect(page.locator('text=/API Key/i')).toBeVisible();
    });

    test('should copy API key', async ({ page }) => {
      // Click copy button
      await page.click('[data-testid="copy-api-key"]');

      // Should show success message
      await expect(page.locator('text=/Copied|Copied to clipboard/i')).toBeVisible();
    });

    test('should generate new API key', async ({ page }) => {
      // Get current API key
      const currentKey = await page.locator('[data-testid="api-key"]').textContent();

      // Click regenerate button
      await page.click('[data-testid="regenerate-api-key"]');

      // Confirm in dialog
      await page.click('[data-testid="confirm-regenerate"]');

      // Wait for new key
      await page.waitForTimeout(500);

      // New key should be different
      const newKey = await page.locator('[data-testid="api-key"]').textContent();
      expect(newKey).not.toBe(currentKey);
    });

    test('should display webhook configuration', async ({ page }) => {
      // Check for webhook section
      await expect(page.locator('text=/Webhook/i')).toBeVisible();

      // Check for webhook URL input
      await expect(page.locator('input[name="webhookUrl"]')).toBeVisible();
    });

    test('should update webhook URL', async ({ page }) => {
      // Enter webhook URL
      await page.fill('input[name="webhookUrl"]', 'https://example.com/webhook');

      // Select events
      await page.check('input[value="payment.succeeded"]');
      await page.check('input[value="payment.failed"]');

      // Save
      await page.click('button:has-text("Save")');

      // Should show success message
      await expect(page.locator('text=/Saved|Updated successfully/i')).toBeVisible();
    });

    test('should test webhook', async ({ page }) => {
      // Click test webhook button
      await page.click('[data-testid="test-webhook"]');

      // Should show loading state
      await expect(page.locator('[data-testid="test-webhook"]')).toContainText(/Testing|Sending/i);

      // Wait for result
      await page.waitForTimeout(2000);

      // Should show result
      await expect(
        page.locator('text=/Success|Failed|Webhook test/i')
      ).toBeVisible();
    });
  });

  test.describe('Settings Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/settings');
    });

    test('should display settings form', async ({ page }) => {
      await expect(page.locator('h1')).toContainText(/Settings/i);

      // Check for settings sections
      await expect(page.locator('text=/Business Information/i')).toBeVisible();
      await expect(page.locator('text=/Account Settings/i')).toBeVisible();
    });

    test('should update business information', async ({ page }) => {
      // Update business name
      await page.fill('input[name="businessName"]', 'Updated Business Name');
      await page.fill('input[name="businessEmail"]', 'updated@example.com');

      // Save
      await page.click('button:has-text("Save")');

      // Should show success message
      await expect(page.locator('text=/Saved|Updated successfully/i')).toBeVisible();

      // Refresh and check if changes persisted
      await page.reload();
      await expect(page.locator('input[name="businessName"]')).toHaveValue('Updated Business Name');
    });

    test('should change password', async ({ page }) => {
      // Navigate to password section
      await page.click('text=Change Password');

      // Fill password form
      await page.fill('input[name="currentPassword"]', 'password123');
      await page.fill('input[name="newPassword"]', 'newPassword123!');
      await page.fill('input[name="confirmPassword"]', 'newPassword123!');

      // Submit
      await page.click('button:has-text("Update Password")');

      // Should show success message
      await expect(page.locator('text=/Password updated|Changed successfully/i')).toBeVisible();
    });

    test('should toggle dark mode', async ({ page }) => {
      // Click theme toggle
      await page.click('[data-testid="theme-toggle"]');

      // Wait for theme to change
      await page.waitForTimeout(300);

      // Check if dark mode is applied
      const html = page.locator('html');
      const darkMode = await html.getAttribute('class');
      expect(darkMode).toContain('dark');

      // Toggle back
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(300);

      const lightMode = await html.getAttribute('class');
      expect(lightMode).not.toContain('dark');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages using sidebar', async ({ page }) => {
      await page.goto('/dashboard');

      // Navigate to each page via sidebar
      const pages = [
        { link: 'Transactions', url: '/dashboard/transactions' },
        { link: 'Analytics', url: '/dashboard/analytics' },
        { link: 'Developers', url: '/dashboard/developers' },
        { link: 'Settings', url: '/dashboard/settings' },
      ];

      for (const { link, url } of pages) {
        await page.click(`[data-testid="sidebar"] >> text=${link}`);
        await expect(page).toHaveURL(url);
      }

      // Navigate back to overview
      await page.click('[data-testid="sidebar"] >> text=/Overview|Dashboard/i');
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('should highlight active nav item', async ({ page }) => {
      await page.goto('/dashboard/transactions');

      // Transactions nav item should be active
      const transactionsNav = page.locator('[data-testid="nav-transactions"]');
      await expect(transactionsNav).toHaveClass(/active|bg-/);
    });
  });
});
