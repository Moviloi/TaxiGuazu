// IGUAZU KNOWLEDGE — datos extraídos de site/blog.html
// Contenido curado sobre hoteles, atractivos, migraciones, transporte en la triple frontera.
// Se inyecta en prompts de LLM para mejorar precisión en contexto Iguazú.

export interface AttractionInfo {
  name: string;
  type: "park" | "hotel" | "landmark" | "airport" | "shopping" | "customs" | "neighborhood";
  city?: string;
  country?: string;
  /** Known aliases the user might type */
  aliases: string[];
  /** Base price in local currency (may have changed) */
  price?: string;
  /** Hours of operation */
  hours?: string;
  /** Tips for the bot to know */
  tips?: string;
}

export interface MigrationInfo {
  requiredDocs: string[];
  qrInfo: string;
  minorsInfo: string;
  taxFreeInfo: string;
  insuranceInfo: string;
}

export interface TransportInfo {
  airportDistance: string;
  airportTime: string;
  taxiVsRemis: string;
  uberNotRecommended: string;
}

export const IGUAZU_KNOWLEDGE = {
  /** Lugares conocidos en la triple frontera para ayudar al LLM a reconocer nombres */
  knownPlaces: [
    // Aeropuertos
    { name: "Aeropuerto IGR", aliases: ["IGR", "aeropuerto iguazu", "cataratas del iguazu", "aeropuerto de iguazu", "aeropuerto de puerto iguazu"], type: "airport", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Aeropuerto IGU", aliases: ["IGU", "aeroporto foz", "aeroporto internacional foz"], type: "airport", city: "Foz do Iguaçu", country: "Brasil" },
    { name: "Aeropuerto AGT", aliases: ["AGT", "aeropuerto guarani", "aeropuerto de ciudad del este"], type: "airport", city: "Ciudad del Este", country: "Paraguay" },

    // Hoteles (mencionados en blog)
    { name: "Gran Meliá Iguazú", aliases: ["melia", "gran melia", "gran meliá"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Amerian Portal del Iguazú", aliases: ["amerian", "portal del iguazu", "hotel amerian"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Falls Iguazú Hotel & Spa", aliases: ["falls iguazu", "falls hotel", "falls"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Iguazú Grand Resort", aliases: ["grand resort", "iguazu grand"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Panoramic Grand Iguazú", aliases: ["panoramic", "panoramic grand", "panoramic iguazu"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Loi Suites Iguazú Hotel", aliases: ["loi suites", "loi"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },

    // Atractivos naturales
    { name: "Parque Nacional Iguazú (Lado Argentino)", aliases: ["cataratas", "parque nacional iguazu", "cataratas argentinas", "cataratas del iguazu", "garganta del diablo"], type: "park", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Parque Nacional do Iguaçu (Lado Brasileño)", aliases: ["cataratas brasil", "iguazu brasil", "parque nacional brasil", "macuco safari"], type: "park", city: "Foz do Iguaçu", country: "Brasil" },
    { name: "Parque das Aves", aliases: ["parque das aves", "bird park", "parque de los pajaros", "paseo de los pajaros"], type: "park", city: "Foz do Iguaçu", country: "Brasil" },

    // Atractivos culturales
    { name: "Hito Tres Fronteras", aliases: ["hito", "tres fronteras", "marco das tres fronteiras", "hito argentino", "obelisco"], type: "landmark", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Marco das Três Fronteiras", aliases: ["marco brasil", "tres fronteras brasil", "marco das tres fronteiras"], type: "landmark", city: "Foz do Iguaçu", country: "Brasil" },
    { name: "GüiráOga", aliases: ["guiraoga", "guira oga", "centro de fauna", "refugio de animales"], type: "park", city: "Puerto Iguazú", country: "Argentina" },
    { name: "La Aripuca", aliases: ["aripuca", "la aripuca", "parque tematico"], type: "landmark", city: "Puerto Iguazú", country: "Argentina" },

    // Represas
    { name: "Itaipú Binacional", aliases: ["itaipu", "represa itaipu", "itaipu panoramic", "itaipu especial"], type: "landmark", city: "Foz do Iguaçu", country: "Brasil" },

    // Zonas / barrios
    { name: "Centro de Puerto Iguazú", aliases: ["centro iguazu", "centro puerto iguazu", "microcentro iguazu"], type: "neighborhood", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Centro de Foz do Iguaçu", aliases: ["centro foz", "centro brasil"], type: "neighborhood", city: "Foz do Iguaçu", country: "Brasil" },
    { name: "Microcentro de Ciudad del Este", aliases: ["centro cde", "centro paraguay", "microcentro cde"], type: "neighborhood", city: "Ciudad del Este", country: "Paraguay" },
    { name: "Departamento Centro Victoria Aguirre", aliases: ["victoria aguirre", "departamento centro"], type: "neighborhood", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Duty Free Shop Puerto Iguazú", aliases: ["duty free", "duty free iguazu", "free shop"], type: "shopping", city: "Puerto Iguazú", country: "Argentina" },

    // Aduanas
    { name: "Aduana Tancredo Neves", aliases: ["aduana argentina", "aduana tancredo", "puente tancredo", "aduana argentina brasil"], type: "customs" },
    { name: "Aduana de Foz (lado BR)", aliases: ["aduana brasil", "aduana brasilena", "alfândega brasileira"], type: "customs", city: "Foz do Iguaçu", country: "Brasil" },

    // Larga distancia
    { name: "Minas de Wanda", aliases: ["wanda", "minas de wanda", "minas wanda", "piedras preciosas"], type: "landmark" },
    { name: "San Ignacio Miní", aliases: ["san ignacio", "ruinas de san ignacio", "san ignacio mini", "misiones jesuiticas"], type: "landmark" },
    { name: "Saltos del Moconá", aliases: ["mocona", "saltos del mocona", "saltos mocona", "yaboti"], type: "park" },
  ] as AttractionInfo[],

  /** Información migratoria para cruce AR↔BR */
  migration: {
    requiredDocs: [
      "DNI tarjeta físico (NO válido DNI digital de Mi Argentina)",
      "Pasaporte (para extranjeros residentes)",
      "Pre-Cadastro Migratório QR (opcional pero recomendado)",
    ],
    qrInfo: "Pre-Cadastro Migratório de la Policía Federal de Brasil. Se genera en gov.br/pf. Reduce el tiempo en la casilla de 15 min a 2-3 min.",
    minorsInfo: "Menores de 18 años deben viajar con ambos padres (Partida de Nacimiento). Si viaja con uno solo o terceros: Autorización ante Escribano o Migraciones. Trámite 'Al Instante' disponible en la frontera (~$500-800 ARS).",
    taxFreeInfo: "Franquicia ARCA: USD 300 por adulto, USD 150 por menor (vía terrestre). Beneficio adicional de USD 500 en Duty Free Shop de llegada en Puerto Iguazú.",
    insuranceInfo: "No se exige vacunación COVID-19. Decreto 366/2025 exceptúa seguro médico obligatorio a visitantes de corta duración en zonas de frontera. Se recomienda seguro de viaje.",
  } as MigrationInfo,

  /** Transporte en la zona */
  transport: {
    airportDistance: "15 km desde el centro de Puerto Iguazú",
    airportTime: "20-25 min en auto",
    taxiVsRemis: "En Puerto Iguazú no hay taxímetro. Taxis y remises tienen tarifas preestablecidas y transparentes. Remís: servicio con reserva previa, tarifa conocida de antemano. Taxi: disponible en paradas sin reserva.",
    uberNotRecommended: "Uber en Puerto Iguazú tiene poca predictibilidad de precios, falta de transparencia, operación informal, disponibilidad limitada en madrugada. No recomendado para vuelos críticos.",
  } as TransportInfo,

  /** Tarifas de atractivos (blog, 2026) */
  attractions: {
    parqueNacionalAR: {
      name: "Parque Nacional Iguazú (Lado Argentino)",
      hours: "8:00 a 18:00 (último ingreso 16:00). Abierto 365 días.",
      prices: { turistaGeneral: "$45.000 ARS", residenteNacional: "$15.000 ARS", residenteProvincial: "$5.000 ARS", menores: "0-5 gratis / Estudiante $7.000 ARS" },
      tips: "Circuito Superior y Garganta del Diablo 100% accesibles. Beneficio 50% 2º día consecutivo dentro de 72 hs. Tren Ecológico 8:20-15:30.",
    },
    parqueNacionalBR: {
      name: "Parque Nacional do Iguaçu (Lado Brasileño)",
      hours: "09:00-16:00 (L-V), 08:30-16:00 (S-D)",
      prices: { turistaGeneral: "R$ 134,00", mercosur: "R$ 121,00" },
      tips: "Compra exclusivamente online con ventanas horarias. No hay venta presencial. Macuco Safari recomendado como add-on.",
    },
    paseoLunaLlena: {
      name: "Paseo de Luna Llena",
      hours: "5 noches al mes durante luna llena. Turnos: 19:45, 20:30, 21:15. Duración ~2.5 horas.",
      prices: { general: "$95.000 ARS", menores: "6-12 $47.500 ARS / <6 gratis" },
      tips: "Reserva obligatoria con meses de anticipación. Incluye guía bilingüe y coro guaraní. Se cancela por lluvia (reprogramación o reembolso).",
    },
    itaipu: {
      name: "Itaipú Binacional",
      prices: { panoramica: "R$ 63,00", especial: "R$ 185,00 (+14 años)" },
      tips: "Penalidad del 100% si cancelás con menos de 4 horas de anticipación. Visita Especial: 2h 30min.",
    },
    wanda: {
      name: "Minas de Wanda",
      distance: "49 km al sur de Puerto Iguazú (50 min en auto)",
      hours: "Todos los días 07:30 a 18:00",
      prices: { general: "$10.000 ARS", reducida: "$8.000 ARS (nacionales)", menores: "Menores de 7 años gratis" },
      tips: "Pago en efectivo exclusivamente. Recorrido guiado obligatorio 1-1.5 horas. Calzado cerrado con suela antideslizante.",
    },
    sanIgnacio: {
      name: "San Ignacio Miní",
      distance: "242 km al sur (~3 horas en traslado privado)",
      hours: "Lunes a domingo 07:30 a 18:00",
      prices: { extranjero: "$19.000 ARS", residenteAR: "$8.000 ARS", residenteMisionero: "$3.500 ARS", jubilados: "$5.000 ARS", espectaculoNocturno: "$19.000 / $8.000 / $3.500 / $5.000 ARS" },
      tips: "Boleto Único 4 Misiones válido 15 días (incluye San Ignacio, Santa Ana, Loreto, Santa María la Mayor). Espectáculo Nocturno de Imagen y Sonido (45 min) jueves a domingo desde 19:30. Se suspende por lluvia.",
    },
    mocona: {
      name: "Saltos del Moconá",
      distance: "320 km (~5-5.5 horas por tramo)",
      hours: "Lunes a domingo 09:30 a 17:00. Lanchas: 08:00-18:30 (Verano), 09:00-17:30 (Invierno)",
      prices: { extranjeroEntrada: "$19.000 ARS", extranjeroNautica: "$74.000 ARS", residenteAREntrada: "$8.000 ARS", residenteARNautica: "$52.000 ARS", residenteMisioneroEntrada: "$4.200 ARS", residenteMisioneroNautica: "$40.000 ARS" },
      tips: "Extrema dependencia hidrológica. Creciente del Río Uruguay tapa cascadas. Creciente Arroyo Yabotí inhabilita acceso terrestre. Se recomienda 2 días y 1 noche en El Soberbio. Consultar estado: WhatsApp Turismo Misiones (+54 9 3764 13-8114).",
    },
    fozAttractions: {
      parqueDasAves: { hours: "08:30-16:30", prices: { general: "R$ 130,00", mercosur: "R$ 117,00" }, tips: "Residentes deben comprar en ventanilla física" },
      yupStar: { hours: "12:00-20:00 (L-J), 11:30-20:30 (V-D)", prices: { taquilla: "R$ 79,00", web: "R$ 59,90" }, tips: "20 min de giro. Comprar online es más barato (R$ 59,90 web vs R$ 79,00 taquilla)" },
      bluePark: { hours: "10:00-17:00 (Mié-Lun)", prices: { general: "R$ 270,00" }, tips: "Día completo (7-8 horas)" },
      marcoTresFronteiras: { hours: "13:30-21:00 (Ma-Dom)", prices: { general: "R$ 55,00" }, tips: "3 a 4 horas (gastronomía + shows 19:30)" },
    },
  },
};

/**
 * Busca un lugar conocido por alias, útil para que el LLM reconozca
 * nombres comunes que los usuarios usan.
 */
export function findKnownPlace(text: string): AttractionInfo | undefined {
  const lower = text.toLowerCase().trim();
  return IGUAZU_KNOWLEDGE.knownPlaces.find(p =>
    p.aliases.some(a => lower.includes(a)) ||
    lower.includes(p.name.toLowerCase()),
  );
}

/**
 * Genera un string con los lugares conocidos para inyectar en prompts de LLM.
 */
export function getKnownPlacesPrompt(): string {
  const lines = IGUAZU_KNOWLEDGE.knownPlaces.map(p => {
    const location = [p.city, p.country].filter(Boolean).join(", ");
    return `- "${p.name}"${location ? ` (${location})` : ""} — conocido también como: ${p.aliases.slice(0, 4).join(", ")}`;
  });
  return [
    "LUGARES CONOCIDOS EN LA TRIPLE FRONTERA:",
    ...lines,
  ].join("\n");
}
