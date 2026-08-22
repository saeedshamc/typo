# TypingTest — اپ دسکتاپ تایپینگ‌تست

اپ دسکتاپ آفلاین شبیه typingtest.com، ساخته‌شده با **Tauri (Rust) + React/TypeScript**.

## چرا این معماری؟

| نیاز | راه‌حل |
|---|---|
| هیچ‌وقت کرش نکنه | هر Tauri command داخل `catch_unwind` است (`src-tauri/src/main.rs`) — پنیک در یک دستور، کل پروسه رو نمی‌کشه. هر بخش UI هم داخل `ErrorBoundary` جدا است (`src/components/ErrorBoundary.tsx`). |
| متن هیچ‌وقت تموم نشه | بانک محتوای SQLite + fallback تولید رویه‌ای (procedural) در `src-tauri/src/content.rs`. اگر دیتابیس خالی/تموم شده باشه، متن به‌صورت الگوریتمی ساخته می‌شه. |
| از دست ندادن پیشرفت در صورت کرش | هر ۳ ثانیه `save_progress` صدا زده می‌شه و در جدول `progress` می‌شینه؛ با ری‌استارت، `load_progress` صدا زده می‌شه. |
| تایمر دقیق در سشن طولانی | `requestAnimationFrame` + محاسبه‌ی delta واقعی به‌جای `setInterval` (که drift داره) — `src/components/Timer.tsx`. |
| تایپ فارسی درست کار کنه | مقایسه‌ی کاراکترها بعد از نرمال‌سازی presentation forms به حرف پایه — `src/utils/rtlCompare.ts`. ورودی از یک `<input>` مخفی گرفته می‌شه (نه keydown خام) تا composition درست کار کنه. |

## ساختار پوشه‌ها

```
src-tauri/          بک‌اند Rust
  src/main.rs        نقطه‌ی ورود، دستورات Tauri (panic-safe)
  src/db.rs          اسکیمای SQLite، autosave، تاریخچه
  src/content.rs      دسترسی به بانک متن + تولید رویه‌ای
  seed/*.json         محتوای اولیه (فارسی، انگلیسی، کد JS/Python)

src/                 فرانت‌اند React/TS
  store/useTypingStore.ts   ماشین‌حالت سشن (idle/running/paused/finished)
  components/               TypingArea, Timer, CategorySelector, StatsPanel, ErrorBoundary
  utils/                     rtlCompare (مقایسه‌ی حروف فارسی), wpmCalculator
  types/                     تایپ‌های مشترک
```

## اجرا (توسعه)

```bash
npm install
npm run tauri dev
```

نیازمندی‌های سیستم برای Tauri v2 (Rust + وابستگی‌های native) طبق مستندات رسمی:
https://tauri.app/start/prerequisites/

## افزودن محتوای بیشتر

فایل‌های `src-tauri/seed/*.json` را ویرایش کن (یا فایل جدید اضافه کن و در
`content.rs` با `include_str!` وصلش کن). هر آیتم باید `category`,
`language` (فقط برای کد), `difficulty`, `body` داشته باشه. سطح دشواری
به‌صورت خودکار هم بر اساس چگالی نمادها (`symbol_density`) در دیتابیس
محاسبه می‌شه، برای فیلتر و لول‌بندی خودکار در آینده.

## گام‌های بعدی پیشنهادی

- زبان‌های کد بیشتر (C++, Rust, PHP, Kotlin) در seed اضافه بشه — الان
  ستون‌های دیتابیس آماده‌ست، فقط محتوا کمه.
- Adaptive difficulty: بعد از هر سشن، سطح پیشنهادی بعدی بر اساس accuracy
  محاسبه بشه.
- اضافه کردن `tauri-plugin-updater` برای آپدیت خودکار قبل از پکیجینگ نهایی.
- تست‌های واحد برای `rtlCompare.ts` و `wpmCalculator.ts`.
