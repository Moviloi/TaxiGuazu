# AITOS Cognitive Constitution — 06-COMMITMENT_MODEL.md

> **Commitment Model of the AI Transportation Operating System**
>
> Status: **DRAFT** — first writing from Constitutional delegation
> Version: 1.0-draft
> Date: 2026-07-11
>
> ⚠️ This document belongs to **Level III-c (Contractual Authority)** of the AITOS
> Document Hierarchy (CONSTITUTION.md §6). It derives from CONSTITUTION.md (Level I-a),
> ONTOLOGY.md (Level I-b), COGNITIVE_PRINCIPLES.md (Level II-a), DECISION_MODEL.md
> (Level III-b), and EVIDENCE_MODEL.md (Level III-a).
>
> This document does not redefine any term or principle from its source documents.
> It operationalizes them. Every rule herein is binding on Level IV documents
> (source code, prompts, configuration, runbooks). Violations are implementation debt
> managed under S-P9.

---

## Table of Contents

1. [Preamble — What This Model Is](#1-preamble--what-this-model-is)
2. [Nature of a Commitment](#2-nature-of-a-commitment)
3. [Commitment Types](#3-commitment-types)
4. [Lifecycle of a Commitment](#4-lifecycle-of-a-commitment)
5. [Anatomy of a Commitment](#5-anatomy-of-a-commitment)
6. [Preconditions for Commitment](#6-preconditions-for-commitment)
7. [The Commitment Gate](#7-the-commitment-gate)
8. [Informative Commitment](#8-informative-commitment)
9. [Operational Commitment](#9-operational-commitment)
10. [Escalation Protocol](#10-escalation-protocol)
11. [Revocation Protocol](#11-revocation-protocol)
12. [Conflicts Between Commitments](#12-conflicts-between-commitments)
13. [Precedence and Consistency](#13-precedence-and-consistency)
14. [Commitment and Decision](#14-commitment-and-decision)
15. [Commitment and Certainty](#15-commitment-and-certainty)
16. [Commitment and Cost of Error](#16-commitment-and-cost-of-error)
17. [Commitment and Action Executor](#17-commitment-and-action-executor)
18. [Commitment and Projection](#18-commitment-and-projection)
19. [Persistence and Reconstruction](#19-persistence-and-reconstruction)
20. [Invariants](#20-invariants)
21. [Delegation to Implementation Documents](#21-delegation-to-implementation-documents)

---

## 1. Preamble — What This Model Is

### 1.1 Purpose

This document specifies the **Commitment Model** of AITOS: the complete normative definition
of what a Commitment is, what types exist, how it is born, how it lives, how it is
revoked or fulfilled, how conflicts between Commitments are resolved, and how a
Commitment relates to the Decision that produced it, the Certainty that justified it,
the Cost of Error it carries, and the Action Executor that materializes it.

The Commitment Model is the **safety gate** of the system. Every Commitment represents
the system's point of no return — the moment at which a Belief transforms into an
obligation. Getting Commitment wrong means dispatching drivers to wrong addresses,
confirming trips that cannot be fulfilled, or making promises the system cannot keep.

### 1.2 Scope

This document governs:

1. **What constitutes a Commitment** in AITOS — its nature, types, and anatomy.
2. **How a Commitment is created** — the gate, preconditions, and authorization chain.
3. **How a Commitment lives** — its lifecycle, states, and permitted transitions.
4. **How a Commitment ends** — fulfillment, revocation, expiration, escalation.
5. **How Commitments relate to each other** — conflict detection, precedence, consistency.
6. **How Commitments relate to other cognitive constructs** — Decisions, Certainty,
   Cost of Error, Action Executor, Projection.
7. **How Commitments are preserved and reconstructed** — persistence and recovery.

This document does **NOT** govern:

- The computation of Certainty (see CERTAINTY_CALCULUS.md).
- The computation of Cost of Error (see DECISION_MODEL.md).
- The evaluation of decision alternatives (see DECISION_MODEL.md, §3).
- The technical implementation of Action execution (see ACTION_EXECUTOR.md).
- The Evidence Store or Evidence lifecycle (see EVIDENCE_MODEL.md).

### 1.3 Authority hierarchy

| Source document | Relationship to this document |
|----------------|------------------------------|
| **CONSTITUTION.md** (Level I-a) | Source of supreme principles: S-P1 (Evidence-Based Operation), S-P7 (Human Escalation), S-P5 (Evidence Immutability), S-P6 (Knowledge Preservation), P-I4 (Humility Before Uncertainty), P-I5 (Auditability), P-E5 (Proportional Response) |
| **ONTOLOGY.md** (Level I-b) | Source of all terminology: Commitment (8.2), Decision (8.1), Cost of Error (8.3), Certainty Threshold (8.4), Strategic Posture (8.5), Operational Projection (9.2), Belief (5.2) |
| **COGNITIVE_PRINCIPLES.md** (Level II-a) | Source of cognitive principles: CP-22 (compromiso explícito), CP-23 (umbral dinámico), CP-24 (costo de error), CP-25 (informativo vs. operacional), CP-26 (escalamiento por insuficiencia), CP-35 (explicación antes de acción) |
| **DECISION_MODEL.md** (Level III-b) | Defines the Decision that produces the Commitment; source of rules R-DM-001, R-DM-003, R-DM-004, R-DM-006, R-DM-012, R-DM-016, R-DM-021, R-DM-022, R-DM-023, R-DM-024, R-DM-027, R-DM-028, R-DM-029, R-DM-030, R-DM-044, R-DM-046 |
| **EVIDENCE_MODEL.md** (Level III-a) | Defines the Evidence that feeds into Decisions and Commitments; sibling document |

### 1.4 Reading this document

Each rule in this document follows this uniform format:

```
### R-CM-NNN — Name of the rule

**Enunciado:** The normative statement.

**Derivación Constitucional:** References to CONSTITUTION.md, ONTOLOGY.md,
COGNITIVE_PRINCIPLES.md, DECISION_MODEL.md, and/or EVIDENCE_MODEL.md.

**Justificación:** Why this rule exists and what architectural problem it solves.

**Implicaciones Cognitivas:** How the system's behavior is affected.

**Impacto Conversacional:** What observable improvement this produces in the user experience.

**Verificación:** Binary criterion to determine if a change violates this rule.

**Delegación:** Which Level III or Level IV documents must concretize this rule.
```

---

## 2. Nature of a Commitment

### R-CM-001 — Definition of a Commitment

**Enunciado:** Un Commitment es un acto cognitivo explícito mediante el cual el sistema
se obliga a tratar una Belief como verdadera para propósitos operacionales. Un Commitment
transforma una creencia probabilística ("creo que el origen es Asunción con certidumbre
0.85") en una obligación ejecutable ("el sistema actuará como si el origen fuera
Asunción"). Una vez comprometido, revertir tiene un costo.

**Derivación Constitucional:** ONTOLOGY.md §8.2 (Commitment: "an irrevocable (or
costly-to-revoke) choice to treat a Belief as true for operational purposes");
CP-22 (compromiso explícito — el compromiso debe ser una transición cognitiva explícita
y consciente).

**Justificación:** La distinción entre "creer" y "comprometerse" es la diferencia entre
un sistema que piensa y un sistema que actúa. AITOS puede creer muchas cosas
simultáneamente (múltiples Hipótesis), pero debe comprometerse con una sola para actuar.
El Commitment es el puente entre la cognición y la operación. Sin un modelo explícito,
el sistema confundiría "probablemente es así" con "es así."

**Implicaciones Cognitivas:**
- Un Commitment no es una Belief — es una obligación basada en una Belief.
- Un Commitment no es una Decisión — es el resultado de una Decisión COMMIT.
- Un Commitment tiene un costo de revocación que una Belief no tiene.
- El sistema puede tener muchas Beliefs activas pero pocos Commitments activos.
- Una Belief puede existir sin Commitment; un Commitment no puede existir sin una Belief
  que lo fundamente.

**Impacto Conversacional:** El usuario distingue entre "el sistema cree algo" y "el
sistema se compromete a algo." Cuando el sistema dice "su viaje está confirmado," es
porque hubo un Commitment explícito, no porque el sistema "cree" que el viaje debería
existir. Esto genera confianza y predictibilidad.

**Verificación:** ¿Existe alguna acción operacional en el sistema que se ejecute sin que
exista un Commitment explícito que la autorice? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el gate de Commitment en el ciclo),
ACTION_EXECUTOR.md (define cómo las acciones se derivan de Commitments).

---

### R-CM-002 — Commitment is the unit of obligation

**Enunciado:** El Commitment es la unidad fundamental de obligación en AITOS. No existe
ninguna otra forma de obligación. Toda promesa, confirmación, acuerdo, o compromiso
operacional del sistema debe expresarse como un Commitment. No puede haber "obligaciones
informales" (promesas implícitas, confirmaciones no registradas, acuerdos verbales no
materializados).

**Derivación Constitucional:** S-P1 (Evidence-Based Operation — toda acción debe basarse
en evidencia; el Commitment es la evidencia de la obligación); CP-22 (compromiso explícito).

**Justificación:** Si el sistema puede generar obligaciones fuera del modelo de Commitment,
entonces hay rutas de acción que no son auditables (P-I5) ni están fundamentadas en
Evidence (S-P1). El Commitment debe ser el único mecanismo de obligación para garantizar
que toda promesa del sistema está registrada, trazable, y fundamentada.

**Implicaciones Cognitivas:**
- Toda comunicación que implique una obligación ("le envío un conductor," "su viaje está
  confirmado") debe corresponder a un Commitment registrado.
- No existe "decir sin comprometer" cuando lo dicho crea una obligación.
- Las expresiones corteses ("claro, con gusto") que no implican obligación no requieren
  Commitment.
- El sistema debe poder distinguir entre "informar" y "comprometerse" en su comunicación.

**Impacto Conversacional:** El usuario recibe solo promesas reales. Cuando el sistema
dice "voy a hacer algo," es porque realmente existe un Commitment registrado. No hay
casos donde el sistema "diga" una cosa y "haga" otra, porque toda comunicación que
implica obligación está respaldada por un Commitment.

**Verificación:** ¿Existe alguna comunicación del sistema que cree una expectativa
razonable en el usuario (obligación) sin que exista un Commitment registrado?
Si sí → violación.

**Delegación:** CHANNEL_ADAPTER.md (define qué expresiones constituyen obligación vs.
información), COGNITIVE_ARCHITECTURE.md (define el flujo de comunicación como reflejo
de Commitments).

---

### R-CM-003 — Commitment as a transition in the cognitive cycle

**Enunciado:** El Commitment ocurre en la transición entre la fase de Compromiso y la
fase de Proyección del Ciclo Cognitivo (ONTOLOGY.md §7.4). Es el output del Compromiso
y el input de la Proyección. No puede existir un Commitment que no haya pasado por el
Compromiso, ni una Proyección que no se base en un Commitment.

**Derivación Constitucional:** CP-01 (ciclo completo), CP-02 (secuencia estricta),
CP-22 (compromiso explícito), ONTOLOGY.md §7.4 (Commitment Phase).

**Justificación:** El Ciclo Cognitivo tiene una secuencia estricta (CP-02): Percepción →
Razonamiento → Compromiso → Proyección. El Commitment es el output de la tercera fase
y el input de la cuarta. Romper esta secuencia — proyectar sin comprometer o comprometer
sin razonar — viola la integridad del ciclo cognitivo.

**Implicaciones Cognitivas:**
- El Commitment no puede crearse antes de que el Razonamiento haya producido Beliefs
  y certidumbre.
- La Proyección no puede iniciarse sin un Commitment que la guíe.
- Si el Razonamiento no produce certidumbre suficiente, no hay Commitment y el ciclo
  debe terminar en CLARIFY, ESCALATE, o ABSTAIN.
- El Commitment es el gate que separa la cognición interna (pensar) de la acción externa
  (hacer).

**Impacto Conversacional:** El sistema no actúa sin haber "pensado" primero. El usuario
no recibe acciones que parezcan prematuras o no fundamentadas en la conversación.

**Verificación:** ¿Existe algún flujo donde una Proyección se ejecute sin que haya un
Commitment explícito del ciclo actual? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el secuenciador del ciclo, el gate
entre Compromiso y Proyección).

---

## 3. Commitment Types

### R-CM-004 — Two fundamental types: Informative and Operational

**Enunciado:** El sistema reconoce exactamente dos tipos fundamentales de Commitment,
con diferentes umbrales, consecuencias, y protocolos:

| Tipo | Definición | Ejemplo | Umbral | Reversibilidad |
|------|-----------|---------|--------|----------------|
| **Informativo** | El sistema afirma una interpretación al usuario sin ejecutar una acción irreversible | "Entendí que quieres ir al aeropuerto" | Más bajo | Reversible (el usuario corrige) |
| **Operacional** | El sistema ejecuta una acción que modifica el estado del mundo real | Crear un viaje, despachar un conductor, confirmar un pago | Más alto | Irreversible o costoso de revertir |

**Derivación Constitucional:** CP-25 (compromiso informativo vs. operacional — dos tipos
con diferentes umbrales y consecuencias); P-E5 (Proportional Response).

**Justificación:** CP-25 establece explícitamente que el sistema distingue entre
compromiso informativo y operacional con diferentes umbrales. Usar el mismo umbral para
ambos tipos llevaría a: (a) umbral demasiado alto para informativo (el sistema nunca
confirma interpretaciones, mala UX) o (b) umbral demasiado bajo para operacional (el
sistema ejecuta acciones prematuras, riesgo operacional).

**Implicaciones Cognitivas:**
- Un Commitment informativo usa el threshold de formación de creencia (más bajo).
- Un Commitment operacional usa el threshold de compromiso operacional (más alto).
- Un Commitment informativo puede convertirse en operacional en un ciclo posterior,
  cuando se acumula más Evidence.
- La transición de informativo a operacional requiere pasar por el gate de compromiso
  con el umbral más alto.
- Un Commitment informativo no puede generar acciones operacionales.

**Impacto Conversacional:** El sistema puede confirmar interpretaciones ("entendí que
quieres ir a Asunción") sin comprometerse operacionalmente ("acabo de crear el viaje").
Esto da transparencia al usuario: sabe lo que el sistema "cree" antes de que el sistema
"actúe."

**Verificación:** ¿Existe algún flujo donde un Commitment informativo genere acciones
operacionales sin pasar por un segundo gate con umbral más alto? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define los dos gates de compromiso),
DECISION_MODEL.md (define los umbrales por tipo).

---

### R-CM-005 — Subtypes of Operational Commitment

**Enunciado:** Dentro del tipo Operacional, el sistema reconoce los siguientes subtipos,
cada uno con su propio Costo de Error y protocolo de ejecución:

| Subtipo | Descripción | Ejemplo | Costo de Error característico |
|---------|-------------|---------|-------------------------------|
| **TripCreation** | Crear un nuevo viaje en el sistema operacional | Confirmar y crear un viaje | Medio (puede cancelarse antes del despacho) |
| **Dispatch** | Asignar un conductor a un viaje | Enviar conductor al origen | Alto (conductor ya está en ruta) |
| **Pricing** | Confirmar un precio al usuario | "El viaje cuesta 45.000 Gs." | Medio (puede ajustarse en casos excepcionales) |
| **Payment** | Iniciar un proceso de pago | Cobrar al usuario | Alto (transacción financiera) |
| **Modification** | Modificar un viaje existente | Cambiar destino, hora | Bajo a medio (según el cambio) |
| **Cancellation** | Cancelar un viaje existente | Cancelar viaje del usuario | Medio (pérdida de confianza, posible costo) |

**Derivación Constitucional:** CP-24 (costo de error — cada subtipo tiene su propio
costo de error); CP-25 (compromiso operacional); CONSTITUTION.md §5.2 (autoridad
autónoma — algunos subtipos pueden requerir autorización humana).

**Justificación:** No todas las acciones operacionales tienen el mismo costo de error.
Despachar un conductor es más riesgoso que modificar un destino. Cada subtipo necesita
su propio umbral dinámico (CP-23), su propio protocolo de ejecución, y su propio nivel
de autoridad autónoma.

**Implicaciones Cognitivas:**
- Cada subtipo define su propio Costo de Error (FP y FN).
- Cada subtipo define su propia reversibilidad y protocolo de revocación.
- Cada subtipo puede tener diferentes requisitos de autorización (autónomo, advisory,
  informacional según CONSTITUTION.md §5.2).
- La creación de nuevos subtipos requiere ADR y actualización de este documento.

**Impacto Conversacional:** El sistema calibra su comportamiento según el tipo de acción.
Despachar un conductor requiere más certidumbre que cotizar un precio. El usuario
experimenta un sistema que "entiende la gravedad" de cada acción.

**Verificación:** ¿Existe alguna acción operacional en el sistema que no esté clasificada
en uno de estos subtipos? Si sí → violación (requiere ADR para agregar el subtipo).

**Delegación:** DECISION_MODEL.md (define umbrales por subtipo), ACTION_EXECUTOR.md
(define el protocolo de ejecución por subtipo), COGNITIVE_ARCHITECTURE.md (define el
flujo de compromiso según subtipo).

---

### R-CM-006 — Commitment types are not hierarchical

**Enunciado:** Los dos tipos fundamentales (Informativo y Operacional) no forman una
jerarquía. Un Commitment informativo no es un "mini-commitment" ni un "pre-commitment."
Ambos son Commitments plenos, con sus propias reglas, estados, y consecuencias. La
diferencia está en el umbral, la reversibilidad, y el impacto operacional, no en la
"seriedad" del compromiso.

**Derivación Constitucional:** CP-25 (compromiso informativo vs. operacional — son
distintos, no jerárquicos).

**Justificación:** Tratar el informativo como un "pre-commitment" llevaría a tratarlo
como provisional o no vinculante, cuando en realidad es un compromiso epistémico: el
sistema está diciendo "esto es lo que creo." Un compromiso informativo es tan vinculante
en su dominio como uno operacional en el suyo.

**Implicaciones Cognitivas:**
- Ambos tipos siguen el mismo lifecycle (R-CM-007).
- Ambos tipos requieren las mismas precondiciones (R-CM-010).
- Ambos tipos se registran con la misma estructura (R-CM-008).
- La diferencia está en el umbral de entrada y en las consecuencias de la violación.
- Un Commitment informativo VIOLADO (el sistema dijo "creo que es Asunción" y no lo es)
  tiene consecuencias epistémicas (pérdida de confianza del usuario, necesidad de
  corrección). Un Commitment operacional VIOLADO tiene consecuencias operacionales.

**Impacto Conversacional:** El sistema toma ambos tipos de compromiso en serio. Cuando
dice "entendí que quieres ir al aeropuerto," es tan serio como cuando dice "tu viaje
está confirmado" — solo que el primero es más fácil de corregir.

**Verificación:** ¿Existe algún tratamiento en el sistema que degrade los Commitments
informativos a "no vinculantes" o "provisionales"? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el tratamiento igualitario de ambos
tipos en el ciclo), COMMITMENT_MODEL implementation (ambos tipos usan la misma estructura
de datos base).

---

## 4. Lifecycle of a Commitment

### R-CM-007 — Commitment lifecycle states

**Enunciado:** Todo Commitment en AITOS existe en exactamente uno de los siguientes
estados en todo momento. Las transiciones entre estados están gobernadas por reglas
explícitas.

| Estado | Significado | Entrada | Puede transicionar a |
|--------|-------------|---------|---------------------|
| **PENDING** | El sistema ha decidido COMMIT pero el Commitment aún no se ha materializado | Decisión COMMIT | ACTIVE, FAILED, VOID |
| **ACTIVE** | El Commitment está vigente y siendo ejecutado o monitoreado | Materialización exitosa | FULFILLED, SUPERSEDED, REVOKED, EXPIRED, FAILED |
| **FULFILLED** | El Commitment se ha cumplido exitosamente | Ejecución exitosa de la acción comprometida | (terminal) |
| **SUPERSEDED** | El Commitment fue reemplazado por otro Commitment más reciente o de mayor precedencia | Nueva decisión que lo reemplaza | (terminal) |
| **REVOKED** | El Commitment fue revocado por decisión explícita (usuario o sistema) | Decisión de revocación | (terminal) |
| **EXPIRED** | El Commitment excedió su ventana temporal sin cumplirse | Timeout | ESCALATION (automático si aplica), (terminal si no) |
| **FAILED** | La ejecución del Commitment falló | Error en la materialización | RETRY (si es posible), ESCALATION, (terminal) |
| **VOID** | El Commitment fue invalidado antes de producir efecto | Validación de precondiciones fallida | (terminal) |

Los estados terminales son: FULFILLED, SUPERSEDED, REVOKED, VOID. Un Commitment en
estado terminal no puede transicionar a ningún otro estado.

**Derivación Constitucional:** CP-22 (compromiso explícito — debe tener estados
identificables); CP-04 (límite temporal — EXPIRED); CP-26 (escalamiento por
insuficiencia — FAILED → ESCALATION); P-I5 (auditabilidad — todos los estados deben
registrarse).

**Justificación:** El Commitment no es un instante — es un proceso que comienza con la
decisión de comprometerse y termina con el cumplimiento o la resolución del compromiso.
Cada estado tiene reglas específicas sobre lo que puede ocurrir. Modelar estos estados
explícitamente es necesario para: (a) saber en todo momento qué compromisos están
activos, (b) poder reaccionar ante fallos, (c) auditar la historia completa del
compromiso.

**Implicaciones Cognitivas:**
- PENDING es el estado inicial de todo Commitment. Ocurre inmediatamente después de una
  Decisión COMMIT.
- La transición PENDING → ACTIVE ocurre cuando el sistema confirma que el Commitment
  puede materializarse (precondiciones de ejecución verificadas).
- ACTIVE es el estado operacional: el sistema está ejecutando o monitoreando el
  compromiso.
- EXPIRED activa el protocolo de escalamiento (S-P7) si el Commitment sigue siendo
  necesario.
- FAILED puede activar RETRY (si el error es transitorio) o ESCALATION (si es permanente).

**Impacto Conversacional:** El sistema puede informar al usuario sobre el estado de sus
compromisos: "estoy confirmando tu viaje" (PENDING), "tu viaje está confirmado" (ACTIVE),
"tu viaje se completó" (FULFILLED). El usuario nunca está en la incertidumbre sobre qué
pasó con su solicitud.

**Verificación:** ¿Existe algún Commitment en el sistema cuyo estado no esté definido
por esta máquina de estados? ¿Existe alguna transición no contemplada? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el motor de estados del Commitment),
COMMITMENT_MODEL implementation (implementa la máquina de estados).

---

### R-CM-008 — State transition rules

**Enunciado:** Las transiciones entre estados del Commitment siguen las siguientes reglas.
Toda transición debe registrarse con timestamp, razón, y referencia al evento que la
disparó.

| Transición | Disparador | Precondiciones | Acción requerida |
|------------|-----------|----------------|------------------|
| → PENDING | Decisión COMMIT (R-DM-023) | R-CM-010 (precondiciones de Commitment) | Crear registro de Commitment. Iniciar monitor de expiración. |
| PENDING → ACTIVE | Materialización exitosa | Ejecución de pre-Action exitosa (ver R-CM-031) | Marcar Commitment como activo. Iniciar ejecución operacional si aplica. |
| PENDING → FAILED | Error de materialización | Falla en pre-Action | Registrar error. Evaluar RETRY o ESCALATION. |
| PENDING → VOID | Validación fallida | Precondiciones no cumplidas después de intento | Registrar razón de invalidación. No ejecutar acción. |
| ACTIVE → FULFILLED | Ejecución exitosa | Acción completada con resultado exitoso | Registrar outcome (R-CM-034). Cerrar Commitment. |
| ACTIVE → SUPERSEDED | Nuevo Commitment de mayor precedencia (R-CM-023) | Nueva decisión que reemplaza explícitamente a la anterior | Registrar referencia al nuevo Commitment. Notificar al usuario si aplica. |
| ACTIVE → REVOKED | Decisión de revocación (R-CM-018) | R-CM-017 (revocabilidad del tipo de Commitment) | Ejecutar protocolo de revocación. Registrar razón. Notificar al usuario. |
| ACTIVE → EXPIRED | Timeout | Ventana temporal excedida (R-CM-009) | Registrar expiración. Activar escalamiento si el Commitment sigue siendo necesario. |
| ACTIVE → FAILED | Error durante ejecución | Falla en la acción operacional | Registrar error. Evaluar RETRY o ESCALATION. |
| FAILED → RETRY | Decisión de reintento | Error transitorio, reintento permitido | Reintentar materialización. Si falla de nuevo → ESCALATION. |

**Derivación Constitucional:** CP-22 (compromiso explícito — cada transición es un
evento consciente); CP-04 (límite temporal — → EXPIRED); CP-26 (escalamiento → FAILED
→ ESCALATION); CP-39 (mejora no destructiva — SUPERSEDED preserva el registro anterior);
P-I5 (auditabilidad — todas las transiciones se registran).

**Justificación:** Sin reglas de transición explícitas, la máquina de estados es
incompleta. Cada transición debe tener un disparador claro, precondiciones verificables,
y acciones requeridas. Esto garantiza que el sistema sabe exactamente qué hacer en cada
punto del lifecycle del Commitment.

**Implicaciones Cognitivas:**
- Las transiciones son automáticas (disparadas por eventos del sistema), no requieren
  decisión explícita (excepto SUPERSEDED y REVOKED, que son decisiones).
- Si una transición no puede completarse (falla el registro, falla la notificación),
  el sistema debe registrar el incidente y escalar.
- Las transiciones EXPIRED y FAILED pueden activar la creación de un nuevo Ciclo
  Cognitivo para decidir el curso de acción.

**Impacto Conversacional:** El sistema reacciona apropiadamente a cada cambio de estado.
Si un Commitment falla, el usuario recibe una explicación y una alternativa (reintento o
escalación). Si expira, el usuario recibe una notación antes de que el sistema actúe.

**Verificación:** ¿Existe alguna transición de estado en un Commitment que no tenga un
disparador, precondiciones, y acciones definidas? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el motor de transiciones),
ACTION_EXECUTOR.md (define la ejecución de acciones por transición),
COMMITMENT_MODEL implementation (implementa la máquina de estados con eventos).

---

### R-CM-009 — Commitment temporal bounds

**Enunciado:** Todo Commitment debe tener una ventana temporal máxima definida al
momento de su creación. La ventana se define como:

```
ventana_máxima = tiempo_estimado_ejecución + margen_seguridad
```

Donde `margen_seguridad` es un parámetro configurable por tipo de Commitment y Strategic
Posture. Si el Commitment no se ha cumplido dentro de la ventana, transiciona
automáticamente a EXPIRED.

**Derivación Constitucional:** CP-04 (límite temporal del ciclo — extendido a
Commitments por analogía); CP-26 (escalamiento por insuficiencia — la expiración
activa escalamiento); S-P7 (Human Escalation).

**Justificación:** Un Commitment que nunca expira es una obligación perpetua. Si el
sistema no puede cumplirlo (porque el usuario no responde, el conductor no está
disponible, o el servicio falla), debe haber un punto en el que el sistema reconozca
que el Commitment ya no es viable y actúe en consecuencia (escalar o cancelar).

**Implicaciones Cognitivas:**
- La ventana temporal se calcula al crear el Commitment.
- El monitor de expiración corre en segundo plano.
- Al expirar, el sistema debe: (a) notificar al usuario si corresponde, (b) escalar
  a operador humano si el Commitment sigue siendo necesario, (c) registrar la expiración.
- La expiración no es un fallo — es una salvaguarda. El Commitment expiró porque no
  pudo cumplirse a tiempo, no porque el sistema "falló."
- Diferentes tipos de Commitment tienen diferentes ventanas: un Commitment informativo
  ("creo que el origen es X") puede expirar en segundos; un Commitment operacional
  ("despachar conductor") puede expirar en minutos.

**Impacto Conversacional:** Las promesas del sistema tienen fecha de vencimiento. Si
el sistema no puede cumplir un compromiso a tiempo, informa al usuario y ofrece
alternativas (esperar más, cancelar, escalar). El usuario no queda esperando
indefinidamente una acción que nunca ocurre.

**Verificación:** ¿Existe algún Commitment en el sistema que no tenga una ventana
temporal definida? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el watchdog de expiración de
Commitments), DECISION_MODEL.md (define las ventanas por tipo de Commitment y
Strategic Posture).

---

## 5. Anatomy of a Commitment

### R-CM-010 — Essential Commitment attributes

**Enunciado:** Todo registro de Commitment debe contener los siguientes atributos
esenciales. Ningún Commitment puede existir sin todos estos atributos poblados.

| Atributo | Descripción | Obligatorio |
|----------|-------------|-------------|
| **ID de Commitment** | Identificador único global, inmutable, asignado en creación | Sí |
| **Tipo** | INFORMATIVE u OPERATIONAL (R-CM-004) | Sí |
| **Subtipo** | Para OPERATIONAL: TripCreation, Dispatch, Pricing, Payment, Modification, Cancellation (R-CM-005) | Sí (para OPERATIONAL) |
| **Estado** | PENDING, ACTIVE, FULFILLED, SUPERSEDED, REVOKED, EXPIRED, FAILED, VOID (R-CM-007) | Sí |
| **Decisión origen** | ID de la Decisión COMMIT que produjo este Commitment (R-CM-025) | Sí |
| **Belief origen** | La Belief que fundamenta el Commitment (proposición + valor) | Sí |
| **Certainty** | Valor de certidumbre al momento del compromiso | Sí |
| **Costo de Error** | Costo de Error estimado (FP y FN) al momento del compromiso | Sí |
| **Strategic Posture** | Postura estratégica al momento del compromiso | Sí |
| **Timestamp de creación** | Momento en que se registró el Commitment | Sí |
| **Ventana temporal** | Tiempo máximo para cumplir el Commitment (R-CM-009) | Sí |
| **Evidence IDs** | IDs de la Evidence que fundamentaron la decisión | Sí |
| **Contexto conversacional** | Resumen del contexto al momento del compromiso | Sí |
| **Referencia a usuario** | Identificador del usuario afectado | Sí |

**Derivación Constitucional:** P-I5 (Auditability of Every Decision); CP-22 (compromiso
explícito — debe tener una estructura identificable); R-DM-024 (Commitment records
reference the Decision — la misma información se materializa aquí).

**Justificación:** Un Commitment sin estos atributos es un compromiso ciego. No se puede
auditar, no se puede reconstruir, no se puede relacionar con la decisión que lo produjo.
Cada atributo cumple una función específica en la cadena de auditoría y en la operación
del sistema.

**Implicaciones Cognitivas:**
- Todos los atributos se escriben en el momento de creación del Commitment.
- Ningún atributo esencial puede modificarse después de la creación (inmutabilidad del
  registro básico).
- El estado y los timestamps de transición son metadatos mutables (ver R-CM-011).
- Si algún atributo no puede poblarse (falta de información), el Commitment no puede
  crearse — la decisión debe revisarse.

**Impacto Conversacional:** Cada Commitment tiene un "certificado de nacimiento"
completo. Si hay un problema, se puede reconstruir exactamente cuándo, por qué, y con
qué información se creó el compromiso.

**Verificación:** ¿Existe algún Commitment en el sistema cuyo registro no contenga todos
los atributos esenciales listados? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (define el esquema de datos del
Commitment con todos los atributos), COGNITIVE_ARCHITECTURE.md (define el momento de
escritura de cada atributo).

---

### R-CM-011 — Mutable metadata of Commitments

**Enunciado:** Los siguientes metadatos del Commitment son mutables: el estado actual,
el timestamp de cada transición de estado, el resultado final (outcome), y notas
operacionales. Cada mutación debe registrarse como un evento de transición con
timestamp, estado anterior, nuevo estado, y razón del cambio.

**Derivación Constitucional:** P-I5 (auditabilidad — los cambios se registran, no se
pierden); CP-08 (inmutabilidad aplicada al núcleo del Commitment; los metadatos de
estado pueden cambiar porque reflejan la evolución del compromiso, no su contenido
esencial).

**Justificación:** El Commitment mismo (el "qué" se comprometió) es inmutable. Pero su
estado (el "cómo" va su cumplimiento) es dinámico. Separar el núcleo inmutable del
estado mutable permite ambas propiedades: integridad del registro + capacidad de
seguimiento.

**Implicaciones Cognitivas:**
- Los atributos esenciales (R-CM-010) son el "acta de nacimiento" del Commitment.
- El estado y los eventos de transición son el "diario de vida" del Commitment.
- No se puede modificar el acta de nacimiento. Solo se pueden agregar eventos al diario.
- El diario de eventos es append-only.

**Impacto Conversacional:** El historial completo del Commitment está disponible. Se
puede saber no solo qué se comprometió, sino cómo evolucionó hasta su estado actual.

**Verificación:** ¿Existe alguna operación que modifique un atributo esencial de un
Commitment después de su creación? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (event-sourced state machine),
EVIDENCE_MODEL.md (los eventos de transición se registran como Evidence).

---

### R-CM-012 — Commitment identity

**Enunciado:** El ID de un Commitment es único, global, e inmutable. Se asigna en el
momento de creación y nunca se reutiliza, incluso si el Commitment es VOID. El ID
sigue el mismo formato y reglas que los IDs de Evidence (EVIDENCE_MODEL.md R-EM-013).

**Derivación Constitucional:** ONTOLOGY.md §3.1 (Entity identity constraint); P-I5
(auditabilidad — referencias estables).

**Justificación:** La identidad del Commitment es necesaria para referencias cruzadas
(Decisiones → Commitments → Acciones → Outcomes). Una identidad reutilizable rompería
la cadena de trazabilidad.

**Implicaciones Cognitivas:**
- El ID se genera en el momento PENDING.
- El ID es referenciado por: la Decisión origen, el Action Executor, los outcomes.
- El ID no puede cambiarse ni reasignarse.

**Impacto Conversacional:** (No visible directamente al usuario, pero es infraestructura
para la auditabilidad.)

**Verificación:** ¿Existe algún Commitment ID que pueda reutilizarse? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (estrategia de generación de IDs),
EVIDENCE_MODEL.md (criterio de unicidad compartido).

---

## 6. Preconditions for Commitment

### R-CM-013 — Preconditions for entering PENDING state

**Enunciado:** Un Commitment solo puede crearse (transición a PENDING) si se cumplen
TODAS las siguientes precondiciones:

1. **Decisión COMMIT recibida**: Existe una Decisión explícita COMMIT (R-DM-004) que
   ordena la creación del Commitment. No puede haber una decisión CLARIFY, ESCALATE,
   o ABSTAIN en lugar de COMMIT.
2. **Belief identificada**: Existe una Belief activa y específica que fundamenta el
   Commitment. La Belief debe tener una proposición y un valor definidos.
3. **Certainty suficiente**: La Certainty de la Belief es igual o superior al umbral de
   compromiso calculado para este tipo de Commitment bajo la Strategic Posture actual
   (R-CM-015).
4. **Costo de Error estimado**: Se ha estimado explícitamente el Costo de Error (FP y FN)
   para este Commitment (R-DM-016).
5. **Sin conflicto con Commitments activos**: No existe un Commitment activo (ACTIVE) que
   sea incompatible con el nuevo Commitment (R-CM-022).
6. **Autoridad verificada**: El sistema tiene autoridad autónoma para hacer este tipo de
   Commitment (CONSTITUTION.md §5.2). Si no, la decisión debe ser ESCALATE, no COMMIT.
7. **Contexto temporal válido**: El Commitment está dentro de su ventana temporal
   permitida (el momento de creación no excede límites de negocio como "no más de 90 días"
   de CONSTITUTION.md §5.3.1).

**Derivación Constitucional:** CP-22 (compromiso explícito — las precondiciones
garantizan que el compromiso es consciente); S-P1 (Evidence-Based Operation — todas
las precondiciones son verificables); CONSTITUTION.md §5.2 (autoridad autónoma);
S-P7 (Human Escalation — si no hay autoridad, no hay COMMIT).

**Justificación:** Un Commitment creado sin cumplir estas precondiciones es un compromiso
inválido. Cada precondición protege un aspecto diferente: (1-2) garantizan fundamento
epistémico, (3-4) garantizan calibración de riesgo, (5) garantiza consistencia interna,
(6) garantiza legalidad operacional, (7) garantiza factibilidad temporal.

**Implicaciones Cognitivas:**
- Si alguna precondición falla, el Commitment no puede crearse.
- Si falla la precondición 1-4, la decisión debe revisarse (volver a DELIBERATING).
- Si falla la precondición 5, debe resolverse el conflicto antes de crear el Commitment.
- Si falla la precondición 6, la decisión debe cambiarse a ESCALATE.
- Si falla la precondición 7, la decisión debe cambiarse a ESCALATE o ABSTAIN.

**Impacto Conversacional:** El sistema nunca crea compromisos inválidos. Si no se cumplen
las condiciones, el sistema informa al usuario por qué no puede comprometerse en lugar de
crear un compromiso que no podrá cumplir.

**Verificación:** ¿Existe alguna ruta donde un Commitment se cree sin pasar por la
verificación de todas estas precondiciones? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el gate de precondiciones en el flujo
de Compromiso), COMMITMENT_MODEL implementation (verificación de precondiciones antes de
la escritura del Commitment).

---

### R-CM-014 — Preconditions for PENDING → ACTIVE transition

**Enunciado:** Un Commitment solo puede transicionar de PENDING a ACTIVE si se cumplen
TODAS las siguientes precondiciones de materialización:

1. **Pre-Action exitosa**: La acción preparatoria (registro en base de datos, validación
   de datos, verificación de disponibilidad) se completó sin errores.
2. **Destino disponible**: El recurso necesario para cumplir el Commitment (conductor,
   vehículo, slot de tiempo) está disponible o puede reservarse.
3. **Sin cambios en el contexto**: No ha ocurrido un cambio de contexto significativo
   desde la creación del Commitment (el usuario no se retractó, no expiró el tiempo,
   no cambió la Strategic Posture a CONSERVATIVE de forma que invalide el umbral).
4. **Registro persistido**: El Commitment ha sido registrado durablemente en el sistema
   de persistencia.

**Derivación Constitucional:** CP-22 (compromiso explícito — la materialización es un
paso consciente); S-P6 (Knowledge Preservation — el registro debe ser durable); S-P7
(Human Escalation — si no puede materializarse, escalar).

**Justificación:** PENDING es un estado transitorio donde el sistema ha decidido
comprometerse pero aún no ha ejecutado la acción. La transición a ACTIVE es la
confirmación de que el Commitment es viable. Si no puede materializarse, el Commitment
debe fallar (FAILED) o invalidarse (VOID), no permanecer en PENDING indefinidamente.

**Implicaciones Cognitivas:**
- La transición PENDING → ACTIVE debe ocurrir dentro de la ventana temporal del
  Commitment.
- Si la transición falla (recurso no disponible), el sistema debe evaluar RETRY o
  ESCALATION.
- La transición PENDING → ACTIVE puede requerir comunicación al usuario ("su viaje está
  confirmado").
- Si el contexto cambió desfavorablemente, el sistema debe re-evaluar si el Commitment
  sigue siendo válido.

**Impacto Conversacional:** El usuario no recibe una confirmación hasta que el
Commitment está realmente activo. No hay casos donde el sistema diga "confirmado" y
luego no pueda cumplir.

**Verificación:** ¿Existe algún Commitment que transicione a ACTIVE sin verificar estas
precondiciones de materialización? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de materialización),
ACTION_EXECUTOR.md (define la pre-Action), COMMITMENT_MODEL implementation (verificación
de precondiciones de materialización).

---

## 7. The Commitment Gate

### R-CM-015 — The Commitment Gate as the safety barrier

**Enunciado:** El Commitment Gate es el mecanismo explícito que evalúa si un Commitment
puede crearse. Es la barrera de seguridad entre la cognición (Razonamiento) y la acción
(Proyección). El Gate evalúa en orden:

1. **Decisión**: ¿La Decisión del ciclo actual es COMMIT? (Si no, no hay Gate).
2. **Precondiciones**: ¿Se cumplen todas las precondiciones de Commitment (R-CM-013)?
3. **Certeza**: ¿Certainty(Belief) ≥ umbral_compromiso(R-CM-015)?
4. **Costo**: ¿El Costo de Error fue estimado y es aceptable?
5. **Conflictos**: ¿No hay conflictos con Commitments activos (R-CM-022)?
6. **Registro**: ¿El registro de Commitment se escribió correctamente (R-CM-010)?

Si TODAS las condiciones se cumplen, el Gate se abre y el Commitment se crea (PENDING).
Si ALGUNA falla, el Gate se cierra y la decisión debe revisarse.

**Derivación Constitucional:** CP-22 (compromiso explícito — el Gate es la
materialización del "compromiso explícito"); CP-23 (umbral dinámico — el Gate usa el
umbral calculado); R-DM-023 (Decision-to-Commitment gate — modelado aquí a nivel de
Commitment).

**Justificación:** El Gate es el mecanismo que garantiza que ningún Commitment existe sin
una evaluación completa. Es análogo a un "guardia de seguridad" en la puerta entre
pensar y actuar. Sin el Gate, el sistema podría comprometerse por accidente, por omisión,
o por flujo.

**Implicaciones Cognitivas:**
- El Gate se evalúa en la fase de Compromiso del Ciclo Cognitivo.
- El Gate no puede omitirse. Ni siquiera en emergencias (la emergencia puede acelerar
  la evaluación, pero no saltarla).
- Si el Gate rechaza el Commitment, la decisión debe cambiar a CLARIFY, ESCALATE, o
  ABSTAIN.
- El resultado del Gate (abierto/cerrado + razón) se registra como Evidence.

**Impacto Conversacional:** El usuario nunca experimenta un compromiso que el sistema
no pueda sostener. Cada "sí" del sistema ha pasado por el Gate y está fundamentado.

**Verificación:** ¿Existe algún flujo donde un Commitment se cree sin pasar por el
Commitment Gate? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la implementación del Gate en el
ciclo), COMMITMENT_MODEL implementation (implementa las verificaciones del Gate).

---

### R-CM-016 — Threshold computation for the Gate

**Enunciado:** El umbral de compromiso que usa el Gate se calcula dinámicamente para
cada Commitment potencial como:

```
umbral_compromiso = costo_error_FP / (costo_error_FP + costo_error_FN) + ajuste_postura
```

Donde:
- `costo_error_FP` es el costo estimado de un falso positivo (actuar sobre una creencia
  falsa).
- `costo_error_FN` es el costo estimado de un falso negativo (no actuar sobre una
  creencia verdadera).
- `ajuste_postura` es un modificador según la Strategic Posture:
  - CONSERVATIVE: +0.10 (eleva el umbral, más difícil comprometerse).
  - BALANCED: +0.00 (umbral por defecto).
  - AGGRESSIVE: -0.05 (reduce el umbral, más fácil comprometerse).

El umbral resultante se limita al rango [0.50, 0.99].

**Derivación Constitucional:** CP-23 (umbral dinámico — el umbral se ajusta según el
costo de error y la postura); CONSTITUTION.md §3.4 (Epistemic Sufficiency Principle);
P-E5 (Proportional Response).

**Justificación:** El umbral debe reflejar la relación entre los costos de error.
Si el costo de FP es mucho mayor que el de FN (despachar al lugar equivocado es peor
que no despachar), el umbral debe ser alto. Si los costos son similares, el umbral se
acerca a 0.5. La fórmula proporciona esta calibración natural.

**Implicaciones Cognitivas:**
- El umbral se calcula para cada Commitment, no es un valor global.
- Diferentes subtipos de Commitment tienen diferentes costos de error y por tanto
  diferentes umbrales.
- La Strategic Posture modula el umbral, pero nunca por debajo del mínimo de seguridad
  para el subtipo.
- Si el umbral calculado es > 0.99, el sistema no puede comprometerse autónomamente
  (debe escalar).

**Impacto Conversacional:** El sistema es calibrado. Comprometerse con una acción de
alto costo requiere más certidumbre que una de bajo costo. El usuario siente que el
sistema "entiende el riesgo" de cada acción.

**Verificación:** ¿Existe algún Commitment cuyo umbral no se calcule usando esta
fórmula o una equivalente que considere costo de error y postura? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (implementa la función de cálculo del umbral),
DECISION_MODEL.md (define los costos de error por subtipo de Commitment).

---

## 8. Informative Commitment

### R-CM-017 — Informative Commitment rules

**Enunciado:** Un Commitment Informativo es la afirmación explícita de una interpretación
al usuario. Sigue estas reglas específicas:

1. **Umbral**: Usa el umbral de formación de creencia (más bajo que el operacional).
2. **Efecto**: No ejecuta ninguna acción operacional. Solo informa al usuario.
3. **Reversibilidad**: Es reversible por definición. El usuario puede corregir la
   interpretación sin costo operacional.
4. **Duración**: Tiene una ventana temporal corta (segundos a minutos). Si el usuario
   no responde, se degrada naturalmente.
5. **Comunicación**: Debe comunicarse al usuario como una interpretación, no como un
   hecho consumado: "Entendí que quieres ir al aeropuerto, ¿es correcto?"

**Derivación Constitucional:** CP-25 (compromiso informativo vs. operacional — reglas
específicas para el informativo); P-I4 (Humility Before Uncertainty — la comunicación
debe reflejar que es una interpretación); P-E3 (Honest Expression — no se presenta
como verdad absoluta).

**Justificación:** El Commitment Informativo es el puente entre la cognición del sistema
y la confirmación del usuario. Permite que el usuario valide la interpretación del
sistema antes de que se ejecute cualquier acción. Esto reduce errores operacionales
por interpretaciones incorrectas.

**Implicaciones Cognitivas:**
- Un Commitment Informativo puede preceder a un Commitment Operacional en el mismo ciclo
  o en ciclos posteriores.
- Si el usuario corrige un Commitment Informativo, la corrección es nueva Evidence que
  inicia un nuevo ciclo.
- Un Commitment Informativo no confirmado por el usuario no puede convertirse en
  Operacional.
- El sistema puede tener múltiples Commitments Informativos activos simultáneamente
  (diferentes interpretaciones para diferentes aspectos).

**Impacto Conversacional:** El usuario sabe lo que el sistema "cree" antes de que el
sistema "actúe." Puede corregir errores de interpretación sin consecuencias. La
conversación es un diálogo de verificación, no de adivinación.

**Verificación:** ¿Existe algún Commitment Informativo que ejecute una acción operacional
sin la confirmación explícita del usuario? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de informative commitment
en el ciclo), CHANNEL_ADAPTER.md (define cómo se comunica la interpretación al usuario).

---

### R-CM-018 — From Informative to Operational

**Enunciado:** Un Commitment Informativo puede convertirse en un Commitment Operacional
en un ciclo posterior, cuando se cumplan todas las condiciones siguientes:

1. **Confirmación del usuario**: El usuario ha confirmado explícita o implícitamente la
   interpretación (ONTOLOGY.md define los niveles de confirmación).
2. **Nuevo ciclo**: Se inicia un nuevo Ciclo Cognitivo que recibe la confirmación como
   nueva Evidence.
3. **Nuevo gate**: El nuevo ciclo evalúa el Commitment Operacional con su propio umbral
   (más alto) y sus propias precondiciones.
4. **Nuevo registro**: El Commitment Operacional es un nuevo registro, no una
   modificación del Commitment Informativo.

**Derivación Constitucional:** CP-25 (compromiso informativo → operacional — la
transición requiere un nuevo ciclo); CP-22 (compromiso explícito — cada Commitment
tiene su propio gate); CP-35 (explicación antes de acción — entre el informativo y
el operacional debe haber explicación).

**Justificación:** La transición de informativo a operacional no es automática. Cada
etapa requiere su propia evaluación porque las consecuencias son diferentes. Esto
evita que el sistema "se deslice" de una interpretación a una acción sin la debida
diligencia.

**Implicaciones Cognitivas:**
- La confirmación del usuario es nueva Evidence que se registra en el Evidence Store.
- El nuevo ciclo evalúa si la confirmación es suficiente para elevar la certidumbre
  al umbral operacional.
- La confirmación implícita (silencio) solo es suficiente para compromisos operacionales
  de bajo costo (R-DM-020).
- El Commitment Informativo original permanece en su estado (FULFILLED si fue confirmado,
  SUPERSEDED si fue reemplazado).

**Impacto Conversacional:** El usuario experimenta una transición natural: el sistema
dice "entendí que quieres ir al aeropuerto" → el usuario confirma → el sistema dice
"perfecto, voy a crear tu viaje." No hay saltos bruscos ni acciones prematuras.

**Verificación:** ¿Existe algún flujo donde un Commitment Operacional se cree basado en
un Commitment Informativo sin un nuevo Ciclo Cognitivo y un nuevo gate? Si sí →
violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de transición entre ciclos),
COMMITMENT_MODEL implementation (los Commitments son registros independientes).

---

## 9. Operational Commitment

### R-CM-019 — Operational Commitment rules

**Enunciado:** Un Commitment Operacional es la obligación de ejecutar una acción que
modifica el estado del mundo real. Sigue estas reglas específicas:

1. **Umbral**: Usa el umbral de compromiso operacional (más alto, calculado por R-CM-016).
2. **Efecto**: Ejecuta una acción en el mundo real (crear viaje, despachar, cobrar).
3. **Reversibilidad**: Depende del subtipo (R-CM-021). Algunos son irreversibles.
4. **Duración**: Ventana temporal más larga que la informativa (minutos a horas).
5. **Comunicación**: Debe comunicarse al usuario como un hecho consumado o en proceso:
   "Tu viaje está confirmado."
6. **Autoridad**: Debe respetar los límites de autoridad autónoma (CONSTITUTION.md §5.2).

**Derivación Constitucional:** CP-25 (compromiso operacional — consecuencias reales);
S-P7 (Human Escalation — si no hay autoridad, escalar); CONSTITUTION.md §5.2 (límites
de autoridad).

**Justificación:** Los Commitment Operacionales tienen consecuencias reales en el mundo.
Un error en un Commitment Operacional puede costar dinero, tiempo, y confianza del
usuario. Por eso requieren mayor certidumbre, autorización explícita, y un protocolo
de ejecución robusto.

**Implicaciones Cognitivas:**
- Un Commitment Operacional siempre comienza en PENDING y pasa a ACTIVE solo cuando la
  acción se ha iniciado exitosamente.
- Si la acción falla (FAILED), el sistema debe decidir si reintentar (RETRY) o escalar
  (ESCALATION).
- Un Commitment Operacional ACTIVE no puede ignorarse. El sistema debe monitorear su
  progreso y reaccionar ante desviaciones.
- La finalización exitosa del Commitment transiciona a FULFILLED.

**Impacto Conversacional:** Cuando el sistema dice "voy a hacer algo," realmente lo
hace. Si no puede, informa al usuario y ofrece alternativas. Las promesas del sistema
tienen respaldo operacional.

**Verificación:** ¿Existe algún Commitment Operacional que se cree sin verificar la
autoridad autónoma del sistema para ese subtipo? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la ejecución de acciones operacionales),
COGNITIVE_ARCHITECTURE.md (define el monitoreo de Commitments activos).

---

### R-CM-020 — Operational Commitment execution protocol

**Enunciado:** La ejecución de un Commitment Operacional sigue un protocolo definido:

1. **Pre-Action** (en PENDING): Validar datos del Commitment, verificar disponibilidad de
   recursos, preparar el contexto operacional.
2. **Action** (en ACTIVE): Ejecutar la acción operacional (crear viaje, despachar
   conductor). Esta acción puede ser asíncrona.
3. **Monitoring** (en ACTIVE): Monitorear el progreso de la acción. Detectar fallos,
   demoras, o cambios de contexto.
4. **Post-Action** (al completar): Registrar el resultado (outcome), notificar al
   usuario, transicionar a FULFILLED.
5. **Contingency** (en FAILED): Si la acción falla, ejecutar el protocolo de contingencia
   (reintentar, escalar, cancelar).

**Derivación Constitucional:** CP-35 (explicación antes de acción — la Pre-Action
incluye la comunicación al usuario); S-P7 (Human Escalation — la contingencia puede
requerir escalamiento); CP-01 (ciclo completo — la ejecución es parte del ciclo).

**Justificación:** Un protocolo de ejecución explícito garantiza que ningún Commitment
Operacional queda "colgado" sin seguimiento. Cada etapa tiene sus propias reglas y
salvaguardas.

**Implicaciones Cognitivas:**
- La Pre-Action puede fallar por validación de datos o disponibilidad de recursos.
- La Action puede ser síncrona o asíncrona. Si es asíncrona, el sistema debe monitorear
  su progreso.
- El Monitoring detecta desviaciones: si la acción toma más tiempo del esperado, si el
  contexto cambia, si el usuario se retracta.
- La Post-Action registra el outcome como Evidence (R-CM-034).
- La Contingency se activa automáticamente ante fallos, no requiere una nueva decisión.

**Impacto Conversacional:** El sistema da seguimiento a sus promesas. Si un viaje está
en proceso, el sistema monitorea su progreso y mantiene al usuario informado.

**Verificación:** ¿Existe algún Commitment Operacional que no siga este protocolo de
ejecución en sus cinco etapas? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define cada etapa del protocolo por subtipo),
COGNITIVE_ARCHITECTURE.md (define el flujo de monitoreo).

---

### R-CM-021 — Reversibility per Operational subtype

**Enunciado:** Cada subtipo de Commitment Operacional tiene una clasificación de
reversibilidad definida:

| Subtipo | Reversibilidad | Costo de revocación | Ejemplo |
|---------|---------------|---------------------|---------|
| **TripCreation** | Reversible (antes de despacho) | Bajo — solo borrar registro | Usuario cancela antes de asignar conductor |
| **Dispatch** | Parcialmente reversible | Alto — conductor ya en ruta | Usuario cancela con conductor asignado |
| **Pricing** | Reversible | Bajo — ajustar precio | Error en cálculo de tarifa |
| **Payment** | Generalmente irreversible | Muy alto — transacción financiera | Pago ya procesado |
| **Modification** | Reversible | Bajo a medio según cambio | Cambiar destino antes del viaje |
| **Cancellation** | Irreversible (el viaje ya no existe) | Medio — pérdida de viaje | Viaje ya cancelado |

**Derivación Constitucional:** R-DM-021 (Decision reversibility classification — cada
tipo de Commitment tiene su propia reversibilidad); CP-25 (compromiso informativo vs.
operacional); P-E5 (Proportional Response).

**Justificación:** La reversibilidad determina el umbral de compromiso y el protocolo
de revocación. Un Commitment irreversible necesita mayor certidumbre que uno reversible.
Clasificar cada subtipo explícitamente evita tratar todos los compromisos operacionales
como igualmente riesgosos.

**Implicaciones Cognitivas:**
- La reversibilidad se define en el diseño del subtipo, no en tiempo de ejecución.
- Un Commitment reversible puede volverse irreversible si no se revoca a tiempo (el
  conductor ya llegó).
- La revocación de un Commitment parcialmente reversible tiene costo, que debe
  comunicarse al usuario.
- La irreversibilidad de un Commitment no implica que el sistema no pueda compensar al
  usuario (ofrecer un viaje alternativo, descuento).

**Impacto Conversacional:** El usuario sabe qué compromisos pueden cancelarse y cuáles
no. Si un compromiso es costoso de revocar, el sistema lo informa antes de ejecutarlo.

**Verificación:** ¿Existe algún subtipo de Commitment Operacional que no tenga una
clasificación explícita de reversibilidad? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define umbrales según reversibilidad),
COGNITIVE_ARCHITECTURE.md (define el protocolo de revocación por subtipo).

---

## 10. Escalation Protocol

### R-CM-022 — Escalation triggers from Commitments

**Enunciado:** Un Commitment activa el protocolo de escalamiento a operador humano en
cualquiera de las siguientes condiciones:

1. **EXPIRED**: El Commitment expiró y sigue siendo necesario para la operación.
2. **FAILED con retry agotado**: La ejecución falló, se intentó el reintento (si
   aplica), y el reintento también falló.
3. **Conflicto irresoluble**: El Commitment entra en conflicto con otro Commitment
   activo y no puede resolverse epistémicamente (R-CM-022).
4. **Autoridad insuficiente**: El Commitment requiere una autoridad que el sistema no
   posee (CONSTITUTION.md §5.2).
5. **Usuario solicita escalación**: El usuario pide explícitamente hablar con un
   operador humano durante la ejecución del Commitment.

**Derivación Constitucional:** S-P7 (Human Escalation); CP-26 (escalamiento por
insuficiencia — extendido a Commitments); R-DM-012 (Escalation criteria — las mismas
condiciones aplican a nivel de Commitment).

**Justificación:** Cuando un Commitment no puede cumplirse por los medios automáticos
del sistema, la escalación a un operador humano es la única opción segura. La
escalación no es un fallo — es una salvaguarda que protege al usuario y al sistema.

**Implicaciones Cognitivas:**
- La escalación es automática (no requiere una nueva decisión) cuando se cumple alguna
  de las condiciones.
- El sistema debe preparar un "paquete de escalación" con el contexto completo del
  Commitment: qué se comprometió, con qué información, por qué falló, qué se intentó.
- Una vez escalado, el Commitment queda en un estado de "escalado" (nuevo estado:
  ESCALATED, añadido a la máquina de estados como estado intermedio no terminal).
- El sistema puede continuar monitoreando el Commitment después de escalado, pero no
  puede tomar decisiones autónomas sobre él.

**Impacto Conversacional:** Si un compromiso no puede cumplirse, el usuario es
transferido a un operador humano con toda la información relevante. No tiene que
explicar el problema desde cero. La transición es fluida y el usuario siente que el
sistema "sabe cuándo pedir ayuda."

**Verificación:** ¿Existe algún Commitment que no pueda activar el protocolo de
escalamiento en ninguna de estas condiciones? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el sistema de monitoreo que detecta
las condiciones de escalación), CHANNEL_ADAPTER.md (define la comunicación de
escalación al usuario y al operador).

---

### R-CM-023 — Escalation package

**Enunciado:** Cuando un Commitment se escala, el sistema debe preparar y entregar al
operador humano un paquete de escalación que contenga:

| Componente | Descripción |
|------------|-------------|
| **Resumen del Commitment** | Qué se comprometió, tipo, subtipo, estado actual |
| **Historial de la decisión** | Decisión origen, Belief que lo fundamentó, Certainty, Costo de Error |
| **Evidence relevante** | IDs de la Evidence que fundamentaron la decisión, con contenido |
| **Causa de escalación** | Cuál condición (R-CM-022) activó la escalación |
| **Intentos realizados** | Qué se intentó antes de escalar (reintentos, clarificaciones) |
| **Contexto conversacional** | Últimos mensajes del usuario relevantes al Commitment |
| **Opciones para el operador** | Acciones sugeridas: cumplir, revocar, modificar, contactar al usuario |
| **Referencia al usuario** | Canal de contacto, ID del usuario, estado actual de la conversación |

**Derivación Constitucional:** S-P7 (Human Escalation — la escalación debe incluir el
contexto necesario para que el humano decida); P-I5 (auditabilidad — el paquete es la
traza completa de la decisión).

**Justificación:** Escalar sin contexto es inútil. El operador humano necesita entender
qué pasó, por qué, y qué opciones tiene. Un paquete completo permite que el operador
tome una decisión informada sin tener que investigar el estado del sistema.

**Implicaciones Cognitivas:**
- El paquete se genera automáticamente al activarse la escalación.
- El paquete se entrega al operador humano a través del canal definido en
  CHANNEL_ADAPTER.md.
- El sistema debe estar disponible para responder preguntas del operador sobre el
  paquete.
- El paquete se almacena como Evidence para auditoría posterior.

**Impacto Conversacional:** El operador humano tiene toda la información necesaria para
ayudar al usuario. El usuario no tiene que repetir información. La transición a soporte
humano es fluida e informada.

**Verificación:** ¿Existe alguna escalación de Commitment que no incluya todas las
componentes del paquete? Si sí → violación.

**Delegación:** CHANNEL_ADAPTER.md (define el formato de entrega del paquete al
operador), COGNITIVE_ARCHITECTURE.md (define la generación del paquete en el punto de
escalación).

---

## 11. Revocation Protocol

### R-CM-024 — Revocation rules

**Enunciado:** Un Commitment ACTIVE solo puede revocarse si:

1. **El tipo de Commitment lo permite**: La reversibilidad del subtipo (R-CM-021) es
   "Reversible" o "Parcialmente reversible."
2. **No ha comenzado la fase irreversible**: Si el despacho ya se ejecutó, no puede
   revocarse la asignación del conductor (aunque puede cancelarse el viaje).
3. **La revocación se basa en nueva Evidence**: Debe haber nueva Evidence que justifique
   la revocación (usuario se retracta, error detectado, contexto cambia).
4. **La revocación se registra como nuevo evento**: La revocación no modifica el
   Commitment original — crea un nuevo evento que cambia el estado a REVOKED.
5. **La revocación se comunica al usuario**: El usuario debe ser informado de la
   revocación y la razón.

**Derivación Constitucional:** R-DM-022 (Revocation protocol — los mismos principios
aplican a Commitments); P-E4 (Revisability of Beliefs — los Commitments también son
revisables, pero con costo); CP-39 (mejora no destructiva — el Commitment revocado
no se elimina).

**Justificación:** La revocación no es una falla — es una respuesta a nueva información.
Si el usuario dice "cancelar" o se detecta un error, el sistema debe poder revocar el
Commitment. Pero la revocación tiene costo y debe hacerse de forma controlada.

**Implicaciones Cognitivas:**
- La revocación puede iniciarse por: (a) decisión del usuario, (b) detección de error
  por el sistema, (c) cambio de contexto que invalida el Commitment.
- La revocación inicia un nuevo Ciclo Cognitivo (la nueva Evidence dispara el ciclo).
- Si el Commitment es "Parcialmente reversible," la revocación puede tener costo
  (penalización, pérdida de confianza) que debe comunicarse al usuario.
- El Commitment original se marca como REVOKED con referencia al evento de revocación.

**Impacto Conversacional:** El usuario puede cambiar de opinión. Si el sistema ya se
comprometió pero el usuario quiere cancelar, el sistema maneja la cancelación de forma
controlada, informando costos si aplica. No hay situaciones donde el usuario "no pueda
volver atrás."

**Verificación:** ¿Existe algún mecanismo de revocación que modifique el registro del
Commitment original en lugar de crear un evento de revocación? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de ciclo de revocación),
COMMITMENT_MODEL implementation (event-sourced state machine para revocación).

---

### R-CM-025 — Compensation on revocation

**Enunciado:** Cuando un Commitment Operacional se revoca y la revocación tiene costo
para el usuario (penalización, pérdida de viaje), el sistema debe ofrecer compensación
según las reglas de negocio aplicables:

| Subtipo | Costo para el usuario | Compensación posible |
|---------|----------------------|---------------------|
| TripCreation (revocado antes de despacho) | Ninguno | Sin compensación necesaria |
| Dispatch (revocado con conductor asignado) | Tiempo de espera del conductor | Ofrecer nuevo conductor, descuento |
| Payment (revocado después de cobro) | Reembolso | Procesar reembolso automático |
| Pricing (revocado por error) | Confianza | Explicación y corrección |

**Derivación Constitucional:** CONSTITUTION.md §2.3 (seguridad, confiabilidad,
eficiencia); S-P7 (Human Escalation — si la compensación no puede ser automática,
escalar).

**Justificación:** La revocación puede tener consecuencias para el usuario. El sistema
debe estar preparado para compensar apropiadamente según el tipo de Commitment y la
causa de la revocación. Esto es parte de la confiabilidad del sistema (CONSTITUTION.md
§2.3).

**Implicaciones Cognitivas:**
- La compensación se determina al momento de la revocación.
- Si la compensación puede ser automática (reembolso), se ejecuta como parte del
  protocolo de revocación.
- Si requiere decisión humana (caso complejo), se incluye en el paquete de escalación.
- La compensación se registra como Evidence.

**Impacto Conversacional:** Si el sistema tiene que revocar un compromiso que afecta al
usuario, ofrece compensación apropiada. El usuario siente que el sistema "se hace
responsable" de sus acciones.

**Verificación:** ¿Existe algún Commitment Operacional revocado que no evalúe si se
requiere compensación? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la ejecución de compensaciones),
DECISION_MODEL.md (define las reglas de compensación por subtipo),
KNOWLEDGE_MODEL.md (integra las reglas de negocio de compensación).

---

## 12. Conflicts Between Commitments

### R-CM-026 — Commitment conflict detection

**Enunciado:** Dos Commitments están en conflicto cuando son incompatibles: no pueden
cumplirse ambos simultáneamente sin contradicción operacional. Ejemplos:

- Dos Commitments de Dispatch para el mismo viaje (conductores diferentes).
- Un Commitment de TripCreation y otro de Cancellation para el mismo viaje (sin nueva
  Evidence que justifique la cancelación).
- Un Commitment Informativo que afirma "origen = Asunción" y un Commitment Operacional
  que despacha a San Lorenzo.
- Dos Commitments de Pricing con precios diferentes para el mismo viaje.

**Derivación Constitucional:** R-DM-027 (Decision conflict detection — aplicado a
Commitments); CP-10 (resolución de Evidence conflictiva — por analogía, los conflictos
de Commitment se resuelven epistémicamente).

**Justificación:** Los Commitments incompatibles crean un estado operacional
contradictorio. El sistema no puede estar "creando un viaje" y "cancelando el mismo
viaje" simultáneamente. La detección de conflictos evita que el sistema ejecute
acciones contradictorias.

**Implicaciones Cognitivas:**
- La detección de conflictos ocurre en el Commitment Gate (R-CM-015): antes de crear
  un nuevo Commitment, se verifica que no entre en conflicto con Commitments activos.
- La detección también ocurre en tiempo real: si un nuevo evento (nuevo mensaje del
  usuario) introduce un conflicto con un Commitment activo, el sistema debe detectarlo.
- La incompatibilidad se define por: (a) mismo objeto operacional (viaje, conductor),
  (b) acciones mutuamente excluyentes (crear vs. cancelar), (c) valores contradictorios
  (Asunción vs. San Lorenzo con consecuencias operacionales).

**Impacto Conversacional:** El sistema nunca ejecuta acciones contradictorias. El
usuario no recibe mensajes conflictivos ("su viaje está confirmado" y luego "su viaje
fue cancelado" sin explicación).

**Verificación:** ¿Existe algún escenario donde dos Commitments incompatibles puedan
estar simultáneamente activos sin detección? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el motor de detección de conflictos),
COMMITMENT_MODEL implementation (implementa las reglas de incompatibilidad).

---

### R-CM-027 — Conflict resolution between Commitments

**Enunciado:** Cuando se detecta un conflicto entre un Commitment existente (ACTIVE) y
uno propuesto (PENDING), se aplican las siguientes reglas de resolución en orden:

1. **Nueva Evidence**: Si el nuevo Commitment está basado en nueva Evidence que no
   existía cuando se creó el Commitment existente, el nuevo Commitment prevalece
   (el existente debe REVOKED o SUPERSEDED).
2. **Precedencia por tipo** (R-CM-028): Si no hay nueva Evidence, se aplica la
   precedencia por tipo.
3. **Precedencia por solicitud del usuario**: Si el nuevo Commitment está basado en
   una solicitud explícita del usuario (no inferida), prevalece sobre Commitment
   inferidos.
4. **Seguridad**: Si un Commitment tiene implicaciones de seguridad (EMERGENCY),
   prevalece sobre cualquier otro.
5. **Desempate por recencia**: Si ninguna de las reglas anteriores resuelve el
   conflicto, el Commitment más reciente prevalece.

**Derivación Constitucional:** CP-10 (resolución de Evidence conflictiva — las mismas
reglas epistémicas aplican por analogía); R-DM-028 (Decision precedence — aplicado a
Commitments); S-P8 (principio de precedencia — seguridad sobre operación).

**Justificación:** Los conflictos deben resolverse con reglas claras, no con
comportamiento aleatorio o indefinido. El orden de resolución favorece: primero la
Evidence, luego la autoridad (usuario), luego la seguridad, y finalmente el tiempo.

**Implicaciones Cognitivas:**
- La resolución puede: (a) rechazar el nuevo Commitment (no se crea), (b) revocar el
  Commitment existente (se marca REVOKED), (c) escalar a humano si no puede resolverse.
- La resolución debe registrarse: qué Commitments estaban en conflicto, qué regla se
  aplicó, cuál fue el resultado.
- Si el conflicto no puede resolverse (caso dudoso), se escala a operador humano.

**Impacto Conversacional:** Los conflictos se resuelven de forma predecible y justificable.
Si el sistema tiene que cambiar un Commitment previo, puede explicar por qué ("recibí
nueva información del usuario que cambió mi decisión").

**Verificación:** ¿Existe algún conflicto entre Commitments que se resuelva sin aplicar
estas reglas en el orden establecido? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el motor de resolución de conflictos),
COMMITMENT_MODEL implementation (implementa las reglas de precedencia).

---

## 13. Precedence and Consistency

### R-CM-028 — Precedence between Commitments

**Enunciado:** Cuando dos Commitments entran en conflicto y no pueden resolverse por
nueva Evidence (R-CM-027 regla 1), se aplica la siguiente precedencia:

| Precedencia | Tipo de Commitment | Razón |
|-------------|-------------------|-------|
| **1 (más alta)** | EMERGENCY (seguridad) | S-P8: seguridad sobre todo |
| **2** | Solicitud explícita del usuario | El usuario siempre tiene la última palabra |
| **3** | Dispatch (despacho de conductor) | Mayor costo de error operacional |
| **4** | Payment (transacción financiera) | Alto costo de error financiero |
| **5** | TripCreation (creación de viaje) | Costo de error medio |
| **6** | Cancellation (cancelación) | Costo de error medio |
| **7** | Modification (modificación) | Costo de error bajo |
| **8** | Pricing (cotización de precio) | Costo de error bajo |
| **9** | Commitment Informativo | Costo de error más bajo |
| **10 (más baja)** | Commitment decayente o no confirmado | Mínima prioridad |

**Derivación Constitucional:** R-DM-028 (Decision precedence — aplicado a Commitments);
S-P8 (principio de precedencia — seguridad sobre eficiencia, preservación sobre
operación); CP-25 (compromiso informativo vs. operacional).

**Justificación:** La precedencia es necesaria para resolver conflictos cuando no hay
base epistémica para hacerlo. El orden sigue los valores constitucionales: seguridad
primero, usuario segundo, operación de alto costo después, y finalmente información.

**Implicaciones Cognitivas:**
- La precedencia solo aplica cuando el conflicto no puede resolverse por nueva Evidence.
- Un Commitment de mayor precedencia puede SUPERSEDER a uno de menor.
- La precedencia no es una licencia para ignorar Commitments de menor prioridad — deben
  ser revocados formalmente (R-CM-024).
- Si un Commitment de baja precedencia está en estado ACTIVE, no es automáticamente
  reemplazado por uno de alta precedencia — la transición a SUPERSEDED debe ser
  explícita.

**Impacto Conversacional:** Las decisiones del sistema siguen un orden de importancia
que el usuario puede entender: primero la seguridad, luego su solicitud explícita,
luego las operaciones de alto costo, etc.

**Verificación:** ¿Existe algún conflicto entre Commitments que se resuelva sin respetar
esta jerarquía de precedencia? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el motor de precedencia),
COMMITMENT_MODEL implementation (implementa la jerarquía de precedencia).

---

### R-CM-029 — Commitment stability

**Enunciado:** Un Commitment ACTIVE no debe cambiar sin nueva Evidence que lo justifique.
La regla es: "misma Evidence, mismo Commitment." Si el sistema no recibe nueva Evidence,
el Commitment no se modifica, no se revoca, y no se re-evalúa (excepto por expiración).

**Derivación Constitucional:** R-DM-029 (Decision consistency across cycles — aplicado
a Commitments); CP-34 (no-repregunta — el sistema no debe cambiar compromisos
caprichosamente); P-E4 (Revisability of Beliefs — revisable, no caprichosa).

**Justificación:** Si el sistema cambiara Commitments sin nueva Evidence, sería
impredecible e inconsistente. El usuario no sabría qué esperar del sistema. La
estabilidad del Commitment es necesaria para la confianza.

**Implicaciones Cognitivas:**
- Un Commitment ACTIVE no se reabre automáticamente en el próximo ciclo.
- La reapertura solo ocurre si: (a) nueva Evidence relevante llega, (b) el contexto
  cambia significativamente, (c) el usuario explícitamente solicita un cambio.
- Si no hay nueva Evidence, el Commitment se considera "confirmado por estabilidad."
- La estabilidad no es rigidez: si el contexto cambia (expiración, fallo externo), el
  Commitment puede transicionar a EXPIRED o FAILED.

**Impacto Conversacional:** El usuario confía en que los compromisos del sistema son
estables. Una vez que el sistema confirma un viaje, no lo cancela sin razón.

**Verificación:** ¿Existe algún mecanismo que permita cambiar un Commitment ACTIVE sin
la llegada de nueva Evidence, un cambio de contexto, o una solicitud explícita del
usuario? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la detección de nueva Evidence como
único trigger de re-decisión), COMMITMENT_MODEL implementation (protege el estado ACTIVE
contra modificaciones no autorizadas).

---

## 14. Commitment and Decision

### R-CM-030 — Commitment is the exclusive output of a Decision COMMIT

**Enunciado:** Un Commitment solo puede crearse como consecuencia directa de una Decisión
COMMIT (R-DM-004). No existe ninguna otra vía para crear un Commitment. Una Decisión
CLARIFY, ESCALATE, o ABSTAIN no produce un Commitment.

**Derivación Constitucional:** R-DM-023 (Decision-to-Commitment gate); R-DM-046 (no
commitment without decision); CP-22 (compromiso explícito).

**Justificación:** Si un Commitment pudiera crearse sin una Decisión COMMIT, habría una
ruta de acción que no pasa por el proceso de decisión. Esto violaría la cadena de
auditabilidad (P-I5) porque no habría registro de la decisión que autorizó el compromiso.

**Implicaciones Cognitivas:**
- Toda creación de Commitment debe estar precedida por una Decisión COMMIT en el mismo
  Ciclo Cognitivo.
- Si no hay Decisión COMMIT, no hay Commitment. Fin de la historia.
- El Commitment debe referenciar el ID de la Decisión que lo originó (R-CM-010).
- Si el Commitment se crea y luego se descubre que no había Decisión COMMIT, el
  Commitment es inválido y debe marcarse como VOID.

**Impacto Conversacional:** (No directo, pero es infraestructura para que todo compromiso
esté autorizado por una decisión explícita.)

**Verificación:** ¿Existe algún Commitment cuyo origen no sea una Decisión COMMIT
registrada? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo Decisión → Commitment en
el ciclo), COMMITMENT_MODEL implementation (verifica que toda creación de Commitment
tenga una Decisión COMMIT asociada).

---

### R-CM-031 — Decision references in Commitment

**Enunciado:** Todo Commitment debe contener una referencia directa a la Decisión que
lo originó, incluyendo:

- ID de la Decisión.
- Tipo de Decisión (COMMIT).
- Dominio de la Decisión (epistémico, compromiso, interacción).
- Certainty al momento de la Decisión.
- Costo de Error estimado (FP y FN) al momento de la Decisión.
- Strategic Posture al momento de la Decisión.
- Evidence IDs que fundamentaron la Decisión.

**Derivación Constitucional:** R-DM-024 (Commitment records reference the Decision);
P-I5 (Auditability of Every Decision — debe ser trazable desde el Commitment hasta la
Decisión y la Evidence).

**Justificación:** Sin esta referencia, un Commitment existe pero no puede auditarse por
qué se tomó. La referencia permite reconstruir la cadena completa: Commitment →
Decisión → Certainty → Evidence.

**Implicaciones Cognitivas:**
- La referencia se escribe en el momento de creación del Commitment.
- No puede crearse un Commitment sin esta referencia.
- Si la Decisión de origen es SUPERSEDED, el Commitment puede permanecer ACTIVE a menos
  que la nueva decisión lo revoque explícitamente.

**Impacto Conversacional:** (Infraestructura para auditabilidad — no visible al usuario
pero esencial para la confiabilidad del sistema.)

**Verificación:** ¿Existe algún Commitment cuyo registro no contenga referencia completa
a la Decisión que lo originó? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (el esquema del Commitment incluye todos
los campos de referencia), COGNITIVE_ARCHITECTURE.md (propaga la información de la
Decisión al Commitment).

---

### R-CM-032 — One Decision, zero or one Commitment

**Enunciado:** Una Decisión COMMIT produce exactamente un Commitment. Una Decisión no
COMMIT (CLARIFY, ESCALATE, ABSTAIN) produce cero Commitments. No existe una Decisión
COMMIT que produzca múltiples Commitments, ni una Decisión no-COMMIT que produzca un
Commitment.

**Derivación Constitucional:** CP-22 (compromiso explícito — un acto de compromiso por
decisión); R-DM-023 (Decision-to-Commitment gate — una decisión, un gate).

**Justificación:** Si una Decisión COMMIT pudiera producir múltiples Commitments, se
perdería la correspondencia uno a uno necesaria para la auditabilidad. ¿Qué Commitment
corresponde a qué parte de la decisión? ¿Cuál falló? La correspondencia uno a uno
simplifica la trazabilidad.

**Implicaciones Cognitivas:**
- Si el sistema necesita múltiples Commitments (ej.: crear un viaje + despachar un
  conductor), necesita múltiples Decisiones COMMIT, cada una en su Ciclo Cognitivo.
- Esto no es ineficiente — es necesario porque cada Commitment tiene su propio umbral,
  su propio costo de error, y su propia evaluación.
- Una Decisión COMMIT que produce cero Commitments es una anomalía (la decisión debería
  haberse revisado).

**Impacto Conversacional:** Cada acción del sistema corresponde a una decisión
identificable. Si algo sale mal, se sabe exactamente qué decisión produjo esa acción.

**Verificación:** ¿Existe algún mecanismo donde una Decisión COMMIT produzca más de un
Commitment? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de una decisión → un
Commitment), COMMITMENT_MODEL implementation (verifica la cardinalidad en creación).

---

## 15. Commitment and Certainty

### R-CM-033 — Certainty at commitment time

**Enunciado:** La Certainty que se registra en el Commitment es la Certainty agregada
de la Belief fundamento en el momento exacto en que el Commitment Gate (R-CM-015) se
abre. Esta Certainty se congela en el Commitment y no cambia aunque la Belief subyacente
se actualice después. La Belief puede cambiar; el Commitment registra la certidumbre
que tenía en el momento de crearse.

**Derivación Constitucional:** CP-18 (certidumbre continua — cada Belief tiene un valor
de certidumbre); R-DM-014 (Certainty as primary decision variable — la certidumbre es
la variable que determina si el sistema puede comprometerse); CP-08 (inmutabilidad — el
Commitment, como registro, es inmutable).

**Justificación:** La certidumbre al momento del compromiso es un dato histórico
esencial para la auditoría. Si la certidumbre cambiara después (por nueva Evidence),
el Commitment reflejaría una realidad que no existía cuando se tomó la decisión. La
certidumbre congelada permite responder: "¿con qué nivel de confianza se tomó esta
decisión en ese momento?"

**Implicaciones Cognitivas:**
- La Certainty en el Commitment es el valor en el momento del Gate, no el valor actual.
- La Belief subyacente puede cambiar después (nueva Evidence), pero eso no modifica
  el Commitment (aunque puede llevar a una revocación).
- Si la Certainty de la Belief cae por debajo del umbral después del compromiso, el
  sistema debe evaluar si el Commitment debe mantenerse o revocarse.
- La diferencia entre la Certainty al compromiso y la Certainty actual es información
  valiosa para el aprendizaje.

**Impacto Conversacional:** Las decisiones del sistema son estables. No cambian
retroactivamente porque llegó nueva información. La nueva información puede llevar a
nuevas decisiones, pero las decisiones pasadas se mantienen como fueron tomadas.

**Verificación:** ¿Existe algún mecanismo que actualice la Certainty registrada en un
Commitment después de su creación? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (la Certainty es un campo inmutable),
CERTAINTY_CALCULUS.md (provee el valor de certidumbre al momento del Gate).

---

### R-CM-034 — Post-commitment certainty degradation

**Enunciado:** Aunque la Certainty registrada en el Commitment es inmutable, la
certidumbre operacional del Commitment (la confianza del sistema en que el Commitment
es correcto) se degrada con el tiempo. Si la certidumbre operacional cae por debajo
de un umbral de alerta, el sistema debe re-evaluar el Commitment.

La degradación operacional sigue estas reglas:

- La certidumbre operacional comienza igual a la Certainty registrada.
- Se degrada según la misma función del tipo de Belief (CP-19, CERTAINTY_CALCULUS.md).
- Si cae por debajo del umbral de alerta (threshold_alerta < umbral_compromiso), se
  activa una alerta de re-evaluación.
- La re-evaluación no revoca el Commitment automáticamente — pregunta si el Commitment
  sigue siendo válido.

**Derivación Constitucional:** CP-19 (degradación temporal — la certidumbre de toda
Belief se degrada con el tiempo); CP-20 (actualización por Evidence — la degradación
es una forma de "Evidence negativa" por ausencia).

**Justificación:** Un Commitment que no recibe confirmación con el tiempo se vuelve
menos confiable. La degradación operacional permite que el sistema detecte cuando un
Commitment se ha vuelto "débil" y necesita re-evaluación, sin violar la inmutabilidad
del registro original.

**Implicaciones Cognitivas:**
- La degradación operacional es un proceso continuo y automático.
- La alerta de re-evaluación inicia un nuevo Ciclo Cognitivo para decidir si el
  Commitment debe mantenerse, revocarse, o actualizarse.
- La re-evaluación puede producir: (a) confirmación (nuevo Commitment de confirmación),
  (b) revocación, (c) modificación.
- Las alertas de degradación son más frecuentes para Commitments Informativos que para
  Operacionales.

**Impacto Conversacional:** El sistema mantiene sus compromisos actualizados. Si un
compromiso se vuelve dudoso por el paso del tiempo, el sistema lo re-evalúa en lugar
de ejecutar una acción basada en información desactualizada.

**Verificación:** ¿Existe algún Commitment que no tenga un mecanismo de degradación
operacional y alerta de re-evaluación? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la función de degradación),
COGNITIVE_ARCHITECTURE.md (define el watchdog de degradación y el trigger de
re-evaluación).

---

## 16. Commitment and Cost of Error

### R-CM-035 — Cost of Error is recorded at commitment time

**Enunciado:** El Costo de Error (FP y FN) estimado al momento del compromiso se
registra en el Commitment como parte de sus atributos esenciales (R-CM-010). Este
costo es inmutable en el registro, al igual que la Certainty.

**Derivación Constitucional:** CP-24 (costo de error — todo compromiso debe evaluar
explícitamente el costo de error); R-DM-016 (Cost of Error as a decision prerequisite);
P-I5 (auditabilidad — el costo de error debe registrarse).

**Justificación:** El Costo de Error al momento del compromiso es parte de la
justificación de la decisión. Registrarlo permite auditar: "¿era razonable comprometerse
dado el costo de error estimado en ese momento?"

**Implicaciones Cognitivas:**
- FP y FN se registran como valores separados.
- Si el costo de error se recalibra después (R-DM-017), el Commitment no se actualiza.
- La comparación entre el costo estimado y el costo real (outcome) es información de
  aprendizaje.

**Verificación:** ¿Existe algún Commitment cuyo registro no incluya el Costo de Error
estimado (FP y FN)? Si sí → violación.

**Delegación:** DECISION_MODEL.md (provee la estimación de costo de error al momento
del Gate), COMMITMENT_MODEL implementation (almacena los valores como parte del
registro inmutable).

---

### R-CM-036 — Cost of Error by subtype

**Enunciado:** Cada subtipo de Commitment Operacional (R-CM-005) tiene valores base de
Costo de Error, que son modificados por el contexto conversacional y la Strategic
Posture:

| Subtipo | Costo FP base | Costo FN base | Ajuste por contexto |
|---------|--------------|--------------|-------------------|
| **TripCreation** | 3 (pérdida de confianza, corrección) | 5 (ingreso perdido) | +1 si usuario nuevo, +2 si horario nocturno |
| **Dispatch** | 10 (conductor en ruta, combustible) | 8 (viaje perdido) | +3 si hora pico, +2 si distancia larga |
| **Pricing** | 2 (error corregible) | 3 (usuario se va) | +1 si precio alto |
| **Payment** | 15 (reembolso, disputa) | 10 (ingreso perdido) | +5 si monto alto |
| **Modification** | 1 (cambio simple) | 2 (usuario insatisfecho) | +1 si modificación compleja |
| **Cancellation** | 4 (pérdida de viaje) | 3 (conductor ya en ruta) | +2 si cancelación tardía |

Los valores son unidades relativas (no monetarias directas) que permiten comparar y
calcular umbrales.

**Derivación Constitucional:** CP-24 (costo de error — cada tipo tiene su propio costo);
CP-23 (umbral dinámico — el costo de error determina el umbral); R-DM-016 (modelo de
costo de error).

**Justificación:** No todos los errores cuestan lo mismo. Despachar al lugar equivocado
es más costoso que cotizar un precio incorrecto. Tener valores base por subtipo permite
calibrar el umbral de compromiso apropiadamente, y los ajustes contextuales refinan la
calibración.

**Implicaciones Cognitivas:**
- Los valores base son parámetros configurables, no constantes.
- El contexto modifica los valores base: hora pico, usuario nuevo, tipo de vehículo.
- La Strategic Posture modifica el umbral resultante (R-CM-016), no los costos base.
- Los costos base pueden recalibrarse con outcomes reales (R-DM-041).

**Impacto Conversacional:** El sistema es más cuidadoso cuando el error es más costoso.
No trata todos los errores por igual.

**Verificación:** ¿Existe algún Commitment Operacional cuyo costo de error no esté
definido según su subtipo? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define los costos base y ajustes por contexto),
COMMITMENT_MODEL implementation (almacena el costo usado al momento del compromiso).

---

## 17. Commitment and Action Executor

### R-CM-037 — Action Executor receives Commitments, not Decisions

**Enunciado:** El Action Executor (ACTION_EXECUTOR.md) recibe y ejecuta acciones
basándose en Commitments, no en Decisiones. Una Decisión COMMIT produce un Commitment,
y es el Commitment el que contiene las instrucciones ejecutables para el Action Executor.

**Derivación Constitucional:** R-DM-025 (Action execution derives from Decision — pero
a través del Commitment); CP-01 (ciclo completo — la acción es el último paso del ciclo);
CP-22 (compromiso explícito — el Commitment es el vehículo de la acción).

**Justificación:** Separar la Decisión (el acto de elegir) del Commitment (la obligación
de ejecutar) permite que el Action Executor opere sobre instrucciones claras y completas,
sin tener que interpretar la Decisión. El Commitment es el "contrato de ejecución" que
el Action Executor debe cumplir.

**Implicaciones Cognitivas:**
- El Action Executor no necesita saber por qué se tomó la Decisión — solo necesita saber
  qué acción ejecutar.
- El Commitment contiene toda la información necesaria para la ejecución: qué hacer,
  con qué parámetros, con qué ventana temporal.
- Si el Action Executor falla, el Commitment transiciona a FAILED y el sistema decide
  el curso de acción (reintentar, escalar).
- El Action Executor reporta el resultado (outcome) al Commitment.

**Impacto Conversacional:** La ejecución es limpia y libre de ambigüedades. El Action
Executor sabe exactamente qué hacer porque el Commitment se lo dice.

**Verificación:** ¿Existe alguna ruta donde el Action Executor reciba instrucciones
directamente de una Decisión sin pasar por un Commitment? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la interfaz Commitment → Action Executor),
COGNITIVE_ARCHITECTURE.md (define el flujo Decisión → Commitment → Action Executor).

---

### R-CM-038 — Outcome feedback from Action Executor

**Enunciado:** El resultado de la ejecución de un Commitment (outcome) debe registrarse
como Evidence y retroalimentar el modelo. El outcome incluye:

| Componente | Descripción |
|------------|-------------|
| **ID del Commitment** | Referencia al Commitment ejecutado |
| **ID de la Decisión** | Referencia a la Decisión que originó el Commitment |
| **Estado del outcome** | SUCCESS, FAILURE, PARTIAL, CANCELLED |
| **Timestamp de ejecución** | Cuándo se ejecutó la acción |
| **Métricas** | Tiempo de ejecución, costo real, satisfacción del usuario (si disponible) |
| **Error** | Si FAILURE: tipo de error, mensaje, stack trace |
| **Evidencia de corrección** | Si el outcome fue exitoso: qué lo confirma |

**Derivación Constitucional:** R-DM-026 (Outcome feedback loop); CP-37
(retroalimentación por outcome — el outcome se registra como Evidence y retroalimenta
el modelo); P-I5 (auditabilidad — el outcome es parte del registro).

**Justificación:** Sin outcomes, el sistema no aprende de sus acciones. El outcome es la
única fuente de verdad sobre si el Commitment fue correcto. El registro del outcome
cierra el ciclo de aprendizaje.

**Implicaciones Cognitivas:**
- El outcome se registra inmediatamente después de la ejecución.
- El outcome es inmutable (se registra como Evidence en el Evidence Store).
- El outcome retroalimenta: (a) la Confidence de las fuentes que contribuyeron a la
  decisión, (b) la calibración de certidumbre, (c) la estimación de Costo de Error.
- Los outcomes negativos tienen mayor peso (R-DM-042).

**Impacto Conversacional:** El sistema mejora con la experiencia. Cada acción ejecutada
es una oportunidad de aprendizaje.

**Verificación:** ¿Existe algún Commitment ejecutado cuyo outcome no se registre como
Evidence? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la captura de outcomes en el momento de
ejecución), EVIDENCE_MODEL.md (define el esquema de Evidence de outcome),
DECISION_MODEL.md (define el uso de outcomes para calibración).

---

## 18. Commitment and Projection

### R-CM-039 — Projection derives from Commitments

**Enunciado:** La Operational Projection (ONTOLOGY.md §9.2) se deriva exclusivamente de
los Commitments activos (ACTIVE) del sistema. La Proyección es la vista del mundo
operacional expresada en términos de Commitments: viajes creados, conductores
despachados, precios confirmados.

**Derivación Constitucional:** CP-27 (proyección derivada — la Proyección se deriva
del Knowledge State, que incluye los Commitments activos); CP-28 (proyección de solo
lectura — la Proyección no modifica los Commitments); ONTOLOGY.md §9.2 (Operational
Projection como vista del Knowledge State).

**Justificación:** Si la Proyección pudiera existir independientemente de los
Commitments, habría dos fuentes de verdad: lo que el sistema "dice" (Proyección) y lo
que el sistema "debe" (Commitments). La Proyección debe ser una vista derivada para
garantizar consistencia.

**Implicaciones Cognitivas:**
- La Proyección se computa en cada ciclo a partir de los Commitments activos.
- Si un Commitment se revoca, la Proyección se actualiza automáticamente.
- No puede haber un viaje en la Proyección que no corresponda a un Commitment activo.
- La Proyección incluye Commitments Informativos (interpretaciones activas) y
  Operacionales (acciones en curso).

**Impacto Conversacional:** El sistema presenta una visión coherente y actualizada del
estado operacional. No hay discrepancias entre lo que el sistema "dice que hay" y lo que
"realmente hay."

**Verificación:** ¿Existe algún elemento en la Operational Projection que no corresponda
a un Commitment activo? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la estructura de la Proyección derivada de
Commitments), COGNITIVE_ARCHITECTURE.md (define el proceso de derivación en la fase de
Proyección).

---

### R-CM-040 — Projection does not modify Commitments

**Enunciado:** La Operational Projection es una vista de solo lectura de los Commitments
activos. No puede modificar, crear, ni eliminar Commitments. Toda modificación de
Commitments debe pasar por el Ciclo Cognitivo (nueva Evidence → nueva Decisión → nuevo
Commitment).

**Derivación Constitucional:** CP-28 (proyección de solo lectura); CP-27 (proyección
derivada — la Proyección no tiene autoridad para modificar su fuente).

**Justificación:** Si la Proyección pudiera modificar Commitments, habría un camino
para cambiar el estado operacional sin pasar por el Ciclo Cognitivo. Esto violaría
S-P1 (Evidence-Based Operation) porque las modificaciones no estarían fundamentadas en
Evidence.

**Implicaciones Cognitivas:**
- La Proyección es un cálculo, no un almacén de estado.
- La Proyección se recalcula en cada ciclo, no se "actualiza" incrementalmente.
- Las correcciones operacionales (ej.: cambiar un destino incorrecto en la interfaz
  del operador) deben iniciar un nuevo Ciclo Cognitivo.

**Impacto Conversacional:** Las correcciones que hace el sistema siempre están
justificadas por nueva información o decisión explícita. No hay cambios silenciosos en
el estado operacional.

**Verificación:** ¿Existe algún mecanismo en la Proyección que permita modificar
Commitments directamente? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la Proyección como vista de solo lectura),
COGNITIVE_ARCHITECTURE.md (define el proceso de derivación en cada ciclo).

---

## 19. Persistence and Reconstruction

### R-CM-041 — Commitment records are persistent

**Enunciado:** Los registros de Commitment deben persistirse de forma duradera e
inmutable. No pueden almacenarse exclusivamente en memoria volátil. La persistencia
debe garantizar que los registros sobreviven a reinicios del sistema.

**Derivación Constitucional:** S-P6 (Knowledge Preservation — el sistema nunca debe
perder sus compromisos activos); R-DM-043 (Decision records are persistent — mismo
principio aplicado a Commitments); P-I5 (auditabilidad).

**Justificación:** Si los registros de Commitment se pierden en un reinicio, el sistema
pierde sus obligaciones activas. Los viajes confirmados, los conductores despachados,
los precios acordados — todo se pierde. La persistencia duradera es necesaria para la
continuidad operacional.

**Implicaciones Cognitivas:**
- Los registros de Commitment se almacenan en el mismo sistema de persistencia que el
  Evidence Store (o en uno compatible).
- La escritura del registro ocurre sincrónicamente con la creación del Commitment.
- Si la escritura falla, el Commitment no puede crearse (el Gate lo rechaza).
- La lectura de Commitments activos debe ser rápida (operación crítica para el ciclo).

**Impacto Conversacional:** La continuidad del servicio está garantizada. Si el sistema
se reinicia, retoma sus compromisos activos sin perder información.

**Verificación:** ¿Existe algún Commitment cuyo registro pueda perderse en un reinicio
del sistema? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (define el esquema de persistencia),
EVIDENCE_MODEL.md (comparte el mismo sistema de persistencia).

---

### R-CM-042 — State reconstruction from Commitments

**Enunciado:** El estado operacional del sistema (viajes activos, conductores despachados,
precios confirmados) debe poder reconstruirse completamente a partir de los registros de
Commitment persistidos. Dado que toda acción operacional es consecuencia de un Commitment,
el conjunto de Commitments ACTIVE define el estado operacional completo.

**Derivación Constitucional:** CP-29 (reconstrucción desde Evidence); S-P6 (Knowledge
Preservation); R-DM-044 (State reconstruction from decisions — los Commitments son el
siguiente eslabón en la cadena).

**Justificación:** Si el estado volátil se pierde (reinicio, fallo), los registros de
Commitment deben ser suficientes para reconstruir el estado operacional completo:
qué viajes están activos, qué conductores están asignados, qué precios están confirmados.

**Implicaciones Cognitivas:**
- La reconstrucción lee todos los Commitment con estado ACTIVE o PENDING.
- Para cada uno, determina su vigencia (no expirado, no revocado).
- El resultado es el conjunto de obligaciones activas del sistema.
- La reconstrucción debe ocurrir antes de que el sistema procese nuevos Signals después
  de un reinicio.

**Impacto Conversacional:** Después de un reinicio, el sistema retoma las operaciones
sin perder información. Los viajes activos continúan, los compromisos se mantienen.

**Verificación:** ¿Existe algún estado operacional del sistema que no pueda reconstruirse
a partir de los registros de Commitment? Si sí → violación.

**Delegación:** COMMITMENT_MODEL implementation (provee la query de Commitments activos),
COGNITIVE_ARCHITECTURE.md (define el flujo de recovery post-reinicio).

---

### R-CM-043 — Reconstruction chain: Decision → Commitment → Action

**Enunciado:** La cadena de reconstrucción completa desde la Decisión hasta la Acción
debe ser:

```
Decisión COMMIT → Commitment → Acción → Outcome
```

Cada eslabón referencia al anterior. Dado un ID de Decisión, debe ser posible recuperar:
el Commitment que produjo, la Acción que ejecutó, y el Outcome que resultó.

**Derivación Constitucional:** P-I5 (Auditability of Every Decision); CP-29
(reconstrucción desde Evidence); R-DM-032 (Five-level traceability chain — Commitment
es parte de los 5 niveles).

**Justificación:** Esta cadena es la columna vertebral de la auditabilidad operacional.
Sin ella, una decisión existe pero no puede conectarse con su ejecución y resultado.

**Implicaciones Cognitivas:**
- La cadena se construye en el momento de la creación del Commitment.
- Cada eslabón se almacena como referencia cruzada.
- La cadena debe ser recuperable mediante consultas deterministas.
- La cadena incluye: Decisión → (Belief → Evidence → Observation → Signal) + Commitment
  → Acción → Outcome.

**Verificación:** ¿Existe algún Commitment cuyo registro no permita reconstruir la
cadena completa hasta la Decisión que lo originó y el Outcome que produjo? Si sí →
violación.

**Delegación:** COMMITMENT_MODEL implementation (implementa las referencias cruzadas),
EVIDENCE_MODEL.md (define la cadena de trazabilidad), COGNITIVE_ARCHITECTURE.md (define
la construcción de la cadena en cada fase).

---

## 20. Invariants

### R-CM-044 — No commitment without a Decision

**Enunciado:** No puede existir un Commitment que no tenga una Decisión COMMIT como
origen. Si existe un Commitment huérfano, es una violación del modelo.

**Verificación:** Todo Commitment debe tener una referencia a una Decisión COMMIT.
Un Commitment sin referencia es inválido.

**Fuente:** R-DM-046, CP-22, R-CM-030.

---

### R-CM-045 — No action without a Commitment

**Enunciado:** No puede ejecutarse una acción operacional sin que exista un Commitment
ACTIVE que la autorice. Una acción sin Commitment es una acción ilegítima.

**Verificación:** Toda acción ejecutada por el Action Executor debe tener una referencia
a un Commitment ACTIVE.

**Fuente:** CP-01, CP-22, R-CM-037.

---

### R-CM-046 — Commitment record immutability

**Enunciado:** Una vez registrado, el núcleo de un Commitment (sus atributos esenciales,
R-CM-010) no puede modificarse. Ni su tipo, ni su fundamento, ni su certeza, ni su
costo de error. Las correcciones se hacen mediante nuevos Commitments o eventos de
transición.

**Verificación:** No existe una operación de "modificar Commitment" que cambie atributos
esenciales.

**Fuente:** S-P5 (por analogía epistémica), CP-08, R-CM-011.

---

### R-CM-047 — Single active commitment per operational entity

**Enunciado:** Para cada entidad operacional (viaje, conductor, transacción), el sistema
puede tener exactamente un Commitment Operacional activo (ACTIVE) por tipo de acción.
No puede haber dos Commitments de Dispatch activos para el mismo viaje, ni dos
Commitments de TripCreation para el mismo viaje.

**Verificación:** En un momento dado, para cada combinación (entidad, subtipo), hay como
máximo un Commitment ACTIVE.

**Fuente:** R-DM-048 (aplicado por analogía a Commitments), R-CM-026 (conflictos).

---

### R-CM-048 — Commitment must respect authority boundaries

**Enunciado:** El sistema no puede crear Commitments que excedan su autoridad autónoma
(CONSTITUTION.md §5.2). Los Commitments que requieren autoridad humana deben pasar a
ESCALATE automáticamente.

**Verificación:** Ningún Commitment Operacional puede violar los límites de autoridad
definidos en CONSTITUTION.md §5.2.

**Fuente:** CONSTITUTION.md §5.2, S-P7, R-DM-049.

---

### R-CM-049 — Commitment temporal consistency

**Enunciado:** Todo Commitment debe tener una ventana temporal definida (R-CM-009) y
un timestamp de creación. Ningún Commitment puede tener una ventana temporal negativa
(creación después de expiración) o indefinida (sin límite).

**Verificación:** Todo Commitment tiene un timestamp de creación y una ventana temporal
> 0.

**Fuente:** CP-04, R-CM-009.

---

### R-CM-050 — Deterministic commitment creation

**Enunciado:** Dado el mismo Knowledge State (misma Evidence, mismas Certainties, mismo
Costo de Error, misma Strategic Posture, misma Decisión COMMIT), el sistema debe producir
el mismo Commitment (mismo tipo, mismo subtipo, mismos parámetros). La creación del
Commitment debe ser determinista.

**Verificación:** Si dos ejecuciones con el mismo contexto producen Commitments
diferentes, el sistema viola este invariante.

**Fuente:** S-P4 (por analogía — el compromiso debe ser tan determinista como la
percepción), CP-07 (espíritu de determinismo).

---

## 21. Delegation to Implementation Documents

### 21.1 Documents that concretize this model

| Document | What it concretizes from this model |
|----------|-------------------------------------|
| **COGNITIVE_ARCHITECTURE.md** (Level II-b) | Commitment Gate (R-CM-015), motor de estados (R-CM-007, R-CM-008), watchdog de expiración (R-CM-009), monitoreo de Commitments (R-CM-020), detección de conflictos (R-CM-026, R-CM-027), flujo de revocación (R-CM-024), flujo de recovery (R-CM-042), flujo de escalación (R-CM-022) |
| **ACTION_EXECUTOR.md** (Level III-g) | Protocolo de ejecución (R-CM-020), captura de outcomes (R-CM-038), interfaz Commitment → Action Executor (R-CM-037), ejecución de compensaciones (R-CM-025) |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Cálculo de umbral (R-CM-016), función de degradación operacional (R-CM-034) |
| **DECISION_MODEL.md** (Level III-b) | Costos de error por subtipo (R-CM-036), umbrales base (R-CM-016), reglas de precedencia (R-CM-028) |
| **EVIDENCE_MODEL.md** (Level III-a) | Esquema de Evidence de outcome (R-CM-038), registro de eventos de transición (R-CM-011), cadena de trazabilidad (R-CM-043) |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Proyección derivada de Commitments (R-CM-039), Proyección de solo lectura (R-CM-040), reconstrucción (R-CM-042) |
| **CHANNEL_ADAPTER.md** (Level III-e) | Comunicación de Commitments al usuario (R-CM-017, R-CM-019), paquete de escalación (R-CM-023), expresión de obligación vs. información (R-CM-002) |
| **COMMITMENT_MODEL implementation** (Level IV) | Esquema de datos (R-CM-010), máquina de estados (R-CM-007, R-CM-008), persistencia (R-CM-041), verificación de precondiciones (R-CM-013), referencias cruzadas (R-CM-043) |

### 21.2 Traceability matrix

| Rule | Source CP | Source CONSTITUTION | Source DECISION_MODEL | Source EVIDENCE_MODEL | Implements for |
|------|-----------|-------------------|----------------------|----------------------|----------------|
| R-CM-001 | CP-22 | S-P1, ONTOLOGY §8.2 | R-DM-001 | — | COGNITIVE_ARCHITECTURE.md, ACTION_EXECUTOR.md |
| R-CM-002 | CP-22 | S-P1, P-I5 | — | — | CHANNEL_ADAPTER.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-003 | CP-01, CP-02, CP-22 | ONTOLOGY §7.4 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-CM-004 | CP-25 | P-E5 | R-DM-005 | — | COGNITIVE_ARCHITECTURE.md, DECISION_MODEL.md |
| R-CM-005 | CP-24, CP-25 | §5.2 | — | — | DECISION_MODEL.md, ACTION_EXECUTOR.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-006 | CP-25 | — | — | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-007 | CP-22, CP-04, CP-26 | S-P7, P-I5 | R-DM-006, R-DM-023 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-008 | CP-22, CP-04, CP-26, CP-39 | S-P7, P-I5 | — | — | COGNITIVE_ARCHITECTURE.md, ACTION_EXECUTOR.md, COMMITMENT_MODEL implementation |
| R-CM-009 | CP-04, CP-26 | S-P7 | R-DM-007 | — | COGNITIVE_ARCHITECTURE.md, DECISION_MODEL.md |
| R-CM-010 | CP-22 | P-I5 | R-DM-024 | — | COMMITMENT_MODEL implementation, COGNITIVE_ARCHITECTURE.md |
| R-CM-011 | CP-08 | S-P5, P-I5 | — | — | COMMITMENT_MODEL implementation, EVIDENCE_MODEL.md |
| R-CM-012 | — | ONTOLOGY §3.1, P-I5 | — | R-EM-013 | COMMITMENT_MODEL implementation, EVIDENCE_MODEL.md |
| R-CM-013 | CP-22 | S-P1, §5.2, S-P7 | R-DM-008 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-014 | CP-22 | S-P6, S-P7 | — | — | COGNITIVE_ARCHITECTURE.md, ACTION_EXECUTOR.md |
| R-CM-015 | CP-22, CP-23 | — | R-DM-023 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-016 | CP-23 | §3.4, P-E5 | R-DM-010 | — | CERTAINTY_CALCULUS.md, DECISION_MODEL.md |
| R-CM-017 | CP-25 | P-I4, P-E3 | — | — | COGNITIVE_ARCHITECTURE.md, CHANNEL_ADAPTER.md |
| R-CM-018 | CP-25, CP-22, CP-35 | — | — | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-019 | CP-25 | §5.2, S-P7 | — | — | ACTION_EXECUTOR.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-020 | CP-35, CP-01 | S-P7 | — | — | ACTION_EXECUTOR.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-021 | CP-25 | P-E5, S-P7 | R-DM-021 | — | DECISION_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-022 | CP-26 | S-P7 | R-DM-012 | — | COGNITIVE_ARCHITECTURE.md, CHANNEL_ADAPTER.md |
| R-CM-023 | CP-26 | S-P7, P-I5 | — | — | CHANNEL_ADAPTER.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-024 | P-E4, CP-39 | — | R-DM-022 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-025 | — | §2.3, S-P7 | — | — | ACTION_EXECUTOR.md, DECISION_MODEL.md, KNOWLEDGE_MODEL.md |
| R-CM-026 | CP-10 | — | R-DM-027 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-027 | CP-10 | S-P8 | R-DM-027, R-DM-028 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-028 | CP-25 | S-P8 | R-DM-028 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-029 | P-E4, CP-34 | — | R-DM-029 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-030 | CP-22 | — | R-DM-023, R-DM-046 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-031 | CP-22 | P-I5 | R-DM-024 | — | COMMITMENT_MODEL implementation, COGNITIVE_ARCHITECTURE.md |
| R-CM-032 | CP-22 | — | R-DM-023 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL implementation |
| R-CM-033 | CP-18, CP-08 | — | R-DM-014 | — | COMMITMENT_MODEL implementation, CERTAINTY_CALCULUS.md |
| R-CM-034 | CP-19, CP-20 | — | — | — | CERTAINTY_CALCULUS.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-035 | CP-24 | P-I5 | R-DM-016 | — | DECISION_MODEL.md, COMMITMENT_MODEL implementation |
| R-CM-036 | CP-24, CP-23 | — | R-DM-016 | — | DECISION_MODEL.md, COMMITMENT_MODEL implementation |
| R-CM-037 | CP-01, CP-22 | — | R-DM-025 | — | ACTION_EXECUTOR.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-038 | CP-37 | P-I5 | R-DM-026 | — | ACTION_EXECUTOR.md, EVIDENCE_MODEL.md, DECISION_MODEL.md |
| R-CM-039 | CP-27, CP-28 | — | — | — | KNOWLEDGE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-040 | CP-28, CP-27 | — | — | — | KNOWLEDGE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-041 | CP-29 | S-P6, P-I5 | R-DM-043 | — | COMMITMENT_MODEL implementation, EVIDENCE_MODEL.md |
| R-CM-042 | CP-29 | S-P6 | R-DM-044 | — | COMMITMENT_MODEL implementation, COGNITIVE_ARCHITECTURE.md |
| R-CM-043 | CP-29 | P-I5 | R-DM-032 | R-EM-063 | COMMITMENT_MODEL implementation, EVIDENCE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-CM-044 | CP-22 | — | R-DM-046 | — | COMMITMENT_MODEL implementation |
| R-CM-045 | CP-01, CP-22 | — | — | — | ACTION_EXECUTOR.md |
| R-CM-046 | CP-08 | S-P5 | — | — | COMMITMENT_MODEL implementation |
| R-CM-047 | — | — | R-DM-048 | — | COMMITMENT_MODEL implementation, COGNITIVE_ARCHITECTURE.md |
| R-CM-048 | — | §5.2, S-P7 | R-DM-049 | — | COGNITIVE_ARCHITECTURE.md |
| R-CM-049 | CP-04 | — | — | — | COMMITMENT_MODEL implementation |
| R-CM-050 | CP-07 (espíritu), S-P4 | — | R-DM-050 | — | COMMITMENT_MODEL implementation |

---

## Appendix — Summary of Delegations Received

This document concretizes the following delegations from higher-level documents:

### From COGNITIVE_PRINCIPLES.md (§13.2):

| CP | Principle | Concretized by |
|----|-----------|----------------|
| CP-22 | Compromiso explícito | R-CM-001, R-CM-002, R-CM-003, R-CM-007, R-CM-013, R-CM-015, R-CM-030, R-CM-031, R-CM-032 |
| CP-23 | Umbral dinámico | R-CM-015, R-CM-016 |
| CP-24 | Costo de error | R-CM-035, R-CM-036 |
| CP-25 | Informativo vs. operacional | R-CM-004, R-CM-005, R-CM-006, R-CM-017, R-CM-018, R-CM-019, R-CM-021 |
| CP-26 | Escalamiento por insuficiencia | R-CM-022, R-CM-023 |
| CP-35 | Explicación antes de acción | R-CM-018, R-CM-020 |

### From DECISION_MODEL.md (§23.1):

| DM Rule | Topic | Concretized by |
|---------|-------|----------------|
| R-DM-001 | Decisión → Commitment | R-CM-001, R-CM-030 |
| R-DM-003 | Dominios de decisión | R-CM-004, R-CM-031 |
| R-DM-004 | Alternativas (COMMIT) | R-CM-015, R-CM-030 |
| R-DM-006 | Lifecycle de decisión | R-CM-007, R-CM-008 |
| R-DM-012 | Escalamiento | R-CM-022, R-CM-023 |
| R-DM-016 | Costo de Error | R-CM-035, R-CM-036 |
| R-DM-021 | Reversibilidad | R-CM-021 |
| R-DM-022 | Revocación | R-CM-024, R-CM-025 |
| R-DM-023 | Gate Decisión → Commitment | R-CM-015, R-CM-030, R-CM-032 |
| R-DM-024 | Commitment records reference Decision | R-CM-010, R-CM-031 |
| R-DM-027 | Conflictos entre decisiones | R-CM-026, R-CM-027 |
| R-DM-028 | Precedencia | R-CM-027, R-CM-028 |
| R-DM-029 | Consistencia entre ciclos | R-CM-029 |
| R-DM-030 | Revisión de decisiones | R-CM-024 |
| R-DM-044 | Reconstrucción desde decisiones | R-CM-042, R-CM-043 |
| R-DM-046 | No commitment without decision | R-CM-030, R-CM-044 |

---

*Fin de 06-COMMITMENT_MODEL.md — Versión 1.0-draft*

> Este documento fue redactado a partir de la delegación constitucional de
> COGNITIVE_PRINCIPLES.md (CP-22, CP-23, CP-24, CP-25, CP-26, CP-35), los contratos
> de DECISION_MODEL.md (R-DM-001 a R-DM-046), y la terminología de ONTOLOGY.md.
> Es un DRAFT hasta su ratificación mediante el proceso de gobierno de la Constitución
> (CONSTITUTION.md Sección 7.2).
> Fecha: 2026-07-11
