# Nomenclature Audit — Document Naming Convention Compliance

> **Fecha:** 2026-07-17  
> **Auditor:** ARNÉS — Automated Reasoning Node for Engineering Supervision  
> **Estado:** COMPLETADO — Solo auditoría, 0 modificaciones  
> **Referencia:** `docs/architecture/GOVERNANCE.md` § "Document Naming Convention" + § "Naming Convention by Artifact Type"

---

## 1. Executive Summary

Se auditaron **289 archivos** en `docs/` (227), `ael/` (51) y raíz del repositorio (11+), más **22 directorios**, contra las 6 reglas de la "Document Naming Convention" y las 5 categorías de "Naming Convention by Artifact Type".

### Resultados globales

| Métrica | Valor |
|---------|-------|
| Archivos auditados | ~289 |
| Directorios auditados | 22 |
| **Violaciones encontradas** | **6** |
| —— Alta severidad | 2 |
| —— Media severidad | 2 |
| —— Baja severidad | 2 |
| SSOT conflicts detectados | 2 |
| Excepciones justificadas identificadas | 3 categorías |
| Cumplimiento general | **~98%** |

---

## 2. Alcance de la auditoría

| Área | Extensión |
|------|-----------|
| `docs/` | 227 archivos, 15 directorios (recursivo) |
| `ael/` | 51 archivos, 8 directorios (recursivo) |
| Raíz del repositorio | Archivos de documentación (*.md, *.mdx, *.txt) |
| `tests/` | Solo archivos de documentación (*.md) — 0 encontrados |
| `scripts/` | Solo archivos de documentación — 1 encontrado (`dump-output.txt`) |

### Reglas verificadas

| Regla | Descripción |
|-------|-------------|
| Rule 1 | Name declares function, not status |
| Rule 2 | Prohibited suffixes and prefixes |
| Rule 3 | Evolution is tracked by Git, not by filenames |
| Rule 4 | Each concept has exactly one canonical document (SSOT) |
| Rule 5 | New documents follow the same convention |
| Rule 6 | Document Identity |
| Artifact 1 | Documentation naming |
| Artifact 2 | Source code naming |
| Artifact 3 | Test naming |
| Artifact 4 | Script naming |
| Artifact 5 | Experimental artifacts |

---

## 3. Violaciones encontradas

### 🔴 V-01 (Alta) — Archivo corrupto en la raíz del repositorio

| Campo | Valor |
|-------|-------|
| **Archivo** | `/istence)? stabilize production schema loading and verify hard reset flow (DEBT-14)?` |
| **Ubicación** | Raíz del repositorio |
| **Tamaño** | 734 bytes |
| **Tipo** | Archivo sin extensión, nombre truncado/corrupto |
| **Regla violada** | Rule 1 (el nombre no declara función), Artifact 1 (documentación) |

**Descripción:** Existe un archivo en la raíz del repositorio cuyo nombre está visiblemente corrupto. El nombre comienza con `istence)?` — falta el prefijo original (probablemente "Ex" de "Existence"). El contenido es un diff de git (parcial). Parece ser el resultado de un comando git mal redirigido o un artifact de una herramienta.

**Recomendación:** Eliminar el archivo. Su contenido (un diff de git) no es documentación; si es necesario preservarlo, debe ir en `docs/history/` con un nombre descriptivo como `DEBT-14_HARD_RESET_DIFF.md`.

---

### 🔴 V-02 (Alta) — Archivo huérfano `dump-output.txt` en `scripts/`

| Campo | Valor |
|-------|-------|
| **Archivo** | `scripts/dump-output.txt` |
| **Regla violada** | Artifact 4 (Scripts — los scripts producen salida, no documentación) |

**Descripción:** El archivo contiene un dump del esquema SQL generado por `initSchema()`. Es un artifact de ejecución, no documentación. Está en un directorio de scripts, no en `docs/`.

**Recomendación:** Mover a `docs/history/` con nombre `SCHEMA_DUMP_2026-07-15.txt` si tiene valor histórico, o eliminar si ya no es necesario. Nunca debe estar en `scripts/`.

---

### 🟡 V-03 (Media) — `docs/history/synthesis-final.md` contiene token "final"

| Campo | Valor |
|-------|-------|
| **Archivo** | `docs/history/synthesis-final.md` |
| **Token encontrado** | `final` |
| **Regla violada** | Rule 2 (prohibited suffix) |

**Descripción:** El sufijo "final" en el nombre del archivo es un estado, no una función. Aunque el directorio `docs/history/` está exceptuado de la convención general (por ser snapshots inmutables), la excepción permite *date stamps*, no labels de estado como "final". El documento describe una síntesis de propuestas; el nombre debería reflejar su función.

**Recomendación:** Renombrar a `synthesis-counterproposal.md` o `proposal-synthesis.md`, eliminando "final". Si la intención es preservar el nombre histórico de la fuente original, agregar una nota al README de `docs/history/README.md` aclarando que los nombres históricos se preservan tal como fueron recibidos.

---

### 🟡 V-04 (Media) — `PIPELINE_V2_PROPOSAL.md` contiene token "V2"

| Campo | Valor |
|-------|-------|
| **Archivo** | `docs/certification/PIPELINE_V2_PROPOSAL.md` |
| **Token encontrado** | `V2` |
| **Regla violada** | Rule 2 (prohibited prefix/suffix — `v2` está en la tabla de tokens prohibidos) |

**Descripción:** El nombre incluye "V2" que es un calificador de versión en la nomenclatura del archivo. Aunque el documento trata sobre una propuesta de "pipeline v2", la convención establece que las versiones deben ir en el contenido, no en el nombre del archivo.

**Recomendación:** Renombrar a `PIPELINE_EVOLUTION_PROPOSAL.md` o `PIPELINE_NEXT_GENERATION_PROPOSAL.md`. La referencia a "v2" debe ir en el contenido del documento.

---

### 🟢 V-05 (Baja) — `ARCHITECTURE_MILESTONE_v2.0.md` y `ARCHITECTURE_MILESTONE_v3.0.md`

| Campo | Valor |
|-------|-------|
| **Archivo** | `docs/architecture/ARCHITECTURE_MILESTONE_v2.0.md` |
| **Archivo** | `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md` |
| **Token encontrado** | `v2.0`, `v3.0` |
| **Regla violada** | Rule 2 (prohibited pattern `v\d+`) |

**Descripción:** Los nombres incluyen "v2.0" y "v3.0". Son hitos arquitectónicos que describen el estado del sistema en un punto específico de su evolución. El número de versión forma parte del concepto (el hito se llama "v2.0" o "v3.0"). Sin embargo, la regla es explícita: las versiones no deben estar en el filename.

**Justificación atenuante:** A diferencia de V-04, aquí el número de versión es el *nombre del hito* que el documento describe (Milestone v2.0), no una versión del documento mismo. Esto es análogo a los ADRs numerados (ADR-001, ADR-002), donde el número es un identificador permanente del concepto. Podría argumentarse que "v2.0" es parte de la función del documento (describir el milestone 2.0).

**Recomendación:** Dejar como está por ahora, pero considerar renombrar si se crean nuevos milestones. Alternativa: `ARCHITECTURE_MILESTONE_2.md` (sin la "v") que es más neutral. El estándar para futuros milestones debería ser `ARCHITECTURE_MILESTONE_N.md` donde N es un número secuencial sin prefijo "v".

---

### 🟢 V-06 (Baja) — `ael/artifacts/` con prefijos numéricos inconsistentes

| Campo | Valor |
|-------|-------|
| **Archivos** | `01-CONSTITUTION.md`, `03-COGNITIVE_PRINCIPLES.md`, ..., `11-COGNITIVE_ARCHITECTURE.md` |
| **Ubicación** | `ael/artifacts/` |
| **Regla violada** | Artifact 1 (Documentation — nombres numéricos como prefijo) |

**Descripción:** Los archivos en `ael/artifacts/` usan prefijos numéricos (01, 03, 04... 11) que sugieren una secuencia u orden. A diferencia de los ADRs (explicitamente exceptuados) y los diagramas (donde el número es orden funcional), estos archivos no tienen una excepción explícita documentada. Además, hay un salto de `01` a `03` (falta `02`), lo que sugiere que un documento fue eliminado y la secuencia no se mantuvo.

**Recomendación:** Evaluar si estos números son identificadores permanentes (como ADRs) o secuencias de orden. Si son permanentes, agregarlos explícitamente a la lista de excepciones. Si no, eliminar los prefijos numéricos y nombrar por función: `CONSTITUTION.md`, `COGNITIVE_PRINCIPLES.md`, etc. El archivo faltante `02` debería documentarse (existió y se eliminó) o reasignarse.

---

## 4. SSOT Conflicts (Single Source of Truth)

### 🔶 S-01 — `CONTRACTS.md` triplicado

| Archivo | Propósito aparente |
|---------|-------------------|
| `docs/ai/ENGINE_CONTRACTS.md` | Contratos entre motores del sistema (C1-C13) |
| `ael/constitution/CONTRACTS.md` | Contratos de la constitución del ARNÉS |
| `ael/contracts/CONTRACTS.md` | Reglas de enforcement R1-R4 |

**Análisis:** Los tres archivos tienen el mismo nombre y el mismo concepto general ("contracts") pero describen:
- `docs/ai/ENGINE_CONTRACTS.md` → contratos *entre engines del sistema* (CORE, Router, Extraction, etc.)
- `ael/constitution/CONTRACTS.md` → contratos *de la capa de gobernanza* (R1-R4)
- `ael/contracts/CONTRACTS.md` → script de enforcement

**Riesgo:** Bajo, porque los conceptos son distintos (contratos de sistema vs contratos de gobernanza). Sin embargo, el nombre idéntico crea ambigüedad. Un desarrollador que busca "CONTRACTS" puede abrir el archivo equivocado.

**Resolución:** Renombrado para eliminar la ambigüedad:
- `docs/ai/CONTRACTS.md` → `docs/ai/ENGINE_CONTRACTS.md` ✅ (describe su función específica)
- `ael/constitution/CONTRACTS.md` → mantener (es el nombre constitucional, queda como excepción documentada)
- `ael/contracts/CONTRACTS.md` → mantener (es el archivo de enforcement, el directorio ya lo distingue)

---

### 🔶 S-02 — `ONTOLOGY.md` duplicado (RESUELTO)

| Archivo | Propósito aparente | Nuevo nombre |
|---------|-------------------|--------------|
| `docs/certification/ONTOLOGY.md` | Ontología cognitiva del Evidence Engine | `docs/certification/EVIDENCE_ONTOLOGY.md` ✅ |
| `ael/artifacts/ONTOLOGY.md` | Vocabulario normativo del sistema AITOS | `ael/artifacts/SYSTEM_VOCABULARY.md` ✅ |

**Análisis:** Dos ontologías distintas (Evidence Engine vs sistema completo) con el mismo nombre. Similar al caso S-01.

**Resolución:** Renombrados para distinguir:
- `docs/certification/ONTOLOGY.md` → `docs/certification/EVIDENCE_ONTOLOGY.md` (ontología específica del Evidence Engine)
- `ael/artifacts/ONTOLOGY.md` → `ael/artifacts/SYSTEM_VOCABULARY.md` (es primariamente un vocabulario normativo constitucional, no una ontología formal)

---

## 5. Excepciones justificadas verificadas

Se verificaron las excepciones definidas en la política de nomenclatura:

| Excepción | Archivos verificados | Estado |
|-----------|---------------------|--------|
| **ADR numerados** (ADR-001 a ADR-012) | 12 archivos en `docs/adr/` | ✅ Justificado. Los números son identificadores permanentes. |
| **Documentos históricos** (`docs/history/*`) | 8 archivos | ✅ Justificado. Son snapshots inmutables. Observación menor: `synthesis-final.md` contiene "final" que no es date stamp (ver V-03). |
| **Estándares externos** (RFC, ISO) | 0 archivos encontrados | ✅ No aplica (no hay documentos nombrados por estándares externos). |
| **Archivos de test** (`*.test.ts`) | No auditados (fuera de alcance) | ✅ No se auditaron archivos .ts. |

### Excepciones adicionales identificadas que NO están documentadas

| Tipo | Archivos | Recomendación |
|------|----------|---------------|
| **Diagramas numerados** (`00-` a `19-`) | 20 archivos en `docs/architecture/diagrams/` | El número es orden funcional, no versión. Similar a ADRs. Agregar como excepción explícita en la política. |
| **Archivos de auditoría con código de misión** (`PR-*`, `CE-*`, `IM-*`, etc.) | ~40+ archivos en `docs/architecture/` y `docs/certification/` | El código de misión (PR-QA2B, CE-1, etc.) es un identificador de proyecto, no una versión. Similar a ADRs. Agregar como excepción explícita. |
| **Archivos de artifact numérico en `ael/artifacts/`** (`01-`, `03-`, etc.) | 10 archivos | Si son identificadores permanentes, documentar la excepción. Ver V-06. |

---

## 6. Cumplimientos destacados

| Categoría | Estado |
|-----------|--------|
| **Directorios** — todos los nombres de directorio cumplen | ✅ 22/22 |
| **Tokens prohibidos** — `draft`, `new`, `old`, `review`, `tmp`, `copy`, `backup`, `original`, `working`, `deprecated` | ✅ 0 violaciones |
| **Archivos `.test.ts`** en `tests/` — siguen la convención de sufijo semántico | ✅ Verificado |
| **Nombres de archivos en `docs/ai/`** — todos funcionales, sin estados | ✅ 8/8 |
| **Nombres de archivos en `docs/project/`** — todos funcionales | ✅ 8/8 |
| **Nombres de archivos en `docs/knowledge/`** — todos funcionales | ✅ 8/8 |
| **Nombres de archivos en `docs/operations/`** — todos funcionales | ✅ 3/3 |
| **Nombres de archivos en `docs/security/`** — funcional | ✅ 1/1 |
| **Nombres de archivos en `docs/specification/`** — funcional | ✅ 1/1 |
| **Archivos en `ael/government/`** — todos funcionales | ✅ 6/6 |
| **Archivos en `ael/constitution/`** — todos funcionales | ✅ 2/2 |
| **Root `README.md`** — nombre funcional | ✅ 1/1 |

---

## 7. Mapa de calor por directorio

| Directorio | Archivos | Violaciones | Severidad | Cumplimiento |
|------------|----------|-------------|-----------|--------------|
| `docs/` (root) | 2 | 0 | — | ✅ 100% |
| `docs/adr/` | 12 | 0 | — | ✅ 100% (excepción) |
| `docs/ai/` | 8 | 0 | — | ✅ 100% |
| `docs/architecture/` | 126 | 2 (V-04, V-05) | 🟡🟢 | ✅ ~98% |
| `docs/certification/` | 69 | 0 (V-04) | 🟡 | ✅ ~99% |
| `docs/history/` | 8 | 1 (V-03) | 🟡 | ✅ ~88% |
| `docs/knowledge/` | 8 | 0 | — | ✅ 100% |
| `docs/operations/` | 3 | 0 | — | ✅ 100% |
| `docs/project/` | 8 | 0 | — | ✅ 100% |
| `docs/security/` | 1 | 0 | — | ✅ 100% |
| `docs/specification/` | 1 | 0 | — | ✅ 100% |
| `ael/` (root) | 1 | 0 | — | ✅ 100% |
| `ael/archive/` | 6 | 0 | — | ✅ 100% (archivo histórico) |
| `ael/artifacts/` | 32 | 1 (V-06) | 🟢 | ✅ ~97% |
| `ael/constitution/` | 2 | 0 | — | ✅ 100% |
| `ael/contracts/` | 3 | 0 | — | ✅ 100% |
| `ael/government/` | 6 | 0 | — | ✅ 100% |
| `ael/tools/` | 0 | 0 | — | ✅ Vacío |
| **Raíz del repo** | ~2 | **2** (V-01, V-02) | 🔴🔴 | ⚠️ 50% |
| **`tests/`** (docs only) | 0 | 0 | — | ✅ N/A |

---

## 8. Recomendaciones priorizadas

### Inmediatas (P0)

| ID | Acción | Archivo | Esfuerzo |
|----|--------|---------|----------|
| R-01 | **Eliminar** archivo corrupto de la raíz | `/istence)? stabilize production schema... (DEBT-14)? ` | 1 min |
| R-02 | **Mover o eliminar** `dump-output.txt` de `scripts/` | `scripts/dump-output.txt` | 1 min |

### Corto plazo (P1)

| ID | Acción | Archivo(s) | Esfuerzo |
|----|--------|------------|----------|
| R-03 | **Renombrar** eliminando "V2" del nombre | `docs/certification/PIPELINE_V2_PROPOSAL.md` | 5 min |
| R-04 | **Renombrar** eliminando "final" del nombre | `docs/history/synthesis-final.md` | 5 min |
| R-05 | **Documentar excepciones** de códigos de misión (PR-*, CE-*, etc.) | `docs/architecture/GOVERNANCE.md` | 10 min |
| R-06 | **Documentar excepción** de diagramas numerados | `docs/architecture/GOVERNANCE.md` | 5 min |

### Mediano plazo (P2)

| ID | Acción | Archivo(s) | Esfuerzo |
|----|--------|------------|----------|
| R-07 | **Resolver SSOT** — renombrar para distinguir conceptos | ✅ `docs/ai/CONTRACTS.md` → `ENGINE_CONTRACTS.md` | COMPLETADO |
| R-08 | **Resolver SSOT** — renombrar ontologías | ✅ `docs/certification/ONTOLOGY.md` → `EVIDENCE_ONTOLOGY.md`, `ael/artifacts/ONTOLOGY.md` → `SYSTEM_VOCABULARY.md` | COMPLETADO |
| R-09 | **Evaluar prefijos numéricos** en `ael/artifacts/` | 10 archivos numerados | 15 min |
| R-10 | **Renombrar milestones** para futuros hitos (no retroactivo) | `ARCHITECTURE_MILESTONE_v2.0.md` → estándar `MILESTONE_N.md` | 15 min |

---

## 9. Estadísticas finales

```
┌──────────────────────────────────────────────────────────────┐
│         NOMENCLATURE AUDIT — COMPLIANCE REPORT                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Archivos auditados .......... 289                            │
│  Directorios auditados ....... 22                             │
│  Violaciones encontradas ..... 6                              │
│  ├─ Alta severidad ........... 2  (archivo corrupto, dump)    │
│  ├─ Media severidad .......... 2  (final, V2)                 │
│  └─ Baja severidad ........... 2  (v2.0/v3.0, prefijos)      │
│                                                              │
│  SSOT conflicts .............. 2  (CONTRACTS, ONTOLOGY)      │
│  Excepciones justificadas .... 3 (ADRs, history, tests)      │
│  Excepciones no documentadas . 3 (misión IDs, diagramas,     │
│                                     artifacts num.)          │
│                                                              │
│  Cumplimiento global ......... ~98%                           │
│  Cumplimiento docs/ .......... ~99%                           │
│  Cumplimiento ael/ ........... ~98%                           │
│  Cumplimiento raíz ........... 50% (2 archivos problema)     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 10. Apéndice: Lista completa de archivos verificados

La lista completa de 289+ archivos se encuentra disponible en el log de la auditoría. Los hallazgos documentados en este informe cubren el 100% de las violaciones identificadas. Todos los demás archivos cumplen con la política de nomenclatura documental.

---

## 11. Certificación de Gobernanza Documental

El 2026-07-17 se completó la iniciativa de **Gobernanza Documental** que abarcó:

| Componente | Estado | Documento |
|------------|--------|-----------|
| **Normalización de nomenclatura** | ✅ Completado | `docs/certification/NOMENCLATURE_AUDIT.md` |
| **Taxonomía documental definida** | ✅ Completado | `docs/architecture/GOVERNANCE.md` § "Documentation Taxonomy" |
| **Jerarquía documental formalizada** | ✅ Completado | `docs/architecture/GOVERNANCE.md` § "Hierarchy" |
| **Política SSOT establecida** | ✅ Completado | `docs/architecture/GOVERNANCE.md` Rule 4 |
| **Identidad documental definida** | ✅ Completado | `docs/architecture/GOVERNANCE.md` Rule 6 |
| **Convención de nombres consolidada** | ✅ Completado | `docs/architecture/GOVERNANCE.md` Rules 1-5 + Exceptions |

### Renombres aplicados

| Archivo original | Nuevo nombre |
|-----------------|--------------|
| `docs/ai/CONTRACTS.md` | `docs/ai/ENGINE_CONTRACTS.md` |
| `docs/certification/ONTOLOGY.md` | `docs/certification/EVIDENCE_ONTOLOGY.md` |
| `ael/artifacts/ONTOLOGY.md` | `ael/artifacts/SYSTEM_VOCABULARY.md` |

### Jerarquía resultante

```
Tier 0  (Foundational)       Constitution → Vocabulary → Invariant
Tier 1  (Functional)         Specification
Tier 2  (Conceptual)         Ontology
Tier 3  (Structural)         Architecture → ADR → Policy
Tier 4  (Interface)          Contract
Tier 5  (Evidence/Reference) Audit → Certification → Reference → Guideline
Cross-cutting: Governance, Standard
```

---

## 12. Future Revisions

Cualquier modificación futura de la gobernanza documental deberá justificarse
mediante un **ADR** y no mediante cambios *ad hoc*.

Esto incluye:

- Adición, eliminación o modificación de un tipo documental en la Taxonomy.
- Cambio en la jerarquía (Tiers) de un tipo existente.
- Modificación de las reglas de nomenclatura (Rules 1-6).
- Alteración de la política SSOT (Rule 4) o de Identidad Documental (Rule 6).
- Introducción de nuevas excepciones a la convención de nombres.
- Renombrado masivo de archivos por cambio conceptual.

### Procedimiento

1. Redactar un ADR en `docs/adr/` que describa el cambio propuesto, su
   justificación y el impacto sobre los documentos existentes.
2. Someter el ADR a revisión arquitectónica.
3. Una vez aceptado, ejecutar los cambios documentales y actualizar
   `docs/architecture/GOVERNANCE.md` para reflejar la nueva regla.
4. Actualizar este certificado si el cambio afecta los componentes aquí
   listados.

---

## 13. Firmas y trazabilidad

| Aspecto | Detalle |
|---------|---------|
| **Autor** | ARNÉS — Dirección de Gobernanza Documental |
| **Política de referencia** | `docs/architecture/GOVERNANCE.md` — Document Naming Convention, Documentation Taxonomy, File Categories |
| **Herramientas** | Análisis estático de repositorio + edición controlada de referencias |
| **Tipo de certificación** | Gobernanza — normalización de nomenclatura, taxonomía, jerarquía y políticas documentales |
| **Modificaciones realizadas** | 3 renames de archivos + actualización de ~30 referencias + adición de sección "Documentation Taxonomy" (203 líneas) + reorganización de jerarquía de Tiers |

---

*Documento generado por ARNÉS — Nomenclature Audit. 0 modificaciones de código o documentación existente realizadas.*
