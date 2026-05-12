import { NextRequest, NextResponse } from 'next/server';
import { getMessages, insertMessage, getConversationById } from '@/lib/db/database';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id);
    const messages = await getMessages(convId);
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

    const messageId = await insertMessage(convId, role, content);

    if (role === 'human') {
      const conversation = await getConversationById(convId);
      if (conversation) {
        await sendWhatsAppMessage(conversation.phone, content);
      }
    }

    return NextResponse.json({ ok: true, messageId });
  } catch (error) {
    console.error('Error posting message:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
