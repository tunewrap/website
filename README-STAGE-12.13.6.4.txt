TUNEWRAP — STAGE 12.13.6.4
MINI PLAYER CLOSE GLYPH

ПРОБЛЕМА
В верхнем Mini Player справа отображался круг кнопки закрытия, но сам крестик × исчез.

ИСПРАВЛЕНИЕ
CSS-only hotfix:
- возвращает видимый символ × через #topMiniStop::before;
- не меняет click/stop/close behavior;
- playback-engine остаётся владельцем поведения кнопки;
- добавлен focus-visible outline.

НЕ МЕНЯЕТСЯ
Player logic / Queue / Seek / CMS / API / D1 / Admin / загрузка сайта.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.6.4-mini-player-close-glyph.js
3. node scripts/stage-12.13.6.4-mini-player-close-glyph-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS восстановить _worker.bundle.

GitHub Desktop Summary:
Stage 12.13.6.4 – Mini Player Close Glyph

Commit to main → Push origin.
