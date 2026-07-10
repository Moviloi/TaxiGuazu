# AITOS-E11 — CORE → Policy Semantic Bridge Audit
## 2026-07-08 | Plan Mode — Read Only

---

## 1. Pipeline real CORE → POLICY

```
User Message
  │
  ▼
[CORE] core.ts
  │  produce: CoreDecision { intent, facts, confidence,
  │    slotStability, roleLock, slotAssignmentConfidence,
  │    lateral, purchaseIntent }
  │
  ▼
[LEAD SERVICE] lead.service.ts
  │  → Conversation Interpreter (ADR-007, solo logging)
  │  → runExtractionPipeline (LLM extraction)
  │  → buildExtractionContext (fusión slots)
  │  → handlePolicyPipeline
  │
  ▼
[POLICY PIPELINE] policy-pipeline.ts
  │  → temporalFromFacts(facts) → TemporalMode
  │  → operationalModeFromIntent(intent, temporal) → OperationalMode
  │  → isDispatchReady / isQuoteReady / isPrepareQuoteReady
  │  → processLead → handler.handleMessage
  │
  ▼
[HANDLER] handler.ts
  │  → core(input) → CoreDecision (segunda llamada, salvo GREETING shortcut)
  │  → router(core, mode) → FinalDecision
  │  → buildDomainPolicy → policyAhora | policyReserva
  │  (usa purchaseIntent solo para gatear LLM)
  │
  ▼
[POLICY] policy-ahora.ts / policy-reserva.ts
  │  produce: PolicyOutput { finalResponse, mode, decision,
  │    requiresConfirmation, needsGeo, needsSaveContext }
  │
  ▼
[EXECUTION] pipeline.ts
     → send / persist / geo / saveContext / adminNotify
```

**2 llamadas a CORE por mensaje normal** (salvo GREETING shortcut):
1. `lead.service.ts:74` — para leadCore (usado por extraction, temporal, domain)
2. `handler.ts:72` — dentro de `handleMessage` (para router → policy)

Esto es correcto arquitectónicamente: la primera es para el pipeline de extracción, la segunda para la decisión final. Pero significa que CORE se ejecuta dos veces con el mismo input.

---

## 2. Inventario de señales disponibles

### Generadas por CORE (core.ts)

| Campo | Tipo | Ejemplo | Generado por |
|---|---|---|---|
| `intent` | `Intent` (11 valores) | `"BOOKING"` | `classifyIntent(facts)` |
| `facts` | `string[]` | `["passengers:4", "date:mañana", "origin:hotel"]` | 17 regex + `detectStructure` |
| `confidence` | `number 0-1` | `0.85` | `computeConfidence(facts, intent)` |
| `slotStability` | `{origin, destination: SlotStability}` | `{origin:"locked", destination:"ambiguous"}` | `detectStructure` |
| `roleLock` | `{origin, destination: string\|null}` | `{origin:"aeropuerto", destination:"centro"}` | `detectStructure` |
| `slotAssignmentConfidence` | `{origin, destination: number}` | `{origin:0.95, destination:0.80}` | `detectStructure` |
| `lateral` | `CoreLateral \| undefined` | `{type:"emergency", ...}` | `applyLaterals()` |
| `purchaseIntent` | `"high" \| "medium" \| "low"` | `"high"` | `detectPurchaseIntent()` |

### Facts detallados (todos los prefijos generados por core.ts)

| Prefix | Ejemplo | Semántica |
|---|---|---|
| `urgency:` | `urgency:ahora` | Señal temporal de inmediatez |
| `query:` | `query:cuánto` | Pregunta genérica |
| `action:` | `action:reservar` | Verbo de acción |
| `passengers:` | `passengers:4` | Cantidad de pasajeros |
| `flight:` | `flight:AR1234` | Código de vuelo |
| `date:` | `date:mañana` | Referencia de fecha |
| `time:` | `time:14:30` | Referencia horaria |
| `location_ambiguous:` | `location_ambiguous:true` | Término de ubicación ambiguo |
| `affirmation:` | `affirmation:true` | Confirmación |
| `greeting:` | `greeting:hola` | Saludo |
| `informational:` | `informational:horarios` | Búsqueda de info |
| `commercial:` | `commercial:cuánto_cuesta` | Consulta de precio |
| `pre_booking:` | `pre_booking:estoy_viendo` | Pre-reserva / especulación |
| `booking:` | `booking:reservar` | Intención de reserva |
| `now:` | `now:ahora` | Inmediatez explícita |
| `reschedule:` | `reschedule:cambiar` | Reprogramación |
| `post_service:` | `post_service:gracias` | Post-servicio |
| `emergency:` | `emergency:ayuda` | Emergencia |
| `consulta:` | `consulta:consultar` | Consulta explícita |
| `airport_mention:` | `airport_mention:true` | Mención de vuelo/avión |
| `origin:` | `origin:aeropuerto` | Slot origen detectado por sintaxis |
| `destination:` | `destination:centro` | Slot destino detectado por sintaxis |
| `origin_stability:` | `origin_stability:locked` | Estabilidad del slot origen |
| `destination_stability:` | `destination_stability:ambiguous` | Estabilidad del slot destino |

### Generadas por Extraction Pipeline (extraction-runner.ts)

| Dato | Tipo | Ejemplo |
|---|---|---|
| `confidenceResult.slots` | `Record<str, {value, score, reason, status, source}>` | origin, destination, passengers, scheduled_at, flight, price |
| `confidenceResult.overall_confidence` | `number` | `0.92` |
| `confidenceResult.action` | `string` | `"proceed" \| "clarify"` |
| `workflowResult.state` | `ConversationalState` | `"collecting_slots"` |
| `workflowResult.clarifyField` | `string\|null` | `"destination"` |
| `pricing.final_price` | `number` | `15000` |
| `pricing.origin.canonical_name` | `string` | `"Aeropuerto Puerto Iguazú"` |
| `pricing.destination.canonical_name` | `string` | `"Centro de Puerto Iguazú"` |

### Generadas por Conversation Interpreter (ADR-007)

| Dato | Tipo | Ejemplo |
|---|---|---|
| `classification.type` | `MessageType` (12 valores) | `"new_request"` |
| `classification.confidence` | `number` | `0.95` |
| `classification.isClarification` | `boolean` | `false` |
| `classification.isCorrection` | `boolean` | `false` |
| `classification.targetSlot` | `string\|null` | `null` |

---

## 3. Señales utilizadas realmente

### Router (router.ts)
**Input**: `CoreDecision`
**Usa**: `intent` + `confidence`
**Ignora**: `purchaseIntent`, `slotAssignmentConfidence`, `lateral`, `slotStability`, `roleLock`

| Señal | Usada | Cómo |
|---|---|---|
| `intent` | ✅ | `coreToOutputType()` mapea intent → EXECUTE/ANSWER/CLARIFY/SAFE_FALLBACK |
| `confidence` | ✅ | Si < 0.4 → SAFE_FALLBACK |
| `purchaseIntent` | ❌ | No se consulta |
| `facts` | ❌ | No se iteran |
| `slotStability` | ❌ | No se usa |
| `roleLock` | ❌ | No se usa |
| `slotAssignmentConfidence` | ❌ | No se usa |
| `lateral` | ❌ | No se usa |

### Handler (handler.ts)
**Input**: `CoreDecision` + `Mode` + `HandlerContext`
**Usa**: `intent`, `confidence`, `facts`, `purchaseIntent` (solo para LLM gating)
**Ignora**: `slotAssignmentConfidence`, `lateral`, roleLock (ya pasado en extractionCtx)

| Señal | Usada | Cómo |
|---|---|---|
| `intent` | ✅ | Build domain: COMMERCIAL intent → commercial domain |
| `confidence` | ✅ | Si < 0.4 y sin slots → SAFE_FALLBACK |
| `facts` | ✅ | Solo via `buildDomainPolicy` → `resolveNextRequiredField` |
| `purchaseIntent` | ⚠️ | Solo para LLM gating (skip si low) — NO llega a Policy |
| `slotStability` | ❌ | No se pasa a buildDomainPolicy |
| `slotAssignmentConfidence` | ❌ | No se usa |
| `lateral` | ❌ | No se usa (router ya clasificó por intent) |

### Policy AHORA (policy-ahora.ts)
**Input**: `FinalDecision` + `HandlerContext`
**Usa**: `decision`, `core.intent`, `core.facts`, `ctx.extraction`
**Ignora**: `purchaseIntent`, `slotAssignmentConfidence`

| Señal | Usada | Cómo |
|---|---|---|
| `decision` | ✅ | switch: EXECUTE → dispatch/booking, ANSWER → price info, CLARIFY → ask field |
| `core.intent` | ✅ | EMERGENCY/RESCHEDULE → lateral responses. BOOKING → resolve next field |
| `core.facts` | ✅ | Pasado a `resolveNextRequiredField` |
| `ctx.extraction` | ✅ | Tariff, slots, clarifyField |
| `purchaseIntent` | ❌ | No se consulta en ninguna decisión |
| `slotAssignmentConfidence` | ❌ | No se usa |

### Policy RESERVA (policy-reserva.ts)
**Input**: `FinalDecision` + `HandlerContext`
**Usa**: `decision`, `core.intent`, `core.facts`, `ctx.extraction`
**Ignora**: `purchaseIntent`, `slotAssignmentConfidence`

| Señal | Usada | Cómo |
|---|---|---|
| `decision` | ✅ | EXECUTE → confirmation, CLARIFY → ask field, ANSWER → price info |
| `core.intent` | ✅ | EMERGENCY/RESCHEDULE/POST_SERVICE → lateral. Affirmation → booking accepted |
| `core.facts` | ✅ | `affirmation:` fact → booking accepted flow |
| `ctx.extraction` | ✅ | Resolución de slots, tarifas, estados |
| `purchaseIntent` | ❌ | No se consulta |
| `slotAssignmentConfidence` | ❌ | No se usa |

---

## 4. Señales ignoradas (gaps reales)

| Señal | Origen | Destino esperado | Gap |
|---|---|---|---|
| `purchaseIntent` | CORE | Policy / UX | ⚠️ Solo usado para LLM gating. No modifica comportamiento de Policy |
| `slotAssignmentConfidence` | CORE | Policy / confidence | ❌ Nunca leído downstream |
| `urgency:` fact | CORE | Router / Policy | ❌ Router solo usa `intent`. Policy no diferencia urgencia dentro del mismo intent |
| `commercial:` fact | CORE | Policy | ❌ Solo visible indirectamente via `resolveNextRequiredField` |
| `informational:` fact | CORE | Policy | ❌ Idem |
| `pre_booking:` fact | CORE | Policy | ❌ Idem |
| `MessageType` | Conversation Interpreter | Router / Policy | ❌ Solo se loggea. No participa en decisiones |
| `classification.isClarification` | Conversation Interpreter | Entity extraction | ⚠️ Usado parcialmente (B3 fix: guard contra destination default) |

---

## 5. Puntos de pérdida

### Punto de pérdida 1: Router ignora purchaseIntent (crítico)

```typescript
// router.ts:14-31
function coreToOutputType(c: CoreDecision): { outputType: OutputType; reason: string } {
  const { intent, confidence } = c;  // ← NO usa purchaseIntent
  // ...
}
```

**Impacto**: `purchaseIntent="high"` y `purchaseIntent="low"` producen exactamente el mismo outputType para un mismo intent. No hay diferencia entre un pasajero que especula ("estoy viendo") y uno que compra ("somos 4, vamos mañana").

### Punto de pérdida 2: Handler no pasa purchaseIntent a Policy

```typescript
// handler.ts:111-112
const isLowIntent = decision.core.purchaseIntent === "low";
const skipLLM = (isExecute && !hasPlaceholder) || isLowIntent;
// purchaseIntent solo se usa aquí, no se pasa a buildDomainPolicy
```

**Impacto**: Las policies `policyAhora` y `policyReserva` reciben cero información sobre purchaseIntent. Podrían adaptar preguntas, velocidad, o cierre, pero no lo hacen.

### Punto de pérdida 3: slotAssignmentConfidence no persiste

En `core.ts` se genera `slotAssignmentConfidence` con valores como `origin: 0.95` ("estoy en X") y `destination: 0.80` ("hasta Y"). Pero:
- No se persiste en DB
- No se pasa al ExtractionContext
- `buildExtractionContext` no lo recibe

**Impacto**: La confianza de asignación sintáctica (qué tan seguro está el CORE de que "X" es origin y no destination) se pierde. El LLM de extracción podría beneficiarse de esta señal.

### Punto de pérdida 4: Conversation Interpreter no influye en decisiones

```typescript
// lead.service.ts:80-87
const classification = interpretMessage({...});
log.info("[INTERPRETER]", { classification: classification.type, ... });
// Solo logging — no afecta routing ni policy
```

**Impacto**: El CI clasifica el rol conversacional (clarification, correction, answer, etc.) pero esta clasificación no se usa para nada operativo. Ni Router ni Policy la reciben.

---

## 6. Impacto UX

### Caso 1: Exploración vs Compra

| Señal | "Cuánto cuesta Cataratas?" | "Somos 4, vamos mañana" |
|---|---|---|
| CORE intent | `COMMERCIAL` | `BOOKING` |
| purchaseIntent | `low` (sin señales operativas fuertes) | `high` (passengers + date signals) |
| Router | ANSWER | EXECUTE |
| Policy | buildPriceInfo (precio fijo) | buildConfirmationMessage + dispatch |
| **UX actual** | Mismo para low y high → Igual de propositivo | Correcto |
| **UX ideal** | Low: respuesta breve, no forzar booking. High: cerrar rápido, propuesta directa | Ya correcto |

**Hallazgo**: purchaseIntent = low no modifica el tono. Un pasajero que pregunta especulativamente recibe el mismo tratamiento que uno listo para comprar. El LLM gate evita el costo, pero no cambia la estrategia conversacional.

### Caso 2: Urgencia

| Señal | "Estoy en el aeropuerto" (sin fecha) |
|---|---|
| CORE facts | `["origin:aeropuerto", "action:estoy"]` |
| purchaseIntent | `medium` (no high signals) |
| Router | EXECUTE (intent=BOOKING) |
| Policy | Pregunta por horario/pasajeros |
| **UX ideal** | Detectar que está en aeropuerto + sin fecha → probable urgencia implícita → acelerar flujo NOW |

**Hallazgo**: `urgency:` fact existe pero no se usa. El Router no diferencia "BOOKING con urgencia" de "BOOKING sin urgencia". Policy-ahora y policy-reserva no tienen acceso a `facts`.

### Caso 3: Pregunta literal con necesidad oculta

| Señal | "¿Tienen autos?" |
|---|---|
| CORE intent | `INFORMATIONAL` o `AMBIGUOUS` |
| facts | `["query:tienen", "informational:tienen"]` |
| Router | ANSWER o SAFE_FALLBACK |
| Policy | Respuesta informativa genérica |
| **UX ideal** | Detectar posible necesidad de confianza/disponibilidad → respuesta tranquilizadora + oferta de cotización |

**Hallazgo**: No existe señal semántica para diferenciar "¿tienen autos?" (confianza) de "¿tienen servicio a Cataratas?" (info). El sistema no puede adaptar la respuesta.

---

## 7. Cambios mínimos necesarios

### 🔴 Crítico (afecta decisiones operativas)

| # | Cambio | Archivo | Esfuerzo |
|---|---|---|---|
| C1 | Pasar `purchaseIntent` al `HandlerContext` y consumirlo en policies | `handler.ts:40-68`, `policy-ahora.ts`, `policy-reserva.ts` | Bajo |
| C2 | Agregar `purchaseIntent` al `ExtractionContext` o `HandlerContext` para que policies decidan | `types.ts` (HandlerContext) | Bajo |

### 🟡 Importante (mejora calidad de decisión)

| # | Cambio | Archivo | Esfuerzo |
|---|---|---|---|
| C3 | Exponer `urgency:` y `commercial:` facts a las policies para adaptar tono | `handler.ts` → `buildDomainPolicy` | Bajo |
| C4 | Conectar `classification.type` del Conversation Interpreter al contexto de decisión | `handler.ts` → `HandlerContext` | Medio |
| C5 | Persistir `slotAssignmentConfidence` y pasarlo al ExtractionContext | `build-extraction-context.ts` | Medio |

### 🟢 Mejora (futuro)

| # | Cambio | Archivo | Esfuerzo |
|---|---|---|---|
| C6 | Diseñar `client_objective` (E12) para diferenciar consulta vs compra dentro del mismo intent | Diseño conceptual | Alto |
| C7 | Usar `purchaseIntent` en `resolveNextRequiredField` para priorizar preguntas | `field-resolver.ts` | Bajo |

---

## 8. Relación con E10 — Context Persistence

E10 identificó que `last_intent` y `client_objective` no se persisten en `chat_sessions`. La auditoría E11 confirma:

- **last_intent**: `memory.sessionMemory.lastIntent` se consulta (lead.service.ts:74) pero no se escribe desde el handler/pipeline. La señal existe pero no persiste entre turnos.
- **client_objective**: No existe. Sin él, no hay manera de diferenciar "este COMMERCIAL es una exploración" de "este COMMERCIAL es parte de una compra en curso".

Ambos gaps convergen: E11 demuestra que aunque `purchaseIntent` exista en una request, no persiste entre requests. E10 propone persistirlo como `last_intent` + `client_objective`.

---

## 9. Relación con E12 — Client Objective Model

E12 (propuesto) define `client_objective` como:
- `booking_urgent`: pasajero listo para comprar ahora
- `booking_future`: pasajero planea viaje futuro
- `inquiry_price`: pasajero consulta precio sin compromiso
- `comparing_options`: pasajero compara alternativas
- `trust_check`: pasajero evalúa confiabilidad del servicio
- `info_request`: pasajero busca información factual

La auditoría E11 confirma que:
1. **`purchaseIntent` cubre parcialmente** `booking_urgent` (high) vs `inquiry_price` (low), pero falta granularidad
2. **`urgency:` fact podría alimentar** `booking_urgent` vs `booking_future`
3. **`commercial:` + `informational:` facts podrían alimentar** `inquiry_price`, `comparing_options`, `info_request`
4. **`trust_check` no tiene cobertura** — no hay señal actual que lo detecte

**Recomendación**: Implementar primero C1-C2 (purchaseIntent en Policy, esfuerzo bajo) y diseñar E12 como evolución natural apoyada en los facts existentes.

---

## 10. Prioridad recomendada

| Prioridad | Cambio | Impacto | Esfuerzo |
|---|---|---|---|
| P1 | **C1-C2**: purchaseIntent en HandlerContext y Policy | Alto — Policy puede adaptar comportamiento comercial | Bajo (~20L) |
| P2 | **C3**: urgency/commercial facts en Policy | Medio — mejora tono conversacional | Bajo (~15L) |
| P2 | **C7**: purchaseIntent en resolveNextRequiredField | Medio — prioriza preguntas según intención | Bajo (~10L) |
| P3 | **C4**: Conectar classification.type al HandlerContext | Medio — pipeline consciente del rol del mensaje | Medio |
| P3 | **C5**: Persistir slotAssignmentConfidence | Bajo — métrica secundaria | Medio |
| P3 | **C6**: Diseñar client_objective (E12) | Alto — transformacional | Alto |

---

## Respuesta obligatoria

**"¿AITOS ya tiene inteligencia semántica que actualmente no está participando en sus decisiones operativas?"**

**Sí.** AITOS genera en CORE al menos 3 señales semánticas que no participan en decisiones operativas:

1. **`purchaseIntent`** — clasifica la intención comercial del pasajero (high/medium/low) pero solo se usa para gatear LLM. No modifica el comportamiento de Router ni Policy. Dos pasajeros con el mismo intent pero distinta intención de compra reciben exactamente el mismo tratamiento.

2. **`slotAssignmentConfidence`** — cuantifica la confianza sintáctica de asignación de roles (origin/destination) pero nunca se lee downstream.

3. **`urgency:` facts** — existen en el array de facts pero Router y Policy no los consultan directamente. La urgencia solo influye indirectamente a través del intent (NOW vs BOOKING).

Además, el **Conversation Interpreter** (ADR-007) clasifica el rol conversacional de cada mensaje (clarification, correction, confirmation, etc.) pero esta clasificación solo se loggea — no influye en routing ni en políticas.

**La hipótesis inicial se confirma parcialmente**: CORE genera señales útiles que no llegan a Policy, pero la magnitud es menor a la esperada. Los gaps principales son conectividad (purchaseIntent → Policy) y granularidad (no existe client_objective), no ausencia de información.

El cambio de mayor impacto con menor esfuerzo es conectar `purchaseIntent` al flujo de decisión de Policy.
