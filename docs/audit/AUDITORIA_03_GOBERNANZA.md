# Auditoría #03 — Gobernanza Evolutiva

> **Fecha:** 2026-07-11
> **Modelo de referencia:** Auditoría #02 — Modelo Cognitivo Ideal (Evidence Store + Hypothesis Network)
> **Alcance:** PROJECT_BOARD, ROADMAP, BACKLOG, ADR-001—008, knowledge docs
> **Método:** Clasificación conceptual contra el modelo cognitivo ideal, no contra código

---

## 1. Clasificación del backlog completo

### Leyenda

| Icono | Significado |
|-------|-------------|
| 🟢 | Sigue vigente |
| 🟡 | Sigue vigente pero debe redefinirse |
| 🟠 | Debe fusionarse con otra |
| 🔴 | Quedó obsoleta |
| ⚫ | Absorbida por otra arquitectura |
| ✅ | Ya completada |

---

### 1.1 PROJECT_BOARD — P0 (Bloqueantes)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| P0-01 | Rotar ADMIN_API_KEY | 🟢 | Operaciones. Ortogonal al modelo cognitivo. |
| P0-02 | Configurar SENTRY_DSN | 🟢 | Operaciones. |
| P0-04 | Seed choferes reales | 🟢 | Operaciones. |
| P0-03 | connection_cache sin CREATE TABLE | 🟢 | Bug fix. |

### 1.2 PROJECT_BOARD — P1 (Alta)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| P1-01 | Conversation Interpreter | ✅ | DONE |
| P1-02 | Fix entity-extractor | ✅ | DONE |
| P1-03 | Deshabilitar auto-insert aliases | 🟡 | En modelo ideal, fuzzy match genera evidencia de baja confianza, no se "inserta". La tarea debe redefinirse como "clasificar evidencia fuzzy por confianza". |
| P1-04 | Cerrar fase-22 T2 (preservar origin) | 🟡 | En modelo ideal no hay "corrección parcial" — la evidencia es inmutable, la proyección se recalcula. La decisión actual es irrelevante. Redefinir como "definir política de proyección desde evidencia". |
| P1-05 | placeIdCache sin invalidación | 🟢 | Cache. Ortogonal. |
| P1-06 | is_principal2 nunca se escribe | 🟢 | Bug DB. |
| P1-07 | Configurar LOG_LEVEL | 🟢 | Ops. |
| P1-08 | PAIR_BASE / CORRIDOR_PAIRS a DB | 🟡 | Debe redefinirse como "poblar Evidence Store con conocimiento geográfico semilla", no como migración a tabla relacional. |
| P1-09 | ENTITY_CATALOG a DB | 🟡 | Debe redefinirse como "knowledge base para Hypothesis Network", no como tabla. |

### 1.3 PROJECT_BOARD — P2 (Media)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| P2-01 | Eliminar dual engine v2 | 🟢 | Pricing. Vigente. |
| P2-02 | LRU cache resolveLocation | 🟢 | Cache. Ortogonal. |
| P2-03 | Dropear tablas dead | 🟢 | Higiene DB. |
| P2-04 | Dropear columnas fantasma | 🟢 | Higiene DB. |
| P2-05 | DEBT-02: survey→lead | 🟢 | Acoplamiento. Vigente. |
| P2-06 | Completar i18n | 🟢 | Vigente. |
| P2-07 | Fix type/DDL mismatches | 🟢 | Bug. |
| P2-08 | Human Layer templates | 🟡 | Redefinir: "Human Layer" debe ser parte de Operational Projection, no templates aislados. La variación debe guiarse por evidencia, no por catálogo. |
| P2-09 | Métricas experiencia conversacional | 🟡 | Redefinir: deben medir calidad de evidencia y precisión de proyección, no solo satisfacción. |
| P2-10 | Persistir last_intent | 🔴 | **OBSOLETA.** En modelo ideal no existe "last_intent". El Intent Stack mantiene todas las intenciones activas con probabilidades. Persistir solo la última destruye información. |
| P2-11 | purchaseIntent a Policy | ✅ | DONE |
| P2-12 | Formalizar post_booking state | 🔴 | **OBSOLETA.** En modelo ideal no hay "post_booking state". El estado se deriva de la evidencia acumulada (trip creado + precio confirmado + chofer asignado). No hay state machine que mantener. |
| P2-13 | Inferencia semántica en CI | 🟡 | Redefinir: debe ser el núcleo del Hypothesis Network, no una etapa del pipeline. |
| P2-14 | urgency fact | ✅ | DONE |
| P2-15 | CI classification.type | ✅ | DONE |

### 1.4 PROJECT_BOARD — P3 (Baja)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| P3-01 | Hotspots >400L | 🟢 | Refactor. Vigente. |
| P3-02 | Cobertura Survey/Admin | 🟢 | Testing. |
| P3-03 | iguazu-knowledge a Turso | 🔴 | **OBSOLETA.** El conocimiento base debe vivir en la Evidence Store como hechos semilla inmutables, no en tablas relacionales. Mover a Turso sería replicar el antipatrón actual. |
| P3-04 | DEBT-04 a DEBT-11 | 🟡 | Redefinir: fragmentar DB facade sigue vigente, pero la prioridad cambia — debe hacerse post-Evidence Store. |
| P3-05 | FUT-01 a FUT-10 | ⚫ | Absorbidas. Deben reorganizarse por épicas cognitivas (ver sección 4). |
| P3-06 | Client Objective | ✅ | DONE |
| P3-07 | Trip bundles en Turso | 🟢 | Negocio. Vigente. |
| P3-08 | Smart fill múltiples slots | 🔴 | **OBSOLETA.** En modelo ideal los slots son proyección de evidencia. No se "llenan" — se infieren probabilísticamente. La tarea asume que los slots son contenedores vacíos que hay que completar. |
| P3-09 | No preguntar passengers si flat | 🟢 | UX. Vigente. |

### 1.5 BACKLOG — AITOS Plan (G.0 P0 Paralelo)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-001 | KNOWN_POIS customs/border | ✅ | DONE |
| AIT-002 | Aliases EN/PT | ✅ | DONE |
| AIT-003 | Persistir lang | ✅ | DONE |
| AIT-004 | HMAC hardening | ✅ | DONE |
| AIT-005 | Rate limiting | ✅ | DONE |
| AIT-006 | Re-prompt LLM antes escalar | 🟡 | Redefinir: debe ser el Reconstruction Engine pidiendo más evidencia, no un parche en comprehension-runner. El re-prompt debe basarse en qué evidencia falta y cuánto cuesta obtenerla. |

### 1.6 BACKLOG — AITOS Plan (G.1 P0 Dominio)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-010 | Modelar dominio Trip | 🟡 | Redefinir: debe modelarse como "conjunto de evidencia que constituye un viaje", no como state machine. El lifecycle es una proyección, no el modelo canónico. |
| AIT-011 | Modelar dominio Dispatch | 🟡 | Redefinir: mismo cambio. La asignación de choferes debe basarse en Commitment Model, no en escalación secuencial fija. |
| AIT-012 | Modelar dominio Pricing | 🟡 | Redefinir: debe incorporar Cost of Error Engine. Pricing no es solo tarifa — es el costo de estar equivocado sobre el destino/hora. |
| AIT-013 | Modelar dominio Geo | 🟡 | Redefinir: geo debe alimentar la Evidence Store con conocimiento posicional, no ser un resolver stateful. |
| AIT-014 | Modelar dominio Session | 🔴 | **OBSOLETA.** En modelo ideal no hay "session state". Hay evidencia acumulada por phone. Las 17 columnas de chat_sessions se disuelven en Evidence Store + Operational Projection. |
| AIT-015 | Glosario unificado | 🟢 | Vigente. Urgente incluso. |

### 1.7 BACKLOG — AITOS Plan (G.2 P1 Tools)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-020 | Tool Geo contrato | 🟡 | Redefinir: la tool debe emitir evidencia (con confianza, fuente, timestamp) no solo un resultado. El contrato actual es state-oriented. |
| AIT-021 | Tool Pricing contrato | 🟡 | Redefinir: debe incluir signature de Cost of Error (qué tan seguro es este precio dadas las evidencias actuales). |
| AIT-022 | Tool Dispatch | 🟢 | Vigente. |
| AIT-023 | Tool Fleet | 🟢 | Vigente. |
| AIT-024a-d | Integrar tools en policy-pipeline | 🟡 | Redefinir: asume que policy-pipeline sigue existiendo. Deben integrarse en el nuevo pipeline cognitivo. |
| AIT-025 | Tests de contrato | 🟢 | Vigente. |

### 1.8 BACKLOG — AITOS Plan (G.3 P1 Knowledge)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-030 | Knowledge geo | ✅ | DONE |
| AIT-031 | Knowledge ops | ✅ | DONE |
| AIT-032 | Knowledge comercial | ✅ | DONE (Fase A) |
| AIT-033 | Knowledge policies | ✅ | DONE |
| AIT-034 | Versionado knowledge | ✅ | DONE |

### 1.9 BACKLOG — AITOS Plan (G.4 P2 Events)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-040 | Schema eventos Trip | ✅ | DONE |
| AIT-041 | Schema eventos Dispatch | 🟡 | Redefinir: debe alinearse con el modelo de Evidence Store (event_type canónico, payload evidencia, source chain). |
| AIT-042 | Event logger Trip | ✅ | DONE |
| AIT-043 | Event logger Dispatch | ✅ | DONE |
| AIT-044 | Proyección Trip desde eventos | 🟡 | Redefinir: precursor correcto del Reconstruction Engine. Debe GENERALIZARSE a todo el estado cognitivo (intenciones, slots, confianzas), no limitarse a Trip. |

### 1.10 BACKLOG — AITOS Plan (G.5 P2 Observabilidad)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-050 | Sentry | ✅ | DONE |
| AIT-051 | Métricas negocio | ✅ | DONE |
| AIT-052 | Sistema de evals | ✅ | DONE |
| AIT-053 | Logging estructurado | 🟢 | Vigente. |

### 1.11 BACKLOG — AITOS Plan (G.6 P3 OI Layer)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| AIT-060 | Inferencia aeropuerto | ✅ | DONE |
| AIT-061 | Inferencia horario | ✅ | DONE |
| AIT-062 | Inferencia frontera | 🟡 | Redefinir: debe usar Hypothesis Network con probabilidades, no reglas if/else. La inferencia actual es determinista — no captura el caso "70% lado argentino, 30% lado brasileño". |
| AIT-063 | UI confirmación unificada | 🟡 | Redefinir: debe ser "Commitment UI" que muestre nivel de evidencia + umbral de compromiso, no solo botones Sí/No. El usuario debe poder ver cuán seguro está el sistema. |
| AIT-064 | Learning loop | 🟡 | Redefinir: debe ser aprendizaje de la Hypothesis Network (ajustar pesos probabilísticos basados en outcomes), no weight adjustment sobre reglas fijas. |

### 1.12 BACKLOG — GAPs

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| GAP-01 | Flota no validada en pipeline | 🟢 | Vigente. |
| GAP-02 | executeDispatch directo | 🟢 | Vigente. |
| GAP-03 | transport/practical | 🟢 | Vigente. |
| GAP-04 | field-resolver prioridades | 🟡 | Redefinir: debe ser parte de Evidence Priority, no de un resolver de campos. La prioridad de qué preguntar debe basarse en qué evidencia falta y cuánto cuesta obtenerla (Cost of Error). |
| GAP-06 | DispatchOffered broadcast | 🟢 | Vigente. |
| GAP-07 | Falso positivo FRUSTRATION_RE | 🟢 | Bug. Vigente. |

### 1.13 BACKLOG — DEBTs

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| DEBT-01 | AFFIRMATION_RE | ✅ | DONE |
| DEBT-02 | survey→lead | 🟢 | Vigente. |
| DEBT-03 | guard.ts state | ✅ | DONE |
| DEBT-04 | Fragmentar database.ts | 🟡 | Redefinir: debe hacerse como parte de la construcción de Evidence Store, no como refactor aislado. El orden importa. |
| DEBT-05 | lead.service acoplamiento | 🟡 | Redefinir: lead.service será reemplazado. Invertir en reducir su acoplamiento es trabajo perdido si el plan es reemplazarlo. |
| DEBT-06 | i18n inline | 🟢 | Vigente. |
| DEBT-07 | response-builder | 🟢 | Vigente. |
| DEBT-08 | policy-pipeline.ts acoplamiento | 🟡 | Redefinir: mismo problema que DEBT-05. policy-pipeline será reemplazado. |
| DEBT-09 | Auditoría DB access | 🟢 | Vigente. |
| DEBT-10 | seed-data.ts cobertura | 🟢 | Vigente. |
| DEBT-11 | policy-pipeline conversion | ⚫ | Absorbida. El nuevo pipeline cognitivo elimina la necesidad. |
| DEBT-12 | Schema drift | ✅ | DONE |
| DEBT-13 | Nombres tabla con tags | 🟢 | Higiene. Vigente. |

### 1.14 BACKLOG — FUTs

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| FUT-01 | i18n framework | 🟢 | Vigente. |
| FUT-02 | Transcripción audios | ✅ | DONE |
| FUT-03 | Mensajes multimedia | 🟢 | Vigente. |
| FUT-04 | Re-engagement | 🟡 | Redefinir: debe ser parte del Commitment Engine. Cuándo re-engager = cuándo el costo de perder al cliente supera el costo de preguntar. |
| FUT-05 | Observabilidad | ✅ | DONE (parcial) |
| FUT-06 | Split +6 pasajeros | 🟢 | Negocio. |
| FUT-07 | Calendario festivos | 🟡 | Redefinir: debe ser evidencia semilla en Evidence Store, no features sueltos. |
| FUT-08 | Chat intermediado | 🟢 | Negocio. |
| FUT-09 | Contingencia DB | 🟢 | Resiliencia. |
| FUT-10 | Disponibilidad chofer | 🟡 | Redefinir: debe ser evidencia en tiempo real en la Hypothesis Network, no una consulta point-in-time. |

### 1.15 ROADMAP — Fase 1 (Estabilización)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| I1.1 | Cerrar fase-22 T2 | 🟡 | Redefinir: la decisión "preservar origin" es irrelevante — la evidencia nunca se pierde. El test que falla debería medir consistencia de proyección, no comportamiento de corrección parcial. |
| I1.2 | Ownership updateTripTariff | 🟢 | Vigente. |
| I1.3 | Eliminar survey→lead | 🟢 | Vigente. |
| I1.4 | Renombrar tablas con tags | 🟢 | Higiene. |

### 1.16 ROADMAP — Fase 2 (Refactorización)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| I2.1 | Split Lead Service | 🔴 | **OBSOLETA.** Lead service será reemplazado por el nuevo pipeline cognitivo. Refactorizarlo ahora es invertir en deuda que se eliminará. |
| I2.2 | Fragmentar DB facade | 🟡 | Redefinir: debe hacerse como construção de Evidence Store con su propia capa de acceso. |
| I2.3 | Fragmentar Ambiguity Handler | 🟡 | Redefinir: la ambigüedad debe ser gestionada por el Hypothesis Network. Fragmentar el handler actual perpetúa el modelo state-dominant. |
| I2.4 | Auditoría DB access | 🟢 | Vigente. |
| I2.5 | Eliminar dual engine v2 | 🟢 | Vigente. |
| I2.6 | Completar i18n | 🟢 | Vigente. |

### 1.17 ROADMAP — Fase 3 (Calidad)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| I3.1 | Coverage dominios | 🟢 | Vigente. |
| I3.2 | Mejora comprensión | 🟡 | Redefinir: la comprensión debe ser el Reconstruction Engine evaluando suficiencia de evidencia, no un score ponderado sobre factores fijos. |
| I3.3 | Feedback loop aprendizaje | 🟡 | Redefinir: debe ser Hypothesis Network learning. El learning engine actual es state-oriented. |
| I3.4 | Hotspots >400L | 🟢 | Refactor. Vigente. |

### 1.18 ROADMAP — Fase 4 (Observabilidad)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| I4.1 | Observabilidad completa | 🟢 | Vigente. |
| I4.2 | Métricas de negocio | 🟢 | Vigente. |
| I4.3 | Auditoría seguridad | 🟢 | Vigente. |
| I4.4 | CI/CD hardening | 🟢 | Vigente. |

### 1.19 ROADMAP — Fase 5 (Escalabilidad)

| ID | Tarea | Clasif | Razón |
|----|-------|--------|-------|
| I5.1 | Event Sourcing Trips | ⚫ | **Absorbida por Evidence Store.** El event sourcing de Trip es un subconjunto del Evidence Store. |
| I5.2 | Multi-tenancy | 🟢 | Negocio. Vigente (condicional). |
| I5.3 | Canales adicionales | 🟢 | Negocio. Vigente. |

---

## 2. Backlog Zombie

Tareas que existen únicamente porque fueron creadas bajo el modelo state-dominant y hoy no tienen sentido bajo el modelo cognitivo ideal.

### Z1 — P2-10: Persistir last_intent en chat_sessions

**Por qué nació:** El sistema necesitaba recordar la intención del turno anterior para dar contexto a CORE (`prevIntent`). Sin esto, cada mensaje se procesaba en vacío.

**Por qué hoy no tiene sentido:** El Intent Stack del modelo ideal mantiene múltiples intenciones con probabilidades. No hay "última intención" — hay un conjunto activo. Persistir solo la última destruye información sobre intenciones secundarias que siguen activas (ej: un usuario que preguntó precio y luego dijo "ok, reserve" — la intención commercial sigue siendo relevante).

**Qué la reemplaza:** Intent Stack persistente en Evidence Store.

### Z2 — P2-12: Formalizar post_booking state

**Por qué nació:** La state machine conversacional necesita un estado "después de reservar" para saber qué hacer cuando el usuario vuelve a hablar.

**Por qué hoy no tiene sentido:** En modelo ideal, el estado se deriva de la evidencia. Si hay un trip CONFIRMED + no hay mensaje nuevo, el reconstruction engine proyecta "el usuario tiene un viaje confirmado". No se necesita un estado explícito en una máquina.

**Qué la reemplaza:** Reconstruction Engine que deriva estado de evidencia acumulada.

### Z3 — P3-03: Migrar iguazu-knowledge a Turso

**Por qué nació:** El conocimiento en TypeScript es difícil de mantener, no versionable por no-devs, y mezcla dominios.

**Por qué hoy no tiene sentido:** El destino correcto no es Turso (DB relacional) sino la Evidence Store (hechos semilla inmutables con schema de evidencia). Turso es adecuado para datos operacionales mutables (trips, drivers), no para conocimiento base.

**Qué la reemplaza:** Evidence Store con knowledge semilla (ya está parcialmente en `data/knowledge/` pero sin el schema de evidencia).

### Z4 — P3-08: Smart fill múltiples slots

**Por qué nació:** Para reducir turnos, el sistema necesita extraer varios slots de un solo mensaje.

**Por qué hoy no tiene sentido:** En modelo ideal no se "llenan slots" — se evalúa evidencia y se proyectan slots. La extracción múltiple es natural en el modelo probabilístico porque cada pieza de evidencia puede informar múltiples slots. No es una optimización — es el comportamiento por defecto.

**Qué la reemplaza:** Probabilistic Update en Hypothesis Network.

### Z5 — AIT-014: Modelar dominio Session

**Por qué nació:** Para documentar el ciclo de vida de la sesión conversacional.

**Por qué hoy no tiene sentido:** La "sesión" como entidad no existe en el modelo ideal. Hay evidencia acumulada por phone. Las 17 columnas de chat_sessions (conversational_state, slots, escalation_reason, etc.) se disuelven en Evidence Store + Operational Projection.

**Qué la reemplaza:** El modelo de phone-scoped evidence con Reconstruction Engine.

### Z6 — I2.1 / DEBT-05 / DEBT-08: Split lead service, reducir acoplamiento

**Por qué nacieron:** Lead service tiene 27 imports, 24 early returns, múltiples zonas de estado. Es un monolito.

**Por qué hoy no tienen sentido:** Lead service será reemplazado por el nuevo pipeline cognitivo. Refactorizarlo ahora es invertir en deuda que migrará o desaparecerá. El costo de oportunidad es alto — el mismo esfuerzo puesto en construir la Evidence Store rinde más.

**Qué las reemplaza:** Nuevo pipeline: Webhook → Evidence Store → Hypothesis Network → Commitment Engine → Operational Projection → Output.

---

## 3. Huecos

Capacidades del Modelo Cognitivo Ideal que NO aparecen en ningún backlog (PROJECT_BOARD, ROADMAP, BACKLOG).

### H1 — Evidence Store (CRÍTICO)

**No aparece en ningún backlog.**
El event sourcing de Trip (AIT-040/042) y Dispatch (AIT-041/043) son precursores limitados a dos dominios. No existe una tarea que diseñe el almacén de evidencia genérico: hechos inmutables con schema (fuente, timestamp, confianza, phone, tipo, payload, chain_id).

**Impacto:** Sin Evidence Store, ningún otro componente del modelo ideal puede construirse. Es la base.

### H2 — Evidence Chain (ALTO)

**No aparece.**
Ninguna tarea planea rastrear de dónde vino cada hecho. "El usuario dijo X en el turno 3", "CORE infirió Y con patrón Z", "el LLM extrajo W con prompt P". Sin esto, no hay auditoría cognitiva ni reconstrucción.

### H3 — Commitment Engine (ALTO)

**No aparece.**
El sistema actual hace confirmaciones binarias (¿Sí o No?). El modelo ideal requiere umbrales probabilísticos: "con 85% de confianza en origen y 70% en destino, el costo de error es $500 — ¿Compromiso? Sí/No/Revisar". No existe tarea que modele esto.

### H4 — Hypothesis Network (CRÍTICO)

**No aparece.**
El sistema actual opera con una hipótesis por vez. El modelo ideal requiere que múltiples interpretaciones coexistan: "70% es reserva, 20% es consulta de precio, 10% es saludo". Ninguna tarea aborda esto.

### H5 — Intent Stack (ALTO)

**No aparece.**
El sistema actual usa single intent. El Conversation Interpreter (DONE) y Client Objective (DONE) son pasos tímidos hacia intenciones múltiples, pero ninguna tarea formaliza el stack.

### H6 — Probabilistic Update (ALTO)

**No aparece.**
Slot merge hace overwrite condicional. No hay actualización bayesiana ni peso de evidencia nueva vs. evidencia previa.

### H7 — Cost of Error Engine (MEDIO)

**No aparece.**
Ninguna tarea modela cuánto cuesta equivocarse en cada decisión. Sin esto, el Commitment Engine no tiene umbral. El sistema no puede decidir autónomamente cuándo actuar y cuándo preguntar.

### H8 — Operational Projection (ALTO)

**No aparece.**
Ninguna tarea formaliza que los slots son una PROYECCIÓN de solo lectura desde la evidencia. El sistema actual trata los slots como escritura directa. AIT-044 (proyección Trip) es un precursor en un solo dominio, pero no cubre slots, intenciones, ni estado conversacional.

### H9 — Reconstruction Engine (ALTO)

**No aparece.**
AIT-044 es el único precursor y está limitado a Trip. No hay tarea para reconstruir el estado cognitivo completo desde la evidence chain.

### H10 — Explicit Evidence Priority (BAJO)

**No aparece formalmente.**
GAP-04 (field-resolver priorities) toca el tema tangencialmente pero lo trata como prioridad de campos de UI, no como prioridad de fuentes de evidencia. Una regex debería pesar menos que una confirmación explícita del usuario, pero el sistema no modela esto explícitamente.

### H11 — Conversational Strategy Engine basado en evidencia (ALTO)

Aparece parcialmente en ADR-008 y StrategyDecision. Pero la implementación computa estrategia desde señales (purchaseIntent, urgency, messageType) — no desde el estado de la evidencia. No hay tarea que conecte StrategyDecision con Evidence Store.

---

## 4. Nuevo Roadmap Cognitivo

No ordenado por archivos ni módulos. Ordenado por evolución cognitiva — cada épica construye sobre la anterior.

```
Épica A — Foundation (P0 urgente + deuda base)
Épica B — Evidence Store (base cognitiva inmutable)
Épica C — Hypothesis Network (múltiples interpretaciones)
Épica D — Commitment Model (umbrales probabilísticos)
Épica E — Operational Projection (conectar con el mundo real)
Épica F — Conversational Strategy (estrategia basada en evidencia)
Épica G — Business & Learning (negocio sobre base cognitiva)
```

---

### Epic A: Foundation

**Objetivo:** Despejar el terreno. Resolver bloqueantes de producción y deuda que no dependen del modelo cognitivo.

**Por qué existe:** Sin un sistema estable en producción, no tiene sentido evolucionar la cognición. Estas tareas son prerequisito operacional.

**Dependencias:** Ninguna.

| Tareas heredadas | Clasificación |
|-----------------|---------------|
| P0-01 Rotar ADMIN_API_KEY | 🟢 |
| P0-02 Configurar SENTRY_DSN | 🟢 |
| P0-04 Seed choferes reales | 🟢 |
| P0-03 connection_cache | 🟢 |
| P1-07 LOG_LEVEL | 🟢 |
| I1.4 Renombrar tablas | 🟢 |
| DEBT-10 seed-data.ts | 🟢 |
| GAP-07 Frustration false positive | 🟢 |
| P1-05 placeIdCache TTL | 🟢 |
| P1-06 is_principal2 | 🟢 |
| P2-03/04 Dropear tablas/columnas dead | 🟢 |
| P2-07 Fix type/DDL mismatches | 🟢 |
| DEBT-06 i18n restante | 🟢 |
| DEBT-13 Nombres tabla | 🟢 |

**Prioridad:** P0 — inmediata.

---

### Epic B: Evidence Store

**Objetivo:** Construir el almacén de hechos inmutables. Toda evidencia del sistema se registra aquí primero.

**Por qué existe:** Es la base de todo el modelo cognitivo. Sin evidencia inmutable, no puede haber Hypothesis Network, ni Commitment Engine, ni Operational Projection.

**Dependencias:** Epic A.

**Tareas heredadas que migran aquí:**
- AIT-040/041/042/043 (event sourcing existente) → expandir a schema genérico de evidencia
- AIT-044 → generalizar de Trip projection a evidence projection
- P1-08/P1-09 → redirigir a poblar Evidence Store con knowledge semilla
- DEBT-04 → refactorizar DB facade como capa de Evidence Store

**Nuevas tareas (no existen en ningún backlog):**
1. Diseñar schema de evidencia: `{ id, phone, type, payload, source, confidence, timestamp, chain_id, previous_id }`
2. Migrar event sourcing Trip/Dispatch a schema unificado
3. Crear API de escritura append-only (nadie borra evidencia)
4. Crear API de consulta por phone + tipo + ventana temporal
5. Poblar con knowledge semilla desde `data/knowledge/`

**Prioridad:** P1 — alta, siguiente.

---

### Epic C: Hypothesis Network

**Objetivo:** Múltiples interpretaciones coexistiendo con probabilidades.

**Por qué existe:** El sistema actual solo puede tener una interpretación. Esto causa la mayoría de los bugs de comprensión parcial (ej: "hola necesito un taxi" es saludo Y booking, no uno u otro).

**Dependencias:** Epic B (la Hypothesis Network necesita evidencia para generar hipótesis).

**Tareas heredadas que migran aquí:**
- Conversation Interpreter (DONE) → refactorizar para emitir hipótesis múltiples
- Client Objective (DONE) → refactorizar para consumir hypothesis stack
- P2-13 (inferencia semántica en CI) → redirigir
- AIT-062 (inferencia frontera) → redirigir a probabilistic inference
- GAP-04 (field-resolver priorities) → redirigir a Evidence Priority
- I2.3 (fragmentar Ambiguity Handler) → redirigir: ambiguity = hypothesis con empate

**Nuevas tareas:**
1. Definir schema de Hypothesis: `{ intent, slots, confidence, evidence_ids[], parent_id?, timestamp }`
2. Implementar generador de hipótesis desde evidencia
3. Implementar merge/decay de hipótesis (evidencia nueva ajusta probabilidades)
4. Implementar Intent Stack con top-N hypothesis
5. Implementar Probabilistic Update (bayesiano simple o weight-based)

**Prioridad:** P1 — alta.

---

### Epic D: Commitment Model

**Objetivo:** Decidir cuándo actuar basado en umbrales probabilísticos y costo de error.

**Por qué existe:** Sin umbrales, el sistema siempre pregunta (nunca decide) o siempre decide (nunca pregunta). El Commitment Engine balancea ambos.

**Dependencias:** Epic C (necesita hipótesis con probabilidades).

**Tareas heredadas que migran aquí:**
- AIT-063 (UI confirmación unificada) → Commitment UI
- FUT-04 (re-engagement) → umbral de re-engagement
- P2-08 (Human Layer templates) → Commitment UX

**Nuevas tareas:**
1. Definir Cost of Error function por tipo de decisión (precio, destino, hora)
2. Implementar Commitment Engine: `(hypothesis, cost_of_error) => commit | clarify | escalate`
3. Implementar Commitment UI: mostrar nivel de evidencia + umbral
4. Implementar logging de commitment outcomes para learning loop
5. Definir política de re-engagement basada en commitment decay

**Prioridad:** P2 — media.

---

### Epic E: Operational Projection

**Objetivo:** Los slots son una vista de solo lectura de la evidencia.

**Por qué existe:** Hoy los slots son escritura directa. Esto causa: bugs de merge, pérdida de evidencia, imposibilidad de reconstruir decisiones pasadas.

**Dependencias:** Epic B + Epic C.

**Tareas heredadas que migran aquí:**
- Toda la lógica de slots (slot-state.ts, slot-confirmation.ts, slot-workflow.ts) → refactorizar como proyección
- P1-04 (fase-22 T2) → redirigir
- P3-08 (smart fill) → obsoleto, no migrar
- P2-12 (post_booking state) → obsoleto, no migrar

**Nuevas tareas:**
1. Separar slot storage (hoy en chat_sessions.slots) de slot projection
2. Implementar proyector genérico: `(evidence[], hypothesis) => SlotProjection`
3. Migrar slot-confirmation a leer de proyección, no de storage
4. Migrar policy-pipeline a consumir proyección

**Prioridad:** P2 — media.

---

### Epic F: Conversational Strategy Engine

**Objetivo:** StrategyDecision basada en estado de evidencia.

**Por qué existe:** ADR-008 creó StrategyDecision pero computa desde señales computadas (purchaseIntent, urgency). Debe computar desde evidencia: "qué tan seguros estamos", "cuánto cuesta equivocarse", "cuántas hipótesis activas hay".

**Dependencias:** Epic C + Epic D + Epic E.

**Tareas heredadas que migran aquí:**
- ADR-008 / StrategyDecision → refactorizar fuente de input
- AIT-006 (re-prompt LLM) → Reconstruction Engine strategy
- AIT-024a-d (tools integration) → integrar en nuevo pipeline

**Nuevas tareas:**
1. Redefinir StrategyDecision inputs desde Evidence Store + Hypothesis Network
2. Conectar Commitment Engine con StrategyDecision (modo = f(umbral))
3. Reemplazar policy-pipeline.ts por nuevo pipeline basado en proyección

**Prioridad:** P2/P3 — media.

---

### Epic G: Business & Learning Layer

**Objetivo:** Negocio, pricing, dispatch, learning sobre base cognitiva.

**Por qué existe:** Una vez que la cognición funciona sobre evidencia, el negocio puede operar con mejor información.

**Dependencias:** Epics B-F completas (al menos parcialmente).

**Tareas heredadas que migran aquí:**
- AIT-020/021/022/023 (tools) → contratos consumen Evidence Store
- AIT-064 (learning loop) → Hypothesis Network learning
- I3.3 (feedback loop) → redirigir
- FUT-07 (calendario festivos) → evidence semilla
- FUT-10 (disponibilidad chofer) → evidencia en tiempo real
- P2-01 (eliminar v2) → pricing

**Prioridad:** P3 — backlog.

---

## 5. Duplicaciones conceptuales

### D1 — Memoria vs. Evidence Store vs. Session

**Problema:** Cuatro conceptos diferentes intentan resolver "recordar lo que pasó":
1. `context-memory.ts` — merge semántico de contexto
2. `memory.ts` — session memory
3. `chat_sessions.slots` — slot persistence
4. `chat_sessions.conversational_state` — state machine

**Debe sobrevivir:** Evidence Store (Epic B). Todo lo demás es proyección.

### D2 — Confirmación vs. Commitment

**Problema:** Existen 5+ mecanismos de confirmación:
1. `slot-confirmation.ts` — confirmación de slots
2. `policy-ahora.ts` — confirmación de dispatch
3. `policy-reserva.ts` — confirmación de reserva
4. `handleSlotConfirmationButton` — UI de botones
5. `handleSlotConfirmationText` — texto de confirmación

Todos intentan lo mismo: "¿estás seguro?" pero con lógica duplicada.

**Debe sobrevivir:** Commitment Engine (Epic D). Un solo mecanismo, diferentes umbrales por dominio.

### D3 — Intención vs. Intents

**Problema:** El sistema detecta intención en 3+ lugares:
1. `core.ts` — determinista
2. Conversation Interpreter — clasificación de rol
3. Client Objective — síntesis de objetivo
4. Laterals — enriquecimiento contextual

**Debe sobrevivir:** Intent Stack en Hypothesis Network (Epic C).

### D4 — Slots vs. Extracción vs. Proyección

**Problema:** Los slots se leen/escriben en:
1. `chat_sessions.slots` (DB)
2. `slot-state.ts` (lifecycle)
3. `extraction-runner.ts` (merge)
4. `buildExtractionContext.ts` (transformación)
5. `field-resolver.ts` (prioridad de campos)

**Debe sobrevivir:** Operational Projection (Epic E). Una sola vista de solo lectura.

---

## 6. Contradicciones con el Modelo Cognitivo Ideal

### C1 — StrategyDecision + single intent + state machine (ADR-008) vs. Hypothesis Network

**Contradicción:** ADR-008 centraliza decisiones estratégicas en StrategyDecision, pero StrategyDecision computa sobre señales derivadas de un modelo single-intent + state machine (purchaseIntent, urgency, messageType). El modelo ideal requiere que la estrategia emerja del estado de la Hypothesis Network (múltiples intenciones + probabilidades + evidencia faltante).

**Evidence:** `computeStrategyDecision()` en `conversation-strategy.ts` recibe `purchaseIntent: "high"|"medium"|"low"` y `urgency` como escalares. No recibe hypothesis stack ni evidence gaps.

**Resolución:** No requiere cambiar ADR-008. Requiere cambiar los INPUTS de StrategyDecision de señales computadas a Evidence Store + Hypothesis Network.

### C2 — Architecture Freeze vs. necesidad de cambiar pipeline

**Contradicción:** El Architecture Freeze (ADR-008 §Arquitectura congelada) impide agregar nuevos tipos/interfaces a contratos entre capas sin ADR. Pero el modelo ideal requiere NUEVOS contratos (Evidence Store API, Hypothesis Network API, Commitment Engine API) que no existen hoy.

**Resolución:** No es una contradicción real — el Freeze permite cambios mediante ADR. Pero el backlog no refleja que se necesitarán nuevos ADRs (009, 010, 011...) para autorizar estos componentes.

### C3 — P2-10 "Persistir last_intent" vs. Intent Stack

**Contradicción:** Persistir solo la última intención contradice directamente el principio de Intent Stack del modelo ideal. La tarea asume que una intención reemplaza a la anterior.

### C4 — P3-08 "Smart fill" vs. Probabilistic Update

**Contradicción:** "Smart fill" asume que los slots son contenedores vacíos que se llenan. El modelo ideal asume que los slots son proyecciones que se recalculan. La metáfora es opuesta.

### C5 — AIT-014 "Modelar Session" vs. Evidence Store

**Contradicción:** Session state asume que hay un estado único por sesión que progresa linealmente. Evidence Store asume que hay hechos acumulados que no progresan — solo se agregan.

---

## 7. Dependencias incorrectas

### DEP1 — AIT-024a-d (tools integration) antes de Evidence Store

**Problema:** Integrar tool contracts en policy-pipeline (AIT-024a-d) está planificado en P1-tools, antes de que exista la Evidence Store. Las tools emitirán resultados que deberían ser evidencia, pero no hay dónde almacenarlos como tales.

**Orden correcto:** Primero Epic B (Evidence Store), luego refactorizar tools para emitir evidencia, luego integrar en pipeline.

### DEP2 — I2.1 (split lead service) antes de nuevo pipeline

**Problema:** Refactorizar lead.service está en Fase 2 del roadmap actual. Pero lead.service será reemplazado por el nuevo pipeline cognitivo. Refactorizarlo ahora es trabajo perdido.

**Orden correcto:** No hacer I2.1. Esperar a que Epic F (nuevo pipeline) lo reemplace.

### DEP3 — AIT-044 (proyección Trip) limitado antes de generalizar

**Problema:** AIT-044 construye proyección solo para Trip. Si se implementa así, luego habrá que hacer otra proyección para slots, otra para intenciones, etc.

**Orden correcto:** Primero diseñar el Reconstruction Engine genérico (Epic B/E), luego aplicarlo a Trip como caso concreto.

### DEP4 — P3-03 (knowledge a Turso) cuando debería ir a Evidence Store

**Problema:** Planificado como migración a DB relacional. Si se ejecuta así, luego habrá que migrar de Turso a Evidence Store.

**Orden correcto:** Esperar a Epic B. Poblar Evidence Store directamente.

### DEP5 — I3.3 (feedback loop) antes de Hypothesis Network

**Problema:** El feedback loop de aprendizaje está planificado en Fase 3, pero el learning mechanism del modelo ideal (ajustar pesos de hipótesis basado en outcomes) requiere que la Hypothesis Network exista.

**Orden correcto:** Feedback loop después de Epic C (Hypothesis Network).

---

## 8. Nuevo backlog maestro

| Épica | Tareas | Dependencias | Prioridad |
|-------|--------|-------------|-----------|
| **A: Foundation** | P0-01, P0-02, P0-04, P0-03, P1-07, I1.4, DEBT-10, GAP-07, P1-05, P1-06, P2-03, P2-04, P2-07, DEBT-06, DEBT-13 | Ninguna | P0 |
| **B: Evidence Store** | Event schema unificado, migrar AIT-040/041/042/043, API append-only, knowledge seeding, generalizar AIT-044, P1-08/P1-09 redirect | Epic A | P1 |
| **C: Hypothesis Network** | Hypothesis schema, generador, merge/decay, Intent Stack, Probabilistic Update, Evidence Priority, AIT-062 redirect | Epic B | P1 |
| **D: Commitment Model** | Cost of Error, Commitment Engine, Commitment UI, AIT-063 redirect, FUT-04 redirect | Epic C | P2 |
| **E: Operational Projection** | Separar slot storage de proyección, proyector genérico, migrar slot-confirmation, P1-04 redirect, P2-12 obsolete | Epic B + C | P2 |
| **F: Conversational Strategy** | ADR-009 (nuevo pipeline), StrategyDecision sobre evidencia, reemplazar policy-pipeline, AIT-024a-d redirect, AIT-006 redirect | Epics C + D + E | P2/P3 |
| **G: Business & Learning** | Tools contracts v2 (AIT-020/021/022/023), Hypothesis learning (AIT-064, I3.3), pricing (P2-01), FUTs restantes | Epics B-F | P3 |

### Tareas eliminadas del backlog

| Tarea | Razón |
|-------|-------|
| P2-10 Persistir last_intent | Obsoleta por Intent Stack |
| P2-12 post_booking state | Obsoleta por Reconstruction Engine |
| P3-03 knowledge a Turso | Obsoleta por Evidence Store |
| P3-08 Smart fill | Obsoleta por Probabilistic Update |
| AIT-014 Modelar Session | Obsoleta por Evidence Store |
| I2.1 Split Lead Service | Obsoleta por nuevo pipeline |
| DEBT-05/DEBT-08 acoplamiento | Absorbidas por reemplazo de pipeline |
| DEBT-11 policy-pipeline conversion | Absorbida |

---

## 9. Porcentaje de avance real contra el Modelo Cognitivo Ideal

### Arquitectura: 15%

**Qué hay:** Layered architecture (ADR-001), database facade (ADR-002), schema parity (ADR-006), event sourcing Trip/Dispatch (AIT-040/042/043).
**Qué falta:** Evidence Store schema, Evidence Chain, Reconstruction Engine.
**Progreso:** Los ADRs y el event sourcing son base sólida pero no cubren el 85% restante.

### Cognición: 5%

**Qué hay:** Conversation Interpreter (DONE), Client Objective (DONE), laterals.
**Qué falta:** Hypothesis Network, Intent Stack, Probabilistic Update, Evidence Priority.
**Progreso:** Los componentes existentes son compatibles conceptualmente pero operan sobre modelo equivocado (state en vez de evidence).

### Conversación: 40%

**Qué hay:** StrategyDecision (ADR-008), Router, Policies (Ahora/Reserva), Response templates, LLM expression, i18n parcial.
**Qué falta:** Commitment Engine, Reconstruction Engine, Conversational Strategy basada en evidencia.
**Progreso:** La infraestructura conversacional es sólida y mayormente reutilizable. El cambio principal está en los inputs de decisión, no en los outputs.

### Negocio: 30%

**Qué hay:** Pricing engine, Geo resolver, Dispatch workflow, Trip execution, Fleet validation.
**Qué falta:** Cost of Error en pricing, evidencia en tiempo real para dispatch, knowledge en Evidence Store.
**Progreso:** Los motores de negocio funcionan. Necesitan conectarse a la nueva capa cognitiva.

### Operación: 20%

**Qué hay:** Knowledge layer (data/knowledge/), event sourcing, seed data.
**Qué falta:** Evidence Store como capa operacional, Reconstruction Engine, Operational Projection.
**Progreso:** El knowledge layer es la materia prima. Falta el almacén y el motor de proyección.

### Observabilidad: 25%

**Qué hay:** Sentry, metrics endpoint, evals (AIT-050/051/052).
**Qué falta:** Métricas de calidad cognitiva (precisión de hipótesis, tasa de commitment, costo de error promedio), tracing de evidence chain.
**Progreso:** La infraestructura existe. Faltan las métricas correctas.

### Global: ~18%

---

## 10. Conclusión

### ¿Cuál es hoy el verdadero cuello de botella evolutivo de AITOS?

**El cuello de botella no es técnico ni operacional. Es conceptual.**

El equipo (y el backlog) sigue pensando en términos de:

- **Slots que se llenan** → en vez de evidencia que se acumula
- **Estados que progresan** → en vez de hipótesis que compiten
- **Intenciones únicas** → en vez de stacks probabilísticos
- **Confirmaciones binarias** → en vez de compromisos con umbral
- **Pipeline secuencial** → en vez de red de inferencia

**Evidencia de esta afirmación:**

1. **El 31% de las tareas P1-P3 del PROJECT_BOARD** quedaron obsoletas (🔴) o requieren redefinición (🟡) al analizarlas contra el modelo ideal. No porque estén mal diseñadas — porque fueron diseñadas para un sistema que ya no debería existir.

2. **Cero tareas** en los 3 backlogs (PROJECT_BOARD, ROADMAP, BACKLOG) mencionan Evidence Store, Hypothesis Network, Intent Stack, Commitment Engine, Cost of Error, o Probabilistic Update. Son 6 conceptos fundamentales del modelo ideal que no existen ni como semilla.

3. **El Architecture Freeze** (ADR-008) fue una decisión correcta para estabilizar, pero creó el efecto secundario de congelar también la evolución conceptual. El backlog asume que el pipeline actual (CORE → CI → CO → SD → Router → Policy → LLM) es permanente, cuando el modelo ideal requiere un pipeline fundamentalmente diferente.

4. **Las tareas DONE** (Conversation Interpreter, Client Objective, StrategyDecision, event sourcing) son conceptualmente compatibles con el modelo ideal, pero fueron implementadas bajo el paradigma state-dominant. Necesitarán refactor para operar sobre evidencia en vez de sobre señales computadas.

5. **El roadmap actual** está organizado por capas técnicas (Fase 1: estabilización, Fase 2: refactor, Fase 3: calidad, Fase 4: observabilidad). No hay una fase de "cognición" porque el equipo aún no internalizó que el modelo actual es el límite.

**La paradoja:** AITOS tiene mejor arquitectura conversacional que el 90% de los bots de producción. Pero esa arquitectura fue diseñada para resolver el problema de "cómo conversar" — y lo resolvió bien. El próximo salto no es conversacional. Es cognitivo.

El cuello de botella no se resuelve con más código. Se resuelve con un cambio de marco mental: **de state machine a evidence network**.

---

*Fin de Auditoría #03 — Gobernanza Evolutiva*
