# SCN-017 — Ledger cleanup visibility

Status: Draft / Implemented on feature branch

## Intent
Cancelled/voided transactions remain in the audit trail, but the operational ledger should be clean by default.

## Rules
- `voided` is not physically deleted from persisted audit data.
- The Ledger UI may hide voided transactions by default and expose an explicit toggle to show them.
- Hiding is presentation-only and has no financial effect.
- Posted transactions remain visible.
- Audit revisions remain available when voided transactions are shown.

## Rationale
The user must be able to clean mistaken entries without cluttering the day-to-day ledger while preserving traceability.
