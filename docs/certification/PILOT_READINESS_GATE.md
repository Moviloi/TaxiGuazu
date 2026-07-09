# PILOT READINESS GATE — AITOS
## 2026-07-08 | Gate de salida de Architecture & Stabilization

---

## Evidencia de validación

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests | 875/876 (99.9%) |
| Contratos R1-R4 | ✅ PASS |
| Schema Parity | ✅ 44/44 |
| Lead service | 264 líneas (−65%) |
| ADRs | 7 (001-007) |
| Bounded contexts | 8 |
| Código zombie/legacy eliminado | 11 archivos, 5 funciones |
| geo-engine | Eliminado |
| Pricing ownership | Corregido |

## Bloqueantes reales (P0)

| # | Bloqueante | Tipo | ¿Impide piloto? |
|---|---|---|---|
| 1 | ADMIN_API_KEY sin rotar (expuesta) | Operacional | **SÍ** — riesgo de seguridad |
| 2 | SENTRY_DSN sin configurar | Operacional | **SÍ** — sin captura de errores |
| 3 | LOG_LEVEL no configurado en Vercel | Operacional | No — reduce visibilidad pero no bloquea |

## Bloqueantes de código: NINGUNO

No hay bugs de código que impidan cotizar, reservar, confirmar o despachar viajes. El bug B3 (entity-extractor + "argentino") está diagnosticado y tiene ADR-007 aprobada para resolverlo, pero no impide la operación básica.

## Riesgos operativos

| Riesgo | Clasificación |
|---|---|
| Sin captura de errores en producción | ALTO |
| ADMIN_API_KEY comprometida | CRÍTICO |
| Gemini rate limit (429 en tests) | MEDIO — fallback a Groq funciona |
| Sin test de webhook en vivo | MEDIO |
| Choferes sin seed en Turso | ALTO — sin choferes no hay dispatch |

## Deuda: qué resolver antes del piloto

| Tarea | Prioridad |
|---|---|
| Rotar ADMIN_API_KEY | P0 |
| Configurar SENTRY_DSN | P0 |
| Seed de choferes en Turso | P0 |
| Verificar webhook WhatsApp en vivo | P1 |
| Configurar LOG_LEVEL | P1 |

## Deuda: qué puede esperar

| Tarea | Fase |
|---|---|
| Conversation Interpreter (ADR-007) | Post-piloto |
| Entity-extractor fix (B3) | Durante piloto |
| LRU cache para aliases | Durante piloto |
| P1-P3 del Project Board | Post-piloto |

---

## Veredicto

**AITOS está listo para piloto condicional.** Los bloqueantes son operacionales (keys, config, seed de datos), no de código. Una vez resueltos P0-01, P0-02 y seed de choferes, el sistema puede operar con usuarios reales.

### Cambio oficial de etapa

**Architecture & Stabilization → CERRADA.**

**Human Experience & Pilot Optimization → INICIADA.**
