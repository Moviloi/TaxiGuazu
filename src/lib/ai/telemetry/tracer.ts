// FASE 6.8: OTEL Tracer Setup
// Span creation for each pipeline phase.

import { trace, SpanStatusCode } from "@opentelemetry/api";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { SpanAttributes } from "@opentelemetry/api";

let initialized = false;

function ensureProvider(): void {
  if (initialized) return;
  try {
    const provider = new NodeTracerProvider();
    provider.register();
    initialized = true;
  } catch {
    // silent fail — OTEL setup never breaks pipeline
  }
}

export function getTracer() {
  ensureProvider();
  return trace.getTracer("decision-engine");
}

export function startSpan(name: string, attributes?: SpanAttributes) {
  try {
    const tracer = getTracer();
    return tracer.startActiveSpan(name, (span) => {
      if (attributes) span.setAttributes(attributes);
      return span;
    });
  } catch {
    return null;
  }
}

export function endSpan(span: ReturnType<typeof startSpan>, error?: string) {
  if (!span) return;
  try {
    if (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error });
    }
    span.end();
  } catch {
    // silent fail
  }
}
