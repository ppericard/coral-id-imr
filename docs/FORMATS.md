# Question formats and the fish path: ideas we adopted, and why

Status: study of 2026-11-03, adapted 2026-11-04, approved by Pierre on 2026-11-04 (morning). Updated the same day to his later decisions
(FISH_PATH): a principle that changed is marked "changed on 2026-11-04", with what replaced it.

Several choices of IMR Reef ID for fish, and a few for corals, come from Pierre's earlier fish-ID design. On 2026-11-03 that design was
read against the learning research and against this repository's standing rules (AGENTS.md). This file keeps only what IMR Reef ID adopted
or evaluated, and why. It does not describe the earlier design itself. The decisions are recorded in [FISH_PATH.md](FISH_PATH.md),
[LEARNING.md](LEARNING.md) and [ROADMAP.md](ROADMAP.md). This file gives the reasoning behind them and the research they rest on.

## 1. Path principles adopted for fish

- **Names in three steps: family, then common name, then Latin.** Pierre's own words: "start with family names, then common names, then
  scientific names"; "the ultimate level would be using the scientific (latin) names at the species level". For IMR (FISH_PATH, agreed
  2026-11-03) the steps are:
  - the IMR entry: a grouping by usage, close to a family but not always one;
  - then the species by its common name;
  - then the same species by its Latin name.

  Latin is not a separate level. It is a display whose share rises with the species' progress, the way typed questions rise. Why it
  matters at IMR: Research Assistants tag fish in EventMeasure with the Latin species name. The research agrees: training at the species
  level improves the recognition of new examples more than training at the family level (Tanaka, Curran & Sheinberg 2005).

  **Changed on 2026-11-04** (Pierre): the path is a **tree**, not a line (FISH_PATH "Levels"):
  - the trunk: the families (the IMR entries);
  - branch A: the species by common name;
  - branch B: the scientific genus names, then the species scientific names.

  The player chooses common names, scientific names or both (at the fish welcome or in ⚙); "I'm at IMR" means both, with scientific
  names early. For a player learning both, the species scientific name is still a display whose share rises with progress, as above.

- **The genus is not a prerequisite, and has no level of its own.** One IMR entry spans up to 22 genera (98 in circle 1). A genus level
  would invent groupings (rule C2). Players learn the genus through the Latin species names, whose first word it is, and through
  the sub-entries IMR itself teaches (Chromis, Dascyllus, Pomacentrus, Anemonefish, Bannerfish, Surgeonfish, Unicornfish).

  **Changed on 2026-11-04** (Pierre): branch B starts with a **scientific genus level** (e.g. a photo, then 4 genus names), harder than
  the families and different from the common names. The genera are the first word of the reference names, so no grouping is invented
  (rule C2). A right genus typed where a species' scientific name is asked is genuine partial learning, so it earns partial credit (a
  common name typed instead does not count that way). Its thresholds come from simulation.

- **Unlocks follow performance, never a fixed track.** An entry's species open when the entry reaches Advanced (80%). That level already
  exists, so no new constant is needed (rule L11). The species then open one at a time with the usual opening machinery. A strong player
  is sped up by the global level (`playerStart`); a player at IMR can open everything at once with the IMR prompt.

  **Changed on 2026-11-04** (Pierre): the IMR prompt became an answer to the fish welcome question, and the answer only sets starting
  values; it opens nothing. Opening everything comes in **two optional steps**, each one declinable:
  1. **"Danger zone"**: all the families and all the scientific genera (all the families only, for a player learning common names only);
  2. **"Super Hyper Mega Danger Zone"**: all the species at once, offered later and only if the results show the game is still too easy.

  A wall of hundreds of never-asked species at once is the pattern that made players' runs collapse, so the species never open all at
  once without that second step.

- **Juveniles and colour phases come early, never as a late stage.** They stay in the photo pool at every level, and the photo difficulty
  Elo places them by itself. Since 2026-11-04 (Pierre, fish beta feedback) they are also kept out of the very first questions on an entry
  (FISH_PATH "The very start"). **Changed later on 2026-11-04** (Pierre): sex and colour phases are species-level difficulties and are no
  longer kept back; juveniles are, except where they help learn the family early (the juvenile classes, FISH_PATH "Juveniles and colour
  phases").
- **A starter core of easy families.** The earlier design started with four easy, readable families. In IMR entries these are
  Butterflyfish, Angelfish, Damselfish and Surgeonfish & Unicornfish. They open first until real answers can order the entries (Pierre,
  2026-11-04).
- **One progress score for the whole path** (Pierre, 2026-11-04). The study had proposed separate counts per naming level. Pierre chose
  one global fish score instead, from nothing known to every species in Latin, with the entries and the species counters kept as detail
  (FISH_PATH "My progress (fish)").

  **Changed on 2026-11-04** (Pierre), for the two branches: **100% only for a player who knows both the common and the scientific names of
  every species**. Every common name and no scientific one is about **80%**; every scientific name and no common one about **85%**. The
  score is the same scale for every player, whichever names they learn, so the leaderboards stay comparable. The formula is still a
  proposal, set by simulation: non-linear per species (a credit for the common names only, a larger one for the scientific name only, the
  whole species for both, the genus a partial credit inside the scientific one), never an additive split.

- **A transfer check on photos never seen.** The true measure of learning is accuracy on photos the player has never seen, so a fixed set
  is kept out of practice. Fish come first, corals later (ROADMAP "A held-out photo set"). The mastery exam already uses photos the player
  has not seen, but not a fixed set kept apart.

Some principles were reached independently in both designs, so there was nothing to import:

- a first-meeting card for each new unit;
- a pause on new units while recall is shaky (`introHold`);
- look-alikes from the start (the traps and the duels);
- a shared start that speeds up for players who already know the material.

## 2. Formats, evaluated for IMR

Fish have one view, and a whole fish stays recognisable as a small thumbnail. Coral genera often need the close-up or corallite view, so
grids of small photos work for corals only with colony views of distinctive genera, or with tap-to-enlarge.

| #   | Format                                                        | Fits                                                                                                                       | Learning value                                                                                                                                                                           | Status for IMR                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Photo → 4 names**                                           | Both. Exists.                                                                                                              | Retrieval practice with feedback (Roediger & Karpicke 2006); difficulty adapted to keep success near 80-85% (Wilson et al. 2019; Sampayo-Vargas et al. 2013).                            | Built. It also carries the fish species questions, in the name-display schedule (FISH_PATH), and, since 2026-11-04, the scientific genus questions of branch B.                                                                                                 |
| 2   | **Photo → typed name**                                        | Both. Exists (`quiz\|t`).                                                                                                  | Recall beats recognition for later retention (Kang, McDermott & Roediger 2007); the generation effect (Slamecka & Graf 1978).                                                            | Built. To be extended to common and Latin species names; typed Latin is the last step of the schedule and part of the species exam (FISH_PATH). **Changed on 2026-11-04**: a typed common name is accepted only if it is one of the species' 1-3 curated names. |
| 3   | **Name → 4 photos ("Find the X")**                            | Fish: good (4 whole-fish thumbnails read well on a phone). Corals: weak.                                                   | Side-by-side comparison helps category learning (Kang & Pashler 2012; Kornell & Bjork 2008; Wahlheim, Dunlosky & Jacoby 2011, on bird families). It also fits our look-alike rule (rule L7). | **Built** (2026-11-14; agreed by Pierre, 2026-11-03, first of the formats, Q321): fish only, slipped into the quiz like duels, on the square tiles. Distractor photos from look-alike families first (species once they are units). |
| 3b  | **0 to 2 correct, or "None"**                                 | Both, at the hard end.                                                                                                     | Shows partial knowledge and reduces guessing (Couch, Hubbard & Brassil 2018). But "None" as the correct answer weakens the testing benefit (Odegard & Koen 2007).                        | Later, not agreed. Only at high ability, never "None" early; scoring and the Elo would need a model per option.                                                                                                                                                 |
| 4   | **Name → trait** (no photo)                                   | Fish: the entry `cues` exist. Corals: rule L14 says visual recognition beats theory.                                        | Verbal encoding of diagnostic features; on its own it transfers weakly to recognising photos, since perceptual expertise is visual (Tanaka, Curran & Sheinberg 2005).                    | Low priority, not planned.                                                                                                                                                                                                                                      |
| 5   | **Photo → trait** ("which feature is visible?")               | Corals: the Lab's "Spot the feature" (`proto/spot.js`) already does it on corallites. Fish: needs per-photo trait tags.    | Directs attention to diagnostic features, the core of perceptual learning (Kellman, Massey & Son 2010).                                                                                  | Later, not agreed. "Spot the feature" stays in the Lab for now (Pierre, 2026-11-04). Fish would first need a pass that tags the visible cues per photo.                                                                                                         |
| 6   | **Matrix** (4 photos matched to 4 names)                      | Fish: good. Corals: colony to name only, corallites too small. Memory (colony ↔ corallites) is the existing matching game. | Several comparisons per screen. The last pair is free by elimination, so each pair must be logged with its real number of choices. Little direct research on matching boards.            | Later, not agreed (FISH_PATH). Photo ↔ entry first, then photo ↔ species; would reuse the Memory code.                                                                                                                                                          |
| 7   | **Timed classification**                                      | Look-alike pairs (the Duel is the untimed form).                                                                           | Builds fluency in fast classification (Kellman's perceptual learning modules), but speed can hide misunderstanding.                                                                      | **Parked** (Pierre, 2026-11-03): not for IMR, where video ID pauses frame by frame. Mastery never depends on time (rule L1). If ever built: optional, never counted.                                                                                            |
| 8   | **Find the Critter** (tap a hidden fish in a wide reef photo) | Fish on reef shots or survey video frames. For corals, the parked ReefCloud point drills are the counterpart.              | Visual search and breaking camouflage improve with training (Chen & Hegdé 2012); close to the RAs' real work.                                                                            | Long term, no timer, needs images annotated with positions.                                                                                                                                                                                                     |
| 9   | **Regional (vernacular) names**                               | Fish.                                                                                                                      | Practical value for talking with local guides and fishers.                                                                                                                               | Long term (FISH_PATH "Parked").                                                                                                                                                                                                                                 |

## 3. Reusable ideas already in our docs

- **Mystery tiles** in My progress for units not met yet. They make the next discovery visible without opening it. For fish they apply to
  every player; for corals only to beginners (ROADMAP).
- **An achievement for species named in Latin**, folded into the existing achievement scheme rather than added as a new family of badges.
  It rewards learning, not time (rule L8) (ROADMAP). **Changed on 2026-11-04** (Pierre): about 14 general fish achievements, plus a
  separate set of harder, specific "hunt" achievements (a precise look-alike pair mastered, hard combinations, tongue-in-cheek ones),
  designed later, still never for time.
- **Species-level look-alikes**, each with the cue that tells the two sides apart, seeded from the genus and the IMR sub-entries, then
  from the confusion scores (FISH_PATH "Gaps").
- **Other common names accepted when typed, never shown** (iNaturalist, FishBase). The PDF name stays the one shown (rule S2)
  (FISH_PATH "Gaps"). **Changed on 2026-11-04** (Pierre): each species gets a curated list of **1 to 3 well-used common names**, never
  more and never a full reference list. Common-name mastery of a species needs all of them: a multiple-choice question shows one listed
  name at a time, rotating, and a typed answer is accepted only if it is a listed name. The proposed selection is the names that recur
  across public sources, at most 3, the most shared first, published as selected and corrected by Pierre in use (2026-11-08, Q313; FISH_PATH "Common names"). The reference name stays the scientific
  name shown (rule S2).
- **No two choices with the same name**: the duplicate "Twospot wrasse" is settled before species questions ship (FISH_PATH).
- **The held-out photo set** and the **starter families** (section 1).

Daily-habit and time-based mechanics are not reused: rules L1 and L8, and ROADMAP "Declined".

## References

- Chen, X., & Hegdé, J. (2012). Learning to break camouflage by learning the background. _Psychological Science_ 23.
- Couch, B. A., Hubbard, J. K., & Brassil, C. E. (2018). Multiple-true-false questions reveal the limits of the multiple-choice format
  for detecting students with incomplete understanding. _BioScience_ 68.
- Kang, S. H. K., McDermott, K. B., & Roediger, H. L. (2007). Test format and corrective feedback modify the effect of testing on
  long-term retention. _European Journal of Cognitive Psychology_ 19.
- Kang, S. H. K., & Pashler, H. (2012). Learning painting styles: spacing is advantageous when it promotes discriminative contrast.
  _Applied Cognitive Psychology_ 26.
- Kellman, P. J., Massey, C. M., & Son, J. Y. (2010). Perceptual learning modules in mathematics. _Topics in Cognitive Science_ 2.
- Kornell, N., & Bjork, R. A. (2008). Learning concepts and categories: is spacing the "enemy of induction"? _Psychological Science_ 19.
- Odegard, T. N., & Koen, J. D. (2007). "None of the above" as a correct and incorrect alternative on a multiple-choice test: implications
  for the testing effect. _Memory_ 15.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. _Psychological Science_ 17.
- Sampayo-Vargas, S., et al. (2013). The effectiveness of adaptive difficulty adjustments on students' motivation and learning in an
  educational computer game. _Computers & Education_ 69.
- Slamecka, N. J., & Graf, P. (1978). The generation effect. _JEP: Human Learning and Memory_ 4.
- Tanaka, J. W., Curran, T., & Sheinberg, D. L. (2005). The training and transfer of real-world perceptual expertise. _Psychological
  Science_ 16. Training at the species level improved the discrimination of new examples more than training at the family level.
- Wahlheim, C. N., Dunlosky, J., & Jacoby, L. L. (2011). Spacing enhances the learning of natural concepts: an investigation of mechanisms,
  metacognition, and aging. _Memory & Cognition_ 39.
- Wilson, R. C., et al. (2019). The Eighty Five Percent Rule for optimal learning. _Nature Communications_ 10.
