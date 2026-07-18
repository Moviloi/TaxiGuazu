# PR-QA2B — Conversational State Forensics

**Fecha**: 2026-07-17
**Tipo**: Auditoría forense de continuidad conversacional
**Branch**: `qa-3/architectural-sanitization`
**Base**: commit `f2dc91c`
**Zero code modifications**: ✅

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Metodología](#2-metodología)
3. [Arquitectura de Estado: Mapa de Almacenamiento](#3-arquitectura-de-estado-mapa-de-almacenamiento)
4. [Ciclo de Vida de la Intención](#4-ciclo-de-vida-de-la-intención)
5. [Ciclo de Vida de los Slots](#5-ciclo-de-vida-de-los-slots)
6. [Línea Temporal: Estado por Turno](#6-línea-temporal-estado-por-turno)
7. [Respuesta a las 8 Preguntas Forenses](#7-respuesta-a-las-8-preguntas-forenses)
8. [Puntos de Quiebre Identificados](#8-puntos-de-quiebre-identificados)
9. [Mapa de Autoridades Conversacionales](#9-mapa-de-autoridades-conversacionales)
10. [Conclusiones](#10-conclusiones)

---

## 1. Resumen Ejecutivo

Se auditaron 25 archivos del pipeline conversacional para determinar dónde y cómo se pierde la continuidad conversacional. **El sistema tiene 8 puntos de quiebre distintos** que causan pérdida de contexto, intención o slots. La causa raíz no es una sola — es una combinación de:

1. **Múltiples autoridades compitiendo** por decidir qué campo preguntar (F-03, 4 componentes distintos)
2. **Bypass del pipeline unificado** en 5 de 7 rutas de entrada (F-06)
3. **Re-cálculo completo de intención en cada turno** sin preservación confiable de intención entre turnos
4. **Estado de ambigüedad frágil** que puede perderse si la DB no responde a tiempo
5. **Shortcuts de saludo** que ignoran el estado conversacional existente

---

## 2. Metodología

### Archivos auditados (25)

| Archivo | Rol en el estado |
|---|---|
| `src/lib/ai/handler.ts` | Orquestador CORE→ROUTER→POLICY |
| `src/lib/ai/core.ts` | Extracción de intención + roleLock por turno |
| `src/lib/ai/router.ts` | Mapeo intención→outputType |
| `src/lib/ai/types.ts` | Definiciones de estado |
| `src/lib/ai/conversation-interpreter.ts` | Clasificación del rol del mensaje |
| `src/lib/ai/patterns.ts` | Patrones de afirmación/negación |
| `src/lib/ai/ambiguity-interpreter.ts` | Desambiguación LLM |
| `src/lib/services/lead.service.ts` | Coordinador principal del pipeline |
| `src/lib/services/workflow/policy-pipeline.ts` | Pipeline de políticas + efectos |
| `src/lib/services/workflow/slot-workflow.ts` | Máquina de estados del workflow |
| `src/lib/services/workflow/ambiguity-handler.ts` | Resolución interactiva de lugares |
| `src/lib/services/workflow/conversation-setup.ts` | Setup/reset de conversación |
| `src/lib/services/workflow/slot-confirmation-handler.ts` | Botones de confirmación |
| `src/lib/services/workflow/slot-confirmation-text-handler.ts` | Texto en estado confirmación |
| `src/lib/services/workflow/awaiting-confirmation-handler.ts` | Estado awaiting_confirmation |
| `src/lib/services/workflow/awaiting-passenger-handler.ts` | Estado awaiting_passenger |
| `src/lib/services/workflow/evaluate-completeness.ts` | Evaluación de completitud |
| `src/lib/services/workflow/load-previous-slots.ts` | Carga de slots previos |
| `src/lib/services/extraction/extraction-runner.ts` | Pipeline de extracción |
| `src/lib/services/extraction/comprehension-runner.ts` | Evaluación de comprensión |
| `src/lib/services/memory/context-memory.ts` | Memoria de contexto (merge) |
| `src/lib/services/shared/session-helpers.ts` | Helpers de sesión |
| `src/lib/db/state-accessors.ts` | Accesores de estado DB |
| `src/lib/db/database.ts` | Operaciones DB |
| `src/lib/pipeline.ts` | Procesador del pipeline |

---

## 3. Arquitectura de Estado: Mapa de Almacenamiento

### 3.1 Tabla `chat_sessions` — Fuente de Verdad del Estado

| Columna | Propósito | Escrito por | Leído por |
|---|---|---|---|
| `conversational_state` | Estado de la máquina de estados (idle, collecting_slots, slot_confirmation, awaiting_passenger, awaiting_confirmation, ambiguity_pending, pending_human_review) | `setConversationalState`, `evaluateWorkflowTransition`, `upsertChatSession` | `getConversationalState`, múltiples handlers |
| `slots` | JSON blob con slots + metadatos (origin, destination, passengers, scheduled_at, intent, __ambiguity, etc.) | `upsertChatSession`, `mergeContext`, `finalizeAmbiguity`, `persistAmbiguityState` | `parseSessionSlots`, `loadPreviousSlots`, `loadContext`, `getAmbiguityStateFromSlots` |
| `confidence` | JSON blob con confianzas por campo | `upsertChatSession` | `parseConfidenceJson` |
| `clarify_field` | Campo que se está solicitando actualmente | `setConversationalState`, `evaluateWorkflowTransition` | `interpretMessage`, `handleAmbiguityResponse` |
| `comprehension_state` | Estado de comprensión (ok, CLARIFICATION, RECOVERY, ESCALATION) | `updateChatSessionComprehension` | `getComprehensionState` |
| `dispatch_state` | Estado de dispatch (idle, nivel_1–3, waiting_driver, closed) | `setDispatchState` | `getDispatchState` |
| `trip_state` | Estado del viaje (opportunity, null) | `setTripState` | múltiples |
| `lang` | Idioma detectado | `updateChatSessionLang` | `detectLangWithFallback` |
| `updated_at` | Timestamp de última actualización | upsert automático | `checkSessionExpiry` |

### 3.2 Mapa de Flujo del Estado por Turno

```
Mensaje entrante
  │
  ├─→ [CONVERSATION SETUP] → getOrCreateConversation, insertMessage
  │                            └── Estado leído: chat_sessions (trip, inactivity)
  │                            └── Estado escrito: conversation_history (message)
  │
  ├─→ [BUILD MEMORY] → memory.sessionMemory.lastIntent ← de chat_sessions.slots.intent
  │
  ├─→ [CORE] → intent, roleLock, slotStability, slotAssignmentConfidence
  │              └── Estado usado: prevIntent (de memory.sessionMemory.lastIntent)
  │              └── Estado producido: CoreDecision (stateless, por turno)
  │
  ├─→ [GREETING SHORTCUT] → si intent=GREETING, bypassa extracción y comprehension
  │                            └── Estado usado: NINGUNO (prevSlotsEarly: {})
  │
  ├─→ [COMPREHENSION CHECK] → comprehensionScore → estado (ok/CLARIFICATION/RECOVERY/ESCALATION)
  │                            └── Estado escrito: chat_sessions.comprehension_state
  │                            └── ESCALATION: puede enviar respuesta y hacer return
  │
  ├─→ [EXTRACTION PIPELINE]
  │     ├── loadPreviousSlots → chat_sessions.slots (slots previos)
  │     ├── loadContext → chat_sessions.slots (context memory)
  │     ├── extractSlots (LLM) → TripExtraction (por turno)
  │     ├── merge prevSlots + roleLock + affirmation + correction
  │     ├── evaluateCompleteness → ASK? → puede enviar mensaje y hacer return
  │     ├── evaluateWorkflowTransition → escribe conversational_state
  │     ├── upsertChatSession → escribe slots + confidence + conversational_state
  │     └── mergeContext → combina slots previos con actuales
  │
  ├─→ [POLICY PIPELINE]
  │     ├── buildExtractionContext (si no vino del input)
  │     ├── shouldRequestConfirmation → slot_confirmation (return)
  │     ├── canDispatch → executeNowTrip (return)
  │     ├── await_confirmation affirmation → executeTrip (return)
  │     ├── processLead → handler.handleMessage → core + router + policy
  │     └── saveContext → escribe slots en chat_sessions
  │
  └─→ [RESPUESTA ENVIADA]
```

---

## 4. Ciclo de Vida de la Intención

### 4.1 Almacenamiento de la Intención

La intención **NO tiene una columna dedicada** en `chat_sessions`. Se almacena indirectamente como:

1. **`chat_sessions.slots.intent`** — escrita por `mergeContext` en `extraction-runner.ts` línea 639 (`mergedWithMemory = mergeContext(mergedSlotsForDb, ctxMemory, ...)`)
2. **`memory.sessionMemory.lastIntent`** — construida en `buildMemory()` a partir de `session.slots.intent` en lead.service.ts línea 108
3. **No persiste como columna SQL independiente** — es un campo más dentro del JSON `slots`

### 4.2 Flujo Turno a Turno

```
Turno N:
  core(text, prevIntent) → produce CoreDecision.intent
  roleLock.origin (ej: "hotel") → fact "origin:hotel"
  roleLock.destination (ej: "centro") → fact "destination:centro"
  facts → classifyIntent → BOOKING (porque ambos slots están locked)
  → router → EXECUTE
  → policy → respuesta

  Al final: upsertChatSession(mergedWithMemory)
    donde mergedWithMemory = mergeContext(currentSlots, ctxMemory)
    mergeContext copia: merged.intent = current.intent ?? previous.intent
    → escribe intent dentro de slots

Turno N+1:
  core(text, prevIntent=BOOKING) → re-interpreta desde cero
  Si el texto es "sí, confirmo":
    facts = ["affirmation:true"]
    No hay origin/destination en el texto → roleLock ambos null
    classifyIntent:
      - has("affirmation:") → true
      - has("booking:") || has("now:") || has("urgency:") → false
      - → PRE_BOOKING (porque affirmation sin booking/now/urgency)
    Pero: prevIntent=BOOKING, intent=PRE_BOOKING
      Regla: (prevIntent && prevIntent !== "AMBIGUOUS" && prevIntent !== "GREETING")
        ? (intent === "PRE_BOOKING" ? prevIntent : ...)
      → finalIntent = BOOKING (prevIntent preserva)
```

### 4.3 Puntos de Pérdida de Intención

1. **GREETING shortcut** (lead.service.ts:124): Si core detecta GREETING, no usa `prevIntent`. Saluda como si fuera nuevo usuario.
2. **Session reset** (conversation-setup.ts:51-56): Si hay inactividad >48h o trip expirado, resetea TODO el estado.
3. **`prevIntent` ausente**: En `memory.ts`, `sessionMemory.lastIntent` solo existe si hubo `mergeContext` que escribió `intent` en slots previamente. En el primer turno de conversación, `prevIntent` es `undefined`.
4. **`handleMessage` invocado sin contexto**: La llamada a `handleMessage` desde `processLead` pasa `analysis: leadCore` pero NO pasa `prevIntent` explícitamente. Si `HandlerContext.history` está vacío o no hay slots, la intención se recalcula completamente.

### 4.4 Intenciones por Turno — Escenario Real

| Turno | Texto del usuario | Intención CORE | Intención Final (core) | OperationalMode | ¿Preservó prevIntent? |
|---|---|---|---|---|---|
| 1 | "Hola, quiero ir del hotel al centro" | BOOKING | BOOKING | CLARIFY | N/A (primer turno) |
| 2 | "Hotel Esturión" | — | — | — | — |
| 3 | "Sí, al centro de Puerto Iguazú" | — | — | — | — |

---

## 5. Ciclo de Vida de los Slots

### 5.1 Cómo se Almacena Cada Slot

Cada slot tiene **2 representaciones**:

1. **Valor simple** en `chat_sessions.slots` como string/number (ej: `"origin": "Aeropuerto IGR"`)
2. **Objeto completo** con metadatos: `{ value, display, score, reason, source, status }` (ej: `"origin": { "value": "Aeropuerto IGR", "display": "...", "score": 1.0, ... }`)

### 5.2 Autoridades que Escriben Slots (4 autoridades distintas)

| Autoridad | Componente | Cuándo escribe | Path |
|---|---|---|---|
| **A1** | `extraction-runner.ts` — `upsertChatSession` | Después de extracción LLM + merge | `mergedWithMemory = mergeContext(currentSlots, ctxMemory)` → upsert |
| **A2** | `ambiguity-handler.ts` — `finalizeAmbiguity` | Cuando ambos slots se resuelven | `upsertChatSession(phone, updatedSlots, undefined, "slot_confirmation", ...)` |
| **A3** | `ambiguity-handler.ts` — `persistAmbiguityState` | Durante resolución interactiva | `upsertChatSession(phone, currentSlots, ...)` con `__ambiguity` metadata |
| **A4** | `slot-confirmation-handler.ts` — `upsertChatSession` | Cuando usuario confirma via botón | `upsertChatSession(phone, rawSlots, rawConfidence, workflowResult.state, ...)` |
| **A5** | `policy-pipeline.ts` — `saveContext` | Después de procesar política | `saveContext(phone, { slots, intent, pricing, geo, confidence })` |
| **A6** | `awaiting-passenger-handler.ts` — `upsertChatSession` | Cuando usuario da pasajeros | `upsertChatSession(phone, JSON.parse(slotsJson), ...)` |

### 5.3 Autoridades que Determinan "¿Qué Slot Preguntar?" (4 autoridades distintas = F-03)

| Autoridad | Componente | Archivo | Línea | Lógica |
|---|---|---|---|---|
| **B1** | `evaluateCompleteness` | `src/lib/services/workflow/evaluate-completeness.ts` | — | Determina campo faltante según domain y slots actuales |
| **B2** | `field-resolver.ts` | `src/lib/ai/field-resolver.ts` | — | Resuelve el siguiente campo requerido según prioridad |
| **B3** | `extraction-runner.ts` | `src/lib/services/extraction/extraction-runner.ts` | 272-289 | Evalúa completitud y decide si preguntar o no |
| **B4** | `slot-workflow.ts` | `src/lib/services/workflow/slot-workflow.ts` | 75-95 | Determina nuevo estado según confidence de extracción |

---

## 6. Línea Temporal: Estado por Turno

### 6.1 Escenario 1: Booking normal (sin estado perdido)

```
TURNO 1: "Hola, quiero ir del hotel al centro"
  Intención activa:      BOOKING (core)
  Slots conocidos:       origin="hotel" (roleLock, locked), destination="centro" (roleLock, locked)
  Slots confirmados:     ninguno
  Contexto disponible:   ninguno (chat_sessions.slots vacío)
  Componente decisor:    core.ts → router → policy → handler → LLM
  Componente respuesta:  generateLLMResponse
  Estado post-turno:     chat_sessions: slots={origin, destination}, conversational_state=collecting_slots
  Nota:                  "hotel" y "centro" marcados como "ambiguous" por AMBIGUOUS_LOCATION_RE

TURNO 2: "Sí, al centro de Puerto Iguazú"
  Intención activa:      BOOKING (prevIntent=BOOKING + affirmation:true → PRE_BOOKING→BOOKING por regla)
  Slots conocidos:       origin="hotel" (prevSlotsEarly), destination="centro de puerto iguazú" (roleLock)
  Slots confirmados:     ninguno (ambiguos aún no confirmados)
  Contexto disponible:   slots previos cargados
  Componente decisor:    extraction-runner → evaluateWorkflowTransition
  Componente respuesta:  handlePolicyPipeline → shouldRequestConfirmation → slot_confirmation buttons
  Estado post-turno:     chat_sessions: conversational_state=slot_confirmation

TURNO 3: [click en botón "confirmar"]
  Intención activa:      BOOKING (slot_confirm button → slot-confirmation-handler)
  Slots conocidos:       origin, destination, passengers (si se pidieron)
  Slots confirmados:     origin, destination (USER_CONFIRMED)
  Contexto disponible:   sesión completa
  Componente decisor:    slot-confirmation-handler → evaluateWorkflowTransition
  Componente respuesta:  slot-confirmation-handler → pricing → awaiting_confirmation
  Estado post-turno:     chat_sessions: conversational_state=awaiting_confirmation

TURNO 4: "Sí, confirmo"
  Intención activa:      BOOKING (affirmation detectada en policy-pipeline)
  Slots conocidos:       todos completos
  Slots confirmados:     todos
  Contexto disponible:   sesión completa
  Componente decisor:    policy-pipeline (línea 181-268) → affirmation handler
  Componente respuesta:  executeTrip / executeNowTrip
  Estado post-turno:     chat_sessions: conversational_state=idle (executeNowTrip resetea)
```

**✅ En este escenario NO hay pérdida de contexto.**

---

### 6.2 Escenario 2: Ambiguity + pérdida de estado (P0.9.5)

```
TURNO 1: "Del aeropuerto al centro"
  Intención activa:      BOOKING
  Slots conocidos:       origin="aeropuerto" (locked, ambiguous), destination="centro" (locked, ambiguous)
  Contexto:              limpiar, sin estado previo
  Componente decisor:    core → router → extraction-runner → detecta ambigüedad
  Componente respuesta:  lead.service.ts → startAmbiguityResolution
  Estado intermedio:     chat_sessions.slots = {origin: "aeropuerto", destination: "centro", __ambiguity: {...}}
                         conversational_state = "ambiguity_pending"
                         clarify_field = "origin"

TURNO 2: "Argentina" (usuario responde país)
  Intención activa:      BOOKING (pero reevaluada por core)
  Slots conocidos:       origin="aeropuerto", destination="centro" (en slots DB)
  Contexto:              ambiguity_pending
  Componente decisor:    lead.service.ts:180-207 → handleAmbiguityResponse
  ⚠️ PUNTO DE QUIEBRE:
    handleAmbiguityResponse llama getChatSession(phone) para obtener ambState
    SI la sesión se perdió (P0.9.5: "ambState era null (estado perdido)"):
      → intenta preservar slots CONFIRMED
      → setConversationalState(phone, "collecting_slots")
      → leadCore.facts.some(f => f.startsWith("location_ambiguous:")) → true (del texto "aeropuerto")
      → startAmbiguityResolution intenta de nuevo pero con un estado parcial
    SI la sesión existe pero __ambiguity se perdió:
      → handleAmbiguityResponse retorna false
      → lead.service.ts:192-201 preserva slots CONFIRMED y resetea a collecting_slots
      → cae al pipeline normal con extracción fresca
  ⚠️ RESULTADO:
    La respuesta del usuario "Argentina" NO tiene roleLock ni facts de ubicación
    → core produce intent=CONSULTA o AMBIGUOUS (dependiendo de otras palabras)
    → comprehension-runner detecta score bajo
    → puede escalar o recovery → "Te transfiero con un operador"
    🔴 ESTADO PERDIDO: el contexto "estamos desambiguando" se pierde completamente

TURNO 3: [el sistema ya no sabe que estábamos cotizando un traslado]
```

---

### 6.3 Escenario 3: GREETING Shortcut — bypass completo del estado

```
TURNO 1: "Quiero ir del hotel Meliá a Cataratas"
  Intención activa:      BOOKING
  Slots:                 origin="hotel meliá", destination="cataratas"
  Estado:                collecting_slots
  Respuesta:             confirmación + pricing

  ─── [pasan 2 horas] ───

TURNO 2: "Hola"
  core(text="Hola") → facts = ["greeting:hola"]
  classifyIntent:
    - has("greeting:") → true
    - NO tiene action:, urgency:, booking:, now:, commercial:, informational:, passengers:, etc.
    → GREETING
  lead.service.ts:124-136:
    intent === "GREETING" → handlePolicyPipeline WITHOUT extractionCtx, WITHOUT prevSlots
      ↑🔴 AQUÍ SE PIERDE EL CONTEXTO
      No se cargan prevSlotsEarly, no se pasa extractionCtx, no se evalúa completitud
      domain = mapIntentToDomain("GREETING") → "information"
      En handler.ts: messageType = "small_talk" (conversation-interpreter)
      → buildDomainPolicy → buildInformationalResponse → saludo genérico
  🔴 RESULTADO: "¡Hola! Soy Cris Virtual..." como si fuera nuevo usuario
  🔴 ORIGEN Y DESTINO PERDIDOS: a pesar de estar en DB, nunca se consultan
```

---

### 6.4 Escenario 4: Context replacement por re-evaluación de intención

```
TURNO 1: "Cuánto sale un viaje del aeropuerto al centro"
  Intención activa:      COMMERCIAL (core: query:cuánto → commercial:cuánto)
  Slots:                 origin="aeropuerto", destination="centro"
  Estado:                collecting_slots (acción clarify porque no hay precio inmediato)
  Respuesta:             precio o clarificación de lugar exacto

TURNO 2: "Del Aeropuerto IGR al Hotel Amerian"
  core(text) → roleLock.origin="aeropuerto igr", roleLock.destination="hotel amerian"
  facts → origin:aeropuerto igr, destination:hotel amerian, location_ambiguous:true
  classifyIntent:
    - has("emergency:")? no → has("reschedule:")? no → has("post_service:")? no
    - has("greeting:")? no (no hay "hola" en el texto)
    - has("consulta:")? no
    - has("affirmation:")? no → has("date:")? no → has("time:")? no
    - slotStability.origin !== "open" && slotStability.destination !== "open" → true
    - has("now:")? no → BOOKING
  prevIntent = COMMERCIAL (del turno 1)
  Regla: prevIntent !== "AMBIGUOUS" && prevIntent !== "GREETING" → true
         intent === "PRE_BOOKING"? no, es BOOKING
         intent === prevIntent (BOOKING === COMMERCIAL)? no
         → finalIntent = intent = BOOKING
  🔴 CAMBIO DE INTENCIÓN: COMMERCIAL → BOOKING
  Esto puede estar BIEN (el usuario ahora quiere reservar) o MAL (solo está refinando la consulta)
  El sistema NO tiene mecanismo para distinguir entre "refino mi consulta de precio"
  y "ahora quiero reservar" — depende enteramente de core() que es puramente sintáctico.
```

---

### 6.5 Escenario 5: Bypass de pipeline por ruta no-estándar

```
De 7 rutas de entrada en handleLeadMessage, solo 2 llegan al pipeline completo:

RUTAS QUE BYPASSEAN (5):
  1. GREETING shortcut (línea 124) — sin estado
  2. SLOT_CONFIRMATION BUTTONS (línea 154-157) — handler dedicado
  3. SLOT_CONFIRMATION TEXT (línea 163-166) — handler dedicado
  4. AWAITING_PASSENGER (línea 169-172) — handler dedicado
  5. AWAITING_CONFIRMATION (línea 175-178) — handler dedicado

RUTAS QUE PASAN POR PIPELINE COMPLETO (2):
  6. AMBIGUITY → normal (línea 180-207 → 209 → 238-314)
  7. POST-BOOKING (línea 212-236) → policy-pipeline sin extracción
  8. Flujo normal (línea 238-314) — pipeline completo

Cada ruta bypass maneja el estado de manera diferente:
  - Slot confirmation button: lee slots de session, escribe nuevo estado
  - Awaiting confirmation: lee slots, escribe nuevo estado (o resetea)
  - Awaiting passenger: lee slots, escribe
  - GREETING: NO LEE NADA, escribe solo el mensaje de saludo
```

---

## 7. Respuesta a las 8 Preguntas Forenses

### P1: ¿Dónde se almacena la intención?

**Respuesta**: En `chat_sessions.slots.intent` como campo JSON dentro del blob `slots`. NO existe una columna SQL dedicada.

**Flujo**:
1. `core(text, prevIntent)` produce `CoreDecision.intent` por turno
2. `extraction-runner.ts:639`: `mergeContext(mergedSlotsForDb, ctxMemory)` copia `intent` al merged
3. `upsertChatSession(phone, mergedWithMemory, ...)` persiste en DB
4. `buildMemory(session, history)` → `sessionMemory.lastIntent` = `slots.intent` (próximo turno)
5. `core(text, (memory.sessionMemory.lastIntent ?? undefined) as Intent | undefined)` → prevIntent

**Evidencia de fragilidad**:
- Si `mergeContext` no se ejecuta (ej: en ruta GREETING shortcut), la intención NO se persiste
- Si hay session reset, la intención se pierde completamente
- Si el slot `intent` se sobreescribe con un valor vacío, el turno siguiente pierde referencia

---

### P2: ¿Dónde se almacena cada slot?

**Respuesta**: En `chat_sessions.slots` (JSON blob). Cada slot tiene dos representaciones posibles:

```
Formato simple:  "origin": "Aeropuerto IGR"
Formato objeto:  "origin": { "value": "Aeropuerto IGR", "display": "...", "score": 1.0,
                              "reason": "core_extracted", "source": "CORE", "status": "CONFIRMED" }
```

Además, los slots viajan **en memoria** a través de:
- `prevSlotsEarly`: `loadPreviousSlots(phone)` → parseSessionSlots(session.slots)
- `ctxMemory`: `loadContext(phone)` → parseSessionSlots(session.slots)
- `prevSlotStates`: `loadPreviousSlotStates(phone)` → estados previos
- `extractionCtx`: `buildExtractionContext(parsedData, confidenceResult, workflowResult, pricing, roleLock, slotStability, prevSlotsEarly)`

**6 autoridades escriben slots** (ver §5.2). Esto significa que el slot final depende de qué autoridad se ejecutó último.

---

### P3: ¿En qué momento se pierde el origen?

**Respuesta**: El origen se pierde en **5 puntos distintos**:

| # | Punto | Archivo | Línea | Condición |
|---|---|---|---|---|
| 1 | **GREETING shortcut** | `lead.service.ts` | 124-136 | Si `intent === "GREETING"`, se llama a `handlePolicyPipeline` con `extractionCtx: undefined` y `prevSlotsEarly: {}` — los slots previos no se cargan |
| 2 | **Ambiguity state collapse** | `lead.service.ts` | 185-201 | Si `handleAmbiguityResponse` retorna false porque `ambState` es null, se resetea a `collecting_slots` y se preservan solo slots CONFIRMED. Si el slot tenía status ≠ CONFIRMED, se pierde |
| 3 | **Session reset** | `conversation-setup.ts` | 51-56 | Inactividad >48h o trip expirado → `fullReset` elimina TODO |
| 4 | **Confirmation timeout** | `policy-pipeline.ts` | 186-190 | Afirmación stale >CONFIRMATION_TIMEOUT_S → reset a idle + resetChatSession |
| 5 | **Awaiting_confirmation negative** | `extraction-runner.ts` | 257-263 | Respuesta negativa sin nuevos datos → `resetChatSession` |

---

### P4: ¿En qué momento se pierde el destino?

**Respuesta**: Mismos 5 puntos que el origen (§P3), más 2 adicionales específicos:

| # | Punto | Archivo | Línea | Condición |
|---|---|---|---|---|
| 6 | **Ambiguity incomplete resolution** | `ambiguity-handler.ts` | 214-226 | Si LLM resuelve ambos slots (auto), se escribe en DB correctamente. Pero si solo resuelve uno y el usuario nunca responde la segunda pregunta de ambigüedad, el destino resuelto queda en `__ambiguity.resolvedDest` dentro del JSON slots, NO como slot independiente. Si luego hay un reset, se pierde |
| 7 | **Context override sin confirmación** | `extraction-runner.ts` | 482-493 | `for (const [k, v] of Object.entries(prevSlotsEarly))` — si prevSlotsEarly tiene valor pero el nuevo texto NO incluye ese valor, se reemplaza el slot actual con el previo. Esto es correcto para preservar contexto, pero puede causar que un destino nuevo no se reconozca |

---

### P5: ¿En qué momento se pierde el contexto "estamos cotizando un traslado"?

**Respuesta**: Este contexto es un concepto implícito que depende de:
1. `conversational_state !== "idle"` (si está en idle, no hay cotización activa)
2. `slots` con origin y destination parcialmente llenos
3. `intent` en los slots (BOOKING, PRE_BOOKING, COMMERCIAL)

**Se pierde en 4 puntos**:

| # | Punto | Condición | Efecto |
|---|---|---|---|
| 1 | **GREETING shortcut** | Usuario saluda → intent=GREETING → bypass → respuesta genérica | Estado "idle" NO se escribe, pero el sistema saluda como si nada hubiera pasado |
| 2 | **Comprehension ESCALATION** | Score bajo → "Te transfiero con un operador" | El usuario cree que empezó de nuevo. Estado sigue en DB, pero el humano no tiene continuidad |
| 3 | **Ambiguity reset** | ambState perdido → reset a collecting_slots | El sistema vuelve a preguntar origen/destino como si fuera nuevo |
| 4 | **Confirmation negative** | Usuario dice "no" → cancelMsg + resetChatSession | Borra TODO, incluido el contexto |

**Caso crítico**: La pérdida más común es cuando el usuario interactúa con la desambiguación, el sistema pierde el estado `ambiguity_pending`, resetea a `collecting_slots`, y el mensaje siguiente del usuario ("Argentina" o "sí") no tiene roleLock → core produce intent CONSULTA → comprehension falla → escalación.

---

### P6: ¿Qué componente provoca que "Hotel Esturión" sea enviado al comportamiento conversacional genérico?

**Respuesta**: Es una **cascada de 3 componentes**:

```
1. core.ts detecta "hotel" → AMBIGUOUS_LOCATION_RE.test("hotel esturión")
   → fact: "location_ambiguous:true"
   → roleLock.destination = "hotel esturión" (locked)
   → slotStability.destination = "ambiguous"

2. lead.service.ts detecta location_ambiguous:true
   → startAmbiguityResolution(phone, conversationId, text, leadCore, session)
   → ambiguity-handler.ts: searchPlaces("hotel esturión", 5)
   → SI "Hotel Esturión" NO ESTÁ en la base de datos:
     → originCandidates.length = 0 (o 1 si hay match parcial)
     → destCandidates.length = 0
     → !originAmbiguous && !destAmbiguous → return false
   → lead.service.ts:208 → cae al pipeline normal

3. extraction-runner.ts: extractSlots (LLM) recibe "Hotel Esturión"
   → Si el LLM no conoce el hotel o no puede extraerlo:
     → raw = null o incompleto
     → evaluateCompleteness → ASK → mensaje genérico
     → O comprehension-runner detecta score bajo → RECOVERY/ESCALATION
   → Si el LLM extrae "hotel esturión" como destination, pero no está en DB:
     → pricing falla → no hay tariff → extractionCtx.tariff.matched = false
     → shouldRequestConfirmation → false (no hay matching tariff)
     → processLead → handler.handleMessage → generateLLMResponse
     → LLM genera respuesta genérica sobre "Hotel Esturión" sin contexto de traslado
```

**🔴 Problema central**: El sistema no tiene un mecanismo para decir "esto parece un lugar pero no está en mi DB — debería preguntar al usuario si es correcto de todos modos". En lugar de eso, fluye al LLM que puede o no entender el contexto.

---

### P7: ¿Qué componente decide volver a preguntar un dato ya conocido?

**Respuesta**: **4 componentes distintos** pueden decidir preguntar un dato ya conocido (F-03 del QA-2):

| Componente | Condición | Resultado |
|---|---|---|
| **`evaluateCompleteness`** | Status=ASK + field determinado | `buildGenericClarify(field)` |
| **`extraction-runner.ts`** línea 272-289 | Completeness ASK + no bypass | `buildGenericClarify(field)` |
| **`field-resolver.ts`** (via resolveNextRequiredField) | Slot no tiene valor o score bajo | Pregunta el siguiente campo |
| **`slot-workflow.ts`** evaluateWorkflowTransition | Clarify action → set clarifyField | No pregunta directo, pero el pipeline downstream pregunta |

**El caso más común de re-pregunta**:

```
TURNO 1: "Del aeropuerto al centro"
  → origin="aeropuerto", destination="centro" almacenados en slots

TURNO 2: "Sí" (confirmación)
  → core produce intent=CONSULTA o AMBIGUOUS (solo "sí" no tiene roleLock)
  → extraction-runner.ts:
    - hasAffirmation = true
    - hasPrevSlotsLocation = true
    - convState !== "awaiting_confirmation" (puede ser collecting_slots)
    - → promueve prevSlots a current extraction
    → evaluateCompleteness corriendo sobre los slots promovidos
    → SI falta otro campo (passengers, scheduled_at) → ASK
    → OK, está preguntando un campo nuevo

PERO si el estado es "idle" (porque algo lo reseteó):
  → NO hay prevSlotsEarly
  → NO hay hasPrevSlotsLocation
  → evaluateCompleteness ve que falta origin y destination
  → ASK → "¿A dónde necesitás ir?"
  🔴 RE-PREGUNTA: vuelve a preguntar origen/destino que YA estaban en el turno 1
```

---

### P8: ¿El problema es pérdida de estado, reemplazo de contexto, replanificación completa, múltiples autoridades o bypass del pipeline?

**Respuesta**: **TODAS las anteriores**. Evidencia para cada una:

#### 🔴 Pérdida de estado (3 puntos confirmados)

1. **Ambiguity state collapse** — `lead.service.ts:185-201`: `ambState` se vuelve null → reset a `collecting_slots`. Confirmado en código (P0.9.5 path).
2. **Session expiry** — `slot-workflow.ts:30-53`: Inactividad >48h → `resetChatSession`. Legítimo pero destructivo.
3. **Confirmation timeout** — `policy-pipeline.ts:186-190`: Afirmación tardía → `resetChatSession`.

#### 🟡 Reemplazo de contexto (2 puntos)

1. **Cada turno reinterpreta la intención** — `core.ts:169-291`: `core()` es puramente sintáctico por turno. Aunque `prevIntent` ayuda, no evita que cada mensaje sea clasificado desde cero.
2. **`prevSlotsEarly` override** — `extraction-runner.ts:482-493`: Los slots previos se mergean con los actuales, pero la regla de merge puede causar que un valor nuevo sea reemplazado por el previo si el texto no incluye explícitamente el valor antiguo.

#### 🟡 Replanificación completa (2 puntos)

1. **Session reset** — `conversation-setup.ts:51-56`: `fullReset` + `clearConversationHistory`.
2. **GREETING shortcut** — `lead.service.ts:124-136`: Envía saludo como si fuera primer turno, aunque haya estado previo.

#### 🔴 Múltiples autoridades (3 puntos — F-01, F-02, F-03)

1. **F-01: Pipeline paralelo** — `handleMessage` ejecuta su propio `core()` dentro del policy pipeline (vía `processLead`), mientras que `lead.service.ts` ya ejecutó `core()` antes. El segundo `core()` puede producir una intención DISTINTA.
2. **F-02: Afirmación triplicada** — `core.ts` detecta `affirmation:true`, `patterns.ts:isAffirmativeMessage` también, y `conversation-interpreter.ts` también. Tres sistemas distintos detectando la misma cosa.
3. **F-03: Resolución de campos cuadruplicada** — 4 componentes determinan qué campo preguntar.

#### 🔴 Bypass del pipeline (F-06)

5 de 7 rutas en `handleLeadMessage` bypassan el pipeline unificado, cada una con su propio manejo de estado:

| Ruta | Estado que usa | Estado que escribe | Pipeline completo? |
|---|---|---|---|
| GREETING shortcut | NINGUNO | SÓLO mensaje respuesta | ❌ |
| Slot confirmation button | session.slots | conversational_state, slots | ❌ |
| Slot confirmation text | session, leadCore | conversational_state, slots | ❌ |
| Awaiting passenger | session, slots | conversational_state, slots | ❌ |
| Awaiting confirmation | session, leadCore | conversational_state | ❌ |
| Ambiguity handler | session, ambState | conversational_state, slots | ❌ |
| **Pipeline normal** | **TODO** | **TODO** | **✅** |

---

## 8. Puntos de Quiebre Identificados

### 🔴 Críticos (producen pérdida de contexto comprobada)

| ID | Componente | Línea | Síntoma | Frecuencia estimada |
|---|---|---|---|---|
| **QB-01** | `lead.service.ts` GREETING shortcut | 124-136 | Usuario saluda y el sistema ignora todo el estado previo | Alta (cada saludo en medio de conversación) |
| **QB-02** | `lead.service.ts` Ambiguity reset | 185-201 | El usuario responde una pregunta de desambiguación pero el estado se perdió | Media (depende de latencia DB) |
| **QB-03** | `policy-pipeline.ts` Confirmation timeout | 186-190 | Usuario confirma después de mucho tiempo → se ignora y resetea | Baja (solo con sesiones largas) |
| **QB-04** | Múltiples autoridades de field resolution | 4 archivos | Cada turno puede decidir preguntar un campo distinto | Alta (cada interacción) |

### 🟡 Estructurales (aumentan probabilidad de pérdida)

| ID | Componente | Línea | Síntoma |
|---|---|---|---|
| **QB-05** | `handler.ts` segundo `core()` | 101 | El `handleMessage` dentro del policy pipeline ejecuta su propio `core()`, que puede clasificar distinto al `core()` de `lead.service.ts` |
| **QB-06** | `extraction-runner.ts` prevSlots merge | 482-493 | El mergeo de slots previos puede sobrescribir un valor nuevo si el texto no menciona el valor antiguo |
| **QB-07** | `core.ts` classifyIntent | 293-366 | La clasificación de intención es puramente sintáctica y puede cambiar radicalmente entre turnos |
| **QB-08** | `ambiguity-handler.ts` Ambiguity state en slots | 308-309 | El estado de ambigüedad vive dentro de `__ambiguity` en slots JSON, no en columna dedicada |

---

## 9. Mapa de Autoridades Conversacionales

### Quién decide QUÉ preguntar

```
evaluateCompleteness (extraction-runner → policy-pipeline)
  ↑
  ├── Basado en domain + slots actuales
  ├── Decide ASK / CONTINUE
  └── field = campo faltante
        │
        ├── SI ASK → buildGenericClarify(field) → mensaje
        │
        └── SI CONTINUE → policy-pipeline
              │
              ├── shouldRequestConfirmation → true → slot_confirmation
              │
              ├── canDispatch → true → executeNowTrip
              │
              └── processLead → handler.handleMessage
                    │
                    ├── core() (SEGUNDO core — puede diferir)
                    ├── router() → outputType
                    ├── policy → respuesta + efectos
                    └── generateLLMResponse (si no skip)
```

### Quién decide el estado conversacional

```
evaluateWorkflowTransition (slot-workflow.ts)
  └── Basado en: extractionResult.action + currentState
      ├── action="proceed" → awaiting_confirmation (desde idle/collecting)
      ├── action="clarify" → collecting_slots
      └── action="fallback" → collecting_slots si idle
            │
            ├── validity check contra VALID_SLOT_TRANSITIONS
            └── setConversationalState(phone, newState)
```

### Quién lee/escribe slots

```
ESCRITURA (6 autoridades):
  A1 extraction-runner.ts → upsertChatSession (después de extracción)
  A2 ambiguity-handler.ts → finalizeAmbiguity → upsertChatSession
  A3 ambiguity-handler.ts → persistAmbiguityState → upsertChatSession
  A4 slot-confirmation-handler.ts → upsertChatSession
  A5 policy-pipeline.ts → saveContext → upsertChatSession
  A6 awaiting-passenger-handler.ts → upsertChatSession

LECTURA (8 consumidores):
  R1 loadPreviousSlots → chat_sessions.slots
  R2 loadContext → chat_sessions.slots
  R3 getChatSession → chat_sessions.*
  R4 getConversationalState → chat_sessions.conversational_state
  R5 handleAmbiguityResponse → chat_sessions.slots.__ambiguity
  R6 buildMemory → chat_sessions.slots.intent
  R7 parseSessionSlots → varios handlers
  R8 getActiveTripByPhone → trips table
```

---

## 10. Conclusiones

### Hallazgos principales

1. **La intención no tiene almacenamiento dedicado** — es un campo JSON dentro de `slots`. No hay columna SQL, no hay constraint, no hay garantía de consistencia.

2. **El estado `ambiguity_pending` es inherentemente frágil** — vive en `slots.__ambiguity` como metadata JSON. Cualquier operación que sobreescriba `slots` sin preservar `__ambiguity` lo pierde.

3. **5 de 7 rutas bypassan el pipeline unificado** — cada una maneja estado de manera independiente, sin coordinación central. Esto es la causa raíz de F-06.

4. **El GREETING shortcut es el mayor destructor de contexto** — ignora completamente el estado conversacional existente. Un "hola" en medio de una cotización activa resetea la percepción del usuario.

5. **Dos `core()` por request** — `lead.service.ts` ejecuta `core(text)` y luego `handleMessage` (vía `processLead`) ejecuta OTRO `core(input)`. El segundo puede clasificar distinto porque no recibe `prevIntent`.

6. **4 autoridades compiten por determinar "qué preguntar"** — F-03 confirmado en el código fuente.

### Riesgos priorizados para QA-3

| Prioridad | ID | Riesgo | Impacto |
|---|---|---|---|
| **P0** | QB-01 | GREETING shortcut destruye contexto | Alto — ocurre en cada saludo |
| **P0** | QB-04 | Múltiples autoridades preguntan campos distintos | Alto — confusión al usuario |
| **P1** | QB-02 | Ambiguity state frágil | Medio — ocurre con latencia DB |
| **P1** | QB-05 | Doble core() con resultados distintos | Medio — puede cambiar intención |
| **P2** | QB-03 | Confirmation timeout resetea | Bajo — solo sesiones largas |
| **P2** | QB-06 | Merge de slots puede sobrescribir | Bajo — esquina |

### Relación con hallazgos de PR-QA1/QA-2

| Hallazgo PR-QA1 | Hallazgo PR-QA2B | Confirmado |
|---|---|---|
| F-01: Pipeline paralelo (handleMessage) | QB-05: Segundo core() dentro de processLead | ✅ Confirmado con evidencia de código |
| F-02: Afirmación triplicada | QB-04 (parte): 3 sistemas detectan afirmación | ✅ Confirmado |
| F-03: Field resolution cuadruplicada | QB-04: 4 autoridades de field resolution | ✅ Confirmado |
| F-06: 5/7 rutas bypassan handleMessage | QB-01 + 5 rutas bypass | ✅ Confirmado |
| — (nuevo) | QB-02: Ambiguity state frágil | 🆕 Descubierto en QA-2B |
| — (nuevo) | QB-07: Intención puramente sintáctica | 🆕 Descubierto en QA-2B |

---

*Documento generado como parte de la serie PR-QA. Cero modificaciones de código.*
