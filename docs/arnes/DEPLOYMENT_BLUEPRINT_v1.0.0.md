# ARNÉS Framework — Deployment Blueprint v1.0.0

> **Tipo:** Plan de despliegue
> **Versión:** 1.0.0
> **Fecha:** 2026-07-22
> **Estado:** APPROVED — pendiente de ejecución
> **Basado en:** `BASELINE_v1.0.0.md`, `DESIGN_CLOSURE_AUDIT.md`, `MIGRATION_STRATEGY.md`
>
> Este documento define cómo ARNÉS Framework v1.0.0 pasa de ser un diseño
> arquitectónico aprobado a ser el entorno operativo desde el cual se
> desarrolla AITOS. No rediseña nada. Solo planifica el despliegue.

---

## Índice

1. [Objetivo del despliegue](#1-objetivo-del-despliegue)
2. [Estado actual de componentes](#2-estado-actual-de-componentes)
3. [Roadmap de despliegue](#3-roadmap-de-despliegue)
4. [Dependencias entre etapas](#4-dependencias-entre-etapas)
5. [Riesgos del despliegue](#5-riesgos-del-despliegue)
6. [Checklist de aceptación](#6-checklist-de-aceptación)
7. [Declaración de operatividad](#7-declaración-de-operatividad)

---

## 1. Objetivo del despliegue

### 1.1 Qué significa "desplegar ARNÉS"

Desplegar ARNÉS Framework v1.0.0 significa transformar AEL desde su estado actual —una implementación funcional pero informal del framework— en el **entorno operativo oficial** desde el cual se desarrolla AITOS.

No significa:
- Reescribir AEL desde cero.
- Extraer ARNÉS a un repositorio independiente (eso es v2.0).
- Implementar todos los componentes diseñados (algunos son post-deployment).

Significa:
- Formalizar los contratos que ya operan implícitamente.
- Limpiar el acoplamiento con AITOS.
- Activar los mecanismos de gobernanza diseñados.
- Ejecutar la primera misión completa bajo el framework oficial.
- Poder declarar: **"Desde este momento, AITOS se desarrolla utilizando ARNÉS Framework."**

### 1.2 Estado final deseado

```
ANTES (estado actual)                    DESPUÉS (framework operativo)
─────────────────────────                ─────────────────────────────
AEL funciona con AITOS                   ARNÉS gobierna AITOS
Acoplamientos no resueltos               Acoplamientos resueltos o aceptados
Product Context implícito                Product Context formal por contrato
Agentes se identifican "AITOS"           Agentes se identifican "ARNÉS"
Enforcement hardcodeado                  Enforcement parametrizado
Documentos de AITOS en ael/              Documentos de AITOS en docs/
Gobernanza teórica                       Gobernanza operativa (enforce.sh activo)
Diseño aprobado, no verificado           Primera misión ejecutada bajo el framework
```

---

## 2. Estado actual de componentes

### 2.1 Matriz de estado

Cada componente del framework se clasifica según su estado de implementación en AEL.

| Componente | Documento de diseño | Estado | Evidencia |
|---|---|---|---|
| **Constitución (P1-P6, F1-F6)** | `ARNES_CONSTITUTION.md` | ✅ IMPLEMENTADO | `ael/constitution/SPEC.md` define I1-I6, L1-L4. |
| **Arquitectura de 2 planos** | `COGNITIVE_ARCHITECTURE.md` | ✅ IMPLEMENTADO | PLAN (.opencode/agents/plan.md) y BUILD (.opencode/agents/build.md). |
| **Mission Analyzer (SDL)** | `COGNITIVE_ARCHITECTURE.md` §3 | ✅ IMPLEMENTADO | Agente PLAN con flujo ORIENT→ANALYZE→...→DELIVER. |
| **Director (AEL)** | `COGNITIVE_ARCHITECTURE.md` §4 | ✅ IMPLEMENTADO | Agente BUILD con L1-L4. |
| **Decision Engine** | `COGNITIVE_ARCHITECTURE.md` §5 | ✅ IMPLEMENTADO | Contrato STRATEGIC_OPERATIONAL_CONTRACT.md. |
| **7 Capacidades** | `COGNITIVE_ARCHITECTURE.md` §6 | ✅ IMPLEMENTADO | 6 subagentes @ael-* + Governance. |
| **Objetos cognitivos (6)** | `COGNITIVE_OBJECT_MODEL.md` | ✅ IMPLEMENTADO | ExecutionPlan (JSON), ExecutionReport, Mission states. |
| **Ciclo de vida L1-L4** | `SPEC.md` §6 | ✅ IMPLEMENTADO | Prompt de BUILD. |
| **Invariantes I1-I6** | `SPEC.md` §3 | ✅ IMPLEMENTADO | Sección "Cierre de misión" en BUILD. |
| **Doctrina profesional** | `ORGANIZATION.md` | ✅ IMPLEMENTADO | Prompt de BUILD y contratos de rol. |
| **Jerarquía documental** | `GOVERNANCE.md` §2 | ✅ IMPLEMENTADO | Documentos en docs/arnes/ + ael/. |
| **Proceso de cambio (F-ADR)** | `GOVERNANCE.md` §3-5 | ⚠️ PARCIAL | Proceso definido. Directorio `adr/` no existe. Ningún F-ADR emitido. |
| **Esquema de versiones** | `VERSIONING.md` | ✅ IMPLEMENTADO | MAJOR.MINOR.PATCH declarado en todos los docs. |
| **Modelo de 3 capas** | `FRAMEWORK_IMPLEMENTATION_MODEL.md` | ⚠️ PARCIAL | Diseñado. AEL no cumple totalmente (12 acoplamientos). |
| **Auditoría de fronteras** | `AEL_BOUNDARY_AUDIT.md` | ✅ IMPLEMENTADO | Auditoría completada. |
| **Estrategia de migración** | `MIGRATION_STRATEGY.md` | ✅ IMPLEMENTADO | 3 fases diseñadas. |
| **Product Context Contract** | `PRODUCT_CONTEXT_CONTRACT.md` | ❌ PENDIENTE | Sin implementación. Contexto cargado informalmente. |
| **Project Adapter** | `PROJECT_ADAPTER_ARCHITECTURE.md` | ❌ PENDIENTE | Sin implementación. |
| **Runtime Profile** | `RUNTIME_PROFILE_CONTRACT.md` | ❌ PENDIENTE | Sin implementación. |
| **Enforcement parametrizado** | `MIGRATION_STRATEGY.md` §4.3 | ❌ PENDIENTE | `enforce.sh` hardcodeado a AITOS. |
| **Agent branding ARNÉS** | `MIGRATION_STRATEGY.md` §4.1 | ❌ PENDIENTE | Agentes se identifican "AITOS". |
| **Docs de producto en lugar** | `MIGRATION_STRATEGY.md` §4.2 | ❌ PENDIENTE | 23 docs de AITOS en `ael/artifacts/`. |

### 2.2 Resumen

| Estado | Cantidad | Componentes |
|---|---|---|
| ✅ IMPLEMENTADO | 15 | Core del framework: agentes, capacidades, ciclo de vida, invariantes, gobernanza básica |
| ⚠️ PARCIAL | 2 | F-ADR (sin directorio), modelo de 3 capas (con acoplamientos) |
| ❌ PENDIENTE | 6 | Product Context, Project Adapter, Runtime Profile, enforcement parametrizado, branding, docs |

---

## 3. Roadmap de despliegue

El despliegue se organiza en 5 etapas. Cada etapa produce un incremento verificable hacia el estado operativo.

### 3.1 Stage 1 — BOOTSTRAP

**Objetivo:** Eliminar el acoplamiento textual y estructural de AEL con AITOS. Preparar el terreno para la activación formal.

**Qué incluye:**
- Fase 1 de migración: desacoplamiento textual (8 archivos, ~20 líneas).
- Fase 2 de migración: migrar 23 documentos de AITOS fuera de `ael/artifacts/`.
- Archivar 6 artefactos de misión.
- Crear directorio `docs/arnes/adr/` (vacío).
- Crear `docs/arnes/CHANGELOG.md` con entrada inaugural v1.0.0.

**Esfuerzo:** 2-3 misiones BUILD (~1-2 horas).

**Dependencias:** Ninguna. Puede comenzar inmediatamente.

**Riesgo:** Bajo. Cambios textuales y movimientos de archivo.

**Criterio de finalización:**
- [ ] Agentes PLAN y BUILD se identifican como "ARNÉS", no como "AITOS".
- [ ] `grep -rn "AITOS" .opencode/agents/plan.md .opencode/agents/build.md` solo encuentra referencias contextuales.
- [ ] `ael/artifacts/` no contiene documentos de constitución cognitiva de AITOS.
- [ ] `ael/artifacts/` no contiene BACKLOG.md ni auditorías de AITOS.
- [ ] `docs/arnes/adr/` existe.
- [ ] `docs/arnes/CHANGELOG.md` existe con entrada v1.0.0.
- [ ] AITOS compila (`npm run build`).
- [ ] Tests de AITOS pasan (`npm test`).
- [ ] Enforcement pasa (`bash ael/contracts/enforce.sh`).

### 3.2 Stage 2 — CORE ACTIVATION

**Objetivo:** Activar el Product Context Contract y el Project Adapter. Hacer explícito lo que hoy es implícito.

**Qué incluye:**
- Implementar el Project Adapter (6 etapas: DISCOVER→LOAD→VALIDATE→BUILD→DELIVER→DISCARD).
- El adapter debe producir un Product Context con los 12 campos obligatorios.
- Para AITOS, el adapter leerá `AITOS_CONSTITUTION.md`, ADRs, `docs/knowledge/`, `package.json`, etc.
- Integrar el adapter en ORIENT del Mission Analyzer (agente PLAN).
- Verificar que el Mission Analyzer consume el Product Context en lugar de hardcodear referencias a AITOS.

**Esfuerzo:** 2-3 misiones BUILD (~2-4 horas).

**Dependencias:** Stage 1 completado. Los agentes deben estar limpios antes de integrar el adapter.

**Riesgo:** Medio. Cambia cómo el Mission Analyzer obtiene conocimiento del producto.

**Criterio de finalización:**
- [ ] Project Adapter implementado (mínimo: adapter genérico que lee docs/).
- [ ] Product Context generado con los 12 campos obligatorios.
- [ ] Mission Analyzer consume el Product Context durante ORIENT.
- [ ] El agente PLAN no contiene referencias hardcodeadas a paths de AITOS.
- [ ] Una misión de prueba (ej. "describí la arquitectura de AITOS") usa el Product Context.
- [ ] AITOS compila. Tests pasan. Enforcement pasa.

### 3.3 Stage 3 — ENFORCEMENT DECOUPLING

**Objetivo:** Parametrizar el sistema de enforcement para que no dependa de paths de AITOS.

**Qué incluye:**
- Fase 3 de migración: parametrización de enforcement.
- Crear `ael/contracts/product-rules.schema.json`.
- Crear `ael/contracts/product-rules.json` con reglas de AITOS.
- Reescribir `ael/constitution/CONTRACTS.md` como especificación abstracta.
- Reescribir `ael/contracts/enforce.sh` para leer de `product-rules.json`.
- Verificar equivalencia de output.

**Esfuerzo:** 2-3 misiones BUILD (~2-4 horas).

**Dependencias:** Stage 2 completado. Los paths en el enforcement deben reflejar la estructura post-Stage 1.

**Riesgo:** Alto. Cambiar el enforcement puede introducir falsos positivos/negativos.

**Criterio de finalización:**
- [ ] `ael/constitution/CONTRACTS.md` no contiene paths de AITOS.
- [ ] `ael/contracts/enforce.sh` no contiene paths de AITOS hardcodeados.
- [ ] `ael/contracts/product-rules.schema.json` existe y es válido.
- [ ] `ael/contracts/product-rules.json` contiene reglas actuales de AITOS.
- [ ] Output de `enforce.sh` idéntico al pre-migración.
- [ ] AITOS compila. Tests pasan.

### 3.4 Stage 4 — RUNTIME ACTIVATION

**Objetivo:** Activar el Runtime Profile para gobernar la ejecución de misiones.

**Qué incluye:**
- Implementar el Runtime Profile con las 11 categorías configurables.
- Implementar el ciclo de vida LOAD→VALIDATE→USE→DISCARD.
- Crear perfil por defecto balanceado.
- Crear perfiles por tipo de misión (exploración, implementación, auditoría).
- Integrar el perfil en BUILD (el Director consulta timeout, modelo, presupuesto).
- Implementar overrides por misión.

**Esfuerzo:** 2-3 misiones BUILD (~2-4 horas).

**Dependencias:** Stage 3 completado. El Runtime Profile necesita el enforcement limpio para configurar límites.

**Riesgo:** Medio. Nuevo componente. No rompe nada existente (es aditivo).

**Criterio de finalización:**
- [ ] Runtime Profile por defecto existe.
- [ ] Al menos 2 perfiles por tipo de misión existen.
- [ ] BUILD consulta el perfil para timeout y presupuesto.
- [ ] Override por misión funciona (el usuario puede ajustar timeout).
- [ ] El perfil se descarta al finalizar la misión.
- [ ] El perfil no contiene configuración de framework ni de producto.
- [ ] Una misión de prueba se ejecuta con perfil no-default.

### 3.5 Stage 5 — OPERATIONAL VALIDATION

**Objetivo:** Verificar que todos los componentes integrados funcionan como un sistema cohesivo.

**Qué incluye:**
- Ejecutar una misión completa PLAN→BUILD usando todos los componentes activados.
- Verificar trazabilidad: Decisión → ExecutionPlan → Ejecución → ExecutionReport.
- Verificar que el enforcement funciona con reglas parametrizadas.
- Verificar que el Product Context se carga y descarta correctamente.
- Verificar que el Runtime Profile gobierna la ejecución.
- Ejecutar una misión de auditoría para verificar invariantes F1-F6.

**Esfuerzo:** 1-2 misiones BUILD (~1-2 horas).

**Dependencias:** Stages 1-4 completados.

**Riesgo:** Bajo. Es verificación, no construcción.

**Criterio de finalización:**
- [ ] Misión completa ejecutada: PLAN produjo ExecutionPlan → BUILD ejecutó → ExecutionReport generado.
- [ ] Trazabilidad completa: Decisión → Plan → Ejecución → Reporte → Verificación.
- [ ] Product Context cargado en ORIENT, descartado en CLOSED.
- [ ] Runtime Profile activo durante BUILD.
- [ ] Enforcement ejecutado y PASS.
- [ ] AITOS compila. Tests pasan.
- [ ] Todos los invariantes F1-F6 verificados.

---

## 4. Dependencias entre etapas

### 4.1 Grafo de dependencias

```
Stage 1: BOOTSTRAP
    │
    │ Sin dependencias. Puede comenzar inmediatamente.
    │
    ▼
Stage 2: CORE ACTIVATION
    │
    │ Depende de Stage 1. Agentes limpios + docs en lugar.
    │
    ▼
Stage 3: ENFORCEMENT DECOUPLING
    │
    │ Depende de Stage 2. Paths reflejan nueva estructura.
    │
    ▼
Stage 4: RUNTIME ACTIVATION
    │
    │ Depende de Stage 3. Necesita enforcement parametrizado.
    │
    ▼
Stage 5: OPERATIONAL VALIDATION
    │
    │ Depende de Stages 1-4. Verifica integración.
```

### 4.2 Camino crítico

```
Stage 1 ──▶ Stage 2 ──▶ Stage 3 ──▶ Stage 4 ──▶ Stage 5
 2-3 m       2-3 m       2-3 m       2-3 m       1-2 m
```

**Duración total estimada:** 9-14 misiones BUILD (~6-16 horas de trabajo efectivo).

**Sin paralelismo posible.** Cada stage modifica componentes que el siguiente necesita en su estado final.

### 4.3 Qué desbloquea cada stage

| Stage | Desbloquea |
|---|---|
| **Stage 1** | Implementación del adapter (necesita agentes limpios). |
| **Stage 2** | Enforcement parametrizado (necesita paths actualizados). Runtime Profile (necesita Product Context). |
| **Stage 3** | Independencia total de AEL respecto a AITOS. |
| **Stage 4** | Gobernanza de ejecución (timeout, presupuesto, modelo). |
| **Stage 5** | Declaración "ARNÉS Framework operativo". |

### 4.4 Lo que puede hacerse en paralelo con el despliegue

El desarrollo de AITOS (features, bugs, refactors) puede continuar en paralelo con el despliegue de ARNÉS. No hay dependencia que fuerce detener el producto.

- **Stages 1-2:** AITOS puede seguir desarrollándose. Los cambios son cosméticos/estructurales.
- **Stage 3:** AITOS debe pausarse brevemente durante la verificación de equivalencia del enforcement.
- **Stages 4-5:** AITOS puede seguir desarrollándose. El Runtime Profile es aditivo.

---

## 5. Riesgos del despliegue

### 5.1 Matriz de riesgos

| Riesgo | Stage | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| **R1 — Enforcement produce falsos negativos** | 3 | Media | Alto | Comparar output pre/post. Tests de regresión con violaciones conocidas. |
| **R2 — Enforcement produce falsos positivos** | 3 | Media | Medio | Misma comparación. Ajustar `product-rules.json`. |
| **R3 — Product Context incompleto bloquea al Mission Analyzer** | 2 | Media | Alto | El adapter debe ser tolerante: contexto parcial → advertencia, no error. |
| **R4 — AITOS se rompe durante migración de docs** | 1 | Baja | Alto | `npm test && npm run build` después de cada movimiento. Git revert si falla. |
| **R5 — Agentes dejan de funcionar con nuevo branding** | 1 | Baja | Alto | Cambios solo cosméticos. Misión de prueba post-cambio. |
| **R6 — Runtime Profile entra en conflicto con decisiones del Director** | 4 | Media | Medio | Precedencia clara (§6 de RUNTIME_PROFILE_CONTRACT.md). Director puede desviarse con justificación. |
| **R7 — Stage intermedio deja AEL en estado inconsistente** | 1-4 | Baja | Crítico | Cada stage es atómico: commit si pasa, revert si falla. Git tags pre/post. |

### 5.2 Protocolo de reversión por stage

```
ANTES de cada stage:
  git tag pre-stage-N

DURANTE el stage:
  Ejecutar cambios → Verificar criterios → Si PASS: continuar → Si FAIL: git reset --hard pre-stage-N

DESPUÉS del stage:
  git commit -m "DEPLOY: Stage N completed"
  git tag post-stage-N
```

---

## 6. Checklist de aceptación

### 6.1 Criterios binarios

Cada criterio debe cumplirse para declarar el framework operativo. Todos son verificables con comandos o misiones de prueba.

#### Bloque 1 — Identidad y separación

- [ ] **AC-01:** Agentes PLAN y BUILD se identifican como parte de ARNÉS, no de AITOS.  
  `grep "AITOS" .opencode/agents/plan.md` solo encuentra referencias contextuales.

- [ ] **AC-02:** `ael/` no contiene documentos de constitución cognitiva de AITOS.  
  `ls ael/artifacts/0*-*.md` no lista archivos.

- [ ] **AC-03:** `ael/README.md` presenta AEL como implementación de ARNÉS.  
  Primera oración no contiene "TaxiGuazú" como único producto.

#### Bloque 2 — Contratos formales

- [ ] **AC-04:** Product Context Contract está activo.  
  El Mission Analyzer recibe un Product Context con los 12 campos obligatorios durante ORIENT.

- [ ] **AC-05:** Project Adapter funciona.  
  El ciclo DISCOVER→LOAD→VALIDATE→BUILD→DELIVER→DISCARD se ejecuta sin errores para AITOS.

- [ ] **AC-06:** Runtime Profile está activo.  
  BUILD consulta timeout, modelo y presupuesto del perfil activo.

#### Bloque 3 — Gobernanza operativa

- [ ] **AC-07:** Enforcement funciona con reglas parametrizadas.  
  `bash ael/contracts/enforce.sh` exit code 0. Output idéntico al pre-migración.

- [ ] **AC-08:** `ael/constitution/CONTRACTS.md` no contiene paths de AITOS.  
  `grep "src/lib/" ael/constitution/CONTRACTS.md` no produce resultados.

- [ ] **AC-09:** `ael/contracts/enforce.sh` no contiene paths de AITOS hardcodeados.  
  `grep "src/lib/" ael/contracts/enforce.sh` no produce resultados.

- [ ] **AC-10:** Directorio `docs/arnes/adr/` existe.  
  Listo para recibir F-ADR-001.

#### Bloque 4 — Trazabilidad

- [ ] **AC-11:** Una misión completa fue ejecutada bajo el framework.  
  PLAN produjo ExecutionPlan → BUILD ejecutó → ExecutionReport generado → SDL verificó.

- [ ] **AC-12:** Trazabilidad completa de la misión.  
  Decisión → ExecutionPlan → Ejecución → ExecutionReport → Verificación. Cadena ininterrumpida.

#### Bloque 5 — No regresión

- [ ] **AC-13:** AITOS compila.  
  `npm run build` exit code 0.

- [ ] **AC-14:** Tests de AITOS pasan.  
  `npm test` exit code 0.

- [ ] **AC-15:** Invariantes del framework (F1-F6) se cumplen.  
  Verificación explícita de cada invariante contra el estado del sistema.

### 6.2 Criterio de activación final

> **"Desde este momento, AITOS se desarrolla utilizando ARNÉS Framework v1.0.0."**

Esta declaración puede emitirse cuando **AC-01 a AC-15** están todos marcados.

---

## 7. Declaración de operatividad

### 7.1 Condición de activación

ARNÉS Framework v1.0.0 se considera **oficialmente operativo** cuando:

1. Los 15 criterios de aceptación (AC-01 a AC-15) están cumplidos.
2. Al menos una misión completa PLAN→BUILD fue ejecutada bajo el framework con trazabilidad total.
3. AITOS compila, sus tests pasan, y el enforcement funciona con reglas parametrizadas.
4. El framework no contiene referencias hardcodeadas a AITOS.

### 7.2 Lo que NO se requiere para declarar operativo

- ❌ Extracción a repositorio independiente (eso es v2.0).
- ❌ Project Adapter optimizado (el adapter genérico es suficiente).
- ❌ Runtime Profile con todos los perfiles (el perfil por defecto es suficiente).
- ❌ Framework ADRs emitidos (el directorio debe existir, pero puede estar vacío).
- ❌ Segundo producto construido (es validación de independencia, no de operatividad).
- ❌ Perfección del diseño (los 6 GAPs documentales pueden resolverse después).

### 7.3 Qué cambia al declarar operativo

| Antes | Después |
|---|---|
| AEL es "el sistema de desarrollo de AITOS" | AEL es "la implementación de referencia de ARNÉS" |
| Los agentes trabajan para AITOS | Los agentes trabajan para ARNÉS (construyendo AITOS) |
| El Product Context es implícito | El Product Context es un contrato formal |
| El enforcement es específico de AITOS | El enforcement es parametrizado por producto |
| Las misiones se ejecutan ad-hoc | Las misiones se ejecutan bajo gobernanza ARNÉS |
| La evolución del framework es informal | La evolución del framework requiere F-ADR |

### 7.4 Primera misión post-activación

Una vez declarado operativo, la primera misión bajo el framework debería ser:

> **Desarrollo de AITOS utilizando ARNÉS Framework v1.0.0.**

Esto cierra el ciclo: el framework fue diseñado para construir productos. Su primera misión oficial debe ser construir el producto para el que fue creado.

---

> *Este Deployment Blueprint es el plano de transición de ARNÉS Framework desde diseño aprobado hasta entorno operativo. Define 5 etapas, 15 criterios de aceptación, y el momento exacto en que puede declararse: "Desde este momento, AITOS se desarrolla utilizando ARNÉS Framework v1.0.0."*
>
> *Versión 1.0.0. La ejecución de este blueprint requiere misiones BUILD independientes gobernadas por el proceso PLAN→BUILD. Una vez completado el Stage 5 con todos los criterios cumplidos, ARNÉS Framework estará oficialmente operativo.*
