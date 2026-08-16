# MyFinMan — Domain Invariants V4 (Repository Copy)

هذا الملخص هو المرجع التنفيذي داخل المستودع. عند التعارض: أحدث تعليمات مباشرة للمستخدم ثم Domain Invariants V4 ثم Project Reference V4 ثم Foundation Brief V4 ثم الكود.

## Core reality
- الحساب/الحافظ = أين توجد القيمة.
- الأصل/Holding = ماذا وكم.
- المالك الاقتصادي = لمن.
- Portfolio = لأي غرض/وعاء.
- المتوقع والمسودة والخطة لا تغير الواقع المالي.
- Opening صريح ولا يخترع حركة تاريخية.

## Accounts and custody
- الحسابات تماثل الواقع وتملك Stable IDs وحالة active/closed/archived.
- Debit وسيلة وصول، Prepaid وعاء إن حمل رصيدًا، Credit Card التزام.
- Custodian مستقل عن Geographic Location.
- إغلاق الحساب/البطاقة لا يحذف التاريخ.

## Assets, ownership and portfolios
- Asset Class لا يساوي Portfolio.
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
