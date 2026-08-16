# MyFinMan Foundation V4 — Implementation Status

| Area | Status | Current implementation |
|---|---|---|
| Mobile-first Presentation | ✅ | Phone shell + bottom navigation |
| Owner / Custody separation | ✅ | OwnershipShare + custodian/account + third-party custody lens |
| Real Accounts digital twin | 🟡 Foundation | Account entity, status, observed/opening fields, account totals; CRUD/reconciliation UI pending |
| Unified Portfolio Tree | ✅ Foundation | Portfolio + PortfolioSlice, parent rollup without duplication |
| Available vs Physical | ✅ | Available derived from unallocated native slices, not net worth minus targets |
| Asset taxonomy / valuation | ✅ Foundation | Expanded kinds + valuation method/source/time |
| Cost basis / Conversion P&L | ✅ Foundation | Weighted-average cost field; unknown cost yields unknown realized P/L |
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

## Required Foundation tests

Implemented now: account totals, portfolio rollup, one portfolio across accounts, available-from-slices, ownership quantity, third-party custody, valuation without ledger movement, conversion realized P/L, portfolio protection, portfolio-purpose carry-forward.

Still required before Cycle 1 can be called complete: Real Transfer, Existing Asset onboarding, New Purchase/Sale, negative clearing + payoff, type-matched settlement, Credit Card separation, Atomic transaction correction, reconciliation known-vs-unknown, AI duplicate/approval gate.
