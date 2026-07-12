# Auditoría #04 — Principios Conversacionales

> **Fecha:** 2026-07-11
> **Método:** Análisis de comportamiento observable desde el código fuente (no especulación, no arquitectura interna)
> **Componentes analizados:** `handler.ts`, `policy-ahora.ts`, `policy-reserva.ts`, `response-builder.ts`, `slot-confirmation.ts`, `slot-confirmation-text-handler.ts`, `core.ts`, `router.ts`, `llm-response.ts`, `conversation-interpreter.ts`, `client-objective.ts`, `conversation-strategy.ts`, `policy-pipeline.ts`, `comprehension.ts`, `comprehension-runner.ts`, `slot-workflow.ts`, `slot-state.ts`, `lead.service.ts`
> **Fuentes de referencia:** SYSTEM_BIBLE, ARCHITECTURE_BIBLE, Simulaciones Etapa 1, ADR-005/007/008

---

## Resumen ejecutivo

| Principio | Estado | Impacto percibido |
|-----------|--------|-------------------|
| 1. Resolver antes de vender | 🟡 Parcial | Medio |
| 2. La intención evoluciona | 🟡 Parcial | Alto |
| 3. No prometer recursos | 🟢 Cumplido | Alto |
| 4. Costo del error | 🟡 Parcial | Alto |
| 5. Preguntar solo lo necesario | 🟡 Parcial | Alto |
| 6. Minimizar turnos | 🟡 Parcial | Alto |
| 7. Microconfirmaciones | 🟡 Parcial | Medio |
| 8. Naturalidad | 🟡 Parcial | Alto |
| 9. Educación sutil | 🟡 Parcial | Medio |
| 10. Perfil del pasajero | 🟡 Parcial | Bajo |
| 11. Venta contextual | 🟢 Cumplido | Medio |
| 12. Restricción + alternativa | 🔴 Ausente | Medio |
| 13. Explicar reduce ansiedad | 🟡 Parcial | Alto |
| 14. El cliente compra tranquilidad | 🟡 Parcial | Alto |
| 15. Carga cognitiva | 🟡 Parcial | Medio |
| 16. Preguntas compuestas | 🔴 Ausente | Alto |
| 17. Comunicación visual | 🟡 Parcial | Medio |
| 18. Interactive Messages | 🟡 Parcial | Alto |
| 19. Velocidad conversacional | 🟢 Cumplido | Medio |
| 20. Sorprender positivamente | 🟡 Parcial | Bajo |

**Global: ~50%** del comportamiento conversacional ideal.

---

## 1. Resolver antes de vender

**Estado: 🟡 Parcial**

### Evidencia a favor

El flujo base cumple: el sistema primero extrae slots (`runExtractionPipeline`), resuelve geo (`location-resolver`), calcula precio, y solo entonces presenta la confirmación con precio (`buildConfirmationMessage`). Las oportunidades comerciales (`evaluateOpportunities`) se evalúan después de pricing, en el contexto del viaje que se está cotizando.

En `policy-reserva.ts`, la cascada de decisiones es:
1. `buildStableAcknowledge` — reconoce lo resuelto
2. `buildClarifyMessage` — pide lo faltante
3. `buildConfirmationMessage` — presenta el resumen con precio
4. Booking accepted — solo si el usuario ya confirmó

El COMBINED_GREETING envía la intro de Cris antes de procesar el mensaje de negocio — no vende antes de resolver.

### Evidencia en contra

Hay una ruta donde la venta ocurre antes de la resolución completa: cuando `evaluateOpportunities()` se ejecuta mientras los slots aún están en `collecting_slots`. El sistema puede ofrecer un descuento o paquete cuando el usuario ni siquiera ha dado el destino completo.

Ejemplo concreto en `policy-pipeline.ts`:
```
evaluateOpportunities(...)  // se ejecuta durante el pipeline
// luego
shouldRequestConfirmation(...)  // ocurre después
```

La oportunidad se presenta DURANTE la recolección de datos, no después de tener el viaje completo. Esto contradice el principio: el usuario está evaluando un viaje y recibe una oferta comercial antes de saber el precio base.

### Veredicto

El sistema generalmente resuelve antes de vender (pricing antes de confirmación), pero las oportunidades comerciales aparecen durante la resolución, no después. El principio está parcialmente implementado.

---

## 2. La intención evoluciona

**Estado: 🟡 Parcial**

### Evidencia a favor

CORE implementa continuidad de intención previa (`prevIntent`):
```typescript
// core.ts L280-286
const finalIntent: Intent = (prevIntent && prevIntent !== "AMBIGUOUS" && prevIntent !== "GREETING")
  ? (intent === "PRE_BOOKING" ? prevIntent : ...)
  : intent;
```

Si el usuario estaba en PRE_BOOKING y envía "sí", el sistema hereda la intención previa en lugar de clasificar como AMBIGUOUS.

El Conversation Interpreter (ADR-007) clasifica el rol conversacional del mensaje (`new_request`, `clarification`, `correction`, `confirmation`, `topic_change`, etc.), lo que permite que la intención se refine entre turnos.

### Evidencia en contra

La intención es **única** y **determinista**. CORE aplica prioridad estricta:
```
EMERGENCY > RESCHEDULE > POST_SERVICE > GREETING > CONSULTA > BOOKING/NOW > COMMERCIAL > INFORMATIONAL > PRE_BOOKING
```

No existe un Intent Stack. Cuando el usuario dice "hola, ¿cuánto sale del aeropuerto al centro?" el sistema debe elegir UNA intención (GREETING o COMMERCIAL). Si elige GREETING, la consulta de precio se pierde en ese turno (aunque COMBINED_GREETING rescata el flujo de negocio).

No hay intenciones coexistiendo. El sistema no puede sostener "70% booking, 30% commercial" mientras resuelve.

### Veredicto

La continuidad por `prevIntent` y la clasificación por Conversation Interpreter permiten cierta evolución, pero el modelo single-intent impide que la intención evolucione naturalmente. Una vez que CORE asigna una intención, el sistema queda "presa" de ella hasta el próximo mensaje.

---

## 3. No prometer recursos

**Estado: 🟢 Cumplido**

### Evidencia

El sistema nunca confirma disponibilidad de recursos antes de tener un compromiso firme:

1. **Precio**: `buildConfirmationMessage` muestra precio basado en tarifas DB, no en disponibilidad real. "Precio: $X ARS (hasta Y pasajeros)" — no dice "tenemos un auto disponible a ese precio".

2. **Dispatch**: `executeNowTrip()` llama a dispatch SOLO después de que el usuario confirma. El mensaje "Buscando chofer..." no promete un chofer — solo indica que se está buscando.

3. **Flota**: `fleet-validation.ts` verifica capacidad después de la confirmación, no antes. Si no hay capacidad, el sistema escala a humano.

4. **Horarios**: El OI layer infiere horarios como SUGERENCIA ("The park opens at 8am. Shall I schedule pickup for 7:45am?"), no como compromiso.

### Veredicto

Comportamiento sólido. El sistema consistentemente separa "lo que el usuario quiere" de "lo que el sistema puede proveer". No se detectaron casos donde se prometan recursos no verificados.

---

## 4. Costo del error

**Estado: 🟡 Parcial**

### Evidencia a favor

El sistema distingue entre evidencia de alta y baja confianza:
- **Código explícito (IGR)** → `CONFIRMED`, no pregunta
- **Inferencia del sistema (airport_code por contexto)** → `CONFIRMATION_PENDING`, pregunta
- **Término ambiguo ("centro")** → inicia `ambiguity_pending`, resuelve con opciones numeradas
- **Aeropuerto inferido** → presenta como sugerencia con botón [Yes] [Change time]

En `slot-state.ts`:
```typescript
if (k === "airport_code" && slot.reason === "explicit") {
  source = "USER_PROVIDED"; status = "CONFIRMED";  // no pregunta
} else if (slot.score > 0) {
  source = "SYSTEM_INFERRED"; status = "CONFIRMATION_PENDING";  // pregunta
}
```

Esto muestra conciencia del riesgo: las inferencias automáticas requieren confirmación.

### Evidencia en contra

No existe un **Cost of Error Engine** formal. Las decisiones de cuándo preguntar vs. cuándo actuar se basan en reglas fijas (score > X → CONFIRMED, score ≤ X → CONFIRMATION_PENDING), no en un cálculo dinámico de "cuánto cuesta equivocarse".

Ejemplo de lo que falta:
- Inferir que el destino es IGR (error: $0, el chofer igual va al aeropuerto) VS inferir que son 2 pasajeros cuando son 6 (error: $50, el auto no tiene capacidad)
- El sistema trata ambos casos con la misma lógica de slot-score

### Veredicto

El sistema tiene conciencia parcial del riesgo (inferencia vs. explícito) pero no calcula el costo real del error. La decisión de preguntar es uniforme por tipo de slot, no por consecuencia del error.

---

## 5. Preguntar solo lo necesario

**Estado: 🟡 Parcial**

### Evidencia a favor

`resolveNextRequiredField()` determina QUÉ falta y pregunta exactamente ese campo:
```typescript
// response-builder.ts
export function inferMissingFieldFromCore(decision: CoreDecision): string | null {
  if (!facts.some(f => f.startsWith("origin:"))) return "origin";
  if (!facts.some(f => f.startsWith("destination:"))) return "destination";
  ...
}
```

StrategyDecision tiene `fieldAcquisitionMode: "skip" | "minimal" | "normal"`. En modo "skip", no pregunta campos incluso si faltan (cuando purchaseIntent es high y hay urgencia).

En `policy-ahora.ts`, cuando `skipFieldResolution` está activo:
```typescript
if (skipFieldRes) {
  return { finalResponse: buildNowDispatchResponse(lang) }; // salta a dispatch sin preguntar
}
```

### Evidencia en contra

El sistema pregunta un campo a la vez, incluso cuando podría preguntar varios compatibles. Por ejemplo, si faltan origin y destination, pregunta origin primero, espera respuesta, luego pregunta destination. Un solo mensaje podría preguntar ambos.

No hay un mecanismo para determinar si conviene preguntar dos campos en el mismo mensaje (cuando son independientes y el costo cognitivo es bajo).

### Veredicto

El sistema pregunta exactamente los campos que faltan (no repregunta lo ya sabido), y puede saltar campos cuando hay urgencia. Pero lo hace de a uno por turno, desperdiciando oportunidades de optimización.

---

## 6. Minimizar turnos

**Estado: 🟡 Parcial**

### Evidencia a favor

- COMBINED_GREETING: detecta saludo + pedido en un mismo mensaje y responde con intro + continúa el flujo de negocio en el mismo turno (aunque son dos mensajes separados).
- `skipFieldResolution`: cuando hay urgencia, salta campos intermedios.
- OI layer: infiere aeropuerto y horario para ahorrar turnos de pregunta.

### Evidencia en contra

- No pregunta múltiples campos en un mismo mensaje. Cada turno pide exactamente un campo.
- slot confirmation es un turno completo que podría fusionarse con la respuesta de precio.
- Cuando el usuario está en `slot_confirmation` y envía texto, el sistema responde con "Usá los botones de abajo 👇" — agrega UN TURNO EXTRA en vez de interpretar el texto directamente.

### Medición concreta

Para completar una reserva típica (origen, destino, pasajeros, hora):
- **Turno 1 (usuario)**: "hola quiero ir del aeropuerto al centro"
- **Turno 2 (sistema)**: intro + "¿cuántos pasajeros?" — podría haber preguntado también la hora
- **Turno 3 (usuario)**: "2 personas"
- **Turno 4 (sistema)**: "¿a qué hora?" — podría haberla preguntado en el turno 2
- **Turno 5 (usuario)**: "ahora"
- **Turno 6 (sistema)**: resumen + "¿confirmás?"
- **Turno 7 (usuario)**: "sí"

Mínimo teórico: 3 turnos (request + confirm details + confirm). Actual: 5-7 turnos.

### Veredicto

El sistema desperdicia turnos al preguntar un campo por vez y al forzar el uso de botones en slot_confirmation en vez de interpretar texto libre.

---

## 7. Microconfirmaciones

**Estado: 🟡 Parcial**

### Evidencia a favor

`buildStableAcknowledge()` en `policy-reserva.ts` reconoce lo que el sistema entendió:
```typescript
// Genera "Perfecto, tengo origen en X y destino hacia Y. ¿Cuántos pasajeros son?"
return { response: t("booking.acknowledgePax", lang, { origin: originStr, dest: destStr }), nextField: "passengers" };
```

El acknowledgment varía según qué información está disponible: con destino ambiguo genera confirmación de ubicación, con ambos resueltos pregunta por pasajeros u horario.

La slot confirmation UI usa ⚠️ para marcar items pendientes de confirmación.

### Evidencia en contra

El acknowledgment solo se genera cuando se cumplen condiciones estrictas:
1. Origin y destination tienen valor
2. NO hay scheduled_at
3. NO está en awaiting_confirmation

Si alguna condición falla, el acknowledgment no se produce y la respuesta salta directamente a la pregunta del siguiente campo. El usuario no escucha qué entendió el sistema, solo escucha la siguiente pregunta.

En `policy-ahora.ts`, no hay acknowledgment — va directo a `buildNowDispatchResponse()` que es "Buscando chofer..." sin resumen de lo entendido.

### Veredicto

Acknowledgment existe para el flujo RESERVA pero es condicional (solo cuando slots están completos pero falta horario). El flujo AHORA no acknowledge nada. El principio está presente pero incompleto.

---

## 8. Naturalidad

**Estado: 🟡 Parcial**

### Evidencia a favor

El LLM refina las respuestas cuando está activo (no `skipLLM`). El prompt `llm-response.ts` incluye contexto completo (slots, tarifa, strategy decision, knowledge) para que el LLM genere respuestas naturales.

Los mensajes de error/recovery usan LLM contextual (`getRecoveryMessage` con LLM) en lugar de templates fijos.

La detección de frustración usa LLM para responder con empatía.

### Evidencia en contra

Cuando el LLM está desactivado (`skipLLM` por low purchaseIntent o EXECUTE sin placeholders), las respuestas son templates rígidos:

```
"Resumen del viaje:
Origen: Aeropuerto IGR
Destino: Hotel Amerian
Pasajeros: 2
Precio: $45000 ARS (hasta 4 pasajeros).
¿Confirmás?"
```

Esto es funcional pero robótico. La redacción es idéntica para cada usuario, sin variación por tono, urgencia, o relación previa.

El safe fallback es especialmente robótico: "No pude procesar eso. Un operador te va a asistir en breve."

### Ejemplos de respuestas no naturales

1. "Resumen del viaje:\nOrigen: X\nDestino: Y\nPasajeros: N\nPrecio: $X ARS\n¿Confirmás?" → parece formulario, no conversación
2. "No pude procesar eso. Un operador te va a asistir en breve." → genérico, sin explicación
3. Mensajes de error: "Error interno. Cliente derivado a operador." → lenguaje interno, no conversacional

### Veredicto

La naturalidad depende del LLM, que solo está activo en ciertos caminos. Cuando el LLM no se usa (por decisión de StrategyDecision o por efficiency), las respuestas son rígidas y robóticas. El sistema tiene dos personalidades: una natural (LLM) y una funcional (templates).

---

## 9. Educación sutil

**Estado: 🟡 Parcial**

### Evidencia a favor

El sistema educa en los siguientes puntos:

1. **Nombres canónicos**: En `buildConfirmationMessage()`, se usan `displayName` y `canonicalName`. Si el usuario dice "el aeropuerto", la respuesta dice "Aeropuerto IGR (Cataratas del Iguazú)".

2. **Hoteles**: `formatHotelLandmarkLabel()` en `policy-reserva.ts` convierte "amerian" → "Hotel Amerian en el centro".

3. **OI layer**: "The park opens at 8am. Shall I schedule pickup for 7:45am?" — educa sobre el horario del parque mientras sugiere.

### Evidencia en contra

No hay un patrón sistemático de "el usuario dijo X → el sistema responde con X pero en lenguaje correcto". La educación ocurre solo en:
- Slot confirmation (nombres canónicos en el resumen)
- OI layer (explicación de por qué se infirió un valor)
- Hoteles (prefijo "Hotel")

El resto del tiempo, el sistema usa los términos del usuario sin corregir ni educar. Por ejemplo, si el usuario dice "al centro", el sistema responde "¿a qué parte del centro?" en vez de listar opciones con nombres canónicos ("Hotel Amerian, Terminal de Ómnibus, Casino Iguazú...").

### Veredicto

La educación existe en puntos aislados pero no es un patrón consciente. El sistema podría educar más: cada vez que el usuario da un nombre informal, la respuesta debería incluir el nombre correcto.

---

## 10. Perfil del pasajero

**Estado: 🟡 Parcial**

### Evidencia a favor

El sistema detecta y adapta según:

| Señal | Detectada por | Impacto en respuesta |
|-------|---------------|---------------------|
| Urgencia | `CORE.urgency` | `skipFieldResolution`, `fieldAcquisitionMode: "skip"` |
| Intención de compra | `CORE.purchaseIntent` | `skipLLM` (low → no LLM), `reassuranceNeeded` |
| Mensaje anterior | `prevIntent` | Continuidad de intención |
| Objetivo del cliente | `clientObjective` | `inhibitBookingAccept` si solo pregunta precio |
| Rol del mensaje | `messageType` | `correction` → `preserveContext` |

### Evidencia en contra

No hay detección de:
- **Familia/niños**: "viajo con mi hijo" no cambia el tono ni las preguntas (ej: "¿necesitan silla para niños?")
- **Extranjero vs. residente**: un turista vs. un local reciben las mismas preguntas
- **Historial de viajes**: un cliente recurrente vs. nuevo son tratados igual
- **Éxito previo**: si el usuario ya reservó antes, no hay reconocimiento

El sistema responde igual para todos en la mayoría de los caminos. La adaptación existe a nivel de estrategia (velocidad, tono) pero no a nivel de contenido (qué se pregunta, cómo se pregunta).

### Veredicto

Adaptación parcial a señales de urgencia e intención, pero sin perfilado de pasajero. Un turista con niños, un empresario local y una pareja de mochileros reciben esencialmente las mismas preguntas en el mismo orden.

---

## 11. Venta contextual

**Estado: 🟢 Cumplido**

### Evidencia

Las oportunidades comerciales se evalúan en contexto del viaje actual:
```typescript
// policy-pipeline.ts
const opportunityResult = await evaluateOpportunities({
  phone, text, conversationId: conversation.id,
  extractionCtx,  // slots resueltos
  pricing,        // precio calculado
  ...
});
```

Las oportunidades aparecen en el momento apropiado: después de calcular precio, antes de la confirmación final. No aparecen en un mensaje de saludo ni después del viaje.

El sistema de oportunidades (opportunity-engine.ts) evalúa descuentos multi-ride y paquetes que son relevantes para el viaje específico que se está cotizando.

### Veredicto

La venta contextual está correctamente implementada. Las oportunidades nunca aparecen fuera de contexto.

---

## 12. Restricción + alternativa

**Estado: 🔴 Ausente**

### Evidencia

El sistema maneja restricciones así:

| Restricción | Respuesta actual | Alternativa ofrecida |
|------------|-----------------|---------------------|
| Fleet capacity exceeded | "La capacidad máxima es de X pasajeros" | ❌ Ninguna |
| No tariff found | Viaje continúa a human review sin precio | ❌ No se sugiere ruta alternativa |
| LLM timeout | Usa template | ❌ No se informa al usuario |
| Dispatch all levels exhausted | Escala a humano | ❌ No se sugiere esperar/reintentar |
| Ambiguous location | Pide aclarar | ✅ Sí (opciones numeradas) |
| Cancelación | "Cancelación confirmada" | ❌ No se ofrece alternativa |

El único caso donde el sistema ofrece alternativas es en ambiguity resolution (presenta opciones numeradas). En todos los demás casos, o escala a humano o informa el problema sin solución.

```typescript
// response-builder.ts - fleet capacity
export function buildFleetCapacityMessage(maxCapacity: number | null): string {
  if (maxCapacity === null) return "No hay información de capacidad disponible.";
  return `La capacidad máxima por vehículo es de ${maxCapacity} pasajeros.`;
  // No dice: "¿Querés dividir el grupo en 2 autos?" ni "Podemos ofrecerte un vehículo más grande"
}
```

### Veredicto

El sistema no ofrece alternativas ante restricciones. Es un área con gran impacto potencial: un usuario que encuentra un "no" sin alternativa probablemente abandona.

---

## 13. Explicar reduce ansiedad

**Estado: 🟡 Parcial**

### Evidencia a favor

El OI layer (AIT-061) explica POR QUÉ infiere un horario:
```typescript
// slot-confirmation.ts
if (scheduledAt.reason === "inferred_opening_hours") {
  lines.push("", t("time.suggest", lang, {
    time: String(scheduledAt.value),
    reason: t("time.reasonOpeningHours", lang),  // "El parque abre a las 8am"
  }));
}
```

La detección de frustración con LLM genera respuestas empáticas que EXPLICAN qué pasó.

### Evidencia en contra

El flujo base NO explica por qué pregunta lo que pregunta:

| Pregunta del sistema | Explicación |
|---------------------|-------------|
| "¿Cuántos pasajeros son?" | ❌ No dice "para calcular el precio" |
| "¿A qué hora?" | ❌ No dice "para saber si hay disponibilidad" |
| "¿Desde dónde?" | ❌ No dice "para calcular la distancia" |
| "¿Hacia dónde?" | ❌ No dice "para buscar el precio" |

La respuesta genérica de error: "No pude procesar eso. Un operador te va a asistir en breve." — no explica qué falló ni por qué.

### Veredicto

El OI layer explica sus inferencias, pero el flujo base pregunta sin contexto. Agregar una breve explicación a cada pregunta ("¿Cuántos pasajeros son? — para calcular el precio exacto") reduciría la ansiedad del usuario.

---

## 14. El cliente compra tranquilidad

**Estado: 🟡 Parcial**

### Evidencia a favor

StrategyDecision incluye `reassuranceNeeded: boolean` que se pasa al LLM. Cuando está activo, el LLM puede generar respuestas con lenguaje tranquilizador.

El handler detecta EMERGENCY y genera respuestas especializadas con tono apropiado.

### Evidencia en contra

Las respuestas TEMPLATE (no LLM) son puramente informativas. No contienen lenguaje tranquilizador:
- "Buscando chofer..." — es informativo, no tranquilizador
- "Resumen del viaje:" — es transaccional, no reconfortante
- "¿Confirmás?" — es funcional, no cálido

No hay un patrón de "todo va a estar bien" o "estamos al tanto" en los templates.

El mensaje de error global: "⚠️ *Error en bot — cliente sin respuesta*\n\nTeléfono: ..." — es un mensaje INTERNO para admin, no para el cliente. El cliente recibe "Error interno. Cliente derivado a operador." que aumenta la ansiedad en vez de reducirla.

### Veredicto

El LLM puede generar tranquilidad, pero los caminos sin LLM (EXECUTE, low purchaseIntent) son puramente informativos. La tranquilidad no está baked into el comportamiento base.

---

## 15. Carga cognitiva

**Estado: 🟡 Parcial**

### Evidencia a favor

El flujo de recolección pregunta un campo a la vez, lo que mantiene baja carga cognitiva en cada turno. El usuario solo necesita responder una cosa por mensaje.

Las preguntas son cortas y directas.

### Evidencia en contra

El mensaje de slot confirmation es Denso: hasta 10+ líneas incluyendo origin, destination, passengers, airport_code, scheduled_at con ⚠️ markers. Para un usuario que no espera ver toda esa información junta, puede ser abrumador.

```
Resumen del viaje:

Origen:
⚠️ Aeropuerto IGR

Destino:
⚠️ Hotel Amerian

Pasajeros:
⚠️ 2

🛩️ Aeropuerto IGR

🕐 08:00

El parque abre a las 8am. ¿Querés que programemos la recogida para las 7:45am?
```

Eso son 6-7 items de información + una pregunta. En WhatsApp, sin formato visual avanzado, es una pared de texto.

La confirmación de booking aceptado también es densa:
```
Trip summary:
From: X
To: Y
Passengers: N
When: date
Price: $X ARS (up to Y passengers).
Do you confirm?
```

### Veredicto

El flujo de preguntas (uno por vez) es de baja carga cognitiva, pero el slot confirmation vierte toda la información acumulada de golpe. La interfaz de confirmación necesita mejor segmentación visual.

---

## 16. Preguntas compuestas

**Estado: 🔴 Ausente**

### Evidencia

El sistema NUNCA hace preguntas compuestas. En `policy-reserva.ts`, `buildClarifyMessage()` retorna EXACTAMENTE un campo:
```typescript
if (field === "destination") return t("clarify.destination", lang);
if (field === "origin") return t("clarify.origin", lang);
if (field === "passengers") return t("clarify.passengers", lang);
if (field === "scheduled_at") return t("clarify.time", lang);
```

No existe lógica para combinar preguntas compatibles. Por ejemplo, cuando faltan origin y destination, el sistema pregunta origin en el turno N y destination en el turno N+1, cuando podría preguntar ambos en el turno N: "¿Desde dónde y hacia dónde viajan?"

Las situaciones donde las preguntas compuestas serían naturales:
1. Origin + destination: "¿Desde dónde y hacia dónde?" (en lugar de dos turnos)
2. Passengers + time: "¿Cuántos son y a qué hora?" (en lugar de dos turnos)
3. Airport + flight: "¿En qué aerolínea y número de vuelo llegan?" (en lugar de dos turnos)

### Veredicto

Es la ausencia más costosa en términos de turnos desperdiciados. Implementar preguntas compuestas podría reducir un 30-40% los turnos de recolección.

---

## 17. Comunicación visual

**Estado: 🟡 Parcial**

### Evidencia a favor

El sistema usa emojis como marcadores visuales:
- ⚠️ para slots pendientes de confirmación
- 🛩️ para aeropuerto
- 🕐 para horario inferido
- 👇 para llamar la atención a botones
- 🧹 para comando de limpieza (solo dev)

La estructura de mensajes usa saltos de línea y listas:
```
Resumen del viaje:

Origen:
⚠️ Aeropuerto IGR

Destino:
Hotel Amerian
```

### Evidencia en contra

No usa formato WhatsApp avanzado:
- **Negritas** — no se usan para resaltar precios o destinos
- *Cursivas* — no se usan
- ~Tachado~ — no se usa
- Código de formato inline — no aparece

Los mensajes de confirmación son texto plano. No hay separación visual entre "lo que el usuario dijo" y "lo que el sistema infirió" (solo el ⚠️).

El resumen del viaje no tiene un formato consistente entre AHORA y RESERVA.

### Veredicto

El sistema usa emojis básicos pero no aprovecha las capacidades de formato de WhatsApp (negritas, listas anidadas, separadores visuales). La comunicación visual es funcional pero básica.

---

## 18. Interactive Messages

**Estado: 🟡 Parcial**

### Evidencia a favor

El sistema usa interactive messages en:
1. **Slot confirmation**: `buildSlotConfirmationMessage()` genera `SlotConfirmationUI` con botones (Confirmar / Cambiar origen / Cambiar destino / etc.)
2. **Ambiguity resolution**: `ambiguity-handler.ts` genera opciones numeradas para ubicaciones ambiguas
3. **OI layer sugerencias**: botones [Yes] [Change time] para horarios inferidos

### Evidencia en contra

El sistema FUERZA el uso de botones en slot_confirmation mediante un mensaje de rechazo:
```typescript
// slot-confirmation-text-handler.ts
const fallbackMsg = "¿Querés confirmar o cambiar los datos? Usá los botones de abajo 👇";
// ...
await sendWhatsAppMessage(phone, fallbackMsg);  // Envía mensaje forzando botones
```

Esto agrega FRICCIÓN: el usuario escribe "sí" y el sistema responde "usá los botones" en vez de interpretar el "sí" como confirmación.

El mensaje de fallback usa texto genérico que no reconoce lo que el usuario escribió. Si el usuario escribió "sí, confirmo", la respuesta debería ser "Perfecto, ya confirmamos tu viaje" en vez de "usá los botones".

Las listas de opciones en ambiguity resolution son funcionales pero largas (hasta 7 opciones numeradas). Para WhatsApp mobile, listas de más de 4-5 opciones son difíciles de leer.

### Cuándo mejoran la conversación
- Confirmación de viaje con botones (reduce error)
- Opciones numeradas para ubicaciones ambiguas

### Cuándo empeoran la conversación
- Forzar botones cuando el usuario escribe texto libre en slot_confirmation
- Listas largas de opciones en mobile

### Veredicto

Los interactive messages están bien usados para confirmación y ambigüedad, pero el rechazo de texto libre en slot_confirmation es un antipatrón conversacional grave.

---

## 19. Velocidad conversacional

**Estado: 🟢 Cumplido**

### Evidencia

StrategyDecision controla explícitamente la velocidad:

| Señal | Efecto en velocidad |
|-------|-------------------|
| purchaseIntent = "high" | `fieldAcquisitionMode: "skip"` — no pregunta campos, ejecuta directo |
| purchaseIntent = "low" | `skipLLM: true` — no usa LLM, template directo |
| Urgencia detectada | `skipFieldResolution: true` — salta resolución de campos |
| ClientObjective = "inquiry_price" | `inhibitBookingAccept: true` — no fuerza booking |
| Affirmation en awaiting_confirmation | Booking aceptado inmediatamente |

```typescript
// handler.ts
const strategyDecision = computeStrategyDecision({
  facts, purchaseIntent, urgency, messageType,
  isCorrection, clientObjective, decision, intent,
});
// La decisión de velocidad se toma ANTES de policy
```

El sistema efectivamente acelera (salta pasos) cuando hay urgencia o alta intención de compra, y desacelera (mejor preguntar) cuando no.

### Veredicto

La velocidad conversacional está correctamente implementada a través de StrategyDecision. Es uno de los principios mejor implementados.

---

## 20. Capacidad de sorprender positivamente

**Estado: 🟡 Parcial**

### Evidencia a favor

El OI layer ofrece sorpresas positivas:
- **Inferencia de aeropuerto**: El usuario dice "IGR a las 10" y el sistema reconoce el código, lo resuelve a nombre canónico, sin preguntar.
- **Inferencia de horario**: "mañana al parque" → "El parque abre a las 8am. ¿Recojo a las 7:45?"
- **Inferencia de frontera**: detectar qué lado de la aduana según origen

### Evidencia en contra

No hay sorpresas proactivas basadas en contexto no explícito:
- "Veo que viajan con niños..." (el sistema sabe que hay pasajeros pero no pregunta edades)
- "Como llegan desde Brasil..." (el sistema sabe el origen del vuelo)
- "Ya viajaron con nosotros antes..." (no hay reconocimiento de cliente recurrente)
- "El clima para mañana..." (no conecta knowledge layer con el viaje)

El sistema reacciona a lo que el usuario dice pero no anticipa lo que el usuario podría necesitar.

### Veredicto

El OI layer genera sorpresas positivas limitadas (horario, aeropuerto) pero no hay anticipación contextual más amplia. El sistema sabe mucho (knowledge layer, historial, ubicación) pero no lo usa proactivamente.

---

## Principios emergentes

Durante la auditoría se detectaron principios no documentados que el sistema implementa sin estar formalizados:

### E1 — Principio de no-repregunta

**Estado: 🟢 Implementado**

El sistema nunca pregunta lo que ya sabe. `slot-state.ts` preserva valores confirmados entre turnos:
```typescript
const prev = prevStates[k];
if (prev && prev.status === "CONFIRMED" && !hasCorrection && !hasAffirmation) {
  if (String(slot.value) === String(prev.value)) {
    source = prev.source; status = "CONFIRMED";
  }
}
```

Esto evita que el usuario tenga que repetir información. Es un principio importante no documentado.

### E2 — Principio de tolerancia a interrupciones

**Estado: 🟡 Parcial**

El Conversation Interpreter detecta `topic_change`, `correction`, y `continuation`. Esto permite que el usuario cambie de tema o corrija sin perder contexto. Pero el sistema no maneja bien interrupciones en medio de slot_confirmation (fuerza botones).

### E3 — Principio de contexto mínimo

**Estado: 🟡 Parcial**

En `slot-confirmation-text-handler.ts`, cuando el usuario escribe texto durante slot_confirmation, el sistema intenta extraer el cambio mínimo (regex simple como "al centro", "desde el hotel") sin reprocesar todo. Esto es bueno, pero el fallback a "usá los botones" rompe el principio.

---

## Comportamientos legacy detectados

Comportamientos heredados del paradigma pregunta→respuesta que persisten:

### L1 — Slot confirmation como estado separado

El flujo: `collecting_slots` → `slot_confirmation` → `awaiting_passenger` → `awaiting_confirmation`. Cada estado es una etapa que el sistema debe atravesar secuencialmente. Esto fuerza preguntas en orden fijo en vez de adaptarse al contenido del mensaje.

### L2 — Un campo por pregunta

El sistema nunca pregunta dos campos en el mismo mensaje. Es una limitación del diseño original donde cada slot se recolectaba individualmente.

### L3 — Texto libre rechazado en slot_confirmation

El handler de texto en slot_confirmation rechaza texto libre y fuerza botones. Esto asume que la confirmación es siempre mejor con UI estructurada, cuando el usuario naturalmente escribe "sí" o "confirmo".

### L4 — Mensaje de error sin explicación

"Error interno. Cliente derivado a operador." es lenguaje de sistema, no conversacional. No explica qué pasó ni qué puede hacer el usuario.

### L5 — Ausencia de resumen post-ejecución

Después de ejecutar un viaje (AHORA), el sistema dice "Buscando chofer..." y no da más información hasta que el chofer acepta. El usuario queda sin saber qué esperar.

---

## Oportunidades de UX (clasificadas por impacto)

### Impacto ALTO (afectan a casi todos los usuarios)

| # | Oportunidad | Evidencia | Esfuerzo | Dependencia |
|---|------------|-----------|----------|-------------|
| O1 | **Preguntas compuestas**: Origin + destination, passengers + time en un mismo mensaje | Principio 16 🔴 | Medio | Policy pipeline |
| O2 | **Aceptar texto libre en slot_confirmation** en vez de forzar botones | Principio 18, L3 | Bajo | slot-confirmation-text-handler.ts |
| O3 | **Explicar cada pregunta**: "¿Cuántos pasajeros (para calcular el precio)?" | Principio 13 🟡 | Bajo | response-builder.ts / i18n |
| O4 | **Alternativas ante restricciones**: "No tenemos auto grande, ¿dividimos en 2?" | Principio 12 🔴 | Medio | fleet-validation + response |
| O5 | **Resumen post-ejecución**: "Buscando chofer... te avisamos cuando alguien acepte" | L5 | Bajo | policy-ahora.ts |

### Impacto MEDIO (afectan a usuarios en situaciones específicas)

| # | Oportunidad | Evidencia | Esfuerzo | Dependencia |
|---|------------|-----------|----------|-------------|
| O6 | **Perfil de pasajero**: detectar niños → ofrecer silla | Principio 10 🟡 | Bajo | CORE + entity-extractor |
| O7 | **Educación sistemática**: "Dijiste 'el aeropuerto' — Aeropuerto IGR (IGR) ¿correcto?" | Principio 9 🟡 | Bajo | slot-confirmation.ts |
| O8 | **Reconocimiento de cliente recurrente**: "Bienvenido de nuevo, Juan" + historial | Principio 10 | Medio | lead.service + memory |
| O9 | **Mejor formato visual**: negritas para precios, separadores para resumen | Principio 17 🟡 | Bajo | response-builder.ts |
| O10 | **Explicación de errores**: "No entendí bien. ¿Podés decir 'desde X hasta Y'?" | Principio 13 | Medio | comprehension-runner.ts |

### Impacto BAJO (mejoras incrementales)

| # | Oportunidad | Evidencia | Esfuerzo | Dependencia |
|---|------------|-----------|----------|-------------|
| O11 | **Proactividad climática**: "Mañana lluvia pronosticada en Iguazú" | Principio 20 | Alto | knowledge + weather API |
| O12 | **Audio como alternativa en slot_confirmation** | Principio 18 | Alto | transcripción |
| O13 | **Resumen post-viaje**: "¿Cómo fue tu viaje?" con formato | L5 | Bajo | survey.service |

---

## Conclusión

### 1. ¿Qué tan cerca está AITOS del comportamiento conversacional ideal?

**52% — Mitad del camino.**

Desglose razonado:

| Área | Peso | Avance | Ponderado |
|------|------|--------|-----------|
| **Resolver antes de vender** | 10% | 60% | 6% |
| **Intención evolutiva** | 10% | 30% | 3% |
| **No prometer recursos** | 10% | 100% | 10% |
| **Costo del error** | 10% | 40% | 4% |
| **Preguntar solo lo necesario** | 10% | 50% | 5% |
| **Minimizar turnos** | 10% | 40% | 4% |
| **Naturalidad + carga cognitiva** | 10% | 50% | 5% |
| **Microconfirmaciones + educación** | 10% | 40% | 4% |
| **Velocidad conversacional** | 10% | 90% | 9% |
| **Restricción + alternativa + sorpresa** | 10% | 20% | 2% |

**Total: 52%**

AITOS tiene una base conversacional sólida (no promete recursos, velocidad adaptativa, contexto preservado) pero las debilidades principales están en eficiencia de turnos (preguntas compuestas, texto libre aceptado) y profundidad de interacción (perfil de pasajero, educación, alternativas).

### 2. Las 10 mejoras con mayor impacto percibido por el pasajero

| # | Mejora | Impacto en experiencia (1-10) | Esfuerzo estimado | Dependencia arquitectónica |
|---|-------|------------------------------|-------------------|--------------------------|
| 1 | Aceptar texto libre en slot_confirmation (no forzar botones) | 9 | 2 días | Baja (slot-confirmation-text-handler.ts) |
| 2 | Preguntas compuestas (origin+destination, passengers+time) | 9 | 5 días | Media (policy pipeline) |
| 3 | Explicar cada pregunta ("para calcular el precio") | 8 | 1 día | Baja (i18n + response-builder) |
| 4 | Alternativas ante restricciones (flota, precio, horario) | 8 | 3 días | Media (fleet + response) |
| 5 | Resumen post-ejecución con estimación de tiempo | 7 | 1 día | Baja (policy-ahora.ts) |
| 6 | Mensajes de error conversacionales (no "Error interno") | 7 | 1 día | Baja (response-builder.ts) |
| 7 | Educación sistemática de nombres de lugares | 7 | 2 días | Media (slot-confirmation + display-names) |
| 8 | Perfil de pasajero: detectar niños → silla | 6 | 3 días | Media (entity-extractor + policy) |
| 9 | Formato visual mejorado (negritas en WhatsApp) | 6 | 1 día | Baja (response-builder.ts) |
| 10 | Microconfirmaciones en flujo AHORA (hoy no tiene) | 6 | 1 día | Baja (policy-ahora.ts) |

### 3. Principios que deberían convertirse en invariantes permanentes

**Criterio:** Reglas que ninguna evolución futura puede romper sin una decisión arquitectónica explícita (ADR).

#### P-I1 — No prometer recursos no verificados (from P3)
No se puede decir "chofer confirmado", "auto disponible", o "hora exacta" hasta que el componente responsable (dispatch, fleet, scheduling) lo confirme.

**Origen:** Auditoría #04, Principio 3. Ya se cumple.

#### P-I2 — Velocidad adaptativa por defecto (from P19)
El sistema no puede tener una única velocidad conversacional. Debe acelerar cuando hay urgencia/alta intención y desacelerar cuando hay ambigüedad/baja intención.

**Origen:** Auditoría #04, Principio 19. Ya se cumple.

#### P-I3 — Contexto preservado entre turnos (from E1)
El sistema nunca puede preguntar información que el usuario ya proporcionó y fue confirmada, a menos que el contexto haya cambiado explícitamente.

**Origen:** Principio emergente E1. Ya se cumple parcialmente (slot-state.ts preserve confirmed).

#### P-I4 — Preguntar con propósito (from P5 + P13)
Cada pregunta debe tener una razón explícita y visible para el usuario. No se pueden hacer preguntas sin explicar por qué son necesarias.

**Origen:** Auditoría #04, Principios 5 y 13. NO se cumple actualmente.

#### P-I5 — Alternativa ante restricción (from P12)
Cada vez que el sistema informa que algo no se puede hacer, debe ofrecer al menos una alternativa, aunque sea "¿Querés que un operador te ayude?"

**Origen:** Auditoría #04, Principio 12. NO se cumple actualmente.

#### P-I6 — Jamás rechazar texto libre (from P18)
Si el usuario escribe texto, el sistema debe interpretarlo. No puede responder con "usá los botones" o "no entendí". Debe intentar extraer significado del texto libre antes de cualquier fallback.

**Origen:** Auditoría #04, Principio 18, Comportamiento legacy L3. NO se cumple actualmente.

#### P-I7 — La evidencia precede a la decisión (from Auditoría #02)
Ninguna decisión conversacional puede basarse en una única fuente de información. Cada decisión debe considerar todas las evidencias disponibles (texto actual, historial, slots, knowledge, señales contextuales).

**Origen:** Auditoría #02 (Modelo Cognitivo Ideal). StrategyDecision se acerca pero no implementa completamente.

---

*Fin de Auditoría #04 — Principios Conversacionales*
