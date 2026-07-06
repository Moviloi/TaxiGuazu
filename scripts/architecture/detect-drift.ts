#!/usr/bin/env node
// scripts/architecture/detect-drift.ts
// Detects architecture drift by comparing current graphs against a baseline.
//
// Usage:
//   npx tsx scripts/architecture/detect-drift.ts
//   npx tsx scripts/architecture/detect-drift.ts --save-baseline

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINE_PATH = path.join(ROOT, "docs/architecture/reverse-engineering/architecture-graphs.baseline.json");
const CURRENT_PATH = path.join(ROOT, "docs/architecture/reverse-engineering/architecture-graphs.json");
const REPORT_PATH = path.join(ROOT, "docs/architecture/drift-report.md");

interface GraphSummary {
  generatedAt: string;
  totalModules: number;
  totalPackages: number;
  totalImportEdges: number;
  circularDependencies: string[][];
  orphanFiles: string[];
  layerViolations: string[];
}

function setDiff<T>(a: T[], b: T[]): T[] {
  const sb = new Set(b);
  return a.filter(x => !sb.has(x));
}

function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== a.length || sb.size !== b.length) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

function normalizeCycle(cycle: string[]): string {
  // rotate to start with lexicographically smallest
  const idx = cycle.indexOf(cycle.slice().sort()[0]);
  const rotated = [...cycle.slice(idx), ...cycle.slice(0, idx)];
  return rotated.join(" → ");
}

function cycleDiff(a: string[][], b: string[][]): { added: string[]; removed: string[] } {
  const mapA = new Map(a.map(c => [normalizeCycle(c), c]));
  const mapB = new Map(b.map(c => [normalizeCycle(c), c]));
  const added = Array.from(mapA.keys()).filter(k => !mapB.has(k));
  const removed = Array.from(mapB.keys()).filter(k => !mapA.has(k));
  return { added, removed };
}

async function main() {
  const saveBaseline = process.argv.includes("--save-baseline");

  const currentRaw = await fs.readFile(CURRENT_PATH, "utf-8");
  const current: GraphSummary = JSON.parse(currentRaw);

  if (saveBaseline) {
    await fs.writeFile(BASELINE_PATH, JSON.stringify(current, null, 2));
    console.log(`Baseline saved to ${BASELINE_PATH}`);
    return;
  }

  let baseline: GraphSummary | null = null;
  try {
    const baselineRaw = await fs.readFile(BASELINE_PATH, "utf-8");
    baseline = JSON.parse(baselineRaw);
  } catch {
    console.warn("No baseline found. Run with --save-baseline to create one.");
  }

  const reportLines: string[] = [
    "# Architecture Drift Report",
    "",
    `> Generated: ${new Date().toISOString()}`,
    `> Baseline: ${baseline ? baseline.generatedAt : "none"}`,
    "",
    "## Summary",
    "",
    "| Metric | Baseline | Current | Change |",
    "|--------|----------|---------|--------|",
  ];

  if (baseline) {
    reportLines.push(`| Total modules | ${baseline.totalModules} | ${current.totalModules} | ${current.totalModules - baseline.totalModules} |`);
    reportLines.push(`| Total packages | ${baseline.totalPackages} | ${current.totalPackages} | ${current.totalPackages - baseline.totalPackages} |`);
    reportLines.push(`| Import edges | ${baseline.totalImportEdges} | ${current.totalImportEdges} | ${current.totalImportEdges - baseline.totalImportEdges} |`);
    reportLines.push(`| Circular deps | ${baseline.circularDependencies.length} | ${current.circularDependencies.length} | ${current.circularDependencies.length - baseline.circularDependencies.length} |`);
    reportLines.push(`| Orphan files | ${baseline.orphanFiles.length} | ${current.orphanFiles.length} | ${current.orphanFiles.length - baseline.orphanFiles.length} |`);
    reportLines.push(`| Layer violations | ${baseline.layerViolations.length} | ${current.layerViolations.length} | ${current.layerViolations.length - baseline.layerViolations.length} |`);
  } else {
    reportLines.push(`| Total modules | — | ${current.totalModules} | — |`);
    reportLines.push(`| Total packages | — | ${current.totalPackages} | — |`);
    reportLines.push(`| Import edges | — | ${current.totalImportEdges} | — |`);
    reportLines.push(`| Circular deps | — | ${current.circularDependencies.length} | — |`);
    reportLines.push(`| Orphan files | — | ${current.orphanFiles.length} | — |`);
    reportLines.push(`| Layer violations | — | ${current.layerViolations.length} | — |`);
  }

  reportLines.push("");
  reportLines.push("## New modules");
  if (baseline) {
    const currentModules = new Set<string>();
    // Re-parse module list would require re-running graph generator; for now we use orphan/violation diffs
    reportLines.push("_Run `npx tsx scripts/architecture/generate-graphs.ts` and inspect `architecture-graphs.json` for full module lists._");
  } else {
    reportLines.push("_No baseline available._");
  }

  if (baseline) {
    const orphanAdded = setDiff(current.orphanFiles, baseline.orphanFiles);
    const orphanRemoved = setDiff(baseline.orphanFiles, current.orphanFiles);
    const violAdded = setDiff(current.layerViolations, baseline.layerViolations);
    const violRemoved = setDiff(baseline.layerViolations, current.layerViolations);
    const cycleChanges = cycleDiff(current.circularDependencies, baseline.circularDependencies);

    reportLines.push("");
    reportLines.push("## Orphan files");
    reportLines.push("");
    reportLines.push("### Added");
    reportLines.push(orphanAdded.length ? orphanAdded.map(x => `- ${x}`).join("\n") : "None");
    reportLines.push("");
    reportLines.push("### Removed");
    reportLines.push(orphanRemoved.length ? orphanRemoved.map(x => `- ${x}`).join("\n") : "None");

    reportLines.push("");
    reportLines.push("## Layer violations");
    reportLines.push("");
    reportLines.push("### Added");
    reportLines.push(violAdded.length ? violAdded.map(x => `- ${x}`).join("\n") : "None");
    reportLines.push("");
    reportLines.push("### Removed");
    reportLines.push(violRemoved.length ? violRemoved.map(x => `- ${x}`).join("\n") : "None");

    reportLines.push("");
    reportLines.push("## Circular dependencies");
    reportLines.push("");
    reportLines.push("### Added");
    reportLines.push(cycleChanges.added.length ? cycleChanges.added.map(x => `- ${x}`).join("\n") : "None");
    reportLines.push("");
    reportLines.push("### Removed");
    reportLines.push(cycleChanges.removed.length ? cycleChanges.removed.map(x => `- ${x}`).join("\n") : "None");
  }

  reportLines.push("");
  reportLines.push("## Action items");
  reportLines.push("");
  reportLines.push("- [ ] Review new orphan files");
  reportLines.push("- [ ] Review new layer violations");
  reportLines.push("- [ ] Review new circular dependencies");
  reportLines.push("- [ ] Regenerate Mermaid diagrams if module graph changed");
  reportLines.push("- [ ] Update `docs/ai/` if invariants/contracts changed");
  reportLines.push("");
  reportLines.push("---");
  reportLines.push("");
  reportLines.push("*This report is auto-generated. Do not edit manually.*");

  await fs.writeFile(REPORT_PATH, reportLines.join("\n"));
  console.log(`Drift report written to ${REPORT_PATH}`);

  if (baseline) {
    const issues =
      setDiff(current.orphanFiles, baseline.orphanFiles).length +
      setDiff(current.layerViolations, baseline.layerViolations).length +
      cycleDiff(current.circularDependencies, baseline.circularDependencies).added.length;
    if (issues > 0) {
      console.warn(`⚠️ ${issues} new drift issues detected.`);
      process.exit(0); // do not fail CI by default; reviewers inspect report
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
