# SCN-018 — User correction principle

Status: Draft / Implemented incrementally

## Principle
Any datum explicitly entered by the user must be correctable later. A financial correction must not silently mutate only the Ledger row when projected balances, holdings, cost basis, ownership, portfolio allocation, positions, liabilities, or realized P/L are affected.

## Correction model
`Reverse old projection → Apply corrected user intent → Preserve revision audit`

## Distinction
- Correction: fixes an originally mis-entered fact; it is not a new economic event.
- Real transfer/trade/payment: records a later real-world event and remains a new transaction.

## Current coverage
- Opening balance: amount correction and safe void.
- Asset purchase: audited correction/reprojection and safe void when the resulting asset has no dependent downstream transaction.
- Other transaction kinds remain under staged reprojection support and must not accept unsafe financial-field mutation.
