# MyFinMan — Action & Use-Case Contracts

Status: **Approved core semantics / detailed algorithms evolve**

This document answers: **when the user presses a button, what exactly happens behind the UI?**

Every financial action must map to a stable `ACT` and `UC` and state what is read, validated, calculated, written, audited and explicitly not changed.

---

# ACT-001 — Open Quick Action

Entry: Home/header/FAB.

Behavior:
- opens `SCR-400`;
- does not mutate financial state;
- shows actions permitted by current context/permissions;
- can prefill owner/account/portfolio when launched contextually.

---

# ACT-410 / UC-INC-001 — Post Actual Income

Entry: `SCR-410` “تأكيد الدخل”.

## Input
- owner;
- occurred date/time;
- asset/currency and native amount;
- receiving Account/Holding;
- source/category/counterparty metadata;
- optional linked IncomeStream occurrence;
- optional post-receipt Portfolio assignment.

## Validation
- owner exists/active;
- target Account can receive the asset;
- amount > 0;
- no duplicate/idempotency conflict;
- if matching expected occurrence, one posted receipt cannot satisfy it twice without explicit split policy.

## Calculations
- base/reporting value under `CALC-010` valuation/FX policy;
- any PortfolioSlice quantity created after receipt;
- expected-income status transition if matched.

## Target writes
Atomic transaction:
1. create `transactions` record type income;
2. create/increase target Holding native quantity or create suitable Holding;
3. create owner share and cost coverage as required for cash/currency semantics;
4. optionally create PortfolioSlice;
5. match IncomeOccurrence to received;
6. write transaction legs/audit.

## Must NOT
- increase balance when only creating/editing expected income;
- treat internal transfer as income;
- use another owner’s share.

---

# ACT-420 / UC-EXP-001 — Post Expense

Entry: `SCR-420` “تأكيد المصروف”.

## Input
- economic owner bearing expense;
- payment source Account/Card;
- native asset/amount;
- date/time;
- category/merchant/counterparty;
- intended funding Portfolio;
- note/attachment.

## Validation
- owner has valid economic relationship to source;
- source supports payment;
- amount > 0;
- duplicate detection;
- if direct Portfolio funding is used, native asset compatibility must be valid;
- insufficient Portfolio coverage does **not** automatically mean reject the real expense.

## Cash/debit-account path
Atomic effect:
- reduce source Holding native quantity;
- create Expense transaction;
- settle/decrease corresponding PortfolioSlice if appropriate;
- if Portfolio intended funding is insufficient, create/update Clearing/Funding Gap rather than fabricating a transfer.

## Credit-card path
Atomic effect:
- create Expense transaction;
- increase Liability;
- do **not** reduce bank cash at purchase time unless the card is actually prepaid/debit;
- Portfolio settlement/clearing is tracked separately.

## Must NOT
- create a second expense when the credit-card bill is later paid;
- pretend the payment source equals funding purpose;
- silently consume another owner’s portfolio.

---

# ACT-430 / UC-TRF-001 — Real Transfer

Entry: `SCR-430` confirmation.

## Meaning
The same underlying asset/value actually moves from one Account/Custody location to another.

## Input
- owner/share;
- source Holding/Account;
- destination Account;
- native quantity;
- occurred date;
- real fee if any;
- Portfolio preservation/change intent.

## Validation
- source owner quantity sufficient;
- selected quantity is available in specified portfolio/unallocated scope;
- destination can hold same Asset/native unit;
- source ≠ destination;
- closed/archived account restrictions;
- fee semantics explicit.

## Writes
- decrease/source Holding quantity/share/cost coverage;
- increase/create destination Holding for same Asset;
- move proportional owner-specific cost basis without realizing P/L;
- preserve/move PortfolioSlices according to preview;
- create Real Transfer transaction + legs/audit;
- fee, if real, is modeled explicitly under approved policy.

## Must NOT
- create income;
- create expense for transferred principal;
- create realized P/L merely because account/custodian/location changed.

---

# ACT-440 / UC-CONV-001 — Convert Asset to Another Asset

Entry: `SCR-440` “تأكيد التحويل”.

## Input
- owner;
- source Holding;
- source Portfolio or Unallocated scope;
- source native quantity;
- target Asset;
- target native quantity actually received;
- execution rate / unit valuation at execution;
- fees;
- target Account/Custodian;
- target Portfolio intent.

## Preview calculations
- source available native quantity;
- owner weighted-average unit cost;
- disposed cost basis;
- gross proceeds/economic consideration in base currency;
- fees;
- realized gain/loss;
- target unit cost basis;
- before/after portfolio coverage.

## Validation
- source quantity exists in selected owner + portfolio/unallocated scope;
- no protected Portfolio quantity is silently consumed;
- target account can custody target Asset;
- rate/quantity/fees valid;
- if source cost unknown, realized P/L result is unknown rather than zero.

## Writes
Atomic:
1. decrease source Holding/ownership/cost coverage;
2. reduce selected source PortfolioSlice if applicable;
3. create/increase target Holding and owner share;
4. create target CostBasisLot/weighted cost coverage;
5. create target PortfolioSlice, defaulting to source purpose unless user chose otherwise;
6. create Conversion transaction and legs;
7. persist realized P/L result/provenance in transaction data or derive deterministically from stored execution/cost records;
8. audit.

## Must NOT
- classify total proceeds as income;
- create P/L from valuation change alone;
- merge another owner’s cost basis.

---

# ACT-450 / UC-PURCHASE-001 — Purchase Asset

## Meaning
The user gives real consideration (usually cash) and acquires/increases an Asset Holding.

## Effects
- reduce consideration source;
- increase target Holding native quantity;
- create owner-specific CostBasisLot including approved acquisition fees;
- optionally assign target quantity to Portfolio;
- create purchase transaction.

## Must NOT
- treat acquired asset value as income;
- invent historical purchase when onboarding an already-owned asset; use Existing Asset onboarding instead.

---

# ACT-451 / UC-SALE-001 — Sell Asset

## Effects
- decrease source native quantity and cost coverage;
- increase/create consideration Holding (e.g. SAR cash);
- calculate realized P/L using owner-specific approved cost method;
- preserve/change Portfolio purpose by explicit preview;
- create sale transaction.

## Must NOT
- record full sale proceeds as income.

---

# ACT-455 / UC-ASSET-ONBOARD-001 — Add Existing Asset

Status: **Approved need / detailed flow Draft**

Purpose: represent wealth the user already owns before MyFinMan without fabricating a cash purchase in app history.

Input may include:
- as-of date;
- current native quantity;
- owner shares;
- account/custodian/location;
- known/unknown historical cost;
- current valuation;
- portfolio slices.

Effect:
- creates opening/onboarding state and audit provenance;
- no fake historical cash outflow;
- unknown cost remains unknown.

---

# ACT-460 / UC-REALLOC-001 — Reallocate Portfolio Purpose

Entry: `SCR-460` confirm.

## Input
- owner;
- Holding;
- source Portfolio or Unallocated;
- destination Portfolio or Unallocated;
- native quantity.

## Validation
- quantity exists in selected source scope;
- owner matches slice/share;
- destination active and allowed for owner.

## Writes
- update/move PortfolioSlices only;
- optional lightweight domain event/audit for history.

## Must NOT
- modify Holding native quantity;
- modify Account balance;
- modify custody/location;
- create income/expense;
- create realized P/L.

---

# ACT-461 / UC-PORT-CLOSE-001 — Close Portfolio / Release Unused Coverage

## Preview
- child portfolios;
- direct slices;
- any clearing gaps/linked commitments;
- proposed destination for released slices: parent or Unallocated.

## Effect
- release/move slices;
- mark Portfolio closed/archived under policy;
- preserve historical transaction references.

## Must NOT
- move bank money merely because purpose closed.

---

# ACT-470 / UC-RECON-001 — Reconcile Account/Holding

## Input
- observed balance/quantity;
- source of observation;
- timestamp;
- target Account/Holding.

## Calculation
`difference = observed - calculated` under exact native/base context.

## Resolution paths
1. **Known missing/incorrect transaction** → create/correct the real transaction via its proper UC.
2. **Known valuation mismatch** → update valuation, not quantity.
3. **Unknown quantity/balance mismatch** → explicit Reconciliation Adjustment with clear label/provenance.

## Must NOT
- invent merchant/category/counterparty;
- rewrite old transactions silently.

---

# ACT-310 / UC-TX-CORRECT-001 — Correct Logical Transaction

Entry: Transaction detail.

## Flow
1. Load current transaction version and all dependent effects.
2. User edits factual input.
3. Domain rebuilds a deterministic preview of old vs new effects.
4. Validate all affected ownership, quantities, portfolios, liabilities, claims and P/L.
5. On confirm, in **one atomic DB transaction**:
   - append TransactionRevision;
   - increment current version;
   - replace/reproject dependent transaction legs/state;
   - recalculate affected derived state;
   - retain audit provenance.

## Must NOT
- create a fake refund/reversal merely to correct a typo;
- leave half of dependent effects updated.

---

# ACT-311 / UC-REFUND-001 — Record Real Refund

A refund that actually happened later is a **new Transaction** linked to the original using `transaction_links.relation_type = refund_of`.

It is not a correction.

---

# ACT-510 / UC-EXPECTED-001 — Create/Edit Expected Income

Effect:
- create/update IncomeStream/Occurrence planning records only.

Must NOT:
- change Holding quantity;
- change net worth;
- create posted Income.

When actual money arrives, use `UC-INC-001` and link/match the occurrence.

---

# ACT-610 / UC-CARD-PAY-001 — Pay Credit Card Liability

## Input
- owner;
- cash source Holding/account;
- target liability/card;
- native payment amount;
- date/fee.

## Effect
- reduce cash source;
- reduce Liability;
- create liability-payment transaction;
- settle relevant clearing if explicitly matched.

## Must NOT
- create the purchase Expense again.

---

# ACT-720 / UC-ACCOUNT-RENAME-001 — Rename Account

Effect:
- update display metadata only;
- preserve Account ID, Holdings and transaction history.

# ACT-721 / UC-ACCOUNT-ARCHIVE-001 — Archive/Close Account

Validation:
- no unresolved Holdings/obligations unless closing flow moves/resolves them;
- historical references remain valid.

Effect:
- status change; no history deletion.

---

# ACT-730 / UC-VALUATION-001 — Update Valuation

Input:
- Holding/Asset;
- unit price/current value;
- valuation method;
- source;
- timestamp.

Effect:
- create valuation observation / update current valuation projection.

Must NOT:
- create income/expense/transfer;
- change native quantity;
- create realized P/L.

---

# ACT-800 / UC-AI-INTAKE-001 — AI Intake Draft

Status: `Draft`

Flow:
1. ingest receipt/message/statement/document;
2. AI extracts candidate fields;
3. deterministic matching finds known accounts/parties/categories/assets;
4. duplicate detector runs;
5. domain validator produces errors/warnings;
6. user reviews Draft;
7. only explicit approved posting invokes the proper real use case (`INC/EXP/TRF/...`).

AI Intake itself never posts arbitrary mutations directly.

---

# Cross-cutting backend rules

Every value-changing `UC` must define:
- command/input DTO;
- deterministic validation;
- preview DTO when financial consequences are non-trivial;
- atomic repository transaction;
- idempotency strategy for retried/external commands;
- audit actor/source/timestamp;
- stable result DTO for all presentation clients;
- acceptance tests.

Presentation may choose dialog, sheet, full page or split pane, but it must call the **same use case contract**.