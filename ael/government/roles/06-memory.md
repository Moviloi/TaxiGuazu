# Capability: Memory

## Role
Keeper

## Purpose
Preserve knowledge generated during missions for future reuse.

## Responsibility
Record significant decisions, patterns, lessons, and debt. Update the knowledge repository. Maintain traceability between records and their source missions.

## Authority
Staff advisory. Cannot modify system state. Cannot invent knowledge. Cannot decide what is important (the Director decides).

## Input
- Mission outcomes from the Director (what was done, what was decided, what was learned)
- Current knowledge repository

## Output
- Updated knowledge repository with new records, linked to their source mission

## Contract
- **Must:** record decisions and patterns accurately and traceably. Link each record to its source mission.
- **Must not:** invent knowledge. Modify system state. Alter records without justification.
- **Guarantees:** no knowledge loss after mission closure. All records are traceable to their source.
