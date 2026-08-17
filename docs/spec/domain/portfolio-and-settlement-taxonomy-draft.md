# MyFinMan — Portfolio and Settlement Taxonomy

Status: **Draft architecture derived from SCN-003/SCN-004**

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

## 5. Owner and Beneficiary are orthogonal

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

## 6. Payment source is not funding source

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

## 7. Inter-Owner Settlement — Draft

When one Party physically pays on behalf of another, settlement may be:

- immediate reimbursement from the beneficiary Owner's Asset position;
- transfer of ownership share in a fungible Holding;
- Same-Asset Ownership Substitution across Holdings;
- Claim/Payable if not settled immediately;
- explicit gift/capital contribution if that is the real economic intent.

The system must not guess among these.

## 8. User-facing abstraction

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

If `استرداده من نقد الطفل الموجود في الخزنة` is selected, ownership of 500 SAR in Home Safe changes from Child to Father while the physical safe balance does not move.

## 9. Invariants

- Physical Account/Holding balances change only when physical/economic events actually affect them.
- Ownership changes must not be represented as fake bank transfers.
- Portfolio purpose changes must not be represented as physical transfers.
- A Party cannot spend another Owner's Asset silently.
- A purchase for Owner B paid physically by Owner A requires explicit settlement/contribution/debt semantics.
- Acquired Asset ownership and cost basis follow the economic buyer, not automatically the bank-account holder.
- Reimbursement of principal must not create income/expense by itself.
- Claims and liabilities created between household parties eliminate in consolidated household views but remain visible individually.

## 10. Open questions

- Exact entity name for `InterOwnerSettlement`.
- Whether Same-Asset Ownership Substitution is a subtype of settlement or a generic ownership transaction.
- Exact UI for selecting settlement when children/minors are involved.
- Whether a Personal Spending Portfolio should be auto-created or purely optional.
- Rollover/reset semantics for SpendingBudget.
- Protection policies per Portfolio profile.
- How shared-ownership spending is allocated when a Holding contains multiple Owners and no owner-specific physical notes exist.

Do not implement these open questions by guesswork.