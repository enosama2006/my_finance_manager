# SCN-013 — User-defined Account Groups

Status: **Approved scenario / Implemented prototype target for this cycle**

## Goal
Validate the matured account model:

```text
Group (optional organization)
└── Account (real container)
    └── Holding (asset/balance)
```

## Scenario A — Banks organization
User creates:

```text
Group: البنوك
├── Account: الراجحي الجاري
│   └── Holding: 20,000 SAR
├── Account: الإنماء
│   └── Holding: 100,000 SAR
└── Account: بطاقة الراجحي
```

Expected:
- Group roll-up = 120,000 SAR asset value, excluding liability semantics of credit card unless holdings exist.
- Group itself is not an Asset.
- Accounts remain containers.
- Holdings remain the actual owned value.

## Scenario B — Investment organization
User moves `الراجحي الاستثماري` from Group `البنوك` to Group `الاستثمارات`.

Expected:
- account ID unchanged;
- Holdings unchanged;
- Ownership unchanged;
- Cost Basis unchanged;
- Portfolio allocations unchanged;
- Ledger unchanged;
- only `Account.groupId` changes.

## Scenario C — No group
User creates `حساب مستقل` without selecting a Group.

Expected:
- Account is valid;
- `groupId` is empty/undefined;
- it appears under `بدون مجموعة` in the custom Assets tree;
- user may assign it later.

## Scenario D — Legacy Place migration
Existing prototype data contains:

```text
Party/Place: مصرف الراجحي
└── Account: الجاري
```

On normalization:

```text
AccountGroup: مصرف الراجحي
└── Account: الجاري
```

Expected:
- no financial transaction created;
- Account ID unchanged;
- Holding IDs and quantities unchanged;
- Cost Basis and Ownership unchanged;
- Ledger unchanged.

The old Party record may remain in schema-v4 compatibility data but is no longer a mandatory user-facing layer.

## Acceptance tests
1. Create Group without financial effects.
2. Create Account inside Group without creating a Place.
3. Create Account without Group.
4. Move Account between Groups and assert Holdings/Ledger unchanged.
5. Prevent Group cycle.
6. Prevent archive while active child Groups or Accounts remain.
7. Assets page derives Group totals from descendant Account Holdings only once.
