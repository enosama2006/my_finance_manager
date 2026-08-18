# MyFinMan Foundation V4 — Implementation Status

> Architecture audit: 2026-08-16. Authority: latest user decisions → Domain Invariants V4 → Project Reference V4 → Foundation Rebuild Brief V4 → implementation.

| Area | Status | Current implementation |
|---|---|---|
| Mobile-first Presentation | ✅ | Phone shell + bottom navigation |
| Owner / Custody separation | ✅ | OwnershipShare + custodian/account + third-party custody lens |
| Real Accounts digital twin | 🟡 Foundation | Account entity, status, observed/opening fields, account totals; CRUD/reconciliation UI pending |
| Unified Portfolio Tree | ✅ Foundation | Portfolio + PortfolioSlice, parent rollup without duplication |
| Available vs Physical | ✅ | Available derived from unallocated native slices, not net worth minus targets |
| Asset taxonomy / valuation | ✅ Foundation | Expanded kinds + valuation method/source/time |
| Cost basis / Conversion P&L | ✅ Foundation | Owner-specific CostBasisLots with weighted-average policy; unknown cost yields unknown realized P/L |
| Conversion respects portfolio protection | ✅ | Cannot consume allocated quantity without selecting its portfolio; purpose can carry to target |
| Liabilities / Credit cards | 🟡 Model | Liability exists and subtracts from net worth; purchase/payment use cases pending |
| Claims / receivables | 🟡 Model | Claim exists; relationship UI and settlement pending |
| Income streams | 🟡 Model | Expected status exists and does not post automatically; posting workflow pending |
| Real Transfer | 🔴 Pending | Domain use case + UI + tests required |
| Asset Purchase/Sale | 🔴 Pending | Dedicated acquisition/disposal flows required |
| Settlement / Clearing gaps | 🔴 Pending | Type-matched solver and debt pair required |
| Transaction Correction/Revisions | 🟡 Model | Revision structure exists; Atomic financial reprojection + Preview pending |
| Reconciliation | 🔴 Pending | Calculated vs observed + known correction/unknown adjustment UI pending |
| Categories | 🔴 Pending | Expense/Income category trees pending |
| AI Intake | 🔴 Pending | Draft extraction/matching/duplicate gate pending |

## Invariant gate — added 2026-08-18

`npm run test:invariants` enforces the approved specification directly. It is currently **RED (14/18)**: the behavioural suite passes while the financial core violates RULE-023, RULE-011, RULE-027, RULE-002/014, CALC-011, ADR-007 §5/§6, ADR-008 Invariant 7 and DEC-021.

Full matrix and the meaning of each failure: `docs/spec/quality/invariant-gate.md`.

Feature work on #34/#36/#37 should not resume while the affected invariant families are red.

## Foundation tests implemented

- Account digital-twin total.
- Portfolio tree rollup without duplication.
- One portfolio spanning multiple real accounts.
- Available derived from unallocated native quantities.
- Ownership-share physical quantity invariant.
- Cost-basis lot coverage per owner.
- Different owners with different cost bases inside the same shared Holding.
- Third-party custody without ownership transfer.
- Valuation changes wealth without ledger movement.
- Conversion realized P/L.
- Protected portfolio quantities cannot be consumed silently.
- Portfolio purpose carries through a conversion by default.
- Weighted-average partial disposal preserves the remaining weighted cost basis.

## Still required before Cycle 1 can be called complete

Real Transfer; Existing Asset onboarding; New Purchase/Sale; negative Clearing + future payoff; type-matched settlement; Credit Card purchase/payment separation; Atomic transaction correction and dependent-effect reprojection; reconciliation known-vs-unknown; AI duplicate detection and approval gate; category trees and mapping.

The current code is therefore **aligned to the V4 architecture**, but this document deliberately does not claim that the whole Cycle 1 feature set is complete.
