TUNEWRAP WEB — STAGE 12.5.2: UNLIMITED INSTRUMENTS

ИЗМЕНЕНИЕ
- Стили: по-прежнему максимум 5.
- Инструменты и звучание: без ограничения количества.
- Можно выбрать хоть всю оркестровую палитру.
- «На усмотрение TuneWrap» остаётся эксклюзивным вариантом и снимает остальные.
- Поле инструментов остаётся обязательным: нужно выбрать хотя бы один вариант или «На усмотрение TuneWrap».
- Все выбранные инструменты сохраняются в Orders.
- Suno-основа сохраняет полный набор выбранного звучания.

ТЕХНИЧЕСКАЯ ЗАЩИТА
Публичного лимита нет. Сервер сохраняет до 80 элементов — это внутренний safety ceiling CMS, а не ограничение для клиента.

D1 migration НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх корня website.
2. node scripts/install-stage-12.5.2-unlimited-instruments.js
3. node scripts/unlimited-instruments-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. restore _worker.bundle
7. GitHub Desktop:
   Stage 12.5.2 – Unlimited Instruments
