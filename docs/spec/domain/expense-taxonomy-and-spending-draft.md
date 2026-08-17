# Expense Taxonomy and Spending Model

Status: **Draft domain semantics / Implemented Prototype**

## Purpose

MyFinMan must not collapse expense classification, portfolio purpose, and payment source into one dimension.

A posted expense can answer three independent questions:

1. **WHAT was the money spent on?** → ExpenseCategory.
2. **WHERE did the money physically leave from?** → Account/Holding source.
3. **WHY / from which reserved purpose was it funded?** → optional Portfolio.

Example:

```text
Expense: August electricity bill
WHAT  = Housing ← Utilities ← Electricity
WHERE = Al Rajhi SAR Holding
WHY   = Monthly Expenses Portfolio
```

The same Electricity category can later be paid from another bank, and the same Portfolio can fund many different expense categories.

## ExpenseCategory

ExpenseCategory is a user-managed hierarchical taxonomy.

Candidate fields:

- stable id
- name
- optional parentId
- active/archived status
- optional description
- createdAt

Rules:

- arbitrary tree depth is allowed;
- a category cannot be its own parent;
- a category cannot be moved under one of its descendants;
- sibling names should be unique within the same parent;
- historical transactions keep their category id after rename;
- used categories are archived rather than destructively deleted;
- parent reporting rolls up spending from all descendants.

## Expense posting

A simple cash expense contains at least:

- Owner
- source Cash Holding
- source quantity
- reporting-currency amount derived at execution
- ExpenseCategory
- optional Portfolio
- timestamp
- optional title/note

### Without Portfolio

The expense is funded from Free Liquidity.

The selected source Holding must contain sufficient free quantity after protected Portfolio allocations are excluded.

Effects:

- source Holding decreases physically;
- Net Worth decreases by the expense value;
- ExpenseCategory history increases;
- no Portfolio allocation is consumed.

### With Portfolio

The expense consumes the selected Portfolio's economic allocation while the physical payment source remains independent.

Effects:

- selected source Holding decreases physically;
- selected Portfolio's allocated economic value decreases by the expense value;
- ExpenseCategory history increases;
- allocations belonging to other Portfolios cannot be silently invaded.

This follows ADR-002's principle that Portfolio answers WHY and Account/Holding answers WHERE.

The current prototype implements this against legacy PortfolioSlice. The target remains custody-independent PortfolioAllocation.

## Cross-asset backing

A Portfolio may be economically backed by a different Asset than the physical source used for payment.

Example:

- Rent Portfolio is partly backed by Gold.
- User pays rent from free SAR in Alinma.
- The SAR Holding decreases because it actually paid.
- Equivalent Rent Portfolio allocation is consumed/released, even if part of that allocation was represented by Gold.
- The Gold Holding itself does not disappear; only the Portfolio purpose attached to the consumed amount changes.

This is an economic-purpose change, not a fake asset sale.

## Current prototype boundary

Implemented now:

- category tree CRUD: create, rename/reparent, archive;
- parent/descendant spending rollup;
- simple cash expense;
- optional Portfolio linkage;
- Free Liquidity guard when no Portfolio is selected;
- other-Portfolio protection on physical source;
- linked Portfolio allocation consumption;
- Ledger persistence of `expenseCategoryId` and optional `portfolioId`.

Not yet final/implemented:

- split one expense across multiple categories;
- split one expense across multiple Portfolios;
- credit-card purchase and later settlement integration;
- refunds tied back to original expense/category;
- recurring expense templates;
- category budgets independent of Portfolio;
- AI/OCR category proposals;
- tax/business deductibility dimensions;
- final ADR-002 PortfolioAllocation persistence replacing PortfolioSlice.

## Invariant

**ExpenseCategory never answers where money is held or why it was reserved. Portfolio never answers what was purchased/consumed. Account never answers the business classification of the expense.**
