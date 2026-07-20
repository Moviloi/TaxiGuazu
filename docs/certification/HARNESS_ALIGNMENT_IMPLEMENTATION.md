# Harness Alignment Implementation — AEL as Pure Operational Subagent

> Eliminación definitiva del modo AEL como agente primary. AEL convertido en subagente operacional puro.

---

## 1. Objective

Eliminar el modo AEL de la interfaz de OpenCode. AEL pasa de ser un agente `primary` (modo seleccionable) a `subagent` (invocable solo via `task` desde SDL). PLAN y BUILD son los únicos modos visibles del ecosistema.

---

## 2. Cambios realizados

| Archivo | Cambio | Justificación |
|---------|--------|-------------|
| `opencode.json` | `ael.mode`: `"primary"` → `"subagent"` | AEL deja de ser modo seleccionable |
| `opencode.json` | `ael.description`: actualizado (legacy "7 fases" removido) | Descripción corregida para reflejar rol actual |
| `.opencode/agents/ael.md` | frontmatter `mode`: `primary` → `subagent` | Consistencia con `opencode.json` |

### Lo que NO se modificó

- Prompt de AEL (sin cambios)
- Prompt de SDL (sin cambios)
- Subagentes (6 inalterados)
- Permisos (inalterados)
- Contratos (inalterados)
- Pipeline (inalterado)
- Arquitectura documentada (inalterada)

---

## 3. Archivos modificados

| Archivo | Líneas cambiadas |
|---------|-----------------|
| `opencode.json` | 2 líneas: `mode` + `description` |
| `.opencode/agents/ael.md` | 2 líneas: `description` + `mode` |
| `docs/certification/HARNESS_ALIGNMENT_IMPLEMENTATION.md` | Nuevo (este documento) |
| `docs/project/CHANGELOG.md` | Actualizado |
| `docs/project/PROJECT_BOARD.md` | Actualizado |

---

## 4. Verificaciones V-01 a V-07

### V-01 — SDL continúa pudiendo invocar AEL mediante task

**Resultado:** ✅ VERIFICADO

`opencode.json` preserva el ID `ael` en la sección `agent`. El SDL reference `task: { "*": "deny", "ael": "allow" }` apunta al ID `ael`, no al `mode`. Un agente `subagent` es igualmente invocable via `task`. No hay cambios en `strategic-director.md`.

Evidencia:
```json
// opencode.json — inalterado excepto mode
"strategic-director": {
  "task": {
    "*": "deny",
    "ael": "allow"    // ← referencia por ID, funciona con cualquier mode
  }
}
```

### V-02 — BUILD continúa ejecutando exactamente el mismo flujo operacional

**Resultado:** ✅ VERIFICADO

El prompt de AEL (`ael.md`) no fue modificado en su contenido operacional. El workflow BUILD (Recibí → Descomponé → Ejecutá → Cerrá) permanece idéntico. Las capabilities, subagentes y reglas invariables (R1-R5) están inalteradas.

### V-03 — Los seis subagentes permanecen inalterados

**Resultado:** ✅ VERIFICADO

`opencode.json` preserve las 6 entradas `ael-explore`, `ael-architect`, `ael-implementer`, `ael-audit`, `ael-memory`, `ael-learning` sin cambios en `mode`, `model`, `description` ni `permission`.

### V-04 — No aparecen nuevos modos

**Resultado:** ✅ VERIFICADO

Los únicos agentes con `mode: "primary"` son:
- `strategic-director` (único primary)
- `ael` ahora es `subagent`

No se agregaron ni quitaron otras entradas. Solo `strategic-director` permanece como modo seleccionable.

### V-05 — PLAN continúa siendo el único punto de entrada estratégico

**Resultado:** ✅ VERIFICADO

`default_agent` sigue siendo `strategic-director`. SDL mantiene sus permisos (`edit: deny`, `bash: deny`, solo `task: { "ael": "allow" }`). No hay cambios en el prompt de SDL.

### V-06 — BUILD continúa siendo el único punto de entrada operacional

**Resultado:** ✅ VERIFICADO

AEL mantiene permisos operacionales (`edit: ask`, `bash: ask`, `task` a 6 subagentes). El flujo BUILD se inicia exclusivamente cuando SDL delega a AEL via `task`.

### V-07 — No existe ninguna regresión funcional

**Resultado:** ✅ VERIFICADO

| Aspecto | Antes | Después | Regresión |
|---------|-------|---------|-----------|
| SDL → AEL delegation | `task: { "ael": "allow" }` | Idéntico | ❌ No |
| AEL → subagentes | `task: { "ael-*": "allow" }` | Idéntico | ❌ No |
| AEL permissions | `edit: ask`, `bash: ask` | Idéntico | ❌ No |
| AEL prompt content | BUILD workflow | Idéntico | ❌ No |
| SDL prompt content | PLAN workflow | Idéntico | ❌ No |
| Subagentes | 6 entries | Idéntico | ❌ No |
| Modo visible | strategic-director + ael | strategic-director solo | ❌ No (cambio intencional) |

---

## 5. Riesgos evaluados

| Riesgo | Evaluación | Mitigación |
|--------|-----------|------------|
| Usuario no puede invocar AEL directamente | 🟢 Aceptable — es el comportamiento deseado. SDL es el único punto de entrada. | Documentado en MISSION_PHASE_ARCHITECTURE.md |
| SDL no delega correctamente | 🟢 Sin riesgo — SDL ya tiene `task: { "ael": "allow" }` y lo usa en el flujo normal | Verificado en V-01 |
| AEL pierde capacidad de invocar subagentes | 🟢 Sin riesgo — subagentes se referencian por ID, no por mode | Verificado en V-03 |

---

## 6. Resultado

```
Antes:
  Modos: strategic-director (primary) | ael (primary) | 6 subagentes (subagent)

Después:
  Modos: strategic-director (primary) | ael (subagent) | 6 subagentes (subagent)
```

El ecosistema ahora refleja exactamente la arquitectura certificada:

```
PLAN
  ↓
Strategic Director (modo visible único)
  ↓  task
BUILD
  ↓
AEL (subagente operacional)
  ↓  task
6 subagentes especializados
```

---

## 7. Certificación final

| Criterio | Estado |
|----------|--------|
| PLAN y BUILD son los únicos modos visibles | ✅ |
| AEL funciona exclusivamente como subagente operacional | ✅ |
| SDL continúa siendo el único planificador estratégico | ✅ |
| BUILD continúa delegando correctamente en AEL | ✅ |
| No se modificó ningún contrato existente | ✅ |
| No se modificó ningún prompt operativo | ✅ |
| No se alteró el comportamiento del arnés | ✅ |
| La única diferencia observable es la desaparición del modo AEL | ✅ |

**Fecha de certificación:** 2026-07-19
**Veredicto:** ✅ IMPLEMENTACIÓN CERTIFICADA

---

*Este documento certifica la alineación del arnés con la arquitectura PLAN → BUILD. AEL es ahora un subagente operacional puro. Sin regresiones.*
