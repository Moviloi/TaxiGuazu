# ARNÉS Framework v1.0.0

> **Framework de ingeniería de software asistida por IA basado en restricciones.**
>
> ARNÉS es un sistema operativo cognitivo que gobierna cómo se construye software.
> No es una herramienta. No es un producto. No es un pipeline.
> Define lo que debe cumplirse siempre. Dentro de esos límites, la ejecución es soberana.

---

## Propósito

ARNÉS existe para resolver una pregunta fundamental:

> **¿Cómo gobernamos la creación de software cuando quien lo construye no es humano?**

Su propósito es único: **maximizar la calidad de la ingeniería minimizando costo, tiempo, contexto y riesgo.**

Construye productos — sistemas de software con dominio, arquitectura y ciclo de vida propios. Su primer producto es **AITOS** (TaxiGuazú / GuazuTransfer-Web).

```
ARNÉS Framework
      ↓
Productos construidos sobre él
      ↓
AITOS (primer producto)
```

---

## Documentación

### Fundacional

| Documento | Contenido |
|---|---|
| **[ARNES_CONSTITUTION.md](ARNES_CONSTITUTION.md)** | Identidad del framework: propósito, 6 principios fundamentales, 6 invariantes, separación Framework/Producto, gobernanza básica. |
| **[README.md](README.md)** | Este documento. Índice y punto de entrada. |

### Arquitectura

| Documento | Contenido |
|---|---|
| **[COGNITIVE_ARCHITECTURE.md](COGNITIVE_ARCHITECTURE.md)** | Arquitectura cognitiva: dos planos (Mission Analyzer / Director), Decision Engine, Planning Engines (SDL, LIGHT_PLANNER), capa de agentes, flujo de información, límites. |
| **[COGNITIVE_OBJECT_MODEL.md](COGNITIVE_OBJECT_MODEL.md)** | Modelo de 7 objetos cognitivos: Mission, DecisionPackage, Decision, ExecutionPlan, ExecutionReport, Review, Incident. Estados, entradas, salidas, ciclo de vida. |
| **[FRAMEWORK_IMPLEMENTATION_MODEL.md](FRAMEWORK_IMPLEMENTATION_MODEL.md)** | Modelo de tres capas: Framework / Implementación / Producto. Reglas de dependencia, validación de fronteras. |
| **[AEL_BOUNDARY_AUDIT.md](AEL_BOUNDARY_AUDIT.md)** | Auditoría de AEL contra el modelo de tres capas. |
| **[MIGRATION_STRATEGY.md](MIGRATION_STRATEGY.md)** | Estrategia de migración en 3 fases. |
| **[PRODUCT_CONTEXT_CONTRACT.md](PRODUCT_CONTEXT_CONTRACT.md)** | Contrato de 12 campos para conectar productos al framework. |
| **[DECISION_PACKAGE_CONTRACT.md](DECISION_PACKAGE_CONTRACT.md)** | Contrato del DecisionPackage v2.0. |
| **[PROJECT_ADAPTER_ARCHITECTURE.md](PROJECT_ADAPTER_ARCHITECTURE.md)** | Arquitectura del Project Adapter (6 etapas). |
| **[RUNTIME_PROFILE_CONTRACT.md](RUNTIME_PROFILE_CONTRACT.md)** | Contrato del Runtime Profile (11 categorías). |
| **[LIGHT_PLANNER_CONTRACT.md](LIGHT_PLANNER_CONTRACT.md)** | Contrato del LIGHT_PLANNER (4 etapas). |

### Gobernanza

| Documento | Contenido |
|---|---|
| **[GOVERNANCE.md](GOVERNANCE.md)** | Reglas de evolución: jerarquía documental (4 niveles), autoridad, proceso de cambio, Framework ADRs, resolución de conflictos. |
| **[VERSIONING.md](VERSIONING.md)** | Esquema de versiones: MAJOR.MINOR.PATCH, cambios breaking vs compatibles, criterios v1.0 y v2.0, política de deprecación. |

### Operacional (fuera de `docs/arnes/`)

| Documento | Ubicación | Contenido |
|---|---|---|
| **SPEC.md** | `ael/constitution/SPEC.md` | Especificación operacional: implementa los principios del framework en restricciones de proceso (I1-I6, L1-L4). |
| **ORGANIZATION.md** | `ael/government/ORGANIZATION.md` | Roles, autoridad, doctrina profesional de agentes. |
| **CONTRACTS.md** | `ael/constitution/CONTRACTS.md` | Reglas de enforcement automatizado (R1-R4). |
| **Roles** | `ael/government/roles/*.md` | Contratos detallados de cada agente. |

---

## Arquitectura en 30 segundos

ARNÉS organiza el trabajo de ingeniería en **dos planos cognitivos**:

```
PLAN (Estratégico)              BUILD (Operacional)
─────────────────────          ─────────────────────
Mission Analyzer (SDL)         Director (AEL)
                               │
ORIENT → ANALYZE → EVALUATE    │  L1: Entender
→ DECIDE → PLAN → VERIFY       │  L2: Planificar
→ DELIVER                       │  L3: Ejecutar
       │                        │  L4: Cerrar
       ▼                        │
   ExecutionPlan ──────────────▶│
       │                        │
       │                        ▼
       │                   Capa de Agentes
       │                   (Discovery, Architecture,
       │                    Implementation, Validation,
       │                    Memory, Learning, Governance)
       │                        │
       ◀───────────────── ExecutionReport
       │
       ▼
   CLOSED → Learning
```

**Principio fundamental:** PLAN consume conocimiento y produce decisiones. BUILD consume decisiones y produce evidencia. Los planos no se mezclan.

---

## Objetos cognitivos

La información fluye entre agentes mediante **7 objetos cognitivos** estructurados:

| Objeto | Transporta | Flujo |
|---|---|---|
| **Mission** | Unidad de trabajo | Usuario → Framework |
| **DecisionPackage** | Clasificación de misión y selección de ruta | ARNÉS (Scope Gate) → PLAN |
| **Decision** | Determinación estratégica | Mission Analyzer → ExecutionPlan |
| **ExecutionPlan** | Instrucciones para BUILD | Mission Analyzer → Director |
| **ExecutionReport** | Evidencia de ejecución | Director → Mission Analyzer |
| **Review** | Análisis retrospectivo | Learning → SDL, Keeper |
| **Incident** | Registro de anomalía | Cualquier agente → SDL, Governor |

---

## Principios fundamentales

1. **Soberanía del Director** — Libertad táctica dentro del ExecutionPlan.
2. **Separación cognitiva** — PLAN y BUILD no se mezclan.
3. **Evidencia sobre supuestos** — Decisiones basadas en el estado real del sistema.
4. **Economía cognitiva** — Máximo valor de ingeniería por recurso consumido.
5. **Preservación del conocimiento** — Lo aprendido sobrevive a la misión.
6. **Trazabilidad universal** — Todo cambio es trazable a una decisión.

---

## Estado actual

| Indicador | Valor |
|---|---|
| **Versión** | v1.0.0 |
| **Estado** | ACTIVE — fundacional |
| **Productos activos** | 1 (AITOS) |
| **Framework ADRs** | 0 (sin cambios post-fundacionales) |
| **Extracción independiente** | Pendiente (framework co-reside con AITOS) |
| **Próximo hito** | F-ADR-001: primer cambio arquitectónico post-fundacional |

---

## Relación con AEL y AITOS

```
docs/arnes/           ← Especificación del framework (Niveles 0 y 1)
ael/                  ← Implementación operacional (Nivel 2)
src/                  ← Código del producto AITOS (Nivel 3)
docs/architecture/    ← Arquitectura del producto AITOS
docs/adr/             ← ADRs del producto AITOS
```

- **ARNÉS Framework** es la especificación abstracta.
- **AEL** (Agent Execution Layer) es la implementación concreta de esa especificación.
- **AITOS** es el primer producto construido con ARNÉS/AEL.

---

> *ARNÉS Framework v1.0.0 — Julio 2026. Fundacional. La gobernanza existe antes que la expansión.*
