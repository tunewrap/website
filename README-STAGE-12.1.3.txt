TUNEWRAP STAGE 12.1.3 — QUOTE + PRICING HOTFIX

Исправляет два замечания по desktop-скринам:

1. Философия
Фраза:
«Сначала — ваша история.
Потом — слова.
Потом — музыка.»

На компьютере теперь держится ровно в ТРИ строки.
HTML/текст не меняется — исправлена только ширина/перенос CSS.

2. Тарифы
Средняя карточка «Продвинутый» больше не схлопывается.
Все три стандартных пакета получают одинаковую высоту и нижнюю линию действий.
Свадебные карточки также принудительно выровнены по высоте.

ВАЖНО:
- пользовательские правки текста не затрагиваются;
- index.html не заменяется;
- js/script.js не заменяется;
- телефон <=620px не затрагивается.

Установка:
скопировать содержимое ZIP поверх website.

Заменится:
css/responsive-wide.css

Добавится:
scripts/quote-pricing-hotfix-test.js

Проверка:
node scripts/quote-pricing-hotfix-test.js
npm.cmd test
npx.cmd wrangler pages functions build

GitHub Summary:
Stage 12.1.3 – Fix quote and pricing card alignment
