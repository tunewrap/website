TUNEWRAP WEB — STAGE 12.9.1
DRAG REORDER HOTFIX

Проблема
Стрелки ↑ ↓ работали, а drag & drop визуально не работал.

Причина
Stage 12.9 использовал нативный HTML5 `draggable=true` на всей строке.
В Chrome он конфликтует с вложенной обложкой/элементами строки и не даёт
стабильного пользовательского перетаскивания.

Исправление
Нативный drag больше не используется.

Теперь:
- слева у каждого трека золотая ручка ⠿;
- зажать ручку мышкой и тянуть;
- строка перемещается прямо во время движения;
- работает через Pointer Events:
  mouse / touchpad / touch;
- при отпускании новый порядок остаётся на экране;
- кнопка «Сохранить порядок» становится активной;
- после нажатия «Сохранить порядок» используется тот же существующий
  /api/admin/reorder и tracks.sort_order.

Стрелки ↑ ↓ остаются и продолжают работать.

Stories и Author работают независимо.

D1 migration НЕ НУЖНА.

Установка
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.9.1-drag-reorder-hotfix.js
3. node scripts/stage-12.9.1-drag-reorder-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. Restore _worker.bundle.
7. GitHub Summary:
   Stage 12.9.1 – Drag Reorder Hotfix
8. Commit to main → Push origin.

Production check
1. Admin → Музыка → Порядок и витрина.
2. В Stories зажать золотую ручку ⠿ слева у трека.
3. Перетащить трек через 2–3 позиции.
4. Отпустить.
5. «Сохранить порядок» должна стать активной.
6. Сохранить.
7. Повторить в Author.
