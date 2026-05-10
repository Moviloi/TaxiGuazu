import { NextRequest, NextResponse } from 'next/server';
import { getMessages, insertMessage, enqueueOutbox } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id);
    const messages = getMessages(convId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ messages: [], error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id);
    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const messageId = insertMessage(convId, role, content);

    if (role === 'human') {
      const conversation = (await import('@/lib/db')).getConversationById(convId);
      if (conversation) {
        enqueueOutbox(convId, conversation.phone, content);
      }
    }

    return NextResponse.json({ ok: true, messageId });
  } catch (error) {
    console.error('Error posting message:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
