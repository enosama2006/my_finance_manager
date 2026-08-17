# SCN-016 — User-correctable asset purchase

Status: Implemented / pending CI verification

## User reality
A user can enter a purchase incorrectly: wrong bank/source, wrong owner, wrong target account, amount, quantity, asset identity, date, fees, or physical location. Editing is a correction of recorded reality, not a new economic event.

## Decision
User-entered purchase data is correctable. A correction uses:

`Reverse old projection → Apply corrected user intent → Keep audit revision`

It MUST NOT create a fake transfer merely because the original target account was wrong.

## Model
- Group = user organization only.
- Account = real container/where the Holding lives.
- Holding = asset/value actually held.
- `LedgerTransaction.userInput` preserves the user-entered purchase intent separately from projected Holding/Ledger fields.
- Legacy schema-v4 snapshots are hydrated without posting a financial event.

## Correctable purchase fields
- source cash Holding/account (which bank/account was charged)
- owner
- amount paid
- target Account (where the asset is held)
- asset type
- asset name/symbol
- acquired quantity
- extra costs/fees
- current unit valuation entered/captured with the record
- physical location
- transaction title/note/date

## Void semantics
Deleting a purchase in UI means audited void:
1. restore the old source quantity/cost basis;
2. remove the asset Holding created by the purchase;
3. remove the open Position created only by that purchase;
4. retain the transaction as `voided` with revision reason.

No Ledger row is silently deleted.

## Safety boundary
Direct re-projection is allowed only when the purchased Holding has not subsequently been sold, transferred, split, or ownership-mutated. If later posted transactions reference that Holding, MyFinMan must refuse a local edit and require sequential replay from that point.

Legacy purchases tied to a Portfolio are also refused unless exact source-allocation projection metadata is available; the system must not guess how much funding came from allocated versus free liquidity.

## Legacy migration
For old asset purchases lacking `userInput`, infer only from existing authoritative references:
- source account from source Holding
- target account from target Holding
- owner/amount/quantity from Ledger
- asset identity and valuation from target Holding

Currency strings are normalized textually (for example malformed Arabic-diacritic prefixes around `SAR` become `SAR`) without financial effect.

## Acceptance tests
1. Correct target account: asset moves to corrected Account, source cash final result unchanged, no fake transfer.
2. Correct source bank/account: old source is restored and corrected source is charged.
3. Void mistaken purchase: source cash is restored; generated asset disappears; transaction remains as voided audit history.
4. Legacy transaction intent hydration changes no balances and normalizes malformed currency text.
5. Any later transaction referencing the purchased Holding blocks direct correction.
