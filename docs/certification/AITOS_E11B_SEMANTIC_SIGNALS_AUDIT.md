# AITOS-E11-B — Semantic Signals Remaining Audit
## 2026-07-08 | Read-only analysis

---

## 1. Estado actual después de C1-C2

Señales de `CoreDecision` y su conexión downstream:

| Señal | CORE → Router | Router → Handler | Handler → Policy | Policy → UX |
|---|---|---|---|---|
| `intent` | ✅ | ✅ | ✅ | ✅ |
| `confidence` | ✅ | ✅ | ✅ | ✅ |
| `facts` | ❌ (no iterados) | ✅ (vía resolveNextRequiredField) | ✅ (vía facts param) | ✅ (vía field-resolver) |
| `purchaseIntent` | ❌ | ✅ (nuevo en C1-C2) | ✅ (nuevo en C1-C2) | ✅ (observable) |
| `slotStability` | ❌ | ❌ | ⚠️ (solo en ExtractionContext, vía buildExtractionContext) | ❌ |
| `roleLock` | ❌ | ❌ | ⚠️ (solo en ExtractionContext) | ❌ |
| `slotAssignmentConfidence` | ❌ | ❌ | ❌ | ❌ |
| `lateral` | ❌ | ❌ | ❌ | ❌ |

---

## 2. Matriz de señales pendientes

### Señales de CORE (facts array)

| Señal | Existe | Generador | Consumidor actual | Valor UX | Acción |
|---|---|---|---|---|---|
| `urgency:` fact | ✅ core.ts:187 | `URGENCY_RE` | `temporalFromFacts`, `classifyIntent`, `computeConfidence`, log | **Medio-alto**: permite detectar inmediatez sin compromiso de booking | **Conectar a Policy** |
| `commercial:` fact | ✅ core.ts:226 | `COMMERCIAL_RE` | `classifyIntent` → intent COMMERCIAL | **Bajo**: ya capturado por intent | Mantener |
| `informational:` fact | ✅ core.ts:223 | `INFORMATIONAL_RE` | `classifyIntent` → intent INFORMATIONAL | **Bajo**: ya capturado por intent | Mantener |
| `pre_booking:` fact | ✅ core.ts:229 | `PRE_BOOKING_RE` | `classifyIntent` → intent PRE_BOOKING | **Bajo**: ya capturado por intent | Mantener |
| `airport_mention:` fact | ✅ core.ts:253 | `AIRPORT_MENTION_RE` | Solo se genera. No se consume downstream | **Medio**: detecta pasajeros que llegan en avión sin código de vuelo | **Conectar a Policy** |
| `affirmation:` fact | ✅ core.ts:215 | `AFFIRMATION_RE` | `classifyIntent`, `policy-reserva.ts:151` (booking accepted) | **Alto**: gatilla flujo de confirmación | Mantener (ya conectado) |
| `location_ambiguous:` fact | ✅ core.ts:211 | `AMBIGUOUS_LOCATION_RE` | `classifyIntent`, `startAmbiguityResolution`, `field-resolver` | **Alto**: gatilla resolución de ambigüedad | Mantener (ya conectado) |
| `origin_stability:` / `destination_stability:` | ✅ core.ts:259-260 | `detectStructure` | Solo logging | **Medio**: indica si slot necesita refinamiento | **Conectar a Policy** |
| `flight:` fact | ✅ core.ts:203 | `FLIGHT_RE` | `classifyIntent`, `HIGH_INTENT_SIGNALS` | **Medio**: señal de viaje aéreo | Mantener (indirecto) |
| `passengers:` fact | ✅ core.ts:199 | `PAX_RE` | `classifyIntent`, `resolveNextRequiredField` | **Alto**: cantidad de pasajeros | Mantener (ya conectado) |
| `date:` / `time:` facts | ✅ core.ts:205-209 | `DATE_RE`, `TIME_RE` | `temporalFromFacts`, `classifyIntent` | **Alto**: define temporalidad | Mantener (ya conectado) |

### Señales estructurales

| Señal | Existe | Generador | Consumidor actual | Valor UX | Acción |
|---|---|---|---|---|---|
| `slotAssignmentConfidence` | ✅ core.ts:83 | `detectStructure` | `ambiguity-handler.ts:122-123` (confidence matrix) | **Medio**: cuantifica certeza de asignación sintáctica | **Conectar parcialmente a Policy** |
| `slotStability` | ✅ core.ts:82 | `detectStructure` | Extraction pipeline (vía roleLock + slotStability como hint para LLM), `buildExtractionContext` | **Alto**: locked = no reinterpretar, ambiguous = necesito confirmar | Mantener (conectado a extraction) |
| `classification.type` (MessageType) | ✅ CI:38 | `interpretMessage` | Solo logging (`lead.service.ts:87`) | **Alto**: diferencia confirmación vs corrección vs exploración | **Conectar a Policy** |
| `classification.isClarification` | ✅ CI | `interpretMessage` | Parcialmente en `entity-extractor.ts` (B3 fix) | **Alto**: previene asignación default en clarifications | Mantener (ya conectado a entity-extractor) |
| `classification.isCorrection` | ✅ CI | `interpretMessage` | No se consume | **Alto**: permite manejo especial de correcciones | **Conectar a Policy** |

---

## 3. Fase 2 — Slot Assignment Confidence

### Estado actual

`slotAssignmentConfidence` es generado por `detectStructure()` en `core.ts`:

| Patrón sintáctico | Slot | Confidence |
|---|---|---|
| `"estoy en {X}"` | origin | 0.95 |
| `"desde {X}"` | origin | 0.85 |
| `"ir a {Y}"` | destination | 0.90 |
| `"hasta {Y}"` | destination | 0.80 |
| `"origen: X destino: Y"` | ambos | 0.95 |

### Consumidor actual

**Único**: `ambiguity-handler.ts:122-123` — se usa en la matriz de confianza para resolver ubicaciones ambiguas:

```typescript
const slotConfOrigin = leadCore.slotAssignmentConfidence?.origin ?? 0;
const slotConfDest = leadCore.slotAssignmentConfidence?.destination ?? 0;
const originSlotHigh = slotConfOrigin >= 0.80;
```

Si la confianza de asignación sintáctica es alta (≥0.80), el sistema prioriza la asignación del CORE sobre candidatos de entidad.

### ¿Debe influir en Policy?

**No directamente.** La confianza de asignación sintáctica (rol semántico) es diferente de la confianza de entidad (ubicación específica). Policy trabaja con valores de slots ya resueltos; la confianza de qué rol tiene cada slot es un problema de CORE y extraction, no de policy.

Sin embargo, hay un caso donde **sí debería influir indirectamente**: via `slotStability`. Si `slotAssignmentConfidence` está disponible, podría alimentar `slotStability` más granularmente (ej: "locked" con confianza 0.95 vs "locked" con 0.80). Policy ya lee `slotStability` del ExtractionContext.

### Recomendación

| Acción | Detalle | Prioridad |
|---|---|---|
| Mantener en `ambiguity-handler.ts` | Ya cumple su función | ✅ |
| NO conectar a Policy | La confianza de rol pertenece a CORE/extraction | — |
| ✅ Mejorar | Pasar slotStability más granular si la confianza es media (0.70-0.85) para que Policy pueda pedir confirmación más agresivamente | P3 |

**Pero atención**: `slotStability` ya existe y Policy ya lo recibe via `ExtractionContext.slotStability`. El refinamiento sería cuantitativo (valores numéricos) no cualitativo (locked/open/ambiguous). Valor marginal para Policy.

**Veredicto**: Mantener sin cambios. Pertenece a CORE.

---

## 4. Fase 3 — Urgency como señal independiente

### Estado actual

**Dos representaciones coexisten:**

1. **`urgency:` fact** — generado por `URGENCY_RE` en `core.ts:186-187`:
   ```typescript
   const URGENCY_RE = /\b(ahora|ya|inmediato|urgente|hoy|enseguida)\b/i;
   if (u) facts.push(`urgency:${u[1].toLowerCase()}`);
   ```

2. **`now:` fact** — generado por `NOW_RE` en `core.ts:234-235`:
   ```typescript
   const NOW_RE = /\b(ahora|inmediato|urgente|...)\b/i;
   if (n) facts.push(`now:${n[1].toLowerCase()}`);
   ```

**Diferencia**: `URGENCY_RE` y `NOW_RE` tienen patrones muy similares pero no idénticos. Ambos capturan "ahora", "inmediato", "urgente". `URGENCY_RE` adicionalmente captura "ya", "hoy", "enseguida". `NOW_RE` captura frases más largas ("lo antes posible", "necesito ya", "para ahora", "ya mismo", "al toque").

### Consumo actual

| Consumidor | Cómo | Impacto |
|---|---|---|
| `temporalFromFacts` | `hasNow = now: || urgency:` → TemporalMode = NOW | ⚠️ Fusiona ambas en el mismo valor |
| `classifyIntent` | `has("now:") || has("urgency:")` → intent NOW | ⚠️ Ídem |
| `computeConfidence` | Cuenta como señal explícita (+0.1 base) | Bajo |
| `hasNowSignal` | `now: || urgency:` → boolean | ⚠️ Fusiona |
| `detectPurchaseIntent` | `urgency:` en HIGH_INTENT_SIGNALS → purchaseIntent=high | Medio |
| `lead.service.ts:213` | Logging separado (`nowFacts` vs `urgencyDetected`) | Solo observabilidad |
| `policy-pipeline.ts:98` | `temporalFromFacts(leadCore.facts)` → decide AHORA vs RESERVA | **Crítico** |

### ¿A o B?

**Respuesta: B) dimensión transversal del contexto.**

La urgencia no es una propiedad derivada del intent. Contraejemplos:

| Mensaje | Intent | Urgencia real |
|---|---|---|
| `"Estoy en el aeropuerto, necesito ir al centro"` | BOOKING | **Alta** (contexto aeropuerto → viaje inminente) |
| `"Viajo mañana temprano al centro"` | BOOKING | **Media** (fecha futura, hay plan) |
| `"Quiero ir a Cataratas la semana que viene"` | BOOKING | **Baja** (futuro lejano, planeación) |
| `"Ahora mismo, urgente, del aeropuerto al centro"` | NOW | **Alta** (explícita) |

Los tres primeros tienen `intent=BOOKING` pero urgencia muy distinta. El intent solo captura NOW vs BOOKING, no la granularidad de urgencia dentro de BOOKING.

### Gap

Policy no recibe `urgency:` como señal independiente. El flujo actual pierde granularidad:

```
urgency fact → temporalFromFacts → TemporalMode (NOW/FUTURE/UNKNOWN)
                                                  ↓
                              operationalModeFromIntent(intent, temporal)
                                                  ↓
                              AHORA vs RESERVA (decisión binaria)
```

La urgencia se reduce a una decisión AHORA/RESERVA. No hay adaptación de:
- **Tono**: urgente → más directo, menos opciones
- **Velocidad**: urgente → menos preguntas, propuesta rápida
- **Prioridad**: urgente → preguntar primero lo operativo

### Recomendación

| Acción | Prioridad |
|---|---|
| Exponer `urgency:` fact como señal a Policy (similar a purchaseIntent) | **P2** |
| NO crear modelo separado — el `urgency:` fact del CORE es suficiente | — |
| NO persistir — la urgencia es por-mensaje, no necesita estado entre turnos | — |

**Veredicto**: Conectar a Policy como señal independiente (no solo fusionada en TemporalMode).

---

## 5. Fase 4 — Conversation Interpreter (ADR-007)

### Estado actual

`conversation-interpreter.ts` produce 12 `MessageType` valores:

| Tipo | Detecta | ¿Consumido? |
|---|---|---|
| `new_request` | Mensaje fresco sin contexto previo | ❌ Solo log |
| `clarification` | Respuesta corta en conversación activa | ❌ Solo log |
| `correction` | Marcadores explícitos de corrección | ❌ Solo log |
| `confirmation` | Afirmación/negación en estados awaiting | ❌ Solo log |
| `selection` | (no implementado actualmente) | — |
| `answer` | Respuesta numérica/temporal a pregunta específica | ❌ Solo log |
| `continuation` | (no implementado actualmente) | — |
| `topic_change` | (no implementado actualmente) | — |
| `cancel` | Cancelación explícita | ❌ Solo log |
| `inquiry` | Pregunta informativa sin ubicaciones | ❌ Solo log |
| `small_talk` | Saludo sin contexto | ❌ Solo log |
| `other` | Default | ❌ Solo log |

El único consumo real del CI es el **B3 fix** en `entity-extractor.ts`, que usa `isClarification` parcialmente (el CI se ejecuta en lead.service.ts, el guard en entity-extractor usa lógica separada, no el mismo `classification`).

### Gap

El sistema sabe que el mensaje actual es una `confirmation`, `clarification`, `correction`, o `cancel`, pero esta información no influye en:

- **Router**: no cambia el outputType
- **Policy**: no adapta el tono o la estrategia
- **Handler**: no modifica el dominio
- **Response builder**: no selecciona template distinto

### Casos concretos

| MessageType | Lo que AITOS sabe | Lo que AITOS hace |
|---|---|---|
| `confirmation` | "El usuario confirmó" | Policy lo detecta por `affirmation:` fact + estado workflow |
| `correction` | "El usuario corrigió un slot" | Solo logging, extractor maneja por separado |
| `clarification` | "El usuario respondió a una pregunta" | Solo logging |
| `cancel` | "El usuario quiere cancelar" | Solo logging (no influye en policy) |
| `inquiry` | "El usuario pregunta información" | Solo logging (el intent ya captura COMMERCIAL/INFORMATIONAL) |

### Lo que NO se puede hacer sin el CI

El `affirmation:` fact detecta "sí" pero no diferencia entre:
- `confirmation` (confirmando una propuesta) → Policy debe ejecutar
- `answer` (respondiendo una pregunta) → Policy debe seguir preguntando
- `continuation` (siguiendo el flujo normal) → Policy debe continuar

Hoy AITOS detecta `affirmation:true` y mira el `conversationalState` para decidir. El CI refinaría esta decisión, pero el estado workflow ya cubre este caso parcialmente.

### ¿Debe influir?

| MessageType | ¿Influir en Router? | ¿Influir en Policy? | Prioridad |
|---|---|---|---|
| `correction` | No (Router usa intent) | **Sí** — evitar reseteo, preservar contexto | **P2** |
| `cancel` | **Sí** — SALIDA_DIRECTA vs CLARIFY | **Sí** — respuesta de cancelación | **P2** |
| `confirmation` | No | Ya cubierto por workflow state | P3 |
| `clarification` | No | Ya cubierto por conversationalState | P3 |
| `inquiry` | No | Ya cubierto por intent | Mantener |
| `new_request` | No | Default | Mantener |

### Recomendación

| Acción | Prioridad |
|---|---|
| Conectar `correction` y `cancel` a Policy para manejo explícito | **P2** |
| El resto de MessageTypes ya están cubiertos por otros mecanismos (intent, workflow state, facts) | Mantener |
| NO reemplazar el workflow state con el CI — son complementarios | — |

**Veredicto**: El CI tiene valor en casos de borde (corrections, cancellations). Para el flujo normal, el intent + workflow state ya cubren el comportamiento.

---

## 6. Señales candidatas a E12 (Client Objective Model)

Propuesta de separación: qué señales existentes deberían alimentar `client_objective` y cuáles deben permanecer como context attributes.

### Deberían formar parte de client_objective

| Señal actual | Atributo E12 candidato | Justificación |
|---|---|---|
| `purchaseIntent = high` + `urgency:ahora` + `now:ahora` | `booking_urgent` | Compra activa con urgencia temporal |
| `purchaseIntent = high` + `date:` / `time:` | `booking_future` | Compra activa con fecha planificada |
| `purchaseIntent = low` + `commercial:` | `inquiry_price` | Consulta de precio sin compromiso |
| `purchaseIntent = low` + `pre_booking:` | `comparing_options` | Comparación sin decisión |
| `informational:` + sin ubicaciones | `info_request` | Búsqueda factual |
| `airport_mention:` | Señal de contexto (no objective) | Context attribute |
| `affirmation:` / `classification:correction` | Evento transaccional (no objective) | Context attribute |

### Deberían permanecer como context attributes

| Señal | Motivo |
|---|---|
| `slotAssignmentConfidence` | Pertenece a CORE/extraction, no al modelo de cliente |
| `slotStability` | Mecanismo de extracción, no de intención |
| `roleLock` | Idem |
| `classification.type` (MessageType) | Rol del mensaje actual, no del cliente |
| `confidence` (core) | Confianza general del sistema, no del cliente |
| `facts` individuales | Demasiado granulares para E12 |

### Mapa E12 → Señales existentes

```
client_objective
├── booking_urgent    ← purchaseIntent=high + urgency: + now: (+ airport_mention: como refuerzo)
├── booking_future    ← purchaseIntent=high + date: + time: (+ flight: como refuerzo)
├── inquiry_price     ← purchaseIntent=low/medium + commercial: (+ query: como refuerzo)
├── comparing_options ← purchaseIntent=low + pre_booking: (+ informational: como refuerzo)
├── trust_check       ← ❌ NO CUBIERTO (no existe señal actual)
└── info_request      ← informational: + greeting: (+ consulta: como refuerzo)
```

---

## 7. Matriz completa actualizada

| # | Señal | Conectada a Policy | Prioridad restante |
|---|---|---|---|
| 1 | `purchaseIntent` | ✅ C1-C2 completado | — |
| 2 | `urgency:` fact | ❌ Pendiente | **P2** |
| 3 | `commercial:` fact | ❌ No necesita (ya en intent) | Mantener |
| 4 | `airport_mention:` fact | ❌ Pendiente | **P3** |
| 5 | `classification.type` (correction, cancel) | ❌ Pendiente | **P2** |
| 6 | `classification.type` (otros) | ❌ No necesita (cubiertos por workflow) | Mantener |
| 7 | `slotAssignmentConfidence` | ❌ No necesita (pertenece a CORE) | Mantener |
| 8 | `slotStability` granular | ⚠️ Parcial (solo locked/open/ambiguous) | Mantener |
| 9 | `origin_stability:` / `destination_stability:` facts | ❌ Pendiente | **P3** |

### Prioridades finales

| Prioridad | Señal | Acción | Impacto UX | Esfuerzo |
|---|---|---|---|---|
| **P2** | `urgency:` fact | Exponer a Policy como señal independiente (no solo fusionada en TemporalMode) | Medio — adaptar tono según urgencia | Bajo (~15L) |
| **P2** | `classification.type` (correction/cancel) | Conectar a Policy para manejo explícito | Medio — mejor manejo de correcciones y cancelaciones | Medio (~30L) |
| **P3** | `airport_mention:` fact | Exponer a Policy para adaptar preguntas (ej: "¿Necesitás que te esperemos con cartel?") | Bajo — caso de borde | Bajo (~10L) |
| **P3** | `origin_stability:` / `destination_stability:` facts | Exponer a Policy para decidir si preguntar por dirección exacta | Bajo — slotStability ya existe en ExtractionContext | Bajo (~10L) |

---

## 8. Relación con E10 — Context Persistence

| Señal | ¿Persiste? | ¿Debería persistir? | Observación |
|---|---|---|---|
| `purchaseIntent` | ❌ | **Sí** (P2-10 ya lo contempla como `last_intent`) | El valor cambia por mensaje, pero la tendencia es relevante |
| `urgency:` | ❌ | **No** | Urgencia es por-mensaje, no necesita estado entre turnos |
| `airport_mention:` | ❌ | **No** | Es contexto temporal |
| `classification.type` | ❌ | **No** | Es clasificación del mensaje actual, no del cliente |
| `slotAssignmentConfidence` | ❌ | **No** | Pertenece a CORE, no al contexto persistente |

El único candidato real a persistir es `purchaseIntent` (como parte de `last_intent` en E10). El resto son señales transaccionales.

---

## 9. Relación con E12 — Client Objective

La separación de responsabilidades entre señales actuales y E12:

| Capa | Componente | Responsabilidad |
|---|---|---|
| **CORE** | `core.ts` | Genera facts, intent, purchaseIntent, slotAssignmentConfidence |
| **Conversation Interpreter** | `conversation-interpreter.ts` | Clasifica el ROL del mensaje actual (no la intención del cliente) |
| **Extraction Pipeline** | `extraction-runner.ts` | Resuelve entidades, calcula confianza de slots |
| **Client Objective (E12)** | *Por diseñar* | Agrega señales en client_objective: booking_urgent, inquiry_price, etc. |
| **Context Persistence (E10)** | `chat_sessions` | Persiste last_intent + client_objective entre turnos |

**No hay superposición**: E12 consumerá señales de CORE (purchaseIntent, urgency, commercial, informational) y las sintetizará en un modelo de objetivo de cliente. E10 persistirá ese modelo. E11-B identificó qué señales deben alimentar cada uno.

---

## 10. Respuesta obligatoria

**"Después de purchaseIntent, ¿qué otra inteligencia existente de AITOS está esperando ser utilizada?"**

**Dos señales con impacto UX claro:**

1. **`urgency:` fact** — AITOS ya detecta palabras de urgencia (`ahora`, `ya`, `urgente`, `inmediato`) y las almacena como fact, pero Policy no las recibe como señal independiente. La urgencia se fusiona en `TemporalMode` (NOW/FUTURE) y se pierde la granularidad. Un BOOKING con urgencia alta ("estoy en el aeropuerto") recibe el mismo tratamiento que un BOOKING sin urgencia ("viajo la semana que viene"). **Conectar a Policy permitiría adaptar tono, velocidad de preguntas, y cierre.**

2. **`classification.type` (correction/cancel)** — El Conversation Interpreter ya clasifica si el usuario está corrigiendo o cancelando, pero esta clasificación solo se loggea. El sistema hoy detecta correcciones y cancelaciones por otros medios (workflow state + facts), pero el CI podría ser una fuente más directa y temprana.

**Además, con valor marginal:**

3. **`airport_mention:` fact** — Detecta pasajeros que llegan en avión sin código de vuelo. Podría usarse para ofrecer espera con cartel.
4. **`origin_stability:` / `destination_stability:` facts** — Ya existen como metadato en ExtractionContext.slotStability pero no se usan en decisiones de Policy.

**La inteligencia existe. Falta conectividad, no generación.**
