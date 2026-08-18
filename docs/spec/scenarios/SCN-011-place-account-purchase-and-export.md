# SCN-011 — Historical Place/Account Purchase Scenario — Superseded Interpretation

Status: **Scenario facts retained / Place -> Account -> Holding architecture Superseded by ADR-004 and ADR-005**

## Why this file remains

This scenario was a useful prototype pressure-test for:
- clean onboarding;
- simple amount-paid / quantity-received purchase UX;
- Cost Basis versus current valuation;
- unrealized versus realized P/L;
- Asset-to-Asset cost carry;
- JSON export/import reproducibility.

Those facts remain valuable.

The old required hierarchy does **not** remain valid:

```text
Place -> Account -> Holding
```

No future work may infer from this scenario that Place or Account is mandatory.

## Current target interpretation

```text
Group
├── Cash Asset
└── purchased Asset
```

Optional InstrumentDefinition identifies the economic/market instrument. Group is the only user hierarchy. Asset is quantity-bearing financial truth.

A real bank/broker context may be mirrored by a Group and descriptive institution/provider metadata, but the Group itself has no balance.

## Updated purchase example

Given:

```text
Cash Asset: الراجحي الجاري = 20,000 SAR
Paid = 5,400 SAR
Instrument/type = Gold
Quantity received = 10 g
Target Group = المعادن
```

Expected:

```text
Cash Asset -5,400 SAR
Gold Asset +10 g
Exact purchase lot basis = 5,400 SAR
Effective unit cost = derived from 5,400 / 10
```

If Gold Asset already exists and the user explicitly chooses `زيادة أصل موجود`, the purchase appends a new CostBasisLot instead of manufacturing another Gold Asset merely because it is another purchase.

If the user intentionally holds Gold separately elsewhere, a separate Asset instance may reference the same Gold InstrumentDefinition.

## Valuation

If quote = 530 SAR/g:

```text
Current value = 5,300
Cost basis = 5,400
Unrealized result = -100
```

A quote refresh changes valuation only. It never rewrites exact historical basis or creates cash flow.

## Disposal

Asset -> Cash true disposal may realize P/L under policy.
Asset -> Asset continuing acquisition/cost-flow may carry attributable basis according to SCN-007/SCN-008 and final disposal policy.

## Export/import

The original portability requirement remains Approved direction:
- versioned snapshot;
- complete related state;
- schema validation;
- explicit confirmation before replacing current local state;
- no demo data substitution.

## Superseded invariants

The following old statements are explicitly invalid:
- `Place != Account != Asset` as mandatory user hierarchy;
- `Every Holding must have an Account/container`;
- purchase destination must be Place-first/Account-second;
- Assets screen must default to Place -> Account -> Holding.

Replacement invariants are ADR-004/ADR-005 and SCN-021/SCN-022.
