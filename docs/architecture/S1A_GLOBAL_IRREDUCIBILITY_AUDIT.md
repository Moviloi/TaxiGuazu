# S1A — Global Irreducibility Audit

**Auditoría:** S1A — Irreducibilidad Global del Pipeline Cognitivo  
**Pipeline bajo prueba:** `EE → Memory → Learning`  
**Fecha:** 2026-07-13  
**Driver:** Intentar refutar la arquitectura cognitiva completa desde primeros principios.

---

## Reglas de la auditoría

1. **Toda conclusión previa se ignora.** PR-3, PR-5, PR-7 no tienen peso como evidencia. Solo cuentan los argumentos derivados aquí.
2. **Carga de la prueba invertida.** La arquitectura se presume incorrecta hasta que sobreviva a todos los intentos de refutación.
3. **No se aceptan argumentos por intuición.** Toda afirmación debe demostrarse.
4. **No se diseñan soluciones.** No se propone nueva arquitectura. Solo se intenta refutar la existente.

---

## Pregunta central

¿Puede alguna de las tres capas restantes (**Evidence Engine**, **Memory**, **Learning**) absorberse total o parcialmente en otra capa SIN pérdida de propiedades esenciales?

Para responder, cada capa se evalúa contra cinco criterios:

| # | Criterio | Pregunta |
|---|----------|----------|
| 1 | **Nuevo tipo de conocimiento** | ¿Produce un tipo de conocimiento ontológicamente nuevo? |
| 2 | **Boundary contractual independiente** | ¿Existe un cambio de lenguaje ontológico entre esta capa y sus vecinas? |
| 3 | **Ciclo evolutivo propio** | ¿Evoluciona a una velocidad o escala temporal distinta de sus vecinas? |
| 4 | **Absorbible sin violar invariantes** | ¿Puede otra capa existente absorber su función sin romper invariantes? |
| 5 | **Pérdida real si desaparece** | ¿Qué perdería el sistema si esta capa se elimina hoy? |

---

## 1. Evidence Engine

### 1.1 Estado actual en código

El EE produce 7 objetos cognitivos por turno: Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision. La orquestación ocurre en `runShadowCognition()`.

**Hallazgo crítico — La salida del EE se descarta.**

En `src/lib/services/lead.service.ts`, línea 83:

```typescript
if (isEvidenceShadowModeEnabled()) {
  runShadowCognition({ text, phone, conversationId: conversation.id });
  // ^ El ShadowResult de retorno NO se captura. Se pierde.
}
```

El comentario en la línea 79 dice: *"Retorna un ShadowResult (observable en memoria) o null"*, pero el valor de retorno nunca se asigna. Los 7 objetos cognitivos se construyen y son inmediatamente recolectados por el garbage collector.

**Consecuencia:** El pipeline cognitivo completo es un no-op funcional. El sistema opera idénticamente con o sin EE. No hay consumidor del ShadowResult en ningún lugar del código base.

### 1.2 Criterio 1 — ¿Nuevo tipo de conocimiento?

**SÍ, ontológicamente.** El EE transforma un mensaje crudo (`string`) en una jerarquía de 7 objetos cognitivos con significado epistémico creciente. Knowledge, Belief y Decision son tipos que no existen en el dominio operacional.

**Pero este conocimiento nunca se usa.** Es nuevo en tipo pero cero en impacto. Desde la perspectiva del sistema, es conocimiento que nadie lee.

### 1.3 Criterio 2 — ¿Boundary contractual independiente?

**SÍ, en teoria.** El EE tiene un contrato de entrada (BuildSignalInput) y de salida (ShadowResult → Belief + Decision). Sus invariantes I1-EE a I6-EE definen un perímetro claro.

**Pero este boundary es unidireccional hacia la nada.** El contrato de salida existe pero no tiene contraparte. Memory (que debería consumirlo) no existe. El boundary es como una puerta que da a un abismo.

### 1.4 Criterio 3 — ¿Ciclo evolutivo propio?

**PARCIALMENTE.** El EE está congelado (ADR-009). No puede evolucionar sin ADR. Pero su congelamiento es artificial — no hay dependencias reales que lo justifiquen, dado que ningún consumidor existe. Podría modificarse sin afectar nada.

### 1.5 Criterio 4 — ¿Absorbible sin violar invariantes?

**SÍ, absorbible en el pipeline operacional.** La función del EE (extraer hechos estructurados de un mensaje) es un subconjunto de lo que ya hace el pipeline operacional:

| Función del EE | Equivalente operacional |
|----------------|------------------------|
| Signal (capturar raw) | `handler.ts` ya recibe el mensaje |
| Observation (validar) | El pipeline operacional valida via `getChatSession()` |
| Fact (proposiciones) | `core.ts` ya extrae intent + facts |
| Evidence (agrupar) | `buildMemory()` ya agrupa contexto |
| Knowledge (consolidar) | `buildExtractionContext()` ya consolida |
| Belief (postura) | `computeStrategyDecision()` ya decide postura |
| Decision (determinación) | `handlePolicyPipeline()` ya determina curso de acción |

No se viola ninguna invariante operacional porque el EE actualmente no se integra con nada. Su absorción sería una eliminación limpia.

### 1.6 Criterio 5 — ¿Qué se pierde si desaparece?

**NADA, en el sistema actual.**

- $378$ tests de evidence seguirían pasando (son tests unitarios, no de integración)
- Cero cambios en comportamiento conversacional
- Cero cambios en extracción, políticas, precio, dispatch, o respuesta al usuario
- El feature flag `EVIDENCE_SHADOW_MODE` se vuelve irrelevante

**Lo que se pierde es la infraestructura para el pipeline cognitivo futuro.** Pero esa infraestructura no está conectada a nada — es una plataforma de lanzamiento sin cohete.

### 1.7 Veredicto parcial — EE

```
Criterio 1 (nuevo conocimiento):     ✅ Sí, pero no usado
Criterio 2 (boundary contractual):    ⚠️ Sí, pero sin contraparte
Criterio 3 (ciclo evolutivo):        ❌ Congelado artificialmente
Criterio 4 (absorbible):             ✅ 100% absorbible en pipeline operacional
Criterio 5 (pérdida real):           ❌ Nada en el sistema actual
```

**El EE es funcionalmente eliminable.** Su producción de conocimiento es real pero huérfana — no tiene consumidor. En el sistema actual, la capa es un artifact decorativo.

---

## 2. Memory

### 2.1 Estado actual en código

**Memory NO EXISTE como código.** ADR-010 es un diseño conceptual. No hay:
- Archivos en `src/lib/memory/`
- Pruebas de integración
- Feature flag `COGNITIVE_MEMORY_ENABLED`
- Captura del ShadowResult (que sería su entrada)

El único "Memory" que existe es `buildMemory()` en `src/lib/services/memory/memory.ts` — que es **SessionMemory operacional**, no la Memory cognitiva de ADR-010.

### 2.2 Criterio 1 — ¿Nuevo tipo de conocimiento?

**NO.** Memory no produce conocimiento. Preserva (según su propia definición). Su función es almacenar Belief + Decision. La preservación no es un tipo de conocimiento — es una operación de almacenamiento.

### 2.3 Criterio 2 — ¿Boundary contractual independiente?

**NO, no existe.** El boundary está definido en documentos pero no hay:
- Implementación que lo materialice
- Código que lo respete
- Consumidor que lo use

Un boundary que solo existe en documentación no es un boundary arquitectónico. Es una intención.

### 2.4 Criterio 3 — ¿Ciclo evolutivo propio?

**NO APLICA.** Una capa que no existe no tiene ciclo evolutivo. Su evolución sería su creación.

### 2.5 Criterio 4 — ¿Absorbible sin violar invariantes?

**SÍ.** La función de Memory (persistir estado cognitivo post-turno) puede ser absorbida por:
- **El EE**: agregar un método `Decision.persist()` que escriba en DB. Esto violaría I4-EE (no persistence). ❌
- **El pipeline operacional**: extender `buildMemory()` (SessionMemory) para incluir campos cognitivos. `buildMemory()` ya persiste en `chat_sessions`. Agregar campos adicionales no viola invariantes operacionales. ✅

La absorción en el pipeline operacional es posible sin violar invariantes existentes porque:
1. SessionMemory ya escribe por turno
2. Los campos cognitivos son un subconjunto de los datos de sesión
3. No se crean nuevas dependencias
4. No se viola el EE Freeze (el EE no se modifica)

### 2.6 Criterio 5 — ¿Qué se pierde si desaparece?

**NADA.** Memory no existe. No hay código que eliminar, no hay dependencias que romper.

**Lo que se pierde conceptualmente:** la separación entre memoria operacional y memoria cognitiva. Pero esa separación ya es confusa (ver Finding 4 abajo).

### 2.7 Veredicto parcial — Memory

```
Criterio 1 (nuevo conocimiento):     ❌ No produce conocimiento
Criterio 2 (boundary):               ❌ No existe
Criterio 3 (ciclo evolutivo):        ❌ No aplica
Criterio 4 (absorbible):             ✅ 100% absorbible en pipeline operacional
Criterio 5 (pérdida real):           ❌ Nada
```

**Memory no es una capa en el sistema actual. Es un diseño conceptual sin materialización.** Su función de persistencia está duplicada (potencialmente) por SessionMemory operacional.

---

## 3. Learning

### 3.1 Estado actual en código

**Learning NO EXISTE como código cognitivo.** PR-7A a PR-7G son documentos de diseño. No hay:
- `src/lib/pattern-discovery/` o equivalente
- Algoritmos de detección de patrones
- Consumidores de Patterns

**Existe un "Learning" operacional** en `src/lib/services/learning/` (ADR-003) que hace fare learning, routing optimization, y policy adaptation. Este es un sistema COMPLETAMENTE DISTINTO — es operacional, no cognitivo.

### 3.2 Criterio 1 — ¿Nuevo tipo de conocimiento?

**TEÓRICAMENTE SÍ.** El modelo matemático define Pattern = ⟨P, θ, E⟩ como un objeto de segundo orden. Este sería ontológicamente nuevo.

**PERO EN LA PRÁCTICA NO.** Learning no existe. No produce nada. Su novedad ontológica es una afirmación sin evidencia empírica.

### 3.3 Criterio 2 — ¿Boundary contractual independiente?

**NO, no existe.** No hay código que materialice el boundary Memory→Learning o Learning→API. Los contratos de PR-7D son ejercicios teóricos.

### 3.4 Criterio 3 — ¿Ciclo evolutivo propio?

**NO APLICA.** Una capa que no existe no tiene ciclo evolutivo.

### 3.5 Criterio 4 — ¿Absorbible sin violar invariantes?

**SÍ, ya está absorbida funcionalmente por el sistema operacional.**

El "descubrimiento de patrones" que Learning haría cognitivamente ya existe de forma operacional en:

| Función cognitiva de Learning (teórica) | Equivalente operacional existente |
|----------------------------------------|----------------------------------|
| Detectar patrones en datos históricos | Fare learning, routing optimization (`src/lib/services/learning/`) |
| Producir Patterns (⟨P,θ,E⟩) | `LearningDecision` con ranked opportunities, utility scores |
| Informar decisiones operacionales | Policy engine consume `LearningDecision` para blocking/override |
| Acumular cross-conversación | `insertDecisionLog()` persiste decisiones históricas |

El sistema operacional ya tiene un ciclo learning→policy→adaptation. No necesita una capa cognitiva separada para esto.

**No se violan invariantes** porque no existe código que implemente la capa cognitiva. La absorción es trivial: simplemente no crear la capa.

### 3.6 Criterio 5 — ¿Qué se pierde si desaparece?

**NADA.** El Learning cognitivo no existe. El Learning operacional (ADR-003) seguiría funcionando.

**Lo que se pierde es la visión de un pattern discovery puramente cognitivo, desacoplado de la operación.** Pero esta visión es redundante con la capacidad operacional existente.

### 3.7 Hallazgo adicional — Confusión ontológica Learning/Goals/Planning

El pipeline cognitivo eliminó Goals y Planning argumentando que producían "instrucciones, no conocimiento". Pero el Learning operacional existente (`src/lib/services/learning/`) EXACTAMENTE produce instrucciones (ranked opportunities, routing decisions) — es decir, hace el trabajo de Goals y Planning pero disfrazado de "learning".

Esto sugiere que la distinción ontológica entre "conocimiento cognitivo" y "decisión operacional" es artificial en este contexto. El sistema real no la respeta.

### 3.8 Veredicto parcial — Learning

```
Criterio 1 (nuevo conocimiento):     ⚠️ Teóricamente sí, prácticamente no
Criterio 2 (boundary):               ❌ No existe
Criterio 3 (ciclo evolutivo):        ❌ No aplica
Criterio 4 (absorbible):             ✅ Ya absorbido funcionalmente por sistema operacional
Criterio 5 (pérdida real):           ❌ Nada
```

**Learning cognitivo no es una capa en el sistema actual. Es un diseño teórico.** Su función está duplicada por el Learning operacional existente (ADR-003).

---

## 4. Contradicciones globales

### Contradicción 1 — Pipeline sin flujo

La arquitectura afirma el pipeline:

```
EE → Memory → Learning
```

Pero en el código real:

```
EE → (output discarded) → /dev/null
Memory → (does not exist)
Learning → (does not exist)
```

**El pipeline no transporta datos entre capas.** La afirmación de que las tres capas forman un pipeline es falsa en el sistema actual. No hay flujo.

Esto no es un problema temporal de implementación. Es una contradicción entre la teoría arquitectónica y la realidad del sistema. La arquitectura describe un sistema que no existe.

### Contradicción 2 — Capas sin código vs. código sin capas

La arquitectura define 3 capas cognitivas:

| Capa | Código | Estado real |
|------|--------|-------------|
| EE | ✅ Existe (378 tests) | Produce output descartado |
| Memory | ❌ No existe | Diseño conceptual |
| Learning | ❌ No existe | Diseño conceptual + confusión con Learning operacional |

Mientras tanto, el sistema operacional tiene múltiples subsistemas que NO están representados en la arquitectura cognitiva:

- Fare learning / routing (`src/lib/services/learning/`)
- Policy engine con adaptation (`src/lib/services/learning/policy-engine.ts`)
- SessionMemory (`src/lib/services/memory/memory.ts`)

**Hay más arquitectura real no documentada que arquitectura documentada.** La ontología cognitiva describe ~20% del sistema.

### Contradicción 3 — Eliminación de Goals/Planning vs. existencia de Learning operacional

Goals y Planning fueron eliminadas del pipeline cognitivo argumentando que producen "instrucciones, no conocimiento".

Pero `src/lib/services/learning/` contiene exactamente eso:
- `policy-engine.ts` — decide qué acciones tomar (Planning)
- `adaptation.ts` — ajusta comportamiento según resultados (Goals)
- `routing.ts` — prioriza oportunidades (Goals)

La eliminación de Goals/Planning como capas cognitivas no eliminó su función — solo la ocultó dentro del "Learning operacional". Esto es una **elisión arquitectónica**: la función existe pero no está modelada.

### Contradicción 4 — La "carga cognitiva" no tiene hogar

Los conceptos de la ontología cognitiva — Belief, Decision, Pattern — están diseñados para informar decisiones operacionales. Pero:

1. **Belief y Decision** (EE) se construyen y descartan sin informar nada
2. **Pattern** (Learning) no existe, pero el Learning operacional ya toma decisiones sin Patterns

Esto sugiere que la ontología cognitiva completa (EE → Memory → Learning) es una **solución en busca de un problema**. El sistema opera efectivamente sin ella.

---

## 5. Síntesis de absorbibilidad

| Capa | ¿Absorbible? | ¿En qué? | ¿Violación de invariantes? |
|------|-------------|----------|---------------------------|
| **EE** | ✅ 100% | Pipeline operacional (handler → core → policy) | 0 invariantes violados |
| **Memory** | ✅ 100% | SessionMemory operacional (buildMemory) | 0 invariantes violados |
| **Learning** | ✅ 100% | Learning operacional existente (ADR-003) | 0 invariantes violados |

**Las tres capas son 100% absorbibles en el sistema operacional existente sin violar invariantes.**

---

## 6. Veredicto

### Decisión: **D — La arquitectura completa contiene una contradicción que obliga a rediseñar el pipeline.**

### Demostración

La arquitectura cognitiva actual se basa en la premisa fundamental:

> P: "EE produce conocimiento que Memory preserva para que Learning descubra patrones."

Esta premisa es **falsa en el sistema actual** por tres razones independientes:

1. **P₁**: El output del EE es descartado (lead.service.ts:83). No llega a Memory porque Memory no existe y porque el valor de retorno nunca se captura. → **Premisa refutada por el código.**

2. **P₂**: Memory no existe. No hay capa que preserve el conocimiento del EE. → **Premisa refutada por ausencia de implementación.**

3. **P₃**: Learning cognitivo no existe. Learning operacional (ADR-003) existe pero es un sistema diferente que no consume ni produce Patterns. → **Premisa refutada por ausencia de implementación.**

### Implicancia

No es que el pipeline esté incompleto (Memory y Learning sin implementar). Es que **el pipeline como teoría arquitectónica es inconsistente**:

- Afirma un flujo de datos que no ocurre
- Define capas cuya función está duplicada en el sistema operacional
- Eliminó Goals/Planning del modelo cognitivo pero sus funciones persisten sin modelar en el Learning operacional

### La contradicción exige una de dos resoluciones:

**Opción A:** Aceptar que la arquitectura cognitiva describe un sistema futuro, no el actual. Reducir el alcance documentado a solo lo que existe y funciona.

**Opción B:** Reconectar el pipeline real —capturar el ShadowResult, implementar Memory, implementar Learning— o demostrar que no son necesarios y simplificar la arquitectura a lo que realmente importa.

**El veredicto D no afirma que las capas deban eliminarse. Afirma que la teoría arquitectónica actual contradice la realidad del sistema.** Mientras esta contradicción exista, ninguna auditoría de irreducibilidad puede producir conclusiones válidas, porque las premisas del pipeline son falsas.

---

## 7. Nota metodológica

Esta auditoría se realizó desde **primeros principios**, ignorando deliberadamente:
- PR-3 (EE Freeze)
- PR-5 (Memory Architecture)
- PR-7 (Learning audits)
- ADR-009, ADR-010, ADR-011

Cada conclusión se deriva del código fuente real y de los documentos arquitectónicos como data primaria, no como autoridad.

El hallazgo central —que `runShadowCognition()` descarta su retorno— fue verificado en `src/lib/services/lead.service.ts:83` y es una contradicción verificable entre la arquitectura documentada y el código en producción.
