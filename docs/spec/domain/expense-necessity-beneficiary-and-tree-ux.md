# Expense Necessity, Beneficiary and Tree UX

Status: **Approved product semantics / Implemented Prototype UX**
Date: 2026-08-17

## Decision summary

MyFinMan keeps the dimensions of an expense independent:

- `WHAT` — ExpenseCategory: what was purchased/spent on.
- `WHERE` — physical Cash Holding / Account that paid.
- `WHY` — optional Portfolio whose economic allocation is consumed.
- `WHO` — ExpenseBeneficiary: who benefited from the spending.
- `NECESSITY` — the financial cut-ability / obligation level that applied to the expense.

These dimensions must not be collapsed into one another.

## Expense category tree UX

The category tree is expected to become large. The Approved interaction is therefore:

1. Add/Edit is performed in a responsive modal/sheet over the current context; clicking the pencil must never force the user to scroll to a distant editor.
2. Parent selection is a cascading path selector: Level 1 -> Level 2 -> Level 3 ... until the desired parent is reached.
3. The chosen path is shown as a breadcrumb.
4. Reparenting still uses domain cycle protection.
5. The visible tree supports node-by-node Expand/Collapse, Collapse All and a root-level view.
6. Mobile uses a bottom/full sheet while desktop/tablet use an overlay dialog; the semantic action is the same.

## Financial necessity taxonomy

The Time Matrix / urgent-important model is not adopted as the primary accounting classification for spending. Urgency is about time pressure; financial necessity is about whether spending can be reduced/removed without violating an obligation or core need.

Approved primary necessity levels:

1. `obligation` — **التزام ملزم**: contractual/legal/billed commitment that should be paid or explicitly resolved. Examples: rent due, debt installment, committed school fee.
2. `essential` — **أساسي**: core household/person need, but amount/provider/timing may have some flexibility. Examples: basic groceries, necessary medicine, essential transport.
3. `flexible` — **مرن / قابل للضبط**: useful or important quality-of-life spending whose amount/timing can be materially reduced or deferred.
4. `discretionary` — **كمالي / اختياري**: can normally be removed without breaching a core obligation or basic need. Examples can include leisure dining/entertainment depending on context.

The classification is not a moral judgment.

### Category default + transaction snapshot

- An ExpenseCategory can carry a default necessity.
- A child with no explicit value may inherit/materialize its parent's classification when normalized/saved, avoiding repetitive setup.
- A posted expense snapshots the effective necessity at posting time.
- The user can override necessity for one transaction without changing the category default.
- Later edits to a category must not rewrite historical expense necessity silently.

## Urgent / Important matrix

Status: **Draft advisory lens, not core expense taxonomy**.

Potential future derivation:

- Urgency can come from due date, overdue state, emergency flag or time-to-act.
- Importance can be informed by obligation/necessity, goal impact and user policy.
- The four quadrants can be shown in planning/advisory views without forcing four-way manual classification on every posted expense.

This avoids converting a time-management tool into a mandatory financial ledger field.

## Expense beneficiaries

ExpenseBeneficiary is independent from ExpenseCategory and from Owner.

Examples:

- Restaurant category + beneficiary `أنا`.
- Restaurant category + beneficiary `العائلة`.
- School category + beneficiary `مراد`.
- Clothing category + beneficiary `الأطفال`.

This permits cross-reporting without duplicating category trees per person.

### Individual vs group

An ExpenseBeneficiary may be:

- `person` — one individual reporting target.
- `group` — an atomic reporting target such as Family or Children.

A group amount is **not automatically copied to each member**. A 300 SAR family meal remains 300 SAR total, not 300 SAR for every family member. Future explicit beneficiary-share allocation may be added if needed.

### Home is not a beneficiary

A physical home, car, property or other asset is not a human beneficiary. If the user wants reports such as cost-of-home or cost-of-car, the future model should use a distinct `ExpenseSubject / CostCenter / RelatedAsset` dimension rather than pretending the asset is a beneficiary.

For home maintenance today:

- WHAT = Home > Maintenance category.
- WHO = Family/household beneficiary where meaningful.
- Future SUBJECT = specific Home asset/cost center.

## Reporting implications

Future expense analytics should support cross-filtering at least:

- Category tree
- Necessity
- Beneficiary
- Portfolio
- Physical Account/Place
- Time period

Examples:

- Personal spending where beneficiary = Me.
- Family spending where beneficiary = Family.
- Total discretionary restaurant spending.
- Essential spending funded by a particular Portfolio.
- School spending for one child regardless of physical payment account.

## AI behavior

AI may suggest category, beneficiary and necessity from text/history, but:

- suggestions do not mutate financial data before user approval;
- beneficiary must not be inferred from payer/owner;
- category does not determine beneficiary;
- category default does not prevent a transaction-specific necessity override.
