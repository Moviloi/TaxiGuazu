import type { Lang } from "@/lib/ai/types";

export function detectLeadLang(text: string): Lang {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor"];
  const enMarkers = ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please"];
  if (ptMarkers.some((m) => lower.includes(m))) return "pt";
  if (enMarkers.some((m) => lower.includes(m))) return "en";
  return "es";
}
