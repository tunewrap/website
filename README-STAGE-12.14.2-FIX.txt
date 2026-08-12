TUNEWRAP — STAGE 12.14.2 FIX

This replaces the first 12.14.2 installer.
The first installer used one overly exact catch/finally string anchor and therefore stopped safely with:
persist catch/finally anchor not found. No files changed.

This FIX uses structural function boundaries and matches the real Stage 12.14 admin/admin.js.

IMPORTANT:
Because the failed installer printed 'No files changed', there is nothing to undo.

Install:
node scripts/install-stage-12.14.2-incremental-admin-editor.js

Test:
node scripts/stage-12.14.2-incremental-admin-editor-test.js

Then:
npm.cmd test
npx.cmd wrangler pages functions build

D1 migration: not required.
