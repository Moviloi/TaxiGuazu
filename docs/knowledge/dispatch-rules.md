# Dispatch Rules — AITOS

> Rules governing driver assignment workflow.
> Source: `src/lib/services/dispatch/dispatch.service.ts`, `src/lib/services/dispatch/dispatch-workflow.ts`.

---

## 1. Escalation levels

| Level | Target | Timeout |
|-------|--------|---------|
| Nivel 1 | Principal driver | 1 hour |
| Nivel 2 | Principal 2 driver | 30 minutes |
| Nivel 3 | Broadcast all drivers | 8 minutes |
| Waiting driver | Broadcast direct | 3 minutes |

Source: `src/lib/services/dispatch/dispatch.service.ts`

## 2. Offer flow

- **DR-2.1**: Level 1 driver receives exclusive offer.
- **DR-2.2**: If rejected or timed out, escalate to Level 2.
- **DR-2.3**: If rejected or timed out, escalate to Level 3 broadcast.
- **DR-2.4**: If still no acceptance, enter waiting_driver state.

Source: `src/lib/services/dispatch/dispatch.service.ts`

## 3. Atomic assignment

- **DR-3.1**: Only one driver can accept a trip.
- **DR-3.2**: Optimistic lock prevents race conditions.

Source: `src/lib/services/dispatch/dispatch-workflow.ts`

## 4. Driver responses

Accepted driver responses:

- "acepto"
- "yo estoy"
- "yo voy"
- "lo tomo"

Source: `src/app/api/whatsapp/webhook/route.ts`

## 5. Driver status updates

- **DR-5.1**: Driver can mark "llegué" (arrived).
- **DR-5.2**: Driver can mark "en viaje" (in progress).
- **DR-5.3**: Driver can mark completed.

Source: `src/app/api/whatsapp/webhook/route.ts`, `src/lib/services/dispatch/driver.service.ts`

## 6. Contingency

- **DR-6.1**: If assigned driver cannot complete, contingency workflow selects replacement.

Source: `src/lib/services/dispatch/driver.service.ts`

---

*Last updated: 2026-07-06*
