# PR-8C — Goal Identity Audit

**Estado:** Borrador de auditoría de identidad  
**Fecha:** 2026-07-13  
**Driver:** Determinar si "Goal" constituye un concepto ontológicamente distinto dentro de AITOS, o si es una repetición de conceptos existentes (Intention, Decision, Action, Pattern).

---

## Regla metodológica

Se evalúa la identidad del concepto "Goal" dentro del universo ontológico de AITOS. No se trata de si "Goals" es una palabra útil, sino de si el CONCEPTO que representa es distinto de:

- **Decision**: compromiso cognitivo del sistema ("el sistema decide que readiness = partial")
- **Pattern**: regularidad observada ("cuando readiness cae, missingInfo crece")
- **Action**: operación ejecutable ("enviar mensaje al usuario")
- **Intention**: estado mental/declarativo ("el sistema intenta clarificar")

Si Goal no es ontológicamente distinto de estos conceptos, no puede justificar una capa arquitectónica.

---

## 1. Mapa de conceptos cognitivos existentes

### 1.1 Ontología actual de AITOS

| Concepto | Capa | Naturaleza | Ejemplo |
|----------|------|-----------|---------|
| **Signal** | EE | Evento crudo temporal | "Mensaje recibido a las 14:30" |
| **Observation** | EE | Validación temporal | "Mensaje validado en t=14:31" |
| **Fact** | EE | Proposición atómica | "El mensaje tiene contenido" |
| **Evidence** | EE | Agregación | "Evidence del turno 5 con 4 facts" |
| **Knowledge** | EE | Hecho consolidado | "Canal = whatsapp, contenido presente" |
| **Belief** | EE | Hecho epistémico | "El sistema cree que el mensaje es válido" |
| **Decision** | EE | Hecho cognitivo | "El sistema decide que readiness = partial" |
| **Snapshot** | Memory | Hecho preservado | "Snapshot completo del turno 5" |
| **Pattern** | Learning | Regularidad de 2° orden | "⟨P, θ, E⟩ — cuando readiness cae, missingInfo crece" |
| **Goal (propuesto)** | Goals | Intención/Com promiso | "Comprometerse a clarificar origen" |
| **Action (futuro)** | Planning | Operación | "Enviar: '¿Cuál es tu origen?'" |

### 1.2 Hipótesis de identidad

> **H₀: "Goal" es un sinónimo de "Intention" o "Action de alto nivel" y no constituye un concepto ontológicamente distinto.**

---

## 2. Goal vs Decision

### 2.1 Definiciones

| Concepto | Definición en AITOS |
|----------|---------------------|
| **Decision** | Compromiso cognitivo del sistema sobre el estado ACTUAL. "El sistema decide que readiness = partial." |
| **Goal (propuesto)** | Compromiso del sistema sobre un estado FUTURO deseado. "El sistema se compromete a clarificar origen." |

### 2.2 ¿Son diferentes?

| Dimensión | Decision | Goal |
|-----------|----------|------|
| Temporalidad | Presente (estado actual) | Futuro (estado deseado) |
| Modalidad | Epistémico-cognitivo ("decide que...") | Intencional ("se compromete a...") |
| Verificabilidad | Verificable ahora (¿el estado es X?) | Verificable después (¿se logró Y?) |
| Sujeto | El sistema como conocedor | El sistema como agente |

### 2.3 Análisis

Decision y Goal SÍ son ontológicamente diferentes:
- Decision describe el estado COGNITIVO actual.
- Goal describe un estado INTENCIONAL futuro.

**Diferencia real.** Una capa de Decision (en el EE) no reemplaza a Goals. Pero esta diferencia no salva a Goals — la pregunta es si Planning puede generar intenciones sin una capa separada.

### 2.4 Veredicto parcial

❌ **Goal ≠ Decision.** Son conceptos diferentes. Pero esto no justifica una capa — solo significa que Decision no puede reemplazar a Goals. El reemplazo candidato sigue siendo Planning.

---

## 3. Goal vs Pattern

### 3.1 Definiciones

| Concepto | Definición |
|----------|-----------|
| **Pattern** | Regularidad observada en el pasado. DESCRIPTIVO. "Cuando readiness cae, missingInfo crece." |
| **Goal** | Intención sobre el futuro. PRESCRIPTIVO. "Clarificar origen." |

### 3.2 ¿Son diferentes?

| Dimensión | Pattern | Goal |
|-----------|---------|------|
| Temporalidad | Pasado (observado en W) | Futuro (deseado) |
| Modalidad | Descriptivo ("cuando X, Y") | Prescriptivo ("hacer Z") |
| Verdad | Verdadero/falso según W | Alcanzado/no alcanzado según resultado |
| Dependencia | Depende solo de datos históricos | Depende de decisión presente |

### 3.3 Análisis

Pattern y Goal son ontológicamente DIFERENTES. Un Pattern es un hecho sobre datos pasados. Un Goal es una intención sobre el futuro.

**Pero esto ya lo sabíamos.** La relación entre Pattern y Goal es: Pattern → (inspira/justifica) → Goal. No son el mismo concepto, pero el Goal se DERIVA del Pattern mediante reglas.

### 3.4 Veredicto parcial

❌ **Goal ≠ Pattern.** Son conceptos diferentes. Pero la derivación Pattern→Goal es mecánica (reglas), no ontológica.

---

## 4. Goal vs Action (Planning)

### 4.1 Definiciones

| Concepto | Definición |
|----------|-----------|
| **Goal** | Intención de alto nivel. "Clarificar origen del viaje." |
| **Action** | Operación concreta. "Enviar mensaje: '¿Cuál es tu origen?'" |

### 4.2 ¿Son el mismo concepto a diferente nivel de abstracción?

| Dimensión | Goal | Action |
|-----------|------|--------|
| Abstracción | Alta ("qué lograr") | Baja ("cómo lograrlo") |
| Especificidad | General (no especifica el mensaje exacto) | Específica (define el mensaje) |
| Relación | 1 Goal → N Actions | N Actions → 1 Goal |
| Lenguaje | Intencional | Operacional |

### 4.3 Análisis de identidad ontológica

Goal y Action difieren en ABSTRACTIÓN, no en TIPO ONTOLÓGICO. Ambos son PRESCRIPTIVOS:

- Goal: "El sistema DEBE lograr X."
- Action: "El sistema DEBE ejecutar Y."

Ambos pertenecen a la categoría de "normas/instrucciones para el sistema." La diferencia es de granularidad.

**Analogía:**
- Observation y Fact son ontológicamente diferentes (validación ≠ proposición).
- Goal y Action NO son ontológicamente diferentes (ambos son prescripciones).

**Esto es el mismo problema que causó la eliminación de Reflection:**
- Reflection producía "Change" que era ontológicamente similar a "State" (ambos son observaciones).
- Goals produciría "Goal" que es ontológicamente similar a "Action" (ambos son prescripciones).

### 4.4 Veredicto parcial

⚠️ **Goal ⪅ Action.** Goal y Action son el mismo tipo ontológico (prescriptivo) diferenciado solo por nivel de abstracción. Esto no justifica capas separadas.

---

## 5. Goal vs Intention

### 5.1 ¿Qué es una Intention?

Una Intention es un concepto de la filosofía de la acción (Bratman, 1987). Se caracteriza por:

1. **Ser un estado mental** que causa acción.
2. **Tener contenido** (intención DE hacer algo).
3. **Ser parcialmente ejecutable** (no siempre se logra).
4. **Ser estable** (persiste hasta cumplirse o abandonarse).

### 5.2 ¿Goal = Intention?

En el contexto de AITOS, "Goal" se define como "compromiso con un resultado específico." Esto es equivalente a "Intention":

| Propiedad de Intention | ¿Goal la tiene? |
|-----------------------|:---------------:|
| Estado mental (del sistema) | ✅ Sí |
| Contenido proposicional | ✅ Sí ("clarificar origen") |
| Parcialmente ejecutable | ✅ Sí (puede no lograrse) |
| Estabilidad temporal | ⚠️ Por definir (¿persiste entre turnos?) |

### 5.3 Conclusión

Goal ES una Intention. No hay diferencia ontológica entre ambos conceptos. "Goal" es el nombre que AITOS le da al concepto filosófico de "Intention."

**Pero esto no ayuda.** Intention sigue siendo prescriptivo, y por lo tanto pertenece al mismo tipo ontológico que Action.

---

## 6. Mapa de relaciones ontológicas

### 6.1 El espacio ontológico completo

```
DESCRIPTIVO (lo que ES/ERA):
├── Signal          (evento crudo)
├── Observation     (evento validado)
├── Fact            (proposición)
├── Evidence        (agregación)
├── Knowledge       (consolidación)
├── Belief          (creencia)
├── Decision        (hecho cognitivo)
├── Snapshot        (preservación)
└── Pattern         (regularidad)  ← DESCRIPTIVO-SEGUNDO ORDEN

PRESCRIPTIVO (lo que DEBE SER/HACERSE):
├── Goal            (intención)    ← ¿?
└── Action          (operación)    ← Planning
```

### 6.2 ¿Dónde está el boundary?

El boundary ontológico REAL está entre:
- **Descriptivo** (EE + Memory + Learning): describen lo que ES, ERA o TIENDE A SER.
- **Prescriptivo** (Planning): determina lo que DEBE HACERSE.

Goals se encuentra DENTRO del lado prescriptivo, junto con Planning. No hay un boundary ontológico entre Goals y Planning — solo hay una diferencia de abstracción.

### 6.3 Implicancia arquitectónica

Si Goal y Action son del mismo tipo ontológico:
1. No necesitan capas separadas.
2. Planning puede contener AMBOS (Goals como intenciones internas, Actions como salida).
3. La separación Goal/Action es una descomposición FUNCIONAL (no ontológica) y debe tratarse como submódulos de Planning, no como capas.

---

## 7. Comparación con Reflection (PR-6E)

### 7.1 PR-6E: Identity con Reflection

PR-6E analizó la identidad de Reflection y concluyó:

> "Change y State pertenecen a la misma categoría ontológica (observación). No hay boundary real."

**Traducción:** State describe un snapshot. Change describe la diferencia entre dos snapshots. Ambos son DESCRIPTIVOS. Misma categoría → misma capa (o absorción).

### 7.2 Aplicación a Goals

Goal y Action pertenecen a la misma categoría ontológica (prescripción). No hay boundary real.

**Conclusión de PR-6E, aplicada a Goals:**

> "Si dos entidades pertenecen a la misma categoría ontológica y no existe una transformación de orden entre ellas, entonces no deben vivir en capas separadas."

### 7.3 Tabla de identidad

| Dimensión | State vs Change (PR-6E) | Goal vs Action (PR-8C) |
|-----------|------------------------|------------------------|
| Categoría ontológica | Descriptivo | Prescriptivo |
| ¿Misma categoría? | ✅ SÍ | ✅ SÍ |
| ¿Diferencia real? | Nivel de agregación | Nivel de abstracción |
| ¿Boundary real? | ❌ No | ❌ No |
| ¿Capas separadas? | ❌ No (Reflection eliminado) | ❌ No (Goals debe eliminarse) |

---

## 8. Veredicto

### 8.1 Síntesis

| Relación | ¿Conceptos diferentes? | ¿Justifica capa separada? |
|----------|:---------------------:|:-------------------------:|
| Goal ≠ Decision | ✅ Diferentes | ❌ No (Planning puede tener intenciones) |
| Goal ≠ Pattern | ✅ Diferentes | ❌ No (Pattern→Goal es derivación mecánica) |
| Goal ⪅ Action | ❌ Mismo tipo ontológico | ❌ No (misma categoría prescriptiva) |
| Goal = Intention | ✅ Equivalentes | ❌ No (Intention no requiere capa propia) |

### 8.2 Veredicto

> **Goal NO es un concepto ontológicamente distinto dentro de AITOS.** Es una Intention, que pertenece a la misma categoría ontológica que Action (prescriptivo). No existe un boundary ontológico entre Goal y Action que justifique capas separadas.

**La identidad de Goal está contenida en la identidad de Planning.**

### 8.3 Confirmación

PR-8A concluyó: **D — Goals debe eliminarse.**
PR-8B concluyó: **Goals no tiene modelo matemático no trivial.**
PR-8C concluye: **Goal no es un concepto ontológicamente distinto de Action/Intention.**

**Tres auditorías independientes convergen en el mismo veredicto: Goals no debe existir como capa independiente.**

---

*Este documento es resultado de la auditoría de identidad PR-8C. Aplica la misma metodología que PR-6E (Reflection Identity) y PR-7E (Learning Identity). No contiene código, no propone implementaciones.*
