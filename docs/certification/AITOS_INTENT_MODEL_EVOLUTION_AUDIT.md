# AITOS INTENT MODEL EVOLUTION AUDIT
## E9 | 2026-07-08

---

## 1. Modelo actual descubierto

AITOS tiene **4 capas de clasificación**, no solo una:

| Capa | Responsable | Output | Ejemplo |
|---|---|---|---|
| **Intent** (qué hace el usuario) | `core.ts:274` | 11 tipos | BOOKING, NOW, GREETING, CONSULTA, EMERGENCY |
| **Mode** (cómo ejecutar) | `policy-pipeline.ts:97-101` | AHORA, RESERVA | Derivado de temporal signals |
| **State** (dónde está) | `chat_sessions.conversational_state` | 7 estados | collecting_slots, awaiting_confirmation |
| **Role** (tipo de mensaje) | `conversation-interpreter.ts` | 12 tipos | clarification, correction, confirmation |

**Arquitectura NO es plana.** Las 4 capas ya existen como conceptos separados, aunque con distinto grado de formalización.

## 2. Pipeline real de decisión

```
Mensaje → CORE (intent: qué)
        → Conversation Interpreter (role: tipo de mensaje)
        → Router (intent → OutputType)
        → Policy (mode + state + intent → response)
```

**Verificación**: Router (`router.ts:14-31`) es una función pura que mapea Intent → OutputType. No tiene lógica condicional más allá de `confidence < 0.4 → SAFE_FALLBACK`.

## 3. Relación Intent vs Semantic Understanding

### Lo que los intents SÍ representan
- **Operaciones**: BOOKING (reservar), NOW (ahora), EMERGENCY (emergencia)
- **Interacciones**: GREETING (saludar), CONSULTA (preguntar)
- **Señales de negocio**: COMMERCIAL (precio), INFORMATIONAL (info)

### Lo que los intents NO representan
- **Objetivo del cliente**: "quiero llegar al hotel" vs "estoy comparando precios"
- **Urgencia real**: "necesito ya" vs "para la semana que viene"
- **Preocupación**: "¿es seguro?" vs "¿llego a tiempo?"
- **Contexto emocional**: frustrado, neutral, entusiasmado

### Conclusión
Los intents mezclan **semántica básica** (GREETING, CONSULTA) con **operación** (BOOKING, NOW). Pero esta mezcla es FUNCIONAL para el sistema actual. La capa semántica faltante (objetivo del cliente, urgencia real) no requiere nuevos intents — requiere enriquecer el contexto que se pasa al pipeline.

## 4. Evaluación del Conversation Interpreter

| Pregunta | Respuesta |
|---|---|
| ¿Qué problema resuelve? | Clasifica el **rol conversacional** del mensaje (aclaración, corrección, confirmación) |
| ¿Complementa o duplica intent detection? | **Complementa.** Intent = qué quiere el usuario. Role = cómo se relaciona este mensaje con la conversación. |
| ¿Ubicación correcta? | Entre CORE y Policy. Debe recibir el intent de CORE + el estado conversacional. |

### Ubicación en el pipeline

```
CORE (intent)
    ↓
Conversation Interpreter (role)
    ↓
Router (intent → OutputType)
    ↓
Policy (mode + state + intent + role → response)
```

**Evidencia**: La implementación actual en `lead.service.ts:75-86` coloca el intérprete después de CORE y antes de las zonas de estado. Es la ubicación correcta.

## 5. Estado real en Turso

**NO VERIFICADO** — sin acceso a Turso en esta sesión. Del schema DDL (`connection.ts`):

| Tabla | ¿Almacena intención? | Campo |
|---|---|---|
| `chat_sessions` | Parcial | `conversational_state` (operativo, no semántico), `slots` (datos, no intención) |
| `conversations` | No | Solo metadatos (phone, name, mode) |
| `leads` | No | origin, destination, price (datos de reserva) |
| `trips` | No | Datos operativos del viaje |

**Gap**: No hay un campo para "objetivo del cliente" ni "urgencia real" ni "contexto emocional". El `intent` de CORE se usa en el momento pero no se persiste como historial.

## 6. Problemas encontrados

| Problema | Impacto |
|---|---|
| Intent no se persiste entre turnos (solo prevIntent en memoria) | El sistema no sabe qué quería el usuario hace 3 turnos |
| Sin "objetivo del cliente" como concepto | No se puede diferenciar "estoy viendo" de "quiero reservar" |
| purchaseIntent (low/medium/high) existe pero no se usa en Policy | `core.ts:156-167` lo calcula pero `policy-reserva.ts` no lo consulta |
| CONSULTA es un catch-all (todo lo que no es booking) | Demasiado genérico. "¿aceptan tarjeta?" y "¿cómo llego?" son CONSULTA |

## 7. Recomendación arquitectónica

**NO multiplicar intenciones.** Las 11 actuales son suficientes para la capa operativa.

**SÍ agregar contexto semántico** a lo que ya existe:

1. **Persistir `intent` en `chat_sessions`** — un campo `last_intent TEXT`. Ya se calcula en cada turno; solo falta guardarlo.
2. **Usar `purchaseIntent` en Policy** — `core.ts:156-167` ya calcula low/medium/high. Policy debería adaptar el tono (más urgente si es high, más informativo si es low).
3. **Agregar `client_objective` como concepto** — derivado de intent + purchaseIntent + slots. No es un nuevo intent; es un atributo del contexto.
4. **No crear intents como "ITINERARIO"** — es un modo operativo (multi-leg), no una intención del usuario. Ya existe como `MultiRideBreakdown`.

## 8. Cambios necesarios

| Cambio | Archivos | Prioridad |
|---|---|---|
| Agregar `last_intent TEXT` a `chat_sessions` | `connection.ts` (DDL), `database.ts` (upsert), `lead.service.ts` (write) | P2 |
| Usar `purchaseIntent` en `policy-reserva.ts` | `policy-reserva.ts` | P2 |
| Derivar `client_objective` de intent + purchaseIntent + slots | `conversation-interpreter.ts` o nuevo helper | P3 |

## 9. Prioridad de implementación

1. **P2** — Persistir intent en chat_sessions (1 columna, 3 archivos)
2. **P2** — Adaptar tono de Policy según purchaseIntent (1 archivo)
3. **P3** — Formalizar client_objective como concepto (requiere diseño)

---

## Respuesta final

**"¿AITOS necesita más intenciones, o necesita entender mejor las intenciones que ya tiene?"**

**Necesita entender mejor las que ya tiene.** Las 11 intenciones cubren el espectro operativo. Lo que falta no son más tipos de intención, sino:

1. **Persistencia**: guardar el intent entre turnos para no recalcular desde cero.
2. **Contexto**: usar `purchaseIntent` (ya calculado) para adaptar el comportamiento.
3. **Profundidad**: derivar `client_objective` de la combinación de intent + estado + slots.

El modelo actual de 4 capas (Intent → Mode → State → Role) es arquitectónicamente correcto. No requiere refactorización. Requiere completar la implementación de conceptos que ya existen parcialmente.
