# 19 — Module Dependency Map

> **Dependencias reales entre módulos del sistema, derivadas del código fuente.**

---

## Diagrama de dependencias

```mermaid
flowchart TB
    subgraph Config["Config"]
        ENV[env.ts]
        CONST[constants.ts]
    end

    subgraph Utils["Utils"]
        LOG[logger.ts]
    end

    subgraph DB["DB Layer"]
        CONN[connection.ts]
        HELP[helpers.ts]
        TYPES[types.ts]
        DOMAINS[domains/: trips, learning, connection-state]
        FACADE[database.ts]
    end

    subgraph AI["AI Layer"]
        CORE[core.ts]
        ROUTER[router.ts]
        CI[conversation-interpreter.ts]
        CO[client-objective.ts]
        SD[conversation-strategy.ts]
        POL_A[politica-ahora.ts]
        POL_R[politica-reserva.ts]
        RB[response-builder.ts]
        LLM[llm-response.ts]
        GUARD[guard.ts]
        PAT[patterns.ts]
    end

    subgraph Services["Services Layer"]
        I18N[i18n/]
        GEO[geo/]
        MEM[memory/]
        PRIC[pricing/]
        LEARN[learning/]
        EXTR[extraction/]
        WORK[workflow/]
        DISP[dispatch/]
        TRIP[trip-execution/]
        ADMIN[admin/]
        HH[housekeeping/]
    end

    subgraph Lead["Lead Orchestrator"]
        LS[lead.service.ts]
        PP[policy-pipeline.ts]
        PL[pipeline.ts]
    end

    subgraph Routes["API Routes"]
        WH[webhook/route.ts]
        SIM[simulate/route.ts]
    end

    subgraph Sender["WhatsApp Sender"]
        SEND[sender.ts]
    end

    %% Dependencies
    ENV --> CONST
    CONST --> LOG

    CONN --> HELP
    HELP --> LOG
    DOMAINS --> CONN
    DOMAINS --> TYPES
    FACADE --> DOMAINS

    AI --> FACADE
    AI --> LOG
    AI --> PAT

    I18N --> FACADE
    GEO --> FACADE
    GEO --> I18N
    MEM --> FACADE
    PRIC --> FACADE
    PRIC --> GEO
    LEARN --> FACADE
    LEARN --> PRIC
    EXTR --> FACADE
    EXTR --> GEO
    EXTR --> PRIC
    EXTR --> MEM
    WORK --> EXTR
    DISP --> LEARN
    DISP --> WORK
    DISP --> PRIC
    DISP --> GEO
    TRIP --> PRIC
    TRIP --> DISP
    TRIP --> WORK
    ADMIN --> FACADE
    HH --> FACADE

    PP --> WORK
    PP --> EXTR
    PP --> AI
    PP --> DISP
    PP --> TRIP
    PP --> SEND
    PP --> ADMIN
    PP --> FACADE
    LS --> PP
    LS --> MEM
    LS --> EXTR
    LS --> WORK
    LS --> ADMIN

    PL --> AI
    PL --> SEND
    PL --> FACADE
    PL --> GEO
    PL --> MEM
    PL --> ADMIN

    WH --> LS
    SIM --> LS

    %% Style
    style FACADE fill:#81c784,stroke:#2e7d32
    style AI fill:#64b5f6,stroke:#1565c0
    style Services fill:#ffb74d,stroke:#e65100
    style Lead fill:#ce93d8,stroke:#6a1b9a
```

---

## Orden de dependencia (estricto)

```
Config → Utils
   ↓
DB Facade
   ↓
AI Layer (CORE, Router, CI, CO, SD, Policies, LLM)
   ↓
Services Layer:
  i18n → Geo → Memory → Pricing → Learning → Extraction → Workflow
  → Dispatch → Trip-execution → Admin → Housekeeping
   ↓
Lead Orchestrator (lead.service → policy-pipeline → pipeline.ts)
   ↓
API Routes / Sender
```

### Reglas de dependencia (ADR-001, ADR-004)

1. **AI no importa de Services** — ni siquiera type-only imports (gap conocido: `response-builder.ts` importa `OpportunityResult`)
2. **Services importan DB solo a través de la facade** (`database.ts`)
3. **No hay dependencias circulares** — verificable con `ael/contracts/enforce.sh`
4. **Cada capa solo importa de capas inferiores**

---

*Diagrama: 19-module-dependency-map*
*Last updated: 2026-07-10*
