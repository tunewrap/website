TUNEWRAP — STAGE 12.13.7.1
PLAYER NATIVE I18N LOCK

Что видно по скриншотам:
- название и описание треков уже приходят на EN корректно;
- динамический empty-text тоже EN;
- русскими остаются именно статические элементы Full Player:
  «Назад», «Свернуть», «Текст песни», кнопка заказа.

Исправление:
1. Статический fallback Full Player теперь English-first.
2. Full Player и Mini Player помечены notranslate / translate=no.
   Google/Chrome Translate больше не должен самостоятельно переписывать
   эти элементы поверх нативного TuneWrap языка.
3. Native EN/RU/UA/GE/DE labels теперь повторно синхронизируются:
   - при languagechange;
   - при заполнении трека;
   - непосредственно перед открытием Full Player.

Не меняется:
- audio playback;
- queue;
- seek;
- next/prev;
- catalog data;
- CMS/Admin/API/D1;
- first paint.

D1 НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.7.1-player-native-i18n-lock.js
3. node scripts/stage-12.13.7.1-player-native-i18n-lock-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS восстановить _worker.bundle.

GitHub Desktop Summary:
Stage 12.13.7.1 – Player Native I18N Lock

ПРОВЕРКА
Incognito, Google Translate выключен:
- EN: Back / Minimize / Lyrics / Order a similar story
- RU: Назад / Свернуть / Текст песни / Заказать похожую историю

После этого можно отдельно включить Google Translate: сам Full Player не должен
перемешивать browser translation с нативной локализацией TuneWrap.
