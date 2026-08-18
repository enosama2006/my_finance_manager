# SCN-020 — Hierarchical Account Cascader

Status: Implemented

## Decision
All user-facing account selection in financial operations must follow the active AccountGroup tree instead of a flat account list.

## UX
- Level 1 shows all active root account groups.
- Selecting a group reveals the next level with active child groups and eligible direct accounts.
- Child groups may be traversed recursively.
- Empty groups remain visible so the organization created by the user is never hidden.
- An account is the terminal selectable node.
- Accounts with no group are available through a synthetic `بدون مجموعة` root.
- Breadcrumb shows the selected path.

## Invariants
- Cascading changes selection UI only; it creates no ledger entry and changes no balances.
- Eligibility filters may hide accounts, but must never hide active groups.
- A group itself cannot be submitted where an Account ID is required.
- Account order is deterministic within each level: groups first, then accounts, preserving the user's hierarchy instead of flattening paths into labels.

## Coverage
The same cascader should be used for existing-asset registration, purchase source/target accounts, adding funds, and transfers.
