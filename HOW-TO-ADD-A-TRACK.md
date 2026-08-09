# Adding a TuneWrap track after Stage 11

Production tracks are created and published through `/admin/`. See [HOW-TO-USE-TUNEWRAP-ADMIN.md](HOW-TO-USE-TUNEWRAP-ADMIN.md).

The old `content/tracks/<id>` package pipeline remains intentionally available only for:

- validating the immutable 29-track migration baseline;
- rebuilding the Stage 10 backup catalog;
- disaster-recovery comparison;
- development tests of the queue and artwork rules.

It is not the production publishing path. Running `npm run tracks:build` does not publish a song to D1 and does not update the live site.

The production rule is data-driven and unchanged: all published playable `stories` sorted by section-local `order`, then all published playable `author` tracks sorted by section-local `order`, then cyclic return to the first Story. Language filters, Search and Featured select UI records only; they never replace the global playback queue.
