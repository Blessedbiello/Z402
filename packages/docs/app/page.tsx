import Link from 'next/link';
import { ArrowRight, Code, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl mb-6">
            Z402 Documentation
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Accept Zcash payments with HTTP 402. Privacy-preserving micropayments
            for your APIs and premium content.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs/api-reference"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-secondary transition-colors"
            >
              API Reference
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground text-sm">
              Accept payments in seconds with automatic verification and real-time webhooks.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
            <p className="text-muted-foreground text-sm">
              Built on Zcash for optional privacy. Support both shielded and transparent addresses.
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Developer Friendly</h3>
            <p className="text-muted-foreground text-sm">
              SDKs for TypeScript and Python. Framework integrations for Express, Next.js, FastAPI.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start Code */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Quick Start</h2>
          <div className="bg-card border border-border rounded-lg p-6">
            <pre className="text-sm overflow-x-auto">
              <code>{`import { Z402 } from '@z402/sdk';

const z402 = new Z402({ apiKey: 'z402_test_...' });

// Create payment intent
const intent = await z402.payments.create({
  amount: '0.01',
  resource: '/api/premium/data'
});

// Verify payment
const verified = await z402.payments.verify(intent.id);
if (verified.status === 'settled') {
  // Grant access to resource
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Z402. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
