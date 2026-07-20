# Harness Mode Alignment & Execution Visibility Audit

> Auditoría de viabilidad técnica para alinear el arnés (OpenCode) con la arquitectura PLAN → BUILD certificada.

---

## 1. Arquitectura actual

### Capas del arnés

```
OpenCode modes (UI)
  │
  ├── strategic-director  (primary, default)
  │     task: { "*": "deny", "ael": "allow" }
  │
  ├── ael                 (primary)
  │     task: subagentes (ael-explore, ael-architect, ...)
  │
  └── 6 subagentes        (subagent)
        ael-explore, ael-architect, ael-implementer,
        ael-audit, ael-memory, ael-learning
```

### Mapa de archivos

| Archivo | Rol actual | Problema |
|---------|-----------|----------|
| `opencode.json` | Define 8 agentes, 2 primarios | `ael` descrito como "orquesta pipeline de 7 fases" (legacy) |
| `opencode.json` | `instructions: ["ael/AGENTS.md"]` | Archivo no existe (deuda pre-SDL-3A) |
| `.opencode/agents/ael.md` | Prompt del AEL | `mode: primary` en frontmatter — visible como modo |
| `.opencode/agents/strategic-director.md` | Prompt del SDL | `task: { "ael": "allow" }` — depende de ID `ael` |
| `docs/architecture/MISSION_PHASE_ARCHITECTURE.md` | Contrato PLAN → BUILD | Define AEL como motor de BUILD, no como fase independiente |

### Contradicción arquitectónica

La arquitectura certificada dice:

```
PLAN (SDL) → BUILD (AEL) → Learning
```

Pero el arnés expone:

```
Modo: strategic-director  (PLAN)
Modo: ael                 (?)
Modo: ael-explore         (subagent)
...
```

AEL aparece como un modo seleccionable al mismo nivel que SDL, contradiciendo la arquitectura donde AEL es el motor operacional de BUILD (subordinado a SDL).

---

## 2. Arquitectura objetivo

```
OpenCode modes (UI)
  │
  └── strategic-director  (primary, default)
        task: { "*": "deny", "ael": "allow" }
        │
        ▼
        ael               (subagent — no visible como modo)
          task: 6 subagentes
```

Solo un modo visible: **PLAN** (Strategic Director). BUILD ocurre automáticamente cuando SDL delega a AEL via `task`.

### Flujo de usuario

1. Usuario está en PLAN (Strategic Director).
2. SDL analiza, produce Recommendation + Execution Plan + Execution Status.
3. Usuario responde "ok" o "hacelo".
4. SDL invoca `task` a `ael` con el Execution Plan.
5. AEL ejecuta BUILD (visible en la conversación como subagente invocado).
6. AEL retorna Execution Report.
7. SDL evalúa y decide próximo ciclo.

---

## 3. Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|--------|-----------|------------|
| R1 | `instructions: ["ael/AGENTS.md"]` referencia archivo inexistente | 🟡 Media | Abrir issue para corregir la referencia en `opencode.json` |
| R2 | `ael` description legacy "pipeline de 7 fases" | 🟢 Baja | Actualizar descripción en `opencode.json` |
| R3 | Subagent names inconsistentes entre `ael.md` y `opencode.json` | 🟡 Media | Documentado como deuda en PR-SDL-2 (H-01). No bloquea. |
| R4 | Usuario pierde capacidad de invocar AEL directamente sin SDL | 🟢 Baja | Es el comportamiento deseado por la arquitectura PLAN → BUILD. |
| R5 | SDL debe producir Execution Plan válido antes de delegar a AEL | 🟢 Baja | Ya es requisito del contrato PLAN (PR-SDL-3A). |
| R6 | El `ael` prompt actual tiene `mode: primary` en frontmatter | 🟢 Baja | Se actualizará a `mode: subagent` cuando se implemente el cambio. |

---

## 4. Dependencias

### Dependencias del modo AEL

| Componente | Dependencia | Tipo |
|-----------|-------------|------|
| SDL (`strategic-director.md`) | `task: { "ael": "allow" }` | Referencia por ID — funciona con cualquier `mode` |
| `ael.md` frontmatter | `mode: primary` | Debe cambiarse a `subagent` |
| `opencode.json` entry `ael` | Agent ID `ael` | Debe preservarse (SDL lo referencia) |
| `opencode.json` subagentes | Entradas independientes | Sin dependencia del mode de `ael` |

### Dependencia crítica

La única dependencia real es que el agente con ID `ael` exista en `opencode.json`. El `mode` de ese agente no afecta:

- La capacidad del SDL de invocarlo via `task`
- La capacidad de `ael` de invocar subagentes via `task`
- La ejecución de cualquiera de los 6 subagentes

**Conclusión:** No hay dependencias que impidan cambiar `ael.mode` de `"primary"` a `"subagent"`.

---

## 5. Viabilidad de eliminar AEL como modo

### Decisión técnica

**VIABLE** — sin modificar la arquitectura, sin cambiar el pipeline, sin afectar capacidades existentes.

### Cambios requeridos

| Archivo | Cambio | Impacto |
|---------|--------|---------|
| `opencode.json` | `ael.mode`: `"primary"` → `"subagent"` | AEL deja de aparecer como modo seleccionable |
| `.opencode/agents/ael.md` | `mode`: `primary` → `subagent` | Consistencia con opencode.json |

### Lo que NO cambia

- `default_agent` sigue siendo `strategic-director`
- SDL sigue teniendo `task: { "ael": "allow" }`
- AEL sigue teniendo `task` a sus 6 subagentes
- Subagentes siguen siendo invocables
- El contenido del prompt de AEL no cambia
- La arquitectura PLAN → BUILD no se modifica

### Lo que cambia para el usuario

- El modo "AEL" ya no aparece en la lista de modos seleccionables
- BUILD se inicia automáticamente cuando SDL delega a AEL
- El usuario ve AEL como un subagente invocado (igual que ve ael-explore, ael-implementer, etc.)

---

## 6. Viabilidad de Execution Visibility

### Información ya disponible en el arnés

| Dato | Origen | ¿Consume tokens? |
|------|--------|-----------------|
| Agente activo | UI de OpenCode (agente actual) | No — es metadata de la sesión |
| Subagente invocado | `task` en opencode.json | No — es mecánica del arnés |
| Herramienta ejecutándose | Tool calls (bash, edit, read, etc.) | No — es UI del arnés |
| Resultado de tool | Output de la herramienta | No — es respuesta del arnés |
| Error de ejecución | Stack trace / error message | No — es UI del arnés |
| Finalización de tarea | Tool result recibido | No — es UI del arnés |

### ¿Puede mostrarse en la UI sin consumir tokens?

**SÍ.** Toda la información listada arriba es producida por el arnés (OpenCode), no por el LLM. El agente actual, las invocaciones a subagentes, las tool calls, y sus resultados son eventos del arnés que OpenCode ya renderiza en la UI.

### Limitaciones actuales

- No hay un "execution status" explícito (IN PROGRESS / COMPLETED) más allá del contexto conversacional.
- No hay un contador de tareas completadas vs pendientes.
- El estado del subagente (ejecutándose / terminado) se infiere de la conversación, no se muestra explícitamente.

---

## 7. Propuesta mínima de Execution Visibility

### Elementos a mostrar

| Elemento | Fuente | ¿Requiere implementación? |
|----------|--------|--------------------------|
| **Agente activo** | `opencode.json` agent ID | No — ya se muestra en OpenCode |
| **Tarea en ejecución** | `task` delegado a subagente | Depende de la UI del harnés |
| **Estado** (IN PROGRESS / COMPLETED) | Tool call + resultado recibido | Depende de la UI del harnés |
| **Completado** | Tool result recibido exitosamente | Depende de la UI del harnés |

### Formato propuesto

```
[PLAN] Strategic Director analizando...
  ↓ Recommendation + Execution Plan
[BUILD] AEL ejecutando...
  ├── ael-explore: IN PROGRESS
  ├── ael-explore: COMPLETED
  ├── ael-implementer: IN PROGRESS
  ├── ael-implementer: COMPLETED
  └── BUILD: COMPLETED
[PLAN] Strategic Director evaluando resultados...
```

### Lo que NO se muestra

- Razonamiento interno de SDL o AEL
- Chain of thought
- Prompts internos
- Arbitraje entre modelos
- Detalles de implementación del arnés

### Nota sobre implementación

Esta visibilidad depende de la UI de OpenCode, no de la configuración del proyecto. El proyecto puede:

1. Definir en `opencode.json` los agentes y subagentes (ya hecho).
2. Documentar el flujo esperado (MISSION_PHASE_ARCHITECTURE.md, MISSION_CLOSURE_CONTRACT.md).
3. La renderización de "agente activo → subagente → estado" es responsabilidad del harnés.

---

## 8. Estimación de impacto

| Dimensión | Impacto | Detalle |
|-----------|---------|---------|
| **Arquitectura PLAN → BUILD** | ✅ Sin cambio | AEL ya es el motor de BUILD. Solo se alinea su visibilidad. |
| **Pipeline de ejecución** | ✅ Sin cambio | SDL → task → AEL → subagentes. Mismo flujo. |
| **Consumo de tokens** | ✅ Sin aumento | Toda la info de visibilidad es metadata del arnés. |
| **Configuración del arnés** | 🟡 2 líneas | `opencode.json` y `ael.md`: cambiar `mode`. |
| **Interfaz de usuario** | 🟡 Depende de OpenCode | El harnés decide cómo renderizar agentes y subagentes. |
| **Experiencia de usuario** | 🟢 Positiva | Un solo modo (PLAN). BUILD ocurre automáticamente. |

---

## 9. Recomendación

### Veredicto: ✅ IMPLEMENTABLE

La eliminación de AEL como modo visible es **técnicamente viable** sin modificar la arquitectura, el pipeline, ni las capacidades existentes.

### Pasos para implementar

1. En `opencode.json`, cambiar `ael.mode` de `"primary"` a `"subagent"`.
2. En `.opencode/agents/ael.md`, cambiar el frontmatter `mode` de `primary` a `subagent`.
3. Opcional: actualizar `ael.description` en `opencode.json` (actualmente dice "orquesta pipeline de 7 fases").
4. Opcional: corregir `instructions` en `opencode.json` (referencia `ael/AGENTS.md` inexistente).

### Lo que NO debe hacerse en esta implementación

- No modificar el prompt de AEL (ya refleja el rol BUILD correctamente desde PR-SDL-3A).
- No modificar el prompt de SDL (ya tiene el bloque de cierre obligatorio desde PR-SDL-3A).
- No modificar subagentes.
- No modificar permisos.
- No modificar la arquitectura documentada.

### Execution Visibility

La visibilidad de ejecución depende del harnés (OpenCode), no de la configuración del proyecto. El proyecto ya define la estructura correcta de agentes y subagentes. La renderización de "agente activo → tarea → estado" es responsabilidad de OpenCode.

---

*Auditoría completada el 2026-07-19. Sin modificaciones al código, sin cambios arquitectónicos, sin aumento de consumo de tokens.*
