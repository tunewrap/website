TUNEWRAP — STAGE 12.13.1
LANGUAGE CODES — NO TRANSLATE

Проблема:
Chrome / Google Translate переводит короткие коды интерфейса:
RU → РУ
UA → УА
EN → ЕН
DE → ДЕ

Это выглядит неправильно для международного переключателя языка.

Исправление:
все языковые переключатели получают:
translate="no"
class="notranslate"

Поэтому даже если пользователь включает автоматический перевод страницы,
переключатель остаётся:
RU / UA / GE / EN / DE

Также от перевода защищены:
- мобильный переключатель;
- язык в окне пакета;
- фильтры языков библиотеки;
- язык featured track;
- бренд TuneWrap.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.1-language-codes-no-translate.js
3. node scripts/stage-12.13.1-language-codes-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

D1 migration НЕ НУЖНА.

GitHub Desktop Summary:
Stage 12.13.1 – Language Codes No Translate
