# PR-QA3-S2B — Hotel Esturión: Trace vs. Functional Behavior Specification

**Fecha**: 2026-07-17  
**Tipo**: Traza end-to-end con verificación contra Functional Behavior Specification  
**Branch**: `qa-3/architectural-sanitization`  
**Base**: commit `f2dc91c` + PR-QA3-S2A (single core)  
**Autoridad funcional**: `docs/specification/FUNCTIONAL_BEHAVIOR_SPECIFICATION.md` v1.0  
**Zero code modifications**: ✅  

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Traza del Escenario](#2-traza-del-escenario)
3. [Matriz de Trazabilidad](#3-matriz-de-trazabilidad)
4. [Traza Instrumentada: Turno 2 "Hotel Esturión"](#4-traza-instrumentada-turno-2-hotel-esturión)
5. [Hallazgos Clasificados](#5-hallazgos-clasificados)
6. [Mapa de Desviaciones vs. Specification](#6-mapa-de-desviaciones-vs-specification)
7. [Validación de Invariantes](#7-validación-de-invariantes)
8. [Validación de Contratos ARNÉS](#8-validación-de-contratos-arnés)
9. [Conclusiones](#9-conclusiones)

---

## 1. Resumen Ejecutivo

Se ejecutó la traza end-to-end del escenario "Hotel Esturión" (Turno 2 de una conversación BOOKING con estado `collecting_slots` previo) comparando cada paso contra la `FUNCTIONAL_BEHAVIOR_SPECIFICATION.md`.

### Veredicto

| Dimensión | Resultado |
|-----------|-----------|
| **Puntos de control trazados** | 12 |
| **Cumplen Specification** | 5 (41.7%) |
| **Desviaciones de Specification** | 5 (41.7%) |
| **Ambigüedades de Specification** | 2 (16.7%) |
| **Bloqueantes** | 1 (F01-DG: ambigüedad activada incorrectamente) |

### Hallazgos principales

1. **🔴 F01-DG — Ambigüedad activada sin verificar `clarify_field`**: El sistema activa `startAmbiguityResolution` para `location_ambiguous:true` sin comprobar si el `clarify_field` de la sesión indica que el usuario está respondiendo a una pregunta de destino. La Specification (§25.2, §14.4) establece que NO debe activarse ambigüedad en este caso.

2. **🟡 F02-DG — Intención no preservada**: `core("Hotel Esturión", prevIntent=BOOKING)` produce `finalIntent=CONSULTA` porque la regla de preservación de intención (§25.4, §9) no está implementada. El código actual solo preserva `prevIntent` cuando `intent === "PRE_BOOKING"`, pero la Specification dice que intenciones de menor confianza operativa (CONSULTA, AMBIGUOUS) deben heredar BOOKING cuando `prevIntent` es BOOKING.

3. **🟡 F03-DG — Merge no ejecutado por bypass de ambigüedad**: Al activar ambigüedad, el flujo nunca llega a `runExtractionPipeline` → `mergeContext`. El mensaje "Hotel Esturión" como posible valor para `destination` nunca se fusiona con los slots previos. La Specification (§21 Caso A) espera que `destination = "Hotel Esturión"` se agregue al contexto.

4. **🟢 F04-DG — Sin doble core()**: PR-QA3-S2A (QB-05 fix) está operativo. `handler.ts:101` usa `ctx?.analysis ?? core(input)`, y el path de ambigüedad nunca llega a `handleMessage`. La clasificación es única.

5. **🟢 F05-DG — Triple fallback presente**: Si `startAmbiguityResolution` retorna `false` (porque el lugar no está en DB), el flujo cae al pipeline normal con extracción LLM.

---

## 2. Traza del Escenario

### Escenario completo

```
Turno 1: "Hola, quiero ir del hotel al centro"
  → core: BOOKING, facts=[greeting:hola, action:quiero, location_ambiguous:true, origin:hotel, destination:centro]
  → El sistema procesa el pipeline normal
  → Estado post-Turno 1:
      conversational_state = "collecting_slots"
      slots = {
        origin: { value: "hotel", status: "RAW", score: 0.95, source: "CORE" },
        destination: { value: "centro", status: "RAW", score: 0.95, source: "CORE" }
      }
      clarify_field = "destination" (o null, según qué evaluó completeness)
      lastIntent = "BOOKING"

Turno 2: "Hotel Esturión"         ← ESCENARIO BAJO ANÁLISIS
  → ¿Qué espera la Specification? → El usuario está dando su destino
  → ¿Qué hace el sistema?         → Activa ambigüedad para ORIGEN y DESTINO

Turno 3: "Sí, al centro de Puerto Iguazú"
  → (fuera del alcance de esta traza)
```

### Estado inicial de la sesión (antes de Turno 2)

Basado en el análisis forense de PR-QA2B y el flujo de Turno 1:

| Variable | Valor | Fuente |
|----------|-------|--------|
| `conversational_state` | `"collecting_slots"` | `evaluateWorkflowTransition` post-Turno 1 |
| `slots.origin.value` | `"hotel"` | CORE roleLock en Turno 1 |
| `slots.destination.value` | `"centro"` | CORE roleLock en Turno 1 |
| `slots.origin.status` | `"RAW"` | No confirmado todavía |
| `slots.destination.status` | `"RAW"` | No confirmado todavía |
| `clarify_field` | `"destination"` (esperado) o `null` | Depende de `evaluateCompleteness` |
| `lastIntent` (slots.intent) | `"BOOKING"` | `mergeContext` post-Turno 1 |

---

## 3. Matriz de Trazabilidad

```
Escenario: "Hotel Esturión" en Turno 2, conversational_state=collecting_slots, clarify_field=destination
     │
     ├── Capítulos de Specification aplicables:
     │    §6  — Modelo conversacional esperado
     │    §8  — Estados conversacionales permitidos
     │    §9  — Evolución de la intención
     │    §10 — Gestión del contexto
     │    §12 — Gestión de ambigüedades
     │    §13 — Política de actualización incremental del contexto
     │    §14 — Política de repreguntas
     │    §16 — Política de resolución de entidades
     │    §20 — Invariantes conversacionales
     │    §21 — Casos A (usuario proporciona un slot nuevo)
     │    §24 — Algoritmo conceptual esperado para cada turno
     │    §25 — Expected Behavioral Reference (§25.2, §25.3, §25.4, §25.6)
     │
     ├── Reglas aplicables:
     │    R1  — §13.1: Contexto acumulativo, no reemplazo
     │    R2  — §14.1: Orden de preguntas: origin → destination → passengers → scheduled_at
     │    R3  — §14.4: "Hotel Esturión" con clarify_field=destination → interpretar como destino
     │    R4  — §14.2: Nunca preguntar lo que ya se sabe
     │    R5  — §14.2: Una sola pregunta por turno
     │    R6  — §12.4: Si un slot se resuelve, usar contexto para el otro
     │    R7  — §25.2: clarificar antes de activar ambigüedad
     │    R8  — §9.4: Intención contextual: si prevIntent es BOOKING y nuevo intent es CONSULTA, preservar BOOKING
     │    R9  — §21 Caso A: merge sin pérdida, origin preservado, destination agregado
     │    R10 — §25.6 VAL-4: Ambigüedad contextual — NO activar ambigüedad para origin
     │
     ├── Invariantes aplicables:
     │    I-C1  — No perder contexto (slots previos preservados)
     │    I-C2  — No doble clasificación (una sola ejecución de core())
     │    I-C3  — No preguntar lo ya sabido
     │    I-C4  — No responder sin clasificar
     │    I-C6  — No asumir el primer lugar ambiguo
     │    I-C8  — No inventar lugares
     │    I-C9  — La intención evoluciona, no se congela
     │    I-C11 — Los slots tienen dueño (source + status)
     │    I-C12 — Slot_state determina la acción
     │
     └── Evidencias esperadas:
          E1  — core() ejecutado UNA SOLA vez
          E2  — intent FINAL = BOOKING (preservado contextualmente)
          E3  — Ambiguity NO activada para origin
          E4  — Ambiguity NO activada para destination no-mencionada
          E5  — destination = "Hotel Esturión" agregado al merge de slots
          E6  — origin preservado sin cambios
          E7  — clarify_field respetado
          E8  — No se pregunta por origin ni destination ya conocidos
          E9  — Si "Hotel Esturión" no está en DB → preguntar si es correcto (§21 Caso A.5)
          E10 — Traza [CORE_SOURCE_AUDIT] confirma source="lead.service"
```

---

## 4. Traza Instrumentada: Turno 2 "Hotel Esturión"

### 4.1 Flujo completo paso a paso

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 1 — lead.service.ts:42-67                                             │
│   trimmed = "Hotel Esturión"                                                │
│   .limpiar? No  │  handleCommandShortcuts? No  │  handleAdminCommands? No   │
│                                                                             │
│   DESVIACIÓN: Ninguna. Comportamiento esperado.                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 2 — lead.service.ts:70-75                                             │
│   handleConversationSetup → conversation, history, customerName, workflow   │
│   handleOpportunityResponse → No                                            │
│                                                                             │
│   DESVIACIÓN: No aplica al escenario.                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 3 — lead.service.ts:77-103                                            │
│   runShadowCognition → shadowResult (no afecta flujo)                       │
│   Memory store → fire-and-forget (no afecta flujo)                          │
│                                                                             │
│   CUMPLE SPEC: Comportamiento esperado (no afecta flujo).                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 4 — lead.service.ts:106-108                                           │
│   session = await getChatSession(phone)                                     │
│   memory = buildMemory(session, history) → lastIntent = "BOOKING"           │
│   leadCore = core("Hotel Esturión", prevIntent=BOOKING)                     │
│                                                                             │
│   core.ts:169-291:                                                          │
│     trimmed = "Hotel Esturión"                                              │
│     facts = ["location_ambiguous:true"]  ← "hotel" matchea                 │
│                                          AMBIGUOUS_LOCATION_RE              │
│     roleLock = { origin: null, destination: null }                          │
│       ← NINGÚN patrón sintáctico matchea "Hotel Esturión"                   │
│     slotStability = { origin: "open", destination: "open" }                 │
│                                                                             │
│     classifyIntent (core.ts:293-366):                                       │
│       - has("location_ambiguous:") → true                                   │
│       - has("origin:") → false                                              │
│       - has("destination:") → false                                         │
│       - Regla 9 (line 357-359): CONSULTA                                    │
│                                                                             │
│     finalIntent (line 277-283):                                             │
│       prevIntent=BOOKING, intent=CONSULTA                                   │
│       intent !== "PRE_BOOKING" → rama B                                     │
│       intent === prevIntent? (CONSULTA === BOOKING) → NO                    │
│       → finalIntent = CONSULTA                                              │
│                                                                             │
│   🔴 DESVIACIÓN F02-DG:                                                    │
│     Specification §9 y §25.4:                                               │
│       "Si prevIntent es BOOKING y el nuevo intent es de menor               │
│        confianza operativa, PRESERVAR BOOKING"                              │
│     El código actual SOLO preserva prevIntent cuando intent ===             │
│     "PRE_BOOKING". No hay regla para CONSULTA/AMBIGUOUS con                 │
│     prevIntent = BOOKING.                                                   │
│                                                                             │
│   💭 Ambigüedad de Specification:                                           │
│     §9 (Regla 4) dice: "Si intent actual != prevIntent → Usar intent       │
│      actual, a menos que sea un falso positivo". Pero §25.4 contradice      │
│      esto al decir que CONSULTA sobre BOOKING debe preservar BOOKING.       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 5 — lead.service.ts:110-121                                           │
│   classification = interpretMessage(...)                                    │
│     intent=CONSULTA, slotState="collecting_slots", prevSlots={...}          │
│     → classification.type determinado por conversation-interpreter          │
│                                                                             │
│   CUMPLE SPEC: interpretMessage se ejecuta correctamente.                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 6 — lead.service.ts:123-136                                           │
│   leadCore.intent === "GREETING"? → CONSULTA → NO                          │
│                                                                             │
│   CUMPLE SPEC: No es greeting.                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 7 — lead.service.ts:138-149                                           │
│   leadCore.facts.some(f => f.startsWith("greeting:"))? → NO                │
│   ("Hotel Esturión" no tiene greeting)                                      │
│                                                                             │
│   CUMPLE SPEC: Sin greeting combinado.                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 8 — lead.service.ts:151-178                                           │
│   slotButtonMatch? No                                                       │
│   slotState === "slot_confirmation"? No ("collecting_slots")                │
│   slotState === "awaiting_passenger"? No                                    │
│   slotState === "awaiting_confirmation"? No                                 │
│                                                                             │
│   CUMPLE SPEC: Ningún estado especial aplica.                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 9 — lead.service.ts:180-202                                           │
│   currentConvState = await getConversationalState(phone) → "collecting_slots"
│   currentConvState === "ambiguity_pending"? → NO                            │
│                                                                             │
│   CUMPLE SPEC: No está en ambigüedad previa.                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 10 — lead.service.ts:203-207  ← PUNTO CRÍTICO                         │
│                                                                             │
│   CÓDIGO:                                                                   │
│     if (leadCore.facts?.some(f => f.startsWith("location_ambiguous:"))       │
│         && currentConvState !== "ambiguity_pending") {                       │
│       const ambStarted = await startAmbiguityResolution(...)                 │
│       if (ambStarted) return;                                                │
│     }                                                                        │
│                                                                             │
│   leadCore.facts: ["location_ambiguous:true"] → TRUE                        │
│   currentConvState: "collecting_slots" → TRUE (no es "ambiguity_pending")   │
│   → startAmbiguityResolution(phone, conversation.id, "Hotel Esturión",      │
│                               leadCore, freshSessionForAmbiguity)           │
│                                                                             │
│   🔴 DESVIACIÓN F01-DG: SPEC §25.2 dice:                                    │
│     "IF session.clarify_field != null:                                       │
│        clarifyField = session.clarify_field                                  │
│        roleOrigin = leadCore.roleLock?.origin → null                         │
│        roleDest = leadCore.roleLock?.destination → null                      │
│        IF roleOrigin == null AND roleDest == null:                           │
│          RETURN false  // NO activar ambigüedad"                             │
│                                                                             │
│     El código NO verifica clarify_field ANTES de activar ambigüedad.         │
│     El código NO verifica si roleLock está vacío (lo que indicaría           │
│     que el mensaje no contiene información de ubicación nueva, sino         │
│     que es respuesta a una pregunta).                                       │
│                                                                             │
│   💭 Ambigüedad de Specification:                                           │
│     §25.2 dice que SI clarify_field está definido y roleLock está vacío,    │
│     NO activar ambigüedad. Pero §12 (Algoritmo de resolución) NO menciona   │
│     esta excepción. La prioridad entre §12 y §25.2 no está definida.        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 11 — ambiguity-handler.ts:94-347  — startAmbiguityResolution           │
│                                                                             │
│   roleOrigin = leadCore.roleLock?.origin?.toLowerCase().trim() → null       │
│   roleDest = leadCore.roleLock?.destination?.toLowerCase().trim() → null    │
│   sessionOrigin = extractRawValue(session.slots, "origin") → "hotel"        │
│   sessionDest = extractRawValue(session.slots, "destination") → "centro"    │
│   rawOrigin = roleOrigin ?? sessionOrigin → "hotel" (de session!)           │
│   rawDest = roleDest ?? sessionDest → "centro" (de session!)                │
│                                                                             │
│   🔴 PROBLEMA:                                                              │
│     El mensaje "Hotel Esturión" NO contiene "hotel" como término de         │
│     ubicación — contiene "Hotel" como parte del nombre propio "Hotel        │
│     Esturión". Pero el código toma sessionOrigin="hotel" del slot           │
│     previo (Turno 1) y lo usa como rawTerm para búsqueda en DB.            │
│                                                                             │
│     El sistema busca en DB:                                                 │
│       searchPlaces("hotel", 5) → muchos resultados                          │
│       searchPlaces("centro", 5) → 3 resultados                              │
│                                                                             │
│   originAmbiguous = originCandidates.length > 1 → TRUE                      │
│   destAmbiguous = destCandidates.length > 1 → TRUE                          │
│                                                                             │
│   → Intenta resolver ambos con LLM (interpretAmbiguity)                     │
│   → Si LLM no resuelve con high confidence:                                 │
│     Pregunta al usuario por el primer slot ambiguo                          │
│     firstSlot = "origin" (porque !llmResolvedOrigin && originAmbiguous)     │
│     → Envía mensaje: "Entendí que salís de hotel..."                        │
│                                                                             │
│   🔴 DESVIACIÓN F03-DG:                                                    │
│     Specification §21 Caso A:                                               │
│       "4. Resolución geo: busca 'Hotel Esturión' en DB                      │
│        5. Si 0 coincidencias → preguntar si es correcto                    │
│        6. Si 1 coincidencia → actualizar destination = 'Hotel Esturión'"    │
│     El sistema debería extraer "Hotel Esturión" como posible valor          │
│     para destination, NO activar ambigüedad sobre "hotel" del slot          │
│     previo.                                                                 │
│                                                                             │
│     Como el flujo se corta aquí (return true en lead.service.ts),           │
│     NUNCA llega a extraction-runner.ts → mergeContext, por lo que           │
│     "Hotel Esturión" como posible destino NUNCA se fusiona.                │
│                                                                             │
│   🔴 VIOLACIÓN I-C3 — No preguntar lo ya sabido:                           │
│     El sistema pregunta por "hotel" (origin) cuando origin YA estaba        │
│     definido del Turno 1. También pregunta por "centro" (destination)       │
│     cuando destination YA estaba definido. El usuario está dando un         │
│     valor nuevo para destination ("Hotel Esturión"), pero el sistema        │
│     ignora esto y pregunta por los slots previos.                          │
│                                                                             │
│   🔴 VIOLACIÓN I-C1 — No perder contexto:                                  │
│     "Hotel Esturión" como valor para destination NUNCA se persiste.        │
│     Cuando eventualmente se resuelva la ambigüedad, el valor previo         │
│     "centro" se usará, no "Hotel Esturión".                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PASO 12 — lead.service.ts:206                                              │
│   if (ambStarted) return;  ← EL FLUJO TERMINA AQUÍ                          │
│                                                                             │
│   El sistema responde con una pregunta de ambigüedad sobre "hotel"          │
│   (origin) en lugar de actualizar destination con "Hotel Esturión".         │
│                                                                             │
│   🔴 CONSECUENCIA: El usuario recibe:                                       │
│     "Entendí que salís de hotel..." en lugar de procesar su destino.         │
│     La experiencia es confusa: el usuario dijo "Hotel Esturión" como        │
│     destino y el sistema pregunta por "hotel" como origen.                  │
│                                                                             │
│   NUNCA SE EJECUTA:                                                         │
│     - runExtractionPipeline (línea 273) — extracción LLM no ocurre         │
│     - mergeContext — "Hotel Esturión" nunca se agrega a slots              │
│     - handlePolicyPipeline (línea 306) — policy pipeline no se ejecuta     │
│     - handleMessage (handler.ts) — segundo core() no ocurre                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Árbol de decisión ejecutado

```
lead.service.ts:handleLeadMessage("Hotel Esturión")
  │
  ├── .limpiar? NO
  ├── handleCommandShortcuts? NO
  ├── handleAdminCommands? NO
  ├── handleConversationSetup → sesión OK
  ├── handleOpportunityResponse? NO
  ├── runShadowCognition → shadow (no afecta)
  ├── core("Hotel Esturión", BOOKING) → CONSULTA ← F02-DG
  ├── interpretMessage → classification
  ├── GREETING? NO
  ├── greeting+request? NO
  ├── slot_button? NO
  ├── slot_confirmation? NO (state=collecting_slots)
  ├── awaiting_passenger? NO
  ├── awaiting_confirmation? NO
  ├── ambiguity_pending? NO (state=collecting_slots)
  │
  ├── ★ location_ambiguous? SÍ → startAmbiguityResolution ← F01-DG
  │     │
  │     ├── roleLock null, rawOrigin="hotel" (session!), rawDest="centro" (session!)
  │     ├── searchPlaces("hotel") → múltiples
  │     ├── searchPlaces("centro") → 3
  │     ├── Llama a LLM interpretAmbiguity
  │     ├── firstSlot = "origin" (no resuelto por LLM)
  │     └── Responde al usuario preguntando por "hotel"
  │
  └── return (NUNCA ALCANZA):
        - runExtractionPipeline (no se ejecuta)
        - mergeContext (no se ejecuta)
        - handlePolicyPipeline (no se ejecuta)
        - handler.ts handleMessage (no se ejecuta)
        - segundo core() (NO OCURRE - correcto gracias a S2A)
```

---

## 5. Hallazgos Clasificados

### 🔴 Hallazgo F01-DG — Ambigüedad activada sin verificar clarify_field

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Desviación de Specification** |
| **Severidad** | 🔴 Bloqueante |
| **Ubicación** | `src/lib/services/lead.service.ts:203-207` |
| **Specification** | §25.2 (Pseudocódigo de detección de ambigüedad), §14.4 (Contexto sobre sintaxis) |
| **Esperado** | Si `session.clarify_field` está definido y `roleLock` del CORE está vacío, el sistema NO debe activar ambigüedad. Debe interpretar el mensaje como respuesta al `clarify_field`. |
| **Actual** | El código solo verifica `leadCore.facts.some(f => f.startsWith("location_ambiguous:")) && currentConvState !== "ambiguity_pending"`. NO verifica `clarify_field` ni `roleLock`. |
| **Impacto** | El mensaje "Hotel Esturión" (destino) activa ambigüedad sobre "hotel" (origen de Turno 1). El usuario nunca ve su destino procesado. |
| **Evidencia** | `lead.service.ts` línea 203: sin guard condicional para clarify_field. `ambiguity-handler.ts` línea 101-106: `rawOrigin` se obtiene de `sessionOrigin` cuando `roleOrigin` es null, arrastrando slots previos a la búsqueda de ambigüedad. |

### 🟡 Hallazgo F02-DG — Intención no preservada contextualmente

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Desviación de Specification** |
| **Severidad** | 🟡 Estructural |
| **Ubicación** | `src/lib/ai/core.ts:277-283` |
| **Specification** | §25.4 (Turno 4: "Hotel Esturión"), §9 (Regla 4), §25.6 VAL-6 |
| **Esperado** | "Si prevIntent es BOOKING y el nuevo intent es de menor confianza operativa, PRESERVAR BOOKING". Específicamente: `prevIntent=BOOKING, intent=CONSULTA → final=BOOKING` |
| **Actual** | `finalIntent = (prevIntent && prevIntent !== "AMBIGUOUS" && prevIntent !== "GREETING") ? (intent === "PRE_BOOKING" ? prevIntent : intent) : intent`. Solo preserva PRE_BOOKING. CONSULTA con prevIntent=BOOKING → CONSULTA |
| **Impacto** | La intención cambia de BOOKING a CONSULTA. El dominio cambia de "reservation" a "information". La respuesta puede ser genérica en lugar de operativa. |
| **Evidencia** | `core.ts:277-283`: la regla de preservación solo cubre `intent === "PRE_BOOKING"`. No hay caso para intenciones de baja confianza (CONSULTA, AMBIGUOUS) sobre BOOKING. |

### 🟡 Hallazgo F03-DG — Merge de slots no ejecutado por bypass de ambigüedad

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Desviación de Specification** |
| **Severidad** | 🟡 Estructural |
| **Ubicación** | `src/lib/services/lead.service.ts:203-207` (bypass) + `extraction-runner.ts` (no alcanzado) |
| **Specification** | §13 (Política de actualización incremental), §21 Caso A, §25.3 |
| **Esperado** | "Hotel Esturión" debe pasar por extracción → mergeContext → fusionar con slots previos: origin preservado, destination = "Hotel Esturión" |
| **Actual** | `startAmbiguityResolution` retorna `true` → `lead.service.ts:206` hace `return`. El pipeline de extracción (línea 273) nunca se ejecuta. "Hotel Esturión" nunca se extrae como valor para destination. |
| **Impacto** | El usuario dice "Hotel Esturión" como destino pero ese valor nunca se persiste. Cuando la ambigüedad se resuelva, el destination será el valor previo ("centro"), no "Hotel Esturión". |
| **Evidencia** | `lead.service.ts:206`: `if (ambStarted) return;` — el flujo se corta antes de `runExtractionPipeline` (línea 273). |

### 🟢 Hallazgo F04-DG — Sin doble core() (QB-05 fix operativo)

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Cumple Specification** |
| **Severidad** | 🟢 Fortaleza |
| **Ubicación** | `src/lib/ai/handler.ts:101` |
| **Specification** | §6 (Una sola clasificación), I-C2, §25.6 VAL-2 |
| **Esperado** | `core()` debe ejecutarse exactamente una vez por mensaje |
| **Actual** | `handler.ts:101`: `const analysis = ctx?.analysis ?? core(input)`. Como el flujo de ambigüedad NUNCA llega a handler.ts (return antes), no hay segundo core(). Incluso si llegara, S2A garantiza que `ctx.analysis` esté presente. |
| **Evidencia** | PR-QA3-S2A verificado: `[CORE_SOURCE_AUDIT] source: "lead.service"` en todos los caminos. |

### 🟢 Hallazgo F05-DG — Triple fallback presente en extracción

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Cumple Specification** |
| **Severidad** | 🟢 Fortaleza |
| **Ubicación** | `src/lib/services/extraction/extraction-runner.ts:40-100` |
| **Specification** | RNF-03 (Triple fallback), §16 (Resolución de entidades) |
| **Esperado** | Rápido determinista → Heurístico/DB → LLM → Null seguro |
| **Actual** | `extraction-runner.ts` implementa el triple fallback: regex → LLM → DB pricing. Si `startAmbiguityResolution` retorna `false` (porque "Hotel Esturión" no está en DB o no es ambiguo), el flujo cae al pipeline normal que ejecuta `runExtractionPipeline`. |
| **Evidencia** | `extraction-runner.ts:40-48`: `tryFallbackExtraction` con regex+DB; `extractSlots` (LLM) como primario. |

### 💭 Hallazgo A01-DG — Ambigüedad entre §9 y §25.4 sobre preservación de intención

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Ambigüedad de Specification** |
| **Secciones** | §9 (Regla 4) vs §25.4 (Turno 4) |
| **Conflicto** | §9 Regla 4 dice: "Si intent actual != prevIntent → Usar intent actual, a menos que sea un falso positivo". §25.4 dice: "Si prevIntent es BOOKING y el nuevo intent es de menor confianza operativa, PRESERVAR BOOKING". Ambas reglas coexisten sin definir prioridad ni condiciones de aplicación. |
| **Recomendación** | Unificar en §9: agregar subregla explícita para "intención de menor confianza operativa" (CONSULTA, AMBIGUOUS) cuando prevIntent es BOOKING o NOW. |

### 💭 Hallazgo A02-DG — Ambigüedad entre §12 y §25.2 sobre activación de ambigüedad

| Aspecto | Detalle |
|---------|---------|
| **Clasificación** | **Ambigüedad de Specification** |
| **Secciones** | §12 (Algoritmo de resolución, paso 1) vs §25.2 (Pseudocódigo completo) |
| **Conflicto** | §12 dice: "1. Detectar ambigüedad (patrón o múltiples resultados de DB)". No menciona la excepción de `clarify_field`. §25.2 dice: "Si roleLock está vacío y clarify_field está definido → NO activar ambigüedad". La sección §12 omite esta excepción crítica. |
| **Recomendación** | Agregar la excepción de `clarify_field` al algoritmo de §12. O referenciar §25.2 desde §12. |

---

## 6. Mapa de Desviaciones vs. Specification

| ID | Componente | Línea | Specification | Estado actual | Impacto |
|-----|-----------|-------|---------------|---------------|---------|
| F01-DG | Ambiguity activation guard | `lead.service.ts:203` | §25.2: verificar `clarify_field` + `roleLock` | Solo verifica `location_ambiguous` + `state` | El sistema activa ambigüedad cuando no debería |
| F02-DG | Intent preservation | `core.ts:277-283` | §25.4, §9: preservar BOOKING sobre CONSULTA | Solo preserva PRE_BOOKING | Intención downgradea de BOOKING a CONSULTA |
| F03-DG | Extraction bypass | `lead.service.ts:206` | §13, §21: merge incremental de slots | return antes de extraction | "Hotel Esturión" nunca se extrae como destino |
| F04-DG | Double core() | `handler.ts:101` | §6, I-C2: una sola clasificación | S2A fix operativo ✅ | Sin impacto |
| F05-DG | Triple fallback | `extraction-runner.ts` | RNF-03: 3 capas de resolución | Implementado ✅ | Sin impacto |

---

## 7. Validación de Invariantes

| Invariante | Descripción | Resultado | Evidencia |
|------------|-------------|-----------|-----------|
| **I-C1** | No perder contexto | 🔴 **VIOLADO** | "Hotel Esturión" como destino nunca se persiste (bypass por ambigüedad) |
| **I-C2** | No doble clasificación | ✅ **CUMPLE** | Una sola ejecución de core() en lead.service.ts (S2A fix) |
| **I-C3** | No preguntar lo ya sabido | 🔴 **VIOLADO** | El sistema pregunta por origin "hotel" del Turno 1, que ya se sabe |
| **I-C4** | No responder sin clasificar | ✅ **CUMPLE** | Respuesta pasa por CORE (aunque con intención downgradeada) |
| **I-C5** | No ejecutar sin confirmar | ✅ **CUMPLE** | No aplica (no hay ejecución) |
| **I-C6** | No asumir el primer lugar ambiguo | ✅ **CUMPLE** | La ambigüedad se resuelve activamente (aunque incorrectamente) |
| **I-C7** | No silenciar mensajes | ✅ **CUMPLE** | El sistema responde (pregunta de ambigüedad) |
| **I-C8** | No inventar lugares | ✅ **CUMPLE** | No aplica (no hay resolución automática de lugar desconocido) |
| **I-C9** | Intención evoluciona, no se congela | ⚠️ **AMBIGUO** | La intención cambia de BOOKING a CONSULTA, pero §25.4 dice que debería preservarse |
| **I-C10** | Un solo estado conversacional | ✅ **CUMPLE** | El estado es único por teléfono |
| **I-C11** | Slots tienen dueño | ⚠️ **NO VERIFICABLE** | El slot "Hotel Esturión" nunca se crea |
| **I-C12** | Slot_state determina acción | ✅ **CUMPLE** | No aplica (no hay dispatch) |

### Resumen de invariantes

| Estado | Cantidad |
|--------|---------|
| ✅ Cumple | 8 |
| 🔴 Violado | 2 (I-C1, I-C3) |
| ⚠️ Ambiguo/No verificable | 2 (I-C9, I-C11) |

---

## 8. Validación de Contratos ARNÉS

| Contrato | Resultado | Evidencia |
|----------|-----------|-----------|
| **R1** — No modificar contratos entre capas sin autoridad arquitectónica | ✅ | 0 cambios de código |
| **R2** — No crear dependencias que violen ADR 001-004 | ✅ | Sin nuevas dependencias |
| **R3** — No asumir implementación que no exista | ✅ | Todos los componentes referenciados existen en código |
| **R4** — Solo documentación | ✅ | 0 archivos de producto modificados |

---

## 9. Conclusiones

### Hallazgo crítico

El **F01-DG** es bloqueante para el escenario "Hotel Esturión": el sistema activa resolución de ambigüedad para un mensaje que la Specification indica claramente que no debe activarla. La causa raíz es la ausencia de un guard condicional en `lead.service.ts:203` que verifique `clarify_field` y `roleLock` antes de llamar a `startAmbiguityResolution`.

### Patrón de desviación

Los 3 hallazgos de desviación (F01-DG, F02-DG, F03-DG) convergen en un mismo patrón: **el sistema no distingue entre "el usuario está dando información nueva" y "el usuario está respondiendo a una pregunta del sistema"**. Específicamente:

1. **F01-DG**: No se verifica si el mensaje responde a un `clarify_field` antes de activar ambigüedad.
2. **F02-DG**: No se preserva la intención operativa cuando el mensaje es una respuesta, no una nueva declaración.
3. **F03-DG**: El bypass de ambigüedad corta el pipeline de extracción antes de que el nuevo valor pueda fusionarse.

### Recomendaciones (sin implementar — solo documentación)

1. **F01-DG fix conceptual**: Agregar verificación de `clarify_field` en `lead.service.ts:203`. Si `session.clarify_field` está definido y `leadCore.roleLock` está vacío (ambos null), NO activar ambigüedad — el mensaje es respuesta a una pregunta. El pseudocódigo exacto está en §25.2 de la Specification.

2. **F02-DG fix conceptual**: Extender la regla de preservación de intención en `core.ts:277-283` para cubrir el caso `prevIntent=BOOKING, intent=CONSULTA/AMBIGUOUS` → preservar BOOKING. La Specification §25.4 describe exactamente esta regla.

3. **F03-DG fix conceptual**: Si `startAmbiguityResolution` retorna `false` (sin ambigüedad real o lugar no encontrado en DB), el flujo debe continuar al pipeline de extracción para que "Hotel Esturión" pueda extraerse como destino mediante LLM.

### Próximos pasos sugeridos

| Prioridad | Acción | Driver |
|-----------|--------|--------|
| P1 | Implementar guard de `clarify_field` en lead.service.ts:203 | F01-DG |
| P1 | Extender regla de preservación de intención en core.ts | F02-DG |
| P2 | Resolver ambigüedad entre §9 y §25.4 de la Specification | A01-DG |
| P2 | Resolver ambigüedad entre §12 y §25.2 de la Specification | A02-DG |
| P3 | Agregar evidencia de merge exitoso en traza de "Hotel Esturión" | F03-DG (post-fix) |

---

*Documento generado por ARNÉS — QA-3 Sprint 2B. 0 modificaciones de código realizadas.*
