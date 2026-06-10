import type { Decision } from "@/lib/core/types";
import type { ExtractionContext, Mode } from "@/lib/ai/types";

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
  handler: (text: string, mode: Mode, ctx?: any) => any;
  geo: {
    resolveGeoRoute: (slots: any) => any;
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

    case "CONFIRM_INTERPRETATION":
      console.log("[EXEC] CONFIRM_INTERPRETATION — mostrando interpretación");
      await handleConfirmInterpretation(ctx, deps);
      return;

    case "BOOKING_SUMMARY":
      console.log("[EXEC] BOOKING_SUMMARY — mostrando resumen completo");
      await handleBookingSummary(ctx, deps);
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
  const { phone, conversationId, text, extractionCtx, history, customerName, lang, intent, pricing } = ctx;
  const slots = extractionCtx?.slots ?? {};

  // GEO ROUTE
  const geo = deps.geo.resolveGeoRoute(slots);
  console.log("[GEO] resolución:", { originZone: geo.originZone, destinationZone: geo.destinationZone, routeType: geo.routeType, proximityScore: geo.proximityScore });

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
    pricing,
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

function getSlotValue(slots: Record<string, any> | undefined, key: string): string {
  const raw = slots?.[key];
  if (raw == null) return "—";
  if (typeof raw === "object" && raw !== null) return String(raw.value ?? "—");
  return String(raw);
}

async function handleConfirmInterpretation(
  ctx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<void> {
  const { phone, conversationId, extractionCtx } = ctx;
  const slots = extractionCtx?.slots ?? {};

  const origin = getSlotValue(slots, "origin");
  const destination = getSlotValue(slots, "destination");

  const message = `Entendí:\n\n• Desde: ${origin}\n• Hacia: ${destination}\n\n¿Es correcto?`;

  await deps.send(phone, message);
  await deps.persist(conversationId, "assistant", message);
}

async function handleBookingSummary(
  ctx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<void> {
  const { phone, conversationId, extractionCtx, intent, pricing } = ctx;
  const slots = extractionCtx?.slots ?? {};
  const geo = deps.geo.resolveGeoRoute(slots);

  const origin = getSlotValue(slots, "origin");
  const destination = getSlotValue(slots, "destination");
  const formattedFare = pricing?.final_price?.toLocaleString("es-AR") ?? "—";

  const rawScheduledAt = getSlotValue(slots, "scheduled_at");
  let formattedDate = rawScheduledAt;
  if (rawScheduledAt !== "—") {
    try {
      const d = new Date(rawScheduledAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString("es-AR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      }
    } catch { /* use raw */ }
  }

  const message = `• Desde: ${origin}\n• Hacia: ${destination}\n• Fecha: ${formattedDate}\n• Tarifa estimada: $${formattedFare}\n\nEn breve un chofer se pondrá en contacto con vos.\n\nDe acuerdo / Cancelar`;

  await deps.send(phone, message);
  await deps.persist(conversationId, "assistant", message);

  await deps.memory.saveContext(phone, {
    slots, intent, pricing, geo,
    confidence: ctx.extractionCtx?.overallConfidence,
  });
}
