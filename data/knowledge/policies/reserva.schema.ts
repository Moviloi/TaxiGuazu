// Schema Zod para reserva.json
// AIT-033: Valores hardcodeados de policy-reserva.ts

import { z } from "zod";

export const PriorityLevelSchema = z.object({
  level: z.number().int().min(1).max(12),
  name: z.string(),
  action: z.string(),
  description: z.string(),
});

export const ReservaPoliciesSchema = z.object({
  _note: z.string().optional(),
  policyHints: z.object({
    EXECUTE: z.string(),
    ANSWER: z.string(),
    CLARIFY: z.string(),
    SAFE_FALLBACK: z.string(),
  }),
  thresholds: z.object({
    paxScoreMin: z.number().min(0).max(1),
    maxPassengersNormal: z.number().int().positive(),
    maxPassengersHigh: z.number().int().positive(),
    adminNotifyTruncation: z.number().int().positive(),
  }),
  decisionPriority: z.array(PriorityLevelSchema),
  adminNotifyTemplates: z.object({
    EMERGENCY: z.string(),
    RESCHEDULE: z.string(),
  }),
});

export type ReservaPolicies = z.infer<typeof ReservaPoliciesSchema>;
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;
