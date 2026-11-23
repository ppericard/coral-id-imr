# The per-player reserve built from the species up: design note (REE-248)

**Status: design only (docs).** Nothing is built. Written on `origin/main` at cfeac690, 2026-11-23 (Manila evening),
for Linear REE-248 "The per-player reserve built from the species up, never at the game's expense". The numbers are
read-only measures on the real units of each subject (section 6). The quota changes what practice keeps, so it waits for
Pierre's OK (section 8). The build comes after, in the PRs of section 9.

## 1. What Pierre asked

Pierre, 2026-11-23 19:23 Manila (after hours, he wrote first), on REE-27's measure of today's reserve:

- «la réserve elle doit être définie à l'unité la plus petite, donc là en l'occurrence l'espèce, pour celles qui peuvent
  se le permettre, et qu'ensuite progressivement on regroupe ces réserves petites au niveau au-dessus … il faut répartir
  cette réserve entre les différents examens» (the reserve is defined at the smallest unit, here the species, for those
  that can afford it, then the small reserves are grouped at the level above, and shared out among the exams).
- «la réserve, elle n'est pas prioritaire … Elle ne doit pas venir impacter le reste du jeu. Donc, c'est seulement si
  elle est possible … Sinon, au moment des examens, on pioche dans la réserve ou dans les photos les moins vues. Mais et
  les plus difficiles techniquement.» (the reserve is not a priority and must not affect the rest of the game; only when
  it is possible; otherwise the exam draws from the reserve or from the least seen photos, and the hardest.)
- On the sea slugs' 14.5% reserved: «ça me paraît beaucoup».

Still in force: the reserve is per player, every subject (2026-11-18, decision record
[2026-11-19-per-player-reserve.md](../decisions/2026-11-19-per-player-reserve.md)); "Si on n'a pas assez de photos, ben
on privilégie l'apprentissage" (2026-11-18); never his own photos nor the reference photos (Q385); the photos it takes
read their qualities, never their route or source (rule P1).

## 2. Today's rule and why it concentrates

`core/tree.js` `RESERVE = {target: 15, keep: 8, floor: 30}`; `reserveOf` fills each unit with an exam (not `noex`) up to
15 observations, the units with the most observations first, never leaving a unit with an exam under 30 observations in
practice nor a species under 8 ([spec/reserve.md](../spec/reserve.md)). The size is set per unit, so:

- A unit with 30 observations or fewer reserves nothing: 25 of the 39 coral genera, 33 of the 237 fish genera and 40 of
  the 78 sea slug genera.
- Where a unit can reserve, it takes up to 15 from few species: a sea slug species can lose 4 of its about 12
  observations (a third of its practice), a fish species up to 41% of its observations.
- The sea slugs reserve 14.5% of their observations, the most of any subject, though they are the thinnest per species.

## 3. The model

### 3.1 Each species' quota

A species `s` with `n` observations in play reserves **at most `floor(share × n)` of them, and none when `n < min`**. They
are its first eligible observations (section 5) in the player's `resHash` order, as today. A species reserves only if
some unit holding it has an exam, as today (every species does on today's data).

- **The smallest unit**: the species for the fish and the sea slugs. The corals have no species level, so a coral genus
  is its own smallest unit (`reserveOf` already keys a photo with no species by its unit). One rule for every subject
  (rule S1), with no declared difference.
- **Nothing else bounds it**: no unit target, no unit floor, no per-species keep. A species keeps at least
  `(1 − share)` of its observations in practice, and every unit, being a sum of species, keeps at least as much. With
  `share` 10%, the rounding down alone already reserves nothing under 10 observations. `min` stays a separate setting,
  so a larger share never lowers the threshold without anyone deciding it.
- **Stateless and local**: a function of the player's id and the species' own photos. A photo added or gone moves only
  its species' reserve, at its margin. Today a photo added to one species can move another's, through the units' fill
  order.

### 3.2 Grouped upward

A unit's reserve is the union of its species' reserves: a genus holds its species' reserves, a family its genera's.
`reserveSplit` already does this: it takes each reserved observation out of every unit's views and game lists and holds
it on every unit that has it (`g.held`). Nothing changes there.

### 3.3 Shared among the exams

Each exam asks first the reserved observations of its unit that the player was never shown (section 4). Two ways to
share them:

- **Shared pool (recommended).** Every exam sees all the reserved observations of its species. The exam the player
  meets first takes what it asks, the hardest first. The next exam gets what is left, then falls back on never shown
  photos, then the least seen. This is today's `reserveSplit` and `examSet`, unchanged.
- **Separate shares.** Each reserved observation is dealt to one exam only: in rounds, one per exam, the family first,
  from its species with the most left, up to 15 per exam. Another exam's share is never asked. This needs a mark on each
  held copy and a filter in `examSet`.

Measured with the recommended quota (section 6, set A), separate shares shrink every exam's pool. The fish family
exam's median goes from 15 reserved observations to 5, a third. The genus exam's goes from 5 to 4, with 149 of 237
genera under one exam's 5 questions instead of 113. With REE-27's species exams added,
every exam's share falls to a median of 1 or 2. They also reserve less: 1,795 fish observations instead of 2,124, since
a species' quota beyond what its exams take stays in practice.

The shared pool's cost: the first exam can use what a later one would have asked. Estimated, not measured: a family
exam takes 5 of its pool per attempt, so for a fish family at the median pool of 15, one attempt uses about a third of
its genera's reserve in expectation. It takes the hardest first, so the use is less even than that. The later exam then
asks never shown photos, which the reserve was built to fall back on («on pioche dans la réserve ou dans les photos les
moins vues»).

I recommend the shared pool. It is the simpler algorithm (rule L11), every exam sees the most fresh photos, and «répartir
cette réserve entre les différents examens» is met by the quota itself: every species of 10 observations or more feeds
every exam above it, where today 25 coral genera, 33 fish genera and 40 sea slug genera feed none. Since Pierre's words
could also mean separate shares, this is his question 2 (section 8).

### 3.4 The species units' exams (REE-27, #1489, open)

The species units keep `noex` until REE-27's build, and stay out of the reserve's unit list after it, as #1489's design
says ("The reserve does not change"). With the quota per species, every species unit already holds its own species'
reserve through `reserveSplit` (it holds every reserved observation it has). The species' group exam then draws on it
with `examSet` like any exam. Measured with set A: a fish species unit holds a median of 3 reserved observations (32 of
1,317 hold none: the species under 10 observations), and each of the 206 sea slug species units holds 1. That is
enough for a box (one right answer) and a re-tick after a miss (two in a row) for most fish; the sea slugs' boxes fall
back on never shown photos after the first. The species exam also ticks boxes in ordinary play on first-seen practice
photos, so it needs the reserve less than a unit's 5-question exam does.

## 4. The exam's draw order

Pierre's order («on pioche dans la réserve ou dans les photos les moins vues. Mais et les plus difficiles
techniquement») is what `model.js` `examSet` does today. Each question takes one photo alone, the hardest
(`photoDiff`) of the first pool that has one:

1. the player's reserved observations of the unit never shown to them;
2. any observation of the unit never shown to them;
3. the 3 least seen of those never answered right;
4. the 3 least seen.

"Never shown" is by observation, on any unit of the subject (`shownAll`, rule L3). A variant group still left comes first
(Q391 b). This design changes none of it. Reading «les plus difficiles techniquement» as `photoDiff` is an inference:
`photoDiff` is the photo's difficulty as the players' answers rate it, with its judged ease as the prior for a fish or
sea slug photo few have answered.

## 5. What stays out of the reserve, and why

Kept as today (`resOut`, `resCards`):

- **Pierre's own photos**: Q385 ("Never his own nor the reference photos") and rule P1's exception: every compatible photo
  of his is in the pool, "never left out".
- **Photos of reference level** (`refLevel`, by their judged qualities, never their source: rule P1): Q385. They are
  the teaching photos: the cards, sheets and first questions lead with the most reference-like. Holding them back would
  take from practice the photos it needs most.
- **Photos on a card** (a unit's cover and ★ pick, its featured photos, the cover of a species or genus with no unit):
  the player sees them on the cards and sheets, so they could never be "never shown". The whole observation stays in
  practice.

These leave 77% of the coral observations eligible, 85% of the fish and 74% of the sea slugs. At a 10% share no species
has fewer eligible observations than its quota, so the exclusions never bind.

## 6. Measured: today against three candidates

**Method.** Read-only, on `origin/main` at cfeac690. The units are built as the app builds them (`contentApply`,
`treeGen`, `treeGenera`, `treeCurate` for the tree subjects; `applyCuration`, `applyForms`, `applySlots` for the
corals). Today's figures come from the real `reserveOf`; the candidates' from a script that reproduces its eligibility
and hash order. Five synthetic ids (`~anon test1` to `test5`). The size is the same for every id, and only which
observations are reserved changes. A unit's **pool** is the reserved observations its exam can ask (section 3.3, shared).
**Under 5**: units whose pool cannot fill one exam's 5 questions. **Practice cost**: the share of a species' observations
it loses from practice. The scripts are in the integrator's scratchpad (`ree248/design.js`, from `reserve/units.js`); no
sheet, no player data. Today's fish figures differ slightly from REE-27's 19:20 comment (2,434 against 2,419) because
`main` gained candidate photos since.

Candidates: **A** share 10%, min 10; **B** share 10%, min 20; **C** share 15%, min 10.

### Corals (39 genera, 1,059 observations, a median of 26 per genus)

| Rule | Reserved | Genera with nothing | Pool, median (under 5) | Per genus, max | Practice cost, median / max | Least left in practice |
| --- | --- | --- | --- | --- | --- | --- |
| Today | 96 (9.1%) | 25 of 39 | 0 (31) | 15 | 0% / 31.8% | 30 |
| A 10%, min 10 | 88 (8.3%) | 2 of 39 | 2 (38) | 5 | 8.0% / 10.0% | 12 |
| B 10%, min 20 | 83 (7.8%) | 7 of 39 | 2 (38) | 5 | 8.0% / 10.0% | 18 |
| C 15%, min 10 | 138 (13.0%) | 2 of 39 | 3 (29) | 7 | 13.0% / 15.0% | 12 |

Under A, the 2 genera with nothing are *Anacropora* (8 colonies) and *Astrea* (9).

### Fish (660 species, 23,991 observations, a median of 34 per species)

| Rule | Reserved | Families / genera with nothing | Family pool, median (under 5) | Genus pool, median (under 5) | Species at 0 | Per species, median / max | Practice cost, median / max | Least left |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Today | 2,434 (10.1%) | 0 of 65 / 33 of 237 | 22 (0) | 15 (68) | 103 (15.6%) | 3 / 15 | 7.0% / 41.2% | 8 |
| A 10%, min 10 | 2,124 (8.9%) | 0 / 3 | 15 (3) | 5 (113) | 16 (2.4%) | 3 / 8 | 9.0% / 10.0% | 9 |
| B 10%, min 20 | 2,103 (8.8%) | 0 / 8 | 15 (3) | 5 (113) | 37 (5.6%) | 3 / 8 | 9.0% / 10.0% | 18 |
| C 15%, min 10 | 3,260 (13.6%) | 0 / 3 | 23 (0) | 8 (65) | 16 (2.4%) | 5 / 13 | 14.0% / 15.0% | 9 |
| A, separate shares | 1,795 (7.5%) | 0 / 3 | 5 (27) | 4 (149) | 32 (4.8%) | 3 / 8 | 8.0% / 10.0% | 9 |

With REE-27's species exams (1,317 species units by common and scientific name), the species unit's pool under A has a
median of 3 and 32 have none; under B a median of 3 and 74 have none; under C a median of 5. With separate shares, every
exam's share falls to a median of 1 or 2.

### Sea slugs (271 species, 3,014 observations, a median of 12 per species)

| Rule | Reserved | Families / genera with nothing | Family pool, median (under 5) | Genus pool, median (under 5) | Species at 0 | Per species, median / max | Practice cost, median / max | Least left |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Today | 437 (14.5%) | 12 of 33 / 40 of 78 | 8 (12) | 0 (41) | 90 (33.2%) | 1 / 4 | 9.0% / 33.3% | 8 |
| A 10%, min 10 | 243 (8.1%) | 0 / 0 | 4 (18) | 2 (66) | 28 (10.3%) | 1 / 1 | 8.0% / 10.0% | 9 |
| B 10%, min 20 | 0 | 33 / 78 | 0 | 0 | 271 (100%) | 0 / 0 | 0% | - |
| C 15%, min 10 | 244 (8.1%) | 0 / 0 | 4 (18) | 2 (66) | 28 (10.3%) | 1 / 2 | 8.0% / 11.8% | 9 |
| A, separate shares | 243 (8.1%) | 0 / 11 | 2 (29) | 1.5 (71) | 28 (10.3%) | 1 / 1 | 8.0% / 10.0% | 9 |

Every sea slug species has fewer than 20 observations, so B reserves none. C gives the sea slugs almost what A gives,
since 15% of 12 rounds down to 1 as 10% does. A share of 8% reserves nothing for them either (8% of 12 is under 1): 1
observation in all, and for the fish 1,601 (6.7%).

### What the table says

- **A spreads the reserve over almost every unit** at a cost of at most 10% of any species' practice: from 64% of coral
  genera with nothing to 5%, from 33 fish genera to 3, from 40 sea slug genera to none. The species with nothing are
  those under 10 observations (2 coral genera, 16 fish species, 28 sea slug species).
- **It lowers the sea slugs from 14.5% to 8.1%** (one observation of each species of 10 or more) and the corals from 9.1%
  to 8.3%. The fish go from 10.1% to 8.9%.
- **The pools are smaller in big units and larger in small ones.** The fish genus median goes from 15 to 5. Most exams
  can no longer ask all 5 questions from the reserve, and finish on never shown, then least seen photos, as Pierre's
  words allow.
- **B** only removes the reserve from species of 10 to 19 observations: every sea slug species, 5 coral genera and 21
  fish species. **C** costs 13-14% of each species' practice for a pool about 1.5 times larger, and changes nothing
  for the sea slugs.

## 7. Recommendation

**Recommended (my recommendation, for Pierre's OK): set A, `RESERVE = {share: 0.1, min: 10}`, a shared pool, the exam's
draw order unchanged.** It matches the issue's "at most about 10%" and keeps every species' loss to practice at 10% at
most. It brings the sea slugs down from the 14.5% he found too much, and gives nearly every unit of every subject a
reserve. It is the simplest rule of the three to build and to explain: one share and one threshold, no unit settings.

## 8. What needs Pierre

Asked in his morning batch (Rule 0). The quota is substance, since it changes what practice keeps.

1. **The quota.** Recommended: A, 10% of each species' observations, rounded down, none under 10. Alternatives: B (none
   under 20: no reserve at all for the sea slugs) or C (15%: larger exam pools for the fish, 14% of each species out of
   practice, the same for the sea slugs).
2. **Shared or separate.** Does «répartir cette réserve entre les différents examens» mean every exam draws from its
   species' reserve (recommended: the shared pool, the first exam met can use what a later one would ask), or that each
   exam has its own part (a fish family's exam sees a third as many, and every exam a median of 1 or 2 once the species
   exams exist)?
3. **The corals.** Under A the corals reserve in 37 of 39 genera, about 2 colonies of a typical 26, instead of up to 15
   in 14 genera. That is a different cost from the one he accepted in Q420 (spread thin over every genus rather than
   concentrated in the biggest). Recommended: accept it, with the build's level-2 check (section 9) watching the corals'
   beginner, where #1099's two breaches were.

The integrator's calls, easy to correct (the reserve is recomputed at every build, and nothing stored depends on it): the
rounding down, the hash order kept, the exam's draw order kept, Pierre's own, the reference-level and the card photos
kept out.

## 9. Build plan

The reserve is recomputed at every build, and no replay reads it or `|h`. **Rule D5 does not apply**: no rules version,
no recalculation, nothing stored moves. **Rule D4**: no gate, since the sheet never computes a reserve. **Rule D3**
applies all the same: `tools/sync/Code.gs` embeds the whole of `core.js`, so the change ships with a changes file and
the version assigned at merge.

1. **The quota per species (engine+sheet M; the `core.js` lane, one PR at a time, rule W27: after REE-27's step 1 if that
   goes first).** `core/tree.js` (`RESERVE = {share, min}`; `reserveOf` sizes per species and drops the units' fill
   order; `reserveSplit`, `heldOf`, `resOut`, `resCards`, `resHash` unchanged); `core.js` built; `Code.gs` through
   `python3 tools/sync_core.py --fix`; `tools/sync/changes/<branch>.md`. Tests: `tests/reserve.test.js` (the quota and
   its rounding, nothing under `min`, no unit floor, a photo added moving only its species, the exclusions as today, the
   species units' `noex` leaving the output unchanged); `tests/phasepath.test.js`'s count of a fish reserve holds
   (2,124 over 1,000). Docs: [spec/reserve.md](../spec/reserve.md), LEARNING.md "The reserve in the game", a decision
   record with Pierre's answers, decision record 2026-11-21-rare-few-floor's note on the reserve (a unit of 12 to 19
   observations now loses 1 or 2 for each player: count the units it takes under `RARE.FEW`). Check (rule L11): level 2,
   as for #1099, since it moves which photos practice shows in every subject. The rated world, every subject, the
   beginner and the lecture RA, 5 paired seeds at 1,000 answers, today's rule against A, the global score and the units
   at Open Water as in #1099. Rule L12: a replay of the real log cannot judge a change to which photos are drawn, so say
   so. Comparable to #1187, #1265, #1346, #1369 and #1433: median 43 min (range 24 min to 45 min), before the check.
2. **Only if Pierre chooses separate shares**: `reserveSplit` marks each held copy with the unit its observation is dealt
   to, and `model.js` `examSet` leaves another exam's share out of its pools; a test per subject that every exam's share
   is disjoint. The same lane and check as step 1, in the same PR.

Nothing in REE-27's plan (#1489) changes: its step 1 test that the reserve's output is unchanged by the species units
stays true under the new rule.
