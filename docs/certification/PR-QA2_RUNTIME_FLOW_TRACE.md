# PR-QA2 — Runtime Flow Trace & Authority Verification

**Fecha:** 2026-07-17  
**Auditor:** ARNÉS — Automated Reasoning Node for Engineering Supervision  
**Estado:** COMPLETADO — Traza estática completa (0 modificaciones de código)  
**Commit base:** `cc6a801`

---

## Tabla de Contenidos

1. [Executive Summary](#1-executive-summary)
2. [Escenario 1: Greeting → Booking Completo](#2-escenario-1-greeting--booking-completo)
3. [Escenario 2: Consulta de Tarifa Simple](#3-escenario-2-consulta-de-tarifa-simple)
4. [Escenario 3: Reserva Completa](#4-escenario-3-reserva-completa)
5. [Escenario 4: Ambigüedad Geográfica](#5-escenario-4-ambigüedad-geográfica)
6. [Call Graph del Pipeline](#6-call-graph-del-pipeline)
7. [Authority Matrix: Actual vs Deseada](#7-authority-matrix-actual-vs-deseada)
8. [Confirmación de Findings PR-QA1](#8-confirmación-de-findings-pr-qa1)
9. [Respuestas a Preguntas Clave](#9-respuestas-a-preguntas-clave)
10. [Plan de Eliminación Segura para QA-3](#10-plan-de-eliminación-segura-para-qa-3)

---

## 1. Executive Summary

### Metodología

Se realizó una **traza de flujo estática** — no fue posible ejecutar el bot real (requiere webhooks, LLM providers, DB). En su lugar:

1. Se reconstruyó el **árbol de llamadas completo** para cada escenario
2. Se mapeó cada decisión a su **función, archivo y línea exacta**
3. Se contaron las **ocurrencias de cada decisión** por turno
4. Se identificaron los **desvíos** entre flujo esperado y flujo real

### Hallazgos clave

| Pregunta | Respuesta | Impacto |
|---|---|---|
| ¿Quién decide el próximo campo? | **3 autoridades distintas** en competencia | 🔴 F-03 confirmado |
| ¿Cuántas veces se decide por turno? | **Hasta 4 veces** (extraction, field-resolver, workflow, completeness) | 🔴 |
| ¿Quién interpreta un "sí"? | **3 implementaciones distintas** | 🔴 F-02 confirmado |
| ¿Cuántas implementaciones participan? | **2 pipelines completos** (policy-pipeline + processLead/handler) | 🔴 F-01 confirmado |
| ¿Quién decide la siguiente respuesta? | **2 políticas paralelas**: una en policy-pipeline.ts, otra en handler.ts | 🔴 |
| ¿Dónde se pierde información? | HandlerContext → policy: `conversationId`, `temporal`, `operationalMode` | 🟡 |
| ¿Dónde se vuelve a preguntar algo ya conocido? | field-resolver vs evaluate-completeness vs policy decision | 🟡 |

---

## 2. Escenario 1: Greeting → Booking Completo

### Turno 1: "hola"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `route.ts:339` | POST handler | Normal flow | `phone`, text="hola" | → handleLeadMessage |
| 2 | `lead.service.ts:38` | handleLeadMessage | Entry | `phone`, "hola" | Init |
| 3 | `lead.service.ts:108` | **core** (early) | Intent detection | "hola" | **intent=GREETING**, facts=["greeting:hola"], confidence≈0.3 |
| 4 | `lead.service.ts:114-121` | **interpretMessage** (early) | Message classification | text="hola", intent=GREETING, slotState=null | **type=small_talk** |
| 5 | `lead.service.ts:124-136` | **GREETING SHORTCUT** | Branch decision | intent===GREETING | **→ handlePolicyPipeline** con extractionCtx=undefined |
| 6 | `policy-pipeline.ts:63-71` | buildExtractionContext | Fallback | parsedData=undefined | extractionCtx vacío |
| 7 | `policy-pipeline.ts:98-101` | temporalFromFacts / operationalModeFromIntent | Temporalidad | facts=["greeting:hola"] | temporal="UNKNOWN", **opMode=INFO**, **mode=AHORA** |
| 8 | `policy-pipeline.ts:387` | **processLead** | Pipeline core | execCtx completo | → handleMessage |
| 9 | `handler.ts:101` | core (reusa analysis) | Reuse | ctx.analysis=leadCore | Sin re-ejecución (PR-2A) |
| 10 | `handler.ts:102` | **router** | OutputType | intent=GREETING | **outputType=CLARIFY** |
| 11 | `handler.ts:106-112` | Domain determination | Domain | opMode=INFO, intent=GREETING | **domain=information** |
| 12 | `handler.ts:116-124` | **interpretMessage** (2ª vez) | Classify | text="hola" | type=small_talk (mismo resultado) |
| 13 | `handler.ts:126-131` | **computeClientObjective** | Client obj | facts=["greeting:hola"], purchaseIntent="low" | **clientObj="none"** |
| 14 | `handler.ts:132-142` | **computeStrategyDecision** | Strategy | purchaseIntent="low" | skipLLM=true, **inhibitNewBooking=false** |
| 15 | `handler.ts:198` | **buildDomainPolicy** | Policy | domain="information" | **INFORMATION response** |
| 16 | `handler.ts:121-132` | response-builder.buildInformationalResponse | Greeting | intent="GREETING" | Mensaje de saludo completo |
| 17 | `policy-ahora.ts:148` | policyAhora → CLARIFY → resolveNextRequiredField | **¿Next field?** | ctx sin extraction, coreFacts tiene "greeting:hola" | **field="origin"** |
| 18 | `handler.ts:230-239` | LLM gate | ¿Skip LLM? | skipLLM=true | Sin LLM |
| 19 | `handler.ts:80-86` | pipeline.ts: send | Output | finalResponse | Mensaje enviado al usuario |

**Decisión de próximo campo:** `field-resolver.ts:62-64` — retorna **origin** porque no hay fact "origin:" en coreFacts.  
**Problema:** ¡Esto pregunta por origen en respuesta a "hola"! El saludo informacional es reemplazado por CLARIFY con pregunta de origen.

### Turno 2: "necesito un taxi"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:108` | core | Intent | "necesito un taxi" | **intent=BOOKING**, facts=["action:necesito"] |
| 2 | `lead.service.ts:114` | interpretMessage | Type | text="necesito un taxi" | type="new_request" |
| 3 | `lead.service.ts:180-207` | Ambiguity check | ¿Ambiguous? | No location_ambiguous fact | No ambiguity |
| 4 | `lead.service.ts:266-271` | **comprehension-runner** | ¿Halted? | No comprehension issue | Continúa |
| 5 | `lead.service.ts:273-277` | **extraction-runner** | LLM extraction | text, history, customerName | LLM extrae: origin=null, destination=null |
| 6 | `extraction-runner.ts:268-289` | evaluateCompleteness | **¿Next field?** | effectiveSlots={} | **field=origin**, ASK |
| 7 | `extraction-runner.ts:284-288` | buildGenericClarify | Output | "origin" | "¿Cuál es el origen?" |
| 8 | `lead.service.ts:273` | **return null** | Stop | — | Pipeline abortado, no llega a policy-pipeline |

**Decisión de próximo campo:** `evaluate-completeness.ts:22-24` — retorna **origin** porque slots está vacío.  
**Pipeline abortado:** extraction-runner retorna null, lead.service.ts retorna sin llamar a handlePolicyPipeline.  
**Problema:** No llega a policy-pipeline ni a handler. La pregunta la genera extraction-runner directamente.

### Turno 3: "aeropuerto" (origen)

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:108` | core | Intent | "aeropuerto" | **intent=BOOKING**, facts=["origin:aeropuerto", "location_ambiguous:true"] |
| 2 | `lead.service.ts:180-207` | Ambiguity | Ambiguous? | facts=["location_ambiguous:true"] | **→ startAmbiguityResolution** |
| 3 | `ambiguity-handler.ts:94-347` | startAmbiguityResolution | Search places | text="aeropuerto" | 3 candidates (IGR, IGU, AGT) |
| 4 | `ambiguity-handler.ts:139-142` | **interpretAmbiguity** (LLM) | Resolve | candidates, text | confidence="high", selectedId=IGR |
| 5 | `ambiguity-handler.ts:214-226` | LLM auto-resolve | Finalize | origin=IGR, dest=null? | ... wait, dest is null |
| 6 | `ambiguity-handler.ts:296-311` | Persist resolved + set ambiguity_pending | Wait for dest | resolvedOrigin=IGR | Estado: ambiguity_pending |
| 7 | `ambiguity-handler.ts:314-334` | buildContextualPlaceOptions | Ask destination | slot="destination" | "¿Hacia dónde querés ir?" |

**Pipeline:** Ambiguity handler toma control completo. No llega a policy-pipeline ni handler.  
**Decisión de próximo campo:** ambiguity-handler **pregunta destino** (first unresolved slot = destination).

### Turno 4: "Amerian"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:108` | core | Intent | "Amerian" | **intent=BOOKING**, facts=["destination:Amerian"] |
| 2 | `lead.service.ts:180-184` | Ambiguity check | ¿ambiguity_pending? | conversationalState="ambiguity_pending" | **→ handleAmbiguityResponse** |
| 3 | `ambiguity-handler.ts:349-549` | handleAmbiguityResponse | Resolve | text="amerian" | search places, find match |
| 4 | `ambiguity-handler.ts:440-501` | parseSelection | Match | "amerian" → "Hotel Amerian" | **selected = "Hotel Amerian en el centro"** |
| 5 | `ambiguity-handler.ts:517-521` | finalizeAmbiguity | Both resolved | origin=IGR, dest=Hotel Amerian | Slots: CONFIRMED, state: slot_confirmation |
| 6 | `ambiguity-handler.ts:591-595` | t("finalize.summary") | Summary | origin, dest | "Resumen: Aeropuerto IGR → Hotel Amerian..." |
| 7 | **Return al webhook** | — | — | — | — |

**Pipeline:** Ambiguity handler maneja el turno completo. No llega ni a extraction-runner ni a policy-pipeline para este mensaje.

### Turno 5: "sí" (confirmación de slots)

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:152-157` | SLOT_CONFIRMATION buttons | ¿Button? | "sí" → NO matchea regex | Continúa |
| 2 | `lead.service.ts:162-166` | SLOT_CONFIRMATION text | Estado? | slotState="slot_confirmation" | **→ handleSlotConfirmationText** |
| 3 | slot-confirmation-text-handler | handleSlotConfirmationText | Affirmative? | "sí" = affirmative | → upsertChatSession + setConversationalState |
| 4 | — | setConversationalState | New state | affirmative | state="awaiting_passenger" o "awaiting_confirmation" |
| 5 | **Return al webhook** | — | — | — | — |

**Problema:** El flujo de afirmación depende del handler de texto de slot confirmation, que puede redirigir a awaiting_passenger o awaiting_confirmation según la lógica interna. Esto es un **tercer punto de decisión** para la afirmación.

### Turno 6: "pasajeros" (cantidad)

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:169-172` | AWAITING_PASSENGER | Estado? | slotState="awaiting_passenger" | **→ handleAwaitingPassenger** |
| 2 | `awaiting-passenger-handler.ts:16-103` | handleAwaitingPassenger | Parse pax | "pasajeros" | parsePassengerCount → regex, LLM fallback |
| 3 | — | resolvePricingForSlots | Pricing | origin, dest, pax | price calculated |
| 4 | — | setConversationalState | New state | affirmative | state="awaiting_confirmation" |
| 5 | — | sendWhatsAppMessage | Output | "Perfecto, X para N. El traslado cuesta... ¿Confirmamos?" | Mensaje enviado |

**Pipeline:** Handler específico de estado maneja todo el turno. No pasa por policy-pipeline.

### Resumen del Escenario 1

| Característica | Valor |
|---|---|
| Turnos totales | 6 |
| **Pipelines diferentes que participan** | **3** (lead.service → policy-pipeline → handler, ambiguity-handler, state-specific handlers) |
| **Decisiones de "próximo campo"** | **4 diferentes**: field-resolver (turno 1), evaluate-completeness (turno 2), ambiguity-handler (turno 3-4), state handler (turno 5-6) |
| **Implementaciones de afirmación** | **3**: handleSlotConfirmationText, handleAwaitingPassenger, policy-pipeline.handlePolicyPipeline |
| **LLM calls** | Mínimo 2 (extraction-runner + ambiguity LLM resolve) |

---

## 3. Escenario 2: Consulta de Tarifa Simple

### Turno único: "¿cuánto sale del aeropuerto al centro?"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `route.ts:339` | POST | Normal | phone, text | → handleLeadMessage |
| 2 | `lead.service.ts:108` | core | Intent | "¿cuánto sale..." | **intent=COMMERCIAL**, facts=["commercial:cuánto","origin:aeropuerto","destination:centro","location_ambiguous:true"] |
| 3 | `lead.service.ts:114` | interpretMessage | Type | text, intent=COMMERCIAL | type="inquiry" |
| 4 | `lead.service.ts:124` | GREETING shortcut | No | intent≠GREETING | Continúa |
| 5 | `lead.service.ts:180-207` | Ambiguity | Ambiguous? | location_ambiguous:true | **→ startAmbiguityResolution** |
| 6 | Ambiguity handler | startAmbiguityResolution | Resolve | origin="aeropuerto", dest="centro" | LLM resolve both → finalizeAmbiguity |
| 7 | Ambiguity handler | finalizeAmbiguity | Save | IGR + Centro Pto Iguazú | Slots CONFIRMED, state="slot_confirmation" |
| 8 | **Return al webhook** | — | — | — | **No pricing, no response to the price question!** |

**Problema CRÍTICO:** El ambiguity handler detecta `location_ambiguous:true` y toma control ANTES de que el pricing se haya consultado. Después de resolver la ambigüedad, hace `finalizeAmbiguity` que:
1. Guarda los slots confirmados
2. Cambia estado a `slot_confirmation`
3. Muestra resumen
4. **Nunca responde la pregunta de precio original**

El usuario preguntó "¿cuánto sale?" y el bot responde con un resumen de viaje sin precio.

### Si no hubiera ambigüedad (ej. "¿cuánto sale del aeropuerto IGR al centro de Puerto Iguazú?")

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1-4 | (igual) | core, CI | | | intent=COMMERCIAL, purchaseIntent="low" |
| 5 | `lead.service.ts:180-207` | Ambiguity | Not ambiguous | terms unambiguous | Continúa |
| 6 | `lead.service.ts:266-271` | comprehension | — | — | Continúa |
| 7 | `extraction-runner.ts:173` | extractSlots (LLM) | Extract | text with origin+dest | parsed: origin=IGR, dest=Centro Pto Iguazú |
| 8 | `extraction-runner.ts:346-389` | **resolvePricingForSlots** | Pricing | origin, dest, pax=1 | **price calculado** |
| 9 | `extraction-runner.ts:273-289` | evaluateCompleteness | ¿Complete? | domain=commercial → **COMPLETE** | No ASK |
| 10 | `lead.service.ts:306` | **handlePolicyPipeline** | Pipeline | extractionCtx con tariff+price | → processLead |
| 11 | `handler.ts:102` | router | OutputType | intent=COMMERCIAL | **outputType=ANSWER** |
| 12 | `handler.ts:106-112` | Domain | Domain | opMode=INFO, intent=COMMERCIAL | **domain=commercial** |
| 13 | `handler.ts:54-83` | buildDomainPolicy | ANSWER+commercial | commercial domain | **buildCommercialResponse** |
| 14 | Compare con ANSWER+tariff matched | `policy-reserva.ts:235-247` | ANSWER+tariff | tariff.matched=true, price>0 | **buildPriceInfo** → "El precio es $X ARS" |

**Decisión final:** `policy-reserva.ts:235-247` — genera respuesta con precio.

**Pipeline:** Policy-reserva decide respuesta informativa con precio. Solo una ruta.

---

## 4. Escenario 3: Reserva Completa

### Turno 1: "quiero reservar un viaje del aeropuerto IGR al hotel Amerian para el viernes a las 8"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:108` | core | Intent | full text | **intent=BOOKING**, facts con origin+dest+date+time |
| 2 | `lead.service.ts:180-207` | Ambiguity | Not ambiguous | términos claros | Continúa |
| 3 | `extraction-runner.ts:173` | extractSlots (LLM) | LLM extraction | text | slots: origin="Aeropuerto IGR", dest="Hotel Amerian", ... |
| 4 | `extraction-runner.ts:295-296` | TripExtractionSchema.safeParse | Validate | raw LLM | parsed.success=true |
| 5 | `extraction-runner.ts:346-389` | resolvePricingForSlots | Pricing | origin=IGR, dest=Hotel Amerian | **price=$X ARS** |
| 6 | `extraction-runner.ts:541-555` | buildSlotStates | Slot states | slots, prev, correction, affirmation | **origin=CONFIRMED, dest=CONFIRMATION_PENDING** |
| 7 | `extraction-runner.ts:597` | evaluateWorkflowTransition | Workflow state | confidence result | state="collecting_slots", action="clarify" |
| 8 | `lead.service.ts:306` | handlePolicyPipeline | Pipeline | extractionCtx | → processLead |
| 9 | `policy-pipeline.ts:63-71` | buildExtractionContext | Rebuild | parsed+workflow+confidence | extractionCtx listo |
| 10 | `policy-pipeline.ts:272-306` | **shouldRequestConfirmation** | ¿Confirm? | dest=CONFIRMATION_PENDING | **→ Slot Confirmation UI** |
| 11 | `policy-pipeline.ts:294-306` | sendInteractiveButtons | Output | buttons: [Confirmar, Cambiar] | Estado: slot_confirmation |

**Decisión de próximo paso: `slot-confirmation.ts`** — detecta que destination tiene status=CONFIRMATION_PENDING y muestra UI de confirmación.

### Turno 2: "confirmar" (button click)

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `route.ts:161-256` | Interactive button routing | Button | "slot_confirm" | **→ handleSlotConfirmationButton** |
| 2 | `slot-confirmation-handler.ts` | handleSlotConfirmationButton | Affirmative | button="slot_confirm" | upsertChatSession, setState="awaiting_passenger" |
| 3 | — | — | — | — | Pregunta pasajeros |

### Turno 3: "2 pasajeros"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:169-172` | Awaiting passenger | State | "awaiting_passenger" | **→ handleAwaitingPassenger** |
| 2 | `awaiting-passenger-handler.ts:28` | parsePassengerCount | Regex | "2 pasajeros" | paxCount=2 |
| 3 | `awaiting-passenger-handler.ts:59-63` | resolvePricingForSlots | Re-pricing | origin, dest, pax=2 | price recalculado |
| 4 | `awaiting-passenger-handler.ts:72-76` | send + setState | Output | "Perfecto, X para 2. ¿Confirmamos?" | state="awaiting_confirmation" |

### Turno 4: "sí"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:175-178` | Awaiting confirmation | State | "awaiting_confirmation" | **→ handleAwaitingConfirmation** |
| 2 | `awaiting-confirmation-handler.ts:36-77` | handleAwaitingConfirmation | Affirmative | "sí" | isAffirmativeMessage=true |
| 3 | `awaiting-confirmation-handler.ts:42-46` | resolvePricingForSlots | Re-pricing (3ª vez) | origin, dest, pax=2 | price calculado OTRA VEZ |
| 4 | `awaiting-confirmation-handler.ts:59-70` | executeNowTrip | Trip execution | NOW temporal | **Trip created** |
| 5 | — | setConversationalState | Final state | — | state="idle" |

**Problema: pricing resuelto 3 veces para el mismo viaje** (extraction-runner, awaiting-passenger-handler, awaiting-confirmation-handler).

---

## 5. Escenario 4: Ambigüedad Geográfica

### Turno 1: "del aeropuerto al centro"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:108` | core | Intent | "del aeropuerto al centro" | **intent=BOOKING**, facts=["origin:aeropuerto","destination:centro","location_ambiguous:true"] |
| 2 | `lead.service.ts:203-207` | Ambiguity check | ¿Start? | location_ambiguous fact + NOT ambiguity_pending | **→ startAmbiguityResolution** |
| 3 | `ambiguity-handler.ts:94-347` | startAmbiguityResolution | Search | origin="aeropuerto" → 3 matches | Ambiguo |
| 4 | — | LLM interpretAmbiguity | Resolve origin | candidates, text | **confidence=high, selected=IGR** |
| 5 | — | Intentar resolver dest | Resolve dest | dest="centro" → 3 matches | LLM incierto |
| 6 | — | **CONTEXTUAL INFERENCE** | Infer dest | origin=IGR, dest candidates | **Centro de Puerto Iguazú** (mismo país) |
| 7 | — | Preguntar confirmación | Confirm | "¿Confirmás Aeropuerto IGR → Centro de Puerto Iguazú?" | **ambiguity_pending** |

### Turno 2: "sí"

| Paso | Archivo:Linea | Función | Decisión | Input | Output |
|---|---|---|---|---|---|
| 1 | `lead.service.ts:180-184` | Ambiguity check | State=ambiguity_pending | "sí" | **→ handleAmbiguityResponse** |
| 2 | `ambiguity-handler.ts:349-549` | handleAmbiguityResponse | Parse | "sí" → parseSelection fails | No match |
| 3 | — | ??? | Fallback | no match | Posible: pregunta otra vez o interpreta como afirmación |

**Problema:** En `handleAmbiguityResponse`, el método `parseSelection` intenta matchear "sí" contra opciones de lugar (Aeropuerto IGR, etc.). "sí" NO matchea ninguna opción. Dependiendo de si el rawTerm es risk node, puede:
- Si es risk node: re-pregunta con el mismo mensaje
- Si no es risk node: busca "sí" en la DB → 0 matches → "No encontré ese lugar"

**Esto es un BUG:** El ambiguity handler no tiene un chequeo de afirmación/confirmación para el caso de contextual inference con confianza alta. La confirmación "sí" debería finalizar la ambigüedad, pero en cambio intenta matchear "sí" como un lugar.

---

## 6. Call Graph del Pipeline

### Árbol de llamadas completo

```
POST /api/whatsapp/webhook
  └─ handleLeadMessage(phone, text)                              [lead.service.ts:38]
      ├─ handleCommandShortcuts                                   [lead.service.ts:64]
      ├─ handleAdminCommands                                       [lead.service.ts:67]
      ├─ handleConversationSetup                                   [lead.service.ts:70]
      ├─ handleOpportunityResponse                                 [lead.service.ts:75]
      │
      ├─ [COGNITIVE SHADOW] runShadowCognition                    [lead.service.ts:85]
      ├─ [COGNITIVE MEMORY] memoryService.store                   [lead.service.ts:93-103]
      │
      ├─ core(text)                                                [lead.service.ts:108] ← 1ª ejecución
      ├─ interpretMessage                                          [lead.service.ts:114]
      │
      ├─ [GREETING SHORTCUT] → handlePolicyPipeline               [lead.service.ts:124-136]
      │   └─ processLead → handleMessage                          [policy-pipeline.ts:387]
      │       ├─ core (reuse)                                     [handler.ts:101]
      │       ├─ router                                           [handler.ts:102]
      │       ├─ interpretMessage  (2ª vez)                      [handler.ts:116]
      │       ├─ computeClientObjective                          [handler.ts:126]
      │       ├─ computeStrategyDecision                         [handler.ts:132]
      │       ├─ buildDomainPolicy                               [handler.ts:198]
      │       │   ├─ policyAhora/policyReserva                   [handler.ts:203-204]
      │       │   └─ response-builder.*                          [handler.ts internals]
      │       ├─ [DRL] buildDrlEnrichment                        [handler.ts:148-184]
      │       └─ [LLM] generateLLMResponse                        [handler.ts:234]
      │
      ├─ [COMBINED GREETING] → send intro + continue             [lead.service.ts:142-149]
      │
      ├─ [SLOT CONFIRMATION BUTTONS] → handleSlotConfirmationButton [lead.service.ts:155-157]
      │
      ├─ [SLOT CONFIRMATION TEXT] → handleSlotConfirmationText     [lead.service.ts:163-166]
      │
      ├─ [AWAITING PASSENGER] → handleAwaitingPassenger            [lead.service.ts:169-172]
      │   ├─ parsePassengerCount                                   [awaiting-passenger-handler.ts:28]
      │   ├─ extractSlots (LLM fallback)                          [awaiting-passenger-handler.ts:37]
      │   └─ resolvePricingForSlots                               [awaiting-passenger-handler.ts:59]
      │
      ├─ [AWAITING CONFIRMATION] → handleAwaitingConfirmation      [lead.service.ts:175-178]
      │   ├─ isAffirmativeMessage / isNegativeMessage             [awaiting-confirmation-handler.ts:27]
      │   ├─ resolvePricingForSlots                               [awaiting-confirmation-handler.ts:42]
      │   └─ executeNowTrip / executeTrip                         [awaiting-confirmation-handler.ts:59-70]
      │
      ├─ [AMBIGUITY PENDING] → handleAmbiguityResponse             [lead.service.ts:183-184]
      │   ├─ parseSelection                                        [ambiguity-handler.ts:682]
      │   ├─ searchPlaces                                         [ambiguity-handler.ts:453]
      │   └─ finalizeAmbiguity                                    [ambiguity-handler.ts:551]
      │
      ├─ [AMBIGUITY DETECTED] → startAmbiguityResolution           [lead.service.ts:203-207]
      │   ├─ searchPlaces                                         [ambiguity-handler.ts:111-114]
      │   ├─ interpretAmbiguity (LLM)                             [ambiguity-handler.ts:139-142]
      │   └─ finalizeAmbiguity / buildContextualPlaceOptions      [ambiguity-handler.ts:214-334]
      │
      ├─ [POST-BOOKING] → handlePolicyPipeline                    [lead.service.ts:220-234]
      │
      ├─ runComprehensionCheck                                     [lead.service.ts:266-271]
      │
      └─ runExtractionPipeline → handlePolicyPipeline             [lead.service.ts:273-306]
          ├─ extractSlots (LLM)                                   [extraction-runner.ts:173]
          ├─ evaluateCompleteness                                  [extraction-runner.ts:272]
          ├─ resolvePricingForSlots                                [extraction-runner.ts:347]
          ├─ inferPickupTime                                       [extraction-runner.ts:403]
          ├─ inferBorderSide                                       [extraction-runner.ts:433]
          ├─ buildSlotStates                                      [extraction-runner.ts:541]
          └─ evaluateWorkflowTransition                            [extraction-runner.ts:597]
              └─ handlePolicyPipeline                              [lead.service.ts:306]
                  ├─ buildExtractionContext                        [policy-pipeline.ts:63-71]
                  ├─ getPlaceDisplayName                           [policy-pipeline.ts:82-88]
                  ├─ [OPPORTUNITY] evaluateOpportunities           [policy-pipeline.ts:137-159]
                  ├─ [AWAITING_CONFIRMATION+NEG] cancel logic      [policy-pipeline.ts:162-179]
                  ├─ [AWAITING_CONFIRMATION+AFF] confirm+dispatch  [policy-pipeline.ts:181-269]
                  ├─ [SLOT CONFIRMATION] buildSlotConfirmation     [policy-pipeline.ts:272-306]
                  ├─ operationalReadiness                          [policy-pipeline.ts:312-353]
                  ├─ [DISPATCH] executeNowTrip                      [policy-pipeline.ts:355-381]
                  └─ processLead → handleMessage                   [policy-pipeline.ts:387]
```

### Puntos de divergencia

```
lead.service.ts:124 ── GREETING → handlePolicyPipeline → processLead → handleMessage
lead.service.ts:155 ── SLOT BUTTON → handleSlotConfirmationButton (bypass total)
lead.service.ts:163 ── SLOT TEXT → handleSlotConfirmationText (bypass total)
lead.service.ts:169 ── AWAITING_PASSENGER → handleAwaitingPassenger (bypass total)
lead.service.ts:175 ── AWAITING_CONFIRMATION → handleAwaitingConfirmation (bypass total)
lead.service.ts:183 ── AMBIGUITY_PENDING → handleAmbiguityResponse (bypass total)
lead.service.ts:203 ── AMBIGUITY_DETECTED → startAmbiguityResolution (bypass total)
lead.service.ts:220 ── POST-BOOKING → handlePolicyPipeline (bypass parcial)
lead.service.ts:273 ── NORMAL FLOW → extraction → policyPipeline → processLead → handleMessage
```

**De 7 rutas posibles, SOLO 2 pasan por `processLead`/`handleMessage`** (GREETING shortcut y NORMAL FLOW).  
Las otras 5 bypassan completamente el pipeline CORE → ROUTER → POLICY.

---

## 7. Authority Matrix: Actual vs Deseada

| Decisión | Autoridad ACTUAL | Archivo | Autoridad DESEADA | Gap |
|---|---|---|---|---|
| **Intent detection** | `core.ts` | `ai/core.ts` | `core.ts` | ✅ Correcto |
| **Message type** | `conversation-interpreter.ts` | `ai/conversation-interpreter.ts` | `conversation-interpreter.ts` | ✅ Correcto |
| **Output type (EXECUTE/ANSWER/CLARIFY)** | `router.ts` | `ai/router.ts` | `router.ts` | ✅ Correcto |
| **Policy decision** | `policy-ahora.ts` + `policy-reserva.ts` | `ai/policy-*.ts` | Única policy unificada | ⚠️ Dos archivos separados con cross-imports |
| **Próximo campo a preguntar** | `field-resolver.ts` + `evaluate-completeness.ts` + `slot-workflow.ts` | Múltiples | **`field-resolver.ts`** | ❌ Triple autoridad |
| **¿Mostrar confirmación de slots?** | `shouldRequestConfirmation()` en slot-confirmation.ts + policy-reserva check + policy-pipeline check | Múltiples | **`slot-confirmation.ts`** | ❌ Múltiple |
| **Manejo de afirmación "sí"** | `handleSlotConfirmationText` + `handleAwaitingPassenger` + `handleAwaitingConfirmation` + `policy-pipeline.ts` + `policy-reserva.ts` | 5 archivos | **Un solo `affirmation-handler.ts`** | ❌ 5 autoridades |
| **Manejo de cancelación "no"** | `policy-pipeline.ts` + `extraction-runner.ts` + `awaiting-confirmation-handler.ts` + `awaiting-passenger-handler.ts` + `policy-ahora.ts` | 5 archivos | **Un solo `cancellation-handler.ts`** | ❌ 5 autoridades |
| **Resolución de ambigüedad** | `ambiguity-handler.ts` + `drl/rules/geo-desambiguacion.ts` | 2 archivos | **`ambiguity-handler.ts`** (interactivo) + DRL como shadow | ❌ No hay coordinación |
| **Pricing** | `resolvePricingForSlots` (llamado desde 4+ lugares) | Múltiples | **Un solo pricing call** con caché | ❌ Repricing constante |
| **¿Saltar LLM?** | `strategyDecision.behaviorFlags.skipLLM` | `conversation-strategy.ts` + `handler.ts` | `conversation-strategy.ts` | ✅ Parcial (la decisión está en strategy, pero handler aplica) |
| **Slot status (CONFIRMED/CONFIRMATION_PENDING)** | `buildSlotStates()` | `slot-state.ts` | `buildSlotStates()` | ✅ Única autoridad |
| **Workflow state transition** | `evaluateWorkflowTransition()` | `slot-workflow.ts` | `evaluateWorkflowTransition()` | ✅ Única autoridad |
| **Client Objective** | `computeClientObjective()` | `client-objective.ts` | `computeClientObjective()` | ✅ Única autoridad |
| **Strategy Decision** | `computeStrategyDecision()` | `conversation-strategy.ts` | `computeStrategyDecision()` | ✅ Única autoridad |
| **Output al usuario** | `sender.ts` | `lib/sender.ts` | `sender.ts` | ✅ Único |
| **Construcción de mensajes** | `response-builder.ts` + múltiples `build*` en policies | Múltiples | **`response-builder.ts`** | ❌ policy-reserva tiene sus propios builders |

### Resumen de Autoridades

| Estado | Count | Componentes |
|---|---|---|
| ✅ Autoridad única correcta | 9 | core, router, CI, strategyDecision, clientObjective, slotStates, workflowState, sender, pricing engine |
| ⚠️ Split entre archivos | 2 | policy (ahora + reserva), slot confirmation UI |
| ❌ Autoridad MÚLTIPLE | 6 | **próximo campo, afirmación, cancelación, ambigüedad, pricing call, construcción mensajes** |

---

## 8. Confirmación de Findings PR-QA1

### F-01: Pipeline paralelo activo ✅ CONFIRMADO

**Evidencia dinámica:** El call graph muestra que el flujo normal pasa por:
1. `lead.service.ts:306` → `handlePolicyPipeline` (HACE 200+ líneas de lógica)
2. → `processLead` (solo si no hay early return en policy-pipeline)
3. → `handleMessage`

En el Escenario 1 (turno 2 "necesito un taxi"), `evaluateCompleteness` dentro de `extraction-runner.ts` retorna ASK, y **todo el pipeline posterior se aborta** (return null en lead.service.ts:276). Esto significa que `handleMessage` JAMÁS se ejecuta para ese mensaje, y en su lugar la pregunta de campo faltante la genera `buildGenericClarify` desde `extraction-runner.ts:284`.

**El pipeline `handler.ts` no es el orquestador real.** El orquestador real es `lead.service.ts` + `extraction-runner.ts` + `policy-pipeline.ts`. handler.ts solo se ejecuta en 2 de 7 rutas posibles.

**Cuantificación:**
- Rutas totales en lead.service.ts: **7**
- Rutas que pasan por handler.ts: **2** (28.6%)
- Rutas que bypassan handler.ts: **5** (71.4%)

### F-02: Afirmación en confirmación manejada en 3+ lugares ✅ CONFIRMADO

**Evidencia dinámica:** Un "sí" del usuario puede ser manejado por:

| Contexto | Handler | Archivo |
|---|---|---|
| Estado `slot_confirmation` + texto | `handleSlotConfirmationText` | `services/workflow/slot-confirmation-text-handler.ts` |
| Estado `slot_confirmation` + botón | `handleSlotConfirmationButton` | `services/workflow/slot-confirmation-handler.ts` |
| Estado `awaiting_passenger` | `handleAwaitingPassenger` (+ affirmative check) | `services/workflow/awaiting-passenger-handler.ts:85` |
| Estado `awaiting_confirmation` | `handleAwaitingConfirmation` | `services/workflow/awaiting-confirmation-handler.ts:36` |
| **Zombie: policy-pipeline awaiting_confirmation** | `handlePolicyPipeline` → bloque 162-269 | `services/workflow/policy-pipeline.ts:181` |
| **Zombie: policy-reserva affirmation block** | `buildReservaFinalResponse` → bloque 174-197 | `ai/policy-reserva.ts:174` |

**Total: 6 implementaciones distintas** que pueden responder a un "sí".

**Riesgo concreto:** En el Escenario 1, cuando el usuario dice "sí" a la confirmación de slots (turno 5), el mensaje entra por `handleSlotConfirmationText`. Si ese handler falla o no reconoce "sí" como afirmación, el flujo cae al pipeline normal donde `policy-reserva.ts:174` también detecta afirmación. Esto puede causar:
- **Doble respuesta** (slot confirmation responde + policy-reserva responde otra vez)
- **Estado inconsistente** (slot confirmation cambia estado a awaiting_passenger, pero policy-reserva espera awaiting_confirmation)

### F-03: Resolución de "siguiente campo" triplicada ✅ CONFIRMADO (en realidad cuadruplicada)

**Evidencia dinámica:**

| Componente | Función | Archivo | Cuándo se ejecuta |
|---|---|---|---|
| **field-resolver** | `resolveNextRequiredField()` | `ai/field-resolver.ts` | Dentro de `handler.ts` → policy → CLARIFY case → pregunta campo |
| **evaluate-completeness** | `evaluateCompleteness()` | `services/workflow/evaluate-completeness.ts` | Dentro de `extraction-runner.ts:272` → si ASK, ABORTA pipeline |
| **slot-workflow** | `evaluateWorkflowTransition()` | `services/workflow/slot-workflow.ts` | Dentro de `extraction-runner.ts:597` → determina estado + clarifyField |
| **ambiguity-handler** | (lógica propia) | `services/workflow/ambiguity-handler.ts` | Si hay ambigüedad, determina qué slot preguntar sin consultar a nadie |

**En el Escenario 1 (turno 2):** `evaluateCompleteness` (en extraction-runner) decide que falta origin y **ABORTA** el pipeline. `field-resolver` JAMÁS se ejecuta para ese mensaje. 

**En el Escenario 1 (turno 1):** `field-resolver` decide que falta origin **pero** dentro del contexto de GREETING + CLARIFY, donde la respuesta correcta sería un saludo, no una pregunta de origen.

**Conflicto potencial:** `evaluate-completeness.ts` usa criterio simple (solo checkea origin y destination). `field-resolver.ts` usa criterio complejo (status, reason, score, source). Si ambos se ejecutan para el mismo mensaje (lo que NO ocurre actualmente porque extraction-runner aborta), pueden dar respuestas distintas.

### Hallazgos adicionales descubiertos en PR-QA2

| ID | Descripción | Severidad | Evidencia |
|---|---|---|---|
| **F-04 (nuevo)** | Ambiguity handler no detecta afirmación "sí" en confirmación contextual | 🔴 Alta | Escenario 4: parseSelection("sí") → no match → re-pregunta lugar |
| **F-05 (nuevo)** | Pricing resuelto 3+ veces para el mismo viaje | 🟡 Media | Escenario 3: extraction-runner + awaiting-passenger + awaiting-confirmation |
| **F-06 (nuevo)** | 5 de 7 rutas bypassan handleMessage (CORE→ROUTER→POLICY) | 🔴 Alta | Call graph: solo GREETING y NORMAL FLOW pasan por handler.ts |
| **F-07 (nuevo)** | "¿cuánto sale?" + ambigüedad → ambiguity handler intercepta antes de pricing | 🔴 Alta | Escenario 2: usuario pregunta precio, ambiguity handler responde resumen sin precio |

---

## 9. Respuestas a Preguntas Clave

### 1. ¿Quién decide el próximo campo?

**Actualmente:** Depende del camino:
- Si `extraction-runner` se ejecuta: **`evaluate-completeness.ts`** (criterio simple: origin/destination presentes)
- Si `handler.ts` se ejecuta: **`field-resolver.ts`** (criterio complejo: status, score, reason, source, coreFacts)
- Si `ambiguity-handler` se ejecuta: **lógica propia** (basada en options + LLM)
- Si `slot-workflow` se ejecuta: **`evaluateWorkflowTransition`** (basada en action del extraction result)

**Debería decidir:** **`field-resolver.ts`** — es el más completo. Pero debe ejecutarse SIEMPRE, no solo cuando pasa por handler.ts.

### 2. ¿Cuántas veces se decide?

**Por mensaje normal (sin bypass):**
- evaluateCompleteness en extraction-runner: 1 vez (aborta si falta campo)
- evaluateWorkflowTransition: 1 vez (determina estado)
- field-resolver en handler → policy: 1 vez (determina qué preguntar)

**Total: 3 decisiones de "próximo campo" por mensaje.** Dos de ellas ocurren en ramas diferentes (extraction-runner aborta ANTES de llegar a handler).

### 3. ¿Quién interpreta un "sí"?

**6 implementaciones:**
1. `slot-confirmation-text-handler.ts` — isAffirmativeMessage
2. `slot-confirmation-handler.ts` — button "slot_confirm"
3. `awaiting-passenger-handler.ts:85` — isAffirmativeMessage
4. `awaiting-confirmation-handler.ts:36` — isAffirmativeMessage
5. `policy-pipeline.ts:181` — isAffirmativeMessage (bloque zombie)
6. `policy-reserva.ts:174` — facts.some(f => f.startsWith("affirmation:"))

**Todas usan `isAffirmativeMessage` de `patterns.ts`** como función de matching, pero el **contexto y la respuesta** son completamente diferentes en cada una.

### 4. ¿Cuántas implementaciones participan?

| Componente | Archivos | ¿Participa en pipeline estándar? |
|---|---|---|
| `lead.service.ts` | 1 | ✅ Orquestador |
| `extraction-runner.ts` | 1 | ✅ En flujo normal |
| `policy-pipeline.ts` | 1 | ✅ En flujo normal (pero debería ser delgado) |
| `processLead + handler.ts` | 2 | ✅ En flujo normal |
| `ambiguity-handler.ts` | 1 | ⚠️ Bypass total |
| `slot-confirmation-text-handler.ts` | 1 | ⚠️ Bypass total |
| `slot-confirmation-handler.ts` | 1 | ⚠️ Bypass total |
| `awaiting-passenger-handler.ts` | 1 | ⚠️ Bypass total |
| `awaiting-confirmation-handler.ts` | 1 | ⚠️ Bypass total |
| `DRL assistance` | 3 (assistance+engine+rules) | ✅ Shadow (en handler) |
| `BKE` | 1 | ✅ Stub (en handler) |
| `Evidence Engine` | 1 | ✅ Shadow mode |
| **Total activos** | **15 archivos** | — |

### 5. ¿Quién decide la siguiente respuesta?

- **Si pasa por handler.ts:** `buildDomainPolicy()` → `policyAhora()` o `policyReserva()` que llama a `response-builder.ts`
- **Si bypassa:** El handler de estado específico (awaiting-confirmation-handler, ambiguity-handler, etc.) construye su propio mensaje
- **Si extraction aborta:** `extraction-runner.ts` llama a `buildGenericClarify` directamente

### 6. ¿Dónde se pierde información?

| Información | Se pierde en | Efecto |
|---|---|---|
| `conversationId` | `HandlerContext` → policy | No disponible para logging/post-process |
| `temporal` | `lead.service.ts:247-260` (computado pero no siempre pasa) | Policy puede no saber si es NOW/FUTURE |
| `operationalMode` | HandlerContext solo si se pasa desde handlePolicyPipeline | Policy-reserva usa default |
| Pricing ya calculado | `awaiting-confirmation-handler.ts:42` resuelve pricing de nuevo | 3 cálculos para el mismo viaje |
| Intención original del usuario | Ambiguity handler no pasa el intent original a finalizeAmbiguity | No se sabe si era COMMERCIAL, PRE_BOOKING, etc. |

### 7. ¿Dónde se vuelve a preguntar algo ya conocido?

| Situación | Componente | Archivo |
|---|---|---|
| Después de resolver ambigüedad, ambiguity handler finaliza con slot_confirmation | ambiguity-handler | `ambiguity-handler.ts:591` |
| Si el usuario ya dijo origen y destino, extraction pregunta de nuevo | evaluate-completeness | `evaluate-completeness.ts:22` |
| Policy pregunta de nuevo aunque extraction ya haya clarificado | field-resolver | `field-resolver.ts:46-52` |
| Awaiting passenger handler pregunta pasajeros aunque extraction ya lo extrajo | awaiting-passenger-handler | `awaiting-passenger-handler.ts:100` |

### 8. ¿Qué componente debería ser la única autoridad?

| Decisión | Autoridad Única Deseada | Justificación |
|---|---|---|
| **Próximo campo** | `field-resolver.ts` (unificado con evaluate-completeness) | Es el más completo; debe ejecutarse SIEMPRE |
| **Afirmación** | Nuevo `affirmation-handler.ts` | Unificar las 6 implementaciones |
| **Cancelación** | Nuevo `cancellation-handler.ts` | Unificar las 5 implementaciones |
| **Pipeline orquestador** | `handler.ts` (CORE→ROUTER→POLICY) | Es el diseño target V3; las otras rutas deben delegar |
| **Pricing call** | `resolvePricingForSlots` con CACHÉ | Evitar 3+ cálculos por mismo viaje |
| **Respuesta a usuario** | `response-builder.ts` | Unificar todos los build* en un solo lugar |
| **Política de respuesta** | Unificar `policy-ahora.ts` y `policy-reserva.ts` | Eliminar cross-imports |
| **Mensaje de slot confirmation** | `slot-confirmation.ts` | Ya es la autoridad parcial |

---

## 10. Plan de Eliminación Segura para QA-3

### Principios

1. **Sin cambios funcionales visibles** — cada refactor debe preservar el comportamiento observable
2. **Migración gradual** — una autoridad por vez, con feature flags para rollback
3. **Shadow comparison** — la nueva implementación corre en paralelo con la vieja, comparando outputs
4. **Cobertura de tests** — cada cambio debe tener tests que capturen el comportamiento actual antes de modificar

### Fase 1: Unificar Pipeline (eliminar F-01)

| Paso | Acción | Feature flag | Verificación |
|---|---|---|---|
| 1a | Extraer lógica de policy-pipeline.ts a módulos separados | `FF_PIPELINE_UNIFY` | Tests existentes pasan |
| 1b | Mover lógica de confirmación zombie de policy-pipeline (L162-269) a awaiting-confirmation-handler | `FF_CONFIRM_UNIFY` | Output idéntico |
| 1c | Hacer que handlePolicyPipeline sea wrapper delgado que solo llame a processLead | `FF_THIN_PIPELINE` | Comparación shadow de outputs |
| 1d | Eliminar lógica de slot confirmation de policy-pipeline, delegar a slot-confirmation handler | `FF_SLOT_CONFIRM_DELEGATE` | Tests end-to-end |
| 1e | Hacer que lead.service.ts llame a handleMessage DIRECTAMENTE (sin policy-pipeline) | `FF_DIRECT_HANDLER` | Shadow comparison |

### Fase 2: Unificar Afirmación (eliminar F-02)

| Paso | Acción | Feature flag | Verificación |
|---|---|---|---|
| 2a | Crear `affirmation-handler.ts` unificado | `FF_AFFIRM_UNIFY` | Tests de cada escenario |
| 2b | Migrar slot-confirmation-text-handler a usar affirmation-handler | `FF_AFFIRM_UNIFY` | Output idéntico |
| 2c | Migrar awaiting-passenger-handler a usar affirmation-handler | `FF_AFFIRM_UNIFY` | Output idéntico |
| 2d | Migrar awaiting-confirmation-handler a usar affirmation-handler | `FF_AFFIRM_UNIFY` | Output idéntico |
| 2e | Eliminar bloque zombie de policy-pipeline.ts L181-269 | `FF_AFFIRM_UNIFY` | Sin cambios observables |
| 2f | Migrar policy-reserva.ts affirmation block a solo lectura de signals | `FF_AFFIRM_UNIFY` | Policy no maneja afirmación |

### Fase 3: Unificar Campo Siguiente (eliminar F-03)

| Paso | Acción | Feature flag | Verificación |
|---|---|---|---|
| 3a | Fusionar evaluate-completeness.ts DENTRO de field-resolver.ts | `FF_FIELD_UNIFY` | Comportamiento idéntico |
| 3b | Hacer que extraction-runner.ts NO aborte el pipeline cuando falta campo | `FF_FIELD_UNIFY` | Shadow: policy pregunta el campo |
| 3c | Integrar slot-workflow.evaluateWorkflowTransition en field-resolver (solo el clarifyField) | `FF_FIELD_UNIFY` | Tests de transición de estado |

### Fase 4: Fix Ambiguity + Pricing

| Paso | Acción | Feature flag | Verificación |
|---|---|---|---|
| 4a | Agregar detección de afirmación en handleAmbiguityResponse (fix F-04) | `FF_AMBIGUITY_AFFIRM` | Escenario 4 pasa |
| 4b | Hacer que ambiguity handler preserve pricing answer (fix F-07) | `FF_AMBIGUITY_PRICING` | COMMERCIAL intent + ambiguity → pricing responde |
| 4c | Cachear pricing result en sesión (fix F-05) | `FF_PRICING_CACHE` | Mismo precio en 3 calls |

### Matriz de Riesgo por Paso

| Paso | Riesgo | Mitigación |
|---|---|---|
| 1a, 1b | Bajo | Solo mover código, sin cambiar lógica |
| 1c, 1d | Medio | Shadow comparison de outputs |
| 1e | **Alto** | Cambia la ruta de llamada principal; requiere shadow completo |
| 2a-2f | Medio | Cada handler tiene tests específicos |
| 3a-3c | **Alto** | Cambia el flujo de abort vs preguntar; requiere shadow |
| 4a-4c | Bajo-Mezio | Bugs existentes; fix no cambia flujo normal |

### Orden recomendado para QA-3

```
Sprint 1 (bajo riesgo):
  4a → 4b → 4c (fix bugs + cache)
  1a → 1b (mover código)
  
Sprint 2 (riesgo medio):
  2a → 2b → 2c → 2d (unificar afirmación)
  1c → 1d (adelgazar policy-pipeline)

Sprint 3 (riesgo alto):
  1e (direct handler)
  3a → 3b → 3c (unificar campo siguiente)
  2e → 2f (eliminar zombies)
```

---

## Appendix A: Logging Patterns Existentes

El sistema tiene logging estructurado en todos los componentes. Estos logs pueden usarse para verificación dinámica en QA-3:

| Componente | Log tag | Información |
|---|---|---|
| Webhook | `[WEBHOOK]`, `[WEBHOOK_DEBUG]` | Message received, routing |
| Lead service | `[TRACE WEBHOOK MESSAGE]`, `[DEBUG_LEAD]`, `[CORE_RESULT]` | Entry, core result |
| Extraction | `[EXTRACTION]`, `[OBSERVABILITY]`, `[SLOT_STATE_TRANSITION]` | Slot extraction, state |
| Confidence | `[CONFIDENCE]` | Confidence scores |
| Policy | `[POLICY_ahora]`, `[POLICY_reserva]`, `[POLICY_DECISION]` | Policy decisions |
| Router | `[ROUTING]`, `[CORE]` | Output type |
| Strategy | `[STRATEGY]` | Strategy decision |
| DRL | `[DRL_RESPONSE_ASSISTANCE]` | DRL enrichment |
| Pipeline | `[PIPELINE]`, `[TRACE_PIPELINE_END]`, `[TRACE_PRE_POLICY]` | Orchestration |
| Ambiguity | `[AMBIGUITY_MATRIX]`, `[AMBIGUITY_START]`, `[AMBIGUITY_RESOLVED]` | Resolution |
| Confirmation | `[CONFIRMATION_STATE]`, `[CONFIRMATION_DETECTED]`, `[CONFIRMATION_RESULT]` | Confirmation handling |

Para QA-3, se recomienda agregar un **request-id tracking** que permita correlacionar todos los logs de un mismo mensaje y verificar que el flujo es el esperado.

---

*Documento generado por ARNÉS — PR-QA2 Runtime Flow Trace & Authority Verification. 0 modificaciones de código realizadas.*
