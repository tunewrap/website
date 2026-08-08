# HOW TO ADD A NEW TUNEWRAP TRACK

1. Create a folder in `content/inbox/` named with a stable ID, for example `night-and-word-ge`.
2. Add `track.mp3`.
3. Add `cover.webp` if available. Without it, TuneWrap uses the branded fallback.
4. Fill in `track.json`:

```json
{
  "id": "night-and-word-ge",
  "title": "ღამე და სიტყვა",
  "titles": {
    "ka": "ღამე და სიტყვა",
    "en": "Night and Word"
  },
  "section": "stories",
  "language": "GE",
  "artist": "TuneWrap",
  "album": "TuneWrap · Musical Stories",
  "category": {
    "en": "Love"
  },
  "tags": ["love", "night"],
  "order": 14,
  "featured": false,
  "published": true
}
```

5. Optionally add `lyrics.md` and `translation.md`.
6. Run `npm run tracks:import`.
7. Release only after the command prints `VALID` and `npm test` passes.

Do not edit `index.html`, the playback queue, Full Player, Mini Player, counters or Media Session metadata for an individual track. The catalog build updates them automatically.

`order` is explicit and local to `section`, not global across the whole catalog. A new Musical Story receives its intended position among other `stories`; a new creator track receives its intended position among other `author` records. The generated playback queue is always:

1. every published playable `stories` track sorted by `order`;
2. every published playable `author` track sorted by `order`;
3. then a cyclic return to the first Story.

The same `order` number may be used once in each section. Duplicating an order inside one section fails import/build validation. Run `npm run tracks:test-queue` to print and validate the canonical 29-track queue without starting the application.

Use `"published": false` for a draft. Drafts stay in the content catalog but do not appear in libraries, search or playback.
