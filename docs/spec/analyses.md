# Analyses: the stored report of the answer log

The admin's Analyses group: multifactor reports of the answer log (what makes an answer right, fast, a mix-up; how
players learn), **precomputed, not on the phone**: a GitHub Action fits them every 1000 answers of a subject and stores
the report in the sync sheet, and the admin only draws it. They measure; they change nothing in the app. This is the
specification of what the code does now; why each part was decided is in [docs/decisions/](../decisions/README.md) and
the PRs. The methods (the models, the multiple-testing correction, the visualisation study) are in
[LEARNING.md](../LEARNING.md) "Multifactor analyses"; the views the admin reads live from the answer log (Stops, Answer
log, Pairs, Heatmap) are in [admin-players.md › Live analyses](admin-players.md#live-analyses-from-the-answer-log).
Tests: `tests/analysis*.test.js`.

## One report per subject

Each subject with `core.js` `SUBJECTS` `analyses` (the corals, the fish, the sea slugs) has its own report, fitted on its
own answers only (`core.js` `subjRows`) every 1000 of them, so one subject's answers never move another's analyses. It is
stored apart (one sheet tab each, below) and read by the admin's Analyses on that subject's side of the subject switch
(rule A4). `tools/analyses.js` `metaOf` and the admin's Recompute here (`admin-analyses.js` `anGame`) read each
subject's game file (`SUBJECTS` `admin` `files` `gm`).

**The tree subjects** (the fish, the sea slugs): the report's units are what their questions ask, the families and
scientific genera as the tree has them (`f:Damselfishes`, `g:Chromis`; the sea slugs by genus). Their photos have one
view and their own judged features (`SUBJECTS` `analyses` `photos` 'judged'): `metaOf` and Recompute here (`FISHC.plays`)
give `fph` from the photos the game plays (`analysis.js` `photoMetaFish` over the game file: Pierre's ease and tags where
he set them, else the judging pass's; a reference photo's record, which has no `ph`, its tags' juvenile flag as its
phase). `ph` stays empty, so no other analysis reads them as coral views. What makes a photo hard fits them with the
corals' model (`phSpec`, `PH_FX`: the ease per point, juvenile and another phase against none, oblique and head-on / tail
/ from above against a profile, part of the fish against the whole; no "one view alone", a question of theirs showing one
photo; a feature no answer measured left out; the judged ease primary, `PRIMARY` photo), its tables by ease, phase, view
and whole or part (`tabs`), its photo lists against "ease, phase and framing" (`of`), a photo's thumbnail from
`FISHA.ph` (`anThumbs`, enlarged by `zoomOne`). The report's fingerprint reads `fph` too, so a changed judgement refits
the milestones. Their mix-ups carry no view effect (`analysis.js` `confusions`: a view never shown is left out). The views
read live from the answer log (`admin.js` `LIVE_STATS`) read their answers there, not the report: Stops
(`statsHealth`), Answer log (`statsPlayers`: the families and genera by name, an IMR sub-entry with its IMR name, its
Conditions by rank and, once players type, typed against picked, `logConds`; no Elo column, the sheet sending the
corals' levels only) and Pairs (`statsConf`: a pair starts as Look-alike when its families are declared look-alikes or it
is two genera of one family, `fishUnitRec`, else Other; no compare page, a name opens its family in Tree; its photos
enlarge alone and its observations are iNaturalist's, `SUBJECTS` `admin` `obs`; on both sides the mix-ups logged with
no other unit among the choices counted apart, the typed ones and those logged before the choices were,
`noChoiceMixups`; `tests/answerlog.test.js`).

## Where it computes

`tools/analyses.js`, run by the GitHub Action `.github/workflows/analyses.yml` every hour (minute 23) and by hand (Run
workflow, *force*), for each subject in turn (`sheetRunAll`; another subject's report only from a reply that names it,
else it logs so and leaves it). It asks the sheet for the subject's answer count (`analysesGet` with `head`, cheap:
`core.js` `subjCounts`, each subject counted apart) and does nothing until that count reaches a round thousand (1000,
2000, 3000, …) the stored report does not hold yet (`tools/analyses.js` `plan`: the stored report's newest milestone is
its answer count rounded down to a thousand), unless the analysis code changed (`analysis.js` `AV`, part of the stored
report) or *force*. Then it reads the answer log (`readAnswers`), fits every analysis at every milestone, reusing the
stored milestones whose answers and photo features are unchanged (the fingerprint `fpOf`: count, last time, right
answers, players, `AV`, a hash of the photo features), and stores the report (`analysesPut`).

Both calls carry the admin token from the repository secret **`ANALYSES_ADMIN_TOKEN`** (its setup:
[HANDOVER.md](../HANDOVER.md) "Analyses report"); without it the job says so and stops, green. The script prints counts
only (the Actions log of a public repository is public); the report goes to the sheet only: no artifact, no cache,
nothing committed.

## Milestones

The first 1000, 2000, 3000, … answers of the log in time order: round thousands only, never shifted by the count of the
first report, none before 1000. Each is fitted alone, so the views show how every estimate and its interval moved (As the
answers came in). They are kept as history: each is one more look at the same growing log, not a new study, so nothing is
marked "new since the previous milestone" ([LEARNING.md](../LEARNING.md) "Multifactor analyses", Multiple testing).

The switch shows the round milestones (the last 5), the newest selected; the status line beside it names the subject,
the newest milestone fitted, the subject's answers since it and the next one ("Corals: fitted on 2,000 answers · 729
since · next at 3,000"; "3,000 due within the hour" once its answers have reached it; `admin-analyses.js` `anStatus`),
counted as the head and the Action count them (`subjCounts`: the head's `counts`, else the answer log the page reads).
**Recompute here** alone adds all the answers so far as one more point, labelled "now (N answers), this tab only"
(`report` with `live`: the report's `live` names it), never stored.

Bootstrap draws: 999 for the latest milestone (the newest round thousand), 199 for the earlier ones while their answers
add up to 60,000, none beyond (`report`; `node tools/analyses.js --boot N --boot-history N`); Recompute here's live
point takes as many as the newest milestone.

## The report

`analysis.js` `report` gives
`{AV, made, answers, M: [milestones], R: {milestone: {n, players, at, fp, B, bse, mt, A: {…}}}}`, where `A` holds the
analyses `{rt, zoom, photo, fmt, conf, learn, back, sess, who, tdiff}`: `B` its bootstrap draws, `bse` 1 for normal
bootstrap intervals, `mt` `{m1, m2, a, q}` the number of primary and secondary tests and their levels.

Each analysis has:

- `effects` (`k`, `label`, `est`, `lo`, `hi`, `unit`, `sesoi`, `n`, the verdict `v` after the multiple-testing
  correction, `need`; when tested, `fam` 1 primary / 2 secondary, `p`, the adjusted `pa`, `alo` / `ahi` its interval at
  the level it faces; an SD also `lu`, its lower bound before the cut at 0);
- its typical values `typ` (`p` the share of right answers, or of stops in Sessions, of mix-ups in Confusions; `g` the
  questions' mean guess rate; `s` the median seconds: what the plain reading is read against) and its own tables;
- `ent`, in every analysis with two effects or more from one model (effects hard to tell apart, `analysis.js` `entOf`:
  `k` the effect keys, `r` the correlations of their estimates and `x` of their conditions in the answers as lower
  triangles, `vif`; in Formats each format's guess rate against its difficulty only; with 200 bootstrap draws or more,
  `rb` the correlations over the draws and `nb` their count);
- in Learning, `wright` (the Wright map, `wrightOf`: `th` [id, place, answers, SE], `g` [genus, difficulty, answers, SE,
  the lowest and highest log-odds beyond guessing the model gives a player on it, each at their own practice and slope:
  what "every player" is read from], `mid` the typical player's place, `m` logit(0.8); each SE with the intercept's and
  slope's uncertainty), `gcurve` (each genus with practice, `gcurveOf`: `lt` the typical player's practice, `lc` the
  practice's centre, `m` 0.8, `g` [{k, n, players, `sl` its own slope [est, lo, hi], `at` recognised beyond guessing
  today, `b` [answers from, n, right, fitted] by practice, `line` its own intercept and slope, `flat`}], lowest `at`
  first) and `res` (a second skill?, `resOf`: `lam`, `var`, `null` [median, 95th percentile] of the first axis's share
  in simulated logs, `sims`, `g` genus scores, `p` player arrows; descriptive, no verdict; a deleted account's answers in
  the fit, never as a player); Learning's random slopes add `sd_gslope` and `sd_pslope` to its effects, and Player
  profiles a `slope` behaviour;
- `chk` in Answer time, Enlarging, What makes a photo hard, Mix-ups, Learning, After a break and Sessions (Can we trust
  this model?, `checkOf`: `n`, `players`, `cal` [answers, answered, predicted, from, to] in 5 bands, `qq` [probability,
  quantile residual], `ll` {d, lo, hi, p, players} or null; Answer time's, `checkLmm`: `qq` [normal quantile, residual]);
- `ix` in Zoom, Confusions and Learning (Does it depend on …?, `ixTest`: [{k `view` | `pairview` | `fmtpractice`, `df`,
  `W` the Wald chi-square, `pm` / `pb` the model's and the bootstrap's p, `draws`, `b` / `se` the product coefficients,
  `inm` all inside the margin, then `fam` 2, `p`, `pa`, `v`, `need` from the correction; its levels: `lv` (enlarging: per
  view `off`, `on`, `d` [est, lo, hi] on the log-odds against the app's expectation; format: per format `pts` [answers,
  est, lo, hi] beyond guessing), or `views`, `typ` and `pairs` [{k, off, mix, v: [view, offers, picked, est, lo, hi]}]
  (pair × view, on missed questions)}]; `compact` keeps the tests, not the levels);
- `map` in Confusions (the mix-up map, `mixMap`: `g` the genera in the dendrogram's order, `m` its merges, `fam` the
  families, `cells` [shown, answered, offers, mix-ups, shrunk rate] in that order, `base` a typical pair's rate,
  `across`, `left`; `stab` each family's mean best Jaccard over the bootstrap draws, `draws`, `at` 0.75).

`who` (Player profiles, `profiles`): `feats`, `who` [{k anonymous id, n answers in the window, low, v the behaviours, z
their z-scores}] in the tree's order then the greyed rows, `m` Ward's tree, `cols` and `cm` the behaviours' order and
tree, `pca` {var, load, pts}, `k`, `sil`, `groups`, `stab` {loo, boot, runs (compared), of (players), kept, draws, at,
stable (1, 0, or null when no run could be compared)}, `close`, `far`; no effects, so outside the multiple-testing
correction. `tdiff` (Time and difficulty, `analysis.js` `tdiff`): `timed`, `photos`, `bins` [{k, label, n, y right, E
expected}] by how fast others answered the photo right, `agree` {photo, photos, genus, genera} the correlation of time
intensity and difficulty, `genus` and `slowest` [{k or f, n timed answers, t time intensity in log seconds, d difficulty
in logits, + = harder}].

Players are the sheet's anonymous ids; the admin shows the names from Players (`USERS`), else P1, P2…. `compact` keeps
the report under the sheet's cap: the oldest milestones lose their tables first (`ix` levels and `map` among them), then
every other older milestone goes (the first and the last 5 stay), then, if need be, all but the latest; the script
refuses to store a report still over the cap.

## The sheet's endpoints

`Code.gs` `analyses_`, admin token only (`isAdmin_`):

- POST `{analysesGet: 1, token, head?, subject?}` →
  `{ok, subject, answers, counts, stored: {answers, made, av, size, at, roster, subject} | null, report?}`: `counts`
  each subject's answers (`core.js` `subjCounts`, its rows with a
  player, as `readAnswers` serves them); `answers` the asked subject's, else the stored report's, else the replayed
  one's. It reads the tab of the `subject` asked (by default the replayed one).
- POST `{analysesPut: 1, token, report}` replaces the whole report in the tab of the report's `subject` (none: the
  replayed one): row 2 its meta, then 45,000-character parts, 2.5 MB at most.

One tab per subject (`Code.gs` `anTab_`): the corals' (the replayed subject's) in **Analyses**, every other subject's
in "Analyses" and its `SUBJECTS` `name` (the fish's in **Analyses Fish**); either call refuses a subject the script
does not know (`input`), and each stored report goes stale on its own. The admin waits for the script that has the
calls (rule D4): an older one
answers `input`, and the views say "No report yet".

## The admin's views (`admin-analyses.js`)

The page reads the stored report of the subject on screen once per load (`anLoad`, `ANREPS` by subject; another
subject's only from a reply that names it, else "No report yet") and only draws it, so it opens at once on a phone. On
another subject's side its words for the units are that subject's (`SUBJECTS` `analyses` `one`, `many`: "family or
genus", "families and genera") and each unit is named, not shown by its id (`anWords`, after drawing), its look-alikes
its own (`anGen`). Where its report tells the ranks asked apart (the fish's families, genera and species units:
[LEARNING.md](../LEARNING.md) "Multifactor analyses" 8), the views that list units draw each rank apart under "Family
questions", "Genus questions", "Species questions" (`anRk`; words `anWords` leaves as they are), Formats adds a By the
rank asked table and What makes a photo hard a Rank asked one, and the Overview ends on one line naming the Analyses
views it does not have (`anNotHere`: "Not for fish yet: Difficulty › Photos, …"). Recompute here runs on that subject's
answers. A milestone switch (the last 5), the badge, the report's date.

Each view: its counts; **What changes the result**: one dot-and-range chart per outcome (the chance of a right answer,
the seconds to answer, the chance to end the session, the chance to pick a wrong genus, right answers against the app's
expectation, the success of a pure guess), labelled in words, the dashed line at the typical value, then the table
Compared / What it does / Verdict; **How much they differ** (players, genera, photos, pairs) in words; the analysis's own
charts and tables, with plain column names; **As the answers came in** (each result on its own scale at every
milestone).

**The plain reading** (`analysis.js` `PLAIN`, `plainOf`, tested in `tests/analysis.test.js`): no "logit" or "SD player"
on screen. Every effect has a name saying what is compared ("A poor-quality photo instead of a good one"), a sentence with
its direction and size for a typical player and photo ("More likely wrong: about 68% right instead of 80%", converted
from the model's scale with the analysis's `typ` and, for a format, its own expected chance and guess rate), its likely
(95%) range, and a verdict coloured the same way on the pill, the dot and its range (▲ Helps, ▼ Hurts, ● Clear when
neither good nor bad: time, the app's own calibration; – No clear effect; … Not enough data yet), after the
multiple-testing correction (primary effects under Holm, the others under Benjamini-Hochberg), and, when clear, what it
suggests for the app (→). A primary effect carries a *primary* tag, an exploratory one an *exploratory* tag when it reads
clear (a lead, not a finding); the verdict's tooltip gives its family and adjusted p (the unadjusted one beside it),
never the page itself (rule A2). The Overview's Milestones card lists each milestone (answers, last answer, players,
clear results) as history, with no "new" count and no chart of clear results over time.

**Visual first**: the page is read on a phone, not scrolled through. The Overview draws every result as a diverging bar
(`divBars`: the change from the typical value, on the outcome's own scale, its likely range, its value in a column on the
right, coloured by verdict, the topic under its name), one chart per outcome (a right answer, the time to answer, ending
a session, mixing up genera, the app's own expectation, the success of a guess); each view does the same for its own
results, its spreads as ranges. Under the header, a bar of controls: **Show** (all, clear, helps, hurts, not enough
data) and a jump list of the page's cards. Above every chart and table of results the same **Sort** control: most
negative first (the default) or most positive first, by the signed change, a result with no clear effect or too early to
tell sorted among the others by its estimate; by topic on the Overview, a sub-heading per analysis; by name (`anSort`,
`anOrder`). The Overview's topic (the analysis a result comes from) is on a grey line of its own under each name. Each
list shows only its clear results (verdict `P.v === 'clear'`) until its toggle shows the others in place (`anFold`, kept
per page and list in `more`; Show "Not enough data" shows them all); every card folds on its title. The words ("In
words", "Every result in words" with a sparkline of each result over the milestones), the milestones and "As the answers
came in" are folded by default. These choices are kept per page in this browser (`reefid-admin-anf`, a viewer's
convenience). On a phone each result is a block (compared and verdict, then what it does). Definitions and methods are
behind the admin "?" (rule A2).

### The cards of the multifactor visualisation study

From the [study](../reviews/2026-11-05-multifactor-viz-study.md), methods in [LEARNING.md](../LEARNING.md); descriptive
unless said, so outside the multiple-testing correction.

- **Effects hard to tell apart**: a folded card in each analysis (`anEnt`).
- **Mix-up map** (Difficulty › Mix-ups, `anMixMap`): the whole matrix from 600 px up; on a phone the dendrogram as a list
  with a band per family that opens its block, the chosen family kept per page in `mfam`.
- **Does it depend on …?** (`anIx`, `AN_IX`: a card in Enlarging photos, Genera mixed up and Learning with practice): its
  question as its title, its answer in one line with its verdict (Yes, clearly / No, every difference small / Not
  enough data yet, with the answers needed: rule A5), then what enlarging changes view by view (`dotRange`), each pair's
  chance that a miss goes to the other genus by view against a typical pair's, and each format's curve against four
  choices' (small multiples, `smallLines`), each with its table. Exploratory tests (one each, Benjamini-Hochberg); not
  on the tree subjects' side for the views while their photos have one.
- **Each genus with practice** (`anGcurve`, Learning › Practice): the flat genera and the three furthest below 80% in
  words, one small chart a genus (right answers by the answers already given, against the model's prediction;
  `smallLines` up to 5 a row, 2 on a phone), sorted lowest first, and a table (recognised today, what twice as many
  answers gain, its likely range, a *flat* tag); folded on a phone.
- **Can we trust this model?** (`anChk`, folded under each of those analyses): in words, how far the predictions of
  players left out are from what they answered, whether the quantile residuals lie on the line, and, for Enlarging and
  After a break, whether they predict new players better than the app's own chance; the two charts (answered against
  predicted by band, the quantile residuals; Answer time: its residuals against a normal curve) and the bands' table.
- **Players and genera on one scale** (the Wright map, `anWright`) and **A second skill?** (the residual biplot,
  `anSkill`, folded on a phone), on Learning › Practice.
- **Player profiles** (Learning › Profiles, `#analyses/learning/profiles`, `anProfiles`): a heatmap of players ×
  behaviours ordered by Ward's tree (on the left), the greyed rows under 100 answers last, each name linked to the
  player's journey; the groups and the stability line; the closest pairs and the most different player in words; the map
  of players (`biplot`) beside it on a desktop, in a card of its own below (folded on a phone, its 8 points furthest from
  the centre labelled); a table of every number. Admin only: the report keeps anonymous ids, the names come from Players
  in the page, the Action prints counts only, the demo and the tests use made-up players.
- **Sessions in figures** (`analysis.js` `sessDesc`; `desc` in the Sessions result, also on a thin one): every session
  (newest first, at most 300: player and their session number, start, minutes, answers, games, right, right − expected,
  new genera, comeback answers, the last 3 answers, hours since the player's previous session, still going); when
  sessions start (Manila hour); right answers along a session (by fifth, sessions of 20+; the last 3, 4th-10th, 11th-20th
  answers from the end of closed sessions of 30+; right − expected with a bootstrap range over sessions) and the typical
  time by answer number (photo quiz only); how sessions end (on a miss, on 2+ misses, on a genus met for the first time,
  against the overall rates; the last answer's game); the last 10 answers of a session against the first 10 of the next
  by the length of the break (under 3 h, 3-12 h, 12-36 h, over 36 h; the app's expected chance on both sides); players
  coming back after their 1st, 2nd, 3rd session (a session that ended less than a day before the log ends counted
  neither way); first sessions against later ones. Counts and means only; one session definition (`prep`: more than 30
  minutes without an answer).

### Recompute here

A quiet link on every Analyses screen, phones included (a 44 px tall touch area on touch screens): the same module in
a Web Worker (`new Worker('analysis.js?v=N')`) on the answer log the page reads (`ANS`) and the photo
features of the draft (`photoMeta(DATA, DRAFT, …)`), so the page stays responsive, with 199 bootstrap draws read as
normal intervals (`B: 199, Bh: 0, bse: 1`: about 2 minutes at 5,000 answers on a desktop, where the Action's 999
percentile draws take about 9; the stored report's milestones are reused when their answers and photo features match,
the others keep the model's own interval only). The button shows its progress (the milestone and analysis being fitted)
in place of its label, with no other warning; the result is kept in that tab, never sent anywhere, and the stored report
stays the primary source.

## The module (`analysis.js`)

Plain JS: the browser global `ANALYSIS`, a Web Worker's message handler, a Node `require`. `prep` (formats from the
mode, sessions, exposures, the previous answer on a genus, Again after a miss), `lmm` and `glmm` (crossed random
effects), `fmtFit`, the eight analyses, `verdictOf`, `boot` (a cluster bootstrap over players, warm-started refits),
`PRIMARY` / `pOf` / `holm` / `bh` / `correct` (the multiple-testing correction, applied by `runAll` to every milestone),
`milestones`, `report`, `compact`, `photoMeta` (view, quality, sharpness, source of each photo from `data.json`,
`curation.json`, `quality.json`, `metrics.json`; the view is the one the games use, through `core.js` `applyCuration`
and `applySlots`), `synth` / `demoLog` (synthetic answers with known effects, for the tests and the demo).

## Demo (`admin.html?demo`)

Seven more made-up players (`ANALYSIS.demoLog`, about 2,200 answers on the real photos) and the report computed by the
demo itself in a Web Worker, as the Action would (no bootstrap); a fish report too, from the same seven players' made-up
fish answers (`ANALYSIS.synth` with `subject`, about 1,200 on the fish units with the most photos), kept out of the
demo's answer log so the other fish pages stay as they are. The demo answers as the gate floor's script (`core.js`
`SHEET_FLOOR`), or a newer one with `?demo&v=N`. Its answers are the same on every load of one commit (seeded draws; a
seeded stream never feeds a random-comparator sort, which Chromium calls a varying number of times: `analysis.js`
`shuffle`), and what the smoke reads in them is built in, not left to the draws: photos everyone misses in Carla's live
session (the questions with photos the signed-in players rated first, so Health shows a difficulty in words; a question
the donors cannot bring under the rule gives its answers back), Ben's saved copy reading another % than the replay, a
signed-in session besides Carla's among Recent sessions (`admin-demo.js`).
