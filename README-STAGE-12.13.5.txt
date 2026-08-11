TUNEWRAP — STAGE 12.13.5
MOBILE LIBRARY — 2 COLUMN GRID

Задача:
на компьютере библиотека выглядит аккуратно сеткой по 3 трека.
На телефоне старый список показывал по одному широкому треку на строку.

Теперь телефон:
- 2 трека в одной строке;
- квадратная обложка сверху;
- название максимум 2 строки;
- язык / категория / длительность компактно снизу;
- маленькая Play/Pause кнопка лежит поверх обложки;
- Stories и Originals используют один и тот же аккуратный принцип.

При этом:
- Desktop остаётся 3 колонки;
- Tablet/Wide остаётся как был;
- библиотечная логика не меняется;
- поиск / языки / категории не меняются;
- Play/Pause не открывает Full Player;
- клик по самой карточке по-прежнему может открыть подробный Full Player;
- очередь / seek / player / Media Session не меняются.

На очень узких телефонах <=370px всё равно остаётся 2 колонки,
но карточки и кнопка слегка уменьшаются.

D1 migration НЕ НУЖНА.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.5-mobile-library-2col.js
3. node scripts/stage-12.13.5-mobile-library-2col-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.5 – Mobile Library 2 Column

Commit to main → Push origin.

После деплоя проверить PHONE:
1. Stories → Open all stories.
2. Должно быть 2 карточки в ряд.
3. Play на карточке → играет без Full Player.
4. Нажать саму карточку → Full Player может открыться.
5. Originals → то же самое.
