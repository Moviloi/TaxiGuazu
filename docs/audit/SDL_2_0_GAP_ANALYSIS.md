# SDL 2.0 — Implementation Gap Analysis

> **Tipo:** Auditoría de brecha entre especificación e implementación  
> **Estado:** COMPLETE (no modificar archivos, no implementar cambios)  
> **Fecha:** 2026-07-22  
> **Artefacto de referencia:** `docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md`  
> **Implementación actual:** `.opencode/agents/plan.md` + `opencode.json` (agente `plan`)  
> **Régimen:** AITOS Baseline 1.0 | AELC  
> **Objetivo:** Determinar exactamente qué capacidades ya existen, cuáles requieren ajustes y cuáles aún no están implementadas.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura auditada](#2-arquitectura-auditada)
3. [Auditoría de capacidades](#3-auditoría-de-capacidades)
4. [Análisis transversal](#4-análisis-transversal)
5. [Matriz de gaps](#5-matriz-de-gaps)
6. [Plan de implementación recomendado](#6-plan-de-implementación-recomendado)
7. [Matriz final](#7-matriz-final)
8. [Conclusión ejecutiva](#8-conclusión-ejecutiva)

---

## 1. Resumen ejecutivo

Se auditó la implementación actual del **Strategic Director** (agente `plan`, archivo `.opencode/agents/plan.md`) contra la especificación **SDL 2.0 Strategic Decision Framework (SDF)** (`docs/architecture/SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md`).

### Estado general

| Métrica | Valor |
|---------|-------|
| Capacidades auditadas | 13 |
| ✅ **IMPLEMENTED** | 2 (15%) |
| 🟡 **PARTIAL** | 4 (31%) |
| ❌ **MISSING** | 7 (54%) |
| 📌 **NOT APPLICABLE** | 0 (0%) |

### Hallazgos principales

1. **La implementación actual es SDL v1.0** — captura análisis estratégico básico y producción de Execution Plans, pero carece del núcleo del SDF: modelo de decisión, insight detection, governance proposals, verificación de calidad.
2. **El prompt actual no referencia la CTM, Baseline, AELC ni la Constitución** como fuentes de verdad, violando el principio fundamental de SDL 2.0 de operar sobre conocimiento consolidado y trazable.
3. **No existe modelo de decisión** — solo READY/NOT READY binario, sin CONTINUE/IMPROVE/ESCALATE/STOP.
4. **Los permisos actuales (read, glob, grep: allow) contradicen SDL 2.0** que prohíbe al SDL inspeccionar código y ejecutar búsquedas.
5. **No existe auto-verificación** — el SDL entrega planes sin verificar invariantes, contratos o ejecutabilidad.

### Acción recomendada

La migración a SDL 2.0 **requiere múltiples misiones** (estimado: 3-4 misiones):
1. **Core Prompt Redesign** (reemplazar plan.md completamente)
2. **Permission Model Alignment** (restringir permisos de PLAN)
3. **Governance Integration** (actualizar STRATEGIC_OPERATIONAL_CONTRACT.md, MISSION_PHASE_ARCHITECTURE.md)
4. **Verification & Validation** (certificación de la nueva implementación)

---

## 2. Arquitectura auditada

### 2.1 Artefactos de la implementación actual (SDL v1.0)

| Artefacto | Rol | Versión |
|-----------|-----|---------|
| `.opencode/agents/plan.md` | Prompt del Strategic Director | v1.0 (104 líneas) |
| `opencode.json` (agente `plan`) | Configuración de permisos y modo | actual |
| `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | Contrato PLAN → BUILD | v1.0 |
| `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` | Tipos de información PLAN ↔ BUILD | v1.0 |
| `docs/architecture/MISSION_CLOSURE_CONTRACT.md` | Cierre de misión y Learning | v1.0 |
| `docs/certification/SDL_CONTRACT_CERTIFICATION.md` | Certificación del contrato SDL | v1.0 |
| `ael/constitution/SPEC.md` | Restricciones del proceso de desarrollo | actual |
| `ael/government/ORGANIZATION.md` | Roles y Professional Engineering Doctrine | actual |
| `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | Ciclo oficial de ingeniería | actual |
| `docs/governance/BASELINE_1_0.md` | Estado certificado del proyecto | actual |
| `ael/artifacts/STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | Reporte de implementación (obsoleto) | contiene refs a GPT-5.4 mini |

### 2.2 Permisos actuales del agente `plan`

```json
{
  "read": "allow",
  "glob": "allow",
  "grep": "allow",
  "list": "allow",
  "edit": "deny",
  "bash": "deny",
  "task": { "*": "deny", "build": "allow" }
}
```

---

## 3. Auditoría de capacidades

### 3.1 Responsabilidades permanentes (R1-R7)

#### R1 — Mantener la perspectiva estratégica

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | El SDL opera exclusivamente en el nivel estratégico. No desciende a detalles de implementación, sintaxis de código, opciones de configuración técnica ni optimizaciones locales. Su unidad de análisis es la misión, no la línea de código. |
| **Implementación actual** | El prompt dice "No debes realizar tareas operacionales directas" y "Tu función es puramente analítica, de planificación y de toma de decisiones de alto nivel." pero no establece explícitamente que la unidad de análisis es la misión ni que no desciende a implementación. |
| **Brecha** | Concepto presente pero no articulado con la precisión de SDL 2.0. |

🟡 **PARTIAL** — El concepto existe pero está débilmente articulado.

---

#### R2 — Analizar impacto usando la CTM

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | Antes de toda planificación, el SDL debe consultar la Constitutional Traceability Matrix para determinar el alcance del cambio. |
| **Implementación actual** | La CTM no se menciona en ningún lugar del prompt de plan.md. No hay referencia a ninguna matriz de trazabilidad. |
| **Brecha** | **Total.** El SDL actual no sabe que existe una CTM ni que debe consultarla. |

❌ **MISSING** — No existe en la implementación actual.

---

#### R3 — Producir Execution Plans gobernados

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | Todo Execution Plan debe incluir objetivos, restricciones, criterios de éxito y evidencia requerida. El plan debe ser ejecutable por AEL sin necesidad de reinterpretación estratégica. |
| **Implementación actual** | ✅ Formato JSON con: objective, current_state, evidence, recommended_workflow, constraints, success_criteria, confidence, escalation_needed. |
| **Brecha** | El formato actual no incluye `scope` ni `impact` (provisions, components, documents, certifications) como requiere SDL 2.0. |

✅ **IMPLEMENTED** — Con diferencias menores en el formato JSON.

---

#### R4 — Decidir el curso de acción

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | El SDL determina si una misión debe CONTINUAR, MEJORARSE, ESCALARSE o DETENERSE. Esta decisión es indelegable. |
| **Implementación actual** | Solo existe READY / NOT READY binario. No hay CONTINUE/IMPROVE/ESCALATE/STOP. |
| **Brecha** | **Total.** No existe modelo de decisión. |

❌ **MISSING** — No existe en la implementación actual.

---

#### R5 — Detectar y comunicar riesgos estratégicos

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | El SDL identifica patrones de riesgo: acumulación de deuda, violación de principios, desviación de la hoja de ruta, incoherencia entre misiones. |
| **Implementación actual** | "detectar la incertidumbre y complejidad del problema" — solo una línea genérica sin categorías ni metodología. |
| **Brecha** | La intención existe pero no hay 7 categorías de insight, no hay reglas de detección, no hay comunicación obligatoria. |

🟡 **PARTIAL** — Concepto presente pero sin estructura.

---

#### R6 — Proponer mejoras de gobernanza

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | Cuando el SDL detecta que una regla, contrato o principio ya no sirve a su propósito, debe proponer su modificación. No puede modificarlo unilateralmente. |
| **Implementación actual** | No existe en el prompt actual. No hay formato de Governance Change Proposal. |
| **Brecha** | **Total.** No existe el concepto. |

❌ **MISSING** — No existe en la implementación actual.

---

#### R7 — Cerrar misiones formalmente

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | El SDL es el único responsable de declarar una misión como CLOSED. El cierre requiere verificación de invariantes (I1-I6) y completitud del AELC. |
| **Implementación actual** | MISSION_CLOSURE_CONTRACT.md define que el SDL cierra misiones, pero el prompt de plan.md no incluye el formato de cierre CLOSED ni la verificación de invariantes. |
| **Brecha** | El concepto está en un documento externo pero no en el prompt operacional. |

🟡 **PARTIAL** — Definido en documentación externa pero no en el prompt.

---

### 3.2 Flujo interno de razonamiento (ORIENT → DELIVER)

| Etapa SDL 2.0 | Implementación actual | Brecha |
|---------------|---------------------|--------|
| **ORIENT** — Establecer contexto | ❌ No existe | No hay etapa de establecimiento de contexto de misión |
| **ANALYZE** — Impacto vía CTM | ❌ No existe | No se menciona CTM, no hay análisis de impacto estructurado |
| **EVALUATE** — Riesgos y alineación | 🟡 Parcial | "detectar incertidumbre" presente pero sin estructura |
| **DECIDE** — Curso de acción | ❌ No existe | Solo READY/NOT READY |
| **PLAN** — Execution Plan | ✅ Existe | Formato JSON con 8 campos |
| **VERIFY** — Auto-verificación | ❌ No existe | No hay verificación de invariantes, contratos, ejecutabilidad |
| **DELIVER** — Entrega estructurada | ✅ Existe | Closing block con Recommendation + EP + Status |

**Estado general:** 🟡 **PARTIAL** — 2/7 etapas implementadas, 2/7 parciales, 3/7 ausentes.

---

### 3.3 Entradas obligatorias

| Entrada SDL 2.0 | ¿Referenciada en plan.md? | Estado |
|-----------------|--------------------------|--------|
| **Constitución** (`AITOS_CONSTITUTION.md`) | ❌ No | ❌ MISSING |
| **CTM** (`CONSTITUTIONAL_TRACEABILITY_MATRIX.md`) | ❌ No | ❌ MISSING |
| **Baseline activa** (`BASELINE_1_0.md`) | ❌ No | ❌ MISSING |
| **AELC** (`AITOS_ENGINEERING_LIFECYCLE.md`) | ❌ No | ❌ MISSING |
| **SPEC.md** (`ael/constitution/SPEC.md`) | ❌ No | ❌ MISSING |
| **CONTRACTS.md** (`ael/constitution/CONTRACTS.md`) | ❌ No | ❌ MISSING |
| **ORGANIZATION.md** (`ael/government/ORGANIZATION.md`) | ❌ No | ❌ MISSING |
| **Project Board** | ❌ No | ❌ MISSING |
| **Changelog** | ❌ No | ❌ MISSING |
| **Roadmap** | ❌ No | ❌ MISSING |
| **Technical Debt Baseline** | ❌ No | ❌ MISSING |
| **ADRs** | ❌ No | ❌ MISSING |
| **Certificaciones** | ❌ No | ❌ MISSING |
| **Mission Request** | 🟡 Implícito | Recibe solicitud del usuario |
| **Execution Report** | ❌ No | ❌ MISSING |
| **Memory** | ❌ No | ❌ MISSING |
| **Discovery** | ❌ No | ❌ MISSING |

**Contraste con BUILD:** El prompt de BUILD (`build.md` líneas 45-51) tiene una sección explícita "Fuentes de verdad" con 5 documentos listados. PLAN no tiene nada equivalente.

**Estado general:** ❌ **MISSING** — 0/17 entradas están explícitamente referenciadas en el prompt.

---

### 3.4 Salidas obligatorias

| Salida SDL 2.0 | Implementación actual | Brecha |
|----------------|---------------------|--------|
| **Recommendation** | ✅ Texto narrativo en closing block | Sin cambios necesarios |
| **Execution Plan (JSON)** | ✅ 8 campos: objective, current_state, evidence, recommended_workflow, constraints, success_criteria, confidence, escalation_needed | Faltan: scope, impact (provisions, components, documents, certifications), evidence_required |
| **Decision Status** | 🟡 Solo READY/NOT READY | Faltan: PENDING_REVIEW, BLOCKED, DECLINED |
| **Decision** | ❌ No existe | No hay CONTINUE/IMPROVE/ESCALATE/STOP |

**Estado general:** 🟡 **PARTIAL** — 1/4 completamente implementada, 2/4 parciales, 1/4 ausente.

---

### 3.5 Modelo de decisión

| Elemento SDL 2.0 | Implementación actual | Brecha |
|------------------|---------------------|--------|
| **Árbol de decisión** | ❌ No existe | No hay lógica de decisión estructurada |
| **CONTINUE** | ❌ No existe | Reemplazado por READY |
| **IMPROVE** | ❌ No existe | No hay concepto de refinamiento |
| **ESCALATE** | 🟡 Parcial | `escalation_needed` existe pero es binario, no tiene precondiciones/postcondiciones |
| **STOP** | ❌ No existe | No hay concepto de detener una misión |

❌ **MISSING** — El modelo de decisión no existe en la implementación actual.

---

### 3.6 Recommendation Status

| Estado SDL 2.0 | Implementación actual | Brecha |
|----------------|---------------------|--------|
| **READY** | ✅ Existe | READY implementado |
| **PENDING_REVIEW** | ❌ No existe | No hay estado intermedio |
| **BLOCKED** | ❌ No existe | No hay estado de bloqueo |
| **DECLINED** | ❌ No existe | NOT READY es diferente de DECLINED |

❌ **MISSING** — Solo 1/4 estados implementados.

---

### 3.7 Engineering Opinion

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | Separar claramente lo que es opinión de lo que es criterio técnico justificado. |
| **Implementación actual** | ✅ Línea 28: "Separar claramente lo que es opinión de lo que es criterio técnico justificado." |
| **Brecha** | No hay formato estructurado para Engineering Opinion, pero el concepto está presente. |

✅ **IMPLEMENTED** — El concepto está correctamente expresado en el prompt.

---

### 3.8 Strategic Insight Detection

| Categoría SDL 2.0 | Implementación actual | Brecha |
|-------------------|---------------------|--------|
| **Deuda técnica acumulada** | ❌ No existe | — |
| **Corrosión arquitectónica** | ❌ No existe | — |
| **Desviación de roadmap** | ❌ No existe | — |
| **Patrón de errores** | ❌ No existe | — |
| **Oportunidad de mejora** | ❌ No existe | — |
| **Ambigüedad normativa** | 🟡 Parcial | "detectar conceptos ambiguos" existe pero sin las 7 categorías |
| **Fatiga de baseline** | ❌ No existe | — |

❌ **MISSING** — No existe detección estructurada de insights.

---

### 3.9 Architectural Opportunity Detection

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | Detectar corrosión arquitectónica, ADRs violados implícitamente, oportunidades de mejora. |
| **Implementación actual** | No existe. "No reemplazar al Arquitecto" es una prohibición, no una detección de oportunidades. |
| **Brecha** | **Total.** No existe en el prompt actual. |

❌ **MISSING** — No existe en la implementación actual.

---

### 3.10 Governance Change Proposal

| Aspecto | Estado |
|---------|--------|
| **Descripción SDL 2.0** | Formato de propuesta con 5 pasos: identificar, justificar, recomendar, evaluar, no implementar. |
| **Implementación actual** | No existe. No hay formato de Governance Change Proposal. |
| **Brecha** | **Total.** No existe en el prompt actual. |

❌ **MISSING** — No existe en la implementación actual.

---

### 3.11 Relación con el ecosistema

| Relación SDL 2.0 | Implementación actual | Brecha |
|------------------|---------------------|--------|
| **Constitución** | ❌ No referenciada | PLAN no conoce la Constitución |
| **CTM** | ❌ No referenciada | PLAN no conoce la CTM |
| **Baseline** | ❌ No referenciada | PLAN no conoce la Baseline |
| **AELC** | ❌ No referenciado | PLAN no conoce el lifecycle oficial |
| **AEL** | 🟡 Parcial | Referencia a BUILD pero sin describir la relación formal de delegación y reporte |
| **Professional Engineering Doctrine** | ✅ Presente | Líneas 24-29 del prompt (deberes profesionales) |
| **Memory** | ❌ No referenciada | PLAN no menciona memoria del proyecto |
| **Learning** | ❌ No referenciado | PLAN no menciona aprendizaje post-cierre |

🟡 **PARTIAL** — 1/8 relaciones correctamente implementadas.

---

### 3.12 Contrato público

#### Garantías (SDL 2.0 §9.1)

| Garantía | Implementación actual | Brecha |
|----------|---------------------|--------|
| **Decisiones fundamentadas** | 🟡 Implícito | "basándote en la evidencia" en el JSON pero sin referencias documentales |
| **Perspectiva estratégica** | ✅ Presente | Línea 22: "No debes realizar tareas operacionales directas" |
| **Impacto analizado** | ❌ Ausente | No hay análisis de impacto |
| **Plan ejecutable** | ✅ Presente | Formato JSON estructurado |
| **Riesgos comunicados** | 🟡 Parcial | "detectar incertidumbre" pero sin estructura |
| **Cierre formal** | ❌ Ausente | No hay verificación de invariantes |
| **No regresión** | ❌ Ausente | No se menciona I6 |

#### Prohibiciones (SDL 2.0 §9.2)

| Prohibición | Implementación actual | Brecha |
|-------------|---------------------|--------|
| **Ejecutar código** | ✅ `edit: deny, bash: deny` | Implementado en permisos |
| **Modificar archivos** | ✅ `edit: deny` | Implementado en permisos |
| **Invocar herramientas (grep, glob, etc.)** | ❌ **Contradicción** | Permisos permiten glob/grep, prompt no lo prohíbe |
| **Inspeccionar código fuente** | ❌ **Contradicción** | Permisos permiten read, prompt no lo prohíbe |
| **Escribir Execution Reports** | ❌ Ausente | No se menciona |
| **Modificar gobernanza unilateralmente** | ❌ Ausente | No se menciona |
| **Reinterpretar la Constitución** | ❌ Ausente | No se menciona |
| **Debatir con AEL** | ❌ Ausente | No se menciona |
| **Cerrar misión sin verificación** | ❌ Ausente | No se menciona |

🟡 **PARTIAL** — 2/7 garantías implementadas, 2/9 prohibiciones implementadas, 2 contradicciones activas.

---

### 3.13 Criterios de calidad

| Grupo SDL 2.0 | Implementación actual | Brecha |
|--------------|---------------------|--------|
| **Criterios de entrada** (3) | ❌ Ausente | No hay criterios de calidad |
| **Criterios de análisis** (3) | ❌ Ausente | No hay criterios de calidad |
| **Criterios de decisión** (2) | ❌ Ausente | No hay criterios de calidad |
| **Criterios de salida** (4) | ❌ Ausente | No hay criterios de calidad |
| **Criterios de cierre** (3) | ❌ Ausente | No hay criterios de calidad |

❌ **MISSING** — No existe ningún criterio de calidad en el prompt actual.

---

## 4. Análisis transversal

### 4.1 Capacidades duplicadas

| Duplicación | Artefactos | Impacto |
|-------------|-----------|---------|
| **"detectar conceptos ambiguos"** | plan.md línea 25 + ORGANIZATION.md §Duties #3 | Baja — refuerzo positivo, pero podría centralizarse |
| **"especialista de nivel experto"** | plan.md línea 24 + build.md línea 34 + ORGANIZATION.md | Baja — doctrina compartida |
| **Professional Engineering Duties** | plan.md líneas 24-29 + build.md líneas 34-40 + ORGANIZATION.md §Duties | Media — 7 duties repetidos en 3 lugares |
| **Closing block format** | plan.md líneas 78-102 + MISSION_PHASE_ARCHITECTURE.md líneas 87-110 + STRATEGIC_OPERATIONAL_CONTRACT.md líneas 98-122 | Alta — el mismo formato está especificado en 3 documentos |
| **"usuario debe poder iniciar BUILD con ok/hacelo"** | plan.md línea 104 + MISSION_PHASE_ARCHITECTURE.md líneas 113-119 | Baja — detalle operativo redundante |
| **Prohibición de escribir código** | plan.md líneas 23 + MISSION_PHASE_ARCHITECTURE.md líneas 80-84 + STRATEGIC_OPERATIONAL_CONTRACT.md líneas 126-137 + SDL_CONTRACT_CERTIFICATION.md | Media — la misma prohibición en 4 documentos |

### 4.2 Capacidades obsoletas

| Capacidad | Artefacto | Motivo de obsolescencia |
|-----------|-----------|------------------------|
| **`escalation_needed` binario** | plan.md líneas 66-74 | Reemplazado por el modelo DECIDE (CONTINUE/IMPROVE/ESCALATE/STOP) |
| **NOT READY como único estado negativo** | plan.md línea 96-100 | Insuficiente. SDL 2.0 requiere PENDING_REVIEW, BLOCKED, DECLINED |
| **Campo `evidence` como array de strings** | plan.md línea 57 | SDL 2.0 requiere `impact` estructurado con provisions, components, documents, certifications |
| **Referencia a GPT-5.4 mini** | `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` (4 ocurrencias) | Arquitectura actual usa Current Session Model |
| **Agente `strategic-director` (nombre legacy)** | `opencode.json` (antes), `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | Ahora llamado `plan` |

### 4.3 Comportamiento legacy

| Comportamiento | Artefacto | Problema |
|----------------|-----------|----------|
| **PLAN puede leer archivos de código fuente** | `plan.md` permissions: `read: allow, glob: allow, grep: allow` | Contradice SO-01 y SDL 2.0 §9.2 que prohíben inspeccionar código y ejecutar búsquedas |
| **PLAN puede buscar en el código (grep)** | `plan.md` permissions: `grep: allow` | Contradice SO-01: "PLAN nunca descubre información no consolidada" |
| **No hay "Sources of Truth" en PLAN** | `plan.md` | BUILD tiene sección "Fuentes de verdad" (build.md líneas 45-51) pero PLAN no; sin embargo SDL 2.0 requiere que PLAN conozca sus fuentes |

### 4.4 Instrucciones redundantes

| Redundancia | Artefactos | Simplificación posible |
|-------------|-----------|----------------------|
| **Prohibiciones de PLAN** | plan.md + MISSION_PHASE_ARCHITECTURE.md + STRATEGIC_OPERATIONAL_CONTRACT.md | Centralizar en el prompt; los documentos referencian el prompt |
| **Formato de salida JSON** | plan.md líneas 53-64 + STRATEGIC_OPERATIONAL_CONTRACT.md líneas 106-116 + SDL_CONTRACT_CERTIFICATION.md líneas 154-165 | Unificar en un solo artefacto de referencia |
| **Closing block visual** | plan.md líneas 82-102 + MISSION_PHASE_ARCHITECTURE.md líneas 90-110 | Ídem |
| **Especialista de nivel experto** | plan.md línea 24 + build.md línea 34 | Referenciar ORGANIZATION.md en lugar de duplicar |

### 4.5 Oportunidades de simplificación

| Oportunidad | Descripción | Beneficio |
|-------------|-------------|-----------|
| **Reemplazar `escalation_needed` por Decision** | El campo binario `escalation_needed` puede ser absorbido por la decisión ESCALATE | Reduce campos del JSON de 8 a 7, alinea con SDL 2.0 |
| **Unificar los 3 documentos de formato de salida** | MPA, SOC y plan.md especifican el mismo formato en 3 lugares | Una sola fuente de verdad |
| **Eliminar referencia a `ael/AGENTS.md`** | `opencode.json` referencia un archivo que no existe | Elimina warning de configuración |
| **Fusionar `escalation_needed` y `confidence`** | Ambos indican certeza del SDL sobre el plan | Podría ser un solo campo `certainty` |

### 4.6 Dependencias innecesarias

| Dependencia | Artefacto | Problema |
|-------------|-----------|----------|
| **`ael` como nombre legacy del agente operacional** | `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | Ya no existe como agente. Ahora es `build`. |
| **`ael/AGENTS.md`** | `opencode.json` | Archivo no existe (hallazgo H-03 de SDL_CONTRACT_CERTIFICATION.md) |
| **`strategic-director.md` (archivo histórico)** | Posiblemente en git history | Fue reemplazado por `plan.md` |

### 4.7 Instrucciones que contradicen SDL 2.0

| # | Contradicción | Artefacto actual | SDL 2.0 dice |
|---|--------------|------------------|--------------|
| **C1** | `plan.md` permissions: `read: allow` + `glob: allow` + `grep: allow` | `opencode.json` agente plan | §9.2: "El SDL nunca invoca herramientas (grep, glob, etc.)" y "nunca inspecciona código fuente" |
| **C2** | `plan.md` permite leer cualquier archivo del proyecto | `read: allow` | §9.2: "SDL consume conocimiento consolidado, no descubre" |
| **C3** | No hay verificación previa a la entrega del plan | prompt actual omite VERIFY stage | §2.6: VERIFY debe verificar invariantes, contratos, ejecutabilidad |
| **C4** | No hay referencia a la CTM | prompt actual | §R2: "Antes de toda planificación, consultar la CTM" |
| **C5** | No hay criterios de calidad de análisis | prompt actual | §10: 16 criterios de calidad en 5 grupos |

---

## 5. Matriz de gaps

### 5.1 Gaps de alta prioridad (P0)

| ID | Gap | Capacidad afectada | Esfuerzo | Riesgo | Impacto |
|----|-----|-------------------|----------|--------|---------|
| **G-01** | No existe modelo de decisión (CONTINUE/IMPROVE/ESCALATE/STOP) | R4, §4.4, §5 | ALTO (reemplazar lógica de cierre) | ALTO — Sin esto, el SDL no puede decidir cursos de acción | BLOQUEANTE para SDL 2.0 |
| **G-02** | No se referencia la CTM como fuente de análisis de impacto | R2, §3.1, §8.2 | BAJO (agregar referencias al prompt) | ALTO — Sin CTM, no hay trazabilidad constitucional | BLOQUEANTE para SDL 2.0 |
| **G-03** | No existe auto-verificación (VERIFY stage) antes de entregar | §2.6, §10 | MEDIO (agregar etapa + criterios) | ALTO — Planes no verificados pueden violar invariantes | BLOQUEANTE para integridad |
| **G-04** | Los permisos actuales permiten inspeccionar código y ejecutar búsquedas, contradiciendo SDL 2.0 | §9.2 (prohibiciones 3, 4) | BAJO (restringir permisos en opencode.json) | ALTO — Violación del contrato SDL-AEL | BLOQUEANTE para certificación |
| **G-05** | No existen criterios de calidad del análisis | §10 (16 criterios) | MEDIO (agregar 5 grupos de criterios) | ALTO — Sin criterios, la calidad del análisis no es verificable | BLOQUEANTE para auditoría |

### 5.2 Gaps de prioridad media (P1)

| ID | Gap | Capacidad afectada | Esfuerzo | Riesgo | Impacto |
|----|-----|-------------------|----------|--------|---------|
| **G-06** | No existe Strategic Insight Detection (7 categorías) | §6 | ALTO (diseñar + implementar) | MEDIO — Sin insights, el SDL no detecta patrones estratégicos | Funcionalidad缺失 importante |
| **G-07** | No existe Governance Change Proposal | R6, §7 | MEDIO (agregar formato + reglas) | MEDIO — Sin propuestas de gobernanza, no hay mecanismo de mejora | Funcionalidad缺失 importante |
| **G-08** | No existe Architectural Opportunity Detection | §6.1 (corrosión arquitectónica) | MEDIO (integrado con insight detection) | MEDIO — Oportunidades arquitectónicas no detectadas | Funcionalidad缺失 |
| **G-09** | Decision Status incompleto (solo READY/NOT READY) | §4.3 | BAJO (agregar PENDING_REVIEW, BLOCKED, DECLINED) | BAJO — Expansión de estados existentes | Mejora de precisión |
| **G-10** | Las 17 entradas obligatorias no están referenciadas en el prompt | §3 | MEDIO (agregar tabla de fuentes) | MEDIO — Sin fuentes explícitas, decisión sin contexto completo | Riesgo de calidad |

### 5.3 Gaps de prioridad baja (P2)

| ID | Gap | Capacidad afectada | Esfuerzo | Riesgo | Impacto |
|----|-----|-------------------|----------|--------|---------|
| **G-11** | Formato Execution Plan JSON no incluye `scope` e `impact` | §4.2 | BAJO (agregar campos al JSON) | BAJO | Alineación con especificación |
| **G-12** | Engineering Opinion no tiene formato estructurado | §3.7 | BAJO | BAJO | Concepto presente pero no formalizado |
| **G-13** | Prohibición de "cerrar misión sin verificación" no está en el prompt | §9.2 (prohibición 9) | BAJO (agregar 1 línea) | BAJO | Alineación con especificación |
| **G-14** | Relación con el ecosistema (Constitución, Baseline, AELC) no documentada en el prompt | §8.2 | MEDIO (agregar tabla de relaciones) | BAJO | Documentación de contexto |
| **G-15** | "Sources of Truth" section ausente en prompt de PLAN (contrasta con BUILD) | §3.1 | BAJO (agregar sección análoga a build.md líneas 45-51) | BAJO | Consistencia con BUILD |

---

## 6. Plan de implementación recomendado

### 6.1 Estrategia de migración

La migración debe realizarse en **4 misiones secuenciales**:

```
Misión 1: Core Prompt Redesign  (P0: G-01, G-02, G-03, G-05)
Misión 2: Permission & Contract  (P0: G-04 + P1: G-09, G-11, G-13)
Misión 3: Advanced Capabilities  (P1: G-06, G-07, G-08)
Misión 4: Integration & Polish   (P2: G-10, G-12, G-14, G-15)
```

No debe intentarse en una sola misión por el alto riesgo de regresión (I6) y la cantidad de cambios interrelacionados.

### 6.2 Misión 1: Core Prompt Redesign

| Objetivo | Reemplazar el prompt de PLAN (plan.md) para implementar el núcleo del SDF |
|----------|---------------------------------------------------------------------------|
| **Gaps cubiertos** | G-01, G-02, G-03, G-05 |
| **Archivos a modificar** | `.opencode/agents/plan.md` |
| **Archivos a consultar** | SDL_2_0_STRATEGIC_DECISION_FRAMEWORK.md, SPEC.md, AELC, CTM, Baseline |
| **Cambios principales** | |
| | 1. Agregar flujo ORIENT → ANALYZE → EVALUATE → DECIDE → PLAN → VERIFY → DELIVER |
| | 2. Agregar modelo de decisión CONTINUE/IMPROVE/ESCALATE/STOP con árbol |
| | 3. Agregar referencia explícita a CTM, Baseline, AELC, SPEC.md |
| | 4. Agregar 5 grupos de criterios de calidad (16 criterios) |
| | 5. Agregar auto-verificación (VERIFY) antes de DELIVER |
| | 6. Expandir Decision Status: READY/PENDING_REVIEW/BLOCKED/DECLINED |
| | 7. Agregar prohibiciones faltantes (cerrar sin verificación, inspeccionar código, etc.) |
| **Riesgos** | Alto — cambio mayor al prompt central. Requiere validación post-implementación. |
| **Verificación** | `npm test`, `npm run build`, `bash ael/contracts/enforce.sh` |

### 6.3 Misión 2: Permission Model & Contract Alignment

| Objetivo | Alinear permisos y documentación contractual con SDL 2.0 |
|----------|----------------------------------------------------------|
| **Gaps cubiertos** | G-04, G-09, G-11, G-13 |
| **Archivos a modificar** | `opencode.json` (permisos de plan), `MISSION_PHASE_ARCHITECTURE.md`, `STRATEGIC_OPERATIONAL_CONTRACT.md`, `MISSION_CLOSURE_CONTRACT.md` |
| **Cambios principales** | |
| | 1. Restringir permisos de PLAN: eliminar glob/grep/list (solo read: allow) |
| | 2. O restringir vía prompt: agregar prohibición explícita de usar grep/glob |
| | 3. Actualizar Execution Plan JSON: agregar scope, impact, evidence_required |
| | 4. Actualizar MISSION_PHASE_ARCHITECTURE.md para reflejar nuevo modelo de decisión |
| | 5. Actualizar STRATEGIC_OPERATIONAL_CONTRACT.md para alinear invariantes |
| **Riesgos** | Medio — cambiar permisos puede afectar capacidad de PLAN para leer documentación |
| **Verificación** | Prueba funcional del agente plan con los nuevos permisos |

### 6.4 Misión 3: Advanced Capabilities

| Objetivo | Implementar detección de insights y propuestas de gobernanza |
|----------|-------------------------------------------------------------|
| **Gaps cubiertos** | G-06, G-07, G-08 |
| **Archivos a modificar** | `.opencode/agents/plan.md` (ampliar) |
| **Cambios principales** | |
| | 1. Agregar 7 categorías de Strategic Insight Detection con señales y acciones |
| | 2. Agregar reglas de detección (contexto, evidencia mínima, comunicación, no-acción) |
| | 3. Agregar formato de Governance Change Proposal (5 pasos) |
| | 4. Agregar Architectural Opportunity Detection |
| **Riesgos** | Medio — funcionalidad nueva sin precedentes en el ecosistema |
| **Verificación** | Simulación de casos de insight detection |

### 6.5 Misión 4: Integration & Polish

| Objetivo | Completar referencias, relaciones y documentación faltante |
|----------|------------------------------------------------------------|
| **Gaps cubiertos** | G-10, G-12, G-14, G-15 |
| **Archivos a modificar** | `.opencode/agents/plan.md`, `docs/certification/SDL_CONTRACT_CERTIFICATION.md`, `ael/artifacts/STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` (actualizar) |
| **Cambios principales** | |
| | 1. Agregar tabla de 17 entradas obligatorias al prompt |
| | 2. Agregar "Sources of Truth" section (análoga a build.md) |
| | 3. Agregar tabla de relaciones con el ecosistema (8 artefactos) |
| | 4. Actualizar SDL_CONTRACT_CERTIFICATION.md para SDL 2.0 |
| | 5. Actualizar/archivar STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md |
| **Riesgos** | Bajo — cambios principalmente documentales |
| **Verificación** | Consistencia documental cruzada |

---

## 7. Matriz final

| # | Capacidad | Estado | Prioridad | Acción | Misión |
|---|-----------|--------|-----------|--------|--------|
| 1 | **R1 — Perspectiva estratégica** | 🟡 PARTIAL | P1 | Refinar prompt para articular precisión de SDL 2.0 | Misión 1 |
| 2 | **R2 — Análisis de impacto vía CTM** | ❌ MISSING | P0 | Agregar referencia obligatoria a CTM en prompt | **Misión 1** |
| 3 | **R3 — Execution Plans gobernados** | ✅ IMPLEMENTED | — | Ajustar formato JSON (scope, impact) | Misión 2 |
| 4 | **R4 — Decidir curso de acción** | ❌ MISSING | P0 | Implementar modelo DECIDE con árbol de decisión | **Misión 1** |
| 5 | **R5 — Detección de riesgos estratégicos** | 🟡 PARTIAL | P1 | Expandir "detectar incertidumbre" a 7 categorías | Misión 3 |
| 6 | **R6 — Propuestas de mejora de gobernanza** | ❌ MISSING | P1 | Implementar Governance Change Proposal | Misión 3 |
| 7 | **R7 — Cierre formal de misiones** | 🟡 PARTIAL | P1 | Incorporar verificación de invariantes + formato CLOSED | Misión 1 |
| 8 | **Flujo ORIENT → ANALYZE → EVALUATE → DECIDE → PLAN → VERIFY → DELIVER** | 🟡 PARTIAL | P0 | Implementar 7 etapas con preguntas guía | **Misión 1** |
| 9 | **Entradas obligatorias (17)** | ❌ MISSING | P1 | Agregar tabla de fuentes de verdad | Misión 4 |
| 10 | **Salidas obligatorias (4 elementos)** | 🟡 PARTIAL | P1 | Agregar Decision, expandir Decision Status | Misión 1 |
| 11 | **Modelo de decisión (CONTINUE/IMPROVE/ESCALATE/STOP)** | ❌ MISSING | P0 | Implementar árbol de decisión + 4 estados | **Misión 1** |
| 12 | **Recommendation Status** | ❌ MISSING | P1 | Expandir a 4 estados | Misión 2 |
| 13 | **Engineering Opinion** | ✅ IMPLEMENTED | — | No requiere cambios | — |
| 14 | **Strategic Insight Detection** | ❌ MISSING | P1 | Implementar 7 categorías de insight | Misión 3 |
| 15 | **Architectural Opportunity Detection** | ❌ MISSING | P1 | Integrar con insight detection | Misión 3 |
| 16 | **Governance Change Proposal** | ❌ MISSING | P1 | Implementar formato de propuesta | Misión 3 |
| 17 | **Relación con Constitución** | ❌ MISSING | P1 | Agregar referencia en prompt | Misión 1 |
| 18 | **Relación con CTM** | ❌ MISSING | P0 | Agregar referencia obligatoria | **Misión 1** |
| 19 | **Relación con Baseline** | ❌ MISSING | P2 | Agregar referencia en prompt | Misión 4 |
| 20 | **Relación con AELC** | ❌ MISSING | P2 | Agregar referencia en prompt | Misión 4 |
| 21 | **Relación con AEL** | 🟡 PARTIAL | P2 | Formalizar relación de delegación y reporte | Misión 4 |
| 22 | **Relación con Professional Engineering Doctrine** | ✅ IMPLEMENTED | — | No requiere cambios | — |
| 23 | **Contrato público — Garantías (7)** | 🟡 PARTIAL | P1 | Agregar garantías faltantes (impacto, cierre, no regresión) | Misión 1 |
| 24 | **Contrato público — Prohibiciones (9)** | 🟡 PARTIAL | P0 | Agregar 7 prohibiciones faltantes + resolver 2 contradicciones | **Misión 1 + 2** |
| 25 | **Criterios de calidad (16 en 5 grupos)** | ❌ MISSING | P0 | Implementar auto-verificación con 16 criterios | **Misión 1** |

### Leyenda de prioridades

| Prioridad | Significado | Cantidad |
|-----------|-------------|----------|
| **P0** | Bloqueante para SDL 2.0. Debe implementarse primero. | 7 |
| **P1** | Alta importancia. Funcionalidad缺失 significativa. | 12 |
| **P2** | Baja prioridad. Alineación fina o documentación. | 4 |
| **—** | Ya implementado. Sin cambios requeridos. | 2 |

---

## 8. Conclusión ejecutiva

### 8.1 Porcentaje de implementación actual

```
SDL 2.0 Implementation Status:
████░░░░░░░░░░░░░░░░  15%  (2/13 capacidades principales)
                       
Donde:
  ✅ 2  (15%)  — Completamente implementado
  🟡 4  (31%)  — Parcialmente implementado
  ❌ 7  (54%)  — No implementado
```

**La implementación actual es funcionalmente SDL v1.0.** Captura el 15% de las capacidades definidas en SDL 2.0 SDF. Las capacidades existentes son las que ya funcionaban en v1.0 (Execution Plans, Recommendation, Engineering Opinion, Professional Doctrine). Todo lo que es nuevo en SDL 2.0 (modelo de decisión, CTM, insights, gobernanza, calidad, verificación) está ausente.

### 8.2 Cantidad de cambios necesarios

| Tipo | Cantidad |
|------|----------|
| Gaps P0 (bloqueantes) | 7 |
| Gaps P1 (alta prioridad) | 12 |
| Gaps P2 (baja prioridad) | 4 |
| **Total gaps** | **23** |
| Contradicciones activas | 5 (C1-C5) |
| Capacidades obsoletas | 5 |
| Redundancias documentales | 4 |

### 8.3 Complejidad estimada

| Dimensión | Estimación |
|-----------|-----------|
| **Complejidad técnica** | MEDIA — los cambios son fundamentalmente de prompt y configuración, no de código de producto |
| **Complejidad organizacional** | ALTA — afecta todos los contratos entre capas (PLAN ↔ BUILD ↔ subagentes), requiere coordinación de cambios en múltiples artefactos |
| **Complejidad de verificación** | ALTA — requiere pruebas funcionales del agente PLAN con el nuevo prompt, simulación de casos de decisión, verificación de invariantes |
| **Riesgo de regresión** | ALTO — un cambio incorrecto en el prompt de PLAN puede afectar la calidad de todos los Execution Plans futuros |

### 8.4 ¿Una sola misión o múltiples?

**RECOMENDACIÓN: Múltiples misiones (4 misiones).**

| Escenario | ¿Posible? | Riesgo |
|-----------|-----------|--------|
| **Una sola misión** | Técnicamente posible | 🔴 **ALTO** — 23 gaps, 5 contradicciones, cambios en múltiples artefactos. Alto riesgo de regresión (I6), errores de integración, y violación de contratos. El prompt de PLAN pasaría de 104 líneas a ~400+ líneas en un solo cambio. |
| **4 misiones secuenciales** | ✅ **RECOMENDADO** | 🟢 **BAJO** — Cada misión tiene alcance acotado, riesgos específicos y verificación independiente. Posibilidad de rollback por misión. |

**Justificación de la recomendación:**

1. **Dependencias entre cambios**: G-01 (modelo de decisión) debe implementarse antes que G-09 (Decision Status expandido) porque los estados dependen de las decisiones.
2. **Riesgo de regresión**: Cambiar permisos (Misión 2) sin tener el prompt actualizado (Misión 1) podría dejar a PLAN sin capacidad operativa.
3. **Verificabilidad**: Cada misión produce un artefacto verificable (prompt actualizado, permisos correctos, documentación alineada). Una mega-misión produce un único cambio masivo difícil de auditar.
4. **Contratos existentes**: Los cambios en MISSION_PHASE_ARCHITECTURE.md y STRATEGIC_OPERATIONAL_CONTRACT.md (Misión 2) deben reflejar el nuevo prompt (Misión 1), no al revés.

### 8.5 Resumen de acciones inmediatas

| # | Acción | Prioridad | Plazo recomendado |
|---|--------|-----------|-------------------|
| 1 | Iniciar **Misión 1: Core Prompt Redesign** | Inmediata (P0) | Próxima sesión |
| 2 | Preparar borrador de nuevo prompt de PLAN basado en SDL 2.0 SDF | Inmediata | Antes de Misión 1 |
| 3 | Congelar cambios en `plan.md` hasta completar Misión 1 | Alta | Durante Misión 1 |
| 4 | Alinear a BUILD sobre los cambios entrantes en el contrato SDL ↔ AEL | Media | Antes de Misión 2 |
| 5 | Programar Misión 2-4 como dependencias secuenciales | Media | Post Misión 1 |

---

## Apéndice A: Mapeo de artefactos afectados por la migración

| Artefacto | Misión 1 | Misión 2 | Misión 3 | Misión 4 |
|-----------|----------|----------|----------|----------|
| `.opencode/agents/plan.md` | ✅ Reemplazo completo | ✅ Ajuste fino | ✅ Ampliación | ✅ Polish |
| `opencode.json` (agente plan) | — | ✅ Permisos | — | — |
| `MISSION_PHASE_ARCHITECTURE.md` | — | ✅ Actualizar | — | — |
| `STRATEGIC_OPERATIONAL_CONTRACT.md` | — | ✅ Actualizar | — | — |
| `MISSION_CLOSURE_CONTRACT.md` | — | ✅ Actualizar | — | — |
| `SDL_CONTRACT_CERTIFICATION.md` | — | — | — | ✅ Actualizar |
| `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | — | — | — | ✅ Archivar/actualizar |
| `docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md` | — | — | — | ✅ Verificar trazabilidad |

## Apéndice B: Comparativa de formatos de salida

### Actual (plan.md v1.0)
```json
{
  "objective": "string",
  "current_state": "string",
  "evidence": ["string"],
  "recommended_workflow": ["string"],
  "constraints": ["string"],
  "success_criteria": ["string"],
  "confidence": number,
  "escalation_needed": boolean | string
}
```

### SDL 2.0 (SDF)
```json
{
  "objective": "string",
  "scope": "string",
  "current_state": "string",
  "impact": {
    "provisions": ["string"],
    "components": ["string"],
    "documents": ["string"],
    "certifications": ["string"]
  },
  "constraints": ["string"],
  "evidence_required": ["string"],
  "success_criteria": ["string"],
  "confidence": number,
  "escalation": false
}
```

**Diferencias:**
- Eliminado: `evidence` (redundante con `impact`)
- Eliminado: `recommended_workflow` (lo decide AEL, no SDL)
- Agregado: `scope` (alcance definido)
- Agregado: `impact` (estructurado con provisions, components, documents, certifications)
- Renombrado: `escalation_needed` → `escalation` (booleano)
- Agregado: `evidence_required` (evidencia que AEL debe producir)

---

*Fin del reporte de auditoría. Este documento es un análisis de brecha. No modifica archivos, prompts, agentes ni configuración.*
