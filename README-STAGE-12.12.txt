TUNEWRAP WEB — STAGE 12.12
CONTACT CENTERING + PAYMENT VISIBILITY + HOMEPAGE NEWS CMS

1. Контакты / соцсети
Активные иконки теперь всегда центрируются как одна группа.
Если включено 3 — три стоят по центру.
Если 2, 4, 5, 6 — группа также остаётся симметричной.
Работает phone / tablet / desktop.

2. Способы оплаты
В Site CMS эта логика уже существовала: payment.enabled=false скрывается публично.
Теперь переключатель в Admin подписан явно:
«Показывать на сайте».

Снял галочку → Сохранить → способ оплаты исчез.
Вернул галочку → Сохранить → снова появился.

3. Новости / уведомление на главной
Admin → Сайт получает блок №10:
- Показывать на главной;
- Показывать с;
- Показывать до;
- Метка (НОВОСТИ / ВАЖНО / АКЦИЯ);
- Заголовок;
- Текст.

Объявление показывается в Hero на первой странице.
Диапазон дат включительный.
Если даты пустые — показывается постоянно, пока включён toggle.
После даты «до» автоматически скрывается.

Тексты объявления хранятся в существующих Site CMS locales,
поэтому текущая кнопка «Автоперевести язык» переводит их RU/UA/GE/EN/DE.

D1 migration НЕ НУЖНА:
announcement хранится внутри существующего site_content_config.config_json.

НЕ ТРОГАЕТ:
Music / Player / Orders / Pricing / Sound / Payment gateway.

Установка:
1. Распаковать поверх website.
2. node scripts/install-stage-12.12-site-polish.js
3. node scripts/stage-12.12-site-polish-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.12 – Contact Payment News CMS

Commit to main → Push origin.
