# ADR-006 — Tree-first UX, unified Parties, leaf actions, contextual Modal/Sheet CRUD and form lifecycle

Status: **Approved product direction / implementation staged**
Date: 2026-08-18
Related issues: #40, #41, #42, #43, #44, #33, #35

## Context

Repeated real-use testing showed the same UX/domain problem in several areas:

- Assets/payment sources become unusable when shown as one flat list.
- Owner and Beneficiary are currently managed as if they were separate populations even though the same human/family/company can play both roles.
- Portfolio is already hierarchical in the domain but creation/selection can still feel flat.
- Expense/category and other taxonomies grow into trees and become difficult to edit from remote forms.
- successful create/post forms sometimes retain stale values and invite accidental duplicate submission.

The product has converged on a recurring structural pattern:

```text
Root
└── Branch / Container
    └── Branch / Container
        └── Leaf / actionable node
```

The tree is not a financial event. Branches organize, navigate and roll up. Real operations target an eligible leaf.

## Decision 1 — Tree-first is a platform-wide interaction principle

When a user-managed domain naturally supports hierarchy or can grow beyond a small flat list, MyFinMan must prefer a reusable tree/cascader interaction rather than a flat `<select>`.

Current/future applications include:

- Group -> Asset;
- Party management and Owner/Beneficiary selection;
- Portfolio hierarchy;
- Expense category hierarchy;
- future taxonomies and classification trees.

This does **not** mean all domain entities share one database table. It means they share one interaction grammar and similar self-join hierarchy rules where hierarchy is intrinsic.

### Reusable tree behavior

A tree manager/cascader should support:

- root -> child -> ... traversal;
- deterministic RTL ordering;
- expand/collapse;
- breadcrumb/current path;
- cycle prevention;
- rename/reparent/archive while preserving stable IDs/history;
- operation-specific eligibility predicates;
- derived parent roll-ups without double counting;
- responsive mobile/tablet/desktop behavior.

## Decision 2 — Branch nodes organize; operations target leaves

Default invariant:

> A branch/container organizes descendants. A real financial/classification operation resolves to an eligible actionable leaf.

Examples:

```text
Group branch -> Cash Asset leaf
Portfolio branch -> Portfolio leaf
Expense category branch -> Category leaf
Party container -> Party leaf
```

A branch cannot be silently submitted where a concrete Asset/Portfolio/Category/Party is required.

Parent totals are derived from descendant leaf facts and are not stored again as independent financial truth.

### Historical refinement

Earlier SCN-010 wording allowed an expense to be classified directly to any parent category. ADR-006 supersedes that default behavior: parent categories are organizational/roll-up nodes; posting should target a leaf category unless a later explicit rule defines a node as actionable.

## Decision 3 — Owner and Beneficiary are roles over one Party universe

`Owner` and `Beneficiary` are not separate identity domains.

The canonical identity is `Party`.

A Party may be used in different roles depending on the transaction/use case:

- Owner;
- Beneficiary;
- Custodian/provider;
- Creditor;
- Debtor;
- Counterparty;
- Mandate principal/recipient;
- other future relationship roles.

The same real person must not need duplicate records simply because they are both Owner and Beneficiary.

### Party kinds

Target Party kinds may include:

- self;
- person;
- family/household;
- people-group;
- company/organization;
- other legal/economic party.

### Party tree versus Party membership

A family/company/group may itself be an actionable economic Party. Therefore it must not be forced to become a non-selectable Folder merely because it has members.

Use two distinct concepts:

1. **Party tree/container placement** — optional organizational self-join used for navigation, e.g. `الأطراف -> العائلة والأصدقاء -> مراد`;
2. **Party membership/relationship** — separate relation when the product needs to say `مراد عضو في العائلة` or `فلان عضو/موظف في شركة`.

Under the leaf-action rule, structural Party containers are non-actionable; actual person/family/company/group Party records are actionable leaves. Membership does not require turning an economic Party into a branch container.

## Decision 4 — Portfolio hierarchy must be explicit in creation and selection

Portfolio already answers WHY and is hierarchical.

The UI must expose this fully:

```text
استثمارات
├── دخل دوري
│   └── غرض دخل الصناديق
└── نمو رأس المال
    └── غرض النمو
```

Rules:

- create/edit Portfolio with optional parent;
- reject cycles;
- branch Portfolios organize/roll up;
- allocations and financial operations target an eligible Portfolio leaf by default;
- parent totals are derived from descendants;
- moving/reparenting a Portfolio is purpose metadata and does not move Assets physically or create a Ledger event;
- Portfolio remains optional financial-purpose metadata, not provider/account context.

## Decision 5 — Contextual Modal/Sheet CRUD is the default tree interaction

When add/edit/reparent originates from a tree/list/context card, the user should not be sent to a remote form lower on the page.

Default interaction:

- desktop: Modal or side sheet according to field density;
- mobile/tablet: responsive full/near-full sheet where appropriate;
- current breadcrumb/path visible;
- cancel returns to the same tree position;
- edit opens prefilled for the selected stable entity;
- create never inherits stale edit data.

A dedicated full page is still allowed when the workflow is intrinsically large/multi-step; ADR-006 does not prohibit full pages, it prohibits accidental remote-form UX.

## Decision 6 — Universal success-reset / failure-preserve form lifecycle

Every create/post workflow follows the same lifecycle contract.

### On success

- show a clear success Toast/feedback;
- clear transient user-entered fields;
- reset preview/quote/loading/derived state tied to the completed operation;
- restore intentional defaults for a fresh operation;
- prevent accidental double-submit/repost;
- close or reset Modal/Sheet according to context.

### On validation/execution failure

- preserve user input;
- keep the form open;
- identify the error without forcing re-entry.

### Edit forms

- successful save returns to the selected context;
- edit state never leaks into the next create operation;
- financial edits continue to follow audited reverse/reproject rules rather than raw mutation.

Issue #35 remains the first concrete purchase-form bug; #43 generalizes the rule across the platform.

## Decision 7 — Self-join is a recurring implementation pattern, not a universal entity model

For intrinsic hierarchies, target persistence should support stable self-join parent identity, for example:

```text
Group.parentGroupId
Portfolio.parentPortfolioId
Category.parentCategoryId
PartyContainer.parentPartyContainerId   // exact schema TBD
```

The exact Party hierarchy/membership schema remains implementation design work under #41.

The rule is semantic:

- stable node identity;
- cycle-safe parent relation;
- no duplicate stored parent totals;
- leaf-target operations;
- reparent does not rewrite historical transaction identity.

Do not create a single generic `TreeNode` table that erases domain validation merely to reuse UI.

## Consequences

1. New feature work must check #40/ADR-006 before introducing a flat selector.
2. Owner and Beneficiary management converge on one Party manager.
3. Portfolio creation/selection becomes tree-native.
4. Expense categories move toward leaf-only posting by default.
5. Modal/Sheet CRUD and form reset become shared UX contracts rather than screen-specific polish.
6. Future audits must find remaining flat selectors and stale-form behaviors without waiting for the user to report each screen individually (#44).

## Non-goals

- This ADR does not merge Assets, Portfolios, Categories and Parties into one domain entity.
- It does not say every parent node is a financial balance.
- It does not make Party membership identical to Party navigation hierarchy.
- It does not change audited transaction correction rules.
- It does not itself implement the reusable React components.

## Acceptance for future implementation

- reusable tree/cascader primitives with domain-specific adapters;
- Party manager shared by owner/beneficiary selection;
- hierarchical Portfolio CRUD;
- branch/leaf eligibility enforcement;
- Modal/Sheet CRUD consistency;
- success reset + failure preserve tests;
- cycle prevention and no-double-count roll-up tests;
- RTL responsive behavior across mobile/tablet/desktop.
