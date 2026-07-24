#!/bin/bash
# ARNÉS Framework — System Diagnostic v2.0
# Verifica la integridad del ecosistema ARNÉS/OpenCode.
# Arquitectura: ARNÉS v1.1.0 (congelada).

set -euo pipefail
PASS=0; FAIL=0; WARN=0
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  WARN: $1"; WARN=$((WARN+1)); }
check_file() { if [ -f "$1" ]; then pass "$2"; else fail "$2 — file missing: $1"; fi; }
check_dir()  { if [ -d "$1" ]; then pass "$2"; else fail "$2 — directory missing: $1"; fi; }

echo "═══════════════════════════════════════════════"
echo " ARNÉS Framework — System Diagnostic v2.0"
echo "═══════════════════════════════════════════════"
echo ""

# ── Check 1: Constitution ──
echo "🔍 Check 1 — Constitution (Nivel 0)"
check_file "$ROOT/docs/arnes/ARNES_CONSTITUTION.md" "ARNES_CONSTITUTION.md"
echo ""

# ── Check 2: Governance (Nivel 1) ──
echo "🔍 Check 2 — Governance (Nivel 1)"
check_file "$ROOT/docs/arnes/COGNITIVE_ARCHITECTURE.md" "COGNITIVE_ARCHITECTURE.md"
check_file "$ROOT/docs/arnes/COGNITIVE_OBJECT_MODEL.md" "COGNITIVE_OBJECT_MODEL.md"
check_file "$ROOT/docs/arnes/GOVERNANCE.md" "GOVERNANCE.md"
check_file "$ROOT/docs/arnes/VERSIONING.md" "VERSIONING.md"
check_file "$ROOT/docs/arnes/FRAMEWORK_IMPLEMENTATION_MODEL.md" "FRAMEWORK_IMPLEMENTATION_MODEL.md"
check_file "$ROOT/docs/arnes/BASELINE_v1.0.0.md" "BASELINE_v1.0.0.md"
echo ""

# ── Check 3: Operational Specs (Nivel 2) ──
echo "🔍 Check 3 — Operational Specs (Nivel 2)"
check_file "$ROOT/ael/constitution/SPEC.md" "SPEC.md"
check_file "$ROOT/ael/constitution/CONTRACTS.md" "CONTRACTS.md (constitution)"
check_file "$ROOT/ael/government/ORGANIZATION.md" "ORGANIZATION.md"
echo ""

# ── Check 4: Roles (6 capabilities) ──
echo "🔍 Check 4 — Role Contracts (6 capabilities)"
for role in 02-explorer 03-architect 04-implementer 05-auditor 06-memory 07-learning; do
  check_file "$ROOT/ael/government/roles/${role}.md" "${role}.md"
done
echo ""

# ── Check 5: Agents in opencode.json ──
echo "🔍 Check 5 — Agents in opencode.json"
AGENTS=("plan" "build" "arnes" "light-planner" "ael-explore" "ael-architect" "ael-implementer" "ael-audit" "ael-memory" "ael-learning")
for agent in "${AGENTS[@]}"; do
  if grep -q "\"$agent\"" "$ROOT/opencode.json" 2>/dev/null; then
    pass "Agent '$agent' configured in opencode.json"
  else
    fail "Agent '$agent' NOT found in opencode.json"
  fi
done
echo ""

# ── Check 6: Agent Prompts ──
echo "🔍 Check 6 — Agent Prompts"
PROMPTS=("plan" "build" "arnes" "light-planner" "ael-explore" "ael-architect" "ael-implementer" "ael-audit" "ael-memory" "ael-learning")
for prompt in "${PROMPTS[@]}"; do
  check_file "$ROOT/.opencode/agents/${prompt}.md" "${prompt}.md"
done
echo ""

# ── Check 7: Model Governance ──
echo "🔍 Check 7 — Model Governance"
# Current Model: solo PLAN
if grep -A5 '"plan"' "$ROOT/opencode.json" | grep -q '"model"'; then
  warn "PLAN has explicit model — should use Current Model (no model field)"
else
  pass "PLAN uses Current Model (no explicit model override)"
fi

# Free models: BUILD, ARNÉS, light-planner, subagentes
FREE_AGENTS=("build" "arnes" "light-planner" "ael-explore")
for agent in "${FREE_AGENTS[@]}"; do
  if grep -A10 "\"$agent\"" "$ROOT/opencode.json" | grep -q '"model"'; then
    pass "$agent has explicit free model"
  else
    warn "$agent has no explicit model — may inherit Current Model"
  fi
done
echo ""

# ── Check 8: Contracts & Enforcement ──
echo "🔍 Check 8 — Contracts & Enforcement"
check_file "$ROOT/ael/contracts/enforce.sh" "enforce.sh"
check_file "$ROOT/ael/contracts/product-rules.json" "product-rules.json"
check_file "$ROOT/ael/contracts/product-rules.schema.json" "product-rules.schema.json"
check_file "$ROOT/ael/contracts/runtime-profile.json" "runtime-profile.json"
check_file "$ROOT/ael/contracts/runtime-profile.schema.json" "runtime-profile.schema.json"

# Validate runtime-profile.json against schema (if jq available)
if command -v jq &>/dev/null && command -v npx &>/dev/null; then
  if npx ajv validate -s "$ROOT/ael/contracts/runtime-profile.schema.json" -d "$ROOT/ael/contracts/runtime-profile.json" 2>/dev/null; then
    pass "runtime-profile.json validates against schema"
  else
    warn "runtime-profile.json schema validation skipped (ajv not available or validation failed)"
  fi
else
  warn "jq not available — skipping schema validation"
fi
echo ""

# ── Check 9: No legacy artifacts ──
echo "🔍 Check 9 — Legacy Artifact Detection"
# AMC should NOT be an active role
if [ -f "$ROOT/ael/government/roles/01-mission-coordinator.md" ]; then
  fail "AMC role still active: ael/government/roles/01-mission-coordinator.md"
else
  pass "AMC role archived (not in active roles)"
fi

# ael-coordinator should NOT be in opencode.json
if grep -q "ael-coordinator" "$ROOT/opencode.json" 2>/dev/null; then
  fail "ael-coordinator still configured in opencode.json"
else
  pass "ael-coordinator removed from opencode.json"
fi

# No legacy ael.md agent
if [ -f "$ROOT/.opencode/agents/ael.md" ]; then
  warn "Legacy ael.md agent prompt still exists"
else
  pass "No legacy ael.md agent prompt"
fi
echo ""

# ── Summary ──
echo "═══════════════════════════════════════════════"
echo " DIAGNOSTIC SUMMARY"
echo "═══════════════════════════════════════════════"
echo "  ✅ PASS:  $PASS"
echo "  ❌ FAIL:  $FAIL"
echo "  ⚠️  WARN:  $WARN"
echo ""

TOTAL=$((PASS + FAIL + WARN))
if [ $FAIL -gt 0 ]; then
  echo "VERDICT: ❌ FAIL — $FAIL checks failed. Review and fix before proceeding."
  exit 1
elif [ $WARN -gt 0 ]; then
  echo "VERDICT: ⚠️  WARN — $WARN warnings. System is functional but has non-critical issues."
  exit 0
else
  echo "VERDICT: ✅ PASS — All $PASS checks passed. System integrity confirmed."
  exit 0
fi
