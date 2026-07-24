# ARNÉS Framework — Cognitive Invocation Layer v1.0

> **Nivel:** Arquitectónico (Nivel 1)
> **Versión:** 1.0
> **Fecha:** 2026-07-23
> **Estado:** ACTIVE
> **Deriva de:** `COGNITIVE_ARCHITECTURE.md` §1-2, F-ADR-004 (ARNÉS como Orquestador), Auditoría PRIMARY MODES vs COGNITIVE ENGINES (R-02, R-03)
>
> Este documento define la capa que conecta Primary Modes con Cognitive Engines.
> Establece formalmente la separación entre quién invoca y qué es invocado.

---

## 1. Purpose

La Cognitive Invocation Layer (CIL) es la capa arquitectónica que resuelve la pregunta:
**¿quién puede invocar qué capacidad cognitiva?**

Su propósito es garantizar que:

1. **Ningún Primary Mode contiene Cognitive Engines.** Los modos son puntos de entrada del usuario. No alojan, poseen ni implementan lógica cognitiva.
2. **Ningún Cognitive Engine pertenece a un Primary Mode.** Los motores son capacidades independientes que pueden ser invocadas por cualquier modo autorizado.
3. **La autorización es explícita y trazable.** Cada invocación cruza un contrato formal: entrada, salida, modo autorizado.

La CIL no es una implementación concreta. Es una especificación arquitectónica que toda implementación del framework debe materializar en su plataforma (ej. `opencode.json` define permisos `task` que implementan la CIL en el ecosistema OpenCode).

---

## 2. Concepts

### 2.1 Primary Mode

Un **Primary Mode** es un punto de entrada del usuario al ARNÉS Framework.

| Propiedad | Definición |
|-----------|------------|
| **Visible al usuario** | El usuario selecciona un modo al iniciar una interacción con el framework. |
| **Sin lógica cognitiva** | Un Primary Mode no contiene lógica de planificación, ejecución ni razonamiento. |
| **Delegador** | Su función es interpretar la intención del usuario, seleccionar el Cognitive Engine apropiado y delegar. |
| **Pertenece a la plataforma** | Los Primary Modes son construcciones de la plataforma que implementa ARNÉS (ej. OpenCode), no del framework en sí. |

**Primary Modes actuales:**

| Modo | Función | Cognitive Engines que puede invocar |
|------|---------|-------------------------------------|
| **ARNÉS** | Orquestador meta-framework. Clasifica misiones y gobierna el ciclo de vida. | PLAN, BUILD (actual). Futuro: SDL, LIGHT_PLANNER, AEL directos (R-04). |
| **PLAN** | Entry point de planificación. Recibe el DecisionPackage y delega al Cognitive Engine de planificación. | SDL, LIGHT_PLANNER |
| **BUILD** | Entry point de ejecución. Recibe el ExecutionPlan y delega la coordinación operacional en AMC. | AEL (dominio de ejecución) |

### 2.2 Cognitive Engine

Un **Cognitive Engine** es una capacidad cognitiva independiente del ARNÉS Framework.

| Propiedad | Definición |
|-----------|------------|
| **Independiente** | No pertenece estructuralmente a ningún Primary Mode. Existe como agente o componente autónomo. |
| **Invocable** | Puede ser invocado por Primary Modes autorizados a través de la CIL. |
| **Contrato explícito** | Define entrada, salida y garantías. El Primary Mode invocante no necesita conocer su implementación interna. |
| **Intercambiable** | Motores que producen outputs del mismo tipo (ej. ExecutionPlan) son intercambiables. BUILD no distingue si el plan fue producido por SDL o LIGHT_PLANNER. |

**Cognitive Engines actuales:**

| Motor | Función cognitiva | Invocado por | Output |
|-------|-------------------|-------------|--------|
| **SDL** | Planificación estratégica completa (7 etapas, DEEP) | PLAN | ExecutionPlan + Recommendation + Decision Status + Engineering Opinion |
| **LIGHT_PLANNER** | Planificación estratégica simplificada (STANDARD/SHALLOW) | PLAN | ExecutionPlan |
| **AEL** | Ejecución operacional (dominio cognitivo) | ARNÉS, BUILD | ExecutionReport (producido vía AMC) |

### 2.3 Cognitive Invocation Layer

La **Cognitive Invocation Layer** es la capa lógica que:

1. **Recibe** solicitudes de invocación desde Primary Modes.
2. **Verifica** que el modo está autorizado para invocar el motor solicitado.
3. **Traduce** la invocación en la llamada concreta de la plataforma (ej. `task(sdl)` en OpenCode).
4. **Garantiza** que la entrada y salida del motor respetan el contrato definido.

```
Primary Mode
        │
        │  authorized invocation
        ↓
───────────────────────────────────────────────
          Cognitive Invocation Layer
───────────────────────────────────────────────
        │
        │  engine contract
        ↓
Cognitive Engine
```

La CIL es un concepto arquitectónico. Su implementación concreta depende de la plataforma:
- En **OpenCode**, se materializa en el sistema de permisos `task` definido en `opencode.json`.
- En **otras plataformas**, podría ser un dispatcher, un bus de mensajes o un registry de engines.

---

## 3. Authorization Matrix

La matriz de autorización define qué Primary Mode puede invocar qué Cognitive Engine. Esta matriz es normativa: una implementación que permita invocaciones no autorizadas viola la CIL.

### 3.1 Matriz vigente (v1.1 — R-04A habilitado)

| Primary Mode | SDL | LIGHT_PLANNER | AEL |
|-------------|:---:|:---:|:---:|
| **ARNÉS** | ✅ directo | ✅ directo | — (indirecto vía BUILD) |
| **PLAN** | ✅ directo | ✅ directo | ❌ |
| **BUILD** | ❌ | ❌ | ✅ directo |

**Nota sobre ARNÉS:** R-04 completo. ARNÉS tiene acceso directo a todos los dominios cognitivos: SDL y LIGHT_PLANNER para planificación, y AEL (vía AMC) para ejecución. La matriz de autorización es definitiva.

### 3.2 Matriz futura (R-04, planificado)

| Primary Mode | SDL | LIGHT_PLANNER | AEL |
|-------------|-----|---------------|-----|
| **ARNÉS** | ✅ directo | ✅ directo | ✅ directo (vía AMC) |
| **PLAN** | ✅ directo | ✅ directo | ❌ |
| **BUILD** | ❌ | ❌ | ✅ directo |

### 3.3 Implementación en OpenCode

La matriz se implementa mediante permisos `task` en `opencode.json`:

```json
// ARNÉS puede invocar PLAN, BUILD, y Cognitive Engines (R-04A)
"arnes": {
  "task": { "plan": "allow", "build": "allow", "sdl": "allow", "light-planner": "allow" }
}

// PLAN puede invocar SDL y LIGHT_PLANNER
"plan": {
  "task": { "sdl": "allow", "light-planner": "allow" }
}

// BUILD delega coordinación operacional a AMC
"build": {
  "task": { "amc": "allow" }
}

// AMC coordina las capacidades AEL
"amc": {
```

---

## 4. Invocation Contract

Cada invocación a través de la CIL sigue un contrato estructurado.

### 4.1 Estructura del contrato

| Elemento | Descripción |
|----------|-------------|
| **Invocador** | Primary Mode que solicita la capacidad cognitiva. |
| **Motor** | Cognitive Engine que recibe la invocación. |
| **Entrada** | Datos estructurados que el motor necesita para operar (DecisionPackage, Product Context, solicitud del usuario). |
| **Salida** | Resultado estructurado que el motor produce (ExecutionPlan, ExecutionReport). |
| **Garantías** | Lo que el motor garantiza al completar (ej. "el ExecutionPlan respeta todos los invariantes"). |

### 4.2 Contratos vigentes

#### PLAN → SDL

| Elemento | Valor |
|----------|-------|
| **Invocador** | PLAN (Primary Mode de planificación) |
| **Motor** | SDL (Cognitive Engine de planificación DEEP) |
| **Entrada** | DecisionPackage v2.2 + Product Context + Mission Request |
| **Salida** | ExecutionPlan (JSON) + Recommendation + Decision Status + Engineering Opinion |
| **Garantías** | Plan verificado (VERIFY checklist), trazable, respeta invariantes |

#### PLAN → LIGHT_PLANNER

| Elemento | Valor |
|----------|-------|
| **Invocador** | PLAN |
| **Motor** | LIGHT_PLANNER (Cognitive Engine de planificación STANDARD/SHALLOW) |
| **Entrada** | DecisionPackage v2.2 + Product Context |
| **Salida** | ExecutionPlan (JSON, mismo formato que SDL) |
| **Garantías** | Plan accionable por BUILD sin reinterpretación. Si la misión excede su capacidad, escala internamente a SDL. |

#### ARNÉS / BUILD → AEL (vía AMC)

| Elemento | Valor |
|----------|-------|
| **Invocador** | ARNÉS o BUILD (Primary Modes) |
| **Dominio** | AEL (dominio de ejecución operacional) |
| **Coordinador** | AMC (AEL Mission Coordinator) |
| **Entrada** | ExecutionPlan aprobado + Runtime Profile |
| **Salida** | ExecutionReport con evidencia verificable |
| **Garantías** | Validación de invariantes (I1-I6), contratos respetados, conocimiento preservado |

---

> **Dependencia de runtime:** Esta cadena de delegación (`BUILD → AMC`) requiere `subagent_depth >= 2` configurado en `opencode.json`. Ver [Runtime Profile Contract](RUNTIME_PROFILE_CONTRACT.md) para más detalles.

## 5. Governance

### 5.1 Modificación de la matriz

Agregar, modificar o revocar una entrada en la matriz de autorización requiere:

1. **Framework ADR (Nivel 1)** documentando:
   - Qué relación se modifica (modo → motor).
   - Justificación (qué necesidad resuelve).
   - Análisis de impacto (qué otros motores o modos se ven afectados).
2. **Revisión del SDL** para validar coherencia arquitectónica.
3. **Implementación en plataforma** (ej. actualizar `opencode.json` permisos `task`).

### 5.2 Registro de nuevos motores

Para registrar un nuevo Cognitive Engine en la CIL:

1. El motor debe tener un contrato definido (entrada, salida, garantías).
2. Debe definirse qué Primary Modes pueden invocarlo.
3. Si produce el mismo tipo de output que un motor existente (ej. ExecutionPlan), debe documentarse como intercambiable.
4. La plataforma debe implementar el mecanismo de invocación correspondiente.

### 5.3 Relación con R-01

Este documento (CIL v1.0) establece la separación conceptual entre Primary Modes y Cognitive Engines. El trabajo de renombrado masivo en la especificación del framework (R-01: reemplazar "PLAN" y "BUILD" como nombres de planos cognitivos por "Estratégico" y "Operacional") depende de esta formalización. La CIL provee el vocabulario preciso para que R-01 pueda ejecutarse sin ambigüedad.

---

## 6. Relación con otros documentos

| Documento | Relación |
|-----------|----------|
| `ARNES_CONSTITUTION.md` | Los principios P2 y el invariante F1 deben interpretarse a la luz de la CIL: la separación cognitiva se implementa mediante la invocación de Cognitive Engines a través de Primary Modes. |
| `COGNITIVE_ARCHITECTURE.md` | El Mission Analyzer y el Director son conceptos abstractos. Su implementación concreta son los Cognitive Engines (SDL/LP y AEL), invocados desde Primary Modes (PLAN y BUILD) a través de la CIL. |
| `FRAMEWORK_IMPLEMENTATION_MODEL.md` | La CIL es parte de la especificación del framework. Su implementación en una plataforma concreta (ej. OpenCode) es responsabilidad de la capa de implementación. |
| `opencode.json` | Implementación concreta de la CIL en el ecosistema OpenCode. Los permisos `task` materializan la matriz de autorización. |
| `GOVERNANCE.md` | La CIL es un documento de Nivel 1. Cambios en la matriz de autorización requieren F-ADR. |

---

> *Versión 1.0. Documento de Nivel 1. Formaliza la capa que conecta Primary Modes con Cognitive Engines. Establece que los modos no contienen motores — los invocan. Modificable mediante F-ADR con revisión del SDL.*
