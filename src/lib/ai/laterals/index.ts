// FASE 6.2: Entry point del sistema lateral.
// applyLaterals recibe un CoreDecision y retorna CoreLateral.
// Solo 5 intents tienen lateral; el resto retorna EMPTY_LATERAL.

import type { CoreDecision } from "@/lib/ai/types";
import { greetingLateral, bookingLateral, nowLateral, postServiceLateral, emergencyLateral } from "./handlers";
import { EMPTY_LATERAL } from "./types";
import type { CoreLateral } from "./types";

export function applyLaterals(core: CoreDecision): CoreLateral {
  switch (core.intent) {
    case "GREETING":
      return greetingLateral(core);
    case "BOOKING":
      return bookingLateral(core);
    case "NOW":
      return nowLateral(core);
    case "POST_SERVICE":
      return postServiceLateral(core);
    case "EMERGENCY":
      return emergencyLateral(core);
    default:
      return EMPTY_LATERAL;
  }
}
