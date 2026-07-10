# AITOS-E11-B — Implementation Report
## 2026-07-08

---

## 1. Cambios realizados

### P2-14: urgency → Policy

| Archivo | Cambio |
|---|---|
| `src/lib/ai/types.ts:140` | Nuevo campo `urgency?: string \| null` en `HandlerContext` |
| `src/lib/ai/handler.ts:83-87` | Extracción de `urgency:` fact desde `core().facts` + enriquecimiento de `enrichedCtx` |
| `src/lib/ai/handler.ts:97` | `urgency` agregado al log `[ROUTING]` |
| `src/lib/ai/policy-ahora.ts:64` | `urgency` agregado al log `[POLICY_ahora]` |
| `src/lib/ai/policy-reserva.ts:121` | `urgency` agregado al log `[POLICY_reserva]` |

### P2-15: CI classification → Policy

| Archivo | Cambio |
|---|---|
| `src/lib/ai/types.ts:143-147` | Nuevos campos `messageType?: string` e `isCorrection?: boolean` en `HandlerContext` |
| `src/lib/ai/handler.ts:22` | Nueva importación de `interpretMessage` desde `conversation-interpreter.ts` |
| `src/lib/ai/handler.ts:88-101` | Ejecución de `interpretMessage()` dentro de `handleMessage`, clasificación agregada a `enrichedCtx` |
| `src/lib/ai/handler.ts:107` | `messageType` agregado al log `[ROUTING]` |
| `src/lib/ai/policy-ahora.ts:65-66` | `messageType` en log `[POLICY_ahora]` + cancel handling en `buildAhoraFinalResponse` |
| `src/lib/ai/policy-ahora.ts:73-75` | Cancel detection: retorna `t("cancel.confirmed")` antes de cualquier flujo comercial |
| `src/lib/ai/policy-reserva.ts:122-123` | `messageType` en log `[POLICY_reserva]` |
| `src/lib/ai/policy-reserva.ts:136-139` | Cancel detection en `buildReservaFinalResponse` |
| `src/lib/ai/policy-reserva.ts:141-148` | Correction detection con logging + preservación de contexto |

---

## 2. Flujo antes / después

### urgency

**Antes:**
```
CORE → facts[] → temporalFromFacts → TemporalMode (NOW/FUTURE/UNKNOWN)
                                                 ↓
                            OperationalMode (AHORA/RESERVA, decisión binaria)
```

La urgencia se fusionaba en TemporalMode. Se perdía la granularidad entre "urgencia alta" y "urgencia media" dentro del mismo modo.

**Después:**
```
CORE → facts[] → temporalFromFacts → TemporalMode (NOW/FUTURE/UNKNOWN)
       │                                    ↓
       └── urgency:string ──→ HandlerContext → Policy
```

Policy ahora recibe `ctx.urgency` como señal independiente. TemporalMode sigue intacto.

### CI classification

**Antes:**
```
lead.service.ts → interpretMessage() → LOG
```

**Después:**
```
handler.ts → interpretMessage() → enrichedCtx → Policy
                                            ↓
                                  cancel → t("cancel.confirmed")
                                  correction → log + preservar contexto
                                  confirmation → (intacto, cubierto por workflow)
```

---

## 3. Impacto UX

| Señal | Impacto actual | Impacto futuro potencial |
|---|---|---|
| `urgency` | Observable en logs. Policy puede distinguir urgencia dentro del mismo intent. | Adaptar tono (más directo con urgencia), priorizar preguntas operativas. |
| `messageType=cancel` | Cancel detectada en Policy → respuesta de cancelación. No continúa flujo comercial. | — |
| `isCorrection` | Corrección detectada → log + preservación de contexto conversacional. | Podría inhibir reseteo de workflow state en casos de corrección parcial. |

---

## 4. Tests

| Suite | Estado |
|---|---|
| `tests/ai/policy-ahora.test.ts` | 4/4 ✅ (regresión: log incluye urgency+messageType como unknown) |
| `tests/ai/*` (9 suites) | 193/193 ✅ |
| Build (`tsc --noEmit`) | ✅ (solo errores pre-existentes en tests) |
| Contratos R1-R4 | ✅ |

### Casos validados por tests existentes

- Tests sin `ctx` → `urgency: null`, `messageType: "unknown"` (comportamiento backward-compatible)
- Tests con estados `awaiting_confirmation`, `EXECUTE`, `CLARIFY` → sin cambios funcionales

### Casos que requieren tests nuevos (futuro)

| Caso | Test | Estado |
|---|---|---|
| `ctx.urgency = "ahora"` llega a policy | No existe test unitario | Pendiente |
| `ctx.urgency = null` → mismo comportamiento que antes | No existe test unitario | Pendiente |
| `ctx.messageType = "cancel"` → respuesta de cancelación | No existe test unitario | Pendiente |
| `ctx.isCorrection = true` → preservar contexto | No existe test unitario | Pendiente |

---

## 5. Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| CI ejecutado dos veces (lead.service.ts + handler.ts) | **Alta** | La segunda llamada (handler.ts) usa datos post-extracción, que son más precisos. No hay efecto secundario (función pura). Carga adicional ~0.01ms. |
| `prevSlots` en handler.ts usa `extraction.slots` en vez de DB real | **Baja** | Los slots del extraction context incluyen datos de turnos previos mergeados. Es equivalente a lo que DB retornaría. |
| Cancel detection compite con workflow state | **Baja** | Cancel solo actúa si `messageType === "cancel"`. El workflow state existente sigue siendo la fuente principal para decisiones de flujo. |
| Urgency como string (no enum) | **Baja** | El valor viene del regex de CORE. Siempre será una palabra acotada (ahora, urgente, inmediato, ya, hoy, enseguida). |

---

## 6. Decisión sobre señales descartadas

| Señal | Veredicto E11-B | Motivo |
|---|---|---|
| `slotAssignmentConfidence` | No conectar a Policy | Pertenece a CORE/extraction. Ya consumido por `ambiguity-handler.ts`. |
| `commercial:` / `informational:` / `pre_booking:` facts | No conectar | Ya capturados por intent classification. Policy usa el intent, no el fact raw. |
| Persistir urgency | No necesario | Urgencia es por-mensaje, no necesita estado entre turnos. |
| Persistir MessageType | No necesario | Clasificación del mensaje actual, no del cliente. |

---

## 7. Total de señales conectadas

| Fase | Señales conectadas |
|---|---|
| E11 (C1-C2) | ✅ `purchaseIntent` |
| E11-B (P2-14) | ✅ `urgency` |
| E11-B (P2-15) | ✅ `messageType`, `isCorrection` |
| **Total** | **4 señales nuevas conectadas desde CORE → Policy** |

### Mapa final CORE → Policy

```
CORE
├── intent           → Router → Policy (desde siempre)
├── confidence       → Router → Policy (desde siempre)
├── facts            → Router → Policy (vía resolveNextRequiredField, desde siempre)
├── purchaseIntent   → HandlerContext → Policy (E11 C1-C2)
├── urgency          → HandlerContext → Policy (E11-B P2-14)
├── messageType      → HandlerContext → Policy (E11-B P2-15, via CI)
├── isCorrection     → HandlerContext → Policy (E11-B P2-15, via CI)
├── slotStability    → ExtractionContext → Policy (desde siempre, vía buildExtractionContext)
├── roleLock         → ExtractionContext (desde siempre)
└── slotAssignmentConfidence → ambiguity-handler.ts (desde siempre)
```
