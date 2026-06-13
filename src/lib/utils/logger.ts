const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

const currentLevel: Level =
  (process.env.LOG_LEVEL as Level) in LEVELS
    ? (process.env.LOG_LEVEL as Level)
    : "debug";

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
    const fn = level === "error" ? console.error
      : level === "warn" ? console.warn
      : level === "info" ? console.info
      : console.debug;
    fn(...formatArgs(args));
  };
}

export const log = {
  debug: makeLogger("debug"),
  info: makeLogger("info"),
  warn: makeLogger("warn"),
  error: makeLogger("error"),
};
