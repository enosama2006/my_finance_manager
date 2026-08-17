# MyFinMan — Cash and Account Model

## القرار

**Cash هو أصل. Account/Container ليس أصلًا بحد ذاته؛ هو المكان أو الوعاء الذي يوجد فيه الأصل.**

أمثلة:

- `جاري الراجحي` = `Account` من نوع `checking`.
- `10,000 SAR` داخله = `Holding` من نوع `cash` ورمزه `SAR`.
- `خزنة المنزل` = `Account/Container` من نوع `cash_container`.
- `5,000 SAR` داخلها = `Holding` من نوع `cash`.
- `1,000 USD` داخلها = Holding نقدي آخر من النوع نفسه `cash` لكن برمز `USD` وتقييم `fx`.

لذلك لا يوجد AssetKind مستقل اسمه `currency`. العملة تحددها `symbol/nativeUnit`، بينما طبيعة الأصل هي `cash`.

## التصنيف الأعلى للأصول

التصنيف مشتق من نوع الأصل ولا يكرر القيمة:

```text
Assets
├─ Cash & Cash Equivalents
│  └─ Cash Holdings: SAR / USD / ... داخل حسابات أو خزائن مختلفة
├─ Investments
│  ├─ Funds
│  ├─ Stocks
│  ├─ Metals (Gold / Silver)
│  ├─ Crypto
│  └─ Fixed-term investments
├─ Real Estate
└─ Other Assets
   ├─ Collectibles
   ├─ Receivables / Claims
   └─ Other
```

## قواعد لا تكسر

- نقل نفس Cash Holding بين حسابين هو `Real Transfer` وليس بيعًا ولا Conversion ولا يخلق Realized P/L.
- تحويل `USD → SAR` هو Conversion بين أصلين نقديين مختلفي العملة، ولذلك يمكن أن ينشئ Realized P/L وفق Cost Basis.
- الرصيد البنكي لا يُحسب مرتين: الحساب ليس Asset زائد الرصيد؛ الرصيد Holding داخل الحساب.
- الحساب يجيب: **أين؟**
- Holding يجيب: **ماذا وكم؟**
- Owner يجيب: **لمن؟**
- Portfolio يجيب: **لأي غرض؟**
