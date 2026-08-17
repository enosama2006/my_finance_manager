# MyFinMan — Acquisition Chain and Cost Flow

Status: **Draft architecture derived from SCN-007**

## 1. Problem

A user may acquire a final Asset through multiple real conversions:

```text
SAR -> USD -> Land
SAR/USD payment -> USDT -> XRP
```

The target product must not lose the original economic outlay merely because the Asset identity changes in intermediate steps.

The app therefore needs a reusable cost-flow mechanism in addition to Accounts, Holdings, Ownership, Portfolios and Transactions.

---

## 2. Core values to preserve

For every acquisition step, preserve at least:

```text
Source Asset
Source Quantity
Source Account/Holding
Actual source outlay in native terms
Destination Asset
Destination Quantity
Actual effective unit cost
Transaction-time reference value/rate when available
Cost Basis assigned to destination
Fees/spread detail if supplied, otherwise aggregated friction
```

The system must allow the user to omit fee decomposition and provide only an all-in effective cost.

---

## 3. Draft concept — AcquisitionChain

An `AcquisitionChain` groups multiple LogicalTransactions/TransactionLegs that are economically one acquisition journey.

Example:

```text
AcquisitionChain #A
Objective: Buy Syria Land

1. SAR -39,000
2. USD +10,000
3. USD -10,000
4. Land +1 position

End-to-end source cost = 39,000 SAR
Final Asset cost basis = 39,000 SAR under approved management-costing policy
```

The chain is not the ledger. It is a grouping/traceability/cost-propagation layer over immutable real events.

---

## 4. Cost basis propagation

Candidate management rule:

```text
Destination Cost Basis
= economic basis of consideration disposed
+ directly attributable acquisition friction not already included
```

For a full conversion where source outlay already includes all bundled friction, the final target basis can inherit that all-in source outlay.

No amount may be counted twice.

---

## 5. Reference value and execution friction

Store separately:

```text
Actual Effective Cost / Rate
Reference Market Value / Rate
```

Possible derived metric:

```text
Acquisition Friction
= Actual Economic Outlay
- Reference Value of Asset Received at transaction time
```

This metric is explanatory. Whether it is separately recognized as realized P/L, capitalized in the next Asset, or shown only as execution quality depends on the transaction lifecycle and chosen management-reporting policy.

The user-facing product should avoid forcing statutory-accounting terminology where unnecessary.

---

## 6. Current valuation independence

For any final Asset:

```text
Cost Basis = immutable historical acquisition economics except valid corrections/capital adjustments
Current Valuation = latest market/manual/appraisal value
Unrealized Result = Current Valuation - Remaining Cost Basis
```

A valuation update must never rewrite cost basis.

---

## 7. Step-level versus end-to-end reporting

The engine always keeps step-level truth.

UI can provide:

- `Pulse View` — every conversion/fee/source/destination;
- `Acquisition View` — final Asset, total cost, current value and P/L;
- `Cost Breakdown` — optional detail of spread/fees/intermediate losses if known.

All views must reconcile exactly.

---

## 8. Interaction with Portfolio

Portfolio and AcquisitionChain answer different questions:

```text
Portfolio = Why is this capital held/reserved?
AcquisitionChain = How did the economic cost arrive at this Asset?
Account/Holding = Where does the Asset currently exist?
Asset = What is currently owned?
Valuation = What is it worth now?
```

Therefore an Asset can move between Portfolios without changing its acquisition chain or cost basis.

---

## 9. Interaction with realized P/L

The existing Approved rule says qualifying true conversion/disposal can create realized P/L.

SCN-007 reveals a reporting requirement beyond a single realized number:

- intermediate conversion may have realized economics;
- final Asset needs cost basis;
- end-to-end chain needs total source outlay versus final current value;
- the same friction cannot be charged twice.

Exact realized-recognition rules for each Asset class and jurisdiction remain separate from this Draft management-costing architecture.

---

## 10. Draft invariants

1. Cost survives Asset identity changes unless an explicit accounting rule recognizes and removes part of it.
2. Current valuation never overwrites cost basis.
3. Intermediate Assets disposed in the chain must not remain in current Holdings.
4. All-in effective cost may substitute for detailed fee/spread components.
5. A fee/friction amount embedded in target cost basis cannot also be deducted again from total performance.
6. Aggregated acquisition reporting must reconcile exactly to underlying immutable transaction legs.
7. Portfolio reallocation does not alter acquisition cost history.
8. Manual valuation can change current P/L but cannot make historical acquisition friction disappear.

---

## 11. Open questions

- Final entity name: `AcquisitionChain`, `CostFlow`, or another term.
- Whether every multi-step conversion automatically creates a chain or only when explicitly grouped.
- Exact rule for when intermediate realized P/L is shown separately versus only inside end-to-end chain reporting.
- Cost-basis propagation across partial conversions.
- Multiple source lots into one final acquisition.
- One source acquisition split into multiple final Assets.
- Jurisdiction-specific tax reporting versus MyFinMan management costing.
- Treatment of financing costs, taxes, duties and post-acquisition improvements for different Asset classes.

Do not implement these unresolved points by guesswork.
