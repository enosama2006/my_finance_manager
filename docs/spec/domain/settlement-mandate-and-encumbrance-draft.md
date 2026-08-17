# MyFinMan — Settlement Mandate and Encumbrance Draft

Status: **Draft architecture derived from SCN-006**

## 1. Problem

MyFinMan already distinguishes Owner, Asset, Holding, Account, Portfolio and Claim/Liability. SCN-006 adds another recurring pattern:

> The user temporarily controls value that must be transformed and ultimately delivered to another Party, while intermediate Assets and Accounts may change and fees/gains may belong to different Parties by agreement.

This is not adequately modeled as a Portfolio alone.

## 2. Proposed concept — SettlementMandate

A `SettlementMandate` groups a chain of real transactions under one outstanding economic obligation.

It answers:

- who entrusted/instructed the user?
- who is final beneficiary?
- what input value started the cycle?
- what output must ultimately be delivered?
- who bears execution costs?
- who receives favorable execution gain/spread?
- what remains outstanding now?

Draft fields:

```text
id
principal_party_id
beneficiary_party_id
input_asset_id
input_quantity
target_asset_id
target_amount nullable
target_policy
cost_bearer_policy
gain_entitlement_policy
status
opened_at
settled_at nullable
notes
```

## 3. Target policies

Draft enum:

### FixedTarget
A fixed target must be delivered. Execution shortfall belongs to whoever contractually guarantees the target.

### NetProceeds
Beneficiary receives proceeds after qualifying pass-through costs.

### EquivalentValue
Obligation is denominated in a value basis and may be settled using another Asset according to a specified valuation rule.

## 4. Cost and gain attribution

Execution cost and execution gain are independent.

Draft:

```text
CostBearer:
- Principal
- Operator
- Shared

GainEntitlement:
- Principal
- Operator
- Shared
```

Do not infer these from Account ownership.

## 5. Encumbrance / restriction

A physical Holding may contain value that the user controls but should not count as unrestricted Free Liquidity because it backs an open obligation.

This motivates an explicit derived or persisted `Encumbrance` concept.

Possible sources:

```text
PortfolioAllocation
SettlementMandate
Liability reserve
PhysicalReservation
Other future contractual restriction
```

Conceptual formula for an Owner + Asset position:

```text
Unrestricted Quantity
= Owned/controlled economic quantity eligible for user spending
- Portfolio-reserved quantity
- obligation-backed/encumbered quantity
- other hard reservations
```

Exact overlap-prevention rules are TBD; the same quantity must never be reserved twice accidentally.

## 6. Ownership vs controlled entrusted assets

Two distinct patterns must remain available:

### Pure Custody
Another Party remains Owner of a specific Asset quantity. User is Custodian only.

Example: Child-owned cash stored in Father's safe, or Sender-owned USDT that must be returned as USDT.

### Conversion/Settlement Mandate
User is authorized to dispose/transform the received Asset to satisfy a separate obligation.

A practical balance-sheet view may represent:

```text
Controlled Asset
+ offsetting Obligation
```

so the controlled Asset does not inflate user's Net Worth.

The exact legal/accounting ownership classification may depend on product mode and terms; MyFinMan's management view must at minimum preserve economic attribution and avoid counting entrusted value as unrestricted personal wealth.

## 7. Transaction-leg implications

A single mandate may link many LogicalTransactions:

```text
Receive USDT
Sell USDT for TRY
Acquire USD cash using TRY
Deliver USD cash
```

Each transaction records real physical effects. The Mandate provides lifecycle continuity and outstanding-obligation calculation.

TransactionLeg should eventually be able to carry optional dimensions such as:

```text
mandate_id
portfolio_id
activity_id
owner/economic_party_id
cost_bearer_party_id
gain_beneficiary_party_id
```

Exact normalization is TBD.

## 8. Profit semantics

Realized execution margin must be distinguished from entrusted principal.

Example:

```text
USDT reference/carrying value = 45,000 TRY
Actual sale proceeds = 50,000 TRY
Allowed operator spread = 5,000 TRY
```

The 5,000 can become user Income/Realized Margin only when:

- the gain is actually realized by a completed transaction; and
- mandate terms assign the gain to the user/operator.

Until those conditions are met, do not treat gross account proceeds as personal profit.

## 9. Loss semantics

A fee or unfavorable conversion is not automatically user Expense.

If Principal bears it under NetProceeds policy, it is a mandate execution cost reducing the principal's settlement result.

If Operator bears it, it becomes user economic Expense/loss.

If Shared, allocate deterministically by the agreed rule.

## 10. Relationship to Portfolio

Portfolio remains the purpose/earmark layer for an Owner's own wealth.

SettlementMandate is an obligation-execution layer.

They may interact but neither replaces the other.

Examples:

- User may choose to fund an operator-borne shortfall from Free Liquidity or a Portfolio.
- User may put realized mandate profit into an Investment Portfolio after it becomes user-owned.
- An open mandate itself should not be represented as an Investment Portfolio merely because assets are converted along the way.

## 11. Relationship to Activity/Venture

If such transactions are recurring and commercial, a Mandate may link to an `EconomicActivity`, e.g. remittance/exchange service.

Then reporting can distinguish:

```text
Mandate principal/pass-through value
Operator revenue/fees/spread
Operator expenses
Net Activity profit
```

For an occasional personal favor, Activity linkage may be omitted.

## 12. Invariants

- Entrusted/obligation-backed value must not inflate unrestricted personal wealth.
- Physical Account balances remain real and reconcilable.
- Real asset conversions must be recorded as real conversions, not fake transfers.
- Outstanding obligation must survive changes in intermediate Asset type.
- Cost/gain attribution follows explicit mandate terms.
- Gross proceeds are not automatically profit.
- Portfolio is optional and must not be overloaded to represent entrusted liabilities.
- Final delivery reduces the outstanding obligation and the delivered Holding exactly once.
- No transaction leg may silently make another Party's economic loss become the user's loss or vice versa.

## 13. Open questions

- Final entity names: SettlementMandate, EntrustedObligation, FulfillmentCase, or another term.
- Whether controlled assets under a mandate are represented as user-owned + liability, third-party beneficial ownership, or configurable presentation over one canonical ledger.
- Exact valuation basis for EquivalentValue mandates.
- Exact overlap rules between PortfolioReservation and ObligationEncumbrance.
- Whether realized operator spread is Income Category, Trading P/L, Activity Revenue, or context-dependent classification.
- Regulatory/compliance metadata if this product ever supports repeated commercial remittance/exchange activity.

Do not implement these open questions by guesswork.
