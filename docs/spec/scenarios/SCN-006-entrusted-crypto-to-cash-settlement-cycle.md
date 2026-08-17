# SCN-006 — Entrusted Crypto-to-Cash Settlement Cycle

Status: **Approved scenario facts / Draft unified settlement architecture**

## Purpose

Pressure-test MyFinMan with a multi-step entrusted-value scenario where:

- one Party sends 1,000 USDT to the user;
- the user's mandate is not to preserve or return the same USDT;
- the user's mandate is to deliver cash USD value to the sender's family;
- the user may choose the execution path used to convert the USDT into deliverable USD cash;
- transaction costs or losses may contractually belong to the sender rather than to the user;
- favorable execution/spread may belong to the user if that is the agreed economic arrangement;
- the physical Accounts and Assets change several times before the final obligation is settled.

This scenario tests whether one internal mechanism can explain child money, portfolio-backed savings, cross-owner purchases, entrusted funds, trading/exchange spreads, claims/liabilities and settlement.

---

## 1. Critical distinction from pure custody

The sender transfers 1,000 USDT into the user's Binance account and instructs the user to get cash value to the sender's family.

This is **not necessarily pure custody of the same USDT**.

If the instruction were:

> Keep my exact 1,000 USDT for me and return/transfer the same asset later.

then the sender could remain the economic Owner of that USDT while the user is only Custodian.

But in this scenario the sender authorizes the user to dispose of/convert the USDT to complete a separate settlement objective: delivering cash USD value to family.

Therefore the more useful target model is a **Settlement Mandate / Entrusted Obligation** rather than forcing the sender to remain Owner of every intermediate Asset.

The mandate must record who economically bears execution costs and who is entitled to execution spread/profit.

---

## 2. Initial receipt

Example:

```text
Sender transfers: 1,000 USDT
Destination: User's Binance account
Final beneficiary: Sender's family
Desired delivery medium: USD cash
```

Physical effect:

```text
Binance / USDT Holding +1,000 USDT
```

Economic control effect:

```text
User now controls 1,000 USDT for the purpose of performing the mandate.
```

Obligation effect:

```text
Settlement Mandate opened
Principal/input: 1,000 USDT
Creditor/principal Party: Sender
Beneficiary: Sender's family
Target settlement Asset: USD cash
```

This receipt must not be classified as the user's income and must not increase unrestricted Free Liquidity.

Whether the obligation is contractually:

- **Guaranteed Target** — user must deliver exactly a fixed USD amount regardless of execution costs; or
- **Net-Proceeds / Pass-Through** — conversion/withdrawal costs reduce what the beneficiary receives;

must be explicit. The system must not guess.

---

## 3. Reference execution route with large costs

Suppose a direct platform/bank route causes significant conversion/withdrawal costs and only about 850 USD cash can be delivered from the original 1,000 USDT.

If the agreed policy is **Net-Proceeds / costs borne by Sender**:

```text
Original entrusted value = 1,000 USDT
Execution/conversion/withdrawal costs = attributed to Sender/Mandate
Net USD cash deliverable ~= 850 USD
```

The loss/cost must not be charged to the user's personal P&L.

The Mandate performance view should show the leakage explicitly:

```text
Input value
- conversion costs
- withdrawal costs
- other pass-through costs
= net delivered value
```

If instead the mandate is **Guaranteed Target = 1,000 USD cash**, then any shortfall not recoverable from the sender must be funded by the user and becomes the user's economic loss/contribution. This distinction is mandatory.

---

## 4. Optimized execution route — sell USDT privately for TRY

Example market/reference rate:

```text
1 USDT reference value = 45 TRY
```

A counterparty wants to buy 1,000 USDT and is willing to pay:

```text
50 TRY / USDT
```

Real transaction:

```text
Binance USDT -1,000
Turkey Bank TRY +50,000
```

Reference value of the entrusted input at 45 TRY/USDT:

```text
1,000 × 45 = 45,000 TRY
```

Execution spread:

```text
50,000 - 45,000 = 5,000 TRY
```

If the economic agreement says the user is entitled to favorable execution spread, then:

```text
5,000 TRY = user's realized execution/trading margin
```

while the remaining economic value needed to settle the mandate remains protected/encumbered for the sender's settlement objective.

The physical 50,000 TRY is all in the user's bank Account, but it must not all become user's Free Liquidity merely because the bank balance is in the user's name.

Conceptually:

```text
Turkey Bank physical TRY = 50,000

Economically:
- Mandate-backed/encumbered value ≈ 45,000 TRY
- User execution margin = 5,000 TRY
```

The exact mandate-backed amount is determined by the outstanding settlement obligation and actual settlement policy, not by an arbitrary Portfolio allocation.

---

## 5. Second counterparty — user acquires 1,000 USD cash by spending 45,000 TRY

A different person has 1,000 USD cash and needs the user to buy/pay for products worth 45,000 TRY.

One coherent settlement representation is:

```text
User receives USD Cash +1,000
User pays/buys products in TRY -45,000
```

If this exchange is economically at 45 TRY/USD with no additional fee:

```text
TRY spent = 45,000
USD cash acquired = 1,000
```

After the operation:

```text
Turkey Bank TRY remaining = 5,000
USD Cash on hand = 1,000
```

The 5,000 TRY remains the user's realized margin from the earlier favorable USDT sale if that spread is contractually his.

The USD cash is now available specifically to settle the original sender mandate and should not be shown as unrestricted user cash before settlement.

---

## 6. Final delivery to sender's family

The user hands the 1,000 USD cash to the sender's family.

Physical effect:

```text
USD Cash Holding -1,000
```

Mandate effect:

```text
Outstanding Settlement Obligation -> 0
Status -> Settled
Beneficiary received -> 1,000 USD cash
```

User result from the whole cycle:

```text
Remaining Turkey Bank TRY = 5,000
```

If there were no other user-borne costs, this 5,000 TRY is the user's realized margin/profit from execution.

The sender/family settlement is complete and the entrusted value no longer affects the user's restricted/encumbered liquidity.

---

## 7. Why Portfolio is not the primary concept here

This cycle is not naturally a Savings, Investment, Rent or Children Portfolio.

A Portfolio answers:

> Why did an Owner reserve their own economic wealth?

This scenario answers a different question:

> What value is the user controlling to satisfy an obligation to another Party, and how is that obligation transformed and settled across Assets and Accounts?

Therefore the primary organizing object should be a Settlement Mandate / Entrusted Obligation, with optional links to an EconomicActivity if the user performs such exchange/remittance activity regularly.

Do not create a fake Portfolio merely to keep the transaction chain together.

---

## 8. Unified transaction dimensions discovered

Every material leg in the cycle can be expressed using the same independent dimensions:

```text
1. Physical Asset
   USDT / TRY / USD Cash / Goods payment

2. Physical Account / Holding
   Binance / Turkey Bank / Cash

3. Economic Party
   User / Sender / Buyer / Beneficiary

4. Obligation / Claim / Mandate
   What must still be delivered, to whom, and in what Asset/value basis?

5. Purpose/Portfolio (optional)
   Only when user's own wealth is earmarked for a purpose.

6. Settlement attribution
   Which principal/Party bears fees, losses, shortfalls or gains?

7. Activity attribution (optional)
   Exchange/remittance service, trading activity, personal favor, etc.
```

This same mechanism can also represent:
- Child gives cash to Father for safekeeping;
- Father pays for Child's Gold then reimburses from Child cash;
- user pays another Party's expense and creates a Claim;
- Portfolio purchase paid from a different Account;
- entrusted goods/money converted before delivery.

---

## 9. Critical economic attribution rule

A loss or fee belongs to the Party that economically bears it under the mandate/transaction terms — not automatically to the owner of the physical Account that paid it.

Examples:

### Sender bears conversion costs

```text
Mandate Input = 1,000 USDT
Costs = 150 USD-equivalent
Net delivered = 850 USD
User personal P/L effect = 0
```

### User guarantees 1,000 USD delivery

```text
Mandate target = fixed 1,000 USD
Net conversion result = 850 USD
User tops up = 150 USD
User economic loss/contribution = 150 USD
```

### User keeps execution spread

```text
Reference economic value = 45,000 TRY
Actual USDT sale proceeds = 50,000 TRY
User entitled spread = 5,000 TRY
User realized margin = 5,000 TRY
```

The system must record the attribution policy and must never infer it merely from Account ownership.

---

## 10. Proposed lifecycle state

Draft:

```text
SettlementMandate
- principalParty
- beneficiaryParty
- inputAsset/inputQuantity
- targetAsset/targetAmountOrPolicy
- settlementPolicy
- costBearerPolicy
- gainEntitlementPolicy
- status: Open / InExecution / PartiallySettled / Settled / Cancelled
- outstandingObligation
- linkedTransactions[]
- linkedClaims/Liabilities[]
```

Possible policy examples:

```text
TargetPolicy:
- FixedTarget
- NetProceeds
- EquivalentValue

CostBearer:
- Principal/Sender
- User/Operator
- Shared

GainEntitlement:
- Principal/Sender
- User/Operator
- Shared
```

Names and exact schema remain Draft.

---

## 11. Free Liquidity implication

Physical possession/control does not equal unrestricted availability.

At the stage where the user has 50,000 TRY in the Turkish bank but still owes the sender settlement value, MyFinMan must distinguish:

```text
Physical bank balance = 50,000 TRY
Restricted/encumbered for open mandate ≈ 45,000 TRY
User free/economic surplus = 5,000 TRY
```

Likewise, when the user later holds 1,000 USD cash intended to settle the mandate, that cash should not inflate unrestricted Free Liquidity.

This is analogous to Portfolio-reserved cash in display behavior, but the restriction source is an **obligation**, not a Portfolio purpose.

---

## 12. Acceptance scenarios

### TEST-SCN006-01 — Receipt is not income
Receiving 1,000 USDT for the mandate increases Binance USDT but does not create user income or unrestricted Free Liquidity.

### TEST-SCN006-02 — Pure custody variant
If the instruction is to preserve/return the same USDT, ownership remains with Sender and no disposal is allowed without a separate authorized event.

### TEST-SCN006-03 — Conversion mandate variant
If the instruction authorizes disposal to produce USD cash, the chain is represented through Mandate + obligation, not forced permanent sender ownership of every intermediate Asset.

### TEST-SCN006-04 — Sender-borne costs
Under Net-Proceeds policy, conversion/withdrawal costs reduce the sender's delivered result and do not hit user P/L.

### TEST-SCN006-05 — Guaranteed payout
Under FixedTarget policy, any shortfall funded by User affects User wealth/P&L/contribution.

### TEST-SCN006-06 — Favorable USDT sale
Selling 1,000 USDT for 50,000 TRY when reference value is 45,000 TRY records 5,000 TRY execution spread if user is entitled to it.

### TEST-SCN006-07 — Bank balance not all free
While mandate remains open, physical 50,000 TRY balance does not all count as user Free Liquidity.

### TEST-SCN006-08 — USD cash acquisition
Spending 45,000 TRY to acquire 1,000 USD cash changes physical Assets/Accounts while mandate remains open.

### TEST-SCN006-09 — USD cash restricted before delivery
The acquired 1,000 USD cash is tied to outstanding mandate settlement and not unrestricted user cash.

### TEST-SCN006-10 — Final delivery
Handing 1,000 USD to beneficiary decreases USD cash and closes outstanding obligation.

### TEST-SCN006-11 — Profit survives settlement
After closing mandate, 5,000 TRY execution margin remains user-owned and available if no other encumbrance exists.

### TEST-SCN006-12 — No fake transfers
No artificial Binance→bank→cash transfer is recorded unless that physical movement actually occurred. Every real asset change is represented by the real conversion/payment leg.

---

## 13. Architectural conclusion

This scenario strongly suggests a unified engine centered on:

```text
Asset Position
+ Account/Holding
+ Owner/Controller
+ Obligation/Claim
+ Transaction Legs
+ Attribution Policy
+ optional Portfolio
+ optional Activity
```

Portfolio should not be overloaded to represent liabilities, entrusted settlement chains or operational pass-through value.

The clean rebuild should support explicit encumbrance/restriction sources so that both Portfolio allocations and open obligations can reduce unrestricted Free Liquidity without pretending that the physical Account balance changed.
