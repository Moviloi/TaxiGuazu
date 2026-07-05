# DESIGN SPEC — Language & Slot Context Fixes

## Veredicto: ✅ APPROVED

Ninguno de los 3 cambios viola ADR 001-005 ni los contratos definidos en `docs/architecture/architecture.md`.

## Validación por ADR

### ADR 001 — Layered Architecture ✅
- **P0** (extraction-runner.ts): Extraction layer. No cambia imports ni dependencias. Capa permitida.
- **P1/P1b** (detect-lang.ts): AI layer (detect-lang es utilidad de detección de idioma). No cambia imports. Capa permitida.
- **P2** (core.ts): Core layer (AI sub-layer). No cambia imports. Capa permitida.
- Ningún cambio agrega dependencias ascendentes (lower→higher layer).

### ADR 002 — Database Facade ✅
- Ningún cambio toca la fachada de DB. Todos los accesos existentes se mantienen idénticos.

### ADR 003 — (Learning Domain) ✅
- No aplica. Ningún cambio toca Learning.

### ADR 004 — Service Boundaries ✅
- **P0**: Extraction service modifica merge de slots. No cruza boundaries. No agrega imports a otros servicios.
- **P1/P1b/P2**: AI/Core layer. No tocan servicios.

### ADR 005 — AI-First Interpretation ✅
- **P0**: No agrega heurísticas. Sigue usando el LLM como fuente primaria de extracción; el merge de slots previos es un mecanismo de preservación de contexto, no de interpretación heurística.
- **P1/P1b**: Threshold de sessionLang. No es interpretación de datos.
- **P2**: Regex de estructura sintáctica (CORE). Permitido — CORE extrae hechos explícitos, no interpreta semánticamente.

### R1-R3 (Contratos ARNES) ✅
- **R1**: Ningún contrato entre capas se modifica.
- **R2**: Ninguna dependencia viola ADR 001-004.
- **R3**: Todos los cambios referencian código existente verificado.

## Cambios Aprobados

| ID | Archivo | Cambio | Capa |
|----|---------|--------|------|
| P0 | `extraction-runner.ts:433-439` | Merge de slots previos restaura valor si LLM alucina (comparando contra texto del usuario) | Extraction |
| P1 | `detect-lang.ts:67` | `>= 0.5` → `> 0.5` en `detectLangWithFallback()` | AI |
| P1b | `detect-lang.ts:49` | `>= 0.5` → `> 0.5` en `resolveLang()` | AI |
| P2 | `core.ts:70` | `DESDE_RE` incluya `de` y `del` | Core (AI) |

## Recomendaciones

1. **Orden de implementación:** P0 → P1 → P1b → P2 (P0 tiene más impacto en el comportamiento observable)
2. **Probar con casos borde:** después de implementar, verificar que "hotel" aislado detecte correctamente según contexto de sesión
3. **No requiere migración de DB ni cambios en contracts/docs**

## Riesgos Arquitectónicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| P0 restaura slot incorrecto si usuario cambió de opinión sin mencionar nuevo valor | Baja | Medio | Se compara contra texto textual del usuario; si no menciona el valor nuevo, se restaura el previo |
| P1 threshold 0.5 exacto cae a sessionLang en vez de detectar inglés | Baja | Bajo | sessionLang ya está persistido correctamente; inglés con múltiples keywords (>1) da confidence >0.5 y sigue funcionando |
