# MyFinMan — Invariant Gate

Status: **Approved process / gate currently RED**
Date: 2026-08-18
Related: ADR-004, ADR-006, ADR-007, ADR-008, `calculation-rules.md`, `domain-model.md`

## 1. Why this exists

Before this gate, the repository had 99 passing tests, a green `tsc -b` and a green production build — while the financial core silently destroyed fractional quantities, recognized the same profit twice, and reported two different realized-profit numbers on two different screens.

The reason is structural: **the existing tests describe what the code currently does. They do not enforce what the specification says must always be true.**

An invariant test is different in kind:

```text
unit test      → "this function returns 5"
invariant test → "no sequence of user actions may ever violate RULE-023"
```

When an invariant fails, the model is wrong — or the rule must be changed deliberately through an ADR. **The test is never "fixed" to match the code.**

## 2. Gate rules

1. Every `INV-xxx` cites the `RULE/CALC/ADR` it enforces. An invariant with no authority is not an invariant.
2. An invariant may only be changed by an approved ADR that states which rule changed and why.
3. A red invariant blocks feature work in the affected family. It does not block a fix.
4. New financial behavior must arrive with the invariant that constrains it, in the same PR.
5. `tests/invariants/` is separate from `tests/` on purpose: the latter may be rewritten freely during the rebuild; the former survives the rebuild and is the acceptance contract for it.

## 3. Current matrix

| ID | Invariant | Authority | Status | What its failure means |
|---|---|---|---|---|
| INV-001 | Native quantity is never rounded to a money scale | RULE-023, DEC-024 | 🟢 GREEN | `0.00512 BTC` is stored as `0.01 BTC` — wealth overstated by 95% |
| INV-002 | Every known-basis lot persists an exact total | RULE-023, ADR-005 | 🟢 GREEN | Existing-asset onboarding stores a rounded unit cost and no exact total |
| INV-003 | The base currency has a unit cost basis of exactly 1 | RULE-024, DEC-026, ADR-009 | 🟢 GREEN | SAR acquires a cost basis of 0.933 SAR per SAR after FX |
| INV-010 | Basis is either carried **or** realized, never both | RULE-011, ADR-009 | 🟢 GREEN | The same gain is recognized now and again on the next disposal |
| INV-011 | One realized-profit truth across every lens | ADR-008 §7, ADR-009 | 🟢 GREEN | Ledger shows +250; dashboard shows 0 |
| INV-012 | One economic event, one answer, whichever door | ADR-009 | 🟢 GREEN | «نقل أموال» and «تحويل أصل» produce different cost bases for USD→SAR |
| INV-013 | The executed FX rate is stored exactly, one direction | ADR-007 §5 | 🟢 GREEN | Rate stored as `0.27` instead of `3.75` — wrong value **and** wrong convention |
| INV-014 | Conversion into an existing asset adds a lot, not a duplicate asset | RULE-022, DEC-024 | 🟢 GREEN | Cash assets multiply on every currency exchange |
| INV-020 | Owner and Beneficiary are roles over one Party identity | ENT-001, RULE-027 | 🟡 PARTIAL | Beneficiary now mirrored into Party store (sub-test 2 GREEN). Full de-duplication against existing Party by name (sub-test 1) still RED — requires Family-C coordinated schema change. |
| INV-021 | Absent custody metadata means the owner holds it | RULE-002, RULE-014 | 🟢 GREEN | 100% of assets are reported as held by a third party |
| INV-022 | Net worth includes qualifying claims | CALC-011 | 🟢 GREEN | Receivables are invisible in net worth |
| INV-023 | No target flow requires a legacy Account | DEC-021, ADR-004 | 🟢 GREEN | `addExistingAsset` still throws without an Account row |
| INV-030 | Stored balances replay exactly from the ledger | ADR-008 §2, Inv. 4/6 | 🟢 GREEN | See §4 — green today, but not yet load-bearing |

## 4. Honest reading of INV-030

INV-030 passes. **This is not reassurance.**

The projection reconciles because the corruption happens *at the intake boundary*: the quantity is rounded before it becomes a canonical fact, so the ledger and the materialized balance agree on the same wrong number. ADR-008's replay guarantee holds perfectly over corrupted inputs.

INV-030 becomes genuinely load-bearing only after:

1. INV-001 is green (facts are exact when recorded);
2. the replay covers cost lots, ownership shares, portfolio allocations and liabilities — not only owner native quantity;
3. every transaction family has a deterministic replay, per ADR-008 §6.

Until then it is a scaffold, not a guard.

## 5. Definition of done for the gate

The gate is GREEN when all `INV-xxx` pass **and** `npm test` runs them in CI. Only then may feature work on #34/#36/#37 resume.
