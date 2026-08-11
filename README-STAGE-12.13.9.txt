TUNEWRAP — STAGE 12.13.9
MOBILE HEADER SIMPLIFICATION

Цель:
На телефоне убрать верхнее hamburger-меню, потому что основная мобильная
навигация уже полностью находится в постоянном Bottom Nav.

Результат:
- MOBILE: TuneWrap logo + Language selector.
- MOBILE hamburger скрыт.
- Bottom Nav не меняется.
- DESKTOP header не меняется: языки + Get a quote остаются как сейчас.
- HTML старого mobile-menu не удаляется — это безопасный CSS-only hotfix,
  поэтому откат очень простой.
- Audio / Queue / Full Player / Mini Player / I18N / CMS / API / Admin не затрагиваются.
- D1 migration не требуется.

УСТАНОВКА:
1. Распаковать ZIP поверх папки website.
2. Выполнить:
   node scripts/install-stage-12.13.9-mobile-header-simplification.js
3. Затем:
   node scripts/stage-12.13.9-mobile-header-simplification-test.js
4. Затем:
   npm.cmd test
5. Затем:
   npx.cmd wrangler pages functions build
6. После "Compiled Worker successfully" восстановить _worker.bundle.
7. GitHub Desktop:
   Summary: Stage 12.13.9 – Simplify Mobile Header
   Commit to main -> Push origin.

ВИЗУАЛЬНАЯ ПРОВЕРКА ПОСЛЕ DEPLOY:
- Телефон: слева TuneWrap, справа только кнопка языка. Hamburger отсутствует.
- Нижнее меню Home / Stories / Originals / Packages / Contact остаётся.
- Компьютер: header выглядит как до Stage 12.13.9.
