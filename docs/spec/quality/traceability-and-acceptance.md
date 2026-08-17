# MyFinMan — Traceability & Acceptance

Status: **Approved process / growing matrix**

The purpose of this file is to prevent features from existing only as UI or only as domain theory. Every important behavior should trace across layers.

## 1. Traceability rule

A complete financial feature should have:

```text
Product requirement
 → SCR screen
 → ACT user action
 → UC application command/query
 → ENT entities
 → RULE invariants
 → CALC formulas
 → DB persistence
 → TEST acceptance evidence
```

If one link is missing, the feature is not fully specified.

## 2. Initial traceability matrix

| Capability | Screen | Action / Use Case | Core entities | Rules / Calculations | Target persistence | Acceptance |
|---|---|---|---|---|---|---|
| Owner wealth view | SCR-001, 200, 230 | Query only | Party, Holding, OwnershipShare, Liability, Claim | RULE-001/002/006/014/015; CALC-002/003/011 | DB-001/030/031/070/080 | TEST-DOM-001 |
| Third-party custody | SCR-200/220/240 | Query / custody flow later | Holding, Account, Party, OwnershipShare | RULE-002/014; CALC-024 | DB-010/030/031 | TEST-DOM-002 |
| Unified Portfolio tree | SCR-100/110 | ACT-113/114; UC-REALLOC-001 | Portfolio, PortfolioSlice, Holding | RULE-004/005/010/017; CALC-005/006/007/008 | DB-040/041/042 | TEST-DOM-003/004 |
| Actual income | SCR-410/500 | ACT-410 / UC-INC-001 | Transaction, Holding, IncomeStream | RULE-007; CALC-010/022 | DB-050/052/060/061 | TEST-INC-001 |
| Expense cash/debit | SCR-420 | ACT-420 / UC-EXP-001 | Transaction, Holding, PortfolioSlice, Clearing | RULE-006; settlement rules | DB-050/052/042/110 | TEST-EXP-001 |
| Credit-card purchase | SCR-420/600 | ACT-420 / UC-EXP-001 | Transaction, Liability | RULE-015; CALC-023 | DB-050/052/070 | TEST-CARD-001 |
| Credit-card payment | SCR-600 | ACT-610 / UC-CARD-PAY-001 | Holding, Liability, Transaction | RULE-015; CALC-023 | DB-030/050/052/070 | TEST-CARD-002 |
| Real transfer | SCR-430 | ACT-430 / UC-TRF-001 | Holding, Account, CostBasisLot, PortfolioSlice, Transaction | RULE-009/012; no P/L | DB-010/030/032/042/050/052 | TEST-TRF-001 |
| Asset conversion | SCR-440/220 | ACT-440 / UC-CONV-001 | Holding, CostBasisLot, PortfolioSlice, Transaction | RULE-011/012/013; CALC-012..016 | DB-030/032/042/050/052 | TEST-CONV-001..004 |
| Add existing asset | Quick Action / holding setup | ACT-455 / UC-ASSET-ONBOARD-001 | Holding, OwnershipShare, CostBasisLot | RULE-013; opening semantics | DB-030/031/032 | TEST-ASSET-001 |
| Valuation update | SCR-220 | ACT-730 / UC-VALUATION-001 | Holding, ValuationSnapshot | RULE-008; CALC-001/017 | DB-090 | TEST-VAL-001 |
| Reconciliation | SCR-210/470 | ACT-470 / UC-RECON-001 | Account/Holding, ReconciliationSnapshot, Transaction | CALC-019; RULE-016 where correcting | DB-100/050/051 | TEST-RECON-001/002 |
| Transaction correction | SCR-310/320 | ACT-310 / UC-TX-CORRECT-001 | Transaction, Revision, Legs | RULE-016 | DB-050/051/052 | TEST-CORR-001 |
| Real refund | SCR-310 | ACT-311 / UC-REFUND-001 | Transaction, TransactionLink | RULE-016 distinction | DB-050/053 | TEST-CORR-002 |

## 3. Foundation acceptance scenarios

### TEST-DOM-001 — Owner isolation
Given a shared Holding owned 70%/30% by two owners, each owner’s wealth, Available and cost basis must use only their share. No owner can spend/reallocate/convert the other share implicitly.

### TEST-DOM-002 — Custody does not change ownership
Given 500g silver owned by User and stored with Ahmed, User wealth includes it, Ahmed wealth does not. Moving custody back to User changes location/account only, not owner or P/L.

### TEST-DOM-003 — Portfolio across accounts
One Portfolio can contain slices from Alinma cash, Alrajhi cash and an investment Holding simultaneously. Portfolio value is the sum of slices; no real transfer is required to create the purpose mapping.

### TEST-DOM-004 — Parent rollup no double count
A parent Portfolio with two child portfolios must equal direct parent slices + children recursively. Child slices must not be counted again merely because the parent displays their rollup.

### TEST-INC-001 — Expected then received
Creating expected salary does not change cash/net worth. Posting actual salary increases the receiving Holding and marks/matches the expected occurrence as received.

### TEST-EXP-001 — Expense source vs purpose
An expense can be paid from Account A while funded conceptually by Portfolio P. The system records the real source independently from the purpose. If P lacks eligible coverage, the real expense still posts and a funding gap/clearing state is created under the approved settlement model.

### TEST-CARD-001 — Credit-card purchase
A 1,000 SAR card purchase creates one 1,000 SAR Expense and increases card Liability by 1,000 SAR. Bank cash does not decrease at purchase time.

### TEST-CARD-002 — Credit-card payment
Paying 1,000 SAR from bank to the card reduces bank cash and card Liability by 1,000 SAR and creates **no second 1,000 SAR Expense**.

### TEST-TRF-001 — Real transfer
Transfer 20,000 SAR owned by User from Alinma to Alrajhi. Source quantity falls, destination rises, owner total cash principal remains unchanged (ignoring explicit fee), no income/expense/realized P/L is created, and cost basis remains coherent.

### TEST-CONV-001 — Conversion realized gain
Convert 1,000 USD with owner unit cost 3.74 into 3,800 SAR with 10 SAR disposal fee. Disposed cost = 3,740; consideration = 3,800; realized gain = 50 SAR under current rule.

### TEST-CONV-002 — Protected portfolio quantity
If all 25g gold is allocated to Portfolio “Long-term Investment”, an unscoped conversion cannot consume 1g as “Available”. User must select that Portfolio slice or explicitly reallocate first.

### TEST-CONV-003 — Purpose follows conversion
Convert 1g gold from Portfolio P into SAR and keep destination purpose unchanged. Gold slice decreases and SAR target slice is created in P without a separate fake bank transfer.

### TEST-CONV-004 — Owner-specific cost
Shared silver Holding: User 700g cost 7.70, Owner B 300g cost 7.90. Selling User’s quantity uses 7.70 weighted cost; Owner B cost basis remains 7.90 and untouched.

### TEST-ASSET-001 — Existing asset onboarding
Add a house already owned before MyFinMan with unknown purchase cost. Net worth includes current appraised value. No fake purchase/cash outflow is created. Return-on-cost is unknown until cost is supplied.

### TEST-VAL-001 — Valuation only
Update gold market price. Current wealth/unrealized P/L changes. Native grams, accounts, portfolios and realized P/L do not change. No income/expense transaction appears.

### TEST-RECON-001 — Known discrepancy
Observed bank balance differs because one missing known expense is identified. Post the actual expense; reconciliation difference resolves. Do not create a generic adjustment in addition to the real expense.

### TEST-RECON-002 — Unknown discrepancy
Observed balance differs and source cannot be identified. Create explicit Reconciliation Adjustment with provenance; do not invent merchant/category.

### TEST-CORR-001 — Correct typo atomically
A posted conversion quantity was entered incorrectly. Correction preview shows all changed quantities, cost basis, portfolio slices and P/L. Confirming increments transaction revision/version and reprojects all effects atomically. Activity shows one logical transaction with correction history, not two economic conversions.

### TEST-CORR-002 — Refund is new reality
An expense was correctly recorded, then merchant refunded it days later. Record a new linked Refund transaction. Do not rewrite the original expense as a correction.

## 4. Responsive acceptance scenarios

### TEST-UX-001
At 390px viewport, primary screens use full width, bottom navigation, single-column drill-down and no whole-page horizontal overflow.

### TEST-UX-002
At 1440px viewport, same routes become desktop workspace with right sidebar, multi-column/master-detail composition and no fixed mobile phone frame.

### TEST-UX-003
Resizing between desktop and mobile retains selected entity/context and does not fork financial application state.

## 5. Future test layers

The clean rebuild should eventually have:

1. **Domain unit tests** — formulas/invariants without UI/DB.
2. **Application use-case tests** — command behavior with repository fakes.
3. **Repository/integration tests** — constraints and atomic commits against real DB.
4. **API contract tests** — client-independent request/result behavior.
5. **Responsive component tests** — critical layouts and accessibility.
6. **End-to-end financial scenarios** — browser/mobile-width workflows.
7. **Migration/import tests** — prototype/sample/import data into target domain.

## 6. Verification status rule

Do not mark a feature `Verified` merely because the UI “looks right”. Verification must cite automated tests or a repeatable acceptance script by ID.