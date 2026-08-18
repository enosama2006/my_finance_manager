# ADR-005 — Instrument identity, Asset instances, Groups, Portfolios, lots and investment cash flows

Status: **Draft target refinement — validated against SCN-001…SCN-022, pending explicit product approval before clean rebuild**
Date: 2026-08-18
Builds on: ADR-002, ADR-004

## Context

Real-use validation exposed two ambiguities that ADR-004 alone does not fully answer:

1. the same economic instrument can exist in more than one real holding context (for example Gold at Al Rajhi and Gold held by a brother), while the user still wants one high-level Gold exposure;
2. repeated purchases of the same fund/metal/stock should increase an existing holding and add acquisition lots rather than manufacture a new Asset every time.

The investment-account snapshot also exposed a separate terminology problem: a real broker/investment account, the cash inside it, the funds purchased with that cash and a Portfolio purpose are four different concepts.

## Decision direction

The target model separates five questions:

```text
InstrumentDefinition = what instrument/economic thing is this?
Group                = where/how did the user organize this Asset in MyFinMan?
Asset                = what concrete quantity/value does the user currently hold?
Portfolio            = why is some of that value reserved/managed?
Transaction / Lot    = what happened to create/change that Asset quantity and cost?
```

### 1. InstrumentDefinition — reference identity, not wealth

`InstrumentDefinition` is non-quantity-bearing reference data.

Examples:
- SAR;
- USD;
- Gold / XAU gram;
- Silver / XAG gram;
- Al Rajhi Monthly Distribution Fund 2;
- Al Rajhi Small & Mid Cap Fund;
- a listed share/ETF/REIT/crypto instrument.

It may carry market/catalog metadata such as official name, symbol, ISIN/local code, currency, native unit, provider/manager and valuation strategy.

It MUST NOT carry the user's balance, ownership, cost basis or Portfolio allocation.

Manual Assets may temporarily have no `instrumentId`. They can later be reconciled to a known InstrumentDefinition without changing Asset ID, Ledger or Cost Basis.

### 2. Asset — one concrete user holding/balance

`Asset` remains the user-facing financial truth from ADR-004. Internal prototype code may still call it `Holding`.

An Asset carries:
- native quantity/balance;
- ownership shares;
- exact acquisition lots / cost basis;
- current valuation;
- optional instrument reference;
- optional descriptive custody/provider/location metadata;
- optional Group placement;
- transaction references.

An Asset never contains another Asset.

The same InstrumentDefinition may be represented by multiple Asset instances when the user intentionally keeps separate holdings.

Example:

```text
InstrumentDefinition: Gold / XAU

Asset A: 140 g, custodian Al Rajhi
Asset B:  60 g, custodian Brother

Derived total Gold exposure = 200 g
```

The derived total is never stored again as a third wealth Asset.

### 3. Group — the only user hierarchy/container

Group remains the only tree/container in the main wealth UI.

A Group may mirror a meaningful real-world context such as:

```text
الاستثمارات
└── الراجحي المالية
```

or a user-created organizational view such as:

```text
المعادن
```

but Group itself has no quantity, ownership, cost basis, valuation or Ledger.

**Important:** Group placement alone is not authoritative custody/ownership truth. Renaming/reparenting an Asset between Groups is organizational unless the user records a real custody/transfer event separately. If physical custody matters, the Asset carries explicit custodian/provider/location metadata.

This preserves ADR-004's free reorganization rule while still allowing the UI tree to mirror real institutions.

### 4. Real investment/broker account is not Portfolio

A broker/investment account is represented in the user tree as a Group/context plus the Assets actually held there.

Example:

```text
الاستثمارات                     Group
└── الراجحي المالية              Group/context
    ├── سيولة SAR                Asset cash
    ├── سيولة USD                Asset cash
    ├── صندوق توزيعات شهرية      Asset fund
    └── صندوق نمو                Asset fund
```

The Group roll-up is derived from those Assets. It is not a second balance.

A `Portfolio` remains an independent WHY lens and may span multiple Groups/providers.

Example:

```text
Portfolio: دخل دوري
  -> allocation to Monthly Distribution Fund

Portfolio: نمو طويل الأجل
  -> allocation to Small & Mid Cap Fund
```

A Portfolio is optional. The user does not need one merely because a broker account exists.

### 5. Repeated purchases target an Asset instance and add lots

A purchase has two valid destination modes:

```text
A. Add to existing Asset
B. Create new Asset
```

When adding to an existing Asset:
- quantity increases;
- owner share increases;
- a new exact CostBasisLot is appended;
- old lots remain immutable/auditable;
- the purchase is a separate LogicalTransaction;
- weighted average cost is derived from all active lots.

No automatic merge is allowed from name/symbol similarity alone. A stable `instrumentId` may suggest candidates, but the target Asset instance must be deterministic/user-confirmed.

The same instrument may intentionally remain separate in another Asset instance (for example Gold at Brother vs Gold at Bank).

### 6. CostBasisLot truth is total lot cost + quantity

Financial truth MUST NOT be reconstructed from a display-rounded unit cost.

Target lot facts:

```text
quantity
exactTotalCostBasisSar
acquiredAt
ownerId
sourceTransactionId
```

`unitCostSar = exactTotalCostBasisSar / quantity` is derived for display/calculation and may retain high precision internally.

This resolves the real snapshot error where a 50,000 SAR fund purchase lost basis after storing only a 2-decimal unit cost.

Unknown historical basis remains unknown. Foreign-currency opening state must never invent `1 SAR` as acquisition basis simply because the native quantity is denominated in USD.

### 7. Position is not one purchase

A Position is an optional performance/lifecycle lens, not a requirement to create a new Holding/Asset for each purchase.

Repeated purchases into one Asset may belong to:
- the same open Position; or
- different CapitalCycles/strategic Positions when explicitly intended.

The architecture must never force a new Asset merely to represent a new purchase transaction.

### 8. Fund distributions are cash-flow events linked to the investment Asset

A cash distribution from a fund is not a purchase and does not reduce fund units in an ordinary cash-distribution case.

Target event:

```text
Fund Asset / Position -- investment_distribution --> Cash Asset
```

It records:
- source/reference investment Asset;
- target Cash Asset;
- amount actually received;
- date;
- income classification;
- optional Portfolio/Position/Instrument reference.

Distribution policy belongs primarily to InstrumentDefinition metadata:
- distributing;
- accumulating;
- unknown;
with optional expected frequency.

A `return_of_capital` distribution must be distinguishable from ordinary income because it may reduce cost basis according to policy.

### 9. Performance decomposition

For an open distributing investment:

```text
Market P/L = Current Market Value - remaining Cost Basis
Cash Income = cumulative qualifying distributions received
Total Return = Current Market Value + Cash Income + realized proceeds/results - net contributed acquisition cost
```

Exact formulas depend on disposal/return-of-capital details, but the product must keep Market P/L, Cash Income and Total Return separate.

For an accumulating fund, no cash income is invented merely because NAV rises.

### 10. Portfolio remains purpose, not physical source

ADR-002 remains authoritative:
- Portfolio answers WHY;
- Asset answers WHAT/QUANTITY;
- Group answers user organization;
- actual payment source is a Cash Asset;
- ownership is independent;
- no fake transfer is created to make a Portfolio match a bank/provider.

Optional designated/hard backing may still be modeled as policy over specific Asset quantities when intentionally required by SCN-005.

## Compatibility mapping for historical scenario terminology

Older scenarios use `Account`, `Holding`, `Container`, `Asset master`, and `Place`. Their accepted facts remain useful, but target interpretation is:

```text
old normalized Asset master -> InstrumentDefinition
old Holding                 -> Asset instance
old Account/Place tree      -> Group UI context + optional Asset custody/provider metadata
old Portfolio               -> Portfolio WHY (unchanged)
```

Legacy schema-v4 `Account` records remain import compatibility only.

## Invariants

1. No wealth is stored on Group or InstrumentDefinition.
2. Asset is the only quantity-bearing wealth object in the main wealth model.
3. One InstrumentDefinition may aggregate many Assets without double counting.
4. Asset-to-Group move is organizational unless a real transfer/custody transaction is separately posted.
5. Repeated purchase does not require a new Asset.
6. Every purchase creates an independently reversible lot/economic projection.
7. Exact lot basis is preserved losslessly; rounding is presentation-only.
8. Portfolio never substitutes for a real cash Asset or broker/bank context.
9. Cash distribution is linked to its investment source and cash destination.
10. Contribution, principal return, cash income, market P/L and realized P/L remain separable.
11. User correction follows reverse old projection -> replay corrected intent -> preserve audit.
12. Manual/unmatched instruments remain valid and can later be reconciled without rewriting history.

## Implementation status

This ADR is a **target refinement**, not a claim that the prototype already implements it.

Related open work:
- #33 Group -> Asset cascader;
- #34 Instrument Catalog;
- #35 purchase-form reset;
- #36 repeated purchases / multiple lots into one Asset;
- #37 investment account vs Portfolio + distributions;
- #38 exact Cost Basis / FX opening correctness.
