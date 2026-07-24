# F-ADR-004: ARNÉS como Orquestador Meta-Framework

> **Nivel:** 1
> **Estado:** ACCEPTED
> **Fecha:** 2026-07-23
> **Autor:** SDL (PLAN)

## Contexto
El invariante F1 establece: "El pensamiento estratégico y la ejecución operacional nunca se mezclan. [...] No existe un tercer plano." Sin embargo, el agente ARNÉS (orquestador) realiza actividades que no son estrictamente estratégicas ni operacionales: clasifica misiones (Scope Gate), gestiona el Project Adapter, carga el Runtime Profile, invoca a PLAN y BUILD, recibe ExecutionReports, y declara CLOSED. Esto crea una aparente contradicción con F1.

## Decisión
ARNÉS **no** es un tercer plano cognitivo. ARNÉS es el **orquestador meta-framework**: el runtime que aloja los dos planos cognitivos (Estratégico y Operacional) sin pertenecer a ninguno. Su función es gestionar el ciclo de vida de las misiones: enrutamiento, contexto, recursos, y cierre. No toma decisiones estratégicas (eso es PLAN) ni ejecuta cambios operacionales (eso es BUILD). La analogía es: ARNÉS es al framework lo que un kernel es a un sistema operativo — gestiona scheduling y recursos, no ejecuta aplicaciones de usuario.

**No se introduce un tercer plano cognitivo.** Se clarifica que el orquestador es infraestructura del framework, no cognición.

## Alternativas consideradas
- **Introducir Plano de Gobernanza:** Rechazado. Agregaría complejidad innecesaria (nuevo invariante, nuevo nivel documental, nuevos contratos) para un problema que se resuelve con clarificación conceptual.
- **Mover ARNÉS al plano estratégico:** Rechazado. ARNÉS recibe ExecutionReports y declara CLOSED — actividades post-operacionales que no son estratégicas.
- **Mover ARNÉS al plano operacional:** Rechazado. ARNÉS clasifica misiones y selecciona Planning Engines — actividades pre-estratégicas que no son operacionales.

## Impacto
- Documentos afectados: COGNITIVE_ARCHITECTURE.md §1.2, §2.1, §8.1 (agregar nota sobre el orquestador como infraestructura); ARNES_CONSTITUTION.md §9 (nota aclaratoria sobre F1, opcional)
- Nivel 2 afectado: prompts de ARNÉS (ya operan según este modelo — sin cambios requeridos)
- Productos afectados: Ninguno
- ¿Requiere migración?: No

## Consecuencias
- **Gana:** F1 preservado sin ambigüedad. El rol del orquestador está documentado y justificado.
- **Pierde:** Ninguna. La clarificación no introduce nuevas restricciones.
