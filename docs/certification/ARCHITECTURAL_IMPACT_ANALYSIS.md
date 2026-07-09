# ARCHITECTURAL IMPACT ANALYSIS — Conversation Interpreter
## 2026-07-08

---

## Impacto por componente

| Componente | Impacto | Detalle |
|---|---|---|
| **CORE** | NINGUNO | El intérprete consume el intent de CORE, no lo modifica |
| **ROUTER** | NINGUNO | Sin cambios |
| **POLICY** | NINGUNO | Sin cambios |
| **Entity Extractor** | **CONTRATO NUEVO** | Recibe `classification` como parámetro adicional |
| **extraction-runner** | BAJO | Delega clasificación al intérprete |
| **lead.service** | MEDIO | State zones se simplifican |
| **DecisionTrace** | NINGUNO | El intérprete agrega `classification` al trace |
| **Observability** | NINGUNO | Logs existentes se mantienen; se agrega `[INTERPRETER]` log |
| **Tests** | BAJO | Nuevos tests para el intérprete; tests existentes sin cambios |
| **Contratos** | NINGUNO | R1-R4 sin cambios |
| **Build** | NINGUNO | Sin nuevas dependencias |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Convertirse en nuevo lead.service | **Contrato mínimo**: solo clasifica, no ejecuta side effects, no accede a DB |
| Duplicar lógica del workflow | **Sin decisión de estado**: clasifica, pero workflow decide transición |
| Duplicar lógica del extractor | **Sin extracción de entidades**: solo clasifica el rol del mensaje |
| Introducir estado oculto | **Función pura**: mismo input → mismo output. Sin estado interno. |
| Romper determinismo | **Sin llamadas a LLM**: usa regex + reglas + estado conversacional |
| Dependencias circulares | **Sin imports de workflow ni policy**: solo recibe estado como input |

## Extensibilidad — Casos que resuelve naturalmente

| Caso | Cómo lo resuelve |
|---|---|
| `"sí"`, `"no"` | `classification = "confirmation"` |
| `"ese"`, `"el primero"` | `classification = "selection"` |
| `"argentino"`, `"brasileño"` | `classification = "clarification"` → no extraer |
| `"mañana"`, `"a las 15"` | `classification = "answer"` con `targetSlot = "scheduled_at"` |
| `"dos personas"` | `classification = "answer"` con `targetSlot = "passengers"` |
| `"cámbialo por..."` | `classification = "correction"` |
| `"me equivoqué"` | `classification = "correction"` → preguntar qué corregir |
| `"olvidate"` | `classification = "cancel"` |

**Sin reglas específicas por caso.** La clasificación se basa en: (a) texto corto sin entidades + (b) estado conversacional activo + (c) slots previos existentes → aclaración, no nueva extracción.
