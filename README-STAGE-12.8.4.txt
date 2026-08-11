TUNEWRAP WEB — STAGE 12.8.4
CORPORATE CARD CLOSE

Что исправлено

Проблема:
на корпоративном окне «Закрыть» всё ещё оставалось слева в верхней панели.

Теперь:
- существующая кнопка #corporatePanelClose физически переносится внутрь .corporate-box;
- desktop/tablet: X + «Закрыть» прямо на карточке справа сверху;
- phone: круглый X справа сверху на карточке;
- TuneWrap остаётся по центру верхней панели;
- «Для компаний» остаётся справа в верхней панели.

ВАЖНО:
новой логики закрытия нет.
Используется та же существующая кнопка, поэтому старый проверенный обработчик
corporatePanelClose продолжает работать.

D1 migration НЕ НУЖНА.

Что не меняется:
- Corporate pricing logic;
- Telegram link;
- Orders;
- Pricing CMS;
- Gift Certificate;
- Music/Author libraries;
- Player;
- D1.

Установка
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.8.4-corporate-card-close.js
3. node scripts/stage-12.8.4-corporate-card-close-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. Restore _worker.bundle.
7. GitHub Summary:
   Stage 12.8.4 – Corporate Card Close
8. Commit to main → Push origin.

Production check
- открыть «Для компаний»;
- слева сверху кнопки закрытия больше нет;
- X / «Закрыть» находится прямо на corporate-card справа сверху;
- на телефоне там же круглый X.
