# MyFinMan — Migration & Persistence Contract

## لماذا هذا الملف موجود؟

بيانات المستخدم أهم من شكل الـUI ومن رقم إصدار الـschema. أي تغيير معماري أو مالي لا يجوز أن يجعل البيانات السابقة غير مرئية أو غير قابلة للاسترجاع.

تم إنشاء هذا العقد بعد اكتشاف أن نسخة التطبيق كانت تحفظ `schemaVersion: 5` بينما loader الخاص بـLocalStorage يقبل v4 فقط؛ النتيجة كانت أن البيانات موجودة فعليًا في المتصفح لكن التطبيق يتعامل معها كأنها غير موجودة.

## مصدر الحقيقة التشغيلي

ابتداءً من هذا التغيير:

1. **SQLite داخل المتصفح هو المخزن الأساسي**.
2. ملف SQLite يُحفظ في IndexedDB ليستمر بين الجلسات.
3. في المرحلة الأولى نحفظ `FinanceState` كاملًا كـJSON canonical داخل جدول `app_state`.
4. هذا قرار مقصود: لا نحول الـDomain إلى relational tables على عجل قبل تصميم schema مالي علائقي كامل ومهاجراته.
5. توجد جداول منفصلة لـ`migration_journal` و`export_checkpoints` لتأسيس مسار الترحيل والتدقيق.
6. LocalStorage القديم يبقى Recovery/Migration source خلال مرحلة الانتقال، وSQLite له أولوية القراءة.

## ترحيل LocalStorage → SQLite

عند أول تشغيل:

- إذا كانت SQLite تحتوي state: نستخدمها.
- إذا كانت SQLite فارغة وLocalStorage يحتوي v4 أو v5 صالحًا: ننسخه إلى SQLite **دون حذف المصدر القديم**.
- يسجل Migration Journal أن المصدر كان `localStorage`.
- عمليات الحفظ التالية تُكتب إلى SQLite، مع Recovery mirror مؤقت في namespace القديم.

## Migration Snapshot بصيغة Markdown

كل Export من الواجهة يجب أن ينتج ملفًا مثل:

`myfinman-migration-2026-08-18T16-30-00.md`

ويحتوي:

1. Manifest نصي أعلى الملف يحدد format/schema/storage engine.
2. شرح بشري قصير.
3. كتلة واحدة تحت `## Machine-readable snapshot` تحتوي JSON كاملًا lossless من صيغة `myfinman-snapshot`.

الـMarkdown هو **الغلاف/وسيط الترحيل**؛ JSON داخل fenced block هو payload الآلي الدقيق.

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
5. عدم إسقاط حقل مالي تاريخي إذا لم نستطع اشتقاقه بأمان.
6. عدم اختراع Cost Basis / FX / ownership / portfolio history.
7. إبقاء export من الإصدار السابق قابلًا للقراءة أو توفير migrator واضح.
8. تحديث هذا المجلد وLiving Spec عند تغيير العقد.

## Fixtures

- `fixtures/schema-v5-browser-snapshot.redacted.md`: fixture مموّه يحافظ على البنية التي كشفت مشكلة v5 loader، دون نشر بيانات المستخدم المالية الحقيقية.

النسخة الحقيقية الكاملة يجب أن تبقى خارج المستودع العام ما لم يقرر المستخدم صراحة نشرها. يمكن استخدامها محليًا كـGolden Migration Fixture أثناء التطوير.

## الخصوصية

المستودع الحالي عام. لا تُرفع snapshots مالية حقيقية، أسماء عائلية، أرصدة، أو أرقام حسابات إلى `docs/migrations/fixtures` دون قرار صريح واعٍ من صاحب البيانات.
