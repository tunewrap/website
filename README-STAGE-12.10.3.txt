TUNEWRAP — STAGE 12.10.3
LEGACY DRAG TEST SYNTAX FIX

Текущая ошибка:
SyntaxError: Invalid regular expression flags

Причина:
в предыдущем test-maintenance hotfix был неверно экранирован "/" внутри
JavaScript RegExp literal. Node останавливался ещё до запуска проверки.

12.10.3 исправляет это окончательно:
- проблемные проверки путей переведены на безопасный string.includes(...);
- все 3 legacy drag-теста после установки автоматически проходят node --check;
- runtime не меняется.

Меняются только:
scripts/music-curation-admin-test.js
scripts/stage-12.9.1-drag-reorder-test.js
scripts/stage-12.9.2-continuous-drag-test.js

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/fix-legacy-drag-test-syntax.js
3. npm.cmd test

Build повторять НЕ нужно.

Если npm test полностью PASS:
GitHub Desktop Summary:
Stage 12.10 – Package UI Polish + Test Maintenance
Commit to main -> Push origin.
