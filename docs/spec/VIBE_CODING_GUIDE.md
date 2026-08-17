# MyFinMan — Vibe Coding Guide

Status: **Approved process / initial version**

This file is the first document any AI coding agent must read before modifying MyFinMan.

## Mandatory reading order

1. `docs/spec/README.md`
2. `docs/spec/product/product-definition.md`
3. `docs/spec/decisions/decision-log.md`
4. `docs/spec/domain/domain-model.md`
5. `docs/domain-rules.md`
6. `docs/spec/ux/responsive-shell.md`
7. `docs/spec/ux/screen-catalog.md`
8. The exact screen/use-case/calculation/data specs referenced by the task.
9. Existing code only after the specification is understood.

## Non-negotiable rules for an AI coding session

1. **Do not infer missing financial behavior from the prototype UI.** If the spec says `TBD`, stop that behavior at a safe boundary and document the missing decision.
2. **Do not rename or redefine domain concepts casually.** Owner, Beneficiary, Portfolio, Holding, Account, Custodian, Location, Claim, Liability and Allocation/Portfolio Slice are separate concepts.
3. **Do not move financial rules into React components.** UI calls application use cases; deterministic domain rules calculate and validate.
4. **Do not make a layout-only button mutate financial state.** Every financial mutation must map to an `ACT` and `UC` contract.
5. **Do not create fake money movement** for portfolio reallocation, valuation changes, custody changes or UI regrouping.
6. **Do not create realized profit/loss** except where the approved calculation rule permits it.
7. **Do not count another owner's money** toward the user's availability or portfolio without an explicit ownership/loan/gift/debt event.
8. **Do not count an asset twice** because it appears through multiple lenses (owner, asset class, account, custodian, portfolio).
9. **Do not create separate mobile and desktop business behavior.** They are responsive presentations of the same screen/use case.
10. **Do not delete historical financial truth.** Corrections follow the approved transaction revision/audit model.

## Required task preamble for a coding agent

Before editing code, the agent should state internally or in the PR description:

- Spec IDs being implemented: `SCR / ACT / UC / ENT / RULE / CALC / DB / TEST`.
- Approved behavior being preserved.
- Any `TBD` items deliberately excluded.
- Prototype code that is being used only as scaffolding rather than architecture.

## Required implementation boundaries

Target dependency direction:

```text
Presentation
   ↓
Application / Use Cases
   ↓
Domain
   ↓
Repository Ports
   ↓
Infrastructure Adapters / Database / APIs
```

Forbidden dependencies:

- Domain importing React, browser APIs, database clients or HTTP.
- UI directly writing financial persistence records.
- Infrastructure deciding financial semantics.
- AI/LLM output bypassing deterministic validation.

## Button/action implementation rule

A user-visible financial action must trace like this:

```text
Button / gesture
  → ACT-xxx
  → UC-xxx
  → validation + preview
  → RULE/CALC execution
  → repository transaction
  → audit/revision record
  → result DTO
  → responsive UI update
  → TEST-xxx
```

If this chain cannot be identified, the action is not ready to implement.

## Responsive implementation rule

Use one semantic screen and one business state. At breakpoints, only presentation changes:

- mobile: single column, bottom navigation, sheets/full-screen flows;
- tablet: navigation rail and one/two-column layouts;
- desktop: professional workspace with sidebar, split panels, tables where useful, persistent context.

Never render a fixed-size fake phone frame on a large browser as the final product. The current prototype may do that temporarily; the target product must use the full viewport appropriately.

## Data-change safety

For every mutating use case:

- validate ownership and quantity;
- validate account/holding/portfolio status;
- validate native asset compatibility where required;
- calculate preview before commit when the action can move value or change P/L;
- commit all dependent writes atomically in the target backend;
- make the operation idempotent where external retries are possible;
- retain audit metadata;
- recalculate derived values from source records rather than persisting contradictory totals.

## PR completion checklist

A feature PR is not complete unless:

- relevant specs were updated;
- implementation matches the approved statuses;
- tests cover the financial invariants;
- mobile and desktop behavior were checked;
- no `TBD` was silently resolved by code;
- CI passes;
- `docs/spec/quality/traceability-and-acceptance.md` is updated when new IDs are introduced.

## Prompt footer recommended for future coding sessions

Use this at the end of implementation prompts:

> Treat `docs/spec/` as the source of truth and the current application as a disposable prototype. Do not invent missing behavior. Quote the IDs you are implementing, preserve domain invariants, update documentation and tests in the same PR, and keep presentation independent from domain/application/infrastructure.