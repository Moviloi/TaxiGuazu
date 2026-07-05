// Schema Zod para pricing-rules.json
// Valida la estructura de reglas de pricing (vacío por ahora, solo nota + array).

import { z } from "zod";

export const PricingRulesSchema = z.object({
  _note: z.string(),
  pricingRules: z.array(z.unknown()),
});

export type PricingRulesData = z.infer<typeof PricingRulesSchema>;
