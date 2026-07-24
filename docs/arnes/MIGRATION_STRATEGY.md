# ARNÉS Framework — Migration Strategy v1.0

> **Tipo:** Estrategia de migración
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** APPROVED — pendiente de ejecución
> **Basado en:** `AEL_BOUNDARY_AUDIT.md` v1.0
> **Gobernado por:** `GOVERNANCE.md` v1.0, `VERSIONING.md` v1.0, `FRAMEWORK_IMPLEMENTATION_MODEL.md` v1.0
>
> Esta estrategia convierte los hallazgos de la auditoría de fronteras de AEL
> en un plan de migración gobernado. No ejecuta nada. Solo diseña el proceso.

---

## Índice

1. [Objetivo](#1-objetivo)
2. [Principios](#2-principios)
3. [Inventario de deudas](#3-inventario-de-deudas)
4. [Orden de ejecución](#4-orden-de-ejecución)
5. [Riesgos](#5-riesgos)
6. [Criterios de aceptación](#6-criterios-de-aceptación)
7. [Deuda aceptada](#7-deuda-aceptada)
8. [Roadmap](#8-roadmap)

---

## 1. Objetivo

### 1.1 Propósito

Transformar AEL desde su estado actual —una implementación de ARNÉS funcional pero acoplada al producto AITOS— hacia una **implementación independiente y reutilizable** del ARNÉS Framework, alineada con el modelo de tres capas definido en `FRAMEWORK_IMPLEMENTATION_MODEL.md`.

### 1.2 Estado deseado

Al finalizar la migración, AEL deberá:

1. **Ser independiente de AITOS.** Ningún archivo en `ael/` o `.opencode/agents/` o `.opencode/commands/` contendrá referencias a paths, reglas de negocio, o nombres de AITOS que no sean parametrizables.
2. **Ser portable.** AEL podrá usarse para construir un segundo producto de dominio completamente distinto sin modificar una sola línea de la implementación.
3. **Contener solo artefactos de implementación.** Toda documentación de producto habrá migrado a `docs/`.
4. **Tener enforcement parametrizado.** Las reglas de validación de contratos serán configurables por producto.
5. **Preservar compatibilidad con AITOS.** AITOS seguirá funcionando exactamente igual durante y después de la migración.

### 1.3 Alcance

| Incluido | Excluido |
|---|---|
| `ael/constitution/` | `ael/archive/` (histórico, no se modifica) |
| `ael/government/` | `docs/arnes/` (framework, no se modifica) |
| `ael/contracts/` | `src/` (producto, no se modifica) |
| `ael/artifacts/` (activos) | `docs/architecture/` (producto, no se modifica) |
| `ael/README.md` | `.opencode/memory/MEMORY.md` (producto, no se modifica) |
| `.opencode/agents/` | Tests, build, configuración de AITOS |
| `.opencode/commands/` | |
| `opencode.json` | |

---

## 2. Principios

Toda decisión de migración debe respetar los siguientes principios. Si una acción de migración viola alguno, debe reformularse.

### 2.1 Principios del ARNÉS Framework (P1-P6)

| Principio | Implicación para la migración |
|---|---|
| **P1 — Soberanía del Director** | La migración no prescribe cómo ejecutar cada tarea. El Director conserva libertad táctica. |
| **P2 — Separación cognitiva** | La migración se planifica aquí (PLAN). Se ejecutará en misiones futuras (BUILD). No se mezclan. |
| **P3 — Evidencia sobre supuestos** | Cada fase se verifica contra el estado real del sistema, no contra suposiciones. |
| **P4 — Economía cognitiva** | No se migra lo que no necesita migrarse. No se documenta lo que ya está documentado. |
| **P5 — Preservación del conocimiento** | Las decisiones de migración se registran como F-ADR. El conocimiento no se pierde. |
| **P6 — Trazabilidad universal** | Cada cambio de migración es trazable a un acoplamiento detectado en la auditoría. |

### 2.2 Principios específicos de migración

| Principio | Regla |
|---|---|
| **No regresión** | AITOS debe seguir funcionando en cada paso intermedio. Ninguna fase puede romper el producto. |
| **Reversibilidad** | Cada fase debe ser reversible. Si una fase falla, se revierte y el sistema vuelve al estado anterior. |
| **Incrementalidad** | Las fases son atómicas y acumulativas. Cada fase completada acerca a AEL al estado deseado sin depender de fases futuras. |
| **Minimalidad** | Solo se modifica lo estrictamente necesario. Si un archivo no tiene acoplamiento, no se toca. |

---

## 3. Inventario de deudas

Cada acoplamiento detectado en `AEL_BOUNDARY_AUDIT.md` se clasifica según la acción requerida para resolverlo.

### 3.1 Clasificación

| ID | Acoplamiento | Severidad | Acción | Justificación |
|---|---|---|---|---|
| **AC-01** | CONTRACTS.md hardcodeado | 🔴 CRÍTICA | **Parametrizar** | Las reglas R1-R4 son conceptualmente correctas pero deben ser configurables por producto. No se eliminan: se generalizan. |
| **AC-02** | enforce.sh acoplado | 🔴 CRÍTICA | **Parametrizar** | El script es valioso. Debe leer reglas de un archivo de configuración en lugar de tenerlas hardcodeadas. |
| **AC-03** | Docs de producto en AEL | 🟠 ALTA | **Mover** | 23 documentos de AITOS residen en `ael/artifacts/`. Deben migrarse a `docs/`. |
| **AC-04** | Roles referencian AITOS | 🟠 ALTA | **Parametrizar** | Las referencias a `AITOS_CONSTITUTION.md` deben convertirse en referencias genéricas. |
| **AC-05** | README menciona TaxiGuazú | 🟡 MEDIA | **Parametrizar** | Cambiar redacción para que AEL se presente como implementación genérica. |
| **AC-06** | SPEC menciona AITOS | 🟡 MEDIA | **Parametrizar** | Cambiar "governs AITOS" por "governs products built on ARNÉS". |
| **AC-07** | plan.md ref. AITOS | 🟡 MEDIA | **Parametrizar** | Cambiar identidad del agente de "AITOS" a "ARNÉS". |
| **AC-08** | build.md ref. AITOS | 🟡 MEDIA | **Parametrizar** | Cambiar identidad del agente de "AITOS" a "ARNÉS". |
| **AC-09** | ael-plan.md ref. AITOS | 🟡 MEDIA | **Parametrizar** | Generalizar referencia a constitución de producto. |
| **AC-10** | opencode.json descripciones | 🟢 BAJA | **Parametrizar** | Cambiar "AITOS" → "ARNÉS" en descripciones. |
| **AC-11** | Artefactos con paths | 🟢 BAJA | **Mantener + política** | Son temporales. Se acepta el acoplamiento pero se establece política de archivado. |
| **AC-12** | MEMORY.md producto | ✅ ESPERADO | **Mantener** | Es el repositorio de conocimiento del producto. Debe contener información de producto. |

### 3.2 Resumen por tipo de acción

| Acción | Cantidad | Acoplamientos |
|---|---|---|
| **Parametrizar** | 8 | AC-01, AC-02, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 |
| **Mover** | 1 | AC-03 |
| **Mantener + política** | 1 | AC-11 |
| **Mantener** | 1 | AC-12 |

### 3.3 Lo que NO se toca

| Elemento | Razón |
|---|---|
| `ael/archive/` (35 archivos) | Histórico. No afecta la arquitectura actual. Modificarlo no aporta valor. |
| `.opencode/memory/MEMORY.md` | AC-12. Función correcta: preservar conocimiento del producto. |
| `ael/contracts/diagnose.sh` | Sin acoplamientos. No requiere cambios. |
| `ael/contracts/CONTRACTS.md` (redirect) | Sin acoplamientos. No requiere cambios. |
| `.opencode/package.json`, `package-lock.json`, `.gitignore` | Sin acoplamientos. Configuración de plataforma. |
| `.opencode/commands/ael-*.md` (8 de 9) | Sin acoplamientos. Solo `ael-plan.md` requiere cambio. |
| `docs/arnes/` (8 archivos) | Documentación del framework. No es parte de AEL. |
| `src/`, `docs/architecture/`, `docs/adr/` | Producto AITOS. Fuera del alcance de esta migración. |

---

## 4. Orden de ejecución

La migración se organiza en tres fases. El orden no es arbitrario: cada fase reduce el riesgo de las siguientes y ninguna fase requiere modificar lo que una fase anterior ya resolvió.

### 4.1 Fase 1 — Desacoplamiento textual (branding y referencias)

**Objetivo:** Eliminar todas las referencias textuales a AITOS en archivos de AEL que no dependen de paths de producto. Cambios puramente cosméticos y de redacción. No se modifica comportamiento.

**Dependencias:** Ninguna. Puede ejecutarse inmediatamente.

**Archivos afectados:** 8 archivos, ~20 líneas.

| Archivo | Cambio | Acoplamiento |
|---|---|---|
| `ael/README.md` | "TaxiGuazú (AITOS)" → "productos construidos sobre ARNÉS (actualmente AITOS)" | AC-05 |
| `ael/constitution/SPEC.md` | "governs AITOS" → "governs products built on ARNÉS" | AC-06 |
| `ael/government/roles/03-architect.md` | `AITOS_CONSTITUTION.md` → "la constitución del producto" | AC-04 |
| `ael/government/roles/05-auditor.md` | `AITOS_CONSTITUTION.md` → "la constitución del producto" | AC-04 |
| `.opencode/agents/plan.md` | 3 ocurrencias de "AITOS" → "ARNÉS" o redacción genérica | AC-07 |
| `.opencode/agents/build.md` | 3 ocurrencias de "AITOS" → "ARNÉS" o redacción genérica | AC-08 |
| `.opencode/commands/ael-plan.md` | "Constitución de AITOS" → "Constitución del producto" | AC-09 |
| `opencode.json` | "AITOS" en descripciones → "ARNÉS" | AC-10 |

**Riesgo:** Mínimo. Cambios de texto que no afectan comportamiento.

**Criterio de finalización:**
- `grep -rn "AITOS" ael/constitution/SPEC.md ael/README.md ael/government/roles/03-architect.md ael/government/roles/05-auditor.md` no encuentra ocurrencias no justificadas.
- `grep -rn "AITOS" .opencode/agents/plan.md .opencode/agents/build.md` solo encuentra menciones en contexto de "producto actual".
- `grep "AITOS" opencode.json` no encuentra ocurrencias en descripciones de agentes.
- Agentes PLAN y BUILD operan normalmente.
- `ael/contracts/enforce.sh` pasa.

### 4.2 Fase 2 — Reorganización estructural (documentos de producto)

**Objetivo:** Migrar los 23 documentos de AITOS que residen en `ael/artifacts/` a sus ubicaciones correctas en `docs/`. Establecer política de archivado para artefactos de misión.

**Dependencias:** Fase 1 completada. La Fase 1 garantiza que los documentos de AEL no contengan referencias que se rompan al mover archivos.

**Archivos afectados:** 23 documentos migrados, 6 artefactos archivados.

#### Paso 2.1 — Migrar constitución cognitiva de AITOS

| Origen (`ael/artifacts/`) | Destino |
|---|---|
| `01-CONSTITUTION.md` | `docs/architecture/cognitive/01-CONSTITUTION.md` |
| `03-COGNITIVE_PRINCIPLES.md` | `docs/architecture/cognitive/03-COGNITIVE_PRINCIPLES.md` |
| `04-EVIDENCE_MODEL.md` | `docs/architecture/cognitive/04-EVIDENCE_MODEL.md` |
| `05-DECISION_MODEL.md` | `docs/architecture/cognitive/05-DECISION_MODEL.md` |
| `06-COMMITMENT_MODEL.md` | `docs/architecture/cognitive/06-COMMITMENT_MODEL.md` |
| `07-CERTAINTY_CALCULUS.md` | `docs/architecture/cognitive/07-CERTAINTY_CALCULUS.md` |
| `08-CHANNEL_ADAPTER.md` | `docs/architecture/cognitive/08-CHANNEL_ADAPTER.md` |
| `09-ACTION_EXECUTOR.md` | `docs/architecture/cognitive/09-ACTION_EXECUTOR.md` |
| `10-KNOWLEDGE_MODEL.md` | `docs/architecture/cognitive/10-KNOWLEDGE_MODEL.md` |
| `11-COGNITIVE_ARCHITECTURE.md` | `docs/architecture/cognitive/11-COGNITIVE_ARCHITECTURE.md` |
| `SYSTEM_VOCABULARY.md` | `docs/architecture/cognitive/SYSTEM_VOCABULARY.md` |

#### Paso 2.2 — Migrar documentos de planificación y gobierno

| Origen (`ael/artifacts/`) | Destino |
|---|---|
| `CONSTITUTION_MASTER_PLAN.md` | `docs/architecture/CONSTITUTION_MASTER_PLAN.md` |
| `LEVEL_IV_IMPLEMENTATION_PLAN.md` | `docs/architecture/LEVEL_IV_IMPLEMENTATION_PLAN.md` |
| `DISENO_COGNITIVE_PRINCIPLES.md` | `docs/architecture/DISENO_COGNITIVE_PRINCIPLES.md` |
| `BACKLOG.md` | `docs/project/BACKLOG.md` |

#### Paso 2.3 — Migrar auditorías

| Origen (`ael/artifacts/`) | Destino |
|---|---|
| `AUDITORIA_03_GOBERNANZA.md` | `docs/audit/AUDITORIA_03_GOBERNANZA.md` |
| `AUDITORIA_04_PRINCIPIOS_CONVERSACIONALES.md` | `docs/audit/AUDITORIA_04_PRINCIPIOS_CONVERSACIONALES.md` |
| `AUDITORIA_05_PASSENGER_EXPERIENCE.md` | `docs/audit/AUDITORIA_05_PASSENGER_EXPERIENCE.md` |
| `AUDITORIA_06_ARQUITECTURA_COGNITIVA.md` | `docs/audit/AUDITORIA_06_ARQUITECTURA_COGNITIVA.md` |
| `AUDITORIA_07_CONSTITUCIONAL_INTEGRAL.md` | `docs/audit/AUDITORIA_07_CONSTITUCIONAL_INTEGRAL.md` |
| `META_AUDITORIA_07.md` | `docs/audit/META_AUDITORIA_07.md` |
| `AUDITORIA_TRANSVERSAL.md` | `docs/audit/AUDITORIA_TRANSVERSAL.md` |

#### Paso 2.4 — Archivar artefactos de misión

| Archivo en `ael/artifacts/` | Acción |
|---|---|
| `TASK_PLAN.md` | Mover a `ael/artifacts/archive/` |
| `SYSTEM_STATE.md` | Mover a `ael/artifacts/archive/` |
| `DESIGN_SPEC.md` | Mover a `ael/artifacts/archive/` |
| `DECISION_RECORD.md` | Mover a `ael/artifacts/archive/` |
| `PATTERN_EXTRACTION.md` | Mover a `ael/artifacts/archive/` |
| `VALIDATION_REPORT.md` | Mover a `ael/artifacts/archive/` |

#### Paso 2.5 — Conservar en `ael/artifacts/`

| Archivo | Razón |
|---|---|
| `STRATEGIC_DIRECTOR_IMPLEMENTATION_REPORT.md` | Artefacto de implementación, no de producto. |
| `SECRET_AUDIT.md` | Auditoría de infraestructura, transversal. |
| `DIAGNOSTIC_REPORT.md` | Diagnóstico de AEL, no de producto. |
| `SYSTEM_STATE_AUDIT.md` | Auditoría de sistema, transversal. |

**Riesgo:** Medio. Mover archivos puede romper referencias cruzadas en otros documentos.

**Mitigación:**
- Antes de mover, buscar referencias al archivo en todo el repositorio (`grep -rn "nombre-archivo.md"`).
- Actualizar todas las referencias encontradas.
- Si un documento referenciado no se encuentra en su nueva ubicación, crear un redirect simbólico temporal.

**Criterio de finalización:**
- `ael/artifacts/` no contiene documentos de constitución cognitiva de AITOS.
- `ael/artifacts/` no contiene auditorías de AITOS.
- `ael/artifacts/` no contiene BACKLOG.md ni planes de implementación de AITOS.
- Los artefactos de misión están en `ael/artifacts/archive/`.
- `grep -rn "ael/artifacts/01-CONSTITUTION" docs/` no encuentra referencias rotas.
- `ael/contracts/enforce.sh` pasa.
- AITOS compila y sus tests pasan.

### 4.3 Fase 3 — Parametrización de enforcement

**Objetivo:** Eliminar el acoplamiento crítico en `CONTRACTS.md` y `enforce.sh` haciendo que las reglas de enforcement sean configurables por producto en lugar de hardcodeadas para AITOS.

**Dependencias:** Fase 2 completada. Necesario porque los paths en las reglas de enforcement deben reflejar las nuevas ubicaciones de archivos.

#### Paso 3.1 — Diseñar el schema de configuración

Crear `ael/contracts/product-rules.schema.json` que defina la estructura de un archivo de reglas de producto:

```json
{
  "product": "string",
  "rules": {
    "contract_integrity": {
      "forbidden_imports": [
        { "from": "src/lib/ai/", "import": "@/lib/services/", "except": ["types"] }
      ]
    },
    "dependency_rules": {
      "layer_constraints": [
        { "layer": "src/lib/utils/", "must_not_import_from": ["@/lib/"] },
        { "layer": "src/lib/db/", "must_not_import_from": ["@/lib/services/"] }
      ]
    },
    "ai_first": {
      "no_heuristic_ranking": ["src/lib/db/domains/geo.ts"],
      "no_hardcoded_priorities": ["src/lib/db/domains/geo.ts"]
    }
  }
}
```

#### Paso 3.2 — Crear archivo de reglas para AITOS

Crear `ael/contracts/product-rules.json` con las reglas actuales de AITOS extraídas de `CONTRACTS.md` y `enforce.sh`.

#### Paso 3.3 — Reescribir CONTRACTS.md

Convertir `ael/constitution/CONTRACTS.md` en una especificación abstracta de categorías de reglas, sin paths concretos:

- R1: Contract Integrity → "Verifica que las capas no importen de capas que no deben. Definido por producto."
- R2: Dependency Rules → "Verifica que las dependencias respeten las ADRs del producto. Definido por producto."
- R3: Code Existence → "Verifica que archivos referenciados existan." (genérico, no requiere parametrización)
- R4: AI-First → "Verifica que no haya heurísticas hardcodeadas donde debería usarse IA. Definido por producto."

#### Paso 3.4 — Reescribir enforce.sh

Modificar `ael/contracts/enforce.sh` para que:
1. Lea `ael/contracts/product-rules.json`.
2. Genere dinámicamente los comandos grep a partir de la configuración.
3. Reporte PASS/FAIL por regla como antes.
4. Si no existe `product-rules.json`, emita una advertencia pero no falle.

#### Paso 3.5 — Verificar equivalencia

Ejecutar el nuevo `enforce.sh` contra AITOS y verificar que produce exactamente los mismos resultados que el script actual.

**Riesgo:** Alto. Cambiar el mecanismo de enforcement puede introducir falsos positivos o falsos negativos.

**Criterio de finalización:**
- `ael/constitution/CONTRACTS.md` no contiene paths de AITOS.
- `ael/contracts/enforce.sh` no contiene paths de AITOS.
- `ael/contracts/product-rules.schema.json` existe y es válido.
- `ael/contracts/product-rules.json` contiene las reglas actuales de AITOS.
- Ejecutar `enforce.sh` contra AITOS produce los mismos resultados que antes de la migración.
- `ael/contracts/enforce.sh --validate-schema` aprueba el schema.
- AITOS compila y sus tests pasan.

---

## 5. Riesgos

### 5.1 Matriz de riesgos por fase

| Riesgo | Fase | Probabilidad | Impacto | Detección | Reversión |
|---|---|---|---|---|---|
| **R1 — Referencias cruzadas rotas** | Fase 2 | Media | Medio | `grep -rn "ael/artifacts/" docs/` después de cada movimiento | `git revert` del movimiento |
| **R2 — enforce.sh deja de funcionar** | Fase 3 | Media | Alto | Ejecutar `enforce.sh` inmediatamente después del cambio | `git revert`; el script anterior es auto-contenido |
| **R3 — Falsos positivos en enforcement** | Fase 3 | Alta | Medio | Comparar output antes/después con mismo código | Ajustar `product-rules.json`; el schema garantiza estructura |
| **R4 — Falsos negativos en enforcement** | Fase 3 | Media | Crítico | Tests de regresión: violaciones conocidas deben seguir detectándose | Agregar regla faltante a `product-rules.json` |
| **R5 — Agentes dejan de funcionar** | Fase 1 | Baja | Alto | Ejecutar misión de prueba post-cambio | `git revert` del prompt |
| **R6 — Documentos migrados se pierden** | Fase 2 | Baja | Medio | `git status` muestra moves, no deletes | `git revert` |
| **R7 — Regresión en AITOS** | Todas | Baja | Crítico | `npm test && npm run build && bash ael/contracts/enforce.sh` después de cada fase | `git revert` de la fase completa |

### 5.2 Protocolo de reversión

Cada fase es atómica: o se completa exitosamente, o se revierte completamente. No existen estados intermedios parciales.

```
ANTES de cada fase:
  1. git stash (guardar trabajo no commiteado)
  2. git tag pre-fase-N (marcar punto de reversión)

DURANTE cada fase:
  3. Ejecutar cambios
  4. Verificar criterios de finalización
  5. Si PASS → continuar
  6. Si FAIL → git reset --hard pre-fase-N

DESPUÉS de cada fase:
  7. git commit con mensaje: "MIGRATION: Phase N completed"
  8. git tag post-fase-N
```

---

## 6. Criterios de aceptación

La migración se considera **completada** cuando se cumplen todos los siguientes criterios. Cada criterio es objetivo y verificable.

### 6.1 Criterios de independencia

| ID | Criterio | Verificación |
|---|---|---|
| **CA-01** | Ningún archivo en `ael/` (excluyendo `archive/`) contiene paths de AITOS (`src/lib/ai/`, `src/lib/services/`, `src/lib/db/`) que no sean parametrizables. | `grep -rn "src/lib/" ael/ --include="*.md" --include="*.sh" \| grep -v "archive/" \| grep -v "product-rules.json"` no produce resultados. |
| **CA-02** | `ael/constitution/CONTRACTS.md` no menciona AITOS, TaxiGuazú ni paths de producto. | `grep -rn "AITOS\|TaxiGuazú\|src/lib/" ael/constitution/CONTRACTS.md` no produce resultados. |
| **CA-03** | `ael/contracts/enforce.sh` no contiene paths de AITOS hardcodeados. | `grep -n "src/lib/" ael/contracts/enforce.sh` no produce resultados. |
| **CA-04** | Los agentes PLAN y BUILD se identifican como parte de ARNÉS, no de AITOS. | `grep "AITOS" .opencode/agents/plan.md` solo encuentra referencias contextuales a "producto actual". |
| **CA-05** | Los roles de Architect y Auditor no referencian `AITOS_CONSTITUTION.md`. | `grep "AITOS_CONSTITUTION" ael/government/roles/03-architect.md ael/government/roles/05-auditor.md` no produce resultados. |

### 6.2 Criterios de organización

| ID | Criterio | Verificación |
|---|---|---|
| **CO-01** | `ael/artifacts/` no contiene documentos de constitución cognitiva de AITOS. | `ls ael/artifacts/0*-*.md` no lista archivos. |
| **CO-02** | Los documentos migrados existen en sus ubicaciones de destino. | `ls docs/architecture/cognitive/01-CONSTITUTION.md` existe. |
| **CO-03** | Los artefactos de misión están archivados. | `ls ael/artifacts/TASK_PLAN.md` no existe; `ls ael/artifacts/archive/TASK_PLAN.md` existe. |
| **CO-04** | `ael/README.md` presenta a AEL como implementación genérica. | Primera oración no contiene "TaxiGuazú" como único producto. |

### 6.3 Criterios de funcionamiento

| ID | Criterio | Verificación |
|---|---|---|
| **FU-01** | AITOS compila sin errores. | `npm run build` exit code 0. |
| **FU-02** | Todos los tests de AITOS pasan. | `npm test` exit code 0. |
| **FU-03** | El enforcement de contratos funciona. | `bash ael/contracts/enforce.sh` exit code 0. |
| **FU-04** | El enforcement produce los mismos resultados que antes. | Comparación de output pre y post migración idéntica. |
| **FU-05** | Los agentes PLAN y BUILD operan normalmente. | Misión de prueba ejecutada exitosamente. |

### 6.4 Criterio de extracción

| ID | Criterio | Verificación |
|---|---|---|
| **EX-01** | Es posible copiar `ael/` y `.opencode/agents/` y `.opencode/commands/` a un repositorio vacío y que `enforce.sh --validate-schema` pase sin errores. | Prueba manual de extracción. |

---

## 7. Deuda aceptada

No toda la deuda detectada en la auditoría debe resolverse. La siguiente deuda se acepta explícitamente con justificación.

### 7.1 Deuda aceptada permanente

| ID | Elemento | Justificación |
|---|---|---|
| **DA-01** | `ael/archive/` contiene documentos con referencias a AITOS y TaxiGuazú. | Es un archivo histórico. Su valor es documental, no operacional. Modificarlo no mejora la arquitectura actual y destruye el registro histórico. |
| **DA-02** | `.opencode/memory/MEMORY.md` contiene ~60 referencias a código de AITOS. | Es el repositorio de conocimiento del producto. Su función es preservar información específica del producto. No es acoplamiento: es su propósito. |
| **DA-03** | `ael/constitution/SPEC.md` conserva una mención contextual de AITOS. | La especificación puede mencionar que actualmente gobierna AITOS como ejemplo, siempre que el texto principal sea genérico. |

### 7.2 Deuda aceptada temporal (con plan de resolución)

| ID | Elemento | Justificación | Resolución futura |
|---|---|---|---|
| **DA-04** | `ael/contracts/product-rules.json` contiene paths de AITOS. | Es el archivo de configuración del producto. Por definición, debe contener paths del producto. No es deuda: es configuración. | Se moverá al repositorio del producto cuando ARNÉS se extraiga. |
| **DA-05** | Los subagentes `@ael-*` dependen de la plataforma OpenCode. | AEL es una implementación para OpenCode. La dependencia de plataforma es inherente a una implementación. | Si se crea una implementación para otra plataforma, será un proyecto separado. |

### 7.3 Lo que NO se acepta como deuda

| Elemento | Razón para NO aceptarlo |
|---|---|
| Paths de AITOS en `CONTRACTS.md` | Es la raíz del acoplamiento crítico. Aceptarlo impediría la extracción. |
| Paths de AITOS en `enforce.sh` | Ídem. |
| Documentos de AITOS en `ael/artifacts/` | Confunden la identidad de AEL. Deben migrarse. |
| Agentes identificándose como "de AITOS" | Es una violación del modelo de tres capas. |

---

## 8. Roadmap

### 8.1 Visión general

```
AHORA       SEMANA 1       SEMANA 2       SEMANA 3       COMPLETADO
  │            │              │              │              │
  ▼            ▼              ▼              ▼              ▼
FASE 1      FASE 2         FASE 3        VERIFICACIÓN   AEL INDEPENDIENTE
(1 misión)  (1-2 misiones) (2-3 misiones) (1 misión)
```

### 8.2 Fase 1 — Desacoplamiento textual

| Atributo | Valor |
|---|---|
| **Prioridad** | P0 — prerequisito para todo lo demás |
| **Esfuerzo estimado** | 1 misión BUILD (~30 min) |
| **Impacto** | Bajo en comportamiento, alto en claridad arquitectónica |
| **Riesgo** | Mínimo |
| **Dependencias** | Ninguna |
| **Archivos modificados** | 8 (~20 líneas) |
| **Acoplamientos resueltos** | AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10 |
| **Criterio de entrada** | Estrategia aprobada |
| **Criterio de salida** | 8 archivos limpios; agentes operativos; AITOS compila |

### 8.3 Fase 2 — Reorganización estructural

| Atributo | Valor |
|---|---|
| **Prioridad** | P1 — necesario antes de Fase 3 |
| **Esfuerzo estimado** | 1-2 misiones BUILD (~1-2 horas) |
| **Impacto** | Medio en estructura de directorios, alto en organización |
| **Riesgo** | Medio (referencias cruzadas) |
| **Dependencias** | Fase 1 completada |
| **Archivos movidos** | 29 (23 migraciones + 6 archivados) |
| **Directorios creados** | `docs/architecture/cognitive/` |
| **Acoplamientos resueltos** | AC-03, AC-11 |
| **Criterio de entrada** | Fase 1 verificada |
| **Criterio de salida** | `ael/artifacts/` limpio; documentos en destino; sin referencias rotas |

### 8.4 Fase 3 — Parametrización de enforcement

| Atributo | Valor |
|---|---|
| **Prioridad** | P0 — el objetivo principal de la migración |
| **Esfuerzo estimado** | 2-3 misiones BUILD (~2-4 horas) |
| **Impacto** | Alto — cambia el mecanismo central de validación |
| **Riesgo** | Alto (falsos positivos/negativos) |
| **Dependencias** | Fase 2 completada |
| **Archivos creados** | `product-rules.schema.json`, `product-rules.json` |
| **Archivos modificados** | `CONTRACTS.md` (reescritura), `enforce.sh` (reescritura) |
| **Acoplamientos resueltos** | AC-01, AC-02 |
| **Criterio de entrada** | Fase 2 verificada |
| **Criterio de salida** | Enforcement parametrizado; output equivalente; AITOS funcional |

### 8.5 Hitos y entregables

| Hito | Entregable | Fase |
|---|---|---|
| **M1 — Branding limpio** | AEL se identifica como implementación ARNÉS, no como parte de AITOS | Fase 1 |
| **M2 — Directorios organizados** | Documentación de AITOS fuera de `ael/`. `ael/artifacts/` contiene solo artefactos de implementación | Fase 2 |
| **M3 — Enforcement independiente** | Las reglas de contrato son configurables. AEL no conoce los paths de AITOS | Fase 3 |
| **M4 — Migración completa** | Todos los criterios de aceptación (CA-01 a EX-01) cumplidos | Post-Fase 3 |

### 8.6 Camino crítico

```
Fase 1 ──▶ Fase 2 ──▶ Fase 3 ──▶ Verificación ──▶ COMPLETADO
  │           │           │
  └── Sin dependencias    │
              └── Depende de Fase 1 (referencias actualizadas)
                          └── Depende de Fase 2 (paths reflejan nueva estructura)
```

**Duración total estimada:** 4-6 misiones BUILD (3-7 horas de trabajo efectivo).

**No hay paralelismo posible entre fases.** Cada fase modifica archivos que la siguiente fase necesita en su estado final.

---

> *Esta estrategia de migración es el plano para transformar AEL en una implementación independiente de ARNÉS. No ejecuta nada. Define qué, cuándo, en qué orden, con qué riesgos y bajo qué criterios de éxito. Cada fase es atómica, reversible y verificable. Al finalizar, AEL será una implementación que podrá usarse para construir cualquier producto — no solo AITOS.*
>
> *Versión 1.0. Documento de Nivel 1. Sujeto a F-ADR para modificaciones. La ejecución de esta estrategia requiere misiones BUILD independientes gobernadas por el proceso PLAN→BUILD.*
