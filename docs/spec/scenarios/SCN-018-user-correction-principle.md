# SCN-018 — User Correction Principle

Status: **Approved product invariant / Implemented incrementally**

## Principle
Any datum explicitly entered by the user must remain correctable later.

The application must distinguish metadata correction from financial correction, but it must not trap the user with a known wrong fact merely because it was previously posted.

## Financial correction model

```text
Reverse old projection
→ Apply corrected user intent
→ Preserve same LogicalTransaction identity
→ Append revision audit
```

A financial correction must not silently mutate only one Ledger field when Assets, exact CostBasisLots, ownership, Portfolio allocations, Positions/Cycles, Claims/Liabilities or realized results are affected.

## Distinction
- **Correction:** fixes an originally mis-entered fact; not a new economic event.
- **Real transfer/trade/payment/refund:** a later real-world event; remains a new Transaction.
- **Organizational edit:** rename/reparent Group or rename/reorganize Asset; no financial Transaction unless the real financial/custody fact also changed.

## Current prototype coverage
Schema-v5 prototype has replay/void support for several common transaction families, including opening state and common income/expense/transfer/purchase paths.

Coverage remains staged for complex downstream chains, repeated-purchase lots, cross-owner settlement, mandates and acquisition chains.

The product invariant is broader than current implementation coverage.

## Delete principle
User-facing deletion of a financial event means audited reverse/void where deterministic. It never means raw deletion that leaves projected state behind.

If safe reversal is not yet available, refuse destructive deletion with a clear explanation.

## Acceptance
1. User-created metadata can be edited/reorganized.
2. Financial correction preserves audit and corrected projected truth.
3. Real later events remain separate from corrections.
4. Unsupported complex correction is refused safely rather than locking a wrong fact silently or corrupting projections.
