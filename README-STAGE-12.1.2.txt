TUNEWRAP STAGE 12.1.2 — WIDE SECTION POLISH

Основано на визуальной проверке desktop после Stage 12.1.1.

Исправляет следующие экраны на tablet/desktop:
- Философия TuneWrap
- Как это работает
- Музыкальные истории
- Авторские песни
- Стоимость и форматы
- Свадебный формат
- Начать свою историю

Главная идея:
не делать отдельный старый desktop-сайт, а раскрыть мобильную premium-композицию в ширину.

Что изменено:
- все основные экраны используют больше доступной ширины;
- Philosophy превращена в сбалансированную композицию quote + текст;
- убрано лишнее пустое пространство;
- How it Works стал плотнее и визуально сильнее;
- Stories / Author получили более уверенную wide-композицию;
- Pricing и Wedding собраны в одну цельную premium-систему;
- форма заказа становится удобнее на компьютере;
- телефон <=620px не затрагивается;
- Hero Stage 12.1.1 сохранён без изменений.

Установка:
скопировать содержимое ZIP поверх корня website.

Заменится:
css/responsive-wide.css

Добавится:
scripts/wide-section-polish-test.js

Проверка:
node scripts/wide-section-polish-test.js
npm.cmd test
npx.cmd wrangler pages functions build

GitHub Summary:
Stage 12.1.2 – Polish tablet and desktop sections

Commit to main → Push origin → Cloudflare green → Ctrl+F5.
