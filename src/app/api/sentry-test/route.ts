// Endpoint de prueba para verificar que Sentry captura errores.
// Solo activo si SENTRY_DSN está configurado.
// Uso: GET /api/sentry-test
// Responde 200 si Sentry está configurado, 400 si no.
import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.SENTRY_DSN) {
    return NextResponse.json(
      { error: "Sentry no configurado — SENTRY_DSN no definido" },
      { status: 400 },
    );
  }

  // Lanza error controlado para probar captura
  try {
    throw new Error("[SENTRY_TEST] Error controlado de prueba");
  } catch (error) {
    // En producción con DSN, Sentry capturará esto automáticamente
    // vía el wrapper de ruta. Sin DSN, es silencioso.
    throw error;
  }
}
