# SCN-023 — Tree-first Parties, Portfolios, leaf actions and form lifecycle

Status: **Approved product scenario / implementation open**
Date: 2026-08-18
Related: ADR-006, #40, #41, #42, #43, #44

## Purpose
Validate that MyFinMan uses one consistent interaction grammar across hierarchical domains and does not force the user to rediscover flat-list, remote-form and stale-form problems screen by screen.

## Scenario A — same human as Owner and Beneficiary

The user creates `مراد` once in Party management.

Later:
- an Asset ownership share uses `ownerId = Murad`;
- a school Expense uses `beneficiaryId = Murad`.

Expected:
- one stable Party identity;
- no duplicate `Owner Murad` + `Beneficiary Murad` records;
- reports can filter by role while resolving the same Party;
- rename preserves both historical references.

## Scenario B — Party tree

Example navigation tree:

```text
الأطراف
├── الأسرة والأصدقاء          [structural container]
│   ├── أنا                   [Party leaf]
│   ├── نور                   [Party leaf]
│   └── مراد                  [Party leaf]
└── جهات/شركات                [structural container]
    └── شركة عائلية           [Party leaf]
```

A family/group/company that is itself an economic beneficiary/owner is represented as an actionable Party leaf. Membership such as `مراد عضو في الأسرة` is a relationship, not a requirement to turn the economic Party into a non-actionable folder.

Expected:
- selecting Owner/Beneficiary traverses tree to an eligible Party leaf;
- structural container cannot be submitted as a Party;
- same Party can play several roles.

## Scenario C — hierarchical Portfolio creation

User creates:

```text
استثمارات                     [branch]
├── دخل دوري                  [branch]
│   └── دخل الصناديق          [leaf]
└── نمو رأس المال             [branch]
    └── نمو طويل الأجل        [leaf]
```

Expected:
- parent chosen with cascader during create/edit;
- cycle-safe reparent;
- branch totals roll up leaves;
- allocation targets a Portfolio leaf;
- reparenting changes WHY-organization only and creates no financial Transaction.

## Scenario D — expense categories follow the same grammar

```text
السكن                         [branch]
└── الخدمات                   [branch]
    ├── الكهرباء              [leaf]
    ├── الماء                 [leaf]
    └── الإنترنت              [leaf]
```

User posts an electricity expense.

Expected:
- selector ends at `الكهرباء`;
- `السكن` and `الخدمات` are roll-up containers, not direct posting targets by default;
- reports still aggregate to parent categories.

This supersedes older SCN-010 wording that allowed posting directly to any parent category.

## Scenario E — contextual Modal/Sheet CRUD

User is browsing a Portfolio or Party tree and clicks add/edit.

Expected:
- editor opens as Modal/Sheet;
- current path/breadcrumb is visible;
- cancel returns to the exact tree context;
- no remote-page scrolling is required;
- mobile uses a responsive full/near-full sheet.

## Scenario F — successful create/post clears the form

User creates a Portfolio, adds an Asset, posts an expense, or completes a purchase.

On success:
- success Toast appears;
- transient form fields are cleared;
- stale selected entity/quote/preview does not survive into a new operation;
- double-submit is blocked.

On validation or execution failure:
- user inputs remain;
- the user corrects the error without re-entering the form.

## Scenario G — cross-platform audit

A later implementation sweep checks all major selectors/forms.

Expected:
- no flat selector remains where a domain hierarchy exists and materially aids selection;
- no branch can be silently submitted where a financial leaf is required;
- no successful create/post form leaves stale data that can create an accidental duplicate;
- no tree CRUD forces a remote scroll form unless the workflow intentionally uses a full page.

## Core assertions

1. Tree-first is a reusable UX architecture, not one Asset-screen fix.
2. Branch/container nodes organize and roll up; eligible leaves receive operations.
3. Owner and Beneficiary are Party roles over one canonical Party identity.
4. Portfolio hierarchy is exposed in create/edit/select flows.
5. Party membership is distinct from Party navigation hierarchy when an aggregate Party is itself economically actionable.
6. Modal/Sheet CRUD preserves context.
7. Success resets; failure preserves.
8. Reparenting organizational nodes does not create financial events.
9. Parent rollups never double count descendant financial truth.
