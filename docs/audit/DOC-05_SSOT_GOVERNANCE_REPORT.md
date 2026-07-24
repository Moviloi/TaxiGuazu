# DOC-05 SSOT GOVERNANCE REPORT

> **Misión:** DOC-05 — SSOT Governance Resolution  
> **Ejecutor:** BUILD (AEL)  
> **Fecha:** 2026-07-22  
> **Objetivo:** Analizar 7 documentos clave del ecosistema AITOS, determinar su jerarquía definitiva, resolver solapamientos de autoridad, y proponer la estructura documental canónica.  
> **Restricción:** 0 archivos modificados. 0 archivos creados. 0 archivos renombrados.  
> **Basado en:** DOC-04 SSOT Authority Report, lectura directa de los 7 documentos objetivo.

---

## 1. Resumen ejecutivo

Se analizaron los 7 documentos que concentran los conflictos de autoridad detectados en DOC-04. El ecosistema documental de AITOS sufre de **un problema de clasificación ontológica**: no existe una declaración explícita de qué documentos son normativos vs descriptivos, ni una separación formal entre dominio de producto y dominio de desarrollo.

**Diagnóstico principal:** No hay un conflicto real de autoridad entre los documentos —hay un **conflicto de nombres y roles no declarados**. Cada documento cumple una función legítima, pero ninguna declaración cruzada explicita la relación entre ellos.

**Hallazgo clave:** El sistema tiene DOS documentos "Constitución" que gobiernan dominios distintos (producto: `AITOS_CONSTITUTION.md`, proceso: `AEL SPEC.md`). No hay conflicto real porque ORGANIZATION.md define la separación, pero **ninguna de las dos constituciones referencia a la otra**, creando la apariencia de duplicidad.

**Resumen de resoluciones:**

| Documento | Autoridad actual | Autoridad propuesta | Cambio |
|-----------|-----------------|---------------------|--------|
| AITOS_CONSTITUTION.md | Suprema normativa (producto) | L0 Producto — mantener | +referencia a AEL SPEC |
| AEL SPEC.md | Suprema normativa (proceso) | L0 Proceso — mantener | +referencia a AITOS_CONSTITUTION |
| GOVERNANCE.md | Normativa (documentación) | L1 — mantener | corregir ejemplo SSOT de SYSTEM_BIBLE |
| SYSTEM_BIBLE.md | Contradictoria: "no normativo" vs SSOT asignado | L3 — onboarding descriptivo | perder SSOT; no es normativo |
| ARCHITECTURE_STATUS.md | Canónico estado arquitectónico | L3 — mantener | clarificar que describe, no prescribe |
| PROJECT_CONTEXT.md | Explícitamente NO SSOT | L4 — mantener | ✅ Correcto |
| strategy-decision.md | Auto-declarado "SSOT" | L3 — describir implementación | eliminar reclamo SSOT; referenciar ADR-008 |

---

## 2. Análisis por documento

### 2.1 AITOS_CONSTITUTION.md — docs/architecture/AITOS_CONSTITUTION.md (616 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Producto — comportamiento y principios del sistema AITOS |
| **Naturaleza** | **Normativo** — prescribe 118 disposiciones vinculantes |
| **Auto-declaración** | "máxima autoridad normativa del sistema" (header, §1.3, línea 616) |
| **Jerarquía interna** | §1.4 define 9 niveles: Constitución → CC → RF → RNF → Reglas → Heurísticas → Invariantes → Contratos → Implementación |
| **SSOT para** | Todo el comportamiento del producto. Identidad del sistema (§1.6). Principios constitucionales (PC-01 a PC-06). Constituciones cognitivas (CC-01 a CC-17). Requerimientos funcionales y no funcionales. |
| **Referencia a otros docs** | Contiene referencias a ADR-001, ADR-002, ADR-005, ADR-009, ADR-012, ADR-013, ADR-014 en su CTM mapeo |
| **Referencia a AEL SPEC** | ❌ **Ausente** — No menciona AEL SPEC, ARNÉS, ni el ecosistema de desarrollo |
| **Estabilidad** | Explícitamente diseñada para ser estable (PC-03: estabilidad conceptual) |
| **Evaluación** | Correctamente posicionada como L0. No debe modificarse en esta misión. Única ausencia: referencia a AEL SPEC como autoridad del proceso de desarrollo. |

### 2.2 AEL SPEC.md — ael/constitution/SPEC.md (244 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Ecosistema de desarrollo — proceso operacional del equipo |
| **Naturaleza** | **Normativo** — prescribe invariantes I1-I6, lifecycle L1-L4, contratos de capacidades |
| **Auto-declaración** | "Constitution of ARNÉS" (header). "Esta especificación define restricciones, no procesos." |
| **Jerarquía interna** | Implícita: Director soberano dentro del Execution Plan. Invariantes (6) + Lifecycle (4) + Capabilities (7) + Principles (6) |
| **SSOT para** | Proceso de desarrollo: cómo BUILD ejecuta misiones. Validación (I1), Justificación (I2), Trazabilidad (I3), Integridad arquitectónica (I4), Preservación de conocimiento (I5), No-regresión (I6). |
| **Referencia a otros docs** | ORGANIZATION.md (gobierno), roles/ (contratos de capacidades), enforce.sh |
| **Referencia a AITOS_CONSTITUTION** | ❌ **Ausente** — No menciona la Constitución del producto ni cómo se relaciona con ella |
| **Relación resuelta en** | ORGANIZATION.md §"Relación con la Constitución de AITOS" — pero esto es un documento externo, no la SPEC misma |
| **Evaluación** | Correctamente posicionada como L0 en su dominio (proceso). Debe agregar referencia a AITOS_CONSTITUTION.md para que cualquier lector entienda que gobierna el proceso, no el producto. |

### 2.3 GOVERNANCE.md — docs/architecture/GOVERNANCE.md (628 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Ecosistema de desarrollo — gobernanza documental |
| **Naturaleza** | **Normativo** — prescribe naming conventions, taxonomía documental (15 tipos, 6 tiers), workflows, regla SSOT |
| **Auto-declaración** | "Rules for keeping the architecture documentation accurate, consistent, and alive. This document is the contract between the architecture team and everyone who edits documentation." |
| **Jerarquía** | Tier 1 (Cross-cutting Constitutional) según su propia taxonomía |
| **SSOT para** | Reglas de documentación: cómo se nombran archivos, cómo se clasifican, cómo se actualizan, qué es SSOT |
| **Contradicción detectada** | **C-SSOT-2**: Rule 4 (SSOT) lista `docs/SYSTEM_BIBLE.md → Fuente única de misión/alcance`, pero SYSTEM_BIBLE.md explícitamente dice no ser normativo. La taxonomía (§Type definitions) lista SYSTEM_BIBLE.md como ejemplo de "Constitution" (Tier 0), lo que agrava la contradicción. |
| **Evaluación** | Documento normativo correcto en su dominio. El problema es la **asignación incorrecta** de SYSTEM_BIBLE.md como Constitution example y como SSOT. No es un problema de GOVERNANCE.md en sí, sino del ejemplo usado. |

### 2.4 SYSTEM_BIBLE.md — docs/SYSTEM_BIBLE.md (194 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Producto — onboarding contextual |
| **Naturaleza** | **Descriptivo** — describe el sistema en lenguaje simple para nuevos miembros |
| **Auto-declaración** | "Este documento es una introducción contextual. **No es un documento normativo.** La autoridad normativa del sistema es la Constitución de AITOS." (líneas 3-6). "Authority: source code, ADRs, and operational reality" (línea 194). |
| **SSOT actual** | Nada (según sí mismo). SSOT de misión/alcance (según GOVERNANCE.md). |
| **Contenido** | §1-4: qué es AITOS (descripción general). §5: modelo operacional (slots). §6: jerarquía de autoridad. §7: cómo decide el sistema. §8: degradación graceful. §9: alcance (in/out). §10: principios de evolución. §11: orden de lectura. |
| **Estado de actualización** | ❌ **Stale** — última actualización 2026-07-06. No menciona CDA, ADR-013, ADR-014, BKE/DRL removal, SDL 2.0, ni Interface Freeze V2. |
| **Evaluación** | Documento útil como onboarding ligero. **No debe ser SSOT.** Su función es presentar el sistema a nuevos miembros, no ser autoridad normativa. El stale date es coherente con su rol — no necesita actualización constante si no pretende ser SSOT. |

### 2.5 ARCHITECTURE_STATUS.md — docs/architecture/ARCHITECTURE_STATUS.md (640 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Producto — estado arquitectónico |
| **Naturaleza** | **Descriptivo** — documenta el estado actual de la arquitectura |
| **Auto-declaración** | "Documento canónico del estado arquitectónico real del proyecto. Fuente única de verdad para entender qué existe, qué está aprobado, qué permanece como diseño." |
| **SSOT para** | Estado arquitectónico actual — **describe** lo que existe, no prescribe lo que debe existir |
| **Contenido** | 15 secciones: pipeline real, ADR inventory, componentes, decisiones irreversibles, arquitectura futura, riesgos, deuda, roadmap, milestones |
| **Evaluación** | Correctamente posicionado. La frase "Fuente única de verdad" es correcta en el contexto descriptivo ("única fuente para saber qué existe"). No prescribe normas — las referencias desde documentos normativos. **Clave**: es el documento que SYSTEM_BIBLE.md debería referenciar para "estado actual del sistema". |

### 2.6 PROJECT_CONTEXT.md — docs/project/PROJECT_CONTEXT.md (391 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Proyecto — gestión de estado |
| **Naturaleza** | **Descriptivo** — condensa el estado del proyecto desde fuentes autoritativas |
| **Auto-declaración** | "Estado vigente condensado del proyecto. **Este documento NO reemplaza ADR, SPEC, RF, RNF, Baseline, Architecture, Knowledge ni Changelog.** Lo condensa para referencia rápida." (líneas 3-6). |
| **SSOT para** | ❌ Explícitamente NADA — se declara como condensación, no fuente. |
| **Tabla de SSOTs (§14)** | Define explícitamente qué documento es la fuente de verdad para cada tipo de información (ARCHITECTURE_STATUS.md para arquitectura, ADRs para decisiones, ROADMAP.md para roadmap, etc.) |
| **Evaluación** | ✅ **Ejemplo de buena práctica.** Es el único documento de los 7 que declara explícitamente NO ser SSOT y referencia a los documentos fuente. Este patrón debería ser el modelo para SYSTEM_BIBLE.md. |

### 2.7 strategy-decision.md — docs/architecture/strategy-decision.md (281 líneas)

| Atributo | Valor |
|----------|-------|
| **Dominio** | Producto — implementación técnica de StrategyDecision |
| **Naturaleza** | **Descriptivo** — documenta la estructura, ciclo de vida y consumo de StrategyDecision |
| **Auto-declaración** | "Única fuente de verdad para todas las decisiones estratégicas conversacionales." (línea 3). "Authority: ADR-008, src/lib/ai/conversation-strategy.ts, src/lib/ai/types.ts" (línea 281). |
| **SSOT actual** | Se auto-declara "SSOT" para decisiones estratégicas conversacionales |
| **Contenido** | §1-3: propósito y creación. §4: estructura TypeScript. §5: propagación. §6: consumo. §7: lógica de decisión. §8: ownership (ADR-008). §9: evolución futura. |
| **Evaluación** | El documento describe correctamente la implementación de StrategyDecision. **Problema de naming**: "Única fuente de verdad" es una frase con connotación de autoridad normativa, pero el documento es una guía técnica de implementación. **El SSOT real para decisiones estratégicas es ADR-008 + el código fuente.** La intención correcta es: "Única fuente de referencia para entender cómo funciona StrategyDecision en el código." |

---

## 3. Conflictos actuales

### C-SSOT-1: Dos Constituciones sin referencia mutua (🟡 Medio)

| Documento | Afirmación | ¿Qué falta? |
|-----------|-----------|-------------|
| AITOS_CONSTITUTION.md | "máxima autoridad normativa del sistema" | ❌ No menciona AEL SPEC |
| AEL SPEC.md | "Constitution of ARNÉS" | ❌ No menciona AITOS_CONSTITUTION |
| ORGANIZATION.md (externo) | "AITOS_CONSTITUTION define principios del producto. AEL SPEC define el proceso de desarrollo." | ✅ Resuelto, pero externo a ambos |

**Naturaleza:** No es un conflicto de autoridad — es un **conflicto de omisión**. Ambos documentos gobiernan dominios diferentes (producto vs proceso) y ambos son supremos en su dominio. Pero al no referenciarse mutuamente, un lector de cualquiera de ellos no sabrá que el otro existe.

**Resolución propuesta:** No cambiar jerarquía. Agregar referencia mutua en futura misión de edición.

**Riesgo actual:** Bajo — ORGANIZATION.md resuelve la relación. El riesgo es de descubrimiento (un lector de AITOS_CONSTITUTION no sabe que existe AEL SPEC).

---

### C-SSOT-2: SYSTEM_BIBLE.md — autoridad contradictoria (🟡 Medio)

| Fuente | Afirmación |
|--------|-----------|
| SYSTEM_BIBLE.md (línea 4) | "No es un documento normativo." |
| SYSTEM_BIBLE.md (línea 194) | "Authority: source code, ADRs, and operational reality" |
| GOVERNANCE.md (Taxonomía) | Lista SYSTEM_BIBLE.md como ejemplo de "Constitution" Tier 0 |
| GOVERNANCE.md (Rule 4) | "docs/SYSTEM_BIBLE.md → Fuente única de misión/alcance" |

**Naturaleza:** Contradicción directa. Un documento no puede ser simultáneamente "no normativo" y "SSOT para misión/alcance".

**Resolución propuesta:** SYSTEM_BIBLE.md **pierde** el estatus SSOT. Su función real es onboarding contextual (L3 descriptivo). La función de "misión/alcance" debe ser absorbida por AITOS_CONSTITUTION.md (§1.6 ya define identidad del sistema) y ARCHITECTURE_STATUS.md (describe el estado real).

---

### C-SSOT-3: Múltiples descripciones de "qué es AITOS" (🟢 Bajo)

| Documento | Nivel | Función |
|-----------|-------|---------|
| AITOS_CONSTITUTION.md §1.6 | L0 | Identidad normativa del sistema |
| ARCHITECTURE_STATUS.md §1 | L3 | Estado real del sistema |
| SYSTEM_BIBLE.md §1-4 | L3 | Onboarding contextual |
| ARCHITECTURE_BIBLE.md §1 | L2 | Referencia técnica derivada |

**Naturaleza:** No es un conflicto — son **diferentes niveles de abstracción** del mismo concepto. El problema es que no se explicita que cada uno describe a AITOS desde su nivel de autoridad.

**Resolución propuesta:** No eliminar ningún documento. Cada uno es válido en su nivel. SYSTEM_BIBLE.md debe referenciar a ARCHITECTURE_STATUS.md y AITOS_CONSTITUTION.md como fuentes autoritativas.

---

### C-SSOT-4: strategy-decision.md reclama "SSOT" sin autoridad (🟢 Bajo)

| Afirmación | Problema |
|-----------|----------|
| "Única fuente de verdad para todas las decisiones estratégicas conversacionales" | La frase "fuente de verdad" implica autoridad normativa, pero el documento describe implementación. |
| "Authority: ADR-008, src/lib/ai/conversation-strategy.ts, src/lib/ai/types.ts" | Correcto — las autoridades son ADR-008 y el código, no este documento. |

**Naturaleza:** Problema de naming. El documento es una excelente referencia técnica. La frase "Única fuente de verdad" debe calificarse: es la fuente de referencia para la **implementación**, no para la **autoridad arquitectónica**.

**Resolución propuesta:** Cambiar el header a "Reference implementation of StrategyDecision (see ADR-008 for architectural authority)" y eliminar la reclamación "SSOT".

---

## 4. Jerarquía recomendada

### Principio rector

> **El ecosistema documental de AITOS se organiza en dos planos ortogonales:**
> 1. **Plano de producto** — todo lo que describe el sistema AITOS (comportamiento, arquitectura, estado)
> 2. **Plano de desarrollo** — todo lo que describe cómo se construye y gobierna AITOS (proceso, gobernanza, proyecto)
>
> **Cada plano tiene su propia Constitución L0.** Ambos planos son igualmente vinculantes en su dominio. Ningún documento de un plano puede contradecir al otro plano porque gobiernan dominios diferentes.

---

### L0 — Constitución (normativo, supremo en su dominio)

| Documento | Plano | SSOT para |
|-----------|-------|-----------|
| **AITOS_CONSTITUTION.md** | Producto | Comportamiento del sistema, principios constitucionales, constituciones cognitivas, RF, RNF, invariantes, contratos de producto |
| **AEL SPEC.md** | Desarrollo | Invariantes I1-I6, lifecycle L1-L4, capacidades, principios operacionales |

**Regla:** Ningún documento L0 puede contradecir al otro — pero como gobiernan dominios distintos, la contradicción no debería ocurrir. Si ocurriera (ej: una regla de proceso que exige violar un principio de producto), prevalece AITOS_CONSTITUTION.md porque el producto es el fin, el proceso es el medio.

**Acción requerida:** Ambos documentos deben referenciarse mutuamente en sus headers.

---

### L1 — Ejecutivo / Normativo (normativo, derivado de L0)

| Documento | Plano | SSOT para |
|-----------|-------|-----------|
| **GOVERNANCE.md** | Desarrollo | Reglas de documentación: naming, taxonomía, workflows, SSOT |
| **AEL CONTRACTS.md** | Desarrollo | Reglas R1-R4 de enforcement entre capas |
| **AEL ORGANIZATION.md** | Desarrollo | Roles, capacidades, autoridad, doctrina |
| **AEL roles/*.md** (6) | Desarrollo | Contratos de cada capability |
| **CDA** (CONVERSATION_DECISION_ALGORITHM.md) | Producto | Algoritmo de decisión conversacional — autoridad funcional normativa |
| **FUNCTIONAL_BEHAVIOR_SPECIFICATION.md** | Producto | Especificación de comportamiento funcional |

**Regla:** Documentos L1 implementan o detallan mandatos de L0. No pueden contradecir L0.

---

### L2 — Gobierno / Arquitectura (mixto: normativo + descriptivo)

| Documento | Plano | Naturaleza |
|-----------|-------|------------|
| **ADRs (001-014)** | Producto | Decisiones arquitectónicas registradas (normativo en su ámbito) |
| **ARCHITECTURE_BIBLE.md** | Producto | Referencia técnica derivada (descriptivo con valor normativo para agents) |
| **INTERFACE_FREEZE_V2.md** | Desarrollo | Contrato congelado de interfaces (normativo) |
| **STRATEGIC_OPERATIONAL_CONTRACT.md** | Desarrollo | Contrato PLAN↔BUILD (normativo) |
| **BASELINE_1_0.md** | Desarrollo | Baseline certificada del proyecto (descriptivo de estado certificado) |

**Regla:** ADRs pueden modificar ADRs previos (ej: ADR-014 modifica ADR-012). Ningún L2 puede contradecir L1 o L0.

---

### L3 — Especificaciones / Descripción arquitectónica (descriptivo)

| Documento | Plano | SSOT para |
|-----------|-------|-----------|
| **ARCHITECTURE_STATUS.md** | Producto | **Estado arquitectónico actual** — describe, no prescribe |
| **SYSTEM_BIBLE.md** | Producto | ❌ **PIERDE SSOT** — onboarding contextual, no normativo |
| **strategy-decision.md** | Producto | ❌ **PIERDE reclamo SSOT** — referencia de implementación de StrategyDecision |
| **Architecture description docs** (*.md en docs/architecture/) | Producto | Descripciones detalladas de componentes, dominios, pipelines |
| **docs/knowledge/*.md** | Producto | Reglas de negocio operacionales |
| **glossary.md** | Producto | Terminología canónica |
| **ARCHITECTURE_BIBLE.md** | Producto | (dualista: L2 por su uso normativo por agents, L3 como descripción) |

**Regla:** Documentos L3 describen el estado actual del sistema. No crean normas. Si un L3 contradice un L2 o superior, el L3 debe actualizarse (describe mal) o el L2 debe crear un ADR de corrección.

---

### L4 — Proyecto / Evidencia (descriptivo, time-bound)

| Documento | Plano | SSOT para |
|-----------|-------|-----------|
| **PROJECT_CONTEXT.md** | Desarrollo | ❌ No es SSOT — condensación ✅ Correcto |
| **PROJECT_BOARD.md** | Desarrollo | Estado de tareas y prioridades |
| **CHANGELOG.md** | Desarrollo | Timeline histórico de cambios |
| **ROADMAP.md** | Desarrollo | Hitos y dirección |
| **Audits, certifications, incidents** | Ambos | Evidencia de calidad, hallazgos, incidentes |

**Regla:** Documentos L4 registran evidencia puntual. No son normativos. Su valor es histórico y de trazabilidad.

---

### L5 — Histórico / Archivo

| Documento | SSOT para |
|-----------|-----------|
| CE-3A, CE-3B, CE-4, CE-5 (con banners) | Nada — preservación histórica |
| DUAL_INTERFACE_ARCHITECTURE.md | Nada — SUPERSEDED |
| ael/archive/** | Nada — archivado |

---

### Mapa visual de la jerarquía

```
PLANO PRODUCTO                        PLANO DESARROLLO
══════════════════                    ══════════════════
L0  AITOS_CONSTITUTION.md     ↔      L0  AEL SPEC.md
    (comportamiento sistema)           (proceso desarrollo)
            ↕                                  ↕
L1  CDA, FBS                       L1  GOVERNANCE.md, CONTRACTS,
    (autoridad funcional)               ORGANIZATION, roles
            ↕                                  ↕
L2  ADR-001..014                   L2  INTERFACE_FREEZE_V2,
    (decisiones arquitectónicas)        STRATEGIC_OPERATIONAL_CONTRACT,
        ↕                                  BASELINE_1_0
L3  ARCHITECTURE_STATUS.md,         L3  (ninguno en este plano)
    SYSTEM_BIBLE.md (onboarding),
    strategy-decision.md,
    descripciones arquitectónicas
            ↕
L4  (certificaciones,              L4  PROJECT_CONTEXT.md,
     incidents)                         PROJECT_BOARD.md,
    ←─ Ambos planos ─→                  CHANGELOG.md, ROADMAP.md,
                                         auditorías

L5  Ambos planos: archivo histórico
```

---

## 5. Reglas de autoridad documental

Basado en el análisis anterior, se proponen las siguientes reglas para gobernar la jerarquía:

### Regla A-01: Dualidad de planos

> El ecosistema documental de AITOS consta de dos planos ortogonales: **Producto** (todo lo que el sistema hace) y **Desarrollo** (cómo se construye y gobierna). Cada plano tiene su propia constitución L0. Ningún documento puede cruzar planos sin declarar explícitamente su afiliación.

### Regla A-02: Supremacía del producto sobre el proceso

> En caso de conflicto entre un documento del plano de producto y uno del plano de desarrollo, prevalece el documento de producto. El fin (el sistema AITOS funcionando correctamente) justifica los medios (el proceso de desarrollo), no al revés.

### Regla A-03: Normativo vs descriptivo

> Todo documento debe declarar si es **normativo** (prescribe reglas vinculantes) o **descriptivo** (describe estado, implementación o contexto). Un documento descriptivo no puede ser SSOT de autoridad normativa. Un documento normativo no puede delegar su autoridad en uno descriptivo.

### Regla A-04: Un solo SSOT por concepto

> Cada concepto arquitectónico o funcional tiene exactamente un documento SSOT (fuente única de verdad). Los SSOT son siempre normativos (L0-L2). Los documentos descriptivos (L3-L5) referencian al SSOT sin pretender reemplazarlo.

### Regla A-05: Prohibición de "SSOT" en documentos descriptivos

> Ningún documento L3 o inferior puede auto-declararse "SSOT", "fuente única de verdad", "canónico" o cualquier término que implique autoridad normativa. Estos términos están reservados para L0-L2.

### Regla A-06: Referencia cruzada entre documentos del mismo nivel

> Dos documentos L0 del mismo ecosistema deben referenciarse mutuamente. Si AITOS_CONSTITUTION.md y AEL SPEC.md son ambos L0, cada uno debe mencionar al otro y definir su relación.

### Regla A-07: La Constitución no describe implementación

> La Constitución del producto (AITOS_CONSTITUTION.md) describe comportamiento esperado, no implementación. Cualquier documento que describa implementación (strategy-decision.md, ARCHITECTURE_STATUS.md, etc.) está en L3, no en L0.

---

## 6. Cambios necesarios posteriormente

> ⚠️ **ADVERTENCIA:** Estos cambios son **recomendaciones para futuras misiones de edición**. En esta misión DOC-05 no se modifica ningún archivo.

### P1 — Cambios críticos (resuelven contradicciones)

| # | Documento | Cambio | Ref. |
|---|-----------|--------|------|
| 1 | `AITOS_CONSTITUTION.md` | Agregar en el header (después de la tabla metadata): "El proceso de desarrollo se rige por AEL SPEC (`ael/constitution/SPEC.md`)." | C-SSOT-1 |
| 2 | `AEL SPEC.md` | Agregar en el header: "Las decisiones de producto se rigen por AITOS CONSTITUTION (`docs/architecture/AITOS_CONSTITUTION.md`)." | C-SSOT-1 |
| 3 | `GOVERNANCE.md` | En la taxonomía (§Type definitions → Constitution → Real examples), reemplazar `docs/SYSTEM_BIBLE.md` por `docs/architecture/AITOS_CONSTITUTION.md`. En Rule 4 example, reemplazar SYSTEM_BIBLE.md por AITOS_CONSTITUTION.md como SSOT de misión/alcance. | C-SSOT-2 |
| 4 | `SYSTEM_BIBLE.md` | Agregar referencia a ARCHITECTURE_STATUS.md como "fuente autorizada para el estado actual del sistema". Mantener "no normativo". No modificar contenido sustantivo. | C-SSOT-2, C-SSOT-3 |

### P2 — Cambios de clarificación

| # | Documento | Cambio | Ref. |
|---|-----------|--------|------|
| 5 | `strategy-decision.md` | Reemplazar header: "Única fuente de verdad para todas las decisiones estratégicas conversacionales" → "Reference implementation of StrategyDecision (see ADR-008 for architectural authority)." | C-SSOT-4 |
| 6 | `ARCHITECTURE_STATUS.md` | Agregar nota: "Este documento describe el estado actual de la arquitectura. No prescribe diseño futuro. Para decisiones arquitectónicas, ver ADRs correspondientes." | Clarificación |
| 7 | `PROJECT_CONTEXT.md` | (Ninguno — es el único documento que ya hace todo correctamente) ✅ | — |

### P3 — Actualización de contenido stale

| # | Documento | Cambio | Ref. |
|---|-----------|--------|------|
| 8 | `SYSTEM_BIBLE.md` | Actualizar contenido para reflejar CDA, ADR-014, SDL 2.0 — o aceptar que es un onboarding ligero y stale es aceptable. | DOC-01 R-03 |
| 9 | `docs/architecture/ADR_INDEX.md` | Agregar nota de jerarquía: "Los ADRs están en L2 de la jerarquía documental — subordinados a AITOS_CONSTITUTION.md (L0) y CDA (L1)." | Jerarquía |

---

## 7. Riesgos si no se corrige

### 🔴 R-01: Confusión de nuevos miembros (Alto)

Un nuevo integrante que lea AITOS_CONSTITUTION.md no sabrá que existe AEL SPEC.md y viceversa. Puede actuar violando invariantes operacionales (I1-I6) sin saberlo, o puede violar principios constitucionales del producto sin entender que existen.

**Probabilidad:** Alta (todo nuevo integrante lee al menos una constitución)  
**Impacto:** Medio (la violación sería detectada por enforce.sh o por revisión)  

### 🟡 R-02: SSOT incorrecto para misión/alcance (Medio)

Un lector de GOVERNANCE.md asumirá que SYSTEM_BIBLE.md es la fuente autorizada para misión/alcance. Como SYSTEM_BIBLE.md está stale (2026-07-06, antes de CDA, ADR-014, SDL 2.0), obtendrá información incorrecta. Si además SYSTEM_BIBLE.md dice "no soy normativo", el lector quedará confundido sobre a quién creer.

**Probabilidad:** Media (solo si alguien lee GOVERNANCE.md Rule 4 + SYSTEM_BIBLE.md)  
**Impacto:** Medio (información desactualizada sobre el sistema)  

### 🟡 R-03: strategy-decision.md usado como autoridad normativa (Medio)

Un desarrollador que lea "Única fuente de verdad" en strategy-decision.md puede usarlo como autoridad arquitectónica en lugar de ADR-008. Si el código cambia y strategy-decision.md no se actualiza, el desarrollador puede resistirse al cambio argumentando "pero el documento dice ser la fuente de verdad".

**Probabilidad:** Baja (el documento se actualiza con cada fase R1-R5)  
**Impacto:** Medio (puede ralentizar cambios)  

### 🟢 R-04: Inflación del término "SSOT" (Bajo)

El uso no controlado de "SSOT", "fuente única de verdad", "canónico" en documentos de diferentes niveles diluye el significado del término. Si 4 documentos se llaman "SSOT" para conceptos diferentes, el término pierde valor.

**Probabilidad:** Alta (ya hay 4 documentos con reclamos similares)  
**Impacto:** Bajo (confusión terminológica, no funcional)  

### 🟢 R-05: Percepción de duplicidad constitucional (Bajo)

Si el ecosistema es auditado externamente, la existencia de dos "Constituciones" sin referencia mutua puede interpretarse como duplicidad o falta de claridad en la gobernanza.

**Probabilidad:** Baja (auditoría externa poco probable)  
**Impacto:** Bajo (percepción, no funcionalidad)  

---

## Apéndice A: Cuadro resumen de los 7 documentos

| Documento | Dominio | Naturaleza | L0-L5 | SSOT para | ¿Tiene reclamos incorrectos? | Acción |
|-----------|---------|-----------|-------|-----------|------------------------------|--------|
| AITOS_CONSTITUTION.md | Producto | Normativo | **L0** | Comportamiento del sistema | Falta referencia a AEL SPEC | +referencia mutua |
| AEL SPEC.md | Desarrollo | Normativo | **L0** | Proceso de desarrollo | Falta referencia a AITOS_CONSTITUTION | +referencia mutua |
| GOVERNANCE.md | Desarrollo | Normativo | **L1** | Gobernanza documental | Ejemplo incorrecto: SYSTEM_BIBLE como Constitution | corregir ejemplo |
| SYSTEM_BIBLE.md | Producto | Descriptivo | **L3** | ❌ Debería: nada | SSOT asignado incorrectamente | perder SSOT |
| ARCHITECTURE_STATUS.md | Producto | Descriptivo | **L3** | Estado arquitectónico | "Fuente única de verdad" aceptable si es descriptiva | clarificar en header |
| PROJECT_CONTEXT.md | Desarrollo | Descriptivo | **L4** | ❌ Explícitamente nada | ✅ Ninguno | ✅ mantener |
| strategy-decision.md | Producto | Descriptivo | **L3** | Implementación SD | "Única fuente de verdad" inapropiado | eliminar reclamo SSOT |

---

## Apéndice B: Mapa de referencias

### Estado actual (con omisiones)

```
AITOS_CONSTITUTION.md ───────────→ (referencia a ADRs, FBS)     
    │                               
    │  ❌ No referencia a AEL SPEC  
    │
AEL SPEC.md ───────────────────→ (referencia a ORGANIZATION, roles)
    │
    │  ❌ No referencia a AITOS_CONSTITUTION
    │
GOVERNANCE.md ────────────────→ (asigna SYSTEM_BIBLE como SSOT ❌)
    │
SYSTEM_BIBLE.md ─────────────→ "No normativo" ≠ SSOT asignado ❌
    │
ARCHITECTURE_STATUS.md ───────→ (descriptive state, references ADRs)
    │
PROJECT_CONTEXT.md ───────────→ ✅ Referencia explícita a sus SSOTs
    │
strategy-decision.md ─────────→ "Authority: ADR-008" ✅ pero "SSOT" ❌
```

### Estado deseado

```
AITOS_CONSTITUTION.md ←──referencia mutua──→ AEL SPEC.md
    │                                            │
    ↓ (hereda autoridad)                        ↓ (hereda autoridad)
L1: CDA, FBS                              L1: GOVERNANCE.md, CONTRACTS
    ↓                                            ↓
L2: ADR-001..014                          L2: Freezes, Contratos
    ↓                                            │
L3: ARCHITECTURE_STATUS.md (describe)           │
    SYSTEM_BIBLE.md → refiere a ARCH_STATUS     │
    strategy-decision.md → "see ADR-008"        │
    descripciones técnicas                       │
    ↓                                            ↓
L4: PROJECT_CONTEXT.md (referencia a L3 L2 L1 L0, no duplica)
```

---

*Reporte generado por BUILD como parte de la misión DOC-05.*  
*7 documentos analizados. 4 conflictos evaluados. 5 niveles de jerarquía propuestos. 7 reglas de autoridad definidas. 9 cambios recomendados para futura ejecución.*  
*0 archivos modificados, 0 archivos creados, 0 archivos renombrados.*
