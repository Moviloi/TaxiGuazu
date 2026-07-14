# PD-IM-0 — Pattern Discovery Implementation Scope

> **Autor:** Arquitecto Principal y Lead Engineer  
> **Propósito:** Definir el alcance exacto de PD-IM-1, primera implementación de Pattern Discovery  
> **Documentos fuente:** POA-1, PAA-1, MRC-1, PBA-1, PDE-1, ADR-010, ADR-011, OP-1  
> **Estado actual del código:** `src/lib/pattern-discovery/` no existe. `PATTERN_DISCOVERY_ENABLED` no existe. Memory operacional con 16 snapshots reales en producción. MemoryRead sin implementar.  
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Estado actual (línea de base)](#1-estado-actual-línea-de-base)
2. [¿Qué implementa PD-IM-1?](#2-qué-implementa-pd-im-1)
3. [¿Qué NO implementa PD-IM-1?](#3-qué-no-implementa-pd-im-1)
4. [Criterios de finalización](#4-criterios-de-finalización)
5. [Entregables](#5-entregables)
6. [Árbol de decisión: ¿pertenece a PD-IM-1?](#6-árbol-de-decisión-pertenece-a-pd-im-1)
7. [Reglas de contratación](#7-reglas-de-contratación)
8. [Riesgos de alcance](#8-riesgos-de-alcance)

---

## 1. Estado actual (línea de base)

Antes de PD-IM-1, el proyecto se encuentra en este estado exacto:

| Elemento | Estado | Ubicación |
|----------|--------|-----------|
| Evidence Engine | ✅ Frozen, 378 tests | `src/lib/evidence/` |
| Memory cognitiva (7 módulos) | ✅ Implementada, 45 tests | `src/lib/memory/` |
| `COGNITIVE_MEMORY_ENABLED` | ✅ Feature flag en producción | `src/config/env.ts`, Vercel |
| Tabla `cognitive_memory_snapshots` | ✅ Creada en initSchema() | `src/lib/db/core/connection.ts` |
| Snapshots cognitivos reales | ✅ 16 snapshots en producción (OP-1) | Vercel Production DB |
| `MemoryRead` | ❌ No implementado | MRC-1 diseñado, sin código |
| Catálogo de invariantes (F₂) | ❌ No existe | Definido en PAA-1, sin implementar |
| Pattern Catalog | ❌ No existe | Definido en PDE-1, sin implementar |
| `PATTERN_DISCOVERY_ENABLED` | ❌ No existe | — |
| `src/lib/pattern-discovery/` | ❌ No existe | — |

**Línea de base verificada:** Ningún archivo en `src/lib/pattern-discovery/` existe. Ninguna función `patternService.discover()` existe. Ninguna invocación de Pattern Discovery existe en el orquestador. Ningún catálogo de Patterns o invariantes existe en la base de datos.

---

## 2. ¿Qué implementa PD-IM-1?

### 2.1 Directorio y estructura

Creación del directorio `src/lib/pattern-discovery/` con los siguientes módulos:

| Módulo | Responsabilidad | Dependencias PD | Ref. Arquitectónica |
|--------|----------------|:---------------:|:-------------------:|
| `types.ts` | **Shared Kernel** — TODAS las interfaces y tipos compartidos: `Pattern`, `PatternRun`, `Candidate`, `Watermark`, `Relation`, `Dimension`, `EvidenceWindow`, `AcceptanceReport`, `ProjectedState`, `Invariant`, `RelationCandidate`, `DetectionConfig`, `ExecutionConfig`, `PatternRepository`, `MemoryReadAdapter`, `WatermarkManager`, `PatternOrchestrator`, `AcceptanceEvaluator`, `RelationDetector`, `InvariantCatalog`, `PatternStatus`, `RelationType`, `RunStatus` | ∅ | PDE-1 §3.3, §3.4 |
| `pattern.ts` | **Entity** — `Pattern` class (Value Object inmutable, implementa `Pattern` interface de types.ts). Identidad: `H(R ∥ D)`. Versionado automático. | `types.ts` | PDE-1 §3.1, §3.2 |
| `projection.ts` | **Pure function** — `MemorySnapshot[19] → ProjectedState[11]`. Proyección interna (PBA-1 Modelo A). | `types.ts` | PBA-1, PDE-1 §2.2 |
| `detector.ts` | **Processing** — Implementa `RelationDetector` (interface de types.ts). Genera relaciones candidatas desde `ProjectedState[]`. | `types.ts` | PDE-1 §6.2, PR-7B |
| `acceptance.ts` | **Processing** — Implementa `AcceptanceEvaluator` (interface de types.ts). Evalúa F₁ ∧ F₂ ∧ F₃ ∧ F₄. | `types.ts` | PAA-1 §3, §8.1 |
| `invariant-catalog.ts` | **Data** — Implementa `InvariantCatalog` (interface de types.ts). Catálogo de invariantes + seed inicial. | `types.ts` | PAA-1 §6.2 |
| `memory-read.ts` | **Data Access** — Implementa `MemoryReadAdapter` (interface de types.ts). Adaptador a tabla `cognitive_memory_snapshots`. | `types.ts` | MRC-1, PDE-1 §2.1 |
| `repository.ts` | **Data Access** — Implementa `PatternRepository` (interface de types.ts). CRUD de Patterns, Candidates, Watermark, Runs. | `types.ts` | PDE-1 §4.2, §4.4 |
| `watermark.ts` | **State** — Implementa `WatermarkManager` (interface de types.ts). Recibe `PatternRepository` por constructor (DI). | `types.ts` | PDE-1 §2.4 |
| `orchestrator.ts` | **Composition Root** — Único módulo que concreta el pipeline. Coordina `L(W) = Select_γ(Detect_γ(W))`. Recibe TODAS las implementaciones por constructor (DI). | `types.ts` + todos los módulos de implementación | PDE-1 §6.1 |
| `pd-service.ts` | **Entry Point** — `discover()` y `discoverDryRun()`. Verifica flag. Recibe solo `PatternOrchestrator`. | `types.ts`, `orchestrator.ts` | PDE-1 §1.2 |
| `index.ts` | **Barrel Export** — Re-exporta desde `types.ts` y los entry points públicos. | `types.ts`, `pd-service.ts` | — |

### 2.2 Shared Kernel (`types.ts`)

`types.ts` es el **Shared Kernel** de Pattern Discovery. Define TODAS las interfaces y tipos compartidos. Ningún otro módulo de PD define tipos que otros módulos necesiten. Ningún módulo de PD importa de `types.ts` para obtener interfaces; los módulos de implementación importan exclusivamente de `types.ts`.

```typescript
// ─────────────────────────────────────────────────────────────────────────
// Pattern Discovery — Shared Kernel
// ─────────────────────────────────────────────────────────────────────────
// R-DEP-2: types.ts NO importa ningún módulo de PD.
// R-DEP-3: Todos los módulos de implementación importan exclusivamente de aquí.

// ── External types ──
// import { MemorySnapshot } from '@/lib/memory/types';

// ── Dimension & Status ──
type Dimension = 'intra' | 'inter' | 'cross';
type PatternStatus = 'active' | 'superseded' | 'deprecated';
type RelationType = 'implication' | 'correlation' | 'trend' | 'stability';
type RunStatus = 'success' | 'aborted_no_data' | 'failed';

// ── Relation ──
interface Relation {
  description: string;        // "channel=whatsapp → factCount≥1"
  variables: [string, string]; // ["channel", "factCount"]
  type: RelationType;
}

// ── Evidence ──
interface EvidenceWindow {
  snapshotCount: number;
  conversationCount: number;
  timeRange: { from: string; to: string };
  support: number;  // |E| / |W|
}

// ── ProjectedState (proyección 19→11) ──
interface ProjectedState {
  turnNumber: number;
  storedAt: string;
  conversationId: string;
  observationValid: boolean;
  channel: string | null;
  hasContent: boolean;
  isWellFormed: boolean;
  factCount: number;
  readiness: 'ready' | 'partial' | 'invalid';
  isDecided: boolean;
  factCountDecision: number;      // 11 — snapshot.decision.factCount
}

// ── RelationCandidate (salida de Detect_γ) ──
interface RelationCandidate {
  relation: Relation;
  confidence: number;          // θ
  evidence: EvidenceWindow;
  dimension: Dimension;
  projectedSnapshots: ProjectedState[];
}

// ── DetectionConfig (parámetros γ) ──
interface DetectionConfig {
  minSupport: number;
  minConfidence: number;
  enabledDimensions: Dimension[];
  maxRelations?: number;
}

// ── Invariant (para F₂) ──
interface Invariant {
  id: string;
  description: string;
  source: 'EE' | 'Memory' | 'Contract' | 'Schema';
  ruleRef: string;
  pattern: string;
  activeSince: string;
}

// ── AcceptanceReport (salida de F₁ ∧ F₂ ∧ F₃ ∧ F₄) ──
interface AcceptanceReport {
  F1_empirical: {
    passed: boolean;
    n: number;
    coverage: number;
    theta: number;
  };
  F2_nonTrivial: {
    passed: boolean;
    catalogVersion: string;
    match?: string;
  };
  F3_independence: {
    passed: boolean;
    derivedFrom?: string[];
  };
  F4_nonCoincidence: {
    passed: boolean;
    pValue: number;
    correctedP: number;
    lift: number;
  };
}

// ── Watermark ──
interface Watermark {
  lastStoredAt: string | null;
  lastRunAt: string | null;
  totalSnapshotsProcessed: number;
}

// ── Pattern (interface — implementation in pattern.ts) ──
interface Pattern {
  readonly id: string;
  readonly version: number;
  readonly relation: Relation;
  readonly confidence: number;
  readonly evidence: EvidenceWindow;
  readonly dimension: Dimension;
  readonly acceptance: AcceptanceReport;
  readonly runId: string;
  readonly producedAt: string;
  readonly status: PatternStatus;
  readonly supersededBy?: string;

  equals(other: Pattern): boolean;
  supersede(newPattern: Pattern): [Pattern, Pattern];
}

// ── Candidate (relación que pasó F₁ pero no todos los filtros) ──
interface Candidate {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
  observationCount: number;
  relation: Relation;
  dimension: Dimension;
  bestConfidence: number;
  bestEvidence: EvidenceWindow;
}

// ── PatternRun (salida de una ejecución de PD) ──
interface PatternRun {
  runId: string;
  triggeredAt: string;
  startedAt: string;
  completedAt: string;
  status: RunStatus;
  watermark: Watermark;
  patterns: {
    accepted: Pattern[];
    candidates: string[];
    deprecated: string[];
  };
  metrics: {
    durationMs: number;
    relationsEvaluated: number;
    memoryReadCalls: number;
    snapshotsRead: number;
  };
}

// ── ExecutionConfig (parámetros de ejecución) ──
interface ExecutionConfig {
  detectionConfig?: DetectionConfig;
  dryRun?: boolean;
  windowOverride?: {
    from?: string;
    to?: string;
  };
}

// ═════════════════════════════════════════════════════════════════════
// Service interfaces (implementaciones en módulos respectivos)
// ═════════════════════════════════════════════════════════════════════

// ── MemoryReadAdapter ──
interface MemoryReadAdapter {
  getNewSnapshots(watermark: Watermark): Promise<MemorySnapshot[]>;
  countNewSnapshots(watermark: Watermark): Promise<number>;
  getLatestSnapshot(): Promise<MemorySnapshot | null>;
}

// ── PatternRepository ──
interface PatternRepository {
  readWatermark(): Promise<Watermark>;
  writeWatermark(w: Watermark): Promise<void>;
  readActivePatterns(): Promise<Pattern[]>;
  readPatternHistory(id: string): Promise<Pattern[]>;
  writePatterns(patterns: Pattern[]): Promise<void>;
  deprecatePatterns(ids: string[]): Promise<void>;
  supersedePattern(supersededId: string, successor: Pattern): Promise<void>;
  readCandidates(): Promise<Candidate[]>;
  writeCandidates(candidates: Candidate[]): Promise<void>;
  promoteCandidate(id: string): Promise<void>;
  writeRun(run: PatternRun): Promise<void>;
  readLastRun(): Promise<PatternRun | null>;
  readInvariants(): Promise<Invariant[]>;
}

// ── WatermarkManager ──
interface WatermarkManager {
  read(): Promise<Watermark>;
  hasNewData(): Promise<boolean>;
  update(lastStoredAt: string, snapshotsProcessed: number): Promise<Watermark>;
  reset(): Promise<void>;
}

// ── RelationDetector ──
interface RelationDetector {
  detect(snapshots: ProjectedState[], config: DetectionConfig): RelationCandidate[];
}

// ── AcceptanceEvaluator ──
interface AcceptanceEvaluator {
  evaluate(
    candidate: RelationCandidate,
    invariants: Invariant[],
    existingPatterns: Pattern[],
    fullWindow: ProjectedState[]
  ): AcceptanceReport;
}

// ── InvariantCatalog ──
interface InvariantCatalog {
  getAll(): Promise<Invariant[]>;
  getActive(): Promise<Invariant[]>;
  matches(relationDescription: string): Invariant | null;
}

// ── PatternOrchestrator ──
interface PatternOrchestrator {
  execute(config?: ExecutionConfig): Promise<PatternRun>;
  executeDryRun(config?: ExecutionConfig): Promise<PatternRun>;
}
```

### 2.3 Entidad Pattern (`pattern.ts`)

Implementación concreta de la interface `Pattern` definida en `types.ts`. Value Object inmutable con identidad determinística.

```typescript
import { Pattern as PatternInterface, Relation, EvidenceWindow, Dimension,
         AcceptanceReport, PatternStatus, PatternRun } from './types';

// ── PatternProps (solo para construcción) ──
interface PatternProps {
  relation: Relation;
  confidence: number;
  evidence: EvidenceWindow;
  dimension: Dimension;
  acceptance: AcceptanceReport;
  runId: string;
  producedAt: string;
  status?: PatternStatus;
  supersededBy?: string;
  version?: number;  // si se omite, se computa desde el repositorio
}

class Pattern implements PatternInterface {
  readonly id: string;          // H(R_description ∥ Dimension)
  readonly version: number;     // monotonic per id
  readonly relation: Relation;
  readonly confidence: number;  // θ ∈ [0, 1]
  readonly evidence: EvidenceWindow;
  readonly dimension: Dimension;
  readonly acceptance: AcceptanceReport;
  readonly runId: string;
  readonly producedAt: string;
  readonly status: PatternStatus;
  readonly supersededBy?: string;

  constructor(props: PatternProps);  // freeze + compute id + version
  equals(other: Pattern): boolean;
  supersede(newPattern: Pattern): [Pattern, Pattern];
}
```

**Reglas de identidad:**
- `id = H(relation.description || '::' || dimension)`
- SHA-256 truncado a primeros 16 bytes (32 hex chars)
- Deterministica: mismo R + D → mismo id

**Reglas de versionado:**
- `version = 1` para primera ocurrencia de un id
- `version = previous + 1` si θ difiere en > ε (ε = 0.05) o evidence.snapshotCount cambia
- Si θ y evidence son equivalentes → no se crea nueva versión, se conserva la anterior

### 2.4 Proyección (`projection.ts`)

Función pura que implementa PBA-1 Modelo A. Importa `ProjectedState` de `types.ts` — no define tipos propios.

```typescript
import { ProjectedState } from './types';
// import { MemorySnapshot } from '@/lib/memory/types';

// Proyección 19→11. PD define los 11 campos que analiza.
// Memory no participa en esta proyección (PBA-1).
// ProjectedState está definido en types.ts (Shared Kernel).

function project(snapshot: MemorySnapshot): ProjectedState;
function projectMany(snapshots: MemorySnapshot[]): ProjectedState[];
```

**Nota:** Los 11 campos están **congelados** en PDE-1 §2.2. La interface `ProjectedState` en `types.ts` refleja exactamente los 11 campos aprobados. Cualquier cambio en esta lista requiere revisión arquitectónica. Ver PDE-1 §2.2 para el mapeo completo desde MemorySnapshot.

### 2.5 Detector de relaciones (`detector.ts`)

Implementación concreta de `RelationDetector` (interface en `types.ts`). No define interfaces ni tipos — los importa del Shared Kernel.

```typescript
import { RelationDetector, RelationCandidate, ProjectedState, DetectionConfig } from './types';

class DefaultRelationDetector implements RelationDetector {
  /**
   * Genera todas las relaciones candidatas detectables
   * en la ventana de snapshots proyectados.
   */
  detect(snapshots: ProjectedState[], config: DetectionConfig): RelationCandidate[] {
    // Implementación: correlación, contingencia, estabilidad, contraste
  }
}
```

**La implementación de `detect()` NO forma parte del alcance arquitectónico.** El algoritmo específico (correlación, árboles de decisión, clustering, etc.) es decisión de implementación. PD-IM-1 implementa DETECTORES INICIALES SIMPLES:
- Correlación de Pearson para pares numéricos
- Tablas de contingencia para pares categóricos
- Estabilidad temporal para relaciones inter-snapshot
- Contraste entre conversaciones para relaciones cross

### 2.6 Evaluador de aceptación (`acceptance.ts`)

Implementación concreta de `AcceptanceEvaluator` (interface en `types.ts`). No importa de ningún otro módulo de implementación — solo de `types.ts`.

```typescript
import { AcceptanceEvaluator, AcceptanceReport, RelationCandidate,
         Invariant, Pattern, ProjectedState } from './types';

class DefaultAcceptanceEvaluator implements AcceptanceEvaluator {
  /**
   * Evalúa si una relación candidata pasa el Acceptance Contract.
   * F₁ ∧ F₂ ∧ F₃ ∧ F₄ (PAA-1).
   */
  evaluate(
    candidate: RelationCandidate,
    invariants: Invariant[],
    existingPatterns: Pattern[],
    fullWindow: ProjectedState[]
  ): AcceptanceReport {
    // Implementa los 4 filtros del Acceptance Contract
  }
}
```

**Comportamiento de cada filtro:**

| Filtro | Implementación |
|:-------|:---------------|
| **F₁** | Verifica `n ≥ N_min(dimension)`, `conversationCount ≥ C_min(dimension)`, `θ ≥ θ_min`. Usa umbrales de PDE-1 §3.1. |
| **F₂** | Coteja `relation.description` contra el catálogo de invariantes. Match directo + match por patrón (regex). |
| **F₃** | Evalúa si la relación es transitivamente deducible de Patterns existentes. Si `derivedFrom` no vacío y `θ ≈ θ_derived`, falla. |
| **F₄** | Calcula lift, p-value (test exacto de Fisher o χ²), corrige por número de comparaciones. Si `lift ≤ L_min` o `p_corregido ≥ α`, falla. |

### 2.7 Catálogo de invariantes (`invariant-catalog.ts`)

Implementación concreta de `InvariantCatalog` (interface en `types.ts`). `Invariant` también está definido en `types.ts` — no define tipos propios.

```typescript
import { Invariant, InvariantCatalog } from './types';

class DefaultInvariantCatalog implements InvariantCatalog {
  getAll(): Promise<Invariant[]> { /* lee de pd_invariants */ }
  getActive(): Promise<Invariant[]> { /* filtra por activeSince */ }
  matches(relationDescription: string): Invariant | null { /* coteja por pattern regex */ }
}
```

**Seed inicial del catálogo** (basado en PAA-1 §6.2):

| ID | Descripción | Pattern regex | Source |
|:--:|:------------|:--------------|:------:|
| EE-I1 | `isDecided → readiness` | `isDecided.*readiness\|readiness.*isDecided` | EE |
| EE-I2 | `readiness=ready ↔ isDecided=true` | `readiness.*ready.*isDecided\|isDecided.*true.*readiness` | EE |
| M-1 | Append-only | `snapshot.*no.*modific\|append.*only` | Memory |
| M-7 | turnNumber monotónico | `turnNumber.*monoton\|turnNumber.*increment` | Memory |
| DB-I1 | memoryId NOT NULL | `memoryId.*null\|memoryId.*vacio` | Schema |
| DB-I2 | conversationId NOT NULL | `conversationId.*null` | Schema |

### 2.8 Adaptador MemoryRead (`memory-read.ts`)

Implementación concreta de `MemoryReadAdapter` (interface en `types.ts`). `Watermark` también está en `types.ts`.

```typescript
import { MemoryReadAdapter, Watermark } from './types';
// import { MemorySnapshot } from '@/lib/memory/types';

class DefaultMemoryReadAdapter implements MemoryReadAdapter {
  getNewSnapshots(watermark: Watermark): Promise<MemorySnapshot[]> { /* SQL directo */ }
  countNewSnapshots(watermark: Watermark): Promise<number> { /* COUNT SQL */ }
  getLatestSnapshot(): Promise<MemorySnapshot | null> { /* SELECT ... ORDER BY storedAt DESC */ }
}
```

**Nota:** MemoryRead como interfaz está diseñada en MRC-1 pero NO implementada como capa independiente. PD-IM-1 implementa `DefaultMemoryReadAdapter` como puente directo a la tabla `cognitive_memory_snapshots` (consultas SQL). La abstracción formal (interfaz independiente con múltiples implementaciones) queda postergada para cuando haya múltiples consumidores.

### 2.9 Pattern Repository (`repository.ts`)

Implementación concreta de `PatternRepository` (interface en `types.ts`). Todos los tipos (`Watermark`, `Pattern`, `Candidate`, `PatternRun`, `Invariant`) están definidos en `types.ts` — repository.ts no importa de ningún otro módulo de implementación.

```typescript
import { PatternRepository, Watermark, Pattern, Candidate, PatternRun, Invariant } from './types';

class SqlPatternRepository implements PatternRepository {
  // ── Watermark ──
  readWatermark(): Promise<Watermark>;
  writeWatermark(w: Watermark): Promise<void>;

  // ── Patterns ──
  readActivePatterns(): Promise<Pattern[]>;
  readPatternHistory(id: string): Promise<Pattern[]>;
  writePatterns(patterns: Pattern[]): Promise<void>;
  deprecatePatterns(ids: string[]): Promise<void>;
  supersedePattern(supersededId: string, successor: Pattern): Promise<void>;

  // ── Candidates ──
  readCandidates(): Promise<Candidate[]>;
  writeCandidates(candidates: Candidate[]): Promise<void>;
  promoteCandidate(id: string): Promise<void>;

  // ── Runs ──
  writeRun(run: PatternRun): Promise<void>;
  readLastRun(): Promise<PatternRun | null>;

  // ── Invariants ──
  readInvariants(): Promise<Invariant[]>;
}
```

**Esquema de tablas** (en la misma base de datos Turso/SQLite, con prefijo `pd_`):

```
TABLE pd_patterns        — Patterns aceptados (versionados)
TABLE pd_runs            — Historial de ejecuciones
TABLE pd_candidates      — Candidatos (relaciones que pasaron F₁)
TABLE pd_watermark       — Estado de watermark (una fila)
TABLE pd_invariants      — Catálogo de invariantes
```

Justificación de co-ubicación con Memory: PD es offline/batch y no requiere alta disponibilidad. Usar la misma DB simplifica el depliegue (una conexión, un schema). Las tablas tienen prefijo `pd_` para separación lógica.

### 2.10 Watermark Manager (`watermark.ts`)

Implementación concreta de `WatermarkManager` (interface en `types.ts`). Recibe `PatternRepository` por constructor (Dependency Injection) — no importa la implementación concreta del repositorio, solo la interface desde `types.ts`.

```typescript
import { WatermarkManager, Watermark, PatternRepository } from './types';

class DefaultWatermarkManager implements WatermarkManager {
  constructor(private repo: PatternRepository) {}  // DI desde interface, no desde concreto

  async read(): Promise<Watermark>;
  async hasNewData(): Promise<boolean>;      // countNewSnapshots > 0
  async update(lastStoredAt: string, snapshotsProcessed: number): Promise<Watermark>;
  async reset(): Promise<void>;              // para testing/dry-run
}
```

### 2.11 Orquestador — Composition Root (`orchestrator.ts`)

**Único módulo en todo PD que concreta implementaciones.** Implementa `PatternOrchestrator` (interface en `types.ts`). Recibe TODAS las implementaciones por constructor (Dependency Injection). Es el **Composition Root** del pipeline.

```typescript
import { PatternOrchestrator, PatternRun, ExecutionConfig } from './types';
// ÚNICO módulo que importa implementaciones concretas:
import { DefaultRelationDetector } from './detector';
import { DefaultAcceptanceEvaluator } from './acceptance';
import { DefaultInvariantCatalog } from './invariant-catalog';
import { DefaultMemoryReadAdapter } from './memory-read';
import { SqlPatternRepository } from './repository';
import { DefaultWatermarkManager } from './watermark';
import { projectMany } from './projection';
import { Pattern } from './pattern';  // ← R-DEP-5: orchestrator es el único que importa pattern.ts

class DefaultOrchestrator implements PatternOrchestrator {
  constructor(
    private detector: DefaultRelationDetector,
    private acceptance: DefaultAcceptanceEvaluator,
    private catalog: DefaultInvariantCatalog,
    private memoryRead: DefaultMemoryReadAdapter,
    private repository: SqlPatternRepository,
    private watermark: DefaultWatermarkManager,
    private project: typeof projectMany
  ) {}

  /**
   * Ejecuta el pipeline completo L(W) = Select_γ(Detect_γ(W)):
   *
   * 1. Lee watermark
   * 2. Consulta MemoryRead (snapshots desde watermark)
   * 3. Si no hay datos nuevos → aborta
   * 4. Proyecta 19→11
   * 5. Lee patterns existentes + candidatos + invariantes
   * 6. Detecta relaciones candidatas (Detect_γ)
   * 7. Evalúa Acceptance Contract (Select_γ = F₁ ∧ F₂ ∧ F₃ ∧ F₄)
   * 8. Clasifica: nuevo patrón / versión actualizada / candidato / deprecado
   * 9. Construye PatternRun
   * 10. Persiste en Repository
   * 11. Actualiza watermark
   * 12. Retorna PatternRun
   */
  async execute(config?: ExecutionConfig): Promise<PatternRun>;

  async executeDryRun(config?: ExecutionConfig): Promise<PatternRun>;
}
```

### 2.12 Punto de entrada público (`pd-service.ts`)

Depende ÚNICAMENTE de `PatternOrchestrator` (interface en `types.ts`) y de la implementación concreta en `orchestrator.ts`. No conoce `WatermarkManager`, `PatternRepository`, ni ningún otro detalle interno del pipeline (R-DEP-6).

```typescript
import { PatternOrchestrator, PatternRun } from './types';
// R-DEP-6: pd-service solo importa orchestrator (Composition Root)
import { DefaultOrchestrator } from './orchestrator';

class PatternDiscoveryService {
  constructor(private orchestrator: DefaultOrchestrator) {}

  /**
   * Punto de entrada único. Verifica PATTERN_DISCOVERY_ENABLED.
   * Si está deshabilitado, retorna run con status 'aborted'.
   * Si está habilitado, delega en orchestrator.execute().
   * Nunca lanza. Retorna PatternRun en todos los casos.
   */
  async discover(): Promise<PatternRun>;

  /**
   * Modo dry-run. No verifica el feature flag.
   * No persiste nada. Para desarrollo y auditoría.
   */
  async discoverDryRun(): Promise<PatternRun>;
}
```

### 2.13 Feature flag

| Flag | Tipo | Default | Ubicación |
|------|------|---------|-----------|
| `PATTERN_DISCOVERY_ENABLED` | `boolean` (env var) | `false` | `src/config/env.ts` + helper `isPatternDiscoveryEnabled()` |

La función `isPatternDiscoveryEnabled()` se exporta desde `src/lib/pattern-discovery/index.ts`:

```typescript
export function isPatternDiscoveryEnabled(): boolean {
  return process.env.PATTERN_DISCOVERY_ENABLED === 'true';
}
```

**Relación con Memory:** PD-IM-1 NO depende de `COGNITIVE_MEMORY_ENABLED` para su propia ejecución. Si Memory está deshabilitado, PD consulta MemoryRead y obtiene 0 snapshots → aborta (no hay datos). Esto es correcto: PD funciona independientemente; la ausencia de datos no es un error.

**Modo dry-run:** `PATTERN_DISCOVERY_DRY_RUN` (opcional, default false). Si está en true, PD ejecuta el pipeline completo pero no persiste resultados. Util para validación sin riesgo.

**Precedencia de dry-run:** El método `discoverDryRun()` tiene prioridad sobre la variable de entorno `PATTERN_DISCOVERY_DRY_RUN`. Esto significa:

| Invocación | `PATTERN_DISCOVERY_DRY_RUN` | Comportamiento |
|:-----------|:---------------------------:|:---------------|
| `discover()` | `false` (o ausente) | Ejecución normal con persistencia |
| `discover()` | `true` | Dry-run (no persiste) |
| `discoverDryRun()` | cualquier valor | Dry-run (no persiste). La llamada explícita al método prevalece. |

**Regla de precedencia:** `discoverDryRun()` > `PATTERN_DISCOVERY_DRY_RUN` > default (`false`).

### 2.14 Tests

| Tipo | Cobertura mínima |
|------|-----------------|
| **Unitarios — Pattern** | Construcción, identidad (mismo R+D → mismo id), versionado, inmutabilidad, supersede |
| **Unitarios — Projection** | 19→11 campos correctos, snapshot inválido → error, proyección masiva |
| **Unitarios — Detector** | Relaciones detectadas en datos controlados, sin relaciones en datos aleatorios, dimensiones correctas |
| **Unitarios — Acceptance** | F₁ pasa/falla, F₂ detecta invariantes, F₃ detecta derivación, F₄ detecta coincidencia |
| **Unitarios — InvariantCatalog** | Match por pattern, sin match, catálogo vacío, seed inicial |
| **Unitarios — Watermark** | Primera ejecución = null, actualización, detección de datos nuevos |
| **Unitarios — Orchestrator** | Pipeline completo en datos controlados, aborto sin datos, dry-run no persiste |
| **Unitarios — pd-service** | Flag habilitado → ejecuta, flag deshabilitado → aborta, nunca lanza |
| **Integración — Repository** | CRUD patterns, versionado, watermark persistido, runs persistidos, candidatos |
| **Integración — MemoryRead** | Consulta a tabla real, watermark respetado, 0 snapshots = vacío |
| **Integración — Pipeline completo** | PD real contra snapshots reales (OP-1): detecta, filtra, produce Patterns |

---

## 3. ¿Qué NO implementa PD-IM-1?

### 3.1 Excluido por diseño arquitectónico

| Funcionalidad | Razón de exclusión | ¿Cuándo? |
|---------------|-------------------|:---------:|
| **MemoryRead como abstracción formal** | MRC-1 define la interfaz. PD-IM-1 implementa un adaptador directo a DB. MemoryRead como capa independiente se implementa cuando haya múltiples consumidores. | Post-PD |
| **Goals / Learning / Planning** | Capas cognitivas superiores. PD es la primera capa de descubrimiento. | Futuro PR |
| **Consumo de Patterns por downstream** | PD produce y almacena. Quién consume (auditoría humana, sistema operacional) está fuera del alcance. | Post-PD |
| **Interfaz de Pattern Discovery como API HTTP** | PD es offline/batch (POA-1 N5). No expone API REST. La invocación es por CLI o scheduler. | Post-PD |
| **Dashboard o UI de Patterns** | Sin consumidor UI. Patterns se almacenan en el catálogo. | Post-PD |

### 3.2 Excluido por principio de minimalidad

| Funcionalidad | Razón de exclusión |
|---------------|-------------------|
| **Algoritmos avanzados de detección** (árboles de decisión, regresión, clustering, NLP) | PD-IM-1 implementa detectores simples (correlación, contingencia, estabilidad). Algoritmos avanzados pueden agregarse en iteraciones futuras. |
| **Optimizaciones de rendimiento** (caché, paralelismo, streaming) | PD es offline con ~16 snapshots. Optimizaciones cuando el volumen lo requiera. |
| **Corrección por múltiples comparaciones adaptativa** (FDR, Benjamini-Hochberg) | PD-IM-1 implementa Bonferroni (simple, conservador). Métodos adaptativos pueden reemplazarlo. |
| **Exportación de datos** (Patterns en CSV, JSON dump) | Sin caso de uso identificado. |
| **Webhook o notificación** post-descubrimiento | PD es fire-and-forget. Sin notificaciones. |
| **Migración de datos** desde otro sistema | No hay datos previos que migrar. |
| **Administración del catálogo de invariantes** (add/remove) | PD-IM-1 siembra el catálogo inicial. La administración (agregar/eliminar invariantes) es manual vía DB o script. |

### 3.3 Excluido por límite arquitectónico

| Funcionalidad | Razón de exclusión |
|---------------|-------------------|
| **Modificaciones a `src/lib/evidence/`** | Evidence Engine está frozen (ADR-009). No se modifica. |
| **Modificaciones a `src/lib/memory/`** | Memory está implementada. No se modifica. |
| **Modificaciones a `lead.service.ts`** | PD no corre en el path crítico (POA-1 N5). No se integra en el orquestador operacional. |
| **Modificaciones al flujo operacional** (core, extraction, comprehension, policies, LLM) | PD es offline. No afecta el pipeline operacional. |
| **Nuevos ADR** | La arquitectura de PD está completa (POA-1, PAA-1, MRC-1, PBA-1, PDE-1). PD-IM-1 implementa, no rediseña. |
| **Nuevas capas arquitectónicas** | PD es la única capa que se implementa. |
| **Modificaciones al Acceptance Contract** | PAA-1 está congelado. PD-IM-1 implementa F₁-F₄ según el contrato. |

### 3.4 Excluido por decisión de gobernanza

| Funcionalidad | Razón de exclusión |
|---------------|-------------------|
| **Patrones cross-conversación con n < C_min** | F₁-b exige C_min=2 para D='cross'. Con 12 conversaciones en OP-1, hay suficientes datos. Pero el detector debe confirmar. |
| **Evaluación de F₃ contra Patterns de ejecuciones previas** | En la primera ejecución no hay Patterns previos. F₃ es vacuamente cierto. |
| **Resolver ambigüedades de proyección** (cuáles 11 campos exactos) | ✅ Resuelto arquitectónicamente en PDE-1 §2.2. Los 11 campos están congelados. |

---

## 4. Criterios de finalización

PD-IM-1 se declara completado cuando **todos** los siguientes criterios se cumplen:

### 4.1 Código

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **C01** | `src/lib/pattern-discovery/` existe con los 12 módulos definidos en §2.1 | `ls src/lib/pattern-discovery/` |
| **C02** | `Pattern` es un Value Object inmutable. `id` = H(R ∥ D) determinístico. | Test unitario |
| **C03** | `Pattern` versiona correctamente: misma identidad, diferente θ → nueva versión | Test unitario |
| **C04** | `project()` retorna exactamente 11 campos desde `MemorySnapshot[19]` | Test unitario |
| **C05** | `detect()` genera relaciones candidatas desde datos controlados | Test unitario |
| **C06** | `evaluate()` implementa F₁ ∧ F₂ ∧ F₃ ∧ F₄ correctamente | Test unitario por filtro |
| **C07** | F₂ detecta invariantes del catálogo (match por pattern) | Test unitario |
| **C08** | F₄ calcula lift y p-value, aplica corrección Bonferroni | Test unitario |
| **C09** | `isPatternDiscoveryEnabled()` retorna `false` por defecto | Test unitario |
| **C10** | `isPatternDiscoveryEnabled()` retorna `true` si env var está en `'true'` | Test unitario |
| **C11** | `orchestrator.execute()` ejecuta pipeline completo: watermark → MemoryRead → proyección → detección → aceptación → persistencia | Test de integración |
| **C12** | `orchestrator.execute()` aborta con `status: 'aborted_no_data'` si no hay snapshots nuevos | Test de integración |
| **C13** | `pd-service.discover()` respeta `PATTERN_DISCOVERY_ENABLED`: false → aborta | Test unitario |
| **C14** | `pd-service.discover()` nunca lanza (retorna `PatternRun` en todos los casos) | Test unitario |
| **C15** | Tablas del Pattern Catalog creadas: `pd_patterns`, `pd_runs`, `pd_candidates`, `pd_watermark`, `pd_invariants` | Migración verificable |
| **C16** | Seed de invariantes cargado en `pd_invariants` | Consulta DB |
| **C17** | `src/lib/evidence/` no tiene ninguna modificación | `git diff src/lib/evidence/` vacío |
| **C18** | `src/lib/memory/` no tiene ninguna modificación | `git diff src/lib/memory/` vacío |
| **C19** | `src/lib/services/` (operacional) no tiene ninguna modificación | `git diff src/lib/services/` vacío |

### 4.2 Calidad

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **Q01** | Build compila sin errores | `npm run build` exit code 0 |
| **Q02** | Tests de evidence existentes pasan (0 regresiones) | `npx vitest run tests/unit/evidence/` |
| **Q03** | Tests de memory existentes pasan (0 regresiones) | `npx vitest run tests/unit/memory/` |
| **Q04** | Tests de pattern-discovery nuevos pasan | `npx vitest run tests/unit/pattern-discovery/` + integración |
| **Q05** | Contratos del proyecto se cumplen | `bash ael/contracts/enforce.sh` exit code 0 |
| **Q06** | 0 regresiones en el total de tests del proyecto | `npm test` contra baseline |

### 4.3 Documentación

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **D01** | `PROJECT_BOARD.md` actualizado con tareas PD-IM-1 marcadas DONE, entrada D51 creada | Archivo leído |
| **D02** | `CHANGELOG.md` con entrada de PD-IM-1 | Archivo leído |
| **D03** | `ROADMAP.md` actualizado: Pattern Discovery pasa de "⏳ Diseño" a "🟡 Implementado" | Archivo leído |
| **D04** | Este documento (PD-IM-0) referenciado desde `PROJECT_BOARD.md` | Archivo leído |

### 4.4 Gobernanza

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **G01** | Ningún archivo fuera de `src/lib/pattern-discovery/` + `src/config/env.ts` fue modificado | `git diff --name-only` revisado |
| **G02** | `PATTERN_DISCOVERY_ENABLED` es el ÚNICO feature flag nuevo. No se introducen flags no especificados. | `git diff src/config/env.ts` revisado |
| **G03** | Patrones detectados en datos reales (OP-1) verificables: al menos 1 Pattern o justificación de por qué no | `orchestrator.execute()` contra snapshots reales |

---

## 5. Entregables

### 5.1 Código

| # | Entregable | Ruta estimada |
|:-:|-----------|:-------------:|
| E1 | Tipos compartidos de PD | `src/lib/pattern-discovery/types.ts` |
| E2 | Pattern Value Object | `src/lib/pattern-discovery/pattern.ts` |
| E3 | Proyección 19→11 | `src/lib/pattern-discovery/projection.ts` |
| E4 | Detector de relaciones | `src/lib/pattern-discovery/detector.ts` |
| E5 | Evaluador de Acceptance Contract | `src/lib/pattern-discovery/acceptance.ts` |
| E6 | Catálogo de invariantes | `src/lib/pattern-discovery/invariant-catalog.ts` |
| E7 | Adaptador MemoryRead | `src/lib/pattern-discovery/memory-read.ts` |
| E8 | Pattern Repository | `src/lib/pattern-discovery/repository.ts` |
| E9 | Watermark Manager | `src/lib/pattern-discovery/watermark.ts` |
| E10 | Orquestador del pipeline | `src/lib/pattern-discovery/orchestrator.ts` |
| E11 | Punto de entrada público | `src/lib/pattern-discovery/pd-service.ts` |
| E12 | Barrel export | `src/lib/pattern-discovery/index.ts` |
| E13 | Feature flag env var | `src/config/env.ts` (añadir `PATTERN_DISCOVERY_ENABLED`) |
| E14 | Migración de base de datos (5 tablas) | `src/lib/db/migrations/` o schema en initSchema() |
| E15 | Tests unitarios de PD | `tests/unit/pattern-discovery/*.test.ts` |
| E16 | Tests de integración de PD | `tests/integration/pattern-discovery-*.test.ts` |

### 5.2 Documentación actualizada

| # | Entregable |
|:-:|-----------|
| D1 | PROJECT_BOARD.md — tareas PD-IM-1 marcadas DONE |
| D2 | CHANGELOG.md — entrada de misión PD-IM-1 |
| D3 | ROADMAP.md — Pattern Discovery actualizado a "Implementado" |

---

## 6. Árbol de decisión: ¿pertenece a PD-IM-1?

Para determinar si una funcionalidad o tarea pertenece a PD-IM-1, aplicar este árbol:

```
Paso 1: ¿Requiere modificar src/lib/evidence/?
  └─ Sí → ❌ NO pertenece a PD-IM-1. EE está frozen (ADR-009).
  └─ No → Ir a paso 2.

Paso 2: ¿Requiere modificar src/lib/memory/?
  └─ Sí → ❌ NO pertenece a PD-IM-1. Memory está implementada y congelada.
  └─ No → Ir a paso 3.

Paso 3: ¿Requiere modificar src/lib/services/ (operacional)?
  └─ Sí → ❌ NO pertenece a PD-IM-1. PD es offline/batch (POA-1 N5).
  └─ No → Ir a paso 4.

Paso 4: ¿Requiere modificar el Acceptance Contract (PAA-1)?
  └─ Sí → ❌ NO pertenece a PD-IM-1. PAA-1 está congelado.
  └─ No → Ir a paso 5.

Paso 5: ¿Requiere modificar la ontología de Pattern (POA-1)?
  └─ Sí → ❌ NO pertenece a PD-IM-1. POA-1 está congelado.
  └─ No → Ir a paso 6.

Paso 6: ¿Requiere modificar la arquitectura de ejecución (PDE-1)?
  └─ Sí → ❌ NO pertenece a PD-IM-1. PDE-1 está congelado.
  └─ No → Ir a paso 7.

Paso 7: ¿Es una transformación L(W) → PatternSet?
  └─ Sí → ✅ PERTENECE a PD-IM-1. Es la responsabilidad principal.
  └─ No → Ir a paso 8.

Paso 8: ¿Es soporte necesario para L(W) → PatternSet (watermark, repo, flag, proyección, detector, acceptance)?
  └─ Sí → ✅ PERTENECE a PD-IM-1. Es infraestructura del pipeline.
  └─ No → ❌ NO pertenece a PD-IM-1. Fuera de alcance.
```

---

## 7. Reglas de contratación

### 7.1 Reglas de integridad

| Regla | Descripción | Consecuencia de violación |
|-------|-------------|--------------------------|
| **R-I1** | PD-IM-1 no modifica `src/lib/evidence/` bajo ninguna circunstancia | ❌ Violación del freeze ADR-009. Rechazo automático en code review. |
| **R-I2** | PD-IM-1 no modifica `src/lib/memory/` bajo ninguna circunstancia | ❌ Violación del freeze de Memory. Rechazo automático. |
| **R-I3** | PD-IM-1 no modifica `src/lib/services/` (operacional) | ❌ Violación de separación offline/online. Rechazo automático. |
| **R-I4** | PD-IM-1 no introduce nuevas capas arquitectónicas | ❌ Violación de minimalidad. Requiere nuevo ADR. |
| **R-I5** | PD-IM-1 no implementa Goals, Learning, Planning, ni ningún consumidor de Patterns | ❌ Violación de alcance. Requiere nuevo PR. |

### 7.2 Reglas de calidad

| Regla | Descripción |
|-------|-------------|
| **R-Q1** | `pd-service.discover()` nunca lanza. Retorna `PatternRun` con `status: 'failed'` si hay error. |
| **R-Q2** | Toda construcción de `Pattern` pasa por el constructor de `pattern.ts` — no se construyen patterns manualmente. |
| **R-Q3** | El feature flag `PATTERN_DISCOVERY_ENABLED` es el único guard para ejecutar. Sin flag = sin operación. |
| **R-Q4** | `pd-service.discover()` es el ÚNICO punto de entrada público. No se llama a `orchestrator.execute()` desde otro lugar. |
| **R-Q5** | La proyección 19→11 respeta el boundary definido en PBA-1: PD proyecta internamente, Memory no participa. |
| **R-Q6** | El Acceptance Contract (PAA-1) se implementa COMPLETO. No se omiten filtros. No se modifican condiciones. |

### 7.3 Reglas de dependencias (R-DEP)

Aprobadas en IDA-1. El incumplimiento de cualquiera de estas reglas constituye una violación del DAG aprobado.

| Regla | Enunciado | Consecuencia de violación |
|:------|:----------|:-------------------------|
| **R-DEP-1** | Ningún módulo importa de `index.ts`. Todos importan del archivo específico. | ❌ Ciclo potencial en barrel. Rechazo en code review. |
| **R-DEP-2** | `types.ts` no importa ningún módulo de PD. Es la fundación del DAG. | ❌ Ciclo en el grafo. Rechazo automático. |
| **R-DEP-3** | Los módulos de implementación (`detector.ts`, `acceptance.ts`, `invariant-catalog.ts`, `memory-read.ts`, `repository.ts`, `watermark.ts`) importan exclusivamente de `types.ts` y de módulos externos a PD. No importan entre sí. | ❌ Acoplamiento innecesario entre implementaciones. Rechazo automático. |
| **R-DEP-4** | `pattern.ts` y `projection.ts` importan exclusivamente de `types.ts` y externos. No importan de otros módulos de implementación. | ❌ Acoplamiento innecesario. Rechazo automático. |
| **R-DEP-5** | `orchestrator.ts` es el ÚNICO módulo que puede importar de módulos de implementación concretos. | ❌ Composición Root descentralizada. Rechazo automático. |
| **R-DEP-6** | `pd-service.ts` importa exclusivamente de `types.ts` y `orchestrator.ts`. No importa de ningún otro módulo de implementación. | ❌ Acoplamiento del entry point con detalles internos. Rechazo automático. |
| **R-DEP-7** | Ningún módulo importa `index.ts` como dependencia interna. `index.ts` solo es importado por código externo a PD. | ❌ Ciclo y acoplamiento interno. Rechazo automático. |

### 7.4 Reglas de datos

| Regla | Descripción |
|-------|-------------|
| **R-D1** | PD-IM-1 no elimina ni modifica snapshots en `cognitive_memory_snapshots` | P-I9: Read-only sobre Memory |
| **R-D2** | PD-IM-1 no escribe en tablas con prefijo distinto de `pd_` en la DB | Separación de dominios |
| **R-D3** | PD-IM-1 trata los datos de Memory como inmutables. No cachea localmente snapshots sin watermark. | M-1: Append-only |

---

## 8. Riesgos de alcance

### 8.1 Riesgos de expansión (scope creep)

| ID | Riesgo | Mitigación |
|:--:|--------|-----------|
| **SC1** | Tentación de implementar algoritmos de detección avanzados "para que PD sea más útil" | PD-IM-1 implementa detectores simples (correlación, contingencia, estabilidad). Algoritmos avanzados son futuras iteraciones. |
| **SC2** | Tentación de crear una API REST para PD "para poder invocarlo desde el browser" | PD es offline/batch. La invocación es por CLI o scheduler. No hay API en PD-IM-1. |
| **SC3** | Tentación de "mejorar" Memory (agregar índices, campos, consultas) para beneficio de PD | Memory está congelada. PD se adapta a Memory, no al revés. |
| **SC4** | Tentación de integrar PD en lead.service.ts "para tener patrones en tiempo real" | PD es offline. No corre en el path crítico (POA-1 N5). |
| **SC5** | Tentación de construir un dashboard de Patterns | Sin consumidor UI. Los Patterns se almacenan en el catálogo. |

### 8.2 Riesgos de omisión

| ID | Riesgo | Mitigación |
|:--:|--------|-----------|
| **SO1** | Olvidar crear las tablas del Pattern Catalog | Criterio C15 + entregable E14 lo exigen explícitamente. |
| **SO2** | Olvidar el feature flag (PD siempre activo) | Criterio C09/C10 + entregable E13 lo exigen. |
| **SO3** | Olvidar el seed de invariantes (F₂ sin catálogo) | Criterio C16 lo exige. Sin catálogo, F₂ no puede operar. |
| **SO4** | No verificar que PD funciona con datos reales de OP-1 | Criterio G03 lo exige: al menos 1 Pattern o justificación. |
| **SO5** | F₄ sin corrección por múltiples comparaciones (falsos positivos) | Criterio C08 exige corrección Bonferroni. |

### 8.3 Dependencias externas

| ID | Dependencia | Riesgo | Mitigación |
|:--:|:-----------|:-------|:-----------|
| **DEP1** | Memory debe tener snapshots para que PD detecte patrones | Si Memory está deshabilitado o no tiene datos, PD aborta graciosamente. No es un error. | Watermark + countNewSnapshots |
| **DEP2** | La tabla `cognitive_memory_snapshots` debe existir | PD-IM-1 asume que IM-1 ya creó la tabla. | IM-1 completado y verificado. |

---

## 9. Veredicto

| Elemento | Estado |
|:---------|:------:|
| Componentes | ✅ 12 módulos definidos |
| Interfaces públicas | ✅ `PatternDiscoveryService.discover()` + `discoverDryRun()` |
| Pipeline interno | ✅ Desde MemoryRead hasta PatternRepository, con watermark, proyección, detección, aceptación |
| Exclusiones | ✅ 18 funcionalidades excluidas con justificación |
| Feature flag | ✅ `PATTERN_DISCOVERY_ENABLED` (nuevo, default false) |
| Criterios de aceptación | ✅ 19 de código + 6 de calidad + 4 de documentación + 3 de gobernanza |
| Dependencias externas | ✅ Memory operacional (16 snapshots reales) |
| Árbol de decisión | ✅ 8 pasos con 3 puntos de pertenencia |

> ## READY TO START PD-IM-1
>
> **No se detectan gaps arquitectónicos. La implementación de Pattern Discovery puede comenzar.**
>
> Todos los contratos están definidos: ontología (POA-1), aceptación (PAA-1), entrada (MRC-1), boundary (PBA-1), ejecución (PDE-1), alcance (PD-IM-0).
>
> PD-IM-1 implementará 12 módulos en `src/lib/pattern-discovery/`, 5 tablas en DB, 1 feature flag, y un pipeline completo desde MemoryRead hasta PatternRepository, produciendo el primer conjunto de Patterns cognitivos a partir de los 16 snapshots reales de OP-1.

---

*Fin de PD-IM-0 — Pattern Discovery Implementation Scope*
