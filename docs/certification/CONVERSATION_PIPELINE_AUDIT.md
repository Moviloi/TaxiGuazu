# CONVERSATION PIPELINE AUDIT
## 2026-07-08 | Evidence-based

---

## 1. Clasificación de mensajes — ¿Existe?

**Sí, pero es fragmentada.** Varios componentes clasifican implícitamente:

| Componente | Qué clasifica | Dónde | Evidencia |
|---|---|---|---|
| `core()` | Intent (GREETING, BOOKING, NOW, etc.) | `core.ts:274` | Basado solo en regex facts |
| `handleLeadMessage` | State-based routing | `lead.service.ts:42-277` | 8 zonas de estado |
| `handleSlotConfirmationText` | Affirmative/negative/correction | `slot-confirmation-text-handler.ts:33-84` | Regex + roleLock |
| `isAffirmativeMessage` | Afirmaciones | `patterns.ts:32` | Regex |
| `isNegativeMessage` | Negaciones | `patterns.ts` | Regex |
| `isCorrectionMessage` | Correcciones | `patterns.ts` | Regex |

**Ningún componente clasifica explícitamente "aclaración", "continuación", "confirmación parcial".** Son conceptos que no existen como tipos.

## 2. Estado conversacional — ¿Quién lo conoce?

| Componente | Conoce estado? | Conoce slots previos? | Conoce contexto? |
|---|---|---|---|
| `core()` | ❌ Solo recibe `prevIntent` | ❌ | ❌ |
| `entity-extractor` | ❌ | ❌ | ❌ |
| `extraction-runner` | ✅ Vía `prevSlotsEarly` | ✅ | ✅ Vía `loadContext()` |
| `confidence.ts` | ❌ | ❌ | ❌ |
| `lead.service.ts` | ✅ Vía `getChatSession()` | ✅ | ✅ |
| `slot-workflow.ts` | ✅ | ✅ | ✅ |
| `policy-reserva.ts` | ✅ | ✅ | ✅ |

**El gap**: `entity-extractor` y `confidence.ts` operan SIN conocimiento conversacional. Solo extraction-runner y lead.service conocen el contexto.

## 3. Entrada al CORE — Contrato real

```typescript
// lead.service.ts:73
core(text, prevIntent?)
```

**Solo recibe**: texto + intent previo opcional. No recibe: estado conversacional, slots previos, si el usuario está clarificando, si hay confirmación pendiente.

## 4. Entity Extractor — Suposiciones

`entityExtractSlots(text)` en `entity-extractor.ts:73` supone:
- Cada mensaje es una nueva solicitud de ubicación
- Si encuentra una ubicación sin marcadores, es destination (línea 189)
- No tiene acceso al estado conversacional
- No sabe si el usuario está respondiendo una pregunta anterior

**"argentino" vs "quiero ir al aeropuerto argentino"**: El extractor los trata igual si ambos dan fuzzy match. No hay diferenciación. La decisión de asignar a destination (línea 189) es arbitraria cuando no hay marcadores.

## 5. Merge — ¿Qué resuelve?

El merge en `extraction-runner.ts:457-468`:
- Preserva slots de turnos anteriores (prevSlotsEarly)
- Restaura valores si el LLM/extractor alucina (line 463: verifica si el valor actual está en el texto del usuario)
- **PERO**: actúa DESPUÉS de que el extractor ya asignó valores potencialmente incorrectos. Es un parche, no una prevención.

**Está actuando demasiado tarde.** El merge reacciona a resultados incorrectos del extractor en lugar de informar al extractor del contexto.

## 6. Ownership — Evaluación

| Alternativa | Ventaja | Desventaja | Verdicto |
|---|---|---|---|
| **A) Entity Extractor** | Cercanía a la extracción | Violaría single responsibility. El extractor extrae, no interpreta. | ❌ |
| **B) Extraction Runner** | Ya tiene contexto (prevSlots, context) | Ya es demasiado grande (610 líneas). El merge ya actúa aquí. | ⚠️ |
| **C) Conversation Interpreter** | Responsabilidad clara. Pre-procesa el mensaje antes de extracción. | Nuevo componente. Requiere diseño. | ✅ |
| **D) Policy** | Ya decide respuestas | Demasiado tarde. El extractor ya asignó valores incorrectos. | ❌ |
| **E) Workflow** | Ya maneja estados | No es su responsabilidad interpretar texto. | ❌ |

**Recomendación**: **C — Conversation Interpreter** entre CORE y Extraction. Recibe el texto + estado conversacional + intent. Produce una clasificación de mensaje (new_request, clarification, correction, confirmation, selection) que guía al extractor.

## 7. Clases de errores similares a B3

| Mensaje | ¿Mismo camino que B3? | ¿Sobreescribiría slots? |
|---|---|---|
| "sí" | ✅ core → intent → slot zone (capturado) | No (capturado por zona de estado) |
| "no" | ✅ core → intent → slot zone (capturado) | No |
| "ese" | ⚠️ extractSlots → regex/entity → fuzzy? | Posible si coincide con alias |
| "argentino" | ✅ entityExtractSlots → fuzzy → destination | ✅ B3 |
| "brasileño" | ✅ mismo camino | ✅ si fuzzy match |
| "mañana" | ✅ pero es fecha, no ubicación | ⚠️ sobrescribe scheduled_at |
| "ese hotel" | ✅ entity → hotel match → destination | ✅ sobrescribe destination |
| "dos personas" | ✅ pero es pax, no ubicación | ⚠️ sobrescribe passengers |

## 8. Responsabilidades mezcladas

| Responsabilidad | Dueño actual | Dueño correcto |
|---|---|---|
| Clasificar tipo de mensaje | lead.service (zonas) + core (intent) | Conversation Interpreter |
| Extraer ubicaciones | entity-extractor + LLM | Entity Extractor |
| Evaluar confianza | confidence.ts | Confidence Evaluator |
| Preservar slots previos | extraction-runner (merge) | Merge (post-extracción) |
| Decidir respuesta | policy-reserva | Policy |
| Decidir estado | slot-workflow | Workflow |

## 9. Principios arquitectónicos

| Principio | Cumple | Evidencia |
|---|---|---|
| Separación de responsabilidades | **Parcial** | Entity extractor asigna destination por default (decisión). Merge intenta corregir (otra decisión). |
| Single responsibility | **Parcial** | extraction-runner hace extracción + merge + pricing + workflow. |
| Ownership claro | **Parcial** | Nadie es dueño de "interpretar el significado conversacional de un mensaje". |
| Conversation awareness | **NO** | CORE y entity-extractor no reciben contexto conversacional. |

## RESPUESTAS FINALES

### 1. ¿Dónde debería interpretarse el significado conversacional?
**En un Conversation Interpreter**, entre CORE y Extraction. Este componente recibe: texto + intent + estado conversacional + slots previos + historial. Produce una clasificación: `new_request | clarification | correction | confirmation | selection | continuation`.

### 2. ¿El Entity Extractor está asumiendo responsabilidades que no le corresponden?
**Sí.** Asignar a `destination` por default (línea 189-198) es una decisión de interpretación, no de extracción. El extractor debería retornar `{ location_found: "Aeropuerto IGR", confidence: "fuzzy" }` sin asignar a origin ni destination. La asignación de rol (origin vs destination) debería decidirla el Conversation Interpreter basado en el contexto.

### 3. ¿El Merge está intentando resolver problemas que deberían evitarse antes?
**Sí.** El merge corrige resultados incorrectos del extractor (restaura prevSlots cuando el extractor alucina). Pero si el extractor recibiera contexto conversacional, no produciría esos resultados incorrectos en primer lugar. El merge debería ser la última línea de defensa, no la única.

### 4. ¿Punto correcto para decidir si un mensaje es aclaración, corrección o nueva extracción?
**Antes del entity extractor.** Hoy esa decisión se toma en `handleSlotConfirmationText` (línea 33), pero solo para el estado `slot_confirmation`. Para `collecting_slots` y otros estados, la decisión no existe y el mensaje cae al pipeline de extracción como si fuera nuevo. Un Conversation Interpreter debería interceptar TODOS los mensajes, no solo los de `slot_confirmation`.

### 5. ¿Arquitectura coherente con CORE→ROUTER→POLICY?
```
Usuario → CORE (intent) 
        → Conversation Interpreter (tipo de mensaje: new/clarify/correct)
        → Entity Extraction (informada por el tipo de mensaje)
        → Merge (preservación residual)
        → Workflow (transición de estado)
        → Policy (respuesta)
```
El Conversation Interpreter se inserta entre CORE y Extraction. Usa el intent de CORE + el estado conversacional + los slots previos para decidir si el mensaje es información nueva, una aclaración, o una corrección. El extractor recibe esta clasificación y adapta su comportamiento.
