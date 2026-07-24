# AITOS Overview

> **Propósito:** Documento de onboarding y contexto para nuevos miembros del equipo.
> **Autoridad:** Este documento es una introducción contextual. No es un documento normativo.
> **La autoridad normativa del sistema es la Constitución de AITOS (`docs/architecture/AITOS_CONSTITUTION.md`).**
> **Para detalles de implementación, ver `docs/ai/ARCHITECTURE_BIBLE.md` y `docs/architecture/`.**
> **Actualizado:** 2026-07-06 (pendiente de alineación completa con la Constitución)

---

## 1. Purpose

AITOS converts human messages into transportation operations.

A tourist writes "I need a car from the airport to my hotel in 20 minutes".
AITOS understands the request, resolves the locations, calculates a price,
checks vehicle availability, assigns a driver, tracks the trip, and follows up
after the service — all without requiring a human dispatcher to interpret the
message.

The system is built for the Iguazu region, where customers cross borders
between Argentina, Brazil, and Paraguay, speak Spanish, Portuguese, or English,
and often describe places informally ("the airport", "the center", "the falls").

---

## 2. What AITOS is

AITOS is an operating system for transportation logistics.

It performs the same function that a dispatch office performs, but through a
conversational interface: it receives requests, validates them, prices them,
assigns resources, tracks execution, and learns from outcomes.

Its current primary input channel is WhatsApp because that is where customers
already are. The channel is a detail. The system could receive the same request
via a web form, a voice call transcript, or an API call from a partner.

---

## 3. What AITOS is not

This distinction matters because it determines how the system is built,
measured, and evolved.

| AITOS is not | Why it matters |
|--------------|----------------|
| A chatbot | A chatbot optimizes for conversation. AITOS optimizes for operational execution. The conversation is a means, not the goal. |
| A WhatsApp bot | WhatsApp is the current channel. The system's identity does not depend on it. |
| A booking engine | Booking engines assume structured input. AITOS assumes messy, ambiguous, multilingual input. |
| A CRM | AITOS talks to customers, but it does not manage a sales pipeline. The operational record (trips, dispatches, payments) is the source of truth. |
| A black-box AI | The system must keep working when the AI is slow, wrong, or unavailable. Most decisions are deterministic. |

---

## 4. The core promise

When a customer sends a message, AITOS promises to do exactly one of three
things:

1. **Execute**: perform the operation immediately (quote, reserve, dispatch).
2. **Answer**: give a concrete response with a clear reason.
3. **Clarify**: ask the minimum question needed to resolve ambiguity.

It never silently drops a request. It never fabricates a price. It never
pretends to understand when it does not.

If the system cannot satisfy the promise, it escalates to a human operator with
context, not with raw logs.

---

## 5. The operational model

The conversation is not the business record. The business record is a small set
of slots that describe a trip:

| Slot | Meaning |
|------|---------|
| Origin | Where the trip starts |
| Destination | Where the trip ends |
| Passengers | How many people travel |
| Scheduled at | When the service happens |
| Price | What the customer pays |
| Vehicle | What kind of transport is needed |

Every message the customer sends is translated into changes in these slots.
The slots are the truth. The conversation is just the path that produced them.

---

## 6. Authority and trust

The system has a strict hierarchy of trust:

1. **Code and database** are the ultimate truth.
2. **This Bible and the architecture documents** describe the intended truth.
3. **The AI** provides interpretation, never authority.
4. **A human operator** has final authority when the system escalates.

If the AI suggests a location, price, or action that conflicts with the
database or the policy layer, the policy layer wins.

---

## 7. How the system decides

Decision making follows a fixed order:

1. **Classify** the customer's intent.
2. **Extract** the facts (places, passengers, time).
3. **Resolve** the locations against the canonical place database.
4. **Price** the trip using the tariff table.
5. **Decide** whether to execute, answer, or clarify.
6. **Render** the response in the customer's language.
7. **Execute** the operation if required.

No response can skip the decision step. The system decides what to do before it
decides what to say.

---

## 8. Graceful degradation

External services fail. Networks lag. AI providers timeout. The system is
built to keep operating:

- If the primary AI provider fails, the system switches to a fallback provider.
- If both providers fail, the system uses deterministic templates.
- If a location cannot be resolved, the system asks the customer.
- If no tariff exists, the system quotes without price and sends the trip to a human.
- If no driver accepts, the system escalates through four levels before involving a human.

Failure is expected. The architecture treats failure as a normal input, not as
an exception.

---

## 9. Scope boundaries

### In scope

- Receiving and responding to customer messages.
- Quoting and booking transfers (immediate and future).
- Multi-ride packages with hub discounts.
- Driver assignment and escalation.
- Trip execution and status tracking.
- Post-service follow-up and surveys.
- Continuous learning from outcomes.

### Out of scope

- Real-time GPS tracking of vehicles.
- Automated payment processing.
- Multi-channel support beyond WhatsApp (planned).
- General-purpose AI assistants.

---

## 10. Evolution principles

The system evolves according to these principles:

1. **Preserve the operational model.** The slots must remain the canonical truth.
2. **Keep the core deterministic.** AI improves the edges; it does not replace the core.
3. **Fail safe.** Every change must degrade gracefully.
4. **Document permanent decisions.** Architecture decisions are recorded in ADRs.
5. **Measure before optimizing.** Changes that affect customers must be validated with tests, evals, or controlled observation.

---

## 11. Reading order

| If you are... | Start here |
|---------------|------------|
| A founder, investor, or new team member | This file |
| An AI agent about to change code | `docs/ai/ARCHITECTURE_BIBLE.md` |
| An engineer designing a feature | `docs/architecture/system-overview.md` |
| An architect validating a design | `docs/adr/` |
| An operator debugging production | `docs/architecture/system-map.md` |

## Related documents

- [`docs/ai/ARCHITECTURE_BIBLE.md`](./ai/ARCHITECTURE_BIBLE.md) — canonical rules for AI agents
- [`docs/architecture/architecture.md`](./architecture/architecture.md) — executive architecture index
- [`docs/architecture/operational-model.md`](./architecture/operational-model.md) — how language becomes operations
- [`docs/architecture/decision-architecture.md`](./architecture/decision-architecture.md) — how the system decides
- [`docs/architecture/dashboard.md`](./architecture/dashboard.md) — live architecture dashboard
- [`docs/architecture/GOVERNANCE.md`](./architecture/GOVERNANCE.md) — how documentation evolves

---

*Last updated: 2026-07-06*
*Authority: source code, ADRs, and operational reality*
