TUNEWRAP — STAGE 12.13.8 CLEAN TEST REPLACEMENT

Это НЕ новый production stage.
Этот ZIP заменяет только один устаревший тест:

scripts/stage-12.11-contact-channel-test.js

Почему:
старый тест всё ещё проверял удалённую реализацию regex
v.match(/^(WhatsApp|Telegram|Email):...)

Рабочий сайт уже давно использует безопасный parser:
- split по первому ":"
- определение email / whatsapp / telegram
- Telegram поддерживает @username и t.me links

Production-файлы не меняются.
Player / CMS / API / D1 / Queue / Audio не меняются.

КАК ПРИМЕНИТЬ
1. Распаковать ZIP прямо поверх папки website.
2. Согласиться заменить существующий файл.
3. Выполнить:
   node scripts/stage-12.11-contact-channel-test.js
4. Если PASS:
   npm.cmd test
