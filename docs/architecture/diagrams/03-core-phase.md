# 03 — CORE Phase

Detección determinista de intención y extracción de hechos. Sin LLM, sin inferencia.

```mermaid
flowchart TD
    A[Mensaje Usuario] --> B[CORE]

    B --> C[Detectar Facts]

    C --> C1[action]
    C --> C2[booking]
    C --> C3[now]
    C --> C4[date/time]
    C --> C5[locations]
    C --> C6[query]
    C --> C7[greeting]

    C --> D[Role Lock]

    D --> D1["ESTOY_EN → origin"]
    D --> D2["VOY_A → destination"]
    D --> D3["DESDE → origin"]

    D --> E[Slot Analysis]

    E --> E1["locked (syntactic)"]
    E --> E2["ambiguous (needs refinement)"]
    E --> E3["open (not detected)"]

    E --> F[Intent Classifier]

    F --> G[Confidence]

    G --> H[CoreDecision]

    style B fill:#e1f5fe
    style H fill:#c8e6c9
```

## CoreDecision Output

```typescript
interface CoreDecision {
  intent: Intent;           // 11 valores posibles
  facts: string[];          // hechos extraídos
  confidence: number;       // 0.0 - 1.0
  slotStability: SlotStabilityMap;
  roleLock: RoleLock;
}
```

## Referencia

- Facts extraction: `src/lib/ai/core.ts:120-200`
- Role lock: `src/lib/ai/core.ts:60-107`
- Intent classification: `src/lib/ai/core.ts:226-299`
- Confidence: `src/lib/ai/core.ts:301-341`
