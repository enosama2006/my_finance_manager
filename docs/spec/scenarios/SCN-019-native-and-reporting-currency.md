# SCN-019 — Native Currency, Current Valuation and Reporting Currency

Status: **Approved distinction / Current reporting implementation exists / Historical-basis refinement open**

## Intent
A foreign-currency Cash Asset keeps its real native quantity while wealth totals are translated into a user-selected reporting currency.

Historical acquisition basis is a third independent fact and must not be inferred from reporting/current FX.

## Domain distinction

```text
Cash Asset native quantity
= what currency quantity is actually held

Current FX valuation
= what one native unit is worth now/reference for wealth reporting

Historical Cost Basis
= what the held quantity economically cost when acquired, if known

Reporting Currency
= presentation preference for totals/rollups
```

No mandatory Account layer is required by the target model.

## Example — current valuation
Given 40 USD and current/reference USD/SAR = 3.75:

```text
Native quantity = 40 USD
Current SAR value = 150 SAR
```

If reporting currency = SAR, show 150 SAR.
If reporting currency = USD, show 40 USD equivalent.

Changing reporting currency:
- posts no Ledger event;
- changes no quantity;
- changes no ownership;
- changes no Cost Basis;
- changes no Portfolio allocation.

## Historical basis example
If the user originally acquired 40 USD for 152 SAR, historical basis is 152 SAR even while current value is 150 SAR.

If historical acquisition cost is unknown, store/report **unknown**.

Do not invent:

```text
unitCostSar = 1
```

for USD merely because the native quantity is represented in USD.

## Rules
1. Native currency uses controlled catalog identifiers in normal UX.
2. Cash Asset quantity remains native.
3. Current valuation uses current/reference FX according to valuation policy.
4. Reporting totals convert current value, not historical basis.
5. Historical basis is actual known acquisition cost/rate or unknown.
6. Current/reference FX never rewrites historical basis.
7. Deterministic pegs/references may support current valuation but are not automatically historical acquisition rates.
8. Floating currencies require actual/current valuation data; never assume 1.
9. A currency Asset may have different performance roles in different holding/Position contexts under SCN-008.

## Snapshot regression
The real 2026-08-18 snapshot contains 6,645 USD valued at 3.75 SAR/USD but a lot basis stored as `1 SAR/USD`. That basis is not supported by the user-entered history and is a financial-correctness defect tracked by Issue #38.

## Acceptance
- 40 USD values at 150 SAR with 3.75 current/reference FX;
- reporting preference changes display only;
- known historical acquisition basis remains distinct from current value;
- unknown historical basis is supported;
- no foreign-currency opening invents 1 SAR/native-unit basis.
