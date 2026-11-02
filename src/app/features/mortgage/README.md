# Mortgage calculator

The lazy `/mortgage` page is a frontend-only PLN scenario calculator. It reuses
Angular Material, prefixed Tailwind utilities, reactive forms and signals. Financial
logic is pure TypeScript; the service calculates both repayment plans from one input.
No bank offers are fetched, stored, ranked or asserted to be available to the user.

## Inputs and results

- Property/project price minus own contribution is the financed principal.
- Own contribution has linked PLN and percentage inputs. Changing the property price
  preserves whichever contribution input was edited last (PLN amount initially).
  Percentage-driven amounts round to grosze; amount-driven percentages retain up to
  12 significant digits. An empty or nonfinite source clears its linked value.
- Duration: 1–35 whole years in the UI, 12–420 whole months in the engine.
- Equal installments (annuity) and decreasing installments (equal principal).
- Either a constant assumed annual nominal rate, or an initial fixed period followed
  by a second assumed rate for the remainder. These are independent of repayment type.
- Upfront commission as a percentage of principal, other upfront costs, and constant
  additional monthly costs such as insurance. All default to zero and must be entered
  from the user's actual offer. They are paid separately, never added to principal.

The starting scenario is a PLN 600,000 property, PLN 120,000 contribution, 25 years,
and 6.5% nominal interest for both the initial five years and the remaining term.
These are illustrative examples, not advertised bank rates or a forecast.

Cards show first/highest/last monthly outlay, the payment at any rate transition,
interest, fees, total borrowing cost, total loan outlay, initial cash needed and total
project outlay. The schedule separates principal, interest, other costs and balance.
Changing any financial input clears results until the user calculates again.
Expanding panels or selecting another schedule does not invalidate results.

## Arithmetic and definitions

Rates are decimal annual values in the engine, percentages in the form. Monthly
interest is outstanding principal × annual rate / 12. Equal payments use the annuity
formula, with a zero-rate branch and log1p/expm1 for stability near zero. At the rate
transition, the annuity is recalculated using remaining principal and remaining
months. Decreasing installments retain their original principal portion.

Amounts use native numbers; formulas keep intermediate precision. Monthly interest,
payments, principal portions and commission round half up to PLN 0.01. The outstanding
balance and aggregate sums reconcile through integer grosze. The final payment clears
any principal rounding remainder. Money functions are centralized for future changes.

- `totalBorrowingCost`: interest + commission + upfront costs + recurring costs.
- `totalLoanPayments`: loan principal + total borrowing cost; excludes own capital.
- `initialCashNeeded`: own capital + commission + upfront costs; excludes first payment.
- `totalProjectOutlay`: property price + total borrowing cost. Own capital is counted once.
- Monthly headline figures include additional monthly costs; installments in the
  schedule contain only principal and interest.

## Bank research and limitations

Official product pages reviewed on 2026-11-02:

- [PKO Bank Polski](https://www.pkobp.pl/klient-indywidualny/kredyty-pozyczki/kredyt-hipoteczny)
  advertises an initial five-year fixed period, contribution requirements, and terms
  up to 35 years. Its examples separate interest, commission and insurance costs.
- [ING](https://www.ing.pl/indywidualni/kredyty-i-pozyczki/kredyt-hipoteczny)
  distinguishes commission/rate variants and additional products. Its variable-rate
  offers demonstrate why the nominal rate alone is insufficient for comparing costs.
- [PKO's interest-rate risk information](https://www.agencja.pkobp.pl/api/public/233909a0-298d-4ce5-9562-25c72e6f8fc4.pdf)
  describes equal and decreasing repayment structures.

These sources inform the configurable fields, not the numerical defaults. The model
uses a combined nominal rate including margin, without binding users to a particular
reference index. A constant scenario does not assert a whole-term fixed-rate offer.
The second rate is a scenario, not a prediction of WIBOR, POLSTR or future bank terms.

Exact bank day counts and rounding may differ. This is not RRSO, an eligibility or
creditworthiness assessment, or a binding quote. No universal minimum down payment is
enforced; LTV is descriptive. Contributions may be zero for exploration. Inputs support
nonnegative rates through 100% and PLN amounts through 1 billion with two decimal places.

The MVP excludes overpayments, construction tranches, grace periods, subsidies,
changing insurance premiums, and automatic taxes or fees. Optional cost inputs can
include known one-off transaction costs, but the calculator does not infer them.

Future improvements: monthly/lump-sum overpayments with shortening-term vs reducing-
payment strategies and explicit early repayment fees; time-limited insurance;
multiple rate scenarios; CSV schedule export. These require no changes to the backend.
