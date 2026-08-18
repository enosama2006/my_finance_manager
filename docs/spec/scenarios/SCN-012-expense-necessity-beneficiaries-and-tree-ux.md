# SCN-012 — Expense Necessity, Parties and Tree UX

Status: **Scenario / Approved semantics; Party identity refined by ADR-006**
Date: 2026-08-18

## Facts from user testing

1. Expense-category trees can grow large.
2. Editing a node should not require scrolling to a remote form.
3. Selecting a parent from one flat dropdown is difficult when the tree is deep.
4. Trees need Expand/Collapse, breadcrumb and cycle-safe reparenting.
5. The user wants spending necessity distinct from category.
6. The same category can serve different beneficiaries.
7. Personal, family, child and group spending reports must not duplicate the category hierarchy.
8. Owner and Beneficiary identities come from the same real-world people/groups/companies/families and therefore must not require separate identity stores.

## Scenario A — Tree edit

```text
Food                     [branch]
└── Dining               [branch]
    └── Work lunch       [leaf]
Housing                  [branch]
└── Utilities            [branch]
    └── Electricity      [leaf]
```

When the user clicks Edit on Electricity:

- contextual Modal/Sheet opens immediately;
- current parent path `Housing -> Utilities` is visible;
- changing parent uses cascading level selectors/tree;
- cancelling returns to same tree position;
- no remote page scroll is required;
- create/edit state does not leak between nodes.

## Scenario B — Category necessity

`Housing -> Rent` default necessity = Obligation.
`Food -> Groceries` default necessity = Essential.
`Personal -> Courses` default necessity = Flexible.
`Food -> Restaurants` default necessity = Discretionary.

A transaction may override necessity without rewriting the category globally.
Historical expense rows preserve the posted classification.

## Scenario C — one canonical Party, different roles

Party manager contains one stable Party record for `أنا` and one for `العائلة`.

Transaction 1:
- WHAT: Restaurants leaf
- WHO / beneficiaryId: Party `أنا`
- Amount: 45 SAR

Transaction 2:
- WHAT: Restaurants leaf
- WHO / beneficiaryId: Party `العائلة`
- Amount: 300 SAR

The same Party records may also be used in Owner or other relationship roles where semantically valid.

Expected reports:
- Restaurants total = 345 SAR;
- Me-only direct restaurant spending = 45 SAR;
- Family beneficiary spending = 300 SAR.

The 300 SAR family transaction must not become 300 SAR for every family member.

## Scenario D — same child as Owner and Beneficiary

`مراد` exists once as canonical Party.

A child-owned Asset may reference:
- Owner = Party `مراد`.

A school expense may reference:
- WHAT = Education -> School fees leaf;
- Beneficiary = Party `مراد`;
- WHY = School Portfolio leaf;
- WHERE/source = Al Rajhi Cash Asset.

No duplicate `MuradOwner` and `MuradBeneficiary` identities are created.

The same event can be reported by:
- expense category;
- Party as Beneficiary;
- Party as Owner/economic bearer where relevant;
- Portfolio;
- physical payment Asset;
- necessity.

None of these dimensions replaces another.

## Scenario E — Party tree and aggregate Party

Example navigation:

```text
الأطراف
├── الأسرة والأصدقاء         [structural container]
│   ├── أنا                  [Party leaf]
│   ├── نور                  [Party leaf]
│   └── مراد                 [Party leaf]
└── المجموعات                [structural container]
    └── العائلة              [Party leaf, aggregate economic Party]
```

`العائلة` may itself be a valid beneficiary Party.
If the application later tracks family membership, membership is a separate relation; it does not require converting the economic Party into a non-actionable branch.

Expected:
- owner/beneficiary selectors use the same Party tree source;
- structural Party container is not selectable;
- actual person/family/company/group Party leaves are selectable according to use-case eligibility.

## Scenario F — Home maintenance

A home repair benefits the household but is also a cost of the Home asset/context.

Current representation:
- WHAT = Housing -> Maintenance leaf;
- WHO = Family Party where useful.

Future candidate:
- SUBJECT/COST CENTER = Home Asset.

The Home Asset must not be represented as a fake human/Party beneficiary.

## Form lifecycle

On successful create/post:
- clear transient fields;
- reset intentional defaults;
- clear stale selected Party/category/preview state when the next operation should begin fresh;
- show success Toast;
- block duplicate submit.

On validation/execution failure:
- preserve user input.

## Acceptance tests

1. Expense category add/edit opens in Modal/Sheet rather than requiring remote scroll.
2. Parent selection is level-by-level and cycle-safe.
3. Tree nodes expand/collapse independently.
4. Posting targets actionable category leaves by default; parent rollups are derived.
5. Category can store one of four necessity levels.
6. Posted transaction snapshots category necessity.
7. Transaction-specific override does not mutate category default.
8. Owner and Beneficiary selectors resolve from the same canonical Party identities.
9. Same Party can be referenced in different roles without duplication.
10. Family/group Party remains one beneficiary amount and does not multiply across members.
11. Structural Party containers are not selectable as economic Parties.
12. Success reset / failure preserve contract is followed.
13. Existing WHAT/WHERE/WHY/WHO independence and Portfolio consumption rules continue to pass.
