# ADR-003 — User Account Groups above Account Containers

Status: **Approved**
Date: 2026-08-18

## Context
Earlier prototype iterations introduced a mandatory `Place → Account → Holding` UX, where a bank, home, broker or storage location had to exist before an Account could be created.

Through direct product testing, the model matured:
- the **Account** is already the real container/وعاء that contains Holdings;
- forcing a separate Place creates unnecessary setup and duplicates the organizational role the user actually wants;
- the user wants to organize accounts freely under folders such as `البنوك`, `الاستثمارات`, `المنزل`, or any other personal structure.

## Decision
The primary user-facing hierarchy is:

```text
AccountGroup (optional, organizational only)
└── Account (real container)
    └── Holding (actual asset/balance)
```

### AccountGroup
Answers: **كيف أريد تنظيم حساباتي في العرض؟**

Properties:
- user-created;
- may be nested;
- optional;
- one Account has at most one direct Group in the primary tree;
- may show derived roll-up value from descendant Accounts/Holdings;
- has no ownership, custody, balance, cost basis, portfolio allocation, income/expense or ledger effect.

Moving an Account from Group A to Group B is a presentation/organization mutation only.

### Account
Answers: **ما الوعاء الذي يحتوي الأصل/الرصيد؟**

Examples:
- الراجحي الجاري
- الإنماء الادخار
- الراجحي الاستثماري
- خزنة المنزل
- دراية
- بطاقة سفر

Account remains the direct container referenced by Holdings.

### Holding
Answers: **ماذا أملك وكم؟**

Examples:
- SAR balance
- USD balance
- gold
- fund units
- stocks
- crypto
- property/vehicle records where an Account/container is used as their registry/container.

## Legacy Place/Custodian compatibility
`custodianId` and historical Party records remain temporarily in schema-v4 prototype data for backward compatibility and migration safety.

They are **not** a mandatory user-facing hierarchy anymore.

On load, legacy prototype accounts that were previously under Bank/Home/Broker Places can be mapped to AccountGroups with the same names without changing:
- Account IDs;
- Holdings;
- Ownership;
- Cost Basis;
- Portfolios;
- Ledger history.

The clean target persistence model should revisit whether `custodianId` remains a required Account field or becomes optional institution metadata.

## Invariants
1. AccountGroup value is derived; never stored as additional wealth.
2. Moving/reparenting a Group or Account MUST NOT create a financial Transaction.
3. Group changes MUST NOT change Holdings, Ownership, Cost Basis, P/L or Portfolio allocations.
4. Account remains the container of Holdings.
5. Accounts may exist without a Group.
6. Group hierarchy must prevent cycles.
7. A Group cannot be archived while active child Groups or Accounts remain attached.

## UX consequence
Default Assets & Accounts lens becomes `مجموعاتي`:

```text
البنوك
├── الراجحي الجاري
│   ├── SAR
│   └── USD
└── الإنماء
    └── SAR

الاستثمارات
└── الراجحي الاستثماري
    └── صندوق عالمي
```

Other lenses such as Owner and Asset Type continue to recompose the same financial truth.

## Superseded prototype direction
The mandatory `Place → Account → Holding` presentation introduced in PR #21 is superseded by this ADR.
The useful principle retained from that iteration is that **Account is not an Asset and must never be double counted with Holdings**.
