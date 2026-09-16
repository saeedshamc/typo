# TypingTest — اپ دسکتاپ تایپینگ‌تست

اپ دسکتاپ آفلاین شبیه typingtest.com، ساخته‌شده با **Tauri (Rust) + React/TypeScript**.

## چرا این معماری؟

| نیاز | راه‌حل |
|---|---|
| هیچ‌وقت کرش نکنه | هر Tauri command داخل `catch_unwind` است (`src-tauri/src/main.rs`) — پنیک در یک دستور، کل پروسه رو نمی‌کشه. هر بخش UI هم داخل `ErrorBoundary` جدا است (`src/components/ErrorBoundary.tsx`). |
| متن هیچ‌وقت تموم نشه | بانک محتوای SQLite + fallback تولید رویه‌ای (procedural) در `src-tauri/src/content.rs`. اگر دیتابیس خالی/تموم شده باشه، متن به‌صورت الگوریتمی ساخته می‌شه. |
| از دست ندادن پیشرفت در صورت کرش | هر ۳ ثانیه `save_progress` صدا زده می‌شه؛ با ری‌استارت، `load_latest_progress` پیشنهاد ادامه می‌دهد. |
| تایمر دقیق در سشن طولانی | `requestAnimationFrame` + محاسبه‌ی delta واقعی به‌جای `setInterval` (که drift داره) — `src/components/Timer.tsx`. |
| تایپ فارسی درست کار کنه | مقایسه‌ی کاراکترها بعد از نرمال‌سازی presentation forms به حرف پایه — `src/utils/rtlCompare.ts`. ورودی از یک `<input>` مخفی گرفته می‌شه (نه keydown خام) تا composition درست کار کنه. |

## ساختار پوشه‌ها

```
src-tauri/          بک‌اند Rust
  src/main.rs        نقطه‌ی ورود، دستورات Tauri (panic-safe)
  src/db.rs          اسکیمای SQLite، autosave، تاریخچه، settings
  src/content.rs      دسترسی به بانک متن + تولید رویه‌ای
  seed/*.json         محتوای اولیه (فارسی، انگلیسی، کد)
  icons/              آیکون‌های بسته‌بندی
  capabilities/       مجوزهای Tauri v2

src/                 فرانت‌اند React/TS
  store/useTypingStore.ts   ماشین‌حالت سشن
  components/               TypingArea, Timer, CategorySelector, StatsPanel, Settings, ...
  utils/                     rtlCompare, wpmCalculator
  types/                     تایپ‌های مشترک
```

## اجرا (توسعه)

```bash
npm install
npm run tauri dev
```

نیازمندی‌های سیستم برای Tauri v2 (Rust + وابستگی‌های native) طبق مستندات رسمی:
https://tauri.app/start/prerequisites/

## حالت ادیتور کد

وقتی دسته‌ی «کد برنامه‌نویسی» را انتخاب می‌کنی، ناحیه‌ی تایپ مثل یک ادیتور واقعی رفتار می‌کند:

- فونت monospace، شماره خط، هایلایت خط جاری
- Tab و Enter مطابق متن سورس
- هایلایت سبک سینتکس برای متن هنوز تایپ‌نشده
- نوار وضعیت با Ln/Col و نام زبان

زبان‌های پشتیبانی‌شده: JavaScript، TypeScript، Python، C++، Rust، Go، Java، C#، PHP، Kotlin، Ruby، Swift، SQL.

## بیلد نصب‌کننده

```bash
npm run tauri build
```

خروجی بسته‌ها بسته به سیستم‌عامل در `src-tauri/target/release/bundle/` قرار می‌گیرد (مثلاً MSI روی ویندوز).

برای بازتولید آیکون‌های پلتفرم‌ها از تصویر اصلی:

```bash
npm run tauri icon src-tauri/icons/icon.png
```

## افزودن محتوای بیشتر

فایل‌های `src-tauri/seed/*.json` را ویرایش کن (یا فایل جدید اضافه کن و در
`content.rs` با `include_str!` وصلش کن). هر آیتم باید `category`,
`language` (فقط برای کد), `difficulty`, `body` داشته باشه. سطح دشواری
به‌صورت خودکار بر اساس چگالی نمادها (`symbol_density`) هم در انتخاب متن دخیل است.

## آپدیت خودکار (آماده‌سازی)

پلاگین updater در پروژه سیم‌کشی شده است. قبل از انتشار واقعی باید:

1. کلید امضای آپدیت بسازی (`tauri signer generate`)
2. endpoint انتشار را در `tauri.conf.json` (`plugins.updater.endpoints`) تنظیم کنی
3. pubkey را در همان بخش قرار دهی

بدون این مقادیر، بیلد عادی کار می‌کند ولی چک آپدیت فعال/کامل نیست.
