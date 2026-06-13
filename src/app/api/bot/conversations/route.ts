import { NextRequest, NextResponse } from 'next/server';
import { listConversations } from '@/lib/db/database';
import { checkAdminAuth } from '@/lib/auth';
import { log } from "@/lib/utils/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;

  try {
    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch (error) {
    log.error('Error fetching conversations:', error);
    return NextResponse.json({ conversations: [], error: 'Error interno' }, { status: 500 });
  }
}
