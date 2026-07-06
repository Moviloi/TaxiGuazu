# Pricing Rules — AITOS

> Rules governing price calculation.
> Source: `src/lib/services/pricing/tariff-resolver.ts`, `src/lib/services/pricing/pricing-engine.ts`, `src/lib/services/pricing/commercial-pricing-engine.ts`.

---

## 1. Tariff resolution priority

Prices are resolved in order of specificity:

1. **Priority 1**: place_id → place_id
2. **Priority 2**: place_id → zone_id
3. **Priority 3**: zone_id → place_id
4. **Priority 4**: zone_id → zone_id

Source: `src/lib/services/pricing/tariff-resolver.ts`

## 2. Passenger pricing

- **PR-2.1**: `public_price_4p` applies for 1-4 passengers.
- **PR-2.2**: `public_price_6p` applies for 5-6 passengers.
- **PR-2.3**: Same structure applies to `driver_price_4p` and `driver_price_6p`.

Source: `src/lib/db/core/connection.ts` (`tariffs` table)

## 3. Commercial adjustments

- **PR-3.1**: Promotions can apply percentage adjustments.
- **PR-3.2**: Provider adjustments can be percentage or fixed amount.
- **PR-3.3**: Adjustments have validity windows.

Source: `src/lib/services/pricing/commercial-pricing-engine.ts`, `src/lib/db/core/connection.ts`

## 4. Multi-ride packages

- **PR-4.1**: Multi-ride trips receive hub discounts.
- **PR-4.2**: A hub is a place that is destination of one leg and origin of the next.
- **PR-4.3**: Total price is consolidated across legs.

Source: `src/lib/services/pricing/hub-discount.ts`

## 5. Margin rules

- **PR-5.1**: Driver payout is at least the guaranteed minimum (85% of public price).
- **PR-5.2**: `MIN_MARGIN` defines the operational floor.

Source: `src/config/constants.ts`, `src/lib/db/domains/trips.ts`

## 6. Missing tariff

- **PR-6.1**: If no tariff matches, `final_price` is 0.
- **PR-6.2**: Trip can still proceed to human review without a price.

Source: `src/lib/services/pricing/resolve-pricing-for-slots.ts`

---

*Last updated: 2026-07-06*
