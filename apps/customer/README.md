# SprintGo — تطبيق العميل (React + Capacitor)

تطبيق العميل بواجهة عربية RTL، منفّذ **1:1** من تصميم `SprintGo.dc.html`. مبني بـ
React + Vite + TypeScript + Tailwind v4، ومغلّف بـ Capacitor لإنتاج APK قابل للتثبيت.

## التشغيل محلياً

```bash
pnpm --filter @sprintgo/customer dev
```

يفتح على `http://localhost:5175`. الطلبات لـ `/api` تتوجّه تلقائياً لسيرفر NestJS على
`localhost:4000` أثناء التطوير.

> ملاحظة: على هذه البيئة (ويندوز) شغّل vite مباشرة لتفادي قفل Prisma:
> `cd apps/customer && ./node_modules/.bin/vite`

## الشاشات (مطابقة للتصميم)

الرئيسية · تدفّق الطلب (3 خطوات) · التتبع المباشر · الطلبات · الخدمات · حسابي ·
حالة فارغة · البحث عن مندوب.

نظام التصميم (ألوان، ظلال، حواف، خط IBM Plex Sans Arabic، أيقونات Lucide) معرّف مرة
واحدة في `src/index.css`.

## بناء APK تلقائياً (GitHub Actions)

عند رفع المشروع على GitHub وأي تعديل داخل `apps/customer/**`، يشتغل
`.github/workflows/android-apk.yml` وينتج APK للتنزيل من تبويب **Artifacts** في الـ run
(الاسم: `sprintgo-customer-apk`). يمكن تشغيله يدوياً من تبويب Actions (Run workflow).

يبني debug APK غير موقّع — مناسب للتجربة والتثبيت الجانبي (sideload). للنشر على Google
Play لاحقاً نضيف توقيعاً (keystore) في الـ workflow.

## عنوان الـ API في النسخة المثبّتة

الموبايل لا يصل إلى `localhost`. عند بناء APK حقيقي مرتبط بسيرفر، اضبط:

```
VITE_API_BASE=https://api.your-domain.com
```

(في الـ workflow أو ملف `.env`)، والتطبيق يستعمله بدل الـ proxy المحلي.
