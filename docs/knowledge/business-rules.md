# Business Rules — AITOS

> General business rules derived from code.

---

## 1. User identity

- **BR-1.1**: The user's WhatsApp phone number is the only identity needed.
- **BR-1.2**: The bot's own phone number is never processed as a user.

Source: `src/app/api/whatsapp/webhook/route.ts`, `src/lib/db/core/connection.ts`

## 2. Languages

- **BR-2.1**: Supported languages are Spanish (`es`), Portuguese (`pt`), and English (`en`).
- **BR-2.2**: Language detection uses keyword matching with fallback to session language.
- **BR-2.3**: Borderline detection scores do not override an established session language.

Source: `src/lib/detect-lang.ts`, `src/lib/services/i18n/catalog.ts`

## 3. Passengers

- **BR-3.1**: Default passenger count is 1.
- **BR-3.2**: Maximum passengers per vehicle is 6.
- **BR-3.3**: More than 6 passengers requires multiple vehicles and human coordination.

Source: `src/lib/services/lead.service.ts`, `src/lib/services/extraction/confidence.ts`

## 4. Temporal modes

- **BR-4.1**: `NOW` mode triggered by urgency signals: "ahora", "ya", "inmediato", "urgente".
- **BR-4.2**: `FUTURE` mode triggered by date/time signals: "mañana", "pasado mañana", specific times.
- **BR-4.3**: No temporal signal defaults based on intent and completeness.

Source: `src/lib/ai/core.ts`, `src/lib/services/lead.service.ts`

## 5. Confirmation

- **BR-5.1**: A trip is not created until the user explicitly confirms.
- **BR-5.2**: Slot confirmation UI is shown when slots are ready but not yet user-confirmed.
- **BR-5.3**: User corrections produce `USER_CORRECTED` status.

Source: `src/lib/services/workflow/slot-workflow.ts`, `src/lib/ai/slot-state.ts`

## 6. Human escalation

- **BR-6.1**: Comprehension score below 0.40 escalates to human.
- **BR-6.2**: Emergency intent always notifies admin.
- **BR-6.3**: No driver available after all dispatch levels escalates to human.

Source: `src/lib/services/extraction/comprehension.ts`, `src/lib/ai/core.ts`, `src/lib/services/dispatch/dispatch.service.ts`

---

*Last updated: 2026-07-06*
