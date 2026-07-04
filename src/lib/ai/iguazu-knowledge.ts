// IGUAZU KNOWLEDGE — datos del Deep Research "Manual de Operaciones Logísticas, Fronteras y Atractivos en la Región de Iguazú"
// Fuente: Informe Deep Research Gemini, Julio 2026
// Se inyecta en prompts de LLM para mejorar precisión en contexto Iguazú.
//
// NOTA: NO incluye información de transportes competidores (taxis, buses, Uber).
// El chofer acompaña a los pasajeros en trámites migratorios y compras en CDE.
//
// AIT-030: datos geográficos extraídos a data/knowledge/geo/*.json.
//   - places.json → knownPlaces (36 entries, 125 aliases)
//   - borders.json → borders (25 fragments, 5 categories)
//   - attractions.json → attractions (12 entries)

import placesData from "../../../data/knowledge/geo/places.json";
import bordersData from "../../../data/knowledge/geo/borders.json";
import attractionsData from "../../../data/knowledge/geo/attractions.json";
import migrationData from "../../../data/knowledge/ops/migration.json";
import calendarData from "../../../data/knowledge/commercial/calendar.json";

export interface AttractionInfo {
  name: string;
  type: "park" | "hotel" | "landmark" | "airport" | "shopping" | "customs" | "neighborhood" | "restaurant";
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
  /** eVisa requirements for non-Mercosur nationals (new since April 2025) */
  eVisaInfo?: string;
  /** Per-country requirements */
  byNationality?: string[];
}

export interface TransportInfo {
  airportDistance: string;
  airportTime: string;
  /** Distancias a todos los aeropuertos de la región */
  airportDetails?: string[];
  /** Información del servicio premium */
  premiumService?: string[];
}

export interface BorderInfo {
  /** Puente Tancredo Neves AR↔BR */
  tancredoNeves: string[];
  /** Puente de la Amistad BR↔PY */
  puenteAmistad: string[];
  /** Corredor Turístico Trinacional */
  corredorTuristico: string[];
  /** Manifiesto de Pasajeros */
  manifiesto: string[];
  /** Franquicias aduaneras */
  customsDuty: string[];
}

export interface CDEShoppingInfo {
  overview: string[];
  certifiedStores: string[];
  fraudPrevention: string[];
  currencyTips: string[];
  priceComparison: string[];
}

export interface PracticalInfo {
  weather: string[];
  currency: string[];
  safety: string[];
  restaurantRecommendations: string[];
  language: string[];
}

export interface EventCalendar {
  lunaLlena: string[];
  holidaysArgentina: string[];
  holidaysBrasil: string[];
  holidaysParaguay: string[];
  seasons: string[];
}

export const IGUAZU_KNOWLEDGE = {
  /** Lugares conocidos en la triple frontera para ayudar al LLM a reconocer nombres */
  knownPlaces: placesData as AttractionInfo[],

  /** Información migratoria para cruce AR↔BR ↔ PY (data/knowledge/ops/migration.json) */
  migration: migrationData as MigrationInfo,

  /** Transporte en la zona */
  transport: {
    airportDistance: "IGR (Puerto Iguazú) a 25 km del centro (25 min en auto). IGU (Foz) a 13 km del centro (15 min).",
    airportTime: "IGR: 25 min. IGU: 15 min. AGT: 40 min hasta Ciudad del Este.",
    airportDetails: [
      "IGR → Centro Puerto Iguazú: 25 km, ~25 min en traslado privado.",
      "IGU → Centro Foz do Iguaçu: 13 km, ~15 min en traslado privado.",
      "AGT → Ciudad del Este: 25 km, ~40 min en traslado privado.",
      "El chofer de TaxiGuazú espera en el hall de arribos con cartel identificatorio.",
      "Monitoreo satelital de vuelos: el chofer ajusta su llegada según demoras, sin costo adicional.",
    ],
    premiumService: [
      "Traslado privado premium, POR VEHÍCULO (no por persona).",
      "Incluye peajes, combustible y asistencia del chofer en migraciones.",
      "Pago: efectivo (ARS, USD, BRL), transferencia, tarjeta de crédito/débito.",
      "Paquetes ida y vuelta más económicos que dos viajes separados.",
      "Multi-trayecto: se cotiza como viaje por hora o paquete personalizado.",
    ],
  } as TransportInfo,

  /** Información detallada de fronteras (data/knowledge/geo/borders.json) */
  borders: bordersData as BorderInfo,

  /** Guía de compras en Ciudad del Este */
  cdeShopping: {
    overview: [
      "Polo comercial libre de impuestos con grandes ventajas en electrónica, perfumería, bebidas e indumentaria.",
      "Productos de alta demanda: iPhones (USD ~850 vs USD ~1.800 en AR), perfumes importados (USD ~95 vs USD ~200 en AR).",
    ],
    certifiedStores: [
      "Shopping Paris: electrónica y perfumería de primer nivel.",
      "Shopping China: tecnología, electrodomésticos y artículos para el hogar.",
      "Monalisa: perfumería fina y cosméticos importados.",
      "Nissei: electrónica, informática y telefonía.",
      "Solo ingresar a centros departamentales con homologación oficial de marcas.",
    ],
    fraudPrevention: [
      "El chofer de TaxiGuazú acompaña personalmente y evita que los pasajeros sean abordados por captadores de calle ('piranhas' o falsos guías).",
      "Verificar que el local cuente con: accesos de seguridad privados, personal uniformado y emisión de factura legal con número de serie de productos.",
      "Alerta de estafa: ofertas de tecnología por debajo del 50% del precio internacional.",
      "No realizar transacciones con vendedores ambulantes informales en veredas públicas.",
      "Operar exclusivamente en horario comercial diurno (07:00-16:00).",
      "Retornar antes de las 16:00 — las calles del microcentro se vuelven solitarias y propensas a hurtos tras el cierre de comercios.",
    ],
    currencyTips: [
      "Mejor cotización en casas de cambio céntricas (Cambios Chaco, Mundial Cambios) — mejores tasas que en frontera.",
      "Portar billetes de USD 100, limpios, sin tachaduras ni cortes.",
      "Comercios locales suelen rechazar billetes de series antiguas ('cara chica') o dañados.",
      "Sistema multidivisas fluido: USD, BRL, PYG y ARS aceptados.",
    ],
    priceComparison: [
      "iPhone último modelo: ~USD 850 en CDE vs ~USD 1.800 en AR.",
      "Perfumes franceses 100ml: ~USD 95 en CDE vs ~USD 200 en AR.",
      "Electrónica en general: 40-50% menos que en Argentina.",
    ],
  } as CDEShoppingInfo,

  /** Información práctica */
  practical: {
    weather: [
      "Clima subtropical húmedo. Humedad relativa ~80% constante.",
      "Temporada de lluvias intensas: octubre, noviembre y febrero.",
      "Julio: estadísticamente el mes de menores lluvias y temperaturas más templadas — ideal para caminatas.",
      "Tormentas eléctricas breves de gran caudal seguidas de sol pleno son frecuentes.",
      "Lluvias intensas pueden cerrar preventivamente la pasarela de la Garganta del Diablo.",
      "Otoño e invierno (abril-agosto): mejor época para Saltos del Moconá (menor caudal del río).",
    ],
    currency: [
      "ARS (Argentina), BRL (Brasil), PYG (Paraguay). USD aceptado en los 3 países para hoteles, gastronomía y entradas turísticas.",
      "Tarjetas de crédito (Visa, MC, Amex) ampliamente aceptadas en AR y BR.",
      "Turistas internacionales: activar aviso de viaje con el banco emisor antes de llegar.",
      "Tipo de cambio MEP en Argentina: beneficio diferencial para consumos con tarjeta extranjera.",
      "Efectivo sugerido: ~USD 50 en moneda local para gastos menores (agua, propinas, peajes, recuerdos).",
    ],
    safety: [
      "Puerto Iguazú: índice de seguridad muy favorable. Evitar caminatas nocturnas en riberas sin iluminación.",
      "Foz do Iguaçu: segura en ejes gastronómicos y corredores turísticos (Avenida das Cataratas). Evitar áreas residenciales periféricas de noche.",
      "Ciudad del Este: alta complejidad urbana. Transitar solo en horario comercial (07:00-16:00). El chofer de TaxiGuazú acompaña y asiste durante las compras.",
    ],
    restaurantRecommendations: [
      "Premium: Aqva (cocina de autor misionera), El Jardín Iguazú Grand (menú degustación, huerta orgánica).",
      "Media: El Quincho del Tío Querido (asado tradicional con shows en vivo), La Rueda 1975 (pastas y vinos), Pizza Color (pizzas al horno de piedra, céntrico).",
      "Económico: La Mamma (pastas caseras abundantes), Patio Cervecero Patagonia (hamburguesas y cerveza artesanal, ambiente al aire libre).",
      "Horarios AR: almuerzo 12:30-14:30, cena 21:00-23:30.",
      "Horarios BR: almuerzo 11:30-13:30, cena 19:30-21:30.",
    ],
    language: [
      "Argentina: español. Paraguay: español + guaraní (cooficial). Brasil: portugués.",
      "Hoteles 4-5★ y restaurantes gourmet en Puerto Iguazú y Foz: personal bilingüe (inglés comercial).",
      "Choferes de TaxiGuazú: dominio fluido de español y portugués, competencias técnicas en inglés.",
    ],
  } as PracticalInfo,

  /** Calendario de eventos (data/knowledge/commercial/calendar.json) */
  calendar: calendarData as EventCalendar,

  /** Tarifas de atractivos (data/knowledge/geo/attractions.json) */
  attractions: attractionsData,
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

/**
 * Genera un string con información detallada de atracciones para inyectar en prompts informacionales.
 */
export function getAttractionsDetailPrompt(): string {
  const a = IGUAZU_KNOWLEDGE.attractions;
  return [
    "PRECIOS DE ATRACTIVOS (2026 — verificar en sitio oficial antes de confirmar):",
    `- ${a.parqueNacionalAR.name}: ${Object.entries(a.parqueNacionalAR.prices).map(([k, v]) => `${k}: ${v}`).join(", ")}. ${a.parqueNacionalAR.hours}`,
    `- ${a.parqueNacionalBR.name}: ${Object.entries(a.parqueNacionalBR.prices).map(([k, v]) => `${k}: ${v}`).join(", ")}. ${a.parqueNacionalBR.hours}`,
    `- Macuco Safari (bote): ${a.macucoSafari.prices.general}`,
    `- Parque das Aves: ${a.parqueDasAves.prices.general}. ${a.parqueDasAves.hours}`,
    `- Itaipú Panorâmica: ${a.itaipu.prices.panoramica}. Especial: ${a.itaipu.prices.circuitoEspecial}`,
    `- Marco das Três Fronteiras (BR): ${a.marcoTresFronteiras.prices.general}`,
    `- Hito Tres Fronteras (AR): gratuito`,
    `- Paseo Luna Llena: ${a.paseoLunaLlena.prices.general}`,
    `- Minas de Wanda: ${a.wanda.prices.general} (a ${a.wanda.distance})`,
    `- San Ignacio Miní: ${a.sanIgnacio.prices.extranjero} (a ${a.sanIgnacio.distance})`,
    `- Saltos del Moconá: entrada ${a.mocona.prices.extranjeroEntrada} + náutica ${a.mocona.prices.extranjeroNautica} (a ${a.mocona.distance})`,
    `- Güirá Oga: ${a.guiraOga.prices.extranjero} extranjeros / ${a.guiraOga.prices.nacional} nacionales`,
  ].join("\n");
}

/**
 * Genera un string con información migratoria completa para inyectar en prompts.
 */
export function getMigrationDetailPrompt(): string {
  const m = IGUAZU_KNOWLEDGE.migration;
  return [
    "INFORMACIÓN MIGRATORIA:",
    `- Documentación: ${m.requiredDocs.join("; ")}`,
    `- QR Pre-Cadastro: ${m.qrInfo}`,
    `- Menores: ${m.minorsInfo}`,
    `- Franquicia Aduanera: ${m.taxFreeInfo}`,
    `- Seguro/Salud: ${m.insuranceInfo}`,
    m.eVisaInfo ? `- eVisa USA/Canadá/Australia: ${m.eVisaInfo}` : "",
    m.byNationality ? `- Por nacionalidad: ${m.byNationality.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
}

/**
 * Genera un string con información de fronteras para inyectar en prompts.
 */
export function getBordersDetailPrompt(): string {
  const b = IGUAZU_KNOWLEDGE.borders;
  return [
    "CRUCE DE FRONTERAS:",
    "--- Puente Tancredo Neves (AR↔BR) ---",
    ...b.tancredoNeves.map(l => `- ${l}`),
    "--- Puente de la Amistad (BR↔PY) ---",
    ...b.puenteAmistad.map(l => `- ${l}`),
    "--- Corredor Turístico ---",
    ...b.corredorTuristico.map(l => `- ${l}`),
    "--- Manifiesto de Pasajeros ---",
    ...b.manifiesto.map(l => `- ${l}`),
    "--- Franquicias Aduaneras ---",
    ...b.customsDuty.map(l => `- ${l}`),
  ].join("\n");
}
