# SCN-006 — Entrusted Crypto, Exchange Margin, Reciprocal Settlement, and Capital Cycle

Status: **Approved scenario facts / Draft unified-processing refinements**

## Purpose

Pressure-test MyFinMan with a multi-party, multi-asset scenario that combines:

- receipt of value from another Party;
- custody versus debt/obligation classification;
- USDT held in a Binance Account;
- sale of USDT for TRY;
- realized commercial margin;
- receipt of USD cash from a different Party;
- purchase of goods in TRY for that Party;
- final delivery of USD cash to the first Party's family;
- end-to-end profit measurement without confusing temporary balances with income.

The scenario is intended to discover a reusable internal mechanism that also explains prior child-money, investment, settlement and cross-account examples.

---

# 1. Parties and real-world facts

Parties:

```text
User / Operator
Friend A / Principal
Family A / final beneficiary of the remittance
Buyer B / buys USDT for TRY
Customer C / gives USD cash and asks User to buy goods in TRY
Binance / digital-asset account/custodian
Turkish Bank / TRY account
```

Scenario facts:

1. Friend A sends User 1,000 USDT into User's Binance account.
2. The purpose is to get equivalent value to Friend A's family, ultimately as 1,000 USD cash in the user's example.
3. User is permitted to dispose of/sell the USDT rather than being required to preserve the exact tokens.
4. Buyer B wants 1,000 USDT and agrees to pay 50 TRY per USDT.
5. Reference/economic benchmark in the example is 45 TRY per USDT.
6. Buyer B transfers 50,000 TRY to User's Turkish bank account; User transfers 1,000 USDT to Buyer B.
7. The simplified gross margin at those example rates is 5,000 TRY before fees/other costs.
8. Customer C later gives User 1,000 USD cash and asks User to purchase 45,000 TRY of goods on Customer C's behalf.
9. User pays 45,000 TRY for the goods.
10. User now has 1,000 USD cash available and 5,000 TRY remaining from the earlier 50,000 TRY proceeds.
11. User delivers the 1,000 USD cash to Friend A's family.
12. The first obligation is settled; the simplified residual result of the combined cycle is 5,000 TRY before fees/other costs.

Arithmetic in the example:

```text
USDT sale proceeds = 1,000 × 50 TRY = 50,000 TRY
Economic/reference value = 1,000 × 45 TRY = 45,000 TRY
Simplified margin = 5,000 TRY
```

These example rates are scenario inputs, not market prices.

---

# 2. First classification question — custody or obligation?

This scenario exposes a rule that generalizes SCN-003.

When a Party transfers a fungible Asset to the User, MyFinMan must determine whether the User is merely holding that Party's specific/economic Asset or whether the User may consume/dispose of it and instead owes an equivalent value/quantity.

## Case A — true custody

If Friend A says:

> Keep these exact/economic 1,000 USDT for me and return/send my USDT.

then the USDT remains Friend A-owned wealth with User/Binance custody.

Conceptually:

```text
Asset = USDT
Holding = Binance
Owner = Friend A
Custodian/account holder = User
```

User must not report the 1,000 USDT as User wealth or User Free Liquidity.

## Case B — disposal permitted; equivalent value is owed

This SCN-006 scenario uses this case.

Friend A permits User to sell/use the 1,000 USDT, while User remains obligated to deliver the agreed settlement to Family A.

Then the recommended economic representation is not Friend A ownership of the same USDT Holding.

Instead:

```text
User-controlled Asset:
+1,000 USDT in Binance

External settlement obligation:
+ obligation to Friend A / Family A
  denominated in the exact agreed unit/value
```

The obligation denomination must be explicit.

Examples:

```text
Deliver exactly 1,000 USD cash
```

is different from:

```text
Deliver the value of 1,000 USDT
```

or:

```text
Return 1,000 USDT
```

The app must not infer these are economically identical.

---

# 3. Receipt of the 1,000 USDT

Assuming the agreement is to deliver 1,000 USD cash and User may freely dispose of the received USDT:

```text
Binance USDT Holding +1,000 USDT
Settlement Obligation to Friend A / Family A +1,000 USD
```

Effects:

- User physical/controlled assets increase;
- User external obligations increase;
- the receipt is not User income;
- User Net Worth does not increase merely because Binance now shows 1,000 USDT;
- the USDT must not enter unrestricted Free Liquidity as if unencumbered personal wealth.

This is analogous to receiving funded working capital against an external obligation.

---

# 4. Sell 1,000 USDT to Buyer B for 50,000 TRY

Physical facts:

```text
Binance USDT -1,000
Turkish Bank TRY +50,000
```

The first Friend A settlement obligation is still open.

It must not disappear merely because the funding Asset changed from USDT to TRY.

The trade is a true Asset disposal/conversion and can generate realized economic result.

For the simplified example:

```text
Net proceeds                 50,000 TRY
Economic/carrying basis      45,000 TRY
---------------------------------------
Simplified realized margin    5,000 TRY
```

Actual MyFinMan calculation must use:

- actual acquisition/carrying basis of the disposed USDT;
- actual transaction exchange rate/valuation timestamp;
- actual fees and charges;
- any explicit spread/service fee;
- the agreed denomination/value of the still-open obligation.

It must not compute profit solely by comparing the sale price with today's current market price after the fact.

---

# 5. State after the USDT sale

Simplified state:

```text
Assets under User control:
TRY Bank Cash = 50,000 TRY
USDT = 0

Open obligations:
Deliver 1,000 USD cash to Family A

Realized cycle margin so far:
5,000 TRY before fees, under the scenario's 45/50 assumptions
```

The 50,000 TRY bank balance is not the same as 50,000 TRY profit.

A substantial portion of the value is still economically needed to settle the external obligation.

This is a key product requirement: **gross controlled balance must never be confused with own equity/profit/free liquidity.**

---

# 6. Customer C gives User 1,000 USD cash for a 45,000 TRY purchase

A second, independent Party enters the cycle.

Customer C hands User:

```text
+1,000 USD physical cash
```

and User accepts an obligation:

```text
Purchase/deliver goods costing 45,000 TRY for Customer C
```

This receipt is not automatically User income.

Until the obligation to Customer C is fulfilled, the app must preserve the economic relationship.

A simple management representation is:

```text
USD Cash Holding +1,000
Customer-C Purchase Obligation +45,000 TRY-equivalent service/purchase commitment
```

Exact statutory-accounting classification is outside this scenario; MyFinMan's goal is to preserve the economic facts and prevent double counting.

---

# 7. User buys 45,000 TRY of goods for Customer C

Physical payment:

```text
Turkish Bank TRY -45,000
```

The goods are purchased for Customer C and should not become User inventory/property merely because User paid the merchant.

When the purchase obligation is fulfilled:

```text
Customer-C Purchase Obligation -> settled
```

The 1,000 USD cash received from Customer C becomes economically available to User according to the agreed exchange/service arrangement.

In the simplified example, User has effectively exchanged 45,000 TRY of purchasing power for 1,000 USD cash.

If 45 TRY/USD is the actual agreed economic rate and there are no other fees, this second sub-transaction has zero separate exchange margin in the example.

If actual economics differ, MyFinMan must calculate the actual realized difference rather than assume zero.

---

# 8. State before final delivery to Family A

After the purchase for Customer C:

```text
Turkish Bank TRY remaining = 5,000 TRY
USD cash held              = 1,000 USD

Customer C obligation = settled
Friend A / Family A obligation = still 1,000 USD
```

At this point the assets needed to settle Friend A exist in the correct settlement Asset: USD cash.

---

# 9. Deliver 1,000 USD cash to Family A

Physical movement:

```text
USD Cash -1,000
```

Obligation movement:

```text
Friend A / Family A Settlement Obligation -1,000 USD
```

After delivery:

```text
Open Friend A obligation = 0
USD cash from this cycle = 0
TRY remaining = 5,000 TRY
```

The cycle closes economically.

---

# 10. Cycle profitability

The correct result is not obtained by treating every inbound asset as income and every outbound asset as expense.

The cycle must distinguish:

- entrusted/funded receipts;
- liabilities/settlement obligations;
- true Asset conversions;
- third-party purchases;
- realized trading/exchange/service margin;
- fees and transaction costs;
- final obligation settlement.

Simplified example result:

```text
USDT/TRY sale proceeds          50,000 TRY
Economic replacement cost      45,000 TRY
-----------------------------------------
Gross realized cycle margin      5,000 TRY
Less: exchange/platform/transfer/other fees
-----------------------------------------
Net realized cycle profit        remainder
```

The second Customer C arrangement economically supplies the 1,000 USD used to settle Friend A while consuming 45,000 TRY.

The final 5,000 TRY is therefore the simplified residual own economic gain of the end-to-end cycle, assuming no other costs, obligations or FX differences.

---

# 11. Portfolio is not the right primary container for this scenario

This cycle should not be forced into an Investment Portfolio merely because USDT/TRY/USD are Assets.

The primary concepts are:

```text
Economic Activity / Venture
  e.g. Exchange / Delivery Service

Settlement Cycle / Economic Case
  e.g. Friend A -> Family A, cycle #123

Transactions
  receipt USDT
  sell USDT
  receive USD
  buy goods
  deliver USD

Obligations
  deliver USD to Family A
  buy goods for Customer C
```

A Portfolio becomes relevant only if the User deliberately allocates User-owned capital to support this activity, for example a 100,000 TRY Working Capital Portfolio.

Third-party-funded value must not be mistaken for the User's Investment Portfolio capital.

---

# 12. Proposed Draft entity — EconomicCase / SettlementCycle

This scenario suggests a grouping concept above individual LogicalTransactions.

Possible name:

```text
EconomicCase
or
SettlementCycle
```

Purpose:

- link multiple real transactions that together satisfy one business/remittance objective;
- link the obligations that open and close through the cycle;
- calculate cycle-level profit, fees and unresolved exposure;
- show the user where the cycle's value currently sits;
- preserve auditability without inventing fake transfers.

Conceptual structure:

```text
EconomicCase #123
├─ Activity: Exchange / Delivery
├─ Principal: Friend A
├─ Beneficiary: Family A
├─ Settlement obligation: 1,000 USD
├─ Transactions
│  ├─ Receive 1,000 USDT
│  ├─ Sell 1,000 USDT for 50,000 TRY
│  ├─ Receive 1,000 USD from Customer C
│  ├─ Buy 45,000 TRY goods for Customer C
│  └─ Deliver 1,000 USD to Family A
├─ Fees
├─ Realized result
└─ Status: Open / Partially Settled / Settled
```

Status: **Draft**. The engine must not require this grouping entity for financial correctness; it is primarily for lifecycle, traceability, profitability and UX.

---

# 13. Proposed unified processing rule

Each real event should be decomposable into independent dimensions:

```text
1. Asset Position
   What Asset quantity changed?

2. Holding / Account
   Where did the real Asset change?

3. Economic Party / Control
   Whose wealth/control/right changed?

4. Obligation / Claim
   Who now owes whom what Asset/value and under what settlement terms?

5. Purpose / Activity / Portfolio
   Why did the event happen and which economic activity/purpose does it belong to?

6. Valuation / Cost Basis / Rate
   What transaction-time basis/rate determines realized economics?

7. Settlement Link
   Which obligation or earlier payment does this event settle?

8. Case / Cycle
   Which end-to-end economic process does this event belong to?
```

Not every event uses every dimension.

This is a stronger generalization than building separate special-case workflows for children, gold, vehicle purchases, portfolio funding, remittance or crypto.

---

# 14. Strong candidate invariant — Custody-or-Obligation classification

For a fungible Asset received from another Party, MyFinMan must not simultaneously treat the same economic value as:

- still owned by that Party in custody; **and**
- User-owned/controlled with a matching debt;

unless two genuinely separate economic rights exist.

At intake, the app needs enough facts to classify:

```text
A. Custody:
   "I am holding their Asset; they still own it."

B. Obligation:
   "I may use/dispose of the Asset; I owe them an equivalent agreed settlement."
```

SCN-003 child safekeeping is normally A.
SCN-006 friend-USDT disposal scenario is normally B, given the stated permission to sell and replace it.

This candidate invariant should be tested further before promotion to Approved core rule.

---

# 15. Multi-currency requirements exposed by the scenario

MyFinMan must retain native quantities:

```text
1,000 USDT
50,000 TRY
1,000 USD
```

and transaction-time exchange/valuation rates.

It must not overwrite historical transaction economics when current FX/market rates change later.

Reporting currency translation is a separate presentation/calculation layer.

The scenario also shows why the obligation's denomination must be explicit: a 1,000 USD obligation is not automatically the same thing as a 1,000 USDT obligation.

---

# 16. UX concept

A user-facing cycle could appear as:

```text
عملية إيصال قيمة — صديق A
الحالة: قيد التنفيذ

المطلوب إيصالُه
1,000 USD إلى العائلة

المسار حتى الآن
✓ استلام 1,000 USDT — Binance
✓ بيع 1,000 USDT — 50,000 TRY
✓ استلام 1,000 USD نقدًا مقابل شراء للعميل C
✓ شراء منتجات 45,000 TRY للعميل C
○ تسليم 1,000 USD للعائلة

الرصيد المرتبط بالعملية الآن
5,000 TRY
1,000 USD مخصص للتسوية

الربح المحقق حتى الآن
5,000 TRY قبل الرسوم
```

The UI should show obligations/exposure separately from User-owned free assets.

---

# 17. Acceptance scenarios

### TEST-SCN006-01 — receipt is not income
Receiving 1,000 USDT against an obligation must not increase User Net Worth as if it were earnings.

### TEST-SCN006-02 — custody path
If exact/economic USDT remains Friend-owned, the Holding uses Friend ownership and no duplicate User liability is created for the same value.

### TEST-SCN006-03 — obligation path
If User may dispose of the USDT and owes equivalent settlement, User-controlled USDT and an external obligation are represented without Friend ownership of the same USDT.

### TEST-SCN006-04 — obligation denomination
Changing agreed settlement from 1,000 USD to 1,000 USDT changes the obligation semantics and later P/L/FX exposure.

### TEST-SCN006-05 — true USDT sale
Selling 1,000 USDT decreases the real Binance Holding and increases the real TRY bank Holding.

### TEST-SCN006-06 — Friend obligation survives asset conversion
USDT -> TRY conversion must not settle the Friend obligation unless the agreement itself says it does.

### TEST-SCN006-07 — gross balance is not profit
50,000 TRY bank balance after sale must not be displayed as 50,000 TRY earned profit.

### TEST-SCN006-08 — realized margin
Given valid 45,000 TRY basis and 50,000 TRY net proceeds, realized margin before fees is 5,000 TRY.

### TEST-SCN006-09 — customer C receipt
Receiving 1,000 USD from Customer C with a 45,000 TRY purchase commitment must preserve the obligation and not blindly classify 1,000 USD as free income.

### TEST-SCN006-10 — third-party goods
Goods bought directly for Customer C do not enter User asset inventory merely because User paid the merchant.

### TEST-SCN006-11 — customer C settlement
Buying the agreed 45,000 TRY goods settles Customer C's purchase obligation and economically releases the agreed USD consideration according to the transaction terms.

### TEST-SCN006-12 — final delivery
Delivering 1,000 USD to Family A reduces USD cash and closes the Friend A settlement obligation.

### TEST-SCN006-13 — end state
After the simplified full cycle, no USDT/USD related obligation remains and 5,000 TRY remains as User economic gain before costs.

### TEST-SCN006-14 — fees
Exchange/platform/transfer fees reduce cycle profit and never create extra principal.

### TEST-SCN006-15 — historical rates
Later FX/USDT valuation changes do not rewrite realized results of already-posted transactions.

### TEST-SCN006-16 — no Portfolio pollution
Third-party funded 1,000 USDT must not inflate User's Investment Portfolio unless User explicitly assigns genuine User-owned capital to that Portfolio.

### TEST-SCN006-17 — cycle profitability
A linked SettlementCycle view can calculate realized profit and unresolved obligations without becoming the source of Account/Holding truth.

---

# 18. Benchmark notes

For statutory financial reporting, crypto and foreign-currency classification can depend on facts and applicable standards/jurisdiction. MyFinMan should not pretend its management model is a universal statutory policy.

Useful benchmark principles:

- keep foreign-currency transactions and transaction-time exchange effects explicit;
- separate native Asset quantities from reporting-currency translation;
- distinguish Assets held for trading/sale from long-term investment behavior;
- preserve liabilities/obligations rather than treating entrusted receipts as revenue;
- calculate realized margin from actual transaction economics, not merely current market values.

The product should implement these as management-finance semantics while leaving tax/regulatory/statutory treatment configurable/TBD where needed.

---

# 19. Architecture pressure-test result

SCN-006 strongly supports a reusable engine centered on:

```text
Asset/Holding position changes
+ Party ownership/control
+ Claim/Liability/Obligation changes
+ Portfolio/Activity attribution
+ transaction-time valuation/cost basis
+ explicit settlement links
+ optional EconomicCase/SettlementCycle grouping
```

It also demonstrates that `Portfolio` alone cannot model all financial reality.

The same engine can potentially model:

- child money held by parent;
- parent paying for child's Gold;
- personal expense using another Owner's cash;
- investment Portfolio purchases paid from a different Account;
- credit-card purchase and later settlement;
- remittance/exchange cycles;
- business customer advances;
- third-party purchasing arrangements.

Further scenarios should test partial settlement, mixed fees, multiple beneficiaries, partial delivery, depeg/FX movement and losses before this Draft is promoted to Approved architecture.
