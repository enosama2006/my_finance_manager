# SCN-015 — Single Opening State, Correction, and Safe Void

Status: **Approved product rule / Implemented for common Asset opening flows**
Date: 2026-08-18

## User problem
Opening state is easy to submit more than once during onboarding. Because it changes real Asset quantity, deleting only a Ledger row would leave financial state wrong.

## Approved rule
An opening is **state initialization**, not recurring Income.

For one:

```text
Asset instance + Owner
```

there must be at most one active logical opening state for the same initialized quantity context.

The historical schema-v4 key using `Account + Owner + Asset/Symbol` is superseded by the direct Asset model.

## Correction
If the user entered the opening quantity incorrectly, correction adjusts the Asset projection to the desired state and preserves revision audit.

Legacy duplicate opening rows are consolidated/voided where deterministic and safe.

## Delete semantics
User-facing `حذف` means:
- reverse the opening projection;
- mark the LogicalTransaction voided;
- keep audit reason/history.

A financial row is never hidden/deleted without reversing its effect.

## Foreign-currency opening
Native quantity and historical Cost Basis are independent facts.

Example:

```text
Asset quantity = 6,645 USD
Current reporting valuation = 3.75 SAR/USD
```

The historical acquisition basis must be:
- actual user-provided basis/rate if known; or
- unknown if not known.

The system MUST NOT invent `1 SAR/USD` simply because the native quantity is 6,645 USD.

Reporting/current FX valuation never rewrites historical basis.

## UX
1. Detect existing opening for selected Asset + Owner.
2. Switch to correction instead of stacking another active opening.
3. Success toast and reset transient fields.
4. Failure keeps user input.
5. Prevent double-submit.
6. Ledger exposes audited void where safely reversible.

## Acceptance
- submitting opening twice does not create two active opening states;
- correction adjusts Asset quantity rather than stacking another balance;
- void reverses quantity and retains audit;
- recurring Income remains repeatable;
- foreign-currency opening supports unknown basis;
- current FX/reporting value does not fabricate historical Cost Basis.
