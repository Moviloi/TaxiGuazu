# CHANGELOG — AITOS
## 2026-07-08 onward

---

## 2026-07-10 (current)

### F2 — Architecture Documentation Synchronization
- **Tipo**: Documentación
- **Resumen**: Auditoría completa de toda la documentación contra el código actual. 8 auditorías ejecutadas. Se corrigieron inconsistencias en ADR-007 (status "Propuesto" → "Accepted"), ADR_INDEX.md (entradas faltantes), architecture.md (diagrama de pipeline obsoleto), decision-architecture.md (intents incorrectos, falta StrategyDecision), system-map.md (paths y line counts desactualizados), operational-model.md (falta SD en pipeline). Se crearon 3 documentos nuevos: strategy-decision.md, handler-context.md, conversation-pipeline.md. Se actualizaron PROJECT_BOARD.md, CHANGELOG.md, DECISION_OWNERSHIP_MATRIX.md, DIAGRAMS.md. Se crearon 3 diagramas nuevos.
- **Archivos**: ADR-007, ADR_INDEX.md, architecture.md, decision-architecture.md, system-map.md, operational-model.md (actualizados). strategy-decision.md, handler-context.md, conversation-pipeline.md, diagrams/17-*, 18-*, 19-* (nuevos). PROJECT_BOARD.md, CHANGELOG.md, DECISION_OWNERSHIP_MATRIX.md, DIAGRAMS.md (actualizados).
- **Verificación**: Build ✅, 875/876 tests ✅, contratos ✅.

### D18 — Post-Freeze Compliance Audit
- **Tipo**: Auditoría
- **Resumen**: 7 audits ejecutados post-freeze. Verificación de que ADR-007 está 100% implementado y no hay violaciones de contrato. Veredicto: ✅ ADR-007 FULLY ENFORCED. 0 contract violations. Risk: LOW.

### F1 — Architecture Integration Validation
- **Tipo**: Validación
- **Resumen**: Pipeline completo trazado desde webhook hasta respuesta final. StrategyDecision lifecycle verificado (creación → propagación → consumo). HandlerContext trace completo. 7 auditorías: Pipeline Integrity ✅, StrategyDecision Trace ✅, HandlerContext Trace ✅, Contracts ✅, Dead Code ✅, Pipeline Integrity ✅, ADR-008 Compliance ✅. Veredicto: ✅ ARCHITECTURE INTEGRATION PASS.

### ADR-008 + Architecture Milestone v2.0
- **Tipo**: ADR + Documentación
- **Resumen**: ADR-008 creado y ACCEPTED. Normative contract para Conversational Decision Architecture. Architecture Freeze declarado. Milestone v2.0 documentado. ADR_INDEX.md actualizado.

### R5 Phase 2 — StrategyDecision Activation (Architecture Freeze)
- **Tipo**: Refactor + Cleanup + Congelamiento
- **Commit**: —
- **Resumen**: Ejecución del plan D17. Estrategia híbrida eliminada. StrategyDecision es la ÚNICA fuente de verdad para todas las decisiones estratégicas. Architecture Freeze activado.
  - **Fallbacks eliminados**: 5 `??` en policies removidos (FB1-FB5: inhibitNewBooking ×2, skipFieldResolution, preserveContext, inhibitBookingAccept). Ya no se leen señales originales (messageType, clientObjective, isCorrection) como fallback.
  - **LLM prompt**: responseLength, reassuranceNeeded, callToAction, tone inyectados como contexto estratégico en `buildResponsePrompt()`.
  - **Handler log**: greetingLength agregado al log [STRATEGY].
  - **D17 audit verificado**: 0 decisiones fuera de computeStrategyDecision(). 8 campos computados consumidos o expuestos.
  - **Architecture Freeze**: Cualquier cambio arquitectónico futuro requiere ADR con evidencia. Sin nuevos fields/types/domains sin ADR.
- **Archivos**: types.ts (strategyDecision opcional sin fallback), handler.ts (ctx creation ordenada), policy-ahora.ts (2 fallbacks → StrategyDecision), policy-reserva.ts (3 fallbacks → StrategyDecision), llm-response.ts (inyección de contexto SD).
- **Verificación**: 875/876 tests ✅ (0 regresiones — única falla pre-existente T2 fase-22 no relacionada), build ✅, contratos R1-R4 ✅.

### R4 Phase 1 — Field Priority Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Auditoría exhaustiva de 20 concerns de field priority (resolveNextRequiredField, evaluateCompleteness, slot-workflow, slot-state, requiresConfirmation, minimizeQuestions, inferMissingFieldFromCore, evaluateCompleteness domain-info, etc.). Implementación Phase 1: `fieldAcquisitionMode` ("skip"|"minimal"|"normal") + `fieldPriority` poblado en `StrategyDecision`. Computado desde `computeStrategyDecision()`.
  - **fieldAcquisitionMode** → "skip" si booking_urgent/cancel/emergency, "minimal" si speed=fast, "normal" si slow/normal
  - **fieldPriority** → orden canónico: ["origin","destination","passengers","scheduled_at"]. Vacío en skip, solo ["origin","destination"] en minimal
- **Auditoría**: 20 concerns encontrados. 2 centralizados en StrategyDecision. 12 permanecen locales (field-resolver, slot-workflow, slot-state, evaluate-completeness, comprehension). 6 ya migrados en R1-R3 (skipFieldResolution, inhibitBookingAccept, inhibitNewBooking, minimizeQuestions, skipConfirmation, fieldPriority skeleton).
- **Evaluación reorganización StrategyDecision**: ~20 fields. Se recomienda reorganizar en subobjetos en R5.
- **Archivos**: types.ts, conversation-strategy.ts, handler.ts (log).
- **Verificación**: 873/876 tests ✅ (0 regresiones nuevas — 3 pre-existing failures), build ✅, contratos R1-R4 ✅.

### R3 Phase 1 — Conversation Tone Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Auditoría completa de 14 concerns de tono conversacional (CLIENT_OBJ_RULES, MODE_RULES, engagementLevel, sentimentRisk, greeting variations, sentence count, etc.). Implementación Phase 1: `responseLength` ("short"|"normal"|"detailed"), `reassuranceNeeded` (boolean), `callToAction` ("none"|"soft"|"direct") añadidos a `StrategyDecision` y computados desde `computeStrategyDecision()`. Comportamiento observable idéntico.
  - **responseLength** → "short" si cancel/urgent/CLARIFY, "detailed" si ANSWER, "normal" en otros casos
  - **reassuranceNeeded** → true si clientObjective=trust_check
  - **callToAction** → "none" si cancel/inquiry_price/info_request/trust_check, "direct" si BOOKING/NOW/booking_urgent, "soft" si PRE_BOOKING/comparing_options
- **Auditoría**: 14 concerns de tono encontrados. 3 centralizados en StrategyDecision. 11 permanecen locales: 5 en llm-response.ts (CLIENT_OBJ_RULES, MODE_RULES), 4 en response-builder (greeting/builders), 2 en laterals (engagementLevel, sentimentRisk).
- **Evaluación reorganización StrategyDecision**: Crecimiento controlado (~18 fields). Se recomienda reorganizar en subobjetos (conversation/interaction/execution) en R5 (cleanup phase) si el tamaño sigue creciendo. Por ahora, mantener plano es más simple y no añade costo.
- **Archivos**: types.ts, conversation-strategy.ts, handler.ts (log).
- **Verificación**: 875/876 tests ✅ (mismo pre-existing failure), build ✅, contratos R1-R4 ✅.

### R2 Phase 1 — Conversation Speed Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Auditoría completa de 12 concerns de velocidad conversacional. Implementación Phase 1: `greetingLength` ("short"|"full"), `behaviorFlags.skipConfirmation` y `behaviorFlags.minimizeQuestions` añadidos a `StrategyDecision` y computados desde `computeStrategyDecision()`. Campos propagados via HandlerContext con fallbacks. Comportamiento observable idéntico.
  - **greetingLength** → "short" si speed=fast (cancel, urgent), "full" si normal/slow
  - **skipConfirmation** → true si speed=fast + (skipFieldResolution | inhibitNewBooking)
  - **minimizeQuestions** → true si speed=fast
- **Auditoría**: 12 concerns encontrados. 3 centralizados en StrategyDecision. 7 permanecen locales (field-resolver, lead.service, policy-pipeline, llm-response, execution metadata). 2 ya migrados en R1 (skipFieldResolution, skipLLM).
- **Archivos**: types.ts, conversation-strategy.ts.
- **Verificación**: 875/876 tests ✅ (mismo pre-existing failure), build ✅, contratos R1-R4 ✅.

### R1 Phase 1 — Strategy Decision Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Nueva función pura `computeStrategyDecision()` en `conversation-strategy.ts` que sintetiza señales existentes (purchaseIntent, urgency, clientObjective, messageType) en un `StrategyDecision` con mode, tone, speed, fieldPriority y 6 behaviorFlags. Migración gradual manteniendo comportamiento observable idéntico:
  - **purchaseIntent** → `behaviorFlags.skipLLM` (reemplaza isLowIntent en handler.ts LLM gating)
  - **urgency** → integrado upstream vía clientObjective, reservado para uso directo futuro
  - **clientObjective (booking_urgent)** → `behaviorFlags.skipFieldResolution` (policy-ahora dispatch directo)
  - **clientObjective (inquiry_price)** → `behaviorFlags.inhibitBookingAccept` (policy-reserva guard)
  - **messageType (cancel)** → `behaviorFlags.inhibitNewBooking` (ambas policies)
  - **isCorrection** → `behaviorFlags.preserveContext` (policy-reserva)
- **Archivos**: types.ts, conversation-strategy.ts (nuevo), handler.ts, policy-ahora.ts, policy-reserva.ts.
- **Verificación**: 875/876 tests ✅ (mismo pre-existing failure), build ✅, contratos R1-R4 ✅.

---

## 2026-07-08

### E12 — Client Objective Model (P3-06)
- **Tipo**: Implementación
- **Commit**: —
- **Resumen**: Nuevo módulo `client-objective.ts` (pure function `computeClientObjective`) que sintetiza señales existentes (facts, purchaseIntent, messageType) en `ClientObjective`: booking_urgent, booking_future, booking_generic, inquiry_price, comparing_options, trust_check, info_request, cancelling, none. Integrado en handler.ts → enrichedCtx, observable en policies, inyectado en prompt de LLM. Incluye nueva detección trust_check (no existía señal previa). booking_urgent salta field resolution en policy-ahora (dispatch directo). inquiry_price inhibe booking accepted en policy-reserva.
- **Archivos**: client-objective.ts (nuevo), types.ts, handler.ts, policy-ahora.ts, policy-reserva.ts, llm-response.ts.

### E11-B Implementation — urgency + CI classification en Policy
- **Tipo**: Implementación
- **Commit**: —
- **Resumen**: P2-14 urgency expuesto como señal independiente en HandlerContext/Policy (no solo fusionado en TemporalMode). P2-15 CI MessageType (cancel, correction) conectado a decisiones de Policy. 4 archivos modificados: types.ts, handler.ts, policy-ahora.ts, policy-reserva.ts.

### E11-B — Semantic Signals Remaining Audit
- **Tipo**: Auditoría
- **Resumen**: 24 señales evaluadas. 2 nuevas tareas P2 creadas (urgency a Policy, CI classification a decisiones). slotAssignmentConfidence, commercial/informational facts descartados para Policy.

### E11 C1-C2 — purchaseIntent conectado a Policy
- **Tipo**: Conectar
- **Commit**: —
- **Resumen**: purchaseIntent (high/medium/low) ahora fluye de CORE a HandlerContext y policies. Observable en [POLICY_ahora] y [POLICY_reserva]. Base para adaptación UX por intención de compra.

### AEL Backlog Consistency Audit
- **Tipo**: Auditoría
- **Resumen**: 8 gaps reales detectados en PROJECT_BOARD. 2 items marcados DONE (P1-01, P1-02). 4 P2 + 4 P3 agregados al backlog.

### AEL-H1 — Harness Evolution
- **Commit**: `11e6231`
- **Tipo**: Infraestructura
- **Resumen**: Keeper extendido para PROJECT_BOARD/CHANGELOG. Analyst para principle alignment. Director con checklist de cierre de misión.

### E6/E9/E10 — Conversational Alignment Audits
- **Tipo**: Auditoría
- **Resumen**: 6 hallazgos E6, 3 E9, 2 E10. Matriz de 17 principios conversacionales generada.

### RC2 — Conversation Interpreter
- **Commit**: `3080686`
- **Tipo**: Release
- **Resumen**: ADR-007 implementado. Conversation Interpreter (100L, función pura, 12 MessageTypes). B3 fix en entity-extractor. AEL-H1 completado.

### ADR-007 — Conversation Interpreter
- **Tipo**: ADR
- **Decisión**: Crear Conversation Interpreter como etapa del pipeline entre CORE y Extraction
- **Impacto**: Nuevo componente. Previene B3 y familia de bugs en origen.

### G1 — Stabilization Milestone
- **Commit**: `08ce37e`
- **Tipo**: Release
- **Resumen**: Cierre de hardening. Lead service 752→264 (−65%). 875/876 tests. 5 módulos workflow extraídos.

### A6 — Lead Service Final
- **Commit**: `08ce37e`
- **Tipo**: Refactor
- **Resumen**: Extraer slot-confirmation-text-handler (97L). Lead service ahora es fachada pura.

### A5 — Awaiting Confirmation Handler
- **Commit**: `08ce37e`
- **Tipo**: Refactor
- **Resumen**: Extraer handleAwaitingConfirmation (70L).

### P3.1 — Repository Hygiene Audit
- **Tipo**: Auditoría
- **Resumen**: 3 .gitignore, 55 JSON, 0 residuales. Apto para commit.

### P3 — Repository Hardening Final
- **Tipo**: Auditoría + Cleanup
- **Resumen**: Secretos redactados. 4 etiquetas "Hardening" eliminadas de código.

### B3 — Slot Merge Bug Audit
- **Tipo**: Auditoría
- **Resumen**: Causa raíz: entity-extractor asigna fuzzy match a destination por default.

### QA1 — Functional Certification
- **Tipo**: Certificación
- **Resumen**: 875/876 tests. Cobertura por escenario. Listo para piloto condicional.

### OPS1 — Production Readiness
- **Tipo**: Operaciones
- **Resumen**: 4 ERROR, 5 WARNING. ADMIN_API_KEY + SENTRY_DSN bloqueantes.

### RC1 — Release Candidate
- **Commit**: `c09a2c7`
- **Tipo**: Release
- **Resumen**: Build ✅, 875/876 tests, R1-R4 ✅, 144 archivos, +9114/−2398 líneas.
