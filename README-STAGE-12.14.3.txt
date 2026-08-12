TUNEWRAP — STAGE 12.14.3
INDEPENDENT ADMIN PERSISTENCE

Purpose
-------
Every Admin edit is independent:
- title only;
- description only;
- lyrics or translation only;
- MP3 only;
- cover only;
- any mixed combination.

Save Draft always leaves the track as a draft.
Publish always leaves the track published.

The installer also:
- fixes the obsolete Stage 12.14 assertion;
- prevents fallback-language text from entering another locale during an unrelated edit;
- prevents unchanged fields from being sent in PATCH requests;
- commits MP3 and cover separately, so one failed upload does not erase another successful change;
- removes stale public Track Catalog caching;
- synchronizes the retained static catalog backup.

Install from the website project root
-------------------------------------
node scripts/install-stage-12.14.3-independent-admin-persistence.js

Then run
--------
npm.cmd test
npx.cmd wrangler pages functions build

Expected
--------
PASS from the installer.
All npm tests pass.
Wrangler: Compiled Worker successfully.

D1 migration: not required.
