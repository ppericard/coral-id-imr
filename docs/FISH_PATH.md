# Fish naming path: design spec

Status: design agreed with Pierre on 2026-11-03, not built. Level 1 (the 27 IMR entries) is built on this branch (docs/ARCHITECTURE.md
"Subjects", docs/LEARNING.md "Fish on the same model"). This file says what comes next: species names, common then Latin, and the IMR
shortcut. It reuses the engine as it is (Elo per unit, progress, mastery levels and exam, opening, typed share); nothing here is a coded
track: every unlock is a performance threshold or a share that rises with progress (docs/LEARNING.md "Considered and not adopted").

Origin: Pierre's own ReefRecall design (founding proposal, June 2026: "start with family names, then common names, then scientific names";
"the ultimate level would be using the scientific (latin) names at the species level"; juveniles and colour phases early, not as a late
stage), adapted to IMR on 2026-11-03.

Updated 2026-11-04 with Pierre's decisions on the first fish beta feedback: the very start (opening order, first photos), a typed common
name as half a fault, one global fish progress score, and the display schedule's thresholds (sections below, "Open questions for Pierre").
Later the same day: milestone cards, the exams to rethink, "scientific name" in player-facing text, juveniles and phases introduced with
an explanation, a half fault that cannot be gamed, a non-linear global scale, and the fish photos and admin ("Fish photos and the admin").

**Wording** (Pierre, 2026-11-04): player-facing text says **"scientific name"**, never "Latin" (more understandable). In this file "Latin"
is the design's shorthand, and internal identifiers may keep it.

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

## The very start (fish beta feedback, Pierre, 2026-11-04)

The first fish questions must be easy and readable. Two decisions, each built in its own code PR:

- **Opening order: a starter core first.** Until real answers exist to order the entries, the first entries to open are a starter core of
  easy, readable families. Pierre's ReefRecall design (which he reviewed) named four: butterflyfishes, angelfishes, damselfishes &
  anemonefishes, surgeonfishes & tangs. In IMR entries (`fish.json` `teach`): **Butterflyfish, Angelfish, Damselfish, Surgeonfish &
  Unicornfish**. Agreed as the starter order; after them the usual opening rules (common first, `cm`) take over, and once fish answers are
  logged the measured difficulty can reorder them. The order belongs in the fish data, never in a list of names in the engine (AGENTS.md
  13b, 14a).
- **The first photos are very easy**: clear light, colourful, the fish well visible in profile, an easy species. **No juveniles and no
  species with strong sexual dimorphism or colour phases (e.g. parrotfish) at the very start**: they come later (see "Juveniles and colour
  phases"). Until answers rate the photos, an annotation pass (an agent judging each fish photo on explicit criteria: light, colour, profile,
  size in frame, life stage, phase) gives each photo an initial difficulty prior; a separate code PR, with the fish photo pipeline.

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
- **Where the thresholds come from** (Pierre, 2026-11-04): the starting values are set by simulation (`tools/learnsim.js`). Later, once
  there are many fish answers, they are **computed automatically per species** from the measured difficulty of answering it with the common
  name against the Latin name (a species whose Latin name is hard moves to Latin later).
- The same display applies to the four choices and to the feedback. The feedback always shows both names.
- The species' mastery exam (Instructor) is all Latin, with at least `TYPED.exam` (2) typed Latin answers. **To be rethought** (Pierre,
  2026-11-04; open question 5).
- The display is logged (a mode suffix), so the sheet and the admin can rate the formats apart once fish answers are logged.
- **Milestones celebrated** (Pierre, 2026-11-04): two moves each get a milestone card, like the existing major achievement toasts and
  cards: (1) the move from families / IMR groups to species names (an entry's first species opening); (2) unlocking scientific names, the
  first time the schedule shows one ("You've unlocked scientific names: questions of this kind start coming"), even if only for one or two
  species at first.

## Questions and choices at the species level

- Photo, then 4 names, in the display above.
- Wrong choices get harder gradually (rule 14c), by the species' Elo: first species of other entries the player has met, then species of
  the same entry, then the same genus or IMR sub-entry; then the player's own mix-ups (confusion scores).
- How species answers feed the entries:
  - a wrong pick **inside the same entry** never counts against the entry;
  - a wrong pick in **another entry** counts against both entries and both species (rule 13);
  - a right species answer is logged on the species; the entry keeps its own questions (no double count).
- **A common name typed where Latin is asked counts as half a fault** (Pierre, 2026-11-04: the common name is easy to look up, but it is
  still not the Latin). Decided in principle, **to study before building** (open question 3). **It must not be gameable** (Pierre,
  2026-11-04): typing common names must never advance the scientific-name progress. Accepting a common name sometimes shows partial
  learning, but when the scientific name is what is tested, it must be given at some point.

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
  photo memory; the fish pre-sort's automatic decisions (`FISHCHK`) make this workable. Targets: "Fish photos and the admin".
- **Species-level look-alikes**, with the cue that tells each side apart. Only entries have `look` today. Sources: "Fish photos and the
  admin".
- **Duplicate common name**: "Twospot wrasse" is both *Halichoeres biocellatus* and *Oxycheilinus bimaculatus* (open question).
- *Nudiantennarius subteres* (circle 3) has no common name.
- The three `check` names (likely PDF slips) to settle.
- Optional: other common names (iNaturalist, FishBase) accepted when typed, never shown.
- Fish answers are not logged to the sheet yet (no subject column): no pooled photo difficulty or confusion scores for fish until they are.
  Pierre, 2026-11-04: they are logged **from the start**, as soon as curated photos enter the game.

## Fish photos and the admin (Pierre, 2026-11-04)

Decided from the admin pooling study:

- **One subject switch** in the admin for everything, with each side's to-do count on it.
- **Photos per species**: start at 8 observations per circle-1 species, 12 for the PDF's 24 most sighted, cap 20. That is enough at entry
  (family) level; at species level Pierre expects **30 to 40 photos per species** soon, so players learn the species and not the photos,
  and to cover their variability (quality, individuals, profile or front, colour, partly hidden).
- **No IMR slides or photos for fish**: iNaturalist covers every IMR family and species.
- **Colour phases as photo tags**, not as sections.
- **Photo tags, colour loss** (`cast`): not blue against green (that depends on the water and the light) but a level of colour loss:
  none / slight (other colours still visible) / strong / monochrome (only blue or green: deep water or low light).
- **Crops**: the judging pass also proposes a crop for each photo.
- **Look-alike pairs** from the data (same genus, same IMR sub-entry), from IMR, from the players' confusions, **and from reference
  sites**. The **ID cues** that tell two species apart are searched online (FishBase and other references), triaged, the most relevant
  kept, and **always sourced** (rule 2).
- **Fish answers logged to the sheet from the start**, as soon as curated photos enter the game.
- **A subject-neutral units page**: the coral admin's "Genera" page has no fish equivalent under that name; it is renamed and redesigned
  as the page of the subject's units (genera for corals, entries and species for fish), whatever is being sorted (ROADMAP).

## Juveniles and colour phases

- Early, never a late stage (Pierre's ReefRecall rule). Juvenile and phase photos (`ph`, `st`) stay in the pool at every level; the photo
  difficulty Elo puts them at the hard end by itself. The entry cards already show `phase` (5 entries).
- **But not in the first questions** (Pierre, 2026-11-04, fish beta feedback; "The very start"): no juvenile, no strong sexual dimorphism
  and no colour phase (e.g. parrotfish) while an entry is new. They come in early, not late: for example once the entry is past its first
  level (Snorkeler, so from Open Water, 50%); the point is set by simulation. Until answers rate the photos, the annotation pass's prior
  (life stage, phase) places them.
- **Introduced with an explanation** (Pierre, 2026-11-04): when a juvenile, a colour phase or a strongly dimorphic species first comes in,
  a card explains it, with photos side by side (adult and juvenile; male and female, or the phases), e.g. "Careful: this is the juvenile
  of X, it looks very different", or "this species' males and females can look very different". Possibly one per species.

## Formats and their order

1. Photo, then 4 entry names (built).
2. Typed entry name (built); "Again" and look-alike duels (built).
3. Photo, then 4 species names, in the name-display schedule.
4. Typed Latin species name (the schedule's last step and the exam).
5. **"Find the X"** (one name, 4 photos), **fish only**, slipped into the quiz like duels (a small share, spaced, never on a unit not met),
   **once the species photos are curated** (Pierre, 2026-11-03). Fish photos stay identifiable as small thumbnails; coral photos do not.

Later, not agreed yet: Matrix (4 photos matched to 4 names), photo-to-trait (needs per-photo trait tags), the 0-2 correct variant. The
coral Lab prototype of photo-to-trait, "Spot the feature" (`proto/spot.js`), stays in the Lab for now (Pierre, 2026-11-04).

## Parked

- **Timed mode** (fast classification, ReefRecall's "Safety Stop"): not for IMR, where video ID is done by pausing frame by frame, nor for
  casual learners. Kept for a possible future opening of the app to organisations that survey live on transects (Pierre, 2026-11-03).
- **Find the Critter** (tap a hidden fish in a wide reef photo): long term, no timer, needs annotated images.
- **Regional names** (local vernacular names): long term.

## My progress (fish)

Chosen by Pierre (2026-11-03) from the three mock-ups in the Lab (`#lab-fishprog`), so the page reads at every stage, from a beginner
on families only to an IMR RA with every species open:

- **One global fish progress score** (Pierre, 2026-11-04; replaces "the entry bar counts the entries only; species never enter it"): the
  headline % covers the whole path, from 0 (nothing known, nothing opened) to 100% (every species known in Latin, or nearly every one).
  Reaching 100% on fish is expected to be much harder than on corals. The fish leaderboard uses it. The per-entry bars and the "Species
  named" / "Scientific name" counters stay, as detail.
  - **The scale** (Pierre, 2026-11-04, later; replaces a 20 / 30 / 50 split proposed that morning): **non-linear, fast at the start**
    (recognising the families is already great). A player who knows every entry and every species by its common name is at about
    **75-80%**; scientific names are the real difficulty and fill the last 20-25% slowly, point by point. The stages: the circle-1 entries
    (27), their species by common name (323), the same species by scientific name; unopened units at 0; circles 2 and 3 never count (as
    now). The exact curve is set by simulation (`tools/learnsim.js` fish profiles).
  - What counts for the scientific stage (the exam passed, or the progress on the questions shown in Latin) and what "nearly every one"
    means are part of the same study.
  - **The Elo level stays alongside** as the player's overall level.
- **Default view, Slate rows (A)**: the 27 IMR entries in IMR order, each with its level bar, a thin bar of its species and the two
  counters, **"Species named: N"** (a species at Advanced) and **"Scientific name: M"** (its all-Latin exam passed; "In Latin" in the
  first mock-up, renamed per the wording rule), as detail under the global score.
- **On top, the totals and short lists of the Dashboard (B)**: species met, named and in Latin as totals, and three short lists
  (Review first, Almost there, Just met), so a player with 300 species open still sees what to do next without scrolling them all.
- **Second view, Mosaic (C)**: one square per species inside its entry, for the collection effect, picked from the view selector at the
  bottom as the coral page's views.
- Shared by all three: the card (its ring shows the global score; levels, a one-line species summary), the IMR prompt while entries or
  species are still unopened, and a drill-down per entry (review and latest first, the rest capped; species not open counted, not listed).
- **"Mystery" tiles for units not met yet** (Pierre, 2026-11-04; ROADMAP): an entry or species the player has not met shows as a masked
  tile, for everyone on fish. On corals only for beginners (the first-launch answer "I'm new to corals"); RAs who had the IMR course and
  players who know corals well see the genera as today.

## Open questions for Pierre

1. **"Twospot wrasse"**: Pierre asks IMR; until then both species keep the PDF name.
2. The display-schedule thresholds and the IMR shift. **Answered (Pierre, 2026-11-04)**: the starting values from learnsim; later,
   with many answers, computed automatically per species from the measured difficulty of answering it with the common name against the
   Latin name ("Name-display schedule").
3. A typed **common** name on a species question that asks for Latin. **Decided in principle (Pierre, 2026-11-04): it counts, as half a
   fault** (the common name is easy to look up, but it is still not the Latin); the feedback shows the Latin name. **To study before
   building**, starting values from learnsim:
   - the Elo step with a graded outcome 0.5: `core.js` `eloStep` already has the form outcome − expected, but reads `good` as a yes / no
     (`good ? 1 : 0`), so a 0.5 would count as right today; the right / miss counts (`s.ok`, `s.ko`) that size its step, the volatility
     (`s.vr`) and the response-time weight (`rtWeight`, right answers only; typed answers already at 1) need a rule for a half;
   - the progress moving average: `pgStep` has the same yes / no reading, and the weight differs for a right answer (`pgWeight`, from the
     choices) and a miss (`pgMissW`, from the photo's difficulty): which one a half takes; the record of recent results (`s.h`, `1` / `0`);
   - the expected success: what the ~80% target and the one-tap checks compare against when a question can end in a half;
   - the exam (all Latin): does a half count as a miss that restarts the exam, or only as no pass?
   - the sheet's replay: the half must be logged as such (a mark on the answer), and becomes a rules version (`RVS`) once fish answers
     are replayed.
   - **Constraint: not gameable** (Pierre, 2026-11-04): typing common names must never advance the scientific-name progress. Ideas to
     weigh, none decided: the half credit counts for the species' common-name stage but never for its scientific stage; a "now type the
     scientific name" retry on the same question; a credit that shrinks for repeated common answers on the same species.
4. Species in the leaderboard and achievements. **Leaderboard answered (Pierre, 2026-11-04)**: the global fish score ("My progress
   (fish)"). Achievements: a proposal to make, inside the existing scheme (ROADMAP "An achievement for species named in Latin").
5. **The fish exams, to be rethought** (Pierre, 2026-11-04; open, to design): an exam per species, or per entry (family)? Pierre's idea:
   a family's exam is about 20 questions on only the hard fish of that family, answered directly with the scientific name.

## Checks before release

- **learnsim fish profiles** (rule 14f-14g, 5 seeds each): a beginner diver, an IMR RA who takes the IMR prompt, an expert.
  - IMR profile with everything open: right rate stays near the target (no lasting drop below the corals' range), Latin and typed Latin
    reached sooner than on the calm path.
  - RA level-1 path not slowed: entries reach Advanced at the same pace as on level 1 alone, within the seeds' spread.
  - Calm path: species open only after Advanced; Latin-only and typed Latin follow the schedule.
- **Held-out photos**: a fixed set per species and per entry never shown in practice, for a transfer check (recognition of unseen photos at
  the start and later) and to keep the exam honest. Pierre, 2026-11-04: fish first (many photos), corals later (few photos per genus);
  ROADMAP "A held-out photo set".
- **Real-log replay** once fish answers reach the sheet (rule 14g); until then, say what was measured instead.
- Tests: `tests/draw.smoke.js` for the species draw (choices, display, IMR prompt), `tests/fish.test.js` for the data (no duplicate name
  among the choices of one question).
