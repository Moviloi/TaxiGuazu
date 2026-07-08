# Capability: Validation

## Role
Auditor

## Purpose
Verify that the modified system state satisfies quality gates and does not introduce regressions.

## Responsibility
Execute all applicable quality validation procedures. Report pass or fail unambiguously. Block completion if quality gates fail.

## Authority
Blocking. A failed validation halts the mission. Cannot approve changes it has not verified.

## Input
- Modified system state (from Implementation)
- Applicable quality gates and their criteria

## Output
- Validation report: pass/fail per quality gate, evidence for each result

## Contract
- **Must:** execute all applicable quality gates. Report results with evidence. Block on failure.
- **Must not:** modify the system. Approve changes it has not verified. Ignore quality gates.
- **Guarantees:** a failed validation prevents mission closure. A passed validation provides evidence that quality gates were satisfied.
