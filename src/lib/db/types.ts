export interface ConnectionStateRow {
  key: string;
  value: string | null;
  updated_at: number;
}

export interface ConversationRow {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  taken_by_human: number;
  human_operator_phone: string | null;
  trip_id: string | null;
  trip_status: string | null;
  last_message_at: number | null;
  created_at: number;
}

export interface MessageRow {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "human";
  content: string;
  created_at: number;
}

export type TripPhase =
  | "DRAFT"
  | "QUOTED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "CLOSED";

export type TripClosureReason =
  | "completed"
  | "cancelled"
  | "cancelled_client"
  | "cancelled_driver"
  | "expired"
  | "failed"
  | "reassigned"
  | "system_cleanup";

export interface TripRow {
  trip_id: string;
  client_phone: string;
  origin: string | null;
  destination: string | null;
  status: string | null;
  price_base: number | null;
  passengers: number | null;
  discount_tier: number | null;
  discount_explicit: number | null;
  assigned_driver_phone: string | null;
  created_at: number | null;
  updated_at: number | null;
  confirmed_at: number | null;
  contact_shared_at: number | null;
  commission_amount: number | null;
  commission_paid: number | null;
  comision_declarada: number | null;
  driver_payout: number | null;
  flight_number: string | null;
  hotel_destination: string | null;
  survey_sent: number | null;
  post_trip_response: string | null;
  scheduled_at: number | null;
  tariff_id: number | null;
  piso_base: number | null;
  garantizado_base: number | null;
  trip_phase: TripPhase | null;
  closure_reason: TripClosureReason | null;
}

export type DriverStatus = "pending" | "active" | "inactive" | "blocked";

export interface DriverInvitationRow {
  id: number;
  code: string;
  phone: string | null;
  created_by: string;
  created_at: number | null;
  expires_at: number | null;
  used_at: number | null;
  driver_id: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export interface DriverRow {
  driver_id: string;
  name: string | null;
  phone: string;
  is_principal: number | null;
  group_id: string | null;
  active: number | null;
  created_at: number | null;
  car_type: string | null;
  car_capacity: number | null;
  color: string | null;
  plate: string | null;
  country: string | null;
  idiom: string | null;
  min_payout: number | null;
  is_low_cost: number | null;
  shift: string | null;
  payment_method: string | null;
  rating: number | null;
  rating_count: number | null;
  offers_received: number | null;
  offers_accepted: number | null;
  acceptance_score: number | null;
  tier: "premium" | "normal" | "low" | null;
  languages: string | null;
  is_guide: number | null;
  car_model: string | null;
  car_year: number | null;
  status: DriverStatus | null;
  approved_at: number | null;
  approved_by: string | null;
}

// Nota Fase 3 v5.0: WorkflowRow ya no se usa en código activo. La tabla `workflows`
// se conserva por ahora (DROP planeado para Fase 6).

export interface DriverCodeRow {
  code: string;
  name: string;
  phone: string | null;
  created_by: string | null;
  created_at: number | null;
  registered_at: number | null;
}

export interface ClientPreferredDriverRow {
  client_phone: string;
  preferred_driver_phone: string;
  backup_driver_phone: string | null;
  created_at: number | null;
  updated_at: number | null;
}

export interface PackagePriceRow {
  driver_phone: string;
  package_type: "in_out" | "three_leg";
  min_payout: number;
  created_at: number | null;
}

export interface ReservationSlotRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  max_bookings: number | null;
  active: number | null;
  created_at: number | null;
}

export interface TariffRow {
  id: number;
  origin: string;
  destination: string;
  modality: string | null;
  crosses_border: number | null;
  wait_included: number | null;
  price_4p: number;
  price_6p: number;
  piso_4p: number;
  piso_6p: number;
  piso_4p_low: number | null;
  piso_6p_low: number | null;
  garantizado_4p: number | null;
  garantizado_6p: number | null;
}

export interface DriverDiscountRow {
  id: number;
  driver_phone: string;
  tariff_id: number;
  discount_pct: number;
  valid_until: number | null;
  active: number | null;
  created_at: number | null;
}

export interface DriverDiscountWithDriverRow extends DriverDiscountRow {
  driver_name: string;
}

export interface LeadRow {
  conv_id: number;
  client_phone: string;
  origin: string | null;
  destination: string;
  price: number | null;
  passengers: number | null;
  taken_by: string | null;
  created_at: number | null;
}

export interface SurveyRow {
  id: number;
  trip_id: string;
  sent_at: number | null;
  response: string | null;
}

export interface LocationAliasRow {
  alias: string;
  canonical_name: string;
  location_code: string | null;
  created_at: number;
}

export interface ChatSessionRow {
  phone: string;
  slots: string | null;
  confidence: string | null;
  confirmed_fields: string | null;
  source_message_ids: string | null;
  extraction_count: number;
  last_extracted_at: number | null;
  workflow_state: string | null;
  clarify_field: string | null;
  updated_at: number;
}

export interface ProcessedMessageRow {
  message_id: string;
  phone: string | null;
  message_type: string | null;
  processed_at: number;
  payload_hash: string | null;
}
