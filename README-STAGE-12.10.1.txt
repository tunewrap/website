TUNEWRAP — STAGE 12.10.1
REFRESH-TOP TEST HARNESS FIX

Что произошло:
- Stage 12.10 runtime/build собрался успешно.
- npm test остановился на старом тесте Stage 12.8.5.
- Ошибка НЕ в Stage 12.10 и НЕ в функции refresh-to-top.
- В старом тесте были неверно удвоены обратные слэши внутри RegExp.

Например было:
  /Stage 12\\.8\\.5 — desktop refresh starts at top/

А должно быть:
  /Stage 12\.8\.5 — desktop refresh starts at top/

Этот hotfix исправляет только scripts/stage-12.8.5-refresh-top-test.js.
Runtime, UI, Pricing, Orders, D1, Player не меняются.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/fix-stage-12.8.5-refresh-top-test.js
3. npm.cmd test

Если npm test проходит — build уже повторять не нужно, потому что Stage 12.10 build на скрине уже был:
Compiled Worker successfully

После этого можно Commit / Push Stage 12.10 вместе с test fix.
