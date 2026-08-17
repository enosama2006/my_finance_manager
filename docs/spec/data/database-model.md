# MyFinMan — Target Database Model

Status: **Draft target physical model built from Approved domain concepts**

> The current prototype uses LocalStorage and a simplified in-memory shape. This document describes the **future clean rebuild target**, not the current persistence implementation.

## 1. Database direction

Recommended target: a transactional relational database, **PostgreSQL preferred (Draft ADR)**, because MyFinMan requires strong relational integrity, atomic financial mutations, recursive Portfolio trees, exact numeric types, audit history and complex reporting.

The logical schema is authoritative before the engine choice. PostgreSQL/ORM/hosting remain Draft until an ADR is accepted.

## 2. Global data rules

- Stable UUID/ULID-style IDs; display names are never identities.
- Money, rates and native quantities use exact `NUMERIC/DECIMAL`, not binary floating point.
- Financial mutations commit atomically.
- Referenced financial entities are closed/archived rather than deleted.
- Derived totals are calculated from source records or explicitly materialized; avoid contradictory balance copies.
- Every mutation retains actor/source/timestamps and idempotency where retries are possible.
- **Cash is an Asset/Holding. Account/Container is only where that cash exists; the account itself is not extra wealth.**

---

# 3. Parties, accounts and assets

## DB-001 `parties`
People and organizations.

Core columns:
- `id PK`
- `party_type` — self/person/bank/broker/institution/other
- `display_name`
- `status`
- `created_at`, `updated_at`

Roles include owner, beneficiary, custodian, institution, debtor or creditor. A role does not imply ownership.

## DB-010 `accounts`
Stable digital twin of real accounts/custody containers.

Core columns:
- `id PK`
- `name`
- `account_type` — checking/saving/investment/**cash_container**/prepaid/custody/fixed_term/credit_card/other
- `custodian_party_id FK -> parties`
- `institution_party_id FK -> parties NULL`
- `native_currency_asset_id FK -> assets NULL` for account metadata when useful
- `external_reference_encrypted NULL`
- `last4 NULL`
- `status` — active/closed/archived
- `opened_at NULL`, `closed_at NULL`
- `created_at`, `updated_at`

Examples:
- Al Rajhi current account = Account.
- Home vault = Account of type `cash_container`.
- Neither is an Asset merely because it contains money.

Rule: rename/archive preserves `id` and history.

## DB-020 `assets`
Normalized asset master.

Core columns:
- `id PK`
- `symbol`
- `name`
- `asset_class` — **cash**/metal/collectible/fund/stock/crypto/real_estate/fixed_term/receivable/other
- `native_unit`
- `default_price_asset_id FK -> assets NULL`
- `status`
- optional instrument identifiers

Important cash rule:
- SAR and USD are both Assets with `asset_class = cash`.
- Currency is identified by the Asset identity/symbol/native unit, not by a separate `currency` AssetClass.
- `10,000 SAR` in Al Rajhi and `5,000 SAR` in home vault are different Holdings of the same SAR Asset in different Accounts.
- USD → SAR is Asset Conversion between two different cash Assets; moving SAR Account A → Account B is Real Transfer of the same Asset.

---

# 4. Holdings, ownership and cost

## DB-030 `holdings`
One Asset position inside one Account/custody context.

Columns:
- `id PK`
- `asset_id FK -> assets`
- `account_id FK -> accounts`
- `native_quantity NUMERIC`
- `location_text NULL`
- `status`
- `created_at`, `updated_at`

Constraint:
- `native_quantity >= 0` unless an explicit future short-position model is approved.

The account is not added to Holding value; value comes from the Holding Asset quantity and valuation.

## DB-031 `holding_ownership_shares`
Economic ownership of Holding quantity.

Columns:
- `id PK`
- `holding_id FK -> holdings`
- `owner_party_id FK -> parties`
- `native_quantity NUMERIC`
- temporal fields as needed.

Invariant:
- active shares for a Holding sum to Holding native quantity.

## DB-032 `cost_basis_lots`
Owner-specific acquisition-cost coverage.

Columns:
- `id PK`
- `holding_id FK -> holdings`
- `owner_party_id FK -> parties`
- `native_quantity NUMERIC`
- `unit_cost_base NUMERIC NULL`
- `cost_currency_asset_id FK -> assets`
- `acquired_at NULL`
- `source_transaction_id FK -> transactions NULL`
- `cost_status` — known/unknown/estimated

Rules:
- quantity coverage for Owner+Holding stays consistent with current owner quantity;
- current product-performance policy is weighted average per owner;
- unknown cost is not zero.

---

# 5. Portfolios / purpose layer

## DB-040 `portfolios`
Unified Portfolio/earmark tree.

Columns:
- `id PK`
- `parent_portfolio_id FK -> portfolios NULL`
- `name`
- `purpose_text NULL`
- `beneficiary_party_id FK -> parties NULL`
- `target_value_base NUMERIC NULL`
- `status` — active/closed/archived
- `sort_order`
- timestamps.

Constraint: no cycles.

## DB-041 `portfolio_owners`
Many-to-many owner/governance scope.

Columns:
- `portfolio_id FK`
- `owner_party_id FK`
- optional future share/policy fields `TBD`.

## DB-042 `portfolio_slices`
Native quantity from one Owner's Holding share assigned to a leaf Portfolio.

Columns:
- `id PK`
- `portfolio_id FK -> portfolios`
- `holding_id FK -> holdings`
- `owner_party_id FK -> parties`
- `native_quantity NUMERIC`
- timestamps.

Rules:
- Owner+Holding slices cannot exceed ownership share;
- parent totals are recursive rollups, not duplicated slices;
- reallocation changes slices, not Account/Holding reality.

---

# 6. Transactions and audit

## DB-050 `transactions`
One human-level LogicalTransaction.

Columns:
- `id PK`
- `transaction_type`
- `status`
- `occurred_at`, `posted_at NULL`
- `primary_owner_party_id FK NULL`
- `title`, `note NULL`
- `source` — manual/import/ai/bank_sync/system
- `external_id NULL`
- `idempotency_key NULL UNIQUE`
- `current_version INTEGER`
- timestamps.

## DB-051 `transaction_revisions`
Corrections/audit for the same LogicalTransaction.

Columns:
- `id PK`
- `transaction_id FK`
- `version`
- `reason`
- `changed_by_party_id FK NULL`
- `changed_at`
- `before_payload JSONB`
- `after_payload JSONB`

Unique `(transaction_id, version)`.

## DB-052 `transaction_legs`
Status: **Draft target representation**.

One normalized financial effect of a transaction.

Columns may include:
- `id PK`
- `transaction_id FK`
- `leg_role`
- `party_id FK NULL`
- `account_id FK NULL`
- `holding_id FK NULL`
- `portfolio_id FK NULL`
- `asset_id FK NULL`
- `native_quantity_delta NUMERIC NULL`
- `base_value_delta NUMERIC NULL`
- `liability_id FK NULL`
- `claim_id FK NULL`
- `metadata JSONB NULL`.

Generic legs express effects but never bypass deterministic domain validation.

## DB-053 `transaction_links`
Links real subsequent events.

Columns:
- `from_transaction_id`
- `to_transaction_id`
- `relation_type` — refund_of/reversal_of/settles/derived_from/import_match/etc.

A real Refund is a linked new transaction; a typo correction is a Revision.

---

# 7. Planning, liabilities, claims and clearing

## DB-060 `income_streams`
Expected/recurring definitions. No Holding effect.

## DB-061 `income_occurrences`
Generated expected instances with expected/received/late/missed status and optional matched posted transaction.

## DB-070 `liabilities`
External obligations such as card/loan/payable.

Core columns:
- owner;
- counterparty/account optional;
- liability type;
- asset;
- native amount;
- status;
- due/payment metadata.

A credit-card liability is not represented as a negative Cash Holding.

## DB-080 `claims`
Rights against another Party.

Core columns:
- creditor;
- debtor;
- asset;
- native quantity;
- contractual/valuation metadata;
- status/timestamps.

A Claim must not duplicate the same economic right already represented as a specific physical Holding in third-party custody.

## DB-110 `clearing_entries`
Status: `Draft`.

Represents funding/settlement gaps between a real transaction and intended Portfolio coverage. Detailed solver/fields remain TBD.

---

# 8. Valuation and reconciliation

## DB-090 `valuation_snapshots`
Columns:
- `id PK`
- Holding and/or Asset scope;
- price/base Asset;
- unit price;
- method;
- source;
- observed timestamp;
- optional note/confidence.

Valuation changes analytical/current value, not financial transaction history.

## DB-100 `reconciliation_snapshots`
Observed vs calculated Account/Holding state.

Columns:
- target Account/Holding;
- observed Asset/native quantity/value;
- calculated equivalent;
- difference;
- source/time;
- resolution status;
- linked real correction/adjustment transaction nullable.

---

# 9. Classification, attachments and AI

## DB-120 `categories`
Hierarchical income/expense categories; separate from Portfolio and AssetClass.

## DB-121 `transaction_categories`
Transaction classification mapping with source/confidence if needed.

## DB-130 `attachments`
Receipt/document/import metadata; binary storage is an infrastructure decision.

## DB-140 `ai_intake_drafts`
Unposted extraction/suggestion state, candidate transaction, duplicate matches, confidence, validation errors and approval state.

Rule: AI draft is never financial truth until the proper deterministic posting use case succeeds.

## DB-150 `audit_events`
Security/config/master-data audit outside transaction revisions where needed.

---

# 10. Relationship summary

```text
Party
 ├─< Account (custodian/institution)
 ├─< HoldingOwnershipShare >─ Holding >─ Account
 ├─< CostBasisLot >─────────── Holding
 ├─< PortfolioOwner >───────── Portfolio ─< Portfolio(child)
 ├─< PortfolioSlice >───────── Holding
 ├─< Liability
 └─< Claim (creditor/debtor)

Asset ─< Holding
Asset ─< ValuationSnapshot
Transaction ─< TransactionRevision
Transaction ─< TransactionLeg
Transaction ─< TransactionLink >─ Transaction
```

# 11. Required constraints/checks

1. Ownership shares = Holding native quantity.
2. PortfolioSlices <= Owner share.
3. Cost-lot quantity coverage remains coherent with Owner quantity.
4. Closed/archived Accounts/Portfolios reject ordinary new postings except approved closing flows.
5. Custody/location/account changes never imply ownership transfer.
6. Expected Income never mutates Holdings.
7. Valuation never creates cash-flow history.
8. Conversion source quantity must exist in selected Owner + Portfolio/Unallocated scope.
9. Same-Asset Account-to-Account movement is Real Transfer; different cash Assets such as USD→SAR are Conversion.
10. Account value is derived from contained Holdings; never add Account as a second Asset.
11. Multi-write financial mutations commit atomically.
12. Retryable posting uses idempotency controls.

# 12. Migration stance

Do **not** mechanically turn current LocalStorage JSON into the production schema. When the clean rebuild starts, write an explicit import/migration adapter from prototype/reference data into the then-Approved target domain.