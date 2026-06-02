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

Ver `.env.local.example` para la lista completa. Variables requeridas:

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
    ├── db/                      # SQLite/Turso (database.ts + types.ts)
    ├── services/                # Lógica de negocio
    ├── utils/                   # Timeouts, dispatch workflow
    └── whatsapp/                # Cliente WhatsApp Cloud API
```

## Webhook

Meta envía los mensajes entrantes a `POST /api/whatsapp/webhook`. La verificación del webhook se maneja en `GET /api/whatsapp/webhook` usando `WHATSAPP_VERIFY_TOKEN`.

## Dispatch

El sistema usa un workflow de niveles (nivel_1 → nivel_2 → nivel_3 → broadcast grupal) con timeouts configurables para escalar la asignación de viajes a choferes.
