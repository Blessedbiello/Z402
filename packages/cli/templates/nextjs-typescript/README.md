# {{PROJECT_NAME}}

A Z402-integrated Next.js application built with TypeScript.

## Features

- ✅ Z402 payment integration
- ✅ Next.js 14 App Router
- ✅ TypeScript
- ✅ Webhook support
- ⚡ Server-side payment verification
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
cp .env.example .env.local
```

Edit `.env.local` and add your Z402 API credentials.

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing the Payment Flow

1. **Visit the homepage** at `http://localhost:3000`

2. **Try the public API** at `http://localhost:3000/api/public`

3. **Access premium content** at `http://localhost:3000/api/premium`
   - You'll receive a payment URL
   - Complete the payment
   - Use the authorization token to access the content

### Production Build

Build for production:

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
│   └── app/
│       ├── api/
│       │   ├── public/
│       │   │   └── route.ts
│       │   ├── premium/
│       │   │   └── route.ts
│       │   └── webhooks/
│       │       └── z402/
│       │           └── route.ts
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
├── .env.local
├── next.config.js
├── tsconfig.json
└── package.json
```

## API Routes

### Public Routes

- `GET /api/public` - Public content (no payment required)

### Protected Routes

- `GET /api/premium` - Premium content (requires payment)

### Webhook Routes

- `POST /api/webhooks/z402` - Z402 webhook events

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `Z402_API_KEY` | Your Z402 API key | required |
| `Z402_MERCHANT_ID` | Your merchant ID | required |
| `Z402_NETWORK` | Network (testnet/mainnet) | testnet |

## Documentation

- [Z402 Documentation](https://docs.z402.io)
- [Next.js Documentation](https://nextjs.org/docs)

## Deployment

### Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

```bash
npm run build
vercel deploy
```

Make sure to set your environment variables in the Vercel dashboard.

## License

MIT
