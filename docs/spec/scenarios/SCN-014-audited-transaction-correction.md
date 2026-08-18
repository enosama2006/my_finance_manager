# SCN-014 — Audited Transaction Correction

Status: **Approved correction invariant / Partially implemented across schema-v5 transaction families**
Date: 2026-08-18

## Intent
A user may discover that any field they entered is wrong and expects to correct it without fabricating a second real-world event or corrupting balances.

## Approved invariant
A correction is not a second economic event.

```text
Reverse old projection
→ Apply corrected user intent
→ Keep same LogicalTransaction ID
→ Increment version
→ Preserve previous version as TransactionRevision
```

A real later refund/reversal remains a separate linked Transaction because it actually happened later.

## Non-financial correction
Fields such as title, date/time, note, category, beneficiary and necessity can be revised without changing Asset quantities or Cost Basis when their semantics are non-financial.

## Financial correction
Schema-v5 prototype work has superseded the old schema-v4 rule that all financial fields are permanently locked.

For transaction kinds with a deterministic replay engine, user-entered financial fields may be corrected by reversing the old projection and replaying the corrected one.

Examples already covered or partially covered in the prototype include:
- opening state;
- income;
- expense;
- real transfer;
- asset purchase;
- some conversion/allocation flows.

The exact coverage is implementation status, not a limitation of the product principle.

## Safety boundary
If a transaction has downstream dependent effects that cannot yet be reversed losslessly, MyFinMan must refuse a local destructive edit and explain that sequential replay is required.

It must never mutate only the Ledger row while leaving:
- Asset quantity;
- OwnershipShares;
- CostBasisLots;
- Portfolio allocations;
- Positions/CapitalCycles;
- Claims/Liabilities;
- realized P/L
in the old state.

## Repeated-purchase refinement
Under ADR-005, one Asset may have several purchase transactions/lots. Correcting one purchase must reverse/replay **that purchase lot and its dependent allocation effects only**, not erase or rebuild unrelated later purchase lots incorrectly.

## UX
- edit control on user-created transactions;
- responsive modal/sheet;
- reason required;
- prior revisions visible;
- unsupported dependent-chain correction gives explicit refusal, never silent partial mutation.

## Acceptance
1. Same LogicalTransaction ID survives corrections.
2. Every prior version remains auditable.
3. Correction requires a reason.
4. Non-financial correction does not change financial projections.
5. Supported financial correction reverses old effects and replays corrected effects atomically.
6. Unsupported downstream chain is refused rather than partially mutated.
7. Correcting one repeated purchase preserves other purchase lots and transactions.
