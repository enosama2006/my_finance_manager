# SCN-007 — Cost Flow, Acquisition Chain, and End-to-End Asset Cost

Status: **Approved scenario facts / Draft unified cost-flow architecture**

## Purpose

Pressure-test MyFinMan around a different axis from ownership/custody: how real acquisition cost propagates when one Asset is converted through one or more intermediate Assets before becoming the final Asset the user wants to own.

The user wants the system to preserve the economic truth that:

- actual money left a real Account;
- an intermediate Asset may have been acquired at a worse-than-reference rate or with bundled fees/spread;
- the effective cost of the intermediate Asset can exceed its immediate market value;
- when the intermediate Asset is subsequently converted into the final Asset, the original economic outlay should remain traceable;
- the final Asset should show cost basis versus current valuation and profit/loss;
- detailed fee decomposition is optional; the user may enter one all-in effective acquisition cost;
- the ledger may record every step even if the UI chooses to display the sequence as one aggregated acquisition journey.

This scenario intentionally focuses on cost flow and valuation rather than who owns the money.

---

## 1. Core distinction: cost is not valuation

MyFinMan must preserve two independent numbers:

```text
Cost Basis
= what the Asset economically cost the user to acquire

Current Valuation
= what the Asset is estimated/observed to be worth now
```

Changing current valuation must never rewrite historical cost basis.

A user may manually appraise a property at a higher value if that is their current valuation estimate, but this does not erase or rewrite acquisition friction.

---

## 2. Scenario A — SAR -> USD -> Land

Example facts:

```text
Target purchase: Land in Syria
Land purchase consideration: 10,000 USD
Reference USD value used by user: 3.74 SAR/USD
Actual all-in USD acquisition cost through remittance: 3.90 SAR/USD
```

Actual SAR outlay:

```text
10,000 USD × 3.90 = 39,000 SAR
```

Reference value of the acquired 10,000 USD at 3.74:

```text
10,000 USD × 3.74 = 37,400 SAR
```

Economic acquisition friction / immediate basis-to-market gap:

```text
39,000 - 37,400 = 1,600 SAR
```

The user does not need to itemize whether the 1,600 arose from remittance fees, exchange spread, commissions or other charges. MyFinMan may accept:

```text
Effective USD acquisition cost = 3.90 SAR/USD
```

and derive the all-in basis.

### 2.1 If USD is held before buying the land

State immediately after acquisition:

```text
USD quantity = 10,000
USD cost basis = 39,000 SAR
Reference/current value = 37,400 SAR
Economic P/L versus reference = -1,600 SAR
```

The system may describe this as an unrealized basis-to-market loss while the USD remains held.

### 2.2 If USD is immediately consumed to acquire the land

Physical/economic flow:

```text
SAR cash -39,000
USD +10,000
USD -10,000
Land +1 property position
```

The user wants the final Land Asset to retain the acquisition journey.

Draft management-costing rule:

```text
Land all-in acquisition cost basis = 39,000 SAR
```

provided the SAR->USD conversion was undertaken specifically to acquire that land and the costs are included only once.

The property may simultaneously have a current valuation independent of cost basis.

Example:

```text
Land cost basis = 39,000 SAR
Current estimated value = 37,400 SAR
Unrealized economic result = -1,600 SAR
```

If the user later appraises the land at 10,500 USD and the selected valuation rate is 3.74 SAR/USD:

```text
Current valuation = 39,270 SAR
Cost basis = 39,000 SAR
Unrealized result = +270 SAR
```

The important rule is not the exact appraisal value; it is that valuation changes must not rewrite the 39,000 SAR acquisition cost.

---

## 3. Scenario B — SAR/USD payment -> USDT -> XRP

Example facts:

```text
User pays economic outlay equivalent to 1,000 USD
Payment/on-ramp friction = 15 USD
Net USDT received = 985 USDT
Then all 985 USDT are used to acquire XRP
Assume XRP market price at acquisition = 1 USD for the simplified example
```

Effective USDT unit cost:

```text
1,000 / 985 = 1.015228... USD per USDT
```

The user has therefore not acquired 985 USDT at an economic cost of only 985 USD. The real source outlay is 1,000 USD.

If 985 USDT then buys 985 XRP at a market price of 1 USD/XRP:

```text
XRP quantity = 985
End-to-end acquisition cost = 1,000 USD
Effective XRP cost basis per unit = 1,000 / 985 = 1.015228... USD
```

If current XRP market price remains 1.00 USD:

```text
Current value = 985 USD
Cost basis = 1,000 USD
Unrealized result = -15 USD
Return on cost = -1.5%
```

The 15 USD must not disappear merely because the user converted USDT into XRP.

---

## 4. Ledger truth versus display mode

MyFinMan should record every real step as a financial event/leg even when the user prefers an aggregated view.

Example underlying ledger:

```text
Step 1: source cash/payment Asset -1,000 USD-equivalent
Step 2: USDT +985
Step 3: USDT -985
Step 4: XRP +985 units
```

But the UI may offer two views of the same immutable truth:

### Detailed pulse view

```text
Paid 1,000 USD
Received 985 USDT
Converted 985 USDT to 985 XRP
Final XRP cost basis 1,000 USD
```

### Aggregated acquisition view

```text
Acquired 985 XRP
Total acquisition cost: 1,000 USD
Current value: 985 USD
P/L: -15 USD (-1.5%)
```

Aggregation must never remove the underlying transaction legs or audit trail.

---

## 5. Draft concept — AcquisitionChain / CostFlow

A reusable grouping concept is needed to connect multiple conversions that belong to one acquisition objective.

Possible names:

```text
AcquisitionChain
CostFlow
CapitalConversionChain
```

Conceptual structure:

```text
AcquisitionChain
├─ Source Asset and source Account
├─ Source economic outlay
├─ Intermediate Assets
├─ Actual quantities received/disposed
├─ Final Asset
├─ All-in acquisition cost
├─ Current valuation
├─ Acquisition friction
├─ Realized results on disposed intermediate positions, if applicable
└─ End-to-end unrealized/current result
```

Status: Draft. Exact entity/table shape is not yet Approved.

---

## 6. Critical no-double-counting rule

If conversion friction is capitalized into the final Asset's all-in cost basis, the same amount must not also be counted a second time as a separate final loss/expense in total wealth performance.

The UI may explain the cost composition:

```text
Final Asset Cost = 39,000 SAR
of which acquisition/conversion friction versus reference = 1,600 SAR
```

but total P/L must not subtract the 1,600 twice.

Likewise in the XRP scenario:

```text
XRP Cost Basis = 1,000 USD
Current Value = 985 USD
P/L = -15 USD
```

Do not also subtract a separate 15 USD fee from Net Worth after the 15 USD is already embedded in the 1,000 USD basis.

---

## 7. Reference rate versus actual effective rate

MyFinMan should distinguish:

```text
Reference / Market Rate
used to estimate current value or benchmark execution

Actual Effective Rate
what the user actually paid/received after bundled spread/costs
```

The user may enter the actual effective rate directly without itemizing components.

Example:

```text
Reference USD = 3.74 SAR
Actual effective USD cost = 3.90 SAR
```

The difference is economically visible without forcing fee accounting detail.

---

## 8. Recognition semantics

The engine should preserve both step-level and end-to-end economics.

When an intermediate Asset is still held:

```text
Intermediate Asset P/L = Current Value - Cost Basis
```

When the intermediate Asset is disposed into the next Asset:

- its disposal/conversion event is retained;
- any applicable realized result can be calculated at the conversion step;
- the target Asset receives its appropriate acquisition basis;
- end-to-end AcquisitionChain reporting can still show total source outlay versus final current value.

The exact statutory/tax recognition policy may differ by jurisdiction. MyFinMan's target rule here is management/economic costing, not jurisdiction-specific tax accounting.

---

## 9. Portfolio interaction

Portfolio answers why the final or intermediate value is reserved; it does not replace cost flow.

Example:

```text
Portfolio: Syria Property Investment
AcquisitionChain: SAR -> USD -> Land
Final Asset: Land
Cost Basis: 39,000 SAR
Current Valuation: independent
```

or:

```text
Portfolio: Crypto Investment
AcquisitionChain: SAR/USD -> USDT -> XRP
Final Asset: XRP
Cost Basis: 1,000 USD-equivalent
Current Value: market price × quantity
```

Thus Portfolio and AcquisitionChain are orthogonal:

```text
Portfolio = WHY
AcquisitionChain = HOW COST ARRIVED AT THE FINAL ASSET
```

---

## 10. Acceptance scenarios

### TEST-SCN007-01 — effective FX cost
10,000 USD acquired at effective 3.90 SAR/USD must have a 39,000 SAR cost basis.

### TEST-SCN007-02 — market reference gap
At a 3.74 SAR/USD reference value, the 10,000 USD position must show 37,400 SAR current/reference value and a 1,600 SAR negative gap.

### TEST-SCN007-03 — no forced fee breakdown
The user can enter 3.90 as all-in effective cost without separately entering remittance fee/spread components.

### TEST-SCN007-04 — land basis propagation
If the USD acquisition is part of the same land acquisition chain, the final Land can retain 39,000 SAR all-in acquisition basis under the management-costing policy.

### TEST-SCN007-05 — valuation independent from cost
Changing the land appraisal must change current value/unrealized result but not historical acquisition cost.

### TEST-SCN007-06 — Google Pay/on-ramp example
A 1,000 USD source outlay yielding 985 USDT must retain 1,000 USD economic source cost.

### TEST-SCN007-07 — XRP basis propagation
If 985 USDT are fully converted to 985 XRP at the simplified 1 USD market price, XRP total cost basis remains 1,000 USD and effective unit cost is about 1.015228 USD/XRP.

### TEST-SCN007-08 — XRP immediate P/L
At a 1.00 USD current XRP price, the position must show 985 USD current value and -15 USD / -1.5% versus cost.

### TEST-SCN007-09 — detailed and aggregated views agree
Detailed pulse view and aggregated acquisition view must reconcile to identical quantities, cost basis and total P/L.

### TEST-SCN007-10 — no double counting
A friction amount embedded in final cost basis must not also be subtracted again as a separate final loss in total performance.

### TEST-SCN007-11 — chain retains intermediates
The final Asset record/report must retain links to intermediate conversions for audit/explanation without treating the intermediates as still-held Assets after disposal.

### TEST-SCN007-12 — portfolio orthogonality
Changing Portfolio purpose must not rewrite AcquisitionChain cost basis or physical transaction history.

---

## 11. Architectural conclusion

A strong unified rule emerges:

> Every Asset acquisition has a quantity, an actual economic source outlay, and a cost basis. Conversions may change the Asset identity without erasing the economic cost already incurred. Current valuation is always independent from historical cost. Multi-step conversions can be grouped into an AcquisitionChain so the system can show either every pulse or one end-to-end acquisition result without changing financial truth.
