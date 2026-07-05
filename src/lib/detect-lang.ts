import type { Lang } from "@/lib/ai/types";

export type ExtendedLang = Lang | "fr" | "de" | "it" | "zh" | "other";

const LANG_GROUPS: Array<{ lang: ExtendedLang; words: string[] }> = [
  { lang: "pt", words: ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor", "obrigada", "tudo bem", "preciso", "gostaria"] },
  { lang: "en", words: ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please", "thanks", "help", "where", "hotel", "need", "i want"] },
  { lang: "fr", words: ["bonjour", "bonsoir", "merci", "combien", "aéroport", "s'il vous plaît", "svp", "prix", "hôtel", "je voudrais", "aide", "où", "tarif"] },
  { lang: "de", words: ["hallo", "guten tag", "guten morgen", "wie viel", "flughafen", "bitte", "danke", "preis", "hotel", "hilfe", "wo", "transfer"] },
  { lang: "it", words: ["ciao", "buongiorno", "buonasera", "grazie", "quanto costa", "aeroporto", "per favore", "prezzo", "hotel", "aiuto", "dove", "transferimento"] },
  { lang: "zh", words: ["你好", "谢谢", "机场", "价格", "酒店", "帮助", "哪里", "多少", "接送"] },
];

export function detectLeadLang(text: string): Lang {
  const { lang, confidence } = detectExtendedLang(text);
  if (confidence < 0.4) return "es";
  if (lang === "pt") return "pt";
  if (lang === "en") return "en";
  return "es";
}

export function detectExtendedLang(text: string): { lang: ExtendedLang; confidence: number } {
  const lower = text.toLowerCase();

  let best: { lang: ExtendedLang; score: number } = { lang: "es", score: 0 };

  for (const group of LANG_GROUPS) {
    let score = 0;
    for (const word of group.words) {
      if (lower.includes(word)) score += 1;
    }
    if (score > best.score) {
      best = { lang: group.lang, score };
    }
  }

  if (best.score === 0) return { lang: "es", confidence: 0.3 };
  return { lang: best.lang, confidence: Math.min(0.3 + best.score * 0.2, 0.95) };
}

// Smart lang resolver: fast path keyword matching + LLM extraction result override
// extractionResult can be any object with an optional `language` string field
export function resolveLang(
  text: string,
  extractionResult?: { language?: string | null } | null,
): ExtendedLang {
  const fast = detectExtendedLang(text);

  if (fast.confidence > 0.5) return fast.lang;

  const llmLang = extractionResult?.language;
  if (typeof llmLang === "string" && LANG_GROUPS.some((g) => g.lang === llmLang)) {
    return llmLang as ExtendedLang;
  }

  return fast.lang;
}

// Resuelve idioma considerando el idioma persistido en sesión como fallback
// cuando la detección rápida tiene baja confianza (< 0.5).
// sessionLang: idioma guardado en chat_sessions del mensaje anterior.
export function detectLangWithFallback(
  text: string,
  sessionLang?: string | null,
): Lang {
  const fast = detectExtendedLang(text);
  if (fast.confidence > 0.5) {
    return fast.lang === "pt" ? "pt" : fast.lang === "en" ? "en" : "es";
  }
  if (sessionLang && (sessionLang === "en" || sessionLang === "pt")) {
    return sessionLang;
  }
  return "es";
}
