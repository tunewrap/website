# TuneWrap Stage 10.2 — Global Playback Queue

Audit date: 2026-08-08

## Established root cause

All 29 records already had the correct `section`. The defect was caused by the meaning assigned to `order` during the Stage 10.1 migration. A legacy language-group queue (`GE → UA → EN → DE → RU → Author`) was copied into one global numeric order. `best-husband-father-ru` therefore received global `order: 13` and was treated as the final Musical Story, although six Stories followed it in the catalog composition. The next global index was `amsterdam-ru`, so `ended`, Next, Full Player, Mini Player and Media Session all reproduced the same wrong transition.

The fix does not special-case the title or index. `order` is now explicit inside each `section`; the generator creates `Stories.sort(order) + Author.sort(order)`. The one persistent playback engine consumes this single list for every control path.

## Verified canonical queue

| # | Section | Track ID |
|---:|---|---|
| 01 | Stories | `story-127-ru` |
| 02 | Stories | `main-road-ru` |
| 03 | Stories | `natalia-65-ru` |
| 04 | Stories | `grow-old-together-ua` |
| 05 | Stories | `just-five-more-minutes-en` |
| 06 | Stories | `diana-ru` |
| 07 | Stories | `best-husband-father-ru` |
| 08 | Stories | `everything-begins-ua` |
| 09 | Stories | `five-more-minutes-ua` |
| 10 | Stories | `grow-old-together-en` |
| 11 | Stories | `neues-leben-de` |
| 12 | Stories | `grow-old-together-ge` |
| 13 | Stories | `five-more-minutes-ge` |
| 14 | Author | `amsterdam-ru` |
| 15 | Author | `my-choice-ua` |
| 16 | Author | `tbilisi-ua` |
| 17 | Author | `tbilisi-ge` |
| 18 | Author | `good-vibe-en` |
| 19 | Author | `pulse-of-the-night-en` |
| 20 | Author | `amsterdam-en` |
| 21 | Author | `my-choice-en` |
| 22 | Author | `ya-ya-ya-en` |
| 23 | Author | `i-do-what-i-want-ua` |
| 24 | Author | `ya-ya-ya-alternative-en` |
| 25 | Author | `days-pass-ua` |
| 26 | Author | `on-the-ashes-ua` |
| 27 | Author | `new-flight-ua` |
| 28 | Author | `no-way-back-ua` |
| 29 | Author | `our-way-53-en` |

Stories: **13**  
Author: **16**  
Total: **29**

Critical transition: `best-husband-father-ru → everything-begins-ua`.  
Section boundary: `five-more-minutes-ge → amsterdam-ru`.  
Reverse boundary: `amsterdam-ru → five-more-minutes-ge`.  
Cycle boundary: `our-way-53-en → story-127-ru`.
