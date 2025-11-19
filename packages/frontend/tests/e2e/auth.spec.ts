import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Z402/);
    await expect(page.locator('h1')).toContainText(/Sign in|Login/i);
  });

  test('should register a new merchant', async ({ page }) => {
    // Navigate to register page
    await page.click('text=Sign up');

    // Fill registration form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    await page.fill('input[name="businessName"]', 'Test Business');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText(/Dashboard|Overview/i);
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.click('text=Sign up');

    // Try to submit with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/invalid email|valid email/i')).toBeVisible();
    await expect(page.locator('text=/password.*short|at least/i')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/invalid credentials|incorrect/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login|\/$/);

    // Should clear auth cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token' || c.name === 'session');
    expect(authCookie).toBeUndefined();
  });

  test('should persist login after page refresh', async ({ page }) => {
    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText(/Dashboard|Overview/i);
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard/transactions');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
