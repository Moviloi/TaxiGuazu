// DISAMBIGUATION TEMPLATES — Sistema de plantillas contextuales para preguntas de desambiguación.
//
// En lugar de preguntas hardcodeadas o aleatorias, selecciona el template
// basado en:
// - Contexto del slot (aeropuerto, centro, cataratas, etc.)
// - Tono de la conversación (formal, casual, técnico)
// - Idioma del usuario
//
// Esto hace que las preguntas sean más naturales y conversacionales.

export type SlotContext = "aeropuerto" | "centro" | "cataratas" | "hotel" | "generico";
export type ConversationTone = "casual" | "formal" | "directo";
export type Language = "es" | "en" | "pt";

interface Template {
  text: string;
  tone: ConversationTone;
}

const TEMPLATES: Record<SlotContext, Template[]> = {
  aeropuerto: [
    { text: "¿Del aeropuerto argentino o brasileño?", tone: "casual" },
    { text: "¿Aterrizás en Puerto Iguazú (Argentina) o Foz (Brasil)?", tone: "formal" },
    { text: "¿Cuál aeropuerto? Tenemos IGR (Argentina) e IGU (Brasil)", tone: "directo" },
  ],
  centro: [
    { text: "¿Al centro de Puerto Iguazú o de Foz?", tone: "casual" },
    { text: "¿Centro argentino o brasileño?", tone: "directo" },
    { text: "¿Te llevo al centro de Puerto Iguazú o al de Foz do Iguaçu?", tone: "formal" },
  ],
  cataratas: [
    { text: "¿A las cataratas del lado argentino o brasileño?", tone: "casual" },
    { text: "¿Cataratas argentinas o brasileñas?", tone: "directo" },
    { text: "¿Querés visitar el Parque Nacional Iguazú (Argentina) o el Parque Nacional do Iguaçu (Brasil)?", tone: "formal" },
  ],
  hotel: [
    { text: "¿Me decís el nombre del hotel?", tone: "casual" },
    { text: "¿En qué hotel te alojás?", tone: "formal" },
    { text: "¿Cuál es el nombre del hotel?", tone: "directo" },
  ],
  generico: [
    { text: "¿Podés ser más específico con el lugar?", tone: "casual" },
    { text: "¿A qué lugar exacto te referís?", tone: "formal" },
    { text: "¿Cuál lugar exactamente?", tone: "directo" },
  ],
};

/**
 * Detecta el contexto del slot basado en el término crudo del usuario.
 */
export function detectSlotContext(rawTerm: string): SlotContext {
  const term = rawTerm.toLowerCase().trim();
  
  if (term.includes("aeropuerto") || term.includes("aeroporto") || term === "airport") {
    return "aeropuerto";
  }
  if (term.includes("centro") || term === "downtown") {
    return "centro";
  }
  if (term.includes("catarata") || term.includes("cataratas") || term.includes("falls") || term.includes("parque")) {
    return "cataratas";
  }
  if (term.includes("hotel") || term.includes("hostel") || term.includes("resort")) {
    return "hotel";
  }
  
  return "generico";
}

/**
 * Detecta el tono de la conversación basado en patrones del texto del usuario.
 */
export function detectConversationTone(text: string): ConversationTone {
  const lower = text.toLowerCase();
  
  // Patrones formales
  const formalPatterns = [
    "buenos días", "buenas tardes", "buenas noches",
    "por favor", "disculpe", "estimado",
    "good morning", "good afternoon", "good evening",
    "please", "excuse me", "sir", "madam",
    "bom dia", "boa tarde", "boa noite",
    "por favor", "com licença", "senhor", "senhora",
  ];
  
  // Patrones directos
  const directPatterns = [
    "necesito", "quiero", "dame",
    "i need", "i want", "give me",
    "preciso", "quero", "me dá",
  ];
  
  const hasFormal = formalPatterns.some(p => lower.includes(p));
  const hasDirect = directPatterns.some(p => lower.includes(p));
  
  if (hasFormal) return "formal";
  if (hasDirect) return "directo";
  return "casual";
}

/**
 * Selecciona el template más apropiado basado en contexto y tono.
 */
export function selectDisambiguationTemplate(
  context: SlotContext,
  tone: ConversationTone,
  lang: Language,
): string {
  const templates = TEMPLATES[context];
  
  // Buscar template que coincida con el tono
  const matchingTone = templates.find(t => t.tone === tone);
  if (matchingTone) {
    return translateIfNeeded(matchingTone.text, lang);
  }
  
  // Fallback: usar el primer template y traducir
  return translateIfNeeded(templates[0].text, lang);
}

/**
 * Traduce el template si es necesario (solo inglés y portugués).
 * Español es el idioma base, así que no necesita traducción.
 */
function translateIfNeeded(text: string, lang: Language): string {
  if (lang === "es") return text;
  
  // Traducciones básicas para inglés y portugués
  const translations: Record<string, Record<Language, string>> = {
    "¿Del aeropuerto argentino o brasileño?": {
      en: "From the Argentine or Brazilian airport?",
      pt: "Do aeroporto argentino ou brasileiro?",
      es: text,
    },
    "¿Al centro de Puerto Iguazú o de Foz?": {
      en: "To downtown Puerto Iguazú or Foz?",
      pt: "Para o centro de Puerto Iguazú ou Foz?",
      es: text,
    },
    "¿A las cataratas del lado argentino o brasileño?": {
      en: "To the Argentine or Brazilian side of the falls?",
      pt: "Para as cataratas do lado argentino ou brasileiro?",
      es: text,
    },
    "¿Me decís el nombre del hotel?": {
      en: "Can you tell me the hotel name?",
      pt: "Pode me dizer o nome do hotel?",
      es: text,
    },
    "¿Podés ser más específico con el lugar?": {
      en: "Can you be more specific about the place?",
      pt: "Pode ser mais específico sobre o lugar?",
      es: text,
    },
  };
  
  return translations[text]?.[lang] ?? text;
}

/**
 * Genera una pregunta de confirmación contextual (cuando el contexto es obvio).
 * Ejemplo: "Perfecto, te llevo al centro de Puerto Iguazú desde el aeropuerto argentino. ¿Correcto?"
 */
export function buildConfirmationQuestion(
  origin: string,
  destination: string,
  lang: Language,
): string {
  const templates = {
    es: `Perfecto, te llevo de ${origin} a ${destination}. ¿Correcto?`,
    en: `Perfect, I'll take you from ${origin} to ${destination}. Correct?`,
    pt: `Perfeito, te levo de ${origin} para ${destination}. Correto?`,
  };
  
  return templates[lang];
}
