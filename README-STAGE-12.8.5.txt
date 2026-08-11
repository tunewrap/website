TUNEWRAP WEB — STAGE 12.8.5
DESKTOP REFRESH STARTS AT TOP

Проблема
Chrome на компьютере запоминал #contactHub / старую позицию прокрутки. После F5 сайт снова открывался внизу.

Исправление
Только desktop/tablet >=621px при browser reload:
- временно отключается scroll restoration;
- старый hash убирается;
- window и appScroll ставятся в начало;
- reset повторяется после layout/load;
- затем стандартный scrollRestoration возвращается.

Phone <=620px не меняется. Обычные клики по разделам и прямые ссылки при первом открытии не меняются.
D1 migration не нужна.

Установка
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.8.5-refresh-top.js
3. node scripts/stage-12.8.5-refresh-top-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. Restore _worker.bundle.
7. GitHub Summary: Stage 12.8.5 – Desktop Refresh Starts Top
8. Commit to main → Push origin.
