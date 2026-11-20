# Data files: the corals, the curation and the instance

What the coral data files hold, field by field, how Pierre's curation and the machine-written suggestions sit over them,
the photo rules that read every photo record (presence, share-alike, rights, licences) and the instance's own layer.
This is the specification of what the code does now; why each part was decided is in
[docs/decisions/](../decisions/README.md) and the PRs. [DATA.md](../DATA.md) is the short table of every data file (what
it holds, who writes it, who reads it, the short field names); this file gives the details behind its rows. The fish
are in [fish.md](fish.md) and [fish-photos.md](fish-photos.md), the content editor's edits in [content.md](content.md).

## `data.json`, the served source of truth

### Layout

Written only by `tools/datajson.py` `dump()` (rule W16): one top-level key per line, and one genus per line inside
`gen`, `course`, `cand`, `x` and `x.gen` (compact JSON within a line, key order kept, a trailing newline), so edits to
different genera merge cleanly. `python3 tools/datajson.py` rewrites the file in that layout and `--check` (the PR
check, run in CI) fails when it is not; the app only parses the file, so the layout does not matter to it. The IMR
instance's fields (`imrg`, and each genus's `n`, `ig`, `imr`, `mn`, `sl`, `rsl` and `qt`) and its lecture's look-alike pairs (in `look` and
`lsrc`) are a copy of its coral layer, laid on by `dump()` and by the rewrite; `--check` also fails when `data.json`
is not as its layers give it ("The instance's layer", below).

### A genus record (`gen{Genus}`)

The short names are glossed in [DATA.md › Formats that matter](../DATA.md#formats-that-matter); what they carry:

- `n`, `fam`, `ig`, `imr`, `qt`, `sum`, `mn`, `crit` as DATA.md glosses them (`imr` verbatim; `n`, `ig`, `imr` and `mn`
  are the instance's layer, and `qt` too except for the three genera whose tips come from the Coral Finder, below); `plain` the plain sentence (below; also on every `x.gen` record).
- `tr` the trait ids, and `trs` the trait ids found in some species only (paliform lobes in some Favites, for
  instance). Every tool reads them through `proto/lab.js` `trHas` (1, 0.5 for some species, 0), `trAll`, `trLabel` and
  `trFits`, never by genus name: a trait of some species is half a match in the Coral ID Key, never eliminated on in the
  Elimination board, an "In some species" row in the Feature gallery and a ring in the Feature matrix
  (`tools/apply_some_species.py`, `tests/traits.test.js`).
- `look` the look-alikes and `lsrc` the source of each pair (the IMR lecture's pairs are the instance's layer, the Coral
  Finder's the sources'; below); `pages` the Coral Finder pages; `sl` and `rsl` slide
  numbers (the instance's layer, below); `info` dated "Other sources" notes; `check` the points to check with a trainer; `levels` (2 or 3 views);
  `views{wide,medium,macro}` the photo lists, `more` extra photos, `cover`.
- `cm`: how common the genus is near Dauin, a small integer, the geometric mean of its iNaturalist observations and
  observers within 40 km, written by `tools/commonness.py` (also on the `x.gen` records of Millepora and the bonus
  genera) and read by the opening of genera ([LEARNING.md](../LEARNING.md) "Common first").

### The plain sentence

`plain`, on each genus of `gen` and `x.gen`, makes a sheet clear to everyone, complete beginners included and divers
who never had the IMR coral lecture; the IMR's scientific text stays for the research assistants. It is 1-2 sentences
of at most 30 words in everyday words (shape, texture, size, colour caveats, a comparison), shown as body text with no
label right under the photo, before the ID tips and lecture notes: first in the text column of the genus sheet
(`learn.js` `viewGenus`, `.idbox`; beside the photo on tablet and desktop) and under the name on the first-meeting card
(`quiz.js` `introShow`), by `app.js` `plainLine()` (`.plainw`).

Each line is a synthesis in the app's own words (no sentence copied) of how field guides and references describe the
genus underwater, checked against at least 2 of them (`tools/plain_sources.json`: the Corals of the World factsheets,
Reef Corals of the Indo-Malayan Seas, the ReefCloud hard coral genera guide, Wikipedia and a few others), the IMR
lecture notes and ID tips, and the genus's own photos. Where a source differs from the IMR notes the line follows the
IMR notes, except four IMR wordings Pierre corrected after the sources (`tools/apply_imr_corrections.py` for the
lecture notes, the mnemonic, `sum` and a former "to check" note; `tools/id_tips.txt` for the ID tips; the reasons in
the script and in `plain_sources.json` `_corrections`):

- Seriatopora: corallites "in neat rows", not "black", and the mnemonic is the name itself (Latin *seriatus*, in rows:
  "Seria-topora", pores in series).
- Lobactis: tentacular lobes "often green, blue or white", not "pale" (Corals of the World).
- Heliofungia: tentacle tips "white or pink".
- Herpolitha: "free-living like a mushroom coral, but many mouths along the furrow" (the IMR "solitary" and the Coral
  Finder's "colonial" both hold: one disc, many mouths; Hoeksema 1989 says monostomatous / polystomatous instead), as
  an "Other sources" note; the glossary's Solitary says the same.

Written by `tools/apply_plain_sheets.py`. `tests/plain.test.js`: every genus has one, within the limit; no 5-word run
taken from the Coral Finder features; 2 or more sources each; a slate genus's line names another genus only when its
card comes after that genus's (`starRefs`). `tests/pages.smoke.js` checks that a sheet and the first cards show it after
the photo, before the tips, with no label.

### Name roots

`root`, on the genera whose name is made of sourced Latin or Greek roots (most of the slate, Sandalolitha, Tubipora;
from the name study, [docs/reviews/2026-11-05-name-confusion-study.md](../reviews/2026-11-05-name-confusion-study.md)):

- `p` the parts that spell the name, each `[form, meaning, word, [source indexes]]` (an ending with no meaning has an
  empty meaning and no source);
- `fit` one of the genus's own ID tips (`qt`, verbatim) the meaning points to;
- `src` the dictionaries (`{t, u}`: E. C. Jaeger's *Source-Book of Biological Names and Terms*, 1944, on archive.org,
  by page; Merriam-Webster).

Shown on the genus sheet under the ID tips box, outside it (an addition, not an IMR line: rule C1), by `learn.js`
`rootLine()` (`.nameroot`): the parts, each meaning with its word, the fit, and, when 3 or more slate genera share its
last root (-pora, -astrea), that the ending alone does not tell them apart (counted from `slateOf`, never written in the
data). Written by `tools/apply_name_roots.py`, which also lists every other slate genus with the reason it has no line
(a root with two meanings in the dictionary, a split not clear, a person honoured, an IMR mnemonic playing on another
meaning). `tests/roots.test.js`: every meaning cites a dictionary link, the parts spell the name, a fit is one of its
tips; `tests/pages.smoke.js` checks the line on Goniastrea's sheet. The fish genera carry the same `root`
([fish.md › Name roots of the fish genera](fish.md#name-roots-of-the-fish-genera)).

### A photo record

The short fields (`f`, `ar`, `a`, `lic`, `o`, `t`, `own`, `loc`, `src`, `r: 1`, `gid: 1`, `skel: 1`) are glossed in
[DATA.md](../DATA.md#formats-that-matter). What they do: `ar` sets the quiz layout; `o`, the observation, is the
draw's colony identity (`p.o || p.f`) and the photo memory's key; `src` is the online original while the photo is not
downloaded (`r: 1`, remote); `gid: 1` marks candidates and the bonus genera's photos, kept out of games; a `skel: 1`
photo is never shown (rule P6: written by `tools/apply_skeletons.py` from `judging/skeletons.json`; `core.js`
`applyCuration` drops it from every list, as an excluded photo).

**IMR lecture photos** (`course`) carry `imr: true`, `slide` and `v`, their view. Once traced to their original source
(`tools/imr_sources.json`, written by
`tools/apply_imr_sources.py` on `course` and on the course records archived in `excluded.json`, so that a Restore brings
one back credited; `--check` runs in the tests), a lecture photo has `a` "<photographer> / Corals of the World" and
**`pg`**, the page that states that credit: the credit's link (`app.js` `credit`, `lectCredit`, `photoSrc`, the genus
sheet's strip; the admin's `lbCap`), never `o` (two lecture photos from one species page are two colonies) nor `src`
(the online original the app falls back to). It has no `lic` (the site states none per picture). Before the answer
`blindCredit` names the photographer and the site, with no link (rule P5: the page's address names the species). A
lecture photo not traced has neither, and the admin tags it "source unknown" (`unkTag`).

### Candidates: `cand` and `cand.json`

`data.json` `cand` holds only the candidates `curation.json` names (those Pierre added, moved or sent to another genus:
the app needs them to apply the curation). The candidates still waiting live in **`cand.json`** (same layout, top key
`cand`), so a large backlog never weighs on a player's download: only the admin loads it, and the app's `?draft`
preview. The tools read both with `datajson.load_all()` and write back with `dump_all()`, which splits them again by
what `curation.json` names; `python3 tools/datajson.py --split` only splits them again, and `--check` checks both
layouts (CI). `python3 tools/fetch_local.py --tidy` brings the lists in line with `curation.json` offline
([ARCHITECTURE.md](../ARCHITECTURE.md) "Photos"); a one-off backlog run raises the caps and searches the Philippines for
every genus: `python3 tools/fetch_local.py --dauin 30 --ph 20 --ph-all`.

### The other keys

- `key` the Coral Finder front-page key (growth form → boxes); `imrg` the 11 IMR lecture groups; `traits` the corallite
  clues with their sources; `tips` the lecture's observation questions; `course` the lecture photos; `cmp` the
  lecture's comparison images; `cand{Genus}` the candidates above.
- `terms`, the glossary, `[term, definition, source, plain]`: `plain`, optional, is a first sentence in plain words
  written for the app, shown before the sourced definition, which keeps its source. `tools/apply_plain_terms.py` writes
  them; its `MORE` list added the most frequent words of the genus sheets' scientific lines that had no entry
  (Free-living, Solitary, Separate walls, which also matches "plocoid", Shared walls, "cerioid", Phaceloid, Radial
  corallites, Tentacular lobes, Axial furrow, Spinules), each with the Corals of the World glossary definition, and
  Polyp.
- `spell`, the other spellings of a name (name → `[spelling, source]`, e.g. Diploastreidae → Diploastraeidae, WoRMS):
  both are shown, the IMR one first, by `app.js` `altName` wherever a family is shown; never a per-name branch in code.
- `x`: the extra Dauin genera for the Coral ID Key and the bonus genera, built by `tools/build_extra.py`;
  `tools/apply_bonus.py` checks Research Grade again and moves the bonus genera's photos of several corals to `more`.

## `curation.json`, Pierre's choices

Pierre's file: a pull request never writes it (rule A1). It is written only by the admin's Publish, which merges key by
key onto the latest published file ([ARCHITECTURE.md](../ARCHITECTURE.md) "Admin back-office").

- `genera{Genus}`: `cover`, `feat{view:[f]}`, `hide`, `move`, `add{f:view}`, `out` (not this genus), `ok` (validated),
  `lv` (2 or 3 levels).
- `mont{"A|B":{v,a,b,hide}}`: the Look-alikes overrides (`v` may be `all`).
- `quality{f:1-3}`, `gf` the growth forms, `exclude{f:reason}`, `flag`.
- `seen`, a set of handled flags many views read: dismissed suggestions, reviewed candidates `cand:f`, players' reports
  marked Done `rep:id` (the one the app reads to thank the player), photos out of the presence rule Pierre kept as
  exceptions `rule:f`, share-alike photos he kept `sa:f`, and To do's Kept.
- `use{f:'ref'|'game'}` (sheet only / games only): no admin button sets it, but the field still works when set.
- `single{f:1}`: a photo wrongly marked "several corals".
- `crop{f:[l,t,r,b]}` in fractions of the original photo, and `rot{f:90|180|270}`, his rotation in degrees clockwise,
  applied after the crop ([ARCHITECTURE.md](../ARCHITECTURE.md) "Photos").
- `tile{form letter:[f]}`: the lead photos of the growth-form tiles at the start of the Coral ID Key, at most 3 (📌 in
  admin › Growth form).
- `auto{day:{f:code}}`: the auto-sort's log (what it added, rejected or excluded, the Checks waiting for Pierre, the
  decisions he undid); the code's grammar is at the top of `autosort.js` (`aw2B`, `r`, `?aw3T`, `-r`, and
  `?aw3T@t5a1kq` for a Check answered at that time).
- `retest{f:{q:[first, again], fm:[first, again]}}`: Pierre's blind second ratings; his first rating stays in `quality`
  and `gf`.
- `fish{add, seen, exclude, out, tags, ease, phase, crop, rot, auto}`: the fish curation
  ([fish-photos.md › The fish curation](fish-photos.md#the-fish-curation); `out` is Pierre's Not this only).
- `points{id:{s, n, a{photo key: text}, t}}`: his state of the points to handle (`points.json`): `s` `wait` (stand-by),
  `done` (resolved) or `drop` (dismissed), absent for open; `n` his notes; `a` the trainer's answer per photo (keyed by
  the photo id, `p<i>` for an empty slot); `t` when he last set the status (ms). A key of its own rather than `seen`,
  because a point carries four states and text.
- `reps{id:'wait'|'drop'}`: the players' reports he set on Stand-by or dismissed (To do › Reports;
  [ARCHITECTURE.md](../ARCHITECTURE.md) "Players' reports"); Done stays `seen` `rep:<id>`.
- `content{nodes{node id:{slot:{v, was, src, t, by}}}, pairs{"a|b": entry}}`: the content editor's edits, in each
  subject's part (`fish.content`; `content` at the top for the corals; `SUBJECTS` `admin.cur`):
  [content.md](content.md).

The players' copy, `curation-play.json`, is this file without what the app never reads (`tools/curplay.py`).

**Precedence**: `curation.json` > the suggestion files > the `data.json` defaults.

## Suggestion files

Machine-written; Pierre confirms them in the admin.

- **`forms.json`**: `forms` (the 7 IMR growth form definitions, their single source), `cf` (Coral Finder box → IMR
  forms), `gf` the guesses, `gunsure`, and the legacy `form`. Written by `tools/judging_import.py` and
  `tools/game_forms.js` in one layout (one key per line, the big `{photo: value}` maps one entry per line;
  `tests/gameforms.test.js`). **Every game photo should have a growth form**, Pierre's (curation `gf`) or a guess:
  `tests/photos.test.js` lists the ones without as a warning, never a failure (a candidate Pierre approves without a
  form arrives with his Publish and must not turn unrelated PRs red). `node tools/game_forms.js` lists the game photos
  with none, and `--apply FILE` writes the guesses of a growth-form pass (in the `judging/BRIEF.md` format, each photo
  looked at) into `gf` and `gunsure`; such a pass is kept in `judging/game-forms.json`.
- **`quality.json`**: the automatic quality 3/2/1 from `tools/photo_quality.py`.
- **`picks.json`**: the suggested featured photos.
- **`dups.json`**: the near-duplicates from `tools/find_dups.py`.
- **`metrics.json`**: objective photo metrics from `tools/photo_metrics.py`, `m{f:[sharp, peak, px, cast]}` (sharpness
  as the variance of the Laplacian at 960 px, the sharpness of the sharpest part, the long side in px, the colour cast in
  %), for the live photos (`img/<f>-m.webp`) and the iNaturalist candidates (their 1024 px file, cached in
  `~/.cache/coral-id-imr/metrics/`, outside the repository). Admin only: tie-breakers and sanity flags of the
  auto-sort, evidence next to a disagreement, never a decision alone (on the 134 photos Pierre rated, the size
  separates Poor from the rest, AUC 0.90, while the sharpness at 960 px hardly does, 0.4-0.6). One photo per line;
  run again after a candidate pass (`--cand`) or a large photo change.
- **`suggest.json`**: the outside judging agent's results, one part per pass:
  - the coral candidate pass, `"cand"` (`tools/judging_cand.py`): per candidate photo its view, quality, growth form,
    `best`/`alt`/`dup` within its observation and view, or another genus, and `c`, a suggested crop `[l, t, r, b]`
    judged at full size and moved halfway toward Pierre's own crops by the import (`CROP_K`);
  - the coral genus pass (`tools/judging_import.py`);
  - the fish candidate pass, `"fish"` (`tools/judging_fish.py`;
    [fish-photos.md › The pre-sort](fish-photos.md#the-pre-sort));
  - the sea slugs', `"seaslug"` (`tools/judging_fish.py --subject seaslug`, rubric `judging/SEASLUG.md`), read by
    `tools/seaslug_game.py` and `tools/fetch_seaslugs.py` (its egg rule).

### The coral candidates' judgments in the admin

Admin only. `admin.js` applies the pass's view and its dashed quality and form guesses, orders the swiper with `jw`
(best ×1, alt ×0.3, dup ×0.04; Good ×1.3, Poor ×0.15; several corals ×0.3; another genus ×0.02; not judged ×1), shows
the judgment under the photo, and counts the candidates not judged yet (a reminder: the pass runs on demand).

The pre-sort sets aside (`aside`, the same rule as `tools/excluded.py` `set_aside`, so the candidate search does not
count them as waiting) a candidate judged `exclude` or `cmp`, `dup` (of another candidate or of a live photo of its
observation: `judging_cand.py sheets` puts those on the observation's sheet, marked "live"), several corals or Poor,
with no `unsure` (rules learnt from the photos Pierre rejected, `judging/BRIEF.md`); a count and Show keep them
reachable. The auto-sort ([ARCHITECTURE.md](../ARCHITECTURE.md) "Admin back-office", Candidates) rejects or excludes
those sure rejects in the draft (logged as auto, undoable); what stays set aside without a decision is a sure
comparison image, and every sure reject while the keep field is off. A Check, an undone auto decision, or a judgment
the metrics contradict is never set aside.

A suggested crop shows on the candidate (`sugCrop`, `crSrc`), opens in the crop editor, and is written to
`curation.json` `crop` when Pierre adds the photo (`ACT.addc`); Full photo over it keeps an explicit `[0, 0, 1, 1]`.
`tools/judging_cand.py detail <f>` builds the full-size sheet (the whole frame with a 10% grid, three 100% crops) the
pass judges quality and crop from.

## The calibration set (`calibration-set.json`)

- About 50 coral game photos the draw shows a little more often until each has 20 answers, so a later placement test
  asks photos whose difficulty is measured ([decision](../decisions/2026-11-18-coral-calibration-set.md), rule and check
  in [LEARNING.md](../LEARNING.md) "The calibration set"). `{v, built, about, rule, coral: {genus: [files]}}`, keyed by
  subject id (no key, no set). Written by `node tools/calibset.js` from `data.json`,
  `curation.json`, `quality.json` and `forms.json`; sticky, never rewritten by a workflow: a member that leaves play
  is not drawn until the tool is run again (`--check` says when).
- The quiz tier loads it (`app.js` `tier2json` → `model.js` `CALSET`, `setBonus`; `tests/calibset.test.js`).

## Presence of coral species (`presence.json`)

The presence rule (rule C8, `tools/presence.py`) applied to every coral species named on a photo (game, sheet and Key
photos, candidates): `python3 tools/coral_presence.py [--offline | --refresh]` writes `presence.json` =
`{v, date, sp: {species (iNaturalist's name, as on the photo's t): {ok, by, rg, chk}}}`, one species per line (the
replies cached in
`tools/.cache/presence.json`, git-ignored). Per genus (its iNaturalist taxon from `tools/taxonomy.json`): two batched
species counts (the Philippines, and 40 km around the instance's centre), and an observers query only for a species
that neither Corals of the World (`chk`, `tools/presence_checklists.json`: the species lists of the four COTW
ecoregions that cover the Philippines, confirmed and strongly predicted, COTW's pre-2014 names mapped to WoRMS) nor the
count near the centre settles. `tools/fetch_local.py` asks the same rule (`confirmed_species`) before its last tier,
abroad.

The admin loads it (`side('presence.json', 'sp')`), and `presence.js` `outOfRule(p, sp)` flags a photo taken abroad
(`loc` world) of a species the rule does not confirm: an "out of rule" tag next to its source on every admin page
(`srcTag`), and a part of To do (Reports) listing the game and sheet photos so flagged. Nothing is removed
automatically: Pierre keeps the rule strict and sorts them himself from that part of To do:

- **Remove** per photo: the × of every photo, `ACT.exclude` (excluded for good, from every genus, game and candidate
  list, and the imports skip it; no confirmation, Undo works, the genus's Excluded list in the Tree restores it).
- **Keep** per photo: an exception (curation `seen` `rule:f`, `admin.js` `ruleKept`). The photo stays on the site and
  moves down to a **Kept** subsection at the bottom of the part, folded with its count (`ruleKeptList`; `presence.js`
  `ruleQueue`'s `kept` leaves it out of the photos to handle), out of the part's count and of Remove all. There Remove
  still excludes it and Keep, pressed, un-keeps it (the mark removed, undoable); on other pages its tag reads "out of
  rule · kept" in a neutral style.
- **Remove all** above the part: asks first, then excludes each photo still to handle, each its own Undo step; the kept
  ones stay.

All go into his draft and Publish, never straight to `curation.json`. Run the tool again after a candidate refill brings
new species; a species it does not know is never flagged. `tools/apply_loc_fix.py` corrected the `loc` of photos once
labelled `ph` that were taken abroad.

## Share-alike coral photos

No share-alike licence for corals, as for the fish. The candidate search takes CC0, CC BY and CC BY-NC only
(`tools/fetch_local.py` `LIC`, imported by `tools/cand_gaps.py` and `tools/build_extra.py`), checked photo by photo
(`photo_ok`: one observation may mix licences); every refill drops the waiting share-alike candidates from `cand.json`
(`drop_share_alike`, never a candidate `curation.json` names, one Pierre added for instance; `--plan` shows them as
`drop`; `tools/apply_no_share_alike.py` did it once for the backlog).

The share-alike photos already on the site are never removed automatically. `presence.js` `licence(p)` (the recorded
`lic`, else the credit line, as `fetch_local.py` `licence()`; `tests/coralcand.test.js` checks both agree on every
photo) and `shareAlike(p)` give a **share-alike** tag next to the source on every admin page (`admin.js` `saTag`, in
`srcTag`), and To do (Reports) has a **Share-alike** part (`saQueue`: every photo a genus page lists, not removed, not
kept) with exactly the actions of the presence part above: Remove (the ×), Keep (curation `seen` `sa:f`, `saKept`;
down to the folded Kept subsection, tag "share-alike · kept"), un-keep, and Remove all (asks first, only the photos
still to handle). One function draws both parts, `decSec(key)` / `bindDecide(key)` with `DECIDE[key]` (the attributes
carry the key: `data-rule…`, `data-sa…`).

## Photo rights

### The tie-break

At equal quality, photos under CC0 or CC BY, and Pierre's own, come before CC BY-NC, so the stock a later commercial
version could use grows; the CC BY-NC photos stay fully usable.

- `core.js` `rightsClass(p)` gives `imr` (an IMR lecture photo whose source is not traced; one traced to its original,
  with `pg`, is `nc`: Corals of the World's terms, personal, non-commercial or academic use with citation, all other
  rights reserved), `book` (Coral Finder), `own` (Pierre's own, whatever its licence), `open` (CC0, CC BY) or `nc` (the
  rest, no licence read included), from `licOf(p)` (the recorded `lic`, else the credit line; the admin's `presence.js`
  `licence` is it).
- `rightsRank(p)` is 0 for own or open, 1 otherwise: own and open alike, so his photos are never boosted over another
  open one (rule P1).
- It is the **last key before the fixed order** (hash, file name, votes rank) wherever otherwise equal photos are
  ordered: `easyCover` (`easyRank` with the rights: the fish card photo of a family, genus or species, and the admin's
  `fishOrder` and `fishCoverOf` when Pierre has not picked), `applySlots` `byQr` (`easyRank` with the rights: the corals'
  featured, sheet and Coral ID Key photos at equal quality, whoever took them; the admin's `autoOrder` the same),
  `autosort.js` `fishRun` (which sure
  candidates fill a species' room) and `fishQueue` (the swiper's order within a species), `tools/fetch_local.py`
  `tie_key` (between coral observations of the same grade and as many iNaturalist votes), and `tools/fetch_fish.py`
  `select`, after the distance and the observer and life-stage variety (the licence class, `lic_class`, is in
  `tools/rights.py`).
- Nothing else moves: what enters play (`tools/fish_game.py` `in_play`, the judging rules) and the draw.
  **The lists the draw reads keep no licence** (the fish `views.wide`, `easyRank(L, d, false)`; the corals' `sl.game`, `byQ0`, its
  featured lead included), since `model.js` `photoSet` breaks ties between equal scores by the list's order when it
  gives the first observations their variety floor; its weights, difficulty and memory do not depend on the licence.

`tools/rights.py` is the Python copy; `tests/rights.test.js` checks that the app, the admin and Python read every photo
record alike.

### The rights facet in the admin

Read-only; nothing moves (ROADMAP "Rights tagged for a later split").

- Every photo tile carries its class as a small outlined badge (`admin.js` `rightsTag`: own, open, NC, IMR, book; the
  licence in its title), on the genus pages and every page that shows a coral photo's source (`srcTag`), and on the fish
  family, review and candidate tiles (`fuTile`, `fishSrcTag`).
- **Inbox › Coverage › Rights** (`renderRights`, on every subject's page whatever its `SUBJECTS` `admin` `pages` say:
  `admin.js` `EVERY`) counts them per genus or species for the corals (every photo a genus page lists now, not hidden,
  the IMR lecture photos included; a row per species named on the photos, then the genus's photos named to the genus
  only) and per family, genus or species for the fish (the photos in play, `fuData`), with **Ready** = commercial-ready
  (own + open), the least ready first or the list's order, and no column for a class no photo has. Coverage › Games
  carries the subject's total in one line (`rightsLine`).
- The counts are `presence.js` `rightsTally` (a photo once, by its `f`), `rightsBy` and `speciesOf`
  (`tests/rights.test.js`).

### The licence refresh

An author can change the licence of their photos on iNaturalist at any time, in either direction. `tools/licences.py`
(tests `tests/licences.test.js`) asks iNaturalist again about every observation an iNaturalist photo record names
(`v2/observations?id=`, 200 a request through `tools/inat.py`, rule C7: about 140 requests) and brings each record's
`lic` and `a` up to date, in place, with no field added:

- at the sources of the fish photos in play (`fish-cand.json`, `tools/fish_refs.json`, the sheet-only photos of
  `fish-photos.json`), so `tools/fish_game.py` `record` copies them at its next run;
- in `fish-game.json` and in `fish-photos.json`'s first photos (whose order depends on the licence);
- in `data.json`, `cand.json` and `excluded.json`;
- in the sea slugs' candidates, `seaslug-cand.json` (the fish's licence rule; a refused one leaves the file, reported).

The credit changes with the licence or the author's name, never for its wording alone; the rights class and the
tie-break follow, every reader deriving them from `lic`. A photo whose new licence the rules refuse leaves play,
reported (in the run's summary, a warning each):

- a fish photo leaves every fish list (`tools/fetch_fish.py` `lic_ok`: CC0, CC BY, CC BY-NC, or Pierre's own without a
  licence), a photo he added in the admin with it (`in_play` finds no record);
- a coral photo turned "no derivatives" or all rights reserved leaves `data.json`, `cand.json` or `excluded.json`
  (`tools/excluded.py` `restore_unexcluded` checks no licence: Pierre's Restore would bring it back);
- a coral photo turned share-alike follows rule P1: in play, it is kept for Pierre (admin To do › Share-alike);
  waiting, `tools/fetch_local.py` `drop_share_alike` drops it at the same run.

A photo that left comes back only through the candidate searches, once its licence allows it again. An observation or
photo iNaturalist no longer returns is reported and left as it is. The date each photo was checked is not stored
(ROADMAP "Rights tagged for a later split"). The Candidate photos workflow runs it weekly (Wednesday 03:47 Manila) and
on a manual dispatch, never at a Publish, with `--others`: Pierre's own photos are left out, neither asked nor changed.
Run by hand without `--others`, it reads his too.

## The instance

An instance is the organisation the content is built for; today IMR at Dauin.

### The instance's centre

`tools/instance.json` `centre` `{name, lat, lon, radiusKm}` (Dauin, 9.19, 123.26, 40 km) is the one place the instance's
centre is set: `tools/presence.py` builds its "near" query from it (`CENTRE`, `NEAR_AREA`, the same query string as
the reply caches hold), and `tools/build_fish.py` reads it there (its `DAUIN`) and writes it into `fish.json` `centre`
in every mode (`render`). The default covers read the presence near it under generic names (`nearU`, `nearN`, falling
back on `dauinU`, `dauin`: [fish.md › The default cover](fish.md#the-default-cover-of-a-node-with-leaves)).

**Not yet generic** (a full rename, its own PR):

- the presence fields `fish.json` writes (`dauin`, `dauinNI`, `dauinU`, and `present.near` / `near_dauin`, which
  already mean "near the centre"), which `core.js` `rankWeights` and `treeGen` (`cm`), `app.js` `treeGenera` (`cm`),
  `tools/fish_photos.py`, `tools/fetch_fish.py` and the tests read by name. The way out: write `nearU`, `nearN`,
  `nearNI` beside them in `tools/build_fish.py` `presence()` and `--near` (a rebuild from the reply cache), switch every
  reader to the generic names (`core.js` is a sheet-script file: rule D3), then drop the old ones;
- the tools that still hard-wire Dauin's area: `tools/build_extra.py`, `cand_gaps.py`, `commonness.py`,
  `fetch_local.py`, `fetch_fish.py`, `fish_commonness.py`, `fish_photos.py`, `fish_refs.py`, `tag_origin.py`; they
  would read `tools/instance.json` instead;
- the texts players read that name Dauin (`app.js`, `learn.js`, the credit's "Dauin" tag of Pierre's own photos), which
  would read `fish.json` `centre` `name`;
- the coral presence (`presence.json`, `tools/coral_presence.py`), which keeps its `loc: 'dauin'` tag until then.

### The instance's layer

The built files are the sources plus one instance's layer, resolved at build
([design note v2](../reviews/2026-11-14-sheet-overlay-design.md#v2-2026-11-15-per-instance-content-and-roles), section 1
and step 5); the content editor's edits are the third layer, in `curation.json` `content`, laid over at load
([content.md](content.md)), never at build. `tools/instance.json` names the instance (`id` `imr`, `name`), its `centre`
and its `layer` files, one per subject (the `SUBJECTS` key). Today the IMR instance's, in `tools/instances/imr/`:

- **`fish.json`**: `start` (the starter core), `look` (the declared look-alike groups of families) and `nodes` {teaching
  node or sub-entry id: `circle` (nodes only), `cues`, `look`, `phase`}. `tools/instance.py` `fish_source` lays them on
  `tools/fish_source.json` (the sources' part), and `tools/build_fish.py` reads the result in every mode. It stops when
  the base still carries one of those fields (an edit made in the old place, a merge) or when the layer names a node the
  base does not hold. The offline modes (`--regroup`, `--commonness`, `--near`) lay the layer again on `fish.json` as it
  is (`relay`: cues, look and phase taken off and put back where the build writes them, `start`, then the families), so
  an edit of those needs no WoRMS call; a changed circle stops them (the species' circles and their presence test follow
  it: the full build).
- **`coral.json`**: `imrg` (the 11 IMR lecture groups), `gen` {genus: `n` (its number on the IMR slate, 0 for a starred
  genus), `ig`, `imr`, `mn`, `sl` and `rsl` (its Lecture 6 slide numbers and review slide numbers, when it has them),
  `qt` (its short ID tips, condensed from the lecture notes: `tools/id_tips.txt`)} and `pairs`, the IMR
  lecture's look-alike pairs {`"A|B"` (sorted): {`src`, `look`}}: `src` the pair's `lsrc` line, the same on both genera
  (`IMR Lecture 6: …`, the lecture's words, 6 pairs; `Same IMR lecture group: …`, its groups, 7 pairs), `look` {genus:
  the other genus's place in that genus's `look`}, a genus whose `look` does not list the other left out (a pair can be
  one-way in `look`, its `lsrc` line on both sides). The 71 Coral Finder pairs stay in `data.json` alone, the one cited
  as `IMR Lecture 6 and Coral Finder p. 18` included (the book names it too). `data.json` is both the corals' source and
  their built file, so it keeps a copy where it always had them: `tools/instance.py` `coral_compose` puts each pair at
  its stored place in `look` and its lines in `lsrc` in `gen` order (the order the lines follow), so `look`, whose order
  the game reads (the traps, `core.js` `lectureGroup`'s ties), stays as it was. `tools/datajson.py` `dump()` lays the
  layer on and refuses data whose fields, or a lecture pair's line or direction, differ from it (an edit made in
  `data.json` would otherwise be lost); a pair's place is the layer's. `python3 tools/datajson.py` lays it on after an
  edit of the layer file. A pair taken out of the layer stays in `data.json` until it is taken out there too
  (`data.json` alone cannot tell it from a Coral Finder pair); `tests/instance.test.js` fails on a lecture line left in
  the sources. An edition without the layer (`coral_compose` of the sources with no layer) plays the Coral Finder's
  pairs alone, and has no slate number, no lecture slide and no lecture ID tips (only the Coral Finder's, below). A
  genus's fields sit in its record where `CORAL_AFTER` puts them (`n` after `tr`, `sl` after `lsrc`, `qt` and `rsl`
  after `sl`), so the record's key order, which the file's bytes follow, stays as it was. **`qt` is the layer's for the
  genera without a `tl` heading** (36): the three whose tips come from the Coral Finder (Merulina, Cyphastrea,
  Halomitra, `tl` set) keep theirs in `data.json`, and the layer giving `qt` to one of them stops the build. The
  scripts that edit those fields (`tools/apply_imr_corrections.py`, `tools/apply_review_slides.py`,
  `tools/apply_favites.py`, `tools/apply_id_tips.py`) write the layer file.
- **Checks** (`tests/instance.test.js`): `fish.json` and `data.json` byte for byte as the two layers give them:
  `build_fish.py --regroup --check` (the layer's fish fields taken off `fish.json` and laid again), and `data.json` with
  the layer's fields taken off and laid again; a changed layer fails both. The tools that read the circles (the agents'
  photo tools, `tools/fish_inforce.py`) and the players' copy (`tools/curplay.py`) read `fish.json` and
  `curation.json`, never the source, so they read the composed result.
- **Not in the layer yet** (easy to move later): the fish slide references (`sl`, laid by `build_fish.py`'s `relay`);
  the IMR tag (`src: imr`, `sign`, the teaching nodes' IMR names); the references of the lecture photos
  (`data.json` `course`, photos marked `imr`); the coral slate's structure beyond each genus's number (the starred
  genera's rule, Millepora, the bonus genera, `app.js` `slateGenera()`); and `deploy` (the key in force).
