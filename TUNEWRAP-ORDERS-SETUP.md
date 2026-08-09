# TuneWrap Stage 12 — Orders / Story Requests CRM

## Что добавлено

Stage 12 не меняет Track Catalog, Global Queue, Player, R2 music upload или публикацию музыки.

Новый поток:

Клиентская форма на сайте
→ POST /api/orders
→ D1 table `orders`
→ /admin/orders.html
→ статус / заметки / работа с заявкой

## Статусы

- `new` — новая
- `in_progress` — в работе
- `waiting_client` — ожидает клиента
- `done` — готово
- `archived` — архив

## Перед deployment: D1 migration

Открой Cloudflare → D1 → `tunewrap-catalog` → Console.

Открой файл:

`migrations/0003_orders.sql`

Скопируй весь файл и выполни его один раз.

Проверка:

```sql
SELECT name
FROM sqlite_master
WHERE type='table' AND name='orders';
```

Должна появиться строка `orders`.

## Установка файлов

Распакуй ZIP поверх корня `website`.

Добавляются:
- admin/orders.html
- admin/orders.css
- admin/orders.js
- functions/_shared/orders.js
- functions/api/orders.js
- functions/api/admin/orders/index.js
- functions/api/admin/orders/[[id]].js
- js/orders-submit.js
- migrations/0003_orders.sql
- scripts/orders-crm-test.js
- TUNEWRAP-ORDERS-SETUP.md
- STAGE-12-CHANGED-FILES.txt

Заменяются:
- admin/admin.js
- js/app-bootstrap.js
- package.json

## Локальная проверка

PowerShell из папки `website`:

```powershell
npm.cmd test
npx.cmd wrangler pages functions build
```

Ожидаем:
- старые music tests PASS;
- `PASS: Stage 12 Orders CRM contract ...`;
- `Compiled Worker successfully`.

## GitHub Desktop

Summary:

`Stage 12 – Orders and Story Requests CRM`

Commit to main → Push origin.

Дождись зелёного Cloudflare deployment.

## Проверка после deployment

1. Открой обычный сайт.
2. Заполни тестовую заявку.
3. Нажми «Сформировать заявку».
4. Под кнопкой должно появиться:
   `Заявка сохранена. Номер: TW-...`
5. Открой:
   `/admin/orders.html`
6. В разделе «Новые» должна появиться эта заявка.
7. Открой её.
8. Поменяй статус на «В работе».
9. Добавь внутреннюю заметку.
10. Нажми «Сохранить».
11. Обнови страницу — статус и заметка должны сохраниться.

## Защита существующей музыки

`js/orders-submit.js` загружается отдельным try/catch в `app-bootstrap.js`.

Если CRM/API заказов когда-либо временно сломается, Track Catalog и Player не должны из-за этого показывать экран «Библиотека недоступна».

## Что специально НЕ входит в Stage 12

- оплата;
- автоматические письма;
- Telegram/WhatsApp bot;
- создание музыкального Draft из заказа;
- клиентский кабинет;
- удаление заказов.

Это можно делать отдельными Stage после проверки базового CRM.
