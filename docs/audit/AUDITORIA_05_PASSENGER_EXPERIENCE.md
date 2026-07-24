# Auditoría #05 — Passenger Experience Audit

> **Fecha:** 2026-07-11
> **Método:** Simulación de experiencia completa desde la perspectiva del pasajero. Sin análisis de código, sin arquitectura, sin tablas. Solo experiencia vivida.
> **Supuesto:** Pasajero típico de TaxiGuazú — turista en Iguazú, habla español, usa WhatsApp, necesita un transfer.

---

## Customer Journey completo

Simulación de una conversación típica con AITOS, desde el primer mensaje hasta el cierre del servicio. Se analiza cada etapa emocional y funcional.

Caso base: *"Hola buenos días, necesito un taxi del aeropuerto IGR al centro de Puerto Iguazú, somos 2 personas"*

---

### Etapa 1: Primer contacto

**Lo que ocurre:**
El pasajero envía un mensaje a un número de WhatsApp. Recibe una respuesta inmediata (sin demora humana).

**Lo que el pasajero experimenta:**
- El mensaje llega a un número de WhatsApp normal. No pide instalar nada.
- La respuesta llega en segundos, no minutos.
- La respuesta comienza con un saludo personal ("¡Hola! Soy Cris...").

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Curiosidad | 🟢 Ayuda | "¿Quién responde tan rápido?" |
| Desconfianza | 🟡 Neutro | "¿Es un bot o una persona?" — depende de la naturalidad de la respuesta |
| Urgencia | 🟢 Ayuda | La velocidad de respuesta da tranquilidad inicial |
| Expectativa | 🟡 Neutra | "Espero que me entienda" — aún no hay suficiente información |

**Problemas detectados:**
1. El sistema, ante un mensaje combinado (saludo + pedido), envía DOS mensajes separados: primero la intro de Cris, luego el mensaje de negocio. El pasajero recibe dos notificaciones para un solo input. En WhatsApp, esto puede sentirse como que el bot "está pensando" o "está escribiendo mucho".
2. La intro de Cris no varía según el contexto del mensaje. Un pasajero que dijo "necesito un taxi urgente" recibe la misma intro que uno que dijo "hola, ¿cómo están?".

**Qué impresión genera:**
- *"Parece un bot, pero responde rápido"* — primera impresión mixta
- *"Al menos responde al instante"* — valoración positiva inicial
- *"Me saludó por mi nombre (si lo tiene)"* — toque personal

**Comparación con recepcionista de hotel:**
Un recepcionista humano respondería con una sola frase que combina saludo + respuesta al pedido. "¡Buen día! Claro, un transfer del aeropuerto al centro. ¿A qué hora llega su vuelo?" — una sola interacción, no dos.

**Impresión general: 🟡 Positiva pero mejorable**

---

### Etapa 2: Descubrimiento

**Lo que ocurre:**
El sistema comienza a hacer preguntas para entender el viaje. Las hace una por turno.

**Lo que el pasajero experimenta:**
- Una pregunta a la vez
- Sin explicación de por qué pregunta
- Las preguntas son específicas ("¿Cuántos pasajeros?", "¿A qué hora?")
- Si la ubicación es ambigua, presenta una lista numerada de opciones

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Interés | 🟢 Ayuda | Las preguntas muestran que el sistema quiere entender |
| Impaciencia | 🔴 Perjudica | Una pregunta por turno = muchos turnos = sensación de lentitud |
| Confianza | 🟡 Neutra | Las opciones numeradas para ubicación ambigua generan confianza (el sistema reconoce que no sabe) |
| Frustración | 🔴 Si la ubicación es ambigua | "Ya le dije que es al centro... ¿por qué me pregunta a qué parte?" |
| Carga cognitiva | 🟡 Baja por turno, alta acumulada | Cada pregunta es simple, pero el viaje completo requiere 4-5 preguntas |

**Problemas detectados:**
1. **Una pregunta por turno**: El sistema desperdicia oportunidades. "¿Desde dónde?" es un turno. "¿Hacia dónde?" es otro. Cuando podría ser "¿Desde dónde y hacia dónde?" en un solo turno.
2. **Sin explicación**: "¿Cuántos pasajeros?" sin decir "para calcular el precio exacto". El pasajero no sabe por qué le preguntan cada cosa.
3. **Sin resumen parcial**: Después de 2-3 respuestas, el pasajero no escucha "Perfecto, entonces sería: desde Aeropuerto IGR hasta Hotel Amerian, 2 pasajeros" — el avance se pierde.
4. **Ambigüedad geográfica tratada como error**: Si el pasajero dice "al centro", el sistema trata "centro" como un problema (ambiguo) y pide aclarar con opciones. El pasajero no siente que el sistema "no sabe" — siente que "no entendió bien". La diferencia es sutil pero importante.

**Comparación con recepcionista de hotel:**
Un recepcionista preguntaría: "Perfecto, del aeropuerto al centro. ¿A qué parte del centro? Hotel, terminal, casino?" — en una sola pregunta educada que reconoce lo que ya sabe y pide solo el detalle faltante.

**Impresión general: 🟡 Funcional pero lento**

---

### Etapa 3: Comprensión

**Lo que ocurre:**
El sistema procesa cada respuesta y actualiza su modelo del viaje. Cuando tiene suficiente información, presenta un resumen.

**Lo que el pasajero experimenta:**
- Después de dar toda la información, el sistema presenta un resumen con confirmación
- El resumen muestra origen, destino, pasajeros, precio
- Los items pendientes aparecen con ⚠️
- Pregunta "¿Confirmás?"

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Alivio | 🟢 Ayuda | "Por fin me pregunta si está bien" |
| Satisfacción | 🟢 Ayuda | "Voy leyendo lo que entendió y puedo corregir" |
| Frustración | 🔴 Si algo está mal | Si el sistema entendió mal, el pasajero debe iniciar corrección, lo que agrega turnos |
| Ansiedad | 🟡 Tipografía densa | El resumen tiene mucha información junta (5-7 líneas) |

**El pasajero se pregunta:** *"¿Me entendió bien? ¿Tengo que leer todo esto con cuidado?"*

**Problemas detectados:**
1. **El resumen aparece de golpe**: Después de 3-4 turnos de preguntas, el sistema vierte TODO de una vez. El pasajero pasa de responder una pregunta simple a recibir 7 líneas de confirmación. Es un pico de carga cognitiva.
2. **⚠️ puede generar alarma**: El emoji ⚠️ sugiere "peligro" o "error". Un pasajero podría pensar "¿qué hice mal?" en vez de "esto necesita confirmación".
3. **Corrección requiere acción**: Si algo está mal, el pasajero debe tocar un botón ("Cambiar destino") y luego escribir el valor correcto. Son 2-3 turnos adicionales para una simple corrección.

**Comparación con recepcionista de hotel:**
"Perfecto, entonces confirme: aeropuerto al Hotel Amerian, 2 personas, $45.000. ¿Está bien así?" — es una frase, no un formulario.

**Impresión general: 🟡 Comprensión funcional, comunicación sobrecargada**

---

### Etapa 4: Resolución

**Lo que ocurre:**
El pasajero confirma y el sistema ejecuta la acción: crea un viaje, inicia dispatch, o agenda la reserva.

**Lo que el pasajero experimenta:**
- Para AHORA: mensaje breve "Buscando chofer..." y después silencio hasta que alguien acepta
- Para RESERVA: mensaje de booking aceptado con detalles del viaje
- En ambos casos, no hay más información hasta que ocurre algo (chofer acepta, llega la hora)

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Tranquilidad | 🟢 "Ya está, el viaje está creado" |
| Ansiedad | 🔴 "¿Y ahora qué? ¿Cuánto espero? ¿Me avisan?" |
| Incertidumbre | 🔴 "¿El chofer ya sabe que vengo? ¿Tengo que hacer algo?" |
| Confianza | 🟡 El sistema confirmó, pero no hay seguimiento |

**Problemas detectados:**
1. **"Buscando chofer..." no da contexto**: ¿Cuánto tarda? ¿Qué pasa si no hay chofer? ¿Me avisan si no encuentra? El pasajero queda en un estado de espera sin información.
2. **No hay follow-up activo**: Mientras se busca chofer (que puede tomar hasta 1 hora en nivel 1), el pasajero no recibe actualizaciones. Podría pensar que el sistema se olvidó.
3. **Reserva futura sin recordatorio**: Si el viaje es para mañana, no hay "Te recuerdo que mañana tenés viaje a las 9am" — el pasajero debe acordarse solo.

**Comparación con concierge:**
Un concierge humano diría: "Listo, ya estoy buscando un chofer. En aproximadamente 5 minutos te confirmo. Si no consigo en 15 minutos, te aviso y busco alternativas. ¿Querés que te mande un mensaje cuando esté todo listo?"

**Impresión general: 🟡 Resuelve pero no acompaña**

---

### Etapa 5: Cotización

**Lo que ocurre:**
El sistema calcula el precio y lo presenta como parte del resumen de confirmación.

**Lo que el pasajero experimenta:**
- Un precio en ARS
- Un rango de pasajeros ("hasta 4 pasajeros")
- Sin desglose (base + impuestos + recargos)

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Evaluación | 🟢 "Está bien, $45.000 por el viaje" |
| Comparación | 🟡 "¿Es caro? ¿Es barato?" — sin contexto de precios de referencia |
| Tranquilidad | 🟢 "El precio está claro antes de confirmar" |
| Duda | 🔴 "¿ARS es pesos argentinos? ¿Cuánto es en dólares?" |

**Problemas detectados:**
1. **Moneda no necesariamente clara**: Para un turista extranjero, "ARS" puede no ser obvio. La respuesta ideal incluiría "ARS (pesos argentinos)".
2. **Sin transmisión de valor**: El precio se presenta como hecho consumado. No hay "Un viaje cómodo y seguro desde el aeropuerto hasta el centro por $45.000" — la frase transmite valor además del precio.
3. **Sin opciones**: Si hay múltiples tarifas (estándar, premium), el sistema no las presenta. El pasajero ve un único precio.
4. **Rango de pasajeros confuso**: "hasta 4 pasajeros" después de decir "2 personas" — el pasajero podría pensar "¿el precio cambia si somos 4?"

**Comparación con recepcionista de hotel:**
"El traslado desde el aeropuerto al centro tiene un valor de $45.000 ARS (unos USD 35). Incluye recepción en llegadas con cartel, aire acondicionado y seguro. ¿Le parece bien?"

**Impresión general: 🟡 Claro pero frío, sin valor agregado**

---

### Etapa 6: Confirmación

**Lo que ocurre:**
El pasajero confirma el viaje. El sistema responde con booking accepted.

**Lo que el pasajero experimenta:**
- "¡Viaje confirmado! Origen: X, Destino: Y, Precio: $X ARS"
- Botones de confirmación (sí/no)
- Si usa texto en vez de botones, el sistema le pide que use botones

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Satisfacción | 🟢 "Ya está, tengo mi viaje" |
| Tranquilidad | 🟢 "Recibí confirmación por escrito" |
| Frustración | 🔴 Si escribe "sí" y el sistema responde "usá los botones" |
| Seguridad | 🟢 "Todo quedó registrado" |

**El momento más crítico de la experiencia:** aquí el pasajero decide si confía o no.

**Problemas detectados:**
1. **Rechazo de texto libre**: Si el pasajero escribe "sí, confirmo" en vez de tocar el botón, el sistema responde "Usá los botones de abajo 👇". Es el momento de mayor fricción en toda la experiencia. El pasajero pensará "¿en serio? ¿no podés entender un 'sí'?"
2. **Booking accepted es informativo, no cálido**: "¡Viaje confirmado!" es funcional. "Perfecto, su viaje está confirmado. El chofer lo estará esperando en llegadas del aeropuerto IGR con un cartel a su nombre" transmite seguridad y detalle.
3. **Sin instrucciones post-confirmación**: ¿Dónde esperar? ¿Cómo identificar al chofer? ¿Qué pasa si no llega? El pasajero tiene estas preguntas sin respuesta.

**Comparación con concierge:**
"Perfecto, su viaje está confirmado. Mañana a las 9:00, Juan, nuestro chofer, lo esperará en la puerta de llegadas del aeropuerto IGR con un cartel a su nombre. Le enviaré un recordatorio 30 minutos antes. Si hay algún cambio, puede escribirme acá mismo."

**Impresión general: 🟡 Confirma pero no asegura. Fricción con texto libre.**

---

### Etapa 7: Espera (hasta el viaje)

**Lo que ocurre:**
Después de la confirmación, el sistema queda en silencio hasta que ocurre el evento programado (llegada del chofer, hora del viaje).

**Lo que el pasajero experimenta:**
- Silencio total
- Sin actualizaciones de estado
- Sin saber si el chofer ya fue asignado
- Sin saber si el sistema "se acordó"

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Ansiedad | 🔴 "¿Ya consiguieron chofer? ¿Llega?" |
| Duda | 🔴 "¿El sistema funciona? ¿O me voy a quedar esperando?" |
| Inseguridad | 🔴 "¿Tengo que escribir yo para saber cómo va?" |
| Tranquilidad | 🟡 Solo si el pasajero confía ciegamente |

**Problemas detectados:**
1. **Follow-up activo cero**: El sistema no tiene un mecanismo de "te avisamos cuando tengamos novedades". El pasajero debe escribir para preguntar.
2. **Check de timeouts no visible al pasajero**: Los niveles de dispatch (1h, 30min, 8min) ocurren puertas adentro. El pasajero no sabe si están buscando o si ya se rindieron.
3. **Sin re-engagement ante demora**: Si el dispatch está demorando, no hay "Estamos buscando chofer, puede llevar unos minutos más. ¿Quiere que lo mantengamos al tanto?"

**Comparación con una app de movilidad (Uber, Didi):**
Estas apps muestran: "Buscando chofer → Chofer asignado (nombre, auto, rating, ubicación) → Chofer llegando → En viaje". En cada paso, el pasajero SABE qué está pasando. AITOS no tiene esto.

**Impresión general: 🔴 El mayor punto débil de la experiencia**

---

### Etapa 8: Servicio

**Lo que ocurre:**
El viaje está en curso. El sistema no participa activamente.

**Lo que el pasajero experimenta:**
- El viaje ocurre offline (no hay seguimiento GPS, no hay notificaciones)
- El pasajero y el chofer se coordinan directamente
- El sistema no interviene

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Confianza | 🟡 "El viaje está en curso" |
| Incertidumbre | 🔴 Si algo sale mal, el pasajero no sabe a quién recurrir |
| Acompañamiento | 🔴 Ausente — el sistema no está presente durante el viaje |
| Seguridad | 🟡 "Tengo el número de WhatsApp si algo pasa" |

**Problemas detectados:**
1. **No hay seguimiento del viaje**: El pasajero no sabe si el chofer llegó, si está en camino, si hay demora.
2. **No hay punto de contacto durante el servicio**: Si el chofer se pierde, si hay un problema con la dirección, el pasajero debe llamar/WhatsAppear al número del sistema, no hay un botón de "Ayuda durante el viaje".
3. **No hay confirmación de llegada**: El sistema no pregunta "¿Llegaron bien?" después de la hora estimada.

**Impresión general: 🔴 El sistema desaparece durante el servicio**

---

### Etapa 9: Cierre

**Lo que ocurre:**
Después del viaje, el sistema posiblemente envía una encuesta de satisfacción (post-service survey).

**Lo que el pasajero experimenta:**
- Posible mensaje de encuesta: "¿Cómo fue tu viaje?"
- Sin resumen del servicio completado
- Sin "gracias por viajar con nosotros"
- Sin invitación a futuro

**Emociones probables:**

| Emoción | ¿Ayuda o perjudica? | Detalle |
|---------|---------------------|---------|
| Satisfacción | 🟢 Si el viaje fue bien y el sistema lo reconoce |
| Indiferencia | 🟡 "Bueno, ya fue" — el cierre es plano |
| Fidelización | 🔴 Perdida — no hay invitación a volver |
| Recuerdo | 🔴 El sistema no deja una impresión duradera |

**Problemas detectados:**
1. **No hay "gracias por viajar con nosotros"**: El cierre más básico de cualquier servicio.
2. **No hay resumen del viaje**: El sistema podría decir "Viaje completado: Aeropuerto IGR → Hotel Amerian, 2 personas, $45.000 ARS. ¡Gracias por viajar con TaxiGuazú!"
3. **No hay invitación a futuro**: "¿Necesitás otro viaje? Estamos acá cuando nos necesites."
4. **No hay acumulación de historial**: Un pasajero recurrente no ve su historial ni recibe beneficios por repetición.

**Comparación con concierge:**
"Espero que hayan tenido un excelente viaje. Si necesitan traslado de regreso o a las cataratas, no duden en escribirme. ¡Buenas vacaciones!"

**Impresión general: 🟡 Cierre funcional, sin calidez**

---

## Análisis de emociones por etapa — Mapa completo

| Etapa | Emociones principales | AITOS ayuda o perjudica |
|-------|----------------------|------------------------|
| 1. Primer contacto | Curiosidad, desconfianza, urgencia, expectativa | 🟡 Ayuda con velocidad, perjudica con doble mensaje |
| 2. Descubrimiento | Interés, impaciencia, confianza, frustración | 🟡 Ayuda con estructura, perjudica con lentitud (un campo por turno) |
| 3. Comprensión | Alivio, satisfacción, frustración, ansiedad | 🟡 Ayuda con resumen, perjudica con densidad y sorpresa |
| 4. Resolución | Tranquilidad, ansiedad, incertidumbre | 🟡 Resuelve, pero no acompaña la espera |
| 5. Cotización | Evaluación, comparación, tranquilidad, duda | 🟡 Precio claro pero frío, sin contexto de valor |
| 6. Confirmación | Satisfacción, tranquilidad, frustración, seguridad | 🟡 Confirma bien, frustra con rechazo de texto libre |
| 7. Espera | Ansiedad, duda, inseguridad | 🔴 Silencio total — el peor momento de la experiencia |
| 8. Servicio | Confianza, incertidumbre | 🔴 Sistema ausente durante el servicio |
| 9. Cierre | Satisfacción, indiferencia, fidelización perdida | 🟡 Cierra pero no invita a volver |

---

## Análisis de fricciones

### Fricciones ALTAS (afectan a casi todos los pasajeros)

| # | Fricción | Etapa | Efecto en el pasajero |
|---|----------|-------|----------------------|
| F1 | **Texto libre rechazado en slot_confirmation** | 6 | El pasajero escribe "sí" y el sistema responde "usá los botones". Sensación: "¿Es broma? No entiende un 'sí'." |
| F2 | **Una pregunta por turno** | 2 | Para completar un viaje, el pasajero responde 4-5 pregunta _individuales_. Sensación: "Podría preguntarme todo junto en vez de hacerme escribir 4 veces." |
| F3 | **Silencio post-confirmación** | 7 | Después de confirmar, el pasajero no recibe más información. Sensación: "¿Ya está? ¿Me van a avisar?" |
| F4 | **Dos mensajes para un input (COMBINED_GREETING)** | 1 | Saludo + pedido → dos respuestas separadas. Sensación: "Podría decirlo todo en un solo mensaje." |
| F5 | **Sin explicación en preguntas** | 2 | "¿Cuántos pasajeros?" sin contexto. Sensación: "¿Por qué necesita saber eso?" |

### Fricciones MEDIAS (afectan en situaciones específicas)

| # | Fricción | Etapa | Efecto en el pasajero |
|---|----------|-------|----------------------|
| F6 | ⚠️ como marcador visual | 3 | Asociado a peligro/error, no a "pendiente de confirmación" |
| F7 | Confirmación sin instrucciones | 6 | "¿Dónde espero al chofer? ¿Cómo lo identifico?" |
| F8 | Precio sin contexto de valor | 5 | "$45.000 ARS" sin "es un viaje cómodo y seguro" |
| F9 | Ambigüedad tratada como error | 2 | "centro" → el sistema no dice "no conozco esa dirección exacta" sino "no entendí" implícitamente |
| F10 | Sin resumen parcial durante recolección | 2 | Después de 2 respuestas, el pasajero no escucha qué entendió el sistema |

### Fricciones BAJAS (menos frecuentes o tolerables)

| # | Fricción | Etapa | Efecto en el pasajero |
|---|----------|-------|----------------------|
| F11 | Moneda sin aclaración | 5 | "ARS" no es obvio para turistas |
| F12 | Sin opciones de vehículo | 5 | Un solo precio, sin "estándar" vs "premium" |
| F13 | Sin cierre cálido | 9 | No hay "gracias por viajar con nosotros" |
| F14 | Sin historial visible | 9 | Pasajero recurrente no ve sus viajes pasados |
| F15 | Mensaje de error no conversacional | 3 | "Error interno. Cliente derivado a operador." — lenguaje de sistema |

---

## Análisis de momentos WOW

Oportunidades donde AITOS podría superar expectativas.

### W1 — Reconocimiento de código de aeropuerto (YA EXISTE PARCIALMENTE)

**Oportunidad:** El pasajero escribe "IGR" y el sistema responde "Aeropuerto IGR (Cataratas del Iguazú)".
**Estado actual:** El OI layer lo infiere y lo marca como CONFIRMED si es explícito. Pero en el flujo normal no se muestra el nombre canónico hasta la confirmación.

**Mejora potencial:** "Registré 'Aeropuerto IGR (Cataratas del Iguazú)' como origen." — el pasajero piensa "qué inteligente, reconoció el código".

### W2 — Inferencia de horario por atracción (YA EXISTE)

**Oportunidad:** "mañana quiero ir al Parque Nacional Iguazú" → "El parque abre a las 8am. ¿Sugiero recogida a las 7:45?"
**Estado actual:** AIT-061 implementado. Es un momento WOW real cuando ocurre.

**Mejora potencial:** Agregar "Los miércoles el parque abre a las 10am por mantenimiento. Mañana es miércoles — ¿recogida a las 9:45?" — usar knowledge layer proactivamente.

### W3 — Detección de vuelo + seguimiento (OPORTUNIDAD NO IMPLEMENTADA)

**Oportunidad:** "llego en el vuelo AR 1244" → el sistema podría: (a) registrar el vuelo, (b) monitorear demoras, (c) ajustar la recogida automáticamente.

**Estado actual:** `flight:` fact se extrae pero no se usa para seguimiento. Se pierde la oportunidad.

### W4 — Contexto familiar (OPORTUNIDAD NO IMPLEMENTADA)

**Oportunidad:** "somos 2 adultos y un bebé" → "Registré que viajan con un bebé. ¿Necesitan silla infantil? Podemos conseguir una sin cargo adicional."

**Estado actual:** El sistema extrae "3" como pasajeros. No distingue adultos de niños. Oportunidad perdida.

### W5 — Recomendación local (OPORTUNIDAD PARCIAL)

**Oportunidad:** El knowledge layer tiene información de atracciones, restaurantes, clima. Podría usarse proactivamente.

**Estado actual:** El knowledge se usa solo cuando el usuario pregunta explícitamente ("¿qué hay para hacer en Iguazú?"). No se ofrece proactivamente.

### W6 — Reconocimiento de cliente recurrente (OPORTUNIDAD NO IMPLEMENTADA)

**Oportunidad:** "¡Bienvenido de nuevo, Juan! La última vez viajaste al Hotel Amerian. ¿Otra vez al mismo destino?"

**Estado actual:** No hay reconocimiento de cliente. Cada interacción comienza desde cero.

### W7 — Confirmación con detalle visual (OPORTUNIDAD PARCIAL)

**Oportunidad:** Además del texto, enviar un mensaje con formato mejorado: negritas para el precio, separación visual clara entre ítems.

**Estado actual:** Solo texto plano con emojis. WhatsApp permite negritas (`*texto*`) y el sistema no las usa.

### W8 — Actualización proactiva durante espera (OPORTUNIDAD NO IMPLEMENTADA)

**Oportunidad:** "Ya asignamos un chofer. Juan Carlos, Toyota Corolla blanco, lo espera en llegadas en 10 minutos."

**Estado actual:** Silencio total después de "Buscando chofer..."

### W9 — Clima contextual (OPORTUNIDAD NO IMPLEMENTADA)

**Oportunidad:** "Mañana hay probabilidad de lluvia en Iguazú. Llevá paraguas." o "Hoy hace calor, el chofer tendrá el aire acondicionado prendido."

**Estado actual:** No conecta knowledge de clima con el viaje.

### W10 — Post-viaje con valor (OPORTUNIDAD PARCIAL)

**Oportunidad:** "¿Cómo fue tu viaje al Hotel Amerian? ⭐⭐⭐⭐⭐. Por cierto, si mañana querés ir a las Cataratas, tenemos un paquete especial."

**Estado actual:** Survey existe pero es genérica, sin conexión con el viaje realizado ni oferta contextual.

---

## Análisis de confianza

### Elementos que GENERAN confianza

| Elemento | Presente | Evidencia |
|----------|----------|-----------|
| Respuesta inmediata | ✅ Sí | El sistema siempre responde sin demora |
| Confirmación explícita | ✅ Sí | Resumen + "¿Confirmás?" |
| Corrección posible | ✅ Sí | Botones de cambio + texto de corrección |
| Precio antes de confirmar | ✅ Sí | Precio mostrado en el resumen |
| Lenguaje claro | ✅ Sí | Frases cortas, sin jerga técnica |
| Historial preservado | ✅ Sí | No repregunta lo ya confirmado |
| Opciones ante ambigüedad | ✅ Sí | Lista numerada de ubicaciones |

### Elementos que GENERAN PÉRDIDA de confianza

| Elemento | Presente | Evidencia |
|----------|----------|-----------|
| Rechazo de texto libre | ✅ Sí | "Usá los botones" en slot_confirmation |
| Silencio post-confirmación | ✅ Sí | "Buscando chofer..." y después nada |
| Mensajes de error internos | ✅ Sí | "Error interno. Cliente derivado a operador." |
| Dos respuestas para un mensaje | ✅ Sí | COMBINED_GREETING envía intro + business por separado |
| Falta de explicación | ✅ Sí | "¿Cuántos pasajeros?" sin por qué |

**El pasajero piensa "este bot no me entendió" cuando:**
1. Escribe "sí" y recibe "usá los botones" — el no entendió más básico posible
2. La ubicación ambigua se trata como error — el pasajero siente que el sistema no conoce Iguazú
3. El precio aparece sin contexto — "¿$45.000 es mucho o es normal?"

**El pasajero piensa "parece automático" cuando:**
1. Recibe respuestas siempre iguales (misma estructura, mismo formato)
2. Las preguntas son siempre una por turno
3. No hay reconocimiento de contexto (cliente recurrente, viaje previo)
4. El cierre es genérico o no existe

**El pasajero piensa "me está haciendo perder tiempo" cuando:**
1. Tiene que responder 4 preguntas separadas para lo que podría ser 1-2
2. Escribe "sí" y le piden que toque un botón
3. Corrige un dato y tiene que pasar por 3 pasos (tocar botón → escribir → confirmar de nuevo)

---

## Análisis de carga cognitiva

| Aspecto | Evaluación |
|---------|-----------|
| Cantidad de texto por mensaje | 🟢 Baja durante recolección (1 pregunta), 🟠 Alta en confirmación (7+ líneas) |
| Orden de la información | 🟢 Lógico: ubicación → pasajeros → hora → precio → confirmación |
| Estructura visual | 🟡 Texto plano sin jerarquía visual (sin negritas, sin separadores) |
| Longitud de cada paso | 🟢 Una pregunta = una respuesta |
| Velocidad (turnos) | 🟠 Lenta: 5-7 turnos para una solicitud simple |
| Preguntas simultáneas | 🔴 Nunca combina preguntas compatibles |
| Recordar información previa | 🟢 El sistema recuerda (no repregunta), pero el pasajero no ve confirmación parcial |

**Momento de máxima carga cognitiva:** Slot confirmation — el pasajero recibe 5-7 líneas de información de golpe después de haber estado respondiendo una pregunta por vez. El cambio de ritmo es abrupto.

**Momento de mínima carga cognitiva:** Durante la recolección — una pregunta simple por vez.

**El pasajero debe recordar:**
- Qué información ya dio (el sistema lo sabe, pero no se lo muestra)
- El precio (no hay resumen parcial)
- Las opciones de ubicación (si son muchas, se olvida la primera cuando llega a la última)

---

## Análisis de percepción de inteligencia

**Hace pensar "qué inteligente":**

| Momento | Frecuencia | Por qué |
|---------|-----------|---------|
| Reconocimiento de IGR como aeropuerto | Si el usuario usa código IATA | "Reconoció el código sin que se lo explique" |
| Inferencia de horario por atracción | Si menciona parque/atracción | "Sabe que las cataratas abren a las 8am" |
| Resolución de ambigüedad con opciones | Frecuente | "Conoce los hoteles y lugares de Iguazú" |
| Contexto entre turnos | Siempre | "No me preguntó de nuevo lo que ya le dije" |
| Detección de intención (emergencia, urgencia) | Si aplica | "Se dio cuenta de que es urgente" |

**Hace pensar "esto está programado":**

| Momento | Frecuencia | Por qué |
|---------|-----------|---------|
| Una pregunta por turno | Siempre | "Sigue un guion fijo" |
| Misma estructura de respuesta | Siempre | "Siempre dice lo mismo de la misma forma" |
| Rechazo de "sí" en slot_confirmation | Si el usuario escribe en vez de tocar | "No entiende español básico" |
| Mensajes de error internos | Raro pero impactante | "Esto no es un mensaje para mí, es para el programador" |
| "Buscando chofer..." sin más info | Frecuente | "Solo dice eso y no da más detalles" |

---

## Análisis de naturalidad

**Frases que NADIE diría en una conversación real:**

1. "Resumen del viaje:" — nadie habla así. "Perfecto, acá va el resumen" o "Entonces sería..."
2. "Origen:" — "Saliendo de" o "Desde"
3. "Destino:" — "Hacia" o "Para"
4. "Pasajeros:" — "Ustedes son"
5. "Fecha/hora:" — "El día y horario"
6. "Precio: $X ARS (hasta Y pasajeros)." — "El viaje sale $X para hasta Y personas"
7. "¿Confirmás?" — "¿Está bien así? ¿Confirmamos?"
8. "¿Querés confirmar o cambiar los datos? Usá los botones de abajo 👇" — extremadamente robótico
9. "No pude procesar eso. Un operador te va a asistir en breve." — sin explicación de qué no pudo procesar
10. "Error interno. Cliente derivado a operador." — lenguaje de sistema, no conversacional

**Frases que SUENAN NATURALES:**

1. "Perfecto, tengo origen en el aeropuerto y destino hacia el centro." — acknowledge natural
2. "El parque abre a las 8am. ¿Querés que programemos la recogida para las 7:45am?" — natural y útil
3. "¡Viaje confirmado!" — corto y claro
4. "Buscando chofer..." — natural para lo que es

**Falsos amigos / traducciones literales:**
No se detectaron problemas de traducción en los templates (español rioplatense correcto). Pero el inglés puede tener problemas: "Trip summary:" es correcto pero formal. Un asistente diría "Here's your trip overview:".

---

## Análisis de memoria percibida

**El pasajero SÍ siente que AITOS recuerda:**
- Porque no repregunta información ya proporcionada
- Porque el resumen de confirmación incluye todo lo dicho
- Porque puede corregir sin reiniciar

**El pasajero NO siente que AITOS conecta información:**
- Porque no hay resúmenes parciales durante la recolección
- Porque no hay "tomando en cuenta que usted dijo X, entonces Y"
- Porque el sistema no usa el historial de viajes previos
- Porque el conocimiento local existe pero rara vez se usa proactivamente

**Ejemplo de conexión que falta:**
Pasajero: "somos 2 adultos y un bebé"
Pasajero: "necesito silla para el bebé"
Sistema: *no conecta que "bebé" en el primer mensaje con "silla" en el segundo*

---

## Análisis de ritmo

| Situación | Ritmo actual | Ritmo ideal |
|-----------|-------------|-------------|
| Saludo simple | Normal — responde con intro completa | Normal |
| Saludo + pedido | Lento — dos mensajes separados | Una sola respuesta integrada |
| Urgencia detectada | Rápido — skipFieldResolution, acelera | Rápido — correcto |
| Baja intención | Rápido — skipLLM, respuesta template | Rápido — correcto |
| Ambigüedad | Normal — opciones numeradas | Normal — correcto |
| Corrección del usuario | Lento — pasar por botones + texto + reconfirmación | Rápido — aceptar corrección directa |
| Confirmación | Normal — resumen + botones | Normal — correcto |
| Post-confirmación (espera) | Silencio — sin ritmo | Activo — mantener informado |

**El ritmo es uniforme en la mayoría de los casos.** No hay aceleración cuando el pasajero muestra familiaridad con el proceso, ni desaceleración cuando muestra confusión.

---

## Análisis de resiliencia

| Situación | Cómo se siente |
|-----------|----------------|
| Usuario cambia de tema | 🟡 Conversation Interpreter detecta `topic_change` y ajusta. Pero el cambio puede sentirse brusco. |
| Usuario corrige información | 🟡 La corrección requiere pasar por slot_confirmation (botón + texto). No es natural. |
| Usuario interrumpe | 🟡 El sistema no tiene concepto de interrupción. Cada mensaje se procesa en secuencia. |
| Usuario escribe mal | 🟢 El sistema tolera typos (fuzzy matching, regex flexible). | 
| Usuario manda varios mensajes seguidos | 🟢 Cada mensaje se procesa individualmente. El sistema mantiene contexto. |
| Usuario mezcla preguntas | 🟡 El sistema procesa el último mensaje. Pierde el contexto de la mezcla. |

**El peor caso:** usuario en slot_confirmation que escribe "sí" y recibe "usá los botones". El sistema no solo no entiende el texto, sino que RESPONDE CON OTRA PREGUNTA. El usuario siente que el sistema no escuchó.

---

## Análisis de lenguaje y personalidad

### ¿Qué transmite hoy AITOS?

| Atributo | Presente | Ejemplo |
|----------|----------|---------|
| Empresa | ✅ Sí | "TaxiGuazú", "Cris" (asistente) |
| Guía local | 🟡 Parcial | Conoce horarios de parques, lugares |
| Asistente | ✅ Sí | "¿En qué puedo ayudarte?" |
| Operador | 🟡 Parcial | Útil pero frío |
| Amigo | ❌ No | Lenguaje formal, sin calidez |
| Robot | 🟡 A veces | "Resumen del viaje:", "Origen:", "Destino:" |

### ¿Qué debería transmitir?

**Concierge turístico** — el ideal para el contexto de Iguazú.

Un concierge:
- Sabe de la ciudad (conocimiento local)
- Es profesional pero cálido
- Anticipa necesidades
- Ofrece alternativas
- No solo responde — ACOMPAÑA

AITOS hoy transmite **asistente de empresa** — resuelve pero no acompaña. El salto necesario es de **asistente funcional** a **concierge turístico**.

---

## Análisis de identidad

**Al finalizar una conversación, el pasajero siente que lo ayudó:**

### Escenario actual:

> *"Me ayudó un bot de TaxiGuazú. Fue rápido y entendió lo básico, pero se notaba que era automático. No sabía bien a dónde iba hasta que le di la dirección exacta. Cuando terminé de darle los datos, me confirmó el precio y el viaje. Después no supe más nada hasta que llegó el chofer. Funcionó, pero no fue una experiencia memorable."*

**Identidad percibida:** Un software de reserva de transfers con interfaz conversacional.

### Escenario ideal:

> *"Me ayudó Cris, el asistente de TaxiGuazú. Apenas le escribí, entendió que llegaba al aeropuerto IGR y me preguntó amablemente los detalles. Cuando le dije que íbamos al centro, me mostró las opciones de hoteles. Sugirió la hora ideal porque sabe que las cataratas abren a las 8am. Me confirmó el viaje con el precio y me dijo que me avisaba cuando el chofer estuviera asignado. Me mandó un mensaje cuando Juan Carlos me estaba esperando. Después del viaje, me preguntó cómo había ido. Sentí que me cuidaron."*

**Identidad deseada:** Un concierge turístico experto en Iguazú, disponible en WhatsApp.

---

## Comparación contra referentes humanos

### Vs. Excelente recepcionista de hotel

| Atributo | Recepcionista | AITOS |
|----------|--------------|-------|
| Velocidad de respuesta | Inmediata si está disponible | ✅ Inmediata siempre |
| Calidez en el trato | "¡Buen día! ¿Cómo está?" | 🟡 "Hola, soy Cris" — correcto pero sin calidez |
| Conocimiento local | Sabe de la ciudad, recomienda | 🟡 Tiene knowledge layer pero no lo usa proactivamente |
| Preguntas naturales | "¿Hacia dónde se dirige?" en contexto | 🟡 "Destino:" — formato formulario |
| Anticipación | "¿Necesita silla para el bebé?" | ❌ No detecta contextos implícitos |
| Seguimiento | "¿Todo bien con el transfer?" | ❌ Silencio post-confirmación |
| Alternativas | "Si no le gusta ese precio, tenemos..." | ❌ No ofrece alternativas |
| Memoria | Recuerda al huésped de la vez anterior | ❌ No reconoce clientes recurrentes |
| Cierre | "Que disfrute su estadía" | 🟡 Encuesta, no despedida cálida |

**AITOS vs recepcionista: ~35% de la experiencia** — gana en velocidad y disponibilidad, pierde en todo lo demás.

### Vs. Excelente operador de turismo

| Atributo | Operador | AITOS |
|----------|---------|-------|
| Explica procesos | "Primero pasamos por aduana, luego..." | ❌ No explica |
| Recomienda horarios | "Mejor salir antes de las 4 por el tráfico" | 🟡 Solo para horarios de atracciones |
| Ofrece paquetes | "Si va a las cataratas también, tenemos combo" | 🟡 Oportunidades existen pero son limitadas |
| Resuelve problemas | "El chofer se demoró, le ofrezco..." | ❌ Escala a humano sin alternativa |
| Conoce al pasajero | Recuerda preferencias | ❌ No |
| Educa | "Eso se dice Iguazú, con acento en la ú" | ❌ No educa sistemáticamente |

**AITOS vs operador de turismo: ~25%**

### Vs. Excelente concierge

| Atributo | Concierge | AITOS |
|----------|-----------|-------|
| Sorpresa positiva | "Le tengo una mesa en el mejor restaurante" | ❌ No |
| Proactividad | "Mañana va a llover, lleve paraguas" | ❌ No |
| Conexión emocional | "Es su luna de miel, ¡felicidades!" | ❌ No detecta contexto |
| Resolución creativa | "No tenemos auto, pero llamé a un colega" | ❌ Escala sin alternativa |
| Acompañamiento | "Le confirmo cuando el chofer llegue" | ❌ Silencio |

**AITOS vs concierge: ~15%**

---

## Resumen: la experiencia completa desde la perspectiva del pasajero

> Escribo a un número de WhatsApp. Responde al instante. Me saluda. Empieza a preguntarme: primero el origen, luego el destino (con opciones), luego los pasajeros, luego la hora. Cada cosa la pregunto por separado, como si llenara un formulario. Cuando termino, me muestra un resumen con precios y me pregunta si confirmo. Digo que sí. Me dice "Buscando chofer..." y después... silencio. No sé si ya encontró, cuánto falta, quién viene. El chofer llega (o no, pero si no llega, el sistema no me dice nada hasta que ya es un problema). Después del viaje, quizás me pregunta cómo me fue. Y ahí termina.

**Lo positivo:** Responde siempre, rápido, no se olvida de lo que dije, confirma antes de actuar, muestra el precio.

**Lo negativo:** Es lento (muchas preguntas separadas), no entiende texto libre en momentos clave, desaparece después de confirmar, no anticipa necesidades, no educa, no ofrece alternativas, no deja una impresión duradera.

---

## Hallazgos emergentes (nuevos principios no documentados)

### H1 — Principio de acompañamiento continuo

El sistema resuelve pero no acompaña. Un pasajero necesita sentir que el sistema está "con él" durante todo el proceso, no solo en los momentos de entrada de datos.

**Evidencia:** Post-confirmación, no hay follow-up. Durante el servicio, el sistema desaparece.

### H2 — Principio de voz única

El sistema tiene dos voces: una natural (LLM) y una robótica (templates). El pasajero percibe la diferencia. Un mismo viaje puede tener respuestas naturales en un turno y robóticas en el siguiente.

**Evidencia:** `skipLLM` causa cambio de voz entre turnos según la decisión de StrategyDecision.

### H3 — Principio de visibilidad del progreso

El pasajero no sabe "en qué paso del proceso está". No hay indicador de avance ("Paso 2 de 4: destino"). La confirmación llega como sorpresa, no como culminación de un proceso visible.

**Evidencia:** No hay resúmenes parciales, no hay indicación de cuántas preguntas quedan.

### H4 — Principio de error humano tolerable

El sistema no tolera el error humano más básico: escribir "sí" donde se espera un botón. Cualquier sistema conversacional debería tolerar la entrada de texto libre en cualquier punto.

**Evidencia:** slot-confirmation-text-handler.ts rechaza texto libre y fuerza botones.

---

## Matriz de mejoras priorizadas por valor percibido

| # | Mejora | Valor percibido (1-10) | Esfuerzo | Dependencia arquitectónica |
|---|-------|----------------------|----------|--------------------------|
| 1 | **Aceptar texto libre en slot_confirmation** (interpretar "sí", "confirmo", "dale") | 10 — elimina la fricción más grave | 2 días | Baja — slot-confirmation-text-handler.ts |
| 2 | **Actualización proactiva durante espera** ("Chofer asignado: Juan, Toyota Corolla, llega en 10min") | 9 — elimina el silencio angustiante | 5 días | Media — dispatch event → sender |
| 3 | **Preguntas compuestas** (origin+destination, passengers+time en un turno) | 9 — reduce turnos ~40% | 5 días | Media — policy pipeline |
| 4 | **Explicación en cada pregunta** ("¿Cuántos pasajeros? — para calcular el precio") | 8 — reduce ansiedad y carga cognitiva | 1 día | Baja — i18n + response-builder |
| 5 | **Resumen parcial durante recolección** ("Entonces sería: desde Aeropuerto IGR...") | 8 — da visibilidad de progreso | 2 días | Media — response-builder |
| 6 | **Instrucciones post-confirmación** ("Te esperamos en llegadas con cartel") | 8 — reduce incertidumbre | 1 día | Baja — response-builder |
| 7 | **Alternativas ante restricciones** ("No tenemos auto grande, ¿dividimos en 2?") | 7 — evita abandono | 3 días | Media — fleet + response |
| 8 | **Lenguaje natural en templates** (reemplazar "Origen:" por "Saliendo de") | 7 — mejora naturalidad general | 2 días | Baja — i18n catalog |
| 9 | **Educación de nombres de lugares** ("Dijiste 'el centro' — ¿Hotel Amerian, Terminal?") | 7 — mejora comprensión mutua | 2 días | Media — slot-confirmation |
| 10 | **Formato visual mejorado** (negritas para precios, separadores visuales) | 6 — mejora legibilidad | 1 día | Baja — response-builder |
| 11 | **Cierre cálido** ("¡Gracias por viajar con TaxiGuazú! Cuando necesites, acá estamos.") | 6 — mejora fidelización | 1 día | Baja — response-builder |
| 12 | **Detección de niños → silla incluida** | 6 — sorpresa positiva + utilidad real | 3 días | Media — entity-extractor + policy |
| 13 | **Reconocimiento de cliente recurrente** | 5 — mejora sensación de acompañamiento | 5 días | Media — memory/lead |
| 14 | **Seguimiento de vuelo** (monitorear demora, ajustar recogida) | 5 — alta utilidad para turistas | 8 días | Alta — API externa |
| 15 | **Clima contextual** ("Hoy calor, aire acondicionado incluido") | 4 — sorpresa positiva | 2 días | Baja — knowledge + policy |

---

## Conclusión

### 1. ¿Qué tan buena experiencia ofrece hoy AITOS para un pasajero?

**38%**

Justificación:

| Componente | Peso | Puntaje | Ponderado |
|------------|------|---------|-----------|
| Velocidad de respuesta | 15% | 90% | 13.5% |
| Precisión de comprensión | 15% | 70% | 10.5% |
| Naturalidad conversacional | 15% | 30% | 4.5% |
| Acompañamiento durante el proceso | 15% | 10% | 1.5% |
| Claridad de comunicación | 15% | 50% | 7.5% |
| Carga cognitiva | 10% | 40% | 4% |
| Cierre y fidelización | 15% | 5% | 0.75% |

**Total: ~38%**

AITOS es funcional pero no placentero. Resuelve el problema básico (reservar un transfer) pero la experiencia es fría, lenta en turnos, y desaparece en los momentos donde más se necesita acompañamiento (espera post-confirmación, durante el servicio).

### 2. ¿Cuáles son los 10 momentos más memorables de la experiencia?

**Positivos:**

| # | Momento | Por qué es memorable |
|---|---------|---------------------|
| P1 | **Respuesta instantánea al primer mensaje** | El pasajero no espera, eso sorprende positivamente |
| P2 | **Reconocimiento de IGR como aeropuerto** | "Reconoció el código" — inteligente |
| P3 | **Inferencia de horario por atracción** | "Sabe que el parque abre a las 8am" — conocimiento local |
| P4 | **Opciones numeradas para ubicación ambigua** | "Conoce los hoteles del centro" — útil |
| P5 | **Resumen de confirmación con precio** | "Todo claro antes de confirmar" — transparente |

**Negativos:**

| # | Momento | Por qué es memorable |
|---|---------|---------------------|
| N1 | **"Usá los botones de abajo 👇"** cuando el usuario escribe "sí" | La mayor fricción de toda la experiencia |
| N2 | **"Buscando chofer..." + silencio** | El pasajero queda sin saber qué pasa |
| N3 | **Dos mensajes separados para saludo + pedido** | Sensación de verborragia innecesaria |
| N4 | **"Error interno. Cliente derivado a operador."** | Lenguaje de sistema, no conversacional |
| N5 | **No hay despedida ni cierre** | La experiencia termina de golpe, sin conclusión |

### 3. ¿Qué debería sentir un pasajero al terminar una conversación con AITOS?

**"Me cuidaron. Tengo mi viaje resuelto y sé exactamente qué esperar."**

Los componentes de esa sensación:
- **Tranquilidad**: el viaje está confirmado, el precio está claro
- **Seguridad**: sé dónde y cuándo esperar, sé cómo identificar al chofer
- **Acompañamiento**: si algo cambia, me van a avisar
- **Valor**: sentí que hablé con alguien que conoce Iguazú, no con un formulario
- **Recordatorio**: quiero volver a usar este servicio

Hoy, un pasajero siente: **"Bueno, ya reservé el viaje. Espero que funcione."**

### 4. Si AITOS fuera un empleado de una empresa turística de excelencia... ¿lo contratarías?

**Todavía no.**

**Justificación:**

**Lo que sí justificaría contratarlo:**
- Responde al instante, 24/7, sin días libres
- Nunca se olvida de lo que el cliente dijo
- Confirma antes de actuar (nunca asume)
- Sabe los horarios de las atracciones locales
- Calcula precios sin errores
- Nunca se cansa, nunca tiene mal humor

**Lo que impide contratarlo:**

1. **No sabe conversar, solo preguntar.** Su estilo es "formulario con pasos" no "conversación con un experto". Un empleado de una empresa de excelencia sabe llevar una conversación natural.

2. **Abandona al cliente después de la venta.** El momento de mayor ansiedad (la espera del chofer) es donde el empleado debería estar más presente. AITOS se vuelve invisible.

3. **No resuelve problemas, solo escala.** Cuando algo no puede hacerlo, dice "no pude procesar eso" y deriva a un humano. Un buen empleado ofrece alternativas antes de escalar.

4. **Trata a todos los clientes igual.** Un cliente recurrente, una familia con niños, un viajero de negocios — todos reciben el mismo tratamiento. Un buen empleado adapta su estilo.

5. **Su lenguaje es de sistema, no de persona.** "Resumen del viaje:", "Origen:", "Destino:" no son frases que un empleado use. Un empleado diría "Perfecto, entonces sería: saliendo de... hacia...".

6. **No educa.** Cuando un cliente dice mal un nombre o no conoce una opción, un buen empleado educa sutilmente. AITOS solo procesa.

7. **No deja huella.** Después de la interacción, el cliente no recuerda una experiencia placentera, solo una transacción completada. Los empleados excelentes crean momentos memorables.

**Parábola del recepcionista:**

> Contratas a un recepcionista que:
> - Atiende al instante, siempre
> - Anota todo lo que dices sin errores
> - Confirma cada detalle antes de actuar
> - Pero habla como máquina ("Cliente: origen. Cliente: destino.")
> - Desaparece en cuanto terminas de darle los datos
> - Cuando algo sale mal, dice "no sé, llamo a otro"
> - Trata a todos igual, sin importar si es tu primera vez o tu décima
> - Y cuando te vas, no te dice "gracias" ni "vuelva pronto"
>
> ¿Lo contratarías? El recepcionista es técnicamente competente pero emocionalmente ausente. Sería bueno para tareas de back-office, no para atención al cliente de primera línea.

**AITOS necesita:**

| Carencia | Qué necesita | Prioridad |
|----------|-------------|-----------|
| Acompañamiento post-confirmación | Follow-up activo durante espera | Crítica |
| Lenguaje natural | Templates conversacionales, no formularios | Alta |
| Aceptar texto libre | No rechazar "sí" ni ninguna entrada de texto | Crítica |
| Alternativas ante problemas | Ofrecer opciones antes de escalar | Alta |
| Proactividad | Anticipar necesidades, no solo reaccionar | Media |
| Personalización | Adaptarse al perfil del pasajero | Media |
| Cierre memorable | Despedida cálida + invitación a volver | Media |

Cuando tenga al menos 4 de esas 7, la respuesta será "Sí".

---

*Fin de Auditoría #05 — Passenger Experience Audit*
