# Several photos on a small phone: a study for the new formats (2026-11-18)

Status: design study, docs only. No app code, data file or photo changed. Pierre's choices are in the last section, as
(a), (b), (c); the integrator numbers the ones that need a number.

Why it exists. Pierre, 2026-11-18, approved four new formats, to be slipped into the general quiz as one-question formats
and offered as separate Practice entries: **Same or different?** (2 photos), **Odd one out** (4 photos, tap the odd
one), **Life stages matched** (a juvenile or a female, then pick the adult or the male among 3-4 photos) and **Down the
tree** (one photo, the question walks family, genus, species). He worries about several photos on a small phone; the
answer also serves his own Flutter game (ReefRecall), so this note gives principles and sizes, not only our code.

Labels (rule W11): **[measured]** = measured by a script on `main` @191dfa27 (Playwright 1.63.0, Chromium) or counted in
the data files; **[read]** = read in a file, a doc or a source; **[my reading]** = what I could still recognise on the
screenshots, one agent's eye, to be checked by Pierre's taps (rule W4); **[guess]** = a judgement.

## Summary

- **On a phone, a multi-photo grid is limited by the screen's width, not its height.** With two photos across, each
  photo is about 30 mm wide on every common phone (169 CSS px at 360 px wide, 196 at 414) [measured]; with three
  across, about 20 mm (110-128 px). Hiding the header and the tab bar gives 108 px of height and **nothing** to a 2 × 2
  grid: the free height is already there (Find the X today leaves an empty band of about 190 px under its prompt at
  360 × 690) [measured]. Hiding them helps only the layouts that stack photos (the pair, one large photo plus three).
- **What reads at about 30 mm (2 × 2):** a whole fish's silhouette and colours, a sea slug's colour pattern when the
  animal fills the frame, a coral colony's growth form. **At about 20 mm (three across):** a fish's shape and its main
  colour blocks, a juvenile's pattern (the emperor angelfish's rings), a sea slug's colour only. **Never in a small slot:**
  corallite walls, septa, rhinophores, cerata tips, fin spots and scale rows: they need a single photo or a stacked
  pair (about 65 × 50 mm) [my reading].
- **Recommended layouts per format** (screenshots listed below):
  - **Same or different?**: the two photos **stacked**, full width (344 × 287 px at 360 × 690, about 65 × 54 mm), the
    Same / Different buttons under them, header and tab bar hidden. Every subject, coral close-ups and corallites
    included: at that size the walls of *Favites* and *Dipsastraea* can be compared.
  - **Odd one out**: the **2 × 2 squares** of Find the X (169-196 px), on photos cut around the animal. Fish now (420
    tiles); sea slugs after a box pass; **no coral colonies** (at 30 mm only the growth form is left, and rule C4 says
    growth form must never be what tells genera apart).
  - **Life stages matched**: **one large photo** (the juvenile or female, 344 × 258) **and three small ones** in a row
    (110-128 px). It works for fish whose phases differ in colour and pattern; the small ones need a crop on the fish.
  - **Down the tree**: one photo, as the quiz; no size problem; its cost is the scoring, not the screen.
- **Swipe one at a time** is not a comparison layout (the photos are never on screen together); keep the swipe only
  inside the enlarged view. **Hold to enlarge** (a long press; a tap answers, as in Find the X) is the way to see a small
  photo whole before answering, with the blind credit (rule P5).
- **Engine rules** (section 5): eligibility computed at build from the judging tags and the animal's box (rules S1,
  L13); the planner checks the slot's size on screen and **falls back to the usual one-photo question** when a photo
  would be too small for what is asked; never a smaller grid.
- **The data is the bottleneck, not the screen.** 8,662 fish photos pass the tile rule's tags, but only 425 have the
  fish's box, so 420 have a tile [measured]; no juvenile can have one (the tile rule excludes `j`); no sea slug or coral
  photo has a box. A box pass is the first build step for Odd one out beyond circle 1 and for Life stages matched.
- **Found on the way** (for the integrator): today's Find the X shrinks its tiles to 86-97 px once answered, under the
  feedback sheet, and cuts the family names ("Trigg…") [measured]; and the app on `127.0.0.1` still sends three
  anonymous reads to the sheet at each load (`?stats=1`, `?board=1`, `?achs=1`), which this study's harness aborted
  (section 1).

## 1. How it was measured

- **Rule D1 from the first run.** Every Playwright context aborted any request that was not `127.0.0.1`; the photos'
  R2 host was answered from local copies (fetched once with curl through the proxy); the browser was launched with
  `--host-resolver-rules=MAP script.google.com 127.0.0.1, MAP script.googleusercontent.com 127.0.0.1, MAP
  *.googleusercontent.com 127.0.0.1`; service workers blocked; every request's host logged. The mockup runs made 0
  requests to Google [measured]. The real app's runs (served from `127.0.0.1`) tried 3 GET requests per load to the
  sync script, `?stats=1`, `?board=1` and `?achs=1` (anonymous reads: the photo ratings, the leaderboard, the
  achievements); all 12 (4 sizes) were aborted in the browser, and the resolver map would have sent any escape to
  `127.0.0.1` [measured]. No write was attempted (rule D1's `LOCAL` guard covers them) [read: `app.js` `LOCAL`,
  `sheetFetch`]. The integrator may want the reads gated too; nothing reached the sheet.
- **Two harnesses, kept outside the repo** (the study's scratchpad): the **real app** (the worktree served locally,
  fish, `FIND.P = 1` as `tests/fish.smoke.js` does, the header, tab bar, stage and tiles measured with
  `getBoundingClientRect`, before and after an answer); and **mockups** (one static page, the app's tokens and fonts,
  our real photos from R2: the fish's 960 px files and 360 px tiles, the sea slugs' and corals' 960 px files), each photo
  box sized in JS so it can be measured exactly. Screenshots at `deviceScaleFactor` 2, `isMobile` and `hasTouch` on.
- **Photos used** (all in play today): fish tiles of *Chaetodon baronessa*, *C. ocellicaudus*, *C. punctatofasciatus*
  and *Centropyge vrolikii* (FishBase / iNaturalist reference photos, `fish-game.json` `xc`); *Sargocentron
  caudimaculatum* and *S. cornutum*; *Pomacanthus imperator* juvenile and the adults of *P. imperator*,
  *P. sexstriatus*, *P. semicirculatus*; *Pseudanthias pleurotaenia* female and the males of three *Pseudanthias*;
  sea slugs *Chromodoris annae* and *C. willani*, *Phyllodesmium briareum*; corals *Pocillopora*, *Acropora*,
  *Favites* and *Dipsastraea* (colony, close-up, corallites). Photos with a watermark (`w`) were left out of the shots.

### The usable viewport

| Screen (CSS px) | Share | Browser | Usable (measured or derived) |
|---|---|---|---|
| 360 × 800 | Philippines, mobile, June 2026: 17.5 % (the first); 360 × 806 8.8 % [read: StatCounter] | Chrome on Android | 360 × 724 with the status bar and Chrome's toolbar (Playwright's Chromium descriptors take 76 px off the screen height: Pixel 9 and 10, 360 × 808 → 360 × 732; Galaxy Z Flip 7, 360 × 840 → 764) [measured]; about **360 × 690** with a three-button navigation bar (about 34-48 px more) [guess, the figure given] |
| 390 × 844 | worldwide, Aug 2026: 6.8 % [read: StatCounter] | Safari on iPhone | **390 × 664** (Playwright's iPhone 12-14 descriptors); 390 × 651 on the iPhone 16e / 17e descriptors [measured] |
| 414 × 896 | Philippines 6.1 %, worldwide 13.6 % (the first) [read: StatCounter] | Safari on iPhone | **414 × 715** (iPhone 11, 11 Pro Max descriptors) [measured] |

Shots were taken at 360 × 690, 390 × 664 and 414 × 715. **390 × 664 is the shortest of the three**: a layout that fits
there fits the others. The real app was also measured at 360 × 724. A native app (Flutter) loses only the status bar
and the gesture or navigation bar: on a 360 × 800 dp phone about 360 × 730-770 dp [guess]; **its width is the same**, so
every two- or three-across size below holds for it unchanged.

### What our app's chrome takes on a phone [measured]

Header 49 px; bottom tab bar 59 px; side gutters 16 px each; the prompt line 45 px. Today's one-photo quiz stage:
328 × 391 at 360 × 690, 358 × 365 at 390 × 664, 382 × 416 at 414 × 715. Find the X's tiles: 160, 175 and 187 px.

## 2. The layouts, measured

CSS px at 360 × 690 | 390 × 664 | 414 × 715, then the physical size (mm, computed from the screen's diagonal: 6.5″
for 360 × 800, 6.1″ for 390 × 844 and 414 × 896, so 0.188, 0.167 and 0.157 mm a CSS px). The device pixels are the CSS
size times the screen's ratio (2 to 3): a 169 px slot needs a 338-507 px file. Mockups: 8 px side gutters, 6 px gaps,
header and tab bar hidden, a 44 px prompt bar with a ✕ to leave (44 px target).

| Layout | 360 × 690 | 390 × 664 | 414 × 715 | Shots (section 7) |
|---|---|---|---|---|
| **1. 2 × 2 squares, chrome hidden** | 169 (32 mm) | 184 (31 mm) | 196 (31 mm) | `mock-grid-*` |
| 1. today's Find the X, chrome shown | 160 (30 mm) | 175 (29 mm) | 187 (29 mm) | `real-findx-*` |
| 1. today's Find the X, answered | **86** (16 mm) | **86** (14 mm) | **97** (15 mm) | `real-findx-answered-*` |
| 1. 2 × 2 squares, answered, chrome hidden | 169 (the feedback sheet sits in the free band) | 184 | 196 | `mock-grid-fishodd-done-*` |
| 1b. four full-width strips, cut on the fish's box | 344 × 155 (65 × 29 mm) | 374 × 148 | 398 × 161 | `mock-strips-fishodd-*` |
| 1c. 2 × 2 portrait cells | 169 × 236 | 184 × 257 | 196 × 274 | `mock-portrait-slugodd-*` |
| **2. one large (4:3) + three small** | 344 × 258 + 3 × 110 (21 mm) | 374 × 281 + 3 × 120 (20 mm) | 398 × 299 + 3 × 128 (20 mm) | `mock-one3-*` |
| **3. swipe, one at a time** (the next one peeks in) | 301 × 562 | 327 × 536 | 348 × 587 | `mock-swipe-slugodd-*` |
| 3b. the pair stacked (Same or different?) | 344 × 287 (65 × 54 mm) | 374 × 274 (62 × 46 mm) | 398 × 299 (62 × 47 mm) | `mock-pair-*` |
| 3c. the pair side by side | 169 × 219 | 184 × 239 | 196 × 254 | `mock-pairside-coralsame-*` |
| **4. held open (enlarged), Back and Choose** | 360 × 288 (4:3 photo, whole width) | 390 × 312 | 414 × 331 | `mock-enlarge-slugodd-*` |
| one photo (Down the tree, 4 names under it) | 344 × 477 | 374 × 451 | 398 × 502 | `mock-tree-*` |
| **5. crops** | the same photos at 96 and 160 px: the tile cut on the fish's box, a centre crop, the whole photo on a blurred band | | | `mock-crops-*` |

With the header and tab bar shown, the stacked pair would get 344 × 233 at 360 × 690 instead of 287 (the 108 px come out
of the two photos) [computed from the same layout's budget]. **Rule of thumb, any phone: count the columns, not the
pixels.** One column ≈ 62-65 mm, two ≈ 30 mm, three ≈ 20 mm, four ≈ 15 mm wide, whatever the model, because CSS px
(and Flutter's dp) are designed to keep a physical size [measured above].

### Layout by layout

1. **2 × 2 grid, header and tab bar hidden.** The squares are set by the width: 169-196 px whether the chrome is shown
   or not (the chrome version, `mock-grid-fishodd-chrome-*`, gets the same squares). What hiding the chrome changes is
   the answered state: the feedback sheet then fits in the free band under the grid and the four photos stay at full
   size with their names, where today's Find the X shrinks them to 86-97 px and cuts the names. Tap targets are far above
   44-48 px [read: Apple HIG 44 × 44 pt, Material 48 × 48 dp, WCAG 2.5.5 44 × 44 CSS px]. It is Duolingo's "select the
   correct image" layout (a 2 × 2 grid of image cards), which then asks for a Check button [read]; ours answers on the
   tap, as Find the X does. **Variant 1b**, four full-width strips cut on the fish's box: a fish in profile is about
   twice as long on screen as in a square (about 300 px against 150) [measured on the shots], but a tall fish
   (butterflyfish, angelfish, batfish) loses its fins top and bottom; strips suit fish whose box is at least about 1.6
   times wider than tall [my reading], and never corals or sea slugs photographed from above. **Variant 1c**, portrait
   cells, uses the height for sea slugs seen from above (often portrait photos, `ar` 0.8) but crops a fish in profile.
2. **One large photo with three small ones.** The large one is a good reference (65 × 49 mm); the three small ones are
   at the three-across size, about 20 mm. The emperor angelfish's three adults (*P. imperator*, *P. sexstriatus*,
   *P. semicirculatus*) are told apart at 110 px by their colour blocks; the three male anthias by their colour and
   the female's similarity [my reading]. A gallery's thumbnails are about the same size (a 3-column grid of about 120 px
   with a tap to enlarge) [read]: three across is the floor for a photo meant to be recognised.
3. **Swipe or one at a time.** The largest photos (301-348 px wide), but the photos are never side by side, so the
   player compares from memory: it removes the comparison the formats are for (side-by-side comparison is the learning
   value, FORMATS.md §2 row 3 [read]). Kahoot's answer to small phones is to show the images on a shared screen and only
   coloured buttons on the phone [read]: a live-mode idea (ROADMAP "Live mode"), not a solo one. Keep the swipe for the
   enlarged view (between the 4 photos, as the lightbox already does; rule U6 allows swipeable strips).
   **The pair stacked (3b)** is the clear layout for Same or different?: each photo is as wide as the screen, 54 mm high
   at 360 × 690; side by side (3c) each photo is half as wide and the corallites shrink to texture.
4. **Long press or tap to enlarge, then back.** The enlarged photo is the screen's width (68 mm), 4:3. A tap must stay
   the answer (as in Find the X), so **enlarging is a long press** (about 500 ms) with a Back button and a "Choose this
   one" button in the enlarged view; the enlarged view is blind before the answer (rule P5, `blindCredit`) and marks the
   question enlarged (`QCLOCK.zm`, as the quiz does). A long press is not discoverable: the first multi-photo question
   says it once ("Hold a photo to see it bigger") [guess].
5. **Square crops centred on the animal.** The fish already have them: the judging pass's box `bb` and the tile `xc`
   cut from it, `img/<f>-x.webp`, 360 px square, the fish filling at least 70 % of it (`judging/FISH.md` "The fish's
   box", `tools/fish_game.py` `tile_crop`) [read]. On the crops sheet: the tile always keeps the whole fish; a plain
   centre crop cut the snout of a butterflyfish and the tail of a fish off-centre; the whole photo on a blurred band
   keeps everything but shows the fish smaller (a 1.5 photo in a square: two thirds of the side). Sea slugs from above
   are usually centred and large (`l` for 86 % of them) [measured], so a centre crop mostly works, but an aeolid's
   cerata and a long slug's ends are cut; a coral colony's centre crop loses the colony's outline (a table *Acropora*
   becomes a flat texture) [my reading]. The 360 px tile is enough for a 169 px slot at a ratio of 2 (338 px) but is
   upscaled about 1.4 times at a ratio of 3 (507 px needed) [measured]; a 480 px tile would cover both [guess].

## 3. What can still be recognised, per subject

From a size ladder (each photo at 64, 80, 104, 128, 160 and 200 CSS px, `mock-ladder-*`) and the layouts above. The
useful measure is the **size of the feature on screen**, not the photo's: the same 104 px corallite photo shows
corallites, a 104 px colony photo shows none.

| Subject and cue | Reads from (CSS px of the animal or feature, about) | At 2 across (169-196) | At 3 across (110-128) |
|---|---|---|---|
| Fish: silhouette, family shape (butterflyfish disc, angelfish spine, squirrelfish) | animal ≥ 60-80 px long | yes | yes |
| Fish: main colours and bands (*Chaetodon* bands, the emperor juvenile's rings) | animal ≥ 90-110 px | yes | mostly |
| Fish: species details (spots, a fin margin, the eye band's shape, scale rows) | feature ≥ 20-25 px | some | no |
| Sea slug, dorid: colour pattern (*Chromodoris annae* against *C. willani*) | animal ≥ 100-120 px | yes, if it fills the frame | colour only |
| Sea slug: rhinophores, gills, cerata tips | feature ≥ 20-25 px | no | no |
| Coral colony: growth form | colony ≥ 60 px | yes, but form only | yes, form only |
| Coral close-up: valleys, the meander | photo ≥ 104 px | yes | barely |
| Coral corallites: walls shared or separate, septa (*Favites* against *Dipsastraea*) | corallite ≥ 25 px | no (texture) | no |

All [my reading] on the shots, at about 35 cm: 25 CSS px ≈ 4.7 mm ≈ 0.8° of visual angle; 80 px ≈ 15 mm ≈ 2.5°; 120 px
≈ 23 mm ≈ 3.7°; 160 px ≈ 30 mm ≈ 4.9° (computed at 0.188 mm a px). These are the figures to carry to ReefRecall: they
are physical sizes, valid on any phone. The judging tags already say how large the animal is in the frame (`l`: a
third of the frame's width or more; `m`: a sixth to a third; `s`: less) [read: `judging/FISH.md`, `judging/SEASLUG.md`],
so the animal's size on screen can be estimated without a box: in a square cut of a 3:2 photo, an `l` fish spans at
least half the slot, an `m` fish a quarter.

## 4. Per format

| Format | Layout | Subjects and photos | Falls back to |
|---|---|---|---|
| **Same or different?** | 3b, the pair stacked, chrome hidden, Same / Different (48 px buttons) | All three; corals on close-ups and corallites (that is where look-alike genera differ; colonies would test growth form, rule C4) | the one-photo question on the first photo's unit |
| **Odd one out** | 1, the 2 × 2 squares, chrome hidden | Fish on tiles (as Find the X); sea slugs once boxed; **corals: not in a grid** (only the growth form survives at 30 mm; rule C4) | one-photo question |
| **Life stages matched** | 2, one large + three small | Fish species with a juvenile, female or male photo (`fish-game.json` `ph`: 2,929 juvenile, 1,226 male, 427 female photos [measured]); the small slots need the fish's box | one-photo question on the species |
| **Down the tree** | one photo, 4 names, the steps as chips above the photo | All (the tree exists for the three subjects) | none needed |

Per question, each photo comes from one observation (rule P4 is about one unit's photos in one question; the
multi-photo formats show several units, each with one photo of one observation, as Find the X does) [my reading of
P4; Same or different? on one unit shows two observations by design, which the build PR states]. No photo
of several species one could take for the subject (rule P3: count `k`, `x` never).

## 5. Engine rules proposed

Subject-neutral (rule S1): written on photo fields and on the slot's size, never on a subject's name. Computed once
(rule L13): a build tool writes the fields, the phone only compares numbers.

1. **A photo may fill a small slot** (two or more across) only when its tags say: whole (`1`), good light (`g`),
   colour loss `0`-`1`, sharp (`s`), size `l` (or `m` with a box), one animal or several of its kind (`1`, `s`), no
   camouflage, out-of-water or features-hidden flag (`c`, `a`, `f`). The fish's tile rule already says nearly this
   (`tools/fish_game.py` `tile_tags`) [read]; the juvenile flag `j` is no reason to exclude a photo here (it is what
   Life stages matched shows), only the tile's 70 % fill and box rules stay.
2. **A square cut needs the animal's box** for a 4-up or 3-across slot (the centre crop cuts too often: section 2, 5).
   Fields at build: `bb` (the box, as the fish's), and a cut square (`xc`). The pair stacked (ratio about 1.2) and the
   large slot of layout 2 (4:3) take the whole photo with little crop: no box needed there.
3. **A size floor per what is asked**, compared with the slot's actual side on screen (read from the stage, as
   `fitStage` does: no breakpoint, rule U4): the animal must span at least **80 CSS px** (about 15 mm) for a family or
   look-alike-group question, **110 px** (about 21 mm) for a species told by colours, and a photo whose cue is a fine
   feature (corallites, rhinophores, a spot) is never put in a slot under **280 px** (the pair stacked or a single
   photo). The animal's span = slot side × the box's fill (the tile: at least 0.7) or, without a box, × 0.5 for `l`
   (section 3). A subject declares, per unit rank, which kind of cue its question needs (a `SUBJECTS` field: e.g. coral
   genera = fine features below the colony, fish families = shape) [guess: the field's shape is the build PR's].
4. **Fall back, never shrink.** When the slot at this screen size cannot hold a legible photo, or fewer eligible
   observations than the format needs (Odd one out: 3 of the majority unit and 1 of the odd one; Life stages: 1 per
   phase), the planner serves the usual one-photo question on the unit it drew. The decision is taken before any
   random draw that would change the other questions (as `planFind` does), so a player who never qualifies draws
   exactly as before [read: `quiz.js` `planFind`].
5. **Larger screens play the same formats bigger** (tablet and desktop: the 2 × 2 cells reach 300 px or more), so the
   size floor is the only gate; corallites in a 2 × 2 become possible on a desktop [guess].

What exists today against these rules [measured]: fish photos 24,386, of which 8,662 pass the tile rule's tags, 425 have
a box and 420 a tile (27 of the 64 fish units in `fish-game.json` have 3 or more tiled observations); 1,562 juveniles would pass but for the
`j` flag; 762 male or female photos pass; sea slugs: 1,811 of 3,014 pass the equivalent tags, none has a box; corals:
no box, and none needed for the pair.

## 6. Effort, in agent time

Hours of agent work, reviews and the Codex rounds included [guess, one agent; the box pass's rate is untimed until a
first sheet is].

| Step | Hours |
|---|---|
| Focus mode for multi-photo questions (header and tab bar hidden while one is on screen, the ✕, back on Next) and the long press to enlarge | 3-4 |
| Eligibility fields at build and the size floor in the planner (a tool, its tests, the `SUBJECTS` field) | 4-6 |
| A box pass for the sea slugs and the fish juveniles and phases (on the existing judging sheets; about 1,500-2,000 photos for a first coverage of circle 1) | 10-15 |
| **Same or different?** (planner, the pair stacked, 2-choice scoring and its log format, the smoke) | 6-8 |
| **Odd one out** (reuses Find the X's tiles and gate; scoring: rule L2 on the units confused) | 5-7 |
| **Life stages matched** (layout 2, phases from `ph`, needs the box pass) | 8-10 |
| **Down the tree** (multi-step question, a partial credit per step, the global score's components, the sheet's replay: rules D3-D5) | 10-14 |
| The four as Practice entries (one page with four doors, rule L4's one path) | 3-4 |

## 7. Screenshots

Kept outside the repo (no image is committed); the integrator sends them to Pierre as files. At 360 × 690, 390 × 664 and
414 × 715 (the size is in each name), ratio 2:

- the real app: `real-quiz-*`, `real-findx-*`, `real-findx-answered-*` (also at 360 × 724);
- layout 1: `mock-grid-fishodd-*`, `mock-grid-fishodd-chrome-*`, `mock-grid-fishodd-done-*`, `mock-grid-slugodd-*`,
  `mock-grid-coralodd-*`, `mock-strips-fishodd-*`, `mock-portrait-slugodd-*`;
- layout 2: `mock-one3-stage-*` (emperor angelfish), `mock-one3-stage2-*` (anthias);
- layout 3: `mock-swipe-slugodd-*`, `mock-pair-fishsame-*`, `mock-pair-slugsame-*`, `mock-pair-coralsame-*`,
  `mock-pairside-coralsame-*`;
- layout 4: `mock-enlarge-slugodd-*`; Down the tree: `mock-tree-*`;
- layout 5 and the ladder: `mock-crops-96-400x690`, `mock-crops-160-600x1000`, `mock-ladder-860x1900`.

## 8. Questions for Pierre

Only the product choices; the layouts, the focus mode and the long press are the integrator's calls (easy to correct
afterwards).

- **(a) Corals in the multi-photo formats.** At two across a coral colony shows only its growth form, which rule C4
  forbids as the way to tell genera apart. Corals play Same or different? only, on close-ups and corallites, stacked;
  no coral Odd one out or grid? *Recommendation: yes*, corals in the pair only; colonies come back in a grid only on
  tablet and desktop if the size floor allows.
- **(b) A box pass before Life stages matched and the sea slugs' Odd one out.** The small slots need a cut around the
  animal, which no juvenile, phase or sea slug photo has today; the pass is agent judging work (10-15 agent hours for
  a first coverage), on the same rubric as the fish's box. Run it first? *Recommendation: yes*, the fish's phases first,
  then the sea slugs; Same or different? and Odd one out on fish tiles need nothing and can be built meanwhile.
- **(c) One tap answers, or select then Check.** Find the X answers on the tap; Duolingo has the player select an image
  and press Check, which forgives a slip of the thumb but costs a tap per question. *Recommendation: one tap answers*,
  as Find the X, with the long press to enlarge; Check only if the players' reports show slips.

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
  rules C4, P3, P4, P5, U2, U4, U6, S1, L13, D1.
