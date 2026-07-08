# AI Transportation Operating System — Arquitectura de Referencia 2026
## Diseño desde cero vs. Ingeniería Inversa de TaxiGuazú Bot

**Rol:** Staff Engineer — Arquitecturas Conversacionales, IA Aplicada y Sistemas de Despacho
**Fecha:** Julio 2026
**Insumo:** `INGENIERIA_DEL_SISTEMA_BOT_TAXIGUAZU.docx` (informe de ingeniería inversa, puntaje actual 6.5/10)

---

## 0. Tesis central

Tu documento ya dice lo correcto: **el problema no es transportar personas, es orquestar decisiones bajo incertidumbre**. Eso es exactamente la definición de un sistema agéntico con estado, no de un chatbot. La buena noticia, leyendo el informe de arqueología: **tu instinto arquitectónico original (CORE → ROUTER → POLICY, LLM como ciudadano de segunda clase, triple fallback) es el mismo instinto que hoy, en 2026, la industria formalizó con nombres propios.** No partiste de cero mal. Partiste de cero *bien*, y lo que falta no es "tirar todo y reescribir" — es nombrar formalmente los patrones que ya usás, cerrar 4-5 huecos estructurales, y decidir conscientemente qué NO construir todavía.

Antes de la arquitectura, dos hechos de mercado que cambian el diseño en 2026 y que tu documento no contempla:

1. **Meta prohibió los bots conversacionales de propósito general en WhatsApp Business API (política de enero 2026).** Solo se permite automatización *task-scoped*: booking, tracking, soporte, encuestas — con resultados predecibles. Un "AI Transportation Operating System" que responde en lenguaje abierto sobre migración, fronteras y turismo corre el riesgo de leerse como *concierge* de propósito general ante el clasificador de cumplimiento de Meta. Esto no es un detalle legal menor: **es una restricción de arquitectura**. La solución correcta no es "hablar menos con IA", es *estructurar* la conversación en intents declarados y flows con resultado determinista, y usar el LLM puertas adentro (razonamiento, extracción, redacción) en vez de puertas afuera (como interlocutor libre). Tu propio patrón de "LLM como embellecedor, nunca como fuente de verdad" ya te protege de esto casi por accidente — hay que hacerlo explícito y documentarlo como decisión de cumplimiento, no solo de robustez.
2. **Meta lanzó su propio "Meta Business Agent" en junio 2026** (booking, pagos, catálogo, disponible gratis para cualquier negocio de WhatsApp). Esto redefine tu foso competitivo: no vas a ganar compitiendo en "IA conversacional genérica en WhatsApp" contra Meta. Ganás compitiendo en lo que Meta nunca va a modelar: **conocimiento operacional de la Triple Frontera** (cruces migratorios, zonas, flota real, choferes reales, tarifas dinámicas por combinación origen-destino-país). Ese es tu activo. La arquitectura debe protegerlo como IP propio (Geo Engine + Pricing Engine + reglas de despacho), no como prompt.

Con eso como marco, vamos a la arquitectura.

---

## 1. Arquitectura de referencia — vista de capas

```
┌──────────────────────────────────────────────────────────────────────┐
│  CANAL (Channel Layer)                                                │
│  WhatsApp Cloud API · Meta Flows · Web Widget · (futuro: Instagram)   │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  GATEWAY / INGESTION                                                  │
│  Verificación HMAC · Idempotencia · Normalización · Rate limiting     │
│  Publica evento normalizado en el BUS (no llama servicios directo)    │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  EVENT BUS (columna vertebral)                                        │
│  message.received · slot.updated · trip.quoted · trip.confirmed ·     │
│  dispatch.escalated · driver.assigned · trip.completed                │
└──────┬───────────────┬───────────────┬───────────────┬────────────────┘
       ▼               ▼               ▼               ▼
┌────────────┐  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│ ORCHESTRATOR│  │ CONTEXT      │ │ DISPATCH     │ │ LEARNING /       │
│ (single-    │  │ MANAGER      │ │ ENGINE       │ │ ANALYTICS        │
│ agent core) │  │ (session +   │ │ (workflow    │ │ (event sourcing, │
│             │  │  memory)     │ │  durable)    │ │  async)          │
└──────┬──────┘  └──────┬──────┘ └──────┬──────┘ └─────────────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────────┐
│  TOOL LAYER (Model Context Protocol)                                  │
│  geo.resolve_location · pricing.quote · fleet.check_availability ·    │
│  driver.assign · trip.create · flow.send_confirmation                 │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DOMAIN ENGINES (deterministas, sin LLM)                              │
│  Geo Engine · Pricing Engine · Policy/Rules Engine · Fleet/Driver      │
└───────────────────────────────┬──────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PERSISTENCIA                                                         │
│  OLTP (Postgres/Turso) · Event Store (append-only) · Vector (opcional)│
└──────────────────────────────────────────────────────────────────────┘

  Transversal a todas las capas: OBSERVABILIDAD (OTel GenAI) · SEGURIDAD ·
  PROMPT REGISTRY (versionado) · EVALS / TESTING
```

Esto no es una fantasía de whitepaper — es, casi literalmente, el mapa que tu propio informe reconstruyó en la sección 8 (Call Graph), solo que en tu sistema todo pasa **síncronamente por un god-orchestrator** (`lead.service.ts`, 27 imports) en vez de estar desacoplado por un bus de eventos. Esa es la diferencia estructural #1.

---

## 2. Decisión por decisión, con justificación

### 2.1 Single-agent vs Multi-agent → **Single-agent orquestador + engines determinísticos como "tools", NO multi-agente**

Esta es la decisión más mal-entendida de 2026. La moda es "multi-agente" (CrewAI, AutoGen, equipos de agentes que se hablan entre sí vía A2A). Para un sistema de despacho de transfers, **multi-agente es sobre-ingeniería activa** y aumenta latencia, costo y superficie de fallo sin beneficio, porque:

- Tu dominio no tiene sub-tareas que se beneficien de razonamiento independiente y paralelo (no es "investigar un tema con 5 fuentes"). Es un **pipeline de resolución de slots + una decisión de negocio determinista** (precio, disponibilidad, asignación).
- Cada "agente" adicional es un punto más de no-determinismo en un dominio donde el determinismo (precio correcto, chofer correcto) es literalmente el producto.

**Lo estándar de industria en 2026 para este tipo de sistema es "single-agent con tool calling amplio"**: un orquestador LLM (o, mejor en tu caso, un orquestador determinista con LLM invocado punto a punto) que llama herramientas tipadas — exactamente lo que ya hace tu CORE→ROUTER→POLICY, solo que a mano en vez de con MCP. La innovación recomendable no es "agregar agentes", es **envolver tus engines existentes (Pricing, Geo, Dispatch, Fleet) como MCP tools con schema explícito**, para que:
1. Sean invocables tanto desde el bot como desde un futuro panel admin o Instagram, sin duplicar lógica.
2. El LLM (cuando participa) tenga *tool calling estructurado* en vez de tener que "adivinar" JSON en un prompt libre — esto reduce directamente el riesgo de alucinación de precio que hoy mitigás con `validateLLMResponse` post-hoc.
3. Quede auditable: cada llamada a `pricing.quote(origin, dest, pax)` es un span observable, no una decisión oculta dentro de un prompt de 80 líneas.

Para TaxiGuazú, con su alcance actual (una flota, un territorio, un conjunto de reglas de negocio), multi-agente no tiene ningún caso de uso real hoy. Si en el futuro TaxiGuazú se sumara como agencia aliada a una red mayor, ese sería un escenario distinto — pero es una hipótesis externa al sistema que estás construyendo ahora, no algo que deba influir en esta arquitectura.

### 2.2 Event-Driven vs Pipeline síncrono → **Migrar el núcleo a event-driven, sin tocar la lógica de negocio**

Tu informe es honesto: "No es Event-Driven". Esto es la brecha estructural más cara a largo plazo, y la razón es concreta, no dogmática: **tu dispatch de 4 niveles (nivel_1 1h → nivel_2 30min → nivel_3 8min → waiting_driver 3min) hoy vive dentro de `timeouts.ts` con 10+ cron jobs sobre Vercel serverless**, que no garantiza ejecución en el segundo exacto ni sobrevive a un timeout de función. Eso es un riesgo operacional real: un chofer que no confirma en 8 minutos y el nivel 3 no se dispara a tiempo es un pasajero varado en la Triple Frontera.

La solución estándar de industria en 2026 para "workflows largos con timers, reintentos y estado que debe sobrevivir a caídas" es **ejecución durable** (Temporal es el estándar de facto; también hay opciones más livianas como colas + cron con locks). La propiedad clave: el estado de "esperando que el chofer 2 confirme en los próximos 22 minutos" vive en el motor de workflow, no en una fila de una tabla que un cron revisa cada minuto con la esperanza de no perder el timing por un cold start de Vercel.

Concretamente, para TaxiGuazú:
- `dispatch-workflow.ts` se convierte en una **Workflow durable** con 4 pasos y timers nativos (no cron polling).
- Cada transición (`nivel_1_offered`, `nivel_1_timeout`, `nivel_2_offered`...) se convierte en un **evento** persistido en un event log, no solo en un `UPDATE` que sobreescribe el estado anterior. Esto te da auditoría real de "qué pasó con este viaje" sin tener que reconstruirlo por arqueología, como tuviste que hacer vos con este informe.
- No hace falta migrar TODO a event-driven de golpe. Empezar por Dispatch (el subsistema con más riesgo temporal) y dejar Extraction/Pricing síncronos como están, porque ahí sí la latencia conversacional manda.

### 2.3 Tool Calling / Arquitectura de herramientas → **MCP como contrato interno, no solo para conectores externos**

El error común es pensar que MCP es "para conectar con Slack o Google Drive". El uso más valioso en 2026 es como **contrato interno estable entre el LLM y tus engines de negocio**, con tres beneficios directos a tu arquitectura actual:

1. **Reemplaza el prompt-engineering de extracción por schemas.** Hoy `extraction-prompt.ts` le pide al LLM que devuelva JSON de slots dentro de un system prompt de ~60 líneas, validado después. Con tool calling estructurado (`extract_trip_slots(origin, destination, date, time, passengers, luggage)`), el modelo no "redacta JSON que puede fallar" — invoca una función con schema, y el runtime valida antes de que el resultado llegue a tu código. Esto no elimina la necesidad de tu regex/entity extractor de Capa 1 y 2 (siguen siendo más rápidos y baratos), pero limpia la Capa 3 (LLM) de ambigüedad estructural.
2. **Portabilidad entre canales.** El mismo tool `pricing.quote` sirve para WhatsApp y para el futuro panel web o formulario de TaxiGuazú, sin duplicar la lógica. Hoy esa lógica está acoplada a `lead.service.ts`.
3. **Auditoría y seguridad por diseño.** MCP obliga a declarar explícitamente qué puede hacer el modelo (qué tools están disponibles) y qué no. Es la respuesta estructural al hallazgo de tu informe: *"riesgo de prompt injection ALTO, sin defensa contra inyección de instrucciones"*. Si el modelo solo puede invocar tools tipadas con validación de schema — nunca ejecutar SQL libre ni "decidir" el precio en texto libre — la superficie de ataque de un prompt injection se reduce a "el modelo llama una tool que no debería", no a "el modelo hace lo que el atacante le pidió en lenguaje natural".

### 2.4 Context Engineering & Session/Memory → **Tu Triple Fallback ya ES el patrón correcto; falta separar "contexto de conversación" de "estado de negocio"**

Esto es lo mejor diseñado de tu sistema actual y hay que decirlo con todas las letras: **Fallback Progression (regex → entity → LLM), 5 señales ponderadas en Comprehension, y el merge semántico de slots con reglas explícitas ("nunca sobreescribir CONFIRMED", "slot con >1h no mergea")** es exactamente lo que en 2026 se llama *context engineering* — la disciplina de decidir qué entra al contexto del modelo turno a turno, en vez de tirarle todo el historial. No es un patrón "no documentado que emergió por accidente": es un patrón real, y tu error fue no darle nombre ni tests propios, no haberlo diseñado mal.

Lo que sí falta, y es estructural:

- **Separación entre `ConversationContext` (efímero, por sesión, se puede perder) y `TripState` (durable, es la fuente de verdad del negocio).** Hoy ambos viven mezclados en `chat_sessions` con columnas que fueron creciendo orgánicamente (`f4_state`→`comprehension_state`, `workflow_state` eliminado, etc). La separación es la razón principal por la que hoy es difícil razonar sobre qué es "recuperable si el usuario reinicia" y qué es "un compromiso de negocio que no se puede perder". Guardá `TripState` en el Event Store (fuente de verdad, append-only), y `ConversationContext` en una capa de sesión de corta duración (TTL real, invalidable, no crece para siempre).
- **Memoria de largo plazo real, no solo de sesión.** Hoy la memoria es por `phone` y por sesión activa. Para un pasajero recurrente ("el mismo hotel siempre pide traslado al aeropuerto"), el patrón estándar 2026 es una capa de memoria semántica separada (embeddings o simplemente un perfil estructurado por cliente), consultada como tool, no cargada siempre en el prompt. Esto también es coherente con tu propio `services/learning/` que ya intentaba esto — solo que sin bounded context claro.

### 2.5 Pricing, Geo, Dispatch, Reglas → **Estos NO deberían tener IA cerca. Punto.**

Tu instinto de "el LLM es un ciudadano de segunda clase, la respuesta final siempre viene de POLICY" es, textualmente, la mejor práctica de la industria para sistemas donde el resultado tiene consecuencia económica directa (precio, asignación). En 2026 esto se formaliza como **"deterministic core, probabilistic edge"**: el LLM vive en los bordes (entender lenguaje natural ambiguo, redactar respuestas naturales) y nunca en el centro (calcular tarifa, decidir chofer, decidir si cruza frontera). No cambies esto. Lo único que hay que resolver es la deuda técnica que vos mismo documentaste (v2/v3 de pricing coexistiendo, geo-engine deprecated con código muerto) — pero la *decisión arquitectónica* de mantener estos engines deterministas y sin LLM es correcta y hay que defenderla explícitamente en cualquier refactor futuro, incluso si "parece" que meter IA ahí sería más flexible. No lo es: sería menos auditable y menos barato.

### 2.6 Web → WhatsApp / Meta Flows / formularios web

Con la política de Meta de enero 2026 (bots de propósito general prohibidos) y Flows como mecanismo nativo aprobado para booking, el diseño correcto es:

- **Usar Meta Flows para el *camino feliz* de reserva** (origen → destino → fecha → pasajeros → confirmación), no como reemplazo del chat libre sino como *shortcut estructurado* que Meta reconoce como "task-scoped" y que además mejora tasas de conversión (completar un Flow es más rápido que escribir en lenguaje natural, y no depende de que el LLM entienda "arrgentinian custom border").
- El chat libre con LLM se reserva para los casos donde el usuario no quiere/puede usar un Flow (mensajes de voz, WhatsApp Web, clientes que prefieren texto). Ahí es donde tu extracción híbrida sigue siendo necesaria.
- El **formulario web de TaxiGuazú** y el **Flow de WhatsApp** deberían escribir al mismo tool interno (`trip.create_quote_request`), nunca a dos pipelines paralelos — así el Pricing Engine y el Geo Engine son una única fuente de verdad sin importar el canal de entrada.

### 2.7 Observabilidad → **OpenTelemetry GenAI semantic conventions, no logs custom**

En 2026 la convención estándar (`gen_ai.*` namespace, adoptada por Datadog, Grafana, y nativa en instrumentación de OpenAI/Anthropic) es la forma correcta de trazar: qué modelo se llamó, cuántos tokens, qué tools se invocaron, y — la pieza que más te falta hoy — **el árbol de decisión completo de un mensaje** (intent → confidence → extraction → pricing → dispatch) como un solo trace con spans anidados, en vez de líneas de log dispersas en 6 archivos distintos. Esto reemplaza directamente lo que hoy hacés "a mano" reconstruyendo un End-to-End Flow Trace por arqueología de código — con observabilidad real, ese trace existe automáticamente para cada mensaje, en producción, sin tener que leer el código para entenderlo.

### 2.8 Testing / Evals → **Unit tests para engines + Evals (no tests tradicionales) para el LLM**

Tu informe ya diagnosticó bien el problema (50% de tests son integración con mocks de 15-20 módulos, no unitarios). La pieza que falta conceptualmente es que **el LLM no se testea con `expect(x).toBe(y)`** — se testea con **evals**: un dataset de conversaciones reales (como las que ya tenés, el caso de Cristian con "customs border" es un eval case perfecto) contra el que corrés el pipeline completo y medís tasa de acierto de intent, de extracción, y de escalación indebida. Esto es lo estándar 2026 (promptfoo, Langfuse, o simplemente un runner propio con tu propio dataset) y resolvería exactamente el bug que encontraste: un eval set con casos multilingües lo hubiera atrapado antes de producción, no después.

### 2.9 Versionado de prompts → **Prompt Registry con versión, no archivos `.ts` con texto embebido**

Hoy tus prompts viven hardcodeados en `extraction-prompt.ts`, `llm-response.ts`, `iguazu-knowledge.ts`. Funciona, pero no es versionable ni auditable: no podés responder "¿qué prompt exacto generó esta respuesta el 3 de julio a las 14:32?". El patrón estándar es un registro de prompts con versión semántica, donde cada llamada a LLM queda loggeada con qué versión de prompt se usó — así un cambio de redacción no es un deploy de código, es un cambio de configuración auditable y revertible. Para tu escala, esto puede ser tan simple como una tabla `prompt_versions` con hash + changelog; no hace falta una plataforma completa todavía.

### 2.10 Seguridad

Tu informe ya identificó los dos puntos correctos: HMAC opcional (debe ser obligatorio, sin excepción, y falla cerrado) y sin rate limiting por número (crítico si vas a exponer un canal más abierto vía Flows/web). Sumaría uno que tu informe no marcó como crítico pero lo es en un sistema con tool calling: **cada tool debe validar permisos de negocio, no solo de esquema** — por ejemplo, `driver.assign` no debería poder ser invocado con un chofer que no cumple las restricciones operativas del cruce (licencia habilitada, zona, disponibilidad real de flota). Esa regla de negocio debe vivir en el Policy/Rules Engine — el mismo que hoy resuelve `fleet-validation.ts` — no en un prompt que "sepa" no hacerlo.

---

## 3. Comparación directa: Referencia 2026 vs. TaxiGuazú actual

| Dimensión | Arquitectura de referencia 2026 | TaxiGuazú hoy (6.5/10) | Veredicto |
|---|---|---|---|
| Patrón central | Orquestador single-agent + tools tipadas | CORE→ROUTER→POLICY, LLM secundario | ✅ **Ya está bien diseñado.** Formalizar como tools MCP, no reescribir. |
| Multi-agente | Evitado deliberadamente para dominio de precio/despacho | No existe (correcto por accidente) | ✅ Coincide. No agregues agentes. |
| Extracción de datos | Regex → Entity → LLM con schema tipado | Regex → Entity → LLM (Triple Fallback no documentado) | ✅ Patrón correcto. Falta: nombrarlo, testear cada capa por separado, tool-calling en vez de JSON libre. |
| Event-driven | Dispatch y trip lifecycle como eventos + workflow durable | Cron jobs + polling sobre serverless, estado en `UPDATE` que sobreescribe | ⚠️ **Brecha real.** Prioridad P1: migrar Dispatch a ejecución durable. |
| Contexto/Memoria | `ConversationContext` (efímero) separado de `TripState` (durable, event-sourced) | Todo mezclado en `chat_sessions`, columnas crecidas orgánicamente | ⚠️ Brecha estructural media. Refactor de datos, no de lógica. |
| Pricing/Geo/Dispatch | Deterministas, sin LLM, auditable | Deterministas, sin LLM (correcto), pero v2/v3 coexistiendo y geo deprecated | ✅ Filosofía correcta. ⚠️ Deuda técnica a saldar (unificar versiones). |
| Tool calling | MCP con schema, portable entre canales | Llamadas directas a funciones TS dentro de un god-orchestrator de 27 imports | ❌ **Brecha real.** No hay capa de herramientas, hay acoplamiento directo. |
| Canal WhatsApp | Meta Flows para camino feliz + chat libre como fallback, cumpliendo política 2026 | 100% chat libre, sin Flows | ❌ **Riesgo de cumplimiento + oportunidad de conversión perdida.** |
| Observabilidad | OTel GenAI, trace único por mensaje | Logs dispersos, trace se reconstruye por arqueología de código | ❌ Brecha real. |
| Testing | Unit tests por capa + evals con dataset de conversaciones reales | 54 tests, 50% integración con mocks pesados, 0 evals de LLM | ⚠️ Brecha media-alta. El caso "customs border" es evidencia directa. |
| Prompt versioning | Registro versionado, auditable | Prompts hardcodeados en `.ts` | ⚠️ Brecha menor a esta escala, importante a mediano plazo. |
| Seguridad | HMAC obligatorio, rate limit, permisos de negocio en tools | HMAC opcional, sin rate limit | ❌ **Brecha crítica y barata de cerrar.** |
| Bounded contexts | Formalizados con contratos explícitos | Emergen 7 implícitos, sin fronteras impuestas por herramientas | ⚠️ Brecha organizativa, no urgente a tu escala actual. |
| Multilenguaje | Resuelto en la capa de contrato (tools), no en cada regex | Monolingüe con inglés/portugués parchado encima | ❌ Causa raíz del bug de Cristian. Prioridad P0. |

**Lectura honesta del conjunto:** de las 13 dimensiones, tu sistema acierta en filosofía en 5 (las más difíciles: la separación LLM/determinismo, el fallback progresivo, evitar multi-agente, mantener el pricing fuera de la IA). Las brechas reales no son "arquitectura equivocada" — son **infraestructura de ejecución (durable workflows), capa de contrato (tools/MCP) y disciplina operativa (observabilidad, evals, prompt versioning)** que en 2026 son commodities bien resueltos por herramientas existentes, no que haya que inventar.

---

## 4. Qué NO hacer (sobre-ingeniería para tu escala actual)

Con 200-2000 conversaciones y ~200-1000 viajes, varias cosas "de manual" serían un error a tu escala:

- **No migres a microservicios.** El monolito serverless está bien. El problema no es "un solo deploy", es la falta de límites internos (tools/eventos), que podés lograr *dentro* del monolito.
- **No adoptes un framework multi-agente completo (CrewAI/AutoGen) todavía.** Te agrega latencia y costo de tokens sin resolver ningún problema real que tengas hoy.
- **No migres toda la persistencia a event sourcing puro.** Hacelo solo para `TripState` y `DispatchState` (donde la auditoría y la recuperación ante fallos importan). `Places`, `Tariffs`, `Drivers` pueden seguir siendo tablas normales.
- **No construyas un Prompt Registry con UI propia.** Una tabla versionada con changelog alcanza hasta que tengas un equipo, no un solista.

---

## 5. Roadmap priorizado (retomando tu propio informe, sección 21, con la lente de esta arquitectura)

**P0 — Esta semana (cierra el bug real + riesgo de cumplimiento/seguridad):**
1. Persistir `lang` en cada turno + priorizar `sessionLang` (tal como ya identificaste).
2. Multilingüizar `KNOWN_POIS` y aliases (customs/border/alfândega) — causa raíz del fallo de Cristian.
3. HMAC obligatorio sin excepción, con fail-closed.
4. Rate limiting básico por número en el webhook.

**P1 — Este mes (cierra la brecha estructural más cara si no se atiende):**
5. Migrar `dispatch-workflow.ts` a ejecución durable (Temporal o equivalente) — es donde vivís riesgo operacional real de un pasajero varado.
6. Envolver Pricing, Geo, Fleet y Dispatch como tools con schema explícito (primer paso hacia MCP), aunque el "cliente" siga siendo tu mismo orquestador.
7. Separar `chat_sessions` en `ConversationContext` (TTL corto) y `TripState` (fuente de verdad, event-sourced).

**P2 — Este trimestre (deuda técnica ya identificada por vos + observabilidad):**
8. Unificar Pricing v2/v3, eliminar `geo-engine.ts` muerto, refrescar `fleet-validation.ts` FROZEN con tests reales.
9. Instrumentar con OpenTelemetry GenAI (`gen_ai.*`) — trace único por mensaje.
10. Armar un dataset de evals (10-20 conversaciones reales, incluido el caso Cristian) y correrlo en cada cambio de prompt.

**P3 — Consolidación (una vez resuelto lo anterior):**
11. Meta Flows para el camino feliz de reserva en TaxiGuazú (cumplimiento + conversión).
12. Formalizar el contrato de tools (MCP real) internamente, de modo que cualquier canal futuro de TaxiGuazú (panel admin, web, WhatsApp) consuma Pricing/Geo/Dispatch como una única fuente de verdad, sin duplicar lógica entre canales.

---

## Fuentes consultadas (contexto de mercado, julio 2026)

- Guías técnicas 2026 sobre Model Context Protocol (adopción por Anthropic/OpenAI/Google, estándar de facto para tool calling, Linux Foundation Agentic AI Foundation).
- Documentación y casos de uso de Temporal.io para ejecución durable de agentes de IA (2026).
- Documentación de Meta for Developers sobre WhatsApp Flows, y cobertura de mercado sobre la política 2026 de Meta que restringe bots de propósito general en WhatsApp Business API.
- Cobertura del lanzamiento global de Meta Business Agent (junio 2026).
- OpenTelemetry GenAI Semantic Conventions (namespace `gen_ai.*`), estado de adopción por Datadog/Grafana/MLflow.

Estas fuentes fundamentan el contexto de mercado 2026; las recomendaciones de arquitectura en sí están basadas en principios de ingeniería de sistemas aplicados directamente a los hallazgos de tu propio informe de ingeniería inversa.
