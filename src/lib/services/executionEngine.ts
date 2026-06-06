import type { Decision } from "@/lib/core/types";
import type { ExtractionContext, Mode } from "@/lib/ai/types";

export interface ExecutionContext {
  phone: string;
  conversationId: number;
  text: string;
  history: any[];
  customerName?: string;
  extractionCtx?: ExtractionContext;
  tariffMatch?: any;
  lang: string;
  intent: string;
}

export interface ExecutionDeps {
  send: (phone: string, msg: string) => Promise<void>;
  persist: (convId: number, role: string, msg: string) => Promise<number>;
  handler: (text: string, mode: Mode, ctx?: any) => any;
  geo: {
    resolveGeoRoute: (slots: any) => any;
    resolveZones: (slots: any) => any;
    expandZones: (...args: any[]) => any;
    computeProximityScore: (...args: any[]) => any;
  };
  fare: {
    calculateFare: (expansion: any, proximity: any) => any;
  };
  memory: {
    saveContext: (phone: string, data: any) => Promise<void>;
  };
  guard: (source: string) => void;
  driverOps?: {
    getDriverByPhone: (phone: string) => Promise<any>;
    getConversationByPhone: (phone: string) => Promise<any>;
    buildShiftEndPrompt: (shift: string) => string | null;
  };
}

export async function executeDecision(
  decision: Decision,
  ctx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<void> {
  const { phone, conversationId } = ctx;

  switch (decision.action) {
    case "INFO_PRICE":
    case "ASK_ORIGIN":
    case "ASK_DESTINATION":
    case "CLARIFY":
    case "CONFIRM":
      console.log("[EXEC] respondiendo:", decision.action, decision.message.substring(0, 80));
      await deps.send(phone, decision.message);
      await deps.persist(conversationId, "assistant", decision.message);
      return;

    case "CONFIRM_ROUTE":
      console.log("[EXEC] CONFIRM_ROUTE — yendo a handler existente");
      await handleConfirmRoute(ctx, deps);
      return;

    case "FINAL":
      console.log("[EXEC] FINAL — ejecutando pipeline completo");
      await handleFinal(ctx, deps);
      return;
  }
}

async function handleConfirmRoute(
  ctx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<void> {
  const { phone, conversationId, text, extractionCtx, history, customerName, lang } = ctx;
  const handlerResult = deps.handler(text, "RESERVA", {
    history,
    customerName,
    extraction: extractionCtx,
    lang,
  });
  const response = handlerResult.policy.finalResponse;
  await deps.send(phone, response);
  await deps.persist(conversationId, "assistant", response);
}

async function handleFinal(
  ctx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<void> {
  const { phone, conversationId, text, extractionCtx, history, customerName, lang, intent } = ctx;
  const slots = extractionCtx?.slots ?? {};

  // GEO ROUTE
  const geo = deps.geo.resolveGeoRoute(slots);
  console.log("[GEO] resolución:", { originZone: geo.originZone, destinationZone: geo.destinationZone, routeType: geo.routeType, proximityScore: geo.proximityScore });

  // Reconstruct legacy shapes for downstream backward compat
  const zones = deps.geo.resolveZones(slots);
  const expansion = deps.geo.expandZones(zones.originZone, zones.destinationZone, zones.originSubzone, zones.destinationSubzone);
  const proximityScore = deps.geo.computeProximityScore(expansion.origin, expansion.destination);

  // FARE ENGINE
  const fareResult = deps.fare.calculateFare(expansion, proximityScore);
  console.log("[FARE] resultado:", { category: fareResult.category, finalPrice: fareResult.finalPrice, confidence: fareResult.confidence });

  // HANDLER
  const handlerResult = deps.handler(text, "RESERVA", {
    history,
    customerName,
    extraction: extractionCtx,
    lang,
  });
  deps.guard(handlerResult.policy.outputSource);
  const response = handlerResult.policy.finalResponse;

  await deps.persist(conversationId, "assistant", response);
  console.log("[TRACE RESPONSE]", { source: "POLICY_RESPONSE", text: response });
  await deps.send(phone, response);

  // CONTEXT MEMORY — persist full state
  await deps.memory.saveContext(phone, {
    slots,
    intent,
    zones,
    expansion,
    proximityScore,
    fare: fareResult,
    confidence: ctx.extractionCtx?.overallConfidence,
  });

  // ── Shift-end auto-prompt for drivers ──
  if (deps.driverOps) {
    try {
      const driver = await deps.driverOps.getDriverByPhone(phone);
      if (driver && driver.shift) {
        const prompt = deps.driverOps.buildShiftEndPrompt(driver.shift);
        if (prompt) {
          await deps.send(phone, prompt);
          const conv = await deps.driverOps.getConversationByPhone(phone);
          if (conv) await deps.persist(conv.id, "assistant", prompt);
        }
      }
    } catch (_) { /* silent */ }
  }
}
