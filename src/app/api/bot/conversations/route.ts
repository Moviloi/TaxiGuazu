import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const conversations = listConversations();
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ conversations: [], error: 'Error interno' }, { status: 500 });
  }
}
