# MyFinMan — Personal Finance Operating System

MyFinMan هو مدير مالي شخصي عربي RTL. المستودع الحالي يجمع بين **Prototype قابل للتجربة** و**Living Specification** للمخطط المستقبلي الذي سيُعاد بناء المنتج عليه عندما تنضج المعمارية.

## ابدأ من هنا لأي تطوير أو Vibe Coding

**المصدر المستقبلي للحقيقة هو:**

- **`docs/spec/product/product-concept.md`** — الوثيقة المرجعية الشاملة للمنتج (المفاهيم، القواعد، السيناريوهات، الأمثلة، ما تم تجاوزه).
- `docs/spec/README.md` — فهرس وقواعد التوثيق.
- `docs/spec/VIBE_CODING_GUIDE.md` — تعليمات إلزامية لأي Coding Agent.
- `docs/spec/quality/invariant-gate.md` — بوابة الثوابت التي يجب أن يمر بها الكود.
- `docs/spec/decisions/decision-log.md` + ADRs — القرارات التي لا يجوز إعادة تفسيرها بصمت.
- `docs/spec/domain/domain-model.md` — الكيانات والقواعد المستقلة عن الواجهة والتخزين.
- `docs/spec/calculations/calculation-rules.md` — صيغ الحسابات المالية.
- `docs/spec/ux/screen-catalog.md` — الشاشات وما تعرضه.
- `docs/spec/ux/responsive-shell.md` — كيف تصبح نفس الواجهة Mobile/Tablet/Desktop.
- `docs/spec/data/database-model.md` — مسودة قاعدة البيانات المستهدفة لإعادة البناء النظيفة.
- `docs/spec/use-cases/action-contracts.md` — ماذا يفعل كل زر/عملية في الخلفية.
- `docs/spec/quality/traceability-and-acceptance.md` — ربط المتطلبات بالاختبارات.
- `docs/spec/prototype/prototype-vs-target.md` — ما الذي نأخذه من النسخة الحالية وما الذي نرميه عند إعادة البناء.
- `docs/implementation-status.md` — الحالة التنفيذية الحالية لكل عنصر معماري.

> **لا تستنتج معمارية المنتج النهائي من الكود الحالي إذا تعارض مع `docs/spec/`.** الـPrototype موجود لإثبات النظرية واكتشاف السيناريوهات، وليس ليصبح قيدًا دائمًا على إعادة البناء.

## التشغيل على Windows

```bat
git pull origin main
run.bat
```

`run.bat` يثبت الحزم في أول تشغيل ثم يفتح Vite على `http://localhost:5173`.

## معمارية الـPrototype الحالية

```text
Presentation → Application → Domain → Repository → LocalStorage / File-backed SQLite
```

معلومات التنفيذ الحالية وحالة كل مكوّن معماري: `docs/implementation-status.md`.

## ما تمثله النسخة الحالية باختصار

- Mobile-first prototype وRTL.
- **Cash أصل مستقل؛ الأصل النقدي يظهر للمستخدم كـ«حساب»**، والحاوية التنظيمية هي `Group` (ADR-004).
- Group → Asset هي الهرمية المستهدفة؛ طبقة Account القديمة مُلغاة رسميًا (DEC-021).
- Owner منفصل عن Custodian ومستفيد المصروف؛ الطرف هوية واحدة والأدوار مختلفة (RULE-027).
- Unified Portfolio Tree بدل فصل «المخصصات» عن «المحافظ»؛ المحفظة تجيب «لماذا» لا «أين».
- Portfolio Slices بكميات Native داخل Assets.
- Available من الحصص غير المخصصة فعليًا (CALC-008).
- أصول لدى الغير وملكية مشتركة بلا double counting.
- Valuation منفصل عن cash flow.
- Realized P/L فقط عند تصرف/بيع/تحويل حقيقي — بما فيه الصرف بين العملات لأن العملة الأساس تعيد التكلفة للسعر الحالي (ADR-009).
- Repository abstraction: LocalStorage للنموذج الأولي، وSQLite ملفي عبر خادم Node محلي (ADR-007).
- Transaction Revisions وLiabilities/Claims موجودة في النموذج؛ التنفيذ الكامل موثّق تدريجيًا في `implementation-status.md`.

> لا تعتبر أي حالة اكتمالًا لـCycle 1. حالة كل use case والاختبارات المتبقية موثقة في `docs/implementation-status.md`. أما المخطط المستقبلي المتنامي فموثق في `docs/spec/`.
