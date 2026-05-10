import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getConnectionState } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = getConnectionState();
    const status = state?.status || 'disconnected';
    const qrString = state?.qr_string || null;
    const phone = state?.phone || null;

    if (qrString && (status === 'qr' || status === 'connecting')) {
      const qrPng = await QRCode.toDataURL(qrString, { width: 320, margin: 2 });
      return NextResponse.json({
        status,
        qrPng,
        phone,
        updatedAt: state?.updated_at,
      });
    }

    return NextResponse.json({
      status,
      phone,
      qrPng: null,
      updatedAt: state?.updated_at,
    });
  } catch (error) {
    console.error('Error fetching connection status:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
