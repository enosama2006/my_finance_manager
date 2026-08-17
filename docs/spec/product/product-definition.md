# MyFinMan — Product Definition

Status: **Approved direction / evolving scope**

## Product statement

MyFinMan is a personal and family financial operating system that answers, without double counting or accounting jargon overload:

- What do I own?
- Who owns each part of the family wealth?
- Where is the value physically or institutionally held?
- What is it reserved for?
- What is truly available?
- What do other people hold for me, and what do I hold for them?
- What do others owe me, and what do I owe them?
- What moved in reality versus what merely changed purpose, custody, valuation or classification?
- When I convert/sell one asset into another, what was my cost basis and realized gain/loss?
- What is expected to happen financially, and what has actually posted?

## Core mental model

**One financial reality, multiple independent maps.**

The same economic position can be viewed by:

1. Owner — whose wealth is it?
2. Beneficiary — who benefits from the purpose?
3. Portfolio — why is it reserved?
4. Asset/Holding — what is owned and in what native quantity?
5. Account/Custodian — where/how is it held?
6. Location — where is it physically/geographically?
7. Counterparty — which person/entity is related to it?
8. Claim/Liability — what is owed rather than physically held?
9. Cost Basis — what did the owner economically pay?
10. Current Valuation — what is it worth now under a known method/source/time?

These are lenses over one reality, not separate copies of money.

## Product design principles

### Financial clarity before accounting vocabulary
The product may use rigorous accounting/domain logic internally, but the user experience should speak in understandable financial language: “لدي”، “لدى غيري”، “مخصص”، “متاح”، “ربح محقق”، “التزام”، “دين لي/علي”.

### Deterministic financial core
Financial validity and calculations are deterministic. AI can extract, classify, suggest and explain, but cannot bypass rules or post unverified financial truth.

### Progressive disclosure
The user starts with totals and simple actions, then drills into owner → asset → account/custody → lots/history only when needed.

### Responsive, not duplicated
There is one product and one information architecture. Mobile, tablet and desktop render the same semantic screens with different composition.

### Auditability without UI clutter
Every real financial mutation can be traced and corrected appropriately, while normal users see a clean activity history rather than raw accounting journals.

## Current prototype purpose

The current React/Vite application is **Proof of Concept / Architecture Discovery**, not the final product implementation.

It exists to:

- validate the domain model with realistic examples;
- discover contradictions early;
- test responsive interaction patterns;
- prove owner/custody/portfolio separation;
- prove asset conversion and cost-basis semantics;
- create executable domain tests;
- learn what the final application must support.

It is disposable when the specification is mature enough for a clean implementation.

## What the prototype must not decide by accident

The current prototype does not automatically define the final:

- database engine;
- physical schema;
- API framework;
- authentication model;
- hosting model;
- React routing/file organization;
- state management library;
- CSS/design system;
- offline/sync strategy;
- transaction storage shape;
- AI provider/model;
- deployment topology.

Those must be decided explicitly through specs/ADRs.

## Target product layers

The future rebuild should preserve conceptual separation:

```text
Responsive Presentation Clients
(Web first; mobile/native clients possible later)
              ↓
Application Use Cases / API Contracts
              ↓
Deterministic Domain Model
              ↓
Repository Ports
              ↓
Database + external integrations + AI adapters
```

The goal is that a future native mobile client can call the same application/domain capabilities without reimplementing financial rules.

## Scope groups

### Foundation
Owners/parties, accounts/custody, holdings/assets, portfolios, portfolio slices, quantities, cost basis, valuation, transactions, liabilities, claims, expected income and audit/revision semantics.

### Core financial operations
Income, expense, real transfer, asset purchase, asset sale/conversion, portfolio reallocation, ownership/debt events, credit-card liability flow, reconciliation and settlement/clearing.

### Intelligence layer
Document/message intake, classification, account/merchant matching, duplicate detection, suggestions, explanations, anomaly detection and forecasting — always behind deterministic validation and user approval where financial truth would change.

### Future analytical layer
Performance by owner/portfolio/asset, realized/unrealized P&L, cash-flow forecasting, savings goals, liquidity, exposure, recurring commitments, scenario planning and long-term wealth history.

## Explicit non-goals of the current prototype

- Production security or compliance certification.
- Bank-grade integration completeness.
- Final database migration strategy.
- Final visual identity/design system.
- Full bookkeeping product.
- Tax accounting policy beyond explicitly approved cost-basis calculations.
- Replacing the future clean rebuild with incremental patching forever.

## Maturity strategy

1. **Discover** — discuss scenarios and contradictions.
2. **Decide** — record decisions and invariants.
3. **Specify** — screens, actions, calculations and data contracts.
4. **Prototype** — prove the idea quickly.
5. **Verify** — automated tests and scenario walkthroughs.
6. **Stabilize architecture** — resolve TBDs and ADRs.
7. **Rebuild cleanly** — implement the mature target architecture from the specification.
8. **Migrate/validate** — only then decide how prototype/sample data informs the production system.