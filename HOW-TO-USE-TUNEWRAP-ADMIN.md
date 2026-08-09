# How to use TuneWrap Admin Studio

Admin Studio is intentionally separate from the public navigation. Open the confirmed `/admin/` address and sign in through Cloudflare Access.

## Add and publish a track

1. Tap **Добавить трек**.
2. Enter the title, section (`Musical Stories` or `Author Songs`) and language (`GE`, `UA`, `EN`, `DE`, `RU`).
3. Add optional artist, album, category and comma-separated tags.
4. Select the MP3. The browser checks that it can read metadata and records duration. Upload limit: 80 MB.
5. Select an optional JPEG/PNG/WebP cover. Minimum 600×600, close to square, maximum 8 MB. Without it, the TuneWrap fallback artwork remains visible.
6. Add story, lyrics and translation. Paragraphs and line breaks are preserved.
7. Under **Локализация и параметры**, optionally add five interface titles/descriptions, choose Featured, or inspect the section-local order.
8. Use **Предпросмотр** before publishing.
9. Choose **Сохранить черновик** or **Опубликовать**.

A draft never appears in public libraries, Search, Featured cards, counters or playback. Publishing validates title, section, language, positive section order and MP3 URL. A successful publication is available through `/api/tracks` without a build, Git commit or deployment.

## Stable ID

For a new record the server creates an ID once from its initial title and language. The ID does not change when the title is edited. This preserves playback state, links, Media Session metadata and future analytics identity.

## Edit an existing track

Tap the pencil button in the catalog row. Metadata edits keep the same ID. Selecting a new MP3 or cover creates a versioned R2 object and updates the D1 record only after upload succeeds. The existing public record remains valid if an upload fails.

Replacing media does not create a second Audio element and does not alter Full Player, Mini Player, seek/fade, Media Session or the global queue implementation.

## Order and Featured

Use the ↑/↓ controls to move a track inside its own section. The server performs a two-phase atomic reorder through temporary high positive positions, preventing collisions while swapping positions.

The public queue is always:

1. every published playable Story in `order`;
2. every published playable Author track in `order`;
3. cyclic return to the first Story.

Filters and Search never create another playback queue. Setting Featured replaces the previous Featured record only inside that section.

## Unpublish, archive and delete

Open **Архив и удаление** in the editor.

- **Снять с публикации**: returns a track to Draft; assets and metadata remain.
- **Архивировать**: hides the record from the standard Admin list and from public UI.
- **Удалить безвозвратно**: hidden destructive action; requires typing the exact stable ID and removes D1 metadata plus all R2 objects in the track prefix.

Prefer unpublish or archive. Hard delete cannot be undone without a backup.

## Backup and import

At the bottom of the dashboard open **Резервная копия и восстановление**.

- **Экспорт JSON** downloads all current records, including drafts and archived tracks.
- **Выбрать backup** accepts a Stage 11 `schemaVersion: 2` file.
- **Проверить импорт** validates every record and reports create/update/outside-backup counts.
- Applying an import requires an additional confirmation.

## If something fails

- Publication error: correct the visible field list; the track remains a safe draft.
- MP3 metadata error: verify the file is a real browser-readable MP3.
- Upload error: retry on a stable connection; the previous public media URL is not replaced.
- Access error: ask the Cloudflare administrator to verify the identity policy; do not add passwords to frontend code.
- Public catalog error: verify `/api/tracks`, D1 bindings and applied migrations.
