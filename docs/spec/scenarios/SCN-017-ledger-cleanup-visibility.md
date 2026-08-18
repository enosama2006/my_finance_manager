# SCN-017 — Ledger Cleanup Visibility

Status: **Draft / Open UX debt — not verified as implemented on main**

## Intent
Cancelled/voided transactions remain in the audit trail, but the operational Ledger should be clean by default.

## Rules
- `voided` is never physically deleted from persisted audit history.
- operational Ledger may hide voided rows by default;
- explicit toggle shows voided/audit rows;
- hiding is presentation-only and has no financial effect;
- posted transactions remain visible;
- revisions remain available when voided transactions are shown.

## UX target

```text
الحركات النشطة     [default]
إظهار الملغاة      [toggle]
```

Optional filters may later distinguish posted/voided/corrected families without changing persisted truth.

## Acceptance
1. Voided transaction remains persisted.
2. Default operational view can omit it.
3. User can explicitly reveal it and its revisions.
4. Toggle changes no Asset quantity, Cost Basis, Portfolio allocation or Ledger status.

## Rationale
The user can clean day-to-day operational noise while preserving financial traceability.
