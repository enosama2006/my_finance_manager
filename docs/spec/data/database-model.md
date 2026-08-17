# MyFinMan — Target Database Model

Status: **Draft target physical model built from Approved domain concepts**

> The current prototype uses LocalStorage and a simplified in-memory shape. This document describes the **future clean rebuild target**, not the current persistence implementation.

## 1. Database direction

Recommended target: a transactional relational database, **PostgreSQL preferred (Draft ADR)**, because MyFinMan requires:

- strong relational integrity;
- atomic multi-record financial mutations;
- audit/revision history;
- recursive Portfolio trees;
- precise numeric types;
- complex reporting/filtering;
- future API/native clients.

The logical schema below is more important than the engine choice. Engine choice remains `Draft` until an ADR is approved.

## 2. Data rules

- IDs are UUID/ULID-style stable identifiers; never derive identity from display names.
- Money/rates/quantities use exact decimal/numeric types, never binary floating point in the target DB.
- Derived totals such as net worth/portfolio totals should normally be calculated from source records or materialized with explicit refresh/versioning; do not maintain multiple contradictory “balance” columns casually.
- All mutating financial use cases execute inside one database transaction.
- Soft archive/status is preferred over deleting referenced financial entities.
- Audit metadata includes created/updated timestamps and actor/source where relevant.

---

# 3. Core master tables

## DB-001 `parties`
Represents people and organizations.

Suggested columns:
- `id PK`
- `party_type` — self/person/bank/broker/institution/other
- `display_name`
- `status`
- optional normalized contact/reference fields
- `created_at`, `updated_at`

Relationships:
- owns Holding shares;
- custodians/institutions for Accounts;
- creditors/debtors in Claims/Liabilities;
- owners/beneficiaries of Portfolios.

## DB-010 `accounts`
Stable digital twin of real accounts/custody containers.

Columns:
- `id PK`
- `name`
- `account_type` — checking/saving/investment/cash/prepaid/custody/fixed_term/credit_card/other
- `custodian_party_id FK -> parties`
- `institution_party_id FK -> parties NULL`
- `native_currency_asset_id FK -> assets NULL`
- `external_reference_encrypted NULL`
- `last4 NULL`
- `status` — active/closed/archived
- `opened_at NULL`, `closed_at NULL`
- `created_at`, `updated_at`

Rule: renaming does not change `id`.

## DB-020 `assets`
Normalized asset master.

Columns:
- `id PK`
- `symbol`
- `name`
- `asset_class` — cash/currency/metal/collectible/fund/stock/crypto/real_estate/fixed_term/receivable/other
- `native_unit`
- `default_price_currency_asset_id FK -> assets NULL`
- `status`
- optional instrument identifiers

Examples:
- SAR currency;
- USD currency;
- XAU gram/gold instrument;
- XAG gram/silver instrument;
- a specific investment fund.

---

# 4. Holdings, ownership and cost

## DB-030 `holdings`
One Asset position in one Account/custody context.

Columns:
- `id PK`
- `asset_id FK -> assets`
- `account_id FK -> accounts`
- `native_quantity NUMERIC`
- optional `location_text`
- `status`
- `created_at`, `updated_at`

Constraint:
- `native_quantity >= 0` unless a future explicit short-position model is approved.

## DB-031 `holding_ownership_shares`
Economic ownership of Holding quantity.

Columns:
- `id PK`
- `holding_id FK -> holdings`
- `owner_party_id FK -> parties`
- `native_quantity NUMERIC`
- `effective_from`
- optional `effective_to`

Core invariant:
- active ownership-share quantities for each Holding sum to Holding native quantity.

A future implementation may store ownership change events rather than mutating one row; exact temporal strategy remains `Draft`.

## DB-032 `cost_basis_lots`
Owner-specific acquisition cost coverage.

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
- lot quantity coverage for Owner+Holding must equal that owner's current quantity under the chosen cost model.
- current product-performance method: weighted average per owner.
- unknown cost remains nullable/unknown rather than zero.

---

# 5. Portfolios / purpose layer

## DB-040 `portfolios`
Unified Portfolio / earmark tree.

Columns:
- `id PK`
- `parent_portfolio_id FK -> portfolios NULL`
- `name`
- `purpose_text NULL`
- `beneficiary_party_id FK -> parties NULL`
- `target_value_base NUMERIC NULL`
- `status` — active/closed/archived
- `sort_order`
- `created_at`, `updated_at`

Constraint:
- no cyclic parent relationships.

## DB-041 `portfolio_owners`
Many-to-many portfolio ownership/governance scope.

Columns:
- `portfolio_id FK -> portfolios`
- `owner_party_id FK -> parties`
- optional `share_ratio` or policy fields — `TBD`
- composite PK or unique pair.

## DB-042 `portfolio_slices`
Native Holding quantity assigned to one leaf Portfolio for one Owner.

Columns:
- `id PK`
- `portfolio_id FK -> portfolios`
- `holding_id FK -> holdings`
- `owner_party_id FK -> parties`
- `native_quantity NUMERIC`
- `created_at`, `updated_at`

Rules:
- slices for Owner+Holding cannot exceed Holding ownership share.
- parent totals are recursive rollups, not duplicate stored slices.
- reallocation moves/changes slices but does not change Holding/account reality.

---

# 6. Transactions and audit

## DB-050 `transactions`
One LogicalTransaction.

Columns:
- `id PK`
- `transaction_type`
- `status` — draft/posted/cancelled-as-invalid-if-policy-allows
- `occurred_at`
- `posted_at NULL`
- `primary_owner_party_id FK -> parties NULL`
- `title`
- `note NULL`
- `source` — manual/import/ai/bank_sync/system
- `external_id NULL`
- `idempotency_key NULL UNIQUE`
- `current_version INTEGER`
- `created_at`, `updated_at`

## DB-051 `transaction_revisions`
Audit snapshots/patches of corrections.

Columns:
- `id PK`
- `transaction_id FK -> transactions`
- `version`
- `reason`
- `changed_by_party_id FK -> parties NULL`
- `changed_at`
- `before_payload JSONB`
- `after_payload JSONB`

Unique:
- `(transaction_id, version)`.

Rule:
- correction preserves Transaction ID and increments version.

## DB-052 `transaction_legs`
Target normalized effects of a transaction.

Columns:
- `id PK`
- `transaction_id FK -> transactions`
- `leg_role` — source/target/expense/liability/claim/fee/ownership/etc.
- `party_id FK -> parties NULL`
- `account_id FK -> accounts NULL`
- `holding_id FK -> holdings NULL`
- `portfolio_id FK -> portfolios NULL`
- `asset_id FK -> assets NULL`
- `native_quantity_delta NUMERIC NULL`
- `base_value_delta NUMERIC NULL`
- `liability_id FK -> liabilities NULL`
- `claim_id FK -> claims NULL`
- `metadata JSONB NULL`

Status: `Draft target shape`.

Important: TransactionLeg is intended to express effects; it must not replace deterministic domain rules with generic unconstrained posting.

## DB-053 `transaction_links`
Links real subsequent events without pretending they are corrections.

Columns:
- `from_transaction_id`
- `to_transaction_id`
- `relation_type` — refund_of/reversal_of/settles/derived_from/import_match/etc.

---

# 7. Planning, liabilities, claims and clearing

## DB-060 `income_streams`
Columns:
- `id PK`
- `owner_party_id`
- `name`
- recurrence/schedule fields
- expected native/base amount
- target account/asset
- status/rules

Expected records do not alter Holdings.

## DB-061 `income_occurrences`
Optional target table for generated expected instances.

Columns:
- stream ID;
- expected date/amount;
- status expected/received/late/missed;
- matched posted transaction ID nullable.

## DB-070 `liabilities`
Columns:
- `id PK`
- `owner_party_id FK`
- `counterparty_party_id FK NULL`
- `account_id FK NULL`
- `liability_type`
- `asset_id FK`
- `native_amount NUMERIC`
- `status`
- due/payment metadata.

Credit-card account metadata can point to a Liability model rather than pretending its balance is an asset Holding.

## DB-080 `claims`
Columns:
- `id PK`
- `creditor_party_id FK`
- `debtor_party_id FK`
- `asset_id FK`
- `native_quantity NUMERIC`
- optional valuation/contract terms
- `status`
- created/settled timestamps.

Rule: a Claim and a physical Holding cannot both represent the same economic right unless explicitly justified by a separate contract relationship.

## DB-110 `clearing_entries`
Draft settlement/funding-gap table.

Columns likely include:
- owner;
- portfolio;
- originating transaction;
- asset/native amount required;
- covered amount;
- outstanding amount;
- status;
- settlement transaction link.

Detailed algorithm remains `TBD`.

---

# 8. Valuation and reconciliation

## DB-090 `valuation_snapshots`
Columns:
- `id PK`
- `holding_id FK` and/or asset scope
- `price_asset_id FK`
- `unit_price NUMERIC`
- `valuation_method`
- `source`
- `observed_at`
- optional confidence/manual note.

Current value is derived from native quantity × relevant valuation.

## DB-100 `reconciliation_snapshots`
Columns:
- `id PK`
- `account_id FK` or holding scope
- `observed_asset_id`
- `observed_native_quantity/value`
- `calculated_native_quantity/value`
- `difference`
- `source`
- `observed_at`
- resolution status
- linked adjustment/correction transaction nullable.

---

# 9. Classification, attachments and AI intake

## DB-120 `categories`
Hierarchical income/expense categories.

Columns:
- `id PK`
- `parent_category_id FK -> categories NULL`
- `category_type` income/expense
- `name`
- status/sort.

## DB-121 `transaction_categories`
Maps transaction to category with optional confidence/source.

## DB-130 `attachments`
Metadata for receipt/document/import artifacts; binary storage strategy is separate.

## DB-140 `ai_intake_drafts`
Stores unposted extraction/suggestion state.

Columns may include:
- source/attachment;
- extracted text/data;
- candidate transaction payload;
- duplicate-match candidates;
- confidence;
- validation errors;
- approval status.

Rule: AI draft is not financial truth until approved/posting use case succeeds.

## DB-150 `audit_events`
System-level audit beyond transaction revisions: login/security/config/master-data changes where needed.

---

# 10. Key relationship summary

```text
Party
 ├─< Account (as custodian/institution)
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

# 11. Required database constraints / transactional checks

At minimum the target backend must enforce in application/domain transaction boundaries:

1. ownership shares = Holding native quantity;
2. PortfolioSlices <= owner share;
3. cost-lot coverage remains consistent with owner quantity under chosen method;
4. closed/archived accounts/portfolios cannot receive ordinary new postings except approved closing flows;
5. no ownership transfer from custody/location changes;
6. Expected Income rows cannot mutate Holdings;
7. valuation snapshots cannot mutate transaction cash-flow history;
8. conversion source quantity must be available in the selected owner/portfolio scope;
9. multi-write mutations commit atomically;
10. retries must not double-post using idempotency keys where applicable.

# 12. Migration stance

When the product is rebuilt, do **not** mechanically migrate the current LocalStorage JSON shape as the production schema. Write an explicit migration/import adapter from prototype/sample data into the approved target domain once this database document reaches `Approved` status.