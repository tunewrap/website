TUNEWRAP WEB — STAGE 12.5.1: COMPACT SOUND CHIPS HOTFIX

ПРОБЛЕМА
После Stage 12.5 стили и инструменты на публичной анкете превратились в большие карточки с крупными SVG-пиктограммами.

ИСПРАВЛЕНИЕ
- большие картинки/пиктограммы на публичной анкете убраны;
- стили снова компактные маленькие кнопки-чипы;
- инструменты отображаются такими же компактными чипами;
- выбранное состояние, лимит 5, D1 Sound CMS, переводы и Orders/Suno данные остаются без изменений;
- Admin Sound CMS не меняется.

ИЗМЕНЕНО
js/sound-preferences-runtime.js
css/sound-preferences.css

НОВОЕ
scripts/compact-sound-chips-test.js
README-STAGE-12.5.1.txt
STAGE-12.5.1-CHANGED-FILES.txt

D1 migration не нужна.

УСТАНОВКА
1. Распаковать ZIP поверх корня website с заменой.
2. node scripts/compact-sound-chips-test.js
3. npm.cmd test
4. npx.cmd wrangler pages functions build
5. restore _worker.bundle
6. GitHub Desktop: Stage 12.5.1 – Compact Sound Chips
