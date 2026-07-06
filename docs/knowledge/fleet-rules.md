# Fleet Rules — AITOS

> Rules governing driver fleet eligibility.
> Source: `src/lib/services/dispatch/fleet-validation.ts`, `src/lib/services/dispatch/shift-utils.ts`, `src/lib/db/core/connection.ts`.

---

## 1. Driver status

- **FR-1.1**: Drivers must be `active = 1` to receive offers.
- **FR-1.2**: Drivers must be approved (`approved_at` set, `status = 'approved'`).

Source: `src/lib/db/core/connection.ts` (`drivers` table)

## 2. Priority drivers

- **FR-2.1**: `is_principal = 1` drivers are offered trips first.
- **FR-2.2**: `is_principal2 = 1` drivers are offered second.
- **FR-2.3**: All active drivers receive broadcast offers at level 3.

Source: `src/lib/services/dispatch/dispatch.service.ts`

## 3. Capacity

- **FR-3.1**: Vehicle capacity must cover passenger count.
- **FR-3.2**: `car_capacity` is stored per driver.

Source: `src/lib/services/dispatch/fleet-validation.ts`

## 4. Shift

- **FR-4.1**: Driver `shift` can filter offer eligibility.
- **FR-4.2**: Default shift is `"any"`.

Source: `src/lib/services/dispatch/shift-utils.ts`

## 5. Country

- **FR-5.1**: Driver `country` can filter cross-border trip eligibility.
- **FR-5.2**: Default country is `"AR"`.

Source: `src/lib/db/core/connection.ts`, `src/lib/services/dispatch/fleet-validation.ts`

## 6. Acceptance score

- **FR-6.1**: Driver acceptance score is computed from `offers_received` / `offers_accepted`.
- **FR-6.2**: Score influences ranking but not basic eligibility.

Source: `src/lib/db/core/connection.ts` (`drivers` table)

---

*Last updated: 2026-07-06*
