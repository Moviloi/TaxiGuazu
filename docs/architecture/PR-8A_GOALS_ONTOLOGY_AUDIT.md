# PR-8A — Goals Ontology Audit

**Estado:** Borrador de auditoría ontológica  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Goals constituye una capa arquitectónica independiente o si puede eliminarse.

---

## Regla metodológica

Esta auditoría aplica la **misma metodología que eliminó Reflection (PR-6) y evaluó Learning (PR-7)**:

1. **Goals es culpable hasta demostrar lo contrario.** No se asume que existe. Se asume que NO DEBE existir.
2. Cada afirmación sobre Goals debe poder refutarse formalmente.
3. Si Goals puede absorberse en otra capa SIN romper invariantes, debe eliminarse.
4. Si Goals no produce un NUEVO TIPO DE CONOCIMIENTO ontológicamente distinguible, debe eliminarse.
5. No se aceptan argumentos de conveniencia, tradición, intuición, ni "es común hacerlo así."

**Lo que NO está en discusión:** Las responsabilidades R10 (relevancia), R11 parcial (redundancia funcional), R12 parcial (categorización interpretativa) existen y deben ejecutarse en algún lado. La pregunta es si justifican una CAPA independiente o pueden absorberse.

---

## Tabla de contenidos

1. [Definición de la hipótesis nula](#1-definición-de-la-hipótesis-nula)
2. [¿Qué produciría Goals? — Ontología del Commitment](#2-qué-produciría-goals)
3. [Criterio 1: ¿Nuevo tipo de conocimiento?](#3-criterio-1-nuevo-tipo-de-conocimiento)
4. [Criterio 2: ¿Nuevo lenguaje ontológico?](#4-criterio-2-nuevo-lenguaje-ontológico)
5. [Criterio 3: ¿Boundary contractual real?](#5-criterio-3-boundary-contractual-real)
6. [Criterio 4: ¿Ciclo evolutivo independiente?](#6-criterio-4-ciclo-evolutivo-independiente)
7. [Criterio 5: ¿Consumidores propios?](#7-criterio-5-consumidores-propios)
8. [Criterio 6: ¿Invariantes propios no derivables?](#8-criterio-6-invariantes-propios)
9. [Criterio 7: ¿Transformación ontológica o solo reorganización?](#9-criterio-7-transformación-ontológica)
10. [Intento de absorción en Learning](#10-intento-de-absorción-en-learning)
11. [Intento de absorción en Planning](#11-intento-de-absorción-en-planning)
12. [Análisis del Commitment como concepto](#12-análisis-del-commitment)
13. [Comparación con Reflection](#13-comparación-con-reflection)
14. [Veredicto](#14-veredicto)

---

## 1. Definición de la hipótesis nula

### 1.1 Lo que se ha dicho sobre Goals

De los documentos existentes:

| Fuente | Definición de Goals |
|--------|-------------------|
| Architecture Milestone v3.0 | `[COMMIT]` — a qué se compromete el sistema |
| Architecture Milestone v3.0 | Learning produce Patterns. Goals consume Patterns. Goals produce Commitment. Planning consume Commitment. |
| Architecture Milestone v3.0 | Goals NO consume Memory directamente. |
| ONTOLOGY.md | "Compromiso con un resultado específico basado en patrones cognitivos" |
| PR-7F/R-7G | Responsibilities: R10 (relevance filtering), R11 (functional dedup), R12 (interpretive categorization) |

### 1.2 Definición tentativa (para poder refutarla)

Si Goals existiera como capa, su forma más general sería:

```
G: 𝒫(𝒞) × S_current → 𝒢
```

Donde:
- **Input**: M = {c₁, ..., cₖ} (conjunto de Patterns desde Learning) + estado cognitivo actual (último Decision snapshot)
- **Output**: G = {g₁, ..., gₘ} (conjunto de Goals/Commitments)
- **Función**: Filtrar Patterns por relevancia, deduplicar funcionalmente, categorizar interpretativamente, y producir compromisos

Cada Goal `g ∈ 𝒢` tendría la forma tentativa:

```
g = ⟨intention, priority, rationale⟩
```

- **intention**: descripción del estado deseado (ej. "clarificar origen", "confirmar reserva")
- **priority**: importancia relativa (alta/media/baja)
- **rationale**: Pattern(s) que justifican este Goal

### 1.3 Hipótesis nula enunciada formalmente

> **H₀: Goals no constituye una capa arquitectónica independiente.**
> 
> Todo lo que Goals haría puede ser absorbido por Planning sin violar invariantes arquitectónicos. Goals representa una descomposición funcional (no ontológica) del proceso de decisión. Sus responsabilidades son filtros y transformaciones de datos, no producción de un nuevo tipo de conocimiento.

---

## 2. ¿Qué produciría Goals?

### 2.1 Ontología del Commitment

Para evaluar si Goals produce nuevo conocimiento, primero debemos definir qué es un "Commitment" (la salida propuesta de Goals).

Un Commitment ontológicamente es:

> Una **declaración de intención** que vincula al sistema con un resultado específico.

Ejemplos:
- "El sistema se compromete a clarificar el origen del viaje."
- "El sistema se compromete a confirmar los datos de la reserva."
- "El sistema se compromete a solicitar la información faltante."

### 2.2 ¿Es el Commitment un nuevo tipo ontológico?

Comparemos con los tipos existentes:

| Entidad | Tipo ontológico | Ejemplo |
|---------|----------------|---------|
| Signal | Evento crudo | "Mensaje recibido a las 14:30" |
| Observation | Evento validado | "Mensaje validado temporalmente" |
| Fact | Proposición atómica | "El mensaje contiene contenido" |
| Evidence | Agrupación de Facts | "Evidence del turno 5" |
| Knowledge | Hecho consolidado | "Canal = whatsapp, contenido presente" |
| Belief | Hecho epistémico | "El sistema cree que el mensaje es válido" |
| Decision | Hecho cognitivo | "El sistema decide que readiness = partial" |
| Memory | Hecho preservado | "Snapshot del turno 5" |
| **Pattern** | Regularidad de segundo orden | "Cuando readiness cae, missingInfo crece (θ=0.85)" |
| **Commitment** | Intención | "El sistema se compromete a clarificar origen" |
| Action (Planning) | Operación | "Enviar mensaje: '¿Cuál es tu origen?'" |

### 2.3 Pregunta ontológica central

**¿Es "Commitment" un tipo diferente de "Action"?**

Argumento de que SÍ son diferentes:

| Dimensión | Commitment (Goal) | Action (Planning) |
|-----------|------------------|-------------------|
| Modalidad | Intencional ("se compromete a") | Operacional ("ejecuta") |
| Nivel de abstracción | Alto ("clarificar origen") | Bajo ("enviar mensaje X") |
| Verificabilidad | Se verifica por cumplimiento | Se verifica por ejecución |
| Temporalidad | Puede persistir entre turnos | Se ejecuta y desaparece |
| Granularidad | Atómico desde la perspectiva del qué | Compuesto desde la perspectiva del cómo |

Argumento de que NO son diferentes:

| Dimensón | Análisis |
|-----------|----------|
| Modalidad | Ambos son PRESCRIPTIVOS. "Comprometerse a X" y "Hacer X" difieren en grado, no en tipo. Ambos pertenecen a la categoría de "lo que el sistema debe hacer." |
| Nivel de abstracción | La abstracción es una propiedad del diseño, no ontológica. "Clarificar origen" y "Preguntar origen" describen la misma intención a diferentes niveles de detalle. |
| Verificabilidad | Ambos son verificables por observación del output del sistema. |
| Relación | Todo Commitment se traduce en una o más Actions. No existe Commitment sin manifestación operacional. |

### 2.4 Conclusión parcial

**Commitment y Action pertenecen a la misma categoría ontológica: conocimiento prescriptivo.**

Esta es la misma situación que llevó a la eliminación de Reflection:
- Reflection producía "Change" que era ontológicamente idéntico a "diferencia entre dos State" — misma categoría que sus predecesores.
- Goals produce "Commitment" que es ontológicamente idéntico a "Action de alto nivel" — misma categoría que Planning.

---

## 3. Criterio 1: ¿Nuevo tipo de conocimiento?

### 3.1 Los 5 criterios de PR-7A

En PR-7A se establecieron 5 criterios para determinar si una capa produce nuevo conocimiento. Apliquémoslos a Goals:

| # | Criterio | ¿Goals lo cumple? | Justificación |
|---|----------|:-----------------:|---------------|
| 1 | ¿Produce un tipo de conocimiento que no existe en capas anteriores? | ❌ **NO** | Los Commiments son prescriptivos. Planning también produce prescriptivos (Actions). Misma categoría ontológica. |
| 2 | ¿Su input y output pertenecen a dominios ontológicos diferentes? | ⚠️ **PARCIAL** | Input: Patterns (descriptivo-segundo orden). Output: Commitments (prescriptivo). Hay cambio de dominio. PERO Planning también cambia de dominio (descriptivo → prescriptivo). |
| 3 | ¿Requiere un lenguaje propio no compartido con otras capas? | ❌ **NO** | Comparte el vocabulario prescriptivo con Planning. |
| 4 | ¿Su eliminación rompe la cadena de transformación cognitiva? | ❌ **NO** | Planning puede consumir Patterns directamente. |
| 5 | ¿Tiene consumidores fuera de la siguiente capa? | ❌ **NO** | Solo Planning. |

**Resultado: Goals pasa 0/5 criterios.** Para referencia, Learning pasó 5/5. Reflection pasó 0/5.

### 3.2 Análisis detallado del criterio 1

El criterio más importante: **¿produce nuevo conocimiento?**

Learning produce conocimiento de segundo orden (regularidades sobre datos). Memory produce conocimiento preservado (snapshots). EE produce conocimiento de primer orden (hechos, creencias, decisiones). CADA UNO produce un tipo ontológicamente distinto.

Goals produciría Commitments. Pero Planning también produce prescripciones (acciones). La diferencia entre "comprometerse a clarificar" y "preguntar el origen" es de **abstracción**, no de **tipo ontológico**.

**Refutación formal:**

Si G = "comprometerse a X" y P = "hacer Y", donde Y es la manifestación operacional de X, entonces:
- G y P pertenecen al mismo género próximo: conocimiento prescriptivo.
- Su diferencia específica (nivel de abstracción) no constituye una diferencia de tipo.
- Por transitividad: si todo Commitment se traduce a una o más Actions, entonces la categoría de Commitment está contenida en la categoría de Action.

**Analogía:** En el EE, Observation y Fact son ontológicamente diferentes (validación temporal ≠ proposición atómica). Pero Commitment y Action no lo son (intención ≠ ejecución, pero ambas son prescripciones).

---

## 4. Criterio 2: ¿Nuevo lenguaje ontológico?

### 4.1 Lenguaje actual del pipeline

Cada capa introduce vocabulario específico:

| Capa | Conceptos | Lenguaje |
|------|-----------|----------|
| Signal | messageId, receivedAt, raw | Temporal, raw |
| Observation | validatedAt, status | Temporal-validación |
| Fact | type, value, field | Proposicional |
| Evidence | type, provenance | Agregación |
| Knowledge | observationStatus, channel | Consolidación |
| Belief | observationValid, isWellFormed | Epistémico |
| Decision | validInput, readiness, missingInfo | Cognitivo-decisional |
| Memory | snapshot, turnNumber, conversationId | Preservación |
| Learning | pattern, P, θ, E, τ | Regularidad |
| **¿Goals?** | **commitment, intention, priority, rationale** | **Intencional** |
| Planning | action, response, message | Operacional |

### 4.2 ¿Es "intencional" un lenguaje diferente de "operacional"?

El lenguaje intencional ("comprometerse a", "priorizar", "justificar") es semánticamente diferente del lenguaje operacional ("enviar mensaje", "ejecutar acción").

Sin embargo:
- El lenguaje intencional es un **subconjunto** del lenguaje prescriptivo general.
- Planning también usa lenguaje prescriptivo ("decidir qué hacer").
- Ambos pertenecen al dominio de "lo que el sistema debe hacer."

**Comparación con la eliminación de Reflection:**
Reflection usaba lenguaje de "Change" (transition, trend, recurrence), que era un subconjunto del lenguaje de Learning. Esto fue una de las razones de su eliminación (PR-6E: "mismo vocabulario ontológico").

Goals usaría lenguaje intencional, que es un subconjunto del lenguaje prescriptivo de Planning. **Misma situación que Reflection.**

---

## 5. Criterio 3: ¿Boundary contractual real?

### 5.1 La frontera Learning → Goals

PR-7D ya definió un contrato Learning → Goals. Pero este contrato asume que Goals existe. Preguntémonos: ¿la frontera es REAL o es ARBITRARIA?

| Característica de un boundary real | Learning → Goals |
|-----------------------------------|------------------|
| El productor no sabe cómo el consumidor usará el output | Learning no sabe qué Goals hará con M |
| El consumidor no necesita saber cómo el productor produce el output | Goals no necesita saber cómo Learning detecta patrones |
| Ambos pueden evolucionar independientemente | Learning puede agregar nuevos detectores; Goals puede cambiar criterios |
| Hay un contrato explícito | PR-7D lo definió |
| El contrato tiene causas de rechazo | Sí (θ fuera de rango, P mal formado) |

Esta frontera PARECE real. Pero preguntémonos: ¿es la misma frontera que existiría entre Learning y Planning si Goals no existiera?

**Si Goals es eliminado y absorbido por Planning:**
- Learning → Planning: Learning produce M, Planning consume M.
- Planning no necesita saber cómo Learning produce M.
- Learning no necesita saber cómo Planning usa M.
- Misma frontera, mismos contratos, mismo desacoplamiento.

**Conclusión:** La frontera ontológica REAL está entre "producción de patrones" (Learning) y "consumo de patrones para decidir" (Planeación). Goals se inserta artificialmente en el medio del consumo.

### 5.2 La frontera Goals → Planning

Esta frontera es DÉBIL porque:
- Planning es el ÚNICO consumidor de Goals.
- No hay otros consumidores que justifiquen un contrato separado.
- La separación entre "commitment" y "action" es arbitraria: depende de dónde se dibuje la línea entre intención y ejecución.

**Refutación:** Si Planning puede consumir Patterns directamente, la frontera Goals → Planning desaparece, y la frontera Learning → Planning es suficiente.

---

## 6. Criterio 4: ¿Ciclo evolutivo independiente?

### 6.1 ¿Puede Goals evolucionar sin que Planning cambie?

| Cambio en Goals | ¿Afecta a Planning? | Ejemplo |
|----------------|:-------------------:|---------|
| Nuevos criterios de relevancia | ✅ SÍ | Planning recibe diferentes patrones |
| Nueva taxonomía interpretativa | ✅ SÍ | Planning interpreta diferente los patrones |
| Nuevos tipos de commitment | ✅ SÍ | Planning debe saber ejecutar nuevos commitments |
| Cambio en prioridades | ✅ SÍ | Planning debe reordenar acciones |

**Hallazgo:** TODO cambio en Goals afecta a Planning porque Planning consume el output de Goals. No hay evolución independiente.

### 6.2 ¿Puede Planning evolucionar sin que Goals cambie?

| Cambio en Planning | ¿Afecta a Goals? | Ejemplo |
|-------------------|:----------------:|---------|
| Nuevo tipo de respuesta | ❌ NO (si el commitment es el mismo) | "Clarificar origen" expresado de otra forma |
| Nueva optimización de ejecución | ❌ NO | Misma intención, implementación diferente |
| Nuevo canal de salida | ❌ NO | Misma intención, canal diferente |

**Hallazgo:** Planning PUEDE evolucionar independientemente de Goals, pero Goals NO puede evolucionar sin afectar a Planning. Esto indica una **dependencia unidireccional asimétrica**: Planning depende de Goals, pero Goals no tiene autonomía real.

**Comparación con Reflection:**
Reflection dependía de Memory (su input) y Learning (su consumidor). No podía evolucionar sin afectar a Learning. Fue eliminado.

Goals depende de Learning (su input) y Planning (su consumidor). No puede evolucionar sin afectar a Planning. **Misma situación que Reflection.**

---

## 7. Criterio 5: ¿Consumidores propios?

### 7.1 Consumidores conocidos

| Consumidor | ¿Consume Goals? | ¿Otro consumidor? |
|-----------|:---------------:|:------------------:|
| Planning | ✅ SÍ (el único) | — |
| Auditoría | ❌ NO | Consume de Learning directamente |
| Operador humano | ❌ NO | Consume de Learning si necesita patterns |
| Otra capa cognitiva | ❌ NO | No existen |

**Hallazgo:** Planning es el ÚNICO consumidor de Goals. Cuando una capa tiene un solo consumidor, debe preguntarse si la capa es necesaria o si ese consumidor puede absorber la funcionalidad.

**Comparación con Reflection:**
Reflection tenía un solo consumidor: Learning. Reflection fue eliminado y su funcionalidad (δ) absorbida como función privada de Learning.

**Refutación:** Goals tiene exactamente la misma estructura de consumidor único que Reflection. Si ese patrón llevó a la eliminación de Reflection, debe llevar a la eliminación de Goals.

### 7.2 Consumidores potenciales

¿Podría Goals tener otros consumidores en el futuro?
- **Meta-learning**: podría analizar commitments históricos para aprender qué compromisos fueron efectivos.
- **Auditoría cognitiva**: podría rastrear qué commitments se generaron y por qué.

Pero estos son consumidores FUTUROS e HIPOTÉTICOS. La eliminación de Reflection también consideró consumidores futuros y los consideró insuficientes (PR-6F §3). Siguiendo el mismo criterio, los consumidores futuros de Goals no justifican la capa.

---

## 8. Criterio 6: ¿Invariantes propios?

### 8.1 Posibles invariantes de Goals

Si Goals existiera, podría tener invariantes como:

| # | Invariante propuesto | ¿Es propio de Goals? | ¿O derivable? |
|---|---------------------|:--------------------:|:-------------:|
| G-1 | Todo commitment debe estar basado en al menos un Pattern | ❌ Derivado de "Goals consume Patterns" | Es una restricción de input, no un invariante de comportamiento |
| G-2 | Los commitments no pueden ser contradictorios | ⚠️ PARCIAL | Aplicaría a cualquier capa que tome decisiones |
| G-3 | Los commitments son por turno (se re-evalúan cada ciclo) | ⚠️ PARCIAL | También aplicaría a Planning |
| G-4 | Los commitments tienen prioridad explícita | ❌ Derivable | Es una propiedad del formato de output, no un invariante |
| G-5 | Un commitment debe ser alcanzable (posible de ejecutar) | ❌ Derivado | Planning determina la alcanzabilidad |

**Hallazgo:** Ningún invariante propuesto para Goals es EXCLUSIVO de Goals. Todos son o bien:
- Derivados de la relación con otras capas (G-1, G-5)
- Aplicables a múltiples capas (G-2, G-3)
- Propiedades del formato de datos (G-4)

**Comparación con Memory:**
Memory tiene 14 invariantes propios (M-1 a M-14), todos exclusivos de su rol de preservación. Ninguno es derivable de otros invariantes. Esto justificó Memory como capa independiente.

Goals no tiene invariantes propios. Esto es análogo a Reflection, que tampoco tenía invariantes exclusivos.

---

## 9. Criterio 7: ¿Transformación ontológica o solo reorganización?

### 9.1 ¿Qué transformación realiza Goals?

La función propuesta de Goals:

```
G(M, s_current) = {⟨intention, priority, rationale(c_i)⟩ | c_i ∈ M, relevant(c_i, s_current)}
```

Esta función:
1. **Filtra** M por relevancia (R10)
2. **Interpreta** patrones como intenciones (R12)
3. **Prioriza** (nueva responsabilidad)
4. **Justifica** (vincular commitment a pattern)

Las preguntas ontológicas:

**¿Filtrar es una transformación ontológica?** NO. Filtrar es seleccionar un subconjunto. No crea nuevo conocimiento. Es una operación de conjunto.

**¿Interpretar (pattern → intención) es una transformación ontológica?** PARCIAL. "Cuando readiness cae, missingInfo crece" → "Comprometerse a clarificar." Hay un cambio semántico. Pero esta interpretación es una REGLA (pattern X → intention Y), no un descubrimiento. Las reglas pueden vivir en Planning.

**¿Priorizar es una transformación ontológica?** NO. Es una ordenación. No crea nuevo conocimiento.

**¿Justificar es una transformación ontológica?** NO. Es una vinculación. No crea nuevo conocimiento.

### 9.2 Contraste con Learning

Learning realiza una transformación ontológica REAL:
- Input: snapshots (hechos de primer orden)
- Output: patterns (regularidades de segundo orden)
- Cambio de ORDEN LÓGICO: de primer orden a segundo orden.
- Esto es una **compresión abstractiva** (PR-7B §5).

Goals no realiza un cambio de orden lógico:
- Input: patterns (segundo orden, descriptivos)
- Output: commitments (prescriptivos, mismo orden lógico)
- No hay compresión abstractiva. No hay cambio de orden.

**Refutación:** Goals no realiza una transformación ontológica genuina. Sus operaciones son de filtrado, interpretación por reglas, y priorización — todas funciones que pueden vivir en Planning.

---

## 10. Intento de absorción en Learning

### 10.1 Hipótesis: Goals puede absorberse en Learning

**Enunciado:** Learning produce no solo Patterns, sino también Commitments. Goals es un post-processamiento de Learning.

**Argumento a favor:**
- Learning ya conoce los Patterns en detalle.
- Learning podría extender su salida para incluir interpretaciones.
- Esto eliminaría una capa.

**Argumento en contra (absorción en Learning):**
- PR-7G ya determinó que la interpretación (R12 interpretativo) y la relevancia (R10) pertenecen a Goals, no a Learning.
- Mezclaría conocimiento descriptivo (patrones) con prescriptivo (compromisos) en la misma capa.
- Learning no tiene contexto de Planning (qué acciones son posibles).

**Veredicto de absorción en Learning: ❌ NO RECOMENDADA.**

### 10.2 ¿Por qué no funciona?

Learning produce conocimiento **descriptivo** sobre lo que OCURRE. Goals produciría conocimiento **prescriptivo** sobre lo que DEBE HACERSE.

Aunque ya establecimos que Commitment y Action son de la misma categoría (prescriptiva), mezclar descriptivo y prescriptivo en la misma capa SÍ sería una violación ontológica. Learning describiría y prescribiría simultáneamente.

**PERO esto no salva a Goals.** La absorción correcta no es en Learning, sino en **Planning**, que ya es prescriptiva.

---

## 11. Intento de absorción en Planning

### 11.1 Hipótesis: Goals puede absorberse en Planning

**Enunciado:** Planning recibe Patterns directamente desde Learning, aplica los filtros R10/R11/R12 internamente, y produce Actions directamente.

```
Pipeline actual:     Learning → Goals → Planning
Pipeline propuesto:  Learning → Planning
```

**Lo que Planning absorbería:**

| Responsabilidad | Origen | Naturaleza |
|----------------|--------|-----------|
| Filtro por relevancia (R10) | PR-7G → Goals | Función sobre Patterns |
| Dedup funcional (R11 partial) | PR-7G → Goals | Función sobre Patterns |
| Categorización interpretativa (R12 partial) | PR-7G → Goals | Función sobre Patterns |
| Priorización | Nueva | Función sobre intenciones |
| Generación de commitments | Nueva | Transformación Pattern → Intention |
| Justificación | Nueva | Vinculación Intention → Pattern |

**Planning resultante:**

```
P: 𝒫(𝒞) × S_current → 𝒜
```

Donde `𝒜` es el espacio de acciones del sistema.

Planning internamente:
1. Recibe M (Patterns) desde Learning
2. Recibe s_current (último snapshot cognitivo) desde Memory
3. Filtra M por relevancia (usando s_current como contexto)
4. Deduplica funcionalmente
5. Interpreta patrones como intenciones
6. Prioriza intenciones
7. Genera acciones (respuestas del sistema)

### 11.2 Argumentos a favor de la absorción

1. **Coherencia ontológica**: Planning ya es prescriptiva (decide qué hacer). Absorber la generación de intenciones mantiene coherencia.

2. **Simplificación del pipeline**: 4 capas en lugar de 5. Menos interfaces, menos contratos, menos mantenimiento.

3. **Planificación con contexto completo**: Planning tiene acceso directo a Patterns + estado actual, sin intermediarios que filtren información potencialmente relevante.

4. **Evolución más simple**: Un cambio en cómo se interpretan los Patterns afecta solo a Planning, no a un contrato entre capas.

5. **Precedente**: Absorption de δ en Learning (PR-6 eliminó Reflection, δ pasó a ser función privada de Learning). Misma situación: una función intermedia (Reflection δ, Goals interpretación) se absorbe en la capa consumidora.

### 11.3 Argumentos en contra de la absorción

1. **Complejidad de Planning**: Planning sería más compleja (más responsabilidades). Pero esto es complejidad COHESIVA (decisiones sobre qué hacer), no complejidad ACCIDENTAL.

2. **Pérdida del lenguaje intencional**: Si Planning solo produce Actions, perdemos la capacidad de razonar sobre intenciones explícitamente. Respuesta: las intenciones pueden ser un estado interno de Planning, no necesitan una capa separada.

3. **Acoplamiento Learning → Planning**: Planning necesitaría conocer la estructura de Patterns. Respuesta: PR-7D ya definió el contrato Learning → Goals. Ese mismo contrato sirve para Learning → Planning.

### 11.4 ¿Se rompe alguna invariante existente?

| Invariante | ¿Se viola? | Análisis |
|-----------|:---------:|----------|
| Cadena lineal (EE → Memory → Learning → Goals → Planning) | ✅ **SÍ** | Se elimina Goals. La cadena pasa a ser EE → Memory → Learning → Planning. |
| Learning produce Patterns, Goals consume Patterns | ❌ **NO** | Planning consume Patterns. Mismo contrato. |
| Goals produce Commitment, Planning consume Commitment | ❌ **NO** | Planning produce Commitment internamente (como estado intermedio) y lo consume. |

**La única invariante que se rompe es la existencia de Goals en el pipeline.** Pero esta no es una invariante arquitectónica — es una decisión de diseño pendiente. Ninguna invariante congelada (I1-EE a I6-EE, M-1 a M-14) se viola.

### 11.5 Veredicto del intento de absorción

**✅ ABSORCIÓN POSIBLE.** Planning puede absorber las responsabilidades de Goals sin violar invariantes existentes. La complejidad resultante en Planning es cohesiva (decisiones sobre qué hacer).

---

## 12. Análisis del Commitment como concepto

### 12.1 ¿Es el Commitment ontológicamente necesario?

Un Commitment es una **declaración explícita de intención**. La pregunta es: ¿necesita el sistema representar intenciones explícitamente, o puede generarlas implícitamente al seleccionar acciones?

**Modelo con commitments explícitos:**
```
Pattern → Commitment → Action(s)
```
Cada Commitment es una entidad observable y trazable.

**Modelo sin commitments explícitos:**
```
Pattern → Action(s)
```
Las intenciones están implícitas en la relación Pattern→Action.

### 12.2 Argumento a favor de commitments explícitos

Los commitments explícitos permiten:
- **Trazabilidad**: "¿Por qué hiciste X?" → "Porque me comprometí a Y basado en el patrón Z."
- **Verificación**: "¿Cumplimos el compromiso?" → evaluable independientemente.
- **Coordinación**: Múltiples commitments pueden priorizarse.
- **Meta-aprendizaje**: "¿Qué commitments fueron efectivos?"

### 12.3 Contraargumento

- **Trazabilidad**: puede lograrse registrando la relación Pattern→Action sin una capa intermedia.
- **Verificación**: puede hacerse retrospectivamente, no necesita una capa en tiempo real.
- **Coordinación**: puede ser una función interna de Planning.
- **Meta-aprendizaje**: es una capacidad FUTURA. No justifica una capa HOY. (Mismo argumento usado contra Reflection.)

---

## 13. Comparación con Reflection

### 13.1 Tabla comparativa

| Dimensión | Reflection (eliminado) | Goals (bajo auditoría) |
|-----------|----------------------|------------------------|
| Kernel matemático | δ = zipWith(sᵢ, s_{i+1}) | G(M, s) = {⟨intention, prio, rationale⟩} |
| ¿Nuevo tipo de conocimiento? | ❌ No (mismo que Learning) | ❌ No (mismo que Planning: prescriptivo) |
| Lenguaje propio | ❌ No (vocabulario de Learning) | ❌ No (vocabulario prescriptivo compartido) |
| Boundary contractual | ❌ No real (solo filtro) | ⚠️ Learning→Goals parece real, pero Learning→Planning también funciona |
| Ciclo evolutivo independiente | ❌ No (atado a Learning) | ❌ No (todo cambio afecta a Planning) |
| Consumidores | 1 (Learning) | 1 (Planning) |
| Invariantes propios | ❌ No | ❌ No |
| Absorbible sin romper invariantes | ✅ SÍ (en Learning como δ) | ✅ SÍ (en Planning) |
| ¿Eliminado? | ✅ **SÍ** | ⚠️ **EN EVALUACIÓN** |

### 13.2 Paralelismo exacto

Reflection fue eliminado porque:
1. No producía nuevo tipo de conocimiento → ❌
2. Tenía un solo consumidor → ❌
3. Podía absorberse sin romper invariantes → ✅
4. Su kernel era una función, no una capa → ❌

Goals está en la misma situación:
1. No produce nuevo tipo de conocimiento → ❌
2. Tiene un solo consumidor → ❌
3. Puede absorberse sin romper invariantes → ✅
4. Su kernel sería filtrado + interpretación, no una capa → ❌

**Conclusión:** Si aplicamos el mismo nivel de exigencia que eliminó a Reflection, Goals debería eliminarse.

---

## 14. Veredicto

### 14.1 Síntesis de hallazgos

| Hallazgo | Sección | Impacto |
|----------|---------|---------|
| Goals produciría conocimiento prescriptivo — misma categoría que Planning | §2, §3 | ❌ **No hay nuevo tipo de conocimiento** |
| Goals comparte lenguaje ontológico con Planning | §4 | ❌ **No hay lenguaje propio** |
| La frontera Learning→Planning es equivalente a Learning→Goals | §5 | ❌ **Boundary no exclusivo** |
| Goals no puede evolucionar sin afectar a Planning | §6 | ❌ **Sin independencia evolutiva** |
| Planning es el único consumidor de Goals | §7 | ❌ **Consumidor único** |
| Goals no tiene invariantes propios no derivables | §8 | ❌ **Sin invariantes exclusivos** |
| Goals realiza filtrado/interpretación, no transformación ontológica | §9 | ❌ **No hay transformación de orden** |
| Absorción en Learning: ❌ (mezcla descriptivo/prescriptivo) | §10 | ⚠️ Inviable |
| Absorción en Planning: ✅ (cohesión prescriptiva mantenida) | §11 | ✅ **Posible sin violar invariantes** |
| Goals es estructuralmente análogo a Reflection (eliminado) | §13 | ⚠️ **Precedente aplicable** |

### 14.2 Respuesta a las preguntas de la misión

| Pregunta | Respuesta |
|----------|-----------|
| ¿Goals produce un nuevo tipo de conocimiento o solo reorganiza Patterns? | **Solo reorganiza.** No hay cambio de orden lógico. No hay compresión abstractiva. |
| ¿Goals introduce un cambio de lenguaje ontológico? | **No.** Comparte el lenguaje prescriptivo con Planning. |
| ¿Existe un boundary contractual entre Learning y Goals? | **Sí, pero no exclusivo.** Learning→Planning sería equivalente. |
| ¿Goals posee invariantes propios? | **No.** Ningún invariante propuesto es exclusivo de Goals. |
| ¿Tiene ciclo evolutivo independiente? | **No.** Todo cambio en Goals afecta a Planning. |
| ¿Puede absorberse dentro de Learning? | **No recomendado.** Mezcla descriptivo con prescriptivo en la misma capa. |
| ¿Puede absorberse dentro de Planning? | **Sí.** Planning mantiene cohesión prescriptiva. Sin violación de invariantes. |
| ¿Produce información que ningún otro componente puede producir? | **No.** Planning puede producir la misma información internamente. |
| ¿Tiene consumidores propios? | **Solo uno: Planning.** |
| ¿Su eliminación rompe el pipeline cognitivo? | **No.** El pipeline se simplifica a 4 capas. |

### 14.3 Veredicto final

> **Veredicto: D — Goals debe eliminarse.**

**Justificación:**

Goals no supera NINGUNO de los criterios que establecieron a Learning como capa independiente:

- ❌ No produce nuevo tipo de conocimiento (es prescriptivo, como Planning)
- ❌ No tiene lenguaje ontológico propio (comparte con Planning)
- ❌ No tiene boundary exclusivo (Learning→Planning funciona igual)
- ❌ No tiene ciclo evolutivo independiente (todo cambio afecta a Planning)
- ❌ No tiene invariantes propios (ninguno es exclusivo)
- ❌ No tiene transformación ontológica (solo filtra e interpreta)
- ✅ Es absorbible en Planning sin romper invariantes
- ✅ Tiene el MISMO perfil que Reflection (eliminado)

**Recommendación:**

1. **Eliminar Goals como capa independiente del pipeline cognitivo.**
2. **Pipeline simplificado:** EE → Memory → Learning → Planning
3. **Planning absorbe** las responsabilidades R10 (relevancia), R11 parcial (dedup funcional), R12 parcial (categorización interpretativa), y las nuevas (priorización, generación de compromisos, justificación) como submódulos internos.
4. **El contrato Learning→Goals (PR-7D) se actualiza a Learning→Planning**, con los mismos términos.
5. **El Commitment** como concepto se preserva como estado interno de Planning, no como entidad exportada.

---

### 14.4 ¿Qué se pierde si se elimina Goals?

| Aspecto | Antes (con Goals) | Después (sin Goals) | ¿Pérdida real? |
|---------|------------------|-------------------|:--------------:|
| Intenciones explícitas | Capa separada | Submódulo de Planning | ❌ No (sigue existiendo el concepto) |
| Trazabilidad Pattern→Commitment | Explícita en el contrato | Interna a Planning | ❌ No (trazabilidad preservable) |
| Priorización de intenciones | Responsabilidad de Goals | Responsabilidad de Planning | ❌ No (sigue ejecutándose) |
| Verificación de cumplimiento | Posible sobre entidad Commitment | Posible sobre estado interno de Planning | ❌ No (sigue siendo posible) |
| Simplicidad del pipeline | 5 capas | **4 capas** | ✅ **GANANCIA** |

**No hay pérdida arquitectónica real.** Todas las funciones de Goals se preservan dentro de Planning.

---

### 14.5 Condiciones para reconsiderar

Goals podría reconsiderarse como capa independiente solo si en el futuro se demuestra que:

1. Planning tiene MÚLTIPLES consumidores de sus intenciones (no solo ejecución de acciones).
2. El Commitment requiere un ciclo de vida radicalmente diferente al de las Actions.
3. Aparece un consumidor de Goals que NO es Planning (ej. un sistema de meta-aprendizaje separado).
4. Se demuestra que la mezcla de intención+ejecución en Planning causa una violación arquitectónica demostrable.

Ninguna de estas condiciones se cumple actualmente.

---

*Este documento es resultado de la auditoría ontológica PR-8A. Aplica la misma metodología que eliminó Reflection (PR-6) y evaluó Learning (PR-7). No contiene código, no propone implementaciones, no diseña algoritmos. Es una demostración ontológica de que Goals no constituye una capa arquitectónica independiente.*
