// AIT-064: recalculación periódica de habilitación de sugerencias.
// Corre como cron (src/app/api/cron/recalculate-suggestions/route.ts).
// Reglas con histéresis:
//   - total < 30 eventos → no tocar nada (muestra insuficiente)
//   - tasa >= 60% y actualmente deshabilitado → habilitar
//   - tasa < 50% y actualmente habilitado → deshabilitar
//   - 50% <= tasa < 60% → zona gris, no cambiar

import { isSuggestionEnabled, setSuggestionEnabled, getSuggestionAcceptanceRates } from "@/lib/db/database";
import { log } from "@/lib/utils/logger";

export const MIN_EVENTS_THRESHOLD = 30;
export const ENABLE_THRESHOLD = 60; // >= 60% → habilitar
export const DISABLE_THRESHOLD = 50; // < 50% → deshabilitar
export const SUGGESTION_TYPES = ["airport", "time", "border"] as const;

export interface RecalcResult {
  type: string;
  total: number;
  acceptanceRate: number | null;
  previousEnabled: boolean;
  newEnabled: boolean;
  action: "enabled" | "disabled" | "no_change_insufficient_data" | "no_change_grey_zone" | "no_change_already_correct";
}

export async function recalculateSuggestions(): Promise<RecalcResult[]> {
  const rates = await getSuggestionAcceptanceRates();
  const results: RecalcResult[] = [];

  for (const st of SUGGESTION_TYPES) {
    const rate = rates.find(r => r.type === st);
    const total = rate?.total ?? 0;
    const acceptanceRate = rate?.acceptanceRate ?? null;
    const previousEnabled = await isSuggestionEnabled(st);

    let newEnabled = previousEnabled;
    let action: RecalcResult["action"] = "no_change_already_correct";

    if (total < MIN_EVENTS_THRESHOLD) {
      // Punto crítico: con < 30 eventos, NUNCA cambiar el estado
      // Esta es la condición actual real del sistema (0 eventos) y persistirá por semanas.
      action = "no_change_insufficient_data";
    } else if (acceptanceRate != null && acceptanceRate >= ENABLE_THRESHOLD && !previousEnabled) {
      newEnabled = true;
      action = "enabled";
    } else if (acceptanceRate != null && acceptanceRate < DISABLE_THRESHOLD && previousEnabled) {
      newEnabled = false;
      action = "disabled";
    } else if (acceptanceRate != null && acceptanceRate >= DISABLE_THRESHOLD && acceptanceRate < ENABLE_THRESHOLD) {
      // Zona gris 50-60%: no cambiar para evitar oscilaciones
      action = "no_change_grey_zone";
    }

    if (newEnabled !== previousEnabled) {
      await setSuggestionEnabled(st, newEnabled);
      log.info("[SUGGESTION_RECALC]", {
        type: st,
        action,
        total,
        acceptanceRate,
        previousEnabled,
        newEnabled,
      });
    } else {
      log.info("[SUGGESTION_RECALC]", {
        type: st,
        action,
        total,
        acceptanceRate,
        enabled: newEnabled,
      });
    }

    results.push({ type: st, total, acceptanceRate, previousEnabled, newEnabled, action });
  }

  return results;
}
