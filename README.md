# MyFinMan — Personal Finance Operating System

MyFinMan هو مدير مالي شخصي عربي RTL. المستودع الحالي يجمع بين **Prototype قابل للتجربة** و**Living Specification** للمخطط المستقبلي الذي سيُعاد بناء المنتج عليه عندما تنضج المعمارية.

## ابدأ من هنا لأي تطوير أو Vibe Coding

**المصدر المستقبلي للحقيقة هو:**

- `docs/spec/README.md` — فهرس وقواعد التوثيق.
- `docs/spec/VIBE_CODING_GUIDE.md` — تعليمات إلزامية لأي Coding Agent.
- `docs/spec/ux/screen-catalog.md` — الشاشات وما تعرضه.
- `docs/spec/ux/responsive-shell.md` — كيف تصبح نفس الواجهة Mobile/Tablet/Desktop.
- `docs/spec/domain/domain-model.md` — الكيانات والقواعد المستقلة عن الواجهة والتخزين.
- `docs/spec/data/database-model.md` — مسودة قاعدة البيانات المستهدفة لإعادة البناء النظيفة.
- `docs/spec/use-cases/action-contracts.md` — ماذا يفعل كل زر/عملية في الخلفية.
- `docs/spec/calculations/calculation-rules.md` — صيغ الحسابات المالية.
- `docs/spec/quality/traceability-and-acceptance.md` — ربط المتطلبات بالاختبارات.
- `docs/spec/decisions/decision-log.md` + ADRs — القرارات التي لا يجوز إعادة تفسيرها بصمت.
- `docs/spec/prototype/prototype-vs-target.md` — ما الذي نأخذه من النسخة الحالية وما الذي نرميه عند إعادة البناء.

> **لا تستنتج معمارية المنتج النهائي من الكود الحالي إذا تعارض مع `docs/spec/`.** الـPrototype موجود لإثبات النظرية واكتشاف السيناريوهات، وليس ليصبح قيدًا دائمًا على إعادة البناء.

## التشغيل على Windows

```bat
git pull origin main
run.bat
```

`run.bat` يثبت الحزم في أول تشغيل ثم يفتح Vite على `http://localhost:5173`.

## معمارية الـPrototype الحالية

```text
Presentation → Application → Domain → Repository → LocalStorage/API later
```

المراجع التنفيذية الحالية للـPrototype:

- `docs/architecture-v4.md`
- `docs/domain-rules.md`
- `docs/cash-model-note.md`
- `docs/implementation-status.md`

## ما تمثله النسخة الحالية

- Mobile-first prototype وRTL.
- **Cash أصل مستقل؛ Account/Container يحدد أين يوجد الأصل ولا يُحتسب أصلًا إضافيًا.**
- أرصدة البنوك والنقد الفعلي والعملات الأجنبية تمثل `cash` Holdings؛ العملة يحددها `symbol` مثل SAR/USD.
- تصنيف أعلى للأصول: النقد وما في حكمه، الاستثمارات، العقارات، وأصول أخرى.
- Real Accounts كأساس لمطابقة الواقع، مع `cash_container` للخزائن حتى لا تختلط مع أصل Cash.
- Owner منفصل عن Custodian وLocation.
- Unified Portfolio Tree بدل فصل «المخصصات» عن «المحافظ».
- Portfolio Slices بكميات Native داخل Holdings.
- Available من الحصص غير المخصصة فعليًا.
- أصول لدى الغير وملكية مشتركة بلا double counting.
- Valuation منفصل عن cash flow.
- Asset Conversion مع Cost Basis وRealized P/L فقط عند conversion/disposal.
- Repository abstraction بدل ربط React مباشرة بـ LocalStorage، مع Migration تلقائية من نموذج `currency` القديم إلى `cash`.
- نمذجة Transaction revisions وLiabilities/Claims كأساس للمراحل التالية.

> لا تعتبر Foundation V4 اكتمال Cycle 1. حالة كل use case والاختبارات المتبقية موثقة في `docs/implementation-status.md`. أما المخطط المستقبلي المتنامي فموثق في `docs/spec/`.