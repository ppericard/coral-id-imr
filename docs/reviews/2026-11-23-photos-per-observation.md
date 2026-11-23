# Every photo of an observation: where the fish extras go, the sea slugs' one photo, and which views identify (2026-11-23)

Status: study, read-only, docs only (Linear REE-252, its four "Next action" steps). No app code, data file, curation,
sheet or photo was changed. No photo was judged (rule P7). Nothing was asked of iNaturalist: only a local cache
already on this machine was read (rule C7). The sync sheet was read, never written (rule D1). Players are P1, P2…
(rule D2), and no named data is committed. It is after 17:30 Manila (Rule 0): the questions are in section 7 and in the
PR, and none is asked in chat.

Labels (rule W11): **[measured]** counted by a script on the files of `main` @33e72928 or on the answer log;
**[read]** read in a file, a rule or a doc; **[guess]** a judgement or an extrapolation.

## Why

Pierre, 2026-11-23 21:05 Manila (the issue): «je pense qu'il faut justement toutes les prendre … et justement voir
dans quelle mesure c'est possible de faire une identification sur différents niveaux de zoom d'une photo». On a coral
expert's remark that wide photos are not good enough to identify: «je soupçonne que c'est pas complètement vrai … une
identification à l'espèce pour des coraux, c'est quasiment impossible si on n'a pas un vrai zoom sur les corallites.
Mais une identification au genre, je pense que dans beaucoup de cas, ça peut se faire … de loin, avec une photo en
wide.» He is against preferring an observation's first photo.

## Earlier work this completes

- [2026-11-06-photo-exposure-study.md](2026-11-06-photo-exposure-study.md): coral colonies with every view are few, and
  multi-view questions bring a colony back more often. It did not split accuracy by view.
- [2026-11-21-placement-shrinkage-check.md](2026-11-21-placement-shrinkage-check.md): most answers on a coral photo
  show it beside other views (22% to 50% alone), so a photo's rating says little about the photo alone. It did not
  compare views.
- [2026-11-21-photo-diversity.md](2026-11-21-photo-diversity.md): a fish question shows one photo, so a second photo
  of one observation is no new picture to a player. It counted observations, not the extras' path.
- The REE-191 study (PR in review) leaves "the photo shown alone" as a follow-up. Section 3 below gives the figures by
  view.
- [docs/ANSWERS.md](../ANSWERS.md) Q226 and Q218 (2026-11-08): every photo of a fish observation is a candidate, its
  extra photos weigh 0.5 against the cap, and the judging pass marks the near-duplicates within an observation.
  Nothing in the ledger, the rules or Linear measured where those extras end up, or accuracy by coral view.

## 1. Summary

- **Fish: the judging pass's `keep: dup` drops the extras, as designed.** Of the 10,494 further photos of the 5,797
  multi-photo observations, 8,593 (81.9%) were judged `dup` ("adds nothing over the best: a burst, the same framing").
  The auto-sort then set 8,061 of them aside, and the other 532 stay out because a `dup` never enters play. Only 1,709
  (16.3%) are in `fish-game.json`. The cap's weighting drops nothing that was fetched, and the game build drops
  almost nothing (24 wait for the next build). [measured] This is the rubric working as written (judging/FISH.md
  "Candidates", Q218) [read]. Whether a closer or wider framing of the same fish is a `dup` or an `alt` is not written
  down: that is question (a).
- **Corals: a colony view alone identifies the genus about as well as a close-up alone, and better than the app
  expects.** 3,881 coral quiz answers from 15 players (typed answers aside). One wide view alone: 82.2% right (1,915 answers, 15 players),
  where the app expected 74.7%. That is +7.5 points (95% interval over players +6.0 to +9.1). A close-up alone:
  +7.0 points. Corallites alone: +2.4 (−3.2 to +8.1). Several views of one colony: +4.1. Wide alone beats the
  several-view questions' excess by **+3.4 points (+1.0 to +5.9)**. At a logged ability of 1.5 or more on the genus
  (10 players), wide alone is right 88.7% of the time, close-up alone 91.9%, corallites alone 90.5%. [measured]
  This supports Pierre's hypothesis at genus level for these photos. The log cannot say what players *think* they can
  do, only how they do against the app's expectation.
- **Easier photos within one observation:** fish, by the judged ease only. In 5,754 observations with 2+ judged
  photos, 48% have photos of equal ease and 15% differ by 2 points or more. The first photo is (one of) the easiest
  in 85%. Too few answers to compare photos of one observation, for fish (7 observations) and corals (5). [measured]
- **Sea slugs: 5,163 candidates on 5,162 observations,** one photo each by design (`tools/fetch_seaslugs.py`), an
  undeclared difference from the fish (rule S1) [read]. No cached iNaturalist reply holds their photo lists. Counting
  the extras takes **one batched read of 26 requests** (200 observation ids each, about half a minute at the paced
  rate) [measured]. If sea slugs are like the fish [guess], that is about 1,230 multi-photo observations and **about
  2,200 extra photos to judge**. That pass is over 100 photos and needs Pierre's OK (rule P7), with the real count from
  the read.

## 2. Fish: from candidate to game (step 1)

**Data.** `data/fish-cand.json` (34,823 candidates on 24,329 observations), `data/suggest.json` "fish" (the judging
pass's `jt`, `e`, `k` = keep), `curation.json` "fish" (Pierre's decisions and the auto-sort's log), `fish-game.json`
(25,148 photos). The photos in play are computed with `tools/fish_game.py` `in_play` and `inputs` themselves. "First"
is the first record of its observation in `data/fish-cand.json`, which follows iNaturalist's photo order [read: the
fetch appends them in order]. Each photo is given the first step that keeps it out of the game, in the order of the
pipeline. [measured]

| Photos | Count | In `fish-game.json` | Judged `dup` | Set aside for another verdict (unclear `x`, other species `k`, out of water `a`) | Not judged yet | Other (unsure, Pierre's decisions, waiting for the build) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Single-photo observations | 18,532 | 16,751 (90.4%) | 0 | 1,554 | 110 | 117 |
| Multi-photo, first photo | 5,797 | 4,546 (78.4%) | 660 | 500 | 40 | 51 |
| Multi-photo, further photos | 10,494 | 1,709 (16.3%) | 8,583 (81.8%) | 82 | 81 | 39 |

The further photos judged `dup` are 8,593 with the 10 whose judgement is unsure (counted under Other).

- **The keep verdicts in multi-photo observations** (16,167 judged): `best` 5,755, `alt` 1,159, `dup` 9,253. The
  `best` is the first photo in 4,950 observations and a further photo in 805. The `dup` share of further photos grows
  with the observation's size: 77% with 2 photos, 82% with 3, 84% with 4, 86% with 5 or 6.
- **Observations:** of the 5,797, 597 have no photo in the game, 4,236 one, and 964 two or more. In `fish-game.json`,
  968 observations hold 2+ photos, 2,027 photos in all: the 8.0% of the issue [measured].
- **The cap's weighting drops nothing fetched.** `obs_cost` (first photo 1, each further one `EXTRA_W` 0.5) only sets
  how many observations a species fetches. A sure `dup` frees its room (judging/FISH.md) [read]. Only `select` can cut
  an observation short, when the room ends inside it. A local cache of iNaturalist replies (`tools/.cache/fish_photos.json`
  of the REE-243 worktree, 8,152 observations) overlaps 1,350 candidate observations. In 1,342 of them every usable
  photo is a candidate, and 8 lack 12 photos in all [measured]. It is a sample of the refilled species, not the whole
  file.
- **The old limit of 4.** 496 candidate observations hold exactly 4 photos. Some may still be cut under `OLD_LIMIT`,
  since `--topup` runs only with a refill [read]. The cache cannot tell: it also shows 488 observations with exactly 4
  usable photos, so it may hold replies from before the limit went [guess]. `--topup` would ask them again in 3
  requests (`topup`: 200 ids a request).
- **The build:** 91 photos are in play but not yet in the file (40, 27, 24 by row), waiting for the next Candidate
  photos run. Nothing else is lost there.
- **What a further photo in play gives a player.** The draw picks one observation per question, and then one photo of
  it (`model.js` `photoSet`). An observation with 3 photos in play gets one observation's share of the draw. Once
  any of its photos is shown, the others lose the never-seen bonus (`model.js` `colonyMem`) [read]. So further photos
  add variety inside an observation the draw meets again. They do not add questions.

**Is it intended?** Yes: Pierre's 2026-11-08 decision took every photo and left the near-duplicates to the judging
pass (Q226, Q218, `tools/fetch_fish.py`'s header). The `alt` definition lists "another side, another phase or pose,
other light", not another distance or framing [read]. His words of 21:05 ask for identification "at different zoom
levels". The rubric does not say whether a closer or wider shot of the same fish is an `alt`. The 57% of `best`/`dup`
pairs with equal ease (2,987 of 5,216) look like true bursts [measured]. How many of the 8,593 `dup` photos are a
different zoom cannot be told without looking at them, which is judging (rule P7).

## 3. Corals: accuracy and time by view (step 2)

**Data and method.** The sync sheet's Answers tab, columns A to W, read through the Google Sheets connector on
2026-11-23 about 21:15 Manila. 7,676 rows, the last answer on 2026-11-22 18:36, pseudonymised at once (P1-P15). Coral
rows (Subject blank or `coral`) of the photo quiz (Mode `quiz…`, Find the X left out). The Photos column lists the
photos the player saw (the corallites hint only when opened: `quiz.js`). Each photo's view comes from `data.json`, with
Pierre's adds and moves from `curation.json` genera. 13 rows name a photo with no known view and were left out, which
leaves 3,958 rows. One photo = "that view alone". Two or more = "several views" of one colony (wide + close-up 306,
wide + close-up + corallites 277, wide + close-up for a two-level genus 247, close-up + corallites 85). Typed answers
(77) are left out of the table.

- **Expected** is the app's own expectation logged with the answer. It includes the player's ability, the photo's
  difficulty, memory, the question's format and the +0.5 a photo alone gets (`core.js` `DOM` SINGLE, `model.js`
  `PICKD`). So observed − expected is a comparison at equal ability and format.
- **Strength** is the player's ability on the genus just before the answer (the Ability column, `th`). One player's
  answers can fall in several bands.
- **Intervals:** 95% percentile bootstrap over players (2,000 draws, players resampled with all their answers;
  rule L11). Time: the median seconds of right answers, under 120 s.

| Ability on the genus | View shown | Answers | Players (10+ answers) | Right | Expected | Observed − expected (95% CI) | Median s (right) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| All | wide alone | 1,915 | 15 (14) | 82.2% | 74.7% | +7.5 (+6.0 to +9.1) | 3.6 |
| All | close-up alone | 748 | 15 (11) | 82.6% | 75.6% | +7.0 (+4.7 to +9.3) | 3.5 |
| All | corallites alone | 305 | 15 (9) | 83.3% | 80.9% | +2.4 (−3.2 to +8.1) | 3.4 |
| All | several views | 913 | 14 (13) | 80.7% | 76.6% | +4.1 (+1.4 to +6.9) | 5.0 |
| under 0.5 | wide alone | 716 | 14 (11) | 79.9% | 66.9% | +13.0 (+9.3 to +15.9) | 4.7 |
| under 0.5 | close-up alone | 284 | 13 (8) | 79.9% | 69.2% | +10.7 (+7.0 to +14.0) | 4.8 |
| under 0.5 | corallites alone | 80 | 12 (2) | 80.0% | 72.9% | +7.1 (+2.2 to +13.5) | 4.3 |
| under 0.5 | several views | 573 | 13 (12) | 80.8% | 73.6% | +7.2 (+3.5 to +10.0) | 5.8 |
| 0.5 to 1.5 | wide alone | 712 | 13 (11) | 80.1% | 74.9% | +5.1 (+2.1 to +8.1) | 3.6 |
| 0.5 to 1.5 | close-up alone | 291 | 13 (7) | 79.7% | 75.9% | +3.8 (−0.1 to +6.8) | 3.8 |
| 0.5 to 1.5 | corallites alone | 120 | 13 (4) | 79.2% | 81.1% | −1.9 (−11.4 to +7.9) | 3.4 |
| 0.5 to 1.5 | several views | 294 | 13 (7) | 78.2% | 80.5% | −2.3 (−7.1 to +4.2) | 4.2 |
| 1.5 and over | wide alone | 487 | 10 (8) | 88.7% | 85.9% | +2.8 (−3.7 to +5.4) | 2.8 |
| 1.5 and over | close-up alone | 173 | 10 (5) | 91.9% | 85.6% | +6.4 (−1.3 to +9.2) | 2.6 |
| 1.5 and over | corallites alone | 105 | 10 (3) | 90.5% | 86.9% | +3.6 (−5.2 to +10.9) | 3.1 |
| 1.5 and over | several views | 46 | 7 (3) | 95.7% | 88.5% | +7.2 (+1.7 to +11.3) | 4.2 |

**One view alone against several views** (observed − expected of the view alone, less that of several views, in the
same band; bootstrap over players) [measured]:

| Band | Wide alone | Close-up alone | Corallites alone | Players with 10+ wide-alone and 10+ several-view answers in the band: wide better |
| --- | ---: | ---: | ---: | --- |
| All | +3.4 (+1.0 to +5.9) | +2.9 (−0.5 to +5.5) | −1.8 (−7.4 to +3.8) | n/a |
| under 0.5 | +5.9 (+1.8 to +9.9) | +3.6 (+1.1 to +6.1) | 0.0 (−4.7 to +7.2) | 9 of 11 (sign test p 0.065) |
| 0.5 to 1.5 | +7.4 (+2.4 to +10.9) | +6.2 (−1.8 to +12.4) | +0.4 (−9.7 to +10.3) | 5 of 7 (p 0.45) |
| 1.5 and over | −4.3 (−12.1 to +1.5) | −0.8 (−10.2 to +4.4) | −3.6 (−13.8 to +4.4) | 1 of 3 (p 1.0) |

What it says:

- **The genus is identified from a colony view alone about as often as from a close-up alone**, in every band, and
  faster than from several views. Players at ability 1.5 or more on a genus answer a colony view alone right 88.7% of
  the time, in a median 2.8 s. That is Pierre's hypothesis at genus level, for the colony photos the game uses
  [measured].
- **The app treats one view alone as harder than it is,** for the colony and the close-up views, by about 3 to 7
  points of success over the several-view questions below ability 1.5. The single-view offset (+0.5 logit, `DOM`
  SINGLE) fits the corallites alone. For the colony and the close-up it looks too large [measured on the excess; the
  size of a better offset is not fitted here].
- **The strong band is thin for several views**: 46 answers from 7 players. Strong players are mostly shown one view
  alone (`singleP`, the calibration questions), so the comparison there cannot tell either way.

## 4. Easier photos within one observation (step 3)

- **Fish, judged ease** (no judging: the pass's recorded `e`) [measured]: 5,754 observations have 2+ judged photos.
  The range of ease within one is 0 in 2,779 (48%), 1 in 2,131 (37%), 2 in 724, 3 in 114, 4 in 6. The first photo is
  (one of) the easiest in 4,884 (85%), a further photo is easier in 870 (mean gap 0.19 point). The `best` is on
  average 0.49 point easier than its `dup`s (5,216 observations). Mean ease: `best` 2.52, `alt` 2.93, `dup` 1.95.
- **Fish, answers:** 3,513 fish quiz answers (9 players), 124 of them on photos of an observation with 2+ photos in the
  game. 7 observations have 2+ photos answered, none with 3+ answers each. The answers cannot compare photos of one
  observation yet [measured].
- **Corals:** the game holds 1,445 photos on 1,088 colonies. 853 colonies have one photo, and 37 have all three
  views. 592 photos (41%) are on a colony with 2+ photos. There is no judged ease for corals. Only 5 colonies have 2+
  photos each shown alone 3+ times, too few to compare [measured]. By view (section 3), the colony and close-up views
  are not harder alone than the corallites.

## 5. Sea slugs: what every photo would add (step 4)

- `data/seaslug-cand.json`: 5,163 candidates, 5,162 observations (one observation has two), 272 units. Every one is
  judged: `best` 5,155, 8 without a keep [measured]. `seaslug-game.json` holds 3,014 photos, one per observation. The
  fetch takes "the observation's first photo with a usable licence", citing rule P4 [read]. Rule P4 forbids two photos
  of one observation as different choices of a multi-photo format. It does not limit the photos per observation
  [read]. The difference from the fish (Q226) is not declared in one place with its reason, as rule S1 asks.
- **No cached reply:** `tools/.cache/seaslug_photos.json` exists on no worktree of this machine. The fish cache does not
  hold sea slug observations. **Cost of one batched read** (rule C7): the 5,162 observations asked again by id, 200 a
  request, as `eggs_back` and `topup` do: **26 requests**, about half a minute at one request a second, no photo
  downloaded. It would give each observation's usable photo count, so the extras are counted before any judging.
- **Estimate, if sea slugs were like the fish** [guess]: 23.8% of fish observations have 2+ candidates, with 1.81
  further photos each. That would make about 1,230 multi-photo observations and **about 2,230 extra photos to judge**.
  At the fish's keep rates, about 390 would enter play. Sea slug photographers shoot macro series, so the real count
  may be higher. The read above replaces this guess.
- **Players:** 168 sea slug answers from 2 players. Nothing about views or photos can be measured there yet.

## 6. What the figures cannot say

- **Fish:** whether the 8,593 `dup` photos are true near-duplicates or different zooms. Only a look at them can say,
  and that is judging (P7). The cache covers 1,350 of 24,329 observations. The old-limit question (496 observations at
  exactly 4) stays open until `--topup` runs.
- **Corals:** the colony views are curated photos where the growth form is visible (rule P2, `photoSet`). The figures
  are not about survey-distance wide shots like ReefCloud's. Most questions offer 2 to 4 choices, and the expectation
  covers that. They do not cover what players *think* they can do, nor the species rank (corals are played at genus
  level only). Who gets a single view is not random: strong players and calibration questions get more of them. The
  comparison against the expectation controls for ability, not for the genus or photo mix. Several bands rest on few
  players (the "Players" column). The three bands are a post-hoc cut. Nothing here is a pre-declared test.
- **Within-observation answers:** too few for any subject.
- **Sea slugs:** no measured count of extra photos before the read in section 5.

## 7. Recommendations, per subject, and the questions for Pierre

Player-facing and judging choices are Pierre's. Nothing below is decided here.

- **Fish.** Keep the pipeline. The extras are lost by a verdict, not by a bug. **Question (a):** does a closer or wider
  framing of the same fish (another zoom) count as `alt` (adds something: it stays in play), or `dup`? If `alt`, the
  rubric line changes (judging/FISH.md "Candidates"). Re-looking at the 8,593 `dup` further photos is a judging pass
  over 100 photos and needs his OK (rule P7). The cheaper first step: a sample of up to 100 of them, to measure how
  many are another zoom, before any larger pass. The run of `--topup` (3 requests) for the 496 four-photo observations
  is the integrator's call at the next refill.
- **Corals.** No change to the photos is needed: every photo of a colony is already taken (`PER_OBS` 12). The figures
  support showing the genus from a colony view alone. **Recommendation for the integrator** (a learning value, not a
  question): open an issue to refit the single-view offset per view (`DOM` SINGLE: smaller for the colony and the
  close-up, kept for the corallites) on the real log. Check it at level 2 with the replay (rules L11, L12) before any
  change. The species rank is not played for corals, so Pierre's "species needs the corallites" cannot be measured.
- **Sea slugs. Question (b):** take every photo of an observation, as the fish do (Q226), or keep one per observation
  and declare the exception with its reason (rule S1)? Either way, the 26-request read counts the extras first; that
  read is the integrator's call (rule C7). If he chooses every photo, the judging of the extras (about 2,200 [guess],
  the read gives the count) needs his OK (rule P7), with the count, before it starts.

## Reproduce

Scripts in the session's scratch directory (`ree252/`), not committed; inputs are the files of `main` @33e72928 and a
fresh pseudonymised extract of the Answers tab (columns A to W, read with the Sheets connector, never written; the
extract itself stays out of the repository). Each is run with `python3 -I`:

| Script | What it gives |
| --- | --- |
| `pseudo.py <get_values.json> answers.json` | the extract pseudonymised (P1… by first appearance, no name written) |
| `trace_fish.py <worktree> fish.json` | section 2: every fish candidate's first step out of the game, by its place in its observation (`tools/fish_game.py` `inputs` and `in_play`) |
| `xtab_fish.py fish-rows.json answers.json fish-game.json` | section 2's cross-tabs and section 4 (fish ease within observations, answers on multi-photo observations) |
| `aside_check.py <worktree> fish-rows.json` | the `best`/`alt` photos set aside are all non-sure verdicts |
| `fish_cache.py <fish_photos.json cache> data/fish-cand.json` | section 2's cache sample (usable photos against candidates) |
| `coral_views.py answers.json data.json curation.json coral.json` | section 3 (bootstrap seed 252) |
| `coral_obs.py answers.json data.json data/cand.json curation.json` | section 4, corals |
| `seaslug_counts.py <worktree> answers.json` | section 5 |
