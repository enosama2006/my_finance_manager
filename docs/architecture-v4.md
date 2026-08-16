# MyFinMan — Architecture V4

هذا الملف يثبت المعمارية التنفيذية الحالية المستخلصة من Project Reference V4 وDomain Invariants V4 وتعليمات المستخدم الأحدث.

## المبدأ المركزي

**المال حقيقة واحدة وله عدة خرائط.** لا ننشئ نسخًا مستقلة من القيمة لأننا نريد رؤيتها حسب المالك أو المحفظة أو الأصل أو الحساب.

الأبعاد المستقلة هي: Owner، Beneficiary، Portfolio، Asset/Holding، Account/Custodian، Location، Native Quantity، Cost Basis، Current Valuation، Liquidity/Availability/Clearing. لا يجوز دمج Owner أو Portfolio أو Asset Type أو Custody في شجرة واحدة أو حقل واحد.

## طبقات التطبيق

```text
Presentation (React mobile-first)
        ↓
Application (use cases / orchestration)
        ↓
Domain (entities, invariants, calculations)
        ↓
Repository abstraction
        ↓
LocalStorage now / API or DB later
```

React لا يملك قواعد مالية. التخزين الحالي LocalStorage مجرد Adapter ويمكن استبداله دون تغيير Domain.

## النموذج الحالي Foundation V4

- `Party`: شخص/مالك/بنك/وسيط/جهة.
- `Account`: النسخة الرقمية من الحساب أو مكان الحفظ الحقيقي، مع Stable ID وحالة وأرصدة مطابقة.
- `Holding`: أصل + كمية أصلية داخل Account/Custodian.
- `OwnershipShare`: حصص الملكية الاقتصادية داخل Holding.
- `CostBasisLot`: كمية وتكلفة اقتناء مرتبطة بمالك محدد داخل Holding؛ السياسة الحالية `weighted_average` لكل مالك على حدة.
- `Portfolio`: المحفظة والمخصص كيان واحد شجري.
- `PortfolioSlice`: كمية أصلية من Holding منسوبة إلى Owner + Leaf Portfolio.
- `LedgerTransaction`: Logical Transaction واحدة مع version/revisions كأساس لتصحيح الإدخال دون صف مالي ثانٍ.
- `Liability`: التزام خارجي مثل Credit Card.
- `Claim`: حق/مطالبة على طرف آخر؛ منفصل عن أصل عيني محفوظ لدى الغير.
- `IncomeStream`: توقع فقط حتى Posting فعلي.

## العرض على الهاتف

التنقل الرئيسي يبقى بخمس وجهات: الرئيسية، المحافظ، الأصول والحسابات، الحركات، تحويل الأصول. داخل «الأصول والحسابات» توجد Lenses مستقلة: المالك → نوع الأصل → الحساب/الحافظ. هذا يحقق تعليمات المستخدم الأحدث بجمع الدخول في شاشة واحدة مع إبقاء المفاهيم منفصلة وظيفيًا.

## قواعد Foundation غير القابلة للكسر

- Available يُحسب من Portfolio Slices غير المخصصة لكل Holding/Owner، وليس Net Worth ناقص أهداف المحافظ.
- مجموع Ownership Shares = Physical Native Quantity للـHolding.
- مجموع CostBasisLots لكل Owner/Holding يغطي كمية ملكيته؛ التكلفة قد تكون مجهولة لكن الكمية لا تضيع.
- Weighted-average disposal يخفض Lots الخاصة بالمالك تناسبيًا كي لا يتحول النظام ضمنيًا إلى FIFO.
- مجموع Portfolio Slices لكل Owner/Holding لا يتجاوز ملكيته.
- Portfolio parent يجمع الأبناء دون مضاعفة؛ الحصص الفعلية توضع في الأوراق.
- Custody لا تنقل Ownership، وClaim يختلف عن أصل محفوظ لدى الغير.
- التقييم يغير Current Value فقط ولا ينشئ Ledger/Income.
- Conversion/Disposal الحقيقي فقط يمكن أن ينشئ Realized P/L.
- Conversion لا يسحب كمية محمية في Portfolio بصمت؛ يجب تحديد الحصة/المحفظة.
- عند تحويل أصل داخل محفظة، ينتقل الغرض الاقتصادي إلى الأصل الناتج افتراضيًا ما لم يختَر المستخدم غير ذلك.
- Credit Card Liability ليست أصلًا، وسدادها لا ينشئ Expense ثانية.
- Expected Income لا يغير أي Holding قبل Posting.
- Correction ≠ Refund/Reversal/Transfer. التصحيح يعدّل نفس Logical Transaction مع Audit Revision؛ الحدث الحقيقي اللاحق Transaction جديدة.

## ما لم يكتمل بعد

Foundation V4 يثبت شكل الكيانات والقواعد الآن، لكن بعض use cases ما زالت تحتاج تنفيذًا كاملًا قبل إعلان Cycle 1 مكتملة: Real Transfer، Purchase/Sale، Credit-card purchase/payment، Settlement/Clearing، Transaction correction مع إعادة إسقاط كل الآثار Atomic، Reconciliation، AI Intake، وCategories. راجع `implementation-status.md`.
