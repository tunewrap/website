# TuneWrap Website · Stage 11

TuneWrap is a mobile web application with a Cloudflare-native Track CMS.

## Runtime architecture

- Public UI: existing HTML/CSS/JavaScript TuneWrap application.
- Public metadata: `GET /api/tracks` from Cloudflare D1.
- Admin Studio: `/admin/`, protected in production by Cloudflare Access.
- Admin API: `/api/admin/*`, also protected by Cloudflare Access.
- New/replaced MP3 and covers: private R2 bucket, served by `/api/media/*` with byte-range support.
- Playback: the existing single audio engine and universal renderer consume the API catalog.

The 29 Stage 10 tracks are migrated once to D1. Their static audio/cover URLs remain unchanged and their binary files remain in `content/tracks/`. `data/track-catalog.json`, `js/track-catalog.generated.js` and `content/tracks/*/track.json` are retained as migration/backup/validation material, but production `index.html` does not load the generated JavaScript catalog.

## Local development

```bash
npm install
npm run admin:migrate-local
npm run admin:dev
```

Open `http://127.0.0.1:8788/` and `http://127.0.0.1:8788/admin/`. Local admin bypass works only on `localhost`/`127.0.0.1` when `ENVIRONMENT=development`; it cannot authorize a production hostname.

Before release:

```bash
npm test
npx wrangler pages functions build
```

See [TUNEWRAP-ADMIN-SETUP.md](TUNEWRAP-ADMIN-SETUP.md) for Cloudflare setup and [HOW-TO-USE-TUNEWRAP-ADMIN.md](HOW-TO-USE-TUNEWRAP-ADMIN.md) for daily publishing.
