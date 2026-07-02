#!/bin/bash
# AEL Contract Enforcement Script
# Verifica R1, R2, R3 automáticamente

set -e

RULE="${1:---all}"
FAILURES=0

echo "=== AEL Contract Enforcement ==="
echo ""

# ── R1: Contract Integrity ──
check_r1() {
  echo "[R1] Contract Integrity — AI no importa de Services"

  # Check: AI no importa de Services (excepto types y servicios transversales como i18n)
  VIOLATIONS=$(grep -rn "from.*@/lib/services/" src/lib/ai/ --include="*.ts" 2>/dev/null | grep -v "types" | grep -v "/i18n/" | grep -v "//.*from" || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "  FAIL: AI imports from Services"
    echo "$VIOLATIONS"
    FAILURES=$((FAILURES + 1))
  else
    echo "  PASS"
  fi

  # Check: response-builder no importa OpportunityResult de learning
  VIOLATIONS=$(grep -n "OpportunityResult" src/lib/ai/response-builder.ts 2>/dev/null | grep -v "types" || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "  WARN: response-builder references OpportunityResult (conceptual coupling)"
    echo "$VIOLATIONS"
  fi

  echo ""
}

# ── R2: Dependency Rules ──
check_r2() {
  echo "[R2] Dependency Rules — ADR 001-004"

  # ADR 001: Utils no importa de nada del proyecto
  VIOLATIONS=$(grep -rn "from.*@/lib/" src/lib/utils/ --include="*.ts" 2>/dev/null || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "  FAIL: Utils imports from project"
    echo "$VIOLATIONS"
    FAILURES=$((FAILURES + 1))
  else
    echo "  PASS: Utils is leaf"
  fi

  # ADR 002: Services usan facade, no db/core directamente
  VIOLATIONS=$(grep -rn "from.*db/core" src/lib/services/ --include="*.ts" 2>/dev/null || true)
  VIOLATIONS2=$(grep -rn "getDb()" src/lib/services/ --include="*.ts" 2>/dev/null || true)
  ALL_VIOLATIONS="${VIOLATIONS}${VIOLATIONS2}"
  if [ -n "$ALL_VIOLATIONS" ]; then
    echo "  FAIL: Services bypass DB facade"
    echo "$ALL_VIOLATIONS"
    FAILURES=$((FAILURES + 1))
  else
    echo "  PASS: DB facade respected"
  fi

  # ADR 004: survey.service no importa de lead.service
  VIOLATIONS=$(grep -rn "from.*lead.service" src/lib/services/trip-execution/ --include="*.ts" 2>/dev/null || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "  FAIL: Circular dependency survey→lead"
    echo "$VIOLATIONS"
    FAILURES=$((FAILURES + 1))
  else
    echo "  PASS: No circular dependencies"
  fi

  echo ""
}

# ── R4: AI-First Interpretation (ADR 005) ──
check_r4() {
  echo "[R4] AI-First Interpretation — no heuristic patches in DB queries"

  # Check: geo.ts no tiene CASE/WHEN en ORDER BY
  VIOLATIONS=$(grep -n "CASE.*WHEN" src/lib/db/domains/geo.ts 2>/dev/null | grep -i "order" || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "  FAIL: Heuristic CASE/WHEN ranking in geo.ts"
    echo "$VIOLATIONS"
    FAILURES=$((FAILURES + 1))
  else
    echo "  PASS: No heuristic ORDER BY in geo.ts"
  fi

  # Check: geo.ts no tiene mapas de prioridad hardcodeados
  VIOLATIONS=$(grep -n "_PRIORITY" src/lib/db/domains/geo.ts 2>/dev/null || true)
  if [ -n "$VIOLATIONS" ]; then
    echo "  FAIL: Hardcoded priority map in geo.ts"
    echo "$VIOLATIONS"
    FAILURES=$((FAILURES + 1))
  else
    echo "  PASS: No priority maps in geo.ts"
  fi

  echo ""
}

# ── R3: Code Existence ──
check_r3() {
  echo "[R3] Code Existence Validation"

  if [ -f "ael/artifacts/DESIGN_SPEC.md" ]; then
    # Extract file references from DESIGN_SPEC
    FILES=$(grep -oP 'src/[^\s`"'"'"']+' ael/artifacts/DESIGN_SPEC.md 2>/dev/null | sort -u || true)
    for file in $FILES; do
      if [ ! -f "$file" ]; then
        echo "  FAIL: Referenced file does not exist: $file"
        FAILURES=$((FAILURES + 1))
      fi
    done
    if [ $FAILURES -eq 0 ]; then
      echo "  PASS: All referenced files exist"
    fi
  else
    echo "  SKIP: No DESIGN_SPEC.md found"
  fi

  echo ""
}

# ── Execute ──
case "$RULE" in
  --rule)
    shift
    case "$1" in
      R1) check_r1 ;;
      R2) check_r2 ;;
      R3) check_r3 ;;
      R4) check_r4 ;;
      *) echo "Unknown rule: $1"; exit 1 ;;
    esac
    ;;
  --all|*)
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
