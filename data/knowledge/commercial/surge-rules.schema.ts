// Schema Zod para surge-rules.json
// Valida la estructura de reglas de surge pricing (vacío por ahora).
// Estructura futura esperada por regla:
//   { holidayKey: string, country: "AR"|"BR"|"PY", multiplier: number,
//     description: string, active: boolean, validFrom?: string, validUntil?: string }

import { z } from "zod";

export const SurgeRuleSchema = z.object({
  holidayKey: z.string(),
  country: z.enum(["AR", "BR", "PY"]),
  multiplier: z.number().positive(),
  description: z.string(),
  active: z.boolean(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

export const SurgeRulesFileSchema = z.object({
  _note: z.string(),
  surgeRules: z.array(SurgeRuleSchema),
});

export type SurgeRule = z.infer<typeof SurgeRuleSchema>;
export type SurgeRulesFile = z.infer<typeof SurgeRulesFileSchema>;
