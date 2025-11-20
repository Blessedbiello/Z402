# {{PROJECT_NAME}}

A Z402-integrated Express application built with TypeScript.

## Features

- ✅ Z402 payment integration
- ✅ Webhook support
- ✅ TypeScript
- ✅ Express.js
- 🔒 Helmet security headers
- 🌐 CORS enabled
- 🌐 Network: {{NETWORK}}

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Z402 account and API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Z402 API credentials:
- Get your API key: `z402 keys create --name "Development"`
- Get your merchant ID: `z402 whoami`

### Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on http://localhost:3000

### Testing the Payment Flow

1. **Access the public endpoint:**
```bash
curl http://localhost:3000/
```

2. **Try the protected endpoint (requires payment):**
```bash
curl http://localhost:3000/api/premium
```

You'll receive a 402 Payment Required response with a payment URL.

3. **Make a payment and access the content:**
Follow the payment URL, complete the payment, then use the authorization token:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/premium
```

### Production Build

Build the TypeScript code:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
.
├── src/
│   └── index.ts          # Main application file
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables (not in git)
├── .env.example          # Environment template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm test` - Run tests
- `npm run lint` - Lint code

## API Endpoints

### Public Endpoints

- `GET /` - API information
- `GET /health` - Health check

### Protected Endpoints (require payment)

- `GET /api/premium` - Premium content (0.01 ZEC)

### Webhook Endpoints

- `POST /webhooks/z402` - Z402 webhook events

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `Z402_API_KEY` | Your Z402 API key | required |
| `Z402_MERCHANT_ID` | Your merchant ID | required |
| `Z402_NETWORK` | Network (testnet/mainnet) | testnet |
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 3000 |

## Documentation

- [Z402 Documentation](https://docs.z402.io)
- [Z402 SDK Reference](https://docs.z402.io/sdk)
- [Express Documentation](https://expressjs.com)

## Support

- [GitHub Issues](https://github.com/z402/z402/issues)
- [Discord Community](https://discord.gg/z402)

## License

MIT
