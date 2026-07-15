/**
 * blackbox-limpiar.int.test.ts — Auditoría Black Box del comando .limpiar
 *
 * METODOLOGÍA:
 * - Sin mockear la DB. Sin mockear el sender (se capturan respuestas).
 * - Llama a handleLeadMessage() — el mismo entry point que usa el webhook y el simulate endpoint.
 * - Cada número telefónico es una conversación independiente.
 * - Se registran errores de stderr (console.error, log.error) y respuestas.
 *
 * NO modifica código. NO propone refactors. Solo descubre fallos.
 */

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// ── CAPTURE LOGS ────────────────────────────────────────

/** Errores capturados de console.error / log.error durante un escenario */
const globalErrors: Array<{
  scenario: string;
  phone: string;
  step: string;
  error: string;
  timestamp: number;
}> = [];

/** Resumen de cada escenario */
const scenarioResults: Array<{
  scenario: string;
  phone: string;
  steps: number;
  botResponses: number;
  errors: number;
  durationMs: number;
  errorDetails: string[];
}> = [];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// ── MOCK SENDER (no mockea DB ni LLM) ────────────────────

const capturedMessages: { to: string; text: string; timestamp: number }[] = [];

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn(async (to: string, text: string) => {
    capturedMessages.push({ to, text, timestamp: Date.now() });
  }),
  sendInteractiveButtons: vi.fn(async (to: string, text: string, buttons: any[]) => {
    capturedMessages.push({
      to,
      text: text + " [OPCIONES: " + buttons.map((b: any) => b.title || b.reply?.title).join(" | ") + "]",
      timestamp: Date.now(),
    });
  }),
}));

// ── IMPORTS ─────────────────────────────────────────────

import { handleLeadMessage } from "@/lib/services/lead.service";

// ── HELPERS ──────────────────────────────────────────────

function drainBotResponses(): string[] {
  const texts: string[] = [];
  while (capturedMessages.length > 0) {
    const msg = capturedMessages.shift()!;
    texts.push(msg.text);
  }
  return texts;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPhone(n: number): string {
  return `549111${String(n).padStart(7, "0")}`;
}

/** Ejecuta un turno de conversación. Devuelve respuestas y logs de error. */
async function sendMessage(
  phone: string,
  text: string,
  stepLabel: string,
  scenarioLabel: string,
): Promise<{ responses: string[]; stepErrors: string[] }> {
  const stepErrors: string[] = [];
  const errorInterceptor = (...args: any[]) => {
    const msg = args.map((a: any) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    // Filter out expected operational logs
    if (!msg.includes("[SIMULATE]") && !msg.includes("[EXTRACTION]") && !msg.includes("[POLICY]") &&
        !msg.includes("[CORE]") && !msg.includes("[SLOT") && !msg.includes("[OPERATIONAL") &&
        !msg.includes("[CONVERSATION") && !msg.includes("[DISPLAY") && !msg.includes("[TEMPORALITY") &&
        !msg.includes("[DISPATCH") && !msg.includes("[CONFIDENCE") && !msg.includes("[EVIDENCE") &&
        !msg.includes("[EXECUTION]") && !msg.includes("[CONTEXT]") && !msg.includes("[STATEMACHINE") &&
        !msg.includes("[LIMPIAR_ERROR]") && !msg.includes("[AUDIT_LIMPIAR]") &&
        !msg.includes("[COMPLETENESS") && !msg.includes("[TRACE") && !msg.includes("[OBSERVABILITY") &&
        !msg.includes("[FALLBACK") && !msg.includes("[GROQ") && !msg.includes("[GEMINI") &&
        !msg.includes("[AMBIGUITY") && !msg.includes("[GREETING") && !msg.includes("[INTERPRETER") &&
        !msg.includes("[OUTPUT") && !msg.includes("[BLOCKED") && !msg.includes("[AHORA") &&
        !msg.includes("[LEAD") && !msg.includes("[NOW_TRIP") && !msg.includes("[CONFIRMATION") &&
        !msg.includes("[ROUTING]") && !msg.includes("[STRATEGY]") && !msg.includes("[LLM") &&
        !msg.includes("[SCHEDULER]") && !msg.includes("[metric]") && !msg.includes("[POLICY_") &&
        !msg.includes("[EXTRACTION_") && !msg.includes("[DEBUG_LEAD") && !msg.includes("[SLOT_") &&
        !msg.includes("[TRACE ") && !msg.includes("[memory]")) {
      stepErrors.push(msg);
    }
  };

  console.error = errorInterceptor;
  const start = Date.now();

  try {
    capturedMessages.length = 0;
    await handleLeadMessage(phone, text);
  } catch (e: any) {
    stepErrors.push(`UNCAUGHT EXCEPTION: ${e.message}\n${e.stack || ""}`);
    globalErrors.push({
      scenario: scenarioLabel,
      phone,
      step: stepLabel,
      error: `UNCAUGHT: ${e.message}`,
      timestamp: Date.now(),
    });
  } finally {
    console.error = originalConsoleError;
  }

  const duration = Date.now() - start;
  const responses = drainBotResponses();

  return { responses, stepErrors };
}

// ── TEST PHONES ─────────────────────────────────────────

const PHONES = {
  A: formatPhone(1),
  B: formatPhone(2),
  C: formatPhone(3),
  D: formatPhone(4),
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`E${i + 1}`, formatPhone(10 + i)]),
  ),
} as Record<string, string>;

// ── CONSOLIDATED ERROR TRACKING ─────────────────────────

// eslint-disable-next-line
const allStepErrors: Array<{ phone: string; step: string; errors: string[] }> = [];

// ═══════════════════════════════════════════════════════════
// SCENARIOS
// ═══════════════════════════════════════════════════════════

describe("Black Box — .limpiar", () => {
  beforeAll(() => {
    console.log("\n" + "=".repeat(70));
    console.log("  BLACK BOX AUDIT — .limpiar");
    console.log("  Phone range: 5491110000001 – 5491110000020");
    console.log("=".repeat(70) + "\n");
  });

  afterAll(() => {
    // Print consolidated report
    console.log("\n" + "=".repeat(70));
    console.log("  REPORTE CONSOLIDADO");
    console.log("=".repeat(70) + "\n");

    for (const r of scenarioResults) {
      const status = r.errors > 0 ? "❌" : "✅";
      console.log(`  ${status} ${r.scenario} (${r.phone})`);
      console.log(`     Steps: ${r.steps}, Bot responses: ${r.botResponses}, Errors: ${r.errors}, Duration: ${r.durationMs}ms`);
      if (r.errorDetails.length > 0) {
        for (const ed of r.errorDetails) {
          console.log(`     ⚠️  ${ed.substring(0, 200)}`);
        }
      }
    }

    const totalErrors = globalErrors.length;
    console.log(`\n  Total de errores capturados: ${totalErrors}`);
    if (totalErrors > 0) {
      console.log("\n  DETALLE DE ERRORES:");
      for (const ge of globalErrors) {
        console.log(`  ── ${ge.scenario} / ${ge.phone} / step: ${ge.step}`);
        console.log(`     ${ge.error.substring(0, 300)}`);
      }
    }

    console.log("\n" + "=".repeat(70) + "\n");
  });

  // ══════════════════════════════════════════════════════
  // ESCENARIO A: "Hola"
  // ══════════════════════════════════════════════════════
  it(
    "A — Saludo inicial (conversación nueva)",
    async () => {
      const phone = PHONES.A;
      const startAll = Date.now();
      const allErrors: string[] = [];

      console.log(`\n─── Escenario A: ${phone} ───`);
      console.log("  👤 USER: Hola");

      const { responses, stepErrors } = await sendMessage(phone, "Hola", "saludo", "A");
      allErrors.push(...stepErrors);

      console.log(`  🤖 Respuestas: ${responses.length}`);
      for (const r of responses) {
        console.log(`     ${r.substring(0, 120)}${r.length > 120 ? "..." : ""}`);
      }

      scenarioResults.push({
        scenario: "A",
        phone,
        steps: 1,
        botResponses: responses.length,
        errors: stepErrors.length,
        durationMs: Date.now() - startAll,
        errorDetails: stepErrors,
      });

      // Bot debe responder algo
      expect(responses.length).toBeGreaterThan(0);
    },
    60_000,
  );

  // ══════════════════════════════════════════════════════
  // ESCENARIO B: ".limpiar" en conversación NUEVA
  // ══════════════════════════════════════════════════════
  it(
    "B — .limpiar en conversación nueva (sin historial)",
    async () => {
      const phone = PHONES.B;
      const startAll = Date.now();
      const allErrors: string[] = [];

      console.log(`\n─── Escenario B: ${phone} ───`);
      console.log("  👤 USER: .limpiar");

      const { responses, stepErrors } = await sendMessage(phone, ".limpiar", "limpiar", "B");
      allErrors.push(...stepErrors);

      console.log(`  🤖 Respuestas: ${responses.length}`);
      for (const r of responses) {
        console.log(`     ${r.substring(0, 120)}${r.length > 120 ? "..." : ""}`);
      }

      scenarioResults.push({
        scenario: "B",
        phone,
        steps: 1,
        botResponses: responses.length,
        errors: stepErrors.length,
        durationMs: Date.now() - startAll,
        errorDetails: stepErrors,
      });

      // Bot debe responder el mensaje de confirmación
      expect(responses.length).toBeGreaterThan(0);
    },
    30_000,
  );

  // ══════════════════════════════════════════════════════
  // ESCENARIO C: .limpiar → Hola (conversación nueva)
  // ══════════════════════════════════════════════════════
  it(
    "C — .limpiar + Hola (conversación nueva)",
    async () => {
      const phone = PHONES.C;
      const startAll = Date.now();
      const allErrors: string[] = [];

      console.log(`\n─── Escenario C: ${phone} ───`);

      // Step 1: .limpiar
      console.log("  ══ Step 1: .limpiar ══");
      console.log("  👤 USER: .limpiar");
      let result = await sendMessage(phone, ".limpiar", "step1-limpiar", "C");
      allErrors.push(...result.stepErrors);
      console.log(`  🤖 (${result.responses.length} respuestas)`);
      for (const r of result.responses) {
        console.log(`     ${r.substring(0, 120)}`);
      }
      await sleep(500);

      // Step 2: Hola (post-limpiar)
      console.log("  ══ Step 2: Hola (post-limpiar) ══");
      console.log("  👤 USER: Hola");
      result = await sendMessage(phone, "Hola", "step2-hola-post-limpiar", "C");
      allErrors.push(...result.stepErrors);
      console.log(`  🤖 (${result.responses.length} respuestas)`);
      for (const r of result.responses) {
        console.log(`     ${r.substring(0, 120)}`);
      }

      scenarioResults.push({
        scenario: "C",
        phone,
        steps: 2,
        botResponses: result.responses.length,
        errors: allErrors.length,
        durationMs: Date.now() - startAll,
        errorDetails: allErrors,
      });

      // Post-limpiar, el bot debe responder al saludo
      expect(result.responses.length).toBeGreaterThan(0);
    },
    90_000,
  );

  // ══════════════════════════════════════════════════════
  // ESCENARIO D: Hola → .limpiar → Hola → Necesito taxi
  // ══════════════════════════════════════════════════════
  it(
    "D — Conversación completa con limpiar en medio",
    async () => {
      const phone = PHONES.D;
      const startAll = Date.now();
      const allErrors: string[] = [];
      let totalBotResponses = 0;

      console.log(`\n─── Escenario D: ${phone} ───`);

      // Step 1: Hola
      console.log("  ══ Step 1: Hola ══");
      let result = await sendMessage(phone, "Hola", "step1-hola", "D");
      allErrors.push(...result.stepErrors);
      totalBotResponses += result.responses.length;
      console.log(`  🤖 (${result.responses.length})`);
      await sleep(500);

      // Step 2: .limpiar
      console.log("  ══ Step 2: .limpiar ══");
      result = await sendMessage(phone, ".limpiar", "step2-limpiar", "D");
      allErrors.push(...result.stepErrors);
      totalBotResponses += result.responses.length;
      console.log(`  🤖 (${result.responses.length})`);
      await sleep(500);

      // Step 3: Hola (post-limpiar)
      console.log("  ══ Step 3: Hola (post-limpiar) ══");
      result = await sendMessage(phone, "Hola", "step3-hola-post", "D");
      allErrors.push(...result.stepErrors);
      totalBotResponses += result.responses.length;
      console.log(`  🤖 (${result.responses.length})`);
      for (const r of result.responses) {
        console.log(`     ${r.substring(0, 120)}`);
      }
      await sleep(500);

      // Step 4: Necesito un taxi
      console.log("  ══ Step 4: 'Necesito un taxi' ══");
      result = await sendMessage(phone, "Necesito un taxi", "step4-necesito-taxi", "D");
      allErrors.push(...result.stepErrors);
      totalBotResponses += result.responses.length;
      console.log(`  🤖 (${result.responses.length})`);
      for (const r of result.responses) {
        console.log(`     ${r.substring(0, 120)}`);
      }

      scenarioResults.push({
        scenario: "D",
        phone,
        steps: 4,
        botResponses: totalBotResponses,
        errors: allErrors.length,
        durationMs: Date.now() - startAll,
        errorDetails: allErrors,
      });

      // El flujo debe continuar normalmente después de .limpiar
      expect(result.responses.length).toBeGreaterThan(0);
    },
    180_000,
  );

  // ══════════════════════════════════════════════════════
  // ESCENARIO E: .limpiar + Hola con 10 usuarios distintos
  // ══════════════════════════════════════════════════════
  for (let i = 1; i <= 10; i++) {
    const idx = i;
    it(
      `E${idx} — .limpiar + Hola (usuario independiente #${idx})`,
      async () => {
        const phone = PHONES[`E${idx}`];
        const startAll = Date.now();
        const allErrors: string[] = [];

        console.log(`\n─── Escenario E${idx}: ${phone} ───`);

        // Step 1: .limpiar
        console.log("  ══ Step 1: .limpiar ══");
        let result = await sendMessage(phone, ".limpiar", "step1-limpiar", `E${idx}`);
        allErrors.push(...result.stepErrors);
        console.log(`  🤖 (${result.responses.length})`);
        await sleep(300);

        // Step 2: Hola
        console.log("  ══ Step 2: Hola ══");
        result = await sendMessage(phone, "Hola", "step2-hola", `E${idx}`);
        allErrors.push(...result.stepErrors);
        console.log(`  🤖 (${result.responses.length})`);
        for (const r of result.responses) {
          console.log(`     ${r.substring(0, 120)}`);
        }

        scenarioResults.push({
          scenario: `E${idx}`,
          phone,
          steps: 2,
          botResponses: result.responses.length,
          errors: allErrors.length,
          durationMs: Date.now() - startAll,
          errorDetails: allErrors,
        });

        // Cada usuario independiente debe poder conversar post-limpiar
        expect(result.responses.length).toBeGreaterThan(0);
      },
      90_000,
    );
  }
});
