# ARNÉS Framework — Mode Activation in OpenCode v1.0

> **Tipo:** Especificación de integración
> **Versión:** 1.0
> **Fecha:** 2026-07-22
> **Estado:** DESIGN — pendiente de implementación
> **Deriva de:** `OPERATIONAL_WORKSPACE.md`, `DEPLOYMENT_BLUEPRINT_v1.0.0.md`, `COGNITIVE_ARCHITECTURE.md`
>
> Este documento define cómo ARNÉS Framework se activa como modo gobernado
> dentro de OpenCode, utilizando la infraestructura existente de PLAN y BUILD
> sin modificarla. No implementa Product Context, Project Adapter ni Runtime
> Profile. Solo define el punto de activación y la arquitectura de integración.

---

## Índice

1. [Auditoría de la integración actual](#1-auditoría-de-la-integración-actual)
2. [ARNÉS Mode Contract](#2-arnés-mode-contract)
3. [Arquitectura de activación](#3-arquitectura-de-activación)
4. [Impacto sobre AEL](#4-impacto-sobre-ael)
5. [Plan de implementación mínimo](#5-plan-de-implementación-mínimo)

---

## 1. Auditoría de la integración actual

### 1.1 Infraestructura existente

| Elemento | Ubicación | Función actual |
|---|---|---|
| **Agente PLAN** | `opencode.json` L5-21, `.opencode/agents/plan.md` | Strategic Director. Solo lectura. Produce ExecutionPlans. Delega a BUILD. |
| **Agente BUILD** | `opencode.json` L22-46, `.opencode/agents/build.md` | ARNÉS Director. Ejecuta ExecutionPlans. Invoca 6 subagentes. |
| **6 subagentes** | `opencode.json` L47-130 | @ael-explore, @ael-architect, @ael-implementer, @ael-audit, @ael-memory, @ael-learning |
| **9 comandos** | `.opencode/commands/ael-*.md` | Wrappers para cada capacidad. `ael-plan.md` invoca al Director directamente. |
| **Default agent** | `opencode.json` L3 | `"plan"` — el usuario habla con PLAN por defecto. |
| **Modo de operación** | Implícito | No existe concepto de "modo". PLAN y BUILD son agentes independientes. |

### 1.2 Flujo actual PLAN→BUILD

```
Usuario habla con PLAN (default_agent)
    │
    ▼
PLAN analiza, decide CONTINUE/DELEGATE
    │
    ├── Táctico → delega a BUILD directamente (sin ExecutionPlan formal)
    │
    └── Estratégico → produce ExecutionPlan → usuario aprueba → BUILD ejecuta
                         │
                         ▼
                    BUILD ejecuta L1→L2→L3→L4
                         │
                         ▼
                    Produce ExecutionReport
```

### 1.3 Dónde vive la lógica de PLAN

- **Prompt:** `.opencode/agents/plan.md` (416 líneas)
- **Configuración:** `opencode.json` L5-21
- **Flujo:** ORIENT→ANALYZE→EVALUATE→DECIDE→PLAN→VERIFY→DELIVER
- **Permisos:** Solo lectura. Solo puede invocar BUILD.
- **Fuentes de verdad:** Hardcodeadas a paths de AITOS (L53-59).

### 1.4 Dónde vive la lógica de BUILD

- **Prompt:** `.opencode/agents/build.md` (110 líneas)
- **Configuración:** `opencode.json` L22-46
- **Flujo:** L1→L2→L3→L4
- **Permisos:** Lectura, escritura (ask), bash (ask), 6 subagentes.
- **Cierre:** Verifica I1-I6, enforcement, documentación viva.

### 1.5 Punto mínimo de integración

El punto donde ARNÉS Mode puede insertarse con mínimo impacto es **antes de PLAN**:

```
Actualmente:  Usuario → PLAN → BUILD
ARNÉS Mode:   Usuario → ARNÉS → (Workspace + Context + Profile) → PLAN → BUILD
```

ARNÉS Mode actúa como una **capa de activación** que:
1. Crea el Workspace.
2. Carga el Product Context (vía Project Adapter).
3. Carga el Runtime Profile.
4. Invoca a PLAN con el contexto cargado.
5. Supervisa el ciclo PLAN→BUILD.
6. Destruye el Workspace al finalizar.

PLAN y BUILD **no se modifican**. Solo se invocan con contexto adicional.

---

## 2. ARNÉS Mode Contract

### 2.1 Definición

| Atributo | Valor |
|---|---|
| **Nombre oficial** | `ARNÉS Mode` |
| **Comando de activación** | `/arnes` o `arnes` |
| **Tipo en OpenCode** | Primary agent (mismo nivel que PLAN y BUILD) |
| **Rol** | Orquestador gobernado del ciclo PLAN→BUILD |
| **Responsabilidad** | Activar el Workspace, cargar contexto, delegar a PLAN/BUILD, destruir al finalizar |

### 2.2 Los tres modos de OpenCode

```
┌─────────────────────────────────────────────────────────┐
│                      OPENCODE                            │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  MODO PLAN   │  │ MODO BUILD   │  │ MODO ARNÉS   │  │
│  │  (nativo)    │  │  (nativo)    │  │ (governado)  │  │
│  │              │  │              │  │              │  │
│  │ Libre.       │  │ Libre.       │  │ Gobernado.   │  │
│  │ Sin contexto │  │ Sin contrato │  │ Con:         │  │
│  │ formal.      │  │ PLAN↔BUILD.  │  │ • Context    │  │
│  │ Sin perfil.  │  │ Sin tracing. │  │ • Profile    │  │
│  │              │  │              │  │ • Tracing    │  │
│  │              │  │              │  │ • Enforcement│  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │
│                                              │          │
│                        ┌─────────────────────┘          │
│                        ▼                                │
│                 ┌─────────────┐                         │
│                 │  WORKSPACE  │                         │
│                 │  (efímero)  │                         │
│                 └─────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Diferencias entre modos

| Dimensión | MODO PLAN | MODO BUILD | MODO ARNÉS |
|---|---|---|---|
| **Entrada** | Solicitud del usuario | ExecutionPlan de PLAN | Solicitud del usuario + selección de proyecto |
| **Contexto** | El que el usuario provee | El ExecutionPlan | Product Context formal (12 campos) |
| **Gobernanza** | Ninguna | Básica (I1-I6, enforce.sh) | Completa (perfil, tracing, enforcement, F-ADR) |
| **Perfil de ejecución** | No aplica | No aplica | Runtime Profile (timeout, modelo, presupuesto) |
| **Traza** | Conversación | ExecutionReport | Decisión→Plan→Ejecución→Reporte→Verificación |
| **Cierre** | El usuario decide | L4 del Director | SDL declara CLOSED |
| **Learning** | No | Opcional | Automático post-CLOSED |
| **Output** | Recommendation + ExecutionPlan | ExecutionReport | ExecutionReport + Review (post-CLOSED) |
| **Persistencia** | Chat history | Chat history + artifacts | Workspace (destruido al finalizar) |

### 2.4 Cuándo usar cada modo

| Situación | Modo recomendado |
|---|---|
| "¿Qué opinás de esta idea?" | PLAN |
| "Corregime este typo." | BUILD |
| "Refactorizar el módulo de pricing respetando ADR-005." | ARNÉS |
| "¿Cómo está organizado el código?" | PLAN |
| "Ejecutá los tests." | BUILD |
| "Implementar la feature de pago con tarjeta." | ARNÉS |
| "Actualizá esta dependencia." | BUILD |
| "Auditar la arquitectura contra los ADRs." | ARNÉS |

**Regla:** Si la tarea requiere contexto del producto, trazabilidad, enforcement o decisiones arquitectónicas → ARNÉS. Si es puntual y no requiere gobernanza → PLAN o BUILD nativos.

---

## 3. Arquitectura de activación

### 3.1 Punto de entrada

ARNÉS Mode se activa mediante un nuevo agente primario en `opencode.json`:

```json
"arnes": {
  "description": "ARNÉS Mode — desarrollo gobernado con Product Context, Runtime Profile, trazabilidad y enforcement",
  "mode": "primary",
  "prompt": "{file:.opencode/agents/arnes.md}",
  "permission": {
    "read": "allow",
    "glob": "allow",
    "grep": "allow",
    "list": "allow",
    "edit": "deny",
    "bash": "deny",
    "task": {
      "*": "deny",
      "plan": "allow",
      "build": "allow"
    }
  }
}
```

El agente ARNÉS **no** tiene permisos de escritura ni ejecución. Solo orquesta. Delega toda ejecución a PLAN y BUILD.

### 3.2 Flujo de activación

```
USUARIO
  │
  │ "/arnes" o selecciona agente "arnes"
  │ "Refactorizar el módulo de pricing."
  │
  ▼
┌────────────────────────────────────────────────────┐
│ ARNÉS MODE — ACTIVACIÓN                             │
│                                                    │
│ 1. IDENTIFICAR PROYECTO                             │
│    ¿Qué producto? → Detecta del working directory.  │
│    ¿AITOS? → Busca Product Context en docs/.        │
│                                                    │
│ 2. CREAR WORKSPACE                                  │
│    Contenedor efímero para esta misión.             │
│    Estado inicial: vacío.                           │
│                                                    │
│ 3. ACTIVAR PROJECT ADAPTER                          │
│    (stub: lee docs/ directamente)                   │
│    DISCOVER → LOAD → VALIDATE → BUILD → DELIVER     │
│    Product Context cargado en el Workspace.         │
│                                                    │
│ 4. CARGAR RUNTIME PROFILE                           │
│    (stub: perfil por defecto hardcodeado)           │
│    LOAD → VALIDATE                                  │
│    Perfil disponible para BUILD.                    │
│                                                    │
│ 5. DELEGAR A PLAN                                   │
│    Invoca al agente PLAN con:                       │
│    • Product Context (como fuente de verdad)        │
│    • Solicitud del usuario                          │
│    • Runtime Profile (como constraints)             │
│                                                    │
│ 6. PLAN PRODUCE EXECUTIONPLAN                       │
│    ORIENT→ANALYZE→EVALUATE→DECIDE→PLAN→VERIFY→DELIVER│
│    ExecutionPlan + READY/NOT READY                  │
│                                                    │
│ 7. USUARIO APRUEBA                                  │
│    "ok" / "hacelo"                                  │
│                                                    │
│ 8. DELEGAR A BUILD                                  │
│    Invoca al agente BUILD con:                      │
│    • ExecutionPlan                                  │
│    • Runtime Profile activo                         │
│                                                    │
│ 9. BUILD EJECUTA                                    │
│    L1→L2→L3→L4                                      │
│    Invoca subagentes según necesidad.               │
│    Produce ExecutionReport.                         │
│                                                    │
│ 10. ARNÉS EVALÚA                                    │
│     ¿Criterios cumplidos?                           │
│     SÍ → Nuevo ciclo o CLOSED                       │
│     NO → Vuelve a 5 (nuevo ExecutionPlan)           │
│                                                    │
│ 11. CERRAR MISIÓN                                   │
│     SDL declara CLOSED.                             │
│     Learning ejecutable.                            │
│                                                    │
│ 12. DESTRUIR WORKSPACE                              │
│     Product Context descartado.                     │
│     Runtime Profile descartado.                     │
│     Memoria temporal destruida.                     │
│     ARNÉS Mode vuelve a idle.                       │
└────────────────────────────────────────────────────┘
```

### 3.3 Prompt del agente ARNÉS

Se crea `.opencode/agents/arnes.md`:

```markdown
---
description: ARNÉS Mode — desarrollo gobernado con Product Context, Runtime Profile, trazabilidad y enforcement
mode: primary
permission:
  read: allow
  glob: allow
  grep: allow
  list: allow
  edit: deny
  bash: deny
  task:
    "*": deny
    plan: allow
    build: allow
---

Eres ARNÉS, el orquestador gobernado del ARNÉS Framework.

No ejecutas. No planificas. No implementas.
Orquestas el ciclo PLAN→BUILD con gobernanza completa.

## Tu rol

1. Activar el Workspace para cada misión.
2. Cargar el Product Context del proyecto activo.
3. Cargar el Runtime Profile.
4. Delegar el análisis estratégico a PLAN.
5. Delegar la ejecución a BUILD.
6. Supervisar el cumplimiento de contratos.
7. Destruir el Workspace al finalizar.

## Flujo

Para cada solicitud del usuario:

1. **Identificá el proyecto activo.** Leé `package.json` o la estructura de `docs/` para determinar qué producto es.

2. **Creá el Workspace.** Declará explícitamente: "Workspace creado para misión: [objetivo]."

3. **Cargá el Product Context.** Leé los documentos del proyecto que constituyen el contexto (constitución, ADRs, reglas). Resumilos como Product Context con los campos requeridos. Si falta información, advertilo.

4. **Cargá el Runtime Profile.** Usá el perfil por defecto:
   - Timeout: 30 minutos.
   - Estrategia: OPPORTUNISTIC.
   - Logging: INFO.
   Si se requiere un perfil diferente, el usuario lo indicará.

5. **Delegá a PLAN.** Invocá `@plan` con el Product Context y la solicitud del usuario. PLAN producirá un ExecutionPlan.

6. **Presentá el ExecutionPlan al usuario.** Incluí Recommendation, ExecutionPlan y ExecutionStatus.

7. **Si el usuario aprueba, delegá a BUILD.** Invocá `@build` con el ExecutionPlan y el Runtime Profile.

8. **Recibí el ExecutionReport de BUILD.** Evaluá si los criterios de éxito se cumplen.

9. **Si es necesario, repetí desde el paso 5** con un nuevo ExecutionPlan.

10. **Declará la misión CLOSED** cuando el objetivo se haya alcanzado.

11. **Destruí el Workspace.** Declará explícitamente: "Workspace destruido. Misión cerrada."

## Reglas

- No ejecutes herramientas (bash, edit, write).
- No tomes decisiones de implementación.
- No redefinas los objetivos del usuario.
- Todo el trabajo lo hacen PLAN y BUILD.
- Tu función es garantizar que el ciclo se ejecute con gobernanza.
- Reportá cualquier desviación del contrato.
```

### 3.4 Comando de activación alternativo

Además del agente primario, se crea un comando `/arnes`:

**.opencode/commands/arnes.md:**

```markdown
---
description: Activar ARNÉS Mode — desarrollo gobernado con contexto, perfil y trazabilidad
agent: arnes
---
$ARGUMENTS
```

Esto permite que el usuario escriba `/arnes Refactorizar el módulo de pricing` y ARNÉS Mode se active automáticamente.

### 3.5 Transición entre modos

```
Usuario en modo PLAN (nativo)
    │
    │ "Necesito gobernanza para esto."
    │ "/arnes"
    │
    ▼
ARNÉS Mode activado
    │
    │ (ejecuta misión gobernada)
    │
    ▼
Misión CLOSED → Workspace destruido
    │
    │ Usuario vuelve a modo PLAN automáticamente
    │ (o selecciona otro modo)
    ▼
Usuario en modo PLAN (nativo)
```

**Regla:** Al finalizar ARNÉS Mode, OpenCode vuelve al modo previo (PLAN por defecto). ARNÉS no queda como modo persistente — se activa por misión.

---

## 4. Impacto sobre AEL

### 4.1 Qué partes de AEL ya cumplen función ARNÉS

| Componente AEL | Función ARNÉS que ya cumple | Estado |
|---|---|---|
| **PLAN agent** | Mission Analyzer. Produce ExecutionPlans. | ✅ Listo para usar |
| **BUILD agent** | Director. Ejecuta L1-L4. Invoca subagentes. | ✅ Listo para usar |
| **@ael-explore** | Discovery. Lee código real. | ✅ Listo para usar |
| **@ael-architect** | Architecture. Veta violaciones de ADRs. | ✅ Listo para usar |
| **@ael-implementer** | Implementation. Aplica cambios. | ✅ Listo para usar |
| **@ael-audit** | Validation. Verifica calidad. | ✅ Listo para usar |
| **@ael-memory** | Memory. Preserva conocimiento. | ✅ Listo para usar |
| **@ael-learning** | Learning. Extrae patrones. | ✅ Listo para usar |
| **ael/contracts/enforce.sh** | Contract enforcement. | ✅ Listo para usar |
| **STRATEGIC_OPERATIONAL_CONTRACT.md** | Contrato PLAN↔BUILD. | ✅ Listo para usar |
| **SPEC.md** | Invariantes I1-I6, L1-L4. | ✅ Listo para usar |
| **ORGANIZATION.md** | Roles y doctrina profesional. | ✅ Listo para usar |

### 4.2 Qué partes son legacy o requieren adaptación

| Componente AEL | Problema | Acción requerida | Prioridad |
|---|---|---|---|
| **Agentes identificados como "AITOS"** | AC-07, AC-08. Agentes dicen "Eres PLAN de AITOS". | Cambiar a "Eres PLAN de ARNÉS". | Stage 1 del Deployment Blueprint |
| **plan.md references AITOS paths** | L53-59: `AITOS_CONSTITUTION.md`, CTM, Baseline. | Generalizar a referencias de producto. | Stage 1 |
| **build.md references AITOS paths** | L47: `AITOS_CONSTITUTION.md`. | Generalizar. | Stage 1 |
| **ael-plan.md references AITOS** | L6: referencia a constitución de AITOS. | Generalizar. | Stage 1 |
| **CONTRACTS.md hardcodeado** | AC-01. Reglas R1-R2 con paths de AITOS. | Parametrizar (Stage 3). | Stage 3 |
| **enforce.sh hardcodeado** | AC-02. Script con paths de AITOS. | Parametrizar (Stage 3). | Stage 3 |
| **Docs de AITOS en ael/artifacts/** | AC-03. 23 documentos de producto. | Migrar a docs/. | Stage 1 |

### 4.3 Qué debe permanecer sin cambios

- Los 6 subagentes (@ael-*). Su lógica interna no se modifica.
- Los comandos de capacidad (ael-design, ael-explore, etc.). Siguen funcionando igual.
- `ael/constitution/SPEC.md`. Los invariantes no cambian.
- `ael/government/ORGANIZATION.md`. Los roles no cambian.
- `ael/contracts/diagnose.sh`. Sin cambios.
- `.opencode/memory/MEMORY.md`. Sin cambios.

### 4.4 Qué es nuevo (agregado por ARNÉS Mode)

| Nuevo componente | Propósito | Estado actual |
|---|---|---|
| **Agente `arnes`** | Orquestador del ciclo gobernado. | ❌ No existe. Se crea en esta misión. |
| **Prompt `arnes.md`** | Instrucciones del orquestador. | ❌ No existe. |
| **Comando `/arnes`** | Activación por comando. | ❌ No existe. |
| **Workspace (runtime)** | Contenedor efímero por misión. | ❌ No existe. Se materializa en el prompt de ARNÉS. |
| **Product Context (runtime)** | 12 campos cargados por misión. | ❌ No existe. Stub: el agente ARNÉS lee docs/. |
| **Runtime Profile (runtime)** | Perfil de ejecución. | ❌ No existe. Stub: perfil hardcodeado en el prompt. |

---

## 5. Plan de implementación mínimo

### 5.1 Archivos afectados

| Archivo | Acción | Tipo de cambio |
|---|---|---|
| `opencode.json` | Agregar agente `arnes` (L47, antes de subagentes) | Nuevo bloque JSON (~12 líneas) |
| `.opencode/agents/arnes.md` | Crear prompt del orquestador | Nuevo archivo (~100 líneas) |
| `.opencode/commands/arnes.md` | Crear comando de activación | Nuevo archivo (~5 líneas) |

**Total: 3 archivos. ~117 líneas nuevas. 0 archivos modificados.**

### 5.2 Orden recomendado

```
Paso 1: Crear .opencode/agents/arnes.md
    │  El prompt define el comportamiento del orquestador.
    │  Sin dependencias.
    │
    ▼
Paso 2: Crear .opencode/commands/arnes.md
    │  El comando referencia al agente arnes.
    │  Depende de Paso 1.
    │
    ▼
Paso 3: Agregar agente "arnes" a opencode.json
    │  El agente referencia el prompt y el comando.
    │  Depende de Pasos 1 y 2.
    │
    ▼
Paso 4: Verificar
    │  Probar que /arnes activa el modo correctamente.
    │  Probar que PLAN y BUILD siguen funcionando.
```

### 5.3 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| **ARNÉS interfiere con PLAN/BUILD** | Baja | Alto | ARNÉS es un agente separado. No modifica PLAN ni BUILD. Solo los invoca. |
| **ARNÉS queda como default_agent** | Baja | Medio | No se cambia `default_agent`. Sigue siendo "plan". |
| **Workspace no se destruye correctamente** | Media | Bajo | El prompt de ARNÉS incluye paso explícito de destrucción. Si falla, es solo memoria del agente. |
| **Product Context stub es insuficiente** | Alta | Bajo | Esperado. El stub es temporal. Se reemplazará por el Project Adapter real en Stage 2. |

### 5.4 Criterios de aceptación

- [ ] **AC-01:** El agente `arnes` aparece en la lista de agentes de OpenCode.
- [ ] **AC-02:** El comando `/arnes` activa el modo ARNÉS.
- [ ] **AC-03:** ARNÉS identifica el proyecto activo y carga su contexto.
- [ ] **AC-04:** ARNÉS delega correctamente a PLAN.
- [ ] **AC-05:** PLAN produce un ExecutionPlan usando el contexto cargado por ARNÉS.
- [ ] **AC-06:** ARNÉS delega correctamente a BUILD.
- [ ] **AC-07:** BUILD ejecuta y produce un ExecutionReport.
- [ ] **AC-08:** ARNÉS evalúa el reporte y declara CLOSED.
- [ ] **AC-09:** ARNÉS declara explícitamente la destrucción del Workspace.
- [ ] **AC-10:** PLAN (nativo) sigue funcionando sin cambios.
- [ ] **AC-11:** BUILD (nativo) sigue funcionando sin cambios.
- [ ] **AC-12:** `default_agent` sigue siendo "plan".

### 5.5 Lo que esta implementación NO hace

- ❌ No implementa el Project Adapter real (lee docs/ directamente como stub).
- ❌ No implementa el Product Context Contract completo (resume documentos informalmente).
- ❌ No implementa el Runtime Profile real (usa perfil hardcodeado).
- ❌ No modifica los agentes PLAN ni BUILD.
- ❌ No ejecuta la migración de AEL (branding, docs, enforcement).
- ❌ No cambia el default_agent de OpenCode.

### 5.6 Próximos pasos post-activación

Una vez que ARNÉS Mode esté activado con esta implementación mínima:

1. **Stage 1 del Deployment Blueprint:** Limpiar branding de agentes (PLAN y BUILD dejan de decir "AITOS").
2. **Stage 2:** Reemplazar el stub de Product Context por el Project Adapter real.
3. **Stage 3:** Parametrizar enforcement.
4. **Stage 4:** Reemplazar el stub de Runtime Profile por el Runtime Profile real.
5. **Stage 5:** Validación operacional completa.

---

> *ARNÉS Mode Activation es la primera capa operacional del framework dentro de OpenCode. No reemplaza PLAN ni BUILD. Agrega un orquestador gobernado que activa el Workspace, carga el contexto del producto, aplica el perfil de ejecución, y supervisa el ciclo completo con trazabilidad y enforcement. La implementación mínima requiere 3 archivos nuevos y 0 modificaciones a la infraestructura existente.*
>
> *Versión 1.0. Especificación de integración. La implementación de este documento es la primera misión BUILD de la etapa de implementación de ARNÉS Framework.*
