// IGUAZU KNOWLEDGE — datos del Deep Research "Manual de Operaciones Logísticas, Fronteras y Atractivos en la Región de Iguazú"
// Fuente: Informe Deep Research Gemini, Julio 2026
// Se inyecta en prompts de LLM para mejorar precisión en contexto Iguazú.
//
// NOTA: NO incluye información de transportes competidores (taxis, buses, Uber).
// El chofer acompaña a los pasajeros en trámites migratorios y compras en CDE.

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
  knownPlaces: [
    // ==================== AEROPUERTOS ====================
    {
      name: "Aeropuerto IGR (Cataratas del Iguazú)",
      aliases: ["IGR", "aeropuerto iguazu", "cataratas del iguazu", "aeropuerto de iguazu",
        "aeropuerto de puerto iguazu", "cataratas airport", "aeropuerto cataratas",
        "aeropuerto internacional cataratas del iguazú"],
      type: "airport", city: "Puerto Iguazú", country: "Argentina",
      tips: "A 25 km del centro de Puerto Iguazú. 24/7. Aerolíneas: Aerolíneas Argentinas, Flybondi, JetSMART. Conexiones directas: Buenos Aires, Córdoba, Rosario, Salta, Mendoza, Tucumán.",
    },
    {
      name: "Aeropuerto IGU (Foz do Iguaçu)",
      aliases: ["IGU", "aeroporto foz", "aeroporto internacional foz", "foz airport",
        "aeroporto internacional de foz do iguaçu"],
      type: "airport", city: "Foz do Iguaçu", country: "Brasil",
      tips: "A 13 km del centro de Foz. 24/7. Aerolíneas: LATAM, Gol, Azul. Conexiones: São Paulo (Guarulhos, Congonhas), Río de Janeiro (Galeão), Curitiba.",
    },
    {
      name: "Aeropuerto AGT (Guaraní - Ciudad del Este)",
      aliases: ["AGT", "aeropuerto guarani", "aeropuerto de ciudad del este", "guarani airport"],
      type: "airport", city: "Ciudad del Este", country: "Paraguay",
      tips: "A 25 km de Ciudad del Este. Tráfico principal de carga. Vuelos de cabotaje con Paranair desde Asunción.",
    },

    // ==================== HOTELES ====================
    { name: "Gran Meliá Iguazú", aliases: ["melia", "gran melia", "gran meliá"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Amerian Portal del Iguazú", aliases: ["amerian", "portal del iguazu", "hotel amerian"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Falls Iguazú Hotel & Spa", aliases: ["falls iguazu", "falls hotel", "falls"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Iguazú Grand Resort", aliases: ["grand resort", "iguazu grand"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Panoramic Grand Iguazú", aliases: ["panoramic", "panoramic grand", "panoramic iguazu"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Loi Suites Iguazú Hotel", aliases: ["loi suites", "loi"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Hotel Saint George", aliases: ["saint george", "san jorge"], type: "hotel", city: "Puerto Iguazú", country: "Argentina" },

    // ==================== ATRACTIVOS NATURALES ====================
    {
      name: "Parque Nacional Iguazú (Lado Argentino)",
      aliases: ["cataratas", "parque nacional iguazu", "cataratas argentinas", "cataratas del iguazu",
        "garganta del diablo", "cataratas argentinas", "parque nacional iguazú"],
      type: "park", city: "Puerto Iguazú", country: "Argentina",
      hours: "08:00 a 18:00 (último ingreso 16:30, último tren a Garganta 15:30). Abierto 365 días.",
      tips: "Tren Ecológico cada 15-20 min incluido en entrada. Circuitos: Garganta del Diablo (1100m pasarela), Superior, Inferior, Sendero Macuco (3.5km). 90% accesible. Sillas de ruedas gratuitas.",
    },
    {
      name: "Parque Nacional do Iguaçu (Lado Brasileño)",
      aliases: ["cataratas brasil", "iguazu brasil", "parque nacional brasil", "macuco safari",
        "cataratas brasileñas", "parque nacional do iguaçu"],
      type: "park", city: "Foz do Iguaçu", country: "Brasil",
      hours: "09:00 a 16:00. Programas exclusivos de amanecer desde 06:00.",
      tips: "Compra exclusivamente online (cataratasdoiguacu.com.br) con ventana horaria — NO hay venta física. Sendero único Trilha das Cataratas (1.2km). Ascensores panorámicos en mirador Garganta.",
    },
    {
      name: "Parque das Aves",
      aliases: ["parque das aves", "bird park", "parque de los pajaros", "paseo de los pajaros"],
      type: "park", city: "Foz do Iguaçu", country: "Brasil",
      hours: "08:30 a 16:30. Duración sugerida: 2 horas.",
      tips: "Santuario de aves de la Mata Atlántica. Aviarios de vuelo libre con guacamayos, tucanes y flamencos. Ubicado frente al Parque Nacional do Iguaçu de Brasil. Accesible.",
    },

    // ==================== ATRACTIVOS CULTURALES ====================
    {
      name: "Hito Tres Fronteras (Argentina)",
      aliases: ["hito", "tres fronteras", "hito argentino", "obelisco", "hito de las tres fronteras"],
      type: "landmark", city: "Puerto Iguazú", country: "Argentina",
      tips: "Acceso libre y gratuito 24/7. Espectáculo de Aguas Danzantes: martes a domingo 20:00 y 20:30 hs (gratuito). Feria de artesanías 16:00-22:00.",
    },
    {
      name: "Marco das Três Fronteiras (Brasil)",
      aliases: ["marco brasil", "tres fronteras brasil", "marco das tres fronteiras"],
      type: "landmark", city: "Foz do Iguaçu", country: "Brasil",
      hours: "Martes a domingo 15:00 a 21:00.",
      tips: "Complejo arancelado (R$ 70,50). Shows de danza tradicional 18:30-20:00. Restaurante Cabeza de Vaca.",
    },
    {
      name: "Güirá Oga",
      aliases: ["guiraoga", "guira oga", "centro de fauna", "refugio de animales"],
      type: "park", city: "Puerto Iguazú", country: "Argentina",
      tips: "Centro de rescate de fauna silvestre. RN12 km 1637. $30.000 ARS extranjeros, $25.000 ARS nacionales.",
    },
    { name: "La Aripuca", aliases: ["aripuca", "la aripuca", "parque tematico"], type: "landmark", city: "Puerto Iguazú", country: "Argentina" },

    // ==================== REPRESAS ====================
    {
      name: "Itaipú Binacional",
      aliases: ["itaipu", "represa itaipu", "itaipu panoramic", "itaipu especial"],
      type: "landmark", city: "Foz do Iguaçu", country: "Brasil",
      tips: "Mayor generadora de energía de Latinoamérica. Lado Brasil: Itaipú Panorâmica R$ 63,00 (1.5h), Circuito Especial R$ 185,00 (2.5h, +14 años, calzado cerrado). Itaipú Iluminada viernes/sábados 19:00 R$ 50,00. Lado Paraguay: gratuito, reserva previa a cturistico@itaipu.gov.py (cierre jueves).",
    },

    // ==================== ZONAS / BARRIOS ====================
    { name: "Centro de Puerto Iguazú", aliases: ["centro iguazu", "centro puerto iguazu", "microcentro iguazu"], type: "neighborhood", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Centro de Foz do Iguaçu", aliases: ["centro foz", "centro brasil"], type: "neighborhood", city: "Foz do Iguaçu", country: "Brasil" },
    { name: "Microcentro de Ciudad del Este", aliases: ["centro cde", "centro paraguay", "microcentro cde", "cdc"], type: "neighborhood", city: "Ciudad del Este", country: "Paraguay" },
    { name: "Departamento Centro Victoria Aguirre", aliases: ["victoria aguirre", "departamento centro"], type: "neighborhood", city: "Puerto Iguazú", country: "Argentina" },
    { name: "Duty Free Shop Puerto Iguazú", aliases: ["duty free", "duty free iguazu", "free shop"], type: "shopping", city: "Puerto Iguazú", country: "Argentina" },

    // ==================== ADUANAS ====================
    { name: "Puente Tancredo Neves", aliases: ["aduana argentina", "aduana tancredo", "puente tancredo",
      "aduana argentina brasil", "tancredo neves", "ponte internacional da fraternidade"], type: "customs" },
    { name: "Aduana de Foz (lado BR)", aliases: ["aduana brasil", "aduana brasilena", "alfândega brasileira",
        "aduana brasileña"], type: "customs", city: "Foz do Iguaçu", country: "Brasil" },
    { name: "Puente de la Amistad", aliases: ["puente amistad", "ponte da amizade", "aduana paraguay",
        "aduana brasil paraguay"], type: "customs", city: "Foz do Iguaçu / Ciudad del Este" },

    // ==================== LARGA DISTANCIA ====================
    {
      name: "Minas de Wanda",
      aliases: ["wanda", "minas de wanda", "minas wanda", "piedras preciosas"],
      type: "landmark",
      tips: "A 40 km al sur de Puerto Iguazú (RN12). Visita 1.5h. $10.000 ARS. Yacimiento de amatistas, topacios, cuarzos y ágatas. Pago solo efectivo. Calzado cerrado.",
    },
    {
      name: "San Ignacio Miní",
      aliases: ["san ignacio", "ruinas de san ignacio", "san ignacio mini", "misiones jesuiticas", "ruinas jesuíticas"],
      type: "landmark",
      tips: "A 240 km al sur de Puerto Iguazú. Patrimonio UNESCO. $19.000 ARS extranjeros, $8.000 ARS nacionales. Espectáculo Nocturno de Imagen y Sonido jueves a domingo desde 19:30. Boleto Único 4 Misiones válido 15 días.",
    },
    {
      name: "Saltos del Moconá",
      aliases: ["mocona", "saltos del mocona", "saltos mocona", "yaboti"],
      type: "park",
      tips: "A 325 km de Puerto Iguazú (viaje día completo 12-15h ida/vuelta). $19.000 ARS entrada + $95.000 ARS paseo náutico (extranjeros). Dependencia hidrológica crítica: creciente del Río Uruguay tapa cascadas. Mejor época: abril-agosto. Consultar estado antes de viajar.",
    },

    // ==================== RESTAURANTES RECOMENDADOS ====================
    { name: "Aqva", aliases: ["restaurante aqva", "aqva iguazu"], type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Cocina de autor con materias primas de Misiones. Ravioles de surubí, pacú laqueado, ojo de bife premium." },
    { name: "El Jardín (Iguazú Grand)", aliases: ["el jardin", "iguazu grand restaurante", "jardin iguazu grand"],
      type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Menú degustación refinado. Ingredientes de huerta orgánica del hotel." },
    { name: "El Quincho del Tío Querido", aliases: ["quincho tio querido", "quincho del tio"], type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Asador tradicional con shows de música autóctona y tango en vivo." },
    { name: "La Rueda 1975", aliases: ["la rueda 1975", "la rueda"], type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Pastas caseras, bife de chorizo, cava de vinos." },
    { name: "Pizza Color", aliases: ["pizza color"], type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Pizzas al horno de piedra, pastas y minutas. Céntrico." },
    { name: "La Mamma", aliases: ["la mamma"], type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Pastas caseras en porciones abundantes." },
    { name: "Patio Cervecero Patagonia", aliases: ["patio cervecero", "patagonia"], type: "restaurant", city: "Puerto Iguazú", country: "Argentina",
      tips: "Hamburguesas caseras, cervezas artesanales, ambiente al aire libre." },
  ] as AttractionInfo[],

  /** Información migratoria para cruce AR↔BR ↔ PY */
  migration: {
    requiredDocs: [
      "DNI tarjeta físico original (NO válido DNI digital de Mi Argentina, ni DNI manuscrito)",
      "Pasaporte (obligatorio para extranjeros no residentes en Mercosur)",
      "Pre-Cadastro Migratório QR (opcional pero reduce tiempo en casilla de 15min a 2-3min)",
    ],
    qrInfo: "Pre-Cadastro Migratório de la Policía Federal de Brasil. Se genera anticipadamente en gov.br/pf. Acelera el cruce migratorio de 15 min a 2-3 min por pasajero.",
    minorsInfo: "Menores de 18 años: si viajan con ambos progenitores → Partida de Nacimiento original o Libreta de Familia. Si viajan con un solo progenitor → Autorización notarial de viaje legalizada ante Escribano, Juez de Paz o Migraciones. Trámite 'Al Instante' disponible en frontera (~$500-800 ARS).",
    taxFreeInfo: "Franquicia ARCA (vía terrestre): USD 300 por adulto, USD 150 por menor. Beneficio adicional de USD 500 en Duty Free Shop de llegada de Puerto Iguazú. Excedente: 50% de arancel sobre el monto excedido. Exentos: 1 celular + 1 notebook/tablet por pasajero.",
    insuranceInfo: "No se exige vacunación COVID-19. Decreto 366/2025 exceptúa seguro médico obligatorio a visitantes de corta duración en zonas de frontera. Se recomienda seguro de viaje. Vacuna Fiebre Amarilla recomendada (no obligatoria) para estadías prolongadas en selva.",
    eVisaInfo: "Desde el 10 de abril de 2025: Ciudadanos de EE.UU., Canadá y Australia requieren eVisa para ingresar a Brasil (aunque sea excursión de 1 día). Trámite 100% online en brazil.vfsevisa.com. Costo: USD 80,90. Procesamiento: 5 días hábiles. Vigencia: 10 años (EE.UU.) / 5 años (Canadá, Australia). Requiere pasaporte vigente, itinerario de vuelos, extracto bancario con saldo mínimo USD 2.000.",
    byNationality: [
      "Mercosur (AR, BR, PY, UY): solo DNI digital físico o pasaporte vigente. NO válidos: DNI manuscritos, constancias en trámite, capturas de pantalla del DNI digital.",
      "Unión Europea (zona Schengen): sin visado para turismo hasta 90 días en AR o BR.",
      "Asia (China, India): verificar visado físico tradicional. Exención si poseen visa vigente de EE.UU. o Schengen.",
      "Menores: documentación adicional según el caso (ver minorsInfo).",
    ],
  } as MigrationInfo,

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

  /** Información detallada de fronteras */
  borders: {
    tancredoNeves: [
      "Conecta Puerto Iguazú (AR) con Foz do Iguaçu (BR) — RN12 ↔ BR-469.",
      "Abierto 24/7. Pico de congestión: 07:30-09:30 (hacia BR), 17:00-19:30 (retorno AR).",
      "Corredor Turístico disponible para TaxiGuazú: carriles preferenciales de Migraciones.",
      "Documentación: DNI físico o pasaporte (ver migration.byNationality).",
      "El chofer gestiona el Manifiesto de Pasajeros en ventanilla preferencial — los pasajeros no deben descender del vehículo.",
    ],
    puenteAmistad: [
      "Conecta Foz do Iguaçu (BR) con Ciudad del Este (PY) — alta densidad vehicular.",
      "Abierto 24/7. Pico de congestión: lunes a sábado 07:00-15:00 (demoras de +2 horas).",
      "NO existe carril de corredor turístico en este paso fronterizo.",
      "Planificar cruces en horarios matutinos tempranos o al final de la tarde.",
      "El chofer acompaña personalmente a los pasajeros para evitar 'piranhas' (falsos guías de calle).",
    ],
    corredorTuristico: [
      "Beneficio exclusivo para empresas de remises, taxis y transfers con habilitación municipal e internacional.",
      "Carriles de tránsito rápido en puestos fronterizos del Puente Tancredo Neves.",
      "Requiere presentación del Manifiesto de Pasajeros firmado electrónicamente por la empresa.",
      "El chofer gestiona migración de forma centralizada en ventanilla preferencial.",
    ],
    manifiesto: [
      "Documento oficial de control migratorio trinacional.",
      "Lo completa Operaciones de TaxiGuazú antes del inicio del traslado.",
      "Debe contener: datos del vehículo, póliza Carta Verde (seguro Mercosur), y lista de pasajeros (nombre completo, nacionalidad, tipo/número de documento).",
      "El chofer porta 2 copias impresas firmadas para presentar en ventanillas de aduana.",
    ],
    customsDuty: [
      "Franquicia general vía terrestre AR: USD 300/adulto, USD 150/menor (+16 años).",
      "Franquicia adicional Duty Free Puerto Iguazú: USD 500 (exclusivo para compras en el free shop de llegada).",
      "Excedente: arancel del 50% sobre la diferencia.",
      "Artículos exentos: 1 celular + 1 notebook/tablet por pasajero (uso personal).",
      "Peaje de frontera RN12: solo efectivo ARS. Incluido en tarifa TaxiGuazú.",
      "Ingreso de BR a PY: franquicia USD 500/persona (Receita Federal).",
      "Ingreso de PY a AR: franquicia USD 300/persona (AFIP/ARCA).",
    ],
  } as BorderInfo,

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

  /** Calendario de eventos */
  calendar: {
    lunaLlena: [
      "Paseo Nocturno de Luna Llena en Parque Nacional Iguazú (lado AR).",
      "Salidas limitadas a grupos reducidos con guardaparques y guías bilingües. Duración ~2.5 horas.",
      "2026 tiene 13 lunas llenas (fenómeno astronómico). Calendario:",
      "  - Enero: 2-3 (viernes-sábado)",
      "  - Febrero: 1-2 (domingo-lunes)",
      "  - Marzo: 2-3 (lunes-martes)",
      "  - Abril: 1-2 (miércoles-jueves)",
      "  - Mayo: 1-2 (viernes-sábado)",
      "  - Junio: 29-30 (lunes-martes)",
      "  - Julio: 29-30 (miércoles-jueves)",
      "  - Agosto: 27-28 (jueves-viernes)",
      "  - Septiembre: 25-26 (viernes-sábado)",
      "  - Octubre: 25-26 (domingo-lunes)",
      "  - Noviembre: 23-24 (lunes-martes)",
      "  - Diciembre: 22-23 (martes-miércoles)",
      "Reserva obligatoria con meses de anticipación. Se cancela por lluvia (reprogramación o reembolso).",
    ],
    holidaysArgentina: [
      "Año Nuevo (1 ene), Carnaval (16-17 feb), Día de la Memoria (24 mar), Viernes Santo (3 abr), Día del Trabajador (1 may), Revolución de Mayo (25 may), Güemes (17 jun), Bandera (20 jun), Independencia (9 jul), San Martín (17 ago), Diversidad Cultural (12 oct), Soberanía Nacional (20 nov), Inmaculada Concepción (8 dic), Navidad (25 dic).",
    ],
    holidaysBrasil: [
      "Año Nuevo (1 ene), Carnaval (16-17 feb), Viernes Santo (3 abr), Tiradentes (21 abr), Día del Trabajo (1 may), Corpus Christi (4 jun), Independencia (7 sep), Aparecida (12 oct), Finados (2 nov), Proclamación República (15 nov), Navidad (25 dic).",
    ],
    holidaysParaguay: [
      "Año Nuevo (1 ene), Héroes (1 mar), Jueves/Viernes Santo (2-3 abr), Día del Trabajador (1 may), Independencia (15 may), Paz del Chaco (12 jun), Jura Constitución (20 jun), Fundación Asunción (15 ago), Boquerón (29 sep), Caacupé (8 dic), Navidad (25 dic).",
    ],
    seasons: [
      "Temporada ALTA: enero, febrero (carnaval), julio (receso escolar), Semana Santa, feriados puente. Precios altos, reservar con 30+ días de anticipación.",
      "Temporada BAJA: marzo-junio (excepto Semana Santa), agosto-noviembre (excepto feriados). Tarifas más bajas, menos visitantes — ideal para turismo de alta gama.",
    ],
  } as EventCalendar,

  /** Tarifas de atractivos (Deep Research, 2026) */
  attractions: {
    parqueNacionalAR: {
      name: "Parque Nacional Iguazú (Lado Argentino)",
      hours: "08:00 a 18:00 (último ingreso 16:30, último tren a Garganta 15:30). Abierto 365 días.",
      prices: {
        turistaExtranjero: "$60.000 ARS",
        residenteNacional: "$25.000 ARS",
        residenteProvincial: "$8.000 ARS",
        estudianteUniversitario: "$15.000 ARS",
        menores: "0-5 años gratis",
      },
      tips: "Garganta del Diablo (pasarela 1100m), Circuito Superior, Circuito Inferior, Sendero Macuco (3.5km). Tren Ecológico cada 15-20 min incluido. 90% accesible. Sillas de ruedas gratuitas. Beneficio 50% 2º día consecutivo dentro de 72 hs.",
    },
    parqueNacionalBR: {
      name: "Parque Nacional do Iguaçu (Lado Brasileño)",
      hours: "09:00-16:00. Programas de amanecer desde 06:00.",
      prices: {
        turistaInternacional: "R$ 134,00",
        mercosur: "R$ 121,00",
        menores: "0-6 años gratis",
      },
      tips: "Compra exclusivamente online (cataratasdoiguacu.com.br) con ventana horaria. NO hay venta física. Sendero Trilha das Cataratas (1.2km). Ascensores panorámicos en mirador Garganta.",
    },
    macucoSafari: {
      name: "Macuco Safari (Paseo en Bote - Lado BR)",
      hours: "Dentro del horario del parque (09:00-16:00)",
      prices: { general: "R$ 384,00 por adulto" },
      tips: "Incluye traslado en vehículos eléctricos por la selva, caminata opcional por pasarelas colgantes + navegación en lanchas bimotor bajo los saltos. Llevar muda de ropa de repuesto.",
    },
    paseoLunaLlena: {
      name: "Paseo de Luna Llena (Parque Nacional Iguazú - Lado AR)",
      hours: "Noches de luna llena. Duración ~2.5 horas. Grupos reducidos.",
      prices: { general: "$95.000 ARS", menores: "6-12 $47.500 ARS / <6 gratis" },
      tips: "Reserva obligatoria con meses de anticipación. Incluye guía bilingüe y coro guaraní. Se cancela por lluvia (reprogramación o reembolso). 13 lunas llenas en 2026 — ver calendar.lunaLlena.",
    },
    itaipu: {
      name: "Itaipú Binacional",
      prices: {
        panoramica: "R$ 63,00 (1.5h)",
        circuitoEspecial: "R$ 185,00 (2.5h, +14 años, calzado cerrado)",
        iluminada: "R$ 50,00 (viernes/sábados 19:00)",
      },
      tips: "Lado Paraguay completamente gratuito (reserva previa a cturistico@itaipu.gov.py, cierre jueves). Penalidad 100% si cancelás con menos de 4h de anticipación.",
    },
    parqueDasAves: {
      name: "Parque das Aves (Foz do Iguaçu)",
      hours: "08:30-16:30. Duración sugerida: 2 horas.",
      prices: { general: "R$ 110,00", menores: "0-8 años gratis" },
      tips: "Santuario de aves de la Mata Atlántica. Aviarios de vuelo libre. Ubicado frente al Parque Nacional do Iguaçu. Accesible.",
    },
    marcoTresFronteiras: {
      name: "Marco das Três Fronteiras (Brasil)",
      hours: "Martes a domingo 15:00-21:00",
      prices: { general: "R$ 70,50" },
      tips: "Shows de danza tradicional 18:30-20:00. Restaurante Cabeza de Vaca. 3-4 horas sugeridas.",
    },
    wanda: {
      name: "Minas de Wanda",
      distance: "40 km al sur de Puerto Iguazú (RN12)",
      hours: "Todos los días 07:30 a 18:00",
      prices: { general: "$10.000 ARS" },
      tips: "Pago en efectivo exclusivamente. Recorrido guiado obligatorio 1-1.5 horas. Calzado cerrado con suela antideslizante. Amatistas, topacios, cuarzos, ágatas.",
    },
    sanIgnacio: {
      name: "San Ignacio Miní",
      distance: "240 km al sur (~3 horas en traslado privado)",
      hours: "Lunes a domingo 07:30 a 18:00",
      prices: {
        extranjero: "$19.000 ARS",
        residenteAR: "$8.000 ARS",
        residenteMisionero: "$3.500 ARS",
        espectaculoNocturno: "$19.000 / $8.000 / $3.500 ARS",
      },
      tips: "Patrimonio UNESCO. Boleto Único 4 Misiones válido 15 días. Espectáculo Nocturno de Imagen y Sonido (45 min) jueves a domingo desde 19:30. Se suspende por lluvia.",
    },
    mocona: {
      name: "Saltos del Moconá",
      distance: "325 km (~5-5.5 horas por tramo, viaje día completo 12-15h)",
      hours: "09:30-17:00. Lanchas: 08:00-18:30 (Verano), 09:00-17:30 (Invierno)",
      prices: {
        extranjeroEntrada: "$19.000 ARS",
        extranjeroNautica: "$95.000 ARS",
        nacionalEntrada: "$8.000 ARS",
        nacionalNautica: "$66.000 ARS",
      },
      tips: "Dependencia hidrológica crítica: creciente del Río Uruguay tapa cascadas. Creciente Arroyo Yabotí inhabilita acceso terrestre. No apto para movilidad reducida. Mejor época: abril-agosto (otoño-invierno). consultar estado antes.",
    },
    guiraOga: {
      name: "Güirá Oga",
      distance: "RN12 km 1637",
      hours: "Recorridos guiados a pie y en vehículos abiertos",
      prices: {
        extranjero: "$30.000 ARS",
        nacional: "$25.000 ARS",
      },
      tips: "Centro de rescate, rehabilitación y recría de fauna silvestre de la selva misionera.",
    },
    hitoArgentino: {
      name: "Hito Tres Fronteras (Argentina)",
      hours: "24/7, acceso libre y gratuito.",
      prices: { ingreso: "Gratuito" },
      tips: "Espectáculo de Aguas Danzantes: martes a domingo 20:00 y 20:30. Feria de artesanías 16:00-22:00. Duración sugerida: 1 hora.",
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
