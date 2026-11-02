# Polish retail Treasury bond comparison

The lazy `/bonds` route imports `data/retail-bonds.json` at build time. There are no
HTTP calls, backend changes, new packages, or external financial dependencies.
The supplied public JSON is retained as the original input; the feature imports
only its feature-local configuration. Update that configuration when verifying a
new offer. `asOf` means the financial data verification date; editing code must not
advance it. `offerMonth` identifies the offer being compared.

## Calculation model

All rates are annual decimals. Fixed bonds use the configured fixed rate;
inflation and NBP strategies use the first-period rate followed by the user's
constant scenario plus the configured margin. All eight definitions are validated
before use. A service coordinates eligibility, projections, and descending net
profit ranking. Pure functions own money, rate, tax, redemption, and calendar logic.

Only bonds maturing at or after the selected horizon qualify. Whole bonds are
purchased at standard purchase prices; conditional exchange prices do not apply.
Unspent allocation remains cash. Principal is never rolled into future issues.
Monthly coupons and annual coupons are held as cash earning 0%; there is no coupon
reinvestment setting. Capitalization follows the configured schedule automatically.

Interest is accrued at annual rate / 12 for each held month, on the current
principal, preserving intermediate number precision. Per-bond interest is rounded
half up to a grosz on capitalization or payout. Tax is estimated per bond at each
payout and final redemption, rounding positive tax upward to a grosz. Capitalized
interest is taxed only on redemption. The final coupon is part of final settlement,
so interest, tax, cash, and principal are not counted twice.

`grossProfit` includes paid and unpaid interest before fee and tax. `investedAmount`
is purchase cost; `unusedCash` is the rest of the original allocation. `finalValue`
is net redemption plus net paid coupons plus unused cash. `netProfit` is final value
minus the entire initial allocation. Returns and annualized portfolio CAGR use that
entire allocation and the same horizon; CAGR is not an internal rate of return.

## Explicit limitations

The supplied data does **not** include emission-letter day counts, inflation lag,
negative inflation rules, notice periods, settlement restrictions, exact fee caps,
or authoritative rounding/tax aggregation rules. No missing contract terms are
represented as verified facts. This MVP produces labeled scenario estimates using:

- Equal-month accrual, without purchase-date/day-count settlement simulation.
- Early redemption fees in PLN per bond capped at unpaid interest (including
  capitalized interest); OTS forfeits its unpaid interest. Previously paid coupons
  are retained. These fee limits must be verified against each emission letter.
- Per-bond tax rounded upward as described above, after the estimated redemption
  fee. Exact settlement may differ from this approach.
- Nonnegative scenario inputs from 0% to 100%, amounts up to PLN 1 billion with
  at most two decimal places, and whole-month engine horizons from 1 to 144.
- Family 800+ eligibility is user-declared; individual purchase entitlements are
  not validated.

These assumptions appear in the UI and early-redemption cards. For exact settlement,
first supply and validate the missing terms in JSON, then implement those rules
without embedding emission-specific rates or fees in calculation code. Dedicated
money utilities provide a boundary for a future decimal arithmetic implementation.

Data freshness compares local calendar dates, clamps three-month anniversaries at
month ends, and warns after that anniversary, on previous-year data, invalid or
missing dates, or future verification dates. Exactly three calendar months is fresh
unless the calendar-year rule applies.

## Verification

The existing Angular unit-test target uses Vitest and jsdom. Calculation tests cover
all eight types, independent cash-flow references, fee/tax timing, monthly/annual
payouts, capitalization, unused cash, eligibility and rounding boundaries. UI tests
cover defaults, validation, manual calculation, accordion state, cards, empty states,
freshness warnings, and invalidation for every calculation input.

Run `npm test -- --watch=false` and `npm run build`. This workspace has no lint target
or lint script. Suggested next steps are emission-letter-backed date calculations,
explicit tax aggregation terms, and entitlement-aware Family bond purchase limits.
