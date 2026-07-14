# IM-0 — Memory Implementation Scope

> **Autor:** Arquitecto Principal y Responsable de Gobernanza  
> **Propósito:** Definir el alcance exacto de IM-1, primera implementación de la capa Memory  
> **Documentos fuente:** ADR-010, ADR-011, ARCHITECTURE_STATUS.md, ARCHITECTURE_MILESTONE_v3.0, PR-5A/B/C, ARR-1, MPM-1, MCC-1, MCR-1, CNV-1, ATR-1  
> **Estado actual del código:** `src/lib/memory/` no existe. `COGNITIVE_MEMORY_ENABLED` no existe. `runShadowCognition()` output descartado en `lead.service.ts:83`. Memory operacional (`src/lib/services/memory/memory.ts`) NO es cognitiva.  
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Estado actual (línea de base)](#1-estado-actual-línea-de-base)
2. [¿Qué implementa IM-1?](#2-qué-implementa-im-1)
3. [¿Qué NO implementa IM-1?](#3-qué-no-implementa-im-1)
4. [Criterios de finalización](#4-criterios-de-finalización)
5. [Entregables](#5-entregables)
6. [Árbol de decisión: ¿pertenece a IM-1?](#6-árbol-de-decisión-pertenece-a-im-1)
7. [Reglas de contratación](#7-reglas-de-contratación)
8. [Riesgos de alcance](#8-riesgos-de-alcance)

---

## 1. Estado actual (línea de base)

Antes de IM-1, el proyecto se encuentra en este estado exacto:

| Elemento | Estado | Ubicación |
|----------|--------|-----------|
| Evidence Engine | ✅ Frozen, 378 tests | `src/lib/evidence/` |
| `ShadowResult` con `Belief` + `Decision` | ✅ Existe | `src/lib/evidence/shadow-result.ts` |
| `Belief` class (8 campos epistémicos) | ✅ Existe | `src/lib/evidence/belief.ts` |
| `Decision` class (7 campos cognitivos) | ✅ Existe | `src/lib/evidence/decision.ts` |
| `runShadowCognition()` | ✅ Existe, output descartado | `src/lib/evidence/run-shadow-cognition.ts`, llamado en `lead.service.ts:83` |
| Feature flag `EVIDENCE_SHADOW_MODE` | ✅ Existe | `src/lib/evidence/build-signal.ts` |
| Memory operacional (`SessionMemory`) | ✅ Existe, NO cognitiva | `src/lib/services/memory/memory.ts` |
| `src/lib/memory/` (cognitiva) | ❌ No existe | — |
| `COGNITIVE_MEMORY_ENABLED` | ❌ No existe | — |
| `isMemoryShadowModeEnabled()` | ❌ No existe | — |
| Tabla de persistencia cognitiva | ❌ No existe | — |
| ADR-010 (diseño) | ✅ Accepted, futuro ⏳ | `docs/adr/010-memory-architecture.md` |

**Línea de base verificada:** Ningún archivo en `src/lib/memory/` existe. Ninguna función `memoryService.store()` existe. Ninguna llamada a Memory cognitiva existe en `lead.service.ts`. Ninguna tabla cognitiva existe en la base de datos.

---

## 2. ¿Qué implementa IM-1?

### 2.1 Directorio y estructura

Creación del directorio `src/lib/memory/` con los siguientes módulos:

| Módulo | Responsabilidad | Ref. ADR-010 |
|--------|----------------|:------------:|
| `types.ts` | Tipos `MemorySnapshot`, `MemoryStoreInput`, `MemoryStoreResult` | File Map |
| `memory-snapshot.ts` | Entidad `MemorySnapshot` (Value Object inmutable, 19 campos) | File Map |
| `build-snapshot.ts` | Constructor: `Belief` + `Decision` + `conversationId` → `MemorySnapshot` | File Map |
| `memory-service.ts` | Punto de entrada `store()` con flag + try-catch | File Map, C7 |
| `memory-storage.ts` | Abstracción de persistencia (interfaz) | File Map |
| `index.ts` | Barrel export público | File Map |

### 2.2 MemorySnapshot — Value Object inmutable

Un snapshot que contiene exactamente 19 campos:

**Metadata (4):**
- `conversationId: string` — partición (NO semántico)
- `memoryId: string` — UUID v4, único por snapshot
- `turnNumber: number` — monótono dentro de la conversación
- `storedAt: Date` — timestamp de almacenamiento (NO `receivedAt`)

**Belief fields (8):**
- `belief.id: string`
- `belief.observationValid: boolean`
- `belief.channel: string | null`
- `belief.hasContent: boolean`
- `belief.receivedAt: string | null`
- `belief.conversationId: string | null`
- `belief.isWellFormed: boolean`
- `belief.factCount: number`

**Decision fields (7):**
- `decision.id: string`
- `decision.validInput: boolean`
- `decision.hasContent: boolean`
- `decision.readiness: 'ready' | 'partial' | 'invalid'`
- `decision.missingInfo: readonly string[]`
- `decision.isDecided: boolean`
- `decision.factCount: number`

### 2.3 `memoryService.store(belief, decision, conversationId)`

Punto de entrada único para escribir snapshots. Comportamiento:

| Aspecto | Regla |
|---------|-------|
| **Input** | `Belief` + `Decision` (objetos del EE) + `conversationId` (string) |
| **Output** | `MemoryStoreResult` (success: true | false + opcional error) |
| **Precondición** | `COGNITIVE_MEMORY_ENABLED=true` AND `shadowResult.isComplete` |
| **Comportamiento** | Construye `MemorySnapshot` → persiste |
| **Fallo** | Nunca lanza. Retorna `{ success: false, error }`. Log interno. |

### 2.4 Invariantes verificadas en store()

| ID | Invariante | Verificación |
|----|-----------|-------------|
| **M-1** | Append-only | No existe UPDATE ni DELETE en la interfaz de storage |
| **M-4** | Full turn only | Se almacena solo si `isComplete === true` (guard externo) |
| **M-5** | Immutable | `MemorySnapshot` es `Object.freeze` desde construcción |
| **M-8** | Atomic snapshot | El snapshot contiene EXACTAMENTE un Belief + un Decision |
| **M-9** | No enrichment | No se agregan, derivan ni transforman campos |
| **M-12** | No defaults | Todos los campos provienen de Belief o Decision (metadata exceptuada) |

Las invariantes M-2 (read-only durante EE), M-3 (no feedback), M-6 (particionado), M-7 (monotonicidad), M-10 (proyección), M-11 (sin estado), M-13 (sin delta), M-14 (separación temporal) son verificables por diseño del código o por principios arquitectónicos.

### 2.5 Metadata generation

| Campo | Generación |
|-------|-----------|
| `memoryId` | `crypto.randomUUID()` |
| `turnNumber` | Leer último `turnNumber` para la misma `conversationId` + incrementar en 1. Para primer turno: `1`. |
| `storedAt` | `new Date()` al momento de llamar a `store()` |

### 2.6 Persistencia

Interfaz abstracta de storage con una sola operación:

```typescript
interface MemoryStorage {
  insert(snapshot: MemorySnapshot): Promise<{ success: boolean; error?: string }>;
  // Sin read, sin update, sin delete (M-1: append-only)
}
```

La implementación concreta (Turso/libSQL) forma parte de IM-1:
- Una nueva tabla para snapshots cognitivos
- Clave primaria compuesta: `(conversationId, turnNumber)`
- Sin índices secundarios (para IM-1)

### 2.7 Feature flag

| Flag | Tipo | Default | Ubicación |
|------|------|---------|-----------|
| `COGNITIVE_MEMORY_ENABLED` | `boolean` (env var) | `false` | `src/config/env.ts` + helper `isMemoryShadowModeEnabled()` |

La función `isMemoryShadowModeEnabled()` se exporta desde `src/lib/memory/index.ts`, siguiendo el mismo patrón que `isEvidenceShadowModeEnabled()`.

### 2.8 Integración en lead.service.ts

Cambio mínimo en el orquestador:

```
ANTES (línea 82-84):
  if (isEvidenceShadowModeEnabled()) {
    runShadowCognition({ text, phone, conversationId: conversation.id });  // ← descartado
  }

DESPUÉS:
  let shadowResult: ShadowResult | null = null;
  if (isEvidenceShadowModeEnabled()) {
    shadowResult = runShadowCognition({ text, phone, conversationId: conversation.id });
  }
  if (isMemoryShadowModeEnabled() && shadowResult?.isComplete) {
    memoryService.store(shadowResult.belief!, shadowResult.decision!, conversation.id);
  }
```

Restricciones de la integración:
- No modifica ningún archivo en `src/lib/evidence/`
- No modifica el comportamiento de `buildMemory()` operacional
- No bloquea el pipeline operacional (fire-and-forget)
- `memoryService.store()` nunca lanza

### 2.9 Tests

| Tipo | Cobertura mínima |
|------|-----------------|
| **Unitarios — MemorySnapshot** | Construcción válida, campos correctos, inmutabilidad, serialización |
| **Unitarios — buildSnapshot** | Belief+Decision → MemorySnapshot, metadata generada, invariantes |
| **Unitarios — turnNumber** | Primer turno = 1, turnos siguientes incrementales |
| **Unitarios — memoryService** | store exitoso, store con flag deshabilitado, store con error (no lanza) |
| **Unitarios — isMemoryShadowModeEnabled** | Default false, true si env var set |
| **Integración — lead.service.ts** | ShadowResult capturado, store llamado correctamente, flag deshabilitado = no operación |
| **Integración — storage** | INSERT exitoso, duplicado no ocurre (append-only), datos recuperables (SELECT) |

---

## 3. ¿Qué NO implementa IM-1?

### 3.1 Excluido por diseño arquitectónico

| Funcionalidad | Razón de exclusión | ¿Cuándo? |
|---------------|-------------------|:---------:|
| **Read API** (`getSnapshots()`, `query()`, `findByConversation()`) | Pattern Discovery es el único consumidor de Memory. PD no se implementa en esta fase. | Pre-PD |
| **Projection Contract** (19→11 campos analizables) | PD define qué campos necesita. Memory almacena 19; PD proyecta. No es responsabilidad de Memory. | Pre-PD |
| **Identity Contract** (equivalencia entre snapshots, reemplazo) | Pattern Discovery necesita identidad para deduplicación. Memory solo almacena. | Pre-PD |
| **Pattern Discovery** | Capa cognitiva separada, diseñada en PR-7. Depende de Memory. | Futuro PR |
| **Memory → PD contract formal** | PD no existe. El contrato se define cuando se implemente PD. | Pre-PD |

### 3.2 Excluido por principio de minimalidad

| Funcionalidad | Razón de exclusión |
|---------------|-------------------|
| **Consultas analíticas** (conteos, agregaciones, tendencias) | Memory preserva, no analiza. El análisis es responsabilidad de Pattern Discovery. |
| **Optimizaciones de storage** (compresión, particionado, archivado) | Fuera del alcance de la primera implementación. Postergado. |
| **Indexación avanzada** (índices secundarios, búsqueda全文, GIN, GiST) | Solo clave primaria `(conversationId, turnNumber)`. Índices adicionales si se necesitan en fase PD. |
| **Caché en memoria** de snapshots | Memory no tiene estado operacional (M-11). Cada store es independiente. |
| **Delta computation** entre snapshots consecutivos | M-13: es responsabilidad de Pattern Discovery, no de Memory. |
| **Batch operations** (store múltiple, flush) | Una llamada por turno. No hay batch. |
| **Migración de datos** desde SessionMemory | Son dominios diferentes. SessionMemory sigue operacional. |
| **Webhook o evento** post-store | Memory es fire-and-forget. Sin notificaciones. |
| **Dashboard o UI** para visualizar snapshots | Sin consumidor UI. Pattern Discovery leerá los datos. |
| **Exportación de datos** (CSV, JSON dump) | Sin caso de uso. |

### 3.3 Excluido por límite arquitectónico

| Funcionalidad | Razón de exclusión |
|---------------|-------------------|
| **Modificaciones a `src/lib/evidence/`** | Evidence Engine está frozen (ADR-009). No se modifica. |
| **Modificaciones a `src/lib/services/memory/memory.ts`** | Memory operacional (`buildMemory`, `SessionMemory`) es independiente. No se toca. |
| **Modificaciones al flujo operacional** (core, extraction, comprehension, policies, LLM) | Memory es Shadow Mode. No afecta el pipeline operacional. |
| **Nuevos ADR** | ADR-010 ya describe la arquitectura. IM-1 implementa ADR-010. No requiere nuevo ADR. |
| **Nuevas capas arquitectónicas** | Memory es la única capa que se implementa. Pattern Discovery, Identity, Projection son futuros. |

### 3.4 Excluido por decisión de gobernanza

| Funcionalidad | Razón de exclusión |
|---------------|-------------------|
| **Read Contract formal** | Aplazado deliberadamente en MCC-1/MCR-1. No esencial para IM-1. |
| **Projection Contract formal** | Aplazado deliberadamente. No esencial para IM-1. |
| **Identity Contract formal** | Aplazado deliberadamente. No esencial para IM-1. |
| **Resolver RR1** (`belief.conversationId` nullable) | Riesgo residual aceptado. No bloquea IM-1. |
| **Resolver RR2** (storage schema vs Read Contract futuro) | Clave primaria `(conversationId, turnNumber)` mitiga. No bloquea. |

---

## 4. Criterios de finalización

IM-1 se declara completado cuando **todos** los siguientes criterios se cumplen:

### 4.1 Código

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **C01** | `src/lib/memory/` existe con los 6 módulos definidos en §2.1 | `ls src/lib/memory/` |
| **C02** | `MemorySnapshot` es un Value Object inmutable (19 campos exactos según §2.2) | Test de estructura |
| **C03** | `buildSnapshot(belief, decision, conversationId)` produce un `MemorySnapshot` válido | Test unitario |
| **C04** | `memoryService.store()` existe y nunca lanza (retorna `MemoryStoreResult`) | Test unitario |
| **C05** | `memoryService.store()` respeta M-1 (append-only), M-5 (immutable), M-8 (atómico), M-9 (sin enriquecimiento), M-12 (sin defaults) | Test unitario |
| **C06** | `isMemoryShadowModeEnabled()` retorna `false` por defecto | Test unitario |
| **C07** | `isMemoryShadowModeEnabled()` retorna `true` si `COGNITIVE_MEMORY_ENABLED=true` | Test unitario |
| **C08** | `turnNumber` se computa correctamente: 1 para primer turno, incrementa para turnos siguientes | Test unitario |
| **C09** | `memoryId` es UUID v4 no vacío | Test unitario |
| **C10** | Integración en `lead.service.ts`: `shadowResult` capturado, `store()` llamado condicionalmente | Test de integración |
| **C11** | Integración en `lead.service.ts`: `COGNITIVE_MEMORY_ENABLED=false` = sin operación | Test de integración |
| **C12** | Tabla de persistencia creada con clave primaria `(conversationId, turnNumber)` | Migración verificable |
| **C13** | `memory-storage.ts` implementa la interfaz contra Turso/libSQL | Test de integración |
| **C14** | `src/lib/evidence/` no tiene ninguna modificación | `git diff src/lib/evidence/` vacío |
| **C15** | `src/lib/services/memory/memory.ts` (operacional) no tiene ninguna modificación | `git diff src/lib/services/memory/` vacío |

### 4.2 Calidad

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **Q01** | Build compila sin errores | `npm run build` exit code 0 |
| **Q02** | Tests de evidence existentes pasan (0 regresiones) | `npx vitest run tests/unit/evidence/` + `tests/integration/evidence-*` |
| **Q03** | Tests de memory nuevos pasan | `npx vitest run tests/unit/memory/` + `tests/integration/memory-*` |
| **Q04** | Contratos del proyecto se cumplen | `bash ael/contracts/enforce.sh` exit code 0 |
| **Q05** | 0 regresiones en el total de tests del proyecto | `npm test` contra baseline |

### 4.3 Documentación

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **D01** | ADR-010 actualizado con normalizaciones de ATR-1 | ADR-010 verificado |
| **D02** | `PROJECT_BOARD.md` actualizado con tareas IM-1 marcadas DONE | Archivo leído |
| **D03** | `CHANGELOG.md` con entrada de IM-1 | Archivo leído |
| **D04** | `ARCHITECTURE_STATUS.md` actualizado: Memory pasa de "⏳ Diseño" a "🟡 Implementado parcialmente" | Archivo leído |
| **D05** | `ROADMAP.md` actualizado si aplica | Archivo leído |

### 4.4 Gobernanza

| # | Criterio | Verificación |
|:-:|----------|-------------|
| **G01** | Las 6 normalizaciones de ATR-1 aplicadas antes de escribir código de Memory | A1-A3 + B1-B3 verificados en ADR-010, ADR-009, PR-7A, Milestone v3.0 |
| **G02** | Ningún archivo fuera de `src/lib/memory/` + `lead.service.ts` + `src/config/env.ts` fue modificado | `git diff --name-only` revisado |

---

## 5. Entregables

### 5.1 Código

| # | Entregable | Ruta estimada |
|:-:|-----------|:-------------:|
| E1 | Tipos de Memory | `src/lib/memory/types.ts` |
| E2 | MemorySnapshot Value Object | `src/lib/memory/memory-snapshot.ts` |
| E3 | Snapshot builder | `src/lib/memory/build-snapshot.ts` |
| E4 | Memory service (store) | `src/lib/memory/memory-service.ts` |
| E5 | Storage abstraction + implementación Turso | `src/lib/memory/memory-storage.ts` |
| E6 | Barrel export | `src/lib/memory/index.ts` |
| E7 | Feature flag helper en `src/lib/memory/` | Dentro de `index.ts` o archivo separado |
| E8 | Feature flag env var | `src/config/env.ts` (añadir `COGNITIVE_MEMORY_ENABLED`) |
| E9 | Integración en lead.service.ts | `src/lib/services/lead.service.ts` (capturar ShadowResult + llamar store) |
| E10 | Migración de base de datos (nueva tabla) | `src/lib/db/migrations/` o script seed |
| E11 | Tests unitarios de Memory | `tests/unit/memory/*.test.ts` |
| E12 | Tests de integración de Memory | `tests/integration/memory-*.test.ts` |

### 5.2 Documentación actualizada

| # | Entregable |
|:-:|-----------|
| D1 | ADR-010 — normalizaciones aplicadas |
| D2 | ADR-009 §7 — pipeline actualizado |
| D3 | ARCHITECTURE_STATUS.md — estado actualizado |
| D4 | PROJECT_BOARD.md — tareas IM-1 marcadas DONE |
| D5 | CHANGELOG.md — entrada de misión IM-1 |
| D6 | ROADMAP.md — si aplica actualización |

---

## 6. Árbol de decisión: ¿pertenece a IM-1?

Para determinar si una funcionalidad o tarea pertenece a IM-1, aplicar este árbol:

```
Paso 1: ¿Requiere modificar src/lib/evidence/?
  └─ Sí → ❌ NO pertenece a IM-1. EE está frozen (ADR-009).
  └─ No → Ir a paso 2.

Paso 2: ¿Requiere modificar src/lib/services/memory/memory.ts (operacional)?
  └─ Sí → ❌ NO pertenece a IM-1. Memory operacional es independiente.
  └─ No → Ir a paso 3.

Paso 3: ¿Es una consulta, lectura o recuperación de snapshots?
  └─ Sí → ❌ NO pertenece a IM-1. Read API es pre-PD.
  └─ No → Ir a paso 4.

Paso 4: ¿Es una transformación, análisis o inferencia sobre snapshots?
  └─ Sí → ❌ NO pertenece a IM-1. Análisis = Pattern Discovery.
  └─ No → Ir a paso 5.

Paso 5: ¿Persiste un snapshot cognitivo (Belief + Decision)?
  └─ Sí → ✅ PERTENECE a IM-1. Es la responsabilidad principal.
  └─ No → Ir a paso 6.

Paso 6: ¿Es soporte necesario para persistir (feature flag, metadata, validación, storage)?
  └─ Sí → ✅ PERTENECE a IM-1. Es infraestructura de store().
  └─ No → ❌ NO pertenece a IM-1. Fuera de alcance.
```

---

## 7. Reglas de contratación

### 7.1 Reglas de integridad

| Regla | Descripción | Consecuencia de violación |
|-------|-------------|--------------------------|
| **R-I1** | IM-1 no modifica `src/lib/evidence/` bajo ninguna circunstancia | ❌ Violación del freeze ADR-009. Rechazo automático en code review. |
| **R-I2** | IM-1 no modifica el comportamiento de `buildMemory()` operacional | ❌ Violación de separación de dominios. Rechazo automático. |
| **R-I3** | IM-1 no introduce nuevas capas arquitectónicas | ❌ Violación de ATR-1. Requiere nuevo ADR. |
| **R-I4** | IM-1 no implementa funcionalidad de Pattern Discovery | ❌ Violación de alcance. Requiere nuevo PR. |

### 7.2 Reglas de calidad

| Regla | Descripción |
|-------|-------------|
| **R-Q1** | `memoryService.store()` nunca lanza. Retorna `MemoryStoreResult`. |
| **R-Q2** | Toda construcción de `MemorySnapshot` pasa por el builder (`buildSnapshot`) — no se construyen snapshots manualmente. |
| **R-Q3** | El feature flag `COGNITIVE_MEMORY_ENABLED` es el único guard para escribir. Sin flag = sin operación. |
| **R-Q4** | La integración en `lead.service.ts` es el ÚNICO punto de entrada desde el orquestador. No se llama a `store()` desde otro lugar. |
| **R-Q5** | Los 19 campos del snapshot coinciden exactamente con los definidos en ADR-010 §PR-5B. Cualquier desviación requiere actualizar ADR-010 primero. |

---

## 8. Riesgos de alcance

### 8.1 Riesgos de expansión (scope creep)

| ID | Riesgo | Mitigación |
|----|--------|-----------|
| **SC1** | Tentación de agregar `getSnapshots()` "por si acaso" | El árbol de decisión (§6) lo excluye explícitamente. Read API es pre-PD. |
| **SC2** | Tentación de agregar índices secundarios para "rendimiento futuro" | Solo clave primaria `(conversationId, turnNumber)`. Índices adicionales cuando PD los requiera. |
| **SC3** | Tentación de "mejorar" el EE (ej: agregar más campos a Belief/Decision) | EE está frozen. Cero modificaciones. |
| **SC4** | Tentación de fusionar Memory operacional con cognitiva | Son dominios diferentes con ADR y responsabilidades distintas. Separación explícita. |

### 8.2 Riesgos de omisión

| ID | Riesgo | Mitigación |
|----|--------|-----------|
| **SO1** | Olvidar crear la tabla de base de datos | Criterio C12 + entregable E10 lo exigen explícitamente. |
| **SO2** | Olvidar el feature flag (store siempre activo) | Criterio C06/C07 + entregable E7/E8 lo exigen. |
| **SO3** | Olvidar capturar el ShadowResult (seguir descartado) | Criterio C10 + entregable E9 lo exigen. |
| **SO4** | No verificar que `isComplete` es true antes de store | Regla I1-MEM + C2 del ADR-010: guard obligatorio. |

---

*Fin de IM-0 — Memory Implementation Scope*
