# 09-ACTION_EXECUTOR.md — Action Executor Model

**Nivel:** III-g (Modelo de Ejecución)
**Versión:** 1.0-draft
**Dependencias:** SYSTEM_VOCABULARY.md, CONSTITUTION.md, COGNITIVE_PRINCIPLES.md, DECISION_MODEL.md, COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md

> **Nota de navegación:** Este documento es parte de la familia de 8 modelos Level III.
> Hermano de: EVIDENCE_MODEL (III-a), DECISION_MODEL (III-b), COMMITMENT_MODEL (III-c),
> CERTAINTY_CALCULUS (III-d), CHANNEL_ADAPTER (III-e), KNOWLEDGE_MODEL (III-f),
> COGNITIVE_ARCHITECTURE (III-h).

---

## Propósito

Definir qué significa **ejecutar** desde el punto de vista cognitivo: cómo un Commitment
abstracto se convierte en acción concreta, cómo se genera la Proyección Operacional,
cómo se producen las Respuestas, y cómo se observan y registran los Outcomes.

Este documento no describe implementación. No menciona HTTP, APIs, bases de datos, colas,
threads, microservicios, frameworks, ni ninguna tecnología específica. Describe **el proceso
cognitivo de ejecución**.

---

## Fuentes Normativas

| Fuente | Sección/Regla | Relación |
|--------|---------------|----------|
| CONSTITUTION.md | §2.3, §5.2, S-P1, S-P6, S-P7, P-I5 | Autoridad del sistema, límites, preservación, auditabilidad |
| SYSTEM_VOCABULARY.md | §8 (Proyección), §9 (Compromiso), §12 (Acción y Outcome) | Vocabulario: Action, Response, Outcome |
| COGNITIVE_PRINCIPLES.md | CP-01, CP-22, CP-31, CP-35, CP-37, CP-38, CP-39 | Base operacional, compromiso, explicación, feedback, delegación, compensación |
| DECISION_MODEL.md | R-DM-025, R-DM-026 | Interfaz Commitment → Action Executor, outcome feedback |
| COMMITMENT_MODEL.md | R-CM-001, R-CM-005, R-CM-008, R-CM-014, R-CM-019, R-CM-020, R-CM-025, R-CM-037, R-CM-038, R-CM-045 | Naturaleza del Commitment, ejecución, outcomes, compensaciones |
| COGNITIVE_ARCHITECTURE.md | R-CA-010, R-CA-014, R-CA-015, §9, §10 | Responsabilidades, contratos, fases 5 y 6, IP-3, IP-4, IP-5 |

---

## Documentos que reciben delegación de este modelo

| Documento | Qué concreta |
|-----------|-------------|
| **08-CHANNEL_ADAPTER.md** (Level III-e) | Formateo de Response por canal, entrega al usuario |
| **ACTION_EXECUTOR implementation** (Level IV) | Ejecución técnica de acciones, conectores a sistemas externos |

---

## I. Naturaleza de la Ejecución

### R-AE-001 — La ejecución es el acto final del Ciclo Cognitivo

**Enunciado:** La ejecución es la sexta y última etapa del Ciclo Cognitivo
(COGNITIVE_ARCHITECTURE.md §10). Toma un Commitment ya formado y aprobado por el
Commitment Gate y lo convierte en acción concreta en el mundo. La ejecución no produce
decisiones — produce acciones.

**Derivación Constitucional:** CP-38 (Action Delegation — la ejecución puede delegarse
a un subsistema específico); R-CA-010 (Action Executor responsibility — el Executor
no decide, ejecuta); SYSTEM_VOCABULARY.md §12.1 (Action como output del sistema).

**Justificación:** Separar la ejecución de la decisión evita que el sistema "decida
haciendo" — una violación epistemológica grave. La ejecución debe ser un acto
posterior, mecánico (en sentido cognitivo), no creativo.

**Implicaciones Cognitivas:**
- La ejecución siempre sigue a la formación del Commitment. No hay ejecución sin Commitment.
- La ejecución es determinista dados el Commitment y el contexto operacional.
- La ejecución no puede rechazar un Commitment (no tiene autoridad decisoria).
- La ejecución reporta fallos como Outcomes, no como rechazos.

**Impacto Conversacional:** El sistema nunca actúa sin haber decidido primero. Cada
acción tiene una justificación rastreable hasta una Decisión y un Commitment.

**Verificación:** ¿Existe alguna acción ejecutada sin que exista un Commitment previo
que la autorice? Si sí → violación.

---

### R-AE-002 — La ejecución no genera nuevo conocimiento

**Enunciado:** La ejecución no crea Beliefs, no evalúa Evidence, no computa Certainty,
no forma Decisiones, no genera Commitments. La ejecución toma el conocimiento existente
(Commitments + Knowledge State) y lo transforma en acción. El único conocimiento nuevo
que puede generar es el Outcome (ontológicamente posterior a la acción).

**Derivación Constitucional:** R-CA-010 (Action Executor no forma Beliefs, no computa
Certainty); CP-38 (Action Delegation — la ejecución es un acto delegado, no cognitivo);
SYSTEM_VOCABULARY.md §12.3 (Outcome como resultado observable de la acción).

**Justificación:** Si la ejecución generara conocimiento, el Action Executor sería un
agente cognitivo completo, violando la separación de responsabilidades de la
Arquitectura Cognitiva (R-CA-005).

**Implicaciones Cognitivas:**
- El Action Executor lee del Knowledge State pero no escribe en él (salvo Outcomes).
- El Action Executor no interpreta Signals, no extrae Evidence, no evalúa confianza.
- El Action Executor no tiene acceso al Evidence Store como escritor (solo como lector
  de contexto operacional si es necesario).
- El Action Executor es cognitivamente "ciego" — sigue instrucciones, no las cuestiona.

**Impacto Conversacional:** El sistema mantiene una separación clara entre pensar y
hacer. El usuario recibe acciones que son consecuencia de decisiones, no decisiones
camufladas como acciones.

**Verificación:** ¿El Action Executor realiza alguna operación que pueda generar Beliefs
o evaluar Evidence? Si sí → violación.

---

### R-AE-003 — Toda acción requiere exactamente un Commitment

**Enunciado:** El Action Executor no puede ejecutar ninguna acción sin un Commitment
ACTIVE que la autorice. La relación es 1:1 — una acción corresponde exactamente a un
Commitment. Un Commitment puede producir múltiples acciones en el tiempo (ej.:
monitoreo continuo), pero cada acción individual se origina de un Commitment específico.

**Derivación Constitucional:** R-CM-045 (No action without a Commitment — toda acción
debe tener referencia a un Commitment ACTIVE); CP-01 (Evidence-Based Operation — la
acción debe estar fundamentada); SYSTEM_VOCABULARY.md §12.1 (toda Acción corresponde a
exactamente una Decisión, mediada por Commitment).

**Justificación:** Sin esta regla, el sistema podría ejecutar acciones espurias sin
justificación. La relación 1:1 garantiza trazabilidad completa.

**Implicaciones Cognitivas:**
- Cada acción ejecutada contiene una referencia al Commitment que la autoriza.
- El Action Executor rechaza (reporta como error) cualquier instrucción sin Commitment.
- Si un Commitment expira durante la ejecución, la acción en curso debe completarse
  o abortarse según el tipo de Commitment (R-AE-034).

**Impacto Conversacional:** El usuario tiene certeza de que cada acción del sistema
está justificada por un compromiso explícito.

**Verificación:** ¿Existe alguna acción que no pueda rastrearse hasta un Commitment
ACTIVE? Si sí → violación.

---

### R-AE-004 — Las acciones son ontológicamente distintas de los Commitments

**Enunciado:** Un Commitment es una obligación (ontología del deber ser). Una acción
es un hecho consumado (ontología del ser). El Commitment "despachar conductor X"
es una obligación. La acción "enviar señal de despacho a conductor X" es un evento.
El Action Executor trabaja en la ontología del ser: produce eventos a partir de
obligaciones.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §8.2 (Commitment como obligación), §12.1
(Action como output del sistema), §12.3 (Outcome como resultado observable).

**Justificación:** Confundir obligaciones con acciones es un error categorial. El sistema
debe distinguir entre "deber hacer" (Commitment) y "hacer" (Action). La confusión
lleva a sistemas que creen haber actuado cuando solo se comprometieron.

**Implicaciones Cognitivas:**
- El Commitment existe antes y después de la acción. No se "consume" al ejecutar.
- La acción es un evento temporal, el Commitment es una obligación persistente.
- Un Commitment puede generar cero, una, o múltiples acciones a lo largo de su vida.
- La acción queda registrada en Episodic Memory (ONTOLOGY §11.4). El Commitment
  queda registrado en el Commitment Store.

**Impacto Conversacional:** El sistema distingue consistentemente entre lo que *dice*
que hará y lo que *hace*. Esta distinción es visible para el usuario en la
comunicación del sistema.

**Verificación:** ¿Existe algún mecanismo que trate un Commitment como si fuera una
acción (ej.: "el Commitment se ejecuta") o una acción como si fuera un Commitment
(ej.: "la acción genera obligaciones")? Si sí → violación.

---

### R-AE-005 — La ejecución produce dos categorías de output

**Enunciado:** El Action Executor produce dos categorías de output, ontológicamente
distintas, a partir de los Commitments activos:

| Categoría | Naturaleza | Destino | Ejemplos |
|-----------|-----------|---------|----------|
| **Response** | Comunicación | Channel Adapter (→ usuario) | Confirmación de viaje, pregunta de aclaración, notificación de error |
| **Operational Projection** | Acción operacional | Sistemas externos / mundo real | Despacho de conductor, creación de viaje, actualización de precio |

**Derivación Constitucional:** R-CA-012 (Projection Outputs); SYSTEM_VOCABULARY.md §8.3
(Operational Projection como vista ejecutable), §12.1.1 (Response como subtipo de
Action).

**Justificación:** Comunicar y operar son actos diferentes. La comunicación modifica
el estado epistémico del usuario. La operación modifica el estado del mundo. El
Action Executor debe manejar ambas con mecanismos distintos.

**Implicaciones Cognitivas:**
- Response y Operational Projection son independientes: puede haber Response sin
  operación (ej.: aclaración) y operación sin Response (ej.: acción interna).
- El Response sigue el contrato R-CA-015: contenido semántico, no formato de canal.
- La Operational Projection sigue el contrato R-CM-039: derivada de Commitments,
  de solo lectura respecto a los Commitments.
- Ambos outputs se registran como eventos para trazabilidad.

**Impacto Conversacional:** El sistema comunica lo que hace y hace lo que comunica.
No hay acciones silenciosas ni comunicaciones sin sustento.

**Verificación:** ¿Existe alguna acción del sistema que no sea clasificable como
Response o Operational Projection? Si sí → violación.

---

## II. Recepción y Validación de Commitments

### R-AE-006 — Recepción del Commitment desde el Commitment Gate

**Enunciado:** El Action Executor recibe Commitments desde el Commitment Gate a través
del contrato IP-3 (Commitment Handoff, COGNITIVE_ARCHITECTURE.md §14.1). El Commitment
llega en estado ACTIVE y listo para ejecución. El Action Executor no puede rechazar
un Commitment recibido — solo reportar fallos en su ejecución.

**Derivación Constitucional:** R-CA-014 (Commitment Gate → Action Executor contract);
IP-3 (Commitment Handoff); R-CM-037 (Compromiso + Parámetros → Acción).

**Justificación:** El Commitment Gate ya validó el Commitment. El Action Executor no
tiene autoridad para reabrir esa validación. Rechazar un Commitment sería una
decisión, y el Executor no decide.

**Implicaciones Cognitivas:**
- El Action Executor registra la recepción del Commitment como evento de inicio.
- El Action Executor no verifica umbrales, costos de error, ni precedencia.
- Si el Commitment es inválido por razones operacionales (ej.: el destino no existe),
  el Executor reporta un Outcome FAILURE, no rechaza el Commitment.

**Impacto Conversacional:** El sistema no cambia de opinión después de comprometerse.
Si algo sale mal durante la ejecución, lo reporta como fallo operacional, no como
cambio de decisión.

**Verificación:** ¿El Action Executor tiene algún mecanismo para rechazar un Commitment
válido del Commitment Gate? Si sí → violación.

---

### R-AE-007 — Validación operacional pre-ejecución

**Enunciado:** Antes de ejecutar, el Action Executor realiza una validación operacional
(no epistémica) del Commitment contra el contexto actual. Esta validación verifica:

- ¿El Commitment sigue siendo aplicable? (no expiró, no fue revocado)
- ¿Los parámetros son consistentes con el estado operacional actual?
- ¿Las precondiciones operacionales se cumplen? (ej.: el conductor sigue disponible)

Esta validación es **operacional**, no epistémica. No evalúa si el Commitment es
correcto — evalúa si es ejecutable aquí y ahora.

**Derivación Constitucional:** R-CM-014 (Expiración — el Executor verifica vigencia);
R-CM-024 (Revocación — el Executor verifica estado actual); R-CM-037 (Parámetros de
ejecución).

**Justificación:** Un Commitment puede ser válido epistémicamente pero inejecutable
operacionalmente (ej.: el conductor canceló después del Commitment). La validación
pre-ejecución detecta estas condiciones.

**Implicaciones Cognitivas:**
- La validación operacional ocurre inmediatamente antes de la ejecución.
- Si falla, el Action Executor registra Outcome FAILURE con causa operacional.
- Si falla, se inicia el flujo de compensación (R-AE-033) si el Commitment lo requiere.
- La validación no modifica el Commitment ni su estado.

**Impacto Conversacional:** El sistema detecta condiciones operacionales adversas
antes de actuar, no después. El usuario recibe notificación de fallo operacional
inmediato.

**Verificación:** ¿Existe alguna ejecución que no realice validación operacional
pre-ejecución? Si sí → violación.

---

### R-AE-008 — Cola de ejecución no es un concepto cognitivo

**Enunciado:** El Action Executor no tiene una "cola de ejecución" como concepto
cognitivo. Los Commitments se ejecutan en el orden definido por la prioridad del
Commitment (R-CM-017) y las reglas de precedencia (R-CM-028). La ejecución puede
ser secuencial o paralela según la naturaleza del Commitment, pero esto es una
decisión de implementación, no un concepto del modelo.

**Derivación Constitucional:** R-CM-017 (Prioridad — los Commitments tienen prioridad),
R-CM-028 (Precedencia — cómo se ordenan los Commitments).

**Justificación:** "Cola" es un concepto de implementación. El modelo cognitivo solo
define que los Commitments tienen prioridad y que algunos deben ejecutarse antes que
otros. Cómo se implementa la concurrencia es un detalle de Level IV.

**Implicaciones Cognitivas:**
- El modelo no impone orden FIFO, LIFO, ni ningún orden específico.
- El modelo no impone sincronía ni asincronía.
- El modelo no define qué pasa si dos Commitments intentan modificar el mismo
  recurso — eso es un problema de implementación, no cognitivo.

**Impacto Conversacional:** El sistema no necesita explicar "cola" al usuario. Explica
prioridad: "primero lo urgente, después lo importante."

**Verificación:** ¿El modelo cognitivo introduce conceptos de cola, scheduling, o
concurrencia? Si sí → violación (es implementación).

---

### R-AE-009 — Recepción de Commitments Informativos

**Enunciado:** Los Commitments Informativos (R-CM-002) — aquellos que expresan una
interpretación o creencia confirmada del sistema — se reciben en el Action Executor
pero no requieren ejecución operacional. Su "ejecución" consiste en:
1. Incorporar la interpretación al estado cognitivo (ya ocurrió en fases previas).
2. Si el Commitment Informativo requiere comunicación, generar un Response descriptivo.
3. No producir ninguna Operational Projection.

**Derivación Constitucional:** R-CM-002 (Compromiso Informativo — interpretación
confirmada); R-CM-005 (Subtipo ontológico según impacto).

**Justificación:** Los Commitments Informativos son compromisos epistémicos, no
operacionales. El sistema se compromete con una interpretación, no con una acción.
El Action Executor solo comunica la interpretación si es necesario.

**Implicaciones Cognitivas:**
- El Action Executor reconoce si un Commitment es Informativo por su subtipo.
- Para Commitment Informativo: solo Response, no Operational Projection.
- El Response describe la interpretación: "Entendí que quieres viajar de A a B."
- No hay acción operacional asociada.

**Impacto Conversacional:** El sistema confirma su comprensión antes de actuar.
Esto reduce malentendidos y da al usuario oportunidad de corregir.

**Verificación:** ¿Se ejecuta alguna acción operacional para un Commitment Informativo?
Si sí → violación.

---

### R-AE-010 — Recepción de Commitments Operacionales

**Enunciado:** Los Commitments Operacionales (R-CM-003) — aquellos que obligan al
sistema a ejecutar una acción en el mundo — requieren tanto Response como Operational
Projection. El Response confirma la acción al usuario. La Operational Projection
ejecuta la acción en el mundo.

**Derivación Constitucional:** R-CM-003 (Compromiso Operacional — obligación de
acción); R-CM-005 (Subtipo ontológico según impacto — operacional requiere ejecución
y compensación).

**Justificación:** Los Commitments Operacionales tienen implicaciones en el mundo real.
Requieren comunicación al usuario (respuesta) y acción concreta (proyección).

**Implicaciones Cognitivas:**
- El Action Executor genera Response y Operational Projection.
- El Response se entrega al Channel Adapter (R-CA-015).
- La Operational Projection se ejecuta contra el contexto externo.
- Si la ejecución falla, se activa compensación (R-AE-033).

**Impacto Conversacional:** El usuario recibe confirmación de la acción y ve el
resultado. No hay acciones no informadas.

**Verificación:** ¿Existe algún Commitment Operacional que no genere Response? Si sí →
violación.

---

## III. Derivación de la Proyección

### R-AE-011 — Proyección es un cálculo, no un almacén

**Enunciado:** La Operational Projection se deriva (calcula) a partir de los
Commitments activos en cada ciclo. No es un almacén de estado separado. La Proyección
se recalcula desde cero en cada ciclo de ejecución, usando solo los Commitments
ACTIVE en ese momento.

**Derivación Constitucional:** R-CM-039 (Projection derives from Commitments — la
Proyección se deriva exclusivamente de Commitments activos); R-CM-040 (Projection
does not modify Commitments — la Proyección es de solo lectura); CP-27 (Proyección
derivada); CP-28 (Proyección de solo lectura).

**Justificación:** Si la Proyección fuera un almacén separado, podría desincronizarse
de los Commitments. Un viaje podría aparecer en la Proyección sin un Commitment que
lo respalde, o un Commitment podría existir sin reflejarse en la Proyección.

**Implicaciones Cognitivas:**
- La Proyección es una función de los Commitments activos: `Projection = f(ActiveCommitments)`.
- La Proyección no tiene estado propio — su estado es el estado de los Commitments.
- Si un Commitment cambia de estado (expira, se revoca), la Proyección refleja el
  cambio inmediatamente en el siguiente ciclo.
- La Proyección se recalcula incluso si ningún Commitment cambió — garantiza consistencia.

**Impacto Conversacional:** La visión operacional del sistema siempre está actualizada.
No hay información desactualizada en lo que el sistema "ve" del mundo.

**Verificación:** ¿La Proyección tiene algún estado que pueda diferir del estado de los
Commitments activos? Si sí → violación.

---

### R-AE-012 — La Proyección incluye solo Commitments ACTIVE

**Enunciado:** La Operational Projection se deriva exclusivamente de Commitments
en estado ACTIVE. Los Commitments en PENDING, COMPLETED, FAILED, REVOKED, EXPIRED,
CANCELLED, o COMPENSATED no contribuyen a la Proyección actual.

**Derivación Constitucional:** R-CM-039 (Proyección deriva de Commitments activos);
R-CM-040 (Proyección de solo lectura); R-CM-008 (Estados del lifecycle).

**Justificación:** Los Commitments no activos representan obligaciones pasadas,
fallidas, o futuras. Solo los ACTIVE representan obligaciones presentes que el
sistema debe ejecutar ahora.

**Implicaciones Cognitivas:**
- El Action Executor filtra por estado ACTIVE antes de derivar la Proyección.
- PENDING no contribuye (aún no se ha comprometido completamente).
- COMPLETED no contribuye (la obligación ya se cumplió).
- FAILED, REVOKED, EXPIRED no contribuyen (la obligación ya no existe).

**Impacto Conversacional:** La visión operacional del sistema incluye solo lo que
está vigente ahora. No hay "ruido" de compromisos pasados o futuros.

**Verificación:** ¿La Proyección incluye algún Commitment no ACTIVE? Si sí → violación.

---

### R-AE-013 — Proyección por subtipo operacional

**Enunciado:** Cada subtipo de Commitment Operacional (TripCreation, Dispatch,
PriceConfirmation, Cancellation, Compensation, Monitoring) produce un tipo específico
de Operational Projection:

| Subtipo | Proyección |
|---------|-----------|
| TripCreation | Estado de viaje creado con parámetros (origen, destino, precio) |
| Dispatch | Estado de conductor asignado a viaje |
| PriceConfirmation | Estado de precio confirmado para una ruta |
| Cancellation | Estado de viaje cancelado con razón |
| Compensation | Estado de acción compensatoria con tipo |
| Monitoring | Estado de monitoreo activo con condiciones |

**Derivación Constitucional:** R-CM-005 (Subtipo ontológico según impacto — cada
subtipo tiene implicaciones distintas); R-CM-036 (Costos de error por subtipo).

**Justificación:** Cada tipo de acción operacional modifica un aspecto diferente del
estado del mundo. La Proyección debe reflejar estas diferencias semánticamente.

**Implicaciones Cognitivas:**
- La Proyección no es una lista plana — tiene estructura según el subtipo.
- El Action Executor usa el subtipo para determinar qué ejecutar y cómo.
- La Proyección Response (comunicación) también varía según subtipo.

**Impacto Conversacional:** El sistema actúa de manera diferenciada según el tipo de
compromiso. Un despacho no se trata como una creación de viaje, ni una cancelación
como una confirmación de precio.

**Verificación:** ¿La Proyección trata todos los subtipos operacionales de manera
idéntica? Si sí → violación (debe respetar la semántica de cada subtipo).

---

### R-AE-014 — Proyección como especificación ejecutable

**Enunciado:** La Operational Projection es una especificación ejecutable: contiene
toda la información necesaria para que el sistema actúe, pero no contiene la
implementación de la acción. Es una "receta" semántica, no un comando técnico.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §8.3 (Operational Projection como vista
ejecutable del Knowledge State); R-CA-012 (Projection Outputs).

**Justificación:** La Proyección debe ser interpretable por un ejecutor técnico
(Level IV), pero el modelo cognitivo solo define la semántica. La Proyección dice
*qué* hacer, no *cómo* hacerlo.

**Implicaciones Cognitivas:**
- La Proyección incluye: qué Commitment la origina, qué acción ejecutar, qué
  parámetros usar, qué precondiciones verificar.
- La Proyección no incluye: cómo conectarse a un servicio externo, cómo formatear
  un mensaje, cómo persistir datos.
- La implementación (Level IV) interpreta la Proyección y la ejecuta técnicamente.

**Impacto Conversacional:** El sistema actúa según especificaciones semánticas que
pueden explicarse al usuario. La explicación no requiere detalles técnicos.

**Verificación:** ¿La Proyección incluye detalles de implementación técnica? Si sí →
violación.

---

### R-AE-015 — Proyección de solo lectura sobre Knowledge State

**Enunciado:** El Action Executor lee del Knowledge State para derivar la Proyección,
pero nunca escribe en él. La Proyección es una vista derivada de solo lectura. El
único write del Action Executor es la escritura de Outcomes como Evidence.

**Derivación Constitucional:** R-CM-040 (Projection does not modify Commitments);
CP-28 (Proyección de solo lectura); R-CA-010 (Action Executor lee de Knowledge State,
escribe Evidence).

**Justificación:** Si la Proyección modificara el Knowledge State, el Action Executor
tendría capacidad epistémica (podría crear Beliefs), violando R-AE-002.

**Implicaciones Cognitivas:**
- El Action Executor tiene acceso de lectura al Knowledge State.
- El Action Executor tiene acceso de escritura solo al Evidence Store (para Outcomes).
- El Action Executor no tiene acceso de escritura al Commitment Store ni al modelo de
  conocimiento.

**Impacto Conversacional:** El sistema garantiza que la ejecución no contamina el
conocimiento. El "hacer" no modifica el "saber."

**Verificación:** ¿El Action Executor escribe en el Knowledge State (excepto Outcomes)?
Si sí → violación.

---

## IV. Tipos de Acción y Ejecución

### R-AE-016 — Response: acción comunicativa

**Enunciado:** El Response es una acción comunicativa que entrega información al
usuario. Se produce para:
- Confirmar acciones (Commitments Operacionales)
- Expresar interpretaciones (Commitments Informativos)
- Solicitar aclaración (Decisión CLARIFY)
- Notificar errores (Outcomes FAILURE)
- Informar escalaciones (Decisión ESCALATE)

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §12.1.1 (Response como subtipo de Action
— comunicación al usuario); R-CA-015 (Action Executor → Channel Adapter contract);
R-CA-012 (Projection Outputs — la Proyección incluye Response).

**Justificación:** El Response es el mecanismo por el cual el sistema se comunica
con el usuario. Es una acción ontológicamente distinta de las operacionales.

**Implicaciones Cognitivas:**
- El Response es semántico: contiene *qué* decir, no *cómo* formatearlo.
- El Response incluye: contenido del mensaje, intención comunicativa, referencia al
  Commitment que lo origina.
- El Response se entrega al Channel Adapter (R-CA-015) para formateo por canal.
- El Response se registra en Episodic Memory para trazabilidad.

**Impacto Conversacional:** El usuario recibe comunicación clara, contextualizada y
justificada. Cada mensaje del sistema tiene una razón de ser.

**Verificación:** ¿Existe algún Response que no pueda rastrearse hasta un Commitment
o Decisión? Si sí → violación.

---

### R-AE-017 — Operational Projection: acción en el mundo

**Enunciado:** La Operational Projection es una acción que modifica el estado del
mundo externo al sistema. Incluye:
- Despachar conductores
- Crear/modificar/cancelar viajes
- Confirmar precios
- Ejecutar compensaciones
- Cualquier otra acción que tenga efecto observable fuera del sistema cognitivo

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §8.3 (Operational Projection — vista
ejecutable del estado del mundo); SYSTEM_VOCABULARY.md §12.1 (Action como output del sistema);
R-CM-005 (Subtipo ontológico según impacto operacional).

**Justificación:** La Operational Projection es el mecanismo por el cual el sistema
cumple sus obligaciones. No es comunicación — es operación.

**Implicaciones Cognitivas:**
- La Operational Projection se ejecuta después del Response (primero se informa,
  luego se actúa).
- La Operational Projection puede fallar — el Response de confirmación no garantiza
  éxito operacional.
- Si la Operational Projection falla, se genera un Outcome FAILURE y se activa
  compensación si aplica.

**Impacto Conversacional:** El sistema informa antes de actuar y reporta el resultado
después de actuar. El usuario sabe qué esperar y qué ocurrió.

**Verificación:** ¿Existe alguna Operational Projection que no tenga un Response
asociado? Si sí → violación (el usuario debe ser informado).

---

### R-AE-018 — Orden: Response antes que Operational Projection

**Enunciado:** Para Commitments Operacionales, el Action Executor genera primero el
Response (comunicación al usuario) y luego ejecuta la Operational Projection (acción
en el mundo). El Response se entrega al Channel Adapter antes de que la Operational
Projection comience su ejecución.

**Derivación Constitucional:** CP-35 (Explanation before Action — el sistema debe
explicar antes de actuar); R-CM-018 (Informative confirmation — el sistema confirma
antes de ejecutar); R-CM-020 (Explicación antes de acción).

**Justificación:** El usuario tiene derecho a saber qué va a hacer el sistema antes
de que lo haga. Esto permite al usuario cancelar si la interpretación es incorrecta.

**Implicaciones Cognitivas:**
- Response se genera y entrega primero.
- Operational Projection espera confirmación implícita (timeout) o explícita según
  el nivel de autoridad autónoma.
- Si el usuario objeta durante el período de espera, la Operational Projection
  se cancela y se registra Outcome CANCELLED.
- El período de espera depende del tipo de Commitment y del nivel de urgencia.

**Impacto Conversacional:** El usuario siempre ve lo que el sistema está por hacer
antes de que lo haga. Hay oportunidad de corregir.

**Verificación:** ¿Existe alguna Operational Projection que se ejecute antes de que
el Response correspondiente sea entregado al usuario? Si sí → violación.

---

### R-AE-019 — Acciones informativas sin operación

**Enunciado:** El Action Executor puede ejecutar acciones que son puramente
informativas (solo Response, sin Operational Projection). Esto ocurre para:
- Commitments Informativos (R-AE-009)
- Decisiones CLARIFY (preguntar al usuario)
- Decisiones ESCALATE (informar que se requiere intervención humana)
- Decisiones ABSTAIN (informar que no se puede actuar)

**Derivación Constitucional:** R-DM-004 (Alternativas COMMIT/CLARIFY/ESCALATE/ABSTAIN);
R-CM-002 (Compromiso Informativo); R-CA-012 (Projection Outputs — Response puede
existir sin Operational Projection).

**Justificación:** No toda acción del sistema requiere modificar el mundo externo.
Comunicar es una forma de acción legítima.

**Implicaciones Cognitivas:**
- Estas acciones se ejecutan como Response puro.
- No hay Operational Projection asociada.
- El Outcome de estas acciones es la entrega exitosa del Response.
- El Response se registra en Episodic Memory.

**Impacto Conversacional:** El sistema se comunica incluso cuando no puede actuar.
El usuario recibe explicaciones, no silencio.

**Verificación:** ¿Existe alguna situación donde el sistema deba comunicar y no lo
haga por "no haber acción operacional que ejecutar"? Si sí → violación.

---

### R-AE-020 — Ejecución de Monitoring (Commitments continuos)

**Enunciado:** Los Commitments de tipo Monitoring (R-CM-005) son Commitments
Operacionales que no se ejecutan una sola vez, sino que establecen una condición
de monitoreo continuo. Su "ejecución" consiste en:
1. Registrar la condición de monitoreo en la Proyección.
2. Mantener la condición activa mientras el Commitment esté ACTIVE.
3. Reportar Outcomes periódicos según la frecuencia del monitoreo.

**Derivación Constitucional:** R-CM-005 (Subtipo ontológico — Monitoring es un
subtipo operacional); R-CM-008 (Estados del lifecycle — el Commitment permanece
ACTIVE durante el monitoreo).

**Justificación:** Algunos compromisos no son eventos sino estados. "Monitorear la
ubicación del conductor durante el viaje" es un compromiso continuo.

**Implicaciones Cognitivas:**
- El Action Executor inicia el monitoreo al recibir el Commitment.
- El monitoreo termina cuando el Commitment cambia a COMPLETED, EXPIRED, o REVOKED.
- Cada ciclo de monitoreo produce un Outcome individual.
- Los Outcomes de monitoreo se agregan al Evidence Store.

**Impacto Conversacional:** El sistema mantiene compromisos extendidos en el tiempo.
El usuario no necesita recordarle al sistema que siga monitoreando.

**Verificación:** ¿El modelo trata los Commitments Monitoring como eventos
únicos en lugar de estados continuos? Si sí → violación.

---

### R-AE-021 — Ejecución de Compensation

**Enunciado:** Los Commitments de tipo Compensation (R-CM-025) ejecutan acciones
compensatorias cuando un Commitment Operacional previo falla. La ejecución de
una compensación sigue el mismo protocolo que cualquier Commitment Operacional:
Response + Operational Projection, pero con semántica de deshacer o mitigar.

**Derivación Constitucional:** R-CM-025 (Compensation — acción compensatoria ante
fallo); R-CM-005 (Compensation como subtipo operacional); CP-39 (Compensation —
acciones fallidas requieren compensación).

**Justificación:** La compensación no es opcional. Si un Commitment Operacional
falla y existe una compensación definida, debe ejecutarse.

**Implicaciones Cognitivas:**
- La compensación se ejecuta inmediatamente después del Outcome FAILURE.
- La compensación tiene su propio Commitment, creado por el sistema como respuesta
  al fallo.
- La compensación puede ser automática o requerir autorización humana según su
  costo de error.
- Una compensación fallida puede requerir escalación humana (R-AE-037).

**Impacto Conversacional:** Si algo sale mal, el sistema intenta corregirlo
automáticamente. El usuario ve el esfuerzo de compensación y su resultado.

**Verificación:** ¿Existe algún Commitment Operacional fallido sin una compensación
definida? Si sí → puede ser aceptable solo si el Commitment no requiere compensación
(según su definición).

---

### R-AE-022 — No ejecución por expiración o revocación

**Enunciado:** Si un Commitment expira (R-CM-009, R-CM-014) o es revocado (R-CM-024)
antes de que el Action Executor pueda ejecutarlo, el Executor no ejecuta ninguna
acción. Registra un Outcome CANCELLED con causa "expired" o "revoked" y cierra el
ciclo.

**Derivación Constitucional:** R-CM-014 (Expiración — el Commitment expira si no se
ejecuta a tiempo); R-CM-024 (Revocación — el Commitment puede ser revocado).

**Justificación:** Ejecutar un Commitment expirado o revocado sería una violación
operacional. El sistema no debe actuar sobre obligaciones que ya no existen.

**Implicaciones Cognitivas:**
- El Action Executor verifica estado ACTIVE antes de ejecutar (R-AE-007).
- Si el estado cambió entre la recepción y la ejecución, no ejecuta.
- El Outcome registra la causa de no-ejecución.
- La no-ejecución no requiere compensación (el Commitment expiró o fue revocado
  por causas válidas).

**Impacto Conversacional:** El sistema no ejecuta acciones obsoletas. Si un
compromiso expira, el usuario es notificado.

**Verificación:** ¿El Action Executor ejecuta Commitments no ACTIVE? Si sí → violación.

---

## V. Generación de Response

### R-AE-023 — El Response es semántico, no formateado

**Enunciado:** El Action Executor produce Responses semánticos: contenido con
intención comunicativa, pero sin formato específico de canal. El formato lo aplica
el Channel Adapter (CHANNEL_ADAPTER.md). El Response incluye:

| Componente | Descripción |
|------------|-------------|
| **Contenido** | Qué decir (mensaje, datos, preguntas) |
| **Intención comunicativa** | CONFIRMAR, PREGUNTAR, INFORMAR, NOTIFICAR_ERROR, ESCALAR |
| **Referencia** | ID del Commitment y Decisión que originan el Response |
| **Destino** | Usuario o canal destino (semántico, no técnico) |
| **Urgencia** | Normal, Alta (para notificaciones críticas) |

**Derivación Constitucional:** R-CA-015 (Action Executor → Channel Adapter contract —
el Executor produce contenido semántico, no formato); CP-31 (Channel Adaptation —
el mensaje se adapta al canal pero el contenido lo define el Executor).

**Justificación:** Separar contenido de formato permite que el mismo Response se
entregue por múltiples canales sin que el Action Executor conozca los detalles
de cada canal.

**Implicaciones Cognitivas:**
- El Action Executor no sabe si el Response irá por WhatsApp, web, SMS, o email.
- El Action Executor no incluye emojis, negritas, colores, ni formatos.
- El Action Executor no decide el tono — eso es responsabilidad del Channel Adapter.
- El Action Executor solo decide qué decir y con qué intención.

**Impacto Conversacional:** El mensaje es el mismo en todos los canales, pero
adaptado a cada uno. La experiencia es consistente.

**Verificación:** ¿El Response incluye formato específico de canal? Si sí → violación.

---

### R-AE-024 — Response debe ser comprensible sin contexto externo

**Enunciado:** El Response debe ser autocontenido: el usuario debe poder entenderlo
sin necesidad de consultar otra fuente. Esto significa que el Response debe incluir
suficiente contexto para que el mensaje sea interpretable por sí mismo.

**Derivación Constitucional:** P-I4 (Transparency and Explainability — el sistema
debe ser transparente); CP-35 (Explanation before Action — la explicación debe ser
completa).

**Justificación:** Un Response que requiere contexto externo para ser interpretado
genera confusión y fricción. El usuario no debería tener que preguntar "¿a qué
viaje te refieres?"

**Implicaciones Cognitivas:**
- El Response incluye referencias contextuales (ej.: ID de viaje) cuando es necesario.
- El Response no asume conocimiento previo del usuario más allá del contexto inmediato.
- El Response usa el mismo lenguaje y términos que el usuario usó en su Signal.

**Impacto Conversacional:** El usuario siempre entiende el mensaje del sistema sin
tener que adivinar el contexto.

**Verificación:** ¿Existe algún Response que requiera información no incluida para
ser interpretado? Si sí → violación.

---

### R-AE-025 — Response de confirmación para Commitments Operacionales

**Enunciado:** Para todo Commitment Operacional, el Action Executor genera un Response
de confirmación que incluye:
- Qué acción se va a ejecutar
- En qué consiste la acción (parámetros relevantes)
- Qué impacto tendrá para el usuario
- Cuándo ocurrirá (plazo estimado)
- Cómo puede el usuario cancelar o modificar

**Derivación Constitucional:** R-CM-017 (Informativo vs. Operacional — el operacional
requiere confirmación); R-CM-018 (Informative confirmation — el sistema confirma antes
de actuar); R-CM-020 (Explicación antes de acción).

**Justificación:** La confirmación no es un lujo — es un derecho del usuario y un
mecanismo de seguridad. El usuario debe poder verificar que el sistema interpretó
correctamente su intención.

**Implicaciones Cognitivas:**
- La confirmación se genera antes de la ejecución operacional.
- La confirmación incluye los parámetros clave de la acción.
- La confirmación no incluye promesas que el sistema no pueda cumplir.
- La confirmación ofrece un mecanismo explícito de cancelación.

**Impacto Conversacional:** El usuario sabe exactamente qué va a pasar, cuándo,
y cómo detenerlo si es necesario.

**Verificación:** ¿Existe algún Commitment Operacional cuya confirmación no incluya
los elementos requeridos? Si sí → violación.

---

### R-AE-026 — Response de error

**Enunciado:** Cuando la ejecución de un Commitment Operacional falla, el Action
Executor genera un Response de error que incluye:
- Qué acción falló
- Por qué falló (causa)
- Qué consecuencias tiene el fallo
- Qué compensación se ejecutó o se va a ejecutar (si aplica)
- Qué debe hacer el usuario (si algo)

**Derivación Constitucional:** R-CM-025 (Compensation — los fallos requieren
compensación); CP-39 (Compensation); R-CM-020 (Explicación — también aplica a fallos).

**Justificación:** Los fallos son inevitables. Lo importante es que el usuario sepa
qué pasó, por qué, y qué sigue. Ocultar fallos destruye la confianza.

**Implicaciones Cognitivas:**
- El Response de error se genera inmediatamente después del Outcome FAILURE.
- El Response de error es honesto: no minimiza ni exagera el fallo.
- El Response de error incluye el plan de compensación o escalación.
- El Response de error no incluye disculpas ficticias ("lo sentimos") — solo hechos.

**Impacto Conversacional:** El usuario recibe comunicación honesta y útil ante
fallos. Sabe qué pasó y qué esperar.

**Verificación:** ¿Existe algún fallo de ejecución que no genere un Response de error?
Si sí → violación.

---

## VI. Observación y Registro de Outcomes

### R-AE-027 — Outcome es la observación del resultado de la acción

**Enunciado:** El Outcome es la observación (por parte del sistema) del resultado
de una acción ejecutada. No es la acción misma ni el Commitment — es la evidencia
de lo que ocurrió después de la acción. Ontológicamente, el Outcome es un tipo de
Evidence (EVIDENCE_MODEL.md) que describe el resultado de una ejecución.

**Derivación Constitucional:** SYSTEM_VOCABULARY.md §12.3 (Outcome como resultado observable
de la acción); R-CM-038 (Outcome feedback — el resultado de la ejecución se registra
como Evidence); R-DM-026 (Outcome feedback loop — el outcome retroalimenta el modelo).

**Justificación:** Sin Outcomes, el sistema no sabría si sus acciones tuvieron el
efecto deseado. El Outcome es el cierre del ciclo cognitivo.

**Implicaciones Cognitivas:**
- El Outcome se genera después de la ejecución de la acción.
- El Outcome es inmutable una vez registrado.
- El Outcome es un tipo de Evidence con esquema propio.
- El Outcome retroalimenta el sistema: calibración de certidumbre, costo de error,
  y aprendizaje.

**Impacto Conversacional:** El sistema aprende de sus acciones. Cada acierto y cada
error mejoran el servicio futuro.

**Verificación:** ¿Existe alguna acción ejecutada cuyo Outcome no se registre? Si sí →
violación.

---

### R-AE-028 — Estados de Outcome

**Enunciado:** El Outcome puede tener los siguientes estados:

| Estado | Significado |
|--------|-------------|
| **SUCCESS** | La acción se ejecutó correctamente y produjo el efecto esperado |
| **FAILURE** | La acción se ejecutó pero no produjo el efecto esperado, o falló durante la ejecución |
| **PARTIAL** | La acción se ejecutó parcialmente: algunos efectos se lograron, otros no |
| **CANCELLED** | La acción no se ejecutó porque el Commitment fue cancelado, expiró, o fue revocado antes de la ejecución |
| **PENDING_OUTCOME** | La acción se ejecutó pero el resultado aún no puede observarse (ej.: monitoreo en curso) |

**Derivación Constitucional:** R-CM-038 (Estados definidos en el outcome feedback);
SYSTEM_VOCABULARY.md §12.3 (Outcome como resultado observable).

**Justificación:** Cuatro estados binarios no capturan la riqueza de los resultados
posibles. PARTIAL captura ejecuciones parcialmente exitosas. PENDING_OUTCOME captura
acciones cuyo resultado no es inmediato.

**Implicaciones Cognitivas:**
- PENDING_OUTCOME es transitorio — eventualmente debe migrar a otro estado.
- PARTIAL requiere detalle: qué partes funcionaron y cuáles no.
- FAILURE requiere causa: tipo de error, mensaje, contexto.
- SUCCESS requiere confirmación: qué evidencia confirma el éxito.

**Impacto Conversacional:** El sistema distingue entre "no pasó nada" (FAILURE),
"pasó a medias" (PARTIAL), "pasó todo bien" (SUCCESS), y "todavía no sabemos"
(PENDING_OUTCOME). Esto permite comunicación precisa.

**Verificación:** ¿Existe algún Outcome sin estado o con un estado no definido?
Si sí → violación.

---

### R-AE-029 — Estructura del Outcome

**Enunciado:** Cada registro de Outcome debe incluir:

| Componente | Descripción |
|------------|-------------|
| **ID del Outcome** | Identificador único |
| **ID del Commitment** | Referencia al Commitment ejecutado |
| **ID de la Decisión** | Referencia a la Decisión que originó el Commitment |
| **Estado** | SUCCESS, FAILURE, PARTIAL, CANCELLED, PENDING_OUTCOME |
| **Timestamp de ejecución** | Cuándo se ejecutó la acción |
| **Timestamp de observación** | Cuándo se observó el resultado |
| **Tipo de acción** | Response u Operational Projection |
| **Métricas** | Tiempo de ejecución, costo real, satisfacción (si disponible) |
| **Error** | Si FAILURE: tipo, mensaje, contexto |
| **Evidencia de corrección** | Si SUCCESS: qué confirma el éxito |
| **Detalle parcial** | Si PARTIAL: qué funcionó y qué no |

**Derivación Constitucional:** R-CM-038 (Estructura del outcome feedback);
R-DM-026 (Outcome feedback loop); EVIDENCE_MODEL.md (esquema de Evidence).

**Justificación:** Un Outcome sin estructura no es útil para aprendizaje. La
estructura garantiza que el sistema puede aprender de cada resultado.

**Implicaciones Cognitivas:**
- El Outcome se registra inmediatamente después de la observación.
- El Outcome es inmutable.
- El Outcome se almacena como Evidence en el Evidence Store.
- El Outcome es recuperable por ID de Commitment o Decisión.

**Impacto Conversacional:** El sistema genera datos estructurados que permiten
mejora continua. El usuario se beneficia de un sistema que aprende.

**Verificación:** ¿Algún Outcome carece de los componentes requeridos? Si sí →
violación.

---

### R-AE-030 — El Outcome retroalimenta el sistema

**Enunciado:** Después de registrar el Outcome, el sistema lo usa para retroalimentar:
- La Confidence de las fuentes que contribuyeron a la decisión
- La calibración de certidumbre (CERTAINTY_CALCULUS.md)
- La estimación de Costo de Error (DECISION_MODEL.md)
- El aprendizaje de patrones (KNOWLEDGE_MODEL.md)
- La Episodic Memory (SYSTEM_VOCABULARY.md §11.4)

**Derivación Constitucional:** R-DM-026 (Outcome feedback loop — el outcome
retroalimenta el modelo); CP-37 (Feedback by Outcome — el outcome retroalimenta
el sistema); R-CM-038 (Outcome feedback — el outcome retroalimenta Confidence,
calibración, y costo de error).

**Justificación:** El Outcome cierra el ciclo de aprendizaje. Sin retroalimentación,
el sistema no mejora. Los Outcomes negativos tienen mayor peso que los positivos
(principio de asimetría epistémica).

**Implicaciones Cognitivas:**
- La retroalimentación es asíncrona (ocurre después del ciclo actual).
- Los Outcomes SUCCESS refuerzan las fuentes utilizadas.
- Los Outcomes FAILURE debilitan las fuentes y recalibran la certidumbre.
- Los Outcomes FAILURE tienen mayor peso que los SUCCESS.
- La retroalimentación no bloquea el siguiente ciclo cognitivo.

**Impacto Conversacional:** El sistema mejora con la experiencia. Cada interacción
es una oportunidad de aprendizaje.

**Verificación:** ¿Existe algún Outcome registrado que no retroalimente ningún
modelo del sistema? Si sí → violación.

---

### R-AE-031 — Outcomes no observables

**Enunciado:** Algunas acciones tienen Outcomes que no son directamente observables
por el sistema en el momento de la ejecución. Ejemplos:
- El conductor recibió el despacho pero no responde (Outcome incierto)
- El precio se confirmó pero el usuario no confirmó la aceptación
- La acción se ejecutó en un sistema externo sin confirmación de recepción

En estos casos, el Outcome se registra como PENDING_OUTCOME hasta que se reciba
confirmación o expire el plazo de observación.

**Derivación Constitucional:** R-CM-038 (Outcome — el resultado puede no estar
disponible inmediatamente); SYSTEM_VOCABULARY.md §12.3 (Outcomes son observables pero no
siempre disponibles inmediatamente).

**Justificación:** Forzar un Outcome definitivo cuando no hay suficiente información
es peor que admitir incertidumbre. PENDING_OUTCOME es honesto epistemológicamente.

**Implicaciones Cognitivas:**
- PENDING_OUTCOME tiene un plazo de observación (timeout).
- Si el plazo expira sin confirmación, PENDING_OUTCOME migra a FAILURE (por omisión).
- Si llega confirmación tardía, PENDING_OUTCOME migra al estado correspondiente.
- El sistema no puede usar Outcomes PENDING para aprender — espera resolución.

**Impacto Conversacional:** El sistema es honesto sobre lo que sabe y lo que no sabe.
"No sabemos si el conductor recibió el mensaje" es mejor que "conductor notificado"
cuando no hay confirmación.

**Verificación:** ¿El sistema registra Outcomes definitivos cuando no tiene
confirmación? Si sí → violación (debe usar PENDING_OUTCOME).

---

### R-AE-032 — Outcome aggregation para Monitoreo

**Enunciado:** Los Commitments de tipo Monitoring (R-AE-020) producen múltiples
Outcomes a lo largo de su vida. Cada ciclo de monitoreo produce un Outcome individual.
Los Outcomes de monitoreo se agregan como una secuencia vinculada al mismo Commitment.

**Derivación Constitucional:** R-CM-005 (Monitoring como subtipo); R-CM-038 (Outcome
feedback — cada resultado se registra como Evidence).

**Justificación:** El monitoreo produce una serie temporal de Outcomes. Cada punto
es valioso individualmente, pero la serie completa tiene valor agregado para
aprendizaje y detección de patrones.

**Implicaciones Cognitivas:**
- Cada Outcome de monitoreo es independiente pero vinculado al Commitment.
- La secuencia completa permite detectar tendencias.
- Los Outcomes de monitoreo pueden ser SUCCESS (monitoreo funcionando) o FAILURE
  (monitoreo interrumpido).
- El Commitment se completa cuando termina la condición de monitoreo.

**Impacto Conversacional:** El sistema mantiene compromisos continuos y reporta
resultados periódicos. El usuario sabe que el sistema sigue "vigilando."

**Verificación:** ¿Los Outcomes de Monitoreo se tratan como eventos individuales
sin vinculación entre sí? Si sí → violación (deben formar una secuencia).

---

## VII. Manejo de Errores y Compensación

### R-AE-033 — Fallo operacional no es fallo epistémico

**Enunciado:** Un Outcome FAILURE de una Operational Projection es un fallo
operacional, no un fallo epistémico. No significa que la decisión fue incorrecta
— significa que la ejecución encontró obstáculos en el mundo real. El sistema
no debe retroactivamente invalidar la decisión por un fallo operacional.

**Derivación Constitucional:** R-CM-025 (Compensation — la compensación corrige el
fallo operacional, no la decisión); R-DM-026 (Outcome feedback — el outcome
retroalimenta pero no invalida la decisión).

**Justificación:** Confundir fallo operacional con fallo epistémico lleva a que el
sistema pierda confianza en decisiones correctas. Si el conductor canceló después
de ser despachado, la decisión de despachar fue correcta — el fallo fue operacional.

**Implicaciones Cognitivas:**
- El Outcome FAILURE se registra como hecho operacional, no como error de decisión.
- La retroalimentación al modelo de decisión es indirecta: el fallo puede indicar
  que ciertos supuestos eran incorrectos (ej.: confiabilidad del conductor).
- El sistema no revoca automáticamente la decisión por un Outcome FAILURE.
- La compensación (R-AE-021) maneja las consecuencias operacionales.

**Impacto Conversacional:** El sistema distingue entre "me equivoqué" y "algo salió
mal." El usuario recibe explicaciones precisas sobre la naturaleza del fallo.

**Verificación:** ¿El sistema trata Outcomes FAILURE como invalidación automática de
la decisión que originó el Commitment? Si sí → violación.

---

### R-AE-034 — Aborto seguro de ejecución

**Enunciado:** Si durante la ejecución de una Operational Projection ocurre un
evento que hace imposible continuar (ej.: el Commitment expira, el recurso
desaparece, el sistema externo falla irreversiblemente), el Action Executor debe:
1. Detener la ejecución en curso
2. Registrar Outcome FAILURE con causa específica
3. Determinar si la acción tiene efectos parciales que requieren compensación
4. Si hay efectos parciales, registrar PARTIAL en lugar de FAILURE
5. Ejecutar compensación si está definida

**Derivación Constitucional:** R-CM-025 (Compensation — acciones fallidas requieren
compensación); CP-39 (Compensation); R-CM-014 (Expiración durante ejecución).

**Justificación:** Continuar una ejecución que ya no es viable puede causar daños
mayores. El aborto seguro es una protección.

**Implicaciones Cognitivas:**
- El aborto es una decisión ejecutiva (el Action Executor decide abortar).
- El aborto no es una decisión cognitiva — es una respuesta a condiciones
  operacionales imposibles.
- El aborto registra el estado de la ejecución hasta el punto de fallo.
- Si hay efectos parciales, el sistema debe compensarlos.

**Impacto Conversacional:** Si algo sale mal durante la ejecución, el sistema detiene
la acción de manera segura y reporta qué pasó y qué se hizo para mitigarlo.

**Verificación:** ¿El Action Executor tiene algún mecanismo para abortar ejecuciones
en curso? Si no → violación. ¿Aborta sin registrar causa? Si sí → violación.

---

### R-AE-035 — Compensación automática

**Enunciado:** Si un Commitment Operacional falla (Outcome FAILURE o PARTIAL) y
existe una compensación definida para ese subtipo, el Action Executor ejecuta
la compensación automáticamente, sin necesidad de un nuevo Ciclo Cognitivo completo.
La compensación usa el mismo Commitment original como autorización.

**Derivación Constitucional:** R-CM-025 (Compensation — la compensación es una
acción automática); R-CM-005 (Compensation como subtipo — la compensación está
definida por subtipo).

**Justificación:** Esperar un nuevo Ciclo Cognitivo para la compensación introduce
latencia innecesaria. La compensación está pre-aprobada por el tipo de Commitment.

**Implicaciones Cognitivas:**
- La compensación no requiere nueva Decisión — la autorización viene del Commitment
  original.
- La compensación tiene su propio Outcome (SUCCESS, FAILURE, o PARTIAL).
- Si la compensación falla, se registra Outcome FAILURE de compensación y se escala.
- La compensación es específica del subtipo: un fallo de Dispatch puede requerir
  reasignar conductor; un fallo de TripCreation puede requerir notificar al usuario.

**Impacto Conversacional:** El sistema responde automáticamente a fallos. El usuario
ve la compensación como parte de la respuesta normal del sistema, no como un error
adicional.

**Verificación:** ¿Existe algún Commitment Operacional fallido cuya compensación
definida no se ejecute automáticamente? Si sí → violación.

---

### R-AE-036 — Compensación manual (escalación)

**Enunciado:** Si la compensación automática falla, o si el Commitment Operacional
tiene un costo de error que supera el umbral de autonomía del sistema (§5.2 de
CONSTITUTION.md), la compensación se convierte en escalación humana. El Action
Executor genera un Response de escalación y registra el caso para intervención
humana.

**Derivación Constitucional:** R-CM-022 (Escalamiento por insuficiencia — si el
sistema no puede manejar la situación, escala); R-CM-023 (Escalation package —
la escalación incluye contexto completo); CONSTITUTION.md §5.2 (Límites de
autoridad autónoma).

**Justificación:** Algunas compensaciones requieren juicio humano. El sistema no
debe ejecutar compensaciones que excedan su autoridad.

**Implicaciones Cognitivas:**
- La escalación se activa automáticamente si la compensación automática falla.
- La escalación incluye: Commitment original, Outcome FAILURE, compensación intentada,
  resultado de la compensación, y contexto completo.
- La escalación es un Commitment Informativo (informar al humano) + Operational
  (esperar acción humana).
- El sistema espera la acción humana para resolver la escalación.

**Impacto Conversacional:** Para casos complejos, un humano toma el control. El
usuario no queda en un vacío operacional.

**Verificación:** ¿Existe alguna compensación fallida que no escale a un humano?
Si sí → violación (a menos que el Commitment explícitamente no requiera escalación).

---

### R-AE-037 — Recuperación post-fallo

**Enunciado:** Después de un Outcome FAILURE o PARTIAL, el sistema debe intentar
recuperar la consistencia operacional. La recuperación incluye:
1. Registrar el Outcome con todos sus detalles
2. Ejecutar compensación automática o por escalación
3. Si la compensación es exitosa: el Commitment original se marca como COMPENSATED
4. Si la compensación falla: escalación humana con estado COMPENSATION_FAILED
5. Actualizar la Proyección para reflejar el nuevo estado operacional

**Derivación Constitucional:** R-CM-025 (Compensation — transición a COMPENSATED);
R-CM-008 (Estados — COMPENSATED y COMPENSATION_FAILED son salidas válidas); CP-39
(Compensation — la recuperación es obligatoria).

**Justificación:** La recuperación no es opcional. Un fallo sin recuperación deja
al sistema en un estado inconsistente (ej.: viaje creado pero sin conductor asignado).

**Implicaciones Cognitivas:**
- La recuperación ocurre en el mismo ciclo cognitivo.
- La recuperación actualiza la Proyección inmediatamente.
- La recuperación puede ser parcial: el sistema compensa lo que puede y escala lo
  que no puede.
- La recuperación se registra como una secuencia de eventos (Outcome de acción
  original → Outcome de compensación → Outcome de escalación).

**Impacto Conversacional:** El sistema nunca deja una operación inconsistente.
Siempre hay un plan de recuperación, aunque sea "esperar instrucciones humanas."

**Verificación:** ¿Existe algún Outcome FAILURE sin un plan de recuperación
asociado? Si sí → violación.

---

## VIII. Invariantes

### I-AE-001 — Sin Commitment no hay acción

**Enunciado:** Toda acción ejecutada debe corresponder exactamente a un Commitment
ACTIVE. Es la invariancia fundamental del Action Executor.

**Verificación:** Si el Action Executor ejecuta una acción sin Commitment ACTIVE,
el sistema está en estado inválido.

**Fuente:** R-CM-045, CP-01, R-AE-003.

---

### I-AE-002 — El Executor no decide

**Enunciado:** El Action Executor no puede tomar ninguna decisión que modifique el
curso de acción basado en evaluación epistémica. Solo puede abortar por causas
operacionales (imposibilidad de ejecución).

**Verificación:** Si el Action Executor rechaza un Commitment por causas epistémicas
(ej.: "creo que esta decisión es incorrecta"), el sistema está en estado inválido.

**Fuente:** R-CA-010, CP-38, R-AE-002.

---

### I-AE-003 — La Proyección es siempre derivada

**Enunciado:** La Operational Projection debe ser siempre una función determinista
de los Commitments ACTIVE. No puede tener estado independiente.

**Verificación:** Si la Proyección difiere del estado de los Commitments ACTIVE,
el sistema está en estado inválido.

**Fuente:** R-CM-039, R-CM-040, R-AE-011.

---

### I-AE-004 — El Outcome siempre se registra

**Enunciado:** Toda acción ejecutada produce un Outcome, y todo Outcome se registra
como Evidence. No puede haber acciones sin Outcome registrado.

**Verificación:** Si existe una acción ejecutada sin Outcome en el Evidence Store,
el sistema está en estado inválido.

**Fuente:** R-CM-038, R-DM-026, R-AE-027.

---

### I-AE-005 — El Outcome es inmutable

**Enunciado:** Una vez registrado, el Outcome no puede modificarse. Ni su estado,
ni sus componentes, ni sus referencias. Las correcciones se hacen mediante nuevos
Outcomes que referencian al anterior.

**Verificación:** Si existe alguna operación que modifique un Outcome registrado,
el sistema está en estado inválido.

**Fuente:** R-CM-038 (inmutable), S-P5, R-AE-027.

---

### I-AE-006 — Compensación completa o escalación

**Enunciado:** Todo Outcome FAILURE debe tener una compensación asociada (automática
o por escalación). No puede haber un FAILURE sin compensación definida para su
subtipo.

**Verificación:** Si existe un Outcome FAILURE sin compensación definida o intentada,
el sistema está en estado inválido (excepto para subtipos que explícitamente no
requieren compensación).

**Fuente:** R-CM-025, CP-39, R-AE-035, R-AE-036.

---

### I-AE-007 — Response antes de operación

**Enunciado:** Para Commitments Operacionales, el Response debe generarse antes de
que la Operational Projection comience su ejecución. Puede haber Response sin
Operational Projection, pero no Operational Projection sin Response para acciones
que afectan al usuario.

**Verificación:** Si existe una Operational Projection que afecta al usuario cuyo
Response no fue generado antes de la ejecución, el sistema está en estado inválido.

**Fuente:** CP-35, R-CM-018, R-CM-020, R-AE-018.

---

## IX. Delegación a Documentos de Implementación

### 9.1 Documentos que concretizan este modelo

| Documento | Qué concreta |
|-----------|-------------|
| **08-CHANNEL_ADAPTER.md** (Level III-e) | Formateo de Response por canal, entrega de mensajes, manejo de canales múltiples |
| **ACTION_EXECUTOR implementation** (Level IV) | Conectores a sistemas externos (despacho, pricing, viajes), ejecución técnica de Operational Projection, mecanismo de compensación técnica, registro de Outcomes, manejo de timeouts y reintentos |

### 9.2 Trazabilidad de reglas

| Regla | Fuente CP | Fuente CONSTITUTION | Fuente COMMITMENT_MODEL | Fuente COGNITIVE_ARCHITECTURE | Fuente ONTOLOGY |
|-------|-----------|-------------------|------------------------|------------------------------|-----------------|
| R-AE-001 | CP-38 | — | R-CM-001 | R-CA-010 | §12.1 |
| R-AE-002 | CP-38 | — | — | R-CA-010 | — |
| R-AE-003 | CP-01 | — | R-CM-045 | — | §12.1 |
| R-AE-004 | — | — | — | — | §8.2, §12.1, §12.3 |
| R-AE-005 | — | — | — | R-CA-012, R-CA-015 | §8.3, §12.1.1 |
| R-AE-006 | — | — | R-CM-037 | R-CA-014, IP-3 | — |
| R-AE-007 | — | — | R-CM-014, R-CM-024, R-CM-037 | — | — |
| R-AE-008 | — | — | R-CM-017, R-CM-028 | — | — |
| R-AE-009 | — | — | R-CM-002, R-CM-005 | — | — |
| R-AE-010 | — | — | R-CM-003, R-CM-005 | R-CA-015 | — |
| R-AE-011 | CP-27, CP-28 | — | R-CM-039, R-CM-040 | — | §8.3 |
| R-AE-012 | — | — | R-CM-008, R-CM-039, R-CM-040 | — | — |
| R-AE-013 | — | — | R-CM-005, R-CM-036 | — | — |
| R-AE-014 | — | — | — | R-CA-012 | §8.3 |
| R-AE-015 | CP-28 | — | R-CM-040 | R-CA-010 | — |
| R-AE-016 | — | — | — | R-CA-012, R-CA-015 | §12.1.1 |
| R-AE-017 | — | — | R-CM-005 | — | §8.3, §12.1 |
| R-AE-018 | CP-35 | — | R-CM-018, R-CM-020 | — | — |
| R-AE-019 | — | — | R-CM-002 | R-CA-012 | — |
| R-AE-020 | — | — | R-CM-005, R-CM-008 | — | — |
| R-AE-021 | CP-39 | — | R-CM-005, R-CM-025 | — | — |
| R-AE-022 | — | — | R-CM-014, R-CM-024 | — | — |
| R-AE-023 | CP-31 | — | — | R-CA-015 | — |
| R-AE-024 | — | P-I4 | — | — | — |
| R-AE-025 | — | — | R-CM-017, R-CM-018, R-CM-020 | — | — |
| R-AE-026 | CP-39 | — | R-CM-020, R-CM-025 | — | — |
| R-AE-027 | CP-37 | — | R-CM-038 | — | §12.3 |
| R-AE-028 | — | — | R-CM-038 | — | §12.3 |
| R-AE-029 | — | P-I5 | R-CM-038 | — | — |
| R-AE-030 | CP-37 | — | R-CM-038 | — | — |
| R-AE-031 | — | — | R-CM-038 | — | §12.3 |
| R-AE-032 | — | — | R-CM-005, R-CM-038 | — | — |
| R-AE-033 | — | — | R-CM-025 | — | — |
| R-AE-034 | CP-39 | — | R-CM-014, R-CM-025 | — | — |
| R-AE-035 | CP-39 | — | R-CM-005, R-CM-025 | — | — |
| R-AE-036 | — | §5.2 | R-CM-022, R-CM-023 | — | — |
| R-AE-037 | CP-39 | — | R-CM-008, R-CM-025 | — | — |
| I-AE-001 | CP-01 | — | R-CM-045 | — | — |
| I-AE-002 | CP-38 | — | — | R-CA-010 | — |
| I-AE-003 | CP-27, CP-28 | — | R-CM-039, R-CM-040 | — | — |
| I-AE-004 | CP-37 | P-I5 | R-CM-038 | — | — |
| I-AE-005 | — | S-P5 | R-CM-038 | — | — |
| I-AE-006 | CP-39 | — | R-CM-025 | — | — |
| I-AE-007 | CP-35 | — | R-CM-018, R-CM-020 | — | — |

---

## Apéndice — Resumen de Delegaciones Recibidas

### Desde COGNITIVE_PRINCIPLES.md (§13.2):

| CP | Principio | Concretizado por |
|----|-----------|------------------|
| CP-01 | Evidence-Based Operation | R-AE-003, I-AE-001 |
| CP-31 | Channel Adaptation | R-AE-023 |
| CP-35 | Explanation before Action | R-AE-018, R-AE-025, I-AE-007 |
| CP-37 | Feedback by Outcome | R-AE-027, R-AE-030, I-AE-004 |
| CP-38 | Action Delegation | R-AE-001, R-AE-002, I-AE-002 |
| CP-39 | Compensation | R-AE-021, R-AE-026, R-AE-033, R-AE-034, R-AE-035, R-AE-037, I-AE-006 |

### Desde COMMITMENT_MODEL.md (§21.1):

| Regla | Tópico | Concretizado por |
|-------|--------|------------------|
| R-CM-001 | Nature of Commitment | R-AE-001 |
| R-CM-002 | Informativo | R-AE-009, R-AE-019 |
| R-CM-003 | Operacional | R-AE-010 |
| R-CM-005 | Subtipo ontológico | R-AE-009, R-AE-010, R-AE-013, R-AE-017, R-AE-020, R-AE-021, R-AE-032, R-AE-035 |
| R-CM-008 | Lifecycle states | R-AE-012, R-AE-020, R-AE-037 |
| R-CM-014 | Expiración | R-AE-007, R-AE-022, R-AE-034 |
| R-CM-017 | Prioridad | R-AE-008, R-AE-025 |
| R-CM-018 | Confirmación informativa | R-AE-018, R-AE-025, I-AE-007 |
| R-CM-019 | Ejecución de escalación | (delegado a CHANNEL_ADAPTER) |
| R-CM-020 | Explicación antes de acción | R-AE-018, R-AE-025, R-AE-026, I-AE-007 |
| R-CM-022 | Escalamiento | R-AE-036 |
| R-CM-023 | Paquete de escalación | R-AE-036 |
| R-CM-024 | Revocación | R-AE-007, R-AE-022 |
| R-CM-025 | Compensación | R-AE-021, R-AE-033, R-AE-034, R-AE-035, R-AE-037, I-AE-006 |
| R-CM-028 | Precedencia | R-AE-008 |
| R-CM-036 | Costos de error por subtipo | R-AE-013 |
| R-CM-037 | Commitment → Action Executor | R-AE-006, R-AE-007 |
| R-CM-038 | Outcome feedback | R-AE-027, R-AE-028, R-AE-029, R-AE-030, R-AE-031, R-AE-032, I-AE-004, I-AE-005 |
| R-CM-039 | Proyección deriva de Commitments | R-AE-011, R-AE-012, I-AE-003 |
| R-CM-040 | Proyección de solo lectura | R-AE-011, R-AE-015, I-AE-003 |
| R-CM-045 | No action without Commitment | R-AE-003, I-AE-001 |

### Desde COGNITIVE_ARCHITECTURE.md (§14):

| Regla | Tópico | Concretizado por |
|-------|--------|------------------|
| R-CA-010 | Action Executor responsibility | R-AE-001, R-AE-002, R-AE-015, I-AE-002 |
| R-CA-012 | Projection Outputs | R-AE-005, R-AE-014, R-AE-016, R-AE-019 |
| R-CA-014 | Commitment Gate → Action Executor | R-AE-006 |
| R-CA-015 | Action Executor → Channel Adapter | R-AE-005, R-AE-010, R-AE-016, R-AE-023 |
| IP-3 | Commitment Handoff | R-AE-006 |
| IP-4 | Response Handoff | R-AE-023 |

---

*Fin de 09-ACTION_EXECUTOR.md — Versión 1.0-draft — 37 reglas (R-AE-001 a R-AE-037), 7 invariantes (I-AE-001 a I-AE-007)*

> Este documento fue redactado a partir de la delegación constitucional de
> COGNITIVE_PRINCIPLES.md (CP-01, CP-31, CP-35, CP-37, CP-38, CP-39), los contratos
> de COMMITMENT_MODEL.md (R-CM-001 a R-CM-045), COGNITIVE_ARCHITECTURE.md
> (R-CA-010 a R-CA-015), DECISION_MODEL.md (R-DM-025, R-DM-026), y la terminología
> de SYSTEM_VOCABULARY.md. Es un DRAFT hasta su ratificación mediante el proceso de gobierno
> de la Constitución (CONSTITUTION.md Sección 7.2).
