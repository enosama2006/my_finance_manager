# SCN-004 — Portfolio Archetypes, Free Liquidity, and Inter-Owner Settlement

Status: **Approved scenario facts / Draft taxonomy and operation refinement**

## Purpose

Use the user's child-cash and child-gold examples to clarify what MyFinMan is actually made of and to separate four concepts that legacy wallet-based products collapse together:

1. where money physically moves;
2. who economically owns/bears the money;
3. which Portfolio purpose is consumed or transformed;
4. how parties settle when the physical payer is not the economic owner.

This scenario extends `SCN-003` and `ADR-002`.

---

# 1. Why the legacy wallet model breaks

A wallet-only application usually treats each wallet as both:

- a balance/container; and
- a purpose/person bucket.

That means it cannot reliably answer all of these at the same time:

- How much physical cash is in Home Safe?
- How much SAR exists in Al Rajhi?
- How much SAR does Father own across all places?
- How much does Child own?
- How much is reserved for Investment, Rent, School or Savings?
- Does a displayed balance reconcile to real bank/cash balances?

When purpose and physical balance are the same object, users are forced to create fake transfers to keep logical wallets aligned with real cash.

MyFinMan must not use Portfolio as the source of physical truth.

---

# 2. Four independent dimensions of a transaction

For every material transaction, MyFinMan should be able to distinguish:

```text
A. Physical Source / Destination
   Which Account/Holding actually lost or received the asset?

B. Economic Owner / Bearer
   Whose wealth actually increased, decreased or transformed?

C. Portfolio Purpose
   Which purpose allocation was consumed, funded or transformed?

D. Settlement / Reimbursement
   If physical payer and economic bearer differ, how are they settled?
```

These dimensions may coincide, but the system must not assume they always do.

---

# 3. Child deposits 1,500 SAR cash with Father

Example:

```text
Child A = 500 SAR
Child B = 1,000 SAR
Physical destination = Home Safe
Custodian = Father
```

The correct economic result is:

```text
Home Safe SAR Holding +1,500 physical cash

OwnershipShares:
- Child A +500
- Child B +1,000

Father income = 0
Father Net Worth increase = 0
```

If each child assigns the money to a Savings Portfolio:

```text
Child A Savings Portfolio: +500 SAR allocation
Child B Savings Portfolio: +1,000 SAR allocation
```

The Portfolio does not need to point to Home Safe.

---

# 4. Father wants to spend child-owned cash for himself

Suppose Father physically takes 500 SAR from the Home Safe to pay a personal expense.

The physical source is clear:

```text
Home Safe Cash -500
```

But the economic bearer should be Father, not Child.

MyFinMan must therefore refuse to silently treat the child's wealth as Father's unrestricted spending.

At least two valid settlement paths exist.

## Path A — Father becomes debtor to Child

```text
Child Cash -500
Child Claim against Father +500
Father Liability to Child +500
Father Expense +500
```

Child wealth remains economically protected; Father now owes the value.

## Path B — immediate ownership substitution / replacement from Father's own SAR

Father explicitly replaces the Child's 500 SAR with 500 SAR of Father's own cash elsewhere, for example in Al Rajhi.

Conceptually before spending:

```text
Child ownership in Home Safe -500
Father ownership in Home Safe +500

Father ownership in Al Rajhi -500
Child ownership in Al Rajhi +500
```

Then Father spends the now Father-owned 500 SAR from Home Safe.

Consequences:

- no fake bank transfer;
- Al Rajhi physical balance does not move due to the ownership substitution itself;
- Child total SAR ownership remains unchanged;
- Father's own economic SAR decreases by the personal expense;
- Father's Free Liquidity decreases if the replacement was sourced from unallocated Father-owned SAR.

This is the correct meaning of "خصمها من المتاح عندي" only when Father explicitly chooses his Free Liquidity as the economic replacement source.

It must not happen automatically merely because Father physically touched child-owned notes.

---

# 5. Gold purchase for Child paid from Father's bank

This is the key settlement scenario.

Initial state:

```text
Child owns 500 SAR Cash
Physical location = Home Safe
Portfolio = Child Savings / Investment

Father owns SAR in Alinma (or Al Rajhi)
```

Child asks Father to buy Gold for 500 SAR.

The merchant is paid physically from Father's Alinma account.

The purchase must be represented as one coherent economic event with multiple effects.

## 5.1 Physical payment leg

```text
Father-owned SAR in Alinma -500
Merchant receives 500
```

## 5.2 Asset acquisition leg

```text
Child Gold + acquired quantity
Child Gold Cost Basis = 500 SAR + qualifying acquisition fees
```

The Gold belongs to Child, not Father, because Child is the economic investor.

## 5.3 Child Portfolio transformation

Before:

```text
Child Portfolio
└─ 500 SAR Cash
```

After:

```text
Child Portfolio
└─ Gold acquired for 500 SAR
```

Therefore:

```text
Child SAR Portfolio allocation -500
Child Gold Portfolio allocation + acquired Gold quantity
```

The Portfolio purpose survives the Asset transformation.

## 5.4 Reimbursement / settlement from Child's physical cash

The Child already has 500 SAR physically in Home Safe. Father may take economic ownership of that cash as reimbursement for the 500 SAR he paid from Alinma.

No notes need to move physically inside the safe.

Ownership changes:

```text
Child ownership in Home Safe -500
Father ownership in Home Safe +500
```

After the whole event:

```text
Father:
- Alinma owned cash -500
- Home Safe owned cash +500
- net owned cash effect from principal = 0

Child:
- Home Safe owned cash -500
- Gold +500 cost basis
- net wealth at acquisition cost ≈ unchanged before fees/valuation differences

Physical Home Safe total quantity = unchanged by reimbursement
Physical Alinma balance = -500 due to real merchant payment
```

This is not a fake transfer from Home Safe to Alinma.
It is an **Inter-Owner Reimbursement / Ownership Settlement** layered onto a real purchase.

---

# 6. Why this differs from Same-Asset Ownership Substitution

`SCN-003` proposed a symmetrical Same-Asset Ownership Substitution across two Holdings when no physical balance moves.

The Gold purchase scenario is broader:

- a real bank payment occurs;
- a different Asset is acquired;
- the economic owner of the acquired Asset is Child;
- Child reimburses Father using Child-owned SAR in another Holding;
- reimbursement may be represented by an ownership transfer inside the existing cash Holding.

Therefore the target architecture likely needs a general **Inter-Owner Settlement** concept, of which Same-Asset Ownership Substitution may be one specialized pattern.

Status: **Draft operation design.**

---

# 7. Free Liquidity is not itself a Portfolio

Per ADR-002, `Free Liquidity` is the Owner's liquid Asset quantity that remains economically unallocated to Portfolios.

Example:

```text
Father-owned SAR = 100,000
Protected/allocated Portfolios = 80,000
Free Liquidity = 20,000
```

`20,000 Free Liquidity` is a derived state, not a Portfolio record.

If Father simply wants to know "what can I spend without touching any plan?", no personal-spending Portfolio is required.

---

# 8. When a Personal Spending Portfolio does make sense

If Father wants a deliberate periodic ceiling, for example:

```text
Personal Spending Budget = 8,000 SAR / month
```

then a Portfolio-like budget purpose is useful.

That is different from Free Liquidity:

```text
Free Liquidity
= unallocated liquid wealth

Personal Spending Portfolio
= deliberately allocated amount intended to be consumed by personal expenses
```

This distinction prevents the system from treating all unallocated wealth as a monthly spending budget.

---

# 9. Draft Portfolio archetypes

MyFinMan should keep one core `Portfolio` entity but may attach a behavior/profile rather than invent unrelated wallet types.

Proposed archetypes for evaluation:

## A. Spending / Budget Portfolio

Examples:
- Personal monthly spending
- Restaurants/leisure budget
- Monthly household spending

Primary questions:
- budget available;
- spent this period;
- remaining;
- rollover/reset policy.

It is intentionally consumptive.

## B. Commitment / Obligation Portfolio

Examples:
- Rent
- School fees
- Annual insurance

Primary questions:
- required amount;
- due date;
- funded amount;
- shortfall;
- payment status.

## C. Savings / Goal Portfolio

Examples:
- Child savings
- House down payment
- Emergency reserve

Primary questions:
- target;
- current value;
- progress;
- protection/liquidity constraints.

May contain more than Cash.

## D. Investment Portfolio

Examples:
- Long-term investments
- Gold/funds/stocks
- Income-producing asset capital

Primary questions:
- cost/capital;
- current value;
- realized/unrealized P&L;
- income/distributions;
- fees;
- return/performance.

## E. Reserve / Emergency profile

This may be a specialized Savings/Goal behavior rather than a distinct entity.

Primary difference is stronger protection and liquidity policy.

Status: **Draft taxonomy.**

---

# 10. Things that are NOT Portfolio types

## Owner is not a Portfolio type

"Child money" may mean:

```text
Owner = Child
Portfolio = Savings
```

or:

```text
Owner = Father
Beneficiary = Child
Portfolio = Child Future Goal
```

These are different ownership facts even if the UI label looks similar.

## Account is not a Portfolio type

Al Rajhi, Alinma and Home Safe answer where value exists.

## Economic Activity is not a Portfolio type

Car Rental, Apartment Rental or Agriculture are Activities/Ventures that generate operating P&L. A Portfolio may fund them, but Activity and Portfolio answer different questions.

---

# 11. Spendable views may need more than one number

This scenario reveals a reporting nuance.

The product may need to distinguish:

```text
Free / Unallocated Liquidity
+ Spendable Budget Portfolios
= Total currently spendable under plan
```

while still protecting:

```text
Commitment Portfolios
Savings/Goal Portfolios
Investment Portfolios
Other protected reserves
```

Exact dashboard terminology and aggregation policy are `TBD`.

---

# 12. Proposed transaction architecture implication

A future normalized transaction model should be able to express legs such as:

```text
Physical cash/account leg
Ownership leg
Portfolio allocation leg
Asset acquisition/disposal leg
Claim/Liability leg
Settlement/Reimbursement leg
Fee/expense leg
```

One LogicalTransaction may contain several coordinated effects while remaining one real-world event.

This strongly supports the Draft `TransactionLeg` direction recorded in DEC-017, provided domain validation remains explicit and deterministic.

---

# 13. Acceptance scenarios

## TEST-SETTLE-001 — Child cash deposit is not Father income
Receive 500 SAR from Child into Home Safe; Child owns it and Father Net Worth does not increase.

## TEST-SETTLE-002 — Child Portfolio independent from physical safe
Move/reassign Child-owned SAR between eligible Holdings; Child Portfolio purpose remains unchanged.

## TEST-SETTLE-003 — Father cannot silently spend Child wealth
Attempt personal expense using Child-owned cash; system requires debt/settlement/explicit ownership transfer path.

## TEST-SETTLE-004 — Debt path preserves Child wealth
Father spends Child cash and becomes debtor; Child Claim and Father Liability are created for equal amount.

## TEST-SETTLE-005 — Immediate replacement from Father Free Liquidity
Father replaces Child-owned cash with equivalent Father-owned SAR elsewhere; Child ownership remains unchanged and Father Free Liquidity bears the expense.

## TEST-SETTLE-006 — Gold purchase paid by Father for Child
Father bank pays 500 SAR, Child receives Gold with correct ownership and cost basis.

## TEST-SETTLE-007 — Child cash reimburses Father without fake bank transfer
Child ownership in Home Safe decreases 500 and Father ownership there increases 500; Home Safe physical balance remains unchanged.

## TEST-SETTLE-008 — Child Portfolio transforms from Cash to Gold
The Portfolio loses 500 SAR allocation and gains the acquired Gold allocation; purpose survives.

## TEST-SETTLE-009 — Father principal neutrality after reimbursement
Ignoring fees, Father bank-owned cash decreases 500 and Father safe-owned cash increases 500; Father's total owned principal cash is unchanged by purchasing on Child's behalf after reimbursement.

## TEST-SETTLE-010 — Free Liquidity is not a Portfolio
System can derive Free Liquidity without persisting a fake "Available Wallet".

## TEST-SETTLE-011 — Spending budget distinct from Free Liquidity
A monthly Personal Spending Portfolio may coexist with additional unallocated Free Liquidity.

## TEST-SETTLE-012 — Owner vs beneficiary distinction
Child-owned Eid cash and Father-owned savings earmarked for Child must remain distinguishable.

---

# 14. Current conclusion

The emerging model is:

```text
Financial Reality
│
├─ Party / Owner        -> لمن المال؟
├─ Asset                -> ما هو المال/الأصل؟
├─ Holding + Account    -> أين يوجد فعليًا؟
├─ Custodian            -> من يمسكه؟
├─ Portfolio            -> لماذا خُصص؟
├─ Activity             -> ما النشاط الذي يولد دخله/تكلفته؟
├─ Transaction          -> ماذا حدث؟
└─ Settlement           -> من دفع فعليًا ومن تحمل اقتصاديًا وكيف تمت التسوية؟
```

The legacy wallet model collapses several of these into one balance. MyFinMan's advantage is to keep them separate and derive the user's views from one reconciled financial truth.