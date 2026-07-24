# PR-9A — Planning Ontology Audit

**Estado:** Borrador de auditoría ontológica  
**Fecha:** 2026-07-13  
**Driver:** Determinar si Planning constituye una capa arquitectónica independiente o si debe eliminarse.

---

## Regla metodológica

Mismo rigor que eliminó Reflection (PR-6) y Goals (PR-8):

1. **Planning es culpable hasta demostrar lo contrario.**
2. Cada afirmación debe poder refutarse formalmente.
3. Si Planning puede absorberse sin romper invariantes, debe eliminarse.
4. Si Planning no produce un NUEVO TIPO DE CONOCIMIENTO ontológicamente distinguible, debe eliminarse.
5. No se aceptan argumentos de conveniencia, tradición, ni "toda arquitectura necesita un planificador."

---

## 1. Definición de la hipótesis nula

### 1.1 Lo que se ha dicho sobre Planning

| Fuente | Definición |
|--------|-----------|
| Architecture Milestone v3.0 | `[EXECUTE]` — cómo lo ejecuta el sistema |
| EVIDENCE_ONTOLOGY.md (post-PR-8) | Síntesis de Patterns en intenciones y ejecución de acciones. Incluye filtrado por relevancia, dedup funcional, categorización interpretativa, priorización, y generación de respuesta. |
| PR-8 (absorción de Goals) | Planning recibe Patterns desde Learning, produce Actions. |

### 1.2 Plan propuesto para refutar

**H₀: Planning no constituye una capa arquitectónica independiente.**  
Planning es la interfaz entre el pipeline cognitivo (conocimiento) y el pipeline operacional (acción). Como interfaz, no produce nuevo tipo de conocimiento — solo traduce. Puede ser reemplazada por un contrato entre Learning y el sistema operacional.

---

## 2. ¿Qué produce Planning?

### 2.1 Output propuesto

```
Planning: 𝒫(𝒞) × 𝒮 → 𝒜
```

Donde:
- `𝒫(𝒞)`: Patterns desde Learning
- `𝒮`: estado cognitivo actual (último Decision snapshot)
- `𝒜`: espacio de acciones del sistema (respuestas al usuario, llamadas operacionales, etc.)

### 2.2 Naturaleza ontológica del output

Planning produce **ACCIONES**. Una acción es una instrucción ejecutable: "enviar mensaje X", "llamar a API Y", "cambiar estado Z."

Comparemos con los tipos de conocimiento del pipeline:

| Capa | Output | Naturaleza ontológica | ¿Conocimiento? |
|------|--------|----------------------|:--------------:|
| EE | Signal→Decision | Hechos (1° orden) | ✅ **SÍ** (epistémico) |
| Memory | Snapshot | Hechos preservados | ✅ **SÍ** (histórico) |
| Learning | Pattern | Regularidades (2° orden) | ✅ **SÍ** (descriptivo-segundo orden) |
| **Planning** | **Action** | **Instrucción** | ❌ **NO** (volitivo, no epistémico) |

### 2.3 Hallazgo crítico

**Planning es la única capa del pipeline que NO produce conocimiento.** Produce instrucciones.

Esto no es intrínsecamente malo — la cognición debe terminar en acción. Pero significa que Planning es ontológicamente diferente de todas las demás capas.

La pregunta es: ¿esta diferencia justifica una CAPA COGNITIVA o solo un MECANISMO DE SALIDA?

---

## 3. Criterio 1: ¿Nuevo tipo de conocimiento?

Aplicando los 5 criterios de PR-7A:

| # | Criterio | ¿Planning lo cumple? | Justificación |
|---|----------|:-------------------:|---------------|
| 1 | ¿Produce un tipo de conocimiento que no existe en capas anteriores? | ❌ **NO** | Las acciones no son conocimiento. Son instrucciones. No existe una categoría "conocimiento de acciones" — las acciones se ejecutan, no se conocen. |
| 2 | ¿Su input y output pertenecen a dominios ontológicos diferentes? | ⚠️ **PARCIAL** | Input: Patterns (descriptivo). Output: Actions (operacional). Hay cambio de dominio. PERO este cambio no es ontológico (conocimiento → instrucción) sino pragmático (comprensión → ejecución). |
| 3 | ¿Requiere un lenguaje propio no compartido? | ❌ **NO** | Planning usaría el lenguaje operacional del sistema, que YA existe en ADR-003. No introduce nuevo lenguaje cognitivo. |
| 4 | ¿Su eliminación rompe la cadena de transformación cognitiva? | ❌ **NO** | Learning puede expersar patrones que el sistema operacional consume directamente. |
| 5 | ¿Tiene consumidores fuera de la siguiente capa? | ❌ **NO** | Su output es consumido por el sistema operacional (ADR-003), no por otra capa cognitiva. |

**Resultado: Planning pasa 0/5 criterios.** Mismo resultado que Reflection y Goals.

---

## 4. Criterio 2: ¿Nuevo lenguaje ontológico?

### 4.1 Lenguaje del pipeline cognitivo

| Capa | Lenguaje |
|------|----------|
| Signal | Temporal-raw |
| Observation | Temporal-validación |
| Fact | Proposicional |
| Evidence | Agregación |
| Knowledge | Consolidación |
| Belief | Epistémico |
| Decision | Cognitivo-decisional |
| Memory | Preservación-snapshot |
| Learning | Regularidad-pattern |
| **¿Planning?** | **Operacional-ADRN** |

### 4.2 El lenguaje de Planning es el lenguaje operacional

Planning hablaría de "enviar mensajes," "ejecutar políticas," "llamar APIs." Este lenguaje YA existe en el sistema operacional (ADR-003):

- `policy-ahora.ts`: "dispatch direct", "inhibit new booking"
- `policy-reserva.ts`: "inhibit booking accept", "preserve context"
- `llm-response.ts`: "build response prompt", "inject context"
- `handler.ts`: "determine next action"

**Planning no introduce nuevo lenguaje. Reutiliza el lenguaje operacional existente.**

### 4.3 Implicancia

Si Planning no introduce nuevo lenguaje, no hay boundary lingüístico. Esto fue una de las razones para eliminar Reflection (PR-6E: "mismo vocabulario ontológico"). Aplica el mismo argumento.

---

## 5. Criterio 3: ¿Boundary contractual real?

### 5.1 Frontera Learning → Planning

Esta frontera YA existe (renombrada desde Learning→Goals en PR-8D). Es un boundary real:
- Learning produce Patterns, Planning los consume.
- Contrato definido en PR-7D (ahora Learning→Planning).

**Pero la existencia de esta frontera no justifica a Planning.** La frontera existe entre Learning y su consumidor. Ese consumidor podría ser el sistema operacional, no una capa cognitiva.

### 5.2 Frontera Planning → Sistema Operacional

Planning produciría acciones que el sistema operacional ejecuta. Pero el sistema operacional YA produce acciones. ¿Dónde está la línea entre "Planning decide qué hacer" y "el handler lo ejecuta"?

| Aspecto | Planning (cognitivo) | Handler (operacional) |
|---------|---------------------|----------------------|
| Input | Patterns + estado cognitivo | Mensaje del usuario + estado de sesión |
| Output | "Intención de acción" | Acción ejecutada |
| Naturaleza | Cognitiva (basada en patrones) | Operacional (basada en reglas de negocio) |

**No hay boundary real.** Ambos deciden qué hacer. La diferencia es solo de input (uno usa Patterns, el otro usa reglas de negocio). Pero ambos producen el mismo tipo de output: acciones.

### 5.3 Conclusión sobre boundaries

| Frontera | ¿Real? | ¿Justifica capa? |
|----------|:------:|:----------------:|
| Learning → Planning | ✅ Sí, pero... | ❌ El consumidor podría ser operacional |
| Planning → Operacional | ❌ No | Mismo tipo de output, misma función |

---

## 6. Criterio 4: ¿Ciclo evolutivo independiente?

### 6.1 ¿Quién determina qué acciones debe producir Planning?

Las acciones de Planning están determinadas por:
1. Los Patterns que recibe (cambian cuando Learning cambia)
2. Las reglas de negocio (cambian cuando el producto cambia)
3. El estado cognitivo actual (cambia en cada turno)

Planning no tiene control sobre NINGUNO de estos. Es un **punto de paso obligado** entre dos dominios.

### 6.2 ¿Puede Planning evolucionar independientemente?

| Cambio en Planning | ¿Quién lo impulsa? | ¿Afecta a otros? |
|-------------------|--------------------|-----------------|
| Nueva estrategia de acción | Reglas de negocio (operacional) | ✅ SÍ (cambia comportamiento del sistema) |
| Nueva interpretación de Patterns | Learning (nuevos tipos de patrones) | ✅ SÍ (requiere coordinar con Learning) |
| Nueva acción posible | Handler/API (nuevas capacidades operacionales) | ✅ SÍ (depende de implementación operacional) |

**Planning no tiene iniciativa evolutiva propia.** Todo cambio en Planning es respuesta a cambios en otras capas o en el dominio operacional.

### 6.3 Comparación

| Capa | ¿Iniciativa evolutiva propia? |
|------|:---------------------------:|
| Learning | ✅ SÍ (puede descubrir nuevos tipos de patrones) |
| Memory | ✅ SÍ (nuevos campos a preservar) |
| EE | ✅ SÍ (nuevos facts a extraer) |
| **Planning** | ❌ **NO** (solo responde a cambios externos) |

---

## 7. Criterio 5: ¿Consumidores propios?

### 7.1 Consumidores del output de Planning

| Consumidor | ¿Consume de Planning? | ¿Otro consumidor? |
|-----------|:--------------------:|:-----------------:|
| Sistema operacional (handler) | ✅ SÍ | ❌ No |
| Usuario final | ✅ SÍ (indirecto) | ❌ No |
| Otra capa cognitiva | ❌ NO | — |

### 7.2 El sistema operacional es el único consumidor directo

Planning produce acciones que el sistema operacional ejecuta. No hay una capa cognitiva después de Planning.

Si Planning es eliminado, el sistema operacional consume Patterns directamente y produce acciones. **Sin pérdida de consumidores.**

---

## 8. Criterio 6: ¿Invariantes propios?

### 8.1 Posibles invariantes de Planning

| # | Invariante propuesto | ¿Exclusivo de Planning? | Análisis |
|---|---------------------|:----------------------:|----------|
| P-1 | Las acciones deben estar basadas en Patterns | ❌ | Es una restricción de diseño, no invariante arquitectónico. Tampoco es exclusivo — cualquier consumidor de Patterns debería cumplirlo. |
| P-2 | Las acciones deben ser ejecutables | ❌ | Es una restricción operacional. No es invariante cognitivo. |
| P-3 | Las acciones se producen por turno | ❌ | Es una restricción temporal del pipeline. Aplica también al EE y Learning. |
| P-4 | Las acciones no deben contradecirse | ❌ | Aplica a cualquier capa que tome decisiones. |
| P-5 | No hay acción sin Pattern justificante | ❌ | Similar a P-1. No invariante, es política de diseño. |

**Resultado: Planning no tiene invariantes propios exclusivos.**

### 8.2 Contraste con capas que SÍ tienen invariantes propios

| Capa | Invariantes exclusivos |
|------|----------------------|
| EE | I1-EE a I6-EE (completitud, inmutabilidad, monotonicidad, etc.) |
| Memory | M-1 a M-14 (append-only, no feedback, full turn, etc.) |
| Learning | L-1 a L-6 (pureza, determinismo, no-monotonicidad, etc.) |
| **Planning** | **NINGUNO** |

---

## 9. Criterio 7: ¿Transformación ontológica?

### 9.1 ¿Qué transformación realiza Planning?

```
L(M) → detect patterns
P(M, s) → select action
```

Patterns describen regularidades. Planificación selecciona acciones.

¿Hay cambio de orden lógico?
- Learning: 1° orden (snapshots) → 2° orden (patterns). **CAMBIO DE ORDEN.**
- Planning: 2° orden (patterns) → acciones (operacional). **NO hay cambio de orden** — las acciones son 0° orden (instrucciones puntuales, no generalizaciones).

¿Hay compresión abstractiva?
- Learning: ✅ SÍ (muchos snapshots → pocos patterns)
- Planning: ❌ NO (patterns → acción: es una decisión, no compresión)

### 9.2 Planning no cambia el orden lógico — cambia el DOMINIO

El cambio que realiza Planning no es ontológico (cambio de orden) sino PRAGMÁTICO (cambio de dominio: de conocimiento a acción).

Esto es una FUNCIÓN DE PUENTE, no una transformación cognitiva.

---

## 10. Análisis del "Action" como output

### 10.1 ¿Es Action un concepto ontológicamente nuevo?

| Entidad | Naturaleza | ¿Nuevo tipo? |
|---------|-----------|:------------:|
| Pattern | Regularidad | ✅ Nuevo (2° orden) |
| Goal (eliminado) | Intención | ❌ Mismo que Action (prescriptivo) |
| **Action** | **Instrucción** | ❌ **No es conocimiento** |

Si Action no es conocimiento, no pertenece al mismo género ontológico que las demás entidades del pipeline. Esto no es necesariamente malo — la acción es el propósito final de la cognición. Pero significa que Planning no puede ser evaluado con los mismos criterios que las capas de conocimiento.

### 10.2 ¿Qué implica esto para la arquitectura?

Si Planning no produce conocimiento, hay dos opciones:

**Opción A**: Planning es una capa cognitiva de tipo diferente (volitiva). Preservarla como capa con sus propios invariantes y contratos.

**Opción B**: Planning no es una capa cognitiva. Es un MECANISMO DE SALIDA del pipeline cognitivo. Como mecanismo de salida, no necesita los mismos criterios que las capas de conocimiento.

### 10.3 Decisión arquitectónica

Para ser consistente con la metodología aplicada a Reflection, Learning y Goals, debemos exigir a Planning los MISMOS CRITERIOS que a las demás capas:

> Si una capa no produce un nuevo tipo de conocimiento ontológicamente distinguible, debe eliminarse.

Planning produce instrucciones, no conocimiento. ❌ **No pasa el criterio fundamental.**

---

## 11. Intento de absorción en el sistema operacional

### 11.1 Hipótesis

**Planning puede reemplazarse por un contrato Learning → Sistema Operacional.**

```
Pipeline actual:      EE → Memory → Learning → Planning → (acción)
Pipeline propuesto:   EE → Memory → Learning ──contrato──→ Sistema Operacional
```

### 11.2 El contrato propuesto

Learning expone un conjunto de Patterns. El sistema operacional (handler, policies) consulta estos Patterns y decide acciones.

```
interface CognitiveInsights {
  patterns: Pattern[];
  latestSnapshot: CognitiveSnapshot;
}
```

El sistema operacional usa `CognitiveInsights` para informar sus decisiones, igual que usa `purchaseIntent`, `urgency`, etc.

### 11.3 ¿Qué se pierde?

| Aspecto | Con Planning | Sin Planning (contrato) |
|---------|-------------|------------------------|
| Decisión centralizada | ✅ Planning decide | ❌ Decisión distribuida en policies |
| Lenguaje cognitivo unificado | ✅ Action como concepto | ❌ Acciones en lenguaje operacional |
| Invariantes de acción | Posibles | ❌ No aplican |
| **Complejidad del pipeline** | **5 capas → 4 capas (tras PR-8) → 5 otra vez** | **4 capas (sin Planning)** |

### 11.4 ¿Qué se gana?

| Aspecto | Con Planning | Sin Planning |
|---------|-------------|--------------|
| Acoplamiento cognitivo-operacional | Fuerte (Planning artificial) | Débil (contrato explícito) |
| Duplicación de lógica de decisión | Alta (cognitiva + operacional) | Baja (una sola lógica: operacional) |
| Mantenimiento | Contractual (Learning→Planning + Planning→Op) | Simple (solo Learning→Op) |

**Ganancia neta: simplicidad arquitectónica.**

### 11.5 Veredicto de absorción

**✅ ABSORCIÓN POSIBLE.** Planning puede reemplazarse por un contrato entre Learning y el sistema operacional. No se viola ninguna invariante existente.

---

## 12. Comparación con Reflection y Goals

### 12.1 Tabla comparativa

| Dimensión | Reflection (eliminado) | Goals (eliminado) | **Planning (bajo auditoría)** |
|-----------|----------------------|-------------------|------------------------------|
| Tipo de output | Change (diferencia entre States) | Commitment (intención) | **Action (instrucción)** |
| ¿Nuevo conocimiento? | ❌ No | ❌ No | ❌ **No** |
| Lenguaje propio | ❌ No | ❌ No | ❌ **No** |
| Boundary real | ❌ No | ❌ No | ❌ **No (absorbible)** |
| Ciclo evolutivo propio | ❌ No | ❌ No | ❌ **No** |
| Consumidores | 1 (Learning) | 1 (Planning) | **1 (Sistema operacional)** |
| Invariantes propios | ❌ No | ❌ No | ❌ **No** |
| Absorbible sin violar invariantes | ✅ SÍ (en Learning) | ✅ SÍ (en Planning) | ✅ **SÍ (en sistema operacional)** |
| **Resultado** | **ELIMINADO** | **ELIMINADO** | **¿?** |

### 12.2 Consistencia metodológica

Si Reflection fue eliminado por:
- ❌ No nuevo conocimiento
- ❌ Sin boundary
- ❌ Sin invariantes
- ❌ Sin evolución propia
- ✅ Absorbible

Si Goals fue eliminado por las MISMAS razones:

Entonces Planning DEBE eliminarse por las MISMAS razones.

---

## 13. El problema del terminador

### 13.1 Counterargument: "Algo debe producir la acción final"

El pipeline cognitivo necesita un terminador — un punto donde la cognición se convierte en acción. Sin Planning, ¿quién produce la respuesta del sistema?

**Respuesta:** El sistema operacional (ADR-003) siempre ha producido la respuesta. El handler, las policies, el LLM — todos existen y funcionan. Lo que no existe es una capa COGNITIVA separada que les diga qué hacer.

El sistema operacional puede:
1. Consumir Patterns desde Learning (vía contrato)
2. Usar su propia lógica de decisión (ya existente)
3. Producir acciones (como siempre ha hecho)

**No se necesita una capa cognitiva intermedia.** El sistema operacional ya "planifica" — solo lo hace con reglas de negocio en lugar de patrones cognitivos. Enriquecer su input con Patterns no requiere una nueva capa.

### 13.2 El verdadero terminador

El terminador del pipeline cognitivo NO es Planning. Es el CONTRATO entre Learning y el sistema operacional.

```
Cognitive Pipeline:
EE → Memory → Learning
                  ↓
         [CONTRATO: CognitiveInsights]
                  ↓
Operational Pipeline:
Handler → Policy → LLM → Response
```

---

## 14. Veredicto

### 14.1 Síntesis

| Hallazgo | Sección | Impacto |
|----------|---------|---------|
| Planning produce instrucciones, no conocimiento | §2 | ❌ No pasa criterio fundamental |
| 0/5 criterios de capa cognitiva | §3 | ❌ Mismo resultado que Reflection y Goals |
| Sin lenguaje ontológico propio | §4 | ❌ Reutiliza lenguaje operacional |
| Sin boundary real | §5 | ❌ Absorbible en sistema operacional |
| Sin ciclo evolutivo propio | §6 | ❌ Cambia solo por factores externos |
| Sin invariantes exclusivos | §8 | ❌ Ninguno propio |
| Sin transformación ontológica | §9 | ❌ No hay cambio de orden lógico |
| Absorbible en sistema operacional | §11 | ✅ Posible sin violar invariantes |

### 14.2 Veredicto final

> **Veredicto: D — Planning debe eliminarse como capa cognitiva independiente.**

**Justificación:**

Planning no supera NINGUNO de los criterios que establecieron a Memory y Learning como capas independientes:

1. ❌ **No produce nuevo tipo de conocimiento.** Produce instrucciones ejecutables, no conocimiento cognitivo.
2. ❌ **No tiene lenguaje ontológico propio.** Reutiliza el lenguaje operacional de ADR-003.
3. ❌ **No tiene boundary arquitectónico real.** Es absorbible por el sistema operacional.
4. ❌ **No tiene ciclo evolutivo independiente.** Cambia solo en respuesta a cambios externos.
5. ❌ **No tiene invariantes propios exclusivos.**
6. ❌ **No realiza transformación ontológica.** No hay cambio de orden lógico.
7. ✅ **Es absorbible sin violar invariantes.** Puede reemplazarse por un contrato Learning → Sistema Operacional.

**Planning sigue exactamente el mismo patrón que Reflection y Goals: una capa que no produce conocimiento nuevo, no tiene boundary real, no tiene evolución propia, y es absorbible.**

### 14.3 ¿Qué se pierde?

| Aspecto | Con Planning | Sin Planning |
|---------|-------------|--------------|
| Capa de planificación cognitiva | ✅ Existe | ❌ Reemplazada por contrato |
| Acciones como entidades cognitivas | ✅ Primera clase | ❌ Internas al sistema operacional |
| Pipeline de 4 capas | EE → Memory → Learning → Planning | **EE → Memory → Learning** |

**No hay pérdida arquitectónica real.** El contrato Learning → Sistema Operacional preserva todos los beneficios sin añadir una capa completa.

### 14.4 Pipeline cognitivo real (post-PR-9)

```
COGNITIVE:        EE → Memory → Learning
                                           ↓
BOUNDARY:         [CognitiveInsights contract]
                                           ↓
OPERATIONAL:      Handler → Policy → LLM → Response
```

3 capas cognitivas + 1 contrato de frontera. La transición cognición→acción es explícita y contractual, no una capa artificial.

---

*Este documento es resultado de la auditoría ontológica PR-9A. Aplica la misma metodología que eliminó Reflection (PR-6) y Goals (PR-8). No contiene código ni propuestas de implementación.*
