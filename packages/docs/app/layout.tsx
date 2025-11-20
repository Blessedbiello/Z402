import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Z402 Documentation',
    template: '%s | Z402 Docs',
  },
  description: 'Complete documentation for Z402 - Zcash x402 payment facilitator',
  keywords: ['Z402', 'Zcash', 'x402', 'payments', 'cryptocurrency', 'API', 'SDK'],
  authors: [{ name: 'Z402 Team' }],
  creator: 'Z402',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://docs.z402.io',
    title: 'Z402 Documentation',
    description: 'Complete documentation for Z402 - Zcash x402 payment facilitator',
    siteName: 'Z402 Docs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Z402 Documentation',
    description: 'Complete documentation for Z402 - Zcash x402 payment facilitator',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
