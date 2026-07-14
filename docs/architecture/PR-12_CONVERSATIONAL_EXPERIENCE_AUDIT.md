# PR-12 — Conversational Experience Architecture Audit (CXA-1)

> **Auditor:** Arquitecto de Sistemas Conversacionales + Auditor UX especializado en asistentes con arquitectura cognitiva
> **Propósito:** Determinar si la arquitectura actual permite que las mejoras cognitivas sean percibidas por el usuario durante una conversación
> **Metodología:** Análisis de brecha entre razonamiento epistémico (EE) y comportamiento conversacional (operacional). Aplicación del mismo rigor de eliminación que PR-6 a PR-10.
> **Documentos auditados:** ADR-009, ADR-008, ADR-010, ADR-011, ARCHITECTURE_STATUS.md, lead.service.ts (código), conversation-strategy.ts (código), run-shadow-cognition.ts (código), shadow-result.ts, belief.ts, decision.ts
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Capacidades conversacionales actuales del EE](#2-capacidades-conversacionales-actuales-del-ee)
3. [Capacidades que dependen de Memory](#3-capacidades-que-dependen-de-memory)
4. [Capacidades que dependen de Pattern Discovery](#4-capacidades-que-dependen-de-pattern-discovery)
5. [Capacidades que dependen de Goals y Planning](#5-capacidades-que-dependen-de-goals-y-planning)
6. [Brechas arquitectónicas detectadas](#6-brechas-arquitectónicas-detectadas)
7. [Riesgos](#7-riesgos)
8. [Recomendaciones](#8-recomendaciones)
9. [Veredicto final](#9-veredicto-final)

---

## 1. Resumen ejecutivo

Se analizó la arquitectura AITOS desde la perspectiva del usuario final para determinar si el Evidence Engine (EE) —la única capa cognitiva implementada— puede generar mejoras conversacionales perceptibles. La respuesta es **negativa**, y la razón no es trivial.

**Hallazgo central:** Existe una brecha arquitectónica fundamental entre el **razonamiento epistémico** del Evidence Engine y el **comportamiento conversacional** de la capa operacional. El EE determina "qué sabe el sistema sobre este mensaje." La capa operacional decide "qué dice el sistema en respuesta." Actualmente no hay ningún mecanismo que traduzca lo primero en lo segundo.

**El EE es estructuralmente valioso — pero su valor no es conversacional.** Su propósito arquitectónico real es servir como **fundamento epistémico** para las capas cognitivas futuras (Memory, Pattern Discovery). Intentar usarlo para mejorar la conversación hoy requeriría un puente arquitectónico que no existe y que el diseño actual no modela.

El veredicto se justifica mediante la aplicación del mismo rigor de eliminación usado en PR-6 a PR-10: se intentó demostrar que el EE puede generar mejoras conversacionales sin necesidad de capas adicionales. No fue posible.

---

## 2. Capacidades conversacionales actuales del EE

### 2.1 What each EE layer produces

| Capa EE | Output | ¿Qué información conversacional nueva produce? | ¿Agrega valor sobre lo que ya tiene el pipeline operacional? |
|---|---|---|---|
| **Signal** | Raw message, channel, receivedAt, conversationId | ❌ Ninguna — el handler ya tiene el mensaje crudo | Redundante total |
| **Observation** | Temporal validation (valid/invalid) | ❌ Ninguna — el webhook ya validó el mensaje | Redundante total |
| **Fact** | 5 Facts estructurales (observation validated, channel, content present, timestamp, conversation identified) | ❌ Ninguna — el handler ya procesa estos checks | Redundante total |
| **Evidence** | Colección inmutable de Facts bajo una Observation | ❌ Ninguna — agrupación, no nuevo conocimiento | Redundante total |
| **Knowledge** | Campos consolidados: observationStatus, channel, hasContent, receivedAt, conversationId | ⚠️ Mínima — el sistema "sabe" que recibió contenido válido | Parcialmente redundante (la mayoria ya se deriva en el handler) |
| **Belief** | Epistemic stance: observationValid, channel, hasContent, receivedAt, conversationId, isWellFormed | 🟡 **Potencialmente nueva** — "el sistema cree que..." es una cualidad epistémica, no un hecho | **Único:** La postura epistémica no existe en el pipeline operacional |
| **Decision** | Cognitive determination: validInput, readiness (ready/partial/invalid), missingInfo, isDecided | 🟡 **Potencialmente nueva** — "el sistema decide que el mensaje es cognitivamente completo o no" | **Único:** El concepto de readiness cognitiva no existe en el pipeline operacional |

### 2.2 Outputs únicos del EE

Dos outputs del EE NO tienen equivalente en el pipeline operacional:

1. **Belief.isWellFormed** — El sistema cree que la entrada está epistémicamente completa. Esto no es lo mismo que "tiene todos los slots" (operacional). Es "tiene los campos epistémicos necesarios para formar una creencia."

2. **Decision.readiness** — El sistema determina si el input es cognitivamente procesable (ready), parcialmente informado (partial), o inválido (invalid). Este es un concepto ontológicamente distinto de cualquier señal operacional.

### 2.3 Problema: estos outputs no llegan a la conversación

Incluso estos dos outputs únicos no pueden generar mejoras conversacionales porque:

1. **El output del EE se descarta** — `lead.service.ts:83` asigna `runShadowCognition()` a nada. El ShadowResult muere inmediatamente.
2. **No hay mecanismo de influencia** — Aunque se capturara, no existe código que lea `Decision.readiness` o `Belief.isWellFormed` y ajuste el comportamiento conversacional.
3. **StrategyDecision no los consume** — `computeStrategyDecision()` (líneas 48-230 de conversation-strategy.ts) sintetiza únicamente señales operacionales: purchaseIntent, urgency, messageType, isCorrection, clientObjective, decision (OutputType), intent. No recibe ningún campo del EE.

### 2.4 Intento de eliminación

Se evaluó si el EE puede generar mejoras conversacionales *sin* conectar sus outputs al pipeline operacional.

**Hipótesis:** El EE, corriendo en Shadow Mode aunque sea invisible, mejora indirectamente la conversación al generar conocimiento que eventualmente podría usarse.

**Resultado:** ❌ Refutada. El Shadow Mode es explícitamente "sin impacto en la conversación" (ADR-009 I5-EE: "No conversation impact — the pipeline never sends messages, never modifies conversational state, never affects the user experience"). No puede haber mejora conversacional sin un mecanismo que conecte el output cognitivo con la decisión conversacional.

**Veredicto:** El EE, por sí solo y en su estado actual, **no produce ninguna mejora conversacional perceptible para el usuario.**

---

## 3. Capacidades que dependen de Memory

### 3.1 Mejoras conversacionales que Memory habilitaría

| Mejora | Descripción | Dependencia |
|---|---|---|
| **Continuidad epistémica entre turnos** | El sistema sabe lo que "creía" y "decidió" en turnos anteriores. Puede referirse a su propio razonamiento previo. | Memory (almacenar Belief+Decision por turno) |
| **Detección de contradicciones** | Si el sistema "decidió ready" en el turno anterior pero "decide partial" en este, puede detectar la inconsistencia y preguntar. | Memory (comparar Decision entre turnos) |
| **Traza cognitiva** | El sistema puede explicar "cómo llegó a esa conclusión" basado en la cadena epistémica de turnos previos. | Memory (historial de snapshots) |
| **Personalización por historia cognitiva** | El sistema recuerda cómo procesó mensajes anteriores del mismo usuario y ajusta su estrategia. | Memory + consulta por conversationId |

### 3.2 Limitación actual

Sin Memory, el EE es efímero. El Belief+Decision de cada turno se construye y se destruye en el mismo request. No hay huella cognitiva entre turnos. Esto limita severamente cualquier mejora conversacional que requiera consistencia histórica.

**Veredicto:** Memory es **necesaria** para cualquier mejora conversacional que requiera continuidad entre turnos. Sin Memory, la conversación es epistémicamente "sin memoria" — cada turno empieza desde cero.

---

## 4. Capacidades que dependen de Pattern Discovery

### 4.1 Mejoras conversacionales que Pattern Discovery habilitaría

| Mejora | Descripción | Dependencia |
|---|---|---|
| **Adaptación proactiva** | El sistema detecta patrones en el comportamiento del usuario a lo largo de múltiples conversaciones (ej: "siempre pide precio primero, reserva después") y ajusta su estrategia. | Pattern Discovery + Memory histórico |
| **Sugerencias optimizadas** | Las sugerencias de viaje se basan en patrones históricos de aceptación, no solo en reglas fijas. | Pattern Discovery (análisis de outcomes históricos) |
| **Anticipación de necesidades** | El sistema detecta que cierto patrón de comportamiento (ej: preguntar por "Foz" sin especificar destino) precede consistentemente a una solicitud de presupuesto. | Pattern Discovery (correlaciones) |

### 4.2 Limitación actual

Pattern Discovery es diseño futuro (0% implementado). Ninguna de estas mejoras existe ni puede implementarse sin Memory primero. Pattern Discovery depende de Memory como fuente de datos históricos.

**Veredicto:** Pattern Discovery es necesaria para mejoras conversacionales adaptativas y predictivas. Pero no bloquea las mejoras epistémicas inmediatas que podría proporcionar el EE conectado. Pattern Discovery es un habilitador de segunda generación.

---

## 5. Capacidades que dependen de Goals y Planning

### 5.1 Estado actual

Goals y Planning fueron **eliminados como capas cognitivas independientes** (PR-8A…PR-8G, PR-9A…PR-9G, confirmado por ADR-011 y ARCHITECTURE_STATUS.md). Sus funciones persisten dentro del Learning operacional (ADR-003) y la capa StrategyDecision.

### 5.2 Lo que NO depende de Goals/Planning

| Capacidad | ¿Depende de Goals/Planning? | Sustituto actual |
|---|---|---|
| Decidir modo de respuesta | ❌ No | StrategyDecision (ADR-008) |
| Determinar urgencia | ❌ No | ClientObjective + StrategyDecision |
| Planificar adquisición de campos | ❌ No | StrategyDecision.fieldPriority |
| Ejecutar políticas de negocio | ❌ No | Policy pipeline (Ahora/Reserva) |

### 5.3 Lo que Goals/Planning agregarían (si existieran)

| Capacidad | Descripción |
|---|---|
| **Compromiso con objetivos de conversación** | El sistema "decide" que el objetivo de esta conversación es X y planifica los pasos para lograrlo. |
| **Planificación multi-turno** | El sistema decide qué preguntar en este turno basándose en lo que planea preguntar en el próximo. |

### 5.4 ¿Son necesarias para mejorar la conversación?

**Intento de eliminación:** ¿Puede la conversación mejorar sin Goals/Planning?

**Resultado:** ✅ Sí. StrategyDecision ya proporciona una forma limitada pero funcional de planificación conversacional (mode, tone, speed, fieldPriority, behaviorFlags). Goals/Planning como capas cognitivas formales no son necesarias para las mejoras conversacionales inmediatas.

**Veredicto:** Goals y Planning no bloquean mejoras conversacionales. No son necesarias para PR-12.

---

## 6. Brechas arquitectónicas detectadas

### 6.1 Brecha principal: Epistemic-Conversational Gap (ECG)

Entre la última capa cognitiva (Decision del EE) y la respuesta conversacional existe una **capa implícita no modelada**: la traducción del estado epistémico a estrategia conversacional.

```
EE pipeline:                Signal → ... → Belief → Decision
                                                     ↓
                                              [BRECHA] ← NO MODELADO
                                                     ↓
Operational pipeline:  CORE → CI → SD → Policies → LLM → Response
```

**¿Qué produce esta brecha?**
- El EE produce: "el sistema cree que el mensaje es válido y decide que está cognitivamente listo" (readiness=ready)
- El pipeline operacional produce: "el sistema responde con un presupuesto detallado y tono cálido" (StrategyDecision)

No existe ningún mecanismo que lea `Decision.readiness` y lo traduzca en un ajuste de `StrategyDecision.tone` o `StrategyDecision.mode`.

### 6.2 Análisis de la brecha

**¿Puede resolverse dentro del diseño actual?**

✅ **Sí, parcialmente.** Si se capturara el ShadowResult y se inyectaran campos seleccionados del EE como señales adicionales en `computeStrategyDecision()`, la brecha se reduciría. Esto no violaría ningún freeze porque:
- El EE permanece frozen (solo se lee su output, no se modifica)
- StrategyDecision permanece como única fuente de verdad (solo se agregan fuentes de señal)
- ADR-008 permite evolucionar capacidades de negocio

**¿Requiere una nueva responsabilidad arquitectónica?**

❌ **No.** No se necesita una nueva capa. La responsabilidad de "traducir estado epistémico a estrategia conversacional" puede ser un concern interno de `computeStrategyDecision()` o un módulo de transformación dentro de la capa operacional.

**¿Corresponde únicamente a la capa operacional de generación de respuestas?**

✅ **Sí.** La generación de respuestas (LLM + response-builder) es el destino natural de cualquier señal que influya en cómo se redacta la respuesta. Pero el nivel ESTRATÉGICO (mode, tone, fieldPriority) debe decidirse en StrategyDecision, no en el LLM.

### 6.3 Mapeo de señales EE → StrategyDecision

Se evaluó qué outputs del EE podrían alimentar a StrategyDecision:

| Señal EE | StrategyDecision field | ¿Agrega valor sobre señales operacionales existentes? |
|---|---|---|
| `Belief.isWellFormed` | `mode` (si no well-formed → clarify en vez de execute) | 🟡 **Mínimo.** El pipeline operacional ya detecta mensajes mal formados por otros medios. |
| `Decision.readiness` | `speed` + `mode` (si readiness=partial → slow+clarify) | 🟡 **Mínimo.** StrategyDecision ya deriva speed de messageType y clientObjective. |
| `Decision.missingInfo` | `fieldPriority` (añadir campos faltantes detectados epistémicamente) | 🟡 **Mínimo.** La detección operacional de campos faltantes (slot-workflow) es más rica. |
| `Belief.channel` | `tone` (diferente tono según canal) | 🟡 **Mínimo.** El canal ya se conoce en el webhook. |

**Conclusión de la evaluación:** Las señales del EE son **parcialmente redundantes** con las señales operacionales existentes en StrategyDecision. Inyectarlas agregaría un segundo punto de verificación (redundancia epistémica) pero no información conversacional nueva.

### 6.4 Brecha secundaria: Shadow Mode no tiene conexión con la respuesta

El Shadow Mode fue diseñado explícitamente para NO tener impacto conversacional (I5-EE). Esto es correcto para el propósito del EE como foundation. Pero significa que, por diseño, el EE **nunca** puede mejorar la conversación sin un cambio arquitectónico que establezca la conexión.

### 6.5 Intento de eliminación de la brecha

Se evaluó si la brecha ECG puede eliminarse (es decir, si realmente no existe).

**Argumento:** "StrategyDecision ya captura todo lo necesario para la conversación. El EE es redundante."

**Evaluación:** Parcialmente cierto. El pipeline operacional detecta:
- Intención (CORE)
- Tipo de mensaje (CI)
- Objetivo del cliente (ClientObjective)
- Urgencia (StrategyDecision)

El EE detecta:
- Validez epistémica del mensaje (Observation)
- Estructura del mensaje (Facts)
- Consolidación epistémica (Knowledge)
- Postura epistémica (Belief)
- Completitud cognitiva (Decision)

**Estos son dominios diferentes.** El operacional es PRAGMÁTICO (qué hacer). El EE es EPISTÉMICO (qué saber). No hay redundancia ontológica — hay ORTOGONALIDAD. Pero la brecha persiste porque no hay un mecanismo que convierta la información epistémica en comportamiento pragmático.

**Veredicto:** La brecha es real y no puede eliminarse por argumentación. Requiere un puente arquitectónico.

---

## 7. Riesgos

### 7.1 Riesgos activos

| ID | Riesgo | Severidad | Descripción |
|---|---|---|---|
| **R1** | El EE permanece desconectado de la conversación indefinidamente | ALTA | Sin un plan explícito para conectar el EE con StrategyDecision, el EE será siempre un ejercicio académico sin impacto en el usuario. |
| **R2** | Falsa sensación de progreso cognitivo | ALTA | El equipo puede creer que implementar el EE mejora la conversación. No es así. El EE mejora el RAZONAMIENTO, pero esto no se traduce automáticamente en mejor conversación. |
| **R3** | StrategyDecision se sobrecarga con señales irrelevantes | MEDIA | Si se conecta el EE sin evaluar qué señales agregan valor real, StrategyDecision puede volverse compleja sin beneficio conversacional. |
| **R4** | Shadow Mode como excusa para no conectar | MEDIA | El patrón Shadow Mode es seguro pero puede usarse para postergar indefinidamente la conexión real entre cognición y conversación. |
| **R5** | Memory y Pattern Discovery se diseñan sin considerar el impacto conversacional | MEDIA | Si Memory se implementa (IM-1) sin un plan para usar sus datos conversacionalmente, repetirá el mismo problema del EE: datos cognitivos que no influyen en la conversación. |

### 7.2 Riesgos mitigados

| ID | Riesgo | Mitigación |
|---|---|---|
| ~~R anterior~~ | El EE podría violar el freeze conversacional (ADR-008) | La conexión propuesta lee el EE pero no lo modifica. StrategyDecision sigue siendo la única fuente de verdad. Sin violación. |

---

## 8. Recomendaciones

### 8.1 Acción inmediata: Capturar ShadowResult

**No requiere nueva capa.** Solo modificar `lead.service.ts:82-84` para capturar el ShadowResult y exponerlo en el HandlerContext.

```
// Actual (descarta):
if (isEvidenceShadowModeEnabled()) {
  runShadowCognition({ text, phone, conversationId: conversation.id });
}

// Propuesto (captura):
const shadowResult = isEvidenceShadowModeEnabled()
  ? runShadowCognition({ text, phone, conversationId: conversation.id })
  : null;
```

Esto es exactamente lo que PR-11 ya identificó como "Resolución 3 — Capturar ShadowResult en lead.service.ts." Sigue pendiente.

### 8.2 Evaluar qué señales del EE deben influir en StrategyDecision

NO incorporar ciegamente todos los campos del EE. Evaluar cada uno contra el criterio: **"¿Esta señal permitiría una decisión conversacional que hoy no es posible?"**

Candidato más prometedor: `Decision.readiness` combinado con `Decision.missingInfo` — si el readiness es "partial" o "invalid", la estrategia conversacional debería priorizar clarificación sobre ejecución.

### 8.3 No crear una nueva capa arquitectónica

La brecha ECG NO justifica una nueva capa cognitiva. Se resuelve mediante:
1. Captura del ShadowResult (acción mínima)
2. Inyección de señales seleccionadas en StrategyDecision (evolución de capacidad existente)
3. Uso de las señales en la generación de respuestas (LLM prompt)

Esto respeta todos los freeze existentes y no introduce nueva ontología.

### 8.4 Para IM-1 (Memory): Incluir impacto conversacional en el diseño

Cuando se implemente Memory, NO diseñarla solo como "almacén de snapshots." Incluir desde el diseño:
- ¿Qué consultas conversacionales necesitará soportar? (no solo las de Pattern Discovery)
- ¿Cómo se traducirá un snapshot histórico en una mejor respuesta hoy?

---

## 9. Veredicto final

### ¿La arquitectura actual puede generar una mejora conversacional claramente perceptible para el usuario utilizando únicamente el Evidence Engine?

**NO.**

### Justificación

Se aplicó el mismo rigor de eliminación usado en PR-6 a PR-10. Se intentó demostrar que el EE, por sí solo, puede producir mejoras conversacionales. No fue posible por tres razones independientes, cualquiera de las cuales sería suficiente para el veredicto:

**Razón 1 — Desconexión arquitectónica (suficiente por sí sola)**

El output del EE se descarta en `lead.service.ts:83`. No hay ningún mecanismo —ni siquiera conceptual— que transfiera el resultado del razonamiento epistémico al comportamiento conversacional. La arquitectura tiene un agujero entre la decisión cognitiva y la respuesta conversacional. Hasta que ese agujero se cierre, el EE es invisible para el usuario.

**Razón 2 — Redundancia epistémico-pragmática**

Incluso si se conectara, los outputs únicos del EE (Belief.isWellFormed, Decision.readiness) informan sobre la calidad epistémica del mensaje, no sobre la estrategia conversacional. El pipeline operacional ya cubre las decisiones pragmáticas (qué preguntar, cómo responder, con qué urgencia) mediante CORE, ConversationInterpreter, ClientObjective y StrategyDecision. Las señales del EE serían mayormente redundantes.

**Razón 3 — Shadow Mode es explícitamente no-conversacional**

El EE fue diseñado con el invariante I5-EE: "No conversation impact — the pipeline never sends messages, never modifies conversational state, never affects the user experience." Romper este invariante para propósitos conversacionales requeriría modificar ADR-009 o crear un mecanismo de consulta que no violara el freeze. Ambos son cambios arquitectónicos no triviales.

### Conclusión ontológica

El Evidence Engine no es una capa conversacional. Es una capa **epistémica**. Su propósito es establecer qué sabe el sistema y con qué certeza, no qué dice el sistema ni cómo lo dice. Confundir "mejor razonamiento" con "mejor conversación" es un error de diseño que esta auditoría busca prevenir.

El verdadero valor conversacional del EE se realizará cuando:
1. **Memory** preserve el output del EE a través de turnos (continuidad epistémica)
2. **Pattern Discovery** extraiga patrones de ese historial (adaptación)
3. **StrategyDecision** consuma esos patrones como señales (influencia conversacional)

Ninguna de estas condiciones se cumple hoy.

**Veredicto: NO — La arquitectura actual no puede generar una mejora conversacional perceptible utilizando únicamente el Evidence Engine.**

---

*Fin de PR-12 — Conversational Experience Architecture Audit (CXA-1)*
