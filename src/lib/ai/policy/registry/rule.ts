// FASE 6.5: Registry Aggregator
// getAllRules retorna todas las reglas ordenadas por prioridad.

import { emergencyRule } from "./emergency.rule";
import { nowRule } from "./now.rule";
import { bookingRule } from "./booking.rule";
import { postServiceRule } from "./postService.rule";
import { greetingRule } from "./greeting.rule";
import { fallbackRule } from "./fallback.rule";
import type { PolicyRule } from "./types";

const ALL_RULES: PolicyRule[] = [
  emergencyRule,
  nowRule,
  bookingRule,
  postServiceRule,
  greetingRule,
  fallbackRule,
];

export function getAllRules(): PolicyRule[] {
  return ALL_RULES;
}
