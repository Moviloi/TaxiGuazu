# Learning Rules — AITOS

> Rules governing learning, opportunities, and fare adjustment.
> Source: `src/lib/services/learning/opportunity-engine.ts`, `src/lib/services/learning/fare-learning-engine.ts`, `src/lib/services/learning/event-tracking.ts`.

---

## 1. Event tracking

- **LR-1.1**: Intent detection is logged.
- **LR-1.2**: Entity detection is logged.
- **LR-1.3**: Suggestion acceptance/rejection is logged.
- **LR-1.4**: Trip lifecycle events are logged.

Source: `src/lib/services/learning/event-tracking.ts`

## 2. Opportunity engine

- **LR-2.1**: Opportunities trigger after trip confirmation.
- **LR-2.2**: Opportunity types include upgrades, discounts, packages.
- **LR-2.3**: Each opportunity has utility score, conversion prediction, and risk.
- **LR-2.4**: System load adjusts opportunity ranking.

Source: `src/lib/services/learning/opportunity-engine.ts`

## 3. Suggestion learning

- **LR-3.1**: Suggestions cover airport, time, and border inference.
- **LR-3.2**: Acceptance rate per suggestion type is tracked.
- **LR-3.3**: Suggestions are enabled only after ≥30 events.

Source: `src/lib/services/learning/suggestion-recalculator.ts`, `src/app/api/bot/metrics/route.ts`

## 4. Fare learning

- **LR-4.1**: Actual outcomes feed back into fare weights.
- **LR-4.2**: Weights stored in `learning_weights`.

Source: `src/lib/services/learning/fare-learning-engine.ts`

## 5. Decision logging

- **LR-5.1**: Every opportunity decision is logged in `decision_log`.
- **LR-5.2**: Decision log includes candidates, selected opportunity, utility score, guardrails.

Source: `src/lib/db/core/connection.ts` (`decision_log` table)

---

*Last updated: 2026-07-06*
