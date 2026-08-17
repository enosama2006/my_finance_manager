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

User example started in this discussion:

```text
Assets
├─ Cash / account balance: 1,000,000 SAR
└─ Land / real estate
```

This scenario is intentionally incomplete. The user will continue it to test how valuation, liquidity, profit/loss, portfolios and financial guidance should work across different asset classes.

Do not infer the remaining scenario before it is provided.

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
