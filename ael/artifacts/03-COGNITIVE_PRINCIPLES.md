# AITOS Cognitive Constitution — 03-COGNITIVE_PRINCIPLES.md

> **Operational Principles of the AI Transportation Operating System**
>
> Status: **DRAFT** — written from approved architectural design
> Version: 1.0-draft
> Date: 2026-07-11
>
> ⚠️ This document belongs to **Level II-a (Structural Authority)** of the AITOS
> Document Hierarchy. It derives from CONSTITUTION.md (Level I-a) and ONTOLOGY.md
> (Level I-b). Every principle herein is binding on Level III and Level IV documents,
> decisions, and implementations. Violations are technical debt managed under S-P9.

---

## Table of Contents

1. [Preliminares](#1-preliminares)
2. [Principios del Ciclo Cognitivo](#2-principios-del-ciclo-cognitivo)
3. [Principios de Percepción](#3-principios-de-percepción)
4. [Principios de Evidencia](#4-principios-de-evidencia)
5. [Principios de Razonamiento e Hipótesis](#5-principios-de-razonamiento-e-hipótesis)
6. [Principios de Certidumbre](#6-principios-de-certidumbre)
7. [Principios de Compromiso](#7-principios-de-compromiso)
8. [Principios de Proyección](#8-principios-de-proyección)
9. [Principios de Memoria](#9-principios-de-memoria)
10. [Principios de Interacción](#10-principios-de-interacción)
11. [Principios de Aprendizaje](#11-principios-de-aprendizaje)
12. [Precedencia entre principios](#12-precedencia-entre-principios)
13. [Derivación constitucional](#13-derivación-constitucional)

---

## 1. Preliminares

### 1.1 Propósito

COGNITIVE_PRINCIPLES.md traduce los **principios constitucionales abstractos**
(Level I) en **principios cognitivos operativos** (Level II-a). Constituye el
puente normativo entre:

```
CONSTITUTION.md                     — identidad, valores, principios supremos
    ↓  deriva
COGNITIVE_PRINCIPLES.md             — reglas de operación cognitiva
    ↓  concreta
COGNITIVE_ARCHITECTURE.md           — componentes, flujos, ciclos
DECISION_MODEL.md                   — mecánica de decisión
KNOWLEDGE_MODEL.md                  — estructuras de conocimiento
EVIDENCE_MODEL.md                   — modelo de datos de evidencia
CERTAINTY_CALCULUS.md               — matemática de certidumbre
COMMITMENT_MODEL.md                 — ciclo de vida del compromiso
CHANNEL_ADAPTER.md                  — interfaz de canales
ACTION_EXECUTOR.md                  — ejecutor de acciones
    ↓  implementa
CÓDIGO, PROMPTS, CONFIG, RUNBOOKS  — implementación ejecutable
```

Sin COGNITIVE_PRINCIPLES.md, el salto de la Constitución a la Arquitectura es
demasiado grande. Los arquitectos interpretarían la Constitución subjetivamente
y el resultado sería divergente.

### 1.2 Autoridad

Este documento tiene **autoridad estructural (Level II-a)** según la jerarquía
definida en CONSTITUTION.md Sección 6.

| Dependencia | Relación |
|---|---|
| **CONSTITUTION.md** (Level I-a) | Fuente de principios constitucionales. CP refina, no repite. |
| **ONTOLOGY.md** (Level I-b) | Fuente terminológica. CP usa términos definidos, no redefine. |
| **COGNITIVE_ARCHITECTURE.md** (Level II-b) | Destino de delegación. CP dice QUÉ; Arquitectura dice DÓNDE. |
| **ADRs** (Level II-c) | Decisiones arquitectónicas individuales. Deben ser compatibles con CP. |
| Documentos de Nivel III | Destinos de delegación. Cada principio indica qué documento lo concreta. |

**Regla de autoridad:** Los principios de este documento son vinculantes para
toda decisión arquitectónica y de implementación. Pueden ser temporalmente
suspendidos mediante S-P9 (Constitutional Integrity), pero una suspensión
constituye deuda técnica que debe resolverse.

### 1.3 Estabilidad y cambio

Este documento es **estable** según la clasificación del CONSTITUTION_MASTER_PLAN:

- **Agregar** principios: permitido con revisión de compatibilidad con Level I.
- **Modificar** principios: solo si no hay alternativa (requiere ADR + revisión
  Level I).
- **Eliminar** principios: solo si el principio migra a la Constitución o
  demuestra ser incorrecto (requiere enmienda constitucional si afecta Level I).

### 1.4 Lectura de este documento

Cada principio en las Secciones 2–11 sigue este formato:

```
### CP-NN — Nombre del principio

> **Enunciado:** Una oración normativa.

**Derivación constitucional:** Principio(s) de CONSTITUTION.md del que deriva.

**Justificación:** Por qué existe este principio y qué problema resuelve.

**Implicaciones cognitivas:** Qué significa para el comportamiento del sistema.

**Verificación:** Criterio binario para determinar si un cambio viola este principio.

**Delegación:** Documento(s) de Nivel III que concretan este principio.
```

Los principios se numeran como CP-01 a CP-NN. La Sección 12 establece reglas
de precedencia entre principios. La Sección 13 mapea cada principio a su fuente
constitucional y a sus documentos de Nivel III.

---

## 2. Principios del Ciclo Cognitivo

> El Ciclo Cognitivo (ONTOLOGY.md 7.1) es el proceso fundamental de AITOS:
> desde la recepción de un Signal hasta la actualización del Knowledge State
> y la generación de una Acción. Estos principios gobiernan cómo se estructura
> y ejecuta el ciclo.

### CP-01 — Principio de ciclo completo

> **Enunciado:** Toda unidad de trabajo que transforma un Signal en una Acción
> debe completar el Ciclo Cognitivo completo (Percepción → Razonamiento →
> Compromiso → Proyección) antes de producir una Acción externa.

**Derivación constitucional:** Sección 2.1 (AITOS opera mediante ciclo cognitivo),
S-P1 (Evidence-Based Operation).

**Justificación:** Sin la obligación de ciclo completo, el sistema podría
producir Acciones basadas en fases incompletas del ciclo — por ejemplo,
proyectar sin haber comprometido, o comprometer sin haber razonado. Esto
violaría S-P1 porque una Acción sin ciclo completo carece de la cadena de
Evidencia que la respalde.

**Implicaciones cognitivas:** Ningún componente puede "saltar" directamente
a Proyección o Acción. Si un componente recibe un Signal, debe atravesar todas
las fases del ciclo. Las optimizaciones que acorten el ciclo (cacheo de
resultados intermedios) son permitidas solo si preservan la equivalencia
funcional del ciclo completo.

**Verificación:** ¿Existe una ruta de código que genere una Acción externa sin
haber ejecutado las cuatro fases del Ciclo Cognitivo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define los componentes de cada fase),
ACTION_EXECUTOR.md (garantiza que ninguna Acción se emita sin ciclo completo).

### CP-02 — Principio de secuencia estricta

> **Enunciado:** Las fases del Ciclo Cognitivo deben ejecutarse en el orden
> estricto: Percepción → Razonamiento → Compromiso → Proyección. Ninguna fase
> puede comenzar antes de que la anterior haya completado su output.

**Derivación constitucional:** Sección 2.1 (identidad del sistema), P-I1 (Evidence
Primacy).

**Justificación:** El orden del ciclo no es arbitrario — cada fase produce un
output que la siguiente fase consume. Percepción produce Evidence; Razonamiento
consume Evidence y produce Beliefs y certidumbre; Compromiso consume certidumbre
y produce Commitment; Proyección consume Commitment y produce una Operational
Projection. Invertir el orden produce decisiones basadas en información
incompleta.

**Implicaciones cognitivas:** No se puede comprometer antes de razonar. No se
puede proyectar antes de comprometer. Las fases pueden tener subciclos internos
(micro-ciclos de razonamiento), pero el macro-ciclo mantiene la secuencia.

**Verificación:** ¿Existe algún flujo donde una fase reciba input de una fase
posterior o salte una fase intermedia? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el secuenciador del ciclo).

### CP-03 — Principio de completitud por ciclo

> **Enunciado:** Cada iteración del Ciclo Cognitivo debe producir un conjunto
> completo de outputs para su fase antes de avanzar a la siguiente.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), S-P7 (Human
Escalation).

**Justificación:** Una fase que avanza sin completar su output deja el ciclo
en un estado indeterminado. Por ejemplo, un Razonamiento que no resuelve todas
las Hipótesis activas transfiere ambigüedad no resuelta al Compromiso, que
podría comprometerse con certidumbre insuficiente o escalar prematuramente.

**Implicaciones cognitivas:** Cada fase tiene un criterio de completitud
definido:
- Percepción completa cuando el Signal se ha transformado en Evidence.
- Razonamiento completa cuando las Hipótesis están resueltas o se determina
  que se necesita más Evidence.
- Compromiso completa cuando se ha tomado una decisión (comprometer, clarificar,
  escalar).
- Proyección completa cuando se ha generado la Operational Projection y la
  respuesta externa.

**Verificación:** ¿Existe un flujo donde una fase avanza sin cumplir su criterio
de completitud? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define criterios de completitud de
cada fase).

### CP-04 — Principio de límite temporal del ciclo

> **Enunciado:** Cada iteración del Ciclo Cognitivo debe tener un límite
> temporal máximo, transcurrido el cual el sistema debe interrumpir el ciclo
> y adoptar un estado seguro (escalamiento humano o fallo controlado).

**Derivación constitucional:** S-P7 (Human Escalation), S-P4 (Deterministic
Core).

**Justificación:** Sin límite temporal, un ciclo que no converge (ej.:
Razonamiento que no puede resolver Hipótesis, o Proyección que depende de un
servicio externo que no responde) mantendría al sistema en un estado de
procesamiento perpetuo, impidiendo que responda al usuario o escale a un
operador humano. El límite temporal es una salvaguarda cognitiva, no una
métrica de rendimiento.

**Implicaciones cognitivas:** El sistema debe definir un tiempo máximo por fase
y un tiempo máximo total por ciclo. Al exceder el límite:
1. El ciclo se interrumpe.
2. El estado actual se preserva (Knowledge State no se pierde).
3. Se ejecuta el protocolo de escalamiento (S-P7) o fallo controlado (S-P4).
4. Se registra el evento para diagnóstico.

Los límites temporales deben ser configurables por tipo de ciclo (nuevo viaje,
modificación, consulta) y por Strategic Posture.

**Verificación:** ¿Existe algún escenario donde un Ciclo Cognitivo pueda
prolongarse indefinidamente sin intervención? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el watchdog del ciclo),
DECISION_MODEL.md (define los tiempos por fase según Strategic Posture).

---

## 3. Principios de Percepción

> La Percepción (ONTOLOGY.md 4.x, 7.2) es la fase que transforma un Signal
> en Evidence. Es la puerta de entrada del sistema. Estos principios gobiernan
> cómo los señales del mundo exterior se convierten en la materia prima de la
> cognición.

### CP-05 — Principio de frontera percepción/evidencia

> **Enunciado:** Un Signal se convierte en Evidence solo cuando ha sido
> registrado en el Evidence Store. Mientras no esté registrado, es un Signal
> transitorio sin valor epistémico.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), S-P5 (Evidence
Immutability).

**Justificación:** La distinción entre Signal y Evidence es fundamental para
la integridad epistémica del sistema (ONTOLOGY.md 4.1, 5.1). Un Signal que
existe solo en memoria volátil o en un buffer de entrada puede perderse y
nunca afectar las decisiones del sistema. Solo lo que está registrado como
Evidence puede fundamentar Beliefs y Commitment. Esta frontera evita que el
sistema actúe sobre información no confirmada.

**Implicaciones cognitivas:** Ninguna fase del ciclo posterior a Percepción
puede operar sobre Signals no registrados. Si un Signal no puede registrarse
como Evidence (fallo del Evidence Store), el ciclo debe abortar con
escalamiento. El registro en el Evidence Store es el acto que otorga
ciudadanía epistémica a un Signal.

**Verificación:** ¿Existe alguna decisión o Acción basada en información que
no esté registrada como Evidence en el Evidence Store? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el componente de registro),
EVIDENCE_MODEL.md (define el esquema de registro).

### CP-06 — Principio de registro antes de interpretación

> **Enunciado:** El registro del Signal como Evidence debe ocurrir antes de
> cualquier interpretación, inferencia o transformación del contenido del Signal.

**Derivación constitucional:** S-P5 (Evidence Immutability), P-I1 (Evidence
Primacy).

**Justificación:** Si se interpreta un Signal antes de registrarlo, se pierde
la traza de la observación original. El sistema solo tendría la interpretación,
no la evidencia fuente. Esto viola S-P5 porque la evidencia original nunca fue
registrada y no puede auditarse. El principio de "raw evidence first" es
análogo al principio científico de registrar datos brutos antes de analizarlos.

**Implicaciones cognitivas:** El registro de Evidence crudo (raw) es un paso
obligatorio antes de cualquier procesamiento. La "interpretación" incluye:
extracción de entidades, clasificación de intención, inferencia de significado,
y cualquier transformación del contenido del Signal. El Evidence registrado
debe contener el Signal original o una representación fiel del mismo.

**Verificación:** ¿Existe un flujo donde el contenido de un Signal se
interprete o procese antes de registrarse como Evidence? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el esquema de Evidence raw),
COGNITIVE_ARCHITECTURE.md (define el flujo Percepción → registro).

### CP-07 — Principio de determinismo perceptual

> **Enunciado:** El mismo Signal, recibido en las mismas condiciones, debe
> producir el mismo Evidence registrado, independientemente de componentes
> no deterministas del sistema.

**Derivación constitucional:** S-P4 (Deterministic Core).

**Justificación:** La Percepción es la base de todo el Ciclo Cognitivo. Si
la Percepción es no determinista (el mismo Signal produce Evidence diferente
en diferentes ejecuciones), entonces todo el ciclo descendente
(Razonamiento → Compromiso → Proyección) opera sobre fundamentos inestables.
La Percepción debe ser determinista para que el sistema sea predecible y
auditable.

**Implicaciones cognitivas:** La fase de Percepción no puede depender de
componentes no deterministas (LLMs, modelos probabilísticos, APIs externas)
para su función de registro. Si se utiliza un componente no determinista
para enriquecer el registro (ej.: etiquetado automático), el Evidence raw
debe registrarse antes y el enriquecimiento debe ser un paso posterior y
opcional. El registro determinista es la única parte obligatoria de la
Percepción.

**Verificación:** ¿Existe un escenario donde el mismo Signal pueda producir
Evidence diferente debido a un componente no determinista en la fase de
registro? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el proceso determinista de
Percepción), EVIDENCE_MODEL.md (define el formato de Evidence raw).

---

## 4. Principios de Evidencia

> La Evidence (ONTOLOGY.md 5.1) es la materia prima de toda cognición en
> AITOS. Es el sustituto operacional de la Verdad (CONSTITUTION.md 3.2).
> Estos principios gobiernan cómo la Evidence se acumula, resuelve y utiliza.

### CP-08 — Principio de inmutabilidad operativa de la Evidence

> **Enunciado:** Una vez registrada en el Evidence Store, la Evidence no puede
> ser modificada ni eliminada por ningún proceso cognitivo del sistema. Solo
> puede agregarse nueva Evidence.

**Derivación constitucional:** S-P5 (Evidence Immutability).

**Justificación:** La Constitución establece la inmutabilidad de la Evidence
como principio supremo. Este principio refina S-P5 para el dominio operativo:
no solo la Evidence es inmutable en términos de almacenamiento, sino que
ningún proceso cognitivo (Razonamiento, Aprendizaje, Compromiso) puede
alterar la Evidence registrada. La inmutabilidad es una restricción activa
que opera durante todo el Ciclo Cognitivo, no solo una propiedad de la base
de datos.

**Implicaciones cognitivas:**
- El Evidence Store es append-only: solo se agregan registros, nunca se
  modifican ni eliminan.
- Los procesos de Razonamiento pueden leer Evidence y producir nueva Evidence
  (inferencias), pero no pueden modificar la Evidence fuente.
- Los procesos de Aprendizaje pueden agregar nueva Evidence (outcomes), pero
  no pueden corregir Evidence pasada.
- Si se descubre que una Evidence es incorrecta (ej.: el usuario se retracta),
  se agrega una nueva Evidence que la contradice. La Evidence original
  permanece como registro histórico.

**Verificación:** ¿Existe algún proceso cognitivo que pueda modificar o
eliminar un registro de Evidence previamente registrado? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el esquema append-only del Evidence
Store), COGNITIVE_ARCHITECTURE.md (define el acceso de solo lectura desde los
procesos cognitivos).

### CP-09 — Principio de trazabilidad observacional

> **Enunciado:** Toda Evidence debe ser trazable hasta el Signal que la
> originó, incluyendo el canal, el momento, y las condiciones de la observación.

**Derivación constitucional:** P-I5 (Auditability of Every Decision).

**Justificación:** Sin trazabilidad observacional, una decisión no puede
auditarse hasta su origen sensorial. La Constitución exige que toda decisión
sea trazable a la Evidence que la motivó (P-I5). Este principio extiende
esa trazabilidad hasta el Signal mismo, cerrando el círculo de auditoría
desde la decisión hasta la percepción original.

**Implicaciones cognitivas:** Cada registro de Evidence debe incluir metadatos
de trazabilidad:
- Referencia al Signal original o su hash.
- Canal de entrada (WhatsApp, API, web).
- Timestamp de percepción (UTC).
- Identificador del Ciclo Cognitivo que la generó.
- Source del que procede (ONTOLOGY.md 4.6).
Si la trazabilidad no puede establecerse, la Evidence no puede utilizarse
para decisiones que requieran auditabilidad (P-I5).

**Verificación:** ¿Existe Evidence en el Evidence Store que no pueda
trazarse hasta un Signal específico con canal, momento y condiciones
conocidas? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define los campos de trazabilidad),
COGNITIVE_ARCHITECTURE.md (define el flujo Signal → Evidence con trazabilidad).

### CP-10 — Principio de resolución de Evidence conflictiva

> **Enunciado:** Cuando dos o más registros de Evidence apoyan conclusiones
> contradictorias, el sistema debe resolver el conflicto mediante reglas
> epistémicas (peso por Source, certidumbre, corroboración), no mediante
> reglas arbitrarias (ultimo registro, orden de llegada, preferencia
> hardcodeada).

**Derivación constitucional:** S-P1 (Evidence-Based Operation), P-E1 (Evidence
over Intuition).

**Justificación:** La Evidence conflictiva es inevitable en un sistema que
opera sobre lenguaje natural. Dos mensajes del usuario pueden contradecirse.
Una extracción automática puede contradecir una confirmación explícita.
Resolver estos conflictos mediante reglas arbitrarias (ej.: "el último
mensaje siempre gana") viola S-P1 porque la decisión no se basa en la
totalidad de la Evidence, sino en una heurística. La resolución debe ser
epistémica: evaluar cada pieza de Evidence por su Source, Confidence,
y consistencia con el resto de la Evidence.

**Implicaciones cognitivas:**
- La resolución de conflictos de Evidence es parte del Razonamiento, no de
  la Percepción.
- El sistema debe considerar toda la Evidence relevante, no solo la más
  reciente.
- Las reglas de resolución deben ser explícitas, deterministas y auditables.
- Factores de resolución: Confidence del Source, cantidad de Evidence
  corroborante, coherencia interna, recencia (como factor secundario).

**Verificación:** ¿Existe algún mecanismo de resolución de Evidence
conflictiva que no considere explícitamente el peso epistémico de cada
registro? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define las reglas de resolución de
conflictos), EVIDENCE_MODEL.md (define cómo se relacionan los registros
de Evidence entre sí).

### CP-11 — Principio de silencio como Evidence

> **Enunciado:** La ausencia de una respuesta esperada (silencio del usuario,
> timeout de un servicio, falta de confirmación) constituye Evidence que
> debe registrarse y considerarse en el Ciclo Cognitivo.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), P-E1 (Evidence
over Intuition).

**Justificación:** En un sistema conversacional, el silencio transporta
información. Un usuario que no responde a una pregunta de confirmación puede
estar indicando acuerdo implícito, desacuerdo, distracción, o abandono. El
sistema no puede ignorar el silencio ni tratarlo como "no-Evidence" — debe
registrarlo como Evidence con su Confidence correspondiente (baja, porque el
silencio es inherentemente ambiguo). Ignorar el silencio es equivalente a
tomar decisiones sin considerar toda la Evidence disponible.

**Implicaciones cognitivas:**
- El paso del tiempo sin respuesta es un evento que debe registrarse como
  Evidence.
- Cada tipo de silencio tiene un peso epistémico diferente: timeout corto
  sin respuesta → evidencia débil de acuerdo; timeout largo sin respuesta →
  evidencia de posible abandono.
- El silencio nunca debe interpretarse como confirmación de alta certidumbre.
- La interpretación del silencio debe calibrarse según el contexto (tipo de
  pregunta, Strategic Posture, historial del usuario).

**Verificación:** ¿Existe algún escenario donde el sistema ignore el silencio
del usuario o el timeout de un servicio y proceda sin registrar ese evento
como Evidence? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define la calibración de silencio como
Evidence), EVIDENCE_MODEL.md (define el formato de Evidence de silencio),
COGNITIVE_ARCHITECTURE.md (define el watchdog de tiempos de espera).

### CP-12 — Principio de suficiencia mínima

> **Enunciado:** El sistema debe operar con la cantidad mínima de Evidence
> suficiente para la fase cognitiva actual, sin esperar certidumbre completa
> ni acumular Evidence innecesaria antes de avanzar.

**Derivación constitucional:** Sección 3.4 (Sufficiency, Not Certainty), S-P1
(Evidence-Based Operation).

**Justificación:** La Constitución (3.4) establece que el sistema requiere
certidumbre suficiente, no absoluta, para actuar. Este principio refina ese
mandato a nivel operativo: en cada fase del ciclo, el sistema debe evaluar
si la Evidence acumulada es suficiente para avanzar a la siguiente fase, no
si es completa. La suficiencia se determina por el costo de error de avanzar
vs. el costo de esperar más Evidence. Acumular Evidence innecesaria retrasa
el ciclo sin aumentar la calidad de la decisión.

**Implicaciones cognitivas:**
- Cada fase tiene un criterio de suficiencia: ¿hay suficiente Evidence para
  razonar? ¿suficiente certidumbre para comprometer? ¿suficiente Commitment
  para proyectar?
- El criterio de suficiencia es dinámico: depende del costo de error del
  contexto actual (CP-16).
- El sistema no debe preguntar por más Evidence de la necesaria (principio
  de contexto mínimo, CP-26).
- Si la Evidence es insuficiente, el sistema debe clarificar o escalar
  (CP-18), no esperar pasivamente.

**Verificación:** ¿Existe algún flujo donde el sistema retrase una decisión
más allá del punto de suficiencia definido por el costo de error actual?
Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el cálculo de suficiencia por fase),
COGNITIVE_ARCHITECTURE.md (define los gates de suficiencia entre fases).

---

## 5. Principios de Razonamiento e Hipótesis

> El Razonamiento (ONTOLOGY.md 7.3) es la fase que integra nueva Evidence con
> el Knowledge State existente, genera y resuelve Hipótesis, y prepara el
> terreno para el Compromiso. Estos principios gobiernan cómo el sistema
> piensa antes de decidir.

### CP-13 — Principio de Hipótesis múltiples

> **Enunciado:** Cuando la Evidence disponible es ambigua o insuficiente para
> sostener una única creencia, el sistema debe mantener múltiples Hipótesis
> activas simultáneamente en lugar de seleccionar prematuramente una.

**Derivación constitucional:** P-E1 (Evidence over Intuition), P-E4
(Revisability of Beliefs).

**Justificación:** Seleccionar una única interpretación cuando la evidencia
es ambigua es una forma de sesgo cognitivo: el sistema elige una Hipótesis
antes de tener suficiente Evidence, y luego interpreta toda nueva Evidence
para confirmarla. Mantener múltiples Hipótesis activas permite que el
sistema evalúe objetivamente cada nueva Evidence contra todas las
alternativas, y solo resuelva cuando una Hipótesis tenga suficiente ventaja
epistémica sobre las demás.

**Implicaciones cognitivas:**
- El Razonamiento debe generar Hipótesis para todas las interpretaciones
  plausibles de la Evidence.
- Cada Hipótesis debe mantenerse activa mientras su certidumbre esté por
  encima de un umbral mínimo de supervivencia.
- Una Hipótesis no se descarta simplemente porque otra tenga más Evidence —
  se descarta solo cuando su certidumbre cae por debajo del umbral de
  abandono.
- El número de Hipótesis activas es una función de la ambigüedad de la
  Evidence: a mayor ambigüedad, mayor número de Hipótesis.

**Verificación:** ¿Existe algún escenario de Evidence ambigua donde el
sistema seleccione una única interpretación sin considerar alternativas?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el Hypothesis Network),
DECISION_MODEL.md (define umbrales de supervivencia y abandono de Hipótesis).

### CP-14 — Principio de condición de falsación

> **Enunciado:** Toda Hipótesis debe tener una condición de falsación
> explícita: un criterio claro y determinista bajo el cual la Hipótesis se
> considera refutada y se descarta.

**Derivación constitucional:** P-E4 (Revisability of Beliefs), P-E1 (Evidence
over Intuition).

**Justificación:** Una Hipótesis sin condición de falsación no es una
Hipótesis — es una creencia disfrazada. Si el sistema no puede determinar
cuándo una Hipótesis está refutada, la Hipótesis puede persistir
indefinidamente, distorsionando el Razonamiento y el Compromiso. La
falsación explícita es el mecanismo que garantiza que P-E4 (Revisability)
sea operativa: una creencia solo es revisable si se sabe exactamente qué la
refutaría.

**Implicaciones cognitivas:**
- Cada Hipótesis debe declarar: "esta Hipótesis se descarta si ocurre X."
- X debe ser un evento observable (una respuesta del usuario, un resultado
  de extracción, un hecho externo), no una condición subjetiva.
- Si una Hipótesis no puede tener una condición de falsación (porque es
  inherentemente no falsable), entonces no es una Hipótesis válida y no debe
  ingresar al Hypothesis Network.
- La falsación puede ser por acumulación (suficiente Evidence en contra)
  o por evento específico (el usuario dice explícitamente "no").

**Verificación:** ¿Existe alguna Hipótesis activa en el sistema sin una
condición de falsación explícitamente definida? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el lifecycle de Hipótesis
en el Hypothesis Network), DECISION_MODEL.md (define los criterios de
falsación por tipo de Hipótesis).

### CP-15 — Principio de fusión conservadora

> **Enunciado:** Cuando dos o más Hipótesis convergen (la Evidence las apoya
> simultáneamente), la fusión debe preservar la información de ambas en lugar
> de descartar una en favor de la otra.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), S-P6 (Knowledge
Preservation).

**Justificación:** Cuando dos Hipótesis son compatibles (no se contradicen),
la fusión debe ser conservadora: la Hipótesis resultante debe contener toda
la información confirmada de ambas, más la nueva Evidence que las une.
Descartar información durante la fusión (seleccionar la Hipótesis dominante
y eliminar la otra) destruye conocimiento que podría ser relevante en ciclos
futuros. Esto viola S-P6 porque el conocimiento acumulado se pierde.

**Implicaciones cognitivas:**
- La fusión es un mecanismo de síntesis, no de selección.
- Antes de fusionar, debe verificarse que las Hipótesis sean compatibles
  (no se contradigan en ningún punto).
- La Hipótesis fusionada debe tener una certidumbre que refleje la
  combinación de las certidumbres de origen.
- La fusión no debe eliminar información que distinga los casos originales.
  Por ejemplo, si una Hipótesis es "origen = Asunción" y otra es
  "origen = Asunción o San Lorenzo", la fusión no puede ser simplemente
  "origen = Asunción" — debe preservar la ambigüedad si persiste.

**Verificación:** ¿Existe algún mecanismo de fusión de Hipótesis que descarte
información de una Hipótesis contribuyente sin registro de la decisión?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el mecanismo de fusión),
DECISION_MODEL.md (define las reglas de compatibilidad y combinación de
certidumbre).

### CP-16 — Principio de coexistencia de intenciones

> **Enunciado:** El sistema puede mantener y procesar simultáneamente
> múltiples intenciones del usuario, sin requerir que una se resuelva
> completamente antes de comenzar a procesar otra.

**Derivación constitucional:** P-I3 (Language as Primary Input), P-E4
(Revisability of Beliefs).

**Justificación:** El lenguaje natural humano frecuentemente expresa múltiples
intenciones en un mismo mensaje: "quiero un taxi para las 5, y dime cuánto
cuesta" contiene dos intenciones (reservar y consultar precio). Un sistema
que debe resolver una intención completamente antes de reconocer la siguiente
pierde información y fuerza al usuario a comunicarse en fragmentos
artificiales. La coexistencia de intenciones permite que el sistema procese
el lenguaje natural como los humanos lo producen: con múltiples capas de
significado simultáneas.

**Implicaciones cognitivas:**
- El sistema debe poder identificar múltiples intenciones en un mismo
  Ciclo Cognitivo.
- Cada intención genera su propio conjunto de Hipótesis.
- Las intenciones pueden tener dependencias: una intención de pago puede
  depender de una intención de reserva. El sistema debe respetar estas
  dependencias sin bloquear el procesamiento paralelo.
- La resolución de una intención no debe abortar el procesamiento de otras.
- Cada intención sigue su propio camino a través del ciclo cognitivo, pero
  comparten el mismo Evidence Store.

**Verificación:** ¿Existe algún límite en el código que impida procesar más
de una intención del usuario en un mismo ciclo? Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el flujo de múltiples
intenciones), DECISION_MODEL.md (define la priorización de intenciones).

### CP-17 — Principio de resolución por Evidence

> **Enunciado:** Las Hipótesis se resuelven (se convierten en Beliefs o se
> descartan) exclusivamente mediante la acumulación de Evidence, no por
> tiempo transcurrido, orden de llegada, preferencia del sistema, ni
> ningún otro criterio no epistémico.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), P-E1 (Evidence
over Intuition).

**Justificación:** La resolución de Hipótesis es el momento en que el sistema
transiciona de "estoy considerando" a "tengo una creencia." Si esta transición
se basa en cualquier criterio que no sea la acumulación de Evidence (ej.:
"la primera Hipótesis que se generó tiene prioridad"), el sistema está
tomando una decisión epistémica sin base epistémica. Esto viola S-P1.

**Implicaciones cognitivas:**
- La resolución ocurre cuando la certidumbre de una Hipótesis supera a las
  demás por un margen suficiente (definido por el costo de error).
- La resolución por timeout está prohibida: el tiempo no es Evidence.
- La resolución por preferencia del sistema (ej.: "siempre preferir origen
  conocido") está prohibida a menos que esa preferencia esté respaldada por
  Evidence (ej.: "el 90% de los viajes de este usuario son desde su casa").
- Si la Evidence es insuficiente para resolver, el sistema debe clarificar
  (no resolver por defecto).

**Verificación:** ¿Existe algún mecanismo que resuelva Hipótesis basado en
criterios no epistémicos (tiempo, orden, preferencia)? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define los criterios de resolución de
Hipótesis), COGNITIVE_ARCHITECTURE.md (define el ciclo de vida de Hipótesis).

---

## 6. Principios de Certidumbre

> La Certidumbre (ONTOLOGY.md 6.2) es la medida de cuán confiado está el
> sistema de que una Belief corresponde a la Verdad. Es continua,
> dinámica y siempre imperfecta. Estos principios gobiernan cómo la
> Certidumbre se comporta en el sistema cognitivo.

### CP-18 — Principio de certidumbre continua

> **Enunciado:** Toda Belief en el sistema debe tener una Certidumbre
> asociada en un rango continuo [0, 1]. Ninguna Belief puede tratarse como
> binaria (verdadero/falso) en la capa cognitiva.

**Derivación constitucional:** P-E2 (Certainty Is Continuous).

**Justificación:** La Constitución establece que la certidumbre binaria está
prohibida en la capa cognitiva (P-E2). Este principio refina ese mandato:
no solo la certidumbre debe ser continua, sino que toda Belief — sin
excepción — debe portar explícitamente su valor de Certidumbre. Una Belief
sin Certidumbre explícita es epistémicamente invisible: el sistema no sabe
cuánto confiar en ella. El valor [0, 1] debe ser nativo en la
representación de toda Belief, no añadido opcionalmente.

**Implicaciones cognitivas:**
- No existe "creencia sin calificación" en AITOS. Toda Belief lleva un
  número entre 0 y 1.
- La Certidumbre 1.0 está reservada para verdades matemáticas e invariantes
  del sistema (ONTOLOGY.md 6.2).
- La Certidumbre 0.0 significa "no tengo ninguna evidencia que apoye esta
  creencia" — la Belief no debería existir.
- Los valores de Certidumbre no son opcionales ni implícitos. Deben
  calcularse explícitamente a partir de la Evidence y la Confidence de las
  fuentes.
- Las decisiones de Compromiso se basan en estos valores, no en estados
  cualitativos.

**Verificación:** ¿Existe alguna Belief en el sistema que pueda existir sin
un valor de Certidumbre continuo explícito? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la representación y el modelo
matemático de certidumbre continua).

### CP-19 — Principio de degradación temporal

> **Enunciado:** La Certidumbre de toda Belief debe degradarse gradualmente
> con el paso del tiempo sin recibir Evidence confirmatoria. La tasa de
> degradación debe ser proporcional a la naturaleza temporal de la Belief.

**Derivación constitucional:** CONSTITUTION.md 3.3.1 ("Certainty must decay
over time without confirming Evidence").

**Justificación:** La Constitución delega explícitamente a COGNITIVE_PRINCIPLES
el principio de degradación de certidumbre. La justificación epistémica es
que el mundo cambia. Una creencia sobre la ubicación del usuario, la
disponibilidad de un conductor, o la intención de un pasajero se vuelve
menos confiable con el tiempo porque el estado del mundo puede haber cambiado.
Sin degradación, el sistema operaría con creencias obsoletas como si fueran
actuales.

**Implicaciones cognitivas:**
- Toda Belief tiene un reloj de degradación que comienza en el momento de
  su última confirmación.
- La tasa de degradación varía según el tipo de Belief: la ubicación se
  degrada rápido (minutos), el nombre del usuario se degrada lento (días),
  un Commitment confirmado se degrada según el tipo de compromiso.
- La degradación nunca lleva la Certidumbre a 0 abruptamente — es un
  proceso continuo.
- Si la Certidumbre degradada cae por debajo del umbral de compromiso, el
  sistema debe buscar reconfirmación antes de actuar sobre esa Belief.
- Una nueva Evidence confirmatoria detiene la degradación y restablece la
  Certidumbre al nivel que la nueva Evidence justifica.

**Verificación:** ¿Existe alguna Belief que pueda mantenerse con la misma
Certidumbre indefinidamente sin recibir nueva Evidence? Si sí → violación.

**Delegación:** CERTAINTY_CALCULUS.md (define la función de degradación por
tipo de Belief), DECISION_MODEL.md (define las tasas de degradación según
Strategic Posture).

### CP-20 — Principio de actualización por Evidence

> **Enunciado:** Toda nueva Evidence debe actualizar la Certidumbre de todas
> las Beliefs relacionadas. No puede ignorarse una Evidence relevante para
> la Certidumbre de una Belief existente.

**Derivación constitucional:** P-E4 (Revisability of Beliefs), S-P1 (Evidence-
Based Operation).

**Justificación:** Una Belief cuya Certidumbre no se actualiza con nueva
Evidence relevante es una Belief congelada. Viola P-E4 porque no es
revisable. Viola S-P1 porque las decisiones se basan en una Certidumbre
que no refleja toda la Evidence disponible. La actualización debe ser
automática y completa: toda Evidence entrante debe evaluarse contra todas
las Beliefs activas para determinar si las afecta.

**Implicaciones cognitivas:**
- La llegada de nueva Evidence dispara un proceso de actualización de
  Certidumbre en todas las Beliefs afectadas.
- El proceso de actualización debe considerar:
  - La fuerza de la nueva Evidence (Confidence del Source).
  - La relación semántica entre la nueva Evidence y cada Belief.
  - El efecto combinado con la Evidence existente.
- La actualización puede aumentar o disminuir la Certidumbre.
- Si la nueva Evidence contradice una Belief con alta Certidumbre, la
  actualización debe reflejar el conflicto (puede reducir la Certidumbre
  o requerir resolución de conflicto según CP-10).
- No existe "modo off" para la actualización: el sistema no puede ignorar
  Evidence relevante.

**Verificación:** ¿Existe algún flujo donde nueva Evidence entre al sistema
sin que se actualice la Certidumbre de las Beliefs relacionadas? Si sí →
violación.

**Delegación:** CERTAINTY_CALCULUS.md (define el modelo de actualización),
EVIDENCE_MODEL.md (define cómo la nueva Evidence se relaciona con Beliefs
existentes).

### CP-21 — Principio de límite epistémico

> **Enunciado:** La Certidumbre de las Beliefs sobre hechos empíricos
> (intenciones del usuario, ubicaciones, horarios) no puede alcanzar 1.0.
> El sistema debe reconocer explícitamente que toda Belief empírica tiene
> un margen de incertidumbre irreducible.

**Derivación constitucional:** CONSTITUTION.md 3.1 (Inaccessibility of Truth),
P-E2 (Certainty Is Continuous), P-II4 (Humility Before Uncertainty).

**Justificación:** La Constitución (3.1) establece que AITOS no tiene acceso
a la Verdad. P-E2 exige certidumbre continua, no binaria. P-I4 exige
humildad epistémica. Este principio traduce esas exigencias a una regla
operativa: un límite superior estricto para la certidumbre empírica. Si el
sistema pudiera alcanzar 1.0 en una Belief empírica, estaría pretendiendo
acceso a la Verdad que la Constitución dice que no tiene. El límite
epistémico fuerza al sistema a mantener siempre un registro de humildad.

**Implicaciones cognitivas:**
- El límite máximo de certidumbre empírica es inferior a 1.0. El valor
  exacto se define en CERTAINTY_CALCULUS.md, pero el principio es que
  existe un techo epistémico.
- Las Beliefs sobre invariantes del sistema (ej.: "2 + 2 = 4") pueden
  tener certidumbre 1.0. Toda Belief sobre el mundo exterior no puede.
- Cuando la certidumbre de una Belief empírica alcanza el límite epistémico,
  el sistema puede actuar con la máxima confianza posible, pero no debe
  comunicar esa Belief como "verdad absoluta."
- El límite epistémico no es un defecto — es una característica de diseño
  que refleja la naturaleza probabilística del conocimiento del sistema.

**Verificación:** ¿Existe algún mecanismo que permita que una Belief sobre
hechos empíricos alcance o supere el límite epistémico definido? Si sí →
violación.

**Delegación:** CERTAINTY_CALCULUS.md (define el valor del límite epistémico),
DECISION_MODEL.md (define cómo el límite epistémico afecta los umbrales de
compromiso).

---

## 7. Principios de Compromiso

> El Compromiso (ONTOLOGY.md 8.2) es el acto cognitivo de elegir una Belief
> como base para la acción. Es el "punto de no retorno" del Ciclo Cognitivo.
> Estos principios gobiernan cuándo y cómo el sistema se compromete.

### CP-22 — Principio de compromiso explícito

> **Enunciado:** El Compromiso debe ser una transición cognitiva explícita y
> consciente. El sistema no puede "deslizarse" hacia un Compromiso sin una
> decisión formal basada en la Certidumbre y el Costo de Error.

**Derivación constitucional:** P-I5 (Auditability of Every Decision), S-P1
(Evidence-Based Operation).

**Justificación:** En sistemas state-dominant, el compromiso es implícito:
el sistema avanza a través de estados y en algún punto está "demasiado
lejos para volver atrás." En AITOS, el compromiso debe ser una decisión
explícita. Esto es necesario para P-I5 (auditabilidad): si no hay un
momento de compromiso identificable, no hay un punto específico que auditar.
El compromiso explícito permite que el sistema registre: "en este momento,
con esta Certidumbre, con este Costo de Error, decidí comprometerme."

**Implicaciones cognitivas:**
- El Compromiso es un gate explícito entre Razonamiento y Proyección.
- El gate debe evaluar: Certidumbre actual, Costo de Error, Strategic
  Posture, y umbral de compromiso.
- La decisión de comprometer, clarificar o escalar debe ser explícita y
  registrada.
- No existe "compromiso por omisión": si no hay decisión explícita de
  comprometer, el sistema no está comprometido.
- El compromiso explícito aplica a compromisos operacionales (crear viaje,
  despachar, confirmar precio) y a compromisos informacionales (confirmar
  una interpretación al usuario).

**Verificación:** ¿Existe algún flujo donde el sistema ejecute una Acción
basada en un Compromiso que no fue explícitamente decidido en un gate de
Compromiso? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define la máquina de estados del
compromiso), DECISION_MODEL.md (define el cálculo de la decisión de
comprometer), COGNITIVE_ARCHITECTURE.md (define el gate de compromiso).

### CP-23 — Principio de umbral dinámico

> **Enunciado:** El umbral de Certidumbre requerido para comprometerse debe
> ser dinámico: se ajusta según el Costo de Error de la decisión y la
> Strategic Posture del sistema en ese contexto.

**Derivación constitucional:** CONSTITUTION.md 3.4 (Sufficiency, Not Certainty),
P-E5 (Proportional Response).

**Justificación:** La Constitución (3.4) establece que la suficiencia se
define por el costo de error, no por un valor arbitrario de certidumbre.
Un umbral fijo (ej.: siempre 0.85) trata todas las decisiones como
igualmente riesgosas, lo cual es falso. Confirmar el origen del viaje tiene
un costo de error menor que despachar un conductor. El umbral debe reflejar
esa diferencia.

**Implicaciones cognitivas:**
- El umbral de compromiso se calcula en cada decisión como:
  `umbral = f(costo_de_error) + ajuste_por_postura`
- A mayor costo de error, mayor umbral (más difícil comprometerse).
- La Strategic Posture modula la sensibilidad al costo de error: una postura
  conservadora eleva los umbrales; una postura agresiva los reduce.
- Los umbrales se definen por tipo de compromiso:
  - Compromiso informacional (confirmar interpretación): umbral más bajo.
  - Compromiso operacional de bajo costo (consulta de precio): umbral medio.
  - Compromiso operacional de alto costo (despachar conductor): umbral alto.
- El umbral dinámico no es opcional: el sistema siempre debe evaluar el
  costo de error antes de determinar el umbral.

**Verificación:** ¿Existe algún compromiso en el sistema que use un umbral
de certidumbre fijo, sin considerar el costo de error de la decisión
específica? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define la función de cálculo del umbral),
COMMITMENT_MODEL.md (define los tipos de compromiso y sus costos de error
asociados).

### CP-24 — Principio de costo de error

> **Enunciado:** Todo Compromiso debe evaluar explícitamente el Costo de
> Error antes de decidir. El Costo de Error debe considerar tanto el falso
> positivo (actuar sobre una creencia falsa) como el falso negativo (no
> actuar sobre una creencia verdadera).

**Derivación constitucional:** CONSTITUTION.md 3.4 (Epistemic Sufficiency),
P-E5 (Proportional Response).

**Justificación:** La Constitución (3.4) introduce el costo de error como
el criterio que define la suficiencia: el nivel de certidumbre en el cual
el costo esperado de actuar es menor que el costo esperado de no actuar. Este
principio refina ese mandato en una regla operativa: el sistema no puede
comprometerse sin calcular ambos costos. Un compromiso sin evaluación de
costo de error es una decisión ciega.

**Implicaciones cognitivas:**
- El Costo de Error tiene dos componentes:
  - Costo de falso positivo (FP): ¿qué pasa si actuamos y estábamos
    equivocados? (ej.: despachar al lugar equivocado).
  - Costo de falso negativo (FN): ¿qué pasa si no actuamos y estábamos
    en lo correcto? (ej.: perder un viaje por no confirmar a tiempo).
- La decisión de comprometer ocurre cuando:
  `costo_esperado(FP) * (1 - certidumbre) < costo_esperado(FN) * certidumbre`
- El Costo de Error no es un número fijo — depende del contexto: hora del
  día, tipo de usuario, historial, disponibilidad de conductores.
- Si el Costo de Error no puede estimarse (contexto desconocido), el umbral
  por defecto debe ser conservador.
- La evaluación del Costo de Error debe registrarse para auditoría (P-I5).

**Verificación:** ¿Existe algún compromiso que se ejecute sin una evaluación
explícita del costo de error de esa decisión específica? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el modelo de costo de error),
COMMITMENT_MODEL.md (define los costos de error por tipo de compromiso).

### CP-25 — Principio de compromiso informativo vs. operacional

> **Enunciado:** El sistema distingue entre dos tipos de Compromiso con
> diferentes umbrales y consecuencias: (a) compromiso informativo: afirmar
> una interpretación al usuario sin ejecutar una acción irreversible, y
> (b) compromiso operacional: ejecutar una acción que afecta el mundo real
> (crear viaje, despachar, cobrar).

**Derivación constitucional:** P-E5 (Proportional Response), S-P7 (Human
Escalation).

**Justificación:** Confirmar una interpretación al usuario ("entendí que
quieres ir al aeropuerto") tiene consecuencias diferentes a crear el viaje
en el sistema operacional. Usar el mismo umbral de compromiso para ambos
casos es inapropiado: si el umbral es muy alto, el sistema nunca confirma
interpretaciones (mala UX); si es muy bajo, hace commits operacionales
prematuros (riesgo operacional). La distinción entre ambos tipos permite
calibrar el umbral según la consecuencia.

**Implicaciones cognitivas:**
- **Compromiso informativo:** el sistema afirma una interpretación al
  usuario. No ejecuta acciones irreversibles. El umbral es más bajo.
  Consecuencia de error: el usuario corrige y el sistema aprende.
- **Compromiso operacional:** el sistema ejecuta una acción que modifica
  el estado del mundo (crea un viaje, despacha un conductor). El umbral
  es más alto. Consecuencia de error: impacto operacional real.
- La transición de informativo a operacional requiere un nuevo ciclo de
  Compromiso con evaluación de Costo de Error específica para la acción
  operacional.
- El sistema no puede engañar al usuario: no puede dar un compromiso
  informativo ("todo listo") cuando aún no ha hecho el compromiso
  operacional (el viaje no está creado).

**Verificación:** ¿Existe algún flujo donde el sistema trate un compromiso
operacional con el mismo umbral que un compromiso informativo? Si sí →
violación.

**Delegación:** COMMITMENT_MODEL.md (define los tipos de compromiso y sus
umbrales), DECISION_MODEL.md (define la transición informativo → operacional).

### CP-26 — Principio de escalamiento por insuficiencia

> **Enunciado:** Cuando la Certidumbre no alcanza el umbral de compromiso
> después de agotar los medios para obtener más Evidence (preguntas de
> clarificación agotadas, tiempo límite alcanzado), el sistema debe escalar
> a un operador humano en lugar de fallar silenciosamente, comprometerse
> con insuficiencia, o repetir indefinidamente.

**Derivación constitucional:** S-P7 (Human Escalation).

**Justificación:** La Constitución S-P7 exige escalamiento humano cuando el
sistema no puede alcanzar un compromiso con certidumbre suficiente y el
costo de error supera el costo de intervención humana. Este principio
refina S-P7 al nivel operativo: define los criterios de "agotamiento de
medios" y establece que el escalamiento es la única opción válida cuando
se ha llegado a ese punto.

**Implicaciones cognitivas:**
- El sistema debe intentar primero todas las opciones de clarificación
  disponibles antes de escalar.
- "Agotar medios" significa: se han hecho todas las preguntas de
  clarificación permitidas por CP-27 (contexto mínimo), y/o se ha alcanzado
  el límite temporal del ciclo (CP-04).
- El escalamiento debe incluir un resumen del estado cognitivo: qué se
  sabe, qué no se sabe, qué se intentó, por qué no se alcanzó el umbral.
- Escalar significa transferir el control a un operador humano. El sistema
  no debe intentar "adivinar" después de escalar.
- No escalar cuando se requiere es una violación de S-P7. Escalar
  prematuramente (sin agotar medios) es una violación de CP-12 (suficiencia
  mínima) porque no se intentó obtener suficiente Evidence.

**Verificación:** ¿Existe algún escenario donde el sistema no pueda alcanzar
el umbral de compromiso y no escale a un humano, optando por fallo
silencioso, repetición infinita, o compromiso por defecto? Si sí → violación.

**Delegación:** COMMITMENT_MODEL.md (define el protocolo de escalamiento),
COGNITIVE_ARCHITECTURE.md (define el flujo de ciclo → escalamiento),
DECISION_MODEL.md (define los criterios de agotamiento de medios).

---

## 8. Principios de Proyección

> La Proyección (ONTOLOGY.md 7.5, 9.x) es la fase que traduce los
> Compromisos en una Operational Projection: la vista del mundo expresada
> en términos operacionales (viajes, despachos, mensajes). Estos principios
> gobiernan cómo se construye y utiliza la Proyección.

### CP-27 — Principio de proyección derivada

> **Enunciado:** La Operational Projection debe derivarse exclusivamente
> del Knowledge State (Beliefs confirmadas y Commitments activos). No puede
> existir estado operacional independiente del estado cognitivo.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), S-P6 (Knowledge
Preservation).

**Justificación:** Si la Operational Projection puede existir
independientemente del Knowledge State, el sistema tiene dos fuentes de
verdad: lo que "sabe" (cognitivo) y lo que "ha hecho" (operacional). Esto
genera contradicciones: la base de datos dice que el viaje existe, pero el
conocimiento del sistema dice que no se comprometió. La Proyección debe ser
una vista derivada, no un estado independiente. Toda modificación operacional
debe pasar por el Ciclo Cognitivo.

**Implicaciones cognitivas:**
- La Operational Projection se computa en cada ciclo a partir del Knowledge
  State. No se almacena como estado independiente.
- Si el Knowledge State cambia (nueva Evidence que modifica una Belief de
  compromiso), la Proyección se recalcula automáticamente.
- No debe haber escritura directa a la base de datos operacional desde
  fuera del Ciclo Cognitivo.
- La Proyección es siempre un reflejo del Knowledge State actual, no un
  histórico de decisiones pasadas (aunque el registro histórico de
  Commitments sí se preserva en el Evidence Store).

**Verificación:** ¿Existe algún estado operacional (viaje creado, conductor
despachado) que no pueda trazarse directamente hasta un Commitment
explícito basado en el Knowledge State? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la relación Knowledge State ↔
Proyección), COGNITIVE_ARCHITECTURE.md (define el proceso de proyección).

### CP-28 — Principio de proyección de solo lectura

> **Enunciado:** La Operational Projection es una vista de solo lectura del
> Knowledge State. No puede modificarse directamente. Toda modificación debe
> realizarse a través del Ciclo Cognitivo (nueva Evidence → nuevo Razonamiento
> → nuevo Compromiso → nueva Proyección).

**Derivación constitucional:** S-P5 (Evidence Immutability), S-P6 (Knowledge
Preservation).

**Justificación:** Si la Proyección pudiera modificarse directamente, se
crearía un camino para cambiar el estado operacional del sistema sin pasar
por el Ciclo Cognitivo. Esto permitiría que decisiones operacionales no
estén fundamentadas en Evidence (violando S-P1). La Proyección debe ser de
solo lectura porque es un output, no un almacén de estado.

**Implicaciones cognitivas:**
- Ningún componente puede escribir directamente en la Operational Projection
  (ej.: modificar los datos de un viaje directamente sin pasar por compromiso).
- Las correcciones operacionales (ej.: cambiar un destino incorrecto) deben
  iniciar un nuevo Ciclo Cognitivo que registre la nueva Evidence, actualice
  las Beliefs, y produzca un nuevo Commitment, que a su vez genere una nueva
  Proyección.
- La única excepción son operaciones de sistema (migraciones, tareas de
  mantenimiento), que deben registrarse como Evidence de sistema y ejecutarse
  bajo procedimientos controlados.
- El carácter de solo lectura no impide que la Proyección se materialice en
  una base de datos operacional para consulta rápida — pero esa materialización
  debe ser siempre derivada del Knowledge State, y cualquier desviación debe
  corregirse en el siguiente ciclo.

**Verificación:** ¿Existe algún mecanismo que permita modificar la Operational
Projection sin pasar por un Ciclo Cognitivo completo? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la arquitectura de solo lectura de
la Proyección), COGNITIVE_ARCHITECTURE.md (define el proceso de derivación).

### CP-29 — Principio de reconstrucción desde Evidence

> **Enunciado:** La Operational Projection debe poder reconstruirse
> completamente a partir del Evidence Store y los registros de Commitment.
> Si el Knowledge State volátil se pierde (reinicio, fallo), la Proyección
> debe poder recuperarse íntegramente desde la Evidence persistida.

**Derivación constitucional:** S-P6 (Knowledge Preservation).

**Justificación:** La Constitución S-P6 exige que el sistema nunca entre en
un estado del cual su Evidence acumulada y Commitments activos no puedan
recuperarse. Este principio refina ese mandato para la Proyección: no basta
con preservar los datos — la Proyección misma debe ser reconstruible porque
es el puente entre el conocimiento y la operación. Si la Proyección no
puede reconstruirse, el sistema pierde su capacidad operativa.

**Implicaciones cognitivas:**
- El Evidence Store es la fuente única para reconstruir la Proyección.
- Los registros de Commitment (qué se comprometió, cuándo, con qué
  certidumbre) también deben persistirse.
- El proceso de reconstrucción debe ser determinista y reproducible.
- Después de un reinicio, el sistema debe:
  1. Cargar toda la Evidence persistida.
  2. Reconstruir las Beliefs y Commitments activos.
  3. Derivar la Operational Projection.
  4. Reanudar las conversaciones y viajes activos.
- Si la reconstrucción falla (Evidence faltante o inconsistente), el sistema
  debe escalar a un operador humano antes de intentar operar con una
  Proyección incompleta.

**Verificación:** ¿Existe algún escenario donde un reinicio del sistema
impida reconstruir la Operational Projection desde el Evidence Store? Si sí
→ violación.

**Delegación:** KNOWLEDGE_MODEL.md (define el proceso de reconstrucción),
EVIDENCE_MODEL.md (define la persistencia necesaria para reconstrucción),
COGNITIVE_ARCHITECTURE.md (define el flujo de recovery post-reinicio).

---

## 9. Principios de Memoria

> La Memoria en AITOS no es un almacén de datos — es la capacidad de
> preservar y recuperar el Knowledge State a través del tiempo. Estos
> principios gobiernan qué se retiene, cómo se archiva, y cómo se preserva
> el conocimiento del sistema.

### CP-30 — Principio de preservación del estado cognitivo

> **Enunciado:** El sistema debe preservar su Knowledge State (Beliefs
> activas, Evidence acumulada, Commitments vigentes) a través de los Ciclos
> Cognitivos y a través de reinicios del sistema. La pérdida del estado
> cognitivo constituye una falla del sistema.

**Derivación constitucional:** S-P6 (Knowledge Preservation).

**Justificación:** La Constitución S-P6 exige que el sistema nunca pierda
su Evidence acumulada y Commitments activos. Este principio refina S-P6
al nivel operativo: no es suficiente que los datos estén almacenados — el
estado cognitivo (el "mapa mental" que el sistema tiene del mundo) debe
persistir a través de los ciclos. Cada ciclo comienza con el Knowledge
State del ciclo anterior, no desde cero.

**Implicaciones cognitivas:**
- El Knowledge State se transfiere de un ciclo al siguiente. El ciclo N
  comienza con el Knowledge State producido por el ciclo N-1.
- La preservación incluye:
  - Evidence acumulada (en el Evidence Store).
  - Beliefs activas con sus Certidumbres.
  - Hipótesis activas (si el ciclo anterior no las resolvió).
  - Commitments activos (viajes en curso, confirmaciones pendientes).
  - Contexto conversacional (historial del ciclo actual).
- El sistema no puede "olvidar" información entre ciclos a menos que un
  principio (CP-31) lo autorice explícitamente.
- Después de un reinicio, el sistema debe reconstruir el Knowledge State
  desde el Evidence Store (CP-29) antes de procesar nuevos Signals.

**Verificación:** ¿Existe algún escenario donde el sistema pierda Beliefs,
Evidence o Commitments entre ciclos cognitivos sin que medie una decisión
explícita de archivo? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la estructura del Knowledge State
persistente), COGNITIVE_ARCHITECTURE.md (define el flujo de transferencia
entre ciclos), EVIDENCE_MODEL.md (define la persistencia del Evidence Store).

### CP-31 — Principio de archivo por relevancia

> **Enunciado:** La Evidence y las Beliefs pueden archivarse (moverse de
> memoria activa a memoria inactiva) cuando su relevancia para el
> conocimiento operativo actual es baja. El archivo no es eliminación: la
> información archivada debe poder recuperarse si su relevancia se restablece.

**Derivación constitucional:** S-P6 (Knowledge Preservation), S-P10 (Minimal
Constitutional Scope).

**Justificación:** Preservar toda la Evidence y todas las Beliefs
indefinidamente en memoria activa es insostenible. El sistema necesita un
mecanismo para gestionar la memoria sin perder información (S-P6). El
archivo por relevancia permite que el sistema retenga información que no
es inmediatamente útil pero puede serlo en el futuro, mientras mantiene
la memoria activa en un tamaño manejable.

**Implicaciones cognitivas:**
- El archivo es una transición de memoria activa a memoria de largo plazo,
  no una eliminación.
- Los criterios de archivo incluyen:
  - Edad de la última actualización (cuanto más antigua, más archivable).
  - Relevancia para Commitments activos (si no hay viajes activos, archivar).
  - Completitud del ciclo (un ciclo cerrado es más archivable).
- La Evidence archivada debe ser recuperable. El archivo no afecta la
  integridad del Evidence Store (inmutable por CP-08).
- La recuperación de memoria archivada debe ocurrir automáticamente cuando
  nueva Evidence se relaciona con información archivada.
- El archivo no puede usarse como mecanismo para eliminar información que
  debería estar disponible para auditoría (P-I5).

**Verificación:** ¿Existe algún mecanismo de archivo que elimine información
en lugar de moverla a memoria de largo plazo recuperable? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define la arquitectura de memoria de
largo plazo), COGNITIVE_ARCHITECTURE.md (define el proceso de archivo y
recuperación).

---

## 10. Principios de Interacción

> La Interacción es cómo el sistema se comunica con el usuario y el mundo
> exterior. No es el propósito del sistema (la operación de transporte lo
> es), pero es el canal a través del cual se realiza la cognición
> conversacional. Estos principios gobiernan cómo el sistema conduce la
> interacción con el usuario.

### CP-32 — Principio de preguntar con propósito

> **Enunciado:** El sistema solo debe hacer preguntas al usuario cuando
> existe un gap de Evidence identificado que es necesario para la fase
> actual del Ciclo Cognitivo. No debe hacer preguntas por rutina, por
> especulación, ni para llenar campos opcionales.

**Derivación constitucional:** P-I4 (Humility Before Uncertainty), P-E5
(Proportional Response).

**Justificación:** Preguntar sin propósito desperdicia la atención del
usuario, alarga innecesariamente el Ciclo Cognitivo, y erosiona la confianza.
Cada pregunta debe tener una justificación epistémica: "necesito esta
información porque sin ella no puedo alcanzar certidumbre suficiente para
la siguiente fase." Preguntar por rutina (ej.: "¿quieres añadir algo más?")
sin un gap de Evidence identificado es ruido conversacional.

**Implicaciones cognitivas:**
- El sistema solo pregunta cuando:
  - La certidumbre de una Belief necesaria está por debajo del umbral de
    compromiso, y.
  - No hay otra fuente de Evidence disponible (inferencia de otras Beliefs,
    historial del usuario, contexto), y.
  - La pregunta puede resolverse en una interacción.
- Antes de preguntar, el sistema debe intentar inferir la información desde
  la Evidence existente.
- Si el gap de Evidence puede llenarse con información del contexto
  (historial, hora del día, ubicación), debe preferirse eso antes que
  preguntar.
- Si el gap no es necesario para la fase actual (es opcional), no debe
  preguntarse hasta que sea necesario.

**Verificación:** ¿Existe alguna pregunta que el sistema haga al usuario sin
que haya un gap de Evidence explícitamente identificado para la fase actual?
Si sí → violación.

**Delegación:** COGNITIVE_ARCHITECTURE.md (define el mecanismo de detección
de gaps de Evidence), CHANNEL_ADAPTER.md (define la interfaz de preguntas).

### CP-33 — Principio de acompañamiento continuo

> **Enunciado:** El sistema debe mantener al usuario informado sobre el
> progreso del Ciclo Cognitivo en curso, especialmente cuando el ciclo
> requiere múltiples interacciones o cuando hay demoras en la respuesta.

**Derivación constitucional:** P-I4 (Humility Before Uncertainty), P-E3
(Honest Expression).

**Justificación:** Un sistema cognitivo que procesa en silencio genera
incertidumbre en el usuario: "¿me entendió? ¿está pensando? ¿se quedó
colgado?" El acompañamiento continuo es una forma de honestidad
epistémica (P-E3): el sistema comunica su estado cognitivo de manera
apropiada para que el usuario tenga una expectativa realista de lo que
está ocurriendo.

**Implicaciones cognitivas:**
- El sistema debe comunicar su progreso en hitos naturales del Ciclo
  Cognitivo: "estoy verificando la dirección" (Razonamiento), "confirmando
  disponibilidad" (Compromiso), "preparando tu viaje" (Proyección).
- Si el ciclo se demora más de lo esperado, el sistema debe informar al
  usuario y, si es necesario, pedir paciencia o escalar.
- El acompañamiento no debe ser intrusivo: una notificación por hito del
  ciclo, no un mensaje por cada micro-operación.
- El acompañamiento debe ser honesto: no puede decir "procesando" si está
  esperando un timeout sin haber procesado nada.

**Verificación:** ¿Existe algún escenario donde el sistema procese un Signal
durante un período prolongado sin comunicar su estado al usuario? Si sí →
violación.

**Delegación:** CHANNEL_ADAPTER.md (define los mensajes de progreso),
COGNITIVE_ARCHITECTURE.md (define los hitos de comunicación del ciclo).

### CP-34 — Principio de no-repregunta

> **Enunciado:** El sistema no debe preguntar al usuario información que ya
> ha sido proporcionada, a menos que el contexto haya cambiado de manera
> significativa (nuevo viaje, cambio de intención, reinicio del ciclo).

**Derivación constitucional:** P-I4 (Humility Before Uncertainty), P-E4
(Revisability of Beliefs).

**Justificación:** Repetir preguntas que el usuario ya respondió es la
forma más rápida de erosionar la confianza en el sistema. Indica que el
sistema no recordó la respuesta (fallo de memoria) o que no confía en su
propia Belief (fallo epistémico). Ninguna de las dos es aceptable. El
sistema debe confiar en sus Beliefs hasta que nueva Evidence las modifique.

**Implicaciones cognitivas:**
- Si el sistema ya tiene una Belief sobre un hecho (ej.: origen del viaje),
  no debe preguntarlo de nuevo a menos que se cumplan todas las condiciones:
  - La Belief se ha degradado por debajo del umbral de suficiencia (CP-19).
  - Y el contexto ha cambiado significativamente (nuevo viaje, el usuario
    indica cambio).
  - Y no hay otra forma de reconfirmar la Belief.
- Si el usuario se retracta o corrige información previa, eso constituye
  nueva Evidence que actualiza la Belief (CP-20), no una "repregunta."
- El sistema debe poder distinguir entre "no recordar" (error del sistema)
  y "necesitar reconfirmar" (degradación natural).

**Verificación:** ¿Existe algún escenario donde el sistema pregunte al
usuario información que ya fue proporcionada y registrada como Evidence,
sin que medie un cambio significativo de contexto? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define cuándo un cambio de contexto
justifica repreguntar), COGNITIVE_ARCHITECTURE.md (define el mecanismo de
consulta de Beliefs antes de preguntar).

### CP-35 — Principio de explicación antes de acción

> **Enunciado:** Antes de ejecutar una Acción que afecte el estado operacional
> del sistema (crear un viaje, despachar un conductor, confirmar un precio),
> el sistema debe explicar al usuario qué va a hacer y por qué, y solicitar
> confirmación explícita cuando el Costo de Error sea alto.

**Derivación constitucional:** S-P1 (Evidence-Based Operation), P-I5
(Auditability of Every Decision).

**Justificación:** El sistema no debe ejecutar acciones operacionales sin
que el usuario entienda qué va a ocurrir. Esto no es cortesía — es una
extensión de S-P1: la acción debe basarse en Evidence, y el usuario debe
poder verificar que la Evidence es correcta antes de que la acción se
ejecute. La explicación previa es el equivalente conversacional de mostrar
el resumen del pedido antes de confirmar la compra.

**Implicaciones cognitivas:**
- La explicación debe incluir: qué acción se ejecutará, basada en qué
  interpretación de la información del usuario, y cuál será el efecto.
- La confirmación explícita del usuario es requerida para acciones de alto
  costo de error (despachar, cobrar). Para acciones de bajo costo (consultar
  precio), la confirmación implícita puede ser suficiente.
- La explicación debe usar el mismo nivel de lenguaje que el usuario usó:
  si el usuario habla informal, la explicación debe ser informal pero precisa.
- El sistema no debe ejecutar la acción hasta que la explicación haya sido
  entregada y, cuando corresponda, la confirmación recibida.
- Si el usuario rechaza la acción después de la explicación, el sistema debe
  registrar ese rechazo como Evidence y reiniciar el ciclo con la nueva
  información.

**Verificación:** ¿Existe alguna acción operacional que el sistema ejecute
sin haber presentado una explicación al usuario o sin obtener confirmación
cuando el costo de error lo requiere? Si sí → violación.

**Delegación:** CHANNEL_ADAPTER.md (define el formato de explicación y
confirmación), COMMITMENT_MODEL.md (define cuándo se requiere confirmación
explícita).

### CP-36 — Principio de contexto mínimo

> **Enunciado:** El sistema debe minimizar la cantidad de información que
> requiere del usuario para completar una tarea, solicitando solo los datos
> estrictamente necesarios para la operación solicitada y nada más.

**Derivación constitucional:** P-I4 (Humility Before Uncertainty), P-E5
(Proportional Response).

**Justificación:** Cada pregunta adicional aumenta la fricción de la
interacción y la probabilidad de que el usuario abandone. El sistema debe
operar con la información mínima necesaria para alcanzar certidumbre
suficiente (CP-12). Esto no es pereza cognitiva — es eficiencia epistémica:
solo debe preguntarse lo que no puede inferirse y que es necesario para
la decisión actual.

**Implicaciones cognitivas:**
- El sistema debe inferir todo lo que pueda del contexto antes de preguntar:
  hora del día, ubicación del usuario, historial de viajes, preferencias.
- Si la información inferida es suficiente para alcanzar el umbral de
  compromiso (ej.: el usuario siempre viaja desde su casa a esta hora),
  no debe preguntarse.
- El sistema debe priorizar las preguntas por su impacto en la certidumbre:
  preguntar primero lo que más reduce la incertidumbre.
- Si se necesita más información después de la primera pregunta, debe
  pedirse en orden de importancia epistémica.
- El sistema no debe pedir información que no va a usar en la operación
  actual ni en operaciones futuras previsibles.

**Verificación:** ¿Existe alguna pregunta que el sistema haga al usuario y
que no sea estrictamente necesaria para completar la operación actual con
certidumbre suficiente? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define la priorización de preguntas según
impacto epistémico), COGNITIVE_ARCHITECTURE.md (define el flujo de
adquisición de Evidence).

---

## 11. Principios de Aprendizaje

> El Aprendizaje es el proceso mediante el cual el sistema mejora su
> desempeño futuro a partir de la experiencia pasada. Estos principios
> gobiernan cómo los outcomes retroalimentan el modelo cognitivo sin violar
> la integridad del Evidence Store.

### CP-37 — Principio de retroalimentación por outcome

> **Enunciado:** El resultado (outcome) de cada Acción debe registrarse como
> Evidence y retroalimentar el conocimiento del sistema: ajustar la
> confianza en las fuentes, actualizar el modelo de Costo de Error, y
> mejorar la calibración de certidumbre.

**Derivación constitucional:** P-E4 (Revisability of Beliefs), P-I5
(Auditability of Every Decision).

**Justificación:** Sin retroalimentación, el sistema no aprende de sus
errores ni confirma sus aciertos. Cada Acción produce un outcome (el viaje
se completó, el usuario quedó satisfecho, el conductor llegó a tiempo),
y ese outcome es Evidence sobre la calidad de las decisiones previas. Sin
registrarlo y usarlo, el sistema opera en un bucle abierto.

**Implicaciones cognitivas:**
- El outcome de cada Acción debe registrarse como Evidence en el Evidence
  Store, con trazabilidad al Ciclo Cognitivo que produjo la Acción.
- La retroalimentación debe ajustar:
  - La Confidence de las fuentes que contribuyeron a la decisión (CP-38).
  - La calibración entre certidumbre estimada y precisión real.
  - La estimación de Costo de Error para decisiones similares futuras.
- La retroalimentación negativa (outcome fallido) debe tener mayor peso
  que la positiva para evitar sesgo de optimismo.
- La retroalimentación no debe modificar la Evidence original (inmutable
  por CP-08). Se agrega nueva Evidence sobre el outcome, no se modifica
  la Evidence de la decisión.

**Verificación:** ¿Existe algún tipo de Acción en el sistema cuyo outcome
no se registre como Evidence? Si sí → violación.

**Delegación:** EVIDENCE_MODEL.md (define el esquema de Evidence de outcome),
COGNITIVE_ARCHITECTURE.md (define el flujo de retroalimentación),
DECISION_MODEL.md (define el ajuste de calibración).

### CP-38 — Principio de ajuste de confianza de fuente

> **Enunciado:** La Confidence asignada a una Source debe ajustarse en
> función de la precisión histórica de esa Source. Una Source que produce
> Evidence incorrecta consistentemente debe ver reducida su Confidence, y
> viceversa.

**Derivación constitucional:** P-E4 (Revisability of Beliefs), S-P1 (Evidence-
Based Operation).

**Justificación:** No todas las fuentes de información son igualmente
confiables. Un LLM puede alucinar; una extracción directa puede fallar;
un usuario puede equivocarse. Si el sistema trata a todas las fuentes con
la misma confianza, sus decisiones serán menos precisas. El ajuste de
Confidence por desempeño histórico es el mecanismo que permite que el
sistema aprenda qué fuentes son más confiables en qué contextos.

**Implicaciones cognitivas:**
- Cada Source (ONTOLOGY.md 4.6) tiene una Confidence que se ajusta según
  su historial de precisión.
- El ajuste debe considerar:
  - Tasa de acierto histórico: cuántas veces la Source produjo Evidence
    que fue confirmada por outcomes exitosos.
  - Contexto de la Source: una Source puede ser confiable para un tipo de
    información (extracción de ubicaciones) y no para otra (clasificación
    de intención).
  - Confianza base de la Source: las Sources tienen una Confidence inicial
    por tipo (ONTOLOGY.md define el orden de Source por confiabilidad).
- El ajuste de Confidence es gradual: una fuente no pierde toda su
  confianza por un solo error.
- La Confidence de Source es un input al cálculo de Certidumbre de las
  Beliefs (CP-18). Por tanto, ajustar la Confidence mejora la calidad de
  todas las decisiones futuras.

**Verificación:** ¿Existe alguna Source en el sistema cuya Confidence nunca
se ajuste en función de su precisión histórica? Si sí → violación.

**Delegación:** DECISION_MODEL.md (define el modelo de ajuste de Confidence),
EVIDENCE_MODEL.md (define cómo se asocia una Source a cada registro de
Evidence).

### CP-39 — Principio de mejora no destructiva

> **Enunciado:** El aprendizaje del sistema debe agregar conocimiento nuevo
> sin destruir conocimiento previo. La nueva Evidence se suma al Evidence
> Store; la nueva información complementa, no reemplaza, la existente.

**Derivación constitucional:** S-P6 (Knowledge Preservation), S-P5 (Evidence
Immutability).

**Justificación:** Aprender no debe significar "reemplazar lo que sabía
antes por lo que sé ahora." El aprendizaje en AITOS es acumulativo: el
conocimiento previo sigue siendo válido como registro histórico, aunque
pueda ser superado por nueva Evidence. Reemplazar conocimiento es una
forma de eliminación de Evidence, que viola S-P5. Mejorar sin destruir
preserva la auditabilidad (P-I5) y permite que el sistema se beneficie
de la información pasada incluso cuando aprende cosas nuevas.

**Implicaciones cognitivas:**
- El aprendizaje nunca modifica o elimina Evidence existente.
- Cuando el sistema aprende una nueva relación o patrón, lo agrega como
  nueva Evidence, no como corrección de Evidence previa.
- Si el sistema descubre que una Belief previa era incorrecta, no elimina
  la Belief — agrega Evidence que la contradice y deja que el proceso de
  resolución de conflictos (CP-10) maneje la discrepancia.
- Los modelos de confianza (Source Confidence) se actualizan por ajuste
  (CP-38), no por reinicio. El historial de confianza se preserva.
- El conocimiento aprendido (patrones, preferencias de usuario) debe
  registrarse como Evidence con su Source y Confidence para mantener
  trazabilidad.

**Verificación:** ¿Existe algún mecanismo de aprendizaje en el sistema que
modifique o elimine conocimiento previo en lugar de agregar nuevo
conocimiento? Si sí → violación.

**Delegación:** KNOWLEDGE_MODEL.md (define cómo el aprendizaje agrega
conocimiento sin destruir), EVIDENCE_MODEL.md (define el esquema de Evidence
de aprendizaje).

---

## 12. Precedencia entre principios

> Cuando dos principios de este documento entran en conflicto en un caso
> concreto, deben aplicarse las siguientes reglas de precedencia para
> resolverlo.

### 12.1 Reglas de resolución de conflictos internos

**Regla 1 — Seguridad sobre eficiencia:** Los principios que protegen la
seguridad operacional (CP-04: límite temporal, CP-26: escalamiento por
insuficiencia, CP-35: explicación antes de acción) prevalecen sobre los
principios que buscan eficiencia (CP-12: suficiencia mínima, CP-36:
contexto mínimo). Un sistema seguro que opera más lento es preferible a
un sistema rápido que opera inseguro.

**Regla 2 — Preservación sobre adquisición:** Los principios que protegen
el conocimiento existente (CP-08: inmutabilidad de Evidence, CP-30:
preservación del estado cognitivo, CP-39: mejora no destructiva) prevalecen
sobre los principios que buscan adquirir nuevo conocimiento (CP-25:
compromiso informativo vs. operacional, CP-32: preguntar con propósito).
Preservar lo que el sistema ya sabe es prioritario sobre obtener información
nueva.

**Regla 3 — Certidumbre sobre velocidad:** Los principios que garantizan
la integridad epistémica (CP-18: certidumbre continua, CP-20: actualización
por Evidence, CP-21: límite epistémico) prevalecen sobre los principios que
buscan rapidez en el ciclo (CP-04: límite temporal — en caso de conflicto,
el límite temporal se extiende antes que comprometer con certidumbre
insuficiente).

**Regla 4 — Evidence sobre interacción:** Los principios que protegen la
integridad de la Evidence (CP-08 a CP-12) prevalecen sobre los principios
de interacción (CP-32 a CP-36). El sistema no debe sacrificar la calidad
de su Evidence para mejorar la fluidez conversacional.

**Regla 5 — Especificidad sobre generalidad:** Si dos principios entran en
conflicto, el principio más específico al caso concreto prevalece sobre el
más general. Por ejemplo, CP-31 (archivo por relevancia) es más específico
que CP-30 (preservación del estado cognitivo) para el caso de gestión de
memoria activa.

**Regla 6 — Último recurso:** Si las reglas anteriores no resuelven el
conflicto, se aplica la precedencia numérica: el principio con el número
CP más bajo prevalece. Esto no es una regla epistémica — es un desempate
administrativo para casos donde no hay una razón de fondo para preferir un
principio sobre otro.

### 12.2 Relación con precedencia constitucional (S-P8)

La precedencia interna de COGNITIVE_PRINCIPLES.md (12.1) opera dentro del
marco de la precedencia constitucional (S-P8).

**Regla de subordinación:** Ninguna regla de precedencia de este documento
puede suspender, relajar o contradecir la precedencia constitucional S-P8.
Si un conflicto entre principios de CP parece requerir una solución que
contradiga S-P8, debe escalarse como disputa constitucional (CONSTITUTION.md
Sección 7.3).

**Regla de complementariedad:** Las reglas de 12.1 complementan a S-P8
para el ámbito cognitivo. Cuando un conflicto involucra solo principios de
CP (sin principios constitucionales), se aplican las reglas de 12.1. Cuando
un conflicto involucra principios constitucionales, se aplica S-P8 primero,
y luego 12.1 para resolver cualquier conflicto remanente entre principios
de CP.

**Regla de delegación:** Si un conflicto entre principios de CP no puede
resolverse mediante 12.1 y requiere interpretación constitucional, el caso
se documenta como precedente interpretativo y se eleva al Constituent Body
(CONSTITUTION.md 7.3).

---

## 13. Derivación constitucional

### 13.1 Tabla de derivación

| CP | Principio | Fuente constitucional | Tipo de derivación |
|----|-----------|----------------------|-------------------|
| CP-01 | Ciclo completo | 2.1, S-P1 | Refinamiento operativo |
| CP-02 | Secuencia estricta | 2.1, P-I1 | Refinamiento operativo |
| CP-03 | Completitud por ciclo | S-P1, S-P7 | Refinamiento operativo |
| CP-04 | Límite temporal del ciclo | S-P7, S-P4 | Refinamiento operativo + delegación |
| CP-05 | Frontera percepción/evidencia | S-P1, S-P5 | Refinamiento operativo |
| CP-06 | Registro antes de interpretación | S-P5, P-I1 | Refinamiento operativo |
| CP-07 | Determinismo perceptual | S-P4 | Refinamiento operativo |
| CP-08 | Inmutabilidad operativa de la Evidence | S-P5 | Refinamiento operativo (no repite) |
| CP-09 | Trazabilidad observacional | P-I5 | Refinamiento operativo |
| CP-10 | Resolución de Evidence conflictiva | S-P1, P-E1 | Refinamiento operativo |
| CP-11 | Silencio como Evidence | S-P1, P-E1 | Nuevo (no constitucional) |
| CP-12 | Suficiencia mínima | 3.4, S-P1 | Refinamiento operativo |
| CP-13 | Hipótesis múltiples | P-E1, P-E4 | Nuevo (no constitucional) |
| CP-14 | Condición de falsación | P-E4, P-E1 | Nuevo (no constitucional) |
| CP-15 | Fusión conservadora | S-P1, S-P6 | Nuevo (no constitucional) |
| CP-16 | Coexistencia de intenciones | P-I3, P-E4 | Nuevo (no constitucional) |
| CP-17 | Resolución por Evidence | S-P1, P-E1 | Refinamiento operativo |
| CP-18 | Certidumbre continua | P-E2 | Refinamiento operativo (no repite) |
| CP-19 | Degradación temporal | 3.3.1 | Delegación explícita |
| CP-20 | Actualización por Evidence | P-E4, S-P1 | Refinamiento operativo |
| CP-21 | Límite epistémico | 3.1, P-E2, P-I4 | Refinamiento operativo |
| CP-22 | Compromiso explícito | P-I5, S-P1 | Nuevo (no constitucional) |
| CP-23 | Umbral dinámico | 3.4, P-E5 | Refinamiento operativo + delegación |
| CP-24 | Costo de error | 3.4, P-E5 | Refinamiento operativo |
| CP-25 | Compromiso informativo vs. operacional | P-E5, S-P7 | Nuevo (no constitucional) |
| CP-26 | Escalamiento por insuficiencia | S-P7 | Refinamiento operativo |
| CP-27 | Proyección derivada | S-P1, S-P6 | Nuevo (no constitucional) |
| CP-28 | Proyección de solo lectura | S-P5, S-P6 | Nuevo (no constitucional) |
| CP-29 | Reconstrucción desde Evidence | S-P6 | Nuevo (no constitucional) |
| CP-30 | Preservación del estado cognitivo | S-P6 | Refinamiento operativo (no repite) |
| CP-31 | Archivo por relevancia | S-P6, S-P10 | Refinamiento operativo |
| CP-32 | Preguntar con propósito | P-I4, P-E5 | Nuevo (no constitucional) |
| CP-33 | Acompañamiento continuo | P-I4, P-E3 | Nuevo (no constitucional) |
| CP-34 | No-repregunta | P-I4, P-E4 | Nuevo (no constitucional) |
| CP-35 | Explicación antes de acción | S-P1, P-I5 | Nuevo (no constitucional) |
| CP-36 | Contexto mínimo | P-I4, P-E5 | Nuevo (no constitucional) |
| CP-37 | Retroalimentación por outcome | P-E4, P-I5 | Nuevo (no constitucional) |
| CP-38 | Ajuste de confianza de fuente | P-E4, S-P1 | Nuevo (no constitucional) |
| CP-39 | Mejora no destructiva | S-P6, S-P5 | Nuevo (no constitucional) |

### 13.2 Mapa a documentos de Nivel III

| Documento de Nivel III | Principios CP que delegan |
|------------------------|--------------------------|
| **COGNITIVE_ARCHITECTURE.md** | CP-01, CP-02, CP-03, CP-04, CP-05, CP-06, CP-07, CP-08, CP-09, CP-12, CP-13, CP-14, CP-15, CP-16, CP-17, CP-22, CP-26, CP-27, CP-28, CP-29, CP-30, CP-31, CP-32, CP-34, CP-36, CP-37 |
| **DECISION_MODEL.md** | CP-04, CP-10, CP-11, CP-12, CP-13, CP-14, CP-15, CP-16, CP-17, CP-19, CP-21, CP-22, CP-23, CP-24, CP-25, CP-26, CP-34, CP-36, CP-37, CP-38 |
| **EVIDENCE_MODEL.md** | CP-05, CP-06, CP-07, CP-08, CP-09, CP-10, CP-11, CP-20, CP-29, CP-30, CP-37, CP-38, CP-39 |
| **CERTAINTY_CALCULUS.md** | CP-18, CP-19, CP-20, CP-21 |
| **COMMITMENT_MODEL.md** | CP-22, CP-23, CP-24, CP-25, CP-26, CP-35 |
| **KNOWLEDGE_MODEL.md** | CP-27, CP-28, CP-29, CP-30, CP-31, CP-39 |
| **CHANNEL_ADAPTER.md** | CP-32, CP-33, CP-35 |
| **ACTION_EXECUTOR.md** | CP-01, CP-38, CP-39 |

---

*Fin de 03-COGNITIVE_PRINCIPLES.md — Versión 1.0-draft*

> Este documento fue redactado a partir del diseño arquitectónico aprobado en
> `DISENO_COGNITIVE_PRINCIPLES.md`. Es un DRAFT hasta su ratificación mediante
> el proceso de gobierno de la Constitución (CONSTITUTION.md Sección 7.2).
> Fecha: 2026-07-11
