TUNEWRAP STAGE 12.1.6 — WEDDING DETAIL CARDS

По desktop-скринам:
обычный тариф ("Просто") открывается аккуратной компактной карточкой,
а свадебный пакет открывался как отдельная длинная страница с большой картинкой.

Теперь на tablet/desktop свадебные детали оформляются в том же стиле, что и обычный "Ваш формат":

- та же центральная компактная карточка;
- без большой свадебной картинки;
- показывается старая и акционная цена:
  First Dance: $99 → $49
  Love Story: $199 → $99
  Wedding Collection: $299 → $149
- короткое описание остаётся;
- "Что входит" больше не отдельная тяжёлая карточка — это чистый список с галочками;
- "Идеально подходит для" остаётся, но компактно;
- одна золотая CTA-кнопка внизу;
- внешний modal shell и header остаются едиными с обычными тарифами.

ВАЖНО:
- phone <=620px не затрагивается;
- script.js не заменяется;
- музыкальная система, Track Catalog, Orders, D1/R2 не меняются.

Установка:
скопировать всё из ZIP поверх website.

Заменятся:
css/responsive-wide.css
js/app-bootstrap.js

Добавятся:
js/wedding-detail-wide.js
scripts/wedding-detail-wide-test.js

Проверка:
node scripts/wedding-detail-wide-test.js
npm.cmd test
npx.cmd wrangler pages functions build

GitHub Summary:
Stage 12.1.6 – Match wedding detail cards to standard tiers
