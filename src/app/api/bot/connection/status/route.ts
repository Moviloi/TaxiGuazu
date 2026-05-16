import { NextResponse } from 'next/server';
import { getConnectionState } from '@/lib/db/database';
import { getEnv } from '@/config/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getConnectionState();
  const storedStatus = state?.status || 'disconnected';

  let env: ReturnType<typeof getEnv> | null = null;
  try { env = getEnv(); } catch {}

  const phone = state?.phone || env?.BOT_PHONE || null;

  const hasToken = !!(env?.WHATSAPP_TOKEN);
  const hasPhoneId = !!(env?.WHATSAPP_PHONE_ID);
  const hasVerifyToken = !!(env?.WHATSAPP_VERIFY_TOKEN);
  const hasBotPhone = !!(env?.BOT_PHONE);

  const isConnected = !!(env?.WHATSAPP_TOKEN && env?.WHATSAPP_PHONE_ID);
  const status = isConnected ? 'connected' : storedStatus;

  return NextResponse.json({
    status,
    phone,
    qrPng: null,
    updatedAt: state?.updated_at,
    platform: 'whatsapp-business-api',
    phoneId: env?.WHATSAPP_PHONE_ID || null,
    _debug: {
      hasToken,
      hasPhoneId,
      hasVerifyToken,
      hasBotPhone,
    },
  }, { status: 200 });
}