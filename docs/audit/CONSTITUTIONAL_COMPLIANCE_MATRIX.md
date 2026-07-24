# Constitutional Compliance Matrix — CGP-3 Phase 1

> **Programa:** Constitutional Governance Program — Phase 3  
> **Propósito:** Matriz de cumplimiento constitucional que gobernará toda la campaña CGP-3  
> **Fecha:** 2026-07-21  

---

## 1. Summary

This matrix catalogs all **118 constitutional provisions** and defines for each:

- What behavior demonstrates compliance
- What evidence will be accepted
- Which components are candidates for implementation
- What tests can certify it
- The expected classification (Implementation Required / Configuration / Documental / Not Applicable)

**Phase 2** will use this matrix to audit the codebase. **Phase 3** will execute corrections.

---

## 2. Classification Key

| Classification | Meaning | Verification method |
|----------------|---------|---------------------|
| **IMPLEMENTATION REQUIRED** | The system must exhibit this behavior. Code/tests/runtime evidence needed. | Static analysis, code review, test execution |
| **CONFIGURATION** | The provision depends on configurable parameters or business rules. | Config file audit, environment inspection |
| **DOCUMENTAL** | The provision is a design principle or documentation requirement. | Document review, cross-reference check |
| **NOT APPLICABLE** | Cannot be verified at the product level. Governance/principles only. | Not audited |

---

## 3. Complete Matrix

### 3.1 Principios Constitucionales (PC)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| PC-01 | Primacía constitucional | Principio | Alta | No document claims supremacy over CONST | Header review of all product docs | All documentation | Cross-reference scan | DOCUMENTAL |
| PC-02 | Independencia tecnológica | Principio | Alta | Code does not hardcode providers; abstractions exist | ADRs, interfaces, provider patterns | AI layer, DB facade, channel adapters | ADR compliance check | DOCUMENTAL |
| PC-03 | Estabilidad conceptual | Principio | Alta | No unnecessary churn in core abstractions | Git log, ADR history | Product architecture | — | NOT APPLICABLE |
| PC-04 | Neutralidad temporal | Principio | Media | No version/fix/experiment references in documentation | Document scan | All documentation | grep for temporal keywords | DOCUMENTAL |
| PC-05 | Independencia de implementación | Principio | Alta | Capabilities could be reimplemented without changing behavior | Architecture definition, ADRs | Service layer, core engine | — | NOT APPLICABLE |
| PC-06 | Trazabilidad normativa | Principio | Alta | Every function maps to ≥1 constitutional provision | This matrix, code annotations | All product code | Requirement traceability check | DOCUMENTAL |

### 3.2 Constituciones Cognitivas (CC)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| CC-01 | Primacía de la intención | Cognitivo | **Crítica** | System resolves intent, not literal text; intent drives all subsequent processing | lead.service.ts, policy-pipeline.ts | AI core, router, policy end-to-end flow | Intent classification tests (evals) | IMPLEMENTATION REQUIRED |
| CC-02 | Intención dinámica | Cognitivo | **Crítica** | Intent can evolve across conversation turns; not frozen after first message | core.ts, conversation-setup.ts | AI core, slot workflow | Multi-turn intent evolution tests | IMPLEMENTATION REQUIRED |
| CC-03 | Continuidad conversacional | Cognitivo | **Crítica** | Conversation treated as single logical line; no unnecessary resets | lead.service.ts, memory/context-memory.ts | Lead service, memory, slot workflow | Conversation continuity sims | IMPLEMENTATION REQUIRED |
| CC-04 | Conservación y evolución del conocimiento | Cognitivo | **Crítica** | Confirmed data preserved; new data updates affected elements only; no full context reset | extraction-runner.ts, slot-state.ts, slot-workflow.ts | Extraction, slot state, workflow | Slot merge tests, context preservation sims | IMPLEMENTATION REQUIRED |
| CC-05 | Economía de la interacción | Cognitivo | Alta | System minimizes turns; does not ask for inferable info; accepts reasonable risk | handler.ts, policy templates | AI handler, policy engines | Interaction count metrics | IMPLEMENTATION REQUIRED |
| CC-06 | Prudencia operacional | Cognitivo | **Crítica** | No inference that could compromise operation; confirmation before commitment | policy-pipeline.ts, slot-workflow.ts | Policy, workflow, slot confirmation | Risk threshold tests | IMPLEMENTATION REQUIRED |
| CC-07 | Primacía de la solución | Cognitivo | Alta | System finds viable solution before communicating denial or escalating | router.ts, policy-ahora.ts, policy-reserva.ts | Router, policy templates | Solution-first behavior tests | IMPLEMENTATION REQUIRED |
| CC-08 | Protección de la operación | Cognitivo | **Crítica** | No conversation commits resources without validation | handler.ts, policy-pipeline.ts | Policy pipeline, trip execution | Premature commitment tests | IMPLEMENTATION REQUIRED |
| CC-09 | Dominio persistente | Cognitivo | Alta | All decisions stay within transportation domain; no generic assistant behavior | core.ts, router.ts | AI core, router | Out-of-domain handling tests | IMPLEMENTATION REQUIRED |
| CC-10 | Venta subordinada | Cognitivo | Media | Promotional offers do not interfere with primary need resolution | policy-ahora.ts, learning/opportunity-engine.ts | Policy, learning engine | Upsell timing tests | IMPLEMENTATION REQUIRED |
| CC-11 | Consentimiento para transferencia operativa | Cognitivo | Alta | Third-party involvement requires client acceptance; no personal data shared without consent | trip-execution, admin service | Dispatch, trip execution | Consent flow tests | IMPLEMENTATION REQUIRED |
| CC-12 | El contexto es la fuente de verdad | Cognitivo | **Crítica** | Context (slots, confirmed data) is ground truth; each message is a delta | context-memory.ts, slot-state.ts, extraction-runner.ts | Memory, slot state, extraction | Context-as-source-of-truth tests | IMPLEMENTATION REQUIRED |
| CC-13 | Una sola unidad de información por intervención | Cognitivo | Alta | System asks one datum at a time; no multi-field enumeration | policy templates, slot-workflow.ts | Policy, workflow | Single-question-per-message audit | IMPLEMENTATION REQUIRED |
| CC-14 | La ambigüedad se resuelve, no se ignora | Cognitivo | **Crítica** | Multiple interpretations trigger active resolution; no arbitrary assumption | ambiguity-handler.ts, comprehension.ts | Ambiguity handler, comprehension | Ambiguity resolution tests | IMPLEMENTATION REQUIRED |
| CC-15 | Lenguaje natural, no formularios | Cognitivo | Alta | Natural language variations interpreted as equivalent; no format enforcement | core.ts, extraction-runner.ts | Core, extraction | Free-form input tests | IMPLEMENTATION REQUIRED |
| CC-16 | La conversación es el medio, los datos son el fin | Cognitivo | **Crítica** | Operational data (slots, trips) is canonical truth; conversation text is ephemeral | slot-state.ts, memory/context-memory.ts | Slot state, memory, database | Data-vs-text precedence tests | IMPLEMENTATION REQUIRED |
| CC-17 | El conocimiento prevalece sobre la generación | Cognitivo | Alta | Deterministic rules preferred over generative models for solvable problems | handler.ts, llm-provider.ts, extraction-runner.ts | Handler, LLM provider, extraction | Deterministic-path-preference tests | IMPLEMENTATION REQUIRED |

### 3.3 Requerimientos Funcionales (RF)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| RF-01 | Contexto conversacional persistente | Funcional | **Crítica** | Session context persists across turns; continuity maintained while intent is active | chat_sessions, context-memory.ts, lead.service.ts | Memory, lead service, database | Multi-turn context persistence tests | IMPLEMENTATION REQUIRED |
| RF-02 | Conservación y evolución del contexto | Funcional | **Crítica** | Context updated incrementally; only affected elements changed; confirmed info preserved | extraction-runner.ts merge logic, slot-state.ts | Extraction runner, slot state | Slot merge verification tests | IMPLEMENTATION REQUIRED |
| RF-03 | Gestión del cambio de intención | Funcional | Alta | Intent evolution detected; corrections vs expansions vs contradictions distinguished | core.ts, conversation-setup.ts | Core, conversation setup | Intent change detection tests | IMPLEMENTATION REQUIRED |
| RF-04 | Gestión de la incertidumbre | Funcional | Alta | Uncertainty managed; additional info requested when confidence insufficient | comprehension.ts, ambiguity-handler.ts | Comprehension, ambiguity handler | Uncertainty threshold tests | IMPLEMENTATION REQUIRED |
| RF-05 | Clasificación de intención | Funcional | **Crítica** | Intent classified on every incoming message | core.ts | Core (AI layer) | CoreClassificationTest (evals) | IMPLEMENTATION REQUIRED |
| RF-06 | Extracción de datos operativos | Funcional | **Crítica** | Operational data extracted from natural language | extraction-runner.ts, extract-slots.ts | Extraction pipeline | Extraction accuracy tests | IMPLEMENTATION REQUIRED |
| RF-07 | Cotización de tarifas | Funcional | **Crítica** | Tariffs quoted per applicable business rules | pricing-engine.ts, tariff-resolver.ts | Pricing engine | Tariff resolution tests | IMPLEMENTATION REQUIRED |
| RF-08 | Despacho de servicios | Funcional | **Crítica** | Resources assigned to execute service | dispatch.service.ts, dispatch-workflow.ts | Dispatch engine | Dispatch workflow tests | IMPLEMENTATION REQUIRED |
| RF-09 | Resolución geográfica | Funcional | **Crítica** | Location references resolved to valid operational places | geo-engine.ts, location-resolver.ts | Geo engine | Geo resolution tests | IMPLEMENTATION REQUIRED |
| RF-10 | Optimización de la interacción | Funcional | Alta | Minimal interactions to gather required information | policy templates, slot-workflow.ts | Policy, workflow | Interaction efficiency metrics | IMPLEMENTATION REQUIRED |
| RF-11 | Agrupación inteligente de preguntas | Funcional | Media | Questions with same operational purpose grouped when feasible | policy templates | Policy | Question grouping audit | IMPLEMENTATION REQUIRED |
| RF-12 | Adaptación dinámica de la comunicación | Funcional | Media | Message structure, format, detail adapt to context | response-builder.ts, policy templates | Response builder, policy | Message format variability tests | IMPLEMENTATION REQUIRED |
| RF-13 | Evaluación del impacto operativo | Funcional | Alta | Modifications that affect pricing/logistics/availability are detected | extraction-runner.ts, policy-pipeline.ts | Extraction, policy | Impact detection tests | IMPLEMENTATION REQUIRED |
| RF-14 | Gestión por etapas del servicio | Funcional | **Crítica** | Service lifecycle stages recognized and managed across phases | slot-workflow.ts, dispatch-workflow.ts, trip-execution | Workflows, trip execution | Stage consistency tests | IMPLEMENTATION REQUIRED |
| RF-15 | Gestión del compromiso operativo | Funcional | Alta | Distinguishes info/estimates/proposals/commitments; no false commitments | policy-pipeline.ts, templates | Policy, response builders | Commitment level audit | IMPLEMENTATION REQUIRED |
| RF-16 | Construcción de soluciones | Funcional | Alta | Valid proposals composed from services, rules, resources when no direct solution | policy-ahora.ts, policy-reserva.ts, lead.service.ts | Policy, lead service | Solution composition tests | IMPLEMENTATION REQUIRED |
| RF-17 | Prioridad de coincidencias directas | Funcional | Alta | Direct matches preferred over complex constructions | tariff-resolver.ts, geo-engine.ts | Pricing, geo | Direct-match priority tests | IMPLEMENTATION REQUIRED |
| RF-18 | Aplicación de reglas tarifarias | Funcional | Alta | Tariff rules applied for quotes, waiting times, surcharges | tariff-resolver.ts, pricing-engine.ts | Pricing engine | Tariff rule application tests | IMPLEMENTATION REQUIRED |
| RF-19 | Escalamiento justificado | Funcional | Alta | Escalation only when no sufficiently reliable solution exists | policy-pipeline.ts, slot-workflow.ts | Policy, workflow | Escalation trigger tests | IMPLEMENTATION REQUIRED |
| RF-20 | Preservación de la intención principal | Funcional | Alta | Main intent preserved when only secondary parameters change | core.ts, conversation-setup.ts | Core, conversation setup | Intent preservation tests | IMPLEMENTATION REQUIRED |
| RF-21 | Reconocimiento del dominio | Funcional | Alta | Domain entities, places, aliases, services recognized | geo-engine.ts, extract-slots.ts, core.ts | Geo, extraction, core | Domain entity recognition tests | IMPLEMENTATION REQUIRED |
| RF-22 | Cierre y continuidad del servicio | Funcional | Alta | Conversational cycle completed; service closure formalized | trip-execution, policy-pipeline.ts | Trip execution, policy | Service closure tests | IMPLEMENTATION REQUIRED |
| RF-23 | Coordinación integral de actores | Funcional | Alta | Interaction between clients, operators, drivers and external services coordinated | dispatch.service.ts, lead.service.ts | Dispatch, lead service | Multi-actor coordination tests | IMPLEMENTATION REQUIRED |

### 3.4 Requerimientos No Funcionales Arquitectónicos (RNF-A)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| RNF-A01 | Modularidad y separación | Arquitectónico | **Crítica** | Components have single clear responsibility, high cohesion, low coupling | Module structure, import graph | All layers | Dependency analysis metrics | DOCUMENTAL |
| RNF-A02 | Desacoplamiento tecnológico | Arquitectónico | Alta | Business logic independent of specific tech providers | ADRs, interface definitions, provider pattern | AI providers, DB facade, channel adapter | Provider abstraction tests | DOCUMENTAL |
| RNF-A03 | Extensibilidad y mantenibilidad | Arquitectónico | Alta | New capabilities added without modifying stabilized components | ADRs, interface definitions | Architecture | Extensibility review | DOCUMENTAL |
| RNF-A04 | Escalabilidad | Arquitectónico | Media | Operational capacity can increase maintaining consistency | Architecture documentation, deployment config | Infrastructure | — | NOT APPLICABLE |
| RNF-A05 | Configurabilidad | Arquitectónico | Media | Business rules modifiable without code changes | env.ts, constants.ts, tariff resolver | Config, pricing | Config change test | CONFIGURATION |
| RNF-A06 | Observabilidad | Arquitectónico | Alta | Monitoring, diagnostics, operational state visibility | logger.ts, Sentry integration, audit tables | Logger, Sentry, database events | Observability audit | IMPLEMENTATION REQUIRED |
| RNF-A07 | Trazabilidad y auditabilidad | Arquitectónico | Alta | Operational decisions reconstructable from logged evidence | trip_events, dispatch_events, conversation_events | Database, trip execution, dispatch | Traceability reconstruction tests | IMPLEMENTATION REQUIRED |
| RNF-A08 | Consistencia | Arquitectónico | **Crítica** | State consistency across conversational, operational, business dimensions | Database transactions, slot-state.ts, workflow state machines | Database, workflow, slot state | Cross-state consistency tests | IMPLEMENTATION REQUIRED |
| RNF-A09 | Resiliencia y recuperabilidad | Arquitectónico | Alta | Partial failures preserve continuity; conversations and operations recoverable | llm-provider.ts fallbacks, timeout handlers | LLM provider, extraction fallbacks | Fallback activation tests | IMPLEMENTATION REQUIRED |
| RNF-A10 | Idempotencia | Arquitectónico | Alta | Repeatable operations produce no inconsistent effects | processed_messages UNIQUE, idempotency keys | Webhook route, database | Duplicate execution tests | IMPLEMENTATION REQUIRED |
| RNF-A11 | Interoperabilidad | Arquitectónico | Media | External system integration via clearly defined interfaces | API routes, webhook handler, external service adapters | API layer, service adapters | Integration contract tests | DOCUMENTAL |
| RNF-A12 | Seguridad | Arquitectónico | **Crítica** | Confidentiality, integrity, availability protected | HMAC verification, API key auth, cron secret | Webhook route, auth module | Security compliance tests | IMPLEMENTATION REQUIRED + CONFIGURATION |
| RNF-A13 | Privacidad | Arquitectónico | Alta | Personal data used only for authorized operational purposes | Data flow documentation, consent handling | Message processing, dispatch | Privacy audit | DOCUMENTAL |
| RNF-A14 | Testabilidad | Arquitectónico | Alta | Components designed for automated verification | Test coverage, enforcement scripts | All components | Test coverage analysis | DOCUMENTAL |
| RNF-A15 | Determinismo y núcleo determinista | Arquitectónico | **Crítica** | Core decisions deterministic; same input → same output | core.ts code analysis (regex-based, no LLM, no DB) | Core | Core determinism tests | IMPLEMENTATION REQUIRED |
| RNF-A16 | Eficiencia computacional | Arquitectónico | Media | Resources used rationally; minimal LLM calls when alternatives exist | Handler flow, LLM call frequency | AI handler, extraction | Resource usage metrics | DOCUMENTAL |
| RNF-A17 | Neutralidad de implementación | Arquitectónico | Media | No transient/experimental artifacts in architecture | Codebase scan for migration/experiment artifacts | All code | Artifact scan | DOCUMENTAL |
| RNF-A18 | Identidad de sesión | Arquitectónico | **Crítica** | Session identified via channel link; no anonymous sessions | phone PK in chat_sessions, no anonymous session creation | Database, session management | Identity verification tests | IMPLEMENTATION REQUIRED |
| RNF-A19 | Política antes de respuesta | Arquitectónico | **Crítica** | No response generated without passing through business policy layer | handler.ts → policy-pipeline.ts flow | Handler, policy pipeline | Policy gate verification | IMPLEMENTATION REQUIRED |

### 3.5 Requerimientos No Funcionales Cognitivos (RNF-C)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| RNF-C01 | Naturalidad | Cognitivo | Alta | Fluent, comprehensible, natural language responses | Response templates, LLM output samples | Policy, response builder, LLM | Natural language quality evals | IMPLEMENTATION REQUIRED |
| RNF-C02 | Claridad | Cognitivo | Alta | Precise, unambiguous, easily understandable messages | Response templates | Policy, response builder | Clarity review | IMPLEMENTATION REQUIRED |
| RNF-C03 | Coherencia, continuidad y consistencia | Cognitivo | **Crítica** | Responses consistent with context, confirmed info, intent; same situations → same responses | Conversation transcripts | Full conversation flow | Consistency evals | IMPLEMENTATION REQUIRED |
| RNF-C04 | Relevancia | Cognitivo | Alta | Each response provides useful information for current objective | Response templates | Policy | Irrelevant content scan | IMPLEMENTATION REQUIRED |
| RNF-C05 | Economía cognitiva | Cognitivo | Alta | Minimum mental effort required from client | Interaction patterns | Policy, workflow | Cognitive load assessment | IMPLEMENTATION REQUIRED |
| RNF-C06 | Oportunidad | Cognitivo | Media | Information delivered when useful for client decision | Conversation flow timing | Policy | Timing audit | IMPLEMENTATION REQUIRED |
| RNF-C07 | Adaptabilidad | Cognitivo | Media | Detail, language, structure adapt to context | Response templates, i18n | Policy, i18n | Adaptability tests | IMPLEMENTATION REQUIRED |
| RNF-C08 | Transparencia y confianza | Cognitivo | Alta | Uncertainties, limitations, assumptions communicated clearly | Response templates, ambiguity messages | Policy, ambiguity handler | Transparency audit | IMPLEMENTATION REQUIRED |
| RNF-C09 | Prudencia | Cognitivo | Alta | No categorical assertions when info is insufficient | Response templates, comprehension.ts | Policy, comprehension | Assertion safety audit | IMPLEMENTATION REQUIRED |
| RNF-C10 | Especialización | Cognitivo | Alta | Conversation reflects specialized domain knowledge; no general-purpose behavior | core.ts, router.ts, response templates | Core, router, policy | Domain relevance audit | IMPLEMENTATION REQUIRED |
| RNF-C11 | Discreción operacional | Cognitivo | Media | Internal processes invisible to client; interaction focused on client need | Response design | Policy, response builder | Internal-reference scan | IMPLEMENTATION REQUIRED |
| RNF-C12 | Proactividad | Cognitivo | Baja | Useful info anticipated without losing focus | learning/opportunity-engine.ts, policy templates | Learning, policy | Proactivity audit | IMPLEMENTATION REQUIRED |
| RNF-C13 | Cierre conversacional | Cognitivo | Alta | Every interaction ends in clearly understandable state; next steps communicated | policy templates, trip execution | Policy, trip execution | Closure audit | IMPLEMENTATION REQUIRED |

### 3.6 Reglas de Decisión (RD)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| RD-01 | Evidencia suficiente | Decisión | **Crítica** | Decisions based on best available evidence; action only when evidence sufficient for risk | comprehension.ts, policy-pipeline.ts | Comprehension, policy | Evidence-sufficiency tests | IMPLEMENTATION REQUIRED |
| RD-02 | Consulta antes que suposición | Decisión | Alta | Insufficient evidence → ask before assume | ambiguity-handler.ts, slot-workflow.ts | Ambiguity handler, workflow | Ask-vs-assume audit | IMPLEMENTATION REQUIRED |
| RD-03 | Confirmación proporcional | Decisión | Alta | Confirmation necessity proportional to operational risk | slot-workflow.ts, policy-pipeline.ts | Workflow, policy | Risk-proportional confirmation tests | IMPLEMENTATION REQUIRED |
| RD-04 | Consistencia de decisión | Decisión | Alta | Equivalent conditions produce equivalent decisions | core.ts, router.ts | Core, router | Decision consistency evals | IMPLEMENTATION REQUIRED |
| RD-05 | Protección de la operación | Decisión | **Crítica** | No decision compromises existing operation or creates avoidable risk | policy-pipeline.ts, dispatch.service.ts | Policy, dispatch | Operation protection tests | IMPLEMENTATION REQUIRED |
| RD-06 | Determinismo preferente | Decisión | Alta | Deterministic rules preferred over probabilistic when applicable | handler.ts, extraction-runner.ts | Handler, extraction | Deterministic path tests | IMPLEMENTATION REQUIRED |
| RD-07 | Escalamiento justificado | Decisión | Alta | Escalation only when no sufficiently reliable solution possible | policy-pipeline.ts, slot-workflow.ts | Policy, workflow | Escalation trigger tests | IMPLEMENTATION REQUIRED |
| RD-08 | Coherencia operacional | Decisión | Alta | Decisions consistent with current operational state and prior commitments | trip-execution, dispatch-workflow.ts | Trip execution, dispatch | Operational coherence tests | IMPLEMENTATION REQUIRED |

### 3.7 Heurísticas Cognitivas (H)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| H-01 | Preferir inferencia sobre consulta | Heurística | Media | Inference preferred when evidence supports reasonable conclusion | comprehension.ts, slot-workflow.ts | Comprehension, workflow | Inference-preference audit | DOCUMENTAL |
| H-02 | Preferir solución sobre derivación | Heurística | Media | Build solution before escalating | policy-ahora.ts, policy-reserva.ts | Policy | Solution-first audit | DOCUMENTAL |
| H-03 | Preferir coincidencia directa | Heurística | Media | Direct matches preferred over complex constructions | tariff-resolver.ts, geo-engine.ts | Pricing, geo | Direct-match preference audit | DOCUMENTAL |
| H-04 | Minimizar la intervención | Heurística | Media | Fewest interventions among equally valid alternatives | policy templates | Policy | Intervention-count audit | DOCUMENTAL |
| H-05 | Agrupar consultas con propósito compartido | Heurística | Baja | Same-purpose questions grouped when feasible | policy templates | Policy | Question-grouping audit | DOCUMENTAL |
| H-06 | Anticipar información útil | Heurística | Baja | Useful info anticipated without losing focus | learning/opportunity-engine.ts | Learning | Anticipation audit | DOCUMENTAL |
| H-07 | Adaptar complejidad al contexto | Heurística | Media | Detail, language, structure adapt to context | response-builder.ts, i18n | Response builder, i18n | Adaptability audit | DOCUMENTAL |
| H-08 | Preferir cierre autónomo | Heurística | Baja | Complete cycle autonomously when it preserves traceability | trip-execution, policy-pipeline.ts | Trip execution, policy | Closure-completion audit | DOCUMENTAL |

### 3.8 Invariantes (INV)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| INV-01 | Unicidad del estado conversacional | Invariante | **Crítica** | Exactly one coherent conversational state at any moment | state-accessors.ts, slot-workflow.ts | State accessors, workflow | Single-state verification tests | IMPLEMENTATION REQUIRED |
| INV-02 | Integridad del contexto | Invariante | **Crítica** | Decisions based on consistent context; insufficient/contradictory context triggers reconstruction/ask/escalation | comprehension.ts, ambiguity-handler.ts | Comprehension, ambiguity handler | Context-integrity tests | IMPLEMENTATION REQUIRED |
| INV-03 | Coherencia del conocimiento y la operación | Invariante | **Crítica** | No incompatible values for same confirmed info within same context | slot-state.ts, database constraints | Slot state, database | Knowledge-coherence tests | IMPLEMENTATION REQUIRED |
| INV-04 | Conservación del conocimiento válido | Invariante | **Crítica** | Confirmed info preserved while applicable | extraction-runner.ts merge, context-memory.ts | Extraction runner, memory | Knowledge-retention tests | IMPLEMENTATION REQUIRED |
| INV-05 | Correspondencia intención–operación | Invariante | **Crítica** | Executed actions correspond to current client intent | handler.ts, lead.service.ts, policy-pipeline.ts | Handler, lead service, policy | Intent-action correspondence tests | IMPLEMENTATION REQUIRED |
| INV-06 | Integridad y unicidad de la operación | Invariante | **Crítica** | Single identifiable operation; no mixed data from different operations | trip execution, database schema | Trip execution, database | Operation-integrity tests | IMPLEMENTATION REQUIRED |
| INV-07 | Trazabilidad permanente | Invariante | Alta | Every operational decision preserves sufficient evidence | trip_events, dispatch_events, conversation_events | Database events | Traceability tests | IMPLEMENTATION REQUIRED |
| INV-08 | Responsabilidad única | Invariante | Media | Single responsible party per stage | dispatch-workflow.ts, trip-execution | Dispatch, trip execution | Responsibility audit | IMPLEMENTATION REQUIRED |
| INV-09 | Clasificación del conocimiento confirmado | Invariante | Alta | Info classified by validation state: confirmed/inferred/pending; each datum maintains state and origin | slot-state.ts, extraction-runner.ts | Slot state, extraction runner | Knowledge-state tests | IMPLEMENTATION REQUIRED |
| INV-10 | Una sola clasificación por mensaje | Invariante | Alta | Single classification per message; no multiple classifications in pipeline | core.ts, handler.ts | Core, handler | Classification-uniqueness tests | IMPLEMENTATION REQUIRED |
| INV-11 | Confirmación antes de ejecutar | Invariante | **Crítica** | No action committing operational resources without explicit client confirmation | policy-pipeline.ts, slot-workflow.ts | Policy, workflow | Pre-execution confirmation tests | IMPLEMENTATION REQUIRED |
| INV-12 | Resolución activa de la ambigüedad | Invariante | **Crítica** | Multiple valid results → active resolution; no arbitrary first-choice | ambiguity-handler.ts, ambiguity-interpreter.ts | Ambiguity handler | Ambiguity-resolution tests | IMPLEMENTATION REQUIRED |
| INV-13 | Todo mensaje requiere respuesta | Invariante | **Crítica** | Every received message produces visible response; fallback on error | handler.ts, lead.service.ts | Handler, lead service | Universal-response tests | IMPLEMENTATION REQUIRED |
| INV-14 | Integridad de las referencias | Invariante | Alta | No references to non-existent places/entities/resources | geo-engine.ts, location-resolver.ts, database | Geo engine, database | Reference-integrity tests | IMPLEMENTATION REQUIRED |
| INV-15 | El estado del slot determina la acción | Invariante | **Crítica** | Only confirmed-state data used for operational actions; inferred data for info queries | slot-state.ts, policy-pipeline.ts | Slot state, policy | Slot-state-action tests | IMPLEMENTATION REQUIRED |
| INV-16 | La ambigüedad no destruye el contexto | Invariante | **Crítica** | Ambiguity resolution does not modify or discard existing confirmed context | ambiguity-handler.ts | Ambiguity handler | Context-preservation-during-ambiguity tests | IMPLEMENTATION REQUIRED |
| INV-17 | Progresión del estado conversacional | Invariante | Alta | Transitions are progressive; no regression without explicit justification | slot-workflow.ts | Workflow | State-progression tests | IMPLEMENTATION REQUIRED |
| INV-18 | El campo esperado determina la interpretación | Invariante | Alta | When system asked for specific field, response interpreted primarily as answer to that field | slot-workflow.ts, ambiguity-handler.ts | Workflow, ambiguity handler | Field-specific interpretation tests | IMPLEMENTATION REQUIRED |
| INV-19 | Autoridad única para decidir qué preguntar | Invariante | Alta | Single decision point for what to ask next; no competing components | policy-pipeline.ts, slot-workflow.ts | Policy, workflow | Question-authority tests | IMPLEMENTATION REQUIRED |
| INV-20 | Resolución de conflictos entre fuentes | Invariante | **Crítica** | More specific > generic; more recent if not confirmed; confirmed always wins | slot-state.ts, extraction-runner.ts | Slot state, extraction | Source-conflict-resolution tests | IMPLEMENTATION REQUIRED |

### 3.9 Contratos (CON)

| ID | Description | Type | Criticidad | Compliance behavior | Evidence accepted | Candidate components | Certification tests | Classification |
|----|-------------|------|------------|-------------------|-------------------|---------------------|-------------------|----------------|
| CON-01 | Decisión Conversacional | Contrato | **Crítica** | Every message processed via decision algorithm: interpret → preserve → update → decide → respond | lead.service.ts full flow | Lead service, AI handler, policy, memory | End-to-end conversation flow test | IMPLEMENTATION REQUIRED |
| CON-02 | Gestión del Conocimiento | Contrato | Alta | Knowledge preserved retrievable; evolution traceable (old value, new value, justification) | context-memory.ts, slot-state.ts | Memory, slot state | Knowledge-evolution traceability tests | IMPLEMENTATION REQUIRED |
| CON-03 | Continuidad del Servicio | Contrato | Alta | Service continuity guaranteed from initiation to formal closure | trip-execution, dispatch-workflow.ts | Trip execution, dispatch | Service continuity tests | IMPLEMENTATION REQUIRED |
| CON-04 | Experiencia del Cliente | Contrato | Alta | All interactions respect RNF-C; experience consistent regardless of internal mechanisms | Response output across all paths | Policy, response builder | Cross-channel experience consistency tests | IMPLEMENTATION REQUIRED |

---

## 4. Coverage Summary

| Type | Total | IMPLEMENTATION REQUIRED | CONFIGURATION | DOCUMENTAL | NOT APPLICABLE |
|------|-------|-------------------------|---------------|------------|----------------|
| PC | 6 | 0 | 0 | 4 | 2 |
| CC | 17 | 17 | 0 | 0 | 0 |
| RF | 23 | 23 | 0 | 0 | 0 |
| RNF-A | 19 | 11 | 1 | 6 | 1 |
| RNF-C | 13 | 13 | 0 | 0 | 0 |
| RD | 8 | 8 | 0 | 0 | 0 |
| H | 8 | 0 | 0 | 8 | 0 |
| INV | 20 | 20 | 0 | 0 | 0 |
| CON | 4 | 4 | 0 | 0 | 0 |
| **Total** | **118** | **96** | **1** | **18** | **3** |

- **96 provisions** require code-level verification (81%)
- **1 provision** requires configuration audit (RNF-A05)
- **18 provisions** require document-level verification (15%) — mostly PCs, RNF-As, and Hs
- **3 provisions** are not applicable at product level (PC-03, PC-05, RNF-A04)

---

## 5. Candidate Components for Audit

| Component | Provisions covered | Priority |
|-----------|-------------------|----------|
| `src/lib/ai/core.ts` | CC-01, CC-02, CC-09, CC-15, RF-03, RF-05, RF-20, INV-10, RNF-A15 | **P0** |
| `src/lib/ai/handler.ts` | CC-01, CC-05, CC-08, CC-17, INV-05, INV-13, RNF-A16, RNF-A19, CON-01 | **P0** |
| `src/lib/ai/router.ts` | CC-01, CC-07, CC-09, RD-04, RD-06 | **P0** |
| `src/lib/services/workflow/policy-pipeline.ts` | CC-01, CC-06, CC-07, CC-08, RF-15, RF-19, RD-01, RD-03, RD-05, RD-07, INV-11, INV-19, RNF-A19 | **P0** |
| `src/lib/services/extraction/extraction-runner.ts` | CC-04, CC-12, CC-15, RF-02, RF-06, RF-13, INV-04, INV-09, INV-20, RD-06 | **P0** |
| `src/lib/services/extraction/comprehension.ts` | CC-14, RF-04, RD-01 | **P0** |
| `src/lib/services/workflow/slot-workflow.ts` | CC-04, CC-06, INV-01, INV-11, INV-17, INV-18, INV-19 | **P0** |
| `src/lib/services/workflow/ambiguity-handler.ts` | CC-14, INV-12, INV-16, INV-18 | **P0** |
| `src/lib/ai/slot-state.ts` | CC-04, CC-12, CC-16, INV-03, INV-09, INV-15, INV-20, CON-02 | **P0** |
| `src/lib/services/memory/context-memory.ts` | CC-03, CC-12, CC-16, RF-01, INV-04, CON-02 | **P0** |
| `src/lib/services/pricing/tariff-resolver.ts` | RF-07, RF-17, RF-18 | **P1** |
| `src/lib/services/geo/geo-engine.ts` | RF-09, RF-21, INV-14 | **P1** |
| `src/lib/services/dispatch/dispatch.service.ts` | RF-08, RF-23, INV-08 | **P1** |
| `src/lib/services/trip-execution/` | RF-14, RF-22, INV-06, INV-08, CON-03 | **P1** |
| `src/lib/ai/llm-provider.ts` | CC-17, RNF-A09 | **P1** |
| Database layer | INV-06, INV-07, RNF-A07, RNF-A10 | **P1** |
| Response templates & builders | RF-10, RF-11, RF-12, RNF-C01..C13 | **P2** |

---

## 6. Audit Strategy for Phase 2

### Order
1. **P0 components** (core, handler, router, policy-pipeline, extraction-runner, slot-workflow, ambiguity-handler, slot-state, context-memory) — 90% of critical provisions
2. **P1 components** (pricing, geo, dispatch, trip execution, LLM, database) — functional coverage
3. **P2 components** (response templates, builders) — cognitive NF coverage
4. **Documental audit** — PC, RNF-A, H provisions
5. **Configuration audit** — RNF-A05 configuration check

### Method
- **Source code scan** — static analysis of code against provision requirements
- **Test coverage analysis** — verify existing tests cover each provision
- **Conversation simulation** — end-to-end flow validation for CCs and INVs
- **Documentation cross-reference** — verify document hierarchy and claims

### Deliverable for Phase 2
A `CONSTITUTIONAL_AUDIT_REPORT.md` with per-provision compliance verdict:
- **PASS** — provision is demonstrably fulfilled
- **FAIL** — provision is violated or missing
- **INCONCLUSIVE** — evidence insufficient to determine
- **NOT AUDITED** — excluded by scope

---

> **This matrix governs all of CGP-3. Phase 2 will audit 118 provisions against the codebase. Phase 3 will execute corrections for all FAIL/INCONCLUSIVE provisions.**
