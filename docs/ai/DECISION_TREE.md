# Decision Tree — AITOS Runtime

> This document describes the actual decision tree the system follows for every incoming message.
> It is derived from `lead.service.ts`, `core.ts`, `router.ts`, `extraction-runner.ts`, and `policy-pipeline.ts`.

---

## Top-level flow

```
Usuario envía mensaje
    ↓
[WhatsApp Webhook]  ── HMAC? → 401; rate limit? → 429; duplicate? → 200
    ↓ phone, text normalizados
[lead.service.ts :: handleLeadMessage]
    ↓
¿text === ".limpiar"?  ── SÍ → resetear sesión → FIN
    ↓ NO
¿command shortcut?  ── SÍ → ejecutar comando → FIN
    ↓ NO
¿admin/driver command?  ── SÍ → ejecutar comando → FIN
    ↓ NO
[conversation-setup.ts]
    ↓
¿oportunidad pendiente y el mensaje es respuesta?  ── SÍ → opportunity-response → FIN
    ↓ NO
[buildMemory]
    ↓
[core(text, prevIntent)]  → CoreDecision
    ↓
¿intent === GREETING?  ── SÍ → policy-pipeline (sin extracción) → FIN
    ↓ NO
¿hay greeting fact?  ── SÍ → enviar intro → continuar
    ↓
¿botón de slot confirmation?  ── SÍ → handleSlotConfirmationButton → FIN
    ↓ NO
¿conversational_state === slot_confirmation?  ── SÍ → tratar texto como confirm/corrección → FIN
    ↓ NO
¿conversational_state === awaiting_passenger?  ── SÍ → parse passenger count → precio → confirmación → FIN
    ↓ NO
¿conversational_state === awaiting_confirmation?  ── SÍ → afirmativo? ejecutar viaje; negativo? volver → FIN
    ↓ NO
¿conversational_state === ambiguity_pending?  ── SÍ → resolver ambigüedad → FIN
    ↓ NO
¿location_ambiguous fact?  ── SÍ → startAmbiguityResolution → FIN
    ↓ NO
[runComprehensionCheck]
    ↓
¿comprehension === ESCALATION?  ── SÍ → escalar a humano → FIN
    ↓ NO
[runExtractionPipeline]
    ↓
[handlePolicyPipeline]
    ↓
FIN (respuesta enviada)
```

---

## CORE decision tree

```
input: string
    ↓
¿input vacío?  ── SÍ → intent=AMBIGUOUS, confidence=0
    ↓ NO
Ejecutar regex para extraer facts:
  - urgency, query, action, passengers, flight, date, time
  - greeting, informational, commercial, pre_booking, booking, now
  - reschedule, post_service, emergency, consulta
  - airport_mention
    ↓
¿facts.length === 0?  ── SÍ → intent=AMBIGUOUS
    ↓ NO
Detectar estructura sintáctica (roleLock):
  - "estoy en X" → origin locked
  - "ir/voy a Y" → destination locked
  - "desde X" → origin (si no hay "estoy en")
  - "hasta Y" → destination (si no hay "ir a")
  - "origen X destino Y" → ambos
    ↓
classifyIntent(facts, slotStability)
    ↓
Aplicar contexto previo:
  - PRE_BOOKING + prevIntent ≠ AMBIGUOUS → heredar prevIntent
    ↓
computeConfidence
    ↓
aplyLaterals
    ↓
detectPurchaseIntent
    ↓
CoreDecision
```

Source: `src/lib/ai/core.ts`

---

## ROUTER decision tree

```
CoreDecision
    ↓
¿intent === EMERGENCY?        ── SÍ → EXECUTE (AHORA)
¿intent === NOW?              ── SÍ → EXECUTE (AHORA)
¿intent === GREETING?         ── SÍ → CLARIFY
¿confidence < 0.4?            ── SÍ → SAFE_FALLBACK
¿intent === BOOKING/RESERVA?  ── SÍ → EXECUTE (RESERVA)
¿intent === COMMERCIAL/CONSULTA?  ── SÍ → ANSWER
¿intent === PRE_BOOKING?      ── SÍ → CLARIFY
¿intent === INFORMATIONAL?    ── SÍ → ANSWER
¿intent === AMBIGUOUS?        ── SÍ → SAFE_FALLBACK
    ↓
default → CLARIFY
```

Source: `src/lib/ai/router.ts`

---

## Comprehension decision tree

```
input: text + leadCore + predictedContext + session + isFirstTurn
    ↓
Calcular score ponderado:
  - intención      30%
  - entidad        25%
  - completitud    20%
  - extracción     15%
  - estabilidad    10%
    ↓
¿score ≥ 0.85?  ── SÍ → FULL_CONTROL (continuar)
¿score 0.65-0.84? ── SÍ → CLARIFICATION (continuar con cuidado)
¿score 0.40-0.64? ── SÍ → RECOVERY
  └─ ¿isFirstTurn? ── SÍ → degradar a CLARIFICATION
¿score < 0.40?    ── SÍ → ESCALATION
  └─ ¿isFirstTurn? ── SÍ → degradar a RECOVERY
```

Source: `src/lib/services/extraction/comprehension.ts`

---

## Extraction decision tree

```
text + history + prevSlots + roleLock + slotStability
    ↓
[extractSlots]
    ↓
Capa 1: regex-extractor  ── ¿origin+destination? → usar
    ↓ NO
Capa 2: entity-extractor ── ¿match DB? → usar
    ↓ NO
Capa 3: LLM extraction   ── ¿success? → usar
    ↓ NO
raw = null
    ↓
¿raw null y afirmación + prevSlots?  ── SÍ → promover prevSlots
    ↓
[calculateSlotConfidence]
    ↓
¿origin+destination?  ── SÍ → [resolvePricingForSlots]
    ↓
[merge prevSlots]
    ↓
[apply roleLock]
    ↓
[apply affirmation override → score=1.0]
    ↓
[buildSlotStates]
    ↓
[evaluateWorkflowTransition]
    ↓
ExtractionResult
```

Source: `src/lib/services/extraction/extraction-runner.ts`

---

## Pricing decision tree

```
origin, destination, passengers
    ↓
[location-resolver] → place_id / zone_id para origin y destination
    ↓
Buscar tarifa por prioridad:
  1. place_id → place_id
  2. place_id → zone_id
  3. zone_id → place_id
  4. zone_id → zone_id
    ↓
¿tarifa encontrada?  ── SÍ → aplicar promociones/ajustes → PricingResult
    ↓ NO
PricingResult con final_price=0
```

Source: `src/lib/services/pricing/tariff-resolver.ts`, `src/lib/services/pricing/resolve-pricing-for-slots.ts`

---

## Policy pipeline decision tree

```
ExtractionContext + leadCore + pricing + workflowResult
    ↓
¿lateral EMERGENCY?  ── SÍ → notifyAdmin + mensaje emergencia → FIN
    ↓ NO
¿lateral RESCHEDULE? ── SÍ → notifyAdmin → FIN
    ↓ NO
¿lateral POST_SERVICE? ── SÍ → respuesta post-servicio → FIN
    ↓ NO
¿state === awaiting_confirmation && affirmation? ── SÍ → confirmar reserva / ejecutar viaje → FIN
    ↓ NO
¿state === slot_confirmation? ── SÍ → mostrar UI de confirmación → FIN
    ↓ NO
¿askForConfirmation && tariff match? ── SÍ → mensaje de confirmación con precio → FIN
    ↓ NO
¿state === collecting_slots && clarifyField? ── SÍ → preguntar campo faltante → FIN
    ↓ NO
¿outputType === ANSWER && tariff match? ── SÍ → información de precio → FIN
    ↓ NO
¿origin o destination ambiguous? ── SÍ → iniciar resolución de ambigüedad → FIN
    ↓ NO
Mensaje de fallback / escalamiento humano
```

Source: `src/lib/services/workflow/policy-pipeline.ts`, `src/lib/ai/policy-ahora.ts`, `src/lib/ai/policy-reserva.ts`

---

## Dispatch decision tree

```
trip CONFIRMED
    ↓
[Nivel 1] Ofrecer a driver principal (1h timeout)
    ↓ acepta
Driver asignado → IN_PROGRESS
    ↓ rechaza / timeout
[Nivel 2] Ofrecer a principal 2 (30min timeout)
    ↓ acepta
Driver asignado → IN_PROGRESS
    ↓ rechaza / timeout
[Nivel 3] Broadcast a todos los choferes (8min timeout)
    ↓ acepta
Driver asignado → IN_PROGRESS
    ↓ rechaza / timeout
[waiting_driver] Broadcast directo (3min timeout)
    ↓
Sin chofer → escalamiento humano
```

Source: `src/lib/services/dispatch/dispatch.service.ts`

---

*Last updated: 2026-07-06*
