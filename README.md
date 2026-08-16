# MyFinMan — Personal Finance Manager

نسخة Cycle 1 تفاعلية RTL مبنية بـ React + TypeScript + Vite، ومصممة كأول Presentation Client فوق قواعد Domain مستقلة.

## تشغيل سريع على Windows

1. ثبّت Node.js LTS.
2. نزّل/استنسخ المستودع.
3. شغّل `run.bat` بالنقر المزدوج.
4. يفتح التطبيق على `http://localhost:5173`.

أو يدويًا:

```bash
npm install
npm run dev
```

## الاختبارات والبناء

```bash
npm test
npm run build
```

## ما الذي يوضحه هذا الـCycle؟

- Dashboard لصافي الثروة والمتاح والمخصص والربح المحقق.
- عرض الأصول بعدة Lenses: حسب المالك، الحائز، ونوع الأصل.
- فصل Ownership عن Custody وLocation وAllocation.
- سيناريو أصل مملوك لك ومحفوظ لدى طرف آخر.
- ملكية مشتركة عبر Ownership Shares.
- مخصصات منطقية لا تحرك الأموال الحقيقية.
- Immutable Ledger.
- Asset Conversion مع كمية خروج/دخول، سعر تنفيذ، رسوم، Cost Basis وRealized P/L.
- حفظ محلي في `localStorage` للنسخة التجريبية.

> هذه النسخة لا تتصل بحسابات مصرفية حقيقية ولا ترسل بيانات إلى خادم خارجي.

راجع `docs/domain-rules.md` للقواعد التي لا يجوز للواجهة كسرها.
