// Core pipeline — deterministic entry point for the semantic execution loop.
// processLead usa handler (→ core → router → policy → execution effects).
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

import type { ExtractionContext, ConversationDomain } from "@/lib/ai/types";
import type { Mode } from "@/lib/ai/types";
import { log } from "@/lib/utils/logger";

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
  domain: ConversationDomain;
  mode: Mode;
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
 * Mode is determined by ExecutionContext.mode, which is set upstream
 * based on extractionCtx.slots.scheduled_at.value (if present → RESERVA, else → AHORA).
 */
export async function processLead(
  execCtx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<ProcessLeadResult> {
  try {
    const handlerResult = deps.handler(execCtx.text, execCtx.mode, {
      history: execCtx.history,
      customerName: execCtx.customerName,
      extraction: execCtx.extractionCtx,
      lang: execCtx.lang,
      phone: execCtx.phone,
      userText: execCtx.text,
      domain: execCtx.domain,
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
    log.error("[PIPELINE] error:", e);
    return "error";
  }
}
