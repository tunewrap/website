TUNEWRAP STAGE 12.13.8 — TEST COMPATIBILITY

ВАЖНО
Перед запуском этого patch script сначала восстановить 6 тестов из Git HEAD,
потому что предыдущая PowerShell-правка могла повредить кириллицу в UTF-8 файлах.

Восстановить:
scripts/admin-catalog-test.js
scripts/orders-crm-test.js
scripts/gift-certificate-overlay-test.js
scripts/pricing-cms-test.js
scripts/site-cms-test.js
scripts/responsive-wide-test.js

Затем:
node scripts/fix-stage-12.13.8-versioned-import-tests.js
npm.cmd test

Этот fix меняет ТОЛЬКО тесты.
Production/runtime/CMS/Player/API/D1 не затрагиваются.
