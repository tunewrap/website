TUNEWRAP WEB — STAGE 12.5.3: ORDERS SQL HOTFIX

ПРОБЛЕМА
После Stage 12.5 заявка формировалась на сайте, но API отвечал:
«Не удалось сохранить заявку. Внутренняя ошибка TuneWrap API».

ПРИЧИНА
После добавления instruments_json и sound_prompt INSERT в orders содержит 28 колонок,
но VALUES осталось только 26 SQL placeholders (?).

ИСПРАВЛЕНИЕ
28 колонок → 28 placeholders.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх корня website.
2. node scripts/install-stage-12.5.3-orders-sql-hotfix.js
3. node scripts/orders-sql-hotfix-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. restore _worker.bundle
7. GitHub Desktop:
   Stage 12.5.3 – Orders SQL Hotfix
