# SCN-013 — Historical User Account Groups — Superseded by Group -> Asset

Status: **Historical scenario facts retained / architecture Superseded by ADR-004 and SCN-021**

## Original experiment

This scenario validated a transition from mandatory Place to:

```text
Group -> Account -> Holding
```

It proved several useful facts:
- Groups may be user-defined and hierarchical;
- Group itself must not be wealth;
- reorganization must not create financial transactions;
- legacy migration must preserve IDs/quantity/ownership/Cost Basis/Ledger;
- ungrouped financial objects must remain valid.

## Superseded decision

Direct user testing later showed that requiring Account still manufactured fake containers for land, vehicles and physical metals.

Therefore the canonical model is now:

```text
Group
├── Group
├── Asset
└── Asset
```

No new flow requires Account.

## Updated scenarios

### Banks organization

```text
Group: البنوك
├── Asset: الراجحي الجاري = 20,000 SAR
├── Asset: الإنماء = 100,000 SAR
└── Group: البطاقات / other organization as desired
```

Group roll-up derives unique descendant Asset values once.

### Investment organization

Moving an Asset between Groups changes organization only:
- Asset ID unchanged;
- quantity unchanged;
- ownership unchanged;
- Cost Basis unchanged;
- Portfolio allocations unchanged;
- Ledger unchanged.

### No group

An Asset can exist with no Group and later be assigned one.

### Legacy migration

Historical:

```text
Group -> Account -> Holding
```

normalizes to:

```text
Group -> Asset
```

without posting a financial transaction or duplicating value.

Legacy Account rows may remain in compatibility storage only.

## Current acceptance

1. Create/reparent Group without financial effect.
2. Create Asset directly in Group or without Group.
3. Move Asset between Groups without changing financial truth.
4. Prevent Group cycles.
5. Prevent deleting non-empty Group until descendants are moved/dealt with explicitly.
6. Derive Group totals from unique descendant Assets exactly once.
