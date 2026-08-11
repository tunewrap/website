TUNEWRAP — STAGE 12.13.6.3
IMMEDIATE FIRST PAINT

ЦЕЛЬ
Убрать 5–7 секунд чёрного экрана, не трогая рабочую архитектуру TuneWrap.

ЧТО БЫЛО
До Stage 12.13.6:
- браузер быстро показывал страницу;
- на desktop на долю секунды был виден старый визуальный слой;
- причина: финальный responsive-wide.css подключался поздно из app-bootstrap.js.

Stage 12.13.6:
- спрятал весь body до завершения bootstrap;
- старый визуальный слой исчез;
- но клиент получил 5–7 секунд чёрного экрана.

Stage 12.13.6.1:
- попытался ускорить это preload всего JS/CSS;
- холодный старт стал ещё тяжелее.

Stage 12.13.6.2:
- пытался менять порядок bootstrap;
- был откачен и НЕ является базой этого Stage.

ЧТО ДЕЛАЕТ 12.13.6.3
Это узкий и безопасный fix.

1. app-bootstrap.js НЕ МЕНЯЕТСЯ.
2. Player / Queue / CMS / API / D1 НЕ МЕНЯЮТСЯ.
3. Удаляется огромный preload-блок Stage 12.13.6.1.
4. responsive-wide.css подключается обычным stylesheet прямо в <head>.
   Поэтому первый desktop paint сразу получает текущий чёрно-золотой layout,
   а не старую базовую desktop-версию.
5. CSS Home Logo тоже применяется сразу.
6. body больше НЕ скрывается до конца bootstrap.
7. Обычный полноэкранный catalog loader скрыт.
8. Если Track Catalog реально упадёт, существующий .is-error loader всё ещё
   сможет показать пользователю ошибку.

ОЖИДАЕМАЯ ЗАГРУЗКА
Было:
чёрный экран 5–7 сек → TuneWrap

Должно стать:
TuneWrap появляется сразу → данные/каталог спокойно заканчивают инициализацию

ВАЖНО
На основном https://tunewrap.studio default language = EN, поэтому статический
первый Hero уже соответствует стартовому языку бренда.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.6.3-immediate-first-paint.js
3. node scripts/stage-12.13.6.3-immediate-first-paint-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS восстановить _worker.bundle.

GitHub Desktop Summary:
Stage 12.13.6.3 – Immediate First Paint

Commit to main → Push origin.

ПРОВЕРКА ПОСЛЕ DEPLOY
Открыть Incognito:
https://tunewrap.studio

Проверять именно первый cold load.

Ожидаем:
- никакого старого фиолетового/старого desktop layout;
- никакого полноэкранного чёрного ожидания 5–7 секунд;
- Header + Hero текущего TuneWrap появляются сразу;
- затем каталог/CMS заканчивают загрузку без блокировки первого экрана.
