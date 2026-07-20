# CHANGELOG — AITOS
## 2026-07-08 onward

---

## 2026-07-20 (current)

### BUILD-AUDIT-1 — System Audit Execution & Code Hygiene
- **Tipo**: Auditoría sistémica + higiene de código — ejecución del plan de auditoría completo
- **Resumen**: Se ejecutó la auditoría sistémica completa de AITOS generando `docs/audit/AUDIT_REPORT_COMPLETE.md` (~60 hallazgos clasificados). Validación cruzada contra código fuente: 56/60 hallazgos confirmados exactos, 4 inexactitudes menores corregidas. Se definió y ejecutó plan de 6 olas: **OLA 0** (higiene): eliminación de 4 archivos huérfanos (archivo corrupto, dump-output.txt, bot.db.backup, ARCHITECTURE_BASELINE.json duplicado). **OLA 4** (decisiones arquitectónicas): ADR-014 creado con 5 decisiones hacia código higiénico — Evidence Engine KEEP (shadow mode), Pattern Discovery REMOVE, BKE/DRL REMOVE, cognitive collector KEEP, hard-reset PROTECT. 34 archivos eliminados (~5,800 líneas de código muerto). **OLA 1** (corrección funcional P0): F01-DG (ambiguity verifica clarify_field+roleLock según CDA §6), F02-DG (intención preservada según CDA §7), F03-DG (merge antes de ambigüedad según CDA §2 paso 7), H-CAT2-001 (RECOVERY preserva slots confirmados). **OLA 3** (bloqueos ops): connection_cache agregado a schema.sql, seed ejecutado. **OLA 5** (limpieza estructural): layer violation display-name.ts eliminada (movido a services/), endpoint duplicado /api/bot/check-timeouts eliminado. **Validación**: 0 errores TypeScript en src/, contratos AEL PASS, build compila.
- **Documentos creados**: `docs/adr/014-experimental-layers-hygiene.md` (nuevo, ADR con 5 decisiones), `docs/audit/AUDIT_REPORT_COMPLETE.md` (nuevo, ~60 hallazgos), `src/lib/services/shared/display-name-service.ts` (nuevo, layer compliance)
- **Archivos modificados**: `src/lib/services/lead.service.ts` (F01-DG, F03-DG), `src/lib/ai/core.ts` (F02-DG), `src/lib/services/extraction/comprehension-runner.ts` (H-CAT2-001), `src/lib/dev/hard-reset.ts` (DEV_MODE_ENABLED guard), `src/lib/ai/handler.ts` (imports BKE/DRL removidos), `src/lib/ai/ambiguity-interpreter.ts` (imports BKE removidos), `src/lib/services/workflow/policy-pipeline.ts` (import display-name corregido), `src/config/feature-flags.ts` (BKE/DRL deprecated), `src/config/env.ts` (comentarios pattern-discovery), `schema/schema.sql` (+connection_cache), `docs/architecture/ADR_INDEX.md` (+ADR-014)
- **Archivos eliminados**: `src/lib/pattern-discovery/` (12 archivos, 2,040 líneas), `src/lib/bke/` (10 archivos, 1,234 líneas), `src/lib/drl/` (12 archivos, 1,242 líneas), `src/lib/ai/display-name.ts` (movido a services/), `src/app/api/bot/check-timeouts/` (duplicado), `tests/unit/pattern-discovery/` (3 tests), `tests/bke/` (directorio), `tests/services/bke-*.test.ts` (4 tests), `tests/services/drl-*.test.ts` (6 tests), `tests/ai/*drl*.test.ts` (2 tests), archivos huérfanos de raíz (4)
- **Validación**: src/ 0 errores TypeScript ✅, contratos AEL PASS ✅, seed ejecutado ✅

## 2026-07-19

### PR-SDL-4A — Project Context Layer
- **Tipo**: Capa cognitiva documental — condensación del estado del proyecto en un único documento
- **Resumen**: Se crea `docs/project/PROJECT_CONTEXT.md` como nueva capa cognitiva para el ecosistema. Su función es condensar el estado vigente del proyecto para que PLAN/SDL comprenda el estado global leyendo un solo documento. NO reemplaza ADR, SPEC, RF, RNF, Baseline, Architecture, Knowledge ni Changelog. Contiene 14 secciones: identidad del proyecto, estado actual, objetivo vigente, misión activa, baseline actual, estado arquitectónico (incluyendo Interface Freeze V2 y contrato PLAN↔BUILD), 10 RF conocidos con desviaciones, 9 RNF, 7 riesgos, deuda técnica completa (bloqueante, funcional, estructural, H0A), incidentes abiertos (H-CAT2-001), certificaciones (estado general + milestones), knowledge consolidado (decisiones clave + patrones del ecosistema), próximo objetivo. Incluye reglas de mantenimiento (cuándo se actualiza, qué lo dispara, qué NO se actualiza, formato). Sin cambios de código, configuración ni prompts funcionales.
- **Documentos creados**: `docs/project/PROJECT_CONTEXT.md` (nuevo, 14 secciones + reglas de mantenimiento)
- **Archivos modificados**: `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D81)
- **Validación**: Sin cambios de código, configuración o prompts — únicamente documentación. PROJECT_CONTEXT.md no reemplaza ningún documento existente. 0 impacto en comportamiento del ecosistema.

### PR-SDL-AEL-CONTRACT-1 — Strategic Thinking vs Operational Execution Contract
- **Tipo**: Contrato arquitectónico — formalización definitiva de la separación cognitiva PLAN ↔ BUILD
- **Resumen**: Se crea `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` como contrato formal que define con precisión los tipos de información que consume y produce cada fase. Principio fundamental: PLAN consume conocimiento, produce decisiones; BUILD consume decisiones, produce evidencia. Se definen: tipos de información (conocimiento, decisión, evidencia), contrato de PLAN (4 secciones: qué conoce, qué hace, qué produce, qué nunca hace), contrato de BUILD (5 secciones: qué recibe, qué nunca hace, qué sí puede hacer, qué produce, reglas de transformación de información). Flujo oficial documentado con ciclo continuo hasta Mission Complete. Casos permitidos y prohibidos en tabla resumen. 10 invariantes SO-01 a SO-10. Relación explícita con Mission Closure Contract y Mission Phase Architecture. Sección de certificación con 10 criterios. Sin cambios de código, configuración ni prompts funcionales.
- **Documentos creados**: `docs/architecture/STRATEGIC_OPERATIONAL_CONTRACT.md` (nuevo, 14 secciones, 10 invariantes SO-01 a SO-10, reemplaza interpretaciones anteriores de la relación PLAN ↔ BUILD)
- **Archivos modificados**: `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D80)
- **Validación**: Sin cambios de código, configuración o prompts — únicamente documentación arquitectónica. 10 invariantes SO-01 a SO-10 definidos. Certificación completa con 10 criterios.

### PR-INTERFACE-FREEZE-1 — PLAN/BUILD Interface Consolidation
- **Tipo**: Interface Freeze V2 — consolidación definitiva del ecosistema en solo 2 interfaces visibles
- **Resumen**: Se reemplaza el modelo de doble capa (PR-HARNESS-UX-1) por una arquitectura donde solo PLAN y BUILD son visibles. Strategic Director y AEL pasan a ser implementaciones internas de PLAN y BUILD respectivamente. Se crean `.opencode/agents/plan.md` (basado en SDL) y `.opencode/agents/build.md` (basado en AEL) como overrides de los built-in de OpenCode. Se eliminan `strategic-director` y `ael` de `opencode.json`. `default_agent` pasa a `"plan"`. Se eliminan los archivos `strategic-director.md` y `ael.md`. Los 6 subagentes `ael-*` se preservan intactos como implementación interna de BUILD. Contratos arquitectónicos (SPEC, CONTRATS, MISSION_PHASE_ARCHITECTURE, MISSION_CLOSURE_CONTRACT) no modificados. V-01 a V-10 verificados sin regresiones.
- **Documentos creados**: `.opencode/agents/plan.md` (nuevo, basado en SDL), `.opencode/agents/build.md` (nuevo, basado en AEL), `docs/architecture/INTERFACE_FREEZE_V2.md` (nuevo, 7 invariantes IF-01 a IF-07)
- **Archivos modificados**: `opencode.json` (reestructuración completa), `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D79)
- **Archivos eliminados**: `.opencode/agents/strategic-director.md` (reemplazado por plan.md), `.opencode/agents/ael.md` (reemplazado por build.md)
- **Validación**: V-01 ✅ plan/build únicos primaries, V-02 ✅ plan edit:deny/bash:deny, V-03 ✅ build edit:ask/bash:ask + 6 subagentes, V-04 ✅ default_agent=plan, V-05 ✅ SDL/AEL eliminados, V-06 ✅ agent files legacy eliminados, V-07 ✅ 6 subagentes preservados, V-08 ✅ plan.md/build.md creados, V-09 ✅ contratos arquitectónicos no modificados, V-10 ✅ subagentes inalterados

### PR-HARNESS-UX-1 — Dual Interface Architecture
- **Tipo**: Arquitectura de doble capa — restauración de AEL como interfaz visible del ecosistema
- **Resumen**: Se formaliza la arquitectura de doble capa: PLATAFORMA (PLAN, BUILD — capacidades nativas de OpenCode) y ECOSISTEMA DE DESARROLLO (Strategic Director, AEL — interfaces del ecosistema AITOS). AEL restaurado a `mode: "primary"` para que aparezca como interfaz visible en el selector, junto a SDL, PLAN y BUILD. V-01: SDL y AEL son las únicas interfaces del ecosistema. V-02: PLAN y BUILD continúan siendo exclusivamente capacidades de OpenCode (inalteradas). V-03: No existe duplicación de responsabilidades — cada interfaz tiene rol, permisos y prompts diferentes. V-04: Restaurar AEL a primary no altera contratos, prompts, dispatch, subagentes ni pipeline (el cambio es solo de interfaz). V-05: Documento DUAL_INTERFACE_ARCHITECTURE.md creado con modelo de doble capa, 6 invariantes DI-01 a DI-06.
- **Documentos creados**: `docs/architecture/DUAL_INTERFACE_ARCHITECTURE.md` (nuevo, 11 secciones, 6 invariantes)
- **Archivos modificados**: `opencode.json` (1 línea: `ael.mode` subagent → primary), `.opencode/agents/ael.md` (1 línea: `mode` subagent → primary), `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D78)
- **Validación**: V-01 ✅ SDL y AEL únicos custom primaries, V-02 ✅ PLAN/BUILD inalterados, V-03 ✅ 0 superposición, V-04 ✅ 0 cambios funcionales, V-05 ✅ Documento creado

### PR-ARCH-1 — Development Ecosystem Architecture Freeze v1.0
- **Tipo**: Congelamiento arquitectónico — freeze del ecosistema de desarrollo
- **Resumen**: Auditoría completa V-01 a V-06 del ecosistema PLAN → BUILD. V-01: 0 contradicciones entre todos los documentos arquitectónicos. V-02: 0 componentes eliminables — SDL, AEL, Mission Phase, Mission Closure, Harness Alignment son todos necesarios. V-03: SRP verificado — cada componente tiene una responsabilidad única. V-04: OpenCode provee el runtime, el ecosistema provee la arquitectura — decoupling limpio. V-05: 4 ítems de deuda técnica documentados (R-01 a R-04). V-06: Ready para freeze. Se creó `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE_FREEZE_V1.md` (10 secciones, 19 invariantes congelados: 6 MP + 7 MC + 6 SD-I). Freeze declarado: ningún contrato arquitectónico del ecosistema de desarrollo puede modificarse sin un nuevo freeze.
- **Documentos creados**: `docs/architecture/DEVELOPMENT_ECOSYSTEM_ARCHITECTURE_FREEZE_V1.md` (nuevo, 10 secciones, veredicto: ✅ FREEZE DECLARADO)
- **Validación**: Solo documentación — 0 cambios de código, 0 cambios de configuración, build y tests no afectados

### PR-HARNESS-ALIGNMENT-3 — PLAN Mode vs Strategic Director Visibility Audit
- **Tipo**: Auditoría de visibilidad — origen de PLAN, BUILD y Strategic Director en el selector de OpenCode
- **Resumen**: Auditoría completa para determinar por qué PLAN y Strategic Director aparecen simultáneamente. V-01: OpenCode construye el selector desde 2 fuentes (agentes nativos + agentes personalizados primary). V-02: PLAN es un agente nativo de OpenCode (built-in), no una abstracción del ecosistema. V-03: Strategic Director aparece por tener `mode: "primary"` en `opencode.json`. V-04: NO es posible eliminar Strategic Director sin perder la arquitectura PLAN → BUILD (default_agent, Execution Plan, delegación AEL, contratos). V-05: Ocultarlo no es viable (hidden solo funciona en subagentes). V-06: No existe duplicación real — PLAN (nativo, permisos `ask`, sin contratos) y SDL (custom, permisos `deny`, con contratos PLAN→BUILD) son agentes diferentes. V-07: Opción recomendada: aceptar la coexistencia + mejorar descripción de SDL. 0 cambios de código o configuración.
- **Documentos creados**: `docs/certification/PLAN_MODE_VISIBILITY_AUDIT.md` (nuevo, 10 secciones, V-01 a V-07 auditados)
- **Validación**: Solo documentación — 0 cambios de código, 0 cambios de configuración, build y tests no afectados

### PR-HARNESS-ALIGNMENT-2 — Convert AEL into Pure Operational Subagent
- **Tipo**: Alineación arquitectónica — eliminación del modo AEL como agente primary
- **Resumen**: AEL convertido de `mode: "primary"` a `mode: "subagent"` en `opencode.json` y `.opencode/agents/ael.md`. Descripción actualizada de "orquesta pipeline de 7 fases" a "motor operacional de BUILD". PLAN y BUILD son ahora los únicos modos visibles. El ecosistema refleja exactamente la arquitectura certificada: SDL (modo único visible) → task → AEL (subagente) → task → 6 subagentes. Sin modificar prompts, pipeline, subagentes, contratos ni permisos. V-01 a V-07 verificados sin regresiones.
- **Archivos modificados**: `opencode.json` (2 líneas: `mode` + `description`), `.opencode/agents/ael.md` (2 líneas: `description` + `mode`), `docs/certification/HARNESS_ALIGNMENT_IMPLEMENTATION.md` (nuevo), `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D75)
- **Validación**: V-01 ✅ SDL → AEL task intacto, V-02 ✅ BUILD idéntico, V-03 ✅ 6 subagentes inalterados, V-04 ✅ sin nuevos modos, V-05 ✅ SDL único primary, V-06 ✅ BUILD único operacional, V-07 ✅ 0 regresiones

### PR-HARNESS-ALIGNMENT-1 — Harness Mode Alignment & Execution Visibility Audit
- **Tipo**: Auditoría de viabilidad técnica — alineación del arnés con arquitectura PLAN → BUILD
- **Resumen**: Auditoría completa de viabilidad técnica para eliminar AEL como modo visible y alinear el arnés con la arquitectura PLAN → BUILD. V-01: OpenCode expone modos vía `mode: "primary"` en `opencode.json`. V-02: La única dependencia del modo AEL es el ID del agente (`ael`), no su `mode`. V-03: SDL puede invocar AEL vía `task` incluso si AEL es subagente. V-04: El arnés ya produce agente activo, tool calls, resultados y errores. V-05: Toda esa información es metadata del arnés, no consume tokens. V-06: Propuesta mínima de Execution Visibility con agente activo, tarea, estado y completado — sin reasoning ni chain of thought.
- **Veredicto**: ✅ IMPLEMENTABLE. 2 líneas de cambio (`mode: "primary"` → `"subagent"` en `opencode.json` y `ael.md`). Sin modificar arquitectura, pipeline, prompts, subagentes ni permisos. Sin aumento de consumo de tokens.
- **Documentos creados**: `docs/certification/HARNESS_ALIGNMENT_AUDIT.md` (nuevo, 9 secciones, 6 verificaciones, propuesta de Execution Visibility)
- **Documentos modificados**: `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D74)
- **Validación**: Solo documentación — 0 cambios de código, build y tests no afectados

### PR-SDL-3B — Mission Closure & Learning Trigger Contract
- **Tipo**: Contrato arquitectónico — formalización de cierre de misión y trigger de Learning
- **Resumen**: Se creó `docs/architecture/MISSION_CLOSURE_CONTRACT.md` como contrato formal que determina cuándo y cómo Learning puede ejecutarse dentro del modelo PLAN → BUILD. Auditoría V-01 a V-05 completada: Learning actualmente se ejecuta sin contrato formal (V-01), cualquier evento puede dispararlo (V-02), no existe contrato de cierre (V-03), Learning puede ejecutarse múltiples veces durante una misión (V-04), el nuevo contrato no contradice ADRs existentes (V-05). Se definen 2 estados de misión (IN PROGRESS, CLOSED), contrato de cierre con SDL como único responsable, 7 invariantes (MC-01 a MC-07), condiciones de activación y NO activación de Learning, y workflow completo. 0 cambios de código. 0 modificaciones a capacidades existentes.
- **Documentos creados**: `docs/architecture/MISSION_CLOSURE_CONTRACT.md` (nuevo, 12 secciones, 7 invariantes, auditoría V-01 a V-05)
- **Documentos modificados**: `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D73)
- **Validación**: Solo documentación — 0 cambios de código, build y tests no afectados

### PR-SDL-3A — Mission Phase Architecture Contract Implementation
- **Tipo**: Contrato arquitectónico — implementación de fases PLAN → BUILD
- **Resumen**: Implementación del contrato cognitivo PLAN → BUILD. Se creó `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` como documento canónico del nuevo modelo de 2 fases. Se actualizó el prompt del **Strategic Director** para exigir el bloque de cierre obligatorio (Recommendation + Execution Plan + Execution Status). Se actualizó el prompt del **AEL** para reflejar el rol BUILD: recibe Execution Plan → descompone → ejecuta → cierra, con nuevas reglas R4 (no redefinir objetivos del EP) y R5 (no generar nuevo EP estratégico). Se clarificó la **SPEC** §2: la soberanía del Director está acotada por el Execution Plan del SDL, y se agregó sección de relación SDL↔AEL. Se actualizó **ORGANIZATION** para distinguir Product Strategy (SDL) de Execution Strategy (AEL). 0 cambios de código. 0 modificaciones a opencode.json o subagentes.
- **Documentos creados**: `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` (nuevo, 10 secciones, 6 invariantes)
- **Documentos modificados**: `.opencode/agents/strategic-director.md` (+formato de cierre obligatorio), `.opencode/agents/ael.md` (+workflow BUILD, +R4/R5), `ael/constitution/SPEC.md` (+acotación de soberanía, +relación SDL), `ael/government/ORGANIZATION.md` (+Product Strategy / Execution Strategy), `docs/project/CHANGELOG.md` (esta entrada), `docs/project/PROJECT_BOARD.md` (+D72)
- **Validación**: Solo documentación — 0 cambios de código, build y tests no afectados

## 2026-07-18

### PR-VERIFY-SDL — Strategic Director Layer Verification
- **Tipo**: Auditoría de certificación — verificación del SDL
- **Resumen**: Auditoría completa de la implementación del Strategic Director Layer sobre el arnés AITOS. 5 verificaciones (V-01 a V-05) con veredicto ✅ IMPLEMENTACIÓN CORRECTA. V-01: `ael` clasificado como orquestador operacional / Mission Planner, no como agente base ni wrapper. V-02: `ael` usa Current Session Model por omisión histórica (nunca tuvo modelo asignado). V-03: Strategic Director configurado exclusivamente para planificación pura (sin permisos edit/bash, única delegación a `ael`, prohibiciones explícitas documentadas). V-04: 6 agentes especializados preservan sus modelos hardcodeados originales. V-05: `ael` no constituye excepción a la regla — es orquestador operacional, no planificador estratégico. Diagrama de responsabilidades (3 capas: SDL → AEL → Subagentes), flujo de ejecución documentado. 4 hallazgos pre-existentes documentados (H-01 a H-04): nomenclatura inconsistente entre `ael.md` y `opencode.json`, comandos desalineados, `ael/AGENTS.md` faltante, `ael` sin modelo explícito. No se modificó código — solo auditoría.
- **Documentos generados/modificados**: `docs/certification/PR_VERIFY_STRATEGIC_DIRECTOR_LAYER.md` (nuevo, certificación completa)
- **Validación**: Build ✅ (40.1s), Contratos R1-R4 PASS ✅, no se modificó código de producción

### PR-SDL-2 — Strategic Director Layer Contract Certification
- **Tipo**: Certificación de contrato arquitectónico
- **Resumen**: Certificación completa del Strategic Director Layer como **rol cognitivo** (no modelo específico). 8 verificaciones (V-01 a V-08) con veredicto ✅ CERTIFICADO. V-01: SD descrito como rol en archivos vivos (hallazgo: reporte de implementación obsoleto con 4 referencias a `GPT-5.4 mini`). V-02: Responsabilidades limitadas a análisis/planificación — 6 responsabilidades positivas, 7 prohibiciones, matriz de permisos consistente. V-03: Current Session Model como **decisión arquitectónica consciente** (referencia explícita en prompt línea 62 + omisión intencional de campo `model`). V-04: Delegación exclusiva al AEL (`task: { "*": "deny", "ael": "allow" }`). V-05: 6/6 subagentes con modelos hardcodeados originales inalterados. V-06: Auditoría de opencode.json — 4 preguntas respondidas sobre Current Session Model, riesgos documentados. V-07: Contrato formal **StrategicDirectorContract v1.0** propuesto con 9 elementos contractuales. V-08: 6 escenarios de ruptura evaluados — 0 rupturas arquitectónicas. **StrategicDirectorContract v1.0** formalizado con: nombre, 6 responsabilidades, 7 prohibiciones, 5 entradas, 2 salidas, 6 invariantes (SD-I1 a SD-I6), 4 dependencias, política de delegación y política de escalamiento. 4 hallazgos documentados (R-01 a R-04, incluyendo R-01 como nuevo: reporte de implementación obsoleto).
- **Documentos generados/modificados**: `docs/certification/SDL_CONTRACT_CERTIFICATION.md` (nuevo, certificación de contrato completa)
- **Validación**: Build ✅, Contratos R1-R4 PASS ✅, no se modificó código de producción

## 2026-07-17

### PR-CDA1 — Conversation Decision Algorithm
- **Tipo**: Definición algorítmica normativa
- **Resumen**: Se creó `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` como la especificación normativa del comportamiento conversacional de AITOS. El algoritmo sintetiza FUNCTIONAL_BEHAVIOR_SPECIFICATION.md, Conversation Playbook, Principios AITOS LAB, QA1, QA2, QA2B, QA3-S2B, ADR-007, ADR-008 y ADR-012 en un pipeline de 11 pasos con 15 invariantes verificables (I-01 a I-15). 11 secciones: objetivo, pipeline, prioridades (7 niveles), invariantes, merge incremental, activación de Ambiguity (6 SÍ / 6 NO), preservación de intención (tabla de evolución + Booking Floating), UPDATE vs RESET, árbol de decisión completo, trazabilidad (regla por regla a fuentes), verificación (13 bugs mapeados contra algoritmo).
- **Documentos generados/modificados**: `docs/specifications/CONVERSATION_DECISION_ALGORITHM.md` (nuevo, 49KB, 1026 líneas)
- **Validación**: Solo documentación — 0 cambios de código, build y tests no afectados

### PR-QA3-S2B — Hotel Esturión Trace (QA-3 Sprint 2B)
- **Tipo**: Traza funcional contra Specification
- **Resumen**: Trazado de 12 puntos de control del escenario "Hotel Esturión" contra FUNCTIONAL_BEHAVIOR_SPECIFICATION.md. 3 desviaciones funcionales confirmadas: **F01-DG** (Ambiguity sin verificar clarify_field en lead.service.ts:203), **F02-DG** (intención no preservada — core.ts:277-283 solo cubre PRE_BOOKING), **F03-DG** (merge no ejecutado por bypass de ambigüedad). 2 ambigüedades de especificación resueltas: A01-DG (cuándo preservar intención), A02-DG (cuándo activar Ambiguity). Causa raíz compartida: el sistema no distingue entre "usuario dando nueva información" y "usuario respondiendo a una pregunta del sistema". 2 invariantes violados (I-C1, I-C3). 0 código modificado.
- **Documentos generados/modificados**: `docs/certification/PR-QA3_S2B_HOTEL_ESTURION_TRACE.md` (nuevo)
- **Validación**: Solo documentación — 0 cambios de código, build y tests no afectados

### PR-CAT1 — External Black-Box Acceptance Campaign
- **Tipo**: Campaña de aceptación conversacional (caja negra)
- **Resumen**: Campaña de 13 escenarios conversacionales ejecutados contra el sistema real (Turso remoto, LLMs Gemini→Groq) tratado como caja negra. Cada escenario usó un número de teléfono único (5491110000001–5491110000013). Resultados: 11/13 escenarios funcionales ✅, 2 timeouts por latencia LLM (S1 30s, S5 >60s), 0 errores de sistema. Confirmación de F01-DG (ambiguity sin clarify_field, S9) y F02-DG (intención preservada vía LLM no determinísticamente, S7). Hallazgo UX: ambigüedad resuelta automáticamente sin confirmación del usuario (S13). Veredicto: 🟡 ACEPTABLE CON HALLAZGOS.
- **Documentos generados/modificados**: `docs/certification/PR-CAT1_EXTERNAL_ACCEPTANCE_CAMPAIGN.md` (nuevo), `tests/campaign-cat1.test.ts` (nuevo — archivo de campaña)
- **Validación**: Solo documentación — 0 cambios de código de producción, build y tests no afectados

### ADR-013 — Conversation Decision Algorithm Ratification
- **Tipo**: ADR — ratificación de autoridad funcional
- **Resumen**: Se creó `docs/adr/013-conversation-decision-algorithm.md` elevando el CDA a norma arquitectónica oficial. Se define la jerarquía normativa: Implementation → CDA → Specification → ADR (el nivel superior prevalece). Se declara al CDA como autoridad funcional del comportamiento conversacional. Se documentan relaciones con todos los ADRs previos, Specification, Playbook, AITOS LAB y las 4 auditorías QA. Architecture Freeze V3 queda complementado por una autoridad funcional. 0 código modificado.
- **Documentos generados/modificados**: `docs/adr/013-conversation-decision-algorithm.md` (nuevo), `docs/architecture/ADR_INDEX.md` (actualizado)
- **Validación**: Solo documentación — 0 cambios de código, build y tests no afectados

### IN-DG — Documentation Governance Initiative
- **Tipo**: Gobernanza documental — normalización, taxonomía, jerarquía, SSOT
- **Resumen**: Se completó la formalización de la gobernanza documental del proyecto. Seis componentes establecidos: normalización de nomenclatura (289 archivos auditados, ~98% compliance), taxonomía documental de 15 tipos con definiciones formales, jerarquía en 6 Tiers con cadena conceptual, política SSOT (Rule 4), identidad documental (Rule 6) y convención de nombres (Rules 1-5 + Exceptions). 3 conflictos SSOT resueltos mediante renombres controlados: `docs/ai/CONTRACTS.md` → `ENGINE_CONTRACTS.md`, `docs/certification/ONTOLOGY.md` → `EVIDENCE_ONTOLOGY.md`, `ael/artifacts/ONTOLOGY.md` → `SYSTEM_VOCABULARY.md`. ~30 referencias actualizadas sin enlaces rotos. Las futuras modificaciones de gobernanza requieren ADR (no cambios ad hoc).
- **Documentos generados/modificados**: `docs/architecture/GOVERNANCE.md` (+650 líneas: naming convention + taxonomy + hierarchy), `docs/certification/NOMENCLATURE_AUDIT.md` (actualizado con certificación y Future Revisions), `docs/ai/ENGINE_CONTRACTS.md` (renombrado), `docs/certification/EVIDENCE_ONTOLOGY.md` (renombrado), `ael/artifacts/SYSTEM_VOCABULARY.md` (renombrado)
- **Validación**: Solo documentación — 0 cambios de código, 0 referencias rotas, build y tests no afectados

### PR-QA3-S2A — Eliminate Double Core Evaluation (QB-05)
- **Tipo**: Fix estructural (eliminación de doble clasificación)
- **Commit**: —
- **Resumen**: Se eliminó la doble ejecución de `core()` durante el procesamiento de un mensaje (QB-05 de PR-QA2B). La infraestructura existente (PR-2A) ya soportaba `analysis?: CoreDecision` en `HandlerContext`, pero `executeTrip` y `executeMultiLegTrip` no lo pasaban → el handler hacía fallback a `core(input)` como segunda clasificación. Fix: se agregó `analysis` a `TripExecutionInput`/`MultiLegTripExecutionInput`, se pasa `leadCore` desde `policy-pipeline.ts`, y se agregó traza `[CORE_SOURCE_AUDIT]` para verificar la fuente de clasificación.
- **Cero cambios funcionales**: NO se modificaron prompts, dominio conversacional ni capacidades. ÚNICA clasificación ahora: `lead.service.ts:108` → `core(text, prevIntent)`.
- **Validación**: Build ✅, Tests ✅ 111 files/1668 PASS, Contratos R1-R4 PASS ✅, Audit trace `source: "lead.service"` confirmado en todos los caminos.

### PR-QA3-S1 — QB-01 GREETING Context Preservation + QB-04 Field Resolution Unification
- **Tipo**: Fix arquitectónico + unificación de autoridad
- **Commit**: —
- **Resumen**: QA-3 Sprint 1 completado. Dos hallazgos críticos de PR-QA2B resueltos:
  - **QB-01 FIX**: GREETING shortcut ya no destruye el contexto conversacional. Cuando un usuario saluda en medio de una conversación activa (slots con origin/destination o estado no-idle), el sistema reconoce el saludo y continúa al pipeline normal — preservando prevSlots y estado conversacional. `lead.service.ts` modificado.
  - **QB-04 FIX**: Resolución de campos unificada. Se estableció `field-resolver.ts` como la autoridad ÚNICA para determinar "qué campo preguntar". `resolveSimpleFieldGap()` reemplaza a `evaluateCompleteness()` en `extraction-runner.ts`. `evaluateCompleteness` delegada a `field-resolver.ts` para backward compat.
- **Validación**: Tests ✅ 112 files / 1673 tests PASS, Build ✅ (Next.js 15.5.18 compile 35.0s), Contratos R1-R4 PASS ✅, 0 regresiones

### PR-QA2 — Runtime Flow Trace & Authority Verification
- **Tipo**: Auditoría de trazado dinámico
- **Commit**: —
- **Resumen**: Trazado runtime de 4 escenarios conversacionales (greeting→booking, price query, full reservation, geo ambiguity). Confirmación de los 3 hallazgos críticos de PR-QA1 (F-01 pipeline paralelo, F-02 afirmación triplicada, F-03 resolución de campos cuadruplicada) con evidencia dinámica. 4 hallazgos adicionales descubiertos (F-04 ambiguity handler falla en "sí", F-05 pricing resuelto 3× por trip, F-06 5/7 rutas bypassan handleMessage, F-07 price query interceptado por ambiguity antes de pricing). Matriz de autoridades construida. Plan de eliminación diseñado para PR-QA3. Cero modificaciones de código.
- **Documento generado**: `docs/certification/PR-QA2_RUNTIME_FLOW_TRACE.md`
- **Validación**: Solo documentación — build, tests, contratos no afectados (0 cambios de código)

### PR-QA1 — Architectural Consistency Audit
- **Tipo**: Auditoría arquitectónica
- **Commit**: —
- **Resumen**: Auditoría de consistencia arquitectónica de 18 componentes del pipeline. 27 hallazgos clasificados (3 🔴 críticos, 4 🟡 estructurales, 3 🟢 fortalezas + matrices por componente). Matrices de responsabilidad, RCA, roadmap de saneamiento. Cero modificaciones de código.
- **Documento generado**: `docs/certification/PR-QA1_ARCHITECTURAL_CONSISTENCY_AUDIT.md`
- **Validación**: Solo documentación — build, tests, contratos no afectados (0 cambios de código)

## 2026-07-16

### PR-H0C.1b — Cierre arquitectónico: Middleware diferido a Post-v1
- **Tipo**: Decisión arquitectónica
- **Resumen**: Se difiere la implementación de `middleware.ts` (PRD-05/H0A-03) a Post-v1. La validación de seguridad permanece local a cada endpoint (HMAC en webhook, API key check inline en admin). Decisión consciente de Version Zero: sin tráfico real, la centralización constituye sobreingeniería. Ruta de retorno definida en `docs/architecture/DEFERRED_MIDDLEWARE.md`.
- **Documento generado**: `docs/architecture/DEFERRED_MIDDLEWARE.md`
- **Archivos modificados**: `docs/project/PROJECT_BOARD.md` (PRD-05 movido a Deferred), `docs/ROADMAP.md` (I0.3 removido de Fase 0, sección Post-v1 Infrastructure creada), `docs/architecture/ARCHITECTURE_STATUS.md` (nota de Version Zero agregada), `docs/project/CHANGELOG.md` (esta entrada)
- **Validación**: Build ✅ (sin cambios de código), Contratos ✅, Tests 508/508 PASS ✅

### PR-H0A — Staging Hardening Audit
- **Tipo**: Auditoría de readiness para staging (7 áreas)
- **Commit**: —
- **Resumen**: Auditoría completa post-RRR-1 cubriendo Memory Integration, Pattern Discovery, Feature Flags, Tests, Security, Observability y Deploy. Hallazgos documentados en `docs/certification/H0A_STAGING_HARDENING_AUDIT.md`. 4 hallazgos bloquean staging (flags sin documentar, tests fallando, middleware ausente, ADMIN_API_KEY expuesta). 3 hallazgos no bloquean (Memory gap, Pattern Discovery bug, Observability postergable). Memory gap confirmado: `lead.service.ts` tiene 0 referencias a Memory. Pattern Discovery bug confirmado: `JSON.parse(acceptance_json)` castea `any` como `Pattern[]` + DB schema ausente. Feature flag census completo: 17 flags, 11 no documentadas en `.env.example`, 3 shadow flags sin función wrapper. 4 test failures clasificados (2 timeout LLM, 1 mock API, 1 assertion regression). 15 API routes auditadas — auth inline, 0 middleware. Build verificado 39.9s.
- **Documento generado**: `docs/certification/H0A_STAGING_HARDENING_AUDIT.md`
- **Archivos modificados**: Solo documentación (este CHANGELOG, PROJECT_BOARD, TECHNICAL_DEBT_BASELINE, ARCHITECTURE_STATUS)
- **Validación**: No aplica (solo auditoría — 0 cambios de código)
- **Próximo paso**: Implementar bloqueos H0A-01 (flags), H0A-02 (tests), H0A-04 (key rotation) antes de staging. H0A-03 (middleware) diferido a Post-v1 — ver `docs/architecture/DEFERRED_MIDDLEWARE.md`.

### PR-5G — Cognitive Architecture Certification Closure
- **Tipo**: Certificación arquitectónica
- **Commit**: —
- **Resumen**: Cierre de certificación de la Serie CE. Resolución de 5 hallazgos de auditoría. Build fix, ADR-012 formalizado, DRL geo integrado, documentación sincronizada. **Architecture Freeze V3 declarado.**
- **Hallazgos resueltos**:
  - **H-01**: HandlerContext.drlEnrichment type agregado a types.ts — build compila ✅
  - **H-02**: ADR-012 actualizado a ACEPTADO + desviaciones documentadas (Sección 9)
  - **H-03**: DRL geo integrado en interpretAmbiguity (BKE_GEO_ENABLED=true ahora ejecuta resolveGeoAmbiguity antes del LLM). 2 tests DRL ambiguity ahora PASS
  - **H-04**: recovery-resolver auditado: NO integrado (fuera de alcance), NO eliminado (preservado para PR futuro). Documentado como deuda técnica en ADR-012 §9.2
  - **H-05**: Documentación sincronizada: ADR_INDEX, ARCHITECTURE_STATUS, ROADMAP, PROJECT_BOARD, CHANGELOG
- **Archivos modificados**:
  - `src/lib/ai/types.ts` (+3 líneas: drlEnrichment)
  - `src/lib/ai/ambiguity-interpreter.ts` (+9 líneas: imports + DRL-first logic)
  - `docs/adr/012-cognitive-escalation-principle.md` (status → ACEPTADO + Sección 9 desviaciones)
  - `docs/architecture/ARCHITECTURE_STATUS.md` (BKE/DRL status → Implementado, ADR-012 → Implementado)
  - `docs/ROADMAP.md` (CE status → CERTIFICADO, v1.3)
  - `docs/project/PROJECT_BOARD.md` (PR-5G agregado, CE-5 → DONE)
  - `docs/project/CHANGELOG.md` (esta entrada)
- **Validación**: Build ✅, Contratos R1-R4 PASS ✅, Tests ✅ (ver reporte final)

### RRR-1 — Release Readiness Review Completed
- **Tipo**: Release Readiness Review
- **Commit**: —
- **Resumen**: Revisión formal de readiness para staging. Veredicto: **READY FOR STAGING WITH CONDITIONS**. Architecture Freeze V3 certificado. Serie CE completa. Build ✅ (39.9s compile, 7/7 static pages), Tests: 1653/1657 PASS ✅ (4 pre-existing: 2 timeouts LLM, 1 mock API, 1 DRL geo behavior), Contratos R1-R4 PASS ✅.
- **Hallazgos clave**:
  - **Core pipeline**: Conversacional, webhook (HMAC+rate limiting), DB (39 tablas), LLM providers (Gemini→Groq), métricas cognitivas — **PRODUCTION-READY**
  - **BKE/DRL**: Todos deshabilitados por defecto (flags false) — **READY para activación progresiva**
  - **Evidence Engine**: Shadow mode, 18 archivos, off por defecto — **READY**
  - **Memory Service**: Implementado (IM-1), `COGNITIVE_MEMORY_ENABLED=false` — **NEAR-READY** (no conectado a producción)
  - **Pattern Discovery**: Bug en `repository.ts` (parseo `acceptance_json`) — **NO ACTIVAR**
  - **4 condiciones** para producción: (1) Conectar Memory al pipeline, (2) Corregir Pattern Discovery, (3) Completar `.env.example`, (4) Centralizar middleware de seguridad
- **Plan de activación**: 7 fases progresivas — Fase 1 (Core pipeline) inmediato, Fase 7 (Pattern Discovery) último
- **Validación**: Build ✅, Contratos R1-R4 PASS ✅, Tests 1653/1657 PASS ✅

### PR-5D — Asistencia DRL a puntos A (C1/C2/C5)
- **Tipo**: Implementación de CE-5 (Cognitive Migration)
- **Commit**: —
- **Resumen**: Reemplazo de 4 stubs DRL (completitud, consistencia, clasificacion, escalamiento) por implementaciones reales + creación de regla prioridad. Integración de asistencia DRL antes de C1 (generateGroqExtraction), C2 (generateLLMResponse) y C5 (generateFrustrationResponse). El DRL enriquece el prompt del LLM con información estructurada (nunca reemplaza la llamada).
- **Reglas implementadas**:
  - **completitud**: Análisis de ratio, 4 niveles (complete/partial/minimal/empty), detección de campos vacíos
  - **consistencia**: 4 validaciones (origen=destino, fecha pasada, pasajeros inválidos, urgencia vs fecha), 3 severidades
  - **clasificación**: 5 tipos de extracción (initial/incremental/correction/clarification/re_extraction), 3 complejidades, consume ClientObjective
  - **prioridad**: Priorización de campos según ClientObjective (booking_urgent→scheduled_at, inquiry_price→price)
  - **escalamiento**: Detección multi-ride, complejidad compuesta, escalamiento a Gemini
- **Feature flags**: 3 nuevas (`DRL_EXTRACTION_ASSISTANCE_ENABLED`, `DRL_RESPONSE_ASSISTANCE_ENABLED`, `DRL_FRUSTRATION_ASSISTANCE_ENABLED`) — todas false por defecto
- **Tests**: 51 nuevos (34 reglas + 17 asistencia), **471 totales sin regresiones**
- **Archivos**: 4 creados, 8 modificados
- **Validación**: Build ✅, contratos R1-R4 PASS ✅, 471/471 tests PASS ✅

### PR-5E — BKE Domain Consolidation (Entity, Pricing, Message)
- **Tipo**: Implementación de CE-5 (Cognitive Migration)
- **Commit**: —
- **Resumen**: Implementación de los 3 dominios BKE restantes (Entity, Pricing, Message) como wrappers determinísticos que centralizan el acceso al conocimiento existente. Ningún LLM nuevo. Ningún cambio de comportamiento observable (flags default false).
- **Dominios implementados**:
  - **Entity** (`domains/entity.ts`): Pipeline 3-etapas (catálogo → lugares conocidos → resolvedor de ubicación). Exporta `extractEntities`, `resolveEntity`, `getEntityCatalog`.
  - **Pricing** (`domains/pricing.ts`): Wrappers sobre resolvePricingForSlots, tariff-resolver, pricing-engine. Exporta `estimatePrice`, `getTariffInfo`, `calculateTripPrice`.
  - **Message** (`domains/message.ts`): Switch centralizado sobre 15 tipos de mensaje delegando a response-builder y disambiguation-templates. Exporta `resolveMessage`, `resolveMessageSync`, catálogo de claves.
- **Feature flags**: 3 nuevas (`BKE_ENTITY_ENABLED`, `BKE_PRICING_ENABLED`, `BKE_MESSAGE_ENABLED`) — todas false por defecto
- **Archivos**: 3 creados (`entity.ts`, `pricing.ts`, `message.ts`), 2 modificados (`index.ts`, `feature-flags.ts`)
- **Validación**: Build ✅, contratos R1-R4 PASS ✅, 51/51 DRL tests PASS ✅

### PR-5F — Cognitive Metrics & Observability (CE-5)
- **Tipo**: Observabilidad — Cognitive Escalation Principle
- **Commit**: —
- **Resumen**: Sistema completo de métricas cognitivas para el pipeline BKE → DRL → LLM → Fallback. Singleton collector con buffer circular (10k eventos/100 requests), calculadora de Cognitive Budget (tasas de resolución, latencia por nivel, stage breakdown), API endpoint `/api/bot/metrics/cognitive`. Integración side-effect-free en Handler, FallbackProvider, DRL Assistance, BKE Pricing, Extraction Pipeline, Comprehension Pipeline. 22 tests unitarios de collector, budget y side-effect-free. Zero regresión (437 tests, 25 suites).

### PR-5E.1 — Integración BKE (consumidores + tests)
- **Tipo**: Cierre de integración de CE-5
- **Commit**: —
- **Resumen**: Integración completa de los 3 dominios BKE en consumidores existentes + cobertura de tests + observabilidad. Comportamiento idéntico con flags desactivados.
- **Consumidores integrados**:
  - **Entity**: `extract-slots.ts` — enriquecimiento BKE entity antes de entity-extractor, combinado con DRL assistance en fallback LLM
  - **Pricing**: `resolve-pricing-for-slots.ts` — routing a BKE cuando `BKE_PRICING_ENABLED=true`, con fallback automático a pricing-engine si BKE no retorna datos
  - **Message**: `handler.ts` — routing a BKE.resolveMessageSync en `buildDomainPolicy` para dominios informational/commercial cuando `BKE_MESSAGE_ENABLED=true`
- **Tests**: 53 nuevos (4 suites)
  - `tests/bke/entity-domain.test.ts` — 12 tests (extracción, resolución, catálogo, casos límite)
  - `tests/bke/pricing-domain.test.ts` — 9 tests (estimación, tarifa, cálculo directo, errores)
  - `tests/bke/message-domain.test.ts` — 25 tests (15 tipos de mensaje, parámetros, claves inválidas)
  - `tests/bke/integration-flag-routing.test.ts` — 7 tests (routing flags, fallback, contratos)
- **Observabilidad**: Logging en cada punto de routing BKE con dominio, origen, resultado y latencia
- **Validación**: Build ✅, contratos R1-R4 PASS ✅, **104/104 tests PASS ✅ (cero regresiones)**

## 2026-07-15

### CE Closure — Cognitive Efficiency Series completed
- **Tipo**: Cierre documental de serie arquitectónica
- **Documentos generados (6)**:
  - `docs/architecture/CE-1_COGNITIVE_EFFICIENCY_AUDIT.md` — Baseline completo de consumo cognitivo (7 puntos C1-C7, 3 providers, 0 funcionales)
  - `docs/architecture/CE-2_INEVITABILITY_CLASSIFICATION.md` — Clasificación A/B/C/D (4A, 2B, 1C, 0D)
  - `docs/architecture/CE-3A_BUSINESS_KNOWLEDGE_ENGINE.md` — Diseño del BKE (11 dominios, 7 servicios, Nivel 0)
  - `docs/architecture/CE-3B_DETERMINISTIC_REASONING_LAYER.md` — Diseño de la DRL (5 tipos decisión, 7 familias reglas, Nivel 1)
  - `docs/architecture/CE-4_MIGRATION_ROADMAP.md` — Roadmap 5 fases (0-4), 9 sprints, feature flags
  - `docs/adr/012-cognitive-escalation-principle.md` — Decisión arquitectónica formal (stack 3 niveles, 7 principios)
- **Modelo de inteligencia oficial**: Business Knowledge Engine → Deterministic Reasoning Layer → Groq → Gemini
- **Modifica**: ADR-005 (AI-First Interpretation) parcialmente — conocimiento explícito tiene prioridad sobre LLM
- **Próximo paso**: CE-5 — Cognitive Migration Implementation (épica creada, tasks no descompuestas)
- **Documentos de gobernanza actualizados**: ADR_INDEX.md, PROJECT_BOARD.md, ROADMAP.md, ARCHITECTURE_STATUS.md, CHANGELOG.md

### DEBT-14C — Post-fix verification & audit
- **Tipo**: Verificación + Auditoría de infraestructura
- **Commit**: —
- **Resumen**: Verificación post-corrección de DEBT-14B (import.meta.dirname → process.cwd()). Build compila ✅ en 27.2s. Bundle .next/server/chunks/215.js verificado: `g().resolve(process.cwd(), "schema/schema.sql")` — sin `void 0`. Contratos R1-R4 PASS ✅. Auditoría completa del flujo `initSchema()`:
  - **Flujo**: `getDb()` → crea cliente → dispara `initSchema()` (Promise<void>) → `schemaReady` singleton. `ensureSchema()` checkea y await. Sin race condition crítica (libSQL queue serializado).
  - **splitSQLStatements()**: Manejo correcto de bloques BEGIN/END anidados para triggers. Todos los CREATE TRIGGER en schema.sql se parsean y ejecutan correctamente.
  - **Idempotencia**: 100% — todos los CREATE usan `IF NOT EXISTS`. Seed data usa `INSERT OR IGNORE`.
  - **Sin branching por entorno**: Schema loading path idéntico para dev y Vercel. `process.cwd()` en Vercel = `/var/task`. Schema.sql desplegado (no vercel.json, no .vercelignore).
  - **Riesgo residual**: `getOrCreateConversation()` (database.ts:31) llama `getDb().execute()` sin `ensureSchema()` previo. Solo riesgoso en frío inicial con DB vacía. Schema loading (~670 líneas DDL) es rápido y libSQL serializa queries en orden. Riesgo BAJO.
- **Checklist de deploy**: Schema.sql incluido por defecto. Sin archivos ignorados. `process.cwd()` funciona en serverless. Fallback `fs.existsSync` con error explícito. Build y contratos verificados. Tests (blackbox + integración) PASS.

### DEBT-14B — Vercel TypeError fix (import.meta.dirname → process.cwd())
- **Tipo**: Bug fix de infraestructura (producción-blocker)
- **Commit**: —
- **Resumen**: Corrección de la causa raíz identificada en DEBT-14. En `src/lib/db/core/connection.ts` línea 104: `path.resolve(import.meta.dirname, "../../../../schema/schema.sql")` → `path.resolve(process.cwd(), "schema/schema.sql")`. Agregado guard `fs.existsSync` con `throw Error(...)` explícito. Build verificado: `g().resolve(process.cwd(), "schema/schema.sql")` en bundle, sin `void 0`. Chunk 215.js confirmada limpia.
- **Cambio**: +4/-1 en connection.ts. Único archivo modificado.
- **Verificación**: Build ✅ (18.7s). Contratos R1-R4 PASS ✅. Bundle auditado — 0 occurrences de `void 0` en schema path. `import.meta.dirname` no existe en el bundle compilado.

### DEBT-14 — Vercel TypeError root cause audit
- **Tipo**: Auditoría de causa raíz
- **Commit**: —
- **Resumen**: Investigación de error `TypeError: The "paths[0]" argument must be of type string. Received undefined` en producción Vercel. Causa raíz confirmada: **`import.meta.dirname` (Node.js 20.11+) no tiene transform en webpack de Next.js**. En el bundle compilado (`.next/server/chunks/215.js:70`), `import.meta.dirname` → `void 0`. `path.resolve(void 0, ...)` lanza TypeError. `import.meta.url` sí tiene transform (se hardcodea el path absoluto). Contraste confirmado.
- `constants.ts` usa `fileURLToPath(import.meta.url)` → NO afectado porque `TURSO_DATABASE_URL` está definido en Vercel y `DB_PATH` nunca se evalúa cuando Turso está configurado.
- `process.cwd()` en Vercel = `/var/task`. `schema/schema.sql` está en raíz del repo (no ignorado) → se despliega correctamente.

### DEBT-13 — trip_status elimination
- **Tipo**: Limpieza de código muerto
- **Commit**: `0a8719d`
- **Resumen**: Eliminación de todas las referencias ejecutables a `trip_status` tras detectar en DEBT-12 que la columna fue removida de schema.sql pero persistía en código. Archivos modificados:
  - `src/lib/dev/hard-reset.ts`: Queries de limpieza actualizadas (chat_sessions reemplaza la lógica legacy con workflow_state)
  - `src/lib/db/database.ts`: `setConversationTripStatus` eliminado (0 callers verificado en Phase G)
  - `src/lib/db/core/database.ts` (legacy): Eliminado
  - `src/app/page.tsx`: Sección de status display eliminada
- **Verificación**: `git grep trip_status` → solo documentación y comentarios. Black box audit `.limpiar`: 14/14 escenarios PASS con 0 errores.

### DEBT-12 — Persistence Stabilization (Fase 1+2)
- **Tipo**: Estabilización técnica de infraestructura de persistencia
- **Documentos**: `docs/adr/007-schema-sql-authority.md` (ADR-007), `schema/schema.sql`
- **Resumen**: Extracción del DDL de initSchema() a schema/schema.sql como fuente única de verdad. Simplificación de connection.ts (740→187 líneas). Sincronización de 6 interfaces TypeScript con el esquema real. Smoke tests de persistencia. Canalización de verificación npm run verify.
- **Arquitectura**: ADR-007 (Schema Authority). schema.sql es la única autoridad del DDL. connection.ts lee schema.sql vía splitSQLStatements().
- **Archivos creados (2)**: `schema/schema.sql`, `tests/integration/persistence-smoke.test.ts`
- **Archivos modificados (4)**: `src/lib/db/core/connection.ts` (initSchema simplificado, DDL removido + splitSQLStatements helper), `src/lib/db/types.ts` (6 correcciones de interfaz), `scripts/validate-schema-parity.ts` (ahora lee schema.sql, ADR-007), `package.json` (npm run verify)
- **Tests**: 13 tests nuevos (persistence-smoke). 1395/1398 tests totales (3 pre-existing). Build ✅, Contratos ✅.
- **Queda fuera**: Fases 3-6 del plan original (interfaces sincronizadas, smoke tests hechos). Limpieza del comando .limpiar (referencia a trip_status removido de schema y types pero query no actualizada).
- **Tipo**: Implementación de capa cognitiva
- **Documentos**: `docs/adr/010-memory-architecture.md`, `docs/architecture/IM-0_MEMORY_IMPLEMENTATION_SCOPE.md`, `docs/architecture/PR-13_ATR-1_ARCHITECTURE_TRANSITION_READINESS.md`
- **Resumen**: Primera implementación de la capa Memory cognitiva. Memory preserva el par Belief + Decision de cada turno cognitivo como un snapshot inmutable de 19 campos.
- **Arquitectura**: ADR-010 (Cognitive Memory Architecture). Architecture Freeze respetado.
- **Normalizaciones aplicadas (6)**: M-12 exceptuar metadata, M-7 refinar turnNumber, ADR-009 §7 pipeline actualizado, C9 clarificar filtering, nomenclatura dos conversationIds, alinear 19/11 campos en Milestone v3.0 y PR-7.
- **Archivos creados (7)**: `src/lib/memory/{types,memory-snapshot,build-snapshot,memory-service,memory-storage,memory-init,index}.ts`
- **Archivos modificados (3)**: `src/lib/services/lead.service.ts` (captura ShadowResult + store), `src/config/env.ts` (COGNITIVE_MEMORY_ENABLED doc), `src/lib/db/core/connection.ts` (tabla cognitive_memory_snapshots)
- **Tests**: 45 tests nuevos (38 unit + 7 integración). 0 regresiones. Build ✅, Contratos ✅.
- **Feature flag**: `COGNITIVE_MEMORY_ENABLED` (env var, default false). Mismo patrón Shadow Mode que `EVIDENCE_SHADOW_MODE`.
- **Queda fuera**: Read API, Projection Contract, Pattern Discovery, Identity Contract — diferidos a fase PD.

## 2026-07-13

### PR-11 — Cognitive Architecture Reality Alignment Audit
- **Tipo**: Auditoría de alineamiento arquitectónico (S1)
- **Documento**: `docs/architecture/PR-11_COGNITIVE_REALITY_ALIGNMENT.md`
- **Resumen**: Auditoría de 5 fases para resolver la divergencia detectada en S1A entre arquitectura declarada, implementada y futura. Clasificación de cada elemento del sistema cognitivo en categorías A (existe correcto), B (conceptual sin implementación), C (existe pero en otro dominio) o D (abstracción incorrecta).
- **Auditoría 1 — EE**: Entidades y builders existen correctamente (A). `runShadowCognition()` como nexo con Memory es abstracción incorrecta (D). ShadowResult como contrato inter-capa es incorrecto (D) — no hay consumidor.
- **Auditoría 2 — Memory**: Concepto e invariantes existen (B), pero 8/14 invariantes no son verificables sin código. Necesidad arquitectónica no demostrada empíricamente — es una de múltiples soluciones al problema de persistencia.
- **Auditoría 3 — Learning**: Learning operacional (ADR-003) existe en `src/lib/services/learning/` con 15 archivos (C). Learning cognitivo (PR-7, Pattern Discovery) es conceptual sin implementación (B) y con necesidad no demostrada. El nombre "Learning" compartido genera riesgo arquitectónico confirmado (D). Goals/Planning eliminadas persisten sin modelar dentro del Learning operacional.
- **Auditoría 4 — Pipeline real vs documentado**: 8 divergencias documentadas. El pipeline real no tiene conexión cognitiva. El EE corre en paralelo y su output se descarta.
- **Veredicto: B — La arquitectura debe documentarse como futura, no existente.**
- **Resolución propuesta**: (1) Renombrar Learning cognitivo → "Pattern Discovery", (2) Separar documentación en plano presente y futuro, (3) Capturar ShadowResult en lead.service.ts (acción mínima), (4) Renombrar Learning operacional → "Operational Optimization Engine".
- **Postergado**: Si Memory o Pattern Discovery deben implementarse requiere PRs separados con evidencia de necesidad.

### S1A — Global Architecture Soundness: Irreducibility Audit
- **Tipo**: Auditoría de refutación global (S1A)
- **Documento**: `docs/architecture/S1A_GLOBAL_IRREDUCIBILITY_AUDIT.md`
- **Resumen**: Auditoría de irreducibilidad del pipeline cognitivo completo (EE → Memory → Learning) desde primeros principios. Se ignoraron deliberadamente PR-3, PR-5, PR-7 y todos los ADRs previos. **Veredicto: D — La arquitectura contiene una contradicción que obliga a rediseñar el pipeline.**
- **Hallazgo crítico — Contradicción verificable en código**: `runShadowCognition()` en lead.service.ts línea 83 descarta su valor de retorno. Los 7 objetos cognitivos (Signal → Decision) se construyen y son inmediatamente garbage-collected. Memory no puede consumirlos porque el ShadowResult nunca se capturó. **El pipeline EE→Memory no existe en código.**
- **Hallazgo 2 — Memory no existe**: ADR-010 es diseño conceptual. No hay código en `src/lib/memory/`. No hay feature flag `COGNITIVE_MEMORY_ENABLED`. No hay captura del ShadowResult.
- **Hallazgo 3 — Learning cognitivo no existe**: PR-7A a PR-7G son documentos teóricos. No hay código de pattern discovery. El "Learning" existente (`src/lib/services/learning/`) es operacional (fare learning, routing — ADR-003) y no consume ni produce Patterns cognitivos.
- **Hallazgo 4 — Goals/Planning eliminadas pero sus funciones persisten sin modelar**: El Learning operacional contiene policy-engine (Planning) y adaptation (Goals). La eliminación de Goals/Planning como capas cognitivas no eliminó su función — solo la ocultó.
- **Contradicción central**: La arquitectura afirma el pipeline EE→Memory→Learning, pero en código: (1) EE output descartado, (2) Memory no existe, (3) Learning no existe. El pipeline como teoría es inconsistente con la realidad del sistema.
- **Veredicto D**: La premisa fundamental "EE produce conocimiento que Memory preserva para que Learning descubra patrones" es falsa en el sistema actual. La contradicción exige resolver: (A) aceptar que la arquitectura describe un sistema futuro y reducir el alcance documentado, o (B) reconectar el pipeline real o simplificar la arquitectura.

### PR-10A a PR-10F — Boundary Architecture Elimination
- **Tipo**: Serie de 6 auditorías arquitectónicas (Conceptual)
- **Documentos**: `docs/architecture/PR-10[A-F]_*.md` (6 documentos)
- **Resumen**: Auditoría del boundary cognitivo-operacional ("CognitiveInsights") con el mismo rigor aplicado a capas previas. **El boundary no es una entidad arquitectónica.**
- **PR-10A — Ontology**: El boundary no produce nada. Solo transporta Patterns (función identidad). Pasa 0/5 criterios de entidad productora de conocimiento. **Veredicto: No es entidad.**
- **PR-10B — Mathematical Model**: B(M) = M. Función identidad pura. Sin transformación, sin cambio de orden, sin compresión. **Veredicto: Sin modelo propio.**
- **PR-10C — Contract**: Todos los contratos del boundary son heredados de Learning (PR-7D). Ninguno propio. **Veredicto: Sin contratos exclusivos.**
- **PR-10D — Evolution**: Sin ciclo evolutivo independiente. Cambia solo reactivamente a cambios en Learning o en el sistema operacional. **Veredicto: Sin evolución propia.**
- **PR-10E — Minimality**: 4/4 responsabilidades absorbibles en Learning (como API) o en el sistema operacional (como import de tipos). 0 invariantes violados. **Veredicto: 100% absorbible.**
- **PR-10F — Semantics**: 0 propiedades intrínsecas. Identidad completamente relacional. **Veredicto: Sin propiedades propias.**
- **Resultado arquitectónico**: El "CognitiveInsights contract" se elimina como entidad separada. Pasa a ser la API pública de Learning (`learning.getPatterns()`). La separación cognitivo/operacional se mantiene mediante: (1) módulos separados, (2) importación unidireccional, (3) políticas de diseño documentadas.
- **Arquitectura final**:
  - **Cognitivo**: EE → Memory → Learning (3 capas, 2 invariantes congelados)
  - **Contrato único**: Learning expone `Pattern[]` vía API pública
  - **Operacional**: Handler → Policy → LLM → Response (consume Patterns)
  - **Regla fundamental**: solo Patterns cruzan del dominio cognitivo al operacional

### PR-9A a PR-9G — Planning Architecture Elimination
- **Tipo**: Serie de 7 auditorías arquitectónicas (Conceptual)
- **Documentos**: `docs/architecture/PR-9[A-G]_*.md` (7 documentos)
- **Resumen**: Aplicación del mismo rigor metodológico que eliminó Reflection (PR-6) y Goals (PR-8) a la capa Planning. **7 auditorías independientes, 7 veredictos convergentes: Planning no debe existir como capa cognitiva.**
- **PR-9A — Ontology Audit**: Planning produce instrucciones, no conocimiento. Pasa 0/5 criterios de capa cognitiva. El pipeline cognitivo debe terminar en conocimiento (Learning), no en acción. **Veredicto: D — Eliminar.**
- **PR-9B — Mathematical Model**: Kernel = filter(M) + lookup(M→intention) + select_action(intentions). Sin cambio de orden lógico. Sin descubrimiento. Planning es IMPURA (produce side effects). **Veredicto: Sin modelo no trivial.**
- **PR-9C — Identity Audit**: Action no es concepto ontológicamente distinto. PR-8 eliminó Goals argumentando Goal = Action. Si Goal = Action y Goal fue eliminado, Planning (que produce Actions) debe eliminarse por consistencia. **Veredicto: Action no justifica capa.**
- **PR-9D — Contract Derivation**: El contrato Learning→Planning se reemplaza por Learning→Sistema Operacional sin cambios. Planning no aporta contratos propios. **Veredicto: Sin contratos exclusivos.**
- **PR-9E — Evolution Audit**: Planning no tiene iniciativa evolutiva. Todo cambio es respuesta a cambios en Learning o en el sistema operacional. **Veredicto: Sin ciclo independiente.**
- **PR-9F — Minimality Audit**: 8/8 responsabilidades absorbibles por el sistema operacional. 0 invariantes violados. **Veredicto: 100% absorbible.**
- **PR-9G — Semantics Audit**: Action tiene 0 propiedades intrínsecas (como Goal en PR-8G). Identidad completamente contextual. **Veredicto: Sin propiedades cognitivas.**
- **Pipeline cognitivo final**: **EE → Memory → Learning** (3 capas).
- **Transición cognición→acción**: Contrato `CognitiveInsights` entre Learning y el Sistema Operacional (ADR-003). Learning expone Patterns; el handler/policies/LLM los consumen para informar decisiones.
- **Capas eliminadas en total**: Reflection (PR-6), Goals (PR-8), Planning (PR-9) = **3 capas eliminadas**. Learning preservada (PR-7). Memory preservada (PR-5). EE preservado (PR-3).
- **Consistencia metodológica**: 21 auditorías totales (7 por capa). Mismo rigor. Mismos criterios. 3 eliminaciones, 2 preservaciones (Memory, Learning), 1 congelado (EE).

### PR-8A a PR-8G — Goals Architecture Elimination
- **Tipo**: Serie de 7 auditorías arquitectónicas (Conceptual)
- **Documentos**: `docs/architecture/PR-8[A-G]_*.md` (7 documentos)
- **Resumen**: Aplicación del mismo rigor metodológico que eliminó Reflection (PR-6) a la capa Goals. **Objetivo: intentar eliminar Goals antes de aceptarla.** 7 auditorías independientes convergen en el mismo veredicto.
- **PR-8A — Goals Ontology Audit**: Goals no produce nuevo tipo de conocimiento. Es prescriptivo, como Planning. Pasa 0/5 criterios de capa cognitiva (Learning pasó 5/5). **Veredicto: D — Eliminar.**
- **PR-8B — Goals Mathematical Model**: Kernel = filter(M) + lookup(M→intention) + sort(priorities). Sin cambio de orden lógico (2°→2°). Sin descubrimiento. Sin compresión abstractiva. Espacio de salida finito. **Veredicto: Sin modelo matemático no trivial.**
- **PR-8C — Goal Identity**: Goal = Intention (filosofía de la acción). Intention y Action pertenecen al mismo tipo ontológico (prescriptivo). Difieren solo en abstracción, no en tipo. Misma situación que State vs Change en Reflection. **Veredicto: Goal no es concepto ontológicamente distinto.**
- **PR-8D — Contract Derivation**: El contrato Learning→Goals (PR-7D) se reemplaza por Learning→Planning sin cambios. El contrato Goals→Planning no es válido (dependencia total, sin causas de rechazo, consumidor único). **Veredicto: Contratos no justifican la capa.**
- **PR-8E — Evolution Audit**: Goals no puede evolucionar sin afectar a Planning. Dependencia asimétrica total. **Veredicto: Sin ciclo evolutivo independiente.**
- **PR-8F — Minimality Audit**: 8/8 responsabilidades de Goals son absorbibles en Planning. 0 invariantes violados. **Veredicto: 100% absorbible.**
- **PR-8G — Goal Semantics Audit**: Goal tiene 0 propiedades intrínsecas. Toda propiedad es extrínseca (derivada de relación con Patterns y Planning). **Veredicto: Sin identidad semántica propia.**
- **Pipeline resultante**: EE → Memory → Learning → Planning (**4 capas, antes 5**).
- **Impacto arquitectónico**: Goals eliminada como capa. Las responsabilidades R10 (relevancia), R11 parcial (dedup funcional), R12 parcial (categorización interpretativa) y las nuevas (priorización, generación de intenciones) pasan a ser submódulos internos de Planning. El Commitment como concepto se preserva como estado interno de Planning. El contrato Learning→Goals se renombra a Learning→Planning. **0 invariantes congelados violados (I1-EE a I6-EE, M-1 a M-14).**

### PR-7G — Pattern Semantics Audit
- **Tipo**: Auditoría ontológica (Conceptual)
- **Documento**: `docs/architecture/PR-7G_PATTERN_SEMANTICS_AUDIT.md`
- **Resumen**: Auditoría ontológica de las 4 responsabilidades que PR-7F identificó como mezcladas (R9-R12). 10 preguntas ontológicas respondidas desde la pregunta fundamental "¿Qué ES un Pattern?" hasta preguntas específicas sobre redundancia y categorización. **Refutación parcial de PR-7F** mediante argumentos exclusivamente ontológicos.
- **Fundamento ontológico**: Un Pattern ES lo que ES, no para qué SIRVE. La tríada ⟨P, θ, E⟩ es ontológicamente independiente de Goals. Las propiedades de la RELACIÓN entre el Pattern y el consumidor no son propiedades del Pattern.
- **Veredictos individuales**:
  - **R9 (θ_min) — C (Contractual)**: θ_min no es parte del Pattern. ε>0 es intrínseco (Pattern sin evidencia no es Pattern). θ_min configurable es contractual — ni Learning ni Goals pueden fijarlo unilateralmente. **Refuta PR-7F** que dijo Goals (B).
  - **R10 (relevancia) — B (Goals)**: La relevancia es una RELACIÓN entre el Pattern y un contexto de decisión. No es propiedad intrínseca. **Confirma PR-7F**.
  - **R11 (no-redundancia) — A/B (Dividido)**: Redundancia estructural (P₁=P₂) → Learning (A). Redundancia funcional (mismo efecto en Goals) → Goals (B). Redundancia por subsunción (P₁⇒P₂) → Goals (B). **Matiza PR-7F**: strict dedup queda en Learning.
  - **R12 (categorización) — A/B (Dividido)**: τ descriptivo (estado/transición/tendencia/dependencia) → Learning (A) — describe la forma matemática de P. τ interpretativo (señal de abandono/confusión) → Goals (B). **Matiza PR-7F**: PR-7D ya estableció τ descriptivo como obligatorio en el contrato Learning→Goals.
- **Kernel de Learning post-PR-7G**: 8 responsabilidades (no 6 como proponía PR-7F). Learning produce ⟨P, θ, E, τ_desc⟩ con dedup estructural y ε absoluto. No aplica filtro por θ_min configurable, relevancia, subsunción ni categorización interpretativa.
- **Implicancias arquitectónicas**: El contrato Learning→Goals debe preservar τ_desc como obligatorio. θ_min pasa a ser contractual negociable. Goals necesitará implementar filtro por relevancia, subsunción, y categorización interpretativa.
- **Diferencias con PR-7F**:
  - PR-7F: "Mover R9-R12 completo a Goals" → PR-7G: "R10 a Goals; R9 contractual; R11/R12 divididos"
  - PR-7F: "Kernel mínimo = 6 responsabilidades" → PR-7G: "Kernel ontológico = ~8 responsabilidades"
  - PR-7F: "Simplificación limpia" → PR-7G: "Simplificación con matices — no todo es movible"

### PR-7F — Learning Minimality Audit
- **Tipo**: Auditoría de minimalidad arquitectónica (Conceptual)
- **Documento**: `docs/architecture/PR-7F_LEARNING_MINIMALITY_AUDIT.md`
- **Resumen**: Auditoría con el mismo rigor que eliminó Reflection (PR-6). 18 responsabilidades atómicas identificadas, clasificadas en 6 esenciales, 12 auxiliares, 0 accidentales. 4 intentos de absorción completa evaluados. Kernel irreducible demostrado.
- **Hallazgo crítico — Responsabilidades mezcladas**:
  - R9 (selección por θ_min), R10 (relevancia), R11 (no-redundancia), R12 (categorización) ontológicamente pertenecen a Goals.
  - Learning no debería decidir qué es "relevante" para Goals. Goals conoce sus propios criterios.
  - Estas 4 responsabilidades causan violaciones SRP (Learning con 18 responsabilidades) y CCP (R9-R12 cambian por razones de Goals, no de Learning).
- **Absorción evaluada**:
  - Memory: ❌ IMPOSIBLE (viola M-9, M-11, M-13 — 3 invariantes congelados)
  - Goals: ✅ POSIBLE pero con 3 violaciones graves (SRP, separación temporal, lenguaje único)
  - Planning: ❌ IMPOSIBLE (incompatibilidad ontológica)
  - Runtime: ❌ IMPOSIBLE (mezcla de dominios)
- **Kernel irreducible demostrado**: K = {R1, R3, R7, R9, R13, R17}. Ningún elemento puede eliminarse sin romper L_γ(W) = M.
- **Veredicto: C — Learning puede simplificarse**:
  - Mover R9-R12 a Goals (selección + categorización).
  - Learning preserva su kernel: detección + confianza + evidencia + Γ.
  - Goals recibe M_raw = {⟨P,θ,E⟩} y aplica sus propios filtros.
  - Se eliminan violaciones SRP y CCP.
  - Learning NO puede eliminarse (kernel irreducible, absorción dañina en Goals).
- **Diferencia con Reflection**: Reflection fue eliminado (0 consumidores, 0 violaciones al moverlo). Learning es simplificable (kernel irreducible, absorción dañina).

### PR-7E — Learning Identity Audit
- **Tipo**: Auditoría de identidad arquitectónica (Conceptual)
- **Documento**: `docs/architecture/PR-7E_LEARNING_IDENTITY_AUDIT.md`
- **Resumen**: Determinación de la relación arquitectónica entre ADR-003 (Learning Operacional) y PR-7 (Learning Cognitivo). 4 hipótesis evaluadas contra 12 dimensiones de evidencia.
- **Hipótesis evaluadas**:
  - **A (misma capa)**: ❌ Refutada. 8/8 dimensiones contradicen la identidad. Ontología, input, output, consumidores, contratos, invariantes, lenguaje y responsabilidades son radicalmente distintos.
  - **B (subdominios de una capa)**: ❌ Refutada. No existe abstracción unificadora, contrato común, invariantes compartidos ni mecanismo de comunicación entre subdominios. Forzar una capa única viola CCP y CRP.
  - **C (capas diferentes con nombre compartido)**: ✅ VERDADERA. 12/12 dimensiones son diferentes:
    - Ontología: business domain vs cognitive domain
    - Input: DB operacional vs Memory (snapshots)
    - Output: decisiones de negocio vs patterns (⟨P,θ,E⟩)
    - Consumidores: 8 servicios operacionales vs Goals (1 futuro)
    - Contratos: no formalizados vs 4 contratos semánticos
    - Invariantes: boundaries de código vs I1-EE, M-1-M-14, L-1-L-6
    - CCP: cambios de negocio vs cambios arquitectónicos
    - CRP: servicios operacionales vs pipeline cognitivo
    - Lenguaje: tarifas, rutas, políticas vs readiness, missingInfo
    - Responsabilidades: 10 operacionales vs 5 cognitivas
    - Pureza: impura (side effects, estado) vs pura (sin efectos, sin estado)
  - **D (PR-7 reemplaza ADR-003)**: ❌ Refutada. Ninguno puede reemplazar al otro. Son ortogonales.
- **Recomendación de nomenclatura**: "Operational Learning" (ADR-003) vs "Cognitive Pattern Discovery" (PR-7). Los módulos de código existentes (`services/learning/`) conservan su nombre por contexto. El pipeline cognitivo debe usar "Cognitive Pattern Discovery" para evitar ambigüedad.
- **Sin cambios de código requeridos**. Solo documentación arquitectónica.
- **Estado**: PR-7 completo. Modelo matemático cerrado, contratos derivados, identidad resuelta.

### PR-7D — Learning Contract Derivation Audit
- **Tipo**: Auditoría de contratos (Conceptual)
- **Documento**: `docs/architecture/PR-7D_LEARNING_CONTRACT_DERIVATION.md`
- **Resumen**: Derivación de 4 contratos semánticos exclusivamente del modelo matemático cerrado (PR-7A + PR-7B + PR-7C). Sin APIs, DTOs, clases ni código.
- **Pregunta fundamental resuelta — Γ y la identidad del Pattern**:
  - Γ NO forma parte de la identidad matemática del Pattern (⟨P, θ, E⟩ es suficiente para el consumo).
  - Γ SÍ forma parte de la identidad de verificación (⟨P, θ, E, γ⟩ necesario para auditoría y reproducibilidad).
  - Esta distinción se refleja en los contratos: Goals no ve γ; Auditoría sí.
- **Contrato 1: Memory → Learning**:
  - 6 precondiciones (ventana completa, snapshots ordenados, conversationId disponible, etc.)
  - 4 invariantes (no modificar, no retroalimentar, etc.)
  - Información prohibida: datos operacionales, estado interno de Memory, mensajes crudos
  - 5 causas de rechazo (ventana vacía, snapshot incompleto, turnNumber no monótono, etc.)
- **Contrato 2: Learning → Goals**:
  - 5 invariantes (inmutabilidad, completitud, determinismo, etc.)
  - Información obligatoria: P (predicado), θ (confianza), τ (tipo de regularidad)
  - Información opcional: E (evidencia), γ_id (solo para trazabilidad)
  - Información prohibida: snapshots crudos de Memory, datos operacionales, γ completo
  - 4 causas de rechazo (θ fuera de rango, P mal formado, evidencia inválida, claims contradictorios)
- **Contrato 3: Learning → Auditoría**:
  - Contrato de solo lectura retrospectiva
  - Información obligatoria: c completo (⟨P,θ,E⟩), γ_version, timestamp, W completa, τ
  - 4 invariantes (append-only, verificación determinista, solo lectura, registro de resultado)
  - 5 causas de rechazo (evidencia falsa, confianza incorrecta, γ no disponible, W no disponible, claim no reproducible)
- **Contrato 4: Learning → Runtime**:
  - Contrato de ejecución: (W, γ) → L → M
  - 6 invariantes (sin side effects, sin escritura a Memory, sin escritura a DB, sin envío de mensajes, sin modificación al EE, sin estado entre invocaciones)
  - Información prohibida: acceso a servicios operacionales, acceso a canales de salida, modificación de estado global
  - 5 causas de rechazo (γ∉Γ, W inválido, flag deshabilitado, recursos insuficientes, conversationId ausente)
- **Consistencia entre contratos**: mapa completo de cambio de tipo (1er orden → 2do orden), presencia de γ y E a través de los contratos, relación con invariantes existentes (I1-EE a I6-EE, M-1 a M-14).
- **Próximos pasos**: PR-7E (coexistencia con Learning operacional ADR-003).

### PR-7C — Learning Parameter Space & Evidence Audit
- **Tipo**: Auditoría matemática (Conceptual)
- **Documento**: `docs/architecture/PR-7C_LEARNING_PARAMETER_SPACE_AND_EVIDENCE.md`
- **Resumen**: Cierre del modelo matemático de Learning mediante análisis formal del espacio de parámetros Γ y del modelo de evidencia E. Sin APIs, interfaces, clases ni código.
- **Hallazgos clave — Espacio Γ**:
  - Γ = Γ_detect × Γ_select × Γ_compute (producto de subespacios independientes pero vinculados por consistencia).
  - Γ pertenece al modelo matemático (L está subdeterminada sin γ) y al runtime (como configuración estable, no dato variable).
  - Γ es parcialmente fijo (función de confianza) y parcialmente configurable (tipos de regularidad, umbrales). Nada es aprendible en el modelo mínimo.
  - γ cambia sin modificar Learning si γ ∈ Γ_configurable.
  - γ NO forma parte del contrato público de consumo (Goals). SÍ forma parte del contrato de despliegue (operador).
  - γ DEBE versionarse (hash o semver) para trazabilidad. Terna ⟨γ, W, M⟩ como unidad trazable.
  - Múltiples γ simultáneos: válido y necesario para shadow mode, A/B testing, multi-tenancy. Goals debe saber qué γ produjo cada M.
- **Hallazgos clave — Evidencia E**:
  - E es un CONJUNTO (no secuencia ni multiconjunto) de elementos de aridad k ⊆ W^k (k=1 para estado, k=2 para transición/dependencia, k≥3 para tendencia).
  - Cada e ∈ E es un testigo trazable a un snapshot específico (memoryId + turnNumber).
  - Relación de equivalencia E₁ ∼ E₂ definida formalmente. Clase canónica: E_canonical = unión de todos los equivalentes.
  - ℰ(W) tiene estructura de RETÍCULO DISTRIBUTIVO: ∪, ∩, complemento, ⊆. θ(E) = |E|/|W^k_τ| es función sobre el retículo.
  - Trazabilidad: elemento a elemento con E; sin E, el claim no es verificable independientemente.
  - Deduplicación: regla mínima (P₁=P₂ ∧ |E₁|=|E₂| ∧ θ₁=θ₂). Unificación de evidencia como extensión posible.
  - Almacenamiento: E puede omitirse si W persiste (reconstruible vía E_canonical). E es opcional en transmisión, obligatorio en auditoría.
- **Modelo completo**: L: 𝒲 × Γ → 𝒫(𝒞) con todas sus componentes definidas. PR-7A + PR-7B + PR-7C = modelo matemático cerrado.

### PR-7B — Learning Mathematical Model Audit
- **Tipo**: Auditoría matemática (Conceptual)
- **Documento**: `docs/architecture/PR-7B_LEARNING_MATHEMATICAL_MODEL.md`
- **Resumen**: Construcción del modelo matemático mínimo de Learning desde primeros principios. La palabra "Pattern" fue deliberadamente evitada durante toda la auditoría — el output se denominó exclusivamente como "objeto matemático de salida" u "O" hasta el veredicto final.
- **Hallazgos clave**:
  - **Dominio de entrada**: Sⁿ, secuencias ordenadas de snapshots en un espacio producto de 11 campos.
  - **Dominio de salida**: 𝒫(𝒞), conjunto potencia del espacio de claims.
  - **Unidad mínima**: c = ⟨P, θ, E⟩ — predicado de segundo orden, confianza, evidencia.
  - **Transformación**: L_γ = Select_γ ∘ Detect_γ, donde Detect = ⋃ detect_τ (unión de detectores por tipo de regularidad).
  - **Agrega o reorganiza?**: Compresión abstractiva con cambio de orden lógico (1° → 2°). Pierde información (Shannon), gana conocimiento (abstracción).
  - **Propiedades formales**: Pura ✅, Determinista ✅, NO monótona ❌, Idempotencia N/A (error de tipo), Composicional ✅, NO cerrada ❌, Trazable ✅.
  - **No-monotonicidad demostrada**: contraejemplo concreto — agregar s₃ invalida claim previo de estabilidad.
  - **Sin historial**: L(∅) = ∅. Sin datos no hay claims.
  - **Modificación vs reemplazo**: Solo reemplazo. Cada invocación produce conjunto nuevo. No existe operación de modificación.
  - **Retractación**: Implícita por reemplazo del conjunto completo. No hay retractación explícita.
  - **Origen de datos**: El modelo es agnóstico respecto del origen (ventana, conversación, historia). Virtualmente recomendado: ventana.
  - **Veredicto**: c = ⟨P, θ, E⟩ merece el nombre de Pattern. Es un objeto de segundo orden, generalizante, probabilístico, empírico, no monótono, e inmutable.

### PR-7A — Learning Ontology Audit
- **Tipo**: Auditoría ontológica (Conceptual)
- **Documento**: `docs/architecture/PR-7A_LEARNING_ONTOLOGY_AUDIT.md`
- **Resumen**: Auditoría ontológica de Learning desde primeros principios. Se demostró que Learning constituye una capa arquitectónica independiente del pipeline cognitivo, a diferencia de Reflection (eliminada en PR-6G). Se aplicaron los mismos 5 criterios que eliminaron Reflection: Learning pasa los 5 (nuevo tipo de conocimiento, diseño no determinista, ciclo de vida independiente, consumidor externo, boundary contractual). Reflection pasó 0/5.
- **Hallazgos clave**:
  - **Pattern** definido formalmente como ⟨F, R, c, W, K⟩ — campos involucrados, tipo de relación, confianza, ventana temporal, categoría semántica.
  - Pattern es conocimiento DERIVATIVAMENTE NUEVO (mismo patrón ontológico que cada capa del EE).
  - Diferenciación ontológica completa: Belief (hecho epistémico), Decision (hecho cognitivo), Pattern (tendencia probabilística), Goal (prescripción directiva).
  - 4 operaciones exclusivas de Learning: pattern detection, pattern selection, pattern categorization, cross-conversation accumulation.
  - 6 invariantes propuestos (L-1 a L-6) que deberán formalizarse en PR-7B.
  - 20 invariantes congelados (I1-EE a I6-EE + M-1 a M-14) mapeados y verificados.
  - 3 intentos de eliminación de Learning derrotados (patrones estáticos, absorción por Goals, "no produce decisiones").
  - Learning NO puede eliminarse como capa independiente.
- **Próximos pasos**: PR-7B (formalización de invariantes L-1 a L-6 + contrato entrada/salida), PR-7C (canal de consulta Memory → Learning), PR-7D (taxonomía RelationshipType y PatternCategory), PR-7E (coexistencia con Learning operacional ADR-003).

### PR-6G — ADR-011: Elimination of Reflection Layer
- **Tipo**: Arquitectura (Eliminación de componente)
- **ADR**: ADR-011 (nuevo)
- **Resumen**: Eliminación definitiva de Reflection como capa arquitectónica del pipeline cognitivo. 6 auditorías progresivas (PR-6A a PR-6F) demostraron que: (1) el kernel matemático de Reflection es zipWith(δ) — una función, no una capa; (2) no existe boundary contractual entre State y Change; (3) no existe independencia evolutiva que justifique una capa propia; (4) 10/10 dimensiones arquitectónicas no exigen mantener Reflection.
- **Hallazgos clave**:
  - δ (comparación semántica entre snapshots consecutivos) permanece como submódulo interno de Learning.
  - Learning consume ProjectedState[] directamente desde Memory.
  - La proyección de campos pertenece al contrato de salida de Memory, no a Reflection.
  - 0 invariantes de ADR-009 o ADR-010 se pierden.
  - 0 cambios de código requeridos.
  - Pipeline oficial: EE → Memory → Learning → Goals → Planning.
- **Archivos**: `docs/adr/011-reflection-elimination.md` (nuevo), `docs/certification/EVIDENCE_ONTOLOGY.md` (actualizado), `docs/project/PROJECT_BOARD.md` (D36 agregado), `docs/project/CHANGELOG.md` (esta entrada).
- **Verificación**: No aplica (conceptual). ADR-011 aceptado. Pipeline simplificado.

### PR-6H — Architecture Milestone v3.0
- **Tipo**: Hito Arquitectónico
- **Documento**: `docs/architecture/ARCHITECTURE_MILESTONE_v3.0.md`
- **Resumen**: Consolidación del estado arquitectónico completo post-PR-6. Documenta el pipeline cognitivo oficial actualizado (EE → Memory → Learning → Goals → Planning), las responsabilidades definitivas de cada capa, los 20 invariantes congelados, los cambios introducidos por ADR-011, los riesgos abiertos (incluyendo R1: Memory sin API de lectura, R4: Memory sin implementación), los supuestos explícitos, y 16 preguntas contractuales, de transformación, boundary, implementación y acoplamiento para PR-7 (Learning).
- **Verificación**: ADR-009, ADR-010 y ADR-011 conciliados. Ontología actualizada. Pipeline cognitivo oficial. Sin cambios de código.
- **Tipo**: Auditoría (Conceptual)
- **ADR**: ADR-010
- **Resumen**: Auditoría del contrato de integración entre la capa cognitiva Memory (ADR-010) y el orquestador `lead.service.ts`. Define el punto de integración exacto (después de `runShadowCognition()`, antes de `buildMemory()`/pipeline operacional), el flujo de datos (Belief + Decision → MemorySnapshot), 10 reglas de contrato (C1-C10), y 6 invariantes de integración (I1-MEM a I6-MEM). Verifica que la integración no viola el EE Freeze (ADR-009): no modifica `src/lib/evidence/`, no afecta el pipeline operacional, preserva Shadow Mode.
- **Hallazgos clave**:
  - `runShadowCognition()` actualmente descarta su valor de retorno — la integración requiere capturarlo
  - `buildMemory()` (operacional) y `memoryService.store()` (cognitivo) coexisten con diferentes fuentes y propósitos
  - `COGNITIVE_MEMORY_ENABLED` flag necesaria para mantener el patrón Shadow Mode
  - Memory debe vivir en `src/lib/memory/` (no en `src/lib/evidence/` ni `src/lib/services/memory/`)
  - 0 violaciones al EE Freeze identificadas
- **Archivos**: `docs/adr/010-memory-architecture.md` (nuevo, integra PR-5A + PR-5B + PR-5C), `docs/certification/EVIDENCE_ONTOLOGY.md` (actualizado con entidad Memory), `docs/project/PROJECT_BOARD.md` (D33-D35 agregados), `docs/project/CHANGELOG.md` (misión actual).
- **Verificación**: Build no aplica (conceptual). Contratos R1-R4 no aplican (sin código). ADR-010 aceptado. 14 invariantes Memory documentados. Ontología actualizada.

### PR-5B — Memory Semantic Contract Audit
- **Tipo**: Auditoría (Conceptual)
- **ADR**: ADR-010
- **Resumen**: Auditoría profunda del contrato semántico de Memory. Definición exacta del snapshot, unidad atómica (Belief+Decision pair), reglas de pertenencia de campos (11 belong, 14 excluded), análisis de deduplicación con Reflection/Learning/Goals/Planning (0 duplicación), 7 invariantes adicionales (M-8 a M-14) sobre los 7 originales (M-1 a M-7). 6 intentos de quiebre derrotados.
- **Hallazgos**: snapshot atómico validado, field belonging rules definidas, 0 duplicación con downstream layers, nuevos riesgos R9-R14 documentados.
- **Archivos**: Documentado en ADR-010 (sección PR-5B).
- **Verificación**: Snapshot contract sound — 6 break attempts failed. Invariants M-8 a M-14 formally defined.

### PR-5A — Memory Architectural Design
- **Tipo**: Arquitectura (Conceptual)
- **ADR**: ADR-010 (nuevo)
- **Resumen**: Primera etapa conceptual de la capa cognitiva Memory. Definición ontológica, problem statement, inputs/outputs/responsibilities, boundaries (depende solo de Belief + Decision, sirve a Reflection/Learning/Goals/Planning), lifecycle (post-turno, no pipeline), diferenciación de Knowledge/Belief/Decision/SessionMemory, 7 invariantes iniciales (M-1 a M-7), 8 riesgos (R1-R8), persistencia append-only.
- **Hallazgos clave**: Memory NO es parte del pipeline, NO produce cognición, NO retroalimenta al EE. ConversationId es EXCLUSIVAMENTE partition key. Memory existe después del turno cognitivo.
- **Archivos**: `docs/adr/010-memory-architecture.md` (nuevo).
- **Verificación**: Diseño conceptual validado contra ADR-009 (EE Freeze). 0 conflictos arquitectónicos identificados.

### PR-3E — Evidence Engine Architecture Freeze
- **Tipo**: Arquitectura (Freeze Declaration)
- **ADR**: ADR-009
- **Resumen**: Final audit de las 7 capas del Evidence Engine + resolución de los dos últimos blockers (S-1, O-1) + declaración oficial de Architecture Freeze. El Evidence Engine queda congelado como base para la siguiente generación cognitiva: Memory → Reflection → Learning → Goals → Planning.
- **S-1 — Signal future-date invariant**: `Signal.create()` valida que `receivedAt` no sea futuro. Lanza `SignalInvalidTimestampError` si lo es. `tryCreate()` retorna `null` en ese caso. Backward compatible.
- **O-1 — Observation temporal invariant**: `Observation.create()` acepta `signalReceivedAt?: Date` como contexto de validación (no se almacena ni serializa). Cuando se provee, verifica `validatedAt >= signalReceivedAt`. `fromSignal()` delega esta validación a `create()`.
- **Arquitectura Freeze**: Las 7 capas (Signal, Observation, Fact, Evidence, Knowledge, Belief, Decision) quedan congeladas. Cualquier modificación futura requiere ADR con evidencia. Los "campos anticipados" (evidenceId, knowledgeId, beliefId, provenance) quedan explícitamente justificados como parte del contrato arquitectónico.
- **Archivos**: `docs/adr/009-evidence-engine-architecture.md` (nuevo), `src/lib/evidence/signal.ts` (S-1), `src/lib/evidence/observation.ts` (O-1), `tests/unit/evidence/observation.test.ts` (test actualizado), `docs/project/PROJECT_BOARD.md`, `docs/project/CHANGELOG.md`, `docs/ROADMAP.md`, `docs/certification/TECHNICAL_DEBT_BASELINE.md`, `docs/certification/EVIDENCE_ONTOLOGY.md` (nuevo).
- **Verificación**: 378/378 tests de evidence PASS (19 files) ✅. `tsc --noEmit` sin errores nuevos en evidence ✅. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones.

### PR-3C — Decision Builder (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Construcción del séptimo y último objeto cognitivo del Evidence Engine: Decision a partir de Belief. Decision representa el compromiso cognitivo del sistema ("el sistema decide que..."). No selecciona políticas, rutas ni respuestas.
- **Decision entity**: Value Object inmutable con `validInput` (boolean desde Belief.observationValid), `readiness` (CognitiveReadiness desde Belief.isWellFormed), `missingInfo` (auto-diagnóstico de campos ausentes), `isDecided` (readiness === "ready"). `static fromBelief(belief)` factory.
- **buildDecision builder**: Builder protegido por `EVIDENCE_SHADOW_MODE`. Nunca lanza (retorna null si falla). Log `[EVIDENCE_DECISION]` en éxito, `[EVIDENCE] Failed to build Decision` en fallo.
- **Pipeline completo**: Message → Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision. Cadena cognitiva completa y operativa en Shadow Mode.
- **Archivos**: `src/lib/evidence/decision.ts` (nuevo), `src/lib/evidence/build-decision.ts` (nuevo), `src/lib/evidence/errors.ts` (+3 errores), `src/lib/evidence/index.ts` (exports), `tests/unit/evidence/decision.test.ts` (22 tests), `tests/unit/evidence/build-decision.test.ts` (10 tests).
- **Verificación**: 32/32 tests nuevos PASS ✅. 378/378 tests de evidence PASS. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones. Pipeline cognitivo completo en shadow mode.

### PR-3B — Belief Builder (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Construcción del sexto objeto cognitivo del Evidence Engine: Belief a partir de Knowledge. Belief representa el compromiso epistémico del sistema ("el sistema cree que..."). No infiere intención, origen ni destino.
- **Belief entity**: Value Object inmutable con `observationValid` (boolean desde Knowledge.observationStatus), `channel`, `hasContent`, `receivedAt`, `conversationId` (transferidos desde Knowledge), `isWellFormed` (core fields presentes). `static fromKnowledge(knowledge)` factory.
- **buildBelief builder**: Builder protegido por `EVIDENCE_SHADOW_MODE`. Nunca lanza (retorna null si falla). Log `[EVIDENCE_BELIEF]` en éxito, `[EVIDENCE] Failed to build Belief` en fallo.
- **Archivos**: `src/lib/evidence/belief.ts` (nuevo), `src/lib/evidence/build-belief.ts` (nuevo), `src/lib/evidence/errors.ts` (+3 errores), `src/lib/evidence/index.ts` (exports), `tests/unit/evidence/belief.test.ts` (23 tests), `tests/unit/evidence/build-belief.test.ts` (11 tests).
- **Verificación**: 34/34 tests nuevos PASS ✅. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones. Pipeline extendido: →Knowledge→Belief.

---

## 2026-07-12

### PR-3A — Evidence → Knowledge (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Primer comportamiento cognitivo implementado. Knowledge consolida Facts del Evidence en campos estructurados sin inferir nada nuevo. Pipeline completo: Message → Signal → Observation → Fact → Evidence → Knowledge.
- **Knowledge entity**: Value Object inmutable con consolidación de campos: observationStatus, channel, hasContent, receivedAt, conversationId. Extraídos de proposiciones de Facts por patrón de string. `static consolidate(evidence)` factory. `isFullyConsolidated` query. `toJSON()` serialization.
- **buildKnowledge builder**: Builder protegido por `EVIDENCE_SHADOW_MODE`. Nunca lanza (retorna null si falla). Log `[EVIDENCE_KNOWLEDGE]` en éxito, `[EVIDENCE] Failed to build Knowledge` en fallo.
- **ShadowResult extendido**: Nuevo campo `knowledge: Knowledge | null`. `isComplete` ahora requiere knowledge. `toSummary` incluye `Knowledge: ✓/✗`.
- **runShadowCognition extendido**: Stage 5 agrega `buildKnowledge(evidence)`.
- **Archivos**: `src/lib/evidence/knowledge.ts` (nuevo), `src/lib/evidence/build-knowledge.ts` (nuevo), `src/lib/evidence/errors.ts` (+3 errores), `src/lib/evidence/shadow-result.ts` (extendido), `src/lib/evidence/run-shadow-cognition.ts` (extendido), `src/lib/evidence/index.ts` (exports), tests (21+11+10 nuevos).
- **Verificación**: 42/42 tests nuevos PASS ✅. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones. 338/338 tests de evidence PASS. Cero impacto funcional, cero cambio conversacional.

### PR-2F — Shadow Mode Observable (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Shadow mode cognitivo unificado en un solo entry point `runShadowCognition()`. Crea `ShadowResult` como contenedor inmutable observable (Signal, Observation, Fact[], Evidence). Feature flag `EVIDENCE_SHADOW_LOGGING` para logging compacto de desarrollo. Reduce 4 llamadas separadas a 1 en lead.service.ts.
- **Arquitectura**: `runShadowCognition` orquesta Signal→Observation→Fact→Evidence, retorna ShadowResult o null. ShadowResult es inmutable (Object.freeze), serializable vía toSummary(). Nunca lanza, nunca persiste, nunca afecta el pipeline.
- **Features**:
  - `ShadowResult` class — contenedor inmutable con queries (isComplete, factCount, toSummary)
  - `runShadowCognition` — coordinador cognitivo puro, un solo punto de entrada
  - `isShadowLoggingEnabled()` — feature flag `EVIDENCE_SHADOW_LOGGING` (env var, default false)
  - Logging compacto: `[SHADOW] Signal ✓ | Observation ✓ | Facts: 4 | Evidence: ✓`
- **Archivos**: `src/lib/evidence/shadow-result.ts` (nuevo), `src/lib/evidence/run-shadow-cognition.ts` (nuevo), `src/lib/evidence/index.ts` (exports actualizados), `src/lib/services/lead.service.ts` (simplificado), `tests/unit/evidence/shadow-result.test.ts` (8 tests), `tests/unit/evidence/run-shadow-cognition.test.ts` (12 tests), `tests/integration/evidence-shadow-mode.test.ts` (expandido +6 tests).
- **Verificación**: 26/26 tests nuevos PASS ✅. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones. 295/295 tests de evidence PASS.

### PR-2C — Observation Builder (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Construcción del segundo objeto cognitivo del Evidence Engine: Observation (status='valid') a partir de Signal. No depende de core(), analysis, intent, extracción ni LLM. Guardado por feature flag `EVIDENCE_SHADOW_MODE` (env var, default false). Nunca lanza, nunca interrumpe el pipeline.
- **Archivos**: `src/lib/evidence/build-observation.ts` (nuevo), `src/lib/evidence/index.ts` (export), `src/lib/services/lead.service.ts` (integración en pipeline), `tests/unit/evidence/build-observation.test.ts` (11 tests), `tests/integration/evidence-shadow-mode.test.ts` (expandido +10 tests).
- **Verificación**: 21/21 tests nuevos PASS ✅. Build compila ✅. Contratos PASS ✅. 0 regresiones (1106/1107 tests PASS, única falla pre-existente fase-22 T2 no relacionada).

### PR-2E — Evidence Builder (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Construcción del cuarto objeto cognitivo del Evidence Engine: Evidence a partir de Observation + Facts. Evidence encapsula Facts sin enriquecerlos ni generar nuevos. `type: 'user_input'`, `provenance: []`. Cadena completa operativa: Message → Signal → Observation → Fact → Evidence.
- **Archivos**: `src/lib/evidence/build-evidence.ts` (nuevo), `src/lib/evidence/index.ts` (export), `src/lib/services/lead.service.ts` (integración en pipeline), `tests/unit/evidence/build-evidence.test.ts` (13 tests), `tests/integration/evidence-shadow-mode.test.ts` (expandido +5 tests).
- **Verificación**: 18/18 tests nuevos PASS ✅. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones (1137/1138 tests PASS, única falla pre-existente fase-22 T2 no relacionada).

### PR-2D — Fact Builder (Evidence Engine)
- **Tipo**: Feature (Shadow Mode)
- **Resumen**: Construcción del tercer objeto cognitivo del Evidence Engine: Facts estructurales a partir de Observation. Observation es la única fuente epistémica. Signal provee contexto estructural (canal, contenido, timestamp). No depende de core(), analysis, intent, extracción ni LLM.
  - **5 Facts estructurales**: (1) observation validated, (2) signal received via channel, (3) message content present, (4) received timestamp, (5) conversation identified.
  - Sin Facts semánticos (origen, destino, intención, etc.) — eso es para PR-3+.
- **Archivos**: `src/lib/evidence/build-fact.ts` (nuevo), `src/lib/evidence/index.ts` (export), `src/lib/services/lead.service.ts` (integración en pipeline), `tests/unit/evidence/build-fact.test.ts` (18 tests), `tests/integration/evidence-shadow-mode.test.ts` (expandido +11 tests).
- **Verificación**: 29/29 tests nuevos PASS ✅. Build compila ✅. Contratos R1-R4 PASS ✅. 0 regresiones (1124/1125 tests PASS, única falla pre-existente fase-22 T2 no relacionada).

## 2026-07-10

### F2 — Architecture Documentation Synchronization
- **Tipo**: Documentación
- **Resumen**: Auditoría completa de toda la documentación contra el código actual. 8 auditorías ejecutadas. Se corrigieron inconsistencias en ADR-007 (status "Propuesto" → "Accepted"), ADR_INDEX.md (entradas faltantes), architecture.md (diagrama de pipeline obsoleto), decision-architecture.md (intents incorrectos, falta StrategyDecision), system-map.md (paths y line counts desactualizados), operational-model.md (falta SD en pipeline). Se crearon 3 documentos nuevos: strategy-decision.md, handler-context.md, conversation-pipeline.md. Se actualizaron PROJECT_BOARD.md, CHANGELOG.md, DECISION_OWNERSHIP_MATRIX.md, DIAGRAMS.md. Se crearon 3 diagramas nuevos.
- **Archivos**: ADR-007, ADR_INDEX.md, architecture.md, decision-architecture.md, system-map.md, operational-model.md (actualizados). strategy-decision.md, handler-context.md, conversation-pipeline.md, diagrams/17-*, 18-*, 19-* (nuevos). PROJECT_BOARD.md, CHANGELOG.md, DECISION_OWNERSHIP_MATRIX.md, DIAGRAMS.md (actualizados).
- **Verificación**: Build ✅, 875/876 tests ✅, contratos ✅.

### D18 — Post-Freeze Compliance Audit
- **Tipo**: Auditoría
- **Resumen**: 7 audits ejecutados post-freeze. Verificación de que ADR-007 está 100% implementado y no hay violaciones de contrato. Veredicto: ✅ ADR-007 FULLY ENFORCED. 0 contract violations. Risk: LOW.

### F1 — Architecture Integration Validation
- **Tipo**: Validación
- **Resumen**: Pipeline completo trazado desde webhook hasta respuesta final. StrategyDecision lifecycle verificado (creación → propagación → consumo). HandlerContext trace completo. 7 auditorías: Pipeline Integrity ✅, StrategyDecision Trace ✅, HandlerContext Trace ✅, Contracts ✅, Dead Code ✅, Pipeline Integrity ✅, ADR-008 Compliance ✅. Veredicto: ✅ ARCHITECTURE INTEGRATION PASS.

### ADR-008 + Architecture Milestone v2.0
- **Tipo**: ADR + Documentación
- **Resumen**: ADR-008 creado y ACCEPTED. Normative contract para Conversational Decision Architecture. Architecture Freeze declarado. Milestone v2.0 documentado. ADR_INDEX.md actualizado.

### R5 Phase 2 — StrategyDecision Activation (Architecture Freeze)
- **Tipo**: Refactor + Cleanup + Congelamiento
- **Commit**: —
- **Resumen**: Ejecución del plan D17. Estrategia híbrida eliminada. StrategyDecision es la ÚNICA fuente de verdad para todas las decisiones estratégicas. Architecture Freeze activado.
  - **Fallbacks eliminados**: 5 `??` en policies removidos (FB1-FB5: inhibitNewBooking ×2, skipFieldResolution, preserveContext, inhibitBookingAccept). Ya no se leen señales originales (messageType, clientObjective, isCorrection) como fallback.
  - **LLM prompt**: responseLength, reassuranceNeeded, callToAction, tone inyectados como contexto estratégico en `buildResponsePrompt()`.
  - **Handler log**: greetingLength agregado al log [STRATEGY].
  - **D17 audit verificado**: 0 decisiones fuera de computeStrategyDecision(). 8 campos computados consumidos o expuestos.
  - **Architecture Freeze**: Cualquier cambio arquitectónico futuro requiere ADR con evidencia. Sin nuevos fields/types/domains sin ADR.
- **Archivos**: types.ts (strategyDecision opcional sin fallback), handler.ts (ctx creation ordenada), policy-ahora.ts (2 fallbacks → StrategyDecision), policy-reserva.ts (3 fallbacks → StrategyDecision), llm-response.ts (inyección de contexto SD).
- **Verificación**: 875/876 tests ✅ (0 regresiones — única falla pre-existente T2 fase-22 no relacionada), build ✅, contratos R1-R4 ✅.

### R4 Phase 1 — Field Priority Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Auditoría exhaustiva de 20 concerns de field priority (resolveNextRequiredField, evaluateCompleteness, slot-workflow, slot-state, requiresConfirmation, minimizeQuestions, inferMissingFieldFromCore, evaluateCompleteness domain-info, etc.). Implementación Phase 1: `fieldAcquisitionMode` ("skip"|"minimal"|"normal") + `fieldPriority` poblado en `StrategyDecision`. Computado desde `computeStrategyDecision()`.
  - **fieldAcquisitionMode** → "skip" si booking_urgent/cancel/emergency, "minimal" si speed=fast, "normal" si slow/normal
  - **fieldPriority** → orden canónico: ["origin","destination","passengers","scheduled_at"]. Vacío en skip, solo ["origin","destination"] en minimal
- **Auditoría**: 20 concerns encontrados. 2 centralizados en StrategyDecision. 12 permanecen locales (field-resolver, slot-workflow, slot-state, evaluate-completeness, comprehension). 6 ya migrados en R1-R3 (skipFieldResolution, inhibitBookingAccept, inhibitNewBooking, minimizeQuestions, skipConfirmation, fieldPriority skeleton).
- **Evaluación reorganización StrategyDecision**: ~20 fields. Se recomienda reorganizar en subobjetos en R5.
- **Archivos**: types.ts, conversation-strategy.ts, handler.ts (log).
- **Verificación**: 873/876 tests ✅ (0 regresiones nuevas — 3 pre-existing failures), build ✅, contratos R1-R4 ✅.

### R3 Phase 1 — Conversation Tone Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Auditoría completa de 14 concerns de tono conversacional (CLIENT_OBJ_RULES, MODE_RULES, engagementLevel, sentimentRisk, greeting variations, sentence count, etc.). Implementación Phase 1: `responseLength` ("short"|"normal"|"detailed"), `reassuranceNeeded` (boolean), `callToAction` ("none"|"soft"|"direct") añadidos a `StrategyDecision` y computados desde `computeStrategyDecision()`. Comportamiento observable idéntico.
  - **responseLength** → "short" si cancel/urgent/CLARIFY, "detailed" si ANSWER, "normal" en otros casos
  - **reassuranceNeeded** → true si clientObjective=trust_check
  - **callToAction** → "none" si cancel/inquiry_price/info_request/trust_check, "direct" si BOOKING/NOW/booking_urgent, "soft" si PRE_BOOKING/comparing_options
- **Auditoría**: 14 concerns de tono encontrados. 3 centralizados en StrategyDecision. 11 permanecen locales: 5 en llm-response.ts (CLIENT_OBJ_RULES, MODE_RULES), 4 en response-builder (greeting/builders), 2 en laterals (engagementLevel, sentimentRisk).
- **Evaluación reorganización StrategyDecision**: Crecimiento controlado (~18 fields). Se recomienda reorganizar en subobjetos (conversation/interaction/execution) en R5 (cleanup phase) si el tamaño sigue creciendo. Por ahora, mantener plano es más simple y no añade costo.
- **Archivos**: types.ts, conversation-strategy.ts, handler.ts (log).
- **Verificación**: 875/876 tests ✅ (mismo pre-existing failure), build ✅, contratos R1-R4 ✅.

### R2 Phase 1 — Conversation Speed Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Auditoría completa de 12 concerns de velocidad conversacional. Implementación Phase 1: `greetingLength` ("short"|"full"), `behaviorFlags.skipConfirmation` y `behaviorFlags.minimizeQuestions` añadidos a `StrategyDecision` y computados desde `computeStrategyDecision()`. Campos propagados via HandlerContext con fallbacks. Comportamiento observable idéntico.
  - **greetingLength** → "short" si speed=fast (cancel, urgent), "full" si normal/slow
  - **skipConfirmation** → true si speed=fast + (skipFieldResolution | inhibitNewBooking)
  - **minimizeQuestions** → true si speed=fast
- **Auditoría**: 12 concerns encontrados. 3 centralizados en StrategyDecision. 7 permanecen locales (field-resolver, lead.service, policy-pipeline, llm-response, execution metadata). 2 ya migrados en R1 (skipFieldResolution, skipLLM).
- **Archivos**: types.ts, conversation-strategy.ts.
- **Verificación**: 875/876 tests ✅ (mismo pre-existing failure), build ✅, contratos R1-R4 ✅.

### R1 Phase 1 — Strategy Decision Refactor
- **Tipo**: Refactor + Centralización
- **Commit**: —
- **Resumen**: Nueva función pura `computeStrategyDecision()` en `conversation-strategy.ts` que sintetiza señales existentes (purchaseIntent, urgency, clientObjective, messageType) en un `StrategyDecision` con mode, tone, speed, fieldPriority y 6 behaviorFlags. Migración gradual manteniendo comportamiento observable idéntico:
  - **purchaseIntent** → `behaviorFlags.skipLLM` (reemplaza isLowIntent en handler.ts LLM gating)
  - **urgency** → integrado upstream vía clientObjective, reservado para uso directo futuro
  - **clientObjective (booking_urgent)** → `behaviorFlags.skipFieldResolution` (policy-ahora dispatch directo)
  - **clientObjective (inquiry_price)** → `behaviorFlags.inhibitBookingAccept` (policy-reserva guard)
  - **messageType (cancel)** → `behaviorFlags.inhibitNewBooking` (ambas policies)
  - **isCorrection** → `behaviorFlags.preserveContext` (policy-reserva)
- **Archivos**: types.ts, conversation-strategy.ts (nuevo), handler.ts, policy-ahora.ts, policy-reserva.ts.
- **Verificación**: 875/876 tests ✅ (mismo pre-existing failure), build ✅, contratos R1-R4 ✅.

---

## 2026-07-08

### E12 — Client Objective Model (P3-06)
- **Tipo**: Implementación
- **Commit**: —
- **Resumen**: Nuevo módulo `client-objective.ts` (pure function `computeClientObjective`) que sintetiza señales existentes (facts, purchaseIntent, messageType) en `ClientObjective`: booking_urgent, booking_future, booking_generic, inquiry_price, comparing_options, trust_check, info_request, cancelling, none. Integrado en handler.ts → enrichedCtx, observable en policies, inyectado en prompt de LLM. Incluye nueva detección trust_check (no existía señal previa). booking_urgent salta field resolution en policy-ahora (dispatch directo). inquiry_price inhibe booking accepted en policy-reserva.
- **Archivos**: client-objective.ts (nuevo), types.ts, handler.ts, policy-ahora.ts, policy-reserva.ts, llm-response.ts.

### E11-B Implementation — urgency + CI classification en Policy
- **Tipo**: Implementación
- **Commit**: —
- **Resumen**: P2-14 urgency expuesto como señal independiente en HandlerContext/Policy (no solo fusionado en TemporalMode). P2-15 CI MessageType (cancel, correction) conectado a decisiones de Policy. 4 archivos modificados: types.ts, handler.ts, policy-ahora.ts, policy-reserva.ts.

### E11-B — Semantic Signals Remaining Audit
- **Tipo**: Auditoría
- **Resumen**: 24 señales evaluadas. 2 nuevas tareas P2 creadas (urgency a Policy, CI classification a decisiones). slotAssignmentConfidence, commercial/informational facts descartados para Policy.

### E11 C1-C2 — purchaseIntent conectado a Policy
- **Tipo**: Conectar
- **Commit**: —
- **Resumen**: purchaseIntent (high/medium/low) ahora fluye de CORE a HandlerContext y policies. Observable en [POLICY_ahora] y [POLICY_reserva]. Base para adaptación UX por intención de compra.

### AEL Backlog Consistency Audit
- **Tipo**: Auditoría
- **Resumen**: 8 gaps reales detectados en PROJECT_BOARD. 2 items marcados DONE (P1-01, P1-02). 4 P2 + 4 P3 agregados al backlog.

### AEL-H1 — Harness Evolution
- **Commit**: `11e6231`
- **Tipo**: Infraestructura
- **Resumen**: Keeper extendido para PROJECT_BOARD/CHANGELOG. Analyst para principle alignment. Director con checklist de cierre de misión.

### E6/E9/E10 — Conversational Alignment Audits
- **Tipo**: Auditoría
- **Resumen**: 6 hallazgos E6, 3 E9, 2 E10. Matriz de 17 principios conversacionales generada.

### RC2 — Conversation Interpreter
- **Commit**: `3080686`
- **Tipo**: Release
- **Resumen**: ADR-007 implementado. Conversation Interpreter (100L, función pura, 12 MessageTypes). B3 fix en entity-extractor. AEL-H1 completado.

### ADR-007 — Conversation Interpreter
- **Tipo**: ADR
- **Decisión**: Crear Conversation Interpreter como etapa del pipeline entre CORE y Extraction
- **Impacto**: Nuevo componente. Previene B3 y familia de bugs en origen.

### G1 — Stabilization Milestone
- **Commit**: `08ce37e`
- **Tipo**: Release
- **Resumen**: Cierre de hardening. Lead service 752→264 (−65%). 875/876 tests. 5 módulos workflow extraídos.

### A6 — Lead Service Final
- **Commit**: `08ce37e`
- **Tipo**: Refactor
- **Resumen**: Extraer slot-confirmation-text-handler (97L). Lead service ahora es fachada pura.

### A5 — Awaiting Confirmation Handler
- **Commit**: `08ce37e`
- **Tipo**: Refactor
- **Resumen**: Extraer handleAwaitingConfirmation (70L).

### P3.1 — Repository Hygiene Audit
- **Tipo**: Auditoría
- **Resumen**: 3 .gitignore, 55 JSON, 0 residuales. Apto para commit.

### P3 — Repository Hardening Final
- **Tipo**: Auditoría + Cleanup
- **Resumen**: Secretos redactados. 4 etiquetas "Hardening" eliminadas de código.

### B3 — Slot Merge Bug Audit
- **Tipo**: Auditoría
- **Resumen**: Causa raíz: entity-extractor asigna fuzzy match a destination por default.

### QA1 — Functional Certification
- **Tipo**: Certificación
- **Resumen**: 875/876 tests. Cobertura por escenario. Listo para piloto condicional.

### OPS1 — Production Readiness
- **Tipo**: Operaciones
- **Resumen**: 4 ERROR, 5 WARNING. ADMIN_API_KEY + SENTRY_DSN bloqueantes.

### RC1 — Release Candidate
- **Commit**: `c09a2c7`
- **Tipo**: Release
- **Resumen**: Build ✅, 875/876 tests, R1-R4 ✅, 144 archivos, +9114/−2398 líneas.
