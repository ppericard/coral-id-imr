# The judged ease: what scale, at what level? (REE-241)

**Status: design note, docs only,** on `origin/main` at `4c4ca76b`. From the repository's files, the REE-85 study
([2026-11-23-fish-ease-vs-answers.md](2026-11-23-fish-ease-vs-answers.md)) and #1571. No sheet read, no judging.

**The request.** Pierre, 2026-11-26 08:22–08:36 Manila, on #1571 ("the judged ease within a family only"): he doubts
this was his general intention. It looks like an exception made for one taxonomic level: «à réfléchir et justifier,
voire prendre de la hauteur et re-concevoir». Q457 («ok», 2026-11-23 17:20) stands until he says otherwise.

## 1. What the judged ease measures

A judge rates how easy one photo is "for a beginner who has just seen the family's card" (fish, judging/FISH.md
"Ease") or "the species' card" (sea slugs, judging/SEASLUG.md "Ease"). The judge compares the photo with the taxon's
reference look: pose, whole animal, light, colour, sharpness, size in the frame, one subject. A field-guide photo is 5,
"whatever the species" (FISH.md, after Pierre's decision of 2026-11-19). The rubric keeps the taxon's own difficulty
out, in so many words:

- "Judge what the photo shows, not the species" (FISH.md "How to look").
- "an easy species (that last one is the entry's order, not the photo's)" (FISH.md "Ease").
- A phase "is a species-level difficulty" (the phase flag); a buried eel is judged against its family's look (Q456).

**So the ease is a photo's distance from its taxon's reference look. It is not a difficulty of the taxon.**

| Subject | Judged ease (photos with an `e` in the game file) | Judged against | Units the game asks |
| --- | --- | --- | --- |
| Fish | 25,287, mean 2.89 | the family's card | families; genera and species at later ranks |
| Sea slugs | 5,088, mean 3.58 | the species' card | genera; species at a later rank |
| Corals | none (`data.json` holds no `e`) | — | genera |

## 2. The finding, and why

**Measured** (REE-85, 3,349 fish family questions, 9 players): within a family, −0.22 logit per ease point [−0.39,
−0.18]; across families, −0.03 [−0.15, +0.04] (Spearman −0.25, p 0.05). Genus and species rows were left out. So
"within a family" meant "among the photos of the unit asked", not a chosen rank. Below the family, nothing measured.

**The ease in the files** (`fish-game.json`, `seaslug-game.json`; `e` grouped by the file's key and by genus, the first
word of `t`; between-group share of the sum of squares):

| | Fish | Sea slugs |
| --- | --- | --- |
| Share between families (fish entries; sea slug family groups) / between genera within a family | 5.8% / 3.0% | 6.7% / 2.4% |
| Unit means, 10th to 90th percentile (fish families; sea slug genera) | 2.33–3.32 | 2.91–4.00 |
| Units with no photo at ease 4+ (fish families / fish genera; sea slug genera) | 1 of 64 / 11 of 248 | 0 of 78 |

At 0.3 logit a point, a unit's mean moves its prior by about ±0.15 logit. The fish family SD learned from answers is
0.84 logit [0.50, 1.41] (Q316 fit, 2026-11-21). The ease says little about how units differ.

- **Why nothing across units: the scale (the rubric).** Each photo is compared with its own taxon's look, so a clear
  photo of a hard family is a 5, as is one of an easy family. The rubric predicts a null between units.
- **Fish families (partly; a guess, W11).** Some families are hard whatever the photo. Lizardfishes were answered worse
  than expected: a look-alike question. That lives in the choices, which the unit's offset and confusions learn.
- **The slight reversal (guesses).** Typical-look families were judged low and answered well (Q456, measured before its
  re-cap). Later families meet more practised players. The draw aims hard photos at strong players.

**What the engine already assumes.** The sheet rates a photo as its unit's offset G plus its own residual P, with no
ease term (`Code.gs`). So G learns a unit's whole difficulty from answers, and `genusDiff` adds the mean ease prior on
top, never fading. The rated world already draws each photo's ease as a deviation around its unit (#1571).

## 3. A subject-neutral formulation (rule S1)

> **The judged ease places a photo among the photos of its own unit. It never ranks units. A unit's difficulty is
> learned from answers (its sheet offset), as every coral genus's already is.**

In the engine: a photo's prior = the unit's offset + (the mean ease of the unit's judged photos, reserve included, −
the photo's ease) × `calib.ease`. Its mean over the unit is 0, so `genusDiff` is the sheet offset alone. "The unit" is
the unit asked: `photoDiff` already swaps in the asked unit's offset for a photo shared by ranks.

| Subject | What changes against main |
| --- | --- |
| Fish | A family centres on its own photos (as #1571); a genus or species unit on its own, not the family's. |
| Sea slugs | A genus centres on its own photos (#1571: on its family). Genera open by offset and commonness. |
| Corals | Nothing: their rule already, without the optional photo term. |

`RARE.E` (4) and `core.js` `refLevel` (4–5) read the ease as an absolute bar for a photo; they stay. Not chosen: "the
comparison group the player sees", since the ease does not describe the choices.

**What #1571 becomes.** For fish families the two rules are the same, so its family tables and real-log replay carry
over. They differ where `easeTop` walks up (sea slug genera, fish genera and species): a use between units that
nothing measured. Proposal: rework #1571 to unit-centred (no `easeTop`, no family cache), not close it.

## 4. For players, the checks, the PR

**What players meet.** Fish families open as in #1571. Sea slug genera open by offset and commonness, no longer by
their photos' mean ease. Within a unit, photos come easiest first as today. Costs (guesses):

- Sea slugs, with 168 answers, open in an order that knows less until answers come.
- A poor pool starts as an average unit. 11 fish genera have no photo at ease 4+: morays, a snake eel, a stonefish
  (typical-look, where REE-85 found such photos easy), a frogfish and a stingray (not). Unmeasured below the family.

**The level question (#1571's A or B).** No centre to choose, but the level stays. Each unit's mean prior is its
offset: sea slug units start 0.17 logit harder than on main (fish 0.03 easier), as A. B adds 0.3 × (3 − the subject's
mean ease), a use of the ease across units. #1571 measured A's cost: sea slug first unit at Open Water +27 and +26
answers (beginner, casual diver), lectureRA plateau +14, true knowledge held. A guess: the pace followed the level.

**Checks (L11 level 2, since the opening order changes; L12).**

- App world: a third arm "unit" on #1571's harness (`tools/studies/ree241`), fish and sea slugs, truth unit-centred.
  Declared first: the primary (units at Open Water at 300, fish) and the sea slug level cost with its bound. 5 seeds,
  then 10 on an unclear cell.
- Rated world: its ease is already unit-centred, so a no-harm run on the fish: 10 seeds, then 20 if unclear.
- Real log: the fish family answers as #1571. Genus, species and sea slug answers are too few: the measure cannot tell.
  The independent test is #1341's gate (REE-85). `openorder.js` for sea slug genera and fish circle 3.

**PR plan.** On #1571's branch, merging `origin/main` (W18). `easeMid` reads the unit's own judged photos; `genusDiff`
drops its ease term; `easyTrust` counts answers only; #1571's docs and FISH.md "What the app does with it" follow.
`priordiff`: a unit's mean prior is its offset. REE-245's one-draw design reads this prior too: sequence the two.

## 5. Questions for Pierre

1. **At what level does the judged ease rank?**
   - (a) Within each unit only, for every subject and rank. Units come from answers.
   - (b) Within a family (#1571 as it stands). It also ranks the genera and species below a family.
   - (c) As on main. It also ranks units, families included.
   - **Recommendation: (a).** The rubric measures it and the family data show it. It names no level and follows the
     engine's split (offset + photo residual). Below the family it rests on the rubric, not answers.
2. **The level, if (a) or (b).**
   - (A) The sheet's level. Sea slug units start 0.17 logit harder; the pace cost is declared and re-run.
   - (B) Main's level, kept by a constant per subject.
   - **Recommendation: (A).** (B) uses the ease across units. This differs from the integrator's B on #1571, given
     before this note. A new breach comes back to Pierre.
