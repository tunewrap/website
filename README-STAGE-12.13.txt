TUNEWRAP — STAGE 12.13
ENGLISH-FIRST INTERNATIONAL LAUNCH

Главный вход / открывается на English.
Языки RU / UA / GE / DE остаются доступны.

Прямые ссылки для рекламы:
?lang=ka — Georgian
?lang=uk — Ukrainian
?lang=ru — Russian
?lang=de — German
?lang=en — English
Также поддерживаются aliases ?lang=ge и ?lang=ua.

Что меняется:
- index.html становится English base HTML, без русского first paint;
- title + meta description на английском;
- EN активен по умолчанию;
- js/script.js стартует с EN;
- переключатель языка меняет URL, чтобы ссылку можно было отправить/использовать в рекламе;
- загрузочный экран app-bootstrap локализован;
- News/Terms fallback в Site CMS больше не остаётся русским на английской версии.

Admin Studio остаётся русским — это внутренний рабочий интерфейс.

Пока НЕ создаём /en/, /ka/, /uk/, /ru/, /de/ директории. Это отдельный SEO-этап после запуска домена.

D1 migration НЕ НУЖНА.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13-english-first-launch.js
3. node scripts/stage-12.13-english-launch-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS: restore _worker.bundle.
GitHub Desktop Summary:
Stage 12.13 – English First International Launch
Commit to main → Push origin.

После деплоя проверить обычный URL и ?lang=ru / ?lang=ka / ?lang=uk / ?lang=de.
