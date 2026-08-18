# MyFinMan — Scenario Laboratory Index

Status: **Living index**
Last reconciled: 2026-08-18

Scenarios preserve real/user-accepted facts even when their original architectural interpretation is later Superseded.

For the current cross-scenario reconciliation and simulation, read:

- `SCENARIO-RECONCILIATION-2026-08-18.md`
- ADR-004 — Group -> Asset structural baseline
- ADR-005 — Instrument identity / Asset instances / lots / investment flows refinement
- ADR-006 — Tree-first UX / unified Parties / leaf actions / Modal-Sheet / form lifecycle
- ADR-007 — File-backed SQLite persistence / explicit migration / cash FX transfers
- ADR-008 — Canonical effective financial facts / rebuildable materialized projections

## Scenario inventory

| ID | Scenario | Current interpretation/status |
|---|---|---|
| SCN-001 | Precious metals distributed custody | Facts valid; old Asset-master/Holding language mapped via ADR-005 |
| SCN-002 | Income-producing assets & investment Portfolio | Facts valid; Account wording mapped to Cash Assets/Groups |
| SCN-003 | Child cash custody & ownership substitution | Facts valid; ownership/custody separation retained |
| SCN-004 | Portfolio archetypes & inter-owner settlement | Facts valid; settlement implementation partial |
| SCN-005 | Savings backing & maturity ladder | Facts valid; backing policy remains Draft refinement |
| SCN-006 | Entrusted crypto-to-cash settlement | Facts valid; SettlementMandate/encumbrance not fully implemented |
| SCN-007 | Cost flow / acquisition chain | Facts valid; AcquisitionChain persistence Draft |
| SCN-008 | Valuation role & performance recognition | Facts valid; historical FX basis refinement implemented via #38 |
| SCN-009 | Portfolio lifecycle / CapitalCycle / Position | Facts valid; lifecycle implementation partial |
| SCN-010 | Expense tree & Portfolio consumption | Facts valid; leaf-only category posting refined by ADR-006 |
| SCN-011 | Place-first Account purchase/export | **Place/Account architecture Superseded**; purchase/export facts retained |
| SCN-012 | Expense necessity / beneficiaries / tree UX | Valid; beneficiary identity now converges on canonical Party via ADR-006 |
| SCN-013 | User Account Groups | **Group->Account->Holding Superseded** by Group->Asset |
| SCN-014 | Audited transaction correction | Approved invariant; financial replay/reprojection coverage expands incrementally |
| SCN-015 | Opening state correction/void | Approved; same Asset+Owner correction after later movements refined by ADR-008/SCN-025 |
| SCN-016 | Correctable asset purchase | Approved; repeated-purchase Lots implemented via #36 |
| SCN-017 | Ledger cleanup visibility | Draft/Open UX debt; voided audit remains persisted |
| SCN-018 | User correction principle | Approved product invariant; corrections must change effective facts and reproject, not fabricate compensating events |
| SCN-019 | Native/reporting currency | Valid after separating current FX valuation from historical basis; cross-currency account movement refined by ADR-007 |
| SCN-020 | Account Cascader | **Account terminal Superseded** by Group->eligible Asset cascader #33 |
| SCN-021 | Group->Asset & full correction | Current Approved structural baseline; refined by ADR-005 |
| SCN-022 | Real investment account, funds, distributions & DCA | Real snapshot validation; DCA/basis fixed; catalog/distributions remain #34/#37 |
| SCN-023 | Tree-first Parties, Portfolios, leaf actions & form lifecycle | Approved product direction; implementation tracked #40-#44 |
| SCN-024 | File SQLite cut-over & cross-currency cash transfer | Implemented and automated-verified via ADR-007; awaiting real-use verification |
| SCN-025 | Opening correction after later transactions | Implemented first ADR-008 projection slice; automated verification passed, awaiting real-use verification |

## Rule for future scenarios

Every new scenario must explicitly separate:
- accepted real facts;
- Approved rules already in force;
- newly discovered challenge;
- Draft proposal;
- implementation status;
- acceptance/simulation result.

A later architecture change updates interpretation/status rather than deleting the historical scenario facts.
