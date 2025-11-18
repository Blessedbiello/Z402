# Contributing to Z402

Thank you for your interest in contributing to Z402! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/z402.git`
3. Install dependencies: `pnpm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Setting Up Your Environment

1. Install prerequisites:
   - Node.js 20+
   - pnpm 8+
   - Docker and Docker Compose

2. Start the development environment:
   ```bash
   pnpm docker:up
   pnpm db:migrate
   ```

3. Run tests:
   ```bash
   pnpm test
   ```

### Code Style

We use ESLint and Prettier to maintain code quality and consistency.

- Run linting: `pnpm lint`
- Fix linting issues: `pnpm lint:fix`
- Format code: `pnpm format`

Please ensure your code passes all linting and formatting checks before submitting a PR.

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:
```
feat(payments): add refund functionality
fix(api): resolve authentication token expiration issue
docs(readme): update installation instructions
```

### Testing

- Write tests for new features
- Ensure all tests pass: `pnpm test`
- Maintain or improve code coverage
- Test both unit and integration scenarios

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Run `pnpm lint` and `pnpm format`
5. Update the README.md if needed
6. Create a Pull Request with a clear description

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
```

## Project Structure

```
Z402/
├── packages/
│   ├── backend/      # Express API
│   ├── frontend/     # Next.js dashboard
│   └── sdk/          # TypeScript SDK
├── docker/           # Docker configurations
└── ...
```

## Reporting Bugs

Use GitHub Issues to report bugs. Please include:

- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

## Feature Requests

We welcome feature requests! Please:

- Check if the feature has already been requested
- Provide a clear description and use case
- Explain why this feature would be useful

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

## Questions?

Feel free to open an issue with the `question` label.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
