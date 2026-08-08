# TuneWrap Stage 10.2 — Track Catalog and Global Queue Audit

Audit date: 2026-08-08  
Migrated catalog: 29 published tracks (13 Stories + 16 Author)

## Before migration

One song was assembled from several independent sources:

| Concern | Previous source |
|---|---|
| MP3 URL | hard-coded map in `playback-engine.js` |
| Track title translations | separate five-language JavaScript table |
| Language and section | HTML attributes plus a second Author-language table |
| Cover, description and duration label | individual HTML card |
| Featured track | hard-coded HTML attribute |
| Global queue | DOM position plus a hand-maintained language rule |
| Search and counters | currently rendered DOM cards |
| Full/Mini Player and Media Session | values recovered again from the active DOM card |

This made one new song require coordinated edits in several places and made a future 1,000-track DOM impractical.

## After migration

- `content/tracks/<stable-id>/` is the only manually maintained source for a song.
- `track.json`, `track.mp3`, optional cover, `lyrics.md` and `translation.md` stay in one package.
- `npm run tracks:build` validates packages and generates `data/track-catalog.json` plus `js/track-catalog.generated.js`.
- The queue contains published playable tracks and is built by section: all `stories` sorted by their section-local numeric `order`, followed by all `author` tracks sorted by their section-local numeric `order`.
- `section` automatically routes a track to Stories or Author.
- `featured` updates the showcase without editing HTML.
- Search reads the entire catalog (title, translated titles, language, section, category and tags), including records not yet rendered.
- Libraries render 24 cards at a time and append the next page near the scroll boundary. A 1,000-track catalog does not create 1,000 artwork/canvas components at startup.
- The persistent audio engine, Full Player, Mini Player and Media Session read the same catalog record.
- `published:false` records remain drafts and are excluded from visitor libraries, search and playback.

## Validation policy

Publishing errors stop the build: missing/invalid ID, title, language or section; duplicate ID; duplicate published `order` inside one section; missing or unreadable MP3; zero duration; non-MP3 codec; invalid configured artwork; duplicate featured record per section. Queue validation also stops the build if its length differs from the published playable count, an ID is duplicated, or a Story appears after the Author boundary.

Human-readable warnings cover optional lyrics/cover and quality deviations. The Stage 10 baseline is MP3, 48 kHz, stereo, at least approximately 128 kbps. Files are never re-encoded automatically. Cover guidance is square, at least 512×512, and no more than 1 MiB for the web copy; the original source can be archived separately.

## Migration integrity

- All 29 Stage 10 MP3 SHA-256 hashes matched the migrated package files.
- The Stage 10.1 migration error was removed: it had copied a language-group playback order into a single global `order`, which made `best-husband-father-ru` the apparent last Story. `order` is now section-local and preserves the explicit Musical Stories catalog sequence.
- The verified global structure is 13 Stories → 16 Author → cyclic return to the first Story.
- No MP3 was modified or re-encoded.
- The old duplicate `assets/audio/` tree is no longer part of the project.

## Stage 10.2 queue protection

- `npm run tracks:test-queue` checks all 29 published playable IDs, exact uniqueness, the Stories/Author boundary, Next/Previous wrap-around, the transition after `best-husband-father-ru`, and arbitrary start positions.
- Language filters, Search and Featured are exercised only as UI queries; the test verifies that none mutates or replaces the canonical queue.
- In-memory future entries prove that a newly added Story remains before the Author boundary and a newly added Author track remains inside the Author block. These mocks never enter production data.
- Full Player, Mini Player, `ended` and Media Session continue to call the same `advance()` function over the one queue returned by Track Catalog.

## Scale acceptance

Synthetic metadata stayed outside the production catalog and was removed after each test.

| Records | In-memory catalog build | Search/filter | Initial page model |
|---:|---:|---:|---:|
| 100 | ≈1.4–1.5 ms | <0.4 ms | 15 matching records (≤24) |
| 500 | ≈4.7–4.8 ms | <0.2 ms | 24 records |
| 1,000 | ≈7.7–9.0 ms | <0.2 ms | 24 records |

A separate mobile Chromium run loaded a synthetic 1,000-track catalog in approximately 940 ms on the test host. The two closed libraries initially contained 48 rendered cards total (24 per section), search found track #847 even though it had never been rendered, and measured browser JavaScript heap use was approximately 4.93 MiB. This verifies that search is catalog-based and initial DOM work is bounded rather than proportional to the full library.
