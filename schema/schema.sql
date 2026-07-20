-- ═══════════════════════════════════════════════════════════════════════════
-- schema.sql — Fuente única de verdad del esquema TaxiGuazú
-- ADR-007: Este archivo es la única autoridad del DDL.
-- Generado desde initSchema() en connection.ts (2026-07-14).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── CORE ──

CREATE TABLE IF NOT EXISTS connection_state (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Cache para consultas rápidas de connection_state (P0-03)
CREATE TABLE IF NOT EXISTS connection_cache (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  taken_by_human INTEGER DEFAULT 0,
  human_operator_phone TEXT,
  trip_id TEXT,
  last_message_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS processed_messages (
  message_id TEXT PRIMARY KEY,
  phone TEXT,
  message_type TEXT,
  processed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  payload_hash TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  conv_id INTEGER PRIMARY KEY,
  client_phone TEXT NOT NULL,
  origin TEXT,
  destination TEXT NOT NULL,
  price REAL,
  passengers INTEGER,
  taken_by TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- ── TRIP ──

CREATE TABLE IF NOT EXISTS trips (
  trip_id TEXT PRIMARY KEY,
  client_phone TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  status TEXT DEFAULT 'consulta',
  price_base REAL,
  discount_explicit INTEGER DEFAULT 0,
  assigned_driver_phone TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  confirmed_at INTEGER,
  contact_shared_at INTEGER,
  passengers INTEGER,
  commission_amount REAL,
  driver_payout REAL,
  survey_sent INTEGER DEFAULT 0,
  post_trip_response TEXT,
  scheduled_at INTEGER,
  tariff_id INTEGER,
  piso_base REAL,
  garantizado_base REAL,
  flight_number TEXT,
  hotel_destination TEXT DEFAULT 'A confirmar por el chofer',
  comision_declarada INTEGER DEFAULT 0,
  trip_phase TEXT,
  closure_reason TEXT,
  cancelled_at INTEGER,
  cancelled_by TEXT
);

CREATE TABLE IF NOT EXISTS trip_groups (
  id TEXT PRIMARY KEY,
  client_phone TEXT NOT NULL,
  total_price REAL,
  passengers INTEGER,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','quoted','confirmed','executing','completed','cancelled')),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS trip_legs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES trip_groups(id),
  seq INTEGER NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  scheduled_at INTEGER,
  price REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','quoted','confirmed','assigned','completed','cancelled')),
  trip_id TEXT,
  assigned_driver_phone TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- trip_events — event sourcing para ciclo de vida de Trip.
-- Append-only: cada evento registra una transición de estado inmutable.
CREATE TABLE IF NOT EXISTS trip_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL REFERENCES trips(trip_id),
  event_type TEXT NOT NULL CHECK(event_type IN (
    'TripCreated','TripDriverAssigned','TripReconfirmed',
    'TripCompleted','TripCancelled'
  )),
  payload TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch()),
  actor TEXT NOT NULL DEFAULT 'system'
);

-- dispatch_events — audit log del proceso de asignación de chofer.
-- Append-only: cada evento registra un intento o resultado del dispatch.
CREATE TABLE IF NOT EXISTS dispatch_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL REFERENCES trips(trip_id),
  event_type TEXT NOT NULL CHECK(event_type IN (
    'DispatchInitiated','DispatchOffered','DispatchBroadcasted',
    'DispatchAccepted','DispatchAbandoned','DispatchContingency'
  )),
  level TEXT CHECK(level IN ('nivel_1','nivel_2','nivel_3','waiting_driver')),
  actor_phone TEXT,
  metadata TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ── DRIVERS ──

CREATE TABLE IF NOT EXISTS drivers (
  driver_id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE NOT NULL,
  is_principal INTEGER DEFAULT 0,
  group_id TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  car_type TEXT,
  car_capacity INTEGER,
  color TEXT,
  plate TEXT,
  country TEXT DEFAULT 'AR',
  idiom TEXT,
  min_payout REAL,
  is_low_cost INTEGER DEFAULT 0,
  shift TEXT DEFAULT 'any',
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  offers_received INTEGER DEFAULT 0,
  offers_accepted INTEGER DEFAULT 0,
  acceptance_score REAL DEFAULT 0,
  tier TEXT DEFAULT 'normal',
  languages TEXT,
  is_guide INTEGER DEFAULT 0,
  car_model TEXT,
  car_year INTEGER,
  is_principal2 INTEGER DEFAULT 0,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  approved_at INTEGER,
  approved_by TEXT
);

CREATE TABLE IF NOT EXISTS driver_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  created_by TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  registered_at INTEGER
);

CREATE TABLE IF NOT EXISTS driver_discounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_phone TEXT NOT NULL,
  tariff_id INTEGER NOT NULL,
  discount_pct INTEGER NOT NULL CHECK(discount_pct > 0 AND discount_pct <= 100),
  valid_until INTEGER,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS driver_invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER,
  used_at INTEGER,
  driver_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired','revoked'))
);

CREATE TABLE IF NOT EXISTS client_preferred_drivers (
  client_phone TEXT PRIMARY KEY,
  preferred_driver_phone TEXT NOT NULL,
  backup_driver_phone TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- ── SESSION ──

CREATE TABLE IF NOT EXISTS chat_sessions (
  phone TEXT PRIMARY KEY,
  slots TEXT,
  confidence TEXT,
  extraction_count INTEGER DEFAULT 0,
  last_extracted_at INTEGER,
  clarify_field TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  pending_opportunity TEXT,
  comprehension_state TEXT,
  comprehension_score REAL,
  escalation_reason TEXT,
  conversational_state TEXT DEFAULT 'idle',
  dispatch_state TEXT DEFAULT 'idle',
  trip_state TEXT DEFAULT NULL,
  slot_states TEXT DEFAULT NULL,
  lang TEXT
);

-- ── LEARNING / ANALYTICS ──

CREATE TABLE IF NOT EXISTS conversion_outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  entity TEXT,
  intent TEXT,
  success_score REAL,
  opportunity_type TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS decision_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  selected_opportunity TEXT,
  candidate_opportunities TEXT NOT NULL DEFAULT '[]',
  utility_score REAL DEFAULT 0,
  load_adjusted INTEGER DEFAULT 0,
  policy_override INTEGER DEFAULT 0,
  guardrails TEXT DEFAULT '[]',
  policies TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS f9_admin_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_text TEXT NOT NULL,
  parsed_action TEXT,
  author TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS f9_drift_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric TEXT NOT NULL,
  entity TEXT NOT NULL,
  drift_value REAL NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'low',
  session_id TEXT,
  policy_id TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS f9_error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  component TEXT NOT NULL,
  error TEXT NOT NULL,
  stack TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS f9_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  type TEXT NOT NULL,
  entity TEXT,
  intent TEXT,
  predicted_value REAL,
  actual_value REAL,
  revenue REAL,
  timestamp INTEGER DEFAULT (unixepoch()),
  source TEXT NOT NULL DEFAULT 'HUMAN'
);

CREATE TABLE IF NOT EXISTS housekeeping_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,
  rows_deleted INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  ran_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS learning_weights (
  key TEXT PRIMARY KEY,
  value REAL NOT NULL DEFAULT 0,
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS opportunity_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  trigger_type TEXT NOT NULL DEFAULT 'post_confirmation',
  tariff_id INTEGER,
  config_json TEXT,
  valid_from INTEGER,
  valid_until INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS opportunity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  client_phone TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  rule_id INTEGER,
  opportunity_type TEXT NOT NULL,
  label TEXT NOT NULL,
  original_price REAL NOT NULL,
  offered_price REAL NOT NULL,
  presented_at INTEGER NOT NULL DEFAULT (unixepoch()),
  client_response TEXT,
  phase TEXT NOT NULL DEFAULT 'post_confirmation',
  responded_at INTEGER
);

CREATE TABLE IF NOT EXISTS conversation_f4_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  score REAL,
  state TEXT,
  timestamp INTEGER DEFAULT (unixepoch()),
  reason TEXT
);

CREATE TABLE IF NOT EXISTS conversation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  metadata TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

-- ── POLICY / EXPERIMENTS ──

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  condition TEXT NOT NULL DEFAULT '[]',
  action TEXT NOT NULL DEFAULT 'allow',
  params TEXT DEFAULT '{}',
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS policy_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  policy_id TEXT NOT NULL,
  variant TEXT,
  revenue REAL DEFAULT 0,
  conversion INTEGER DEFAULT 0,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS simulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  opportunity_id TEXT,
  predicted_conversion REAL DEFAULT 0,
  predicted_revenue REAL DEFAULT 0,
  risk TEXT DEFAULT 'low',
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS system_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  revenue_total REAL DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  load_factor REAL DEFAULT 0,
  escalation_rate REAL DEFAULT 0,
  recorded_at INTEGER DEFAULT (unixepoch())
);

-- ── COMMERCIAL ──

CREATE TABLE IF NOT EXISTS tariffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  modality TEXT,
  crosses_border INTEGER DEFAULT 0,
  wait_included INTEGER DEFAULT 0,
  origin_place_id TEXT,
  destination_place_id TEXT,
  origin_zone_id TEXT,
  destination_zone_id TEXT,
  active INTEGER DEFAULT 1,
  public_price_4p REAL,
  public_price_6p REAL,
  driver_price_4p REAL,
  driver_price_6p REAL,
  resolution_priority INTEGER DEFAULT 4
);

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  package_type TEXT NOT NULL CHECK(package_type IN ('round_trip','three_leg','multi_stop')),
  price REAL NOT NULL,
  included_services TEXT,
  origin_place_id TEXT,
  destination_place_id TEXT,
  origin_zone_id TEXT,
  destination_zone_id TEXT,
  valid_from INTEGER,
  valid_until INTEGER,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS package_prices (
  driver_phone TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK(package_type IN ('in_out','three_leg')),
  min_payout REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (driver_phone, package_type)
);

CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  adjustment_pct REAL NOT NULL,
  origin_place_id TEXT,
  destination_place_id TEXT,
  origin_zone_id TEXT,
  destination_zone_id TEXT,
  min_passengers INTEGER,
  max_passengers INTEGER,
  valid_from INTEGER,
  valid_until INTEGER,
  active INTEGER DEFAULT 1,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS provider_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT NOT NULL,
  tariff_id INTEGER NOT NULL,
  adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('percent','fixed')),
  adjustment_value REAL NOT NULL,
  valid_from INTEGER,
  valid_until INTEGER,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

-- ── GEO ──

CREATE TABLE IF NOT EXISTS zones (
  zone_id TEXT PRIMARY KEY,
  zone_name TEXT NOT NULL,
  country TEXT NOT NULL,
  area_group TEXT,
  dispatch_priority INTEGER DEFAULT 5,
  base_eta_min INTEGER DEFAULT 10,
  active INTEGER DEFAULT 1,
  surcharge_description TEXT,
  surcharge_pct REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS places (
  place_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  official_name TEXT NOT NULL DEFAULT '',
  google_maps_name TEXT NOT NULL DEFAULT '',
  place_type TEXT NOT NULL DEFAULT 'other' CHECK(place_type IN ('airport','bus_terminal','border_crossing','border','attraction','shopping','hotel','resort','hostel','restaurant','casino','event_center','tourist_area','port','other','area','landmark','airbnb','bar','lodge','house')),
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  tourist_relevance_score INTEGER NOT NULL DEFAULT 5,
  operational_zone TEXT,
  active_status TEXT NOT NULL DEFAULT 'active' CHECK(active_status IN ('active','inactive')),
  display_name TEXT DEFAULT '',
  zone_id TEXT REFERENCES zones(zone_id),
  barrio TEXT DEFAULT '',
  corredor_vial TEXT DEFAULT '',
  estrellas INTEGER DEFAULT 0,
  direccion TEXT DEFAULT '',
  zona_turistica TEXT DEFAULT '',
  avenida_principal TEXT DEFAULT '',
  acceso_principal TEXT DEFAULT '',
  referencias TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('es','en','pt'))
);

CREATE TABLE IF NOT EXISTS transfer_priority (
  place_id TEXT PRIMARY KEY,
  priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 4)
);

-- ── OPERATIONS ──

CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  trip_type TEXT NOT NULL CHECK(trip_type IN ('round_trip','tour')),
  origin_place_id TEXT,
  origin_zone_id TEXT,
  destination_place_id TEXT,
  destination_zone_id TEXT,
  waypoints TEXT,
  wait_hours INTEGER NOT NULL DEFAULT 0,
  price_4p REAL,
  price_6p REAL,
  driver_price_4p REAL,
  driver_price_6p REAL,
  crosses_border INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS waiting_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id TEXT REFERENCES zones(zone_id),
  country TEXT NOT NULL CHECK(country IN ('AR','BR','PY')),
  price_per_hour_4p REAL NOT NULL,
  price_per_hour_6p REAL NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reservation_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  label TEXT,
  max_bookings INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

-- ── COGNITIVE MEMORY (IM-1) ──

CREATE TABLE IF NOT EXISTS cognitive_memory_snapshots (
  conversation_id TEXT NOT NULL,
  memory_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  stored_at INTEGER NOT NULL,
  belief_id TEXT NOT NULL,
  belief_observation_valid INTEGER NOT NULL,
  belief_channel TEXT,
  belief_has_content INTEGER NOT NULL,
  belief_received_at TEXT,
  belief_conversation_id TEXT,
  belief_is_well_formed INTEGER NOT NULL,
  belief_fact_count INTEGER NOT NULL,
  decision_id TEXT NOT NULL,
  decision_valid_input INTEGER NOT NULL,
  decision_has_content INTEGER NOT NULL,
  decision_readiness TEXT NOT NULL CHECK(decision_readiness IN ('ready','partial','invalid')),
  decision_missing_info TEXT NOT NULL DEFAULT '[]',
  decision_is_decided INTEGER NOT NULL,
  decision_fact_count INTEGER NOT NULL,
  PRIMARY KEY (conversation_id, turn_number)
);

-- ── SEED DATA ──

INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected');

-- ═══════════════════════════════════════════════════════════════════════════
-- INDICES
-- ═══════════════════════════════════════════════════════════════════════════

-- Core
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trip_legs_group ON trip_legs(group_id, seq);
CREATE INDEX IF NOT EXISTS idx_trip_events_trip ON trip_events(trip_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_events_trip ON dispatch_events(trip_id, occurred_at);

-- Drivers
CREATE INDEX IF NOT EXISTS idx_driver_invitations_status ON driver_invitations(status, created_at);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_decision_log_session ON decision_log(session_id);
CREATE INDEX IF NOT EXISTS idx_f9_drift_log_session ON f9_drift_log(session_id);
CREATE INDEX IF NOT EXISTS idx_f9_drift_log_timestamp ON f9_drift_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_f9_error_log_created ON f9_error_log(created_at);
CREATE INDEX IF NOT EXISTS idx_f9_events_session ON f9_events(session_id);
CREATE INDEX IF NOT EXISTS idx_f9_events_timestamp ON f9_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_policy_results_policy ON policy_results(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_results_timestamp ON policy_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_simulations_session ON simulations(session_id);
CREATE INDEX IF NOT EXISTS idx_simulations_timestamp ON simulations(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(recorded_at);

-- Geo
CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_aliases_place ON aliases(place_id);
CREATE INDEX IF NOT EXISTS idx_places_zone_id ON places(zone_id);
CREATE INDEX IF NOT EXISTS idx_places_place_type ON places(place_type);

-- Comercial
CREATE UNIQUE INDEX IF NOT EXISTS idx_tariffs_route ON tariffs(LOWER(origin), LOWER(destination));
CREATE INDEX IF NOT EXISTS idx_tariffs_resolution ON tariffs(origin_place_id, destination_place_id, origin_zone_id, destination_zone_id, resolution_priority);
CREATE INDEX IF NOT EXISTS idx_tariffs_active_resolution ON tariffs(active, resolution_priority);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS (CHECK constraints via triggers — SQLite no soporta ALTER TABLE ADD CHECK)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TRIGGER IF NOT EXISTS trg_tariffs_resolution_priority_insert
BEFORE INSERT ON tariffs
WHEN NEW.resolution_priority IS NOT NULL AND (NEW.resolution_priority < 1 OR NEW.resolution_priority > 4)
BEGIN
  SELECT RAISE(ABORT, 'resolution_priority must be between 1 and 4');
END;

CREATE TRIGGER IF NOT EXISTS trg_tariffs_resolution_priority_update
BEFORE UPDATE OF resolution_priority ON tariffs
WHEN NEW.resolution_priority IS NOT NULL AND (NEW.resolution_priority < 1 OR NEW.resolution_priority > 4)
BEGIN
  SELECT RAISE(ABORT, 'resolution_priority must be between 1 and 4');
END;

CREATE TRIGGER IF NOT EXISTS trg_tariffs_crosses_border_insert
BEFORE INSERT ON tariffs
WHEN NEW.crosses_border IS NOT NULL AND (NEW.crosses_border NOT IN (0,1))
BEGIN
  SELECT RAISE(ABORT, 'crosses_border must be 0 or 1');
END;

CREATE TRIGGER IF NOT EXISTS trg_tariffs_crosses_border_update
BEFORE UPDATE OF crosses_border ON tariffs
WHEN NEW.crosses_border IS NOT NULL AND (NEW.crosses_border NOT IN (0,1))
BEGIN
  SELECT RAISE(ABORT, 'crosses_border must be 0 or 1');
END;
