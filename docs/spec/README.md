# MyFinMan Living Specification

> **Purpose:** this directory is the long-lived source of truth for the future MyFinMan product. The current React/Vite website is a prototype used to prove concepts and domain rules; it is **not** the final implementation blueprint by itself.

## 1. Why this exists

MyFinMan will be built iteratively with AI-assisted / Vibe Coding. The main risk is not code generation; it is **semantic drift**: one session interprets a portfolio differently, another changes ownership semantics, a third invents a button behavior from the current prototype.

This specification prevents that by giving every important concept a stable ID, explicit status, relationships, calculations, UI behavior, persistence effects, and acceptance tests.

## 2. Authority order

When two sources conflict, use this order:

1. Latest explicit user decision recorded as `Approved` in this specification.
2. `docs/spec/decisions/decision-log.md` and approved ADRs.
3. `docs/spec/domain/domain-model.md` and `docs/domain-rules.md`.
4. Approved screen/use-case specifications in this directory.
5. Existing implementation and prototype behavior.
6. AI inference.

**The existing UI must never override an approved specification.**

## 3. Specification statuses

Every substantial spec must declare one of:

- `Draft` — proposed, may change; Vibe Coding must not silently treat it as final.
- `Approved` — product/domain decision accepted; implementation must follow it.
- `Implemented` — represented in the current prototype or product code.
- `Verified` — implementation has automated/manual acceptance evidence.
- `Deprecated` — retained for history; must not be used for new work.
- `TBD` — intentionally unresolved. Do not guess.

A feature can have different statuses at different layers. Example: the domain rule may be `Approved`, the target database design `Draft`, and the prototype implementation `Implemented`.

## 4. Stable ID conventions

Use stable IDs in docs, code comments, tests and PR descriptions:

- `SCR-xxx` — screen/view.
- `CMP-xxx` — reusable UI component.
- `ACT-xxx` — user-visible action/button.
- `UC-xxx` — application use case / command.
- `ENT-xxx` — domain entity.
- `RULE-xxx` — invariant/business rule.
- `CALC-xxx` — financial calculation.
- `DB-xxx` — target database table or persistence concept.
- `TEST-xxx` — acceptance scenario/test.
- `SCN-xxx` — exploratory real-world scenario used to discover/refine rules.
- `BMK-xxx` — benchmark ambition or target capability used to judge product maturity.
- `ADR-xxx` — architecture/product decision record.

IDs are never recycled after publication.

## 5. Documentation map

### Product and scope
- `product/product-definition.md` — what MyFinMan is and is not.
- `prototype/prototype-vs-target.md` — what the current proof-of-concept means for the future rewrite.

### Benchmark ambitions
- `benchmark/benchmark-ambition.md` — target financial-management capabilities beyond expense tracking; currently Draft and expanded through benchmark research plus user scenarios.

### UX / Screens
- `ux/responsive-shell.md` — one responsive product for mobile, tablet and desktop.
- `ux/screen-catalog.md` — complete screen inventory and responsibilities.
- `ux/screens/_TEMPLATE.md` — template for detailed per-screen specs.

### Domain / Data
- `domain/domain-model.md` — entities, relationships and invariants independent of UI/storage.
- `domain/income-producing-assets-draft.md` — Draft extension for EconomicActivity/Venture, account-specific Portfolio funding reservations and income-producing Asset semantics discovered in SCN-002.
- `domain/portfolio-and-settlement-taxonomy-draft.md` — Draft decomposition of Free Liquidity, Portfolio behavior profiles, physical payment source, economic bearer and inter-owner settlement/reimbursement.
- `domain/settlement-mandate-and-encumbrance-draft.md` — Draft model for entrusted value that may be transformed across Assets/Accounts before delivery, with explicit cost/gain attribution and obligation-backed encumbrance.
- `domain/acquisition-chain-and-cost-flow-draft.md` — Draft model for propagating all-in economic acquisition cost through intermediate Asset conversions into a final Asset without losing cost basis or double-counting friction.
- `domain/valuation-and-performance-policy-draft.md` — Draft position-scoped policy separating Cost Basis, current valuation and performance-recognition behavior for transactional cash, bridge assets and investment/store-of-value positions.
- `data/database-model.md` — target relational model; not the current LocalStorage shape.
- `calculations/calculation-rules.md` — core formulas and financial semantics.
- `calculations/income-producing-asset-performance.md` — Draft formulas for Portfolio liquidity/capital/value and operating/capital performance of income-producing Assets.

### Behavior
- `use-cases/action-contracts.md` — what every important button/action does in the application/domain/data layers.
- `use-cases/_TEMPLATE.md` — template for new use cases.

### Scenario laboratory
- `scenarios/SCN-001-precious-metals-distributed-custody.md` — Gold/Silver split across Home, Al Rajhi and brother custody; tests Asset vs Holding vs Custody vs Portfolio and identifies a possible custody-independent Portfolio allocation refinement.
- `scenarios/SCN-002-income-producing-assets-and-investment-portfolio.md` — five-bank cash Portfolio, existing/new vehicles, vehicle rental, apartment rental and agricultural land; tests capital acquisition, Portfolio funding rebalance, cost vs market value and asset/activity profitability.
- `scenarios/SCN-003-child-cash-custody-and-ownership-substitution.md` — Eid cash owned by children but held by Father; tests owner-vs-custody, owner-scoped Free Liquidity, internal Claim/Liability when another owner's cash is consumed, and a Draft same-asset ownership-substitution operation that replaces old fake bank transfers.
- `scenarios/SCN-004-portfolio-archetypes-and-interowner-settlement.md` — child cash plus Gold purchase paid from Father's bank; separates physical payer, economic owner, Portfolio funding and reimbursement, and explores Spending/Commitment/Savings/Investment Portfolio behavior profiles.
- `scenarios/SCN-005-savings-backing-and-maturity-ladder.md` — savings intentionally segregated in Alinma, recurring monthly contributions, Namaa maturity/reinvestment and optional Portfolio backing policies.
- `scenarios/SCN-006-entrusted-crypto-to-cash-settlement-cycle.md` — 1,000 USDT entrusted for delivery as USD cash; tests conversion mandate vs pure custody, sender-borne losses, operator execution spread, obligation-backed liquidity restriction and multi-step settlement across USDT/TRY/USD.
- `scenarios/SCN-007-cost-flow-acquisition-chain.md` — SAR→USD→Land and payment→USDT→XRP examples; tests all-in effective acquisition cost, basis propagation, independent valuation, step-level versus end-to-end reporting and no-double-counting of conversion friction.
- `scenarios/SCN-008-valuation-role-and-performance-recognition.md` — separates always-on cost tracking from position-specific valuation/performance recognition; covers transactional USD, bridge USD to Land, Gold/XRP investments and volatile-currency investment with explicit FX quote direction.

Scenarios are not merely examples. They are used to pressure-test the model. Each scenario should separate:
- facts/requirements explicitly accepted by the user;
- rules already Approved;
- newly discovered challenges;
- Draft proposals that must not be implemented until approved;
- acceptance tests derived from the scenario.

### Quality and decisions
- `quality/traceability-and-acceptance.md` — requirement → screen → action → entity → test traceability.
- `decisions/decision-log.md` — accepted product/architecture decisions.
- `decisions/ADR-TEMPLATE.md` — decision-record template.
- `VIBE_CODING_GUIDE.md` — mandatory instructions for AI coding sessions.

## 6. Change protocol — documentation first

For any meaningful feature or behavior change:

1. Identify the affected `SCR/ACT/UC/ENT/RULE/CALC/DB/TEST/SCN/BMK` IDs.
2. Update or create the specification **before or in the same PR as code**.
3. If the behavior is unresolved, mark it `TBD`; do not code a guessed behavior.
4. Record architectural/product decisions in the decision log or an ADR.
5. Implement the smallest code change that satisfies the approved spec.
6. Add/update automated domain tests and UI acceptance tests.
7. Update implementation status from `Draft/Approved` to `Implemented/Verified` only with evidence.

A PR that changes user-visible financial behavior without updating the relevant spec is incomplete.

## 7. Prototype versus target

The repository currently contains a working prototype. It is useful for:

- proving the financial model;
- testing interactions and language;
- discovering missing use cases;
- validating calculations and invariants;
- iterating on responsive UX.

It must **not** lock the future implementation into its current React state shape, LocalStorage repository, routes, CSS, file structure or simplified transaction model. The target product will be rebuilt when the specification and architecture mature.

## 8. Definition of “ready for Vibe Coding”

A feature is ready to hand to a coding model only when the spec answers:

- What screen/entry point exposes it?
- What does the user see before and after?
- What exact action triggers it?
- What validations run?
- What use case executes?
- What domain entities and invariants are affected?
- What records are created/updated?
- What financial calculations run?
- What is explicitly **not** changed?
- What audit/history is retained?
- What happens on failure?
- How is it rendered on mobile and desktop?
- Which acceptance tests prove it?

If any answer is missing, it should be marked `TBD` rather than inferred.