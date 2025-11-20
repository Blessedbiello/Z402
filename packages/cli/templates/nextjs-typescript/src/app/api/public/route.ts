import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Public endpoint - no payment required',
    data: {
      info: 'This content is free!',
      timestamp: new Date().toISOString(),
    },
  });
}
