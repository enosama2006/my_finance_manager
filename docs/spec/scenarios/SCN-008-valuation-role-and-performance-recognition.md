# SCN-008 — Valuation Role and Performance Recognition

Status: **Approved scenario facts / Draft valuation-performance architecture**

## Purpose

Pressure-test one unified asset engine where every acquisition retains cost, but not every held Asset is presented as an investment with live unrealized P/L.

The scenario distinguishes:

- acquisition cost tracking;
- current valuation;
- realized versus unrealized P/L;
- transaction/settlement currencies versus investment assets;
- bridge assets used only to acquire another asset;
- volatile currencies intentionally held for appreciation;
- quote-direction correctness for FX pairs.

## 1. Core conclusion

**Cost Basis is tracked whenever an Asset is acquired. Performance recognition is a separate policy.**

Therefore:

```text
Cost tracking: always when economically relevant
Market valuation: according to valuation policy
Unrealized P/L display: according to performance role
Realized P/L: when a qualifying disposal/conversion closes economic exposure
```

The same Asset master can be used under different roles in different positions. USD can be transactional liquidity in one context and an investment/speculative currency in another. Therefore the policy must not be hard-coded globally on Asset=USD.

## 2. Scenario A — SAR -> USD held as transactional/available cash

Example:

```text
Buy 10,000 USD
Actual SAR outflow = 37,650 SAR
Effective acquisition rate = 3.765 SAR/USD
```

The USD is held as available foreign-currency cash, not as an investment whose daily performance the user wants to monitor.

Target behavior:

- retain actual acquisition basis internally: 37,650 SAR;
- retain native quantity: 10,000 USD;
- valuation/reporting may use a configured/reference/liquidation FX rate;
- suppress routine unrealized investment P/L presentation for this position;
- do not rewrite actual cost basis merely to make the position show zero P/L.

Later, if all 10,000 USD are converted back to SAR and proceeds are 37,400 SAR:

```text
Realized result = 37,400 - 37,650 = -250 SAR
```

The -250 SAR is recognized when the exposure is closed because the user chose a realization-only performance policy for this position.

Important: if UI chooses to display a 3.75 reference anchor, it must still preserve the real 3.765 acquisition basis in the ledger; otherwise the later -250 realized result cannot be reconstructed correctly.

## 3. Scenario B — SAR -> USD -> Land

If USD is acquired specifically as a bridge to buy land, the chain is:

```text
SAR actual outlay
  -> USD bridge Asset
  -> Land
```

The system records every intermediate transaction but can roll the attributable cost forward into the final Land Cost Basis.

The USD bridge need not become a standalone investment-performance position if it is immediately or intentionally consumed in the acquisition chain.

This confirms SCN-007 AcquisitionChain / CostFlow.

## 4. Scenario C — Gold held as investment/value asset

Example:

```text
Market price around acquisition = 530 SAR/g
Actual all-in acquisition cost = 540 SAR/g
```

For a Gold position configured as an investment/value asset:

```text
Cost Basis per gram = 540 SAR
Current Market Value per gram = live/current valuation
Unrealized P/L = Current Value - Cost Basis
```

Unlike transactional USD, the user explicitly wants continuous performance visibility.

## 5. Scenario D — XRP held as investment

If 1,000 USD outlay ultimately acquires 985 XRP after an intermediary USDT/on-ramp path, the final XRP position inherits the full attributable cost under SCN-007.

For an investment role, live market valuation produces unrealized P/L until sale/disposal.

## 6. Scenario E — volatile foreign currency held as investment

A currency can itself be an investment position.

Example quote convention:

```text
1 USD = 125 SYP
```

If later:

```text
1 USD = 128 SYP
```

then SYP has weakened against USD, because more SYP are required to buy one USD. A holder of SYP loses value in USD terms, all else equal.

Approximate USD-value change of the SYP position:

```text
125 / 128 - 1 = -2.34375%
```

If instead the quote moves from 125 to 122 SYP/USD, SYP strengthens and a holder gains in USD terms.

The engine must therefore store:

- base Asset;
- quote Asset;
- quote convention;
- transaction rate;
- valuation rate;

and never infer P/L from a naked number without knowing quote direction.

## 7. Draft position roles

A single Owner+Asset position (or a scoped sub-position/lot) may declare a performance role.

Candidate roles:

### `TransactionalCash`
Purpose: payment, reserve, settlement, ordinary multi-currency liquidity.

Behavior:
- track cost basis/history;
- maintain native quantity;
- translate for net-worth/reporting as needed;
- default to realized-only FX P/L presentation;
- suppress noisy unrealized investment P/L unless user enables it.

### `BridgeAsset`
Purpose: temporary intermediate Asset used to acquire another Asset.

Behavior:
- preserve every ledger movement;
- propagate attributable cost through AcquisitionChain;
- avoid treating a short-lived bridge position as a separate investment performance story unless material or retained independently.

### `InvestmentAsset`
Purpose: held for appreciation/income/return measurement.

Behavior:
- track cost basis;
- mark to current valuation;
- show unrealized and realized P/L;
- calculate return metrics according to product policy.

### `StoreOfValue`
Possible specialization where user wants market revaluation but not necessarily trading analytics. Gold may commonly use this behavior.

Status of role names: **Draft**.

## 8. Important separation — Valuation is not Recognition

The system may know a current market/liquidation value without presenting the difference as investment P/L.

Example transactional USD:

```text
Native quantity = 10,000 USD
Actual cost = 37,650 SAR
Current liquidation value = 37,400 SAR
```

The engine can know all three facts while UI policy says:

```text
Investment P/L: not shown while held
Potential liquidation gap: optionally shown
Realized P/L: shown on disposal
```

This prevents two bad extremes:

1. losing cost history by forcing USD cost to a fixed 3.75; or
2. cluttering ordinary foreign-currency cash with daily investment P/L the user does not care about.

## 9. Policy must be position-scoped, not Asset-global

The same user may simultaneously have:

```text
USD 10,000 — TransactionalCash
USD 20,000 — Investment/FX thesis
USD 5,000 — BridgeAsset for Syria property acquisition
```

All are Asset=USD but have different performance behavior.

Therefore role/policy belongs at a Position/Lot/Portfolio-purpose scope chosen by target architecture, not on the normalized Asset master alone.

## 10. Realized-result rule

For realization-only positions:

```text
Realized P/L
= net disposal proceeds in reporting/base currency
- disposed historical cost basis
```

subject to the approved cost-basis method and attributable-cost policy.

For mark-to-market positions:

```text
Unrealized P/L
= current valuation
- remaining cost basis
```

and realized P/L is recognized on qualifying disposal without double-counting previously displayed unrealized change.

## 11. UX implications

When creating or receiving an Asset position, MyFinMan should avoid accounting jargon and ask intent when needed:

```text
كيف ستتعامل مع هذا الأصل؟
○ سيولة/استخدام عادي
○ مرحلة مؤقتة لشراء أصل آخر
○ استثمار أريد متابعة ربحي وخسارتي فيه
○ حفظ قيمة
```

Smart defaults can depend on context but must remain changeable without rewriting history.

Position detail can show:

```text
10,000 USD
الدور: سيولة بعملة أجنبية
تكلفة الاقتناء: 37,650 SAR
القيمة المرجعية الحالية: 37,400 SAR
الربح/الخسارة الاستثمارية: غير مفعّلة
[إظهار فجوة التسييل]
```

Gold/XRP/SYP-investment position can instead show live unrealized P/L prominently.

## 12. Acceptance scenarios

- Cost basis remains 37,650 SAR for 10,000 USD acquired at 3.765 even when unrealized P/L is hidden.
- Selling the full USD position for 37,400 SAR realizes -250 SAR.
- Changing the USD position from TransactionalCash to Investment changes presentation/forward behavior, not historical transaction facts.
- Bridge USD consumed into Land transfers attributable cost through AcquisitionChain without fake income/expense.
- Gold bought all-in at 540/g shows P/L against current market valuation.
- XRP inherits complete acquisition-chain cost and shows market P/L.
- SYP/USD quote direction is stored and 125 -> 128 SYP/USD is interpreted as SYP weakening, not strengthening.
- Same Asset USD can exist simultaneously under multiple roles without merging their cost/performance semantics incorrectly.

## 13. Architecture impact

This scenario confirms that MyFinMan needs separate concepts for:

```text
Asset identity
Position/Holding
Cost Basis
Valuation Policy
Performance Recognition Policy
AcquisitionChain / CostFlow
Portfolio/Purpose
```

One unified transaction engine can support all asset classes; the difference is policy and context, not separate accounting engines per Gold/Crypto/FX/Property.
