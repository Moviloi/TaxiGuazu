# AITOS Cognitive Constitution — 05-DECISION_MODEL.md

> **Decision Model of the AI Transportation Operating System**
>
> Status: **DRAFT** — first writing from Constitutional delegation
> Version: 1.0-draft
> Date: 2026-07-11
>
> ⚠️ This document belongs to **Level III-b (Contractual Authority)** of the AITOS
> Document Hierarchy (CONSTITUTION.md §6). It derives from CONSTITUTION.md (Level I-a),
> SYSTEM_VOCABULARY.md (Level I-b), COGNITIVE_PRINCIPLES.md (Level II-a), and
> EVIDENCE_MODEL.md (Level III-a).
>
> This document does not redefine any term or principle from its source documents.
> It operationalizes them. Every rule herein is binding on Level IV documents
> (source code, prompts, configuration, runbooks). Violations are implementation debt
> managed under S-P9.

---

## Table of Contents

1. [Preamble — What This Model Is](#1-preamble--what-this-model-is)
2. [Nature of a Decision](#2-nature-of-a-decision)
3. [The Decision Space](#3-the-decision-space)
4. [Lifecycle of a Decision](#4-lifecycle-of-a-decision)
5. [Preconditions and Postconditions](#5-preconditions-and-postconditions)
6. [Sufficiency, Abstention, and Escalation](#6-sufficiency-abstention-and-escalation)
7. [Evidence and Certainty in Decision-Making](#7-evidence-and-certainty-in-decision-making)
8. [Cost of Error](#8-cost-of-error)
9. [Uncertainty Resolution and Multi-Alternative Decisions](#9-uncertainty-resolution-and-multi-alternative-decisions)
10. [Reversible and Irreversible Decisions](#10-reversible-and-irreversible-decisions)
11. [Decision and Commitment](#11-decision-and-commitment)
12. [Decision and Action Executor](#12-decision-and-action-executor)
13. [Conflicts Between Decisions](#13-conflicts-between-decisions)
14. [Consistency and Revision](#14-consistency-and-revision)
15. [Traceability and Audit](#15-traceability-and-audit)
16. [Business Constraints and Conversational Context](#16-business-constraints-and-conversational-context)
17. [Strategic Posture](#17-strategic-posture)
18. [Intent Handling and Prioritization](#18-intent-handling-and-prioritization)
19. [Hypothesis Resolution and the Decision Gate](#19-hypothesis-resolution-and-the-decision-gate)
20. [Learning from Decision Outcomes](#20-learning-from-decision-outcomes)
21. [Persistence and Reconstruction](#21-persistence-and-reconstruction)
22. [Invariants](#22-invariants)
23. [Delegation to Implementation Documents](#23-delegation-to-implementation-documents)

---

## 1. Preamble — What This Model Is

### 1.1 Purpose

This document specifies the **Decision Model** of AITOS: the complete normative definition
of what a Decision is, when it can be taken, when it must be postponed or rejected, how it
uses Evidence, Certainty, and Cost of Error, and how it transforms into Commitment and
Action.

The Decision Model is the **cognitive engine** of the system. Every interaction with a
passenger, every trip created, every driver dispatched, every price quoted — all are the
output of decisions made according to this model.

### 1.2 Scope

This document governs:

1. **What constitutes a Decision** in AITOS — its nature, anatomy, and lifecycle.
2. **When a Decision may be taken** — preconditions, sufficiency criteria, thresholds.
3. **When a Decision must be postponed or rejected** — abstention and escalation rules.
4. **How a Decision uses cognitive resources** — Evidence, Certainty, Cost of Error,
   Knowledge State, Strategic Posture.
5. **How a Decision transforms into Commitment and Action**.
6. **How Decisions are recorded, traced, and audited**.
7. **How the system learns from Decision outcomes**.

This document does **NOT** govern:

- The Evidence Store or Evidence lifecycle (see EVIDENCE_MODEL.md).
- The mathematical computation of Certainty (see CERTAINTY_CALCULUS.md).
- The Commitment state machine and lifecycle (see COMMITMENT_MODEL.md).
- The technical implementation of Action execution (see ACTION_EXECUTOR.md).
- The specific algorithms, data structures, or APIs used to implement decisions.

### 1.3 Authority hierarchy

| Source document | Relationship to this document |
|----------------|------------------------------|
| **CONSTITUTION.md** (Level I-a) | Source of supreme principles: S-P1 (Evidence-Based Operation), S-P7 (Human Escalation), P-I1 (Evidence Primacy), P-I4 (Humility Before Uncertainty), P-I5 (Auditability), P-E5 (Proportional Response) |
| **SYSTEM_VOCABULARY.md** (Level I-b) | Source of all terminology: Decision (8.1), Commitment (8.2), Cost of Error (8.3), Certainty Threshold (8.4), Strategic Posture (8.5), Intent (8.6), Hypothesis (6.4), Belief (5.2) |
| **COGNITIVE_PRINCIPLES.md** (Level II-a) | Source of cognitive principles: CP-04, CP-10 through CP-17, CP-19, CP-21 through CP-26, CP-34, CP-36, CP-37, CP-38 |
| **EVIDENCE_MODEL.md** (Level III-a) | Defines the Evidence that feeds into decisions; sibling document |

### 1.4 Reading this document

Each rule in this document follows this uniform format:

```
### R-DM-NNN — Name of the rule

**Enunciado:** The normative statement.

**Derivación Constitucional:** References to CONSTITUTION.md, SYSTEM_VOCABULARY.md,
COGNITIVE_PRINCIPLES.md, and/or EVIDENCE_MODEL.md.

**Justificación:** Why this rule exists and what architectural problem it solves.

**Implicaciones Cognitivas:** How the system's behavior is affected.

**Impacto Conversacional:** What observable improvement this produces in the user experience.

**Verificación:** Binary criterion to determine if a change violates this rule.

**Delegación:** Which Level III or Level IV documents must concretize this rule.
```

---

## 2. Nature of a Decision

### R-DM-001 — Definition of a Decision

**Enunciado:** Una Decisión es un acto cognitivo explícito mediante el cual el sistema
elige entre alternativas — comprometer, clarificar, escalar, o abstenerse — basándose en
la Evidence acumulada, la Certainty resultante, y el Costo de Error estimado. Una Decisión
no es un output; es un proceso que produce un output.

**Derivación Constitucional:** CONSTITUTION.md §2.2 (el sistema no es un árbol de decisión
basado en reglas — evalúa certidumbre contra costo de error); SYSTEM_VOCABULARY.md §8.1 (Decisión
como "a choice among alternatives that results in a Commitment"); CP-17 (resolución por
Evidence); CP-22 (compromiso explícito).

**Justificación:** La Constitución establece que AITOS no aplica reglas if-enteras para
clasificar inputs. Opera mediante un proceso explícito de evaluación de certidumbre y
costo de error. La Decisión debe ser un acto consciente, no un deslizamiento implícito
a través de estados. Esto es necesario para auditabilidad (P-I5) y para garantizar que
cada acción tiene un fundamento epistémico verificable (S-P1).

**Implicaciones Cognitivas:**
- Cada Decisión ocurre en un punto identificable del Ciclo Cognitivo (la transición entre
  Razonamiento y Compromiso).
- Ninguna acción operacional puede ejecutarse sin una Decisión explícita que la autorice.
- La Decisión no es el output del sistema — es el acto de elegir entre opciones. El output
  es el Commitment que resulta de esa elección.
- No existe "decisión por omisión". Si el sistema no elige explícitamente, no hay Decisión.

**Impacto Conversacional:** El usuario recibe respuestas consistentes y justificadas.
Nunca experimenta acciones arbitrarias o decisiones inconsistentes con la información
disponible. Cuando el sistema dice "confirmo tu viaje", es porque hubo una Decisión
explícita de comprometerse, no porque "el flujo llegó a ese punto".

**Verificación:** ¿Existe alguna ruta en el sistema donde se ejecute una acción
operacional sin que haya pasado por un punto de Decisión explícito que evalúe Evidence,
Certainty y Costo de Error? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el gate de Decisión en el ciclo),
COMMITMENT_MODEL.md (define cómo la Decisión produce un Commitment).

---

### R-DM-002 — Decision is a cognitive act, not a data structure

**Enunciado:** Una Decisión no es un registro en una base de datos ni un campo en un
objeto. Es un acto cognitivo que ocurre en un momento del tiempo, en un contexto
específico, y produce un Commitment que persiste. El registro de la Decisión es evidencia
de ese acto, no el acto mismo.

**Derivación Constitucional:** CONSTITUTION.md §2.1 (AITOS opera mediante ciclo
cognitivo, no mediante máquina de estados); CP-22 (compromiso explícito).

**Justificación:** En sistemas state-dominant, la "decisión" es simplemente alcanzar
cierto estado. En AITOS, la Decisión es el acto cognitivo de evaluar si la Evidence
es suficiente para comprometerse. Confundir el acto con su registro llevaría a sistemas
donde "si el registro existe, la decisión ocurrió" — incluso si el registro se creó por
una ruta que nunca evaluó Evidence.

**Implicaciones Cognitivas:**
- La Decisión ocurre en el Razonamiento y se materializa en el Compromiso.
- El registro de la Decisión (traza) es un output del acto, no el acto mismo.
- No se puede "reproducir" una Decisión sin reproducir el contexto cognitivo que la produjo.

**Impacto Conversacional:** Las decisiones del sistema se sienten contextualmente
apropiadas. No hay casos donde el sistema actúe "como si hubiera decidido" algo que
nunca evaluó explícitamente.

**Verificación:** ¿Existe algún mecanismo donde crear un registro de Decisión (ej.:
cambiar un estado en la base de datos) se considere equivalente a haber tomado la
Decisión? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo Decisión → Commitment →
registro), COMMITMENT_MODEL.md (define el registro como consecuencia, no como causa).

---

### R-DM-003 — Scope of decisions

**Enunciado:** El sistema puede tomar decisiones en tres dominios:

| Dominio | Qué decide | Ejemplo |
|---------|-----------|---------|
| **Epistémico** | Qué cree el sistema | Resolver una Hipótesis en favor de "origen = Asunción" |
| **Compromiso** | A qué se obliga el sistema | Confirmar un viaje, despachar un conductor |
| **Interacción** | Qué comunica el sistema y cuándo | Preguntar para clarificar, explicar antes de actuar, callar cuando no es necesario |

Cada dominio tiene reglas específicas pero comparten el mismo fundamento epistémico.

**Derivación Constitucional:** CONSTITUTION.md §2.3 (seguridad, confiabilidad,
eficiencia); CP-22 (compromiso explícito); CP-32 (preguntar con propósito).

**Justificación:** No todas las decisiones en AITOS son compromisos operacionales. El
sistema también decide qué creer, qué preguntar, y cómo comunicarse. Cada tipo de
decisión tiene diferentes consecuencias y diferentes umbrales. Distinguirlos permite
calibrar cada tipo apropiadamente.

**Implicaciones Cognitivas:**
- Las decisiones epistémicas ocurren en el Razonamiento: resuelven Hipótesis en Beliefs.
- Las decisiones de compromiso ocurren en el Compromiso: transforman Beliefs en
  Commitments.
- Las decisiones de interacción ocurren en la Proyección: determinan cómo se comunica
  el resultado.
- Una decisión epistémica no implica un compromiso. El sistema puede creer algo sin
  comprometerse operacionalmente a ello.

**Impacto Conversacional:** El usuario experimenta un sistema que sabe discriminar entre
"esto es lo que creo" y "esto es a lo que me comprometo". No recibe confirmaciones
operacionales cuando el sistema solo tiene una creencia provisional. La comunicación es
honesta y proporcionada.

**Verificación:** ¿Existe algún flujo donde una decisión epistémica (creer algo) se
trate automáticamente como un compromiso operacional (actuar sobre ello) sin pasar por
el gate de compromiso? Si sí → violación.

**Delegación:** DECISION_MODEL.md (este mismo documento define los tres dominios),
COMMITMENT_MODEL.md (define la transición de epistémico a compromiso).

---

## 3. The Decision Space

### R-DM-004 — Decision alternatives

**Enunciado:** En cada Ciclo Cognitivo, el sistema evalúa exactamente cuatro alternativas
de decisión:

| Alternativa | Significado | Cuándo se elige |
|-------------|-------------|-----------------|
| **COMMIT** | Comprometerse: ejecutar la acción prevista | Certainty ≥ umbral de compromiso |
| **CLARIFY** | Preguntar al usuario por más información | Certainty insuficiente pero puede obtenerse más Evidence |
| **ESCALATE** | Transferir a un operador humano | Certainty insuficiente y no puede obtenerse más Evidence, o costo de error demasiado alto |
| **ABSTAIN** | No hacer nada (esperar, observar) | No hay suficiente información ni urgencia, o la acción no es necesaria |

No existe una quinta alternativa. El sistema no puede "inventar" información, "adivinar"
la respuesta, o tomar una acción no soportada por Evidence.

**Derivación Constitucional:** CONSTITUTION.md §3.4 (suficiencia, no certidumbre),
S-P7 (escalamiento humano), CP-22 (compromiso explícito), CP-26 (escalamiento por
insuficiencia).

**Justificación:** Este conjunto cerrado de alternativas garantiza que el sistema nunca
actúe sin fundamento. Si no puede comprometerse con certidumbre suficiente, debe
clarificar o escalar. Si no hay suficiente Evidence ni siquiera para clarificar, debe
abstenerse. La prohibición de una quinta alternativa cierra la puerta a "decisiones
por intuición" o "defaults no fundamentados."

**Implicaciones Cognitivas:**
- El sistema siempre evalúa las cuatro alternativas en cada Ciclo Cognitivo.
- La evaluación sigue un orden epistémico: primero evaluar si COMMIT es posible; si no,
  evaluar CLARIFY; si no, evaluar ESCALATE; si no, ABSTAIN.
- ABSTAIN no es inacción indefinida — debe estar acotada temporalmente (CP-04).
- Las cuatro alternativas son mutuamente excluyentes para un mismo Ciclo Cognitivo.

**Impacto Conversacional:** El usuario nunca recibe respuestas falsamente seguras ni
silencio indefinido. Cuando el sistema no está seguro, pide clarificación o informa que
escalará. Cuando no puede hacer nada, lo comunica en lugar de ignorar al usuario.

**Verificación:** ¿Existe alguna ruta de decisión en el sistema que produzca un resultado
diferente de COMMIT, CLARIFY, ESCALATE, o ABSTAIN? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el gate de decisión con 4 salidas),
COMMITMENT_MODEL.md (define COMMIT en detalle), CHANNEL_ADAPTER.md (define cómo se
comunican CLARIFY y ESCALATE al usuario).

---

### R-DM-005 — Decision hierarchy per domain

**Enunciado:** Dentro de cada dominio epistémico (R-DM-003), las cuatro alternativas
se evalúan con umbrales diferentes:

| Dominio | Orden de evaluación | Umbral característico |
|---------|---------------------|----------------------|
| **Epistémico** | COMMIT (resolver Hipótesis), CLARIFY (pedir más Evidence), ESCALATE (si no hay fuente), ABSTAIN (mantener Hipótesis activa) | Umbral de formación de creencia (más bajo) |
| **Compromiso** | COMMIT (ejecutar acción), CLARIFY (confirmar con usuario), ESCALATE (operador humano), ABSTAIN (no operar) | Umbral de compromiso operacional (más alto) |
| **Interacción** | COMMIT (responder), CLARIFY (preguntar), ESCALATE (derivar a humano), ABSTAIN (no responder aún) | Umbral de comunicación (medio) |

**Derivación Constitucional:** CP-25 (compromiso informativo vs. operacional),
CP-12 (suficiencia mínima), P-E5 (respuesta proporcionada).

**Justificación:** Cada dominio tiene consecuencias diferentes de error. Comprometerse
con una creencia equivocada (error epistémico) es menos grave que comprometerse con una
acción equivocada (error operacional). Los umbrales deben reflejar estas diferencias.

**Implicaciones Cognitivas:**
- El sistema puede decidir COMMIT en el dominio epistémico y CLARIFY en el dominio de
  compromiso en el mismo ciclo: "creo que el origen es Asunción, pero necesito confirmar
  antes de despachar."
- Los umbrales no son líneas rígidas — son rangos que se solapan. Un mismo nivel de
  Certainty puede ser suficiente para creer pero insuficiente para comprometerse.

**Impacto Conversacional:** El sistema puede confirmar interpretaciones sin
comprometerse operacionalmente: "Entendí que quieres ir al aeropuerto, ¿confirmo el
viaje?" Esto da transparencia al usuario y evita acciones prematuras.

**Verificación:** ¿Existe algún flujo donde los umbrales de los tres dominios sean
idénticos o estén unificados? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define los umbrales por dominio), CERTAINTY_CALCULUS.md
(provee la función de comparación).

---

## 4. Lifecycle of a Decision

### R-DM-006 — Decision lifecycle states

**Enunciado:** Una Decisión pasa por los siguientes estados:

| Estado | Significado | Transiciones |
|--------|-------------|--------------|
| **DELIBERATING** | El sistema está evaluando alternativas | → RESOLVED, → EXPIRED, → VOID |
| **RESOLVED** | El sistema ha elegido una alternativa (COMMIT, CLARIFY, ESCALATE, ABSTAIN) | → EXECUTING (solo COMMIT), → REPORTED, → REVISED |
| **EXECUTING** | El Commitment se está materializando en acciones | → COMMITTED, → FAILED |
| **COMMITTED** | El Commitment se ha materializado exitosamente | → SUPERSEDED (si se revisa), → CLOSED |
| **REPORTED** | La decisión ha sido comunicada al usuario o al operador | → CLOSED |
| **REVISED** | La decisión fue reconsiderada y reemplazada por otra | → CLOSED |
| **FAILED** | La ejecución del Commitment falló | → RETRY (si es posible), → CLOSED |
| **EXPIRED** | La decisión excedió el tiempo límite sin resolverse | → ESCALATE automático |
| **VOID** | La decisión fue invalidada antes de producir efecto | (terminal) |
| **CLOSED** | La decisión ya no tiene impacto operacional | (terminal) |

**Derivación Constitucional:** CP-22 (compromiso explícito), CP-04 (límite temporal),
P-I5 (auditabilidad).

**Justificación:** La Decisión no es un instante — es un proceso que tiene un ciclo de
vida. Desde la deliberación hasta el cierre, cada estado tiene reglas específicas.
Modelar estos estados explícitamente es necesario para auditabilidad (sabemos en qué
estado está cada decisión) y para manejo de fallos (sabemos qué hacer si una decisión
falla).

**Implicaciones Cognitivas:**
- DELIBERATING es el estado inicial de toda decisión. Ocurre durante el Razonamiento.
- La transición DELIBERATING → RESOLVED es el "momento de la decisión."
- RESOLVED → EXECUTING ocurre cuando el sistema comienza a actuar según el Commitment.
- Una decisión EXPIRED activa el protocolo de escalamiento (S-P7).
- Una decisión REVISED debe registrar qué decisión la reemplaza y por qué.

**Impacto Conversacional:** El sistema puede recuperarse de fallos de decisión sin
perder contexto. Si una decisión expira, el usuario recibe una explicación y una
escalación, no un error silencioso. Si una decisión se revisa, el usuario ve consistencia
("cambié de opinión porque ahora tengo más información").

**Verificación:** ¿Existe alguna decisión en el sistema que no esté en alguno de estos
estados? ¿Existe alguna ruta donde el sistema no sepa en qué estado está una decisión?
Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el ciclo de vida del Commitment asociado),
COGNITIVE_ARCHITECTURE.md (define los triggers de transición entre estados).

---

### R-DM-007 — Decision temporal bounds

**Enunciado:** Toda Decisión debe tener un límite temporal máximo desde DELIBERATING
hasta RESOLVED, definido por el tipo de decisión y la Strategic Posture. Si el límite
se excede, la decisión transiciona automáticamente a EXPIRED y se activa el protocolo
de escalamiento (S-P7).

**Derivación Constitucional:** CP-04 (límite temporal del ciclo), CP-26 (escalamiento
por insuficiencia), S-P7 (Human Escalation).

**Justificación:** Sin límite temporal, una decisión que no converge (porque la Evidence
es insuficiente, el LLM no responde, o el razonamiento es inconcluso) mantendría al
sistema en un estado de procesamiento perpetuo. El límite temporal es una salvaguarda
cognitiva que garantiza que el sistema siempre responde dentro de un tiempo razonable.

**Implicaciones Cognitivas:**
- Cada tipo de decisión tiene un tiempo máximo de deliberación.
- Si el tiempo se agota, la decisión no se resuelve por defecto — se expira y se escala.
- El límite temporal se configura por tipo de decisión y Strategic Posture.
- La expiración no destruye el trabajo realizado — se registra como Evidence para el
  próximo ciclo.

**Impacto Conversacional:** El usuario nunca espera indefinidamente. Si el sistema no
puede decidir a tiempo, informa al usuario y escala a un operador humano. Esto es
preferible a una respuesta tardía o incorrecta.

**Verificación:** ¿Existe alguna decisión que pueda prolongarse indefinidamente sin
exceder un límite temporal? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el watchdog de tiempo por fase),
DECISION_MODEL.md (define tiempos por tipo de decisión y Strategic Posture).

---

## 5. Preconditions and Postconditions

### R-DM-008 — Decision preconditions

**Enunciado:** Una Decisión solo puede iniciarse (transición a DELIBERATING) si se
cumplen TODAS las siguientes precondiciones:

1. **Evidence disponible**: Existe al menos un registro de Evidence relevante para la
   decisión en el Evidence Store.
2. **Knowledge State actual**: El Knowledge State ha sido actualizado con la Evidence
   del ciclo actual.
3. **Propósito definido**: Existe un Intent primario identificado que guía la decisión.
4. **Sin decisión previa no resuelta**: No hay una decisión previa sobre el mismo
   asunto en estado DELIBERATING, RESOLVED sin ejecutar, o EXECUTING sin resolver.
5. **Contexto temporal válido**: La decisión está dentro de su ventana temporal permitida.

**Derivación Constitucional:** S-P1 (Evidence-Based Operation — ninguna decisión sin
Evidence), CP-22 (compromiso explícito), CP-16 (coexistencia de intenciones).

**Justificación:** Las precondiciones garantizan que ninguna decisión se toma en el vacío.
Sin Evidence, no hay fundamento. Sin Knowledge State actualizado, la decisión opera sobre
información desactualizada. Sin propósito, la decisión no tiene dirección. Estas
precondiciones son el "cinturón de seguridad" del proceso de decisión.

**Implicaciones Cognitivas:**
- Si las precondiciones no se cumplen, la decisión no puede iniciarse.
- El sistema debe intentar cumplir las precondiciones (buscar Evidence, actualizar el
  Knowledge State, definir el Intent) antes de abortar.
- Si después de intentar cumplirlas no es posible, la decisión va directamente a ESCALATE
  o ABSTAIN (según el contexto).

**Impacto Conversacional:** El sistema nunca "decide sobre nada". Cada decisión tiene
un fundamento verificable. El usuario nunca experimenta decisiones que parecen salir de
la nada o que ignoran información que ya había proporcionado.

**Verificación:** ¿Existe alguna ruta de decisión que pueda ejecutarse sin cumplir alguna
de estas precondiciones? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define los gates de precondición en el ciclo),
DECISION_MODEL.md (define las precondiciones por tipo de decisión).

---

### R-DM-009 — Decision postconditions

**Enunciado:** Toda Decisión RESOLVED debe producir:

1. **Un registro de decisión**: Qué se decidió, con qué alternativa, basado en qué
   Evidence, con qué Certainty, con qué Costo de Error estimado.
2. **Un Commitment (solo COMMIT)**: Si la decisión fue COMMIT, se inicia el Commitment
   correspondiente.
3. **Un mensaje al usuario o plan de comunicación**: Si la decisión requiere comunicación
   (CLARIFY, ESCALATE, o COMMIT informativo).
4. **Evidence de la decisión**: La decisión misma se registra como Evidence en el
   Evidence Store (lo que se decidió y por qué).

**Derivación Constitucional:** P-I5 (Auditability of Every Decision), CP-22 (compromiso
explícito), CP-37 (retroalimentación por outcome).

**Justificación:** Una decisión que no produce estos outputs es una decisión invisible.
No puede auditarse, no puede generar Commitment, no puede comunicarse al usuario, y
no puede retroalimentar el aprendizaje del sistema. Las postcondiciones garantizan que
cada decisión deja un rastro completo.

**Implicaciones Cognitivas:**
- Las postcondiciones son obligatorias. Una decisión no puede completarse sin producirlas.
- El registro de decisión es inmutable (se almacena como Evidence).
- El mensaje al usuario debe ser coherente con la decisión (no puede decir "todo
  confirmado" si la decisión fue CLARIFY).

**Impacto Conversacional:** Toda decisión que afecta al usuario es comunicada de forma
clara y oportuna. El usuario nunca queda preguntándose "¿qué pasó?" o "¿me entendió o no?"

**Verificación:** ¿Existe alguna ruta donde una decisión se resuelva sin producir registro
de decisión, Commitment, o comunicación al usuario? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de postcondiciones),
EVIDENCE_MODEL.md (define el esquema de Evidence de decisión).

---

## 6. Sufficiency, Abstention, and Escalation

### R-DM-010 — Sufficiency criterion

**Enunciado:** El sistema considera que la Evidence es suficiente para COMMIT cuando la
Certainty de la Belief relevante es igual o superior al umbral de compromiso definido
para ese tipo de decisión bajo la Strategic Posture actual. El umbral se calcula como:

```
umbral_compromiso = f(costo_error, postura_estrategica)
```

Donde `f` es una función que produce un umbral más alto cuando el costo de error es alto
o la postura es conservadora, y más bajo en caso contrario.

**Derivación Constitucional:** CONSTITUTION.md §3.4 (Epistemic Sufficiency Principle),
P-E5 (Proportional Response), CP-23 (umbral dinámico), CP-12 (suficiencia mínima).

**Justificación:** La suficiencia no se define por un número fijo (ej.: 0.85) sino por
una relación entre el costo de error y la certidumbre. Esto permite que el sistema
decida apropiadamente en contextos de alto riesgo (umbral alto) y bajo riesgo (umbral
más bajo). Un umbral fijo trataría todas las decisiones como igualmente riesgosas.

**Implicaciones Cognitivas:**
- El umbral se calcula en cada decisión, no se predefine globalmente.
- El cálculo considera el costo de error del tipo de acción y la Strategic Posture.
- Si la Certainty ≥ umbral, el camino a COMMIT está abierto.
- Si la Certainty < umbral, el sistema debe evaluar CLARIFY, ESCALATE, o ABSTAIN.

**Impacto Conversacional:** El sistema no es ni excesivamente conservador (preguntando
todo aunque sea obvio) ni excesivamente agresivo (asumiendo sin suficiente información).
Las preguntas al usuario se reducen a las estrictamente necesarias porque el umbral se
calibra según el riesgo real, no según un estándar arbitrario.

**Verificación:** ¿Existe alguna decisión de COMMIT en el sistema que use un umbral fijo
sin considerar el costo de error y la postura estratégica? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (provee la función de comparación),
DECISION_MODEL.md (define `f` y los parámetros por tipo de decisión).

---

### R-DM-011 — Abstention criteria

**Enunciado:** El sistema debe optar por ABSTAIN (abstenerse de decidir) cuando se
cumple ALGUNA de las siguientes condiciones:

1. **Evidence ausente**: No existe Evidence relevante para la decisión (precondición
   R-DM-008 no cumplida y no puede cumplirse).
2. **Sin urgencia**: La decisión no es necesaria en el ciclo actual — el sistema puede
   esperar más signals del usuario sin afectar la operación.
3. **Ciclo duplicado**: La decisión ya fue tomada en un ciclo anterior y no hay nueva
   Evidence que justifique reconsiderarla.
4. **Fuera de alcance**: La decisión corresponde a un dominio que el sistema no está
   autorizado a resolver autónomamente (CONSTITUTION.md §5.2).

ABSTAIN no es inacción permanente. El sistema debe registrar la abstención como
Evidence con la razón y el plan de seguimiento (¿cuándo se revisará? ¿qué evento la
reactivará?).

**Derivación Constitucional:** CONSTITUTION.md §5.2 (autoridad autónoma vs. decisiones
advisory e informacionales), CP-12 (suficiencia mínima — si no hay Evidence suficiente,
no se fuerza una decisión).

**Justificación:** Decidir no decidir es una decisión válida. Si el sistema no tiene
información suficiente, la acción no es necesaria, o la decisión no es de su competencia,
la alternativa correcta es abstenerse. Forzar una decisión en estas condiciones llevaría
a acciones arbitrarias o a violaciones de los límites de autoridad.

**Implicaciones Cognitivas:**
- ABSTAIN es una decisión activa, no una omisión. Debe registrarse como tal.
- El sistema debe establecer un mecanismo de reactivación: ¿qué evento hará que esta
  decisión se reconsidera? (ej.: nuevo mensaje del usuario, cumplimiento de un timer).
- ABSTAIN no debe confundirse con "no procesar el mensaje." El sistema siempre procesa
  el mensaje — la abstención es sobre la acción operacional.

**Impacto Conversacional:** El usuario no recibe respuestas forzadas o información
inventada cuando el sistema no tiene suficiente base. Si el sistema se abstiene, puede
comunicar "estoy esperando más información" o "eso no está dentro de lo que puedo
decidir." La comunicación es honesta y transparente.

**Verificación:** ¿Existe alguna ruta donde el sistema fuerce una decisión COMMIT cuando
debería haberse abstenido según estos criterios? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de abstención),
CHANNEL_ADAPTER.md (define los mensajes de abstención al usuario).

---

### R-DM-012 — Escalation criteria

**Enunciado:** El sistema debe escalar a un operador humano cuando se cumple ALGUNA de
las siguientes condiciones:

1. **Certidumbre insuficiente y agotamiento de medios**: La Certainty está por debajo
   del umbral de compromiso, no puede obtenerse más Evidence (el usuario no respondió,
   no hay más preguntas que hacer, o el tiempo límite se agotó), y el costo de error
   justifica la intervención humana.
2. **Costo de error excede el umbral de escalamiento**: El Costo de Error estimado para
   la decisión supera el límite que el sistema puede manejar autónomamente.
3. **Requerimiento del usuario**: El usuario solicita explícitamente hablar con un
   operador humano.
4. **Conflicto irresoluble**: Dos o más fuentes de Evidence producen conclusiones
   contradictorias que el sistema no puede resolver epistémicamente.
5. **Violación de límite de autoridad**: La decisión requiere una autoridad que el
   sistema no posee (CONSTITUTION.md §5.2.2 y §5.2.3).

**Derivación Constitucional:** S-P7 (Human Escalation), CP-26 (escalamiento por
insuficiencia), CP-10 (resolución de Evidence conflictiva).

**Justificación:** S-P7 exige escalamiento humano cuando el sistema no puede alcanzar
un compromiso con certidumbre suficiente y el costo de error supera el costo de
intervención humana. La escalación no es un fallo — es una salvaguarda diseñada para
proteger al usuario y al sistema.

**Implicaciones Cognitivas:**
- La escalación debe incluir un resumen cognitivo completo: qué se sabe, qué no se sabe,
  qué se intentó, por qué no se alcanzó el umbral.
- Escalar no es "rendirse" — es transferir el control a quien tiene autoridad para
  decidir. El sistema debe estar disponible para asistir al operador humano.
- Una vez escalado, el sistema no debe intentar "adivinar" la respuesta.
- El escalamiento debe registrarse como Evidence con la razón y el contexto completo.

**Impacto Conversacional:** Cuando el sistema no puede resolver una situación, el usuario
es transferido a un humano con toda la información relevante. El usuario no tiene que
repetir información ni explicar el problema desde cero. La transición es fluida y el
usuario siente que el sistema "sabe cuándo pedir ayuda."

**Verificación:** ¿Existe algún escenario donde el sistema no pueda alcanzar el umbral
de compromiso y no escale (optando por silencio, repetición infinita, o compromiso por
defecto)? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el protocolo de escalamiento),
COGNITIVE_ARCHITECTURE.md (define el flujo de ciclo → escalamiento).

---

## 7. Evidence and Certainty in Decision-Making

### R-DM-013 — Decisions read from Evidence Store

**Enunciado:** Toda decisión debe leer la Evidence relevante exclusivamente del Evidence
Store. Ninguna decisión puede basarse en información que no esté registrada como Evidence.
Si la información necesaria no está en el Evidence Store, la decisión debe obtenerla
mediante CLARIFY antes de proceder.

**Derivación Constitucional:** S-P1 (Evidence-Based Operation), CP-05 (frontera
percepción/evidencia), EVIDENCE_MODEL.md R-EM-001 (Evidence como observación registrada).

**Justificación:** La Constitución exige que toda decisión esté basada en Evidence. La
Evidence Store es el repositorio canónico de toda la Evidence del sistema. Si una
decisión usa información que no está en el Evidence Store, esa información no es Evidence
y la decisión viola S-P1.

**Implicaciones Cognitivas:**
- El proceso de decisión debe consultar el Evidence Store antes de evaluar alternativas.
- Si la información requerida no existe en el Evidence Store, la decisión no puede ser
  COMMIT — debe ser CLARIFY (para obtener la información) o ABSTAIN/ESCALATE.
- Ningún componente de decisión puede mantener su propio "cache de información" no
  registrado en el Evidence Store.

**Impacto Conversacional:** Cada pieza de información que el sistema usa para decidir
es información que el usuario proporcionó o que el sistema infirió y registró. No hay
"suposiciones invisibles." El usuario puede confiar en que las decisiones del sistema
se basan en lo que realmente se dijo, no en lo que el sistema "asumió."

**Verificación:** ¿Existe alguna ruta de decisión que use información que no esté
registrada como Evidence en el Evidence Store? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el Evidence Store y sus operaciones de
lectura), COGNITIVE_ARCHITECTURE.md (define el flujo de lectura de Evidence para
decisiones).

---

### R-DM-014 — Certainty as primary decision variable

**Enunciado:** La Certainty de las Beliefs relevantes es la variable primaria que
determina si el sistema puede comprometerse. Sin Certainty no hay decisión. La decisión
COMPARA la Certainty contra el umbral calculado (R-DM-010); no existe una "sensación"
de suficiencia separada del valor numérico.

**Derivación Constitucional:** P-E2 (Certainty Is Continuous), CP-18 (certidumbre
continua), CP-22 (compromiso explícito).

**Justificación:** La Constitución P-E2 exige que la certidumbre sea continua y que toda
Belief lleve un valor de certidumbre. La decisión no puede basarse en una intuición
cualitativa ("me siento seguro") — debe basarse en el valor numérico de certidumbre
derivado de la Evidence. Esto hace que la decisión sea objetiva, reproducible y auditable.

**Implicaciones Cognitivas:**
- La comparación Certainty ≥ umbral_compromiso es la puerta de entrada a COMMIT.
- Si la Certainty está por debajo del umbral, ninguna otra consideración puede forzar
  COMMIT.
- La Certainty se obtiene del proceso de cómputo definido en CERTAINTY_CALCULUS.md.

**Impacto Conversacional:** Las decisiones del sistema son consistentes y predecibles.
No hay sesgos de "hoy me siento más seguro" o "este usuario me da confianza." La
certidumbre se computa de la misma forma para todos los casos.

**Verificación:** ¿Existe alguna ruta de decisión COMMIT que no compare la Certainty
contra un umbral calculado? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la función de cómputo de certidumbre),
COGNITIVE_ARCHITECTURE.md (define el flujo de consulta de certidumbre).

---

### R-DM-015 — Multiple Evidence, single Certainty

**Enunciado:** Para cada proposición relevante para la decisión, el sistema debe agregar
TODA la Evidence disponible (EVIDENCE_MODEL.md R-EM-035) en un único valor de Certainty.
La decisión se basa en esa Certainty agregada, no en piezas individuales de Evidence. Sin
embargo, la decisión debe registrar qué Evidence específica contribuyó a la agregación.

**Derivación Constitucional:** CP-20 (actualización por Evidence — toda Evidence se
considera), CP-10 (resolución de Evidence conflictiva), EVIDENCE_MODEL.md R-EM-035
(agregación para formación de creencias).

**Justificación:** Una decisión no puede basarse en una sola pieza de Evidence ignorando
las demás. Si hay cinco Evidence que apoyan "origen = Asunción" y una que dice "origen =
San Lorenzo," la decisión debe considerar todas, no solo la más reciente o la de mayor
confianza. La agregación reduce la información multidimensional a una variable unificada
que la decisión puede evaluar.

**Implicaciones Cognitivas:**
- La agregación ocurre antes de la decisión, durante el Razonamiento.
- La función de agregación (definida en CERTAINTY_CALCULUS.md) considera: confianza de
  cada Evidence, corroboración, contradicción, edad, precedencia.
- El resultado de la agregación es un único valor de Certainty para cada proposición.
- El registro de decisión debe listar qué Evidence IDs se usaron en la agregación.

**Impacto Conversacional:** Las decisiones del sistema reflejan toda la información
disponible, no solo la última información. Si el usuario dio información contradictoria
en diferentes mensajes, el sistema no ignora ninguna. Las decisiones son más robustas.

**Verificación:** ¿Existe alguna ruta de decisión que evalúe una sola pieza de Evidence
sin agregar toda la Evidence disponible para esa proposición? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la función de agregación),
EVIDENCE_MODEL.md (define cómo se agrupa Evidence por proposición).

---

## 8. Cost of Error

### R-DM-016 — Cost of Error as a decision prerequisite

**Enunciado:** Toda decisión debe estimar explícitamente el Costo de Error antes de
resolverse. El Costo de Error tiene dos componentes:

1. **Costo de Falso Positivo (FP)**: ¿Qué pasa si decidimos COMMIT y la creencia era
   incorrecta? (ej.: despachar al conductor al lugar equivocado).
2. **Costo de Falso Negativo (FN)**: ¿Qué pasa si decidimos NO COMMIT y la creencia
   era correcta? (ej.: perder un viaje por no confirmar a tiempo).

Ambos costos deben estimarse. Ninguno puede asumirse como cero sin justificación explícita.

**Derivación Constitucional:** CONSTITUTION.md §3.4 (Epistemic Sufficiency), CP-24
(costo de error), P-E5 (Proportional Response).

**Justificación:** La Constitución define la suficiencia en términos de costo de error:
el nivel de certidumbre en el cual el costo esperado de actuar es menor que el costo
esperado de no actuar. Sin una estimación de ambos costos, la decisión no puede
determinar si la certidumbre es suficiente. Una decisión sin costo de error es una
decisión ciega.

**Implicaciones Cognitivas:**
- El Costo de Error se estima para cada tipo de decisión y cada contexto.
- El costo de FP depende del tipo de acción (despachar, confirmar precio, crear viaje).
- El costo de FN depende del contexto (hora del día, tipo de usuario, disponibilidad de
  conductores).
- Si el Costo de Error no puede estimarse (contexto desconocido), el sistema debe usar
  valores conservadores por defecto.
- La estimación del Costo de Error debe registrarse para auditoría.

**Impacto Conversacional:** El sistema es calibrado en sus decisiones. Cuando el error
es barato (ej.: preguntar de nuevo), el umbral es más bajo y el sistema es más fluido.
Cuando el error es caro (ej.: despachar al lugar equivocado), el umbral es más alto y
el sistema es más cuidadoso. El usuario siente que el sistema "entiende la gravedad de
lo que está haciendo."

**Verificación:** ¿Existe alguna decisión COMMIT que se ejecute sin una estimación
explícita de Costo de Error (FP y FN)? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el modelo de costo de error por tipo de
decisión), COMMITMENT_MODEL.md (define los costos de error por tipo de compromiso).

---

### R-DM-017 — Cost of Error calibration by outcome

**Enunciado:** Las estimaciones de Costo de Error deben ajustarse en función de los
resultados observados (outcomes). Si el sistema subestima sistemáticamente el costo de
FP (errores más costosos de lo estimado), el modelo de costo debe recalibrarse. Lo mismo
aplica para el costo de FN.

**Derivación Constitucional:** CP-37 (retroalimentación por outcome), CP-38 (ajuste de
confianza de fuente).

**Justificación:** Las estimaciones iniciales de Costo de Error son necesariamente
aproximadas. La experiencia operativa revela los costos reales. Si el sistema no se
recalibra, perpetuará estimaciones incorrectas que llevan a umbrales mal calibrados.

**Implicaciones Cognitivas:**
- Cada outcome (viaje completado, cancelación, reclamo) se registra como Evidence.
- Periódicamente (o cuando se acumula suficiente data), el modelo de Costo de Error se
  recalibra.
- La recalibración compara el costo estimado con el costo real observado.
- Las decisiones recientes usan los valores calibrados, no los iniciales.

**Impacto Conversacional:** El sistema mejora con el tiempo. A medida que aprende los
costos reales de sus decisiones, calibra mejor sus umbrales. El usuario experimenta un
sistema que "cada vez acierta más" en el balance entre acción y precaución.

**Verificación:** ¿Existe algún mecanismo de calibración de Costo de Error que no se
alimente de outcomes reales? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el algoritmo de recalibración),
EVIDENCE_MODEL.md (define el esquema de Evidence de outcome).

---

## 9. Uncertainty Resolution and Multi-Alternative Decisions

### R-DM-018 — Multiple hypothesis handling

**Enunciado:** Cuando la Evidence es ambigua, el sistema debe mantener múltiples
Hipótesis activas simultáneamente (CP-13). La decisión solo puede ocurrir cuando una
Hipótesis alcanza una ventaja epistémica suficiente sobre las demás. La ventaja
suficiente se define como:

```
Certainty(Hipótesis_ganadora) - Certainty(Hipótesis_competidora) ≥ margen_epistémico
```

El margen epistémico se define por tipo de decisión y Strategic Posture.

**Derivación Constitucional:** CP-13 (hipótesis múltiples), CP-17 (resolución por
Evidence), CP-14 (condición de falsación).

**Justificación:** Si el sistema selecciona una Hipótesis apenas tiene un poco más de
Evidence que otra, es propenso a errores por差距 mínimos. El margen epistémico fuerza
al sistema a esperar hasta que la ventaja sea significativa, reduciendo la probabilidad
de errores por fluctuationes pequeñas en la Evidence.

**Implicaciones Cognitivas:**
- Cada Hipótesis tiene su propia Certainty, computada a partir de la Evidence que la
  apoya.
- La decisión no compara la Certainty de la Hipótesis ganadora contra un umbral absoluto
  — la compara contra el umbral Y contra la(s) Hipótesis competidora(s).
- Si ninguna Hipótesis tiene ventaja suficiente, la decisión es CLARIFY (pedir más
  Evidence para inclinar la balanza).
- El margen epistémico evita "falsos positivos por poco margen."

**Impacto Conversacional:** El sistema evita "cambios de opinión" inexplicables. Si la
Evidence está igualmente dividida entre dos interpretaciones, el sistema pide
clarificación en lugar de elegir una al azar. El usuario no experimenta contradicciones
("ayer dijiste que iba a Asunción y hoy dices San Lorenzo").

**Verificación:** ¿Existe alguna ruta donde el sistema seleccione una Hipótesis sin
verificar que tiene ventaja epistémica suficiente sobre las alternativas? Si sí →
violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el Hypothesis Network),
CERTAINTY_CALCULUS.md (define el margen epistémico).

---

### R-DM-019 — Coexisting intents and decision priority

**Enunciado:** Cuando un mismo mensaje del usuario contiene múltiples intenciones
(CP-16), el sistema debe:

1. Identificar todas las intenciones presentes.
2. Determinar la Intención Primaria (la que guía la decisión principal).
3. Mantener las Intenciones Secundarias como contexto activo.
4. Procesar la Intención Primaria primero, pero no descartar las secundarias.
5. Almacenar las intenciones secundarias para el próximo ciclo cognitivo.

**Derivación Constitucional:** CP-16 (coexistencia de intenciones), SYSTEM_VOCABULARY.md §8.6
(Intent) y §8.7 (Primary Intent).

**Justificación:** Los usuarios frecuentemente expresan múltiples intenciones en un solo
mensaje: "quiero un taxi para las 5, ¿cuánto cuesta?" contiene BOOKING y QUERY. Si el
sistema solo procesa la intención primaria (BOOKING) y descarta la secundaria (QUERY),
el usuario tendrá que repetir la pregunta en otro ciclo. Esto viola CP-16.

**Implicaciones Cognitivas:**
- La identificación de intenciones ocurre en la Percepción o en el Razonamiento temprano.
- La priorización usa reglas: BOOKING > EMERGENCY > MANAGEMENT > QUERY > GREETING.
- La Intención Secundaria se almacena en el Knowledge State como contexto activo.
- En el próximo ciclo, si no hay nueva intención del usuario, la secundaria puede
  convertirse en primaria.

**Impacto Conversacional:** El usuario puede expresar múltiples necesidades en un solo
mensaje sin temor a que el sistema "olvide" alguna. "Necesito un taxi para mañana a las
8, y ¿cuánto cuesta ir al aeropuerto?" — el sistema reserva el viaje Y responde el
precio. Menos turnos, más eficiencia.

**Verificación:** ¿Existe algún límite en el sistema que impida procesar más de una
intención del usuario en un mismo ciclo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de intenciones múltiples),
DECISION_MODEL.md (define la priorización de intenciones).

---

### R-DM-020 — Silence as input to decision

**Enunciado:** El silencio del usuario (ausencia de respuesta después de una pregunta o
confirmación del sistema) debe registrarse como Evidence (CP-11) y considerarse en la
próxima decisión. El silencio tiene un peso epistémico bajo (Confidence baja) porque
es inherentemente ambiguo: puede significar acuerdo, desacuerdo, distracción, o abandono.

El tratamiento del silencio en la decisión depende del contexto:

| Contexto | Interpretación | Acción |
|----------|---------------|--------|
| Confirmación de datos no críticos | Acuerdo tácito débil | Proceder con COMMIT informativo, umbral más bajo |
| Confirmación de acción operacional | Insuficiente para compromiso | Repetir clarificación o escalar |
| Pregunta abierta después de timeout | Posible abandono | Preguntar si sigue allí o escalar |
| Silencio prolongado (> 5 min) | Alta probabilidad de abandono | Preservar estado y esperar nuevo mensaje |

**Derivación Constitucional:** CP-11 (silencio como Evidence), CP-26 (escalamiento por
insuficiencia).

**Justificación:** El silencio es información. Ignorarlo equivale a tomar decisiones sin
considerar toda la Evidence disponible. Sin embargo, el silencio es inherentemente ambiguo,
por lo que su peso epistémico debe ser bajo y su interpretación debe calibrarse según el
contexto.

**Implicaciones Cognitivas:**
- El silencio se registra como Evidence con Source = SilenceDetection y Confidence baja.
- La interpretación del silencio varía según el tipo de pregunta que lo precedió.
- El silencio nunca debe interpretarse como confirmación de alta certidumbre.
- Si el silencio persiste, eventualmente la decisión debe pasar a ESCALATE.

**Impacto Conversacional:** El usuario no es presionado para responder inmediatamente,
pero tampoco ignorado si deja de responder. El sistema puede inferir acuerdo tácito en
contextos de bajo riesgo ("¿confirmo que el origen es Asunción?" → silencio → COMMIT
informativo), pero nunca asume consentimiento en contextos de alto riesgo ("¿despacho
el conductor?" → silencio → escalar o preguntar de nuevo).

**Verificación:** ¿Existe algún escenario donde el sistema ignore el silencio del usuario
y proceda sin registrar ese evento como Evidence? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el esquema de Evidence de silencio),
DECISION_MODEL.md (define la calibración de silencio por contexto).

---

## 10. Reversible and Irreversible Decisions

### R-DM-021 — Decision reversibility classification

**Enunciado:** Toda decisión debe clasificarse como reversible o irreversible ANTES de
tomarse. La clasificación determina el umbral de compromiso y el protocolo de ejecución:

| Clasificación | Definición | Ejemplo | Umbral |
|---------------|------------|---------|--------|
| **Reversible** | La decisión puede deshacerse con costo aceptable | Confirmar una interpretación (el usuario puede corregir) | Más bajo |
| **Irreversible** | La decisión no puede deshacerse, o el costo de deshacerla es inaceptable | Despachar un conductor, confirmar un pago | Más alto |

**Derivación Constitucional:** CP-25 (compromiso informativo vs. operacional), P-E5
(Proportional Response), S-P7 (Human Escalation).

**Justificación:** No todas las decisiones tienen el mismo costo de revocación. Confirmar
una interpretación ("entendí que quieres ir al aeropuerto") es barato de corregir (el
usuario dice "no"). Despachar un conductor es caro de corregir (el conductor ya está en
camino). El umbral debe reflejar esta diferencia.

**Implicaciones Cognitivas:**
- La clasificación debe hacerse en el diseño del tipo de decisión, no en tiempo de
  ejecución.
- Las decisiones reversibles pueden permitir COMMIT con menor Certainty.
- Las decisiones irreversibles requieren mayor Certainty y, en algunos casos, confirmación
  explícita del usuario (CP-35).
- Una decisión que parece reversible puede volverse irreversible si no se corrige a tiempo.

**Impacto Conversacional:** El usuario no es molestado con confirmaciones para decisiones
triviales, pero recibe protecciones para decisiones importantes. El sistema sabe cuándo
puede ser "relajado" y cuándo debe ser "estricto."

**Verificación:** ¿Existe alguna decisión en el sistema que no tenga una clasificación
explícita de reversibilidad? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la reversibilidad por tipo de compromiso),
COGNITIVE_ARCHITECTURE.md (define el flujo de decisión según reversibilidad).

---

### R-DM-022 — Revocation protocol

**Enunciado:** Una decisión COMMIT solo puede ser revocada si:

1. La decisión fue clasificada como reversible (R-DM-021).
2. NO ha comenzado la ejecución irreversible de la decisión (si el conductor ya fue
   despachado, no puede revocarse; si el viaje fue creado pero no despachado, puede
   cancelarse).
3. La revocación se basa en nueva Evidence que contradice la Evidence original.
4. La revocación se registra como una nueva decisión (no como una modificación de la
   anterior) con su propio registro de auditoría.

**Derivación Constitucional:** P-E4 (Revisability of Beliefs), CP-39 (mejora no
destructiva), P-I5 (auditabilidad).

**Justificación:** La revocación no es "corregir el pasado" — es tomar una nueva decisión
basada en nueva Evidence. La decisión original sigue siendo válida como registro
histórico (dado lo que se sabía en ese momento). La nueva decisión refleja el nuevo
conocimiento.

**Implicaciones Cognitivas:**
- La revocación inicia un nuevo Ciclo Cognitivo completo.
- La nueva decisión registra: qué decisión anterior revoca, qué nueva Evidence motivó la
  revocación, y el nuevo Costo de Error estimado.
- La decisión original se marca como SUPERSEDED en el registro.

**Impacto Conversacional:** Si el usuario necesita cambiar algo, el sistema maneja la
situación como un nuevo proceso de decisión, no como una "corrección." El usuario no
experimenta errores ni incongruencias — el sistema simplemente se adapta a la nueva
información.

**Verificación:** ¿Existe algún mecanismo de revocación que modifique el registro de la
decisión original en lugar de crear una nueva decisión? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el protocolo de revocación),
COGNITIVE_ARCHITECTURE.md (define el flujo de ciclo de revocación).

---

## 11. Decision and Commitment

### R-DM-023 — Decision-to-Commitment gate

**Enunciado:** La transición de Decisión a Commitment es un gate explícito que solo se
activa cuando la decisión es COMMIT. Hasta que el gate se activa, no existe Commitment.
El gate evalúa:

1. ¿La decisión es COMMIT? (si no, no hay Commitment).
2. ¿La decisión cumple todas las precondiciones? (R-DM-008).
3. ¿La Certainty ≥ umbral de compromiso? (R-DM-010).
4. ¿El Costo de Error fue estimado? (R-DM-016).
5. ¿La decisión fue registrada? (R-DM-009).

Si alguna condición falla, el Commitment no se crea y la decisión debe revisarse.

**Derivación Constitucional:** CP-22 (compromiso explícito), CP-23 (umbral dinámico),
P-I5 (auditabilidad).

**Justificación:** El Commitment es el "punto de no retorno" del Ciclo Cognitivo. Si el
sistema puede comprometerse sin pasar por el gate, se pierde la distinción entre "creer"
y "comprometerse." El gate es el mecanismo que garantiza que ningún Commitment existe sin
una decisión explícita que lo respalde.

**Implicaciones Cognitivas:**
- El gate es evaluado por el proceso de Compromiso, no por el de Decisión.
- El gate no puede ser omitido. Ni siquiera en emergencias (la emergencia puede acelerar
  el proceso, pero no saltarlo).
- Si el gate rechaza el Commitment, la decisión debe revisar su alternativa (COMMIT →
  CLARIFY, ESCALATE, o ABSTAIN).

**Impacto Conversacional:** El usuario nunca recibe una confirmación operacional ("su
viaje está confirmado") que no haya pasado por el gate de compromiso. No hay casos donde
el sistema "diga" una cosa y "haga" otra.

**Verificación:** ¿Existe algún flujo donde se cree un Commitment sin pasar por el gate
de decisión? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la máquina de estados del compromiso),
COGNITIVE_ARCHITECTURE.md (define el gate de compromiso).

---

### R-DM-024 — Commitment records reference the Decision

**Enunciado:** Todo Commitment debe incluir una referencia a la Decisión que lo originó,
incluyendo:

- ID de la Decisión.
- Certainty al momento del compromiso.
- Costo de Error estimado (FP y FN).
- Strategic Posture al momento del compromiso.
- IDs de la Evidence que fundamentaron la decisión.

**Derivación Constitucional:** P-I5 (Auditability of Every Decision — debe ser trazable
a la Evidence, Certainty, Costo de Error, y Strategic Posture).

**Justificación:** Sin esta referencia, un Commitment existe sin que pueda auditarse
por qué se tomó. La auditoría requiere la cadena completa: Commitment → Decisión →
Certainty → Evidence.

**Implicaciones Cognitivas:**
- El Commitment no puede crearse sin esta información.
- La información se registra como parte del Commitment, no como un registro separado.
- Si la información no está disponible, el Commitment no puede crearse (el gate lo
  rechaza).

**Impacto Conversacional:** Toda confirmación que recibe el usuario está respaldada por
un Commitment auditable. Si hay un problema (ej.: un viaje mal creado), se puede
reconstruir exactamente por qué se creó, con qué información, y con qué nivel de
certidumbre.

**Verificación:** ¿Existe algún Commitment en el sistema que no tenga referencia a la
Decisión que lo originó? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el esquema del Commitment con referencias),
DECISION_MODEL.md (define el formato del registro de decisión).

---

## 12. Decision and Action Executor

### R-DM-025 — Action execution derives from Decision

**Enunciado:** La ejecución de una acción operacional (ACTION_EXECUTOR.md) solo puede
ocurrir como consecuencia de una Decisión COMMIT. El Action Executor no puede crear,
modificar, o iniciar acciones por sí mismo — solo ejecuta lo que la Decisión ordena.

**Derivación Constitucional:** CP-01 (ciclo completo), CP-22 (compromiso explícito).

**Justificación:** Si el Action Executor pudiera ejecutar acciones sin una decisión que
las autorice, el sistema tendría dos fuentes de acción: la cognitiva (decisiones) y la
mecánica (ejecutor). Esto crearía el riesgo de acciones no fundamentadas en Evidence.
El Action Executor debe ser instrumental, no autónomo.

**Implicaciones Cognitivas:**
- El Action Executor recibe órdenes del proceso de Compromiso.
- No puede rechazar una orden (si la decisión fue COMMIT, la acción debe ejecutarse).
- Pero tampoco puede ejecutar algo que no se le ordenó.
- Si el Action Executor no puede completar la acción (fallo técnico), debe reportarlo
  como Evidence para que la decisión se revise.

**Impacto Conversacional:** Las acciones del sistema siempre están justificadas por una
decisión. No hay "acciones fantasma" que ocurren sin que el sistema "piense" en ellas.

**Verificación:** ¿Existe alguna ruta donde el Action Executor ejecute una acción sin que
una Decisión COMMIT la haya autorizado? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define el contrato de ejecución subordinada a
decisiones), COGNITIVE_ARCHITECTURE.md (define el flujo Compromiso → Ejecutor).

---

### R-DM-026 — Outcome feedback loop

**Enunciado:** El resultado (outcome) de cada acción ejecutada por el Action Executor
debe registrarse como Evidence en el Evidence Store y retroalimentar el modelo de
decisión. El outcome debe incluir:

- Referencia a la Decisión que ordenó la acción.
- Estado del outcome (éxito, fallo, parcial, cancelado).
- Métricas relevantes (tiempo de ejecución, costo real, satisfacción del usuario).
- Evidencia de corrección (si hubo error, qué salió mal).

**Derivación Constitucional:** CP-37 (retroalimentación por outcome), CP-38 (ajuste de
confianza de fuente).

**Justificación:** Sin retroalimentación, el sistema no aprende de sus decisiones. El
outcome es la única fuente de verdad sobre si la decisión fue correcta.

**Implicaciones Cognitivas:**
- El outcome se registra inmediatamente después de la ejecución.
- La retroalimentación ajusta: (a) la Confidence de las fuentes que contribuyeron a la
  decisión, (b) la calibración de certidumbre, (c) la estimación de Costo de Error.
- La retroalimentación negativa (outcome fallido) tiene mayor peso que la positiva.

**Impacto Conversacional:** El sistema mejora con el tiempo. Errores pasados (ej.:
enviar un conductor a la dirección equivocada) ajustan el modelo para que errores
similares sean menos probables en el futuro.

**Verificación:** ¿Existe algún tipo de acción en el sistema cuyo outcome no se registre
como Evidence? Si sí → violación.

**Delegación:** ACTION_EXECUTOR.md (define la captura de outcomes),
EVIDENCE_MODEL.md (define el esquema de Evidence de outcome),
DECISION_MODEL.md (define el ajuste de calibración).

---

## 13. Conflicts Between Decisions

### R-DM-027 — Decision conflict detection

**Enunciado:** Dos decisiones están en conflicto cuando producen Commitments incompatibles:
no pueden ejecutarse ambos simultáneamente. Ejemplos:

- Una decisión COMMIT para crear un viaje y otra decisión COMMIT para cancelar el mismo
  viaje (sin que medie nueva Evidence).
- Una decisión COMMIT para despachar al conductor A y otra COMMIT para despachar al
  conductor B al mismo viaje.
- Una decisión COMMIT informativo que confirma "origen = Asunción" y otra decisión
  epistémica que sostiene "origen = San Lorenzo" como Belief activa.

**Derivación Constitucional:** CP-10 (resolución de Evidence conflictiva — aplicado
por analogía a decisiones), CP-15 (fusión conservadora).

**Justificación:** Las decisiones incompatibles crean un estado cognitivo contradictorio.
Si el sistema no detecta y resuelve estos conflictos, puede terminar ejecutando acciones
contradictorias (despachar y cancelar simultáneamente).

**Implicaciones Cognitivas:**
- La detección de conflictos ocurre en el gate de Compromiso: antes de crear un nuevo
  Commitment, se verifica que no entre en conflicto con Commitments activos existentes.
- Si se detecta un conflicto, la nueva decisión no puede ser COMMIT sin resolver el
  conflicto primero.
- La resolución puede ser: (a) esperar a que el Commitment anterior se cierre,
  (b) revocar el Commitment anterior (R-DM-022), o (c) escalar a humano.

**Impacto Conversacional:** El usuario nunca recibe información contradictoria ("su viaje
está confirmado" y luego "su viaje fue cancelado" sin explicación). Las acciones del
sistema son consistentes entre sí.

**Verificación:** ¿Existe algún mecanismo que permita crear Commitments incompatibles sin
detección de conflicto? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la detección de conflictos entre
Commitments), COGNITIVE_ARCHITECTURE.md (define el gate de verificación de conflictos).

---

### R-DM-028 — Decision precedence

**Enunciado:** Cuando dos decisiones entran en conflicto y no pueden resolverse
epistémicamente (no hay nueva Evidence que incline la balanza), se aplica la siguiente
precedencia:

1. **Decisiones de seguridad** (emergencia, escalamiento) prevalecen sobre decisiones
   operacionales.
2. **Decisiones operacionales** (crear viaje, despachar) prevalecen sobre decisiones
   epistémicas (creer algo).
3. **Decisiones explícitas del usuario** (el usuario dice "cancelar") prevalecen sobre
   decisiones inferidas por el sistema.
4. **Decisiones más recientes** prevalecen sobre decisiones más antiguas (desempate
   final).

**Derivación Constitucional:** S-P8 (principio de precedencia — preservación sobre
operación, seguridad sobre eficiencia), CP-10 (resolución por reglas epistémicas).

**Justificación:** En caso de conflicto irresoluble, el sistema necesita reglas de
desempate claras. La precedencia no es arbitraria — sigue los valores constitucionales:
seguridad > operación > creencia, y el usuario siempre tiene la última palabra.

**Implicaciones Cognitivas:**
- La precedencia solo aplica cuando no hay forma epistémica de resolver el conflicto.
- Si el conflicto puede resolverse con nueva Evidence, la precedencia no se aplica.
- La precedencia debe registrarse como parte de la decisión: "la decisión A prevaleció
  sobre B porque...".

**Impacto Conversacional:** El usuario siempre tiene la última palabra. Si el usuario
dice "cancelar" y el sistema había decidido "confirmar", la decisión del usuario
prevalece. Esto da control al usuario y genera confianza.

**Verificación:** ¿Existe algún conflicto de decisiones donde la precedencia no siga
este orden? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define las reglas de precedencia),
COGNITIVE_ARCHITECTURE.md (define la implementación del desempate).

---

## 14. Consistency and Revision

### R-DM-029 — Decision consistency across cycles

**Enunciado:** El sistema no debe cambiar una decisión entre ciclos cognitivos a menos
que haya nueva Evidence que lo justifique. La regla es: "misma Evidence, misma decisión."
Si el sistema decide COMMIT en el ciclo N, y en el ciclo N+1 no hay nueva Evidence, la
decisión se mantiene: no se revisa ni se re-evalúa a menos que sea necesario por el
contexto.

**Derivación Constitucional:** P-E4 (Revisability of Beliefs — revisable, pero no
caprichosa), CP-34 (no-repregunta), CP-17 (resolución por Evidence).

**Justificación:** Si el sistema cambiara decisiones sin nueva Evidence, sería impredecible
e inconsistente. El usuario perdería confianza porque no sabría qué esperar. La
consistencia no es rigidez — es fidelidad a la Evidence: si la Evidence no cambia, la
decisión no cambia.

**Implicaciones Cognitivas:**
- Una decisión RESOLVED no se reabre automáticamente en el próximo ciclo.
- La reapertura solo ocurre si: (a) nueva Evidence relevante llega, (b) el contexto
  cambia significativamente, o (c) el usuario explícitamente solicita un cambio.
- Si no hay nueva Evidence, la decisión se considera "confirmada por inacción."

**Impacto Conversacional:** El sistema es predecible y consistente. El usuario no
experimenta cambios de opinión inexplicables. Si el sistema confirmó un origen, no lo
cambia a menos que el usuario envíe nueva información o se retracte.

**Verificación:** ¿Existe algún mecanismo que permita cambiar una decisión sin la
llegada de nueva Evidence, un cambio de contexto, o una solicitud explícita del usuario?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la detección de nueva Evidence como
trigger de re-decisión), COMMITMENT_MODEL.md (define la estabilidad del Commitment).

---

### R-DM-030 — Decision revision protocol

**Enunciado:** Cuando nueva Evidence justifica revisar una decisión anterior, el sistema
debe:

1. **Registrar la nueva Evidence** en el Evidence Store (no modificar la anterior).
2. **Evaluar si la nueva Evidence realmente afecta la decisión anterior** — no toda
   Evidence nueva es relevante.
3. **Si es relevante, iniciar un nuevo Ciclo Cognitivo** para la revisión.
4. **La revisión produce una NUEVA decisión** (no modifica la anterior).
5. **La decisión anterior se marca como SUPERSEDED** con referencia a la nueva.

**Derivación Constitucional:** P-E4 (Revisability of Beliefs), CP-39 (mejora no
destructiva), CP-08 (inmutabilidad de Evidence).

**Justificación:** La revisión no es "corrección del pasado" — es "adaptación al
presente." La decisión anterior era correcta dado lo que se sabía en ese momento. La
nueva decisión refleja lo que ahora se sabe. Ambas deben preservarse para auditoría.

**Implicaciones Cognitivas:**
- La revisión no modifica el registro de la decisión anterior.
- La nueva decisión debe referenciar: (a) qué decisión anterior revisa, (b) qué nueva
  Evidence motivó la revisión, (c) cómo cambió la Certainty y el Costo de Error.
- Si la revisión ocurre antes de que la decisión anterior se ejecute, debe evaluarse si
  la ejecución debe detenerse.

**Impacto Conversacional:** Cuando el sistema cambia de opinión, puede explicar por qué:
"Antes pensaba que el origen era X, pero ahora con la nueva información que me diste,
entiendo que es Y." La explicación genera confianza incluso cuando hay cambios.

**Verificación:** ¿Existe alguna revisión de decisión que modifique el registro de la
decisión anterior en lugar de crear una nueva? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el estado SUPERSEDED), COGNITIVE_ARCHITECTURE.md
(define el flujo de revisión).

---

## 15. Traceability and Audit

### R-DM-031 — Complete decision record

**Enunciado:** Toda decisión debe producir un registro completo y no modificable que
contenga:

| Campo | Descripción |
|-------|-------------|
| ID de Decisión | Identificador único |
| Ciclo Cognitivo ID | Ciclo en el que se tomó |
| Timestamp | Momento de la decisión |
| Tipo de Decisión | COMMIT, CLARIFY, ESCALATE, ABSTAIN |
| Dominio | Epistémico, Compromiso, Interacción |
| Intención Primaria | BOOKING, QUERY, MANAGEMENT, etc. |
| Hipótesis activas | Lista de Hipótesis consideradas (si aplica) |
| Hipótesis seleccionada | Hipótesis que ganó (si aplica) |
| Certainty | Valor numérico al momento de la decisión |
| Costo de Error (FP) | Costo estimado de falso positivo |
| Costo de Error (FN) | Costo estimado de falso negativo |
| Umbral de compromiso | Umbral usado en la comparación |
| Strategic Posture | Postura al momento de la decisión |
| Evidence IDs | IDs de la Evidence que fundamentaron la decisión |
| Decisión anterior (si revisa) | ID de la decisión que esta reemplaza |
| Contexto conversacional | Resumen del estado conversacional |

**Derivación Constitucional:** P-I5 (Auditability of Every Decision), CP-09
(trazabilidad observacional), CP-22 (compromiso explícito).

**Justificación:** Sin un registro completo, una decisión no puede auditarse. No se puede
responder "¿por qué el sistema decidió esto?" si no hay registro de qué Evidence usó,
qué Certainty tenía, y qué Costo de Error estimó.

**Implicaciones Cognitivas:**
- El registro se escribe en el momento de la decisión, no después.
- El registro es inmutable (no puede modificarse una vez escrito).
- El registro puede leerse para auditoría, aprendizaje, y reconstrucción.

**Impacto Conversacional:** Decisiones transparentes. Si un pasajero pregunta "¿por qué
mandaron un taxi a otra dirección?", el operador humano puede reconstruir exactamente
qué Evidence llevó a esa decisión.

**Verificación:** ¿Existe alguna decisión en el sistema cuyo registro no contenga todos
los campos obligatorios? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define dónde y cuándo se escribe el registro),
EVIDENCE_MODEL.md (define el esquema de Evidence de decisión).

---

### R-DM-032 — Five-level traceability chain

**Enunciado:** Toda decisión debe ser trazable a través de la cadena completa:

```
Decisión → Commitment → Belief(s) → Evidence → Observation → Signal
```

Cada eslabón debe referenciar al siguiente. Dado un ID de Decisión, debe ser posible
recuperar: los Commitments que produjo, las Beliefs que la motivaron, la Evidence que
sostenía esas Beliefs, las Observaciones que generaron esa Evidence, y los Signals
originales que iniciaron el proceso.

**Derivación Constitucional:** P-I5 (Auditability), CP-09 (trazabilidad), EVIDENCE_MODEL.md
R-EM-063 (trazabilidad de 5 niveles).

**Justificación:** Esta cadena es el cierre del ciclo de auditoría. Sin ella, una
decisión existe pero no puede conectarse con el input del usuario que la originó.

**Implicaciones Cognitivas:**
- La cadena se construye en el momento de la decisión, no retrospectivamente.
- Cada eslabón se almacena como referencia cruzada.
- La cadena debe ser recuperable mediante consultas deterministas.

**Impacto Conversacional:** Cada decisión tiene una "historia completa" que puede
narrarse. Si es necesario, se puede explicar al usuario: "Recibí tu mensaje a las 14:30
donde decías X, interpreté que querías ir a Y con una certidumbre de 0.85, y por eso
confirmé el viaje."

**Verificación:** ¿Existe alguna decisión cuyo registro no permita reconstruir la cadena
completa hasta el Signal original? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define la cadena de trazabilidad), COGNITIVE_ARCHITECTURE.md
(define la construcción de la cadena en cada fase).

---

## 16. Business Constraints and Conversational Context

### R-DM-033 — Business constraints as decision modifiers

**Enunciado:** Las restricciones del negocio (horarios de servicio, cobertura geográfica,
tipos de vehículo, límites de precio, etc.) modifican el espacio de decisión pero no lo
determinan. Una restricción de negocio puede:

- **Reducir las alternativas**: "No se puede despachar a esta zona" → la alternativa
  COMMIT se convierte en CLARIFY o ESCALATE.
- **Modificar el Costo de Error**: "Viaje fuera del área de servicio → costo de FP alto"
  → el umbral aumenta.
- **Cambiar la Strategic Posture**: "Hora pico → postura más conservadora" → umbral más
  alto.
- **Añadir precondiciones**: "Viaje internacional requiere documento de identidad" →
  nueva precondición para COMMIT.

**Derivación Constitucional:** CONSTITUTION.md §5.1 (alcance operacional), §5.3 (límites
del sistema), CP-23 (umbral dinámico).

**Justificación:** Las restricciones del negocio son externas al modelo cognitivo pero
deben integrarse en él. No hacerlo llevaría a decisiones que violan reglas de negocio.
El modelo de decisión debe ser sensible a estas restricciones sin estar determinado
por ellas.

**Implicaciones Cognitivas:**
- Las restricciones se consultan durante el Razonamiento, antes del gate de decisión.
- Si una restricción hace COMMIT imposible, la decisión se repliega a CLARIFY o ESCALATE.
- Las restricciones no deben hardcodearse en el proceso de decisión — deben ser
  configurables.

**Impacto Conversacional:** El sistema no propone acciones imposibles ("no puedo
despachar un taxi a esa zona") ni ignora límites operativos. El usuario recibe
explicaciones claras sobre por qué una acción no es posible.

**Verificación:** ¿Existe alguna decisión COMMIT que pueda violar una restricción de
negocio sin que el modelo la considere? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define cómo se integran las reglas de negocio),
DECISION_MODEL.md (define cómo las restricciones modifican el espacio de decisión).

---

### R-DM-034 — Conversational context as decision input

**Enunciado:** El contexto conversacional (historial de mensajes del ciclo actual,
relación con el usuario, estado del diálogo) debe considerarse como input en la decisión.
El contexto conversacional puede:

- **Afectar la interpretación de la Evidence**: "El usuario dijo 'sí' después de una
  pregunta de confirmación" (alta certidumbre) vs. "el usuario dijo 'sí' sin contexto"
  (certidumbre media).
- **Modificar el Costo de Error**: "Usuario nuevo sin historial" → costo de FP más alto
  (no conocemos sus patrones). "Usuario recurrente" → costo de FP más bajo.
- **Afectar la Strategic Posture**: "El usuario ya corrigió tres veces" → postura más
  conservadora (necesitamos más certidumbre).

**Derivación Constitucional:** CP-32 (preguntar con propósito), CP-34 (no-repregunta),
CP-36 (contexto mínimo).

**Justificación:** Las decisiones en un sistema conversacional no ocurren en el vacío.
El contexto del diálogo proporciona información valiosa que debe integrarse en la
evaluación de la decisión. Ignorar el contexto llevaría a decisiones que "suenan"
incorrectas aunque sean formalmente válidas.

**Implicaciones Cognitivas:**
- El contexto conversacional se almacena en el Knowledge State.
- Es consultado durante el Razonamiento como parte de la evaluación de la Evidence.
- Si el contexto sugiere que la certidumbre debería ser mayor o menor, eso se refleja
  en el cómputo de Certainty.

**Impacto Conversacional:** Las decisiones se sienten naturales porque consideran la
historia de la conversación. El sistema no repregunta lo que ya se dijo (CP-34),
entiende el contexto de las confirmaciones, y se adapta al ritmo del usuario.

**Verificación:** ¿Existe alguna decisión que ignore el contexto conversacional y trate
cada mensaje como una interacción aislada? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la estructura del contexto conversacional),
COGNITIVE_ARCHITECTURE.md (define cómo se integra el contexto en el Razonamiento).

---

## 17. Strategic Posture

### R-DM-035 — Strategic Posture as risk modulator

**Enunciado:** La Strategic Posture (SYSTEM_VOCABULARY.md 8.5) es un parámetro del sistema que
modula la tolerancia al riesgo ajustando los umbrales de decisión y los Costos de Error.
La postura tiene tres valores:

| Postura | Efecto en umbrales | Cuándo se usa |
|---------|-------------------|---------------|
| **CONSERVATIVE** | Aumenta todos los umbrales (más difícil COMMIT) | Contextos de alto riesgo: usuario nuevo, horario nocturno, error costoso |
| **BALANCED** | Umbrales por defecto calibrados por Costo de Error | Contexto normal |
| **AGGRESSIVE** | Reduce umbrales (más fácil COMMIT) | Contextos de bajo riesgo: usuario recurrente, acciones reversibles, urgencia |

**Derivación Constitucional:** CP-23 (umbral dinámico), P-E5 (Proportional Response),
SYSTEM_VOCABULARY.md §8.5 (Strategic Posture).

**Justificación:** El mismo nivel de certidumbre puede justificar una decisión en un
contexto y no en otro. La Strategic Posture captura esta sensibilidad al contexto de
forma explícita y configurable, en lugar de usar heurísticas ad-hoc.

**Implicaciones Cognitivas:**
- La postura se determina al inicio del Ciclo Cognitivo, antes del Razonamiento.
- La postura puede cambiar entre ciclos según el contexto.
- La postura nunca debe causar decisiones inseguras: AGGRESSIVE no puede reducir el
  umbral por debajo del mínimo seguro para decisiones irreversibles.
- La postura es parte del registro de decisión.

**Impacto Conversacional:** El sistema se adapta al contexto. Con un usuario conocido
en un horario normal, es más fluido (menos preguntas). Con un usuario nuevo de madrugada,
es más cuidadoso (más confirmaciones). El usuario siente que el sistema "entiende" la
situación.

**Verificación:** ¿Existe algún mecanismo de ajuste de comportamiento del sistema que
no pase por la Strategic Posture? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el impacto de cada postura en umbrales),
COGNITIVE_ARCHITECTURE.md (define la determinación de postura por contexto).

---

### R-DM-036 — Posture transition rules

**Enunciado:** La Strategic Posture puede cambiar entre ciclos cognitivos según reglas
explícitas:

| Transición | Condición |
|------------|-----------|
| Cualquiera → CONSERVATIVE | Alta tasa de errores recientes, usuario nuevo, horario nocturno (22:00–06:00), tipo de decisión irreversible, costo de error alto |
| Cualquiera → AGGRESSIVE | Usuario recurrente con buen historial, decisión reversible, bajo costo de error, urgencia del usuario detectada |
| Cualquiera → BALANCED | Contexto normal sin factores de riesgo |

La transición debe registrarse como parte del registro de decisión.

**Derivación Constitucional:** CP-23 (umbral dinámico), SYSTEM_VOCABULARY.md §8.5 (Strategic
Posture).

**Justificación:** La postura debe tener reglas de transición claras para que el cambio
de comportamiento sea predecible y auditable. Sin reglas explícitas, la postura sería un
mecanismo opaco.

**Implicaciones Cognitivas:**
- Las reglas de transición se evalúan al inicio de cada ciclo.
- Múltiples condiciones pueden apuntar a diferentes posturas; en ese caso, prevalece la
  más conservadora (seguridad primero — S-P8).
- La postura no cambia dentro de un mismo ciclo (consistencia intra-ciclo).

**Impacto Conversacional:** El sistema se adapta apropiadamente sin ser errático. La
transición a CONSERVATIVE en horario nocturno da seguridad; la transición a AGGRESSIVE
con un usuario conocido da fluidez.

**Verificación:** ¿Existe algún cambio de comportamiento del sistema que no esté cubierto
por las reglas de transición de Strategic Posture? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define la evaluación de postura al inicio del
ciclo), DECISION_MODEL.md (define las reglas de transición).

---

## 18. Intent Handling and Prioritization

### R-DM-037 — Intent identification and classification

**Enunciado:** En cada Ciclo Cognitivo, el sistema debe identificar la(s) Intención(es)
del usuario a partir de la Evidence disponible. La Intención es una Hipótesis sobre el
objetivo del usuario (SYSTEM_VOCABULARY.md §8.6). Las intenciones válidas son:

| Intención | Significado |
|-----------|-------------|
| **GREETING** | Saludo, inicio de conversación |
| **BOOKING** | Solicitud de nuevo viaje |
| **QUERY** | Consulta de información (precio, disponibilidad, estado) |
| **MANAGEMENT** | Gestión de viaje existente (modificar, cancelar, reprogramar) |
| **EMERGENCY** | Situación urgente que requiere atención inmediata |
| **AMBIGUOUS** | No se puede determinar la intención con certidumbre suficiente |

Una intención adicional, **CONTINUATION**, se usa cuando el mensaje del usuario es una
respuesta a una pregunta del sistema (no inicia un nuevo tema).

**Derivación Constitucional:** CP-16 (coexistencia de intenciones), SYSTEM_VOCABULARY.md §8.6
(Intent) y §8.7 (Primary Intent).

**Justificación:** Sin una clasificación explícita de intenciones, el sistema no sabe
"qué quiere el usuario" y no puede alinear su decisión con el objetivo del usuario. La
clasificación de intenciones es el puente entre el lenguaje natural del usuario y la
estructura de decisión del sistema.

**Implicaciones Cognitivas:**
- La identificación de intenciones ocurre en el Razonamiento temprano.
- Cada intención es una Hipótesis con su propia Certainty.
- La intención con mayor Certainty se convierte en Primaria (si supera el umbral de
  formación de creencia).
- Si ninguna intención supera el umbral, la decisión es CLARIFY (preguntar al usuario
  qué quiere).

**Impacto Conversacional:** El sistema entiende correctamente lo que el usuario quiere
hacer. No confunde una consulta de precio con una solicitud de viaje, ni un saludo con
una emergencia.

**Verificación:** ¿Existe algún mensaje del usuario cuyo procesamiento no pase por una
clasificación explícita de intención? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el clasificador de intenciones en el
Razonamiento), DECISION_MODEL.md (define cómo la intención guía la decisión).

---

### R-DM-038 — Intent-to-decision mapping

**Enunciado:** La Intención Primaria determina el tipo de decisión que el sistema debe
tomar:

| Intención Primaria | Tipo de decisión predominante | Alternativas posibles |
|-------------------|------------------------------|----------------------|
| GREETING | Interacción: COMMIT (saludar) | ABSTAIN (si ya saludó antes) |
| BOOKING | Compromiso: COMMIT (crear viaje) o CLARIFY (faltan datos) | ESCALATE (si no se puede crear), ABSTAIN (si no hay datos) |
| QUERY | Interacción: COMMIT (responder) o CLARIFY (más datos) | ESCALATE (si no se puede responder) |
| MANAGEMENT | Compromiso: COMMIT (modificar/cancelar) o CLARIFY | ESCALATE (si no se puede gestionar) |
| EMERGENCY | Compromiso: ESCALATE inmediato | COMMIT (si hay protocolo automático) |
| AMBIGUOUS | Interacción: CLARIFY (preguntar qué quiere) | ESCALATE (si no se resuelve) |
| CONTINUATION | Depende de la intención del ciclo anterior | — |

**Derivación Constitucional:** CP-16 (coexistencia de intenciones), CP-22 (compromiso
explícito).

**Justificación:** La intención del usuario es la brújula de la decisión. Sin este mapeo,
el sistema sabría qué cree el usuario pero no qué hacer al respecto.

**Implicaciones Cognitivas:**
- El mapeo se evalúa en el gate de decisión.
- La intención es uno de los inputs, no el único. La Evidence, Certainty, y Costo de
  Error también participan.
- Si la intención es EMERGENCY, el sistema puede saltar directamente a ESCALATE sin
  pasar por otras evaluaciones (por seguridad).

**Impacto Conversacional:** Las acciones del sistema están alineadas con lo que el
usuario quiere hacer. Si el usuario quiere consultar un precio, el sistema responde el
precio en lugar de iniciar el flujo de creación de viaje.

**Verificación:** ¿Existe alguna decisión que no considere la Intención Primaria del
usuario? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo intención → decisión),
DECISION_MODEL.md (define el mapeo completo).

---

## 19. Hypothesis Resolution and the Decision Gate

### R-DM-039 — Hypothesis resolution as epistemic decision

**Enunciado:** La resolución de Hipótesis (CP-17) es una decisión epistémica que ocurre
durante el Razonamiento, antes del gate de compromiso. Resolver una Hipótesis significa
elevarla al estatus de Belief. La resolución requiere:

1. La Hipótesis debe tener una condición de falsación (CP-14).
2. La Certainty de la Hipótesis debe superar el umbral de formación de creencia.
3. La Hipótesis debe tener ventaja epistémica suficiente sobre las alternativas (R-DM-018).
4. La resolución debe registrarse como decisión epistémica.

**Derivación Constitucional:** CP-13 (hipótesis múltiples), CP-14 (condición de
falsación), CP-17 (resolución por Evidence), CP-15 (fusión conservadora).

**Justificación:** Resolver una Hipótesis es una decisión con consecuencias epistémicas.
Decidir que "el origen ES Asunción" (y no San Lorenzo) determina todas las decisiones
posteriores. Esta decisión debe ser tan rigurosa como una decisión de compromiso.

**Implicaciones Cognitivas:**
- La resolución de Hipótesis es un sub-proceso dentro del Razonamiento.
- Si dos Hipótesis son compatibles y ambas tienen Evidence, el sistema debe fusionarlas
  (CP-15) en lugar de seleccionar una.
- La resolución no produce Commitment — solo crea una Belief.
- La resolución se registra como Evidence para trazabilidad.

**Impacto Conversacional:** Las creencias del sistema son robustas. No se forman creencias
frágiles que se deshacen con el mínimo Evidence en contrario. El usuario no experimenta
cambios de opinión por pequeñas fluctuaciones en la interpretación.

**Verificación:** ¿Existe alguna Belief en el sistema que se haya formado sin pasar por
una resolución explícita de Hipótesis? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso de resolución en el
Razonamiento), DECISION_MODEL.md (define los umbrales de resolución).

---

### R-DM-040 — Falsification-driven abandonment

**Enunciado:** Una Hipótesis debe abandonarse (descartarse como creencia posible, no
eliminarse del registro histórico) cuando se cumple su condición de falsación. El
abandono no es una decisión activa — es una consecuencia automática de la llegada de
Evidence que satisface la condición de falsación.

**Derivación Constitucional:** CP-14 (condición de falsación), CP-17 (resolución por
Evidence).

**Justificación:** Las Hipótesis sin condición de falsación son "prejuicios" del sistema
— creencias que no pueden refutarse. La falsación automática garantiza que el sistema
abandona Hipótesis cuando la Evidence las contradice, sin necesidad de una "decisión de
abandonar."

**Implicaciones Cognitivas:**
- La condición de falsación se define cuando se genera la Hipótesis.
- Cuando la Evidence positiva para una Hipótesis competidora alcanza el umbral de
  abandono de la Hipótesis actual, la Hipótesis actual se abandona automáticamente.
- El abandono no destruye la Hipótesis — se registra como "refutada" con referencia a
  la Evidence que la refutó.
- Una Hipótesis refutada no puede reactivarse sin nueva Evidence sustancial.

**Impacto Conversacional:** El sistema no se aferra a interpretaciones incorrectas. Si
el usuario dice "no, dije San Lorenzo, no Asunción", el sistema abandona la Hipótesis
"origen = Asunción" automáticamente.

**Verificación:** ¿Existe alguna Hipótesis activa en el sistema que no tenga una
condición de falsación definida? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el lifecycle de Hipótesis),
DECISION_MODEL.md (define los criterios de falsación por tipo de Hipótesis).

---

## 20. Learning from Decision Outcomes

### R-DM-041 — Outcome-driven calibration

**Enunciado:** El sistema debe calibrar sus parámetros de decisión en función de los
outcomes observados. La calibración ajusta:

| Parámetro | Cómo se ajusta | Frecuencia |
|-----------|----------------|------------|
| **Confidence de Sources** (CP-38) | Aumenta si la Source produce Evidence que lleva a outcomes exitosos; disminuye en caso contrario | Por evento, con ajuste gradual |
| **Costo de Error estimado** (R-DM-017) | Se recalibra comparando el costo estimado con el costo real observado | Periódicamente o con n outcomes acumulados |
| **Umbral de compromiso base** | Se ajusta si la tasa de aciertos/errores sugiere que el umbral es incorrecto | Periódicamente |
| **Margen epistémico** (R-DM-018) | Se ajusta si la tasa de cambios de decisión sugiere que el margen es insuficiente | Periódicamente |

**Derivación Constitucional:** CP-37 (retroalimentación por outcome), CP-38 (ajuste de
confianza de fuente).

**Justificación:** Un modelo de decisión que no aprende de sus errores es un modelo
estático. La calibración por outcomes es el mecanismo de aprendizaje del sistema.

**Implicaciones Cognitivas:**
- La calibración ocurre en segundo plano, no interrumpe el Ciclo Cognitivo.
- La calibración se basa en outcomes registrados como Evidence.
- Los cambios de calibración son graduales (no hay "reinicios" que borren el aprendizaje).
- La calibración puede revertirse si los outcomes posteriores muestran que el ajuste fue
  incorrecto.

**Impacto Conversacional:** El sistema mejora con la experiencia. Un sistema que lleva
un mes operando toma mejores decisiones que uno recién iniciado, porque ha calibrado sus
parámetros con outcomes reales.

**Verificación:** ¿Existe algún parámetro de decisión en el sistema que nunca se ajuste
en función de outcomes? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el modelo de calibración),
EVIDENCE_MODEL.md (define el esquema de Evidence de outcome).

---

### R-DM-042 — Negative outcome priority

**Enunciado:** Los outcomes negativos (fallos, errores, reclamos, cancelaciones por error
del sistema) deben tener mayor peso que los positivos en la calibración. La razón es
epistémica: es más costoso no aprender de un error que repetir un acierto.

**Derivación Constitucional:** CP-37 (retroalimentación por outcome — "feedback negativo
debe tener mayor peso"), CP-38 (ajuste de confianza).

**Justificación:** Un error de decisión (ej.: enviar un conductor al lugar equivocado)
tiene consecuencias operacionales y de confianza. Repetir ese error es inaceptable. Por
ello, el sistema debe aprender más rápido de los errores que de los aciertos.

**Implicaciones Cognitivas:**
- Los outcomes negativos se marcan como tales en el registro.
- El peso del ajuste para outcomes negativos es mayor que para positivos.
- Un solo outcome negativo puede reducir la Confidence de una Source más de lo que un
  outcome positivo la aumenta.
- La asimetría se reduce con el tiempo a medida que el sistema madura.

**Impacto Conversacional:** El sistema no repite errores. Si cometió un error (ej.:
interpretó mal una dirección), es muy probable que no lo vuelva a cometer porque aprendió
rápidamente de ese error.

**Verificación:** ¿Existe algún mecanismo de calibración que trate outcomes positivos y
negativos con el mismo peso? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define la asimetría de la función de ajuste).

---

## 21. Persistence and Reconstruction

### R-DM-043 — Decision records are persistent

**Enunciado:** Los registros de decisión deben persistirse de forma duradera e inmutable.
No pueden almacenarse exclusivamente en memoria volátil. La persistencia debe garantizar
que los registros sobreviven a reinicios del sistema.

**Derivación Constitucional:** S-P6 (Knowledge Preservation — el sistema nunca debe
perder su conocimiento), P-I5 (auditabilidad).

**Justificación:** Si los registros de decisión se pierden en un reinicio, no es posible
auditar las decisiones pasadas ni reconstruir el estado del sistema. La persistencia
duradera es necesaria para S-P6 y P-I5.

**Implicaciones Cognitivas:**
- Los registros de decisión se almacenan en el Evidence Store como Evidence (ver
  EVIDENCE_MODEL.md R-EM-058).
- La escritura del registro ocurre sincrónicamente con la decisión (no en segundo plano).
- Si la escritura falla, la decisión no puede considerarse COMPLETA (R-DM-009).

**Impacto Conversacional:** La continuidad del servicio está garantizada. Si el sistema
se reinicia, retoma las decisiones previas y el contexto conversacional no se pierde.

**Verificación:** ¿Existe alguna decisión cuyo registro pueda perderse en un reinicio del
sistema? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define la persistencia del Evidence Store),
COGNITIVE_ARCHITECTURE.md (define la escritura sincrónica de registros).

---

### R-DM-044 — State reconstruction from decisions

**Enunciado:** El estado operacional del sistema (viajes activos, compromisos vigentes)
debe poder reconstruirse a partir de los registros de decisión y el Evidence Store. Dado
que toda acción operacional es consecuencia de una Decisión COMMIT, el conjunto de
decisiones COMMIT activas (no cerradas, no revocadas) define el estado operacional.

**Derivación Constitucional:** CP-29 (reconstrucción desde Evidence), S-P6 (Knowledge
Preservation), EVIDENCE_MODEL.md R-EM-061 (reconstrucción desde Evidence).

**Justificación:** Si el estado volátil se pierde, los registros de decisión deben ser
suficientes para reconstruir qué compromisos están activos. Esto es necesario para la
resiliencia del sistema.

**Implicaciones Cognitivas:**
- La reconstrucción lee todos los registros de decisión COMMIT con estado COMMITTED o
  EXECUTING.
- Para cada uno, determina si el Commitment sigue activo (no cancelado, no cerrado).
- El resultado es el conjunto de compromisos vigentes.

**Impacto Conversacional:** Después de un reinicio, el sistema retoma las operaciones
sin perder información. Los viajes activos continúan, los compromisos se mantienen.

**Verificación:** ¿Existe algún estado operacional del sistema que no pueda reconstruirse
a partir de los registros de decisión? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la reconstrucción de compromisos desde
decisiones), COGNITIVE_ARCHITECTURE.md (define el flujo de recovery).

---

## 22. Invariants

### R-DM-045 — No decision without Evidence

**Enunciado:** Toda decisión debe tener al menos un registro de Evidence que la
fundamente. No existe la "decisión por defecto," la "decisión por intuición," ni la
"decisión administrativa" sin fundamento epistémico.

**Verificación:** Una decisión sin EvidenceIDs en su registro es inválida.

**Fuente:** S-P1, P-E1, P-I1, CP-17.

---

### R-DM-046 — No commitment without decision

**Enunciado:** No puede existir un Commitment que no tenga una Decisión COMMIT como
origen. Si existe un Commitment huérfano, es una violación del modelo.

**Verificación:** Todo Commitment debe tener una referencia a una Decisión.

**Fuente:** CP-22, R-DM-023.

---

### R-DM-047 — Decision record immutability

**Enunciado:** Una vez registrada, una decisión no puede modificarse. Ni su tipo, ni su
fundamento, ni su resultado. Las correcciones se hacen mediante nuevas decisiones que
referencian a la anterior.

**Verificación:** No existe una operación de "modificar decisión."

**Fuente:** S-P5, CP-08 (inmutabilidad extendida a decisiones por analogía epistémica).

---

### R-DM-048 — Single active decision per proposition

**Enunciado:** Para cada proposición activa (ej.: "origen del viaje #123"), el sistema
puede tener exactamente una decisión epistémica activa (Belief). No puede creer dos cosas
contradictorias sobre la misma proposición. Si hay múltiples Hipótesis, están en estado
de deliberación, no de decisión.

**Verificación:** En un momento dado, para cada proposición, el sistema tiene una única
Belief activa (la decisión epistémica ganadora).

**Fuente:** CP-17, R-DM-018.

---

### R-DM-049 — Respect authority boundaries

**Enunciado:** El sistema no puede tomar decisiones que excedan su autoridad autónoma
(CONSTITUTION.md §5.2). Las decisiones que requieren autoridad humana deben pasar a
ESCALATE o ABSTAIN automáticamente.

**Verificación:** Ninguna decisión COMMIT puede violar los límites de autoridad definidos
en CONSTITUTION.md §5.2.

**Fuente:** CONSTITUTION.md §5.2, S-P7.

---

### R-DM-050 — Deterministic decision outcome

**Enunciado:** Dado el mismo Knowledge State (misma Evidence, mismas Certainties, mismo
Costo de Error, misma Strategic Posture), el sistema debe tomar la misma decisión. El
proceso de decisión debe ser determinista.

**Verificación:** Si dos ejecuciones con el mismo Knowledge State producen decisiones
diferentes, el sistema viola este invariante.

**Fuente:** S-P4 (Deterministic Core por analogía — la decisión debe ser tan determinista
como la percepción), CP-07 (espíritu de determinismo).

---

## 23. Delegation to Implementation Documents

### 23.1 Documents that concretize this model

| Document | What it concretizes from this model |
|----------|-------------------------------------|
| **COGNITIVE_ARCHITECTURE.md** (Level II-b) | Gate de decisión (R-DM-004, R-DM-023), flujo de deliberación (R-DM-006), Hypothesis Network y resolución (R-DM-018, R-DM-039), detección de nueva Evidence (R-DM-029), flujo de revisión (R-DM-030), watchdog temporal (R-DM-007) |
| **COMMITMENT_MODEL.md** (Level III-c) | Máquina de estados de Commitment (R-DM-006, R-DM-023), registro con referencias a la Decisión (R-DM-024), detección de conflictos (R-DM-027), precedencia (R-DM-028), protocolo de revocación (R-DM-022), reconstrucción desde decisiones (R-DM-044) |
| **CERTAINTY_CALCULUS.md** (Level III-d) | Función de comparación Certainty ≥ umbral (R-DM-010, R-DM-014), agregación de Evidence (R-DM-015), margen epistémico (R-DM-018) |
| **EVIDENCE_MODEL.md** (Level III-a) | Evidence de decisión (R-DM-031, R-DM-032), Evidence de outcome (R-DM-026, R-DM-041), Evidence de silencio (R-DM-020), persistencia de registros (R-DM-043) |
| **ACTION_EXECUTOR.md** (Level III-g) | Ejecución subordinada a decisiones (R-DM-025), captura de outcomes (R-DM-026) |
| **KNOWLEDGE_MODEL.md** (Level III-f) | Integración de reglas de negocio (R-DM-033), contexto conversacional (R-DM-034), reconstruction desde decisiones (R-DM-044) |
| **CHANNEL_ADAPTER.md** (Level III-e) | Comunicación de CLARIFY y ESCALATE (R-DM-004, R-DM-012), mensajes de abstención (R-DM-011), explicación de decisiones al usuario |

### 23.2 Traceability matrix

| Rule | Source CP | Source Constitution | Source EVIDENCE_MODEL | Implements for |
|------|-----------|-------------------|----------------------|----------------|
| R-DM-001 | CP-17, CP-22 | §2.2, S-P1, P-I5 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL.md |
| R-DM-002 | CP-22 | §2.1 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL.md |
| R-DM-003 | CP-22, CP-32 | §2.3 | — | COMMITMENT_MODEL.md |
| R-DM-004 | CP-22, CP-26 | §3.4, S-P7 | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL.md, CHANNEL_ADAPTER.md |
| R-DM-005 | CP-25, CP-12 | P-E5 | — | COMMITMENT_MODEL.md, CERTAINTY_CALCULUS.md |
| R-DM-006 | CP-22, CP-04 | P-I5 | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-007 | CP-04, CP-26 | S-P7 | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-008 | CP-22, CP-16 | S-P1 | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-009 | CP-22, CP-37 | P-I5 | R-EM-058 | COGNITIVE_ARCHITECTURE.md, EVIDENCE_MODEL.md |
| R-DM-010 | CP-23, CP-12 | §3.4, P-E5 | — | CERTAINTY_CALCULUS.md |
| R-DM-011 | CP-12 | §5.2 | — | COGNITIVE_ARCHITECTURE.md, CHANNEL_ADAPTER.md |
| R-DM-012 | CP-26, CP-10 | S-P7 | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-013 | CP-05 | S-P1 | R-EM-001 | EVIDENCE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-014 | CP-18, CP-22 | P-E2 | — | CERTAINTY_CALCULUS.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-015 | CP-20, CP-10 | — | R-EM-035 | CERTAINTY_CALCULUS.md |
| R-DM-016 | CP-24 | §3.4, P-E5 | — | COMMITMENT_MODEL.md |
| R-DM-017 | CP-37, CP-38 | — | — | EVIDENCE_MODEL.md |
| R-DM-018 | CP-13, CP-17, CP-14 | — | — | COGNITIVE_ARCHITECTURE.md, CERTAINTY_CALCULUS.md |
| R-DM-019 | CP-16 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-020 | CP-11 | — | — | EVIDENCE_MODEL.md |
| R-DM-021 | CP-25 | P-E5, S-P7 | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-022 | CP-39, P-E4 | P-I5 | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-023 | CP-22, CP-23 | P-I5 | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-024 | CP-22 | P-I5 | — | COMMITMENT_MODEL.md |
| R-DM-025 | CP-01, CP-22 | — | — | ACTION_EXECUTOR.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-026 | CP-37, CP-38 | — | — | ACTION_EXECUTOR.md, EVIDENCE_MODEL.md |
| R-DM-027 | CP-10, CP-15 | — | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-028 | S-P8, CP-10 | — | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-029 | P-E4, CP-34, CP-17 | — | — | COGNITIVE_ARCHITECTURE.md, COMMITMENT_MODEL.md |
| R-DM-030 | P-E4, CP-39, CP-08 | — | — | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-031 | CP-22, CP-09 | P-I5 | — | COGNITIVE_ARCHITECTURE.md, EVIDENCE_MODEL.md |
| R-DM-032 | CP-09 | P-I5 | R-EM-063 | EVIDENCE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-033 | CP-23 | §5.1, §5.3 | — | KNOWLEDGE_MODEL.md |
| R-DM-034 | CP-32, CP-34, CP-36 | — | — | KNOWLEDGE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-035 | CP-23 | P-E5 | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-036 | CP-23 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-037 | CP-16 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-038 | CP-16, CP-22 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-039 | CP-13, CP-14, CP-17, CP-15 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-040 | CP-14, CP-17 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-041 | CP-37, CP-38 | — | — | EVIDENCE_MODEL.md |
| R-DM-042 | CP-37, CP-38 | — | — | DECISION_MODEL.md |
| R-DM-043 | CP-29 | S-P6, P-I5 | R-EM-058 | EVIDENCE_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-044 | CP-29 | S-P6 | R-EM-061 | COMMITMENT_MODEL.md, COGNITIVE_ARCHITECTURE.md |
| R-DM-045 | CP-17 | S-P1, P-E1, P-I1 | — | Todas |
| R-DM-046 | CP-22 | — | — | COMMITMENT_MODEL.md |
| R-DM-047 | CP-08 | S-P5 | — | EVIDENCE_MODEL.md |
| R-DM-048 | CP-17 | — | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-049 | — | §5.2, S-P7 | — | COGNITIVE_ARCHITECTURE.md |
| R-DM-050 | CP-07 (espíritu), S-P4 | — | — | COGNITIVE_ARCHITECTURE.md |

---

## Appendix — Response Map

| Question | Answering rules |
|----------|----------------|
| ¿Qué es una decisión? | R-DM-001, R-DM-002, R-DM-003 |
| ¿Cuándo puede tomarse? | R-DM-008, R-DM-010, R-DM-013 |
| ¿Cuándo debe postergarse? | R-DM-011 (ABSTAIN) |
| ¿Cuándo debe rechazarse? | R-DM-012 (ESCALATE), R-DM-049 (autoridad) |
| ¿Qué información mínima requiere? | R-DM-008, R-DM-013, R-DM-016 |
| ¿Cómo utiliza Evidence? | R-DM-013, R-DM-015 |
| ¿Cómo utiliza Knowledge? | R-DM-008, R-DM-034 |
| ¿Cómo utiliza Certainty? | R-DM-014, R-DM-015 |
| ¿Cómo utiliza Cost of Error? | R-DM-016, R-DM-017 |
| ¿Cómo resuelve incertidumbre? | R-DM-018, R-DM-020, R-DM-039 |
| ¿Cómo decide entre múltiples alternativas? | R-DM-004, R-DM-019, R-DM-038 |
| ¿Cómo maneja decisiones reversibles e irreversibles? | R-DM-021, R-DM-022 |
| ¿Cómo registra sus fundamentos? | R-DM-009, R-DM-031 |
| ¿Cómo garantiza trazabilidad? | R-DM-031, R-DM-032 |
| ¿Cómo interactúa con Commitment? | R-DM-023, R-DM-024 |
| ¿Cómo interactúa con Action Executor? | R-DM-025, R-DM-026 |

---

*Fin de 05-DECISION_MODEL.md — Versión 1.0-draft*

> Este documento fue redactado a partir de CONSTITUTION.md (Level I-a), SYSTEM_VOCABULARY.md
> (Level I-b), COGNITIVE_PRINCIPLES.md (Level II-a), y EVIDENCE_MODEL.md (Level III-a)
> siguiendo las delegaciones explícitas de CP §13.2.
>
> Fecha: 2026-07-11
