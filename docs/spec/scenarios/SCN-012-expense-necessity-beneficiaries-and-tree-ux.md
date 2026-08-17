# SCN-012 — Expense Necessity, Beneficiaries and Tree UX

Status: **Scenario / Approved semantics implemented in prototype**
Date: 2026-08-17

## Facts from user testing

1. The expense-category tree can grow large.
2. Editing a node by clicking its pencil should not require scrolling to a remote form.
3. Selecting a parent from one flattened dropdown becomes difficult when the tree is deep.
4. The tree itself needs Expand/Collapse controls.
5. The user wants a way to distinguish unavoidable/core spending from spending that can be reduced or eliminated.
6. The user referenced the important/urgent matrix but explicitly asked MyFinMan to evaluate whether it is appropriate for financial management rather than copy it blindly.
7. The same category can serve different beneficiaries. Example: Restaurants may be for the user alone or for the whole family.
8. The user wants personal, family, child and children-group spending reports without duplicating the category hierarchy.

## Scenario A — Tree edit

Tree:

```text
Food
  Dining
    Work lunch
Housing
  Utilities
    Electricity
```

When the user clicks Edit on Electricity:

- an overlay editor opens immediately;
- current parent path `Housing -> Utilities` is visible;
- changing the parent uses cascading level selectors;
- cancelling returns to the same tree position;
- no page scroll is required.

## Scenario B — Category necessity

`Housing -> Rent` default necessity = Obligation.
`Food -> Groceries` default necessity = Essential.
`Personal -> Courses` default necessity = Flexible.
`Food -> Restaurants` default necessity = Discretionary.

A restaurant expense during an exceptional necessary travel/medical context can override the transaction necessity to Essential without rewriting Restaurants globally.

Historical expense rows preserve the classification that was posted at the time.

## Scenario C — Same category, different beneficiary

Transaction 1:
- WHAT: Restaurants
- WHO: Me
- Amount: 45 SAR

Transaction 2:
- WHAT: Restaurants
- WHO: Family
- Amount: 300 SAR

Reports must support:
- Restaurants total = 345 SAR.
- Me-only direct restaurant spending = 45 SAR.
- Family restaurant spending = 300 SAR.

The 300 SAR family transaction must not become 300 SAR for each family member.

## Scenario D — Child expense

Transaction:
- WHAT: Education -> School fees
- WHO: Murad
- WHY: School Portfolio
- WHERE: Al Rajhi checking account

The same event can be reported by:
- category Education/School;
- beneficiary Murad;
- Portfolio School;
- physical payer Al Rajhi;
- necessity Obligation/Essential according to policy.

None of these dimensions replaces another.

## Scenario E — Home maintenance

A home repair benefits the household but is also a cost of the Home asset/context.

Current representation:
- WHAT = Housing -> Maintenance.
- WHO = Family where useful.

Future candidate:
- SUBJECT/COST CENTER = Home asset.

The Home itself must not be represented as a fake human beneficiary.

## Acceptance tests

1. Expense category add/edit opens in modal/sheet rather than requiring page scroll.
2. Parent selection is level-by-level and cycle-safe.
3. Tree nodes expand/collapse independently.
4. Category can store one of four necessity levels.
5. Posted transaction snapshots category necessity.
6. Transaction-specific override does not mutate category default.
7. Beneficiary list supports person and group types.
8. Posted expense can reference one beneficiary.
9. Group beneficiary does not multiply amount across people.
10. Existing WHAT/WHERE/WHY and Portfolio consumption rules continue to pass.
