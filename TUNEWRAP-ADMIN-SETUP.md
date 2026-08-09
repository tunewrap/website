# TuneWrap Admin Studio — Cloudflare setup

This guide configures Stage 11 without placing passwords, API tokens or infrastructure secrets in the browser bundle.

## 1. Install and verify locally

Requirements: Node.js 18+ and a current Wrangler 4 release.

```bash
npm install
npm run admin:seed-build
npm run admin:migrate-local
npm run admin:dev
```

Local URLs:

- public application: `http://127.0.0.1:8788/`
- Admin Studio: `http://127.0.0.1:8788/admin/`
- public catalog: `http://127.0.0.1:8788/api/tracks`

`admin:dev` passes `ENVIRONMENT=development`. The code permits its local Access bypass only when the hostname is `localhost` or `127.0.0.1`. The checked-in `wrangler.toml` defaults to `ENVIRONMENT=production`.

## 2. Create Cloudflare resources

Authenticate Wrangler in the target Cloudflare account, then create D1 and R2:

```bash
npx wrangler d1 create tunewrap-catalog
npx wrangler r2 bucket create tunewrap-media
```

Replace the placeholder `database_id` in `wrangler.toml` with the UUID printed by the D1 command. Keep bindings exactly:

- `TUNEWRAP_DB` → D1 database `tunewrap-catalog`
- `TUNEWRAP_MEDIA` → R2 bucket `tunewrap-media`
- `ENVIRONMENT` → `production`
- `ACCESS_TEAM_DOMAIN` → `https://<team-name>.cloudflareaccess.com`
- `ACCESS_AUD` → Audience (AUD) tag of the Access application

Set the two Access values in the Pages environment-variable settings rather than committing project-specific identity configuration into the repository. They are identifiers, not browser settings; they are used only by the server-side JWT verifier.

The R2 bucket does not need public bucket access. New media is read through `/api/media/*`, which returns `Accept-Ranges: bytes` and HTTP 206 for valid MP3 range requests.

## 3. Apply the one-time D1 migration

The first migration creates the schema and indexes. The second imports the exact Stage 10.2.1 metadata baseline:

```bash
npx wrangler d1 migrations apply tunewrap-catalog --remote
```

Verify the result:

```bash
npx wrangler d1 execute tunewrap-catalog --remote --command \
  "SELECT section, COUNT(*) count FROM tracks GROUP BY section; SELECT COUNT(*) total, COUNT(DISTINCT id) unique_ids FROM tracks;"
```

Expected first import:

- Stories: 13
- Author: 16
- Total: 29
- Unique IDs: 29
- Imported: 29 / Missing: 0 / Duplicates: 0

Do not rerun a hand-written import or copy the 29 MP3 files into R2. `INSERT OR IGNORE` makes the supplied seed repeat-safe, while the original binaries remain static assets at their current URLs.

## 4. Configure Cloudflare Pages

Use the project root as the Pages source. There is no framework build output; Pages serves the static files and automatically compiles the `functions/` directory. If a build command is required by the project configuration, use a non-mutating verification such as `npm test`; the output directory remains `.`.

Bind the same D1 database, R2 bucket and production variable in both Preview and Production as appropriate. Preview can use separate preview resources to prevent test records from entering production.

Before any deployment performed by the project owner, verify locally:

```bash
npm test
npx wrangler pages functions build
```

Stage 11 itself does not require a rebuild when an administrator publishes a track. Publishing changes D1/R2 only; the public API reflects the record on its next request.

## 5. Protect Admin Studio with Cloudflare Access

Create a Cloudflare Zero Trust Access self-hosted application for the TuneWrap hostname. Protect both path groups:

- `/admin/*`
- `/api/admin/*`

Create an Allow policy only for confirmed TuneWrap administrator identities (for example, explicit email addresses or an approved identity-provider group). Do not use a public Bypass policy. Test all four cases in an incognito browser:

1. `/admin/` redirects an unauthenticated visitor to Access.
2. `/api/admin/tracks` rejects an unauthenticated visitor.
3. an approved administrator can open Admin Studio and save a draft.
4. `GET /api/tracks` remains public.

Also protect or disable the default `*.pages.dev`/preview address so it cannot bypass the custom-domain Access application.

Admin API code verifies `Cf-Access-Jwt-Assertion` against the rotating public JWK set at `ACCESS_TEAM_DOMAIN`, with exact issuer and `ACCESS_AUD`. The verified email claim is stored as `lastEditedBy`. Mutating routes also reject a mismatched browser `Origin`.

## 6. Cache and media behavior

- `/api/tracks`: short public cache (`max-age=30`, `stale-while-revalidate=120`).
- `/api/admin/*`: `no-store`.
- versioned R2 media: immutable one-year cache.
- replacing MP3/cover creates a new unique object key; no random query-string cache busting is used.
- hard delete removes every R2 object below the track's prefix; ordinary removal uses archive/unpublish and is recoverable at the metadata level.

## 7. Recovery

Admin Studio → “Резервная копия и восстановление” exports a `schemaVersion: 2` JSON backup. Import always runs a dry preview first and shows create/update/outside-backup counts before confirmation. It does not silently delete records outside the backup.

If the public catalog cannot be loaded, the app shows a retry screen instead of falling back to stale production metadata. Investigate D1 binding, migrations and `/api/tracks` rather than re-enabling `js/track-catalog.generated.js` in `index.html`.
