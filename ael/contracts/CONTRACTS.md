# AEL Contracts — Contract Enforcement Layer

Reglas formales de verificación automática de contratos arquitectónicos.

## R1: Contract Integrity

**Regla:** No modificar contratos entre capas sin actualizar la autoridad arquitectónica correspondiente.

### Enforcement

```bash
# Verificar que AI no importa de Services (excepto types)
grep -rn "from.*@/lib/services/" src/lib/ai/ --include="*.ts" | grep -v "types" | grep -v "//.*from"

# Verificar que response-builder no importa de learning concept
grep -rn "OpportunityResult" src/lib/ai/response-builder.ts
```

### Archivos monitoreados

| Archivo | Contrato | Viola R1 |
|---------|----------|----------|
| `src/lib/ai/*.ts` | AI no importa de Services | NO (excepto response-builder→types) |
| `src/lib/services/*.ts` | Services no importan de AI (excepto types) | NO |

### Acción en violación

Si R1 se viola:
1. Auditor marca `VALIDATION_REPORT.md` como `FAILED`
2. Pipeline entra en `ROLLBACK`
3. Se documenta la violación en `DECISION_RECORD.md`
4. Se escala a Director para decidir: corregir o crear ADR que justifique

---

## R2: Dependency Rules

**Regla:** No crear dependencias que violen las decisiones arquitectónicas aceptadas (ADR 001-004).

### Enforcement

```bash
# ADR 001: Arquitectura en capas — verificar dirección de dependencias
# Utils no importa de nada del proyecto
grep -rn "from.*@/lib/" src/lib/utils/ --include="*.ts"

# Config no importa de lib/
grep -rn "from.*@/lib/" src/config/ --include="*.ts"

# DB no importa de Services
grep -rn "from.*@/lib/services/" src/lib/db/ --include="*.ts"

# ADR 002: Database Facade — Services usan facade, no core
grep -rn "from.*db/core" src/lib/services/ --include="*.ts"
grep -rn "getDb()" src/lib/services/ --include="*.ts"
grep -rn "queryOne()" src/lib/services/ --include="*.ts" | grep -v "database.ts"

# ADR 004: Service boundaries — verificar orden de dependencia
# survey.service no debe importar de lead.service
grep -rn "from.*lead.service" src/lib/services/trip-execution/ --include="*.ts"
```

### Archivos monitoreados

| Capa | No debe importar de | Viola R2 |
|------|--------------------|----|
| `utils/` | Nada del proyecto | OK |
| `config/` | `lib/` | OK |
| `db/` | `services/` | OK |
| `services/` | `db/core/` directamente | 4 archivos lo hacen ⚠️ |
| `services/trip-execution/` | `lead.service` | survey.service lo hace ⚠️ |

### Acción en violación

Si R2 se viola:
1. Auditor marca `VALIDATION_REPORT.md` como `FAILED`
2. Pipeline entra en `ROLLBACK`
3. Se documenta en `DECISION_RECORD.md`
4. Se decide: corregir la violación o crear ADR que la justifique

---

## R3: Code Existence Validation

**Regla:** No asumir implementación que no exista en código fuente real.

### Enforcement

```bash
# Verificar que archivos referenciados en DESIGN_SPEC existen
for file in $(grep -oP 'src/[^\s`]+\.ts' ael/artifacts/DESIGN_SPEC.md); do
  if [ ! -f "$file" ]; then
    echo "VIOLATION: $file does not exist"
  fi
done

# Verificar que funciones referenciadas existen
grep -rn "functionName" src/ --include="*.ts" | wc -l
```

### Regla práctica

El Explorer (R3) debe:
1. Leer cada archivo antes de referenciarlo
2. Verificar que funciones/clases referenciadas existen
3. No asumir que código descrito en documentación existe realmente
4. Registrar divergencias en `SYSTEM_STATE.md`

---

## Enforcement Commands

### Ejecutar todos los checks

```bash
bash ael/contracts/enforce.sh
```

### Ejecutar un check específico

```bash
bash ael/contracts/enforce.sh --rule R1
bash ael/contracts/enforce.sh --rule R2
bash ael/contracts/enforce.sh --rule R3
```

### Output

El enforcement produce:
- `PASS` si no hay violaciones
- `FAIL` con lista de violaciones si las hay
- Exit code: 0 = pass, 1 = fail
