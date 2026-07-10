# AITOS CONVERSATIONAL ALIGNMENT AUDIT
## E6 | 2026-07-08

---

## 1. Resumen ejecutivo

AITOS tiene una arquitectura conversacional sólida con separación CORE→ROUTER→POLICY. De los 17 principios auditados:

| Estado | Count |
|---|---|
| ✅ Implementado | 7 |
| ⚠️ Parcial | 8 |
| ❌ Ausente | 2 |

Los principios mejor implementados son los operativos (pricing, dispatch, policy). Los más débiles son los de comprensión contextual (necesidad detrás de la pregunta, intención dinámica). La reciente implementación del Conversation Interpreter (ADR-007) cierra parcialmente el gap de P0.7 y P0.3.

---

## 2. Matriz completa de principios

### P0.1 — Intención dinámica y evolutiva

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `core.ts:169` (deterministic intent), `conversation-interpreter.ts` (role classification) |
| **Cómo funciona** | CORE extrae facts por regex → classifyIntent asigna 1 de 11 intents. Conversation Interpreter agrega 12 tipos de rol conversacional. |
| **Limitaciones** | CORE no adapta su clasificación basado en conversaciones anteriores (solo recibe prevIntent). No aprende de errores pasados. |
| **Acción** | Evolucionar. Alimentar CORE con estadísticas de efectividad por intent. |

### P0.2 — Contexto actualizado, no reiniciado

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `chat_sessions` (slots, confidence, conversational_state), `loadPreviousSlots()` en extraction-runner, merge en extraction-runner:457 |
| **Cómo funciona** | Slots se persisten en cada turno. Merge restaura valores previos si el extractor alucina. Context memory (context-memory.ts) preserva origin/destination/intent entre turnos. |
| **Limitaciones** | executeNowTrip → idle reinicia el contexto (B2 fix mitiga con POST_BOOKING zone). Session timeout de 48h puede perder contexto en conversaciones largas. |
| **Acción** | Evolucionar. Implementar TTL más granular por tipo de slot. |

### P0.3 — No retroceder estado conversacional

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `slot-workflow.ts:20-28` (VALID_SLOT_TRANSITIONS), state zones en lead.service.ts |
| **Cómo funciona** | Transiciones validadas: idle→collecting→slot_confirmation→awaiting_passenger→awaiting_confirmation. Estados no retroceden sin razón. |
| **Limitaciones** | executeNowTrip → idle es un retroceso forzado. Correcciones pueden volver a collecting_slots. Sin protección contra retrocesos accidentales. |
| **Acción** | Evolucionar. Agregar post_booking state en lugar de idle tras executeNowTrip. |

### P0.4 — Minimizar turnos, no preguntas

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `field-resolver.ts` (resolveNextRequiredField), `policy-reserva.ts` (EXECUTE when all slots known) |
| **Cómo funciona** | Field resolver prioriza campos faltantes. Policy ejecuta cuando todos los slots están completos. Greeting shortcut evita extracción para saludos. |
| **Limitaciones** | Templates preguntan un campo a la vez. No hay "smart fill" que infiera múltiples campos de una sola respuesta. Bot siempre pregunta secuencialmente. |
| **Acción** | Evolucionar. Permitir que el LLM extraiga múltiples slots simultáneamente y confirmar en lote. |

### P0.5 — Preguntar solo información que cambia decisiones

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `field-resolver.ts:19-101` (prioridad de campos), `policy-reserva.ts` (stable acknowledge) |
| **Cómo funciona** | Priority: origin > destination > passengers > scheduled_at. Solo pregunta lo que falta. No pregunta información irrelevante. |
| **Limitaciones** | Siempre pregunta pasajeros aunque el precio sea igual para 1-4. Siempre pregunta horario aunque sea NOW. |
| **Acción** | Evolucionar. No preguntar passengers si pricing es flat para 1-4 pax. No preguntar horario en NOW mode. |

### P0.6 — Inferencia controlada según costo del error

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `confidence.ts:13-176`, `border-inference.ts`, `time-inference.ts`, `airport-inference.ts` |
| **Cómo funciona** | Score 0.0-1.0 por slot. Thresholds: ≥0.7 proceed, ≥0.3 clarify, <0.3 fallback. Inferencias (borde, horario, aeropuerto) tienen score 0.8 y status CONFIRMATION_PENDING. |
| **Limitaciones** | Levenshtein ≤3 en resolveAlias() es demasiado permisivo para palabras cortas (causa B3). Auto-insert de aliases sin validación humana. |
| **Acción** | Mantener lógica de confidence. Evolucionar: subir threshold de Levenshtein para palabras <5 caracteres a ≤2. |

### P0.7 — Necesidad detrás de la pregunta literal

| Estado | ❌ AUSENTE |
|---|---|
| **Dónde viviría** | Conversation Interpreter (recién implementado) |
| **Cómo funciona** | El intérprete clasifica el rol del mensaje pero no infiere la necesidad subyacente. "argentino" se clasifica como clarification pero no se entiende que el usuario quiere el lado argentino. |
| **Limitaciones** | Sin capa semántica. Sin knowledge graph de relaciones (aeropuerto→Argentina, aduana→Brasil). |
| **Acción** | Crear. Agregar inferencia semántica al Conversation Interpreter usando aliases y zonas de Turso. |

### P0.8 — Separación consulta, cotización, aceptación, asignación, confirmación

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `policy-reserva.ts` (decision cascade), `policy-ahora.ts`, `operational-readiness.ts` |
| **Cómo funciona** | Fases claramente separadas: CLARIFY (consulta) → ANSWER/EXECUTE (cotización) → slot_confirmation → awaiting_confirmation → executeNowTrip (asignación) → dispatch (confirmación). |
| **Evidencia** | policy-reserva.ts:139-263 (10-tier decision cascade). operational-readiness.ts separa canQuote/canDispatch. |
| **Acción** | Mantener. |

### P0.9 — Restricción acompañada de alternativa

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `ambiguity-handler.ts`, `slot-confirmation.ts`, `fleet-validation.ts` |
| **Cómo funciona** | Ambiguity: muestra opciones (lado argentino vs brasileño). Slot confirmation: botones Confirmar/Cambiar. Fleet: "Máximo 6 pasajeros. Para X pasajeros necesitarían 2 vehículos." |
| **Evidencia** | ambiguity-handler.ts:276-293 (risk nodes with alternatives). fleet-validation.ts:56-118. |
| **Acción** | Mantener. |

### P0.10 — Construcción de soluciones sin depender de tarifa exacta

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `pricing-engine.ts`, `commercial-pricing-engine.ts`, `resolve-pricing-for-slots.ts` |
| **Cómo funciona** | Pricing compone base_price + markup + adjustments. Si no hay tarifa exacta, busca por zona (4 niveles). Fallback a regex pricing. |
| **Limitaciones** | Si no hay tarifa en ningún nivel, el sistema bloquea el dispatch. No ofrece "precio aproximado" o "consulte con operador". |
| **Acción** | Evolucionar. Agregar fallback de "precio estimado" basado en distancia/zona cuando no hay tarifa exacta. |

### P0.11 — Composición tarifaria basada en reglas

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `pricing-engine.ts:36-117`, `commercial-pricing-engine.ts:50-128` |
| **Cómo funciona** | 4 niveles de resolución (place→place, place→zone, zone→place, zone→zone). 4 capas de ajustes (promociones, provider adjustments, paquetes, TG campaigns). Cap al base_price. |
| **Evidencia** | tariff-repository.ts:26-40 (4-level priority query). commercial-pricing-engine.ts:61-115 (4-layer discount chain). |
| **Acción** | Mantener. |

### P0.12 — Oportunidades comerciales vs negociación

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `opportunity-engine.ts`, `commercial-pricing-engine.ts` |
| **Cómo funciona** | Oportunidades se evalúan post-booking (no durante). El usuario recibe ofertas complementarias (Cataratas, city tour) después de confirmar. No hay negociación de precio en tiempo real. |
| **Evidencia** | opportunity-engine.ts:70-130 (evaluate). trip-execution.service.ts:299-339 (post-booking opportunities). |
| **Acción** | Mantener. |

### P0.13 — Venta según momento del cliente

| Estado | ⚠️ PARCIAL |
|---|---|
| **Dónde vive** | `policy-ahora.ts`, `policy-reserva.ts` |
| **Cómo funciona** | AHORA: respuesta rápida, dispatch inmediato. RESERVA: confirmación pausada, más información. Lateral intents detectan urgencia. |
| **Limitaciones** | Sin detección de "estoy viendo" vs "quiero ya". Sin adaptación de tono comercial según etapa del cliente. |
| **Acción** | Evolucionar. Usar purchaseIntent (low/medium/high de core.ts:156-167) para adaptar urgencia comercial. |

### P0.14 — Venta complementaria como continuidad

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `opportunity-engine.ts`, `survey.service.ts` |
| **Cómo funciona** | Post-trip: encuesta → oferta de nuevo viaje (Cataratas, Foz). Oportunidades se ofrecen como continuidad natural. |
| **Evidencia** | survey.service.ts:38-65 (handleSurveyResponse → createNewLeadFromSurvey). opportunity-engine.ts:153-254. |
| **Acción** | Mantener. |

### P0.15 — Diferenciación por comportamiento operativo

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `dispatch.service.ts:224-397`, `fleet-validation.ts`, `driver.service.ts` |
| **Cómo funciona** | Drivers diferenciados por tier, shift, país, rating, acceptance_score. Broadcast priorizado. Low-tier drivers tienen piso más bajo. |
| **Evidencia** | dispatch.service.ts:360-373 (priority sort). LOW_PISO_FACTOR = 0.8 en constants.ts. |
| **Acción** | Mantener. |

### P0.16 — Explicación de incertidumbre

| Estado | ✅ IMPLEMENTADO |
|---|---|
| **Dónde vive** | `llm-response.ts:121-155`, `comprehension-runner.ts` |
| **Cómo funciona** | LLM rules: "Si no entendiste, admitilo y pedí reformular." Comprehension check escala cuando no entiende. Templates de error explican qué falló. |
| **Evidencia** | llm-response.ts:130,151 ("If you didn't understand, admit it"). comprehension-runner.ts escalation flow. |
| **Acción** | Mantener. |

### P0.17 — AITOS vende resolución, no solamente transporte

| Estado | ❌ AUSENTE |
|---|---|
| **Dónde viviría** | Human Layer (no implementada) |
| **Cómo funciona** | El bot vende traslados punto a punto. No ofrece "soluciones de movilidad" (combinaciones, paquetes, experiencias). No sugiere tours + traslado como paquete. |
| **Limitaciones** | Sin concepto de "viaje completo" (traslados + actividades + recomendaciones). Las oportunidades son add-ons, no soluciones integradas. |
| **Acción** | Crear. Diseñar "trip bundles" en Turso que combinen traslados + tours con precio integrado. |

---

## 3. Componentes existentes relacionados

| Componente | Principios que cubre | Estado |
|---|---|---|
| `core.ts` | P0.1 | ⚠️ |
| `conversation-interpreter.ts` | P0.1, P0.3, P0.7 | ✅ Nuevo (ADR-007) |
| `confidence.ts` | P0.6 | ✅ |
| `policy-reserva.ts` | P0.4, P0.8, P0.13 | ✅ |
| `policy-ahora.ts` | P0.8, P0.13 | ✅ |
| `field-resolver.ts` | P0.4, P0.5 | ✅ |
| `pricing-engine.ts` | P0.10, P0.11 | ✅ |
| `commercial-pricing-engine.ts` | P0.11, P0.12 | ✅ |
| `opportunity-engine.ts` | P0.12, P0.14 | ✅ |
| `dispatch.service.ts` | P0.15 | ✅ |
| `ambiguity-handler.ts` | P0.9 | ✅ |
| `llm-response.ts` | P0.16 | ✅ |
| `chat_sessions` + merge | P0.2 | ⚠️ |
| Human Layer | P0.17 | ❌ No existe |

---

## 4. Gaps encontrados

| Gap | Principio | Severidad |
|---|---|---|
| Sin inferencia semántica de necesidades | P0.7 | ALTO |
| Sin "trip bundles" integrados | P0.17 | ALTO |
| executeNowTrip → idle (pérdida de contexto) | P0.2, P0.3 | MEDIO |
| Templates secuenciales sin smart fill | P0.4 | MEDIO |
| Siempre pregunta passengers aunque no afecte precio | P0.5 | BAJO |
| Sin adaptación de urgencia comercial | P0.13 | BAJO |

## 5. Deuda técnica detectada

| Deuda | Relación con principios |
|---|---|
| Levenshtein ≤3 en resolveAlias | Viola P0.6 (inferencia demasiado permisiva) |
| Dual engine pricing v2/v3 | Sin relación directa con principios |
| Hardcoded strings fuera del catálogo i18n | Viola P0.4 (templates rígidos) |

## 6. Próximas tareas priorizadas

| # | Tarea | Principio | Impacto |
|---|---|---|---|
| 1 | Agregar inferencia semántica al Conversation Interpreter | P0.7 | ALTO |
| 2 | Diseñar "trip bundles" en Turso | P0.17 | ALTO |
| 3 | Implementar post_booking state en lugar de idle | P0.2, P0.3 | MEDIO |
| 4 | Smart fill: extraer múltiples slots de una respuesta | P0.4 | MEDIO |
| 5 | No preguntar passengers si pricing es flat 1-4 | P0.5 | BAJO |
| 6 | Usar purchaseIntent para adaptar urgencia comercial | P0.13 | BAJO |
