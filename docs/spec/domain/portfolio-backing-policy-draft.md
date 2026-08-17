# MyFinMan — Portfolio Backing Policy

Status: **Draft architecture derived from SCN-005**

## Goal

Allow a Portfolio to remain an economic purpose layer while optionally enforcing or visualizing deliberate physical segregation in Accounts/Holdings.

## Proposed modes

### `flexible`
- allocation exists at Owner + Asset level;
- any eligible Holding can physically fund the purpose;
- no Account-specific backing requirement.

### `designated`
- user designates one or more Accounts/Holdings as expected backing;
- Portfolio still remains independent from those Accounts conceptually;
- application can show backing ratio and drift;
- spending from designated backing for unrelated purposes should warn or require reclassification/release depending policy.

### `hard_reserved`
- exact Account/Holding/quantity is protected for the Portfolio;
- unrelated spending requires explicit release/override;
- no silent consumption.

### `instrument_bound`
- Portfolio contains an actual investment Asset whose real Holding is intrinsically with a provider/custodian;
- example: a term investment position at Alinma;
- the link is factual, not merely a budgeting rule.

Exact enum names are Draft.

## Important separation

```text
PortfolioAllocation
answers: WHY / WHAT quantity is reserved?

PortfolioBackingPolicy
answers: MUST / SHOULD that reservation be backed somewhere specific?

Holding / Account
answers: WHERE does the Asset actually exist?

Transaction
answers: WHAT actually moved/changed?
```

## Backing calculations (Draft)

For designated/hard-backed cash:

```text
Required Backing Quantity
= Portfolio quantity covered by backing rule

Eligible Physical Backing
= Owner quantity in selected eligible Holdings

Backing Gap
= max(0, Required Backing Quantity - Eligible Physical Backing)

Backing Surplus
= max(0, Eligible Physical Backing - Required Backing Quantity)
```

These are control/reconciliation metrics, not additional assets.

## Growth decomposition

Savings/Investment Portfolios should expose:

```text
Closing Value
= Opening Value
+ Contributions
- Withdrawals
+ Investment Income / Return
- Fees / Losses
+/- Valuation Changes as applicable
```

Contribution growth and investment return must be separately reportable.

## Recurring contribution policy

A Portfolio may define a recurring funding instruction, for example:

```text
Every month:
Allocate 10,000 SAR of Owner cash to Long-Term Savings
Preferred/Designated destination: Alinma Current Account
```

The recurrence is a planning/funding instruction. It only becomes actual when the real bank transfer/deposit is posted or reconciled.

## Maturity-aware investment positions

Instrument-bound Holdings may carry:
- provider/custodian;
- principal;
- start date;
- maturity date;
- expected annual rate/basis;
- accrued expected profit (if available);
- actual paid profit;
- renewal/reinvestment status;
- early-exit terms/availability metadata.

Expected income never becomes actual wealth merely because time passes unless the approved accrual policy says so; actual cash movements and provider-reported balances remain authoritative for reconciliation.

## UI

Portfolio details should be able to show both:

### Purpose view
- allocated capital;
- free/unallocated amount;
- contributions;
- return;
- target/progress.

### Backing / location view
- designated accounts;
- actual holdings;
- backing ratio/gap;
- locked/instrument-bound positions;
- cash awaiting deployment.

The same Portfolio can switch between these views without duplicating financial truth.

## Open questions

- whether designated backing is advisory-only or configurable enforcement;
- release/override UX;
- how to rank several eligible backing Accounts;
- whether recurring contribution instructions belong to Portfolio or a separate Plan entity;
- exact treatment of accrued but unpaid investment profit;
- automatic rollover/reinvestment rules;
- partial maturity and early withdrawal.
