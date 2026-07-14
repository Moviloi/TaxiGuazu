# PDE-1 — Pattern Discovery Execution Architecture

> **Fecha:** 2026-07-14  
> **Precedencia:** POA-1 (ontología π = ⟨R, θ, E, D⟩), PAA-1 (Acceptance Contract), MRC-1 (MemoryRead), PBA-1 (Projection Boundary), OP-1 (Memory operacional)  
> **Driver:** Convertir el modelo epistemológico de Pattern Discovery en una arquitectura ejecutable  
> **Rol:** Arquitecto Principal — sistemas cognitivos

---

## Preámbulo

Pattern Discovery es una función formal `L_γ: 𝒲 → 𝒫(𝒞)` que transforma una ventana de snapshots cognitivos en un conjunto de Patterns aceptados.

POA-1 definió la **ontología** del Pattern. PAA-1 definió la **epistemología** de aceptación. MRC-1 definió el **contrato de lectura**. PBA-1 definió el **boundary de proyección**.

Este documento define la **arquitectura de ejecución**: cómo se activa, qué consume, qué produce, dónde persiste, cómo se observa.

**No se diseñan algoritmos. No se implementa código. No se modifican los elementos estabilizados.**

---

## Sección 1: Ciclo de ejecución

### 1.1 Modelos candidatos

Evaluación adversarial de cuatro modelos de activación. Se intenta eliminar cada uno.

---

#### Modelo A — Ejecución por conversación

**Enunciado:** PD se ejecuta cada vez que un snapshot es almacenado para una conversación, procesando solo los snapshots de esa conversación.

**Intento de refutación:**

*Refutación 1 — Incapacidad para detectar Patterns cross-conversación:*
PD debe detectar Patterns en dimensión `D='cross'` (POA-1 §3.3). Cross-conversación requiere evidencia de ≥ 2 conversaciones distintas. Ejecutando por conversación, una sola ejecución nunca alcanza n=2 conversaciones. El modelo es INSUFICIENTE para una dimensión completa de la ontología.

*Refutación 2 — Ventana insuficiente para D='intra' con n pequeño:*
Si PD se ejecuta tras cada snapshot, para conversaciones de 1-2 turnos la ventana W tiene tamaño 1-2. P-I8 exige n ≥ 2. Las primeras 1-2 ejecuciones son estériles.

*Refutación 3 — Crecimiento lineal del número de ejecuciones:*
Para 1,000 conversaciones con promedio de 3 snapshots cada una, PD se ejecuta 3,000 veces. Cada ejecución analiza 1-3 snapshots. La sobrecarga de invocación (leer de MemoryRead, inicializar, producir PatternSet, escribir en catálogo) es la misma para 1 snapshot que para 100. El rendimiento por snapshot procesado es pésimo.

*Refutación 4 — Imposibilidad de filtrar por múltiples comparaciones (F₄):*
F₄-c del Acceptance Contract requiere corrección por múltiples comparaciones. Con 1 conversación y ~3 snapshots, el número de relaciones evaluadas es pequeño (~C(11,2)=55 pares). Pero el número de conversaciones es grande. Ejecutar PD 1,000 veces significa 1,000 conjuntos de comparaciones sin corrección entre ellos. Cada ejecución individual tiene α_corregido = 0.05/55 ≈ 0.0009, pero a través de 1,000 ejecuciones, la tasa de falsos positivos global es mucho mayor de la nominal.

**✅ Refutación exitosa.** El modelo por conversación es arquitectónicamente inviable. Eliminado.

---

#### Modelo B — Ejecución por lote completo

**Enunciado:** PD se ejecuta sobre TODOS los snapshots disponibles, de todas las conversaciones, en una sola invocación.

**Intento de refutación:**

*Refutación 1 — Costo crece ilimitadamente:*
Si PD procesa todos los snapshots cada vez, el costo de L(W) crece con |W|. Para 16 snapshots es trivial. Para 1M snapshots en producción, cada ejecución procesa 1M snapshots. Esto no escala.

**Contraargumento:**
- La escala actual es 16 snapshots. PD es offline/batch (POA-1 N5). No corre en el path crítico. No hay requerimiento de latencia. Que el costo crezca con |W| es esperable para cualquier función de análisis. La optimización es un problema de implementación, no de arquitectura.
- Una implementación puede usar técnicas de windowing, muestreo o incrementalidad sin cambiar el contrato L: 𝒲 → 𝒫(𝒞). La arquitectura define el qué, no el cómo.

*Refutación 2 — Reprocesa datos que no cambiaron:*
Memory es append-only (M-1). Los snapshots viejos no cambian. Reprocesarlos cada vez es trabajo redundante.

**Contraargumento:**
- P-I7 (no-monotonía) significa que NUEVOS snapshots pueden INVALIDAR Patterns previos. Cada ejecución debe re-evaluar contra el conjunto completo. No hay garantía de que un Pattern aceptado en la ejecución anterior siga siendo válido.
- La re-evaluación completa es correcta por definición. La incrementalidad es una optimización que preserva corrección.

*Refutación 3 — No hay un "momento" natural para la ejecución:*
¿Cuándo se ejecuta? ¿Después de cada snapshot? ¿Cada hora? ¿Cada día?

**Contraargumento:**
- El disparador es externo a PD. PD expone una función invocable. Cómo y cuándo se invoca es responsabilidad del orquestador, no de PD.

**✅ Refutación fallida.** El modelo por lote completo es viable como CONTRATO. La implementación puede optimizar internamente. Pero como modelo de activación, depende de un disparador.

---

#### Modelo C — Ejecución periódica

**Enunciado:** PD se ejecuta en un intervalo fijo (ej. cada hora, cada día).

**Intento de refutación:**

*Refutación 1 — La periodicidad es arbitraria:*
No hay un intervalo "correcto." Si es muy corto, se ejecuta sin datos nuevos (waste). Si es muy largo, los Patterns están desactualizados.

**Contraargumento:**
- La periodicidad es CONFIGURABLE, no fija en la arquitectura. PD no decide el intervalo — el operador del sistema lo configura según su tolerancia a la latencia de descubrimiento.
- PD puede verificar si hay datos nuevos antes de ejecutar (watermark check). Si no hay, aborta temprano sin costo.

*Refutación 2 — PD no tiene estado interno (P-I6: inmutable), entonces periódico vs. evento es indistinto:*
PD produce PatternSet = L(W). Si se invoca cada hora o tras cada snapshot, el resultado es el mismo si W es el mismo. La diferencia es CUÁNDO se actualiza el catálogo.

**Contraargumento:**
- Correcto. Desde la perspectiva de PD, el ciclo de ejecución es irrelevante. La función es la misma. El ciclo es un asunto de INFRAESTRUCTURA, no de ARQUITECTURA.

**✅ Refutación fallida.** Periódico es viable, pero es una instancia del modelo general "trigger."

---

#### Modelo D — Híbrido (eventos + tiempo)

**Enunciado:** PD se ejecuta cuando ocurre un evento (N nuevos snapshots) O cuando expira un temporizador.

**Intento de refutación:**

*Refutación 1 — Complejidad innecesaria:*
Agrega lógica de orquestación (trigger por evento + trigger por tiempo) sin beneficio arquitectónico claro sobre un trigger simple.

**Contraargumento:**
- La complejidad del trigger es responsabilidad del orquestador, no de PD. PD expone una interfaz de función invocable. La lógica híbrida vive en el invocador.

*Refutación 2 — Los dos modos pueden disparar ejecuciones redundantes:*
Si N snapshots llegan justo antes del temporizador, PD se ejecuta dos veces seguidas con los mismos datos.

**Contraargumento:**
- El watermark check evita esto: si no hay snapshots nuevos desde la última ejecución, PD aborta inmediatamente. La redundancia es gratuita.

**✅ Refutación fallida.** El modelo híbrido es viable, pero la lógica híbrida vive fuera de PD.

---

### 1.2 Modelo seleccionado: Trigger + Watermark

**Ningún modelo de activación define la arquitectura de PD.** Todos son variantes del mismo patrón:

```
┌───────────┐     trigger     ┌──────────────────────┐
│ Trigger   │ ───────────────→│ Pattern Discovery    │
│ (cualquier│                 │                      │
│  origen)  │                 │ L(W) → PatternSet    │
└───────────┘                 └──────────────────────┘
                                       │
                                       │ escribe
                                       ▼
                               ┌──────────────┐
                               │ Pattern       │
                               │ Catalog       │
                               └──────────────┘
```

La arquitectura de PD requiere:

| Elemento | Decisión arquitectónica |
|:---------|------------------------|
| **Trigger** | **Externo.** PD expone una interfaz de invocación (CLI, API, función). Cómo se invoca no es responsabilidad de PD. |
| **Watermark** | **Interno de PD.** PD rastrea `last_processed_storedAt` para evitar reprocesar snapshots ya analizados. |
| **Frecuencia** | **Configurable.** El operador define el intervalo o condición de disparo. PD no impone una frecuencia. |

**El ciclo de ejecución no es una decisión arquitectónica de PD. Es una decisión operacional del depliegue.**

---

## Sección 2: Entrada — Consumo de MemoryRead

### 2.1 Contrato de entrada

PD consume MemoryRead para obtener la ventana W de snapshots:

```
PD.input(): W ⊆ MemorySnapshot[19]
         via MemoryRead.querySnapshots(...)
```

PD usa los siguientes parámetros de `QueryParams` (MRC-1 §2.1):

```typescript
const query: QueryParams = {
  timeRange: {
    from: watermarkLastStoredAt,  // desde el último snapshot procesado
    to: now                       // hasta el momento actual
  },
  order: {
    by: 'storedAt',
    direction: 'ASC'
  },
  pagination: {
    limit: 1000,     // máximo por página
    offset: 0
  }
};
```

### 2.2 Proyección interna (PBA-1 Modelo A)

PD recibe `MemorySnapshot[19]` y proyecta internamente a 11 campos analizables. Esta proyección ocurre en el borde de entrada de PD, antes de cualquier análisis:

```typescript
// Proyección interna de PD. No es una capa separada.
// Los 11 campos son un subconjunto de MemorySnapshot con nombres planos.
// El mapeo desde MemorySnapshot se define en projection.ts.
interface ProjectedState {
  // Metadata (3 campos)
  turnNumber: number;           // snapshot.turnNumber
  storedAt: Date;               // snapshot.storedAt
  conversationId: string;       // snapshot.conversationId

  // Belief (5 campos)
  observationValid: boolean;    // snapshot.belief.observationValid
  channel: string | null;       // snapshot.belief.channel
  hasContent: boolean;          // snapshot.belief.hasContent
  isWellFormed: boolean;        // snapshot.belief.isWellFormed
  factCount: number;            // snapshot.belief.factCount

  // Decision (3 campos)
  readiness: 'ready' | 'partial' | 'invalid';  // snapshot.decision.readiness
  isDecided: boolean;                            // snapshot.decision.isDecided
  factCountDecision: number;                     // snapshot.decision.factCount
}
```

**Los 11 campos están congelados en esta definición arquitectónica (PBA-1 Modelo A + PDE-1 §2.2).** Pattern Discovery proyecta estos 11 campos en el borde de entrada. Memory no participa en la proyección (PBA-1). Cualquier cambio en esta lista requiere revisión arquitectónica.

**Mapeo de campos excluidos (8):** Los 8 campos de MemorySnapshot no incluidos son `memoryId`, `belief.id`, `belief.receivedAt`, `belief.conversationId`, `decision.id`, `decision.validInput`, `decision.hasContent`, `decision.missingInfo`. Estos campos no son analizados por PD porque no contienen información relacional relevante para la detección de patrones (son identificadores internos, metadatos de sincronización o información redundante).

### 2.3 Definición de ventana W

La ventana W es el conjunto de snapshots que PD procesa en una ejecución.

**Arquitectónicamente:**

| Propiedad | Valor | Fundamento |
|:----------|:------|:-----------|
| **Contenido** | Snapshots desde watermark hasta storedAt máximo disponible | Incremental por defecto |
| **Orden** | Ascendente por storedAt | Consistente con M-7 (turnNumber monotónico) |
| **Tamaño máximo** | Configurable vía pagination limit | PD es offline; puede procesar en lotes |
| **Ventana completa vs. parcial** | PD procesa TODOS los snapshots disponibles (no muestrea, no subconjunta) | P-I8 exige n≥2, pero PD no decide qué snapshots excluir — el catálogo de invariantes decide qué relaciones excluir |
| **Ventana histórica en primera ejecución** | W = todos los snapshots existentes | No hay watermark previo |

### 2.4 Watermark: evitar reprocesamiento

PD mantiene un **watermark** como estado interno que persiste entre ejecuciones:

```
watermark = {
  lastStoredAt: string (ISO timestamp),  // storedAt del último snapshot procesado
  lastRunAt: string (ISO timestamp),     // cuándo se ejecutó PD por última vez
  totalSnapshotsProcessed: number        // acumulado (para métricas)
}
```

**Comportamiento:**

1. PD inicia. Lee watermark de Pattern Catalog (o lo crea con storedAt = null si es la primera ejecución).
2. PD consulta MemoryRead: `timeRange: { from: watermark.lastStoredAt }`.
3. Si `countSnapshots(timeRange)` = 0 → no hay datos nuevos. PD aborta. No escribe en catálogo.
4. Si hay datos nuevos, PD los lee, los combina con el estado interno (historial de snapshots locales), ejecuta L(W_completo), produce PatternSet.
5. Al finalizar, PD actualiza watermark con el storedAt más reciente procesado.
6. PD persiste watermark en Pattern Catalog.

**¿Por qué PD necesita mantener un historial local de snapshots si Memory ya los tiene?**

Porque P-I7 (no-monotonía) exige re-evaluar Patterns contra el conjunto COMPLETO. Si PD no conserva snapshots localmente, debe releerlos todos desde MemoryRead cada vez. El historial local evita esto. Es una optimización de IO, no un cambio de semántica.

**Alternativa:** PD relee todo de MemoryRead cada vez y no mantiene historial local. Correcto pero costoso. La arquitectura permite ambas; la implementación elige.

---

## Sección 3: Salida — El Pattern aceptado

### 3.1 Identidad del Pattern

Cada Pattern aceptado necesita una IDENTIDAD que sea:
- **Estable** entre ejecuciones (mismo R + D → mismo ID)
- **Determinística** (misma entrada → mismo ID)
- **No secuencial** (no depende del orden de ejecución)

**Decisión arquitectónica:** La identidad del Pattern es el **hash determinístico de (R, D)**.

```
patternId = H(R_description || D)
```

Donde:
- `H` es una función hash (SHA-256 o similar)
- `R_description` es una representación canónica de la relación (ej. `"channel=whatsapp → factCount≥1"`)
- `D` es la dimensión ontológica: `"intra"`, `"inter"`, `"cross"`

**Justificación:**
- Si dos ejecuciones de PD detectan la misma relación en la misma dimensión, producen el mismo ID. El Pattern es "el mismo" aunque θ y E cambien.
- Si la misma relación aparece en dos dimensiones (ej. intra vs. cross), tienen IDs distintos (son Patterns ontológicamente distintos).
- El ID no depende del orden de ejecución, del watermark, ni de la configuración del trigger.

### 3.2 Versionado del Pattern

Un Pattern puede ser REEMPLAZADO (P-I6: inmutable → reemplazado, no modificado). Cada reemplazo es una nueva VERSIÓN.

| Campo | Tipo | Significado |
|:------|:-----|:------------|
| `patternId` | `string` | Hash de (R, D). Estable entre ejecuciones. |
| `version` | `number` | Monotónico. 1 para la primera aceptación de este patternId. Se incrementa cuando PD produce un Pattern con el mismo patternId pero diferente composición (θ, E). |
| `runId` | `string` | ID de la ejecución de PD que produjo esta versión. |
| `producedAt` | `string` | Timestamp ISO de producción. |

**Regla de versionado:** Una nueva versión se crea si y solo si el Pattern producido por L(W) tiene el mismo patternId (R, D) pero difiere en θ o E significativamente (δθ > ε o E contiene snapshots no presentes en la versión anterior). Si θ y E son equivalentes, no se crea nueva versión.

### 3.3 Formato completo del Pattern aceptado

```typescript
interface AcceptedPattern {
  // ── Identidad ──
  id: string;             // H(R || D)
  version: number;        // 1, 2, 3...

  // ── Componentes ontológicos (π = ⟨R, θ, E, D⟩) ──
  relation: {             // R
    description: string;            // Representación legible: "channel=whatsapp → factCount≥1"
    variables: [string, string];    // Variables involucradas: ["channel", "factCount"]
    type: 'implication' | 'correlation' | 'trend' | 'stability';
  };
  confidence: number;     // θ ∈ [0, 1]
  evidence: {             // E
    snapshotCount: number;          // |E|
    conversationCount: number;      // Conversaciones distintas en E
    timeRange: { from: string; to: string };  // Rango temporal de E
    support: number;                // |E| / |W_completo| (proporción del total)
  };
  dimension: 'intra' | 'inter' | 'cross';  // D

  // ── Metadata de aceptación ──
  acceptance: {
    runId: string;              // ID de ejecución de PD
    producedAt: string;         // Timestamp ISO
    filters: {                  // Resultado de Acceptance Contract (PAA-1)
      F1_empirical: {
        passed: boolean;
        n: number;
        coverage: number;       // conversaciones distintas
      };
      F2_nonTrivial: {
        passed: boolean;
        catalogVersion: string; // versión del catálogo de invariantes usado
      };
      F3_independence: {
        passed: boolean;
        derivedFrom?: string[]; // patterns de los que se derivaría (si falló)
      };
      F4_nonCoincidence: {
        passed: boolean;
        pValue: number;
        correctedP: number;
        lift: number;
      };
    };
  };

  // ── Estado ──
  status: 'active' | 'superseded' | 'deprecated';
  supersededBy?: string;    // patternId + version que reemplazó a este
  deprecatedAt?: string;
}
```

### 3.4 Salida de una ejecución: PatternRun

Cada ejecución de PD produce:

```typescript
interface PatternRun {
  runId: string;                    // UUID
  triggeredAt: string;              // Cuándo se invocó PD
  startedAt: string;                // Cuándo empezó L(W)
  completedAt: string;              // Cuándo terminó L(W)
  watermark: {                      // Estado del watermark post-ejecución
    lastStoredAt: string;
    lastRunAt: string;
    totalSnapshotsProcessed: number;
  };
  patterns: {                       // Patrones en esta ejecución
    accepted: AcceptedPattern[];    // Nuevos + actualizados
    candidates: string[];           // patternIds de candidatos (relaciones que pasaron F₁)
    deprecated: string[];           // patternIds de patterns que dejaron de ser válidos
  };
  metrics: {                        // Métricas de la ejecución
    durationMs: number;
    relationsEvaluated: number;
    memoryReadCalls: number;
    snapshotsRead: number;
  };
}
```

---

## Sección 4: Persistencia — Pattern Catalog

### 4.1 ¿Dónde vive el catálogo?

**Decisión arquitectónica:** El Pattern Catalog es una capa de persistencia INDEPENDIENTE de Memory. No comparte tabla, esquema ni base de datos con `cognitive_memory_snapshots`.

**Fundamento:**

| Razón | Detalle |
|:------|:--------|
| **Tipo de datos distinto** | MemorySnapshots son 1er orden, inmutables, append-only. Patterns son 2do orden, versionados, mutables (nuevas versiones reemplazan viejas). |
| **Ciclo de vida distinto** | MemorySnapshots se escriben una vez y no cambian. Patterns se re-evalúan y versionan continuamente. |
| **Independencia operacional** | Memory puede estar activa sin PD. PD puede estar activa sin escribir en el catálogo (ej. modo dry-run). El catálogo no debe acoplar a PD con Memory. |
| **P-I9** | PD nunca escribe en Memory. El catálogo es un nuevo artifact, no parte de Memory. |

**Implementación sugerida:** SQLite local (archivo `pattern_catalog.db` o similar) en el mismo entorno donde se ejecuta PD. No requiere infraestructura de red, no depende de Turso/PostgreSQL. PD es offline/batch; SQLite es suficiente.

### 4.2 Responsabilidades del Pattern Catalog

| # | Responsabilidad | Fundamento |
|:-:|-----------------|:-----------|
| CRUD-1 | **Almacenar Patterns aceptados** con toda su estructura (§3.3) | La salida de PD debe persistir |
| CRUD-2 | **Versionar Patterns** — conservar historial de versiones por patternId | Trazabilidad de cambios en Patterns |
| CRUD-3 | **Almacenar candidatos** — relaciones que pasaron F₁ pero no el Acceptance Contract completo | PAA-1 §8.5: candidatos se conservan para re-evaluación |
| CRUD-4 | **Almacenar el watermark** de PD | Estado de procesamiento entre ejecuciones |
| CRUD-5 | **Almacenar el catálogo de invariantes** (F₂) | F₂ necesita un catálogo vivo (PAA-1 §6.4) |
| CRUD-6 | **Consultar el último PatternRun** | Consumidores necesitan el estado más reciente |
| CRUD-7 | **Consultar Patterns por dimensión, confidence, status** | Filtros para consumidores (Learning, Goals) |
| CRUD-8 | **Soportar dry-run** — PD puede ejecutar sin escribir en el catálogo | Desarrollo, testing, auditoría |

### 4.3 NO responsabilidades del Pattern Catalog

| # | NO Responsabilidad | Por qué |
|:-:|--------------------|---------|
| N-CRUD-1 | **No almacena MemorySnapshots** | Esa es responsabilidad de Memory |
| N-CRUD-2 | **No implementa lógica de aceptación** | PD decide qué aceptar; el catálogo solo persiste |
| N-CRUD-3 | **No es un bus de eventos** | No notifica a consumidores cuando hay nuevos Patterns |
| N-CRUD-4 | **No es una cola** | No hay procesamiento asíncrono de Patterns |
| N-CRUD-5 | **No es una API HTTP** | PD es offline; el catálogo es local a PD |
| N-CRUD-6 | **No computa proyecciones** | No deriva nuevos datos; solo almacena lo que PD produce |

### 4.4 Esquema lógico del Pattern Catalog

```
TABLE patterns:
  id              TEXT PRIMARY KEY,    -- H(R || D)
  version         INTEGER NOT NULL,
  run_id          TEXT NOT NULL,
  produced_at     TEXT NOT NULL,       -- ISO timestamp
  dimension       TEXT NOT NULL,       -- 'intra' | 'inter' | 'cross'
  confidence      REAL NOT NULL,
  relation_json   TEXT NOT NULL,       -- R serialized as JSON
  evidence_json   TEXT NOT NULL,       -- E metadata as JSON
  acceptance_json TEXT NOT NULL,       -- Acceptance metadata as JSON
  status          TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'superseded' | 'deprecated'
  superseded_by   TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(runId)

TABLE runs:
  run_id          TEXT PRIMARY KEY,
  triggered_at    TEXT NOT NULL,
  started_at      TEXT NOT NULL,
  completed_at    TEXT,
  watermark_json  TEXT NOT NULL,
  metrics_json    TEXT NOT NULL

TABLE candidates:
  id              TEXT PRIMARY KEY,    -- H(R || D) (mismo scheme que patterns)
  first_seen_at   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL,
  observation_count INTEGER NOT NULL,  -- cuántas ejecuciones han visto esta relación
  relation_json   TEXT NOT NULL,
  dimension       TEXT NOT NULL,
  best_confidence REAL NOT NULL,       -- θ máximo observado
  best_evidence   TEXT NOT NULL        -- metadata de la mejor evidencia

TABLE invariant_catalog:
  id              TEXT PRIMARY KEY,
  description     TEXT NOT NULL,
  source          TEXT NOT NULL,       -- 'EE' | 'Memory' | 'Contract' | 'Schema'
  rule_ref        TEXT NOT NULL,       -- referencia al documento fuente
  active_since    TEXT NOT NULL,
  active_until    TEXT,                -- null si sigue activo
  hash            TEXT NOT NULL        -- hash de (description) para comparación rápida
```

### 4.5 Ciclo de vida del Pattern Catalog

```
1ra ejecución de PD:
  - Crea tablas (patterns, runs, candidates, invariant_catalog)
  - Inicializa watermark con lastStoredAt = null
  - Lee MemoryRead desde el origen
  - Produce PatternRun y escribe patterns
  - Actualiza watermark

Ejecuciones subsiguientes:
  - Lee watermark
  - Consulta MemoryRead desde watermark
  - Si no hay datos nuevos → aborta (no escribe)
  - Si hay datos nuevos:
    - Lee patterns existentes del catálogo
    - Lee candidatos existentes
    - Ejecuta L(W)
    - Marca patterns previos como 'superseded' si ya no son válidos
    - Inserta nuevas versiones de patterns
    - Actualiza candidatos (nuevos, promovidos, descartados)
    - Actualiza watermark
```

---

## Sección 5: Observabilidad

### 5.1 Métricas de salud operacional

| Métrica | Tipo | Descripción | Cardinalidad |
|:--------|:-----|:------------|:-------------|
| `pd.runs.total` | Counter | Ejecuciones totales de PD | 0..∞ |
| `pd.runs.duration_ms` | Histogram | Duración de ejecución | por run |
| `pd.runs.snapshots_read` | Gauge | Snapshots leídos en esta ejecución | por run |
| `pd.runs.snapshots_new` | Gauge | Snapshots nuevos desde último watermark | por run |
| `pd.runs.relations_evaluated` | Gauge | Relaciones candidatas evaluadas | por run |
| `pd.runs.patterns_accepted` | Gauge | Patterns aceptados en esta ejecución | por run |
| `pd.runs.patterns_deprecated` | Gauge | Patterns deprecados en esta ejecución | por run |
| `pd.runs.candidates_pending` | Gauge | Candidatos en el catálogo | 0..∞ |
| `pd.runs.status` | Enum | `success`, `aborted_no_data`, `failed` | por run |
| `pd.memory.read_calls` | Counter | Llamadas a MemoryRead | 0..∞ |
| `pd.memory.read_duration_ms` | Histogram | Duración de llamadas a MemoryRead | por llamada |
| `pd.catalog.size` | Gauge | Total de Patterns en catálogo (activos) | 0..∞ |
| `pd.catalog.candidates_size` | Gauge | Total de candidatos | 0..∞ |

### 5.2 Métricas cognitivas

| Métrica | Tipo | Descripción |
|:--------|:-----|:------------|
| `pd.patterns.by_dimension` | Gauge (etiquetada) | Conteo de patterns por D: intra, inter, cross |
| `pd.patterns.by_confidence` | Histogram | Distribución de θ entre patterns activos |
| `pd.patterns.avg_evidence_size` | Gauge | Tamaño promedio de evidencia E entre patterns activos |
| `pd.patterns.by_status` | Gauge (etiquetada) | Conteo por status: active, superseded, deprecated |
| `pd.candidates.promotion_rate` | Counter | Tasa de candidatos que se convierten en patterns |
| `pd.discovery.new_per_run` | Gauge | Patterns nuevos (nunca antes vistos) por ejecución |

### 5.3 Eventos

| Evento | Disparo | Payload |
|:-------|:--------|:--------|
| `pd.started` | Inicio de ejecución | `{ runId, triggeredAt, snapshotsToRead }` |
| `pd.completed` | Ejecución exitosa | `{ runId, durationMs, patternsAccepted, patternsDeprecated }` |
| `pd.aborted` | Sin datos nuevos | `{ runId, reason: "no_new_snapshots" }` |
| `pd.failed` | Error en ejecución | `{ runId, error, errorPhase }` |
| `pd.pattern.accepted` | Nuevo pattern aceptado | `{ patternId, version, dimension, confidence }` |
| `pd.pattern.superseded` | Pattern reemplazado | `{ patternId, oldVersion, newVersion, reason }` |
| `pd.pattern.deprecated` | Pattern deprecado | `{ patternId, version, reason }` |
| `pd.candidate.promoted` | Candidato → Pattern | `{ candidateId, dimension, confidence }` |
| `pd.invariant.updated` | Catálogo de invariantes modificado | `{ invariantId, action: 'added'|'removed', source }` |

### 5.4 Forma de las métricas

Las métricas y eventos se emiten en texto estructurado (JSON) a stdout/stderr. PD no implementa un sistema de métricas propio — emite eventos y un recolector externo (Prometheus, OpenTelemetry, etc.) los captura.

```
// Ejemplo de evento
{"event":"pd.completed","runId":"abc123","durationMs":1450,"patternsAccepted":3,"patternsDeprecated":1}
```

**Decisión arquitectónica:** PD no depende de un sistema de métricas específico. Emite logs estructurados. El operador decide cómo recolectarlos. Esto mantiene PD independiente de infraestructura.

---

## Sección 6: Arquitectura completa de Pattern Discovery

### 6.1 Diagrama de flujo

```
                    ╔════════════════╗
                    ║   Disparador   ║  (cron, evento, CLI, API — externo a PD)
                    ╚═══════╤════════╝
                            │ trigger
                            ▼
┌──────────────────────────────────────────────────────────┐
│                    Pattern Discovery                      │
│                                                          │
│  1. Leer watermark del Pattern Catalog                   │
│  2. Consultar MemoryRead (snapshots desde watermark)     │
│  3. ¿Hay snapshots nuevos?                               │
│     ├── No → abortar (evento: pd.aborted)                │
│     └── Sí → continuar                                   │
│  4. Proyectar 19→11 internamente (PBA-1)                │
│  5. Cargar historial de snapshots (local o MemoryRead)   │
│  6. Detectar relaciones candidatas                       │
│  7. Aplicar Acceptance Contract (F₁ ∧ F₂ ∧ F₃ ∧ F₄)     │
│  8. Comparar con Patterns existentes en catálogo         │
│  9. Producir PatternRun                                  │
│  10. Escribir en Pattern Catalog                         │
│      - Nuevas versiones de Patterns                      │
│      - Patterns deprecados                               │
│      - Candidatos actualizados                           │
│  11. Actualizar watermark                                │
│  12. Emitir eventos y métricas                           │
│                                                          │
└──────────────────────┬───────────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
   ┌────────────┐ ┌──────────┐ ┌──────────────┐
   │ MemoryRead │ │ Pattern  │ │   stdout/    │
   │ (MRC-1)    │ │ Catalog  │ │   stderr     │
   │            │ │ (PDE-1)  │ │ (eventos)    │
   └────────────┘ └──────────┘ └──────────────┘
```

### 6.2 Interfaces arquitectónicas

```
┌──────────────────────────────────────────────────────────┐
│                    Pattern Discovery                      │
│                                                          │
│  Entrada:   MemoryRead.querySnapshots(params) → MS[]    │
│             PatternCatalog.readWatermark() → Watermark   │
│             PatternCatalog.readExistingPatterns() → P[]  │
│             InvariantCatalog.read() → Invariant[]        │
│                                                          │
│  Proceso:   L(W) = Select_γ(Detect_γ(W))                │
│             Select_γ = F₁ ∧ F₂ ∧ F₃ ∧ F₄                │
│                                                          │
│  Salida:    PatternCatalog.writeRun(run)                 │
│             PatternCatalog.writePatterns(patterns)        │
│             PatternCatalog.writeCandidates(candidates)    │
│             PatternCatalog.writeWatermark(watermark)     │
│             stdout/stderr (eventos, métricas)            │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Invariantes de ejecución

| ID | Invariante | Fundamento |
|:--:|:-----------|:-----------|
| **E-I1** | **Trigger externo** — PD no se auto-ejecuta. Recibe invocación externa. | PD es offline/batch, no es un servicio. |
| **E-I2** | **Watermark presente** — Toda ejecución exitosa actualiza el watermark. | Sin watermark, la próxima ejecución reprocesa todo. |
| **E-I3** | **Read-only sobre Memory** — PD solo llama a MemoryRead. Nunca escribe en Memory. | P-I9, M-1, PBA-1. |
| **E-I4** | **Pattern Catalog independiente** — PD no escribe en la DB de Memory. | Separación de concerns. Tipos de datos distintos. |
| **E-I5** | **Cada Pattern tiene identidad única** — Determinística por (R, D). | Sin identidad estable, no hay versionado. |
| **E-I6** | **Versionado monotónico** — patternId + version es único en el catálogo. | version es monotónico para cada patternId. |
| **E-I7** | **Invocación determinística** — Dado el mismo W, PD produce el mismo PatternSet. | L es función pura. P-I6. |
| **E-I8** | **No mutación** — PD nunca modifica un Pattern existente. Crea nueva versión o depreca. | P-I6: inmutable. Solo reemplazado. |
| **E-I9** | **Eventos sin dependencia** — PD emite eventos a stdout/stderr sin depender de un sistema externo. | Independencia de infraestructura. |
| **E-I10** | **Candidatos preservados** — PD nunca elimina candidatos sin registrar la razón. | PAA-1 §8.5: conservación de candidatos. |

### 6.4 Dependencias arquitectónicas

```
Pattern Discovery ───→ MemoryRead (MRC-1)
                 ───→ MemorySnapshot[19] (ADR-010, IM-1)
                 ───→ Pattern Catalog (PDE-1) — nuevo artifact
                 ───→ Invariant Catalog (PAA-1) — parte del Pattern Catalog

Pattern Discovery NO depende de:
                 ───→ Goals (no existe aún)
                 ───→ Learning (no existe aún)
                 ───→ Evidence Engine (ADR-009 offline)
                 ───→ Infrastructure de Memory (DB, pools)
```

---

## Sección 7: Prueba de completitud

### 7.1 ¿Qué necesita un implementador para construir PD?

| Elemento | Estado | Documento |
|:---------|:------|:----------|
| **Qué es un Pattern** | ✅ Definido | POA-1: π = ⟨R, θ, E, D⟩ |
| **Cuándo aceptarlo** | ✅ Definido | PAA-1: F₁ ∧ F₂ ∧ F₃ ∧ F₄ |
| **Cómo obtener datos** | ✅ Definido | MRC-1: MemoryRead.querySnapshots() |
| **Qué campos analizar** | ✅ Definido | PBA-1: PD proyecta 19→11 internamente |
| **Cuándo ejecutar** | ✅ Definido | PDE-1: trigger externo, watermark interno |
| **Qué produce** | ✅ Definido | PDE-1: Pattern con id, version, componentes ontológicos, metadata de aceptación |
| **Dónde almacenar** | ✅ Definido | PDE-1: Pattern Catalog (independiente de Memory) |
| **Cómo monitorear** | ✅ Definido | PDE-1: 16 métricas, 9 eventos, stdout estructurado |
| **Qué invariantes cumplir** | ✅ Definido | PDE-1: E-I1 a E-I10 |

### 7.2 Decisiones arquitectónicas pendientes

| Aspecto | Estado | Explicación |
|:--------|:------|:------------|
| **Algoritmo de detección** (Detect_γ) | ⏳ Implementación | La arquitectura define que PD detecta relaciones. CÓMO detectarlas es algorítmico. |
| **Cálculo de θ** | ⏳ Implementación | La arquitectura define que θ ∈ [0,1]. CÓMO computarlo es algorítmico. |
| **Evaluación de F₁-F₄** | ⏳ Implementación | El Acceptance Contract define QUÉ evaluar. CÓMO implementar cada filtro es algorítmico. |
| **Test estadístico exacto** (F₄) | ⏳ Implementación | El contrato exige corrección por comparaciones múltiples. El método específico es algorítmico. |
| **11 campos exactos de proyección** | ✅ Congelado | PDE-1 §2.2 define los 11 campos exactos con mapeo desde MemorySnapshot. PD-IM-1 implementa esta proyección sin ambigüedad. |
| **Representación de R** (relation) | ⏳ Implementación | La arquitectura define R como relación entre variables. El formato concreto (árbol, tupla, DSL) es algorítmico. |
| **Formato de almacenamiento del catálogo** | ⏳ Implementación | La arquitectura define esquema lógico y responsabilidades. SQLite, JSON, o DB es decisión de implementación. |

### 7.3 Veredicto

Todas las decisiones arquitectónicas necesarias para implementar Pattern Discovery están tomadas:

1. **Ontología** — POA-1: qué es un Pattern
2. **Aceptación** — PAA-1: cuándo es válido
3. **Entrada** — MRC-1 + PBA-1: cómo obtener y proyectar datos
4. **Ejecución** — PDE-1: ciclo, watermark, identidad, versionado
5. **Persistencia** — PDE-1: Pattern Catalog, esquema, responsabilidades
6. **Observabilidad** — PDE-1: métricas, eventos, invariantes

> ## READY FOR IMPLEMENTATION
>
> **Pattern Discovery puede implementarse sin decisiones arquitectónicas adicionales.**
>
> Las decisiones restantes (algoritmos de detección, cálculo de θ, test estadístico, formato de R) son **decisiones de implementación**, no arquitectónicas. La arquitectura define el QUÉ y el POR QUÉ. El CÓMO pertenece a la implementación.

---

*Fin de PDE-1 — Pattern Discovery Execution Architecture*
