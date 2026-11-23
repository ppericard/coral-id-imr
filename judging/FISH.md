# Fish photo judging: how easy is each game photo for a beginner

Pierre, 2026-11-04, after trying the fish beta: the first photos were too hard. Fish answers are not logged to the sheet
yet (`core.js` `SUBJECTS` fish `log: false`), so no player answer says how hard a fish photo is. Until they do, an agent
looks at every fish game photo and judges it on explicit criteria. The judgement gives each photo an **ease** from 1 to
5, which becomes its difficulty prior (`model.js` `photoDiff`): at the start the draw strongly favours the easy photos
through it (no wall since 2026-11-06). This file is the rubric, so the pass can be repeated by another agent or a person
and give the same kind of result.

Files: the judgements are `tools/fish_judge.json` (hand- or agent-made, like `tools/fish_source.json`);
`tools/fish_game.py` reads them for the reference photos it puts in play, `tools/judging_fish.py` writes the candidates'
into `data/suggest.json`, and `python3 tools/fish_judge.py` prints the summary of the photos in play (`fish-game.json`).
Until 2026-11-15 it also wrote them into the stopgap list of `fish-photos.json` (remote iNaturalist photos, retired).
`tests/fish.test.js` checks that every code is valid, that the caps below hold and that every circle-1 entry has 5 very
easy photos in play. The sea slugs' rubric, [SEASLUG.md](SEASLUG.md), adapts this one on the same tools (`--subject
seaslug`).

## How to look

1. `python3 tools/fish_judge.py --sheets <dir>` downloads every photo in play at iNaturalist's `medium` size (500 px)
   into `<dir>/img` and draws contact sheets of 12 (4 x 3, each photo in a 300 x 225 cell, its number and the
   observer's species name above it, a 5 x 5 grid over it for the crops) into `<dir>/sheets`. Keep `<dir>` outside the
   repository; delete it after. `--only t28,t29` limits the sheets to some entries, `--todo` to the photos not judged
   yet (a new photo after a rebuild, a new entry).
2. Open every sheet and judge every photo on it. Open a photo on its own (`<dir>/img/<f>.jpg`) whenever the sheet does
   not settle a tag. In doubt, look at it full size: the 1,600 px R2 file, or the original if smaller (Pierre,
   2026-11-19 20:57; [the tag-doubt pass](../docs/decisions/2026-11-19-fish-full-size-look.md)).
3. Judge what the photo shows, not the species: the same species can be easy on one photo and hopeless on another.
   The species name is a hint for the juvenile tag only (a juvenile is told by its colours against the adult's), when
   no life stage was recorded (**the observer's prevails**, below).
4. Never invent: when a tag cannot be read, take the value that makes the photo harder (between two levels, take the
   lower ease; the coral judging lesson: past mistakes were almost always one level too generous). Never to hold back a
   photo whose tags are all read ("5 very easy").

## Tags (one code per photo)

**Visual criteria only** (Pierre, 2026-11-04): the judge reads what it sees (how the fish is shown: view, whole, light, colour loss, clarity, size in the frame, whether the subject is obvious) and never the species. The species is the iNaturalist identification by human experts (Research Grade, or Pierre's own), taken as given: the judge does not say whether a photo shows the right species or whether its species is recognisable.

A code is seven characters, then the flags, then the ease digit: `p1g0sm14`, `p1g1sm1j2`. In order:

| Position | Tag | Values |
| --- | --- | --- |
| 1 | **view** | `p` profile (side view: the flank faces the camera, its pattern readable along it, even turned or seen a little from above, a school's fish too; cut or hidden, it is still `p`, with whole `0`); `o` oblique, only when the flank is foreshortened, its pattern not readable along it (turned well toward or away, or seen three-quarters from above, the back showing as much as the flank); `h` head-on; `t` tail or rear view; `d` from above (dorsal) |
| 2 | **whole** | `1` the whole fish is in the frame and visible; `0` partial: cut by the frame (a heavy crop, a head close-up) or hidden by reef, coral or another fish so its shape cannot be read whole |
| 3 | **light** | the light falling on the fish: `g` good: the fish well lit, its true colours visible, **whatever the background** (a fish lit by a flash or a lamp on a dark or black background is good light); `d` dim: the fish itself poorly or unevenly lit (in shade, under-exposed, dull, a lamp on part of it, burnt highlights), the background does not count; `n` night livery: the fish shows a night or resting colour pattern that differs from its day pattern (rare; below) |
| 4 | **colour loss** | how much of the fish's colours the water took (Pierre, 2026-11-04: not a "cast", whose blue or green only follows the water and the light), read on the colours shown, retouched or not: `0` none; `1` slight (reds and yellows still visible); `2` strong (the warm colours mostly gone, or false after editing); `3` monochrome (only blue or green: deep water, low light) |
| 5 | **clarity** | `s` sharp; `m` soft (a little blur, haze or noise, the fish's outline and pattern still crisp); `b` blurred or murky: the outline or pattern smeared (focus, motion, low resolution), even in clear water, or hidden by backscatter or milky water; between `m` and `b`, `b` |
| 6 | **size** | the subject's span (a pair or a school of its kind: the group's; never another animal's): `l` large (a third of the frame width or more); `m` medium (a sixth to a third); `s` small (under a sixth); between two, the smaller |
| 7 | **count** | `1` one fish (others, if any, tiny and far); `s` several of the same kind, the subject obvious (a pair, a school); `o` other species in view, no risk of taking one for the subject (below, "Other species: the split"); `k` other species in view, one of which could be taken for the subject (confusion possible); `x` the subject is not obvious (which fish?; divers or another animal fill the frame). `m` ("other kinds of fish too", before 2026-11-09) is read as not sorted yet, never typed again |
| flags | `j` | a **juvenile**: the colours or shape of a young fish (e.g. the yellow-and-black stripes of a young *Scolopsis*, the white-blotched brown of a young *Plectorhinchus chaetodonoides*, a young batfish's long fins) |
| | `c` | **camouflage**: the fish blends into its background, its outline hard to pick out at a glance |
| | `a` | **not a live fish seen in the water**: out of water (a fish on a net, in a hand, dead), a photo of a screen or a print, an aquarium, a capture from a video player (its interface is not a `w`) |
| | `w` | **watermark**: a visible watermark or text on the photo (a photographer's name, a logo, a copyright line); caps nothing and leaves the games as they are; Home skips it and the default covers avoid it (below, "Watermark") |
| | `p` | **phase**: added by the tool, never typed: every photo of a species whose sexes or colour phases look different by a cited source (`tools/fish_judge.py` `phase_flag`): its entry marked `dimorph` in `tools/fish_source.json` (the presentation's phase lines: Parrotfish, Anthias), or its `sex` or `ip_tp` verdict `yes` in the cited phase list `tools/fish_phases.json` (97 species, 2026-11-21; a sub-adult alone or a conflict adds no flag) |
| | `r` | **reference photo**: added by the tool, never typed: the photo carries `rep` (below, "Reference photos") |
| last | **ease** | 1 to 5, below |

**Light: the fish, not the background** (rubric 6, Pierre, 2026-11-08, Q308). The light tag reads how the fish itself is
lit. A fish lit by a flash or a lamp on a dark or black background shows its true colours: it is good light (`g`), and
such photos are among the best references (Pierre: "c'est probablement même les plus belles références qu'on ait").
Until then `n` read "night or flash on black" and capped them at 3. `d` is a fish in shade, under-exposed or dull, whatever
lies behind it. `n` is now only the **night livery**: the fish wears a night or resting colour pattern that differs from
its day pattern, so it does not look like the photos a beginner learns from. It is rare. Sourced example: goatfishes,
e.g. *Parupeneus barberinus*, which turns pink-mottled at night while its dark stripe fades (Marshall et al., "Colours
and colour vision in reef fishes: past, present and future research directions", *Journal of Fish Biology* 95, 2019,
doi:10.1111/jfb.13849: its day and night pairs). A fish photographed at night in its day colours is `g` (or `d` when
the fish itself is poorly lit).

**The gold set's corrections** (Pierre, 2026-11-19, 30 judged photos reviewed one by one; his words per photo are in
[the decision](../docs/decisions/2026-11-19-fish-rubric-gold-set.md)):

- **Light** is the light falling on the fish, not the photo's contrast; a fish lit on part of it, or with burnt
  highlights after the shadows were raised, is `d`. Low contrast is not blur nor murky water; where it goes is open
  (Q429).
- **Retouched colours** that look false (a fish turned orange-red) are lost colours, `1` near true, `2` plainly wrong;
  a clean correction reads as what it shows. A retouch is a shortfall in the tags, never a doubt that keeps the photo
  out, and is named only when the photo shows it.
- **Strong blur** (outline or pattern smeared) is `b` even in clear water, and caps the ease at 2; it alone keeps no
  photo out of play.
- **Size**: a pair or a school of the subject's kind is sized as the group; a fish beside another animal, alone.
- **Divers or another animal fill the frame** (a large jellyfish), the fish a small part of it: count `x`. A diver at
  the margin, the fish plain, is not (a crop may take it out).
- **Screens and video captures** (a screen's edge, moiré or reflections; a video player's interface): flag `a`.
- **Other fish dark and poorly seen** beside a subject the eye sees first: `o`.
- **Unchanged here**: contrast (Q429); crops: "A crop that saves a photo" (#1223); the juvenile ease: "Juveniles" below.

## The observer's life stage (2026-11-19)

The life stage the observer recorded, or FishBase gives (`data/fish-cand.json` `st`; "iNat: juvenile" on the sheets), is the
photo's: `j` when it says juvenile, no `j` when it says adult. The judge compares images, it does not settle biology
(Pierre, 11:43: "Il peut émettre un avis, mais son avis pèse beaucoup moins qu'un observateur humain, sauf s'il a des
preuves solides").

- A look is not solid evidence ("plain orange-red, no clear juvenile marks"; "colours close to the adult's"): the code
  follows the annotation, and a doubt about the stage alone is never `unsure`.
- Solid evidence is something the photo plainly shows that the annotation cannot fit: the code departs from it only
  with `unsure` naming `code` and the evidence in `note`, so the photo waits for Pierre.
- With no annotation, the judge reads the stage from the photo.

## Ease: how easy for a beginner who has just seen the family's card

Pierre's criteria (2026-11-04). Very easy first: good light, colourful, the fish clearly visible, in profile, the whole
fish in the frame, one fish (or the subject obvious), an easy species (that last one is the entry's order, not the
photo's: `fish.json` `start` and the opening rule). Avoid at the very start: juveniles (their draw ramp's, never
their ease, "Juveniles" below); species whose sexes or colour phases differ (Parrotfish); the fish in its night livery, partial fish, head-on or tail views, heavy crops, murky water, camouflage,
several species in the frame. Since 2026-11-23 a partial fish and a head-on, tail or top view cost one step, and in a
typical-look family partial and camouflage cost nothing (Q456, Q458: "Caps" below).

- **5 very easy**: profile, whole, good light (a flash on a dark background included), sharp, large or medium, one fish (or a school of it); colourful or with
  its family's shape and pattern plain to see. A field-guide photo. A photo that meets every one of these is 5:
  no better photo is held in reserve, whatever the species (Pierre, 2026-11-19).
- **4 easy**: as 5 with one mild shortfall: a slight oblique, dim light, a slight colour loss,
  a busy background, the fish medium-small, another kind of fish in the frame far from the subject, a head-on, tail or
  top view, part of the fish cut or hidden (these two since Q458, below).
- **3 medium**: two mild shortfalls, or one strong one: a marked oblique, the fish in its night livery, a strong colour
  loss, the fish small, camouflage the eye still sees through.
- **2 hard**: the shape or the colours are hard to read: several strong shortfalls, murky water, camouflage, a tiny
  fish, a school in the blue.
- **1 very hard**: the fish is hard to find or to see at all: tiny, hidden, very dark, blurred, or the subject unclear.

**Caps** (the tool applies them, so a typed ease can never break them): an unclear subject (`x`), a monochrome photo
(colour loss `3`) or a strongly blurred one (clarity `b`, 2026-11-19) is at most 2; camouflage (`c`), not a live fish
seen in the water (`a`), the night livery (`n`) or a strong colour loss (`2`) is at most 3; a head-on, tail or top view
(`h`, `t`, `d`) or a partial fish (`0`) is at most 4. So a photo at 5 is never one Pierre wants kept from the start.

**Partial fish and head-on, tail or top views: one step, not a ceiling** (Q458 step 1, Pierre, 2026-11-23 17:20, «ok»
to the integrator's recommendation). Until then both were at most 3. The fish answers showed no cost for either, in
misses or in time ([the REE-85 study](../docs/reviews/2026-11-23-fish-ease-vs-answers.md) "Criterion by criterion" and
its follow-up on response time). The blur cap, camouflage outside the typical-look families and the other caps stay;
monochrome stays as it is, open.

**The typical look** (Q456, Pierre, the same answer; his point of 16:23 on snake eels and garden eels: «c'est toujours
comme ça qu'on les voit»). In a family whose usual look is buried or camouflaged, a partial fish (`0`) and camouflage
(`c`) cap nothing: the photo is judged against the family's usual look, so a buried garden eel or a jawfish in its
burrow counts no shortfall for those two tags. The families come from a declared rule, never from a hand list: **at
least half of the family's photos in play tagged `0` or `c`** (`tools/fish_judge.py` `typical_look`, on the photos
`fish-game.json` lists, `typical_now`; the rule the study declared before reading any answer). On 2026-11-23 it gives
11 families: Garden eels, Ghost pipefishes, Jawfishes, Lizardfish, Morays & ribbon eels, Scorpionfishes, Seamoths,
Snake eels, Soles, Stargazers, Stonefishes & waspfishes. Rays are out (32%), as are Seahorses & pipefishes (48%) and
Frogfishes (46%). The tags never depend on the ease, so a re-cap leaves the families as they are; a family that crosses
the line as photos enter play changes its caps at the next `python3 tools/judging_fish.py rep` and `tools/fish_game.py`
run. `python3 tools/fish_judge.py` prints the families and their shares.

**What the re-cap moved.** A code keeps the ease the judge typed, and the caps only lower it, so the re-cap of
2026-11-23 (`python3 tools/judging_fish.py rep`, then `tools/fish_game.py`) raised only the photos typed above their old
cap: 9 photos in play, from 3 to 4. A photo typed 3 under the old scale (a partial fish or a head-on view was then one
strong shortfall) keeps its 3 until it is judged again: the tool never guesses the ease a judge would type.

**The phase flag caps nothing** (rubric 3, Pierre, 2026-11-04): a sex or colour phase is a species-level difficulty. An
Anthias is easy to call an Anthias whatever its sex, a parrotfish easy to call a parrotfish (its family-level difficulty
is telling it from a wrasse, a look-alike pair); it gets hard only when the species is asked. The flag stays on the
photos for the species questions and the explanation cards: a photo judged male, female or in a colour phase brings
the sex or colour phase card only on a flagged species, the card naming the list's sources (`fish.json` species `phs`;
[the decision](../docs/decisions/2026-11-21-fish-phase-flag-from-cited-list.md)).

**Juveniles** (`j`) are judged on the photo like any other and cap nothing, whatever their class (Pierre, 2026-11-19,
Q435: the judged ease is the starting point, the players' answers decide;
[the decision](../docs/decisions/2026-11-19-fish-juvenile-no-cap.md)). The juvenile classes (`fish.json` `juv`,
[FISH_PATH.md](../docs/FISH_PATH.md) "Juveniles and colour phases") set only when a juvenile comes in the draw. The
juvenile tag stays on every photo. The in-play juveniles typed 1-2 under the old "2 hard: a juvenile" line were
re-rated blind (the decision's "The re-rate"; `judging/fish-juvenile-rerate.json`).

## Reference photos

A photo that a reference source uses to represent the species (FishBase's main picture of the species, iNaturalist's
taxon cover) is a strong hint of a good photo, and enters the base first; once in, it is judged and placed on what it
shows, like any other photo (rule P1; [the decision](../docs/decisions/2026-11-19-fish-reference-from-photo.md)). The
data tags them (`rep`: `"fishbase"` or `"inaturalist"`, on `data/fish-cand.json` candidates and `fish-photos.json` sheet
photos; `tools/fetch_fishbase.py`, `tools/fetch_fish.py --rep`). The judge never types anything for it and judges the
photo on what it shows; the tool adds the flag `r`, which **never changes the ease** (`tools/fish_judge.py` `cap`): one
judgement per photo, whatever its route in. The flag weighs nothing in the order (`core.js` `refScore`) nor in the
reference level (below): it records the route, which only decides the download order (`tools/fish_game.py` `tier`).
`python3 tools/judging_fish.py rep` re-applies the flag to the judged candidates after a new tag. Where the source is
FishBase, the photo page (`o`) gives the author and the licence.

**The units' reference photos in play** (Pierre, 2026-11-06: the covers and first photos of the families, genera and
species must be reference photos, whoever took them; 14:02: "reference" means every photo of reference quality, and
FishBase enters automatically when its licence allows: "a maximum of good photos to complement the weaker ones on
iNaturalist"). `python3 tools/fish_refs.py` asks iNaturalist, for every game species, every genus the game has (every circle's, as `app.js` `treeGenera` has them; circle 1's alone until
2026-11-18; `--genera`: only the genera with no reference photo yet, the rest kept) and every
entry's family, for the photos it shows to represent the taxon (its cover, then the other photos of its taxon page: all
of them for a species, Pierre, 2026-11-08, Q229; the first for a genus or a family) that pass the game photo rules on
their observation (Research Grade, CC0 / CC BY / CC BY-NC, never ND, Q231, the Indo-West Pacific box, not captive or dead;
for a genus or a family, a photo of a game species of the entry; the observation is found whether or not it is among the
taxon's most faved, `obs_of`; a photo whose observation is outside the box is listed under `away`, never taken, while
Pierre's Q230 is open), and adds FishBase's photos of each species that pass its rules (its main picture first, up to 3):
`tools/fish_refs.json`, kept by species. Judge them like any photo: `python3 tools/fish_judge.py --sheets <dir> --refs
--todo`, codes under their entry in `tools/fish_judge.json` `photos` (one that is also a candidate is judged once, in the
candidate's file: "One judgement per photo" below); the iNaturalist ones and FishBase's main picture carry `rep`. **On R2, like a candidate** (Pierre, 2026-11-08, Q212: "we bring them in like
candidates"): every reference photo judged sure on the candidates' rubric (one kind of fish, count `1` or `s`; in the
water, no `a`) is in play by itself, whatever its level (`tools/fish_game.py` `ref_play`, `judged_sure`; the stopgap list of
`fish-photos.json`, which took only the reference-level ones, is retired since 2026-11-15). The same photo as one in play stays out, always; **a reference photo on an observation
already in play** (another photo of it is a game photo) is judged against that observation's photos like a candidate
(Pierre, 2026-11-08, Q218: "judge them with the others, see the duplicates, take them out"): `tools/fish_judge.json`
`keep` {photo: `best` | `alt` | `dup`}; `best` or `alt` enters, `dup` stays out, and it waits until judged.

**Reference level** (`core.js` `refLevel`, `tools/fish_game.py` `ref_level`, `autosort.js` `treePhotoRec`): a photo judged very
easy (4-5) whose tags read the reference look (`p1g0s` then size `l` or `m`, count `1` or `s`, no `j`, `c` or `a`), whoever
took it and whatever its route in (rule P1); one kind of fish only (count `1` or `s`: never other species in view, `o`
or `k`, nor an unclear subject, rule P3). A
reference-level photo comes before every other photo (`easyRank`: the card's cover and each list's first photos) and a
never-seen one weighs 3 times more in the draw (fish `SUBJECTS` `calib.ref`, `model.js` `photoSet`), never exclusively.

## One judgement per photo (2026-11-15)

Pierre, 2026-11-15: a photo has a single judgement. One photo can be met twice: as a reference photo (`tools/fish_refs.json`
`fi<id>` or `fb<stem>`, its code in `tools/fish_judge.json`) and as a candidate (`data/fish-cand.json`
`fish-<species>-cand-<id>`, judged in `judging/fish/<species>.json`). They are one photo (`tools/fish_game.py` `pid`), so:

- **The candidate's judging file is the single source** of such a photo: its code, its `keep` within the observation, its
  phase and its doubts. The build reads it for the reference route too (`tools/fish_judge.py` `one_judgement`, called by
  `tools/fish_game.py` `inputs`): best or alt enters like a candidate, dup stays out, and an unsure judgement leaves the
  reference copy unjudged until it is settled. A reference photo with no candidate copy keeps its own code here.
- **Judge it once**, in the candidate's file, then `python3 tools/judging_fish.py one` copies the code and `keep` onto the
  reference copy in `tools/fish_judge.json`; `python3 tools/judging_fish.py one --check` lists every divergence and exits
  1 on any (`tests/onejudgement.test.js` runs it on the repository, so a new divergence fails the checks). A photo judged in
  two species files that disagree is reported, never settled by the tool. `fish_judge.py --sheets --refs --todo` counts a
  photo judged as a candidate as judged.
- **The re-judge of 2026-11-15**: 2,058 photos were judged twice (715 of them still reference photos; the rest were
  stopgap photos, retired that day); 756 pairs had the same code, 1,302 did not, and 183 disagreed on what matters (the
  juvenile flag 85, the ease by two points or more 105, whether the photo may play 32, the legacy count `m` 2, a reference
  copy in play while its candidate judgement was unsure 2; a photo may count twice). Those 183 were judged again once,
  blind to both earlier codes, on sheets of 6 at 480 x 360 px and at 1,024 px for the close calls (the juveniles); then,
  where the observer's or FishBase's life stage (`data/fish-cand.json` `st`) said juvenile and the look said adult, the `j` flag
  was taken (36 photos: nothing on the photo against it, and the harder value is the rubric's when a tag cannot be
  settled; the build reads `st` as the phase of a photo whose code has no `j` anyway, `tools/fish_game.py` `phase`). The
  new code is the single judgement.
  The other 1,119 pairs, which differed by one ease point or on a tag that changes nothing above, took the candidate's
  code, which is the one already in play for the photos the candidate route puts in play. Of the 34 reference keeps, 7
  disagreed with their candidate's (alt against dup): looked at against their observation's photos, 4 are alt, 3 dup.
  Pierre's adds keep his tags and ease (`curation.json`, rule A1): where the new judgement changes the ease, the juvenile
  flag or whether the photo may play, it is proposed to him in the admin's Photo review › Light proposals, "One judgement
  per photo" (`judging/fish-one-judgement.json`, 38 photos; `admin-light.js` `LIGHT_SETS`).
- **The same ease on every route**: the reference flag `r` comes from the record's `rep`, which only the reference
  record carries for 423 of these photos (`data/fish-cand.json` tags only the taxon's cover; `tools/fish_refs.json` every
  photo of the taxon page); it adds nothing to the ease, so the same code gives the same ease whichever way the photo
  came in ("Reference photos" above).

## Watermark (2026-11-15)

Pierre, 2026-11-15 (Q373): some reference photos carry a visible watermark or text, such as a photographer's name. The
judged flag `w` marks them, in the typed flags' order (`j c a w`, then the tool's `p r`: `p1g0sl1jw4`). It changes nothing
in the games: no cap, no ease, no reference level, no order, no tile, no sure decision (`tests/watermark.test.js`), so a
watermark is never a reason to leave play. **Home skips it** (`home.js` `homeOk`): the Learn band's pool, a tile's own pick and
the Identify door's art, his ★ Cover included; a family whose photos all carry it is not drawn there. Pierre takes the flag
off (or sets it) in the admin like any tag (Tags › Watermark). His tags win as on every route, a reference photo's included
since then (`tools/fish_game.py` `record`). The pass's `w` also reaches tags the auto-sort copied into his curation (its log code
still lists `t`), never tags he set himself (`autosort.js` `treeMarked`, `tools/fish_game.py` `marked`).

**Covers** (Pierre, 2026-11-15, Q379, on 4 of his ★ covers tagged watermarked: "Perhaps we should also avoid them for
covers"): the default cover never takes a watermarked photo, at any level, while the node has an adult photo without one
(`app.js` `wmP`, `seenCover`, `coverFirst`; the admin's `autosort.js` `treeWm`, `treeCoverRule`, `treeLeafCover`). His ★
cover on one stays his choice (rule A1): the Tree page asks "Watermark: keep as cover?", Keep records `coverW` beside the
cover (`curation.json` `fish` `genera` `{node id: {cover, coverW}}`, as the juvenile cover's `coverJ`), Choose another
opens its Cover proposal (a photo without one). Home skips it all the same, kept or not. docs/ARCHITECTURE.md "Pierre's
choices per family in the app" has the details.

- **The pass of 2026-11-15** judged each photo on its R2 file (Pierre's crop applied), on contact sheets of 6 at 560 px,
  with the top and bottom bands enlarged for faint text. 844 photos were looked at and 224 were tagged: iNaturalist
  photographers' names and logos, and 1 FishBase photo. It covered three groups:
  - the photos Home can show: each family's cover and the reference photos its band rotates through, up to 10 per
    family in the game's order. Once the first ones were tagged, the next photos in each pool were looked at too, until
    every photo the pools can draw had been judged. That holds with the judged order and on a first launch (the first
    photos of `fish-photos.json`);
  - every reference-level landscape photo (the band's kind) by an author already tagged once: 342 photos, 134 of them
    tagged.
  
  Not covered then: the players' ratings re-sort a family's photos (`app.js` `rankPhotos`), so the band could later
  reach reference photos by other authors that nobody had looked at (1,888 photos are of the band's kind).
- **The second pass, the same day** (ROADMAP "Watermark pass, the rest") took the rest of the band's kind: every
  band-kind photo (`home.js` `landR2` and `core.js` `refLevel`, from `fish-game.json`) beyond each family's first 10 in
  the game's order (`core.js` `easyRank`) and not by an author the first pass had tagged. That is 1,153 photos. The
  first pass's band-kind tags sit near the top of that order (81 of 83 within the first 16; the other 2 are a ★ cover
  and one photo 43 deep), which confirms its first 10 per family had been looked at.
  - Each R2 file (`-m`, Pierre's crop applied) was seen on contact sheets of 12 at 380 px with local contrast raised:
    32 tagged.
  - Every other photo by a tagged author (60) was seen again at 510 px: 2 faint signatures the sheets had missed
    (Karen Willshaw, David Rolla).
  - So the top 12% and bottom 25% of each of the other 1,119 photos were seen at 700 px, local contrast raised, sorted
    by author; a control sheet of known faint marks showed them all; no new tag. The side edges and the middle of
    the frame were seen at 380 px only (2 of the tags sat there: a vertical credit on the left edge, a name mid-right).
  - As the first pass did for its authors, the band-kind photos in each family's first 10 by the 20 authors this pass
    tagged (21, all looked at in the first pass) were seen again whole at 510 px and in bands at 700 px, beside the
    controls: 1 more tag (Rafi Amar), on a photo Home can draw today.

  **35 tagged** in all: photographers' names, signatures and logos, one caption, 1 FishBase photo. None is one of
  Pierre's ★ covers, and none has tags he set himself.
- **Every band-kind photo has now been looked at.**
- **The third pass, the same day** (ROADMAP "Watermark pass, the rest") took the rest of what Home can show.
  - The set was computed with the app's own code. `treeBuild` and `home.js` `tilePhoto` and `landPool` were run in a vm,
    with `fish-game.json` in and on a first launch (`fish-photos.json` alone). The ratings re-sort only within each of
    `easyRank`'s two groups (reference-level photos first, then the others). So for each photo, an order favouring it
    was built (it first in its group, the photos that would beat it last), and `tilePhoto` was run on that order.
  - What Home can show is every photo `tilePhoto` returns that way, plus every band-kind photo (`landPool`). From that
    were taken out the photos the first two passes looked at (by `core.js` `treePid`): the tagged ones, every band-kind
    photo of `fish-game.json` at #961's merge, and #956's Home draws (cover, card photo, `tilePhoto`, `landPool`)
    rebuilt at its merge in both orders.
  - New photos since #961: none. No photo entered `fish-game.json` since then, and `fish_game.py --plan` has none
    waiting. The refills only added 2 candidates, not yet judged.
  - The fallback photos: **897**.
    - 682 are in the 9 families with no band-kind photo (Moorish Idol, Sea Moths, Scorpionfishes, Stonefishes,
      Flying Gurnards, Stargazers, Garden Eels, Soles, Cornetfishes). Their tile and art take `tilePhoto` every day:
      any landscape photo on R2, else any adult photo once a re-sort pushes those out of the first 10.
    - 215 are reference-level photos of 14 large families that are not landscape or not the whole fish. The Identify
      art takes one of these only if a re-sort puts 10 such photos ahead of every band-kind one (`adultFirst`).
  - Method, as #961's:
    - each R2 file (`-m`, Pierre's crop applied) on contact sheets of 12 at 380 px, local contrast raised;
    - the top 12% and bottom 25% of each photo at 700 px (at most 80 and 160 px deep). #961's faint controls were
      seen in the same bands once, at the start;
    - the 108 untagged photos of the 897 by authors tagged in any pass, seen again: 9 whole at 510 px, the other 99
      as their bottom 14% (left and right thirds) at 2x.
    - The side edges and the middle of the frame were seen at 380 px only.
  - **146 tagged** among the 897: photographers' names, signatures and logos, date stamps and a dive caption. Among
    them are 23 David Rolla photos (most of them faint, bottom left) and 1 photo with faint text that could not be
    read. The 380 px sheets missed 6 faint marks: the bands found 5 and the recheck 1.
  - As #961 did for its authors, the 98 photos Home can show by the authors this pass tagged, looked at by an earlier
    pass, were seen again: their full-width top 10% and bottom 16% at 2x, local contrast raised, and the corners at 3x
    for the David Rolla account. **12 more tagged**:
    - 11 by that account: faint "(c) David Rolla" signatures at bottom right, 4 of them too faint to read (tagged).
      One of them had been the Sweepers' tile and Identify art in today's order;
    - 1 plain "(c) Dan Schofield", which is Pierre's ★ cover of Scorpionfishes (the admin asks him "Watermark: keep as
      cover?").
  - **158 tagged** in all.
  - Tagging changed the first photos of 16 units in `fish-photos.json`: 24 tagged photos were swapped for others
    (#972 puts a watermarked photo after its unit's adults without one). It also changed the default card photo of 3
    families: Moorish Idol, Sweepers and Sea Moths (Q379). The set was then computed again: nothing new to look at.
    No family is left without a clean photo, and each family's tile and art in today's order is a clean photo.
- **Still to look at the same way:** only the photos a later refill, reference run or judging change brings into the
  pools, or new code that lets Home show other photos.
- **A refill pass** (the fourth, 2026-11-19, and any later one) takes every photo in `fish-game.json` and
  `fish-photos.json` that the previous pass's file did not hold (compare with git), plus any whose tags, shape or place
  changed: a superset of what Home can show, since the pools' reach does not depend on the order. A photo a later pass
  already looked at whole at full size (the tag-doubt pass, `judging/fish-tag-doubts.json`) is left out, and so is an
  ease-only change that does not make the photo reference-level (`core.js` `refLevel`). Look as the second pass
  did (contact sheets, then the bands at 700 px, then the corners at 2x for authors already tagged), list the tagged
  photos in `judging/fish-watermark.json`, and run `judging_fish.py watermark`, `codes`, `one`, then `fish_game.py`
  (nothing to download: the flag is its only change). The two exclusions hold only while every unit keeps a clean
  band-kind photo and a clean reference-level adult: after tagging, count them per unit against the previous pass's
  files, and look at the fallback photos of any unit that lost its last one (as the third pass did).
- `judging/fish-watermark.json` lists each tagged photo with what the judge saw. `python3 tools/judging_fish.py watermark`
  writes the flag into each photo's single judgement: its candidate file, else `tools/fish_judge.json`. Then run
  `python3 tools/judging_fish.py codes` and `one`. `--check` lists the photos whose code lacks the flag, and the test runs it.
- When a later pass adds photos to the Home pools (new reference photos, other ratings), look at them the same way and add
  them to the list. A photo seen at full size whose text cannot be settled is tagged: a wrong tag costs one Home photo and
  one tap, while a missed watermark stays on Home.

## A proposed crop

When the fish is small in the frame, or the margins distract (another fish, a diver, empty water), the pass proposes a
crop: `[left, top, right, bottom]` as fractions of the photo (`curation.json` `crop`'s format; a candidate's `crop`, a
reference photo's `tools/fish_judge.json` `crops`), read on the 5 x 5 grid, keeping the whole fish with a margin (its
`bb` inside). A sure judgement enters play cropped (the auto-sort writes the crop into Pierre's draft; he undoes or
redraws it), so **a code with a crop reads the photo as cropped** (`big` for clarity).

**A crop that saves a photo** (Pierre, 2026-11-19, Q430: "J'ai toujours dit de mettre en jeu les suggestions"): when a
crop takes every fish one could take for the subject wholly out of the frame, the subject whole and at least medium in
it, propose it and code the cropped photo (`1`, `s` or `o`, not `k`); at the least doubt, add `unsure: ["crop"]`.

## The fish's box (rubric 7, 2026-11-09)

Pierre, 2026-11-09 (Q321 D4): "Find the X" and Matrix show a fish photo as a small square tile, so it must show almost
only the fish, tight around it. The size tag cannot tell that (`l` covers a fish from a third of the frame to all of it),
so the pass gives each such photo the **fish's box**, and `tools/fish_game.py` cuts the tile from it.

- **Which photos**: every photo whose tags pass the tile rule (`tools/fish_game.py` `tile_tags`): profile or slight
  oblique (`p`, `o`), whole (`1`), good light (`g`), colour loss `0` or `1`, sharp (`s`), large or medium (`l`, `m`), one
  fish (`1`), no `j`, `c` or `a` flag. Any other photo gets no box.
- **The box**: `[left, top, right, bottom]` as fractions of the original photo (the crop's format), the tightest box
  around the whole subject fish, its fins and fin filaments included (an idol's streamer, a lyretail's threads). Read on
  a 10 x 10 grid to half a tenth (0.05), rounded outward, never cutting the fish. When the photo does not settle it (the
  fish runs out of the frame after all, the subject is unclear, a thread may or may not be the fish's), leave the box out:
  a photo without a box simply has no tile.
- **Where it goes**: a candidate's box is its judging file's `bb` (imported into `data/suggest.json` `"fish"` `bb`; `unsure`
  may name `bb`, which withholds its tile only: a candidate with no other doubt still enters play); a photo already judged (a game, reference or stopgap photo, or a candidate judged
  before rubric 7) gets it from a **box pass**: `python3 tools/fish_judge.py --boxes <dir> [--only t01,t02] [--n 3]` draws
  the photos in play that pass the tile rule and have no box yet (the easiest first, one per observation), 9 to a sheet at
  420 x 315 px with a labelled 10 x 10 grid; the boxes go into `tools/fish_judge.json` `boxes` {photo: box}, and the pass
  into `passes`. The candidate sheets (`tools/judging_fish.py sheets`) carry tick marks every tenth on the photo's edges for
  the same reading.
- **No machine method**: there is no fish detector in the repository, and a saliency or edge heuristic is unreliable on
  reef backgrounds (the Matrix study of 2026-11-09), so the judge's eye is the source, as for every other tag. The
  judging passes box the photos already judged as they go: the first two box passes (2026-11-09) boxed 172 photos, about
  7 per circle-1 entry (168 tiles kept, 4 too small in the original), so 21 of the 27 circle-1 families have 6
  observations with a tile; the rest wait for the next rounds, entry by entry, the starter core first.
- **The bulk box pass** (2026-11-22, REE-202; [decision record](../docs/decisions/2026-11-22-fish-box-model.md)): measured
  first (Q441), **Sonnet 5.5 at medium effort** boxes the photos waiting, one picture per photo (iNaturalist's large size
  shown at 1000 px, a 10 x 10 grid labelled on the edges, ticks at the half tenths; a framed photo's frame outlined and
  the outside dimmed), the box read to 0.01 and rounded outward, a seeded 5% of each batch redone blind by Opus 5.5 high.
  Order: the species of the mimicry pairs whose class can have a tile (M2, M3, M5), all their photos waiting; then the
  species with no tile, in `fish.json` order, at most 4 photos each. The boxes go into `tools/fish_judge.json` `boxes`.

**The tile** (`tools/fish_game.py` `tile_crop`, `tile_write`; Q321 D4): the box's longer side plus 10% of it on each
side (less, down to none, where the photo's short side is shorter), squared, centred on the fish, kept inside Pierre's
crop; written as `{f}-x.webp`, a 360 px square, next to the photo's four files on R2. A fish longer than the photo's short
side (a field-guide profile across a wide photo) keeps its square: the band past the photo's edge is filled with the
photo's blurred, darkened copy, as the app frames every quiz photo. It is kept only when the fish fills at least 70% of
the tile (its longer side) and the box is at least 320 px wide in the original; the photo's record in `fish-game.json`
carries `bb` and either `xc` (the tile's square) or `xn` (why not: `res` too small in the original, `cut` cut by Pierre's
crop, `fill`). Pierre checks the first tiles on one contact sheet (Q321 D4); after that, nothing item by item (rule W10).

## What the app does with it (docs/LEARNING.md "Fish photos judged")

- **Prior difficulty** (`model.js` `photoDiff`): a photo's own difficulty starts at (3 − ease) x the subject's `calib.ease`
  (0.3 logit an ease point for the fish, the weight their players' answers support:
  [docs/decisions/2026-11-23-fish-ease-weight.md](../docs/decisions/2026-11-23-fish-ease-weight.md); the default 0.5 for
  the sea slugs), so a fish photo at ease 5 starts at −0.6, ease 1 at +0.6, on top of its unit's offset; it fades as
  real answers come (`PDIFF.W`, as every prior). A photo nobody judged starts at 0.
- **The first questions on an entry**: no wall (Pierre, 2026-11-06 14:17). Every photo can be drawn from the first
  question; the prior above, the draw's aim at the player's level and the start's lean (fish `SUBJECTS` `calib.early`:
  the aim 1.5 logits lower on an entry with no answer, fading with its answers) make the easy ones far likelier at the
  start, a harder one comes rarely (until then, `model.js` `easyFirst` showed only the ease 4-5 photos before Open Water).
- **The order photos are met in** (`core.js` `easyRank`, Pierre, 2026-11-06): the card's photo, the first photo of each
  list and the auto-sort's order are the easiest first, then the most reference-like by these tags (`refScore`:
  profile, whole, good light, no colour loss, sharp, large, one fish; the flag `r` weighs nothing),
  never by who took the photo nor by its route in.
- **The order the entries open**: the starter core first (`fish.json` `start`), then the existing rule, easiest and
  most common first (`openPick`): an entry's difficulty is the mean of its photos' difficulty, so the judged ease
  orders it too.

## Candidates (`data/fish-cand.json`): the same code, plus three fields

One fish judging vocabulary (Pierre, 2026-11-04): the candidate photos waiting in `data/fish-cand.json` (`tools/fetch_fish.py`)
are judged with the code above, its caps and its crop rule, **visual criteria only**, so a photo keeps its tags when it
moves from the candidates to the game. The species is the iNaturalist identification by human experts (Research Grade,
or Pierre's own), taken as given: no field says whether a photo shows the right species.

1. `python3 tools/judging_fish.py sheets <id>` (a species `s091` or a whole entry `t01`) downloads the candidates still
   waiting (500 px, `judging/fish/img/`, not in git) and draws contact sheets observation by observation
   (`judging/fish/sheets/<species>/`, 12 tiles at most), an observation never split over two sheets (one of more than
   12 photos fills sheets of its own): every photo of an observation is a candidate (Pierre, 2026-11-08; its first photo counts 1 against the species' cap, each
   further one half, Q226; a sure `dup` frees its room), so its
   near-duplicates are side by side for `keep` below; it prints tile number → photo, observation, source, licence and
   the observer's iNaturalist annotation (`iNat: juvenile`...: the photo's life stage, above).
   `python3 tools/judging_fish.py big <f>` gives the 1024 px photo, for a tag the tile does not settle and for a crop.
2. Write `judging/fish/<species id>.json`: `{"photos": {"<f>": {...}}}`, every candidate waiting listed (a candidate Pierre
   has decided on since its judgement stays in the file as judged: not checked again, imported unchanged, its `best`
   still the best of its observation, so a new candidate there is an `alt` or a `dup`):
   - `code`: the code of "Tags" above, ease included (`p1g0sm14`). The tool adds the phase flag `p` and applies the caps.
   - `keep`: `best` (exactly one per observation: its most useful photo), `alt` (the same fish, adding something:
     another side, another phase or pose, other light), `dup` (adds nothing over the best: a burst, the same framing).
     An observation of which Pierre already added a photo (its other photos come at a later run) shows that photo
     first on its sheet, marked as context and not to judge: its new photos are judged against it, at most one of
     them `best` (when it beats his), none needed.
   - `phase` (optional): the sex or colour phase a solid, cited source documents for the species (the IMR fish
     presentation, `fish.json` `teach[].phase`, is one such source among others; Pierre, 2026-11-20 19:29) when the
     photo shows which: `subadult`, `intermediate`, `terminal`, `female` or `male`. A juvenile is the code's `j` flag;
     an adult needs no tag. The cited phase list `tools/fish_phases.json` says which (its quotes); a phase the quote
     does not let the photo show is left untagged, never marked `unsure` (the re-judge of 2026-11-21:
     [the decision](../docs/decisions/2026-11-21-fish-phase-flag-from-cited-list.md)).
   - `crop` (optional): as "A proposed crop" above.
   - `bb` (for a photo whose code passes the tile rule): the fish's box, as "The fish's box" above.
   - `unsure` (the fields you doubt: `code`, `keep`, `phase`, `crop`, `bb`) and `note` (140 characters at most; required with
     `unsure`).
3. `python3 tools/judging_fish.py --check <id>` until it passes, then `python3 tools/judging_fish.py` imports every
   passing species into `data/suggest.json` `"fish"`: `{jt, e, k, ph, c, bb, u, n}`, `jt` and `e` after the caps as in
   `fish-photos.json`. Commit only `judging/fish/*.json` and `data/suggest.json`.

**What a sure judgement does** (no `unsure`; `autosort.js` `treeSure`): `best` or `alt` → **in play at once**, with its
tags, ease, phase and crop, whatever its ease (hard photos stand in for SVS video frames; the judged ease is the photo's
prior difficulty, the players' answers refine it), and other species with no risk of confusion (count `o`) as one
fish; `dup`, an unclear subject (count `x`), other species one could take for the subject (count `k`: rule P3, as for the
reference photos) or not a live fish seen in the water (flag `a`: out of the water, a screen or print, an aquarium, a video capture) → stays out; the legacy `m` (not sorted) stays out and waits. Pierre, 2026-11-06 15:16 and
16:20 (Q180, Q199): a judged candidate enters the game by itself, treated exactly like a photo he adds in the admin and
hosted on R2 like it (`tools/fish_game.py` `in_play`, the Candidate photos workflow), each judged batch as soon as it
is ready, without waiting for his swipe; his curation only removes or corrects (a photo he rejects, excludes or moves
with Not this leaves the game at once, `core.js` `treePhotoIn`). The admin's auto-sort still puts the same sure judgements
into his draft (admin plan PR 4), and about 1 candidate in 20 goes to him as a Check, his answers measuring the
agreement. So add `unsure` at the least doubt: an unsure candidate stays out of the game until a fresh look settles it,
while a wrong sure decision costs the players. A doubt the rubric settles is not one: a recorded life stage, a retouch.

## Other species: the split (2026-11-09)

Pierre, 2026-11-09 (Q323): of the photos with other kinds of fish he had accepted, some show them with no risk of
confusing them with the main fish, others where the confusion is real. The one code `m` became two, and both automatic
routes follow the same rule (`autosort.js` `treeSure`, `tools/fish_game.py` `judged_sure`, through `core.js`
`TREE_COUNT`; `tests/otherspecies.test.js`):

- `o` **no confusion risk** (in play): the other fish could not be taken for the main one at the level the game asks
  (its family, or its genus for a circle-1 species, whose genus is a unit too): it is clearly not the subject (much
  smaller, far, blurred, cut by the frame, half hidden, dark and poorly seen beside a subject the eye sees first), or it belongs to the same family and, for a circle-1 species, the
  same genus (the same answer).
- `k` **confusion possible** (never in play, rule P3): another fish of a different family (or genus, at the genus level)
  is about as large, sharp and central as the main one, so a player could name it instead: two species side by side, a
  cleaner wrasse on a large client, a remora on its host, a mixed school.
- When in doubt, `k` with `unsure` and a note: the photo stays out until Pierre decides (the cost of a wrong `o` falls on
  the players). `m`, the code before the split, reads as not sorted yet, so as `k` (out, never decided by the auto-sort);
  a new judgement never types it (`tools/judging_fish.py --check`).

The pass of 2026-11-09 sorted every photo that carried `m` and was in play or waiting, on contact sheets of 12 (the
main species and its family named on each tile): Pierre's adds (the auto-sort's: 166), the candidates still waiting
(760), the stopgap game photos (87) and the reference photos (34), 1,047 in all (and one stale code). Pierre's adds keep
his tags in `curation.json` (rule A1): their sorted count is the pass's, in `judging/fish/<species>.json`, which
`python3 tools/judging_fish.py codes` copies into `data/suggest.json` (codes, `unsure` and notes of the photos already judged,
without a whole species' `--check`), and `tools/fish_game.py` reads it over his legacy `m` (`count_of`); the stopgap and
reference codes are `tools/fish_judge.json`'s. Result: no risk 615 (Pierre's adds 100, candidates 422, stopgap 63,
reference 30), confusion possible 405 (52, 331, 20, 2), doubtful 27 (14, 7, 4, 2), kept out as `k` and listed for Pierre
in admin Points ("Other species in view: confusion possible or not?"). His adds held out show on their family page
under "Other species, out of play", where Keep in play sets `o` in one tap.

## Agreement with other sources

- iNaturalist's Life Stage annotations could check the juvenile flag, but on the 648 circle-1 photos no observer gave
  one (21 of the 1,145 fish photos have any, all in circles 2 and 3).
- Colour loss: a machine estimate (the share of the photo's saturated pixels whose hue is warm, red to yellow) was shown
  beside each photo as a hint and corrected by eye; they agreed exactly on 58% of the photos and within one level on 98%.
  The tag is the eye's.

## Entries out of circle 1

Many of these families
are rarely shown as a very easy photo, the rubric applied as written (no family exception): morays, snake eels, garden
eels and jawfishes live mostly in a hole (partial), frogfishes, scorpionfishes, stonefishes and seamoths are
camouflaged, rays and seamoths mostly seen from above, sharks in blue water.

## The light re-judge (rubric 6, 2026-11-08)

After Pierre's Q308 (above, "Light: the fish, not the background"), every `n` photo and every `d` photo on a dark
background were looked at again (1,062 codes changed). The log, with each photo's old and new code, is
`judging/fish-light-q308.json`; its `curation` list holds Pierre's adds whose
tags and ease `curation.json` still holds from the earlier judgement (`tools/fish_game.py` reads them first): a
proposal for him, never written by a script (rule A1).

## A temporary use

The judged ease is a bootstrap prior: once fish answers are logged, the players' answers rate the photos and replace it
(`PDIFF.W`; Pierre, 2026-11-04; ROADMAP). The very-easy-first gate (`model.js` `easyFirst`) went on 2026-11-06 (Pierre:
"NO WALL").
