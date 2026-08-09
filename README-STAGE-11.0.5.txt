TuneWrap Stage 11.0.5 — Structure-Preserving Automatic Translation

Problem fixed
-------------
Stage 11.0.4 sent the entire lyric to the translation model as one text block.
The model translated the words, but could collapse manual line breaks and stanza
structure. The public site then displayed translated lyrics as one continuous paragraph.

Stage 11.0.5 behavior
---------------------
- Translation stays automatic.
- You still enter the track only once in its original language.
- Lyrics are translated line-by-line.
- Every original newline is restored in exactly the same position.
- Blank lines between Verse / Chorus / Bridge sections are preserved.
- Common song section labels are normalized for RU / UA / GE / EN / DE.
- Description line breaks are preserved too.
- Existing correct/manual translations are not overwritten.
- Obviously flattened translations created by Stage 11.0.4 are detected and rebuilt
  automatically the next time the track is saved/published.

Changed files
-------------
- admin/admin.js
- functions/api/admin/translate.js

No changes
----------
- D1 schema
- R2
- Track IDs
- Global Queue
- Player architecture
- wrangler.toml

Install
-------
1. Extract this ZIP over the website root folder.
2. Replace the included files.
3. Run:
   npm.cmd test
   npx.cmd wrangler pages functions build
4. GitHub Desktop:
   Summary: Stage 11.0.5 – Preserve translation structure
   Commit to main -> Push origin
5. Wait for green Cloudflare deployment.
6. Open /admin/ and Ctrl+F5.
7. Edit "Ніч і Слова" and press "Опубликовать" once.
   The already-flattened RU/GE/EN/DE lyrics will be detected and rebuilt.
8. Check the public site in RU / GE / EN / DE.
