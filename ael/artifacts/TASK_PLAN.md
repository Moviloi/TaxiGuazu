# TASK PLAN — Bug [object Object] en confirmación de viaje

## Goal
Corregir la interpolación de `[object Object]` en el mensaje post slot_confirmation. Los slots ahora se almacenan como objetos `ConfirmedSlot` (`{ value, score, reason, ... }`) pero `lead.service.ts` los trata como strings planos.

## Scope
- `src/lib/services/lead.service.ts` — 2 lugares: líneas ~370-371 y ~384-386

## Priority
P0 — UX rota. El mensaje de confirmación muestra "[object Object]" en lugar del nombre del lugar.

## Phases
1. [DONE] Director — analizar, generar TASK_PLAN
2. [DONE] Explorer — descubrir origen del bug
3. [NOW] Architect — validar fix propuesto contra ADRs
4. [NEXT] Implementer — aplicar fix en lead.service.ts
5. [NEXT] Auditor — ejecutar tests, build, enforce
6. [NEXT] Memory — actualizar MEMORY.md
7. [NEXT] Learning — extraer patrones
