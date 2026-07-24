> **STATUS: ARCHIVED**
> **REASON:** Historical artifact from ARNÉS pre-v1.0 architecture (pipeline de 7 fases).
> **REPLACED BY:** `ael/constitution/SPEC.md` (operational specification) and `ael/government/roles/` (capability contracts).
> **ARCHIVED:** 2026-07-23 — Sprint 9.2

# AGENTS.md — TaxGuazu

## ARNES (Agent Execution Layer)

Pipeline de 7 fases que gobierna la evolucion del sistema. OpenCode entra por aqui.

**Ubicacion:** `ael/`
**Pipeline:** `ael/PIPELINE.md`
**Roles:** `ael/roles/01-director.md` ... `07-learning.md`
**Contratos:** `ael/contracts/CONTRACTS.md`
**Enforcement:** `bash ael/contracts/enforce.sh`

## Reglas

- **R1:** No modificar contratos entre capas sin actualizar autoridad arquitectonica.
- **R2:** No crear dependencias que violen ADR 001-004.
- **R3:** No asumir implementacion que no exista en codigo fuente real.

## Autoridad

| Decision | Autoridad |
|----------|-----------|
| Arquitectura | `docs/adr/001-004` |
| Contratos | `docs/architecture/architecture.md` |
| Estado | `.opencode/memory/MEMORY.md` |

## Subagentes

| Subagente | Rol | Autoridad | Modo | Comando |
|-----------|-----|-----------|------|---------|
| `ael` | Director | Orquesta pipeline, define prioridad, resuelve escalaciones | primary | `/ael:plan` |
| `ael-explore` | Explorer | Descubre estado real del codigo (solo lectura) | subagent | `/ael:explore` |
| `ael-design` | Architect | Veto arquitectonico sobre disenos que violen ADRs | subagent | `/ael:design` |
| `ael-implement` | Implementer | Aplica cambios aprobados al codigo | subagent | `/ael:implement` |
| `ael-validate` | Auditor | Bloqueo por calidad (tests/build/enforce) | subagent | `/ael:validate` |
| `ael-remember` | Memory | Conserva estado del sistema y decisiones | subagent | `/ael:remember` |
| `ael-learn` | Learning | Detecta patrones de exito y fallo | subagent | `/ael:learn` |

## Organigrama funcional

Jerarquia de autoridad y responsabilidad entre los 7 roles del ARNES:

```
                    ┌─────────────────────┐
                    │      DIRECTOR       │  ← Estrategia: prioriza, orquesta,
                    │   (ael - primary)   │     resuelve conflictos, decide P0
                    └──────┬──────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
   │  EXPLORER   │ │  ARCHITECT  │ │   MEMORY    │
   │ (ael-exp.)  │ │ (ael-arch.) │ │ (ael-mem.)  │
   │             │ │             │ │             │
   │ Inteligencia│ │ Gobierno    │ │ Conocimiento│
   │ Realidad    │ │ Arquitect.  │ │ del sistema │
   │ (readonly)  │ │ (veto ADR)  │ │ (solo edit) │
   └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
          └───────────────┼───────────────┘
                          │
                   ┌──────▼──────┐
                   │ IMPLEMENTER │
                   │ (ael-impl.) │
                   │             │
                   │ Ejecucion   │
                   │ (edit+bash) │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   AUDITOR   │
                   │  (ael-validate) │
                   │             │
                   │ Control     │
                   │ (bash restr)│
                   │ (bloqueo)   │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   LEARNING  │
                   │ (ael-learn) │
                   │             │
                   │ Mejora      │
                   │ (solo lect) │
                   │ Patrones    │
                   └─────────────┘
```

**Flujo de autoridad:**
1. **Director** → define QUÉ y EN QUÉ ORDEN (prioridad)
2. **Explorer, Architect, Memory** → asesoran al Director (staff)
3. **Implementer** → ejecuta lo aprobado (línea de producción)
4. **Auditor** → controla calidad (puerta de salida)
5. **Learning** → analiza resultados y propone mejoras (retroalimentación)

**Flujo de datos:**
```
Director ──TASK_PLAN──→ Explorer ──SYSTEM_STATE──→ Architect ──DESIGN_SPEC──→
Implementer ──CODE_DIFF──→ Auditor ──VALIDATION_REPORT──→ Memory ──DECISION_RECORD──→
Learning ──PATTERN_EXTRACTION──→ (feedback al Director)
```

## Commands

| Comando | Fase | Uso |
|---------|------|-----|
| `/ael:plan` | Director | Iniciar pipeline: planificar un cambio |
| `/ael:explore` | Explorer | Explorar estado actual del codigo |
| `/ael:design` | Architect | Validar diseno contra ADRs |
| `/ael:implement` | Implementer | Aplicar cambios aprobados |
| `/ael:enforce` | — | Verificar contratos R1-R3 |
| `/ael:validate` | — | Tests + build + enforce |
| `/ael:remember` | Memory | Registrar decisiones y estado |
| `/ael:learn` | Learning | Extraer patrones del historial |
| `/ael:diagnose` | — | Auto-diagnostico de integridad del ARNES |
