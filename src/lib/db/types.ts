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
  discount_explicit: number | null;
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
  cancelled_at: number | null;
  cancelled_by: string | null;
}

// Tipos para event sourcing de Trip (append-only audit log)
export type TripEventType =
  | "TripCreated" | "TripDriverAssigned" | "TripReconfirmed"
  | "TripCompleted" | "TripCancelled";

export interface TripEventRow {
  id: number;
  trip_id: string;
  event_type: TripEventType;
  payload: string | null;
  occurred_at: number;
  actor: string;
}

// Tipos para event sourcing de Dispatch (append-only audit log de asignación)
export type DispatchEventType =
  | "DispatchInitiated" | "DispatchOffered" | "DispatchBroadcasted"
  | "DispatchAccepted" | "DispatchAbandoned" | "DispatchContingency";

export type DispatchEventLevel = "nivel_1" | "nivel_2" | "nivel_3" | "waiting_driver";

export interface DispatchEventRow {
  id: number;
  trip_id: string;
  event_type: DispatchEventType;
  level: DispatchEventLevel | null;
  actor_phone: string | null;
  metadata: string | null;
  occurred_at: number;
}

export type DriverStatus = "pending" | "active" | "inactive" | "blocked";

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
  is_principal2: number | null;
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
  origin: string | null;
  destination: string | null;
  modality: string | null;
  crosses_border: number | null;
  wait_included: number | null;
  public_price_4p: number | null;
  public_price_6p: number | null;
  driver_price_4p: number | null;
  driver_price_6p: number | null;
  // COLUMNAS GEO
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  resolution_priority: number | null;
  active: number | null;
}

export interface TourRow {
  id: number;
  name: string;
  trip_type: "round_trip" | "tour";
  origin_place_id: string | null;
  origin_zone_id: string | null;
  destination_place_id: string | null;
  destination_zone_id: string | null;
  waypoints: string | null;
  wait_hours: number;
  price_4p: number | null;
  price_6p: number | null;
  driver_price_4p: number | null;
  driver_price_6p: number | null;
  crosses_border: number | null;
  active: number | null;
  created_at: number | null;
}

export interface TripGroupRow {
  id: string;
  client_phone: string;
  total_price: number | null;
  passengers: number | null;
  status: "pending" | "quoted" | "confirmed" | "executing" | "completed" | "cancelled";
  created_at: number | null;
  updated_at: number | null;
}

export interface TripLegRow {
  id: number;
  group_id: string;
  seq: number;
  origin: string;
  destination: string;
  scheduled_at: number | null;
  price: number | null;
  status: "pending" | "quoted" | "confirmed" | "assigned" | "completed" | "cancelled";
  trip_id: string | null;
  assigned_driver_phone: string | null;
  created_at: number | null;
}

/** Leg de un viaje multi-ride (antes de persistir) */
export interface TripLegInput {
  origin: string;
  destination: string;
  time?: string;
}

export interface MultiRideBreakdown {
  legs: Array<{
    seq: number;
    origin: string;
    destination: string;
    time: string | null;
    oneWayPrice: number;
    discountedPrice: number;
    saving: number;
    hub: string | null;
  }>;
  totalOneWay: number;
  totalDiscounted: number;
  totalSaving: number;
  hubs: string[];
}

export interface WaitingRateRow {
  id: number;
  zone_id: string | null;
  country: "AR" | "BR" | "PY";
  price_per_hour_4p: number;
  price_per_hour_6p: number;
  active: number | null;
}

export interface ZoneRow {
  zone_id: string;
  zone_name: string;
  country: string;
  area_group: string | null;
  dispatch_priority: number | null;
  base_eta_min: number | null;
  surcharge_description: string | null;
  surcharge_pct: number | null;
  active: number | null;
}

export interface PlaceRow {
  place_id: string;
  canonical_name: string;
  official_name: string | null;
  display_name: string | null;
  google_maps_name: string | null;
  place_type: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  tourist_relevance_score: number | null;
  zone_id: string | null;
  active_status: string;
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
  lang: string | null;
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
  publicPrice4p: number | null;
  publicPrice6p: number | null;
  driverPrice4p: number | null;
  driverPrice6p: number | null;
  price: number;
  piso: number;
  garantizado: number;
  tariffId: number | null;
  level: "place_place" | "place_zone" | "zone_place" | "zone_zone" | "not_found";
  resolutionPriority: number | null;
  originPlaceId: string | null;
  destinationPlaceId: string | null;
  originZoneId: string | null;
  destinationZoneId: string | null;
}
