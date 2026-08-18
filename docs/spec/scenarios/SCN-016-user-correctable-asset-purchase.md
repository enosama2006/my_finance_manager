# SCN-016 — User-Correctable Asset Purchase

Status: **Approved correction direction / Existing-purchase replay implemented for simple cases / Repeated-purchase refinement pending**

## User reality
A purchase may be entered with the wrong source, owner, amount, Asset identity, quantity, Group placement, fees, date or valuation metadata. Editing is a correction of recorded reality, not a new economic event.

## Decision

```text
Reverse old purchase projection
→ Apply corrected user intent
→ Keep same LogicalTransaction ID
→ Preserve revision audit
```

No fake transfer is created merely because the original source or organization was wrong.

## Current target model
- source = Cash Asset;
- destination mode = `زيادة أصل موجود` OR `إنشاء أصل جديد`;
- Group is organization for a new/repositioned Asset, not a financial target account;
- InstrumentDefinition may identify the shared economic instrument;
- each purchase contributes an independently traceable CostBasisLot.

Legacy `sourceAccountId/targetAccountId` fields may remain only for migration/correction compatibility.

## Destination A — create new Asset
Use when the user intentionally starts a separate holding/context.

Effects:
- debit source Cash Asset;
- create target Asset;
- create exact purchase lot;
- establish ownership;
- optionally allocate to Portfolio/Position.

## Destination B — increase existing Asset
Use for DCA/repeated buying of the same chosen holding.

Effects:
- debit source Cash Asset;
- increase existing Asset quantity/ownership;
- append a new exact CostBasisLot;
- keep prior lots untouched;
- create a new purchase LogicalTransaction;
- do NOT manufacture a new Asset just because the purchase is new.

Manual instruments are never auto-merged by name/symbol alone. The user explicitly chooses the existing Asset; a future `instrumentId` may provide safe matching suggestions.

## Correctable purchase fields
Subject to dependency-safe replay:
- source Cash Asset;
- owner;
- amount paid;
- target existing Asset OR new-Asset intent;
- target Group for new/repositioned Asset;
- Instrument/type/identity metadata;
- quantity;
- extra costs/fees;
- date/title/note;
- valuation metadata captured with the transaction;
- relevant Portfolio/Position intent when exact reversible projection metadata exists.

## Void semantics
For an untouched purchase or independently reversible purchase lot:
1. restore source funding exactly;
2. remove that purchase's quantity/ownership effect;
3. remove that purchase CostBasisLot;
4. reverse its Portfolio/Position projection as applicable;
5. delete/archive target Asset only if no quantity/history remains and it was created solely by that purchase;
6. keep the LogicalTransaction as voided audit history.

Voiding purchase #2 into an Asset with purchase #1 must not delete purchase #1.

## Safety boundary
If later sale/transfer/ownership/settlement depends on the affected quantity and deterministic replay is unavailable, refuse local correction and require sequential replay.

## Acceptance
1. Correct source Cash Asset restores old source and charges corrected source.
2. Correct new-Asset Group does not create fake real transfer.
3. Repeated purchase can increase existing Asset and append one lot.
4. Void one repeated purchase preserves all unrelated lots/purchases.
5. Manual same-name Assets are not silently merged.
6. Legacy purchase hydration changes no balances.
7. Unsafe dependent chain is refused, not partially rewritten.
