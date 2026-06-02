import { createReadStream } from "node:fs";
import { createInterface, Interface } from "node:readline";

const EVENT_RE = /\{[^{}]*"event"\s*:\s*"([^"]+)"[^{}]*\}/g;
const FLAG_RE = /"workflowResultExists"\s*:\s*(true|false)/;

interface Counters {
  workflow_result_total: number;
  workflow_result_true: number;
  workflow_result_false: number;
  legacy_flow_entered: number;
  legacy_trip_marker_detected: number;
  legacy_lead_marker_detected: number;
  legacy_fallback_response_only: number;
}

const counters: Counters = {
  workflow_result_total: 0,
  workflow_result_true: 0,
  workflow_result_false: 0,
  legacy_flow_entered: 0,
  legacy_trip_marker_detected: 0,
  legacy_lead_marker_detected: 0,
  legacy_fallback_response_only: 0,
};

function processLine(line: string): void {
  for (const match of line.matchAll(EVENT_RE)) {
    const eventName = match[1];
    switch (eventName) {
      case "workflow_result": {
        counters.workflow_result_total++;
        const flagMatch = FLAG_RE.exec(match[0]);
        if (flagMatch) {
          if (flagMatch[1] === "true") counters.workflow_result_true++;
          else counters.workflow_result_false++;
        }
        break;
      }
      case "legacy_flow_entered":
        counters.legacy_flow_entered++;
        break;
      case "legacy_trip_marker_detected":
        counters.legacy_trip_marker_detected++;
        break;
      case "legacy_lead_marker_detected":
        counters.legacy_lead_marker_detected++;
        break;
      case "legacy_fallback_response_only":
        counters.legacy_fallback_response_only++;
        break;
    }
  }
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "0 %";
  return ((num / denom) * 100).toFixed(2) + " %";
}

function row(label: string, value: string | number): string {
  return label.padEnd(36, ".") + " " + value;
}

function readLines(filePath: string, onLine: (line: string) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    stream.on("error", (err: Error) => reject(err));
    const rl: Interface = createInterface({ input: stream, crlfDelay: Infinity });
    rl.on("line", onLine);
    rl.on("close", () => resolve());
    rl.on("error", (err: Error) => reject(err));
  });
}

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write("Usage: npx tsx scripts/analyze-legacy-flow.ts <log-file>\n");
    process.exit(1);
  }

  await readLines(filePath, processLine);

  const sep = "=".repeat(50);
  const lines: string[] = [
    sep,
    "LEGACY FLOW REPORT",
    sep,
    "",
    row("workflow_result", counters.workflow_result_total),
    row("workflowResultExists=true", counters.workflow_result_true),
    row("workflowResultExists=false", counters.workflow_result_false),
    "",
    row("legacy_flow_entered", counters.legacy_flow_entered),
    row("legacy_trip_marker_detected", counters.legacy_trip_marker_detected),
    row("legacy_lead_marker_detected", counters.legacy_lead_marker_detected),
    row("legacy_fallback_response_only", counters.legacy_fallback_response_only),
    "",
    row("legacy_flow_rate", pct(counters.legacy_flow_entered, counters.workflow_result_total)),
    row("workflow_failure_rate", pct(counters.workflow_result_false, counters.workflow_result_total)),
    row("trip_marker_rate", pct(counters.legacy_trip_marker_detected, counters.legacy_flow_entered)),
    row("lead_marker_rate", pct(counters.legacy_lead_marker_detected, counters.legacy_flow_entered)),
    row("response_only_rate", pct(counters.legacy_fallback_response_only, counters.legacy_flow_entered)),
    "",
    sep,
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write("Error: " + msg + "\n");
  process.exit(1);
});
