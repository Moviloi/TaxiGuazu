# Strategic Thinking vs Operational Execution Contract

> Contrato formal entre PLAN (Strategic Director) y BUILD (ARNÉS Director) que define con precisión qué información consume y produce cada fase, estableciendo la separación cognitiva definitiva del ecosistema.
>
> **Este contrato reemplaza cualquier interpretación anterior de la relación PLAN ↔ BUILD.**

---

## 1. Motivación

Durante la evolución del ecosistema AITOS se definió progresivamente la separación entre PLAN y BUILD:

| Fase | Documento original | Precisión |
|------|-------------------|-----------|
| PLAN | `MISSION_PHASE_ARCHITECTURE.md` §4 | Responsabilidades generales del SDL |
| BUILD | `MISSION_PHASE_ARCHITECTURE.md` §5 | Responsabilidades generales del AEL |

Sin embargo, estas definiciones carecían de un **modelo explícito de los tipos de información** que cada fase consume y produce. Esto generaba ambigüedad en los límites:

- ¿Puede PLAN inspeccionar código para fundamentar una decisión?
- ¿Puede BUILD recomendar un cambio de estrategia basado en hallazgos?
- ¿Cuándo termina el "pensamiento" y comienza la "ejecución"?
- ¿Qué información cruza la frontera PLAN → BUILD y BUILD → PLAN?

Este contrato resuelve estas preguntas formalizando **el tipo de información** que cada fase intercambia, no solo sus responsabilidades.

---

## 2. Principio fundamental

```
PLAN no ejecuta.
BUILD no piensa.

PLAN consume conocimiento.
BUILD consume decisiones.

PLAN produce decisiones.
BUILD produce evidencia.
```

Este principio es **irreducible**. Cualquier violación constituye una ruptura arquitectónica.

---

## 3. Definiciones

| Término | Definición |
|---------|-----------|
| **Conocimiento** | Información sobre el estado del proyecto, arquitectura, memoria, decisiones pasadas, documentación, historial. Es descriptivo. |
| **Decisión** | Una determinación estratégica: qué hacer, cuándo, bajo qué restricciones, con qué criterio de éxito. Es prescriptivo. |
| **Evidencia** | Resultado de una ejecución: hallazgos, mediciones, código escrito, tests pasados, certificaciones. Es verificable. |
| **Execution Plan** | Estructura JSON que contiene: objetivo, estado actual, evidencia considerada, pasos recomendados, restricciones, criterios de éxito, confianza, escalamiento. Es el vehículo de una **decisión**. |
| **Execution Report** | Informe que contiene: resultados de la ejecución, hallazgos, desviaciones, métricas, certificaciones, deuda descubierta. Es el vehículo de la **evidencia**. |

### Tipos de información

| Tipo | Naturaleza | Produce | Consume |
|------|-----------|---------|---------|
| **Conocimiento** | Descriptivo | PLAN | PLAN |
| **Decisión** | Prescriptivo | PLAN | BUILD |
| **Evidencia** | Verificable | BUILD | PLAN (como nuevo conocimiento) |

Flujo:

```
Conocimiento → PLAN → Decisión → BUILD → Evidencia → PLAN → (nuevo ciclo)
```

---

## 4. Contrato de PLAN (Strategic Director)

### 4.1 Qué conoce PLAN

PLAN opera exclusivamente sobre conocimiento existente:

- Arquitectura del sistema (ADRs, contratos, freeze documents)
- Memoria del proyecto (decisiones pasadas, patrones, advertencias)
- Estado actual del proyecto (PROJECT_BOARD, CHANGELOG, ROADMAP)
- Baseline técnico (TECHNICAL_DEBT_BASELINE, ARCHITECTURE_STATUS)
- Documentación del producto y del ecosistema
- Historial de la misión actual y misiones anteriores
- Execution Reports previos (producidos por BUILD en ciclos anteriores)

PLAN **no descubre** conocimiento nuevo mediante inspección del código. PLAN recibe conocimiento ya consolidado.

### 4.2 Qué hace PLAN

- **Analiza**: Examina el conocimiento disponible para entender el estado de las cosas.
- **Razona**: Aplica pensamiento estratégico para evaluar opciones y consecuencias.
- **Valida**: Confirma que las decisiones pasadas (incluyendo Reports de BUILD) cumplen los criterios.
- **Recomienda**: Propone cursos de acción en lenguaje natural.
- **Decide**: Produce un Execution Plan estructurado que BUILD debe ejecutar.

### 4.3 Qué produce PLAN

Toda respuesta de PLAN DEBE contener los siguientes elementos en el bloque de cierre:

```
━━━━━━━━━━━━━━━━━━━━━━

Recommendation
(En lenguaje natural — resume qué hacer y por qué)

Execution Plan (JSON estructurado)
{
  "objective": "string — objetivo principal",
  "current_state": "string — estado actual según el conocimiento disponible",
  "evidence": ["string — referencias a documentos, reports, decisiones previas"],
  "recommended_workflow": ["string — pasos para BUILD"],
  "constraints": ["string — invariantes a respetar"],
  "success_criteria": ["string — condiciones medibles de éxito"],
  "confidence": number,
  "escalation_needed": boolean | string
}

Execution Status
READY | NOT READY

━━━━━━━━━━━━━━━━━━━━━━
```

### 4.4 Qué PLAN nunca hace

PLAN **nunca**:

| Acción | Motivo |
|--------|--------|
| Inspecciona código fuente | La inspección de código genera evidencia, no conocimiento. Es competencia de BUILD. |
| Audita archivos | La auditoría requiere ejecutar herramientas y examinar implementaciones. Es competencia de BUILD. |
| Ejecuta búsquedas (grep, glob, etc.) | La búsqueda descubre información no consolidada. PLAN solo consume conocimiento ya consolidado. |
| Modifica código o configuración | La modificación es ejecución. PLAN no ejecuta. |
| Produce Execution Reports | El Execution Report es evidencia de ejecución. PLAN produce decisiones, no evidencia. |
| Certifica tareas técnicas | La certificación requiere validar implementación. Es competencia de BUILD. |
| Invoca subagentes | Los subagentes ejecutan tareas operacionales. PLAN solo invoca BUILD (task: build). |
| Ejecuta bash, edit, write | Cualquier herramienta operacional está fuera del alcance de PLAN. |

---

## 5. Contrato de BUILD (ARNÉS Director)

### 5.1 Qué recibe BUILD

BUILD recibe **únicamente**:

- Un Execution Plan aprobado por el usuario.

No recibe contexto adicional. No recibe instrucciones informales. No recibe objetivos no estructurados. El Execution Plan es la **única fuente de autoridad** para BUILD.

### 5.2 Qué BUILD nunca hace

BUILD **nunca**:

| Acción | Motivo |
|--------|--------|
| Redefine los objetivos del Execution Plan | Los objetivos son determinación estratégica de PLAN. BUILD ejecuta, no decide. |
| Modifica la estrategia definida por PLAN | La estrategia es competencia exclusiva de PLAN. |
| Produce una Recommendation | La recomendación es una decisión estratégica. BUILD produce evidencia, no decisiones. |
| Produce un nuevo Execution Plan | El Execution Plan es el vehículo de la decisión estratégica. Solo PLAN lo produce. |
| Debate o cuestiona la estrategia | BUILD ejecuta. Si encuentra problemas, los reporta como hallazgos en el Execution Report. |

### 5.3 Qué BUILD sí puede hacer durante la ejecución

Durante la ejecución del plan, BUILD puede:

| Acción | Propósito |
|--------|-----------|
| Auditar código | Para verificar calidad, contratos e invariantes según el plan. |
| Inspeccionar archivos | Para entender el estado real de la implementación. |
| Buscar evidencia | Para fundamentar hallazgos y certificaciones. |
| Escribir código | Para implementar los cambios especificados en el plan. |
| Refactorizar | Para mejorar la calidad dentro del alcance definido. |
| Certificar | Para validar que los criterios de éxito se cumplen. |
| Ejecutar subagentes | Para delegar tareas especializadas (exploración, arquitectura, implementación, auditoría, memoria, aprendizaje). |
| Reportar hallazgos no previstos | Como parte del Execution Report, para que PLAN los considere en el próximo ciclo. |

### 5.4 Qué produce BUILD

BUILD produce un **Execution Report** que contiene:

```
━━━━━━━━━━━━━━━━━━━━━━

Execution Report

Plan Objective: (copia del objetivo del EP)
Execution Summary: (resumen de lo ejecutado)
Results:
  - (lista de resultados concretos)
Findings:
  - (hallazgos, desviaciones, deuda descubierta)
Certification:
  - Tests: PASS / FAIL (con evidencia)
  - Build: PASS / FAIL (con evidencia)
  - Contracts: PASS / FAIL (con evidencia)
Artifacts:
  - (archivos creados o modificados, documentos generados)
Next: (sugerencia no vinculante para PLAN)

━━━━━━━━━━━━━━━━━━━━━━
```

BUILD **nunca** incluye en su reporte:

- Recomendaciones estratégicas (eso es competencia de PLAN).
- Nuevos Execution Plans (eso es competencia de PLAN).
- Decisiones sobre el rumbo del proyecto.

---

## 6. Tipos de información intercambiada

### 6.1 Flujo PLAN → BUILD

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| **Objective** | Decisión | Qué debe lograr BUILD |
| **Current State** | Conocimiento | Contexto que PLAN ya analizó (referencias, no inspección) |
| **Evidence** | Conocimiento | Documentos que PLAN consideró (no necesita re-descubrir) |
| **Recommended Workflow** | Decisión | Pasos específicos a ejecutar |
| **Constraints** | Decisión | Reglas que BUILD debe respetar |
| **Success Criteria** | Decisión | Condiciones medibles que determinan éxito |
| **Confidence** | Decisión | Nivel de certeza de PLAN sobre el plan |
| **Escalation Needed** | Decisión | Si PLAN recomienda escalar a otro modelo |

El Execution Plan completo es una **decisión estructurada** que BUILD consume.

### 6.2 Flujo BUILD → PLAN

| Elemento | Tipo | Descripción |
|----------|------|-------------|
| **Plan Objective** | Evidencia | Confirmación de qué se ejecutó |
| **Execution Summary** | Evidencia | Resumen de acciones realizadas |
| **Results** | Evidencia | Outputs concretos de la ejecución |
| **Findings** | Evidencia | Hechos descubiertos durante la ejecución |
| **Certification** | Evidencia | Resultados de validaciones (tests, build, contratos) |
| **Artifacts** | Evidencia | Archivos creados o modificados |

El Execution Report completo es **evidencia verificable** que PLAN consume como nuevo conocimiento.

### 6.3 Regla de transformación

```
PLAN: Conocimiento → Decisión
BUILD: Decisión → Evidencia
PLAN: Evidencia → (nuevo) Conocimiento
```

No existen otros tipos de información cruzando la frontera PLAN ↔ BUILD.

---

## 7. Flujo oficial

```
Usuario presenta misión o problema
        │
        ▼
┌─────────────────────────────────────┐
│  PLAN (Strategic Director)          │
│                                     │
│  1. Consume conocimiento existente  │
│     (docs, reports, memoria,        │
│      historial, baseline)           │
│                                     │
│  2. Analiza, razona, valida         │
│                                     │
│  3. Produce:                        │
│     - Recommendation                │
│     - Execution Plan (JSON)         │
│     - Execution Status (READY/NOT)  │
└─────────────────────────────────────┘
        │
        ▼
Usuario aprueba ("ok" / "hacelo")
        │
        ▼
┌─────────────────────────────────────┐
│  BUILD (ARNÉS Director)             │
│                                     │
│  1. Recibe Execution Plan aprobado  │
│                                     │
│  2. Ejecuta según el plan:          │
│     - audita, inspecciona, busca    │
│     - escribe, refactoriza, certifica│
│     - ejecuta subagentes            │
│                                     │
│  3. NO redefine objetivos           │
│  4. NO modifica estrategia          │
│                                     │
│  5. Produce:                        │
│     - Execution Report              │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  PLAN (Strategic Director)          │
│                                     │
│  1. Consume Execution Report        │
│     como nuevo conocimiento         │
│                                     │
│  2. Evalúa si misión está completa  │
│                                     │
│  3. Decide próximo ciclo:           │
│     - Nuevo PLAN → BUILD            │
│     - Declara misión CLOSED         │
└─────────────────────────────────────┘
```

### Ciclo completo

El ciclo **continúa** hasta que PLAN declara:

```
Mission Complete.
```

Recién entonces podrá ejecutarse Learning según el **Mission Closure Contract**.

---

## 8. Casos permitidos

### 8.1 En PLAN

| Caso | Descripción | Fundamentación |
|------|-------------|----------------|
| Leer documentación del proyecto | ADRs, contratos, freeze docs, ROADMAP, PROJECT_BOARD | Es conocimiento consolidado |
| Leer Execution Reports previos | Reports de BUILD de ciclos anteriores | Es evidencia convertida en conocimiento |
| Consultar memoria del proyecto | Decisiones pasadas, patrones, advertencias | Es conocimiento arquitectónico |
| Discutir estrategias con el usuario | Debatir opciones antes de decidir | Es función cognitiva de PLAN |
| Solicitar más información al usuario | Pedir clarificaciones sobre la misión | Es análisis previo a la decisión |
| Decidir NO ejecutar BUILD | Execution Status = NOT READY | Es decisión estratégica válida |
| Declarar misión CLOSED | Cuando el objetivo se alcanzó o la misión finaliza | Es autoridad exclusiva de PLAN |

### 8.2 En BUILD

| Caso | Descripción | Fundamentación |
|------|-------------|----------------|
| Elegir orden táctico de tareas | Dentro del plan, decidir qué ejecutar primero | Es ejecución, no estrategia |
| Reintentar tareas fallidas | Si un subagente falla, reintentar con otro enfoque | Es ejecución operacional |
| Reportar hallazgos no previstos | Descubrir deuda técnica o riesgos durante la ejecución | Es evidencia para PLAN |
| Sugerir mejora táctica | Dentro del alcance del EP, sin cambiar objetivos | Es ejecución informada |
| Documentar deuda descubierta | En el Execution Report | Es evidencia para el próximo ciclo |
| Ejecutar cualquier herramienta | bash, edit, write, tests, build según lo requiera el plan | Es ejecución operacional |

---

## 9. Casos prohibidos

### 9.1 En PLAN

| Caso | Consecuencia |
|------|-------------|
| Inspeccionar código fuente | PLAN genera evidencia no consolidada, violando su rol cognitivo |
| Ejecutar grep/glob/search | PLAN descubre información no consolidada en lugar de consumir conocimiento |
| Auditar archivos | PLAN ejecuta tarea operacional de BUILD |
| Modificar código o configuración | PLAN ejecuta. Violación del principio fundamental. |
| Producir Execution Report | PLAN produce evidencia en lugar de decisiones |
| Invocar subagentes | PLAN delega en ejecutores directos sin pasar por BUILD |
| Ejecutar bash/edit/write | PLAN usa herramientas operacionales |

### 9.2 En BUILD

| Caso | Consecuencia |
|------|-------------|
| Redefinir objetivos del EP | BUILD decide estratégicamente. Violación del principio fundamental. |
| Cambiar prioridades del plan | BUILD modifica la estrategia definida por PLAN |
| Producir Recommendation | BUILD emite decisión estratégica |
| Producir nuevo Execution Plan | BUILD planifica estratégicamente |
| Cuestionar la estrategia de PLAN | BUILD evalúa decisiones de PLAN. Debe reportar hallazgos, no debatir. |
| Ejecutar Learning durante IN PROGRESS | Violación del Mission Closure Contract (MC-01) |

### 9.3 Tabla resumen

| | PLAN | BUILD |
|---|------|-------|
| **Lee documentación** | ✅ Permitido | ✅ Permitido |
| **Inspecciona código** | ❌ Prohibido | ✅ Permitido |
| **Busca evidencia** | ❌ Prohibido | ✅ Permitido |
| **Escribe código** | ❌ Prohibido | ✅ Permitido |
| **Ejecuta herramientas** | ❌ Prohibido | ✅ Permitido |
| **Produce Recommendation** | ✅ Permitido | ❌ Prohibido |
| **Produce Execution Plan** | ✅ Permitido | ❌ Prohibido |
| **Produce Execution Report** | ❌ Prohibido | ✅ Permitido |
| **Define objetivos** | ✅ Permitido | ❌ Prohibido |
| **Declara misión CLOSED** | ✅ Permitido | ❌ Prohibido |
| **Ejecuta subagentes** | ❌ Prohibido | ✅ Permitido |

---

## 10. Relación con Mission Closure Contract

El **Mission Closure Contract** define el ciclo de vida completo de una misión:

1. **PLAN** produce un Execution Plan.
2. **BUILD** ejecuta y produce un Execution Report.
3. **PLAN** evalúa el reporte y decide: nuevo ciclo o **misión CLOSED**.
4. Solo cuando PLAN declara **CLOSED**, Learning puede ejecutarse.

Este contrato (Strategic vs Operational) es el **pre-requisito** del Mission Closure Contract:

- Sin la separación clara de tipos de información (conocimiento → decisión → evidencia), el cierre de misión no tendría fundamento.
- BUILD produce Execution Reports que PLAN consume como conocimiento para decidir el cierre.
- Learning consume el conocimiento consolidado **después** del cierre.

Ambos contratos son complementarios:

| Contrato | Define |
|----------|--------|
| **Strategic vs Operational** | Qué información cruza la frontera PLAN ↔ BUILD y quién produce cada tipo |
| **Mission Closure** | Cuándo y cómo termina una misión y se activa Learning |

---

## 11. Relación con Mission Phase Architecture

La **Mission Phase Architecture** establece el flujo PLAN → BUILD en 9 pasos. Este contrato **refina** esos pasos con tipos de información:

| Paso original (MPA) | Refinamiento (este contrato) |
|---------------------|------------------------------|
| 1. Usuario presenta misión | PLAN recibe **conocimiento** del usuario |
| 2. SDL analiza | PLAN procesa **conocimiento** existente |
| 3. SDL produce Recommendation + EP + Status | PLAN produce **decisión** estructurada |
| 4. Usuario aprueba | La **decisión** es validada |
| 5. AEL recibe EP | BUILD consume **decisión** |
| 6. AEL descompone | BUILD prepara ejecución |
| 7. AEL ejecuta | BUILD transforma **decisión** en **evidencia** |
| 8. AEL entrega Execution Report | BUILD produce **evidencia** |
| 9. SDL evalúa | PLAN consume **evidencia** como nuevo **conocimiento** |

**Las invariantes MP-01 a MP-06** se preservan y se refuerzan con las invariantes de este contrato (SO-01 a SO-10).

---

## 12. Invariantes

| ID | Invariante | Violación |
|----|-----------|-----------|
| **SO-01** | PLAN consume conocimiento; nunca descubre información no consolidada. | PLAN ejecuta grep, glob, o inspecciona código fuente. |
| **SO-02** | PLAN produce decisiones (Recommendation + Execution Plan + Status). | PLAN produce un Execution Report o código. |
| **SO-03** | PLAN nunca ejecuta herramientas operacionales (bash, edit, write, subagentes). | PLAN invoca bash, modifica archivos, o ejecuta subagentes. |
| **SO-04** | BUILD consume decisiones (Execution Plan). | BUILD recibe instrucciones informales o contexto no estructurado. |
| **SO-05** | BUILD produce evidencia (Execution Report). | BUILD produce una Recommendation o un Execution Plan. |
| **SO-06** | BUILD nunca redefine los objetivos del Execution Plan. | BUILD modifica el objetivo, cambia prioridades, o cuestiona la estrategia. |
| **SO-07** | Toda comunicación PLAN ↔ BUILD se formaliza mediante Execution Plan y Execution Report. | Existe comunicación informal, instrucciones fuera del EP, o reportes fuera del ER. |
| **SO-08** | PLAN es el único responsable de declarar una misión CLOSED. | BUILD o cualquier otro agente declara el cierre. |
| **SO-09** | Learning solo se ejecuta después de una declaración CLOSED de PLAN. | Learning se ejecuta durante IN PROGRESS. |
| **SO-10** | Este contrato no modifica el comportamiento del ecosistema; solo formaliza su arquitectura. | Se descubre un cambio funcional inducido por este contrato. |

---

## 13. Certificación

Este contrato queda certificado cuando:

| Criterio | Verificación |
|----------|-------------|
| ✅ PLAN consume conocimiento | Las interacciones de PLAN usan exclusivamente documentación, reports, memoria e historial. |
| ✅ PLAN produce decisiones | Toda respuesta de PLAN contiene Recommendation + Execution Plan + Execution Status. |
| ✅ BUILD consume decisiones | BUILD siempre recibe un Execution Plan estructurado y aprobado. |
| ✅ BUILD produce evidencia | BUILD siempre entrega un Execution Report (no Recommendation ni EP). |
| ✅ SDL nunca audita | Ninguna interacción de PLAN incluye grep, glob, inspección de código o ejecución de herramientas. |
| ✅ SDL nunca escribe | Ninguna interacción de PLAN incluye edit, write o modificación de archivos. |
| ✅ AEL nunca planifica | Ninguna interacción de BUILD incluye Recommendation o Execution Plan. |
| ✅ AEL nunca redefine objetivos | Ninguna interacción de BUILD modifica los objetivos del EP recibido. |
| ✅ Comunicación formalizada | Toda comunicación SDL ↔ AEL ocurre mediante Execution Plan y Execution Report. |
| ✅ Sin cambios de comportamiento | El contrato es puramente documental. No se modificó código, configuración ni prompts funcionales. |

---

## 14. Historial

| Versión | Fecha | Cambio |
|---------|-------|--------|
| **1.0** | 2026-07-19 | Creación del contrato. 10 invariantes SO-01 a SO-10. Reemplaza interpretaciones anteriores de la relación PLAN ↔ BUILD. |

---

*Este documento es el contrato formal entre el Strategic Director (PLAN) y el ARNÉS Director (BUILD). Cualquier modificación requiere revisión del ecosistema y actualización del INTERFACE FREEZE V2.*
