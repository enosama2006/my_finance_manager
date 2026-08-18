# MyFinMan — Decision Log

Status: **Living record**

This file records decisions so later sessions do not reopen or silently reinterpret them. Never delete historical decisions; mark them Superseded/Refined when the model evolves.

## DEC-001 — Current application is a disposable prototype
Status: `Approved`

Current React/Vite application is a proof-of-concept used to validate theory, domain rules and UX. Future clean implementation is driven by `docs/spec/`, not preservation of prototype structure.

---

## DEC-002 — One financial reality, multiple independent lenses
Status: `Approved; refined by ADR-004/ADR-005 terminology`

Owner, beneficiary, Portfolio, Asset, Group/provider/custody context, Cost Basis and Valuation are independent dimensions over one financial reality. No duplicate wealth records are created merely to support different UI views.

---

## DEC-003 — Portfolio and allocation are one unified concept
Status: `Approved`

Use hierarchical Portfolio plus allocation over real owned Asset quantities. Do not maintain a separate competing allocation tree.

Portfolio can span providers/Groups and asset classes without pretending money moved.

---

## DEC-004 — Ownership is independent from custody
Status: `Approved`

An Asset owned by User and physically/provider-held by another Party remains User-owned until an explicit ownership event changes that fact.

---

## DEC-005 — Claim is different from third-party physical custody
Status: `Approved`

Specific user-owned value stored by another Party remains a user Asset with external custody metadata. If the Party may use it and only owes equivalent value, model a Claim instead. Do not count both for the same economic right.

---

## DEC-006 — Realized P/L only on qualifying true disposal/conversion/sale
Status: `Approved; detailed conversion policy remains scenario-dependent`

Valuation change, Group reorganization, same-value real transfer and Portfolio reallocation do not create realized P/L.

Qualifying disposal/conversion/sale calculates result from actual consideration, attributable fees and owner-specific basis under approved policy. AcquisitionChain may carry basis across bridge/continuing-capital transformations where the approved management policy says exposure has not economically realized.

---

## DEC-007 — Cost basis is owner-specific; current product method weighted average
Status: `Approved for product-performance; refined by DEC-024 exact lot basis`

Shared instrument identity/custody does not merge owners' acquisition costs. Weighted average per owner remains current product-performance method; tax policy may later differ. Unknown cost stays unknown.

---

## DEC-008 — Available means unallocated owned quantity
Status: `Approved; refined by ADR-002`

Available/Free Liquidity starts from the Owner's actual Asset quantity/value not economically protected by Portfolio or another explicit encumbrance. It is not bank balance, total net worth minus targets, or another owner's free quantity.

---

## DEC-009 — Real Transfer changes where same real value sits
Status: `Approved; terminology refined by ADR-004`

Moving SAR between two real Cash Assets is a Real Transfer. It changes physical/provider balance context but not Income/Expense or principal P/L.

Portfolio reallocation and Group reorganization must not fake such a transfer.

---

## DEC-010 — Expected income is planning, not wealth
Status: `Approved`

Expected/late/missed IncomeStream records do not increase Asset quantity. Only actual posted receipt does.

---

## DEC-011 — Transaction correction uses same logical identity + revision history
Status: `Approved`

Fixing entered facts does not create a fake second event.

```text
Reverse old projection -> replay corrected intent -> same LogicalTransaction ID -> revision audit
```

A real later refund/reversal is a new linked Transaction.

---

## DEC-012 — Credit-card liability is separate from expense and cash payment
Status: `Approved`

Credit purchase creates Expense + Liability. Later card payment reduces Cash Asset + Liability and does not recreate the Expense.

---

## DEC-013 — Responsive single application
Status: `Approved`

One application adapts to mobile, tablet and desktop. No separate business semantics per form factor.

---

## DEC-014 — Mobile and desktop navigation represent same destinations
Status: `Approved direction; labels may evolve`

Navigation destinations are semantic views of the same financial system. Exact labels/grouping may evolve through real-use UX testing.

---

## DEC-015 — Documentation is source of truth for future Vibe Coding
Status: `Approved`

Meaningful changes must trace through specification/decision/scenario/test artifacts. Coding agents must not silently resolve TBD behavior.

---

## DEC-016 — Target persistence relational/transactional; PostgreSQL preference Draft
Status: `Draft architecture`

Relational transactional storage is preferred for integrity/precision/audit/reporting. Exact engine/ORM/hosting remains TBD.

---

## DEC-017 — Target transaction effects may normalize into TransactionLegs
Status: `Draft architecture`

LogicalTransaction + TransactionRevision + validated normalized TransactionLegs is the target direction for complex multi-effect events. Genericity must not weaken deterministic business validation.

---

## DEC-018 — Physical distribution identity
Status: `Refined/Superseded in terminology by ADR-005`

Historical wording said: one Gold `Asset master` with several `Holdings` across Home/Al Rajhi/Brother.

Current canonical interpretation:

```text
InstrumentDefinition: Gold / XAU   [reference identity; no wealth]
├── Asset instance: Gold at Al Rajhi
└── Asset instance: Gold at Brother/Home/etc.
```

Consequences:
- same economic instrument may have several concrete Asset instances when holding/custody contexts are intentionally separate;
- total Gold/Silver exposure is a derived aggregation by InstrumentDefinition/identity;
- the derived total is never stored as another wealth Asset;
- movement/custody change does not create Income/Expense or reset basis;
- explicit custodian/provider/location metadata carries physical truth; Group may organize/mirror context but remains organizational.

Scenario: SCN-001. Refinement: ADR-005.

---

## DEC-019 — Ordinary Portfolio allocation may be custody-independent
Status: `Superseded by ADR-002 — Approved`

Ordinary Portfolio purpose operates economically over Owner + Asset quantity and is not inherently tied to provider/Group location. Exact designated/hard backing is optional policy when intentionally required.

---

## DEC-020 — Free Liquidity is a first-class decision metric
Status: `Approved`

For liquid Assets, MyFinMan distinguishes owned cash from unrestricted cash. Physical payment comes from an actual Cash Asset; selected Portfolio determines WHY value is consumed. No fake transfer is created merely to align purpose with provider location.

---

## DEC-021 — Group -> Asset is canonical user wealth hierarchy
Status: `Approved via ADR-004`

```text
Group
├── Group
├── Asset
└── Asset
```

Group is the only user hierarchy/container and has no financial truth. Asset is quantity-bearing financial truth. Asset never contains Asset. Account/Place are not mandatory target-domain layers; legacy rows may remain for import compatibility.

---

## DEC-022 — Broker/investment account context is not Portfolio
Status: `Draft target refinement validated by real snapshot; ADR-005/SCN-022`

A real broker/investment context is represented by Group/context plus the Assets actually held there.

Example:

```text
الاستثمارات -> الراجحي المالية
├── Cash SAR Asset
├── Cash USD Asset
├── Fund Asset
└── Stock Asset
```

Portfolio remains optional WHY and may span several Groups/providers. A Portfolio is not required merely because a broker account exists.

---

## DEC-023 — InstrumentDefinition is reference identity; Asset is concrete holding/balance
Status: `Draft target refinement validated across SCN-001/022; ADR-005`

InstrumentDefinition answers `ما هي الأداة؟` and carries catalog/market metadata without wealth.

Asset answers `ماذا أملك فعليًا وكم؟` and carries quantity, owner, exact basis and valuation.

One InstrumentDefinition may identify several intentional Asset instances. Manual Assets may initially be unmatched and later linked without rewriting history.

---

## DEC-024 — Repeated purchase adds an exact lot to an existing selected Asset
Status: `Draft target refinement / implementation open #36 and #38`

A new purchase transaction does not imply a new Asset.

If user selects an existing compatible Asset:
- increase quantity/ownership;
- append independent exact CostBasisLot;
- keep purchase Transaction independent;
- derive weighted-average cost from active exact lots.

If user intentionally wants a separate holding/context, create another Asset instance.

No automatic merge by name/symbol alone.

Exact lot basis + quantity are financial truth; display-rounded unit cost is derived.

---

## DEC-025 — Investment cash distribution is linked to the source investment
Status: `Draft target refinement / implementation open #37`

A cash distribution from a Fund/Investment Asset is a first-class financial event:

```text
Investment Asset -- distribution --> destination Cash Asset
```

Ordinary cash distribution increases cash without reducing investment units unless the actual product event says otherwise.

Performance separates:
- Market P/L;
- Cash Income;
- realized result;
- Total Return.

An accumulating fund does not generate invented cash income merely because NAV rises. Return-of-capital requires separate basis policy.

---

## DEC-026 — Reporting/current FX valuation is independent from historical basis
Status: `Approved distinction / precision implementation open #38`

Native quantity, current/reporting valuation and historical acquisition basis are distinct facts.

Foreign-currency opening uses actual known historical basis/rate or unknown. It never invents `1 SAR/unit` as basis. Reporting currency changes presentation only.

---

# How to add/refine a decision

For a small decision append `DEC-xxx` with status, decision, reason and consequences.
For consequential architecture create/update an ADR and reference it here.
Never delete history; mark old interpretations Deprecated/Superseded/Refined so the evolution remains understandable.
