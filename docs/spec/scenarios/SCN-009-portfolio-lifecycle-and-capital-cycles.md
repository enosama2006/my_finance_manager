# SCN-009 — Portfolio Lifecycle, Capital Cycles, and Position Closure

Status: **Approved scenario facts / Draft lifecycle architecture**

## Purpose

Pressure-test the meaning of Portfolio after the Asset/Cost Flow model was clarified in SCN-007 and SCN-008.

The scenario compares:

- a short commercial/economic operation that opens and closes quickly;
- a long-lived child/savings Portfolio that may remain open for years;
- a narrow investment Position such as 10g Gold that can be opened and fully liquidated without closing the parent Portfolio;
- recurring Commitment/Spending/Savings Portfolios such as rent, school and monthly expenses;
- pure Investment Portfolios containing many independent Positions and cycles.

The key discovery is that Portfolio lifecycle, economic-cycle lifecycle and Asset-position lifecycle are not the same thing.

---

## 1. Three independent lifecycle layers

### Portfolio

Answers:

> Why is capital reserved/managed this way, under what behavior/policy, and for how long does that purpose exist?

A Portfolio can be long-lived, periodic, finite, manually closed, or hierarchical.

### CapitalCycle — Draft concept

Answers:

> Which finite economic episode began, what capital/resources entered it, what happened during it, and what was the final realized result when it ended?

Examples include one short commercial conversion/delivery operation, one six-month investment round, one rent period, one school term, or one discrete buy→hold→sell investment episode.

A CapitalCycle may belong to a Portfolio, an EconomicActivity/Venture, or another economic case. It must not be required to be a Portfolio itself.

### Position

Answers:

> What exposure to one Asset is currently open?

Examples: 10g Gold, 2,000 XRP, 1,000 fund units, one Land Asset, or 60,000 SAR cash reserved in a Portfolio.

A Position may close while its parent Portfolio remains open.

---

## 2. Short commercial/economic operation

A short operation may receive an input Asset/value, convert or sell it through one or more Assets/Accounts, realize some gain, and still remain open because later replacement, settlement, delivery, or direct costs remain unresolved.

During the cycle MyFinMan may show:

```text
Cycle status: Open
Realized gains so far: ...
Realized costs/losses so far: ...
Open obligation/exposure: ...
Net provisional result: ...
```

The first realized gain is not the final cycle result if further settlement costs remain possible.

When the final required delivery/replacement is completed:

```text
Cycle status: Closed
Gross realized gains
- realized losses/costs
= Net realized cycle result
```

If the final residual profit is 5,000 TRY and the reporting currency is SAR:

- preserve native result = 5,000 TRY;
- snapshot reporting value at cycle closure using the applicable valuation/FX rule;
- if the 5,000 TRY remains held after cycle closure, later TRY/SAR FX movement belongs to the subsequent TRY Position, not retroactively to the closed cycle.

---

## 3. Long-lived Child/Savings Portfolio

A child Portfolio may remain open for years while cash contributions, asset purchases, sales and reinvestments occur.

It must distinguish contributions/new capital, withdrawals/distributions, current allocated assets, realized gains/losses, unrealized gains/losses where enabled, investment income/yield, fees/friction and beneficiary context.

The Portfolio must not report deposits as investment profit.

For a long-lived Portfolio with irregular contributions, simple return from first deposit is insufficient; a future performance engine should support contribution-aware measures such as MWR/XIRR and/or TWR according to product policy.

---

## 4. Narrow Gold Position opened and closed inside a Portfolio

Example:

```text
Buy 10g Gold
Total Cost Basis = 5,400 SAR

Sell 10g Gold
Net proceeds = 5,500 SAR
```

The Gold Position becomes fully closed:

```text
Opening capital / basis = 5,400 SAR
Return of capital       = 5,400 SAR
Realized gain           =   100 SAR
Position quantity       =     0g
Position status         = Closed
```

The bank/cash destination may receive the full 5,500 SAR, but MyFinMan must not classify the full 5,500 as Income.

Economic decomposition:

```text
5,400 SAR = returned/recovered principal
100 SAR   = realized investment gain
```

The 100 SAR may appear in management views as investment return / realized capital gain / income-from-investment according to final taxonomy, while preserving separation from principal.

The parent Portfolio can remain open after the Position closes.

After sale, the 5,500 SAR can explicitly remain as Portfolio Cash for reinvestment, be reallocated to another Asset, be distributed/withdrawn, be released to owner Free Liquidity, or fund another Portfolio through explicit reallocation. The system must not guess.

---

## 5. Closing a Position, Cycle and Portfolio are different

### Close Position

A Position can close when its economic quantity/exposure reaches zero and its disposal effects are fully posted.

### Close CapitalCycle

A CapitalCycle can close only when:

1. all required physical transactions are posted;
2. linked obligations/claims/settlements required by the cycle are resolved or explicitly transferred out;
3. no unresolved Bridge Asset/cost flow remains inside the cycle;
4. attributable fees/costs/losses are posted or explicitly pending/unknown under policy;
5. every residual Asset/value has an explicit destination after closure;
6. the cycle result can be frozen as an auditable realized summary.

### Close Portfolio

A Portfolio can close only after remaining allocations/positions/cycles/commitments are closed, transferred to another purpose, or distributed/released through explicit user action.

Closing never deletes history.

---

## 6. Recurring Commitment Portfolio

Example:

```text
Portfolio: Home Rent
Profile: Commitment
```

Inside it, periodic CapitalCycles can represent September 2026 Rent, October 2026 Rent, etc.

Each period primarily measures required amount, funded amount, shortfall, due date and paid/settled state.

If reserved rent capital is temporarily invested, investment return is a secondary result and must not replace the commitment metric.

---

## 7. Monthly Spending Portfolio

A persistent SpendingBudget Portfolio may create monthly cycles such as August 2026 and September 2026.

Primary metrics: budget/funded, spent, remaining, and rollover/release according to policy. It is not primarily a profit/loss Portfolio.

---

## 8. Savings/Accumulation Portfolio

A SavingsGoal/Reserve Portfolio can remain open until target or manual closure.

Primary metrics: contributions, target, progress, protected/free amount and current value.

If capital is invested, investment performance is an additional layer:

```text
Total contributed capital
+ realized/unrealized investment result
= current economic value
```

Contribution growth must not be confused with investment return.

---

## 9. Pure Investment Portfolio

A long-lived Investment Portfolio can contain many Positions and CapitalCycles:

```text
Investment Portfolio
├─ Gold Position A — Closed +100 SAR
├─ XRP Position B — Open -8% unrealized
├─ Namaa Cycle 1 — Closed +actual return
├─ Namaa Cycle 2 — Open
└─ Cash awaiting investment
```

Portfolio-level metrics should roll up without double counting: total contributed capital, net withdrawals/distributions, current value, realized P/L, unrealized P/L, investment income/yield, fees/friction and a contribution-aware return metric when implemented.

---

## 10. One-off Deal / Operation

A one-off operation may be represented in UX as a finite Portfolio-like card, but target architecture should avoid forcing Portfolio to carry every transactional lifecycle concept.

Recommended Draft relationship:

```text
Portfolio (optional long-lived purpose)
   └─ CapitalCycle(s)

EconomicActivity / Deal
   └─ CapitalCycle(s)
```

For a one-off deal, the CapitalCycle may effectively be the top-level user object even if the UI labels it "عملية" rather than "محفظة".

---

## 11. Draft cycle result model

At closure, preserve native and reporting values for at least:

```text
Capital contributed / committed
Capital returned / distributed
Realized trading/disposal gains
Realized trading/disposal losses
Investment income / yield
Operating/service revenue if relevant
Fees / friction / direct costs
Net realized result
Residual assets distributed/released/transferred
Closing reporting-currency value
```

Not every cycle uses every field. Commitment/Spending cycles use profile-specific KPIs rather than profit as the primary outcome.

---

## 12. Core invariants discovered

1. Portfolio closure, Cycle closure and Position closure are separate events.
2. A Position reaching zero must not automatically close the parent Portfolio.
3. A realized gain during an open Cycle is not automatically the final Cycle profit.
4. Sale proceeds must be decomposed into return of principal and realized result; full proceeds are not income.
5. Contributions are external capital flows, not investment profit.
6. A closed Cycle's historical result must not change because a residual currency/Asset later changes market value after leaving the Cycle.
7. Residual capital at Position/Cycle closure requires an explicit next purpose/destination.
8. Commitment and Spending Portfolios use different success metrics from Investment Portfolios even though the same underlying Asset/Transaction engine powers them.
9. Closing never deletes ledger/history.
10. Portfolio parents must not double-count child Cycle/Position values.

---

## 13. UX implications

A Portfolio detail should be able to show status/profile, capital contributed/withdrawn/current value, realized/unrealized performance, income/yield, fees, open/closed Positions and active/closed Cycles.

A short Cycle card should show status, capital input, realized gain so far, realized costs/losses, open obligations, provisional result and a `Close Cycle` action.

`Close Cycle` must preview all unresolved items and the destination of residual value before allowing closure.

---

## 14. Acceptance scenarios

- Closing a 10g Gold Position records only the 100 SAR gain as realized result, not 5,500 SAR income.
- Closing that Gold Position does not close the parent Portfolio.
- A short commercial Cycle cannot close while required replacement/delivery remains unresolved.
- A closed commercial Cycle preserves 5,000 TRY native profit and closure-date SAR reporting value; later TRY movement does not rewrite historical result.
- A child Portfolio can remain open for years while individual Positions/Cycles open and close.
- Monthly rent can use recurring Commitment cycles without creating a new top-level purpose every month.
- Contribution deposits increase Portfolio capital but not investment return.
- Reinvesting sale proceeds keeps them allocated; releasing them increases Free Liquidity only through explicit purpose change.
- Whole-Portfolio closure requires explicit disposition of all remaining assets/allocations and preserves history.

---

## 15. Status

Approved scenario facts:

- portfolios can be short or long lived in user experience;
- investment Positions can be opened/closed inside a still-open Portfolio;
- short economic operations need an end-of-cycle total realized result;
- long-lived child/savings portfolios may accumulate contributions and Assets for years;
- Commitment, Spending, Savings and Investment purposes need different primary KPIs;
- principal return must not be mislabeled as income.

Draft architecture:

- `CapitalCycle` entity/name;
- exact schema for cycle-result snapshots;
- automatic cycle creation rules for recurring Portfolios;
- exact MWR/TWR implementation and display policy;
- whether one-off deal UX uses Portfolio or Operation/Deal while sharing the same engine.
