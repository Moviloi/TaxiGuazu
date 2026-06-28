# 11 — Operational Readiness

Qué datos habilitan qué acciones del sistema.

```mermaid
flowchart TD
    A[Datos extraídos] --> B{Acción requerida}

    B --> C[COTIZAR]

    C --> C1{Resolución ubicación}
    C1 --> C2["ZONE→ZONE ✓"]
    C1 --> C3["ZONE→PLACE ✓"]
    C1 --> C4["PLACE→ZONE ✓"]
    C1 --> C5["PLACE→PLACE ✓"]

    B --> D[RESERVA FUTURA]

    D --> D1{Datos mínimos}
    D1 --> D2["Origen ✓"]
    D2 --> D3["Destino ✓"]
    D3 --> D4["Fecha/Hora ✓"]
    D4 --> D5["Pasajeros ✓"]

    D5 --> D6["ZONE→ZONE permitido"]

    B --> E[DESPACHO AHORA]

    E --> E1{Ejecutabilidad física}
    E1 --> E2["PLACE→PLACE ✓"]
    E1 --> E3["PLACE→ZONE ✓"]
    E1 --> E4["ZONE→ZONE ✗"]

    B --> F[DESPACHO RESERVA]

    F --> F1["ZONE→ZONE ✓"]
    F1 --> F2["PLACE→ZONE ✓"]
    F2 --> F3["PLACE→PLACE ✓"]

    style C2 fill:#c8e6c9
    style C3 fill:#c8e6c9
    style C4 fill:#c8e6c9
    style C5 fill:#c8e6c9
    style E4 fill:#ffcdd2
```

## Tabla de Suficiencia

| Acción | Requiere | Puede aceptar | No puede aceptar |
|--------|----------|---------------|------------------|
| **Detectar intención** | Texto | Cualquier texto | Nada (siempre funciona) |
| **Responder consulta** | Intent clasificado | Cualquier intent ≠ AMBIGUOUS | Sin classification |
| **Cotizar** | origin + destination + passengers | ZONE→ZONE, PLACE→ZONE, ZONE→PLACE, PLACE→PLACE | origin o destination vacíos |
| **Crear reserva** | origin + destination + passengers + scheduled_at | ZONE→ZONE + fecha/hora | Sin fecha |
| **Confirmar reserva** | Todos + tariff + affirmation | PLACE→PLACE | Sin tariff |
| **Despacho AHORA** | origin + destination + passengers (CONFIRMED) | PLACE→PLACE, PLACE→ZONE | ZONE→ZONE |
| **Despacho RESERVA** | origin + destination + passengers + scheduled_at | ZONE→ZONE | Sin scheduled_at |

## Referencia

- Operational readiness: `src/lib/ai/operational-readiness.ts`
- Field resolver: `src/lib/ai/field-resolver.ts`
