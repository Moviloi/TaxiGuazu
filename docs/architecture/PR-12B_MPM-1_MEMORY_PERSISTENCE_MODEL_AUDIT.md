# PR-12B / MPM-1 — Memory Persistence Model Audit

> **Auditor:** Arquitecto de Software Senior especializado en arquitecturas cognitivas  
> **Propósito:** Determinar si el modelo de persistencia de Memory está completamente especificado para iniciar IM-1 (Memory Implementation)  
> **Metodología:** Auditoría adversarial — intentar demostrar que existen decisiones implícitas que impedirían una implementación correcta  
> **Documentos auditados:** ADR-010 (010-memory-architecture.md), ADR-011 (011-reflection-elimination.md), ARCHITECTURE_MILESTONE_v3.0.md, PR-7A…PR-7E, ARCHITECTURE_STATUS.md, ARR-1, código fuente (belief.ts, decision.ts)  
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Modelo de persistencia identificado](#2-modelo-de-persistencia-identificado)
3. [Hallazgos](#3-hallazgos)
4. [Riesgos](#4-riesgos)
5. [Recomendaciones](#5-recomendaciones)
6. [Veredicto final](#6-veredicto-final)

---

## 1. Resumen ejecutivo

Se realizó una auditoría adversarial completa del modelo de persistencia de Memory definido en ADR-010 y sus documentos satélite. El modelo aparenta estar completo: define 19 campos en el snapshot, 14 campos excluidos, 14 invariantes de diseño (M-1 a M-14), 10 reglas de contrato de escritura (C1-C10), y la unidad atómica (Belief + Decision pair).

**Sin embargo, debajo de esta aparente completitud, se encontraron 7 decisiones implícitas que un implementador no podría resolver sin tomar decisiones arquitectónicas no autorizadas.**

La más crítica es una **inconsistencia estructural entre tres definiciones del snapshot que coexisten en la documentación sin reconciliación**: MemorySnapshot (19 campos, ADR-010), ProjectedState (11 campos, ARCHITECTURE_MILESTONE_v3.0), y el dominio de entrada de Pattern Discovery (11 campos, PR-7B/PR-7D). Ningún documento explica la relación entre estas tres definiciones ni especifica la proyección necesaria de 19→11 campos.

**Veredicto: EXISTEN DECISIONES IMPLÍCITAS PENDIENTES**

---

## 2. Modelo de persistencia identificado

### 2.1 Lo que está especificado

| Aspecto | Especificación | Fuente |
|---------|---------------|--------|
| **Unidad atómica** | Belief + Decision pair, ambos obligatorios | ADR-010 §PR-5B |
| **Campos persistidos** | 19: 4 metadata + 8 Belief + 7 Decision | ADR-010 §PR-5B (líneas 141-173) |
| **Campos excluidos** | 14 campos de capas intermedias del EE | ADR-010 §PR-5B (líneas 199-214) |
| **Regla de exclusión** | Campo excluido requiere nuevo ADR si downstream lo necesita | ADR-010 §PR-5B (línea 216) |
| **Contrato de escritura** | 10 reglas (C1-C10), incluyendo tipos, guardas, excepciones | ADR-010 §PR-5C (líneas 345-356) |
| **Invariantes** | 14 (M-1 a M-14) | ADR-010 §PR-5B (líneas 233-248) |
| **Integración con orquestador** | Después de EE, antes de buildMemory() operacional | ADR-010 §PR-5C (líneas 273-312) |
| **Metadatos vs. cognitivo** | 4 campos de metadata (conversationId, memoryId, turnNumber, storedAt) vs. 15 cognitivos | ADR-010 §PR-5B |
| **Inmutabilidad** | Append-only, snapshots nunca se modifican | M-1, M-5 |
| **Partición** | conversationId como partition key | M-6 |
| **Monotonicidad** | turnNumber aumenta en +1 por snapshot por conversación | M-7 |

### 2.2 El modelo de persistencia NO está completo porque

7 decisiones arquitectónicas permanecen implícitas. El implementador no puede derivarlas de la documentación existente sin inventarlas.

---

## 3. Hallazgos

### Hallazgo 1 — Tres definiciones del snapshot, ninguna reconciliada

**Severidad: BLOQUEANTE**

La arquitectura define **tres modelos diferentes** para lo que Memory almacena y entrega:

| Modelo | Campos | Documento | Rol |
|--------|--------|-----------|-----|
| **MemorySnapshot** | **19** (4 metadata + 8 Belief + 7 Decision) | ADR-010 §PR-5B (líneas 141-173) | Lo que Memory persiste |
| **ProjectedState** | **11 analizables** | ARCHITECTURE_MILESTONE_v3.0 (línea 172), ADR-011 §2.5 (línea 101) | Lo que Memory entrega a Pattern Discovery |
| **Pattern Discovery input** | **11 campos** | PR-7B §1.1 (línea 35), PR-7D §Contrato 1 (líneas 71-76, línea 96) | Lo que Pattern Discovery procesa |

**Ningún documento especifica:**

- Cuáles son exactamente los 11 campos del ProjectedState
- Cómo se proyecta MemorySnapshot (19 campos) → ProjectedState (11 campos)
- Si Memory entrega 19 o 11 campos a Pattern Discovery
- Dónde ocurre la proyección (¿en Memory al servir? ¿en Pattern Discovery al recibir?)

**Evidencia textual:**

| Documento | Texto literal |
|-----------|--------------|
| ADR-010 §PR-5B (línea 178) | `**11 fields BELONG to the snapshot:**` (y lista 19 items) |
| ARCHITECTURE_MILESTONE_v3.0 (línea 172) | `**Input** | \`ProjectedState[]\` desde Memory (11 campos analizables)` |
| PR-7B §1.1 (línea 35) | `Memory produce snapshots. Cada snapshot es un punto en un espacio producto de 11 campos analizables (según Architecture Milestone v3.0).` |
| PR-7D §Contrato 1 (línea 96) | `Q4-ML | Los 11 campos analizables están presentes en cada snapshot` |
| ADR-011 §2.5 (línea 101) | `ProjectedState NO pertenece al dominio exclusivo de Memory. 9 de 11 campos provienen de EE.` |

El implementador no puede saber si debe:

1. **Almacenar 19 campos y proyectar a 11 al servir** — ¿cuáles 11? ¿los 4 metadata más 7 cognitivos? ¿15 cognitivos menos 4 no-analizables?
2. **Almacenar 11 campos directamente** — contradice ADR-010 que dice 19
3. **Almacenar 19 y entregar 19** — contradice PR-7B, PR-7D y Milestone v3.0 que dicen 11

**Impacto:** Cualquier elección del implementador será arquitectónicamente incorrecta según alguno de los documentos.

---

### Hallazgo 2 — ADR-010 se contradice a sí mismo en el conteo de campos

**Severidad: ALTA (confusión documental)**

ADR-010 §PR-5B contiene tres errores de conteo que impiden determinar cuántos campos debe tener el snapshot:

| Ubicación | Dice | Realidad |
|-----------|------|----------|
| Línea 151 (Belief block header) | `// Belief fields (11 belong)` | 8 campos listados |
| Línea 163 (Decision block header) | `// Decision fields (11 belong)` | 7 campos listados |
| Línea 178 (Field belonging rules header) | `**11 fields BELONG to the snapshot:**` | 19 items listados |

**Total de campos listados:**

```
1 conversationId      → metadata
2 memoryId            → metadata
3 turnNumber          → metadata
4 storedAt            → metadata
5 belief.id           → cognitive (identifier)
6 belief.observationValid → cognitive
7 belief.channel      → cognitive
8 belief.hasContent   → cognitive
9 belief.receivedAt   → cognitive
10 belief.conversationId → cognitive
11 belief.isWellFormed   → cognitive
12 belief.factCount      → cognitive
13 decision.id           → cognitive (identifier)
14 decision.validInput   → cognitive
15 decision.hasContent   → cognitive
16 decision.readiness    → cognitive
17 decision.missingInfo  → cognitive
18 decision.isDecided    → cognitive
19 decision.factCount    → cognitive
```

**Total: 19 campos.** No 11. No "11 + 11 = 22."

**Impacto:** Un implementador que lea el ADR encontrará tres afirmaciones contradictorias sobre cuántos campos persistir. Si sigue la lista (19), viola los encabezados. Si sigue los encabezados (11 cada bloque), no sabe qué 11 de 8 (Belief) o 11 de 7 (Decision).

---

### Hallazgo 3 — ProjectedState definido en documentos históricos pero ausente en ADR-010

**Severidad: ALTA (brecha entre documentos)**

El concepto de `ProjectedState` aparece en:

- **ARCHITECTURE_MILESTONE_v3.0**: La entrada de Pattern Discovery es `ProjectedState[]` con 11 campos analizables
- **ADR-011 §2.5**: `ProjectedState NO pertenece al dominio exclusivo de Memory. 9 de 11 campos provienen de EE.`

Pero **ADR-010 (el ADR de Memory) NO menciona ProjectedState**. ADR-010 define MemorySnapshot (19 campos) y nunca explica cómo se relaciona con ProjectedState (11 campos).

La contradicción es especialmente clara en ADR-011:
- Dice "9 de 11 campos provienen de EE" → implica que 2 campos son Memory-generated
- Pero ADR-010 tiene 3 Memory-generated fields: memoryId, turnNumber, storedAt

Si ADR-011 dice "9+2=11" y ADR-010 tiene 3 Memory fields, entonces la proyección 19→11 debe eliminar:
- 3 campos Memory de los 4 metadata → 1 metadata sobrevive? (¿cuál?)
- 8 campos de los 15 cognitivos → 7 se eliminan? (¿cuáles?)

Nada de esto está especificado. El ProjectedState es un concepto ontológico necesario pero su mapeo concreto nunca fue documentado en ADR-010.

**Impacto:** El implementador no puede diseñar la interfaz de consulta de Memory (qué devuelve a Pattern Discovery) sin resolver esta brecha.

---

### Hallazgo 4 — turnNumber tiene invariante (M-7) pero no fuente ni valor inicial

**Severidad: ALTA**

M-7 dice: `turnNumber increases by exactly 1 per snapshot per conversation`.

ADR-010 §PR-5B (línea 148) dice: `turnNumber: number — Monotonic within conversation`.

Pero no se especifica:

1. **Valor inicial del primer snapshot:** ¿0? ¿1? PR-7B §1.2 asume `turnNumber(sᵢ) = i`, lo que implica que el primer snapshot tiene turnNumber = 1. Pero ADR-010 no lo confirma.

2. **Fuente del turnNumber:** ADR-010 (línea 181) dice `turnNumber — monotonic counter (computed by Memory)`. Pero C1 dice que `store()` recibe solo `Belief + Decision + conversationId`. Memory no tiene acceso al último turnNumber sin leer su propio almacenamiento, lo que podría violar M-11 (no operational state) si se interpreta estrictamente.

3. **Manejo de turnos abortados:** Si el EE falla en el turno 3 (isComplete = false), ¿se consume un número de turno? Si la próxima snapshot exitosa tiene turnNumber = 3 (reutiliza), viola la inmutabilidad anterior. Si tiene turnNumber = 4 (salta), entonces no aumenta "exactly 1" entre snapshots almacenados.

**Evidencia adicional:** La búsqueda de `turnNumber.*initial\|turnNumber.*=.*1\|first.*turn` en la documentación no arrojó resultados. El valor inicial es completamente implícito.

**Impacto:** El implementador debe elegir entre turnNumber = 0 o 1, y entre leer el almacenamiento o recibir el contador externamente. Cualquier elección puede violar M-7 o M-11.

---

### Hallazgo 5 — Dos conversationIds coexisten sin distinción ontológica

**Severidad: MEDIA (riesgo de confusión)**

ADR-010 define:

1. **Partition key** (línea 144): `conversationId: string` — proviene del operacional `conversation.id` en lead.service.ts
2. **Belief field** (línea 158): `belief.conversationId: string | null` — proviene del EE, desde Knowledge, puede ser null

Ambos se llaman `conversationId` pero:
- Tienen fuentes diferentes (operacional vs. EE)
- Tienen tipos diferentes (string vs. string | null)
- Tienen propósitos diferentes (partición vs. contenido cognitivo)

El snapshot tiene `conversationId` (partición) en la raíz y `belief.conversationId` (cognitivo) dentro de belief. Pero la documentación no distingue explícitamente estos dos roles.

**Además:** ADR-010 C9 dice: "conversationId used EXCLUSIVELY as partition key — never for sorting, filtering, or semantic lookup." Pero `belief.conversationId` es un campo cognitivo que Pattern Discovery podría necesitar analizar. La regla C9 se aplica al partition key, no a `belief.conversationId` — pero la documentación no hace esta distinción.

**Impacto:** Un implementador podría:
- Usar `belief.conversationId` como partition key (cuando puede ser null)
- Aplicar la restricción C9 al `belief.conversationId` (impidiendo su uso cognitivo)
- No distinguir entre los dos al diseñar el esquema de almacenamiento

---

### Hallazgo 6 — El contrato de lectura (Memory → Pattern Discovery) no está definido como interfaz

**Severidad: ALTA (ARR-1 B2, reconfirmado)**

ADR-010 define exhaustivamente el path de escritura (C1-C10). Pero el path de lectura:

- ADR-010 (línea 57): `PatternDiscovery.read(window) → MemorySnapshot[]` — solo una línea conceptual
- PR-7D §Contrato 1: Define precondiciones y postcondiciones semánticas, pero NO la interfaz concreta

**No está definido:**

| Aspecto | Estado |
|---------|--------|
| Método de consulta | Solo conceptual (`read(window)`) |
| Criterios de filtro | No especificados |
| Proyección (¿19 o 11 campos?) | Sin resolver (Hallazgo 1) |
| Paginación | No definida |
| Ordenamiento | Ascendente (implícito en PR-7B) |
| Límites | No definidos |
| Ventana por defecto | No definida |

**Pero además de ARR-1**, este hallazgo revela que incluso si se definiera la interfaz, la pregunta de **19 vs. 11 campos** (Hallazgo 1) debe resolverse primero. El contrato de lectura no puede definirse sin saber qué datos entrega Memory a Pattern Discovery.

**Impacto:** Sin el contrato de lectura, el diseño del almacenamiento (esquema, índices, proyecciones) es especulativo. Cualquier implementación hoy requeriría refactorización cuando se defina la interfaz de consulta.

---

### Hallazgo 7 — M-12 sigue sin resolverse (ARR-1 B1, confirmado)

**Severidad: ALTA**

M-12 dice: "No defaults — every field in the snapshot comes from Belief or Decision."

Pero tres campos son Memory-generated:
- `memoryId` (UUID v4 generado por Memory) — ADR-010 línea 180: "generated by Memory"
- `turnNumber` (computed by Memory) — ADR-010 línea 181: "computed by Memory"
- `storedAt` (Memory timestamp) — ADR-010 línea 182: "timestamp of storage action"

ARR-1 ya identificó esta contradicción y recomendó agregar una excepción para metadatos. La resolución documental no se ha aplicado.

**Impacto:** Un implementador que cumpla M-12 literalmente no puede incluir memoryId, turnNumber ni storedAt. Un snapshot sin estos campos no tiene identidad, orden temporal ni monotonicidad. Memory no puede funcionar sin violar M-12.

---

## 4. Riesgos

### 4.1 Riesgos activos

| ID | Riesgo | Severidad | Descripción |
|----|--------|-----------|-------------|
| **R1** | ProjectedState inconsistente | 🔴 Crítico | 19 vs 11 campos sin proyección definida. Implementador elegirá arbitrariamente. |
| **R2** | Conteo de campos contradictorio | 🟠 Alto | ADR-010 dice "11" pero lista 19. El implementador no sabe cuál creer. |
| **R3** | turnNumber sin fuente ni inicial | 🟠 Alto | M-7 no implementable sin resolver origen del contador y valor inicial. |
| **R4** | Sin contrato de lectura | 🟠 Alto | Almacenamiento diseñado a ciegas. Refactorización garantizada cuando se defina. |
| **R5** | M-12 contradictorio | 🟠 Alto | ARR-1 B1 aún no resuelto. Memory no puede implementarse sin violar M-12. |
| **R6** | Dos conversationIds | 🟡 Medio | Riesgo de confusión entre partition key (operacional) y belief.conversationId (EE). |
| **R7** | Pattern Discovery podría necesitar Facts | 🟡 Medio | factCount preservado, Facts excluidos. Si PD necesita Facts (ej: patrones semánticos), requiere ADR. |

### 4.2 Riesgos mitigados por diseño

| ID | Riesgo | Mitigación |
|----|--------|------------|
| ~~R~~ | Snapshot incompleto | M-4 (isComplete guard), M-8 (atomic snapshot). Ambos verificables contractualmente. |
| ~~R~~ | Enriquecimiento accidental | M-9 (no enrichment). Principio de diseño. |
| ~~R~~ | Confusión con SessionMemory | Diferenciación explícita en ADR-010 §PR-5A (tabla comparativa). |
| ~~R~~ | receivedAt vs storedAt confusión | M-14 (temporal domain separation). Nombres de campo explícitos. |

---

## 5. Recomendaciones

### 5.1 Resolución de decisiones implícitas (precondiciones de IM-1)

Para que el modelo de persistencia esté completamente especificado, se requieren:

| # | Decisión implícita | Acción requerida | Documento |
|---|-------------------|-----------------|-----------|
| **D1** | Relación MemorySnapshot ↔ ProjectedState | Definir los 11 campos del ProjectedState y la regla de proyección 19→11. O unificar ambos conceptos. | ADR-010, Milestone v3.0 |
| **D2** | Conteo de campos correcto | Corregir los encabezados en ADR-010 §PR-5B: "Belief fields (8)", "Decision fields (7)", "19 fields BELONG to the snapshot." | ADR-010 |
| **D3** | Fuente de turnNumber | Decidir: ¿Memory lee su almacenamiento? ¿Recibe el contador como parámetro? ¿Usa contador externo? | ADR-010 |
| **D4** | Valor inicial de turnNumber | Especificar si el primer snapshot tiene turnNumber = 0 o 1. | ADR-010 |
| **D5** | Contrato de lectura | Definir interfaz, criterios de filtro, proyección, paginación y límites. | ADR-010 + PR-7D |
| **D6** | M-12 resuelto | Agregar excepción explícita para campos de metadata generados por Memory. | ADR-010 M-12 |
| **D7** | Dos conversationIds | Renombrar o documentar explícitamente la diferencia entre partition key y belief.conversationId. | ADR-010 |

### 5.2 Orden de resolución recomendado

```
D6 (M-12) → D1 (ProjectedState) → D2 (conteo campos) → D3+D4 (turnNumber) → D5 (contrato lectura) → D7 (conversationIds)
```

D6 debe resolverse primero porque bloquea cualquier implementación. D1 y D2 deben resolverse juntos porque están correlacionados (una vez que se definan los 11 campos del ProjectedState, ADR-010 puede actualizar sus conteos correctamente).

D5 (contrato de lectura) puede definirse después de D1, porque depende de saber qué datos se entregarán (¿ProjectedState de 11 campos o MemorySnapshot de 19?).

---

## 6. Veredicto final

### EXISTEN DECISIONES IMPLÍCITAS PENDIENTES

**Justificación:**

Se identificaron **7 decisiones arquitectónicas** que la documentación no resuelve. A diferencia de los bloqueos de ARR-1 (que eran condiciones impeditivas), estas son **decisiones implícitas** — aspectos del modelo de persistencia que la documentación existente no cubre y que un implementador tendría que inventar.

Las 7 decisiones se clasifican en tres categorías:

| Categoría | Decisiones | Impacto |
|-----------|-----------|---------|
| **Inconsistencias documentales** | D1 (19 vs 11 campos), D2 (conteo erróneo), D6 (M-12) | El implementador no sabe qué modelo seguir. Cualquier elección viola algún documento. |
| **Omisiones de especificación** | D3 (fuente turnNumber), D4 (valor inicial turnNumber), D5 (contrato lectura) | El implementador debe inventar decisiones arquitectónicas sin autoridad. |
| **Ambigüedades conceptuales** | D7 (dos conversationIds) | Riesgo de implementación incorrecta por confusión semántica. |

**La decisión más grave es D1:** el ecosistema documental completo (ADR-010, Milestone v3.0, PR-7B, PR-7D, PR-7E, ADR-011) contiene tres visiones diferentes de cuántos campos componen el snapshot que Memory entrega a Pattern Discovery. Ninguna es compatible con las otras sin una proyección no especificada.

**El modelo de persistencia está parcialmente especificado (19 campos, 14 excluidos, 14 invariantes, 10 reglas C) pero no completamente.** Las 7 decisiones implícitas deben resolverse documentalmente antes de que IM-1 pueda comenzar sin riesgo de refactorización arquitectónica.

### Contraste con ARR-1

ARR-1 encontró 5 bloqueos que impedían IM-1. MPM-1 encuentra 7 decisiones implícitas. Hay superposición parcial:

| Decisión/Issue | ARR-1 | MPM-1 | Relación |
|----------------|-------|-------|----------|
| M-12 contradictorio | B1 (bloqueo) | D6 (implícita) | Misma raíz |
| Contrato de lectura | B2 (bloqueo) | D5 (implícita) | Misma raíz |
| turnNumber sin fuente | B3 (bloqueo) | D3+D4 (implícitas) | Misma raíz, MPM-1 agrega D4 (valor inicial) |
| conversationId null | B4 (bloqueo) | — | MPM-1 lo confirma como riesgo R6 |
| ADR-009 §7 desactualizado | B5 (bloqueo) | — | MPM-1 no lo reevalúa |
| — | — | D1 (19 vs 11 campos) | **Nuevo en MPM-1** |
| — | — | D2 (conteo erróneo) | **Nuevo en MPM-1** |
| — | — | D7 (dos conversationIds) | **Nuevo en MPM-1** |

MPM-1 agrega 3 decisiones implícitas que ARR-1 no identificó (D1, D2, D7), refinando el diagnóstico de preparación de IM-1.

### Próximos pasos

| Paso | Acción | Decisiones resueltas |
|------|--------|---------------------|
| 1 | Resolver M-12 (ARR-1 B1 + MPM-1 D6) | D6 |
| 2 | Definir los 11 campos del ProjectedState y la proyección 19→11 | D1, D2 |
| 3 | Especificar fuente y valor inicial de turnNumber | D3, D4 |
| 4 | Definir contrato de lectura de Memory | D5 |
| 5 | Resolver ambigüedad de los dos conversationIds | D7 |
| 6 | Re-evaluar con ARR-2 antes de IM-1 | Todas |

---

*Fin de PR-12B / MPM-1 — Memory Persistence Model Audit*
