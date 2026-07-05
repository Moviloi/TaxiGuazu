// Schema Zod para escalation.json
// AIT-033: Valores hardcodeados de comprehension-runner.ts, guard.ts, policy-pipeline.ts

import { z } from "zod";

export const LlmPromptSchema = z.object({
  reinterpretPrompt: z.string(),
  frustrationPrompt: z.string(),
});

export const GuardMessagesSchema = z.object({
  outputViolation: z.string(),
  pipelineIncompleteTemplate: z.string(),
});

export const ExternalRefSchema = z.object({
  name: z.string(),
  value: z.number(),
  source: z.string(),
  description: z.string(),
});

export const EscalationPoliciesSchema = z.object({
  _note: z.string().optional(),
  frustrationPattern: z.string(),
  frustrationPatternFlags: z.string(),
  adminEscalationTemplate: z.string(),
  llmPrompts: LlmPromptSchema,
  guardMessages: GuardMessagesSchema,
  externalRefs: z.array(ExternalRefSchema),
});

export type EscalationPolicies = z.infer<typeof EscalationPoliciesSchema>;
export type LlmPrompt = z.infer<typeof LlmPromptSchema>;
export type GuardMessages = z.infer<typeof GuardMessagesSchema>;
export type ExternalRef = z.infer<typeof ExternalRefSchema>;
