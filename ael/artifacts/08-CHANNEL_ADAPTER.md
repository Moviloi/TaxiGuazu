# 08-CHANNEL_ADAPTER.md — Channel Adapter Model

**Nivel:** III-e (Modelo de Adaptación de Canales)
**Versión:** 1.0-draft
**Dependencias:** ONTOLOGY.md, CONSTITUTION.md, COGNITIVE_PRINCIPLES.md, COGNITIVE_ARCHITECTURE.md, ACTION_EXECUTOR.md

> **Nota de navegación:** Este documento es parte de la familia de 8 modelos Level III.
> Hermano de: EVIDENCE_MODEL (III-a), DECISION_MODEL (III-b), COMMITMENT_MODEL (III-c),
> CERTAINTY_CALCULUS (III-d), KNOWLEDGE_MODEL (III-f), ACTION_EXECUTOR (III-g),
> COGNITIVE_ARCHITECTURE (III-h).

---

## Propósito

Definir el contrato de adaptación de canales: cómo el sistema percibe Signals desde
canales externos y cómo presenta Responses a través de ellos. Este documento describe
la interfaz sensorial y de expresión del sistema — qué significa recibir y entregar
mensajes desde el punto de vista cognitivo.

Este documento no describe implementación. No menciona APIs, webhooks, librerías de
WhatsApp, colas, ni detalles de protocolo específicos. Describe **el proceso cognitivo
de interfaz con canales de comunicación**.

---

## Fuentes Normativas

| Fuente | Sección/Regla | Relación |
|--------|---------------|----------|
| CONSTITUTION.md | P-I4, P-E3, S-P1 | Transparencia, honestidad, operación basada en evidencia |
| ONTOLOGY.md | §3 (Signal, Channel, VerifiedSignal), §7.2 (Perception), §12.1-12.2 (Response) | Vocabulario: Canal, Señal, Respuesta |
| COGNITIVE_PRINCIPLES.md | CP-32, CP-33, CP-35 | Preguntar con propósito, acompañamiento continuo, explicación antes de acción |
| COGNITIVE_ARCHITECTURE.md | R-CA-004, R-CA-011, R-CA-015, IP-1, IP-4 | Responsabilidades, contratos, handoffs |
| ACTION_EXECUTOR.md | R-AE-023, R-AE-024, R-AE-025, R-AE-026 | Formato semántico de Response, contenido |

---

## Documentos que reciben delegación de este modelo

| Documento | Qué concreta |
|-----------|-------------|
| **CHANNEL_ADAPTER implementation** (Level IV) | Conectores técnicos por canal (WhatsApp, web, SMS, voz), verificación HMAC, rate limiting, idempotencia, formato por canal |

---

## I. Naturaleza del Channel Adapter

### R-CAD-001 — El Channel Adapter es la frontera del sistema

**Enunciado:** El Channel Adapter es la única puerta de entrada y salida del sistema
con el mundo exterior. Todo Signal que ingresa al sistema y todo Response que el
sistema produce pasa a través del Channel Adapter. Ningún otro componente tiene
comunicación directa con el exterior.

**Derivación Constitucional:** R-CA-004 (Channel Adapter responsibility — el
Adapter es el único componente con responsabilidad de I/O externo); CP-05 (frontera
percepción/evidencia — el Adapter está en la frontera); ONTOLOGY.md §3.4 (Channel
como límite del sistema).

**Justificación:** Si múltiples componentes tuvieran acceso al exterior, la
trazabilidad se fragmentaría y los contratos de seguridad (autenticación, rate
limiting) serían inconsistentes. Un único punto de I/O garantiza control unificado.

**Implicaciones Cognitivas:**
- El Channel Adapter no tiene acceso al Knowledge State, Evidence Store, ni a
  ninguna estructura cognitiva interna.
- El Channel Adapter no sabe qué hay dentro del sistema — solo recibe y entrega.
- El Channel Adapter es cognitivamente ciego: no interpreta, no decide, no filtra
  por contenido.

**Impacto Conversacional:** Cada mensaje que el usuario envía y recibe pasa por
un punto de control único que garantiza integridad y autenticidad.

**Verificación:** ¿Existe algún componente que reciba Signals directamente del
exterior sin pasar por el Channel Adapter? Si sí → violación.

---

### R-CAD-002 — El Channel Adapter no realiza operaciones cognitivas

**Enunciado:** El Channel Adapter no extrae significado, no interpreta intenciones,
no clasifica contenido, no evalúa relevance, ni realiza ninguna operación cognitiva
sobre los Signals o Responses que procesa. Su función es puramente mecánica:
recibir, verificar, clasificar fuente, y entregar.

**Derivación Constitucional:** R-CA-004 (Channel Adapter does NOT extract meaning,
interpret intent, or perform any cognitive operation); CP-07 (determinismo perceptual
— la percepción debe ser determinista, no interpretativa).

**Justificación:** Si el Channel Adapter interpretara contenido, contaminaría la
Evidence antes de que el sistema cognitivo la procese. La interpretación debe
ocurrir en el Evidence Engine y componentes cognitivos, no en la frontera.

**Implicaciones Cognitivas:**
- El Channel Adapter trata los Signals como datos opacos: recibe bytes, verifica
  integridad, entrega.
- El Channel Adapter trata los Responses como contenido semántico: recibe, formatea,
  entrega.
- El Channel Adapter no puede rechazar un Signal basado en su contenido.
- El Channel Adapter no puede modificar el contenido semántico de un Response.

**Impacto Conversacional:** El mensaje del usuario llega intacto al sistema
cognitivo. No hay censura, filtrado, ni interpretación prematura.

**Verificación:** ¿El Channel Adapter realiza alguna operación que requiera entender
el contenido del mensaje? Si sí → violación.

---

### R-CAD-003 — Dependencia cero del Channel Adapter

**Enunciado:** El Channel Adapter tiene cero dependencias de componentes cognitivos.
No necesita el Knowledge State, el Evidence Store, ni ningún otro componente
interno para funcionar. Su operación es autónoma y determinista.

**Derivación Constitucional:** R-CA-004 (no tiene acceso a Knowledge State ni
Evidence Store); COGNITIVE_ARCHITECTURE.md §12 (Channel Adapter tiene cero
dependencias de componentes cognitivos).

**Justificación:** La frontera del sistema debe funcionar incluso si el núcleo
cognitivo está caído o reiniciándose. El Adapter puede recibir Signals y ponerlos
en una cola (implementación) sin depender de que el sistema cognitivo esté activo.

**Implicaciones Cognitivas:**
- El Channel Adapter puede recibir Signals incluso si el ciclo cognitivo no está
  activo.
- El Channel Adapter puede entregar Responses incluso si el ciclo cognitivo que
  lo originó ya terminó.
- El Channel Adapter no bloquea si el sistema cognitivo está ocupado.

**Impacto Conversacional:** El sistema siempre está disponible para recibir mensajes,
incluso mientras procesa internamente.

**Verificación:** ¿El Channel Adapter depende de algún componente cognitivo para
su operación básica? Si sí → violación.

---

## II. Percepción: Recepción de Signals

### R-CAD-004 — Recepción de Signals desde canales

**Enunciado:** El Channel Adapter recibe Signals crudos desde canales externos.
Un Signal es la unidad de información antes de cualquier procesamiento
(ONTOLOGY.md §3.1). El Adapter no asume nada sobre el formato, contenido, o
validez del Signal — recibe lo que el canal entrega.

**Derivación Constitucional:** ONTOLOGY.md §3.1 (Signal como unidad de información
percibida, antes de procesamiento); R-CA-004 (Channel Adapter recibe raw Signals).

**Justificación:** El sistema no puede controlar cómo los canales externos entregan
información. El Adapter debe aceptar cualquier Signal que cumpla con la validación
del canal y pasarlo al sistema cognitivo.

**Implicaciones Cognitivas:**
- El Channel Adapter reconoce el canal de origen del Signal.
- El Channel Adapter asigna un timestamp de recepción.
- El Channel Adapter asigna un ID de idempotencia (para evitar duplicados).
- El Channel Adapter no rechaza Signals por contenido, solo por fallo de
  verificación.

**Impacto Conversacional:** Todo mensaje que el usuario envía es recibido por el
sistema, incluso si contiene errores o información inesperada.

**Verificación:** ¿El Channel Adapter rechaza algún Signal basado en su contenido?
Si sí → violación (solo debe rechazar por verificación fallida).

---

### R-CAD-005 — Verificación del Signal

**Enunciado:** Antes de entregar un Signal al sistema cognitivo, el Channel Adapter
realiza verificación no-cognitiva:
- **Autenticidad:** El Signal proviene de una fuente legítima (verificación HMAC,
  token, IP allowlist, según el canal).
- **Integridad:** El Signal no fue alterado en tránsito.
- **Idempotencia:** El Signal no es un duplicado de uno ya procesado.
- **Tasa:** El Signal no excede los límites de tasa del canal.
- **Formato mínimo:** El Signal tiene la estructura mínima esperada (no vacío,
  cabeceras presentes).

**Derivación Constitucional:** R-CA-004 (verificación de autenticidad, rate limiting,
idempotencia); CP-07 (determinismo perceptual — la verificación debe ser determinista);
R-CA-011 (Channel Adapter → Evidence Engine contract — el Adapter provee Signal
verificado).

**Justificación:** La verificación en la frontera evita que Signals maliciosos,
duplicados, o malformados consuman recursos cognitivos.

**Implicaciones Cognitivas:**
- La verificación es determinista y no-cognitiva: misma entrada produce misma
  verificación.
- Si la verificación falla, el Signal se rechaza y se registra el rechazo.
- El rechazo no es una decisión cognitiva — es una respuesta mecánica.
- El rechazo puede incluir un Response de error (cuando el canal lo permite).

**Impacto Conversacional:** El sistema protege su integridad sin comprometer la
accesibilidad. Los usuarios legítimos no son afectados por las verificaciones.

**Verificación:** ¿Existe algún Signal que ingrese al sistema sin pasar por
verificación? Si sí → violación.

---

### R-CAD-006 — Clasificación de Source y Channel

**Enunciado:** El Channel Adapter clasifica cada Signal con dos metadatos esenciales:

1. **Source (Fuente):** La identidad del emisor del Signal. Puede ser un usuario
   (passenger, driver, operator), un sistema externo, o un temporizador (cron).
   La clasificación de Source incluye un nivel de confianza en la identidad (alta
   si autenticado, baja si anónimo).

2. **Channel (Canal):** El medio por el cual el Signal llegó. Ejemplos ontológicos:
   conversacional (WhatsApp, web chat), transaccional (API, webhook), temporal
   (cron, timer).

**Derivación Constitucional:** R-CA-004 (clasificar Source y Channel del Signal);
R-CA-011 (Channel Adapter provee Source classification); ONTOLOGY.md §3.4 (Channel
definido por protocolo y dirección).

**Justificación:** La Source y el Channel determinan cómo el sistema cognitivo
interpreta el Signal y cómo responde. Esta clasificación debe ocurrir antes de
la interpretación para que el sistema cognitivo tenga contexto completo.

**Implicaciones Cognitivas:**
- La clasificación de Source no requiere conocimiento del contenido del Signal.
- La clasificación de Channel es determinista (dado el canal de llegada).
- La clasificación se incluye como metadata del VerifiedSignal.
- Los componentes cognitivos usan Source y Channel para calibrar interpretación
  y respuesta.

**Impacto Conversacional:** El sistema sabe quién envía el mensaje y por qué medio,
lo que permite respuestas contextualizadas.

**Verificación:** ¿Existe algún VerifiedSignal sin metadata de Source y Channel?
Si sí → violación.

---

### R-CAD-007 — Entrega del VerifiedSignal al Evidence Engine

**Enunciado:** El Channel Adapter entrega el VerifiedSignal al Evidence Engine a
través del contrato IP-1 (Signal Handoff, COGNITIVE_ARCHITECTURE.md §14.1). El
VerifiedSignal incluye:
- Contenido crudo del Signal (raw content)
- Channel metadata (canal de origen, timestamp de recepción)
- Source classification (fuente, nivel de confianza en identidad)
- ID de idempotencia
- Timestamp de verificación

**Derivación Constitucional:** R-CA-011 (Channel Adapter → Evidence Engine contract);
IP-1 (Signal Handoff); CP-06 (registro antes de interpretación — el VerifiedSignal
se registra como Evidence antes de cualquier interpretación).

**Justificación:** La entrega del VerifiedSignal inicia el Ciclo Cognitivo. El
Evidence Engine registra el Signal como Evidence antes de que ningún componente
lo interprete, garantizando CP-06.

**Implicaciones Cognitivas:**
- La entrega es unidireccional: Channel Adapter → Evidence Engine.
- El Channel Adapter no espera confirmación cognitiva (la implementación puede
  confirmar recepción técnica, pero no procesamiento).
- Después de la entrega, el Channel Adapter no tiene más participación en el
  ciclo cognitivo hasta que se genere un Response.

**Impacto Conversacional:** El mensaje del usuario está seguro en el sistema antes
de que cualquier interpretación ocurra. No hay riesgo de pérdida por error de
interpretación.

**Verificación:** ¿Existe algún flujo donde un Signal se interprete antes de ser
registrado como VerifiedSignal? Si sí → violación.

---

## III. Expresión: Entrega de Responses

### R-CAD-008 — Recepción del Response desde el Action Executor

**Enunciado:** El Channel Adapter recibe Responses desde el Action Executor a través
del contrato IP-4 (Response Handoff, COGNITIVE_ARCHITECTURE.md §14.1). El Response
llega como contenido semántico (R-AE-023): qué decir, con qué intención, para quién.

**Derivación Constitucional:** R-CA-015 (Action Executor → Channel Adapter contract);
IP-4 (Response Handoff); ACTION_EXECUTOR.md R-AE-023 (Response semántico, sin
formato de canal).

**Justificación:** El Action Executor produce el contenido semántico. El Channel
Adapter se encarga de formatearlo para el canal específico. Esta separación
permite que el mismo contenido se entregue por múltiples canales.

**Implicaciones Cognitivas:**
- El Channel Adapter recibe Responses en un formato canónico (independiente de canal).
- El Channel Adapter no modifica el contenido semántico del Response.
- El Channel Adapter determina el canal de entrega basado en el destino del Response.
- Si el canal de destino no está disponible, el Channel Adapter puede intentar
  un canal alternativo o reportar fallo de entrega.

**Impacto Conversacional:** El mensaje que el sistema quiere comunicar llega al
usuario sin distorsión, independientemente del canal.

**Verificación:** ¿El Channel Adapter modifica el contenido semántico del Response?
Si sí → violación.

---

### R-CAD-009 — Formateo del Response por canal

**Enunciado:** El Channel Adapter aplica formato específico del canal al Response
semántico. El formateo incluye:

| Aspecto | Ejemplo por canal |
|---------|------------------|
| **Estructura del mensaje** | WhatsApp: texto plano + botones rápidos; Web: HTML + componentes interactivos; SMS: texto plano puro |
| **Longitud máxima** | SMS: 160 caracteres; WhatsApp: 4096; Web: sin límite práctico |
| **Markup** | WhatsApp: negritas con *, cursivas con _; Web: HTML/CSS; SMS: sin markup |
| **Elementos interactivos** | WhatsApp: botones de respuesta rápida; Web: formularios completos; SMS: responder con número |
| **Adjuntos** | WhatsApp: imágenes, documentos; Web: igual; SMS: ninguno |
| **Timing** | WhatsApp: asíncrono; Web: síncrono (WebSocket); SMS: diferido |

**Derivación Constitucional:** R-CA-015 (Action Executor → Channel Adapter contract
— el Adapter aplica formato específico de canal); CP-33 (acompañamiento continuo
— la experiencia debe ser consistente entre canales).

**Justificación:** Cada canal tiene capacidades y limitaciones distintas. El
formateo adapta el contenido sin cambiar su significado, garantizando que el
usuario recibe la misma información independientemente del canal.

**Implicaciones Cognitivas:**
- El formateo es una transformación mecánica, no cognitiva.
- El formateo no cambia el contenido semántico, la intención comunicativa, ni el
  significado.
- El formateo puede perder información no esencial (ej.: markup en SMS) pero no
  información semántica.
- Si el canal no soporta el formato requerido, el Channel Adapter debe elegir
  el formato más cercano o reportar limitación.

**Impacto Conversacional:** El usuario recibe el mismo mensaje adaptado a su
canal. La experiencia es consistente pero respeta las limitaciones de cada medio.

**Verificación:** ¿El formateo del Response cambia o elimina información semántica?
Si sí → violación.

---

### R-CAD-010 — El Channel Adapter no decide el contenido

**Enunciado:** El Channel Adapter no puede añadir, quitar, ni modificar el contenido
semántico del Response. No puede cambiar qué se dice, solo cómo se presenta. No
puede añadir información que no esté en el Response original, ni omitir información
que esté presente.

**Derivación Constitucional:** R-CA-015 (Channel Adapter does not modify the response
content — el contenido semántico es inviolable); ACTION_EXECUTOR.md R-AE-023 (el
Response es semántico, el Channel Adapter solo formatea).

**Justificación:** Si el Channel Adapter modificara el contenido, estaría tomando
una decisión comunicativa — una operación cognitiva que viola R-CAD-002.

**Implicaciones Cognitivas:**
- El Channel Adapter puede añadir elementos de presentación (saltos de línea,
  emojis, markup) pero no contenido informativo.
- El Channel Adapter puede reordenar elementos por razones de formato (ej.: poner
  el mensaje principal primero en SMS) pero no cambiar el significado.
- El Channel Adapter puede truncar mensajes solo si el canal lo exige y con
  indicación de truncamiento (ej.: "..." al final).

**Impacto Conversacional:** El usuario confía en que el mensaje del sistema es
íntegro. No hay "interpretación" del canal que distorsione la comunicación.

**Verificación:** ¿El Channel Adapter añade, elimina, o modifica información
semántica en el Response? Si sí → violación.

---

### R-CAD-011 — Manejo de fallo de entrega

**Enunciado:** Si el Channel Adapter no puede entregar un Response al canal destino
(red caída, canal no disponible, destinatario desconectado), debe:
1. Intentar un canal alternativo si está definido para ese destino
2. Si no hay alternativa o falla también, registrar un Outcome FAILURE de entrega
3. Reportar el fallo al Action Executor como Outcome de la acción comunicativa
4. No perder el mensaje — implementación define reintentos

**Derivación Constitucional:** R-CA-015 (Channel Adapter guarantees delivery attempt
or delivery failure report — el Adapter garantiza intento o reporte de fallo);
ACTION_EXECUTOR.md R-AE-027 (Outcome como registro del resultado de la acción).

**Justificación:** La entrega de un Response es una acción comunicativa. Como toda
acción, puede fallar. El sistema debe saber si su comunicación llegó o no.

**Implicaciones Cognitivas:**
- El fallo de entrega no es un fallo cognitivo — es operacional.
- El fallo de entrega se registra como Outcome para trazabilidad.
- El sistema cognitivo puede decidir reintentar, escalar, o abandonar según el
  tipo de Commitment.
- El Channel Adapter no decide qué hacer con el fallo — solo lo reporta.

**Impacto Conversacional:** Si un mensaje no llega, el sistema lo sabe y puede
tomar medidas correctivas. El usuario no queda en un "agujero negro" comunicativo.

**Verificación:** ¿Existe algún fallo de entrega de Response que no se registre?
Si sí → violación.

---

### R-CAD-012 — Prioridad de entrega

**Enunciado:** Los Responses tienen prioridad de entrega según su intención
comunicativa (R-AE-023):
- **Alta:** NOTIFICAR_ERROR, ESCALAR — entregar inmediatamente, incluso si
  interrumpe otras comunicaciones.
- **Normal:** CONFIRMAR, INFORMAR — entregar en orden de llegada, sin saltarse
  mensajes previos.
- **Baja:** PREGUNTAR — entregar después de los mensajes de prioridad normal
  y alta.

**Derivación Constitucional:** ACTION_EXECUTOR.md R-AE-023 (Urgencia como componente
del Response); CP-33 (acompañamiento continuo — las comunicaciones urgentes tienen
prioridad).

**Justificación:** No todos los mensajes tienen la misma urgencia. Un error de
ejecución debe comunicarse antes que una pregunta de seguimiento.

**Implicaciones Cognitivas:**
- La prioridad la asigna el Action Executor en el Response.
- El Channel Adapter respeta la prioridad pero no la determina.
- Si hay múltiples Responses en cola para el mismo destino, se entregan por
  prioridad y dentro de la misma prioridad por orden de llegada.
- Un Response de alta prioridad puede interrumpir la preparación de uno de
  prioridad normal (el de prioridad normal se completa y envía después).

**Impacto Conversacional:** Las comunicaciones críticas llegan primero. El usuario
no espera una notificación de error porque el sistema está preparando una
confirmación no urgente.

**Verificación:** ¿Existe algún mecanismo donde el Channel Adapter asigne prioridad
diferente a la que el Response trae? Si sí → violación.

---

## IV. Signals de Entrada Especiales

### R-CAD-013 — Recepción de Signals de temporizador (Cron)

**Enunciado:** El Channel Adapter puede recibir Signals de temporizadores internos
(no iniciados por un usuario). Estos Signals se tratan como VerifiedSignal con
Source = "system" y Channel = "cron". Activan Ciclos Cognitivos para monitoreo,
verificación de expiración de Commitments, y otras tareas temporales.

**Derivación Constitucional:** ONTOLOGY.md §3.4 (Channel definido por protocolo y
dirección — cron es un canal temporal); R-CA-004 (recepción de Signals de cualquier
fuente externa).

**Justificación:** El sistema necesita iniciar ciclos cognitivos sin intervención
del usuario (ej.: verificar si un Commitment expiró, monitorear un viaje en curso).
Estos Signals internos siguen el mismo camino que los externos.

**Implicaciones Cognitivas:**
- Los Signals de cron no tienen Source humano.
- Los Signals de cron tienen Channel = "cron", que implica verificación mínima.
- El sistema cognitivo procesa estos Signals como cualquier otro, pero sabe que
  no hay usuario esperando respuesta inmediata.
- Los Responses a Signals de cron pueden no requerir entrega al usuario.

**Impacto Conversacional:** El sistema opera autónomamente en segundo plano. El
usuario no necesita iniciar cada acción.

**Verificación:** ¿Existe algún flujo interno del sistema que no pase por el Channel
Adapter? Si sí → puede ser aceptable solo si no es un Signal entrante (ej.:
procesamiento interno de Outcomes).

---

### R-CAD-014 — Recepción de notificaciones de sistemas externos

**Enunciado:** El Channel Adapter puede recibir Signals desde sistemas externos
(APIs de pago, servicios de geolocalización, webhooks de conductores). Estos
Signals se verifican según el protocolo del sistema externo y se entregan al
Evidence Engine con Source = "external_service" y Channel según el servicio.

**Derivación Constitucional:** ONTOLOGY.md §3.4 (Channel — webhook es un tipo de
canal); R-CA-004 (recepción de Signals de cualquier fuente externa).

**Justificación:** El sistema recibe información no solo de usuarios sino también
de otros sistemas. Cada fuente externa es un "canal" que debe pasar por la misma
frontera de verificación.

**Implicaciones Cognitivas:**
- La verificación varía según el sistema externo (API key, HMAC, IP allowlist).
- La Source classification distingue entre el sistema externo específico.
- El sistema cognitivo sabe que la información proviene de un sistema automático,
  no de un humano.
- Los Responses a notificaciones externas pueden ser operacionales sin
  comunicación al usuario.

**Impacto Conversacional:** El sistema integra información de múltiples fuentes
sin que el usuario tenga que mediar.

**Verificación:** ¿Existe algún sistema externo que envíe Signals directamente
sin pasar por el Channel Adapter? Si sí → violación.

---

## V. Estructura del VerifiedSignal

### R-CAD-015 — Estructura del VerifiedSignal

**Enunciado:** Todo VerifiedSignal entregado al Evidence Engine debe contener:

| Componente | Descripción | Obligatorio |
|------------|-------------|-------------|
| **Raw content** | Contenido original del Signal sin modificar | Sí |
| **Channel** | Canal de origen (conversacional, cron, webhook, api) | Sí |
| **Source** | Identidad del emisor (userId, systemId, "system") | Sí |
| **Source confidence** | Nivel de confianza en la identidad (HIGH, MEDIUM, LOW) | Sí |
| **Timestamp de recepción** | Cuándo llegó el Signal al Channel Adapter | Sí |
| **ID de idempotencia** | Identificador único para detección de duplicados | Sí |
| **Channel metadata** | Metadatos específicos del canal (tipo de mensaje, adjuntos, etc.) | No |
| **Verification result** | Resultado de la verificación (PASSED, FAILED, BYPASSED) | Sí |

**Derivación Constitucional:** R-CA-011 (VerifiedSignal con raw content, channel
metadata, Source classification, timestamp, idempotency key); ONTOLOGY.md §3.3
(VerifiedSignal como Signal validado a nivel de canal).

**Justificación:** Una estructura estandarizada garantiza que el Evidence Engine
recibe toda la información necesaria para registrar el Signal como Evidence, sin
necesidad de consultar al Channel Adapter retrospectivamente.

**Implicaciones Cognitivas:**
- La estructura es independiente del canal de origen.
- El Evidence Engine usa estos datos para crear el registro de Evidence inicial.
- La Source confidence determina el peso epistémico inicial del Signal.
- El ID de idempotencia permite al sistema ignorar Signals duplicados.

**Impacto Conversacional:** Cada mensaje que entra al sistema tiene un registro
completo y trazable desde el momento de recepción.

**Verificación:** ¿Existe algún VerifiedSignal que carezca de alguno de los campos
obligatorios? Si sí → violación.

---

## VI. Responses Especiales

### R-CAD-016 — Response de progreso (acompañamiento continuo)

**Enunciado:** Para Ciclos Cognitivos prolongados, el Action Executor puede generar
Responses de progreso (CP-33). El Channel Adapter entrega estos Responses como
mensajes informativos que comunican el estado del procesamiento. El Response de
progreso debe ser:
- Honesto (CP-33): refleja el estado real del ciclo, no un placeholder.
- No intrusivo: se entrega como un mensaje informativo, no como una interrupción.
- Temporal: entrega y olvida, no requiere respuesta del usuario.

**Derivación Constitucional:** CP-33 (acompañamiento continuo — el sistema debe
informar su progreso); ACTION_EXECUTOR.md R-AE-016 (Response comunicativo).

**Justificación:** El acompañamiento continuo reduce la incertidumbre del usuario.
Saber que "el sistema está verificando disponibilidad" es mejor que silencio.

**Implicaciones Cognitivas:**
- El Response de progreso no interrumpe el Ciclo Cognitivo (el canal lo entrega
  en segundo plano).
- El Response de progreso no requiere confirmación del usuario.
- Múltiples Responses de progreso para el mismo ciclo se entregan en orden.
- Si el ciclo se completa antes de que el Response de progreso se entregue, el
  Response de progreso puede cancelarse.

**Impacto Conversacional:** El usuario nunca se pregunta "¿me entendió o se
quedó colgado?" — el sistema comunica su estado.

**Verificación:** ¿El sistema procesa en silencio durante períodos prolongados?
Si sí → violación de CP-33.

---

### R-CAD-017 — Response de pregunta (CP-32)

**Enunciado:** Cuando el sistema necesita información del usuario para avanzar en
el Ciclo Cognitivo, el Action Executor genera un Response de pregunta. El Channel
Adapter formatea la pregunta según el canal:
- **WhatsApp:** Texto + botones de respuesta rápida (hasta 3 opciones) + opción
  de respuesta libre.
- **Web:** Texto + elementos de formulario (select, input, botones).
- **SMS:** Texto con instrucciones para responder.

**Derivación Constitucional:** CP-32 (preguntar con propósito — cada pregunta debe
tener un gap de Evidence identificado); ACTION_EXECUTOR.md R-AE-016 (Response de
pregunta).

**Justificación:** La pregunta debe ser respondible en el canal donde se entrega.
Una pregunta compleja en SMS (donde el usuario debe tipear) es menos efectiva que
en WhatsApp (con botones).

**Implicaciones Cognitivas:**
- La pregunta incluye opciones de respuesta cuando el gap de Evidence es cerrado
  (opciones conocidas).
- La pregunta incluye respuesta libre cuando el gap es abierto.
- El canal determina el formato de la pregunta, no su contenido.
- La pregunta incluye el contexto necesario para que el usuario responda sin
  ambigüedad.

**Impacto Conversacional:** El usuario recibe preguntas claras y respondibles,
adaptadas al medio por el que se comunica.

**Verificación:** ¿Existe alguna pregunta cuyo formato no sea apropiado para el
canal de entrega? Si sí → violación.

---

### R-CAD-018 — Response informativo de escalación

**Enunciado:** Cuando una Decisión ESCALATE se ejecuta (R-DM-004), el Action Executor
genera un Response informativo que comunica al usuario que su caso requiere atención
humana. El Channel Adapter entrega este Response con prioridad alta (R-CAD-012) e
incluye la información de contacto o tiempo estimado de resolución.

**Derivación Constitucional:** R-CM-023 (Escalation package — la escalación incluye
contexto completo para el humano); ACTION_EXECUTOR.md R-AE-016 (Response de
escalación); CP-33 (acompañamiento continuo).

**Justificación:** La escalación no es un fracaso — es un cambio de nivel de
atención. El usuario debe saber que su caso fue escalado y qué esperar.

**Implicaciones Cognitivas:**
- El Response de escalación es prioritario.
- El Response de escalación incluye el contexto de por qué se escaló.
- El Response de escalación incluye pasos siguientes (tiempo estimado, qué esperar).
- El Response de escalación no incluye promesas que el sistema no pueda cumplir.

**Impacto Conversacional:** El usuario sabe cuándo su caso pasa a un humano y
qué esperar. No hay incertidumbre.

**Verificación:** ¿Existe alguna escalación que no genere un Response informativo
al usuario? Si sí → violación.

---

## VII. Invariantes

### I-CAD-001 — El Channel Adapter es la única frontera

**Enunciado:** Todo Signal entrante y todo Response saliente debe pasar por el
Channel Adapter. No existen rutas alternativas de I/O.

**Verificación:** Si existe algún componente con I/O externo directo, el sistema
está en estado inválido.

**Fuente:** R-CA-004, R-CAD-001.

---

### I-CAD-002 — No interpretación en la frontera

**Enunciado:** El Channel Adapter no realiza ninguna operación cognitiva sobre los
Signals o Responses. Su operación es puramente mecánica y determinista.

**Verificación:** Si el Channel Adapter extrae significado, clasifica contenido,
o interpreta intención, el sistema está en estado inválido.

**Fuente:** R-CA-004, R-CAD-002, CP-07.

---

### I-CAD-003 — Contenido semántico inviolable

**Enunciado:** El Channel Adapter no modifica el contenido semántico del Response.
Solo aplica formato específico del canal sin cambiar qué se dice.

**Verificación:** Si el Channel Adapter añade, elimina, o modifica información
semántica en un Response, el sistema está en estado inválido.

**Fuente:** R-CA-015, R-CAD-010, ACTION_EXECUTOR.md R-AE-023.

---

### I-CAD-004 — VerifiedSignal completo

**Enunciado:** Todo VerifiedSignal entregado al Evidence Engine debe contener raw
content, channel, source, source confidence, timestamp, idempotency key, y
verification result.

**Verificación:** Si un VerifiedSignal carece de algún campo obligatorio, el
sistema está en estado inválido.

**Fuente:** R-CA-011, R-CA-015.

---

### I-CAD-005 — El Adapter no depende del sistema cognitivo

**Enunciado:** El Channel Adapter debe poder funcionar independientemente del estado
del sistema cognitivo. No puede tener dependencias bloqueantes de componentes
cognitivos.

**Verificación:** Si el Channel Adapter deja de funcionar cuando el sistema
cognitivo está caído, el sistema está en estado inválido.

**Fuente:** R-CA-004, R-CAD-003.

---

### I-CAD-006 — Entrega intentada o reportada

**Enunciado:** Para cada Response recibido, el Channel Adapter debe intentar la
entrega o reportar un fallo. No puede haber Responses ignorados.

**Verificación:** Si existe algún Response que no fue entregado ni reportado como
fallido, el sistema está en estado inválido.

**Fuente:** R-CA-015, R-CA-011.

---

## VIII. Delegación a Documentos de Implementación

### 8.1 Documentos que concretizan este modelo

| Documento | Qué concreta |
|-----------|-------------|
| **CHANNEL_ADAPTER implementation** (Level IV) | Conectores técnicos por canal (WhatsApp Webhook, WebSocket web, SMS gateway, API REST), verificación HMAC/token, rate limiting, idempotencia, formato de mensajes por canal, cola de entrega, reintentos, manejo de adjuntos |

### 8.2 Trazabilidad de reglas

| Regla | Fuente CP | Fuente CONSTITUTION | Fuente COGNITIVE_ARCHITECTURE | Fuente ACTION_EXECUTOR | Fuente ONTOLOGY |
|-------|-----------|-------------------|------------------------------|----------------------|-----------------|
| R-CAD-001 | CP-05 | — | R-CA-004 | — | §3.4 |
| R-CAD-002 | CP-07 | — | R-CA-004 | — | — |
| R-CAD-003 | — | — | R-CA-004 | — | — |
| R-CAD-004 | CP-05 | — | R-CA-004 | — | §3.1 |
| R-CAD-005 | CP-07 | — | R-CA-004, R-CA-011 | — | — |
| R-CAD-006 | — | — | R-CA-004, R-CA-011 | — | §3.4 |
| R-CAD-007 | CP-06 | — | R-CA-011, IP-1 | — | §3.3 |
| R-CAD-008 | — | — | R-CA-015, IP-4 | R-AE-023 | — |
| R-CAD-009 | CP-33 | — | R-CA-015 | — | — |
| R-CAD-010 | — | — | R-CA-015 | R-AE-023 | — |
| R-CAD-011 | — | — | R-CA-015 | R-AE-027 | — |
| R-CAD-012 | CP-33 | — | — | R-AE-023 | — |
| R-CAD-013 | — | — | R-CA-004 | — | §3.4 |
| R-CAD-014 | — | — | R-CA-004 | — | §3.4 |
| R-CAD-015 | — | — | R-CA-011 | — | §3.3 |
| R-CAD-016 | CP-33 | P-I4, P-E3 | — | R-AE-016 | — |
| R-CAD-017 | CP-32 | P-I4, P-E5 | — | R-AE-016 | — |
| R-CAD-018 | — | — | — | R-AE-016 | — |
| I-CAD-001 | — | — | R-CA-004 | — | — |
| I-CAD-002 | CP-07 | — | R-CA-004 | — | — |
| I-CAD-003 | — | — | R-CA-015 | R-AE-023 | — |
| I-CAD-004 | — | — | R-CA-011 | — | — |
| I-CAD-005 | — | — | R-CA-004 | — | — |
| I-CAD-006 | — | — | R-CA-015 | — | — |

---

## Apéndice — Resumen de Delegaciones Recibidas

### Desde COGNITIVE_PRINCIPLES.md (§13.2):

| CP | Principio | Concretizado por |
|----|-----------|------------------|
| CP-32 | Preguntar con propósito | R-CAD-017 |
| CP-33 | Acompañamiento continuo | R-CAD-012, R-CAD-016 |
| CP-35 | Explicación antes de acción | (delegado primariamente a ACTION_EXECUTOR.md; el Channel Adapter formatea la explicación) |

### Desde COGNITIVE_ARCHITECTURE.md:

| Regla | Tópico | Concretizado por |
|-------|--------|------------------|
| R-CA-004 | Channel Adapter responsibility | R-CAD-001, R-CAD-002, R-CAD-003, R-CA-004, R-CAD-005, R-CAD-006, R-CAD-007, R-CAD-013, R-CAD-014, I-CAD-001, I-CAD-002, I-CAD-005 |
| R-CA-011 | Channel Adapter → Evidence Engine | R-CAD-005, R-CAD-006, R-CAD-007, R-CA-015, I-CAD-004 |
| R-CA-015 | Action Executor → Channel Adapter | R-CAD-008, R-CAD-009, R-CAD-010, R-CA-011, I-CAD-003, I-CAD-006 |
| IP-1 | Signal Handoff | R-CAD-007 |
| IP-4 | Response Handoff | R-CAD-008 |

### Desde ACTION_EXECUTOR.md:

| Regla | Tópico | Concretizado por |
|-------|--------|------------------|
| R-AE-023 | Response semántico | R-CAD-008, R-CAD-010, I-CAD-003 |
| R-AE-016 | Response comunicativo | R-CAD-016, R-CAD-017, R-CAD-018 |
| R-AE-027 | Outcome de acción comunicativa | R-CAD-011 |

---

*Fin de 08-CHANNEL_ADAPTER.md — Versión 1.0-draft — 18 reglas (R-CAD-001 a R-CAD-018), 6 invariantes (I-CAD-001 a I-CAD-006)*

> Este documento fue redactado a partir de la delegación constitucional de
> COGNITIVE_PRINCIPLES.md (CP-32, CP-33, CP-35), los contratos de
> COGNITIVE_ARCHITECTURE.md (R-CA-004, R-CA-011, R-CA-015, IP-1, IP-4),
> ACTION_EXECUTOR.md (R-AE-023, R-AE-016, R-AE-027), y la terminología de
> ONTOLOGY.md. Es un DRAFT hasta su ratificación mediante el proceso de gobierno
> de la Constitución (CONSTITUTION.md Sección 7.2).
