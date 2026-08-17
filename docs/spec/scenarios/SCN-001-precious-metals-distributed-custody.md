# SCN-001 — Precious Metals Distributed Across Custody and Portfolios

Status: **Approved scenario facts / Draft architectural refinement**

## Purpose

Use a concrete gold/silver scenario to test whether the domain cleanly separates:

- what the asset is;
- how much exists;
- who owns it;
- who holds it;
- where it is physically located;
- what account/container or custody arrangement contains it;
- what it cost;
- what purpose/Portfolio it serves.

This scenario is intentionally used to discover architectural weaknesses before the clean rebuild.

---

# 1. Scenario

The user owns physical precious metals purchased for himself.

## Gold

Gold is one economic asset in the user's asset tree.

Example total owned quantity:

- 200 g Gold total.
- 60 g stored at home in the user's safe.
- 140 g held in custody at Al Rajhi.

## Silver

Silver is a separate economic asset.

Example total owned quantity:

- 5,000 g Silver total.
- 1,000 g stored at home.
- 1,500 g held at Al Rajhi.
- 2,500 g held by the user's brother in Turkey after the brother buys the silver on the user's behalf.

The exact numbers are illustrative. The architectural rules must work for any quantities.

---

# 2. Asset tree versus custody tree

The **Asset tree** must not create a different Asset merely because the same metal exists in another place.

```text
Assets
└─ Investments
   └─ Metals
      ├─ Gold
      │  └─ Total owned: 200 g
      └─ Silver
         └─ Total owned: 5,000 g
```

Gold is Gold. Silver is Silver.

The physical/custody distribution is a different lens:

```text
Gold — 200 g
├─ Home safe — 60 g
└─ Al Rajhi custody — 140 g

Silver — 5,000 g
├─ Home safe — 1,000 g
├─ Al Rajhi custody — 1,500 g
└─ Brother / Turkey custody — 2,500 g
```

Therefore:

- Asset answers: **what is it?**
- Holding answers: **how much of that Asset exists in this custody/location context?**
- Owner answers: **whose wealth is it?**
- Custodian answers: **who currently holds or controls the physical item?**
- Location answers: **where is it physically?**
- Account/Container answers: **through what real-world storage/account/custody arrangement is it held?**
- Portfolio answers: **why is some of the owner's economic quantity reserved?**

No one of these dimensions may replace another.

---

# 3. Recommended representation of the physical reality

## Asset master

Conceptually:

```text
Asset: GOLD
native unit: gram
asset class: metal

Asset: SILVER
native unit: gram
asset class: metal
```

At the high-level UI, Gold and Silver remain one asset each.

Purity, bar/coin form, serial number, manufacturer and fine-metal normalization are a separate future refinement; see Challenges below. They must not force the high-level user tree to duplicate Gold unnecessarily.

## Holdings

A new Holding boundary is created when the same Asset quantity is meaningfully separated by custody/storage context.

Example:

```text
H-GOLD-HOME
Asset = Gold
Quantity = 60 g
Owner = User
Custodian = User
Location = Home
Container = Home Safe

H-GOLD-RAJHI
Asset = Gold
Quantity = 140 g
Owner = User
Custodian = Al Rajhi
Location = Al Rajhi custody location
Container = Al Rajhi metal custody arrangement

H-SILVER-HOME
Asset = Silver
Quantity = 1,000 g
Owner = User
Custodian = User
Location = Home
Container = Home Safe

H-SILVER-RAJHI
Asset = Silver
Quantity = 1,500 g
Owner = User
Custodian = Al Rajhi
Location = Al Rajhi custody location
Container = Al Rajhi metal custody arrangement

H-SILVER-BROTHER
Asset = Silver
Quantity = 2,500 g
Owner = User
Custodian = Brother
Location = Turkey
Container = External family custody arrangement
```

The user's total Gold quantity is the sum of the user's Gold ownership across Gold Holdings.
The user's total Silver quantity is the corresponding sum across Silver Holdings.

There is no additional Gold or Silver record representing the total that is counted as a second asset. The total is a derived aggregation.

---

# 4. Ownership versus custody — brother in Turkey

The brother buying/storing silver exposes an important semantic boundary.

## Case A — specific silver has been purchased for the user and ownership/title belongs to the user

Then:

```text
Asset = Silver
Holding = Silver held by Brother
Owner = User
Custodian = Brother
Location = Turkey
```

It remains part of the user's assets and net worth.
The brother does not become the economic owner merely because he physically stores it.

## Case B — brother may use the silver/cash and only owes an equivalent quantity/value later

Then it is **not** the same thing as user-owned physical Silver in custody.

Model a Claim/Receivable, for example:

```text
Creditor = User
Debtor = Brother
Claim denomination = 2,500 g Silver equivalent
```

Do not simultaneously count both:

- 2,500 g physical Silver Holding owned by User; and
- a 2,500 g Silver Claim against Brother

for the same economic right.

## Case C — money has been sent to Brother, but purchase has not yet occurred

Do not create Silver merely because the user intends to buy it.
The system needs to represent the actual legal/economic state: depending on the real arrangement this may be cash still owned by the user in external custody, a receivable/claim against Brother, or another pending settlement state. Exact onboarding UX is TBD.

---

# 5. Physical movement does not change the Asset

Suppose Brother ships 500 g of the user's Silver from Turkey to the user's home.

Before:

```text
Silver / Brother Turkey = 2,500 g
Silver / Home = 1,000 g
```

After:

```text
Silver / Brother Turkey = 2,000 g
Silver / Home = 1,500 g
```

User total remains:

```text
5,000 g Silver
```

This is a custody/location transfer of the **same Asset**, not:

- income;
- expense;
- sale;
- asset conversion;
- realized gain/loss.

The acquisition cost/history of the moved quantity must follow the quantity; movement must not reset cost basis.

Similarly, moving 20 g Gold from Home Safe to Al Rajhi changes Holdings/custody distribution while total Gold ownership remains unchanged.

---

# 6. Cost basis is acquisition history, not storage identity

The user may have acquired 200 g Gold in multiple purchases at different prices.

Example:

```text
Lot A: 50 g @ 500 SAR/g
Lot B: 100 g @ 530 SAR/g
Lot C: 50 g @ 560 SAR/g
```

Those acquisition facts must not be destroyed because some grams later move between Home and Al Rajhi.

The current approved product-performance method remains weighted average per Owner, but target data must preserve enough acquisition history to support audit and future policy changes.

Architectural consequence:

- CostBasisLot is economic acquisition history.
- Holding is current custody/location position.
- A custody transfer may re-associate/split cost-basis quantity across source/target Holdings, but must not create a new purchase price or realized P/L.

---

# 7. Portfolios are purpose, not physical storage

Example Portfolios:

```text
Long-Term Investment
Emergency Reserve
Children
Future Property
```

The same Gold/Silver economic position may serve several Portfolios.

Example economic allocation:

```text
Gold owned = 200 g
├─ Long-Term Investment = 120 g
├─ Emergency Reserve = 30 g
└─ Unallocated / Available = 50 g

Silver owned = 5,000 g
├─ Long-Term Investment = 3,000 g
├─ Children = 1,000 g
├─ Emergency Reserve = 500 g
└─ Unallocated / Available = 500 g
```

This allocation answers **why** the metal is reserved. It does not inherently answer **where** those exact grams are stored.

---

# 8. Architectural challenge discovered: PortfolioSlice → Holding may over-couple purpose to custody

The currently approved Foundation model defines PortfolioSlice as a quantity from one Owner's share of one Holding.

That works, but this scenario exposes a weakness.

Suppose:

```text
Gold Long-Term Portfolio = 120 g
```

and the Gold is physically:

```text
Home = 60 g
Al Rajhi = 140 g
```

If PortfolioSlices must always point to Holdings, we must arbitrarily decide something like:

```text
Long-Term Investment
├─ 40 g from Home Holding
└─ 80 g from Al Rajhi Holding
```

Now move 20 g physically from Home to Al Rajhi.
Nothing about the user's investment purpose changed, but the PortfolioSlices may need to be rewritten merely because custody changed.

This couples two dimensions that were supposed to be independent:

- purpose; and
- custody/location.

That is a real architectural smell discovered by this scenario.

---

# 9. Draft refinement: OwnerAssetPosition + PortfolioAllocation

Recommended target refinement for evaluation:

## OwnerAssetPosition

A logical/derived economic position for:

```text
Owner + Asset
```

Example:

```text
OwnerAssetPosition(User, Gold) = 200 g
OwnerAssetPosition(User, Silver) = 5,000 g
```

It is derived from OwnershipShares across all Holdings and must not duplicate wealth.

## PortfolioAllocation

Instead of requiring ordinary purpose allocation to point to a specific physical Holding, allocate against the OwnerAssetPosition:

```text
PortfolioAllocation
Portfolio = Long-Term Investment
Owner = User
Asset = Gold
Quantity = 120 g
```

Then physical custody can move independently:

```text
Gold Holdings:
Home 40 g
Al Rajhi 160 g

Portfolio allocation remains:
Long-Term Investment 120 g
Emergency 30 g
Available 50 g
```

No Portfolio change is required because no purpose changed.

### Proposed invariant

For each `Owner + Asset`:

```text
sum(PortfolioAllocation quantities)
<=
sum(Owner's quantity across all Holdings of that Asset)
```

Available quantity becomes:

```text
OwnerAssetTotal - PortfolioAllocatedQuantity
```

This preserves the earlier meaning of Available while removing unnecessary custody coupling.

Status: **Draft refinement — requires explicit approval before superseding ENT-041/RULE-004.**

---

# 10. Optional physical reservation layer

Sometimes the user may genuinely want to say:

> "This exact 100 g bar in the bank is for my children."

That is different from ordinary economic Portfolio allocation.

Proposed optional concept:

```text
PhysicalReservation
PortfolioAllocation -> Holding / PhysicalItem
```

Use it only when exact physical identity/location matters.

Normal Portfolios should not require this precision.

This gives two levels:

```text
Economic purpose:
Children Portfolio owns/reserves 500 g Silver economically

Optional physical reservation:
300 g of that allocation is specifically reserved from Bank Holding
200 g is specifically reserved from Home Holding
```

If no physical reservation exists, the Portfolio still has a valid economic allocation independent of storage.

---

# 11. Potential future PhysicalItem layer

Holding quantities can be aggregated, but physical metals may consist of identifiable pieces:

```text
Gold Holding at Home = 60 g
├─ Bar #A = 20 g
├─ Bar #B = 20 g
└─ Bar #C = 20 g
```

For simple personal finance, aggregate grams may be enough.

For serial-numbered bars, coins, jewelry, differing purity or specific-sale tracking, a future optional `PhysicalItem` / `InventoryUnit` below Holding may be useful.

Status: `TBD`. Do not introduce it merely because a quantity exists.

---

# 12. Purity and form challenge

The high-level product tree should remain simple:

```text
Metals
├─ Gold
└─ Silver
```

However, valuation and physical accounting may need to distinguish:

- 24K versus 22K Gold;
- fine silver versus lower purity;
- bars versus coins/jewelry;
- grams gross weight versus fine-metal equivalent;
- premiums over spot.

Possible future designs include:

1. separate Asset variants under high-level Gold/Silver;
2. one Gold/Silver Asset plus physical-item attributes and fine-weight normalization.

Status: `TBD` pending real examples. Coding agents must not choose silently.

---

# 13. Bank custody challenge

"Gold at Al Rajhi" can mean materially different legal/economic products.

## Allocated physical custody

Specific/segregated metal is legally owned by the user and the bank merely holds it.

Then model it as User-owned Gold/Silver Holding in bank custody.

## Unallocated metal account / certificate / contractual entitlement

If the bank owes metal/value but the user does not legally own identified physical metal, this may be a Claim or financial instrument rather than a physical Holding.

The onboarding flow must ask enough questions to avoid pretending every bank metal product is physically allocated custody.

Status: `TBD product questionnaire`, but the semantic distinction is mandatory.

---

# 14. UI implications

The same truth should be explorable through different lenses.

## Asset lens

```text
Investments
└─ Metals
   ├─ Gold — 200 g
   │  ├─ Home — 60 g
   │  └─ Al Rajhi — 140 g
   └─ Silver — 5,000 g
      ├─ Home — 1,000 g
      ├─ Al Rajhi — 1,500 g
      └─ Brother / Turkey — 2,500 g
```

## Portfolio lens

```text
Long-Term Investment
├─ Gold — 120 g
└─ Silver — 3,000 g

Emergency Reserve
├─ Gold — 30 g
└─ Silver — 500 g
```

## Custody lens

```text
Home
├─ Gold — 60 g
└─ Silver — 1,000 g

Al Rajhi
├─ Gold — 140 g
└─ Silver — 1,500 g

Brother / Turkey
└─ Silver — 2,500 g
```

All three are projections over the same financial reality. They must not create duplicate wealth rows.

---

# 15. Required scenario tests

## TEST-METAL-001 — Distributed custody totals
Given User owns Gold across Home and Bank, total Gold equals the sum of ownership quantities across those Holdings.

## TEST-METAL-002 — Custody movement preserves wealth
Move Gold from Home to Bank; total owner Gold and net worth remain unchanged, and no realized P/L is created.

## TEST-METAL-003 — Brother custody does not transfer ownership
Silver physically held by Brother remains in User wealth when User retains legal/economic ownership.

## TEST-METAL-004 — Claim prevents double counting
If Brother only owes equivalent Silver, represent Claim instead of simultaneously counting the same economic right as a physical Holding.

## TEST-METAL-005 — Acquisition cost survives custody transfer
Move metal between Holdings/locations; cost basis is preserved and no new acquisition is fabricated.

## TEST-METAL-006 — Portfolio purpose survives custody transfer
Under the proposed OwnerAssetPosition allocation refinement, moving physical Gold between Home and Bank does not modify Portfolio economic allocations.

## TEST-METAL-007 — Portfolio allocations cannot exceed owner asset total
Across all Portfolios, allocated Gold/Silver quantity for User cannot exceed User's aggregate ownership of that Asset.

## TEST-METAL-008 — Other owner quantity remains isolated
If a physical metal Holding is shared, another owner's grams cannot satisfy User Portfolio allocations.

---

# 16. Current conclusion

The scenario supports these already-approved principles:

1. Gold and Silver are economic Assets; location does not create new Asset identities.
2. Physical distribution is represented through Holdings/custody/location, not duplicate Assets.
3. Ownership remains independent from custody.
4. Moving metal between storage locations is a real custody/location transfer of the same Asset, not a sale/conversion.
5. Cost basis follows economic ownership/acquisition history and must survive custody movement.
6. Portfolio means purpose, not location.

The scenario also reveals one proposed architectural improvement:

> **Ordinary Portfolio allocation may be cleaner at `Owner + Asset` level rather than `Owner + Holding` level, with an optional physical reservation layer only when exact bars/locations are intentionally earmarked.**

This proposal remains Draft until explicitly approved, because it would refine the current `PortfolioSlice -> Holding` rule.