// FASE 6.7: Correlation ID
// Cada request tiene un correlationId único.

import { randomUUID } from "crypto";

export function generateCorrelationId(): string {
  return randomUUID();
}
