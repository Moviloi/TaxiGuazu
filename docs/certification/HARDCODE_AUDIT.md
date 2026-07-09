# HARDCODE AUDIT — AITOS
## Categorización completa | 2026-07-08

---

## Categoría A — Correctos (no tocar)

| Hardcode | Archivo | Justificación |
|---|---|---|
| `TIMEOUT_NIVEL_1_MS = 60min` etc. | `constants.ts:15-18` | Timeouts operativos |
| `MIN_MARGIN = 3000`, `LOW_PISO_FACTOR = 0.8` | `constants.ts:10-11` | Configuración de negocio |
| `DISCOUNT_MAX_EXPLICIT = 15` | `constants.ts:7` | Regla de negocio explícita |
| `GROQ_MODEL`, `GROQ_MAX_TOKENS` | `constants.ts:37-44` | Configuración LLM |
| `CONFIDENCE_PROCEED = 0.7` | `constants.ts:47` | Threshold de negocio |
| `v18.0` Facebook API | `sender.ts:7` | API version de Meta |
| `AFFIRMATION_RE`, `AMBIGUOUS_LOCATION_RE` | `patterns.ts` | Patrones de lenguaje natural |
| `GREETING_RE`, `IR_A_RE`, `DESDE_RE`, etc. | `core.ts` | Regex de NLP |

## Categoría B — Aceptables temporalmente

| Hardcode | Archivo | Por qué |
|---|---|---|
| `TIERS = ['premium','normal','low']` | `constants.ts:12` | Enum de negocio estable |
| `AIRPORT_CODE_RE` (IGR, IGU, AGT) | `entity-extractor.ts:62` | Códigos IATA estándar |
| `AIRPORT_CODE_RE` (19 aeropuertos AR) | `regex-extractor.ts:38` | Códigos IATA estándar |
| `DEFAULT_DISCOUNT_FACTOR = 0.9` | `hub-discount.ts:22` | Default de negocio |
| `STANDARD_DISCOUNT = 10` | `constants.ts:8` | Default de negocio |

## Categoría C — Incorrectos (deben migrar a Turso)

| Hardcode | Líneas | Prioridad | Acción |
|---|---|---|---|
| `PAIR_BASE` (20 zone pairs) | `location-resolver.ts:135-146` | **P1** | Tabla `zone_proximity` |
| `CORRIDOR_PAIRS` (6 pairs) | `location-resolver.ts:148-152` | **P1** | Tabla `zone_corridors` |
| `ENTITY_CATALOG` (10 entidades) | `entity-catalog.ts:12-97` | **P1** | Tabla `entity_patterns` |
| `iguazu-knowledge.ts` transport data | `iguazu-knowledge.ts:100-117` | **P2** | Tabla `transport_info` |
| `iguazu-knowledge.ts` CDE shopping | `iguazu-knowledge.ts:122-154` | **P2** | Tabla `shopping_info` |
| `iguazu-knowledge.ts` practical/restaurants | `iguazu-knowledge.ts:157-190` | **P2** | Tabla `practical_info` |
| `getOperationalInfoPrompt` labels | `taxiguazu-knowledge.ts:43-50` | **P3** | Columna `label` en ops JSON |
| `DESCRIPTIVE_PREFIX` map | `format-confidence-note.ts:6-16` | **P3** | Tabla `place_descriptions` |

---

## 15 hallazgos: 3 P1, 4 P2, 1 P3
