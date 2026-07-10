# Decision Ownership Matrix — AITOS

> Documento vivo que define **quién decide qué** en el sistema.
> Cada concern estratégico tiene exactamente un owner.
> Última actualización: R5 — Architecture Freeze (2026-07-10).

---

## Estratégicas (StrategyDecision)

| Concern | Owner | Estado | Implementado en |
|---------|-------|--------|-----------------|
| **Conversation Mode** | `computeStrategyDecision()` | ✅ R1 | `conversation-strategy.ts:82-125` |
| **Conversation Tone** | `computeStrategyDecision()` | ✅ R1 (4 values) + R3 (3 sub-fields) | `conversation-strategy.ts:82-125` + R3 fields |
| **Conversation Speed** | `computeStrategyDecision()` | ✅ R1 | `conversation-strategy.ts:86-125` |
| **Purchase Intent** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.skipLLM` | `conversation-strategy.ts:63` |
| **Field Acquisition Mode** | `computeStrategyDecision()` | ✅ R4 | `conversation-strategy.ts:178-189` |
| **Field Priority** | `computeStrategyDecision()` | ✅ R4 (canonical order) | `conversation-strategy.ts:191-201` |
| **Response Length** | `computeStrategyDecision()` | ✅ R3 | `conversation-strategy.ts:139-154` |
| **Reassurance Needed** | `computeStrategyDecision()` | ✅ R3 | `conversation-strategy.ts:158` |
| **Call to Action** | `computeStrategyDecision()` | ✅ R3 | `conversation-strategy.ts:160-174` |
| **Greeting Length** | `computeStrategyDecision()` | ✅ R2 | `conversation-strategy.ts:129` |
| **Skip Confirmation** | `computeStrategyDecision()` | ✅ R2 → `behaviorFlags.skipConfirmation` | `conversation-strategy.ts:133` |
| **Minimize Questions** | `computeStrategyDecision()` | ✅ R2 → `behaviorFlags.minimizeQuestions` | `conversation-strategy.ts:137` |
| **Skip Field Resolution** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.skipFieldResolution` | `conversation-strategy.ts:72` |
| **Inhibit Booking Accept** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.inhibitBookingAccept` | `conversation-strategy.ts:75` |
| **Inhibit New Booking** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.inhibitNewBooking` | `conversation-strategy.ts:66` |
| **Preserve Context** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.preserveContext` | `conversation-strategy.ts:69` |
| **Skip LLM** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.skipLLM` | `conversation-strategy.ts:63` |
| **Needs Admin Notify** | `computeStrategyDecision()` | ✅ R1 → `behaviorFlags.needsAdminNotify` | `conversation-strategy.ts:78` |

---

## Operacionales (fuera de StrategyDecision)

| Concern | Owner | Estado | Responsable |
|---------|-------|--------|------------|
| **Next Required Field (runtime)** | `field-resolver.ts:resolveNextRequiredField` | ✅ B (local) | Función pura. Consume slots + core facts. |
| **Slot Status Tracking** | `slot-state.ts:buildSlotStates` | ✅ B (local) | Determina CONFIRMED/INFERRED/CONFIRMATION_PENDING |
| **Workflow State Transitions** | `slot-workflow.ts:evaluateWorkflowTransition` | ✅ B (local) | idle → collecting → slot_confirmation → awaiting_* |
| **Completeness Gate** | `evaluate-completeness.ts:evaluateCompleteness` | ✅ B (local) | ASK/COMPLETE para extraction |
| **Field Inference (core facts)** | `response-builder.ts:inferMissingFieldFromCore` | ✅ B (local) | Helper para comprehension |
| **Field Clarification (comprehension)** | `comprehension.ts` | ✅ B (local) | CLARIFICATION state → qué campo |
| **Comprehension Runner** | `comprehension-runner.ts` | ✅ B (local) | Recovery + clarificación |
| **Next Expected Fields** | `PolicyOutput.nextExpectedFields` | ✅ B (local) | Output de policy, no decisión |
| **Message Classification** | `conversation-interpreter.ts:interpretMessage` | ✅ B (local) | ADR-007: pure function |
| **Client Objective Detection** | `client-objective.ts:computeClientObjective` | ✅ B (local) | Pure function |
| **Dispatch Decision** | Policy | ✅ | policyAhora / policyReserva |
| **Pricing** | Pricing Engine | ✅ | `tariff-resolver.ts` |
| **Geo Resolution** | CORE | ✅ | `location-resolver.ts` |
| **Slot Extraction** | CORE + LLM | ✅ | `extraction-runner.ts` |

---

## Concerns con ownership compartido (R5 resuelto parcialmente)

| Concern | Owners actuales | Riesgo | Estado R5 |
|---------|----------------|--------|-----------|
| **Qué preguntar vs no preguntar** | StrategyDecision (fieldAcquisitionMode) + field-resolver (nextField) + policy (nextExpectedFields) | **BAJO** | StrategyDecision decide mode (skip/minimal/normal). field-resolver mantiene el "next field" exacto. |
| **Cuándo confirmar vs ejecutar** | StrategyDecision (mode: execute_immediate vs execute_confirm) + policy (requiresConfirmation) | **BAJO** | Mode ya define la intención. Policy mantiene control fino. |
| **Minimizar preguntas** | StrategyDecision (minimizeQuestions flag) + policies (ninguna consume aún) | **BAJO** | Flag existe y está disponible. Consumo futuro no requiere cambio de contrato. |

---

## Cobertura del concern Field Priority (R4 Phase 1)

| Sub-concern | Cobertura | Estado |
|------------|----------:|--------|
| field priority (orden) | 50% | ✅ Orden canónico en StrategyDecision. El next field runtime sigue en field-resolver. |
| slot priority | 0% | B (local) — slot-workflow maneja estados |
| infer origin | 100% | B (local) — field-resolver + core facts |
| infer destination | 100% | B (local) — field-resolver + core facts |
| infer datetime | 100% | B (local) — core facts |
| infer passengers | 100% | B (local) — core facts |
| minimize questions | 100% | ✅ Flag existe. Nadie lo consume aún → R5 |
| skip confirmation | 100% | ✅ Flag existe. Nadie lo consume aún → R5 |
| field acquisition mode | 100% | ✅ Nuevo en R4. Centraliza skip/minimal/normal |
| dispatch readiness | 0% | B (local) — operational-readiness module |
| ask confirmation | 50% | mode.execute_confirm vs execute_immediate ya decide. Policy sobreescribe. |

**Cobertura total del concern Field Priority**: **~60%** (3/20 concerns centralizados. R5 eliminó 5 `??` fallbacks. MinimizeQuestions y skipConfirmation flags disponibles para consumo futuro).

---

## Historial

| Fecha | Fase | Cambio |
|------|------|--------|
| 2026-07-10 | R4 Phase 1 | +Field Acquisition Mode, +Field Priority poblado |
| 2026-07-10 | R3 Phase 1 | +Response Length, +Reassurance Needed, +Call to Action |
| 2026-07-10 | R2 Phase 1 | +Greeting Length, +Skip Confirmation, +Minimize Questions |
| 2026-07-10 | R1 Phase 1 | Matriz inicial con 6 behaviorFlags + mode/tone/speed |
| **2026-07-10** | **R5 — Activación** | **5 `??` fallbacks eliminados. SD es única fuente de verdad. Architecture Freeze.** |
