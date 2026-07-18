import type { ConversationDomain } from "@/lib/ai/types";
import { resolveSimpleFieldGap } from "@/lib/ai/field-resolver";

/**
 * @deprecated Use resolveSimpleFieldGap from @/lib/ai/field-resolver instead.
 * This function now delegates to field-resolver.ts for QB-04 unification.
 * Kept for backward compatibility — will be removed after QA-3 Sprint 2.
 */
export interface CompletenessResult {
  status: "ASK" | "COMPLETE";
  field?: "origin" | "destination";
}

/**
 * @deprecated Use resolveSimpleFieldGap from @/lib/ai/field-resolver
 * for new code. This function delegates internally.
 */
export function evaluateCompleteness(
  slots: Record<string, any> | null | undefined,
  domain?: ConversationDomain,
): CompletenessResult {
  const result = resolveSimpleFieldGap(slots, domain);
  if (result.field !== null) {
    return { status: "ASK", field: result.field as "origin" | "destination" };
  }
  return { status: "COMPLETE" };
}
