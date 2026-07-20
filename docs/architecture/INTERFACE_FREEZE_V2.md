# INTERFACE FREEZE V2 — PLAN/BUILD Interface Consolidation

**Estado**: ✅ FREEZE DECLARADO
**Fecha**: 2026-07-19
**PR**: PR-INTERFACE-FREEZE-1
**Supersedes**: DUAL_INTERFACE_ARCHITECTURE.md (PR-HARNESS-UX-1), DEVELOPMENT_ECOSYSTEM_ARCHITECTURE_FREEZE_V1.md (PR-ARCH-1)

---

## 1. Objetivo

Consolidar todo el ecosistema de desarrollo AITOS en una arquitectura de interfaz dual definitiva:

| Interfaz pública | Rol | Implementación interna |
|---|---|---|
| **PLAN** | Estratégica — produce Execution Plans | ↓ Strategic Director (SDL) |
| **BUILD** | Operacional — ejecuta planes | ↓ ARNÉS Director (AEL) |

SDL y AEL dejan de ser agentes visibles en el selector de OpenCode. Solo PLAN y BUILD son accesibles por el usuario.

---

## 2. Decisiones arquitectónicas

### 2.1 PLAN = built-in override + SDL internamente

- Se crea `.opencode/agents/plan.md` como prompt del agente PLAN.
- Su prompt deriva del SDL original, ajustado para nombrar "PLAN" y "BUILD" en lugar de "Strategic Director" y "ael".
- Delegación: `task: { "*": "deny", "build": "allow" }`.
- Permisos: `edit: deny`, `bash: deny` (idéntico al SDL).

### 2.2 BUILD = built-in override + AEL internamente

- Se crea `.opencode/agents/build.md` como prompt del agente BUILD.
- Su prompt deriva del AEL original, ajustado para nombrar "PLAN" y "BUILD".
- Delegación: `task` permite los 6 subagentes AEL (`ael-explore`, `ael-architect`, `ael-implementer`, `ael-audit`, `ael-memory`, `ael-learning`).
- Permisos: `edit: ask`, `bash: ask`, `webfetch: allow`, `websearch: allow` (idéntico al AEL).

### 2.3 SDL y AEL eliminados como agentes primarios

- `strategic-director` eliminado de `opencode.json`.
- `ael` eliminado de `opencode.json` (su funcionalidad migrada a `build`).
- Los subagentes `ael-*` se preservan con el mismo prefijo (son implementación interna de BUILD).

### 2.4 default_agent = "plan"

- Al iniciar una sesión, OpenCode selecciona PLAN por defecto.

### 2.5 Archivos legacy preservados

- `.opencode/agents/strategic-director.md` se elimina (reemplazado por `plan.md`).
- `.opencode/agents/ael.md` se elimina (reemplazado por `build.md`).
- `ael/constitution/SPEC.md`, `ael/constitution/CONTRACTS.md`, `ael/government/ORGANIZATION.md` y `ael/government/roles/` se preservan intactos (son la implementación de BUILD).

---

## 3. Invariantes congelados

### IF-01: PLAN es la única interfaz estratégica visible

No puede existir otro agente primary con responsabilidades de planificación estratégica.

### IF-02: BUILD es la única interfaz operacional visible

No puede existir otro agente primary con capacidades de ejecución operacional.

### IF-03: PLAN → BUILD es la única ruta de delegación estratégica

PLAN siempre delega a BUILD vía `task`. No existen atajos ni rutas alternativas.

### IF-04: BUILD implementa el contrato AEL internamente

BUILD sigue todas las reglas del ARNÉS Director (R1-R5, invariantes I1-I6 de SPEC.md).

### IF-05: SDL y AEL no tienen representación directa en opencode.json

No se debe agregar `strategic-director` ni `ael` como agentes primarios.

### IF-06: Los subagentes ael-* se preservan

Son la implementación interna de BUILD. No deben exponerse al usuario.

### IF-07: Cualquier cambio a esta arquitectura requiere un nuevo freeze

Ninguna modificación a PLAN, BUILD, SDL, AEL o sus relaciones puede realizarse sin un nuevo INTERFACE FREEZE.

---

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `opencode.json` | Removido `strategic-director` y `ael`. Agregado `plan` (override) y `build` (override). `default_agent` → `"plan"`. |
| `.opencode/agents/plan.md` | **Creado** — prompt de PLAN (basado en SDL). |
| `.opencode/agents/build.md` | **Creado** — prompt de BUILD (basado en AEL). |
| `.opencode/agents/strategic-director.md` | **Eliminado** — reemplazado por `plan.md`. |
| `.opencode/agents/ael.md` | **Eliminado** — reemplazado por `build.md`. |
| `docs/architecture/INTERFACE_FREEZE_V2.md` | **Creado** — este documento. |
| `docs/project/CHANGELOG.md` | Actualizado con entrada PR-INTERFACE-FREEZE-1. |
| `docs/project/PROJECT_BOARD.md` | Actualizado con D79. |

---

## 5. Diagrama de flujo

```
Usuario
  │
  ├── PLAN (visible)
  │     └── Strategic Director (interno) → Execution Plan
  │           └── task: build
  │
  └── BUILD (visible)
        └── ARNÉS Director (interno) → ejecución
              ├── @ael-explore
              ├── @ael-architect
              ├── @ael-implementer
              ├── @ael-audit
              ├── @ael-memory
              └── @ael-learning
```

---

## 6. Verificación

- **V-01**: `opencode.json` contiene solo `plan` y `build` como agentes primarios. ✅
- **V-02**: `plan` tiene `edit: deny`, `bash: deny`, `task: { "*": "deny", "build": "allow" }`. ✅
- **V-03**: `build` tiene `edit: ask`, `bash: ask`, `task` con 6 subagentes `ael-*`. ✅
- **V-04**: `default_agent` es `"plan"`. ✅
- **V-05**: SDL y AEL no existen como entradas en `opencode.json`. ✅
- **V-06**: `strategic-director.md` y `ael.md` eliminados. ✅
- **V-07**: Subagentes `ael-*` preservados en `opencode.json` con mismo nombre, permisos y modelos. ✅
- **V-08**: `plan.md` y `build.md` existen en `.opencode/agents/`. ✅
- **V-09**: Contratos arquitectónicos (SPEC, CONTRATS, ORGANIZATION, MISSION_PHASE_ARCHITECTURE, MISSION_CLOSURE_CONTRACT) no modificados. ✅
- **V-10**: Sin cambios a permisos, prompts funcionales ni capacidades de los subagentes `ael-*`. ✅

---

## 7. Historial de freezes

| Versión | Fecha | PR | Cambio |
|---|---|---|---|
| **V1** | 2026-07-19 | PR-ARCH-1 | Freeze inicial del ecosistema (SDL + AEL visibles). 19 invariantes. |
| **V2** | 2026-07-19 | PR-INTERFACE-FREEZE-1 | Consolidación PLAN/BUILD. SDL y AEL pasan a ser internos. 7 invariantes IF-01 a IF-07. |
