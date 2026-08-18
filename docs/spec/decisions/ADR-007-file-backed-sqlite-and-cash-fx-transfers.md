# ADR-007 — File-backed SQLite persistence and cross-currency cash transfers

Status: **Approved direction / implementation in progress**
Date: 2026-08-18
Related issues: #52, #53, #50, #33, #44
Supersedes: browser SQLite/IndexedDB operational persistence introduced in PR #51

## Context

Real-use testing exposed two independent problems that share one theme: MyFinMan is moving from a browser prototype toward a durable personal financial system.

1. Browser-local persistence is no longer an acceptable operational database. The user needs a real SQLite file that exists independently of DevTools/browser storage and can become the durable source of truth.
2. The existing «نقل أموال» use case only allowed same-currency Cash Asset → Cash Asset transfers. Real accounts frequently move money between currencies, so the transfer use case must preserve both source and target quantities and the execution FX rate.

## Decision 1 — SQLite is owned by a local data service, not the browser

Target topology:

```text
Browser UI
   ↓ HTTP API
MyFinMan local server
   ↓
data/myfinman.sqlite
```

Rules:

- `data/myfinman.sqlite` is the operational database file after migration.
- Browser code never opens the SQLite file and does not persist SQLite bytes in IndexedDB.
- The local server owns database locking, transactions, journaling and schema metadata.
- Domain/Application logic remains independent from SQLite; persistence crosses the repository/API boundary.
- Database files and WAL/SHM companions are private runtime data and must be gitignored.

### Phase-1 storage shape

The first file-backed phase stores the canonical `FinanceState` losslessly in `app_state`, while maintaining relational storage metadata tables:

- `app_state`
- `migration_journal`
- `export_checkpoints`

This is intentional. It moves durability and ownership of data to real SQLite without prematurely decomposing the financial Domain into relational tables before that schema and its migrations are designed explicitly.

A later relational decomposition must be its own schema decision/migration and may not silently replace this contract.

## Decision 2 — Migration from browser data is explicit and non-destructive

When SQLite has no application state and legacy browser data exists:

- display the legacy state so the user can verify it;
- expose a temporary **«ترحيل إلى SQLite»** action;
- do not auto-copy simply because the server started;
- refuse migration if SQLite was initialized in the meantime;
- record a migration journal row;
- do not delete legacy LocalStorage/old IndexedDB during the migration;
- switch subsequent persistence to `server_sqlite` only after the server confirms success.

This gives the user a visible cut-over point and preserves a rollback source during the discovery phase.

## Decision 3 — Markdown remains the schema migration interchange format

The operational database and migration interchange format serve different purposes:

```text
myfinman.sqlite
= durable operational store

myfinman-migration-*.md
= portable schema/migration checkpoint
```

Every export retains a lossless machine-readable snapshot inside Markdown. When the server SQLite mode is active, the same export time is also recorded in `export_checkpoints`.

Import of historical JSON exports remains supported.

## Decision 4 — Cash transfer may cross currencies

A cash account-like item is still a Cash Asset. Moving money between two existing Cash Assets is one use case whether the currencies match or differ.

### Same currency

```text
Cash Asset SAR A
  -- 1,000 SAR -->
Cash Asset SAR B
```

- source quantity = target quantity;
- exchange rate = 1;
- historical basis is carried, not realized merely because custody/account changed.

### Different currency

```text
Cash Asset SAR
  -- 750 SAR -->
Cash Asset USD
  <-- 200 USD
rate = 3.75 SAR per 1 USD
```

The transaction must preserve:

- `sourceHoldingId`
- `targetHoldingId`
- `sourceQuantity`
- `targetQuantity`
- `exchangeRate`
- historical `costBasisSar` when known
- reporting/event value
- realized FX result when the conversion realizes a known historical currency basis

No FX rate may be guessed.

## Decision 5 — User may enter target total or unit FX rate

The user always enters the source amount being deducted.

When currencies differ, the UI offers two equivalent input modes:

### A. Enter final target amount

```text
source = 375 SAR
target = 100 USD
```

Derived:

```text
rate = source / target
     = 3.75 SAR per USD
```

### B. Enter unit FX rate

```text
source = 375 SAR
rate = 3.75 SAR per USD
```

Derived:

```text
target = source / rate
       = 100 USD
```

The stored transaction keeps both final quantities and the execution rate. Currency-level rounding may apply to the target amount; the source amount and final stored target amount remain the executed facts.

## Decision 6 — FX transfer carries or preserves Unknown Cost Basis

If source historical basis is known:

- the portion transferred out carries its proportional historical basis;
- the target Cash Asset receives that exact total basis;
- target unit basis is derived from exact transferred total basis / received target quantity.

If source historical basis is unknown:

- target basis remains unknown;
- reversal restores unknown basis;
- current market FX is not substituted as historical cost.

## Decision 7 — Correction and void must replay both legs

A cross-currency transfer cannot be corrected by changing only one balance.

Correction/reversal must operate on the pair:

```text
sourceQuantity ↔ targetQuantity ↔ exchangeRate
```

If only source quantity is corrected and no new target amount/rate is supplied, the prior execution rate is preserved and a new target quantity is derived. If a new target amount is supplied, the rate is re-derived unless explicitly supplied consistently.

Void removes the target quantity and restores the source quantity with the historical source basis that the original transfer carried.

## Consequences

1. PR #51 browser SQLite remains historical implementation, not current persistence architecture.
2. MyFinMan now has a server/data boundary even while the UI remains local-first.
3. `npm run dev` must start both the API and Vite during local use.
4. File-backed SQLite creates the foundation for later relational schema evolution, backups and desktop packaging.
5. Transfer selectors should use ADR-006 tree-first Group → Cash Asset traversal.
6. FX Transfer is not a separate fake Asset or intermediary account; it is one audited movement/conversion between two existing Cash Assets.

## Non-goals

- This ADR does not yet normalize every FinanceState entity into relational SQL tables.
- It does not introduce cloud sync or multi-user concurrency.
- It does not auto-fetch an FX rate.
- It does not delete browser backups automatically.
- It does not merge Cash Asset and Portfolio semantics.

## Verification target

- real file exists at `data/myfinman.sqlite` after server start;
- database survives process restart;
- explicit migration preserves the browser state and logs the event;
- duplicate migration is rejected;
- post-migration writes go to server SQLite;
- Markdown export remains round-trip compatible;
- SAR→SAR and SAR↔USD transfer scenarios pass;
- enter-target and enter-rate modes derive each other;
- exact/unknown historical basis survives transfer, correction and void;
- production frontend build and automated tests remain green.
