# HUMAN EXPERIENCE CHARTER — AITOS
## v1.0 | 2026-07-08

---

## Filosofía

La arquitectura dejó de ser el producto. La experiencia del pasajero es el producto.

Toda decisión técnica debe justificarse por su impacto en al menos uno de estos objetivos:
- Mayor comprensión del usuario
- Menos mensajes hasta la cotización
- Mayor conversión a reserva
- Menor intervención humana
- Menor tiempo de despacho
- Mayor satisfacción del pasajero

Si una propuesta no mejora al menos uno de estos indicadores, requiere justificación explícita.

---

## Principios de la etapa

1. **Evitar refactors estructurales** — salvo bloqueantes. La arquitectura está estable.
2. **Evitar complejidad sin evidencia** — esperar datos del piloto antes de diseñar.
3. **Priorizar conversaciones reales** — sobre casos hipotéticos.
4. **Medir antes de optimizar** — no optimizar sin métricas.
5. **Aprender del comportamiento real** — de los pasajeros, no de las suposiciones.

---

## Qué SÍ se permite en esta etapa

- Mejoras en templates de respuesta (tono, variación, personalización)
- Ajustes en thresholds de confidence
- Mejoras en el pipeline de extracción basadas en datos reales
- Implementación del Conversation Interpreter (ADR-007) si los datos lo justifican
- Corrección de bugs que afecten la conversación
- Métricas y observabilidad
- Seed de datos de negocio (choferes, tarifas, lugares)

## Qué NO se permite

- Nuevos bounded contexts
- Refactors arquitectónicos mayores
- Migraciones de schema sin justificación de negocio
- Cambios en CORE, ROUTER o POLICY sin evidencia de necesidad
- "Mejoras" basadas en intuición sin datos

---

## Ciclo de mejora

```
Conversación real → Evidencia → Aprendizaje → Propuesta → Project Board → Implementación → Medición
```

Cada conversación del piloto debe poder transformarse en una mejora concreta del sistema.
