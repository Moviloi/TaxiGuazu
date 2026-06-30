/**
 * SIMULATE INTEGRATION TEST
 *
 * Corrida conversacional contra DB real + Groq real.
 * Solo se mockea el sender (WhatsApp) para capturar respuestas sin enviarlas.
 *
 * Escenarios basados en conversaciones reales extraídas de la DB.
 *
 * USO:
 *   npx vitest run --reporter=verbose tests/simulate.int.test.ts
 */

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// ── MOCK SENDER ── (vitest hoists vi.mock al tope, corre antes de cualquier import)
const capturedMessages: { to: string; text: string; buttons?: string[] }[] = [];

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn(async (to: string, text: string) => {
    capturedMessages.push({ to, text });
  }),
  sendInteractiveButtons: vi.fn(async (to: string, text: string, buttons: any[]) => {
    capturedMessages.push({
      to,
      text,
      buttons: buttons.map((b: any) => b.title || b.reply?.title || JSON.stringify(b)),
    });
  }),
}));

// ── IMPORTS ──
import { handleLeadMessage } from "@/lib/services/lead.service";
import { log } from "@/lib/utils/logger";

// ── HELPERS ──

function drainBotResponses(): void {
  while (capturedMessages.length > 0) {
    const msg = capturedMessages.shift()!;
    console.log(`  🤖 BOT:`);
    for (const line of msg.text.split("\n")) {
      console.log(`     ${line}`);
    }
    if (msg.buttons && msg.buttons.length > 0) {
      console.log(`     ── Opciones:`);
      msg.buttons.forEach((b, i) => console.log(`        [${i + 1}] ${b}`));
    }
  }
  console.log(`  ───────────────────────────────────────`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── TEST PHONE (unique per run) ──
const PHONE = `5493757${String(Date.now()).slice(-6)}`;

// ── SCENARIOS (single sequential test) ──

describe("[ael] Simulación conversacional", () => {
  beforeAll(() => {
    log.info(`[SIMULATE] phone=${PHONE}`);
    console.log(`\n📱 Teléfono de prueba: ${PHONE}`);
    console.log(`⚠️  Usa DB real y Groq real — sender mockeado\n`);
  });

  afterAll(() => {
    console.log(`\n📱 Teléfono usado: ${PHONE}`);
    console.log(`💡 .limpiar para borrar datos`);
  });

  it(
    "Escenarios basados en conversaciones reales",
    async () => {
      // ════════════════════════════════════════════════
      // TURNO 1 — Saludo inicial
      // ════════════════════════════════════════════════
      console.log(`\n═══ [T1] SALUDO ════════════════════════`);
      console.log(`  👤 USER: hola`);
      capturedMessages.length = 0;

      await handleLeadMessage(PHONE, "hola");
      await sleep(2000);
      console.log(`  📬 Capturados: ${capturedMessages.length}`);
      drainBotResponses();

      // ════════════════════════════════════════════════
      // TURNO 2 — ESCENARIO REAL: "estoy en el aeropuerto y necesito ir al centro"
      //   (extraído de conversación real del admin, 29/6/2026)
      //   Originalmente resultó en pending_human_review sin desambiguar "centro"
      // ════════════════════════════════════════════════
      console.log(`\n═══ [T2] ESCENARIO REAL: booking aeropuerto→centro ═══`);
      console.log(`  👤 USER: estoy en el aeropuerto y necesito ir al centro`);
      console.log(`  🎯 Objetivo: desambiguar "centro" antes de confirmar`);
      capturedMessages.length = 0;

      await handleLeadMessage(PHONE, "estoy en el aeropuerto y necesito ir al centro");
      await sleep(4000);
      console.log(`  📬 Capturados: ${capturedMessages.length}`);
      drainBotResponses();

      // ════════════════════════════════════════════════
      // TURNO 3 — RESPUESTA A DESAMBIGUACIÓN
      //   (si el bot preguntó, el usuario elige una opción)
      // ════════════════════════════════════════════════
      const lastMsg = capturedMessages.length > 0 ? capturedMessages[capturedMessages.length - 1] : null;
      const isAskingOptions = lastMsg?.text?.includes("1.") || lastMsg?.buttons;
      if (isAskingOptions) {
        console.log(`\n═══ [T3] RESPUESTA A DESAMBIGUACIÓN (elige opción 1) ═══`);
        console.log(`  👤 USER: 1`);
        capturedMessages.length = 0;

        await handleLeadMessage(PHONE, "1");
        await sleep(3000);
        console.log(`  📬 Capturados: ${capturedMessages.length}`);
        drainBotResponses();
      } else {
        console.log(`\n═══ [T3-SKIP] No hubo pregunta de desambiguación ═══`);
      }

      // ════════════════════════════════════════════════
      // TURNO 4 — ESCENARIO DE RECUPERACIÓN
      //   Usuario da info parcial: "del centro" después de contexto perdido
      // ════════════════════════════════════════════════
      console.log(`\n═══ [T4] RECUPERACIÓN: "del centro" ══════════════`);
      console.log(`  👤 USER: del centro (solo mención, sin contexto claro)`);
      capturedMessages.length = 0;

      await handleLeadMessage(PHONE, "del centro");
      await sleep(3000);
      console.log(`  📬 Capturados: ${capturedMessages.length}`);
      drainBotResponses();

      // ════════════════════════════════════════════════
      // TURNO 5 — .limpiar
      // ════════════════════════════════════════════════
      console.log(`\n═══ [T5] LIMPIAR ═══════════════════════════════`);
      console.log(`  👤 USER: .limpiar`);
      capturedMessages.length = 0;

      await handleLeadMessage(PHONE, ".limpiar");
      await sleep(1000);
      console.log(`  📬 Capturados: ${capturedMessages.length}`);
      drainBotResponses();

      // ── Assert ──
      expect(capturedMessages.length).toBe(0); // all drained
    },
    180_000, // 3 min timeout
  );
});
