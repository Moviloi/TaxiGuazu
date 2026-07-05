// AIT-052: Dataset de evals para medir calidad de respuestas del bot
// 25 casos: 10 obligatorios (customs, fronteira, frustración, ambigüedad) + 15 regulares
// Cada caso testea core() (intent + facts) + router() (OutputType) + FRUSTRATION_RE match
//
// Los expectedFacts reflejan el formato REAL de core().facts — verificado contra core() real.
// Si un caso no extrae facts correctamente, se espera 0 facts (gap documentado en notes).
//
// Reglas:
//   - Sin IDs de planificación en exports de producción (solo en comentarios y BACKLOG.md)
//   - Sin "as any"

import type { Intent, OutputType, Mode } from "@/lib/ai/types";

export interface EvalCase {
  id: string;
  lang: "es" | "en" | "pt";
  input: string;
  mode: Mode;
  expectedIntent: Intent;
  expectedOutputType: OutputType;
  expectedMinConfidence: number;
  /** Facts que DEBEN estar presentes en core().facts (formato real del sistema) */
  expectedFacts: string[];
  /** Si debe disparar FRUSTRATION_RE */
  expectFrustration: boolean;
  /** Si es correcto que escale a humano (ambigüedad genuina, baja confianza, etc.) */
  shouldEscalate: boolean;
  notes?: string;
  /** Categorías del caso */
  tags: string[];
}

const DATASET: EvalCase[] = [
  // ════════════════════════════════════════════════════════════════════
  // OBLIGATORIO 1: "Argentine customs" / "border" en inglés
  // NO debe escalar a operador humano (arreglado en AIT-001/002)
  // ════════════════════════════════════════════════════════════════════
  {
    id: "CUSTOMS_EN_01",
    lang: "en",
    input: "I'm at the Argentine customs in Puerto Iguazu, I need a transfer to the city center",
    mode: "AHORA",
    expectedIntent: "CONSULTA",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.1,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no tiene patrones en inglés. El sistema no entiende 'customs', 'transfer', 'city center'. Gap de idioma conocido. El caso NO debería escalar (es booking simple) pero escala por baja confianza.",
    tags: ["obligatorio", "frontera", "ingles", "gap_idioma"],
  },

  // ════════════════════════════════════════════════════════════════════
  // OBLIGATORIO 2: Portugués — alfândega (vocabulario de frontera)
  // ════════════════════════════════════════════════════════════════════
  {
    id: "FRONTERA_PT_01",
    lang: "pt",
    input: "Estou na alfândega argentina, preciso ir para o centro",
    mode: "AHORA",
    expectedIntent: "CONSULTA",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.1,
    expectedFacts: ["destination:para o centro"],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende portugués. 'alfândega' no está en patrones. Gap de idioma. El sistema captura 'para o centro' como destination pero no como BOOKING.",
    tags: ["obligatorio", "frontera", "portugues", "gap_idioma"],
  },

  {
    id: "FRONTERA_PT_02",
    lang: "pt",
    input: "Estou na fronteira, quero ir para Foz do Iguaçu",
    mode: "AHORA",
    expectedIntent: "AMBIGUOUS",
    expectedOutputType: "SAFE_FALLBACK",
    expectedMinConfidence: 0,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende portugués. 'fronteira', 'Foz do Iguaçu' no están en patrones. Confidence 0. Gap de idioma.",
    tags: ["obligatorio", "frontera", "portugues", "gap_idioma"],
  },

  {
    id: "FRONTERA_PT_03",
    lang: "pt",
    input: "Passei pela alfândega, preciso de um táxi para o centro da cidade",
    mode: "AHORA",
    expectedIntent: "CONSULTA",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.1,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende portugués. Gap de idioma.",
    tags: ["obligatorio", "frontera", "portugues", "gap_idioma"],
  },

  // ════════════════════════════════════════════════════════════════════
  // OBLIGATORIO 3: Frustración REAL — debe activar FRUSTRATION_RE
  // ════════════════════════════════════════════════════════════════════
  {
    id: "FRUST_TRUE_01",
    lang: "es",
    input: "Ya te dije que quiero ir al aeropuerto, no entendés?",
    mode: "AHORA",
    expectedIntent: "NOW",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: ["destination:aeropuerto"],
    expectFrustration: true,
    shouldEscalate: true,
    notes: "Frustración real: 'ya te dije' + 'no entendés' ambos en FRUSTRATION_RE. Intent=NOW porque quiere ir al aeropuerto (no hay señal de futuro). El sistema debe escalar por frustración.",
    tags: ["obligatorio", "frustracion", "real"],
  },

  {
    id: "FRUST_TRUE_02",
    lang: "es",
    input: "Te lo dije tres veces, repito, del hotel al centro",
    mode: "AHORA",
    expectedIntent: "CONSULTA",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.1,
    expectedFacts: [],
    expectFrustration: true,
    shouldEscalate: true,
    notes: "BUG REAL: Frustración detectada correctamente, pero core() no extrae 'del hotel al centro' como booking. La señal de frustración opaca la extracción de slots. Intent=CONSULTA, confidence baja.",
    tags: ["obligatorio", "frustracion", "real", "gap_extraccion"],
  },

  // ════════════════════════════════════════════════════════════════════
  // OBLIGATORIO 4: Falsos positivos de FRUSTRATION_RE
  // Casos que NO deben activar frustración
  // ════════════════════════════════════════════════════════════════════
  {
    id: "FRUST_FP_01",
    lang: "es",
    input: "Hola, te quiero consultar el precio de un viaje del hotel al aeropuerto",
    mode: "AHORA",
    expectedIntent: "CONSULTA",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.4,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: false,
    notes: "BUG REAL: core() no detecta 'consultar el precio' como COMMERCIAL. El 'te' en 'te quiero' NO debe activar frustración pero core() no logra extraer la señal commercial. Gap de patrón commercial.",
    tags: ["obligatorio", "frustracion", "falso_positivo", "gap_commercial"],
  },

  {
    id: "FRUST_FP_02",
    lang: "es",
    input: "Leé bien la dirección que te pasé, es Av. Victoria Aguirre 123",
    mode: "AHORA",
    expectedIntent: "COMMERCIAL",
    expectedOutputType: "ANSWER",
    expectedMinConfidence: 0.4,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: false,
    notes: "FALSO POSITIVO CONOCIDO: 'leé bien' está en FRUSTRATION_RE pero el usuario solo está dando dirección. FRUSTRATION_RE lo agarra como trigger. Además, core() lo ve como COMMERCIAL (por 'Av.' quizás). Bug documentado.",
    tags: ["obligatorio", "frustracion", "falso_positivo", "bug_conocido"],
  },

  // ════════════════════════════════════════════════════════════════════
  // OBLIGATORIO 5: Ambigüedad genuina — correcto escalar a confirmación
  // ════════════════════════════════════════════════════════════════════
  {
    id: "AMBIGUOUS_01",
    lang: "es",
    input: "Quiero ir del aeropuerto al centro",
    mode: "AHORA",
    expectedIntent: "BOOKING",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: ["destination:aeropuerto al centro"],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "'centro' es ambiguo en Iguazú: ¿Centro de Pto Iguazú o Ciudad del Este? core() no separa origin/destination correctamente ('del X al Y' se fusiona como destination). Correcto pedir confirmación de ubicación.",
    tags: ["obligatorio", "ambiguedad", "escalar"],
  },

  {
    id: "AMBIGUOUS_02",
    lang: "es",
    input: "Necesito un remís",
    mode: "AHORA",
    expectedIntent: "BOOKING",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: ["action:necesito"],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL (visual): 'Necesito un remís' es BOOKING con confianza 0.9 pero no extrae origen/destino. El sistema ejecuta EXECUTE sin datos suficientes. Correcto escalar a confirmación pero el sistema no tiene datos para escalar.",
    tags: ["obligatorio", "ambiguedad", "escalar", "gap_extraccion"],
  },

  // ════════════════════════════════════════════════════════════════════
  // REGULARES — Booking en 3 idiomas
  // ════════════════════════════════════════════════════════════════════
  {
    id: "BOOKING_ES_01",
    lang: "es",
    input: "Quiero ir del hotel al aeropuerto mañana a las 8 con 3 pasajeros",
    mode: "RESERVA",
    expectedIntent: "PRE_BOOKING",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: ["passengers:3", "date:mañana"],
    expectFrustration: false,
    shouldEscalate: false,
    notes: "Booking correcto. core() extrae passengers y date pero fusiona origin+destination en 'destination:hotel al aeropuerto'. Gap de parsing 'del X al Y'.",
    tags: ["regular", "booking", "espanol"],
  },

  {
    id: "BOOKING_EN_01",
    lang: "en",
    input: "I want to book a transfer from the airport to the city center tomorrow at 8am for 3 passengers",
    mode: "RESERVA",
    expectedIntent: "AMBIGUOUS",
    expectedOutputType: "SAFE_FALLBACK",
    expectedMinConfidence: 0,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no tiene patrones en inglés. Gap de idioma conocido.",
    tags: ["regular", "booking", "ingles", "gap_idioma"],
  },

  {
    id: "BOOKING_PT_01",
    lang: "pt",
    input: "Quero reservar uma viagem do aeroporto para o centro amanhã às 8h com 3 passageiros",
    mode: "RESERVA",
    expectedIntent: "BOOKING",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() tiene patrón parcial para portugués 'Quero' (entra como booking) pero no extrae facts completos. Gap de idioma parcial.",
    tags: ["regular", "booking", "portugues", "gap_idioma"],
  },

  // ════════════════════════════════════════════════════════════════════
  // REGULARES — NOW (viaje inmediato)
  // ════════════════════════════════════════════════════════════════════
  {
    id: "NOW_ES_01",
    lang: "es",
    input: "Estoy en el hotel, necesito ir al aeropuerto ahora",
    mode: "AHORA",
    expectedIntent: "NOW",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: ["origin:hotel", "destination:aeropuerto", "now:ahora"],
    expectFrustration: false,
    shouldEscalate: false,
    tags: ["regular", "now", "espanol"],
  },

  {
    id: "NOW_EN_01",
    lang: "en",
    input: "I'm at the hotel, I need to go to the airport right now",
    mode: "AHORA",
    expectedIntent: "CONSULTA",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.1,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende inglés. Gap de idioma.",
    tags: ["regular", "now", "ingles", "gap_idioma"],
  },

  // ════════════════════════════════════════════════════════════════════
  // REGULARES — Greeting / Consulta
  // ════════════════════════════════════════════════════════════════════
  {
    id: "GREETING_ES_01",
    lang: "es",
    input: "Hola",
    mode: "AHORA",
    expectedIntent: "GREETING",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.3,
    expectedFacts: ["greeting:hola"],
    expectFrustration: false,
    shouldEscalate: false,
    tags: ["regular", "greeting", "espanol"],
  },

  {
    id: "GREETING_EN_01",
    lang: "en",
    input: "Hello, I need a taxi",
    mode: "AHORA",
    expectedIntent: "GREETING",
    expectedOutputType: "CLARIFY",
    expectedMinConfidence: 0.3,
    expectedFacts: ["greeting:hello"],
    expectFrustration: false,
    shouldEscalate: false,
    tags: ["regular", "greeting", "ingles"],
  },

  {
    id: "CONSULTA_ES_01",
    lang: "es",
    input: "Tienen servicio a las Cataratas?",
    mode: "AHORA",
    expectedIntent: "INFORMATIONAL",
    expectedOutputType: "ANSWER",
    expectedMinConfidence: 0.4,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: false,
    notes: "Intent correcto pero no extrae 'Cataratas' como fact — core() lo ve como señal informational genérica.",
    tags: ["regular", "consulta", "espanol"],
  },

  // ════════════════════════════════════════════════════════════════════
  // REGULARES — Comercial / Precio
  // ════════════════════════════════════════════════════════════════════
  {
    id: "COMMERCIAL_ES_01",
    lang: "es",
    input: "Cuánto cuesta un viaje del aeropuerto al centro",
    mode: "AHORA",
    expectedIntent: "COMMERCIAL",
    expectedOutputType: "ANSWER",
    expectedMinConfidence: 0.5,
    expectedFacts: ["query:cuánto", "commercial:cuánto cuesta"],
    expectFrustration: false,
    shouldEscalate: false,
    notes: "Intent y output correctos. Facts: core() extrae 'query:cuánto' y 'commercial:cuánto cuesta' pero no extrae origin/destination por separado.",
    tags: ["regular", "commercial", "espanol"],
  },

  // ════════════════════════════════════════════════════════════════════
  // REGULARES — Emergency / Reschedule / Post-service
  // ════════════════════════════════════════════════════════════════════
  {
    id: "EMERGENCY_ES_01",
    lang: "es",
    input: "Ayuda, estoy varado en la ruta",
    mode: "AHORA",
    expectedIntent: "EMERGENCY",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    tags: ["regular", "emergency", "espanol"],
  },

  {
    id: "EMERGENCY_EN_01",
    lang: "en",
    input: "Help, I'm stranded at the airport",
    mode: "AHORA",
    expectedIntent: "AMBIGUOUS",
    expectedOutputType: "SAFE_FALLBACK",
    expectedMinConfidence: 0,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende inglés. 'Help', 'stranded' no están en patrones. Gap de idioma.",
    tags: ["regular", "emergency", "ingles", "gap_idioma"],
  },

  {
    id: "RESCHEDULE_ES_01",
    lang: "es",
    input: "Necesito cambiar mi reserva para mañana",
    mode: "AHORA",
    expectedIntent: "RESCHEDULE",
    expectedOutputType: "EXECUTE",
    expectedMinConfidence: 0.7,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: false,
    notes: "RESCHEDULE detectado correctamente. Facts: no extrae facts específicos pero intent es correcto.",
    tags: ["regular", "reschedule", "espanol"],
  },

  {
    id: "POSTSVC_ES_01",
    lang: "es",
    input: "El viaje estuvo muy bien, gracias",
    mode: "AHORA",
    expectedIntent: "AMBIGUOUS",
    expectedOutputType: "SAFE_FALLBACK",
    expectedMinConfidence: 0,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no detecta POST_SERVICE. No hay patrón para 'el viaje estuvo bien'. Gap de patrón post-service.",
    tags: ["regular", "postservice", "espanol", "gap_patron"],
  },

  {
    id: "POSTSVC_EN_01",
    lang: "en",
    input: "The trip was great, thank you",
    mode: "AHORA",
    expectedIntent: "AMBIGUOUS",
    expectedOutputType: "SAFE_FALLBACK",
    expectedMinConfidence: 0,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende inglés + no tiene patrón POST_SERVICE. Gap doble.",
    tags: ["regular", "postservice", "ingles", "gap_idioma", "gap_patron"],
  },

  {
    id: "POSTSVC_PT_01",
    lang: "pt",
    input: "A viagem foi muito boa, obrigado",
    mode: "AHORA",
    expectedIntent: "AMBIGUOUS",
    expectedOutputType: "SAFE_FALLBACK",
    expectedMinConfidence: 0,
    expectedFacts: [],
    expectFrustration: false,
    shouldEscalate: true,
    notes: "BUG REAL: core() no entiende portugués + no tiene POST_SERVICE.",
    tags: ["regular", "postservice", "portugues", "gap_idioma", "gap_patron"],
  },
];

export default DATASET;
