# MyFinMan — Income-Producing Asset Performance Calculations

Status: **Draft reporting formulas / Approved semantic separation from SCN-002**

This file extends `calculation-rules.md` for Assets that generate operating income such as rental vehicles, rental property and agricultural land.

The exact accounting/tax treatment can differ by jurisdiction and user mode. These calculations are management-performance views unless explicitly promoted to an approved accounting policy.

## CALC-025 — Portfolio Remaining Cash

```text
Portfolio Remaining Cash
= Σ current Cash quantities/value allocated to Portfolio
```

This is a liquidity measure only.

It is **not** Portfolio Total Value.

Example:

```text
Starting Portfolio Cash = 500,000
Vehicle acquired for 150,000
Remaining Cash = 350,000
```

If the Vehicle remains in the Portfolio, the Portfolio still contains the Vehicle value/cost in addition to the 350,000 Cash.

---

## CALC-026 — Portfolio Capital at Cost

Proposed management measure:

```text
Portfolio Capital at Cost
= Σ remaining cost basis of Assets economically allocated to Portfolio
```

For a pure capital transformation with no consumption/loss:

```text
500,000 Cash at cost
→ 350,000 Cash + 150,000 Vehicle cost basis
= 500,000 Portfolio capital at cost
```

Cash and acquired Asset must not be double-counted.

---

## CALC-027 — Portfolio Current Market Value

```text
Portfolio Current Value
= Σ current value of Assets economically allocated to Portfolio
```

Example if Vehicle cost is 160,000 but current value is 150,000 and remaining Portfolio Cash is 340,000:

```text
Portfolio Current Value
= 340,000 + 150,000
= 490,000
```

The difference from Portfolio Capital at Cost is a capital/performance dimension, not automatically operating loss.

---

## CALC-028 — Gross Operating Revenue by Asset/Activity

```text
Gross Operating Revenue(asset/activity, period)
= Σ qualifying posted operating Income attributed to asset/activity in period
```

Examples:

- vehicle rent;
- apartment rent;
- agricultural season sales/proceeds.

Valuation changes and asset sale proceeds must not be included in this operating revenue measure.

---

## CALC-029 — Cash Operating Expenses by Asset/Activity

```text
Cash Operating Expenses(asset/activity, period)
= Σ qualifying posted cash Expenses attributed to asset/activity in period
```

Examples may include maintenance, insurance, cleaning, commissions, irrigation, labour or management costs according to Activity type.

Capital acquisition payments are excluded from this operating expense measure.

---

## CALC-030 — Net Operating Cash Flow

```text
Net Operating Cash Flow
= Gross Operating Revenue
- Cash Operating Expenses
```

This is a management cash measure.

It does not include:

- purchase price of the Asset as ordinary operating expense;
- unrealized market-value change;
- realized disposal gain/loss;
- non-cash depreciation unless the user is viewing accounting/economic profit instead of cash flow.

---

## CALC-031 — Operating Profit (Accounting/Economic View)

When depreciation/impairment accounting is enabled:

```text
Operating Profit
= Operating Revenue
- attributable Operating Expenses
- Depreciation / Impairment
```

Exact depreciation method, useful life, residual value and impairment policy remain `TBD` and may differ between personal-management and micro-business/accounting modes.

This calculation must be labeled differently from Net Operating Cash Flow.

---

## CALC-032 — Asset Unrealized Capital Result

Baseline management view where cost basis is known:

```text
Unrealized Capital Result
= Current Market Value
- Remaining Cost Basis benchmark
```

This is analytically separate from Operating Profit/Revenue.

Example:

```text
Vehicle Cost Basis = 160,000
Current Market Value = 150,000
Unrealized Capital Result = -10,000
```

A -10,000 market-value result does not mean the rental operation lost 10,000.

---

## CALC-033 — Asset Realized Disposal Result

On qualifying sale/disposal only:

```text
Realized Disposal P/L
= Net Disposal Consideration
- Disposed Cost Basis
```

Use the approved owner-specific cost-basis policy and fee rules from the core calculation specification.

Rental income collected before disposal is not part of this capital disposal calculation.

---

## CALC-034 — Simple Lifecycle Economic Result

Proposed non-annualized management measure:

```text
Lifecycle Economic Result
= cumulative Operating Revenue
- cumulative attributable Operating Expenses
+ Net Disposal Proceeds (if disposed)
+ Current Market Value (if still owned)
- Acquisition/Capital Cost
```

Care is required to avoid double-counting current value and disposal proceeds.

This is a simple economic bridge only. It is **not** yet the approved rate-of-return formula.

Annualized, money-weighted (XIRR) and time-weighted performance remain under BMK-005/TBD.

---

## CALC-035 — Gross and Net Income Yield

Candidate benchmark metrics for an income-producing Asset:

```text
Gross Income Yield
= Annualized Gross Operating Revenue / selected capital denominator
```

```text
Net Income Yield
= Annualized Net Operating Cash Flow / selected capital denominator
```

Possible denominator choices include original cost, current value or average invested capital.

**No denominator is approved yet.** The UI must not present a generic `Yield %` until the denominator and period are explicit.

---

# Required labeling rule

Any performance screen must label at least:

- period;
- cash versus accrual/economic basis;
- cost versus current-value denominator where a percentage is shown;
- whether depreciation is included;
- whether financing/tax is included;
- valuation timestamp/source;
- whether the asset is still held or disposed.

The product must prefer a few explainable measures over one impressive but ambiguous ROI number.
