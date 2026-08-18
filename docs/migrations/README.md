# MyFinMan — Migration & Persistence Contract

## لماذا هذا الملف موجود؟

بيانات المستخدم أهم من شكل الـUI ومن رقم إصدار الـschema. أي تغيير معماري أو مالي لا يجوز أن يجعل البيانات السابقة غير مرئية أو غير قابلة للاسترجاع.

تم إنشاء هذا العقد بعد اكتشاف أن نسخة التطبيق كانت تحفظ `schemaVersion: 5` بينما loader الخاص بـLocalStorage يقبل v4 فقط؛ النتيجة كانت أن البيانات موجودة فعليًا في المتصفح لكن التطبيق يتعامل معها كأنها غير موجودة.

## مصدر الحقيقة التشغيلي — File-backed SQLite

اعتبارًا من Issue #52، القرار السابق في PR #51 باستخدام SQLite/WASM داخل IndexedDB **Superseded** كمصدر تشغيل.

المعمارية الحالية:

```text
Browser UI
   ↓ HTTP /api
MyFinMan local server
   ↓
data/myfinman.sqlite
```

القواعد:

1. **`data/myfinman.sqlite` هو ملف SQLite الحقيقي ومصدر الحقيقة التشغيلي بعد الترحيل.**
2. المتصفح لا يملك SQLite تشغيلية ولا يخزن ملف قاعدة البيانات داخل IndexedDB.
3. الخادم المحلي وحده يفتح ملف SQLite ويكتب إليه.
4. `FinanceState` الكامل يبقى في هذه المرحلة JSON canonical داخل جدول `app_state` حتى نصمم relational financial schema مستقلًا عن الـDomain بدل تفكيكه على عجل.
5. `migration_journal` يسجل عمليات الترحيل الصريحة.
6. `export_checkpoints` يسجل نقاط التصدير من النسخة التشغيلية.
7. ملفات `data/*.sqlite*` محلية وخاصة ومضافة إلى `.gitignore`؛ **لا ترفع قاعدة المستخدم الحقيقية إلى GitHub**.
8. LocalStorage القديم هو مصدر Migration/Recovery مؤقت فقط، وليس قاعدة التشغيل بعد اكتمال الترحيل.

## تشغيل المنصة محليًا

يتطلب مسار SQLite الملفية Node.js `>= 22.13.0` لأن الخادم يستخدم `node:sqlite` المدمج في Node.

```bash
npm install
npm run dev
```

`npm run dev` يشغل معًا:

- MyFinMan API على `127.0.0.1:8787`.
- Vite Web UI على `5173`.
- Vite يمرر `/api` إلى الخادم المحلي.

يمكن تشغيلهما منفصلين عند الحاجة:

```bash
npm run dev:api
npm run dev:web
```

## ترحيل LocalStorage → SQLite

الترحيل **صريح بواسطة المستخدم** ولا يحدث تلقائيًا عندما توجد بيانات قديمة.

عند بدء التطبيق:

### 1. قاعدة SQLite تحتوي state
يقرأ التطبيق من `data/myfinman.sqlite` مباشرة وتصبح هي مصدر الحقيقة.

### 2. قاعدة SQLite فارغة + LocalStorage يحتوي v4/v5 صالحًا
- يعرض التطبيق بيانات LocalStorage مؤقتًا.
- يظهر زر مؤقت **«ترحيل إلى SQLite»**.
- لا يكتب إلى قاعدة SQLite حتى يؤكد المستخدم الترحيل.
- عند التأكيد ترسل النسخة الحالية إلى `/api/storage/migrate`.
- الخادم يرفض الترحيل إذا أصبحت القاعدة غير فارغة، لمنع overwrite غير المقصود.
- يسجل `migration_journal` مصدر الترحيل.
- **لا تُحذف LocalStorage القديمة أثناء الترحيل** حتى يبقى rollback ممكنًا.
- بعد النجاح يتحول runtime إلى `server_sqlite` وتذهب الحركات التالية إلى ملف SQLite.

### 3. قاعدة SQLite فارغة ولا توجد بيانات قديمة
يهيئ التطبيق حالة فارغة مباشرة في SQLite ويستخدمها من البداية.

### 4. الخادم غير متاح
يمكن للتطبيق قراءة/حفظ LocalStorage كـRecovery Mode فقط، ويجب تشغيل MyFinMan عبر `npm run dev` قبل محاولة الترحيل.

## Browser SQLite القديمة

نسخة PR #51 كانت قد أنشأت قاعدة `sql.js` داخل IndexedDB. الكود التشغيلي لم يعد يقرأ أو يكتب هذه القاعدة، وتمت إزالة `sql.js` من dependencies وإزالة `src/data/sqliteRepository.ts`.

لا نمسح IndexedDB القديمة تلقائيًا أثناء الانتقال لأنها قد تكون نسخة Recovery لمستخدم جرب الإصدار السابق. يمكن إضافة تنظيف اختياري بعد التحقق الواقعي من الترحيل.

## Migration Snapshot بصيغة Markdown

كل Export من الواجهة ينتج ملفًا مثل:

`myfinman-migration-2026-08-18T16-30-00.md`

ويحتوي:

1. Manifest نصي أعلى الملف يحدد format/schema/storage engine.
2. شرح بشري قصير.
3. كتلة واحدة تحت `## Machine-readable snapshot` تحتوي JSON كاملًا lossless من صيغة `myfinman-snapshot`.

الـMarkdown هو **الغلاف/وسيط الترحيل**؛ JSON داخل fenced block هو payload الآلي الدقيق.

إذا كانت قاعدة SQLite التشغيلية فعالة، يسجل Export أيضًا checkpoint داخل `export_checkpoints` بنفس وقت التصدير، حتى نستطيع ربط ملف المستخدم بنقطة معروفة في القاعدة.

### لماذا Markdown وليس JSON فقط؟

لأنه يسمح لنا مع كل تغيير مؤثر أن نحفظ في نفس الملف:
- schema version.
- تاريخ التصدير.
- ملاحظات migration بشرية مستقبلًا.
- payload كامل قابل للقراءة الآلية.

مع بقاء الاستيراد متوافقًا مع ملفات JSON القديمة.

## قاعدة كل Schema Change

قبل دمج أي تغيير يغير معنى أو شكل البيانات:

1. تحديد `fromVersion → toVersion`.
2. إضافة Migration صريح أو إثبات backward compatibility.
3. إضافة fixture من الإصدار السابق.
4. اختبار Import/Normalize/Export round-trip.
5. اختبار قاعدة SQLite حقيقية file-backed عندما يمس التغيير التخزين.
6. عدم إسقاط حقل مالي تاريخي إذا لم نستطع اشتقاقه بأمان.
7. عدم اختراع Cost Basis / FX / ownership / portfolio history.
8. إبقاء export من الإصدار السابق قابلًا للقراءة أو توفير migrator واضح.
9. تحديث هذا المجلد وLiving Spec/ADR عندما يتغير عقد التخزين نفسه.

## Fixtures

- `fixtures/schema-v5-browser-snapshot.redacted.md`: fixture مموّه يحافظ على البنية التي كشفت مشكلة v5 loader، دون نشر بيانات المستخدم المالية الحقيقية.
- `server/database.node-test.mjs`: ينشئ ملف SQLite مؤقتًا فعليًا، يختبر migration، الإغلاق وإعادة الفتح، ومنع الاستبدال غير المقصود.

النسخة الحقيقية الكاملة يجب أن تبقى خارج المستودع العام ما لم يقرر المستخدم صراحة نشرها. يمكن استخدامها محليًا كـGolden Migration Fixture أثناء التطوير.

## الخصوصية

المستودع الحالي عام. لا تُرفع snapshots مالية حقيقية، أسماء عائلية، أرصدة، أرقام حسابات، أو ملفات SQLite إلى الريبو دون قرار صريح واعٍ من صاحب البيانات.
