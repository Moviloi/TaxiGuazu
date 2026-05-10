import { NextRequest, NextResponse } from 'next/server';
import { takeConversation, releaseConversation, deleteConversation } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id);
    const body = await request.json();
    const { action } = body;

    if (action === 'take') {
      takeConversation(convId);
      return NextResponse.json({ ok: true });
    }

    if (action === 'release') {
      releaseConversation(convId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id);
    deleteConversation(convId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
