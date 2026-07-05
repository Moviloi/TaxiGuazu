import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  tracesSampleRate: process.env.SENTRY_DSN
    ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1")
    : 0,
  environment: process.env.NODE_ENV || "development",
});

// Suprime warning de navegación no instrumentada — proyecto sin SPA
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
