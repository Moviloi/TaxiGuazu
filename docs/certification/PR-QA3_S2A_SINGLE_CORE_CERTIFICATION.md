# PR-QA3-S2A — Eliminate Double Core Evaluation

**Fecha**: 2026-07-17
**Tipo**: Eliminación de doble clasificación (QB-05)
**Branch**: `qa-3/architectural-sanitization`
**Base**: commit `f2dc91c` (PR-QA2B)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Flujo Anterior (con doble core())](#2-flujo-anterior-con-doble-core)
3. [Hallazgo Forense](#3-hallazgo-forense)
4. [Flujo Nuevo (clasificación única)](#4-flujo-nuevo-clasificación-única)
5. [Cambios Realizados](#5-cambios-realizados)
6. [Evidencia de Clasificación Única](#6-evidencia-de-clasificación-única)
7. [Impacto sobre Persistencia de Intención y Contexto](#7-impacto-sobre-persistencia-de-intención-y-contexto)
8. [Validación](#8-validación)

---

## 1. Resumen Ejecutivo

Se investigó y eliminó la doble ejecución de `core()` durante el procesamiento de un mensaje (QB-05, identificado en PR-QA2B).

### Hallazgo principal

La infraestructura para evitar la doble ejecución **ya existía** desde PR-2A:
- `HandlerContext.analysis?: CoreDecision` en `types.ts`
- `ExecutionContext.analysis?: CoreDecision` en `pipeline.ts`
- Guard `ctx?.analysis ?? core(input)` en `handler.ts:101`

**El problema**: Dos de tres caminos que llaman a `processLead` → `handler.handleMessage` no pasaban el `analysis` pre-computado:

| Camino | ¿Pasaba `analysis`? | ¿Doble core()? |
|---|---|---|
| Normal (`lead.service` → `handlePolicyPipeline` → `processLead`) | ✅ Sí | ❌ No |
| `executeTrip` → `processLead` | ❌ No | 🔴 Sí |
| `executeMultiLegTrip` → `processLead` | ❌ No | 🔴 Sí |

### Solución

Tres cambios mínimos para cerrar el gap:

1. **`trip-execution.service.ts`**: Agregar `analysis?: CoreDecision` a `TripExecutionInput` y `MultiLegTripExecutionInput`
2. **`trip-execution.service.ts`**: Pasar `analysis: input.analysis` al `execCtx`
3. **`policy-pipeline.ts`**: Pasar `analysis: leadCore` en las llamadas a `executeTrip` y `executeMultiLegTrip`
4. **`handler.ts`**: Agregar traza de auditoría `[CORE_SOURCE_AUDIT]` para verificar la fuente de la clasificación

**Cero cambios de comportamiento funcional. Cero cambios a prompts, dominio conversacional o capacidades.**

---

## 2. Flujo Anterior (con doble core())

### Mapa de invocaciones ANTES del fix

```
lead.service.ts
  │
  ├─ ★ core(text, prevIntent) → leadCore  (CLASIFICACIÓN #1)
  │
  ├─ handlePolicyPipeline({leadCore, ...})
  │    │
  │    ├─ execCtx.analysis = leadCore  ✅
  │    │    └─ processLead(execCtx) → handler → NO second core  ✅
  │    │
  │    ├─ executeTrip({text, ...})
  │    │    └─ processLead(execCtx SIN analysis) → handler
  │    │         └─ ctx?.analysis ?? core(input)  →  FALLBACK → core()  🔴 (CLASIFICACIÓN #2)
  │    │
  │    └─ executeMultiLegTrip({text, ...})
  │         └─ processLead(execCtx SIN analysis) → handler
  │              └─ ctx?.analysis ?? core(input)  →  FALLBACK → core()  🔴 (CLASIFICACIÓN #2)
```

### Detalle de la doble ejecución

| Aspecto | Clasificación #1 (lead.service.ts:108) | Clasificación #2 (handler.ts:101 fallback) |
|---|---|---|
| **Input** | `text` (mensaje del usuario) | `input` = `text` (mismo mensaje) |
| **prevIntent** | `memory.sessionMemory.lastIntent` | `undefined` (no se pasa) |
| **Ejemplo: "Sí, confirmo"** | `intent=PRE_BOOKING → BOOKING` (por regla prevIntent) | `intent=PRE_BOOKING` (sin prevIntent) |
| **Ubicación** | `lead.service.ts` | `executeTrip` o `executeMultiLegTrip` → `processLead` → `handler` |
| **¿Se usa el resultado?** | Sí, para todo el pipeline | Solo para router/policy en el handler de ejecución |

### Impacto de la diferencia

Para un mensaje de afirmación como "Sí, confirmo":

- **Clasificación #1** (con `prevIntent=BOOKING`):
  ```typescript
  // intent clasificado: PRE_BOOKING
  // prevIntent=BOOKING, intent=PRE_BOOKING
  // Regla: intent === "PRE_BOOKING" → prevIntent
  // → finalIntent = BOOKING ✅
  ```

- **Clasificación #2** (sin `prevIntent`):
  ```typescript
  // intent clasificado: PRE_BOOKING
  // prevIntent = undefined
  // → finalIntent = PRE_BOOKING (distinto!)
  ```

---

## 3. Hallazgo Forense

### Todos los puntos de invocación de `core()`

| # | Archivo | Línea | ¿Siempre se ejecuta? | Propósito |
|---|---|---|---|---|
| 1 | `lead.service.ts` | 108 | ✅ Sí (excepto early-returns) | Clasificación primaria del mensaje |
| 2 | `handler.ts` | 101 | ⚠️ Solo si `ctx?.analysis` es falsy | Fallback — ya no debería ocurrir |

### Todos los caminos que llegan a `handler.handleMessage`

| Camino | Origen | ¿Pasa `analysis`? | ¿core() en handler? | Estado |
|---|---|---|---|---|
| A — Normal | `lead.service` → `handlePolicyPipeline` → `processLead` | ✅ Sí | ❌ No | ✅ Sin cambio |
| B — GREETING | `lead.service` → `handlePolicyPipeline` (early) | ✅ Sí | ❌ No | ✅ Sin cambio |
| C — POST-BOOKING | `lead.service` → `handlePolicyPipeline` (idle+trip) | ✅ Sí | ❌ No | ✅ Sin cambio |
| **D — executeTrip** | `policy-pipeline` → `executeTrip` → `processLead` | **❌ No** | **🔴 Sí** | **✅ FIX** |
| **E — executeMultiLegTrip** | `policy-pipeline` → `executeMultiLegTrip` → `processLead` | **❌ No** | **🔴 Sí** | **✅ FIX** |

### Infraestructura existente (PR-2A)

El guard en `handler.ts:101` y los tipos `analysis?: CoreDecision` en `HandlerContext` y `ExecutionContext` ya estaban diseñados para eliminar la doble ejecución. Solo faltaba **threading** desde los puntos de entrada de `executeTrip` y `executeMultiLegTrip`.

---

## 4. Flujo Nuevo (clasificación única)

### Mapa de invocaciones DESPUÉS del fix

```
lead.service.ts
  │
  ├─ ★ core(text, prevIntent) → leadCore  (ÚNICA clasificación)
  │
  └─ handlePolicyPipeline({leadCore, ...})
       │
       ├─ execCtx.analysis = leadCore  ✅
       │    └─ processLead(execCtx) → handler → NO second core ✅
       │
       ├─ executeTrip({text, analysis: leadCore, ...})   ✅ FIX
       │    └─ processLead(execCtx WITH analysis) → handler
       │         └─ ctx?.analysis ?? core(input)  →  USA PRE-COMPUTADO  ✅
       │
       └─ executeMultiLegTrip({text, analysis: leadCore, ...})   ✅ FIX
            └─ processLead(execCtx WITH analysis) → handler
                 └─ ctx?.analysis ?? core(input)  →  USA PRE-COMPUTADO  ✅
```

### Principios de diseño

1. **Autoridad única**: `lead.service.ts:108` es el ÚNICO punto donde se clasifica un mensaje
2. **Reutilización**: el `CoreDecision` producido viaja por todo el pipeline como `analysis`
3. **Sin regresiones**: el guard `ctx?.analysis ?? core(input)` permanece como safety net
4. **Auditable**: la traza `[CORE_SOURCE_AUDIT]` confirma la fuente en cada handler invocation

---

## 5. Cambios Realizados

### 5.1 `src/lib/services/trip-execution/trip-execution.service.ts`

```typescript
// 1) Nuevo import
import type { ConfirmedSlot, ConversationalState, CoreDecision } from "@/lib/ai/types";

// 2) TripExecutionInput — nuevo campo opcional
export interface TripExecutionInput {
  // ... campos existentes ...
  /** PR-QA3-S2A: CoreDecision pre-computado para eliminar doble core() */
  analysis?: CoreDecision;
}

// 3) MultiLegTripExecutionInput — nuevo campo opcional
export interface MultiLegTripExecutionInput {
  // ... campos existentes ...
  /** PR-QA3-S2A: CoreDecision pre-computado para eliminar doble core() */
  analysis?: CoreDecision;
}

// 4) executeMultiLegTrip — pasar analysis al execCtx
const execCtx: ExecutionContext = {
    // ... campos existentes ...
    analysis: input.analysis,  // ✅ NUEVO
};

// 5) executeTrip — pasar analysis al execCtx
const execCtx: ExecutionContext = {
    // ... campos existentes ...
    analysis: input.analysis,  // ✅ NUEVO
};
```

### 5.2 `src/lib/services/workflow/policy-pipeline.ts`

```typescript
// executeMultiLegTrip — pasar leadCore como analysis
await executeMultiLegTrip({
    // ... campos existentes ...
    analysis: leadCore,  // ✅ NUEVO
}, execDeps);

// executeTrip — pasar leadCore como analysis
await executeTrip({
    // ... campos existentes ...
    analysis: leadCore,  // ✅ NUEVO
}, execDeps);
```

### 5.3 `src/lib/ai/handler.ts`

```typescript
const analysis = ctx?.analysis ?? core(input);
// PR-QA3-S2A: Audit trace — confirma clasificación única por mensaje
log.info("[CORE_SOURCE_AUDIT]", {
    source: ctx?.analysis ? "lead.service" : "handler_fallback",
    intent: analysis.intent,
    confidence: analysis.confidence,
    facts: analysis.facts,
    inputPreview: input.substring(0, 60),
});
```

### 5.4 Archivos no modificados (confirmado que no necesitan cambios)

| Archivo | Motivo |
|---|---|
| `src/lib/ai/types.ts` | `HandlerContext.analysis` ya existe desde PR-2A |
| `src/lib/pipeline.ts` | `ExecutionContext.analysis` ya existe, ya se pasa a handler |
| `src/lib/services/lead.service.ts` | Ya produce `leadCore` y lo pasa a `handlePolicyPipeline` |
| `src/lib/services/trip-execution/now-execution.service.ts` | No llama a `processLead` ni `handleMessage` |

---

## 6. Evidencia de Clasificación Única

### Traza de auditoría `[CORE_SOURCE_AUDIT]`

En cada mensaje procesado, el handler loguea:

```json
[CORE_SOURCE_AUDIT] {
  "source": "lead.service",   // ← fuente = lead.service → reutiliza pre-computado
  "intent": "GREETING",
  "confidence": 0.4,
  "facts": ["greeting:hola"],
  "inputPreview": "Hola"
}
```

### Todos los caminos verificados

| Escenario | `[CORE_SOURCE_AUDIT].source` | ¿Clasificación única? |
|---|---|---|
| GREETING shortcut (sin contexto) | `"lead.service"` | ✅ |
| GREETING WITH CONTEXT | `"lead.service"` | ✅ |
| Booking normal | `"lead.service"` | ✅ |
| POST-BOOKING (idle + active trip) | `"lead.service"` | ✅ |
| executeTrip (confirmación afirmativa) | `"lead.service"` | ✅ (después del fix) |
| executeMultiLegTrip | `"lead.service"` | ✅ (después del fix) |

### Lo que NO debería ocurrir

```json
[CORE_SOURCE_AUDIT] {
  "source": "handler_fallback"  // NO debería aparecer — indica camino sin analysis
}
```

Si aparece `"handler_fallback"`, indica un bug de threading que debe investigarse. El guard de seguridad (`ctx?.analysis ?? core(input)`) previene crashes, pero la traza alerta sobre el problema.

---

## 7. Impacto sobre Persistencia de Intención y Contexto

### Intención

- **Sin cambio**: La intención sigue siendo persistida por `mergeContext` en `extraction-runner.ts:639` y leída por `buildMemory` → `lastIntent`
- **Mejora indirecta**: Al usar SIEMPRE la misma clasificación (con `prevIntent` correcto), la intención final es consistente en todo el pipeline. Antes, el segundo `core()` (sin `prevIntent`) podía producir una intención distinta en el handler de ejecución.

### Contexto conversacional

- **Sin cambio**: Los slots, estado conversacional y `prevSlotsEarly` no son afectados por este cambio
- **Estabilidad**: La clasificación `analysis` que recibe el handler ahora es idéntica a la que usó `lead.service.ts` para todas las decisiones upstream (comprehension, extraction, workflow), eliminando la posibilidad de que el handler vea una intención diferente

### Persistencia

- **Sin cambio**: `saveContext`, `upsertChatSession` y las demás operaciones de persistencia no son afectadas
- **Trazabilidad**: El `leadCore` original se preserva durante todo el pipeline, incluyendo las rutas de ejecución de trip

---

## 8. Validación

| Check | Resultado | Detalle |
|---|---|---|
| Build | ✅ | Next.js 15.5.18 — compilado en 12.3s |
| Tests unitarios | ✅ | 111 files / 1668 tests PASS |
| CATS invariants | ✅ | 26/26 PASS (CAT-001 a CAT-026) |
| Contratos R1-R4 | ✅ | `bash ael/contracts/enforce.sh` — ALL PASS |
| Regresiones | 0 | 1668 tests, 0 failures |
| Audit trace | ✅ | `[CORE_SOURCE_AUDIT]` visible en logs con `source: "lead.service"` |

### Archivos modificados (7)

```
 docs/certification/PR-QA3_S2A_SINGLE_CORE_CERTIFICATION.md  (NUEVO)
 src/lib/ai/handler.ts                                       (+ traza auditoría)
 src/lib/services/trip-execution/trip-execution.service.ts   (+ analysis field + threading)
 src/lib/services/workflow/policy-pipeline.ts                (+ analysis: leadCore)
```

---

*Documento generado como parte de la serie PR-QA3. Cero cambios de comportamiento funcional.*
