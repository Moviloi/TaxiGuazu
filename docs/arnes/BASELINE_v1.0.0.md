# ARNÉS Framework — Baseline v1.0.0

> **Tipo:** Baseline arquitectónico
> **Versión:** 1.0.0
> **Fecha:** 2026-07-22
> **Estado:** FROZEN — congelado
>
> Este documento declara formalmente congelado el diseño fundacional de ARNÉS Framework v1.0.0
> y marca el cierre de la etapa de diseño y el inicio de la etapa de implementación.

---

## Índice

1. [Declaración de congelamiento](#1-declaración-de-congelamiento)
2. [Documentos normativos del baseline](#2-documentos-normativos-del-baseline)
3. [Alcance del baseline](#3-alcance-del-baseline)
4. [Cambios permitidos sin F-ADR](#4-cambios-permitidos-sin-f-adr)
5. [Cambios que requieren F-ADR](#5-cambios-que-requieren-f-adr)
6. [Inicio de la etapa siguiente](#6-inicio-de-la-etapa-siguiente)
7. [Firma arquitectónica](#7-firma-arquitectónica)

---

## 1. Declaración de congelamiento

### 1.1 Estado del framework

**ARNÉS Framework v1.0.0 queda congelado en su diseño fundacional.**

Esto significa:

- La **identidad** del framework está definida y es estable.
- La **arquitectura cognitiva** está especificada y es normativa.
- Los **objetos cognitivos** están modelados con estados, entradas, salidas y ciclo de vida.
- Las **reglas de gobernanza** están establecidas y son vinculantes.
- El **esquema de versiones** está definido y gobierna la evolución futura.
- El **modelo de implementación** (tres capas) está formalizado.
- La **auditoría de fronteras** de AEL está completada.
- La **estrategia de migración** está diseñada y aprobada.

El diseño fundacional **no se modifica** a partir de este punto sin seguir el proceso de gobernanza definido en `GOVERNANCE.md`.

### 1.2 Qué significa "congelado"

Congelado **no** significa inmutable. Significa:

- Cualquier cambio a los documentos del baseline requiere proceso formal (F-ADR o enmienda constitucional, según el nivel).
- El diseño actual es la **referencia autoritativa** contra la cual se mide toda implementación y toda desviación.
- La etapa de **exploración arquitectónica** terminó. La etapa de **implementación** comienza.

### 1.3 Qué NO significa "congelado"

Congelado **no** significa:

- Que el framework no evolucionará. Evolucionará bajo gobernanza.
- Que los documentos son perfectos. Pueden tener errores, omisiones o ambigüedades que se corregirán.
- Que no se pueden agregar documentos. Se pueden agregar guías, ejemplos y documentación no normativa.
- Que la implementación (AEL) está congelada. La implementación está en la etapa de migración.

---

## 2. Documentos normativos del baseline

### 2.1 Nivel 0 — Fundacional

| Documento | Versión | Contenido |
|---|---|---|
| `docs/arnes/ARNES_CONSTITUTION.md` | 1.0 | Identidad, propósito, 6 principios (P1-P6), 6 invariantes (F1-F6), separación Framework/Producto, gobernanza básica. |
| `docs/arnes/BASELINE_v1.0.0.md` | 1.0.0 | Este documento. Declaración de congelamiento y transición a implementación. |

### 2.2 Nivel 1 — Arquitectónico

| Documento | Versión | Contenido |
|---|---|---|
| `docs/arnes/COGNITIVE_ARCHITECTURE.md` | 1.0 | Arquitectura cognitiva: dos planos, Mission Analyzer, Director, Decision Engine, Planning Engines (SDL, LIGHT_PLANNER), capa de agentes, flujo de información. |
| `docs/arnes/COGNITIVE_OBJECT_MODEL.md` | 1.0 | 7 objetos cognitivos: Mission, DecisionPackage, Decision, ExecutionPlan, ExecutionReport, Review, Incident. |
| `docs/arnes/GOVERNANCE.md` | 1.0 | Jerarquía documental (4 niveles), autoridad, procesos de cambio, Framework ADRs, resolución de conflictos. |
| `docs/arnes/VERSIONING.md` | 1.0 | Esquema MAJOR.MINOR.PATCH, cambios breaking vs compatibles, política de deprecación. |
| `docs/arnes/FRAMEWORK_IMPLEMENTATION_MODEL.md` | 1.0 | Modelo de tres capas: Framework / Implementación / Producto. Reglas de dependencia. |
| `docs/arnes/AEL_BOUNDARY_AUDIT.md` | 1.0 | Auditoría de AEL contra el modelo de tres capas. 12 acoplamientos clasificados por severidad. |
| `docs/arnes/MIGRATION_STRATEGY.md` | 1.0 | Estrategia de migración en 3 fases. Criterios de aceptación. Deuda aceptada. |
| `docs/arnes/PRODUCT_CONTEXT_CONTRACT.md` | 1.0 | Contrato de 12 campos para productos. Conexión cognitiva Framework-Producto. |
| `docs/arnes/DECISION_PACKAGE_CONTRACT.md` | 1.0 | Contrato del DecisionPackage v2.0. Clasificación de misiones y selección de ruta. |

### 2.3 Nivel 2 — Operacional

| Documento | Ubicación | Contenido |
|---|---|---|
| **SPEC.md** | `ael/constitution/SPEC.md` | Especificación operacional: invariantes I1-I6, lifecycle L1-L4, 7 capacidades, contratos de capacidad. |
| **ORGANIZATION.md** | `ael/government/ORGANIZATION.md` | Roles, autoridad, Professional Engineering Doctrine. |
| **CONTRACTS.md** | `ael/constitution/CONTRACTS.md` | Reglas de enforcement R1-R4, archivos monitoreados, acciones en violación. |
| **Roles** | `ael/government/roles/` (6 archivos) | Contratos de Explorer, Architect, Implementer, Auditor, Keeper, Analyst. |
| **PROJECT_ADAPTER_ARCHITECTURE.md** | `docs/arnes/PROJECT_ADAPTER_ARCHITECTURE.md` | Arquitectura del Project Adapter (6 etapas). Descubrimiento y carga del Product Context. |
| **RUNTIME_PROFILE_CONTRACT.md** | `docs/arnes/RUNTIME_PROFILE_CONTRACT.md` | Contrato del Runtime Profile (11 categorías). Configuración de ejecución por misión. |
| **LIGHT_PLANNER_CONTRACT.md** | `docs/arnes/LIGHT_PLANNER_CONTRACT.md` | Contrato del LIGHT_PLANNER. Motor de planificación reducido (4 etapas). |

### 2.4 Documentos de soporte (no normativos)

| Documento | Propósito |
|---|---|
| `docs/arnes/README.md` | Índice navegable. No es normativo. |
| `ael/README.md` | Introducción a AEL. No es normativo. |

### 2.5 Total del baseline

| Nivel | Documentos |
|---|---|
| Nivel 0 (Fundacional) | 2 |
| Nivel 1 (Arquitectónico) | 9 |
| Nivel 2 (Operacional) | 7 (más 6 roles) |
| **Total normativos** | **18 documentos + 6 roles** |
| Soporte (no normativos) | 2 |

---

## 3. Alcance del baseline

### 3.1 Decisiones estabilizadas

Las siguientes decisiones arquitectónicas quedan estabilizadas por este baseline. Modificarlas requiere el proceso definido en `GOVERNANCE.md`.

#### Identidad y principios

| Decisión | Documento | Sección |
|---|---|---|
| ARNÉS es un framework de ingeniería de software asistida por IA basado en restricciones. | `ARNES_CONSTITUTION.md` | §1 |
| El propósito es maximizar calidad minimizando costo, tiempo, contexto y riesgo. | `ARNES_CONSTITUTION.md` | §1.2 |
| Los 6 principios fundamentales (P1-P6) son irreducibles. | `ARNES_CONSTITUTION.md` | §3 |
| Los 6 invariantes del framework (F1-F6) son condiciones que siempre deben cumplirse. | `ARNES_CONSTITUTION.md` | §9 |

#### Arquitectura cognitiva

| Decisión | Documento | Sección |
|---|---|---|
| El framework opera en dos planos cognitivos: Estratégico (PLAN) y Operacional (BUILD). | `COGNITIVE_ARCHITECTURE.md` | §2 |
| El Mission Analyzer (SDL) ejecuta ORIENT→ANALYZE→EVALUATE→DECIDE→PLAN→VERIFY→DELIVER. | `COGNITIVE_ARCHITECTURE.md` | §3 |
| El Director (AEL) opera bajo L1-L4. Es soberano dentro del ExecutionPlan. | `COGNITIVE_ARCHITECTURE.md` | §4 |
| El Decision Engine garantiza que Conocimiento, Decisión y Evidencia no se mezclan. | `COGNITIVE_ARCHITECTURE.md` | §5 |
| Existen 7 capacidades: Discovery, Architecture, Implementation, Validation, Memory, Learning, Governance. | `COGNITIVE_ARCHITECTURE.md` | §6 |
| Los 6 invariantes arquitectónicos (CA-1 a CA-6) son estructurales. | `COGNITIVE_ARCHITECTURE.md` | §9 |

#### Objetos cognitivos

| Decisión | Documento | Sección |
|---|---|---|
| Existen 7 objetos cognitivos: Mission, DecisionPackage, Decision, ExecutionPlan, ExecutionReport, Review, Incident. | `COGNITIVE_OBJECT_MODEL.md` | §1.3 |
| Cada objeto tiene estados, entradas, salidas y ciclo de vida definidos. | `COGNITIVE_OBJECT_MODEL.md` | §2-§7 |
| Los 9 invariantes del modelo (OM-1 a OM-9) gobiernan la integridad de los objetos. | `COGNITIVE_OBJECT_MODEL.md` | §9 |

#### Gobernanza

| Decisión | Documento | Sección |
|---|---|---|
| La jerarquía documental tiene 4 niveles (0-3). | `GOVERNANCE.md` | §2 |
| El Governor es la máxima autoridad operacional. El SDL revisa cambios de Nivel 0 y 1. | `GOVERNANCE.md` | §3 |
| Los cambios arquitectónicos se documentan como Framework ADRs (F-ADR-NNN). | `GOVERNANCE.md` | §5 |
| Existe separación entre evolución del framework y evolución de productos. | `GOVERNANCE.md` | §7 |

#### Versionado

| Decisión | Documento | Sección |
|---|---|---|
| El framework usa MAJOR.MINOR.PATCH con semántica documental. | `VERSIONING.md` | §1 |
| Cambios breaking (MAJOR) requieren guía de migración para productos. | `VERSIONING.md` | §3 |
| La política de deprecación exige 1 versión MINOR de gracia antes de eliminación. | `VERSIONING.md` | §9 |

#### Modelo de implementación

| Decisión | Documento | Sección |
|---|---|---|
| El ecosistema se organiza en 3 capas: Framework / Implementación / Producto. | `FRAMEWORK_IMPLEMENTATION_MODEL.md` | §1 |
| Las dependencias son estrictamente unidireccionales (↓). | `FRAMEWORK_IMPLEMENTATION_MODEL.md` | §5.1 |
| El test de extracción es el criterio definitivo de separación. | `FRAMEWORK_IMPLEMENTATION_MODEL.md` | §6.3 |

#### Estado de AEL

| Decisión | Documento | Sección |
|---|---|---|
| AEL tiene 2 acoplamientos críticos, 2 altos, 5 medios, 3 bajos. | `AEL_BOUNDARY_AUDIT.md` | §5 |
| La migración se ejecutará en 3 fases secuenciales. | `MIGRATION_STRATEGY.md` | §4 |
| 5 elementos constituyen deuda aceptada (no se migrarán). | `MIGRATION_STRATEGY.md` | §7 |

### 3.2 Lo que el baseline NO cubre

El baseline **no** cubre:

- Decisiones de implementación específicas de AEL (fuera de los documentos de Nivel 2).
- Decisiones de producto de AITOS (ADRs, schema, reglas de negocio).
- Estrategias de testing del framework.
- Estrategias de distribución o instalación del framework.
- Guías de uso, tutoriales o ejemplos.

Estos elementos se desarrollarán durante la etapa de implementación y se gobernarán según su nivel correspondiente.

---

## 4. Cambios permitidos sin F-ADR

Los siguientes cambios **no** requieren un Framework ADR. Pueden aplicarse directamente siguiendo el proceso de su nivel según `GOVERNANCE.md`.

### 4.1 Correcciones (PATCH)

| Tipo | Ejemplo | Nivel afectado |
|---|---|---|
| **Errores tipográficos** | Corregir "contitución" → "constitución". | Cualquiera |
| **Referencias rotas** | Actualizar un link que apunta a un archivo que se movió. | Cualquiera |
| **Inconsistencias menores** | Dos documentos usan nombres distintos para el mismo concepto. | Cualquiera |
| **Fechas y metadatos** | Actualizar "Última modificación: 2026-07-20" → "2026-07-22". | Cualquiera |

### 4.2 Clarificaciones (PATCH o MINOR)

| Tipo | Ejemplo | Nivel afectado |
|---|---|---|
| **Reformulación** | Reescribir un párrafo para mayor claridad sin cambiar su significado normativo. | 1, 2 |
| **Ejemplos** | Agregar un ejemplo que ilustra un concepto ya definido. | 1, 2 |
| **Notas al pie** | Agregar una aclaración no normativa. | 1, 2 |
| **Glosario** | Agregar una definición a un glosario existente. | 1, 2 |

### 4.3 Implementaciones (MINOR o Nivel 2)

| Tipo | Ejemplo | Nivel afectado |
|---|---|---|
| **Nuevo comando de agente** | Crear `.opencode/commands/ael-new.md`. | 2 |
| **Refinamiento de contrato** | Especificar con más detalle qué hace un agente sin cambiar sus garantías. | 2 |
| **Nueva herramienta** | Agregar un script de soporte en `ael/contracts/`. | 2 |
| **Configuración** | Modificar `opencode.json` para ajustar permisos. | 2 |

### 4.4 Documentación no normativa

| Tipo | Ejemplo |
|---|---|
| **README** | Actualizar `README.md` para reflejar nuevos documentos. |
| **CHANGELOG** | Agregar entradas al changelog del framework. |
| **Guías** | Crear guías de uso, tutoriales, FAQ. |

---

## 5. Cambios que requieren F-ADR

Los siguientes cambios **requieren** un Framework ADR (F-ADR-NNN) según el proceso definido en `GOVERNANCE.md` §5.

### 5.1 Cambios en principios (Nivel 0)

| Cambio | Proceso requerido |
|---|---|
| Modificar, eliminar o agregar un principio fundamental (P1-P6). | Enmienda constitucional (§3.1 de GOVERNANCE.md). Umbral especial. |
| Modificar, eliminar o agregar un invariante del framework (F1-F6). | Enmienda constitucional. |
| Cambiar el propósito o la identidad del framework. | Enmienda constitucional. |
| Modificar la separación Framework/Producto. | Enmienda constitucional. |

### 5.2 Cambios en arquitectura (Nivel 1)

| Cambio | Proceso requerido |
|---|---|
| Modificar la arquitectura de dos planos (agregar, eliminar o fusionar planos). | F-ADR de Nivel 1. |
| Cambiar el flujo del Mission Analyzer (ORIENT→ANALYZE→...→DELIVER). | F-ADR de Nivel 1. |
| Modificar el ciclo de vida del Director (L1-L4). | F-ADR de Nivel 1. |
| Cambiar el funcionamiento del Decision Engine. | F-ADR de Nivel 1. |
| Modificar, eliminar o agregar invariantes arquitectónicos (CA-1 a CA-6). | F-ADR de Nivel 1. |
| Agregar, eliminar o fusionar capacidades del framework. | F-ADR de Nivel 1. |

### 5.3 Cambios en objetos cognitivos (Nivel 1)

| Cambio | Proceso requerido |
|---|---|
| Agregar, eliminar o modificar un objeto cognitivo (Mission, DecisionPackage, Decision, ExecutionPlan, ExecutionReport, Review, Incident). | F-ADR de Nivel 1. |
| Cambiar los estados de un objeto cognitivo. | F-ADR de Nivel 1. |
| Modificar la estructura obligatoria de un objeto (campos requeridos). | F-ADR de Nivel 1. |
| Cambiar el ciclo de vida de un objeto (quién lo crea, consume, archiva). | F-ADR de Nivel 1. |
| Modificar, eliminar o agregar invariantes del modelo de objetos (OM-1 a OM-8). | F-ADR de Nivel 1. |

### 5.4 Cambios en gobernanza (Nivel 1)

| Cambio | Proceso requerido |
|---|---|
| Modificar la jerarquía documental (número de niveles, criterios de clasificación). | F-ADR de Nivel 1. |
| Cambiar la autoridad de modificación de cualquier nivel. | F-ADR de Nivel 1. |
| Modificar el proceso de Framework ADR. | F-ADR de Nivel 1. |
| Cambiar el formato de F-ADR. | F-ADR de Nivel 1. |
| Modificar el proceso de enmienda constitucional. | F-ADR de Nivel 1 con revisión del SDL. |

### 5.5 Cambios en el modelo de implementación (Nivel 1)

| Cambio | Proceso requerido |
|---|---|
| Modificar el modelo de tres capas (Framework / Implementación / Producto). | F-ADR de Nivel 1. |
| Cambiar las reglas de dependencia entre capas. | F-ADR de Nivel 1. |
| Alterar la matriz de dependencias (qué capa puede depender de cuál). | F-ADR de Nivel 1. |
| Modificar el test de extracción como criterio de separación. | F-ADR de Nivel 1. |

### 5.6 Cambios en el versionado (Nivel 1)

| Cambio | Proceso requerido |
|---|---|
| Modificar el esquema de versiones (MAJOR.MINOR.PATCH). | F-ADR de Nivel 1. |
| Cambiar la definición de cambio breaking. | F-ADR de Nivel 1. |
| Modificar la política de deprecación. | F-ADR de Nivel 1. |

---

## 6. Inicio de la etapa siguiente

### 6.1 Declaración de transición

**La etapa de diseño de ARNÉS Framework v1.0.0 concluye oficialmente con este baseline.**

La siguiente etapa oficial es:

> **IMPLEMENTATION & MIGRATION**

### 6.2 Qué implica la nueva etapa

| Actividad | Guía |
|---|---|
| **Ejecutar la migración de AEL** | Seguir `MIGRATION_STRATEGY.md`. Fase 1 → Fase 2 → Fase 3. |
| **Implementar agentes ARNÉS** | Materializar las capacidades definidas en el framework para la plataforma OpenCode. |
| **Parametrizar enforcement** | Fase 3 de la migración. Extraer reglas de AITOS a `product-rules.json`. |
| **Verificar criterios de aceptación** | Cumplir CA-01 a EX-01 definidos en `MIGRATION_STRATEGY.md` §6. |
| **Preparar extracción** | Asegurar que `ael/` puede copiarse a un repositorio independiente. |
| **Construir segundo producto** | Validar que ARNÉS funciona para un dominio distinto a transporte. |

### 6.3 Qué NO implica la nueva etapa

- **No** se modifica la arquitectura del framework.
- **No** se crean nuevos principios, objetos o capacidades.
- **No** se redefine la gobernanza.
- **No** se altera el modelo de tres capas.

Si durante la implementación surge la necesidad de modificar el diseño, se escala mediante F-ADR siguiendo el proceso definido en `GOVERNANCE.md`.

### 6.4 Primera misión de la nueva etapa

La primera misión de IMPLEMENTATION & MIGRATION será:

> **Ejecutar la Fase 1 de la migración de AEL: Desacoplamiento textual.**

Esto implica modificar 8 archivos (~20 líneas) para eliminar referencias cosméticas a AITOS, siguiendo el plan detallado en `MIGRATION_STRATEGY.md` §4.1.

### 6.5 Gobernanza durante la implementación

Durante la etapa de implementación:

- Los documentos del baseline (Niveles 0 y 1) **no se modifican** sin F-ADR.
- Los documentos operacionales (Nivel 2) pueden modificarse con aprobación del Governor.
- Los artefactos de implementación (código, configuración, scripts) se gestionan con control de versiones estándar.
- Cada misión de migración se ejecuta bajo el proceso PLAN→BUILD.
- Los resultados se registran en el changelog del framework (`docs/arnes/CHANGELOG.md`).

---

## 7. Firma arquitectónica

### 7.1 Aprobación

Este baseline fue aprobado por:

| Rol | Agente | Fecha |
|---|---|---|
| **Strategic Director (SDL)** | PLAN | 2026-07-22 |
| **Director (AEL)** | BUILD | 2026-07-22 |

### 7.2 Testigos documentales

Los siguientes documentos atestiguan la completitud del diseño:

| Documento | Rol en el baseline |
|---|---|
| `ARNES_CONSTITUTION.md` | Define lo que el framework ES. |
| `COGNITIVE_ARCHITECTURE.md` | Define cómo el framework PIENSA. |
| `COGNITIVE_OBJECT_MODEL.md` | Define qué INFORMATION fluye. |
| `GOVERNANCE.md` | Define cómo el framework EVOLUCIONA. |
| `VERSIONING.md` | Define cómo el framework SE VERSIONA. |
| `FRAMEWORK_IMPLEMENTATION_MODEL.md` | Define cómo el framework se MATERIALIZA. |
| `AEL_BOUNDARY_AUDIT.md` | Define el ESTADO ACTUAL de la implementación. |
| `MIGRATION_STRATEGY.md` | Define el CAMINO hacia la independencia. |
| `BASELINE_v1.0.0.md` | Declara el CONGELAMIENTO del diseño. |

### 7.3 Versión del baseline

| Atributo | Valor |
|---|---|
| **Framework** | ARNÉS |
| **Versión** | 1.0.0 |
| **Estado** | FROZEN |
| **Fecha de congelamiento** | 2026-07-22 |
| **Próxima etapa** | IMPLEMENTATION & MIGRATION |
| **Próxima versión esperada** | 1.1.0 (post-migración) o 2.0.0 (post-extracción) |

---

> *ARNÉS Framework v1.0.0 — Baseline congelado. El diseño fundacional está completo. La arquitectura es estable. Las reglas de evolución están definidas. La implementación comienza ahora.*
