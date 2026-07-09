# LEARNING LOOP — AITOS
## v1.0 | 2026-07-08

---

## Ciclo de aprendizaje del piloto

```
CONVERSACIÓN REAL
    │
    ├─ ÉXITO (trip creado, dispatch exitoso)
    │   └─ ¿Qué funcionó bien? ¿Se puede replicar?
    │
    ├─ FRICCIÓN (re-preguntas, correcciones)
    │   └─ ¿Qué causó la fricción? ¿Template? ¿Extracción? ¿Threshold?
    │
    ├─ ABANDONO (conversación sin completion)
    │   └─ ¿En qué punto abandonó? ¿Qué faltó?
    │
    └─ ESCALACIÓN (a admin humano)
        └─ ¿Era evitable? ¿Qué no entendió el bot?
```

---

## Del dato a la tarea

| Dato | Aprendizaje | Acción |
|---|---|---|
| 5 conversaciones con "¿Desde dónde salís?" repetido 3+ veces | El template de clarify.origin es muy genérico | Agregar variación al template |
| 3 conversaciones abandonadas en awaiting_confirmation | El mensaje de confirmación no genera confianza | Mejorar template de confirmación |
| 2 conversaciones donde "argentino" confunde al bot | B3 en producción | Implementar Conversation Interpreter |
| Tasa de conversión < 30% | El bot no está cerrando ventas | Revisar policy EXECUTE y mensajes de cierre |
| Dispatch success < 50% | Faltan choferes o los filtros son muy estrictos | Revisar seed de choferes y filtros de broadcast |

---

## Frecuencia de revisión

| Frecuencia | Actividad |
|---|---|
| **Diaria** | Revisar métricas clave (conversaciones, quotes, bookings) |
| **Semanal** | Analizar conversaciones con fricción. Priorizar 1 mejora. |
| **Mensual** | Revisar ADR-007 y decisiones arquitectónicas pendientes |
