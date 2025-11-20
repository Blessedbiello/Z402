# @z402/cli

> Command-line interface for Z402 payment facilitator

[![npm version](https://img.shields.io/npm/v/@z402/cli.svg)](https://www.npmjs.com/package/@z402/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Powerful CLI tool for Z402 that makes project scaffolding and management effortless.

## Installation

```bash
npm install -g @z402/cli
```

Or use with npx:

```bash
npx @z402/cli init my-project
```

## Quick Start

```bash
# Initialize a new project
z402 init my-api

# Login to your Z402 account
z402 login

# Create an API key
z402 keys create --name "Development"

# Test a payment flow
z402 test payment --amount 0.01

# Deploy to production
z402 deploy
```

## Commands

### `z402 init`

Scaffold a new Z402-integrated project with interactive prompts.

```bash
z402 init my-api

# With options
z402 init my-api --type express --lang typescript
```

**Options:**
- `-t, --type <type>` - Project type (express, nextjs, fastapi, nestjs)
- `-l, --lang <language>` - Language (typescript, javascript, python)
- `--skip-install` - Skip dependency installation

**Interactive Prompts:**
- Project type
- Language
- Features (webhooks, analytics, shielded-only)
- Network (testnet, mainnet)

### `z402 login`

Authenticate with your Z402 account.

```bash
z402 login

# Login with API key
z402 login --api-key sk_live_...

# Login with credentials
z402 login --email you@example.com
```

**Methods:**
- Email & Password
- API Key
- Browser (OAuth)

### `z402 keys`

Manage API keys.

```bash
# List all API keys
z402 keys list

# Create a new API key
z402 keys create --name "Production API"

# Revoke an API key
z402 keys revoke key_abc123
```

### `z402 test`

Test payment flows locally without spending real ZEC.

```bash
# Test a payment
z402 test payment --amount 0.01

# Test webhook
z402 test webhook --event payment.verified
```

### `z402 logs`

Stream live transaction logs.

```bash
# Show recent transactions
z402 logs --tail 100

# Follow logs in real-time
z402 logs --follow

# Filter by status
z402 logs --status VERIFIED
```

### `z402 deploy`

Deploy your application with one command.

```bash
z402 deploy

# Deploy to specific platform
z402 deploy --platform railway

# Skip build step
z402 deploy --skip-build
```

**Supported Platforms:**
- Railway
- Render
- Vercel
- Fly.io
- Heroku

### `z402 webhooks`

Manage webhook configuration.

```bash
# View webhook config
z402 webhooks config

# Setup webhook endpoint
z402 webhooks setup --url https://api.example.com/webhooks/z402

# Send test webhook
z402 webhooks test

# View delivery logs
z402 webhooks logs

# Listen for webhooks locally
z402 webhooks listen
```

### `z402 analytics`

View analytics in your terminal.

```bash
# View analytics for last 7 days
z402 analytics

# Different time periods
z402 analytics --period 30d

# Export as JSON
z402 analytics --json
```

### `z402 generate` (alias: `g`)

Generate code snippets and boilerplate.

```bash
# Generate middleware
z402 generate middleware --framework express

# Generate protected route
z402 generate route --path /api/premium --amount 0.01

# Generate webhook handler
z402 generate webhook-handler
```

### `z402 upgrade`

Update all Z402 dependencies to latest versions.

```bash
# Upgrade with confirmation
z402 upgrade

# Skip confirmation
z402 upgrade --yes

# Dry run (show what would be upgraded)
z402 upgrade --dry-run
```

### Other Commands

```bash
# View current user
z402 whoami

# View configuration
z402 config --list

# Set configuration
z402 config --set environment=mainnet

# Open documentation
z402 docs

# Open dashboard
z402 dashboard

# Logout
z402 logout
```

## Project Templates

The CLI includes templates for:

- **Express + TypeScript** - RESTful API with Express.js
- **Next.js** - Full-stack application with API routes
- **FastAPI** - Python web framework
- **NestJS** - Enterprise Node.js framework
- **Plain Node.js** - Minimal Node.js setup

Each template includes:
- Pre-configured Z402 middleware
- Example protected routes
- Environment variable setup
- Docker configuration
- GitHub Actions CI/CD
- Comprehensive README

## Configuration

CLI configuration is stored in `~/.config/z402/config.json`

**Available Options:**
- `apiKey` - Your Z402 API key
- `merchantId` - Your merchant ID
- `environment` - testnet or mainnet
- `apiUrl` - API endpoint URL
- `telemetry` - Enable usage analytics (opt-in)

## Environment Variables

Add these to your `.env` file:

```bash
Z402_API_KEY=your-api-key-here
Z402_MERCHANT_ID=your-merchant-id
Z402_NETWORK=testnet
WEBHOOK_URL=https://api.example.com/webhooks/z402
WEBHOOK_SECRET=your-webhook-secret
```

## Examples

### Create and Deploy a New API

```bash
# Initialize project
z402 init premium-api --type express --lang typescript

# Navigate to project
cd premium-api

# Login and create API key
z402 login
z402 keys create --name "Premium API Key"

# Test locally
npm run dev

# Test payment flow
z402 test payment --amount 0.01

# Deploy to production
z402 deploy --platform railway
```

### Monitor Production Transactions

```bash
# View recent transactions
z402 logs --tail 50

# Follow transactions in real-time
z402 logs --follow --status VERIFIED

# View analytics
z402 analytics --period 30d
```

### Add Protected Route to Existing App

```bash
# Generate route
z402 generate route --path /api/premium --amount 0.05

# Generate middleware if needed
z402 generate middleware --framework express
```

## Shell Completion

Enable tab completion for your shell:

```bash
# Bash
z402 completion bash >> ~/.bashrc

# Zsh
z402 completion zsh >> ~/.zshrc

# Fish
z402 completion fish >> ~/.config/fish/completions/z402.fish
```

## Troubleshooting

### Authentication Issues

```bash
# Clear credentials and re-login
z402 logout
z402 login
```

### Package Updates

```bash
# Update CLI to latest version
npm install -g @z402/cli@latest

# Update project dependencies
z402 upgrade
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=z402:* z402 [command]
```

## Support

- **Documentation**: https://docs.z402.io
- **GitHub Issues**: https://github.com/z402/z402/issues
- **Discord**: https://discord.gg/z402

## License

MIT © Z402

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/z402/z402/blob/main/CONTRIBUTING.md).

---

Built with ❤️ by the Z402 team
