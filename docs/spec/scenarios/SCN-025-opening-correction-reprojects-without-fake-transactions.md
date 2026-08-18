# SCN-025 — Opening correction reprojects without fake transactions

Status: **Approved / Implemented / automated verification passed / awaiting real-use verification**
Date: 2026-08-18
Related: ADR-008, #56, SCN-018

## Accepted real fact

The user manually entered a USD Opening Balance and later discovered it was 10 USD too high. Real financial movements were recorded after that Opening and are believed correct.

The correction must fix the original historical fact. It must not ask the user to re-enter later transactions and must not create a compensating event that never happened.

## Scenario

Initial effective facts:

```text
Opening       +75.09 USD   ← wrong user input
Transfer      -40.00 USD   ← real and correct
```

Current projection before correction:

```text
35.09 USD
```

The user edits the Opening transaction and changes it to:

```text
65.09 USD
```

## Expected audit result

The same logical Opening transaction becomes:

```text
Opening Transaction ID = unchanged
v1 = 75.09 USD
v2 = 65.09 USD
reason = user correction
```

The later Transfer remains byte-for-byte/logically unchanged:

```text
Transfer Transaction ID = unchanged
quantity = 40 USD
status/version/revisions = unchanged
```

No additional financial event is inserted.

Forbidden results:

```text
Reconciliation -10 USD   ❌
Expense -10 USD          ❌
Fake Transfer -10 USD    ❌
Void + recreate Transfer ❌
```

## Expected projected result

```text
Corrected Opening  +65.09
Later Transfer     -40.00
-------------------------
Current Balance     25.09 USD
```

Every screen that reads the same Asset projection must show 25.09 USD after persistence reload.

## Cost Basis edge case

If historical acquisition basis for the USD Opening was unknown before correction, it remains unknown afterward. Current FX valuation must not be substituted as historical basis merely because quantity changed.

## Distinguish Reconciliation

If the Opening and all recorded transactions are believed correct, but an external bank statement says the real balance differs, that is a different scenario and may require a Reconciliation event.

Here the user explicitly knows the Opening input itself was wrong, so the correct action is **Correction + Reprojection**, not Reconciliation.

## Acceptance — automated result

- [x] Correcting 75.09 → 65.09 succeeds after the later 40 USD transfer.
- [x] Current source projection becomes 25.09 USD.
- [x] Target of the real 40 USD transfer remains unchanged.
- [x] Opening keeps the same Transaction ID and adds one revision containing 75.09.
- [x] Later transaction stays unchanged.
- [x] Ledger count does not increase.
- [x] No reconciliation/fake financial transaction is created.
- [x] Unknown historical basis remains unknown.
- [x] SQLite persistence integration test remains green.
- [x] TypeScript and Vite Production Build remain green.

Automated verification on PR #57: 18 Vitest files / 99 tests passed, plus 1 file-backed SQLite integration test passed. Real-use verification remains pending until the user corrects the actual USD Opening in the running application and confirms the persisted result after reload.
