# ADR-007 — Conversation Interpreter
## Status: Accepted
## Fecha: 2026-07-08 (implementado: 2026-07-08, commit 3080686)

---

## Contexto

Las auditorías B3, GEO y del Pipeline Conversacional confirmaron que:

1. El `entity-extractor` asigna `destination` por default sin conocer el estado conversacional
2. El `merge` en `extraction-runner` es un safety net que corrige resultados incorrectos del extractor
3. El `handleSlotConfirmationText` clasifica mensajes solo para el estado `slot_confirmation`
4. Para `collecting_slots` y otros estados, el pipeline trata cada mensaje como una nueva extracción
5. `core()` solo recibe `prevIntent` como contexto — no recibe estado, slots previos, ni historial relevante

## Decisión

**Crear un Conversation Interpreter como etapa del pipeline entre CORE y Entity Extraction.**

Su responsabilidad es clasificar el rol conversacional de cada mensaje basándose en el texto, el intent de CORE, el estado conversacional actual y los slots previos.

## Consecuencias

- **Positivas**: El entity extractor ya no necesita adivinar roles. El merge pasa de ser primera línea de defensa a safety net. El bug B3 y su familia se previenen en origen.
- **Negativas**: Nuevo componente. Complejidad adicional. Requiere integrarse con el pipeline existente sin romperlo.
- **Riesgos mitigados**: Se previene que el Conversation Interpreter se convierta en un nuevo `lead.service` mediante: contrato mínimo, sin estado propio, sin side effects, y sin acceso a DB.

## Alternativas consideradas

| Alternativa | Evaluación |
|---|---|
| Incorporar al CORE | Violaría SRP. CORE clasifica intent, no rol conversacional. |
| Incorporar al Entity Extractor | El extractor extrae entidades, no interpreta intención conversacional. |
| Incorporar al Workflow | Workflow maneja estado, no clasifica mensajes entrantes. |
| Conversation Interpreter independiente | ✅ Responsabilidad clara. Contrato mínimo. Testeable aisladamente. |

## Estado

ACCEPTED. Implementado en `conversation-interpreter.ts` (commit 3080686).
