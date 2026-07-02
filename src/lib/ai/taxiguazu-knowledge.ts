// TAXIGUAZU KNOWLEDGE — información operacional del servicio
// Actualizado con Deep Research "Manual de Operaciones Logísticas" (Julio 2026)
// Contenido curado sobre cómo funciona TaxiGuazú en la práctica.
// Se inyecta en prompts de LLM para responder preguntas operativas.
//
// IMPORTANTE: Esto describe el servicio REAL, no idealizado.
// El bot NO ejecuta coordinación — solo informa y prepara.
// El chofer es quien coordina directamente con el pasajero.
// NO incluye info de transportes competidores (taxis, buses, Uber).

export interface OperationalInfo {
  /** Cómo funciona la coordinación del viaje */
  coordination: string[];
  /** Detalles de cruce de frontera */
  borderCrossing: string[];
  /** Política de precios */
  pricing: string[];
  /** Tipos de viaje */
  tripTypes: string[];
  /** Comunicación con el pasajero */
  communication: string[];
  /** Datos útiles para el pasajero */
  tips: string[];
  /** Acompañamiento del chofer en CDE y trámites */
  driverAssistance: string[];
  /** Protocolo aeroportuario premium */
  airportProtocol: string[];
}

export const TAXIGUAZU_KNOWLEDGE: OperationalInfo = {
  coordination: [
    "El chofer se contacta DIRECTAMENTE con el pasajero para coordinar el punto de encuentro exacto y el horario.",
    "Para viajes desde aeropuerto: el chofer contacta al pasajero cuando está yendo hacia el aeropuerto, no antes.",
    "El pasajero debe mantener el teléfono activo y atento desde que aterriza.",
    "Para reservas futuras (días o semanas antes): el chofer contacta al pasajero 1 día antes del viaje para reconfirmar llegada, horario y dar tranquilidad.",
    "El bot prepara la reserva y pasa la información. La coordinación fina la hace el chofer.",
    "El chofer asiste en el llenado de declaraciones juradas de aduana para ingreso de bienes o efectivo > USD 10.000 (AFIP OM-2249A para AR, e-DBV Receita Federal para BR).",
  ],
  borderCrossing: [
    "El chofer acompaña al pasajero durante los trámites migratorios en el cruce de frontera.",
    "Para cruzar AR↔BR: se completa un Manifiesto de Pasajeros que debe ser sellado por un agente de Migraciones.",
    "TaxiGuazú tiene acceso al Corredor Turístico: carriles preferenciales de Migraciones en el Puente Tancredo Neves. El chofer gestiona el trámite en ventanilla preferencial — los pasajeros NO deben descender del vehículo en la mayoría de los casos.",
    "Documentación requerida: DNI físico original (NO digital, NO manuscrito), pasaporte para extranjeros. Pre-Cadastro Migratório QR recomendado.",
    "Desde abril 2025: ciudadanos de EE.UU., Canadá y Australia requieren eVisa para ingresar a Brasil (trámite online, USD 80,90, 5 días hábiles).",
    "Para cruces BR↔PY (Puente de la Amistad): NO hay carril preferencial. Planificar horarios: evitar 07:00-15:00 (lunes a sábado).",
    "El Manifiesto de Pasajeros lo prepara Operaciones de TaxiGuazú antes del viaje. El chofer porta 2 copias impresas firmadas.",
  ],
  pricing: [
    "El precio es POR VEHÍCULO, no por persona. Hasta 4 o 6 pasajeros según el vehículo.",
    "El precio incluye peajes, combustible y asistencia del chofer en migraciones.",
    "Métodos de pago aceptados: efectivo (ARS, USD, BRL), transferencia bancaria, tarjeta de crédito/débito.",
    "Para viajes ida y vuelta aplica un precio de paquete (suele ser más económico que dos viajes separados).",
    "Para multi-trayecto (ej: hotel → cataratas → centro → aeropuerto) se cotiza como viaje por hora o paquete personalizado.",
  ],
  tripTypes: [
    "Traslados simples: aeropuerto ↔ hotel, hotel ↔ cataratas, hotel ↔ centro, centro ↔ aeropuerto, etc.",
    "Multi-trayecto: varios destinos en un mismo viaje.",
    "Viajes ida y vuelta: round-trip al mismo destino con regreso programado.",
    "City tour o visitas guiadas: el chofer espera al pasajero y lo lleva a varios puntos turísticos.",
    "Viajes inter-city: Puerto Iguazú, Foz do Iguaçu, Ciudad del Este y destinos cercanos.",
    "Traslados nocturnos/madrugada: disponibles con reserva anticipada.",
    "Viajes de día completo: ej. Saltos del Moconá (12-15h ida y vuelta), City Tour Triple Frontera.",
  ],
  communication: [
    "El bot habla en nombre de TaxiGuazú pero NO reemplaza al chofer. Se presenta como 'Cris Virtual 24/7' — no se hace pasar por humano.",
    "El chofer y el pasajero coordinan los detalles finos del encuentro (qué puerta, qué cartel, etc.).",
    "El pasajero puede solicitar un vehículo específico (tipo, capacidad, color) y se asignará según disponibilidad.",
    "Si hay cambios de horario o cancelaciones, el pasajero debe avisar con la mayor anticipación posible.",
    "WhatsApp es el canal principal de comunicación con el chofer.",
    "No se automatiza negociación de precios. Se pueden ofrecer oportunidades/promociones/paquetes sin regateo automatizado.",
  ],
  tips: [
    "Siempre tener el teléfono con saldo/WiFi al llegar para recibir la llamada del chofer.",
    "Si el vuelo se retrasa, el chofer monitorea el estado del vuelo mediante radar satelital y ajusta el horario — sin costo adicional de espera hasta 90 min.",
    "En la frontera AR→BR, migraciones puede extender el viaje 30-45 min adicionales.",
    "El Duty Free de Puerto Iguazú (lado AR) tiene franquicia especial de USD 500 adicional a la franquicia general de USD 300.",
    "Para viajes al lado brasileño, es recomendable tener el QR de Pre-Cadastro Migratório listo.",
    "Peaje de frontera RN12 se paga solo en efectivo ARS — incluido en la tarifa de TaxiGuazú.",
    "USD 100 billetes nuevos, sin tachaduras ni cortes — los comercios en CDE rechazan billetes 'cara chica' o dañados.",
  ],
  driverAssistance: [
    "El chofer acompaña y asesora en trámites migratorios en ambos lados de la frontera.",
    "En Ciudad del Este: el chofer acompaña personalmente a los pasajeros durante las compras y evita el abordaje de captadores de calle ('piranhas' o falsos guías).",
    "El chofer asiste en el llenado de formularios aduaneros (AFIP OM-2249A para AR, e-DBV para BR) para ingreso de bienes o efectivo > USD 10.000.",
    "El chofer guía a los pasajeros a centros comerciales certificados y seguros, evitando estafas en locales no verificados.",
    "Idiomas del chofer: español y portugués fluido, vocabulario técnico en inglés para comitivas internacionales.",
    "El chofer NO es guía de turismo certificado — no puede realizar guiado interpretativo dentro de parques nacionales. Espera en áreas de estacionamiento designadas.",
  ],
  airportProtocol: [
    "Punto de encuentro: hall de arribos públicos, inmediatamente después de la entrega de equipaje y salida de aduana.",
    "El chofer porta tablet o cartelera premium con logotipo de TaxiGuazú y nombre del pasajero visible.",
    "Identificación digital: el pasajero recibe previamente ficha técnica con foto del chofer, nombre, teléfono, y datos del vehículo (marca, modelo, color, placa).",
    "Gestión de demoras: el equipo de despacho monitorea vuelos por radar satelital. El chofer se reprograma automáticamente para coincidir con el desembarque real. Sin cargos adicionales por espera.",
    "Vehículo estacionado en dársenas preferenciales de carga de pasajeros.",
  ],
};

/**
 * Genera un string con la información operacional para inyectar en prompts de LLM.
 */
export function getOperationalInfoPrompt(): string {
  const sections: string[] = ["INFORMACIÓN OPERACIONAL DE TAXIGUAZÚ (referencia obligatoria):"];

  for (const [key, items] of Object.entries(TAXIGUAZU_KNOWLEDGE)) {
    const label = key === "coordination" ? "COORDINACIÓN"
      : key === "borderCrossing" ? "CRUCE DE FRONTERA"
      : key === "pricing" ? "PRECIOS Y PAGO"
      : key === "tripTypes" ? "TIPOS DE VIAJE"
      : key === "communication" ? "COMUNICACIÓN"
      : key === "tips" ? "CONSEJOS"
      : key === "driverAssistance" ? "ASISTENCIA DEL CHOFER"
      : key === "airportProtocol" ? "PROTOCOLO AEROPORTUARIO"
      : key.toUpperCase();
    sections.push(`\n${label}:`);
    for (const item of items) {
      sections.push(`- ${item}`);
    }
  }

  return sections.join("\n");
}
