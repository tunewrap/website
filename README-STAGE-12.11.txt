TUNEWRAP — STAGE 12.11
CONTACT CHANNEL SELECTOR

Задача
Сейчас в анкете одно поле:
«Telegram, WhatsApp или телефон».

Проблема:
после заявки в Admin видно только введённое значение,
но не всегда понятно, ГДЕ клиент хочет получить ответ.

Решение
В анкете появляется обязательный выбор из 3 кнопок:

[ WhatsApp ] [ Telegram ] [ Email ]

После выбора активируется поле ввода.

WhatsApp:
- ожидает номер телефона.

Telegram:
- принимает @username;
- t.me/username;
- или номер Telegram.

Email:
- ожидает e-mail.

Если способ связи не выбран, поле ввода заблокировано.

Что сохраняется в Orders
Отдельную D1 колонку создавать не нужно.

Мы используем существующий orders.contact:
WhatsApp: +995 555 00 00 00
Telegram: @username
Email: name@example.com

Поэтому в Admin сразу видно:
- каким способом связаться;
- сам контакт.

Admin уже показывает order.contact в списке и карточке заявки,
поэтому дополнительная переделка Admin не требуется.

Поддерживаются RU / UA / GE / EN / DE.

Работает также для подарочного сертификата,
потому что контакт покупателя остаётся обязательным.

НЕ МЕНЯЕТСЯ:
- Orders API contract;
- D1 schema;
- Pricing;
- Music;
- Player;
- payment logic.

Установка
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.11-contact-channel-selector.js
3. node scripts/stage-12.11-contact-channel-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.11 – Contact Channel Selector

Commit to main -> Push origin.

Проверка
1. Открыть анкету.
2. Поле контакта сначала неактивно.
3. Выбрать Telegram.
4. Ввести @username.
5. Заполнить обязательные поля и создать заявку.
6. В Admin должно быть:
   Telegram: @username

Повторно проверить WhatsApp и Email при желании.
