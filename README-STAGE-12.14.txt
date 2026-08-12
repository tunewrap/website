TUNEWRAP — STAGE 12.14
ADMIN EDITOR RELIABILITY

ПРОБЛЕМА
В редакторе опубликованного трека:
- «Сохранить черновик» выглядело как будто не работает;
- «Опубликовать» выглядело как будто не работает;
- после попытки сохранения переставал работать «Предпросмотр».

НАЙДЕНА ПРИЧИНА
admin/admin.js делал так:

1. setBusy(true)
2. отключал ВСЕ кнопки Admin Studio
3. ДО сохранения запускал autoTranslateMissing(track)
4. autoTranslateMissing последовательно переводил все отсутствующие языки через Workers AI
5. только ПОСЛЕ окончания AI начинался PATCH / upload / publish

Для старых треков с неполной локализацией это могло означать много AI-запросов.
Пока они выполнялись, Preview тоже был disabled.
Если AI задерживался или падал, обычное редактирование выглядело сломанным.

ИСПРАВЛЕНИЕ
- Save Draft сначала сохраняет реальные изменения.
- Publish сначала сохраняет / загружает медиа / публикует.
- Workers AI больше НЕ находится в критическом пути сохранения.
- Недостающие переводы запускаются только ПОСЛЕ успешного сохранения как background best-effort.
- Ошибка AI больше не отменяет сохранённый текст/обложку/публикацию.
- Background перевод не перезаписывает локализацию, которую пользователь успел изменить позже.
- Preview не блокируется режимом busy.
- setBusy теперь восстанавливает исходное disabled-состояние кнопок, а не безусловно включает все.
- /admin/admin.js получает ?v=12.14, чтобы Chrome не держал старую JS-версию.

НЕ МЕНЯЕТСЯ
- D1 schema
- Track API schema
- R2 upload routes
- Public Player
- Audio / Queue / Seek
- Public I18N
- Pricing / Site / Sound CMS
- Orders
- Access policy

УСТАНОВКА
1. Распаковать ZIP поверх папки website.
2. Выполнить:
   node scripts/install-stage-12.14-admin-editor-reliability.js
3. Затем:
   node scripts/stage-12.14-admin-editor-reliability-test.js
4. Затем:
   npm.cmd test
5. Затем:
   npx.cmd wrangler pages functions build
6. После Compiled Worker successfully восстановить _worker.bundle.
7. GitHub Desktop:
   Summary: Stage 12.14 – Fix Admin Editor Save Publish Preview
   Commit to main -> Push origin

D1 MIGRATION НЕ НУЖНА.

ПОСЛЕ DEPLOY
Открыть /admin/ с Ctrl+F5.
Редактировать существующий трек:
1. изменить несколько слов текста;
2. выбрать новую обложку;
3. нажать Предпросмотр — sheet должен открыться сразу;
4. нажать Сохранить черновик — изменения должны сохраниться независимо от Workers AI;
5. снова открыть трек и проверить;
6. затем Опубликовать.
