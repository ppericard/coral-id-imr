# Several photos on a small phone: a study for the new formats (2026-11-18)

Status: design study, docs only. No app code, data file or photo changed. Pierre's choices are in the last section, as
(a), (b), (c); the integrator numbers the ones that need a number.

Why it exists. Pierre, 2026-11-18, approved four new formats, to be slipped into the general quiz as one-question formats
and offered as separate Practice entries: **Same or different?** (2 photos), **Odd one out** (4 photos, tap the odd
one), **Life stages matched** (a juvenile or a female, then pick the adult or the male among 3-4 photos) and **Down the
tree** (one photo, the question walks family, genus, species). He worries about several photos on a small phone; the
answer also serves his own Flutter game (ReefRecall), so this note gives principles and sizes, not only our code.

Labels (rule W11): **[measured]** = measured by a script on `main` @191dfa27 (Playwright 1.63.0, Chromium) or counted in
the data files; **[computed]** = arithmetic on measured figures; **[read]** = read in a file, a doc or a source; **[my
reading]** = what I could still recognise on the screenshots, one agent's eye, to be checked by Pierre's taps (rule
W4); **[guess]** = a judgement.

## Summary

- **On a phone, a multi-photo grid is limited by the screen's width, not its height.** Two photos across are about
  30 mm wide on every common phone (169 CSS px at 360 px wide, 184 at 390, 196 at 414); three across, about 20 mm
  (110-128 px) [measured]. Hiding the header and the tab bar (108 px) gives **nothing** to a 2 × 2 grid, whose squares
  are set by the width: Find the X today already leaves about 190 px empty under its prompt at 360 × 690 [measured].
- **The answered state is where space runs out (rule U2).** The quiz's feedback sheet is 393-414 px tall [measured].
  Under it, today's Find the X shrinks its tiles to 86-97 px and **hides half of the bottom row** behind the sheet,
  with the family names cut ("Trigg…") [measured, `real-findx-answered-*`]. With the same long feedback, the mocked
  2 × 2 drops to 118-163 px and the stacked pair to 226 × 141. A **short sheet** (the verdict, one telling line, More,
  Next: about 150 px), with each photo named on the photo, keeps the 2 × 2 at full size and the pair at 282-398 px wide
  [measured]. Recommended for every multi-photo format.
- **What reads at about 30 mm (two across):** a whole fish's silhouette and its colour pattern, a sea slug's colour
  pattern when it fills the frame, a coral colony's growth form. **At about 20 mm (three across):** a fish's shape and
  its main colour blocks only. **Never in a small slot:** corallite walls, septa, rhinophores, cerata tips, fin spots,
  scale rows: they need a photo the screen's width (about 62-65 mm) [my reading].
- **Recommended layouts** (screenshots in section 7), all with the header and tab bar kept (rules U3, U12; question
  (c)):
  - **Same or different?**: the two photos **stacked**, full width (344 × 233 at 360 × 690 with the header and tab bar,
    344 × 287 without), Same / Different under them. Every subject; for corals on close-ups and corallites, where the
    width keeps *Favites* and *Dipsastraea* corallites about 45-55 px across [my reading].
  - **Odd one out**: the **2 × 2 squares** of Find the X, on photos cut around the animal. Fish now (their tiles);
    sea slugs after a box pass; coral colonies not in a grid (question (a)).
  - **Life stages matched**: the **2 × 2 too, the juvenile or female outlined in the first cell**, the three adults or
    males in the others: every photo at 169-196 px. One large photo with three small ones (110-128 px) was mocked
    and measured: the three small ones fail the size floor below everywhere (77-90 px of fish with a box).
  - **Down the tree**: one photo, as the quiz; no size problem; its cost is the scoring.
- **Swipe one at a time** is not a comparison layout (the photos are never on screen together): keep the swipe inside
  the enlarged view. **Enlarging before the answer**: a long press (a tap answers, as in Find the X), blind (rule P5).
- **Engine rules** (section 5): eligibility computed at build from the judging tags and the animal's box (rules S1,
  L13); a size floor on the animal's span on screen (75 px for shape and colour blocks, 110 px for a pattern, a photo
  the screen's width for fine features); otherwise **the usual one-photo question**, never a smaller grid.
- **The data is the bottleneck, not the screen.** 8,662 fish photos pass the tile rule's tags but only 425 have the
  fish's box (420 a tile) [measured]; no juvenile can have one (the tile rule excludes `j`); no sea slug or coral photo
  has a box. A box pass comes first for Life stages matched and the sea slugs (question (b)).
- **Found on the way** (for the integrator): the Find the X answered state above; and the app served from `127.0.0.1`
  still sends three anonymous reads to the sheet at each load (`?stats=1`, `?board=1`, `?achs=1`), which this study's
  harness aborted (section 1).

## 1. How it was measured

- **Rule D1 from the first run.** Every Playwright context aborted any request that was not `127.0.0.1`; the photos'
  R2 host was answered from local copies (fetched once with curl through the proxy); the browser was launched with
  `--host-resolver-rules=MAP script.google.com 127.0.0.1, MAP script.googleusercontent.com 127.0.0.1, MAP
  *.googleusercontent.com 127.0.0.1`; service workers blocked; every request's host logged. The mockup runs made 0
  requests to Google [measured]. The real app (the worktree served from `127.0.0.1`) tried 3 GET requests to the sync
  script at each load: `?stats=1`, `?board=1`, `?achs=1` (anonymous reads: the photo ratings, the leaderboard, the
  achievements). All 39 of them (13 loads over 4 runs) were aborted inside the browser, and the resolver map would have
  sent any escape to `127.0.0.1` [measured]. No write was attempted (the `LOCAL` guard covers them) [read: `app.js`
  `LOCAL`, `sheetFetch`]. Nothing reached the sheet; the integrator may want the reads gated as the writes are.
- **Two harnesses, kept outside the repo** (the study's scratchpad): the **real app** (fish, `FIND.P = 1` as
  `tests/fish.smoke.js` does, the header, tab bar, stage and tiles measured with `getBoundingClientRect`, before and
  after a wrong answer, the achievement pop-up removed before the shot); and **mockups** (one static page with the
  app's tokens and fonts and our real photos from R2: the fish's 960 px files and 360 px tiles, the sea slugs' and
  corals' 960 px files), each photo box sized in JS so it can be measured exactly. Screenshots at `deviceScaleFactor`
  2, `isMobile` and `hasTouch` on.
- **Photos used** (all in play today): fish tiles of *Chaetodon baronessa*, *C. ocellicaudus*, *C. punctatofasciatus*
  and *Centropyge vrolikii* (`fish-game.json` `xc`); *Sargocentron caudimaculatum* and *S. cornutum*; *Pomacanthus
  imperator* juvenile and the adults of *P. imperator*, *P. sexstriatus*, *P. semicirculatus*; *Pseudanthias
  pleurotaenia* female and the males of three *Pseudanthias*; *Platax pinnatus* juvenile; sea slugs *Chromodoris annae*
  and *C. willani*, *Phyllodesmium briareum*; corals *Pocillopora*, *Acropora*, *Favites* and *Dipsastraea* (colony,
  close-up, corallites). Photos tagged with a watermark (`w`) were left out, and one untagged photo showing a
  watermark was swapped for another.

### The usable viewport

| Screen (CSS px) | Share | Browser | Usable (measured or derived) |
|---|---|---|---|
| 360 × 800 | Philippines, mobile, June 2026: 17.5 % (the first); 360 × 806 8.8 % [read: StatCounter] | Chrome on Android | 360 × 724 with the status bar and Chrome's toolbar (Playwright's Chromium descriptors take 76 px off the screen height: Pixel 9 and 10, 360 × 808 → 360 × 732; Galaxy Z Flip 7, 360 × 840 → 764) [measured]; about **360 × 690** with a three-button navigation bar (about 34-48 px more) [guess, the figure given] |
| 390 × 844 | worldwide, Aug 2026: 6.8 % [read: StatCounter] | Safari on iPhone | **390 × 664** (Playwright's iPhone 12-14 descriptors); 390 × 651 on the iPhone 16e / 17e descriptors [measured] |
| 414 × 896 | Philippines 6.1 %, worldwide 13.6 % (the first) [read: StatCounter] | Safari on iPhone | **414 × 715** (iPhone 11, 11 Pro Max descriptors) [measured] |

Shots at 360 × 690, 390 × 664 and 414 × 715; the main layouts also at the full screens 390 × 844 and 414 × 896 (no
browser bar: an upper bound for a native app), and the real app at 360 × 724. **390 × 664 is the shortest of the
three**: what fits there fits the others. A native app (Flutter) gains height only; **its width is the same**, so every
two- and three-across size below holds for it unchanged: at 390 × 844 and 414 × 896 the 2 × 2 squares stay 184 and 196
px; only the stacked pair grows (374 × 364, 398 × 390) [measured].

### What our app's chrome takes on a phone [measured]

Header 49 px; bottom tab bar 59 px; side gutters 16 px each; the prompt line 45 px; the feedback sheet after an answer
393-414 px. Today's one-photo quiz stage: 328 × 391 at 360 × 690, 358 × 365 at 390 × 664, 382 × 416 at 414 × 715.
Find the X's tiles: 160, 175 and 187 px before the answer, 86, 86 and 97 px after.

## 2. The layouts, measured

CSS px at 360 × 690 | 390 × 664 | 414 × 715, and the physical size (mm, computed from the screen's diagonal: 6.5″ for
360 × 800, 6.1″ for 390 × 844 and 414 × 896, so 0.188, 0.167 and 0.157 mm a CSS px) [computed]. The device pixels are
the CSS size times the screen's ratio (2 to 3): a 169 px slot needs a 338-507 px file. Mockups: 8 px side gutters, 6 px
gaps, a 44 px prompt bar with a ✕ to leave (a 44 px target), the header (49) and tab bar (59) drawn where marked.

| Layout | 360 × 690 | 390 × 664 | 414 × 715 | Shots |
|---|---|---|---|---|
| **1. 2 × 2 squares** (header and tab bar shown or hidden: the same) | 169 (32 mm) | 184 (31 mm) | 196 (31 mm) | `mock-grid-*`, `mock-grid-fishodd-chrome-*` |
| 1. today's Find the X | 160 (30 mm) | 175 (29 mm) | 187 (29 mm) | `real-findx-*` |
| 1. today's Find the X, answered | **86** (16 mm), bottom row half hidden | **86** (14 mm) | **97** (15 mm) | `real-findx-answered-*` |
| 1. 2 × 2, answered, the real feedback's length | 131 | 118 | 163 | `mock-grid-fishodd-done-*` |
| 1. 2 × 2, answered, a short sheet (header and tab bar shown) | 169 | 176 | 196 | `mock-grid-fishodd-chrome-done-short-*` |
| 1b. four full-width strips, cut on the fish's box | 344 × 155 (65 × 29 mm) | 374 × 148 | 398 × 161 | `mock-strips-fishodd-*` |
| 1c. 2 × 2 portrait cells (no chrome) | 169 × 236 | 184 × 257 | 196 × 274 | `mock-portrait-slugodd-*` |
| 1d. 2 × 2 with the reference outlined (Life stages) | 169 | 184 | 196 | `mock-ref2x2-*` |
| **2. one large (4:3) + three small** | 344 × 258 + 3 × 110 (21 mm) | 374 × 281 + 3 × 120 (20 mm) | 398 × 299 + 3 × 128 (20 mm) | `mock-one3-*` |
| **3. swipe, one at a time** (the next one peeks in) | 301 × 562 | 327 × 536 | 348 × 587 | `mock-swipe-slugodd-*` |
| 3b. the pair stacked, header and tab bar shown | 344 × 233 (65 × 44 mm) | 352 × 220 | 392 × 245 | `mock-pair-fishsame-chrome-*` |
| 3b. the pair stacked, without them | 344 × 287 (65 × 54 mm) | 374 × 274 (62 × 46 mm) | 398 × 299 (62 × 47 mm) | `mock-pair-*` |
| 3b. the pair answered: long feedback / short sheet (with chrome) | 226 × 141 / 302 × 189 | 219 × 137 / 282 × 176 | 261 × 163 / 323 × 202 | `mock-pair-fishsame-done-*`, `…-chrome-done-short-*` |
| 3c. the pair side by side | 169 × 219 | 184 × 239 | 196 × 254 | `mock-pairside-coralsame-*` |
| **4. held open (enlarged), Back and Choose** | 360 × 288 (the screen's width, 4:3) | 390 × 312 | 414 × 331 | `mock-enlarge-slugodd-*` |
| one photo (Down the tree, 4 names under it) | 344 × 477 | 374 × 451 | 398 × 502 | `mock-tree-*` |
| **5. crops** | the same photos at 96 and 160 px: the tile cut on the fish's box, a centre crop, the whole photo on a blurred band | | | `mock-crops-*` |

**Rule of thumb, any phone: count the columns, not the pixels.** One column ≈ 62-65 mm, two ≈ 30 mm, three ≈ 20 mm,
four ≈ 15 mm wide, whatever the model, because CSS px (and Flutter's dp) are designed to keep a physical size
[computed above].

### Layout by layout

1. **2 × 2 grid.** The squares are set by the width: 169-196 px whether the header and tab bar are shown or not, so
   hiding them gains nothing here. Tap targets are far above 44-48 px [read: Apple HIG 44 × 44 pt, Material 48 × 48 dp,
   WCAG 2.5.5 44 × 44 CSS px]. It is Duolingo's "select the correct image" layout (a 2 × 2 grid of image cards), which
   asks for a Check button [read]; ours answers on the tap, as Find the X does (integrator's call, easy to correct).
   **The answered state decides it:** with the quiz's full feedback the grid shrinks by a third; with a short sheet and
   the names on the photos it keeps its size. **Variant 1b**, four full-width strips cut on the fish's box: a fish in
   profile is about twice as long on screen as in a square (about 300 px against 150) [measured on the shots], but a tall
   fish (butterflyfish, angelfish, batfish) loses its fins top and bottom; strips suit fish whose box is at least about
   1.6 times wider than tall [my reading], and never corals or sea slugs seen from above. **Variant 1c**, portrait cells,
   uses the height for sea slugs seen from above (often portrait photos, `ar` 0.8) but needs the chrome hidden and crops a
   fish in profile. **Variant 1d** puts Life stages matched in the same grid: the juvenile or female outlined, every
   photo at the two-across size.
2. **One large photo with three small ones.** The large one is a good reference (65 × 49 mm); the three small ones are
   at the three-across size, about 20 mm. The three emperor-group adults (*P. imperator*, *P. sexstriatus*,
   *P. semicirculatus*) can still be told apart at 110 px by their colour blocks, the anthias males by their colour
   [my reading], but finer differences cannot, and the floor of section 5 rejects these slots for anything but colour
   blocks. A gallery's thumbnails are the same size (a 3-column grid of about 120 px with a tap to enlarge) [read]: three
   across is the floor for a photo meant to be recognised, not compared.
3. **Swipe or one at a time.** The largest photos (301-348 px wide), but never side by side, so the player compares
   from memory: it removes the comparison the formats are for (side-by-side comparison is the learning value of these
   formats, FORMATS.md §2 row 3 [read]). Kahoot's answer to small phones is to show the images on a shared screen and only
   coloured buttons on the phone [read]: a live-mode idea (ROADMAP "Live mode"), not a solo one. Keep the swipe for the
   enlarged view (between the 4 photos, as the lightbox already does; rule U6 allows swipeable strips). **The pair
   stacked (3b)** is the layout for Same or different?: each photo the screen's width. With the header and tab bar shown
   it is 233 px tall instead of 287 at 360 × 690, but **as wide**: a photo filling its box is scaled by its width here,
   so the corallites keep their size and only more of the photo's top and bottom is cut [computed]. Side by side (3c)
   each photo is half as wide and corallites become a texture.
4. **Long press or tap to enlarge, then back.** The enlarged photo is the screen's width (65-68 mm), 4:3. A tap must stay
   the answer, so **enlarging is a long press** (about 500 ms) with Back and "Choose this one" in the enlarged view;
   blind before the answer (rule P5, `blindCredit`) and the question marked enlarged (`QCLOCK.zm`, as the quiz does).
   Two cautions: a long press on an image opens the phone browser's own menu (save, share) unless the page turns it off
   (`-webkit-touch-callout: none` and the `contextmenu` event), and a long press is not discoverable, so the first
   multi-photo question says it once ("Hold a photo to see it bigger") [guess]. The alternative is a 44 px enlarge mark
   in a corner of each photo, which takes room and invites slips [guess]; integrator's call.
5. **Square crops centred on the animal.** The fish already have them: the judging pass's box `bb` and the tile `xc`
   cut from it, `img/<f>-x.webp`, 360 px square, the fish filling at least 70 % of it (`judging/FISH.md` "The fish's
   box", `tools/fish_game.py` `tile_crop`) [read]. On the crops sheet: the tile always keeps the whole fish; a plain
   centre crop cut the snout of a butterflyfish; the whole photo on a blurred band keeps everything but shows the fish
   smaller (a 3:2 photo in a square: two thirds of the side). Sea slugs from above are usually centred and large (`l` for
   86 % of them) [measured], so a centre crop mostly works, but an aeolid's cerata and a long slug's ends get cut; a
   coral colony's centre crop loses the colony's outline (a table *Acropora* becomes a flat texture) [my reading]. The
   360 px tile covers a 169 px slot at a ratio of 2 (338 px) but is upscaled about 1.4 times at a ratio of 3 (507 px
   needed) [computed]; a 480 px tile would cover both [guess].

## 3. What can still be recognised, per subject

From a size ladder (each photo at 64, 80, 104, 128, 160 and 200 CSS px, `mock-ladder-*`) and the layouts above. The
useful measure is the **size of the animal or of the feature on screen**, not the photo's: a 104 px corallite photo shows
corallites, a 104 px colony photo shows none.

| Subject and cue | Reads from (on screen, about) | Two across (169-196) | Three across (110-128) |
|---|---|---|---|
| Fish: silhouette, family shape (butterflyfish disc, angelfish, squirrelfish) | animal 60-75 px long | yes | yes |
| Fish: main colour blocks (an adult *Pomacanthus*'s yellow and blue, an anthias male's colour) | animal about 75 px | yes | yes, with a box |
| Fish: a pattern (*Chaetodon* bands, the emperor juvenile's rings, stripe counts) | animal about 110 px | yes | no |
| Fish: species details (spots, a fin margin, the eye band's shape, scale rows) | feature 20-25 px | some | no |
| Sea slug, dorid: colour pattern (*Chromodoris annae* against *C. willani*) | animal about 110 px | yes, if it fills the frame | colour only |
| Sea slug: rhinophores, gills, cerata tips | feature 20-25 px | no | no |
| Coral colony: growth form | colony about 60 px | yes, form and colour only | yes, form only |
| Coral close-up: valleys, the meander | photo about 104 px | yes | barely |
| Coral corallites: walls shared or separate, septa (*Favites* against *Dipsastraea*) | corallite about 25 px | no (a texture) | no |

All [my reading] on the shots, at about 35 cm: 25 CSS px ≈ 4.7 mm ≈ 0.8° of visual angle; 75 px ≈ 14 mm ≈ 2.3°;
110 px ≈ 21 mm ≈ 3.4°; 160 px ≈ 30 mm ≈ 4.9° (at 0.188 mm a px) [computed]. These are the figures to carry to
ReefRecall: physical sizes, valid on any phone. The judging tags already say how large the animal is in the frame (`l`:
a third of the frame's width or more; `m`: a sixth to a third; `s`: less) [read: `judging/FISH.md`, `judging/SEASLUG.md`],
so the animal's size on screen can be estimated without a box: in a square cut of a 3:2 photo an `l` fish spans at
least half the slot, an `m` fish a quarter [computed].

## 4. Per format

| Format | Layout | Subjects and photos | Falls back to |
|---|---|---|---|
| **Same or different?** | 3b, the pair stacked, Same / Different (48 px buttons), a short sheet once answered | All three subjects; corals on close-ups and corallites (question (a)) | the one-photo question on the first photo's unit |
| **Odd one out** | 1, the 2 × 2 squares, a short sheet | Fish on tiles (as Find the X); sea slugs once boxed; coral colonies not in a grid (question (a)) | the one-photo question |
| **Life stages matched** | 1d, the 2 × 2 with the juvenile or female outlined | Fish species with a phase photo (`fish-game.json` `ph`: 2,929 juvenile, 1,226 male, 427 female photos [measured]), each cut on the fish's box (none has one yet: question (b)) | the one-photo question on the species |
| **Down the tree** | one photo, 4 names, the steps as chips above the photo | Fish (families, genera, species); sea slugs once their genera and species are units (their tree has the three ranks in `seaslug.json` [read]); corals have no rank below the genus | none needed |

**Corals.** Rule C4: "growth form is an entry point only: never genus-specific, never a strict filter (rank, don't
filter), and never a way to group or pick genera" [read: `docs/rules/content.md`]. A grid of colonies does not break
it by itself, and FORMATS.md §2 ("colony views of distinctive genera, or … tap-to-enlarge") and the ROADMAP "Odd one
out" row ("corals with colony views or tap-to-enlarge") allow it [read]. The study's reading narrows that: at two across a colony shows its form and colour and nothing
finer [my reading], while the declared coral look-alikes mostly share a form and differ by their corallites [guess, not counted]. A grid of
look-alike colonies would then be a guess, and a grid of colonies of different forms would be answered by the form
alone, which is the shortcut rule C4 keeps out. Hence question (a).

**Rule P4** ("all photos of one game question come from one observation") was written for one unit's views in one
question [read]. Odd one out shows three observations of the majority unit and Same or different? two of one unit when
the answer is Same, by design. Find the X already shows four observations, one per unit. The build PR needs P4's
wording to say so; the new wording goes to Pierre for his OK, as any rule's (AGENTS.md "Writing a rule down").

## 5. Engine rules proposed

Subject-neutral (rule S1): written on photo fields and on the slot's size, never on a subject's name. Computed once
(rule L13): a build tool writes the fields, the phone only compares numbers.

1. **A photo may fill a slot narrower than the screen** only when its tags say: whole (`1`), good light (`g`), colour
   loss `0`-`1`, sharp (`s`), size `l` (or `m` with a box), one animal or several of its kind (`1`, `s`), and no
   camouflage, out-of-water or features-hidden flag (`c`, `a`, `f`); never count `k` or `x` (rule P3). The fish's tile
   rule says nearly this (`tools/fish_game.py` `tile_tags`) [read]; the juvenile flag `j` is no reason to exclude a
   photo here (it is what Life stages matched shows).
2. **A slot of two or more across needs the animal's box** (a centre crop cuts too often: section 2, layout 5): fields
   `bb` and the square cut `xc`, as the fish's. A photo the screen's width (the stacked pair, a single photo) takes the
   whole photo with little crop and needs no box.
3. **A size floor per cue**, on the animal's span on screen = the slot's side (read from the stage, as `fitStage` does:
   no breakpoint, rule U4) × the box's fill (the tile: at least 0.7) or, without a box, × 0.5 for `l`:
   - shape and colour blocks (a family, a look-alike group, a phase told by colour): **75 px** (about 14 mm);
   - a pattern (a species told by bands, rings, a mantle's pattern): **110 px** (about 21 mm);
   - a fine feature (corallites, rhinophores, a spot): only a photo **the screen's width**, at least 280 px wide.

   A subject declares, per rank, which cue its questions need (a `SUBJECTS` field) [guess: its shape is the build PR's].
   Checked against the recommended layouts [computed]:

   | Slot | 360 × 690 | 390 × 664 | 414 × 715 | Passes |
   |---|---|---|---|---|
   | 2 × 2 (1, 1d), with a box: 0.7 × 169 / 184 / 196 | 118 | 129 | 137 | shape, blocks, pattern |
   | 2 × 2, no box, `l`: 0.5 × side | 85 | 92 | 98 | shape and blocks only |
   | three across (2), with a box: 0.7 × 110 / 120 / 128 | 77 | 84 | 90 | shape and blocks only |
   | three across, no box | 55 | 60 | 64 | nothing |
   | the pair stacked: 344-398 px wide (233-299 tall), answered with a short sheet 282-323 wide | | | | everything, fine features included |
   | the pair answered under the long feedback: 219-261 wide | | | | not fine features |

4. **Fall back, never shrink.** When the slot at this screen size cannot hold a legible photo for the cue asked, or
   fewer eligible observations exist than the format needs (Odd one out: 3 of the majority unit and 1 of the odd one;
   Life stages: 1 per phase), the planner serves the usual one-photo question on the unit it drew. The decision is taken
   before any random draw that would change the other questions (as `planFind` does), so a player who never qualifies
   draws exactly as before [read: `quiz.js` `planFind`].
5. **The answered state keeps the photos' size**: names on the photos (as Find the X does), a short sheet (the verdict,
   one telling line, More, Next), the full tips behind More (rule U2).
6. **Larger screens play the same formats bigger** (tablet and desktop: 2 × 2 cells of 300 px or more), so the floor is
   the only gate; corallites in a grid become possible on a desktop [guess].

What exists today against these rules [measured]: 24,386 fish photos, of which 8,662 pass the tile rule's tags, 425 have
a box and 420 a tile (27 of the 64 fish units in `fish-game.json` have 3 or more tiled observations); 1,562 juveniles
would pass but for the `j` flag; 762 male or female photos pass; sea slugs: 1,811 of 3,014 pass the equivalent tags,
none has a box; corals: no box, none needed for the pair.

## 6. Effort, in agent time

Hours of agent work, reviews and the Codex rounds included [guess, one agent; the box pass's rate is untimed until a
first sheet is].

| Step | Hours |
|---|---|
| The short answered sheet for multi-photo questions (names on the photos) and the long press to enlarge; it also fixes today's Find the X answered state | 3-4 |
| Eligibility fields at build and the size floor in the planner (a tool, its tests, the `SUBJECTS` field) | 4-6 |
| A box pass for the fish's juveniles and phases, then the sea slugs (on the existing judging sheets; about 1,500-2,000 photos for a first coverage of circle 1) | 10-15 |
| **Same or different?** (planner, the pair stacked, 2-choice scoring and its log format, P4's wording, the smoke) | 6-8 |
| **Odd one out** (reuses Find the X's tiles and gate; scoring under rule L2) | 5-7 |
| **Life stages matched** (layout 1d, phases from `ph`, after the box pass) | 6-8 |
| **Down the tree** (multi-step question, a partial credit per step, the global score's components, the sheet's replay: rules D3-D5) | 10-14 |
| The four as Practice entries (one page with four doors, rule L4's one path) | 3-4 |

## 7. Screenshots

Kept outside the repo (no image is committed); the integrator sends them to Pierre as files. At 360 × 690, 390 × 664 and
414 × 715 (the size is in each name), ratio 2:

- the real app: `real-quiz-*`, `real-findx-*`, `real-findx-answered-*` (also at 360 × 724);
- layout 1: `mock-grid-fishodd-*`, `mock-grid-fishodd-chrome-*`, `mock-grid-fishodd-done-*` (the real feedback's
  length), `mock-grid-fishodd-done-short-*`, `mock-grid-fishodd-chrome-done-short-*`, `mock-grid-slugodd-*`,
  `mock-grid-coralodd-*`, `mock-strips-fishodd-*`, `mock-portrait-slugodd-*`, `mock-ref2x2-stage-*`,
  `mock-ref2x2-stage2-*`, `mock-ref2x2-stage-done-*`;
- layout 2: `mock-one3-stage-*` (emperor angelfish), `mock-one3-stage2-*` (anthias), `mock-one3-stage-chrome-*`;
- layout 3: `mock-swipe-slugodd-*`, `mock-pair-fishsame-*` (with `-chrome`, `-done`, `-done-short`,
  `-chrome-done-short`), `mock-pair-slugsame-*`, `mock-pair-coralsame-*`, `mock-pairside-coralsame-*`;
- layout 4: `mock-enlarge-slugodd-*`; Down the tree: `mock-tree-*`;
- full screens: `mock-{grid-fishodd,pair-fishsame,one3-stage,ref2x2-stage,tree}-390x844` and `-414x896`;
- layout 5 and the ladder: `mock-crops-96-400x690`, `mock-crops-160-600x1000`, `mock-ladder-860x1900`.

## 8. Questions for Pierre

Only the product choices. The rest is the integrator's call, easy to correct: the short answered sheet, the long press,
one tap answers (no Check button), the 2 × 2 for Life stages.

- **(a) Corals in the multi-photo formats.** At two across a coral colony shows only its form and colour; the
  look-alikes differ by their corallites, which need a photo the screen's width. Corals play **Same or different?
  only**, on close-ups and corallites, stacked; no coral Odd one out or grid on phones? This narrows FORMATS.md §2 and
  the ROADMAP "Odd one out" row, which allow colony views of distinctive genera. *Recommendation: yes*; colonies in a
  grid only where the floor allows (tablet, desktop).
- **(b) A box pass first.** Life stages matched and the sea slugs' Odd one out need a cut around the animal, which no
  juvenile, phase or sea slug photo has today; the pass is agent judging on the fish box's rubric, about 10-15 agent
  hours for a first coverage. Run it before those two formats? *Recommendation: yes*, the fish's phases first, then the
  sea slugs; Same or different? and Odd one out on fish tiles need nothing and can be built meanwhile.
- **(c) Hide the header and tab bar during a multi-photo question?** Rule U3 says the header never changes size, and
  U12 keeps the tab bar on phones. Hiding them gains nothing for the 2 × 2 and only height for the stacked pair (287 px
  tall instead of 233 at 360 × 690, the same width). *Recommendation: no*, keep them; all the recommended layouts fit
  with them shown, answered state included.

## Sources

- StatCounter, screen resolution stats, mobile, Philippines (June 2026) and worldwide (Aug 2026):
  <https://gs.statcounter.com/screen-resolution-stats/mobile/philippines> [read, as gathered for this study].
- Touch targets: Apple Human Interface Guidelines (44 × 44 pt); Material Design (48 × 48 dp); WCAG 2.1 success criterion
  2.5.5 Target Size (44 × 44 CSS px), <https://www.w3.org/WAI/WCAG21/Understanding/target-size.html> [read].
- Duolingo "select the correct image" (2 × 2 image cards and a Check button), gallery apps' about 120 px 3-column grids
  with a tap to enlarge, Kahoot's images on the shared screen and coloured buttons on the phone [read, as gathered for
  this study].
- Playwright 1.63.0 device descriptors (`require('playwright').devices`) [measured].
- In the repo: `quiz.js` `question`, `fitStage`, `planFind`; `app.css` `.qfx`, `.fxt`; `judging/FISH.md` "The fish's
  box"; `judging/SEASLUG.md`; `tools/fish_game.py` `tile_tags`, `tile_crop`; `docs/FORMATS.md` §2; ROADMAP "Game modes";
  rules C4, P3, P4, P5, U2, U3, U4, U6, U12, S1, L13, D1.
