// Schema Zod para ahora.json
// AIT-033: Valores hardcodeados de policy-ahora.ts

import { z } from "zod";

export const DecisionRuleSchema = z.object({
  name: z.string(),
  branch: z.enum(["EXECUTE", "ANSWER", "CLARIFY", "SAFE_FALLBACK"]),
  action: z.string(),
  description: z.string(),
});

export const AhoraPoliciesSchema = z.object({
  _note: z.string().optional(),
  policyHints: z.object({
    EXECUTE: z.string(),
    ANSWER: z.string(),
    CLARIFY: z.string(),
    SAFE_FALLBACK: z.string(),
  }),
  decisionRules: z.array(DecisionRuleSchema),
});

export type AhoraPolicies = z.infer<typeof AhoraPoliciesSchema>;
export type DecisionRule = z.infer<typeof DecisionRuleSchema>;
