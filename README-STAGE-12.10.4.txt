TUNEWRAP — STAGE 12.10.4
COMPACT DESKTOP PACKAGE CHOOSER

Исправляет экран со скрина:
«Выберите пакет» на компьютере.

Причина огромного промежутка:
две группы внутри chooser сделаны как <section>.
Глобальная геометрия TuneWrap для section давала им лишнюю экранную высоту.

Теперь:
- окно заметно меньше;
- ширина desktop примерно до 820px;
- заголовок компактнее;
- карточки ниже;
- три обычных пакета идут одной строкой;
- сразу под ними три свадебных;
- никакого огромного пустого пространства между группами;
- все 6 карточек визуально находятся в одном блоке;
- крестик остаётся справа сверху;
- tablet также получает компактную геометрию;
- phone не переделывается этим hotfix.

D1 / API / Pricing CMS / Orders не меняются.

Установка:
1. Распаковать поверх website.
2. node scripts/install-stage-12.10.4-compact-chooser.js
3. node scripts/stage-12.10.4-compact-chooser-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS — restore _worker.bundle, Commit / Push.
