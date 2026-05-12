import { NextResponse } from 'next/server';
import { getConnectionState } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getConnectionState();
  const storedStatus = state?.status || 'disconnected';
  const phone = state?.phone || process.env.BOT_PHONE || null;

  const isConnected = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  const status = isConnected ? 'connected' : storedStatus;

  const hasToken = !!(process.env.WHATSAPP_TOKEN);
  const hasPhoneId = !!(process.env.WHATSAPP_PHONE_ID);
  const hasVerifyToken = !!(process.env.WHATSAPP_VERIFY_TOKEN);
  const hasBotPhone = !!(process.env.BOT_PHONE);
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY);

  return NextResponse.json({
    status,
    phone,
    qrPng: null,
    updatedAt: state?.updated_at,
    platform: 'whatsapp-business-api',
    phoneId: process.env.WHATSAPP_PHONE_ID || null,
    _debug: {
      hasToken,
      hasPhoneId,
      hasVerifyToken,
      hasBotPhone,
      hasGeminiKey,
    },
  }, { status: 200 });
}