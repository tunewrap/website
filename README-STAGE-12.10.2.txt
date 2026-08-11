TUNEWRAP — STAGE 12.10.2
LEGACY DRAG TESTS FIX

Причина текущей ошибки:
Сейчас npm test падает на music-curation-admin-test.js с:
  expected: /draggable=true/

Это старый тест Stage 12.9.

В Stage 12.9 первоначально использовался native HTML5 drag:
  row.draggable = true
  dragstart / drop

Но затем мы сознательно заменили его:
- 12.9.1 -> Pointer Events
- 12.9.2 -> continuous drag
- 12.9.3 -> настоящий hold-and-drag с отдельным placeholder

Именно 12.9.3 сейчас работает в проде и уже был проверен вручную:
трек можно держать и тянуть через много позиций.

Поэтому старый тест требует функцию, которую мы НАМЕРЕННО удалили.
Это не поломка runtime.

Этот hotfix сразу обновляет ВСЕ три устаревших drag-теста:
- scripts/music-curation-admin-test.js
- scripts/stage-12.9.1-drag-reorder-test.js
- scripts/stage-12.9.2-continuous-drag-test.js

Чтобы npm test не останавливался далее по цепочке на следующем старом assertion.

Они теперь проверяют финальную архитектуру 12.9.3:
- Pointer Events
- pointer capture
- floating real row
- separate placeholder
- continuous drag
- edge auto-scroll
- arrows fallback
- /api/admin/reorder
- featured track logic

НЕ МЕНЯЕТСЯ:
- admin/curation.js
- UI
- API
- D1
- Player
- Pricing
- Stage 12.10 runtime

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/fix-legacy-drag-tests.js
3. npm.cmd test

Build повторять не нужно — меняются только тестовые файлы.

Если npm test полностью PASS:
GitHub Desktop Summary:
  Stage 12.10 – Package UI Polish + Test Maintenance
Commit to main -> Push origin.
