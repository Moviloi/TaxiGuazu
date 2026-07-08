#!/bin/bash
# AEL Integrity Diagnostic — Auto-diagnóstico de integridad ARNE
# Verifica: roles, comandos, agente principal, pipeline docs, contratos,
#           artefactos, ausencia de duplicados, cross-refs commands↔roles
#
# Uso:
#   bash ael/contracts/diagnose.sh              # completo
#   bash ael/contracts/diagnose.sh --check R1   # solo check específico
#
# Output: consola + ael/artifacts/DIAGNOSTIC_REPORT.md
# Exit: 0 = todo OK, 1 = hay FAIL, 2 = hay WARN sin FAIL

set -e

FAILS=0
WARNS=0
PASSES=0
REPORT="ael/artifacts/DIAGNOSTIC_REPORT.md"
CHECK_FILTER="${1:---all}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Helpers ──

pass() {
  PASSES=$((PASSES + 1))
  echo "  ✅ $1"
}

warn() {
  WARNS=$((WARNS + 1))
  echo "  ⚠️  WARN: $1"
}

fail() {
  FAILS=$((FAILS + 1))
  echo "  ❌ FAIL: $1"
}

# ── Check 1: Roles (7 fases) ──
check_roles() {
  echo "── Check 1: Roles (6 capability roles) ──"

  local expected_roles=(
    "02-explorer.md"
    "03-architect.md"
    "04-implementer.md"
    "05-auditor.md"
    "06-memory.md"
    "07-learning.md"
  )

  local missing=0
  local invalid=0

  for role in "${expected_roles[@]}"; do
    local path="ael/government/roles/$role"
    if [ ! -f "$path" ]; then
      fail "Rol faltante: $path"
      missing=$((missing + 1))
    else
      # Verificar contenido mínimo
      local size=$(wc -c < "$path" 2>/dev/null || echo "0")
      if [ "$size" -lt 50 ]; then
        warn "Rol muy corto ($size bytes): $path"
        invalid=$((invalid + 1))
      else
        # Verificar campos requeridos
        if grep -qi "responsabilidad\|purpose\|responsibility" "$path" 2>/dev/null; then
          pass "Rol válido: $role"
        else
          warn "Rol sin campo de propósito: $role"
          invalid=$((invalid + 1))
        fi
      fi
    fi
  done

  if [ $missing -eq 0 ]; then
    pass "Todos los 6 roles presentes"
  fi

  echo ""
}

# ── Check 2: Comandos opencode (9 comandos) ──
check_commands() {
  echo "── Check 2: Comandos opencode ──"

  local expected_commands=(
    "ael-plan.md"
    "ael-explore.md"
    "ael-design.md"
    "ael-implement.md"
    "ael-validate.md"
    "ael-enforce.md"
    "ael-remember.md"
    "ael-learn.md"
    "ael-diagnose.md"
  )

  local missing=0
  local invalid=0

  for cmd in "${expected_commands[@]}"; do
    local path=".opencode/commands/$cmd"
    if [ ! -f "$path" ]; then
      fail "Comando faltante: $path"
      missing=$((missing + 1))
    else
      # Verificar frontmatter válido
      if head -1 "$path" 2>/dev/null | grep -q "^---" 2>/dev/null; then
        # Verificar que tiene agent: ael
        if grep -q "^agent: ael" "$path" 2>/dev/null; then
          pass "Comando válido: $cmd"
        else
          warn "Comando sin 'agent: ael': $cmd"
          invalid=$((invalid + 1))
        fi
      else
        warn "Comando sin frontmatter válido: $cmd"
        invalid=$((invalid + 1))
      fi
    fi
  done

  if [ $missing -eq 0 ]; then
    pass "Todos los 9 comandos presentes"
  fi

  echo ""
}

# ── Check 3: Agente principal ──
check_agent() {
  echo "── Check 3: Agente principal (ael.md) ──"

  local agent=".opencode/agents/ael.md"

  if [ ! -f "$agent" ]; then
    fail "Agente principal no existe: $agent"
    echo ""
    return
  fi

  # Verificar modo primary
  if grep -q "mode: primary" "$agent" 2>/dev/null; then
    pass "Modo primary detectado"
  else
    warn "Agente sin modo primary"
  fi

  # Verificar permisos de lectura
  if grep -q "read: allow" "$agent" 2>/dev/null; then
    pass "Permiso de lectura presente"
  else
    warn "Agente sin permiso de lectura"
  fi

  # Verificar subagentes
  local subagents_found=0
  for sub in ael-explore ael-design ael-implement ael-validate ael-remember ael-learn; do
    if grep -q "$sub" "$agent" 2>/dev/null; then
      subagents_found=$((subagents_found + 1))
    fi
  done

  if [ $subagents_found -ge 6 ]; then
    pass "Subagentes listados correctamente ($subagents_found/6)"
  else
    warn "Solo $subagents_found subagentes listados (esperados 6)"
  fi

  echo ""
}

# ── Check 4: Constitution & Government docs ──
check_constitution_docs() {
  echo "── Check 4: Constitution & Government ──"

  local docs=(
    "ael/constitution/SPEC.md"
    "ael/constitution/CONTRACTS.md"
    "ael/government/ORGANIZATION.md"
  )

  local missing=0
  for doc in "${docs[@]}"; do
    if [ ! -f "$doc" ]; then
      fail "Doc faltante: $doc"
      missing=$((missing + 1))
    else
      local size=$(wc -c < "$doc" 2>/dev/null || echo "0")
      if [ "$size" -lt 100 ]; then
        warn "Doc muy corto ($size bytes): $doc"
      else
        pass "Doc válido: $(basename $doc)"
      fi
    fi
  done

  # Verificar roles de gobierno
  local role_count=$(ls -1 ael/government/roles/*.md 2>/dev/null | wc -l || echo "0")
  if [ "$role_count" -ge 6 ]; then
    pass "Roles presentes: $role_count"
  else
    warn "Roles insuficientes: $role_count (esperados 6)"
  fi

  echo ""
}

# ── Check 5: Contratos ──
check_contracts() {
  echo "── Check 5: Contratos ──"

  if [ -f "ael/contracts/CONTRACTS.md" ]; then
    local size=$(wc -c < "ael/contracts/CONTRACTS.md" 2>/dev/null || echo "0")
    if [ "$size" -gt 100 ]; then
      pass "CONTRACTS.md válido"
    else
      warn "CONTRACTS.md muy corto"
    fi
  else
    fail "CONTRACTS.md no existe"
  fi

  if [ -f "ael/contracts/enforce.sh" ]; then
    if [ -x "ael/contracts/enforce.sh" ] || [ -f "ael/contracts/enforce.sh" ]; then
      pass "enforce.sh existe y es ejecutable"
    else
      warn "enforce.sh existe pero no es ejecutable"
    fi
  else
    fail "enforce.sh no existe"
  fi

  echo ""
}

# ── Check 6: Directorio de artefactos ──
check_artifacts() {
  echo "── Check 6: Directorio de artefactos ──"

  if [ -d "ael/artifacts" ]; then
    pass "ael/artifacts/ existe"
    local count=$(ls -1 ael/artifacts/*.md 2>/dev/null | wc -l || echo "0")
    if [ "$count" -gt 0 ]; then
      pass "Artefactos encontrados: $count archivos .md"
    else
      warn "Directorio vacío (pre-pipeline es esperado)"
    fi
  else
    warn "ael/artifacts/ no existe (se creará en primer pipeline)"
  fi

  echo ""
}

# ── Check 7: Sin duplicados/fuera-de-lugar ──
check_no_duplicates() {
  echo "── Check 7: Sin duplicados/fuera-de-lugar ──"

  local duplicates=0

  # Buscar agent*.ts, arnes*.ts, ARNES*.md en src/, raíz, docs/ fuera de ael/
  for pattern in "agent*.ts" "arnes*.ts" "ARNES*.md"; do
    local found=$(find src/ -name "$pattern" -not -path "*/node_modules/*" 2>/dev/null | head -5)
    if [ -n "$found" ]; then
      for f in $found; do
        if [ -f "$f" ]; then
          fail "Archivo duplicado/fuera de lugar: $f"
          duplicates=$((duplicates + 1))
        fi
      done
    fi
  done

  # Buscar en raíz (excluyendo docs/, ael/, .agents/, .opencode/)
  for pattern in "agent*.ts" "arnes*.ts" "ARNES*.md"; do
    local found=$(find . -maxdepth 1 -name "$pattern" 2>/dev/null)
    if [ -n "$found" ]; then
      for f in $found; do
        if [ -f "$f" ]; then
          fail "Archivo en raíz fuera de lugar: $f"
          duplicates=$((duplicates + 1))
        fi
      done
    fi
  done

  # Buscar agent*.ts o arnes*.ts en docs/ fuera de ael/
  for pattern in "agent*.ts" "arnes*.ts" "ARNES*.md"; do
    local found=$(find docs/ -name "$pattern" -not -path "*/ael/*" -not -path "*/adr/*" 2>/dev/null | head -5)
    if [ -n "$found" ]; then
      for f in $found; do
        if [ -f "$f" ]; then
          fail "Archivo en docs/ fuera de ael/: $f"
          duplicates=$((duplicates + 1))
        fi
      done
    fi
  done

  if [ $duplicates -eq 0 ]; then
    pass "Sin duplicados/fuera-de-lugar"
  fi

  echo ""
}

# ── Check 8: Cross-refs commands→roles ──
check_crossrefs_commands() {
  echo "── Check 8: Cross-refs commands→roles ──"

  local mismatches=0

  # Mapeo comando → rol esperado (en ael/government/roles/)
  local -A cmd_to_role
  cmd_to_role["ael-plan.md"]=""
  cmd_to_role["ael-explore.md"]="02-explorer.md"
  cmd_to_role["ael-design.md"]="03-architect.md"
  cmd_to_role["ael-implement.md"]="04-implementer.md"
  cmd_to_role["ael-validate.md"]="05-auditor.md"
  cmd_to_role["ael-enforce.md"]=""
  cmd_to_role["ael-remember.md"]="06-memory.md"
  cmd_to_role["ael-learn.md"]="07-learning.md"
  cmd_to_role["ael-diagnose.md"]=""

  for cmd in "${!cmd_to_role[@]}"; do
    local path=".opencode/commands/$cmd"
    local expected_role="${cmd_to_role[$cmd]}"

    if [ ! -f "$path" ]; then
      continue
    fi

    if [ -n "$expected_role" ]; then
      # Verificar que el comando referencia al rol correcto
      if grep -q "ael/government/roles/$expected_role" "$path" 2>/dev/null; then
        pass "$cmd → $expected_role ✓"
      else
        warn "$cmd no referencia ael/government/roles/$expected_role"
        mismatches=$((mismatches + 1))
      fi
    fi
  done

  if [ $mismatches -eq 0 ]; then
    pass "Todos los comandos referencian roles correctos"
  fi

  echo ""
}

# ── Check 9: Cross-refs agent→subagents ──
check_crossrefs_agent() {
  echo "── Check 9: Cross-refs agent→subagents ──"

  local agent=".opencode/agents/ael.md"

  if [ ! -f "$agent" ]; then
    warn "Agente no existe, skip cross-refs"
    echo ""
    return
  fi

  # Verificar que cada subagente tiene un command file
  local subagents=("ael-explore" "ael-design" "ael-implement" "ael-validate" "ael-remember" "ael-learn")
  local missing_cmds=0

  for sub in "${subagents[@]}"; do
    # El nombre del command es el mismo que el subagente con sufijo .md
    local cmd_path=".opencode/commands/$sub.md"
    if [ ! -f "$cmd_path" ]; then
      warn "Subagente '$sub' listado en ael.md pero sin command file: $cmd_path"
      missing_cmds=$((missing_cmds + 1))
    fi
  done

  if [ $missing_cmds -eq 0 ]; then
    pass "Todos los subagentes tienen command files"
  fi

  echo ""
}

# ── Generar reporte ──
generate_report() {
  mkdir -p ael/artifacts

  cat > "$REPORT" <<EOF
# DIAGNOSTIC_REPORT.md — ARNES Integrity Check
## Timestamp: $TIMESTAMP

### Resumen
| Check | Pass | Warn | Fail |
|-------|------|------|------|
| 1. Roles (7 fases) | — | — | — |
| 2. Comandos opencode (9) | — | — | — |
| 3. Agente principal | — | — | — |
| 4. Pipeline docs | — | — | — |
| 5. Contratos | — | — | — |
| 6. Directorio artefactos | — | — | — |
| 7. Sin duplicados | — | — | — |
| 8. Cross-refs commands→roles | — | — | — |
| 9. Cross-refs agent→subagents | — | — | — |

### Resultado final: $(if [ $FAILS -gt 0 ]; then echo "❌ FAIL ($FAILS failures, $WARNS warnings)"; elif [ $WARNS -gt 0 ]; then echo "⚠️  WARN ($WARNS warnings, sin failures)"; else echo "✅ PASS (todos los checks OK)"; fi)

### Detalle
$(if [ $FAILS -gt 0 ]; then echo "FAILURES encontrados — revisar output de consola para detalles"; elif [ $WARNS -gt 0 ]; then echo "WARNINGS detectados — no bloqueantes pero revisar"; else echo "Todos los checks pasaron correctamente"; fi)
EOF
}

# ── Ejecución ──
echo "=== AEL Integrity Diagnostic ==="
echo "Timestamp: $TIMESTAMP"
echo ""

check_roles
check_commands
check_agent
check_constitution_docs
check_contracts
check_artifacts
check_no_duplicates
check_crossrefs_commands
check_crossrefs_agent

# Generar reporte
generate_report

echo "=== Resultado ==="
echo "Pass: $PASSES | Warn: $WARNS | Fail: $FAILS"
echo ""

if [ $FAILS -gt 0 ]; then
  echo "❌ INTEGRITY FAIL — $FAILS failure(s) detectado(s)"
  echo "Reporte: $REPORT"
  exit 1
elif [ $WARNS -gt 0 ]; then
  echo "⚠️  INTEGRITY WARN — $WARNS warning(s), sin failures"
  echo "Reporte: $REPORT"
  exit 2
else
  echo "✅ INTEGRITY PASS — todos los checks OK"
  echo "Reporte: $REPORT"
  exit 0
fi
