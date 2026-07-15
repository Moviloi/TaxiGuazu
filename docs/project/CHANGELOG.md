# CHANGELOG — AITOS
## 2026-07-08 onward

---

## 2026-07-14 (current)

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
- **Archivos**: `docs/adr/011-reflection-elimination.md` (nuevo), `docs/certification/ONTOLOGY.md` (actualizado), `docs/project/PROJECT_BOARD.md` (D36 agregado), `docs/project/CHANGELOG.md` (esta entrada).
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
- **Archivos**: `docs/adr/010-memory-architecture.md` (nuevo, integra PR-5A + PR-5B + PR-5C), `docs/certification/ONTOLOGY.md` (actualizado con entidad Memory), `docs/project/PROJECT_BOARD.md` (D33-D35 agregados), `docs/project/CHANGELOG.md` (misión actual).
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
- **Archivos**: `docs/adr/009-evidence-engine-architecture.md` (nuevo), `src/lib/evidence/signal.ts` (S-1), `src/lib/evidence/observation.ts` (O-1), `tests/unit/evidence/observation.test.ts` (test actualizado), `docs/project/PROJECT_BOARD.md`, `docs/project/CHANGELOG.md`, `docs/ROADMAP.md`, `docs/certification/TECHNICAL_DEBT_BASELINE.md`, `docs/certification/ONTOLOGY.md` (nuevo).
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
