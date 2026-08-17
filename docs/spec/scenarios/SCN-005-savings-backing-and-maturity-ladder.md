# SCN-005 — Savings Backing, Account Segregation, and Maturity Ladder

Status: **Approved scenario facts / Draft backing-policy refinement**

## Purpose

This scenario clarifies why a user may intentionally want a Portfolio to be visibly backed by a specific bank account or investment product even though ordinary Portfolio allocation is economically independent from custody by default.

The key distinction is between:

- economic purpose allocation;
- optional designated physical backing;
- an investment instrument that is itself a real Asset/Holding;
- recurring savings contributions;
- investment return;
- maturity and reinvestment.

---

## 1. User behavior

The user deliberately separates daily spending from savings:

- Al Rajhi is used for routine spending;
- Alinma is used as the savings/investment accumulation bank;
- each month SAR 10,000 is added to savings and intentionally not spent;
- SAR 1,000,000 is placed in Alinma's Namaa investment product for a six-month term;
- monthly savings continue to accumulate as Alinma cash while the term investment remains active;
- at maturity, principal and investment profit return/become available and are combined with accumulated savings;
- the combined amount is reinvested for a new term.

This is not merely a psychological Portfolio label. The user intentionally uses physical account separation as a control mechanism and wants MyFinMan to preserve and visualize it.

---

## 2. Best-practice interpretation

There is no contradiction with ADR-002.

ADR-002 says ordinary Portfolio purpose must not be forced to follow Account/Holding boundaries.

SCN-005 adds the converse capability:

> A user may optionally designate or require a specific Account/Holding as backing for a Portfolio when that separation is an intentional savings-control policy.

Therefore the target model should support a **Portfolio Backing Policy** rather than choosing one universal behavior.

Proposed Draft modes:

### Flexible / Economic
The Portfolio allocation exists at Owner + Asset level and can be funded from any eligible Holding.

### Designated Backing
The user says the Portfolio is expected to be backed by a specific Account/Holding, and MyFinMan shows drift/reconciliation if physical backing falls below the designated amount.

This is primarily a control and visibility rule, not a statement that the Portfolio and Account are the same object.

### Hard Reservation / Locked Backing
A specific Holding/quantity must not be used for other purposes without an explicit release/override.

This may apply to exact cash in a dedicated account, an exact gold bar, or another reserved physical position.

### Instrument-Bound
The Portfolio owns an investment Asset whose real Holding is intrinsically with a provider/custodian, such as a term investment product at Alinma.

In this mode there is nothing artificial about showing the Portfolio Asset under Alinma: the investment position is actually held there.

Exact names are Draft.

---

## 3. Representation during the first six-month cycle

Initial state:

```text
Owner = User
Portfolio = Long-Term Savings / Investment

Alinma Current Account:
- SAR Cash Holding

Alinma Namaa:
- Investment Asset/Holding = 1,000,000 SAR principal
```

Portfolio composition at start:

```text
Investment Portfolio
└─ Namaa Investment Asset = 1,000,000
```

Monthly recurring saving:

```text
Month 1: Alinma Cash +10,000; Portfolio Cash allocation +10,000
Month 2: Alinma Cash +10,000; Portfolio Cash allocation +10,000
...
Month 6: Alinma Cash cumulative +60,000
```

During the term, Portfolio composition is conceptually:

```text
Investment Portfolio
├─ Namaa Investment Position = 1,000,000
└─ Alinma Cash Savings         =   60,000
```

The user should be able to see both:

- purpose view: total savings/investment capital;
- location/instrument view: how much is in Namaa and how much is cash in Alinma.

---

## 4. Contribution versus investment return

MyFinMan must never treat recurring savings contributions as investment profit.

For the cycle:

```text
Opening invested principal = 1,000,000
New contributions          =    60,000
Investment profit          = separate measured amount
```

Closing Portfolio value is therefore decomposed into:

```text
Opening capital
+ user contributions
+ investment income / realized return
- withdrawals / fees / losses
= closing value
```

This is required for meaningful performance reporting.

A Portfolio growing from 1,000,000 to 1,085,000 because of 60,000 contributions and 25,000 investment income must not be reported as an 8.5% investment return.

---

## 5. Namaa rate caution

For real-product integration, rates must be stored with basis metadata.

A quoted `5%` may mean an annual expected rate rather than a 5% six-month period return.

The application must distinguish:

- annual expected rate / APR-like basis;
- actual period return;
- accrued profit;
- paid profit;
- maturity date;
- expected versus realized return.

MyFinMan must not multiply principal by an annual rate as though the same percentage applies to every six-month term.

---

## 6. Maturity event

At maturity, the investment position is settled according to the product's actual transaction:

```text
Namaa investment position closes/decreases
Alinma Cash increases by principal + actual paid profit
```

The Portfolio purpose does not disappear.

It changes composition from investment instrument + accumulated cash into available cash pending reinvestment.

Example using a hypothetical 5% annualized rate for exactly six months:

```text
Opening principal      1,000,000
Approx. 6-month profit    25,000
Monthly savings            60,000
-------------------------------
Available for reinvestment 1,085,000
```

This numerical example is illustrative only. Actual Namaa profit must use the bank's actual rate/terms and realized payment.

---

## 7. Reinvestment

When the user invests the combined amount again:

```text
Alinma Cash -1,085,000
New Namaa investment position +1,085,000
```

Portfolio total capital does not disappear; its Asset composition changes.

This is a real Asset transformation / investment purchase, not a Portfolio reallocation only.

---

## 8. UI implications

The Portfolio screen should support both high-level and backing views.

Example:

```text
Long-Term Savings
Current value: 1,060,000

Composition
- Namaa term investment: 1,000,000
- Cash awaiting next investment: 60,000

Backing / location
- Alinma: 1,060,000 total related value

Contributions this cycle: 60,000
Investment income this cycle: 0 accrued/paid yet (or actual accrued amount if available)
Next maturity: <date>
```

At maturity:

```text
Matured amount
Principal returned
Profit paid
Cash accumulated
Ready to reinvest
```

The user should also be able to view savings growth as a time series split into:

- contributions;
- investment return;
- total Portfolio value.

---

## 9. Invariants

- Portfolio purpose and Account identity remain separate concepts.
- Optional backing does not turn Account into Portfolio.
- Physical balances must reconcile to real bank/product positions.
- Recurring contributions are not investment profit.
- Expected profit is not actual cash until accrued/paid according to product semantics.
- Maturity and reinvestment are real financial events and must preserve audit history.
- Reinvestment changes Asset composition, not historical contribution totals.
- A dedicated savings account may be used as a behavioral control without forcing all Portfolios to use dedicated accounts.

---

## 10. Acceptance scenarios

- `TEST-SAVE-001`: Dedicated Alinma savings cash is visible as physical backing of the savings Portfolio.
- `TEST-SAVE-002`: Spending from Al Rajhi does not consume the Alinma-backed savings Portfolio unless explicitly selected/released.
- `TEST-SAVE-003`: Monthly SAR 10,000 savings increase contribution totals and Portfolio cash, not investment income.
- `TEST-SAVE-004`: Active Namaa principal is represented as an investment Asset/Holding rather than ordinary cash.
- `TEST-SAVE-005`: Namaa principal plus separate accumulated Alinma cash both roll up into the same Portfolio without double counting.
- `TEST-SAVE-006`: Annual expected return and period return cannot be confused.
- `TEST-SAVE-007`: Maturity converts the investment position into actual cash/principal/profit according to posted settlement.
- `TEST-SAVE-008`: Reinvestment converts cash into a new investment position while keeping Portfolio purpose/history.
- `TEST-SAVE-009`: Portfolio performance excludes contributions from investment return.
- `TEST-SAVE-010`: Flexible Portfolio remains possible with no designated Account.
- `TEST-SAVE-011`: Designated backing can warn on drift without fabricating transfers.
- `TEST-SAVE-012`: Hard reservation requires explicit release before unrelated spending consumes it.

---

## 11. Architectural implication

SCN-005 does not reverse ADR-002. It refines it:

```text
PortfolioAllocation
= economic purpose allocation

PortfolioBackingPolicy (Draft)
= optional constraint/visibility policy over Accounts/Holdings

Investment Holding
= actual real-world Asset position at a custodian/provider
```

The future clean rebuild should support both economic flexibility and deliberate physical segregation because users may legitimately need both at different times.
