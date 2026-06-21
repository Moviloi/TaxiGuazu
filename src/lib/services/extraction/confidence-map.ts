import type { CoreDecision, ConfidenceMap } from "@/lib/ai/types";
import type { ExtractionResult, TripExtraction } from "@/lib/ai/extraction-schema";

export function buildConfidenceMap(
  coreDecision: CoreDecision,
  extractionResult: ExtractionResult,
  extractionData?: TripExtraction,
): ConfidenceMap {
  const slots = extractionResult.slots ?? {};
  const facts = coreDecision.facts ?? [];

  // Intent confidence: directamente del CORE
  const intent = coreDecision.confidence;

  // Slots geográficos + pasajeros: desde extraction scores
  const origin = slots.origin?.score ?? 0;
  const destination = slots.destination?.score ?? 0;
  const passengers = slots.passengers?.score ?? 0;

  // Date: mapea desde scheduled_at (misma dimensión semántica)
  const date = slots.scheduled_at?.score ?? 0;

  // Time: CORE detecta patrones de hora (TIME_RE), extraction no tiene slot time
  const hasCoreTime = facts.some((f) => f.startsWith("time:"));
  const time = hasCoreTime ? 0.6 : 0;

  // Mode: certeza sobre AHORA vs RESERVA
  // urgency="ahora" o fact "now:" → alta confianza AHORA
  // scheduled_at presente → alta confianza RESERVA
  // ambos presentes → ambigüo (0.5)
  // ninguno → default débil RESERVA (0.3)
  const hasNowSignal =
    extractionData?.urgency === "ahora" || facts.some((f) => f.startsWith("now:"));
  const hasSchedule = !!extractionData?.scheduled_at;
  const mode = hasNowSignal && hasSchedule
    ? 0.5
    : hasNowSignal
      ? 0.85
      : hasSchedule
        ? 0.80
        : 0.30;

  // Luggage: preparado para uso futuro, siempre 0 por ahora
  const luggage = 0;

  return { intent, origin, destination, date, time, passengers, mode, luggage };
}
