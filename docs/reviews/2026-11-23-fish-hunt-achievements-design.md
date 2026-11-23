# The fish hunt achievements and Q261's two: design note (REE-56)

**Status: design only (docs).** Nothing is built. Written on `origin/main` at ff634ee6, 2026-11-23 (Manila evening),
for Linear REE-56 "Fish achievements: the hunt set and Q261's two". The read-only timing runs gave no valid figure
(section 7: the first hit a simulator bug since fixed, the second was cut at its budget). Section 9 lists the
questions for Pierre and the integrator's calls; section 10 is the build plan.

## 1. What Pierre decided

- **The hunt set** (Pierre, 2026-11-04, recorded in #467 and FISH_PATH.md "Both subjects in one app"; paraphrase):
  about 14 general fish achievements, "plus a separate set of harder, specific 'hunt' achievements": mastering a precise
  look-alike pair, his example the pearlscale angelfish (*Centropyge vrolikii*) against the juvenile of the mimic
  surgeonfish (*Acanthurus pyroferus*); hard combinations; tongue-in-cheek / wink ones. Kept apart from the general set
  so they never crowd it, designed later, never for time.
- **Q261** (Pierre, 2026-11-08; [ANSWERS.md](../ANSWERS.md) "Q261", paraphrase): Dauin's top 20 is circle-1 species for
  now, with another top including circle 3 later; the frequency-based achievements ("je sais reconnaître les X poissons
  les plus fréquents", and for fun "les X poissons les moins fréquents à Dauin") go in the species-level design. The
  learning notebook names them "Usual suspects" (circle 1, then every circle) and "Rare finds" (the least seen at
  Dauin, by `present.dauinU`), "counted beyond the 33", X to be chosen.
- **The frame**: rule L8 (learning milestones only, never time; the first within a few dozen questions; each new one's
  timing checked with the real game before it is added); names short, fun and diver-flavoured, descriptions plain and
  exact ("des noms sympas, rigolos, pour varier", 2026-11-08); an achievement no longer valid is removed from everyone,
  silently (Q260, Q264).

The issue's next action said "after fpct100 and fbasics". fbasics "Fin to tail" is built (#1369). fpct100 is not: it
waits for the ultimate exam (REE-27, design #1489; REE-30). Nothing below reads fpct100 or the exams, so the design does
not wait for it. The build shares a file with it (section 10).

## 2. What is there today

**The achievement engine** (spec/achievements.md). Each subject has its own list (`core/achievements.js` `FISH_ACH`, 32
built, fpct100 waiting), tested on a snapshot of the player's progress (`progress.js` `achSnap`), stored in the synced
record `reefid-sync-ach` under ids starting with f. Two kinds: `learn`, counted in the badge's "earned / total"
(`progress.js` `ACH_L`), and `contrib` (the Contributions), listed in a section of their own below it and never counted
in the learning. `core.js` is embedded in the sheet's script (`tools/sync/Code.gs`, rule D3), so `FISH_ACH` is too.
The per-answer feats (runs, corallites, hard photo) belong to the corals only (`SUBJECTS` `achFeats`; `achAfter`
returns early for the fish). Raising `ACH_V` recounts every list on the current progress (`achMigrate`).

**What the player's progress already holds**, per unit (fish family, scientific genus, species by common name `s:`, by
scientific name), all replayed from the answer log by the sheet (rule D9):

- the bar and its level (`lvStep`: met, Open Water, Advanced 80%, Divemaster, learned);
- `s.ps`, every photo shown on that unit with its counts `{file: [shown, right]}` (`model.js`, `core/replay.js`);
- `s.off` and `s.conf`, how often another unit was offered beside it and taken for it; `core/elo.js` `pairConf` reads
  both directions, and `confScore(c, prior)` against `CONF.TRAP` (0.2) is the engine's own test of "this player mixes
  up this pair" (`model.js` `confusable`, with the pooled score as the prior).

**The data a hunt can be built from** (counted on `fish.json` and `fish-game.json` of this `main`):

| Source | What | In play |
| --- | --- | --- |
| `fish.json` `lookalikes` (hand-kept `tools/fish_lookalikes.json`, rule C2) | the 7 decided species pairs, each "a resembles b" with the stage of each side, sources and marks (LEARNING.md "The mimicry class") | M1-M7, below |
| `fish.json` species `jd` (`tools/fish_juv_differs.json`) | a source says the young look clearly different from the adult | 82 of 113 species read; 77 of them with 3 or more juvenile photos (69 circle 1, 8 circle 3) |
| the photos' phase (`ph`, `jt`; `core/tree.js` `phaseOf`) | male, female, intermediate, juvenile photos | 51 species with 3 or more male and 3 or more female photos (46 circle 1, 5 circle 3; mostly parrotfishes, wrasses, anthias) |
| `fish.json` species `present.dauinU` | observers near Dauin, the score's weights | 581 of 662 species in play seen near Dauin |
| the pooled confusions (`?stats=1` `conf`) | which pairs real players mix up | not read here (read-only scope); on 2026-11-19 the log had no species answer (LEARNING.md, profiles) |

The decided pairs and their photos at the stage that resembles (the class), from `fish-game.json`:

| Pair | a, the stage that resembles | b, the species resembled | Circles | Class photos a / b |
| --- | --- | --- | --- | --- |
| M1 | Pacific mimic surgeon (*Acanthurus pyroferus*), juvenile | Pearl-scaled angelfish (*Centropyge vroliki*) | 1 / 1 | 18 / 35 |
| M2 | Mimic filefish (*Paraluteres prionurus*) | Black-saddled toby (*Canthigaster valentini*) | 1 / 1 | 40 / 43 |
| M3 | False cleanerfish (*Aspidontus taeniatus*) | Bluestreak cleaner wrasse (*Labroides dimidiatus*) | 3 / 1 | 33 / 42 |
| M4 | Bluestriped fangblenny (*Plagiotremus rhinorhynchos*), juvenile | Bluestreak cleaner wrasse, juvenile | 3 / 1 | 5 / 13 |
| M5 | Shorthead sabretooth blenny (*Petroscirtes breviceps*) | Linespot fangblenny (*Meiacanthus grammistes*) | 3 / 3 | 31 / 36 |
| M6 | Bridled monocle bream (*Scolopsis bilineata*), juvenile | Linespot fangblenny | 1 / 3 | 16 / 36 |
| M7 | Convict blenny (*Pholidichthys leucotaenia*), juvenile | Striped eel catfish (*Plotosus lineatus*), juvenile | 3 / 3 | 37 / 27 |

M1 is Pierre's example. Five of the seven need circle 3, which a player opens by choice (Q177).

## 3. How a hunt is tested: three options

**A. On the progress alone (recommended).** A hunt is a test on the snapshot, like every achievement today. The
snapshot gains a few counts the app computes from the units' existing records (`s.ps`, the bars, `pairConf`): nothing
new is stored, the sheet's replay is unchanged, and an `ACH_V` recount gives the same answer as play did, since every
input comes from the log. It cannot see the order of answers ("right after a miss"), only totals.

**B. Per-answer feats.** A streak per pair kept in `achAfter` (for example 5 right answers in a row on photos of the
class with the model among the choices). This needs feats for the fish (`SUBJECTS` `achFeats` is the corals' alone), a
new field in the synced record with its merge rule (`core/merge.js` `mergeAch`: a data format other code follows,
costly to undo), and gives nothing for answers played before the build. It reads order, which A cannot.

**C. A per-pair box replayed from the log**, as the species exams' `bx` (#1489). Exact and retroactive, but a rules
version, a sheet gate and a replay change for an achievement: out of proportion (rule L11).

A is the simplest that works: hunts become harder through what they ask, not through new machinery.

## 4. The hunt set proposed

Each hunt is a learning milestone (rule L8): a species named at Advanced (its unit's bar at 80% or more, by a common
or a scientific name, Q262's sense of "named"), plus proof on the photos that make it hard. Counts and thresholds are
starting values. The names follow the 2026-11-08 brief; the word "mimic" stays out of our own words (a resemblance is
a source's claim, FISH_PATH.md), so it appears only inside a species' common name.

**4.1 The pairs (one per decided pair).** Pair M is hunted when:

1. both species are named at Advanced (either name kind);
2. at least K photos of the class of each side were answered right (distinct files in any unit's `s.ps`: a family, a
   genus or a species question all count, since the class is a photo property); K = 3 proposed, the most M4 allows
   comfortably (5 juvenile photos on its a side);
3. the pair is not a known mix-up for this player: `confScore(pairConf(P, a, b), CONF.LOOK) < CONF.TRAP` on the two
   species units (`core/elo.js` `confScore(c, prior)`, whose second argument is required). The prior is the one the
   engine gives a declared look-alike pair (`model.js` `confPrior`), since a source declares the pair; no new constant.
   With no mix-up, the two must have been offered together at least 5 times (2.4 / (n + 8) < 0.2 needs n > 4); each
   mix-up asks 5 more offers without one. It reads the player's own record only, so a recount gives what play gave.

   The draw's own test, `confusable(a, b)` (`model.js`: `confScore(pairConf(P, a, b), pooledConf(a, b)) >=
   CONF.TRAP`), is not used here for two reasons. Its prior is the pooled score, which moves with the sheet's statistics,
   so a recount could take a hunt back that nothing in the player's play changed. And `pooledConf`'s own prior depends
   on the units' families: the decided pairs are not declared look-alikes of the units (the mimicry class is per photo,
   [decision](../decisions/2026-11-19-mimicry-pairs-drilled.md)), so M1, across two families, would start at
   `CONF.BASE` (0.03) or `CONF.FORM` (0.08) and pass with no offer at all, where a pair inside one family (M5) starts
   higher (`CONF.FAM`, or `CONF.LOOK` where its species units list each other as look-alikes).

| Id | Name | Description (plain) | Tier |
| --- | --- | --- | --- |
| fhm1 | Angel in disguise | You tell the juvenile Pacific mimic surgeon from the Pearl-scaled angelfish | 2 |
| fhm2 | Toby or not toby | You tell the Mimic filefish from the Black-saddled toby | 2 |
| fhm3 | Spot the fake | You tell the False cleanerfish from the Bluestreak cleaner wrasse | 3 |
| fhm4 | Fangs for nothing | You tell the young Bluestriped fangblenny from the young cleaner wrasse | 3 |
| fhm5 | Blenny for your thoughts | You tell the Shorthead sabretooth blenny from the Linespot fangblenny | 3 |
| fhm6 | Monocle on | You tell the juvenile Bridled monocle bream from the Linespot fangblenny | 3 |
| fhm7 | Jailbreak | You tell the young Convict blenny from the young Striped eel catfish | 3 |
| fhunt5 | Look-alike hunter | 5 look-alike pairs hunted | 3 |
| fhfool | Fool me once | You hunted a pair you had once mixed up (`pairConf` shows a mix-up, and the pair is hunted now) | 2 |

Each name and description would sit with its pair in the pairs file, so the rule stays general (section 8). Silver
where both species are in circle 1, gold where one needs circle 3. fhunt5 counts pairs (a fixed number), so a
pair added to the file later never takes it back, where "every pair" would (Q260). fhfool is the wink Pierre asked for
that stays a learning milestone: being fooled earns nothing; being fooled and then mastering the pair does.

**4.2 The young that look nothing like the adult.** A species counts when it is named at Advanced, a source says its
young look clearly different (`jd.d`), and at least 2 of its juvenile photos were answered right. 77 species qualify
on the photos in play.

| Id | Name | Condition | Tier |
| --- | --- | --- | --- |
| fhjuv10 | Baby faces | 10 such species | 2 |
| fhjuv30 | Growing pains | 30 such species | 3 |

**4.3 The sexes and colour phases.** A species counts when it is named at Advanced and at least 2 photos of each of its
two most photographed phases (male, female, intermediate) were answered right. 51 species have 3 or more photos of
both sexes.

| Id | Name | Condition | Tier |
| --- | --- | --- | --- |
| fhph10 | Two-tone | 10 such species | 2 |

**4.4 Hard combinations: from the players' own confusions, later.** "Hard" is best measured, not guessed: once the
sheet's pooled confusions hold enough species answers (`CONF.N` offers on a pair), the species groups real players mix
up most become hunts of the same shape as 4.1 (every species of the group named at Advanced, the pairs not a known
mix-up). Until then, one hand-picked example can show the shape, if Pierre wants one now (question b): the five
batfishes (*Platax*: teira, orbicularis, boersii, pinnatus, batavianus), each with 10 or more juvenile photos in play,
"Batfish five" (every one named at Advanced with a juvenile photo right, tier 3). New sourced pairs, such as the
Moorish idol against the bannerfishes, would go through `tools/fish_lookalikes.json` first (rule C2), then become a
pair hunt with no new code.

## 5. Q261's two

- **Usual suspects**: the top 20 of every circle by `present.dauinU` (ties by the commonness index `cmi`, as
  `app.js` `sciTop`), named at Advanced. Read as Q261's "another top with circle 3 later": fdauin20 "Local legend" is
  already the circle-1 top 20 by scientific names. Today the every-circle top 20 is 10 circle-1 and 10 circle-3 species
  (the ornate ghost pipefish leads with 76 observers, then the tomato clownfish, a seahorse and the whale shark), 10 of
  them shared with fdauin20. Recommended by their **common names**, so it does not repeat fdauin20 (question d). Tier 3,
  in the general list (🗺️, beside fdauin20).
- **Rare finds**: the 10 least seen near Dauin among the species seen there (`dauinU` 1 or more; ties by `cmi`), named
  at Advanced. Today 27 species share the lowest count (one observer), 18 of the 20 rarest are in circle 1, and each
  has 16 to 68 photos in play, so the hunt is reachable. Recommended in the hunt section, since Pierre framed it as "for
  fun" (question e). Tier 3.

Both lists move when `fish.json` is rebuilt, as fdauin20's does today: a player keeps what was earned until an `ACH_V`
recount, which tests again on the list in force (Q260).

## 6. Where they show

Recommended (question c): a third kind, `hunt`, beside `learn` and `contrib`. On `#leaderboard/achievements` the hunts
get a section of their own, between the learning list and the Contributions, with their own "earned / total" and the
share of players holding each, as today. The badge's count stays the learning list's (`ACH_L`), so the hunts never
crowd it. A hunt pops up as any achievement (its toast, the first of its family; a 🎯 family for the pairs and
combinations, 🐣 for the young, 🎭 for the phases). Every hunt is listed from the start, as a list to chase; the
alternative is a "hidden hunt" line until one species of it is met.

## 7. Timing (rule L8): what the simulation says

**No valid timing yet.** The hunts are not in the code, so a simulation can only time what they rest on: a species
named at Advanced (fsp1, fspsci1), and before it a family at Advanced, since a family's species open only once it
reaches Advanced (`app.js` `spPlay`). Every hunt and both of Q261's two therefore come after a family's Advanced
(fq80a) by construction: far goals, as Pierre's "harder" asks, which leave the first achievements where they are
(fmet5 and fpct10 within a few dozen answers, rule L8). How far after, nothing measured here can say:

- **A first run is void.** `tools/learnsim.js --subject fish --ach`, lecture RA and strong RA, 2 seeds x 4,000 answers,
  `--beyond yes`, `--choice auto`, on ff634ee6 (4 runs in 552 s, in a machine slot, rule W24). No family reached
  Advanced for the lecture RA and no species unit was met, but its measures stayed flat for hundreds of answers. That
  was the simulator bug REE-249, fixed in #1502 after the run: a typed fish question was answered with the unit's id,
  never taken, and asked again, so 84-92% of each run's answers were spent on one repeated question. None of its
  figures stand.
- **The same command on the fix (main at 34a430b6) was cut** at its 35-minute budget with 0 of 4 runs done (rule L11:
  stopped with what it had), well past what its calibration run had planned; the machine was loaded at the time (load about
  7 on 4 cores, another run of the same command under way). Not run again from here.
- **The last valid measure** is the notebook's run of 2026-11-08 (8,000 answers, before the species level): the first
  family at Advanced (fq80a) at answers 978-1,230. A hunt comes after that point plus the species' own climb, which no
  run has timed (on 2026-11-19 the real log had no species answer either).

The build checks each hunt's timing with the real game (rule L8, the issue's completion evidence) the way REE-30 plans
for fpct100: a progress built just short of each condition, then played in the real game until the hunt comes (the
answers it takes from there); a `learnsim --ach` run with the hunts in, to show the first achievements unchanged; and,
once the real log holds species answers, a read-only count of how far real players are from each hunt (aggregates
only, rule L12).

## 8. Rules versions, the sheet, the recount

- **No rules version**: the progress, the replay and the log do not change (option A).
- **The sheet**: `FISH_ACH` is in the embedded `core.js`, so the build runs `python3 tools/sync_core.py --fix`, adds a
  changes file, and the integrator assigns the sheet version (rule D3). `?achs=1` counts ids, whatever their kind.
- **No `ACH_V` raise for additions**: a new achievement is tested at the next check and comes as one recap toast for a
  player who already meets it. A raise is needed only if a condition of an existing one changes.
- **One rule for every subject (rule S1; Pierre, 2026-11-23 21:22 and 21:25, paraphrase as the integrator
  relayed it: a rule is general and never names the subjects it covers).** The hunts are one rule over whatever a subject declares: a pair hunt for each of its declared
  species look-alike pairs (a side with no stage given counts every photo), the young for its species a source says
  look different as young, the phases for its photos that carry one, Q261's two for its species that carry the Dauin
  rank. A subject that declares none of these simply gets no hunt of that kind; no subject is named in the code and
  no exception is needed. Each pair's fun name and description sit with the pair in the subject's pairs file (data,
  reviewed with the pair), so the code holds no list of its own. Today that gives the fish their 7 pairs, the young,
  the phases and Q261's two, and the sea slugs pair hunts for their 3 decided pairs (`tools/seaslugs.json`
  `lookalikes`: the two Spanish dancers, Q377; two specialist-sourced pairs, Q390 D), and nothing else (no juvenile
  flags, no Dauin rank); the corals have no species, so none.

## 9. Open questions

**Pierre's** (player-facing choices his words of 2026-11-04 and Q261 leave open):

- **(a) What "mastering a pair" asks.** Recommended: section 4.1 (both species named at Advanced, 3 photos of the class
  right on each side, the pair not a known mix-up for the player: at least 5 offers together without a mix-up).
  Harder: 5 photos (M4 has 5 in its class), or the
  species learned (its exam passed) once REE-27 ships.
- **(b) The first list.** Recommended: the 7 pairs, Look-alike hunter, Fool me once, Baby faces 10 and 30, Two-tone 10,
  Rare finds (13 hunts); the hard combinations from the players' confusions later (4.4). Options: add "Batfish five" now,
  or source new pairs into the pairs file first.
- **(c) Where they show.** Recommended: a section of their own, not in the badge's count, every hunt visible from the
  start. Alternatives: counted in the badge, or hidden until a species of it is met.
- **(d) Usual suspects.** Recommended: the top 20 of every circle by common names at Advanced, in the general list.
  Alternatives: by scientific names (overlapping fdauin20 on 10 species), another X.
- **(e) Rare finds.** Recommended: the 10 least seen near Dauin among those seen there, by either name at Advanced, in
  the hunt section. Alternatives: every species seen by a single observer near Dauin (27 today, moving), or another X.
- **(f) One rule, every subject's declared pairs.** Following his words of 2026-11-23 (21:22, 21:25), the hunt is one
  general rule (section 8): every subject's declared species look-alike pairs become pair hunts, and a subject that
  declares none gets none. The question left is only what that means today: the sea slugs' 3 decided pairs, which
  are plain confusions with no stage and no "resembles" claim, would get pair hunts at the same build. Recommended:
  yes, every declared pair, whatever its kind (the alternative is to read only pairs where a source says one species
  resembles the other, which today leaves the sea slugs none).

**The integrator's calls, easy to correct** (recorded in the build PR's Decisions): option A; the ids; the names and
descriptions; the tiers and icons; K's starting value once (a) is answered; ties by `cmi`; the counts 2 juvenile and
2 per phase.

## 10. Build plan

Each step is one PR. `core/achievements.js` and `core.js` are in the `core.js` lane (rule W27: one open PR at a time on
these files); REE-30's fpct100 (#1489 step 5) edits the same list, so the two go one after the other. The sizes are
estimates from cited PRs (`tools/effort.py`).

1. **The hunt engine and the first list (engine M)**, once (a), (b), (c) and (f) are answered: `core/achievements.js`
   (one rule making the hunts, kind `hunt`, from what a subject declares; `core.js` built), `tools/sync/Code.gs`
   (`sync_core.py --fix`) and a changes file, `app.js` (one `hunts()` for every tree subject: each declared pair's
   class photos and units, as `mimLay` reads them; the species flagged "young look different"; the phased species),
   the pairs' names and descriptions in `tools/fish_lookalikes.json` and `tools/seaslugs.json` (built into each
   subject's file), `progress.js` (`achSnap` hunt counts; the section on `#ach` and its count; `ACH_L` unchanged),
   `tests/achhunt.test.js` (each condition at its threshold, both sides, a mix-up blocking, the kind kept out of the
   badge, a recount equal to play, every subject: one with no pairs gets no pair hunt), docs (spec/achievements.md,
   LEARNING.md "Fish achievements", FISH_PATH.md). Timing checked with the real game (rule L8) as section 7 ends, the
   table in the PR. Players see: yes, one line to Pierre after the merge. Comparable
   to #1265, #1370, #1420, #1433, #1434: median 1.7 h (range 81 min-2.7 h).
2. **Q261's two (engine S)**, once (d) and (e) are answered: `app.js` (`usual()`, `rare()` beside `top`, for every
   subject whose species carry the Dauin rank), `progress.js` (`achSnap`), `core/achievements.js` (Usual suspects in
   the general rule beside fdauin20, Rare finds in the hunts), `Code.gs`,
   a changes file, tests, docs. Comparable to #1299, #1322, #1376, #1428, #1445: median 81 min (range 23 min-6.9 h).
3. **Hard combinations (study, then engine S)**, when the sheet's species confusions allow: a read-only count of the
   pooled species pairs (aggregates only, rule L12), the groups proposed to Pierre, then a list in the shape of 4.1.
   Not estimated: it waits for data.

Steps 1 and 2 can be one PR if the answers come together; the lane order is then: this build, or REE-30's fpct100,
whichever is ready first.
