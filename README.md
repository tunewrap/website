# TuneWrap Website

Official TuneWrap website.

Static HTML/CSS/JavaScript project prepared for GitHub and Cloudflare Pages.

## Add a track

TuneWrap now uses one generated Track Catalog. A song is added once as a package in `content/tracks/<stable-id>/`; libraries, search, counters, playback queue, Full Player, Mini Player and Media Session all read the generated catalog.

See [HOW-TO-ADD-A-TRACK.md](HOW-TO-ADD-A-TRACK.md), then run:

```bash
npm run tracks:build
```

Run locally with any static file server, for example:

```bash
python3 -m http.server 4173
```

Before release, run `npm test`.
