# MyFinMan Operating Lab V1

Status: **Implemented Prototype / Draft lifecycle semantics**

## Purpose

Operating Lab V1 is the first executable pressure-test of the financial operating model discovered through SCN-001 through SCN-009. It is intentionally a prototype proving domain semantics and UX interactions, not the final database/application architecture.

The lab must make financial effects observable across the same state used by the existing Assets, Portfolios and Ledger screens.

## What is implemented

### Asset and cost-flow scenarios

- SAR -> USD -> Land with all-in cost propagated to the Land Cost Basis.
- Gold 10g buy -> hold -> sell with unrealized result while open and realized result on closure.
- Google Pay -> USDT -> XRP where on-ramp friction is carried into XRP Cost Basis and not double-counted.
- USD held as transactional foreign-currency cash: historical acquisition cost retained, unrealized P/L suppressed, realized result recorded when converted back to SAR.
- SYP held as an investment position with explicit quote direction and mark-to-market behavior.

### Existing versus newly purchased assets

- Existing vehicle onboarding records historical cost/current value without creating a fake current bank outflow.
- New vehicle purchase decreases the actual source cash Holding and creates a new Vehicle Position with cost and current valuation.
- Syria Land/Vehicle examples use an Assets-in-Syria custody/location account purely as a prototype location/container representation.

### Portfolio and lifecycle scenarios

- Long-lived Investment and Child/Savings Portfolios survive Position closure.
- Position is independently Open/Closed.
- CapitalCycle is independently Open/Closed and freezes a realized result on close.
- Gold sale proceeds are decomposed conceptually into returned principal plus realized gain; the full cash proceeds are not treated as investment income.
- Child cash/gold remain child-owned while physically held in the home container.
- Contributions increase capital/value and are not classified as investment profit.

### Commitment coverage

Rent and School examples expose two separate management metrics:

- Economic Coverage: current value allocated to the commitment.
- Settlement-Ready Coverage: value currently held as cash and ready for settlement.

The Rent example intentionally combines SAR cash and Gold so the user can see a commitment that is economically funded but not fully payment-ready.

### Short commercial cycle

The lab contains a finite USDT -> TRY -> settlement example:

- an execution spread is visible while the cycle is still open;
- remaining settlement exposure prevents treating that spread as the final cycle outcome;
- an additional settlement cost can be posted;
- only then does the CapitalCycle close and freeze native/reporting results;
- residual TRY becomes a new post-cycle Position so later FX movement cannot rewrite the historical closed-cycle result.

## Prototype screens

A new `مختبر التشغيل المالي` screen is the default entry point. It provides executable scenario cards and displays:

- actual account values;
- position cost/current value/P&L policy;
- portfolio commitment coverage;
- open/closed cycle status;
- child long-lived portfolio summary.

Scenario actions write into the same FinanceState and Ledger used by the rest of the prototype, so their consequences are visible in:

- Assets & Accounts;
- Portfolios;
- Ledger/activity;
- Scenario Lab.

Use the existing Reset action to reload the complete lab seed before repeating scenarios.

## Automated acceptance coverage

Operating Lab tests cover at least:

1. Land Cost Basis carries full SAR economic cost through intermediate USD.
2. Gold round-trip returns principal and realizes only the gain.
3. XRP Cost Basis includes the payment/on-ramp friction exactly once.
4. Transactional USD suppresses unrealized P/L and realizes the final conversion loss.
5. SYP investment valuation respects FX quote direction.
6. Existing vehicle onboarding does not debit a current bank account.
7. New vehicle purchase debits the real source account.
8. Commitment economic coverage differs from settlement-ready cash.
9. Commercial cycle cannot be considered final at the first realized spread and freezes result only when settlement closes.

## Important architectural boundary

This prototype **does not supersede ADR-002**.

The current executable application still uses legacy `PortfolioSlice = Portfolio + Holding + Owner + Quantity` to keep the existing UI/state operational.

The Approved target remains ordinary custody-independent economic allocation conceptually:

```text
PortfolioAllocation = Portfolio + Owner + Asset + Quantity
```

with Account/Holding answering physical location and optional Backing Policy handling desired/required physical support.

Therefore:

- Operating Lab V1 is an implementation laboratory, not approval of legacy PortfolioSlice as target persistence.
- `availableByOwner` remains the legacy prototype availability calculation, not the final Owner+Asset cross-account Free Liquidity engine.
- `CapitalCycle`, final Position persistence, recurrence schema, and exact performance methodology remain Draft target architecture until explicitly approved.

## Next expansion after user validation

If this lab is accepted as a useful first executable foundation, the next increment should replace the legacy allocation engine with the ADR-002 economic PortfolioAllocation model and build dedicated application use cases for:

- real transfer;
- asset acquisition/disposal;
- existing asset onboarding;
- position partial disposal;
- cycle close preview/guards;
- portfolio close/release;
- commitment settlement;
- recurring contributions and commitment cycles;
- backing policies;
- contribution-aware portfolio performance.
