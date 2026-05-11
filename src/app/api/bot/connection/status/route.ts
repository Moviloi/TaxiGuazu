import { NextResponse } from 'next/server';
import { getConnectionState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = getConnectionState();
  const storedStatus = state?.status || 'disconnected';
  const phone = state?.phone || process.env.BOT_PHONE || null;

  const isConnected = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  const status = isConnected ? 'connected' : storedStatus;

  return NextResponse.json({
    status,
    phone,
    qrPng: null,
    updatedAt: state?.updated_at,
    platform: 'whatsapp-business-api',
    phoneId: process.env.WHATSAPP_PHONE_ID || null,
  });
}