TUNEWRAP — STAGE 12.13.7
FULL PLAYER LANGUAGE SYNC

ПРОБЛЕМА
При выбранном EN Full Player показывал смесь языков:
- название/описание могли внезапно стать RU;
- видимые подписи «Назад», «Свернуть», «Текст песни», «Заказать похожую историю» оставались RU;
- Google Translate мог дополнительно менять DOM-язык и усиливать путаницу.

НАЙДЕНЫ 3 КОНКРЕТНЫЕ ПРИЧИНЫ

1. Full Player имел data-player-i18n, но playback-engine переводил только aria-label.
   Видимый текст в index.html оставался старым RU fallback.

2. Dynamic Player/Catalog определяли язык через <html lang>.
   Это DOM-атрибут, который может затронуть браузерный переводчик.
   Теперь источник истины — выбранный язык TuneWrap:
   window.TUNEWRAP_CURRENT_LANGUAGE.

3. catalog-core сохранил старый RU-first fallback:
   requested language → RU → EN ...
   Поэтому у старого EN-трека при отсутствии titles.en мог отображаться titles.ru,
   даже если canonical track.title был английским.

ИСПРАВЛЕНИЕ
- EN / RU / UA / GE / DE Full Player labels синхронизируются нативно;
- выбранный язык TuneWrap становится source of truth для динамического UI;
- catalog-runtime и playback-engine не зависят от случайной мутации <html lang>;
- EN source track больше не падает в RU localization;
- lyrics/translation fallback также учитывает исходный язык песни;
- английский остаётся brand fallback.

НЕ МЕНЯЕТСЯ
- Player playback logic;
- Queue / Next / Prev;
- Seek;
- Audio engine;
- D1;
- Admin;
- Orders;
- Pricing / Site / Sound CMS;
- загрузка сайта / Stage 12.13.6.3;
- Mini Player close fix 12.13.6.4.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.7-full-player-language-sync.js
3. node scripts/stage-12.13.7-full-player-language-sync-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS восстановить _worker.bundle.

GitHub Desktop Summary:
Stage 12.13.7 – Full Player Language Sync

Commit to main → Push origin.

ПРОВЕРКА ПОСЛЕ DEPLOY
1. Открыть Incognito.
2. Выбрать EN.
3. Открыть Full Player у Just Five More Minutes и We'll Grow Old Together.

Ожидается EN:
Back / Minimize / Lyrics / Order a similar story.
Track title/description должны использовать EN localization; EN source track не должен
самопроизвольно показывать RU title/description.

Затем переключить RU и открыть Player снова:
Назад / Свернуть / Текст песни / Заказать похожую историю.

ВАЖНО ПРО GOOGLE TRANSLATE
TuneWrap уже имеет 5 нативных языков. Для корректной проверки сначала держать
Google Translate выключенным и использовать переключатель TuneWrap.
Браузерный переводчик может визуально переписывать динамические DOM-тексты поверх сайта;
он не должен быть источником языка приложения.
