# ADR-008 — Canonical financial facts and rebuildable projections

Status: **Approved direction / first implementation slice**
Date: 2026-08-18
Related: #56, SCN-018, SCN-025

## Context

MyFinMan is user-entered personal finance software, not a bank feed that can assume every posted input is immutable truth. Real use exposed a critical distinction:

- a user may discover that a historical input such as an Opening Balance was wrong;
- later real transactions may be correct;
- creating a fake balancing transaction to make the current balance match would falsify economic history;
- refusing correction merely because later transactions exist traps a known wrong fact in the system.

The prototype currently persists both Ledger transactions and materialized financial state (`Holding.quantity`, ownership, CostBasisLots, portfolio slices, etc.). These materialized values are useful for fast reads, but they must not become an independent competing source of financial truth.

## Decision

### 1. Effective financial facts are canonical

Posted financial events plus their current audited revisions are the canonical economic facts.

A correction changes the **effective version of the same logical fact** and appends audit history. It does not create a new economic event merely to compensate for the old wrong input.

```text
Logical Opening Transaction
├── v1: 75.09 USD
└── v2: 65.09 USD  ← effective corrected fact
```

### 2. Balances and positions are projections

Values such as current balance/quantity are derived state:

```text
Effective financial facts
        ↓
Projection / Replay
        ↓
Current quantity / ownership / cost basis / portfolio views / reports
```

Persisted projection fields are allowed for performance and current implementation simplicity, but they are **materialized projections**, not a second financial truth.

A valid projection must be reproducible from canonical facts plus explicitly modeled non-Ledger state where applicable.

### 3. Correction never fabricates balancing activity

If the user says an Opening was entered 10 USD too high:

```text
Opening 75.09 → correct to 65.09
```

MyFinMan must not create:

- `-10 USD` expense;
- fake transfer;
- fake reconciliation;
- synthetic income/refund.

Those events did not happen.

Instead the Opening fact is revised and affected projections are recalculated.

### 4. Later real transactions remain the same facts

If history is:

```text
Opening +75.09
Transfer -40.00
```

and Opening is corrected to 65.09, the transfer is not voided or recreated. Its Transaction ID, amount, timestamp and audit history remain unchanged.

The projected current balance becomes:

```text
65.09 - 40.00 = 25.09 USD
```

### 5. Correction and Reconciliation are different

**Correction** means a known historical user input was wrong.

**Reconciliation** means the known events are believed correct but an unexplained difference exists against an external observed balance.

Only the latter may justify a real reconciliation adjustment.

### 6. Projection scope will expand incrementally

This ADR is broader than the first implementation slice.

The first verified slice is Opening correction on the same `Asset + Owner` after later movements. It uses the already-materialized non-opening movement and updates the projection by replacing only the Opening contribution.

Future slices should generalize deterministic replay/reprojection for:

- purchases and CostBasisLots;
- income/distributions;
- expenses;
- cash transfers and FX;
- conversions/sales;
- ownership effects;
- Portfolio allocations;
- realized P/L and related derived reporting.

Until a projection family has deterministic replay, destructive correction must fail safely rather than invent facts.

## Invariants

1. No fake economic event may be created solely to correct a previously wrong user input.
2. A corrected logical transaction keeps its identity and adds a revision.
3. Later unaffected transaction identities remain stable.
4. Current balance is a derived result, not an independently editable financial truth.
5. Unknown historical Cost Basis remains unknown unless the user provides a historical fact.
6. Materialized projections must be rebuildable or explicitly recognized as transitional technical debt.
7. UI pages, dashboards, Owner views, Group views and Portfolio views must consume the same projected financial truth and may not maintain separate balances.

## Consequences

- `reverse old event → replay all later events` is not required merely to fix an Opening amount on the same Asset/Owner.
- A user can correct manual historical inputs without losing later activity.
- Auditability and usability no longer conflict: previous value remains in revisions while current reports use the corrected effective fact.
- A future relational SQLite schema should separate canonical event/revision storage from rebuildable projection tables or views.

## Verification

SCN-025 and `tests/opening-correction-projection.test.ts` verify the first implementation slice.
