# MyFinMan — Domain Invariants V4 (Repository Copy)

هذا الملخص هو المرجع التنفيذي داخل المستودع. عند التعارض: أحدث تعليمات مباشرة للمستخدم ثم Domain Invariants V4 ثم Project Reference V4 ثم Foundation Brief V4 ثم الكود.

## Core reality
- الحساب/الحافظ = أين توجد القيمة.
- الأصل/Holding = ماذا وكم.
- المالك الاقتصادي = لمن.
- Portfolio = لأي غرض/وعاء.
- المتوقع والمسودة والخطة لا تغير الواقع المالي.
- Opening صريح ولا يخترع حركة تاريخية.

## Cash is an asset; Account is a container
- `Cash` أصل مالي عالي السيولة، وليس اسمًا للحساب.
- حساب بنكي جاري/توفير هو `Account/Container`؛ الرصيد داخله `Holding(kind=cash)`.
- خزنة المنزل هي `Account(kind=cash_container)`؛ النقد الموجود فيها Holding مستقل.
- العملة تحددها `symbol/nativeUnit` مثل `SAR` و`USD`، وليس `AssetKind=currency` منفصلًا.
- أرصدة SAR البنكية، SAR النقدية الفعلية، وUSD النقدية كلها Holdings من نوع `cash` ويمكن أن توجد في Containers مختلفة.
- لا يدخل Account نفسه في Net Worth فوق قيمة Holdings داخله؛ الحساب ليس أصلًا ثانيًا.
- نقل نفس النقد بين حسابين = `Real Transfer` ولا ينشئ Realized P/L.
- `USD → SAR` = Conversion بين أصلين نقديين مختلفي العملة ويمكن أن ينشئ Realized P/L حسب Cost Basis.

## Asset taxonomy
- `cash` → Cash & Cash Equivalents.
- `fund / stock / metal / crypto / fixed_term` → Investments.
- `real_estate` → Real Estate.
- `collectible / receivable / other` → Other Assets.
- Asset Class لا يساوي Portfolio.

## Accounts and custody
- الحسابات تماثل الواقع وتملك Stable IDs وحالة active/closed/archived.
- Debit وسيلة وصول، Prepaid وعاء إن حمل رصيدًا، Credit Card التزام.
- Custodian مستقل عن Geographic Location.
- إغلاق الحساب/البطاقة لا يحذف التاريخ.

## Assets, ownership and portfolios
- Portfolio والمخصص كيان واحد شجري.
- Portfolio قد تمتد عبر عدة Accounts/Assets والعكس.
- Available = حصة Holding غير المقيدة بمحفظة.
- أموال مالك آخر لا تستخدم ضمنيًا.
- نقل القيمة بين ملاك يحتاج Gift/Loan/Debt/Ownership event صريحًا.
- Custody لا تعني Ownership؛ Claim لا يساوي Physical Asset held by another party.

## Quantities and valuation
- Physical Native Quantity لا تتغير بتغير السعر.
- مجموع Ownership Shares يساوي كمية Holding.
- Portfolio Slices لا تتجاوز ملكية Owner في Holding.
- Current Value يظهر معه valuation method/source/time.
- Cash بالعملة المرجعية يستخدم nominal valuation؛ Cash بعملة أجنبية يستخدم FX valuation.
- Market/FX/manual valuation لا ينشئ Transaction أو Income.
- Unknown cost يدخل في Current Wealth ويُستبعد من return-on-cost.

## Cost and P/L
- Unrealized P/L منفصل عن Realized P/L.
- Realized P/L ينشأ عند Conversion/Disposal الحقيقي فقط.
- بيع الأصل يحول الأصل إلى نقد؛ كامل الحصيلة ليست Income.
- Conversion يحدد source quantity، target quantity، execution value/rate، fees، owner، source/target portfolio/account.
- لا يجوز استهلاك Portfolio-protected quantity دون اختيار صريح.

## Transactions and revisions
- Logical Transaction الظاهرة للمستخدم تمثل حقيقة واحدة.
- Correction لخطأ الإدخال يجب أن يبقي نفس Transaction ID ويضيف Revision/Audit داخليًا، ثم يعيد حساب الآثار Atomic بعد Preview.
- Refund/Reversal/Transfer حدث في الواقع = Transaction جديدة مرتبطة بالأصل.
- Unknown mismatch = Reconciliation Adjustment، لا اختراع تاجر/فئة.

## Settlement and cards
- Payment Source قد يختلف عن Portfolio Funding Source.
- التغطية المباشرة تحتاج تطابق Native Asset.
- نقص تمويل Portfolio لا يرفض Expense؛ ينشئ Clearing/Funding Gap.
- Credit-card purchase = Expense + Liability.
- Card payment يقلل cash + liability ولا ينشئ Expense ثانية.

## AI
- AI يقترح Drafts فقط؛ deterministic rules تتحقق والمستخدم يعتمد.
- Duplicate Detection يسبق posting.
- AI لا يخترع حسابًا أو ملكية أو تحويلًا أو مصدر دفع.
