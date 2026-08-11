TUNEWRAP — STAGE 12.13.3
HOME LOGO LINK

Задача:
логотип TuneWrap в верхней шапке должен быть активным и возвращать клиента на главную.

Что сделано:
- весь блок TuneWrap + tagline стал ссылкой Home;
- desktop: возвращает в начало Hero;
- mobile: возвращает внутренний appScroll в начало Hero;
- закрывает раскрытое mobile menu / language menu;
- текущий язык сохраняется;
- страница не перезагружается;
- добавлена keyboard accessibility (focus-visible).

Например:
?lang=ru → нажали TuneWrap → остаёмся на ?lang=ru, но возвращаемся на главную.
?lang=ka → остаёмся на грузинской версии.

D1 migration НЕ НУЖНА.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.3-home-logo-link.js
3. node scripts/stage-12.13.3-home-logo-link-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.3 – Home Logo Link

Commit to main → Push origin.
