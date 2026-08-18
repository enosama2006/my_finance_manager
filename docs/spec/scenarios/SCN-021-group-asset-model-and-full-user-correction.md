# SCN-021 — Group -> Asset and Full User Correction

Status: **Approved structural baseline / Implemented in schema-v5 prototype / Refined by Draft ADR-005**
Date: 2026-08-18
Related: ADR-004, ADR-005

## Goal
Verify that the main wealth tree contains only Groups and quantity-bearing Assets, while user-entered data remains correctable without fake containers or silent balance corruption.

## Structural baseline

```text
Group
├── Group
├── Asset
└── Asset
```

- Group = only user hierarchy/container;
- Asset = concrete financial quantity/value;
- Asset never contains Asset;
- Account is legacy compatibility only, not mandatory target architecture.

## ADR-005 refinement — instrument identity != concrete Asset instance
A shared market/economic instrument may identify several concrete Assets.

Example:

```text
InstrumentDefinition = Gold / XAU

Asset A = Gold held at Al Rajhi
Asset B = Gold held by Brother
```

High-level Gold exposure is derived across A+B. It is not stored as a third quantity-bearing Asset.

This reconciles older `Asset master + Holdings` language with the current user-facing Asset term.

## Scenario A — bank-style Cash Asset

```text
البنوك
└── الراجحي الجاري   Asset cash / SAR
```

Asset carries native quantity, owner and optional institution/last4/account-style metadata.
No child SAR Holding and no mandatory Account are required.

## Scenario B — foreign currency
`حساب الدولار` is a Cash Asset with native USD quantity.
Reporting currency may be SAR without changing quantity/history.
Historical acquisition basis is actual known basis or unknown; current FX does not fabricate it.

## Scenario C — physical Gold directly in a Group

```text
المعادن
└── ذهب
```

No fake `حساب أصول الذهب` is manufactured.

If custody is important, explicit custodian/provider/location metadata belongs to the Asset. Group placement remains organizational and may mirror the custody context without becoming the custody truth itself.

## Scenario D — land and vehicle

```text
العقارات -> أرض حلب
المركبات -> سيارتي
```

Neither requires an Account/container.

## Scenario E — free reorganization
Rename/move an Asset between Groups.

Expected unchanged:
- Asset ID;
- quantity;
- ownership;
- exact Cost Basis lots;
- valuation;
- Portfolio purpose;
- Ledger.

If physical custody actually changes, record the real custody/transfer event separately rather than inferring it from Group drag/drop.

## Scenario F — opening correction
One active logical opening state per Asset + Owner context.
Duplicate prototype openings consolidate/void where safe.
Opening is state initialization, not income.

## Scenario G — repeated purchases
If user buys more of an existing chosen fund/metal/share:

```text
existing Asset quantity += new quantity
append exact CostBasisLot
append purchase LogicalTransaction
```

Do not create a new Asset merely because a second purchase occurred.

If the user intentionally wants a separate holding/context, create another Asset instance linked to the same InstrumentDefinition.

## Scenario H — exact basis
A 50,000 SAR purchase for fractional fund units must preserve exactly 50,000 SAR lot basis within approved monetary tolerance.
Display-rounded unit cost is derived and never becomes financial truth.

## Scenario I — investment distribution
A distributing Fund Asset may produce actual Cash:

```text
Fund Asset -- investment_distribution --> Cash Asset
```

Ordinary cash distribution:
- increases Cash Asset;
- keeps fund units unchanged;
- remains linked to source Fund/Instrument/Position for performance;
- is distinct from NAV/market P/L.

Accumulating fund creates no fake cash income when NAV rises.

## Scenario J — Portfolio purpose
Portfolio remains WHY and optional.

A real broker context can be represented by a Group such as `الاستثمارات -> الراجحي المالية`, while the Cash/Fund/Stock values inside it are Assets.

Portfolio may instead represent purposes such as:
- دخل دوري;
- نمو طويل الأجل;
- حفظ القوة الشرائية.

Portfolio can span several Groups/providers.

## Scenario K — user correction and delete
For supported user transactions:
1. edit entered truth;
2. reverse old projection;
3. replay corrected projection;
4. keep LogicalTransaction ID;
5. append revision;
6. preserve independent lots/transactions not affected by the correction.

Delete of financial history means reverse/void, never raw removal.

If downstream dependencies cannot be replayed safely, refuse rather than corrupt state.

## Scenario L — v4 migration
Historical:

```text
Group -> Account -> Holding
```

normalizes to:

```text
Group -> Asset
```

without changing quantity, ownership, Cost Basis or Ledger and without duplicating wealth.

## Core assertions
1. Group -> Asset, never Asset -> Asset.
2. Group has no independent financial truth.
3. Account is not mandatory target architecture.
4. InstrumentDefinition is reference identity only, not wealth.
5. one instrument may have several intentional Asset instances.
6. repeated purchase may add a lot to an existing Asset.
7. exact total lot basis is preserved; rounding is display-only.
8. Portfolio = WHY, not broker/account context.
9. investment cash distributions are linked source-to-cash events.
10. user correction is audited reverse/reprojection.
