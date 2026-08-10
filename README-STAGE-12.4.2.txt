TUNEWRAP WEB — STAGE 12.4.2: MINI SEEK DIRECT FIX

ПРОБЛЕМА
В Stage 12.4.1 бегунок Mini Player можно было тянуть, но после отпускания он возвращался к текущей позиции и звук не перескакивал.

ПРИЧИНА
Mini Player передавал значение через скрытый seek Full Player, а тот запускал асинхронную buffering/fallback-логику. В результате Mini Player уже снова рисовал старую позицию раньше, чем seek реально применялся.

ИСПРАВЛЕНИЕ
Mini Player теперь передаёт выбранное время напрямую в ЕДИНЫЙ persistent audio engine:
- audio.fastSeek(), если браузер его поддерживает;
- иначе audio.currentTime;
- старый robust commitSeek остаётся fallback только при исключении.

Никакого второго Audio не создаётся.
Очередь, каталог, R2, Orders, Pricing, Site CMS не меняются.
D1 migration не нужна.

УСТАНОВКА
1. Распаковать ZIP в корень website.
2. node scripts/install-stage-12.4.2-mini-seek-direct.js
3. node scripts/mini-seek-direct-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. Восстановить _worker.bundle.
7. GitHub Desktop:
   Stage 12.4.2 – Mini Seek Direct Fix
   Commit to main → Push origin.

ПОСЛЕ DEPLOY
Запустить песню → свернуть → резко перетащить Mini seek с ~20% на ~70%.
Ползунок и звук должны остаться на новой позиции.
