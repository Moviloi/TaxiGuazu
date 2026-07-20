# Mission Phase Architecture — PLAN → BUILD

> Contract cognitivo que reduce el ecosistema de desarrollo a dos únicas fases: PLAN (estratégico) y BUILD (operacional).

---

## 1. Objective

Consolidar la arquitectura del ecosistema de desarrollo alrededor de dos fases cognitivas exclusivas:

| Fase | Naturaleza | Responsable |
|------|-----------|-------------|
| **PLAN** | Pensamiento estratégico | Strategic Director |
| **BUILD** | Ejecución operacional | AEL (ARNÉS Director) |

No existe una tercera fase. No existe superposición. La transición PLAN → BUILD está gobernada por un contrato explícito.

---

## 2. Motivation

La auditoría arquitectónica (PR-SDL-3) identificó ambigüedad entre los modos PLAN, BUILD y AEL. El SDL estaba definido como capa estratégica pero su prompt no exigía el formato de salida obligatorio. El AEL estaba definido como Mission Planner pero su workflow incluía planificación estratégica que corresponde al SDL.

Esta arquitectura elimina la ambigüedad mediante un contrato formal entre ambas fases.

---

## 3. Architecture PLAN → BUILD

```
PLAN
  │
  ▼
Strategic Director
  │  Analiza, interpreta, evalúa, recomienda
  │
  ▼
Recommendation (explicita)
  │
  ▼
Execution Plan (JSON estructurado)
  │
  ▼
Execution Status (READY | NOT READY)
  │
  ▼
Usuario aprueba ("ok" | "hacelo")
  │
  ▼
BUILD
  │
  ▼
AEL
  │  Recibe EP → Descompone → Selecciona subagentes → Ejecuta
  │
  ▼
Execution Report
  │
  ▼
PLAN (ciclo)
```

---

## 4. Contract — PLAN (Strategic Director)

### Responsabilidades

- Analizar el estado del proyecto y la evidencia disponible.
- Interpretar los resultados entregados por BUILD.
- Debatir y objetar decisiones estratégicas.
- Detectar sobreingeniería, incertidumbre y complejidad.
- Evaluar evidencia y criterios de éxito.
- Recomendar cursos de acción.
- Priorizar objetivos y tareas.
- Planificar la ejecución mediante Execution Plans estructurados.

### Prohibiciones

- Escribir código.
- Modificar archivos.
- Ejecutar herramientas (bash, edit, write, etc.).
- Ejecutar subagentes.
- Delegar decisiones estratégicas al AEL.

### Formato de salida obligatorio

Toda respuesta del Strategic Director DEBE finalizar con el siguiente bloque:

━━━━━━━━━━━━━━━━━━━━━━

**Recommendation**

(recomendación explícita en lenguaje natural)

**Execution Plan**

(plan preciso y accionable — JSON estructurado)

**Execution Status**

READY

o

NOT READY

*Si el estado es NOT READY, debe indicar exactamente qué evidencia falta antes de permitir BUILD.*

━━━━━━━━━━━━━━━━━━━━━━

### Inicio de BUILD

El usuario debe poder iniciar BUILD respondiendo únicamente:

- `ok`
- `hacelo`

No se requiere aprobación adicional ni reformulación del plan.

---

## 5. Contract — BUILD (AEL)

### Definición

BUILD significa **ejecutar el Execution Plan aprobado**.

No significa escribir código. BUILD puede ejecutar:

- Auditorías
- Exploraciones
- Implementaciones
- Certificaciones
- Documentación
- Verificaciones
- Pruebas

### Workflow

1. **Recibir** el Execution Plan del SDL (ya aprobado por el usuario).
2. **Descomponer** las tareas del plan en unidades ejecutables.
3. **Seleccionar** los subagentes apropiados para cada tarea.
4. **Ejecutar** las tareas según el plan.
5. **Entregar** un Execution Report con resultados, evidencia y estado.

### Prohibiciones

- Redefinir objetivos del Execution Plan.
- Cambiar prioridades establecidas en el plan.
- Debatir o cuestionar la estrategia definida por el SDL.
- Generar un nuevo Execution Plan (salvo que el plan original lo contemple explícitamente como sub-tarea).

---

## 6. Workflow completo

| Paso | Fase | Actor | Acción |
|------|------|-------|--------|
| 1 | PLAN | Usuario | Presenta misión o problema |
| 2 | PLAN | SDL | Analiza, interpreta, evalúa evidencia |
| 3 | PLAN | SDL | Produce Recommendation + Execution Plan + Execution Status |
| 4 | PLAN | Usuario | Aprueba con "ok" o "hacelo" (o solicita cambios) |
| 5 | BUILD | AEL | Recibe Execution Plan aprobado |
| 6 | BUILD | AEL | Descompone tareas y selecciona subagentes |
| 7 | BUILD | AEL | Ejecuta según el plan |
| 8 | BUILD | AEL | Entrega Execution Report |
| 9 | PLAN | SDL | Evalúa resultados y decide próximo ciclo |

---

## 7. Invariantes

| ID | Invariante |
|----|-----------|
| MP-01 | PLAN es exclusivamente estratégico. SDL nunca ejecuta código, modifica archivos ni invoca herramientas. |
| MP-02 | BUILD es exclusivamente operacional. AEL nunca redefine objetivos, cambia prioridades ni debate estrategia. |
| MP-03 | Toda respuesta del SDL debe terminar con Recommendation + Execution Plan + Execution Status. |
| MP-04 | Execution Status solo admite READY o NOT READY. |
| MP-05 | BUILD solo puede iniciarse con un Execution Plan READY aprobado por el usuario. |
| MP-06 | AEL ejecuta el plan sin redefinir la estrategia. Cualquier desviación debe ser reportada como hallazgo. |

---

## 8. Casos permitidos

### En PLAN

- Analizar código existente (lectura).
- Discutir estrategias alternativas.
- Detectar riesgos y sobreingeniería.
- Priorizar tareas.
- Decidir no ejecutar BUILD (NOT READY).
- Solicitar más evidencia.

### En BUILD

- Ejecutar cualquier herramienta necesaria para cumplir el plan.
- Decidir el orden táctico de ejecución dentro del plan.
- Reintentar tareas fallidas.
- Reportar hallazgos no previstos.
- Documentar deuda técnica descubierta.

---

## 9. Casos prohibidos

### En PLAN

- Escribir o modificar código.
- Ejecutar bash, edit, write o cualquier herramienta de modificación.
- Invocar subagentes.
- Delegar decisiones estratégicas al AEL.

### En BUILD

- Cambiar los objetivos definidos en el Execution Plan.
- Modificar las prioridades establecidas.
- Cuestionar la estrategia del SDL.
- Producir un nuevo Execution Plan estratégico.

---

## 10. Certification

Esta arquitectura queda certificada cuando:

- [ ] MP-01 se cumple en todas las interacciones del SDL.
- [ ] MP-02 se cumple en todas las interacciones del AEL.
- [ ] MP-03 se cumple: el SDL siempre produce los 3 elementos obligatorios.
- [ ] MP-04 se cumple: solo READY o NOT READY como estado de ejecución.
- [ ] MP-05 se cumple: BUILD solo comienza con plan aprobado.
- [ ] MP-06 se cumple: AEL no desvía la estrategia.

La certificación se realiza mediante auditoría de interacciones reales.

---

*Este documento es el contrato arquitectónico entre las fases PLAN y BUILD. Cualquier modificación requiere revisión del SDL y actualización de los prompts de Strategic Director y AEL.*
