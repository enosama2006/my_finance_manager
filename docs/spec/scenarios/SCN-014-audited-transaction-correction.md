# SCN-014 — Audited Transaction Correction

Status: **Implemented Prototype evidence / Approved audit direction**
Date: 2026-08-18

## Intent
A user notices that a posted movement has the wrong date, title, note, expense category, beneficiary, or necessity classification and expects to correct it from the Activity/Ledger screen without deleting history.

## Approved invariant
A correction is not a second real-world financial event.

The same Logical Transaction ID remains. Each correction increments `version` and stores the previous state as a `TransactionRevision` with a mandatory reason and timestamp.

## Prototype-safe editable fields
For all posted transactions:
- title;
- date/time;
- note.

For expenses additionally:
- ExpenseCategory;
- ExpenseBeneficiary;
- ExpenseNecessity.

These fields can be revised without changing posted asset quantities, ownership, cost basis, or portfolio consumption.

## Financial-effect fields — current schema-v4 limitation
The prototype MUST NOT silently edit:
- amount/value;
- source Holding/Account;
- target Holding/Account;
- source/target quantities;
- exchange rate;
- fees;
- Portfolio funding source/consumption;
- realized P/L;
- purchase/sale/conversion economic legs.

Reason: schema-v4 does not persist a complete reversible projection journal for every downstream effect (cost lots, portfolio slice consumption, positions/cycles, and later dependent transactions). Mutating those values in-place could make balances disagree with the Ledger.

The final target implementation should support atomic correction by reverting the old projection and replaying the corrected Logical Transaction and all dependent projections, or by deriving state from normalized transaction legs/event projections.

## UX
- Pencil action on each Ledger card.
- Responsive Modal/Sheet opens over the current list.
- Financial fields are visible but locked with an explanation.
- A correction reason is mandatory.
- Prior revisions are visible in the same dialog.
- Saving creates `vN+1` while retaining the same transaction ID.

## Acceptance
1. Changing an expense beneficiary does not change cash balance.
2. Changing a category does not change amount or source Holding.
3. Same transaction ID survives every correction.
4. Every prior version is retained.
5. Correction requires a reason.
6. Unsupported financial-effect edits cannot be performed through the safe editor.
