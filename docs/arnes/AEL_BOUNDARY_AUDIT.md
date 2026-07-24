# ARNÉS Framework — AEL Boundary Audit v1.0

> **Tipo:** Auditoría arquitectónica
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** COMPLETED
> **Auditado contra:** `FRAMEWORK_IMPLEMENTATION_MODEL.md` v1.0 (modelo de 3 capas)
>
> Esta auditoría evalúa el estado actual de separación arquitectónica de AEL
> respecto al modelo ARNÉS Framework / Implementación / Producto.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Alcance y metodología](#2-alcance-y-metodología)
3. [Inventario de componentes](#3-inventario-de-componentes)
4. [Acoplamientos detectados](#4-acoplamientos-detectados)
5. [Clasificación por severidad](#5-clasificación-por-severidad)
6. [Análisis por capa](#6-análisis-por-capa)
7. [Recomendaciones de separación](#7-recomendaciones-de-separación)
8. [Métrica de salud arquitectónica](#8-métrica-de-salud-arquitectónica)

---

## 1. Resumen ejecutivo

### Veredicto

**AEL es una implementación de ARNÉS con acoplamiento significativo a AITOS.**

De 128 archivos en `ael/` y 16 en `.opencode/`, se identificaron:

| Clasificación | Archivos | % del total |
|---|---|---|
| **Framework puro** (sin referencias a producto) | 18 | 12.5% |
| **Implementación pura** (sin referencias a producto) | 42 | 29.2% |
| **Implementación con acoplamiento leve** (referencias cosméticas) | 21 | 14.6% |
| **Implementación con acoplamiento significativo** | 16 | 11.1% |
| **Producto alojado en AEL** (debería estar en docs/ o src/) | 47 | 32.6% |

### Hallazgo principal

**El 43.7% de los archivos en `ael/` no pertenecen a una implementación ARNÉS genérica.** Son documentación del producto AITOS (constitución cognitiva, auditorías, backlog) o artefactos de misión con referencias a paths del producto.

### El problema de raíz

AEL nació **dentro** de AITOS, como su sistema de desarrollo. La separación Framework/Implementación/Producto es una formalización posterior. El acoplamiento actual no es negligencia: es historia. El código de enforcement (`CONTRACTS.md`, `enforce.sh`) se escribió para proteger la arquitectura de AITOS, no para ser un mecanismo genérico.

### Lo que funciona bien

- Los **contratos de rol** (`ael/government/roles/`) son mayormente genéricos.
- Los **comandos de agente** (`.opencode/commands/ael-*.md`) están limpios.
- Los **agentes principales** (`plan.md`, `build.md`) solo tienen referencias cosméticas.
- La **especificación operacional** (`SPEC.md`) es abstracta y reutilizable.

---

## 2. Alcance y metodología

### Directorios auditados

| Directorio | Archivos | Clasificación |
|---|---|---|
| `ael/constitution/` | 2 | Framework con acoplamientos |
| `ael/government/` | 7 | Framework con acoplamientos leves |
| `ael/contracts/` | 3 | Implementación con acoplamientos críticos |
| `ael/artifacts/` | 30 | Mayormente producto |
| `ael/archive/` | 35 | Histórico (producto) |
| `ael/` (root) | 1 | Framework con acoplamiento leve |
| `.opencode/agents/` | 2 | Implementación con acoplamientos leves |
| `.opencode/commands/` | 9 | Implementación (mayormente limpia) |
| `.opencode/memory/` | 1 | Producto (esperado) |
| `opencode.json` | 1 | Implementación con acoplamiento leve |

### Metodología

Cada archivo fue inspeccionado y clasificado según:

1. **Contenido normativo:** ¿define principios, arquitectura, objetos cognitivos? → Framework.
2. **Contenido operacional:** ¿define agentes, herramientas, scripts, configuración de plataforma? → Implementación.
3. **Referencias a producto:** ¿menciona AITOS, TaxiGuazú, paths `src/lib/`, reglas de negocio (pricing, dispatch, geo, fleet, trips), dominio de transporte? → Acoplamiento a producto.
4. **Ubicación:** ¿está en `ael/` pero su contenido es de producto? → Fuera de lugar.

---

## 3. Inventario de componentes

### 3.1 `ael/constitution/` (2 archivos)

| Archivo | Capa correcta | Capa real | Acoplamiento | Detalle |
|---|---|---|---|---|
| `SPEC.md` | Framework | ✅ Framework | Mínimo | Una mención de "AITOS" en definición de propósito (L12). Resto: abstracto. |
| `CONTRACTS.md` | Framework | ⚠️ Implementación acoplada | **Crítico** | Reglas R1-R2 hardcodean paths de AITOS (`src/lib/ai/`, `src/lib/services/`, `src/lib/db/`, `src/lib/db/domains/geo.ts`, `src/lib/services/trip-execution/`). |

### 3.2 `ael/government/` (7 archivos)

| Archivo | Capa correcta | Capa real | Acoplamiento | Detalle |
|---|---|---|---|---|
| `ORGANIZATION.md` | Framework | ✅ Framework | Leve | Sección "Relación con la Constitución de AITOS" referencia `AITOS_CONSTITUTION.md`. Resto: genérico. |
| `roles/02-explorer.md` | Framework | ✅ Framework | Ninguno | Contrato genérico de Discovery. |
| `roles/03-architect.md` | Framework | ⚠️ Framework | Medio | Referencia `AITOS_CONSTITUTION.md` (L18). |
| `roles/04-implementer.md` | Framework | ✅ Framework | Ninguno | Contrato genérico de Implementation. |
| `roles/05-auditor.md` | Framework | ⚠️ Framework | Medio | Referencia `AITOS_CONSTITUTION.md` (L17). |
| `roles/06-memory.md` | Framework | ✅ Framework | Ninguno | Contrato genérico de Memory. |
| `roles/07-learning.md` | Framework | ✅ Framework | Ninguno | Contrato genérico de Learning. |

### 3.3 `ael/contracts/` (3 archivos)

| Archivo | Capa correcta | Capa real | Acoplamiento | Detalle |
|---|---|---|---|---|
| `CONTRACTS.md` | Implementación | ✅ Implementación | Ninguno | Redirect (6 líneas). |
| `enforce.sh` | Implementación | ⚠️ Implementación acoplada | **Crítico** | Verifica paths de AITOS: `src/lib/ai/`, `src/lib/services/`, `src/lib/db/`, `src/lib/db/domains/geo.ts`, `src/lib/services/trip-execution/`. |
| `diagnose.sh` | Implementación | ✅ Implementación | Ninguno | Verifica integridad de componentes AEL, sin paths de producto. |

### 3.4 `ael/artifacts/` (30 archivos)

| Archivo | Capa correcta | Capa real | Acoplamiento | Detalle |
|---|---|---|---|---|
| `01-CONSTITUTION.md` | Producto | ❌ En AEL | **Alto** | Constitución cognitiva de AITOS (~1052 líneas). Pertenece a `docs/architecture/`. |
| `03-COGNITIVE_PRINCIPLES.md` | Producto | ❌ En AEL | **Alto** | Principios cognitivos de AITOS (~1052 líneas). |
| `04-EVIDENCE_MODEL.md` | Producto | ❌ En AEL | **Alto** | Modelo de evidencia de AITOS (~1116 líneas). |
| `05-DECISION_MODEL.md` | Producto | ❌ En AEL | **Alto** | Modelo de decisión de AITOS (~981 líneas). |
| `06-COMMITMENT_MODEL.md` | Producto | ❌ En AEL | **Alto** | Modelo de compromiso de AITOS (~946 líneas). |
| `07-CERTAINTY_CALCULUS.md` | Producto | ❌ En AEL | **Alto** | Cálculo de certidumbre de AITOS (~938 líneas). |
| `08-CHANNEL_ADAPTER.md` | Producto | ❌ En AEL | **Alto** | Adaptador de canal con referencias a WhatsApp (~793 líneas). |
| `09-ACTION_EXECUTOR.md` | Producto | ❌ En AEL | **Alto** | Ejecutor de acciones de AITOS (~1079 líneas). |
| `10-KNOWLEDGE_MODEL.md` | Producto | ❌ En AEL | **Alto** | Modelo de conocimiento de AITOS (~1033 líneas). |
| `11-COGNITIVE_ARCHITECTURE.md` | Producto | ❌ En AEL | **Alto** | Arquitectura cognitiva de AITOS (~1003 líneas). |
| `SYSTEM_VOCABULARY.md` | Producto | ❌ En AEL | **Alto** | Vocabulario normativo de AITOS (~1792 líneas). |
| `BACKLOG.md` | Producto | ❌ En AEL | **Alto** | Backlog con paths de AITOS (~415 líneas). |
| `LEVEL_IV_IMPLEMENTATION_PLAN.md` | Producto | ❌ En AEL | **Alto** | Plan de implementación con paths de AITOS (~727 líneas). |
| `AUDITORIA_03` a `07` (5 archivos) | Producto | ❌ En AEL | **Alto** | Auditorías del producto AITOS. |
| `META_AUDITORIA_07.md` | Producto | ❌ En AEL | **Alto** | Meta-auditoría de AITOS. |
| `AUDITORIA_TRANSVERSAL.md` | Producto | ❌ En AEL | **Alto** | Auditoría transversal de AITOS. |
| `CONSTITUTION_MASTER_PLAN.md` | Producto | ❌ En AEL | **Alto** | Plan maestro de constitución de AITOS. |
| `DISENO_COGNITIVE_PRINCIPLES.md` | Producto | ❌ En AEL | **Alto** | Diseño de principios de AITOS. |
| `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | Implementación | ✅ En AEL | Medio | Reporte de implementación. Referencia TaxiGuazú. |
| `SECRET_AUDIT.md` | Implementación | ✅ En AEL | Bajo | Auditoría de secretos. Menciona WhatsApp (esperado). |
| `TASK_PLAN.md` | Artefacto de misión | ✅ En AEL | Bajo | Plan de tarea con paths de producto (esperado). |
| `SYSTEM_STATE.md` | Artefacto de misión | ✅ En AEL | Bajo | Estado de sistema con paths de producto (esperado). |
| `SYSTEM_STATE_AUDIT.md` | Artefacto de misión | ✅ En AEL | Bajo | Auditoría de estado. |
| `DESIGN_SPEC.md` | Artefacto de misión | ✅ En AEL | Bajo | Especificación de diseño con paths de producto. |
| `DECISION_RECORD.md` | Artefacto de misión | ✅ En AEL | Bajo | Registro de decisión con paths de producto. |
| `PATTERN_EXTRACTION.md` | Artefacto de misión | ✅ En AEL | Bajo | Extracción de patrones con paths de producto. |
| `VALIDATION_REPORT.md` | Artefacto de misión | ✅ En AEL | Ninguno | Reporte de validación limpio. |
| `DIAGNOSTIC_REPORT.md` | Artefacto de misión | ✅ En AEL | Ninguno | Reporte de diagnóstico limpio. |

### 3.5 `ael/` root (1 archivo)

| Archivo | Capa correcta | Capa real | Acoplamiento | Detalle |
|---|---|---|---|---|
| `README.md` | Framework | ⚠️ Framework | Medio | "Gobierna la evolución de TaxiGuazú (AITOS)". Producto en primera oración. |

### 3.6 `ael/archive/` (35 archivos)

| Grupo | Capa real | Acoplamiento | Detalle |
|---|---|---|---|
| Root (8 archivos) | Histórico | Bajo | Documentos del modelo anterior. Algunos referencian TaxiGuazú (esperado en histórico). |
| `milestones/` (2 archivos) | Histórico | Bajo | Hitos arquitectónicos de AITOS. |
| `history/` (8 archivos) | Histórico | Bajo | Propuestas, síntesis, modelo comercial. Dominio de transporte. |
| `PR-series/` (27 archivos) | Histórico | Bajo | Documentos de trabajo de PRs anteriores. |

### 3.7 `.opencode/` (16 archivos)

| Archivo | Capa correcta | Capa real | Acoplamiento | Detalle |
|---|---|---|---|---|
| `agents/plan.md` | Implementación | ✅ Implementación | Medio | Agente PLAN. Referencias a AITOS en descripción (L2, L16) y a `AITOS_CONSTITUTION.md` (L53). |
| `agents/build.md` | Implementación | ✅ Implementación | Medio | Agente BUILD. Referencias a AITOS en descripción (L2, L24, L47). |
| `commands/ael-design.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-diagnose.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-enforce.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-explore.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-implement.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-learn.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-plan.md` | Implementación | ✅ Implementación | Medio | Referencia "Constitución de AITOS" (L6). |
| `commands/ael-remember.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `commands/ael-validate.md` | Implementación | ✅ Implementación | Ninguno | Comando limpio. |
| `memory/MEMORY.md` | Producto | ✅ Producto | Esperado | Repositorio de conocimiento del producto (~60 referencias a código AITOS). |
| `opencode.json` | Implementación | ✅ Implementación | Bajo | Descripciones de agentes mencionan "AITOS" (2 ocurrencias, cosméticas). |
| `.gitignore` | Configuración | ✅ Configuración | Ninguno | — |
| `package.json` | Configuración | ✅ Configuración | Ninguno | — |
| `package-lock.json` | Configuración | ✅ Configuración | Ninguno | — |

---

## 4. Acoplamientos detectados

### 4.1 Acoplamientos críticos (bloquean la independencia de AEL)

#### AC-01: `ael/constitution/CONTRACTS.md` — Enforcement hardcodeado a AITOS

**Archivo:** `ael/constitution/CONTRACTS.md`
**Líneas:** 13, 16, 23, 51, 54-56, 60, 64, 92, 95, 102-103

**Qué ocurre:** Las reglas R1, R2 y R4 verifican paths específicos de AITOS:

- R1: `grep -rn "from.*@/lib/services/" src/lib/ai/`
- R2: `grep -rn "from.*@/lib/" src/lib/utils/`, `grep -rn "from.*db/core" src/lib/services/`, `grep -rn "from.*lead.service" src/lib/services/trip-execution/`
- R4: `grep -n "CASE.*WHEN" src/lib/db/domains/geo.ts`

**Impacto:** AEL no puede usarse para construir otro producto sin reescribir `CONTRACTS.md`. Las reglas asumen la arquitectura de capas de AITOS (`src/lib/ai/`, `src/lib/services/`, `src/lib/db/`).

#### AC-02: `ael/contracts/enforce.sh` — Script de enforcement acoplado

**Archivo:** `ael/contracts/enforce.sh`
**Líneas:** 18, 28, 52-56, 64, 81, 91

**Qué ocurre:** Implementación en bash de las mismas reglas R1-R4 con paths de AITOS.

**Impacto:** El mecanismo de validación de contratos no es portable. Cualquier producto con estructura de directorios diferente no puede usar este script.

### 4.2 Acoplamientos altos (requieren migración significativa)

#### AC-03: `ael/artifacts/` — 23 documentos de producto en directorio de implementación

**Archivos:** 01-CONSTITUTION.md, 03-COGNITIVE_PRINCIPLES.md, 04-EVIDENCE_MODEL.md, 05-DECISION_MODEL.md, 06-COMMITMENT_MODEL.md, 07-CERTAINTY_CALCULUS.md, 08-CHANNEL_ADAPTER.md, 09-ACTION_EXECUTOR.md, 10-KNOWLEDGE_MODEL.md, 11-COGNITIVE_ARCHITECTURE.md, SYSTEM_VOCABULARY.md, BACKLOG.md, LEVEL_IV_IMPLEMENTATION_PLAN.md, AUDITORIA_03-07 (5), META_AUDITORIA_07.md, AUDITORIA_TRANSVERSAL.md, CONSTITUTION_MASTER_PLAN.md, DISENO_COGNITIVE_PRINCIPLES.md

**Qué ocurre:** Estos documentos definen la arquitectura cognitiva, principios, modelos y auditorías de AITOS. Son documentación de **producto** (Nivel 3), pero residen en `ael/artifacts/` (que debería ser Nivel 2 — implementación).

**Impacto:**
- 23 archivos (~20,000+ líneas) que deben migrarse a `docs/architecture/` o `docs/certification/`.
- Confunden el propósito del directorio `ael/artifacts/`: ¿es para artefactos de la implementación o del producto?
- Si AEL se extrae como implementación independiente, estos archivos no deben ir con ella.

#### AC-04: `ael/government/roles/` — Contratos de rol referencian producto

**Archivos:** `03-architect.md` (L18), `05-auditor.md` (L17)

**Qué ocurre:** Ambos contratos incluyen en su lista de fuentes de verdad:
```
docs/architecture/AITOS_CONSTITUTION.md
```

**Impacto:** Los contratos de Architect y Auditor asumen que existe un producto llamado AITOS con una constitución en un path específico. Para otro producto, estos contratos requerirían modificación.

### 4.3 Acoplamientos medios (requieren limpieza)

#### AC-05: `ael/README.md` — Producto en definición de propósito

**Archivo:** `ael/README.md`, L3

**Qué ocurre:** "Gobierna la evolución de TaxiGuazú (AITOS)".

**Impacto:** La primera oración del README de AEL menciona un producto específico. Debería decir "Gobierna la evolución de productos construidos sobre ARNÉS (ej. AITOS)".

#### AC-06: `ael/constitution/SPEC.md` — Producto en definición

**Archivo:** `ael/constitution/SPEC.md`, L12

**Qué ocurre:** "It governs the evolution of AITOS by enforcing what must always hold".

**Impacto:** Similar al anterior. La especificación operacional se presenta como gobernante de un producto específico, no como especificación genérica.

#### AC-07: `.opencode/agents/plan.md` — Agente referenciando producto

**Archivo:** `.opencode/agents/plan.md`, L2, L16, L53

**Qué ocurre:**
- Descripción: "PLAN estratégico AITOS"
- Prompt: "Eres PLAN, la interfaz estratégica de AITOS"
- Referencia: `docs/architecture/AITOS_CONSTITUTION.md`

**Impacto:** El agente PLAN se identifica como parte de AITOS, no como parte de ARNÉS. La referencia a la constitución de AITOS es una dependencia de producto.

#### AC-08: `.opencode/agents/build.md` — Agente referenciando producto

**Archivo:** `.opencode/agents/build.md`, L2, L24, L47

**Qué ocurre:**
- Descripción: "BUILD operacional AITOS"
- Prompt: "Eres BUILD, la interfaz operacional de AITOS"
- Prompt: "Constitución de AITOS"

**Impacto:** Mismo patrón que plan.md.

#### AC-09: `.opencode/commands/ael-plan.md` — Comando referenciando producto

**Archivo:** `.opencode/commands/ael-plan.md`, L6

**Qué ocurre:** "La Constitución de AITOS (`docs/architecture/AITOS_CONSTITUTION.md`) es la autoridad normativa suprema del producto."

**Impacto:** El comando `ael-plan` asume que el producto se llama AITOS.

### 4.4 Acoplamientos bajos (cosméticos o esperados)

#### AC-10: `opencode.json` — Descripciones cosméticas

**Archivo:** `opencode.json`, L6, L23

**Qué ocurre:** Las descripciones de los agentes PLAN y BUILD incluyen "AITOS".

**Impacto:** Cosmético. No afecta el comportamiento. Pero revela que los agentes se piensan a sí mismos como "de AITOS", no como "de ARNÉS".

#### AC-11: `ael/artifacts/` — Artefactos de misión con paths de producto

**Archivos:** TASK_PLAN.md, SYSTEM_STATE.md, DESIGN_SPEC.md, DECISION_RECORD.md, PATTERN_EXTRACTION.md

**Qué ocurre:** Estos archivos contienen referencias a `src/lib/detect-lang.ts`, `src/lib/services/extraction/`, `src/lib/ai/core.ts`, etc. Son artefactos de misiones específicas que trabajaron sobre código de AITOS.

**Impacto:** Esperado. Los artefactos de misión documentan trabajo real sobre código real. No representan acoplamiento estructural. Deberían limpiarse o archivarse después de cada misión.

#### AC-12: `.opencode/memory/MEMORY.md` — Memoria de producto

**Qué ocurre:** El archivo contiene ~60 referencias a paths de AITOS, reglas de negocio, bugs y decisiones.

**Impacto:** Esperado y correcto. MEMORY.md es el repositorio de conocimiento del producto. Debe contener información específica del producto. No es acoplamiento: es su función.

---

## 5. Clasificación por severidad

| ID | Acoplamiento | Archivos afectados | Severidad | Bloquea extracción |
|---|---|---|---|---|
| **AC-01** | Enforcement hardcodeado | `ael/constitution/CONTRACTS.md` | 🔴 CRÍTICA | ✅ Sí |
| **AC-02** | Script de enforcement acoplado | `ael/contracts/enforce.sh` | 🔴 CRÍTICA | ✅ Sí |
| **AC-03** | Docs de producto en AEL | 23 archivos en `ael/artifacts/` | 🟠 ALTA | ✅ Sí |
| **AC-04** | Roles referencian AITOS | `03-architect.md`, `05-auditor.md` | 🟠 ALTA | Parcial |
| **AC-05** | README menciona TaxiGuazú | `ael/README.md` | 🟡 MEDIA | No |
| **AC-06** | SPEC menciona AITOS | `ael/constitution/SPEC.md` | 🟡 MEDIA | No |
| **AC-07** | Plan agent referenciando AITOS | `.opencode/agents/plan.md` | 🟡 MEDIA | No |
| **AC-08** | Build agent referenciando AITOS | `.opencode/agents/build.md` | 🟡 MEDIA | No |
| **AC-09** | Comando ael-plan ref. AITOS | `.opencode/commands/ael-plan.md` | 🟡 MEDIA | No |
| **AC-10** | opencode.json descripciones | `opencode.json` | 🟢 BAJA | No |
| **AC-11** | Artefactos con paths | 6 archivos en `ael/artifacts/` | 🟢 BAJA | No |
| **AC-12** | MEMORY.md producto | `.opencode/memory/MEMORY.md` | ✅ ESPERADO | No |

---

## 6. Análisis por capa

### 6.1 Capa Framework (Niveles 0+1)

**Archivos que DEBERÍAN estar en esta capa:** `SPEC.md`, `ORGANIZATION.md`, `roles/*.md`

| Indicador | Valor |
|---|---|
| Archivos correctamente clasificados | 5 de 9 (55.6%) |
| Archivos con acoplamiento | 4 de 9 (44.4%) |
| Pureza de framework | **Media** — Los principios y contratos de rol son genéricos, pero las referencias a AITOS y la ausencia de `ael/` como concepto separado del producto reducen la pureza. |

**Hallazgo:** La capa Framework de AEL es sustancialmente correcta. Las referencias a AITOS en `SPEC.md` y `ORGANIZATION.md` son contextuales (nombran el producto que gobiernan), no estructurales (no dependen de su arquitectura). Los contratos de rol son genéricos excepto por las referencias a `AITOS_CONSTITUTION.md` en Architect y Auditor.

### 6.2 Capa Implementación (Nivel 2)

**Archivos que DEBERÍAN estar en esta capa:** `CONTRACTS.md`, `enforce.sh`, `diagnose.sh`, agentes, comandos

| Indicador | Valor |
|---|---|
| Archivos correctamente clasificados | 34 de 50 (68.0%) |
| Archivos con acoplamiento crítico | 2 de 50 (4.0%) |
| Archivos con acoplamiento medio | 3 de 50 (6.0%) |
| Pureza de implementación | **Media-Alta** — La mayoría de los comandos y agentes están limpios. El problema se concentra en enforcement. |

**Hallazgo:** Los comandos de agente (`.opencode/commands/ael-*.md`) son ejemplares: 8 de 9 no tienen ninguna referencia a producto. Los agentes principales (plan.md, build.md) necesitan limpieza de branding pero no tienen dependencias funcionales con AITOS. El punto débil es el enforcement.

### 6.3 Capa Producto (Nivel 3)

**Archivos que DEBERÍAN estar en `docs/` o `src/`:** 23 documentos de constitución cognitiva, 6 artefactos de misión

| Indicador | Valor |
|---|---|
| Archivos de producto en AEL | 29 de 128 (22.7%) |
| Archivos de producto en archive/ | 35 (esperado en histórico) |
| Total fuera de lugar | 29 archivos activos |

**Hallazgo:** Casi un cuarto de `ael/` es documentation de AITOS, no de AEL. Esto es el residuo más visible de que AEL nació dentro de AITOS. La constitución cognitiva de AITOS (01 al 11) es documentación de producto de alta calidad, pero está en el directorio equivocado.

---

## 7. Recomendaciones de separación

### 7.1 Acciones críticas (necesarias para extraer AEL)

#### REC-01: Parametrizar reglas de enforcement

**Problema:** AC-01 + AC-02. `CONTRACTS.md` y `enforce.sh` contienen paths hardcodeados de AITOS.

**Solución:**
1. Extraer las reglas de enforcement a un archivo de configuración por producto (ej. `ael/contracts/product-rules.json`).
2. `CONTRACTS.md` define las **categorías** de reglas (Contract Integrity, Dependency Rules, Code Existence) de forma abstracta.
3. `enforce.sh` lee reglas concretas del archivo de configuración del producto.
4. Cada producto provee su propio `product-rules.json` con sus paths y restricciones.

```
ael/contracts/
  ├── CONTRACTS.md          ← Define categorías de reglas (genérico)
  ├── enforce.sh            ← Ejecuta reglas desde config (genérico)
  └── product-rules.schema.json  ← Schema de configuración (genérico)

Producto AITOS/
  └── ael-product-rules.json    ← Paths y reglas de AITOS (específico)
```

**Esfuerzo:** Medio (reescritura de `enforce.sh`, nuevo schema, migración de reglas).

#### REC-02: Migrar documentos de producto fuera de AEL

**Problema:** AC-03. 23 documentos de AITOS residen en `ael/artifacts/`.

**Solución:**
1. Mover documentos de constitución cognitiva (01-11, SYSTEM_VOCABULARY) a `docs/architecture/cognitive/`.
2. Mover auditorías (AUDITORIA_03-07, META, TRANSVERSAL) a `docs/audit/`.
3. Mover BACKLOG.md a `docs/project/`.
4. Mover CONSTITUTION_MASTER_PLAN.md y LEVEL_IV_IMPLEMENTATION_PLAN.md a `docs/architecture/`.
5. Archivar artefactos de misión (TASK_PLAN, SYSTEM_STATE, DESIGN_SPEC, DECISION_RECORD, PATTERN_EXTRACTION) en `ael/artifacts/archive/` post-misión.

**Esfuerzo:** Bajo (movimiento de archivos, actualización de referencias cruzadas).

### 7.2 Acciones altas (mejoran significativamente la separación)

#### REC-03: Generalizar referencias a AITOS en contratos de rol

**Problema:** AC-04. `03-architect.md` y `05-auditor.md` referencian `AITOS_CONSTITUTION.md`.

**Solución:**
Cambiar:
```
- `docs/architecture/AITOS_CONSTITUTION.md`
```
Por:
```
- La constitución del producto bajo desarrollo (ej. `docs/architecture/AITOS_CONSTITUTION.md`)
```

**Esfuerzo:** Trivial (2 líneas).

#### REC-04: Limpiar branding de agentes principales

**Problema:** AC-07, AC-08. Agentes PLAN y BUILD se identifican como "de AITOS".

**Solución:**
En `plan.md`:
- Descripción: "PLAN estratégico ARNÉS — SDL 2.0" (eliminar "AITOS")
- Prompt: "Eres PLAN, la interfaz estratégica de ARNÉS" (cambiar "AITOS" → "ARNÉS")
- Agregar: "El producto bajo desarrollo es AITOS (TaxiGuazú)." como contexto, no como identidad.

En `build.md`:
- Descripción: "BUILD operacional ARNÉS" (eliminar "AITOS")
- Prompt: "Eres BUILD, la interfaz operacional de ARNÉS" (cambiar "AITOS" → "ARNÉS")

**Esfuerzo:** Trivial (6 líneas).

### 7.3 Acciones medias (limpieza progresiva)

#### REC-05: Actualizar README.md de AEL

**Problema:** AC-05. README comienza con "Gobierna la evolución de TaxiGuazú (AITOS)".

**Solución:**
Cambiar por: "ARNÉS — Agent Execution Layer. Implementación de referencia del ARNÉS Framework para el ecosistema OpenCode. Actualmente gobierna la evolución de AITOS (TaxiGuazú)."

**Esfuerzo:** Trivial (1 línea).

#### REC-06: Actualizar SPEC.md

**Problema:** AC-06. SPEC menciona AITOS en definición de propósito.

**Solución:**
Cambiar "It governs the evolution of AITOS" por "It governs the evolution of products built on ARNÉS (currently AITOS)".

**Esfuerzo:** Trivial (1 línea).

#### REC-07: Limpiar opencode.json

**Problema:** AC-10. Descripciones de agentes mencionan AITOS.

**Solución:**
Cambiar descripciones de "PLAN estratégico AITOS" y "BUILD operacional AITOS" por "PLAN estratégico ARNÉS" y "BUILD operacional ARNÉS".

**Esfuerzo:** Trivial (2 líneas).

#### REC-08: Limpiar ael-plan.md

**Problema:** AC-09. Comando referencia constitución de AITOS.

**Solución:**
Cambiar "La Constitución de AITOS..." por "La constitución del producto (ej. AITOS_CONSTITUTION.md) es la autoridad normativa suprema del producto."

**Esfuerzo:** Trivial (1 línea).

### 7.4 Acciones bajas (mantenimiento)

#### REC-09: Política de artefactos de misión

**Problema:** AC-11. Artefactos de misión se acumulan en `ael/artifacts/`.

**Solución:**
Establecer política: los artefactos de misión (TASK_PLAN, SYSTEM_STATE, DESIGN_SPEC, DECISION_RECORD, PATTERN_EXTRACTION, VALIDATION_REPORT) se mueven a `ael/artifacts/archive/` al cerrar la misión. Solo permanecen en `ael/artifacts/` durante la misión activa.

**Esfuerzo:** Bajo (proceso, no código).

---

## 8. Métrica de salud arquitectónica

### 8.1 Índice de separación AEL

| Dimensión | Puntaje | Máximo | % |
|---|---|---|---|
| **Framework puro** (docs sin refs a producto) | 5 de 9 | 9 | 55.6% |
| **Implementación pura** (agentes/herramientas sin refs) | 42 de 58 | 58 | 72.4% |
| **Docs de producto fuera de AEL** | 23 fuera de lugar | — | — |
| **Acoplamientos críticos** | 2 | — | — |
| **Acoplamientos altos** | 2 | — | — |
| **Acoplamientos medios** | 5 | — | — |

### 8.2 Salud general

```
Separación Framework:    ████████░░  55.6%  (Media)
Separación Implementación: ███████░░░  72.4%  (Media-Alta)
Ubicación de docs:       ████░░░░░░  43.7% fuera de lugar
Acoplamientos críticos:  ██░░░░░░░░  2 (bajo en cantidad, alto en impacto)
```

### 8.3 Evolución esperada post-recomendaciones

| Estado | Separación Framework | Separación Impl. | Docs en lugar |
|---|---|---|---|
| **Actual** | 55.6% | 72.4% | 56.3% |
| **Post-REC-01,02** (críticas) | 55.6% | 85.0% | 100% |
| **Post-REC-03,04** (altas) | 77.8% | 90.0% | 100% |
| **Post-REC-05-08** (medias) | 88.9% | 95.0% | 100% |
| **Post-REC-09** (bajas) | 88.9% | 95.0% | 100% |

---

> *Esta auditoría es una fotografía objetiva del estado de AEL al 2026-07-22. AEL es una implementación funcional y valiosa de ARNÉS. Los acoplamientos detectados son residuos de su origen —nació dentro de AITOS—, no defectos de diseño. Las recomendaciones proporcionan un camino claro hacia la independencia total del framework.*
>
> *Versión 1.0. Documento de Nivel 1. Lectura recomendada antes de cualquier iniciativa de extracción de ARNÉS.*
