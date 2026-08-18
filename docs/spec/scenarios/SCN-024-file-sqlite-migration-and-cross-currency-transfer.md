# SCN-024 — Explicit migration to file-backed SQLite and cross-currency cash transfer

Status: **Approved target / implementation in progress**
Date: 2026-08-18
Related: ADR-007, #52, #53, #33, #44

## Accepted real facts

- MyFinMan already has real user data in legacy browser storage from schema-v5 experimentation.
- The user no longer wants the operational database to live inside browser storage/IndexedDB.
- The user needs a real SQLite file and a visible migration action before cutting over.
- The user owns cash Assets in more than one currency and needs to move money between them.
- For an FX movement, the user may know either the final amount credited to the target account or the unit exchange rate; entering both manually should not be mandatory.

## Scenario A — Explicit browser → SQLite cut-over

Initial state:

```text
Legacy LocalStorage
└── schema-v5 FinanceState with real data

Local SQLite server
└── data/myfinman.sqlite
    └── schema exists, app_state empty
```

Expected UI/runtime:

```text
MyFinMan displays legacy data
+ temporary button: «ترحيل إلى SQLite»
```

User clicks the button and confirms.

Expected result:

```text
Legacy LocalStorage                 data/myfinman.sqlite
        retained             →      app_state = exact current state
                                   migration_journal += 1

runtime mode:
legacy_browser → server_sqlite
```

Subsequent financial operations persist to the server SQLite file, not IndexedDB.

### Safety challenge

If another process/action initialized `app_state` before the user clicks migration, migration must fail rather than overwrite the database.

## Scenario B — Same-currency transfer

```text
الراجحي SAR = 1,000 SAR
الإنماء SAR =   100 SAR
```

User transfers 250 SAR.

Expected:

```text
الراجحي = 750 SAR
الإنماء = 350 SAR
sourceQuantity = 250
targetQuantity = 250
exchangeRate = 1
```

No new Asset and no realized gain merely from moving the same currency between accounts/custody.

## Scenario C — SAR → USD using unit rate

Initial:

```text
SAR source = 1,000 SAR
USD target = 0 USD
```

User enters:

```text
source amount = 750 SAR
rate = 3.75 SAR per 1 USD
```

Derived before confirmation:

```text
target amount = 750 / 3.75 = 200 USD
```

Expected persisted transaction:

```text
sourceQuantity = 750
targetQuantity = 200
exchangeRate = 3.75
```

If source historical basis is 1 SAR per SAR, exact transferred basis is 750 SAR and target lot total basis is also 750 SAR.

## Scenario D — SAR → USD using target total

User instead enters:

```text
source amount = 375 SAR
target amount = 100 USD
```

Derived:

```text
exchangeRate = 375 / 100 = 3.75 SAR per USD
```

The stored transaction is financially equivalent to entering the unit rate.

## Scenario E — Currency historical basis realization

Initial:

```text
USD source quantity = 200 USD
historical basis = 3.50 SAR/USD
current/reporting value = 4.00 SAR/USD
SAR target = 0
```

Transfer/convert:

```text
100 USD → 400 SAR
```

Carried historical basis:

```text
100 × 3.50 = 350 SAR
```

Execution/reporting value:

```text
400 SAR
```

Expected realized FX result:

```text
+50 SAR
```

Target SAR receives 350 SAR historical basis for this realized conversion flow, while its nominal quantity is 400 SAR. Reporting value and historical basis remain separate facts.

## Scenario F — Unknown historical FX basis

If the 100 USD source has unknown historical basis:

```text
50 USD → 187.50 SAR
```

Expected:

- source decreases by 50 USD;
- target increases by 187.50 SAR;
- `exchangeRate = 0.266666...?` only according to the chosen source-per-target convention when direction is USD→SAR (or the exact derived source units per target unit);
- `costBasisSar = null`;
- target historical basis stays unknown;
- no fabricated realized gain/loss based on current FX.

## Correction simulation

Original:

```text
750 SAR → 200 USD @ 3.75
```

If user corrects only source amount to 375 SAR and supplies no new FX input, Replay keeps the original rate and derives:

```text
375 / 3.75 = 100 USD
```

If user explicitly changes target amount to 120 USD, the rate is re-derived from source / target unless an explicit consistent rate is supplied.

## Void simulation

Voiding the FX transfer must:

1. remove the exact target quantity created by the movement;
2. restore the exact source quantity;
3. restore source historical basis if known;
4. preserve Unknown if it was unknown;
5. mark the transaction voided with audit revision rather than deleting history.

## Acceptance result

The unified solution passes this scenario if:

- file-backed SQLite becomes source of truth only after explicit migration;
- legacy browser data is not destroyed during cut-over;
- database collision prevents accidental overwrite;
- same-currency and different-currency cash movements share one coherent transfer use case;
- source total + target total + unit FX rate are mutually derivable as defined;
- the two executed quantities and rate are persisted;
- Cost Basis and current/reporting value do not collapse into one number;
- correction/void operates on both legs and remains auditable;
- Group→Cash Asset tree selection is used rather than flat account lists.
