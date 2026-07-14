# Architecture Milestone v3.0

**Status:** HISTORICAL — Documenta el diseño arquitectónico a julio 2026.  
**Nota PR-11 (2026-07-13):** Este documento describe el pipeline **objetivo** (futuro deseado). El pipeline **real implementado** es solo el Evidence Engine en Shadow Mode. Memory, Pattern Discovery, Goals y Planning no existen como implementación.  
**Date:** 2026-07-13  
**Driver:** PR-3E (EE Freeze) + PR-5 (Memory Architecture) + PR-6 (Reflection Elimination + ADR-011)  

---

## ⚠️ Aclaración PR-11 — Plano presente vs. futuro

Este documento fue escrito antes de la auditoría PR-11, que reveló que el pipeline cognitivo documentado describe un **sistema futuro deseado**, no el sistema actual.

| Plano | Lo que incluye | Estado |
|-------|---------------|--------|
| **Presente** (implementado) | Evidence Engine (7 capas, Shadow Mode) | ✅ Implementado, 378 tests |
| **Futuro** (diseñado, no implementado) | Memory → Pattern Discovery → API cognitiva | ⏳ Diseño conceptual, sin código |

Las secciones a continuación deben leerse con esta distinción en mente.

---

## Resumen Ejecutivo (contexto histórico)

AITOS alcanzó su segundo hito arquitectónico mayor.

Entre v2.0 y v3.0, el proyecto construyó y consolidó la **arquitectura cognitiva** del sistema:

1. **Evidence Engine (PR-1 a PR-3E)**: Siete capas cognitivas (Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision) implementadas en Shadow Mode y congeladas mediante ADR-009. **Única capa del pipeline cognitivo implementada actualmente.**

2. **Memory (PR-5)**: Capa de persistencia cognitiva (objetivo futuro). Preserva el par Belief+Decision como snapshot inmutable por turno. Diseño conceptual completado y auditado (ADR-010). **Sin implementación.**

3. **Reflection (PR-6)**: Seis auditorías progresivas demostraron que Reflection no constituye una capa arquitectónica independiente. Su única transformación (δ: comparación entre snapshots consecutivos) es una función pura que Pattern Discovery (antes Learning) puede absorber internamente. Reflection fue eliminada como componente del pipeline cognitivo mediante ADR-011.

A partir de este hito, la arquitectura cognitiva está definida y auditada. El diseño de **Pattern Discovery** (anteriormente "Learning cognitivo") queda como evolución futura sobre una base contractual sólida.

---

## Evolución del proyecto (v2.0 → v3.0)

### Etapa 5 — Evidence Engine (PR-1 a PR-3E)

Construcción incremental del pipeline cognitivo base.

| PR | Capa | Logro |
|----|------|-------|
| PR-1/2A | Signal | Primer objeto cognitivo. Captura raw del mensaje. |
| PR-2C | Observation | Validación temporal. `validatedAt ≥ signal.receivedAt`. |
| PR-2D | Fact | Proposiciones atómicas estructurales (5 facts por turno). |
| PR-2E | Evidence | Agrupación inmmutable de Facts bajo una Observation. |
| PR-2F | Shadow Mode | `runShadowCognition()` + `ShadowResult`. Unificación del pipeline. |
| PR-3A | Knowledge | Primer comportamiento cognitivo. Consolidación estructurada. |
| PR-3B | Belief | Compromiso epistémico: "el sistema cree que...". |
| PR-3C | Decision | Determinación cognitiva: "el sistema decide que...". |
| PR-3E | **Freeze** | 378 tests. ADR-009. Architecture Freeze del EE. |

**Pipeline resultante:**
```
Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
```

### Etapa 6 — Memory Architecture (PR-5)

Diseño conceptual de la capa de persistencia cognitiva.

| PR | Auditoría | Resultado |
|----|-----------|-----------|
| PR-5A | Diseño Conceptual | Definición ontológica, boundaries, lifecycle, invariantes M-1 a M-7. |
| PR-5B | Contrato Semántico | Snapshot definition, field belonging rules (11 belong, 14 excluded), invariantes M-8 a M-14. |
| PR-5C | Contrato de Integración | Punto de integración en lead.service.ts, 10 contract rules. |

Memory preserva el output del EE después de completado cada turno. No produce cognición. No retroalimenta al EE.

### Etapa 7 — Reflection Elimination (PR-6)

Seis auditorías progresivas para determinar si Reflection constituye una capa arquitectónica independiente.

| PR | Auditoría | Conclusión |
|----|-----------|-----------|
| PR-6A | Diseño conceptual | Primer diseño inválido en 3 puntos. |
| PR-6B | Transformaciones | 21 operaciones analizadas. Kernel mínimo: `zipWith(δ)`. |
| PR-6C | Modelo matemático | Reflection = función pura. No idempotente. Sin boundary contractual. |
| PR-6D | Eliminación | 10/10 dimensiones no exigen mantener la capa. |
| PR-6E | Contractual | No existe boundary entre State y Change. |
| PR-6F | Evolutiva | Sin independencia evolutiva. δ es helper privado de Learning. |

**Decisión (ADR-011)**: Reflection eliminada como capa arquitectónica. δ absorbida como submódulo interno de Learning.

---

## Pipeline cognitivo — Plano presente y futuro

### Plano presente (implementado)

```
Signal               [CAPTURE] — lo que el sistema recibió
    ↓
Observation          [VALIDATE] — lo que el sistema observó
    ↓
Fact                 [EXTRACT] — lo que el sistema extrajo
    ↓
Evidence             [GROUP] — lo que el sistema agrupa
    ↓
Knowledge            [CONSOLIDATE] — lo que el sistema sabe
    ↓
Belief               [COMMIT] — lo que el sistema cree
    ↓
Decision             [DETERMINE] — lo que el sistema decide
    ↓
═══════════════════════════════════════════════
         Evidence Engine (FREEZE — ADR-009)
═══════════════════════════════════════════════
    ↓
Shadow Observer      (output observable, no persistido)
    ↓
    (output actualmente descartado — ver PR-11)
```

### Plano futuro (diseño objetivo, no implementado)

```
[EE] → [Memory] → [Pattern Discovery] → [API cognitiva] → [Sistema Operacional]
```

**Componentes del plano futuro:**

| Componente | Estado | ADR |
|-----------|--------|:---:|
| **Memory** — Persistencia cognitiva append-only | ⏳ Diseño conceptual | ADR-010 |
| **Pattern Discovery** — Descubrimiento de regularidades (⟨P,θ,E⟩) | ⏳ Diseño conceptual | PR-7 |
| **API cognitiva** — `getPatterns()` como interfaz pública | ⏳ No diseñada | — |

**Nota:** Goals y Planning fueron eliminadas como capas cognitivas (PR-8, PR-9). Sus funciones persisten dentro del Learning operacional (`src/lib/services/learning/`), que es un sistema distinto perteneciente al dominio operacional.

---

## Responsabilidades definitivas

### Evidence Engine (ADR-009 — Architecture Freeze)

| Capa | Responsabilidad | Exclusión |
|------|----------------|-----------|
| **Signal** | Capturar raw del mensaje. Timestamp `receivedAt ≤ now()`. | No valida contenido semántico. |
| **Observation** | Validar temporalmente. `validatedAt ≥ signal.receivedAt`. | No interpreta significado. |
| **Fact** | Extraer proposiciones atómicas estructurales. | No facts semánticos (origen, destino, intención). |
| **Evidence** | Agrupar Facts bajo una Observation. Inmutable. | No enriquece. No modifica Facts. |
| **Knowledge** | Consolidar Facts en campos estructurados. | No infiere nada nuevo. |
| **Belief** | Compromiso epistémico: "el sistema cree que...". | No decide. No infiere intención. |
| **Decision** | Determinación cognitiva: "el sistema decide que...". | No selecciona políticas ni rutas. |

**Invariantes congelados**: I1-EE a I6-EE.  
**Prohibiciones**: Persistir, enviar mensajes, modificar estado conversacional, depender de capas no adyacentes.

### Memory (ADR-010 — **Diseño futuro**, sin implementación)

| Aspecto | Definición |
|---------|-----------|
| **Input** | Belief + Decision (desde ShadowResult) |
| **Output** | `MemorySnapshot` persistido con 19 campos (8 de Belief + 7 de Decision + 4 de metadatos) |
| **Responsabilidad** | Preservar estado cognitivo de cada turno completo |
| **Prohibición principal** | No computar diffs (M-13). No enriquecer (M-9). No retroalimentar al EE (M-3). |
| **Consumidores** | Pattern Discovery (directo) |

**Invariantes de diseño futuro**: M-1 a M-14 (6/14 verificables sin implementación).

### Pattern Discovery (futuro — antes "Learning cognitivo", PR-7)

**Aviso PR-11:** El nombre "Learning" fue retirado por conflicto con el Learning operacional (`src/lib/services/learning/`). Esta capa se denomina **Pattern Discovery** en adelante.

| Aspecto | Definición tentativa |
|---------|---------------------|
| **Input** | `MemorySnapshot[]` desde Memory (19 campos, de los cuales 11 son analizables por Pattern Discovery) |
| **Procesamiento interno** | Computa `δ`: comparación semántica entre snapshots consecutivos. Luego descubre patrones sobre los Changes resultantes. |
| **Responsabilidad** | Descubrir patrones cognitivos a partir de diferencias temporales |
| **No responsable de** | Decisiones operacionales, ejecución, preservación, cognición por turno |

---

## Boundaries — Plano futuro (no implementado)

Los siguientes boundaries describen el diseño objetivo, no el sistema actual.

```
EE → Memory:
  - EE produce Decision. Memory consume Belief + Decision.   [⏳ futuro]
  - Memory NO modifica EE. Memory NO retroalimenta.
  - Boundary: EE es efímero (in-memory). Memory es persistente.

Memory → Pattern Discovery:
  - Memory produce ProjectedState[]. PD consume ProjectedState[].  [⏳ futuro]
  - PD NO escribe en Memory.
  - Boundary: Memory es append-only. PD es analítico (solo lectura).
  - δ es interna de PD. Memory no computa diffs (M-13).
```

---

## Contratos vigentes heredados

### De ADR-009 (Evidence Engine)

| Contrato | Descripción |
|----------|-------------|
| Cadena lineal estricta | Cada capa solo depende de su predecesor inmediato. |
| Shadow Mode | `EVIDENCE_SHADOW_MODE` flag. Nunca afecta el pipeline operacional. |
| Builders never throw | Errores capturados → null. Pipeline nunca crash. |
| Campos anticipatorios | `evidenceId`, `knowledgeId`, `beliefId`, `provenance` protegidos. Requieren ADR para eliminación. |
| Pipeline completo | Todo ciclo produce las 7 capas o ninguna. `ShadowResult.isComplete()`. |
| Inmutabilidad | `Object.freeze()` post-construcción. |

### De ADR-010 (Memory — diseño futuro, sin implementación)

| Contrato | Descripción | Estado |
|----------|-------------|:------:|
| Append-only | Snapshots nunca se eliminan ni actualizan. | ⏳ futuro |
| M-4 (Full turn) | Snapshot solo si Belief + Decision completos. | ⏳ futuro |
| M-13 (No diffs) | Memory no computa diferencias entre snapshots. | ⏳ futuro |
| M-9 (No enrichment) | Memory nunca agrega, deriva, transforma ni infiere. | ⏳ futuro |
| Partition key | `conversationId` es exclusivamente partition key. | ⏳ futuro |

---

## Decisiones eliminadas

| Decisión | Eliminada por | Razonamiento |
|----------|--------------|--------------|
| **Reflection como capa independiente** | ADR-011 (PR-6D, PR-6E, PR-6F) | 10/10 dimensiones no exigen mantenerla. Sin boundary contractual. Sin independencia evolutiva. |
| **ReflectionObservation como estructura de salida** | ADR-011 | Reemplazada por δ interna en Pattern Discovery. |
| **Tipos de observación (trend, recurrence, transition, anomaly)** | PR-6B | Operaciones clasificadas como pertenecientes a Pattern Discovery. |
| **Reflection como traductor contractual** | PR-6E | No existe boundary entre State y Change. Mismo vocabulario ontológico. |
| **Goals como capa cognitiva** | PR-8 | Mismo tipo ontológico que Action. Sus funciones persisten dentro del Learning operacional. |
| **Planning como capa cognitiva** | PR-9 | Produce instrucciones, no conocimiento. Sus funciones persisten dentro del Learning operacional. |
| **Boundary como entidad separada** | PR-10 | Función identidad B(M)=M. Es la API pública de Pattern Discovery. |

---

## Justificación arquitectónica resumida

| Decisión | Por qué |
|----------|---------|
| **EE Freeze** (ADR-009) | 7 capas completas, 378 tests, invariantes verificados. Base cognitiva madura. **Es la única capa cognitiva implementada actualmente.** |
| **Memory como capa** (futuro) | Boundary ontológico real (efímero ↔ persistente). 14 invariantes propios. Sin implementación. |
| **Reflection eliminada** | Modelo matemático trivial (zipWith). Sin boundary contractual. Sin independencia evolutiva. Costo > beneficio. |
| **δ interna en Pattern Discovery** | Función pura, determinista. No requiere capa separada. |
| **Pipeline futuro** | EE → Memory → Pattern Discovery → API cognitiva. Goals, Planning y Boundary eliminados como capas. |

---

## Invariantes que permanecen congelados

### ADR-009 — Evidence Engine (6 invariantes)

| ID | Invariante |
|----|-----------|
| I1-EE | Pipeline completeness — todo ciclo produce 8 capas o ninguna. |
| I2-EE | Immutability — Object.freeze() post-construcción. |
| I3-EE | Temporal monotonicity — `validatedAt ≥ receivedAt`; `receivedAt ≤ now()`. |
| I4-EE | No persistence — EE nunca escribe en DB. |
| I5-EE | No conversation impact — EE nunca afecta al usuario. |
| I6-EE | Single authority — cada capa tiene exactamente una fuente. |

### ADR-010 — Memory (14 invariantes de diseño futuro)

> ⚠️ **Estado PR-11:** Estos invariantes pertenecen al diseño objetivo de Memory. Actualmente 8/14 no son verificables sin implementación. No deben tratarse como activos actuales del sistema.

| ID | Invariante | Verificable hoy |
|:--:|-----------|:----------------:|
| M-1 | Append-only | ⏳ No (sin implementación) |
| M-2 | Read-only durante EE | ⏳ No |
| M-3 | No feedback a EE | ✅ Principio de diseño |
| M-4 | Full turn only | ⏳ No |
| M-5 | Immutable | ✅ Patrón universal |
| M-6 | Partitioned by conversation | ⏳ No |
| M-7 | Monotonic turnNumber | ⏳ No |
| M-8 | Atomic snapshot (Belief + Decision) | ⏳ No |
| M-9 | No enrichment | ✅ Principio de diseño |
| M-10 | Projection stability | ⏳ No |
| M-11 | No operational state | ✅ Principio de diseño |
| M-12 | No defaults | ⏳ No |
| M-13 | No delta precomputation *(responsabilidad: Pattern Discovery)* | ✅ Principio de diseño |
| M-14 | Temporal domain separation | ⏳ No |

**6/14 invariantes verificables hoy** (principios de diseño). **8/14** requieren implementación para verificarse.

---

## Cambios introducidos por ADR-011

| Cambio | Antes | Después |
|--------|-------|---------|
| Pipeline cognitivo | EE → Memory → **Reflection** → Learning → Goals → Planning | EE → Memory → Pattern Discovery |
| Campo anticipatorio `reflectionId` | Consumido por Reflection | Reservado sin consumidor |
| M-13 — Computación de diffs | "(Reflection's job)" | "(Pattern Discovery's responsibility)" |
| Consumidores de Memory | Reflection, Learning, Goals | Pattern Discovery |
| Pattern Discovery — forma de consumo | `learn(reflections, outcomes)` | `learn(memoryWindow, outcomes)` con δ interna |
| Tabla de capas futuras (ADR-009 §7) | Incluía Reflection | Solo Memory → Pattern Discovery |

---

## Riesgos abiertos (post-PR-11)

| ID | Riesgo | Severidad | Estado |
|----|--------|-----------|--------|
| **R1** | Memory no tiene API de lectura definida. Pattern Discovery necesitaría `ProjectedState[]` pero el canal de consulta no existe. | **ALTA** | Abierto — diseño futuro |
| **R2** | El algoritmo δ necesita igualdad semántica por tipo de campo. Si se implementa con igualdad sintáctica, produce falsos cambios. | Media | Abierto — diseño futuro |
| **R3** | Pattern Discovery no tiene ADR propio. Su diseño está documentado en PR-7. | Baja | Aceptado — diseño futuro |
| **R4** | Memory no tiene implementación. Pattern Discovery no puede diseñarse contra una interfaz que no existe. | **ALTA** | Abierto — diseño futuro |
| **R5** | El `reflectionId` anticipatorio en EE nunca se usará. Podría confundir a futuros desarrolladores. | Baja | Aceptado |
| **R6** | Coexistencia del Learning operacional (ADR-003) con Pattern Discovery. Riesgo de confusión ontológica. | **ALTA** | **Resuelto parcialmente** — PR-11 establece renombrar a "Pattern Discovery" y "Operational Optimization Engine" |

---

## Supuestos explícitos (post-PR-11)

1. **Memory es diseño futuro.** ADR-010 describe el diseño objetivo. No existe implementación.

2. **Pattern Discovery es diseño futuro.** El pipeline cognitivo futuro es EE → Memory → Pattern Discovery. Sin implementación actual.

3. **La cadena lineal se mantiene en diseño.** Pattern Discovery no leerá Memory directamente sin pasar por el canal de consulta autorizado.

4. **δ es determinista.** Sin necesidad de configuración, umbrales o parámetros en la comparación de snapshots.

5. **Los campos de EE no cambiarán.** ADR-009 está congelado. Los 11 campos analizables (subconjunto de los 19 campos del MemorySnapshot) son estables.

6. **Pattern Discovery no escribirá en Memory.** Es consumidor de solo lectura.

7. **El pipeline cognitivo no afecta al pipeline operacional.** Shadow Mode se mantiene como patrón para futuras capas cognitivas.

8. **Goals y Planning NO son capas cognitivas.** Fueron eliminadas como entidades separadas. Sus funciones persisten en el Learning operacional.

9. **El único pipeline implementado hoy es EE → Shadow Observer → (descarte).** Todo lo demás es diseño futuro.

---

## Preguntas pendientes (diseño futuro — Pattern Discovery)

### Contractuales

1. ¿Cuál es el contrato exacto de entrada de Pattern Discovery? (`ProjectedState[]` con qué garantías?)
2. ¿Memory expone una API de consulta por ventana? ¿Quién la define?
3. ¿Cómo se manejan los gaps (turnos sin snapshot) en la ventana que recibe Pattern Discovery?
4. ¿Pattern Discovery necesita metadatos adicionales (conversationId, ventana completa, metadatos de sesión)?

### De transformación

5. δ: ¿igualdad semántica o sintáctica para cada tipo de campo?
6. δ: ¿qué hacer con campos `null`? ¿Se comparan como valores o se omiten?
7. ¿Pattern Discovery necesita solo diffs o también acceso a los valores absolutos de los snapshots?

### De boundary

8. ¿Pattern Discovery absorbe, reemplaza o coexiste con el Operational Optimization Engine?
9. ¿Dónde está el límite exacto entre "patrón cognitivo" (Pattern Discovery) y "regla operacional" (Policy)?
10. ¿Pattern Discovery produce patrones por conversación o globales? ¿Quién los acumula?

### De implementación

11. ¿Pattern Discovery tiene Shadow Mode? ¿Feature flag?
12. ¿Pattern Discovery se invoca por turno, por ventana, o bajo demanda?
13. ¿Pattern Discovery necesita estado entre invocaciones? (Ej: "ya procesé turns 1-10, ahora proceso 11-20")
14. ¿Los patrones de Pattern Discovery se persisten? ¿Dónde?

### De acoplamiento

15. ¿Pattern Discovery depende directamente de Memory o de una abstracción intermediaria?
16. ¿La función δ se define como parte del módulo de Pattern Discovery o como librería separada?

---

## Garantías de la arquitectura v3.0 (post-PR-11)

A partir de este hito se garantiza que:

1. **El EE está implementado y congelado.** Las 7 capas del EE están implementadas, auditadas y congeladas. No se modifican sin ADR.
2. **El pipeline cognitivo futuro está diseñado.** Memory + Pattern Discovery tienen invariantes, boundaries y preguntas abiertas documentadas en plano futuro.
3. **La arquitectura es minimal.** Reflection fue eliminada por no superar ninguna auditoría de necesidad arquitectónica. Goals y Planning también eliminados como capas.
4. **La separación presente/futuro es explícita.** Ningún documento de arquitectura debe confundir lo implementado con lo diseñado.
5. **No hay acoplamiento oculto.** Cada capa depende exclusivamente de su predecesora inmediata. No hay dependencias circulares ni saltos en la cadena.
6. **La arquitectura puede auditarse objetivamente.** Cada decisión tiene ADR, cada invariante tiene ID, cada boundary tiene justificación.

---

## Estado del proyecto (v3.0 + PR-11)

| Dimensión | Avance |
|-----------|--------|
| Evidence Engine (7 capas) | ████████████████████ **100%** (Freeze) |
| Shadow Observer (runShadowCognition) | ████████████████████ **100%** (output descartado) |
| Memory Architecture | ████████████████████ **100%** (Diseño futuro) |
| Memory Implementation | □□□□□□□□□□□□□□ **0%** |
| Reflection | ~~████████████████████~~ **Eliminada** |
| Pattern Discovery | □□□□□□□□□□□□□□ **0%** (Diseño futuro) |
| Goals / Planning (capas cognitivas) | ~~████████████████████~~ **Eliminadas** |
| Learning operacional (ADR-003) | ████████████████████ **100%** (Freeze) |
| Pipeline operacional (v2.0) | ████████████████████ **100%** (Freeze) |
| Separación presente/futuro | ████████████████████ **100%** (PR-11A) |

---

## Declaración Final (post-PR-11)

Con la finalización de PR-3E (Evidence Engine Freeze), PR-5 (Memory Architecture), PR-6 (Reflection Elimination), PR-7 a PR-10 (eliminación de Goals, Planning y Boundary), y PR-11 (Cognitive Reality Alignment), **AITOS alcanza la versión arquitectónica 3.0 con separación explícita entre plano presente y plano futuro**.

**Plano presente (implementado y verificado):**
- Evidence Engine (7 capas, congelado)
- Shadow Observer (`runShadowCognition()` con output descartado)
- Pipeline operacional (v2.0, congelado)
- Learning operacional (ADR-003, congelado)

**Plano futuro (diseñado, sin implementación):**
- Memory (ADR-010, 14 invariantes futuros)
- Pattern Discovery (antes "Learning cognitivo", PR-7)
- API cognitiva (consumidor de Pattern Discovery)

Ya no existe un pipeline cognitivo lineal de 5 capas. El futuro es un grafo: EE produce ShadowResult que alimentará Memory, y Memory alimentará Pattern Discovery. Goals, Planning y Boundary fueron eliminados como entidades arquitectónicas.

A partir de este hito, el proyecto avanza hacia la implementación de **Memory** y **Pattern Discovery**, en ese orden, partiendo de un pipeline real que hoy solo descarta el output cognitivo.

---

*Documento generado al completarse PR-6H. Actualizado en PR-11 (2026-07-13). Actualizado en PR-11A (2026-07-13) — separación completa de plano presente/futuro, renombramiento Learning → Pattern Discovery, eliminación de Goals/Planning como capas. Próximo hito: Implementación de Memory.*
