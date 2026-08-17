# ADR-001 — Cash Is an Asset; Account Is a Container

Status: **Accepted**
Captured: `2026-08-17`
Related: `ENT-010 Account`, `ENT-020 Asset`, `ENT-030 Holding`, `RULE-009`, `CALC-004`, `UC-TRF-001`, `UC-CONV-001`
Source decision: `docs/cash-model-note.md`

## Context

MyFinMan must not double-count money by treating both a bank account and the money inside it as separate assets. It must also distinguish moving the same currency between accounts from exchanging one currency into another.

## Decision

1. **Cash is an Asset represented by Holdings.**
2. **Account/Container is not an Asset.** It identifies where/how the Holding exists.
3. SAR, USD and other currencies are distinct cash Assets identified by symbol/native unit; they do not require a separate AssetClass called `currency`.
4. Top-level AssetClass for these Assets is `cash` / “Cash & Cash Equivalents”.
5. A home vault is an Account/Container type such as `cash_container`, not a Cash Asset.

Examples:

```text
Al Rajhi current account = Account
10,000 SAR inside it = SAR Cash Holding

Home vault = cash_container Account
5,000 SAR inside it = SAR Cash Holding
1,000 USD inside it = USD Cash Holding
```

## Operational consequence

### Same Asset, different Account

```text
SAR in Al Rajhi → SAR in Alinma
```

= `Real Transfer`.

No sale/conversion and no realized P/L for principal.

### Different cash Assets

```text
USD → SAR
```

= `Asset Conversion`.

Can create realized P/L according to owner-specific cost basis, execution consideration and fees.

## Calculation consequence

Account current value is derived from Holdings in the Account. Do not calculate:

```text
Account as asset + cash inside account
```

Only contained Holdings contribute asset value.

## Data consequence

Target `assets.asset_class` uses `cash`, not separate `cash` and `currency` classes for ordinary currencies.

Target `accounts.account_type` uses container semantics such as `checking`, `saving`, `investment`, `cash_container`, `custody`, etc.

## UX consequence

In “Assets & Accounts”:
- Account answers **أين؟**
- Holding answers **ماذا وكم؟**
- Owner answers **لمن؟**
- Portfolio answers **لأي غرض؟**

The UI may label a user-facing group “نقد وعملات”, but this label must not imply that Account itself is an Asset or that “currency” is a second competing domain classification.

## Alternatives rejected

### Account balance as the asset itself
Rejected because it breaks mixed-asset accounts/custody and risks double counting.

### Separate AssetKinds `cash` and `currency`
Rejected for ordinary cash currencies because SAR and USD differ by Asset identity while both are cash.

## Testing impact

Required scenarios:
- same-SAR account transfer creates no P/L;
- USD→SAR conversion can realize P/L;
- account total equals sum of contained Holding values and is not counted again in net worth.