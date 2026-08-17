# MyFinMan — Portfolio Lifecycle and Capital Cycle

Status: **Draft architecture derived from SCN-009**

## 1. Why this draft exists

Portfolio, finite economic cycle, and individual Asset Position have different lifecycles. Treating all three as one object causes errors such as:

- closing an entire Portfolio when one Gold Position is sold;
- reporting full sale proceeds as income;
- treating an early realized trade gain as the final profit of a still-open commercial cycle;
- losing contribution history in a long-lived child/savings Portfolio;
- forcing recurring rent/school/spending periods into new unrelated top-level Portfolios.

The target engine should separate these lifecycles while allowing the UI to present them coherently.

---

## 2. Portfolio

Portfolio remains the purpose/governance layer:

> Why is this capital reserved or managed this way?

Candidate properties in target design:

- stable ID;
- owner scope;
- optional beneficiary;
- parent Portfolio;
- behavior profile;
- lifecycle status;
- optional target/commitment parameters;
- optional backing/protection policy;
- optional recurrence policy;
- created/opened/closed timestamps;
- closure reason.

Candidate statuses:

```text
Draft
Open
Paused
Closing
Closed
Archived
```

Exact status taxonomy remains TBD.

---

## 3. CapitalCycle — Draft

CapitalCycle is a finite economic episode that groups transactions, positions, obligations and cost flows for one start→finish objective.

It is not automatically a Portfolio.

Candidate relationships:

```text
CapitalCycle
- optional Portfolio
- optional EconomicActivity / Venture / Deal
- Transactions
- Positions
- AcquisitionChains / CostFlows
- Obligations / Claims / Settlements
- Result snapshot
```

Candidate use cases:

- one short commercial deal;
- one remittance/conversion operation;
- one fixed-term investment round;
- one recurring rent period;
- one school term;
- one discrete investment round trip.

Candidate statuses:

```text
Open
PartiallySettled
ReadyToClose
Closed
Cancelled
```

Exact statuses remain Draft.

---

## 4. Position lifecycle

A Position is exposure to one Asset and can have lifecycle independent from Portfolio/Cycle.

Examples:

```text
Gold 10g
XRP 2,000
Fund units 1,000
USD 10,000
Land Asset
```

A Position may be:

```text
Open
PartiallyDisposed
Closed
```

A closed Position retains its cost basis/disposal history and realized result for audit/performance rollup.

A Position quantity reaching zero does not close its parent Portfolio or Cycle unless all closure conditions of those layers are also satisfied.

---

## 5. Close semantics

### Position close

Allowed when the disposed/remaining quantity logic resolves the Position exposure to zero and disposal effects are posted.

### CapitalCycle close

Candidate closure guard requires:

- all mandatory transactions posted;
- required obligations/settlements resolved or explicitly transferred out;
- no unresolved Bridge Asset / AcquisitionChain stage;
- pending direct costs handled according to policy;
- residual Assets/value assigned an explicit next destination;
- result summary computable and auditable.

At close, freeze a `CycleResultSnapshot` conceptually. Exact schema TBD.

### Portfolio close

Requires explicit handling of all remaining allocations, positions, cycles and commitments.

Possible user choices:

- liquidate;
- transfer assets to another Portfolio;
- release to Free Liquidity;
- distribute to beneficiary/owner;
- archive after zero state.

Closing never deletes underlying ledger events.

---

## 6. Sale proceeds are not all income

Example:

```text
Gold cost basis = 5,400 SAR
Gold sale proceeds = 5,500 SAR
```

Economic decomposition:

```text
Return of principal = 5,400 SAR
Realized gain       =   100 SAR
```

The Account may receive 5,500 SAR physically. Performance/income views must not classify the full 5,500 SAR as income.

This rule applies to all Asset disposals/conversions where basis is known.

---

## 7. Portfolio behavior profiles and primary KPIs

### SpendingBudget

Primary:

- funded/budget;
- spent;
- remaining;
- rollover/release.

Profit is not primary.

### Commitment

Primary:

- required;
- funded;
- shortfall;
- due date;
- settled state.

Any investment return on temporarily deployed reserve is secondary.

### SavingsGoal / Reserve

Primary:

- contributed capital;
- target/progress;
- current value;
- protected/free amount.

Investment result is additional if capital is invested.

### Investment

Primary:

- contributions;
- withdrawals;
- current value;
- realized P/L;
- unrealized P/L;
- investment income/yield;
- fees/friction;
- contribution-aware return.

### Deal / Operation

This may be a CapitalCycle attached to EconomicActivity rather than a separate Portfolio profile. Final decision TBD.

Primary:

- capital/input;
- realized revenues/gains;
- realized direct costs/losses;
- unresolved obligations/exposure;
- net final result at close.

---

## 8. Recurrence

A persistent Portfolio may create recurring cycles without creating a new purpose each period.

Examples:

```text
Home Rent Portfolio
  ├─ Sep 2026 Cycle
  ├─ Oct 2026 Cycle
  └─ Nov 2026 Cycle

School Portfolio
  ├─ 2026/2027 Term 1
  └─ 2026/2027 Term 2

Personal Spending
  ├─ Aug 2026
  └─ Sep 2026
```

Whether cycles are auto-created, lazily created, or user-created is TBD.

---

## 9. Long-lived Portfolio performance

For Portfolios receiving contributions/withdrawals over time, MyFinMan must separate:

```text
Capital contributions
Capital withdrawals/distributions
Investment income
Realized gain/loss
Unrealized gain/loss
Fees/friction
Current value
```

Simple percentage return based only on initial deposit can be misleading.

Draft future performance methods:

- MWR/XIRR for investor-experienced return;
- TWR for performance independent of contribution timing;
- simple realized return for narrow closed cycles where appropriate.

Exact product policy remains TBD.

---

## 10. Closed-cycle result preservation

When a cycle closes, store result in native units and reporting-currency snapshot at closure.

Example:

```text
Net cycle profit = 5,000 TRY
Reporting value at close = X SAR
```

If the 5,000 TRY remains owned after closure and later changes value, that later FX result belongs to the TRY Position after cycle closure. It must not rewrite the closed cycle profit.

This provides stable historical performance.

---

## 11. Residual-value destination

Closing a Position/Cycle requires explicit treatment of residual value.

Examples after Gold sale:

```text
5,500 SAR proceeds
```

Possible next states:

- stay as Cash allocated to same Portfolio;
- reinvest into another Asset;
- transfer purpose to another Portfolio;
- release to Free Liquidity;
- distribute/withdraw.

The engine must not infer the next purpose merely because an Asset was sold.

---

## 12. Candidate unified lifecycle map

```text
Portfolio
  purpose/policy/governance
  long-lived or finite

  ├─ CapitalCycle A
  │    ├─ Position(s)
  │    ├─ Transaction(s)
  │    ├─ CostFlow(s)
  │    ├─ Obligation(s)
  │    └─ ResultSnapshot on close
  │
  ├─ CapitalCycle B
  │    └─ ...
  │
  └─ Current allocations / cash / positions
```

Not every Portfolio requires explicit cycles for every event. The product may surface cycles when they add lifecycle, settlement or performance meaning.

---

## 13. Candidate rules

- Cost basis and valuation rules from SCN-007/008 remain independent of Portfolio lifecycle.
- Position/Cycle/Portfolio closure are separate commands.
- Contributions never become investment return merely because they increase Portfolio value.
- Sale principal never becomes income merely because cash re-enters an Account.
- Realized result can be finalized per Position/Cycle while parent Portfolio remains open.
- Unrealized result exists only for open positions under their valuation/performance policy.
- Closed-cycle history is immutable except through audited correction/revision of underlying events.
- Purpose/allocation after liquidation requires explicit user decision.
- Profile-specific KPIs are presentation/application policy over the same underlying financial truth.

---

## 14. Open questions

- Final entity name: `CapitalCycle`, `EconomicCycle`, `PortfolioCycle`, or another term.
- Whether a Deal/Operation is modeled primarily as EconomicActivity+CapitalCycle or a Portfolio behavior profile.
- Exact CycleResultSnapshot schema.
- Exact recurrence model.
- MWR/TWR calculation policy.
- Treatment of partial Position closure and multiple cost lots in cycle results.
- Whether residual profit automatically remains in parent Portfolio Cash or requires explicit choice every time.
- UI terminology in Arabic for Portfolio vs Cycle vs Position without sounding accounting-heavy.

Do not implement these open questions by guesswork.
