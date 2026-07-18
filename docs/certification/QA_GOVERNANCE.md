# QA Governance — Acceptance Testing (CAT)

> Reglas permanentes para el ciclo de vida de defectos funcionales detectados por
> campañas CAT (Conversational Acceptance Testing).
>
> **Vigencia:** A partir de CAT-2. Aplica retroactivamente a todo defecto
> descubierto por campañas CAT presentes y futuras.

---

## Regla fundamental: No cierre sin revalidación

**Ningún defecto descubierto por una campaña CAT podrá marcarse como `CLOSED`
(equivalente: `DONE` en PROJECT_BOARD.md) hasta que la misma campaña que lo
detectó haya sido reejecutada y certificada nuevamente.**

---

## Condiciones

### 1. El cierre requiere evidencia funcional, no solamente implementación

Que el código haya sido modificado no implica que el defecto esté resuelto.
El cierre requiere que la campaña CAT original se haya reejecutado
íntegramente y que todos sus escenarios hayan pasado (`PASS`) sin la
desviación que originó el defecto.

### 2. Los tests unitarios o de integración no sustituyen la revalidación CAT

- **Tests unitarios:** verifican comportamiento de una unidad aislada. No
  pueden confirmar que el sistema conversacional completo (CORE → Extraction →
  Policy → LLM → Response) se comporte correctamente en un escenario real.
- **Tests de integración:** verifican interacción entre componentes, pero no
  cubren la totalidad de factores contextuales (estado de sesión, historial,
  clarify_field, intención acumulada, comprensión variable) que una campaña
  CAT ejercita.
- **Única evidencia aceptable para cierre:** reejecución completa de la
  campaña CAT que detectó el defecto, con resultado `PASS` en todos los
  escenarios y verificación explícita de que la desviación documentada ya no
  ocurre.

### 3. Trazabilidad obligatoria

Cada defecto CAT debe mantener la siguiente cadena de trazabilidad, registrada
en su documento de defecto (`docs/incidents/H-*.md`):

```
Campaña CAT
    ↓  (¿Qué campaña? ¿Qué escenario? ¿Qué turno?)
Defecto funcional
    ↓  (ID, severidad, reglas violadas, comportamiento observado vs esperado)
Implementación
    ↓  (PR, commit, componente modificado — sin solución técnica en el defecto)
Revalidación
    ↓  (misma campaña reejecutada, resultado PASS, evidencia de cierre)
Cierre
    ↓  (defecto marcado CLOSED, tarea marcada DONE en PROJECT_BOARD)
```

**Regla:** Ningún eslabón puede saltarse. Si falta la revalidación, el defecto
permanece `OPEN` sin importar el estado de la implementación.

---

## Ciclo de vida del defecto CAT

```
ESTADO             CONDICIÓN
────────────────────────────────────────────────────────────────────
OPEN               Defecto reportado, pendiente de implementación
                   + revalidación.

IN_PROGRESS        Implementación comenzada (si aplica).
                   El defecto sigue ABIERTO hasta revalidación.

REVIEW             Implementación completada.
                   Pendiente de reejecutar campaña CAT.

REVALIDATING       Campaña CAT en ejecución.
                   (Estado transitorio durante la ejecución)

CLOSED             Campaña CAT reejecutada → todos los escenarios PASS
                   → desviación original verificada como resuelta.
                   Equivalente a DONE en PROJECT_BOARD.
```

---

## Excepciones

No existen excepciones. Un defecto CAT solo puede cerrarse con revalidación
CAT. Ninguna de las siguientes circunstancias lo exime:

- El fix parece "trivial" o "evidente".
- Los tests unitarios pasan al 100%.
- El código fue revisado por pares.
- La persona que implementó está "segura" de que funciona.
- El defecto tiene baja severidad.
- La campaña CAT es costosa o lenta de ejecutar.

---

## Referencias

- `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` — Primer defecto regido
  por esta política (CAT-2).
- `docs/incidents/CAT2_RESULT_REPORT.md` — Reporte de la campaña CAT-2.
- `docs/project/PROJECT_BOARD.md` — Registro de tareas con estados.
- `docs/project/PROJECT_GOVERNANCE.md` — Estados de tareas del proyecto.

---

*Creado: 2026-07-18. Aplica retroactivamente a H-CAT2-001 y a todo defecto
CAT futuro.*
