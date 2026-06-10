// FASE 6.7: Deterministic Sampling
// Sampling determinista basado en hash del correlationId.
// Default 10% — controlable via OBS_SAMPLE_RATE env var.

export function parseSampleRate(): number {
  const raw = process.env.OBS_SAMPLE_RATE;
  if (!raw) return 0.1;
  const n = parseFloat(raw);
  if (isNaN(n) || n <= 0) return 0.1;
  return Math.min(n, 1);
}

export function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function shouldSample(correlationId: string): boolean {
  const rate = parseSampleRate();
  if (rate >= 1) return true;
  const bucket = hashId(correlationId) % 100;
  return bucket < rate * 100;
}
