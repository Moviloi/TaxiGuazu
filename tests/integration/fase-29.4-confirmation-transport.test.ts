import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SlotConfirmationUI } from "@/lib/ai/slot-confirmation";
import type { HandleMessageResult } from "@/lib/ai/types";

// No mockear processLead — queremos probar el real.
// Mockeamos handleMessage para controlar la respuesta.
vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn() }));

import { processLead, type ExecutionContext, type ExecutionDeps } from "@/lib/pipeline";
import { handleMessage } from "@/lib/ai/handler";

function makeHandler(overrides: Partial<HandleMessageResult["policy"]>): HandleMessageResult {
  return {
    decision: { decision: "CLARIFY", mode: "RESERVA", core: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } }, reason: "ambiguous" },
    policy: {
      decision: "CLARIFY",
      mode: "RESERVA",
      policyHint: "test",
      requiresConfirmation: false,
      finalResponse: "Solo para confirmar los datos del viaje...",
      requiresUserInput: true,
      nextExpectedFields: ["location_ambiguous"],
      outputSource: "POLICY",
      needsGeo: false,
      needsSaveContext: false,
      ...overrides,
    },
  };
}

async function runProcessLead(policyOverrides: Partial<HandleMessageResult["policy"]>) {
  const send = vi.fn().mockResolvedValue(undefined);
  const sendButtons = vi.fn().mockResolvedValue(undefined);
  const persist = vi.fn().mockResolvedValue(1);

  vi.mocked(handleMessage).mockResolvedValue(makeHandler(policyOverrides));

  const ctx: ExecutionContext = {
    phone: "+549111111",
    conversationId: 1,
    text: "estoy en aeropuerto quiero centro",
    history: [],
    extractionCtx: {
      slots: {
        origin: { value: "Aeropuerto IGR", score: 0.6, reason: "ambiguous_term", status: "CONFIRMATION_PENDING", source: "SYSTEM_INFERRED" },
        destination: { value: "Centro", score: 0.8, reason: "exact_alias_match", status: "CONFIRMATION_PENDING", source: "SYSTEM_INFERRED" },
      },
      overallConfidence: 0.7,
      conversationalState: "idle",
      clarifyField: null,
      askForConfirmation: false,
      tariff: { matched: false, price: undefined, canonicalOrigin: "Aeropuerto IGR", canonicalDestination: "Centro" },
    },
    lang: "es",
    intent: "PRE_BOOKING",
    domain: "reservation",
    mode: "RESERVA",
    temporal: "FUTURE",
    operationalMode: "RESERVATION",
  };

  const deps: ExecutionDeps = {
    send,
    sendButtons,
    persist,
    handler: handleMessage,
    geo: { resolveGeoRoute: vi.fn().mockResolvedValue({}) },
    memory: { saveContext: vi.fn().mockResolvedValue(undefined) },
  };

  await processLead(ctx, deps);
  return { send, sendButtons, persist };
}

describe("FASE 29.4 — Confirmation transport via processLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T1: confirmationUI presente → llama sendInteractiveButtons
  it("T1: confirmationUI → sendButtons llamado", async () => {
    const ui: SlotConfirmationUI = {
      showConfirmation: true,
      pendingSlots: ["origin", "destination"],
      message: "Solo para confirmar los datos del viaje:\n\n📍 *Origen:* ⚠️ Aeropuerto IGR\n\n📍 *Destino:* ⚠️ Centro\n\n¿Está correcto?",
      buttons: [
        { id: "slot_confirm", title: "✅ Confirmar" },
        { id: "slot_change", title: "✏️ Cambiar" },
      ],
    };

    const { send, sendButtons } = await runProcessLead({ confirmationUI: ui });

    expect(sendButtons).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  // T2: confirmación contiene slot_confirm button
  it("T2: confirmation buttons contienen slot_confirm", async () => {
    const ui: SlotConfirmationUI = {
      showConfirmation: true,
      pendingSlots: ["origin"],
      message: "Solo para confirmar...",
      buttons: [
        { id: "slot_confirm", title: "✅ Confirmar" },
        { id: "slot_change", title: "✏️ Cambiar" },
      ],
    };

    const { sendButtons } = await runProcessLead({ confirmationUI: ui });

    const [, , buttons] = vi.mocked(sendButtons).mock.calls[0];
    expect(buttons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "slot_confirm" }),
        expect.objectContaining({ id: "slot_change" }),
      ]),
    );
  });

  // T3: sin confirmationUI → sendWhatsAppMessage, no sendButtons
  it("T3: sin confirmationUI → send usado, sendButtons no", async () => {
    const { send, sendButtons } = await runProcessLead({ confirmationUI: undefined });

    expect(send).toHaveBeenCalledTimes(1);
    expect(sendButtons).not.toHaveBeenCalled();
  });

  // T4: confirmationUI presente → persist recibe el message
  it("T4: confirmationUI presente → persist guarda texto", async () => {
    const ui: SlotConfirmationUI = {
      showConfirmation: true,
      pendingSlots: ["origin"],
      message: "Solo para confirmar...",
      buttons: [{ id: "slot_confirm", title: "✅ Confirmar" }],
    };

    const { sendButtons, persist } = await runProcessLead({ confirmationUI: ui });

    // sendButtons llamado con el mensaje
    const [, body] = vi.mocked(sendButtons).mock.calls[0];
    expect(body).toBe(ui.message);

    // persist guarda finalResponse (texto plano para histórico)
    expect(persist).toHaveBeenCalledWith(1, "assistant", "Solo para confirmar los datos del viaje...");
  });
});
