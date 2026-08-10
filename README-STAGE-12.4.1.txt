TUNEWRAP WEB — STAGE 12.4.1: MINI SEEK HOTFIX

ПРОБЛЕМА
Mini Player показывал прогресс трека, но ручное перетаскивание бегунка не переводило воспроизведение.

ИСПРАВЛЕНИЕ
Mini Player больше не имеет отдельной логики перемотки.
Он передаёт пользовательский seek в уже проверенный Full Player seek pipeline:
- drag пальцем;
- drag мышью;
- клик по полосе;
- клавиши стрелок/Home/End.

Так сохраняется один playback engine и одна логика seek.

ИЗМЕНЕНО
- js/ux-critical-fixes.js
- css/ux-critical-fixes.css

НОВОЕ
- scripts/mini-seek-hotfix-test.js
- README-STAGE-12.4.1.txt

D1 migration не нужна.
Audio engine / catalog / queue / orders / pricing не меняются.

УСТАНОВКА
1. Распаковать ZIP поверх website с заменой.
2. node scripts/mini-seek-hotfix-test.js
3. npm.cmd test
4. npx.cmd wrangler pages functions build
5. Восстановить служебный _worker.bundle, как раньше.
6. GitHub Desktop:
   Stage 12.4.1 – Mini Seek Hotfix
   Commit to main → Push origin.
