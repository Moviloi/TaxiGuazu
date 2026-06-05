// FASE 8: Experimentation Layer Tests
// 22 tests covering variant distribution, shadow safety, experiment deltas, regression.

import { core } from "../src/lib/ai/core";
import { router, route } from "../src/lib/ai/router";
import { applyPolicy } from "../src/lib/ai/policy";
import { getVariant, hashCode, applyVariantPolicy, runShadowPolicy, compareDecisions } from "../src/lib/ai/experiment";
import type { PolicyVariant } from "../src/lib/ai/experiment/types";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok ? "" : `\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`}`);
  if (ok) pass++; else fail++;
}
function ok(label: string, value: unknown) {
  check(label, !!value, true);
}

console.log("\n=== VARIANT DISTRIBUTION ===");
{
  const ids = Array.from({ length: 1000 }, (_, i) => `id-${i}`);
  const counts: Record<PolicyVariant, number> = { CONTROL: 0, EXPERIMENT_A: 0, EXPERIMENT_B: 0 };
  for (const id of ids) {
    counts[getVariant(id)]++;
  }
  ok("D010 getVariant returns valid variant", counts.CONTROL + counts.EXPERIMENT_A + counts.EXPERIMENT_B === 1000);
  check("D020 CONTROL ~70%", counts.CONTROL > 600 && counts.CONTROL < 800, true);
  check("D030 EXPERIMENT_A ~15%", counts.EXPERIMENT_A > 50 && counts.EXPERIMENT_A < 250, true);
  check("D040 EXPERIMENT_B ~15%", counts.EXPERIMENT_B > 50 && counts.EXPERIMENT_B < 250, true);
  const id = "test-123";
  check("D050 deterministic (same id)", getVariant(id), getVariant(id));
  check("D060 hashCode deterministic", hashCode("abc"), hashCode("abc"));
}

console.log("\n=== SHADOW SAFETY ===");
{
  const input = core("hola");
  const shadow = runShadowPolicy(input);
  ok("S010 shadow returns PolicyDecision", !!shadow.action);
  const real = applyPolicy(input);
  const comparison = compareDecisions(real, shadow);
  ok("S020 comparison.sameAction defined", comparison.sameAction !== undefined);
  ok("S020 comparison.impactLevel defined", !!comparison.impactLevel);
  // shadow failure must never throw
  let threw = false;
  try {
    (runShadowPolicy as any)(null);
  } catch {
    threw = true;
  }
  check("S030 shadow failure silent", threw, false);
}

console.log("\n=== CONTROL CONSISTENCY ===");
{
  const input = core("hola");
  const control = applyVariantPolicy(input, "CONTROL");
  const base = applyPolicy(input);
  check("C010 CONTROL == applyPolicy action", control.action, base.action);
  check("C010 CONTROL == applyPolicy confidence", control.confidence, base.confidence);

  const input2 = core("emergencia");
  const control2 = applyVariantPolicy(input2, "CONTROL");
  const base2 = applyPolicy(input2);
  check("C020 CONTROL == applyPolicy (emergency)", control2.action, base2.action);

  const input3 = core("quiero reservar");
  const control3 = applyVariantPolicy(input3, "CONTROL");
  const base3 = applyPolicy(input3);
  check("C030 CONTROL == applyPolicy (booking)", control3.action, base3.action);
}

console.log("\n=== EXPERIMENT DELTA ===");
{
  const bookingInput = core("quiero reservar para 3 personas");

  const control = applyVariantPolicy(bookingInput, "CONTROL");
  const expA = applyVariantPolicy(bookingInput, "EXPERIMENT_A");
  const expB = applyVariantPolicy(bookingInput, "EXPERIMENT_B");

  // Experiments CAN differ from CONTROL
  // At minimum, they must produce valid outputs
  ok("E010 EXPERIMENT_A produces valid action", expA.action.length > 0);
  ok("E020 EXPERIMENT_B produces valid action", expB.action.length > 0);

  // Both must include experiment reasonCode if diverged
  if (expA.action !== control.action) {
    ok("E030 EXPERIMENT_A has experiment reasonCode", expA.reasonCodes.some((r) => r.startsWith("EXPERIMENT_A")));
  }
  if (expB.action !== control.action) {
    ok("E040 EXPERIMENT_B has experiment reasonCode", expB.reasonCodes.some((r) => r.startsWith("EXPERIMENT_B")));
  }
}

console.log("\n=== REGRESSION ===");
{
  const c = core("emergencia");
  const p = applyPolicy(c);
  check("RE010 emergency action unchanged", p.action, "ESCALATE_EMERGENCY");

  const routeResult = route({ action: "PROCEED_BOOKING", confidence: 0.8, reasonCodes: ["BOOKING"], metadata: {} });
  ok("RE020 route returns handler", !!routeResult);
  check("RE020 route handler", routeResult!.handler, "booking");

  const result = router("hola", "RESERVA");
  check("RE030 router greeting unchanged", result.decision, "CLARIFY");

  // applyPolicy unchanged
  const nonExp = applyPolicy(core("estoy en casa quiero ir al aeropuerto ahora"));
  check("RE040 NOW action via applyPolicy", nonExp.action, "PROCEED_NOW");
}

console.log(`\n${pass} pass, ${fail} fail${fail > 0 ? " ***" : ""}`);
if (fail > 0) process.exit(1);
