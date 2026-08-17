# MyFinMan — Responsive Application Shell

Status: **Approved direction / layout details evolve**

## Goal

MyFinMan is **one responsive web application**, not a desktop website plus a separate mobile website.

If Chrome becomes narrow, the same route must progressively become a real mobile app layout. If the viewport becomes wide, the same route must use the available space like a professional financial web application.

The final product must **not** show a fixed-width fake phone frame on desktop. That behavior is acceptable only in the current prototype.

## Breakpoint model

Breakpoints are presentation policy, not domain behavior.

### Mobile — `< 768px`

- Full viewport width; no phone-frame margins.
- Single primary content column.
- Compact top app bar.
- Fixed bottom navigation for the highest-frequency destinations.
- Floating / prominent Quick Action entry.
- Secondary filters use horizontal chips, segmented controls or bottom sheets.
- Creation/edit flows usually open full-screen or as bottom sheets.
- Tables transform into cards/rows; no horizontal-scroll accounting grids for core flows.
- Sticky confirmation footer for value-moving actions.
- Minimum comfortable touch target: approximately 44px.
- Safe-area support for notches/home indicators.

### Tablet — `768px–1199px`

- Right-side navigation rail in RTL mode or compact collapsible navigation.
- One or two content columns depending on context.
- Detail may open as side sheet rather than replacing the list.
- Larger filters can remain visible.
- Tables may appear for dense history if readable without horizontal overflow.

### Desktop — `>= 1200px`

- Professional full workspace, not an enlarged phone.
- Persistent right sidebar in RTL layout, approximately 240–280px when expanded.
- Context/top bar with page title, owner/context filters, search and quick actions where relevant.
- Main content uses responsive grid and can grow to a sensible max width (~1440–1600px) while still using the viewport.
- Master/detail split views are preferred where they reduce navigation cost.
- Dense financial information may use sortable tables **in addition to**, not instead of, semantic cards/summary areas.
- Drawers/panels can remain open while browsing related data.

## Primary navigation information architecture

The target navigation should remain semantically identical across form factors.

### High-frequency destinations

1. `SCR-001` — الرئيسية / Overview
2. `SCR-100` — المحافظ / Portfolios
3. `SCR-200` — الأصول والحسابات / Assets & Accounts
4. `SCR-300` — الحركات / Activity
5. `SCR-900` — المزيد / More

### Quick Action

A persistent quick-action entry opens `SCR-400` and exposes:

- income;
- expense;
- real transfer;
- asset conversion;
- asset purchase/sale;
- portfolio reallocation;
- reconciliation/adjustment when context allows.

Asset Conversion should **not require its own permanent navigation tab** in the final information architecture; it is an operation accessible from Quick Action and relevant asset/detail screens.

## Responsive navigation rendering

| Semantic destination | Mobile | Tablet | Desktop |
|---|---|---|---|
| Home | Bottom tab | Nav rail | Sidebar |
| Portfolios | Bottom tab | Nav rail | Sidebar |
| Assets & Accounts | Bottom tab | Nav rail | Sidebar |
| Activity | Bottom tab | Nav rail | Sidebar |
| More | Bottom tab | Nav rail/menu | Sidebar sections |
| Quick Action | FAB/prominent button | FAB/button | Header/command button |

Navigation rendering changes; routes and meaning do not.

## Page composition principles

### Same data, different density
A desktop screen may show summary + list + detail simultaneously. Mobile shows summary → list → detail as sequential drill-down. Both operate on the same entities and use cases.

### Progressive disclosure
Do not show cost lots, ownership shares, custody metadata, valuation provenance and audit history at the top level simultaneously. Surface them as drill-down sections.

### Context persistence
Owner, portfolio, date range and currency context should survive navigation where appropriate. A responsive layout change must never reset financial context.

### RTL first
- Arabic RTL is first-class.
- Sidebar/rail is on the right in RTL.
- Numeric financial values keep predictable alignment.
- Asset symbols/currency codes may remain LTR inside RTL layout.
- Icons indicating forward/back movement must respect RTL meaning.

## Reusable responsive patterns

### `CMP-001` Summary Metric
Mobile: compact vertical card. Desktop: row/grid metric tile.

### `CMP-010` Entity List Row
Mobile: tappable card/row. Desktop: row can expand into columns and actions.

### `CMP-020` Master/Detail Explorer
Mobile: list navigates to detail route/sheet. Desktop: list on right/left pane + persistent detail pane according to RTL composition.

### `CMP-030` Financial Action Sheet
Mobile: bottom sheet/full screen. Desktop: centered dialog or side panel. Same `ACT/UC` contract.

### `CMP-040` Preview/Confirm
All value-moving actions show a deterministic preview before commit when amounts, ownership, P/L or settlement consequences can change.

### `CMP-050` Timeline/Activity
Mobile: event cards. Desktop: timeline or sortable table with detail side panel.

## URL and state rule

A screen/detail should have a stable route or routable state whenever it is useful to deep-link, refresh, or share within an authenticated session. Responsive presentation must not depend on separate `/mobile/...` and `/desktop/...` routes.

## Accessibility baseline

- Keyboard navigation on desktop.
- Visible focus states.
- Labels for icon-only buttons.
- Do not use color alone for profit/loss/status.
- Respect reduced-motion preferences.
- Financial numbers should remain readable at browser zoom.

## Acceptance examples

### `TEST-UX-001`
Open `SCR-200` at 390px width: no horizontal page overflow; main navigation is bottom-based; asset list is single-column; detail opens as mobile drill-down.

### `TEST-UX-002`
Open the same `SCR-200` at 1440px: sidebar is visible; owner/type/account context can be shown simultaneously; detail can coexist with list; no phone frame.

### `TEST-UX-003`
Resize from 1440px to 390px while viewing the same holding: the selected entity and unsaved safe UI context remain stable; no duplicate business state is created.