// Schema Zod para attractions.json
// Valida la estructura de precios e info de atractivos turísticos.

import { z } from "zod";

const PriceMapSchema = z.record(z.string(), z.string());

export const AttractionEntrySchema = z.object({
  name: z.string(),
  hours: z.string().optional(),
  distance: z.string().optional(),
  prices: PriceMapSchema,
  tips: z.string().optional(),
});

export const AttractionsMapSchema = z.record(z.string(), AttractionEntrySchema);

export type AttractionEntry = z.infer<typeof AttractionEntrySchema>;
export type AttractionsMap = z.infer<typeof AttractionsMapSchema>;
