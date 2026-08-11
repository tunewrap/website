TUNEWRAP — STAGE 12.13.4.1
WIDE FEATURED PLAY — NO FULLSCREEN

Почему на телефоне уже работало, а на компьютере всё ещё открывался Full Player:

Stage 12.13.4 правильно изменил playback-engine.js.
Но desktop/tablet имеет отдельный presentation adapter:
js/responsive-wide.js

В нём был независимый обработчик:
- клик по [data-featured-track]
- после запуска аудио
- отдельно вызывает openWidePlayer()

Поэтому мобильный фикс был правильный, но Wide adapter снова открывал экран.

12.13.4.1 исправляет именно Wide adapter.

Теперь:
DESKTOP / TABLET
- Featured Story → play/pause на месте;
- Featured Author → play/pause на месте;
- Wide Mini Player появляется;
- Full Player автоматически НЕ открывается.

MOBILE
- остаётся уже исправленное поведение Stage 12.13.4.

Full Player остаётся доступен намеренно:
- через Mini Player;
- через карточки внутри полной библиотеки.

Не меняются:
- playback engine architecture;
- очередь;
- seek;
- next/previous;
- Media Session;
- library behavior.

D1 migration НЕ НУЖНА.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.4.1-wide-featured-play-no-fullscreen.js
3. node scripts/stage-12.13.4.1-wide-featured-play-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.4.1 – Wide Featured Play No Fullscreen

Commit to main → Push origin.

Проверка после деплоя на компьютере:
1. Featured Story → просто играет, экран не открывается.
2. Повторный клик → pause.
3. Featured Author → то же.
4. Нажать Mini Player → Full Player открывается.
