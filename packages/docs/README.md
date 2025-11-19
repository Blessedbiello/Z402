# Z402 Documentation

Comprehensive documentation site for Z402 built with Next.js and Fumadocs.

## 🚀 Features

- **Modern Stack**: Next.js 14 + Fumadocs + MDX
- **Beautiful UI**: Stripe-inspired design with dark mode
- **Code Examples**: Syntax highlighting with copy-to-clipboard
- **Interactive**: API playground for testing endpoints
- **Search**: Full-text search across all documentation
- **Mobile-First**: Fully responsive design
- **Type-Safe**: TypeScript throughout

## 📚 Documentation Structure

```
content/
├── docs/
│   ├── getting-started/
│   │   ├── introduction.mdx
│   │   ├── how-x402-works.mdx
│   │   ├── why-zcash.mdx
│   │   ├── quick-start.mdx
│   │   └── hello-world.mdx
│   ├── guides/
│   │   ├── accept-payments.mdx
│   │   ├── webhooks.mdx
│   │   ├── refunds.mdx
│   │   ├── testing.mdx
│   │   ├── security.mdx
│   │   └── addresses.mdx
│   ├── api-reference/
│   │   ├── authentication.mdx
│   │   ├── payment-intents.mdx
│   │   ├── transactions.mdx
│   │   ├── webhooks.mdx
│   │   ├── errors.mdx
│   │   └── rate-limits.mdx
│   ├── sdk/
│   │   ├── typescript/
│   │   │   ├── installation.mdx
│   │   │   ├── client.mdx
│   │   │   ├── payments.mdx
│   │   │   ├── transactions.mdx
│   │   │   ├── webhooks.mdx
│   │   │   └── middleware.mdx
│   │   └── python/
│   │       ├── installation.mdx
│   │       ├── client.mdx
│   │       ├── ai-agents.mdx
│   │       ├── budget-management.mdx
│   │       └── frameworks.mdx
│   └── resources/
│       ├── examples.mdx
│       ├── videos.mdx
│       ├── migration.mdx
│       ├── faq.mdx
│       └── changelog.mdx
```

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## 📝 Writing Documentation

Documentation is written in MDX (Markdown + JSX). Example:

```mdx
---
title: Quick Start
description: Get started with Z402 in 5 minutes
---

import { Callout } from 'fumadocs-ui/components/callout';
import { CodeBlock } from '@/components/code-block';

# Quick Start

<Callout type="info">
  This guide will help you integrate Z402 in under 5 minutes.
</Callout>

## Install the SDK

<CodeBlock lang="bash">
npm install @z402/sdk
</CodeBlock>

## Create a Payment

<CodeBlock lang="typescript">
import { Z402 } from '@z402/sdk';

const z402 = new Z402({ apiKey: 'z402_test_...' });

const intent = await z402.payments.create({
  amount: '0.01',
  resource: '/api/premium'
});
</CodeBlock>
```

## 🎨 Components

### Code Block with Copy

```tsx
<CodeBlock lang="typescript" copy>
const intent = await z402.payments.create({ ... });
</CodeBlock>
```

### Callouts

```tsx
<Callout type="info">Informational message</Callout>
<Callout type="warning">Warning message</Callout>
<Callout type="error">Error message</Callout>
```

### Tabs

```tsx
<Tabs items={['TypeScript', 'Python', 'cURL']}>
  <Tab value="TypeScript">...</Tab>
  <Tab value="Python">...</Tab>
  <Tab value="cURL">...</Tab>
</Tabs>
```

### API Playground

```tsx
<APIPlayground
  method="POST"
  endpoint="/payment-intents"
  auth="Bearer YOUR_API_KEY"
/>
```

## 🔍 Search

Search is powered by Fumadocs search with fuzzy matching:

- Press `/` to focus search
- Search across all documentation
- Keyboard navigation support

## 🌙 Dark Mode

Dark mode is automatically detected from system preferences and can be toggled manually.

## 📱 Mobile Support

The documentation site is fully responsive with:
- Mobile-optimized navigation
- Touch-friendly components
- Adaptive layouts

## 🚢 Deployment

The site can be deployed to:
- Vercel (recommended)
- Netlify
- Any Node.js hosting

```bash
# Build
pnpm build

# The output will be in .next/
```

## 📄 License

MIT
