# Architecture Diagrams — TaxGuazú

Bienvenido al mapa visual de la arquitectura de TaxGuazú.

Este directorio contiene **16 diagramas** que explican, de afuera hacia adentro, cómo funciona el bot de WhatsApp: desde el webhook de entrada hasta el despacho de viajes, pasando por detección de intención, extracción de slots, políticas de respuesta y aprendizaje.

> **Cómo usar este índice:** los diagramas están numerados por orden de lectura recomendado. Empezá por el [01 — System Overview](#índice) para ver el bosque completo, y luego metete en el diagrama que te interese.

---

## Índice

| # | Diagrama | Propósito | Archivo |
|---|----------|-----------|---------|
| 01 | System Overview | Pipeline principal y orquestadores reales | [`01-system-overview.md`](01-system-overview.md) |
| 02 | Webhook Entry | Seguridad, routing y botones de WhatsApp | [`02-webhook-entry.md`](02-webhook-entry.md) |
| 03 | CORE Phase | Detección determinista de intención y facts | [`03-core-phase.md`](03-core-phase.md) |
| 04 | Router Phase | Mapeo Intent → OutputType | [`04-router-phase.md`](04-router-phase.md) |
| 05 | Extraction Phase | Extracción de slots con LLM + confianza | [`05-extraction-phase.md`](05-extraction-phase.md) |
| 06 | Confidence Model | Estados de certeza de slots | [`06-confidence-model.md`](06-confidence-model.md) |
| 07 | Policy AHORA | Flujo de ejecución inmediata | [`07-policy-ahora.md`](07-policy-ahora.md) |
| 08 | Policy RESERVA | Flujo de reserva multi-paso | [`08-policy-reserva.md`](08-policy-reserva.md) |
| 09 | Location Resolution | Texto → entidad operativa | [`09-location-resolution.md`](09-location-resolution.md) |
| 10 | Tariff Resolution | Resolución de tarifas en single query | [`10-tariff-resolution.md`](10-tariff-resolution.md) |
| 11 | Operational Readiness | Qué datos habilitan qué acciones | [`11-operational-readiness.md`](11-operational-readiness.md) |
| 12 | Workflow State Machine | Estados conversacionales | [`12-workflow-state-machine.md`](12-workflow-state-machine.md) |
| 13 | Slot Confidence Evolution | Evolución de certeza entre turnos | [`13-slot-confidence-evolution.md`](13-slot-confidence-evolution.md) |
| 14 | Dispatch Flow | Ejecución de viaje y asignación a chofer | [`14-dispatch-flow.md`](14-dispatch-flow.md) |
| 15 | Data Flow | Flujo completo de datos | [`15-data-flow.md`](15-data-flow.md) |
| 16 | Policy Pipeline | Orquestador real del flujo conversacional | [`16-policy-pipeline.md`](16-policy-pipeline.md) |

---

## Estado de los diagramas

| Ola | Diagramas | Estado |
|-----|-----------|--------|
| Ola 1 — Críticos | 09, 10, 12 | ✅ Actualizados |
| Ola 2 — Arquitectura | 01, 03, 16 | ✅ Actualizados |
| Ola 3 — Completitud | 02, 04, 05, 06, 07, 08, 11, 13, 14, 15 | ✅ Actualizados |

---

## Cómo Renderizar

### GitHub
Los diagramas Mermaid se renderizan automáticamente al ver el archivo `.md`.

### VS Code
Instalar la extensión **Markdown Preview Mermaid Support**:
```
ext install bierner.markdown-mermaid
```

### Mermaid Live Editor
1. Copiar el bloque ` ```mermaid ` del diagrama
2. Pegar en [mermaid.live](https://mermaid.live)

### CLI (para generar SVG/PNG)
```bash
# Extraer el bloque mermaid a un archivo .mmd y luego:
npx @mermaid-js/mermaid-cli --input diagrama.mmd --output diagrama.svg
```

---

## Convenciones

- **Naming:** `XX-descriptive-name.md` (XX = número de orden)
- **Mermaid types:** `flowchart TD/LR`, `stateDiagram-v2`, `sequenceDiagram`
- **Colores:**
  - `#c8e6c9` — éxito / acción completada
  - `#fff9c4` — advertencia / decisión pendiente
  - `#ffccbc` — error / fallback / requiere atención
  - `#ffcdd2` — crítico / cancelado
  - `#e1f5fe` — componente del sistema
- **Referencias:** cada archivo incluye links al código fuente relevante

---

## Navegación rápida por tema

| Si querés entender... | Leé primero... |
|-----------------------|----------------|
| El flujo completo de un mensaje | [01 — System Overview](01-system-overview.md) → [16 — Policy Pipeline](16-policy-pipeline.md) |
| Cómo el bot entiende lo que escribe el usuario | [03 — CORE Phase](03-core-phase.md) → [05 — Extraction Phase](05-extraction-phase.md) |
| Cómo decide si cotiza, reserva o despacha | [11 — Operational Readiness](11-operational-readiness.md) → [16 — Policy Pipeline](16-policy-pipeline.md) |
| Cómo se asigna un chofer | [14 — Dispatch Flow](14-dispatch-flow.md) |
| Cómo evoluciona la confianza de los datos | [06 — Confidence Model](06-confidence-model.md) → [13 — Slot Confidence Evolution](13-slot-confidence-evolution.md) |
