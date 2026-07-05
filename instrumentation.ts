import * as Sentry from "@sentry/nextjs";

export async function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || undefined,
    tracesSampleRate: process.env.SENTRY_DSN
      ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1")
      : 0,
    environment: process.env.NODE_ENV || "development",
  });
}

// Captura errores no controlados en React Server Components
export function onRequestError(error: Error, request: { path: string; method: string; headers?: Record<string, string> }, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: { request, context },
  });
}
