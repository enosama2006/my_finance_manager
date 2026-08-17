# SCN-015 — Single Opening Balance, Correction, and Safe Void

Status: **Approved product rule / Implementing Prototype**
Date: 2026-08-18

## User problem
The same opening balance was submitted multiple times because the form did not clearly confirm success or clear its fields. Since an opening balance changes the actual Holding, deleting only the Ledger row would leave the financial state wrong.

## Approved rule
An opening balance is a **state initialization**, not recurring income.

For one `(Account + Owner + Asset/Symbol)` there MUST be at most one active opening-balance Logical Transaction.

If the opening balance was entered incorrectly, the user edits that opening balance. The application adjusts the underlying Holding by the difference and keeps an audit trail.

## Existing duplicate correction behavior
If legacy/prototype data contains multiple posted opening transactions for the same `(Account + Owner + Asset/Symbol)`, editing the opening balance consolidates them into one canonical active opening transaction and marks the redundant opening transactions as voided. The Holding is adjusted by:

`desired opening quantity - sum(current active opening quantities)`

No income is created.

## Delete semantics
The UI may say `حذف`, but a posted financial transaction is never silently removed from history. Internally deletion means **void/reversal**:
- reverse the transaction's financial effect where the projection is safely reversible;
- mark the Logical Transaction `voided`;
- retain its audit history and reason.

Opening-balance transactions are safely reversible because they only initialize/increase one Holding and optionally one portfolio slice.

Other transaction kinds require their own reversal/replay rules before deletion is enabled. A Ledger row must never be deleted without reversing its Holdings / Cost Basis / Portfolio / P&L effects.

## UX
1. Opening-balance form detects an existing opening for the selected Account + Owner + Symbol.
2. If one exists, the form switches from `إضافة الرصيد الافتتاحي` to `تعديل الرصيد الافتتاحي` and pre-fills the current opening quantity.
3. After a successful add/edit, show a prominent success Toast and clear transient fields.
4. Prevent double-submit while saving.
5. Ledger exposes `حذف/إلغاء` for opening balances, requiring confirmation and a reason; the underlying Holding is reduced accordingly.

## Acceptance
- Submitting an opening balance twice does not create two active opening transactions.
- Editing 3 accidental opening entries of 1,000 SAR into a desired 1,000 SAR reduces the Holding from 3,000 to 1,000 SAR and leaves one active opening transaction.
- Voiding the remaining opening transaction reduces the Holding to zero and marks the transaction voided without erasing audit history.
- Income remains repeatable and is not subject to the one-opening rule.
- A Ledger deletion can never be display-only if the transaction has financial effects.
