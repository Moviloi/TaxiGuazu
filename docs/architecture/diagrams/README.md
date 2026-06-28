# Architecture Diagrams — TaxGuazú

Directorio de diagramas de arquitectura de software en formato Mermaid.

## Índice

| # | Diagrama | Propósito | Archivo |
|---|----------|-----------|---------|
| 01 | System Overview | Pipeline principal de 5 fases | `01-system-overview.md` |
| 02 | Webhook Entry | Punto de entrada WhatsApp | `02-webhook-entry.md` |
| 03 | CORE Phase | Detección de intención + facts | `03-core-phase.md` |
| 04 | Router Phase | Intent → OutputType | `04-router-phase.md` |
| 05 | Extraction Phase | Extracción de slots + confidence | `05-extraction-phase.md` |
| 06 | Confidence Model | Estados de certeza de slots | `06-confidence-model.md` |
| 07 | Policy AHORA | Flujo de ejecución inmediata | `07-policy-ahora.md` |
| 08 | Policy RESERVA | Flujo de reserva multi-paso | `08-policy-reserva.md` |
| 09 | Location Resolution | Texto → canonical → place → zone | `09-location-resolution.md` |
| 10 | Tariff Resolution | Cascada de 5 niveles | `10-tariff-resolution.md` |
| 11 | Operational Readiness | Qué datos habilitan qué acciones | `11-operational-readiness.md` |
| 12 | Workflow State Machine | Estados conversacionales | `12-workflow-state-machine.md` |
| 13 | Slot Confidence Evolution | Evolución de certeza entre turnos | `13-slot-confidence-evolution.md` |
| 14 | Dispatch Flow | Ejecución de viaje | `14-dispatch-flow.md` |
| 15 | Data Flow | Flujo de datos completo | `15-data-flow.md` |

## Cómo Renderizar

### GitHub
Los diagramas Mermaid se renderizan automáticamente en GitHub al ver el archivo `.md`.

### VS Code
Instalar la extensión **Markdown Preview Mermaid Support**:
```
ext install bierner.markdown-mermaid
```

### Mermaid Live Editor
1. Copiar el bloque ` ```mermaid ` del diagrama
2. Pegar en [mermaid.live](https://mermaid.live)

### CLI (para generar SVG)
```bash
npx @mermaid-js/mermaid-cli mmdc -i input.mmd -o output.svg
```

## Convenciones

- **Naming:** `XX-descriptive-name.md` (XX = número de orden)
- **Mermaid types:** `flowchart TD/LR`, `stateDiagram-v2`, `sequenceDiagram`
- **Colores:** Verde (#c8e6c9) = éxito, Amarillo (#fff9c4) = advertencia, Rojo (#ffcdd2) = error/fallback
- **Referencias:** Cada archivo incluye links al código fuente relevante
