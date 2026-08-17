# ADR-002 — Portfolio Allocation Is Economic by Default; Free Liquidity Is Derived

Status: **Approved**

## Context

The user clarified why he originally wanted to assign Portfolio money to specific bank balances.

The intent was not to make the Portfolio dependent on a particular bank. The intent was behavioral and financial control:

> If total cash across all banks is SAR 1,000,000, but SAR 950,000 has been reserved for investment, children, rent and other purposes, the application should make it obvious that only SAR 50,000 remains freely spendable even though the physical bank balances still total SAR 1,000,000.

The physical bank account answers **where cash sits**. The Portfolio answers **why part of the owner's cash is reserved**.

Requiring every ordinary Portfolio allocation to identify a specific bank creates unnecessary coupling between purpose and custody. It also forces artificial rebalancing when the user pays from a different bank even though the economic purpose did not change.

## Decision

### 1. Ordinary Portfolio allocation is custody/account independent

By default, a Portfolio allocation is made against the owner's economic position in an Asset, conceptually:

```text
Owner + Asset + Portfolio + Quantity
```

Example:

```text
Owner = User
Asset = SAR Cash
Total owned SAR across all accounts = 1,000,000

Portfolio allocations:
- Investment = 500,000 SAR
- Children = 300,000 SAR
- Housing/Rent = 100,000 SAR
- Other reserved purposes = 50,000 SAR

Free / unallocated SAR cash = 50,000 SAR
```

The system does **not** need to say that Investment's 500,000 is physically 100,000 from each bank unless the user explicitly asks for that precision.

### 2. Bank accounts remain physical truth

Example:

```text
Al Rajhi = 200,000 SAR
Alinma = 200,000 SAR
Bank AlJazira = 200,000 SAR
SNB = 200,000 SAR
Riyad Bank = 200,000 SAR
```

These balances answer where the money exists.

They do not determine by themselves which Portfolio the money serves.

### 3. Free Liquidity is derived across accounts

For a selected Owner and liquid Asset such as SAR Cash:

```text
Free Cash Quantity
= Total Owner Cash Quantity across eligible Accounts
- Total active Portfolio allocations of that Cash Asset
```

Therefore the user can see:

```text
Total cash:          1,000,000 SAR
Reserved/allocated:   950,000 SAR
Free liquidity:        50,000 SAR
```

The key behavioral meaning is:

> The user should treat SAR 50,000 as the amount available for unrestricted personal spending, not SAR 1,000,000.

### 4. A physical payment can come from any eligible account

If the user makes an unrestricted SAR 20,000 payment from Al Rajhi:

```text
Al Rajhi physical cash decreases by 20,000
Free SAR liquidity decreases from 50,000 to 30,000
```

No Portfolio changes unless the transaction is explicitly attributed to a Portfolio.

If instead the payment is for the Investment Portfolio, the payment consumes Investment Portfolio cash allocation, regardless of which eligible SAR account physically paid it.

### 5. Buying an Asset from a Portfolio transforms Portfolio composition

Example:

```text
Investment Portfolio SAR allocation = 500,000
Vehicle purchased = 150,000 SAR
Payment account = Al Rajhi
```

After posting:

```text
Physical reality:
Al Rajhi cash -150,000

Portfolio reality:
Investment SAR Cash allocation -150,000
Investment Vehicle allocation + acquired Vehicle
```

The remaining Investment cash allocation is 350,000 SAR, while the Portfolio still contains the acquired Vehicle. No fake transfer from another bank is required.

### 6. Optional physical reservation remains supported as a separate layer

There are valid cases where a user wants exact backing, for example:

> "This 100,000 SAR in Alinma specifically must remain for the children's Portfolio."

or:

> "This exact 100g Gold bar at Al Rajhi is for my children."

That is not ordinary Portfolio allocation. It is an optional **Physical/Funding Reservation** that may point to a specific Account, Holding or PhysicalItem.

It is an additional constraint, not the default Portfolio model.

## Consequences

- `Portfolio` remains the **why** dimension.
- `Account/Custody` remains the **where** dimension.
- Ordinary purpose allocation does not require arbitrary bank splitting.
- Free spendable liquidity can be shown clearly across all accounts.
- Spending can be blocked/warned against based on free liquidity even when physical account balances are large.
- Paying from a different bank does not require a fake transfer or purpose rebalance.
- Exact bank/holding backing is available only when the user explicitly wants hard reservation.

## Architectural refinement

The target model should move ordinary allocation semantics from mandatory `PortfolioSlice -> Holding` toward an economic allocation at `Owner + Asset` level, while retaining optional physical reservation as a separate entity/constraint.

Conceptually:

```text
OwnerAssetPosition
  derived from Holdings across Accounts
        |
        +--> PortfolioAllocation (ordinary purpose)
        |
        +--> Free Quantity (derived)

Optional:
PortfolioAllocation
        |
        +--> Physical/Funding Reservation
               -> Account / Holding / PhysicalItem
```

## UI implications

The application should distinguish at least:

```text
Total Cash
Reserved Cash
Free Liquidity
```

and optionally show:

```text
Physical accounts
- Al Rajhi
- Alinma
- Bank AlJazira
- SNB
- Riyad Bank
```

without implying that Portfolio purpose must follow those account boundaries.

The Home/Dashboard should prioritize **Free Liquidity / السيولة الحرة** as a decision number for unrestricted spending.

## Safety rule

A transaction that would push Free Liquidity below zero must not be silently treated as ordinary unrestricted spending.

The product should require an explicit decision such as:
- consume a named Portfolio allocation;
- release/reallocate reserved money;
- allow a temporary negative funding gap under the approved Clearing model;
- cancel/change the transaction.

Exact UX is still TBD, but silent overspending of reserved money is not allowed.

## Supersedes / refines

This ADR approves the direction previously recorded as `DEC-019` Draft and refines the old mandatory `PortfolioSlice -> Holding` assumption for the future clean rebuild.

Current prototype structures may remain temporarily until intentionally migrated; the approved target semantic is defined here.