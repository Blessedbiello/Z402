// Jest setup file for backend tests

beforeAll(async () => {
  // Setup test environment
  // NOTE: These are intentionally hardcoded test values and pose no security risk.
  // They are only used in isolated test environments and never in production.
  // See SECURITY.md for more information.
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/z402_test';
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset state before each test
});

afterEach(() => {
  // Cleanup after each test
});
