TUNEWRAP WEB — STAGE 12.7
STORY CATEGORIES + DESKTOP/TABLET FOOTER NAVIGATION

КАТЕГОРИИ — СТАРТОВЫЙ НАБОР
1. День рождения
2. Юбилей
3. Свадьба
4. Любовь
5. Семья
6. Для детей
7. Поздравления
8. О жизни

«О жизни» выбрано вместо «Истории жизни»: короче, музыкальнее и не звучит как архив/анкета.

Категории можно сочетать. Например:
- «Юбилей» + «Семья»;
- «Свадьба» + «Любовь»;
- «День рождения» + «Для детей».

Публично показываются только категории, в которых уже есть опубликованные песни. Поэтому пустые категории не засоряют библиотеку.

ЧТО ДОБАВЛЕНО

1. ADMIN → МУЗЫКА
Возле «Добавить трек» появляется «Категории».
В редакторе Stories-трека — мультивыбор «Категории истории».

2. ADMIN → КАТЕГОРИИ
/admin/categories.html
Можно добавлять, переименовывать RU/UA/GE/EN/DE, автопереводить пустые названия, скрывать, менять порядок, удалять.
При полном удалении категория снимается и с треков.

3. БИБЛИОТЕКА «МУЗЫКАЛЬНЫЕ ИСТОРИИ»
Появляется второй ряд фильтров категорий. Он работает вместе с поиском и языком.
Авторская библиотека не меняется.

4. ПЛЕЕР / ОЧЕРЕДЬ
Не меняются. Категории фильтруют только видимые карточки. Глобальная Stories → Author очередь остаётся прежней.

5. DESKTOP/TABLET FOOTER NAV
Исправляется только >=621px.
Причина: wide CSS делает .app-scroll static + overflow:visible, но обработчик пытался прокручивать appScroll. Теперь desktop прокручивает window, phone <=620 продолжает использовать существующий appScroll.

D1 MIGRATION
migrations/0008_story_categories.sql
Добавляет tracks.story_category_ids_json, story_categories_config и storyCategoriesSchemaVersion=1.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.7-story-categories.js
3. npx.cmd wrangler d1 execute tunewrap-catalog --remote --file=./migrations/0008_story_categories.sql
4. npx.cmd wrangler d1 execute tunewrap-catalog --remote --command="SELECT key,value FROM cms_meta WHERE key='storyCategoriesSchemaVersion';"
   Ожидается: storyCategoriesSchemaVersion | 1
5. node scripts/story-categories-test.js
6. npm.cmd test
7. npx.cmd wrangler pages functions build
8. Restore _worker.bundle.
9. GitHub Desktop Summary: Stage 12.7 – Story Categories + Desktop Navigation
10. Commit to main → Push origin.

PRODUCTION CHECK
A. Desktop footer: Philosophy / How / Stories / Pricing / Author / Order / Wedding / Contacts / Payment.
B. Phone: 2–3 footer links unchanged.
C. Admin → Music → Categories loads.
D. Assign 1–2 categories to one published Stories track and save.
E. Public Stories library shows only categories that already contain published songs.
