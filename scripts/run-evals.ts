// AIT-052: Eval runner — mide calidad de respuestas del bot
// Uso: npx tsx scripts/run-evals.ts
//
// Ejecuta core() + router() + FRUSTRATION_RE contra el dataset
// y reporta precisión de intent, output_type, recall de slots,
// tasa de falsos positivos/negativos de escalación y frustración.

import * as fs from "node:fs";
import * as path from "node:path";
import { core } from "@/lib/ai/core";
import { router } from "@/lib/ai/router";
import type { CoreDecision, FinalDecision, Intent, OutputType } from "@/lib/ai/types";
import DATASET from "./eval-cases/dataset";
import type { EvalCase } from "./eval-cases/dataset";

// ── Tipos de resultado ──────────────────────────────────────────────

interface FieldResult {
  field: string;
  expected: string;
  actual: string;
  pass: boolean;
}

interface EvalResult {
  caseId: string;
  lang: string;
  input: string;
  tags: string[];
  coreResult: CoreDecision | null;
  routerResult: FinalDecision | null;
  frustrationMatch: boolean;
  fields: FieldResult[];
  totalFields: number;
  passedFields: number;
  coreError: string | null;
  /** Informativo: coherencia de escalación (no cuenta para pass/fail) */
  escalationCoherent: boolean;
  shouldEscalate: boolean;
  wouldEscalateByCore: boolean;
}

interface Summary {
  total: number;
  passed: number;
  failed: number;
  intentCorrect: number;
  outputTypeCorrect: number;
  frustrationCorrect: number;
  slotRecallTotal: number;
  slotRecallPassed: number;
  escalationFP: number;  // falsos positivos de escalación
  escalationFN: number;  // falsos negativos de escalación
  frustrationFP: number; // falsos positivos de frustración
  frustrationFN: number; // falsos negativos de frustración
}

// ── FRUSTRATION_RE (mismo patrón que comprehension-runner.ts) ───────

const FRUSTRATION_RE = /\b(ya\s+(te\s+)?dije|ya\s+respond[ií]|no\s+entend[ée]s|ya\s+lo\s+dije|te\s+lo\s+dije|obvio|evidente|ya\s+contest[ée]|repito|otra\s+vez|no\s+me\s+escuch[áa]s|no\s+le[ée]s|le[ée]\s+bien|ya\s+esta\s+respondid[ao]|ya\s+te\s+lo\s+dije|ya\s+te\s+contest[ée])/i;

// ── Helpers ─────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function passFail(p: boolean): string {
  return p ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

function checkFacts(coreFacts: string[], expectedFacts: string[]): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const expected of expectedFacts) {
    // Check if the expected fact key:value is contained in any actual fact
    const matched = coreFacts.some((f) => f.startsWith(expected));
    if (matched) {
      found.push(expected);
    } else {
      missing.push(expected);
    }
  }
  return { found, missing };
}

// ── Evaluación de un caso ─────────────────────────────────────────

function evaluateCase(c: EvalCase): EvalResult {
  const fields: FieldResult[] = [];
  let coreResult: CoreDecision | null = null;
  let routerResult: FinalDecision | null = null;
  let coreError: string | null = null;

  // 1. Ejecutar core()
  try {
    coreResult = core(c.input);

    // Intent
    fields.push({
      field: "intent",
      expected: c.expectedIntent,
      actual: coreResult.intent,
      pass: coreResult.intent === c.expectedIntent,
    });

    // Confidence
    fields.push({
      field: "confidence",
      expected: `>= ${c.expectedMinConfidence}`,
      actual: coreResult.confidence.toFixed(3),
      pass: coreResult.confidence >= c.expectedMinConfidence,
    });

    // Facts (slot recall)
    const { found, missing } = checkFacts(coreResult.facts, c.expectedFacts);
    for (const f of found) {
      fields.push({
        field: `fact:${f}`,
        expected: "present",
        actual: "present",
        pass: true,
      });
    }
    for (const f of missing) {
      fields.push({
        field: `fact:${f}`,
        expected: "present",
        actual: "missing",
        pass: false,
      });
    }

    // 2. Ejecutar router()
    routerResult = router(coreResult, c.mode);
    fields.push({
      field: "outputType",
      expected: c.expectedOutputType,
      actual: routerResult.decision,
      pass: routerResult.decision === c.expectedOutputType,
    });

    // Mode
    fields.push({
      field: "mode",
      expected: c.mode,
      actual: routerResult.mode,
      pass: routerResult.mode === c.mode,
    });
  } catch (err) {
    coreError = err instanceof Error ? err.message : String(err);
  }

  // 3. FRUSTRATION_RE
  const frustrationMatch = FRUSTRATION_RE.test(c.input);
  fields.push({
    field: "frustration",
    expected: c.expectFrustration ? "trigger" : "no_trigger",
    actual: frustrationMatch ? "trigger" : "no_trigger",
    pass: frustrationMatch === c.expectFrustration,
  });

  // 4. Escalación (métrica INFORMATIVA — no cuenta como pass/fail)
  // La decisión real de escalación está en comprehension-runner.ts, no en core+router.
  // core() con alta confianza e intent claro NO escala; baja confianza o intents
  // ambiguos SÍ escalan. Pero la frustración real se detecta aparte vía FRUSTRATION_RE.
  const lowConfidence = coreResult ? coreResult.confidence < 0.4 : true;
  const wouldEscalateByCore = lowConfidence
    || coreResult?.intent === "AMBIGUOUS"
    || coreResult?.intent === "CONSULTA"
    || c.expectFrustration; // si hay frustración, el sistema real escalaría

  const passedFields = fields.filter((f) => f.pass).length;

  return {
    caseId: c.id,
    lang: c.lang,
    input: c.input,
    tags: c.tags,
    coreResult,
    routerResult,
    frustrationMatch,
    fields,
    totalFields: fields.length,
    passedFields,
    coreError,
    escalationCoherent: wouldEscalateByCore === c.shouldEscalate,
    shouldEscalate: c.shouldEscalate,
    wouldEscalateByCore,
  };
}

// ── Reporte ────────────────────────────────────────────────────────

function printResults(results: EvalResult[], summary: Summary): void {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  AIT-052 — Eval Results (${results.length} cases)${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);

  // ── Tabla detallada ──
  console.log(`${BOLD}${padRight("ID", 18)} ${padRight("Lang", 5)} ${padRight("Intent", 16)} ${padRight("Output", 12)} ${padRight("Conf", 8)} ${padRight("Frust", 8)} ${padRight("Escal*", 8)} ${padRight("Slots", 8)} RESULT${RESET}`);
  console.log("─".repeat(95));

  for (const r of results) {
    const intentField = r.fields.find((f) => f.field === "intent");
    const outputField = r.fields.find((f) => f.field === "outputType");
    const confField = r.fields.find((f) => f.field === "confidence");
    const frustField = r.fields.find((f) => f.field === "frustration");

    // All pass/fail fields EXCEPT escalation
    const passFailFields = r.fields.filter((f) => f.field !== "frustration" || true); // all fields except... actually all are pass/fail now
    const allPass = r.fields.every((f) => f.pass);
    const resultStr = allPass ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;

    const intentStr = intentField
      ? `${intentField.pass ? GREEN : RED}${padRight(intentField.actual, 14)}${RESET}`
      : `${RED}${padRight("ERROR", 14)}${RESET}`;

    const outputStr = outputField
      ? `${outputField.pass ? GREEN : RED}${padRight(outputField.actual, 10)}${RESET}`
      : `${RED}${padRight("ERROR", 10)}${RESET}`;

    const confStr = confField
      ? `${confField.pass ? GREEN : RED}${padRight(confField.actual, 6)}${RESET}`
      : `${RED}${padRight("ERR", 6)}${RESET}`;

    const frustStr = frustField
      ? `${frustField.pass ? GREEN : RED}${padRight(frustField.actual === "trigger" ? "TRIGGER" : "silent", 6)}${RESET}`
      : `${RED}${padRight("ERR", 6)}${RESET}`;

    // Escalation column: informativo, usa amarillo/cyan (no verde/rojo)
    const escalDisplay = r.wouldEscalateByCore ? "ESCALATE" : "NO_ESC";
    const escalColor = r.escalationCoherent ? CYAN : YELLOW;
    const escalStr = `${escalColor}${padRight(escalDisplay, 6)}${RESET}`;

    const slotCountStr = `${r.fields.filter((f) => f.field.startsWith("fact:") && f.pass).length}/${r.fields.filter((f) => f.field.startsWith("fact:")).length}`;

    console.log(
      `${padRight(r.caseId, 18)} ` +
      `${padRight(r.lang, 5)} ` +
      `${intentStr} ` +
      `${outputStr} ` +
      `${confStr} ` +
      `${frustStr} ` +
      `${escalStr} ` +
      `${slotCountStr} ` +
      `${resultStr}`,
    );

    // Print input if failed
    if (!allPass) {
      console.log(`  ${YELLOW}→${RESET} "${truncate(r.input, 80)}"`);
      // Print specific failures
      const failures = r.fields.filter((f) => !f.pass);
      for (const f of failures) {
        console.log(`  ${RED}✗ ${f.field}: expected ${f.expected}, got ${f.actual}${RESET}`);
      }
    }
  }

  // ── Resumen ──
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  SUMMARY${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);

  const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : "0.0";
  const intentRate = summary.total > 0 ? (summary.intentCorrect / summary.total * 100).toFixed(1) : "0.0";
  const outputRate = summary.total > 0 ? (summary.outputTypeCorrect / summary.total * 100).toFixed(1) : "0.0";
  const frustRate = summary.total > 0 ? (summary.frustrationCorrect / summary.total * 100).toFixed(1) : "0.0";
  const slotRecall = summary.slotRecallTotal > 0 ? (summary.slotRecallPassed / summary.slotRecallTotal * 100).toFixed(1) : "0.0";

  console.log(`  ${BOLD}Overall:${RESET}     ${summary.passed}/${summary.total} cases passed (${passRate}%)`);
  console.log(`  ${BOLD}Intent:${RESET}      ${summary.intentCorrect}/${summary.total} correct (${intentRate}%)`);
  console.log(`  ${BOLD}OutputType:${RESET}  ${summary.outputTypeCorrect}/${summary.total} correct (${outputRate}%)`);
  console.log(`  ${BOLD}Frustration:${RESET} ${summary.frustrationCorrect}/${summary.total} correct (${frustRate}%)`);
  console.log(`  ${BOLD}Slot recall:${RESET} ${summary.slotRecallPassed}/${summary.slotRecallTotal} facts (${slotRecall}%)`);
  console.log(`  ${BOLD}Escalation FP*:${RESET} ${summary.escalationFP}  (core+router heuristic, not actual escalation)`);
  console.log(`  ${BOLD}Escalation FN*:${RESET} ${summary.escalationFN}  (core+router heuristic, not actual escalation)`);
  console.log(`  ${BOLD}Frustration FP:${RESET} ${summary.frustrationFP}`);
  console.log(`  ${BOLD}Frustration FN:${RESET} ${summary.frustrationFN}`);
  console.log(`  ${YELLOW}* Escalation column is INFORMATIVE — actual escalation depends on comprehension-runner.ts, not on core+router alone${RESET}`);

  // Tag-based breakdown
  const tags = new Map<string, { total: number; passed: number }>();
  for (let i = 0; i < results.length; i++) {
    for (const tag of results[i].tags) {
      if (!tags.has(tag)) tags.set(tag, { total: 0, passed: 0 });
      const t = tags.get(tag)!;
      t.total++;
      if (results[i].fields.every((f) => f.pass)) t.passed++;
    }
  }

  console.log(`\n  ${BOLD}By tag:${RESET}`);
  for (const [tag, stats] of [...tags.entries()].sort()) {
    const rate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(0) : "0";
    const icon = stats.passed === stats.total ? GREEN : RED;
    console.log(`    ${icon}${padRight(tag, 25)} ${stats.passed}/${stats.total} (${rate}%)${RESET}`);
  }
}

function padRight(s: string, n: number): string {
  return s.padEnd(n);
}

// ── Main ───────────────────────────────────────────────────────────

function main(): void {
  console.log(`\n${BOLD}${CYAN}AIT-052: Eval Runner${RESET}`);
  console.log(`${CYAN}Dataset: ${DATASET.length} cases${RESET}\n`);

  const results: EvalResult[] = [];
  const summary: Summary = {
    total: 0,
    passed: 0,
    failed: 0,
    intentCorrect: 0,
    outputTypeCorrect: 0,
    frustrationCorrect: 0,
    slotRecallTotal: 0,
    slotRecallPassed: 0,
    escalationFP: 0,
    escalationFN: 0,
    frustrationFP: 0,
    frustrationFN: 0,
  };

  for (const c of DATASET) {
    const result = evaluateCase(c);
    results.push(result);
    summary.total++;

    const allPass = result.fields.every((f) => f.pass);
    if (allPass) {
      summary.passed++;
    } else {
      summary.failed++;
    }

    // Intent
    const intentField = result.fields.find((f) => f.field === "intent");
    if (intentField?.pass) summary.intentCorrect++;

    // OutputType
    const outputField = result.fields.find((f) => f.field === "outputType");
    if (outputField?.pass) summary.outputTypeCorrect++;

    // Frustration
    const frustField = result.fields.find((f) => f.field === "frustration");
    if (frustField?.pass) {
      summary.frustrationCorrect++;
    } else if (frustField) {
      // Count FP/FN
      if (frustField.actual === "trigger" && frustField.expected === "no_trigger") {
        summary.frustrationFP++;
      } else if (frustField.actual === "no_trigger" && frustField.expected === "trigger") {
        summary.frustrationFN++;
      }
    }

    // Slot recall
    const slotFields = result.fields.filter((f) => f.field.startsWith("fact:"));
    summary.slotRecallTotal += slotFields.length;
    summary.slotRecallPassed += slotFields.filter((f) => f.pass).length;

    // Escalation coherence (informativo)
    if (!result.escalationCoherent) {
      if (result.wouldEscalateByCore && !result.shouldEscalate) {
        summary.escalationFP++;
      } else if (!result.wouldEscalateByCore && result.shouldEscalate) {
        summary.escalationFN++;
      }
    }
  }

  printResults(results, summary);

  // Exit code
  const exitCode = summary.failed > 0 ? 1 : 0;
  console.log(`\n${BOLD}Exit code: ${exitCode === 0 ? `${GREEN}0 (ALL PASS)${RESET}` : `${RED}${exitCode} (FAILURES)${RESET}`}${RESET}`);
  process.exit(exitCode);
}

main();
