import { NextRequest, NextResponse } from 'next/server';
import { takeConversation, releaseConversation, deleteConversation } from '@/lib/db/database';
import { checkAdminAuth } from '@/lib/auth';
import { log } from "@/lib/utils/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;
  try {
    const { id } = await params;
    const convId = parseInt(id);
    const body = await request.json();
    const { action } = body;

    if (action === 'take') {
      await takeConversation(convId);
      return NextResponse.json({ ok: true });
    }

    if (action === 'release') {
      await releaseConversation(convId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    log.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;

  try {
    const { id } = await params;
    const convId = parseInt(id);
    await deleteConversation(convId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
