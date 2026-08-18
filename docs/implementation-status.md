# MyFinMan Implementation Status

> Last reconciled: 2026-08-19. Authority order: docs/spec/decisions/ (ADRs + decision-log) → docs/spec/domain/ → docs/spec/quality/invariant-gate.md → this document.
>
> V4 Foundation is preserved historically inside the code and prototype behavior; the target architecture is Group → Asset (ADR-004), canonical facts + rebuildable projections (ADR-008), tree-first UX (ADR-006), file-backed SQLite (ADR-007), instrument/asset/lot distinction (ADR-005), FX realization on cash exit (ADR-009). The consolidated product concept lives in `docs/spec/product/product-concept.md`.

## Target-architecture readiness

| Area | Status | Notes |
|---|---|---|
| Mobile-first Presentation | ✅ | Phone shell + bottom navigation |
| Owner / Custody separation | ✅ | OwnershipShare + custodian lens |
| Group → Asset hierarchy (ADR-004) | ✅ Foundation | Group is organizational only; Asset carries quantity |
| Legacy Account layer | ⚠️ Superseded (ADR-004 / DEC-021) | Still present in code as compatibility; no target flow requires it. `addExistingAsset` no longer throws when Account is missing (INV-023 GREEN, 2026-08-19) |
| Unified Portfolio Tree | ✅ Foundation | Portfolio + PortfolioSlice, parent rollup without duplication |
| Available vs Physical | ✅ | Derived from unallocated native slices |
| Asset taxonomy / valuation | ✅ Foundation | Expanded kinds + valuation method/source/time |
| Native quantity precision (RULE-023) | ✅ | INV-001 GREEN, 2026-08-19: `roundQuantity` (12 dp) separated from `roundMoneySar` (2 dp). Fractional crypto/fund units preserved exactly. |
| Cost basis / conversion P&L | 🟡 Foundation | Owner-specific CostBasisLots with weighted-average; unknown-cost boundary observed. INV-002 GREEN 2026-08-19; INV-010/011/012 still RED — pending ADR-009 (see below). |
| Conversion respects portfolio protection | ✅ | Cannot consume allocated quantity without selecting its portfolio |
| Canonical facts + rebuildable projection (ADR-008) | 🟡 First slice | Opening-correction reprojection (SCN-025) implemented. Full replay across cost lots / ownership / slices / P&L pending. |
| File-backed SQLite (ADR-007) | ✅ | Migration + FX cash transfers implemented (SCN-024). Awaits real-use verification. |
| Party unification (RULE-027) | 🔴 | INV-020 RED — `expenseBeneficiaries` still a second identity store, no lookup against `parties`. |
| Claims in net worth (CALC-011) | 🔴 | INV-022 RED — `state.claims` not read by `netWorthByOwner`. |
| Custody-absence lens (RULE-002/014) | 🔴 | INV-021 RED — `undefined` custodianId is treated as third-party in `holdingsInThirdPartyCustody`. |
| FX policy / realization semantics | 🔴 Contradiction | Transfer path carries basis (ADR-007 §6); conversion path realizes to cash (CALC-015). Two policies for one economic event. See "Blocking decision" below. |
| Liabilities / Credit cards (CALC-023) | 🟡 Model | Liability entity subtracts from net worth; purchase/payment use cases still pending. |
| Income streams (CALC-022) | 🟡 Model | Expected status exists and never auto-posts; posting workflow pending. |
| Real Transfer semantics | 🟡 | `transferBetweenAssets` implements same-currency + FX transfer; realized-on-transfer flag under review pending ADR-009. |
| Asset Purchase/Sale | 🟡 | Simplified purchase implemented (`purchaseAssetSimplified`); dedicated sale flow pending. |
| Settlement / Clearing gaps | 🔴 Pending | Type-matched solver and debt-pair matching required. |
| Transaction Correction/Revisions | 🟡 Model | Revision structure exists; atomic dependent-effect reprojection pending broader ADR-008 §6 rollout. |
| Reconciliation | 🔴 Pending | Calculated vs observed diff + known-correction / unknown-adjustment UI required. |
| Categories | 🟡 Foundation | Expense category tree exists; income category tree pending. |
| AI Intake | 🔴 Pending | Draft extraction / matching / duplicate gate not started. |

## Invariant gate — current signal

Added 2026-08-18. Last measured 2026-08-19 on branch `fix/exact-quantity-precision`.

```
npm test               99 / 99   GREEN  (behavioural suite of the disposable prototype)
npm run build          GREEN
npm run test:invariants  8 / 18  GREEN  (10 RED)
```

Green: INV-001, INV-002, INV-023, INV-030.
Red: INV-003, INV-010, INV-011, INV-012, INV-013, INV-014, INV-020 (×2), INV-021, INV-022.

Full matrix and per-invariant meaning: `docs/spec/quality/invariant-gate.md`.

Feature work on #34/#36/#37 remains blocked until the red families are addressed. Fixes must change the model, never the invariant test.

## Blocking decision — FX realization policy (ADR-009 candidate)

INV-003, INV-010, INV-011, INV-012 are one knot. Two approved documents disagree:

- ADR-007 §6 — cash transfer between currencies **carries** the historical basis; no realized P/L until final disposal.
- CALC-015 / CALC-016 — a true disposal into cash **realizes** P/L and resets the target basis to market.

`transferBetweenAssets` encodes the first policy; `applyManagedConversion` encodes the second. RULE-024 (SAR unit basis always = 1) further constrains any answer. No pure code fix works without a spec ruling on which policy governs. This is the promised ADR-009 draft mentioned in the plan.

## Cycle 1 completion — what still blocks it

Party unification (INV-020); Claims contribution to net worth (INV-022); custody-absence lens (INV-021); FX rate direction & precision (INV-013); no-duplicate-asset on conversion (INV-014); FX realization ADR-009; Category income tree; Reconciliation flow; Settlement solver; Credit-card purchase/payment split; Deterministic replay for all transaction families (ADR-008 §6); AI intake gate.

## Foundation tests implemented (V4 baseline, still green)

- Account digital-twin total (legacy path, kept for compatibility).
- Portfolio tree rollup without duplication.
- One portfolio spanning multiple containers.
- Available derived from unallocated native quantities.
- Ownership-share physical quantity invariant.
- Cost-basis lot coverage per owner.
- Different owners with different cost bases inside the same shared Asset.
- Third-party custody without ownership transfer.
- Valuation changes wealth without ledger movement.
- Conversion realized P/L (behavioural, not yet invariant-clean).
- Protected portfolio quantities cannot be consumed silently.
- Portfolio purpose carries through a conversion by default.
- Weighted-average partial disposal preserves the remaining weighted cost basis.
- File-backed SQLite migration and FX cash transfer (SCN-024, ADR-007).
- Opening-correction reprojection without fake transactions (SCN-025, ADR-008).
