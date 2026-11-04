# Fish naming path: design spec

Status: design agreed with Pierre on 2026-11-03, not built. Level 1 (the 27 IMR entries) is built on this branch (docs/ARCHITECTURE.md
"Subjects", docs/LEARNING.md "Fish on the same model"). This file says what comes next: species names, common then Latin, and the IMR
shortcut. It reuses the engine as it is (Elo per unit, progress, mastery levels and exam, opening, typed share); nothing here is a coded
track: every unlock is a performance threshold or a share that rises with progress (docs/LEARNING.md "Considered and not adopted").

Origin: Pierre's own ReefRecall design (founding proposal, June 2026: "start with family names, then common names, then scientific names";
"the ultimate level would be using the scientific (latin) names at the species level"; juveniles and colour phases early, not as a late
stage), adapted to IMR on 2026-11-03.

## Why Latin matters here

- In EventMeasure, IMR Research Assistants tag fish with the **Latin species name** (the IMR reference PDF name), never the common name.
- Latin is harder to learn, so it comes in progressively, tied to the common name first (Pierre, 2026-11-03).
- Rule 6a still holds: the name shown and expected is the PDF name; the WoRMS name (`now`) and synonyms are accepted when typed.

## Levels

- **Level 1, entry**: the 27 IMR entries (circle 1), as built. Unchanged.
- **Level 1b, IMR sub-entry** (optional): the sub-entries IMR names inside an entry (`fish.json` `sub`): Chromis, Dascyllus, Pomacentrus,
  Anemonefish (Damselfish); Bannerfish (Butterflyfish); Surgeonfish, Unicornfish (Surgeonfish & Unicornfish).
  - Opened at once by the IMR prompt (below).
  - Otherwise an optional level, offered like the opt-in circles: a card (Add / Not now) once the parent entry reaches Advanced (80%), and
    a ⚙ On / Off row. Never counted in the progress bar.
- **Level 2, species**: the species of an entry (`teach[].species`), shown with the name-display schedule below.
- **Latin is not a separate level**: it is a question format whose share rises with each species' progress (schedule below).
- **No Latin genus level.** One entry spans up to 22 genera (Wrasse; 98 genera in circle 1) and no genus spans two entries. The genus is
  learned through the Latin species names (its first word) and the IMR sub-entries; a separate genus level would invent groupings (rule 2).
  In typed-Latin feedback, a right genus with a wrong species says "Right genus" (still a miss on the species).

## Unlock rules

- **An entry's species open when the entry reaches Advanced (80%)** (Pierre, 2026-11-03). The existing level, no new constant.
- They open **one at a time**, with the existing machinery: the `OPEN` share (new units only while few are shaky), a first-meeting card
  (`INTRO`), the opening hold (`introHold`), never the answer of the question right after its card.
- Order inside an entry: most sighted first (`fish.json` `r`: the PDF cheatsheet's 24 most sighted, then PDF order), then presence near
  Dauin.
- A species starts from its entry's ability (as `playerStart` starts a genus from the global level), so a strong player on Wrasse gets harder
  Wrasse species questions sooner.
- Species of circles 2 and 3 follow the same rule once their circle is on.

## Name-display schedule (common to Latin)

Pierre's sequence, as a difficulty that rises with the species' progress, like the typed share (`TYPED`), never as an on/off mode:

1. **Common + Latin underneath** (so the two get associated).
2. **Latin + common underneath.**
3. **Latin only.**
4. **Typed Latin.**

- Each question on a species draws its display from the species' progress `p` (`genScore`), one curve per step, straight lines between
  points as `TYPED.at` does. Proposed starting points, to tune in `tools/learnsim.js`:
  - `p` < 0.5: common + Latin underneath.
  - 0.5 to 0.8: the share of "Latin + common underneath" rises from 0 to 1.
  - 0.8 to 0.95: the share of "Latin only" rises from 0 to 1.
  - Typed Latin: the `TYPED` curve on top (none below 0.5, 30% at 0.8, 50% at 0.95).
- The same display applies to the four choices and to the feedback. The feedback always shows both names.
- The species' mastery exam (Instructor) is all Latin, with at least `TYPED.exam` (2) typed Latin answers.
- The display is logged (a mode suffix), so the sheet and the admin can rate the formats apart once fish answers are logged.

## Questions and choices at the species level

- Photo, then 4 names, in the display above.
- Wrong choices get harder gradually (rule 14c), by the species' Elo: first species of other entries the player has met, then species of
  the same entry, then the same genus or IMR sub-entry; then the player's own mix-ups (confusion scores).
- How species answers feed the entries:
  - a wrong pick **inside the same entry** never counts against the entry;
  - a wrong pick in **another entry** counts against both entries and both species (rule 13);
  - a right species answer is logged on the species; the entry keeps its own questions (no double count).

## The IMR prompt

Mirrors the corals' "I've had the IMR lecture: open all genera" (docs/LEARNING.md, `introAll`, `introOffer`). Same pattern, same places:
a tinted box with a real button on the first fish cards, and in My progress (fish) while entries or species are still unopened.

- Wording: **"Are you at IMR / following the Research Assistant programme?"**
- **Yes** opens in one go, without cards:
  - every circle-1 entry;
  - every species of those entries;
  - the IMR sub-entries;
  - **typed Latin early**: the name-display schedule shifted earlier on the progress axis (one shift, not a second schedule), so Latin
    first and typed Latin come from the first answers on a species.
- **Not now**: the calmer path above (entries, then species at Advanced, Latin later because it is hard).
- The choice is synced like the coral offer (`reefid-sync-fish-intro-offer`), shown in the admin player journey, and can be taken later
  from My progress.
- **No struggling once everything is open.** The dynamic difficulty must hold an IMR player near the usual target:
  - photo difficulty, traps and the display schedule start from the player's level (`playerStart`), not from the hardest setting;
  - the draw keeps the `OPEN` share for units never asked (new species come in as results allow, not as a wall of 300 never-asked
    species);
  - checked with a learnsim fish profile before release (Checks).

## What `fish.json` supports, and the gaps

Supported now:

- Species per entry, in rank order (`r`, `cs`); 323 species in circle-1 entries.
- PDF Latin name (`name`), WoRMS name (`now`, 28 species) and synonyms, iNaturalist id.
- English common name (`common`) for 419 of the 420 game species.
- Genus from the PDF name; IMR sub-entries with cues (`sub`).
- Presence near Dauin (`present.near`).
- Candidate photos per species (`fish-cand.json`: up to 30 observations each, life stage `st`, pre-sort phase `ph`).

Gaps before species questions ship:

- **Curated photos per species.** Level 1 runs on a stopgap of remote photos per entry. Species need their own curated set, enough to avoid
  photo memory (the corals aim at about 20 per genus); the fish pre-sort's automatic decisions (`FISHCHK`) make this workable.
- **Species-level look-alikes**, with the cue that tells each side apart. Only entries have `look` today. Seed from the genus and the IMR
  sub-entries; then confusion scores.
- **Duplicate common name**: "Twospot wrasse" is both *Halichoeres biocellatus* and *Oxycheilinus bimaculatus* (open question).
- *Nudiantennarius subteres* (circle 3) has no common name.
- The three `check` names (likely PDF slips) to settle.
- Optional: other common names (iNaturalist, FishBase) accepted when typed, never shown.
- Fish answers are not logged to the sheet yet (no subject column): no pooled photo difficulty or confusion scores for fish until they are.

## Juveniles and colour phases

- Early, never a late stage (Pierre's ReefRecall rule), but juveniles not in an entry's first questions (Pierre, 2026-11-04): until
  an entry reaches Open Water its questions show only its very easy photos, and a juvenile never is one (judged ease capped,
  `judging/FISH.md`; `model.js` `easyFirst`, a temporary bootstrap until fish answers are logged; docs/LEARNING.md "Fish: the starter
  core and judged photos"). From Open Water they are in the pool at every level.
- **Sex and colour phases are a species-level difficulty** (Pierre, 2026-11-04): an Anthias is easy to call an Anthias whatever its
  sex, a parrotfish a parrotfish (its family-level difficulty is telling it from a wrasse). At the family level the phase flag
  (`fish-photos.json` `jt` `p`, entries marked `dimorph`) caps nothing; it will matter for species questions.
- Later, explanation cards will introduce juveniles, phases and sexual dimorphism (Pierre, 2026-11-04). The entry cards already show
  `phase` (5 entries).

## Look-alikes at any rank (design, Pierre, 2026-11-04; not built)

- Fish look-alikes exist sometimes at the family level but mostly at the **species** level, including across two families: not all
  damselfish against all angelfish, but certain dwarf angelfish against certain dark damselfish. So a look-alike pair can link units
  at any rank: family to family (`look` today), and species to species, across families too.
- In a family-level question, a cross-family species pair applies **per photo**: a photo of species A makes the family of species B a
  likely trap and confusion (and its Again / duel), not the whole family pair.
- Confusions are tracked at the finest rank available: fish photos carry their species (`sp`), so even family-level answers tell
  which angelfish species get taken for damselfish. Real data will propose the species pairs; Pierre can also name them.
- **How** (agreed with Pierre, 2026-11-04): the raw record is each answer as logged (the photo, species-tagged; the unit asked; the
  unit answered), nothing aggregated at write time. Three views are derived from it:
  1. family to family (summed over the species of the asked family): drives family-wide pairs;
  2. species to family (a photo of species S of family A answered as family B): there from the first family-level games, it shows
     which species of A are taken for B and drives the per-photo cross-family traps;
  3. species to species: once species questions exist.
- Small counts: a species' confusion rate is shrunk toward its family's (pooled with a prior, as the coral pooled confusions and
  the hierarchical photo Elo already do), so a species becomes a cross-family look-alike only when its rate is clearly above its
  family's.
- Pairs inside a family (same genus, same IMR sub-entry) come later from species questions, seeded from the data (genus, `sub`).
- Candidates to define at species level, no species chosen yet (never invented): some dwarf angelfish against some dark
  damselfish; some yellow butterflyfish against some yellow rabbitfish (Pierre, 2026-11-04).
- Engine support comes with the species level and the logging of fish answers (ROADMAP).

## Formats and their order

1. Photo, then 4 entry names (built).
2. Typed entry name (built); "Again" and look-alike duels (built).
3. Photo, then 4 species names, in the name-display schedule.
4. Typed Latin species name (the schedule's last step and the exam).
5. **"Find the X"** (one name, 4 photos), **fish only**, slipped into the quiz like duels (a small share, spaced, never on a unit not met),
   **once the species photos are curated** (Pierre, 2026-11-03). Fish photos stay identifiable as small thumbnails; coral photos do not.

Later, not agreed yet: Matrix (4 photos matched to 4 names), photo-to-trait (needs per-photo trait tags), the 0-2 correct variant.

## Parked

- **Timed mode** (fast classification, ReefRecall's "Safety Stop"): not for IMR, where video ID is done by pausing frame by frame, nor for
  casual learners. Kept for a possible future opening of the app to organisations that survey live on transects (Pierre, 2026-11-03).
- **Find the Critter** (tap a hidden fish in a wide reef photo): long term, no timer, needs annotated images.
- **Regional names** (local vernacular names): long term.

## My progress (fish)

Chosen by Pierre (2026-11-03) from the three mock-ups in the Lab (`#lab-fishprog`), so the page reads at every stage, from a beginner
on families only to an IMR RA with every species open:

- **Default view, Slate rows (A)**: the 27 IMR entries in IMR order, each with its level bar, a thin bar of its species and the two
  counters, **"Species named: N"** (a species at Advanced) and **"In Latin: M"** (its all-Latin exam passed). The entry bar counts the
  entries only; species never enter it.
- **On top, the totals and short lists of the Dashboard (B)**: species met, named and in Latin as totals, and three short lists
  (Review first, Almost there, Just met), so a player with 300 species open still sees what to do next without scrolling them all.
- **Second view, Mosaic (C)**: one square per species inside its entry, for the collection effect, picked from the view selector at the
  bottom as the coral page's views.
- Shared by all three: the card (entries ring, levels, a one-line species summary), the IMR prompt while entries or species are still
  unopened, and a drill-down per entry (review and latest first, the rest capped; species not open counted, not listed).

## Open questions for Pierre

1. **"Twospot wrasse"**: Pierre asks IMR; until then both species keep the PDF name.
2. The display-schedule thresholds and the IMR shift: proposed above, set from learnsim.
3. A typed **common** name on a species question that asks for Latin: shown as "right fish, now the Latin name" and counted as a miss, or
   not counted? Recommendation: not counted either way, and the Latin name shown.
4. Species in the leaderboard and achievements (an achievement for Latin species named fits rule 14d).

## Checks before release

- **learnsim fish profiles** (rule 14f-14g, 5 seeds each): a beginner diver, an IMR RA who takes the IMR prompt, an expert.
  - IMR profile with everything open: right rate stays near the target (no lasting drop below the corals' range), Latin and typed Latin
    reached sooner than on the calm path.
  - RA level-1 path not slowed: entries reach Advanced at the same pace as on level 1 alone, within the seeds' spread.
  - Calm path: species open only after Advanced; Latin-only and typed Latin follow the schedule.
- **Held-out photos**: a fixed set per species and per entry never shown in practice, for a transfer check (recognition of unseen photos at
  the start and later) and to keep the exam honest.
- **Real-log replay** once fish answers reach the sheet (rule 14g); until then, say what was measured instead.
- Tests: `tests/draw.smoke.js` for the species draw (choices, display, IMR prompt), `tests/fish.test.js` for the data (no duplicate name
  among the choices of one question).
