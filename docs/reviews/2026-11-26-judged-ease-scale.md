# The judged ease: what scale, at what level? (REE-241)

**Status: design note, docs only.** Nothing is built. Written on 2026-11-26 on `origin/main` at `4c4ca76b`, from the
repository's files and the numbers of the REE-85 study ([2026-11-23-fish-ease-vs-answers.md](2026-11-23-fish-ease-vs-answers.md))
and of #1571. No sheet read, no judging.

**The request.** Pierre, 2026-11-26 08:22–08:36 Manila, on #1571 ("the judged ease within a family only"): he doubts
this was his general intention; it looks like an exception made for one taxonomic level; «à réfléchir et justifier,
voire prendre de la hauteur et re-concevoir». Q457 («ok», 2026-11-23 17:20) stands until he says otherwise.

## 1. What the judged ease measures

A judge rates how easy one photo is "for a beginner who has just seen the family's card" (fish, judging/FISH.md
"Ease") or "the species' card" (sea slugs, judging/SEASLUG.md "Ease"). The judge compares the photo with the taxon's
reference look: pose, whole animal, light, colour, sharpness, size in the frame, one subject. A field-guide photo is 5
"whatever the species" (Pierre, 2026-11-19). The rubric keeps the taxon's own difficulty out, in so many words: "Judge
what the photo shows, not the species" (FISH.md "How to look"); "an easy species (that last one is the entry's order,
not the photo's)" (FISH.md "Ease"); a phase "is a species-level difficulty", a parrotfish against a wrasse "a
look-alike pair" (the phase flag); a buried garden eel judged against the family's usual look (Q456). **So the ease is
a photo's distance from its taxon's reference look, not a difficulty of the taxon.**

| Subject | Judged ease | Judged against | Units the game asks |
| --- | --- | --- | --- |
| Fish | 25,287 photos in play, mean 2.89 | the family's card | families; genera and species at later ranks |
| Sea slugs | 5,088 photos, mean 3.58 | the species' card | genera; species at a later rank |
| Corals | none (`data.json` holds no `e`) | — | genera |

`RARE.E` (4) and `core.js` `refLevel` (4–5) read the ease as an absolute bar for a photo. This note is about the
difficulty prior only (`model.js` `photoDiff`, `genusDiff`).

## 2. The finding, and why

**Measured** (REE-85, 3,349 fish family-rank questions, 9 players): within a family, −0.22 logit per ease point
[−0.39, −0.18]; across families, −0.03 [−0.15, +0.04], slightly reversed (Spearman −0.25, p 0.05). The 164 genus and
species rows were left out. So "within a family" meant "among the photos of the unit asked": the fish game's unit,
not a chosen rank. Below the family nothing was measured.

**The ease in the files** (`fish-game.json`, `seaslug-game.json` at `4c4ca76b`; each photo's `e` grouped by the file's
key, by genus, the first word of `t`, and by `sp`; between-group share of the sum of squares):

| | Fish | Sea slugs |
| --- | --- | --- |
| Share between families (fish entries; sea slug family groups) / between genera within a family | 5.8% / 3.0% | 6.7% / 2.4% |
| Unit means, 10th to 90th percentile (fish families; sea slug genera) | 2.33–3.32 | 2.91–4.00 |

At 0.3 logit a point, a unit's mean moves its prior by about ±0.15 logit. The fish family SD learned from answers is
0.84 logit [0.50, 1.41] (Q316 fit, 2026-11-21). The ease says little about how units differ.

**Why nothing across units.**

- **The scale (supported by the rubric).** Each photo is compared with its own taxon's look. A clear photo of a hard
  family is a 5, as is one of an easy family. A null between units is what the rubric predicts.
- **Fish families (partly; a guess, W11).** Some families are hard whatever the photo: lizardfishes were answered worse
  than expected, a look-alike question. That difficulty lives in the choices, which a photo cannot show; the unit's
  offset and the confusions learn it from answers.
- **The slight reversal (guesses).** Typical-look families judged low and answered well (Q456, measured before its
  re-cap); later families met by more practised players; the draw aiming hard photos at strong players.

**What the engine already assumes.** The sheet rates a photo as its unit's offset G plus its own residual P, with no
ease term (`tools/sync/Code.gs`, the hierarchical photo Elo), so G learns a unit's whole difficulty from answers.
`genusDiff` adds the mean ease prior on top, a term that never fades ("the old prior sat on top of it", #1571's
LEARNING.md). The rated world already draws each photo's ease as a deviation around its unit (#1571).

## 3. A subject-neutral formulation (rule S1)

> **The judged ease places a photo among the photos of its own unit. It never ranks units. A unit's difficulty is
> learned from answers (its sheet offset), as every coral genus's already is.**

In the engine: a photo's prior = the unit's offset + (the mean ease of the unit's judged photos, reserve included, −
the photo's ease) × `calib.ease`. Its mean over the unit is 0, so `genusDiff` is the sheet offset alone. "The unit" is
the unit asked, as `photoDiff` already swaps in the asked unit's offset for a photo shared by ranks.

| Subject | What changes against main |
| --- | --- |
| Fish | A family centres on its own photos (as #1571); a genus or species unit on its own, not the family's. |
| Sea slugs | A genus centres on its own photos (#1571: on its family). Genera open by offset and commonness. |
| Corals | Nothing: their rule already, without the optional photo term. |

**Not chosen:** "against the comparison group the player sees". The ease does not describe the choices; the
look-alike part is learned from answers (confusions, offsets).

**What #1571 becomes.** For fish families the two rules are the same, so its family tables and real-log replay carry
over. They differ where `easeTop` walks up (sea slug genera, fish genera and species), a between-unit use of the ease
nothing measured. Proposal: rework #1571 to unit-centred (simpler: no `easeTop`, no family cache), not close it.

## 4. For players, the checks, the PR

**What players meet.** Fish families open as in #1571. Sea slug genera open by offset and commonness, no longer by
their photos' mean ease. Within a unit, photos come easiest first as today. Cost (a guess): sea slugs, with 168
answers, open in an order that knows less until answers come. `easyTrust` would count answers only.

**The level question (#1571's A or B).** The choice of a centre goes away: each unit's own photos. The level stays:
every unit's mean prior becomes its offset, so sea slug units start about 0.17 logit harder than on main (fish 0.03
easier), as A. B adds a constant per subject, 0.3 × (3 − the subject's mean ease): "its photos were judged clearer, so
its units are easier", the use across units this note removes. #1571 measured A's cost: the sea slug beginner's and
casual diver's first unit at Open Water +27 and +26 answers, the lectureRA's plateau +14; true knowledge held in every
cell. A guess: the pace followed the app's level, not learning. The sea slug log is too small to tell.

**Checks (L11 level 2: the opening order changes; L12).** App world: a third arm "unit" on #1571's harness
(`tools/studies/ree241`), fish and sea slugs, truth built unit-centred; declared first: the primary (units at Open
Water at 300, fish) and the sea slug level cost with its bound; 5 seeds, then 10 on an unclear cell. Rated world:
already unit-centred, one 10-seed no-harm run (fish). Real log: fish family answers as #1571; genus, species and sea
slug answers too few, "the measure cannot tell"; the independent test is #1341's gate (REE-85). `openorder.js` for sea
slug genera and fish circle 3.

**PR plan.** On #1571's branch, merging `origin/main` (W18): `easeMid` reads the unit's own judged photos; `genusDiff`
drops its ease term; `easyTrust` counts answers only; `RARE`, `refLevel` unchanged. The decision record, LEARNING.md,
spec/model.md and FISH.md "What the app does with it" say the rule above. `priordiff`: a unit's mean prior is its
offset, every subject.

## 5. Questions for Pierre

1. **At what level does the judged ease rank?** (a) Within each unit only, every subject and rank; units from answers.
   (b) Within a family (#1571 as it stands): it also ranks the genera and species below a family. (c) Main: it also
   ranks units, families included. **Recommendation: (a)**: what the rubric measures and the family data show, one rule
   naming no level, and the engine's own split (offset + photo residual). Below the family it rests on the rubric, not
   on answers.
2. **The level, if (a) or (b).** (A) The sheet's level: sea slug units 0.17 logit harder, the pace cost declared and
   re-run. (B) Main's level, by a constant per subject. **Recommendation: (A)**, since (B) uses the ease across units.
   It differs from the integrator's B on #1571, given before this note; a new breach comes back to Pierre with numbers.
