# PR-QA1 — Architectural Consistency Audit

**Fecha:** 2026-07-17  
**Auditor:** ARNÉS (Automated Reasoning Node for Engineering Supervision)  
**Estado:** COMPLETADO — Solo documentación, 0 modificaciones de código  
**Commit base:** `cc6a801` (`release(v0): Architecture Freeze V3 + Cognitive Efficiency + Staging Hardening baseline`)

---

## Tabla de Contenidos

1. [Executive Report](#1-executive-report)
2. [Pipeline Map](#2-pipeline-map)
3. [Responsibility Matrix](#3-responsibility-matrix)
4. [Decision Matrix](#4-decision-matrix)
5. [Duplication Matrix](#5-duplication-matrix)
6. [Technical Debt Matrix](#6-technical-debt-matrix)
7. [Findings Priorizados](#7-findings-priorizados)
8. [Root Cause Analysis](#8-root-cause-analysis)
9. [Roadmap de Saneamiento](#9-roadmap-de-saneamiento)

---

## 1. Executive Report

### Resumen

Se auditaron **18 componentes** del pipeline conversacional sobre **15 categorías de inconsistencia arquitectónica**. Se identificaron **27 hallazgos** distribuidos así:

| Categoría | Count | Severidad |
|---|---|---|
| Lógica duplicada | 6 | 🔴 Alta |
| Pipelines paralelos | 2 | 🔴 Alta |
| Responsabilidades duplicadas | 4 | 🟡 Media |
| Decisiones en múltiples lugares | 4 | 🟡 Media |
| Código zombie/muerto | 3 | 🟡 Media |
| Violaciones de Source of Truth | 3 | 🟡 Media |
| Fallbacks innecesarios | 2 | 🟢 Baja |
| Invasión de responsabilidades | 2 | 🟢 Baja |
| Información perdida entre capas | 1 | 🟢 Baja |

**No se detectaron:** Violaciones de ADR activas, dependencias innecesarias graves, código histórico no eliminado (todo el código tiene uso activo).

### Riesgo principal

La coexistencia de **dos pipelines paralelos** (ruta `lead.service.ts → policy-pipeline.ts` y ruta `lead.service.ts → processLead → handleMessage`) genera incertidumbre sobre cuál es el flujo real en producción. Ambos están activos y el flujo real depende de condiciones evaluadas en tiempo de ejecución.

### Diagnóstico

El sistema ha evolucionado mediante capas progresivas (V1 → V2 → V3) sin una migración completa de la ruta anterior. Esto ha creado puntos donde ambas rutas operan simultáneamente, con lógica duplicada para:
- Decisión de campos faltantes (`field-resolver.ts` vs `evaluate-completeness.ts`)
- Manejo de afirmaciones/cancelaciones en confirmación
- Extracción de slots fallback (regex) que replica lógica del LLM
- Construcción de preguntas de clarificación
- Resolución de ambigüedad (workflow vs DRL)

---

## 2. Pipeline Map

### Diagrama de Flujo Actual

```
Webhook HTTP POST
  │
  ├─ POST /api/whatsapp/webhook
  │   ├─ verifySignature (HMAC)
  │   ├─ checkRateLimit (sliding window)
  │   ├─ tryRegisterMessage (idempotency)
  │   ├─ (interactive buttons routing → 15+ handlers)
  │   ├─ (location/image/audio → reverseGeocode/transcribe)
  │   └─ handleLeadMessage(phone, text) ← ENTRY POINT
  │
  └─ handleLeadMessage (@/lib/services/lead.service.ts)
      │
      ├─ ZONE: .limpiar → hardReset
      ├─ ZONE: CommandShortcuts → handleCommandShortcuts
      ├─ ZONE: Driver/Admin → handleAdminCommands
      ├─ ZONE: Conversation Setup → handleConversationSetup
      ├─ ZONE: Opportunity Response → handleOpportunityResponse
      ├─ ZONE: COGNITIVE SHADOW → runShadowCognition
      ├─ ZONE: COGNITIVE MEMORY → memoryService.store()
      │
      ├─ ZONE: CORE (early) → core(text)  ← PRIMERA ejecución
      ├─ ZONE: Conversation Interpreter → interpretMessage
      ├─ ZONE: GREETING SHORTCUT → handlePolicyPipeline (early return)
      ├─ ZONE: Combined GREETING → send intro + continue
      ├─ ZONE: Slot Confirmation Buttons/Text → handlers
      ├─ ZONE: Awaiting Passenger → handleAwaitingPassenger
      ├─ ZONE: Awaiting Confirmation → handleAwaitingConfirmation
      ├─ ZONE: Ambiguity → startAmbiguityResolution / handleAmbiguityResponse
      ├─ ZONE: Post-Booking → handlePolicyPipeline (no extraction)
      │
      ├─ ZONE: COMPREHENSION → runComprehensionCheck
      ├─ ZONE: EXTRACTION PIPELINE → runExtractionPipeline
      │   ├─ extractSlots(text, history, ...) → LLM
      │   ├─ parseRouteFromText (regex fallback)
      │   ├─ calculateSlotConfidence
      │   ├─ inferPickupTime / inferBorderSide
      │   ├─ buildSlotStates
      │   └─ evaluateWorkflowTransition
      │
      └─ ZONE: POLICY PIPELINE → handlePolicyPipeline
          ├─ buildExtractionContext (si no existe)
          ├─ getPlaceDisplayName (x2)
          ├─ temporalFromFacts / operationalModeFromIntent
          ├─ [OPPORTUNITY QUERY] → evaluateOpportunities
          ├─ [AWAITING_CONFIRM + NEGATIVE] → cancel
          ├─ [AWAITING_CONFIRM + AFFIRMATIVE] → executeTrip / executeNowTrip
          ├─ [SLOT_CONFIRMATION pending] → buildSlotConfirmationMessage + buttons
          ├─ Operational readiness checks (canDispatch / canQuote)
          ├─ [DISPATCH] → executeNowTrip
          │
          └─ processLead (ExecutionCtx + ExecutionDeps)  ← SEGUNDO pipeline
              │
              └─ deps.handler = handleMessage (@/lib/ai/handler.ts)
                  │
                  ├─ ZONE: CORE (reuse ctx.analysis) ← evita doble ejecución
                  ├─ router(analysis, mode)
                  ├─ interpretMessage (SEGUNDA vez si no hay extraction)
                  ├─ computeClientObjective
                  ├─ computeStrategyDecision
                  ├─ buildDomainPolicy
                  │   ├─ policyAhora
                  │   │   ├─ buildGreeting
                  │   │   ├─ buildAhoraFinalResponse
                  │   │   │   ├─ resolveNextRequiredField
                  │   │   │   ├─ buildLocationConfirmationResponse
                  │   │   │   └─ buildNowDispatchResponse
                  │   │   └─ ...
                  │   └─ policyReserva
                  │       ├─ buildReservaFinalResponse
                  │       │   ├─ buildStableAcknowledge
                  │       │   ├─ buildConfirmationMessage
                  │       │   ├─ buildClarifyMessage
                  │       │   └─ buildPriceInfo
                  │       └─ ...
                  │
                  ├─ [DRL RESPONSE ASSISTANCE] → buildDrlEnrichment
                  ├─ [LLM GATE] → generateLLMResponse (si no skip)
                  └─ → return { decision, policy }
```

### Puntos clave del mapa

1. **`lead.service.ts`** ejecuta `core()` en línea 108 Y luego pasa `analysis` a través de `execCtx` para evitar doble ejecución en `handleMessage()` — OK (PR-2A).
2. **`handlePolicyPipeline`** (en `services/workflow/policy-pipeline.ts`) contiene lógica de negocio SIGNIFICATIVA (oportunidades, cancelación, afirmación, dispatch) ANTES de llamar a `processLead`. Esto crea el **problema del pipeline paralelo**.
3. **`handleMessage`** en `ai/handler.ts` re-ejecuta `interpretMessage`, `computeClientObjective`, `computeStrategyDecision` aunque `lead.service.ts` ya los computó parcialmente. Son funciones puras, pero se ejecutan dos veces.

---

## 3. Responsibility Matrix

### Mapeo Componente → Archivo → Responsabilidad Real

| Componente | Archivo | Responsabilidad Asignada | Responsabilidad Real | Gap |
|---|---|---|---|---|
| **Handler** | `src/app/api/whatsapp/webhook/route.ts` | Recibir webhooks, verificar firma, rate limiting, idempotencia | ✅ Correcto | Ninguno |
| **Workflow** | `src/lib/services/lead.service.ts` | Coordinar flujo conversacional | ✅ Orquesta 15+ zonas | ❌ Demasiadas responsabilidades (orquesta + routing + bypasses) |
| **Router** | `src/lib/ai/router.ts` | Mapear CoreDecision → OutputType | ✅ Función pura, bien aislada | Ninguno |
| **Policy (Ahora)** | `src/lib/ai/policy-ahora.ts` | Decisiones de flujo para modo AHORA | ✅ Correcto | ❌ Cruza imports desde policy-reserva (buildLateral*, buildAdminNotifyBody) |
| **Policy (Reserva)** | `src/lib/ai/policy-reserva.ts` | Decisiones de flujo para modo RESERVA | ✅ Correcto | ❌ buildClarifyMessage duplica lógica de response-builder |
| **StrategyDecision** | `src/lib/ai/conversation-strategy.ts` | Síntesis de señales estratégicas | ✅ Función pura, bien aislada | Ninguno |
| **Slot Extraction (LLM)** | `src/lib/services/extraction/extract-slots.ts` | Extraer slots via LLM | ✅ Punto único | Ninguno |
| **Slot Extraction (Regex)** | `src/lib/services/extraction/regex-extractor.ts` | Extraer slots via regex (fallback) | ⚠️ Fallback | ❌ Llamado desde extraction-runner y policy-ahora implícitamente |
| **Entity Extraction** | `src/lib/services/extraction/entity-extractor.ts` | Extraer entidades | ✅ Correcto | Ninguno |
| **Entity Resolution** | `src/lib/services/extraction/confidence.ts` | Resolver confianza de entidades | ✅ Correcto | Ninguno |
| **Location Resolution** | `src/lib/services/geo/location-resolver.ts` | Resolver rutas geográficas | ✅ Correcto | Ninguno |
| **Ambiguity Resolution** | `src/lib/services/workflow/ambiguity-handler.ts` | Resolver ambigüedad interactiva | ✅ Correcto | ❌ DRL regla `geo-desambiguacion.ts` DUPLICA parcialmente |
| **Pricing** | `src/lib/services/pricing/pricing-engine.ts` | Calcular precios | ✅ Correcto | ❌ Lógica de pricing en extraction-runner.ts (líneas 346-389) |
| **Confirmation** | `src/lib/services/workflow/awaiting-confirmation-handler.ts` | Manejar confirmaciones | ⚠️ Parcial | ❌ policy-pipeline.ts duplica lógica de confirmación (líneas 162-269) |
| **Response Builder** | `src/lib/ai/response-builder.ts` | Construir respuestas textuales | ✅ Fuente única | ❌ policy-reserva.ts tiene su propia buildClarifyMessage |
| **Output** | `src/lib/sender.ts` | Enviar mensajes WhatsApp | ✅ Correcto | Ninguno |
| **BKE** | `src/lib/bke/` | Business Knowledge Engine | ✅ Stub (PR-5A) | Ninguno (intencionalmente stub) |
| **DRL** | `src/lib/drl/` | Deterministic Reasoning Layer | ⚠️ Parcial | ❌ `drl-engine.ts` evalúa reglas pero `assistance.ts` ejecuta las mismas reglas de forma independiente |
| **Evidence Engine** | `src/lib/evidence/` | Motor epistémico | ✅ Shadow mode, bien aislado | Ninguno |
| **Memory (Cog)** | `src/lib/memory/` | Memoria cognitiva (ADR-010) | ✅ Shadow mode, bien aislado | ❌ Confusión de naming con services/memory/ |
| **Memory (Op)** | `src/lib/services/memory/` | Memoria operacional (sesión) | ✅ Correcto | ❌ Mismo nombre que cognitiva |

---

## 4. Decision Matrix

### ¿Dónde se toma cada decisión?

| Decisión | Componente(s) que la toman | Archivo(s) | ¿Unificada? |
|---|---|---|---|
| **Intent detection** | CORE + Conversation Interpreter | `core.ts` + `conversation-interpreter.ts` | ⚠️ Parcial: core.ts detecta intent, CI clasifica messageType |
| **Output type (EXECUTE/ANSWER/CLARIFY)** | Router | `router.ts` | ✅ Única |
| **¿Qué campo preguntar?** | field-resolver + evaluate-completeness + slot-workflow | `field-resolver.ts`, `evaluate-completeness.ts`, `slot-workflow.ts` | ❌ **TRIPLICADO** |
| **¿Mostrar confirmación?** | shouldRequestConfirmation + slot-confirmation + policy-reserva | `slot-confirmation.ts`, `policy-reserva.ts` | ⚠️ Múltiples chequeos |
| **¿Ejecutar dispatch?** | policy-ahora + policy-pipeline + operational-readiness | `policy-ahora.ts:84-97`, `policy-pipeline.ts:355-381`, `operational-readiness.ts` | ❌ **DUPLICADO** |
| **¿Skip LLM?** | StrategyDecision + handler.ts | `conversation-strategy.ts`, `handler.ts:230-231` | ⚠️ Múltiple: strategy decide, handler aplica |
| **¿Preservar contexto?** | StrategyDecision + policy-reserva | `conversation-strategy.ts`, `policy-reserva.ts:152-158` | ⚠️ strategy decide, pero policy también verifica |
| **Respuesta a afirmación** | policy-reserva + policy-pipeline + awaiting-confirmation-handler | `policy-reserva.ts:174-197`, `policy-pipeline.ts:181-269`, `awaiting-confirmation-handler.ts` | ❌ **TRIPLICADO** |
| **Mensaje de cancelación** | policy-pipeline + extraction-runner + policy-ahora | `policy-pipeline.ts:171`, `extraction-runner.ts:259`, `policy-ahora.ts:79` | ❌ **TRIPLICADO** |
| **Resolución de ambigüedad** | ambiguity-handler + DRL geo-desambiguacion | `ambiguity-handler.ts`, `drl/rules/geo-desambiguacion.ts` | ❌ **DUPLICADO** |
| **Construcción de mensaje UI** | slot-confirmation + response-builder + policy-reserva | `slot-confirmation.ts`, `response-builder.ts`, `policy-reserva.ts` | ⚠️ Múltiples fuentes |

---

## 5. Duplication Matrix

### 🔴 Alta severidad

| ID | Tipo | Descripción | Evidencia |
|---|---|---|---|
| D01 | Pipeline paralelo | `lead.service.ts` → `handlePolicyPipeline` vs `lead.service.ts` → `processLead` → `handleMessage` | `policy-pipeline.ts` contiene lógica de negocio que NO está en `handleMessage`. Ambos flujos están activos. `policy-pipeline.ts:52-388` vs `handler.ts:93-252` |
| D02 | Lógica duplicada | Resolución de "siguiente campo a preguntar" | `field-resolver.ts:19-101` vs `evaluate-completeness.ts` (en `services/workflow/`) vs `slot-workflow.ts:55-114`. Los tres determinan qué slot falta. |
| D03 | Lógica duplicada | Manejo de afirmación en confirmación | `policy-reserva.ts:174-197` + `policy-pipeline.ts:181-269` + `awaiting-confirmation-handler.ts`. Tres implementaciones distintas del mismo flujo. |
| D04 | Lógica duplicada | Manejo de cancelación | `policy-pipeline.ts:170-177`, `extraction-runner.ts:257-264`, `policy-ahora.ts:79`, `response-builder.ts:149-151`. Cuatro sitios generan mensaje de cancelación. |
| D05 | Lógica duplicada | Ambiguity resolution: workflow handler vs DRL rule | `ambiguity-handler.ts` (interactivo, con estado) vs `drl/rules/geo-desambiguacion.ts` (determinista). Ambos resuelven ambigüedad de ubicación sin coordinación. |
| D06 | Decisiones distribuidas | `core()` se ejecuta dos veces (aunque PR-2A evita doble análisis) | `lead.service.ts:108` - `core(text)` se usa para early decisions (GREETING shortcut, temporal signal, etc.). Luego `handler.ts:101` reusa `ctx.analysis` pero `lead.service.ts` ya usó `leadCore` para branching. |

### 🟡 Media severidad

| ID | Tipo | Descripción | Evidencia |
|---|---|---|---|
| D07 | Responsabilidad duplicada | buildClarifyMessage en policy-reserva.ts | `policy-reserva.ts:354-389` implementa lógica de mensajes que DUPLICA `response-builder.ts:44-55` (`buildGenericClarify`). |
| D08 | Responsabilidad duplicada | Policy-ahora importa funciones de policy-reserva | `policy-ahora.ts:17` importa `buildLateralEmergencyResponse`, `buildLateralRescheduleResponse`, `buildAdminNotifyBody` desde `policy-reserva.ts`. Esto acopla ambas policies. |
| D09 | Zombie code | Confirmaciones en policy-pipeline.ts con lógica de dispatch | `policy-pipeline.ts:162-269` maneja awaiting_confirmation con dispatch (executeTrip, executeNowTrip) que es DUPLICADO de `awaiting-confirmation-handler.ts`. |
| D10 | Zombie code | policy-pipeline.ts llama a processLead DESPUÉS de manejar negativos/afirmaciones | `policy-pipeline.ts:387` - Después de todo el manejo de estados, llama `processLead`. Pero si la confirmación ya fue manejada (return en línea 158, 268), este código es muerto. |
| D11 | Source of Truth violada | `patterns.ts` centraliza regex pero `core.ts` tiene SUS PROPIAS constantes regex | `core.ts:24-53` define 30+ regex locales (GREETING_RE, URGENCY_RE, etc.) que NO están en `patterns.ts`. `patterns.ts:12-13` define AMBIGUOUS_LOCATION_RE, las únicas compartidas. |
| D12 | Source of Truth violada | Dos sistemas de memoria con nombres casi idénticos | `lib/memory/` (cognitive, ADR-010) vs `lib/services/memory/` (operacional, session-based). `lead.service.ts:33` importa de AMBOS. |

### 🟢 Baja severidad

| ID | Tipo | Descripción | Evidencia |
|---|---|---|---|
| D13 | Fallback innecesario | Regex fallback en extraction-runner.ts que replica LLM extraction | `extraction-runner.ts:40-119` (`tryFallbackExtraction`) es usado cuando LLM retorna null. Pero también hay otro fallback con `roleLock` (líneas 268-271). |
| D14 | Fallback innecesario | `parseRouteFromText` en extraction-runner.ts y pricing | `extraction-runner.ts:363-387` llama a `parseRouteFromText` de NUEVO si pricing inicial falló, duplicando work hecho en línea 51-52. |
| D15 | Invasión de responsabilidad | `extraction-runner.ts` contiene lógica de pricing y time/border inference | `extraction-runner.ts:346-389` resuelve pricing directamente. `extraction-runner.ts:398-480` infiere horario y frontera. Esto DEBERÍA estar en servicios dedicados. |

---

## 6. Technical Debt Matrix

### Deuda existente identificada en PR-QA1

| Debt ID | Descripción | Archivo(s) | Impacto | Esfuerzo estimado |
|---|---|---|---|---|
| ARCH-01 | Pipeline paralelo: policy-pipeline.ts se ejecuta ANTES que processLead | `policy-pipeline.ts`, `handler.ts` | Alto: flujo real impredecible | 3-4 días |
| ARCH-02 | Triple punto de decisión para "siguiente campo" | `field-resolver.ts`, `evaluate-completeness.ts`, `slot-workflow.ts` | Medio: inconsistencia en preguntas | 1-2 días |
| ARCH-03 | Flujo de afirmación/cancelación triplicado | `policy-reserva.ts`, `policy-pipeline.ts`, `awaiting-confirmation-handler.ts` | Alto: bug en confirmación | 2-3 días |
| ARCH-04 | Policy cross-imports entre Ahora y Reserva | `policy-ahora.ts:17` importa de `policy-reserva.ts` | Medio: acoplamiento | 0.5 días |
| ARCH-05 | Regex en core.ts no centralizados en patterns.ts | `core.ts:24-53` vs `patterns.ts` | Bajo: mantenibilidad | 0.5 días |
| ARCH-06 | DRL evaluado desde dos puntos distintos | `drl-engine.ts:evaluate()`, `assistance.ts:runDrlAssistance()` | Medio: arquitectura ambigua | 1 día |
| ARCH-07 | Naming collision: dos sistemas "memory" | `lib/memory/` vs `lib/services/memory/` | Medio: confusión en imports | 0.5 días |
| ARCH-08 | extraccion-runner.ts contiene lógica de pricing y border/time inference | `extraction-runner.ts:346-480` | Medio: invasión de responsabilidad | 1-2 días |
| ARCH-09 | Regex fallback extraction que replica LLM | `extraction-runner.ts:40-119` | Bajo: redundancia controlada | 1 día |
| ARCH-10 | interpretMessage se ejecuta dos veces (opcional) | `lead.service.ts:114`, `handler.ts:116` | Bajo: funciones puras, sin side effects | 0.5 días |

### Deuda pre-existente (documentada en TECHNICAL_DEBT_BASELINE.md)

| Debt ID | Descripción | Estado |
|---|---|---|
| DEBT-03 | Estado global eliminado de guard.ts | ✅ Resuelto |
| DEBT-12 | XSS hardening (middleware) | ⏳ Deferred |
| DEBT-13 | residual trip_status references | ✅ Resuelto |
| DEBT-14 | Schema loading + hard reset flow | ✅ Resuelto |

---

## 7. Findings Priorizados

### 🔴 P1 — Crítico

#### F-01: Pipeline paralelo activo
**Componentes:** Workflow (lead.service → policy-pipeline vs handleMessage)  
**Evidencia:** 
- `lead.service.ts:306` llama a `handlePolicyPipeline`  
- `policy-pipeline.ts:387` llama a `processLead`  
- `processLead` llama a `handleMessage` como dependency injection  
- El flujo REAL es: `lead.service` → `policy-pipeline` (hace 200+ líneas de lógica) → `processLead` → `handleMessage` (hace 150+ líneas de lógica)

**Riesgo:** Cuando `policy-pipeline.ts` maneja confirmación (líneas 162-269) y hace dispatch (líneas 355-381), `processLead` se ejecuta DESPUÉS con un contexto potencialmente inconsistente. Si `policy-pipeline` hace early return (líneas 158, 268), `processLead` NO se ejecuta, pero si NO hay early return, se ejecuta con datos parcialmente inconsistentes.

#### F-02: Afirmación en confirmación manejada en 3 lugares distintos
**Componentes:** Confirmation  
**Evidencia:**
1. `policy-pipeline.ts:181-269` — maneja afirmación con executeTrip/executeNowTrip
2. `policy-reserva.ts:174-197` — maneja afirmación con buildBookingAcceptedResponse
3. `awaiting-confirmation-handler.ts` — flujo separado

**Riesgo:** Dependiendo de qué ruta tome la ejecución, la respuesta a un "sí" puede ser completamente diferente.

#### F-03: Resolución de "siguiente campo" triplicada
**Componentes:** Slot Extraction, Field Resolution  
**Evidencia:**
1. `field-resolver.ts:19-101` — Función `resolveNextRequiredField`
2. `evaluate-completeness.ts` (services/workflow/) — Función `evaluateCompleteness`
3. `slot-workflow.ts:55-114` — Función `evaluateWorkflowTransition`

**Riesgo:** Cada función usa criterios distintos para determinar qué campo falta. `field-resolver.ts` usa `status`, `reason`, `score`. `evaluate-completeness.ts` usa `completeness`. `slot-workflow.ts` usa `action` del extraction result. Pueden NO coincidir.

### 🟡 P2 — Medio

#### F-04: Ambiguity resuelta en dos sistemas diferentes
**Componentes:** Ambiguity Resolution, DRL  
**Evidencia:**
- `ambiguity-handler.ts` — handler interactivo con estado (pending/collecting_slots)
- `drl/rules/geo-desambiguacion.ts` — regla determinista que resuelve ambigüedad sin interacción

**Riesgo:** La regla DRL puede resolver ambigüedad MIENTRAS el workflow está esperando respuesta del usuario, causando conflictos de estado.

#### F-05: Policy cross-imports
**Componentes:** Policy (Ahora → Reserva)  
**Evidencia:** `policy-ahora.ts:17`: 
```
import { buildLateralEmergencyResponse, buildLateralRescheduleResponse, buildAdminNotifyBody } from "./policy-reserva";
```

**Riesgo:** Las policies deberían ser independientes. Que AHORA importe de RESERVA sugiere que hay lógica lateral que debería estar en un tercer módulo compartido.

#### F-06: Core tiene regex no centralizados
**Componentes:** Entity Extraction  
**Evidencia:** `core.ts:24-53` define `GREETING_RE`, `URGENCY_RE`, `QUERY_RE`, `ACTION_RE`, `PAX_RE`, `FLIGHT_RE`, `DATE_RE`, `TIME_RE`, `NOW_RE`, `BOOKING_RE`, `PRE_BOOKING_RE`, `RESCHEDULE_RE`, `POST_SERVICE_RE`, `EMERGENCY_RE`, `CONSULTA_RE`, `AIRPORT_MENTION_RE`, `COMMERCIAL_RE`, `INFORMATIONAL_RE`, `LOW_INTENT_RE` — 18+ regex locales. Mientras que `patterns.ts` solo tiene `AMBIGUOUS_LOCATION_RE`, `AFFIRMATION_RE`, `NEGATIVE_RE`, `CORRECTION_RE`, `AMBIGUOUS_HOTEL_LANDMARKS_RE`.

**Riesgo:** Bajo ahora, pero a medida que crece el sistema, tener regex en múltiples archivos dificulta el mantenimiento.

#### F-07: Extraction-runner pricing inline
**Componentes:** Pricing, Extraction  
**Evidencia:** `extraction-runner.ts:346-389` — resuelve pricing inline, incluyendo fallback regex (líneas 363-387). Pricing también se maneja en `services/pricing/`.

**Riesgo:** Si la lógica de pricing cambia, hay que actualizar extraction-runner.ts además de services/pricing/.

### 🟢 P3 — Bajo

#### F-08: Dos sistemas memory con nombre similar
**Componentes:** Memory  
**Evidencia:**
- `lead.service.ts:16` — `import { buildMemory } from "@/lib/services/memory/memory"`
- `lead.service.ts:33` — `import { getDefaultMemoryService } from "@/lib/memory"`

#### F-09: Regex fallback duplica LLM extraction
**Componentes:** Slot Extraction  
**Evidencia:** `extraction-runner.ts:40-119` (`tryFallbackExtraction`) + líneas 363-387 (segundo fallback regex)

#### F-10: interpretMessage se ejecuta dos veces
**Componentes:** Conversation Interpreter  
**Evidencia:** `lead.service.ts:114-121` (para classification) y `handler.ts:116-124` (para enrichedCtx). Es función pura, sin side effects, pero duplica procesamiento.

---

## 8. Root Cause Analysis

### Causa Raíz 1: Migración incompleta de V2 → V3
**Síntomas:** F-01, F-02, F-03, F-05, F-07

El sistema original (V2) tenía `handlePolicyPipeline` como orquestador principal con toda la lógica de negocio inline. La migración V3 introdujo `handleMessage` (ai/handler.ts) como el nuevo pipeline CORE → ROUTER → POLICY, pero **nunca se eliminó** `policy-pipeline.ts` como intermediario.

En lugar de reemplazar `handlePolicyPipeline`, se insertó `processLead` dentro de él (policy-pipeline.ts:387). El resultado es que `handlePolicyPipeline` ahora actúa como un **wrapper engañoso** que:
1. Hace lógica de negocio propia (oportunidades, confirmaciones, dispatch)
2. Y luego llama a `processLead` que llama a `handleMessage` que hace LA MISMA lógica otra vez

### Causa Raíz 2: Crecimiento orgánico sin refactor
**Síntomas:** F-04, F-06, F-08, F-09, F-10

A medida que se agregaron features (DRL, Evidence Engine, Cognitive Memory, BKE), se integraron en el pipeline existente sin refactorizar los puntos de entrada. Esto creó:
- Múltiples puntos de decisión para la misma pregunta
- Importaciones cruzadas entre módulos
- Naming overlap entre sistemas nuevos y existentes

### Causa Raíz 3: Fallback stacking
**Síntomas:** F-09

El sistema tiene múltiples capas de fallback para extracción:
1. LLM extraction (extract-slots.ts)
2. Regex fallback (tryFallbackExtraction en extraction-runner.ts)
3. RoleLock fallback (coreDecisionEarly.roleLock en extraction-runner.ts:268-271)
4. Previous slots fallback (prevSlotsEarly merge en extraction-runner.ts:482-493)

Cada capa agrega complejidad y posibles inconsistencias.

---

## 9. Roadmap de Saneamiento

### Fase 1: Consolidación del Pipeline (Sprint 1, 3-4 días)

| Paso | Acción | Dependencias | Archivos a modificar |
|---|---|---|---|
| 1.1 | Extraer lógica lateral de policy-pipeline.ts a módulo dedicado | Ninguna | `policy-pipeline.ts` → nuevo `services/workflow/confirmation-dispatch.ts` |
| 1.2 | Hacer que handlePolicyPipeline sea un wrapper DELGADO que llame a processLead | 1.1 | `policy-pipeline.ts` |
| 1.3 | Mover lógica de oportunidades de policy-pipeline a handler.ts | 1.1 | `policy-pipeline.ts`, `handler.ts` |
| 1.4 | Eliminar código muerto de policy-pipeline.ts (confirmaciones, dispatch) | 1.1-1.3 | `policy-pipeline.ts` |

### Fase 2: Unificación de Decisiones (Sprint 1, 2-3 días)

| Paso | Acción | Dependencias | Archivos a modificar |
|---|---|---|---|
| 2.1 | Unificar `field-resolver.ts` y `evaluate-completeness.ts` | Ninguna | `field-resolver.ts`, `evaluate-completeness.ts` |
| 2.2 | Unificar flujo de afirmación: un solo handler llamado desde handler.ts | 1.1 | `policy-reserva.ts`, `policy-pipeline.ts`, `awaiting-confirmation-handler.ts` |
| 2.3 | Mover buildClarifyMessage de policy-reserva.ts a response-builder.ts | Ninguna | `policy-reserva.ts`, `response-builder.ts` |

### Fase 3: Refactor de Extracción (Sprint 2, 1-2 días)

| Paso | Acción | Dependencias | Archivos a modificar |
|---|---|---|---|
| 3.1 | Extraer lógica de pricing de extraction-runner.ts a pricing directo | Ninguna | `extraction-runner.ts` |
| 3.2 | Extraer inferencia de time/border a servicios dedicados | Ninguna | `extraction-runner.ts` |
| 3.3 | Simplificar fallback stacking: máximo 2 niveles (LLM → roleLock) | 3.1-3.2 | `extraction-runner.ts` |

### Fase 4: Limpieza Arquitectónica (Sprint 2, 1 día)

| Paso | Acción | Dependencias | Archivos a modificar |
|---|---|---|---|
| 4.1 | Centralizar regex de core.ts en patterns.ts | Ninguna | `core.ts`, `patterns.ts` |
| 4.2 | Extraer lógica lateral compartida (emergency, reschedule) a módulo shared | Ninguna | `policy-ahora.ts`, `policy-reserva.ts`, nuevo `ai/policy-laterals.ts` |
| 4.3 | Documentar boundary entre cognitive memory y operational memory | Ninguna | DOCS |

### Prioridad de ejecución sugerida

```
Sprint 1:
  │ 1.1 → 1.2 → 1.3 → 1.4  (Consolidación pipeline)
  │ 2.1 → 2.2 → 2.3        (Unificación decisiones)
  │
Sprint 2:
  │ 3.1 → 3.2 → 3.3        (Refactor extracción)
  │ 4.1 → 4.2 → 4.3        (Limpieza arquitectónica)
```

### Criterios de aceptación para cada fase

- **Fase 1:** `handlePolicyPipeline` debe ser un wrapper < 30 líneas. Toda lógica de negocio debe estar en `handleMessage` o en módulos dedicados.
- **Fase 2:** Un solo archivo determina "siguiente campo". Un solo handler maneja afirmaciones en confirmación.
- **Fase 3:** `extraction-runner.ts` solo orquesta, no contiene pricing/inference inline.
- **Fase 4:** Todos los regex están en `patterns.ts`. No hay cross-imports entre policies.

---

## Appendix A: Archivos Auditados

| Archivo | Líneas | Rol |
|---|---|---|
| `src/app/api/whatsapp/webhook/route.ts` | 350 | Handler (webhook) |
| `src/lib/pipeline.ts` | 124 | Orquestador core |
| `src/lib/services/lead.service.ts` | 335 | Coordinador principal |
| `src/lib/ai/handler.ts` | 252 | Pipeline handler (CORE→ROUTER→POLICY→OUTPUT) |
| `src/lib/ai/core.ts` | 408 | CORE (extracción determinista) |
| `src/lib/ai/router.ts` | 46 | Router (CoreDecision → OutputType) |
| `src/lib/ai/conversation-strategy.ts` | 230 | StrategyDecision |
| `src/lib/ai/conversation-interpreter.ts` | 101 | Message classifier |
| `src/lib/ai/policy-ahora.ts` | 153 | Policy AHORA |
| `src/lib/ai/policy-reserva.ts` | 507 | Policy RESERVA |
| `src/lib/ai/field-resolver.ts` | 101 | Resolución de campos |
| `src/lib/ai/response-builder.ts` | 170 | Constructor de respuestas |
| `src/lib/ai/llm-response.ts` | 389 | LLM response generator |
| `src/lib/ai/slot-confirmation.ts` | 208 | UI de confirmación |
| `src/lib/ai/types.ts` | 303 | Tipos compartidos |
| `src/lib/ai/patterns.ts` | 56 | Patrones compartidos |
| `src/lib/ai/guard.ts` | 55 | Guardrails |
| `src/lib/sender.ts` | 111 | Output de mensajes |
| `src/lib/services/workflow/policy-pipeline.ts` | 388 | Policy pipeline (legacy) |
| `src/lib/services/workflow/slot-workflow.ts` | 114 | Slot state machine |
| `src/lib/services/workflow/ambiguity-handler.ts` | — | Ambiguity handler |
| `src/lib/services/workflow/awaiting-confirmation-handler.ts` | — | Confirmation handler |
| `src/lib/services/extraction/extraction-runner.ts` | 680 | Extraction orchestrator |
| `src/lib/services/extraction/extract-slots.ts` | — | LLM slot extraction |
| `src/lib/services/extraction/regex-extractor.ts` | — | Regex fallback |
| `src/lib/services/pricing/pricing-engine.ts` | — | Pricing engine |
| `src/lib/services/pricing/resolve-pricing-for-slots.ts` | — | Pricing resolution |
| `src/lib/bke/bke-engine.ts` | 50 | BKE Engine |
| `src/lib/bke/domains/message.ts` | — | BKE Message domain |
| `src/lib/drl/drl-engine.ts` | 92 | DRL Engine |
| `src/lib/drl/assistance.ts` | 145 | DRL Assistance |
| `src/lib/drl/rules/geo-desambiguacion.ts` | — | DRL Geo disambiguation rule |
| `src/lib/evidence/evidence.ts` | 257 | Evidence entity |
| `src/lib/evidence/run-shadow-cognition.ts` | — | Shadow cognition runner |
| `src/lib/memory/memory-service.ts` | 99 | Cognitive memory service |
| `src/lib/memory/index.ts` | 45 | Memory public API |
| `src/lib/services/memory/memory.ts` | 91 | Operational memory |
| `src/lib/services/memory/context-memory.ts` | — | Context memory |
| `src/lib/cognitive/collector.ts` | 244 | Cognitive metrics collector |
| `src/lib/ai/client-objective.ts` | — | Client objective model |
| `src/config/feature-flags.ts` | — | Feature flags |

---

## Appendix B: Glosario de Términos

| Término | Definición |
|---|---|
| **CORE** | Módulo de extracción determinista de hechos. Sin LLM. |
| **ROUTER** | Mapea CoreDecision → OutputType (EXECUTE/ANSWER/CLARIFY/SAFE_FALLBACK). |
| **POLICY** | Decisión de flujo conversacional (cómo responder). Única fuente de finalResponse. |
| **DRL** | Deterministic Reasoning Layer — reglas deterministas de validación. |
| **BKE** | Business Knowledge Engine — conocimiento de negocio (stub actualmente). |
| **Shadow Mode** | Ejecución en paralelo que nunca afecta el flujo principal. |
| **ProcessLead** | Pipeline ejecutor que recibe ExecutionContext + ExecutionDeps. |
| **HandlerContext** | Contexto enriquecido para handler.ts con señales semánticas. |

---

*Documento generado por ARNÉS — PR-QA1 Architectural Consistency Audit. 0 modificaciones de código realizadas.*
