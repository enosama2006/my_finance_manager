# MyFinMan — Screen Catalog

Status: **Approved information-architecture direction; individual screens evolve**

This catalog defines semantic screens for the future product. A screen is not necessarily a unique full page on every viewport: desktop may compose several semantic screens in one workspace, while mobile may navigate between them.

## Status legend

- `A` = Approved concept.
- `D` = Draft target behavior.
- `P` = represented in current prototype.
- `TBD` = unresolved detail.

---

# 1. Primary destinations

## SCR-001 — الرئيسية / Financial Overview
Status: `A + P`

### Purpose
Answer “أين أقف ماليًا الآن؟” without forcing the user to understand the internal ledger.

### Shows
- Net worth by selected owner/context.
- Assets total, external liabilities and net position.
- Truly Available amount derived from unallocated Holding quantities.
- Portfolio-covered value.
- Assets owned by the user but held by third parties.
- Realized P/L summary for selected period.
- Expected income/commitment warnings.
- Recent activity.
- Alerts such as reconciliation mismatches, late expected income, unfunded/negative clearing and stale valuations.

### Primary actions
- `ACT-001` Quick Action.
- Open portfolios `SCR-100`.
- Open assets/accounts `SCR-200`.
- Open activity `SCR-300`.
- Drill into metric source rather than showing unexplained totals.

### Mobile
Stacked summary cards; alerts; short recent activity; quick-action button/FAB.

### Desktop
Metric strip + portfolio/asset summaries + activity/alerts in multi-column workspace.

---

## SCR-100 — المحافظ / Portfolio Tree
Status: `A + P foundation`

### Purpose
Answer “لماذا خصصت أموالي؟ وما مدى تغطية كل غرض؟”

### Shows
- Unified hierarchical Portfolio Tree.
- Parent rollups from children without duplicate value.
- Target amount/value when a portfolio has a goal.
- Current covered value.
- Funding gap / clearing status if applicable.
- Owner(s) and beneficiary where relevant.
- Leaf Portfolio Slices showing the actual underlying Holdings/accounts.

### Primary actions
- `ACT-110` Open portfolio detail.
- `ACT-111` Create portfolio/sub-portfolio.
- `ACT-112` Edit portfolio metadata/target.
- `ACT-113` Reallocate purpose coverage.
- `ACT-114` Close/release portfolio.

### Rule
Portfolio is the purpose/earmark layer. It does not itself mean money moved between accounts.

---

## SCR-110 — Portfolio Detail
Status: `A / D detail`

### Shows
- Portfolio title, parent, owner(s), beneficiary, purpose and target.
- Direct value and recursive rollup.
- Underlying slices grouped by asset/account.
- Available/unfunded/negative clearing state.
- Related income/expenses/transactions.
- Historical coverage trend.
- Child portfolios.

### Actions
- Add/move coverage.
- Release coverage.
- Move a slice between portfolios without a real transfer.
- Start a real transfer if the user actually wants to change where money sits.
- Convert an underlying asset while preserving or intentionally changing portfolio purpose.

---

## SCR-200 — الأصول والحسابات / Assets & Accounts Explorer
Status: `A + P`

### Purpose
Single entry point for the physical/economic reality: “ماذا أملك، لمن، وأين يوجد؟”

### Default lens
`Owner → Asset Class → Holding / Account-Custody`

### Alternative lenses
- By Owner.
- By Asset Class.
- By Account/Custodian.
- By Location.
- By Counterparty relationship.

### Shows
- Total current value for active context.
- Each owner’s total.
- Asset class breakdown: cash/currency, metals, funds, equities, real estate, fixed-term, receivables, etc.
- Real accounts/places of custody.
- Native quantity and current valuation.
- Ownership shares where shared.
- Third-party custody badge when owner ≠ custodian.
- Valuation source/time.

### Actions
- Open `SCR-210` account.
- Open `SCR-220` holding.
- Open `SCR-230` owner.
- Open `SCR-240` counterparty relationship.
- Add existing asset/account through Quick Action.

### Critical rule
Changing lens never creates or duplicates financial records.

---

## SCR-210 — Account / Custody Detail
Status: `A / D implementation`

### Purpose
Answer “أين يوجد المال/الأصل؟ وهل النظام مطابق للواقع؟”

### Shows
- Stable account identity, type, institution/custodian, status, last4/reference.
- Calculated Holdings/value.
- Observed/reconciled balance and timestamp when available.
- Difference between calculated and observed.
- Holdings inside the account.
- Owners represented in the account.
- Related activity.

### Actions
- Rename account without changing identity/history.
- Archive/close account safely.
- Reconcile observed balance.
- Real transfer to/from another account.
- Open holdings.

---

## SCR-220 — Holding Detail
Status: `A / D detailed UX`

### Purpose
Canonical detail for one quantity-bearing economic position.

### Shows
- Asset identity/type/symbol/native unit.
- Physical/native quantity.
- Current value and valuation method/source/time.
- Ownership shares.
- Custodian/account/location.
- Cost basis by owner; cost lots if expanded.
- Unrealized P/L where cost is known.
- Portfolio slices consuming this Holding.
- Truly available quantity/value not assigned to portfolios.
- Related transactions and conversions.

### Actions
- Convert/sell/purchase related asset.
- Move real custody/account via Real Transfer/asset movement where semantics permit.
- Change valuation without cash-flow event.
- Reallocate available or selected quantity to a portfolio.
- Open owner/counterparty/account.

---

## SCR-230 — Owner Detail
Status: `A / D`

### Purpose
Answer “ما الذي يملكه هذا الشخص اقتصاديًا، بغض النظر عن من يحوزه؟”

### Shows
- Net worth attributable to owner.
- Assets by class.
- Assets in own custody vs banks/institutions vs other people.
- Liabilities attributable to owner.
- Claims due to owner.
- Portfolios owned by/for this owner.
- Realized/unrealized performance where meaningful.

### Actions
Drill into holding, account/custodian, portfolio, counterparty and related activity.

---

## SCR-240 — Counterparty Relationship
Status: `A / D`

### Purpose
Bidirectional relationship with one person/entity.

### Shows separately
1. **أصولي الموجودة لديه** — assets I own in their custody.
2. **أصوله الموجودة لدي** — their assets in my custody.
3. **لي عليه** — Claims/receivables from them.
4. **له عليّ** — liabilities/payables to them.
5. Shared/joint assets where applicable.
6. Related transactions/contracts/history.

### Critical rule
Custody must never be displayed as ownership.

---

## SCR-300 — الحركات / Activity
Status: `A + P`

### Purpose
Human-readable chronological financial history.

### Shows
- Posted transactions/events.
- Filters by owner, account, portfolio, asset, action kind, counterparty and date.
- Amount/native quantity where relevant.
- Realized P/L only on qualifying disposal/conversion events.
- Revision indicator when a logical transaction was corrected.
- Links to source/target entities.

### Mobile
Event-card feed.

### Desktop
Filterable/sortable table or timeline + detail panel.

### Actions
- Open `SCR-310` transaction detail.
- Start correction when allowed.
- Create linked refund/reversal only if a real subsequent event happened.

---

## SCR-310 — Transaction Detail
Status: `A / D`

### Shows
- Logical transaction identity/status/version.
- User-facing meaning.
- Source/target legs/entities.
- Owners/portfolios/accounts/holdings affected.
- Quantities, rates, fees, P/L.
- Linked real-world follow-up transactions.
- Revision/audit history.
- Attachments/import provenance.

### Actions
- `ACT-310` Correct input error → `SCR-320` preview.
- Open linked entities.
- Add note/attachment if non-financial metadata only.

---

## SCR-320 — Transaction Correction Preview
Status: `A domain rule / D UX`

### Purpose
Correct data entry while preserving one Logical Transaction and audit history.

### Shows before commit
- Old values vs proposed values.
- All dependent financial effects that will be recalculated.
- Accounts/holdings/portfolio slices/P&L impacted.
- Validation failures.

### Rule
A correction is **not** a fake refund/reversal. The target backend updates the logical transaction through a revision and reprojects dependent state atomically.

---

# 2. Quick Action and financial flows

## SCR-400 — Quick Action Hub
Status: `A`

### Purpose
Single entry point for creating real financial events or controlled non-cash adjustments.

### Actions exposed
- `ACT-410` Add Income.
- `ACT-420` Add Expense.
- `ACT-430` Real Transfer.
- `ACT-440` Asset Conversion.
- `ACT-450` Asset Purchase/Sale.
- `ACT-460` Portfolio Reallocation.
- `ACT-470` Reconciliation.
- Future: ownership/gift/loan/debt event, existing-asset onboarding.

Mobile: bottom sheet / full-screen action picker.
Desktop: command menu/dialog.

---

## SCR-410 — Add Income
Status: `A / D full flow`

### Shows
- Owner.
- Amount/native asset.
- Receiving account/holding.
- Income category/source.
- Date/status.
- Optional portfolio allocation after receipt.
- Link to expected income stream when matching one.

### Rule
Expected income does not increase financial reality. Only posting actual received income does.

---

## SCR-420 — Add Expense
Status: `A / D`

### Shows
- Owner economically bearing expense.
- Payment source account/card.
- Amount/native asset.
- Category/merchant/counterparty.
- Funding portfolio/purpose, which may differ from payment source.
- Clearing/funding-gap preview if portfolio coverage is insufficient.

### Credit-card rule
Card purchase creates Expense + Liability; later card payment reduces cash + liability without a second Expense.

---

## SCR-430 — Real Transfer
Status: `A / pending implementation`

### Purpose
Move real money/value location without creating income/expense/P&L.

### Shows
- Owner/share being moved.
- Source account/holding.
- Destination account/holding.
- Native quantity.
- Fees if real.
- Portfolio-purpose preservation/change choice where applicable.

### Rule
Only Real Transfer changes where value actually sits without changing asset identity.

---

## SCR-440 — Asset Conversion
Status: `A + P foundation`

### Purpose
Convert/dispose one asset into a different asset and calculate realized trading result.

### Shows
- Owner/source share.
- Source holding and source portfolio slice/unallocated quantity.
- Source quantity.
- Target asset and quantity received.
- Execution rate/value.
- Fees.
- Destination account/custodian.
- Destination portfolio; default preserve source purpose when selected.
- Cost basis.
- Realized Gain/Loss preview.

### Rule
Realized P/L is created here or in true disposal/sale, not from valuation, custody or reallocation.

---

## SCR-450 — Asset Purchase / Sale
Status: `A / D`

### Purchase
Cash/consideration leaves a real source and an asset Holding/cost lot is created or increased.

### Sale
Asset quantity/cost basis leaves and cash/consideration enters; only gain/loss component is performance, not full proceeds as income.

---

## SCR-460 — Portfolio Reallocation
Status: `A`

### Purpose
Change “what this value is for” without inventing a bank transfer.

### Shows
- Owner.
- Holding/native quantity/value available to move.
- Source portfolio or Unallocated.
- Destination portfolio or Unallocated.
- Before/after coverage preview.

### Rule
No real account balance or realized P/L changes.

---

## SCR-470 — Reconciliation
Status: `A / D`

### Purpose
Compare system-calculated financial reality with an observed real balance/quantity.

### Shows
- Calculated value/quantity.
- Observed value/quantity + observation time/source.
- Difference.
- Known explanation options.
- Unknown mismatch path.

### Rule
Unknown mismatch becomes explicit Reconciliation Adjustment; the system must not invent a merchant/category/transfer.

---

# 3. Planning, liabilities and administration

## SCR-500 — Expected Income / Income Streams
Status: `A / D`

### Shows
- Recurring/expected incomes.
- Expected amount/date/target account.
- Status: expected, received, late, missed.
- Matching posted receipt if available.

### Rule
Expectation is planning state, not account balance.

---

## SCR-600 — Liabilities & Credit
Status: `A model / D UX`

### Shows
- Credit cards, loans and other external liabilities by owner.
- Outstanding amount.
- Due dates/minimum payment where modeled.
- Purchases that created liability.
- Payments reducing liability.

### Rule
Liabilities reduce net worth but are not negative assets hidden inside Holdings.

---

## SCR-700 — Parties / People & Institutions
Status: `A model / D UX`

### Shows
People, banks, brokers, custodians and institutions referenced by ownership/custody/claims/liabilities.

### Actions
Create/edit metadata, open counterparty relationship, archive safely when unused.

---

## SCR-710 — Categories
Status: `D`

### Purpose
Manage expense/income categories separately from portfolios and asset classes.

### Rule
Category answers “what kind of transaction?”, Portfolio answers “what purpose is value reserved for?”, Asset Class answers “what is owned?”. Do not merge these concepts.

---

## SCR-720 — Accounts Management
Status: `A / D`

### Shows
Active/closed/archived accounts/custody containers.

### Actions
Create, rename, change safe metadata, reconcile, close/archive. Stable account ID and history remain intact.

---

## SCR-900 — More / Settings
Status: `D`

Potential entry points:
- Income Streams.
- Liabilities.
- Parties.
- Categories.
- Account management.
- Valuation sources/settings.
- Import/AI Intake.
- App settings/security/export.

Exact grouping is `TBD` until navigation usability is tested.

---

# 4. Detail-screen rule

Every entity detail screen should answer in this order:

1. **What is it?** identity/status.
2. **What is the current financial meaning?** quantity/value/net effect.
3. **Who owns/owes it?** owner/claim/liability semantics.
4. **Where is it?** account/custodian/location.
5. **Why is it reserved?** portfolios/slices.
6. **How was it valued/costed?** valuation/cost basis.
7. **What happened to it?** related activity.
8. **What can I safely do next?** contextual actions.

This order should guide both mobile drill-down and desktop master/detail layouts.