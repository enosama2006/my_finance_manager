# ADR-004 — Group → Asset model and full user data correction control

Status: **Approved / Implemented in schema-v5 refactor / Verification pending CI**
Date: 2026-08-18
Supersedes: ADR-003 account-container target model

## Context
The product originally separated Account from Holding, then added Place, then replaced Place with user-defined AccountGroup. Direct use exposed a conceptual problem: requiring every Asset to live under an Account manufactures fake containers for assets that are not actually held in an account, such as land, a vehicle, or physical gold.

The approved product principle is simpler:

> كل ما يملكه المستخدم أصل يختلف بالنوع والسلوك. الأصل هو الكيان المالي الذي تتم عليه الإضافة والخصم والشراء والبيع والتحويل والتقييم والتصحيح. المجموعة هي الحاوية التنظيمية الوحيدة للأصول.

The user also explicitly requires that any data they enter remain correctable because entry errors are normal.

## Decision
The canonical user-facing wealth hierarchy is:

```text
Group
├── Group
├── Asset
├── Asset
└── Group
    ├── Asset
    └── Asset
```

### Group
A Group is organizational only.

It may:
- have a name and description;
- have a parent Group;
- contain direct Assets and child Groups;
- be renamed or reparented;
- expose a recursive derived roll-up of descendant Asset values.

It MUST NOT have:
- quantity or balance;
- owner shares;
- cost basis;
- market valuation independent from descendants;
- portfolio allocation;
- financial ledger events.

Moving or renaming a Group never creates a Transaction.

### Asset
Asset is the canonical financial entity.

Examples:
- `الراجحي الجاري` — Asset kind `cash`, currency `SAR`, with optional institution/account-style metadata;
- `حساب الدولار` — Asset kind `cash`, currency `USD`;
- `ذهب 24` — Asset kind `metal`;
- `صندوق عالمي` — Asset kind `fund`;
- `أرض حلب` — Asset kind `real_estate`;
- `السيارة` — Asset kind `vehicle`.

An Asset carries the relevant truth:
- name/type/symbol/unit;
- owner and quantity;
- Cost Basis;
- current valuation;
- optional Group placement;
- optional type-specific metadata such as institution, last four digits, location, currency;
- portfolio purpose through allocation relations;
- financial transaction references.

**An Asset MUST NOT contain another Asset.**

### Account
`Account` is no longer part of the target user-facing domain hierarchy.

Schema-v4 Account records may remain temporarily for:
- importing existing user snapshots;
- legacy tests and compatibility paths;
- provenance while migration is stabilized.

Normalization migrates old `Account → Holding` placement into direct `Group → Asset` placement without changing quantities, ownership, Cost Basis or Ledger history.

No new user flow should require creating an Account before creating an Asset.

## User control rule
Any user-entered data must remain editable or removable.

The UI must distinguish:

### Organizational correction
Examples:
- rename Group;
- reparent Group;
- rename Asset;
- move Asset between Groups;
- change non-financial display metadata.

These operations do not create financial Transactions.

### Financial correction
Examples:
- wrong quantity/balance;
- wrong owner;
- wrong Cost Basis;
- wrong payment Asset;
- wrong purchase quantity/amount/fees;
- wrong expense source/category/beneficiary;
- wrong transfer source/target/amount.

These operations MUST preserve auditability by reversing/reprojecting economic effects or recording a reconciliation/revision. They must not silently mutate one number while leaving balances, Cost Basis or downstream state inconsistent.

### Delete
The user-facing action may say `حذف`, but financial records are not blindly removed.

- metadata-only entities may be removed/archived from active UI;
- a financial Transaction is reversed then marked `voided` when enough information exists;
- a purchased Asset with no downstream use may be deleted by voiding its purchase and restoring funding;
- a complex chain that cannot be safely reversed must refuse destructive deletion rather than corrupt state, until a type-specific Replay engine exists.

## Opening state
Initial Asset quantity is represented by one logical opening event for `Asset + Owner`.
Re-entering or correcting that opening value edits/reprojects the same logical opening state rather than stacking duplicates.

## Reporting currency
Asset quantity remains native. Reporting currency only changes valuation display/roll-up.
Example: `40 USD` remains 40 USD; with SAR reporting and USD/SAR 3.75, its roll-up value is 150 SAR.

## Invariants
1. Group is the only hierarchy/container in the wealth tree.
2. Asset never contains another Asset.
3. Group value is derived only from unique descendant Assets.
4. Asset relocation between Groups never mutates Ledger, ownership, quantity, Cost Basis or portfolio purpose.
5. Asset rename never creates a financial event.
6. Financial corrections must leave projected balances consistent with the corrected transaction history.
7. User-entered data must expose correction/removal controls appropriate to its semantics.
8. Delete of a financial event means reverse/void, not raw row deletion.
9. Legacy Account migration must not double count wealth.
10. Import of schema-v4 data must preserve existing user financial truth while normalizing to schema-v5.

## UX consequences
- Main navigation says `الأصول`, not `الأصول والحسابات`.
- Operations include `إضافة أصل`, not mandatory `إضافة حساب`.
- Purchase asks for source Cash Asset and target Group, not target custody Account.
- Expense asks for payment Asset.
- Transfers occur Asset → Asset.
- Assets page shows Group → Asset recursively and provides edit/delete actions on each Asset.
- Groups page manages hierarchy and Asset placement.
- Transaction editor provides full replay correction for currently supported user-entered transaction kinds.

## Compatibility note
Historical code names such as `Holding`, `AccountGroup`, `holdingId`, and `accounts` may remain internally during migration to avoid risky broad renames in the same financial refactor. Their target semantics are defined by this ADR, not their legacy identifiers.
