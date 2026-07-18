# PR-10A — Cognitive Boundary Ontology Audit

**Estado:** Borrador de auditoría ontológica  
**Fecha:** 2026-07-13  
**Driver:** Determinar si el boundary entre el sistema cognitivo y el sistema operacional constituye una entidad arquitectónica independiente o es simplemente un flujo de datos entre dos dominios.

---

## Regla metodológica

Mismo rigor aplicado en PR-6 a PR-9:

1. **El boundary es culpable hasta demostrar lo contrario.**
2. Si el boundary puede eliminarse como entidad sin romper invariantes, debe eliminarse.
3. Si el boundary no produce un nuevo tipo de conocimiento, lenguaje, o transformación ontológica, no es una entidad arquitectónica.
4. No se aceptan argumentos de "separación de concerns" como justificación ontológica.

---

## 1. Definición del objeto bajo auditoría

### 1.1 ¿Qué es el boundary cognitivo-operacional?

Según PR-9A y EVIDENCE_ONTOLOGY.md post-PR-9:

```
COGNITIVO:     EE → Memory → Learning
                                          ↓
BOUNDARY:      [CognitiveInsights contract — Patterns expuestos]
                                          ↓
OPERACIONAL:   Handler → Policy → LLM → Response
```

El boundary es el **punto de transición** entre el sistema cognitivo (que produce conocimiento) y el sistema operacional (que produce acciones).

### 1.2 ¿Qué NO es el boundary?

- No es una capa (PR-9 eliminó Planning, que era la candidata a capa de transición).
- No es un componente con estado.
- No es un proceso independiente.
- No es un transformador de conocimiento.

### 1.3 Hipótesis nula

> **H₀: El boundary cognitivo-operacional no constituye una entidad arquitectónica independiente.**
> 
> Es una RELACIÓN CONTRACTUAL entre dos dominios existentes (Learning y Sistema Operacional). Como relación, no posee existencia independiente, no produce conocimiento, no tiene invariantes propios, y no puede evolucionar autónomamente. Puede ser reemplazado por las interfaces directas de Learning y del sistema operacional sin pérdida arquitectónica.

---

## 2. ¿Qué produce el boundary?

### 2.1 Output del boundary

El boundary NO produce nada. Es un **canal de transporte**. Lo que cruza son Patterns:

```
M = {⟨P₁, θ₁, E₁, τ₁⟩, ..., ⟨Pₖ, θₖ, Eₖ, τₖ⟩}
```

Producidos por Learning. Consumidos por el sistema operacional.

El boundary no transforma, no enriquece, no filtra, no interpreta. **Transporta.**

### 2.2 Contraste con entidades arquitectónicas reales

| Entidad | ¿Qué produce? | Naturaleza |
|---------|--------------|-----------|
| **EE** | Signal → Decision | Conocimiento de 1° orden |
| **Memory** | Snapshot | Conocimiento preservado |
| **Learning** | Pattern ⟨P, θ, E⟩ | Conocimiento de 2° orden |
| **Reflection** (eliminada) | Change (δ) | No producía nuevo tipo |
| **Goals** (eliminada) | Commitment | No producía nuevo tipo |
| **Planning** (eliminada) | Action | Instrucciones, no conocimiento |
| **Boundary** | **Nada — solo transporta** | **No produce** |

### 2.3 Hallazgo fundamental

> **El boundary no produce nada.**
> 
> Es el único elemento en toda la arquitectura que no produce output propio. Todo lo que cruza el boundary fue producido por Learning (Patterns) o será consumido por el sistema operacional. El boundary es un **punto de paso**, no un **productor**.

---

## 3. Criterio 1: ¿Nuevo tipo de conocimiento?

Aplicando los 5 criterios de PR-7A:

| # | Criterio | ¿El boundary lo cumple? | Justificación |
|---|----------|:---------------------:|---------------|
| 1 | ¿Produce un tipo de conocimiento que no existe en otras entidades? | ❌ **NO** | No produce nada. Solo transporta Patterns (conocimiento de Learning). |
| 2 | ¿Su input y output pertenecen a dominios ontológicos diferentes? | ❌ **NO** | No tiene output propio. Su "output" es el mismo que su input (Patterns). No hay transformación. |
| 3 | ¿Requiere un lenguaje propio no compartido? | ❌ **NO** | Usa el lenguaje de Patterns (Learning) en un lado y lenguaje operacional en el otro. No introduce vocabulario nuevo. |
| 4 | ¿Su eliminación rompe la cadena de transformación? | ❌ **NO** | Learning y sistema operacional pueden comunicarse directamente. |
| 5 | ¿Tiene consumidores fuera de la siguiente entidad? | ❌ **NO** | No tiene output que consumir. |

**Resultado: 0/5 criterios.** No es una entidad productora de conocimiento.

---

## 4. Criterio 2: ¿Lenguaje ontológico propio?

### 4.1 Vocabulario del boundary

El boundary usaría conceptos como:
- `Pattern`, `Predicate`, `Confidence`, `Evidence`, `τ` — del lado cognitivo.
- `Handler`, `Policy`, `Response`, `Message` — del lado operacional.

**El boundary no tiene vocabulario propio.** Todo su vocabulario es prestado de los dos dominios que conecta.

### 4.2 Contraste con boundaries reales

| Boundary | Lenguaje propio |
|----------|:--------------:|
| **EE→Memory** | Snapshot (estructura específica con 19 campos) — **NUEVO** |
| **Memory→Learning** | Pattern (⟨P, θ, E⟩) — **NUEVO** |
| **Learning→Operacional** | **NINGUNO** (solo transporta Patterns) |

### 4.3 Conclusión

Un boundary arquitectónico real introduce un nuevo lenguaje (Memory introduce snapshot, Learning introduce pattern). El boundary cognitivo-operacional no introduce nada nuevo. Es un PUNTO DE INTEGRACIÓN, no un boundary arquitectónico.

---

## 5. Criterio 3: ¿Invariantes propios?

### 5.1 Posibles invariantes del boundary

| # | Invariante propuesto | ¿Exclusivo del boundary? | ¿O pertenece a otra entidad? |
|---|---------------------|:-----------------------:|:---------------------------:|
| B-1 | Los Patterns no se modifican al cruzar | ❌ | Es I2-LG (Learning→Goals/Planning). Pertenece a Learning. |
| B-2 | El sistema operacional no escribe en Learning | ❌ | Es I2-LG. Pertenece a Learning. |
| B-3 | Solo Patterns cruzan el boundary | ⚠️ **NUEVO** | ¿Es invariante o política de diseño? |
| B-4 | Los Patterns se consumen después de producidos | ❌ | Orden natural del pipeline. No es invariante. |

### 5.2 Análisis de B-3

B-3 ("Solo Patterns cruzan el boundary") es la única candidata a invariante propio. Pero:

- ¿Qué más podría cruzar? Snapshots cognitivos (raw), decisiones internas de Learning (γ), metadatos de ejecución.
- La RESTRICCIÓN de que solo Patterns crucen es una **POLÍTICA DE DISEÑO**, no un invariante arquitectónico.
- Es análoga a la restricción "Memory no expone snapshots raw al sistema operacional" — una regla de buen diseño, no un invariante con identidad propia.

**Si B-3 es el único invariante candidato, y es una política de diseño, entonces el boundary no tiene invariantes arquitectónicos propios.**

---

## 6. Criterio 4: ¿Ciclo evolutivo independiente?

### 6.1 ¿Qué podría cambiar en el boundary?

| Cambio | ¿Quién lo impulsa? |
|--------|-------------------|
| Nuevos campos en Patterns | Learning (cambio en el modelo de Patterns) |
| Nuevo formato de consumo | Sistema operacional (nuevo handler, nueva policy) |
| Nuevas restricciones sobre qué cruza | Ambos (decisión de diseño coordinada) |

**El boundary no puede cambiar independientemente.** Todo cambio en el boundary es consecuencia de un cambio en Learning, en el sistema operacional, o en las políticas de diseño que los vinculan.

### 6.2 Comparación con entidades reales

| Entidad | ¿Evolución independiente? |
|---------|:------------------------:|
| **EE** | ✅ SÍ (nuevos facts, nuevas observaciones) |
| **Memory** | ✅ SÍ (nuevos campos a preservar) |
| **Learning** | ✅ SÍ (nuevos tipos de detección) |
| **Boundary** | ❌ **NO** (cambia solo cuando Learning o SO cambian) |

---

## 7. Criterio 5: ¿Contratos independientes?

### 7.1 ¿Cuáles serían los contratos del boundary?

El boundary tendría DOS interfaces:
- **Hacia Learning**: recibe Patterns.
- **Hacia Operacional**: entrega Patterns.

Ninguna de estas interfaces es propia del boundary:
- La interfaz con Learning es el mismo contrato Learning→Goals (PR-7D), ahora renombrado.
- La interfaz con Operacional es el mismo mecanismo de consumo que cualquier otro input operacional.

### 7.2 ¿Puede existir el contrato sin el boundary?

Sí. El contrato Learning→Sistema Operacional puede definirse como:
- **Learning expone**: `getPatterns(conversationId): Pattern[]`
- **Operacional consume**: `Pattern` type importado desde el módulo cognitivo

El contrato es una **INTERFAZ**, no una entidad. Existe como parte de Learning (el que expone) y del sistema operacional (el que consume). No requiere una entidad intermedia.

---

## 8. Intento de absorción

### 8.1 Absorción en Learning

**Learning expone Patterns directamente** a través de su API pública. El sistema operacional llama a Learning cuando necesita Patterns.

```
Operacional → learning.getPatterns(id) → Patterns
```

**Resultado: ✅ POSIBLE.** El boundary desaparece como entidad. Learning tiene una API de consulta.

### 8.2 Absorción en el sistema operacional

**El sistema operacional importa tipos de Learning** y consume Patterns como cualquier otra dependencia.

```
import { Pattern } from '.../learning';
```

**Resultado: ✅ POSIBLE.** El boundary es solo un import de tipos.

### 8.3 ¿Se viola alguna invariante?

| Invariante | ¿Se viola? |
|-----------|:---------:|
| I1-EE a I6-EE | ❌ No (EE no se modifica) |
| M-1 a M-14 | ❌ No (Memory no se modifica) |
| L-1 a L-6 | ❌ No (Learning no se modifica — solo expone API) |
| Separación cognitivo/operacional | ⚠️ Se debilita? |

### 8.4 Análisis de la separación cognitivo/operacional

La separación entre cognitivo y operacional NO depende de un boundary entidad. Depende de:

1. **Módulos separados**: El código cognitivo vive en su propio árbol de directorios.
2. **Importación unidireccional**: El sistema operacional importa del cognitivo. El cognitivo NO importa del operacional.
3. **Tipos compartidos explícitos**: Los tipos que cruzan (Pattern) están definidos en el módulo cognitivo y son consumidos por el operacional.

**Ninguno de estos requiere un boundary entidad.** Son reglas de arquitectura (políticas) que se aplican en el diseño del código.

---

## 9. Veredicto

### 9.1 Síntesis

| Hallazgo | Sección | Impacto |
|----------|---------|---------|
| El boundary no produce nada — solo transporta | §2 | ❌ Sin output propio |
| 0/5 criterios de entidad productora de conocimiento | §3 | ❌ No es entidad cognitiva |
| Sin lenguaje ontológico propio | §4 | ❌ Vocabulario prestado |
| Sin invariantes arquitectónicos exclusivos | §5 | ❌ B-3 es política de diseño |
| Sin ciclo evolutivo independiente | §6 | ❌ Cambia solo externamente |
| Sin contratos independientes | §7 | ❌ Contratos heredados |
| Absorbible en Learning (API) o SO (import) | §8 | ✅ Posible sin violar invariantes |

### 9.2 Veredicto final

> **El boundary cognitivo-operacional NO constituye una entidad arquitectónica independiente. Debe eliminarse como entidad formal.**

**Justificación:**

El boundary es un **PUNTO DE INTEGRACIÓN** entre dos dominios existentes. No es:
- Una capa (no produce conocimiento).
- Un componente (no tiene estado ni comportamiento propio).
- Un transformador (no modifica los datos que cruzan).
- Un productor de lenguaje (usa vocabulario prestado).

**Lo que realmente existe es un CONTRATO entre Learning y el sistema operacional.** Este contrato:
- Define qué información cruza (Patterns).
- Define qué información NUNCA cruza (snapshots raw, configuración interna de Learning).
- Es parte de la interfaz pública de Learning.

El contrato NO necesita una entidad separada. Es una PROPERTY de la relación entre Learning y el sistema operacional.

### 9.3 Arquitectura resultante

```
SISTEMA COGNITIVO (src/lib/evidence/, src/lib/memory/, src/lib/learning/):
  EE → Memory → Learning
  ├── API pública: Learning.getPatterns(conversationId): Pattern[]
  └── Invariante: solo Patterns cruzan al dominio operacional

                                      ↓ [Pattern type import]

SISTEMA OPERACIONAL (src/lib/services/, src/lib/handler/):
  Handler → Policy → LLM → Response
  ├── Consume: Pattern[] desde Learning
  └── Dependencia: unidireccional (operacional → cognitivo)
```

**No hay entidad boundary.** Hay:
- Una API pública en Learning.
- Un tipo compartido (Pattern).
- Una regla de importación unidireccional.
- Una política de diseño (solo Patterns cruzan).

### 9.4 ¿Qué se pierde?

| Aspecto | Con boundary entidad | Sin boundary entidad |
|---------|--------------------|---------------------|
| Entidad formal | CognitiveInsights | ❌ Eliminada |
| Contrato de cruce | Entidad separada | ✅ Contrato en API de Learning |
| Invariante "solo Patterns" | Del boundary | ✅ Política de diseño documentada |
| Separación de dominios | Garantizada por entidad | ✅ Garantizada por reglas de importación |

**No hay pérdida arquitectónica.** La separación cognitivo/operacional se mantiene mediante reglas de dependencia y políticas de diseño, no mediante una entidad intermedia.

---

*Este documento es resultado de la auditoría ontológica PR-10A. Aplica la misma metodología que eliminó Reflection (PR-6), Goals (PR-8) y Planning (PR-9). Conclusión: el boundary no es una entidad arquitectónica, es un punto de integración gobernado por un contrato que pertenece a la interfaz de Learning.*
