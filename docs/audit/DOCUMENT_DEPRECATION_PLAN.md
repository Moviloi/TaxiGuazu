# Document Deprecation Plan — AITOS

> CGP-1: Constitutional Governance Program — Phase 3
> Propósito: Plan formal de saneamiento documental. Define qué hacer con cada documento.
> Restricción: Solo planificación. No ejecución de cambios.

---

## 1. Executive Summary

Se planifican acciones para **46 documentos/grupos documentales** identificados en las fases previas.

**Distribución de acciones:**

| Acción | Cantidad | Documentos |
|--------|----------|------------|
| **MIGRATE** | 4 | FBS (contenido a CONST), CDA (principios a CONST), ADR-012 (principio a CONST), SYSTEM_BIBLE (contenido a CONST) |
| **RESTRUCTURE** | 6 | SYSTEM_BIBLE, FBS, CDA, ADR-013, ADR_INDEX, docs/ai/ Context Pack |
| **KEEP** | 8 | AITOS_CONSTITUTION, ARCHITECTURE_STATUS, ael/constitution/SPEC, ael/constitution/CONTRACTS, CERTIFICATION_REGISTRY, TECHNICAL_DEBT_BASELINE, QA_GOVERNANCE, incidentes abiertos |
| **ARCHIVE** | 27 | PR-7/8/9/10 (27 docs), milestones v2.0, Freeze V1, docs/history/, docs/certification/ (~40), ael/artifacts/ |
| **DELETE** | 1 | SYSTEM_BIBLE (solo después de migración completa) |

**Secuencia general:** Absorber → Restructurar → Archivar → Eliminar

---

## 2. Migration Strategy

### 2.1 Principios de migración

| Principio | Descripción |
|-----------|-------------|
| M-01 | Todo conocimiento absorbido debe llegar a su destino antes de que el documento fuente sea archivado o eliminado. |
| M-02 | Las referencias cruzadas deben actualizarse antes de archivar. |
| M-03 | Un documento archivado nunca se elimina. Se mueve a un directorio de archive y se marca como HISTÓRICO. |
| M-04 | Un documento eliminado debe cumplir: sin contenido único, sin referencias activas, duplicado puro. |
| M-05 | La eliminación es el último paso, nunca el primero. |

### 2.2 Flujo de migración por tipo de acción

```
MIGRATE:
  [Origen] → extraer contenido → [Destino] → verificar integridad → marcar origen como DEPLETED

RESTRUCTURE:
  [Documento] → cambiar header/declaración de autoridad → actualizar referencias → 
  verificar consistencia con CONST

ARCHIVE:
  [Documento] → verificar que contenido absorbido/irrelevante → mover a directorio archive →
  actualizar referencias

DELETE:
  [Documento] → verificar criterios M-04 → eliminar físicamente → actualizar índices
```

---

## 3. P0 Actions — Bloquean certificación constitucional

### P0-01: Resolver contradicción de RFs entre CONST y FBS

| Campo | Valor |
|-------|-------|
| **Problema** | CONST §3 define 19 RFs; FBS §3 define 10 RFs diferentes. Dos conjuntos de requisitos incompatibles. |
| **Documentos** | CONST, FBS |
| **Acción** | MIGRATE (contenido FBS RF-02, RF-05, RF-06, RF-07, RF-08 a CONST) + RESTRUCTURE (FBS header) |
| **Detalle** | 6 RFs de FBS deben migrar a CONST: clasificación de intención (RF-02), cotización (RF-05), despacho (RF-06), confirmación (RF-07), ambigüedad (RF-08), slots (RF-03). El header de FBS debe cambiar de "Fuente de Verdad funcional" a "Especificación detallada derivada de la Constitución". |
| **Dependencias** | Ninguna |
| **Riesgo** | Sin resolver, no hay SSOT de requisitos funcionales. Desarrolladores no saben qué RFs cumplir. |
| **Tiempo estimado** | 2 horas |

### P0-02: Incorporar invariantes omitidas a CONST

| Campo | Valor |
|-------|-------|
| **Problema** | 5 invariantes I-C (FBS) y 5 invariantes I-nn (CDA) no existen en CONST. |
| **Documentos** | CONST, FBS, CDA |
| **Acción** | MIGRATE (FBS I-C2, I-C4, I-C5, I-C6, I-C7, I-C8, I-C11, I-C12; CDA I-05, I-07, I-11, I-12, I-14 → CONST INV) |
| **Detalle** | 13 invariantes deben incorporarse como INV-09 a INV-21 en CONST o fusionarse con INV existentes donde aplique. Las invariantes duplicadas (ya en CONST) deben marcarse en FBS/CDA como "Ver CONST INV-XX". |
| **Dependencias** | P0-01 |
| **Riesgo** | Sin estas invariantes, bugs conversacionales conocidos (doble clasificación, ambigüedad destructiva, falta de confirmación) no tienen cobertura normativa. |
| **Tiempo estimado** | 1 hora |

### P0-03: Actualizar jerarquía normativa de ADR-013

| Campo | Valor |
|-------|-------|
| **Problema** | ADR-013 establece jerarquía "Implementation → CDA → Specification → ADR" que ignora la Constitución. |
| **Documentos** | ADR-013 |
| **Acción** | RESTRUCTURE (actualizar ADR-013 para incluir CONST en el tope de la jerarquía) |
| **Detalle** | La jerarquía debe ser: "Constitución → CDA (como CON-01) → FBS → ADR → Implementation". El CDA debe declararse como la implementación del Contrato de Decisión Conversacional (CON-01) de la Constitución. |
| **Dependencias** | P0-01 |
| **Riesgo** | Sin actualizar, dos jerarquías incompatibles coexisten. La autoridad normativa es ambigua. |
| **Tiempo estimado** | 30 minutos |

### P0-04: Resolver principio rector del CDA

| Campo | Valor |
|-------|-------|
| **Problema** | El principio rector del CDA ("El contexto es la fuente de verdad. El mensaje es un delta.") no está en CONST. |
| **Documentos** | CDA, CONST |
| **Acción** | MIGRATE (CDA principio rector → CONST CC o PC) |
| **Detalle** | El principio rector del CDA debe incorporarse a la Constitución como un Principio Constitucional o Cognitivo. Es el fundamento de toda la arquitectura conversacional. |
| **Dependencias** | Ninguna |
| **Riesgo** | CONST carece del principio fundamental del algoritmo conversacional. |
| **Tiempo estimado** | 15 minutos |

### P0-05: Resolver jerarquía de decisión y reglas de merge

| Campo | Valor |
|-------|-------|
| **Problema** | La jerarquía de 7 niveles del CDA y las 3 reglas de resolución de conflictos no están en CONST. |
| **Documentos** | CDA, CONST |
| **Acción** | MIGRATE (CDA §3 jerarquía + §3 reglas de conflicto → CONST) |
| **Detalle** | La jerarquía (confirmado > intención > clarify > extracción > ambiguity > LLM > fallback) y las 3 reglas de conflicto (específico, reciente, confirmed) deben estar en CONST como Reglas de Decisión o Heurísticas. |
| **Dependencias** | P0-04 |
| **Riesgo** | Sin jerarquía explícita, no hay método para resolver conflictos entre fuentes de información. |
| **Tiempo estimado** | 45 minutos |

---

## 4. P1 Actions — Necesarias antes de declarar gobernanza completa

### P1-01: Restructurar SYSTEM_BIBLE

| Campo | Valor |
|-------|-------|
| **Problema** | SYSTEM_BIBLE se autodenomina "non-technical constitution" y §6 contradice la jerarquía de CONST. |
| **Documentos** | SYSTEM_BIBLE.md |
| **Acción** | MIGRATE (§3 → CONST §1.5, §5 → CONST, §7 → CONST, §8 → CONST) + RESTRUCTURE (degradar a documento contextual/onboarding) |
| **Detalle** | Migrar las 4 secciones con conocimiento único (§3 What AITOS is not, §5 Operational model, §7 How system decides, §8 Graceful degradation). Luego reestructurar SYSTEM_BIBLE como documento de onboarding no normativo que referencie la Constitución. El §6 debe eliminarse por contradicción. |
| **Dependencias** | P0-01, P0-02 |
| **Riesgo** | Sin migrar, el conocimiento de degradación graceful (§8) y límites del dominio (§3) se pierde al archivar. |
| **Tiempo estimado** | 1 hora |

### P1-02: Restructurar FBS

| Campo | Valor |
|-------|-------|
| **Problema** | FBS se autodenomina "Fuente de Verdad funcional" compitiendo con la Constitución. |
| **Documentos** | FBS |
| **Acción** | RESTRUCTURE (cambiar header + agregar subordinación explícita a CONST) + MIGRATE (contenido seleccionado) |
| **Detalle** | Header debe cambiar a: "Especificación funcional detallada. Documento derivado de la Constitución de AITOS. En caso de conflicto, prevalece la Constitución." Las secciones cuyo contenido migró a CONST deben agregar una nota "Ver CONST §X". Las invariantes duplicadas deben referenciar CONST en lugar de repetir el texto. |
| **Dependencias** | P0-01, P0-02 |
| **Riesgo** | FBS seguirá siendo consultada como "fuente de verdad" si no se actualiza su header. |
| **Tiempo estimado** | 1 hora |

### P1-03: Restructurar CDA

| Campo | Valor |
|-------|-------|
| **Problema** | CDA se autodenomina "Documento normativo" sin subordinación a CONST. |
| **Documentos** | CDA |
| **Acción** | RESTRUCTURE (cambiar header + agregar subordinación) |
| **Detalle** | El CDA debe declararse como: "Documento técnico que desarrolla el Contrato de Decisión Conversacional (CON-01) de la Constitución de AITOS." Los principios e invariantes que migren a CONST deben referenciarla. |
| **Dependencias** | P0-03, P0-04, P0-05 |
| **Riesgo** | CDA seguirá interpretándose como autoridad autónoma en lugar de derivada. |
| **Tiempo estimado** | 30 minutos |

### P1-04: Actualizar ADR_INDEX y ARCHITECTURE_STATUS

| Campo | Valor |
|-------|-------|
| **Problema** | ADR_INDEX y ARCHITECTURE_STATUS.md §12 no incluyen la Constitución en sus inventarios. |
| **Documentos** | ADR_INDEX.md, ARCHITECTURE_STATUS.md |
| **Acción** | RESTRUCTURE (agregar referencias a CONST en ambos documentos) |
| **Detalle** | ADR_INDEX debe agregar a la Constitución como nivel normativo superior. ARCHITECTURE_STATUS §12 debe incluir AITOS_CONSTITUTION.md y los documentos de auditoría CGP. |
| **Dependencias** | Ninguna |
| **Riesgo** | Los índices documentales no reflejan la realidad del ecosistema. |
| **Tiempo estimado** | 30 minutos |

### P1-05: Actualizar docs/ai/ Context Pack

| Campo | Valor |
|-------|-------|
| **Problema** | El Context Pack de IA (ARCHITECTURE_BIBLE, ARCHITECTURE_RULES, INVARIANTS, etc.) no referencia la Constitución. |
| **Documentos** | docs/ai/ (7 archivos) |
| **Acción** | RESTRUCTURE (agregar referencias a CONST en todos los archivos) |
| **Detalle** | Cada archivo del Context Pack debe declarar explícitamente: "Este documento es material de contexto. La autoridad normativa es la Constitución de AITOS (docs/architecture/AITOS_CONSTITUTION.md)." |
| **Dependencias** | Ninguna |
| **Riesgo** | IA agents pueden recibir contexto que contradice la Constitución sin saberlo. |
| **Tiempo estimado** | 1 hora |

### P1-06: Migrar principio de escalamiento cognitivo

| Campo | Valor |
|-------|-------|
| **Problema** | El principio "conocimiento explícito > reglas determinísticas > modelos generativos" (ADR-012) no está en CONST. |
| **Documentos** | ADR-012, CONST |
| **Acción** | MIGRATE (principio ADR-012 → CONST CC o RNF-A) |
| **Detalle** | El principio de escalamiento cognitivo determina cómo AITOS debe resolver problemas (BKE → DRL → LLM). Esto es un principio de comportamiento del producto, no solo una decisión arquitectónica. Debe estar en CONST. |
| **Dependencias** | Ninguna |
| **Riesgo** | ADR-012 podría quedar como documento histórico; su principio se pierde si no se absorbe. |
| **Tiempo estimado** | 15 minutos |

---

## 5. P2 Actions — Limpieza estructural

### P2-01: Archivar PR-7 Series (7 documentos)

| Campo | Valor |
|-------|-------|
| **Documentos** | `docs/architecture/PR-7A..7G_*` |
| **Acción** | ARCHIVE (mover a `ael/archive/`) |
| **Destino** | `ael/archive/PR-series/PR-7/` |
| **Dependencias** | Ninguna |
| **Riesgo** | Pattern Discovery fue eliminado por ADR-014. El diseño de una capa eliminada no tiene valor operativo. |

### P2-02: Archivar PR-8 Series (7 documentos)

| Campo | Valor |
|-------|-------|
| **Documentos** | `docs/architecture/PR-8A..8G_GOALS_*` |
| **Acción** | ARCHIVE (mover a `ael/archive/`) |
| **Destino** | `ael/archive/PR-series/PR-8/` |
| **Dependencias** | Ninguna |

### P2-03: Archivar PR-9 Series (7 documentos)

| Campo | Valor |
|-------|-------|
| **Documentos** | `docs/architecture/PR-9A..9G_PLANNING_*` |
| **Acción** | ARCHIVE (mover a `ael/archive/`) |
| **Destino** | `ael/archive/PR-series/PR-9/` |
| **Dependencias** | Ninguna |

### P2-04: Archivar PR-10 Series (6 documentos)

| Campo | Valor |
|-------|-------|
| **Documentos** | `docs/architecture/PR-10A..10F_BOUNDARY_*` |
| **Acción** | ARCHIVE (mover a `ael/archive/`) |
| **Destino** | `ael/archive/PR-series/PR-10/` |
| **Dependencias** | Ninguna |

### P2-05: Archivar milestones históricos

| Campo | Valor |
|-------|-------|
| **Documentos** | `ARCHITECTURE_MILESTONE_v2.0.md`, `DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md` |
| **Acción** | ARCHIVE (mover a `ael/archive/`) |
| **Destino** | `ael/archive/milestones/` |
| **Dependencias** | Ninguna |
| **Nota** | v3.0 y Freeze V2 existen y están vigentes. v2.0 y V1 son históricos. |

### P2-06: Archivar docs/history/

| Campo | Valor |
|-------|-------|
| **Documentos** | `docs/history/` (8 documentos: USECASES, agent-contracts, COMMERCIAL-MODEL-SPEC, proposals, synthesis) |
| **Acción** | ARCHIVE (mover a `ael/archive/history/`) |
| **Destino** | `ael/archive/history/` |
| **Dependencias** | Ninguna |
| **Riesgo** | Bajo. Son propuestas y documentos previos sin valor normativo. |

### P2-07: Archivar ael/artifacts/ DRAFTs

| Campo | Valor |
|-------|-------|
| **Documentos** | `ael/artifacts/` (documentos DRAFT: 01-CONSTITUTION, 03-COGNITIVE_PRINCIPLES, 04-EVIDENCE_MODEL, 05-DECISION_MODEL, 06-COMMITMENT_MODEL, 07-CERTAINTY_CALCULUS, 08-CHANNEL_ADAPTER, 09-ACTION_EXECUTOR, 10-KNOWLEDGE_MODEL, 11-COGNITIVE_ARCHITECTURE, AUDITORIAS) |
| **Acción** | ARCHIVE (mover a `ael/archive/artifacts/`) |
| **Destino** | `ael/archive/artifacts/` |
| **Dependencias** | Ninguna |
| **Nota** | Algunos archivos vigentes (BACKLOG.md, DECISION_RECORD.md, PATTERN_EXTRACTION.md) deben evaluarse individualmente antes de archivar. |

### P2-08: Revisar docs/certification/ para archivo masivo

| Campo | Valor |
|-------|-------|
| **Documentos** | ~40 archivos en `docs/certification/` (auditorías puntuales: QA1, CX-1, CLEANUP, COVERAGE, DB_AUDIT, HARDCODE_AUDIT, LEAD_SERVICE_REFACTOR*, TEST_FAILURE_AUDIT, etc.) |
| **Acción** | ARCHIVE selectivo + KEEP selectivo |
| **KEEP** | CERTIFICATION_REGISTRY.md, QA_GOVERNANCE.md, TECHNICAL_DEBT_BASELINE.md, CAT_CERTIFICATION_REGISTER.md, H0A_STAGING_HARDENING_AUDIT.md |
| **ARCHIVE** | Todo lo demás en `ael/archive/certification/` |
| **Dependencias** | Ninguna |
| **Riesgo** | Medio. Algunos archivos pueden contener hallazgos no resueltos. Verificar que ningún hallazgo abierto quede sin seguimiento. |

---

## 6. P3 Actions — Mejora futura

### P3-01: Consolidar nomenclatura specification/specifications

| Campo | Valor |
|-------|-------|
| **Problema** | `docs/specification/` (singular) y `docs/specifications/` (plural) coexisten. Inconsistencia de nomenclatura. |
| **Acción** | RESTRUCTURE (unificar en `docs/specifications/` o `docs/specification/`) |
| **Prioridad** | P3 — Estética documental, sin impacto funcional. |

### P3-02: Actualizar README.md

| Campo | Valor |
|-------|-------|
| **Problema** | README.md describe stack técnico pero no referencia la Constitución ni la jerarquía documental. |
| **Acción** | RESTRUCTURE (agregar sección de "Documentación" que referencie la Constitución) |
| **Prioridad** | P3 — Mejora de onboarding. |

### P3-03: Unificar KNOWLEDGE_INVENTORY.md y ARCHITECTURE_STATUS.md §12

| Campo | Valor |
|-------|-------|
| **Problema** | Dos inventarios documentales compiten. |
| **Acción** | RESTRUCTURE (unificar o eliminar duplicación) |
| **Prioridad** | P3 |

### P3-04: Actualizar diagramas

| Campo | Valor |
|-------|-------|
| **Problema** | Los diagramas existentes pueden no reflejar la arquitectura definida por la Constitución. |
| **Acción** | RESTRUCTURE (revisar y actualizar diagramas para alinearlos con la CONST) |
| **Prioridad** | P3 |

---

## 7. SYSTEM_BIBLE Migration Plan

### 7.1 Estado actual

- **Rol actual:** "Non-technical constitution" (autodeclarado)
- **Problema:** §6 contradice CONST. §3, §5, §7, §8 contienen conocimiento único no presente en CONST.
- **Ubicación:** `docs/SYSTEM_BIBLE.md`
- **Última actualización:** 2026-07-06

### 7.2 Contenido a migrar

| Sección | Contenido | Acción | Destino |
|---------|-----------|--------|---------|
| §3 — What AITOS is not (5 exclusiones) | "not a chatbot, not a WhatsApp bot, not a booking engine, not a CRM, not a black-box AI" | MIGRATE | CONST §1.5 (Alcance) |
| §5 — Operational model (6 slots) | modelo conceptual del producto: origin, destination, passengers, scheduled_at, price, vehicle | MIGRATE | CONST CC o RF |
| §7 — How system decides (7 pasos) | classify → extract → resolve → price → decide → render → execute | MIGRATE | CONST §4 (Arquitectura) |
| §8 — Graceful degradation (5 escenarios) | provider failover, deterministic fallback, location/tariff/driver escalation | MIGRATE | CONST CC, CON o RNF |

### 7.3 Contenido a eliminar

| Sección | Justificación |
|---------|---------------|
| §6 — Authority and trust | Contradice CONST §1.3. La jerarquía correcta está en la Constitución. |
| §4 — The core promise (EXECUTE/ANSWER/CLARIFY) | Duplicado de CONST §1.3. |

### 7.4 Contenido a preservar

| Sección | Justificación |
|---------|---------------|
| §1 — Purpose (narrativa del turista) | Valor de onboarding. Útil para nuevos miembros del equipo. |
| §2 — What AITOS is | Valor contextual. No contradice CONST. |
| §9 — Scope boundaries | Ya en CONST pero el formato de tabla es útil para onboarding. |
| §10 — Evolution principles | Principios de evolución (parcialmente cubiertos por PC). |
| §11 — Reading order | Útil para onboarding. Debe actualizarse para referenciar CONST. |

### 7.5 Destino final

| Etapa | Acción | Resultado |
|-------|--------|-----------|
| 1 | Migrar §3, §5, §7, §8 a CONST | CONST actualizada |
| 2 | Eliminar §6 (contradicción) y §4 (duplicado) | Documento reducido |
| 3 | Cambiar header: "Non-technical constitution" → "AITOS Overview — Onboarding Document" | Nuevo rol |
| 4 | Agregar header note: "Este documento es una introducción contextual. La autoridad normativa es la Constitución de AITOS (docs/architecture/AITOS_CONSTITUTION.md)." | Subordinación explícita |
| 5 | Mover a `docs/onboarding/SYSTEM_BIBLE.md` (o mantener en raíz con nuevo rol) | Documento de onboarding |

**Nuevo rol:** Documento de onboarding no normativo. Herramienta de lectura inicial para nuevos miembros del equipo. Sin autoridad sobre decisiones de producto.

---

## 8. FBS Migration Plan

### 8.1 Estado actual

- **Rol actual:** "Fuente de Verdad funcional del sistema conversacional AITOS"
- **Problema:** Compite con CONST como autoridad. Contiene RFs, RNFs y principios no alineados.
- **Ubicación:** `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md`
- **Extensión:** 1746 líneas

### 8.2 Contenido a migrar a CONST

| Elemento | Destino en CONST | Prioridad |
|----------|-----------------|-----------|
| FBS RF-02 (Clasificación de 12 intents) | CONST RF (nuevo) | P0 |
| FBS RF-03 (Extracción de 6 slots) | CONST RF (nuevo) | P0 |
| FBS RF-05 (Jerarquía de cotización) | CONST RF (nuevo) | P1 |
| FBS RF-06 (Despacho por niveles) | CONST RF (nuevo) | P1 |
| FBS RF-07 (Confirmación explícita) | CONST RF (nuevo) | P1 |
| FBS RF-08 (Gestión de ambigüedad geográfica) | CONST RF (nuevo) | P1 |
| FBS RNF-01 (Determinismo del núcleo) | CONST RNF-A (nuevo) | P1 |
| FBS RNF-02 (LLM opcional) | CONST RNF-A (nuevo) | P1 |
| FBS RNF-03 (Triple fallback) | CONST RNF-A (nuevo) | P1 |
| FBS RNF-04 (Phone como identidad) | CONST RNF-A (nuevo) | P1 |
| FBS RNF-06 (Idempotencia) | CONST RNF-A (nuevo) | P1 |
| FBS RNF-08 (Política antes de Output) | CONST RNF-A (nuevo) | P1 |
| FBS P1 (Un solo dato por vez) | CONST CC (nuevo) | P1 |
| FBS P3 (No repetir preguntas) | CONST CC (nuevo) | P1 |
| FBS P4 (Confirmar antes de ejecutar) | CONST CC (nuevo) | P1 |
| FBS P5 (Ambigüedad se resuelve) | CONST CC (nuevo) | P1 |
| FBS P6 (Lenguaje natural) | CONST CC (nuevo) | P1 |
| FBS P7 (Conversación no es el negocio) | CONST CC (nuevo) | P2 |
| FBS P8 (Una sola clasificación) | CONST CC (nuevo) | P2 |
| FBS P10 (Slot_state como verdad) | CONST CC (nuevo) | P2 |
| FBS I-C2 (No doble clasificación) | CONST INV (nuevo) | P0 |
| FBS I-C4 (No responder sin clasificar) | CONST INV (nuevo) | P0 |
| FBS I-C5 (No ejecutar sin confirmar) | CONST INV (nuevo) | P0 |
| FBS I-C6 (No asumir primer lugar) | CONST INV (nuevo) | P0 |
| FBS I-C7 (No silenciar mensajes) | CONST INV (nuevo) | P0 |
| FBS I-C8 (No inventar lugares) | CONST INV (nuevo) | P0 |
| FBS I-C11 (Slots tienen source+status) | CONST INV (nuevo) | P1 |
| FBS I-C12 (Slot_state determina acción) | CONST INV (nuevo) | P0 |

### 8.3 Contenido a mantener en FBS

| Elemento | Justificación |
|----------|---------------|
| FBS RF-01 (Recepción: webhook, HMAC, rate limiting, dedup) | Especificación técnica detallada. No constitucional. |
| FBS RF-04 (Resolución geográfica: alias, fuzzy, DB) | Especificación técnica detallada. |
| FBS RF-10 (Post-venta: encuesta 24h) | Funcionalidad específica. |
| FBS RNF-07 (Tiempo de respuesta <10s) | Métrica de performance. Demasiado específica para CONST. |
| §6-19 (Pipeline, lifecycle, estados, políticas) | Especificación detallada del flujo conversacional. |
| §21-25 (Casos de uso, algoritmos) | Casos de prueba y ejemplos de implementación. |

### 8.4 Header final propuesto

```
# Functional & Behavioral Specification — AITOS

> **Versión:** 1.1
> **Propósito:** Especificación funcional detallada del sistema conversacional AITOS.
> **Autoridad:** Documento derivado de la Constitución de AITOS 
>   (docs/architecture/AITOS_CONSTITUTION.md).
> **Jerarquía:** En caso de conflicto, prevalece la Constitución.
> **Este documento desarrolla los Requerimientos Funcionales y las Invariantes
>   definidas en la Constitución, agregando detalle de implementación.
```

---

## 9. CDA Migration Plan

### 9.1 Estado actual

- **Rol actual:** "Documento normativo. Toda implementación o refactor debe cumplir este algoritmo."
- **Problema:** Autonomía normativa no subordinada a CONST. Principios e invariantes duplicados.
- **Ubicación:** `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md`
- **Extensión:** 1088 líneas

### 9.2 Contenido a migrar a CONST

| Elemento | Destino | Prioridad |
|----------|---------|-----------|
| Principio rector: "contexto es verdad, mensaje es delta" | CONST CC o PC | P0 |
| Jerarquía de 7 niveles (confirmado > intención > clarify > extracción > ambiguity > LLM > fallback) | CONST RD o H | P0 |
| 3 reglas de resolución de conflictos | CONST INV | P0 |
| CDA I-05 (Ambiguity no destruye contexto) | CONST INV | P0 |
| CDA I-07 (No retroceder estado) | CONST INV | P1 |
| CDA I-11 (clarify_field determina interpretación) | CONST INV | P1 |
| CDA I-12 (Una sola clasificación) | CONST INV | P0 |
| CDA I-13 (Fuente del slot se preserva) | CONST INV | P1 |
| CDA I-14 (No múltiples autoridades) | CONST INV | P1 |

### 9.3 Contenido a mantener como referencia técnica

| Elemento | Justificación |
|----------|---------------|
| §2 Pipeline de 11 pasos | Algoritmo detallado de implementación. |
| §5 Algoritmo de merge (fórmula, pseudocódigo) | Implementación detallada. |
| §6-8 Reglas de ambiguity, intención, update/reset | Detalle operacional. |
| §9 Árbol de decisión completo | Algoritmo exhaustivo. |
| §10-11 Trazabilidad y bugs | Valor histórico para auditorías. |

### 9.4 Header final propuesto

```
# Conversation Decision Algorithm — AITOS

> **Versión:** 1.2
> **Propósito:** Algoritmo conversacional detallado que implementa el Contrato 
>   de Decisión Conversacional (CON-01) de la Constitución de AITOS.
> **Autoridad:** Documento técnico derivado de la Constitución de AITOS
>   (docs/architecture/AITOS_CONSTITUTION.md).
> **Jerarquía:** CONST §1.4 (nivel 8: Contratos). CON-01 es el contrato;
>   este documento es su implementación algorítmica.
```

---

## 10. Archive Plan

### 10.1 Directorio de archive

Se propone crear/ampliar los siguientes directorios de archive:

| Directorio | Propósito |
|------------|-----------|
| `ael/archive/PR-series/PR-7/` | Pattern Discovery design (7 docs) |
| `ael/archive/PR-series/PR-8/` | Goals elimination (7 docs) |
| `ael/archive/PR-series/PR-9/` | Planning elimination (7 docs) |
| `ael/archive/PR-series/PR-10/` | Boundary elimination (6 docs) |
| `ael/archive/milestones/` | Milestones v2.0, Freeze V1 |
| `ael/archive/history/` | docs/history/ completo (8 docs) |
| `ael/archive/artifacts/` | ael/artifacts/ DRAFTs (~10 docs) |
| `ael/archive/certification/` | Auditorías históricas (~40 docs) |

### 10.2 Documentos a archivar

| Documento | Ruta actual | Destino archive |
|-----------|-------------|-----------------|
| PR-7A..7G (7 docs) | `docs/architecture/` | `ael/archive/PR-series/PR-7/` |
| PR-8A..8G (7 docs) | `docs/architecture/` | `ael/archive/PR-series/PR-8/` |
| PR-9A..9G (7 docs) | `docs/architecture/` | `ael/archive/PR-series/PR-9/` |
| PR-10A..10F (6 docs) | `docs/architecture/` | `ael/archive/PR-series/PR-10/` |
| ARCHITECTURE_MILESTONE_v2.0.md | `docs/architecture/` | `ael/archive/milestones/` |
| DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md | `docs/architecture/` | `ael/archive/milestones/` |
| docs/history/ completo (8 docs) | `docs/history/` | `ael/archive/history/` |
| ael/artifacts/ DRAFTs (~10 docs) | `ael/artifacts/` | `ael/archive/artifacts/` |
| Certificaciones históricas (~40 docs) | `docs/certification/` | `ael/archive/certification/` |

### 10.3 Documentos certificación a KEEP

| Documento | Motivo |
|-----------|--------|
| CERTIFICATION_REGISTRY.md | Registro central vigente |
| QA_GOVERNANCE.md | Reglas QA vigentes |
| TECHNICAL_DEBT_BASELINE.md | Deuda técnica activa |
| CAT_CERTIFICATION_REGISTER.md | CAT campaigns vigentes |
| H0A_STAGING_HARDENING_AUDIT.md | Hallazgos abiertos que bloquean staging |
| CDA y constitutivos (CX-1, QA_GOVERNANCE, etc.) | Ver cada uno individualmente |

### 10.4 Documentos archivados previamente

`ael/archive/` ya contiene 6 documentos que fueron archivados en iteraciones anteriores. No requieren acción.

---

## 11. Delete Candidates

### 11.1 Criterios de eliminación

Un documento solo puede eliminarse si cumple TODOS estos criterios:

1. **Sin contenido único:** Todo su conocimiento valioso fue migrado a otro documento.
2. **Sin referencias activas:** Ningún otro documento vigente lo referencia.
3. **Duplicado puro:** Su contenido es completamente redundante con otro documento vigente.

### 11.2 Candidatos a DELETE

| Documento | Cumple criterios | Notas |
|-----------|-----------------|-------|
| SYSTEM_BIBLE.md (después de migración) | Sí (después de P1-01) | Eliminar solo después de migrar §3, §5, §7, §8. El resto es redundante con CONST. |
| DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md (Freeze V1) | Sí | Reemplazado por INTERFACE_FREEZE_V2. Sin referencias activas. Contenido archivado. |
| ARCHITECTURE_MILESTONE_v2.0.md | Sí | Reemplazado por v3.0. Sin referencias activas. |
| ael/contracts/CONTRACTS.md (REDIRECT) | Depende | Es un redirect intencional. Puede eliminarse si se actualizan los scripts que lo referencian. |

### 11.3 Documentos que NO pueden eliminarse

| Documento | Razón |
|-----------|-------|
| FBS | Contiene ~800 líneas de especificación detallada no absorbible en CONST. |
| CDA | Contiene ~500 líneas de algoritmo detallado no absorbible en CONST. |
| ARCHITECTURE_STATUS.md | Documento de estado arquitectónico vigente. |
| ADRs | Registros de decisiones. Deben preservarse como trazabilidad. |

---

## 12. Execution Sequence

### 12.1 Fase A: Migración (P0)

| Paso | Acción | Documentos | Dependencia | Esfuerzo |
|------|--------|------------|-------------|----------|
| A-01 | Incorporar 13 invariantes faltantes a CONST | CONST, FBS, CDA | — | 1h |
| A-02 | Incorporar 6 RFs de FBS a CONST | CONST, FBS | A-01 | 2h |
| A-03 | Incorporar principio rector y jerarquía CDA a CONST | CONST, CDA | A-01 | 1h |
| A-04 | Incorporar reglas de merge y conflicto a CONST | CONST, CDA | A-03 | 45m |
| A-05 | Actualizar ADR-013 jerarquía | ADR-013 | A-01 | 30m |

### 12.2 Fase B: Restructuración (P1)

| Paso | Acción | Documentos | Dependencia | Esfuerzo |
|------|--------|------------|-------------|----------|
| B-01 | Migrar contenido SYSTEM_BIBLE a CONST | SYSTEM_BIBLE, CONST | A-01 | 1h |
| B-02 | Restructurar SYSTEM_BIBLE como onboarding | SYSTEM_BIBLE | B-01 | 30m |
| B-03 | Restructurar FBS (header + subordinación) | FBS | A-01, A-02 | 1h |
| B-04 | Restructurar CDA (header + subordinación) | CDA | A-03 | 30m |
| B-05 | Actualizar ADR_INDEX | ADR_INDEX | A-05 | 30m |
| B-06 | Actualizar ARCHITECTURE_STATUS §12 | ARCHITECTURE_STATUS | A-01..A-05 | 30m |
| B-07 | Actualizar docs/ai/ Context Pack | docs/ai/ (7 docs) | A-01 | 1h |
| B-08 | Migrar principio ADR-012 a CONST | ADR-012, CONST | — | 15m |

### 12.3 Fase C: Archive (P2)

| Paso | Acción | Documentos | Dependencia | Esfuerzo |
|------|--------|------------|-------------|----------|
| C-01 | Archivar PR-7/8/9/10 (27 docs) | `docs/architecture/PR-*` | — | 30m |
| C-02 | Archivar milestones v2.0 y Freeze V1 (2 docs) | ARCHITECTURE_MILESTONE_v2.0, DEVELOPMENT_ECOSYSTEM_ARCHITECTURE | — | 10m |
| C-03 | Archivar docs/history/ (8 docs) | `docs/history/` | — | 10m |
| C-04 | Archivar ael/artifacts/ DRAFTs (~10 docs) | `ael/artifacts/` (selectivo) | — | 20m |
| C-05 | Revisar y archivar docs/certification/ (~40 docs) | `docs/certification/` | — | 1h |

### 12.4 Fase D: Eliminación (P2)

| Paso | Acción | Documentos | Dependencia | Esfuerzo |
|------|--------|------------|-------------|----------|
| D-01 | Eliminar SYSTEM_BIBLE §6 y §4 (después de migración) | SYSTEM_BIBLE | B-01 | 5m |
| D-02 | Eliminar DEVELOPMENT_ECOSYSTEM_ARCHITECTURE.md (después de archive) | — | C-02 | 5m |
| D-03 | Evaluar eliminación de ael/contracts/CONTRACTS.md (redirect) | ael/contracts/CONTRACTS.md | — | 15m |

### 12.5 Fase E: Actualización de índices (P2-P3)

| Paso | Acción | Documentos | Dependencia | Esfuerzo |
|------|--------|------------|-------------|----------|
| E-01 | Actualizar KNOWLEDGE_INVENTORY.md | KNOWLEDGE_INVENTORY | A-D | 30m |
| E-02 | Actualizar DOCUMENT_INVENTORY.md | DOCUMENT_INVENTORY (CGP-0) | A-D | 30m |
| E-03 | Actualizar README.md | README | A-D | 15m |

---

> **Fin de DOCUMENT_DEPRECATION_PLAN.md — Listo para CGP-1 Phase 4.**
>
> 46 documentos/grupos planificados. 12 fases de ejecución en 5 grupos (A-E).
> Esfuerzo total estimado: ~12 horas.
> Ninguna decisión pendiente. El plan puede ejecutarse secuencialmente.
> La seguridad del conocimiento está garantizada por la matriz de absorción previa.
