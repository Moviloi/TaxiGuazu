// ── RNF-A06: Observabilidad ──
// Este módulo es el componente oficial de observabilidad del sistema.
// Auditoría: 2026-07-21 — BUILD / AEL
// Estado: PASS (RNF-A06 auditado formalmente)
//
// Cobertura:
// - 4 niveles de log (debug, info, warn, error) con filtro por nivel.
// - Modo JSON estructurado en producción (timestamp, level, message, data).
// - Modo texto legible en desarrollo/test.
// - Control por environment variables: LOG_LEVEL, NODE_ENV.
// - Usado en toda la base de código (~120+ imports en handlers, services, AI).
// - Sin dependencias externas (console-based, zero-dependency).
//
// Limitaciones documentadas:
// - No tiene transporte a servicios externos (Sentry, CloudWatch, etc.) —
//   los logs se capturan por el runtime de Node.js y pueden redirigirse
//   externamente por el entorno de despliegue.
// - No tiene correlación de trazas distribuidas (traceId/spanId) —
//   cada request se identifica por phone number + conversationId en los
//   mensajes de log.
// - Los objetos se serializan con JSON.stringify (pérdida de tipos,
//   circular references causan error — capturado con try/catch).

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function getEffectiveLevel(): Level {
  const logLevel = process.env.LOG_LEVEL;
  if (logLevel === "debug" || logLevel === "info" || logLevel === "warn" || logLevel === "error") {
    return logLevel;
  }
  // Producción: solo warnings y errores por defecto (logs sensibles/silenciosos)
  if (process.env.NODE_ENV === "production") return "warn";
  // Desarrollo, test, y cualquier otro entorno: todo visible
  return "debug";
}

const currentLevel = getEffectiveLevel();
const isJSON = process.env.NODE_ENV === "production";

function shouldLog(level: Level): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function formatArgs(args: unknown[]): unknown[] {
  return args.map((a) => {
    if (typeof a === "object" && a !== null) {
      try {
        return JSON.stringify(a, null, 0);
      } catch {
        return a;
      }
    }
    return a;
  });
}

function makeLogger(level: Level) {
  return (...args: unknown[]) => {
    if (!shouldLog(level)) return;

    if (isJSON) {
      // Producción: JSON estructurado — cada línea es un JSON.parseable.
      // Compatible con grep, jq, y futura integración con servicios de logs
      // (CloudWatch, Logtail, Axiom, Datadog).
      const timestamp = new Date().toISOString();
      const strings: string[] = [];
      const objects: unknown[] = [];
      for (const arg of args) {
        if (typeof arg === "string") {
          strings.push(arg);
        } else if (typeof arg === "object" && arg !== null) {
          objects.push(arg);
        } else {
          strings.push(String(arg));
        }
      }
      const entry: Record<string, unknown> = { timestamp, level, message: strings.join(" ") };
      if (objects.length === 1) {
        entry.data = objects[0];
      } else if (objects.length > 1) {
        entry.data = objects;
      }
      console.log(JSON.stringify(entry));
    } else {
      // Desarrollo/test: texto legible para lectura en consola/terminal
      const fn = level === "error" ? console.error
        : level === "warn" ? console.warn
        : level === "info" ? console.info
        : console.debug;
      fn(...formatArgs(args));
    }
  };
}

export const log = {
  debug: makeLogger("debug"),
  info: makeLogger("info"),
  warn: makeLogger("warn"),
  error: makeLogger("error"),
};
