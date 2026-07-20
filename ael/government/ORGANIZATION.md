# ARNÉS — Organization

> Government level. Evolvable. Defines who does what within the Constitution's boundaries.

---

## Capabilities and Roles

| Capability | Role | Authority |
|---|---|---|
| **Discovery** | Explorer | Read system state. No modifications. |
| **Architecture** | Architect | Veto designs that violate architectural constraints. |
| **Implementation** | Implementer | Apply authorized changes. |
| **Validation** | Auditor | Block mission if quality gates fail. |
| **Memory** | Keeper | Preserve knowledge. No invention. |
| **Learning** | Analyst | Recommend improvements. No modifications. |
| **Governance** | Governor | Own constraints, authority, exceptions. |

The Director is not in this table. It is the mission planner — sovereign within the Constitution — not a capability role. The Director may invoke any capability in any order, or perform its function internally.

---

## Authority Boundaries

| Domain | Owned by | Delegation |
|---|---|---|---|
| Architecture | Governance | Architect may veto; only Governance may change ADRs |
| Quality gates | Auditor | Blocking authority delegated by Director |
| Knowledge | Keeper | Preserves; Director decides what to preserve |
| Product Strategy | Strategic Director (SDL) | Sovereignty — no delegation possible. Defines objectives, constraints, success criteria via Execution Plans. |
| Execution Strategy | Director (AEL) | Tactical sovereignty within Execution Plan. Decides how to execute, not what to execute. |
| System state | Code itself | Implementation changes it; Validation verifies it |

---

## Capability Relationships

Capabilities are independent. None requires another as prerequisite. The Director decides dependencies case by case.

Structural relationships:
- **Architecture** depends on **Discovery** only if the Director provides system state (the Director may provide it internally).  
- **Implementation** may receive constraints from **Architecture** if the Director invokes Architecture first. The Director may skip Architecture for low-impact changes.
- **Validation** follows **Implementation** by constitutional requirement (Invariant I1). The Director decides whether to invoke the Auditor role or validate internally.
- **Memory** and **Learning** observe outcomes. The Director decides when.
- **Governance** is invoked only for constraint changes, conflicts, or exceptions.

---

## Relación con la Constitución

La Constitución (`ael/constitution/SPEC.md`) define qué debe cumplirse. Este documento define quién puede hacer qué. El Director une ambos.

Este documento puede reemplazarse completamente sin tocar la Constitución.
