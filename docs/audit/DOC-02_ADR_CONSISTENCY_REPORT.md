# DOC-02 ADR CONSISTENCY REPORT

> **Misión:** DOC-02 — ADR Consistency Resolution  
> **Ejecutor:** BUILD (AEL)  
> **Fecha:** 2026-07-22  
> **Objetivo:** Determinar la relación arquitectónica correcta entre ADR-012 y ADR-014  
> **Restricciones:** NO modificar ADRs, NO crear documentos, NO archivar nada — solo analizar evidencia  

---

## 1. Resumen ejecutivo

Se analizaron los ADR-012 (Cognitive Escalation Principle) y ADR-014 (Experimental Layers Hygiene) junto con su código, documentos relacionados y referencias cruzadas. **No existe contradicción** entre ambos ADRs cuando se considera su línea de tiempo completa y las actualizaciones documentadas.

**Conclusión:** ADR-014 **modifica parcialmente** ADR-012 (Opción B). La relación es:

- ADR-012 estableció el **principio arquitectónico** de escalamiento cognitivo (BKE → DRL → LLM)
- ADR-014 **eliminó la implementación concreta** de BKE/DRL del código por higiene (0 consumidores, 0 tests, 2,476 líneas muertas)
- ADR-012 **fue actualizado** (Sección §10) después de ADR-014 para reconocer explícitamente que CE-3A/CE-3B fueron redefinidos por ADR-014
- ADR-014 **preserva explícitamente** ADR-012 como "diseño conceptual" para re-evaluación post-v1

**Problema detectado (CRÍTICO):** ARCHITECTURE_STATUS.md (2026-07-17) y PROJECT_CONTEXT.md (2026-07-19) están **desactualizados** — ambos fueron escritos antes de ADR-014 (2026-07-20) y todavía muestran BKE/DRL como "implementado" en lugar de "removido".

---

## 2. Análisis ADR-012 — Cognitive Escalation Principle

### 2.1 Metadatos

| Campo | Valor |
|-------|-------|
| **Título** | Cognitive Escalation Principle |
| **Estado** | ACEPTADO |
| **Fecha original** | 2026-07-15 |
| **Última actualización** | 2026-07-16 (fecha declarada) |
| **Evidencia de actualización posterior** | §10.1 referencia explícita a ADR-014 (2026-07-20) — implica una actualización no declarada en el header |
| **Reemplaza** | Parcialmente ADR-005 (AI-First Interpretation) |
| **Prerrequisitos** | CE-1, CE-2, CE-3A, CE-3B, CE-4 |

### 2.2 Decisión

> La inteligencia del sistema escala progresivamente a través de niveles explícitos. Los modelos generativos únicamente se utilizarán cuando los niveles anteriores no puedan resolver el problema satisfactoriamente.

**Cadena de escalamiento declarada:**
```
N0: BKE (Business Knowledge Engine) — consulta fuentes de verdad
N1: DRL (Deterministic Reasoning Layer) — reglas determinísticas
N2a: Groq Provider (llama-3.3-70b)
N2b: Gemini Provider (gemini-2.0-flash)
Fallback: Plantilla estática
```

### 2.3 Componentes afectados (diseño)

| Componente | Acción diseñada | Estado real (hoy) |
|-----------|-----------------|-------------------|
| `src/lib/bke/` (10 archivos, 1,234 líneas) | Nueva capa N0 | **ELIMINADO** por ADR-014 |
| `src/lib/drl/` (12 archivos, 2,476 líneas) | Nueva capa N1 | **ELIMINADO** por ADR-014 |
| `src/lib/evidence/` | Preservado (shadow) | **KEPT** por ADR-014 |
| Feature flags (10 flags) | Control de activación | **DEPRECATED** por ADR-014 |

### 2.4 Dependencias declaradas

| Documento | Relación |
|-----------|----------|
| CE-1 (Cognitive Efficiency Audit) | Prerrequisito — **preservado** |
| CE-2 (Inevitability Classification) | Prerrequisito — **preservado** |
| CE-3A (BKE Specification) | Prerrequisito — **redefinido por ADR-014** (según §10.1) |
| CE-3B (DRL Specification) | Prerrequisito — **redefinido por ADR-014** (según §10.1) |
| CE-4 (Migration Roadmap) | Roadmap — **histórico ejecutado** (según §10.1) |
| CE-5 (Implementation Readiness) | Readiness — **histórico ejecutado** (según §10.1) |
| ADR-005 | **Parcialmente reemplazado** por §7 |

### 2.5 Relación con ADR-014 (documentada en el mismo ADR-012)

El ADR-012 §10.1 (añadido después del 2026-07-20, fecha de ADR-014) declara:

| Documento | Relación con ADR-014 |
|-----------|---------------------|
| **CE-3A** | "Redefinido por ADR-014 — ADR-014 eliminó BKE como concepto arquitectónico preservando funcionalidad" |
| **CE-3B** | "Redefinido por ADR-014 — ADR-014 eliminó DRL como capa independiente" |
| **CE-4** | "Histórico — el roadmap de migración ya fue ejecutado" |
| **CE-5** | "Histórico — reporte de implementación post-PR-5G" |

---

## 3. Análisis ADR-014 — Experimental Layers Hygiene

### 3.1 Metadatos

| Campo | Valor |
|-------|-------|
| **Título** | Experimental Layers Hygiene |
| **Estado** | ACEPTADO |
| **Fecha** | 2026-07-20 |
| **Prerrequisitos** | AUDIT_REPORT_COMPLETE.md, ADR-009, ADR-012, TECHNICAL_DEBT_BASELINE.md |

### 3.2 Decisiones

| # | Componente | Decisión | Tipo |
|---|-----------|----------|------|
| 1 | Evidence Engine (`src/lib/evidence/`) | **KEEP** (shadow mode) | Preservación |
| 2 | Pattern Discovery (`src/lib/pattern-discovery/`) | **REMOVE** (12 archivos, 2,040 líneas) | Eliminación |
| 3 | Cognitive Collector (`src/lib/cognitive/`) | **KEEP** (debug metrics) | Preservación |
| 4 | hard-reset (`src/lib/dev/hard-reset.ts`) | **PROTECT** (DEV_MODE_ENABLED guard) | Protección |
| **5** | **BKE + DRL** (`src/lib/bke/` + `src/lib/drl/`) | **REMOVE** (22 archivos, 2,476 líneas) | **Eliminación** |

### 3.3 Fundamentos para BKE/DRL — REMOVE

| Fundamento | Evidencia |
|-----------|-----------|
| Sin consumidores | 0 imports desde código de producción — verificado con búsqueda en todo `src/` |
| Flags muertas | Ninguna de las 10 flags es consultada por ningún módulo |
| Sin tests | No existen tests unitarios para BKE ni DRL |
| Sin plan de activación | ADR-012 definió arquitectura pero no hay hoja de ruta post-PR-5G |
| Peso muerto | 22 archivos, 2,476 líneas de código que nunca se ejecutan |

### 3.4 Relación con ADR-012 (declarada explícitamente)

> **§2.5:** "ADR-012 (Cognitive Escalation) permanece vigente como **diseño conceptual**. La implementación concreta se re-evaluará post-v1."

> **§1.1.3:** "Congelamientos activos: Architecture Freeze V3 e Interface Freeze V2 no se modifican."

> **§5 Referencias:** "ADR-012 — Cognitive Escalation Principle" listado como referencia activa.

**El ADR-014 no declara reemplazar ni invalidar ADR-012.** Por el contrario, lo preserva explícitamente como diseño conceptual y re-evaluación futura.

---

## 4. Comparación directa

| Tema | ADR-012 | ADR-014 | Estado |
|------|---------|---------|--------|
| **Objetivo** | Establecer principio de escalamiento cognitivo como arquitectura oficial | Eliminar código experimental muerto sin efecto en producción | **Diferentes planos** — uno normativo, otro higiénico |
| **Decisión principal** | BKE → DRL → LLM como cadena de escalamiento | REMOVE BKE + DRL de `src/` (22 archivos, 2,476 líneas) | **Aparente conflicto**: uno crea, otro elimina |
| **Estado declarado** | ACEPTADO (2026-07-15, actualizado 2026-07-16) | ACEPTADO (2026-07-20) | **Ambos vigentes** |
| **Código BKE** | Diseño e implementación (PR-5B, PR-5E, PR-5E.1) | **ELIMINADO** — `src/lib/bke/` no existe | **Código eliminado, diseño preservado** |
| **Código DRL** | Diseño e implementación (PR-5A, PR-5C, PR-5D) | **ELIMINADO** — `src/lib/drl/` no existe | **Código eliminado, diseño preservado** |
| **Feature flags BKE/DRL** | 10 flags para control de activación | **DEPRECATED** — stubs que retornan `false` | **Flags mantenidas como stubs** |
| **Evidence Engine** | Referenciado como parte del stack | **KEEP** (shadow mode) | **Consistente** — ambos lo preservan |
| **CE-3A (BKE Spec)** | Prerrequisito de diseño | **Redefinido** — candidato a eliminación | **Consistente** — ADR-012 §10.1 coincide |
| **CE-3B (DRL Spec)** | Prerrequisito de diseño | **Redefinido** — candidato a eliminación | **Consistente** — ADR-012 §10.1 coincide |
| **CE-4 (Roadmap)** | Hoja de ruta de implementación | **Histórico** — roadmap ejecutado | **Consistente** — ADR-012 §10.1 coincide |
| **CE-5 (Readiness)** | Readiness pre-implementación | **Histórico** — reporte post-ejecución | **Consistente** — ADR-012 §10.1 coincide |
| **Architecture Freeze** | V3 (BKE→DRL→Groq→Gemini) | No modifica freezes activos | **Tensión**: V3 incluye BKE/DRL pero código no existe |
| **Post-v1** | No menciona | **"Re-evaluar post-v1"** para implementación concreta | **Consistente** — ADR-014 añade horizonte temporal |

---

## 5. Evidencia encontrada en código

### 5.1 BKE — NO EXISTE

```
Path: src/lib/bke/
Result: DOES NOT EXIST
```

Confirmado: `src/lib/bke/` fue eliminado completamente.

### 5.2 DRL — NO EXISTE

```
Path: src/lib/drl/
Result: DOES NOT EXIST
```

Confirmado: `src/lib/drl/` fue eliminado completamente.

### 5.3 Pattern Discovery — NO EXISTE

```
Path: src/lib/pattern-discovery/
Result: DOES NOT EXIST
```

Confirmado: Eliminado por ADR-014 Decisión 2.

### 5.4 Evidence Engine — EXISTE

```
Path: src/lib/evidence/ (22 archivos, 2,881 líneas)
Result: EXISTS
```

Confirmado: Preservado como shadow mode (ADR-014 Decisión 1).

### 5.5 Feature flags — DEPRECATED (stubs)

File: `src/config/feature-flags.ts`

```typescript
// BUILD misión OLA 4.3+4.5: módulos BKE/DRL/Pattern Discovery removidos.

/** @deprecated BKE fue removido en BUILD OLA 4.5. Retorna false. */
export function isBkeEnabled(): boolean { return false; }

/** @deprecated DRL fue removido en BUILD OLA 4.5. Retorna false. */
export function isDrlEnabled(): boolean { return false; }
// ... (8 flags más, todas @deprecated, todas retornan false)
```

### 5.6 env.ts — comentarios actualizados

File: `src/config/env.ts`

```typescript
// PATTERN_DISCOVERY_ENABLED, PATTERN_DISCOVERY_DRY_RUN:
// Eliminadas en BUILD misión OLA 4.2 - módulo pattern-discovery removido.
```

Las variables BKE_ENABLED, DRL_ENABLED, etc. ya no aparecen en env.ts.

### 5.7 Git history — commit de remoción

```
b524aa0 feat(build-audit-1): system audit execution, P0 fixes, code hygiene + ola 6 env rotation for staging
```

Este commit ejecutó ADR-014: removió BKE, DRL, Pattern Discovery del código.

---

## 6. Documentos afectados

### 6.1 Documentos ACTUALIZADOS después de ADR-014 (consistentes)

| Documento | Cambio | Evidencia |
|-----------|--------|-----------|
| `ADR_INDEX.md` | ADR-014 agregado como entrada, preserva ADR-012 como conceptual | Línea 135, actualizado 2026-07-20 |
| `CHANGELOG.md` | BUILD-AUDIT-1 documenta remoción BKE/DRL | Líneas 10-12 |
| `PROJECT_BOARD.md` | P1-10a a P1-10h marcados REMOVED (ADR-014) | Líneas 40-47 |

### 6.2 Documentos ANTERIORES a ADR-014 (desactualizados)

| Documento | Fecha | Problema |
|-----------|-------|----------|
| `ARCHITECTURE_STATUS.md` | 2026-07-17 | BKE/DRL mostrados como "✅ Implementado" — §3.4 líneas 150-167. ADR-014 no reflejado. |
| `PROJECT_CONTEXT.md` | 2026-07-19 | BKE/DRL mostrados como "✅ Implementado (flags false)" — líneas 120-121. No refleja ADR-014. |

### 6.3 Documentos sin deprecación visible (candidatos a banner)

| Documento | Estado declarado | Estado real |
|-----------|-----------------|-------------|
| `CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` | Sin banner de deprecación | **Redefinido por ADR-014** (ADR-012 §10.1) |
| `CE-3B_DETERMINISTIC_REASONING_LAYER.md` | Sin banner de deprecación | **Redefinido por ADR-014** (ADR-012 §10.1) |
| `CE-4_MIGRATION_ROADMAP.md` | Sin banner de deprecación | **Histórico ejecutado** (ADR-012 §10.1) |
| `CE-5_IMPLEMENTATION_READINESS.md` | Sin banner de deprecación | **Histórico ejecutado** (ADR-012 §10.1) |

---

## 7. Clasificación recomendada

```
Opción B: ADR-014 modifica parcialmente ADR-012
```

### Fundamentos

| Argumento | Evidencia |
|-----------|-----------|
| **ADR-012 sigue vigente como principio** | ADR-014 §2.5: "ADR-012 permanece vigente como diseño conceptual" |
| **ADR-014 no invalida ADR-012** | ADR-014 no declara reemplazar ni invalidar ADR-012 |
| **ADR-012 reconoce ADR-014** | ADR-012 §10.1: CE-3A/CE-3B "Redefinido por ADR-014" |
| **El código fue eliminado, no el principio** | `src/lib/bke/` y `src/lib/drl/` no existen; feature flags son stubs `@deprecated` |
| **Ambos están ACEPTADOS** | ADR_INDEX.md lista ambos como Accepted sin conflicto |
| **El plano de acción es diferente** | ADR-012 actúa en plano normativo (principio); ADR-014 actúa en plano higiénico (código) |

### Lo que ADR-014 modificó de ADR-012

| Aspecto | Antes (ADR-012) | Después (ADR-014) |
|---------|-----------------|-------------------|
| **Código BKE** | Existente en `src/lib/bke/` (10 archivos) | **Eliminado** |
| **Código DRL** | Existente en `src/lib/drl/` (12 archivos) | **Eliminado** |
| **Feature flags** | 10 flags funcionales (default false) | **Deprecadas** — stubs que retornan false |
| **Horizonte de implementación** | Inmediato (roadmap CE-4 con 5 fases) | **Diferido a post-v1** |
| **CE-3A/CE-3B** | Documentos de diseño activos | **Redefinidos** como históricos |
| **CE-4/CE-5** | Roadmap y readiness | **Históricos ejecutados** |

### Lo que NO cambió

- El **principio** de escalamiento cognitivo sigue siendo válido
- Architecture Freeze V3 **no se modificó**
- La **jerarquía** BKE → DRL → LLM sigue siendo el diseño conceptual oficial
- ADR-005 sigue parcialmente reemplazado por ADR-012

### Por qué NO es Opción A (supersede completamente)

ADR-014 no declara superseder ADR-012. Explícitamente lo preserva como diseño conceptual. Si ADR-014 lo supersediera completamente, el principio de escalamiento cognitivo quedaría sin marco arquitectónico, lo que no es la intención declarada.

### Por qué NO es Opción C (vigente sin modificación)

ADR-014 sí modificó ADR-012: eliminó la implementación, deprecó las flags, y difirió la activación a post-v1. ADR-012 sin ADR-014 daría una imagen incompleta de la arquitectura real.

### Por qué NO es Opción D (contradicción)

Ambos ADRs se referencian mutuamente, ambos están ACEPTADOS, y sus planos de acción son complementarios (normativo vs higiénico). La única contradicción aparente surge de documentos desactualizados (ARCHITECTURE_STATUS.md, PROJECT_CONTEXT.md) que no reflejan ADR-014.

---

## 8. Acción requerida por SDL

### 8.1 Prioridad alta (documentos desactualizados)

| Documento | Acción | Urgencia |
|-----------|--------|----------|
| **ARCHITECTURE_STATUS.md** | Actualizar sección §3.4 (Modelo de inteligencia) para reflejar que BKE/DRL fueron removidos de `src/` por ADR-014. El principio sigue vigente como diseño conceptual, la implementación fue eliminada. | **Alta** — documento canónico debe reflejar la realidad |
| **PROJECT_CONTEXT.md** | Actualizar tabla de componentes: BKE/DRL de "✅ Implementado" a "🗑️ Removido (ADR-014)". | **Alta** — referencia de proyecto desactualizada |

### 8.2 Prioridad media (deprecación visual)

| Documento | Acción | Urgencia |
|-----------|--------|----------|
| **CE-3A** | Añadir banner: "ARCHIVE CANDIDATE — Diseño redefinido por ADR-014. Código BKE eliminado. Conservado como referencia conceptual." | **Media** — evita confusiones a lectores |
| **CE-3B** | Añadir banner: "ARCHIVE CANDIDATE — Diseño redefinido por ADR-014. Código DRL eliminado. Conservado como referencia conceptual." | **Media** |
| **CE-4** | Añadir banner: "HISTÓRICO — Roadmap ejecutado en PR-5A a PR-5F. Implementación diferida a post-v1 por ADR-014." | **Media** |
| **CE-5** | Añadir banner: "HISTÓRICO — Readiness previo a implementación. Reporte post-ejecución archivado." | **Media** |

### 8.3 Prioridad baja (clarificación)

| Documento | Acción | Urgencia |
|-----------|--------|----------|
| **ADR-012 header** | Actualizar fecha de última modificación para reflejar la adición de §10.1 (post-2026-07-20). | **Baja** — el contenido ya es correcto |
| **Architecture Freeze V3** | Considerar si V3 debe renombrarse o anotarse para reflejar que BKE/DRL son diseño conceptual, no implementación actual. | **Baja** — requiere decisión estratégica |

### 8.4 Pendiente de decisión estratégica

| Tema | Pregunta | ¿Quién decide? |
|------|----------|---------------|
| **Re-implementación BKE/DRL post-v1** | ¿Se retomará la implementación de ADR-012 después de v1? ¿Con qué prioridad? | **PLAN** (decisión estratégica) |
| **Architecture Freeze V3** | ¿Sigue siendo V3 con BKE/DRL como capas congeladas, o debe ajustarse para reflejar que son diseño conceptual? | **PLAN** + Arquitecto |

---

## Apéndice A: Árbol de decisión

```
¿ADR-014 declara superseder ADR-012?
  → NO (explícitamente lo preserva como "diseño conceptual")
  
¿ADR-014 modifica el estado de ADR-012?
  → NO (ambos ACEPTADOS, ADR_INDEX consistente)

¿ADR-014 modificó la implementación de ADR-012?
  → SÍ (eliminó BKE/DRL de src/, deprecó flags, difirió a post-v1)

¿Existe contradicción no resuelta?
  → NO (los ADRs se referencian mutuamente; son complementarios)

¿Hay documentos desactualizados que crean apariencia de contradicción?
  → SÍ (ARCHITECTURE_STATUS.md, PROJECT_CONTEXT.md)

RESULTADO: Opción B — ADR-014 modifica parcialmente ADR-012
```

---

## Apéndice B: Línea de tiempo

```
2026-07-15  CE-1, CE-2, CE-3A, CE-3B, CE-4, CE-5 creados
2026-07-15  ADR-012 creado (Cognitive Escalation Principle)
2026-07-16  ADR-012 actualizado (desviaciones documentadas §9)
            PR-5A a PR-5G implementados (BKE + DRL creados en src/)
2026-07-16  Architecture Freeze V3 declarado
2026-07-17  ARCHITECTURE_STATUS.md actualizado (con ADR-012 como implementado)
2026-07-19  PROJECT_CONTEXT.md creado (BKE/DRL como "implementado flags false")
2026-07-20  BUILD-AUDIT-1 ejecutado → ADR-014 creado
            BKE/DRL/Pattern Discovery removidos de src/
            ADR_INDEX.md actualizado con ADR-014
            PROJECT_BOARD.md actualizado (P1-10x REMOVED)
2026-07-20  ADR-012 actualizado §10 (SSOT enrichment D4)
            → CE-3A/3B marcados como "redefinido por ADR-014"
            → CE-4/5 marcados como "histórico ejecutado"
```

---

*Este reporte fue generado por BUILD como parte de la misión DOC-02. Ningún ADR fue modificado.*  
*Clasificación: Opción B — ADR-014 modifica parcialmente ADR-012.*
