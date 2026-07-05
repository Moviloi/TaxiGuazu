import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
  ],

};

export default withSentryConfig(nextConfig, {
  silent: !process.env.SENTRY_DSN, // solo loguea si hay DSN configurado
  telemetry: false,
});
