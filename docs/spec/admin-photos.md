# The admin's photo pages

How the admin's photo pages work: the coral genus pages, the Candidates swiper and the auto-sort that decides the obvious
candidates, Coverage and its cap, Photo review, the crop editor and rotations, Look-alikes and Photo stats, for the corals
and, where a subject has its own version, the fish. The shell they sit in (addresses, the subject switch, the draft and
Publish) is in [admin.md](admin.md); the Tree tab, every subject's node pages, in [admin-tree.md](admin-tree.md). Every
click writes the draft, as Pierre's own choices in `curation.json` ([data.md](data.md#curationjson-pierres-choices)),
and reaches the site with his Publish (rule A1). This is the specification of what the code does now; why each part was
decided is in [docs/decisions/](../decisions/README.md) and the PRs.

## A genus's page in the Tree

The corals' genus pages are the Tree's pages of a leaf node, `#photos/tree/key/<Genus>` (the Genera tab is folded into
the Tree since 2026-11-19, [admin-tree.md](admin-tree.md#the-node-pages-photo-curation-shared-by-every-subject)); the
tools below are `coralLive` in `admin-nodephotos.js`.

- **Its photos** per view, its candidates and Not this genus. The first 3 of each view are featured (genus sheet, Coral
  ID Key): a photo dragged into the first 3 places is featured, out of them it drops (the next best moves up), places
  not set fill automatically; a drag to another view moves a photo, from the candidates adds it. **Remove** takes a
  photo off the site (games included) and
  lists it with the candidates, where it can be added back; Not this (wrong genus, or only fit for a look-alike
  comparison); × excludes for good; Crop (with the rotation, below); the cover; each photo's growth form letters; the
  out of rule, share-alike and WoRMS name tags (`HELP.genus`). Its sticky bar has a view filter, All · Colony ·
  Close-up · Corallites: one view's section alone, Candidates and Not this genus hidden and counted in one line; kept
  across genera in `reefid-admin-gview`, All on a genus without the saved view. The origin chips are the filter bar's
  ([admin.md › One filter bar](admin.md#admin-for-every-subject-the-pooled-model)).
- **Genus status**: `needs()` lists what is missing (3 featured per view, a non-macro cover…); ✓ Validated is Pierre's
  button.
- **Needs**: per genus × view, why the game pool falls short (few colonies, few good ones, too easy for players' level,
  repeated photos, mix-ups), ranked (`needsOf()`, also Where to look's ranking).
- **Remove** on the genus page of an added candidate (the auto-sort's or Pierre's own) also marks it rejected (below):
  it does not come back in Candidates and the auto-sort never adds it again.
- **Removed from the site** (`genera[g].hide`): the genus's photos taken off the site, each with **Put back**; the Tag…
  filter **Removed photos**.
- **Excluded** (`exclude`): the genus's excluded photos, each with **Restore**; a restored photo comes back at its place
  at the next run of the candidate workflow (`excluded.json`, `tools/fetch_local.py` `tidy()`); the Tag… filter
  **Excluded photos**; one that names no genus any more is listed on the first root page of each view.

## Candidates (the corals)

`#photos/candidates` (the default view on phones): one pending candidate per screen (iNaturalist candidates
from `data.json` `cand`), with a source filter Pierre / Dauin / PH / All (default Dauin; a source with nothing left gives
way to the first one, in that order, that still has candidates). **One swiper for every subject**: `admin.js`
`renderCand(S)` draws the frame (the queue's switch, the row of toggles, the card and its decision bar, the empty page,
the keys), and what differs between subjects is the builder `CAND_BUILD` gives for the data shape the subject declares
(`SUBJECTS` `flat`: `candBuild`, as `TREE_BUILD`); this page is the `flat` builder's (the corals), the fish's and the sea
slugs' the `tree` builder's, in `admin-fish.js`:
[fish-photos.md › The Fish Candidates page](fish-photos.md#the-fish-candidates-page) (`tests/candbuild.test.js`).

- **Game genera first** (`isGame`, `GAME` = `core.js` `gameOf`: the slate, Millepora, the bonus genera): every candidate
  of a game genus of the source comes before any candidate of a Key-only genus, which come after in their own weighted
  draw (`candQueue` sorts on `game` first; the no-two-in-a-row step never pulls one forward).
- Key-only genera get **no Corallites candidates** (`capViews`: Colony and Close-up only; a 2-level genus's macro view is
  its Close-up, so it stays): a candidate guessed macro (`vg`) is not proposed and the swiper has no + Corallites button
  for them; their macro photos already accepted stay (sheet, Coral ID Key).
- **Order** inside each block: a weighted draw favouring genus × view cells with few game photos (weight
  1/(1+count)³ from `covOf`, so thin cells come first; ×3 when the photo completes a game colony; times the judging
  pass's `jw`, [data.md › The coral candidates' judgments](data.md#the-coral-candidates-judgments-in-the-admin)), never
  long runs of one genus; the shuffle seed in `reefid-admin-cseed`.
- **Buttons only** (no swipe gesture: it misfires when zooming): ✕ Reject (`seen['cand:f']`, a reviewed mark; the
  photo stays a candidate on its genus page, tagged "rejected"), + Colony / Close-up / Corallites (adds it), Skip, Not
  this, × exclude, Crop (`crop`, applied by `fetch_approved.py` on download). The judging pass's view guess (`vg`) is a
  dashed outline, never a green tick (a tick reads as Pierre's choice). Auto-refilled candidates arrive without
  growth-form or quality guesses.
- A candidate whose guessed view is full leaves the queue ("The cap per genus × view", below).

## The auto-sort

`autosort.js`, pure and tested in `tests/autosort.test.js`, loaded by `admin.html` only; in the admin `autoRun`,
`autoBlock`, `autoUndo`, `renderRetest`. It takes the obvious candidates off Pierre's hands.

- **Where decisions are written**: in the curation draft, at each load of the admin by someone who can publish (not
  read-only), exactly as Pierre's clicks would write them (`genera.add`, `quality`, `gf`, `crop`; `seen['cand:f']` for a
  reject; `exclude[f] = 'auto'`), logged in `curation.json` `auto` (its code grammar at the top of `autosort.js`), and
  sent by his Publish (merged key by key, `merge3`). The draft rather than a tool committing `curation.json`: the same
  path and safeguards as his own clicks (the merge onto the latest file, the Publish summary that counts "auto-sort
  decisions", Undo), one implementation that both decides and shows the agreement, and no PR that changes
  `curation.json` (rule A1); nothing reaches the site before his Publish. A value Pierre already gave (rating, form,
  crop) is never replaced; a photo he decided (added, rejected, excluded, sent elsewhere) or that is already logged is
  never touched. The whole run at load is one Undo step.
- **Sure rule** (`autoSure`, from the pass's fields, no `unsure` at all): best of its observation in its view, Fair or
  Good, view and form given → added to that view (`cellView`, only the views `capViews` allows) with quality, form and
  suggested crop; `dup`, several corals or Poor → rejected; `exclude` → excluded; `alt`, another genus, `cmp` → left to
  Pierre. A sure judgment the metrics contradict (`metFlag`: Good under 1000 px or among the 5% softest candidates, Poor
  among the 5% sharpest) is left to him with the reason in the judgment line, and is never set aside.
- **Caps**: adds fill each genus × view up to `capOf` colonies, the nearest first (Dauin, the Philippines, abroad: the
  photo's `loc`), whoever took it (rule P1: no source priority, so Pierre's own Fair photo never takes the last slot
  ahead of another observer's Good one), then Good first, then the sharper (`metrics.json`), then an open licence
  (`rightsRank`); the rest waits in the full cell as candidates. Decided again at each load.
- **Checks** (`autoCheck`: FNV-1a of the name, 1 in `AUTO.every` = 20, the same on every device): a sure candidate drawn
  is logged `?…` and not applied; it comes up in the swiper with a **Check** tag, blind (no judgment line, dashed
  guesses, suggested view or crop; its Crop editor starts from Pierre's own crop or the full photo, and saving the full
  photo keeps an explicit no-crop so the add does not write the suggestion), even in a full cell or set aside, drawn
  with weight 1; after his answer a toast gives the agent's.
- **Agreement** (`autoCompare`, `autoState`): per field (keep, view, quality, form), each answered Check counts (agree
  or not), and every later correction of an applied or undone decision counts as a disagreement (a decision left alone
  counts nothing); view, quality and form only when both added the photo, quality only when Pierre rated it. One
  comparison set per photo, from its latest log entry (`autoIdx`): two devices' drafts that logged it on different days
  are both kept by `merge3` and are not counted twice. "Not this genus" on a photo counts as not kept even when Pierre
  then adds it in the genus it went to (the auto only decides a candidate in its own genus). **Remove** on the genus page
  of a photo the auto-sort added also marks it rejected (`seen['cand:f']`, as ✕ Reject: it stays with the genus page's
  candidates, off the Candidates queue; one Undo step), so it counts as a Keep disagreement; Remove of any other photo
  is unchanged.
- **The order of the comparisons** is when Pierre answered or corrected, not when the auto decided: each click that
  changes his answer on a logged photo writes the time into its code (`@t`, Unix seconds in base 36; `saveDraft` →
  `autoWhen` → `autosort.js` `autoSigs`, `autoStamp`), so a Check of an older run he answers today is among the latest
  comparisons; entries without a time keep the log's order (day, photo), before every timed one. The Publish summary
  counts decisions, not these times.
- **Thresholds**: over the last `AUTO.win` = 40 comparisons, after `AUTO.n0` = 10, a field under `AUTO.min` (keep 0.90,
  view 0.85, quality 0.73, form 0.80; the reasons in `autosort.js`) is off: keep off = nothing applied; view off = no
  add; quality or form off = added with that field left as the dashed guess (logged `.`). Checks go on while a field is
  off, so it comes back on when it recovers.
- **Visible and undoable**: an "auto" tag next to the source of each photo it added (`srcTag`); the Auto line above the
  card (added, set aside, Checks left, agreement and n per field, off in red), folded behind the **Auto** chip at the end
  of the chips' row (marked "off" when a field is), so the photo and the buttons fit one phone screen; and Details below
  it: the table (agreement, n, threshold, on/off, Pierre's own retest agreement), the disagreements (both answers, Check
  or correction, the agent's note while `suggest.json` has it, the metrics: sharpness percentile among candidates, px,
  cast), every auto decision, newest first (the latest day, and within a day the latest run), each with **Undo**
  (`autoUndo`: removes what it wrote unless Pierre changed it since, marks it `-` so it is never applied again, the photo
  is a candidate again, one Undo step). An auto exclusion keeps its candidate entry through the candidate refill
  (`tools/excluded.py` `drop_excluded`), so its Undo brings the candidate back too; if the entry is gone anyway (not in
  the loaded candidate files), the toast says it cannot come back to Candidates instead of claiming it is back.
- **Retest** (test-retest, the ceiling the agent is compared with): once every `AUTO.retest` = 25 candidates decided in
  the swiper in a tab, a photo Pierre rated himself (not by the auto), never retested (a fixed order per photo), comes
  back blind with a **Retest** tag: quality, and growth form when he gave one; Done writes `retest` only.

The fish auto-sort is the same idea on the fish part: [fish-photos.md › The fish auto-sort](fish-photos.md#the-fish-auto-sort).

## Coverage

### Coverage › Games

`#inbox/coverage/games` (`renderCov`, `covOf`, `gamePool`): game-usable photos per genus × view (field and IMR lecture
photos; no book, multi-coral, hidden or sheet-only photos; Poor ones count), coloured by distinct colonies (0 / 1-2 / 3-4
/ 5-7 / 8+), with an "excl." line and a tooltip listing what was left out and why. `covOf` is shared with the Candidates
swiper. Its rows are the game genera (`gameOf`: Millepora and the bonus genera included, tagged "not IMR"), as on Where
to look, the over-cap warning and Health's "Genera that don't take off". Its + column gives the candidates by source,
one coloured line each: Dauin, PH, Own, Other (iNaturalist elsewhere); a tap-to-open Legend explains its notations.

**Where to look** is a banner above the grid: the 5 cells most worth a candidate search (`lookBanner()`, the same
ranking as the full list, `needsOf()`); "All N" opens the full list there (`#inbox/coverage/games?look=all`).

### The cap per genus × view

`CELL_MAX` = 40 colonies in the games per genus × view (the Auto pass fills a view up to it). A Key-only genus's cap is
`CAP.sheet` = 6 colonies, the most its sheet and the Coral ID Key show of a view, in its Colony and Close-up views
(`capOf`, `capViews`).

- Full cells get a dark outline (orange over the cap), a "N full" count and, over the cap, a "⚠ N over the cap" count,
  also on the Games and Sheets & ID Key views, and ⚠ on the Coverage tab and on the Inbox group (`OVER`, `overCap()`); a
  Key-only genus's cells over its cap are counted on the Sheets & ID Key view and outlined there.
- The swiper's full test (`cellFull`, `candQueue`) uses each genus's own cap: `candQueue` marks a candidate `full` when
  its guessed view (`cellView`: `vg`, else its view) has `CELL_MAX` colonies and its colony is not one of them; full ones
  leave the queue (a line counts them, "Show them" brings them in for the tab, the subject's `cst()` `full`) and come back when the cell drops
  below.
- **Adding to a full view** (`cellFull`) opens `renderRepl()`, semi-automatic for the most variety: one tile per colony
  of the cell, in `retireOrder()`: the suggested colony first, outlined, with its reasons (Poor quality; a difficulty the
  cell already has, within 0.5 of another rated colony; many answers, so little left to learn from it; on a tie, an
  observer with many colonies in the cell), colonies with fewer than 3 answers held back (still being rated), and last
  the ones to keep, never suggested (a photo among the first 6 of the view, the sheet's references; IMR lecture or
  Pierre's own photos; the only colony of a growth form). A click sets that colony's photos of the view to sheet only
  (`use: 'ref'`, still on the genus sheet) and adds the candidate, in one Undo step; "Add anyway" goes over the cap.
  Nothing is ever removed automatically.
- `tests/admin.smoke.js` checks the queue and the replacement.

### Coverage › Sheets & ID Key

`#inbox/coverage/sheets-id-key` (`renderKcov`): what sheets and the Coral ID Key can draw from, the IMR genera plus the
extra Dauin genera; every photo not hidden or multi-coral; colour = distinct colonies with a non-Poor photo; plus the
growth forms and species seen. Both Coverage views sort Thinnest / Thickest / A-Z, or by a view column (click again to
reverse).

### Coverage › Rights

`#inbox/coverage/rights` (every subject's; on the fish side `#fish/inbox/coverage/rights`): the rights facet,
[data.md › The rights facet in the admin](data.md#the-rights-facet-in-the-admin).

### The fish's Coverage › Games

`#fish/inbox/coverage/games` (`renderFishCov`): per family, genus or species (switch), the species at target,
the photos in play, easy (ease 4-5) and reference-level photos (`refLevel`, as the tile's badge: rule P1), the phases
shown (an IMR phase still missing marked ?), the candidates waiting (the "+" column: `autosort.js` `fishWaiting`, the
candidates nobody decided and not in play under any of their names, `treePid`: a sure candidate the game plays itself
is in play) and what is missing (`autosort.js` `fishCov`); All \| IMR and Thinnest \| Book. **To do**: species under target
with candidates waiting, species with no photo in play, families validated but incomplete, families not ready.
**Where to look** (`fishLook`): species under target whose waiting candidates cannot fill the gap, IMR's first;
`?look=all` lists all.

## Photo review

### Quality and Growth form

Quality `#photos/review/quality` and Growth form `#photos/review/growth-form`: the same grid and tools, every photo with
the filters of the filter bar (Photo review's unit select and check boxes, `QF` / `FF`).

- **Growth form** (`renderForm`): one row per IMR form; each photo has the form buttons, ✿ polyps and, on colony and
  close-up photos the tiles can show, **📌** (`togglePin`): a pinned photo leads its form's tile on the Coral ID Key start,
  then the tile fills automatically. Up to 3 per form in click order (a 4th drops the oldest); giving the photo another
  form unpins it in the same Undo step (a ✿ click never does). `proto/idkey.js` `pinLead()` applies the pins to the IMR
  form tile and to the Coral Finder tile whose `forms.json` `cf` starts with that letter (never Meandering). "Validate N"
  asks first.
- **Agreement with the automatic guess** (Pierre validates forms by hand to see whether the detection is good): a line
  at the top (`#fagree`, `formAgree()`, `agreeFill()`), "Your forms: N set · agreement with the automatic guess: X% (of N
  where both exist) · unsure guesses: M", over the photos the Show, View and genus filters leave (`FSCOPE`; Not checked
  yet and Polyps out don't change it), form letters only (✿ apart): his form (the draft's curation `gf`) against the
  dashed guess (`AUTOF`: `forms.json` `gf`, or the judging pass's `fm` for a candidate); unsure = `gunsure` guesses still
  on the guess. Nothing new is recorded; a click refreshes it in place (`agreeRefresh()` from `formTile`); ✓ Validate N
  counts as agreeing. A `<details>` opens a guess × yours table (diagonal = agreed, per-guess agreement), its title lists
  the same pairs on hover.
- **Guesses first** (`FF.gfirst`, a checkbox beside Not checked yet): in each row the photos still on a guess first,
  unsure ones first, the ones he set last (`fRank`).
- **Keys on Quality and Growth form** (`tileKeys`): 1 2 3, or B E T U M S F, X and P, act only on the photo that has the
  keyboard focus (clicked, or reached with Tab; ringed, `.adm-qt:focus-within`), never on one the mouse merely passes
  over, and never with Ctrl, Alt or Cmd, a held-down key or the enlarged photo open; a tile keeps the focus when its
  buttons are redrawn (`keepFocus`).

### By difficulty

`#photos/review/by-difficulty`: every coral photo with answers, hardest or easiest first, with its quality to re-rate
and its reading in words ([admin.md › Difficulty in words](admin.md#difficulty-in-words)).

On the fish side, `#fish/photos/review/by-difficulty` (`renderFishDiff`, after the fish views so that the tab still opens
on Ease): the fish photos players answered, by their answers alone since the sheet rates the corals' photos only
(`diffByAnswers` over `photoAnswers` and `rowsOf`, as fish Health counts them: every answer that showed the photo,
family and genus questions alike), Hardest (lowest share right) or Easiest first, more answers first on a tie, the
corals' ≥1 / ≥3 / ≥10 answers; each photo a family-page tile (`fishRepTile`: Tags with its ease, Remove, Not this, Crop,
×) with its share right, answers and players who miss it; a photo already out (excluded, Not this, removed) left out, as
on Health; the first 48 shown (`FDIFF_MAX`), the rest counted; its own ? (`fishdiff`, no photo-difficulty note).

### The fish views: Ease and Phase & framing

`renderFishReview`, views for the family rank only (`GROUPS` view option `rank`): Ease `#fish/photos/review/ease` and
Phase & framing `#fish/photos/review/phase-framing`, one family's photos in play at a time (`reefid-admin-fishrev`), each
in the row of its value now; one click sets Pierre's ease, juvenile flag, phase word (a family with IMR phase lines only)
or view (`autosort.js` `fishSet`, `fishTag`, as the fish Candidates); the agreement line, the draft's values against the
judging pass's (`fishAgree`).

### Light proposals

`#fish/photos/review/light-proposals` (`admin-light.js`; tests `tests/fishlight.test.js` and the admin smoke's photos
part): the light re-judge's proposals (`judging/fish-light-q308.json` `curation`, rubric 6), then those of one judgement
per photo under their own heading (`judging/fish-one-judgement.json`; `admin-light.js` `LIGHT_SETS`: a photo in two sets
shows the later one), read at run time with the token through the GitHub contents API (`ghFile`; `judging/` is not on
the site; the demo answers it from the local copy).

- One tile each: the photo, its species, what would change in words (each tag and flag that differs, his value struck
  through, the re-judged one in bold, the codes in the tooltip; then the ease), **Accept** (the re-judged tags and ease
  into the draft, `fishSet`: one Undo step), **Keep mine** (`curation.json` `fish.kept`), **Accept all N** (one step,
  confirmed: bulk); rows by the light change.
- A proposal is open (`lightOpen`) while the photo is his add in play, its draft tags and ease both still the ones it
  was made against, and not kept; so an accepted one, a kept one or one whose tags or ease he changed since is done. A
  proposal that would move a tag to a retired code (count `m`) is never offered (`lightRetired`; the test checks the
  file has none).
- The view is in the switch only while one is open (`GROUPS` view options `live` and `draw`, read by `hasPage` and
  `render`, whatever `SUBJECTS` admin `pages` lists); once on screen it stays drawn ("No light proposal left.").
  Publish's summary counts the proposals accepted and kept (`lightSummary`).

### Cover proposals

`#fish/photos/review/cover-proposals` (`admin-covers.js`; tests `tests/fishcoverprop.test.js` and the admin smoke's
photos part). Pierre's ★ Cover of a family or a genus (`fish.genera[node].cover`) is never replaced by the default cover
rule ([fish.md › Covers](fish.md#covers)); where it is in force (in play, not a juvenile: `fishCoverOf`) and the rule now
picks another photo (`autosort.js` `fishCoverRule`, the default part of `fishCoverOf`, on the photos the node's Tree page
chooses from: `fuNodePhotos` over `fuFamM`; compared by `treePid`), the rule proposes it.

- One card per node, families then genera: the node's name, his photo and the rule's, each with the species it shows,
  the rule's why in a line ("Most seen near <centre>: N observers", the centre's name from `fish.json` `centre`; "no
  reference photo" when its species competed without one; "your ★ species cover" when the photo is his cover of that
  species), **Accept** (the rule's photo as his cover in the draft, `fishPick`: one Undo step), **Keep mine**
  (`fish.kept[node]` = the pair, `coverKey`), **Accept all N** (one step, confirmed: bulk).
- Proposals are live, from the draft (`coverProposal`, `coverOpen`): one is done once answered (Accept makes the rule
  agree), once his cover changes (a new cover of his that still differs is a new pair, listed again), or once the rule
  agrees; a Keep mine holds for its pair only, so a later pick of the rule may come back. A node with no cover of his,
  or with his cover out of play or on a juvenile, has none (the default already applies there); species covers are not
  nodes and get none.
- In the switch while one is open (`coverLive`: the family pages' data read once, `fishLoad(true)`), the list cached
  per draft on `fuDataM`'s record; Publish's summary counts the Keep mine answers (`coverSummary`; an Accept is counted
  with the covers, rank by rank).

## The crop editor and photo rotation

Wherever the crop editor is offered (a genus page's Crop, the Candidates swiper's, the fish Candidates'),
it keeps the photo 40 px from the screen's sides on touch screens (12 px with a mouse), so a crop dragged to the edge
does not set off the phone's back / forward swipe.

**Photo rotation** (every subject): the editor's second row turns the photo a quarter left (⟲) or right (⟳), or back
upright (0°, off while upright); the photo and its frame turn together (a CSS rotate of the editor's box, sized so the
turned photo fits, a drag turned back into the photo's axes: `autosort.js` `rotDelta`), and Save writes the crop and the
rotation as one Undo step: `curation.json` `rot{f: 90|180|270}` (degrees clockwise; upright = no entry: `rotSet`),
`fish.rot` for a fish photo, through the draft and Publish (`merge3`, rule A1). The Crop button is on for a photo cropped
or turned.

- **One composition**: the crop stays in fractions of the original photo, cut first, and the cut is then turned
  (`tools/photos.py` `turn`; `autosort.js` `photoAt` maps a point of the original into the file, `turnedSize` its size,
  and `tests/rotate.test.js` checks the workflow's files against them on a fixture image), so turning a photo never
  changes its crop (the crop box turns with it) and the judging pass's proposed crops stay valid.
- **The previews** draw a draft rotation at once: `crSrc` (also behind `admin-fish.js` `fishSrc` and `fuP`, so a fish
  photo in play is handled like a coral one) shows the file as it is when it already has the draft's crop and rotation
  baked in (`cr`, `ro`), else the original with the crop (`object-view-box`) and `data-rot`, which `rotFit` turns by CSS
  once the photo has loaded, and again when its box changes size (a `ResizeObserver`): a tile's photo (object-fit cover)
  turned a quarter gets its image box swapped before it is turned (`rotCover`), so it shows exactly the part of the
  photo the turned file will show in that tile, and a half-turn is turned in its own box; a whole photo (the lightbox,
  the swiper) is scaled to stay whole (`rotScale`). The Draft title says "rotations", Publish's summary counts
  "N rotation(s)" and "N fish photo rotation(s)".
- **The files**: the Candidate photos workflow (`approved-photos.yml`) makes them again from the original when the
  rotation changes, as for a crop (`tools/fetch_approved.py` for the corals, `tools/fish_game.py` for the fish, both
  through `photos.write` and `photos.stale`), the four sizes uploaded to R2, the record's `ro` (with `cr`) saying what its
  files were made with, `iv` bumped so no cache serves the old file, `ar` measured on the turned file. The app shows the
  files as they are; it turns a photo itself only when R2 fails and the photo comes from its online original
  (ARCHITECTURE "Photos", **Served from Cloudflare R2**).

## Look-alikes

`#photos/look-alikes` (`renderMont`): one row per classic pair (the same list and automatic pick as `learn.js`
`classics()` / `montage()`). Per pair: View Colony / Close-up / Corallites / **All** (photos of every zoom, the automatic
pick preferring the nearest zooms), **Auto | Manual** (clicking a photo makes it Manual; Auto drops his view and photo
picks but keeps a hide), **Shown | Hidden** (Hidden keeps the comparison off the public Look-alikes page until good
examples exist). Stored in `curation.json` `mont`. These pages read the base's pairs (`classicPairs`); the content
editor's pair entries are edited on the Tree ([admin-tree.md](admin-tree.md#the-corals-tree)).

On the fish side, `#fish/photos/look-alikes` (`renderFishMont`): one row per look-alike pair of families in force on the
draft (`admin-content.js` `montPairs`: `autosort.js` `fishPairs` over `fish.json` `families` `look` with the content
editor's pairs laid over it, `sheetFile`; the IMR course's pairs, less those he withdrew on the Tree, plus those he added
there, marked "(added)" as in the Tree's Look-alikes filter; the circles leave every pair in; IMR's lines shown as their
source, none on an added pair), a phase switch (Adult = every photo not of a juvenile, Juvenile, All: `fishMontPick`),
Auto / Manual and Shown / Hidden as the coral pairs, the two photos and a strip of each family's photos in play; picks in
`curation.json` `fish` `mont` `{pair: {v, a, b, hide}}` (`fishMontSet`), the pair key `core.js` `contentPairKey` (an
added pair's picks stored as a base pair's; a withdrawn pair's kept, unused, back with the pair). Species pairs are not
built yet.

## Photo stats

### Overview

`#photos/stats/overview` (the default view; `renderPstats`, `poolStats`): general statistics on all photos, computed in
the browser from what the admin already has, with no new sheet call (the photo ratings `?stats=1` alone,
`loadStats(true)`, not the answer log).

- **Headline**: photos in play (the games' pool, `gamePool` over the game genera and their views, as Coverage › Games),
  colonies in play (distinct observations), game genera with at least one photo, candidates waiting.
- **All photos**: every photo the admin knows by state, each counted once (in play, not in games with the first reason
  that applies, comparison only = sent to Not this genus › Look-alike comparison, curation `out` `'cmp'`, own photos and
  candidates alike, which `photos()` / `cands()` skip; removed, candidates waiting, rejected, excluded) and the total.
- **Per genus**: photos and colonies in play per game genus, median [p25–p75] (`core.js` `distOf`, `quantile`: linear
  between neighbours), range, mean, and a bar chart of the genera by photos in play (round bands, a genus with none
  counts 0); **Fewest and most** (5 each, links to the genus page).
- **Views**: photos in play per view, share, per-genus median [middle half] over the genera that have the view (a
  2-level genus has no Close-up), genera without any.
- **Sources** (IMR lecture, Pierre, iNaturalist Dauin / Philippines / elsewhere; the book is never in games): total,
  share, per-genus spread, genera with any.
- **Answers per photo**: answers that rated each photo in play (as Difficulty), in bands (none, 1-2, 3-9, 10-29, 30+),
  the median of all and of the rated ones, and how many have 3 or more. **3+ answers per genus** (per-photo ratings
  cannot converge at this traffic, so the goal is the first 3 to 5 answers per photo): per game genus its photos in play,
  those with `RATE.MIN` = 3 answers or more and their share, the least covered first, and how many are far harder than
  the genus (`farHarder`, linked to Difficulty).
- The page shows numbers, labels and column headers only (rule A2); what each row, column and spread means is in its ?
  help (`HELP.pstats`). `tests/admin.smoke.js` checks the numbers against `covOf` and a plain median at 390 and 1280 px,
  and that marking a photo in play and a candidate comparison only moves them to that row with the total unchanged (and
  Undo puts them back).

**One renderer for every subject**: `pstatsHtml` draws the cards from one shape of numbers, each subject's made by its
adapter (`pstatsCoral`: `poolStats` and the sheet's ratings, as above; `pstatsFish` for a subject the sheet does not
rate). **On the fish side** `#fish/photos/stats/overview` (`pstatsFish`, help `fishpstats`; the sea slugs' too, their
genus-level photos counted at their genus): the photos in play as Coverage › Games counts them (`autosort.js` `fishCov`
over `fuData`: per family, genus and species), in the fish data's words (`SUBJECTS` `one`, `many`, `admin.obs`,
`admin.origins`, the circles of `structure`):

- headline photos and observations in play, families in play, candidates waiting;
- **All photos**, every photo the fish data hold, once by `core.js` `treePid` (in play first, then excluded, Not this,
  removed by `fishState`, another species one could take for it out of play, a candidate waiting, else not in games);
- **Per family** photos and observations, then the photos in play per genus and per species; **Fewest and most**
  families (their Tree pages); **Circles** in the Views card's place (photos per circle, the spread over its families,
  families without); **Sources** (the fish origins);
- **Answers per photo** from the answer log alone, as By difficulty and Health count them (`photoAnswers` over `rowsOf`,
  a photo under its candidate id and its game id one photo: `answersBy` by `treePid`; the bands `pstatsBands`);
  **3+ answers per family**, its last column **Missed**, the photos everyone misses as Health counts them
  (`everyoneMisses`), opening Health;
- the photo difficulty is Photo stats › Difficulty (below), not here.
- Tested in `tests/fishpstats.test.js` and `tests/admin.smoke.js` (the cards at 390 and 1280 px, light and dark; the
  answers per photo against a count made in the page from the fish answers of a fresh fish session).

### Difficulty

`#photos/stats/difficulty`, every subject's page (`EVERY`; `statsPhotos`, one renderer `diffHtml` over each subject's
numbers: `diffMain` the corals', `diffOwn` a subject with ratings of its own): by unit (the corals' genera; the fish's
families, the sea slugs' genera), one lane per view, a dot per photo sized by its answers, the lane's median, a box and
whiskers from 5 photos; units and tables by median; a subject with one view has no Views card and no legend.
**Far harder than their unit**: the photos in play whose own part of the difficulty, the sheet's difficulty minus the
offset `gd` of the unit it carries, is `FAR.D` = 1.5 logits or more after `FAR.N` = 5 answers or more, the farthest first,
each opening the photo (`farFrom`; `farHarder` for the corals; at a unit recognised 4 times in 5, such a photo is recognised
about 1 time in 2; `tests/farharder.test.js`).

- **Own ratings** (`SUBJECTS` `stats`, the script version that serves them: fish v189, sea slugs v167; rule D4): `?stats=1&s=<id>`
  read once (`loadOwnStats`, `ownRead`) from a reply that names the subject, else the page says which version it needs. A
  photo is rated at the rank each question asked: its fifth element names the unit whose offset its difficulty carries.
  `ownMerge` joins the sheet's photos by `treePid` (a photo logged under its game id and its candidate id is one: its two
  ratings merged, weighed by their weighed answers; 63 of the fish's 2,221) and takes each to the unit of its row (its
  registry entry: the family) by swapping the offsets, as `model.js` `photoDiff` does, so a photo rated at a genus lies
  with the family's; the far-harder gap is the same either way. The page draws without waiting for the answer log (routed
  before `renderStats`). Sources are the subject's `admin.origins`. The sea slugs' ratings are served from v167 but empty
  so far: their page says "No answers yet" until players have answered.
  Tested in `tests/ownstats.test.js` and `tests/admin.smoke.js` (rated photos against a count from the demo's made-up fish and
  sea slug answers, light and dark).

### Taxa

`#photos/stats/taxa`, every subject's page (`admin.js` `EVERY`, so no `SUBJECTS` `admin` `pages` entry; `admin-taxa.js`
`renderTaxa`): the taxa that are out of play, or in the game but not ready to be asked, and why. Read-only, from what the
admin already holds (no sheet call, no file of its own): one row per taxon, its name (its page on the Tree or the genus
page when it has one: a species in the game of a family, a coral genus; none for a species `out`), its family, and its
reasons, each with the number or the recorded text behind it. One chip per reason with its count narrows the list; All
brings it back. A reason is always a field somebody recorded, never a guess: a taxon no field explains says **Reason not
recorded**.

- **The tree subjects' species** (the fish, the sea slugs; `taxaFish`), from the tree file and the draft:
  - the file's `out`, the reason `tools/build_fish.py` wrote, one reason per part of "a; b": "family in no circle" is
    **Outside the circles**, "not confirmed in the Philippines" **Not confirmed in the Philippines**, "not confirmed near
    Dauin" **Not confirmed near Dauin** (the presence rule C8: no confirmation, not proof of absence), any other text
    **Out as recorded**, shown as written; an `out` with no text, or a species that is not out and that no family page and
    no photo count reaches, **Reason not recorded**;
  - a species not out whose family is in no circle in force, **Outside the circles** with "its family is in no circle in
    the draft" (the draft's Structure › None, `fuCircle`);
  - a species in the game, by the photos in play the family pages count (`autosort.js` `fishCov`): **No photo in play**,
    with the candidates waiting; **Under target**, with its observations in play against its target (`fishTarget`: it
    still plays).
- **The corals' genera** (`taxaGenera`): **Key only**, a genus `data.json` holds for the Coral ID Key that no game
  asks (`core.js` `gameOf`), and **No photo in play** for a game genus with nothing in play in any view (Coverage's `covOf`).
  Corals have no species rank to curate, so no species is listed.
- Not listed: a taxon in play at its target. A species the build dropped altogether (`report["drop"]` of
  `tools/build_fish.py`) is not in `fish.json`, so the admin cannot list it. The sea slugs' genus-level photos (`gl`) are
  photos of a genus in play, not a waiting taxon, and no field records a taxon "waiting for the species level".
- The ? help (`HELP.taxa`) says what each reason means. Tested in `tests/taxa.test.js` (the pure functions on made-up data:
  the known and an unknown `out` text, no reason recorded, a draft circle of None, the counts) and `tests/admin.smoke.js`
  (each subject's list against a count made from the files, the chips, the links, no sideways scroll, dark at 390 and
  1280 px).
