# CONVERSATION IMPROVEMENT PROCESS — AITOS
## v1.0 | 2026-07-08

---

## Flujo

```
1. RECOLECTAR — Datos del piloto
   ├─ Métricas automáticas (PILOT_METRICS.md)
   ├─ Logs de conversación
   └─ Feedback de Cristian

2. ANALIZAR — Identificar patrones
   ├─ ¿Dónde hay fricción?
   ├─ ¿Dónde abandona el usuario?
   └─ ¿Qué respuestas suenan robóticas?

3. PRIORIZAR — Una mejora a la vez
   ├─ Impacto estimado en métricas
   ├─ Esfuerzo de implementación
   └─ Riesgo de regresión

4. IMPLEMENTAR — Mínimo cambio necesario
   ├─ Sin refactors
   ├─ Sin nuevos componentes (salvo que los datos lo justifiquen)
   └─ Con medición antes/después

5. MEDIR — Validar mejora
   ├─ Comparar métrica antes vs después
   ├─ Si no mejora → revertir o iterar
   └─ Si mejora → documentar en CHANGELOG
```

---

## Template de propuesta de mejora

```
## Propuesta: [título]

### Evidencia
- Conversaciones analizadas: N
- Patrón observado: [descripción]
- Métrica afectada: [métrica]

### Cambio propuesto
- Archivo(s): [lista]
- Tipo de cambio: template | threshold | pipeline | otro
- Líneas estimadas: N

### Medición
- Métrica antes: [valor]
- Métrica esperada después: [valor]
- Cómo se mide: [query o log]

### Riesgo
- Regresión posible: [descripción]
- Mitigación: [descripción]
```
