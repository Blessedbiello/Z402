import { NextRequest, NextResponse } from 'next/server';
import { Z402 } from '@z402/sdk';

const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: (process.env.Z402_NETWORK as 'testnet' | 'mainnet') || 'testnet',
});

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-z402-signature');
    const event = await req.json();

    console.log('Webhook received:', event.type);

    // Verify webhook signature
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const isValid = z402.verifyWebhook(event, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'payment.created':
        console.log('Payment created:', event.data.id);
        break;

      case 'payment.verified':
        console.log('Payment verified:', event.data.id);
        // Grant access to content
        break;

      case 'payment.settled':
        console.log('Payment settled:', event.data.id);
        break;

      case 'payment.failed':
        console.log('Payment failed:', event.data.id);
        break;

      case 'payment.refunded':
        console.log('Payment refunded:', event.data.id);
        // Revoke access
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
