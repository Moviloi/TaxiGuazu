# PBA-1 — Projection Boundary Audit

> **Fecha:** 2026-07-14  
> **Tipo:** Auditoría adversarial de diseño arquitectónico  
> **Precedencia:** MRC-1 (Memory Read Contract Architecture) — decisión: MemorySnapshot[19]  
> **Driver:** Determinar el boundary arquitectónicamente correcto entre Memory y Pattern Discovery respecto de la proyección del snapshot cognitivo  
> **Rol:** Arquitecto Principal — separación de responsabilidades y diseño de interfaces cognitivas

---

## Preámbulo

La decisión actual (Modelo A: MemoryRead → MemorySnapshot[19] → Pattern Discovery → proyección interna) fue tomada en MRC-1. No fue sometida a una auditoría adversarial. Este documento evalúa tres modelos arquitectónicos alternativos, intenta refutar cada uno, y conserva únicamente el que sobreviva.

**Regla:** No asumir que la decisión actual es correcta. Intentar refutarla.

---

## Las tres alternativas

```
Modelo A (actual):
  MemoryRead → MemorySnapshot[19] → Pattern Discovery → proyección interna → 11 campos analizables

Modelo B (alternativa):
  MemoryRead → ProjectedState[11] → Pattern Discovery
  (Memory realiza la proyección 19→11)

Modelo C (alternativa):
  MemoryRead → MemorySnapshot[19] → ProjectionAdapter → ProjectedState[11] → Pattern Discovery
  (Adaptador independiente realiza la proyección)
```

---

## 1. Análisis del Modelo A — MemorySnapshot[19], PD proyecta internamente

### Descripción
MemoryRead retorna `MemorySnapshot[19]`. Pattern Discovery recibe el snapshot completo y selecciona internamente los 11 campos analizables.

### Intento de refutación

**Refutación 1: PD depende de la estructura interna de Memory.**
> Pattern Discovery conoce los 19 campos de MemorySnapshot aunque solo use 11. Si Memory agrega un campo (ej. un nuevo campo del EE), PD ve el cambio aunque no le afecte. Esto es acoplamiento innecesario.

**Contraargumento:**
- PD ya depende de Memory como fuente de datos. Depender del tipo completo no es acoplamiento adicional — es la misma dependencia.
- Los cambios aditivos (nuevos campos) no rompen PD. Los cambios sustractivos (eliminar/renombrar) romperían cualquier modelo por igual.
- En TypeScript, PD importa `MemorySnapshot` y usa `Pick<>` o una proyección para definir sus 11 campos. Si Memory agrega un campo, PD no se entera — el nuevo campo simplemente no está en el `Pick<>`.

**Resultado: ❌ Refutación fallida. El acoplamiento es inevitable y no es peor que en otros modelos.**

---

**Refutación 2: PD puede accidentalmente usar campos no analizables.**
> Pattern Discovery tiene acceso a los 19 campos. Un desarrollador podría usar `belief.factCount` (un campo excluido de los 11 analizables) en un análisis, creando dependencia oculta en un campo que no debería estar en el contrato de análisis.

**Contraargumento:**
- Esto es un problema de gobernanza, no de arquitectura. El contrato de PD dice "11 campos analizables." Las revisiones de código y los tests deben garantizar que PD solo use esos 11.
- En cualquier modelo donde PD tenga acceso a los datos completos (Modelo C también tiene este riesgo), la gobernanza es el mecanismo de control.
- Si el riesgo es real, PD puede definir su propio tipo `ProjectedState` como `Pick<MemorySnapshot, 'turnNumber' | 'storedAt' | ...>` y trabajar exclusivamente con ese tipo. La proyección ocurre en el borde de PD (primera línea), no en el borde de Memory.

**Resultado: ❌ Refutación fallida. Es un problema de gobernanza, mitigable con tipos.**

---

**Refutación 3: PD duplica la proyección (cada consumidor proyecta).**
> Si hay múltiples consumidores de Memory (PD, observabilidad, debugging), cada uno debe proyectar. La proyección 19→11 se duplica.

**Contraargumento:**
- La proyección no se duplica: cada consumidor tiene necesidades DIFERENTES. PD necesita 11 campos. Observabilidad necesita 19 (no proyecta). Debugging necesita 19 (no proyecta). No hay una proyección única que todos compartan.
- Si en el futuro surge un patrón de proyección compartido, se puede extraer a un utility. No es una razón para diseñar una capa ahora.

**Resultado: ❌ Refutación fallida. No hay duplicación real.**

---

**Refutación 4: Memory define el contrato de datos que PD recibe.**
> Memory controla qué campos existen. PD no tiene control sobre el shape de su entrada. Si Memory elimina un campo que PD necesita, PD se rompe.

**Contraargumento:**
- Esto es cierto para TODOS los modelos. En el Modelo B, PD depende de que Memory proyecte correctamente los 11 campos. Si Memory cambia la proyección, PD se rompe igual. En el Modelo C, el adaptador depende de Memory — misma dependencia.
- La estabilidad del contrato es responsabilidad de Memory (M-10: projection stability). Memory no debe romper campos que los consumidores usan.

**Resultado: ❌ Refutación fallida. Aplica a todos los modelos por igual.**

---

### Veredicto parcial del Modelo A

| Intento de refutación | Resultado |
|-----------------------|:---------:|
| R1: PD depende de estructura interna de Memory | ❌ Refutación fallida |
| R2: PD usa accidentalmente campos no analizables | ❌ Refutación fallida |
| R3: Proyección duplicada entre consumidores | ❌ Refutación fallida |
| R4: Memory controla el contrato de PD | ❌ Refutación fallida |

**El Modelo A sobrevive a la auditoría adversarial.**

---

## 2. Análisis del Modelo B — MemoryRead devuelve ProjectedState[11]

### Descripción
MemoryRead retorna `ProjectedState[11]`. Memory realiza la proyección 19→11. Pattern Discovery recibe exactamente los 11 campos que necesita.

### Intento de refutación

**Refutación 1: Viola M-9 (No enrichment).**
> M-9 dice: "Memory never adds, derives, transforms, or infers fields." La proyección 19→11 es una transformación. Aunque sea una reducción (eliminar 8 campos), sigue siendo una transformación de la forma del snapshot. Memory no debe proyectar.

**Contraargumento:**
- Podría argumentarse que la proyección es una reducción, no una transformación. Memory no cambia los valores, solo selecciona un subconjunto. La información no se modifica, solo se filtra.

**Contra-contraargumento:**
- M-9 dice explícitamente "transforms". Seleccionar 19→11 ES transformar la estructura. El snapshot deja de tener la forma `MemorySnapshot` y pasa a tener la forma `ProjectedState`. La ontología cambia.
- Memory perdería su propósito de ser "la preservación completa del turno cognitivo." Si Memory solo preserva 11 de 19 campos, no es "completa."
- ADR-010, §Persistence Rules: "No defaults: every field in the snapshot MUST come from Belief or Decision." La proyección viola el espíritu de esta regla.

**Resultado: ✅ Refutación exitosa. M-9 es una invariante fundacional de Memory. La proyección la viola.**

---

**Refutación 2: Memory debe conocer las necesidades de PD.**
> Para saber qué 11 campos proyectar, Memory debe conocer qué necesita Pattern Discovery. Esto crea acoplamiento direccional: Memory depende del conocimiento de PD.

**Contraargumento:**
- Los 11 campos podrían definirse en ADR-010 como "los campos analizables del snapshot," independientemente de PD. No es que Memory conozca a PD, sino que ambos conocen un contrato compartido.

**Contra-contraargumento:**
- Eso requeriría formalizar los "11 campos analizables" en ADR-010. Hasta ahora, ningún documento ha listado explícitamente esos 11 campos. PR-7B y PR-7D los mencionan conceptualmente pero no hay una lista ratificada.
- Además, si PD descubre que necesita el campo 12 en el futuro, ADR-010 debe cambiar. Memory está acoplada al descubrimiento de PD.
- En el modelo A, PD puede agregar el campo 12 sin cambiar Memory (el campo ya está en MemorySnapshot[19]).

**Resultado: ✅ Refutación exitosa. Acoplamiento direccional Memory → PD.**

---

**Refutación 3: Rompe otros consumidores.**
> Observabilidad necesita los 19 campos (incluyendo factCounts, metadata completa). Debugging necesita los 19. Si Read retorna solo 11, estos consumidores no tienen acceso a los datos completos.

**Contraargumento:**
- Memory podría exponer dos métodos: `querySnapshots()` → MemorySnapshot[19] para observabilidad, y `queryProjected()` → ProjectedState[11] para PD.

**Contra-contraargumento:**
- Eso introduce complejidad innecesaria. Dos métodos de lectura, dos tipos de retorno, dos contratos que mantener. ¿Para qué? Para ahorrarle a PD una proyección trivial de 11 campos.
- La existencia de dos métodos sugiere que la proyección no pertenece a Memory — pertenece al consumidor.

**Resultado: ✅ Refutación exitosa. Necesitaría dos APIs de lectura, complejidad innecesaria.**

---

**Refutación 4: ¿Qué son exactamente los 11 campos?**
> Los "11 campos analizables" nunca fueron formalmente definidos en ningún ADR. PR-7B, PR-7D, y Milestone v3.0 los mencionan pero no hay una lista explícita ratificada. Memory no puede proyectar algo que no está definido.

**Contraargumento:**
- Se podrían definir ahora. PBA-1 podría incluir la definición de los 11 campos como parte de su resolución.

**Contra-contraargumento:**
- El objetivo de PBA-1 es determinar el boundary correcto, NO definir los 11 campos. Definirlos ahora sería premature — PD aún no existe y no sabe exactamente qué necesita. Definir los 11 campos sin PD es diseñar un contrato sin consumidor.

**Resultado: ✅ Refutación exitosa. Los 11 campos no están formalizados y no deben formalizarse hasta que PD exista.**

---

### Veredicto parcial del Modelo B

| Intento de refutación | Resultado |
|-----------------------|:---------:|
| R1: Viola M-9 (transformación) | ✅ **Refutación exitosa** |
| R2: Acoplamiento Memory → PD | ✅ **Refutación exitosa** |
| R3: Rompe otros consumidores | ✅ **Refutación exitosa** |
| R4: 11 campos no definidos | ✅ **Refutación exitosa** |

**⚠️ El Modelo B NO sobrevive a la auditoría adversarial. Es descartado por 4 refutaciones independientes, cada una suficiente para eliminarlo.**

---

## 3. Análisis del Modelo C — ProjectionAdapter independiente

### Descripción
MemoryRead retorna `MemorySnapshot[19]`. Un `ProjectionAdapter` recibe `MemorySnapshot[19]` y transforma a `ProjectedState[11]`. Pattern Discovery recibe `ProjectedState[11]` y analiza.

### Intento de refutación

**Refutación 1: Capa innecesaria.**
> El adaptador es una función pura: `(snapshot: MemorySnapshot) => ProjectedState`. No tiene estado, no tiene lógica de negocio, no tiene dependencias. Crear una capa arquitectónica para una función pura viola ADR-001 (principio de mínima arquitectura necesaria).

**Contraargumento:**
- La capa sirve para formalizar el contrato de proyección. Tiene un propósito arquitectónico claro: ser el punto de cambio cuando la proyección evolucione.

**Contra-contraargumento:**
- El adaptador no es un punto de cambio real. Si PD necesita un campo 12, el adaptador debe cambiar (agregar el campo a ProjectedState). Pero PD también debe cambiar (usar el nuevo campo). El cambio ocurre en dos lugares en lugar de uno.
- Si Memory agrega un campo, el adaptador debe cambiar para decidir si incluirlo o no. Pero PD también debe decidir si usarlo. El cambio sigue ocurriendo en dos lugares.
- El adaptador no reduce el costo del cambio — lo distribuye.

**Resultado: ✅ Refutación exitosa. La capa no reduce acoplamiento ni costo de cambio. Agrega indirección sin beneficio.**

---

**Refutación 2: Problema de pertenencia.**
> ¿Dónde vive el adaptador? Si vive en el dominio de Memory, Memory proyecta (viola M-9, mismo problema que Modelo B). Si vive en el dominio de PD, es código de PD disfrazado de capa independiente. Si vive en un dominio compartido, es un módulo sin dueño claro.

**Contraargumento:**
- Podría vivir como un módulo independiente `src/lib/projection/` con dueño compartido.

**Contra-contraargumento:**
- Eso crea un nuevo módulo en la arquitectura (ADR-001: se justifica por necesidad demostrada). No hay necesidad demostrada — la proyección es trivial y PD puede hacerla internamente.
- El nuevo módulo requiere tests, documentación, mantenimiento. Para una función de 11 líneas.

**Resultado: ✅ Refutación exitosa. Sin pertenencia clara. Cualquier opción tiene problemas.**

---

**Refutación 3: No resuelve el problema que dice resolver.**
> El propósito del adaptador es desacoplar Memory de PD. Pero PD sigue dependiendo de `ProjectedState`, que es un subconjunto de `MemorySnapshot`. Si `MemorySnapshot` cambia (campo renombrado), `ProjectedState` también cambia. El adaptador no aísla a PD del cambio en Memory.

**Contraargumento:**
- El adaptador aísla a PD de los campos que NO están en ProjectedState. Si Memory agrega un campo que no entra en la proyección, PD no se entera.

**Contra-contraargumento:**
- Eso también es cierto en el Modelo A: PD simplemente no usa el nuevo campo. El adaptador no agrega aislamiento.
- Para cambios sustractivos (campos que PD necesita y Memory elimina), todos los modelos se rompen por igual.

**Resultado: ✅ Refutación exitosa. El adaptador no provee aislamiento real que el Modelo A no provea.**

---

**Refutación 4: Duplica el mantenimiento de tipos.**
> Memory define `MemorySnapshot`. El adaptador define `ProjectedState` (11 campos). PD recibe `ProjectedState`. Ahora hay dos tipos que mantener sincronizados. Si la proyección cambia (ej. PD descubre que necesita `belief.channel`), el adaptador debe actualizar `ProjectedState`. Si Memory agrega un campo que PD necesita, ambos tipos deben actualizarse.

**Contraargumento:**
- En el Modelo A, PD también necesita mantener su proyección interna. No hay diferencia real.

**Contra-contraargumento:**
- En el Modelo A, la proyección es `Pick<MemorySnapshot, 'turnNumber' | ...>` — un tipo derivado de MemorySnapshot que se mantiene automáticamente sincronizado. En el Modelo C, ProjectedState es un tipo separado que debe definirse explícitamente y sincronizarse manualmente.

**Resultado: ✅ Refutación exitosa. El Modelo A tiene mantenimiento de tipos más simple (tipos derivados vs. tipos separados).**

---

### Veredicto parcial del Modelo C

| Intento de refutación | Resultado |
|-----------------------|:---------:|
| R1: Capa innecesaria | ✅ **Refutación exitosa** |
| R2: Problema de pertenencia | ✅ **Refutación exitosa** |
| R3: No resuelve el desacoplamiento | ✅ **Refutación exitosa** |
| R4: Duplica mantenimiento de tipos | ✅ **Refutación exitosa** |

**⚠️ El Modelo C NO sobrevive a la auditoría adversarial. Es descartado por 4 refutaciones independientes.**

---

## 4. Comparación sistemática

| Criterio | Modelo A | Modelo B | Modelo C |
|----------|:--------:|:--------:|:--------:|
| **Responsabilidad limpia** | ✅ Memory=datos, PD=análisis | ❌ Memory=datos+proyección | ⚠️ Memory=datos, Adapter=proyección |
| **Bajo acoplamiento** | ✅ PD conoce MemorySnapshot | ❌ Memory conoce necesidades PD | ✅ PD conoce ProjectedState |
| **Alta cohesión** | ✅ Cada capa hace una cosa | ❌ Memory hace dos cosas | ⚠️ Adapter existe para una función trivial |
| **Evolución independiente** | ✅ Cambios aditivos no rompen PD | ❌ PD necesita cambio = Memory cambia | ⚠️ Adaptador debe cambiar con PD o Memory |
| **Testabilidad** | ✅ Cada capa testeable sola | ⚠️ Memory testeable, proyección trivial | ✅ Tres componentes testeables (innecesario) |
| **Reutilización** | ✅ MemorySnapshot reusable | ❌ ProjectedState reusable solo para PD | ⚠️ ProjectedState reusable (innecesario) |
| **M-9 compatible** | ✅ Sin transformación | ❌ Viola M-9 (proyecta) | ✅ Memory no transforma |
| **PR-7 compatible** | ✅ PD recibe datos completos | ❌ PD recibe solo 11 (puede necesitar más) | ⚠️ PD recibe solo 11, adaptador acopla |
| **Costo de implementación** | ✅ Bajo (proyección en PD) | ⚠️ Medio (dos APIs de read) | ❌ Alto (nuevo módulo + tests + docs) |
| **Complejidad ontológica** | ✅ 1 tipo (MemorySnapshot) | ❌ 2 tipos (MemorySnapshot + ProjectedState) | ❌ 3 tipos (MemorySnapshot + ProjectedState + ProjectionAdapter) |

---

## 5. Intento de refutar el Modelo A (ronda final)

Dado que los Modelos B y C fueron eliminados, someto al Modelo A a una ronda final de refutación adversarial:

---

**Refutación final A1: Pattern Discovery recibe datos que no debería procesar.**
> MemorySnapshot contiene 19 campos. PD solo debería analizar 11. Al recibir 19, PD puede tentarse a analizar los otros 8, creando dependencias no documentadas.

**Contraargumento final:**
- Esto es mitigable por diseño de tipos: PD define `ProjectedState` internamente y proyecta en el borde de entrada. El resto del código de PD solo ve `ProjectedState`.
- Si un desarrollador de PD usa `MemorySnapshot.factCount` en el núcleo del análisis, el code review lo detecta.
- Si el riesgo persiste, se puede agregar un lint rule o un test que verifique que PD solo referencia los 11 campos autorizados.

**Resultado: Refutación fallida. Mitigable por diseño de tipos + gobernanza.**

---

**Refutación final A2: El contrato entre Memory y PD es difuso.**
> No hay un contrato formal que diga "PD solo analiza estos 11 campos." Memory entrega 19, y PD elige. Sin un contrato explícito, no hay garantía de estabilidad.

**Contraargumento final:**
- El contrato formal es: "Memory entrega MemorySnapshot[19]. PD puede proyectar internamente." Esto ES un contrato — es el que define MRC-1.
- Los 11 campos analizables son un detalle de implementación de PD, no un contrato entre capas. La capa Memory no necesita saber qué hace PD con los datos.
- Cuando PD exista, documentará internamente qué campos analiza. Eso es suficiente.

**Resultado: Refutación fallida. El contrato está formalizado en MRC-1. La proyección es interna de PD.**

---

**Refutación final A3: Si múltiples consumidores necesitan la misma proyección, se duplica esfuerzo.**
> Futuros consumidores (ej. una herramienta de visualización cognitiva) podrían necesitar los mismos 11 campos que PD. Cada uno proyectaría independientemente.

**Contraargumento final:**
- Cuando eso ocurra, se puede extraer un utility compartido `cognitiveProjection(snapshot): ProjectedState` en el dominio de los consumidores. No es necesario adelantarse a un problema que no existe.
- YINYANG: Si hoy diseñamos para ese futuro, asumimos que ese consumidor existirá y que necesitará exactamente los mismos 11 campos. Ambas asunciones son especulativas.

**Resultado: Refutación fallida. Premature optimization.**

---

## 6. Conclusión

### Modelos eliminados

| Modelo | Eliminado por |
|:------:|---------------|
| **Modelo B** | 4 refutaciones independientes. Viola M-9 (invariante fundacional). Acopla Memory a PD. Rompe otros consumidores. Los 11 campos no están definidos. |
| **Modelo C** | 4 refutaciones independientes. Capa arquitectónica innecesaria para una función pura. Problema de pertenencia irresoluble. No provee aislamiento real. Duplica mantenimiento de tipos. |

### Modelo sobreviviente

| Modelo | Supervivencia |
|:------:|:-------------:|
| **Modelo A** | ✅ **Sobrevive a la auditoría adversarial.** 4 refutaciones en ronda inicial fallidas. 3 refutaciones en ronda final fallidas. Ningún argumento pudo eliminar el modelo. |

### Por qué el Modelo A es correcto

1. **M-9 se preserva.** Memory no transforma datos. La proyección es responsabilidad del consumidor.
2. **El acoplamiento es el mínimo necesario.** PD depende de Memory para obtener datos. Depender del tipo completo no es acoplamiento adicional.
3. **Evolución independiente real.** Memory agrega campos sin romper PD. PD cambia su proyección sin afectar Memory.
4. **Un solo tipo, un solo contrato.** `MemorySnapshot[19]` es la fuente de verdad. No hay tipos duplicados ni sincronización manual.
5. **Costo cero de implementación en Memory.** Memory no necesita cambios. La proyección es código de PD.
6. **Consistente con resoluciones previas.** MCR-1 (PR-12D) y CNV-1 (PR-12E) ya resolvieron que la proyección 19→11 es un detalle de Pattern Discovery.

---

## Veredicto

### MODELO A

MemoryRead → MemorySnapshot[19] → Pattern Discovery → proyección interna → 11 campos analizables.

**Justificación arquitectónica completa:**

1. **Separación de responsabilidades.** Memory preserva (write) y entrega (read) el snapshot cognitivo completo. Pattern Discovery analiza y proyecta. Cada capa hace una cosa.

2. **M-9 preservado.** Memory nunca transforma datos. La proyección 19→11 es una transformación y por lo tanto no pertenece a Memory.

3. **Acoplamiento mínimo y direccionalmente correcto.** PD depende de Memory (dirección natural: el análisis depende de los datos). Memory NO depende de PD (ninguna dirección inversa).

4. **Evolución independiente.** Memory puede agregar campos sin coordinar con PD. PD puede refinar su proyección sin cambiar Memory. El desacoplamiento es real.

5. **Simplicidad ontológica.** Un tipo (`MemorySnapshot[19]`) es la fuente de verdad. ProjectedState es un concepto interno de PD, no un tipo en el contrato entre capas.

6. **Costo cero en Memory.** La implementación de Read no cambia. Todo el costo de la proyección recae en el consumidor que la necesita.

7. **Consistente con el cuerpo documental completo:** ADR-010, MCR-1 (PR-12D), CNV-1 (PR-12E), MRC-1, y ahora PBA-1 convergen en la misma decisión arquitectónica.

---

*Fin de PBA-1 — Projection Boundary Audit*
