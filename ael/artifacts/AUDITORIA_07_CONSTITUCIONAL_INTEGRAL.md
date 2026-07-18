# Auditoría Constitucional Integral — 01-CONSTITUTION.md

> **Auditor:** AEL Director (Mission Planner)
> **Documento auditado:** `ael/artifacts/01-CONSTITUTION.md` (v1.0-draft, 1250 líneas)
> **Documentos de referencia:** CONSTITUTION_MASTER_PLAN.md, SYSTEM_VOCABULARY.md
> **Fecha:** 2026-07-11
> **Propósito:** Determinar si la Constitución es ratificable o requiere correcciones.
> **Postura:** Deliberadamente adversarial. Se asume la interpretación más exigente.

---

## Resumen ejecutivo

Se detectaron **23 hallazgos**: 5 críticos, 8 altos, 7 medios, 3 bajos.

La Constitución contiene **contradicciones internas irresolubles** (meta-reglas de interpretación que chocan entre sí), **contradicciones graves con CONSTITUTION_MASTER_PLAN.md** (jerarquías documentales incompatibles), un **problema de bootstrap** (no puede ratificarse a sí misma porque el proceso de ratificación requiere un cuerpo constituyente que no se designa en ninguna parte), y **principios con jerarquía paradójica** (preservación sobre existencia crea un absurdo lógico).

Adicionalmente, **infiltra parámetros de negocio** (90 días, 3x surge, 180 días de retención) como si fueran principios constitucionales, y **depende del dominio TaxiGuazú** en la definición del Cuerpo Constituyente.

**Dictamen: NO APTA PARA RATIFICACIÓN.** Se requieren correcciones estructurales antes de considerar siquiera enmiendas.

---

## Hallazgos

---

### 🔴 H-01 — Meta-reglas de interpretación mutuamente contradictorias

| Campo | Valor |
|-------|-------|
| **Severidad** | 🔴 Crítica |
| **Ubicación** | 1.6(2) p.112–113, S-P8(4) p.594–595, S-P8(5) p.597–599 |
| **Tipo** | Contradicción interna |

**Explicación técnica:**

La Constitución tiene TRES reglas de precedencia que pueden entrar en conflicto, sin especificar cuál prevalece cuando chocan:

1. **1.6(2)**: "the more specific section prevails over the more general, AND the later section prevails over the earlier" — el AND es una conjunción que afirma AMBAS reglas simultáneamente.

2. **S-P8(4)**: "Specific over general" — reitera la primera parte de 1.6(2) como meta-principio constitucional.

3. **S-P8(5)**: "Purpose over text" — establece que el propósito prevalece sobre la letra.

**El problema:** Si una sección posterior (ej: 7.2) contradice una sección anterior más específica (ej: 2.4 P-I3), 1.6(2) no puede resolverlo: la regla "later prevails" choca con "specific prevails." Ambas son reglas del mismo nivel (1.6 es una regla de interpretación, S-P8 es un principio supremo). La Constitución no dice cuál pesa más.

**Caso concreto:** S-P8(5) dice "purpose over text" y S-P8(4) dice "specific over general." Si un propósito general (la seguridad del sistema) choca con un principio específico (P-I3: lenguaje natural como input primario), ¿cuál gana? No hay regla que lo dirima.

**Consecuencias presentes y futuras:**
- Cualquier disputa de interpretación entre secciones puede argumentarse en dos direcciones.
- La resolución dependerá del árbitro de turno, no de la Constitución.
- El precedente se definirá por caso fortuito, erosionando la predictibilidad.

**Recomendación:**
1. Eliminar el AND de 1.6(2): dividir en reglas separadas con orden de precedencia explícito.
2. S-P8 debe incluir una regla que diga: "Las reglas de interpretación (1.6) tienen precedencia sobre las reglas de precedencia entre principios (S-P8)."

**Requiere enmienda constitucional:** Sí (Foundational — afecta la interpretación de toda la Constitución).

---

### 🔴 H-02 — Jerarquía documental incompatible con CONSTITUTION_MASTER_PLAN.md

| Campo | Valor |
|-------|-------|
| **Severidad** | 🔴 Crítica |
| **Ubicación** | Sección 6 (p.898–1057) vs. CONSTITUTION_MASTER_PLAN.md Secciones 1–2 |
| **Tipo** | Contradicción entre documentos de nivel I |

**Explicación técnica:**

CONSTITUTION_MASTER_PLAN.md define una jerarquía de 10 documentos numerados (01–10) con 4 niveles (Fundacional, Arquitectónico, Operativo, Transición).

La CONSTITUTION.md Sección 6 define una jerarquía diferente con 4 niveles (I–IV) y documentos diferentes.

**Comparación directa:**

| Master Plan | Constitution Sección 6 |
|-------------|------------------------|
| Fundacional: 01, 02, 03 | Nivel I: CONSTITUTION.md, SYSTEM_VOCABULARY.md |
| Arquitectónico: 04, 05, 06 | Nivel II: COGNITIVE_PRINCIPLES.md, ARCHITECTURE.md, ADRs |
| Operativo: 07, 08 | Nivel III: EVIDENCE_MODEL.md, DECISION_MODEL.md, COMMITMENT_MODEL.md, CERTAINTY_CALCULUS.md, CHANNEL_ADAPTER.md, ACTION_EXECUTOR.md |
| Transición: 09, 10 | Nivel IV: código, prompts, config |
| — | — |
| 03-COGNITIVE_PRINCIPLES.md está en Fundacional | COGNITIVE_PRINCIPLES.md está en Nivel II (hay dos niveles de por medio) |
| 07-DECISION_MODEL.md está en Operativo | DECISION_MODEL.md está en Nivel III |
| 04-COGNITIVE_ARCHITECTURE.md existe como documento propio | No existe en Sección 6 (referido como "ARCHITECTURE.md or equivalent") |
| 10-GOVERNANCE.md es documento separado | Governance está embebido en la Constitución misma |
| No existe EVIDENCE_MODEL.md, COMMITMENT_MODEL.md, etc. | Sección 6 los define como Level III |

**Consecuencias presentes y futuras:**
- Un equipo que lea el Master Plan esperará 10 documentos. Un equipo que lea la Constitución esperará 11+ documentos diferentes.
- No se sabe qué documento escribir después de la Constitución: ¿los del Master Plan o los de Sección 6?
- COGNITIVE_PRINCIPLES.md está en nivel FUNDACIONAL en el Master Plan (estable, inmodificable sin referéndum) pero en nivel II (Structural) en la Constitución. Si alguien escribe COGNITIVE_PRINCIPLES.md siguiendo el Master Plan, violará la jerarquía de la Constitución, y viceversa.

**Recomendación:**
- Decidir una sola jerarquía y actualizar el otro documento para que coincida.
- La Constitución es nivel I, así que la Sección 6 debe prevalecer y el Master Plan debe reescribirse.
- O eliminar la Sección 6 de la Constitución y delegarla al Master Plan (reducir la Constitución).

**Requiere enmienda constitucional:** Sí — pero primero requiere una decisión de arquitectura documental.

---

### 🔴 H-03 — Problema de bootstrap: la Constitución no puede ratificarse a sí misma

| Campo | Valor |
|-------|-------|
| **Severidad** | 🔴 Crítica |
| **Ubicación** | 7.1 (p.1073–1101) y 7.8 (p.1236–1246) |
| **Tipo** | Inconsistencia normativa / artículo faltante |

**Explicación técnica:**

La Sección 7.8 dice: "This Constitution enters into force upon ratification by the Constituent Body through the process defined in Section 7.2."

Pero la Sección 7.2 requiere:
1. Un Cuerpo Constituyente (7.1) que incluya "Human Principals designated by TaxiGuazú"
2. Un proceso que requiere mayoría de Human Principals
3. Períodos de revisión

**El problema:** ¿Quién designa a los Human Principals iniciales? La Constitución no lo dice. Si la Constitución no está en vigor, no puede designar autoridades. Si no hay autoridades, la Constitución no puede ratificarse. Es un círculo vicioso.

**Consecuencias presentes y futuras:**
- La Constitución queda en estado DRAFT permanente.
- Nadie tiene autoridad legítima para declararla en vigor.
- Cualquier decisión basada en ella es jurídicamente cuestionable.

**Recomendación:**
- Agregar una cláusula de "enactment transitorio" que designe autoridades iniciales por fuera de la Constitución misma.
- Ejemplo: "The initial Constituent Body shall be composed of [persons/roles], who shall serve until the first ratification cycle."
- O una declaración unilateral: "This Constitution enters into force upon approval by the AEL Director and the project founder."

**Requiere enmienda constitucional:** Sí (Foundational — afecta la existencia misma de la Constitución).

---

### 🔴 H-04 — Límites no negociables vs. S-P9: círculo vicioso

| Campo | Valor |
|-------|-------|
| **Severidad** | 🔴 Crítica |
| **Ubicación** | 5.4.1 (p.864–874) y S-P9 (p.601–610) |
| **Tipo** | Contradicción interna |

**Explicación técnica:**

La Sección 5.4.1 dice: "These boundaries cannot be violated, even temporarily, without a constitutional amendment."

Y luego: "Violation of a non-negotiable boundary is a breach of constitutional integrity (S-P9) and cannot be resolved through the exception process (5.4.3)."

**Problema:** S-P9 establece el proceso para manejar VIOLACIONES constitucionales: documentación + plan + aprobación. Pero 5.4.1 dice que la violación de un límite no negociable NO PUEDE resolverse mediante el proceso de excepción.

Si un límite no negociable se viola:
- ¿Se aplica S-P9? La Constitución dice: "Violation of a non-negotiable boundary is a breach of constitutional integrity (S-P9)."
- Pero S-P9 requiere aprobación de la autoridad de gobierno, y su función es gestionar violaciones.
- Si S-P9 no puede resolverla (porque la excepción está prohibida), ¿qué pasa?
- ¿Se detiene el sistema? ¿Se revierte el cambio? ¿Quién decide?

La Constitución no tiene una cláusula de remediación para violaciones de límites no negociables. Crea un callejón sin salida normativo.

**Consecuencias presentes y futuras:**
- Si un bug introduce una violación (un precio que excede el límite), el sistema no tiene un camino constitucional para resolverlo además de una enmienda completa.
- El equipo puede ignorar la Constitución en la práctica cuando ocurra la primera violación inevitable, erosionando su autoridad.

**Recomendación:**
- Definir explícitamente qué ocurre tras una violación de límite no negociable:
  - ¿Corrección automática?
  - ¿Rollback?
  - ¿Suspensión temporal con enmienda obligatoria en N días?
- Separar claramente el proceso de violación (S-P9) del proceso de remediación (nuevo).

**Requiere enmienda constitucional:** Sí (afecta S-P9 y Sección 5).

---

### 🔴 H-05 — S-P8 "Preservación sobre Existencia" es paradójico

| Campo | Valor |
|-------|-------|
| **Severidad** | 🔴 Crítica |
| **Ubicación** | S-P8(1) (p.583–585) |
| **Tipo** | Inconsistencia normativa |

**Explicación técnica:**

S-P8(1): "Principles of Preservation (S-P5, S-P6, S-P7) take precedence over Principles of Existence (S-P1 through S-P4), because a system that cannot preserve its knowledge cannot exist as AITOS."

**Problema:** Los principios de Existencia (S-P1 a S-P4) son los que DEFINEN qué es AITOS:
- S-P1: basado en evidencia
- S-P2: honestidad epistémica
- S-P3: independencia de canal
- S-P4: núcleo determinista

Si la Preservación prevalece sobre la Existencia, entonces un sistema que preserva perfectamente todo (S-P5, S-P6, S-P7) pero NO opera basado en evidencia (S-P1 violado) sería más constitucional que un sistema que es AITOS pero no preserva bien.

**Esto es absurdo:** Un sistema que no es AITOS pero preserva datos no tiene sentido. La preservación PRESUPONE la existencia.

**Además:** La justificación del S-P8(1) es autocontradictoria: "a system that cannot preserve its knowledge cannot exist as AITOS." Esto es un argumento ontológico, no normativo. Si un sistema no puede preservar su conocimiento, DEJA de existir como AITOS — pero eso significa que la Existencia es PRERREQUISITO de la Preservación, no al revés. La jerarquía está invertida.

**Consecuencias presentes y futuras:**
- Un evaluador constitucional podría argumentar que violar S-P1 (evidencia) está bien si se hace para preservar datos (S-P5).
- La jerarquía incorrecta se usará para justificar violaciones de identidad del sistema.

**Recomendación:**
- Invertir la jerarquía: Existencia sobre Preservación.
- O eliminarla: ambos son iguales, la precedencia se define por contexto, no por categoría.

**Requiere enmienda constitucional:** Sí (Foundational — afecta S-P8, un meta-principio supremo).

---

### 🟠 H-06 — Duplicación completa de jerarquías documentales

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟠 Alta |
| **Ubicación** | Sección 6 vs. CONSTITUTION_MASTER_PLAN.md Secciones 1–2 |
| **Tipo** | Contradicción entre documentos de nivel I |

**Explicación técnica:**

Además del problema de compatibilidad (H-02), hay un problema de **duplicación de autoridad**: tanto la Constitución (Sección 6) como el Master Plan definen la jerarquía documental. La Constitución dice que ella es la autoridad suprema. Pero el Master Plan se escribió primero y también reclama autoridad sobre la estructura documental.

En la práctica:
- Si el Master Plan dice que DECISION_MODEL.md es nivel "Operativo" (subordinado a COGNITIVE_ARCHITECTURE.md)
- Y la Constitución dice que DECISION_MODEL.md es nivel III (Contractual Authority)
- Un arquitecto que escribe DECISION_MODEL.md no sabe a qué nivel de abstracción debe situarse.

**Recomendación:** El Master Plan debe actualizarse para reflejar la jerarquía de la Constitución, o la Constitución debe referenciar al Master Plan como la autoridad en estructura documental (y quitar la Sección 6).

**Requiere enmienda:** Sí, pero precedida de una decisión arquitectónica.

---

### 🟠 H-07 — Costo de Error como concepto fundacional inexistente

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟠 Alta |
| **Ubicación** | P-E5 (p.403–405), S-P7 (p.554–572), 3.4 (p.346–362) |
| **Tipo** | Dependencia de concepto inexistente |

**Explicación técnica:**

Tres principios constitucionales dependen del concepto "Cost of Error":
- P-E5: "Proportional response — High Certainty + low Cost → decisive action. Low Certainty + high Cost → clarification or escalation."
- S-P7: "When the system cannot reach a Commitment with sufficient Certainty, and the Cost of Error exceeds the cost of human intervention..."
- 3.4: "The level of Certainty at which the expected cost of acting is less than the expected cost of not acting."

SYSTEM_VOCABULARY.md 8.3 dice textual: "Cost of Error — **DOES NOT EXIST IN ANY FORM.** This is the single biggest gap in the current architecture."

La Constitución prescribe comportamiento basado en un concepto que:
1. No existe en el código
2. No tiene modelo matemático
3. No tiene implementación planificada más allá de una mención en ADR-013

Esto no es un problema si la Constitución prescribe un estado futuro. Pero es un problema si los principios se vuelven **inverificables**: no hay manera de determinar si P-E5 se cumple si "Cost of Error" no puede computarse.

Verificación: Si alguien pregunta "¿este cambio viola P-E5?" — la respuesta requiere conocer el Costo de Error. Si no existe, la respuesta es siempre "no sabemos."

**Recomendación:** Agregar una nota en cada principio dependiente: "This principle is aspirational until Cost of Error is implemented. Until then, substitute criteria: [alternativa verificable]."

**Requiere enmienda:** Sí (afecta P-E5, S-P7 y 3.4).

---

### 🟠 H-08 — Parámetros de negocio como principios constitucionales

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟠 Alta |
| **Ubicación** | 5.3.1 (p.833–840), 5.3.2 (p.844–849) |
| **Tipo** | Mezcla de principios con implementación |

**Explicación técnica:**

La Constitución incluye valores numéricos específicos que son parámetros de negocio, no principios constitucionales:

- "Maximum planning horizon: 90 days" — ¿por qué 90 y no 60 o 365? No hay justificación epistémica.
- "Maximum surge multiplier: 3x the base fare" — esto es una política de precios de TaxiGuazú.
- "Evidence retention: no less than 180 days" — número legal/operativo, no constitucional.
- "Maximum trip price: 50% above or below standard fare" — regla de pricing.

**Problema estructural:** Cambiar el surge multiplier de 3x a 4x requeriría una enmienda constitucional con 30 días de revisión y aprobación de todos los Human Principals. Esto es desproporcionado para un ajuste de precios.

**Además:** La Constitución no define:
- Quién actualiza la "standard fare"
- Cómo se calcula el surge multiplier
- Bajo qué condiciones se cambian estos números

Son parámetros flotantes: la Constitución dice "50% above or below standard fare" pero no dice quién fija la "standard fare" ni cada cuánto se actualiza.

**Recomendación:**
- Mover todos los valores numéricos específicos a documentos subordinados.
- En la Constitución, dejar solo el principio: "AITOS must operate within defined financial boundaries approved by human authority."
- Los valores concretos pertenecen a RESPONSIBILITY_MODEL.md o un documento operativo.

**Requiere enmienda:** Sí (Section 5).

---

### 🟠 H-09 — Cuerpo Constituyente dependiente de TaxiGuazú

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟠 Alta |
| **Ubicación** | 7.1.1 (p.1082–1083) |
| **Tipo** | Dependencia accidental del dominio TaxiGuazú |

**Explicación técnica:**

7.1.1: "Human Principals: Individuals designated by TaxiGuazú as having constitutional authority. At minimum: the technical lead, the product owner, and a business stakeholder."

**Problema:** La Constitución define el Cuerpo Constituyente en términos de la organización actual (TaxiGuazú). Si:
1. AITOS se despliega para otra empresa de transportes
2. El proyecto se open-sourcea
3. TaxiGuazú cambia de nombre o estructura legal
4. La Constitución se reutiliza para otro dominio

...entonces la definición del Cuerpo Constituyente es inválida.

Además, los roles "technical lead, product owner, business stakeholder" son roles específicos de la estructura organizacional actual. No son roles constitucionales universales. Si la organización cambia su estructura (ej: elimina el rol de product owner), la Constitución queda desactualizada.

**Recomendación:**
- Generalizar: "Human Principals: individuals designated by the governing organization as having constitutional authority."
- Mover la especificación de roles a ORGANIZATION.md.
- La Constitución debe definir el principio (hay humanos con veto), no los nombres concretos.

**Requiere enmienda:** Sí (Section 7).

---

### 🟠 H-10 — S-P10 contradice 1.4: alcance constitucional ambiguo

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟠 Alta |
| **Ubicación** | 1.4 (p.68–85) vs. S-P10 (p.612–624) |
| **Tipo** | Contradicción entre secciones |

**Explicación técnica:**

1.4 dice: "This Constitution governs: All source code, All documentation, All decisions, All agents, All communications."

S-P10 dice: "The Constitution governs only what it must. Everything not explicitly governed by this Constitution is governed by subordinate documents."

**Estas dos afirmaciones son contradictorias.** 1.4 dice que gobierna TODO; S-P10 dice que gobierna solo lo EXPLÍCITO.

**Caso concreto:** Un commit message que contenga un término obsoleto. Según 1.4, la Constitución lo gobierna. Según S-P10, la Constitución no dice nada sobre commit messages, así que no lo gobierna.

**Consecuencias:** Cualquier disputa sobre si la Constitución cubre un caso puede argumentarse en ambas direcciones, usando una sección diferente como apoyo.

**Recomendación:** 1.4 debe decir "This Constitution governs: [lista explícita]" sin la frase "all". O S-P10 debe decir "This Constitution governs everything listed in 1.4 and nothing more." Pero no ambas.

**Requiere enmienda:** Sí (1.4 o S-P10).

---

### 🟠 H-11 — "All communications" como ámbito inverificable

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟠 Alta |
| **Ubicación** | 1.4(5) (p.78–79) |
| **Tipo** | Artículo que no debería existir |

**Explicación técnica:**

1.4(5): "All communications about AITOS: commit messages, code reviews, issue discussions, design documents, and team conversations when they establish technical direction."

Un commit message dice "fix: removed evidence check for performance." ¿Es esto una violación constitucional (S-P1)? Probablemente. ¿Cómo se verifica? No hay un proceso constitucional para revisar commit messages. No hay un "constitutional linter."

**Problema de verificabilidad:** Una constitución que no puede verificarse no es una constitución — es una declaración de intenciones. Incluir un ámbito inverificable debilita la credibilidad de los ámbitos verificables.

**Recomendación:** Eliminar 1.4(5) o reemplazar con algo verificable. "The Constitution governs all source code and all normative documents" es verificable. "Team conversations" no lo es.

**Requiere enmienda:** Sí (1.4).

---

### 🟡 H-12 — Duplicación de principios entre 2.4, 3.6 y 4.1

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | P-I1/P-E1/S-P1, P-I4/P-E3/S-P2, P-I2/S-P3 |
| **Tipo** | Principios redundantes |

**Explicación técnica:**

La Constitución declara el mismo principio tres veces en tres ubicaciones diferentes:

| Concepto | 2.4 (Identity) | 3.6 (Epistemic) | 4.1 (Supreme) |
|----------|----------------|-----------------|----------------|
| Evidencia como base | P-I1 | P-E1 | S-P1 |
| Honestidad epistémica | P-I4 | P-E3 | S-P2 |
| Independencia de canal | P-I2 | — | S-P3 |

La Constitución reconoce esto explícitamente en 4.4: "Note on redundancy: P-I1 and P-E1 both relate to evidence primacy..." La nota dice que se mantienen porque "derivan de dominios diferentes."

**Problema:** Esto crea 20 principios donde podrían haber sido 14 o 15. Cada duplicación aumenta la superficie de interpretación conflictiva. Cuando P-I1 dice "Every decision must be grounded in evidence" y S-P1 dice "AITOS must base every Belief, Decision, and Commitment on accumulated Evidence" — si en el futuro se enmienda uno pero no el otro, la diferencia semántica se convierte en contradicción.

**Además:** La nota no tiene fuerza normativa — es un comentario. No puede prevenir la deriva entre versiones de principios duplicados.

**Recomendación:** Eliminar P-I1, P-I4, P-I2, P-E1, P-E3 de sus secciones originales y dejar solo los S-P correspondientes. O al revés: eliminar los S-P y dejar los P-I/P-E. Pero no ambos.

**Requiere enmienda:** Sí (afecta 2.4, 3.6, 4.1).

---

### 🟡 H-13 — Referencia a COGNITIVE_PRINCIPLES.md que no existe

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | 3.3.1 (p.316), 3.4 (p.360), S-P10 (p.614–615), 6.1 (p.934) |
| **Tipo** | Deuda conceptual / dependencia futura |

**Explicación técnica:**

La Constitución referencia "COGNITIVE_PRINCIPLES.md" en 4 lugares como si existiera. No existe. Es un documento que debe escribirse después de la Constitución según el Master Plan (dependencia de escritura: 01 → 02 → 03).

Citas:
- "Certainty must decay over time without confirming Evidence (see COGNITIVE_PRINCIPLES.md)"
- "The calibration of thresholds belongs to COGNITIVE_PRINCIPLES.md and DECISION_MODEL.md"
- "Everything not explicitly governed by this Constitution is governed by subordinate documents (SYSTEM_VOCABULARY.md, COGNITIVE_PRINCIPLES.md...)"
- Level II-a: "COGNITIVE_PRINCIPLES.md — Operational principles derived from constitutional principles."

**Problema:** Si COGNITIVE_PRINCIPLES.md nunca se escribe (o se escribe de forma inconsistente con lo esperado), la Constitución tiene referencias rotas. Los principios que dependen de un documento que no existe son inaplicables.

**Riesgo:** El equipo podría escribir COGNITIVE_PRINCIPLES.md de forma que contradiga las expectativas creadas por la Constitución (ej: definir decay sin mencionar "confirming Evidence").

**Recomendación:** No eliminar las referencias (son necesarias para la arquitectura documental), pero agregar una cláusula: "References to documents not yet written are aspirational. Until those documents are ratified, the Constitution's principles apply directly."

**Requiere enmienda:** No (puede resolverse en COGNITIVE_PRINCIPLES.md).

---

### 🟡 H-14 — "Rejected all clarification attempts" no está definido

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | 5.2.2(5) (p.806–807) |
| **Tipo** | Concepto con interpretaciones múltiples |

**Explicación técnica:**

5.2.2(5): "Escalated uncertainty: When the system's internal Certainty for a Commitment is below threshold AND the passenger has rejected all clarification attempts."

¿Qué significa "rejected all clarification attempts"?
- ¿Cuántos intentos debe hacer el sistema antes de escalar? ¿1? ¿3? ¿Hasta que el pasajero se enoje?
- ¿Qué constituye un "rechazo"? ¿El pasajero dice "no"? ¿Ignora la pregunta? ¿Cambia de tema?
- ¿Quién determina que "todos" los intentos se han agotado? ¿El sistema? ¿Un humano?
- ¿Hay un límite de tiempo? ¿O un límite de intentos?

**Consecuencia:** Dos implementadores diferentes implementarán esta regla de manera diferente. El sistema puede escalar demasiado pronto (sobrecargando operadores humanos) o demasiado tarde (frustrando al pasajero).

**Recomendación:** Definir "clarification attempts" en términos medibles. Ej: "The system must make at least 3 clarification attempts before escalating. A clarification attempt is a question that offers specific alternatives and receives no unambiguous answer within 2 exchanges."

**Requiere enmienda:** No — puede definirse en COGNITIVE_PRINCIPLES.md o DECISION_MODEL.md.

---

### 🟡 H-15 — Dos conjuntos diferentes de reglas de interpretación

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | 1.6 (p.105–121) vs. 7.3.3 (p.1164–1172) |
| **Tipo** | Duplicación con diferencia semántica |

**Explicación técnica:**

1.6 define 5 reglas de interpretación generales:
1. Consistency with Ontology
2. Internal consistency (specific > general, later > earlier)
3. Principle over convenience
4. Purpose over literalism
5. Minimal interpretation

7.3.3 define 5 reglas de interpretación PARA DISPUTAS:
1. Purpose over text
2. Consistency with Ontology
3. Internal consistency
4. Minimal interpretation
5. Precedent

**Diferencias:**
- 1.6 incluye "Principle over convenience"; 7.3.3 no.
- 7.3.3 incluye "Precedent"; 1.6 no.
- El orden es diferente: 1.6 pone "Consistency with Ontology" primero; 7.3.3 pone "Purpose over text" primero.
- 1.6 dice "purpose over literalism"; 7.3.3 dice "purpose over text" — son equivalentes pero no idénticos.

**Problema:** Cuando se interpreta la Constitución (no en disputa), se usa 1.6. Cuando hay disputa, se usa 7.3.3. ¿Pero una disputa de interpretación NO es una interpretación? ¿Por qué aplicarían reglas diferentes?

**Consecuencia:** Una cláusula podría interpretarse de una manera en 1.6 y de otra en 7.3.3. El "precedent" de 7.3.3 podría no existir en 1.6, pero el "principle over convenience" de 1.6 podría no existir en 7.3.3.

**Recomendación:** Unificar. O que 1.6 remita a 7.3.3 para disputas, o que 7.3.3 incorpore el mismo conjunto que 1.6.

**Requiere enmienda:** Sí (1.6 y 7.3.3).

---

### 🟡 H-16 — Documentos en estado SUNSET o SUPERSEDED sin proceso de transición

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | 6.5 (p.1046–1057) |
| **Tipo** | Artículo incompleto |

**Explicación técnica:**

6.5 define 5 estados de documentos: DRAFT, RATIFIED, AMENDING, SUNSET, SUPERSEDED.

Pero solo define procesos para:
- DRAFT → RATIFIED (7.2: amendment process)
- RATIFIED → AMENDING (7.2: amendment process)

No define procesos para:
- RATIFIED → SUNSET (¿quién declara un documento sunset?)
- SUNSET → SUPERSEDED (¿automático? ¿por decisión?)
- SUPERSEDED → (¿puede resucitarse un documento superseedido?)

Tampoco define:
- Quién tiene autoridad para cambiar el estado de un documento
- Qué umbral de aprobación se requiere para SUNSET vs. SUPERSEDED
- Si los documentos en SUNSET pueden seguir usándose como referencia

**Recomendación:** Agregar subsecciones que definan el proceso de transición para cada estado. Delegar a GOVERNANCE.md si existe.

**Requiere enmienda:** Sí (Section 6).

---

### 🟡 H-17 — "Evidence retention: no less than 180 days" como número específico

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | 5.3.1 (p.837) |
| **Tipo** | Mezcla de principio con requisito legal |

**Explicación técnica:**

5.3.1: "Evidence must be retained per applicable law, and no less than 180 days."

El "180 days" es un número arbitrario. Si la ley aplicable cambia a 90 días, la Constitución exige 180. Si la ley exige 365, la Constitución exige 180 (pero "per applicable law" exige más). La conjunción "and" crea una doble restricción que puede ser contradictoria.

**Caso concreto:** Si una ley exige retención mínima de 365 días, la Constitución dice "per applicable law (365) AND no less than 180." Se cumple la de 365. Pero si una ley exige 90 días, la Constitución dice "per applicable law (90) AND no less than 180." Hay conflicto: ¿la ley permite eliminar a los 90, pero la Constitución exige 180? ¿Cuál prevalece?

1.4 dice que la Constitución NO gobierna "Legal or regulatory compliance." Pero 5.3.1 es una regla constitucional que toca compliance. La Constitución se está metiendo donde dijo que no entra.

**Recomendación:** "Evidence must be retained per applicable law." Quitar "no less than 180 days."

**Requiere enmienda:** Sí (5.3.1).

---

### 🟢 H-18 — P-I3 y canal API: tensión no resuelta

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟢 Baja |
| **Ubicación** | P-I3 (p.247–250) vs. 5.3.3 (p.856) |
| **Tipo** | Conflicto potencial |

**Explicación técnica:**

P-I3: "The system must never require structured input to function."
5.3.3: "AITOS must support at least one text-based and one API-based channel."

Un canal API típicamente usa JSON estructurado. Si AITOS soporta un canal API, y un cliente usa solo ese canal, el sistema está aceptando input estructurado. Pero P-I3 dice que NUNCA debe requerir input estructurado.

**Tensión:** No es una contradicción directa (el sistema no "requiere" structured input porque también tiene un canal text-based). Pero si el canal text-based falla y solo queda el API, el sistema requiere input estructurado para funcionar, violando P-I3.

**Recomendación:** Agregar una nota: "The API channel must accept natural language in at least one field of its structured format, ensuring the system never depends on structured input exclusively."

**Requiere enmienda:** No — puede resolverse en CHANNEL_ADAPTER.md.

---

### 🟢 H-19 — "Standard fare" no definido

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟢 Baja |
| **Ubicación** | 5.3.2 (p.846) |
| **Tipo** | Concepto flotante |

**Explicación técnica:**

5.3.2: "Maximum trip price: AITOS may not commit to a trip price more than 50% above or below the standard fare without human approval."

"Standard fare" no está definido en ninguna parte. SYSTEM_VOCABULARY.md no lo define. La Constitución no lo define. No es un concepto ontológico ni constitucional.

¿Es la tarifa de la ruta? ¿La tarifa por minuto? ¿La tarifa mínima? ¿La tarifa que existía al inicio de la conversación? ¿Quién la define?

**Riesgo:** Si "standard fare" es un concepto del sistema de pricing de TaxiGuazú, y ese sistema cambia (ej: precios dinámicos), el 50% deja de tener sentido.

**Recomendación:** Eliminar la referencia a "standard fare" y decir "AITOS may not commit to a trip price outside the approved pricing bounds defined in [documento subordinado]."

**Requiere enmienda:** Sí (5.3.2).

---

### 🟢 H-20 — Documentación de AEL en jerarquía ambigua

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟢 Baja |
| **Ubicación** | 6.1 (p.1030–1033) y 7.7 (p.1227–1234) |
| **Tipo** | Límites de autoridad mal definidos |

**Explicación técnica:**

7.7 dice: "ORGANIZATION.md — Defines roles, membership, and capabilities of the governance bodies. Location: ael/government/ORGANIZATION.md. These documents are Level II (Structural Authority)."

6.1 R-H5 dice: "The AEL (ARNÉS/Agent Execution Layer) itself produces and consumes these documents. The AEL is not a separate hierarchy."

**Problema:** Los documentos del AEL (SPEC.md, CONTRACTS.md, ORGANIZATION.md) gobiernan al AEL, que es el sistema que CONSTRUYE a AITOS. Pero la Constitución es la autoridad suprema DE AITOS. Si el AEL produce la Constitución, ¿el AEL está por encima de la Constitución? No — la Constitución dice que está por encima de todo.

Pero si los documentos del AEL están en Level II, y el AEL construye AITOS usando estos documentos, entonces Level II documentos están gobernando al CONSTRUCTOR. ¿Quién gobierna al AEL? ¿La Constitución? ¿O los documentos del AEL están fuera de la jerarquía?

**Riesgo:** Un conflicto entre SPEC.md (AEL document) y la Constitución — SPEC.md dice cómo debe operar el AEL, la Constitución dice qué debe producir el AEL. Si chocan, ¿cuál gana?

**Recomendación:** Definir explícitamente que los documentos del AEL están fuera de la jerarquía de 4 niveles, o incluirlos como Level 0 (autoridad meta-constitucional).

**Requiere enmienda:** Sí (Section 6, R-H5).

---

### 📋 H-21 — Ausencia de cláusula de no-regresión

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación | ** Ausente en toda la Constitución |
| **Tipo** | Artículo faltante |

**Explicación técnica:**

La Constitución define 20 principios, pero no tiene una cláusula de **no-regresión**: la garantía de que los estándares constitucionales solo pueden aumentar, no disminuir.

En constituciones políticas, la no-regresión significa que los derechos reconocidos no pueden reducirse. En esta Constitución, significaría que los principios establecidos no pueden relajarse — solo pueden fortalecerse o mantenerse.

**Sin esta cláusula:**
- Una enmienda podría eliminar S-P4 (Deterministic Core) y reemplazarlo con "el sistema puede usar LLM para todo."
- Una enmienda podría reducir S-P5 (Evidence Immutability) a "la evidencia puede eliminarse después de 30 días."
- Todas estas serían válidas si siguen el proceso de enmienda.

**Recomendación:** Agregar: "Constitutional principles may only be amended to expand their scope or strengthen their constraints. No amendment may reduce the protection afforded by any principle."

**Requiere enmienda:** Sí (nueva subsección en Section 4 o 7).

---

### 📋 H-22 — Ausencia de cláusula de emergencia existencial

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | Ausente en toda la Constitución |
| **Tipo** | Artículo faltante |

**Explicación técnica:**

La Constitución prevé enmiendas de emergencia (7.4) para violaciones o brechas operativas. Pero no prevé una **emergencia existencial**: una situación donde la supervivencia del proyecto o la empresa requiera violar principios constitucionales.

Ejemplos:
- La empresa está a punto de quebrar y necesita implementar un feature que viola P-I3.
- Un inversor exige integración con Meta que viola S-P3.
- Un bug crítico solo puede parchearse violando S-P1 temporalmente.

S-P9 permite violaciones temporales con plan. Pero si la violación es de un principio Foundational y la empresa necesita hacerla permanente para sobrevivir, el proceso de 30 días no sirve.

**Recomendación:** Agregar "Sunset clause": "In case of existential threat to the organization, the Constituent Body may, by unanimous vote of Human Principals, suspend specific constitutional provisions for a maximum of 90 days. After 90 days, either the suspension is ratified as a permanent amendment or the provisions are restored."

**Requiere enmienda:** Sí (nueva subsección en Section 7).

---

### 📋 H-23 — Constitución no distingue entre principios y reglas de implementación

| Campo | Valor |
|-------|-------|
| **Severidad** | 🟡 Media |
| **Ubicación** | S-P4 (p.489–509), S-P5 (p.515–534), S-P7 (p.554–572) |
| **Tipo** | Mezcla de principios con mecanismos de implementación |

**Explicación técnica:**

Varios principios supremos incluyen criterios de verificación que son reglas de implementación disfrazadas:

S-P5: "Append-only must be architecturally enforced." — esto prescribe una decisión arquitectónica específica (append-only logging). El principio (la evidencia no se modifica) es correcto, pero la imposición de "append-only" como requisito arquitectónico es una regla de implementación.

S-P4: "If the system cannot complete a cognitive cycle without calling an LLM, this principle is violated." — esto define un test de verificación que depende de la arquitectura actual del Cognitive Cycle. Si el Cognitive Cycle cambia (ej: se divide en micro-ciclos), el test deja de tener sentido.

S-P7: "Silence after a user request that the system cannot handle is a violation." — esto es una regla operativa, no un principio. El principio es "el sistema debe escalar cuando no puede decidir." La regla "silence = violation" es una implementación.

**Riesgo:** Cuando la arquitectura cambie, los criterios de verificación quedarán obsoletos pero seguirán en la Constitución, creando fricción. Ejemplo: si se introduce un buffer de mensajes asíncrono, "silence after a user request" podría ser de 500ms mientras el sistema procesa, pero S-P7 lo consideraría violación.

**Recomendación:** Separar cada principio en:
- **Principio** (invariable, tecnológicamente neutro)
- **Criterios de verificación** (en nota, actualizables sin enmienda)

**Requiere enmienda:** Sí (afecta la estructura de 4.1, 4.2).

---

## Tabla de hallazgos por severidad

| ID | Severidad | Título | ¿Requiere enmienda constitucional? |
|----|-----------|--------|-----------------------------------|
| H-01 | 🔴 Crítica | Meta-reglas de interpretación contradictorias | Sí — Foundational |
| H-02 | 🔴 Crítica | Jerarquía incompatible con Master Plan | Sí — Foundational |
| H-03 | 🔴 Crítica | Bootstrap: no puede ratificarse a sí misma | Sí — Foundational |
| H-04 | 🔴 Crítica | Límites no negociables vs. S-P9 (círculo) | Sí — Major |
| H-05 | 🔴 Crítica | Preservación sobre Existencia (paradoja) | Sí — Foundational |
| H-06 | 🟠 Alta | Duplicación de jerarquías documentales | Sí — Major |
| H-07 | 🟠 Alta | Costo de Error inexistente como dependencia | Sí — Minor |
| H-08 | 🟠 Alta | Parámetros de negocio como principios | Sí — Minor |
| H-09 | 🟠 Alta | Cuerpo Constituyente TaxiGuazú-específico | Sí — Major |
| H-10 | 🟠 Alta | S-P10 contradice 1.4 (alcance) | Sí — Major |
| H-11 | 🟠 Alta | "All communications" inverificable | Sí — Editorial |
| H-12 | 🟡 Media | Duplicación de principios (P-I/P-E/S-P) | Sí — Major |
| H-13 | 🟡 Media | Referencia a COGNITIVE_PRINCIPLES.md inexistente | No |
| H-14 | 🟡 Media | "Rejected all clarification attempts" indefinido | No |
| H-15 | 🟡 Media | Dos conjuntos de reglas de interpretación | Sí — Minor |
| H-16 | 🟡 Media | SUNSET/SUPERSEDED sin proceso de transición | Sí — Minor |
| H-17 | 🟡 Media | "180 days" como requisito legal en Constitución | Sí — Editorial |
| H-18 | 🟢 Baja | P-I3 vs canal API (tensión) | No |
| H-19 | 🟢 Baja | "Standard fare" no definido | Sí — Editorial |
| H-20 | 🟢 Baja | Documentos AEL en jerarquía ambigua | Sí — Minor |
| H-21 | 🟡 Media | Ausencia de cláusula de no-regresión | Sí — Major |
| H-22 | 🟡 Media | Ausencia de cláusula de emergencia existencial | Sí — Major |
| H-23 | 🟡 Media | Principios mezclados con reglas de implementación | Sí — Major |

---

## Análisis de riesgo agregado

### Riesgos que se materializarían si se ratifica sin correcciones

| Riesgo | Hallazgos relacionados | Probabilidad | Impacto |
|--------|----------------------|-------------|---------|
| La Constitución no puede entrar en vigor | H-03 | 100% | Catastrófico |
| Disputas de interpretación irresolubles | H-01, H-15 | Alta | Alto |
| Equipo confundido sobre qué documentación crear | H-02, H-06 | Alta | Alto |
| Violaciones de principios no gestionables | H-04, H-05 | Alta | Alto |
| Principios inverificables por falta de conceptos base | H-07 | Media | Alto |
| La Constitución se vuelve un obstáculo burocrático | H-08, H-11 | Alta | Medio |
| Dependencia organizacional imposibilita reuso | H-09 | Media | Medio |

### Riesgos mitigados (la Constitución los maneja bien)

- **Deriva conceptual**: bien manejada por S-P9 y el proceso de deuda constitucional.
- **Obsolescencia**: bien manejada por el ciclo de revisión (7.5).
- **Conflictos entre principios**: S-P8 los maneja (aunque con el problema de H-05).
- **Agentes IA sin voz**: bien manejado por 7.1.2 (voz consultiva pero no veto).

---

## Dictamen constitucional

> **NO APTA PARA RATIFICACIÓN.**

**Justificación:**

La Constitución contiene **5 hallazgos críticos** que impiden su ratificación:

1. **H-03 (bootstrap)**: La Constitución no puede entrar en vigor porque requiere un Cuerpo Constituyente que la propia Constitución debe designar, pero no designa.

2. **H-01 (meta-reglas contradictorias)**: Las reglas de interpretación pueden producir resultados opuestos para el mismo caso, haciendo que la Constitución sea intrínsecamente disputable.

3. **H-02 (jerarquía incompatible)**: La Constitución y el Master Plan definen estructuras documentales diferentes, creando una contradicción entre dos documentos de nivel I.

4. **H-05 (paradoja de preservación)**: La jerarquía S-P8(1) es lógicamente insostenible: pone la preservación sobre la existencia, cuando la existencia es prerrequisito de la preservación.

5. **H-04 (círculo vicioso)**: Los límites no negociables crean una violación que no puede procesarse mediante los mecanismos que la propia Constitución define.

**Acción requerida:**

Se necesitan correcciones estructurales antes de cualquier consideración de ratificación:

1. **Resolver el bootstrap**: agregar cláusula de enactamiento transitorio.
2. **Unificar meta-reglas**: eliminar contradicciones en 1.6 y S-P8.
3. **Alinear con Master Plan**: decidir una jerarquía documental única.
4. **Corregir S-P8(1)**: invertir o eliminar la jerarquía Preservación > Existencia.
5. **Cerrar el círculo de violaciones**: definir proceso para límites no negociables.
6. **Separar principios de mecanismos**: extraer criterios de verificación específicos.
7. **Eliminar parámetros de negocio**: mover a documentos subordinados.
8. **Generalizar Cuerpo Constituyente**: desacoplar de TaxiGuazú.

Una vez corregidos los hallazgos críticos, los hallazgos altos y medios pueden abordarse en enmiendas posteriores sin bloquear una ratificación condicional.

---

*Fin de Auditoría Constitucional Integral*
*Fecha: 2026-07-11*
*Auditor: AEL Director (Mission Planner)*
