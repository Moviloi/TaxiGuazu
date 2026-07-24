# ARNÉS Contracts — Contract Enforcement Layer

> Reglas formales de verificación automática de contratos arquitectónicos.
> Las reglas específicas de cada producto están en `ael/contracts/product-rules.json`.
> Este documento define las categorías de reglas y su semántica, no los paths concretos.

---

## R1: Contract Integrity

**Regla:** No modificar contratos entre capas sin actualizar la autoridad arquitectónica correspondiente.

### Qué verifica

R1 verifica que las capas arquitectónicas del producto no violen sus contratos de importación. Las reglas concretas (qué capa no debe importar de qué otra capa) están definidas por producto en `product-rules.json` bajo `r1_contract_integrity.forbidden_imports`.

Cada regla específica:
- Un directorio de origen (`from_path`).
- Un patrón de importación prohibido (`import_pattern`).
- Opcionalmente, exclusiones (`except_patterns`).

### Estructura en product-rules.json

```json
"r1_contract_integrity": {
  "forbidden_imports": [
    {
      "description": "descripción de la regla",
      "from_path": "directorio/a/verificar/",
      "import_pattern": "patrón grep de importación prohibida",
      "except_patterns": ["patrón a excluir"]
    }
  ],
  "warnings": [...]
}
```

### Acción en violación

Si R1 se viola:
1. Auditor marca `VALIDATION_REPORT.md` como `FAILED`.
2. Pipeline entra en `ROLLBACK`.
3. Se documenta la violación en `DECISION_RECORD.md`.
4. Se escala a Director para decidir: corregir o crear ADR que justifique.

---

## R2: Dependency Rules

**Regla:** No crear dependencias que violen las decisiones arquitectónicas aceptadas (ADRs del producto).

### Qué verifica

R2 verifica dos tipos de reglas:

1. **Layer constraints** (`layer_constraints`): Una capa no debe contener imports que violen la dirección de dependencias definida en los ADRs del producto.

2. **Facade checks** (`facade_checks`): Las capas deben usar facades o abstracciones en lugar de acceder directamente a implementaciones internas.

### Estructura en product-rules.json

```json
"r2_dependency_rules": {
  "layer_constraints": [
    {
      "description": "descripción",
      "search_path": "directorio/a/verificar/",
      "forbidden_pattern": "patrón prohibido"
    }
  ],
  "facade_checks": [
    {
      "description": "descripción",
      "search_path": "directorio/a/verificar/",
      "pattern": "patrón a detectar"
    }
  ]
}
```

### Acción en violación

Si R2 se viola:
1. Auditor marca `VALIDATION_REPORT.md` como `FAILED`.
2. Pipeline entra en `ROLLBACK`.
3. Se documenta en `DECISION_RECORD.md`.
4. Se decide: corregir la violación o crear ADR que la justifique.

---

## R3: Code Existence Validation

**Regla:** No asumir implementación que no exista en código fuente real.

### Qué verifica

R3 verifica que los archivos referenciados en documentos de especificación del producto existen realmente en el código fuente. Los archivos de especificación a verificar se configuran en `r3_code_existence.spec_files`.

### Estructura en product-rules.json

```json
"r3_code_existence": {
  "spec_files": ["ruta/a/especificacion.md"]
}
```

### Acción en violación

Si R3 se viola:
1. Se registra cada archivo referenciado que no existe.
2. Se reporta como FAIL si hay violaciones.

---

## R4: AI-First Interpretation

**Regla:** No usar heurísticas hardcodeadas para interpretación sensible al contexto. Cuando el sistema necesita interpretar datos ambiguos, debe usar el LLM con contexto completo, no heurísticas en queries.

### Qué verifica

R4 verifica dos tipos de violaciones:

1. **No heuristic ranking** (`no_heuristic_ranking`): No deben existir reglas de ordenamiento heurísticas (CASE/WHEN) en queries de base de datos para dominios que requieren interpretación contextual.

2. **No hardcoded priorities** (`no_hardcoded_priorities`): No deben existir mapas de prioridad hardcodeados para dominios que requieren interpretación contextual.

### Estructura en product-rules.json

```json
"r4_ai_first": {
  "no_heuristic_ranking": [
    {
      "description": "descripción",
      "file": "archivo/a/verificar.ts",
      "pattern": "patrón a buscar"
    }
  ],
  "no_hardcoded_priorities": [
    {
      "description": "descripción",
      "file": "archivo/a/verificar.ts",
      "pattern": "patrón a buscar"
    }
  ]
}
```

### Acción en violación

Si R4 se viola:
1. Pipeline entra en `REJECTED`.
2. Se escala a Director para decidir: reemplazar por AI-driven o crear ADR que justifique la heurística.

---

## Enforcement Commands

### Ejecutar todas las reglas

```bash
bash ael/contracts/enforce.sh
```

### Ejecutar una regla específica

```bash
bash ael/contracts/enforce.sh --rule R1
bash ael/contracts/enforce.sh --rule R2
bash ael/contracts/enforce.sh --rule R3
bash ael/contracts/enforce.sh --rule R4
```

### Validar schema del archivo de reglas

```bash
bash ael/contracts/enforce.sh --validate-schema
```

### Output

El enforcement produce:
- `PASS` si no hay violaciones.
- `FAIL` con lista de violaciones si las hay.
- Exit code: 0 = pass, 1 = fail.

---

## Product Rules

Las reglas específicas de cada producto residen en `ael/contracts/product-rules.json`. El schema está definido en `ael/contracts/product-rules.schema.json`.

Para agregar un nuevo producto, crear su propio `product-rules.json` con la misma estructura. El enforcement es independiente del producto: solo necesita que el archivo de reglas exista.

---

> *ARNÉS Contracts v2.0 — parametrizado por producto. Este documento define las categorías de reglas (R1-R4) y su semántica. Los paths, archivos y patrones concretos pertenecen al producto y residen en `ael/contracts/product-rules.json`.*
