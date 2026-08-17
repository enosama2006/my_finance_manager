# MyFinMan — Portfolio and Settlement Taxonomy

Status: **Draft architecture derived from SCN-003/SCN-004/SCN-009**

## 1. Product decomposition

MyFinMan must not use one generic Wallet object for all financial meaning.

Target conceptual layers:

```text
Party / Owner
Asset
Holding
Account / Container
Custodian / Location
Portfolio
CapitalCycle
Position
Economic Activity / Venture
Logical Transaction
Settlement / Reimbursement
Claim / Liability
Valuation / Cost Basis
```

Each answers a different question.

## 2. Portfolio remains one core concept

A Portfolio answers:

> Why is part of an Owner's Asset position reserved or managed this way?

Ordinary Portfolio allocation is economic and follows ADR-002.

The same Portfolio may contain multiple Asset types over time.

Example Child Savings:

```text
Day 1: 500 SAR Cash
Day 20: 0 SAR Cash + Gold acquired for 500 SAR
```

The purpose survives the Asset transformation.

Portfolio is not the same thing as one finite investment round or one Asset Position.

## 3. Free / Available is derived, not a Portfolio

For each Owner + liquid Asset:

```text
Free Quantity
= Owner total quantity
- active Portfolio allocations
```

For liquid cash this is `Free Liquidity`.

Do not create a persistent fake `Available Portfolio` merely to display this number.

## 4. Portfolio behavior profiles — Draft

A single Portfolio entity may carry a behavior profile.

### SpendingBudget
Consumptive, periodic; measure budget/spent/remaining.

### Commitment
Protected for a due obligation; measure required/funded/shortfall/due/payment state.

### SavingsGoal
Capital accumulation/protection toward a target; measure progress and target gap.

### Investment
Capital deployed to Assets; measure cost/current value/income/fees/P&L/return.

### Reserve
Potential specialization of SavingsGoal with stronger liquidity/protection policy.

These are behavior profiles, not separate balance-container entities.

A Deal/Operation profile remains TBD; SCN-009 suggests that one-off commercial activity may be modeled more cleanly as an EconomicActivity/Deal containing a CapitalCycle rather than forcing every deal to become a Portfolio.

## 5. Lifecycle is layered

SCN-009 introduces a critical distinction:

```text
Portfolio lifecycle
CapitalCycle lifecycle
Position lifecycle
```

These are independent.

### Portfolio

Can remain open for years while many Positions/Cycles open and close.

### CapitalCycle — Draft

Finite economic episode with a start, activity, unresolved items, closure and frozen realized result.

Examples:

- one short commercial operation;
- one Namaa six-month round;
- one rent month;
- one school term;
- one discrete investment round trip.

A CapitalCycle may belong to a Portfolio, EconomicActivity/Venture or Deal.

### Position

Exposure to a particular Asset. A 10g Gold Position can close after sale while its parent Investment/Child Portfolio remains open.

See `portfolio-lifecycle-and-capital-cycle-draft.md` for detailed Draft closure semantics.

## 6. Owner and Beneficiary are orthogonal

Do not create "Child Portfolio" as a special ownership model.

Two different truths can have similar UI labels:

```text
Owner = Child
Portfolio = Savings
```

versus

```text
Owner = Father
Beneficiary = Child
Portfolio = Future Education
```

The first is Child wealth. The second remains Father wealth earmarked for Child unless legally/economically transferred.

## 7. Payment source is not funding source

Every transaction may have:

```text
Physical source
Economic bearer
Portfolio funding source
Settlement source
```

Example Child Gold purchase:

```text
Physical source = Father's Alinma account
Economic bearer / acquired-asset Owner = Child
Portfolio = Child Savings/Investment
Settlement source = Child-owned SAR in Home Safe
```

This is valid without creating a fake transfer between Home Safe and Alinma.

## 8. Inter-Owner Settlement — Draft

When one Party physically pays on behalf of another, settlement may be:

- immediate reimbursement from the beneficiary Owner's Asset position;
- transfer of ownership share in a fungible Holding;
- Same-Asset Ownership Substitution across Holdings;
- Claim/Payable if not settled immediately;
- explicit gift/capital contribution if that is the real economic intent.

The system must not guess among these.

## 9. Sale proceeds and realized result

A Portfolio/Position engine must never confuse principal return with income.

Example:

```text
Gold Cost Basis = 5,400 SAR
Sale Proceeds   = 5,500 SAR
```

Economic decomposition:

```text
Returned principal = 5,400 SAR
Realized gain      =   100 SAR
```

The physical destination Account receives 5,500 SAR, but performance/income views treat only the 100 SAR as realized investment result under the final taxonomy.

The 5,500 SAR then needs an explicit next purpose: remain Portfolio Cash, reinvest, reallocate, distribute or release to Free Liquidity.

## 10. Closed Cycle result is frozen

A CapitalCycle can accumulate realized gains/losses before it closes, but these are provisional at cycle level while further costs/obligations remain.

At closure, preserve:

- native result;
- reporting-currency snapshot at close;
- closing timestamp;
- residual-value disposition.

If a residual Asset remains held after closure, later market/FX movement belongs to that Asset Position after closure and must not rewrite historical Cycle profit.

## 11. Recurring Portfolios can create recurring Cycles

Examples:

```text
Home Rent Portfolio
  ├─ Sep 2026 Cycle
  └─ Oct 2026 Cycle

School Portfolio
  ├─ Term 1
  └─ Term 2

Personal Spending
  ├─ Aug 2026
  └─ Sep 2026
```

The purpose is persistent; the funded/settled period is finite.

Exact cycle auto-creation/rollover behavior remains TBD.

## 12. User-facing abstraction

The UI should not require accounting terminology.

Example prompt after Father pays 500 SAR for Child Gold from Alinma:

```text
تم الدفع من حسابك في الإنماء: 500 ريال
الذهب سيكون ملكًا للطفل.

كيف تريد تسوية المبلغ؟
- استرداده من نقد الطفل الموجود في الخزنة
- اعتباره مبلغًا مستحقًا لك على الطفل/حسابه
- اعتباره هدية/مساهمة منك
- اختيار مصدر آخر
```

For lifecycle UX, user-facing terms can be simple:

```text
المحفظة
المركز
الدورة / العملية
```

Exact Arabic terminology remains Draft.

## 13. Invariants

- Physical Account/Holding balances change only when physical/economic events actually affect them.
- Ownership changes must not be represented as fake bank transfers.
- Portfolio purpose changes must not be represented as physical transfers.
- A Party cannot spend another Owner's Asset silently.
- A purchase for Owner B paid physically by Owner A requires explicit settlement/contribution/debt semantics.
- Acquired Asset ownership and cost basis follow the economic buyer, not automatically the bank-account holder.
- Reimbursement of principal must not create income/expense by itself.
- Claims and liabilities created between household parties eliminate in consolidated household views but remain visible individually.
- Position closure, CapitalCycle closure and Portfolio closure are separate events.
- A Position reaching zero does not automatically close its parent Portfolio.
- A realized gain during an open Cycle is not automatically the final Cycle profit.
- Contributions increase capital but are not investment profit.
- Full sale proceeds are not investment income; principal return and realized result must be separated.
- Closing never deletes ledger/history.

## 14. Open questions

- Exact entity name for `InterOwnerSettlement`.
- Whether Same-Asset Ownership Substitution is a subtype of settlement or a generic ownership transaction.
- Exact UI for selecting settlement when children/minors are involved.
- Whether a Personal Spending Portfolio should be auto-created or purely optional.
- Rollover/reset semantics for SpendingBudget.
- Protection policies per Portfolio profile.
- How shared-ownership spending is allocated when a Holding contains multiple Owners and no owner-specific physical notes exist.
- Final entity name for `CapitalCycle`.
- Whether Deal/Operation is a Portfolio behavior profile or EconomicActivity + CapitalCycle.
- Exact cycle result snapshot schema.
- MWR/TWR policy for long-lived Portfolios.
- Residual cash default after Position/Cycle closure.

Do not implement these open questions by guesswork.
