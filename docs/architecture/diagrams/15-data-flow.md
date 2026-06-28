# 15 — Data Flow

Flujo completo de datos a través del sistema.

```mermaid
flowchart TD
    A[Datos extracción] --> B{Acción requerida}

    B --> C[COTIZAR]

    C --> C1{Resolución ubicación}
    C1 --> C2[ZONE→ZONE ✓]
    C1 --> C3[ZONE→PLACE ✓]
    C1 --> C4[PLACE→ZONE ✓]
    C1 --> C5[PLACE→PLACE ✓]



    B --> D[RESERVA FUTURA]

    D --> D1{Datos mínimos}

    D1 --> D2[Origen ✓]
    D2 --> D3[Destino ✓]
    D3 --> D4[Fecha/Hora ✓]
    D4 --> D5[Pasajeros ✓]

    D5 --> D6[
ZONE→ZONE permitido
]


    B --> E[DESPACHO AHORA]

    E --> E1{Ejecutabilidad física}

    E1 --> E2[PLACE→PLACE ✓]
    E1 --> E3[PLACE→ZONE ✓]
    E1 --> E4[ZONE→ZONE ✗]


    B --> F[DESPACHO RESERVA]

    F --> F1[
ZONE→ZONE ✓
PLACE→ZONE ✓
PLACE→PLACE ✓
]
```

## Flujo de Datos por Fase

```mermaid
flowchart LR
    A[Slots]

    A --> B[Confidence Map]

    B --> C[Readiness Resolver]

    C --> D1{Cotizable}
    C --> D2{Reservable}
    C --> D3{Despachable}

    D1 --> E[Tariff Resolver]

    D2 --> F[Await Confirmation]

    D3 --> G[Execute Trip]
```

## Datos por Fase

| Fase | Input | Output | Almacena en |
|------|-------|--------|-------------|
| CORE | Texto | CoreDecision | memory |
| EXTRACTION | Texto + History | ExtractionResult | chat_sessions.slots |
| CONFIDENCE | Slots | ConfidenceMap | chat_sessions.confidence |
| POLICY | ExtractionContext | PolicyOutput | — (stateless) |
| DISPATCH | Trip + Fleet | Assignment | trips |
| OUTPUT | PolicyOutput | WhatsApp message | messages |

## Referencia

- Context builder: `src/lib/services/workflow/build-extraction-context.ts`
- Types: `src/lib/ai/types.ts`
- Memory: `src/lib/services/memory/context-memory.ts`
