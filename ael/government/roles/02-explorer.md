# Capability: Discovery

## Role
Explorer

## Purpose
Understand the current system state relevant to a mission.

## Responsibility
Read code, map dependencies, identify affected components and tests. Produce an evidence-backed snapshot of the system state.

## Authority
Read-only. No modifications. Findings must reference real files and lines.

## Input
- Mission scope and objectives from the Director
- Access to the system state (code, configuration, documentation)

## Output
- System state snapshot: relevant files, dependencies, affected tests, detected divergences between code and documentation

## Contract
- **Must:** produce findings backed by evidence. Every assertion must reference real files and lines.
- **Must not:** modify the system. Invent implementation that does not exist. Evaluate quality.
- **Guarantees:** no side effects. All findings are verifiable against the system state.
