# ARNÉS Framework — Execution Report Contract v1.0

> **Nivel:** Arquitectónico (Nivel 1)
> **Versión:** 1.0
> **Fecha:** 2026-07-23
> **Estado:** ACTIVE
> **Deriva de:** `COGNITIVE_OBJECT_MODEL.md` §6, `ael/constitution/SPEC.md` §6 (L4 Closure)
>
> Define el contrato formal del ExecutionReport como objeto cognitivo del ARNÉS Framework.

---

## 1. Purpose

El ExecutionReport es el objeto cognitivo que transporta **evidencia verificable** desde el dominio AEL hacia el orquestador ARNÉS y el plano estratégico. Es el output final del ciclo de ejecución operacional.

Responde a las preguntas: ¿se ejecutó correctamente la misión? ¿qué cambios se aplicaron? ¿qué evidencia de calidad existe? ¿qué conocimiento debe preservarse?

---

## 2. Producer

| Atributo | Valor |
|----------|-------|
| **Domain** | AEL (ARNÉS Execution Layer) |
| **Assembly Authority** | AMC (AEL Mission Coordinator) |
| **Evidence Producers** | ael-explore, ael-architect, ael-implementer, ael-audit, ael-memory, ael-learning |

AMC coordina las capacidades AEL y **ensambla** el ExecutionReport consolidando la evidencia producida por cada especialista. AMC no produce evidencia primaria — cada especialista es responsable de su propia contribución al reporte. El reporte se completa durante L4 (Closure).

---

## 3. Consumer

| Consumidor | Propósito |
|------------|-----------|
| **ARNÉS** | Evaluar si los criterios de éxito se cumplieron. Declarar CLOSED o iniciar nuevo ciclo. |
| **SDL / LIGHT_PLANNER** | Consumir evidencia como conocimiento para el próximo ciclo de decisión. |
| **Keeper (ael-memory)** | Preservar decisiones significativas, patrones y lecciones aprendidas. |
| **Analyst (ael-learning)** | Extraer patrones de múltiples reportes para recomendaciones de mejora. |

---

## 4. Structure

### 4.1 Campos obligatorios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **mission_id** | string | Identificador único de la misión (del ExecutionPlan). |
| **status** | SUCCESS \| PARTIAL \| FAILED | Resultado global de la ejecución. |
| **execution_summary** | string | Resumen narrativo de lo ejecutado. Referencia al objetivo del ExecutionPlan. |
| **changes_applied** | string[] | Lista de cambios concretos aplicados al sistema (archivos modificados, creados, eliminados). |
| **validation** | object | Resultados de las compuertas de calidad. |
| ├─ **tests** | PASS \| FAIL \| SKIP | Resultado de tests con conteo (ej. "1653/1657 PASS"). |
| ├─ **build** | PASS \| FAIL \| SKIP | Resultado de compilación. |
| └─ **contracts** | PASS \| FAIL | Resultado de `ael/contracts/enforce.sh`. |

### 4.2 Campos opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **findings** | string[] | Hallazgos no previstos, desviaciones, deuda descubierta durante la ejecución. |
| **knowledge_preserved** | string[] | Decisiones, patrones o lecciones registradas para preservación. |
| **debt_discovered** | object[] | Deuda técnica nueva detectada (id, descripción, severidad). |
| **recommendations** | string[] | Sugerencias no vinculantes para el plano estratégico. |
| **artifacts** | string[] | Archivos adicionales producidos (reportes, diagramas, documentación). |
| **warnings** | string[] | Advertencias no bloqueantes detectadas durante la ejecución. |

---

## 5. Lifecycle

```
AEL DOMAIN (AMC coordina)
    │
    ├── ael-explore ──▶ estado del sistema
    ├── ael-implementer ──▶ cambios aplicados
    ├── ael-audit ──▶ resultados de validación
    ├── ael-memory ──▶ conocimiento preservado
    └── ael-learning ──▶ patrones detectados
    │
    │ AMC consolida resultados
    │ Verifica invariantes I1-I6
    │
    ▼
GENERATED
    │
    │ ARNÉS recibe el reporte
    │ Evalúa criterios de éxito
    │
    ├── SUCCESS → ARNÉS declara CLOSED
    │              │
    │              ▼
    │          REVIEWED (SDL consume evidencia)
    │
    └── PARTIAL/FAILED → ARNÉS inicia nuevo ciclo
                          │
                          └── Nuevo ExecutionPlan → nueva ejecución
```

---

## 6. Contract Guarantees

| Garantía | Descripción |
|----------|-------------|
| **Completitud** | Todo cambio aplicado está documentado. Ningún cambio ocurre sin registro. |
| **Verificabilidad** | Toda afirmación de éxito está respaldada por evidencia de tests, build o contratos. |
| **Trazabilidad** | El reporte referencia el ExecutionPlan que lo originó (vía `mission_id`). |
| **Preservación** | El conocimiento significativo descubierto durante la ejecución sobrevive al cierre de la misión. |

---

## 7. Relationship to Other Contracts

| Contrato | Relación |
|----------|----------|
| `DECISION_PACKAGE_CONTRACT.md` | El DecisionPackage inicia el ciclo que termina en este reporte. |
| `sdl.md` §5 (ExecutionPlan) | El ExecutionPlan define los criterios de éxito que este reporte verifica. |
| `amc.md` §2 (MissionExecutionPlan) | El MissionExecutionPlan define qué capacidades se usaron y en qué orden. |
| `ael/constitution/SPEC.md` §6 (L4) | L4 Closure define las condiciones que deben cumplirse para generar este reporte. |
| `COGNITIVE_OBJECT_MODEL.md` §6 | Definición del objeto cognitivo ExecutionReport. |

---

> *Versión 1.0. Documento de Nivel 1. Contrato formal del ExecutionReport como objeto cognitivo del ARNÉS Framework. Modificable mediante F-ADR con revisión del SDL.*
