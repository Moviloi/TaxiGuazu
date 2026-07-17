# PROJECT BOARD — AITOS
## Actualizado: 2026-07-16 | Etapa: Architecture Freeze V3 — Serie CE CERTIFICADA — RRR-1 COMPLETED

---

## Leyenda

| Prioridad | Significado |
|---|---|
| **P0** | Bloqueante — debe resolverse antes del próximo paso |
| **P1** | Alta — esta semana |
| **P2** | Media — este mes |
| **P3** | Baja — backlog |

---

## P0 — Bloqueantes

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P0-01 | Rotar ADMIN_API_KEY (expuesta en chat) | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-02 | Configurar SENTRY_DSN en Vercel | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-04 | Seed de choferes reales en Turso | Ops | READY | N/A | OPS1 | **BLOQUEA PILOTO** |
| P0-03 | `connection_cache` sin CREATE TABLE — riesgo de runtime error | DB | READY | N/A | P3 Audit |

## P1 — Alta prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P1-01 | ~~Implementar Conversation Interpreter (ADR-007)~~ | Pipeline | **DONE** | 007 | B3 | `3080686` |
| P1-02 | ~~Fix entity-extractor: guard para clarifications~~ | Extraction | **DONE** | N/A | B3 | `3080686` |
| P1-03 | Deshabilitar auto-insert de aliases con Levenshtein ≤3 | DB | READY | N/A | B3, GEO Audit |
| P1-04 | Cerrar fase-22 T2 (decisión de producto: ¿preservar origin en corrección parcial?) | Extraction | ADR_PENDING | N/A | S0 |
| P1-05 | `placeIdCache` nunca se invalida — agregar TTL | Geo | READY | N/A | P3 Audit |
| P1-06 | `is_principal2` nunca se escribe en código | DB | **PARTIAL** (type agregado, write operations pendientes) | N/A | P3 Audit |
| P1-07 | Configurar LOG_LEVEL=info en Vercel | Ops | READY | N/A | OPS1 |
| P1-08 | PAIR_BASE y CORRIDOR_PAIRS → migrar a tabla DB | Geo | READY | N/A | P3 Audit |
| P1-09 | ENTITY_CATALOG → migrar a tabla DB | Extraction | READY | N/A | P3 Audit |
| P1-10 | **CE-5 — Cognitive Migration Implementation** (EPIC) | Architecture | **DONE** | ADR-012 | CE Closure |
| P1-10a | PR-5A: DRL Foundation (engine + stubs + flags) | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10b | PR-5B: BKE Foundation (geo disambiguation) | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10c | PR-5C: C4/C6 DRL Simplification (suficiencia rules) | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10d | **PR-5D: DRL Assistance for A points (C1/C2/C5)** | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10e | **PR-5E: BKE Domain Consolidation (Entity, Pricing, Message)** | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10f | **PR-5E.1: Integración BKE (consumidores + tests)** | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10g | **PR-5F: Cognitive Metrics & Observability** | Architecture | **DONE** | ADR-012 | CE-5 |
| P1-10h | **PR-5G: Cognitive Architecture Certification Closure** | Architecture | **DONE** | ADR-012 | PR-5G |

## P2 — Media prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P2-01 | Eliminar dual engine pricing v2 | Pricing | READY | N/A | P1 Audit |
| P2-02 | LRU cache para resolveLocation (aliases repetidos) | Geo | READY | N/A | Cache Audit |
| P2-03 | Dropear tablas dead: driver_invitations, transfer_priority | DB | READY | N/A | P3 Audit |
| P2-04 | Dropear 30 columnas fantasma (geo-catastral, zones metadata, drivers) | DB | READY | N/A | P3 Audit |
| P2-05 | DEBT-02: Eliminar acoplamiento survey→lead | Services | READY | N/A | DEBT Baseline |
| P2-06 | Completar i18n (15 strings restantes) | I18n | READY | N/A | DEBT Baseline |
| P2-07 | Fix 4 type/DDL mismatches | DB | **DONE** | ADR-007 | P3 Audit |
| P2-08 | Human Layer: templates con variación | UX | READY | N/A | UX Audit |
| P2-09 | Métricas de experiencia conversacional | UX | READY | N/A | UX Audit |
| P2-10 | Persistir `last_intent` en chat_sessions (1 columna) | DB/Pipeline | READY | N/A | E6/E9/E10 |
| P2-11 | ~~Conectar `purchaseIntent` de CORE a Policy (C1-C2 E11)~~ | Policy | **DONE** | N/A | E11 |
| P2-12 | Formalizar `post_booking` state (no resetear a idle) | Workflow | READY | N/A | E6 |
| P2-13 | Inferencia semántica en Conversation Interpreter | Pipeline | READY | 007 | E6 |
| P2-14 | ~~Exponer `urgency:` fact a Policy como señal independiente~~ | Policy | **DONE** | N/A | E11-B |
| P2-15 | ~~Conectar CI `classification.type` a decisiones (correction/cancel)~~ | Policy | **DONE** | 007 | E11-B |

## P3 — Baja prioridad

| ID | Tarea | Dominio | Estado | ADR | Origen |
|---|---|---|---|---|---|
| P3-01 | Hotspots >400L (7 archivos) | Refactor | READY | N/A | Quality Baseline |
| P3-02 | Cobertura en Survey y Admin | Testing | READY | N/A | Coverage Report |
| P3-03 | iguazu-knowledge: migrar 110+ líneas a Turso | Data | READY | N/A | P3 Audit |
| P3-04 | DEBT-04 a DEBT-11 (fragmentar DB facade, split services) | Refactor | READY | N/A | DEBT Baseline |
| P3-05 | FUT-01 a FUT-10 (features futuras) | Features | READY | N/A | BACKLOG |
| P3-06 | ~~Derivar `client_objective` (booking_urgent, inquiry_price, comparing_options)~~ | Pipeline | **DONE** | N/A | E6/E9/E10/E12 |
| P3-07 | Trip bundles en Turso (P0.17) | Data | READY | N/A | E6 |
| P3-08 | Smart fill: extraer múltiples slots simultáneamente | Extraction | READY | N/A | E6 |
| P3-09 | No preguntar passengers si pricing flat 1-4 | Policy | READY | N/A | E6 |
 
---

## DONE (desde RC1)

| ID | Tarea | Commit |
|---|---|---|---|
| D01 | Hardening P0: eliminar código zombie | c09a2c7 |
| D02 | Hardening P1: eliminar geo-engine, pricing ownership | c09a2c7 |
| D03 | Test recovery S0-S2 | c09a2c7 |
| D04 | Lead service refactor A2-A6 (752→264) | 08ce37e |
| D05 | Bug fix B2: post-booking zone | 08ce37e |
| D06 | Quality baseline v1.0 | 08ce37e |
| D07 | ADR-007: Conversation Interpreter | — |
| D08 | Conversation Interpreter implementado | 3080686 |
| D09 | Entity-extractor guard para clarifications | 3080686 |
| D10 | AEL-H1: Harness evolution (Keeper, Analyst, Director) | 11e6231 |
| D11 | E11 C1-C2: purchaseIntent conectado de CORE a Policy | — |
| D12 | E11-B P2-14: urgency expuesto a Policy como señal independiente | — |
| D13 | E11-B P2-15: CI classification.type conectado a decisiones Policy | — |
| D14 | E12 P3-06: Client Objective Model implementado (booking_urgent, inquiry_price, trust_check, etc.) | — |
| D15 | R1 Phase 1: Strategy Decision Refactor — computeStrategyDecision() centralizado con purchaseIntent, urgency, clientObjective, messageType → behaviorFlags. 6 flags migrados a policies con fallback. 875/876 tests, build, contratos. | — |
| D16 | R2 Phase 1: Conversation Speed Refactor — greetingLength, skipConfirmation, minimizeQuestions añadidos a StrategyDecision. Computados desde computeStrategyDecision(). Audit completa de 12 concerns speed. Coverage: 3/12 concerns centralizados. | — |
| D17 | R3 Phase 1: Conversation Tone Refactor — responseLength ("short"|"normal"|"detailed"), reassuranceNeeded (boolean), callToAction ("none"|"soft"|"direct") añadidos a StrategyDecision y computados en computeStrategyDecision(). Audit completa de 14 concerns tone. 3 campos centralizados. 875/876 tests, build, contratos. | — |
| D18 | R4 Phase 1: Field Priority Refactor — fieldAcquisitionMode ("skip"|"minimal"|"normal") + fieldPriority poblado en StrategyDecision. Audit completa de 20 concerns field priority. 2 campos centralizados. 873/876 tests (0 regresiones nuevas), build, contratos. | — |
| D19 | **R5 Phase 2 — StrategyDecision Activation**: eliminados 5 `??` fallbacks en policies (FB1-FB5). StrategyDecision es la ÚNICA fuente de verdad para all strategic fields. responseLength/reassuranceNeeded/callToAction inyectados en prompt LLM. greetingLength agregado a handler log. 875/876 tests (0 regresiones — única falla pre-existente no relacionada), build ✅, contratos ✅. | — |
| D20 | **ADR-008 — Conversational Decision Architecture**: Normative contract. Architecture Freeze declarado. Ownership único por concern. | — |
| D21 | **ARCHITECTURE_MILESTONE_v2.0**: Milestone histórico de la Serie R. | — |
| D22 | **D18 — Post-Freeze Compliance Audit**: 7 audits PASS. 0 contract violations. Architecture verified compliant with ADR-007. | — |
| D23 | **F1 — Architecture Integration Validation**: Pipeline completo verificado. StrategyDecision trace ✅. ADR-008 compliance ✅. 43/43 references correctas. 875/876 tests, build, contracts ✅. | — |
| D24 | **F2 — Documentation Synchronization**: Documentación sincronizada con el código. 8 auditorías completadas. | — |
| D25 | **PR-2C — Observation Builder**: `buildObservation(signal)` creado en shadow mode. Observation con status='valid' a partir de Signal. Exportado de evidence/index.ts e integrado en lead.service.ts tras buildSignal. 21 tests nuevos (11 unit + 10 integración). 0 regresiones. | — |
| D26 | **PR-2D — Fact Builder**: `buildFact(observation, signal)` creado en shadow mode. 5 Facts estructurales: (1) observation validated, (2) channel, (3) message content present, (4) received timestamp, (5) conversation identified. Solo `type:'note'` — sin Facts semánticos. 29 tests nuevos (18 unit + 11 integración). Build ✅, Contratos ✅. | — |
| D27 | **PR-2E — Evidence Builder**: `buildEvidence(observation, facts)` creado en shadow mode. Encapsula Facts estructurales bajo una misma Observation. `type: 'user_input'`, `provenance: []`. Cadena completa prototipada: Message→Signal→Observation→Fact→Evidence. 18 tests nuevos (13 unit + 5 integración). Build ✅, Contratos ✅. | — |
| D28 | **PR-2F — Shadow Mode Observable**: `runShadowCognition` unifica Signal→Observation→Fact→Evidence en un solo entry point. `ShadowResult` contenedor inmutable observable. `EVIDENCE_SHADOW_LOGGING` para logging compacto. 26 tests nuevos (8+12+6). Lead.service.ts simplificado de 4 llamadas a 1. Build ✅, Contratos ✅. | — |
| D29 | **PR-3A — Evidence → Knowledge**: `Knowledge` consolida Facts de Evidence en campos estructurados (observationStatus, channel, hasContent, receivedAt, conversationId). `buildKnowledge(evidence)` builder protegido por `EVIDENCE_SHADOW_MODE`. `ShadowResult` extendido con `knowledge`. Pipeline: Message→Signal→Observation→Fact→Evidence→Knowledge. 42 tests nuevos (21+11+10). 338/338 tests de evidence PASS. Build ✅, Contratos ✅. | — |
| D30 | **PR-3B — Belief Builder**: `Belief` representa el compromiso epistémico del sistema ("el sistema cree que..."). `buildBelief(knowledge)` construye Belief a partir de Knowledge. Deriva `observationValid` (boolean), `isWellFormed`. No infiere, no interpreta, no deduce intención/origen/destino. 34 tests nuevos (23+11). Pipeline extendido: →Knowledge→Belief. Build ✅, Contratos ✅. | — |
| D31 | **PR-3C — Decision Builder**: `Decision` representa el compromiso cognitivo del sistema ("el sistema decide que..."). `buildDecision(belief)` construye Decision a partir de Belief. Deriva `validInput`, `readiness` (CognitiveReadiness), `missingInfo` auto-diagnóstico. No selecciona políticas, rutas ni respuestas. 32 tests nuevos (22+10). Pipeline completo: Message→Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision. Build ✅, Contratos ✅. | — |
| D32 | **PR-3E — Evidence Engine Architecture Freeze**: Final audit de 7 capas + resolución de S-1 (Signal future-date) y O-1 (Observation temporal invariant). ADR-009 redactado y ACCEPTED. Evidence Engine oficialmente frozen. 378/378 tests de evidence PASS (0 regresiones). Build ✅, Contratos ✅. Arquitectura cognitiva base para la siguiente generación: Memory → Reflection → Learning → Goals → Planning. | — |
| D33 | **PR-5A — Memory Architectural Design**: Primera etapa conceptual de la capa Memory. Definición ontológica, problem statement, inputs/outputs/responsibilities, boundaries, lifecycle, dependencies (Belief + Decision only), diferenciación de Knowledge/Belief/Decision/SessionMemory, servicio a Reflection/Learning/Goals/Planning, 7 invariantes (M-1 a M-7), 8 riesgos (R1-R8). Conceptual — sin código. | — |
| D34 | **PR-5B — Memory Semantic Contract Audit**: Auditoría profunda del contrato semántico de Memory. Definición exacta del snapshot, unidad atómica (Belief+Decision pair), reglas de pertenencia de campos (11 belong, 14 excluded), análisis de deduplicación con Reflection/Learning/Goals/Planning (0 duplicación), 7 invariantes adicionales (M-8 a M-14). 6 intentos de quiebre derrotados. Nuevos riesgos R9-R14 documentados. | — |
| D35 | **PR-5C — Memory Integration Contract Audit**: Auditoría del contrato de integración entre Memory y el orquestador (lead.service.ts). Punto de integración definido (después de runShadowCognition, antes de buildMemory), flujo de datos (Belief + Decision → MemorySnapshot), 10 reglas de contrato (C1-C10), 6 invariantes de integración (I1-MEM a I6-MEM), verificación de que el EE Freeze no se viola. ADR-010 creado y ACCEPTED. | — |
| D36 | **PR-6A a PR-6G — Reflection Architecture Audits + ADR-011**: 6 auditorías arquitectónicas (PR-6A a PR-6F) que refutaron la hipótesis de Reflection como capa independiente. ADR-011 aceptado. Reflection eliminada como capa del pipeline cognitivo. Pipeline simplificado: EE → Memory → Learning → Goals → Planning. Sin cambios de código. | — |
| D37 | **PR-6H — ARCHITECTURE_MILESTONE_v3.0**: Hito arquitectónico post-PR-6. Pipeline cognitivo oficial actualizado. 20 invariantes congelados documentados (6 de EE + 14 de Memory). 16 preguntas abiertas para PR-7 (Learning). Baseline oficial para el diseño cognitivo futuro. | — |
| D38 | **PR-7A — Learning Ontology Audit**: Auditoría ontológica de Learning desde primeros principios. Demostración de que Learning constituye una capa arquitectónica independiente. 9 preguntas ontológicas y contractuales respondidas. 5 criterios de capa cognitiva aplicados — Learning pasa los 5 (Reflection pasó 0/5). 3 intentos de eliminación derrotados. Pattern definido formalmente como ⟨F, R, c, W, K⟩. Diferenciado de Belief, Decision, y Goal. 6 invariantes propuestos (L-1 a L-6). 20 invariantes congelados mapeados. Documento: `docs/architecture/PR-7A_LEARNING_ONTOLOGY_AUDIT.md`. | — |
| D39 | **PR-7B — Learning Mathematical Model Audit**: Modelo matemático mínimo de Learning desde primeros principios. L: 𝒲 × Γ → 𝒫(𝒞) definida como composición Select ∘ Detect. Objeto de salida = ⟨P, θ, E⟩ (predicado, confianza, evidencia). Demostración de que la transformación cambia el orden lógico (1° → 2°) y constituye compresión abstractiva. 7 propiedades formales analizadas: pureza ✅, determinismo ✅, monotonicidad ❌, idempotencia N/A, composicionalidad ✅, cerradura ❌, trazabilidad ✅. No-monotonicidad demostrada por contraejemplo. Eliminación exitosa del término "Pattern" durante toda la auditoría. Re-incorporación demostrativa al final: c = ⟨P, θ, E⟩ ≡ Pattern. Documento: `docs/architecture/PR-7B_LEARNING_MATHEMATICAL_MODEL.md`. | — |
| D40 | **PR-7C — Learning Parameter Space & Evidence Audit**: Cierre del modelo matemático de Learning mediante análisis formal de (A) espacio de parámetros Γ y (B) modelo de evidencia E. Γ = Γ_detect × Γ_select × Γ_compute. E es un CONJUNTO de elementos de aridad k ⊆ W^k. Relación de equivalencia entre evidencias definida. Estructura algebraica de retículo demostrada (∪, ∩, ⊆, complemento). Impacto en trazabilidad, deduplicación y almacenamiento analizado. Modelo matemático completo: L: 𝒲 × Γ → 𝒫(𝒞). Documento: `docs/architecture/PR-7C_LEARNING_PARAMETER_SPACE_AND_EVIDENCE.md`. | — |
| D41 | **PR-7D — Learning Contract Derivation Audit**: Derivación de 4 contratos semánticos exclusivamente del modelo matemático cerrado (PR-7A + PR-7B + PR-7C). Contratos: (1) Memory → Learning, (2) Learning → Goals, (3) Learning → Auditoría, (4) Learning → Runtime. Cada contrato define: precondiciones, postcondiciones, invariantes, información obligatoria/opcional/prohibida, garantías mutuas, causas de rechazo. Pregunta resuelta: Γ NO es parte de la identidad matemática del Pattern (⟨P,θ,E⟩), SÍ de la identidad de verificación (⟨P,θ,E,γ⟩). Sin APIs, DTOs, clases ni código. Documento: `docs/architecture/PR-7D_LEARNING_CONTRACT_DERIVATION.md`. | — |
| D42 | **PR-7E — Learning Identity Audit**: Auditoría de identidad entre ADR-003 (Learning Operacional) y PR-7 (Learning Cognitivo). 4 hipótesis analizadas contra 12 dimensiones arquitectónicas. Veredicto: Hipótesis C — son DOS CAPAS DIFERENTES que comparten accidentalmente el nombre "Learning". 12/12 dimensiones diferentes (ontología, input, output, tipo de conocimiento, consumidores, contratos, invariantes, CCP, CRP, lenguaje, responsabilidades, pureza/estado). Hipótesis A (misma capa), B (subdominios) y D (reemplazo) refutadas. Recomendación de nomenclatura: "Operational Learning" (ADR-003) vs "Cognitive Pattern Discovery" (PR-7). Sin cambios de código requeridos. Documento: `docs/architecture/PR-7E_LEARNING_IDENTITY_AUDIT.md`. | — |
| D43 | **PR-7F — Learning Minimality Audit**: Auditoría de minimalidad aplicando el mismo rigor que eliminó Reflection (PR-6). 18 responsabilidades identificadas y clasificadas. 4 hipótesis de absorción evaluadas. Kernel irreducible demostrado. **Hallazgo crítico**: 4 responsabilidades de Learning (selección por θ_min, relevancia, no-redundancia, categorización) están MEZCLADAS — ontológicamente pertenecen a Goals. Learning no debería decidir qué es "relevante" para Goals. **Veredicto C**: Learning puede simplificarse — moviendo R9-R12 a Goals se eliminan violaciones SRP y CCP. Learning no puede eliminarse (kernel irreducible, absorción en Goals crea 3 violaciones graves). Documento: `docs/architecture/PR-7F_LEARNING_MINIMALITY_AUDIT.md`. | — |
| D44 | **PR-7G — Pattern Semantics Audit**: Auditoría ontológica profunda de R9-R12. 10 preguntas ontológicas respondidas. **Refutación parcial de PR-7F**: solo R10 (relevancia) es puramente Goals (B). R9 (θ_min) es contractual (C). R11 (no-redundancia) es A/B — Learning conserva dedup estructural. R12 (categorización) es A/B — Learning conserva τ descriptivo. PR-7F era demasiado agresivo al simplificar. Documento: `docs/architecture/PR-7G_PATTERN_SEMANTICS_AUDIT.md`. | — |
| D45 | **PR-8A a PR-8G — Goals Architecture Elimination**: Serie completa de 7 auditorías que demuestran que Goals NO debe existir como capa independiente. **Metodología**: mismo rigor que eliminó Reflection (PR-6). **Hallazgos convergentes**: (A) ontología — mismo tipo prescriptivo que Planning, (B) modelo matemático — kernel trivial (filter+lookup+sort), (C) identidad — Goal = Intention = Action, (D) contratos — Learning→Planning reemplaza Learning→Goals, (E) evolución — dependencia asimétrica total con Planning, (F) minimalidad — 100% absorbible en Planning, (G) semántica — 0 propiedades intrínsecas. **Pipeline simplificado**: EE → Memory → Learning → Planning (4 capas). Documentos: `docs/architecture/PR-8[A-G]_*.md`. | — |
| D46 | **PR-9A a PR-9G — Planning Architecture Elimination**: Serie completa de 7 auditorías que demuestran que Planning NO debe existir como capa cognitiva independiente. **Metodología**: mismo rigor aplicado a Reflection, Learning y Goals. **Hallazgos convergentes**: (A) ontología — produce instrucciones, no conocimiento — 0/5 criterios de capa, (B) modelo matemático — kernel trivial (filter+lookup+select), (C) identidad — Action no es concepto ontológicamente distinto, (D) contratos — Learning→Sistema Operacional reemplaza Learning→Planning, (E) evolución — sin ciclo independiente, (F) minimalidad — 100% absorbible en sistema operacional, (G) semántica — 0 propiedades intrínsecas. **Pipeline cognitivo final**: EE → Memory → Learning (3 capas). Transición cognición→acción via contrato CognitiveInsights. Documentos: `docs/architecture/PR-9[A-G]_*.md`. | — |
| D47 | **PR-10A a PR-10F — Boundary Architecture Elimination**: Serie de 6 auditorías que demuestran que el boundary cognitivo-operacional NO constituye una entidad arquitectónica independiente. **Metodología**: mismo rigor (PR-6 a PR-9). **Hallazgos convergentes**: (A) ontología — el boundary no produce nada, solo transporta Patterns — 0/5 criterios de entidad, (B) modelo matemático — función identidad (B(M)=M), sin transformación, (C) contratos — todos heredados de Learning (PR-7D), ninguno propio, (D) evolución — sin ciclo independiente, cambia solo reactivamente, (E) minimalidad — 100% absorbible como API de Learning, (F) semántica — 0 propiedades intrínsecas. **Resultado**: el "CognitiveInsights contract" no es una entidad separada. Es la API pública de Learning. La separación cognitivo/operacional se mantiene mediante reglas de importación unidireccional y políticas de diseño. Documentos: `docs/architecture/PR-10[A-F]_*.md`. | — |
| D48 | **S1A — Global Irreducibility Audit**: Pipeline EE→Memory→Learning refutado desde primeros principios. Hallazgo crítico: `runShadowCognition()` descarta su retorno (lead.service.ts:83) — el EE output nunca llega a Memory. Memory no existe como código. Learning cognitivo no existe. **Veredicto D**: contradicción entre teoría arquitectónica y código real. Documento: `docs/architecture/S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md`. | — |
| D49 | **PR-11 — Cognitive Reality Alignment Audit**: 5 auditorías de alineamiento post-S1A. Clasificación A/B/C/D de cada elemento. **Veredicto B**: la arquitectura debe documentarse como futura, no existente. Resolución propuesta: renombrar Learning cognitivo → Pattern Discovery, separar documentación presente/futuro, capturar ShadowResult. Documento: `docs/architecture/PR-11_COGNITIVE_REALITY_ALIGNMENT.md`. | — |
| D50 | **IM-1 — Memory Implementation (ATR-1)**: Primera implementación de la capa Memory cognitiva. 7 archivos creados en `src/lib/memory/` (types, snapshot, builder, service, storage, init, index). Tabla `cognitive_memory_snapshots` en initSchema(). Feature flag `COGNITIVE_MEMORY_ENABLED`. Integración en `lead.service.ts`: ShadowResult capturado, store() llamado condicionalmente. 45 tests nuevos (38 unit + 7 integración). 0 regresiones. 6 normalizaciones documentales aplicadas. Build ✅, Contratos ✅. | — |
| D51 | **DEBT-12 — Persistence Stabilization (Fase 1+2)**: DDL extraído a schema/schema.sql. connection.ts simplificado de 740→187 líneas. 6 type mismatches corregidos. 13 smoke tests. npm run verify. ADR-007 como autoridad del esquema. 1395/1398 tests, Build ✅, Contratos ✅. | — |
| D52 | **DEBT-13 — trip_status elimination**: Eliminadas todas las referencias ejecutables a `trip_status` (hard-reset.ts, page.tsx, database.ts, connection.ts). Solo documentación y comentarios preservados. Black box audit `.limpiar`: 14/14 escenarios PASS con 0 errores. | 0a8719d |
| D53 | **DEBT-14 — Vercel TypeError fix**: Causa raíz identificada: `import.meta.dirname` (Node 20.11+) no tiene transform en webpack → `void 0` → `TypeError: paths[0]`. Fix: `path.resolve(process.cwd(), "schema/schema.sql")` + guard `fs.existsSync`. Build verificado sin `void 0` en bundle. 14/14 blackbox, Build ✅, Contratos ✅. | — |
| D54 | **DEBT-14C — Post-fix verification & audit**: Build ✅, Contratos ✅, flujo `initSchema()` auditado (singleton, splitSQLStatements correcto con BEGIN/END, schema.sql idempotente con `IF NOT EXISTS`, sin branching por entorno, sin race condition crítica). Checklist de deploy preparado. | — |
| D55 | **CE-1 — Cognitive Efficiency Audit**: Inventario completo de 7 puntos de consumo LLM (C1-C7), 3 providers, 1 factory, 5 orquestadores, 12 archivos. Máximo teórico: 10 llamadas LLM por mensaje. Estado producción: 0 providers funcionales. Documento: `docs/architecture/CE-1_COGNITIVE_EFFICIENCY_AUDIT.md`. | — |
| D56 | **CE-2 — Inevitability Classification**: Clasificación A/B/C/D de cada punto de consumo LLM. 4 inevitables (A), 2 simplificables (B), 1 reemplazable (C), 0 eliminables (D). Documento: `docs/architecture/CE-2_INEVITABILITY_CLASSIFICATION.md`. | — |
| D57 | **CE-3A — Business Knowledge Engine Design**: 11 dominios de conocimiento, 7 categorías de servicios, integración con 6 componentes arquitectónicos. BKE como capa Nivel 0 cognitivo. Documento: `docs/architecture/CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md`. | — |
| D58 | **CE-3B — Deterministic Reasoning Layer Design**: 5 tipos de decisiones, 7 familias de reglas, flujo de escalamiento BKE→DRL→Groq→Gemini. DRL como capa Nivel 1 cognitivo. Documento: `docs/architecture/CE-3B_DETERMINISTIC_REASONING_LAYER.md`. | — |
| D59 | **CE-4 — Migration Roadmap**: 5 fases (0-4), 9 sprints estimados, feature flags, métricas de validación, umbrales de rollback. Reducción esperada: 60-80% llamadas LLM vs baseline. Documento: `docs/architecture/CE-4_MIGRATION_ROADMAP.md`. | — |
| D60 | **ADR-012 — Cognitive Escalation Principle**: Decisión arquitectónica formal. Stack 3 niveles (BKE→DRL→LLM), 7 principios derivados (P1-P7). Impacto en arquitectura, mantenibilidad, costo, resiliencia, observabilidad, testabilidad. Modifica parcialmente ADR-005. Documento: `docs/adr/012-cognitive-escalation-principle.md`. | — |
| D61 | **PR-5G — Cognitive Architecture Certification Closure**: Certificación de la Serie CE. Fix build (H-01), ADR-012 ACEPTADO (H-02), DRL geo integrado (H-03), recovery-resolver auditado (H-04), docs sincronizadas (H-05). Verdict: **CERTIFICADO**. Architecture Freeze V3 declarado. | — |
| D62 | **RRR-1 — Release Readiness Review**: Review completa del sistema. Build ✅ (39.9s), Tests 1653/1657 ✅, Contratos ✅. Veredicto: **READY FOR STAGING WITH CONDITIONS**. Plan de activación en 7 fases. Condiciones documentadas para producción. | — |
| D63 | **PR-H0A — Staging Hardening Audit**: Auditoría completa post-RRR-1 sobre 7 áreas. H0A-01 (flags): 11 sin documentar. H0A-02 (tests): 4 fallas clasificadas. H0A-03 (middleware): 0 existe. H0A-04 (key rotation): expuesta. H0A-05 (shadow flags): sin wrapper. H0A-06 (sentry): sin DSN. H0A-07 (memory): wiring gap confirmado. H0A-08 (pattern discovery): bug + DB schema ausente. H0A-09 (log_level): no configurado. H0A-10 (precommit): no activo. Documento: `docs/certification/H0A_STAGING_HARDENING_AUDIT.md`. | — |

---

## Deferred / Backlog Post-v1

Ítems que **no bloquean v1.0 / Version Zero**. Se retomarán cuando haya tráfico real que justifique la inversión.

| ID | Tarea | Dominio | Motivo del diferimiento | Condición para retomar |
|---|---|---|---|---|
| PRD-05 | **Centralizar middleware de seguridad** | Security | La validación permanece local a cada endpoint. Sin tráfico real, la centralización es sobreingeniería. **No bloquea v1.0 / Version Zero.** | Cuando se detecte un incidente de seguridad o el tráfico supere X requests/día que hagan insostenible la validación inline. Ver `docs/architecture/DEFERRED_MIDDLEWARE.md`. |

---

## Dependencias

```
P0-01 ──→ (bloquea piloto)
P0-02 ──→ (bloquea piloto)
P1-09 ──→ P1-03 (entity catalog en DB alimenta al interpreter)
P2-01 ──→ P2-02 (sin v2, el pricing cache es más simple)
P2-12 ──→ D05 (post_booking state formaliza el fix B2 existente)
P2-13 ──→ D08 (inferencia semántica enriquece el Conversation Interpreter)
P2-14 ──→ D11 (urgency sigue el mismo patrón que purchaseIntent)
P2-15 ──→ D08 (classification.type existe pero no influye en decisiones)
```

---

## Pending before Production

| ID | Tarea | Dominio | Estado | Notas | Prioridad H0A |
|---|---|---|---|---|---|---|
| PRD-01 | **Conectar Memory al pipeline** — Integrar `memoryService.store()` en `lead.service.ts` como paso post-`runShadowCognition()` | Memory | READY | `COGNITIVE_MEMORY_ENABLED=false` por defecto. Requiere feature flag documentation en `.env.example`. **H0A-07**: gap de wiring confirmado — lead.service.ts tiene 0 referencias a Memory. | No bloquea staging |
| PRD-02 | **Corregir Pattern Discovery** — Bug en `repository.ts` (`readActivePatterns`/`readPatternHistory` parsea `acceptance_json` incorrectamente) | Pattern Discovery | BLOCKED | **H0A-08**: parse devuelve `any` casteado a `Pattern[]` — runtime `acceptance` es objeto raw, no instancia con `isAccepted()`. Además, tablas `pattern_discovery_patterns` y `pattern_discovery_history` NO EXISTEN en schema.sql — runtime error garantizado si se activa. NO activar hasta fix. | No activar |
| PRD-03 | **Completar `.env.example`** — Agregar flags faltantes. **H0A-01**: 12 flags de feature-flags.ts no documentadas (BKE_ENABLED, BKE_GEO_ENABLED, BKE_ENTITY_ENABLED, BKE_PRICING_ENABLED, BKE_MESSAGE_ENABLED, DRL_ENABLED, DRL_COMPREHENSION_ENABLED, DRL_RECOVERY_ENABLED, DRL_EXTRACTION_ASSISTANCE_ENABLED, DRL_RESPONSE_ASSISTANCE_ENABLED, DRL_FRUSTRATION_ASSISTANCE_ENABLED, LOG_LEVEL). **H0A-05**: 3 shadow flags sin función wrapper (COGNITIVE_MEMORY_ENABLED, EVIDENCE_SHADOW_MODE, EVIDENCE_SHADOW_LOGGING). 2 Pattern Discovery flags (PATTERN_DISCOVERY_ENABLED, PATTERN_DISCOVERY_DRY_RUN). **⚠️ CORREGIDO**: `DRL_GEO_ENABLED` no existe en el código — la flag geo correcta es `BKE_GEO_ENABLED`. | Ops | READY | **BLOQUEA STAGING** — operadores no pueden configurar BKE/DRL/Evidence/Memory/PD |
| PRD-04 | **Estabilizar tests dependientes de LLM** — **H0A-02**: 4 fallas clasificadas: T1 (improved-flows timeout 5000ms LLM real), T2 (improved-flows `vi.mocked(...).mockResolvedValue is not a function` — Vitest 4 compat), T3 (fase-22-correction-flow assertion — DRL geo regression, `expected null but got 'Aeropuerto IGR'`), T4 (memory-integration timeout 5000ms — importa lead.service → LLM providers). | Testing | READY | **BLOQUEA STAGING** — CI/CD nunca 100% verde. T3 requiere decisión de producto |
| PRD-06 | **Configurar Sentry y logging** — **H0A-06**: SENTRY_DSN no configurado (P0-02). **H0A-09**: LOG_LEVEL=info no configurado en Vercel (P1-07). | Ops | READY | No bloquea staging |
| PRD-07 | **Activar pre-commit hooks** — **H0A-10**: `scripts/precommit-security-check.mjs` existe pero no está hookeado. Sin husky/lint-staged. | Ops | READY | No bloquea staging |
