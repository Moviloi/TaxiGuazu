// BKE GEO RESOLVER — Deterministic place disambiguation (replaces C3 interpretAmbiguity).
// PR-5B: Reutiliza componentes existentes (location-resolver, searchPlaces, inferFromContext).
// 0 LLM calls — 100% deterministic rules.
//
// Contrato de salida: compatible con InterpretationResult de ambiguity-interpreter.

import type { PlaceCandidate } from "@/lib/db/domains/geo";
import { resolveLocation } from "@/lib/services/geo/location-resolver";
import { detectSlotContext } from "@/lib/ai/disambiguation-templates";
import { log } from "@/lib/utils/logger";

// ─── Resultado (mismo contrato que InterpretationResult) ───────────────────

export interface GeoResolutionResult {
  selectedId: string | null;
  confidence: "high" | "low" | "failed";
  question?: string;
}

// ─── Métricas DRL ─────────────────────────────────────────────────────────

export interface DrlMetrics {
  attempts: number;
  resolved: number;
  escalated: number;
}

let drlMetrics: DrlMetrics = { attempts: 0, resolved: 0, escalated: 0 };

export function getDrlMetrics(): DrlMetrics {
  return { ...drlMetrics };
}

export function resetDrlMetrics(): void {
  drlMetrics = { attempts: 0, resolved: 0, escalated: 0 };
}

// ─── Inferencia de país desde un slot resuelto ────────────────────────────

function inferCountryFromResolvedSlot(resolvedValue: string): "argentina" | "brasil" | "paraguay" | null {
  const v = resolvedValue.toLowerCase();
  if (v.includes("argentina") || v.includes("igr") || v.includes("puerto iguaz")) return "argentina";
  if (v.includes("brasil") || v.includes("brazil") || v.includes("igu") || v.includes("foz")) return "brasil";
  if (v.includes("paraguay") || v.includes("agt") || v.includes("cde") || v.includes("ciudad del este")) return "paraguay";
  return null;
}

function matchCandidateByCountry(candidates: PlaceCandidate[], country: string): PlaceCandidate | null {
  const target = country.toLowerCase();
  return candidates.find((c) => {
    // Also check the country field of the candidate
    const cCountry = (c.country || "").toLowerCase();
    if (cCountry === target) return true;

    const text = (c.canonical_name + " " + (c.display_name || "")).toLowerCase();
    if (target === "argentina") return text.includes("argentina") || text.includes("puerto iguaz");
    if (target === "brasil") return text.includes("brasil") || text.includes("brazil") || text.includes("foz");
    if (target === "paraguay") return text.includes("paraguay") || text.includes("cde") || text.includes("ciudad del este");
    return false;
  }) ?? null;
}

// ─── Reglas determinísticas ───────────────────────────────────────────────

/**
 * R1: Candidato único → resolución directa.
 */
function ruleSingleCandidate(candidates: PlaceCandidate[]): GeoResolutionResult | null {
  if (candidates.length === 1) {
    return { selectedId: candidates[0].place_id, confidence: "high" };
  }
  return null;
}

/**
 * R2: Inferencia contextual — usa el otro slot resuelto para determinar país.
 */
function ruleContextualInference(
  candidates: PlaceCandidate[],
  resolvedOtherSlot?: string,
): GeoResolutionResult | null {
  if (!resolvedOtherSlot || candidates.length === 0) return null;

  const country = inferCountryFromResolvedSlot(resolvedOtherSlot);
  if (!country) return null;

  const matched = matchCandidateByCountry(candidates, country);
  if (matched) {
    log.info("[BKE_GEO:RULE]", { rule: "contextual_inference", selected: matched.canonical_name, country });
    return { selectedId: matched.place_id, confidence: "high" };
  }

  // Si no hay match exacto pero el contexto es fuerte, igual retornamos el mejor
  // candidato con confianza "low" — el caller decide si escalar
  return null;
}

/**
 * R3: Risk node (aeropuerto/centro/aduana) + contexto → resolución directa.
 */
function ruleRiskNode(
  candidates: PlaceCandidate[],
  userText: string,
  resolvedOtherSlot?: string,
): GeoResolutionResult | null {
  const context = detectSlotContext(userText);
  if (context === "generico") return null;

  if (!resolvedOtherSlot) return null;

  const country = inferCountryFromResolvedSlot(resolvedOtherSlot);
  if (!country) return null;

  const matched = matchCandidateByCountry(candidates, country);
  if (matched) {
    log.info("[BKE_GEO:RULE]", { rule: "risk_node", context, selected: matched.canonical_name });
    return { selectedId: matched.place_id, confidence: "high" };
  }

  return null;
}

/**
 * R4: Alta confianza de entidad — el candidato con mejor relevance score es muy superior al resto.
 */
function ruleHighEntityConfidence(candidates: PlaceCandidate[]): GeoResolutionResult | null {
  if (candidates.length < 2) return null;

  // Ordenar por relevance score descendente
  const sorted = [...candidates].sort((a, b) => b.tourist_relevance_score - a.tourist_relevance_score);
  const best = sorted[0];
  const second = sorted[1];

  // Si el mejor tiene score significativamente más alto (>2x) y > 50, es un ganador claro
  if (best.tourist_relevance_score > 50 && best.tourist_relevance_score > second.tourist_relevance_score * 2) {
    log.info("[BKE_GEO:RULE]", { rule: "high_entity_confidence", selected: best.canonical_name, score: best.tourist_relevance_score });
    return { selectedId: best.place_id, confidence: "high" };
  }

  return null;
}

/**
 * R5: Resolución por alias exacto — el user text coincide exactamente con un alias en DB.
 */
async function ruleAliasMatch(
  candidates: PlaceCandidate[],
  userText: string,
): Promise<GeoResolutionResult | null> {
  // Si solo hay un candidato que ya sabemos que matchea, no hace falta
  if (candidates.length <= 1) return null;

  // Intentar resolver con location-resolver (alias → exact → fuzzy)
  const resolved = await resolveLocation(userText);
  if (resolved.confidence !== "not_found" && resolved.place_id) {
    const matched = candidates.find((c) => c.place_id === resolved.place_id);
    if (matched) {
      log.info("[BKE_GEO:RULE]", { rule: "alias_match", selected: matched.canonical_name, confidence: resolved.confidence });
      return { selectedId: matched.place_id, confidence: "high" };
    }
  }

  return null;
}

// ─── Orquestador ──────────────────────────────────────────────────────────

/**
 * Intenta resolver ambigüedad geo usando reglas determinísticas (0 LLM).
 *
 * @returns GeoResolutionResult si DRL pudo resolver (confidence "high" o "low"),
 *          o null si el DRL no aplica (debe escalar a LLM).
 */
export async function resolveGeoAmbiguity(
  userText: string,
  candidates: PlaceCandidate[],
  slotName: "origin" | "destination",
  resolvedOtherSlot?: string,
): Promise<GeoResolutionResult | null> {
  drlMetrics.attempts++;

  // ── R1: Caso trivial — un solo candidato ──
  const r1 = ruleSingleCandidate(candidates);
  if (r1) { drlMetrics.resolved++; return r1; }

  // ── R2: Inferencia contextual por país ──
  const r2 = ruleContextualInference(candidates, resolvedOtherSlot);
  if (r2) { drlMetrics.resolved++; return r2; }

  // ── R3: Risk node con contexto ──
  const r3 = ruleRiskNode(candidates, userText, resolvedOtherSlot);
  if (r3) { drlMetrics.resolved++; return r3; }

  // ── R4: Alta confianza de entidad ──
  const r4 = ruleHighEntityConfidence(candidates);
  if (r4) { drlMetrics.resolved++; return r4; }

  // ── R5: Alias exacto ──
  const r5 = await ruleAliasMatch(candidates, userText);
  if (r5) { drlMetrics.resolved++; return r5; }

  // ── Ninguna regla aplicó → escalar a LLM ──
  drlMetrics.escalated++;
  log.info("[BKE_GEO:ESCALATE]", {
    slot: slotName,
    userText,
    candidateCount: candidates.length,
    hasContext: !!resolvedOtherSlot,
  });
  return null;
}
