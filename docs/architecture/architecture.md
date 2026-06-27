# Architecture — TaxGuazú

## Visión general

Bot de WhatsApp que procesa mensajes entrantes a través de un pipeline conversacional determinístico, extrae datos con LLM, gestiona estados de conversación, y coordina dispatch a choferes. El sistema sigue una arquitectura en capas con dirección de dependencia estricta.

## Autoridad

Las decisiones arquitectónicas están documentadas en:

- `docs/adr/001-layered-architecture.md` — Arquitectura en capas
- `docs/adr/002-database-facade.md` — Patrón de fachada de base de datos
- `docs/adr/003-learning-domain.md` — Consolidación del dominio de aprendizaje
- `docs/adr/004-service-boundaries.md` — Reglas de límites de servicios

Este documento describe el estado actual del sistema. Cuando exista contradicción entre este documento y los ADRs, los ADRs tienen prioridad.

---

## Arquitectura de comportamiento del sistema

El sistema procesa mensajes a través de un pipeline funcional de 4 fases.
Esto describe flujo conversacional, NO capas de código ni arquitectura de desarrollo.

### Flujo

```
Detección → Clasificación → Decisión → Respuesta
   (CORE)      (CORE)       (POLICY)    (OUTPUT)
```

| Fase | Qué hace | Entrada | Salida |
|------|----------|---------|--------|
| **CORE** | Detecta intención, extrae hechos, evalúa confianza | Texto del usuario | CoreDecision (intent, facts, slot stability) |
| **ROUTER** | Determina flujo de respuesta según modo | CoreDecision | OutputType |
| **POLICY** | Toma decisión de respuesta basada en reglas, sin LLM | CoreDecision + slots + contexto | Decisión de respuesta + outputSource |
| **OUTPUT** | Comunica resultado al usuario vía WhatsApp | Decisión de respuesta | Mensaje enviado |

### Transiciones de estado

- CORE puede retornar AMBIGUOUS si la confianza es baja
- ROUTER puede redirigir a laterales (EMERGENCY, RESCHEDULE, POST_SERVICE)
- POLICY puede requerir extracción adicional (collecting_slots)
- OUTPUT puede incluir confirmación de campos (awaiting_confirmation)

> Este flujo es funcional/conversacional. Las carpetas del código (`ai/`, `services/`, `workflow/`) NO mapean 1:1 a estas fases.

---

## Arquitectura técnica

### Capas

```
Config → Auth → Utils
   ↓
DB (core → types → domains → facade)
   ↓
WhatsApp · AI
   ↓
Services (i18n → Geo → Memory → Pricing → Learning → Extraction → Workflow → Dispatch → Trip-execution → Admin → Housekeeping)
   ↓
Lead (orchestrator)
   ↓
API routes
```

### Responsabilidades por capa

| Capa | Responsabilidad | Archivos clave |
|------|-----------------|----------------|
| **Config** | Variables de entorno, constants, configuración estática | `config/constants.ts`, `config/env.ts` |
| **Utils** | Funciones puras sin dependencias del proyecto | `utils/clamp.ts`, `utils/logger.ts` |
| **DB Core** | Conexión, helpers de query | `db/core/connection.ts`, `db/core/helpers.ts` |
| **DB Types** | Definiciones de tipos de filas | `db/types.ts` |
| **DB Domains** | Queries específicas por dominio | `db/domains/*.ts` |
| **DB Facade** | Superficie única de acceso a datos (63+ funciones exportadas) | `db/database.ts` |
| **WhatsApp** | Cliente de mensajería Cloud API | `whatsapp/sender.ts` |
| **AI** | LLM, clasificación de intención, políticas, respuesta | `ai/*.ts` |
| **Services** | Lógica de negocio por dominio | `services/*/` |
| **Lead** | Orquestador de alto nivel | `lead.service.ts` |
| **API Routes** | HTTP handlers, delgados, sin lógica de negocio | `app/api/*/` |

### Contratos entre capas

| Contrato | Descripción |
|----------|------------|
| DB Facade → Services | Services importan SOLO de `database.ts`, nunca de `db/core/` o `db/domains/` directamente |
| AI → Services | AI NO importa de Services |
| Services → Lead | Lead es el único orquestador de alto nivel; Services NO importan de Lead |
| Services internos | Sigue el orden de dependencia de ADR 004 |

### Orden de dependencia de servicios (ADR 004)

```
i18n  (leaf — no service imports)
  ↓
Geo
  ↓
Memory / Pricing
  ↓
Learning
  ↓
Extraction
  ↓
Workflow
  ↓
Dispatch
  ↓
Trip-execution
  ↓
Admin / Housekeeping
  ↓
Lead (top-level orchestrator)
```

---

## Gaps y problemas de diseño conocidos

### Violaciones de contratos

| Gap | Archivos afectados | Severidad |
|-----|-------------------|-----------|
| learning/ importa de `db/domains/learning.ts` directamente, bypaseando facade | `services/learning/*.ts` | MEDIA |
| 4 archivos de servicio usan `getDb()` o `queryOne()` directamente | Varios en services/ | MEDIA |
| `response-builder.ts` importa `OpportunityResult` de learning (viola AI→Services) | `ai/response-builder.ts` | MEDIA |
| `guard.ts` tiene state a nivel de módulo, no request-scoped | `ai/guard.ts` | ALTA |

### Problemas de diseño

| Problema | Archivo | Impacto |
|----------|---------|---------|
| `database.ts` demasiado grande (694 líneas, 63 funciones) | `db/database.ts` | Difícil de razonar, testear y dividir |
| `lead.service` alto acoplamiento (27 imports, 11 cross-service) | `lead.service.ts` | Cualquier cambio en un dominio puede romper orquestación |
| Cadena circular `survey.service → lead.service` | `trip-execution/survey.service.ts` | Riesgo de dependencia circular en runtime |
| `policy-pipeline` con demasiadas responsabilidades (policy + dispatch + learning + memory + pricing + trip-execution) | `workflow/policy-pipeline.ts` | 312 líneas, 6 dependencias cross-service |

### Archivos que superan 300 líneas

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `db/database.ts` | 694 | Facade de acceso a datos (63 funciones) |
| `ai/policy-reserva.ts` | 486 | Policy de reservas |
| `db/core/connection.ts` | 482 | Conexión SQLite/Turso |
| `services/dispatch/driver.service.ts` | 473 | Servicio de choferes |
| `services/admin/admin-commands.ts` | 463 | Comandos administrativos |
| `services/extraction/extraction-runner.ts` | 443 | Runner de extracción |
| `services/dispatch/dispatch.service.ts` | 383 | Servicio de dispatch |
| `db/domains/trips.ts` | 341 | Queries de viajes |
| `services/workflow/policy-pipeline.ts` | 312 | Pipeline de políticas |

### Cadena circular identificada

```
lead.service → workflow/policy-pipeline → trip-execution/trip-execution.service → ...
lead.service → housekeeping/timeouts → trip-execution/survey.service → lead.service ⚠️
```

### Deuda técnica menor

| Gap | Archivos | Severidad |
|-----|----------|-----------|
| i18n inline en 30+ bloques if/else | `policy-ahora.ts`, `policy-reserva.ts`, `response-builder.ts` | BAJA |
| `AFFIRMATION_RE` duplicado con implementaciones diferentes | `ai/core.ts`, `ai/patterns.ts` | BAJA |

---

## Glosario del dominio

| Término | Definición |
|---------|-----------|
| **Intent** | Clasificación primaria de la intención del mensaje (11 valores) |
| **Slot** | Campo de datos que el sistema necesita para procesar un viaje |
| **Workflow** | Máquina de estados de la conversación (idle → nivel_1 → nivel_2 → ...) |
| **Dispatch** | Asignación de un viaje a un chofer (nivel_1 → nivel_2 → nivel_3 → broadcast) |
| **FunnelState** | Estado derivado del proceso de servicio (7 valores, no máquina de estados) |
| **Serviceability** | Probabilidad de que TaxiGuazú pueda cumplir el viaje al precio cotizado |
| **LeadMaturity** | Probabilidad de cierre basada en completitud de datos + señales de comportamiento |
| **CustomerValue** | Tier estratégico del cliente (NEW / RETURNING / VIP / AT_RISK) |
| **Role Lock** | Bloqueo de campos confirmados por el usuario — el LLM no los modifica |
| **CoreDecision** | Salida del CORE: intent + facts + slot stability |
| **OutputType** | Modo de respuesta seleccionado por ROUTER |
| **Policy** | Generador de respuesta basado en reglas (sin LLM) |
| **Lateral** | Manejo de intenciones laterales (EMERGENCY, RESCHEDULE, POST_SERVICE) |
