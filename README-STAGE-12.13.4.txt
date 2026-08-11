TUNEWRAP — STAGE 12.13.4
FEATURED PLAY — NO AUTO FULLSCREEN

Проблема:
На мобильной главной карточка первой / Featured песни в:
- Musical Stories
- Author / Originals

при обычном нажатии сразу открывала Full Player на весь экран.

Это ломает ощущение просмотра сайта:
пользователь просто хотел включить песню, а весь интерфейс закрывался плеером.

Исправление:
нажатие по Featured Story или Featured Author теперь:
- первый тап → запускает трек;
- повторный тап → pause;
- ещё один → play;
- Mini Player появляется как обычно;
- Full Player автоматически НЕ открывается.

Full Player НЕ удалён.
Если пользователь сам хочет раскрыть песню:
- нажимает на Mini Player / Expand;
- получает тот же полный экран с обложкой, историей, текстом песни,
  перемоткой, Previous / Next и т.д.

Что НЕ меняется:
- карточки внутри полной библиотеки по-прежнему могут открывать Full Player;
- глобальная очередь;
- Next / Previous;
- Media Session;
- Mini Player;
- seek;
- autoplay следующего трека;
- Stories / Author curation.

Изменение единое для обеих главных Featured-карточек,
потому что обе используют [data-featured-track].

D1 migration НЕ НУЖНА.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.4-featured-play-no-fullscreen.js
3. node scripts/stage-12.13.4-featured-play-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.13.4 – Featured Play No Fullscreen

Commit to main → Push origin.

После деплоя проверить на телефоне:
1. Stories → нажать Featured Story.
   Песня играет, остаёмся на экране Stories.
2. Нажать её ещё раз.
   Пауза, Full Player не открывается.
3. Originals → то же самое с Featured Author.
4. Нажать появившийся Mini Player.
   Вот здесь Full Player должен открыться — это осознанное действие пользователя.
