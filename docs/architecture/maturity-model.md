# Maturity Model — AITOS

> How mature each part of the system is, and what the next level looks like.
> Use this document to prioritize technical investment and communicate progress.

---

## 1. Maturity levels

AITOS uses a 5-level maturity scale. Each level builds on the previous one.

| Level | Name | Description |
|-------|------|-------------|
| 1 | Manual | Humans do the work; system records or routes only. |
| 2 | Assisted | System suggests; humans decide and execute. |
| 3 | Automated | System executes within defined rules; humans handle exceptions. |
| 4 | Adaptive | System adjusts rules based on feedback without code changes. |
| 5 | Self-optimizing | System experiments, learns, and improves continuously with human oversight. |

---

## 2. Maturity by capability

### 2.1 Intent understanding

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual classification | Not applicable; system was never purely manual here. |
| 2 | Assisted classification | Not applicable. |
| 3 | Automated classification | `core.ts` classifies 12 intents deterministically. |
| 4 | Adaptive classification | Eval dataset measures intent accuracy; failures update regex/prompts. |
| 5 | Self-optimizing | Not reached. Would require automated retraining from production outcomes. |

**Current level: 3 (Automated)**

Next level: expand evals to production feedback and automate prompt/regex
updates from high-confidence failure patterns.

### 2.2 Location resolution

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual | Operator looks up place in DB. |
| 2 | Assisted | System suggests places; operator picks. |
| 3 | Automated | `location-resolver.ts` resolves alias/exact/fuzzy matches automatically. |
| 4 | Adaptive | Ambiguity handler uses LLM with context; accepts corrections. |
| 5 | Self-optimizing | Not reached. Would learn new aliases from accepted resolutions. |

**Current level: 4 (Adaptive)**

Next level: alias suggestion from accepted ambiguity resolutions.

### 2.3 Pricing

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual | Operator quotes verbally. |
| 2 | Assisted | System shows price; operator confirms. |
| 3 | Automated | `tariff-resolver.ts` + `pricing-engine.ts` calculate prices automatically. |
| 4 | Adaptive | Commercial rules (promotions, adjustments) applied from data files. |
| 5 | Self-optimizing | Not reached. Surge rules exist but are not wired to outcomes. |

**Current level: 4 (Adaptive)**

Next level: wire surge rules to demand signals and measure revenue vs conversion.

### 2.4 Dispatch

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual | Operator calls drivers. |
| 2 | Assisted | System lists eligible drivers; operator selects. |
| 3 | Automated | 4-level escalation broadcasts and assigns automatically. |
| 4 | Adaptive | Fleet validation filters by tier/shift/country. |
| 5 | Self-optimizing | Not reached. Would adjust broadcast strategy based on acceptance rates. |

**Current level: 3-4 (Automated to Adaptive)**

Next level: learn optimal escalation timeouts per zone/time.

### 2.5 Conversation management

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual | Operator chats directly. |
| 2 | Assisted | System drafts replies; operator sends. |
| 3 | Automated | Full state machine handles slot collection and confirmation. |
| 4 | Adaptive | Re-engagement, combined greeting, context-aware retry. |
| 5 | Self-optimizing | Not reached. Would A/B test response strategies from evals. |

**Current level: 4 (Adaptive)**

Next level: automated response optimization from evals and production outcomes.

### 2.6 Learning

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual | Operators remember what worked. |
| 2 | Assisted | Event logs reviewed manually. |
| 3 | Automated | `event-tracking.ts`, `trip_events`, `dispatch_events` log automatically. |
| 4 | Adaptive | Opportunity engine scores and recommends. |
| 5 | Self-optimizing | Not reached. Fare learning exists but is not fully closed-loop. |

**Current level: 3-4 (Automated to Adaptive)**

Next level: close the loop — measure opportunity acceptance and adjust fares.

### 2.7 Observability

| Level | State | Evidence |
|-------|-------|----------|
| 1 | Manual | Operators report issues. |
| 2 | Assisted | Logs exist; humans search. |
| 3 | Automated | Sentry, metrics endpoint, eval runner. |
| 4 | Adaptive | Drift detection, schema parity, contract enforcement. |
| 5 | Self-optimizing | Not reached. Would auto-alert on drift and propose fixes. |

**Current level: 4 (Adaptive)**

Next level: automated alerts and remediation suggestions for drift/failures.

---

## 3. Maturity heat map

| Capability | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
|------------|:-------:|:-------:|:-------:|:-------:|:-------:|
| Intent understanding | | | X | | |
| Location resolution | | | | X | |
| Pricing | | | | X | |
| Dispatch | | | X | X | |
| Conversation | | | | X | |
| Learning | | | X | X | |
| Observability | | | | X | |

(X marks current maturity. Some capabilities span two levels.)

---

## 4. Investment priorities

To move the system forward, invest in this order:

1. **Close the learning loop.** Learning is the strategic differentiator of AITOS.
   - Wire fare learning to real outcomes.
   - Measure opportunity acceptance.
   - Use eval results to drive prompt/regex updates.

2. **Make dispatch self-optimizing.** Driver utilization directly affects unit economics.
   - Learn optimal timeouts per context.
   - Rank drivers by predicted acceptance.

3. **Automate observability remediation.** Reduce operational toil.
   - Alert on schema drift.
   - Suggest fixes for contract violations.

4. **Advance pricing to self-optimizing.** Revenue optimization.
   - Wire surge rules to demand.
   - A/B test price elasticity.

---

## 5. Relationship to backlog

The maturity model maps directly to backlog priorities:

- Level 3 -> 4 work is generally P1 (high value, manageable risk).
- Level 4 -> 5 work is generally P2 or P3 (high value, requires production data).

See `ael/artifacts/BACKLOG.md` for specific tasks.

---

## 6. Relationship to other documents

| Document | Relationship |
|----------|--------------|
| `docs/architecture/capability-map.md` | Capabilities being matured |
| `ael/artifacts/BACKLOG.md` | Specific tasks to advance maturity |
| `docs/adr/003-learning-domain.md` | Learning as strategic priority |

---

*Last updated: 2026-07-06*
*Authority: source code, tests, and operational observations*
