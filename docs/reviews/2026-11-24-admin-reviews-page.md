# Reviews in the admin: one page for review sets, and a weekly sample instead of the Checks

Design note (docs only, Linear REE-252; the first sets are REE-275 and REE-8), 2026-11-24. It changes no code and no
data. Figures are counted on `main` at 9045624a (Pierre's Publish of 2026-11-24 17:50 Manila), by four read-only
scratch scripts over `curation.json`, `fish-game.json`, `data/suggest.json` and `data/cand.json` (§8).

## 0. The request

Pierre, 2026-11-24 (Manila):

- 14:56, on how he can review photos: «J'ai besoin de critères explicites et de pré-jugement pour voir si je suis
  d'accord ou pas. Je ne suis pas un robot».
- 17:58: «Je n'ai jamais validé autrement qu'en cliquant sur le bouton publier» and «Et honnètement j'ai pas forcément
  envie/besoin de valider des centaines de photos à la main».
- 17:59, on the weekly sample shown as «What makes a 5»: «En fait il faudrait que ça soit inclut dans une section de
  l'admin (page dédiée?) comme ça je n'ai pas besoin de télécharger des HTML à part».

These words are quoted from the integrator's brief and REE-252's comments: the answers ledger (`docs/ANSWERS.md`) held
no entry for them when this note was written, so they could not be checked there.

What follows: what the Checks do today (§1), the page (§2), where his answers are stored (§3), what happens to the
Checks (§4), the corals' path (§5), the effort and the PR plan (§6), the questions for the morning (§7).

## 1. What stands today (measured, with two corrections to the audit)

REE-252's audit (comment of 2026-11-24 17:58) found that no Check was ever answered. That holds. Two of its figures need
correcting.

| | Corals (`auto`) | Fish (`fish.auto`) | Sea slugs |
|---|---|---|---|
| Unanswered Checks, distinct photos (latest code `?…`) | **78** (49 `?a`, 25 `?r`, 4 `?x`), logged 2026-11-04 to 11-08 | **1,780** (1,188 `?a`, 592 `?r`), 2026-11-04 to 11-24 | no auto-sort, no log |
| `?` entries in the log, all days | 143: the same photo logged on more than one day, kept by the Publish merge (`merge3`) | 3,302 | |
| Answered (`@t` on a `?` code), or decided by Pierre since | 0 | 0 | |
| Same sure verdict from today's `data/suggest.json` | 65 (42 `a`, 20 `r`, 3 `x`); 13 no longer sure | 1,761; 17 changed sure verdict; 2 no longer sure | |
| Already in play in the game | none: no build step plays a coral candidate | **1,168 of the 1,188 `?a`**, by the build's `cand` route; 5 of the `?r` too | |
| Agreement window (`autoState`) | keep: 8 comparisons, all corrections (`fix`), 0 agree | keep: 4, all corrections | |
| Blind retests (`retest`) | 0 | 0 | |

**Correction 1.** 143 is the coral count of log entries, not photos: 78 coral photos wait.

**Correction 2.** For the fish, the Checks hold back nothing from players. `tools/fish_game.py` `in_play` puts every
sure candidate Pierre did not decide in play (`cand_sure`, Pierre, 2026-11-06, Q180), whatever its log code. What lags is
the admin's own view: the draft's `add` and `seen`, the species' "In play n/target", the Candidates queue (1,780 photos
it still offers) and the auto-sort's target counts. For the corals the 49 `?a` are really out of the game, because the
corals have no build route (§5).

**A cliff in the agreement window.** With no answered Check, the window holds only corrections, and a correction is
always a disagreement. Coral keep has 8 of them. Two more corrections (a Remove or Undo of an auto add) take it to the
`AUTO.n0` = 10 floor at 0% and turn coral keep off: the coral auto-sort would apply nothing until the rate over the last
`AUTO.win` = 40 is back at 90%, which takes 36 agreements in a row after those 10 disagreements (arithmetic on
`autoState`'s rule).
Checks are the only source of agreements, and nobody answers them. The weekly sample (§4) removes this cliff.

**Where the fish and sea slug gate really is.** A fish or sea slug field "off" (`autoState`) stops the admin's
auto-sort writing to the draft, but not the build: `in_play` reads no agreement. So for those two subjects the agreement
has never gated what players see. For the corals it does, since the draft is their only route.

## 2. The Reviews page

### 2.1 Where it sits

**Inbox › To do › Reviews**, a view beside All, Reports, Errors, Alerts, Health and Points: `#inbox/todo/reviews` for the
list of sets, `#inbox/todo/reviews/<set id>` for one set (the `ADM_PARAM` last segment, as `#inbox/todo/points/<id>`).
Rule A3 puts a new page in an existing tab's views first. To do is what needs his eye, and a set waiting for his
answers is such a thing. Points is the closest precedent: agents write the items (`data/points.json`), he settles them,
his status goes into `curation.json` `points` with Publish.

- **Every subject's page** (`EVERY` in `admin.js`, as To do › Alerts): a set may hold photos of several subjects, so the
  subject switch is inert there and the address has no prefix. Each photo names its subject.
- **The count.** The view's segment carries the number of photos waiting across open sets. Whether that number joins
  the Inbox and the subject counts is his call: the 2026-11-09 ruling made the Checks "not to-dos"
  (docs/decisions/2026-11-18-decisions-from-comments-3.md). Question R4 (§7).
- Alternative, if To do grows too long: a tab of its own in Inbox (`#inbox/reviews`), still without a new group (A3).
  Integrator's call, easy to correct.

### 2.2 The list of sets

One row per set, newest first: its name, its subjects' icons, "12 of 20 answered", the date it opened, and for an
agent's set the PR or issue it came from (REE-275, REE-8). A set fully answered folds under "Answered" with its summary
(how many lines agreed, the criteria he disagreed with most). Weekly samples older than the current one fold away
unanswered, without piling up (§2.6).

### 2.3 One photo, one screen

The card is the Candidates swiper's frame (`renderCand`: one photo per screen, the bar, the keys, `zoom`/`lbCap` on a
tap, the photo that does not load), with the review's parts in place of the decision buttons:

- **Header line**: the photo's subject icon, its unit and species, its source (`lbCap`: iNaturalist observation ↗),
  "7 / 20".
- **The decision**, the first line, for a sample photo: "In play" or "Out: near-duplicate" (the auto-sort's or the
  build's decision, in words). For an agent's study set, the study's own first line (gold set 2: in play / out / doubt).
- **The criteria lines**, one per criterion: ✓ or ✗ (or the value, where the criterion is a value, §2.5), the
  criterion's short name, a few words of the pre-judgement ("fins and dark body readable"), and at the right a
  two-segment control **Agree | Disagree** (the one segmented look, rule A2, U3). A tap on Disagree opens one small text
  field under that line for an optional word ("il est de profil"); nothing else.
- **The grade line**: what the marks give and what the judge typed ("Marks: 4 · Typed: 4" for ease; "Good · Fair" for a
  coral quality). Disagree here opens a 1-5 (or Poor/Fair/Good) segment for his grade.
- **The photo bar**, fixed at the bottom: **Agree with all** (every line he left blank agrees), **Skip**, ‹ ›. One
  click, no confirmation (A2): each click is one Undo step.
- **The criteria's definitions** behind the admin "?" (A2: no explanatory text on the page), per set: the nine criteria
  of «What makes a 5», the rubric for a sample.

**Phones** (390 × 844, the Candidates rule "One phone screen"): the photo takes the top 45% of the height under the
header (`--sw-top`); the criteria lines scroll in their own panel under it; the photo bar stays in view. A line is 44 px
high at least (its Agree | Disagree segment is the touch target). With 9 criteria and the grade, the panel holds about
five lines at a time on a 390 px phone; "Agree with all" answers the photo without scrolling. **Tablets and desktops**:
the photo on the left, the lines in the side column on the right, as the swiper's wide layout. Keys on a keyboard: A
(agree with all), ← → (previous, next), 1-9 (toggle Disagree on line n).

### 2.4 The draft, Undo and Publish

Every answer is a click in the curation draft like any other (Undo, Redo, the one IndexedDB store, the sign-out seal),
and Publish sends it, merged key by key (`merge3`). The Publish summary (`pubSummary`) gains one line: "Review
answers: 18 (What makes a 5: 12; week 48: 6)". Read-only (`?readonly`) keeps answers in the tab only, as for any click;
the demo (`?demo`) gets a made-up set so agents can test the page.

### 2.5 The first two sets

- **«What makes a 5»** (REE-275, `tools/studies/what-makes-a-5/`, merged in #1543): 46 photos (31 typed 4, 15 typed 5;
  fish and sea slugs, no corals), nine criteria C1-C9, a ✓/✗ and words per criterion from the recorded tags and
  `prejudge.json`, the grade the marks give (5 minus the ✗) and the typed ease. It maps one to one: lines C1-C9, the
  grade line, the photo's note under the photo. Its photos are on R2, which the admin's CSP already allows. Its
  `answers.py` reads the answers back from the line format of the page's "Copy answers"; it would read the new storage
  instead (§3).
- **Gold set 2** (REE-8, REE-277, PR #1550, not merged when this note was written): 42 fish photos, each with one
  judge's values for in play / out / doubt, ease, view, light, colours, sharpness, size, count, juvenile, watermark and
  camouflage. Its lines carry a **value** rather than a ✓/✗ ("view: profile", "colours: slightly faded"); Agree |
  Disagree works the same, and his word replaces the value. The first line is in play / out / doubt; the grade line the
  ease. Its photos are iNaturalist `medium` images on `inaturalist-open-data.s3.amazonaws.com`, which the admin's
  `img-src` already allows. Its key is lost (which of six configurations judged each photo), so his answers give a true
  label per photo and field, not a comparison of configurations (its README).

Both are converted once, by a small script in their study folder, into one **set file** each, committed by PR (rule A1
keeps them out of `curation.json`: an agent never writes it).

**A set file**, `data/reviews/<set id>.json`, the format every set follows (agents' sets and the weekly sample's
snapshot alike):

```
{"id": "what-makes-a-5", "name": "What makes a 5", "issue": "REE-275", "at": "2026-11-24",
 "criteria": [{"k": "C1", "name": "Pose", "help": "..."}, ...],
 "grade": {"name": "Ease", "scale": [1, 5]},
 "photos": [{"f": "fish-s039-cand-179489877", "subject": "fish", "unit": "t06", "sp": "Acanthurus grammoptilus",
             "url": "...", "big": "...", "o": "...", "decision": null,
             "lines": {"C1": ["ok", "profile"], "C3": ["ok", "fins and dark body readable"], "C8": ["no", "seagrass ..."]},
             "marks": 4, "typed": 4, "note": "..."}]}
```

A line's mark is `ok`, `no` or a value string. The admin reads `data/reviews/index.json` (the list of set ids) and each
set file from the site, as it reads `data/points.json`. That means a new set shows only once a Pages deploy has
succeeded (REE-279's lag). Reading them through the GitHub API with the token, as `curation.json` is read, would avoid
the lag. It costs one request per set at load, so it is kept for later if the lag persists.

### 2.6 The weekly sample

About 20 photos a week, drawn from **decisions already applied**, so nothing waits on his answer.

- **Which week**: the ISO week in Manila time. The set id is `week-2026-48`. The draw is seeded by the week, so every
  device draws the same set (FNV-1a, as `autoCheck` today).
- **From where** (while a coral field is off, its share comes from the unapplied sure proposals instead, §4.3): the
  decisions of the last week, or of the last four weeks when a week holds too few. Corals: the auto log's
  plain `a`, `r`, `x` codes. Fish: the build's `cand` route (`fish-game.json` `auto: 'cand'`) and the log's `r`. Sea
  slugs: `seaslug-game.json`'s `cand` route and the pass's sure rejects (`data/suggest.json` `seaslug`). Never a photo
  he decided himself, never one already sampled.
- **How many of each**: about 7 per subject. Half are in play, half out. Within each half the draw is stratified: one
  with a crop, one with a phase where the subject has phases, and one near the edge (a sure judgement within one point
  of the cap that would have turned it). A subject with fewer decisions gives its room to the others.
- **The lines**, from the pass's judgement in force (`data/suggest.json`), written out as `tagText` writes them today:
  - Corals: view, quality, growth form, crop, and the reason for a reject or exclusion.
  - Fish and sea slugs: the rubric's rows (view, whole, light, colour loss, clarity, size, count, the juvenile and
    camouflage flags), the phase, the crop, and the ease as the grade line.
  - If Pierre adopts the nine criteria of «What makes a 5» for an ease of 5 (the reference-poses note's question b),
    the sample shows those for fish and sea slugs instead.
- **The snapshot**: his first answer on a photo of a weekly set writes what the card showed (the decision, the lines
  and their marks) into that photo's answer (§3), and it never changes after that. From then on the card shows the
  snapshot, not a judgement re-run since, so every line he answers on that photo, then or later, is about the same
  values, and every comparison is with what he saw. Nothing is written without a click of his.
- **Unanswered weeks** fold away when the next one opens. The lines he answered stay counted. Nothing piles up: there
  is never more than one open sample.

**Not blind.** Pierre asked for the pre-judgement on screen (14:56). An answer seen beside the agent's tends to agree
more than a blind one (anchoring). So the agreement the sample gives is a ceiling of the blind one. The thresholds were
set for blind Checks (keep 0.90, view 0.85, quality 0.73, form 0.80). Two mitigations are planned. First, every line
needs its own Agree, unless "Agree with all" is pressed, and the page counts both separately. Second, the summary says
how many photos were agreed with one press. Whether the thresholds should move for a non-blind measure is question R3.

## 3. Where his answers are stored

All three options store the same record, one per set and photo:

```
"review": {"<set id>": {"<photo f>": {"l": {"C1": [0, "<t>"], "C3": [1, "<t>"], "grade": [0, "<t>"]}, "all": 1, "g": 3,
                                       "w": {"C1": "il est de profil", "": "a word on the photo"},
                                       "s": {"decision": "...", "lines": {...}, "marks": 4}}}}
```

`l` holds every line he answered, each with its own time: 1 agree or 0 disagree, then when he gave that answer (Unix
seconds in base 36, as the auto log's `@t`); a line not in `l` is unanswered. A later answer on another line writes
only that line's time, so each comparison keeps its own place in the window (§4.3). `all: 1` marks the lines that
"Agree with all" filled in (they are in `l` as 1), so the page can count one-press and line-by-line agreement apart
(§2.6). `g` is his grade, when he disagreed with the grade line. `w` holds his words, per line, `""` for the photo. `s`
is the snapshot of what the card showed at his first answer, for a weekly set only, written once and never replaced
(§2.6). Every field is written by his click.

| | **A. A part of `curation.json`, sent by Publish** | **B. A separate file in the repository, written by Publish** | **C. The sync sheet** |
|---|---|---|---|
| Rule A1 | Fits as it is: Publish merges key by key and agents never write it. The set files stay out of it. | A1 names `curation.json` only: the same protection needs a new rule (his OK) | Not curation: A1 does not apply, but D3-D4 do |
| D1 (tests never reach the sheet) | Not involved: the demo keeps Publish in memory | Not involved | Involved: the page's writes need the `sheetFetch`/stub path and the smokes' host mapping |
| D2 (names) | No player names: his answers and words only. The file is public on the site, as `points` is | Same, public | The sheet holds real names. A subagent cannot read it without the connector |
| D3-D4 (`Code.gs` version, gates) | Not involved | Not involved | A new call and a new tab in `Code.gs` (a sensitive file, W27): a changes file and `VERSION` at merge, and the page gated on the script's `v` |
| D5 (progress rules) | Not involved | Not involved | Not involved |
| D7 (a new store) | Not player data | Not player data | A new tab: its delete, merge and archive behaviour must be named |
| Publish | One commit, atomic with his other choices. Its "Photo curation" push already runs the Candidate photos workflow | A second Contents API write after `curation.json`: two commits, not atomic. A second base and `merge3`, a second sha, and the sign-out seal of a second draft | No Publish: each answer is written at once. Undo has to reach the sheet |
| Durability | In git, with history and every Publish | In git | Out of git: the sheet's own version history only |
| How agents read it back | `git show origin/main:curation.json`: any agent, offline, in a test | The same, from its own file | The integrator alone, through the connector (read-only), then hands it to subagents |
| A format other code follows? | Yes: the agreement code (§4), `answers.py`, the gold set reader, `tools/curplay.py` (`review` added to `DROP`, so players never download it) | Yes, and a second writer in `admin.js` and `admin-draft.js` | Yes, and `Code.gs` |
| Size | About 300 bytes an answered photo with its snapshot: 20 a week is about 300 KB a year, on a 2.7 MB file the admin already reads raw. A study set's answers carry no snapshot (the set file holds it) | Same, apart | |

**Recommended: A**, a `review` key at the top level of `curation.json`, written only by the admin, sent by Publish. It
is the path his answers to points already take, so no new writer, no new rule and no sheet change are needed. Players
never download it (`curplay.py` `DROP`). It is a data format other code will follow, so it is costly to undo:
**question R1 for Pierre**, nothing built before his answer.

## 4. What happens to the Checks (option A)

### 4.1 The held-back decisions are released

At the first admin load after the change, the auto-sort's run **re-decides every unanswered Check** as an ordinary
candidate. Only the run does this, in the draft, sent by his Publish (rule A1: no script, PR or rebuild writes
`curation.json`):

- A Check is a photo whose latest code starts with `?`, carries no `@t`, and that he has not decided (added, rejected,
  excluded, moved).
- The run removes all its `?` entries (every day's: 143 coral entries for 78 photos) and plans the photo afresh with
  today's judgement. `autoSure` or `treeSure` gives the verdict, `capOf` or the species' target gives the room.
- A sure decision that fits is written as any applied decision (`a…`, `r`, `x`, logged today). One that waits for room,
  or is no longer sure, is left with no log entry: an ordinary candidate. Emptied day maps stay `{}`, so the Publish
  merge removes the entries.
- On main's files, today's judgements give 65 coral photos the same sure verdict (42 adds, 20 rejects, 3 exclusions)
  and leave 13 no longer sure; the fish, 1,761 the same, 17 the other way, 2 no longer sure. These are verdicts only:
  how many adds find room under the coral cells' caps or the fish species' targets was not counted (it depends on the
  draft at that load). The no-longer-sure ones go back to the queue. The 5
  fish `?r` the build already plays become plain adds; converting the codes in place would have taken them out of play.
- It is one run, so one Undo step (or laid onto his steps when it lands after his clicks, `saveRun`/`layRun`), and each
  decision can still be undone one by one in Auto. The Publish summary counts them as auto-sort decisions.

This changes about 1,850 photos in his curation at one Publish: a bulk curation change. **Question R2**, asked before
it is built.

### 4.2 What is retired

| Where | What goes | What stays |
|---|---|---|
| `autosort.js` | `autoCheck` and `AUTO.every`. The `check` member of the run plans (`treeRun`, and `autoRun` in `admin.js`). `AUTO.retest` and `retestStats`. The `?` branch in `autoCode`. In `treeCompare` and `autoCompare`, the Check comparisons (`how: 'check'`) | `autoParse` still reads `?` (old drafts on another device). `autoStamp` and `@t` for corrections. `treeQueue`'s `chk` member goes, its `d.check` guard stays harmless |
| `admin.js` | The Check card's blind mode in the swiper (the `chk` paths: no judgment line, `adm-chk` tag, the blind crop editor), `checkToast`. The Retest card: `retestNext`, `renderRetest`, `CDONE`, `RTA`, the flat builder's `interlude`. `retest` in `output()`, `auChanged` and the change list. The Retest column of the Auto details table. `HELP.cand`'s Check and Retest sentences, "Checks left" in the Auto line. The run's toast "N to check" | The Auto line and Details: the agreement per field now from the sample, the corrections listed apart (§4.3), every decision with Undo |
| `admin-fish.js` | The **All \| Checks** queue switch (`FQ`, `reefid-admin-fq`), the blind rows, the Check toast, "Checks to answer" in the Auto line, `HELP.fcand`'s Checks paragraph | The Auto line and Details |
| `tools/fish_game.py`, `tools/curplay.py` | Nothing: their `LOG` patterns still accept `?`, which no longer appears | |
| `curation.json` `retest` | Empty today (0 entries): `output()` stops writing it; `curplay.py` keeps it in `DROP` while old drafts may carry it | |
| Tests | `tests/autosort.test.js`, `fishcand.test.js`, `fishcuration.test.js`, `candbuild.test.js`, `winkadmin.test.js`, `fishphotos.test.js`, `fishlight.test.js`, `treenames.test.js`, `rights.test.js`, `curplay.test.js` and `admin.smoke.js` name the Checks or `retest`: their Check cases become release cases (§4.1) or go | |
| Docs | `docs/spec/admin-photos.md` "The auto-sort" (Checks, Agreement, Retest), `docs/spec/fish-photos.md` (the pre-sort, the fish auto-sort, the Candidates page's All \| Checks), `docs/spec/admin.md` (the to-do count's "the auto-sort's Checks are never to-dos"), a decision record | |

**Retest loses the ceiling** (Pierre against himself, the yardstick the agent's agreement is read against). It never
ran (0 retests). The sample can keep it cheaply: once a month, one or two photos he already answered come back in the
week's set unmarked, and the page compares his two answers. Question R3 asks whether he wants that.

### 4.3 The agreement, fed from the weekly sample

`autoCompare` and `treeCompare` keep their output shape (`{f, day, field, a, p, ok, how, t}`), so `autoState` and the
Auto line are unchanged. Their inputs change:

- **The sample** (`how: 'sample'`): each answered photo of a weekly set gives one comparison per field it shows and
  he answered (a line in `l`; an unanswered line gives none).
  - keep: the decision line agreed or not;
  - corals: view, quality and form, only on an add, as today;
  - fish and sea slugs: keep, and the grade line as an `ease` field (a new field, measured and shown, gating nothing);
  - `ok` is the line's value in `l` (1 true, 0 false); `t` is that line's own time in `l`.
- **Corrections** (`how: 'fix'`) are **shown, not counted**. A correction can only be a disagreement, and a sample
  without them is an unbiased draw, so counting them would bias the window down. Today, with no agreements, it would
  switch coral keep off (§1). They stay listed in Details, with the agent's note and the metrics.
- **Per subject**: the corals' state from their sample lines, the fish's from theirs (`treeCompare`). The sea slugs get
  a measure too, shown in their Auto details, though nothing in the admin applies their decisions (§1: their build reads
  no agreement).
- **The window**: `AUTO.n0` = 10 and `AUTO.win` = 40 stay. At about 7 photos per subject a week, a subject reaches 10
  comparisons on keep in about two weeks and fills its window in about six. Coral view, quality and form count on adds
  only, about half, so they take twice as long.
- **What "off" does**: for the corals, what it does today (nothing applied, or the field left as the dashed guess). For
  the fish and sea slugs, "off" stops nothing players see (§1). It shows in red in Auto and in the integrator's brief,
  and the integrator proposes a re-judge of the field (rule P7 for its size). A gate in the build is question R5.
- **The way back on**: while a coral field is off, no new value of that field is applied, so a sample of applied
  decisions alone would run dry and the field could never recover. So while a field is off, the week's coral share is
  drawn from the **proposals of that field the run did not apply**, and the card shows the proposal ("Proposed: add to
  Colony, Fair"). His answer counts in the window as a Check's did, and nothing more is held back than "off" already
  holds. Once the field is on again, the draw returns to applied decisions. Where those proposals are:
  - keep or view off: `autoRun` applies and logs nothing, so they are candidates whose judgement is sure today, not
    decided by him and not logged;
  - quality or form off: `autoRun` still applies and logs the add, with that field left as the dashed guess (`.` in its
    code, `autoCode`), so they are those logged adds, whose quality or form line shows the pass's value as the
    proposal.

## 5. The corals' path

**Joining the sample.** The corals' applied decisions are the auto log's plain codes, so they join the weekly sample
from the first week (§2.6). The coral log holds 1,350 photos, 1,272 of them not Checks. Of the 415 coral judgements
#1548 brought to `main`, REE-252's audit counted about 230 sure adds for the next load, once the deploy has caught up
(REE-279), and 16 of them would be Checks under today's rule. Under option A none is held back.

**Should coral sure adds go through the build, as the fish and the sea slugs?** (REE-252's open question; the 2026-11-20
record `docs/decisions/2026-11-20-auto-route-out-pages-read-anew.md` left "the corals' half" to Pierre.)

- **Today**: a coral sure add reaches the game only through the admin's draft and his Publish (`autoRun`, then
  `fetch_approved.py` downloads the photo, `curation-play.json` carries the add). The fish and sea slugs: the build
  plays every sure candidate (`fish_game.py` `in_play`, `seaslug_game.py`) as soon as the judgement is merged.
- **Option 1, keep the draft route** (recommended for now). Pierre presses Publish anyway (17:58), so the coral adds
  reach the game at his next Publish. With the Checks released and the sample in place, the draft route holds nothing
  back. The agreement gate keeps working for the corals.
- **Option 2, a build route for the corals.** `tools/fetch_approved.py`, or a new `coral_game` step, would play a sure
  coral candidate with no Publish. It needs Python twins of `autoSure`, `cellView`, `capOf` with its per-genus × view
  cap and nearest-first order, `metFlag` with the metrics' 5% bounds and `capViews`, each with a parity test as
  `tests/readcur.test.js` holds `read_cur` to `sortView`. It also needs a game-file change, because the coral game reads
  `curation-play.json` directly, and `tests/curplay.test.js` holds the two files to the same games. It is costly to
  undo (a data route other code follows), and the coral metrics and cap rules are the ones with no written reason (the
  audit's differences 3-5).
- **Recommendation**: option 1 now. Option 2 only if Pierre wants coral photos in play without a Publish, which his
  17:58 words do not ask for. **Question R6.**

## 6. Effort and the PR plan

Agent time, first commit to green checks, from `tools/effort.py` (merged PRs, measured):

- **PR 1, the Reviews page and the set files** (admin, L): the view, the card, the `review` key in the draft and
  Publish, `curplay.py` `DROP`, the demo set, the smoke at 390 and 1280 px, the help; the two converters in their study
  folders. Comparable to #1270, #1330, #1336, #1393, #1435: median 3.6 h (range 3.2 h-12.4 h).
- **PR 2, the weekly sample and the agreement** (admin, M): the draw, the snapshot, `autoCompare`/`treeCompare` fed
  from the sample, corrections out of the window, the Auto line. Comparable to #1311, #1348, #1408, #1435, #1478: median
  2.1 h (range 28 min-2.2 h).
- **PR 3, the Checks retired and released** (admin, M): §4.1-4.2, the tests rewritten, the specs and a decision
  record. Comparable to #1311, #1348, #1408, #1435, #1478: median 2.1 h (range 28 min-2.2 h).
- **Option 2 of §5, if chosen** (tooling, L): comparable to #1274, #1315, #1367, #1373, #1494: median 2.2 h (range 77
  min-2.5 h), plus its parity tests.

In all about 8 h of agent time for PRs 1-3, Codex rounds included (the sum of the three medians cited above: #1270,
#1311 and their groups); more if the admin smoke needs new phone fixtures.

**Lanes (W27).** None of these files is on the sensitive list (`Code.gs`, `core.js` and `core/*.js`, `sync.js`,
`model.js`); option A needs no `core.js` or `Code.gs` change.

| PR | Files | Order | Open PRs on the same files today |
|---|---|---|---|
| 1 | `admin.js`, `admin.css`, `admin.html` (one script tag if the page is its own file, `admin-reviews.js`), `admin-demo.js`, `tools/curplay.py`, `tests/curplay.test.js`, `tests/admin.smoke.js`, a new `tests/reviews.test.js`, `data/reviews/`, `tools/studies/what-makes-a-5/`, `tools/studies/gold-set-2/` (after #1550), `docs/spec/admin.md` | first | none; the gold set converter waits for #1550 |
| 2 | `autosort.js`, `admin.js`, `admin-fish.js`, `tests/autosort.test.js`, `docs/spec/admin-photos.md`, `docs/spec/fish-photos.md` | after 1 | none |
| 3 | `autosort.js`, `admin.js`, `admin-fish.js`, the tests of §4.2, the specs, `docs/decisions/` | after 2 and after R2's answer | none |

PRs 2 and 3 touch `autosort.js` and `admin.js` in turn, never at once. #1549 touches `tools/sync/Code.gs` and `core.js`,
which this plan does not.

## 7. Questions for Pierre (the morning, Rule 0)

**R1. Where your answers are kept.** Options: (A) a `review` part of `curation.json`, sent by your Publish like
everything else; (B) a separate file written by Publish; (C) the sync sheet. Recommended: **A**, the path your answers
to points already take: one Publish, in git, readable by every agent, never downloaded by players. Note: like the rest
of `curation.json`, the words you type there are public in the repository and on the site; a player's or colleague's
name typed in a word would break rule D2.

**R2. Release the held-back decisions.** 78 coral and 1,780 fish photos the auto-sort held back as Checks, which nobody
answered (none since 2026-11-04). For the fish, 1,168 are already in the game by the build; for the corals, 49 adds are
not. Options: (a) the next admin load re-decides them with today's judgements as ordinary auto decisions, each
undoable in Auto, sent by your next Publish (65 coral and 1,761 fish get the same sure verdict, 17 fish the other way,
15 back to the queue; adds still wait when their cell or species has no room);
(b) leave them as candidates in the queue. Recommended: **(a)**.

**R3. The sample.** About 20 photos a week, from decisions already applied, about 7 per subject, half in play and half
out, with the criteria and the pre-judgement shown. Options for the agreement: (a) the same thresholds as the blind
Checks (keep 90%, view 85%, quality 73%, form 80%); (b) higher thresholds, since you see the pre-judgement. Separately:
(c) once a month one or two photos you already answered come back unmarked, to measure your own consistency, or (d)
not. And (e) your corrections (a Remove or Undo of an auto decision) leave the agreement count and are listed apart,
because they can only count as disagreements; for the corals this changes the rule that switches a field off, or (f)
they keep counting. Recommended: **(a), (c) and (e)**: start from today's thresholds and see how often you disagree;
the repeat costs you two photos a month; without (e) the coral keep goes off after two more corrections (§1).

**R4. Does a waiting set count in the Inbox?** The Checks were "not to-dos" (2026-11-09). Options: (a) the count
shows on the Reviews view only; (b) it joins the Inbox count. Recommended: **(a)**, so the sample never nags.

**R5. What a "disagree" does.** Options: (a) it only measures: the photo stays as decided, the agreement moves, and a
field that falls under its threshold leads the integrator to propose a re-judge (and, for the corals, stops the
auto-sort applying that field as today); (b) a "disagree" on the decision line also undoes that decision in your draft,
as a correction would. Recommended: **(a)**, because you asked to check criteria, not to sort photos.

**R6. The corals' sure adds through the build, as the fish.** Options: (1) keep them through your Publish (the
auto-sort's draft), now held back by nothing; (2) a build route, with Python copies of the coral cap, view and metrics
rules. Recommended: **(1)**: you press Publish anyway, and (2) is costly to undo for no gain you asked for.

## 8. What was checked, and how

- The Checks, their days, their answers and the corrections: one scratch script over `curation.json` (every day's map,
  latest code per photo, raw and distinct counts).
- The fish Checks already in play: every record of `fish-game.json` by its `f`, with its `auto` route.
- The verdicts today: `autosort.js` `autoSure` and `treeSure` run in Node on `data/suggest.json` `cand` and `fish`. The
  coral Checks are all still candidates in `data/cand.json`.
- The agreement window: `autoCompare`/`treeCompare` and `autoState` run in Node on `curation.json`.
- The code paths: `autosort.js`, `admin.js` (`autoRun`, `retestNext`, `renderRetest`, `checkToast`, `save`, `output`),
  `admin-fish.js`, `tools/fish_game.py` (`in_play`, `decided_of`, `LOG`), `tools/curplay.py` (`DROP`), and the admin's
  CSP in `admin.html`.
- The studies: `tools/studies/what-makes-a-5/` on `main`; gold set 2 on the branch of PR #1550.
- Not checked: anything in a browser; the deploy state of `data/suggest.json` (REE-279); the phone layout's line count,
  which is an estimate from the swiper's measures.
