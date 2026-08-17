# MyFinMan — Prototype vs Target Product

Status: **Approved**

## Why the prototype exists

The current website is an executable notebook for the product idea. It is intentionally allowed to be simpler than the final system so we can test domain assumptions quickly.

It proves or explores:
- owner/custody separation;
- third-party-held assets;
- unified Portfolio direction;
- responsive UI ideas;
- cost basis and conversion P/L;
- activity history concepts;
- deterministic domain tests.

## What should survive into the clean rebuild

Survive as **concepts/specifications**, not necessarily code:
- approved domain vocabulary and invariants;
- validated user workflows;
- responsive information architecture;
- acceptance scenarios;
- calculation rules;
- examples/seed scenarios that expose edge cases;
- decisions and rejected alternatives.

## What is explicitly disposable

- current React component hierarchy;
- current LocalStorage persistence shape;
- current CSS files and fixed phone-like desktop shell;
- current simplified transaction source/target structure;
- current page filenames/routes;
- prototype seed IDs;
- any workaround added only to make the prototype demonstrable.

## Rule for prototype changes

A prototype change is valuable only if it does at least one of:
1. proves or falsifies a domain rule;
2. discovers a missing scenario;
3. improves the specification;
4. validates a screen interaction;
5. adds a reusable acceptance test.

Avoid spending large effort polishing prototype internals that are already expected to be rewritten.

## Before clean rebuild begins

The following should be sufficiently mature:
- screen catalog and responsive behavior;
- per-screen specifications for core flows;
- domain entities/invariants;
- transaction semantics;
- settlement/clearing model;
- DB logical model;
- API/use-case contracts;
- calculation policy and precision;
- auth/security/privacy ADRs;
- import/AI boundaries;
- acceptance suite;
- migration/import policy.

## Rebuild strategy

Recommended future sequence:

1. Freeze an approved specification version/tag.
2. Create clean application repository/module structure.
3. Implement Domain + tests first.
4. Implement repository/database with integration tests.
5. Implement application/API use cases.
6. Build responsive web presentation against those contracts.
7. Import only deliberate sample/reference data from prototype.
8. Run acceptance matrix against new implementation.
9. Keep prototype archived as historical proof, not production dependency.

## Important warning to coding agents

Do not answer “the current code does X, therefore the product should do X.”

The correct reasoning direction is:

```text
Approved Specification
        ↓
Target implementation

Prototype = evidence / experiment only
```
