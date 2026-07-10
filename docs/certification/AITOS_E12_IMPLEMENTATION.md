# AITOS-E12 — Client Objective Model
## 2026-07-08 | Implementation

---

## 1. ¿Qué es Client Objective?

El modelo de **objetivo del cliente (client_objective)** responde la pregunta fundamental:  
**"¿Qué quiere lograr este pasajero en este turno conversacional?"**

A diferencia del `intent` (qué tipo de acción) o `purchaseIntent` (qué tan cerca de comprar),  
`client_objective` sintetiza múltiples señales en un valor discreto que describe el **objetivo final del pasajero**.

### Valores posibles

| Valor | Señal de entrada | Interpretación |
|---|---|---|
| `booking_urgent` | purchaseIntent=high + urgency:/now: fact | El pasajero quiere viajar YA |
| `booking_future` | purchaseIntent=high + date:/time: fact | El pasajero planea un viaje futuro |
| `booking_generic` | purchaseIntent=high sin temporales | El pasajero quiere reservar (sin especificar cuándo) |
| `inquiry_price` | commercial: fact presente + purchaseIntent NOT high | El pasajero solo pregunta precio |
| `comparing_options` | pre_booking: fact presente | El pasajero compara alternativas |
| `trust_check` | Nueva detección E12 (TRUST_CHECK_RE) | El pasajero necesita confianza/seguridad |
| `info_request` | informational: fact presente | El pasajero busca información factual |
| `cancelling` | messageType="cancel" | El pasajero quiere cancelar |
| `none` | Sin señales claras | Objetivo no detectable |

---

## 2. Arquitectura

```
CORE (core.ts)
├── facts[] ──────────────────────┐
├── purchaseIntent ───────────────┤
├── intent ───────────────────────┤
│                                 │
Conversation Interpreter          │
├── messageType ──────────────────┤
│                                 │
Input text (userText) ────────────┤
                                  ▼
                    computeClientObjective()
                    (client-objective.ts)
                           │
                           ▼
                    HandlerContext.clientObjective
                           │
               ┌───────────┼───────────┐
               ▼           ▼           ▼
        policy-ahora  policy-reserva  LLM prompt
        (skip fields  (inquiry_price  (adapta tono
         en urgent)    guard)          y estrategia)
```

### Principios

1. **No duplicar señales**: Usa facts, purchaseIntent, messageType existentes. No crea nuevos regex en CORE.
2. **Excepción única**: `trust_check` requiere nueva detección (no existía señal previa).
3. **Función pura**: `computeClientObjective()` no tiene side effects, no es async, no depende de DB.
4. **Backward compatible**: `clientObjective` es opcional en HandlerContext. Tests existentes reciben `"none"`.

---

## 3. Módulo: `client-objective.ts`

**Ubicación**: `src/lib/ai/client-objective.ts`

### API

```typescript
function computeClientObjective(
  facts: string[],
  purchaseIntent?: string,
  messageType?: string,
  userText?: string,
): ClientObjective
```

### Orden de evaluación

1. **trust_check** — si el texto del usuario matchea TRUST_CHECK_RE
2. **cancelling** — si messageType === "cancel"
3. **booking_urgent** — purchaseIntent=high + urgency:/now: fact
4. **booking_future** — purchaseIntent=high + date:/time: fact
5. **booking_generic** — purchaseIntent=high sin señales temporales
6. **inquiry_price** — commercial: fact presente + purchaseIntent NOT high
7. **comparing_options** — pre_booking: fact presente
8. **info_request** — informational: fact presente
9. **none** — default

### Nueva señal: trust_check

```typescript
const TRUST_CHECK_RE = /\b(confianz|confiable|segur[oa]|garant[ií]a|
  recomendad[oa]|referencia|estafa|fiable|seriedad|son\s+confiables|
  es\s+seguro|me\s+d[aa]s?\s+confianza|conf[ií]o)\b/i;
```

Cubre: español, portugués (confianz, confiável, segurança), inglés (en menor medida).

---

## 4. Cambios por archivo

### `src/lib/ai/types.ts`
- Nuevo type: `ClientObjective` (9 valores: booking_urgent, booking_future, booking_generic, inquiry_price, comparing_options, trust_check, info_request, cancelling, none)
- Nuevo campo: `HandlerContext.clientObjective?: ClientObjective`

### `src/lib/ai/client-objective.ts` (NUEVO)
- Función pura `computeClientObjective()`
- Regex `TRUST_CHECK_RE` para detectar preocupaciones de confianza
- Helpers internos: `detectTrustCheck()`, `hasUrgency()`, `hasDateOrTime()`
- Sin dependencias circulares

### `src/lib/ai/handler.ts`
- Importa `computeClientObjective`
- Llama `computeClientObjective(facts, purchaseIntent, messageType, input)` en la fase de enriquecimiento
- Agrega `clientObjective` a `enrichedCtx`
- Loggea `clientObjective` en `[ROUTING]`

### `src/lib/ai/policy-ahora.ts`
- Log incluye `clientObjective`
- **Optimización**: `booking_urgent` + EXECUTE + BOOKING → skip field resolution, dispatch directo

### `src/lib/ai/policy-reserva.ts`
- Log incluye `clientObjective`
- **Guard**: `inquiry_price` inhibe la ruta de booking accepted (affirmation no se interpreta como confirmación)

### `src/lib/ai/llm-response.ts`
- Inyecta `Client objective: {valor}` en el contexto del prompt
- Agrega regla específica por cada clientObjective (10 reglas por idioma: es, en, pt)
- Ej: `booking_urgent` → "Sé muy directo. NO preguntes adicionales."
- Ej: `inquiry_price` → "No intentes cerrar un booking. Dá solo el precio."
- Ej: `trust_check` → "Respondé con confianza. TaxiGuazú opera desde 2019."

---

## 5. Cobertura de señales

### Señales existentes reutilizadas (sin modificar)

| Señal | Origen | Uso en E12 |
|---|---|---|
| `purchaseIntent` | core.ts:detectPurchaseIntent | Diferencia high→booking vs low→inquiry |
| `urgency:` fact | core.ts:URGENCY_RE | booking_urgent |
| `now:` fact | core.ts:NOW_RE | booking_urgent |
| `date:` fact | core.ts:DATE_RE | booking_future |
| `time:` fact | core.ts:TIME_RE | booking_future |
| `commercial:` fact | core.ts:COMMERCIAL_RE | inquiry_price |
| `pre_booking:` fact | core.ts:PRE_BOOKING_RE | comparing_options |
| `informational:` fact | core.ts:INFORMATIONAL_RE | info_request |
| `messageType` | conversation-interpreter.ts | cancelling |

### Nueva señal (única)

| Señal | Origen | Propósito |
|---|---|---|
| `TRUST_CHECK_RE` | client-objective.ts | Detectar preguntas de confianza/seguridad |

---

## 6. Impacto UX

### Caso: Urgencia

| Antes | Después |
|---|---|
| "Estoy en el aeropuerto, necesito ir al centro" → Policy pregunta destino/pasajeros/horario | "Estoy en el aeropuerto..." → **booking_urgent** → dispatch directo sin preguntar más |
| El pasajero con alta urgencia recibía preguntas innecesarias | El pasajero recibe confirmación inmediata |

### Caso: Consulta de precio

| Antes | Después |
|---|---|
| Usuario dice "sí" a precio → Policy interpreta como booking accepted | Usuario dice "sí" pero **clientObjective=inquiry_price** → no se activa booking accepted |
| Usuario terminaba con reserva cuando solo preguntaba precio | Usuario solo recibe confirmación de precio |

### Caso: Confianza

| Antes | Después |
|---|---|
| "Son confiables?" → SAFE_FALLBACK o respuesta genérica | **trust_check** → LLM recibe regla explícita: "Mencioná que TaxiGuazú opera desde 2019" |
| No había diferenciación de este caso | Respuesta tranquilizadora visible en prompt |

### Caso: LLM prompt

| Antes | Después |
|---|---|
| LLM recibía intention, mode, type, slots | LLM recibe **client objective** + regla específica |
| LLM no sabía si el cliente quiere comprar o comparar | LLM adapta tono y estrategia según objective |

---

## 7. Tests

| Suite | Estado |
|---|---|
| `tests/ai/policy-ahora.test.ts` | 4/4 ✅ (log incluye `clientObjective:"none"` — backward compatible) |
| `tests/ai/*` (9 suites) | 193/193 ✅ |
| Build (`tsc --noEmit`) | ✅ Solo errores pre-existentes |
| Contratos R1-R4 | ✅ |

### Casos nuevos requeridos (pendientes)

| Caso | Test esperado |
|---|---|
| `computeClientObjective(high+urgency)` → `"booking_urgent"` | No existe test unitario |
| `computeClientObjective(high+date)` → `"booking_future"` | No existe test unitario |
| `computeClientObjective(low+commercial)` → `"inquiry_price"` | No existe test unitario |
| `computeClientObjective(texto confianza)` → `"trust_check"` | No existe test unitario |
| `booking_urgent` en policy-ahora → dispatch directo | No existe test unitario |
| `inquiry_price` + affirmation → no booking accepted | No existe test unitario |

---

## 8. Mapa final de señales CORE → Policy

```
CORE
├── intent           → Router → Policy (desde siempre)
├── confidence       → Router → Policy (desde siempre)
├── facts            → Router → Policy (vía resolveNextRequiredField, desde siempre)
├── purchaseIntent   → HandlerContext → Policy (E11 C1-C2)
├── urgency          → HandlerContext → Policy (E11-B P2-14)
├── messageType      → HandlerContext → Policy (E11-B P2-15, via CI)
├── isCorrection     → HandlerContext → Policy (E11-B P2-15, via CI)
├── clientObjective  → HandlerContext → Policy (E12 P3-06)
├── slotStability    → ExtractionContext → Policy (desde siempre, vía buildExtractionContext)
├── roleLock         → ExtractionContext (desde siempre)
└── slotAssignmentConfidence → ambiguity-handler.ts (desde siempre)
```

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| `booking_urgent` skip field resolution puede omitir pasajeros | Se evaluará en piloto. Si un pasajero urgente sin pasajeros necesita especificar cantidad, se ajusta. |
| `trust_check` regex puede tener falsos positivos (ej: "seguro" = "seguramente") | El contexto del prompt ayuda al LLM a interpretar correctamente. |
| LLM puede ignorar la regla de clientObjective | La regla está en la sección RULES, explicitada como mandatoria. Si falla, es problema de calidad LLM, no de arquitectura. |
| `inquiry_price` guard puede interferir con flujos de precio + booking simultáneos | El guard solo aplica si `clientObjective === "inquiry_price"`. Si el pasajero primero pregunta precio y luego confirma, el clientObjective cambia en el siguiente turno. |

---

## 10. Relación con E10 (Context Persistence)

E12 define qué persistir:

| Campo | Persistir en `chat_sessions` | ¿Implementado? |
|---|---|---|
| `clientObjective` actual | No (es por-turno) | ❌ |
| `clientObjective` histórico | Sí (último objetivo conocido, como `last_client_objective`) | ❌ Pendiente E10 |

El valor de `clientObjective` cambia por mensaje. No necesita persistencia entre turnos.  
Pero el **último objetivo conocido** (`last_client_objective`) sí debería persistirse como parte de E10 para:
- Saber si el pasajero VIENE de un `booking_urgent` (y ahora pregunta otra cosa)
- Detectar cambios de objetivo entre turnos
- Mejorar la continuidad conversacional

**Esto queda como dependencia de E10**.
