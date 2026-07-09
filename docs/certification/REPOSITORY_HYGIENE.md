# REPOSITORY HYGIENE AUDIT — P3.1
## 2026-07-08

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| .gitignore encontrados | 3 |
| Archivos JSON (excluyendo node_modules) | 55 |
| Archivos residuales (*.bak, *.old, etc.) | 0 |
| Archivos tracked | 541 |
| Archivos untracked | 9 |
| Duplicados reales | 2 (ARCHITECTURE_BASELINE.json ≈ metrics.json) |
| Riesgos P0 | 0 |
| Riesgos P1 | 1 (.husky/_/.gitignore con regla `*` sobreprotege) |

---

## SECCIÓN A — GITIGNORE

| Archivo | Reglas | Exclusivas | Duplicadas | ¿Necesario? |
|---|---|---|---|---|
| `.gitignore` (raíz) | 77 | Todas | — | ✅ CANÓNICO |
| `.husky/_/.gitignore` | 1 (`*`) | 1 | 0 | ⚠️ Mantener (Husky v9 requiere este directorio vacío trackeado, el `*` ignora contenido no-trackeable) |
| `.opencode/.gitignore` | 5 | 5 | 0 | ✅ Mantener (protege node_modules/ y lockfiles locales de opencode) |

**Conclusión**: Los 3 .gitignore son necesarios y no tienen duplicados ni contradicciones. El de `.husky/_/` es requerido por Husky. El de `.opencode/` aísla dependencias locales del agente.

---

## SECCIÓN B — JSON

### Configuración (4)

| Archivo | Tamaño | Versionado | Generado por |
|---|---|---|---|
| `opencode.json` | 3124B | ✅ Sí | Manual |
| `package.json` | 2043B | ✅ Sí | Manual |
| `tsconfig.json` | 996B | ✅ Sí | Manual |
| `.opencode/package.json` | 65B | ✅ Sí | opencode auto |

### Datos / Knowledge (11)

| Archivo | Tamaño | Consumidores |
|---|---|---|
| `data/knowledge/geo/places.json` | 8812B | `iguazu-knowledge.ts` |
| `data/knowledge/geo/borders.json` | 3475B | `iguazu-knowledge.ts` |
| `data/knowledge/geo/attractions.json` | 2073B | `iguazu-knowledge.ts` |
| `data/knowledge/ops/operations.json` | 6180B | `taxiguazu-knowledge.ts` |
| `data/knowledge/ops/migration.json` | 2174B | `taxiguazu-knowledge.ts` |
| `data/knowledge/ops/pricing-rules.json` | 508B | Referencia |
| `data/knowledge/commercial/calendar.json` | 2620B | Pricing engine |
| `data/knowledge/commercial/surge-rules.json` | 806B | Pricing engine |
| `data/knowledge/policies/reserva.json` | 3048B | `policy-reserva.ts` |
| `data/knowledge/policies/ahora.json` | 2689B | `policy-ahora.ts` |
| `data/knowledge/policies/escalation.json` | 1649B | `comprehension-runner.ts` |
| `data/knowledge/manifest.json` | 3939B | `validate-knowledge.ts` |

### Artefactos generados — Build (30+)

| Directorio | Archivos | Generado por | Git |
|---|---|---|---|
| `.next/` | ~30 .json | `next build` | ✅ Ignorado |

### Arquitectura (4)

| Archivo | Tamaño | ¿Duplicado? |
|---|---|---|
| `docs/architecture/ARCHITECTURE_BASELINE.json` | 6765B | ⚠️ SÍ — idéntico a `metrics.json` |
| `docs/architecture/metrics.json` | 6765B | ⚠️ SÍ — idéntico a `ARCHITECTURE_BASELINE.json` |
| `docs/architecture/reverse-engineering/architecture-graphs.baseline.json` | 1237B | ✅ No |
| `docs/architecture/reverse-engineering/architecture-graphs.json` | 1237B | OK (par baseline↔actual) |

### Otros (5)

| Archivo | Tipo |
|---|---|
| `.vercel/repo.json` | Config Vercel |
| `.agents/skills-lock.json` | Lock de skills |
| `.agents/skills/react-best-practices/metadata.json` | Metadata skill |
| `.opencode/package-lock.json` | Lock opencode |
| `package-lock.json` | Lock npm |

### Hallazgos

| Hallazgo | Severidad |
|---|---|
| `ARCHITECTURE_BASELINE.json` y `metrics.json` son idénticos (6765B c/u) | P2 — uno sobra |
| `architecture-graphs.baseline.json` y `architecture-graphs.json` son pares baseline↔actual | OK — esperado |
| 0 archivos JSON huérfanos | ✅ |

---

## SECCIÓN C — ARCHIVOS RESIDUALES

**0 archivos encontrados.** No hay .bak, .old, .orig, .tmp, .backup, .copy, .disabled, .generated, .snapshot. El repositorio está limpio de artefactos residuales.

---

## SECCIÓN D — GIT

| Métrica | Valor |
|---|---|
| Archivos tracked | 541 |
| Archivos untracked | 9 |
| Archivos ignorados | .next/, node_modules/, .env, data/*.db, coverage/, .vercel/ |

Archivos untracked (9): todos son nuevos de las misiones A2-A6 (workflow handlers, docs, ael/constitution, ael/government). Ya fueron commiteados en RC1.

---

## SECCIÓN E — ESTRUCTURA

| Área | Estado |
|---|---|
| Carpetas duplicadas | ✅ 0 |
| Nombres inconsistentes | ✅ Coherente |
| Archivos fuera de lugar | ✅ 0 |
| Documentación repetida | ⚠️ `ARCHITECTURE_BASELINE.json` = `metrics.json` (ver Sección B) |
| Manifests repetidos | ✅ 1 (`data/knowledge/manifest.json`) |
| Configuraciones repetidas | ✅ 0 |

---

## SECCIÓN F — CONSISTENCIA

| Fuente de verdad | Archivo canónico | ¿Compite con otro? |
|---|---|---|
| **Backlog** | `ael/artifacts/BACKLOG.md` | No |
| **Roadmap** | `docs/ROADMAP.md` | No |
| **Baseline** | `docs/certification/QUALITY_BASELINE.md` + `docs/architecture/ARCHITECTURE_BASELINE.md` | ⚠️ Dos archivos con mismo propósito |
| **Certification** | `docs/certification/` (~25 archivos) | ✅ Coherente |
| **Operations** | `docs/operations/` (3 archivos) | No |
| **Architecture** | `docs/architecture/` | No |
| **ADR** | `docs/adr/` (6 archivos) | No |
| **Knowledge** | `data/knowledge/` (12 archivos) | No |

---

## Riesgos y prioridades

| ID | Hallazgo | Prioridad |
|---|---|---|
| R1 | `.husky/_/.gitignore` con regla `*` — no bloquea, pero es Husky v9 específico | P1 |
| R2 | `ARCHITECTURE_BASELINE.json` ≈ `metrics.json` (duplicado) | P2 |
| R3 | `QUALITY_BASELINE.md` + `ARCHITECTURE_BASELINE.md` (mismo propósito) | P3 |

---

**Recomendación**: **APTO PARA COMMIT.** 0 riesgos P0. Los hallazgos P1-P3 son mejoras cosméticas que no bloquean el development flow.
