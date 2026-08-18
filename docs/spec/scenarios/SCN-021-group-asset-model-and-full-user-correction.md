# SCN-021 — Group → Asset and full user correction

Status: **Approved / Implemented / Verification pending CI**
Date: 2026-08-18
Related: ADR-004

## Goal
Verify that the wealth tree contains only Groups and Assets, while all user-entered financial data can be corrected or safely removed without fake containers or silent balance corruption.

## Scenario A — bank-style cash asset
User creates:

```text
البنوك                 Group
└── الراجحي الجاري     Asset(kind=cash, currency=SAR)
```

The Asset itself carries its SAR balance, owner, optional institution, last4 and account-style metadata. No child SAR Holding and no separate Account are required.

Expected:
- opening balance creates one opening transaction;
- changing display name or Group does not post a transaction;
- changing quantity creates audited correction;
- deleting it reverses/voids safe origin events or records a reconciliation before archiving.

## Scenario B — foreign currency reporting
User creates `حساب الدولار` as a Cash Asset with 40 USD.
Reporting currency = SAR.

Expected:
- native quantity remains 40 USD;
- roll-up uses reference 3.75 SAR/USD and shows 150 SAR;
- reporting currency selection never mutates the Asset or Ledger.

## Scenario C — physical gold directly in a Group

```text
المعادن
└── ذهب 24
```

Expected:
- no `حساب أصول الذهب` is manufactured;
- gold may be bought from a Cash Asset and placed directly under `المعادن`;
- correcting the purchase can change source Asset, amount, owner, target Group, quantity, fees and asset metadata;
- deleting untouched purchase restores the payment Asset and removes the purchased Asset while retaining a voided audit record.

## Scenario D — land and vehicle

```text
العقارات
└── أرض حلب

المركبات
└── سيارتي
```

Expected: neither Asset requires an Account/container.

## Scenario E — free reorganization
Move `ذهب 24` from `المعادن` to `استثمارات طويلة الأجل` and rename it.

Expected:
- Asset ID unchanged;
- quantity, owner, Cost Basis, valuation, portfolio slices and Ledger unchanged;
- Group roll-ups immediately reflect the new placement.

## Scenario F — opening balance correction
A user mistakenly enters the opening state repeatedly.

Expected:
- one logical posted opening transaction per Asset + Owner;
- correction changes the projected quantity to the desired opening state instead of stacking duplicates;
- redundant old opening rows become voided audit history.

## Scenario G — correction of common transactions
For each posted user transaction:
- income;
- expense;
- real transfer;
- asset purchase;
- opening state.

Expected:
1. open edit modal;
2. correct financial fields and metadata;
3. reverse old projection;
4. replay corrected projection;
5. retain same Transaction ID;
6. increment version and append previous snapshot to revisions.

## Scenario H — delete common transactions
Deleting income, expense, real transfer, opening state or untouched asset purchase must reverse its economic effect and mark the original transaction voided.

If a complex downstream chain prevents safe reversal, the operation must refuse with an explicit message rather than partially delete data.

## Scenario I — v4 migration
Input snapshot:

```text
Group: البنوك
└── Account: الراجحي الجاري
    └── Holding: رصيد SAR = 27,163.03
```

After normalization:

```text
Group: البنوك
└── Asset: الراجحي الجاري = 27,163.03 SAR
```

Expected:
- quantity unchanged;
- ownership unchanged;
- Cost Basis unchanged;
- Ledger unchanged;
- no duplicate Asset value;
- legacy Account may remain in compatibility storage but is not rendered or required by new flows.

## Core assertions
- `Group → Asset`, never `Asset → Asset`.
- Account is not mandatory target architecture.
- user organization does not mutate financial truth.
- user financial correction changes projections consistently and remains audited.
- user deletion is safe reverse/void, not raw data destruction.
