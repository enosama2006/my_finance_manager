# SCN-003 — Child Cash, Parent Custody, Internal Use, and Ownership Substitution

Status: **Approved scenario facts / Draft operation refinement**

## Purpose

Pressure-test MyFinMan using the real family scenario that originally motivated account-specific Portfolio backing.

The scenario must distinguish:

- economic Owner;
- physical Custodian;
- physical Location/Container;
- Portfolio purpose;
- unrestricted Free Liquidity;
- use of another Owner's money;
- internal Claim/Liability;
- optional reassignment of economic ownership across Holdings without fabricating a bank transfer.

---

# 1. Scenario

Two children receive Eid cash and hand it to their father for safekeeping.

Example:

```text
Child A gives Father   500 SAR
Child B gives Father 1,000 SAR
Total physical cash  1,500 SAR
```

The cash is placed in the Father's home safe.

Economic fact:
- the children own the money;
- Father physically holds/custodies it;
- the Home Safe is the physical Container/Location;
- receiving the cash is not Father's income;
- receiving the cash does not increase Father's Net Worth.

---

# 2. Recommended representation when the children remain the economic owners

If the safe currently contains only this 1,500 SAR:

```text
Asset = SAR Cash
Holding = Home Safe Cash
Quantity = 1,500 SAR
Custodian = Father
Location = Home

OwnershipShares:
- Child A =   500 SAR
- Child B = 1,000 SAR
```

If Father also has his own SAR cash in the same safe, the same physical Holding may contain several OwnershipShares, for example:

```text
Home Safe Cash = 3,500 SAR

Ownership:
- Father  = 2,000 SAR
- Child A =   500 SAR
- Child B = 1,000 SAR
```

The physical cash is fungible; ownership is an economic quantity share, not identification of specific banknotes.

---

# 3. Children's Portfolios are purpose, not custody

Example:

```text
Child A Portfolio
└─ SAR Cash allocation = 500

Child B Portfolio
└─ SAR Cash allocation = 1,000
```

These Portfolio allocations are made against each child's `Owner + Asset` position.

They do not need to say:

```text
Child A Portfolio -> Home Safe
Child B Portfolio -> Home Safe
```

unless an explicit Physical Reservation is desired.

Therefore ADR-002 remains valid: ordinary Portfolio purpose is independent from Account/Container.

---

# 4. Free Liquidity must be owner-scoped

Father's unrestricted spendable cash must exclude money owned by the children even if Father physically holds it.

Example:

```text
Father-owned cash across accounts/safe = 50,000 SAR
Child A cash held by Father             =    500 SAR
Child B cash held by Father             =  1,000 SAR
```

Father Free Liquidity calculations start from Father's economic ownership only.

The 1,500 SAR owned by the children must never make Father's Free Liquidity appear 1,500 SAR higher merely because the banknotes are in Father's safe.

Similarly, each child's Portfolio/Available calculations use that child's ownership position only.

---

# 5. If Father spends the children's physical cash

Suppose Father uses 700 SAR from the safe for a personal/home/car expense.

Physical fact:

```text
Home Safe Cash decreases by 700 SAR
```

If the 700 SAR economically belonged to a child and Father still owes the child the same value, the product must not pretend that the child's asset simply disappeared.

Recommended economic representation:

```text
Child cash ownership in Home Safe decreases by 700
Child Receivable / Claim against Father increases by 700
Father Payable / Liability to Child increases by 700
Father/household expense is posted according to its true category/activity
```

This expresses the real event:

> Father consumed cash owned by another Party and now owes that Party equivalent value.

The Claim and Liability are internal between household Parties and cancel in a consolidated household Net Worth view, while the external expense still reduces consolidated wealth.

This is different from spending Father's own Portfolio-reserved money.

---

# 6. Important distinction — child-owned money versus Father's money earmarked for a child

These are not the same case.

## Case A — Child is the Owner

Examples:
- Eid gift received by Child;
- cash formally given to Child;
- investment purchased from Child's money.

Then:

```text
Owner = Child
Beneficiary may also = Child
```

Father may be Custodian or account holder but not economic Owner.

If Father uses the money, a Claim/Liability may arise.

## Case B — Father owns the money but reserves it for Child

Example:
- Father decides to save 500 SAR/month from his salary for Child.

Then:

```text
Owner = Father
Portfolio purpose/beneficiary = Child
```

If Father consumes this reserved money, it is primarily a Portfolio funding/reallocation issue, not automatically a legal/economic debt to another Owner.

MyFinMan must not collapse Case A and Case B merely because both screens might be labeled "أموال الطفل".

---

# 7. Why the old application's fake transfers appeared necessary

The old workflow attempted to solve this situation:

```text
Reality after children hand over cash:
Home Safe contains 1,500 SAR owned by Children
Al Rajhi remains physically unchanged
```

But the old product could not separately represent:

- physical Container;
- economic Owner;
- Portfolio purpose.

So the user simulated:

1. a fake withdrawal from Al Rajhi to the wallet/safe;
2. a fake deposit of the children's value into Al Rajhi;

so that the application would effectively show:

```text
Safe cash belongs to Father
and
1,500 SAR in Al Rajhi belongs to Children
```

The physical bank balance never actually moved.

The user's need was real; the transaction type was wrong because the old model lacked ownership semantics.

---

# 8. Draft operation discovered — Same-Asset Ownership Substitution

Sometimes Father may intentionally want the economic result the old workaround was trying to express, but without fake bank transfers.

Example before:

```text
Home Safe Holding = 1,500 SAR
- Child owns 1,500
- Father owns 0

Al Rajhi Holding = 200,000 SAR
- Father owns 200,000
- Child owns 0
```

Father wants to take economic ownership of the physical 1,500 SAR cash in the safe while giving the Child equivalent ownership of 1,500 SAR already sitting in Al Rajhi.

No physical money moves.

Proposed operation:

```text
Same-Asset Ownership Substitution
Asset = SAR
Quantity = 1,500

Leg A:
Child ownership in Home Safe -1,500
Father ownership in Home Safe +1,500

Leg B:
Father ownership in Al Rajhi -1,500
Child ownership in Al Rajhi +1,500
```

After:

```text
Home Safe physical balance = unchanged 1,500
Al Rajhi physical balance  = unchanged 200,000

Child total SAR ownership  = unchanged 1,500
Father total SAR ownership = unchanged
```

This is not:
- a bank transfer;
- income;
- expense;
- asset conversion;
- realized gain/loss.

It is a reassignment/substitution of economic ownership of the same fungible Asset across two physical Holdings.

Status: **Draft operation — requires explicit approval and use-case design before implementation.**

---

# 9. Portfolio behavior during ownership substitution

If the Child already has:

```text
Child Savings Portfolio = 1,500 SAR
```

and ordinary Portfolio allocation follows ADR-002 at `Owner + Asset` level, the Portfolio does not need to change during ownership substitution.

Before:

```text
Child owns 1,500 SAR economically
Portfolio allocation = 1,500 SAR
Physical backing happens to be Home Safe
```

After:

```text
Child still owns 1,500 SAR economically
Portfolio allocation = 1,500 SAR
Physical backing happens to be Al Rajhi
```

Purpose remained unchanged.

This directly demonstrates why ordinary Portfolio allocation should not be tied to a specific Account/Holding.

---

# 10. Buying Gold for the Child

Suppose Child A owns 500 SAR and instructs Father to buy Gold.

If 500 SAR of Child-owned economic cash is converted into Gold:

```text
Child SAR position decreases
Child Gold position increases
Gold Cost Basis belongs to Child
Child Savings/Investment Portfolio may carry its purpose from SAR to Gold
```

The payment may physically be made from Father's bank account only if the economic settlement is modeled correctly.

Possible valid paths include:

1. Child already owns 500 SAR economic share in that bank Holding; spend it directly.
2. Ownership substitution first moves Child's SAR economic ownership to the paying bank Holding.
3. Father pays using Father's money and creates an inter-owner Claim/Payable settlement until reimbursed/settled.

MyFinMan must not silently treat Father's payment as if Child's money physically came from that bank when it did not.

---

# 11. UI implication

The application should make these facts simultaneously visible without forcing the user to think like an accountant.

Example Child detail:

```text
Murad — Total owned wealth

Cash owned             1,500 SAR
Gold owned                 0
Receivable from Father      0

Portfolio: Murad Savings
Allocated               1,500 SAR
Free                        0

Where currently held:
Home Safe               1,500 SAR
Custodian: Father
```

If Father later spends 700 and owes Murad:

```text
Murad — Total owned wealth

Cash physically held      800 SAR
Receivable from Father    700 SAR
Total economic wealth   1,500 SAR
```

Father's own screen must not count Murad's 800 SAR physical cash as Father's unrestricted wealth.

---

# 12. Required scenario tests

## TEST-CHILD-001 — Custody receipt is not Father income
Child hands Father 500 SAR; Father income and Net Worth do not increase.

## TEST-CHILD-002 — Child ownership survives Father custody
Child-owned cash in Father's safe remains in Child wealth.

## TEST-CHILD-003 — Father Free Liquidity excludes child-owned cash
Cash physically held by Father but economically owned by Child does not increase Father's Free Liquidity.

## TEST-CHILD-004 — Mixed safe ownership sums to physical cash
OwnershipShares across Father/Children equal the safe Holding quantity.

## TEST-CHILD-005 — Portfolio does not require physical location
Child Portfolio can allocate Child SAR without choosing Home Safe or Al Rajhi.

## TEST-CHILD-006 — Spending child money creates internal right
When Father spends Child-owned cash for Father's expense and remains obligated to Child, reduce Child cash ownership and create matching Child Claim + Father Liability.

## TEST-CHILD-007 — Household consolidation cancels internal claim/payable
Internal Child Claim and Father Liability cancel in consolidated household wealth while the external expense remains reflected.

## TEST-CHILD-008 — Ownership substitution changes no physical balances
Same-Asset Ownership Substitution changes OwnershipShares across Holdings but not Account/Holding quantities.

## TEST-CHILD-009 — Ownership substitution preserves each party's total SAR ownership
For equal-value same-asset substitution, Child and Father total SAR ownership remain unchanged.

## TEST-CHILD-010 — Portfolio survives ownership substitution
Child Portfolio allocation remains unchanged when only the physical Holding backing Child SAR ownership changes.

## TEST-CHILD-011 — Child-owned versus Father-earmarked is not collapsed
System distinguishes Child as economic Owner from Father-owned Portfolio with Child beneficiary.

## TEST-CHILD-012 — Gold purchase attributes ownership and cost correctly
Gold bought with Child economic funds becomes Child-owned Gold with Child-specific Cost Basis.

---

# 13. Conclusion

This scenario strongly validates ADR-002 rather than contradicting it.

The old need to bind every Portfolio to a bank arose because the previous software lacked separate concepts for:

```text
Owner
Custodian
Holding/Location
Portfolio
Claim/Liability
```

With these dimensions separated:

- Child money can physically sit in Father's safe without becoming Father's money;
- Child Portfolio can reserve the value without being tied to that safe;
- Father Free Liquidity excludes Child-owned cash;
- if Father uses Child money, the system records a real internal debt instead of hiding the event;
- if Father deliberately swaps economic ownership between safe cash and bank cash, a dedicated ownership-substitution operation can express that without a fake bank transfer.

The new architectural question is therefore not "Which bank does the Child Portfolio belong to?" but:

> "Who economically owns each quantity, where is it physically held, and what purpose is that owner's quantity reserved for?"
