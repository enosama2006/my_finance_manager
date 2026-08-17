# MyFinMan — Draft Domain Extension: Income-Producing Assets and Activity Profitability

Status: **Draft — derived from SCN-002; not yet a replacement for approved core Domain**

## Why this extension exists

SCN-002 shows that an owner may hold capital Assets that also participate in revenue-generating operations. The target model must keep several meanings independent:

```text
Asset        = what capital/property is owned
Portfolio    = why capital is allocated
Account      = where money/value is held
Activity     = what operation generates revenue/cost
Category     = what kind of income/expense occurred
Transaction  = what actually happened
```

A Coding Agent must not collapse these into one generic Category or Portfolio tree.

---

## ENT-130 — EconomicActivity / Venture

Status: `Draft`

Represents a revenue/cost-generating operation managed by the owner.

Examples:

- Car A Rental;
- Rental Fleet;
- Apartment Rental;
- Agricultural Land Operation;
- future small commercial activity.

Potential fields:

- `activity_id` stable ID;
- owner/entity scope;
- name;
- activity type;
- status active/paused/closed;
- start/end dates;
- reporting currency/preferences;
- optional parent Activity for roll-up;
- optional Portfolio associations.

EconomicActivity is **not** an Asset and does not itself add wealth.
It is a reporting/operating dimension over real Assets and Transactions.

---

## ENT-131 — ActivityAssetLink

Status: `Draft`

Connects Assets/Holdings/identified asset units to an EconomicActivity.

Supports:

```text
one Activity -> many Assets
one Asset -> one or more Activities over time when economically valid
```

Examples:

```text
Car Rental Fleet
├─ Car A
└─ Car B
```

```text
Apartment Rental Activity -> Apartment Asset
Agricultural Activity -> Land Asset
```

The link must be date-aware if an Asset changes use over time.

---

## ENT-132 — PortfolioFundingReservation / FundingMap

Status: `Draft; optional physical-source layer`

SCN-002 shows that a user may want a Portfolio economically allocated 500,000 SAR while also saying:

```text
100,000 is currently reserved from each of five bank Holdings
```

This account/Holding-specific mapping should not necessarily define the fundamental economic Portfolio allocation.

Candidate semantics:

```text
Economic Portfolio Allocation
Owner + Asset + Portfolio + Quantity

Optional Funding Reservation
Portfolio Allocation + specific Holding/Account + reserved quantity
```

This is conceptually aligned with DEC-019/SCN-001, where ordinary Portfolio purpose may be custody-independent.

The optional FundingMap answers:

> Which physical/account balances currently back this Portfolio allocation?

It does not answer:

> What is the Portfolio's economic purpose/value?

---

## ENT-133 — CoverageRebalance

Status: `Draft application/domain event concept`

When an actual payment is made from a Holding whose physical Portfolio reservation is insufficient, MyFinMan may rebalance the optional funding map without fabricating bank movement.

Example:

```text
Investment Portfolio reservations:
Al Rajhi 100k
Alinma 100k
...

Actual purchase payment:
Al Rajhi -150k
```

User selects Alinma to release/rebalance 50k.

Economic interpretation:

```text
consume 100k reserved Al Rajhi coverage
consume additional 50k real Al Rajhi Cash for Portfolio purchase
release 50k physical reservation from Alinma
assign new Vehicle Asset to Portfolio
```

Real bank interpretation:

```text
Al Rajhi changes -150k
Alinma changes 0
```

Therefore CoverageRebalance must never create a fake `Alinma -> Al Rajhi` transfer.

Whether this is persisted as a first-class entity, transaction metadata/event or calculated change set is `TBD`.

---

## ENT-134 — Asset Use / Income-Producing Profile

Status: `Draft`

An Asset may have a current use such as:

- personal/non-income-producing;
- rental;
- agricultural/productive;
- mixed;
- idle;
- held for appreciation;
- other.

Do not encode current use as Asset Class.

Example:

A Vehicle remains a Vehicle whether personally used or rented.
A Property remains Real Estate whether owner-occupied or rented.

Use may affect which performance panels and Activity links are relevant.

---

# Opening versus acquisition

## Existing Asset Opening Position

For an Asset owned before MyFinMan tracking begins:

```text
Historical cost/history -> stored as opening/history data
Current value -> valuation data
Current ownership/custody -> current state
Current cash Accounts -> unchanged
```

No fake current purchase is generated.

## New Asset Acquisition

For an acquisition after tracking begins:

```text
Cash/consideration decreases
New Asset/Holding increases
Cost basis is created
Portfolio composition changes if Portfolio-funded
```

A durable capital acquisition should not be treated as ordinary consumption Expense merely because Cash decreased.

---

# Acquisition reconciliation invariant

Posting a new Asset acquisition requires:

```text
Total recognized acquisition cost
=
Σ capital consideration/funding legs that form cost basis
```

If:

```text
cash paid = 150k
cost basis = 160k
```

then 10k must be explicitly explained by another economic leg, such as capitalizable fees or a Liability.

MyFinMan must not fabricate or silently absorb the difference.

---

# Transaction attribution proposal

A single posted Transaction may carry independent references such as:

```text
kind = income
category = vehicle rental revenue
activity = Car A Rental
asset = Car A
portfolio = Investment Portfolio
account = Al Rajhi
counterparty = renter
```

These references explain different dimensions of one event.
They must not create duplicate Income Transactions.

Similarly:

```text
kind = expense
category = maintenance
activity = Car A Rental
asset = Car A
portfolio = Investment Portfolio
account = payment account
```

---

# Performance decomposition invariant

For an income-producing Asset/Activity, never overload one `profit` field.

Keep analytically separate:

1. operating revenue;
2. cash operating expenses;
3. net operating cash flow;
4. depreciation/impairment if enabled;
5. operating profit/economic result;
6. unrealized capital/valuation result;
7. realized disposal gain/loss;
8. lifecycle/total return calculation.

The exact rate-of-return method remains TBD.

---

# Examples

## Vehicle

```text
Asset = Vehicle A
Portfolio = Investment
Activity = Vehicle A Rental
Cost basis = 160k
Current value = 150k

Rent revenue = operating Activity revenue
Maintenance = operating Activity expense
-10k value difference = unrealized capital result
Future sale gain/loss = realized disposal result
```

## Apartment

```text
Asset = Apartment
Cost = 200k
Current value = 270k
Activity = Apartment Rental

+70k = valuation/capital result
Monthly/annual rent = operating revenue
Maintenance/management = operating expenses
```

## Agricultural land

```text
Asset = Land
Cost = 70k
Activity = Agricultural Operation
Season proceeds = 10k

10k is Activity revenue, not an automatic increase in Land cost basis/value.
```

Advanced biological asset/produce accounting remains separate/TBD.

---

# Relationship sketch

```text
Owner
 │
 ├─ owns ───────────────> Asset/Holding
 │                           │
 │                           ├─ current value / cost basis
 │                           └─ ActivityAssetLink
 │                                      │
 │                                      v
 │                                EconomicActivity
 │                                      │
 │                                      ├─ Income Transactions
 │                                      └─ Expense Transactions
 │
 └─ PortfolioAllocation ──> Asset economic quantity/value
              │
              └─ optional FundingMap -> specific Account/Holding
```

All views reconcile to one financial reality.
