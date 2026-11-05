# The game engine as a whole: an independent coherence review

Written 2026-11-06 (Manila morning) for Pierre. Review only: no code changed. Code read on `origin/main` at `2e8f6174`;
the progress-bar research read on `claude/progress-metric-research` (PR #622). Scope: how the modules fit together. The
state of the art per algorithm is another reviewer's.

**What I read.** In full: `model.js`, `quiz.js` `answer` and `planPhoto`, `core.js` (photo Elo, memory, confusions,
`PROG`, `ELO`, `RVS`, `replayProgress`, `replayedOf`, `mergeProgress`, `playerStart`, `CHOICE`), `sync.js`
`replayAdopt`, `Code.gs` `stats_`, `hold_`, `replay_`, `board_`, `pctOf_`. Skimmed: `progress.js` (board, levels),
`learn.js` (look-alikes), `app.js` (`UNITS`, `fishGenera`, `rankOf`), `admin.js` / `admin-journey.js` (level and progress
shown), `analysis.js` (structure), `tips.js`. Docs: ARCHITECTURE "Learning model", "Subjects", "Analyses", "Progress
sync"; LEARNING.md headings and the sections cited. Marks: **[checked]** read in the code, with a file and line;
**[inference]** my reading, not measured. Earlier reviews were read only after my findings were written (last section).

## Verdict in one paragraph

The engine is more coherent than its size suggests. One expectation, `g + (1 − g)·σ(θ − d − fam − cf)`, feeds the genus
Elo, the global level, the logged `e`, the opening hold, the comeback and the replay. The format, the hold, the comeback
and known mix-ups all act on the question through one shift of the photo target (`photoSet(n, skip, shift, k)`). Every
game draws from `unlocked()`. `core.js` is shared by the app, the admin and the sheet. The weak joints are elsewhere:
1. **The same answer is scored twice**, live in `quiz.js` `answer` and again in `core.js` `replayProgress`. The replay
   works the photo difficulty back out of the rounded `e` that was logged.
2. **"How well the player knows a genus" has five definitions** with two different inputs (the EMA `pg` and the Elo
   θ). They can disagree on the same screen.
3. **The player has two "Elo" scores**, one from the app and one from the sheet, and the app swaps between them.
4. **`Code.gs` keeps its own copies** of engine functions it already embeds.
5. **The data path assumes one logged subject with one rank.**

The progress-bar redesign (PR #622) is the right moment to fix points 1 and 2: it touches every consumer of `pg` anyway.

## 1. Concept map

"Read by" lists the main consumers, not every one.

| Concept | Computed in | Read by | Definition(s) in use | Issues |
|---|---|---|---|---|
| **Photo difficulty** | sheet `stats_` (hierarchical Elo); `core.js` `eloReplay` (a copy, admin, tests); `model.js` `photoDiff` (shrunk to the genus offset, `PDIFF.W` 5; fish: judged ease prior) | `photoSet`, `examSet`, `answer` (`d0`), `genusDiff`, admin Photo stats | Elo rating on first sight; +0.5 when shown alone | The +0.5 is `PICKD.SINGLE` in the app but a bare `0.5` literal in `stats_` and `eloReplay` [checked]. analysis.js fits its own photo effects (GLMM). |
| **Genus difficulty** | `model.js` `genusDiff`; sheet genus offset `gd` (v31); `analysis.js` `wrightOf` | `drawW`, `shaky`, `stability`, `openPick` | (a) mean `photoDiff` over today's pool + `OPEN.CONF` × the confusion above `CONF.TRAP`; (b) `gd`; (c) GLMM genus effect | Three estimates of one quantity. (a) counts confusion twice (photo ratings already hold the misses), and (a) moves when photos are added: the issue Pierre raised for the bar (F3). |
| **Ability per genus θ** | `core.js` `abilityOf` / `eloStep` (app and replay) | photos, format, traps, `shaky`, `drawW`, `stability`, `e` | own Elo `s.th` + `levelMove` (the global level's move since) + `playerStart` (global level and first-launch prior) for a genus never answered | Not "own evidence only": Q128 (2026-11-06) asks the bar to use only the genus's own answers (F2, section 4). |
| **Global level** | app `P['~level']` (`eloStep` without `kmin`, `levelSeed`); sheet `stats_` `R` (`PLAYER0` −1, K 0.6/(1+n/40)); `core.js` `levelFit` (first-launch check); `analysis.js` player effects | app: `aimP`, `playerStart`, `levelMove`, `introOffer`, `startCheck`, header Elo; sheet `R`: leaderboard Elo, `levelMargin`, admin "Elo" | Two Elo chains with different starts and K | Two numbers both shown as "Elo" (F4). |
| **Progress (bar)** | `core.js` `pgStep`, `pgRightW`, `pgMissW`, `pgMemW`, `scoreOf`, `pctOf`; `Code.gs` `pctOf_` (a copy); `model.js` `pgWeight`, `pgObs` | ring, %, tiles, `lvStep` levels, `typedP`, `easyFirst`, `examOn` / `examReady` / `weight`, `mxKeeps`, fish C3 and scientific-genera offers, achievements, leaderboard, `syncSummary`, recalculation card, admin | EMA of answers, misses weighed by difficulty, right answers not | The EMA settles near the target rate (PR #622). It is the only per-genus signal not built on θ (F2). |
| **Knows a genus** | see F2 | | (1) `pg ≥ PROG.M` (exam entry); (2) `shaky` (Elo chance with a 1/4 floor < `OPEN.P` + aim − 0.8): Review, opening WIP limit, calibration eligibility; (3) `drawW` = 1 − σ(θ − gd)·m/(m+15); (4) `stability` from σ(θ − gd), 1 once learned; (5) `s.mx` | Five rules, two inputs. "Advanced + Review dot", or an exam started on a shaky genus, are possible by construction [inference]. |
| **Exam, learned** | `quiz.js` `answer`, `model.js` `examSet` / `examReady` / `mxKept` | levels, achievements, `stability`, `weight` | 5 hardest questions (2 typed) once `pg ≥ 0.8`; kept through one miss (`mxKeeps` = `PROG.M` × (1 − `PROG.A`)) | Entry and keep rule are written in EMA units. The "learned under BKT" guard is `typeof s.pg !== 'number'` [checked core.js:885, 2567, sync.js:192]: removing `pg` would drop every learned mark (section 4). |
| **Confusion, look-alikes** | `core.js` `confScore`, `pairConf`, `confGap`, `dataLook`; `model.js` `pooledConf`, `confOf`, `confusable`, `isLook`, `dataLooks`; `learn.js` `lookOf`, `pairs`, `classics`; `quiz.js` `duelPick`; `analysis.js` `mixMap`; `model.js` `mixClusters` | traps, `plausibleK`, `pgWeight`, `confTerm`, duels, Again, sheets, custom quiz | declared `look` (both ways) · pooled score ≥ 0.2 · personal score ≥ 0.2 · data look-alike (≥ 20 offers) · "classic" (lecture or Coral Finder text) | Mostly layered on one score, which is good. `learn.js` `lookOf` / `pairs` re-derive `isLook` from `DATA.gen` (corals only). The replay's prior has no `CONF.FORM` [checked core.js:2389]. |
| **Photo memory** | sheet `stats_` `mem`; `core.js` `MEM`, `memFam`; `model.js` `PMEM`, `famOf` | `e`, `photoSet` weights, `pgMemW`, replay | offset per bucket of `s.ps[photo]`, **per unit** | `PMEM` comes from one coral-only stats key (`reefid-photo-stats`) and is applied to fish answers [checked model.js:980; no `SUBJ_HOOKS` reset]. Memory is kept per unit, not per photo: a problem for fish ranks (F8). |
| **Comeback** | `model.js` `rustNow`, `comebackOf`, `comebackStep` (FSRS curve) | `planPhoto`, `answer` (`rT`), hold | rust from recall R; CUSUM end | Recall is taken as 1 in the replay [checked], so a comeback answer reads as a harder photo there. |
| **Opening, shaky limit** | `model.js` `openChance`, `openPace`, `openRight`, `introHold`, `noOpen`; `quiz.js` `planPhoto` (`introSince ≥ INTRO.EVERY`) | the path | seven gates (F7) | Overlapping throttles. |
| **Success target** | `core.js` `TARGET_P` 0.8, `AIM` 85→75%; `model.js` `aimP`, `aimOff` | photos, `shaky` bar, `pgMissW`, `rustOf` | target by global level | Coupled well. `TARGET_P` survives only as an offset in `shaky` and a default argument. `PROG.M` 0.8 equals the target, the EMA's resting point (PR #622). |
| **Difficulty levers** | `FORMAT` (traps, single views), `TYPED` (typed share) | `trapsFor`, `singleP`, `typedP` | traps and views from θ; typed share from `pg` | One controller, two inputs (F2). |
| **Hold, visit** | `model.js` `holdStep`; `Code.gs` `hold_` (a copy of the step); `SESSION.GAP`, `tips.js` `TIPR.GAP`, `analysis.js` `GAP`, admin `HEALTH.GAP`; `app.js` `session` (one page load) | cards, ease, relief card, tips, pulse | CUSUM; a visit = a 30-min gap, but `PULSE.SESSION` counts a page load | Four copies of the visit gap; the one-tap question uses another definition [checked quiz.js:949]. |
| **Subjects, ranks** | `core.js` `SUBJECTS`, `fishGen`; `app.js` `UNITS`, `fishGenera`, `rankOf`, `rankUnits` | everything through `GX`, `SUBJ` | units are flat; rank only in `distractors` and `typeMatch` | Genus units exist only in the app, not in core.js, the admin or the sheet (F8). |

## 2. The data flow, and where it drifts

`answer()` → `P` (localStorage) and `SYNC.log` → POST (progress JSON plus the answer rows) → sheet Answers tab →
`stats_` (photos, `gd`, `mem`, `conf`, `ras`) → `?stats=1` → device cache → the next questions. The progress JSON
goes to RAs / Progress data, which feed `board_` / `pctOf_`. The replay `replay_` runs `CORE_.replayProgress` with the
current `stats_`, the app adopts it (`replayAdopt` → `replayedOf`, base `replayBase`), and the admin shows
`replayedAll_` (v42) and the Analyses report.

| Drift point | What drifts | What reconciles it | Fragility |
|---|---|---|---|
| **Live vs replay scoring** | Two implementations: `answer` (quiz.js:383-525) and `replayProgress` (core.js:2380-2500). The replay rebuilds `d` = `th` − logit((e − 1/k)/(1 − 1/k)) from `e` rounded to 0.01, clamped at 0.995. It has no `CONF.FORM`, recall 1, every photo of a right answer counted as recognised, and no exam. | Tests (`replay.test.js`) on a device log | High: every rule change is made twice. Near `e` = 0.99 the rounding moves `d` by several tenths [inference]. |
| **Pooled stats** | The live game scores with whatever `?stats=1` the device cached. The replay uses the sheet's stats at replay time. `replayedAll_` uses today's. | Nothing; the admin shows both % | Medium: the "reference" depends on when it ran. |
| **Replay trigger** | It runs only when the app's rules version is older (`appRv < CORE_.RV`, Code.gs:367) or after a refused save (`SYNC.lg`). The core.js comment and ARCHITECTURE say "or covers fewer rows than the log has": that is the cache-reuse condition, not a trigger [checked]. | RVS bumps | Between bumps nothing reconciles. |
| **Two devices** | `mergeProgress` adds up counts but takes `pg`, `th`, `vr`, `ex`, `mx` from the device that moved (core.js:531-537). When both played a genus, one side's model updates are lost while its counts stay. | The next RVS replay | Medium, hidden. |
| **Hold** | `hold_` re-runs the CUSUM over logged `e`; the app adds unconfirmed answers. | `holdSync` | Low: the logged `e` is the app's own. |
| **Admin** | Players / Journey: replayed % beside the saved %, the sheet's `ras` as "Elo". Analyses: GLMM over the log, separate from the engine's estimates. | `withSaved` | The admin's level is not the one in the player's header (F4). |

## 3. Findings, by impact

### F1. One scorer for an answer (high)

`quiz.js` `answer` and `core.js` `replayProgress` repeat the same steps in the same order: offers, ok/ko, the mix-up,
`pg`, the genus Elo, the level, the miss on the genus given, the photos seen. The replay is called the reference, yet it
works out `d` from what was logged and drops four inputs the live game had (above). The progress redesign adds per-genus
state (information for SE); with two scorers it would be written twice again.

- **Fix.** One pure function in core.js, `scoreAnswer(P, q)`. `q` holds what the question was: the target, the genus
  given, the choices, `k`, `d0` per photo, the photos seen, `fam`, `cf`, `R`, the seconds, typed, exam, start prior.
  `answer` builds `q` and calls it; `replayProgress` builds `q` from a log row and calls it.
- **Logging.** Add `d0` and `R` to the answer row (new Answers columns at the end, rule D4) so the replay stops inverting
  `e`. Older rows keep today's inversion.
- **Forms.** Send the growth forms to the sheet with `gen_`, so the replay's prior matches the app's.
- **Cost.** Medium, 1-2 PRs: a sheet version, an RVS entry, `replay.test.js` already guards it. Do it **before** the new
  bar, not after.

### F2. One estimate of "knows this genus", the rest derived from it (high)

Today there are five rules (concept map row "Knows a genus"):
- the % and levels, the typed share, `easyFirst`, the exam entry and its keep rule read the EMA `pg`;
- Review, the opening's WIP limit and calibration eligibility read `shaky`: θ against `genusDiff`, a 1/4 guess floor, a
  bar of 0.6 moved with the aim;
- the draw reads `drawW`: the same chance, no floor, times the certainty m/(m+15);
- the comeback reads `stability`: the same chance, 1 once learned;
- learned is `s.mx`.

They can disagree:
- **Advanced + Review.** `lvStep` comes from `pg`, the Review dot from `shaky` (model.js:1182-1212). The EMA settles near
  the success rate the game holds (PR #622, point 2), while θ can sit below the genus difficulty. So a tile can read
  Advanced with an amber dot [inference: possible by construction, not measured].
- **Exam on a shaky genus.** `examOn` checks `pg ≥ 0.8`, never `shaky` (model.js:1138).
- **Two inputs for one controller.** The format reads θ (`trapsFor`, `singleP`); its third lever, typed questions,
  reads `pg` (`typedP`).

The fix is one per-genus estimate: θ_g, its own-evidence SE_g, and the genus difficulty μ_g (F3). Everything else is
derived from it:
- the bar = domain score (PR #622);
- `drawW` = 1 − bar (the chance the model does not yet know the player holds; m/(m+15) is a crude SE);
- Review = the bar's upper bound below the aim at the player's level (one rule, no `REVIEW_MIN`, no separate 0.6);
- `stability` from the same chance;
- typed share, `easyFirst` and the levels from the bar;
- exam entry = bar ≥ B_ex plus pair coverage (Q129).

**Cost:** comes with the bar. One threshold per consumer becomes one quantity, and constants go: `OPEN.P`, `PROG.*`,
`REVIEW_MIN`, `TARGET_P`.

### F3. Genus difficulty: use the sheet's offset `gd`; one photo-alone offset (medium, small cost)

`genusDiff` takes the mean `photoDiff` over today's game photos and adds `OPEN.CONF` × the confusion above the trap
level (model.js:295-306). Three problems:
1. The sheet already estimates the same quantity: `gd`, the hierarchical Elo's genus offset.
2. The confusion term counts the misses a second time, since photo ratings come from those misses.
3. The mean moves when photos are added or curated out. This is the very effect Pierre asked the bar to avoid
   (PR #622 §7).

**Fix:**
- genus difficulty = `gd` (μ_g, plus τ_g once served). Fish: the judged-ease prior that `photoDiff` already applies.
- drop the `OPEN.CONF` term, or keep it only if learnsim shows the opening order needs it (rule L11).
- define the single-view +0.5 once (`core.js`), read by `stats_`, `eloReplay` and `answer`.

**Cost:** small; `drawW`, `shaky`, `stability` and `openPick` change a little. Opening order: a game change, so Pierre
decides.

### F4. One player level, one "Elo" (medium, small cost)

- **The app** shows `P['~level'].th`: header pill, My progress fallback, achievements (progress.js:22, 362, 507).
- **The board** shows the sheet's `stats_` `R`, a second Elo chain (Code.gs:525-551, 836-849). It starts at −1, uses K
  0.6/(1+n/40), and has no answer time, no mix-up term and no start prior.
- **My progress** shows the board's value once the board has loaded, else the app's (progress.js:212): **the same
  player's Elo changes with a network reply** [checked].
- **The admin** calls `R` "the Elo players see" (admin-journey.js:581).

The earlier review of 2026-11-02 flagged the two ratings; they are still there.

**Fix:** the board reads `~level.th` from the saved progress it already opens for `pctOf_`. Keep `R` inside `stats_`
only, as the photo Elo's player term, and `levelMargin` for the admin.

**Cost:** one `Code.gs` change and a version bump. No RVS: progress does not move. The board's numbers change (Pierre
sees it).

### F5. `Code.gs` should call the engine it embeds (medium, small-medium cost)

`stats_` re-implements `core.js` `eloReplay`, with its own `guess_`, `trusted_`, `MEM`, `memBucket_`, `infoAt_`,
`PLAYER0`, `GENUS_K`, `TRUST`, `PHOTO_W`. `pctOf_` re-implements `scoreOf` / `pctOf`. `hold_` re-implements the step of
`model.js` `holdNext`, which is not in core.js at all. Tests keep them in step, but each change is made twice, and the
bar redesign would break `pctOf_` (the leaderboard %).

**Fix:**
- `stats_` maps its rows to `eloReplay`'s row shape and calls `CORE_.eloReplay`;
- the board calls `CORE_.pctOf`;
- move `holdNext` (pure) into core.js, used by `model.js` and `hold_`.

**Cost:** about 150 lines out of Code.gs. Check `stats_` time on the sheet (it is cached).

### F6. Make the replay the regular reconciliation, or freeze its inputs (medium, needs Pierre)

Between two rules versions nothing brings the live state back to the log (section 2). Two devices, offline play and
cached stats all drift until the next RVS bump. The admin's replayed % is then computed with other pooled stats than
the player's own.

**Options:**
- (a) the sheet also replays when it sees both devices answered the same genus since the base. Cheap, rare, a
  silent change to the player's numbers.
- (b) store the stats used with each replay (a `stats` stamp in the Replayed row) and replay against the stamp, so
  "replayed" means one thing.
- (c) F1's logged `d0` removes most of the dependence on pooled stats.

**Recommendation:** (c) with F1, then (b). (a) is Pierre's call (rule D6 on announced recalculations).

### F7. The opening has seven gates; one or two could go (medium, needs simulation)

A card needs all of these (`planPhoto`, quiz.js:1609-1621):
1. no first-cards batch;
2. no comeback;
3. `!noOpen()` (visit and comeback floor);
4. `introSince ≥ INTRO.EVERY` (2);
5. `!introHold()`;
6. `openPace` (≤ 3 cards per 15 answers, every recent card asked);
7. `openRight`;
8. then `openChance`.

`openPace` already waits until each recent card's genus has been asked, which takes `INTRO.GAP` (2) answers. So
`INTRO.EVERY` looks redundant [inference]. `openRight` and the hold both react to misses. LEARNING.md "One opening rule"
names one rule; the code has more.

**Fix:** learnsim with `INTRO.EVERY` and then `openRight` removed (rule L11, several seeds); drop each that changes
nothing.

**Cost:** small code; the simulation is the work; a game rule, so Pierre decides.

### F8. The data path assumes one logged subject and one rank (high for fish logging, medium now)

Fish is safe today because its answers are not logged. Logging them, or adding species, meets the following.

**Coral literals.**
- `sync.js`: `RVK` = `reefid-sync-coral-rv`; the coral reset key in `replayAdopt`; `SUBJECTS.find(x => x.log)` (one
  logged subject only).
- `Code.gs`: `startOf_` and `resetOf_` read the coral keys; `gen_` reads `data.json` only.
- `model.js` `CUSTOM.KEY` = `reefid-sync-coral-custom` (a fish custom quiz would share the coral selection) [checked].
- `core.js` `accountOf` reads coral progress.

**No subject or rank in the log.** The Answers tab has neither column. `stats_` pools photo ratings, genus offsets, memory
offsets, confusions and trust across everything. One fish photo is harder to name at genus rank than at entry rank, so
photo difficulty must be keyed by (photo, rank) or carry a rank offset [inference].

**Cross-subject leaks now.** `PMEM` (coral memory offsets) scores fish answers. `easyTrust` sums coral `PSTAT` answers
toward the fish easy-first trust (harmless: the fish judged photos already reach full trust).

**Units are flat.**
- Genus units are built in `app.js` `fishGenera`, not in `core.js` `fishGen`, so the admin and the sheet cannot see
  them.
- Photo memory `s.ps` is per unit: a photo seen as the Damselfish entry is new as `g:Chromis`.
- Nothing carries evidence between ranks: a right species answer says nothing about its genus.
- Genus units reuse coral field names with another meaning. `look` holds the sibling genera, so every sibling gets the
  declared look-alike prior 0.3 in traps and progress weights. `fam` holds a display string (`"Damselfish ·
  Pomacentridae"`), which `pooledConf` compares as a family.

**Fix**, before fish logging (ROADMAP item):
1. a subject column, and a rank column or rank in the unit id, in Answers;
2. per-subject keys through `subjKey` everywhere;
3. per-subject `?stats=1` (`stats` keyed by subject);
4. `fishGenera` moved into core.js;
5. photo memory keyed by photo per subject;
6. a `sib` field for siblings, kept apart from `look`;
7. decide whether ranks share a level or get rank offsets: one `~level` per subject with a rank offset is the
   Pelánek global + concept pattern the engine already uses.

**Cost:** medium-large; a plan PR first.

### F9. Remove the migration layers of retired models (low impact, small cost, one check first)

Rule W3 says alpha, no backward compatibility, yet the engine carries:
- `s.lv` (Easy / Medium / Hard steps) in `abilityOf` and `mergeProgress`;
- `s.L` (BKT) deletes;
- `pgOf` rebuilding `pg` from `s.h` with `PROG.OLD`;
- `levelSeed` (progress from before `~level`);
- `memRecalc` / `memRecalcAll` and `mxRecalc(…, 'bkt')` (photo-memory and BKT recalculations, now replaced by the replay,
  per core.js's own comment);
- `HOLD_WARM` (rows of 2026-11-02 only);
- `s.run`.

Dead code [checked: no caller outside model.js]: `photoBand`, `seenOf`, `misses`. A stale "weight 10" comment sits at
model.js:438.

**Check first:** read the sheet once, confirm every saved copy has `pm` and a numeric `pg` (any agent may read the sheet).
Then remove.

**Keep:** the log-row branches (`guessOf` without `|kN`, `MEM_LOGGED`, `CF_LOGGED`): old rows still exist.

**Trap:** the "learned under BKT" guard is `typeof s.pg !== 'number'`; rewrite it as an explicit marker before `pg`
changes meaning (section 4).

### F10. Close the loop between the Analyses and the engine (low-medium, small cost)

The admin fits, with a GLMM, the quantities the engine estimates online:
- genus difficulty (Wright map) against `gd`;
- each format's guess rate (`fmtFit`) against the assumed 1/k;
- player places against `~level`;
- the app's own calibration (`learn`, from logged `e`).

No view puts them side by side. One "Engine check" card would turn the report into the engine's audit (rule A5, rule
L12): `gd` against the GLMM genus effect, 1/k against the fitted guess, `~level` against the player effect. Nothing
feeds back automatically (rule L13 kept).

### F11. Doc claims that no longer hold [checked]

| Claim | Where | Code |
|---|---|---|
| `weight()` favours unseen (10), learned 0.25 | ARCHITECTURE "Which genus next" | `drawW` since 2026-11-03 |
| `weight()` raises a genus ready for its exam to 3 | ARCHITECTURE "Learned" | 1 (model.js:260) |
| The sheet replays when the stored replay covers fewer rows | core.js comment above `replayProgress`, ARCHITECTURE "Full replay" | only when `appRv < RV` |
| Opening Open all: "the draw then asks first the genera never asked (weight 10)" | model.js:438 | `drawW` 1 |
| "One opening rule" | LEARNING.md | seven gates (F7) |
| The one-tap question waits for 8 answers "of the visit" | ARCHITECTURE | answers since page load (`session.n`) |

**Fix:** a docs-only PR (rule W19).

## 4. The new progress bar: how it plugs in, what else must change

PR #622 proposes: bar_g = σ((θ̃_g − μ_g)/√(1 + 0.39 τ_g²)), with θ̃_g = θ_g − z·SE_g. SE_g comes from the genus's own
answers, μ_g is the genus offset, τ_g the pooled spread. What it needs from the rest:

1. **θ_g and "own evidence".** Today θ_g carries `levelMove` and the `playerStart` prior, both from the global level.
   Q128 says the bar uses only the genus's own answers. Two coherent readings:
   - (a) keep the game's θ_g and let the lower bound z·SE_g (own information only) carry the caution. A genus with no
     answer then has a bar near 0 whatever its prior;
   - (b) keep a second, own-only θ.
   
   **Recommend (a):** one θ, no second chain. Say so in the spec, since the point estimate still holds the prior.
2. **New state, one place.** Per genus, the Fisher information of its own answers (`si`). It has to be:
   - added to `REPLAYED`, `replayedOf` and `replayBase`;
   - merged in `mergeProgress` and `mergeUsers` (with `th`, from the device that played);
   - built by the replay.
   
   With F1 done, it is written once in `scoreAnswer`.
3. **μ_g and τ_g from the sheet.**
   - `gd` already comes with `?stats=1` (v31). τ is new: `stats_` computes it, served under a sheet version and gated
     in the app (rule D4).
   - Offline or on an old sheet: the prior (`gd` 0, a fixed τ).
   - Fish (no log): μ from the judged-ease prior, τ from the judged spread.
   - The bar then moves a little with every stats refresh. Accept it, and state it.
4. **Every consumer of `pg` moves to the bar at once:** `scoreOf`, `pctOf`, `lvStep` / `LV_AT`, `typedP` (`TYPED.at` is
   on the % scale), `easyFirst`, `examOn` / `examReady` / `weight`, `mxKeeps`, `missing()`, the fish C3 offer
   (`progPct ≥ 50`), the scientific-genera offer (entry at Advanced), achievements, `syncSummary`, the leaderboard
   (`pctOf_`, see F5), `recalcNotice`, the admin (`progOf`, `replayedAll_`, Journey).
   - PR #622 says the EMA "can stay as recent form (draw, typed share, opening hold)". But the draw and the hold do not
     read `pg` today [checked model.js:253, 728]. Once typed share moves to the bar, the EMA has **no reader left**.
   - Remove it with `PROG`, `pgRightW`, `pgMissW`, `pgMemW`, `pgWeight`, `memRecalc`, `pgOf`, rather than keep a
     second bar nobody shows.
5. **Learned marks survive the change.**
   - `memRecalc`, `replayedOf` and `replayAdopt` read a record without a numeric `pg` as "learned under BKT" and drop
     `s.mx`. Replace that test with an explicit marker before `pg` goes, or every learned mark is taken away and the
     "learned under the former model" card fires for everyone.
   - The keep rule `mxKeeps` needs a bar-unit rule, e.g. kept while the bar's upper bound stays above B_ex.
6. **F2 comes free.** `drawW` = 1 − bar, Review from the bar, `stability` from it, calibration eligibility from it,
   `shaky` for the opening from the bar. One quantity, and the screens agree.
7. **Exam entry** = bar ≥ B_ex plus pair coverage (Q129). Coverage reads `s.off`, already kept and replayed.
8. **Rules version and card.** An RVS entry with `RV_CARD` (rule D5); almost everyone's % moves, so everyone gets the
   card (rule D6). A sheet version for τ and the new replay field.
9. **Checks.**
   - Learnsim's judge (PR #624) on the bar.
   - The real-data calibration of PR #622 §5(ii), which `tools/abilityeval.js` and the Analyses can host (F10).

**Order that avoids doing work twice:** F1 (one scorer), F3 (μ = `gd`), F5 (`Code.gs` calls core), then the bar with F2.

## 5. What could go with no loss

| Item | Why it can go | Check first |
|---|---|---|
| `photoBand`, `seenOf`, `misses` (model.js) | no caller | none |
| `s.lv`, `s.L`, `s.run`, `HOLD_WARM`, `levelSeed`, `pgOf` from `s.h`, `PROG.OLD`, `memRecalc*`, `mxRecalc 'bkt'` | retired models; the replay supersedes them | sheet: every copy has `pm`, `pg` (F9) |
| `Code.gs` `stats_` body, `pctOf_`, `guess_`, `trusted_`, `memBucket_`, `infoAt_`, hold step | copies of core.js | `stats_` time (F5) |
| `OPEN.CONF` term in `genusDiff`; the pool mean | double count; use `gd` | learnsim opening order (F3) |
| `INTRO.EVERY`, maybe `openRight` | dominated by `openPace` and the hold | learnsim (F7) |
| `TARGET_P` | only an offset in `shaky` and a default argument | none |
| `REVIEW_MIN`, `OPEN.P`, `PROG.*` | replaced by the one estimate | with the bar (F2) |
| Four 30-min visit gaps | one `core.js` constant | none |
| `learn.js` `lookOf` / `pairs` vs `model.js` `isLook` / `UNITS.pairs` | one look-alike helper over `GX` | fish pages later |

## 6. Comparison with earlier reviews (read after the findings above)

The 2026-11-02 learning-algorithm review saw three per-genus knowledge signals, two global ratings, confusion counted
twice in `genusDiff` and two opening throttles:
- **Knowledge signals.** BKT went, but the EMA that replaced it is still a signal apart from θ. That review's
  recommendation, "an Elo-based mastery gate", is what PR #622 now proposes.
- **Two ratings, double-counted confusion.** Both are unchanged (F4, F3).
- **Opening throttles.** One throttle was removed, and new gates came with hotfixes (F7).

New here: the two scorers and the replay's inverse (F1), the drift points of the flow (F6), the Code.gs copies (F5), the
fish data path (F8), the migration layers (F9) and the analyses loop (F10).

## Decisions for Pierre

Recommendations, to answer in a word. Each changes what players see or the engine's structure.

1. **F1:** one scorer function, `d0` and `R` logged, before the bar. *Recommend:* yes.
2. **F3:** genus difficulty = the sheet's offset `gd`, the confusion term dropped unless learnsim needs it.
   *Recommend:* yes.
3. **F4:** the leaderboard and My progress show the app's level (`~level`), the sheet's `R` kept internal.
   *Recommend:* yes.
4. **F6:** "replayed" means one thing: (c) with F1, then (b), stats stamped. *Recommend:* yes; (a) no for now.
5. **F7:** simulate removing `INTRO.EVERY`, then `openRight`. *Recommend:* yes.
6. **F8:** a fish-logging plan PR (subject and rank in the log, per-subject stats, genus units in core.js) before fish
   answers are logged. *Recommend:* yes.
7. **Section 4.1:** the bar's caution comes from the own-answer SE on the game's θ (one θ). *Recommend:* yes.
8. **Section 4.4:** the EMA `pg` removed with the bar, not kept as "recent form". *Recommend:* yes.
