// AMBIGUITY HANDLER — resolucion interactiva de lugares ambiguos.
//
// Flujo:
//   1. Se detecta que un slot (origin/destination) tiene multiples matches en DB
//   2. Se consulta slotAssignmentConfidence del CORE + entityConfidence de DB
//   3. Si slotConf alta + entityConf baja → pregunta contextual
//   4. Si ambas altas → auto-resuelve
//   5. Se muestran opciones al usuario via buildPlaceOptions() con display_name
//   6. Usuario selecciona → se resuelve ese slot
//   7. Se pasa al siguiente slot ambiguo
//   8. Cuando ambos estan resueltos → transicion a slot_confirmation

import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import { searchPlaces, findPlaceByName } from "@/lib/db/domains/geo";
import type { PlaceCandidate } from "@/lib/db/domains/geo";
import { getChatSession, upsertChatSession } from "@/lib/db/database";
import { interpretAmbiguity } from "@/lib/ai/ambiguity-interpreter";
import { detectLeadLang } from "@/lib/detect-lang";
import { sendAndPersist } from "@/lib/services/shared/message-helpers";
import type { ChatSessionRow } from "@/lib/db/types";
import type { CoreDecision } from "@/lib/ai/types";
import { log } from "@/lib/utils/logger";
import {
  detectSlotContext,
  detectConversationTone,
  selectDisambiguationTemplate,
  buildConfirmationQuestion,
} from "@/lib/ai/disambiguation-templates";
import type { Language } from "@/lib/ai/disambiguation-templates";
import { t } from "@/lib/services/i18n/t";
import type { Lang } from "@/lib/ai/types";

/** Opción con display name (para el usuario) y canonical (para matching interno). */
export interface AmbiguityOption {
  display: string;
  canonical: string;
}

export interface AmbiguityState {
  resolvedOrigin: string | null;
  resolvedDest: string | null;
  originOptions: AmbiguityOption[];
  destOptions: AmbiguityOption[];
  /** Raw user term for the origin slot (e.g., "iguazu", "aeropuerto") — needed for risk node detection in response handler */
  originRawTerm?: string;
  /** Raw user term for the destination slot */
  destRawTerm?: string;
}

/** 
 * Nodos de riesgo hardcodeados — solo ESTOS 3 casos muestran alternativas.
 * Todo lo demás → pregunta contextual SIN listar opciones.
 * 
 * UX: Pregunta natural en WhatsApp, sin números ni botones.
 *     "Entendí que salís del aeropuerto. ¿Aeropuerto IGR (Argentina), IGU (Brasil) o AGT (Paraguay)?"
 */
const RISK_NODES: Record<string, AmbiguityOption[]> = {
  aeropuerto: [
    { display: "Aeropuerto IGR — Puerto Iguazú (Argentina)", canonical: "Aeropuerto IGR" },
    { display: "Aeropuerto IGU — Foz do Iguaçu (Brasil)", canonical: "Aeropuerto IGU" },
    { display: "Aeropuerto AGT — Ciudad del Este (Paraguay)", canonical: "Aeropuerto AGT" },
  ],
  centro: [
    { display: "Centro de Puerto Iguazú (Argentina)", canonical: "Centro de Puerto Iguazú" },
    { display: "Centro de Foz do Iguaçu (Brasil)", canonical: "Centro de Foz do Iguaçu" },
    { display: "Microcentro de Ciudad del Este (Paraguay)", canonical: "Microcentro de Ciudad del Este" },
  ],
  aduana: [
    { display: "Aduana lado Argentino (Tancredo Neves)", canonical: "Aduana Tancredo Neves" },
    { display: "Aduana lado Brasileño", canonical: "Aduana de Foz (lado BR)" },
  ],
};

/** Detecta si el término del usuario coincide con un risk node (match fuzzy en español/portugués/inglés) */
function detectRiskNode(rawTerm: string): string | null {
  const term = normalizeText(rawTerm).trim();
  // español
  if (term.includes("aeropuerto") || term === "airport") return "aeropuerto";
  if (term.includes("centro") || term === "centro" || term === "downtown" || term === "centro comercial") return "centro";
  if (term.includes("aduana") || term.includes("frontera") || term === "customs" || term === "border") return "aduana";
  // portugués
  if (term.includes("aeroporto")) return "aeropuerto";
  if (term.includes("alfandega") || term.includes("fronteira")) return "aduana";
  return null;
}

function toOptions(candidates: PlaceCandidate[]): AmbiguityOption[] {
  return candidates.map(c => ({
    display: c.display_name || c.canonical_name,
    canonical: c.canonical_name,
  }));
}

export async function startAmbiguityResolution(
  phone: string,
  conversationId: number,
  text: string,
  leadCore: CoreDecision,
  session: ChatSessionRow | null,
): Promise<boolean> {
  const roleOrigin = leadCore.roleLock?.origin?.toLowerCase().trim();
  const roleDest = leadCore.roleLock?.destination?.toLowerCase().trim();
  const sessionOrigin = session?.slots ? extractRawValue(session.slots, "origin") : null;
  const sessionDest = session?.slots ? extractRawValue(session.slots, "destination") : null;
  const rawOrigin = roleOrigin ?? sessionOrigin;
  const rawDest = roleDest ?? sessionDest;

  if (!rawOrigin && !rawDest) return false;

  // Check which slots are ambiguous (match multiple places)
  const [originCandidates, destCandidates] = await Promise.all([
    rawOrigin ? searchPlaces(rawOrigin, 5) : Promise.resolve([]),
    rawDest ? searchPlaces(rawDest, 5) : Promise.resolve([]),
  ]);

  const originAmbiguous = originCandidates.length > 1;
  const destAmbiguous = destCandidates.length > 1;

  if (!originAmbiguous && !destAmbiguous) return false;

  // ── CONFIDENCE MATRIX: slot assignment (syntax) × entity resolution (DB) ──
  const slotConfOrigin = leadCore.slotAssignmentConfidence?.origin ?? 0;
  const slotConfDest = leadCore.slotAssignmentConfidence?.destination ?? 0;
  const entityConfOrigin = originCandidates.length > 0 ? 1 / originCandidates.length : 0;
  const entityConfDest = destCandidates.length > 0 ? 1 / destCandidates.length : 0;

  const originSlotHigh = slotConfOrigin >= 0.80;
  const destSlotHigh = slotConfDest >= 0.80;

  log.info("[AMBIGUITY_MATRIX]", {
    rawOrigin,
    rawDest,
    slotConf: { origin: slotConfOrigin, dest: slotConfDest },
    entityConf: { origin: entityConfOrigin, dest: entityConfDest },
    counts: { origin: originCandidates.length, dest: destCandidates.length },
  });

  // ── AI-FIRST: let LLM try to resolve ambiguity (ADR 005) ──
  const [originLlmResult, destLlmResult] = await Promise.all([
    originAmbiguous ? interpretAmbiguity(text, originCandidates, "origin") : Promise.resolve(null),
    destAmbiguous ? interpretAmbiguity(text, destCandidates, "destination") : Promise.resolve(null),
  ]);

  // Resolve what the LLM was confident about
  const llmResolvedOrigin: string | null =
    originAmbiguous && originLlmResult?.confidence === "high" && originLlmResult.selectedId
      ? (originCandidates.find(c => c.place_id === originLlmResult.selectedId)?.canonical_name ?? null)
      : !originAmbiguous && originCandidates.length === 1
        ? originCandidates[0].canonical_name
        : null;

  const llmResolvedDest: string | null =
    destAmbiguous && destLlmResult?.confidence === "high" && destLlmResult.selectedId
      ? (destCandidates.find(c => c.place_id === destLlmResult.selectedId)?.canonical_name ?? null)
      : !destAmbiguous && destCandidates.length === 1
        ? destCandidates[0].canonical_name
        : null;

  // ── CONTEXT-AWARE RETRY: if one slot resolved but the other didn't, re-attempt with context ──
  // This mimics how Cristian resolves "centro" based on "aeropuerto IGR" context without asking
  let finalResolvedOrigin = llmResolvedOrigin;
  let finalResolvedDest = llmResolvedDest;

  if (llmResolvedOrigin && !llmResolvedDest && destAmbiguous) {
    // Origin resolved (e.g., Aeropuerto IGR), destination ambiguous (e.g., "centro")
    // Retry destination with origin as context
    const retryDest = await interpretAmbiguity(text, destCandidates, "destination", llmResolvedOrigin);
    if (retryDest.confidence === "high" && retryDest.selectedId) {
      finalResolvedDest = destCandidates.find(c => c.place_id === retryDest.selectedId)?.canonical_name ?? null;
      log.info("[AMBIGUITY_RETRY_WITH_CONTEXT]", { slot: "destination", resolved: finalResolvedDest, context: llmResolvedOrigin });
    }
  } else if (llmResolvedDest && !llmResolvedOrigin && originAmbiguous) {
    // Destination resolved, origin ambiguous
    const retryOrigin = await interpretAmbiguity(text, originCandidates, "origin", llmResolvedDest);
    if (retryOrigin.confidence === "high" && retryOrigin.selectedId) {
      finalResolvedOrigin = originCandidates.find(c => c.place_id === retryOrigin.selectedId)?.canonical_name ?? null;
      log.info("[AMBIGUITY_RETRY_WITH_CONTEXT]", { slot: "origin", resolved: finalResolvedOrigin, context: llmResolvedDest });
    }
  }

  // ── P1: CONTEXTUAL INFERENCE — Si un slot está resuelto y el otro es ambiguo,
  // inferir la opción más obvia basada en el contexto y confirmar en lugar de preguntar.
  // Ejemplo: origen = "Aeropuerto IGR" + destino = "centro" → confirmar "Centro de Puerto Iguazú"
  let usedContextualInference = false;
  if (finalResolvedOrigin && !finalResolvedDest && destAmbiguous && destCandidates.length > 1) {
    const inferredDest = inferFromContext(finalResolvedOrigin, destCandidates);
    if (inferredDest) {
      finalResolvedDest = inferredDest;
      usedContextualInference = true;
      log.info("[CONTEXTUAL_INFERENCE]", { 
        resolvedSlot: "origin", 
        resolvedValue: finalResolvedOrigin,
        inferredSlot: "destination",
        inferredValue: finalResolvedDest,
        method: "context_based"
      });
    }
  } else if (finalResolvedDest && !finalResolvedOrigin && originAmbiguous && originCandidates.length > 1) {
    const inferredOrigin = inferFromContext(finalResolvedDest, originCandidates);
    if (inferredOrigin) {
      finalResolvedOrigin = inferredOrigin;
      usedContextualInference = true;
      log.info("[CONTEXTUAL_INFERENCE]", { 
        resolvedSlot: "destination", 
        resolvedValue: finalResolvedDest,
        inferredSlot: "origin",
        inferredValue: finalResolvedOrigin,
        method: "context_based"
      });
    }
  }

  // If both resolved by LLM (no inference) → finalize directly
  if (finalResolvedOrigin && finalResolvedDest && !usedContextualInference) {
    log.info("[AMBIGUITY_LLM_AUTO]", {
      origin: finalResolvedOrigin,
      destination: finalResolvedDest,
    });
    await finalizeAmbiguity(phone, conversationId, {
      resolvedOrigin: finalResolvedOrigin,
      resolvedDest: finalResolvedDest,
      originOptions: toOptions(originCandidates),
      destOptions: toOptions(destCandidates),
    }, null, text);
    return true;
  }

  // If both resolved by contextual inference → ask confirmation instead of finalizing
  if (finalResolvedOrigin && finalResolvedDest && usedContextualInference) {
    log.info("[AMBIGUITY_INFERENCE_CONFIRMATION]", {
      origin: finalResolvedOrigin,
      destination: finalResolvedDest,
      method: "contextual_inference_pending_confirmation"
    });
    
    const lang = detectLeadLang(text) as Language;
    
    // Wait for user confirmation before finalizing
    // We store both slots as resolved BUT with a confirmation flag
    // The handleAmbiguityResponse will detect "sí"/"yes"/"sim" and finalize
    const ambiguityMeta: AmbiguityState = {
      resolvedOrigin: finalResolvedOrigin,
      resolvedDest: finalResolvedDest,
      originOptions: toOptions(originCandidates),
      destOptions: toOptions(destCandidates),
      originRawTerm: rawOrigin ?? undefined,
      destRawTerm: rawDest ?? undefined,
    };
    
    const currentSlots = session?.slots ? safeParseSlots(session.slots) : {};
    const mergedSlots = { ...currentSlots, __ambiguity: ambiguityMeta };
    await upsertChatSession(phone, mergedSlots, undefined, undefined, undefined);
    await setConversationalState(phone, "ambiguity_pending", "destination"); // any non-null slot
    
    // Build confirmation question using template
    const resolvedOriginCand = originCandidates.find(c => c.canonical_name === finalResolvedOrigin);
    const resolvedDestCand = destCandidates.find(c => c.canonical_name === finalResolvedDest);
    const originDisplay = resolvedOriginCand?.display_name ?? finalResolvedOrigin;
    const destDisplay = resolvedDestCand?.display_name ?? finalResolvedDest;
    
    const confirmationMsg = buildConfirmationQuestion(originDisplay, destDisplay, lang);
    await sendAndPersist(phone, conversationId, confirmationMsg);
    return true;
  }

  // Build ambiguity state with display names + raw terms for risk node detection
  const ambiguityMeta: AmbiguityState = {
    resolvedOrigin: finalResolvedOrigin,
    resolvedDest: finalResolvedDest,
    originOptions: toOptions(originCandidates),
    destOptions: toOptions(destCandidates),
    originRawTerm: rawOrigin ?? undefined,
    destRawTerm: rawDest ?? undefined,
  };

  // ── ALIGN WITH RISK NODES: if rawTerm is a risk node, store RISK_NODES options
  // so that stored options match what the user sees in the message (country filter + parseSelection)
  const originRiskKey = rawOrigin ? detectRiskNode(rawOrigin) : null;
  if (originRiskKey) {
    const riskOptions = RISK_NODES[originRiskKey];
    if (riskOptions) {
      ambiguityMeta.originOptions = originRiskKey === "aeropuerto"
        ? riskOptions.filter(o => !o.canonical.includes("AGT"))
        : riskOptions;
    }
  }
  const destRiskKey = rawDest ? detectRiskNode(rawDest) : null;
  if (destRiskKey) {
    const riskOptions = RISK_NODES[destRiskKey];
    if (riskOptions) {
      ambiguityMeta.destOptions = riskOptions;
    }
  }

  // ── FIX CONTEXT LOSS: Persist non-ambiguous resolved slots BEFORE entering ambiguity_pending
  // So that subsequent messages can reference them (e.g., user says "desde el hotel Amerian" 
  // and we still have destination "cataratas" from the first message)
  const resolvedSlots: Record<string, any> = {};
  if (llmResolvedOrigin && !originAmbiguous) {
    const originCand = originCandidates.find(c => c.canonical_name === llmResolvedOrigin);
    resolvedSlots.origin = { value: llmResolvedOrigin, display: originCand?.display_name ?? llmResolvedOrigin, score: 1.0, reason: "core_extracted", source: "CORE", status: "CONFIRMED" };
  }
  if (llmResolvedDest && !destAmbiguous) {
    const destCand = destCandidates.find(c => c.canonical_name === llmResolvedDest);
    resolvedSlots.destination = { value: llmResolvedDest, display: destCand?.display_name ?? llmResolvedDest, score: 1.0, reason: "core_extracted", source: "CORE", status: "CONFIRMED" };
  }
  // Merge with existing slots + ambiguity metadata
  const currentSlots = session?.slots ? safeParseSlots(session.slots) : {};
  const mergedSlots = { ...currentSlots, ...resolvedSlots, __ambiguity: ambiguityMeta };
  // FIX: usar upsertChatSession para crear fila si no existe (después de .limpiar)
  await upsertChatSession(phone, mergedSlots, undefined, undefined, undefined);

  // Ask for the first unresolved ambiguous slot
  const firstSlot = (!llmResolvedOrigin && originAmbiguous) ? "origin" : "destination";
  await setConversationalState(phone, "ambiguity_pending", firstSlot);

  const options = firstSlot === "origin" ? ambiguityMeta.originOptions : ambiguityMeta.destOptions;
  const lang = detectLeadLang(text);

  // Build contextual message using slot confidence
  const isOrigin = firstSlot === "origin";
  const slotHigh = isOrigin ? originSlotHigh : destSlotHigh;
  const entityCount = isOrigin ? originCandidates.length : destCandidates.length;
  // FIX: use the correct rawTerm for the slot being asked (not rawOrigin ?? rawDest)
  const rawTerm = isOrigin ? rawOrigin ?? "" : rawDest ?? "";

  const msg = buildContextualPlaceOptions(
    firstSlot,
    lang,
    slotHigh,
    rawTerm,
    entityCount,
  );
  await sendAndPersist(phone, conversationId, msg);

  log.info("[AMBIGUITY_START]", {
    slot: firstSlot,
    optionsCount: options.length,
    rawOrigin,
    rawDest,
    llmResolved: { origin: llmResolvedOrigin, dest: llmResolvedDest },
    slotConfidence: isOrigin ? slotConfOrigin : slotConfDest,
    entityConfidence: isOrigin ? entityConfOrigin : entityConfDest,
  });

  return true;
}

export async function handleAmbiguityResponse(
  phone: string,
  conversationId: number,
  text: string,
  _session: ChatSessionRow | null, // Use fresh DB data instead
): Promise<boolean> {
  const convState = await getConversationalState(phone);
  if (convState !== "ambiguity_pending") return false;

  // Fetch fresh session to get updated ambiguity state
  const freshSession = await getChatSession(phone);
  const ambState = freshSession?.slots ? getAmbiguityStateFromSlots(freshSession.slots) : null;

  // P0.9.3: Logging de debug para entender por qué se pierde el estado
  log.info("[AMBIGUITY_HANDLER_DEBUG]", {
    hasFreshSession: !!freshSession,
    freshSlotsKeys: freshSession?.slots ? Object.keys(JSON.parse(freshSession.slots || "{}")) : [],
    hasAmbState: !!ambState,
    resolvedOrigin: ambState?.resolvedOrigin ?? null,
    resolvedDest: ambState?.resolvedDest ?? null,
    originRawTerm: ambState?.originRawTerm ?? null,
    destRawTerm: ambState?.destRawTerm ?? null,
    originOptionsCount: ambState?.originOptions?.length ?? 0,
    destOptionsCount: ambState?.destOptions?.length ?? 0,
  });

  if (!ambState) return false;

  const clarifyField = freshSession?.clarify_field ?? "origin";
  const rawTerm = clarifyField === "origin" ? (ambState.originRawTerm ?? "") : (ambState.destRawTerm ?? "");
  const isRiskNode = rawTerm ? detectRiskNode(rawTerm) !== null : false;

  // Determine which options to use based on clarifyField
  const options = clarifyField === "origin" ? ambState.originOptions : ambState.destOptions;
  if (options.length === 0) return false;

  const lang = detectLeadLang(text);

  // Country filter: si el usuario dice un país (ej: "Argentina"), filtrar
  // opciones a ese país y auto-seleccionar si solo queda una.
  const PAIS_MAP: Record<string, string> = {
    argentina: "Argentina", brasil: "Brasil", brazil: "Brasil",
    paraguay: "Paraguay", paraguai: "Paraguay",
  };
  const normalizedInput = normalizeText(text);
  const matchedCountry = Object.keys(PAIS_MAP).find(c => {
    // Match exact country name (no partial — "argentina" sí, "argentino" no)
    if (normalizedInput === c) return true;
    // También si la frase termina con el país: "a argentina", "en argentina"
    if (normalizedInput.endsWith(" " + c)) return true;
    return false;
  });
  if (matchedCountry) {
    const targetCountry = PAIS_MAP[matchedCountry];
    const normalizedTarget = normalizeText(targetCountry);
    const countryOpts = options.filter(o =>
      normalizeText(o.display).includes(normalizedTarget),
    );
    if (countryOpts.length === 1) {
      // Auto-resolve: única opción en ese país (ej: "Argentina" → Aeropuerto IGR)
      const selected = countryOpts[0].canonical;
      log.info("[AMBIGUITY_RESOLVED_BY_COUNTRY]", {
        field: clarifyField, value: selected, country: targetCountry,
      });
      if (clarifyField === "origin") {
        ambState.resolvedOrigin = selected;
      } else {
        ambState.resolvedDest = selected;
      }
      await persistAmbiguityState(phone, ambState);
      if (ambState.resolvedOrigin && ambState.resolvedDest) {
        await finalizeAmbiguity(phone, conversationId, ambState, freshSession, text);
        return true;
      }
      // One more slot to resolve
      const nextSlot = !ambState.resolvedOrigin ? "origin" : "destination";
      const nextOptions = nextSlot === "origin" ? ambState.originOptions : ambState.destOptions;
      const nextRawTerm = nextSlot === "origin" ? (ambState.originRawTerm ?? "") : (ambState.destRawTerm ?? "");
      await setConversationalState(phone, "ambiguity_pending", nextSlot);
      const nextMsg = buildContextualPlaceOptions(nextSlot, lang, true, nextRawTerm, nextOptions.length);
      await sendAndPersist(phone, conversationId, nextMsg);
      return true;
    }
  }

  // Parse user selection — returns canonical name
  const selected = parseSelection(text, options);
  if (!selected) {
    if (isRiskNode) {
      // Risk node: user typed something we don't recognize
      // Ask again with the risk node question (no numbers, just natural language)
      const msg = buildContextualPlaceOptions(
        clarifyField, lang, true, rawTerm, options.length,
      );
      await sendAndPersist(phone, conversationId, msg);
      return true;
    }

    // Non-risk node: user typed a free-form location — do a fresh search
    const searchText = extractLocationFromText(text);
    const newCandidates = await searchPlaces(searchText, 5);
    if (newCandidates.length === 1) {
      // Perfect match — resolve directly and persist to session slots
      const newCand = newCandidates[0];
      const newCanonical = newCand.canonical_name;
      const newDisplay = newCand.display_name ?? newCanonical;
      log.info("[AMBIGUITY_RESOLVED_FROM_TEXT]", { field: clarifyField, value: newCanonical });
      if (clarifyField === "origin") {
        ambState.resolvedOrigin = newCanonical;
      } else {
        ambState.resolvedDest = newCanonical;
      }
      // Persist resolved slot to chat_sessions.slots (context preservation)
      const slotUpdate: Record<string, any> = {};
      const resolvedKey = clarifyField === "origin" ? "origin" : "destination";
      slotUpdate[resolvedKey] = { value: newCanonical, display: newDisplay, score: 1.0, reason: "user_typed", source: "USER_CONFIRMED", status: "CONFIRMED" };
      const currentSlots = freshSession?.slots ? safeParseSlots(freshSession.slots) : {};
      const merged = { ...currentSlots, ...slotUpdate, __ambiguity: ambState };
      await upsertChatSession(phone, merged, undefined, undefined, undefined);
    } else if (newCandidates.length > 1) {
      // Still ambiguous — check if the new term is now a risk node
      const newRiskKey = detectRiskNode(text);
      if (newRiskKey && RISK_NODES[newRiskKey]) {
        // Now it's a risk node — show risk alternatives
        const riskOptions = RISK_NODES[newRiskKey];
        const msg = buildContextualPlaceOptions(
          clarifyField, lang, true, text, riskOptions.length,
        );
        // Update the stored options to the risk node options
        if (clarifyField === "origin") {
          ambState.originOptions = riskOptions.filter(o => !o.canonical.includes("AGT"));
          ambState.originRawTerm = text;
        } else {
          ambState.destOptions = riskOptions;
          ambState.destRawTerm = text;
        }
        await persistAmbiguityState(phone, ambState);
        await sendAndPersist(phone, conversationId, msg);
        return true;
      }
      // Still not a risk node — ask to be more specific
      await sendAndPersist(phone, conversationId, t("disamb.notFound", lang as any));
      return true;
    } else {
      // 0 matches — ask to be more specific
      await sendAndPersist(phone, conversationId, t("disamb.notFoundAlt", lang as any));
      return true;
    }

    // If we reach here, we resolved from text
    await persistAmbiguityState(phone, ambState);
  } else {
    // User selected a known option — resolve
    log.info("[AMBIGUITY_RESOLVED]", { field: clarifyField, value: selected });
    if (clarifyField === "origin") {
      ambState.resolvedOrigin = selected;
    } else {
      ambState.resolvedDest = selected;
    }
    await persistAmbiguityState(phone, ambState);
  }

  // Check if both are resolved now
  if (ambState.resolvedOrigin && ambState.resolvedDest) {
    // Both resolved — update slots and transition to slot_confirmation
    await finalizeAmbiguity(phone, conversationId, ambState, freshSession, text);
    return true;
  }

  // One more slot to resolve — ask for it
  const nextSlot = !ambState.resolvedOrigin ? "origin" : "destination";
  const nextOptions = nextSlot === "origin" ? ambState.originOptions : ambState.destOptions;
  const nextRawTerm = nextSlot === "origin" ? (ambState.originRawTerm ?? "") : (ambState.destRawTerm ?? "");
  const nextIsRiskNode = nextRawTerm ? detectRiskNode(nextRawTerm) !== null : false;
  const nextRiskKey = nextIsRiskNode ? detectRiskNode(nextRawTerm) : null;

  await setConversationalState(phone, "ambiguity_pending", nextSlot);

  // For the next slot, use contextual message (risk node with alternatives or generic without)
  const msg = buildContextualPlaceOptions(
    nextSlot,
    lang,
    true,
    nextRawTerm,
    nextOptions.length,
  );
  await sendAndPersist(phone, conversationId, msg);

  log.info("[AMBIGUITY_NEXT]", {
    slot: nextSlot,
    optionsCount: nextOptions.length,
    isRiskNode: nextIsRiskNode,
    riskKey: nextRiskKey,
  });
  return true;
}

async function finalizeAmbiguity(
  phone: string,
  conversationId: number,
  ambState: AmbiguityState,
  freshSession: ChatSessionRow | null,
  text: string,
): Promise<void> {
  // Write resolved values into chat_sessions.slots
  const currentSlots = freshSession?.slots ? safeParseSlots(freshSession.slots) : {};
  const originPlace = ambState.resolvedOrigin ? await findPlaceByName(ambState.resolvedOrigin.toLowerCase()) : null;
  const destPlace = ambState.resolvedDest ? await findPlaceByName(ambState.resolvedDest.toLowerCase()) : null;
  const originDisplay = originPlace?.display_name ?? ambState.resolvedOrigin;
  const destDisplay = destPlace?.display_name ?? ambState.resolvedDest;
  const lang = detectLeadLang(text) as Lang;
  const updatedSlots = {
    ...currentSlots,
    origin: {
      value: ambState.resolvedOrigin,
      display: originDisplay,
      score: 1.0,
      reason: "user_selected",
      source: "USER_CONFIRMED",
      status: "CONFIRMED",
    },
    destination: {
      value: ambState.resolvedDest,
      display: destDisplay,
      score: 1.0,
      reason: "user_selected",
      source: "USER_CONFIRMED",
      status: "CONFIRMED",
    },
  };

  // Remove ambiguity metadata from slots
  delete (updatedSlots as any).__ambiguity;

  // FIX: usar upsertChatSession (INSERT+UPDATE) para que funcione incluso si
  // el .limpiar borró la fila de chat_sessions. updateChatSessionSlots es solo
  // UPDATE y falla silenciosamente si la fila no existe.
  await upsertChatSession(phone, updatedSlots, undefined, "slot_confirmation", undefined);

  // Show confirmation with the resolved values
  const confirmationMsg = t("finalize.summary", lang, { origin: originDisplay ?? "", dest: destDisplay ?? "" });
  await sendAndPersist(phone, conversationId, confirmationMsg);

  log.info("[AMBIGUITY_COMPLETE]", {
    origin: ambState.resolvedOrigin,
    destination: ambState.resolvedDest,
  });
}

// ── Mensaje contextual: Risk Nodes con alternativas SIN números, no-risk nodes sin opciones ──

function buildContextualPlaceOptions(
  slotKey: string,
  lang: Language,
  slotConfidenceHigh: boolean,
  rawTerm: string,
  entityCount: number,
): string {
  const safeRawTerm = rawTerm && rawTerm.trim().length > 0 ? rawTerm.trim() : "";
  const hasRawTerm = safeRawTerm.length > 0;
  const placeLabel = hasRawTerm ? safeRawTerm.charAt(0).toUpperCase() + safeRawTerm.slice(1).toLowerCase() : "";
  const l = lang as Lang;

  // Detectar si es un nodo de riesgo → usar templates contextuales
  const riskKey = detectRiskNode(safeRawTerm);
  if (riskKey) {
    const riskOptions = RISK_NODES[riskKey];
    if (riskOptions) {
      // AGT solo como destino, no como origen (business rule)
      const displayOptions = (slotKey === "origin" && riskKey === "aeropuerto")
        ? riskOptions.filter(o => !o.canonical.includes("AGT"))
        : riskOptions;
      const alternatives = displayOptions.map(o => o.display).join(", ");
      const lastComma = alternatives.lastIndexOf(", ");
      const naturalAlternatives = lastComma >= 0
        ? alternatives.substring(0, lastComma) + " o " + alternatives.substring(lastComma + 2)
        : alternatives;

      // P1: Usar templates contextuales en lugar de preguntas hardcodeadas
      const slotContext = detectSlotContext(safeRawTerm);
      const tone = detectConversationTone(safeRawTerm);
      const templateQuestion = selectDisambiguationTemplate(slotContext, tone, lang);
      
      // Si hay un template contextual, usarlo; sino fallback al catálogo
      if (templateQuestion) {
        return templateQuestion;
      }

      // Fallback: catálogo i18n
      const place = placeLabel.toLowerCase();
      if (slotKey === "origin") {
        return t("disamb.contextualOrigin", l, { place, alternatives: naturalAlternatives });
      }
      return t("disamb.contextualDest", l, { place, alternatives: naturalAlternatives });
    }
  }

  // P0.9.4: Pregunta directa sin comillas cuando rawTerm está vacío.
  if (!hasRawTerm) {
    return t("disamb.noRawTerm", l, { slotKey });
  }

  // No es nodo de riesgo → pregunta contextual SIN listar opciones
  if (slotConfidenceHigh && entityCount > 1) {
    return t("disamb.contextualHigh", l, { slotKey, place: placeLabel.toLowerCase() });
  }

  // Fallback genérico (baja confianza o pocas entidades)
  return t("disamb.contextualGeneric", l, { slotKey, place: placeLabel.toLowerCase() });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractRawValue(slotsJson: string, key: string): string | null {
  try {
    const slots = JSON.parse(slotsJson);
    if (typeof slots !== "object" || slots === null || Array.isArray(slots)) return null;
    return slots[key]?.value ?? null;
  } catch {
    return null;
  }
}

/** Normaliza texto: lowercase + elimina acentos/diacríticos para matching */
function normalizeText(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseSelection(text: string, options: AmbiguityOption[]): string | null {
  const trimmed = text.trim();

  // 1) "otro" / "other" → null (user wants to type a different place)
  if (/^(otro|other|otra|outro|outra)$/i.test(trimmed)) {
    return null;
  }

  // 2) Partial match with accent normalization (acentos: "iguazú" == "iguazu")
  const normalizedInput = normalizeText(trimmed);
  let match = options.find(o =>
    normalizeText(o.display).includes(normalizedInput) ||
    normalizeText(o.canonical).includes(normalizedInput),
  );
  if (match) return match.canonical;

  // 2b) Multi-word fallback: si el usuario escribió varias palabras,
  //     verificar que TODAS aparezcan en el texto de la opción.
  //     Ej: "aeropuerto iguazu" → todas las palabras están en
  //     "Aeropuerto IGR (Argentina)" → match!
  if (normalizedInput.includes(" ")) {
    const userWords = normalizedInput.split(/\s+/).filter(w => w.length > 2);
    if (userWords.length > 1) {
      match = options.find(o => {
        const optText = normalizeText(o.display) + " " + normalizeText(o.canonical);
        return userWords.every(w => optText.includes(w));
      });
      if (match) return match.canonical;
    }
  }

  // 2c) Single-word partial: si el usuario escribió una palabra significativa
  //     que aparece en alguna opción, matchear. Ej: "puerto" → "Centro de Puerto Iguazú"
  if (!match && normalizedInput.length >= 4) {
    match = options.find(o =>
      normalizeText(o.display).includes(normalizedInput) ||
      normalizeText(o.canonical).includes(normalizedInput),
    );
    if (match) return match.canonical;
  }

  // 2d) Fuzzy matching con distancia de Levenshtein para typos (ej: "cetnro" → "centro")
  if (!match && normalizedInput.length >= 4) {
    match = options.find(o => {
      const optWords = normalizeText(o.display + " " + o.canonical).split(/\s+/);
      return optWords.some(w => w.length >= 4 && levenshtein(normalizedInput, w) <= 2);
    });
    if (match) return match.canonical;
  }

  // 3) Try number selection (backward compat for sessions started before this change)
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    return options[num - 1].canonical;
  }
  if (!isNaN(num) && num === options.length + 1) {
    return null;
  }

  return null;
}

/** Extrae el nombre de lugar del texto del usuario, removiendo prefijos comunes como "desde", "del", "dsde" */
function extractLocationFromText(text: string): string {
  return text
    .replace(/^(?:digo\s+(?:que\s+)?(?:desde\s+)?|al\s+de\s+|quiero\s+(?:ir\s+)?(?:desde\s+)?|quisiera\s+(?:ir\s+)?(?:desde\s+)?|me\s+(?:gustaria|gustaría)\s+(?:ir\s+)?(?:desde\s+)?|desde\s+|de[l]?\s+|saliendo\s+(?:de\s+)?|del\s+|en\s+el\s+|en\s+|no\s+el\s+|dsde\s+|dde\s+|dede\s+|para\s+el\s+|para\s+|pa\s+ra\s+el\s+|pa\s+ra\s+|pa\s+)/i, '')
    .replace(/^(?:a[sls]?\s+|hasta\s+|hacia\s+)/i, '')
    .trim();
}

/**
 * P1: CONTEXTUAL INFERENCE — Infiere la opción más obvia basada en el contexto del slot resuelto.
 * 
 * Lógica:
 * - Si el slot resuelto contiene "Argentina" o "IGR" → preferir opciones con "Argentina" o "Puerto Iguazú"
 * - Si el slot resuelto contiene "Brasil" o "IGU" o "Foz" → preferir opciones con "Brasil" o "Foz"
 * - Si el slot resuelto contiene "Paraguay" o "AGT" o "CDE" → preferir opciones con "Paraguay" o "CDE"
 * 
 * Retorna el canonical_name de la opción inferida, o null si no hay una opción obvia.
 */
function inferFromContext(
  resolvedSlotValue: string,
  candidates: PlaceCandidate[],
): string | null {
  const resolved = resolvedSlotValue.toLowerCase();
  
  // Detectar país/región del slot resuelto
  let targetCountry: "argentina" | "brasil" | "paraguay" | null = null;
  
  if (resolved.includes("argentina") || resolved.includes("igr") || resolved.includes("puerto iguazú") || resolved.includes("puerto iguazu")) {
    targetCountry = "argentina";
  } else if (resolved.includes("brasil") || resolved.includes("brazil") || resolved.includes("igu") || resolved.includes("foz")) {
    targetCountry = "brasil";
  } else if (resolved.includes("paraguay") || resolved.includes("agt") || resolved.includes("cde") || resolved.includes("ciudad del este")) {
    targetCountry = "paraguay";
  }
  
  if (!targetCountry) {
    return null; // No hay contexto claro
  }
  
  // Buscar opción que coincida con el país/región
  const matchingCandidate = candidates.find(c => {
    const candidateText = (c.canonical_name + " " + (c.display_name || "")).toLowerCase();
    
    if (targetCountry === "argentina") {
      return candidateText.includes("argentina") || candidateText.includes("puerto iguazú") || candidateText.includes("puerto iguazu");
    } else if (targetCountry === "brasil") {
      return candidateText.includes("brasil") || candidateText.includes("brazil") || candidateText.includes("foz");
    } else if (targetCountry === "paraguay") {
      return candidateText.includes("paraguay") || candidateText.includes("cde") || candidateText.includes("ciudad del este");
    }
    
    return false;
  });
  
  return matchingCandidate?.canonical_name ?? null;
}

function getAmbiguityStateFromSlots(slotsJson: string): AmbiguityState | null {
  try {
    const parsed = JSON.parse(slotsJson);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      log.warn("[AMBIGUITY_PARSE] JSON.parse returned non-object", { type: typeof parsed });
      return null;
    }
    const amb = (parsed as any).__ambiguity;
    if (!amb) return null;

    // Backward compat: si options son strings (old format), convertirlas
    if (amb.originOptions?.length > 0 && typeof amb.originOptions[0] === "string") {
      amb.originOptions = amb.originOptions.map((s: string) => ({ display: s, canonical: s }));
    }
    if (amb.destOptions?.length > 0 && typeof amb.destOptions[0] === "string") {
      amb.destOptions = amb.destOptions.map((s: string) => ({ display: s, canonical: s }));
    }

    return amb as AmbiguityState;
  } catch {
    return null;
  }
}

async function persistAmbiguityState(phone: string, state: AmbiguityState): Promise<void> {
  const session = await getChatSession(phone);
  const currentSlots = session?.slots ? safeParseSlots(session.slots) : {};
  (currentSlots as any).__ambiguity = state;
  await upsertChatSession(phone, currentSlots, undefined, undefined, undefined);
}

function safeParseSlots(json: string): Record<string, any> {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      log.warn("[SAFE_PARSE] JSON.parse returned non-object, returning {}", { type: typeof parsed });
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

/** Distancia de Levenshtein para matching tolerante a typos (ej: "cetnro" → "centro") */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}
