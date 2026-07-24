# F-ADR-003: Decision Engine como Componente Lógico

> **Nivel:** 1
> **Estado:** ACCEPTED
> **Fecha:** 2026-07-23
> **Autor:** SDL (PLAN)

## Contexto
COGNITIVE_ARCHITECTURE.md §5 define el Decision Engine como "el mecanismo de transformación que conecta los dos planos cognitivos" y establece 4 garantías. Sin embargo, no existe un agente, script o contrato que implemente el Decision Engine. En la práctica, el agente ARNÉS (orquestador) ejerce sus funciones: valida tipos de información, garantiza trazabilidad, y gestiona el flujo PLAN↔BUILD. Existe ambigüedad sobre si el Decision Engine es un componente implementable o un concepto arquitectónico.

## Decisión
El Decision Engine se documenta explícitamente como un **componente lógico del Framework (Nivel 1)** cuya **implementación concreta es ejercida por el agente ARNÉS (Nivel 2)**. No se crea un agente separado "decision-engine". Las garantías definidas en COGNITIVE_ARCHITECTURE.md §5.4 son responsabilidad del orquestador ARNÉS, verificables mediante el contrato de enforcement (enforce.sh) para los aspectos automatizables.

## Alternativas consideradas
- **Crear agente @ael-decision-engine:** Rechazado. Agregaría un cuarto agente principal (ARNÉS→PLAN→BUILD→DECISION_ENGINE) sin beneficio proporcional. ARNÉS ya ejerce esta función.
- **Eliminar el concepto:** Rechazado. El Decision Engine como abstracción es valioso para entender la arquitectura. Eliminarlo oscurecería el flujo de información.
- **Degradar a principio operativo:** Rechazado. Las garantías del Decision Engine son verificables (no fuga de tipos, trazabilidad). Son más que principios.

## Impacto
- Documentos afectados: COGNITIVE_ARCHITECTURE.md §5 (agregar clarificación: "componente lógico implementado por ARNÉS"), §10.1 (tabla de correspondencia)
- Nivel 2 afectado: prompts de ARNÉS (ya implementan esta función — sin cambios requeridos)
- Productos afectados: Ninguno
- ¿Requiere migración?: No

## Consecuencias
- **Gana:** Claridad sobre qué es el Decision Engine y quién lo implementa. Sin ambigüedad.
- **Pierde:** Ninguna.
