import { NextRequest, NextResponse } from 'next/server';
import { setConversationMode } from '@/lib/db/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id);
    const body = await request.json();
    const { mode } = body;

    if (mode !== 'AI' && mode !== 'HUMAN') {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 });
    }

    await setConversationMode(convId, mode);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error setting mode:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
