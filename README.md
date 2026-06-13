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
│   │   ├── bot/                 # API routes del dashboard
│   │   └── whatsapp/webhook/    # Webhook entrante de Meta
│   └── page.tsx                 # Dashboard (cliente React)
├── config/
│   ├── constants.ts             # Constantes de la app
│   └── env.ts                   # Validación Zod de env vars
└── lib/
    ├── ai/                      # Groq + extracción de datos
    │   ├── core.ts              #   Detección de intent + role lock
    │   ├── router.ts            #   Enrutamiento a policy según modo
    │   ├── handler.ts           #   Pipeline CORE → ROUTER → POLICY
    │   ├── guard.ts             #   Safety guardrails (assert output source)
    │   └── policy-reserva.ts    #   Policy RESERVA (respuesta sin LLM)
    ├── db/                      # SQLite/Turso (database.ts + types.ts)
    ├── services/                # Lógica de negocio por dominio
    │   ├── lead.service.ts      #   Detección: orquestación entrada (único punto)
    │   ├── context-memory.ts     #   Persistencia de estado de sesión
    │   ├── confidence.ts        #   Cálculo de confianza de extracción
    │   ├── geo-engine.ts         #   Resolución geográfica (zonas, expansión)
    │   ├── pricing/             #   Motor de precios (facade + resolución tarifas)
    │   ├── dispatch/            #   Asignación multi-nivel a choferes
    │   ├── trip-execution/      #   Ejecución de viajes (confirmación, llegada, post-servicio)
    │   └── learning/            #   Pipeline de aprendizaje (oportunidades, policy, adaptación)
    ├── utils/                   # clamp.ts
    └── whatsapp/                # Cliente WhatsApp Cloud API
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
Execution Domains (lib/services/)
  • pricing/     → Cálculo de precio + resolución de tarifas
  • dispatch/    → Asignación a choferes (nivel_1 → nivel_2 → broadcast)
  • trip-execution/ → Confirmación, llegada, post-servicio
  • learning/    → Oportunidades, policy engine, adaptación
  • persistence  → DB (SQLite/Turso via database.ts)
```

## Dispatch

El sistema usa un workflow de niveles (nivel_1 → nivel_2 → nivel_3 → broadcast grupal) con timeouts configurables para escalar la asignación de viajes a choferes.
