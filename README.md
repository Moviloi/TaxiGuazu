# TaxiGuazú Bot

Bot de WhatsApp para TaxiGuazú Traslados. Atiende clientes 24/7, procesa solicitudes de viajes, aplica descuentos por petición explícita y coordina con choferes.

## Características

- 🤖 Atención automática 24/7 con Gemini AI
- 💬 Chat con clientes (presupuestos, reservas, confirmación)
- 💰 Descuentos solo por petición explícita del cliente (máx. 15%)
- 📱 Notificaciones al titular para casos especiales
- 👥 Grupo de choferes para escalado automático
- 📊 Dashboard para intervención manual si es necesario

## Stack

- **Bot**: Baileys (WhatsApp Web)
- **IA**: Google Gemini API
- **DB**: SQLite (better-sqlite3)
- **Frontend**: Next.js
- **Hosting**: Railway

## Setup Local

### 1. Clonar y instalar

```bash
git clone https://github.com/TU_USER/TaxiGuazu.git
cd TaxiGuazu
npm install
```

### 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```env
GEMINI_API_KEY=AIzaSyAQS0LDtOGuvGZUu3_fZOPEY-WBgzGcpls
BOT_PHONE=+543757646648
TITULAR_DRIVER_PHONE=+543757613215
DRIVERS_GROUP_ID=tu_group_id@g.us
```

### 3. Obtener API Key de Gemini

1. Ir a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crear nueva API Key
3. Pegarla en `.env.local`

### 4. Obtener Group ID de WhatsApp

1. Agregar el bot al grupo de choferes
2. Enviar `.id` al grupo
3. Copiar el JID del grupo (formato: `120363XXXXXXXXX@g.us`)

### 5. Correr localmente

```bash
# Terminal 1: Bot
npm run start:bot

# Terminal 2: Dashboard
npm run dev

# O ambos juntos:
npm run start:all
```

### 6. Escanear QR

1. Abrir http://localhost:3000
2. Escanear el QR con WhatsApp

## Deploy en Railway

### 1. Preparar GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USER/TaxiGuazu.git
git push -u origin main
```

### 2. Crear proyecto en Railway

1. Ir a [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Seleccionar el repo `TaxiGuazu`
4. Agregar variables de entorno en Railway Dashboard:
   - `GEMINI_API_KEY`
   - `BOT_PHONE`
   - `TITULAR_DRIVER_PHONE`
   - `DRIVERS_GROUP_ID`
5. Agregar volúmenes persistentes:
   - `/app/data` (para la DB SQLite)
   - `/app/auth` (para la sesión de WhatsApp)

### 3. Esperar deploy

Railway compilará automáticamente y levantará el bot.

### 4. Escanear QR

Una vez deployed, Railway provee una URL donde escanear el QR.

## Comandos del Bot

Los clientes pueden usar:

- `.id` - Ver su número de teléfono (para debugging)

El titular puede usar:

- `sigo yo` - Tomar una conversación manualmente
- `seguí vos` - Devolver la conversación al bot

## Notificaciones al Titular

El bot notifica al titular (+543757613215) en estos casos:

- Nuevo lead con pedido explícito de servicio
- Descuentos mayores al 10%
- Grupos de más de 4 pasajeros
- Reservas diferidas (más de 3 días)

## Flujo de Venta

```
1. Cliente envía mensaje
2. Bot responde con info y pide datos
3. Cliente proporciona: fecha, hora, pasajeros, destino
4. Bot calcula precio y ofrece (sin descuento automático)
5. Si cliente pide descuento → hasta 15% máximo
6. Bot resume servicio y pide confirmación
7. Cliente confirma → Bot notifica al titular
8. Si titular no responde en 2 min → Bot envía al grupo de choferes
9. Chofer acepta → Bot le envía resumen + contacto del cliente
```

## Seguridad

⚠️ **IMPORTANTE**: El dashboard NO tiene autenticación.

Si deployás a internet:
- Usar autenticación a nivel de proxy (Cloudflare Access, Nginx basic auth)
- O desplegar en una URL privada

## Estructura del Proyecto

```
TaxiGuazu/
├── src/
│   ├── app/
│   │   ├── api/bot/          # API routes
│   │   ├── page.tsx           # Dashboard
│   │   └── globals.css
│   ├── components/
│   ├── lib/
│   │   ├── baileys/
│   │   │   ├── client.ts      # Cliente WhatsApp
│   │   │   └── gemini.ts      # Integración Gemini
│   │   ├── db.ts              # Base de datos
│   │   └── system-prompt.ts   # Prompt para IA
│   └── config/
│       └── constants.ts       # Constantes
├── scripts/
│   ├── start-bot.ts
│   └── env-loader.ts
├── data/                      # SQLite DB (gitignored)
├── auth/                     # Sesión WhatsApp (gitignored)
└── ...
```

## Licencia

Privado - Cristian Araujo / TaxiGuazú
