import { NextRequest, NextResponse } from 'next/server';
import { Z402 } from '@z402/sdk';

const z402 = new Z402({
  apiKey: process.env.Z402_API_KEY,
  network: (process.env.Z402_NETWORK as 'testnet' | 'mainnet') || 'testnet',
});

export async function GET(req: NextRequest) {
  const authorization = req.headers.get('authorization');

  // Check if payment authorization is provided
  if (!authorization) {
    const paymentUrl = await z402.createPaymentIntent({
      amount: 0.01,
      resourceUrl: req.url,
    });

    return NextResponse.json(
      {
        error: 'Payment required',
        message: 'This content requires a payment of 0.01 ZEC',
        paymentUrl,
      },
      { status: 402 }
    );
  }

  // Verify the payment
  const isValid = await z402.verifyPayment(authorization);

  if (!isValid) {
    return NextResponse.json(
      {
        error: 'Invalid payment authorization',
        message: 'The provided payment token is invalid or expired',
      },
      { status: 401 }
    );
  }

  // Payment verified - return premium content
  return NextResponse.json({
    message: 'Premium content unlocked!',
    data: {
      secret: 'This is exclusive premium content',
      value: 'Only paid users can see this',
      timestamp: new Date().toISOString(),
    },
  });
}
