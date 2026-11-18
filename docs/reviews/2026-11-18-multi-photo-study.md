# Several photos on a small phone: a study for the new formats (2026-11-18)

Status: design study, docs only. No app code, data file or photo changed. Pierre answered its three questions on
2026-11-18 (10:45-10:49 Manila); this version follows his answers (section 9): coral grids allowed, the only limit
known in advance being the size on screen, then the players' data; **frames** on every photo, proposed by agents and
valid by default (section 6); the header and the tab bar kept.

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
  (110-128 px) [measured]. The header and the tab bar stay (Pierre, (c); rules U3, U12): they take 108 px of height and
  nothing from a 2 × 2 grid, whose squares are set by the width (Find the X today leaves about 190 px empty under its
  prompt at 360 × 690) [measured].
- **The answered state is where space runs out (rule U2).** The quiz's feedback sheet is 393-414 px tall [measured].
  Under it, today's Find the X shrinks its tiles to 86-97 px and **hides half of the bottom row** behind the sheet,
  with the family names cut ("Trigg…") [measured, `real-findx-answered-*`]. With the same long feedback, the mocked
  2 × 2 drops to 118-163 px and the stacked pair to 226 × 141. A **short sheet** (the verdict, one telling line, More,
  Next: about 150 px), with each photo named on the photo, keeps the 2 × 2 at 169-196 px and the stacked pair at 282-323
  px wide with the header and tab bar shown [measured]. Recommended for every multi-photo format; its "look here" line
  points at a `feature` frame (section 6).
- **What reads at two across (about 30 mm)**: a whole fish's silhouette and colour pattern; a sea slug's colour pattern
  when it fills its frame; a coral colony's form and colour; a close-up's valleys; **corallites too, when the photo
  frames them large**: on the corallite grids shot here, *Favites* and *Dipsastraea* corallites are 25-60 px across and
  their walls (shared or apart) and septa can be read [my reading]. **At three across (about 20 mm)**: a fish's shape
  and colour blocks only. What decides is the size of the animal or of the feature **on screen**, not the slot's.
- **Recommended layouts**, all with the header and the tab bar (screenshots in section 8):
  - **Same or different?**: the two photos **stacked**, full width (344 × 233 at 360 × 690, 352 × 220 at 390 × 664,
    392 × 245 at 414 × 715), Same / Different under them. Every subject and every view.
  - **Odd one out**: the **2 × 2 squares** of Find the X, every subject. Corals included (Pierre, (a)): grids of one
    view (all corallites, all close-ups) or of mixed views, the mix of views being part of the question's difficulty.
  - **Life stages matched**: the **2 × 2 too, the juvenile or female outlined in the first cell**, the three adults or
    males in the others: every photo at 169-196 px. One large photo with three small ones (110-128 px) was mocked
    and measured: the three small ones fail the size floor everywhere (77-90 px of fish with a frame).
  - **Down the tree**: one photo, as the quiz; no size problem; its cost is the scoring.
- **Swipe one at a time** is not a comparison layout (the photos are never on screen together): keep the swipe inside
  the enlarged view. **Enlarging before the answer**: a long press (a tap answers, as in Find the X), blind (rule P5).
- **Engine rules** (section 5): the only limit set in advance is a **size floor on screen** (75 px of animal for shape
  and colour blocks, 110 px for a pattern, 25 px per feature for a fine feature such as a corallite); a photo under it
  is not used in that slot and the question falls back to **the usual one-photo question**, never a smaller grid. Then
  **the players' data decides** (Pierre, (a)): a view or a frame that does not carry enough to identify, even for the
  strongest players, is dropped from the format by the engine.
- **Frames** (Pierre, (b); section 6): every photo can carry a `subject` frame (the animal or colony alone, tight),
  `feature` frames (a part, tagged with the criterion it shows) and `context` frames (the setting). Agents propose them
  only when sure, they are **valid by default**, Pierre fixes or deletes one in the admin's photo page and his fix is
  never overwritten (rule A1); a player's report points at the frame. The 425 fish boxes become `subject` frames.
- **The data is the bottleneck, not the screen.** 8,662 fish photos pass the tile rule's tags but only 425 have the
  fish's box (420 a tile) [measured]; no juvenile can have one (the tile rule excludes `j`); no sea slug or coral photo
  has one. The `subject` pass comes before Life stages matched and the sea slugs' grids.
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
   each photo is half as wide, its corallites half as large.
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
   needed) [computed]; a 480 px tile would cover both [guess]. The `subject` frame of section 6 is this box, for every subject.

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
| Sea slug: rhinophores, gills, cerata tips | feature 20-25 px | no on the whole photo; yes on a `feature` frame (section 6) | no |
| Coral colony: growth form | colony about 60 px | yes, form and colour only | yes, form only |
| Coral close-up: valleys, the meander | photo about 104 px | yes | barely |
| Coral corallites: walls shared or separate, septa (*Favites* against *Dipsastraea*) | corallite about 25 px | yes when the photo frames about 5-7 corallites across or fewer (25-60 px each on `mock-grid-coralmacro-chrome-*`) | no |

All [my reading] on the shots, at about 35 cm: 25 CSS px ≈ 4.7 mm ≈ 0.8° of visual angle; 75 px ≈ 14 mm ≈ 2.3°;
110 px ≈ 21 mm ≈ 3.4°; 160 px ≈ 30 mm ≈ 4.9° (at 0.188 mm a px) [computed]. These are the figures to carry to
ReefRecall: physical sizes, valid on any phone. The judging tags already say how large the animal is in the frame (`l`:
a third of the frame's width or more; `m`: a sixth to a third; `s`: less) [read: `judging/FISH.md`, `judging/SEASLUG.md`],
so the animal's size on screen can be estimated without a box: in a square cut of a 3:2 photo an `l` fish spans at
least half the slot, an `m` fish a quarter [computed].

## 4. Per format

| Format | Layout | Subjects and photos | Falls back to |
|---|---|---|---|
| **Same or different?** | 3b, the pair stacked, Same / Different (48 px buttons), a short sheet once answered | Every subject and every view | the one-photo question on the first photo's unit |
| **Odd one out** | 1, the 2 × 2 squares, a short sheet | Every subject: fish on their `subject` frames (the tiles today), sea slugs once framed, corals on any view: one view for the four (all corallites, all close-ups, all colonies) or mixed views | the one-photo question |
| **Life stages matched** | 1d, the 2 × 2 with the juvenile or female outlined | Fish species with a phase photo (`fish-game.json` `ph`: 2,929 juvenile, 1,226 male, 427 female photos [measured]), each on its `subject` frame (none of them has one yet) | the one-photo question on the species |
| **Down the tree** | one photo, 4 names, the steps as chips above the photo | Fish (families, genera, species); sea slugs once their genera and species are units (their tree has the three ranks in `seaslug.json` [read]); corals have no rank below the genus | none needed |

**Corals** (Pierre, 2026-11-18, answer (a): "On pourrait très bien avoir un odd one out avec que des corallites ou des
zooms moyens. Je te rappelle que la combinaison des niveaux de zooms n'est pas obligatoire et influence la difficulté.
Seul les données réelles de jeux (surtout pour les experts) pourront nous dire si certaines photos isolées (par exemple
que wide ou que corallite) n'apportent pas suffisament d'info pour une identification correcte (même pour un expert).").
Coral grids are played: four corallite photos, four close-ups, four colonies, or a mix. The shots show why it works on
a phone: a corallite photo frames a few corallites across, so at 169 px each corallite is still 25-60 px wide
(`mock-grid-coralmacro-chrome-*`) [my reading]. The views shown are part of the difficulty, as the photo quiz's choice
of views already is (`model.js` `photoSet` aims a question's photos at a difficulty [read]). Rule C4 is kept by the
draw: the distractors come from the player's mix-ups, the pairs players confuse and the declared look-alikes
(`model.js` `distractors` [read]), never from the growth form.

**Rule P4** ("all photos of one game question come from one observation") was written for one unit's views in one
question [read]. Odd one out shows three observations of the majority unit and Same or different? two of one unit when
the answer is Same, by design; Find the X already shows four observations, one per unit. The build PR needs P4's
wording to say so; the new wording goes to Pierre for his OK, as any rule's (AGENTS.md "Writing a rule down").

## 5. Engine rules proposed

Subject-neutral (rule S1): written on photo fields, frames and the slot's size, never on a subject's name. Computed once
(rule L13): a build tool writes the fields, the phone only compares numbers.

1. **A photo may fill a slot narrower than the screen** only when its tags say: whole (`1`), good light (`g`), colour
   loss `0`-`1`, sharp (`s`), size `l` (or `m` with a `subject` frame), one animal or several of its kind (`1`, `s`),
   and no camouflage, out-of-water or features-hidden flag (`c`, `a`, `f`); never count `k` or `x` (rule P3). The fish's
   tile rule says nearly this (`tools/fish_game.py` `tile_tags`) [read]; the juvenile flag `j` is no reason to exclude a
   photo here (it is what Life stages matched shows). Corals have no such tags: their views and quality ratings stand in
   for them, and the size floor does the rest.
2. **The slot shows the photo's `subject` frame** when it has one (a square cut around it, as the fish tiles are), and
   **the whole photo** otherwise (centre-cropped to the slot). A photo with no frame is never refused for that: the
   size floor below decides with what the photo is known to show.
3. **The size floor, the only limit set in advance**, compared with the slot's actual side on screen (read from the
   stage, as `fitStage` does: no breakpoint, rule U4):
   - shape and colour blocks (a family, a look-alike group, a phase told by colour): the animal spans at least **75 px**
     (about 14 mm);
   - a pattern (a species told by bands, rings, a mantle's pattern): **110 px** (about 21 mm);
   - a fine feature (corallites, rhinophores, a fin spot): the feature spans at least **25 px** (about 4.7 mm).

   The span on screen = the slot's side × the share of the frame the animal or the feature takes: from the `subject`
   frame (the tile: at least 0.7), else 0.5 for an `l` photo, and for a fine feature from its `feature` frame (its
   width over the photo's), else from the view (the corallite photos shot here frame 2-7 corallites across: a default share of 1/6
   [my reading of the shots, a default until feature frames and the data replace it]). A subject declares, per rank,
   which cue its questions need (a `SUBJECTS` field) [guess: its shape is the build PR's]. Checked against the
   recommended layouts [computed]:

   | Slot | 360 × 690 | 390 × 664 | 414 × 715 | Passes |
   |---|---|---|---|---|
   | 2 × 2 (1, 1d), `subject` frame: 0.7 × 169 / 184 / 196 | 118 | 129 | 137 | shape, blocks, pattern |
   | 2 × 2, no frame, `l`: 0.5 × side | 85 | 92 | 98 | shape and blocks only |
   | 2 × 2, a corallite photo: 1/6 × side, per corallite | 28 | 31 | 33 | fine feature |
   | three across (2), `subject` frame: 0.7 × 110 / 120 / 128 | 77 | 84 | 90 | shape and blocks only |
   | the pair stacked: 344-392 px wide, 282-323 once answered with a short sheet; a corallite photo: 1/6 × width | 57 | 59 | 65 | everything |

   A corallite photo that frames 7 or more corallites across (24 px or less at 169) fails in a 2 × 2 at 360 px wide
   and plays in the pair; with feature frames the check uses each photo's own scale instead of the default.
4. **Then the players' data decides** (Pierre, (a)). Per format and per view or frame kind, the share of right answers
   of the strongest players (those whose ability on the units asked is high; the experts, Pierre included, rule L3) is
   compared with chance; a view whose share stays near chance once enough answers are in is dropped from that format by
   the engine, and comes back if the data changes. The thresholds (how strong, how many answers, how near chance) are
   set by the build PR's check (rules L11, L12), not here.
5. **Fall back, never shrink.** When the slot at this screen size cannot hold a legible photo for the cue asked, when the
   data dropped the view, or when fewer eligible observations exist than the format needs (Odd one out: 3 of the
   majority unit and 1 of the odd one; Life stages: 1 per phase), the planner serves the usual one-photo question on the
   unit it drew. The decision is taken before any random draw that would change the other questions (as `planFind`
   does), so a player who never qualifies draws exactly as before [read: `quiz.js` `planFind`].
6. **The answered state keeps the photos' size**: names on the photos (as Find the X does), a short sheet (the verdict,
   one "look here" line on the photo's `feature` frame when it has one, More, Next), the full tips behind More (rule U2).
7. **Larger screens play the same formats bigger** (tablet and desktop: 2 × 2 cells of 300 px or more), the floor
   unchanged.

What exists today against these rules [measured]: 24,386 fish photos, of which 8,662 pass the tile rule's tags, 425 have
a box and 420 a tile (27 of the 64 fish units in `fish-game.json` have 3 or more tiled observations); 1,562 juveniles
would pass but for the `j` flag; 762 male or female photos pass; sea slugs: 1,811 of 3,014 pass the equivalent tags,
none has a box; corals: no frame, their views known.

## 6. Frames: one format for every subject (Pierre, (b))

Pierre, 2026-11-18, answer (b): yes, and generalised: several frames per photo, each with a teaching role, for every
subject. Validation: "Je ne vais pas m'amuser à tout valider à la main. On valide par défaut et puis on corrige après si
besoin".

| Frame | What it holds | Used by |
|---|---|---|
| `subject` (one) | the individual or the colony alone, tight | grids, thumbnails, light packs (a square cut, as the fish tiles) |
| `feature` (one or more) | a part (corallites, rhinophores, a mouth, a tail), **tagged with the criterion it shows** (a sourced cue: rule C2) | the short sheet's "look here", questions on a detail, the size floor for fine features |
| `context` (one or more) | the animal in its setting: the substrate, the species around it | habitat questions, the virtual dive (ROADMAP "Game modes") |

- **Proposed by agents, only when sure**: a frame the judge cannot settle is left out, and the question then uses the
  whole photo (as a photo without a fish box has no tile today, `judging/FISH.md` "The fish's box" [read]).
- **Valid by default**: a proposal goes live with the next build, without a review.
- **Pierre's fix**: the admin's photo page shows a photo's frames over it, and each can be adjusted or deleted (one
  click, Undo: rule A2). The fix goes into `curation.json` through the admin's draft and Publish (rule A1), and a rebuild
  lays it over the agents' proposals, never the reverse: a fixed or deleted frame is never proposed again for that
  photo.
- **Reports**: a player's report on a photo shown through a frame names the photo and the frame (rule U14), so the fix
  starts at the right place. If the report carries a new field to the sheet, rules D3 and D4 apply.
- **Stored** [guess: the build PR decides]: per photo a list `fr` of `{k: subject | feature | context, b: [left, top,
  right, bottom] as fractions (the fish box's format), c: the criterion's id for a feature}`, written by the build from
  the judging files, with Pierre's fixes laid over. The 425 fish boxes become `subject` frames; the 420 tiles stay the
  square cuts of those frames. A `feature` frame can be shown as a CSS crop of the 1,600 px file, so it needs no new file
  on R2 (the strips of layout 1b were drawn that way).
- **Order** (Pierre): the common format and the admin's fix tool first; then the `subject` pass, the fish's juveniles and
  phases, then the sea slugs; then the `feature` frames with the short answered sheet; the `context` frames later, with
  the virtual dive.

## 7. Effort, in agent time

Hours of agent work, reviews and the Codex rounds included [guess, one agent; the passes' rate is untimed until a first
sheet is: about 150-250 photos an agent hour on 9-photo sheets is assumed].

| Step, in Pierre's order | Hours |
|---|---|
| 1. The frame format: the build writes `fr` from the judging files, the 425 fish boxes moved to `subject` frames, the tiles cut from them for every subject, Pierre's fixes laid over from `curation.json`, tests | 6-8 |
| 2. The admin's fix tool: a photo's frames drawn on the photo page, adjust or delete, Undo, Publish (rules A1, A2) | 6-8 |
| 3. Reports that name the frame (the report dialog, the admin's To do; a sheet column if one is needed: rules D3, D4) | 2-4 |
| 4. The `subject` pass: the fish's juveniles and phases (about 2,300 photos pass the other tile tags), then the sea slugs (about 1,800) | 16-27 |
| 5. The short answered sheet for multi-photo questions (names on the photos, "look here"); it also fixes today's Find the X answered state | 3-4 |
| 6. The `feature` pass, first coverage: the criteria as ids from the sourced cues, then the frames on circle 1 (corallites, rhinophores and gills, a fish's marks) | 15-25 |
| 7. Eligibility fields and the size floor in the planner (the `SUBJECTS` field, the per-view default scale) | 4-6 |
| 8. The data rule: per format and view, the strongest players' share against chance, the engine's drop, its check (rules L11, L12) | 5-8 |
| **Same or different?** (planner, the pair stacked, 2-choice scoring and its log format, P4's wording, the smoke) | 6-8 |
| **Odd one out** (reuses Find the X's gate; coral views as part of the difficulty; scoring under rule L2) | 6-9 |
| **Life stages matched** (layout 1d, phases from `ph`, after step 4) | 6-8 |
| **Down the tree** (multi-step question, a partial credit per step, the global score's components, the sheet's replay: rules D3-D5) | 10-14 |
| The four as Practice entries (one page with four doors, rule L4's one path) | 3-4 |
| Later: the `context` frames, with the virtual dive | not sized |

Same or different? and Odd one out on the fish tiles and the coral views need only steps 5 and 7; they can be built
while steps 1-4 run. Total for everything sized: about 90-140 agent hours.

## 8. Screenshots

Kept outside the repo (no image is committed); the integrator sends them to Pierre as files. At 360 × 690, 390 × 664 and
414 × 715 (the size is in each name), ratio 2:

- the real app: `real-quiz-*`, `real-findx-*`, `real-findx-answered-*` (also at 360 × 724);
- layout 1: `mock-grid-fishodd-*`, `mock-grid-fishodd-chrome-*`, `mock-grid-fishodd-done-*` (the real feedback's
  length), `mock-grid-fishodd-done-short-*`, `mock-grid-fishodd-chrome-done-short-*`, `mock-grid-slugodd-*`,
  `mock-grid-coralodd-*` (colonies), `mock-grid-coralmacro-chrome-*` (corallites), `mock-grid-coralmed-chrome-*`
  (close-ups), `mock-grid-coralmix-chrome-*` (mixed views), `mock-strips-fishodd-*`, `mock-portrait-slugodd-*`,
  `mock-ref2x2-stage-*`, `mock-ref2x2-stage2-*`, `mock-ref2x2-stage-chrome-*`, `mock-ref2x2-stage-done-*`;
- layout 2: `mock-one3-stage-*` (emperor angelfish), `mock-one3-stage2-*` (anthias), `mock-one3-stage-chrome-*`;
- layout 3: `mock-swipe-slugodd-*`, `mock-pair-fishsame-*` (with `-chrome`, `-done`, `-done-short`,
  `-chrome-done-short`), `mock-pair-slugsame-*`, `mock-pair-coralsame-*`, `mock-pairside-coralsame-*`;
- layout 4: `mock-enlarge-slugodd-*`; Down the tree: `mock-tree-*`;
- full screens: `mock-{grid-fishodd,pair-fishsame,one3-stage,ref2x2-stage,tree}-390x844` and `-414x896`;
- layout 5 and the ladder: `mock-crops-96-400x690`, `mock-crops-160-600x1000`, `mock-ladder-860x1900`.

## 9. Pierre's answers (2026-11-18, 10:45-10:49 Manila)

- **(a) Corals only in the pair, no coral grid on phones?** **No.** "On pourrait très bien avoir un odd one out avec que
  des corallites ou des zooms moyens. Je te rappelle que la combinaison des niveaux de zooms n'est pas obligatoire et
  influence la difficulté. Seul les données réelles de jeux (surtout pour les experts) pourront nous dire si certaines
  photos isolées (par exemple que wide ou que corallite) n'apportent pas suffisament d'info pour une identification
  correcte (même pour un expert)." Applied: sections 4 and 5 (coral grids of one view or mixed views; the size floor
  the only limit set in advance; the data then drops a view that carries too little).
- **(b) A box pass first?** **Yes, generalised**: frames `subject`, `feature` and `context` for every subject, proposed
  by agents only when sure, valid by default ("Je ne vais pas m'amuser à tout valider à la main. On valide par défaut et
  puis on corrige après si besoin"), fixed in the admin's photo page, his fix never overwritten (rule A1), reports
  pointing at the frame; the 425 fish boxes become `subject` frames; the order of section 6. Applied: sections 6 and 7.
- **(c) Hide the header and tab bar during a multi-photo question?** **No**: they stay (rules U3, U12). Applied: every
  recommended layout is measured with them.

The rest was the integrator's call, easy to correct: the short answered sheet, the long press, one tap answers (no Check
button), the 2 × 2 for Life stages.

## Sources

- StatCounter, screen resolution stats, mobile, Philippines (June 2026) and worldwide (Aug 2026):
  <https://gs.statcounter.com/screen-resolution-stats/mobile/philippines> [read, as gathered for this study].
- Touch targets: Apple Human Interface Guidelines (44 × 44 pt); Material Design (48 × 48 dp); WCAG 2.1 success criterion
  2.5.5 Target Size (44 × 44 CSS px), <https://www.w3.org/WAI/WCAG21/Understanding/target-size.html> [read].
- Duolingo "select the correct image" (2 × 2 image cards and a Check button), gallery apps' about 120 px 3-column grids
  with a tap to enlarge, Kahoot's images on the shared screen and coloured buttons on the phone [read, as gathered for
  this study].
- Playwright 1.63.0 device descriptors (`require('playwright').devices`) [measured].
- In the repo: `quiz.js` `question`, `fitStage`, `planFind`; `model.js` `photoSet`; `app.css` `.qfx`, `.fxt`;
  `judging/FISH.md` "The fish's box"; `judging/SEASLUG.md`; `tools/fish_game.py` `tile_tags`, `tile_crop`;
  `docs/FORMATS.md` §2; ROADMAP "Game modes"; rules A1, A2, C2, C4, L3, L11, L12, P3, P4, P5, U2, U3, U4, U6, U12, U14,
  S1, L13, D1, D3, D4.
