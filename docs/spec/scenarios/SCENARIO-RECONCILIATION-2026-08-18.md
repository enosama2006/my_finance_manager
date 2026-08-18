# MyFinMan Scenario Reconciliation & Architecture Simulation — 2026-08-18

Status: **Living validation matrix**
Authority: scenario facts remain historical truth; current architectural interpretation follows Approved ADRs first, then Draft ADR-005 where explicitly marked.

## Why this document exists

Real-use testing exposed semantic drift between early `Place -> Account -> Holding` experiments and the later `Group -> Asset` model. This matrix prevents old scenario wording from silently reintroducing deprecated architecture.

## Current normalized interpretation used for simulation

Approved:

```text
Group       = only user hierarchy/container; no balance
Asset       = quantity-bearing financial truth; receives transactions
Owner       = whose wealth
Portfolio   = why value is reserved/managed
Transaction = what happened
```

Draft refinement under ADR-005:

```text
InstrumentDefinition = stable identity/reference for a market/economic instrument
Asset                 = one concrete user holding/balance of that instrument
CostBasisLot           = one acquisition contribution to the Asset
Position               = optional performance/lifecycle lens, not one-purchase-per-Asset
InvestmentDistribution = cash flow from investment Asset to Cash Asset
```

Historical terminology mapping:

```text
old Asset master  -> InstrumentDefinition
old Holding       -> current Asset instance
old Account/Place -> Group UI context + optional explicit provider/custodian/location metadata
```

---

# Scenario inventory and reconciliation

## SCN-001 — Precious Metals Distributed Across Custody and Portfolios

Facts: one economic Gold/Silver instrument, quantities distributed across home, Al Rajhi and brother custody; ownership != custody; claim != specific physical custody.

Conflict: old text uses normalized Asset master + Holding + Account/Container.

Current interpretation:
- Gold/Silver identity -> InstrumentDefinition;
- each intentionally separate custody pool -> Asset instance;
- custodian/location explicit metadata on the Asset;
- Group may organize/mirror the context but does not itself establish custody;
- total Gold/Silver exposure is derived across Assets sharing instrumentId/identity.

Simulation: **PASS conceptually** under ADR-005. Prototype still lacks stable instrumentId/catalog.

## SCN-002 — Income-Producing Assets, Portfolio Funding, and Asset-Level Profitability

Facts: 1m SAR across five banks, metals, vehicles/property, 500k investment purpose across sources, real purchase from one physical source, no fake transfer, cost != valuation, operating income != valuation P/L.

Conflict: bank `Account/Container` terminology.

Current interpretation:
- each real cash balance -> Cash Asset;
- bank/provider organization -> Groups plus institution metadata;
- Portfolio remains economic WHY and can span providers;
- actual payment debits one Cash Asset;
- Portfolio backing/reallocation changes purpose only;
- acquired vehicle/property is an Asset.

Simulation: **PASS conceptually**. Exact designated-backing policy remains Draft/not fully implemented.

## SCN-003 — Child Cash, Parent Custody, Internal Use, and Ownership Substitution

Facts: children own Eid cash, Father custodies it; same physical cash may contain multiple ownership shares; spending another owner's cash creates claim/liability unless ownership is explicitly substituted.

Conflict: `Home Safe Container/Holding` wording only.

Current interpretation:
- Home Safe can be a Group for organization;
- one SAR Cash Asset may carry multiple OwnershipShares and explicit custodian/location metadata;
- child Portfolio is WHY, not custody;
- claims/liabilities remain independent.

Simulation: **PASS conceptually**. Ownership-substitution command remains Draft.

## SCN-004 — Portfolio Archetypes, Free Liquidity, and Inter-Owner Settlement

Facts: physical payer, economic owner, Portfolio purpose and settlement can differ; child Gold may be paid from Father's bank and settled from child cash without fake transfers.

Conflict: source `Account/Holding` language.

Current interpretation:
- payment source = Cash Asset;
- acquired Gold = Asset owned by child;
- Portfolio transforms from child cash allocation to Gold allocation;
- settlement changes ownership/claim/liability explicitly.

Simulation: **PASS conceptually**, **PARTIAL implementation** because full cross-owner settlement/replay is not yet complete.

## SCN-005 — Savings Backing, Account Segregation, and Maturity Ladder

Facts: daily-spending and savings are intentionally segregated; Namaa is a real investment instrument; contributions != profit; maturity returns principal + realized profit; reinvestment begins another cycle.

Conflict: Account/Holding phrasing.

Current interpretation:
- Alinma cash -> Cash Asset;
- Namaa -> Investment Asset/InstrumentDefinition;
- Group may mirror Alinma/provider context;
- Portfolio is Long-Term Savings WHY;
- optional backing policy may reference exact Assets;
- maturity is Asset -> Cash transformation, not Portfolio closure.

Simulation: **PASS conceptually**, designated/hard backing still Draft.

## SCN-006 — Entrusted Crypto-to-Cash Settlement Cycle

Facts: 1,000 USDT received under mandate, converted through TRY/USD, costs/spread may belong to different parties, final delivery settles obligation, entrusted value must not become free liquidity.

Conflict: multiple Account references only; scenario semantics remain valid.

Current interpretation:
- Binance USDT, Turkey TRY and USD cash are Assets;
- Groups organize providers/contexts;
- SettlementMandate/Encumbrance controls economic availability;
- Portfolio is not used as a substitute for mandate restriction.

Simulation: **PASS model**, **NOT fully implemented** because mandate/encumbrance engine remains Draft.

## SCN-007 — Cost Flow, Acquisition Chain, and End-to-End Asset Cost

Facts: SAR -> USD -> Land and payment -> USDT -> XRP must preserve all-in basis through intermediate assets; valuation never rewrites basis.

Conflict: wording `real Account` only.

Current interpretation:
- source is Cash Asset;
- bridge Assets may be transient but still ledger-visible;
- AcquisitionChain links legs and carries attributable cost;
- exact lot basis must be lossless per ADR-005/#38.

Simulation: **PASS conceptually**, AcquisitionChain still Draft.

## SCN-008 — Valuation Role and Performance Recognition

Facts: cost always retained when economically relevant; performance presentation depends on role; transactional USD differs from investment USD; Gold/XRP show unrealized P/L; quote direction matters.

Conflict: `Asset master` wording.

Current interpretation:
- USD/Gold/XRP identity -> InstrumentDefinition;
- concrete balances -> Assets;
- performance role belongs to Asset/Position/lot scope, not instrument globally;
- current FX valuation and historical acquisition basis remain separate.

Simulation: **PASS conceptually**; real snapshot exposed FX-opening basis bug (#38).

## SCN-009 — Portfolio Lifecycle, Capital Cycles, and Position Closure

Facts: Portfolio, CapitalCycle and Position have different lifecycles; returned principal != income; one Position can close while Portfolio remains; recurring commitments/savings have period cycles.

Conflict: none with Group -> Asset.

Refinement: repeated purchases must not manufacture new Asset instances or Positions automatically. Position is optional lifecycle/performance scope.

Simulation: **PASS model**, CapitalCycle implementation remains partial.

## SCN-010 — Expense Tree and Portfolio Consumption

Facts: clean onboarding, category tree, expense source, optional Portfolio consumption, protected allocations, no fake transfers.

Conflict: onboarding still says Bank Party -> Account -> Holding.

Current interpretation:
- user may create Group/provider organization;
- create Cash Asset directly;
- opening state on Cash Asset;
- Expense source = Cash Asset;
- category = WHAT; Portfolio = WHY; beneficiary = WHO.

Simulation: **PASS after terminology update**.

## SCN-011 — Place-First Custody, Purchase and Export

Facts still valuable: clean onboarding, simple purchase, cost vs valuation, unrealized vs realized P/L, exact snapshot export/import.

Decision conflict: Place -> Account -> Holding hierarchy is obsolete.

Current status: **SUPERSEDED architecture** by ADR-004/ADR-005.

Replacement flow:

```text
optional Group -> Cash Asset -> purchase -> target Asset in Group
```

Simulation: **PASS after replacement**; Place/Account requirements must not be revived.

## SCN-012 — Expense Necessity, Beneficiaries and Tree UX

Facts: deep category UX, necessity default/override, beneficiary independent from category/Portfolio/payment source, group beneficiary no multiplication.

Conflict: example says WHERE = account.

Current interpretation: WHERE/source = Cash Asset; all other dimensions unchanged.

Simulation: **PASS**.

## SCN-013 — User-defined Account Groups

Original decision: Group -> Account -> Holding.

Current status: **SUPERSEDED** by ADR-004 / SCN-021.

Facts retained:
- Groups are hierarchical and have no wealth;
- reorganization must not create financial events;
- migration must not duplicate value.

Replacement: Group -> Asset.

Simulation: **PASS only after supersession mapping**.

## SCN-014 — Audited Transaction Correction

Original limitation: only non-financial fields editable under schema-v4.

Current status: historical limitation **partly superseded by schema-v5 replay engines**.

Rule retained:

```text
Reverse old projection -> replay corrected intent -> same logical ID -> revision audit
```

Current prototype supports more common financial corrections; complex downstream chains still require sequential replay/refusal.

Simulation: **PASS principle**, **PARTIAL coverage**.

## SCN-015 — Opening Balance Single Entry and Void

Conflict: uniqueness keyed by Account + Owner + Asset/Symbol.

Current key:

```text
Asset instance + Owner
```

Opening is state initialization, not recurring income. Foreign currency opening basis can be unknown; valuation must not fabricate basis.

Simulation: **PASS after key correction**.

## SCN-016 — User-Correctable Asset Purchase

Conflict: source/target Account and new-Holding-per-purchase assumptions.

Current interpretation:
- source = Cash Asset;
- destination = existing Asset or new Asset;
- target Group only when creating/repositioning the Asset;
- repeated purchase adds exact lot to existing Asset;
- correction/void reverses only the affected purchase lot/projection;
- downstream dependencies still protect against unsafe local mutation.

Simulation: **PASS target**, **NOT yet implemented for repeated purchase** (#36).

## SCN-017 — Ledger Cleanup Visibility

Facts: voided audit rows remain persisted; operational ledger may hide them by default with explicit toggle.

No architecture conflict.

Correct implementation status: **Draft / Open UX debt**, not verified as implemented on main.

Simulation: **PASS**.

## SCN-018 — User Correction Principle

Rule remains authoritative: all user-entered data must be correctable; financial correction must reproject dependent state.

Coverage wording is outdated after schema-v5 work.

Simulation: **PASS principle**, coverage remains staged for complex transaction families.

## SCN-019 — Native Currency vs Reporting Currency

Conflict: Account currency is no longer a target-domain layer.

Current interpretation:
- Cash Asset has native currency/quantity;
- reporting currency is presentation only;
- current valuation uses FX/reference;
- historical basis is independent and may be unknown;
- do not force cost basis = current/reference FX.

Simulation: **PASS after basis refinement**, #38 required for financial correctness.

## SCN-020 — Hierarchical Account Cascader

Original terminal node = Account.

Current status: **SUPERSEDED UX pattern** by Group -> eligible Asset cascader (Issue #33).

Retained UX rule:
- preserve user hierarchy;
- groups are navigation nodes;
- eligible Assets are terminal selectable nodes;
- no auto-select;
- deterministic Arabic sorting;
- Breadcrumb;
- operation-specific eligibility predicate.

Simulation: **PASS after replacement**.

## SCN-021 — Group -> Asset and Full User Correction

This is the current Approved structural baseline.

Refinements from real use:
- one Asset is one concrete holding/balance, not one abstract instrument definition;
- InstrumentDefinition provides shared identity for aggregation/catalog;
- repeated purchase can target existing Asset and add CostBasisLot;
- Group remains organizational even when it mirrors provider/account context;
- Portfolio remains WHY;
- distributions and exact basis require explicit modeling.

Simulation: **PASS as baseline with ADR-005 refinements**.

## SCN-022 — Real Investment Account, Funds, Distributions and DCA

Facts from actual user snapshot:
- 150k SAR broker cash started as an opening state;
- two 50k fund purchases leave 50k cash;
- a real Portfolio object exists but is unused;
- one fund distributes cash, another does not;
- repeated purchase must increase the same selected Asset;
- current unit-cost rounding loses exact basis;
- foreign-currency opening basis was fabricated as 1 SAR/USD.

Simulation: **PASS target under ADR-005**, with implementation gaps #34/#36/#37/#38.

---

# Consolidated simulation — does one model solve all scenarios?

Proposed model:

```text
Party / Owner
InstrumentDefinition (reference only)
Group tree (organization only)
Asset instances (quantity-bearing truth)
OwnershipShares
Exact CostBasisLots
Portfolio / PortfolioAllocation (WHY)
LogicalTransactions + revisions + normalized effects
Position / CapitalCycle (optional lifecycle/performance)
Claim / Liability / SettlementMandate when required
ValuationSnapshots
InvestmentDistribution events
```

## Result matrix

| Capability | Scenarios | Result |
|---|---|---|
| Distributed Gold/Silver custody without double count | 001, 002, 003 | PASS with InstrumentDefinition + multiple Assets |
| Owner != custodian | 001, 003, 004, 006 | PASS |
| Group organization without fake financial effects | 010, 013, 021, 022 | PASS |
| Bank/broker context without mandatory Account entity | 002, 005, 022 | PASS |
| Portfolio = WHY, not account/location | 002-005, 009-010, 022 | PASS |
| Free Liquidity / protected allocations | 002-005, 010 | PASS conceptually |
| Cross-owner settlement | 003, 004 | PASS model / partial implementation |
| Mandate/entrusted funds | 006 | PASS model / not implemented |
| End-to-end cost flow | 007, 008 | PASS model / AcquisitionChain pending |
| Position vs Portfolio vs cycle lifecycle | 009 | PASS model / partial implementation |
| Expense dimensions | 010, 012 | PASS |
| Old Place/Account architecture | 011, 013, 020 | SUPERSEDED cleanly |
| User correction/audit | 014-018, 021 | PASS principle / staged complex replay |
| Multi-currency reporting | 019 | PASS after historical-basis separation |
| Repeated DCA purchases | 022 + #36 | PASS target / not implemented |
| Distributing vs accumulating funds | 022 + #37 | PASS target / not implemented |
| Exact Cost Basis with fractional units | 022 + #38 | PASS target / critical implementation gap |
| Instrument/provider catalog | 022 + #34 | PASS target / not implemented |

## Architectural conclusion

The reconciled model solves the scenarios **without reintroducing mandatory Account as a wealth/container entity**, provided three refinements are accepted:

1. `InstrumentDefinition` is separated from the user's quantity-bearing `Asset`;
2. repeated purchases add lots to an existing selected Asset instead of creating a new Asset by default;
3. cash distributions are first-class investment cash-flow events linked to the source Asset.

The model still needs dedicated modules for SettlementMandate, AcquisitionChain and full CapitalCycle replay, but these are extensions rather than contradictions in the core wealth model.

## Critical next implementation order

1. #38 exact Cost Basis + foreign-currency historical basis.
2. #36 repeated purchases into existing Asset with independently reversible lots.
3. #34 Instrument Catalog / stable instrument identity.
4. #37 broker/investment context UX + fund distributions + performance decomposition.
5. #33 reusable Group -> Asset cascader.
6. #35 purchase-form reset.
7. generic normalized TransactionLeg/replay for complex settlement chains.
