# SCN-010 — Expense Tree and Portfolio Consumption

Status: **Draft scenario / Implemented Prototype pressure-test**

## User intent

The user wants to start MyFinMan with no demo financial data and build the financial twin himself: institutions, accounts, balances, assets, Portfolios, expense categories, and transactions.

He also wants expense categories managed as a hierarchy and every expense to optionally consume a Portfolio balance.

## Scenario A — clean onboarding

Initial state:

- system identity `أنا` only;
- no banks/institutions;
- no Accounts;
- no Holdings/balances;
- no Portfolios;
- no expense categories;
- no Ledger transactions.

User sequence:

1. Add `مصرف الراجحي` as Bank Party.
2. Add `جاري الراجحي` Account.
3. Add opening SAR cash balance.
4. Add an Investment or Monthly Expenses Portfolio.
5. Add expense taxonomy.
6. Add Assets or execute purchases.

Expected:

- no hidden seed wealth exists;
- opening balances are not classified as income;
- Demo/Scenario data is loaded only by explicit user action and is isolated from the default experience.

## Scenario B — hierarchical expense classification

User creates:

```text
السكن
└── الخدمات
    ├── الكهرباء
    ├── الماء
    └── الإنترنت

السيارة
├── الوقود
└── الصيانة
```

Expected:

- any leaf or parent can classify an expense;
- rename/reparent preserves historical identity;
- archive prevents future selection but preserves previous reports;
- `السكن` rollup includes Electricity/Water/Internet descendants.

## Scenario C — expense without Portfolio

Given:

- Al Rajhi SAR Holding = 20,000 SAR;
- 5,000 SAR is allocated to unrelated protected Portfolios;
- 15,000 SAR is Free Liquidity.

User records:

- 1,000 SAR Electricity expense;
- source = Al Rajhi;
- category = Housing ← Utilities ← Electricity;
- Portfolio = none.

Expected:

- Al Rajhi SAR becomes 19,000;
- Free Liquidity decreases by 1,000;
- no Portfolio allocation changes;
- Ledger records Expense + category id;
- parent Housing totals include the 1,000.

A 16,000 SAR unlinked expense must be rejected because it would invade protected allocations.

## Scenario D — expense linked to same-source Portfolio

Given:

- School Portfolio has 40,000 SAR allocated from Alinma;
- Alinma is selected as physical source.

User records 5,000 SAR school expense linked to School Portfolio.

Expected:

- Alinma Holding decreases by 5,000 physically;
- School Portfolio economic allocation decreases from 40,000 to 35,000;
- other Portfolio allocations are untouched;
- Ledger links both ExpenseCategory and Portfolio.

## Scenario E — physical source differs from Portfolio backing

Given:

- Rent Portfolio is economically backed by 5,000 SAR cash + Gold value;
- user has enough Free SAR in Alinma;
- user pays 10,000 SAR from Alinma and links the expense to Rent Portfolio.

Expected:

- Alinma cash decreases by 10,000 because that is WHERE the payment happened;
- Rent Portfolio allocated economic value decreases by 10,000 because that is WHY the value was reserved;
- Gold Holding quantity does not decrease unless there was an actual gold sale;
- released Gold allocation becomes available for another purpose after Portfolio consumption;
- no fake transfer or fake gold disposal is created.

## Architecture pressure-test

This scenario confirms the need for independent dimensions:

```text
Expense Event
├── Owner
├── Physical Source Holding / Account
├── Expense Category
└── optional Portfolio
```

It also confirms ADR-002: physical payment may come from any eligible free/same-Portfolio source while Portfolio allocation represents economic purpose rather than bank location.

## Acceptance tests

1. Empty state contains no financial/demo data.
2. User can add a Bank Party from empty state.
3. Category tree rejects cycles.
4. Unlinked expense reduces free cash and does not alter Portfolio allocations.
5. Linked expense reduces both physical source and selected Portfolio allocation.
6. Expense can use free cash while consuming Portfolio allocation backed elsewhere.
7. Parent category rollup includes descendant expenses.
8. Other Portfolios cannot be silently consumed.

## Benchmark implication

A strong personal financial operating system must answer simultaneously:

- what did I spend on?
- where did the money actually leave from?
- which financial purpose/budget did I consume?

without forcing these three questions into a single category/account/envelope field.
