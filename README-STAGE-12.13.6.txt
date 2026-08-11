TUNEWRAP — STAGE 12.13.6
FIRST PAINT GUARD — NO LEGACY FLASH

ПРОБЛЕМА
При холодном открытии tunewrap.studio браузер иногда успевал на долю секунды
показать статическую fallback-версию index.html.

Потом запускался app-bootstrap.js:
1. появлялся чёрный экран / фирменный loader;
2. загружались Track Catalog + CMS + runtime;
3. появлялся настоящий актуальный TuneWrap.

Получалось:
СТАРАЯ ВЕРСИЯ → LOADING → АКТУАЛЬНЫЙ САЙТ

ПРИЧИНА
app-bootstrap.js подключён внизу body как module.
До запуска этого модуля браузер уже мог сделать первый paint статического HTML.

ИСПРАВЛЕНИЕ
First Paint Guard запускается ещё в <head>, ДО <body>.

Теперь:
ЧЁРНЫЙ ФОН / ФИРМЕННЫЙ LOADER → АКТУАЛЬНЫЙ TUNEWRAP

Статическая fallback-страница во время нормальной загрузки вообще не видна.

SAFE FALLBACK
Если app-bootstrap.js вообще не сможет стартовать, guard автоматически
снимется через 10 секунд, чтобы не оставлять вечный чёрный экран.

ЧТО НЕ МЕНЯЕТСЯ
- дизайн;
- CMS;
- языки;
- музыка / очередь / player;
- responsive layout;
- Admin;
- API;
- D1.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.6-first-paint-guard.js
3. node scripts/stage-12.13.6-first-paint-guard-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.6 – First Paint Guard

Commit to main → Push origin.

ПРОВЕРКА ПОСЛЕ DEPLOY
Лучше проверить в Incognito:
- https://tunewrap.studio
- https://tunewrap.studio/?lang=ka

Ожидаем:
никакой старой версии даже на долю секунды.
Только чёрный/firma loading → готовый сайт.
