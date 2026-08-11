TUNEWRAP — STAGE 12.13.6.2
PROGRESSIVE FAST BOOT

ЧТО ПРОИЗОШЛО
Stage 12.13.6.1 оказался слишком агрессивным:
он одновременно preloaded почти весь JS/CSS сайта.

На cold load это могло сделать ХУЖЕ:
- десятки запросов одновременно конкурировали за сеть;
- при этом First Paint Guard всё равно ждал завершения всего bootstrap;
- пользователь видел branded/black loading 12–15 секунд.

НОВАЯ СХЕМА
Мы не пытаемся загрузить весь TuneWrap до того, как показать главную.

Теперь блокирует первый экран ТОЛЬКО:
1. Track Catalog;
2. catalog-runtime;
3. основной script;
4. responsive-wide;
5. playback-engine.

Как только это готово:
LOADER → САЙТ.

После этого в фоне продолжают подключаться:
- Pricing CMS;
- Site CMS;
- Sound Preferences;
- Gift Certificate;
- Order form helpers;
- close/UX hotfixes;
- contact selector;
- wedding detail;
- другие вторичные модули.

Пользователь уже видит сайт и может слушать музыку, пока нижние/редко используемые
функции заканчивают инициализацию.

ДОПОЛНИТЕЛЬНО
- удалён весь Stage 12.13.6.1 preload flood;
- loader теперь находится прямо в index.html и виден с первого paint;
- fallback guard при полном сбое сокращён с 10 до 4 секунд;
- вторичный сбой после показа сайта больше не накрывает страницу loader-ошибкой.

НЕ МЕНЯЕТСЯ
- каталог / D1;
- Player / Queue / Seek;
- Admin;
- Cloudflare Access;
- язык;
- CMS data;
- дизайн;
- Orders API.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.6.2-progressive-boot.js
3. node scripts/stage-12.13.6.2-progressive-boot-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.6.2 – Progressive Fast Boot

Commit to main → Push origin.

ПРОВЕРКА
После зелёного Cloudflare открыть Incognito:
https://tunewrap.studio

Проверять именно первый cold load.
Ожидаем:
короткий TuneWrap loader → главная.
CMS/нижние формы могут инициализироваться уже после первого экрана,
но без блокировки клиента на 12–15 секунд.
