import { NextResponse } from 'next/server';

import { getWebPushPublicKey, isWebPushConfigured } from '@/lib/push/web-push';

export function GET() {
  return NextResponse.json({
    enabled: isWebPushConfigured(),
    publicKey: getWebPushPublicKey(),
  });
}
