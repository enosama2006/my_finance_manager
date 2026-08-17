# MyFinMan — Financial Calculation Rules

Status: **Approved core formulas / some reporting policy Draft**

All calculations below are domain calculations. UI must display their outputs; it must not reimplement competing formulas.

## CALC-001 — Holding Current Value

```text
Holding Current Value (base currency)
= Native Quantity × Current Unit Valuation in Base Currency
```

Current valuation must have method/source/time metadata where non-nominal.

Valuation affects wealth/unrealized performance only. It does not create cash flow or realized P/L.

---

## CALC-002 — Owner Quantity in Holding

```text
Owner Native Quantity
= sum(active OwnershipShare.native_quantity)
  for Holding + Owner
```

Invariant: sum across owners = Holding native quantity.

---

## CALC-003 — Owner Holding Value

```text
Owner Holding Value
= Owner Native Quantity × Holding Current Unit Valuation
```

Never allocate total Holding value equally unless ownership shares say so.

---

## CALC-004 — Account Current Value

```text
Account Current Value
= sum(Current Value of active Holdings in Account)
```

For mixed assets this is a reporting-currency value; native quantities remain separately visible.

Credit-card liability is not included as an asset Holding solely to make this number negative.

---

## CALC-005 — Portfolio Direct Value

```text
Portfolio Direct Value
= Σ(PortfolioSlice Native Quantity × Holding Current Unit Valuation)
```

Only direct slices of that Portfolio.

---

## CALC-006 — Portfolio Rollup Value

```text
Portfolio Rollup
= Direct Value(portfolio)
+ Σ Rollup(child portfolios)
```

Parent must not store duplicate copies of child slices merely to produce totals.

---

## CALC-007 — Allocated Quantity for Owner + Holding

```text
Allocated Native Quantity
= Σ PortfolioSlice.native_quantity
  for selected Owner + Holding
```

---

## CALC-008 — Truly Available Quantity

```text
Available Native Quantity
= Owner Holding Native Quantity
- Allocated Native Quantity
```

Then:

```text
Available Current Value
= Available Native Quantity × Current Unit Valuation
```

Important: Available is **not** bank balance and is **not** Net Worth minus Portfolio target amounts.

---

## CALC-009 — Total Portfolio-Covered Value by Owner

```text
Covered Value(owner)
= Σ(slice.native_quantity × holding.current_unit_value)
  for all PortfolioSlices belonging to owner
```

---

## CALC-010 — Reporting/Base Currency Conversion

Current prototype base/reporting examples use SAR.

Target policy:

```text
Base Value = Native Quantity × Applicable Unit Price in Base Currency
```

Valuation selection priority and FX source freshness remain a `Draft` policy and must be explicitly specified before production.

Must retain native quantity regardless of base-currency conversion.

---

## CALC-011 — Net Worth by Owner

```text
Gross Asset Value(owner)
= Σ Owner Holding Values
+ qualifying Claim Current Values

External Liabilities(owner)
= Σ open Liability Current Values

Net Worth(owner)
= Gross Asset Value(owner) - External Liabilities(owner)
```

Careful: a Claim must not duplicate the same economic asset already counted as a third-party-custody Holding.

---

## CALC-012 — Weighted Average Cost per Owner + Holding

Current approved product-performance method:

```text
Weighted Average Unit Cost
= Σ(lot quantity × lot unit cost)
  / Σ(lot quantity)
```

Scope: only CostBasisLots for the selected Owner + Holding.

If any required quantity has unknown cost under the chosen policy, cost-dependent performance must become unknown/partial according to explicit reporting policy; do not assume zero cost.

---

## CALC-013 — Disposed Cost Basis

For a qualifying sale/conversion under weighted average:

```text
Disposed Cost Basis
= Disposed Native Quantity × Owner Weighted Average Unit Cost
```

The remaining lot coverage must be reduced consistently with weighted-average semantics so that partial disposal does not silently become FIFO.

---

## CALC-014 — Conversion Gross Consideration / Proceeds

For source Asset A → target Asset B:

```text
Gross Economic Consideration in Base Currency
= Target Native Quantity × Target Unit Value at Execution
```

If execution provides a directly authoritative total consideration, target implementation may store/use that total with rate as derived metadata. Exact precedence is `Draft` and should be locked in the use-case contract.

---

## CALC-015 — Realized Gain/Loss

```text
Realized P/L
= Gross Economic Consideration
- Approved Transaction Fees attributable to disposal
- Disposed Cost Basis
```

Applies only to qualifying true conversion/disposal/sale.

Does **not** apply to:
- market valuation changes;
- Real Transfer of same asset;
- custody/location changes;
- Portfolio reallocation;
- account rename/archive;
- expected income;
- reconciliation observation by itself.

If cost basis is unknown, Realized P/L is unknown/not-calculable under this rule rather than fabricated.

---

## CALC-016 — New Target Cost Basis after Conversion/Purchase

Baseline product-performance rule:

```text
Target Total Cost Basis
= Economic Consideration assigned to target
+ approved acquisition fees

Target Unit Cost
= Target Total Cost Basis / Target Native Quantity
```

Fee allocation between disposed and acquired sides must not be double-counted. Exact production fee-allocation policy should be covered by tests and an ADR if necessary.

---

## CALC-017 — Unrealized Gain/Loss

Where owner cost is known:

```text
Unrealized P/L(owner, holding)
= Owner Current Holding Value
- Owner Remaining Cost Basis
```

Unknown-cost portions must be labeled/excluded according to reporting policy.

Unrealized P/L is presentation/analysis; it does not create a transaction.

---

## CALC-018 — Total Realized P/L by Owner/Period

```text
Realized P/L(owner, period)
= Σ realized P/L of qualifying posted sale/conversion transactions
```

Corrections use the current corrected logical transaction projection, not old and corrected versions as two separate economic events.

---

## CALC-019 — Reconciliation Difference

For the same exact account/asset/native context:

```text
Difference = Observed - Calculated
```

A difference is diagnostic. It is not automatically income or expense.

---

## CALC-020 — Portfolio Coverage Ratio

When target > 0:

```text
Coverage %
= min(100? display policy, Current Rollup / Target × 100)
```

Product may display >100% as overfunded instead of capping; exact UI policy is `TBD`. Domain should keep the uncapped ratio available.

---

## CALC-021 — Portfolio Funding Gap

```text
Funding Gap
= max(0, Target/Required Coverage - Current Eligible Coverage)
```

For transaction settlement, eligibility may require matching native asset/type. The full settlement solver remains `TBD`.

---

## CALC-022 — Expected Income Status

Given due date/expected occurrence and matching posted receipt:

- `received` when matched per matching rules;
- `expected` before due boundary and unmatched;
- `late` after due boundary but still valid/expected;
- `missed` when business rule declares occurrence no longer expected.

Exact grace periods/recurrence generation are `Draft`.

Expected status never changes actual wealth by itself.

---

## CALC-023 — Credit Card Net-Worth Effect

At purchase:

```text
Expense occurs
Liability increases
Cash bank Holding unchanged (for true credit card)
Net Worth decreases by economic expense effect through higher liability
```

At card payment:

```text
Cash decreases
Liability decreases by same principal
No new expense for principal
```

Fees/interest are separate real expenses when actually incurred.

---

## CALC-024 — Third-Party Custody

An owner’s wealth includes their OwnershipShare current value regardless of custodian.

```text
Owner Wealth Value
includes Holding value by ownership
NOT by custodian identity
```

Custodian's own wealth excludes that value unless they separately own a share.

---

# Numerical precision rules

Target database:
- exact `NUMERIC/DECIMAL` quantities, rates and money;
- precision/scale defined per asset class and reporting need;
- no JavaScript binary-float results accepted as authoritative persistence without decimal policy in the final rebuild.

Prototype may use simplified JS numbers for proof-of-concept only.

# Calculation provenance

Every displayed analytical value should be traceable to:
- source quantities;
- owner scope;
- portfolio scope where relevant;
- valuation source/time;
- cost-basis method;
- transaction execution inputs where realized P/L is involved.

A Vibe Coding agent must not add an unlabeled financial total whose formula is absent from this file or an approved extension.