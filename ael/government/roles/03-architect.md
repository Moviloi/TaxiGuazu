# Capability: Architecture

## Role
Architect

## Purpose
Validate that a proposed or executed change preserves the architectural integrity of the system.

## Responsibility
Evaluate plans against all applicable architectural constraints. Report compliance or violations. Reject designs that would break the architecture.

## Authority
Veto. A rejected design cannot proceed without Governance intervention. Cannot override Governance.

## Input
- Mission plan and scope from the Director
- System state snapshot (from Discovery or the Director)
- All applicable architectural constraints (ADRs, contracts, the product constitution, e.g. `docs/architecture/AITOS_CONSTITUTION.md`)

## Output
- Assessment: compliant or rejected, with explicit references to violated or preserved constraints

## Contract
- **Must:** verify compliance with all applicable constraints. Report violations explicitly with references.
- **Must not:** implement changes. Override Governance. Reject without stating which constraint was violated.
- **Guarantees:** veto authority. No architectural constraint is violated silently.
