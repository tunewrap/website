# TuneWrap Stage 10 — Playback and Audio Quality Audit

Audit date: 2026-08-08  
Catalog: 29 MP3 files (13 Musical Stories + 16 Author Songs)

## Executive conclusion

**Author-sound conclusion: Option A — the measurable difference is in individual source MP3 masters, not in a separate Author playback path.**

- The perceived sound difference is in the source masters. All files use the same MP3 codec, 48 kHz stereo layout and the same browser delivery path, but their loudness, true peak, dynamic range, bitrate mode and encoder generations vary. Author Songs span **−15.3 to −11.7 LUFS** (3.6 LU), while Musical Stories span **−14.7 to −12.8 LUFS** (1.9 LU). No browser EQ, compressor, limiter or category-specific processing was found.
- The clearest Author outliers are `tbilisi-ua.mp3` (quietest at −15.3 LUFS), `shliakhu-nazad-nema.mp3` (loudest at −11.7 LUFS), and `novyi-polit.mp3` (true peak close to the ceiling at −0.2 dBFS). If tonal/quality matching remains necessary, these should be checked first against lossless or higher-quality original masters. They were not re-encoded here.
- Separately, the background stop after a track ended was an architectural site issue. The previous implementation used 29 media elements and moved to the next one only after animation/fade timers. Android background throttling can interrupt that cross-element hand-off. Stage 10 replaces it with one persistent media element and a synchronous `ended` transition.
- Delivery can still affect seek/start behavior if the production CDN does not return byte ranges. The local static server returned the correct `audio/mpeg` type and full `Content-Length`, but returned `200` rather than `206` for a Range request. The player therefore retains a one-time Blob fallback for an active track when a requested position is not seekable.

No MP3 was re-encoded or modified. No runtime EQ or loudness normalization was added.

## Playback architecture before Stage 10

- 29 independent `<audio>` elements, each with `preload="none"`.
- Multiple overlapping controllers for card playback, Full Player, Mini Player and fullscreen libraries.
- One Web Audio graph could be created per previously played track for the card analyser.
- Automatic next track used a 180 ms UI animation, a gain fade and a programmatic click before another media element started.
- No Media Session API metadata or action handlers.
- Language filtering did not intentionally alter the queue, but the playback lifecycle was distributed across several controllers.

## Playback architecture after Stage 10

- One persistent `#tuneWrapAudioEngine` for all 29 tracks.
- One catalog-wide cyclic queue: GE → UA → EN → DE → RU → Author → GE.
- `ended` changes source and requests playback synchronously on the same element, without waiting for UI animation or timers.
- Full Player, Top Mini Player, legacy mobile controls, cards and Media Session use the same playback state.
- Next-track prefetch uses a single lightweight `<link rel="prefetch" as="audio">`; it does not create a second Audio element.
- Media Session provides title, artist/section, artwork, play, pause, previous, next, ±10-second seek, absolute seek and stop actions, plus position state.
- A failed media request advances once through the global queue and is bounded by the catalog size, preventing an infinite retry loop.
- Seek uses the direct source whenever the browser exposes a valid seekable range. Blob fallback is created once for the active track, reused for subsequent seeks and revoked on track change/page exit.
- No visibility handler pauses, recreates or resets playback.

## File-level measurements

Method: `ffprobe` stream/container inspection and FFmpeg EBU R128 analysis with true-peak measurement. Packet-size sampling was used to distinguish CBR from VBR. MP3 has no fixed PCM bit depth, so bit depth is **N/A (lossy codec)** for every row. All files are **MP3, 48 kHz, stereo**.

The runtime playback path is identical for every file: **one unified media element → direct MP3 URL by default → one-time active-track Blob only when the requested position is outside the browser's seekable ranges**.

| Track | Section | Codec | Bitrate | Sample rate | Channels | LUFS-I | Playback path |
|---|---|---|---:|---:|---:|---:|---|
| `growold` | Stories | MP3 | 128 kbps CBR | 48 kHz | 2 | -14.7 | Unified direct / seek fallback |
| `mainroad` | Stories | MP3 | 128 kbps CBR | 48 kHz | 2 | -13.8 | Unified direct / seek fallback |
| `bestdad` | Stories | MP3 | 182 kbps VBR | 48 kHz | 2 | -12.8 | Unified direct / seek fallback |
| `neuesleben` | Stories | MP3 | 186 kbps VBR | 48 kHz | 2 | -14.0 | Unified direct / seek fallback |
| `tbilisiua` | Author | MP3 | 128 kbps CBR | 48 kHz | 2 | -15.3 | Unified direct / seek fallback |
| `tbilisige` | Author | MP3 | 187 kbps VBR | 48 kHz | 2 | -13.3 | Unified direct / seek fallback |
| `newflight` | Author | MP3 | 186 kbps VBR | 48 kHz | 2 | -13.0 | Unified direct / seek fallback |
| `noretreat` | Author | MP3 | 170 kbps VBR | 48 kHz | 2 | -11.7 | Unified direct / seek fallback |

Complete measurements for all 29 assets follow.

| Section | Track key | File | Bitrate / mode | Duration | Size | LUFS-I | True peak dBFS | LRA LU | Encoder |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| Stories | `justfive` | `just-five-more-minutes.mp3` | 128 kbps CBR | 222s | 3.39 MiB | -14.1 | -1.8 | 3.2 | Lavc61.19 |
| Stories | `growold` | `audio-071ef6697656.mp3` | 128 kbps CBR | 197s | 3.00 MiB | -14.7 | -1.8 | 5.2 | Lavc61.19 |
| Stories | `days127` | `audio-188f96c94cb4.mp3` | 128 kbps CBR | 183s | 2.80 MiB | -14.1 | -2.3 | 5.8 | Lavc61.19 |
| Stories | `mainroad` | `audio-95fd6d54ddeb.mp3` | 128 kbps CBR | 222s | 3.39 MiB | -13.8 | -0.3 | 7.0 | Lavc61.19 |
| Stories | `natalia65` | `audio-ba2f83db69e6.mp3` | 128 kbps CBR | 214s | 3.27 MiB | -13.6 | -2.2 | 7.9 | Lavc61.19 |
| Stories | `diana` | `diana.mp3` | 180 kbps VBR | 245s | 5.24 MiB | -13.3 | -1.6 | 2.4 | Lavf |
| Stories | `bestdad` | `best-husband-father.mp3` | 182 kbps VBR | 309s | 6.71 MiB | -12.8 | -1.2 | 3.6 | Lavc60.31 |
| Stories | `allbegins` | `vse-tilky-pochynaietsia.mp3` | 184 kbps VBR | 248s | 5.45 MiB | -13.7 | -0.9 | 7.4 | Lavf |
| Stories | `fiveua` | `shche-piat-khvylyn.mp3` | 179 kbps VBR | 190s | 4.05 MiB | -13.4 | -1.5 | 4.6 | Lavf |
| Stories | `growolden` | `well-grow-old-together.mp3` | 181 kbps VBR | 198s | 4.28 MiB | -14.0 | -1.2 | 5.3 | Lavf |
| Stories | `neuesleben` | `neues-leben.mp3` | 186 kbps VBR | 225s | 4.98 MiB | -14.0 | -1.6 | 8.4 | Lavc60.31 |
| Stories | `growoldge` | `ertad-davberdebit.mp3` | 179 kbps VBR | 208s | 4.45 MiB | -14.0 | -2.4 | 2.8 | Lavf |
| Stories | `fivege` | `kidev-khuti-tsuti.mp3` | 183 kbps VBR | 204s | 4.46 MiB | -13.2 | -1.7 | 4.1 | Lavf |
| Author | `amsterdam` | `audio-d4b332340900.mp3` | 128 kbps CBR | 211s | 3.22 MiB | -13.9 | -1.5 | 3.2 | Lavc61.19 |
| Author | `mychoice` | `audio-1ad596796709.mp3` | 128 kbps CBR | 205s | 3.12 MiB | -13.6 | -2.5 | 6.6 | Lavc61.19 |
| Author | `tbilisiua` | `tbilisi-ua.mp3` | 128 kbps CBR | 161s | 2.46 MiB | -15.3 | -4.2 | 4.9 | Lavc61.19 |
| Author | `tbilisige` | `tbilisi-stage86.mp3` | 187 kbps VBR | 285s | 6.35 MiB | -13.3 | -1.3 | 7.9 | Lavc60.31 |
| Author | `goodvibe` | `audio-63294ade4013.mp3` | 131 kbps CBR | 334s | 5.23 MiB | -12.8 | -1.1 | 5.8 | Lavc61.19 |
| Author | `pulse` | `audio-5e36414e3276.mp3` | 134 kbps CBR | 209s | 3.35 MiB | -13.3 | -2.2 | 4.8 | Lavc61.19 |
| Author | `amsterdamen` | `audio-ff299af622e9.mp3` | 128 kbps CBR | 201s | 3.07 MiB | -13.1 | -1.6 | 4.9 | Lavc61.19 |
| Author | `mychoiceen` | `audio-d01d2cbad9e8.mp3` | 128 kbps CBR | 185s | 2.82 MiB | -12.9 | -2.0 | 5.3 | Lavc61.19 |
| Author | `yayaya` | `audio-a310886514a8.mp3` | 133 kbps CBR | 166s | 2.63 MiB | -13.3 | -2.2 | 4.5 | Lavc61.19 |
| Author | `iwant` | `audio-d0ee8b619e44.mp3` | 128 kbps CBR | 173s | 2.64 MiB | -13.3 | -2.1 | 5.8 | Lavc61.19 |
| Author | `53` | `53.mp3` | 180 kbps VBR | 145s | 3.11 MiB | -13.7 | -2.1 | 4.6 | Lavf |
| Author | `yayayaalt` | `ya-ya-ya-alternative.mp3` | 180 kbps VBR | 184s | 3.94 MiB | -12.2 | -1.6 | 6.9 | Lavc60.31 |
| Author | `dayspass` | `mynaiut-dni.mp3` | 178 kbps VBR | 200s | 4.23 MiB | -13.9 | -0.5 | 7.3 | Lavc60.31 |
| Author | `ashes` | `na-popeli.mp3` | 189 kbps VBR | 161s | 3.62 MiB | -12.6 | -1.8 | 5.8 | Lavc60.31 |
| Author | `newflight` | `novyi-polit.mp3` | 186 kbps VBR | 170s | 3.77 MiB | -13.0 | -0.2 | 4.4 | Lavc60.31 |
| Author | `noretreat` | `shliakhu-nazad-nema.mp3` | 170 kbps VBR | 180s | 3.64 MiB | -11.7 | -1.0 | 8.2 | Lavc60.31 |

## Findings by category

### Codec and container

- All 29 assets decode as MP3, 48 kHz, two-channel stereo.
- 14 files are approximately 128 kbps CBR; 15 are approximately 170–189 kbps VBR.
- Both Stories and Author Songs contain CBR and VBR files, so bitrate mode is not selected by library section.
- Encoder metadata includes FFmpeg/Lavc generations 60 and 61 plus Lavf container tags. This indicates multiple export batches, not a separate playback path.

### Loudness, peaks and clipping

- Stories average approximately **−13.75 LUFS**; Author Songs average approximately **−13.24 LUFS**.
- The average difference is small, but the Author section has a broader per-track spread.
- No measured true peak exceeded 0 dBFS, so no hard digital clipping was detected by this audit.
- `newflight` (−0.2 dBFS) and `mainroad` (−0.3 dBFS) sit close to the digital ceiling and should be watched during any future mastering pass.
- Perceived “brightness” cannot be determined from LUFS alone. Because there is no player-side EQ difference, it should be evaluated at the source-master level (spectral balance, limiting and arrangement) if further tonal matching is desired.

### Delivery path

- Every track is referenced from the same relative `assets/audio/` path and now passes through the same audio engine.
- Local HTTP checks returned `Content-Type: audio/mpeg` and a correct `Content-Length` for both a CBR Story file and a VBR Author file.
- The local test server did not honor `Range` and returned `200 OK`; this is why direct seekability must be detected at runtime rather than assumed.
- The final Chromium acceptance test used a range-capable local server, received a full seekable interval through `206 Partial Content`, and successfully moved the active VBR track to approximately 51% at 320×568, 360×640 and 393×852.
- The production Cloudflare/CDN URL was not available in the supplied archive and publication was explicitly forbidden, so production `206 Partial Content`, `Accept-Ranges`, cache status and actual mobile network latency could not be verified here.

## Real-device acceptance checklist

The code-level and simulated lifecycle tests passed, but this environment cannot lock a physical Android phone or connect a Bluetooth headset. Before production, run this short physical-device check on Android Chrome:

1. Start a track, lock the screen and wait for two automatic track transitions.
2. Use lock-screen Play/Pause/Next/Previous and confirm title/artwork update.
3. Repeat with wired headphones and with a Bluetooth headset.
4. Switch Chrome to the background for at least five minutes; confirm playback and queue continue.
5. Seek at 10%, 50% and 95% on one CBR and one VBR file.
6. Toggle RU, UA, GE, EN and DE while audio is playing; confirm the track and position do not reset.
7. Briefly disable the network near a track boundary, restore it and confirm the player does not enter a retry loop.

## Automated checks completed

- JavaScript syntax checks for both scripts.
- Exactly one `<audio>` element in the final HTML.
- 29 unique queue entries; first GE track and final Author track wrap cyclically.
- Manual Next/Previous and synthetic `ended` transitions.
- Media Session handler registration and absolute seek.
- Visibility changes do not pause or recreate the engine.
- Interface-language changes preserve track and playback state.
- Simulated media network failure advances to the next global-queue item and is bounded.
- Playing Overlay appears only for representations of the active track.
- Headless Chromium mobile checks at 320×568, 360×640 and 393×852: Full Player controls remained visible, no horizontal overflow, 50% seek passed, Mini Player stayed synchronized, Stories/Author search and language filtering passed, and Bottom Navigation preserved the active track and position.
