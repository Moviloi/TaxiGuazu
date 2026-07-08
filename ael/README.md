# ARNÉS — Agent Execution Layer

Sistema operativo basado en restricciones para ingeniería de software asistida por IA. Gobierna la evolución de TaxiGuazú (AITOS).

---

## Arquitectura

```
ael/
├── constitution/           ← PERMANENTE. Cambia muy raramente.
│   ├── SPEC.md             ← invariants, principles, lifecycle constraints
│   └── CONTRACTS.md        ← R1-R4 enforcement rules
│
├── government/             ← EVOLUTIVO. Cambia cuando la organización evoluciona.
│   ├── ORGANIZATION.md     ← capabilities, roles, authority
│   └── roles/              ← capability contracts
│
├── contracts/              ← ADMINISTRACIÓN. Implementación concreta.
│   ├── enforce.sh          ← contract enforcement
│   └── diagnose.sh         ← self-diagnostic
│
├── artifacts/              ← ADMINISTRACIÓN. Templates para outputs de capabilities.
│   └── *.md
│
└── archive/                ← HISTÓRICO. Documentos del modelo anterior.
    └── *.md
```

La memoria operativa vive en `.opencode/memory/MEMORY.md`.
Los prompts de los agentes viven en `.opencode/agents/`.
Los comandos viven en `.opencode/commands/`.

---

## Modelo operacional

El Director es un **Mission Planner soberano**. Para cada misión:

1. **Entiende** qué se pide (Discovery, Memory o razonamiento interno).
2. **Planifica** la estrategia (elige qué capabilities usar, en qué orden, cuáles omitir).
3. **Ejecuta** delegando en subagentes o internamente.
4. **Cierra** verificando invariantes y preservando conocimiento.

No hay pipeline fijo. No hay fases obligatorias. No hay secuencias predefinidas.

---

## Filosofía

> Maximizar la calidad de la ingeniería minimizando costo, tiempo, contexto y riesgo.

Todo lo demás es opcional.
