# Z402 CLI Tests

This directory contains the test suite for the Z402 CLI package.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/commands/init.test.ts
```

## Test Structure

```
tests/
├── cli.test.ts              # Main CLI tests
├── commands/                # Command-specific tests
│   ├── init.test.ts        # Init command tests
│   ├── login.test.ts       # Login/logout tests
│   ├── keys.test.ts        # API key management tests
│   ├── deploy.test.ts      # Deployment tests
│   └── generate.test.ts    # Code generation tests
└── utils/                   # Utility function tests
    ├── config.test.ts      # Configuration tests
    └── logger.test.ts      # Logger tests
```

## Test Coverage Goals

- **Unit Tests**: Test individual functions and modules in isolation
- **Integration Tests**: Test command workflows end-to-end
- **Edge Cases**: Test error handling and edge cases

## Writing Tests

### Example Test

```typescript
describe('MyCommand', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Best Practices

1. Use descriptive test names
2. Follow Arrange-Act-Assert pattern
3. Mock external dependencies (filesystem, network, etc.)
4. Clean up after tests
5. Test both success and error cases

## Current Status

The test suite currently contains placeholder tests that serve as a framework for implementing full test coverage. Each test file includes:

- Test structure and organization
- Common test scenarios
- Placeholder assertions

Future work should implement actual test logic to achieve comprehensive coverage.

## Coverage Requirements

Target coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%
