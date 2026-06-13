import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotWorkflowContext } from "@/lib/services/workflow/slot-workflow";
import type { PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";

const DESCRIPTIVE_PREFIX: Record<string, string> = {
  "Puerto Iguazú": "Ciudad de Puerto Iguazú",
  "Aeropuerto IGR": "Aeropuerto IGR",
  "Aeropuerto Foz (IGU)": "Aeropuerto Foz (IGU)",
  "Foz Centro / Hotel Belmond": "Foz Centro / Hotel Belmond",
  "Centro Puerto Iguazú": "Centro de Puerto Iguazú",
  "Aduana Brasil (Puente Tancredo Neves)": "Aduana de Foz",
  "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil": "Foz / Rodoviaria / Cataratas Brasil",
  "Cataratas Brasil (Parque das Aves)": "Cataratas Brasil (Parque das Aves)",
  "Cataratas Argentinas / Hotel Meliá": "Cataratas Argentinas / Hotel Meliá",
};

function formatFieldLabel(
  raw: string,
  canonical: string | undefined,
  reason: string | undefined,
): { label: string; suggestion: string | undefined } {
  if (reason === "unknown_location") {
    return { label: `"${raw}" (desconocido)`, suggestion: undefined };
  }
  if (reason === "ambiguous_term" && canonical) {
    const display = DESCRIPTIVE_PREFIX[canonical] ?? canonical;
    return {
      label: `"${raw}" → *${display}*`,
      suggestion: display,
    };
  }
  if (canonical) {
    const display = DESCRIPTIVE_PREFIX[canonical] ?? canonical;
    return { label: `"${raw}" → ${display}`, suggestion: undefined };
  }
  return { label: `"${raw}"`, suggestion: undefined };
}

export function formatConfidenceNote(
  e: TripExtraction,
  confidenceResult: ExtractionResult,
  workflowResult: SlotWorkflowContext,
  pricing?: PricingResult,
): string {
  const parts: string[] = [];

  if (e.origin) {
    const originScore = confidenceResult.slots.origin?.score ?? 0;
    const originReason = confidenceResult.slots.origin?.reason;
    const originCanonical = pricing?.origin.canonical_name ?? undefined;
    const { label: originLabel, suggestion: originSuggestion } = formatFieldLabel(e.origin, originCanonical, originReason);
    parts.push(`Origen: ${originLabel} (Confianza: ${originScore * 100}%)`);
    if (originSuggestion) {
      parts.push(`SUGERENCIA_ORIGEN: "${originSuggestion}"`);
    }
  }
  if (e.destination) {
    const destScore = confidenceResult.slots.destination?.score ?? 0;
    const destReason = confidenceResult.slots.destination?.reason;
    const destCanonical = pricing?.destination.canonical_name ?? undefined;
    const { label: destLabel, suggestion: destSuggestion } = formatFieldLabel(e.destination, destCanonical, destReason);
    parts.push(`Destino: ${destLabel} (Confianza: ${destScore * 100}%)`);
    if (destSuggestion) {
      parts.push(`SUGERENCIA_DESTINO: "${destSuggestion}"`);
    }
  }
  if (e.passengers) parts.push(`Pasajeros: ${e.passengers}`);
  if (e.urgency) parts.push(`Urgencia: ${e.urgency}`);
  if (e.flight) parts.push(`Vuelo: ${e.flight}`);
  if (e.scheduled_at) parts.push(`Fecha: ${e.scheduled_at}`);
  if (e.customer_name) parts.push(`Nombre: ${e.customer_name}`);

  if (pricing && pricing.final_price > 0) {
    const pax = e.passengers || 1;
    const priceLabel = pax > 4 ? "precio hasta 6 pasajeros" : "precio hasta 4 pasajeros";
    parts.push(`PRECIO OFICIAL (calculado por backend): $${pricing.final_price} ARS (${priceLabel}).`);
    parts.push(`VALOR_PRECIO: ${pricing.final_price}`);
    parts.push(`Ruta oficial: ${pricing.origin.canonical_name} → ${pricing.destination.canonical_name}.`);
    parts.push(`NO calcules ni modifiques este precio. Usá SOLO los valores oficiales del backend.`);
  } else {
    parts.push(`VALOR_PRECIO: NO_DISPONIBLE`);
    if (e.origin && e.destination) {
      const originReason = confidenceResult.slots.origin?.reason;
      const destReason = confidenceResult.slots.destination?.reason;
      if (originReason === "unknown_location" && destReason !== "unknown_location") {
        parts.push(`No hay tarifa para ESE ORIGEN: "${e.origin}".`);
      } else if (destReason === "unknown_location" && originReason !== "unknown_location") {
        parts.push(`No hay tarifa para ESE DESTINO: "${e.destination}".`);
      } else {
        parts.push(`No hay tarifa para esa combinación de origen y destino.`);
      }
    }
    parts.push(`No inventes un precio. Si el cliente no puede aclarar, derivá con un colega humano.`);
  }

  const header = `Confianza general: ${confidenceResult.overall_confidence * 100}%. Estado: ${workflowResult.state}.` +
    (workflowResult.clarifyField ? ` Campo a clarificar: ${workflowResult.clarifyField}.` : "") +
    (workflowResult.askForConfirmation ? " El cliente debe confirmar los datos." : "");

  if (parts.length === 0) return header;
  return `${header}\n${parts.join("\n")}`;
}
