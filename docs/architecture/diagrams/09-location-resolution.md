# 09 — Location Resolution

Pipeline de resolución de ubicación: texto → entidad operativa.

```mermaid
flowchart LR

    TXT[Texto Usuario]

    TXT --> CORE

    CORE -->|decide qué detectó| FACTS

    FACTS --> ROUTER

    ROUTER -->|clasifica acción| OUTPUT_TYPE

    OUTPUT_TYPE --> POLICY

    POLICY -->|escribe texto| RESPONSE


    LLM[LLM]
    LLM --> EXTRACTION

    EXTRACTION --> CORE

    CORE -. no genera texto .-> BLOCK1

    ROUTER -. no genera texto .-> BLOCK2

    LLM -. no responde usuario .-> BLOCK3
```

## Pipeline de Resolución

```mermaid
flowchart TD
    A["Texto: 'aeropuerto'"] --> B[EXTRACTOR LINGÜÍSTICO]

    B -->|"origin = 'aeropuerto'"| C[ALIAS RESOLVER]

    C -->|"SQL: alias_lookup"| D{¿Resuelto?}

    D -->|Sí| E["canonical_name = 'Aeropuerto Iguazú'"]
    D -->|No| X["unknown → fallback"]

    E --> F[PLACE / ZONE]

    F -->|"SQL: places"| G{¿Place?}

    G -->|place_id| H["place_id = airport_iguazu"]
    G -->|zone| I["zone = zone_iguazu_center"]

    H --> J[TARIFF RESOLVER]
    I --> J

    J --> K{Nivel tarifa}
    K --> L1[PLACE→PLACE]
    K --> L2[PLACE→ZONE]
    K --> L3[ZONE→PLACE]
    K --> L4[ZONE→ZONE]
```

## Dos Sistemas Paralelos

| Sistema | Tabla | Fuzzy | Retorna | Usado por |
|---------|-------|-------|---------|-----------|
| `resolveAlias()` | `alias_lookup` | Levenshtein ≤ 3 | `canonical_name[]` | Legacy |
| `resolveLocation()` | `aliases` JOIN `places` | Accent-insensitive | `{place_id, canonical_name, zone, confidence}` | Tariff, Pricing |

## Referencia

- Alias resolver: `src/lib/db/database.ts:539-572`
- Place resolver: `src/lib/db/domains/geo.ts:3-13`
- Location resolver: `src/lib/services/geo/location-resolver.ts:26-59`
