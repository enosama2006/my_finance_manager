# SCN-022 — Real investment account, cash, funds, distributions and repeated purchases

Status: **Approved scenario facts from real user snapshot / Draft target refinement**
Date: 2026-08-18
Related: ADR-005, Issues #34 #36 #37 #38

## Purpose

Use the user's real exported MyFinMan snapshot to test whether the model can distinguish:

- a real broker/investment-account context;
- cash available inside that context;
- investment Assets purchased with that cash;
- Portfolio purpose;
- repeated purchases / DCA;
- distributing versus accumulating funds;
- exact Cost Basis;
- current market/NAV value;
- cash income versus market P/L.

## Real facts captured from snapshot

The user created a Group path approximately:

```text
الاستثمارات
└── الراجحي كابتل
```

Inside it the snapshot contains:

```text
Cash Asset named `Portfolio 1`
Opening quantity = 150,000 SAR
Current quantity = 50,000 SAR
Institution metadata = الراجحي الماليه

USD Cash Asset
Quantity = 6,645 USD

Fund Asset A
Name = صندوق الراجحي للتوزيعات الشهرية 2
Quantity = 5,048.055 units
Purchase transaction = 50,000 SAR

Fund Asset B
Name = الشركات المتوسطة والصغيرة
Quantity = 4,047.325 units
Purchase transaction = 50,000 SAR
```

The user also has a real Portfolio entity named `محفظة شخصية`, but it has no current PortfolioSlices and the two fund purchases were not allocated to it.

Therefore `Portfolio 1` is not a Portfolio in domain meaning; it is a cash Asset with a misleading name.

## Correct interpretation

```text
الاستثمارات                       Group
└── الراجحي المالية                Group/context
    ├── سيولة الراجحي - SAR        Asset cash = 50,000 SAR
    ├── سيولة الراجحي - USD        Asset cash = 6,645 USD
    ├── صندوق التوزيعات الشهرية 2  Asset fund
    └── صندوق الشركات المتوسطة والصغيرة Asset fund
```

The Group has no independent balance. Its value is the derived roll-up of the Assets.

`Portfolio` remains an optional WHY lens, for example:

```text
Portfolio: دخل دوري
Portfolio: نمو طويل الأجل
```

It is not required merely because the user has an investment account at Al Rajhi Capital.

## Scenario A — 150,000 SAR enters the broker context

Two historically valid onboarding cases exist.

### Case A1 — MyFinMan starts after the money already exists there

Record:

```text
Opening State on `سيولة الراجحي - SAR` = 150,000 SAR
```

No source-bank movement is fabricated.

### Case A2 — MyFinMan was already tracking the source bank before the transfer

Record a real transfer:

```text
Source Bank SAR Asset -150,000
Al Rajhi Capital SAR Cash Asset +150,000
```

This is not Expense, Income, Portfolio funding or Investment P/L.

## Scenario B — purchase two funds

Starting cash:

```text
150,000 SAR
```

Purchase A:

```text
-50,000 Cash
+5,048.055 units Fund A
Exact Lot Cost Basis = 50,000 SAR
```

Purchase B:

```text
-50,000 Cash
+4,047.325 units Fund B
Exact Lot Cost Basis = 50,000 SAR
```

Result:

```text
Cash remaining = 50,000 SAR
Fund A basis = 50,000 SAR
Fund B basis = 50,000 SAR
Total capital at cost = 150,000 SAR
```

The user did not spend 100,000 SAR; the account changed composition from cash into fund units.

## Scenario C — repeated purchase into Fund A

Suppose later the user pays another 10,000 SAR and receives Q2 units of the same Fund A.

Target behavior:

```text
Fund A Asset remains the same Asset ID
Quantity = 5,048.055 + Q2
Lot 1 basis = 50,000
Lot 2 basis = 10,000
Total basis = 60,000
Weighted average cost = 60,000 / total units
```

Both purchases remain separate LogicalTransactions.

A second Asset is created only if the user intentionally wants a separate holding/context, not because a new purchase occurred.

## Scenario D — same instrument in another holding context

If the same fund or Gold exists in another intentional holding context, keep a separate Asset instance.

Example Gold:

```text
InstrumentDefinition = Gold/XAU
Asset A = Gold held at Al Rajhi
Asset B = Gold held by Brother
```

High-level exposure may aggregate both, but transactions target the specific Asset instance.

## Scenario E — monthly cash distribution from Fund A

Suppose Fund A pays 500 SAR cash into the broker cash balance.

Target event:

```text
Fund A -- investment_distribution 500 --> SAR Cash Asset
```

Result:

```text
Fund A units unchanged
SAR Cash +500
Cash Income from Fund A +500
```

The distribution must be linked to Fund A/Position/Instrument for performance reporting.

It is not a purchase and not a generic salary/income stream disconnected from the source investment.

## Scenario F — Fund B does not distribute cash

If Fund B is accumulating/growth-oriented and no cash actually arrives:

```text
Cash Income = 0
```

Any current gain/loss is reflected through NAV/market valuation.

Do not invent cash income from a price increase.

## Scenario G — total return for distributing fund

Example:

```text
Net acquisition basis = 50,000
Current market value   = 49,200
Cash distributions     =  2,000
```

Views:

```text
Market P/L = -800
Cash Income = +2,000
Total Return = +1,200
```

The product must not report only `-800` and hide the 2,000 received.

## Scenario H — Portfolio purpose is optional

The user may leave both funds unallocated to a Portfolio and still have fully valid financial truth.

If desired later:

```text
Fund A -> Portfolio `دخل دوري`
Fund B -> Portfolio `نمو طويل الأجل`
```

This changes WHY only. It does not move Assets between Groups and does not create cash movement.

## Scenario I — data correction

Rename `Portfolio 1` to `سيولة الراجحي المالية - SAR`.

Expected:
- same Asset ID;
- same 50,000 quantity;
- same Ledger;
- same Cost Basis;
- no transaction.

If the original 150,000 should historically have been a transfer rather than opening state, that is a financial-history correction requiring audited reprojection, not a rename.

## Scenario J — exact basis regression discovered

The current snapshot stores 5,048.055 units from a 50,000 SAR purchase with rounded unit cost `9.90`, which reconstructs only 49,975.7445 SAR basis.

The target must preserve:

```text
quantity = 5,048.055
exact total lot basis = 50,000
unit cost = derived high-precision/display value
```

Likewise the second 50,000 SAR purchase must preserve exactly 50,000 SAR basis.

## Scenario K — foreign currency opening

The snapshot has 6,645 USD with current/reference value 3.75 SAR/USD but historical lot basis stored as 1 SAR/USD.

Target behavior:
- native quantity = 6,645 USD;
- current valuation may use 3.75 SAR/USD;
- historical acquisition basis is actual user-provided basis/rate if known;
- otherwise basis = unknown;
- never invent 1 SAR/USD merely because quantity is 6,645.

## Acceptance

1. Broker/account context is not Portfolio.
2. Cash inside broker is a Cash Asset.
3. Funds are independent Assets.
4. 150k -> two 50k purchases leaves 50k cash without creating an expense.
5. Repeated purchase adds a lot to the same chosen Asset.
6. Separate custody/context can remain separate Asset instances of the same instrument.
7. Distributing fund creates cash-distribution events linked to the fund.
8. Accumulating fund creates no fake cash income.
9. Market P/L, Cash Income and Total Return are separate.
10. Portfolio remains optional WHY.
11. Exact lot basis is lossless.
12. FX opening basis may be unknown but is never fabricated.
