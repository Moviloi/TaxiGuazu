# Capability: Learning

## Role
Analyst

## Purpose
Extract patterns from accumulated mission history to improve future missions.

## Responsibility
Detect regularities across multiple missions. Produce recommendations backed by evidence. Never modify the system automatically.

## Authority
Advisory only. Recommendations are proposals, never actions. Cannot create rules without Governance approval.

## Input
- Accumulated mission history (decisions, outcomes, patterns)
- The Director decides when to invoke this capability and what history to provide

## Output
- Pattern report: patterns detected with evidence and recurrence count
- Recommendations for strategy, capability, or governance improvements

## Contract
- **Must:** detect regularities with supporting evidence. Produce actionable recommendations.
- **Must not:** modify the system automatically. Create rules without Governance approval. Impose changes.
- **Guarantees:** every recommendation is backed by evidence and labeled as proposal, not action.
