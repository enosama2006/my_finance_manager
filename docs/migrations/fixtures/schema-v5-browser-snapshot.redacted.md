---
myfinmanFormat: myfinman-migration-snapshot
formatVersion: 1
exportedAt: 2026-08-18T14:10:05.636Z
schemaVersion: 5
storageEngine: legacy-localStorage
privacy: redacted-regression-fixture
---

# MyFinMan Schema V5 Browser Snapshot — Redacted Regression Fixture

> هذه نسخة مموّهة تحافظ على شكل البيانات الواقعي الذي كان موجودًا في المتصفح عند اكتشاف مشكلة v5 loader. لا تحتوي الأرصدة أو الأسماء أو أرقام الحسابات الحقيقية.

## Machine-readable snapshot

```json
{
  "format": "myfinman-snapshot",
  "version": 1,
  "exportedAt": "2026-08-18T14:10:05.636Z",
  "schemaVersion": 5,
  "state": {
    "schemaVersion": 5,
    "costBasisMethod": "weighted_average",
    "parties": [
      { "id": "party-self", "name": "أنا", "type": "self" },
      { "id": "party-bank-a", "name": "مصرف تجريبي", "type": "bank" },
      { "id": "party-relative", "name": "قريب", "type": "person" }
    ],
    "accountGroups": [
      { "id": "group-banks", "name": "البنوك", "status": "active", "createdAt": "2026-08-17T12:00:00.000Z" },
      { "id": "group-bank-a", "name": "مصرف تجريبي", "parentId": "group-banks", "status": "active", "createdAt": "2026-08-17T12:00:00.000Z" },
      { "id": "group-invest", "name": "الاستثمارات", "status": "active", "createdAt": "2026-08-18T12:00:00.000Z" }
    ],
    "accounts": [
      { "id": "acc-sar", "name": "الحساب الجاري", "kind": "checking", "custodianId": "party-self", "currency": "SAR", "last4": "0001", "status": "active", "groupId": "group-bank-a" },
      { "id": "acc-usd", "name": "الحساب بالدولار", "kind": "checking", "custodianId": "party-self", "currency": "USD", "last4": "0002", "status": "active", "groupId": "group-bank-a" }
    ],
    "holdings": [
      {
        "id": "holding-sar",
        "symbol": "SAR",
        "name": "الحساب الجاري",
        "kind": "cash",
        "nativeUnit": "ر.س",
        "quantity": 12000,
        "marketPriceSar": 1,
        "costLots": [{ "id": "lot-sar-opening", "ownerId": "party-self", "quantity": 12000, "unitCostSar": 1, "acquiredAt": "2026-08-17T12:10:00.000Z" }],
        "valuationMethod": "nominal",
        "valuationSource": "user-entry",
        "valuedAt": "2026-08-17T12:10:00.000Z",
        "accountId": "acc-sar",
        "custodianId": "party-self",
        "ownership": [{ "ownerId": "party-self", "quantity": 12000 }],
        "performanceRole": "transactional_cash",
        "currency": "SAR",
        "groupId": "group-bank-a",
        "accountKind": "checking",
        "last4": "0001",
        "institutionName": "مصرف تجريبي"
      },
      {
        "id": "holding-fund",
        "symbol": "FUND-A",
        "name": "صندوق استثماري تجريبي",
        "kind": "fund",
        "assetTypeId": "fund",
        "nativeUnit": "وحدة",
        "quantity": 5048.055,
        "marketPriceSar": 9.9,
        "costLots": [{ "id": "lot-fund-1", "ownerId": "party-self", "quantity": 5048.055, "unitCostSar": 9.9, "acquiredAt": "2026-08-18T13:53:17.155Z" }],
        "valuationMethod": "cost_fallback",
        "valuationSource": "acquisition-cost-fallback",
        "valuedAt": "2026-08-18T13:53:17.155Z",
        "groupId": "group-invest",
        "ownership": [{ "ownerId": "party-self", "quantity": 5048.055 }],
        "performanceRole": "investment",
        "positionId": "position-fund"
      }
    ],
    "portfolios": [{ "id": "portfolio-self", "name": "محفظة شخصية", "ownerIds": ["party-self"], "purpose": "استثمار", "status": "active", "profile": "investment", "protectionMode": "flexible" }],
    "portfolioSlices": [],
    "expenseCategories": [{ "id": "cat-personal", "name": "مصروف شخصي", "status": "active", "createdAt": "2026-08-17T18:07:51.813Z" }],
    "expenseBeneficiaries": [{ "id": "beneficiary-self", "name": "أنا", "kind": "person", "status": "active", "createdAt": "2026-08-17T19:10:06.081Z" }],
    "ledger": [
      { "id": "tx-opening-sar", "version": 1, "status": "posted", "revisions": [], "at": "2026-08-17T12:10:00.000Z", "kind": "opening", "title": "رصيد افتتاحي", "amountSar": 12000, "ownerId": "party-self", "targetHoldingId": "holding-sar", "targetQuantity": 12000 },
      { "id": "tx-purchase-fund", "version": 1, "status": "posted", "revisions": [], "at": "2026-08-18T13:53:17.155Z", "kind": "asset_purchase", "title": "شراء صندوق استثماري تجريبي", "amountSar": 50000, "ownerId": "party-self", "sourceHoldingId": "holding-sar", "targetHoldingId": "holding-fund", "sourceQuantity": 50000, "targetQuantity": 5048.055, "positionId": "position-fund" }
    ],
    "incomeStreams": [],
    "liabilities": [],
    "claims": [],
    "positions": [{ "id": "position-fund", "name": "صندوق استثماري تجريبي", "ownerId": "party-self", "holdingIds": ["holding-fund"], "openedAt": "2026-08-18T13:53:17.155Z", "status": "open", "performanceRole": "investment", "initialCostBasisSar": 50000, "realizedGainLossSar": 0 }],
    "capitalCycles": []
  }
}
```
