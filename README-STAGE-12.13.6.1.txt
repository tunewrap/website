TUNEWRAP — STAGE 12.13.6.1
FAST + SEAMLESS BOOT

ЧТО БЫЛО
Stage 12.13.6 правильно убрал вспышку старой статической версии.
Но на cold load стало слишком долго ощущаться ожидание:
loader / чёрный экран → пауза → сайт.

ПОЧЕМУ
app-bootstrap.js загружает много JS-модулей через последовательные await import().
На первом посещении браузеру приходилось запрашивать эти файлы один за другим.
Кроме того, финальный loader удалялся в тот же момент, когда body становился visible.

ЧТО СДЕЛАНО
1. Все существующие runtime-модули получают modulepreload в <head>.
   Они скачиваются ПАРАЛЛЕЛЬНО, но исполняются в прежнем порядке.
   Архитектура не меняется.

2. CSS hotfix/runtime-файлы получают preload as=style.
   Они начинают скачиваться раньше.

3. Loader теперь явно фирменный:
   TuneWrap + spinner + текст загрузки.
   Даже при медленной сети экран не выглядит зависшим.

4. Финальный переход теперь:
   loader → плавное fade 180 ms → уже готовый сайт.
   Сначала body становится visible, и только после этого loader исчезает.
   Пустого чёрного кадра между ними быть не должно.

НЕ МЕНЯЕТСЯ
- Player / Queue / Seek;
- CMS;
- Orders;
- Admin;
- D1;
- язык по умолчанию;
- дизайн сайта;
- Cloudflare Access;
- доменная конфигурация.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.6.1-fast-boot.js
3. node scripts/stage-12.13.6.1-fast-boot-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.6.1 – Fast Seamless Boot

Commit to main → Push origin.

ПРОВЕРКА
После зелёного Cloudflare открыть Incognito:
https://tunewrap.studio

Особенно важно проверить первый cold load.
Ожидается:
короткий фирменный TuneWrap loader → плавно готовый сайт.
Без старой версии и без пустой чёрной паузы.
