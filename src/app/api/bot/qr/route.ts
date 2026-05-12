import { NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("Intentando leer QR de la base de datos...");
    
    const db = getDbInstance();
    const rs = await db.execute({ sql: 'SELECT value FROM connection_state WHERE key = ?', args: ['QR'] });
    const rows = rs.rows as any[];
    const state = rows[0] || null;
    
    console.log("Resultado de la DB:", state ? "QR encontrado" : "Sin QR");
    
    return NextResponse.json({ qr: state?.value || null });
  } catch (error: any) {
    console.error('--- ERROR CRÍTICO API ---');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json(
      { error: 'Error interno', details: error.message }, 
      { status: 500 }
    );
  }
}