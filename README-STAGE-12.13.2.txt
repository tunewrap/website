TUNEWRAP — STAGE 12.13.2
ENGLISH FIRST — LANGUAGE ORDER

После перехода TuneWrap на English-first EN должен быть не только активным,
но и стоять ПЕРВЫМ во всех списках языков.

Единый визуальный порядок:
EN / RU / UA / GE / DE

Где меняется:
- desktop language switch;
- mobile language switch;
- library language filters;
- package detail language selector, если он присутствует;
- Admin → Сайт language tabs;
- Admin → Стоимость language tabs;
- Admin → Звучание language tabs;
- Admin → Музыка → язык трека;
- Admin → Музыка → локализация;
- Admin → Категории локализация.

ВАЖНО:
Admin Studio НЕ переводится на английский.
Интерфейс Admin остаётся русским.
Меняется только порядок языков в языковых списках.

Технические locale-коды не меняются:
EN=en, RU=ru, UA=uk, GE=ka, DE=de.

D1 migration НЕ НУЖНА.
Music / Player / Orders / Pricing data architecture не меняются.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.2-english-first-language-order.js
3. node scripts/stage-12.13.2-english-first-order-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.2 – English First Language Order

Commit to main → Push origin.
