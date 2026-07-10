# AITOS CONTEXT PERSISTENCE AUDIT
## E10 | 2026-07-08

---

## 1. Modelo actual descubierto

AITOS tiene **dos niveles de persistencia** entre turnos:

### Nivel 1 — Persistencia operativa (chat_sessions)

| Campo | Qué almacena | Persiste entre turnos |
|---|---|---|
| `slots` | JSON con origin, destination, passengers, price, scheduled_at, flight, urgency, customer_name, airport_code | ✅ |
| `confidence` | JSON con per-slot scores (0.0-1.0) | ✅ |
| `conversational_state` | idle, collecting_slots, slot_confirmation, awaiting_passenger, awaiting_confirmation, ambiguity_pending, pending_human_review | ✅ |
| `clarify_field` | Qué campo está preguntando el bot | ✅ |
| `lang` | Idioma detectado (es, en, pt) | ✅ |
| `slot_states` | JSON con status (CONFIRMED, INFERRED, CONFIRMATION_PENDING) y source (USER_CONFIRMED, SYSTEM_INFERRED) | ✅ |
| `dispatch_state` | idle, nivel_1, nivel_2, nivel_3, waiting_driver, closed | ✅ |
| `pending_opportunity` | Oportunidad comercial pendiente | ✅ |

### Nivel 2 — Memoria efímera (no persistida)

| Dato | Dónde se calcula | ¿Persiste? |
|---|---|---|
| **Intent** | `core.ts:274` | ❌ Solo en memoria (prevIntent) |
| **Facts** | `core.ts:183-260` | ❌ Recalculados cada turno |
| **purchaseIntent** | `core.ts:156-167` | ❌ Calculado pero no usado ni persistido |
| **MessageClassification** | `conversation-interpreter.ts` | ❌ Nueva clasificación cada turno |
| **RoleLock** (origin/dest asignados por sintaxis) | `core.ts:76-142` | ❌ Recalculado |
| **Lateral metadata** | `laterals/index.ts` | ❌ Recalculado |
| **TemporalSignal** (NOW/FUTURO/UNKNOWN) | `lead.service.ts:288-300` | ❌ Recalculado |
| **Client objective** | No existe | ❌ No implementado |

---

## 2. Flujo real de contexto

```
Mensaje entrante
    │
    ├─ getChatSession(phone) → carga slots, confidence, state, lang ✅ persistidos
    │
    ├─ core(text, prevIntent) → intent, facts, roleLock, purchaseIntent ❌ efímeros
    │
    ├─ interpretMessage(text, intent, state, slots) → classification ❌ efímero
    │
    ├─ [state zones] → usan state + slots ✅ persistidos para routing
    │
    ├─ runExtractionPipeline → extractSlots → merge prevSlots ✅ + nuevos ❌
    │
    ├─ calculateSlotConfidence → resolveAlias → scores ❌ recalculados
    │
    ├─ evaluateWorkflowTransition → nuevo state ✅ persistido
    │
    └─ upsertChatSession → persiste slots + confidence + state ✅
```

**Conclusión**: AITOS persiste el ESTADO OPERATIVO (slots, confidence, state) pero recalcula el CONTEXTO SEMÁNTICO (intent, facts, classification) en cada turno.

---

## 3. Tablas involucradas en Turso

| Tabla | Rol en contexto | ¿Qué persiste? |
|---|---|---|
| `chat_sessions` | **Principal** | Slots, confidence, state, lang, clarify_field, slot_states |
| `conversations` | Metadata | phone, name, mode, trip_id, last_message_at |
| `messages` | Historial | role, content, created_at |
| `trips` | Operativo | Datos del viaje (no contexto conversacional) |
| `connection_state` | KV genérico | Flags temporales (contingency, customer names) |

**NO hay tabla para**: historial de intents, objetivos del cliente, contexto semántico acumulado.

---

## 4. Datos persistidos actualmente

| Dato | ¿Persiste? | ¿Dónde? | ¿Se usa en el próximo turno? |
|---|---|---|---|
| Slots | ✅ | `chat_sessions.slots` | ✅ Vía loadPreviousSlots |
| Confidence scores | ✅ | `chat_sessions.confidence` | ✅ Vía loadPreviousSlots |
| Conversational state | ✅ | `chat_sessions.conversational_state` | ✅ Vía state zones |
| Language | ✅ | `chat_sessions.lang` | ✅ detectLangWithFallback |
| Slot states (CONFIRMED/INFERRED) | ✅ | `chat_sessions.slot_states` | ✅ Vía loadPreviousSlotStates |
| Intent | ❌ | — | Solo prevIntent en memoria (no DB) |
| Facts | ❌ | — | Recalculados |
| purchaseIntent | ❌ | — | Calculado pero ignorado |
| Message role (clarification/correction) | ❌ | — | Nuevo (ADR-007), no persistido |
| Client objective | ❌ | — | No existe |

---

## 5. Datos recalculados

| Dato | Costo de recalcular | ¿Podría persistirse? |
|---|---|---|
| Intent | Bajo (regex puro, ~1ms) | ✅ Fácil: 1 columna TEXT en chat_sessions |
| Facts | Bajo (regex puro) | ⚠️ Podría, pero facts cambian con cada mensaje |
| purchaseIntent | Bajo (ya calculado) | ✅ Fácil: ya se calcula, solo falta persistir |
| MessageClassification | Bajo (regex + reglas) | ✅ Fácil: 1 columna TEXT |
| Confidence | Medio (DB queries a aliases) | ⚠️ Podría cachearse, pero freshness importa |
| TemporalSignal | Bajo | ✅ Fácil |

---

## 6. Gaps encontrados

| Gap | Impacto | Severidad |
|---|---|---|
| **Intent no se persiste** | El sistema no sabe qué quería el usuario hace 3 turnos. Solo recuerda el último intent en memoria. | ALTO |
| **purchaseIntent se calcula pero se ignora** | `core.ts:156-167` produce low/medium/high. Policy nunca lo consulta. | MEDIO |
| **Sin historial de intents** | No se puede detectar cambio de intención ("empezó consultando, ahora quiere reservar") | MEDIO |
| **Sin client_objective** | No hay concepto de "qué necesita este cliente". Solo slots. | ALTO |
| **MessageClassification efímera** | El Conversation Interpreter clasifica cada turno desde cero. Sin memoria de roles previos. | BAJO |
| **Slots sin timestamp de confirmación** | No se sabe CUÁNDO se confirmó cada slot. Solo si está CONFIRMED o no. | BAJO |

---

## 7. Relación con E5 Workflow State Split

El `conversational_state` actual (7 estados) es puramente **operativo**: indica en qué fase del funnel está el usuario. No captura:
- Qué **objetivo** tiene el cliente (reservar, consultar, comparar)
- Qué **urgencia** real tiene (más allá de NOW/FUTURO binario)
- Si el cliente **cambió de opinión** (empezó consultando, ahora quiere reservar)

**Propuesta**: Agregar una capa de `client_context` que capture el objetivo, la urgencia y la evolución de intención, separada del `conversational_state` operativo.

---

## 8. Propuesta mínima de evolución

### Fase 1 — Persistir lo que ya se calcula (1 columna, 0 nuevas tablas)

Agregar a `chat_sessions`:
- `last_intent TEXT` — el último intent clasificado por CORE
- `client_objective TEXT` — derivado de intent + purchaseIntent + slots (ej: "booking_urgent", "inquiry_price", "comparing_options")

**Impacto**: 2 columnas. Sin nueva tabla. Sin migración compleja. Los datos YA se calculan; solo falta guardarlos.

### Fase 2 — Usar el contexto persistido

- `policy-reserva.ts`: adaptar tono según `client_objective` ("booking_urgent" → más directo, "comparing_options" → más informativo)
- `conversation-interpreter.ts`: usar `last_intent` para detectar cambio de intención

### Fase 3 — Historial de intents (opcional, post-piloto)

- Tabla `intent_history` con: session_id, intent, confidence, timestamp
- Permite analizar evolución de intención del cliente

---

## 9. Riesgos de implementación

| Riesgo | Mitigación |
|---|---|
| Agregar columnas a chat_sessions rompe queries existentes | Usar ALTER TABLE ADD COLUMN con DEFAULT NULL. SELECT * sigue funcionando. |
| Client objective mal derivado genera comportamiento incorrecto | Empezar con 3 valores (booking, inquiry, unknown). Refinar con datos del piloto. |
| Complejidad adicional sin beneficio claro | Solo persistir; no cambiar comportamiento hasta tener datos del piloto. |

---

## Respuesta final

**"¿Qué memoria necesita AITOS para conversar como un asistente inteligente sin perder control operativo?"**

AITOS necesita **dos capas de memoria**:

1. **Memoria operativa** (ya existe): slots, confidence, conversational_state, dispatch_state. Controla EL FUNNEL. Vive en `chat_sessions`. Funciona correctamente.

2. **Memoria semántica** (a construir): intent history, client_objective, purchaseIntent. Entiende AL CLIENTE. Requiere 2 columnas nuevas en `chat_sessions` (`last_intent`, `client_objective`). Los datos YA se calculan en cada turno; solo falta persistirlos y usarlos.

La separación es clave: la capa operativa sigue controlando el funnel sin cambios. La capa semántica alimenta al Conversation Interpreter y a Policy para mejorar la experiencia sin introducir nuevos estados ni romper el determinismo del pipeline.
