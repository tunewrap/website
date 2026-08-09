TUNEWRAP STAGE 12.1.5 — HERO COPY HOTFIX

Изменяется только desktop/tablet RU-композиция текста на главной странице.

Было одной длинной строкой:
Расскажите нам самое важное — и мы создадим для вас персональную песню, к которой захочется возвращаться спустя годы.

Теперь:
Расскажите нам самое важное —
и мы создадим для вас персональную песню,
к которой захочется возвращаться спустя годы.

Предыдущие две строки выше сохраняются:
Первая встреча. Любимая фраза мамы. Семейная шутка.
Число на обручальном кольце.

Телефон <=620px не меняется.
Другие страницы не меняются.

Установка:
скопировать всё из ZIP поверх website.

Заменится:
js/wide-copy-polish.js

Добавится:
scripts/hero-copy-hotfix-test.js

Проверка:
node scripts/hero-copy-hotfix-test.js
npm.cmd test
npx.cmd wrangler pages functions build

GitHub Summary:
Stage 12.1.5 – Split desktop hero copy into balanced lines
