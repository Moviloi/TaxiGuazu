# DEFERRED MIDDLEWARE — Decisión Arquitectónica

> **Estado**: ⏳ Diferido a Post-v1
> **Decisión**: 2026-07-16 | **Origen**: PRD-05 (H0A-03)
> **Documento asociado**: `docs/certification/H0A_STAGING_HARDENING_AUDIT.md`

---

## 1. ¿Qué se difiere?

La implementación de un **middleware centralizado (`middleware.ts`)** para Next.js que unifique:

- Autenticación (verificación de API key para rutas admin)
- Protección CSRF
- Content Security Policy (CSP) headers
- Rate limiting global
- Validación de entrada centralizada
- Logging de seguridad estructurado

Actualmente cada endpoint implementa su propia validación:
- **Webhook** (`/api/whatsapp/webhook`): HMAC verification + rate limiting inline
- **Rutas admin** (`/api/admin/*`): API key check inline
- **Rutas de negocio** (`/api/bot/*`): Sin autenticación (diseñado para consumo interno)

---

## 2. ¿Por qué se difiere?

### 2.1 Sin tráfico real, es sobreingeniería

El sistema no tiene usuarios reales en producción. No hay datos de:
- Volumen de requests por ruta
- Patrones de ataque reales
- Cuellos de botella de seguridad
- Fallos de validación inline

Implementar un middleware centralizado sin estos datos **optimiza para un escenario que podría no ocurrir**.

### 2.2 Costo de abstracción innecesaria

Un middleware bien diseñado requiere:
- Definir el orden exacto de ejecución de middlewares
- Manejar exclusiones por ruta (webhooks públicos necesitan lógica diferente)
- Tests de integración para cada combinación de middlewares
- Mantenimiento continuo del pipeline de seguridad

Este costo no se justifica hasta que la validación inline demuestre ser insuficiente.

### 2.3 La validación inline es suficiente para v1.0

Cada endpoint existente tiene la validación mínima necesaria:
| Ruta | Validación actual | Riesgo |
|---|---|---|
| `/api/whatsapp/webhook` | HMAC SHA-256 + rate limiting | Bajo — verificada por WhatsApp |
| `/api/admin/*` | API key check | Bajo — acceso controlado |
| `/api/bot/*` | Consumo interno | Bajo — sin exposición externa |

### 2.4 Principio YAGNI aplicado

You Aren't Gonna Need It — hasta que el tráfico real demuestre lo contrario. La centralización de seguridad es una optimización que paga su costo solo cuando hay suficiente complejidad que lo justifique.

---

## 3. Riesgos aceptados

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| **R-MW-01** | Endpoint nuevo olvida implementar validación inline | 🟡 **MEDIA** | Code review obligatorio para todo nuevo endpoint. La ausencia de middleware es conocida y documentada. |
| **R-MW-02** | HMAC o API key check inconsistentes entre endpoints | 🟢 **BAJA** | Sólo 15 rutas totales. La validación sigue el mismo patrón en todos. Fácil de auditar. |
| **R-MW-03** | CSP/CSRF inexistentes facilitan ataque XSS | 🟠 **ALTA** | No hay formularios web públicos. El webhook recibe POST solo de WhatsApp Cloud API (IP fija + HMAC). Riesgo contenido. |
| **R-MW-04** | Rate limiting descentralizado permite abuso en rutas sin límite | 🟢 **BAJA** | Rate limiting existe en webhook (ruta crítica). Otras rutas son internas o admin. |
| **R-MW-05** | Deuda técnica crece al diferir — más rutas = más costoso migrar | 🟢 **BAJA** | Next.js middleware opera por patrón de ruta. Agregarlo después no requiere cambiar rutas existentes — solo definir el matcher. |

### Riesgo aceptado — no mitigado

- **R-MW-03** es el único riesgo considerado **ALTO**. Se acepta explícitamente porque:
  1. No hay formularios web interactivos (el bot es conversacional vía WhatsApp)
  2. La única superficie POST pública es el webhook de WhatsApp (protegido por HMAC)
  3. Las rutas admin solo son accesibles con API key conocida
  4. Agregar CSP ahora agregaría complejidad sin beneficio medible

---

## 4. Condiciones para retomarlo

El middleware se implementará cuando **cualquiera** de estas condiciones se cumpla:

### 4.1 Condiciones de seguridad (cualquiera)
- [ ] Se detecta un **incidente de seguridad** atribuible a falta de validación centralizada
- [ ] Un **pen test o auditoría externa** recomienda explícitamente middleware centralizado
- [ ] Se agrega un **nuevo endpoint público** (además del webhook actual)

### 4.2 Condiciones de tráfico (cualquiera)
- [ ] El tráfico supera **X requests/día** (umbral a definir con datos reales post-lanzamiento)
- [ ] Se identifican **patrones de abuso** en rutas actualmente sin rate limiting
- [ ] El tiempo de debugging de incidentes de seguridad supera **Y horas/mes**

### 4.3 Condiciones de plataforma (cualquiera)
- [ ] Se agrega un **nuevo canal** (web chat, Telegram) con autenticación diferente
- [ ] Se implementa **multi-tenancy** con diferentes políticas de seguridad por tenant
- [ ] La aplicación requiere **certificación de seguridad** (SOC2, ISO 27001, etc.)

---

## 5. Criterio de aceptación futuro

Cuando se decida retomar esta deuda, el middleware debe cumplir:

### 5.1 Funcional (debe)
- [ ] **Autenticación unificada**: todas las rutas admin verifican API key en un solo punto
- [ ] **Rate limiting centralizado**: configuración por ruta, con valores por defecto sensatos
- [ ] **CSP headers**: política estricta pero funcional (sin romper estilos/scripts existentes)
- [ ] **Logging estructurado**: cada request logged con timestamp, ruta, IP, resultado de validación
- [ ] **0 regresiones**: todas las rutas existentes siguen funcionando sin cambios

### 5.2 No funcional (debe)
- [ ] **Latencia** < 5ms adicionales por request (Next.js middleware se ejecuta en el edge)
- [ ] **Exclusiones por ruta**: webhook, webhooks de terceros, archivos estáticos
- [ ] **Testeable unitariamente**: cada middleware testeable sin servidor HTTP
- [ ] **Orden explícito**: pipeline de middlewares con orden documentado

### 5.3 Arquitectónico (debe)
- [ ] **No duplica lógica existente**: la validación inline actual debe migrarse, no copiarse
- [ ] **No acopla dominios**: el middleware no debe importar lógica de negocio
- [ ] **Documentado**: orden de ejecución, excepciones, y guía para nuevas rutas

---

## 6. Estado actual de la validación por endpoint

| Endpoint | Archivo | Validación | Dependencia del middleware |
|---|---|---|---|
| `POST /api/whatsapp/webhook` | `route.ts` | HMAC SHA-256 + rate limiting + idempotency key | **Ninguna** — autónomo |
| `GET /api/admin/*` | `route.ts` | API key check (query param `key` o header `x-api-key`) | **Ninguna** — autónomo |
| `POST /api/admin/*` | `route.ts` | API key check | **Ninguna** — autónomo |
| `GET /api/bot/metrics` | `route.ts` | Sin autenticación (consumo interno) | **Ninguna** |
| `POST /api/webhook/limpiar` | `route.ts` | API key check (black box tool) | **Ninguna** — autónomo |

**Total: ~15 rutas**, todas con validación autónoma. Ninguna depende de middleware inexistente.

---

## 7. Historial de la decisión

| Fecha | Evento | Detalle |
|---|---|---|
| 2026-07-16 | H0A-03 identificado | Auditoría de staging revela 0 middleware.ts. Clasificado como "BLOQUEA STAGING" en PR-H0A. |
| 2026-07-16 | Decisión de diferir | Post-RRR-1, con el sistema certificado pero sin tráfico real, se decide que la centralización es sobreingeniería para v1.0. Movido a Backlog Post-v1. |

---

*Fin de DEFERRED_MIDDLEWARE.md*
