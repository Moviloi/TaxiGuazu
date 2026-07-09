# HUMAN LAYER ARCHITECTURE — AITOS
## 2026-07-08

---

## Separación Human Layer / Operational Layer

### Human Layer
| Responsabilidad | Dueño actual | Estado |
|---|---|---|
| Tono conversacional | `llm-response.ts` (reglas) + `catalog.ts` (templates) | ✅ Parcial |
| Empatía | No implementado | ❌ |
| Personalización | Solo `customerName` en greeting | ⚠️ Mínimo |
| Variación de respuestas | LLM polish (solo informational) | ⚠️ Parcial |
| Upsell / cross-sell | `opportunity-engine.ts` | ✅ |
| Anticipación de necesidades | No implementado | ❌ |
| Manejo de frustración | `comprehension-runner.ts` (escalation) | ✅ |
| Cierre de venta | `policy-reserva.ts` (EXECUTE) | ✅ |

### Operational Layer
| Responsabilidad | Dueño actual | Estado |
|---|---|---|
| Tarifas | `pricing-engine.ts` | ✅ |
| Slots | `extraction-runner.ts` | ✅ |
| Estados | `slot-workflow.ts` | ✅ |
| Despacho | `dispatch.service.ts` | ✅ |
| Reglas de negocio | `policy-reserva.ts`, `policy-ahora.ts` | ✅ |
| Validación | `confidence.ts`, `guard.ts`, `fleet-validation.ts` | ✅ |

### Mezclas detectadas

| Ubicación | Mezcla |
|---|---|
| `lead.service.ts` handlers | Strings hardcodeados en español ("¿Cuántos pasajeros son?"). Deberían estar en `catalog.ts`. |
| `awaiting-passenger-handler.ts` | Mensajes comerciales ("Perfecto, Auto para 3. El traslado cuesta $X") — correcto, pero el tono no pasa por LLM. |
| `llm-response.ts:100-104` | Datos de negocio (precios iPhone, tiendas CDE) en prompt de LLM. Son Human Layer pero mezclados con datos operativos. |

### Recomendación

Agregar una capa Human Layer entre Policy y Response:
```
Policy → HumanLayer (tono, empatía, variación) → Response
```
Esta capa decide CÓMO decir lo que Policy decidió QUÉ decir. Hoy está implícita en templates + LLM. Formalizarla permitiría:
- Templates con variación (distintas formas de preguntar lo mismo)
- Adaptación de tono según hora del día, recurrencia, urgencia
- Personalización con nombre e historial
