# SCN-019 — Native Currency vs Reporting Currency

Status: Implemented / pending CI verification

## Intent
A cash account keeps its real/native currency quantity, while totals and rollups are displayed in one user-selected reporting currency.

## Domain distinction
- Account currency: descriptive/default input currency for the account.
- Holding symbol/native unit: the actual currency quantity owned, e.g. 40 USD.
- `marketPriceSar`: legacy/internal valuation field in SAR.
- Currency valuation reference: determines SAR value of one native cash unit when a deterministic reference exists.
- Reporting currency: presentation preference only; it never posts a ledger event and never changes quantity, ownership, cost basis, or custody.

## Example
Given 40 USD and USD/SAR reference 3.75:
- Native balance shown inside account: 40 USD.
- SAR valuation: 150 SAR.
- If reporting currency = SAR, account/group total shows 150 SAR.
- If reporting currency = USD, account/group total shows 40 USD.

## Rules
1. Currency is selected from a catalog; do not accept malformed free-text currency codes in normal UX.
2. A reporting-currency change is a display preference, not a financial transaction.
3. Foreign cash keeps native quantity; rollups use `quantity × unit-value-in-SAR`, then convert SAR to reporting currency.
4. USD uses deterministic reference 1 USD = 3.75 SAR.
5. Other deterministic pegs may use catalog reference rates. Floating currencies require a supplied/current valuation rather than silently assuming 1.
6. Legacy USD holdings incorrectly stored with `marketPriceSar = 1` must still value at 3.75 through the currency identity rule.
7. Account currency does not constrain the account to only one currency holding; it is the default/native preference for data entry.

## UX
- Account create/edit: currency dropdown.
- Add funds: currency dropdown; account currency preselects it.
- For fixed/reference currencies, valuation rate is shown and used automatically.
- Assets page: reporting currency selector.
- Holding card: native quantity first, reporting valuation second.

## Tests
- 40 USD stored with legacy price 1 values to 150 SAR.
- 150 SAR reports as 40 USD when reporting currency is USD.
- Non-cash holdings continue using their market valuation.
