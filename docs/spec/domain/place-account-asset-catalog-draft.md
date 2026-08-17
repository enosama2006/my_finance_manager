# Place, Account, Asset Catalog and Valuation UX

Status: **Draft domain/UX refinement — Implemented Prototype evidence in current branch**

## Purpose

This note refines the user-facing hierarchy and purchase workflow after direct usability feedback.

The application must not force users to think in implementation terminology. The financial truth remains layered, but the ordinary UX should match the user's mental model.

## 1. Place / Institution is the visible root of custody

For ordinary navigation, the preferred hierarchy is:

```text
Place / Institution
  → Account / Container
    → Holding / Asset
```

Examples:

```text
مصرف الراجحي
  → جاري شخصي
    → SAR cash
    → USD cash
  → حساب استثماري
    → Al Rajhi Fund units
  → بطاقة ائتمان
    → liability/access instrument semantics

المنزل
  → الخزنة
    → SAR cash
    → Gold physical holding
```

A Place/Institution creates no wealth by itself. An Account creates no wealth by itself. Only Holdings/Assets and liabilities/claims represent economic positions.

### What is a Place?

Examples:
- bank;
- brokerage / investment platform;
- home;
- physical vault/location container root;
- person acting as custodian;
- other institution/place.

### What is NOT a Place?

- Land is an Asset. Its geographic location is metadata on the Asset/Holding.
- A Stock is an Asset. Its custody place is the broker/bank and its Account.
- A Fund is an Asset. Its custody place is the investment/broker Account.
- Gold is an Asset. Physical storage may be Home → Safe or another custodian.

This distinction preserves `WHERE` without reclassifying `WHAT`.

## 2. Account creation must always be under a clear Place

Ordinary account creation selects a parent Place/Institution first.

One bank/place may contain many Accounts:
- checking;
- savings;
- investment account;
- custody account;
- cash container;
- prepaid balance;
- fixed-term container;
- credit-card account/liability surface.

The Assets & Accounts screen should default to Place → Account → Holdings. Owner and Asset-Type lenses remain alternative views.

## 3. Predefined extensible Asset Type Catalog

Users should not type arbitrary asset kinds for normal operations.

The product maintains an extensible catalog. Current prototype definitions include:
- Gold;
- Silver;
- Stock;
- Investment Fund;
- Crypto;
- Fixed-term investment;
- Land;
- Property / apartment / building;
- Vehicle;
- Collectible;
- Receivable/claim;
- Other.

Each definition can specify:
- stable type ID;
- domain `AssetKind`;
- display label and group;
- native/default unit;
- default symbol when appropriate;
- market quote strategy;
- valuation method;
- internal performance-policy default;
- whether the user must identify an instrument/ticker.

The catalog is product metadata, not a user-entered free-text accounting class. Future types can be added without changing every purchase form.

## 4. Simplified Purchase UX

The ordinary purchase form asks only for concepts the user naturally knows.

### Funding side
- Place / bank;
- source Account;
- source Cash Holding/currency;
- amount actually paid;
- optional Portfolio purpose.

### Acquired side
- predefined Asset type;
- name/instrument identity when needed;
- acquired quantity;
- destination Place;
- destination Account/container;
- optional geographic location for physical assets.

### Advanced details
Optional explicit acquisition costs/fees may be entered behind an advanced section.

The user is **not** asked for:
- a free-text AssetKind;
- a manual normal market value when a supported quote exists;
- a user-facing `PerformanceRole`.

## 5. Cost Basis calculation

For a direct purchase:

```text
Source Economic Cost
= Amount Paid in source asset × source weighted-average cost in reporting currency

All-in Cost Basis
= Source Economic Cost + explicit additional acquisition costs

Effective Unit Cost
= All-in Cost Basis / Quantity Acquired
```

If the source is nominal SAR cash, `Amount Paid` and SAR source economic cost are equal.

Example:

```text
Paid            5,400 SAR
Received        10 g Gold
All-in Basis    5,400 SAR
Effective Cost    540 SAR/g
```

The user does not type 540 separately.

## 6. Market valuation is separate from acquisition cost

When a supported quote provider is available:

```text
Current Value = Quantity × Current Market Unit Price
Unrealized P/L = Current Value − Current Cost Basis
Unrealized Return % = Unrealized P/L / Current Cost Basis
```

The quote stores source and timestamp.

If no supported market quote is available at the moment of purchase, the system must not force the user to invent a market price. The prototype starts valuation temporarily from acquisition cost and marks it explicitly as `cost_fallback` until a real valuation is available.

Physical assets such as land/property/vehicle may require manual appraisal or a future specialized provider rather than a screen-traded market quote.

## 7. Public market-data adapters in prototype

Current prototype adapters are deliberately separated behind a Market Quote service.

- Crypto can use public Binance market-data endpoints for supported symbols.
- Gold/Silver can use a public real-time metal quote source and convert USD/troy-ounce to SAR/gram.
- A same-origin `/api/market/quote` provider contract is attempted first so a future backend can replace/augment direct browser providers without changing Domain/Application code.
- Stocks/Funds currently depend on that configured provider contract; if absent, purchase still succeeds with explicit cost-fallback valuation.

No secret API key should be embedded in the browser bundle.

## 8. Remove `PerformanceRole` from ordinary purchase UX

The prototype previously asked users to choose terms such as Investment / Store of Value / Bridge. This exposed internal policy and caused ambiguity.

Refinement:
- ordinary non-cash purchased assets default internally to investment-like measurement;
- cost is retained historically;
- current market/appraisal value is independent;
- unrealized P/L is shown while held;
- realization is driven by the economic event, not by a user-selected role label.

Internal policy fields may remain for specialized workflow semantics, but they should not be a mandatory normal purchase decision.

## 9. Realization policy

User-facing default:

### Asset held
Current market difference remains unrealized.

### Asset → Cash
The relevant cost basis is disposed and the net cash outcome creates realized P/L.

```text
Realized P/L = Net Cash Proceeds − Disposed Cost Basis
```

### Asset → another non-cash Asset within a continuing capital transformation
The prototype carries economic cost into the acquired Asset and does not create a fake cash-realized result.

```text
Target Cost Basis = Disposed Source Cost Basis + attributable fees
```

This is management-accounting cost continuity. Exact future rules for explicit sale-and-repurchase events, tax reporting, and chain boundaries remain Draft and must be scenario-tested.

## 10. Portable data snapshot

The user must be able to export the exact synthetic/test data they have entered and restore it after code updates.

Prototype format:

```text
myfinman-snapshot
version 1
schemaVersion 4
full FinanceState
exportedAt timestamp
```

Requirements:
- Export produces a human-readable JSON file.
- Import validates the snapshot format/schema before replacing current state.
- Import requires explicit replacement confirmation.
- Snapshot content is suitable for the user to attach to a future ChatGPT session so scenario-specific values can be reproduced exactly.

This snapshot is a prototype portability/diagnostic mechanism, not the final backup/sync architecture.

## 11. UX feedback invariant

Every meaningful write action should produce immediate visible feedback:
- success toast on successful creation/movement/purchase/spend/import/export;
- error toast on validation/action failure;
- state should update immediately in relevant explorer screens.

A successful action must not leave the user wondering whether the button worked.
