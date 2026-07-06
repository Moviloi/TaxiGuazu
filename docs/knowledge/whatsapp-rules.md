# WhatsApp Rules — AITOS

> Rules governing the WhatsApp channel.
> Source: `src/app/api/whatsapp/webhook/route.ts`, `src/lib/sender.ts`.

---

## 1. Webhook security

- **WR-1.1**: Every webhook request must include a valid HMAC-SHA256 signature.
- **WR-1.2**: Signature is computed against the raw body using `WHATSAPP_APP_SECRET`.
- **WR-1.3**: Missing or invalid signature returns 401.

Source: `src/app/api/whatsapp/webhook/route.ts`

## 2. Idempotency

- **WR-2.1**: Every message has a unique `message_id`.
- **WR-2.2**: Duplicate `message_id` returns 200 without reprocessing.
- **WR-2.3**: `processed_messages` table tracks processed IDs.

Source: `src/app/api/whatsapp/webhook/route.ts`, `src/lib/db/core/connection.ts`

## 3. Rate limiting

- **WR-3.1**: Maximum 10 messages per phone per 60-second window.
- **WR-3.2**: Exceeding the limit returns 429.

Source: `src/app/api/whatsapp/webhook/route.ts`

## 4. Phone normalization

- **WR-4.1**: Numbers starting with `549` are normalized to `54` (remove the 9).
- **WR-4.2**: All other numbers are prefixed with `+`.

Source: `src/app/api/whatsapp/webhook/route.ts` (`normalizePhone`)

## 5. Message types

Supported inbound message types:

- Text
- Interactive buttons
- Location
- Image
- Audio

Source: `src/app/api/whatsapp/webhook/route.ts`

## 6. Outbound messages

- **WR-6.1**: Outbound messages require `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`.
- **WR-6.2**: All outbound messages are persisted in `messages`.
- **WR-6.3**: Interactive buttons use WhatsApp Cloud API interactive message format.

Source: `src/lib/sender.ts`, `src/lib/services/shared/message-helpers.ts`

---

*Last updated: 2026-07-06*
