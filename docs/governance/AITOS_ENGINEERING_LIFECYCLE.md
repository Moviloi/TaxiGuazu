# AITOS Engineering Lifecycle (AELC)

> **Tipo:** Proceso oficial de ingeniería  
> **Fecha:** 2026-07-21  
> **Autor:** BUILD / AEL  
> **Estado:** ACTIVE — Operational Lifecycle  
> **Precedido por:** AITOS Baseline 1.0  
> **Régimen:** Constitutional Governance  

---

## Tabla de contenidos

1. [Objetivo](#1-objetivo)
2. [Principios del Lifecycle](#2-principios-del-lifecycle)
3. [Lifecycle Oficial](#3-lifecycle-oficial)
4. [Mission State Model](#4-mission-state-model)
5. [Baseline Governance](#5-baseline-governance)
6. [Change Classification](#6-change-classification)
7. [Governance Integration](#7-governance-integration)
8. [Foundation Closure](#8-foundation-closure)

---

## 1. Objetivo

Definir el ciclo oficial mediante el cual cualquier cambio evoluciona desde una idea hasta una nueva Baseline certificada.

Este documento establece el **AITOS Engineering Lifecycle (AELC)** como el proceso oficial de ingeniería del proyecto. Aplica a toda misión a partir de la declaración de **AITOS Baseline 1.0**.

### 1.1 Relación con documentos existentes

| Documento | Rol en el Lifecycle |
|-----------|---------------------|
| `AITOS_CONSTITUTION.md` | Marco normativo superior del producto |
| `ael/constitution/SPEC.md` | Restricciones del proceso de desarrollo (invariantes, constraints, capabilities) |
| `ael/constitution/CONTRACTS.md` | Reglas de verificación automática entre capas |
| `ael/government/ORGANIZATION.md` | Roles, capacidades, autoridad y Professional Engineering Doctrine |
| `BASELINE_1_0.md` | Estado congelado inicial del proyecto |
| `CONSTITUTIONAL_TRACEABILITY_MATRIX.md` | Mapa de trazabilidad constitucional permanente |

### 1.2 Lo que este documento NO hace

- No redefine la Constitución.
- No redefine la arquitectura.
- No modifica la Baseline 1.0.
- No introduce nuevos principios constitucionales.
- No reemplaza las definiciones de SPEC.md, CONTRACTS.md u ORGANIZATION.md.
- No prescribe cómo el Director (AEL) ejecuta internamente una misión — eso queda bajo su soberanía táctica (SPEC.md §2).

Este documento **formaliza el proceso** que conecta los artefactos existentes en un ciclo evolutivo gobernado.

---

## 2. Principios del Lifecycle

El AELC se rige por los siguientes principios permanentes:

### P1 — La Constitución gobierna el producto
Toda decisión de diseño, implementación y operación debe respetar las 118 disposiciones de `AITOS_CONSTITUTION.md`. Ningún cambio puede justificar el incumplimiento de una disposición constitucional.

### P2 — La Baseline gobierna la evolución
La Baseline activa representa el estado certificado del proyecto. Ninguna modificación puede ocurrir fuera del ciclo de cambio gobernado. La Baseline es el punto de partida y el punto de llegada de toda misión.

### P3 — Toda modificación comienza con un análisis de impacto
Antes de planificar o implementar cualquier cambio, debe consultarse la CTM para determinar el alcance del impacto sobre disposiciones, componentes, documentos y certificaciones.

### P4 — Ninguna implementación puede alterar la Baseline directamente
La Baseline solo se modifica al final del ciclo, tras validación y certificación. Durante la ejecución de una misión, el sistema opera en **Working State**, no en estado de Baseline.

### P5 — Toda modificación debe terminar certificada
Ningún cambio se considera completo hasta que las certificaciones correspondientes se hayan ejecutado y aprobado. La certificación es la puerta de entrada a la nueva Baseline.

### P6 — La CTM gobierna la trazabilidad
La Constitutional Traceability Matrix es el mapa oficial que vincula disposiciones, componentes, documentos, ADRs, tests y certificaciones. Debe mantenerse actualizada tras cada misión.

### P7 — La documentación evoluciona junto con el software
Toda modificación de código que afecte disposiciones, ADRs, contratos o decisiones documentadas debe ir acompañada de la actualización de los documentos correspondientes.

### P8 — La Professional Engineering Doctrine gobierna el comportamiento
Agentes de los niveles SDL, AEL y capabilities operan bajo la Professional Engineering Doctrine (`ael/government/ORGANIZATION.md` §Professional Engineering Doctrine): elevan calidad técnica, profesionalizan terminología, detectan ambigüedad y preservan la intención funcional.

### P9 — No regresión
Toda misión debe dejar el sistema en un estado igual o mejor al que lo encontró (Invariant I6, SPEC.md). Tests, build y contratos deben mantenerse.

### P10 — Ciclo completo
No se considera una misión completa hasta que la CTM y la Baseline han sido actualizadas reflejando el nuevo estado del sistema.

---

## 3. Lifecycle Oficial

### 3.1 Diagrama del ciclo

```
     ┌─────────────────────────────────────────────────────────────┐
     │                    AITOS Engineering Lifecycle              │
     │                    (AELC - Ciclo completo)                  │
     └─────────────────────────────────────────────────────────────┘

     Need
       │
       ▼
     Mission Request
       │
       ▼
     Impact Analysis (CTM)
       │
       ▼
     Strategic Planning (SDL)
       │
       ▼
     Mission Planning (AEL)
       │
       ▼
     Implementation
       │
       ▼
     Validation
       │
       ▼
     Certification
       │
       ▼
     Documentation Update
       │
       ▼
     CTM Update
       │
       ▼
     Baseline Update
       │
       ▼
     Mission Closed
```

### 3.2 Descripción de etapas

---

#### 3.2.1 Need

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Identificar una necesidad de cambio en el sistema (bug, mejora, feature, refactor, cambio constitucional o arquitectónico). |
| **Entrada** | Reporte de bug, solicitud de funcionalidad, observación de deuda técnica, requisito de negocio, observación de auditoría. |
| **Salida** | Necesidad documentada y clasificada según la taxonomía de cambios (§6). |
| **Responsable** | Cualquier rol del ecosistema o stakeholder externo. |

---

#### 3.2.2 Mission Request

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Formalizar la necesidad como una solicitud de misión con alcance preliminar. |
| **Entrada** | Necesidad documentada. |
| **Salida** | Mission Request — contiene: descripción, clasificación (§6), justificación, prioridad preliminar. |
| **Responsable** | SDL (Strategic Director) o el rol que detecta la necesidad. |

---

#### 3.2.3 Impact Analysis (CTM)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Determinar el alcance del cambio utilizando la Constitutional Traceability Matrix: disposiciones afectadas, componentes impactados, documentos requeridos, tests y certificaciones necesarias. |
| **Entrada** | Mission Request + CTM (`CONSTITUTIONAL_TRACEABILITY_MATRIX.md`). |
| **Salida** | Impact Analysis Report (alcance, riesgos, disposiciones, documentos, componentes, certificaciones requeridas). |
| **Responsable** | SDL (Strategic Director) — puede delegar Discovery a `@ael-explore`. |

---

#### 3.2.4 Strategic Planning (SDL)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Producir un Execution Plan estructurado que defina objetivos, restricciones, criterios de éxito y evidencia requerida. |
| **Entrada** | Impact Analysis Report + Mission Request. |
| **Salida** | Execution Plan — incluye: objetivos, constraints, evidence requirements, success criteria, riesgo estimado. |
| **Responsable** | **SDL (Strategic Director)** — soberanía estratégica. No modifica código, no ejecuta herramientas, no escribe implementación. |

---

#### 3.2.5 Mission Planning (AEL)

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Descomponer el Execution Plan en tareas ejecutables, decidir capacidades a invocar, orden, paralelismo y estimaciones tácticas. |
| **Entrada** | Execution Plan (desde SDL). |
| **Salida** | Plan de ejecución táctica (descomposición, capacidades, orden, dependencias). |
| **Responsable** | **AEL Director** — soberanía táctica dentro del Execution Plan. Puede delegar en capabilities o ejecutar internamente. |

---

#### 3.2.6 Implementation

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Aplicar los cambios aprobados al sistema (código, configuración, documentación técnica). |
| **Entrada** | Plan de ejecución táctica + cambios aprobados. |
| **Salida** | Código modificado, tests actualizados, configuración ajustada. |
| **Responsable** | AEL Director — puede delegar en `@ael-implementer` o ejecutar directamente. |

---

#### 3.2.7 Validation

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Verificar que el sistema modificado satisface los quality gates: tests, build, contratos entre capas, invariantes I1-I6. |
| **Entrada** | Código modificado + quality gates definidos (SPEC.md §3 invariants, CONTRACTS.md). |
| **Salida** | Validation Report — PASS/FAIL detallado. |
| **Responsable** | AEL Director — puede delegar en `@ael-audit`. El rol de Auditor tiene autoridad de bloqueo. |

---

#### 3.2.8 Certification

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Ejecutar las certificaciones formales requeridas según el tipo de cambio (§6): enforce contracts, auditoría constitucional si aplica, certificación de baseline. |
| **Entrada** | Validation Report + impacto identificado en CTM. |
| **Salida** | Certification Report — certificación emitida (PASS/PARTIAL/FAIL). |
| **Responsable** | AEL Director — puede delegar en `@ael-audit`. Para cambios constitucionales: requiere campaña CGP. |

---

#### 3.2.9 Documentation Update

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Actualizar toda la documentación afectada identificada en el Impact Analysis: ADRs, contratos, diagramas, guías, changelog, project board, technical debt baseline. |
| **Entrada** | Impact Analysis Report (documentos afectados) + cambios implementados. |
| **Salida** | Documentación actualizada. |
| **Responsable** | AEL Director — puede delegar en `@ael-memory`. |

---

#### 3.2.10 CTM Update

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Reflejar el nuevo estado de trazabilidad en la Constitutional Traceability Matrix. |
| **Entrada** | Cambios implementados + documentación actualizada + certificaciones emitidas. |
| **Salida** | CTM actualizada con nuevas trazabilidades, disposiciones, componentes o documentos modificados. |
| **Responsable** | AEL Director — puede delegar en `@ael-memory`. |

---

#### 3.2.11 Baseline Update

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Declarar una nueva Baseline que incorpore los cambios certificados. |
| **Entrada** | CTM actualizada + Certification Report + documentación actualizada. |
| **Salida** | Nueva Baseline declarada (versión incrementada). |
| **Responsable** | AEL Director, con validación de gobernanza. |

---

#### 3.2.12 Mission Closed

| Atributo | Descripción |
|----------|-------------|
| **Objetivo** | Cerrar formalmente la misión verificando que todas las etapas del ciclo se completaron. |
| **Entrada** | Baseline actualizada + todas las etapas previas completadas. |
| **Salida** | Misión cerrada, estado registrado, lecciones preservadas. |
| **Responsable** | AEL Director. |

---

## 4. Mission State Model

Cada misión recorre los siguientes estados en orden secuencial. Ninguna transición puede saltarse.

### 4.1 Diagrama de estados

```
     ┌─────────────┐
     │  REQUESTED  │
     └──────┬──────┘
            │ Impact Analysis completado
            ▼
     ┌─────────────┐
     │  ANALYZED   │
     └──────┬──────┘
            │ Execution Plan emitido por SDL
            ▼
     ┌─────────────┐
     │   PLANNED   │
     └──────┬──────┘
            │ Plan táctico aprobado por AEL
            ▼
     ┌─────────────┐
     │  APPROVED   │
     └──────┬──────┘
            │ Implementación en progreso
            ▼
     ┌────────────────┐
     │ IMPLEMENTING   │
     └───────┬────────┘
             │ Implementación completa, validación iniciada
             ▼
     ┌────────────────┐
     │  VALIDATING    │
     └───────┬────────┘
             │ Validación PASS
             ▼
     ┌────────────────┐
     │  CERTIFYING    │
     └───────┬────────┘
             │ Certificación emitida
             ▼
     ┌────────────────┐
     │    MERGED      │
     └───────┬────────┘
             │ Documentación y CTM actualizadas
             ▼
     ┌─────────────────────┐
     │ BASELINE UPDATED    │
     └───────┬─────────────┘
             │ Baseline declarada
             ▼
     ┌────────────────┐
     │    CLOSED      │
     └────────────────┘
```

### 4.2 Definición de estados

| Estado | Significado | Condición de entrada | Condición de salida |
|--------|-------------|---------------------|---------------------|
| **REQUESTED** | La misión ha sido solicitada pero no analizada. | Misión creada. | Impact Analysis completado y documentado. |
| **ANALYZED** | El impacto ha sido evaluado mediante la CTM. | Impact Analysis Report emitido. | Execution Plan recibido desde SDL. |
| **PLANNED** | El Execution Plan ha sido descompuesto en tareas tácticas por AEL. | Plan de ejecución táctica definido. | Plan aprobado por AEL Director. |
| **APPROVED** | El plan ha sido aprobado y autorizado para ejecución. | Aprobación del plan. | Implementación iniciada. |
| **IMPLEMENTING** | Los cambios se están aplicando al sistema. | Primer cambio de código/configuración. | Implementación completa y lista para validación. |
| **VALIDATING** | Los quality gates se están ejecutando. | Handoff a validación. | Validation PASS (o FAIL con replanificación). |
| **CERTIFYING** | Las certificaciones formales están en ejecución. | Validación PASS. | Certification Report emitido (PASS/PARTIAL). |
| **MERGED** | Los cambios certificados han sido integrados. | Certificación emitida. | Documentación y CTM actualizadas. |
| **BASELINE UPDATED** | Una nueva Baseline refleja los cambios. | Documentación y CTM actualizadas. | Nueva Baseline declarada oficialmente. |
| **CLOSED** | La misión ha finalizado completamente. | Baseline actualizada. | — |

### 4.3 Transiciones inválidas

- No se puede pasar a **IMPLEMENTING** sin **APPROVED**.
- No se puede pasar a **CERTIFYING** sin **VALIDATING** PASS.
- No se puede pasar a **BASELINE UPDATED** sin **CERTIFYING** PASS.
- No se puede pasar a **CLOSED** sin **BASELINE UPDATED**.
- Cualquier estado puede retroceder a **REQUESTED** o **PLANNED** si las condiciones cambian (replanificación).

---

## 5. Baseline Governance

### 5.1 Regla fundamental

> **La Baseline nunca se modifica directamente.**

Toda evolución del sistema sigue el siguiente patrón obligatorio:

#### Correcto

```
     ┌──────────────┐
     │   Baseline   │  ← Estado actual certificado
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │   Mission    │  ← Ciclo AELC completo
     └──────┬───────┘
            │
            ▼
     ┌──────────────────┐
     │  Working State   │  ← Desarrollo activo (no certificado)
     └──────┬───────────┘
            │
            ▼
     ┌──────────────────┐
     │   Validation     │  ← Quality gates
     └──────┬───────────┘
            │
            ▼
     ┌──────────────────┐
     │  Certification   │  ← Certificación formal
     └──────┬───────────┘
            │
            ▼
     ┌──────────────────┐
     │  Nueva Baseline  │  ← Estado certificado actualizado
     └──────────────────┘
```

#### Incorrecto (prohibido)

```
     ┌──────────────┐
     │   Baseline   │
     └──────┬───────┘
            │
            ▼
     ┌───────────────────┐
     │ Modificar archivos│  ← Sin validación, sin certificación
     └───────┬───────────┘
             │
             ▼
     ┌──────────────┐
     │     Fin      │
     └──────────────┘
```

### 5.2 Working State

Durante la ejecución de una misión (estados IMPLEMENTING a MERGED), el sistema se encuentra en **Working State**. Las características del Working State son:

- **No certificado** — los cambios pueden estar incompletos o en proceso.
- **Aislado** — los cambios no afectan la Baseline activa hasta que sean certificados.
- **Reversible** — si la validación falla, el sistema retorna al estado de Baseline mediante reversión (version control).
- **Trazable** — todo cambio en Working State debe poder rastrearse a una decisión de misión.

### 5.3 Condiciones de nueva Baseline

Una nueva Baseline se declara cuando:

1. La misión ha completado todas las etapas del ciclo AELC.
2. La certificación ha sido emitida (PASS o PARTIAL documentado).
3. La documentación ha sido actualizada.
4. La CTM refleja el nuevo estado de trazabilidad.
5. La Baseline anterior queda como historial (BASELINE SUPERSEDED).

### 5.4 Versionado de Baseline

| Formato | Ejemplo | Cuándo |
|---------|---------|--------|
| `AITOS Baseline X.Y` | Baseline 1.0 → 1.1 | Cambios menores (bug fix, improvement, refactor) |
| `AITOS Baseline X+1.0` | Baseline 1.x → 2.0 | Cambio arquitectónico mayor o constitucional |
| `AITOS Baseline X.Y+1` | Baseline 1.0 → 1.1 | Acumulación de misiones menores certificadas |

---

## 6. Change Classification

### 6.1 Taxonomía de cambios

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| **Bug Fix** | Corrección de un comportamiento incorrecto existente. | Error en validación de input, crash en condición de borde, cálculo incorrecto. |
| **Refactoring** | Reestructuración interna sin cambio de comportamiento externo. | Renombrar variable, extraer función, reorganizar módulos. |
| **Improvement** | Mejora de atributos de calidad sin nueva funcionalidad. | Optimización de performance, reducción de deuda técnica, mejora de logging. |
| **Feature** | Adición de nueva funcionalidad al sistema. | Nuevo comando, nuevo endpoint, nueva integración. |
| **Architectural Change** | Modificación de la estructura de capas, dependencias o contratos. | Nuevo ADR, cambio en dirección de dependencias, nueva capa. |
| **Constitutional Change** | Modificación de una o más disposiciones de la Constitución. | Nueva disposición, modificación de PC existente, cambio en jerarquía normativa. |

### 6.2 Matriz de requerimientos por tipo de cambio

| Tipo | Impacto esperado | Certificaciones requeridas | Actualización documental | Actualizar CTM | Nueva Baseline |
|------|-----------------|---------------------------|------------------------|----------------|----------------|
| **Bug Fix** | Localizado, una o pocas unidades de código. | `enforce.sh`, tests, build. | Mínima (changelog + project board). | Solo si afecta disposición trazada. | No necesariamente — puede cerrar sin nueva Baseline si el cambio es menor y no altera activos congelados. |
| **Refactoring** | Estructural pero sin cambio semántico externo. | `enforce.sh`, tests, build, lint. | Actualización de diagramas si cambia estructura. | Sí, si cambia relaciones entre componentes y disposiciones. | No necesariamente — acumulable. |
| **Improvement** | No funcional, puede cruzar múltiples componentes. | `enforce.sh`, tests, build, análisis de regresión. | Actualización de guías o documentos técnicos si aplica. | Sí, si modifica cobertura de disposiciones. | Solo si afecta activos congelados o mejora certificaciones PARTIAL. |
| **Feature** | Funcional, puede afectar múltiples capas. | `enforce.sh`, tests, build, auditoría de impacto arquitectónico, revisión de ADRs. | ADRs si hay decisión arquitectónica nueva, documentación de API, changelog, project board. | **Sí — obligatorio.** | **Sí — obligatorio.** |
| **Architectural Change** | Estructural, afecta capas y dependencias. | `enforce.sh`, tests, build, auditoría completa de ADRs, revisión de CONTRACTS.md, SPEC.md si aplica. | **Obligatoria:** ADR nuevo o modificación, actualización de contratos, diagramas, SPEC.md si cambian invariants. | **Sí — obligatorio.** | **Sí — obligatorio.** |
| **Constitutional Change** | Global, afecta todo el sistema. | **Campaña CGP completa** (CGP-5 o superior), auditoría constitucional completa, recertificación de disposiciones afectadas. | **Obligatoria:** Constitución, CTM, certificaciones, baseline, documentación derivada. | **Sí — obligatorio.** | **Sí — obligatorio.** Nueva versión principal de Baseline. |

### 6.3 Reglas de clasificación

1. Si un cambio califica para múltiples tipos, se clasifica por el de **mayor impacto**.
2. Un Bug Fix que requiera cambio arquitectónico se clasifica como **Architectural Change** (no Bug Fix).
3. Una Feature que requiera cambio constitucional se clasifica como **Constitutional Change** (no Feature).
4. La clasificación se define en la etapa **Impact Analysis (CTM)** y queda registrada en el Mission Request.

---

## 7. Governance Integration

### 7.1 Cadena de dependencias

El AELC integra los artefactos de gobernanza en una cadena vertical de dependencias:

```
     ┌──────────────────────────────────────────────────────────────┐
     │                    CONSTITUCIÓN                              │
     │  docs/architecture/AITOS_CONSTITUTION.md                    │
     │  118 disposiciones — Máxima autoridad normativa del producto │
     └─────────────────────────┬────────────────────────────────────┘
                               │ define
                               ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                      CTM                                     │
     │  docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md           │
     │  Traza cada disposición → documentos, ADRs, componentes,    │
     │  tests, certificaciones                                     │
     └─────────────────────────┬────────────────────────────────────┘
                               │ vincula
                               ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                    BASELINE                                   │
     │  docs/governance/BASELINE_1_0.md                            │
     │  Estado congelado y certificado del proyecto                 │
     └─────────────────────────┬────────────────────────────────────┘
                               │ inicia
                               ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                    MISSION                                    │
     │  Ciclo AELC completo (Need → Closed)                        │
     │  Tipos: Bug Fix, Refactoring, Improvement, Feature,         │
     │  Architectural Change, Constitutional Change                 │
     └─────────────────────────┬────────────────────────────────────┘
                               │ ejecuta
                               ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                  IMPLEMENTACIÓN                               │
     │  Código, configuración, documentación técnica                │
     │  Gobernado por SPEC.md (invariants, constraints)             │
     └─────────────────────────┬────────────────────────────────────┘
                               │ verifica
                               ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                  CERTIFICACIÓN                                │
     │  enforce.sh, tests, build, auditoría constitucional          │
     │  CONTRACTS.md, CGP campañas si aplica                        │
     └─────────────────────────┬────────────────────────────────────┘
                               │ actualiza
                               ▼
     ┌──────────────────────────────────────────────────────────────┐
     │               NUEVA BASELINE                                  │
     │  Ciclo completo — trazabilidad preservada                    │
     └──────────────────────────────────────────────────────────────┘
```

### 7.2 Rol de cada artefacto

| Artefacto | Rol en la gobernanza | ¿Puede cambiar sin CGP? |
|-----------|---------------------|------------------------|
| **Constitución** (`AITOS_CONSTITUTION.md`) | Máxima autoridad normativa del producto. Define qué debe cumplir el sistema. | ❌ Solo mediante campaña CGP. |
| **CTM** (`CONSTITUTIONAL_TRACEABILITY_MATRIX.md`) | Mapa de trazabilidad. Vincula disposiciones con implementación, documentación y certificación. | ✅ Se actualiza en cada misión. |
| **Baseline** (`BASELINE_X_Y.md`) | Estado certificado del proyecto. Congela activos hasta la próxima misión completa. | ❌ Solo al final del ciclo AELC. |
| **SPEC.md** | Restricciones del proceso de desarrollo. Define invariantes, constraints y capabilities. | ❌ Solo mediante cambio de gobernanza. |
| **CONTRACTS.md** | Reglas de verificación automática entre capas arquitectónicas. | ❌ Solo mediante Architectural Change. |
| **ORGANIZATION.md** | Roles, autoridades, Professional Engineering Doctrine. | ✅ Actualizable por Governance. |
| **ADRs** | Decisiones arquitectónicas registradas. | ✅ Se crean/modifican en Architectural Change. |

### 7.3 Integración con SDL y AEL

El ciclo AELC reconoce dos niveles de autoridad definidos en SPEC.md y ORGANIZATION.md:

| Nivel | Rol | Fase del ciclo | Responsabilidad |
|-------|-----|---------------|-----------------|
| **Estratégico** | SDL (Strategic Director) | Need → Impact Analysis → Strategic Planning | Define qué hacer (objetivos, constraints, success criteria). No ejecuta. |
| **Táctico** | AEL (Director) | Mission Planning → Implementation → Validation → Certification → Documentation → CTM → Baseline → Close | Decide cómo hacerlo. Ejecuta o delega. |

Ambos niveles operan bajo la Professional Engineering Doctrine (`ORGANIZATION.md` §Professional Engineering Doctrine).

---

## 8. Foundation Closure

### 8.1 Declaración oficial

Por la presente se declara oficialmente concluida la **etapa fundacional del proyecto AITOS**.

### 8.2 Activos completados

| Hito | Documento | Estado |
|------|-----------|--------|
| ✓ **Constitution** | `docs/architecture/AITOS_CONSTITUTION.md` v2.0 | 118 disposiciones, jerarquía normativa, principios, RNF, heurísticas |
| ✓ **Governance** | `ael/government/ORGANIZATION.md` | Roles, capacidades, autoridades, Professional Engineering Doctrine |
| ✓ **Documentation Hierarchy** | `docs/audit/DOCUMENT_INVENTORY.md`, `DOCUMENT_ALIGNMENT_REPORT.md`, `DOCUMENT_DEPRECATION_PLAN.md` | 265 inventariados, 179 analizados, 21 contradicciones resueltas, 0 abiertas |
| ✓ **Professional Engineering Doctrine** | `ael/government/ORGANIZATION.md` §Professional Engineering Doctrine | 7 duties, 4 prohibitions, governance relationship |
| ✓ **Development Ecosystem** | `ael/` completo, `.opencode/` agents, `.agents/` skills | 37 componentes auditados, 10 inconsistencias corregidas |
| ✓ **Constitutional Certifications** | CGP-1, CGP-2, CGP-3 | 106 PASS, 7 PARTIAL, 0 FAIL — 100% cobertura auditables |
| ✓ **Constitutional Traceability Matrix** | `docs/audit/CONSTITUTIONAL_TRACEABILITY_MATRIX.md` | 118 disposiciones trazadas a 63 documentos, 14 ADRs, 25 componentes, 96 tests |
| ✓ **Baseline 1.0** | `docs/governance/BASELINE_1_0.md` | Architecture Freeze V4, Constitutional Governance Enabled, BASELINE ACTIVE |
| ✓ **Engineering Lifecycle** | `docs/governance/AITOS_ENGINEERING_LIFECYCLE.md` | Ciclo oficial de 12 etapas, 10 estados, 6 tipos de cambio, governance integration |

### 8.3 Estado final

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║               FOUNDATION COMPLETE                            ║
║                                                              ║
║        PLATFORM READY FOR CONTROLLED EVOLUTION               ║
║                                                              ║
║  • Constitución:            ✅ DEFINIDA (118 disposiciones)  ║
║  • Gobernanza:              ✅ ESTABLECIDA                   ║
║  • Documentación:           ✅ JERARQUIZADA                  ║
║  • Doctrine:                ✅ INCORPORADA                   ║
║  • Ecosistema:              ✅ ALINEADO                      ║
║  • Certificaciones:         ✅ EMITIDAS                      ║
║  • Trazabilidad:            ✅ MAPEADA                       ║
║  • Baseline:                ✅ CONGELADA (v1.0)              ║
║  • Lifecycle:               ✅ FORMALIZADO                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### 8.4 Lo que sigue

A partir de esta declaración:

1. Toda evolución del proyecto se rige exclusivamente por el **AITOS Engineering Lifecycle (AELC)** definido en este documento.
2. Ningún cambio puede ocurrir fuera del ciclo.
3. Toda misión debe respetar la **Baseline activa**, los **principios del lifecycle** y la **clasificación de cambios**.
4. Las observaciones de CGP-3 (7 PARTIAL, 1 INCONCLUSIVE) quedan registradas como **deuda técnica gobernada** y deberán abordarse en misiones futuras siguiendo el ciclo AELC.
5. Este documento, junto con `BASELINE_1_0.md`, constituye el **manual operativo permanente** para el desarrollo de AITOS.

---

*Este documento formaliza el ciclo de ingeniería que gobierna toda evolución futura del proyecto AITOS a partir de Baseline 1.0. Sustituye cualquier proceso operativo previo no documentado en la jerarquía normativa constitucional.*
