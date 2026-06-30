import { z } from "zod";

export const TripExtractionSchema = z.object({
  origin: z.string().min(1).nullable().optional(),
  destination: z.string().min(1).nullable().optional(),
  passengers: z.number().int().positive().nullable().optional(),
  price: z.number().positive().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  flight: z.string().nullable().optional(),
  urgency: z.enum(["ahora", "pronto", "programado"]).nullable().optional(),
  customer_name: z.string().nullable().optional(),
  language: z.enum(["es", "en", "pt", "fr", "de", "it", "zh"]).nullable().optional(),
});

export type TripExtraction = z.infer<typeof TripExtractionSchema>;

export interface ExtractionResult {
  slots: Record<string, { value: string | number | null; score: number; reason: string; source?: string; status?: string }>;
  overall_confidence: number;
  action: "proceed" | "clarify" | "fallback_regex";
  clarify_field?: string;
}
