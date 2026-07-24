# F-ADR-001: DecisionPackage como séptimo objeto cognitivo

> **Nivel:** 1
> **Estado:** ACCEPTED
> **Fecha:** 2026-07-23
> **Autor:** SDL (PLAN)

## Contexto
El ARNÉS Framework define 6 objetos cognitivos en COGNITIVE_OBJECT_MODEL.md: Mission, Decision, ExecutionPlan, ExecutionReport, Review, Incident. Sin embargo, el orquestador ARNÉS produce un DecisionPackage en el Scope Gate —antes de invocar a PLAN— que no está modelado como objeto cognitivo formal. El DecisionPackage contiene: mission_type, reasoning_required, reasoning_depth, planning_engine, execution_required, continuation, requires_user_approval, cognitive_budget, existing_execution_plan, classification_reason. Es un objeto distinto de "Decision" (producido por SDL durante ORIENT→DELIVER) porque opera en un punto diferente del flujo (Scope Gate, pre-estratégico).

## Decisión
Se agrega DecisionPackage como el 7° objeto cognitivo del ARNÉS Framework, con posición en el flujo: ARNÉS (Scope Gate) → DecisionPackage → PLAN (SDL). No se fusiona con "Decision" porque tienen productores, consumidores y momentos de producción distintos.

## Alternativas consideradas
- **Fusionar con Decision:** Rechazado. Decision es producido por SDL; DecisionPackage es producido por ARNÉS antes de invocar a PLAN.
- **Modelar como sub-tipo de Mission:** Rechazado. Mission es la unidad de trabajo; DecisionPackage es el resultado de la clasificación.
- **No formalizar:** Rechazado. El objeto ya existe operacionalmente; no formalizarlo es deuda de especificación.

## Impacto
- Documentos afectados: COGNITIVE_OBJECT_MODEL.md (nuevo §8, actualizar §1.3, posible nuevo OM-9)
- Nivel 2 afectado: prompts de ARNÉS y PLAN (ya operan con DecisionPackage, no requieren cambio)
- Productos afectados: Ninguno
- ¿Requiere migración?: No

## Consecuencias
- **Gana:** Trazabilidad completa del ciclo de clasificación. El DecisionPackage ahora tiene estados, entradas, salidas y ciclo de vida documentados.
- **Pierde:** Un objeto más en el modelo (6→7). Complejidad marginal.
