# MyFinMan — Decision Log

Status: **Living record**

This file records decisions so later sessions do not reopen or silently reinterpret them. Dates below are capture dates when exact original decision dates are not important.

## DEC-001 — Current application is a disposable prototype
Status: `Approved`

Decision:
- Current React/Vite website is a proof-of-concept used to validate theory, domain rules and UX.
- When architecture/specification mature, MyFinMan will be rebuilt cleanly.
- Future implementation is driven by `docs/spec/`, not by preserving prototype code structure.

Reason:
Avoid accidental architecture lock-in while still learning through a working app.

---

## DEC-002 — One financial reality, multiple independent lenses
Status: `Approved`

Decision:
Owner, beneficiary, Portfolio, Asset/Holding, Account/Custodian, Location, Cost Basis and Valuation are independent dimensions over one financial reality.

Consequence:
No duplicate wealth records simply to support different UI trees.

---

## DEC-003 — Portfolio and allocation are one unified concept
Status: `Approved`

Decision:
Do not maintain separate competing “Portfolio” and “Allocation” domain trees. Use hierarchical Portfolio plus PortfolioSlices of real Holdings.

Consequence:
Portfolio can span multiple accounts and asset classes without pretending money moved.

---

## DEC-004 — Ownership is independent from custody
Status: `Approved`

Decision:
An asset owned by User and stored by Ahmed remains User’s asset. Custodian does not acquire ownership.

Consequence:
Owner wealth uses OwnershipShares; custody/account/location are separate filters.

---

## DEC-005 — Claim is different from third-party physical custody
Status: `Approved`

Decision:
Specific 500g silver still owned by User and stored by Ahmed is a Holding in Ahmed custody. If Ahmed may use it and merely owes equivalent 500g, User instead has a Claim. Do not count both for the same economic right.

---

## DEC-006 — Realized P/L only on true conversion/disposal/sale
Status: `Approved`

Decision:
Valuation changes, custody movement, Real Transfer of same asset and Portfolio reallocation do not create realized P/L.

Asset A → Asset B conversion or true sale/disposal calculates realized result from actual consideration, fees and owner-specific cost basis.

---

## DEC-007 — Cost basis is owner-specific; current product method weighted average
Status: `Approved for prototype/product performance; tax policy may differ`

Decision:
Shared Holdings can contain different acquisition cost for different owners. Current method for realized product-performance calculation is weighted average per owner.

Consequence:
Never use one blended cost across owners. Unknown cost remains unknown.

---

## DEC-008 — Available means unallocated Holding quantity
Status: `Approved`

Decision:
Available is the Owner’s native Holding quantity not assigned to PortfolioSlices.

Not:
- bank balance;
- total net worth minus Portfolio targets;
- another owner’s free quantity.

---

## DEC-009 — Real Transfer is the only ordinary operation that changes where same-asset value sits
Status: `Approved`

Decision:
Moving SAR from Alinma to Alrajhi is Real Transfer. It changes physical/account location but not income/expense or realized P/L for principal.

Portfolio reallocation is purpose-only and must not fake such a transfer.

---

## DEC-010 — Expected income is planning, not wealth
Status: `Approved`

Decision:
Expected/late/missed income records do not increase account/Holding quantity. Only actual posted receipt does.

---

## DEC-011 — Transaction correction uses same logical identity + revision history
Status: `Approved`

Decision:
Fixing an entry error does not create a fake second financial event. Preserve one LogicalTransaction ID, append revision/audit history and atomically reproject dependent effects.

A real later Refund/Reversal remains a new linked Transaction.

---

## DEC-012 — Credit card liability is separate from expense and cash payment
Status: `Approved`

Decision:
Credit purchase creates Expense + Liability. Later card payment reduces cash + Liability and does not create the purchase Expense again.

---

## DEC-013 — Responsive single application
Status: `Approved`

Decision:
The final web product must adapt naturally to browser width:
- mobile when narrow;
- tablet composition in-between;
- professional full desktop web workspace when wide.

No separate business behavior or separate `/mobile` application. No final fixed phone frame on desktop.

---

## DEC-014 — Mobile navigation and desktop navigation represent same destinations
Status: `Approved direction`

Decision:
Primary semantic destinations: Home, Portfolios, Assets & Accounts, Activity, More. Quick Action is persistent/contextual. Asset Conversion is an operation, not necessarily a permanent final primary tab.

Exact visual navigation grouping may evolve through UX testing.

---

## DEC-015 — Documentation is source of truth for future Vibe Coding
Status: `Approved`

Decision:
Every meaningful feature must be documented by stable IDs and trace screen → action → use case → domain rules → calculations → persistence → tests.

Coding agents must not silently resolve `TBD` behavior.

---

## DEC-016 — Target persistence should be relational/transactional; PostgreSQL preference remains Draft
Status: `Draft architecture`

Decision proposal:
Use a relational transactional DB in the clean rebuild, with PostgreSQL preferred because of integrity, precision, recursive queries, audit and reporting.

Not yet Approved:
Physical DB engine, hosting provider and exact ORM/framework.

---

## DEC-017 — Target transaction effects may normalize into TransactionLegs
Status: `Draft architecture`

Proposal:
Use LogicalTransaction + TransactionRevision + normalized TransactionLegs to support complex financial events cleanly.

Reason:
Hard-coded source/target fields become restrictive for credit cards, conversion, fees, ownership, claims and clearing.

Constraint:
TransactionLeg genericity must not weaken deterministic domain validation.

---

# How to add a decision

For a small decision, append `DEC-xxx` here with:
- status;
- decision;
- reason;
- consequences;
- alternatives if relevant.

For a consequential architecture choice (DB engine, API style, sync, auth, accounting representation), create a full ADR from `ADR-TEMPLATE.md` and reference it here.

Never delete old decisions. Mark them `Deprecated/Superseded by DEC/ADR-xxx` so history remains understandable.