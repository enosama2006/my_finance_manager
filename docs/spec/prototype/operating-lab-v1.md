# MyFinMan Operating Lab V1

Status: **Implemented Prototype / Draft lifecycle semantics**

## Purpose

Operating Lab V1 is the executable pressure-test of the financial operating model discovered through SCN-001 through SCN-010. It is intentionally a prototype proving domain semantics and UX interactions, not the final database/application architecture.

The product experience and the Scenario Lab are now deliberately separated:

- the normal product starts from a clean user state;
- Scenario Lab data is loaded only by explicit user action;
- both still exercise the same Domain/Application rules once loaded.

## Clean-start product mode

The default MyFinMan experience contains no financial demo data.

Initial state contains only the system identity `أنا`, which is required as the default economic owner. It contains:

- no banks/institutions;
- no Accounts;
- no Holdings or balances;
- no Portfolios;
- no Expense Categories;
- no Ledger transactions;
- no Positions or CapitalCycles.

The user can build the digital twin from scratch using the Operations workspace.

Reset now means **clear user data and return to the empty state**. It does not reload the scenario Seed.

Scenario Lab has an explicit `تحميل بيانات المختبر` gate because loading Demo data replaces the current prototype state. This prevents accidental mixing of benchmark/scenario records with user-entered financial data.

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

After the expense extension, Commitment and SpendingBudget Portfolios additionally distinguish:

- original target;
- amount already spent/settled through linked Expense transactions;
- remaining required amount;
- remaining allocated economic value;
- settlement-ready cash.

A legitimate payment therefore reduces the outstanding requirement instead of appearing as a false funding shortfall.

### Short commercial cycle

The lab contains a finite USDT -> TRY -> settlement example:

- an execution spread is visible while the cycle is still open;
- remaining settlement exposure prevents treating that spread as the final cycle outcome;
- an additional settlement cost can be posted;
- only then does the CapitalCycle close and freeze native/reporting results;
- residual TRY becomes a new post-cycle Position so later FX movement cannot rewrite the historical closed-cycle result.

## Interactive Foundation

The product is not limited to preset scenarios. The `العمليات المالية` workspace exposes reusable Application commands for:

- creating Parties such as banks, brokers, institutions and people;
- creating an Account/container;
- adding an opening balance or a real Income flow;
- registering an Existing Asset without inventing a current bank payment;
- purchasing an Asset from a real Cash Holding with Cost Basis propagation;
- transferring the same Cash Asset between Accounts as a Real Transfer with no P/L;
- creating a Portfolio with profile/target/protection metadata;
- allocating free Asset quantity to a Portfolio without physical movement;
- routing to the existing Asset Conversion use case;
- creating and managing a hierarchical ExpenseCategory taxonomy;
- posting a cash Expense with an optional Portfolio link.

These are general commands over FinanceState; they are not hard-coded Gold/Land/XRP scenario buttons.

### Expense dimensions

A posted Expense now keeps three questions independent:

```text
WHAT  = ExpenseCategory
WHERE = source Account / Cash Holding
WHY   = optional Portfolio
```

If no Portfolio is selected, the expense must come from Free Liquidity.

If a Portfolio is selected, the physical source still records where money actually left, while the selected Portfolio allocation is consumed economically. Allocations belonging to other Portfolios cannot be silently invaded.

The current implementation uses legacy PortfolioSlice as prototype persistence; ADR-002 remains the target allocation architecture.

### Command invariants

- Account creation creates no wealth by itself.
- A zero-balance Account remains visible in the Account lens.
- Opening balance is not Income.
- Existing Asset onboarding creates no fake cash outflow.
- Asset purchase reduces the real source Holding and creates the acquired Holding/Position.
- Purchase Cost Basis is propagated from the source capital plus optional all-in acquisition costs.
- Real Transfer creates no income, expense, or realized P/L.
- Prototype Portfolio purpose is preserved across Real Transfer by moving legacy slices proportionally; target ADR-002 allocation remains custody-independent.
- Portfolio allocation changes WHY only and leaves physical Holding quantity unchanged.
- ExpenseCategory changes WHAT only; it does not answer WHERE or WHY.
- Unlinked Expense consumes Free Liquidity only.
- Linked Expense reduces both the actual physical source and the selected Portfolio's remaining economic allocation.

## Responsive shell

The earlier prototype accidentally constrained the entire application to a maximum width of about 520px, which made desktop rendering look like a phone embedded in a browser. That behavior is explicitly rejected.

Implemented prototype breakpoints follow the Approved responsive intent:

```text
< 768px       Mobile: full viewport, bottom navigation, touch-first single-column forms/cards.
768-1199px    Tablet: RTL right navigation rail, wider 1-2 column content.
>= 1200px     Desktop: RTL right sidebar, top context/quick action, wide multi-column content.
```

There is one application and one state/use-case model across breakpoints; responsiveness is Presentation behavior only.

Dashboard is the default entry point. Scenario Lab remains a secondary pressure-test tool.

## Prototype screens

The same user state can be inspected from:

- Dashboard;
- Portfolios;
- Assets & Accounts;
- Operations Hub;
  - general operations;
  - expense entry;
  - hierarchical expense categories;
  - parties/banks;
- Ledger/activity;
- Asset Conversion;
- isolated Scenario Lab.

## Automated acceptance coverage

The test suite covers the original lifecycle/asset scenarios plus interactive commands and SCN-010 behaviors, including:

1. Land Cost Basis carries full SAR economic cost through intermediate USD.
2. Gold round-trip returns principal and realizes only the gain.
3. XRP Cost Basis includes the payment/on-ramp friction exactly once.
4. Transactional USD suppresses unrealized P/L and realizes the final conversion loss.
5. Existing vehicle onboarding does not debit a current bank account.
6. New vehicle purchase debits the real source account.
7. Real Transfer preserves value and creates no P/L.
8. Portfolio creation creates no physical movement.
9. Portfolio allocation leaves Holding quantity unchanged.
10. Empty start contains no financial/demo data.
11. A Bank Party can be created from empty state.
12. Expense category tree rejects cycles.
13. Unlinked Expense reduces free cash without changing Portfolio allocations.
14. Linked Expense reduces both physical cash and the selected Portfolio allocation.
15. Expense can be paid from eligible free cash while consuming Portfolio backing represented elsewhere.
16. Parent ExpenseCategory totals roll up descendant expenses.

## Important architectural boundary

This prototype **does not supersede ADR-002**.

The current executable application still uses legacy `PortfolioSlice = Portfolio + Holding + Owner + Quantity` to keep the existing UI/state operational.

The Approved target remains ordinary custody-independent economic allocation conceptually:

```text
PortfolioAllocation = Portfolio + Owner + Asset + Quantity
```

with Account/Holding answering physical location and optional Backing Policy handling desired/required physical support.

Therefore:

- Operating Lab / Interactive Foundation is an implementation laboratory, not approval of legacy PortfolioSlice as target persistence.
- `availableByOwner` remains the legacy prototype availability calculation, not the final Owner+Asset cross-account Free Liquidity engine.
- CapitalCycle, final Position persistence, recurrence schema, advanced expense settlement and exact performance methodology remain Draft target architecture until explicitly approved.
- Expense taxonomy independence (WHAT vs WHERE vs WHY) is a domain direction validated by SCN-010; final target schema IDs/DB tables remain subject to later approval.

## Next expansion after user validation

Likely next increments include:

- replace legacy allocation persistence with ADR-002 PortfolioAllocation;
- asset disposal / partial disposal;
- cycle creation/close preview/guards;
- portfolio close/release;
- commitment settlement lifecycle;
- recurring contributions and commitment cycles;
- backing policies;
- contribution-aware portfolio performance;
- split expenses across categories/Portfolios;
- credit-card expense + settlement integration;
- refunds tied to original expense;
- AI/OCR expense classification proposals;
- editing/correcting existing Accounts, Assets, Portfolios and Transactions through audited revision flows.
