# MyFinMan Implementation Status

> Last reconciled: 2026-08-19. Authority order: docs/spec/decisions/ (ADRs + decision-log) → docs/spec/product/product-concept.md → docs/spec/domain/ → docs/spec/quality/invariant-gate.md → this document.
>
> V4 Foundation is preserved historically inside the code and prototype behavior; the target architecture is Group → Asset (ADR-004), canonical facts + rebuildable projections (ADR-008), tree-first UX (ADR-006), file-backed SQLite (ADR-007), instrument/asset/lot distinction (ADR-005), FX realization on cash exit (ADR-009). The consolidated product concept lives in `docs/spec/product/product-concept.md`.

---

## Session handover — pick up here

**Baseline right now on `main`:** commit `9fc48f7` (2026-08-19 evening).

**Invariant gate:** 17/18 green. `npm test` 99/99. Build clean.

**Only one red left:** `INV-020` sub-test 1 — «`does not create a second identity record for a person who is already a Party`». See §"Immediate next work" below.

### What the recent sessions accomplished

1. **Invariant gate closed 13 invariants** (out of 14 initial red). Each was one branch, merged with `--no-ff`:
   - `INV-001` — `roundQuantity` (12 dp) split from `roundMoneySar` (2 dp). RULE-023.
   - `INV-002` — `addExistingAsset` persists exact `totalCostBasisSar`. RULE-023 / ADR-005.
   - `INV-013` — FX rate stored exactly as `source/target`, no rounding. ADR-007 §5.
   - `INV-014` — conversion into an existing asset appends a lot instead of duplicating. RULE-022 / DEC-024.
   - `INV-020` sub-test 2 — beneficiary mirrored into `state.parties`. RULE-027.
   - `INV-021` — absent `custodianId` treated as owner custody. RULE-002/014.
   - `INV-022` — net worth includes qualifying open claims. CALC-011.
   - `INV-023` — `addExistingAsset` no longer requires a legacy Account. DEC-021 / ADR-004.
   - `INV-003, INV-010, INV-011, INV-012` — one coordinated fix under ADR-009 (FX cash exit realizes).

2. **ADR-009 written and adopted** — resolves the ADR-007 §6 vs CALC-015 contradiction. Cross-currency Cash → Cash movements realize on the source and re-establish target basis at market. Same-currency Cash → Cash still carries basis. Base currency (SAR) unit basis = 1 by RULE-024.

3. **Documentation consolidated:**
   - `docs/spec/product/product-concept.md` created (canonical product doc: dimensions, rules, all 25 scenarios, superseded ideas).
   - Deleted: `docs/architecture-v4.md`, `docs/domain-rules.md`, `docs/cash-model-note.md`, `docs/spec/product/product-definition.md`.
   - Updated: README, VIBE_CODING_GUIDE, spec README, decision-log (DEC-027), invariant-gate matrix.

4. **UX improvement — preserve context on successful entry:**
   - New `src/components/SuccessDialog.tsx` (blocking modal with Enter/Escape to dismiss).
   - Every operations form (purchase, transfer, add asset, funds, portfolio, allocate, spend expense) now distinguishes **context fields** (kept — accounts, portfolios, categories, owner) from **per-entry fields** (cleared — amounts, quantities, titles).
   - Purpose: rapid back-to-back entries between the same source/target without re-selecting.
   - **Manual UI verification pending** — code compiles and dev server boots clean, but no automated coverage of the interactive flow. Recommend a click-through before treating this as fully verified.

### Immediate next work

**`INV-020` sub-test 1 — Full Party ⇔ Beneficiary unification (Family C).**

The current partial fix mirrors newly created beneficiaries into `state.parties` (sub-test 2 green). Sub-test 1 requires the deeper change: when the user creates a beneficiary whose name matches an existing Party, reuse the existing Party's id instead of minting a new one.

This is a multi-file schema-shaped change, hence "Family C" in the earlier triage:

- `src/domain/types.ts` — decide whether `ExpenseBeneficiary` should keep its own store or become a role over a `Party` id. RULE-027 favors the latter.
- `src/application/expenses.ts` — `createExpenseBeneficiary` needs to look up matching Party by normalized name and, if found, wire the beneficiary to that Party id.
- Any UI listing beneficiaries — must resolve labels through Party if the storage shape changes.
- Migration path if `ExpenseBeneficiary` type/rows change shape.

**Suggested first step:** write a short design note in `docs/spec/decisions/` proposing the exact shape (either keep ExpenseBeneficiary as a projection over Party, or drop it entirely and use Party+role tag). Present the two options to the user before coding.

### After INV-020 is fully green

Suggested queue (each its own branch, spec-referenced):

1. **Reconciliation UI** — `netWorthByOwner` truth vs. externally observed balance. CALC-019. Blocking for real-world use.
2. **Credit-card purchase/payment split** — CALC-023, DEC-012. Needed for a common personal-finance case.
3. **Income category tree** — mirror the expense category tree for income streams.
4. **ADR-008 §6 replay expansion** — deterministic reprojection for purchases, income, expenses, conversions (not only opening balance).
5. **Settlement solver / clearing** — `Claim` matching, debt-pair netting.
6. **AI intake gate** — OCR/SMS/CSV parse → structured draft → user approval → deterministic post.

### What NOT to do next session

- Do not re-introduce Account as a mandatory layer (ADR-004 / DEC-021 killed it).
- Do not edit any file inside `tests/invariants/` to make a red invariant pass. Rule 1 of `CLAUDE.md`.
- Do not carry historical basis on a cross-currency cash movement — ADR-009 fixed this to realize.
- Do not restore the retired docs (`docs/architecture-v4.md`, etc.). They were consolidated into `product-concept.md`.

---

## Target-architecture readiness

| Area | Status | Notes |
|---|---|---|
| Mobile-first Presentation | ✅ | Phone shell + bottom navigation |
| Owner / Custody separation | ✅ | OwnershipShare + custodian lens (INV-021 GREEN) |
| Group → Asset hierarchy (ADR-004) | ✅ Foundation | Group is organizational only; Asset carries quantity |
| Legacy Account layer | ⚠️ Superseded (ADR-004 / DEC-021) | Still present in code as compatibility; no target flow requires it. INV-023 GREEN. |
| Unified Portfolio Tree | ✅ Foundation | Portfolio + PortfolioSlice, parent rollup without duplication |
| Available vs Physical | ✅ | Derived from unallocated native slices |
| Asset taxonomy / valuation | ✅ Foundation | Expanded kinds + valuation method/source/time |
| Native quantity precision (RULE-023) | ✅ | INV-001/INV-002 GREEN: `roundQuantity` (12 dp) separated from `roundMoneySar` (2 dp); lot basis stored exactly. |
| Cost basis / conversion P&L | ✅ Foundation | Weighted-average per owner, unknown-cost boundary observed. INV-010/011/012 GREEN under ADR-009. |
| FX realization on cash exit (ADR-009) | ✅ | INV-003 GREEN. Cross-currency Cash → Cash realizes; base currency unit basis = 1. Same-currency Cash → Cash unchanged. |
| Conversion respects portfolio protection | ✅ | Cannot consume allocated quantity without selecting its portfolio |
| No duplicate asset on conversion (RULE-022) | ✅ | INV-014 GREEN. Conversion into existing asset appends a lot. |
| Canonical facts + rebuildable projection (ADR-008) | 🟡 First slice | Opening-correction reprojection (SCN-025) implemented. Full replay across cost lots / ownership / slices / P&L pending. |
| File-backed SQLite (ADR-007) | ✅ | Migration + FX cash transfers implemented (SCN-024). Awaits real-use verification. |
| Claims in net worth (CALC-011) | ✅ | INV-022 GREEN. |
| Party unification (RULE-027) | 🟡 Partial | Sub-test 2 GREEN (beneficiary mirrored into `parties`). Sub-test 1 RED — full de-duplication against existing Party by name pending. |
| Success-dialog UX pattern | 🟡 Awaiting manual verification | Forms preserve source/target/portfolio/category context on success; per-entry fields cleared. Compile-clean; not yet click-tested end-to-end. |
| Liabilities / Credit cards (CALC-023) | 🟡 Model | Liability entity subtracts from net worth; purchase/payment use cases still pending. |
| Income streams (CALC-022) | 🟡 Model | Expected status exists and never auto-posts; posting workflow pending. |
| Real Transfer semantics | ✅ | Same-currency carries basis; cross-currency realizes per ADR-009. |
| Asset Purchase/Sale | 🟡 | Simplified purchase implemented (`purchaseAssetSimplified`); dedicated sale flow pending. |
| Settlement / Clearing gaps | 🔴 Pending | Type-matched solver and debt-pair matching required. |
| Transaction Correction/Revisions | 🟡 Model | Revision structure exists; atomic dependent-effect reprojection pending broader ADR-008 §6 rollout. |
| Reconciliation | 🔴 Pending | Calculated vs observed diff + known-correction / unknown-adjustment UI required. |
| Categories | 🟡 Foundation | Expense category tree exists; income category tree pending. |
| AI Intake | 🔴 Pending | Draft extraction / matching / duplicate gate not started. |

## Invariant gate — current signal

Added 2026-08-18. Last measured 2026-08-19 on `main`.

```
npm test                 99 / 99   GREEN  (behavioural suite of the disposable prototype)
npm run build            GREEN
npm run test:invariants  17 / 18   GREEN
```

Green: INV-001, INV-002, INV-003, INV-010, INV-011, INV-012, INV-013, INV-014, INV-020 (sub-test 2), INV-021, INV-022, INV-023, INV-030.
Red: INV-020 sub-test 1 only.

Full matrix and per-invariant meaning: `docs/spec/quality/invariant-gate.md`.

## Cycle 1 completion — what still blocks it

Party unification full (INV-020 sub-test 1); Income category tree; Reconciliation flow; Settlement solver; Credit-card purchase/payment split; Deterministic replay for all transaction families (ADR-008 §6); AI intake gate; UI verification of the new success-dialog pattern.

## Foundation tests implemented (behavioural baseline, still green)

- Account digital-twin total (legacy path, kept for compatibility).
- Portfolio tree rollup without duplication.
- One portfolio spanning multiple containers.
- Available derived from unallocated native quantities.
- Ownership-share physical quantity invariant.
- Cost-basis lot coverage per owner.
- Different owners with different cost bases inside the same shared Asset.
- Third-party custody without ownership transfer.
- Valuation changes wealth without ledger movement.
- Conversion realized P/L.
- Protected portfolio quantities cannot be consumed silently.
- Portfolio purpose carries through a conversion by default.
- Weighted-average partial disposal preserves the remaining weighted cost basis.
- File-backed SQLite migration and FX cash transfer (SCN-024, ADR-007).
- Opening-correction reprojection without fake transactions (SCN-025, ADR-008).
- FX cash exit realizes and target basis re-established at market (ADR-009).
