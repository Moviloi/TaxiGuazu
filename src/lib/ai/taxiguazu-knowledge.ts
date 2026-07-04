// TAXIGUAZU KNOWLEDGE — información operacional del servicio
// Actualizado con Deep Research "Manual de Operaciones Logísticas" (Julio 2026)
// Contenido curado sobre cómo funciona TaxiGuazú en la práctica.
// Se inyecta en prompts de LLM para responder preguntas operativas.
//
// IMPORTANTE: Esto describe el servicio REAL, no idealizado.
// El bot NO ejecuta coordinación — solo informa y prepara.
// El chofer es quien coordina directamente con el pasajero.
// NO incluye info de transportes competidores (taxis, buses, Uber).
//
// AIT-031: datos operacionales extraídos a data/knowledge/ops/operations.json.

import operationsData from "../../../data/knowledge/ops/operations.json";

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

export const TAXIGUAZU_KNOWLEDGE = operationsData as unknown as OperationalInfo;

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
