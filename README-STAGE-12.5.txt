TUNEWRAP WEB — STAGE 12.5: SOUND PREFERENCES CMS

ЦЕЛЬ
Сделать стили и музыкальное звучание полностью управляемыми из Admin Studio.

ADMIN STUDIO
Новая вкладка:
Музыка | Заказы | Стоимость | Сайт | Звучание

В «Звучание»:
- добавить стиль одной строкой;
- добавить инструмент/тип звучания одной строкой;
- включить / выключить;
- удалить;
- поменять порядок;
- выбрать иконку;
- задать английскую Suno / prompt формулировку;
- RU / UA / GE / EN / DE;
- автоперевод текущего языка во все остальные;
- Save → изменения сразу на публичном сайте без GitHub/deploy.

PUBLIC FORM
1. Стили теперь загружаются из D1 Sound CMS.
2. Можно смешать максимум 5 стилей.
3. Ниже появляется обязательное поле «Инструменты и звучание».
4. Можно выбрать максимум 5 инструментов/вариантов.
5. «На усмотрение TuneWrap» — эксклюзивный вариант: при выборе снимает остальные.
6. И стили, и инструменты имеют золотые SVG-иконки.
7. Выбор сохраняется при переключении языка.
8. Если Sound API недоступен, встроенные старые стили остаются как безопасный fallback; музыкальный сайт не ломается.

ORDERS CRM
Новая заявка сохраняет:
- styles;
- instruments;
- soundPrompt.

В Admin Orders видно:
- Стиль;
- Инструменты;
- Suno-основа.

Пример:
Funk, R&B; drums, electric bass, brass section, modern synths

Это snapshot на момент заказа — последующие изменения названий в CMS не меняют уже полученную заявку.

СТАРТОВЫЙ НАБОР
Стили: Pop, Disco, Funk, Rock, Hip-Hop, R&B, Soul, Trap, Indie, Jazz, Synthwave,
Electronic, Dance, House, Techno, Industrial, Symphonic, Cinematic Pop, Acoustic,
Metal, Hardcore, Balkan Brass.

Звучание: TuneWrap choice, Piano, Grand Piano, Drums, Electronic Drums, Bass Guitar,
Acoustic Guitar, Electric Guitar, Cello, Violin, String Section, Saxophone, Brass,
Trumpet, Synths, Electronic Keys, Orchestral Percussion, Ethnic Instruments,
Electronic Dance Sounds.

D1 MIGRATION
0006_sound_preferences_cms.sql:
- sound_preferences_config;
- orders.instruments_json;
- orders.sound_prompt.

УСТАНОВКА
1. Распаковать ZIP поверх корня website.
2. Выполнить:
   node scripts/install-stage-12.5-sound-cms.js
3. Выполнить удалённую D1 migration:
   npx.cmd wrangler d1 execute tunewrap-catalog --remote --file=./migrations/0006_sound_preferences_cms.sql
4. Проверить:
   npx.cmd wrangler d1 execute tunewrap-catalog --remote --command="SELECT id,schema_version,updated_at,last_edited_by FROM sound_preferences_config;"
5. Тест:
   node scripts/sound-preferences-cms-test.js
6. Общий тест:
   npm.cmd test
7. Build:
   npx.cmd wrangler pages functions build
8. Восстановить служебный _worker.bundle.
9. GitHub Desktop:
   Stage 12.5 – Sound Preferences CMS
   Commit to main → Push origin.

ПРОВЕРКА PRODUCTION
- /admin/sound.html открывается через Cloudflare Access.
- Добавить тестовый стиль → Save → публичная форма показывает его без deploy.
- В анкете выбрать 2–5 стилей.
- Выбрать инструменты.
- Без инструментов обычная заявка не отправляется.
- В Orders новая заявка показывает инструменты и Suno-основу.
