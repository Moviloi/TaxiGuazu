# ADR-012 — Cognitive Escalation Principle

**Estado:** ACEPTADO

**Fecha:** 2026-07-15 (actualizado 2026-07-16)

**Reemplaza:** Parcialmente ADR-005 (AI-First Interpretation). El principio AI-First se mantiene para contextos donde la comprensión semántica es indispensable, pero se subordina al nuevo principio de escalamiento cognitivo: el conocimiento explícito y las reglas determinísticas tienen prioridad sobre los modelos generativos.

**Prerrequisitos:** CE-1 (baseline), CE-2 (clasificación), CE-3A (BKE), CE-3B (DRL), CE-4 (roadmap)

---

# 1. Contexto

## 1.1 Arquitectura previa

Hasta la emisión de este ADR, la arquitectura cognitiva de AITOS se regía por el principio establecido en ADR-005 (AI-First Interpretation): cuando el sistema necesita interpretar datos ambiguos, debe pasar los datos crudos al LLM y dejar que el LLM decida.

Este principio gobernaba la desambiguación de lugares, los mensajes de recuperación contextual, y la interpretación de intención conversacional. Los tres principales consumidores LLM (C1: extractSlots, C2: generateLLMResponse, C3: interpretAmbiguity) operaban sin una capa de razonamiento previa que intentara resolver el problema antes de recurrir al LLM.

## 1.2 Evidencia de CE-1

La auditoría cognitiva (CE-1) reveló:

- **7 puntos de consumo LLM** (C1–C7) distribuidos en 12 archivos
- **Máximo teórico de 10 llamadas LLM por mensaje**
- **0 providers operativos en producción**: Groq con rate limit 429, Gemini sin API key configurada
- **0% de llamadas LLM funcionales en el entorno productivo**
- **Ausencia de presupuesto cognitivo**: no hay límite de llamadas por mensaje ni por sesión
- **Ausencia de escalamiento explícito**: no existe un mecanismo centralizado que decida qué nivel de procesamiento aplicar
- **Ausencia de cache, circuit breaker, o feature flag global de LLM**

## 1.3 Clasificación de CE-2

La clasificación de inevitabilidad arquitectónica (CE-2) determinó que de los 7 puntos de consumo:

| Clasificación | Cantidad | Puntos |
|:-------------:|:--------:|--------|
| **C** — Reemplazable | 1 | C3 (interpretAmbiguity) — desambiguación de lugares |
| **B** — Simplificable | 2 | C4 (generateReinterpretResponse), C6 (generateContextualRecovery) |
| **A** — Inevitable | 4 | C1 (extractSlots), C2 (generateResponse), C5 (frustration), C7 (transcribe) |

Solo 4 de los 7 puntos requieren inevitablemente un LLM. Los 3 restantes pueden resolverse total o parcialmente mediante conocimiento explícito y reglas determinísticas.

## 1.4 Conocimiento existente

La exploración de fuentes reveló que el sistema **ya posee** el conocimiento necesario para resolver la mayoría de las consultas sin LLM en más de 20 archivos distribuidos:

- Datos estructurados en Turso: lugares, alias, tarifas, zonas
- Lógica determinística: location-resolver (PAIR_BASE), regex-extractor (17 códigos IATA), entity-extractor (10 hoteles, 8 POIs), entity-catalog (10 entidades)
- Templates: 89 entradas i18n en 3 idiomas, 15 templates de desambiguación, 19 builders de respuesta
- Reglas de negocio: policies, constants, JSON knowledge files (borders, migration, attractions, calendar, operations)

---

# 2. Problema

La inteligencia conversacional de AITOS depende excesivamente de modelos generativos (LLM) para tareas que pueden resolverse mediante:

1. **Conocimiento explícito del dominio**: datos estructurados que ya existen en la base de datos, archivos de configuración, y constantes del sistema.

2. **Reglas determinísticas**: lógica de negocio que ya está implementada en el código pero dispersa entre múltiples orquestadores.

3. **Templates conversacionales**: mensajes reutilizables que ya existen en 3 idiomas pero cuyo acceso está fragmentado en 5 archivos distintos.

Esta dependencia excesiva produce:

- **Vulnerabilidad operativa**: cuando los proveedores LLM fallan (como documenta CE-1 Sección 6), el sistema pierde capacidades completas. En el momento de esta auditoría, 0 de 3 proveedores están operativos.

- **Costo innecesario**: tareas que podrían resolverse en <50ms con reglas determinísticas consumen 1000-3000ms de latencia LLM y tokens que tienen costo económico.

- **No determinismo**: la misma entrada puede producir respuestas diferentes según el estado del modelo, la temperatura, o el provider utilizado, dificultando la depuración y el testing.

- **Falta de auditabilidad**: cuando el LLM decide, no queda registro de "por qué" se tomó esa decisión, solo de "qué" se decidió.

---

# 3. Decisión

Se establece como principio arquitectónico permanente:

> **La inteligencia del sistema escala progresivamente a través de niveles explícitos. Los modelos generativos únicamente se utilizarán cuando los niveles anteriores no puedan resolver el problema satisfactoriamente.**

## 3.1 Cadena de escalamiento oficial

```
Mensaje entrante
      │
      ▼
┌──────────────────────────────────┐
│  Nivel 0: Business Knowledge     │
│           Engine                 │
│                                  │
│  Responsabilidad: conocer        │
│  Método: consulta a fuentes de   │
│          verdad existentes       │
│  Salida: datos estructurados     │
│           del dominio            │
└──────────────┬───────────────────┘
               │ datos
               ▼
┌──────────────────────────────────┐
│  Nivel 1: Deterministic          │
│           Reasoning Layer        │
│                                  │
│  Responsabilidad: decidir        │
│  Método: reglas determinísticas  │
│          sobre datos del BKE     │
│  Salida: DRLDecision             │
│           (estructurada)         │
└──────────────┬───────────────────┘
               │
    ┌──────────▼──────────┐
    │  ¿Es suficiente?    │
    │                     │
    │  SI ───────────────►│─────► Responder (BKE + DRL)
    │                     │
    │  NO                 │
    └──────────┬──────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Nivel 2a: Groq Provider         │
│                                  │
│  Responsabilidad: generar,       │
│                  extraer,        │
│                  comprender      │
│  Método: llama-3.3-70b-versatile│
│  Salida: texto o estructura      │
└──────────────┬───────────────────┘
               │
    ┌──────────▼──────────┐
    │  ¿Resuelto?         │
    │                     │
    │  SI ───────────────►│─────► Responder
    │                     │
    │  NO                 │
    └──────────┬──────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Nivel 2b: Gemini Provider       │
│                                  │
│  Responsabilidad: (ídem N2a)     │
│  Método: gemini-2.0-flash        │
│  Salida: texto o estructura      │
└──────────────┬───────────────────┘
               │
    ┌──────────▼──────────┐
    │  ¿Resuelto?         │
    │                     │
    │  SI ───────────────►│─────► Responder
    │                     │
    │  NO                 │
    └──────────┬──────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Fallback: Plantilla estática    │
│  (BKE.obtenerMensaje +           │
│   SAFE_FALLBACK)                 │
└──────────────────────────────────┘
```

## 3.2 Asignación de puntos de consumo actuales a niveles

| Punto CE-2 | Clasificación | Nivel destino | Tipo de cambio |
|:----------:|:-------------:|:-------------:|----------------|
| C3 | C — Reemplazable | N0 (BKE) + N1 (DRL) | Reemplazo total de la llamada LLM |
| C4 | B — Simplificable | N0 (BKE) + N1 (DRL) | Intento BKE+DRL primero; LLM como fallback |
| C6 | B — Simplificable | N0 (BKE) + N1 (DRL) | Intento BKE+DRL primero; LLM como fallback |
| C1 | A — Inevitable | N2 (LLM) asistido por N0 + N1 | El LLM recibe contexto enriquecido del BKE |
| C2 | A — Inevitable | N2 (LLM) asistido por N0 + N1 | El LLM recibe contexto enriquecido del BKE |
| C5 | A — Inevitable | N2 (LLM) asistido por N0 + N1 | El LLM recibe contexto enriquecido del BKE |
| C7 | A — Inevitable | N2 (Gemini SDK directo) | Sin cambios (transcripción es inherentemente IA) |

---

# 4. Principios Derivados

## P1 — Source of Truth Única

El Business Knowledge Engine es la única puerta de acceso al conocimiento del dominio. Ningún orquestador ni política debe consultar fuentes de verdad directamente. El BKE encapsula el acceso a Turso, configuración, constantes, archivos JSON, y templates conversacionales.

## P2 — No Duplicación de Conocimiento

El BKE no replica datos. Cada consulta se resuelve en la fuente de verdad original. Si los datos cambian en Turso, en configuración, o en los archivos de conocimiento, el BKE refleja el cambio inmediatamente sin migración ni sincronización.

## P3 — Prioridad del Conocimiento Explícito sobre la Generación

El conocimiento explícito del dominio (datos estructurados, reglas determinísticas, templates) tiene prioridad arquitectónica sobre la generación por LLM. Un LLM solo debe utilizarse cuando se ha demostrado que el conocimiento explícito no puede resolver el problema.

Este principio modifica parcialmente ADR-005: donde ADR-005 establecía "pasar datos crudos al LLM y dejar que decida", el Cognitive Escalation Principle establece "intentar resolver con conocimiento explícito primero; solo si no es posible, pasar al LLM".

## P4 — Toda Llamada LLM debe Aportar Valor Incremental Demostrable

Cada invocación a un proveedor LLM debe justificarse por el valor que agrega respecto a lo que las capas inferiores (BKE + DRL) ya podrían producir. No se permite el uso de LLM para tareas donde el BKE + DRL pueden producir un resultado funcionalmente equivalente.

## P5 — La Experiencia Conversacional nunca debe Degradarse por Optimización de Costos

La reducción de llamadas LLM no puede realizarse a expensas de la calidad de la respuesta al usuario. Si BKE + DRL no pueden producir una respuesta de calidad equivalente a la del LLM, se debe escalar al LLM. El criterio de calidad lo define el comportamiento observable, no una métrica interna.

## P6 — El Presupuesto Cognitivo es una Métrica Arquitectónica Permanente

A partir de este ADR, el presupuesto cognitivo (cantidad de llamadas LLM por mensaje, por sesión, y por período de tiempo) es una métrica de arquitectura con el mismo estatus que la latencia, la tasa de error, o la cobertura de tests. Debe ser monitoreada, auditada, y reportada en cada revisión arquitectónica.

## P7 — Los Proveedores LLM son Componentes Reemplazables

Ninguna decisión arquitectónica puede depender de un proveedor LLM específico. Groq, Gemini, o cualquier proveedor futuro deben ser intercambiables mediante configuración, sin cambios en la lógica de negocio, las reglas de decisión, o los templates conversacionales. La DRL es el único punto que decide qué proveedor utilizar.

---

# 5. Consecuencias

## 5.1 Impacto en la arquitectura

| Dimensión | Antes de este ADR | Después de este ADR |
|-----------|-------------------|---------------------|
| **Flujo de decisión** | Orquestadores deciden independientemente si usar LLM | DRL centraliza la decisión de escalamiento |
| **Acceso a datos** | Cada orquestador consulta DB/config directamente | BKE encapsula todo el acceso a datos del dominio |
| **Conocimiento del dominio** | Disperso en prompts LLM, código, JSON, y DB | Centralizado en BKE |
| **Dependencia de LLM** | El sistema no puede personalizar respuestas sin LLM | BKE + DRL responden sin LLM; LLM solo para casos complejos |
| **Puntos de consumo LLM** | 7 | 4 (solo clasificación A) |

## 5.2 Impacto en la mantenibilidad

- **Centralización de reglas**: las reglas de decisión pasan de estar dispersas en 10+ archivos a vivir en la DRL, con un catálogo documentado de familias de reglas.
- **Separación de responsabilidades**: BKE conoce, DRL decide, LLM genera. Cada capa tiene una responsabilidad única y testeable independientemente.
- **Menor acoplamiento**: cambiar un proveedor LLM, una fuente de datos, o una regla de negocio no afecta a las otras capas.

## 5.3 Impacto en el costo

- **Reducción de llamadas LLM**: de 10 llamadas máximas por mensaje (CE-1 baseline) a 2-4 llamadas (CE-4 objetivo), una reducción del 60-80%.
- **Reducción de tokens**: los prompts LLM se acortan al eliminar el conocimiento del dominio que ahora provee el BKE (~30-40% menos tokens).
- **Latencia determinística**: las consultas BKE+DRL se resuelven en <50ms vs 1000-3000ms de una llamada LLM.

## 5.4 Impacto en la resiliencia

- **Operación sin LLM**: el sistema puede funcionar con BKE + DRL incluso cuando todos los proveedores LLM no están disponibles (como ocurre en producción según CE-1 Sección 6).
- **Degradación gradual**: si un proveedor LLM falla, el sistema escala al siguiente proveedor en la cadena, o al fallback determinístico si todos fallan.
- **Aislamiento de fallos**: un error en un proveedor LLM no afecta las capas BKE y DRL, que continúan operando con normalidad.

## 5.5 Impacto en la observabilidad

- **Rastreo de nivel**: cada decisión registra qué nivel la resolvió (BKE, DRL, Groq, Gemini, fallback) y la razón de la decisión.
- **Métricas de escalamiento**: tasa de requests por nivel, tiempo por nivel, tasa de fallback, todo medible y auditable.
- **DRLDecision estructurada**: las decisiones de la DRL incluyen `reason` y `confidence`, permitiendo auditoría y depuración.

## 5.6 Impacto en la testabilidad

- **Tests unitarios de reglas**: las reglas de la DRL son funciones puras (entrada → salida), testeables sin DB, sin LLM, sin IO, en sub-milisegundo.
- **Tests de integración de BKE**: el BKE se prueba contra las fuentes de verdad reales (Turso, JSON), pero sin LLM.
- **Tests de pipeline**: el pipeline completo se prueba con BKE+DRL como camino primario, y con LLM como camino de fallback.

## 5.7 Impacto en la evolución futura

- **Independencia de proveedores**: agregar un nuevo proveedor LLM (ej: Anthropic Claude, OpenAI GPT) solo requiere actualizar la cadena de escalamiento en la DRL, sin modificar orquestadores, políticas, ni reglas de negocio.
- **Nuevas fuentes de datos**: agregar una nueva fuente de verdad (ej: API de precios dinámicos, base de datos de conductores) solo requiere actualizar el dominio correspondiente en el BKE.
- **Nuevas reglas de negocio**: agregar una nueva regla de decisión (ej: nuevo tipo de viaje, nueva restricción) solo requiere agregar la regla en la familia correspondiente de la DRL.

---

# 6. Compatibilidad

Este ADR **no reemplaza** los componentes existentes. Establece cómo se relacionan con las nuevas capas.

## 6.1 CORE

CORE continúa produciendo `CoreDecision` con intent, confidence, y facts. La diferencia es que los facts ahora pueden enriquecerse con datos del BKE (ej: lugares pre-resueltos, entidades detectadas) antes de ser consumidos por el resto del pipeline.

**Relación:** CORE → BKE (consulta opcional) → DRL (consume CoreDecision)

## 6.2 POLICY

POLICY continúa decidiendo qué acción tomar (EXECUTE, CLARIFY, ANSWER, SAFE_FALLBACK). La diferencia es que ahora recibe `DRLDecision` como entrada estructurada, conteniendo señales de completitud, consistencia, y clasificación que antes POLICY debía inferir por sí misma.

**Relación:** DRL → POLICY (DRLDecision como entrada). POLICY sigue siendo la autoridad de decisión de negocio.

## 6.3 StrategyDecision

`computeStrategyDecision()` sigue siendo la única fuente de verdad para decisiones estratégicas (tone, speed, responseLength, skipLLM). La diferencia es que `skipLLM` ahora también considera el resultado de `DRL.suficiencia()` — si DRL determina que BKE es suficiente, StrategyDecision puede decidir skipLLM = true incluso si purchaseIntent es alta.

**Relación:** DRL → StrategyDecision (señal de suficiencia). StrategyDecision mantiene su ownership único.

## 6.4 Conversation Interpreter

`interpretMessage()` continúa clasificando mensajes. La diferencia es que puede usar `DRL.clasificacion()` como fuente alternativa o complementaria para determinar el tipo de mensaje.

**Relación:** DRL → Conversation Interpreter (consulta opcional). Conversation Interpreter mantiene su responsabilidad de interpretar la conversación.

## 6.5 Pattern Discovery

Pattern Discovery continúa siendo puramente algorítmico y autónomo. La diferencia es que ahora puede consultar el BKE para enriquecer su análisis con datos estables del dominio (temporadas, clasificación de trayectos, etc.).

**Relación:** Pattern Discovery → BKE (consulta opcional). Pattern Discovery mantiene su pipeline de descubrimiento autónomo.

## 6.6 Business Layer (nuevo)

La Business Layer comprende BKE + DRL. Es la nueva base del escalamiento cognitivo. No reemplaza ningún componente existente; se inserta como una capa previa al LLM que todos los orquestadores pueden consultar.

**Relación:** Todos los orquestadores → DRL → BKE → Fuentes de verdad. La Business Layer no depende de ningún componente superior.

---

# 7. Relación con ADR-005 (AI-First Interpretation)

ADR-005 establecía que "las heurísticas están prohibidas para interpretación sensible al contexto" y que "cuando el sistema necesita interpretar datos ambiguos, debe pasar los datos al LLM y dejar que el LLM decida".

Este ADR modifica parcialmente ADR-005 introduciendo una capa de razonamiento determinístico previa al LLM:

| Aspecto | ADR-005 (original) | ADR-012 (este ADR) |
|---------|--------------------|------------------------|
| **Desambiguación de lugares** | LLM recibe candidatos y decide | BKE + DRL intentan primero; LLM solo si no pueden |
| **Mensajes de recuperación** | LLM genera pregunta contextual | BKE provee template contextualizado; LLM solo si BKE no es suficiente |
| **Prohibición de heurísticas** | Toda heurística está prohibida | Las heurísticas están permitidas en DRL si son reglas determinísticas sobre datos del BKE, no parches arbitrarios en SQL |
| **Criterio de uso de LLM** | "Cuando hay ambigüedad, usar LLM" | "Cuando BKE+DRL no pueden resolver, usar LLM" |

Lo que **no cambia** de ADR-005:
- Las heurísticas arbitrarias (parches en SQL, priority maps hardcodeados) siguen prohibidas
- El LLM sigue siendo la autoridad para comprensión semántica genuina
- La validación estructurada de salidas LLM se mantiene
- El fallback UI (opciones numeradas) se mantiene para casos donde BKE+DRL+LLM no pueden resolver

---

# 8. Estado

**ACEPTADO** — 2026-07-16.

Este ADR fue aceptado tras la implementación y certificación de la Serie CE. La implementación completa (PR-5A a PR-5F + PR-5G) cubre las 5 fases del roadmap CE-4, con las desviaciones documentadas en la Sección 9.

Este ADR no implica implementación inmediata. Su ejecución queda gobernada por el roadmap definido en CE-4 (Migration Roadmap), que establece 5 fases incrementales, reversibles y verificables:

| Fase | Objetivo | Capas involucradas |
|:----:|----------|--------------------|
| 0 | Infraestructura BKE + DRL + feature flags | BKE, DRL |
| 1 | Reemplazo de C3 (interpretAmbiguity) | BKE.geo + DRL.desambiguación |
| 2 | Simplificación de C4, C6 (comprensión) | BKE.message + DRL.clasificación |
| 3 | Asistencia a C1, C2, C5 (contexto enriquecido) | BKE.entity + DRL.suficiencia |
| 4 | Activación del stack cognitivo completo | BKE → DRL → LLM fallback |

La implementación de cada fase debe cumplir con los principios P1-P7 definidos en este ADR.

---

# 9. Implementación y desviaciones

La Serie CE fue implementada en los PRs PR-5A a PR-5F + PR-5G (cierre de certificación). A continuación se documentan las desviaciones entre el diseño arquitectónico y la implementación real:

## 9.1 Desviaciones aceptadas

| # | Diseño (CE-3A / CE-3B) | Implementación real | Justificación |
|:-:|------------------------|---------------------|---------------|
| D1 | Las reglas determinísticas deben vivir en la DRL (N1) — `src/lib/drl/rules/` | `geo-resolver.ts`, `comprehension-resolver.ts` y `recovery-resolver.ts` contienen reglas R1-R5, R1-R3, R1-R3 respectivamente pero residen en `src/lib/bke/services/` (N0) | Las reglas son específicas de cada dominio BKE (geo, comprensión, recuperación) y operan sobre datos BKE. Mantenerlas junto al dominio que las usa reduce la fragmentación de conocimiento. Se acepta como desviación arquitectónica documentada. |
| D2 | C6 (generateContextualRecovery) debe ser simplificado por DRL | `recovery-resolver.ts` implementa el reemplazo pero no está integrado en `comprehension-runner.ts` — el pipeline sigue usando `getRecoveryMessage()` directamente | La integración requiere modificar el flujo de recuperación conversacional, fuera del alcance de PR-5G. `DRL_RECOVERY_ENABLED` flag existe pero no tiene efecto. Pendiente de PR futuro. |
| D3 | 11 dominios BKE (CE-3A diseño) | 4 dominios implementados: geo, entity, pricing, message | Los 7 dominios restantes (hotels, airports, borders, attractions, wait-times, drivers, restrictions) son FUTURO. La arquitectura BKE soporta su incorporación incremental. |
| D4 | 7 familias de reglas DRL (CE-3B diseño) | 7 reglas implementadas: completitud, consistencia, clasificación, prioridad, suficiencia, escalamiento, geo-desambiguación + assistance | La familia "validación" no se implementó como regla independiente. Las validaciones existen distribuidas en las reglas existentes. Assistance es una familia adicional no prevista en el diseño original. |

## 9.2 Estado de feature flags

| Flag | Estado | Efecto |
|------|--------|--------|
| `BKE_ENABLED` | Implementado, default false | Control maestro BKE |
| `DRL_ENABLED` | Implementado, default false | Control maestro DRL |
| `BKE_GEO_ENABLED` | ✅ **Integrado** en `interpretAmbiguity` (PR-5G), default false | DRL geo antes de LLM en desambiguación |
| `DRL_COMPREHENSION_ENABLED` | ✅ Integrado en comprehension-runner, default false | DRL comprensión antes de LLM |
| `DRL_RECOVERY_ENABLED` | Implementado pero **sin integración**, default false | No tiene efecto — recovery-resolver no está conectado al pipeline |
| `DRL_EXTRACTION_ASSISTANCE_ENABLED` | ✅ Integrado en extraction pipeline, default false | DRL enrichment antes de C1 |
| `DRL_RESPONSE_ASSISTANCE_ENABLED` | ✅ Integrado en handler, default false | DRL enrichment antes de C2 |
| `DRL_FRUSTRATION_ASSISTANCE_ENABLED` | ✅ Integrado en handler, default false | DRL enrichment antes de C5 |
| `BKE_ENTITY_ENABLED` | ✅ Integrado en extract-slots, default false | BKE entity antes de extractor |
| `BKE_PRICING_ENABLED` | ✅ Integrado en resolve-pricing, default false | BKE pricing routing |
| `BKE_MESSAGE_ENABLED` | ✅ Integrado en handler, default false | BKE message para dominios informational/commercial |

## 9.3 Conformidad con principios arquitectónicos

| Principio | Conformidad | Notas |
|:---------:|:-----------:|-------|
| P1 — Source of Truth Única | ✅ | BKE es la puerta de acceso; orquestadores aún tienen acceso directo cuando flags=false (aceptable como migración progresiva) |
| P2 — No Duplicación de Conocimiento | ✅ | BKE no replica datos, consulta fuentes originales |
| P3 — Prioridad Conocimiento Explícito | 🟡 | Implementado para C3 (geo), C4 (comprensión), C1/C2/C5 (asistencia). Pendiente para C6 (recuperación) |
| P4 — Valor Incremental Demostrable | 🟡 | Feature flags permiten medir impacto, pero no hay línea base comparativa ejecutada |
| P5 — No Degradar UX | ✅ | Flags default false preservan comportamiento actual. LLM siempre es fallback |
| P6 — Presupuesto Cognitivo como Métrica | ✅ | Cognitive Metrics implementado (PR-5F) con collector, budget calculator, API endpoint |
| P7 — Proveedores Reemplazables | ✅ | DRL assistance no depende de proveedor específico |

---

# 10. Referencias arquitectónicas preservadas

Esta sección documenta la relación entre el ADR-012 (SSOT) y los documentos históricos que contienen información complementaria. El objetivo es permitir la eliminación de duplicados manteniendo la trazabilidad hacia fuentes detalladas.

## 10.1 Serie CE (Cognitive Efficiency Audit) — Archivo de implementación

La Serie CE documenta el diseño, implementación y certificación del stack cognitivo (BKE + DRL + LLM). Su información ha sido migrada o redefinida como sigue:

| Documento | Relación con ADR-012/ADR-014 | Contenido único preservado |
|-----------|------------------------------|----------------------------|
| **CE-1**: Cognitive Efficiency Audit | Cubierto por ADR-012 §3 (principios P1-P7) y §6 (fases de escalamiento). Las tablas de providers con firmas y costos, detalle de interruptor y presupuesto cognitivo son implementación específica. | 📌 Detalle de providers, firmas de API, costos por proveedor |
| **CE-2**: Instruction Evitability Analysis | La definición formal de "evitable" es un concepto arquitectónico valioso. Cubierto por ADR-012 §3 principio P4 (Valor Incremental Demostrable). | 📌 Definición formal de evitable |
| **CE-3A**: BKE Specifications | **Redefinido por ADR-014** — ADR-014 eliminó BKE como concepto arquitectónico preservando funcionalidad. Los 11 dominios BKE del diseño original se redujeron a 4 implementados (geo, entity, pricing, message). Los 7 restantes son FUTURO. | 🗑️ Redefinido. Los principios BKE viven en ADR-014. |
| **CE-3B**: DRL Specifications | **Redefinido por ADR-014** — ADR-014 eliminó DRL como capa independiente. Las 7 familias de reglas DRL se preservan como reglas de dominio. | 🗑️ Redefinido. Los principios DRL viven en ADR-014. |
| **CE-4**: Migration Roadmap | Histórico — el roadmap de migración (5 tracks) ya fue ejecutado en PR-5A a PR-5F. | 🗑️ Histórico ejecutado |
| **CE-5**: Implementation Readiness | Histórico — reporte de implementación post-PR-5G. Las desviaciones D1-D4 ya están documentadas en ADR-012 §9.1. | 🗑️ Histórico ejecutado |

> **Decisión**: CE-3A, CE-3B, CE-4 y CE-5 son candidatos a eliminación post-migración. CE-1 y CE-2 se preservan como referencia arquitectónica por contener detalle de proveedores y definiciones formales no reducibles al ADR.

## 10.2 Serie PR-7 (Cognitive Architecture Audit) — Exploración conceptual

La serie PR-7 documenta la exploración conceptual del modelo cognitivo de AITOS. Su contenido es información única **no cubierta** por los ADRs actuales:

| Documento | Contenido único | Relación con ADR-012 |
|-----------|-----------------|----------------------|
| **PR-7A**: Learning Ontology Audit | Distinción ontológica "lenguaje de TENDENCIA" vs "lenguaje de HECHO". Test de 5 criterios de independencia de capa. 6 invariantes L-1 a L-6 de aprendizaje. | 📌 No cubierto. La ontología de aprendizaje no está formalizada en ningún ADR. |
| **PR-7B**: Formal Mathematical Model | Modelo matemático formal con 9 invariantes de escalamiento cognitivo. | 📌 No cubierto. Los ADRs actuales son cualitativos. |
| **PR-7C**: Learning Parameter Space | Espacio de parámetros de aprendizaje: learning rate, temperature, confidence thresholds. | 📌 No cubierto. No hay ADR de parametrización. |
| **PR-7D**: Contract Derivation | Derivación formal de contratos entre capas cognitivas. | 📌 No cubierto. Complementa ADR-007 (contratos generales). |
| **PR-7E**: Identity Audit | Auditoría de identidad del sistema cognitivo. | 📌 No cubierto. |
| **PR-7F**: Minimality Proof | Prueba de minimalidad del stack cognitivo. | 📌 No cubierto. |
| **PR-7G**: Pattern Semantics Audit | Auditoría semántica de patrones conversacionales vs cognitivos. | 📌 No cubierto. |

> **Decisión**: La serie PR-7 se preserva **completa** como archivo de exploración arquitectónica. Su información (especialmente PR-7A y PR-7B) podría fundamentar futuros ADRs de ontología de aprendizaje y parametrización cognitiva.

---

## 10.3 Estado de documentos históricos D4

| Documento | Estado | Acción |
|-----------|--------|--------|
| CE-1_COGNITIVE_EFFICIENCY_AUDIT.md | 📌 Preservar | Referencia de providers y costos |
| CE-2_INSTRUCTION_EVITABILITY_ANALYSIS.md | 📌 Preservar | Definición formal de evitable |
| CE-3A_BKE_SPECIFICATION.md | 🗑️ Eliminar | Redefinido por ADR-014 |
| CE-3B_DRL_SPECIFICATION.md | 🗑️ Eliminar | Redefinido por ADR-014 |
| CE-4_MIGRATION_ROADMAP.md | 🗑️ Eliminar | Roadmap ejecutado |
| CE-5_IMPLEMENTATION_READINESS.md | 🗑️ Eliminar | Reporte ejecutado |
| PR-7A_LEARNING_ONTOLOGY_AUDIT.md a PR-7G_PATTERN_SEMANTICS_AUDIT.md | 📌 Preservar | Archivo de exploración conceptual |

---

*Fin de ADR-012 — Cognitive Escalation Principle*
