# Mission Closure Contract — Learning Trigger

> Contrato arquitectónico que determina cuándo y cómo se ejecuta Learning dentro del modelo PLAN → BUILD.

---

## 0. Auditorías V-01 a V-05

### V-01 — Cómo se ejecuta actualmente Learning

Learning es una capability del AEL definida en `ael/constitution/SPEC.md` §4 como "Extract patterns from accumulated knowledge. Recommends; does not modify." Su rol es Analyst (`ael/government/roles/07-learning.md`). El AEL lo invoca mediante el subagente `@ael-learn` cuando considera que existen múltiples misiones similares de las que extraer patrones.

**Hallazgo:** No existe un contrato formal de activación. El Director decide discrecionalmente cuándo invocar Learning. No hay ninguna restricción documentada que impida su ejecución durante una misión abierta.

### V-02 — Qué eventos podrían dispararlo

Actualmente no hay eventos formales. El único criterio documentado es la descripción en `ael.md`: "Hay múltiples misiones similares de las que extraer patrones". Es una condición cualitativa sin umbrales ni estados de misión asociados.

**Hallazgo:** Cualquier evento puede disparar Learning si el Director lo decide. No hay protección contra ejecución prematura.

### V-03 — Si existe actualmente algún contrato de cierre

No existe un contrato formal de cierre de misión. El AEL tiene una sección "Cierre de misión" en su prompt que verifica calidad, documentación y conocimiento, pero es un cierre táctico dentro de BUILD. La `MISSION_PHASE_ARCHITECTURE.md` define el flujo PLAN → BUILD pero no especifica qué constituye el cierre estratégico de una misión ni quién tiene autoridad para declararlo.

**Hallazgo:** No hay distinción entre cierre táctico (BUILD complete) y cierre estratégico (mission closed). Learning podría ejecutarse después de cualquier BUILD sin esperar la decisión del SDL.

### V-04 — Si Learning puede ejecutarse múltiples veces durante una misma misión

Sí. La SPEC §4 establece que "The Director may use any subset, in any order, as many times as needed, or not at all." No existe restricción que impida invocar Learning repetidamente durante una misma misión.

**Hallazgo:** Learning podría ejecutarse sobre evidencia parcial e iteraciones intermedias, violando el principio de que debe aprender solo de conocimiento consolidado.

### V-05 — Si el nuevo contrato contradice alguna ADR o documento existente

No se identifican contradicciones:

- La `MISSION_PHASE_ARCHITECTURE.md` es compatible: el paso 8 (Execution Report) seguido del paso 9 (SDL evalúa) ya implica que el SDL decide el próximo ciclo.
- SPEC §2 "Director Sovereignty" (tactical dentro del EP) es compatible — la autoridad de cierre es estratégica, no táctica.
- SPEC §6 L4 (Closure) se refiere a cierre táctico de BUILD, no al cierre estratégico de misión.
- No hay ADRs que contradigan este contrato.

---

## 1. Objective

Garantizar que Learning solo incorpore conocimiento proveniente de misiones estratégicamente cerradas por el Strategic Director. Learning no debe aprender de hipótesis, evidencia parcial ni iteraciones intermedias.

---

## 2. Motivation

El ecosistema opera bajo PLAN → BUILD pero no existe un contrato que determine cuándo Learning puede ejecutarse. Sin esta restricción:

- Learning puede ejecutarse durante una misión abierta, incorporando hallazgos parciales.
- Múltiples BUILD dentro de una misma misión pueden disparar Learning prematuramente.
- No hay distinción entre cierre táctico (BUILD terminó) y cierre estratégico (misión completada).
- El conocimiento consolidado se mezcla con hipótesis no validadas.

Este contrato establece el criterio arquitectónico único para disparar Learning: **misión cerrada por el SDL**.

---

## 3. Estados de la misión

Una misión puede encontrarse únicamente en uno de estos estados:

| Estado | Descripción |
|--------|-------------|
| **IN PROGRESS** | La misión tiene un Execution Plan aprobado y BUILD está activo o puede reactivarse. Pueden ejecutarse múltiples BUILD. |
| **CLOSED** | El Strategic Director determinó que el objetivo fue alcanzado o que la misión debe darse por finalizada. |

**Transiciones:**

```
PLAN → BUILD (IN PROGRESS) → BUILD (IN PROGRESS) → ... → SDL declara CLOSED → Learning
```

No existe otro estado. No existe transición directa de IN PROGRESS a Learning.

---

## 4. Contracto de cierre

| Elemento | Regla |
|----------|-------|
| ¿Quién cierra? | Solo el Strategic Director |
| ¿Cuándo se cierra? | Cuando el SDL determina explícitamente que el objetivo fue alcanzado o la misión debe finalizar |
| ¿Cómo se cierra? | Mediante declaración explícita en el bloque de cierre del SDL |
| ¿Qué pasa al cerrar? | La misión pasa a CLOSED. Learning puede ejecutarse. |
| ¿Qué no pasa al cerrar? | No se inicia automáticamente un nuevo BUILD. El ciclo PLAN → BUILD se reinicia si hay nueva misión. |

---

## 5. Responsabilidades del Strategic Director

- Declarar el fin de una misión explícitamente.
- Determinar si el objetivo fue alcanzado o si la misión debe darse por finalizada.
- Evaluar los Execution Reports de BUILD antes de cerrar.
- NO delegar la decisión de cierre al AEL.
- NO cerrar una misión sin evidencia suficiente.

### Formato de cierre

El SDL debe incluir en su respuesta la declaración de cierre cuando corresponda:

━━━━━━━━━━━━━━━━━━━━━━

**Mission Status**

CLOSED

**Justification**

(razón por la que la misión se cierra: objetivo alcanzado o finalización justificada)

**Next**

(próximo paso: nueva misión, nuevo ciclo PLAN, o fin de sesión)

━━━━━━━━━━━━━━━━━━━━━━

---

## 6. Responsabilidades del AEL

- Ejecutar BUILD según el Execution Plan.
- Entregar Execution Report al finalizar cada BUILD.
- NO ejecutar Learning durante una misión IN PROGRESS.
- NO ejecutar Learning hasta que el SDL declare la misión CLOSED.
- Preservar conocimiento (Memory) durante BUILD para que Learning lo consuma después del cierre.

---

## 7. Contracto de Learning

### Condición única de activación

Learning se ejecuta **únicamente** cuando:

1. La misión está en estado **CLOSED** (declarado por el SDL).
2. Existe conocimiento consolidado de la misión (Execution Reports, decisiones registradas, Memory snapshots).

### Lo que Learning recibe

- Execution Report completo de la misión.
- Decisiones registradas (ADR, DECISION_RECORD).
- Memory snapshots de la misión.
- PROJECT_BOARD y CHANGELOG actualizados.

### Lo que Learning NO recibe

- Hipótesis no validadas.
- Evidencia parcial de BUILD intermedios.
- Iteraciones intermedias no consolidadas.
- Hallazgos no confirmados por el SDL.

### Output de Learning

- Pattern report con regularidades detectadas.
- Recomendaciones para misiones futuras.
- Propuestas de mejora arquitectónica.

---

## 8. Condiciones de activación

Learning se activa cuando:

- ✅ Misión en estado CLOSED.
- ✅ SDL ha emitido declaración explícita de cierre.
- ✅ Existe al menos un Execution Report consolidado.
- ✅ El SDL no ha indicado explícitamente "no ejecutar Learning" (opcional en cierre).

---

## 9. Condiciones de NO activación

Learning NO se activa cuando:

- ❌ Misión en estado IN PROGRESS.
- ❌ BUILD ejecutándose o recién terminado sin cierre del SDL.
- ❌ El SDL declaró NOT READY en su Execution Status.
- ❌ Múltiples BUILD ejecutados pero sin cierre estratégico.
- ❌ Auditorías o implementaciones intermedias sin misión cerrada.

---

## 10. Workflow completo

```
PLAN
  │
  ▼
SDL produce Recommendation + Execution Plan + Execution Status (READY)
  │
  ▼
Usuario aprueba ("ok" / "hacelo")
  │
  ▼
BUILD (IN PROGRESS)
  │
  ├── AEL ejecuta EP → entrega Execution Report
  │     (NO ejecuta Learning)
  │
  ├── (opcional) SDL produce nuevo EP → BUILD nuevamente
  │     (múltiples BUILD permitidos)
  │
  ▼
SDL declara misión CLOSED
  │
  ▼
CLOSED
  │
  ├── AEL ejecuta Learning (si aplica)
  │     Recibe: Execution Reports + Memory + Decisiones
  │     Produce: Pattern Report + Recomendaciones
  │
  ▼
PLAN (nuevo ciclo) o fin de sesión
```

---

## 11. Invariantes

| ID | Invariante |
|----|-----------|
| MC-01 | Learning nunca se ejecuta durante una misión IN PROGRESS. |
| MC-02 | El único responsable de cerrar una misión es el Strategic Director. |
| MC-03 | Learning solo procesa conocimiento consolidado de misiones CLOSED. |
| MC-04 | BUILD puede ejecutarse múltiples veces sin disparar Learning. |
| MC-05 | El cierre de misión requiere declaración explícita del SDL. |
| MC-06 | El AEL no puede declarar el cierre de una misión. |
| MC-07 | Learning recibe únicamente: Execution Reports, decisiones registradas, Memory snapshots, PROJECT_BOARD, CHANGELOG. |

---

## 12. Certificación arquitectónica

Este contrato queda certificado cuando:

- [ ] MC-01 verificado: ninguna ejecución de Learning ocurrió durante una misión abierta.
- [ ] MC-02 verificado: solo el SDL declaró cierres de misión.
- [ ] MC-03 verificado: Learning solo procesó misiones CLOSED.
- [ ] MC-04 verificado: BUILD se ejecutó múltiples veces sin disparar Learning.
- [ ] MC-05 verificado: todo cierre incluyó declaración explícita del SDL.
- [ ] El contrato no modifica la arquitectura PLAN → BUILD existente.
- [ ] No se introducen nuevas capacidades funcionales.
- [ ] Solo se formaliza el contrato de cierre de misión.

---

### Relación con documentos existentes

| Documento | Relación |
|-----------|----------|
| `MISSION_PHASE_ARCHITECTURE.md` | Compatible. Este contrato extiende el paso 8-9 agregando el estado CLOSED y el trigger de Learning. |
| `SPEC.md §4 Capabilities` | Compatible. Learning conserva su definición; se agrega la restricción de activación. |
| `SPEC.md §6 L4 Closure` | Compatible. L4 se refiere al cierre táctico de BUILD; MC se refiere al cierre estratégico de misión. |
| `ael.md` | Compatible. La sección "Cierre de misión" del AEL se mantiene como cierre táctico. |
| `07-learning.md` | Compatible. El contrato de Learning se refina con la condición de activación. |

---

*Este documento es el contrato arquitectónico de cierre de misión. Formaliza cuándo y cómo Learning puede ejecutarse dentro del modelo PLAN → BUILD. Cualquier modificación requiere revisión del SDL.*
