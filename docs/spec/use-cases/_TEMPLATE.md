# UC-XXX — Use Case Name

Status: `Draft | Approved | Implemented | Verified`
Triggered by: `ACT-xxx`
Screens: `SCR-xxx`
Related entities: `ENT-...`
Rules: `RULE-...`
Calculations: `CALC-...`
Persistence: `DB-...`
Acceptance: `TEST-...`

## 1. Business meaning

Describe the real-world financial event in plain language.

## 2. Preconditions

- entity existence/status;
- ownership/permissions;
- account/portfolio/asset compatibility;
- quantity availability;
- required valuation/cost data.

## 3. Command/input contract

| Field | Type | Required | Meaning | Validation |
|---|---|---|---|---|
| | | | | |

## 4. Queries/read model needed

List exact information required to produce the screen and deterministic preview.

## 5. Preview

State all before/after values shown to the user before commit.

If no preview is required, explain why.

## 6. Deterministic validation

List validation steps in execution order. AI suggestions cannot replace these checks.

## 7. Calculations

Reference `CALC-xxx` and define any additional formula.

## 8. Atomic write set

| Order | Table/entity | Create/Update | Meaning |
|---|---|---|---|
| 1 | | | |

All dependent financial writes should commit or rollback together in the target backend.

## 9. Audit/history

- transaction ID;
- revision/version semantics;
- actor/source;
- timestamps;
- attachment/import provenance;
- linked events.

## 10. Explicit non-effects

List things this use case must **not** change, e.g.:
- no income;
- no realized P/L;
- no ownership transfer;
- no account movement;
- no other-owner funding.

## 11. Result/output DTO

Define stable client-independent result shape conceptually.

## 12. Failure behavior

For every important failure:
- error category/code;
- user-facing explanation;
- whether retry is safe;
- whether idempotency key is required.

## 13. Responsive UI integration

Explain only presentation differences. Business command remains identical.

## 14. Acceptance tests

List exact `TEST-xxx` scenarios.

## 15. Open questions / TBD

Unresolved rules. Do not implement guesses.