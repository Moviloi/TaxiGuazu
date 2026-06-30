# TASK PLAN — Orden lógico: pricing + naming + pasajeros

## Goal
1. **6b**: Desbloquear pricing (String(rawSlots.origin) → [object Object])
2. **7d**: Poblar display_name = "canonical (País)" para los 214 places
3. **7a+7e**: Almacenar y usar display_name en slots y mensajes al usuario
4. **7b+7c**: Mostrar ambos precios (4p+6p) + pregunta pasajeros + flujo confirmación

## Scope
- `src/lib/services/lead.service.ts` — 6b, 7b, 7c
- `src/lib/services/workflow/ambiguity-handler.ts` — 7a
- `scripts/seed-data.ts` — 7d
- Migración SQL (conexión directa Turso) — 7d
- Archivos que formatean mensajes al usuario (response-builder, slot-confirmation, etc.) — 7e

## Priority
🔴 Bug 6b bloquea todo pricing → primero
🟡 7d naming → base para 7a+7e
🟡 7a+7e display_name en UX
🟡 7b+7c flujo completo pasajeros

## Phases
1. [NOW] Director — planificar
2. [NOW] Explorer — explorar country format, seed data, ambiguity storage
3. [NEXT] Architect — validar plan contra ADRs
4. [NEXT] Implementer — 6b + 7d + 7a + 7e + 7b + 7c
5. [NEXT] Auditor — tests + build + enforce
6. [NEXT] Memory — actualizar MEMORY.md
7. [NEXT] Learning — extraer patrones
