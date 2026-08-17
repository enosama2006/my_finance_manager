# Valuation and Performance Recognition Policy — Draft

Status: **Draft**

## Problem

MyFinMan must use one asset engine for cash, currencies, metals, crypto, funds, property and other assets without forcing every held position to display live investment P/L.

Three concerns must remain independent:

1. **Cost Basis** — what economic cost was incurred to acquire the position.
2. **Valuation** — what the position is worth under a selected valuation method at a point in time.
3. **Performance Recognition** — when and how differences between cost and value are presented as realized/unrealized gain or loss.

## Draft principle

Cost basis tracking is independent from performance display.

A position can preserve exact acquisition basis while suppressing unrealized P/L until disposal.

## Candidate policy object

```text
PositionPerformancePolicy
- scopeType: OwnerAssetPosition | Holding | Lot | PortfolioPosition [TBD]
- scopeId
- role: TransactionalCash | BridgeAsset | InvestmentAsset | StoreOfValue [Draft]
- valuationMethod
- unrealizedDisplay: Off | Optional | On
- realizationPolicy: DisposalOnly | MarkToMarketPlusDisposal
- reportingCurrency
- benchmark/reference rate source [optional]
- liquidationValueEnabled
```

The policy must not be stored only on Asset master because the same Asset can have different roles simultaneously.

## Rules

### VP-RULE-01 — Preserve actual acquisition basis
The actual historical cost/outlay must remain recoverable even if the UI chooses a normalized/reference valuation anchor.

### VP-RULE-02 — Valuation does not rewrite cost
Changing current market price, appraisal, FX reference or liquidation estimate never overwrites historical Cost Basis.

### VP-RULE-03 — Performance role is contextual
USD can be ordinary liquidity, a bridge to purchase property, or an FX investment. The role belongs to the position/context rather than Asset=USD globally.

### VP-RULE-04 — Realization-only mode
For positions configured as realized-only, current valuation may still be calculated for Net Worth and optional liquidation-gap display, but routine unrealized investment P/L is suppressed. On qualifying disposal:

```text
Realized P/L = Net Disposal Proceeds - Disposed Cost Basis
```

### VP-RULE-05 — Mark-to-market mode
For investment positions:

```text
Unrealized P/L = Current Valuation - Remaining Cost Basis
```

with realized P/L on disposal under the approved basis method.

### VP-RULE-06 — Bridge cost propagation
When an intermediate Asset exists only as part of an AcquisitionChain, attributable historical cost can flow into the final Asset instead of creating a separate long-lived performance story for the bridge Asset.

### VP-RULE-07 — No double counting
Acquisition friction included in Cost Basis may be decomposed for explanation but must not be subtracted again as a separate P/L charge.

### VP-RULE-08 — FX quote orientation is mandatory
Currency valuation records must retain base/quote direction. A numeric rate without orientation is insufficient for P/L.

## Example — transactional USD

```text
Acquire 10,000 USD
Actual Cost Basis = 37,650 SAR
Current liquidation estimate = 37,400 SAR
Policy = TransactionalCash / RealizedOnly
```

Allowed UI:

```text
Quantity 10,000 USD
Cost 37,650 SAR
Reference/Liquidation Value 37,400 SAR
Investment P/L hidden
Potential liquidation gap optionally -250 SAR
```

If disposed for 37,400 SAR:

```text
Realized P/L = -250 SAR
```

## Example — investment Gold

```text
Acquire 1g Gold all-in at 540 SAR
Current market = 560 SAR
Policy = InvestmentAsset / MarkToMarketPlusDisposal
Unrealized P/L = +20 SAR
```

## Example — volatile currency investment

If the position is intentionally held to profit from currency movement, live valuation and unrealized P/L should be enabled even though the Asset class is still Cash/Currency.

## Open questions

- Exact policy scope: OwnerAssetPosition versus Holding versus CostBasisLot.
- Whether a single quantity can be partitioned into multiple roles without separate lots/sub-positions.
- Default policies per context and how AI may suggest them without mutating financial truth.
- Net-worth valuation policy when unrealized investment P/L is hidden.
- Treatment of spreads for transactional cash: optional liquidation-gap disclosure versus no display.
- Migration when user changes role after acquisition.
- Interaction with tax-specific realized FX requirements; MyFinMan product-performance semantics must remain distinct from statutory/tax accounting.
