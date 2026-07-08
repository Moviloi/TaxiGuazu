# CONTEXT LOSS FIX — B2
## Implementado: 2026-07-08

---

## Causa raíz

`executeNowTrip()` en `now-execution.service.ts:79` setea `conversational_state = "idle"` tras ejecutar un viaje. El siguiente mensaje del usuario encuentra estado `idle`, ninguna zona de estado lo captura, y cae al pipeline normal de extracción. `extractSlots` sobre texto corto ("sí", "ok") no encuentra origin/destination → policy pregunta "¿Desde dónde salís?".

## Diff conceptual

**Antes**: Después de `executeNowTrip` → idle → siguiente mensaje → normal pipeline → extraction falla → pérdida de contexto.

**Después**: Después de `executeNowTrip` → idle → siguiente mensaje → POST-BOOKING zone detecta trip activo → rutea a handlePolicyPipeline como consulta informativa/comercial → slots se preservan en la sesión.

## Cambio implementado

**Archivo**: `src/lib/services/lead.service.ts`

Se agregó una zona `POST_BOOKING` (líneas 318-342) después de la zona de ambigüedad y antes del pipeline de extracción:

```typescript
if (slotState === "idle") {
  const activeTrip = await getActiveTripByPhone(phone);
  if (activeTrip) {
    // Route as post-booking follow-up inquiry
    await handlePolicyPipeline({ domain, ... });
    return;
  }
}
```

**Lógica**: Si el estado es `idle` Y existe un trip activo para el usuario, el mensaje se trata como consulta de seguimiento (sin extracción de slots), no como nuevo booking.

**Nuevo import**: `getActiveTripByPhone` from `@/lib/db/domains/trips`

## Funciones modificadas

| Archivo | Cambio | Líneas |
|---|---|---|
| `lead.service.ts` | +1 import | 2 |
| `lead.service.ts` | +25 líneas (POST_BOOKING zone) | 318-342 |

## Impacto sobre otros workflows

| Workflow | Afectado | Comportamiento |
|---|---|---|
| **NOW** (confirmación + executeNowTrip) | ✅ BENEFICIADO | Mensajes post-confirmación tratados como seguimiento |
| **Reserva futura** | Sin cambio | `pending_human_review` no es `idle` → la zona no se activa |
| **Multi-leg** | Sin cambio | `executeMultiLegTrip` no setea idle |
| **Correcciones parciales** | Sin cambio | Estado es `slot_confirmation`/`collecting_slots`, no `idle` |
| **Confirmación mediante texto** | Sin cambio | Flujo de awaiting_confirmation no alterado |
| **Confirmación mediante botones** | Sin cambio | handleSlotConfirmationButton no alterado |

## Validación

| Gate | Resultado |
|---|---|
| Build | ✅ PASS |
| Tests | 875/876 (fase-22 T2 histórico) |
| Contracts R1-R4 | ✅ PASS |
| Regresiones | 0 |

## Riesgos residuales

| Riesgo | Mitigación |
|---|---|
| Usuario con trip activo quiere hacer OTRO booking | Bajo — si el texto contiene origin+destino, `extractSlots` en el handler lo capturará de todas formas (el handler procesa el texto) |
| `getActiveTripByPhone` retorna trip obsoleto | Bajo — trips se cierran vía cron/timeouts. Si un trip está activo es porque realmente está en curso |
| La zona POST-BOOKING interfiere con `GREETING` shortcut | Nulo — GREETING se captura ANTES de esta zona (línea ~78) |
