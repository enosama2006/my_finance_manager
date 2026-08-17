# SCN-002 — Income-Producing Assets, Portfolio Funding, and Asset-Level Profitability

Status: **Approved scenario facts / Draft architectural refinements**

## Purpose

Use a concrete mixed-wealth scenario to test whether MyFinMan can operate as a personal / micro-business financial manager rather than an expense tracker.

This scenario tests:

- opening existing assets without fabricating historical cash movements;
- acquiring a new asset after MyFinMan is already in use;
- a Portfolio economically funded by cash distributed across several bank accounts;
- paying from one physical bank account even when Portfolio coverage is distributed elsewhere;
- rebalancing Portfolio coverage without creating a fake bank transfer;
- separating acquisition cost from current market value;
- distinguishing operating income from asset valuation gains/losses;
- measuring profitability of cars, rental property and agricultural land;
- rolling asset-level economics into an investment Portfolio and then total wealth.

---

# 1. Opening wealth scenario

The user owns SAR 1,000,000 cash distributed equally across five banks:

```text
Cash / SAR total = 1,000,000
├─ Al Rajhi      = 200,000
├─ Alinma        = 200,000
├─ Bank AlJazira = 200,000
├─ SNB           = 200,000
└─ Riyad Bank    = 200,000
```

Each bank is an `Account/Container`.
Each SAR balance is a Cash Holding inside that Account.
The user is the economic Owner.

The user also owns:

- land / real estate;
- 1 kg Gold;
- 1 kg Silver;
- two vehicles used or intended for rental activity.

Precious metals are distributed as follows:

```text
Gold total = 1,000 g
├─ Al Rajhi custody = 700 g
└─ Brother custody  = 300 g

Silver total = 1,000 g
├─ Al Rajhi custody = 700 g
└─ Brother custody  = 300 g
```

This reuses SCN-001 rules: location/custody creates Holdings, not duplicate Gold/Silver Assets.

---

# 2. Existing asset versus new acquisition

This scenario requires two materially different onboarding paths.

## 2.1 Existing asset owned before MyFinMan

Example: a vehicle was purchased before the user began using MyFinMan.

The user enters:

- asset identity/type;
- ownership;
- historical acquisition date if known;
- historical acquisition cost if known;
- current market value / valuation date;
- current location/custody;
- Portfolio assignment if desired;
- optional current income activity / rental status.

The system creates an **Opening Position**, not a new current purchase.

It must **not** reduce any current bank balance merely because the user entered historical acquisition cost.

Historical cost is retained for performance and future disposal calculations; it is not a present cash-flow event.

## 2.2 New asset purchased after MyFinMan is active

Example: user buys another vehicle for investment/rental.

This is a real acquisition event.

The system must represent both sides:

```text
Cash Holding ↓
Vehicle Asset ↑
```

The acquisition is primarily an asset-to-asset capital transaction, not an ordinary consumption Expense.

Any immediately consumed service/fee that should not form part of acquisition cost may be separately classified as Expense according to later approved accounting policy.

---

# 3. Investment Portfolio funded across five bank accounts

The user creates an Investment Portfolio and allocates SAR 500,000 to it.

User example:

```text
Investment Portfolio — cash allocation = 500,000 SAR
├─ Al Rajhi      = 100,000
├─ Alinma        = 100,000
├─ Bank AlJazira = 100,000
├─ SNB           = 100,000
└─ Riyad Bank    = 100,000
```

This example must be interpreted carefully because SCN-001 already identified a distinction between:

1. economic Portfolio allocation; and
2. optional physical/account-specific reservation.

## Economic view

Economically the Portfolio has:

```text
Owner = User
Asset = SAR Cash
Allocated quantity = 500,000 SAR
```

## Optional source-location view

The user may additionally want to see that the 500,000 is currently backed/reserved by 100,000 from each bank.

This is closer to a `PhysicalReservation/FundingMap` than the fundamental meaning of the Portfolio.

Status: **Draft refinement consistent with DEC-019**.

---

# 4. New vehicle purchase from one bank when Portfolio coverage is distributed

The user chooses:

```text
Portfolio = Investment Portfolio
Actual payment account = Al Rajhi
Actual amount paid from Al Rajhi = 150,000 SAR
```

But only 100,000 SAR of the Portfolio's optional account-specific funding map is currently associated with Al Rajhi.

The user then chooses Alinma as the account from which 50,000 SAR of Portfolio coverage should be released/rebalanced.

## 4.1 Real-world cash movement

Only the actual bank movement occurs:

```text
Al Rajhi Cash Holding: -150,000 SAR
Alinma Cash Holding:    no real movement
```

There must be **no fake Alinma → Al Rajhi transfer**.

## 4.2 Purpose/funding rebalance

If account-specific Portfolio reservations are enabled, the system may atomically interpret the purchase as:

```text
Consume 100,000 investment reservation from Al Rajhi
Use additional 50,000 Al Rajhi cash for the investment purchase
Release/reduce 50,000 investment reservation from Alinma
Create/assign the purchased Vehicle to the Investment Portfolio
```

The purpose map changes; bank reality does not pretend Alinma moved cash.

## 4.3 Portfolio composition after purchase

If the actual vehicle acquisition cost is exactly 150,000 and there are no other capitalized acquisition costs:

```text
Before:
Investment Portfolio
└─ Cash = 500,000

After at cost:
Investment Portfolio
├─ Remaining Cash = 350,000
└─ Vehicle Cost Basis = 150,000

Total Portfolio capital at cost = 500,000
```

Therefore the Portfolio did **not lose 150,000** merely because cash fell by 150,000.
It changed composition from Cash to Vehicle.

The UI must distinguish:

- Portfolio Cash Available;
- Portfolio Cost Basis / Invested Capital;
- Portfolio Current Market Value;
- Portfolio Income and Expenses;
- Portfolio performance.

---

# 5. Important validation discovered: payment amount must reconcile to acquisition cost

The user's example intentionally/implicitly mentions:

- 150,000 SAR cash paid; and
- 160,000 SAR vehicle cost basis; and
- 150,000 SAR current market value.

These are allowed to differ only if the difference is explained.

The system must not silently accept:

```text
Cash paid = 150,000
Cost basis = 160,000
```

without additional economic legs.

Valid example:

```text
Vehicle purchase price          = 150,000
Capitalizable acquisition costs = 10,000
Total cost basis                = 160,000
```

Then the additional 10,000 must also be funded by:

- cash from an Account;
- a Liability/payable;
- another form of consideration;
- or another explicitly recorded source.

If total cash paid is 160,000 and current market value is 150,000:

```text
Cost basis         = 160,000
Current value      = 150,000
Unrealized change  = -10,000
```

The -10,000 is **not rental operating loss** and not realized disposal loss.
It is a valuation difference / unrealized capital result under the product's performance view.

---

# 6. Income-producing asset concept

A vehicle used for rental exposes a domain dimension that is different from Asset, Portfolio and Category.

Proposed target concept:

```text
EconomicActivity / Venture
```

Examples:

- Vehicle Rental — Car A;
- Vehicle Rental — Fleet;
- Apartment Rental;
- Agricultural Land Operation.

Status: **Draft architecture proposal**.

Why this is needed:

- Asset answers: what capital/property is owned?
- Portfolio answers: why is capital allocated?
- Account answers: where is money/value held?
- Category answers: what kind of income/expense is this?
- Activity answers: which economic operation generated this revenue/cost?

This allows the same transaction to carry multiple independent dimensions.

Example rent receipt:

```text
Transaction kind = Income
Income category = Vehicle Rental Revenue
Activity = Car A Rental
Source asset = Car A
Portfolio attribution = Investment Portfolio
Cash destination = Al Rajhi Account
Counterparty = renter/customer (optional)
```

No single generic Category should be forced to carry all of these meanings.

---

# 7. Rental income: what is it?

Rental receipts are actual Income/Revenue generated by operating the asset.

They are **not**:

- an increase in the Vehicle cost basis;
- an unrealized valuation gain;
- a realized capital gain from selling the Vehicle;
- merely a Portfolio reallocation.

Example:

```text
Monthly vehicle rent received = 4,000 SAR
```

Effects:

```text
Cash Holding +4,000
Income/Revenue +4,000
Activity: Car A Rental +4,000 revenue
```

If the user chooses to allocate the received cash back into the Investment Portfolio, that is a separate purpose/allocation effect.

The product should preserve the distinction between:

1. **cash receipt**;
2. **income recognition / activity revenue**;
3. **Portfolio destination/purpose**.

---

# 8. Expenses attributable to an income-producing asset

Examples for a rental vehicle:

- maintenance;
- repairs;
- insurance;
- registration/licensing;
- cleaning;
- rental-platform commission;
- parking/storage;
- financing cost if applicable;
- other directly attributable operating costs.

Each actual payment is an Expense/cash-flow event and can additionally be linked to:

- the Vehicle;
- the Rental Activity;
- the Portfolio;
- an Expense Category.

This allows profitability to be calculated without inventing a separate parallel ledger.

---

# 9. Asset-level performance must have separate layers

The product should not show one ambiguous number called "profit".

For an income-producing asset, at least the following layers are required.

## 9.1 Operating Revenue

```text
Rental/operating income generated by the asset/activity
```

## 9.2 Cash Operating Expenses

```text
Actual cash costs attributable to operating the asset
```

## 9.3 Net Operating Cash Flow

Proposed calculation:

```text
Operating Revenue - Cash Operating Expenses
```

This answers: how much cash did the asset/activity generate before financing, tax and non-cash accounting adjustments, subject to later exact policy.

## 9.4 Depreciation / economic wear

For depreciating productive assets such as vehicles, a separate non-cash depreciation/economic-wear layer should be supported if the user/business mode enables it.

Exact depreciation policy and tax treatment are `TBD`.

This should not be confused with manual market valuation change.

## 9.5 Operating Profit

Possible benchmark view:

```text
Operating Revenue
- attributable operating expenses
- depreciation / impairment if enabled
= Operating Profit
```

Exact accounting mode remains configurable/TBD for personal users versus micro-business users.

## 9.6 Unrealized Capital Result

```text
Current Market Value - relevant carrying/cost benchmark
```

This is separate from rental operating performance.

## 9.7 Realized Disposal Gain/Loss

Created only when the asset is sold/disposed according to the approved cost-basis/disposal rules.

## 9.8 Lifecycle / Total Economic Return

The product should eventually be able to show the total economic outcome of owning the asset, combining appropriately:

- operating income;
- operating expenses;
- acquisition cost;
- disposal proceeds or current value;
- fees;
- other relevant cash flows.

Exact annualized/money-weighted/time-weighted methodology remains `TBD` under BMK-005.

---

# 10. Existing rental vehicle example

Vehicle existed before MyFinMan.

Example onboarding:

```text
Historical cost = 150,000 SAR
Current market value = 110,000 SAR
Acquisition date = historical date
Current owner = User
Activity = Vehicle Rental
Portfolio = Investment Portfolio (optional/user-selected)
```

Opening this asset does not reduce a current bank balance.

After onboarding, future rent/expenses are normal posted transactions linked to the asset/activity.

The system can then show performance from:

- known historical acquisition data if entered; and/or
- MyFinMan tracking start date.

The UI must disclose which measurement period is being shown.

---

# 11. Apartment rental example

The user already owns an apartment purchased before MyFinMan.

Example:

```text
Historical acquisition cost = 200,000 SAR
Current market value = 270,000 SAR
```

Opening effects:

- create Real Estate Asset/Holding/ownership;
- retain acquisition cost/history;
- record current valuation separately;
- no current bank reduction.

Illustrative current valuation difference:

```text
270,000 - 200,000 = +70,000
```

This is a capital/valuation result, not rental revenue.

Rent received monthly or annually is separately posted as:

```text
Income category = Property Rental Revenue
Activity = Apartment Rental
Source asset = Apartment
Cash destination = actual receiving Account
```

Expenses such as maintenance, management fees, insurance and other attributable costs can be linked to the same Activity/Asset.

The product can therefore show separately:

```text
Apartment current value
Apartment unrealized capital change
Gross rental income
Operating expenses
Net rental cash flow
Operating profit (if accounting mode enabled)
Total/lifecycle return
```

---

# 12. Agricultural land example

The user owns agricultural land:

```text
Historical cost = 70,000 SAR
Annual/seasonal proceeds = 10,000 SAR
```

The Land remains a Real Estate/Land Asset.

The seasonal 10,000 is not an increase in land cost basis merely because the land generated it.
It is revenue of an agricultural economic activity linked to the Land.

Simple personal/micro-business mode can represent:

```text
Activity = Agricultural Land Operation
Season Revenue = 10,000
- seeds / labour / irrigation / transport / maintenance / other direct costs
= Net Seasonal Operating Result
```

Advanced agriculture accounting may later need separate biological assets, produce/inventory and harvest accounting.
That complexity is explicitly **TBD** and must not be forced into the simple product by default.

---

# 13. Benchmark alignment from established accounting practice

This scenario is consistent with useful concepts found in established accounting standards, while MyFinMan remains a management product rather than a statutory accounting package.

## Tangible assets held for rental

IAS 16 Property, Plant and Equipment includes tangible items held for rental to others and used over more than one period, and addresses cost, depreciation and impairment concepts.

Product benchmark implication:

- rental vehicles need an asset register / acquisition cost;
- depreciation/economic wear must be supportable;
- rental operating performance should not replace asset carrying/value information.

Official reference:
https://www.ifrs.org/issued-standards/list-of-standards/ias-16-property-plant-and-equipment/

## Property held to earn rentals / appreciation

IAS 40 treats land/buildings held to earn rentals and/or capital appreciation as investment property, distinguishes initial cost and subsequent cost/fair-value approaches, and separates disposal results.

Product benchmark implication:

- apartment/land value, rental income and disposal gain are different dimensions;
- MyFinMan should support cost and current valuation concurrently even if it does not force statutory IFRS presentation.

Official reference:
https://www.ifrs.org/issued-standards/list-of-standards/ias-40-investment-property/

## Agriculture

IAS 41 distinguishes agricultural activity/biological assets from the underlying land and treats agricultural produce at harvest separately; bearer plants are handled under IAS 16.

Product benchmark implication:

- land should not be conflated with the seasonal operating activity it enables;
- an advanced mode may later model biological/produce layers without changing the basic Land ownership model.

Official reference:
https://www.ifrs.org/issued-standards/list-of-standards/ias-41-agriculture/

## SME benchmark

The IFRS for SMEs Accounting Standard is deliberately simplified for entities without public accountability and focuses on decision-useful financial information. The third edition was issued in February 2025 and is effective for periods beginning on or after 1 January 2027, with early application permitted.

Product benchmark implication:

MyFinMan should borrow useful financial-management concepts from SME accounting while presenting them in much simpler owner-oriented language.

Official reference:
https://www.ifrs.org/issued-standards/ifrs-for-smes/

---

# 14. Proposed new domain concepts — Draft

The scenario suggests the following target concepts for evaluation.

## EconomicActivity / Venture

Represents a revenue/cost generating operation.

Examples:

- Car Rental;
- Apartment Rental;
- Agriculture;
- future small internal commercial activity.

Potential fields:

- stable ID;
- name;
- activity type;
- owner(s);
- status;
- start/end dates;
- linked Assets;
- linked Portfolios;
- reporting preferences.

## ActivityAssetLink

Allows:

```text
one Activity -> many Assets
one Asset -> possibly multiple Activities over time
```

Example: a future fleet-rental Activity can contain several vehicles.

## Revenue/Expense attribution

Transactions should be able to link independently to:

- Category;
- Activity;
- Asset;
- Portfolio;
- Counterparty;
- Account/payment source or destination.

This is a dimensional model over the same financial event, not duplicate transactions.

## Income schedule / contract

A recurring rent schedule can reuse/extend `IncomeStream` for expected receipts while actual Income Transactions remain separate.

---

# 15. UI implications

## Asset detail — income-producing asset

An income-producing Vehicle/Apartment/Land screen should eventually contain tabs/sections such as:

```text
Overview
├─ Cost Basis
├─ Current Value
├─ Ownership / Location
└─ Portfolio attribution

Income
├─ Expected rent/season
├─ Received
└─ Outstanding/missed

Expenses
├─ Maintenance
├─ Insurance
├─ Fees
└─ Other attributable costs

Performance
├─ Gross Revenue
├─ Net Operating Cash Flow
├─ Operating Profit (if enabled)
├─ Unrealized Capital Result
├─ Realized Disposal P/L
└─ Lifecycle Return

Activity / History
└─ all linked transactions and valuations
```

## Portfolio detail

Investment Portfolio must show composition, not just remaining cash:

```text
Investment Portfolio
├─ Cash available
├─ Vehicles
├─ Property
├─ Metals / Funds / other investments
├─ Total Cost Basis
├─ Current Market Value
├─ Income
├─ Expenses
└─ Performance
```

---

# 16. Required scenario tests

## TEST-INCOME-ASSET-001 — Existing vehicle opening does not reduce cash
Adding a pre-existing vehicle with historical cost must not create a current bank outflow.

## TEST-INCOME-ASSET-002 — New vehicle purchase changes composition, not consumption
A 150,000 SAR investment purchase converts Portfolio cash into a Vehicle Asset; it is not an ordinary 150,000 consumption expense.

## TEST-INCOME-ASSET-003 — Account-specific funding rebalance creates no fake transfer
Pay 150,000 from Al Rajhi while only 100,000 is account-reserved for the Portfolio; releasing/rebalancing 50,000 from Alinma must not change Alinma's real bank balance.

## TEST-INCOME-ASSET-004 — Portfolio value includes purchased asset
After purchasing a 150,000 vehicle from a 500,000 cash Portfolio, remaining cash may be 350,000 but Portfolio invested capital at cost remains 500,000 absent fees/losses.

## TEST-INCOME-ASSET-005 — Acquisition cost must reconcile
If cost basis is 160,000 but only 150,000 cash consideration is recorded, posting is blocked until the additional 10,000 is explained by fees, liability or another consideration leg.

## TEST-INCOME-ASSET-006 — Market value loss is not rental loss
Vehicle cost 160,000 and market value 150,000 creates a -10,000 valuation/unrealized result, not negative rental revenue.

## TEST-INCOME-ASSET-007 — Rent increases cash and activity revenue
A rent receipt increases the destination Cash Holding and the Vehicle Rental Activity revenue once, without increasing Vehicle cost basis.

## TEST-INCOME-ASSET-008 — Vehicle maintenance is attributable operating expense
Maintenance paid from a bank account reduces Cash and contributes to Vehicle/Activity operating expenses without reducing acquisition cost directly.

## TEST-INCOME-ASSET-009 — Existing apartment keeps cost and current value separately
Opening apartment cost 200,000/current value 270,000 creates no current bank movement and keeps the +70,000 valuation difference separate from rent income.

## TEST-INCOME-ASSET-010 — Agricultural season is activity revenue, not land appreciation
10,000 seasonal proceeds are attributed to Agricultural Activity; Land cost basis does not increase merely because it generated revenue.

## TEST-INCOME-ASSET-011 — Portfolio roll-up combines different income-producing assets
Portfolio reporting can aggregate vehicle rental, apartment rental and agricultural activity while retaining per-asset attribution.

## TEST-INCOME-ASSET-012 — Category does not replace Activity or Asset
The same rent Income Transaction can simultaneously reference `Rental Revenue` category, Car A Asset, Car Rental Activity, Investment Portfolio and receiving Account without duplicate ledger events.

---

# 17. Current architectural conclusion

This scenario strongly suggests MyFinMan needs to represent four independent economic views around an income-producing investment:

```text
Capital / Wealth
Asset + Cost Basis + Current Value

Purpose
Portfolio

Operation
EconomicActivity / Venture

Cash Flow
Income + Expense + Account movement
```

For income-producing assets, "profit" must therefore be decomposed rather than represented by one overloaded field:

```text
Operating result
Capital valuation result
Realized disposal result
Total/lifecycle economic return
```

This architecture is the bridge between a personal wealth manager and a lightweight micro-business financial manager.
