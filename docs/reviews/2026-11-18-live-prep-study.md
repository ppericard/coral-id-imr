# Live prep: the trainer's page to build live questions (design study, 2026-11-18)

Status: a design study with mockups. It changes no app code. The mockups are the app itself, served locally, with the
prototype page injected (section 12). They are not committed. Pierre's choices are the questions at the end (section
14); the rest is the integrator's call once he has answered.

## 1. Why this study

Pierre, 2026-11-18, 09:26 Manila:

> "Pour le mode live on aura besoin d'une page de préparation pour le trainer, où ils peuvent piocher dans la base de
> donnée ou sélectionner des sujets précis pour construire leurs questions. Il nous faut vraiment un mode Kahoot
> personalisable mais aidé par notre app/moteur."

The trainer needs a preparation page. There they pick from our database, or select precise topics, to build their
questions: a customisable live quiz, helped by the app and its engine. Our own design and words, as for live mode v1
(no other product's name, look or sounds).

**What exists (live mode v1, #1049).** The trainer's setup (`live.js` `hostSetup`) offers a subject, a set (every unit
in play, or one IMR lecture group: `liveSets`), 5 to 20 questions and one time for the whole game. Each question is
built when it opens (`liveBuild`), on a unit drawn from the set. The trainer sees a question for the first time when
the class does: they cannot preview, choose, swap or keep anything.

**A finding on v1, independent of this page.** `liveBuild` builds the class's question with the trainer's own player
record:
- `photoSet(t, …)` aims the photo at the trainer's ability on that unit, so an expert trainer gets hard photos for a
  class of beginners;
- `distractors` ranks traps by `confOf`, which mixes in the trainer's own pair record (`pairConf(P, …)`).

A class question should use the pooled figures only: `photoDiff` (already player-free: the unit's offset and the
photo's pooled rating) and `pooledConf`. This page needs that "class engine" anyway (section 4). It can also go to v1
on its own as a small fix: the integrator's call.

## 2. The address

Live mode v1's addresses are `#live` (a student joins), `#live?code=123456` and `#live/host` (the trainer), with page
keys `live`, `live|<code>` and `live-host` (`core.js` `ROUTE_FIXED`, `routeOut`, `routeIn`). The prep page follows the
same pattern:

| Address | Page key | Shows |
| --- | --- | --- |
| `#live/prep` | `live-prep` | the trainer's sets (Mine, Shared, All) and New set |
| `#live/prep/<set id>` | `live-prep\|<id>` | one set open in the builder |
| `#live/host?set=<id>` | `live-host\|set=<id>` | the host page, the game started from that set |

Live addresses carry no subject prefix (`live` is not in `ROUTE_SUBJ`): a set names its own subject. The host page
gets a "From a set" line next to its quick start, which stays for a game on the spot. A new route changes `core.js`,
which `Code.gs` embeds. So even the app-only first PR carries a `tools/sync/changes/` file and runs
`tools/sync_core.py --fix` (rule D3).

## 3. Selection: what the trainer picks from

Mockups: `prep-coral-desk-light.png`, `prep-fish-desk-light.png`, `prep-coral-phone-pick-light.png`.

The left column (on a phone, the "Pick" step) narrows the database. Every facet comes from `SUBJECTS` / `UNITS`,
never a subject named in code (rule S1), and counts come from the data (rule U8).

| Facet | Corals | Fish | Sea slugs | Reused from |
| --- | --- | --- | --- | --- |
| Subject | segmented switch, the subjects a trainer can host (`liveSubjects`) | | | live.js v1 |
| Names: the tree | - | **Common \| Scientific**, Pierre's two independent teaching trees (FISH_PATH "The path is a tree": branch A common names, branch B scientific genera then species) | scientific only (Q369) | the names choice of 2026-11-04 |
| Ask: the ranks | genera | Families, Genera, Species (the ranks `UNITS` has, `rankOf`, `rankUnits`) | genera; species once built | `SUBJECTS` ranks |
| Groups | IMR lecture groups (`cqGroups('imr')`), Fire coral, Bonus | circles: the IMR course, circle 2, beyond IMR (`GX().circle`), the identification groups | circles | the Custom quiz's picker |
| Look-alike groups | declared and data look-alikes (`lookEdges`, `mixClusters`), most confused first | the same at each rank | the same, seeded pairs included (`dataSeed`) | the Custom quiz's "My mix-ups" view, pooled |
| Weak points | the cohort's weakest units (section 4) | | | new |
| Search | by name | by common or scientific name | by name | the Custom quiz's search |
| Photos: band | Easy, Mixed, Hard on the "recognised by" scale (below) | | | the admin's `recBadge` scale |
| Views | Colony, Close-up, Corallites (rule P2) | - | - | `gamePics` views |
| Variants | - | Juveniles, Colour phases (`varKindOf`) | - | the variants of Q391 |

**The picker is the Custom quiz's.** Photo tiles (`.cqtile`), groups with All / None (`.cqg`), the search field and a
segmented choice of views: *IMR groups* (circles for the fish), *Look-alikes*, *Weak points*. A trainer who knows the
Custom quiz knows this page. Two changes:
- every unit of the subject is offered, not only the trainer's `unlocked()`: a trainer teaches beyond their own path;
- the *Look-alikes* view reads the pooled pairs (`lookEdges`), never the trainer's own mix-ups (`mixEdges`).

**Rules the facets keep.**
- No growth-form filter or group (rule C4).
- Look-alike groups are the declared ones (the IMR lecture, Coral Finder, the fish key) or the data's (`isDataLook`),
  never invented ones (rule C2).
- The band and the time are segmented choices, never sliders (rule U6).

**The band is not the removed level selector.** Rules L3 and U7 remove a difficulty selector *from the players' games*:
a player never picks "harder photos" for themselves. Here a trainer picks photos for a class, as a teacher picks exam
slides. The class's answers are still scored with each photo's own rating (`scoreIn` `d0` is the photo's `photoDiff`),
so a hard set moves no one's progress unfairly. Still, the question touches a rule's substance: question (a).

## 4. Engine help

### Generate N questions from a selection

"Generate 10 questions" fills the right column. Each question is a unit, a photo, three wrong choices (one for a
two-choice question) and a type. The trainer then edits it (section 5).

1. **Units, balanced.** The selection's units in turn, so each one comes ⌊N/U⌋ or ⌈N/U⌉ times, never twice in a row
   (v1's `plan` rule). With *Weak points* on, the weakest units get the extra turns. A selection larger than N takes
   the N most useful: the weakest first, else the most confused (pooled), else the IMR order. The list's summary says
   "10 questions · 6 genera, each 1 or 2 times".
2. **One observation per question** (rule P4), never the same observation twice in a set, the views spread over the
   ones picked (corals: colony first). Only photos the games may show (`gamePics`, `gamePhotoOk`): curated in, no
   skeleton (P6), no photo of several species (P3), never a held-out photo (below).
3. **Photos "hard but recognisable", from the rating.** The scale is the admin's "recognised by": the share of starting
   players who recognise the photo without guessing, σ(−d) of its pooled difficulty `photoDiff` (`admin.js`
   `recognised`, the bands `REC`):

   | Band | Photos drawn from | Never |
   | --- | --- | --- |
   | Easy | recognised by 60% or more | |
   | Mixed (default) | 40-75%, spread over the set | below 25% |
   | Hard | 25-50% | below 25% |

   Below 25% ("very hard") a photo is usually unrecognisable (too far, too dark, half a colony). It comes only when the
   trainer swaps it in by hand. A photo with fewer than 5 answers has only its prior (the unit's offset; for the fish,
   the judged ease) and shows a "not rated yet" dot. Once a cohort is chosen, the band is aimed at the cohort's mean
   level instead of a starting player's, the same σ with the cohort's ability.
4. **Wrong choices: the traps.** The class version of `model.js` `distractors`:
   - choices of the target's rank only (`rankOf`), never a label of the target (`choiceKeys`), never two of one label
     (`choiceApart`);
   - traps ranked by `pooledConf` (every player pooled, on the declared look-alikes' prior), plus the cohort's own most
     mixed-up pairs when a cohort is chosen;
   - how many traps by band: Easy 1, Mixed 2, Hard 3. The rest come from other groups, spread over forms (the
     engine's easy-choice rule);
   - "Wrong choices from the selection only" (the Custom quiz's rule: look-alikes picked together are drilled together)
     or from the whole subject: a switch, default the whole subject.

   Each wrong choice says why it is there, in small muted text: "look-alike", "players mix them up", "other group".
5. **Never a held-out photo.** The fish held-out set (#1057, open at this writing; the corals later) keeps those photos
   out of `views` (`held`), so `gamePics` never offers them, and neither does the swap strip. A saved set stores photo
   stems, and a stem can leave play after it was saved: the held-out set rebuilt (`tools/holdout.py`), a photo curated
   out or replaced. So a set is checked again **when it is opened and when a game starts**: every stem must still be
   among its unit's game photos. A question whose photo left play is marked; the builder offers its replacement (the
   same unit, the closest rating, another observation). At host time the replacement is made by itself, and the
   trainer's screen says "Question 4: its photo left play, replaced". Tested with a held-out stem in a saved set.

### My cohort's weak points (`prep-coral-weak-desk-light.png`)

Cohorts today are the admin's named groups (#1050: the Groups tab, `cohort:<name>`, `cohortMap_`). A trainer owns
none: roles step 2 (Q345) will let a trainer make one and students join it. The pooled statistics (`stats_`) are every
player's, never one cohort's. So "weak points" needs a new script step:

- `lv: 'weak'` with the trainer's account (`lname` / `lpin`), a cohort and a subject. The script checks
  `can_(…, 'cohorts', 'instance:imr')` (the trainer role already holds `cohorts`: `ROLES.DEF`).
- Over the answers of the cohort's members in that subject (`subjRows_`) from the last 60 days, it returns per unit:
  answers, % right, the wrong name given most and how many members have the unit open. Per pair: how often they were
  mixed up. **Ids and counts only, never a name.**
- The reply is cached 15 minutes per cohort and subject (the Answers tab is read once). It could also be precomputed by
  the 15-minute trigger, as `boardWarm_` does for the boards.

**What a cohort's figures can conclude** (rule A5's spirit). Eight players give a unit 20-40 answers in a few weeks. On
30 answers a share of 50% has a 95% interval of about ±18 points. So the list ranks only units with 20 answers or more
("few answers" otherwise), shows the % with its count, and never says "significantly weaker". It is a teaching cue, not
an analysis. A pair is shown from 5 mix-ups.

**Which cohorts a trainer may read** before roles step 2 ties trainers to cohorts is question (e).

### What counts in progress

Live answers count on the units a student has unlocked only (rule L4, v1). A set of species questions therefore
counts for the few students who opened those species. Once a cohort is chosen, the builder shows "counts for 3 of 8"
under a unit that most members have not opened (from `lv: 'weak'`). Whether that rule should change for live games is
question (d), already open in ROADMAP.

## 5. Trainer control: preview and edit

Mockups: `prep-coral-desk-*.png` (the list), `prep-coral-phone-list-*.png`, `edit-coral-phone-light.png` (one question).

- **Preview.** Each question is a card: its number, the photo (or the four photos of a name → photo question), the
  right answer in the "right" colour with its "recognised by" pill and view, the wrong choices as pills, the type and
  the time.
- **Swap a photo.** A strip of the unit's other eligible observations, each with its "recognised by" pill, the current
  one ringed. One tap swaps the whole observation (rule P4).
- **Swap a wrong choice.** ↻ on a pill takes the next one by `pooledConf`. In the open card, ✕ removes one, and
  "Others the engine suggests" lists the next four as + chips.
- **Reorder.** ▲ ▼ on each card, the same on touch and mouse (no drag gesture needed; rule U4's touch-by-media).
- **Add, remove.** "+ Add a question" picks a unit (the same picker) and generates its question. Remove takes one out.
- **Time per question.** 10, 20 or 30 s per card; the set has a default.
- **Question type**, per card, offered in "Types" for the generation:
  - *Photo → name* (v1's question);
  - *Name → photo*: "Which one is *Acropora*?" and four photos, one per unit, each from a different observation. It is
    the answer shape of Find the X: the log keeps the photo tapped as `pa` (sheet v141, `PA_SHEET`). It is cheap: the
    choices carry a photo each, the student's page draws a 2 × 2 grid, and one screen holds it down to 360 × 640
    (`student-np-phone-small-light.png`; measured: content ends at 553 px of 640, above the tab bar);
  - *Two choices*: one photo, the right name and its strongest trap, side by side (the duel's question). It is logged
    as a two-choice answer: `fmtOf('live', 2)` is `again`, the two-choice format whose offset the sheet already fits.
  - Typed answers stay out (v1: out of version 1).
- **Title, Save, Host now, Shared with trainers.** At the top of the list. Host now starts the game from the set
  without leaving the page.

## 6. Saved sets

### Where they live

The script cache keeps a value 6 hours at most: right for a game, wrong for a set prepared on Monday for Thursday.

| Option | For | Against |
| --- | --- | --- |
| **A. A sheet tab, "Live sets"** | the script already writes tabs under its lock; rule D7's clean-up sits beside the others in `deleteAccount_`; no new Google permission | the sheet grows (sized below, negligible) |
| B. A file per set in Drive | sets outside the sheet | a new scope: `appsscript.json` has `spreadsheets.currentonly` only, so a Drive scope means Pierre accepts a new permission once (rule D3); one more store for D7 |
| C. A file in the repository | versioned | a trainer has no GitHub token (ROADMAP "Roles": never); commits through the editors' relay (Q348), not built |
| D. The trainer's device only | nothing to build | lost with the device; never shared |

**Recommended: A**, with D as the draft. The builder keeps the set being edited in the browser's local storage, so a
reload loses nothing, and the first PR works before the tab exists. A new tab is a data structure other code will
follow, so it goes to Pierre with who sees a set: question (b).

**The tab.** One row a set: `Set id` (8 random characters), `Owner` (the account's name), `Owner hash` (its code hash,
as the Roles tab keys a grant, so a name taken again after a delete owns nothing), `Subject`, `Title` (80 characters,
plain text: `lvText_`), `Shared` (0/1), `Questions` (JSON), `Created`, `Updated`, `Hosted` (a count), `From` (the id it
was copied from, or blank).

A question in the JSON: `{u: unit id, f: [photo stems], d: [wrong choice ids], ty: 'pn' | 'np' | 'duel', s: seconds}`.
The set also keeps its selection (`sel`: ranks, tree, units, band, views, variants), so "Generate again" works. No URL
and no label is stored: the page rebuilds both from the current data when it hosts, so a renamed common name follows.

**Size.** A 30-question set (v1's cap, `LV.QMAX`) with a 40-unit selection is about 3.9 KB of JSON, about 105 bytes a
question (measured on a set of realistic ids). Google Sheets holds 50,000 characters a cell and 10 million cells a
spreadsheet. Ten trainers with 50 sets each make 500 rows × 11 cells: 5,500 cells and about 2 MB, well under both
limits. Listing the sets reads every column but `Questions` (one range read, cached 6 hours in the script cache,
dropped on every write).

### Rights and audit

| Who | May |
| --- | --- |
| The owner (an account holding `live`) | create, edit, delete, share or unshare, host |
| Another trainer (`live`, same instance) | list and host a shared set; **Copy** makes it their own (its `From` keeps the source) |
| The instance owner (`settings`, Pierre today) | delete any set (moderation) |
| Students, anyone else | nothing: no step serves a set to a student (a game sends its questions one at a time, as v1) |

Every check is in the script (`can_`), never the page, as v1's `lvTrainer_`. Each call carries `lname` / `lpin`, never
`name` / `pin`: an older script answers `input` and never takes it for a progress save. A wrong code counts towards the
10-minute lock (`failed_`). **Audit**: one row per change (`live set save`, `live set delete`, `live set share`, by the
account's anonymous id, the set's id as target), none per read (the Audit tab's rule). Refusals are capped as every
refusal is (`auditdeny`).

### Rule D7

"A new store of player data names its delete, merge and archive behaviour in the same PR." Trainer accounts are
accounts:

- **Delete** (`deleteAccount_`, and the player's own `selfDelete_`): the account's unshared sets go. Its shared sets
  are question (c): recommended, they stay as the instance's, with `Owner` and `Owner hash` cleared, so nothing points
  to the account and other trainers keep the sets they host.
- **Merge** (from → into): the sets move to `into`, the same person's account. Grants are dropped on a merge ("a grant
  is given, not merged"), but a set is work, not a right. This is the integrator's call, easy to correct.
- **Archive**: as a delete for the shared sets (question (c)). The unshared ones stay in the tab, read by nothing while
  the account is archived (rule D7: an archive no normal feature reads), and come back if it is restored.

## 7. How live.js v1 consumes a set

On sheet v172 as it is, for four-choice photo → name questions:

1. `#live/host?set=<id>` (or Host now) loads the set (from the device before PR 2, from the sheet after) and checks it
   (section 4, point 5).
2. `LIVE_CH.start` as today: `t` the set's title, `n` its length (at most `LV.QMAX` = 30), `lim` its default time.
3. `LH.qs` holds the set's questions. `hostAct('q')` builds question *qi* from `LH.qs[qi]` (new `liveFromSet`) instead
   of `liveBuild`: the photos' addresses from their stems (`img(p, 'm')`), the four choices (ids and labels from the
   current data) shuffled, `k` the right one's index. It is the same `q` shape `lvQ_` takes, so the script sees no
   difference. A question that cannot be built (its unit gone) falls back to `liveBuild` on that unit, and the
   trainer's screen says so.
4. The reveal, scoring, logging (`liveLog`, mode `live`) and the end summary are unchanged. The end screen gains "Save
   as a set" (the questions just played) and "Again with the most missed" (`liveMissed`, a new set of those questions).

### What the sheet must change, behind gates (rule D4)

| Change | Script steps | Gate (the app waits for) | Before the gate, the app… |
| --- | --- | --- | --- |
| Saved sets | `lv: 'sets'` (list), `'set'` (one), `'save'`, `'del'`; the "Live sets" tab; D7 in `deleteAccount_`, the merge and the archive | `LIVESET_SHEET` (main's `VERSION` + 1 at that PR) | keeps sets on the device only; "Shared with trainers" hidden |
| Per-question time | the `q` action carries `lim` (5-120 s); the session's `ends` from it | `LIVEQ_SHEET` | uses the set's one time for every question |
| Two choices | `lvQ_` takes 2 or 4 choices | `LIVEQ_SHEET` | greys the type with "needs the next sheet update" |
| Name → photo | `lvQ_` takes a photo per choice (`[id, label, f, u]`), the student's view carries them; the student's page logs `pa` | `LIVEQ_SHEET` | the same |
| Weak points | `lv: 'weak'` (section 4) | `LIVEWEAK_SHEET` | hides the Weak points view |

An older script answers an unknown step `input` with its `v` (`lv_`), so each gate reads `v` from that reply, as v1's
`liveFrom` does. Each sheet PR adds its `tools/sync/changes/<branch>.md` (rule D3); `VERSION` is assigned at merge.

## 8. Layouts

**Desktop (from 1024 px), one screen at 1280 × 800** (measured: the content ends at 796 px). Two columns: the picker on
the left (sticky, scrolling inside), the questions on the right (scrolling inside), the title and its actions on top.
Mockups: `prep-coral-desk-light.png`, `prep-coral-desk-dark.png`, `prep-fish-desk-light.png`,
`prep-coral-weak-desk-light.png`, `sets-desk-light.png`.

**Phone (under 600 px).** Two steps on a segmented switch at the top: **Pick** and **Questions (10)**. A bar fixed above
the tab bar holds the step's action: "6 picked · Generate 10", then "Save · Host now". A question opens in place for
editing (the photo strip, the wrong choices, type and time). The prep page is a form, not a game: it may scroll (rule U2
is about games); the student's and the projector's screens fit one screen. Mockups:
`prep-coral-phone-pick-{light,dark}.png`, `prep-coral-phone-list-{light,dark}.png`, `edit-coral-phone-light.png`,
`sets-phone-{light,dark}.png`.

**Tablet (600-1023 px)**: the phone's two steps with the desktop's cards (rule U4: three size classes, no new
breakpoint). Not mocked.

**The new question types as the class sees them**: `student-np-phone-light.png` and `student-np-phone-small-light.png`
(name → photo, 390 × 844 and 360 × 640), `student-duel-phone-light.png` (two choices), `projector-np-desk-light.png` (the
projected name → photo).

Design: the DESIGN.md components only (`.seg`, `.chip`, `.next`, `.next.sec`, `.linkish`, `.cqtile`), the
"recognised by" colours of the admin's scale (`--rec-*`), no new colour. No page title or intro (rule U1): the help
goes behind "?".

## 9. Privacy and data (rules D2, D7)

- A set holds units and photo stems, never a student's name or answer.
- The weak-points reply holds counts per unit and pair, never a name.
- The game's data stay as v1 keeps them (the cache, 6 hours).
- The mockups use anonymous trainers ("Trainer T1", "Trainer T2"), a made-up cohort ("Reef Team, January intake") and no student
  name (rule D2).

## 10. The learning check (rule L11)

- PR 1 (sets of photo → name questions): a new source of the same questions and the same scorer, so level 1, unit
  tests and smokes, as v1.
- PR 3 adds two answer shapes to the log:
  - a two-choice answer is scored as the `again` format, which exists;
  - a name → photo answer takes Find the X's form (`pa`).

  Both are scored by `scoreAnswer` as those modes are, so no rules version (rule D5) is needed. Say so in the PR. The
  format offsets fit them from the log.

## 11. Effort in agent time, split into PRs

Hours of agent work, the review loop included (two Codex rounds at most, rule W27).

| PR | What | Sheet | Agent hours |
| --- | --- | --- | --- |
| 1. The page | `#live/prep`; the picker (the Custom quiz's, every unit, pooled look-alikes); the class engine (`pooledConf`, `photoDiff`, the band); generate, preview, swap, reorder, add, remove; sets on the device; Host now and `#live/host?set=` consuming a set (`liveFromSet`); the held-out re-check; the class-engine fix in `liveBuild`; unit tests of the generator, a smoke part | none (`core.js` routes: a changes file, `sync_core.py`) | 7-9 |
| 2. Saved and shared sets | the "Live sets" tab, `lv: sets / set / save / del`, `can_`, Audit, D7 (delete, merge, archive), My sets, Copy, `LIVESET_SHEET` | yes | 6-8 |
| 3. Question types and time | two choices, name → photo (the student's and the projector's screens, `pa`), per-question time, `LIVEQ_SHEET` | yes | 6-8 |
| 4. Weak points | `lv: 'weak'` (cohort, subject, 60 days, cached), the Weak points view, "counts for 3 of 8", the band aimed at the cohort, `LIVEWEAK_SHEET` | yes | 5-6 |

**Total: about 24-31 agent hours** in four PRs. PR 1 ships alone and is useful at once. PRs 2-4 touch `Code.gs` each:
run them one after another, or rebase each on the last (the `lv_` dispatcher).

## 12. Mockups

Made on the app at `main` 815509b3 (#1049 merged), served on 127.0.0.1, no file changed. The prototype is markup and
a stylesheet using the app's tokens only, injected into the app's page. The questions come from the app's own data and
engine: `pool`, `cqGroups`, `cqLooks`, `distractors`, `gamePics`, `img`, `cover`. The "recognised by" values are
**illustrative**: a local copy has no pooled statistics (the sheet is off), so they come from the fish's judged ease, or
from a fixed hash for the corals.

**The sheet was never reached (rule D1).** Every run:
- maps `script.google.com`, `script.googleusercontent.com` and `*.googleusercontent.com` to 127.0.0.1;
- blocks service workers;
- aborts every request except the local server and the three photo hosts, through an allowlist set on the browser
  context before the first page load;
- logs every request's host.

The last full run made 987 requests. 48 went to the sheet's host (the app's anonymous reads `?stats=1` and `?board=1`)
and all 48 were aborted: none let through. A re-run of the set lists alone made 135 requests, 7 to the sheet's host,
all aborted. Every run since the first one did the same; none let a sheet request through.

These reads go through plain `fetch`, not `sheetFetch` (`sync.js` `loadStats`, `progress.js` `loadBoard`, `?achs=1`),
so a local copy still sends them. They are probably how an earlier study's page loads reached the sheet. They are
reads, and `loadStats` sends no device id from a local copy, but a harness must block them. That is worth a line in
rule D1's testing advice: the integrator's call.

Files: in the session's scratchpad, `liveprep/shots/`, not committed:
- `prep-coral-desk-{light,dark}.png`, `prep-coral-weak-desk-light.png`, `prep-fish-desk-light.png`
- `prep-coral-phone-pick-{light,dark}.png`, `prep-coral-phone-list-{light,dark}.png`, `edit-coral-phone-light.png`
- `sets-desk-light.png`, `sets-phone-{light,dark}.png`
- `student-np-phone-light.png`, `student-np-phone-small-light.png`, `student-duel-phone-light.png`,
  `projector-np-desk-light.png`

## 13. Out of this study

- A QR code, WebSocket, typed answers in live (ROADMAP "Live mode, after version 1").
- A per-student view by name after the game (roles step 2).
- Sets for subjects in beta for a group: v1 hosts none.
- Importing questions from a file.
- Images or questions a trainer writes themself: the page builds questions from the database only. A trainer's own
  content would be content the instance owns (Q347) and goes through the editors' relay (Q348).

## 14. Questions for Pierre

Product choices only. Each has a recommendation. Everything else (layouts, words, the band's thresholds, the
generator's details, the PR split, the merge behaviour of sets) is the integrator's call, easy to correct.

**(a) A difficulty band in the trainer's page.** Context: rules L3 and U7 removed the difficulty selector from the
players' games. Here a trainer would pick photos for a class (Easy, Mixed, Hard on the "recognised by" scale), and the
class's answers are still scored with each photo's own rating.
- A: the band in the prep page only, default Mixed; never in a player's game;
- B: no band; the engine aims every set at the class's level.

*Recommendation: A.*

**(b) Where saved sets live, and who sees them.** Context: a set prepared for another day needs a store; the script
cache keeps 6 hours.
- A: a new sheet tab "Live sets". A set is private until its owner shares it; a shared set is listed to every trainer
  of the instance, who may host it or copy it, never edit it;
- B: the same tab, every set visible to every trainer from the start;
- C: on the trainer's device only (no sharing).

*Recommendation: A.*

**(c) A deleted or archived trainer's sets** (rule D7). Context: shared sets may be hosted by other trainers.
- A: all its sets go;
- B: its unshared sets go (an archive keeps them hidden, back on restore); its shared sets stay as the instance's,
  with no owner;
- C: all its sets stay as the instance's.

*Recommendation: B.*

**(d) Live answers on units a student has not unlocked.** Context: rule L4, only the quiz opens units, so v1 counts
such an answer in nothing. With prepared sets this will be common: species, beyond-IMR families.
- A: as v1, they count in nothing; the prep page says "counts for 3 of 8";
- B: they count in that unit's progress, without opening it.

*Recommendation: A for now* (rule L4 stands; B would need a learning check on what a bar means for a unit not yet in
play).

**(e) Which cohorts a trainer may read for weak points**, before roles step 2 ties trainers to cohorts. Context: Q344
lets a trainer see their cohort's figures, but students join a trainer's cohort with a card saying what the trainer
sees (Q345); today's cohorts are the admin's groups, joined without that card.
- A: any cohort of the instance, figures only (per unit and pair, no name), cohorts of 3 players or more;
- B: none until roles step 2.

*Recommendation: A.*

---

Sources:
- Code: `live.js` (`liveSets`, `liveBuild`, `hostSetup`, `hostAct`, `liveLog`); `quiz.js` (`viewCustom`, `cqGroups`,
  `cqLooks`, `cqPicks`); `model.js` (`photoSet`, `photoDiff`, `distractors`, `pooledConf`, `confOf`, `isDataLook`,
  `examSet`); `app.js` (`gamePics`, `gamePhotoOk`, `LOCAL`, `sheetFetch`, `hr`); `core.js` (`ROUTE_FIXED`, `routeOut`,
  `routeIn`, `fmtOf`, `PA_SHEET`); `admin.js` (`recognised`, `REC`, `recBadge`); `tools/sync/Code.gs` (`ROLES`, `can_`,
  `audit_`, `rolesDrop_`, `LV`, `lvQ_`, `lvTrainer_`, `lvStart_`, `lvAct_`, `lv_`, `cohortMap_`, `staffSet_`,
  `deleteAccount_`, `statsOut_`); `tools/sync/appsscript.json`.
- Docs: [2026-11-18-live-mode-design.md](2026-11-18-live-mode-design.md);
  [2026-11-15-held-out-photo-set-design.md](2026-11-15-held-out-photo-set-design.md); FISH_PATH "Levels", "Which names
  a player learns"; ROADMAP "Roles, instances and cohorts", "Live mode, after version 1"; ARCHITECTURE "Staff and
  cohort leaderboards"; #1057 (open).
- Rules: L3, L4, L11, U1, U2, U4, U6, U7, U8, C2, C4, P2-P4, P6, S1, D1-D5, D7, A5.
- Sheet limits: Google Workspace Updates, "Google Sheets doubles cell limit" (2022-03,
  <https://workspaceupdates.googleblog.com/2022/03/ten-million-cells-google-sheets.html>): 10 million cells a
  spreadsheet; 50,000 characters a cell, as several guides state.
