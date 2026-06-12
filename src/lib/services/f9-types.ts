// F9: DRIFT DETECTION & LEARNING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Detectar drift en predicciones y aprendizaje.
// CURRENT STATUS: Cableado en lead.service.ts como pipeline bloqueado. f9-index.ts
//   orquesta housekeeping (limpieza de tablas). No modificar.
// MIGRATION NOTE: Deshabilitar perdería limpieza de tablas. Bloqueado hasta
//   Conversation Core + Pricing + Geo congelados.

export type F9EventType =
  | "conversion"
  | "cancelled_trip"
  | "ignored_opportunity"
  | "manual_override"
  | "operator_correction"
  | "admin_command"
  | "prediction_error";

export type F9EventSource = "F3" | "F7" | "F8" | "HUMAN";

export interface F9Event {
  id?: number;
  sessionId: string;
  type: F9EventType;
  entity?: string;
  intent?: string;
  predictedValue?: number;
  actualValue?: number;
  revenue?: number;
  timestamp: number;
  source: F9EventSource;
}

export type DriftSeverity = "low" | "medium" | "high" | "critical";

export interface F9Drift {
  id?: number;
  metric: string;
  entity: string;
  driftValue: number;
  severity: DriftSeverity;
  timestamp?: number;
}

export type AdminCommandAction =
  | "update_price"
  | "reclassify_entity"
  | "modify_policy"
  | "optimize_routing"
  | "adjust_weight";

export interface ParsedAdminCommand {
  original: string;
  action: AdminCommandAction;
  target: string;
  value: unknown;
  author: string;
}
