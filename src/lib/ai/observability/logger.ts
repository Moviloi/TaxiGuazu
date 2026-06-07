// FASE 6.7: Non-blocking Logger
// logDecision es async, non-blocking, fail-safe.
// Nunca lanza errores hacia el caller.

import { shouldSample } from "./sampler";
import type { DecisionLog } from "./types";

export const OBS_DEBUG = process.env.OBS_DEBUG === "true";

export function logDecision(log: DecisionLog): void {
  try {
    // Debug mode: log 100%
    if (!OBS_DEBUG && !shouldSample(log.correlationId)) return;

    queueMicrotask(() => {
      try {
        console.log(JSON.stringify({ type: "DECISION_TRACE", ...log }));
      } catch {
        // silent fail — logging never breaks request
      }
    });
  } catch {
    // silent fail — logging never breaks request
  }
}
