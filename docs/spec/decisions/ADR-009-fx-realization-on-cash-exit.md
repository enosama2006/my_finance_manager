# ADR-009 — FX realization on cash exit

Status: **Approved**
Date: 2026-08-19
Related: ADR-007 §6 (partially superseded), CALC-015, CALC-016, RULE-024, DEC-026, INV-003, INV-010, INV-011, INV-012

## Context

Two Approved documents encode opposite policies for the same economic event — a cash-to-cash movement between two currencies:

- **ADR-007 §6** says the transfer *carries* the source historical basis onto the target Cash Asset. No realized P/L is posted merely because the currency label changed.
- **CALC-015 / CALC-016** say any exit into cash is a *disposal event*: cash-in minus fees minus disposed cost basis = realized P/L, and the target cost basis is re-established on the market side.

The two paths in the current prototype exhibit this split literally:

- `transferBetweenAssets` implements ADR-007 §6 — carries basis, and (worse) also posts a realizedGainLossSar computed against the source basis, so both effects apply at once.
- `applyManagedConversion` implements CALC-015 — realizes P/L when the target is cash and re-establishes target basis on market value.

The result is four failing invariants:

- **INV-003** — after `USD → SAR`, the target `SAR` Asset acquires a synthetic unit cost of `~0.933 SAR per SAR`, violating RULE-024 (the reporting/base currency has a unit basis of exactly 1).
- **INV-010** — the same event both carries basis and posts realized P/L.
- **INV-011** — `realizedProfitByOwner` only sums `conversion`/`asset_sale`, but a `real_transfer` on the ledger also carries a `realizedGainLossSar`, so the "ledger sum" and the "reported realized profit" disagree.
- **INV-012** — the transfer door and the conversion door produce two different resulting SAR cost bases for the same USD→SAR economic event.

RULE-024 is the constraint that decides the question. If the base currency must always have a unit basis of exactly 1, then any target Cash Asset priced in the base currency **cannot** silently carry a different unit cost — the carry-basis policy is mathematically incompatible with RULE-024 whenever the target currency is the base currency, and by symmetry across any base-currency conversion.

## Decision

**Every cash exit realizes.** A cash-to-cash cross-currency movement is a real disposal event, not a mere denomination change.

Specifically:

1. Same-currency Cash → Cash transfer is a **Real Transfer**. Basis is carried; no realized P/L. Unchanged from ADR-007 §6 same-currency case.

2. **Cross-currency Cash → Cash movement is a Conversion.** It follows CALC-015 / CALC-016:
   - Target cost basis = target quantity × target unit market value at execution (fees allocated per CALC-016).
   - Realized P/L = target market value − fees − source disposed basis.
   - Source lots reduce per CALC-013 (weighted-average partial disposal).

3. When the target is the **base currency (SAR)**, target unit market value is 1 by RULE-024. This makes the SAR target basis equal to the received SAR quantity, which is the invariant INV-003 checks.

4. `realizedGainLossSar` is populated on the ledger transaction. There is one canonical answer to "what realized profit did this event produce," and every lens must agree with it (ADR-008 §7).

5. **ADR-007 §6 is superseded** for the cross-currency case only. Everything else in ADR-007 (SQLite ownership, migration, target-vs-rate input, correction/void replay of both legs) remains in force.

## Invariants

1. Same-currency Cash Transfer preserves basis and posts no realized P/L.
2. Cross-currency Cash Transfer follows CALC-015/016 — realizes on the source side, re-establishes basis on the target side at market.
3. The base currency (SAR) always has a unit basis of exactly 1 (RULE-024, unchanged).
4. `realizedProfitByOwner(state, owner) = Σ tx.realizedGainLossSar` across every posted transaction (any kind) belonging to `owner`. One truth per event.
5. The transfer door and the conversion door on the same economic input produce identical cost basis, ownership, realized P/L and target market value.

## Consequences

1. Users see a small realized P/L when they exchange currencies. This matches how the movement actually behaves economically (they took a position on the FX rate, and the difference between the historical entry cost and the current exchange rate becomes a realized fact when they exit into another currency).
2. `transferBetweenAssets` no longer carries source basis onto a foreign target; it posts a realized-P/L on the ledger and gives the target Asset a fresh basis at market.
3. `realizedProfitByOwner` (or its equivalent read) must consider every transaction kind that can carry `realizedGainLossSar`, not only `conversion`/`asset_sale`. Alternatively, the cross-currency transfer must be reified as a `conversion` — implementation choice, semantics fixed.
4. Reversal/void of a cross-currency transfer follows ADR-007 §7 (both legs replay) — nothing new.
5. Correction of a cross-currency transfer amount or rate now reprojects the realized-P/L result too, per ADR-008.
6. Behavioural tests that previously asserted "basis carried" for USD→SAR must move to the invariants folder (if they encoded a target rule) or be updated (if they encoded the old prototype behavior).

## Non-goals

- This ADR does not touch same-currency transfers.
- It does not decide the UI copy for the resulting realized-P/L line item.
- It does not auto-fetch FX rates. The user still enters source amount and target amount (or source amount and rate).
- It does not change the definition of Real Transfer for same-asset custody moves.

## Verification

- **INV-003** — `USD → SAR` at 3.75 leaves the received SAR Asset with unit basis = 1 and total basis = received SAR quantity.
- **INV-010** — the same event either carries basis (same currency) or realizes (cross-currency), never both. Assertion: not (`realizedGainLossSar ≠ 0` AND target basis is carried from source).
- **INV-011** — `realizedProfitByOwner(state, owner) === Σ posted tx.realizedGainLossSar for owner`.
- **INV-012** — `transferBetweenAssets` and `applyManagedConversion` produce identical `ownerCostBasisSar` on the target Asset for the same source, quantities and execution rate.
