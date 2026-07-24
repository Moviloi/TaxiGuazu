# ARNÉS Framework — Cognitive Object Model v1.0

> **Nivel:** Arquitectónico — define los objetos cognitivos que transportan información entre agentes del framework.
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** ACTIVE
>
> Este documento especifica la estructura, estados, entradas, salidas y ciclo de vida
> de los objetos cognitivos del ARNÉS Framework.

---

## Índice

1. [Qué son los objetos cognitivos](#1-qué-son-los-objetos-cognitivos)
2. [Mission](#2-mission)
3. [Decision](#3-decision)
4. [ExecutionPlan](#4-executionplan)
5. [MissionExecutionPlan](#5-missionexecutionplan)
6. [ExecutionReport](#6-executionreport)
7. [Review](#7-review)
8. [Incident](#8-incident)
9. [DecisionPackage](#9-decisionpackage)
10. [Relaciones entre objetos](#10-relaciones-entre-objetos)
11. [Invariantes del modelo](#11-invariantes-del-modelo)

---

## 1. Qué son los objetos cognitivos

### 1.1 Definición

Un objeto cognitivo es una estructura de información con semántica precisa que transporta significado entre los componentes del ARNÉS Framework. A diferencia de los documentos narrativos, cada objeto cognitivo tiene:

- **Propósito declarado:** por qué existe y qué problema resuelve.
- **Estados finitos:** el objeto está siempre en exactamente uno de un conjunto definido de estados.
- **Entradas declaradas:** qué información requiere para ser creado.
- **Salidas declaradas:** qué información proporciona a sus consumidores.
- **Ciclo de vida gobernado:** quién lo crea, quién lo consume, quién lo transforma, cuándo se archiva.

### 1.2 Por qué objetos y no documentos

Un documento narrativo puede describir cualquier cosa de cualquier manera. Dos documentos que describen la misma misión pueden tener estructuras completamente diferentes. Esto impide el procesamiento sistemático y la trazabilidad automatizada.

Un objeto cognitivo tiene **forma fija**. El framework sabe qué esperar de un ExecutionPlan, qué campos contiene un ExecutionReport, qué estados puede tener una Mission. Esto permite que los agentes se comuniquen sin ambigüedad y que el Decision Engine valide la información que cruza fronteras.

### 1.3 Los siete objetos cognitivos

| Objeto | Propósito | Productor | Consumidor primario |
|---|---|---|---|
| **Mission** | Unidad de trabajo del framework | Usuario / SDL | Todo el framework |
| **DecisionPackage** | Clasificación de misión y selección de ruta | ARNÉS (Scope Gate) | PLAN (SDL) |
| **Decision** | Determinación estratégica | SDL (Mission Analyzer) | Director |
| **ExecutionPlan** | Instrucciones estructuradas para BUILD | SDL (Mission Analyzer) | Director |
| **ExecutionReport** | Evidencia de ejecución | Director | SDL (Mission Analyzer) |
| **Review** | Análisis retrospectivo | Analyst (Learning) | SDL, Keeper |
| **Incident** | Registro de anomalía | Cualquier agente | SDL, Governor |

### 1.4 Relación con el flujo de información

```
Usuario ──▶ Mission ──▶ Mission Analyzer ──▶ Decision ──▶ ExecutionPlan
                                                              │
                                                              ▼
                                                          Director
                                                              │
                                                              ▼
                                                      ExecutionReport
                                                              │
                                                              ▼
                                                      Mission Analyzer
                                                              │
                                                    ┌─────────┴─────────┐
                                                    ▼                   ▼
                                                CLOSED              Nuevo ciclo
                                                    │
                                                    ▼
                                                Learning ──▶ Review
                                                              │
                                                              ▼
                                                          Keeper

                    Cualquier agente ──▶ Incident ──▶ SDL, Governor
```

---

## 2. Mission

### 2.1 Propósito

La Mission es la **unidad atómica de trabajo** del ARNÉS Framework. Representa un objetivo de ingeniería que debe ser analizado, planificado, ejecutado y verificado. Toda actividad del framework ocurre dentro de una misión.

Una misión puede ser tan pequeña como corregir un typo o tan grande como implementar un nuevo subsistema. El tamaño no cambia la estructura del objeto; cambia la complejidad del ExecutionPlan que la resuelve.

### 2.2 Estados

```
                ┌──────────────┐
                │  IN PROGRESS │◀──────────┐
                └──────┬───────┘           │
                       │                   │
                       │ SDL declara       │ SDL produce
                       │ CLOSED            │ nuevo EP
                       ▼                   │
                ┌──────────────┐           │
                │    CLOSED    │───────────┘
                └──────────────┘  (nunca: solo nueva misión)
```

| Estado | Significado | Quién lo establece |
|---|---|---|
| **IN PROGRESS** | La misión tiene al menos un ExecutionPlan aprobado y BUILD está activo o puede reactivarse. Pueden ejecutarse múltiples BUILD. | SDL (al entregar primer EP READY) |
| **CLOSED** | El SDL determinó que el objetivo fue alcanzado o que la misión debe finalizar. No se ejecutarán más BUILD. | SDL (declaración explícita) |

**No existe un tercer estado.** No hay "PAUSED", "BLOCKED", "CANCELLED". Si una misión no puede continuar, el SDL la declara CLOSED con la justificación correspondiente.

### 2.3 Entradas

| Entrada | Fuente | Obligatoria | Descripción |
|---|---|---|---|
| **Objetivo** | Usuario o sistema | Sí | Qué se debe lograr. En lenguaje natural. |
| **Contexto** | Usuario o memoria | No | Información adicional sobre el dominio, restricciones o antecedentes. |
| **Trigger** | Sistema | No | Qué evento disparó la misión (detección automática, evento calendarizado). |

### 2.4 Salidas

| Salida | Destino | Descripción |
|---|---|---|
| **Decisions** | Director | Las decisiones estratégicas tomadas durante la misión. |
| **ExecutionReports** | SDL | La evidencia producida por BUILD. |
| **Artefactos** | Producto | Código, documentos, configuración — todo cambio en el sistema. |
| **Conocimiento** | Keeper | Decisiones registradas, patrones, lecciones. |

### 2.5 Ciclo de vida

```
CREACIÓN
    │
    │ Usuario presenta misión o SDL detecta necesidad
    │ SDL establece contexto inicial (ORIENT)
    ▼
IN PROGRESS
    │
    ├── SDL produce ExecutionPlan → BUILD ejecuta → ExecutionReport
    │       │
    │       └── (repite hasta que SDL determina objetivo alcanzado)
    │
    ▼
CLOSED
    │
    │ SDL emite declaración explícita:
    │   "Mission Status: CLOSED"
    │   "Justification: (razón)"
    │   "Next: (próximo paso)"
    │
    ├── Learning puede ejecutarse
    ├── Knowledge se consolida
    │
    ▼
ARCHIVO
    │
    │ La misión pasa al registro histórico.
    │ Sus objetos cognitivos asociados permanecen trazables.
```

**Reglas del ciclo de vida:**
- Solo el SDL puede declarar CLOSED. El Director no tiene esta autoridad.
- Learning solo se ejecuta después de CLOSED. Nunca durante IN PROGRESS.
- Una misión CLOSED no se reabre. Si se requiere trabajo adicional, se crea una nueva misión.

---

## 3. Decision

### 3.1 Propósito

Una Decision es una **determinación estratégica** producida por el Mission Analyzer. Responde a la pregunta: **¿qué curso de acción debemos tomar y por qué?**

La Decision es el resultado del proceso de razonamiento estratégico (ORIENT → ANALYZE → EVALUATE → DECIDE). Es anterior al ExecutionPlan: la Decision establece **qué** hacer; el ExecutionPlan establece **cómo** hacerlo.

### 3.2 Estados

```
DRAFT ──▶ PROPOSED ──▶ ACCEPTED ──▶ EXECUTED ──▶ VERIFIED
                │                       │
                ▼                       ▼
            REJECTED                FAILED
```

| Estado | Significado |
|---|---|
| **DRAFT** | La decisión está en formulación. El SDL está analizando y evaluando. |
| **PROPOSED** | La decisión está lista para consideración. Incluye Recommendation y ExecutionPlan preliminar. |
| **ACCEPTED** | El usuario aprobó la decisión. El ExecutionPlan asociado pasa a READY. |
| **EXECUTED** | BUILD completó la ejecución del ExecutionPlan. Se produjo un ExecutionReport. |
| **VERIFIED** | El SDL revisó el ExecutionReport y confirmó que los criterios de éxito se cumplen. |
| **REJECTED** | El usuario o el SDL determinaron que la decisión no debe ejecutarse. |
| **FAILED** | La ejecución no cumplió los criterios de éxito y no es recuperable en este ciclo. |

### 3.3 Entradas

| Entrada | Fuente | Descripción |
|---|---|---|
| **Conocimiento del proyecto** | Documentación, ADRs, memoria, baseline | Estado actual del producto, restricciones arquitectónicas, deuda técnica. |
| **Evidencia previa** | ExecutionReports de misiones anteriores | Resultados de ejecuciones pasadas que informan esta decisión. |
| **Contexto de misión** | Mission (objetivo, restricciones) | Lo que la misión debe lograr. |
| **Hoja de ruta** | ROADMAP | Prioridades estratégicas del producto. |

### 3.4 Salidas

| Salida | Destino | Descripción |
|---|---|---|
| **Curso de acción** | ExecutionPlan | CONTINUE, IMPROVE, ESCALATE o STOP. |
| **Justificación** | SDL (para trazabilidad) | Por qué se eligió este curso de acción. |
| **ExecutionPlan** | Director | Instrucciones estructuradas para BUILD (si el curso es CONTINUE). |

### 3.5 Ciclo de vida

```
FORMULACIÓN (DRAFT)
    │
    │ SDL ejecuta ORIENT → ANALYZE → EVALUATE → DECIDE
    │ Produce: curso de acción preliminar
    ▼
PROPOSICIÓN (PROPOSED)
    │
    │ SDL entrega Recommendation + ExecutionPlan + Status
    │
    ├── Status: NOT READY → vuelve a DRAFT (más análisis necesario)
    │
    └── Status: READY → espera aprobación del usuario
            │
            ├── Usuario rechaza → REJECTED
            │
            └── Usuario aprueba → ACCEPTED
                    │
                    ▼
                EJECUCIÓN (EXECUTED)
                    │
                    │ BUILD ejecuta → ExecutionReport
                    │
                    ├── Criterios cumplidos → VERIFIED
                    │
                    └── Criterios no cumplidos → FAILED
                            │
                            └── SDL puede formular nueva Decision
```

---

## 4. ExecutionPlan

### 4.1 Propósito

El ExecutionPlan es el **vehículo estructurado de una decisión**. Es el objeto que cruza la frontera entre el plano estratégico y el plano operacional. Le dice al Director exactamente qué hacer, bajo qué restricciones, y cómo se medirá el éxito.

Es la **única fuente de autoridad** para BUILD. El Director no recibe contexto adicional, instrucciones informales ni objetivos no estructurados.

### 4.2 Estados

```
DRAFT ──▶ READY ──▶ EXECUTING ──▶ COMPLETED
   │                    │
   ▼                    ▼
NOT_READY           ABORTED
```

| Estado | Significado |
|---|---|
| **DRAFT** | El plan está siendo formulado por el SDL durante el razonamiento estratégico. |
| **READY** | El plan está completo, verificado y aprobado. El dominio AEL (vía AMC) puede ejecutarlo. |
| **NOT_READY** | El plan requiere más análisis o evidencia antes de ser ejecutable. |
| **EXECUTING** | El dominio AEL está ejecutando activamente el plan. |
| **COMPLETED** | El dominio AEL terminó la ejecución y produjo un ExecutionReport. |
| **ABORTED** | La ejecución fue interrumpida por el Director antes de completarse. |

### 4.3 Estructura

Un ExecutionPlan contiene obligatoriamente:

| Campo | Tipo | Descripción |
|---|---|---|
| **objective** | string | Objetivo principal de la ejecución. |
| **current_state** | string | Estado actual según el conocimiento disponible. |
| **evidence** | string[] | Referencias a documentos, reports, decisiones previas consideradas. |
| **recommended_workflow** | string[] | Pasos recomendados para BUILD. |
| **constraints** | string[] | Invariantes y restricciones que BUILD debe respetar. |
| **success_criteria** | string[] | Condiciones medibles que determinan éxito. |
| **confidence** | number (0-1) | Nivel de certeza del SDL sobre el plan. |
| **escalation_needed** | boolean \| string | Si se requiere escalamiento y a quién. |

### 4.4 Entradas

| Entrada | Fuente | Descripción |
|---|---|---|
| **Decision** | SDL | Curso de acción y justificación. |
| **Conocimiento del proyecto** | Documentación, memoria | Estado del producto, restricciones, baseline. |
| **Criterios de éxito de la misión** | Mission | Lo que constituye éxito para esta misión. |

### 4.5 Salidas

| Salida | Destino | Descripción |
|---|---|---|
| **Instrucciones ejecutables** | Director | El plan que BUILD descompone y ejecuta. |
| **Restricciones** | Director | Límites que BUILD no puede cruzar. |
| **Criterios de verificación** | Director → Auditor | Condiciones que determinan si la ejecución fue exitosa. |

### 4.6 Ciclo de vida

```
DRAFT
    │
    │ SDL formula el plan (PLAN etapa del razonamiento)
    │ SDL verifica el plan (VERIFY etapa)
    │
    ├── Plan verificable → READY
    │       │
    │       │ Usuario aprueba
    │       ▼
    │   EXECUTING
    │       │
    │       │ Director ejecuta L1 → L2 → L3 → L4
    │       │
    │       ├── Ejecución completa → COMPLETED
    │       │       │
    │       │       └── Se produce ExecutionReport
    │       │
    │       └── Ejecución interrumpida → ABORTED
    │               │
    │               └── Director reporta causa en ExecutionReport
    │
    └── Plan no verificable → NOT_READY
            │
            └── SDL indica qué evidencia falta → vuelve a DRAFT
```

---

---

## 5. MissionExecutionPlan

### 5.1 Propósito

El MissionExecutionPlan (MEP) es el objeto cognitivo que transporta la **decisión de coordinación operacional** desde AMC hacia las capacidades AEL. Es producido por AMC al recibir un ExecutionPlan aprobado.

Responde a las preguntas: ¿qué capacidades AEL se necesitan para esta ejecución? ¿en qué orden? ¿cuáles pueden omitirse y por qué?

### 5.2 Estados

```
DRAFT ──▶ ACTIVE ──▶ COMPLETED
```

| Estado | Significado |
|--------|-------------|
| **DRAFT** | AMC está analizando el ExecutionPlan y determinando las capacidades necesarias. |
| **ACTIVE** | El plan está en ejecución. Las capacidades seleccionadas están siendo invocadas. |
| **COMPLETED** | Todas las capacidades planificadas fueron ejecutadas. El ExecutionReport está consolidado. |

### 5.3 Estructura

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **mission_analysis** | object | Análisis de la misión a ejecutar. |
| ├─ **task** | string | Objetivo del ExecutionPlan. |
| ├─ **complexity** | LOW \| MEDIUM \| HIGH | Complejidad estimada de la ejecución. |
| ├─ **scope** | string[] | Componentes o archivos afectados. |
| └─ **risk** | LOW \| MEDIUM \| HIGH | Nivel de riesgo arquitectónico. |
| **required_capabilities** | object[] | Capacidades AEL necesarias. Cada entrada: `{ name, reason }`. |
| **skipped_capabilities** | object[] | Capacidades omitidas con justificación. Cada entrada: `{ name, justification }`. |
| **execution_order** | string[] | Orden de invocación de las capacidades seleccionadas. |
| **dependencies** | object | Dependencias entre capacidades (para ejecución paralela). |
| **validation_strategy** | string[] | Pasos de validación requeridos (ael-audit siempre incluido). |

### 5.4 Entradas

| Entrada | Fuente | Descripción |
|----------|--------|-------------|
| **ExecutionPlan** | SDL o LIGHT_PLANNER | Plan de ejecución aprobado. |
| **Product Context** | ARNÉS (Project Adapter) | Contexto del producto activo. |
| **Runtime Profile** | ARNÉS | Configuración de ejecución (timeouts, presupuesto). |

### 5.5 Salidas

| Salida | Destino | Descripción |
|--------|---------|-------------|
| **Invocaciones AEL** | ael-explore, ael-architect, ael-implementer, ael-audit, ael-memory, ael-learning | Capacidades seleccionadas y ordenadas. |
| **ExecutionReport** | ARNÉS, SDL | Reporte consolidado de ejecución (producido tras completar todas las capacidades). |

### 5.6 Productor

| Atributo | Valor |
|----------|-------|
| **Entidad** | AMC (AEL Mission Coordinator) |
| **Dominio** | AEL |
| **Contrato** | `amc.md` §2 |

### 5.7 Ciclo de vida

```
AMC recibe ExecutionPlan
    │
    │ Analiza complejidad, alcance, riesgo
    │ Selecciona capacidades
    │ Justifica omisiones
    │ Define orden de ejecución
    ▼
DRAFT
    │
    │ Inicia ejecución
    ▼
ACTIVE
    │
    │ Capacidades ejecutadas
    │ ExecutionReport consolidado
    ▼
COMPLETED
```

---

## 6. ExecutionReport

### 6.1 Propósito

El ExecutionReport es el objeto cognitivo que transporta **evidencia verificable** desde el dominio AEL hacia ARNÉS y el plano estratégico. Documenta qué se hizo, qué se encontró, y si las compuertas de calidad se cumplieron.

**Assembly:** AMC ensambla el ExecutionReport a partir de la evidencia producida por los especialistas AEL. AMC no produce evidencia primaria — consolida. Las fuentes de evidencia son `ael-explore` (estado del sistema), `ael-implementer` (cambios aplicados), `ael-audit` (resultados de validación), `ael-memory` (conocimiento preservado), `ael-learning` (patrones detectados). El reporte se valida contra el ExecutionPlan y el MissionExecutionPlan.

### 6.2 Estados

```
GENERATED ──▶ REVIEWED
```

| Estado | Significado |
|---|---|
| **GENERATED** | El dominio AEL completó la ejecución y produjo el reporte. Está listo para revisión. |
| **REVIEWED** | El SDL (o ARNÉS) consumió el reporte y lo incorporó como conocimiento para el próximo ciclo. |

### 5.3 Estructura

Un ExecutionReport contiene:

| Campo | Tipo | Descripción |
|---|---|---|
| **plan_objective** | string | Copia del objetivo del ExecutionPlan ejecutado. |
| **execution_summary** | string | Resumen narrativo de lo ejecutado. |
| **results** | string[] | Lista de resultados concretos obtenidos. |
| **findings** | string[] | Hallazgos no previstos, desviaciones, deuda descubierta. |
| **certification** | object | Resultados de validación. |
| ├─ **tests** | PASS \| FAIL | Resultado de tests con evidencia. |
| ├─ **build** | PASS \| FAIL | Resultado de build con evidencia. |
| └─ **contracts** | PASS \| FAIL | Resultado de verificación de contratos. |
| **artifacts** | string[] | Archivos creados, modificados o eliminados. |
| **next** | string | Sugerencia no vinculante para el SDL. |

### 6.4 Entradas

| Entrada | Fuente | Descripción |
|---|---|---|
| **ExecutionPlan** | SDL | El plan que se ejecutó. |
| **Resultados de agentes** | Explorer, Implementer, Auditor, etc. | Outputs de las capacidades invocadas durante BUILD. |
| **Evidencia del sistema** | Tests, build, contratos, archivos | Estado verificable del producto después de la ejecución. |

### 6.5 Salidas

| Salida | Destino | Descripción |
|---|---|---|
| **Evidencia** | SDL | Información verificable para el próximo ciclo de decisión. |
| **Hallazgos** | SDL, Keeper | Problemas descubiertos que requieren atención. |
| **Conocimiento** | Keeper | Decisiones y patrones para preservar. |

### 6.6 Ciclo de vida

```
AMC completa L4 (Closure)
    │
    │ Evidencia recopilada de especialistas AEL
    │ AMC ensambla el reporte estructurado
    │ AMC verifica invariantes I1-I6
    ▼
GENERATED
    │
    │ SDL recibe el reporte
    │ SDL evalúa: ¿criterios de éxito cumplidos?
    │
    ├── Sí → SDL consume evidencia como conocimiento
    │       │
    │       ▼
    │   REVIEWED
    │       │
    │       └── SDL puede declarar misión CLOSED
    │
    └── No → SDL formula nuevo ExecutionPlan
            │
            └── El reporte actual sigue siendo REVIEWED
                (el nuevo ciclo produce un nuevo reporte)
```

---

## 7. Review

### 6.1 Propósito

Una Review es un **análisis retrospectivo** producido después del cierre de una misión. Su propósito es extraer conocimiento estructurado de la experiencia: qué funcionó, qué no, qué patrones emergieron, qué debería hacerse diferente.

La Review es producida por Learning (Analyst) y consumida por el SDL (para mejorar decisiones futuras) y por el Keeper (para preservar conocimiento).

### 6.2 Estados

```
DRAFT ──▶ COMPLETED ──▶ ACCEPTED
```

| Estado | Significado |
|---|---|
| **DRAFT** | La review está siendo elaborada por Learning. |
| **COMPLETED** | Learning terminó el análisis y produjo recomendaciones. |
| **ACCEPTED** | El SDL revisó y aceptó las recomendaciones (o las rechazó con justificación). |

### 6.3 Estructura

| Campo | Tipo | Descripción |
|---|---|---|
| **mission_reference** | string | Identificador de la misión analizada. |
| **execution_reports** | string[] | Reports de BUILD considerados en el análisis. |
| **decisions_analyzed** | string[] | Decisiones registradas durante la misión. |
| **patterns_detected** | object[] | Regularidades encontradas. |
| ├─ **pattern_name** | string | Nombre del patrón. |
| ├─ **evidence** | string[] | Evidencia que respalda el patrón. |
| └─ **confidence** | number | Certeza del patrón detectado. |
| **recommendations** | string[] | Acciones sugeridas para misiones futuras. |
| **lessons_learned** | string[] | Lecciones extraídas de la experiencia. |
| **debt_discovered** | string[] | Deuda técnica identificada durante la misión. |

### 6.4 Entradas

| Entrada | Fuente | Descripción |
|---|---|---|
| **ExecutionReports** | Misión CLOSED | Reports consolidados de todos los BUILD de la misión. |
| **Decisiones registradas** | DECISION_RECORD, ADRs | Decisiones tomadas durante la misión. |
| **Memory snapshots** | Keeper | Conocimiento preservado de la misión. |
| **PROJECT_BOARD** | Producto | Estado de tareas antes y después de la misión. |
| **CHANGELOG** | Producto | Registro de cambios de la misión. |

### 6.5 Salidas

| Salida | Destino | Descripción |
|---|---|---|
| **Patrones** | Keeper | Regularidades detectadas para preservar. |
| **Recomendaciones** | SDL | Acciones sugeridas para mejorar. |
| **Lecciones** | Keeper | Conocimiento para misiones futuras. |
| **Deuda descubierta** | TECHNICAL_DEBT_BASELINE | Nueva deuda identificada. |

### 6.6 Ciclo de vida

```
Misión CLOSED (SDL declara)
    │
    │ Learning verifica condiciones de activación:
    │   ✅ Misión CLOSED
    │   ✅ Existe al menos un ExecutionReport
    │   ✅ SDL no indicó "no ejecutar Learning"
    │
    ▼
DRAFT
    │
    │ Analyst procesa ExecutionReports, decisiones, memoria
    │ Analyst detecta patrones, formula recomendaciones
    │ Analyst documenta lecciones aprendidas
    ▼
COMPLETED
    │
    │ SDL revisa la review
    │
    ├── Recomendaciones aceptadas → ACCEPTED
    │       │
    │       └── Keeper preserva patrones y lecciones
    │
    └── Recomendaciones requieren ajuste → vuelve a DRAFT
```

**Reglas:**
- Learning nunca se ejecuta durante IN PROGRESS.
- Una Review solo analiza misiones CLOSED.
- Las recomendaciones son siempre propuestas, nunca acciones automáticas.
- El SDL decide si implementar las recomendaciones.

---

## 8. Incident

### 7.1 Propósito

Un Incident es el **registro de una anomalía** detectada durante la operación del framework. No es un bug del producto (aunque puede serlo). Es una desviación del comportamiento esperado del framework o del producto que requiere atención.

Ejemplos:
- Un test que pasaba deja de pasar sin cambio aparente.
- Un contrato (enforce.sh) falla inesperadamente.
- Un agente produce output malformado.
- Una decisión arquitectónica es violada sin registro.

### 7.2 Estados

```
OPEN ──▶ TRIAGED ──▶ IN_RESOLUTION ──▶ RESOLVED ──▶ CLOSED
```

| Estado | Significado |
|---|---|
| **OPEN** | El incidente fue detectado y registrado. No ha sido evaluado. |
| **TRIAGED** | El incidente fue evaluado: se determinó severidad, alcance y responsable. |
| **IN_RESOLUTION** | Se está trabajando activamente en resolver el incidente. |
| **RESOLVED** | La causa raíz fue abordada. La solución está implementada. |
| **CLOSED** | La solución fue verificada y el incidente no volverá a ocurrir (o se aceptó el riesgo residual). |

### 7.3 Estructura

| Campo | Tipo | Descripción |
|---|---|---|
| **incident_id** | string | Identificador único (ej. INC-001). |
| **detected_by** | string | Agente o componente que detectó el incidente. |
| **detected_at** | timestamp | Cuándo se detectó. |
| **severity** | enum | CRITICAL, HIGH, MEDIUM, LOW. |
| **description** | string | Qué se observó. |
| **expected_behavior** | string | Qué se esperaba. |
| **actual_behavior** | string | Qué ocurrió. |
| **affected_components** | string[] | Qué partes del sistema fueron afectadas. |
| **root_cause** | string | Causa raíz (se completa durante resolución). |
| **resolution** | string | Qué se hizo para resolverlo. |
| **preventive_measures** | string[] | Qué se implementó para evitar recurrencia. |

### 7.4 Entradas

| Entrada | Fuente | Descripción |
|---|---|---|
| **Detección** | Cualquier agente, test, contrato, build | La observación de la anomalía. |
| **Contexto** | Sistema | Estado del sistema en el momento del incidente. |
| **Logs y trazas** | Sistema | Evidencia técnica de lo ocurrido. |

### 7.5 Salidas

| Salida | Destino | Descripción |
|---|---|---|
| **Resolución** | Sistema | La corrección aplicada. |
| **Medidas preventivas** | Keeper, Governor | Cambios para evitar recurrencia (pueden incluir nuevos contratos o reglas). |
| **Conocimiento** | Keeper | El incidente como lección aprendida. |

### 7.6 Ciclo de vida

```
DETECCIÓN
    │
    │ Cualquier agente o componente detecta una anomalía
    │ Se registra el incidente con evidencia disponible
    ▼
OPEN
    │
    │ SDL o Governor evalúa el incidente
    │ Determina severidad, alcance, urgencia
    ▼
TRIAGED
    │
    │ Se asigna responsable
    │ Se formula plan de resolución
    ▼
IN_RESOLUTION
    │
    │ Se investiga causa raíz
    │ Se implementa solución
    │ Se verifica que la solución funciona
    ▼
RESOLVED
    │
    │ Se implementan medidas preventivas
    │ Se verifica que el incidente no puede recurrir
    ▼
CLOSED
    │
    │ El incidente se archiva
    │ Las lecciones se preservan en Memory
```

**Reglas:**
- Todo incidente debe ser registrado. Un incidente no registrado es un incidente que se repetirá.
- La severidad determina la urgencia, no el orden de resolución.
- Las medidas preventivas son obligatorias para incidentes CRITICAL y HIGH.
- Un incidente CLOSED no se reabre. Si recurre, se crea un nuevo incidente que referencia al anterior.

---

## 9. DecisionPackage

### 8.1 Propósito

El DecisionPackage es el objeto cognitivo que transporta la **clasificación inicial de una misión** y la **decisión de ruta** desde el Scope Gate hasta PLAN. Es producido por ARNÉS (orquestador) antes de invocar al plano estratégico.

Responde a las preguntas: ¿es esta misión táctica o estratégica? ¿qué nivel de razonamiento requiere? ¿qué motor de planificación debe usarse? ¿requiere aprobación del usuario?

### 8.2 Estados

```
ISSUED ──▶ CONSUMED
```

| Estado | Significado |
|---|---|
| **ISSUED** | ARNÉS emitió el DecisionPackage como resultado del Scope Gate. |
| **CONSUMED** | PLAN (SDL o LIGHT_PLANNER) recibió el DecisionPackage y lo utilizó para iniciar el razonamiento estratégico. |

### 8.3 Estructura

| Campo | Tipo | Descripción |
|---|---|---|
| **mission_type** | TACTICAL \| STRATEGIC | Clasificación de la misión. |
| **reasoning_required** | boolean | Si se requiere razonamiento estratégico. |
| **reasoning_depth** | NONE \| SHALLOW \| STANDARD \| DEEP | Profundidad de razonamiento requerida. |
| **planning_engine** | SDL \| LIGHT_PLANNER \| NONE | Cognitive Engine de planificación asignado. |
| **execution_engine** | AEL \| NONE | Dominio de ejecución asignado (AEL = ejecución requerida). |
| **execution_required** | boolean | Si se requiere ejecución. |
| **requires_user_approval** | boolean | Si el ExecutionPlan requiere aprobación del usuario. |
| **cognitive_budget** | ECONOMY \| STANDARD \| FULL | Presupuesto cognitivo asignado. |
| **existing_execution_plan** | object \| null | ExecutionPlan previo si existe (misiones multi-ciclo). |
| **classification_reason** | string | Justificación de la clasificación. |

### 8.4 Entradas

| Entrada | Fuente | Descripción |
|---|---|---|
| **Mission Request** | Usuario o sistema | La solicitud de misión sin procesar. |
| **Product Context** | Project Adapter | Contexto del producto activo (para misiones estratégicas). |
| **Runtime Profile** | Configuración | Restricciones de ejecución. |

### 9.5 Salidas

| Salida | Destino | Descripción |
|--------|---------|-------------|
| **Ruta de ejecución** | SDL, LIGHT_PLANNER, AMC | Instrucción sobre qué Cognitive Engine o dominio invocar. |
| **Configuración de razonamiento** | SDL, LIGHT_PLANNER | Nivel de profundidad, motor asignado, presupuesto. |
| **Requiere aprobación** | Usuario | Indicador de si se debe solicitar confirmación. |

### 9.6 Ciclo de vida

```
SCOPE GATE (ARNÉS)
    │
    │ ARNÉS clasifica la misión
    │ Evalúa: ¿táctica o estratégica? ¿qué planning engine? ¿ejecución requerida?
    ▼
ISSUED
    │
    ├── planning_engine: NONE + execution_engine: AEL → ejecución directa (táctica)
    │
    └── planning_engine: SDL | LIGHT_PLANNER → enviado al Cognitive Engine de planificación
            │
            │ El Cognitive Engine consume el DecisionPackage
            ▼
        CONSUMED
```

### 9.7 Posición en el flujo

```
Usuario → [Scope Gate: ARNÉS] → DecisionPackage → SDL / LIGHT_PLANNER → ExecutionPlan → AMC → AEL
```

A diferencia de "Decision" (objeto #3, producido por SDL durante el razonamiento estratégico), DecisionPackage es **pre-estratégico**: clasifica y enruta, pero no analiza arquitectura ni decide qué hacer.

---

## 10. Relaciones entre objetos

### 9.1 Jerarquía

```
Mission (1)
    │
    ├── Decision (1..n)
    │       │
    │       └── ExecutionPlan (1)
    │               │
    │               └── ExecutionReport (1)
    │
    └── Review (0..1)
            │
            └── (consume todos los ExecutionReports y Decisions)
```

- Una **Mission** contiene 1 o más **Decisions**.
- Cada **Decision** que resulta en CONTINUE produce 1 **ExecutionPlan**.
- Cada **ExecutionPlan** delegado al dominio AEL produce 1 **MissionExecutionPlan** (vía AMC).
- Cada **MissionExecutionPlan** ejecutado produce 1 **ExecutionReport**.
- Una **Mission** puede producir 0 o 1 **Review** (0 si Learning no se ejecuta).

### 9.2 Referencias cruzadas

| Objeto A | Referencia a B | Propósito |
|---|---|---|
| **ExecutionPlan** | Decision | Trazabilidad: qué decisión originó este plan. |
| **ExecutionReport** | ExecutionPlan | Trazabilidad: qué plan se ejecutó. |
| **Review** | ExecutionReport[] | Análisis: qué evidencia se analiza. |
| **Review** | Decision[] | Análisis: qué decisiones se evalúan. |
| **Incident** | ExecutionReport | Contexto: durante qué ejecución ocurrió. |
| **Incident** | Decision | Contexto: qué decisión estaba vigente. |

### 9.3 Incidentes como objeto transversal

A diferencia de los demás objetos, los Incidentes no forman parte del flujo principal PLAN → BUILD. Son un **canal lateral** que cualquier agente puede activar en cualquier momento.

Un incidente puede:
- Originarse durante BUILD (un test falla inesperadamente).
- Originarse durante PLAN (se detecta una inconsistencia en los ADRs).
- Originarse post-CLOSED (Learning detecta un patrón de falla).
- Disparar una nueva Mission para su resolución.

---

## 11. Invariantes del modelo

### OM-1 — Atomicidad de misión

**Toda actividad del framework ocurre dentro de una Mission.**
No existe trabajo fuera de una misión. Si se detecta una necesidad, se crea una misión o se declara explícitamente que no requiere misión.

### OM-2 — Trazabilidad de decisiones

**Para cada ExecutionPlan, existe exactamente una Decision que lo originó.**
No hay planes sin decisión. No hay decisiones sin trazabilidad al conocimiento que las fundamentó.

### OM-3 — Correspondencia plan-reporte

**Para cada ExecutionPlan ejecutado, existe exactamente un ExecutionReport.**
No hay ejecución sin reporte. No hay reporte sin plan que lo origine.

### OM-4 — Cierre gobernado

**Solo el SDL puede declarar una Mission CLOSED.**
El Director cierra BUILD (L4). El SDL cierra la Mission. Son actos distintos con autoridad distinta.

### OM-5 — Learning post-cierre

**Learning solo consume objetos de misiones CLOSED.**
No procesa hipótesis, evidencia parcial ni iteraciones intermedias.

### OM-6 — Inmutabilidad histórica

**Un objeto en estado terminal (CLOSED, COMPLETED, VERIFIED) no se modifica.**
Si se requiere corrección, se crea un nuevo objeto que referencia al anterior.

### OM-7 — Registro obligatorio de incidentes

**Todo incidente detectado debe ser registrado como objeto Incident.**
Un incidente no registrado es conocimiento perdido y riesgo de recurrencia.

### OM-8 — Separación Decisión/Evidencia

**Un ExecutionPlan nunca contiene evidencia. Un ExecutionReport nunca contiene decisiones.**
El Decision Engine rechaza objetos que violen esta separación de tipos.

### OM-9 — Clasificación previa a estrategia

**Toda misión estratégica tiene exactamente un DecisionPackage que la clasifica antes del razonamiento estratégico.**
Las misiones tácticas pueden omitir el DecisionPackage si BUILD recibe la solicitud directamente.

---

> *Este modelo de objetos cognitivos es el lenguaje formal del ARNÉS Framework. Define las estructuras de información que los agentes intercambian, los estados por los que transitan, y las reglas que gobiernan su ciclo de vida. Todo agente que opera en ARNÉS debe producir y consumir objetos conformes a este modelo.*
>
> *Versión 1.0. Especificación del modelo de objetos cognitivos del ARNÉS Framework. Deriva su autoridad de la ARNÉS Constitution y la Cognitive Architecture.*
