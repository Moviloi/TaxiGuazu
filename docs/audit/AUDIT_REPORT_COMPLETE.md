# AUDITORÍA SISTÉMICA DE AITOS — REPORTE COMPLETO

**Versión:** 1.0  
**Fecha:** 2026-07-20  
**Ejecutada por:** BUILD (ARNÉS Director / AEL)  
**Comisionada por:** PLAN (Strategic Director Layer / SDL)  
**Clasificación de hallazgos:** KEEP | REFACTOR | REMOVE | REDESIGN | INVESTIGATE

---

## RESUMEN EJECUTIVO

AITOS es un sistema conversacional para reserva de taxis vía WhatsApp en la región de la Triple Frontera (Argentina, Brasil, Paraguay). Se encuentra en **versión 0 / pre-producción** sin despliegue productivo.

### Métricas generales del código fuente

| Capa | Archivos | Líneas | % del total |
|------|----------|--------|-------------|
| **Services** (producto real) | 74 | 10,069 | 38.5% |
| **AI Pipeline** (producto real) | 34 | 4,348 | 16.6% |
| **Base de Datos** (producto real) | 12 | 2,592 | 9.9% |
| **Evidence Engine** (shadow/experimental) | 22 | 2,881 | 11.0% |
| **DRL** (experimental, flags false) | 12 | 1,242 | 4.8% |
| **BKE** (experimental, flags false) | 10 | 1,234 | 4.7% |
| **Pattern Discovery** (roto, prohibido activar) | 12 | 2,040 | 7.8% |
| **Memory** (sin efecto real) | 7 | 533 | 2.0% |
| **Cognitive** (propósito ambiguo) | 4 | 525 | 2.0% |
| **Config** | 2 | 141 | 0.5% |
| **Dev** (producción - comando testing) | 1 | 136 | 0.5% |
| **Utils** | 2 | 74 | 0.3% |
| **TOTAL** | **~192** | **~26,115** | **100%** |

### Hallazgos críticos

| Prioridad | Cantidad | Descripción |
|-----------|----------|-------------|
| **🔴 BLOQUEANTE** | 4 | F01-DG, F02-DG, F03-DG (desviaciones CDA) + H-CAT2-001 (slot loss) |
| **🔴 ALTO** | 8 | Identity confusion, evidence engine sin consumidor, pattern discovery roto, etc. |
| **🟡 MEDIO** | 14 | Layer violations, deuda estructural, código zombie, naming confuso |
| **🟢 BAJO** | 9 | Archivos huérfanos, higiene, documentación desactualizada |

---

## SECCIÓN A — AUDITORÍA DE IDENTIDAD DEL SISTEMA

### A.1 ¿Qué es AITOS?

AITOS es un **sistema conversacional de logística de transporte**. Su pipeline real (operacional) es:

```
WhatsApp Webhook → CORE (intent) → Conversation Interpreter → Strategy Decision → 
Extraction (LLM+regex) → Geo Resolution → Context Merge → Pricing → 
Policy → Response Builder → Output
```

Capas auxiliares operacionales: **Dispatch**, **Survey**, **Operational Learning**.

### A.2 ¿Qué NO es AITOS pero está en el repositorio?

| Componente | Archivos | Líneas | Clasificación |
|------------|----------|--------|---------------|
| **Evidence Engine** | 22 | 2,881 | EXPERIMENTAL — shadow mode descartado |
| **Memory (cognitiva, ADR-010)** | 7 | 533 | EXPERIMENTAL — sin efecto real, flag false |
| **Pattern Discovery** | 12 | 2,040 | ROTO — bug de parseo + tablas ausentes |
| **BKE** | 10 | 1,234 | EXPERIMENTAL — todas las flags false |
| **DRL** | 12 | 1,242 | EXPERIMENTAL — todas las flags false |
| **Cognitive collector** | 4 | 525 | AMBIGUO — sin consumidor claro |
| **PLAN/BUILD/SDL/AEL** | ~57 | N/A | ECOSISTEMA DE DESARROLLO — no es producto |
| **Archivos de documentación** | ~227 en docs/ | N/A | SOPORTE — mezcla producto y ecosistema |

### A.3 Hallazgos de identidad

| ID | Hallazgo | Evidencia | Clasificación |
|----|----------|-----------|---------------|
| I-01 | **Evidence Engine: 22 archivos, 2,881 líneas, 378 tests, 7 capas (Signal→Observation→Fact→Evidence→Knowledge→Belief→Decision). Corre en shadow mode. Su salida se descarta.** | `src/lib/evidence/` completo. `lead.service.ts:84-86`: `runShadowCognition()` llamado pero `isEvidenceShadowModeEnabled()` = false por defecto. | 🔴 REDESIGN — decidir si es producto o experimento |
| I-02 | **Memory cognitiva (ADR-010): 7 archivos, 533 líneas, 45 tests. `COGNITIVE_MEMORY_ENABLED=false` por defecto. Wiring existe pero sin efecto.** | `lead.service.ts:93-99`: memoryService.store() sí está conectado pero protegido por `isMemoryShadowModeEnabled()` que retorna false. | 🟡 REFACTOR — o se activa o se mueve a experimental |
| I-03 | **Pattern Discovery: 12 archivos, 2,040 líneas. Bug de parseo confirmado (líneas 188, 204: `JSON.parse` sin validación de tipo). Tablas `pd_*` NO existen en schema.sql (ADR-007 violado). Runtime error garantizado si se activa.** | `repository.ts:188,204` — `JSON.parse((r as any).acceptance_json)`. Tablas ausentes en schema.sql. | 🔴 REMOVE — código roto que no debe estar en el producto |
| I-04 | **BKE + DRL: 22 archivos combinados, 2,476 líneas. 10 feature flags, todas false. Arquitectura conceptual correcta (ADR-012) pero sin adopción real.** | `feature-flags.ts` — todas las funciones retornan false. | 🟡 INVESTIGATE — decidir si activar o posponer |
| I-05 | **`src/lib/cognitive/`: 4 archivos, 525 líneas. `collector.ts` (216L) exporta `capturePipelineEvent()`. Sin consumidor claro del resultado.** | `handler.ts:31` importa y llama `capturePipelineEvent()` pero el destino de los datos no está definido. | REMOVE — funcionalidad incompleta sin requerimiento |
| I-06 | **`src/lib/dev/hard-reset.ts`: 136 líneas. Comando `.limpiar` para testing en producción. No debe existir en el producto.** | `lead.service.ts:10,49-60` — importa y ejecuta hardReset(). | 🔴 REMOVE — funcionalidad de desarrollo en producto |
| I-07 | **Archivo corrupto en raíz del repositorio**: `istence)? stabilize...` (734 bytes, nombre truncado, contenido = diff de git). | Presente en raíz del repo. V-01 de NOMENCLATURE_AUDIT. | 🔴 REMOVE — archivo corrupto |
| I-08 | **`.temp/chats_reales.txt`**: Posible contenido sensible (chats reales). | `.temp/chats_reales.txt` — no versionado pero presente en workspace. | 🔴 REMOVE — riesgo de fuga de datos |
| I-09 | **`ael/archive/` (6 archivos legacy):** `01-director.md`, `AGENTS.md`, `FAILURE.md`, `HANDOFF.md`, `INTEGRATION.md`, `PIPELINE.md` — versiones obsoletas del harness. | `ael/archive/` | 🟢 KEEP — archive histórico, no interfiere |
| I-10 | **Triple naming identity:** Repositorio="GuazuTransfer-Web", package.json="taxiguazu-bot", producto="AITOS". Sin impacto funcional pero confuso. | `package.json:2`, nombre del repo, SYSTEM_BIBLE.md | 🟡 REFACTOR — alinear nombres |

---

## SECCIÓN B — AUDITORÍA BASADA EN RF

### B.1 Matriz RF → Código → Tests → Estado

| RF | Descripción | Archivos clave | Tests | Evidencia CAT | Clasificación |
|----|-------------|----------------|-------|---------------|---------------|
| **RF-01** | Recepción de mensajes | `webhook/route.ts` (350L) | Smoke tests | — | ✅ KEEP |
| **RF-02** | Clasificación de intención (12 intents) | `core.ts` (408L) función pura | `core-intents.test.ts` | CAT-1 S1,S6,S12 ✅ | ✅ KEEP |
| **RF-03** | Extracción de slots progresiva | `extraction-runner.ts`, `extraction-prompt.ts`, `extraction-schema.ts` | `extraction-runner.test.ts` | CAT-1 S8 ✅ | ✅ KEEP |
| **RF-04** | Resolución geográfica | `location-resolver.ts`, `iguazu-knowledge.ts` | `geo-engine.test.ts` | CAT-1 S11 ✅ | ✅ KEEP |
| **RF-05** | Cotización de tarifas | `pricing/` (8 archivos, dual engine v2/v3) | `tariff-resolver.test.ts` | CAT-1 S4 ✅ | 🟡 REFACTOR — eliminar dual engine |
| **RF-06** | Despacho a conductores | `dispatch/` (5 archivos, 4 niveles) | `dispatch.service.test.ts` (24 tests) | — | ✅ KEEP |
| **RF-07** | Confirmación de usuario | `slot-confirmation-handler.ts`, `policy-*.ts` | `fase-25`, `slot-workflow.test.ts` | CAT-1 S8 🟡 PARCIAL | 🟡 REFACTOR — criterio poco claro |
| **RF-08** | Gestión de ambigüedad | `ambiguity-handler.ts` (255L), `ambiguity-interpreter.ts` | `ambiguity-drl-integration.test.ts` | CAT-1 S3,S9,S13 🟡 PARCIAL | 🔴 REDESIGN — F01-DG |
| **RF-09** | Actualización incremental | `slot-state.ts`, `load-previous-slots.ts` | `slot-state-airport-code.test.ts` | CAT-1 S2,S5 🟡 PARCIAL | 🔴 REDESIGN — F02-DG, F03-DG, H-CAT2-001 |
| **RF-10** | Post-venta | `survey.service.ts` | Coverage < 40% | — | 🟡 REFACTOR — cobertura insuficiente |

### B.2 Desviaciones funcionales (P0)

| ID | RF | Descripción | Localización | Clasificación |
|----|----|-------------|--------------|---------------|
| **F01-DG** | RF-08, CDA §6 | Ambiguity se activa sin verificar `session.clarify_field` ni `leadCore.roleLock` | `lead.service.ts` ~line 203 | 🔴 REDESIGN — corregir contra CDA |
| **F02-DG** | RF-09, CDA §7 | Intención no preservada cuando prevIntent=BOOKING y nuevo mensaje clasifica como CONSULTA | `core.ts:277-283` | 🔴 REDESIGN — corregir contra CDA |
| **F03-DG** | RF-09, CDA §2 | Merge de contexto no ejecutado cuando se activa ambigüedad | Pipeline de ambigüedad | 🔴 REDESIGN — corregir contra CDA |
| **H-CAT2-001** | RF-09 | RECOVERY state (score 0.40-0.64) pierde slots confirmados y repite preguntas | `lead.service.ts` | 🔴 REDESIGN — corregir contra CDA |

### B.3 Funcionalidades sin RF asociado (sobreimplementación)

| Funcionalidad | Archivos | Líneas | ¿Por RF? | Clasificación |
|---------------|----------|--------|----------|---------------|
| Pricing dual engine v2 + v3 | 8 archivos | 911 | RF-05 (cotizar) | 🟡 REFACTOR — consolidar a v3 |
| Operational Learning completo | 15 archivos | 1,320 | No hay RF de aprendizaje | 🟡 INVESTIGATE — ¿requisito funcional? |
| Multi-leg packages con hub discount | `hub-discount.ts`, `commercial-pricing-engine.ts` | ~250 | No hay RF específico | 🟡 REFACTOR — evaluar si es necesario en v1 |
| Evidence Engine (7 capas) | 22 archivos | 2,881 | No hay RF | 🔴 REDESIGN — decidir destino |
| Cognitive collector | 4 archivos | 525 | No hay RF | 🔴 REMOVE — sin propósito claro |
| Pattern Discovery | 12 archivos | 2,040 | No hay RF | 🔴 REMOVE — código roto |
| Memory (cognitiva, ADR-010) | 7 archivos | 533 | No hay RF | 🟡 REFACTOR — posponer o activar |

---

## SECCIÓN C — AUDITORÍA ARQUITECTÓNICA

### C.1 Violaciones de capa (ADR-001, ADR-004)

| ID | Violación | Archivo | Línea | Clasificación |
|----|-----------|---------|-------|---------------|
| **V-01** | AI→DB: `display-name.ts` importa `queryOne` de `db/core/helpers` | `src/lib/ai/display-name.ts:5` | `import { queryOne } from "@/lib/db/core/helpers"` | 🔴 REFACTOR — mover a services |
| **V-02** | AI→DB: `ambiguity-interpreter.ts` importa tipo de `db/domains/geo` | `src/lib/ai/ambiguity-interpreter.ts:14` | `import type { PlaceCandidate } from "@/lib/db/domains/geo"` | 🟡 REFACTOR — extraer tipo compartido |
| **V-03** | AI→Services: `response-builder.ts` depende de `OpportunityResult` | DEBT-07 documentado | Conceptual | 🟡 REFACTOR — conocido |
| **V-04** | Survey→Lead: `lead-event-helpers.ts` crea acoplamiento vertical | DEBT-02 | `src/lib/services/shared/lead-event-helpers.ts` | 🟡 REFACTOR — conocido P1-03 |
| **V-05** | DRL: nombres de tabla con tags de fase (`f9_`, `f4_`) en producción | schema.sql | `f9_admin_commands`, `f9_events`, `conversation_f4_log` | 🟡 REFACTOR — renombrar (P1-04) |

### C.2 Sobre-arquitectura

| ID | Hallazgo | Archivos | Líneas | Clasificación |
|----|----------|----------|--------|---------------|
| **S-01** | Evidence Engine: 7 capas para shadow mode descartado | 22 | 2,881 | 🔴 REDESIGN |
| **S-02** | Pattern Discovery: 12 archivos, 2,040 líneas, código roto en producción | 12 | 2,040 | 🔴 REMOVE |
| **S-03** | BKE + DRL: 22 archivos detrás de flags false | 22 | 2,476 | 🟡 REFACTOR |
| **S-04** | Dual pricing engine: v2 + v3 simultáneos | 8 | 911 | 🟡 REFACTOR — eliminar v2 |
| **S-05** | 17 feature flags para sistemas desconectados | 1 | 100 | 🟡 REFACTOR — reducir |
| **S-06** | Cognitive collector sin pipeline definido | 4 | 525 | 🔴 REMOVE |
| **S-07** | 3 sistemas de "memoria" (services/memory, lib/memory, services/learning) | 25 comb. | 2,172 | 🟡 REFACTOR |
| **S-08** | 45 tablas en schema.sql para un producto en etapa 0 | 1 | 670 | 🟡 INVESTIGATE |

### C.3 God Objects

| ID | Archivo | Líneas | Imports cross-service | Clasificación |
|----|---------|--------|----------------------|---------------|
| **G-01** | `services/lead.service.ts` | 335 | 27 imports, 12+ orígenes | 🟡 REFACTOR — I2.1 en roadmap |
| **G-02** | `db/database.ts` | 769 | 63 funciones en monolito | 🟡 REFACTOR — DEBT-04 |
| **G-03** | `ai/handler.ts` | 262 | 12 imports, múltiples dominios | 🟡 REFACTOR |
| **G-04** | `services/extraction/extraction-runner.ts` | ~300+ | Multiples sub-handlers | 🟡 REFACTOR |

---

## SECCIÓN D — AUDITORÍA DE CÓDIGO (ZOMBIE / HUÉRFANOS / MUERTOS)

### D.1 Código zombie confirmado

| ID | Archivo(s) | Líneas | Motivo | Clasificación |
|----|------------|--------|--------|---------------|
| Z-01 | `src/lib/pattern-discovery/` (12 archivos) | 2,040 | Bug parseo + tablas ausentes + prohibido activar | 🔴 REMOVE |
| Z-02 | `src/lib/evidence/` (22 archivos) | 2,881 | Shadow mode descartado. Código funcional pero sin efecto. | 🔴 REDESIGN |
| Z-03 | `src/lib/cognitive/` (4 archivos) | 525 | Sin consumidor claro | 🔴 REMOVE |
| Z-04 | `src/lib/dev/hard-reset.ts` | 136 | Comando de testing en código de producción | 🔴 REMOVE |
| Z-05 | `src/lib/bke/domains/message.ts` | ~200 | Flag false por defecto | 🟡 INVESTIGATE |
| Z-06 | `src/lib/bke/domains/entity.ts` | ~150 | Flag false por defecto | 🟡 INVESTIGATE |
| Z-07 | `src/lib/bke/domains/pricing.ts` | ~150 | Flag false por defecto | 🟡 INVESTIGATE |
| Z-08 | `src/lib/drl/assistance.ts` + 5 rules files | ~500 | Flags false por defecto | 🟡 INVESTIGATE |
| Z-09 | `scripts/archive/` (12 archivos) | ~1,500 | Scripts de migración y diagnóstico ejecutados | 🟢 KEEP (histórico) |
| Z-10 | Archivo corrupto en raíz | 1 | Nombre truncado, contenido = diff git | 🔴 REMOVE |
| Z-11 | `data/bot.db.backup` | 1 | Backup huérfano | 🟡 REMOVE — o mover a .temp/ |
| Z-12 | `scripts/dump-output.txt` | 1 | Output de comando, sin propósito | 🔴 REMOVE |

### D.2 Layer violations confirmadas en código

| Archivo | Import violado | Clasificación |
|---------|---------------|---------------|
| `src/lib/ai/display-name.ts:5` | `import { queryOne } from "@/lib/db/core/helpers"` | 🔴 REFACTOR |
| `src/lib/ai/ambiguity-interpreter.ts:14` | `import type { PlaceCandidate } from "@/lib/db/domains/geo"` | 🟡 REFACTOR |
| `src/lib/services/shared/lead-event-helpers.ts` | Survey→Lead acoplamiento | 🟡 REFACTOR |

### D.3 DB Zombie (columnas/tablas sin uso)

| ID | Hallazgo | Fuente | Clasificación |
|----|----------|--------|---------------|
| DBZ-01 | `driver_invitations` — tabla DDL pero sin INSERT en código | ARCHITECTURE_FINDINGS P1-5 | 🟡 REFACTOR — eliminar o documentar |
| DBZ-02 | `transfer_priority` — tabla DDL pero sin INSERT en código | ARCHITECTURE_FINDINGS P1-5 | 🟡 REFACTOR |
| DBZ-03 | 30+ columnas DDL nunca accedidas (geo-catastral, zones metadata, drivers) | ARCHITECTURE_FINDINGS P1-6 | 🟡 REFACTOR |
| DBZ-04 | `connection_cache` referenciado en `connection-state.ts:48` pero SIN CREATE TABLE | `connection-state.ts`, `schema.sql` | 🔴 BLOQUEANTE — runtime error en staging |
| DBZ-05 | `leads` table sin INSERT en código | ARCHITECTURE_FINDINGS P1-11 | 🟡 INVESTIGATE |
| DBZ-06 | `cancelled_at`/`cancelled_by` en DDL pero no en TypeScript | ARCHITECTURE_FINDINGS P1-12 | 🟡 REFACTOR |
| DBZ-07 | `ConversationRow.trip_status` en type pero no en DDL | ARCHITECTURE_FINDINGS P1-13 | 🟡 REFACTOR |

---

## SECCIÓN E — AUDITORÍA DE RUTAS Y FLUJOS

### E.1 API Routes

| Ruta | Propósito | Llamadas externas | Clasificación |
|------|-----------|-------------------|---------------|
| `POST /api/whatsapp/webhook` | Entry point principal | WhatsApp Cloud API | ✅ KEEP |
| `POST /api/bot/simulate` | Testing manual interno | — | 🟡 REFACTOR — evaluar si debe existir en prod |
| `GET /api/bot/conversations` | Dashboard admin | DB | ✅ KEEP |
| `GET /api/bot/conversations/[id]` | Detalle conversación | DB | ✅ KEEP |
| `GET /api/bot/messages/[id]` | Mensajes | DB | ✅ KEEP |
| `GET /api/bot/metrics` | Métricas dashboard | DB | ✅ KEEP |
| `GET /api/bot/metrics/cognitive` | Métricas cognitivas | DB | 🟡 INVESTIGATE — sin consumidor |
| `POST /api/bot/mode/[id]` | Cambiar modo conversación | DB | ✅ KEEP |
| `POST /api/bot/connection/status` | Estado conexión | DB | ✅ KEEP |
| `POST /api/bot/check-timeouts` | Timeouts | DB (endpoint manual) | 🟡 REFACTOR — duplicado de cron |
| `POST /api/cron/check-timeouts` | Timeouts automáticos | DB | ✅ KEEP |
| `POST /api/cron/recalculate-suggestions` | Learning suggestions | DB, learning | 🟡 INVESTIGATE — ¿necesario en v0? |
| `GET /api/sentry-test` | Testing Sentry | Sentry | 🟡 REFACTOR — solo dev |

### E.2 Duplicación de rutas

| Ruta 1 | Ruta 2 | Problema | Clasificación |
|--------|--------|----------|---------------|
| `POST /api/cron/check-timeouts` | `POST /api/bot/check-timeouts` | Misma funcionalidad, dos endpoints. Uno es cron, otro es manual. | 🟡 REFACTOR — unificar |

---

## SECCIÓN F — AUDITORÍA DE CALIDAD ALGORITMICA

| ID | Hallazgo | Archivo | Clasificación |
|----|----------|---------|---------------|
| **A-01** | CORE: determinista, función pura, sin side effects. 408 líneas con +15 patrones regex. Cobertura de tests alta. | `core.ts` | ✅ KEEP — bien diseñado |
| **A-02** | Handler: pipeline monolítico con múltiples responsabilidades. 27 imports, acoplamiento alto. | `handler.ts` | 🟡 REFACTOR |
| **A-03** | `feature-flags.ts`: 10 funciones, todas verifican `process.env.XXX === "true"`. 3 flags shadow leídas sin wrapper. | `feature-flags.ts` | 🟡 REFACTOR — unificar patrón |
| **A-04** | `response-builder.ts`: acoplamiento con OpportunityResult de Services (violación de capa) | `response-builder.ts` | 🟡 REFACTOR — DEBT-07 |
| **A-05** | LLM response: implementación correcta de fallback (Groq→Gemini→template). ADR-012 implementado. | `llm-provider.ts`, `fallback-provider.ts` | ✅ KEEP |
| **A-06** | Triple fallback usado correctamente en pricing, geo, extraction | Varios | ✅ KEEP |
| **A-07** | `database.ts`: 769 líneas, 63 funciones, demasiadas responsabilidades | `database.ts` | 🟡 REFACTOR — DEBT-04 |

---

## SECCIÓN G — AUDITORÍA DE INGENIERÍA CONVERSACIONAL Y UX

| ID | Hallazgo | Clasificación |
|----|----------|---------------|
| **UX-01** | Conversational Decision Algorithm certificado (ADR-013) con 15 invariantes. Especificación normativa de 1,026 líneas. | ✅ KEEP |
| **UX-02** | 3 desviaciones P0 del CDA (F01-DG, F02-DG, F03-DG) que corrompen el comportamiento conversacional. | 🔴 REDESIGN |
| **UX-03** | H-CAT2-001: RECOVERY state pierde slots confirmados — experiencia de usuario frustrante (repite preguntas) | 🔴 REDESIGN |
| **UX-04** | 4 principios UX documentados (P1: 1 dato/vez, P2: preservar contexto, P3: no repetir, P4: confirmar antes de ejecutar). Solo P2 tiene fallas activas. | ✅ KEEP |
| **UX-05** | CDA correctamente diseñado como máquina de estados con transiciones definidas. 8 estados conversacionales. | ✅ KEEP |
| **UX-06** | UX de Ambiguity: resolución automática sin confirmación en algunos casos (CAT-1 S13). | 🟡 REFACTOR — QA3-S3-04 |
| **UX-07** | Confirmación de usuario: criterio poco claro en RF-07. ¿Cuándo se confirma exactamente? | 🟡 REFACTOR — aclarar especificación |

---

## SECCIÓN H — AUDITORÍA DE ARQUITECTURA COGNITIVA

| Componente | Archivos | Líneas | Tests | Estado real | Clasificación |
|------------|----------|--------|-------|-------------|---------------|
| **Evidence Engine** (ADR-009) | 22 | 2,881 | 378 | ✅ Implementado, frozen, shadow mode descartado | 🔴 REDESIGN |
| **Memory** (ADR-010) | 7 | 533 | 45 | 🟡 Implementado, wiring existe pero flag false, sin efecto | 🟡 REFACTOR |
| **Pattern Discovery** (PR-7) | 12 | 2,040 | 3 | 🔴 Roto: bug parseo + tablas ausentes + prohibido activar | 🔴 REMOVE |
| **BKE** (ADR-012) | 10 | 1,234 | 4 | 🟡 Implementado, flags false, sin efecto | 🟡 INVESTIGATE |
| **DRL** (ADR-012) | 12 | 1,242 | 5 | 🟡 Implementado, flags false, sin efecto | 🟡 INVESTIGATE |
| **Cognitive Collector** | 4 | 525 | 0 | ❌ Sin propósito claro | 🔴 REMOVE |

### H.1 Recomendación de destino para capas cognitivas

| Capa | Opción recomendada | Justificación |
|------|-------------------|---------------|
| **Evidence Engine** | PRESERVAR pero simplificar. Extraer de src/lib/evidence/ a módulo independiente. Es código de calidad (378 tests, 7 capas bien diseñadas) pero no es producto. Debe ser opcional invocable. | REDESIGN |
| **Memory** | PRESERVAR en estado actual. Wiring existe. Solo falta activar flag cuando se necesite. | KEEP (con flag) |
| **Pattern Discovery** | **REMOVER** del branch principal. Mover a branch `experimental/cognitive-pattern-discovery`. Código roto + tablas ausentes = riesgo de activación accidental. | 🔴 REMOVE |
| **BKE/DRL** | PRESERVAR con flags false. Arquitectura correcta (ADR-012). Activar en staging para validación controlada. | KEEP (con flag) |
| **Cognitive Collector** | **REMOVER**. Sin propósito definido. Si se necesita en futuro, rediseñar desde cero con requerimientos claros. | 🔴 REMOVE |

---

## SECCIÓN I — AUDITORÍA DE BASE DE DATOS

### I.1 Métricas del schema

| Métrica | Valor |
|---------|-------|
| Tablas totales | 45 |
| Tablas con tags de fase (`f9_`, `f4_`) | 5 |
| Tablas referenciadas en código pero sin DDL | 1 (`connection_cache`) |
| Tablas con DDL pero sin INSERT en código | 2 (`driver_invitations`, `transfer_priority`) |
| Columnas DDL no accedidas | 30+ |
| Tablas cognitivas | 1 (`cognitive_memory_snapshots`) |
| Tablas `pd_*` en schema.sql | 0 (solo en código) |

### I.2 Hallazgos de BD

| ID | Hallazgo | Clasificación |
|----|----------|---------------|
| **DB-01** | `connection_cache` referenciado en `connection-state.ts:48` pero **NO EXISTE** en schema.sql. Runtime error garantizado en staging. | 🔴 BLOQUEANTE |
| **DB-02** | Tablas con tags de desarrollo: `f9_admin_commands`, `f9_drift_log`, `f9_error_log`, `f9_events`, `conversation_f4_log`. | 🟡 REFACTOR — P1-04 |
| **DB-03** | ADR-007 violado: Pattern Discovery crea tablas `pd_*` mediante `ensureSchema()` en lugar de schema.sql. Violación de SSOT. | 🔴 REFACTOR |
| **DB-04** | `driver_invitations` y `transfer_priority` tienen DDL pero **nunca se insertan datos**. | 🟡 REFACTOR |
| **DB-05** | 44 columnas `trip_status` en types.ts pero ausentes en DDL — inconsistencia código↔schema. | 🟡 REFACTOR |
| **DB-06** | `leads` table: sin INSERT en código. Tabla muerta. | 🟡 INVESTIGATE |
| **DB-07** | `data/bot.db.backup` — backup huérfano en repositorio | 🟡 REMOVE |

---

## SECCIÓN J — AUDITORÍA DOCUMENTAL

### J.1 Estado de ADRs

| ADR | Título | Estado | Implementado en código | Clasificación |
|-----|--------|--------|----------------------|---------------|
| **001** | Layered Architecture | ✅ ACCEPTED | Fundacional | ✅ KEEP |
| **002** | Database Facade Pattern | ✅ ACCEPTED | database.ts (monolito 769L) | 🟡 REFACTOR |
| **003** | Learning Domain Architecture | ✅ ACCEPTED | `services/learning/` (15 archivos) | ✅ KEEP |
| **004** | Service Boundary Rules | ✅ ACCEPTED | Parcial (3 violaciones activas) | 🟡 REFACTOR |
| **005** | AI-First Interpretation | ✅ ACCEPTED | Modificado por ADR-012 | 🟡 REFACTOR |
| **006** | Schema Parity | ✅ ACCEPTED | schema.sql SSOT. Violado por PD. | 🟡 REFACTOR |
| **007** | Conversation Interpreter | ✅ ACCEPTED | Implementado | ✅ KEEP |
| **008** | Conversational Decision Arch. | ✅ ACCEPTED | Freeze activo | ✅ KEEP |
| **009** | Evidence Engine Architecture | ✅ ACCEPTED | Frozen desde PR-3E. Sin consumidor real. | 🔴 REDESIGN |
| **010** | Cognitive Memory Architecture | ✅ ACCEPTED | IM-1: 7 archivos, sin efecto real | 🟡 REFACTOR |
| **011** | Elimination of Reflection Layer | ✅ ACCEPTED | Aplica a pipeline futuro | ✅ KEEP |
| **012** | Cognitive Escalation Principle | ✅ ACEPTADO | BKE/DRL implementados, flags false | 🟡 INVESTIGATE |
| **013** | Conversation Decision Algorithm | ✅ ACEPTADO | Normativo. Jerarquía establecida. | ✅ KEEP |

### J.2 Contradicciones documentales

| ID | Documento A | Documento B | Contradicción | Clasificación |
|----|-------------|-------------|--------------|---------------|
| **C-01** | PROJECT_CONTEXT.md (RF-08: ✅ Implementado) | CDA §6 (F01-DG: ❌ No implementado) | RF-08 dice implementado pero CDA dice que falla | 🔴 REDESIGN |
| **C-02** | PROJECT_CONTEXT.md (RF-09: ✅ Implementado) | CDA §7 (F02-DG, F03-DG: ❌ No implementado) | RF-09 dice implementado pero CDA dice que falla | 🔴 REDESIGN |
| **C-03** | H0A (Memory sin wiring) | `lead.service.ts:93-99` (Memory SÍ está wired) | H0A desactualizado — memory ya tiene wiring | 🟡 REFACTOR — actualizar doc |
| **C-04** | ADR-005 (AI-First) | ADR-012 (Knowledge-First) | ADR-012 modifica parcialmente ADR-005. Documentado pero confuso. | 🟡 REFACTOR — clarificar |
| **C-05** | ARCHITECTURE_BASELINE.json | metrics.json | Archivos idénticos (6765B c/u) | 🟡 REMOVE — uno sobra |

### J.3 Documentación obsoleta o redundante

| Documento | Problema | Clasificación |
|-----------|----------|---------------|
| `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE_FREEZE_V1.md` | Superseded por INTERFACE_FREEZE_V2.md | 🟡 KEEP (histórico) |
| `docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md` | Superseded por INTERFACE_FREEZE_V2.md | 🟡 KEEP (histórico) |
| `docs/architecture/ARCHITECTURE_BASELINE.json` | Duplicado idéntico de metrics.json | 🟡 REMOVE |
| `ael/archive/` (6 documentos) | Diseño legacy del harness | 🟡 KEEP (histórico) |
| `docs/certification/` (78 documentos) | Muchos son de auditorías anteriores. Algunos pueden estar desactualizados. | 🟡 INVESTIGATE |

---

## SECCIÓN K — AUDITORÍA DE EVOLUCIÓN DEL CÓDIGO

| ID | Hallazgo | Etapa origen | Se volvió permanente | Clasificación |
|----|----------|-------------|---------------------|---------------|
| **E-01** | Tablas `f9_*` y `f4_*` con tags de fase en producción | Tags de desarrollo (fase 9, fase 4) | Sí — se mantienen en schema.sql | 🟡 REFACTOR — renombrar |
| **E-02** | Dual pricing engine v2 + v3 coexistente | v2 original, v3 refactor | Sí — v2 no se eliminó | 🟡 REFACTOR — eliminar v2 |
| **E-03** | i18n inline en 30+ bloques if/else | Solución temporal | Sí — nunca se migró completamente | 🟡 REFACTOR — completar migración |
| **E-04** | Evidence Engine originalmente diseñado como producto, ahora en shadow | Arquitectura original | Sí — pero sin consumidor real | 🔴 REDESIGN |
| **E-05** | `.limpiar` (hard reset) como comando de desarrollo en producción | Herramienta de testing | Sí — expuesto en webhook | 🔴 REMOVE |
| **E-06** | Pattern Discovery diseñado como pipeline futuro, implementado parcialmente | Diseño conceptual | Sí — 12 archivos implementados pero rotos | 🔴 REMOVE |
| **E-07** | `database.ts` (769L) — fachada que creció por acumulación | Fundacional | Sí — nunca se fragmentó | 🟡 REFACTOR |
| **E-08** | `lead.service.ts` (335L) — god orchestrator por acumulación | Fundacional | Sí — parcialmente extraído en workflow/ | 🟡 REFACTOR |
| **E-09** | `package.json: "taxiguazu-bot"` — nombre original nunca actualizado | Fundacional | Sí | 🟡 REFACTOR |
| **E-10** | 13 archivos con "ARCHITECTURE NOTE Phase D" | Fase D del desarrollo | Sí | 🟡 REFACTOR — limpiar |

---

## SECCIÓN L — SÍNTESIS Y CLASIFICACIÓN GLOBAL

### L.1 Resumen por clasificación

| Clasificación | Cantidad | Descripción |
|---------------|----------|-------------|
| **✅ KEEP** | ~15 | Componentes que forman parte del producto AITOS y están correctamente implementados |
| **🟡 REFACTOR** | ~22 | Código válido pero necesita mejora estructural |
| **🔴 REDESIGN** | ~8 | El diseño actual no cumple su propósito o tiene desviaciones funcionales |
| **🔴 REMOVE** | ~10 | Código que no debería estar en el producto |
| **🟡 INVESTIGATE** | ~5 | Requiere decisión arquitectónica sobre su destino |

### L.2 Clasificación por archivo/directorio (ejecutable por BUILD)

| Path | Clasificación | Acción |
|------|---------------|--------|
| `src/lib/services/` (workflow, extraction, dispatch, pricing, geo, admin, trip-execution, i18n) | ✅ KEEP | Núcleo del producto |
| `src/lib/services/learning/` | 🟡 INVESTIGATE | Decidir si es producto o experimental |
| `src/lib/services/memory/` (context-memory, memory, predictive-routing) | ✅ KEEP | Contexto conversacional, necesario |
| `src/lib/ai/` (core, handler, router, policies, llm, etc.) | ✅ KEEP | Núcleo del producto |
| `src/lib/ai/display-name.ts` | 🔴 REFACTOR | Layer violation AI→DB |
| `src/lib/ai/ambiguity-interpreter.ts` | 🟡 REFACTOR | Layer violation AI→DB (tipo) |
| `src/lib/db/` | ✅ KEEP (con refactor de database.ts) | Núcleo del producto |
| `src/lib/sender.ts` | ✅ KEEP | Envío de mensajes |
| `src/lib/pipeline.ts` | ✅ KEEP | Pipeline de ejecución |
| `src/lib/detect-lang.ts` | ✅ KEEP | Detección de idioma |
| `src/lib/timeouts.ts` | ✅ KEEP | Timeouts de operaciones |
| `src/lib/check-timeouts-handler.ts` | ✅ KEEP | Handler de timeouts |
| `src/lib/auth.ts` | ✅ KEEP | Autenticación |
| `src/lib/utils/` | ✅ KEEP | Utilidades |
| `src/lib/evidence/` (22 archivos) | 🔴 REDESIGN | Decidir: extraer a módulo o simplificar |
| `src/lib/memory/` (7 archivos, ADR-010) | 🟡 REFACTOR | Preservar, wiring existe, solo falta activar |
| `src/lib/pattern-discovery/` (12 archivos) | 🔴 REMOVE | Extraer a branch experimental |
| `src/lib/bke/` (10 archivos) | 🟡 INVESTIGATE | Decidir activación en staging |
| `src/lib/drl/` (12 archivos) | 🟡 INVESTIGATE | Decidir activación en staging |
| `src/lib/cognitive/` (4 archivos) | 🔴 REMOVE | Sin propósito claro |
| `src/lib/dev/hard-reset.ts` | 🔴 REMOVE | Código de desarrollo en producto |
| `src/config/feature-flags.ts` | 🟡 REFACTOR | Unificar patrón de wrappers |
| `src/app/api/bot/simulate` | 🟡 REFACTOR | Evaluar necesidad en producción |
| `src/app/api/sentry-test` | 🟡 REMOVE | Solo desarrollo |
| `src/app/api/bot/check-timeouts` | 🟡 REFACTOR | Duplicado de cron endpoint |
| `src/app/api/bot/metrics/cognitive` | 🟡 REMOVE | Sin consumidor real |
| `ael/archive/` (6 archivos) | 🟢 KEEP | Histórico |
| `scripts/archive/` (12 archivos) | 🟢 KEEP | Histórico |
| `docs/architecture/ARCHITECTURE_BASELINE.json` | 🟡 REMOVE | Duplicado de metrics.json |
| `data/bot.db.backup` | 🟡 REMOVE | Backup huérfano |
| `scripts/dump-output.txt` | 🔴 REMOVE | Archivo huérfano |
| Archivo corrupto en raíz | 🔴 REMOVE | Archivo corrupto |
| `.temp/chats_reales.txt` | 🔴 REMOVE | Datos potencialmente sensibles |

### L.3 Prioridades de ejecución recomendadas

#### 🔴 PRIORIDAD 0 — CORREGIR AHORA (bloquea certificación + staging)

| Item | Acción | Dependencia |
|------|--------|-------------|
| P0-01 | **F01-DG**: Ambiguity verifica clarify_field (lead.service.ts) | — |
| P0-02 | **F02-DG**: Preservar intención BOOKING (core.ts:277-283) | — |
| P0-03 | **F03-DG**: Merge con ambigüedad activa | — |
| P0-04 | **H-CAT2-001**: RECOVERY preserve slots | — |
| P0-05 | **connection_cache**: Agregar CREATE TABLE a schema.sql | — |
| P0-06 | **ADMIN_API_KEY**: Rotar en todos los entornos | — |
| P0-07 | **SENTRY_DSN**: Configurar en Vercel | — |
| P0-08 | **Archivo corrupto**: Eliminar de raíz | — |
| P0-09 | **`.temp/chats_reales.txt`**: Eliminar o asegurar | — |

#### 🔴 PRIORIDAD 1 — CORREGIR PRONTO (afecta calidad del producto)

| Item | Acción | Dependencia |
|------|--------|-------------|
| P1-01 | Re-ejecutar CAT-1 y CAT-2 post-correcciones | P0-01 a P0-04 |
| P1-02 | **Evidence Engine**: Decidir destino arquitectónico | Decisión de PLAN |
| P1-03 | **Pattern Discovery**: Mover a branch experimental | Decisión de PLAN |
| P1-04 | **Cognitive collector**: Eliminar | — |
| P1-05 | **hard-reset.ts**: Eliminar del pipeline de producción | — |
| P1-06 | **Layer violation**: display-name.ts → services | — |
| P1-07 | **Dual pricing**: Eliminar v2 | — |
| P1-08 | **Tablas f9_*/f4_***: Renombrar | — |
| P1-09 | **scripts/dump-output.txt**: Eliminar | — |
| P1-10 | **ARCHITECTURE_BASELINE.json**: Eliminar duplicado | — |
| P1-11 | **data/bot.db.backup**: Eliminar o mover | — |

#### 🟡 PRIORIDAD 2 — PLANIFICAR EN SPRINTS

| Item | Acción |
|------|--------|
| P2-01 | Fragmentar database.ts (P2, DEBT-04) |
| P2-02 | Refactor lead.service.ts (P2, DEBT-05) |
| P2-03 | Eliminar dependencia survey→lead (P1-03, DEBT-02) |
| P2-04 | Completar migración i18n (P2, DEBT-06) |
| P2-05 | Eliminar acoplamiento AI→Services response-builder (P2, DEBT-07) |
| P2-06 | Fragmentar policy-pipeline.ts (P2, DEBT-08) |
| P2-07 | Cobertura de tests para Survey y Admin (P3) |
| P2-08 | Eliminar columnas zombie de BD |
| P2-09 | Seed de choferes en Turso (P0-04) |
| P2-10 | Alinear nombre package.json con producto AITOS |
| P2-11 | Consolidar dual endpoint de check-timeouts |

---

## SECCIÓN M — CONCLUSIÓN

### M.1 Estado del producto AITOS

**AITOS como producto funcional** tiene un núcleo sólido:
- Pipeline conversacional correctamente diseñado (CORE→Router→Policies→Response)
- 10 RFs implementados funcionalmente
- 1653/1657 tests PASS
- Build OK, contratos OK
- CDA certificado como norma arquitectónica

**AITOS como repositorio** tiene problemas estructurales significativos:
- ~25.7% del código (6,717 líneas en 45 archivos) corresponde a capas experimentales sin impacto en el producto (Evidence Engine, Memory, Pattern Discovery, BKE, DRL, Cognitive, Dev)
- 4 desviaciones funcionales P0 bloquean la certificación CAT-1/CAT-2
- 1 bug de BD bloqueante (connection_cache)
- Capas experimentales mezcladas con código de producto sin separación clara

### M.2 Recomendación estratégica

1. **Separar quirúrgicamente** AITOS (el producto) de sus capas experimentales. El producto real ocupa ~74% del código fuente (~19,200 líneas). El 26% restante son experimentos arquitectónicos.

2. **Corregir los 4 defectos funcionales P0** antes de cualquier otro cambio. Son la única brecha real entre el sistema y su especificación normativa certificada (CDA).

3. **Resolver el bug connection_cache** antes de cualquier deploy a staging.

4. **Tomar una decisión arquitectónica vinculante** sobre el Evidence Engine: es código de alta calidad (378 tests) pero sin función en el producto. ¿Se extrae como biblioteca independiente? ¿Se simplifica? ¿Se elimina?

5. **Mantener BKE/DRL con flags false** — son la implementación correcta de ADR-012 y deben activarse progresivamente en staging.

6. **No iniciar desarrollo de nuevas funcionalidades** hasta que CAT-1 y CAT-2 estén CERTIFIED.

### M.3 Veredicto final

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   AITOS — AUDITORÍA SISTÉMICA                                       │
│                                                                     │
│   Build:                         ✅ PASS                            │
│   Tests:                         ✅ 1653/1657 (99.8%)              │
│   Contratos R1-R4:               ✅ PASS                            │
│   Arquitectura:                  🟡 CONDITIONAL                     │
│   CDA Compliance:                ❌ 4 desviaciones P0               │
│   Capas experimentales:          🔴 26% del código sin propósito    │
│   Identidad del sistema:         🟡 CONFUSA — producto vs ecosistema│
│   Higiene del repositorio:       🟡 3 archivos huérfanos/corruptos │
│   Preparación para staging:      ❌ BLOQUEADO (4 P0 funcionales +  │
│                                    4 P0 operacionales)              │
│   Certificación funcional:       🟡 CONDITIONAL                     │
│                                                                     │
│   CLASIFICACIÓN GLOBAL:          🟡 CONDITIONAL                     │
│   ────────────────────────       ──────────────                     │
│   El producto base es sólido. El repositorio necesita limpieza.    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Fin del reporte de auditoría — BUILD (ARNÉS Director / AEL) — 2026-07-20*
