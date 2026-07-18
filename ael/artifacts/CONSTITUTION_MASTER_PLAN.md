# CONSTITUTION MASTER PLAN — Arquitectura Documental de la Constitución Cognitiva de AITOS

> **Fecha:** 2026-07-11
> **Propósito:** Definir el plano completo de la Constitución Cognitiva que gobernará TODO el proyecto.
> **Estado:** ⚪ Plan maestro — ningún documento de la constitución ha sido escrito aún.
> **Auditorías fuente:** #01 a #06 (completadas y archivadas como diagnóstico)

---

## Índice

1. [Mapa completo de la futura Constitución Cognitiva](#1-mapa-completo)
2. [Jerarquía documental](#2-jerarquía-documental)
3. [Dependencias entre documentos](#3-dependencias)
4. [Orden recomendado de escritura](#4-orden-de-escritura)
5. [Orden recomendado de aprobación](#5-orden-de-aprobación)
6. [Nivel de estabilidad esperado](#6-estabilidad)
7. [Riesgos de inconsistencias](#7-riesgos)
8. [Documentos que desaparecerán](#8-desaparecen)
9. [Documentos que cambiarán de rol](#9-cambian-de-rol)
10. [Recomendación final sobre gobierno](#10-gobierno)

---

## 1. Mapa completo de la futura Constitución Cognitiva

La Constitución Cognitiva consta de **10 documentos fundacionales**. Ninguno contiene código. Ninguno contiene implementación. Todos son puramente conceptuales.

```
CONSTITUCIÓN COGNITIVA DE AITOS
│
├── NIVEL FUNDACIONAL (estable, inmodificable sin referéndum)
│   ├── 01-CONSTITUTION.md          — Filosofía, identidad, propósito, principios
│   ├── 02-SYSTEM_VOCABULARY.md              — Glosario normativo (términos prohibidos y obsoletos)
│   └── 03-COGNITIVE_PRINCIPLES.md  — 22+ principios permanentes verificables
│
├── NIVEL ARQUITECTÓNICO (evolutivo, cambios requieren ADR)
│   ├── 04-COGNITIVE_ARCHITECTURE.md — Cómo piensa, aprende, decide, evoluciona
│   ├── 05-RESPONSIBILITY_MODEL.md   — Quién hace qué, fronteras, propiedad
│   └── 06-KNOWLEDGE_MODEL.md        — Evidence Store, Hypothesis Network, Proyección
│
├── NIVEL OPERATIVO (evolutivo, cambios requieren revisión)
│   ├── 07-DECISION_MODEL.md         — Cómo compromete, confirma, infiere, escala
│   └── 08-INVARIANTS.md             — Invariantes formales derivados de principios
│
└── NIVEL DE TRANSICIÓN (temporal, desaparece cuando la migración se completa)
    ├── 09-MIGRATION_GUIDE.md        — Cómo migrar del modelo actual al cognitivo
    └── 10-GOVERNANCE.md             — Cómo se gobierna la constitución misma
```

### Resumen de los 10 documentos

| # | Documento | Propósito | Alcance | Estabilidad |
|---|-----------|-----------|---------|-------------|
| 1 | CONSTITUTION.md | Definir QUÉ es AITOS, su identidad, sus límites, su filosofía | Todo el proyecto | **Estable** |
| 2 | SYSTEM_VOCABULARY.md | Glosario normativo con definiciones ÚNICAS de cada concepto | Todo el proyecto | **Estable** |
| 3 | COGNITIVE_PRINCIPLES.md | 22+ principios permanentes que toda decisión debe respetar | Arquitectura + decisiones | **Estable** |
| 4 | COGNITIVE_ARCHITECTURE.md | El modelo cognitivo completo: ciclo, componentes, flujo | Arquitectura | **Evolutivo** |
| 5 | RESPONSIBILITY_MODEL.md | Dueños de cada concepto, fronteras, prohibiciones | Arquitectura + contratos | **Evolutivo** |
| 6 | KNOWLEDGE_MODEL.md | Evidence Store, Hypothesis Network, Operational Projection | Conocimiento | **Evolutivo** |
| 7 | DECISION_MODEL.md | Cómo decide, compromete, confirma, infiere, escala | Decisión | **Evolutivo** |
| 8 | INVARIANTS.md | Invariantes formales y verificables | Implementación | **Evolutivo** |
| 9 | MIGRATION_GUIDE.md | Plan de transición desde el modelo actual | Proyecto | **Experimental** |
| 10 | GOVERNANCE.md | Reglas para modificar la constitución misma | Gobernanza | **Estable** |

---

## 2. Jerarquía documental

### Pirámide de autoridad

```
                            ┌─────────────┐
                            │ CONSTITUTION │  ← Fuente máxima de verdad
                            │    (01)      │    Si algo la contradice, la Constitución prevalece
                            └──────┬──────┘
                                   │
                            ┌──────┴──────┐
                            │  ONTOLOGY    │  ← Define los términos. Nadie puede usar
                            │    (02)      │    un término de forma diferente a como lo define Ontology
                            └──────┬──────┘
                                   │
                            ┌──────┴──────┐
                            │  PRINCIPLES  │  ← Reglas permanentes que ningún cambio
                            │    (03)      │    puede violar sin cambiar la Constitución
                            └──────┬──────┘
                                   │
                   ┌───────────────┼───────────────┐
                   │               │               │
            ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
            │ COGNITIVE   │ │RESPONSIBIL. │ │ KNOWLEDGE   │  ← Modelos arquitectónicos
            │ARCHITECTURE │ │  MODEL (05) │ │ MODEL (06)  │    Evolucionan pero no
            │    (04)     │ │             │ │             │    contradicen niveles superiores
            └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                   │               │               │
                   └───────────────┼───────────────┘
                                   │
                            ┌──────┴──────┐
                            │  DECISION   │  ← Cómo las decisiones emergen de los modelos
                            │  MODEL (07) │
                            └──────┬──────┘
                                   │
                            ┌──────┴──────┐
                            │ INVARIANTS   │  ← Invariantes verificables derivados
                            │    (08)      │    de los principios
                            └─────────────┘

    ┌─────────────────────────────────────────────┐
    │            MIGRATION_GUIDE (09)              │  ← Temporal. Guía la transición.
    └─────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────┐
    │            GOVERNANCE (10)                   │  ← Gobierna toda la pirámide.
    └─────────────────────────────────────────────┘
```

### Reglas de jerarquía

1. **Un documento de nivel inferior NO puede contradecir a uno de nivel superior.** Si COGNITIVE_ARCHITECTURE.md dice algo que contradice CONSTITUTION.md, CONSTITUTION.md prevalece.

2. **Un documento de nivel inferior PUEDE extender a uno de nivel superior** siempre que no lo contradiga. DECISION_MODEL.md puede detallar cómo se implementa un principio de PRINCIPLES.md, pero no puede relajarlo.

3. **SYSTEM_VOCABULARY.md es lexicográficamente superior a todos.** Si COGNITIVE_ARCHITECTURE.md usa un término de forma diferente a SYSTEM_VOCABULARY.md, SYSTEM_VOCABULARY.md prevalece y COGNITIVE_ARCHITECTURE.md debe corregirse.

4. **GOVERNANCE.md es procesalmente superior.** Define cómo se modifican los demás documentos. Ningún documento puede modificarse sin seguir el proceso que GOVERNANCE.md define.

5. **MIGRATION_GUIDE.md es temporal.** No tiene autoridad normativa. Solo describe el camino desde el estado actual al estado objetivo.

### Matriz de precedencia

| Si esto contradice a esto... | ...esto prevalece |
|------------------------------|-------------------|
| Cualquier documento | CONSTITUTION.md |
| Cualquier término mal usado | SYSTEM_VOCABULARY.md |
| Cualquier decisión | PRINCIPLES.md |
| Cualquier ADR anterior a la constitución | La constitución (si fue adoptada) |
| Cualquier ADR posterior a la constitución | El ADR (si sigue el proceso de GOVERNANCE.md) |
| Código fuente vs. constitución | El código (la implementación es la verdad última) |
| MIGRATION_GUIDE.md vs. cualquier otro | Cualquier otro |

---

## 3. Dependencias entre documentos

### Dependencias de escritura

*Un documento no puede escribirse sin que sus dependencias estén al menos en borrador.*

```
01-CONSTITUTION.md
    └── Sin dependencias (se escribe primero)
        │
02-SYSTEM_VOCABULARY.md
    └── Depende de: 01-CONSTITUTION.md (necesita la filosofía para definir términos clave)
        │
03-COGNITIVE_PRINCIPLES.md
    └── Depende de: 01-CONSTITUTION.md (los principios derivan de la filosofía)
        └── Depende de: 02-SYSTEM_VOCABULARY.md (los principios usan términos que deben estar definidos)
            │
04-COGNITIVE_ARCHITECTURE.md
    └── Depende de: 01-CONSTITUTION.md, 02-SYSTEM_VOCABULARY.md, 03-COGNITIVE_PRINCIPLES.md
        │
05-RESPONSIBILITY_MODEL.md
    └── Depende de: 02-SYSTEM_VOCABULARY.md, 04-COGNITIVE_ARCHITECTURE.md
        │
06-KNOWLEDGE_MODEL.md
    └── Depende de: 02-SYSTEM_VOCABULARY.md, 04-COGNITIVE_ARCHITECTURE.md, 05-RESPONSIBILITY_MODEL.md
        │
07-DECISION_MODEL.md
    └── Depende de: 02-SYSTEM_VOCABULARY.md, 04-COGNITIVE_ARCHITECTURE.md, 06-KNOWLEDGE_MODEL.md
        │
08-INVARIANTS.md
    └── Depende de: 03-COGNITIVE_PRINCIPLES.md (los invariantes derivan de los principios)
        └── Depende de: 07-DECISION_MODEL.md (algunos invariantes son sobre decisiones)
            │
09-MIGRATION_GUIDE.md
    └── Depende de: TODOS los anteriores (necesita el modelo destino completo para planificar la migración)
        │
10-GOVERNANCE.md
    └── Depende de: 01-CONSTITUTION.md (el gobierno deriva de la filosofía)
        └── Depende de: 02-SYSTEM_VOCABULARY.md (usa términos de gobernanza que deben estar definidos)
```

### Dependencias de aprobación

*Un documento no puede aprobarse sin que sus dependencias estén aprobadas.*

```
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10
```

La aprobación debe seguir estrictamente este orden. No se puede aprobar DECISION_MODEL.md sin que COGNITIVE_ARCHITECTURE.md esté aprobado. No se puede aprobar MIGRATION_GUIDE.md sin que TODOS los modelos destino estén aprobados.

### Dependencias de revisión futura

*Cuando un documento cambia, qué otros documentos deben revisarse.*

| Si cambia... | Revisar... |
|-------------|------------|
| 01-CONSTITUTION.md | TODOS (es el fundamento de todo) |
| 02-SYSTEM_VOCABULARY.md | TODOS (cambiar una definición afecta todos los usos) |
| 03-COGNITIVE_PRINCIPLES.md | 08-INVARIANTS.md (los invariantes derivan de principios) |
| 04-COGNITIVE_ARCHITECTURE.md | 05, 06, 07, 08 |
| 05-RESPONSIBILITY_MODEL.md | 06, 07 (cambiar dueños afecta modelos) |
| 06-KNOWLEDGE_MODEL.md | 07, 08 |
| 07-DECISION_MODEL.md | 08 |
| 08-INVARIANTS.md | Ninguno (es hoja) |
| 09-MIGRATION_GUIDE.md | Ninguno (es temporal) |
| 10-GOVERNANCE.md | Ninguno (gobierna el proceso de cambio) |

---

## 4. Orden recomendado de escritura

Cada documento debe escribirse en el orden indicado. No se puede comenzar el siguiente sin tener un borrador completo del anterior.

### Fase 1: Fundación (días 1-3)

| Paso | Documento | Tiempo estimado | Entregable |
|------|-----------|----------------|------------|
| 1 | **01-CONSTITUTION.md** | 1 día | Filosofía completa del sistema |
| 2 | **02-SYSTEM_VOCABULARY.md** | 1 día | Glosario normativo con ~50 términos |
| 3 | **03-COGNITIVE_PRINCIPLES.md** | 1 día | 22+ principios con justificación |

**Criterio de finalización de la Fase 1:** Los 3 documentos están completos y consistentes entre sí. No hay contradicciones entre la filosofía, los términos y los principios.

### Fase 2: Arquitectura (días 4-7)

| Paso | Documento | Tiempo estimado | Entregable |
|------|-----------|----------------|------------|
| 4 | **04-COGNITIVE_ARCHITECTURE.md** | 2 días | Ciclo cognitivo, componentes, flujo |
| 5 | **05-RESPONSIBILITY_MODEL.md** | 1 día | Matriz de responsabilidades y fronteras |
| 6 | **06-KNOWLEDGE_MODEL.md** | 1 día | Evidence Store, Hypothesis Network, Proyección |

**Criterio de finalización de la Fase 2:** Los 3 documentos describen consistentemente el mismo sistema desde diferentes ángulos. No hay conflictos entre "cómo piensa", "quién hace qué", y "cómo se organiza el conocimiento".

### Fase 3: Operación (días 8-9)

| Paso | Documento | Tiempo estimado | Entregable |
|------|-----------|----------------|------------|
| 7 | **07-DECISION_MODEL.md** | 1 día | Modelo completo de decisión y compromiso |
| 8 | **08-INVARIANTS.md** | 1 día | Invariantes formales derivados de principios |

**Criterio de finalización de la Fase 3:** DECISION_MODEL describe consistentemente cómo las decisiones emergen de los modelos definidos en Fase 2. INVARIANTS es una derivación lógica directa de PRINCIPLES.

### Fase 4: Cierre (día 10)

| Paso | Documento | Tiempo estimado | Entregable |
|------|-----------|----------------|------------|
| 9 | **09-MIGRATION_GUIDE.md** | 1 día | Plan de migración completo |
| 10 | **10-GOVERNANCE.md** | 0.5 día | Reglas de gobierno de la constitución |

**Criterio de finalización de la Fase 4:** MIGRATION_GUIDE describe el camino desde el estado actual (documentado en auditorías) al estado objetivo (definido en Fases 1-3). GOVERNANCE cierra el ciclo estableciendo cómo se mantiene la constitución.

---

## 5. Orden recomendado de aprobación

Cada documento requiere una aprobación formal antes de considerarse vigente. La aprobación sigue estrictamente el orden de dependencias.

### Niveles de aprobación

| Nivel | Significado | Quién aprueba |
|-------|-------------|---------------|
| **Borrador** | Escrito pero no revisado | El autor |
| **Revisado** | Revisado por pares, sin contradicciones | Stakeholder técnico (Cristian o delegado) |
| **Aprobado** | Aprobado formalmente, vigente | Cristian (fundador) |
| **Congelado** | No puede modificarse sin proceso especial | Cristian + comité |

### Secuencia de aprobación

```
01-CONSTITUTION.md
    └── APROBADO (necesario para todo lo demás)
        │
02-SYSTEM_VOCABULARY.md
    └── APROBADO (necesario para usar términos correctamente)
        │
03-COGNITIVE_PRINCIPLES.md
    └── APROBADO (necesario para diseñar arquitectura)
        │
04-COGNITIVE_ARCHITECTURE.md
    └── APROBADO
        │
05-RESPONSIBILITY_MODEL.md
    └── APROBADO
        │
06-KNOWLEDGE_MODEL.md
    └── APROBADO
        │
07-DECISION_MODEL.md
    └── APROBADO
        │
08-INVARIANTS.md
    └── APROBADO
        │
09-MIGRATION_GUIDE.md
    └── APROBADO
        │
10-GOVERNANCE.md
    └── APROBADO (último porque cierra el ciclo)
```

### Regla de aprobación

No se puede aprobar un documento de nivel N sin que todos los documentos de nivel < N estén aprobados.

---

## 6. Nivel de estabilidad esperado

Cada documento tiene un nivel de estabilidad que indica con qué frecuencia se espera que cambie.

| Nivel | Significado | Frecuencia de cambio esperada |
|-------|-------------|-------------------------------|
| **Estable** | Cambia solo por decisión fundacional | Una vez al año o menos |
| **Evolutivo** | Cambia a medida que el sistema madura | Cada 1-3 meses |
| **Experimental** | Cambia frecuentemente hasta estabilizarse | Cada 1-4 semanas |

### Estabilidad por documento

| Documento | Estabilidad | Justificación |
|-----------|-------------|---------------|
| 01-CONSTITUTION.md | **Estable** | La filosofía del sistema no cambia con cada sprint. Cambiar CONSTITUTION.md es un evento mayor. |
| 02-SYSTEM_VOCABULARY.md | **Estable** | Las definiciones deben ser roca. Cambiar una definición es caro porque afecta todos los documentos. |
| 03-COGNITIVE_PRINCIPLES.md | **Estable** | Los principios son permanentes. Se agregan, no se modifican ni eliminan. |
| 04-COGNITIVE_ARCHITECTURE.md | **Evolutivo** | El modelo cognitivo se refina a medida que se implementa. Cambios controlados por ADR. |
| 05-RESPONSIBILITY_MODEL.md | **Evolutivo** | Las responsabilidades pueden refinarse con la implementación. |
| 06-KNOWLEDGE_MODEL.md | **Evolutivo** | El modelo de conocimiento se refina con la experiencia. |
| 07-DECISION_MODEL.md | **Evolutivo** | El modelo de decisión se ajusta con casos reales. |
| 08-INVARIANTS.md | **Evolutivo** | Los invariantes se agregan a medida que se descubren casos límite. |
| 09-MIGRATION_GUIDE.md | **Experimental** | Cambia constantemente durante la migración. Se archiva cuando la migración termina. |
| 10-GOVERNANCE.md | **Estable** | El proceso de gobierno debe ser roca para que el sistema sea gobernable. |

### Mapa de estabilidad

```
ESTABLE         ──────────────── 01, 02, 03, 10
EVOLUTIVO       ──────────────── 04, 05, 06, 07, 08
EXPERIMENTAL    ──────────────── 09 (temporal)
```

---

## 7. Riesgos de inconsistencias

### Riesgos identificados

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|-----------|
| R1 | **Ontología inconsistente**: dos documentos usan el mismo término con significado diferente | Alta en Fase 1-2 | Catastrófico: toda la constitución pierde coherencia | Escribir SYSTEM_VOCABULARY.md antes que cualquier documento que use sus términos. Revisión cruzada obligatoria. |
| R2 | **Principio olvidado**: un principio importante de Auditoría #04 o #06 no se incluye en PRINCIPLES.md | Media | Alto: se descubre después, requiriendo modificación de documentos aprobados | Checklist exhaustivo contra auditorías durante la redacción de PRINCIPLES.md. |
| R3 | **Deriva de la constitución**: la implementación se aleja del modelo cognitivo sin que la constitución se actualice | Alta (es el riesgo que causó el problema actual) | Alto: el proyecto vuelve al estado de deriva conceptual | GOVERNANCE.md debe incluir revisión periódica de adherencia. Cada release debe certificar alineación. |
| R4 | **Migración incompleta**: el MIGRATION_GUIDE define un camino pero la implementación toma atajos que violan principios | Media | Alto: se reintroduce deuda conceptual | CHECKLIST de migración con verificación puntual contra PRINCIPLES.md. |
| R5 | **Congelamiento prematuro**: la constitución se vuelve tan rígida que impide evolucionar el sistema | Baja | Medio: el sistema no puede adaptarse | Los niveles "Evolutivo" permiten cambio controlado. GOVERNANCE.md define el proceso para cambiar incluso documentos estables. |
| R6 | **Multiplicación de términos**: SYSTEM_VOCABULARY.md define 50 términos pero la implementación introduce 20 más no definidos | Alta | Medio: el vocabulario del código diverge del vocabulario de la constitución | Todo término nuevo en cualquier documento debe agregarse a SYSTEM_VOCABULARY.md antes de usarse. |
| R7 | **El MIGRATION_GUIDE se vuelve permanente**: la migración nunca termina y el guide se convierte en documento normativo | Media | Medio: el sistema queda en un estado híbrido permanente | MIGRATION_GUIDE debe tener fecha de caducidad explícita. Si no se completa, se requiere una decisión fundacional. |
| R8 | **Solapamiento entre COGNITIVE_ARCHITECTURE y KNOWLEDGE_MODEL**: ambos describen la estructura del conocimiento | Alta en Fase 2 | Alto: duplicación y posible contradicción | COGNITIVE_ARCHITECTURE describe el "cómo" (procesos, ciclo). KNOWLEDGE_MODEL describe el "qué" (estructuras, almacenes). Separación explícita en sus propósitos. |

### Mapa de mitigación cruzada

```
R1 → Mitigado por: orden de escritura (Ontology primero), revisión cruzada obligatoria
R2 → Mitigado por: checklist de auditorías contra principios
R3 → Mitigado por: GOVERNANCE.md con revisión periódica
R4 → Mitigado por: checklist de migración
R5 → Mitigado por: niveles evolutivos + proceso de cambio en GOVERNANCE.md
R6 → Mitigado por: regla "todo término nuevo debe ir a Ontology primero"
R7 → Mitigado por: fecha de caducidad explícita del MIGRATION_GUIDE
R8 → Mitigado por: separación explícita de propósitos en las definiciones de cada documento
```

---

## 8. Documentos que desaparecerán

### 8.1 Documentos obsoletos (reemplazados por la constitución)

Estos documentos DEJAN de tener vigencia una vez que la constitución está aprobada. Se archivan en `docs/history/` con una nota "SUPERSEDED por Constitución Cognitiva (fecha)".

| Documento obsoleto | Reemplazado por | Razón |
|--------------------|-----------------|-------|
| `docs/SYSTEM_BIBLE.md` | **CONSTITUTION.md** | La System Bible era la constitución no-técnica. La nueva CONSTITUTION.md la reemplaza completamente. |
| `docs/ai/ARCHITECTURE_BIBLE.md` | **COGNITIVE_ARCHITECTURE.md + PRINCIPLES.md** | La Architecture Bible mezclaba principios arquitectónicos con reglas de implementación. Se divide en dos documentos de niveles diferentes. |
| `docs/ai/ARCHITECTURE_RULES.md` | **PRINCIPLES.md + INVARIANTS.md** | Las reglas se elevan a principios y se concretan como invariantes. |
| `docs/ai/INVARIANTS.md` | **INVARIANTS.md (nuevo)** | Reescrito desde cero basado en los principios, no en el modelo state-dominant. |
| `docs/ai/DECISION_TREE.md` | **DECISION_MODEL.md** | El árbol de decisión describe el flujo state-dominant. El DECISION_MODEL describe cómo decide el sistema cognitivo. |
| `docs/architecture/operational-model.md` | **KNOWLEDGE_MODEL.md** | El operational model (slots como verdad) es reemplazado por el knowledge model (evidencia como verdad). |
| `docs/architecture/decision-architecture.md` | **DECISION_MODEL.md** | Las 4 capas de decisión son reemplazadas por el ciclo cognitivo. |
| `docs/architecture/strategy-decision.md` | **DECISION_MODEL.md** | StrategyDecision (ADR-008) se redefine dentro del nuevo modelo de decisión. |
| `docs/architecture/conversation-pipeline.md` | **COGNITIVE_ARCHITECTURE.md** | El pipeline conversacional (ADR-008) es reemplazado por el ciclo cognitivo. |
| `docs/architecture/design-principles.md` | **PRINCIPLES.md** | Los principios de diseño se elevan a principios cognitivos. Algunos sobreviven, otros se redefinen. |
| `docs/architecture/glossary.md` | **SYSTEM_VOCABULARY.md** | El glosario unificado existente se absorbe y expande en la ontología normativa. |
| `docs/architecture/bounded-contexts.md` | **RESPONSIBILITY_MODEL.md** | Los bounded contexts actuales se redefinen como responsabilidades cognitivas. |
| `docs/architecture/engines.md` | **KNOWLEDGE_MODEL.md + RESPONSIBILITY_MODEL.md** | Los engines actuales se redistribuyen según el nuevo modelo de conocimiento y responsabilidades. |

### 8.2 Documentos históricos (permanecen pero sin vigencia normativa)

Estos documentos NO se eliminan pero se marcan como históricos. No tienen autoridad sobre decisiones futuras.

| Documento | Estado | Nota |
|-----------|--------|------|
| `docs/certification/*` (55 archivos) | **Archivado como histórico** | Eran diagnósticos del sistema state-dominant. Valiosos como referencia histórica pero sin vigencia normativa. |
| `docs/history/*` | **Permanecen** | Ya son históricos por definición. |
| `docs/architecture/REVERSE_ENGINEERING_REPORT.md` | **Archivado** | Describía el sistema state-dominant. Útil como referencia pero no como autoridad. |
| `docs/architecture/ARCHITECTURE_MILESTONE_v2.0.md` | **Archivado** | Hito del modelo anterior. |
| `ael/artifacts/AUDITORIA_03_GOBERNANZA.md` | **Archivado como diagnóstico** | Sus clasificaciones del backlog (🟢🟡🔴) quedan desactualizadas por el cambio de modelo. |
| `ael/artifacts/AUDITORIA_04_PRINCIPIOS_CONVERSACIONALES.md` | **Archivado como diagnóstico** | Sus principios son insumo para PRINCIPLES.md pero no autoridad. |
| `ael/artifacts/AUDITORIA_05_PASSENGER_EXPERIENCE.md` | **Archivado como diagnóstico** | Sus hallazgos son insumo para DECISION_MODEL.md. |
| `ael/artifacts/AUDITORIA_06_ARQUITECTURA_COGNITIVA.md` | **Archivado como diagnóstico** | Es la base de la constitución pero no es normativo. La constitución lo reemplaza como autoridad. |
| `docs/architecture/ADR_INDEX.md` | **Revisado** | Debe actualizarse para incluir los nuevos ADRs de la constitución y marcar los obsoletos. |

---

## 9. Documentos que cambiarán de rol

### 9.1 Documentos que permanecen (no tocar)

Estos documentos NO cambian su rol. Describen aspectos técnicos/operativos que son independientes del modelo cognitivo.

| Documento | Razón |
|-----------|-------|
| `docs/ai/CONTRACTS.md` | Los contratos entre engines son técnicos. Se revisarán después de la constitución para alinearlos, pero su rol no cambia. |
| `docs/ai/QUALITY_GATE.md` | El quality gate es un proceso, no un modelo conceptual. Permanecerá. |
| `docs/ai/COMMON_FAILURES.md` | Catálogo de errores comunes. Se actualizará pero su rol no cambia. |
| `docs/knowledge/*` (8 archivos) | Reglas de negocio por dominio. No dependen del modelo cognitivo. Permanecen. |
| `docs/architecture/diagrams/*` (25 archivos) | Los diagramas describen la implementación actual. Se actualizarán después de la migración. Su formato (diagramas) permanece. |
| `docs/architecture/domains/*` (5 archivos) | Modelos de dominio de negocio. Permanecen como documentación del negocio, no de la cognición. |
| `docs/operations/*` (3 archivos) | Guías operativas. Independientes del modelo cognitivo. |
| `docs/project/CHANGELOG.md` | Registro histórico. Permanecerá. |
| `docs/security/secrets.md` | Seguridad. Independiente. |
| `docs/adr/001-layered-architecture.md` | El layering sigue vigente. |
| `docs/adr/002-database-facade.md` | La facade sigue vigente. |
| `docs/adr/003-learning-domain.md` | El dominio de aprendizaje sigue vigente (aunque se redefinirá). |
| `docs/adr/004-service-boundaries.md` | Las fronteras de servicios siguen vigentes (aunque se redefinirán). |
| `docs/adr/006-schema-parity.md` | Schema parity sigue vigente. |
| `docs/adr/007-conversation-interpreter.md` | El Conversation Interpreter se redefine pero el ADR como documento permanece (será SUPERSEDED). |
| `docs/architecture/Fractal-architecture.md` | Patrones arquitectónicos que siguen siendo válidos. |
| `ael/constitution/SPEC.md` | El SPEC del AEL es operativo del agente, no del sistema. |
| `ael/constitution/CONTRACTS.md` | Contratos del AEL, no del sistema. |
| `ael/government/*` | Gobierno del AEL, no del sistema cognitivo. |

### 9.2 Documentos que cambian de rol

| Documento | Rol actual | Nuevo rol | Acción |
|-----------|-----------|-----------|--------|
| `docs/architecture/architecture.md` | Executive index de toda la arquitectura | Debe actualizarse para indexar la constitución cognitiva + el resto | Reescrito |
| `docs/project/PROJECT_BOARD.md` | Backlog operativo del proyecto | Debe reemplazarse por un backlog basado en épicas cognitivas | Reescribir después de MIGRATION_GUIDE |
| `docs/ROADMAP.md` | Roadmap maestro (5 fases state-dominant) | Debe reemplazarse por un roadmap basado en épicas cognitivas | Reescribir después de MIGRATION_GUIDE |
| `ael/artifacts/BACKLOG.md` | Backlog de implementación AITOS | Debe reorganizarse según las épicas cognitivas de la constitución | Reescribir después de MIGRATION_GUIDE |
| `docs/architecture/GOVERNANCE.md` | Gobierno de documentación arquitectónica | Absorbido por GOVERNANCE.md de la constitución | Absorber |
| `docs/project/PROJECT_GOVERNANCE.md` | Gobierno del proyecto | Absorbido por GOVERNANCE.md de la constitución | Absorber |
| `docs/project/HUMAN_EXPERIENCE_CHARTER.md` | Carta de experiencia humana | Absorbido por CONSTITUTION.md (principios de experiencia) | Absorber |
| `docs/architecture/knowledge-map.md` | Mapa del conocimiento actual | Debe reescribirse para alinearse con KNOWLEDGE_MODEL.md | Reescribir |

### 9.3 Documentos que requieren nuevos ADRs

| Tema | Nuevo ADR necesario | Relación con la constitución |
|------|---------------------|------------------------------|
| Adopción de la Constitución Cognitiva | **ADR-009** | Marco: establece que la constitución es la fuente máxima de verdad |
| Reemplazo de ADR-008 (state-dominant) | **ADR-010** | Marco: ADR-008 queda SUPERSEDED por el modelo cognitivo |
| Modelo de Evidence Store | **ADR-011** | Arquitectónico: define el almacén de evidencia inmutable |
| Modelo de Hypothesis Network | **ADR-012** | Arquitectónico: define el modelo de hipótesis múltiples |
| Modelo de Commitment | **ADR-013** | Arquitectónico: define umbrales de compromiso y costo de error |
| Modelo de Operational Projection | **ADR-014** | Arquitectónico: define la proyección como vista de solo lectura |
| Plan de Migración | **ADR-015** | Transición: define el plan aprobado para migrar del modelo actual |

---

## 10. Recomendación final sobre gobierno

### ¿Por qué el proyecto se desvió conceptualmente?

El proyecto actual tiene **161 archivos de documentación** (~23,000 líneas) que describen el sistema desde todos los ángulos imaginables. Sin embargo, el sistema sigue operando con un modelo state-dominant que nadie diseñó explícitamente — simplemente emergió de las decisiones técnicas acumuladas.

**La causa raíz no fue falta de documentación. Fue falta de una jerarquía documental clara.**

Cuando todos los documentos tienen el mismo peso, ningún documento tiene peso. Un ADR puede contradecir a una Bible que contradice a un principio que contradice a un diagrama. No hay forma de resolver la contradicción porque no hay una fuente máxima de verdad.

**La Constitución Cognitiva resuelve esto estableciendo una pirámide de autoridad.**

### Principios de gobierno recomendados

#### G1 — La constitución es la fuente máxima de verdad

Ningún documento, ADR, o decisión puede contradecir la constitución. Si existe contradicción, la constitución prevalece y el documento debe actualizarse.

#### G2 — La constitución se modifica por ADR, no por edición directa

Para cambiar cualquier documento de la constitución (incluso los "Evolutivos"), se requiere:
1. Un ADR que explique el cambio
2. Revisión de impacto contra todos los documentos que dependen del modificado
3. Aprobación del nivel correspondiente (ver §5)

#### G3 — Los documentos "Estables" requieren referéndum

Para cambiar CONSTITUTION.md, SYSTEM_VOCABULARY.md, COGNITIVE_PRINCIPLES.md, o GOVERNANCE.md, se requiere:
1. ADR con justificación exhaustiva
2. Revisión de impacto contra TODOS los demás documentos
3. Aprobación explícita de Cristian (fundador)
4. Período de comentarios de 48hs antes de la aprobación final

#### G4 — Revisión periódica de adherencia

Cada release (o cada 3 meses, lo que ocurra primero) debe incluir una certificación de que la implementación actual es coherente con la constitución. Esta certificación es responsabilidad del rol de Arquitecto (AEL).

#### G5 — El código es la verdad última

Si el código contradice la constitución, el código se ejecuta (el sistema debe funcionar) pero se registra una violación de la constitución que debe resolverse en el próximo ciclo.

#### G6 — Prohibición de backlogs paralelos

No puede haber dos backlogs activos. El PROJECT_BOARD, ROADMAP y BACKLOG deben fusionarse en un ÚNICO backlog maestro, organizado por épicas cognitivas, no por fase técnica.

#### G7 — Los términos prohibidos se eliminan activamente

SYSTEM_VOCABULARY.md define términos prohibidos (ej: "state machine" para describir la cognición, "llenar slots", "última intención"). Estos términos deben eliminarse activamente de TODA la documentación y código nuevo. El código existente puede mantenerlos, pero toda documentación nueva debe usar los términos correctos.

#### G8 — La constitución no es un museo

"No tocar porque está en la constitución" NO es una razón válida para no evolucionar. La constitución tiene niveles evolutivos explícitos. Los documentos "Evolutivos" deben cambiar a medida que el sistema aprende. La constitución debe ser un documento vivo, no una lápida.

### Ciclo de gobierno recomendado

```
Cada 3 meses (o cada release):

1. REVISIÓN: Auditoría de adherencia a la constitución
   - ¿La implementación actual contradice algún principio?
   - ¿Hay términos mal usados?
   - ¿Hay documentos desactualizados?

2. ACTUALIZACIÓN: Modificaciones a documentos "Evolutivos"
   - Basado en hallazgos de la revisión
   - Cada modificación requiere ADR
   - Las modificaciones no pueden violar documentos "Estables"

3. CERTIFICACIÓN: Firma de alineación
   - El Arquitecto certifica que el sistema está alineado
   - Se registra en CHANGELOG

4. APRENDIZAJE: ¿La constitución necesita evolucionar?
   - ¿Hay principios que deberían agregarse?
   - ¿Hay términos que deberían redefinirse?
   - Esto puede requerir cambios a documentos "Estables" (G3)
```

### Última recomendación

**No escribas toda la constitución de una vez.**

Escribe CONSTITUTION.md primero. Solo cuando esté aprobado, escribe SYSTEM_VOCABULARY.md. Luego COGNITIVE_PRINCIPLES.md. Un documento a la vez, en orden, sin saltos.

Cada documento debe ser **autocontenido** (puede leerse solo) pero **consistente** (no contradice a los anteriores).

El mayor riesgo no es escribir mal un documento. Es escribir varios documentos que, vistos en conjunto, se contradicen. La escritura secuencial con aprobación intermedia es la única forma de evitar esto.

**Cuando los 10 documentos estén escritos y aprobados, la Constitución Cognitiva de AITOS estará completa. Solo entonces comienza la implementación.**

---

*Fin de CONSTITUTION_MASTER_PLAN.md*

*Próximo paso: Escribir 01-CONSTITUTION.md*
