# TaxiGuazú Bot

Bot de WhatsApp para TaxiGuazú Traslados. Atiende clientes 24/7 vía Meta WhatsApp Cloud API, procesa solicitudes de viaje con IA (Groq/Llama) y coordina con choferes mediante un sistema de dispatch multi-nivel.

## Stack

- **Bot**: Meta WhatsApp Business Cloud API
- **IA**: Groq (Llama 3.3 70B)
- **DB**: SQLite via libSQL (local) / Turso (remoto)
- **Frontend**: Next.js 15 (App Router)
- **Hosting**: Vercel

## Scripts

```bash
npm run dev      # Desarrollo
npm run build    # Build
npm run start    # Producción (Next.js)
npm run lint     # ESLint
```

## Variables de Entorno

Variables requeridas:

| Variable | Descripción |
|---|---|
| `GROQ_API_KEY` | API key de Groq |
| `WHATSAPP_TOKEN` | Token de Meta WhatsApp Cloud API |
| `WHATSAPP_PHONE_ID` | ID del número de teléfono en Meta |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook |
| `ADMIN_API_KEY` | API key para el panel admin |
| `BOT_PHONE` | Número del bot |
| `ADMIN_PHONE` | Teléfono del administrador |

## Arquitectura

```
src/
├── app/
│   ├── api/
│   │   ├── bot/                    # API routes del dashboard
│   │   └── whatsapp/webhook/       # Webhook entrante de Meta
│   └── page.tsx                    # Dashboard (cliente React)
├── config/
│   ├── constants.ts                # Constantes de la app
│   └── env.ts                      # Validación Zod de env vars
├── lib/
│   ├── ai/                         # Groq + detección de intent + policies
│   │   ├── core.ts                 #   Detección de intent + role lock
│   │   ├── router.ts               #   Enrutamiento según modo
│   │   ├── handler.ts              #   Pipeline CORE → ROUTER → POLICY
│   │   ├── guard.ts                #   Safety guardrails (assert output source)
│   │   ├── groq.ts                 #   Cliente Groq (Llama)
│   │   ├── patterns.ts             #   Patrones de texto para respuestas
│   │   ├── response-builder.ts     #   Builder de respuestas
│   │   ├── policy-ahora.ts         #   Policy AHORA (respuesta inmediata)
│   │   ├── policy-reserva.ts       #   Policy RESERVA (respuesta sin LLM)
│   │   ├── extraction-schema.ts    #   Schema de extracción de datos
│   │   ├── extraction-prompt.ts    #   Prompt de extracción
│   │   └── laterals/               #   Manejo de laterales en conversación
│   ├── core/
│   │   └── pipeline.ts             # Pipeline principal de procesamiento
│   ├── db/
│   │   ├── database.ts             # Facade de acceso a DB
│   │   ├── types.ts                # Tipos compartidos de DB
│   │   ├── core/
│   │   │   ├── connection.ts       # Conexión SQLite/Turso + schema
│   │   │   └── helpers.ts          # Helpers de query
│   │   └── domains/
│   │       ├── connection-state.ts  # Estado de conexión WhatsApp
│   │       ├── learning.ts          # Tablas del subsistema de aprendizaje
│   │       └── trips.ts             # Operaciones sobre viajes
│   ├── services/                   # Lógica de negocio por dominio
│   │   ├── lead.service.ts         # Orquestador de entrada de mensajes
│   │   ├── admin/                  # Notificaciones + comandos admin
│   │   ├── dispatch/               # Asignación multi-nivel a choferes
│   │   ├── extraction/             # Extracción de datos + comprensión
│   │   ├── geo/                    # Resolución geográfica (zonas, ubicaciones)
│   │   ├── housekeeping/           # Cron jobs + limpieza de datos
│   │   ├── i18n/                   # Detección de idioma
│   │   ├── learning/               # Pipeline de aprendizaje (oportunidades, policy, adaptación)
│   │   ├── memory/                 # Memoria de sesión y predicción
│   │   ├── pricing/                # Motor de precios (tarifas, reglas comerciales)
│   │   ├── trip-execution/         # Ejecución de viajes + encuestas post-servicio
│   │   └── workflow/               # Workflow de conversación (slots, oportunidades, comandos)
│   ├── utils/
│   │   ├── clamp.ts                # Clamping numérico
│   │   └── logger.ts               # Logging centralizado (log.debug/info/warn/error)
│   └── whatsapp/
│       └── sender.ts               # Cliente WhatsApp Cloud API
```

## Flujo de mensaje

```
WhatsApp Webhook
     │
     ▼
Conversation Core (lib/services/lead.service.ts)
  • Recepción del mensaje
  • Idempotencia (message_id único)
  • Detección de grupo (driver) vs individual (cliente)
     │
     ▼
AI Pipeline (lib/ai/)
  • CORE: detección de intent + role lock + slot stability
  • ROUTER: selección de modo de respuesta
  • POLICY: generación de respuesta sin LLM (basada en reglas)
     │
     ▼
Workflow / Extraction (lib/services/workflow/ + extraction/)
  • Workflow de slots y estados de conversación
  • Extracción de datos del mensaje (entidades, slots, confianza)
  • Comprensión y memoria de sesión
     │
     ▼
Domain Services (lib/services/pricing/ + dispatch/ + trip-execution/ + learning/)
  • pricing/     → Cálculo de precio + resolución de tarifas + reglas comerciales
  • dispatch/    → Asignación a choferes (nivel_1 → nivel_2 → broadcast)
  • trip-execution/ → Confirmación, llegada, post-servicio, encuestas
  • learning/    → Oportunidades, policy engine, adaptación, experimentos
     │
     ▼
Database Domains (lib/db/domains/ + lib/db/database.ts)
  • connection-state/  → Estado de conexión WhatsApp
  • trips/            → Operaciones CRUD de viajes
  • learning/         → Tablas de aprendizaje (políticas, métricas, eventos)
```

## Dispatch

El sistema usa un workflow de niveles (nivel_1 → nivel_2 → nivel_3 → broadcast grupal) con timeouts configurables para escalar la asignación de viajes a choferes.
