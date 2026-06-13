// Tipos del sistema lateral
// Determinista, sin regex nuevo, sin side effects.

export type RiskLevel = "low" | "medium" | "high";

export type EngagementLevel = "warm" | "neutral" | "cold";

export type SentimentRisk = "satisfied" | "neutral" | "complaint";

export type TimeSensitivity = "immediate" | "today" | "flexible";

export type DispatchPriority = "max" | "high" | "normal" | "low";

export interface CoreLateral {
  contextFlags: string[];
  nextAction?: string;
  riskLevel: RiskLevel;
  metadata: Record<string, unknown>;
}

export const EMPTY_LATERAL: CoreLateral = {
  contextFlags: [],
  riskLevel: "low",
  metadata: {},
};
