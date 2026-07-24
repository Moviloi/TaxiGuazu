# F-ADR-002: Múltiples Planning Engines en la Arquitectura Cognitiva

> **Nivel:** 1
> **Estado:** ACCEPTED
> **Fecha:** 2026-07-23
> **Autor:** SDL (PLAN)

## Contexto
COGNITIVE_ARCHITECTURE.md §3 describe el Mission Analyzer como un flujo único de 7 etapas (ORIENT→ANALYZE→EVALUATE→DECIDE→PLAN→VERIFY→DELIVER). Sin embargo, el DecisionPackage (producido por ARNÉS) selecciona entre dos Planning Engines: SDL (para misiones DEEP) y LIGHT_PLANNER (para misiones SHALLOW/STANDARD). LIGHT_PLANNER_CONTRACT.md v1.0 ya existe como documento de Nivel 2, pero la arquitectura cognitiva no reconoce oficialmente la existencia de múltiples motores de planificación.

## Decisión
COGNITIVE_ARCHITECTURE.md §3 se actualiza para reconocer que PLAN (el plano estratégico) puede delegar en múltiples Planning Engines. El Mission Analyzer establece el marco; los Planning Engines concretos (SDL, LIGHT_PLANNER) implementan diferentes perfiles de razonamiento. El SDL es el motor completo (7 etapas). El LIGHT_PLANNER es un motor reducido (etapas EVALUATE→DECIDE→PLAN→DELIVER con razonamiento menos profundo).

## Alternativas consideradas
- **Un solo motor con configuración:** Rechazado. La diferencia es cualitativa (etapas de razonamiento), no solo configurable.
- **Tres o más motores ahora:** Rechazado. Solo existen dos implementados. Futuros motores podrán agregarse.

## Impacto
- Documentos afectados: COGNITIVE_ARCHITECTURE.md §3 (reconocer multi-engine), §3.2 (referenciar SDL y LIGHT_PLANNER como implementaciones)
- Nivel 2 afectado: Ninguno (LIGHT_PLANNER_CONTRACT.md ya existe)
- Productos afectados: Ninguno
- ¿Requiere migración?: No

## Consecuencias
- **Gana:** Extensibilidad documentada. Nuevos Planning Engines pueden incorporarse sin modificar la arquitectura.
- **Pierde:** Una capa más de abstracción en el plano estratégico.
