// Core pipeline — deterministic entry point for the semantic execution loop.
//
// v5.7: Handler-only. resolveDecision y toda la ruta legacy fueron eliminados.
//   processLead usa handler (→ core → router → policy → execution effects).
//
// Pipeline:
//   handler.handleMessage → core → router → policy → send / persist / geo / context
//
// ExecutionDeps contract:
//   handler: handleMessage o mock (tests)
//   send:    sendWhatsAppMessage o mock
//   persist: insertMessage o mock
//   geo:     { resolveGeoRoute }
//   memory:  { saveContext }

import type { ExtractionContext } from "@/lib/ai/types";

export interface ExecutionContext {
  phone: string;
  conversationId: number;
  text: string;
  history: any[];
  customerName?: string;
  extractionCtx?: ExtractionContext;
  pricing?: {
    final_price: number;
  };
  lang: string;
  intent: string;
}

export interface ExecutionDeps {
  send: (phone: string, msg: string) => Promise<void>;
  persist: (convId: number, role: string, msg: string) => Promise<number>;
  handler: (text: string, mode: any, ctx?: any) => any;
  geo: {
    resolveGeoRoute: (slots: any) => any;
  };
  memory: {
    saveContext: (phone: string, data: any) => Promise<void>;
  };
  adminNotify?: (msg: string) => Promise<void>;
}

export type ProcessLeadResult = "completed" | "incomplete" | "error";

/**
 * Run the deterministic decision → execution pipeline.
 * Extraction and completeness are handled upstream by lead.service.
 *
 * handler recibe el texto + contexto de extracción, ejecuta core → router → policy,
 * y policy produce finalResponse + metadata de ejecución (needsGeo, needsSaveContext).
 *
 * Mode is hardcoded to "RESERVA" (AHORA is legacy/deprecated and not routed via this pipeline).
 * When AHORA is revived, ExecutionContext should carry an explicit mode field.
 */
export async function processLead(
  execCtx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<ProcessLeadResult> {
  try {
    const handlerResult = deps.handler(execCtx.text, "RESERVA", {
      history: execCtx.history,
      customerName: execCtx.customerName,
      extraction: execCtx.extractionCtx,
      lang: execCtx.lang,
      phone: execCtx.phone,
      userText: execCtx.text,
    });
    const { finalResponse, needsGeo, needsSaveContext, needsAdminNotify, adminNotifyBody } = handlerResult.policy;

    await deps.send(execCtx.phone, finalResponse);
    await deps.persist(execCtx.conversationId, "assistant", finalResponse);

    if (needsGeo && needsSaveContext) {
      const slots = execCtx.extractionCtx?.slots ?? {};
      const geo = deps.geo.resolveGeoRoute(slots);
      await deps.memory.saveContext(execCtx.phone, {
        slots,
        intent: execCtx.intent,
        pricing: execCtx.pricing,
        geo,
        confidence: execCtx.extractionCtx?.overallConfidence,
      });
    }

    if (needsAdminNotify && adminNotifyBody && deps.adminNotify) {
      await deps.adminNotify(adminNotifyBody);
    }

    // needsGeo indica que policy decidió que el booking está completo
    // (askForConfirmation + tariff.matched).
    return needsGeo ? "completed" : "incomplete";
  } catch (e) {
    console.error("[PIPELINE] error:", e);
    return "error";
  }
}
