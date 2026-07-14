# PR-12A — Decision Integration Audit (DIA-1)

> **Auditor:** Arquitecto de Software Senior — especializado en arquitecturas cognitivas y sistemas conversacionales  
> **Propósito:** Determinar si existe un contrato arquitectónico faltante entre el Evidence Engine y el pipeline conversacional  
> **Premisa:** No asumir que el EE debe influir en la conversación. No asumir que existe una brecha.  
> **Metodología:** Análisis comparativo de modelos (Decision vs StrategyDecision), auditoría de consumidores, verificación de contratos existentes  
> **Documentos auditados:** ADR-008, ADR-009, ADR-010, ADR-011, ARCHITECTURE_STATUS.md, PR-12/CXA-1, código fuente (decision.ts, conversation-strategy.ts, shadow-result.ts, types.ts, lead.service.ts)  
> **Fecha:** 2026-07-14

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Modelo comparativo: Decision vs StrategyDecision](#2-modelo-comparativo-decision-vs-strategydecision)
3. [Hallazgos](#3-hallazgos)
4. [Riesgos](#4-riesgos)
5. [Recomendaciones](#5-recomendaciones)
6. [Veredicto final](#6-veredicto-final)

---

## 1. Resumen ejecutivo

PR-12 (CXA-1) detectó que el Evidence Engine no produce impacto conversacional y postuló la existencia de una "Epistemic-Conversational Gap" (ECG). PR-12A audita esa conclusión mediante análisis de contratos arquitectónicos.

**Resultado: La ECG no es una brecha arquitectónica. Es una separación deliberada y correcta entre dos arquitecturas que resuelven problemas diferentes.**

La auditoría demuestra que:

1. **Decision (EE) y StrategyDecision (Operacional) pertenecen a niveles arquitectónicos distintos.** Decision responde "¿el input es epistémicamente sólido?" StrategyDecision responde "¿cómo conducir esta conversación?" No hay solapamiento ontológico.

2. **El consumidor designado de Decision no es el pipeline operacional.** ADR-009 y ADR-010 establecen que Decision será consumida por **Memory** (futuro), que a su vez alimentará a **Pattern Discovery** (futuro). El pipeline operacional nunca fue diseñado como consumidor del EE.

3. **No existe un contrato faltante porque nunca existió una relación contractual prevista.** La ausencia de integración entre EE y operacional no es un bug — es una decisión arquitectónica explícita, documentada en I5-EE: "No conversation impact."

4. **PR-12 confundió "separación arquitectónica" con "brecha."** La separación entre capa epistémica y capa pragmática es un patrón de diseño correcto. Fusionarlas sin justificación violaría la arquitectura.

**Veredicto: NO EXISTE BRECHA ARQUITECTÓNICA.**

---

## 2. Modelo comparativo: Decision vs StrategyDecision

### 2.1 Comparación fundamental

| Dimensión | Decision (EE) | StrategyDecision (Operacional) |
|---|---|---|
| **Ontología** | Epistémico-cognitiva | Estrategia conversacional |
| **Pregunta que responde** | "¿El sistema puede formar una creencia válida sobre este input?" | "¿Cómo debe conducirse esta conversación?" |
| **Lenguaje** | `readiness` (ready/partial/invalid), `validInput`, `missingInfo`, `isDecided` | `mode` (execute/clarify/answer), `tone` (urgent/warm/direct/gentle), `speed` (fast/normal/slow), `behaviorFlags` |
| **Input** | Belief (epistémico) | purchaseIntent, clientObjective, messageType, intent, OutputType (pragmáticos) |
| **Output** | Compromiso cognitivo: "el sistema decide que el input es cognitivamente procesable" | Plan conversacional: "responder con modo X, tono Y, velocidad Z" |
| **Pureza** | Pura, inmutable | Pura, sin side effects |
| **Consumidor** | Memory (futuro) → Pattern Discovery (futuro) | Policies → LLM → Response |
| **Posición en pipeline** | Final del EE (cognitivo) | Antes de Policies (operacional) |
| **Freeze** | ADR-009 (Evidence Engine — frozen) | ADR-008 (Conversational Decision — frozen) |
| **Autoridad** | Decide sobre el input | Decide sobre la respuesta |

### 2.2 Mapeo de solapamientos potenciales

Se evaluaron todos los campos de ambos modelos para detectar solapamiento:

| Campo | ¿Existe equivalente en el otro modelo? | Veredicto |
|---|---|---|
| `Decision.readiness` | ❌ No — readiness es calidad epistémica | Único del EE |
| `Decision.validInput` | ❌ No — validación cognitiva vs validación operacional | Ontológicamente distinto |
| `Decision.missingInfo` | ⚠️ Parcial — StrategyDecision tiene `fieldPriority` pero son conceptos diferentes: missingInfo es auto-diagnóstico epistémico; fieldPriority es prioridad de adquisición pragmática | Diferente nivel |
| `Decision.isDecided` | ❌ No — es shortcut de readiness | Único del EE |
| `StrategyDecision.mode` | ❌ No — es estrategia conversacional | Único operacional |
| `StrategyDecision.tone` | ❌ No — es calidad de respuesta | Único operacional |
| `StrategyDecision.speed` | ❌ No — es ritmo conversacional | Único operacional |
| `StrategyDecision.behaviorFlags` | ❌ No — son decisiones de comportamiento | Único operacional |

**Conclusión: 0 solapamiento directo.** Los modelos operan en dominios ontológicos diferentes. No hay redundancia — hay ortogonalidad.

### 2.3 ¿Pertenecen al mismo nivel arquitectónico?

**NO.** La evidencia es concluyente:

1. **Pipelines separados:** Decision está al final del pipeline cognitivo (ADR-009). StrategyDecision está en el pipeline operacional (ADR-008). No comparten etapa ni consumidores.

2. **Freezes independientes:** ADR-009 (EE Freeze) y ADR-008 (StrategyDecision Freeze) son declaraciones separadas que protegen dominios distintos. No hay cross-reference entre ellos.

3. **Ontologías disjuntas:** El lenguaje de Decision (readiness, missingInfo, validInput) no aparece en StrategyDecision y viceversa (mode, tone, speed no aparecen en el EE).

4. **Responsabilidades no conectadas:** Decision determina calidad epistémica del input. StrategyDecision determina estrategia de respuesta. Una no presupone la otra.

---

## 3. Hallazgos

### H1 — El consumidor de Decision no es el pipeline operacional

**Evidencia:**

ADR-009 §7 (tabla de capas futuras) establece que el sucesor de Decision en el pipeline cognitivo es **Memory**:

> | **Memory** | Decision pipeline complete | `storeToMemory(belief, decision, sessionContext)` → `Memory` |

ADR-010 §PR-5A confirma:

> **Primary consumers** | Pattern Discovery (pattern extraction) — futuro

Ningún documento — ADR-008, ADR-009, ADR-010, ARCHITECTURE_STATUS.md — menciona al pipeline operacional (StrategyDecision, Policies, LLM) como consumidor de Decision.

**Conclusión:** El consumer designado de Decision es Memory (futuro), no StrategyDecision. La ausencia de consumo operacional no es una brecha — es fidelidad al diseño.

### H2 — I5-EE establece explícitamente que el EE no afecta la conversación

**Evidencia:**

ADR-009 I5-EE:

> **I5-EE — No conversation impact** — the pipeline never sends messages, never modifies conversational state, never affects the user experience.

**Enforcement:** Shadow Mode pattern. Todas las capas del EE están protegidas por el feature flag `EVIDENCE_SHADOW_MODE` (default false). Aún cuando está habilitado, el output se descarta.

**Conclusión:** No solo no hay integración — hay un invariante que EXPLÍCITAMENTE la prohíbe. Cualquier integración requeriría modificar ADR-009.

### H3 — PR-12 confundió separación arquitectónica con brecha

PR-12 concluyó que existe una "Epistemic-Conversational Gap" porque el EE no influye en la conversación. Pero esa "gap" es en realidad la línea divisoria entre dos arquitecturas con propósitos diferentes:

```
Arquitectura Cognitiva (EE):   Signal → ... → Decision
                                    ↓
                           [LÍMITE ARQUITECTÓNICO] ← no es una brecha
                                    ↓
Arquitectura Operacional:    CORE → SD → Policies → Response
```

La metáfora correcta no es un "puente faltante" sino una **muralla deliberada**. El EE no debe influir en la conversación porque no es su responsabilidad. Su responsabilidad es ser la base epistémica para las capas cognitivas futuras.

### H4 — Si existe un deseo de integración, es un requisito nuevo, no un contrato faltante

**Evidencia:** No hay ningún documento arquitectónico que describa una relación contractual entre el EE y el pipeline operacional.

| ¿Existe contrato? | Entre | Estado |
|---|---|---|
| ADR-009 → ADR-010 | EE → Memory | ✅ Sí (ADR-010 define store()) |
| ADR-010 → PR-7 | Memory → Pattern Discovery | ✅ Sí (PR-7D define contratos) |
| ADR-008 → Policies | StrategyDecision → Policies | ✅ Sí (ADR-008 define modo/tono/speed) |
| ADR-009 → ADR-008 | EE → StrategyDecision | ❌ **No existe — y no es necesario** |

La ausencia de este contrato no es un defecto. Es consecuencia de que ambas arquitecturas fueron diseñadas para ser independientes. Si mañana se decide que el EE debe influir en StrategyDecision, ese sería un **nuevo requisito arquitectónico** que requeriría:
1. Un nuevo ADR que modifique el freeze de ADR-008 o ADR-009
2. Un contrato formal entre EE y StrategyDecision
3. Justificación de por qué las señales operacionales existentes son insuficientes

### H5 — Análisis de las 4 categorías posibles

La pregunta del auditoría es si la "brecha" corresponde a:

| Categoría | ¿Aplica? | Justificación |
|---|---|---|
| **A) Ausencia de integración** | ❌ **No** | No es ausencia — es separación deliberada. No hay integración porque nunca se diseñó una. |
| **B) Decisión deliberada del diseño** | ✅ **Sí** | I5-EE, Shadow Mode, y la separación cognitivo/operacional son decisiones explícitas. |
| **C) Redundancia con componentes ya existentes** | ⚠️ **Parcialmente** | Los campos del EE que podrían tener equivalente operacional (hasContent, channel) son redundantess. Los únicos (readiness, missingInfo) son ontológicamente distintos pero no hay consumidor operacional para ellos. |
| **D) Contrato arquitectónico no formalizado** | ❌ **No** | No existe un contrato faltante porque no existe una relación contractual prevista. |

---

## 4. Riesgos

### 4.1 Riesgo de integrar sin contrato formal

Si se decidiera conectar el EE al pipeline operacional sin un contrato formal, los riesgos son:

| ID | Riesgo | Severidad | Descripción |
|---|---|---|---|
| **R1** | Acoplamiento indebido | ALTA | El pipeline operacional comenzaría a depender de la estructura interna del EE. Cambios en el EE (aunque hoy está frozen) afectarían el comportamiento conversacional. |
| **R2** | Duplicación de responsabilidades | MEDIA | StrategyDecision ya determina tono, modo y velocidad basándose en señales operacionales. Agregar señales del EE crearía dos caminos para decidir lo mismo, con posible conflicto. |
| **R3** | Ruptura separación cognitivo/operacional | ALTA | La separación entre ambas arquitecturas es un pilar del diseño. Fusionarlas total o parcialmente sin ADR violaría la arquitectura y crearía una dependencia no gestionada entre dominios que deben evolucionar independientemente. |
| **R4** | Contaminación de límites (ADR-008 §9) | ALTA | ADR-008 §9 prohíbe "introducir nuevas fuentes de verdad" y "agregar pipelines paralelos." Inyectar señales del EE en StrategyDecision podría constituir ambas violaciones. |
| **R5** | Falsa expectativa de mejora | MEDIA | Integrar el EE sin evidencia de que sus señales agregan valor real sobre las operacionales existentes generaría complejidad sin beneficio conversacional demostrable. |

### 4.2 Riesgo de NO integrar

| ID | Riesgo | Severidad | Descripción |
|---|---|---|---|
| **R6** | EE percibido como irrelevante | BAJA | Si el equipo esperaba que el EE mejorara la conversación, podría percibirse como un ejercicio inútil. Esto se mitiga con documentación clara del propósito real del EE (base para capas cognitivas futuras). |

---

## 5. Recomendaciones

### 5.1 No integrar el EE con el pipeline operacional

**Justificación:** La integración no está justificada porque:
1. Las señales del EE son epistémicas, no conversacionales.
2. StrategyDecision ya cubre las decisiones conversacionales con señales operacionales.
3. La integración violaría I5-EE y requeriría modificar ADR-009 o ADR-008.
4. No hay evidencia de que las señales del EE agreguen valor conversacional no cubierto por las señales operacionales existentes.

### 5.2 Preservar la separación arquitectónica

Mantener el EE como fundamento epistémico para las capas cognitivas futuras (Memory → Pattern Discovery), sin conexión directa al pipeline operacional. Esta es la arquitectura diseñada y documentada.

### 5.3 Si en el futuro se desea integración

Si surge un requisito conversacional que REQUIERA señales del EE (no cubierto por señales operacionales), se debe:
1. Crear un ADR que documente el nuevo requisito.
2. Demostrar que las señales operacionales existentes son insuficientes.
3. Definir un contrato formal entre EE y StrategyDecision que preserve:
   - I5-EE: el EE no debe modificarse.
   - ADR-008: StrategyDecision sigue siendo la única fuente de verdad.
   - La información propagable vs. no propagable (ver §5.4).
4. Implementar la integración como un adaptador o transformación, no como acoplamiento directo.

### 5.4 Información propagable vs. no propagable (solo si se requiere integración futura)

Basado en el análisis ontológico:

| Información | ¿Propagable? | Razón |
|---|---|---|
| `Decision.readiness` | 🟡 Condicional | Podría informar confianza, pero StrategyDecision ya deriva modo de señales operacionales más ricas. |
| `Decision.missingInfo` | 🟡 Condicional | Podría corroborar gaps, pero el slot-workflow operacional es más preciso. |
| `Belief.isWellFormed` | ❌ No | Es redundante con validación operacional. |
| `Belief.channel` | ❌ No | Ya conocido en webhook. |
| `Signal.*`, `Observation.*`, `Fact.*`, `Evidence.*`, `Knowledge.*` | ❌ No | Internos del EE. Sin valor conversacional directo. |
| `ShadowResult.isComplete` | ❌ No | Indica completitud del pipeline cognitivo, no de la conversación. |

### 5.5 Acción recomendada para PR-12

Revisar la conclusión de PR-12: la "Epistemic-Conversational Gap" no es una brecha arquitectónica. Es la correcta separación entre dos dominios. PR-12 debe reclasificarse como:

> **"Auditoría de la relación entre arquitectura cognitiva y operacional: confirmación de que la separación actual es correcta y deliberada."**

No como:

> **"Detección de una brecha que debe cerrarse."**

---

## 6. Veredicto final

### NO EXISTE BRECHA ARQUITECTÓNICA.

### Justificación

La conclusión se basa en cuatro líneas de evidencia independientes:

**1. Consumidor designado (ADR-009 + ADR-010)**

El consumidor de Decision no es el pipeline operacional (StrategyDecision, Policies, LLM). Es **Memory** (capa cognitiva futura), que a su vez alimentará a **Pattern Discovery** (también futuro). Esta cadena está documentada en ADR-009 §7 y ADR-010 §PR-5A. La ausencia de consumo operacional no es una omisión — es fidelidad al diseño.

**2. Invariante explícito (ADR-009 I5-EE)**

El Evidence Engine tiene un invariante que prohíbe explícitamente el impacto conversacional: "No conversation impact — the pipeline never sends messages, never modifies conversational state, never affects the user experience." Cualquier reclamo de que "falta" integración entre EE y conversación ignora que dicha integración está arquitectónicamente prohibida.

**3. Dominios ontológicos disjuntos (código fuente)**

Decision opera en el dominio epistémico: readiness, validInput, missingInfo, isDecided. StrategyDecision opera en el dominio pragmático: mode, tone, speed, behaviorFlags. No comparten lenguaje. No compran responsabilidades. No hay solapamiento — hay ortogonalidad. No hay una "brecha" entre dos cosas que nunca debieron estar conectadas.

**4. Ausencia de contrato faltante**

Un contrato faltante presupone una relación contractual prevista pero no formalizada. No hay ningún documento arquitectónico que prevea una relación entre el EE y el pipeline operacional. ADR-008 (StrategyDecision freeze) no menciona el EE. ADR-009 (EE freeze) no menciona StrategyDecision. La ausencia de contrato no es un defecto — es la consecuencia natural de que ambas arquitecturas fueron diseñadas para ser independientes.

### Corrección a PR-12

PR-12 concluyó: "NO — La arquitectura actual no puede generar una mejora conversacional perceptible utilizando únicamente el Evidence Engine."

Esa conclusión es **correcta en los hechos** pero **incorrecta en la interpretación**. El EE no puede mejorar la conversación no porque haya una brecha que deba cerrarse, sino porque **no es su función**. Es como concluir que "el motor no puede mover las ruedas" en un auto donde el motor impulsa un generador que carga una batería que alimenta un motor eléctrico — y luego decir que falta una conexión entre el motor de combustión y las ruedas. La conexión existe, pero a través de los componentes intermedios diseñados para ese propósito (Memory → Pattern Discovery).

El EE mejora la conversación **indirectamente**, a través de las capas cognitivas futuras que construirán sobre él. Intentar una conexión directa sería un cortocircuito arquitectónico.

---

*Fin de PR-12A — Decision Integration Audit (DIA-1)*
