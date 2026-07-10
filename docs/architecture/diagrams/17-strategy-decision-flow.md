# 17 — StrategyDecision Flow

> **Ciclo de vida completo de StrategyDecision: creación, propagación, consumo y expresión en LLM.**

---

## Diagrama de flujo

```mermaid
flowchart TB
    subgraph Input["Señales de entrada"]
        PI[purchaseIntent<br/>high/medium/low]
        U[urgency<br/>texto del fact]
        MT[messageType<br/>cancel, correction, etc.]
        IC[isCorrection<br/>boolean]
        CO[clientObjective<br/>booking_urgent, etc.]
        D[decision<br/>EXECUTE/ANSWER/CLARIFY]
        I[intent<br/>BOOKING, NOW, etc.]
    end

    subgraph Create["1. Creación — computeStrategyDecision()"]
        CS["conversation-strategy.ts:48<br/>FUNCIÓN PURA"]
        LOGIC["
            mode: signal-based switch
            tone: signal-based switch  
            speed: signal-based switch
            responseLength: derived from mode
            reassuranceNeeded: clientObjective===trust_check
            callToAction: derived from intent+clientObj
            fieldAcquisitionMode: derived from flags+speed
            behaviorFlags: 8 flags from signals
        "]
        SD_OUT[("StrategyDecision")]
    end

    subgraph Propagate["2. Propagación"]
        HC["HandlerContext.strategyDecision<br/>handler.ts:116-118"]
        LOG["[STRATEGY] log<br/>handler.ts:119-130"]
    end

    subgraph Consume["3. Consumo"]
        subgraph H["Handler LLM Gate"]
            SKIP["skipLLM flag<br/>handler.ts:163"]
        end
        subgraph PA["Policy Ahora"]
            INHIBIT_NB["inhibitNewBooking<br/>policy-ahora.ts:77"]
            SKIP_FR["skipFieldResolution<br/>policy-ahora.ts:88"]
        end
        subgraph PR["Policy Reserva"]
            INHIBIT_NB2["inhibitNewBooking<br/>policy-reserva.ts:144"]
            PRESERVE["preserveContext<br/>policy-reserva.ts:152"]
            INHIBIT_BA["inhibitBookingAccept<br/>policy-reserva.ts:176"]
        end
    end

    subgraph Express["4. Expresión LLM"]
        PROMPT["buildResponsePrompt<br/>llm-response.ts:60-67"]
        TONE["tone → Tono"]
        RL["responseLength → Verbosidad"]
        RN["reassuranceNeeded → Confianza"]
        CTA["callToAction → CTA"]
    end

    Input --> CS
    CS --> LOGIC
    LOGIC --> SD_OUT
    SD_OUT --> HC
    HC --> LOG
    HC --> H
    HC --> PA
    HC --> PR
    HC --> PROMPT
    PROMPT --> TONE
    PROMPT --> RL
    PROMPT --> RN
    PROMPT --> CTA

    style SD_OUT fill:#ff9800,stroke:#e65100,color:#000
    style CS fill:#fff3e0,stroke:#ff9800
    style HC fill:#e3f2fd,stroke:#1565c0
```

---

## Detalle de consumo

| # | Consumer | Archivo | Línea | Campo | Efecto |
|---|----------|---------|-------|-------|--------|
| 1 | Handler LLM Gate | `handler.ts` | 163 | `behaviorFlags.skipLLM` | Salta generación LLM si purchaseIntent=low |
| 2 | Policy Ahora | `policy-ahora.ts` | 77 | `behaviorFlags.inhibitNewBooking` | Cancel: respuesta de cancelación |
| 3 | Policy Ahora | `policy-ahora.ts` | 88 | `behaviorFlags.skipFieldResolution` | booking_urgent: dispatch directo |
| 4 | Policy Reserva | `policy-reserva.ts` | 144 | `behaviorFlags.inhibitNewBooking` | Cancel: respuesta de cancelación |
| 5 | Policy Reserva | `policy-reserva.ts` | 152 | `behaviorFlags.preserveContext` | Corrección: no reiniciar flujo |
| 6 | Policy Reserva | `policy-reserva.ts` | 176 | `behaviorFlags.inhibitBookingAccept` | inquiry_price: no cerrar booking |
| 7 | LLM Prompt | `llm-response.ts` | 61-67 | `tone`, `responseLength`, `reassuranceNeeded`, `callToAction` | Inyectados como contexto estratégico en prompt |

---

## Invariantes

1. **StrategyDecision se crea ANTES de enrichedCtx** (handler.ts:106 antes de 116)
2. **Todos los consumos usan `?.` para runtime safety** (R5)
3. **No existen `??` fallbacks desde señales originales** (R5)
4. **StrategyDecision es el ÚNICO punto de decisión estratégica** (ADR-008)
5. **Las policies ya NO reinterpretan señales originales** (R5)

---

*Diagrama: 17-strategy-decision-flow*
*Last updated: 2026-07-10*
