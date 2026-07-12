# LEVEL IV — Fase IV-1: Evidence Engine — Plan de Implementación

> Basado en el corpus constitucional congelado (Architecture Freeze V2).
> No modifica diseño. No rediseña. No reabre decisiones.
> Solo transforma el modelo cognitivo aprobado en código incremental.

---

## 1. Estado Actual del Pipeline

### 1.1 Flujo completo (mensaje → respuesta)

```
WhatsApp WebHook
  │
  ▼
handleLeadMessage()  [src/lib/services/lead.service.ts]
  │
  ├─ handleCommandShortcuts()        → early return
  ├─ handleAdminCommands()           → early return
  ├─ handleConversationSetup()       → session + history
  ├─ handleOpportunityResponse()     → early return
  │
  ├─ core(text)                      → facts[] + intent + confidence
  │   [src/lib/ai/core.ts]           (regex puro, NO LLM)
  │
  ├─ interpretMessage()              → MessageClassification
  │   [src/lib/ai/conversation-interpreter.ts]
  │
  ├─ runComprehensionCheck()         → puede halt
  │   [src/lib/services/extraction/comprehension-runner.ts]
  │
  ├─ runExtractionPipeline()         → LLM extrae slots → pricing
  │   [src/lib/services/extraction/extraction-runner.ts]
  │   ├─ extractSlots()              → LLM call (Groq)
  │   ├─ calculateSlotConfidence()   → slot scores
  │   ├─ resolvePricingForSlots()    → tariff match → price
  │   └─ evaluateWorkflowTransition()→ state machine
  │
  ├─ buildExtractionContext()        → merge
  │
  └─ handlePolicyPipeline()          → response + execution
      [src/lib/services/workflow/policy-pipeline.ts]
      ├─ shouldRequestConfirmation() → slot_confirmation UI
      ├─ canDispatch()/isQuoteReady()→ readiness check
      ├─ processLead()               → handler → core → router → policy
      │   └─ handleMessage()
      │       [src/lib/ai/handler.ts]
      │       ├─ core()
      │       ├─ router()            → OutputType
      │       ├─ computeStrategyDecision()
      │       ├─ buildDomainPolicy()
      │       │   ├─ policyAhora()
      │       │   └─ policyReserva()
      │       └─ generateLLMResponse()→ LLM final text
      └─ executeTrip() / executeNowTrip() → side effects
```

### 1.2 Componentes actuales vs. modelo constitucional

| Constitución | Sistema actual | Archivo | Estado |
|---|---|---|---|
| **Signal** (ONT §4.1) | `text: string` + `phone: string` + metadata WhatsApp | `lead.service.ts`, webhook route | **No modelado**. Raw string |
| **Observation** (ONT §4.2) | Mensaje después de `handleConversationSetup()` | `lead.service.ts` L70 | **Inexistente**. No hay tipo |
| **Fact** (ONT §4.3) | `CoreDecision.facts[]: string[]` — flat strings | `core.ts` | **Tipo incorrecto**. Strings planos, sin estructura |
| **Evidence** (ONT §4.4) | No existe. Closest: `MessageRow.content` + `extractionNote` | DB + extraction-runner | **No modelado**. Sin Evidence Store |
| **Confidence** | `core.confidence` + `ConfidenceMap` + `slot.score` | `core.ts`, `confidence.ts` | **Heurístico**. No es Certainty Calculus |
| **Knowledge** (KM) | `ChatSessionRow.slots` (JSON blob) + `ContextMemory` | DB + memory/ | **Flat**. Sin Belief Network |
| **Decision** (DM) | `router.ts` → `OutputType` + `StrategyDecision` | `router.ts`, `conversation-strategy.ts` | **Implícito**. Sin Decision Trace |
| **Commitment** (CM) | `TripRow` + `DispatchEventRow` | DB, trip-execution | **Implícito**. Sin lifecycle formal |

---

## 2. Matriz de Equivalencias Detallada

### 2.1 Signal

```typescript
// ACTUAL — no hay tipo formal, se pasa como string suelto
function handleLeadMessage(phone: string, text: string): Promise<void>

// DESTINO (Constitución §4.1 + CHANNEL_ADAPTER R-CAD-001)
interface Signal {
  id: string;                    // UUID
  channel: "whatsapp" | "web" | "api";
  rawContent: string;            // texto original
  phone: string;                 // identificador de usuario
  receivedAt: number;            // timestamp
  mediaType?: string;            // image, audio, etc.
  mediaId?: string;              // WhatsApp media ID
  metadata?: Record<string, unknown>;
}
```

**Brecha**: La raw content ya existe como `text`. Falta estructura formal con metadatos de canal, id, timestamp. El webhook de WhatsApp (`api/whatsapp/webhook`) ya recibe esta información — se pierde en la interfaz.

### 2.2 Observation

```typescript
// ACTUAL — inexistente
// DESTINO (Constitución §4.2 + EVIDENCE_MODEL R-EM-007)
interface Observation {
  id: string;
  signalId: string;
  phone: string;
  validatedContent: string;
  channel: string;
  receivedAt: number;
  validatedAt: number;
  validationResult: "valid" | "invalid" | "stale";
}
```

**Brecha**: No existe concepto de validación de Signal. El mensaje pasa directo a `core()`.

### 2.3 Fact

```typescript
// ACTUAL — flat strings en un array
// core.ts produce facts como:
//   "now:ahora", "passengers:2", "flight:AR1234",
//   "origin:Aeropuerto", "destination:Centro"
// Esto es frágil: el formato string no tiene schema.
// Se parsea con .startsWith() por todo el código.

// DESTINO (Constitución §4.3 + EVIDENCE_MODEL R-EM-008, R-EM-014)
interface Fact {
  id: string;
  observationId: string;
  type: FactType;
  value: string | number | boolean;
  confidence: number;         // 0-1
  source: "regex" | "llm" | "user";
  extractedAt: number;
  proposition: string;        // representación proposicional
}
type FactType =
  | "origin" | "destination" | "passengers" | "flight"
  | "scheduled_time" | "urgency" | "affirmation"
  | "commercial_query" | "informational_query"
  | "greeting" | "emergency" | "reschedule"
  | "correction" | "ambiguity" | "airport_mention";
```

**Brecha**: Los facts actuales son strings sin estructura, sin id, sin source tracking. `core.ts` hace detección regex pero no produce Facts — produce strings planos.

### 2.4 Evidence

```typescript
// ACTUAL — no existe. La información se pierde después de cada turno.
// Solo persiste: MessageRow (content + role) + ChatSessionRow.slots (último estado)
// No hay trazabilidad de cómo se llegó a un slot value.

// DESTINO (Constitución §4.4 + EVIDENCE_MODEL R-EM-001 a R-EM-005)
interface Evidence {
  id: string;
  observationId: string;
  factIds: string[];
  type: "user_input" | "system_inference" | "backend_response" | "outcome";
  content: string;              // contenido semántico
  confidence: number;           // 0-1
  source: {
    type: "user" | "regex" | "llm" | "backend" | "system";
    confidence: number;         // Confidence de la fuente (CP-38)
  };
  timestamp: number;
  provenance: string[];         // cadena de IDs de evidencia previa
  relationships: EvidenceLink[];
}
```

**Brecha**: **No existe**. Es la brecha más grande. No hay registro de qué evidencia llevó a qué slot. No hay trazabilidad. No hay append-only store.

### 2.5 Confidence (actual)

```typescript
// ACTUAL — distribuido en tres lugares:
// 1. core.ts: computeConfidence() → número único (0.4-0.9)
//    basado en intent + cantidad de facts + location_ambiguous penalty
// 2. extraction/confidence.ts: calculateSlotConfidence() → por slot scores
// 3. confidence-map.ts: buildConfidenceMap() → ConfidenceMap

interface ConfidenceMap {  // actual
  intent: number;
  origin: number;
  destination: number;
  date: number;
  time: number;
  passengers: number;
  mode: number;
}

// DESTINO: CERTAINTY_CALCULUS.md (Fase IV-3). Por ahora NO reemplazar.
// Pero SÍ necesitamos registrar la confidence actual como atributo de Evidence.
```

### 2.6 Knowledge (actual)

```typescript
// ACTUAL — ChatSessionRow (DB)
interface ChatSessionRow {
  phone: string;
  slots: string | null;           // JSON: { origin, destination, passengers, ... }
  confidence: string | null;      // JSON: { origin: 0.9, destination: 0.7, ... }
  conversational_state: string;   // "idle" | "collecting_slots" | "slot_confirmation" | ...
  clarify_field: string | null;
  dispatch_state: string | null;
  trip_state: string | null;
  slot_states: string | null;     // JSON: { origin: { source, status }, ... }
  // plus: extraction_count, lang, comprehension_*, etc.
}
```

**Brecha**: Estado plano, no hay Belief Network. No hay separación Active/Archive. Los slots son strings, no Beliefs.

### 2.7 Decision (actual)

```typescript
// ACTUAL — dos niveles:
// 1. router.ts → OutputType: "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK"
// 2. StrategyDecision → mode, tone, speed, behaviorFlags
// 3. PolicyOutput → decision final + finalResponse

// DESTINO: DECISION_MODEL.md (Fase IV-4). Por ahora no reemplazar.
```

### 2.8 Commitment (actual)

```typescript
// ACTUAL — TripRow en DB
// No hay Commitment Gate, no hay lifecycle explícito.
// DESTINO: COMMITMENT_MODEL.md (Fase IV-5). Por ahora no reemplazar.
```

---

## 3. Análisis de Reutilización, Refactor y Eliminación

### 3.1 Reutilizable sin cambios

| Código | Razón |
|---|---|
| `core.ts` — detección regex de facts | Lógica de extracción determinista válida. Debe producir `Fact` en lugar de `string[]` |
| `conversation-interpreter.ts` | ADR-007 válido. Producirá Observations |
| `patterns.ts` | Fuente única de regex. Se reutiliza |
| `confidence.ts` — `calculateSlotConfidence()` | Lógica de scoring reutilizable como factor de Certainty |
| `extraction-schema.ts` | Schema Zod reutilizable para validación |
| `operational-readiness.ts` | `canDispatch()`, `isQuoteReady()` — reglas de negocio válidas |
| `evaluateCompleteness.ts` | Lógica de qué slots faltan — reutilizable |
| `slot-workflow.ts` | State machine de recolección — reutilizable como estado conversacional |
| `resolve-pricing-for-slots.ts` | Pricing — servicio externo, se inyecta |

### 3.2 Refactor necesario

| Código | Cambio requerido |
|---|---|
| `core.ts` output | Cambiar `facts: string[]` → `facts: Fact[]` con tipo estructurado. El CORE sigue siendo determinista |
| `lead.service.ts` | Inyectar ObservationBuilder y FactBuilder en el pipeline. No cambiar flujo principal |
| `extraction-runner.ts` | El resultado del LLM debe registrar Evidence: qué slots produjo, con qué source/confidence |
| `confidence-map.ts` | La ConfidenceMap actual debe poder exportarse como `Certainty[]` para compatibilidad |
| `session-helpers.ts` | `parseSessionSlots()` debe convivir con el nuevo Evidence Store |
| `policy-pipeline.ts` | Leer del Evidence Store en lugar de solo `extractionCtx.slots` (modo shadow) |

### 3.3 Eliminación progresiva

| Código | Cuándo eliminar | Razón |
|---|---|---|
| `ChatSessionRow.slots` JSON | Fase IV-2 (Knowledge State) | Reemplazado por Belief Network + Evidence Store |
| `slot-state.ts` / `buildSlotStates()` | Fase IV-2 | State management será del Knowledge State |
| `context-memory.ts` | Fase IV-2 | Reemplazado por Conversation Memory formal |

### 3.4 Deuda técnica detectada

| Deuda | Impacto | Mitigación |
|---|---|---|
| **Slots como JSON blob** sin schema | Imposible migrar datos, frágil | Migrar a Evidence Store primero |
| **core() ejecutado 2 veces** por ciclo (lead.service L78 + handler L75) | Duplicación, inconsistencia potencial | Shadow Mode detectará divergencias |
| **confidence duplicada** (core.confidence + confidenceMap + slot.score) | 3 fuentes de verdad | Evidence Store será fuente única |
| **extractionNote como string** para LLM | Frágil, no estructurado | Reemplazar con Facts+Evidence |
| **Sin trazabilidad** de decisiones | No se puede auditar | Evidence Store + Decision Trace |

---

## 4. Estrategia Shadow Mode

### 4.1 Principio

El Evidence Engine nuevo corre en **paralelo** al pipeline actual. Escribe al Evidence Store pero el sistema sigue leyendo de `ChatSessionRow.slots`. En cada turno se comparan los resultados y se loggean divergencias.

### 4.2 Arquitectura Shadow

```
Pipeline Actual                        Shadow Evidence Engine
─────────────────                      ──────────────────────
                                       
Signal (raw text)                       
  │                                      │
  ▼                                      ▼
handleConversationSetup()               ObservationBuilder
  │                                      │
  ▼                                      ▼
core() → facts: string[]                FactBuilder → Fact[]
  │                                      │
  ▼                                      ▼
extractSlots() → LLM slots              EvidenceStore.append()
  │                                      │
  ▼                                      ▼
confidenceResult                        Certainty (registra)
  │                                      │
  ▼                                      ▼
policy-pipeline                         Comparación
  │                                      │
  ▼                                      ▼
response                               log divergence
```

### 4.3 Puntos de Inyección

En `lead.service.ts`, se agregan hooks shadow DESPUÉS de cada etapa existente:

```typescript
// 1. Después de handleConversationSetup
const signal = shadowObservationBuilder.fromWebhook(phone, text, metadata);
const observation = shadowObservationBuilder.validate(signal);

// 2. Después de core()
const facts = shadowFactBuilder.fromCore(leadCore, observation.id);

// 3. Después de runExtractionPipeline()
await shadowEvidenceStore.append(observation, facts, extractionResult);

// 4. Comparar resultados
const divergence = shadowComparator.compare(
  currentSlots,          // de ChatSession
  evidenceSlots,         // de Evidence Store
);
if (divergence.hasDivergence) {
  log.warn("[SHADOW] divergence detected", divergence);
}
```

### 4.4 Shadow Store (primera iteración)

La primera iteración del Evidence Store será:

```typescript
// En memoria + archivo local (no DB todavía)
class ShadowEvidenceStore {
  private store: Evidence[] = [];
  
  append(evidence: Evidence): void;
  getByObservation(observationId: string): Evidence[];
  getByFact(factId: string): Evidence[];
  getByPhone(phone: string): Evidence[];
  export(): Evidence[];            // para análisis offline
  clear(): void;                   // para tests
}
```

**Persistencia inicial**: Archivo JSON por sesión en `data/shadow/`.  
**Persistencia final** (PRs posteriores): Tabla `evidence_store` en DB.

### 4.5 Divergencias detectables

| Tipo | Señal | Acción |
|---|---|---|
| Slot value mismatch | Evidence vs ChatSession difieren | Log + metric |
| Confidence mismatch | Evidence.confidence vs slot.score difieren > 0.2 | Log + metric |
| Orphan slot | Slot en ChatSession sin Evidence | Log |
| Missing slot | Evidence sugiere slot que ChatSession no tiene | Log + metric |
| Timing anomaly | Extraction LLM tomó > 5s | Log + metric |

---

## 5. Plan de PRs Incrementales

Cada PR debe:
- Compilar (`npm run build`)
- Tests pasar (`npm test`)
- Contratos pasar (`bash ael/contracts/enforce.sh`)
- Ser funcionalmente neutral (no cambiar comportamiento observable)
- Ser reversible (desactivar flag feature → vuelve al comportamiento anterior)

### PR 1: Tipos base del Evidence Engine

**Archivos a crear:**
- `src/lib/evidence/types.ts` — interfaces Signal, Observation, Fact, Evidence
- `src/lib/evidence/errors.ts` — errores específicos

**Archivos a modificar:**
- Ninguno del pipeline existente

**Verificación:**
- `npm run build` compila
- Los tipos son referenciables pero no usados todavía

**Riesgo:** Cero. Solo tipos nuevos.

---

### PR 2: ObservationBuilder — estructura Signal + Observation

**Archivos a crear:**
- `src/lib/evidence/observation-builder.ts`
- `src/lib/evidence/signal.ts`

**Archivos a modificar:**
- `src/lib/evidence/types.ts` (ajustes menores)

**Lógica:**
```typescript
export function buildSignal(phone: string, text: string, metadata?: Record<string, unknown>): Signal;
export function buildObservation(signal: Signal, validationResult?: string): Observation;
```

**Verificación:**
- Tests unitarios: Signal → Observation pipeline
- No inyectado en pipeline real todavía

**Riesgo:** Bajo. Caja pura sin side effects.

---

### PR 3: FactBuilder — convertir core() output a Facts

**Archivos a crear:**
- `src/lib/evidence/fact-builder.ts`

**Archivos a modificar:**
- `src/lib/evidence/types.ts` (ajustes)

**Lógica:**
```typescript
export function factsFromCore(coreDecision: CoreDecision, observationId: string): Fact[];
// Convierte facts: string[] → Fact[] con type mapping
```

**Verificación:**
- Tests: core facts → Fact[] mapping completo
- Verificar que ningún fact string se pierde

**Riesgo:** Bajo. Función pura.

---

### PR 4: ShadowEvidenceStore — store en memoria

**Archivos a crear:**
- `src/lib/evidence/evidence-store.ts` (interfaz)
- `src/lib/evidence/shadow-store.ts` (implementación en memoria + archivo)

**Archivos a modificar:**
- Ninguno del pipeline

**Lógica:**
```typescript
interface IEvidenceStore {
  append(evidence: Evidence): Promise<void>;
  getByObservation(observationId: string): Promise<Evidence[]>;
  getByPhone(phone: string): Promise<Evidence[]>;
}

class ShadowEvidenceStore implements IEvidenceStore { ... }
```

**Verificación:**
- Tests: append + read + persistence (file I/O)
- Export/import roundtrip

**Riesgo:** Bajo.

---

### PR 5: Inyección Shadow en lead.service.ts — activar con flag

**Archivos a modificar:**
- `src/lib/services/lead.service.ts` — agregar hooks shadow
- `src/config/env.ts` — agregar flag `EVIDENCE_SHADOW_MODE`
- `src/config/constants.ts` — defaults

**Lógica:**
```typescript
if (getEnv().EVIDENCE_SHADOW_MODE) {
  const signal = buildSignal(phone, text, { channel: "whatsapp" });
  const observation = buildObservation(signal);
  const facts = factsFromCore(leadCore, observation.id);
  await shadowStore.append({ ...observation, factIds: facts.map(f => f.id) });
  for (const fact of facts) {
    await shadowStore.append(fact);
  }
}
```

**Verificación:**
- `EVIDENCE_SHADOW_MODE=false` → comportamiento idéntico al actual
- `EVIDENCE_SHADOW_MODE=true` → comportamiento idéntico + writes al shadow store
- Tests de integración con mock store

**Riesgo:** Bajo con flag. Si hay bug, se desactiva el flag.

---

### PR 6: Shadow Comparator — detección de divergencias

**Archivos a crear:**
- `src/lib/evidence/shadow-comparator.ts`

**Archivos a modificar:**
- `src/lib/evidence/evidence-store.ts` (método de consulta)
- `src/lib/evidence/types.ts` (DivergenceReport)

**Lógica:**
```typescript
interface DivergenceReport {
  hasDivergence: boolean;
  mismatches: Array<{
    field: string;
    expectedValue: string | number;
    actualValue: string | number;
    severity: "info" | "warn" | "error";
  }>;
  orphanSlots: string[];
  missingSlots: string[];
}
```

**Verificación:**
- Tests: scenarios de divergencia conocidos
- Logging en producción con `EVIDENCE_SHADOW_MODE=true`

**Riesgo:** Bajo. Solo log, no afecta ejecución.

---

### PR 7: Evidence de extracción LLM — registrar slots como Evidence

**Archivos a modificar:**
- `src/lib/services/extraction/extraction-runner.ts`

**Lógica:**
Cuando `runExtractionPipeline()` produce slots con confidence, registrarlos como Evidence:

```typescript
// Al final de runExtractionPipeline, si shadow mode activo:
if (shadowMode) {
  for (const [field, slot] of Object.entries(confidenceResult.slots)) {
    const evidence: Evidence = {
      id: generateId(),
      observationId: currentObservation.id,
      type: "system_inference",
      factIds: facts.filter(f => f.type === field).map(f => f.id),
      content: String(slot.value),
      confidence: slot.score,
      source: { type: slot.reason === "backend_tariff_match" ? "backend" : "llm", confidence: slot.score },
      timestamp: Date.now(),
      provenance: [],
      relationships: [],
    };
    await shadowStore.append(evidence);
  }
}
```

**Verificación:**
- Evidence Store contiene los slots extraídos
- Comparador no reporta divergencias para slots coincidentes

**Riesgo:** Medio (toca extraction-runner). Protegido por flag shadow mode.

---

### PR 8: Evidence de pricing — registrar como Evidence

**Archivos a modificar:**
- `src/lib/services/pricing/resolve-pricing-for-slots.ts`

**Lógica:**
El resultado del pricing (tariff match, precio) se registra como Evidence con source type "backend".

**Verificación:**
- Evidence Store contiene pricing evidences
- Trazabilidad: slot price → evidence → tariff match

**Riesgo:** Bajo. Pricing es servicio externo, se registra su output.

---

### PR 9: Dashboard de divergencias — herramienta de análisis

**Archivos a crear:**
- `scripts/analyze-shadow-data.ts` — script CLI
- `src/app/api/admin/shadow-report/route.ts` — endpoint admin

**Lógica:**
- Lee archivos shadow del día
- Produce reporte de divergencias agregado
- Muestra métricas: % de divergencia, slots más conflictivos

**Verificación:**
- Ejecución manual sobre datos shadow de staging
- Reporte legible

**Riesgo:** Bajo. Herramienta auxiliar.

---

### PR 10: Evidence Store schema DB — migración + tabla

**Archivos a crear:**
- `src/lib/db/domains/evidence.ts` — queries evidence_store
- Migración SQL: `CREATE TABLE evidence_store (...)`

**Archivos a modificar:**
- `src/lib/evidence/evidence-store.ts` — implementación DB

**Schema:**
```sql
CREATE TABLE evidence_store (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- 'user_input' | 'system_inference' | 'backend_response' | 'outcome'
  fact_type TEXT,               -- 'origin' | 'destination' | etc.
  fact_value TEXT,
  confidence REAL NOT NULL DEFAULT 0.0,
  source_type TEXT NOT NULL,    -- 'user' | 'regex' | 'llm' | 'backend' | 'system'
  source_confidence REAL NOT NULL DEFAULT 0.0,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  provenance TEXT,              -- JSON array de evidence ids
  metadata TEXT,                -- JSON
  FOREIGN KEY (observation_id) REFERENCES observations(id)
);

CREATE INDEX idx_evidence_phone ON evidence_store(phone);
CREATE INDEX idx_evidence_observation ON evidence_store(observation_id);
CREATE INDEX idx_evidence_created ON evidence_store(created_at);
```

**Verificación:**
- Migración: `initSchema()` incluye la nueva tabla
- CRUD: insert + query + index scan
- Shadow Store persiste a DB

**Riesgo:** Medio. Cambia schema. Protegido por flag shadow mode.

---

## 6. Timeline Estimado

| PR | Archivos | Días | Depende de |
|---|---|---|---|
| PR 1: Tipos base | 2 nuevos | 0.5 | — |
| PR 2: ObservationBuilder | 2 nuevos | 0.5 | PR 1 |
| PR 3: FactBuilder | 1 nuevo | 0.5 | PR 1 |
| PR 4: ShadowEvidenceStore | 2 nuevos | 1 | PR 1 |
| PR 5: Inyección shadow | 3 modificados | 1 | PR 2, PR 3, PR 4 |
| PR 6: Shadow Comparator | 2 nuevos + 2 mod | 1 | PR 5 |
| PR 7: Evidence de extracción | 1 modificado | 1 | PR 5 |
| PR 8: Evidence de pricing | 1 modificado | 0.5 | PR 5 |
| PR 9: Dashboard divergencias | 2 nuevos | 1 | PR 6 |
| PR 10: Evidence Store DB | 2 nuevos + migración | 2 | PR 4, PR 5 |
| **Total** | | **~9 días** | |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Shadow mode afecta performance | Baja | Medio | Store en memoria + file I/O async. Flag desactivable |
| Divergencias falsas positivas | Alta | Bajo | Comparador con tolerancia configurable. Dashboard para filtrar |
| Evidence Store crece sin control | Media | Medio | Límite de tamaño en shadow. Rotación diaria de archivos |
| LLM extraction produce Evidence inconsistente | Media | Bajo | La comparación shadow detecta y loggea. No afecta al usuario |
| Migración DB conflictiva | Baja | Alto | PR separado. Rollback con flag. Schema versionado |

---

## 8. Criterios de Éxito de la Fase IV-1

La Fase IV-1 se considera completada cuando:

1. ✅ El Evidence Store recibe y persiste toda la evidencia de cada turno (shadow mode)
2. ✅ No hay divergencias críticas entre el sistema actual y el Evidence Store
   (tolerancia: < 5% de divergencias en slots value)
3. ✅ La trazabilidad es completa: cada slot value tiene su cadena de Evidence
4. ✅ El flag `EVIDENCE_SHADOW_MODE` puede activarse/desactivarse sin impacto
5. ✅ El dashboard de divergencias muestra datos útiles para el equipo
6. ✅ `npm run build` compila, `npm test` pasa, `bash ael/contracts/enforce.sh` pasa
7. ✅ Cero cambios en el comportamiento observable del asistente

---

## 9. Diagrama de Rutas de Archivos

```
src/lib/evidence/                    ← NUEVO (PR 1-4, 6)
├── types.ts                         ← PR 1: Signal, Observation, Fact, Evidence
├── errors.ts                        ← PR 1
├── signal.ts                        ← PR 2
├── observation-builder.ts           ← PR 2
├── fact-builder.ts                  ← PR 3
├── evidence-store.ts                ← PR 4: interfaz IEvidenceStore
├── shadow-store.ts                  ← PR 4: impl memoria + archivo
└── shadow-comparator.ts             ← PR 6: detección de divergencias

src/lib/services/evidence/           ← NUEVO (PR 10)
└── evidence-db.ts                   ← PR 10: impl DB

src/lib/db/domains/evidence.ts       ← NUEVO (PR 10)
src/lib/db/migrations/               ← NUEVO
└── 004_evidence_store.sql           ← PR 10

src/lib/services/lead.service.ts     ← MODIFICADO (PR 5)
src/lib/services/extraction/extraction-runner.ts  ← MODIFICADO (PR 7)
src/lib/services/pricing/resolve-pricing-for-slots.ts  ← MODIFICADO (PR 8)
src/config/env.ts                    ← MODIFICADO (PR 5)
src/config/constants.ts              ← MODIFICADO (PR 5)

scripts/analyze-shadow-data.ts       ← NUEVO (PR 9)
src/app/api/admin/shadow-report/     ← NUEVO (PR 9)
```

---

*Fin de LEVEL_IV_IMPLEMENTATION_PLAN.md — Versión 1.0*
*Basado en: Architecture Freeze V2, corpus constitucional, auditoría de código real*
