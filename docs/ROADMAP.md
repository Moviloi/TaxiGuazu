# ROADMAP — Plan Maestro de Evolución de AITOS
## Versión 1.0 | Julio 2026

> Derivado del Baseline certificado. Hoja de ruta oficial.

---

## Estado Actual

| Indicador | Valor |
|---|---|
| Build | ✅ PASS |
| Contracts R1-R4 | ✅ PASS |
| Tests | 875/876 (99.9%) |
| Deuda resuelta | 19 items (P0+P1) |
| Deuda pendiente | 21 items (5 P1 + 10 P2 + 6 P3) |
| R2 Phase 1 | ✅ Conversation Speed — greetingLength, skipConfirmation, minimizeQuestions en StrategyDecision |
| R3 Phase 1 | ✅ Conversation Tone — responseLength, reassuranceNeeded, callToAction en StrategyDecision |
| R4 Phase 1 | ✅ Field Priority — fieldAcquisitionMode, fieldPriority en StrategyDecision |
| R5 Phase 2 | ✅ StrategyDecision Activation — 5 fallbacks eliminados, LLM prompt inyectado con SD context, Architecture Freeze activado |
| Cobertura crítica alta | CORE, Router, Dispatch (>80%) |
| Cobertura crítica baja | Survey, Admin, Sender (<40%) |

---

## ⚠️ Architecture Freeze (activado en R5)

A partir de R5, la arquitectura está congelada. No se permite:

- Agregar **nuevos tipos, interfaces o campos** a los contratos entre capas sin ADR
- Crear **nuevos puntos de lectura de señales originales** (messageType, clientObjective, etc.) sin pasar por `StrategyDecision`
- Introducir **nuevos patrones de fallback híbrido** (StrategyDecision + señal original con `??`)
- Modificar **firmas de funciones públicas** en `types.ts` sin ADR

**Excepciones**: cambios estrictamente localizados en implementación, bug fixes que no alteran contratos, y refactors que eliminan código sin cambiar comportamiento.

Cualquier cambio arquitectónico requiere:
1. ADR con evidencia de por qué el cambio es necesario
2. Revisión del impacto en los 4 contratos R1-R4
3. Aprobación explícita antes de implementar

---

## Dominios congelados

Estos dominios NO se tocan en el roadmap actual. Están estabilizados:

| Dominio | Motivo |
|---|---|
| **Pricing** | Semi-frozen Phase D. Dual engine v2/v3 estable. |
| **Geo** | Unificado en location-resolver.ts. Sin cambios necesarios. |
| **Dispatch** | Maduro. 4-level escalation estable. |
| **CORE** | Deterministic intent classifier. Cambios mínimos desde 2026-06. |
| **Policy (Reserva/Ahora)** | Compleja pero estable. Riesgo alto de regresión. |

## Dominios en evolución

Estos dominios admiten cambios en las fases indicadas:

| Dominio | Fase | Cambios previstos |
|---|---|---|
| **Lead Service** | Fase 2 | Split god orchestrator |
| **Extraction** | Fase 2 | Unificar corrección de slots |
| **Learning** | Fase 3 | Formalizar feedback loop |
| **Survey** | Fase 3 | Cobertura de tests + mejoras |
| **Admin** | Fase 3 | Cobertura de tests |
| **I18n** | Fase 4 | Completar migración |
| **Observability** | Fase 4 | Sentry + métricas operativas |

---

# FASES

---

## Fase 1: Estabilización Final (1-2 semanas)
**Objetivo**: Cerrar todas las deudas P1 pendientes. Dejar el sistema 100% verde.

### I1.1 — Cerrar fase-22 T2
- **Problema**: 1 test falla por decisión funcional no tomada. El sistema preserva origin en correcciones parciales.
- **Impacto**: 875/876 → 876/876. CI/CD completamente verde.
- **Dominios**: Extraction, Lead Service
- **Dependencias**: Ninguna
- **Riesgo**: MEDIO — si se modifica código podría romper flujo de corrección real
- **Criterios de finalización**: Decisión documentada + test actualizado o código corregido
- **Prioridad**: **CRÍTICA**

### I1.2 — Ownership de `updateTripTariff`
- **Problema**: Persistencia de tarifa vive en dominio Trip. Debería estar en Pricing.
- **Impacto**: Claridad de dominio. Pricing posee todas las operaciones de tarifa.
- **Dominios**: Pricing, Trip
- **Dependencias**: Ninguna
- **Riesgo**: BAJO — mover función, no cambiar lógica
- **Criterios de finalización**: `updateTripTariff` reside en `services/pricing/`

### I1.3 — Eliminar dependencia survey→lead
- **Problema**: `lead-event-helpers.ts` crea acoplamiento vertical post-venta→preventa. Documentado en DEBT-02.
- **Impacto**: Elimina acoplamiento entre bounded contexts
- **Dominios**: Survey, Lead
- **Dependencias**: Ninguna
- **Riesgo**: BAJO — extraer interfaz compartida
- **Criterios de finalización**: Survey no importa de Lead

### I1.4 — Renombrar tablas con tags de fase
- **Problema**: `f9_events`, `f4_log`, `conversation_f4_log` tienen etiquetas de desarrollo en producción.
- **Impacto**: Higiene de schema. Prevención de confusión futura.
- **Dominios**: DB, Learning
- **Dependencias**: Ninguna
- **Riesgo**: ALTO — migración de datos en producción
- **Criterios de finalización**: Nombres limpios, 0 referencias a tags de fase

---

## Fase 2: Refactorización Arquitectónica (2-4 semanas)
**Objetivo**: Resolver deuda estructural P2. Simplificar sin romper.

### I2.1 — Split Lead Service (god orchestrator)
- **Problema**: 750 líneas, 24 early returns, 8 zonas de estado. Monolito.
- **Impacto**: Extraer sub-handlers por estado (slot_confirmation, awaiting_passenger, awaiting_confirmation). Mantenibilidad.
- **Dominios**: Lead Service, Workflow
- **Dependencias**: I1.1 (fase-22 resuelto)
- **Riesgo**: ALTO — toca el orquestador central
- **Criterios de finalización**: `lead.service.ts` < 300 líneas, sub-handlers testeados

### I2.2 — Fragmentar Database Facade
- **Problema**: `database.ts` 870 líneas, 63 funciones. Monolito.
- **Impacto**: Separar por dominio. Cada dominio accede a su facade.
- **Dominios**: DB
- **Dependencias**: Ninguna
- **Riesgo**: MEDIO — refactor interno, API pública estable
- **Criterios de finalización**: Facades por dominio, sin pérdida de funciones

### I2.3 — Fragmentar Ambiguity Handler  
- **Problema**: 786 líneas, archivo más grande del sistema. Mezcla detección, respuesta y UI.
- **Impacto**: Separar en detector + builder + UI. Testeable.
- **Dominios**: Workflow, AI
- **Dependencias**: I2.1 (split de lead service)
- **Riesgo**: ALTO — código complejo multi-turn
- **Criterios de finalización**: <300 líneas por archivo, coverage >60%

### I2.4 — Auditoría de acceso DB (DEBT-09)
- **Problema**: Servicios acceden a DB por múltiples paths. No hay patrón único.
- **Impacto**: Consistencia en acceso a datos
- **Dominios**: Todos los servicios
- **Dependencias**: I2.2
- **Riesgo**: BAJO — solo auditoría y normalización
- **Criterios de finalización**: Reporte de 0 bypasses. enforce.sh lo verifica.

### I2.5 — Eliminar dual engine v2 (pricing)
- **Problema**: `resolvePricingForSlots` ejecuta v2 y v3 en paralelo. v2 no aplica reglas comerciales.
- **Impacto**: Reduce 50% de queries de pricing por request
- **Dominios**: Pricing
- **Dependencias**: I1.2
- **Riesgo**: MEDIO — divergencia v2/v3 solo informativa
- **Criterios de finalización**: v2 eliminado. Divergence log removido. Tests adaptados.

### I2.6 — Completar i18n
- **Problema**: ~15 bloques de texto hardcodeado restantes (DEBT-06 + FUT-01 fase 5-7)
- **Impacto**: Multi-idioma completo. Consistencia de mensajes.
- **Dominios**: I18n, AI, Timeouts, Lead Service
- **Dependencias**: I2.1
- **Riesgo**: BAJO — migración mecánica
- **Criterios de finalización**: 0 strings hardcodeados fuera del catálogo

---

## Fase 3: Calidad y Experiencia Conversacional (3-6 semanas)
**Objetivo**: Elevar cobertura de tests y calidad del bot.

### I3.1 — Coverage en dominios críticos
- **Problema**: Survey (<30%), Admin (<30%), Sender (<40%), Ambiguity (<40%) sin tests adecuados.
- **Impacto**: Detección temprana de regresiones en flujos post-trip y admin.
- **Dominios**: Survey, Admin, Sender, Workflow
- **Dependencias**: I2.1, I2.3
- **Riesgo**: BAJO — solo agregar tests
- **Criterios de finalización**: Todos los dominios >60% coverage

### I3.2 — Mejora de comprensión (comprehension)
- **Problema**: Bot escala temprano con mensajes ambiguos. Sin re-prompt LLM antes de escalar.
- **Impacto**: Reducción de escalaciones innecesarias. Mejor experiencia.
- **Dominios**: Extraction, AI
- **Dependencias**: I1.1
- **Riesgo**: MEDIO — cambios en flujo conversacional
- **Criterios de finalización**: Tasa de escalación reducida, sin falsos positivos

### I3.3 — Formalizar feedback loop de aprendizaje
- **Problema**: Learning engine disperso. Oportunidades, fare learning y policy A/B sin orquestación.
- **Impacto**: Mejora continua automatizada de pricing y sugerencias
- **Dominios**: Learning, Pricing, Dispatch
- **Dependencias**: I2.5
- **Riesgo**: ALTO — aprendizaje automático sobre decisiones de negocio
- **Criterios de finalización**: Learning pipeline documentado, métricas de mejora

### I3.4 — Hotspots restantes (>400L)
- **Problema**: 7 archivos >400L. Complejidad cíclica alta.
- **Impacto**: Mantenibilidad. Facilita onboarding.
- **Dominios**: Extraction, Dispatch, Workflow
- **Dependencias**: I2.1, I2.3
- **Riesgo**: MEDIO — refactor sin cambio funcional
- **Criterios de finalización**: 0 archivos >400L (excepto catálogos de datos)

---

## Fase 4: Observabilidad y Operaciones (4-8 semanas)
**Objetivo**: Visibilidad en producción. Preparar para escala.

### I4.1 — Observabilidad completa
- **Problema**: Solo Sentry. Sin tracing distribuido. Sin dashboard de operaciones.
- **Impacto**: Debugging en producción. Monitoreo de salud del sistema.
- **Dominios**: Infraestructura, todos los servicios
- **Dependencias**: I2.4
- **Riesgo**: BAJO — infraestructura, no lógica de negocio
- **Criterios de finalización**: Tracing end-to-end, dashboard de operaciones, alertas

### I4.2 — Métricas de negocio
- **Problema**: `GET /api/bot/metrics` existe pero es básico. Sin tracking de conversión real.
- **Impacto**: Decisiones de negocio basadas en datos
- **Dominios**: Admin, Learning
- **Dependencias**: I4.1
- **Riesgo**: BAJO — endpoints nuevos
- **Criterios de finalización**: Dashboard de negocio con conversión, revenue, satisfacción

### I4.3 — Auditoría de seguridad
- **Problema**: Sin tests de penetración. Sin revisión de surface de ataque.
- **Impacto**: Prevención de incidentes de seguridad
- **Dominios**: Webhook, API
- **Dependencias**: Ninguna
- **Riesgo**: BAJO — solo auditoría
- **Criterios de finalización**: Reporte de seguridad. 0 hallazgos críticos.

### I4.4 — CI/CD hardening
- **Problema**: Tests tardan 74s. Sin parallelización. Sin pre-commit hooks completos.
- **Impacto**: Velocidad de desarrollo
- **Dominios**: Infraestructura
- **Dependencias**: I3.1
- **Riesgo**: BAJO
- **Criterios de finalización**: Suite <60s, pre-commit hooks 100%

---

## Fase 5: Escalabilidad y Plataforma (futuro)
**Objetivo**: Preparar AITOS para crecimiento. Fase condicional — iniciar solo si hay demanda.

### I5.1 — Event Sourcing para Trips
- **Problema**: Estado de trip se mantiene en columna `status`. Sin proyección desde eventos.
- **Impacto**: Audit trail completo. Reconstrucción de estado.
- **Dominios**: Trip, Dispatch
- **Dependencias**: I2.2
- **Riesgo**: ALTO — cambio de paradigma de persistencia
- **Criterios de finalización**: Estado de trip derivado de eventos

### I5.2 — Multi-tenancy
- **Problema**: Un solo tenant (TaxiGuazú). Sin aislamiento para múltiples operadores.
- **Impacto**: Expansión a nuevos mercados/operadores
- **Dominios**: Todos
- **Dependencias**: I2.2, I2.4
- **Riesgo**: MUY ALTO — afecta toda la arquitectura
- **Criterios de finalización**: Segundo tenant operando en producción

### I5.3 — Canales adicionales
- **Problema**: Solo WhatsApp. Sin web chat, Telegram, o API pública.
- **Impacto**: Nuevos canales de adquisición
- **Dominios**: Entry points, Sender
- **Dependencias**: I2.1
- **Riesgo**: MEDIO — abstracción de canal existente parcial
- **Criterios de finalización**: Segundo canal en producción

---

## Deuda que PUEDE esperar

| ID | Descripción | Hasta fase |
|---|---|---|
| DEBT-07 | AI→Services coupling (response-builder) | Fase 2 |
| DEBT-10 | seed-data.ts cobertura | Fase 3 |
| DEBT-11 | policy-pipeline conversion | Fase 2 |
| GAP-01 a GAP-07 | Gaps documentados | Fase 3 |
| Zombie DB columns | trip_status, workflows table | Fase 2 |
| Dead params | _history, _customerName, etc. | Fase 2 |
| FUT-01 a FUT-10 | Features futuras | Fase 3-5 |

## Deuda que DEBE resolverse antes de agregar funcionalidades

| ID | Descripción | Bloquea |
|---|---|---|
| P1-01 (fase-22) | 1 test fallando | CI/CD verde |
| DEBT-02 | survey→lead acoplamiento | Cualquier cambio en Survey o Lead |
| DEBT-06 (i18n) | Strings hardcodeados | Nuevos features multi-idioma |
| DEBT-09 | Auditoría DB access | I4.1 (observabilidad) |
| I1.2 | updateTripTariff ownership | I2.5 (eliminar v2) |

---

## Oportunidades de simplificación

| Oportunidad | Fase | Ahorro estimado |
|---|---|---|
| Eliminar dual engine v2 | Fase 2 | 50% queries de pricing |
| Split lead.service.ts | Fase 2 | −500 líneas del orquestador |
| Unificar CORE calls (2 → 1) | Fase 2 | −50% llamadas a core() |
| Eliminar dead DB columns | Fase 2 | −3 columnas, −1 tabla |
| Pricing tool wrapper real | Fase 3 | Elimina divergencia tool/internal |

## Oportunidades de innovación

| Oportunidad | Fase | Valor |
|---|---|---|
| Re-prompt LLM antes de escalar | Fase 3 | Reducción de falsas escalaciones |
| Learning loop automatizado | Fase 3 | Pricing adaptativo |
| Dashboard de operaciones | Fase 4 | Visibilidad en tiempo real |
| Event sourcing para Trips | Fase 5 | Audit trail completo |
| Multi-tenancy | Fase 5 | Nuevo revenue stream |

---

## Timeline visual

```
Fase 1 (1-2 sem)  ████░░░░░░░░░░░░░░░░  Estabilización final
Fase 2 (2-4 sem)  ░░░░████████░░░░░░░░  Refactorización
Fase 3 (3-6 sem)  ░░░░░░░░░░░░████████░░  Calidad + Conversación
Fase 4 (4-8 sem)  ░░░░░░░░░░░░░░░░░░████  Observabilidad
Fase 5 (futuro)   ░░░░░░░░░░░░░░░░░░░░░░  Escalabilidad (condicional)
```

---

## Estado: Architecture & Stabilization → CERRADA. Human Experience & Pilot Optimization → ACTIVA.
