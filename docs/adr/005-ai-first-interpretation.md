# ADR 005: AI-First Interpretation over Heuristic Data Patches

**Status:** Accepted  
**Date:** 2026-06-29  
**Driver:** Quality — heuristic patches (CITY_PRIORITY, TYPE_PRIORITY) are fragile,
do not scale to unanticipated terms, and bypass the AI's semantic understanding.

## Context

The ambiguity resolution system needed to rank DB place candidates (e.g., "centro"
matches 7 places across 3 countries). The initial approach used hardcoded priority
maps (city proximity tiers + place type tiers) injected into the SQL ORDER BY.

These heuristics:
- Only handle anticipated patterns ("centro" works, but "zona norte" or "costanera"
  would need new rules)
- Require maintenance when new cities/types are added
- Cannot account for real-world context (user's language, conversation history,
  time of day, trip direction)
- Create a maintenance burden opposite to the AI-first architecture

## Decision

**Heuristic data patches are forbidden for context-sensitive interpretation.**
When the system needs to interpret ambiguous data (place names, temporal
expressions, fare rules), it must:

1. **Gather raw data** from the DB without heuristic ranking
2. **Pass the data to the LLM** with full context (user message, detected signals,
   candidate list with metadata)
3. **Let the LLM decide** — resolve with high confidence or ask a contextual
   question that demonstrates understanding

This applies specifically to:
- `searchPlaces()` — returns ALL candidates without hardcoded ordering, with
  full metadata (city, country, place_type, score)
- `getRecoveryMessage()` — when ambiguity is detected, LLM crafts the question
  showing awareness of what the user said
- `ambiguity-handler.ts` — LLM decides whether to auto-resolve or present options

### What does NOT change

- Deterministic flows (slot_confirmation, pricing) — these are exact, not ambiguous
- State machine transitions — unchanged
- Numbered-option UI for ambiguity — kept for user clarity
- `parseSelection()` — still works with numbered options

## Consequences

### Positive
- One architecture for ALL ambiguous patterns, not case-by-case hacks
- LLM uses real-world knowledge (geography, common sense) instead of brittle tiers
- Questions show genuine understanding of user input → better UX
- No maintenance burden when DB grows

### Negative
- LLM latency (1-3s) on ambiguity paths
- LLM cost (Groq free tier is generous today, but not forever)
- Risk of hallucination — mitigated by:
  - Structured output validation (LLM selects from candidate list only)
  - UI fallback (numbered options) if LLM fails or is uncertain
- Requires careful prompt engineering

### Enforcement (R4)

The AEL contract R4 enforces this:
- `grep` for CASE/WHEN patterns in ORDER BY clauses within geo.ts → FAIL
- Manual audit flag for any new heuristic ranking added to DB queries
