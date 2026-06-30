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
import { searchPlaces } from "@/lib/db/domains/geo";
import type { PlaceCandidate } from "@/lib/db/domains/geo";
import { getChatSession, updateChatSessionSlots } from "@/lib/db/database";
import { buildPlaceOptions } from "@/lib/ai/slot-confirmation";
import { interpretAmbiguity } from "@/lib/ai/ambiguity-interpreter";
import { detectLeadLang } from "@/lib/detect-lang";
import { sendAndPersist } from "@/lib/services/shared/message-helpers";
import type { ChatSessionRow } from "@/lib/db/types";
import type { CoreDecision } from "@/lib/ai/types";
import { log } from "@/lib/utils/logger";

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
}

function toOptions(candidates: PlaceCandidate[]): AmbiguityOption[] {
  return candidates.map(c => ({
    display: c.display_name || c.canonical_name,
    canonical: c.canonical_name,
  }));
}

function getDisplayNames(options: AmbiguityOption[]): string[] {
  return options.map(o => o.display);
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

  // If both resolved → finalize directly
  if (llmResolvedOrigin && llmResolvedDest) {
    log.info("[AMBIGUITY_LLM_AUTO]", {
      origin: llmResolvedOrigin,
      destination: llmResolvedDest,
    });
    await finalizeAmbiguity(phone, conversationId, {
      resolvedOrigin: llmResolvedOrigin,
      resolvedDest: llmResolvedDest,
      originOptions: toOptions(originCandidates),
      destOptions: toOptions(destCandidates),
    }, null, text);
    return true;
  }

  // Build ambiguity state with display names
  const ambiguityMeta: AmbiguityState = {
    resolvedOrigin: llmResolvedOrigin,
    resolvedDest: llmResolvedDest,
    originOptions: toOptions(originCandidates),
    destOptions: toOptions(destCandidates),
  };
  await persistAmbiguityState(phone, ambiguityMeta);

  // Ask for the first unresolved ambiguous slot
  const firstSlot = (!llmResolvedOrigin && originAmbiguous) ? "origin" : "destination";
  await setConversationalState(phone, "ambiguity_pending", firstSlot);

  const options = firstSlot === "origin" ? ambiguityMeta.originOptions : ambiguityMeta.destOptions;
  const lang = detectLeadLang(text);

  // Build contextual message using slot confidence
  const isOrigin = firstSlot === "origin";
  const slotHigh = isOrigin ? originSlotHigh : destSlotHigh;
  const entityCount = isOrigin ? originCandidates.length : destCandidates.length;

  const msg = buildContextualPlaceOptions(
    options,
    firstSlot,
    lang,
    slotHigh,
    rawOrigin ?? rawDest ?? "",
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
  if (!ambState) return false;

  const clarifyField = freshSession?.clarify_field ?? "origin";

  // Determine which options to use based on clarifyField
  const options = clarifyField === "origin" ? ambState.originOptions : ambState.destOptions;
  if (options.length === 0) return false;

  // Parse user selection — returns canonical name
  const selected = parseSelection(text, options);
  if (!selected) {
    // User didn't pick a valid option — show again
    const lang = detectLeadLang(text);
    const msg = buildPlaceOptions(getDisplayNames(options), clarifyField, lang);
    await sendAndPersist(phone, conversationId, msg);
    return true;
  }

  const lang = detectLeadLang(text);

  // Update resolved slot (store canonical name)
  if (clarifyField === "origin") {
    ambState.resolvedOrigin = selected;
    log.info("[AMBIGUITY_RESOLVED]", { field: "origin", value: selected });
  } else {
    ambState.resolvedDest = selected;
    log.info("[AMBIGUITY_RESOLVED]", { field: "destination", value: selected });
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

  await persistAmbiguityState(phone, ambState);
  await setConversationalState(phone, "ambiguity_pending", nextSlot);

  const msg = buildPlaceOptions(getDisplayNames(nextOptions), nextSlot, lang);
  await sendAndPersist(phone, conversationId, msg);

  log.info("[AMBIGUITY_NEXT]", { slot: nextSlot, optionsCount: nextOptions.length });
  return true;
}

async function finalizeAmbiguity(
  phone: string,
  conversationId: number,
  ambState: AmbiguityState,
  freshSession: ChatSessionRow | null,
  _text: string,
): Promise<void> {
  // Write resolved values into chat_sessions.slots
  const currentSlots = freshSession?.slots ? safeParseSlots(freshSession.slots) : {};
  const updatedSlots = {
    ...currentSlots,
    origin: {
      value: ambState.resolvedOrigin,
      score: 1.0,
      reason: "user_selected",
      source: "USER_CONFIRMED",
      status: "CONFIRMED",
    },
    destination: {
      value: ambState.resolvedDest,
      score: 1.0,
      reason: "user_selected",
      source: "USER_CONFIRMED",
      status: "CONFIRMED",
    },
  };

  // Remove ambiguity metadata from slots
  delete (updatedSlots as any).__ambiguity;

  await updateChatSessionSlots(phone, updatedSlots);
  await setConversationalState(phone, "slot_confirmation");

  // Show confirmation with the resolved values
  const confirmationMsg = `Solo para confirmar los datos del viaje:\n\n📍 *Origen:*\n✅ ${ambState.resolvedOrigin}\n\n📍 *Destino:*\n✅ ${ambState.resolvedDest}\n\n¿Está correcto?`;
  await sendAndPersist(phone, conversationId, confirmationMsg);

  log.info("[AMBIGUITY_COMPLETE]", {
    origin: ambState.resolvedOrigin,
    destination: ambState.resolvedDest,
  });
}

// ── Mensaje contextual basado en la matriz de confianza ──

function buildContextualPlaceOptions(
  options: AmbiguityOption[],
  slotKey: string,
  lang: string,
  slotConfidenceHigh: boolean,
  rawTerm: string,
  entityCount: number,
): string {
  // Si sabemos con alta certeza qué slot es pero hay múltiples entidades,
  // hacemos una pregunta contextual que demuestre comprensión.
  if (slotConfidenceHigh && entityCount > 1) {
    const slotLabel = slotKey === "origin" ? "salís" : "vas";
    const placeLabel = rawTerm.charAt(0).toUpperCase() + rawTerm.slice(1);

    if (lang === "en") {
      return `I understand you're departing from "${placeLabel}". Which one?\n\n${options.map((o, i) => `${i + 1}. ${o.display}`).join("\n")}\n\n${options.length + 1}. Other`;
    }
    if (lang === "pt") {
      return `Entendi que você está saindo de "${placeLabel}". Qual exatamente?\n\n${options.map((o, i) => `${i + 1}. ${o.display}`).join("\n")}\n\n${options.length + 1}. Outro`;
    }
    return `Entendí que ${slotLabel} de "${placeLabel}". ¿De cuál exactamente?\n\n${options.map((o, i) => `${i + 1}. ${o.display}`).join("\n")}\n\n${options.length + 1}. Otro`;
  }

  // Fallback genérico
  return buildPlaceOptions(
    options.map(o => o.display),
    slotKey,
    lang as any,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractRawValue(slotsJson: string, key: string): string | null {
  try {
    const slots = JSON.parse(slotsJson);
    return slots[key]?.value ?? null;
  } catch {
    return null;
  }
}

function parseSelection(text: string, options: AmbiguityOption[]): string | null {
  const trimmed = text.trim();

  // 1) Try number selection: "1", "2", etc.
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    return options[num - 1].canonical;
  }

  // 2) "otro" / "other" / last option number → null (user will type manually)
  if (/^(otro|other|otra)$/i.test(trimmed) || num === options.length + 1) {
    return null;
  }

  // 3) Try partial match on display text
  const lower = trimmed.toLowerCase();
  const match = options.find(o => o.display.toLowerCase().includes(lower) || o.canonical.toLowerCase().includes(lower));
  if (match) return match.canonical;

  return null;
}

function getAmbiguityStateFromSlots(slotsJson: string): AmbiguityState | null {
  try {
    const parsed = JSON.parse(slotsJson);
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
  await updateChatSessionSlots(phone, currentSlots);
}

function safeParseSlots(json: string): Record<string, any> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
