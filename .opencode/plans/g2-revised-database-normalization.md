# G.2 — Database Boundary Normalization (Revised)

## Goal
Progressively decompose `src/lib/db/database.ts` (1865L) into domain-specific modules while keeping `database.ts` as a thin re-export facade for zero-disruption to existing callers.

## Finding
G.2.1 analysis showed **zero dead exports** — all 118 exported functions have ≥1 caller. The original plan's "36 dead exports" was incorrect. Instead of deletions, we extract functions into domain repos and re-export from `database.ts`.

## Strategy: Extract + Re-Export
Each step: (a) create domain file under `src/lib/db/domains/`, (b) move function definitions there, (c) add `export { ... } from "./domains/..."` in `database.ts`. All existing imports keep working.

## Migration Plan

### G.2.1 — Extract `core/connection.ts` [5 internal + 1 export]
- Move: `getUrl`, `getDbv`, `ensureSchema`, `initSchema` (internals)
- Move: `getDbInstance` (exported, 25+ callers) + `DbExecutor` type
- `database.ts` re-exports: `export { getDbInstance, DbExecutor } from "./core/connection"`

### G.2.2 — Extract `core/helpers.ts` [3 internals]
- Move: `query`, `queryOne`, `levenshtein`
- No re-exports needed (these are internal)

### G.2.3 — Extract `domains/connection-state.ts` [5 exports]
- Move: `getConnectionValue`, `getConnectionValueFlag`, `setConnectionFlag`, `setConnectionValue`, `deleteConnectionKey`
- Also: `getConnectionState`, `setConnectionState`, `setConnectionStateBatch`

### G.2.4 — Extract `domains/trips.ts` [13 exports]
- Move all trip-related functions: `createTrip`, `getTripById`, `getActiveTripByPhone`, `getTripByAssignedDriver`, `updateTripState`, `updateTripDiscountExplicit`, `assignDriverToTrip`, `completeTrip`, `syncTripPhaseFromLegacyStatus`, `getTripPhase`, `setTripPhase`, `closeTrip`, `getTripByIdWithDiagnostics`
- Also move internals: `checkTripPhaseDivergence`, `checkDivergenceForTrips` (used internally)

### G.2.5 — Extract `domains/drivers.ts` [20+ exports]
- Move: `getMaxFleetCapacity`, `validateFleetCanHandle`, `listPendingDrivers`, `approveDriver`, `setDriverStatus`, `getPrincipalDriver`, `getDriverByPhone`, `getPrincipal2Driver`, `registerDriver`, `createDriverCode`, `updateDriverShiftIfNull`, `deactivateDriverByCode`, `getDriverCodeByCode`, `registerDriverByCode`, `getDriverExpiry`, `incrementOfferReceived`, `incrementOfferAccepted`, `updateDriverTier`, `updateDriverMinPayout`, `updateDriverLanguages`, `updateDriverGuide`, `updateDriverByCode`, `getAvailableDrivers`
- Also move internal: `recalcAcceptanceScore`

### G.2.6 — Extract `domains/invitations.ts` [5 exports]
- Move: `getDriverInvitationByCode`, `listDriverInvitations`, `createDriverInvitation`, `registerDriverFromInvitation`, `revokeDriverInvitation`

### G.2.7 — Extract `domains/conversations.ts` [10 exports]
- Move: `getOrCreateConversation`, `getConversationById`, `getConversationByPhone`, `listConversations`, `updateConversationActivity`, `setConversationMode`, `takeConversation`, `releaseConversation`, `deleteConversation`, `setConversationTrip`, `insertMessage`, `getMessages`, `getRecentHistory`, `clearConversationHistory`

### G.2.8 — Extract `domains/leads.ts` [3 exports]
- Move: `createLead`, `getLeadByConv`, `takeLead`

### G.2.9 — Extract remaining domains
- `domains/survey.ts`: `getTripsPendingSurvey`, `markSurveySent`, `setSurveyResponse`
- `domains/tariffs.ts`: `findTariff`, `searchTariffs`, `resolveAlias`, `getDiscountsForTariff`, `getDriverDiscountForTariff`, `getDriverDiscounts`, `createDriverDiscount`, `deleteDriverDiscount`
- `domains/preferred-drivers.ts`: `getClientPreferredDriver`, `setClientPreferredDriver`, `setBackupDriver`
- `domains/package-prices.ts`: `setPackagePrice`, `getPackagePrice`
- `domains/chat-sessions.ts`: `getChatSession`, `upsertChatSession`, `updateChatSessionWorkflow`, `setChatSessionWorkflowState`, `resetChatSession`
- `domains/customer-names.ts`: `setCustomerName`, `getCustomerName`
- `domains/idempotency.ts`: `tryRegisterMessage`, `isMessageProcessed`, `getProcessedMessage`, `countProcessedMessages`
- `domains/opportunity-log.ts`: `insertOpportunityLog`, `updateOpportunityLogResponse`, `clearPendingOpportunity`
- `domains/reservations.ts`: `createReservationSlot`, `getActiveSlots`, `getSlotsByDayOfWeek`, `deleteReservationSlot`, `getTripsScheduledForDate`, `getUpcomingReservations`, `getTripsByScheduledAtWindow`, `getTripsPendingCloseOut`
- `domains/reader-validation.ts`: `validateReaderConsistency`, `reportTripPhaseNullCount`
- `domains/trip-mutations.ts`: `updateTripTariff`, `updateTripScheduledAt`, `updateTripFlight`, `updateTripPassengers`, `updateTripOrigin`, `updateTripDestination`, `updateTripPriceBase`, `updateTripHotel`, `setComisionDeclarada`, `getActiveTripsByClient`
- `domains/opportunity-rules.ts`: `getActiveComplementRules`

### G.2.10 — Extract `domains/trip-scheduling.ts` [consolidate]
- `getExpiredTrips`, `getTripsByScheduledAtWindow`, `getTripsPendingCloseOut`, `getTripsScheduledForDate`, `getUpcomingReservations`

### G.2.11 — Extract `core/diagnostics.ts` [internals]
- `checkTripPhaseDivergence`, `checkDivergenceForTrips`, `recalcAcceptanceScore`

### G.2.12 — Eliminate `getDbInstance()` leak ✅ COMPLETE
- Migrated all 18 external `getDbInstance()` callers to `getDbv` from `core/connection`:
  - Created `domains/learning.ts` (19 wrappers, ~280L) → updated 12 learning service files
  - Updated `dispatch.service.ts` (connection_cache → getConnectionCache, tariff → getTariffById)
  - Updated `trip-execution.service.ts` (pending_opportunity → setPendingOpportunity)
  - Updated 4 semi-frozen pricing/geo services (location-resolver, commercial-pricing-engine, tariff-resolver, opportunity-engine) — import `getDbv` instead
  - Updated `housekeeping.ts` and `housekeeping/timeouts.ts`
  - Updated `conversation-workflow.ts`
- Removed `export { getDbInstance, type DbExecutor }` from database.ts re-export facade
- Zero imports of `getDbInstance` from `database.ts` outside of db modules
- Note: `getDbv()` from `core/connection` is the canonical replacement (identical runtime behavior)

### G.2.13 — Extract `db/types.ts`
- Move all type imports from `database.ts` to proper usage sites via `types.ts`

## Validation (last run)
- `npm test` — 195/195 passed ✅
- `npx tsc --noEmit` — 3 pre-existing src errors only (getPackagePrices, detectPredictionDrift, decision-log string|null)
- 0 new production errors from G.2

## Risk
- Dynamic SQL in `updateDriverByCode`, `getAvailableDrivers` (column building), `getPackagePrices` (IN clause) — must be extracted verbatim, flagged for G.3
