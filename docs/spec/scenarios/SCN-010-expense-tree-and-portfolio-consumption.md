# SCN-010 — Expense Tree and Portfolio Consumption

Status: **Scenario facts retained / architecture refined by ADR-004, ADR-006**

## User intent

The user wants to start MyFinMan with no demo financial data and build the financial twin himself: Groups, Assets, Portfolios, Parties, expense categories and transactions.

Expense categories are hierarchical and every expense may optionally consume a Portfolio allocation.

## Scenario A — clean onboarding

Initial state:

- system identity `أنا` only;
- no financial Groups except any intentionally empty organizational roots;
- no Assets/balances;
- no Portfolios;
- no expense categories;
- no Ledger transactions.

Example user sequence:

1. Create Group `البنوك` and child Group `مصرف الراجحي` if desired for organization/provider context.
2. Create Cash Asset `الراجحي الجاري` with native currency SAR.
3. Add opening SAR quantity to that Asset.
4. Create an Investment or Monthly Expenses Portfolio if needed.
5. Add expense taxonomy.
6. Add other Assets or execute purchases.

Expected:

- no hidden seed wealth exists;
- opening balances are not classified as Income;
- Groups themselves never carry wealth;
- Demo/Scenario data is loaded only by explicit user action and is isolated from default experience.

## Scenario B — hierarchical expense classification

User creates:

```text
السكن                    [branch]
└── الخدمات              [branch]
    ├── الكهرباء         [leaf]
    ├── الماء            [leaf]
    └── الإنترنت         [leaf]

السيارة                  [branch]
├── الوقود               [leaf]
└── الصيانة              [leaf]
```

Expected under ADR-006:

- posting defaults to an actionable leaf category;
- branch categories organize and roll up descendants;
- branch nodes are not silently submitted as a final category;
- rename/reparent preserves stable historical identity;
- archive prevents future selection but preserves previous reports;
- `السكن` rollup includes Electricity/Water/Internet descendants;
- category hierarchy rejects cycles.

Historical note: older wording allowed direct posting to any parent category. ADR-006 supersedes that default because the platform now treats branches as organizational containers and operations as leaf-targeted.

## Scenario C — expense without Portfolio

Given:

- Al Rajhi SAR Cash Asset = 20,000 SAR;
- 5,000 SAR is allocated to unrelated protected Portfolios;
- 15,000 SAR is Free Liquidity.

User records:

- 1,000 SAR Electricity expense;
- payment source = Al Rajhi SAR Cash Asset;
- category = Housing -> Utilities -> Electricity leaf;
- Portfolio = none.

Expected:

- Al Rajhi SAR Cash Asset becomes 19,000;
- Free Liquidity decreases by 1,000;
- no Portfolio allocation changes;
- Ledger records Expense + category leaf id;
- parent Housing/Utilities totals include the 1,000 through derived roll-up.

A 16,000 SAR unlinked expense must be rejected if it would invade protected Portfolio allocations.

## Scenario D — expense linked to a Portfolio

Given:

- School Portfolio leaf has 40,000 SAR allocated;
- Alinma SAR Cash Asset is selected as physical source.

User records 5,000 SAR school expense linked to the School Portfolio leaf.

Expected:

- Alinma Cash Asset decreases by 5,000 physically;
- School Portfolio economic allocation decreases from 40,000 to 35,000;
- other Portfolio allocations are untouched;
- Ledger links ExpenseCategory leaf and Portfolio leaf;
- parent Portfolio branches roll up the child result without storing duplicate capital.

## Scenario E — physical source differs from Portfolio backing

Given:

- Rent Portfolio is economically backed by cash and/or Gold value according to approved allocation/backing policy;
- user has enough eligible Free SAR in Alinma;
- user pays 10,000 SAR from Alinma Cash Asset and links the expense to Rent Portfolio leaf.

Expected:

- Alinma Cash Asset decreases by 10,000 because that is WHERE the payment happened;
- Rent Portfolio economic allocation decreases by 10,000 because that is WHY value was reserved;
- Gold Asset quantity does not decrease unless there was an actual Gold sale/conversion;
- released Gold allocation may become available for another purpose after Portfolio consumption according to policy;
- no fake transfer or fake Gold disposal is created.

## Architecture pressure-test

This scenario confirms independent dimensions:

```text
Expense Event
├── Owner Party
├── Payment Asset
├── Expense Category leaf
├── optional Beneficiary Party
└── optional Portfolio leaf
```

It also confirms:

- ADR-002: purpose allocation is independent from payment location/provider;
- ADR-004: financial source is Asset, not mandatory Account/Holding hierarchy;
- ADR-006: hierarchical selectors navigate branch -> eligible leaf.

## Interaction contract

Expense category and Portfolio selection should use tree/cascader interaction rather than flat lists when hierarchy exists.

Tree CRUD uses contextual Modal/Sheet where appropriate. Successful posting follows the platform form lifecycle:

- Success => Toast + reset transient form fields;
- Failure => preserve entered values;
- prevent duplicate submission.

## Acceptance tests

1. Empty state contains no hidden financial/demo wealth.
2. Cash Asset can be created directly under optional Groups.
3. Category tree rejects cycles.
4. Branch category cannot be silently posted where a leaf is required.
5. Unlinked expense reduces Free Liquidity and does not alter Portfolio allocations.
6. Linked expense reduces both physical source Asset and selected Portfolio allocation.
7. Expense can use eligible Free Cash while consuming Portfolio allocation backed elsewhere.
8. Parent category and Portfolio rollups include descendants without double counting.
9. Other Portfolios cannot be silently consumed.
10. Success resets the posting form; failure preserves it.

## Benchmark implication

A strong personal financial operating system must answer simultaneously:

- what did I spend on?
- where did the money actually leave from?
- which financial purpose/budget did I consume?
- who owned/bore/benefited from the event?

without forcing these questions into one account/category/envelope field.
