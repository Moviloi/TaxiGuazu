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
  base_price_4p: number;
  base_price_6p: number;
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  active: number | null;
}

export interface ProviderAdjustmentRow {
  id: number;
  provider_id: string;
  tariff_id: number;
  adjustment_type: "percent" | "fixed";
  adjustment_value: number;
  valid_from: number | null;
  valid_until: number | null;
  active: number | null;
  created_at: number | null;
}

export interface PromotionRow {
  id: number;
  source: string;
  name: string;
  description: string | null;
  adjustment_pct: number;
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  min_passengers: number | null;
  max_passengers: number | null;
  valid_from: number | null;
  valid_until: number | null;
  active: number | null;
  max_uses: number | null;
  current_uses: number | null;
  created_at: number | null;
}

export interface PackageRow {
  id: number;
  name: string;
  description: string | null;
  package_type: "round_trip" | "three_leg" | "multi_stop";
  price: number;
  included_services: string | null;
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  valid_from: number | null;
  valid_until: number | null;
  active: number | null;
  created_at: number | null;
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

export interface AliasLookupRow {
  alias: string;
  canonical_name: string;
  place_id: string | null;
  normalized_alias: string;
  location_code: string | null;
  active: number;
  source: string;
  created_at: number;
}

export interface ChatSessionRow {
  phone: string;
  slots: string | null;
  confidence: string | null;
  extraction_count: number;
  last_extracted_at: number | null;
  clarify_field: string | null;
  pending_opportunity: string | null;
  comprehension_state: string | null;
  comprehension_score: number | null;
  escalation_reason: string | null;
  updated_at: number;
  conversational_state: string | null;
  dispatch_state: string | null;
  trip_state: string | null;
  slot_states: string | null;
}

export type OpportunityType = "promotion" | "provider_adjustment" | "package" | "tg_campaign" | "complement";

export interface OpportunityRuleRow {
  id: number;
  opportunity_type: OpportunityType;
  label: string;
  description: string;
  active: number;
  priority: number;
  trigger_type: string;
  tariff_id: number | null;
  config_json: string | null;
  valid_from: number | null;
  valid_until: number | null;
  created_at: number;
}

export interface TariffV2Match {
  matched: boolean;
  price: number;
  piso: number;
  garantizado: number;
  tariffId: number | null;
  level: "place_place" | "place_zone" | "zone_place" | "zone_zone" | "not_found";
  originPlaceId: string | null;
  destinationPlaceId: string | null;
  originZoneId: string | null;
  destinationZoneId: string | null;
}
