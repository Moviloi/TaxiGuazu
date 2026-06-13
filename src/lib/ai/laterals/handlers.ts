// Laterales Handlers — pure functions
// Deterministas, sin regex nuevo, sin side effects, sin IO.
// SOLO interpretan facts[] + slotStability del core() existente.

import type { CoreDecision } from "@/lib/ai/types";
import type { CoreLateral, DispatchPriority, EngagementLevel, SentimentRisk, TimeSensitivity } from "./types";

function has(facts: string[], prefix: string): boolean {
  return facts.some((f) => f.startsWith(prefix));
}

function factValue(facts: string[], prefix: string): string | undefined {
  const f = facts.find((f) => f.startsWith(prefix));
  if (!f) return undefined;
  return f.slice(prefix.length);
}

// ── GREETING_LATERAL ──
export function greetingLateral(core: CoreDecision): CoreLateral {
  const greeting = factValue(core.facts, "greeting:") ?? "";
  const isWarm = greeting.includes("cómo estás") || greeting.includes("qué tal");
  const engagementLevel: EngagementLevel = isWarm ? "warm" : "neutral";

  return {
    contextFlags: [`engagement_${engagementLevel}`],
    nextAction: "engage_conversation",
    riskLevel: "low",
    metadata: { engagementLevel },
  };
}

// ── BOOKING_LATERAL ──
export function bookingLateral(core: CoreDecision): CoreLateral {
  const hasNowOrUrgency = has(core.facts, "now:") || has(core.facts, "urgency:");
  const hasDateTime = has(core.facts, "date:") || has(core.facts, "time:");
  const hasRoute =
    (core.slotStability?.origin && core.slotStability.origin !== "open") ||
    has(core.facts, "origin:");

  let urgencyScore: number;
  let timeSensitivity: TimeSensitivity;

  if (hasNowOrUrgency) {
    urgencyScore = 0.8;
    timeSensitivity = "immediate";
  } else if (hasDateTime) {
    urgencyScore = 0.6;
    timeSensitivity = "today";
  } else if (hasRoute) {
    urgencyScore = 0.5;
    timeSensitivity = "flexible";
  } else {
    urgencyScore = 0.3;
    timeSensitivity = "flexible";
  }

  return {
    contextFlags: [urgencyScore >= 0.5 ? "urgency_implicit" : "urgency_low"],
    nextAction: "start_booking_flow",
    riskLevel: "medium",
    metadata: { urgencyScore, timeSensitivity },
  };
}

// ── NOW_LATERAL ──
export function nowLateral(core: CoreDecision): CoreLateral {
  const hasNow = has(core.facts, "now:");
  const hasBothSlotsLocked =
    core.slotStability?.origin &&
    core.slotStability.origin !== "open" &&
    core.slotStability?.destination &&
    core.slotStability.destination !== "open";

  let dispatchPriority: DispatchPriority;

  if (hasNow && hasBothSlotsLocked) {
    dispatchPriority = "max";
  } else if (hasNow) {
    dispatchPriority = "high";
  } else {
    dispatchPriority = "normal";
  }

  return {
    contextFlags: [`dispatch_priority_${dispatchPriority}`],
    nextAction: "fast_dispatch",
    riskLevel: "medium",
    metadata: { dispatchPriority },
  };
}

// ── POST_SERVICE_LATERAL ──
export function postServiceLateral(core: CoreDecision): CoreLateral {
  const svc = factValue(core.facts, "post_service:") ?? "";

  let sentimentRisk: SentimentRisk;
  let riskLevel: CoreLateral["riskLevel"];

  if (svc.includes("queja") || svc.includes("reclamo") || svc.includes("devolución")) {
    sentimentRisk = "complaint";
    riskLevel = "high";
  } else if (svc.includes("gracias por") || svc.includes("excelente") || svc.includes("muy buen")) {
    sentimentRisk = "satisfied";
    riskLevel = "low";
  } else {
    sentimentRisk = "neutral";
    riskLevel = "medium";
  }

  return {
    contextFlags: [`sentiment_${sentimentRisk}`],
    nextAction: "handle_feedback",
    riskLevel,
    metadata: { sentimentRisk },
  };
}

// ── EMERGENCY_LATERAL ──
export function emergencyLateral(_core: CoreDecision): CoreLateral {
  return {
    contextFlags: ["escalation_urgent"],
    nextAction: "escalate_immediately",
    riskLevel: "high",
    metadata: { escalationLevel: "MAX" },
  };
}
