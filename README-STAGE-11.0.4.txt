TuneWrap Stage 11.0.4 — Automatic 5-language translation

PURPOSE
You enter a track once in its original language. On Save Draft / Publish, TuneWrap automatically generates missing versions for the other site languages and stores them in D1.

Automatic fields:
- title
- description / story
- lyrics

Languages:
- RU
- UA
- GE
- EN
- DE

Important behavior:
- Translation runs ONCE when missing localized fields are saved.
- The public site does NOT call AI on every page view or language switch.
- Existing/manual translations are preserved and are not overwritten.
- Localization tabs remain available only for review/corrections; you do not have to fill them.
- MP3, cover, queue, D1 schema and R2 architecture are unchanged.

Cloudflare:
- Uses Workers AI binding named AI.
- Uses Cloudflare-hosted translation model @cf/meta/m2m100-1.2b.
- No external API key is required.

Changed files:
- admin/admin.js
- functions/api/admin/translate.js
- wrangler.toml

INSTALL
1. Extract ZIP over the root website folder.
2. Replace the included files.
3. Run:
   npm.cmd test
   npx.cmd wrangler pages functions build
4. GitHub Desktop summary:
   Stage 11.0.4 – Automatic multilingual translation
5. Commit to main -> Push origin.
6. Wait for green Cloudflare deployment.
7. Open /admin/ and Ctrl+F5.
8. Edit "Ніч і Слова" and simply Save / Publish. Missing RU/GE/EN/DE versions should be created automatically.
