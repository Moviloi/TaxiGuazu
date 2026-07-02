# 01 — System Overview

> **Resumen:** Vista de alto nivel del pipeline completo: desde el webhook de WhatsApp hasta la respuesta final, pasando por los orquestadores reales del sistema.


Pipeline principal del sistema TaxGuazú. El orquestador real del flujo conversacional es `lead.service.ts`, que coordina extracción, CORE, policy-pipeline y salida.

```mermaid
flowchart TD

    subgraph WH["WhatsApp Entry"]
        A[WhatsApp Webhook] --> B[Security + Parse]
        B --> C[Idempotencia Message ID]
        C --> D{Tipo de entrada}
        D -->|Botón| E[Button Router]
        D -->|Texto| F[Text Handler]
    end

    E --> LEAD
    F --> LEAD

    subgraph ORQ["Lead Orchestrator — lead.service.ts"]
        LEAD[Lead Handler]
        LEAD --> SETUP[Conversation Setup]
        SETUP --> MEM[context-memory]
        SETUP --> EX[Extraction Pipeline]
        SETUP --> CORE[CORE + Laterals]
        EX --> CORE
    end

    subgraph EXTR["Extraction Pipeline"]
        EX1[extraction-runner.ts]
        EX2[extract-slots.ts]
        EX3[entity-extractor.ts]
        EX4[regex-extractor.ts]
        EX5[comprehension.ts]
        EX6[comprehension-runner.ts]
        EX7[confidence.ts]
        EX8[confidence-map.ts]
        EX9[slot-state.ts]
    end

    EX --> EX1
    EX1 --> EX2
    EX2 --> EX3
    EX2 --> EX4
    EX1 --> EX5
    EX5 --> EX6
    EX2 --> EX7
    EX7 --> EX8
    EX2 --> EX9

    subgraph COREL["CORE Phase"]
        CORE1[Regex Facts — 15+ categorías]
        CORE2[classifyIntent — 11 intents]
        CORE3[applyLaterals — 5 intents]
        CORE4[roleLock + slotStability]
        CORE5[purchaseIntent]
    end

    CORE --> CORE1
    CORE1 --> CORE2
    CORE2 --> CORE3
    CORE2 --> CORE4
    CORE2 --> CORE5

    subgraph POL["Policy Pipeline — policy-pipeline.ts"]
        POL1[Temporal Decision]
        POL2[Opportunity Evaluator]
        POL3[Confirmation Handler]
        POL4[Slot Confirmation UI]
        POL5[Operational Readiness]
        POL6[Dispatch Decision]
    end

    CORE --> POL
    POL --> POL1
    POL --> POL2
    POL --> POL3
    POL --> POL4
    POL --> POL5
    POL --> POL6

    subgraph OUT["Output"]
        POL7[handler.ts → buildDomainPolicy]
        POL8[response-builder.ts]
        POL9[guard.ts → assertOutputSource]
        POL10[sendWhatsAppMessage]
        POL11[persist response]
    end

    POL --> POL7
    POL7 --> POL8
    POL8 --> POL9
    POL9 --> POL10
    POL10 --> POL11

    subgraph LRN["Learning"]
        LR1[opportunity-engine.ts]
        LR2[fare-learning-engine.ts]
        LR3[event-tracking.ts]
    end

    POL2 --> LR1
    LR1 --> LR2
    LR2 --> LR3

    style LEAD fill:#e1f5fe
    style CORE fill:#fff9c4
    style POL fill:#c8e6c9
    style POL9 fill:#ffccbc
```

## Fases conversacionales (resumen)

```
CORE → ROUTER → POLICY → OUTPUT
(CORE) (policy-pipeline) (handler) (guard + sender)
```

| Fase | Responsable real | Qué hace |
|------|-----------------|---------|
| **Extracción** | `services/extraction/*` | Extrae slots con LLM + scoring de confianza |
| **CORE** | `ai/core.ts` + `ai/laterals/` | Detecta intención y hechos de forma determinista |
| **Routing/Temporal** | `policy-pipeline.ts` | CORE + temporal → operationalMode → Mode (AHORA/RESERVA/INFO) |
| **Policy** | `ai/handler.ts` + `policy-ahora.ts` + `policy-reserva.ts` | Genera respuesta según reglas sin LLM |
| **Guard** | `ai/guard.ts` | Valida outputSource y pipeline completion |
| **Output** | `sender.ts` | Envía mensaje por WhatsApp y persiste |

## Módulos nuevos (vs diagrama anterior)

| Módulo | Rol | Referencia |
|--------|-----|-----------|
| `policy-pipeline.ts` | Orquestador real que combina CORE + temporal + pricing + dispatch | `src/lib/services/workflow/policy-pipeline.ts` |
| `laterals/` | 5 intents con metadata de riesgo/prioridad | `src/lib/ai/laterals/` |
| `extraction/*` | 9 archivos del pipeline de extracción | `src/lib/services/extraction/*.ts` |
| `learning/*` | 14 archivos: opportunity, fare-learning, event-tracking | `src/lib/services/learning/*.ts` |
| `context-memory.ts` | Carga/guarda contexto conversacional | `src/lib/services/memory/context-memory.ts` |

## Referencias

- Entry point: `src/app/api/whatsapp/webhook/route.ts`
- Lead orchestrator: `src/lib/services/lead.service.ts`
- Policy pipeline: `src/lib/services/workflow/policy-pipeline.ts`
- CORE: `src/lib/ai/core.ts`
- Laterals: `src/lib/ai/laterals/index.ts`
- Handler: `src/lib/ai/handler.ts`
- Guard: `src/lib/ai/guard.ts`
---

## Diagramas relacionados

- [16-policy-pipeline.md](16-policy-pipeline.md) � policy-pipeline
- [03-core-phase.md](03-core-phase.md) � core-phase
- [14-dispatch-flow.md](14-dispatch-flow.md) � dispatch-flow
