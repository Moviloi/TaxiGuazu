# Capability: Learning

## Role
Analyst

## Purpose
Extract patterns from accumulated mission history and audit alignment with project principles. Detect conceptual evolution needs and propose architectural improvements.

## Responsibility
- Detect regularities across multiple missions (code patterns, bug families, friction points).
- Audit alignment of the system with documented principles (conversational, architectural, operational).
- Detect when new audit findings reveal gaps in existing documentation or principles.
- Produce recommendations backed by evidence. Never modify the system automatically.
- Flag when a principle or ADR needs updating based on accumulated evidence.

## Authority
Advisory only. Recommendations are proposals, never actions. Cannot create rules without Governance approval. Cannot modify ADRs without Governance approval.

## Input
- Accumulated mission history (decisions, outcomes, patterns, audit reports)
- Current principles documentation (conversational principles, architectural ADRs)
- Current PROJECT_BOARD and TECHNICAL_DEBT_BASELINE
- The Director decides when to invoke this capability and what context to provide

## Output
- Pattern report: patterns detected with evidence and recurrence count
- Principle alignment report: gaps between principles and implementation
- Recommendations for strategy, capability, governance, or principle evolution
- Proposed tasks for PROJECT_BOARD (subject to Director approval)

## Contract
- **Must:** detect regularities with supporting evidence. Produce actionable recommendations. Audit principle alignment when invoked by Director.
- **Must not:** modify the system automatically. Create rules without Governance approval. Impose changes. Modify ADRs without Governance approval.
- **Guarantees:** every recommendation is backed by evidence and labeled as proposal, not action. Principle audits are traceable to source evidence.
