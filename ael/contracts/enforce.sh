#!/bin/bash
# ARNÉS Contract Enforcement Script
# Verifica R1, R2, R3, R4 usando reglas parametrizadas por producto.
# Las reglas específicas del producto están en ael/contracts/product-rules.json
#
# Uso:
#   bash ael/contracts/enforce.sh              # todas las reglas
#   bash ael/contracts/enforce.sh --rule R1    # una regla específica
#   bash ael/contracts/enforce.sh --validate-schema  # validar schema

set -e

RULE="${1:---all}"
FAILURES=0
RULES_FILE="ael/contracts/product-rules.json"

# ── Helpers ──
HAS_JQ=false
HAS_PWSH=false

command -v jq &> /dev/null && HAS_JQ=true
# On Windows, powershell.exe is more reliably found than powershell
( command -v powershell.exe &> /dev/null || command -v powershell &> /dev/null ) && HAS_PWSH=true
# Determine the correct powershell command
if command -v powershell.exe &> /dev/null; then
  PWSH_CMD="powershell.exe"
elif command -v powershell &> /dev/null; then
  PWSH_CMD="powershell"
else
  PWSH_CMD=""
fi

extract() {
  local query="$1"
  if $HAS_JQ; then
    jq -r "$query" "$RULES_FILE" 2>/dev/null || echo ""
  elif $HAS_PWSH; then
    $PWSH_CMD -NoProfile -File ael/contracts/extract-json.ps1 -Query "$query" 2>/dev/null | tr -d '\r'
  else
    echo ""
  fi
}

# ── R1: Contract Integrity ──
check_r1() {
  echo "[R1] Contract Integrity — verifies layer import contracts"

  local count=$(extract '.rules.r1_contract_integrity.forbidden_imports | length')
  if [ -z "$count" ] || [ "$count" = "0" ] || [ "$count" = "null" ]; then
    echo "  SKIP: No R1 rules configured"
    echo ""
    return
  fi

  for i in $(seq 0 $((count - 1))); do
    local desc=$(extract ".rules.r1_contract_integrity.forbidden_imports[$i].description")
    local from=$(extract ".rules.r1_contract_integrity.forbidden_imports[$i].from_path")
    local pattern=$(extract ".rules.r1_contract_integrity.forbidden_imports[$i].import_pattern")

    echo "  Check: $desc"
    VIOLATIONS=$(grep -rn "$pattern" "$from" --include="*.ts" 2>/dev/null | grep -v "//.*from" || true)

    # Apply exclusions
    local excount=$(extract ".rules.r1_contract_integrity.forbidden_imports[$i].except_patterns | length")
    if [ -n "$excount" ] && [ "$excount" != "0" ] && [ "$excount" != "null" ] && [ -n "$VIOLATIONS" ]; then
      for j in $(seq 0 $((excount - 1))); do
        local ex=$(extract ".rules.r1_contract_integrity.forbidden_imports[$i].except_patterns[$j]")
        VIOLATIONS=$(echo "$VIOLATIONS" | grep -v "$ex" || true)
      done
    fi

    if [ -n "$VIOLATIONS" ]; then
      echo "  FAIL: $desc"
      echo "$VIOLATIONS"
      FAILURES=$((FAILURES + 1))
    else
      echo "  PASS"
    fi
  done

  # Warnings
  local wcount=$(extract '.rules.r1_contract_integrity.warnings | length')
  if [ -n "$wcount" ] && [ "$wcount" != "0" ] && [ "$wcount" != "null" ]; then
    for i in $(seq 0 $((wcount - 1))); do
      local wdesc=$(extract ".rules.r1_contract_integrity.warnings[$i].description")
      local wfrom=$(extract ".rules.r1_contract_integrity.warnings[$i].from_path")
      local wpattern=$(extract ".rules.r1_contract_integrity.warnings[$i].pattern")
      WARN=$(grep -n "$wpattern" "$wfrom" 2>/dev/null | grep -v "types" || true)
      if [ -n "$WARN" ]; then
        echo "  WARN: $wdesc"
        echo "$WARN"
      fi
    done
  fi

  echo ""
}

# ── R2: Dependency Rules ──
check_r2() {
  echo "[R2] Dependency Rules — verifies ADR compliance"

  # Layer constraints
  local lcount=$(extract '.rules.r2_dependency_rules.layer_constraints | length')
  if [ -n "$lcount" ] && [ "$lcount" != "0" ] && [ "$lcount" != "null" ]; then
    for i in $(seq 0 $((lcount - 1))); do
      local desc=$(extract ".rules.r2_dependency_rules.layer_constraints[$i].description")
      local path=$(extract ".rules.r2_dependency_rules.layer_constraints[$i].search_path")
      local pat=$(extract ".rules.r2_dependency_rules.layer_constraints[$i].forbidden_pattern")

      VIOLATIONS=$(grep -rn "$pat" "$path" --include="*.ts" 2>/dev/null || true)
      if [ -n "$VIOLATIONS" ]; then
        echo "  FAIL: $desc"
        echo "$VIOLATIONS"
        FAILURES=$((FAILURES + 1))
      else
        echo "  PASS: $desc"
      fi
    done
  fi

  # Facade checks
  local fcount=$(extract '.rules.r2_dependency_rules.facade_checks | length')
  if [ -n "$fcount" ] && [ "$fcount" != "0" ] && [ "$fcount" != "null" ]; then
    for i in $(seq 0 $((fcount - 1))); do
      local desc=$(extract ".rules.r2_dependency_rules.facade_checks[$i].description")
      local path=$(extract ".rules.r2_dependency_rules.facade_checks[$i].search_path")
      local pat=$(extract ".rules.r2_dependency_rules.facade_checks[$i].pattern")

      VIOLATIONS=$(grep -rn "$pat" "$path" --include="*.ts" 2>/dev/null || true)
      if [ -n "$VIOLATIONS" ]; then
        echo "  FAIL: $desc"
        echo "$VIOLATIONS"
        FAILURES=$((FAILURES + 1))
      else
        echo "  PASS: $desc"
      fi
    done
  fi

  if [ -z "$lcount" ] || [ "$lcount" = "0" ] || [ "$lcount" = "null" ]; then
    if [ -z "$fcount" ] || [ "$fcount" = "0" ] || [ "$fcount" = "null" ]; then
      echo "  SKIP: No R2 rules configured"
    fi
  fi

  echo ""
}

# ── R3: Code Existence ──
check_r3() {
  echo "[R3] Code Existence Validation"

  local specs=$(extract '.rules.r3_code_existence.spec_files | join(" ")' 2>/dev/null || echo "")

  if [ -z "$specs" ] || [ "$specs" = "null" ]; then
    echo "  SKIP: No R3 spec files configured"
    echo ""
    return
  fi

  for spec in $specs; do
    # Remove jq quotes if present
    spec=$(echo "$spec" | tr -d '"')
    if [ -f "$spec" ]; then
      FILES=$(grep -oP 'src/[^\s`"'"'"']+' "$spec" 2>/dev/null | sort -u || true)
      for file in $FILES; do
        if [ ! -f "$file" ]; then
          echo "  FAIL: Referenced file does not exist: $file"
          FAILURES=$((FAILURES + 1))
        fi
      done
      if [ $FAILURES -eq 0 ]; then
        echo "  PASS: All referenced files exist ($spec)"
      fi
    else
      echo "  SKIP: Spec file not found: $spec"
    fi
  done

  echo ""
}

# ── R4: AI-First Interpretation ──
check_r4() {
  echo "[R4] AI-First Interpretation — no heuristic patches"

  # No heuristic ranking
  local hcount=$(extract '.rules.r4_ai_first.no_heuristic_ranking | length')
  if [ -n "$hcount" ] && [ "$hcount" != "0" ] && [ "$hcount" != "null" ]; then
    for i in $(seq 0 $((hcount - 1))); do
      local desc=$(extract ".rules.r4_ai_first.no_heuristic_ranking[$i].description")
      local file=$(extract ".rules.r4_ai_first.no_heuristic_ranking[$i].file")
      local pat=$(extract ".rules.r4_ai_first.no_heuristic_ranking[$i].pattern")

      VIOLATIONS=$(grep -n "$pat" "$file" 2>/dev/null | grep -i "order" || true)
      if [ -n "$VIOLATIONS" ]; then
        echo "  FAIL: $desc"
        echo "$VIOLATIONS"
        FAILURES=$((FAILURES + 1))
      else
        echo "  PASS: $desc"
      fi
    done
  fi

  # No hardcoded priorities
  local pcount=$(extract '.rules.r4_ai_first.no_hardcoded_priorities | length')
  if [ -n "$pcount" ] && [ "$pcount" != "0" ] && [ "$pcount" != "null" ]; then
    for i in $(seq 0 $((pcount - 1))); do
      local desc=$(extract ".rules.r4_ai_first.no_hardcoded_priorities[$i].description")
      local file=$(extract ".rules.r4_ai_first.no_hardcoded_priorities[$i].file")
      local pat=$(extract ".rules.r4_ai_first.no_hardcoded_priorities[$i].pattern")

      VIOLATIONS=$(grep -n "$pat" "$file" 2>/dev/null || true)
      if [ -n "$VIOLATIONS" ]; then
        echo "  FAIL: $desc"
        echo "$VIOLATIONS"
        FAILURES=$((FAILURES + 1))
      else
        echo "  PASS: $desc"
      fi
    done
  fi

  if [ -z "$hcount" ] || [ "$hcount" = "0" ] || [ "$hcount" = "null" ]; then
    if [ -z "$pcount" ] || [ "$pcount" = "0" ] || [ "$pcount" = "null" ]; then
      echo "  SKIP: No R4 rules configured"
    fi
  fi

  echo ""
}

# ── Execute ──
case "$RULE" in
  --validate-schema)
    echo "=== Schema Validation ==="
    if [ -f "$RULES_FILE" ]; then
      echo "PASS: product-rules.json exists"
      if $HAS_JQ; then
        jq empty "$RULES_FILE" 2>/dev/null && echo "PASS: Valid JSON" || echo "FAIL: Invalid JSON"
      elif $HAS_PWSH; then
        VALID=$(powershell -NoProfile -File ael/contracts/extract-json.ps1 -Query ".product" 2>/dev/null)
        if [ -n "$VALID" ]; then
          echo "PASS: Valid JSON"
        else
          echo "FAIL: Invalid JSON or cannot parse"
        fi
      fi
      echo "PASS: Schema validation complete"
    else
      echo "FAIL: $RULES_FILE not found"
      exit 1
    fi
    ;;
  --rule)
    shift
    if [ ! -f "$RULES_FILE" ]; then
      echo "WARN: $RULES_FILE not found. Enforcement may be incomplete."
    fi
    case "$1" in
      R1) check_r1 ;;
      R2) check_r2 ;;
      R3) check_r3 ;;
      R4) check_r4 ;;
      *) echo "Unknown rule: $1"; exit 1 ;;
    esac
    ;;
  --all|*)
    echo "=== ARNÉS Contract Enforcement ==="
    echo "Product: $(extract '.product' 2>/dev/null || echo 'unknown')"
    echo ""
    if [ ! -f "$RULES_FILE" ]; then
      echo "WARN: $RULES_FILE not found. No product-specific rules loaded."
      echo ""
    fi
    check_r1
    check_r2
    check_r3
    check_r4
    ;;
esac

echo "=== Result ==="
if [ $FAILURES -gt 0 ]; then
  echo "FAIL: $FAILURES violation(s) detected"
  exit 1
else
  echo "PASS: All contracts respected"
  exit 0
fi
