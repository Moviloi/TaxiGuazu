# MRC-1 — Memory Read Contract Architecture

> **Fecha:** 2026-07-14  
> **Estado:** Diseño arquitectónico — NO implementado  
> **Precedencia:** ADR-010 (Memory Architecture), PR-12D/MCR-1 (β resolution: MemorySnapshot[19])  
> **Driver:** Contrato de lectura requerido por Pattern Discovery (PR-7, futuro)  
> **Rol:** Arquitecto Principal especializado en arquitecturas cognitivas y contratos de acceso a datos

---

## Preámbulo

Memory posee un contrato de escritura consolidado (`MemoryStorage.insert()`, `MemoryService.store()`). No posee un contrato de lectura. Este documento define arquitectónicamente el contrato de lectura que utilizarán las futuras capas cognitivas (Pattern Discovery, observabilidad, debugging) para consultar snapshots cognitivos.

**No se implementa código. No se diseña Pattern Discovery. No se modifican contratos existentes.**

---

## 1. Responsabilidad de Read

### 1.1 Responsabilidades QUE POSEE

| # | Responsabilidad | Justificación |
|:-:|-----------------|---------------|
| R1 | **Recuperar snapshots cognitivos** (MemorySnapshot[19]) desde el almacenamiento persistente | Función primaria del contrato |
| R2 | **Filtrar por conversationId** como partition key | M-6: el particionado por conversación es la estructura fundamental |
| R3 | **Filtrar por ventanas temporales** (storedAt) | Los consumidores necesitan rangos de tiempo |
| R4 | **Filtrar por rangos de turnNumber** | Los consumidores necesitan secuencias específicas |
| R5 | **Filtrar por readiness y isDecided** | Los consumidores necesitan snapshots según calidad cognitiva |
| R6 | **Ordenar resultados** por turnNumber o storedAt, ASC o DESC | Consistencia en la entrega de datos |
| R7 | **Paginación** (limit + offset) | Control de volumen de datos |
| R8 | **Retornar count total** para paginación | El consumidor necesita saber cuántos snapshots califican |
| R9 | **Garantizar append-only como invariante observable** | El consumidor confía en que los datos no mutan |
| R10 | **Mantener independencia del almacenamiento** | La interfaz abstracta permite cambiar la implementación (SQLite/Turso → futuro) |

### 1.2 Responsabilidades QUE NO POSEE

| # | NO Responsabilidad | Justificación |
|:-:|--------------------|---------------|
| N1 | **No transforma datos** — Read retorna MemorySnapshot[19] sin proyección, sin agregación, sin análisis | M-9: No enrichment. Read es data access, no data processing. |
| N2 | **No computa proyecciones** — No produce ProjectedState[11] ni ningún otro formato derivado | La proyección es responsabilidad del consumidor (Pattern Discovery) |
| N3 | **No descubre patrones** — No implementa Pattern Discovery ni ningún análisis cross-turn | Límite arquitectónico claro: Read → MemorySnapshot[], PD → Pattern[] |
| N4 | **No escribe ni modifica datos** — Read-only por definición | M-1: Append-only. Read violaría la invariante si mutara datos. |
| N5 | **No cross-conversación semántico** — No permite JOINs entre conversationId ni búsqueda por contenido | C9: conversationId es partition key, no semantic key |
| N6 | **No acceso a datos operacionales** — No consulta chat_sessions, conversations, messages | C8: Memory no lee DB operacional |
| N7 | **No caching** — No mantiene estado interno ni caché de consultas | M-11: No operational state |
| N8 | **No delta computation** — No calcula diferencias entre snapshots consecutivos | M-13: Sin delta precomputation. Es responsabilidad del consumidor. |

---

## 2. Modelo de Read

### 2.1 Contrato formal

```typescript
// ─────────────────────────────────────────────────────────────────────────
// MemoryRead — Contrato de lectura de snapshots cognitivos
// ─────────────────────────────────────────────────────────────────────────

interface MemoryRead {
  /**
   * Consulta snapshots cognitivos con filtros, orden y paginación.
   *
   * Retorna MemorySnapshot[19] — el snapshot completo, sin proyección.
   * Los consumidores (Pattern Discovery, observabilidad) proyectan según
   * necesidad los 11 campos analizables; Read no realiza la proyección.
   *
   * @param params — Filtros, orden y paginación
   * @returns QueryResult — snapshots + metadata de paginación
   */
  querySnapshots(params: QueryParams): Promise<QueryResult>;

  /**
   * Obtiene un snapshot específico por clave primaria.
   *
   * @param conversationId — Partition key
   * @param turnNumber — Monotonic counter dentro de la conversación
   * @returns MemorySnapshot o null si no existe
   */
  getSnapshot(conversationId: string, turnNumber: number): Promise<MemorySnapshot | null>;

  /**
   * Obtiene todos los snapshots de una conversación, ordenados por
   * turnNumber ASC (orden de ocurrencia natural).
   *
   * @param conversationId — Partition key
   * @param opts — Opcional: límite y offset para paginación
   * @returns MemorySnapshot[] — vacío si la conversación no existe
   */
  getConversationSnapshots(
    conversationId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<MemorySnapshot[]>;

  /**
   * Cuenta snapshots que cumplen los filtros especificados.
   * Útil para paginación y monitoreo.
   *
   * @param filter — Filtros opcionales (conversationId, timeRange)
   * @returns Número total de snapshots que cumplen el filtro
   */
  countSnapshots(filter?: {
    conversationId?: string;
    timeRange?: TimeRange;
  }): Promise<number>;
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos de soporte
// ─────────────────────────────────────────────────────────────────────────

interface QueryParams {
  /** Filtro por conversationId (partition key) */
  conversationId?: string;

  /** Rango de turnNumber */
  turnNumberRange?: {
    min?: number;  // inclusive
    max?: number;  // inclusive
  };

  /** Rango temporal de storedAt */
  timeRange?: TimeRange;

  /** Filtros por campos del snapshot */
  filters?: SnapshotFilters;

  /** Orden de resultados */
  order?: {
    by: 'turnNumber' | 'storedAt';
    direction: 'ASC' | 'DESC';
  };

  /** Paginación */
  pagination?: {
    limit: number;   // máximo snapshots por página (default: 50, max: 1000)
    offset: number;  // desplazamiento (default: 0)
  };
}

interface TimeRange {
  from?: Date;  // inclusive (storedAt >= from)
  to?: Date;    // inclusive (storedAt <= to)
}

interface SnapshotFilters {
  /** Uno o más niveles de readiness */
  decisionReadiness?: CognitiveReadiness[];

  /** Filtro por decisión tomada vs. no tomada */
  isDecided?: boolean;

  /** Filtro por presencia de contenido en Belief */
  beliefHasContent?: boolean;

  /** Filtro por well-formedness de Belief */
  beliefIsWellFormed?: boolean;

  /** Filtro por canal */
  channel?: string;
}

interface QueryResult {
  /** Array de snapshots que cumplen los criterios */
  snapshots: MemorySnapshot[];

  /** Total de snapshots que cumplen los criterios (sin paginación) */
  total: number;

  /** Indica si hay más páginas disponibles */
  hasMore: boolean;
}
```

### 2.2 Explicación del diseño

| Aspecto | Decisión | Fundamento |
|---------|----------|------------|
| **Tipo de retorno** | `MemorySnapshot[19]` | La fuente de verdad completa. El consumidor proyecta. Ver §5. |
| **Separación de interfaces** | `MemoryRead` ≠ `MemoryStorage` | Responsabilidades diferentes. Write evoluciona independientemente de Read. |
| **querySnapshots() como método principal** | Un único punto de entrada con filtros | Flexibilidad máxima. Los métodos específicos (getSnapshot, getConversationSnapshots) son atajos de conveniencia. |
| **Paginación obligatoria** | Límite default 50, máximo 1000 | Protección contra consultas descontroladas en producción. |
| **Filtros opcionales** | Todos los parámetros son opcionales | `querySnapshots({})` retorna todos los snapshots (con paginación). |
| **Sin filtro semántico** | No se filtran por contenido de campos | C9: conversationId es partition key. Los filtros booleanos (isDecided, hasContent) son estructurales, no semánticos. |
| **countSnapshots separado** | No acoplado a querySnapshots | `count` sin datos es más eficiente (SELECT COUNT(*) vs SELECT *). |

### 2.3 Comportamiento esperado

| Escenario | Comportamiento |
|-----------|----------------|
| Sin filtros | Retorna todos los snapshots paginados (default: primeros 50, ordenados por storedAt DESC) |
| Solo conversationId | Retorna snapshots de esa conversación ordenados por turnNumber ASC |
| conversationId + turnNumberRange | Retorna el rango específico de turnos |
| timeRange solo | Retorna snapshots en esa ventana temporal (cross-conversación) |
| Filtros combinados | AND lógico entre todos los filtros especificados |
| Sin resultados | Retorna `{ snapshots: [], total: 0, hasMore: false }` |
| conversationId inexistente | Retorna array vacío (sin error) |

---

## 3. Consumidores

### 3.1 Consumidores identificados

| Consumidor | Prioridad | Uso de Read | Volumen esperado |
|------------|:---------:|-------------|:----------------:|
| **Pattern Discovery** | 🔴 Primario | Consulta ventanas de snapshots por conversación y tiempo para extraer patrones | Alto (análisis batch, cross-conversación) |
| **Observabilidad cognitiva** | 🟡 Secundario | Monitoreo de salud de Memory: conteos, distribución de readiness, latencia de consultas | Bajo (consultas periódicas, dashboard) |
| **Debugging** | 🟡 Secundario | Inspección manual de snapshots durante desarrollo o incidentes | Muy bajo (bajo demanda) |
| **Auditoría cognitiva** | 🔵 Terciario | Verificación de integridad de datos cognitivos post-rollout | Ocasional (post-despliegue) |
| **Futuros consumidores** | 🔵 Terciario | Cualquier capa cognitiva futura que requiera acceso a datos históricos | Desconocido |

### 3.2 Patrones de acceso esperados

**Pattern Discovery (primario):**
- Consulta ventanas: `querySnapshots({ timeRange: { from: t0, to: t1 }, filters: { isDecided: true } })`
- Por conversación: `getConversationSnapshots(convId, { limit: 100 })`
- Cross-conversación limitado: `querySnapshots({ filters: { decisionReadiness: ['ready'] }, pagination: { limit: 1000 } })`
- Batch analysis: múltiples consultas secuenciales o paralelas

**Observabilidad:**
- Totales periódicos: `countSnapshots()`
- Readiness distribution: consultas agrupadas por filtro (no soportado por Read — es responsabilidad de observabilidad proyectar desde `querySnapshots` con paginación completa)

**Debugging:**
- Snapshot específico: `getSnapshot(convId, turnNumber)`
- Últimos snapshots: `querySnapshots({ order: { by: 'storedAt', direction: 'DESC' }, pagination: { limit: 10 } })`

### 3.3 Lo que Read NO provee a los consumidores

| No provee | Por qué |
|-----------|---------|
| Proyección 19→11 | Responsabilidad del consumidor (Pattern Discovery) |
| Agregaciones (avg, count por readiness) | Read es data access, no analytics. El consumidor agrega. |
| Delta entre snapshots | M-13: no delta precomputation. El consumidor compara. |
| Stream/WebSocket | Read es query-on-demand. Stream sería un contrato separado. |
| Caché | M-11: no operational state. El consumidor cachea si necesita. |

---

## 4. Invariantes

### 4.1 Invariantes del contrato Read

| ID | Invariante | Tipo | Descripción |
|:--:|------------|:----:|-------------|
| **R-I1** | **Append-only observable** | Garantía | Los snapshots retornados por Read nunca cambian entre consultas. Un snapshot leído en t₀ es idéntico en t₁. (Dato no crece, no muta, no se elimina.) |
| **R-I2** | **Orden temporal** | Garantía | Los snapshots de una misma conversación tienen turnNumber estrictamente creciente. turnNumber N+1 siempre tiene storedAt ≥ turnNumber N. |
| **R-I3** | **Consistencia por conversación** | Garantía | Los snapshots de una misma conversación forman una secuencia completa y contigua (sin huecos de turnNumber). |
| **R-I4** | **Read-only** | Principio | Read nunca escribe, modifica ni elimina datos en ninguna tabla. Cero efectos secundarios. |
| **R-I5** | **Sin estado** | Principio | Read no mantiene caché, sesión ni estado entre invocaciones. Cada llamada es independiente. |
| **R-I6** | **Sin semántica** | Principio | Read no interpreta el contenido de los snapshots. Los filtros son estructurales (readiness, isDecided) — no semánticos (no por canal, no por factCount > N). |
| **R-I7** | **Paginación acotada** | Límite | Toda consulta que pueda retornar múltiples snapshots DEBE tener paginación. Sin paginación = error. Máximo 1000 por página. |
| **R-I8** | **Inmunidad del pipeline** | Garantía | Read se ejecuta en un contexto separado del pipeline operacional. No afecta ni es afectado por el flujo de mensajes. |

### 4.2 Consistencia

| Dimensión | Garantía | Fundamento |
|-----------|:--------:|------------|
| **Consistencia de lectura** | **Fuerte** dentro de una consulta | Una misma consulta retorna datos consistentes (no hay escrituras concurrentes que afecten una consulta en progreso) |
| **Consistencia entre consultas** | **Eventual** | Nuevos snapshots pueden aparecer entre consultas. Read no garantiza repeatable reads entre llamadas. |
| **Staleness** | **Mínimo** (segundos) | Los snapshots se escriben sincrónicamente (await store()). El tiempo entre store() exitoso y lectura es sub-segundo. |
| **Disponibilidad** | **Best-effort** | Read nunca lanza (sigue el patrón Shadow Mode). Si la DB no responde, retorna array vacío o null. |

### 4.3 Orden por defecto

| Método | Orden por defecto |
|--------|:-----------------:|
| `querySnapshots({})` | `storedAt DESC` (más reciente primero) |
| `getConversationSnapshots(convId)` | `turnNumber ASC` (orden cronológico natural) |
| `getSnapshot()` | N/A (un snapshot) |
| `countSnapshots()` | N/A (escalar) |

---

## 5. MemorySnapshot[19] vs ProjectedState[11]

### 5.1 Decisión arquitectónica

**Read retorna `MemorySnapshot[19]`**, NO `ProjectedState[11]`.

### 5.2 Justificación arquitectónica

| Argumento | Detalle |
|-----------|---------|
| **1. Resolución de contradicción β (MCR-1)** | PR-12D/MCR-1 resolvió la contradicción entre ADR-010 (MemorySnapshot[19]) y Milestone v3.0 (ProjectedState[11]). La resolución establece: "Memory produce MemorySnapshot[19]; Pattern Discovery analiza 11 campos analizables." Read hereda esta resolución. |
| **2. Separación de responsabilidades** | Read es data access (qué hay). Projection es data transformation (qué significa). Mezclarlos acopla almacenamiento con análisis. |
| **3. Consumidores múltiples, proyecciones múltiples** | Pattern Discovery necesita 11 campos. Observabilidad necesita 19 (incluyendo metadata). Debugging necesita los 19. Auditoría necesita los 19. Si Read retornara ProjectedState[11], todos los demás consumidores perderían información. |
| **4. Simplicidad ontológica** | Un solo tipo (MemorySnapshot) es la fuente de verdad. ProjectedState existe como concepto (los 11 campos analizables), NO como tipo separado en el contrato de Read. |
| **5. Principio de mínima sorpresa** | Los desarrolladores que consultan Memory esperan recibir el snapshot completo. Una proyección parcial sería inesperada y requeriría documentación extensiva. |
| **6. Proyección es barata en el consumidor** | Pattern Discovery puede seleccionar 11 de 19 campos trivialmente (`snapshots.map(fullProjection)`). Read no necesita optimizar esto. |
| **7. El consumidor conoce su proyección** | Solo Pattern Discovery sabe qué 11 campos necesita. Read no debería decidir por él. |

### 5.3 Relación con ProjectedState

```
MemorySnapshot (19 campos)
│
├── 4 Metadata: conversationId, memoryId, turnNumber, storedAt
│
├── 8 Belief: id, observationValid, channel, hasContent,
│             receivedAt, conversationId, isWellFormed, factCount
│
└── 7 Decision: id, validInput, hasContent, readiness,
                missingInfo, isDecided, factCount

Read retorna MemorySnapshot[19] (completo)
    │
    └── Pattern Discovery proyecta 11 campos analizables:
        ├── 2 Metadata: turnNumber, storedAt
        ├── 4 Belief: observationValid, channel, hasContent, isWellFormed
        └── 5 Decision: validInput, hasContent, readiness, missingInfo, isDecided
    
    Observabilidad usa los 19 campos (incluyendo factCounts, metadata completa)
    Debugging usa los 19 campos
    Auditoría usa los 19 campos
```

**ProjectedState NO es un tipo en el contrato de Read.** Es un concepto que vive en el dominio de Pattern Discovery:

```
// Memory domain (Read contract)
interface MemoryRead {
  querySnapshots(params): Promise<{ snapshots: MemorySnapshot[], ... }>;
}

// Pattern Discovery domain (futuro, NO en este ADR)
// type ProjectedState = Pick<MemorySnapshot, 'turnNumber' | 'storedAt' | 'belief.observationValid' | ...>
// function projectToAnalyzable(snapshot: MemorySnapshot): ProjectedState { ... }
```

---

## 6. Límites del contrato

### 6.1 Límites explícitos

| Límite | Valor | Razón |
|--------|:-----:|-------|
| Máximo snapshots por página | 1000 | Protección contra consultas masivas |
| Default snapshots por página | 50 | Balance entre usabilidad y rendimiento |
| Sin filtro semántico | N/A | conversationId es partition key, no semantic key (C9) |
| Sin agregaciones | N/A | Read es data access, no analytics |
| Sin cross-conversación JOIN | N/A | No se pueden relacionar snapshots de distintas conversaciones por contenido |
| Sin streaming | N/A | Read es request-response. Streaming sería un contrato futuro. |

### 6.2 Qué Read NO resuelve (y no debe resolver)

| Problema | Dónde se resuelve |
|----------|:-----------------:|
| Proyección 19→11 | Pattern Discovery |
| Delta entre turnos consecutivos | Pattern Discovery o consumidor |
| Agregaciones estadísticas | Herramientas de observabilidad |
| Búsqueda semántica (por contenido de campos) | Contrato futuro (si se justifica) |
| Caché de consultas frecuentes | Capa de infraestructura (Redis, CDN) — NO en Memory |
| Stream de snapshots en tiempo real | Contrato futuro (WebSocket/SSE) |

---

## 7. Riesgos

| ID | Riesgo | Severidad | Mitigación |
|:--:|--------|:---------:|------------|
| **RR1** | **Consulta sin filtro de conversationId recorre toda la tabla** | 🟡 MEDIA | Paginación obligatoria (max 1000). Sin paginación = error. Índice por stored_at mitiga escaneo total. |
| **RR2** | **Pattern Discovery depende de 11 campos que Read entrega completos — puede acoplarse a los 19** | 🟡 MEDIA | Gobernanza: PD debe documentar su proyección. Si PD usa campos no analizables, el contrato se debilita. |
| **RR3** | **Crecimiento de la tabla sin límite** | 🟡 MEDIA | Read no gestiona retención. Memory (Write) no tiene política de borrado. Futuro: política de retención/TTL. |
| **RR4** | **Latencia de consultas cross-conversación** | 🟡 MEDIA | Sin índice compuesto, `querySnapshots({})` sin conversationId escanea toda la tabla. Mitigación: índice por stored_at. |
| **RR5** | **Uso de Read desde el pipeline operacional** | 🔴 ALTA | M-2: Read-only durante EE execution. Read NO debe ser llamado desde lead.service.ts mientras el pipeline corre. El consumidor debe garantizar esto. |
| **RR6** | **Paginación profunda (offset alto) ineficiente en SQLite** | 🔵 BAJA | SQLite no optimiza OFFSET grande. Para PD batch: usar cursor-based pagination si es necesario. |

---

## 8. Relación con Write existente

| Dimensión | Write (`MemoryStorage`) | Read (`MemoryRead`) |
|-----------|:----------------------:|:-------------------:|
| **Método principal** | `insert(snapshot)` | `querySnapshots(params)` |
| **Consumidor** | `MemoryService` → `lead.service.ts` | Pattern Discovery, observabilidad, debugging |
| **Falla** | Nunca lanza (retorna `MemoryStoreResult`) | Nunca lanza (retorna `QueryResult` vacío en error) |
| **Estado** | ✅ Implementado (IM-1) | ⏳ Diseño futuro (MRC-1) |
| **Transaccionalidad** | Escribe en DB | Lee de DB |
| **Cacheable** | No (append-only) | Sí (por el consumidor, no por Read) |
| **Frecuencia** | Por cada turno conversacional | Bajo demanda (batch para PD, esporádico para debugging) |

Ambas interfaces pueden compartir la misma implementación concreta (`SqliteMemoryStorage` podría implementar ambas), pero son contratos independientes.

```
SqliteMemoryStorage implements MemoryStorage   (Write — IM-1)
SqliteMemoryStorage implements MemoryRead      (Read — futuro, no implementado)
```

O, alternativamente:

```
SqliteMemoryRead implements MemoryRead         (implementación separada)
```

La decisión de implementación (clase única vs. clases separadas) es posterior y no afecta el contrato arquitectónico.

---

## 9. Veredicto

### SÍ — Read constituye un contrato arquitectónico independiente.

**Fundamento:**

1. **Responsabilidad única diferente a Write.** Preservar y recuperar son concernes distintos. Write tiene invariantes de append-only, inmubilidad y fire-and-forget. Read tiene invariantes de filtrado, paginación, orden y consistencia. No comparten flujo de datos ni ciclo de vida.

2. **Consumidores diferentes.** Write es llamado por el orquestador (lead.service.ts). Read es llamado por Pattern Discovery, observabilidad y debugging. Ningún consumidor de Read es consumidor de Write (excepto `getMaxTurnNumber`, que es un read interno de soporte al write).

3. **Evolución independiente.** Read puede agregar nuevos filtros, nuevos órdenes, nuevos métodos de consulta sin modificar Write. Write puede fortalecer invariantes de persistencia sin afectar Read.

4. **Boundary arquitectónico.** Read define la frontera entre almacenamiento cognitivo y análisis cognitivo. Pattern Discovery (futuro) depende de Read, no de Write. Esta separación es esencial para que PD pueda diseñarse contra una interfaz estable sin conocer los detalles de persistencia.

5. **Precedente documental.** La necesidad de Read fue identificada en PR-12B (MPM-1 D5), PR-12C (MCC-1 §3.2), PR-12D (MCR-1 §4.1), y PR-13 (ATR-1 §2.2). El contrato de lectura fue consistentemente listado como dependencia de Pattern Discovery.

---

## 10. Resumen del contrato

| Elemento | Definición |
|----------|------------|
| **Nombre** | `MemoryRead` |
| **Método principal** | `querySnapshots(params: QueryParams): Promise<QueryResult>` |
| **Tipo de retorno** | `MemorySnapshot` (19 campos completos) |
| **NO retorna** | `ProjectedState` (proyección es responsabilidad del consumidor) |
| **Filtros** | conversationId, turnNumberRange, timeRange, readiness, isDecided, hasContent, isWellFormed, channel |
| **Orden** | Por turnNumber o storedAt, ASC o DESC |
| **Paginación** | Limit 50 default, max 1000, con offset |
| **Consistencia** | Fuerte intra-consulta, eventual entre consultas |
| **Disponibilidad** | Best-effort (nunca lanza) |
| **Shadow Mode** | No aplica (Read no corre en el pipeline) |
| **DDL dependency** | Tabla `cognitive_memory_snapshots` + índice por `stored_at` (recomendado) |
| **Consumidor primario** | Pattern Discovery (futuro) |
| **Estado** | ⏳ Diseño arquitectónico — NO implementado |

---

## 11. Próximos pasos

1. **Validar este contrato con consumidores simulados** (antes de implementar)
2. **Decidir implementación**: `SqliteMemoryStorage` extiende para implementar `MemoryRead` vs. clase separada `SqliteMemoryRead`
3. **Agregar índice por `stored_at`** en initSchema() si se esperan consultas cross-conversación
4. **Implementar Read** como un PR separado (no antes de que Pattern Discovery esté listo para consumirlo)
5. **Documentar ProjectedState** como concepto en Pattern Discovery (no en Memory)

---

*Fin de MRC-1 — Memory Read Contract Architecture*
