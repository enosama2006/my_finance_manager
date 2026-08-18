# SCN-020 — Hierarchical Financial-Source Cascader — Superseded Terminal Type

Status: **Original Account terminal Superseded / UX pattern retained / Group -> eligible Asset replacement planned in Issue #33**

## Historical decision
The first implementation preserved AccountGroup hierarchy and used Account as the terminal selectable node.

That terminal type is obsolete after ADR-004 because Account is no longer a mandatory target-domain object.

## Current decision
Financial operations that choose an existing source/destination Asset should navigate:

```text
root Group
→ child Group
→ ...
→ eligible Asset
```

Group is navigation only. Asset is the terminal selectable financial object.

## UX rules retained
- show all relevant active root Groups;
- selecting a Group reveals child Groups and eligible direct Assets;
- recurse arbitrarily;
- preserve empty Groups where useful so user-created organization does not disappear;
- show a clear empty/no-eligible-Asset state inside a branch;
- no automatic selection of first Asset;
- Breadcrumb shows selected path;
- deterministic Arabic sorting;
- operation-specific eligibility predicate decides which Assets are terminal choices.

Examples:
- Purchase payment source -> Cash Assets with available quantity;
- Expense source -> eligible Cash Assets;
- Transfer source/target -> compatible Cash Assets;
- Repeated purchase destination -> existing compatible investment Asset;
- Portfolio allocation -> owner-eligible Asset.

## Invariants
- Cascader changes selection UI only;
- it creates no Ledger event;
- it changes no Asset/Group/Portfolio relation merely by browsing;
- Group can never be submitted where an Asset ID is required.

## Tracking
Reusable `GroupAssetCascader` / equivalent is tracked by Issue #33.
