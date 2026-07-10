# 18 — HandlerContext Flow

> **Enriquecimiento y propagación del contexto conversacional desde CORE hasta LLM.**

---

## Diagrama de flujo

```mermaid
flowchart TB
    subgraph Sources["Componentes fuente"]
        CORE["CORE (core.ts)"]
        CI["Conversation Interpreter<br/>(conversation-interpreter.ts)"]
        CO["Client Objective<br/>(client-objective.ts)"]
        SD["StrategyDecision<br/>(conversation-strategy.ts)"]
    end

    subgraph Extraction["Del contexto original"]
        EX["extraction (ExtractionContext)"]
        L["lang"]
        P["phone"]
        CN["customerName"]
        DM["domain"]
        TM["temporalMode"]
        OM["operationalMode"]
        UT["userText"]
    end

    subgraph Enrichment["Enriquecimiento (handler.ts:87-118)"]
        step1["1. urgency ← facts<br/>línea 87-88"]
        step2["2. classification ← interpretMessage()<br/>línea 89-97"]
        step3["3. clientObj ← computeClientObjective()<br/>línea 99-104"]
        step4["4. strategyDecision ← computeStrategyDecision()<br/>línea 106-115"]
        step5["5. enrichedCtx ← {...ctx, ...}<br/>línea 116-118"]
    end

    subgraph HC["HandlerContext (enriched)"]
        H1["purchaseIntent"]
        H2["urgency"]
        H3["messageType"]
        H4["isCorrection"]
        H5["clientObjective"]
        H6["strategyDecision"]
        H7["extraction, lang, phone, ..."]
    end

    subgraph Consumers["Consumidores"]
        POL["Policies<br/>policy-ahora / policy-reserva"]
        LLM_P["LLM Prompt<br/>llm-response.ts"]
        GUARD["Guardrails<br/>guard.ts"]
    end

    CORE -->|purchaseIntent| step1
    CORE -->|facts| step1
    step1 --> H2
    CI -->|classification| step2
    step2 --> H3
    step2 --> H4
    CO -->|clientObj| step3
    step3 --> H5
    step1 --> step4
    step2 --> step4
    step3 --> step4
    SD -->|strategyDecision| step4
    step4 --> H6
    Extraction --> step5
    H1 --> step5
    H2 --> step5
    H3 --> step5
    H4 --> step5
    H5 --> step5
    H6 --> step5
    step5 --> HC

    HC --> POL
    HC --> LLM_P
    POL --> GUARD

    style HC fill:#e3f2fd,stroke:#1565c0
    style Enrichment fill:#f3e5f5,stroke:#7b1fa2
```

---

## Orden de enriquecimiento

| Paso | Línea | Acción | Depende de |
|------|-------|--------|------------|
| 1 | 87-88 | Extraer `urgency` de `decision.core.facts` | CORE completado |
| 2 | 89-97 | Clasificar mensaje via `interpretMessage()` | CORE (intent, facts) |
| 3 | 99-104 | Computar `clientObjective` via `computeClientObjective()` | CORE (facts, purchaseIntent) + CI (messageType) |
| 4 | 106-115 | Computar `strategyDecision` via `computeStrategyDecision()` | CORE + CI + CO |
| 5 | 116-118 | Construir `enrichedCtx` con spread de ctx + nuevas señales | Pasos 1-4 completados |

**Regla crítica**: StrategyDecision se computa antes de construir enrichedCtx (paso 4 antes de paso 5).

---

## Campos y consumidores

| Campo | Consumidor principal | Uso |
|-------|---------------------|-----|
| `strategyDecision.behaviorFlags.*` | Policies | Decisiones de comportamiento |
| `strategyDecision.tone` | LLM Prompt | Tono de respuesta |
| `strategyDecision.responseLength` | LLM Prompt | Verbosidad |
| `strategyDecision.reassuranceNeeded` | LLM Prompt | Flag de confianza |
| `strategyDecision.callToAction` | LLM Prompt | Intensidad de CTA |
| `clientObjective` | LLM Prompt | Reglas de objetivo (CLIENT_OBJ_RULES) |
| `extraction` | Policies | Slots, tariff, estado |
| `lang` | Policies, LLM | Idioma de respuesta |
| `customerName` | Policies, LLM | Personalización |

---

*Diagrama: 18-handler-context-flow*
*Last updated: 2026-07-10*
