# {{PROJECT_NAME}}

A Z402-integrated Express application built with JavaScript.

## Features

- ✅ Z402 payment integration
- ✅ Webhook support
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

Edit `.env` and add your Z402 API credentials.

### Development

Start the development server:

```bash
npm run dev
```

The server will start on http://localhost:3000

### Production

Start the production server:

```bash
npm start
```

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /api/premium` - Premium content (requires payment)
- `POST /webhooks/z402` - Webhook events

## Documentation

- [Z402 Documentation](https://docs.z402.io)
- [Express Documentation](https://expressjs.com)

## License

MIT
