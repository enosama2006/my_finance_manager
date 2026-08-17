# MyFinMan — Benchmark Ambition

Status: **Draft — captured from user direction; expand through scenarios before approval**

This document defines what MyFinMan should benchmark itself against as the product matures. It is intentionally broader than an expense-tracking application.

## BMK-001 — Product category

MyFinMan aims to become a **personal / micro-business financial manager** for:

- individuals;
- households/families;
- self-directed personal investors;
- people running small internal commercial/investment activities;
- very small businesses that need owner-level financial management without a heavyweight enterprise finance system.

The ambition is closer to having a lightweight financial manager/CFO assistant than a simple expense logger.

## BMK-002 — Beyond expense tracking

Expense tracking is necessary but not the product's defining value.

The product must ultimately help the user understand and manage:

- income;
- cash/liquidity;
- assets;
- savings;
- investments;
- liabilities;
- allocation of money to financial purposes;
- profit/loss where economically meaningful;
- financial discipline and decision guidance.

A design that mainly categorizes expenses is below the intended benchmark.

## BMK-003 — Financial guidance from income

The system should be able to observe that a user has income and propose a structured allocation plan rather than only recording the receipt.

Example direction from the user:

```text
Income
├─ Bucket / Portfolio 1 — x%
├─ Bucket / Portfolio 2 — y%
├─ Bucket / Portfolio 3 — z%
└─ Optional Bucket / Portfolio 4 — n%
```

The exact number of buckets, recommended categories, percentages and personalization rules are **TBD** and must be derived later from approved financial-management benchmarks and user scenarios.

Important architectural implication:
- advice/planning is not the same as actual allocation/posting;
- suggested percentages remain recommendations until accepted by the user;
- once accepted, resulting Portfolio allocations must obey the approved Domain rules.

## BMK-004 — Savings and investing are first-class

The application must treat saving and investing as core financial behaviors, not as leftover reporting after expenses.

Examples of questions the target product should eventually answer:

- How much of income is being converted into long-term assets?
- How much remains liquid?
- How much is reserved for obligations/emergencies?
- Is the user accumulating investable assets over time?
- Is a Portfolio progressing toward its target?
- Is investment capital growing or shrinking?

Exact metrics are still `TBD`.

## BMK-005 — Investment portfolios require performance semantics

When a Portfolio is investment-oriented, the system should expose financially meaningful performance information rather than treating it as a generic envelope.

At minimum, future design must consider:

- invested capital / cost basis;
- current market value;
- realized profit/loss;
- unrealized profit/loss;
- fees;
- cash flows into/out of the investment Portfolio;
- performance over time;
- attribution by Asset where useful.

The exact return methodology (simple return, money-weighted return/XIRR, time-weighted return, etc.) is **TBD** and must not be invented until benchmark research and scenarios are completed.

## BMK-006 — Categories must support financial management, not only expenses

The future category/taxonomy system should distinguish at least conceptually between:

- spending classification;
- income classification;
- Asset class;
- Portfolio/purpose;
- liability/obligation;
- investment/performance semantics;
- possibly business/commercial activity classification for micro-business users.

These dimensions must not be collapsed into one generic `category` tree.

Exact category trees are `TBD`.

## BMK-007 — Mixed wealth view

The product must be able to present a user's wealth even when it contains very different assets.

Example now expanded by SCN-002:

```text
Assets
├─ Cash distributed across several banks
├─ Gold / Silver across custody locations
├─ Vehicles
├─ Apartment / property
└─ Agricultural land
```

The product must preserve cost, current value, liquidity, location/custody and income-producing characteristics without forcing all Asset classes into the same simplistic behavior.

## BMK-008 — Benchmark against sound financial-management practice

Future benchmark research should identify good practices applicable to individuals and very small businesses, then translate them into optional product capabilities and advice.

Research areas to evaluate later include, without pre-approving exact rules:

- liquidity/reserve management;
- income allocation;
- savings rate;
- debt/liability management;
- investment diversification and performance measurement;
- cash-flow visibility;
- net-worth tracking;
- goal/Portfolio funding;
- separation of personal and business money where relevant;
- profitability of small commercial activities;
- reconciliation and record quality;
- forecasting/planning;
- risk concentration;
- financial health indicators.

All recommendations must later be classified as:
- deterministic accounting/financial rule;
- configurable benchmark;
- advisory heuristic;
- AI suggestion;
- user preference.

The system must never present a generic benchmark as a universal financial truth.

## BMK-009 — Advisory layer must be explainable and actionable

The target product should not merely say:

> "You spent too much."

It should eventually be able to explain financial condition and propose actionable decisions, for example:

- income allocation suggestions;
- underfunded/overfunded Portfolio warnings;
- excessive idle liquidity;
- concentration in one Asset or Asset class;
- liability pressure;
- investment Portfolio performance;
- progress toward financial goals.

Exact advice logic is `TBD` and will be built from benchmark research plus user-approved scenarios.

## BMK-010 — Prototype role

The current prototype remains a laboratory to test whether these benchmark ambitions can be represented correctly in the Domain and UX.

We should use concrete scenarios supplied by the user to discover:

1. missing entities;
2. missing calculations;
3. category/taxonomy problems;
4. ambiguous ownership/custody/Portfolio relationships;
5. performance/accounting edge cases;
6. advice that requires additional data;
7. differences between personal and micro-business use.

Only after these mature should the clean rebuild implement the full benchmark target.

## BMK-011 — Existing asset onboarding must not fabricate cash history

When a user starts MyFinMan with Assets already owned before onboarding, the product must support an Opening Position with historical cost/current valuation without reducing current Cash Accounts.

Examples:

- existing rental car;
- existing apartment;
- existing agricultural land;
- existing Gold/Silver.

Historical acquisition facts and current state must be distinguishable from transactions that occur after MyFinMan starts tracking.

## BMK-012 — New capital acquisition is not ordinary consumption expense

Buying a durable Asset after onboarding should normally be represented as a capital transformation:

```text
Cash Asset ↓
Durable/Investment Asset ↑
```

The Portfolio may change composition while invested capital remains represented.

The product must not make an investment Portfolio appear to have "spent and lost" capital merely because Cash was converted into a Vehicle/Property/other Asset.

Exact accounting treatment of ancillary costs remains subject to later approved policy.

## BMK-013 — Portfolio cash and Portfolio total value are different metrics

An investment Portfolio must expose separately:

- remaining Cash / liquidity;
- Asset composition;
- invested capital / cost basis;
- current market value;
- income;
- attributable expenses;
- performance.

Example:

```text
500,000 SAR cash Portfolio
buy 150,000 Vehicle
=> Cash may become 350,000
=> Portfolio has not necessarily fallen to 350,000
=> it now contains Cash + Vehicle
```

This distinction is mandatory for an investment-oriented product.

## BMK-014 — Income-producing assets need operating economics

A Vehicle, Apartment, Land or other Asset can generate recurring/seasonal revenue.

The product should support per-Asset / per-Activity views of:

- gross operating/rental revenue;
- direct operating expenses;
- net operating cash flow;
- optional depreciation/economic wear;
- operating profit where relevant;
- unpaid/expected income where applicable.

This operating result must remain separate from market valuation changes and disposal gains/losses.

## BMK-015 — Profit must be decomposed, not overloaded

MyFinMan must not show one ambiguous "profit" number for income-producing Assets.

Target benchmark separates at least:

```text
Operating Result
Capital / Valuation Result
Realized Disposal Result
Total / Lifecycle Economic Return
```

Exact performance formulas and annualization remain `TBD`, but the semantic separation is required.

## BMK-016 — Activity/Venture reporting bridges personal and micro-business finance

SCN-002 suggests a future `EconomicActivity/Venture` dimension to group revenue/cost-generating operations independently of Asset, Portfolio, Account and Category.

Examples:

- Car Rental;
- Apartment Rental;
- Agricultural Operation;
- future small commercial activity.

Target capability:

```text
Transaction
├─ Category
├─ Activity/Venture
├─ Asset
├─ Portfolio
├─ Account
└─ Counterparty
```

These are dimensions of one financial event, not duplicate transactions.

Architecture status: **Draft; requires more scenarios before formal Domain approval.**

## BMK-017 — Borrow useful SME accounting concepts without becoming heavyweight accounting software

MyFinMan should use established financial/accounting practice as a benchmark for semantic correctness while keeping the UX owner-oriented and simpler than statutory accounting systems.

Useful reference areas include:

- tangible assets held for rental, cost and depreciation concepts;
- investment property held for rent/appreciation;
- revenue versus asset valuation;
- cash-flow and liquidity visibility;
- agricultural activity distinct from the land itself;
- SME-oriented simplified reporting principles.

The product should be able to offer a simple personal mode and progressively richer micro-business reporting without forcing formal statutory accounting complexity on every user.
