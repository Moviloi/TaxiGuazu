# ADR 011: Elimination of Reflection Layer

**Status:** Accepted — **aplica al pipeline futuro ⏳**  
**Date:** 2026-07-13  
**Driver:** PR-6 (Reflection Architecture — six audits concluding layer elimination)

> **⚠️ Aclaración PR-11A (2026-07-13):** Reflection fue eliminada como capa del *pipeline cognitivo futuro* (EE → Memory → Pattern Discovery). El pipeline con Reflection (EE → Memory → Reflection → Learning → Goals → Planning) **nunca existió como implementación** — Memory, Learning cognitivo, Goals y Planning tampoco existen. Esta ADR documenta una simplificación del diseño futuro, no la eliminación de código existente.  
> El único pipeline real implementado es: **EE → Shadow Observer → (output descartado)**.

---

## Context

### 1.1 Motivación Original para Introducir Reflection

El pipeline cognitivo de AITOS (ADR-009) define una cadena lineal de capas que transforman un mensaje crudo en una decisión cognitiva:

```
Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
```

Una vez completado el pipeline, Memory (ADR-010) preserva el par Belief+Decision como un snapshot inmutable por turno. La arquitectura original, definida en ADR-009 §7, postulaba que el siguiente paso era una capa intermedia llamada **Reflection** con la siguiente entrada conceptual (ADR-009 §7, tabla de capas futuras):

| Layer | Precondition | Entry Point | Description |
|-------|-------------|-------------|-------------|
| **Reflection** | Memory populated for time window | `reflect(memoryWindow)` → `Reflection` | Analyzes recent memory for patterns, anomalies, and learning signals. |

La hipótesis era que Reflection constituía una capa cognitiva independiente, ontológicamente distinta de Memory (abajo) y Learning (arriba), con transformaciones propias, invariantes propios, y un ciclo de vida independiente.

### 1.2 Hipótesis Arquitectónica Inicial

Se postuló que Reflection debía:

- Ser una función pura que toma una ventana de snapshots de Memory y produce observaciones estructuradas.
- Operar exclusivamente sobre el dominio cognitivo (nunca sobre el operacional).
- Ser intra-conversación.
- Ser reactiva (invocada bajo demanda, no por turno).
- Mantener separación ontológica respecto de Learning (descripción vs. prescripción).

Esta hipótesis fue sometida a seis auditorías progresivas (PR-6A a PR-6F), cada una diseñada para invalidar el modelo antes de aceptarlo. Los resultados de esas auditorías constituyen la evidencia de esta decisión.

---

## 2. Evidencia Considerada

### 2.1 PR-6A: Reflection Architecture — First Iteration

**Hallazgos**:
- Definición ontológica inicial: "Reflection analiza ventanas temporales de snapshots cognitivos."
- Límites respecto de Learning: "Reflection describe qué cambió; Learning prescribe qué repetir o evitar."
- Primera auditoría detectó 3 invalidaciones parciales: gaps en snapshots, sobre-especificación de tipos de observación, ciclo de invocación ambiguo.

**Conclusión**: El diseño inicial contenía supuestos no verificados. Se requería una auditoría más profunda de las transformaciones.

### 2.2 PR-6B: Reflection Transformation Audit

**Hallazgos**:
- 21 operaciones analizadas individualmente (comparar, agrupar, contar, detectar cambios, interpolar, inferir, clasificar, etc.).
- 11 operaciones declaradas inválidas para Reflection (contar, agrupar, puntuar, ponderar, clasificar, inferir, predecir, etiquetar, sintetizar, interpolar, calcular probabilidades).
- 4 operaciones declaradas válidas (comparar, detectar cambios, proyectar, normalizar representacional).
- Operación fundamental identificada: `δ(a, b) = {(f, a.f, b.f) | a.f ≠ b.f}` para pares de snapshots consecutivos.
- Reflection quedó reducido a una función pura: `reflect(W) = (W, zipWith(δ, W, tail(W)))`.

**Conclusión**: El kernel de Reflection es una sola transformación matemática. No hay más.

### 2.3 PR-6C: Mathematical Model Audit

**Hallazgos**:
- Reflection es 100% pura (sin IO, sin estado, sin efectos).
- Reflection es 100% determinista (mismos inputs → mismos outputs).
- Reflection NO es idempotente (el tipo del output no coincide con el input).
- Reflection es estable bajo proyección (el output contiene su propio input).
- δ requiere igualdad semántica por tipo de campo (no igualdad sintáctica).
- La proyección de campos (project) pertenece al contrato de salida de Memory, no a Reflection.
- La co-ocurrencia es matemáticamente válida pero se recomienda excluirla por minimalidad.

**Conclusión**: Reflection es matemáticamente equivalente a `zipWith(δ)`. Su simplicidad no es un defecto — es una señal de que podría no ser una capa independiente.

### 2.4 PR-6D: Reflection Elimination Audit

**Hallazgos**: 10 dimensiones arquitectónicas analizadas:

| Dimensión | ¿Exige mantener Reflection? |
|-----------|---------------------------|
| DIP | No — una abstracción compartida basta |
| SRP | No — una función interna no viola SRP de capa |
| Linealidad cognitiva | No — cadena de 1 paso se preserva sin ella |
| Frozen boundaries | No — 0 invariantes rotos |
| Pureza funcional | No — composición de puras sigue siendo pura |
| Matemática | No — equivalencia transformacional demostrada |
| Coste arquitectónico | No — coste > beneficio |
| Minimalidad | No — menos entidades es mejor |
| Teoría de capas | No — Reflection no es capa cognitiva, es función |
| Acoplamiento | No — idéntico con o sin Reflection |

**Conclusión**: 10/10 dimensiones no exigen mantener Reflection. La capa es eliminable.

### 2.5 PR-6E: Contract Boundary Audit

**Hallazgos**:
- ProjectedState NO pertenece al dominio exclusivo de Memory. 9 de 11 campos provienen de EE. Es vocabulario ontológico compartido.
- State y Change son formas diferentes del mismo conocimiento (punto vs. intervalo), pero no hay cambio de lenguaje.
- Changes solos son insuficientes para Learning (no puede distinguir "sin cambios" de "sin datos").
- Learning necesita el vocabulario de EE con o sin Changes.
- El acoplamiento estructural es el mismo con o sin Reflection.
- **No existe boundary contractual entre State y Change.** Los invariantes de Change son heredados de State. No hay independencia contractual.

**Conclusión**: Reflection no protege ningún boundary contractual. State→Change es una transformación mecánica, no una traducción entre dominios.

### 2.6 PR-6F: Evolution Independence Audit

**Hallazgos**:
- δ tiene razones de cambio diferentes a Learning (CCP se cumple), pero todas son de baja frecuencia.
- Los ciclos de cambio pueden diferir, pero la diferencia es manejable dentro del mismo componente.
- **0 consumidores de ChangeSets existen fuera de Learning en el roadmap actual.**
- Goals (el único consumidor futuro en el roadmap) puede obtener diffs a través de Learning.
- Una librería compartida resuelve CRP si aparecen consumidores adicionales.
- δ es un **helper privado**, no un componente reutilizable.

**Conclusión**: Reflection carece de independencia evolutiva suficiente para justificar una capa propia.

### 2.7 Síntesis de la Evidencia

| Auditoría | Hallazgo central | Peso en la decisión |
|-----------|-----------------|---------------------|
| PR-6A | Diseño inicial inválido en 3 puntos | Preliminar |
| PR-6B | Kernel mínimo = zipWith(δ) | Alto |
| PR-6C | Modelo matemático trivial | Alto |
| PR-6D | 10/10 dimensiones no exigen la capa | **Muy alto** |
| PR-6E | No existe boundary contractual | **Muy alto** |
| PR-6F | Sin independencia evolutiva | **Muy alto** |

**La hipótesis arquitectónica inicial fue refutada en todas las dimensiones relevantes.**

---

## 3. Decisión

**Reflection deja de existir como capa arquitectónica del pipeline cognitivo de AITOS.**

Específicamente:

### 3.1 Lo que desaparece

- La capa Reflection como componente arquitectónico con ADR propio, invariantes, feature flag y contratos formales.
- El concepto de "ReflectionObservation" como estructura de salida definida contractualmente.
- El nodo `Reflection` en la cadena lineal del pipeline cognitivo.

### 3.2 Lo que permanece

- **El algoritmo δ** (comparación semántica entre snapshots consecutivos). No se elimina funcionalidad.
- δ permanece como **submódulo interno de Pattern Discovery** (función privada o archivo separado dentro del dominio de Pattern Discovery).
- Pattern Discovery computa `zipWith(δ, W, tail(W))` como primer paso de su procesamiento interno.
- Pattern Discovery recibe `ProjectedState[]` directamente desde Memory (a través del canal de consulta autorizado) — **ambos son diseño futuro**.

### 3.3 Naturaleza de la decisión

Esta decisión **no elimina funcionalidad del sistema**. Elimina únicamente un componente arquitectónico que no demostró ser una capa independiente. Es una simplificación estructural, no una reducción de capacidades.

---

## 4. Consecuencias

### 4.1 Pipeline futuro (post-eliminación)

**Pipeline hipotético original (nunca implementado):**
```
EE → Memory → Reflection → Learning → Goals → Planning
```

**Pipeline futuro vigente:**
```
EE → Memory → Pattern Discovery
```

Donde:
- **EE** (ADR-009): Produce Decision por turno. Congelado. **Es la única capa implementada**.
- **Memory** (ADR-010): Preserva Belief+Decision como snapshot inmutable. **Diseño futuro, sin implementación.**
- **Pattern Discovery** (PR-7, antes "Learning cognitivo"): Consume `ProjectedState[]` desde Memory. Internamente computa `δ` como función de preparación de datos. Descubre patrones. **Diseño futuro, sin implementación.**

> **Nota:** Goals, Planning y Boundary fueron eliminados como capas cognitivas independientes. Goals/Planning eran del mismo tipo ontológico que Action. Sus funciones persisten dentro del Learning operacional existente (ADR-003).

### 4.2 Cambios en ADR-009 (Evidence Engine Architecture)

| Ubicación | Cambio |
|-----------|--------|
| §6 — Anticipatory Fields Pattern | La entrada `(future) reflectionId → Reflection` se elimina de la tabla. El campo anticipatorio `reflectionId` queda como reservado sin consumidor asignado. No se elimina de las entidades de EE (no hay razón para removerlo de código existente). |
| §7 — Criteria for Future Cognitive Layers | La tabla de capas futuras se actualiza. Se elimina la fila "Reflection". Pattern Discovery pasa a ser el sucesor inmediato de Memory. Memory y Pattern Discovery se marcan como diseño futuro. |
| §7 — Descripción de Pattern Discovery | Se actualiza de `learn(reflections, outcomes)` a `learn(memoryWindow, outcomes)` con δ interna. |

**No se modifica ningún invariante I1-EE a I6-EE.** El Architecture Freeze del Evidence Engine no se viola.

### 4.3 Cambios en ADR-010 (Memory Architecture)

| Ubicación | Cambio |
|-----------|--------|
| Tabla de Responsibilities — Primary consumers | Se elimina "Reflection (pattern analysis)", "Learning (pattern extraction)", "Goals (context)". Queda: "Pattern Discovery (futuro)". |
| § — Boundaries | Se actualiza a: "Memory serves future consumers (Pattern Discovery)". |
| § — Lifecycle, Turn N+1 | Se elimina el paso "Reflection.read(window) → MemorySnapshot[]". Queda "PatternDiscovery.read(window)". |
| § — Differentiation from existing SessionMemory, fila Consumer | Se elimina "Reflection, Learning, Goals". Queda: "Pattern Discovery (futuro)". |
| M-13 | El parentético "(Reflection's job)" se actualiza a "(Pattern Discovery's responsibility)". El invariante se mantiene intacto. |

**No se modifica ningún invariante M-1 a M-14.** El Architecture Freeze de Memory no se viola.

### 4.4 Cambios en ONTOLOGY.md

| Ubicación | Cambio |
|-----------|--------|
| §6 — Memory, tabla de diferenciación, fila Consumer | "Reflection, Learning, Goals" → "Pattern Discovery (futuro)". |
| §7 — Futuras entidades | Se elimina la entrada "Reflection". Se actualiza "Learning" → "Pattern Discovery". Memoria y Pattern Discovery se marcan como diseño futuro. |

### 4.5 Cambios en PROJECT_BOARD.md

| Ubicación | Cambio |
|-----------|--------|
| D33-D35 | Las entradas PR-5A, PR-5B, PR-5C permanecen como registro histórico. No se eliminan. |
| Nueva entrada | Se agrega D36: "PR-6A a PR-6G — Reflection Architecture Audits + ADR-011: Reflection eliminada como capa del pipeline futuro. Pipeline futuro: EE → Memory → Pattern Discovery." |

### 4.6 Cambios en CHANGELOG.md

Se agrega entrada para PR-6G con resumen de la eliminación de Reflection.

### 4.7 Cambios en ROADMAP.md

Las referencias al pipeline cognitivo se actualizan. "Memory → Reflection → Learning → Goals → Planning" (nunca implementado) se reemplaza por "Memory → Pattern Discovery" (diseño futuro). Se agrega sección de "Presente vs Futuro" con el pipeline real implementado: EE → Shadow Observer → descarte.

---

## 5. Alternativas Descartadas

### 5.1 Mantener Reflection como capa

**Propuesta**: Conservar Reflection como capa independiente con su ADR, invariantes y contratos formales, implementando estrictamente solo `zipWith(δ)` como transformación única.

**Razón de rechazo**: Las auditorías PR-6D, PR-6E y PR-6F demostraron que:
- No existe boundary contractual entre State y Change (PR-6E).
- No existe independencia evolutiva que justifique una capa (PR-6F).
- 10/10 dimensiones arquitectónicas no exigen la capa (PR-6D).
- Es una función de transformación, no una capa cognitiva.

Mantener Reflection como capa agregaría complejidad sin beneficio arquitectónico demostrable. Viola el principio de minimalidad (Navaja de Occam).

### 5.2 Convertir Reflection en servicio compartido

**Propuesta**: Implementar δ como un servicio independiente (microservicio o librería compartida) disponible para múltiples consumidores (Learning, Analytics, Debugging, etc.).

**Razón de rechazo**: No existen consumidores de ChangeSets fuera de Learning en el roadmap actual (PR-6F). Los consumidores hipotéticos (Analytics, Explainability, Debugging) no están planificados. Un servicio compartido para 0 consumidores reales es sobrediseño. Si en el futuro aparece un segundo consumidor, δ puede extraerse como librería compartida sin necesidad de una capa arquitectónica. Esta decisión es reversible sin costo arquitectónico.

### 5.3 Mantener Reflection como boundary contractual

**Propuesta**: Conservar Reflection no por su funcionalidad (δ) sino como guardián del boundary entre Memory y Learning.

**Razón de rechazo**: PR-6E demostró que no existe boundary contractual entre State y Change. Ambos pertenecen al mismo dominio ontológico (vocabulario cognitivo compartido de EE). La proyección de campos (la única transformación estructural real) pertenece al contrato de salida de Memory, no a Reflection. No hay boundary que proteger.

---

## 6. Estado

**Accepted.**

La eliminación de Reflection es definitiva. No se requiere implementación, código, ni modificación de archivos fuente. Los cambios son exclusivamente documentales y arquitectónicos.

El pipeline futuro de AITOS a partir de esta ADR es:

```
EE (Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision)
    → Memory (preservación de Belief+Decision — DISEÑO FUTURO ⏳)
    → Pattern Discovery (consumo de ProjectedState[], δ interno, pattern discovery — DISEÑO FUTURO ⏳)
```

**Pipeline real implementado actualmente:**
```
EE → Shadow Observer → (output descartado)
```

---

## 7. Related Documents

| Document | Relationship |
|----------|--------------|
| ADR-009 (Evidence Engine Architecture) | Pipeline base. Tabla de capas futuras actualizada. |
| ADR-010 (Memory Architecture) | Capa inmediatamente anterior (diseño futuro). M-13 actualizado. |
| ADR-003 (Learning Domain) | Learning operacional existente. NO es Pattern Discovery. |
| PR-6A a PR-6F (Reflection Architecture Audits) | Evidencia completa que fundamenta esta decisión. |
| PR-11 (Cognitive Reality Alignment) | Auditoría que reveló la separación presente/futuro. |
| `docs/certification/ONTOLOGY.md` | Cadena ontológica actualizada. |

---

*Authority: This ADR documents the elimination of Reflection from the future cognitive pipeline. No code changes are authorized by this ADR. Actualizado en PR-11A: aclaración de alcance (eliminación del diseño futuro), pipeline vigente EE → Pattern Discovery, separación presente/futuro explícita.*
