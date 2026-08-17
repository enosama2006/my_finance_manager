# SCR-XXX — Screen Name

Status: `Draft | Approved | Implemented | Verified`
Owner: `TBD`
Last reviewed: `YYYY-MM-DD`
Related decisions: `DEC/ADR-...`
Related use cases: `UC-...`

## 1. Purpose

One sentence answering the user's question this screen exists to solve.

## 2. Entry points

- navigation destination;
- parent screen;
- contextual deep-link;
- quick action;
- notification/alert.

## 3. Route / state

Target route shape or routable state. Do not create separate mobile/desktop routes.

## 4. User context

- selected owner;
- selected portfolio;
- reporting currency;
- date range;
- permissions/role if relevant.

Specify which context persists when navigating away/back.

## 5. Data shown

For every section/card/list/table, state:

| Section ID | What user sees | Source entities/query | Calculation IDs | Empty state |
|---|---|---|---|---|
| SEC-XXX | | | | |

Do not show a financial total without a calculation/query definition.

## 6. Hierarchy and drill-down

Document parent → child information structure and what clicking each entity opens.

## 7. Actions/buttons

| Action ID | Label | Visible when | Opens/calls | Financial mutation? | Confirmation/preview |
|---|---|---|---|---|---|
| ACT-XXX | | | UC/SCR | yes/no | |

Every mutating button must have an Action/Use-Case contract.

## 8. Mobile behavior `<768px`

- layout order;
- sticky areas;
- bottom sheets/full-screen flows;
- list/detail navigation;
- filters;
- action placement;
- touch/overflow behavior.

## 9. Tablet behavior `768–1199px`

Document rail/panel/two-column behavior.

## 10. Desktop behavior `>=1200px`

Document sidebar, grid, master/detail, table/panel behavior and max-width policy.

## 11. Loading / empty / error states

### Loading

### Empty

### Validation error

### Repository/API error

### Stale/unknown valuation

### Permission/restricted action

## 12. Financial rules that must remain true

List `RULE-xxx` IDs and explain any screen-specific constraints.

## 13. Accessibility

- keyboard behavior;
- focus order;
- screen-reader labels;
- non-color status cues;
- numeric readability.

## 14. Analytics/telemetry

Only product telemetry, never expose sensitive financial payloads unnecessarily. Exact analytics policy may be `TBD`.

## 15. Acceptance tests

List `TEST-xxx` IDs with viewport variants.

## 16. Open questions / TBD

Explicitly list unresolved decisions. Coding agents must not infer answers.

## 17. Prototype mapping

Optional: identify current prototype component/page used as evidence. Clearly state any behavior that should **not** be copied into the target product.