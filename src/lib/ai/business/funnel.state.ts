// FASE 7: Funnel State
// Mapea intents del pipeline a estados del funnel de conversión.

import type { BusinessInput, FunnelState } from "./types";

export function computeFunnelState(input: BusinessInput): FunnelState {
  const { intent, policyAction } = input;

  // POST_SERVICE → post_conversion (ya viajó)
  if (intent === "POST_SERVICE") return "post_conversion";

  // NOW → conversion (listo para ejecutar)
  if (intent === "NOW") return "conversion";

  // EMERGENCY → conversion (acción inmediata)
  if (intent === "EMERGENCY") return "conversion";

  // PRE_BOOKING → intent (cerca de reservar)
  if (intent === "PRE_BOOKING") return "intent";

  // BOOKING → intent
  if (intent === "BOOKING" || policyAction === "PROCEED_BOOKING") return "intent";

  // RESCHEDULE → intent (modificar reserva existente)
  if (intent === "RESCHEDULE") return "intent";

  // COMMERCIAL → consideration (investigando precio)
  if (intent === "COMMERCIAL") return "consideration";

  // INFORMATIONAL → consideration
  if (intent === "INFORMATIONAL") return "consideration";

  // AMBIGUOUS → consideration
  if (intent === "AMBIGUOUS") return "consideration";

  // GREETING → awareness
  return "awareness";
}
