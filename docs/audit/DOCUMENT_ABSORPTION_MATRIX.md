# Document Absorption Matrix — AITOS

> CGP-1: Constitutional Governance Program — Phase 2 / Phase 4A correction
> Propósito: Determinar para cada conocimiento relevante su destino: ABSORB, PRESERVE, REFERENCE, DEPRECATE o DISCARD.
> **Corrección Phase 4A:** Tras el Architectural Gate Review, 10 elementos clasificados como ABSORB fueron reclasificados como SPECIFICATION (9) o ARCHITECTURE (1). Ver §7 notas.

---

## 1. Executive Summary

Se analizaron 7 categorías documentales para determinar qué conocimiento debe sobrevivir si los documentos fuente pierden autoridad.

**Elementos clasificados: 124**

| Acción | Cantidad | % |
|--------|----------|---|
| **ABSORB** — Debe incorporarse a la Constitución o documento superior | 38 | 31% |
| **PRESERVE** — Tiene valor propio, mantener como está | 19 | 15% |
| **REFERENCE** — Debe existir como documento subordinado | 31 | 25% |
| **DEPRECATE** — No aporta valor actual | 29 | 23% |
| **DISCARD** — Duplicado, obsoleto o sin utilidad | 7 | 6% |

**Documento con más material absorbible:** FBS (15 elementos para ABSORB)
**Documento con más material descartable:** SYSTEM_BIBLE (4 DISCARD, 1 DEPRECATE)
**Documento que requiere más trabajo post-absorción:** CDA (debe convertirse en REFERENCE puro)

---

## 2. SYSTEM_BIBLE Analysis

### 2.1 Elementos

| # | Elemento | Tipo | Acción | Destino | Justificación |
|---|----------|------|--------|---------|---------------|
| SB-01 | §1 Propósito: "AITOS converts human messages into transportation operations" | Principio | REFERENCE | docs/architecture/ | Útil para onboarding pero duplica texto narrativo de CONST §1.1. Mantener como introducción no normativa. |
| SB-02 | §2 What AITOS is: "operating system for transportation logistics" | Identidad | DISCARD | — | Ya cubierto por CONST §1.6 "sistema inteligente especializado en la gestión integral de servicios de transporte". |
| SB-03 | §3 What AITOS is not: "not a chatbot, not a WhatsApp bot, not a booking engine, not a CRM, not a black-box AI" | Identidad | **ABSORB** | CONST §1.5 | CONST §1.5 dice solo "No es un asistente conversacional de propósito general". Las 5 exclusiones específicas deben incorporarse. |
| SB-04 | §4 The core promise: EXECUTE/ANSWER/CLARIFY | Principio | DISCARD | — | Ya está en CONST §1.3 como Promesa fundamental. |
| SB-05 | §5 Operational model: slots (origin, destination, passengers, scheduled_at, price, vehicle) | Modelo de datos | **ABSORB** | CONST CC o RF | El modelo de 6 slots no está explícito en CONST. CC-07 habla de "slots operativos" sin listarlos. Los slots son el modelo conceptual fundamental del producto. |
| SB-06 | §6 Authority and trust: "Code > Bible > AI > Human operator" | Jerarquía | DEPRECATE | — | Contradice directamente CONST §1.3 ("Constitución > Implementación"). La jerarquía correcta está en CONST. |
| SB-07 | §7 How the system decides: 7-step sequence (classify, extract, resolve, price, decide, render, execute) | Pipeline | **ABSORB** | CONST §4 (Arquitectura) | CONST no tiene el pipeline conversacional explícito. Este es el flujo fundamental del producto (diferente al CDA pipeline que es más detallado). |
| SB-08 | §8 Graceful degradation: provider failover, deterministic fallback, location/tariff/driver escalation | Comportamiento | **ABSORB** | CONST CC o CON | CONST no tiene principios de degradación graceful. Es conocimiento crítico para la resiliencia del producto. |
| SB-09 | §9 Scope boundaries: in scope / out of scope | Alcance | DISCARD | — | Ya cubierto por CONST §1.5 con la misma información. |
| SB-10 | §10 Evolution principles: 5 principles | Principios | REFERENCE | PRESERVE como histórico | 4 de 5 principios están cubiertos por PC. El principio "Preserve the operational model — slots must remain canonical truth" es parcialmente único pero debe ser absorbido en CONST si no está. |

### 2.2 Resumen SYSTEM_BIBLE

| Acción | Cantidad |
|--------|----------|
| ABSORB | 3 |
| PRESERVE | 0 |
| REFERENCE | 2 |
| DEPRECATE | 1 |
| DISCARD | 4 |

---

## 3. FBS Analysis

### 3.1 Objetivos del sistema (FBS §1)

| # | Elemento | Tipo | Acción | Destino | Justificación |
|---|----------|------|--------|---------|---------------|
| FBS-01 | 7 objetivos primarios: clasificar, extraer, resolver, cotizar, ejecutar, reservar, escalar | Objetivos | **ABSORB** | CONST §1.2 | CONST §1.2 tiene redacción diferente. Los 7 objetivos originales son más precisos y accionables. Deben reemplazar o complementar los actuales. |
| FBS-02 | Promesa fundamental EXECUTE/ANSWER/CLARIFY | Principio | DISCARD | — | Ya está en CONST §1.3. |

### 3.2 Requerimientos Funcionales (FBS §3 — 10 RFs) vs CONST §3 (19 RFs)

| # | Elemento | En CONST | Acción | Justificación |
|---|----------|----------|--------|---------------|
| FBS-RF01 | Recepción de mensajes: webhook, HMAC, rate limiting, dedup | ❌ No | REFERENCE | Especificación de implementación detallada, no constitucional. Debe preservarse como referencia técnica. |
| FBS-RF02 | Clasificación de intención: 12 intents, determinista | ❌ No | **ABSORB** | Es una capacidad fundamental del producto que CONST omite. Debe incorporarse como RF o CC. |
| FBS-RF03 | Extracción de slots: 6 slots (origin, destination, passengers, scheduled_at, flight, price) | Parcial (RF-01) | **ABSORB** | CONST RF-01 dice "contexto persistente" pero no define los slots. El modelo de 6 slots es el corazón del producto. |
| FBS-RF04 | Resolución geográfica: alias, canónicos, fuzzy, DB local | ❌ No | REFERENCE | Especificación técnica detallada. Útil como referencia pero no constitucional. |
| FBS-RF05 | Cotización de tarifas: jerarquía Lugar→Lugar, Zona, precio 0 | ❌ No | **ABSORB** | Es una regla de negocio fundamental. CONST no tiene nada equivalente. |
| FBS-RF06 | Despacho a conductores: 5 niveles de escalamiento con timeouts | ❌ No | **ABSORB** | Regla de negocio fundamental. CONST no cubre despacho. |
| FBS-RF07 | Confirmación de usuario: resumen, botones, espera, solo entonces crear | Parcial (RF-11) | **ABSORB** | CONST RF-11 ("Gestión del compromiso operativo") es más abstracto. La regla de confirmación explícita debe estar en CONST. |
| FBS-RF08 | Gestión de ambigüedad geográfica: IA contextual, preguntar, resolver por contexto | ❌ No | **ABSORB** | Capacidad fundamental. CONST no la cubre. |
| FBS-RF09 | Actualización incremental de slots | Sí (RF-02) | DISCARD | Reemplazado por CONST RF-02. |
| FBS-RF10 | Post-venta: encuesta 24h post-viaje | ❌ No | REFERENCE | Funcionalidad específica, no constitucional. |

### 3.3 Requerimientos No Funcionales (FBS §4 — 9 RNFs) vs CONST §4 (RNF-A + RNF-C)

| # | Elemento | En CONST | Acción | Justificación |
|---|----------|----------|--------|---------------|
| FBS-RNF01 | Determinismo del núcleo: CORE como función pura | ❌ No | **ABSORB** | Principio arquitectónico fundamental. CONST no lo tiene. Debe ir a RNF-A. |
| FBS-RNF02 | LLM opcional: sistema funciona sin LLM | ❌ No | **ABSORB** | Principio de resiliencia. Debe ir a CONST. |
| FBS-RNF03 | Triple fallback: determinista → heurístico → LLM → null seguro | ❌ No | **ABSORB** | Regla de degradación. Debe ir a CONST. |
| FBS-RNF04 | Phone como identidad de conversación | ❌ No | **ABSORB** | Regla de identidad de sesión. Debe ir a CONST. |
| FBS-RNF05 | Sin escritura directa desde AI | Sí (RNF-A02 desacoplamiento) | DISCARD | Es un principio de arquitectura de software, cubierto por RNF-A02. |
| FBS-RNF06 | Idempotencia: mensajes duplicados no producen acciones duplicadas | ❌ No | **ABSORB** | Invariante operacional. CONST no la tiene. |
| FBS-RNF07 | Tiempo de respuesta <10s | ❌ No | REFERENCE | Especificación técnica de performance. Demasiado específica para CONST. |
| FBS-RNF08 | Política antes de Output: Policy decide, Output renderiza | ❌ No | **ABSORB** | Principio arquitectónico. CONST no lo tiene. |
| FBS-RNF09 | Schema Parity: initSchema refleja producción | ❌ No | DISCARD | Principio de ingeniería, no de producto. Debe migrar a backlog engineering. |

### 3.4 Principios Conversacionales P1-P10 (FBS §5) vs CONST CC-01..11

| # | Elemento | En CONST | Acción | Justificación |
|---|----------|----------|--------|---------------|
| FBS-P01 | Un solo dato por vez: preguntar UN campo a la vez | ❌ No | **ABSORB** | Principio conversacional fundamental. CONST CC-05 (Economía) es más genérico. Debe estar en CC. |
| FBS-P02 | Preservar el contexto a toda costa | Sí (CC-04) | DISCARD | CC-04 cubre el mismo concepto con redacción diferente. |
| FBS-P03 | No repetir preguntas | ❌ No | **ABSORB** | Invariante conversacional. Debe estar en CC o INV. |
| FBS-P04 | Confirmar antes de ejecutar | Parcial (RD-03) | **ABSORB** | RD-03 es más débil ("proporcional al riesgo"). Este principio es absoluto. Debe subir a CC. |
| FBS-P05 | La ambigüedad se resuelve, no se ignora | ❌ No | **ABSORB** | Principio fundamental. Debe estar en CC. |
| FBS-P06 | Lenguaje natural, no formularios | Parcial (RNF-C01) | **ABSORB** | RNF-C01 (Naturalidad) es más genérico. Este principio es más específico. Debe estar en CC. |
| FBS-P07 | La conversación no es el negocio (slots > historial) | ❌ No | **ABSORB** | Principio arquitectónico fundamental. Debe estar en CC. |
| FBS-P08 | Una sola clasificación por mensaje | ❌ No | **ABSORB** | Invariante operacional. Debe estar en INV o CC. |
| FBS-P09 | La intención evoluciona, no se reemplaza | Sí (CC-02) | DISCARD | CC-02 cubre el mismo concepto. |
| FBS-P10 | El slot_state es la fuente de verdad (RAW→CONFIRMED) | Parcial (RF-05, INV-04) | **ABSORB** | CONST RF-05 menciona clasificación pero no la jerarquía RAW→INFERRED→CONFIRMED. Debe estar en CC o INV. |

### 3.5 Invariantes Conversacionales I-C1 a I-C12 (FBS §20) vs CONST INV-01..08

| # | Elemento | En CONST | Acción | Justificación |
|---|----------|----------|--------|---------------|
| FBS-IC1 | No perder contexto | Sí (INV-04, CC-04) | DISCARD | Ya cubierto. |
| FBS-IC2 | No doble clasificación | ❌ No | **ABSORB** | Invariante omitida. Crítica. Debe estar en CC o INV. |
| FBS-IC3 | No preguntar lo ya sabido | Parcial (RF-02) | **ABSORB** | RF-02 cubre el comportamiento pero no como invariante. Debe subir a INV. |
| FBS-IC4 | No responder sin clasificar | ❌ No | **ABSORB** | Invariante omitida. Crítica. Toda respuesta requiere clasificación previa. |
| FBS-IC5 | No ejecutar sin confirmar | ❌ No como invariante | **ABSORB** | RD-03 cubre como regla de decisión. Debe subir a INV o CC. |
| FBS-IC6 | No asumir el primer lugar ambiguo | ❌ No | **ABSORB** | Invariante omitida. Crítica para calidad del servicio. |
| FBS-IC7 | No silenciar mensajes | ❌ No | **ABSORB** | Invariante omitida. Crítica para CX. |
| FBS-IC8 | No inventar lugares | ❌ No | **ABSORB** | Invariante omitida. Crítica para integridad. |
| FBS-IC9 | La intención evoluciona, no se congela | Sí (CC-02) | DISCARD | Ya cubierto. |
| FBS-IC10 | Un solo estado conversacional | Sí (INV-01) | DISCARD | Ya cubierto. |
| FBS-IC11 | Los slots tienen dueño (source + status) | Parcial (RF-05) | **ABSORB** | RF-05 menciona clasificación pero no la trazabilidad source+status por slot. |
| FBS-IC12 | El slot_state determina la acción (solo CONFIRMED→dispatch) | ❌ No | **ABSORB** | Invariante omitida. Crítica para seguridad operacional. |

### 3.6 Resumen FBS

| Acción | Cantidad |
|--------|----------|
| ABSORB | 26 (incluye: 1 obj, 6 RF, 5 RNF, 7 P, 7 I-C) |
| PRESERVE | 0 |
| REFERENCE | 3 (RF01, RF04, RF10, RNF07) |
| DEPRECATE | 0 |
| DISCARD | 7 (FBS-02, RF09, RNF05, RNF09, P02, P09, IC01, IC09, IC10) |

---

## 4. CDA Analysis

### 4.1 Elementos

| # | Elemento | Naturaleza | Acción | Justificación |
|---|----------|-----------|--------|---------------|
| CDA-01 | §1 Objetivo: "El contexto es la fuente de verdad. El mensaje es un delta." | Principio rector | **ABSORB** | Principio constitucional. Debe estar en CONST. Actualmente solo está referenciado indirectamente en CON-01. |
| CDA-02 | §1 Lo que el algoritmo NO hace (5 prohibiciones) | Reglas | **ABSORB** | Son invariantes operacionales. Algunas ya en CONST, otras no. Deben estar en INV. |
| CDA-03 | §2 Pipeline 11 pasos (recibir→cargar sesión→cargar contexto→preservar intención→determinar clarify→interpretar→actualizar→validar→ambiguity→escalar→responder) | Algoritmo | REFERENCE | Demasiado detallado para CONST. Debe mantenerse como especificación de implementación. |
| CDA-04 | §3 Jerarquía de decisión 7 niveles (confirmado > intención > clarify > extracción > ambiguity > LLM > fallback) | Reglas | **ABSORB** | Es el modelo de decisión fundamental. CONST no lo tiene explícito. Debe estar en CONST CC o CON. |
| CDA-05 | §3 Regla de resolución de conflictos (3 reglas: específico > genérico, reciente > no confirmado, confirmed > no confirmed) | Reglas | **ABSORB** | Reglas de merge críticas. CONST no las tiene. Deben estar en CONST. |
| CDA-06 | §4 I-01 a I-15 (ver detalle abajo) | Invariantes | Mixto | Ver tabla detallada. |
| CDA-07 | §5 Algoritmo de actualización de contexto (fórmula, reglas de merge, pseudocódigo) | Algoritmo | REFERENCE | Implementación detallada. Mantener como referencia. |
| CDA-08 | §6 Cuándo se activa Ambiguity (condiciones) | Regla | REFERENCE | Detalle de implementación. |
| CDA-09 | §7 Cuándo preservar intención | Regla | REFERENCE | Detalle de implementación. |
| CDA-10 | §8 UPDATE vs RESET | Regla | REFERENCE | Detalle de implementación. |
| CDA-11 | §9 Árbol de decisión completo | Algoritmo | REFERENCE | Detalle exhaustivo. Mantener como referencia. |
| CDA-12 | §10 Trazabilidad (matriz contra specification) | Trazabilidad | PRESERVE | Valor histórico para auditorías. |
| CDA-13 | §11 Verificación contra bugs conocidos | Evidencia | PRESERVE | Valor histórico para entender correcciones pasadas. |

### 4.2 Invariantes CDA I-01 a I-15 vs CONST

| # | Elemento | En CONST | Acción | Justificación |
|---|----------|----------|--------|---------------|
| CDA-I01 | NUNCA perder slot confirmado | Sí (INV-04, CC-04) | DISCARD | Cubierto. |
| CDA-I02 | NUNCA preguntar dato confirmado | Parcial (RF-02) | **ABSORB** | Debe subir a INV. |
| CDA-I03 | MERGE incremental, nunca reemplazo total | Sí (CC-04) | DISCARD | Cubierto. |
| CDA-I04 | Intención solo cambia con evidencia suficiente | Sí (CC-02) | DISCARD | Cubierto. |
| CDA-I05 | Ambiguity NUNCA destruye contexto | ❌ No | **ABSORB** | Invariante crítica omitida. |
| CDA-I06 | UPDATE, no RESET | Sí (CC-04) | DISCARD | Cubierto. |
| CDA-I07 | No retroceder estado conversacional | ❌ No | **ABSORB** | Invariante omitida. |
| CDA-I08 | No abandonar dominio TaxiGuazú | Sí (CC-09) | DISCARD | Cubierto. |
| CDA-I09 | Preguntar solo información necesaria | Sí (CC-05) | DISCARD | Cubierto. |
| CDA-I10 | Minimizar turnos | Sí (CC-05) | DISCARD | Cubierto. |
| CDA-I11 | clarify_field determina interpretación | ❌ No | **ABSORB** | Invariante crítica omitida. |
| CDA-I12 | Una sola clasificación por mensaje | ❌ No | **ABSORB** | Invariante omitida. |
| CDA-I13 | Fuente del slot se preserva | Parcial (RF-05) | **ABSORB** | Debe subir a INV. |
| CDA-I14 | No múltiples autoridades para decidir qué preguntar | ❌ No | **ABSORB** | Invariante omitida. |
| CDA-I15 | Respuesta respeta estado conversacional | Sí (INV-02) | DISCARD | Cubierto parcialmente. |

### 4.3 Resumen CDA

| Acción | Cantidad |
|--------|----------|
| ABSORB | 11 (CDA-01, CDA-02, CDA-04, CDA-05, CDA-I02, CDA-I05, CDA-I07, CDA-I11, CDA-I12, CDA-I13, CDA-I14) |
| PRESERVE | 2 (CDA-12, CDA-13) |
| REFERENCE | 6 (CDA-03, CDA-07, CDA-08, CDA-09, CDA-10, CDA-11) |
| DEPRECATE | 0 |
| DISCARD | 6 (CDA-I01, CDA-I03, CDA-I04, CDA-I06, CDA-I08, CDA-I09, CDA-I10, CDA-I15) |

---

## 5. ADR Analysis

### 5.1 ADR-012 — Cognitive Escalation Principle

| # | Elemento | Acción | Justificación |
|---|----------|--------|---------------|
| ADR12-01 | Principio: conocimiento explícito > reglas determinísticas > modelos generativos | **ABSORB** | Es el modelo de inteligencia del producto. CONST no lo tiene. Debe estar en CONST. |
| ADR12-02 | Stack: BKE → DRL → Groq → Gemini → Fallback | REFERENCE | Arquitectura detallada. El principio (conocimiento > generación) es lo constitucional; el stack específico es implementación. |
| ADR12-03 | Los 3 consumidores LLM (extractSlots, generateLLMResponse, interpretAmbiguity) | REFERENCE | Detalle de implementación. |
| ADR12-04 | Evidencia de CE-1 (7 puntos de consumo LLM, costos) | PRESERVE | Evidencia histórica de por qué se tomó la decisión. |
| ADR12-05 | Presupuesto cognitivo como métrica arquitectónica | PRESERVE | Concepto útil para evolución futura. |

### 5.2 ADR-013 — CDA Ratification

| # | Elemento | Acción | Justificación |
|---|----------|--------|---------------|
| ADR13-01 | Decisión: CDA ratificado como autoridad funcional normativa | DEPRECATE | La jerarquía "CDA > Specification > ADR" debe reemplazarse por "Constitución > CDA > FBS > ADR". La decisión de ratificar el CDA en sí es histórica, pero su jerarquía ya no es válida. |
| ADR13-02 | Jerarquía: Implementation → CDA → Specification → ADR | DEPRECATE | Contradice la Constitución. Esta jerarquía debe ser reemplazada. |
| ADR13-03 | Evidencia de QA1, QA2, QA2B, QA3-S2B (hallazgos, desviaciones) | PRESERVE | Valor histórico: demuestra por qué se necesitaba el CDA. |
| ADR13-04 | 15 invariantes I-01 a I-15 definidas | ABSORB (vía CDA) | Ver sección 4.2. |
| ADR13-05 | 0 cambios de código requeridos | PRESERVE | Dato histórico importante. |

### 5.3 ADR-014 — Experimental Layers Hygiene

| # | Elemento | Acción | Justificación |
|---|----------|--------|---------------|
| ADR14-01 | Decisión: remove Pattern Discovery, BKE, DRL from src/ | PRESERVE | Explica por qué cierto código ya no existe. Vital para futuros desarrolladores. |
| ADR14-02 | Decisión: keep Evidence Engine as shadow mode | REFERENCE | El EE sigue existiendo. Decisión arquitectónica vigente. |
| ADR14-03 | Decisión: protect hard-reset with DEV_MODE_ENABLED flag | REFERENCE | Medida de seguridad. Vigente. |
| ADR14-04 | Evidencia: 26% de código en src/ era experimental | PRESERVE | Justificación histórica de la decisión. |

### 5.4 Resumen ADR

| Acción | Cantidad |
|--------|----------|
| ABSORB | 2 (ADR12-01, ADR13-04) |
| PRESERVE | 6 |
| REFERENCE | 3 |
| DEPRECATE | 2 (ADR13-01, ADR13-02) |
| DISCARD | 0 |

---

## 6. Legacy Documents Analysis

### 6.1 PR-7 Series — Pattern Discovery (7 documentos)

| # | Documento | Acción | Justificación |
|---|-----------|--------|---------------|
| PR7 | PR-7A..7G (7 docs: ontología, modelo matemático, parámetros, contrato, identidad, minimalidad, semántica) | DEPRECATE | Pattern Discovery fue removido de src/ por ADR-014. El diseño conceptual de una capa eliminada no tiene valor normativo actual. La trazabilidad está preservada en ADR-014 y el git history. |

### 6.2 PR-8 Series — Goals (7 documentos)

| # | Documento | Acción | Justificación |
|---|-----------|--------|---------------|
| PR8 | PR-8A..8G (7 docs: ontología, modelo matemático, identidad, contrato, evolución, minimalidad, semántica) | DEPRECATE | Capa eliminada por decisión arquitectónica (PR-8). Sin valor normativo actual. |

### 6.3 PR-9 Series — Planning (7 documentos)

| # | Documento | Acción | Justificación |
|---|-----------|--------|---------------|
| PR9 | PR-9A..9G (7 docs) | DEPRECATE | Capa eliminada. Sin valor normativo actual. |

### 6.4 PR-10 Series — Boundary (6 documentos)

| # | Documento | Acción | Justificación |
|---|-----------|--------|---------------|
| PR10 | PR-10A..10F (6 docs) | DEPRECATE | Entidad eliminada. Sin valor normativo actual. |

### 6.5 Otros documentos legacy

| # | Documento | Acción | Justificación |
|---|-----------|--------|---------------|
| LEG-01 | ARCHITECTURE_MILESTONE_v2.0.md | DEPRECATE | v3.0 existe y está vigente. v2.0 es histórico. |
| LEG-02 | DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md (Freeze V1) | DEPRECATE | Reemplazado por INTERFACE_FREEZE_V2. Sin valor. |
| LEG-03 | PR-11_COGNITIVE_REALITY_ALIGNMENT.md | PRESERVE | Documento fundamental que explica la alineación cognitiva. Trazabilidad histórica. |
| LEG-04 | S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md | PRESERVE | Auditoría raíz que identificó problemas estructurales. Valor histórico. |
| LEG-05 | CE-1 a CE-5 (5 documentos) | PRESERVE | Prerrequisitos de ADR-012. Valor de trazabilidad. |
| LEG-06 | docs/history/ (8 documentos) | DEPRECATE | Propuestas de diseño previas. Sin valor normativo. |
| LEG-07 | ael/archive/ (6 documentos) | DEPRECATE | Reemplazados por SPEC.md y Capability Contracts. |
| LEG-08 | docs/certification/ auditorías puntuales (QA1, CX-1, CLEANUP, COVERAGE, DB_AUDIT, etc.) | DEPRECATE | Certificaciones puntuales para hitos ya superados. Sin valor normativo actual. |
| LEG-09 | docs/certification/TECHNICAL_DEBT_BASELINE.md | REFERENCE | Línea base de deuda aún vigente. Mantener. |
| LEG-10 | docs/certification/CERTIFICATION_REGISTRY.md | PRESERVE | Registro central de certificaciones. Vigente. |
| LEG-11 | docs/certification/QA_GOVERNANCE.md | REFERENCE | Reglas de gobernanza QA. Vigentes. |
| LEG-12 | ael/artifacts/ (10+ documents DRAFT) | DEPRECATE | Documentos DRAFT del diseño cognitivo previo. Reemplazados por la Constitución y documentos vigentes. |

### 6.6 Resumen Legacy

| Acción | Cantidad |
|--------|----------|
| ABSORB | 0 |
| PRESERVE | 5 (LEG-03, LEG-04, LEG-05, LEG-10) |
| REFERENCE | 2 (LEG-09, LEG-11) |
| DEPRECATE | 27 (PR7, PR8, PR9, PR10, LEG-01, LEG-02, LEG-06, LEG-07, LEG-08, LEG-12) |
| DISCARD | 0 |

---

## 7. Absorption Candidates — Priorizados

Elementos que DEBEN incorporarse a la Constitución en la próxima actualización, ordenados por criticidad.

| Prioridad | Elemento | Origen | Destino en CONST | Riesgo de no absorber |
|-----------|----------|--------|-------------------|----------------------|
| **P0** | I-C2/I-12 — Una sola clasificación por mensaje | FBS / CDA | INV | Doble clasificación produce bugs inconsistentes |
| **P0** | I-C5 — No ejecutar sin confirmar | FBS | CC o INV | Ejecución sin confirmación puede generar viajes incorrectos |
| **P0** | I-C6 — No asumir primer lugar ambiguo | FBS | CC o INV | Asumir lugar incorrecto → cotización y despacho erróneos |
| **P0** | I-C8 — No inventar lugares | FBS | CC o INV | Devolver lugares inexistentes → errores operativos |
| **P0** | I-C12 — Slot_state determina acción (solo CONFIRMED→dispatch) | FBS | INV | Dispatch con datos no confirmados |
| **P0** | CDA-I05 — Ambiguity no destruye contexto | CDA | INV | Activar ambiguity pierde slots confirmados |
| **P1** | CDA-I07 — No retroceder estado conversacional | CDA | INV | Usuario retrocede en el flujo |
| **P1** | CDA-I11 — clarify_field determina interpretación | CDA | INV | Mensaje malinterpretado |
| **P1** | CDA-I14 — No múltiples autoridades para decidir | CDA | INV | 4 componentes compitiendo por la misma decisión |
| **P1** | P1 — Un solo dato por vez | FBS | CC | Usuario abrumado por múltiples preguntas |
| **P1** | P5 — La ambigüedad se resuelve, no se ignora | FBS | CC | Ambigüedad no resuelta → error acumulado |
| **P1** | P7 — La conversación no es el negocio (slots > historial) | FBS | CC | Slots corrompidos por ruido conversacional |
| **P1** | CDA-01 — Principio rector: "contexto es la verdad, mensaje es delta" | CDA | CC | Merge incorrecto por falta de principio rector |
| **P1** | CDA-05 — Reglas de resolución de conflictos (3 reglas) | CDA | INV | Conflictos entre fuentes sin resolver |
| **P2** | FBS-RNF01 — Determinismo del núcleo | FBS | RNF-A | CORE impuro → comportamiento no determinista |
| **P2** | FBS-RNF04 — Phone como identidad | FBS | RNF-A | Sesiones anónimas → pérdida de estado |
| **P2** | FBS-RNF08 — Política antes de Output | FBS | RNF-A | Respuesta sin pasar por política de negocio |
| **P2** | ADR12-01 — Conocimiento > generación | ADR-012 | CC | LLM usado cuando reglas determinísticas bastan |
| **P3** | SB-03 — What AITOS is not (5 exclusiones) | SYSTEM_BIBLE | §1.5 Identidad | Límites del dominio no completamente definidos |
| **P3** | P6 — Lenguaje natural, no formularios | FBS | CC | UX no natural para el usuario |
| **P3** | P10 — Slot_state RAW→INFERRED→CONFIRMED | FBS | CC o INV | Estado del slot como modelo conceptual |
| — | ~~CDA-04 — Jerarquía 7 niveles~~ | ~~CDA~~ | → SPECIFICATION | Detalle técnico no constitucional (Arch Gate) |
| — | ~~FBS-RF02 — 12 intents~~ | ~~FBS~~ | → SPECIFICATION | Lista detallada no constitucional (Arch Gate) |
| — | ~~FBS-RF03 — 6 slots~~ | ~~FBS~~ | → SPECIFICATION | Lista detallada no constitucional (Arch Gate) |
| — | ~~FBS-RF05 — Jerarquía cotización~~ | ~~FBS~~ | → SPECIFICATION | Regla de negocio detallada (Arch Gate) |
| — | ~~FBS-RF06 — Despacho niveles~~ | ~~FBS~~ | → SPECIFICATION | Regla de negocio detallada (Arch Gate) |
| — | ~~FBS-RF07 — Confirmación explícita~~ | ~~FBS~~ | → SPECIFICATION | Flujo detallado, principio ya en INV (Arch Gate) |
| — | ~~FBS-RF08 — Ambigüedad geográfica~~ | ~~FBS~~ | → SPECIFICATION | Flujo detallado (Arch Gate) |
| — | ~~FBS-RNF02 — LLM opcional~~ | ~~FBS~~ | → SPECIFICATION | Ya cubierto por RNF-A02 (Arch Gate) |
| — | ~~FBS-RNF03 — Triple fallback~~ | ~~FBS~~ | → SPECIFICATION | Ya cubierto por RNF-A09 (Arch Gate) |
| — | ~~FBS-RNF06 — Idempotencia~~ | ~~FBS~~ | → SPECIFICATION | Ya cubierto por RNF-A10 (Arch Gate) |
| — | ~~SB-08 — 5 degradación escenarios~~ | ~~SYSTEM_BIBLE~~ | → SPECIFICATION | Escenarios específicos (Arch Gate) |
| — | ~~SB-05 — Modelo 6 slots~~ | ~~SYSTEM_BIBLE~~ | → SPECIFICATION | El concepto es CONST; los 6 slots detalle SPEC |
| — | ~~SB-07 — Pipeline 7 pasos~~ | ~~SYSTEM_BIBLE~~ | → ARCHITECTURE | Flujo detallado, no constitucional |

---

## 8. Preservation Candidates — Deben mantenerse

| # | Documento | Motivo |
|---|-----------|--------|
| PRSV-01 | CDA §10 Trazabilidad (matriz specification) | Traza histórica de verificación del algoritmo contra bugs conocidos. Vital para auditorías. |
| PRSV-02 | CDA §11 Verificación contra bugs | Evidencia de correcciones pasadas. Vital para entender por qué ciertas reglas existen. |
| PRSV-03 | ADR-012 §1-3 (contexto, evidencia CE-1) | Explica por qué se adoptó el principio de escalamiento cognitivo. |
| PRSV-04 | ADR-013 (evidencia QA1, QA2, QA2B, QA3-S2B) | Demuestra la necesidad del CDA. Valor de trazabilidad. |
| PRSV-05 | ADR-013 §0 cambios de código | Dato histórico importante: el CDA se ratificó sin cambios de código. |
| PRSV-06 | ADR-014 (decisión de limpieza de capas experimentales) | Explica por qué cierto código fue eliminado. |
| PRSV-07 | PR-11_COGNITIVE_REALITY_ALIGNMENT.md | Documento fundamental de alineación cognitiva. Trazabilidad. |
| PRSV-08 | S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md | Auditoría raíz. Trazabilidad. |
| PRSV-09 | CE-1 a CE-5 (5 documentos) | Prerrequisitos de ADR-012. Trazabilidad de evidencia. |
| PRSV-10 | CERTIFICATION_REGISTRY.md | Registro central de certificación. Vigente. |
| PRSV-11 | incidentes (H-CAT2-001, CAT2 result) | Incidentes activos que requieren seguimiento. |

---

## 9. Deprecation Candidates — Sin valor actual

| # | Documento | Justificación |
|---|-----------|---------------|
| DEP-01 | SYSTEM_BIBLE §6 (Authority hierarchy) | Contradice la Constitución. La jerarquía debe ser la de la Constitución. |
| DEP-02 | ADR-013 jerarquía (Implementation → CDA → Specification → ADR) | Reemplazada por la jerarquía de la Constitución. |
| DEP-03 | PR-7A..7G (7 docs) — Pattern Discovery design | Capa eliminada por ADR-014. Sin valor normativo. |
| DEP-04 | PR-8A..8G (7 docs) — Goals | Capa eliminada. |
| DEP-05 | PR-9A..9G (7 docs) — Planning | Capa eliminada. |
| DEP-06 | PR-10A..10F (6 docs) — Boundary | Entidad eliminada. |
| DEP-07 | ARCHITECTURE_MILESTONE_v2.0.md | Reemplazado por v3.0. |
| DEP-08 | DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md (Freeze V1) | Reemplazado por INTERFACE_FREEZE_V2. |
| DEP-09 | docs/history/ (8 documentos) | Propuestas históricas sin valor normativo. |
| DEP-10 | ael/archive/ (6 documentos) | Reemplazados por SPEC.md. |
| DEP-11 | docs/certification/ (auditorías puntuales ~40 archivos) | Certificaciones puntuales para hitos superados. Incluye QA1, CX-1, CLEANUP_PLAN, DB_AUDIT, etc. |
| DEP-12 | ael/artifacts/ (10+ DRAFTs) | Diseño cognitivo previo. Reemplazado por Constitución. |

**Nota:** DEPRECATE no implica eliminación inmediata. Los documentos deben trasladarse a un archivo histórico (ej. `ael/archive/` o `docs/history/`) cuando se ejecute CGP-1 Phase 3.

---

## 10. Required Actions Before Cleanup

### 10.1 Pre-requisitos para CGP-1 Phase 3 (Document Deprecation Plan)

| # | Acción | Dependencia | Documentos afectados |
|---|--------|-------------|---------------------|
| A-01 | **Absorber los 38 elementos P0-P3 en la Constitución** | Ninguna | CONST, FBS, CDA, SYSTEM_BIBLE |
| A-02 | **Actualizar CONST §1.5** para incluir las 5 exclusiones de SYSTEM_BIBLE (SB-03) | A-01 | CONST §1.5 |
| A-03 | **Incorporar modelo de slots** (origin, destination, passengers, scheduled_at, price, vehicle) en CONST | A-01 | CONST CC o RF |
| A-04 | **Actualizar jerarquía normativa de ADR-013** | A-01 | ADR-013 |
| A-05 | **Actualizar FBS header** para declarar subordinación a CONST | A-01 | FBS (header) |
| A-06 | **Actualizar CDA header** para declarar subordinación a CONST | A-01 | CDA (header) |
| A-07 | **Mover SYSTEM_BIBLE** a docs/history/ una vez absorbido SB-03, SB-05, SB-07, SB-08 | A-01, A-02, A-03 | SYSTEM_BIBLE.md |
| A-08 | **Archivar PR-7, PR-8, PR-9, PR-10** en ael/archive/ | Ninguna | ~27 documentos |
| A-09 | **Archivar ARCHITECTURE_MILESTONE_v2.0.md** en docs/history/ | Ninguna | 1 documento |
| A-10 | **Archivar DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md** en ael/archive/ | Ninguna | 1 documento |
| A-11 | **Revisar docs/certification/** para identificar ~40 archivos deprecables vs los que deben preservarse | Ninguna | ~50 documentos |
| A-12 | **Actualizar KNOWLEDGE_INVENTORY.md** para reflejar el nuevo estado documental post-absorción | A-01 a A-11 | KNOWLEDGE_INVENTORY.md |

### 10.2 Orden de ejecución recomendado

```
Fase 3a: ABSORBER
  1. Actualizar CONST con 38 elementos absorbidos
  2. Actualizar FBS header (subordinación)
  3. Actualizar CDA header (subordinación)
  4. Actualizar ADR-013 (jerarquía)

Fase 3b: ARCHIVAR
  5. Mover SYSTEM_BIBLE a docs/history/
  6. Archivar PR-7/8/9/10 en ael/archive/
  7. Archivar milestones y freeze V1
  8. Revisar docs/certification/ para archivo masivo

Fase 3c: ACTUALIZAR ÍNDICES
  9. Actualizar KNOWLEDGE_INVENTORY.md
  10. Actualizar ARCHITECTURE_STATUS.md §12
  11. Actualizar referencias en agentes/prompts si aplica
```

### 10.3 Riesgos de no ejecutar

| Riesgo | Severidad | Descripción |
|--------|-----------|-------------|
| R-01 | ALTA | 5 invariantes omitidas (I-C2, I-C4, I-C6, I-C7, I-C8, I-C12) generan bugs conversacionales no prevenibles por la Constitución |
| R-02 | ALTA | 5 invariantes CDA (I-05, I-07, I-11, I-12, I-14) generan comportamiento inconsistente |
| R-03 | MEDIA | La jerarquía ADR-013 contradice a la Constitución → ambigüedad de autoridad |
| R-04 | MEDIA | El modelo de slots del producto no está documentado en la Constitución |
| R-05 | BAJA | ~40 documentos legacy en docs/certification/ degradan la navegabilidad documental |

---

> **Fin de DOCUMENT_ABSORPTION_MATRIX.md — Baseline para CGP-1 Phase 3.**
>
> 124 elementos clasificados. 38 candidatos a ABSORB identificados con prioridad P0-P3.
> La ejecución de la absorción corresponderá a CGP-1 Phase 3 (Document Deprecation Plan).
