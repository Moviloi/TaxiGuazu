// TAXIGUAZU KNOWLEDGE — información operacional del servicio
// Contenido curado sobre cómo funciona TaxiGuazú en la práctica.
// Se inyecta en prompts de LLM para responder preguntas operativas.
//
// IMPORTANTE: Esto describe el servicio REAL, no idealizado.
// El bot NO ejecuta coordinación — solo informa y prepara.
// El chofer es quien coordina directamente con el pasajero.

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
}

export const TAXIGUAZU_KNOWLEDGE: OperationalInfo = {
  coordination: [
    "El chofer se contacta DIRECTAMENTE con el pasajero para coordinar el punto de encuentro exacto y el horario.",
    "Para viajes desde aeropuerto: el chofer contacta al pasajero cuando está yendo hacia el aeropuerto, no antes.",
    "El pasajero debe mantener el teléfono activo y atento desde que aterriza.",
    "Para reservas futuras (días o semanas antes): el chofer contacta al pasajero 1 día antes del viaje para reconfirmar llegada, horario y dar tranquilidad.",
    "El bot prepara la reserva y pasa la información. La coordinación fina la hace el chofer.",
  ],
  borderCrossing: [
    "El chofer acompaña al pasajero durante los trámites migratorios en el cruce de frontera.",
    "Para cruzar AR↔BR: se completa un Manifiesto de Pasajeros que debe ser sellado por un agente de Migraciones.",
    "Los vehículos de TaxiGuazú tienen acceso a una vía más rápida en los cruces de frontera (carril preferencial).",
    "Documentación requerida: DNI físico (NO digital), pasaporte para extranjeros. Pre-Cadastro Migratório QR (opcional).",
  ],
  pricing: [
    "El precio es POR VEHÍCULO, no por persona. Hasta 4 o 6 pasajeros según el vehículo.",
    "El precio incluye peajes, combustible y asistencia del chofer en migraciones.",
    "Métodos de pago aceptados: efectivo (ARS, USD, BRL), transferencia bancaria, tarjeta de crédito/débito.",
    "Para viajes ida y vuelta aplica un precio de paquete (suele ser más económico que dos viajes separados).",
    "Para multi-trayecto (ej: hotel → cataratas → centro → aeropuerto) se cotiza como viaje por hora o paquete personalizado.",
  ],
  tripTypes: [
    "Traslados simples: aeropuerto ↔ hotel, hotel ↔ cataratas, hotel ↔ centro, etc.",
    "Multi-trayecto: varios destinos en un mismo viaje (ej: hotel → cataratas → centro → aeropuerto).",
    "Viajes ida y vuelta: round-trip al mismo destino con regreso programado.",
    "City tour o visitas guiadas: el chofer espera al pasajero y lo lleva a varios puntos turísticos.",
    "Viajes inter-city: Puerto Iguazú, Foz do Iguaçu, Ciudad del Este y destinos cercanos.",
    "Traslados nocturnos/madrugada: disponibles con reserva anticipada.",
  ],
  communication: [
    "El bot habla en nombre de TaxiGuazú pero NO reemplaza al chofer.",
    "El chofer y el pasajero coordinan los detalles finos del encuentro (qué puerta, qué cartel, etc.).",
    "El pasajero puede solicitar un vehículo específico (tipo, capacidad, color) y se asignará según disponibilidad.",
    "Si hay cambios de horario o cancelaciones, el pasajero debe avisar con la mayor anticipación posible.",
    "WhatsApp es el canal principal de comunicación con el chofer.",
  ],
  tips: [
    "Siempre tener el teléfono con saldo/ WiFi al llegar para recibir la llamada del chofer.",
    "Si el vuelo se retrasa, el chofer monitorea el estado del vuelo y ajusta el horario de llegada.",
    "En la frontera AR→BR, el horario de migraciones puede extender el tiempo del viaje hasta 30-45 min adicionales.",
    "El Duty Free de Puerto Iguazú (lado AR) tiene franquicia especial de USD 500 adicional a la franquicia general.",
    "Para viajes al lado brasileño, es recomendable tener el QR de Pre-Cadastro Migratório listo.",
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
      : key.toUpperCase();
    sections.push(`\n${label}:`);
    for (const item of items) {
      sections.push(`- ${item}`);
    }
  }

  return sections.join("\n");
}
