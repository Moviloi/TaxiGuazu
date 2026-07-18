# CAT Certification Register

> Registro central de certificación para campañas de Acceptance Testing (CAT).
>
> **Propósito:** Única fuente de verdad sobre el estado de cada campaña CAT.
>
> **Gobernanza:** Las reglas de este registro están definidas en
> `docs/certification/QA_GOVERNANCE.md`.

---

## Estados permitidos

| Estado | Significado |
|--------|-------------|
| `NOT_STARTED` | Campaña definida pero no ejecutada |
| `IN_PROGRESS` | Campaña en ejecución |
| `CONDITIONAL` | Ejecutada con hallazgos que no bloquean certificación pero requieren seguimiento |
| `CERTIFIED` | Ejecutada sin defectos abiertos. Todos los escenarios PASS. |
| `SUPERSEDED` | Un cambio posterior puede afectar el área cubierta. Requiere revalidación. |

---

## Reglas

### Regla 1 — Defectos abiertos impiden certificación

Una campaña con defectos funcionales abiertos (estado `OPEN`) asociados a ella
no puede estar `CERTIFIED`. Su estado debe ser `CONDITIONAL` o `SUPERSEDED`
hasta que los defectos se resuelvan y la campaña se reejecute.

### Regla 2 — Reejecución requerida para certificar

Una campaña pasa a `CERTIFIED` únicamente después de reejecutarse
completamente sin defectos abiertos relacionados. La reejecución debe:

- Incluir **todos** los escenarios originales de la campaña.
- Verificar explícitamente que la desviación documentada ya no ocurre.
- Registrar el resultado en el campo "Resultado" de la tabla.

### Regla 3 — Cambios posteriores degradan a SUPERSEDED

Si un cambio en el sistema (implementación, refactor, cambio de proveedor LLM,
etc.) puede afectar el área cubierta por una campaña ya certificada, su estado
cambia a `SUPERSEDED` hasta ser revalidada.

**No es necesario probar que el cambio afecta la campaña.** Basta con que
exista una posibilidad razonable. La decisión la toma el Mission Planner o el
Strategic Director Layer.

---

## Registro de campañas

| Campaña | Objetivo | Fecha última ejecución | Resultado | Estado | Defectos abiertos | Última versión (commit) | Próxima revalidación requerida |
|---------|----------|------------------------|-----------|--------|-------------------|-------------------------|-------------------------------|
| CATS-1 | Suite de tests invariantes conversacionales (26 tests, CAT-001 a CAT-026). Verifica propiedades que deben cumplirse siempre: estabilidad de intención, resolución de campos, reconocimiento de patrones, máquina de estados. | 2026-07-17 | 26/26 PASS | `CERTIFIED` | — | `f2dc91c` | Post-QA-3 Sprint 3 (si los cambios afectan invariantes) |
| CAT-1 | Campaña de aceptación externa (caja negra). 13 escenarios conversacionales contra sistema real (Turso, Gemini/Groq). Cobertura: 21 escenarios CAT, 9 RF, 5 reglas CDA. | 2026-07-17 | 11/13 PASS funcionales, 2 timeouts por latencia LLM. Veredicto: 🟡 ACEPTABLE CON HALLAZGOS. | `CONDITIONAL` | — | `f2dc91c` | Post-QA-3 Sprint 3 (F01-DG, F02-DG, F03-DG corregidos) |
| CAT-2 | Persistencia del contexto conversacional. 6 escenarios black-box: preservación de origen, destino, pasajeros, intención, no-reinicio, no-repetición. | 2026-07-18 | 6/6 PASS (3 hallazgos). Intención preservada ✅. Slots perdidos en RECOVERY ⚠️. | `CONDITIONAL` | H-CAT2-001 (RECOVERY slot loss) | `32811ba` | Post-fix H-CAT2-001 |

---

## Transiciones de estado

```
                ┌──────────────────────────────┐
                │         NOT_STARTED           │
                └──────────────┬───────────────┘
                               │ Campaña comienza
                               ▼
                ┌──────────────────────────────┐
                │         IN_PROGRESS           │
                └──────────────┬───────────────┘
                               │ Campaña finaliza
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
    ┌─────────────────────────┐  ┌─────────────────────────┐
    │      CONDITIONAL        │  │       CERTIFIED          │
    │  (hallazgos/defectos)   │  │  (sin defectos abiertos) │
    └──────────┬──────────────┘  └──────────┬──────────────┘
               │                             │
               │ Defecto resuelto +          │ Cambio potencial
               │ campaña reejecutada         │ en área cubierta
               ▼                             ▼
    ┌─────────────────────────┐  ┌─────────────────────────┐
    │       CERTIFIED         │  │       SUPERSEDED         │
    └─────────────────────────┘  └──────────┬──────────────┘
                                             │
                                             │ Reejecución
                                             ▼
                                    ┌─────────────────────────┐
                                    │  CERTIFIED / CONDITIONAL │
                                    └─────────────────────────┘
```

---

## Historial de cambios del registro

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-18 | Creación del registro. Estado inicial: CATS-1 (`CERTIFIED`), CAT-1 (`CONDITIONAL`), CAT-2 (`CONDITIONAL` con H-CAT2-001). | ARNÉS / SDL |

---

## Referencias

- `docs/certification/QA_GOVERNANCE.md` — Reglas de gobernanza QA que rigen este registro.
- `docs/certification/PR-CATS-1_CONVERSATION_ACCEPTANCE_SUITE.md` — Documento de CATS-1.
- `docs/certification/PR-CAT1_EXTERNAL_ACCEPTANCE_CAMPAIGN.md` — Documento de CAT-1.
- `docs/incidents/CAT2_RESULT_REPORT.md` — Reporte de CAT-2.
- `docs/incidents/H-CAT2-001_RECOVERY_SLOT_LOSS.md` — Defecto abierto de CAT-2.
- `docs/project/PROJECT_BOARD.md` — Tareas de implementación asociadas.
