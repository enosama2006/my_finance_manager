# MyFinMan — Personal Finance Operating System

MyFinMan هو مدير مالي شخصي عربي RTL مبني Mobile-first. المستودع يعمل حاليًا كـ **Foundation V4**: حقيقة مالية واحدة مع خرائط مستقلة للمالك، المحفظة، الأصل، الحساب/الحافظ، الكمية، التكلفة والتقييم.

## التشغيل على Windows

```bat
git pull origin main
run.bat
```

`run.bat` يثبت الحزم في أول تشغيل ثم يفتح Vite على `http://localhost:5173`.

## المعمارية

```text
Presentation → Application → Domain → Repository → LocalStorage/API later
```

ابدأ من:

- `docs/architecture-v4.md`
- `docs/domain-rules.md`
- `docs/implementation-status.md`

## ما تمثله النسخة الحالية

- Mobile app shell وRTL.
- Real Accounts كأساس لمطابقة الواقع.
- Owner منفصل عن Custodian وLocation.
- Unified Portfolio Tree بدل فصل «المخصصات» عن «المحافظ».
- Portfolio Slices بكميات Native داخل Holdings.
- Available من الحصص غير المخصصة فعليًا.
- أصول لدى الغير وملكية مشتركة بلا double counting.
- Valuation منفصل عن cash flow.
- Asset Conversion مع Cost Basis وRealized P/L فقط عند conversion/disposal.
- Repository abstraction بدل ربط React مباشرة بـ LocalStorage.
- نمذجة Transaction revisions وLiabilities/Claims كأساس للمراحل التالية.

> لا تعتبر Foundation V4 اكتمال Cycle 1. حالة كل use case والاختبارات المتبقية موثقة في `docs/implementation-status.md`.
