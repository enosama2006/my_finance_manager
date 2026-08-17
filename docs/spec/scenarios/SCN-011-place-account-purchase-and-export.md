# SCN-011 — Place-First Custody, Simple Asset Purchase, Market Valuation and Portable Snapshot

Status: **Draft Scenario / Implemented Prototype pressure test**

## Scenario intent

Pressure-test the full onboarding path using user-understandable data rather than preset demo values.

The user wants to start from an empty product and create:

1. a Place named `مصرف الراجحي`;
2. multiple Accounts under the same bank;
3. balances under those Accounts;
4. a Gold purchase using a simple amount-paid / quantity-received workflow;
5. a current market valuation that is independent from cost;
6. an unrealized result while Gold remains held;
7. realization only when Gold is liquidated to Cash;
8. a portable JSON snapshot that can be attached later to reproduce the exact synthetic dataset.

## Step A — Create the Place

Create:

```text
Place: مصرف الراجحي
Type: Bank
```

Expected:
- immediate success feedback;
- no Holding/value is created;
- the bank becomes an available parent for Account creation.

## Step B — Create multiple Accounts under the same bank

Create:

```text
مصرف الراجحي
  → جاري شخصي (checking, SAR)
  → حساب استثماري (investment)
  → بطاقة سفر / بطاقة ائتمان as applicable
```

Expected:
- each Account visibly belongs to the bank;
- zero-balance Accounts remain visible;
- opening the bank in Assets & Accounts shows all Accounts beneath it;
- the bank itself is not counted as wealth.

## Step C — Add opening Cash

Add:

```text
Place: مصرف الراجحي
Account: جاري شخصي
Asset: SAR Cash
Opening quantity: 20,000 SAR
```

Expected:
- account value becomes 20,000 SAR;
- transaction classification is Opening, not Income;
- Cash Holding is nested under the Account.

## Step D — Buy Gold using natural inputs

Assume:

```text
Paid from: مصرف الراجحي → جاري شخصي → SAR
Amount paid: 5,400 SAR
Asset type: Gold
Quantity received: 10 g
Stored at: selected destination Place → Account/Container
```

The user does **not** enter:
- `AssetKind=metal` manually;
- a per-unit cost of 540;
- an arbitrary normal market price;
- a PerformanceRole.

Expected deterministic cost:

```text
Cost Basis = 5,400 SAR
Effective Unit Cost = 5,400 / 10 = 540 SAR/g
```

If a market quote returns, for example, 530 SAR/g:

```text
Current Value = 10 × 530 = 5,300 SAR
Unrealized P/L = 5,300 − 5,400 = -100 SAR
Unrealized Return = -100 / 5,400 ≈ -1.8519%
```

The -100 is visible but not realized.

If no quote returns, purchase still succeeds:
- Cost Basis remains 5,400;
- current valuation temporarily uses the acquisition-cost fallback;
- source/timestamp/method explain that a market quote has not yet replaced it.

## Step E — Market refresh

For supported instruments the user can request `تحديث السعر`.

Expected:
- only valuation changes;
- quantity and cost lots do not change;
- unrealized P/L changes;
- no Ledger cash flow or realized P/L is created.

## Step F — Transform Gold into another Asset

Example:

```text
10g Gold → XRP
Attributable fee = 50 SAR
Disposed Gold Cost Basis = 5,400 SAR
```

If this is an Asset-to-Asset continuing capital transformation, the prototype policy is:

```text
Realized P/L = none
XRP Cost Basis = 5,400 + 50 = 5,450 SAR
```

The physical conversion is recorded, but no fake cash-realized profit is created merely because Gold had a current market quote above/below its cost.

This policy is management-accounting oriented and remains Draft for future explicit sale/repurchase/tax-lot edge cases.

## Step G — Liquidate Gold directly to Cash

Alternative path:

```text
Gold historical Cost Basis = 5,400 SAR
Net SAR received = 5,500 SAR
```

Expected:

```text
Realized P/L = +100 SAR
```

At this point the result becomes realized because the economic position has exited to Cash.

If only part of the Holding is sold, only the disposed weighted-average cost basis should participate in the realized result. Partial disposal remains an area for deeper UX/acceptance coverage.

## Step H — Export exact user test data

User selects `Export Data`.

Expected:
- a versioned `myfinman-YYYY-MM-DD.json` snapshot downloads;
- the file contains the full synthetic FinanceState and metadata;
- the user can attach it after future changes so the same understood numbers are restored rather than replacing them with developer demo data.

Import:
- requires confirmation because it replaces current local state;
- validates snapshot version/schema;
- restores Places, Accounts, Holdings, Portfolios, categories, Ledger, Positions and Cycles together.

## Invariant pressure tests

1. Place ≠ Account ≠ Asset.
2. One Place may own/display many Account containers.
3. Land/Stock/Fund remain Assets even if the user speaks colloquially about “where my money is”.
4. Every Holding must have an Account/container in the current prototype model.
5. Purchase cost is derived from actual economic funding, not typed again as unit cost.
6. Market valuation never overwrites historical cost.
7. Unrealized P/L cannot become realized merely because a quote changed.
8. Cash exit may realize P/L.
9. Asset-to-Asset capital transformation may continue Cost Basis without cash realization.
10. Export/import must preserve financial truth exactly enough for scenario reproduction.

## UX acceptance

- Successful Place creation shows an immediate success toast.
- Successful Account creation shows an immediate success toast.
- Purchase form is Place-first and Account-second on both source and destination.
- Asset type is selected from the catalog.
- Additional costs are advanced/optional, not a primary required field.
- Current market price is system-provided when available; missing provider is explicit, not silently invented.
- No ordinary purchase field asks the user to choose `PerformanceRole`.
- Assets screen defaults to Place → Account → Holding.
- Holdings show cost, current value, absolute unrealized P/L and unrealized return %.
- Data Export and Import are visible product actions.
