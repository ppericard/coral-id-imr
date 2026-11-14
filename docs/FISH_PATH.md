# Fish naming path: design spec

Status: design agreed with Pierre on 2026-11-03; the species level not built. Level 1 is built and open to every player (Q158, #650; since #656 the book's families, the IMR entries a tag), with the scientific genus step (#526, #702), the fish sheets (#675, #677, #684), the leaderboard and achievements (#693, #694) (docs/ARCHITECTURE.md
"Subjects", docs/LEARNING.md "Fish on the same model"). This file says what comes next: species names, common then Latin, and the IMR
shortcut (since 2026-11-04 the fish welcome question and the open-all card). It reuses the engine as it is (Elo per unit, progress, mastery levels and exam, opening, typed share); nothing here is a coded
track: every unlock is a performance threshold or a share that rises with progress (docs/LEARNING.md "Considered and not adopted").

Origin: Pierre's own ReefRecall design (founding proposal, June 2026: "start with family names, then common names, then scientific names";
"the ultimate level would be using the scientific (latin) names at the species level"; juveniles and colour phases early, not as a late
stage), adapted to IMR on 2026-11-03.

Updated 2026-11-04 with Pierre's decisions on the first fish beta feedback: the very start (opening order, first photos), a typed common
name as half a fault, one global fish progress score, and the display schedule's thresholds (sections below, "Open questions for Pierre").
Later the same day: milestone cards, the exams to rethink, "scientific name" in player-facing text, juveniles and phases introduced with
an explanation, a half fault that cannot be gamed, a non-linear global scale, and the fish photos and admin ("Fish photos and the admin").

Later still (Pierre, 2026-11-04, answering the fish UX study): a scientific genus level ("Levels"), the fish welcome question, which replaces the IMR prompt's "Yes opens
everything at once" ("The fish welcome question and the IMR answer"); Fish basics; achievements; and the frame both subjects share
(subject switch, Identify, opening fish to players, the app icon, leaderboards: "Both subjects in one app"). Then (Pierre, 2026-11-04,
later): the path is a tree, not a line ("Levels"); the names a player chooses to learn ("Which names a player learns"); curated common
names ("Common names"); the open-all card in two steps; the global score's targets ("My progress (fish)"); the Fish basics shape groups
credited to their book.

**Wording** (Pierre, 2026-11-04): player-facing text says **"scientific name"**, never "Latin" (more understandable). In this file "Latin"
is the design's shorthand, and internal identifiers may keep it.

## Why Latin matters here

- In EventMeasure, IMR Research Assistants tag fish with the **Latin species name** (the IMR reference PDF name), never the common name.
- Latin is harder to learn, so it comes in progressively, tied to the common name first (Pierre, 2026-11-03).
- Rule S2 still holds: the name shown and expected is the PDF name; the WoRMS name (`now`) and synonyms are accepted when typed.

## Levels

- **Level 1, family**: since 2026-11-06 the book's families (Pierre, 13:04: "the game's units are not the IMR entries"; 28 in circle 1, `fish.json` `families`), the IMR course a tag on the families and genera it teaches (13:38); docs/reviews/2026-11-06-fish-units-plan.md. Below, "entry" reads "family" for the game.
- **Level 1b, IMR sub-entry** (optional): the sub-entries IMR names inside an entry (`fish.json` `sub`): Chromis, Dascyllus, Pomacentrus,
  Anemonefish (Damselfish); Bannerfish (Butterflyfish); Surgeonfish, Unicornfish (Surgeonfish & Unicornfish).
  - Opened with the others by the open-all card ("The fish welcome question and the IMR answer", below).
  - Otherwise an optional level, offered like the coral bonus genera: a card (Add / Not now) once the parent entry reaches Advanced (80%), and
    a ⚙ On / Off row. Never counted in the progress bar.
- **Level 2, species**: the species of an entry (`teach[].species`), shown with the name-display schedule below.
- **The path is a tree, not a line** (Pierre, 2026-11-04, later; replaces the linear "families, then common names, then genus, then
  species" wording of the same day):
  - **trunk**: the families (the IMR entries, level 1);
  - **branch A**: the species by **common name**;
  - **branch B**: the **scientific genus names**, then the **species scientific names**.
  A player goes along one branch or both, by the names they chose ("Which names a player learns").
- **Scientific genus names, the first step of branch B** (Pierre, 2026-11-04, decided in principle, to design; replaces "No Latin genus
  level" of 2026-11-03): an intermediate step before knowing every species's scientific name, e.g. a photo, then 4 genus names
  (scientific): harder than the families, different from the common names. The genera are the PDF names' first word (no grouping
  invented: rule C2); one entry spans up to 22 genera (Wrasse; 98 genera in circle 1) and no genus spans two entries.
- **Built** (2026-11-04 night, #526, merged with Pierre's yes on 2026-11-05): the genus step as an opt-in set of the fish,
  "Scientific names" (offer card once an entry is at Advanced: Open Water from 2026-11-07, Q205, back to Advanced on 2026-11-08,
  Pierre, "too early, too strong"; ⚙ row, and My progress while off: the offer never locks the setting, Pierre 2026-11-08;
  turned on by hand before any family is at Advanced, a family's genera come from its Open Water, Q240): a family's genera join the game when the family reaches Advanced and open one at a time
  (an IMR player meets the IMR course's genera without the offer from their family's Open Water: below), **families met first**
  (Pierre, 2026-11-09, Q208 A): no genus card while a family in play (one that may open now: circle 2 once open, circle 3 once
  said yes) is still not met; exempt the IMR genera of an IMR player, the set turned on by hand early (Q240) and Open all
  (docs/LEARNING.md "Fish: scientific genera"); a photo, then 4 genus names (other identification groups first, then the sibling genera of the
  same entry as traps), typed genus names from the usual typed share; the genus card shows the IMR sub-entry's cues when the genus is
  one (Chromis, Dascyllus, Pomacentrus), else its most met species; counted in the fish global score since 2026-11-08 (half a genus's bar is the scientific credit of each of its species: "My progress (fish)").
  Photos: its species' photos in play (`fish-game.json`; when built, the stopgap entry photos left 18 of the 94 genera without any).
  Its choices made without Pierre were put to him and confirmed on 2026-11-05 (#526 merged with his yes).
- **The IMR genera for an IMR player** (Pierre, 2026-11-08: "pour des gens qui sont à IMR, dans la première phase de jeu, la phase
  sur les familles, il faut déjà inclure, sans avoir besoin de leur demander, les genres ... qui sont dans la liste du cours d'IMR"):
  for a player who answered "I'm at IMR", each genus an IMR sub-entry names alone (Chromis, Dascyllus, Pomacentrus, Amphiprion,
  Heniochus, Naso) opens without the offer once its family is at Open Water, with its card (its IMR cues and slide), at the usual
  pace (Q219); of "Surgeonfish vs Unicornfish" only Naso is a genus unit, and a Naso photo asked at family level is right as
  Surgeonfishes (Q220); a photo of another genus of the family keeps the family as its answer (Q221). Every player with that
  answer, existing ones included (Pierre, 2026-11-08), and anyone who ever answered it, whatever the answer now (Q227: the
  fallback card had moved strong IMR players to "I know reef fish well"). docs/LEARNING.md "Fish: scientific genera".
- **A right genus is partial credit** (Pierre, 2026-11-04; replaces "Right genus, still a miss on the species"): when a species'
  scientific name is asked and the player types the right genus only, it is genuine partial learning (unlike a common name typed
  instead: open question 3), so it counts as partial credit. How much, and its thresholds, by simulation.
- In branch B the species scientific names then come as a question format whose share rises with each species' progress (schedule
  below, for a player learning both names; a player learning scientific names only sees them alone).

## Which names a player learns (Pierre, 2026-11-04)

- The player chooses, at the fish welcome and any time in ⚙: **common names**, **scientific names**, or **both**.
- **"I'm at IMR (Research Assistant programme)"** = both, with scientific names early (EventMeasure takes scientific names).
- **One score scale for everyone**, whatever the choice, so the leaderboards stay comparable ("My progress (fish)").

## Common names: a short curated list per species (Pierre, 2026-11-04)

- Per species, a curated list of **1 to 3 well-used common names, never more**, never a full reference list.
- **A species no reference names has none** (Pierre, 2026-11-08, Q247: "some species have no common name ... they will not take part in the common-name branch"; nudibranchs will be the same): the build and the proposal accept it with no name, none is invented (rule C2), and it simply has no common-name unit (3 near-Dauin species on 2026-11-08: *Priacanthus starnesi*, *Hazeus profusus*, *H. maculipinna*).
- **Common-name mastery of a species needs all its listed names**: a multiple-choice question shows one listed name at a time, rotating;
  free text accepts only the listed names.
- **Selection**: the names that recur across public sources (the iNaturalist default English name, the FishBase main
  English name, other public references), at most 3. **Published without his prior check** (Pierre, 2026-11-08, Q313:
  "Publie, je corrige à l'usage"): he corrects a list in use (the admin has no place for it yet: below).
- **The lists** (`tools/fish_common.json`, written by `tools/fish_common.py`, every name with its sources; `tools/build_fish.py`
  writes them into `fish.json`, species `cn`: one list per name, the name shown first, then its other spellings): the PDF name
  first (rule C1, kept as written, a likely slip flagged), then the FishBase main English name and the iNaturalist default
  English name when each is found in both references; at most 3; then **the most shared first** (in the most references, then
  the main name of the most, then the most FishBase records, then FishBase's main name before iNaturalist's, then by name).
  Spellings of one name count once (Pearl-scaled / Pearlscale angelfish; Neon damsel / damselfish), the others kept to accept
  when typed. A name two game species share is dropped from the one that does not own it; a PDF name shared stays, flagged
  (4 pairs on 2026-11-08: "Twospot wrasse", "Seagrass wrasse", Twotone / Two-tone wrasse, Blackstripe(d) cardinalfish:
  each accepted for both species, "Also used for…", Pierre, 2026-11-09, Q319). A species with no name of its own and none found in both references gets the main
  name of one (`single`: *Nudiantennarius subteres*, Deep-water frogfish; *Cryptocentrus nigrocellatus*). Pierre, 2026-11-05: no
  third rule, and a PDF slip shows FishBase's spelling, the PDF form accepted when typed. **664 game species (2026-11-08)**: 3
  with no name (Q247), 392 with 1, 248 with 2, 21 with 3 (circle 1: 271 / 180 / 20). Since every listed name is needed, more
  names make the common-name branch longer: in the score simulation (`tools/fishscore.js --names tools/fish_common.json`, retired since, on
  the 442 species of 2026-11-05) a common-names-only player reaches 80% after about 2.6 times as many answers as with one name each.
- **In the game** (`app.js`, for the species level, which asks them): `cnShow`, the listed name a multiple-choice question shows,
  the one asked least so far, the list's order on a tie (so every name comes round); `cnTypeNames`, the typed names: only the
  listed names and their recorded spellings (the usual spelling tolerance applies, `core.js` `typeMatchIn`), no other name the
  references give, no short form; a name two species list is right for each, "Also used for…" (Q319); a kind word of
  the name index (razorfish) is known, the nudge. On a genus question, a listed name typed gets the "common
  name" nudge (Q237, `typeOther`). Still to build with the species level: one common-name unit per listed name in the score
  tree (`core.js` `fishScoreTree`, today `[]` for a species with a PDF name, `null` without one, so the two `single` species
  read as nameless until then).
- **Correcting a list**: no admin page or `curation.json` key for it yet (ROADMAP row "Fish common names").

## Typed family names (fish beta QA, 2026-11-06)

- A family (IMR entry) typed is matched against its names (`core.js` `fishNames`) and, as a general rule (Pierre,
  2026-11-06: "trigger", "clown", "damsel"), each of them without "fish": as a suffix, a separate word or a plural
  ("Trigger", "Trigger fish", "Triggerfishes", "Triggers"), unless that short form is within the spelling tolerance of
  another entry's name or short form (then typing it is no answer, as before). Filefishes and Pipefishes are that close,
  so "filefishes" asks the player to check the spelling.
- A name in common use, accepted as right and corrected gently (Pierre, 2026-11-06, Q164): `often` in
  `tools/fish_source.json` (copied to `fish.json`), Clownfish on Anemonefish (in Damselfish). "clown", "clownfish" typed
  read "✓ Yes, Anemonefish (often called clownfish): it's Damselfish" (`core.js` `fishOften`, `oft`; `quiz.js`
  `typeStep`, the spelling step's one-line style).
- **One name in both numbers, a known name never a slip, a shared name all of its families** (Pierre, 2026-11-09, the
  names study's plain fixes and Q319; docs/reviews/2026-11-09-shared-common-names.md): every name is also read in the
  other number of its last word (`core.js` `typeForms`: "Grouper", "Goby", "Pipefish" are the Groupers, the Gobies, the
  Pipefishes, exactly, no spelling step; never a scientific name's, which keeps its spelling step); a name the game
  knows (the name index, below) is read as such, never as a slip of another family (anglerfish was read as the
  Angelfishes, tuskfish as the Boxfishes); a name Pierre turns off is known, the player told "“X” is a name some fish
  species go by: this question needs the family.";
  the IMR entries' scientific families the book splits (Holocentridae, Syngnathidae, Serranidae, Scorpaenidae,
  Synanceiidae, Gobiidae) name each of their families (`typeMatchIn` `shared`): right on any of them, the feedback
  saying "“Holocentridae” is also used for the Squirrelfishes."; on another family a wrong answer that counts against the
  photo's family only, no mix-up recorded, "“Serranidae” names the Groupers, the Soapfishes and the Anthias." (`quiz.js` `typeUnit`,
  `typeRead`). "Close to X and Y: which one? Check the spelling." is left for a slip between two names.
- **The name index: a family question accepts a name that designates the photo's own taxon** (Pierre, 2026-11-09,
  Q319, Q320; ~15:45 Manila, Q333: "if someone types Razorfish on a photo of a wrasse that really is a razorfish, then
  yes, it counts for the family; but you cannot type Razorfish for a wrasse that is not a razorfish"; and "we won't
  penalise someone who knows the genus's name, or even the species'; but the mistakes must be penalised"; ARCHITECTURE.md
  "The name index"). Right: a name of the family as a whole (its labels, IMR's name, its scientific names, its `aka` and
  `often`), and a name of part of it only on a photo of that part: its genus or species, scientific or common (Iniistius,
  Iniistius pavo, Peacock razorfish on a peacock razorfish), a word its own species carries (`fish.json` `vn`:
  razorfish on an *Iniistius* or a shrimpfish, toby on a *Canthigaster*), an IMR genus or sub-entry (Chromis on a
  *Chromis*, Unicornfish on a *Naso*, Clownfish on an anemonefish; `core.js` `fishGen` `scopes`). A name of part of the
  family that does not designate the photo is a mistake, counted against the photo's family only, no mix-up (no unit
  given, Q319): razorfish on a cleaner wrasse, Chromis on a *Dascyllus*, Unicornfish on an *Acanthurus* (`core.js`
  `typeFits`). A name of another family stays that family's: a wrong answer against both (rule L2). After the answer,
  one line says what the name is: "“Peacock razorfish” is one of the Wrasses.", "“Iniistius” is a genus of the Wrasses.",
  "“Razorfish” is a name of some Wrasses. It is also used for the Shrimpfishes."; on a photo it does not designate,
  "“razorfish” is a name of some Wrasses, not this one. It is also used for the Shrimpfishes."; on another family,
  "“Razorfish” names the Shrimpfishes and some Wrasses.". Pierre's exceptions in `curation.json` `fish` `names` (`off`,
  `on` and `often` give a name to the whole family: "✓ Yes, it's Shrimpfishes (often called razorfish)"); the admin page
  to edit them is still to build (ROADMAP "Fish common names").
- Other common names, accepted when typed, never shown (Pierre, 2026-11-06, Q164: all OK): `aka`: Tang (Surgeonfish & Unicornfish), Cowfish and Trunkfish (Boxfish),
  Leatherjacket (Filefish), Moray eel (Morays & ribbon eels), Stingray (Rays), Trevally (Jacks), Thresher (Thresher
  sharks).

## The photo's species after every answer (Pierre, 2026-11-07 and 2026-11-08, go 2026-11-09)

- After every answer to a family or genus question, right or wrong (typed or multiple choice, the quiz, duels, the exam),
  one short line under the verdict names the species of the photo shown: its first curated common name ("Common names"
  above) and its PDF name in italics, "This photo: Zigzag wrasse · *Halichoeres scapularis*"; a name WoRMS has changed
  adds "(now *X* in WoRMS)", as the species sheet says it (rule S2); a species with no common name (Q247), the scientific
  name alone. So players slowly meet the species names before the species level asks them.
- Never before the answer, and never a name that could be wrong: the species is the one the photo is in play for
  (`fish-game.json` `sp`, Pierre's curation applied), named to the species on iNaturalist (Research Grade, or Pierre's own:
  rule S2) or by FishBase. The corals say a photo's species the same way, only inside the genus asked and when sure
  (Research Grade or Pierre's own), else nothing more. `app.js` `photoTaxon`, `taxonLine`, `UNITS` `taxon`.

## The very start (fish beta feedback, Pierre, 2026-11-04)

The first fish questions must be easy and readable. Two decisions, each built in its own code PR:

- **Opening order: a starter core first.** Until real answers exist to order the entries, the first entries to open are a starter core of
  easy, readable families. Pierre's ReefRecall design (which he reviewed) named four: butterflyfishes, angelfishes, damselfishes &
  anemonefishes, surgeonfishes & tangs. In IMR entries (`fish.json` `teach`): **Butterflyfish, Angelfish, Damselfish, Surgeonfish &
  Unicornfish**. Agreed as the starter order; after them the usual opening rules (common first, `cm`) take over, and once fish answers are
  logged the measured difficulty can reorder them. The order belongs in the fish data, never in a list of names in the engine (rules
  S1, L6).
- **The first photos are very easy**: clear light, colourful, the fish well visible in profile, an easy species. **No juveniles and no
  species with strong sexual dimorphism or colour phases (e.g. parrotfish) at the very start**: they come later (see "Juveniles and colour
  phases"). Until answers rate the photos, an annotation pass (an agent judging each fish photo on explicit criteria: light, colour, profile,
  size in frame, life stage, phase) gives each photo an initial difficulty prior (built in #461: `judging/FISH.md`). Updated later the same
  day (Pierre): sex and colour phases are species-level difficulties and are not kept back; juveniles are, except where they help learn the family
  early (the juvenile classes); see "Juveniles and colour phases".

## Unlock rules

- **An entry's species open when the entry reaches Advanced (80%)** (Pierre, 2026-11-03). The existing level, no new constant.
- **Progressively, entry by entry, never all at once** (Pierre, 2026-11-04): species names open first only for the entries (families) the
  player already knows very well, exactly as scientific names come in species by species; there is no switch from families to species.
  When species questions, and then scientific-name questions, start being asked is the difficulty algorithm's job, following the player's
  progress.
- They open **one at a time**, with the existing machinery: the `OPEN` share (new units only while few are shaky), a first-meeting card
  (`INTRO`), the opening hold (`introHold`), never the answer of the question right after its card.
- Order inside an entry: **the most commonly met around Dauin first**, by the commonness index (`fish.json` species `cmi`; the entry's
  `species` list is in that order; "Species order: the commonness index" below). Until 2026-11-04 it was the PDF rank (`r`).
- A species starts from its entry's ability (as `playerStart` starts a genus from the global level), so a strong player on Wrasse gets harder
  Wrasse species questions sooner.
- Species of circles 2 and 3 follow the same rule once their family is open (every circle is on the path since Pierre, 2026-11-06, Q175).

## Species order: the commonness index (Pierre, 2026-11-04)

Pierre's goal: train people to identify **what they will meet underwater**, so an entry's species open in the order they are met around
Dauin; "common beats easy" for the start, real answers adjust the difficulty later. Approved after he reviewed every family's ranking on
photo cards (2026-11-04: "very coherent; the criterion isn't crazy at all"). `tools/fish_commonness.py` computes it; `tools/build_fish.py`
writes it into `fish.json` (the full build, `--near`, and `--commonness`, which re-applies it offline).

- **Three signals, strongest first**, each scaled to 0-1 within the entry (only the order inside an entry matters):
  1. **Field counts, weight 3**: standardised surveys near Dauin, `tools/fish_commonness.json` `field`, each with its citation and licence:
     the CCEF "Saving Philippine Reefs" census of 11 Siquijor MPAs (May 2025; presence per MPA, k of 11; a species of a censused family
     not recorded scores 0) and the Dauin stereo-video transects of Ferrandis 2021 (34 × 250 m², 2019-20, collected with IMR; counts,
     only its "commercially important" species, so it scores only the species it lists, in an entry where it lists 2 or more). A presence
     source scores k / the entry's best k, a count source on the log scale below; field = their mean. Spadefish and Lionfish have no
     field source (not in the census).
  2. **IMR 24 most sighted, weight 2**: `cs` 1-24 (1.0 down to 0.904), 0 for the others.
  3. **iNaturalist, weight 1**: distinct observers (Research Grade and Needs ID, wild), more abundance-like than photo counts, which
     keen photographers of a rare species inflate, in three rings: 40 km around Dauin (Dauin, Siquijor, Apo), 250 km (Negros, Cebu,
     Bohol), the Philippines (`tools/fish_commonness_inat.json`). A species with little data is shrunk toward its entry's mean, a
     local count toward the regional share, with **M = 5** pseudo-observers per step: share_PH = (o_PH + M / n) / (N_PH + M),
     share_250 = (o_250 + M share_PH) / (N_250 + M), share_40 = (o_40 + M share_250) / (N_40 + M) (N: the ring's total over the
     entry's n species). Score 1 + log10(share / the entry's top share) / 2, floored at 0 (10× fewer observers: 0.5).
- **Index** = (3 field + 2 IMR + 1 iNat) / (the weights present); order: index, then the iNaturalist share, then `r`. `cmi` = the
  index (3 decimals). With these weights an IMR-24 species stays above the others of its entry unless the field counts say otherwise.
- **Known biases** (to keep in mind when reading an order): iNaturalist favours what divers like to photograph (Pierre's review:
  unicornfish probably; boxfish, *Siganus unimaculatus*, *Aluterus scriptus* rank high there) and Dauin's muck diving (sand and night
  species); the census favours reef-slope, visible, daytime species and records presence, not abundance; the Dauin counts cover the
  fisheries species only. Pierre's review also: the blue-and-yellow fusilier may be a bit more common than shown (perhaps his own
  spotting bias); the red-tooth triggerfish rare at Dauin (very common at Puerto Galera), so its low local rank is right.
- **Rerun**: `python3 tools/fish_commonness.py --fetch` (iNaturalist, about 1 request a second: per ring `species_counts`
  calls over every entry's species, 100 taxa a call, then an observers count only for a species with 2+ observations there,
  counted together for the species with few; cached in
  `tools/.cache/`), then `python3 tools/build_fish.py --commonness`. `python3 tools/fish_commonness.py t01` prints an entry's species
  with every source's raw value. A new field source (Reef Life Survey Siquijor 2025 once published, ROADMAP) is one more record in
  `tools/fish_commonness.json`.

## Name-display schedule (common to Latin)

For a player learning both names (a player learning one kind sees only that one). Pierre's sequence, as a difficulty that rises with the species' progress, like the typed share (`TYPED`), never as an on/off mode:

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
  cards: (1) the first unlock of species names, even if it concerns only one or two entries at first (species names open entry by entry,
  "Unlock rules"); (2) the first unlock of scientific names, the first time the schedule shows one ("You've unlocked scientific names:
  questions of this kind start coming"), even if only for one or two species at first.

## Questions and choices at the species level

- Photo, then 4 names, in the display above.
- Wrong choices get harder gradually (rule L7), by the species' Elo: first species of other entries the player has met, then species of
  the same entry, then the same genus or IMR sub-entry; then the player's own mix-ups (confusion scores).
- How species answers feed the entries:
  - a wrong pick **inside the same entry** never counts against the entry;
  - a wrong pick in **another entry** counts against both entries and both species (rule L2);
  - a right species answer is logged on the species; the entry keeps its own questions (no double count).
- **A common name typed where Latin is asked counts as half a fault** (Pierre, 2026-11-04: the common name is easy to look up, but it is
  still not the Latin). Decided in principle, **to study before building** (open question 3). **It must not be gameable** (Pierre,
  2026-11-04): typing common names must never advance the scientific-name progress. Accepting a common name sometimes shows partial
  learning, but when the scientific name is what is tested, it must be given at some point.

## The fish welcome question and the IMR answer (Pierre, 2026-11-04)

Replaces the earlier "IMR prompt" (2026-11-03: a box asking "Are you at IMR / following the Research Assistant programme?" whose **Yes
opened everything at once**: every circle-1 entry, their species, the IMR sub-entries, typed Latin early). Pierre, 2026-11-04, answering
the fish UX study: the fish get a welcome question that **works exactly like the coral one** (PR #428, the first-launch question,
`core.js` `CHOICE`; docs/LEARNING.md), and the answer opens nothing.

- **Built** (2026-11-04 night, PR #538, open for Pierre's OK): the coral question's code per subject (`core.js` `SUBJECTS`
  `start`, `startKey`: `reefid-sync-fish-start`), asked on the card before the first fish question, the coral values for
  now (docs/ARCHITECTURE.md "First-launch question"). Not yet: the fish values from learnsim, the names choice, Fish basics.
- **The question**, at the player's first fish visit (as the coral one at the first visit): "How well do you know reef fish?", three
  answers, a forced choice:
  1. *I'm new to reef fish*;
  2. *I'm at IMR (Research Assistant programme)*;
  3. *I know reef fish well*.
- **The answer only sets starting values**, as for corals: the starting level and whether Fish basics is offered first (for "new").
  It never opens an entry, a species or a scientific name by itself.
- **Opening everything**: Open all on the first cards and in My progress, as the corals. The card that offered it after some 50
  answers ("A big step: open all … at once?") went for every subject on 2026-11-12 (Pierre, Q337: of the players who accepted it,
  several fell clearly in the answers after; docs/LEARNING.md "First meeting with a genus").
- Everything else of the coral question comes too: the card before the quiz for a player who skipped it, the silent inference for an
  existing fish player past 50 fish answers, the 40 / 60 checkpoints (a "lower" verdict offers **Fish basics**; the level-change cards
  **off for the fish since 2026-11-08**, Pierre: "on ne fasse pas les propositions de changement de niveau sur les poissons tant
  qu'on n'a pas mieux calibré", `UNITS` fish `startFb: false`), the back card after
  Open all, the "Had the IMR …? Open all" box on the first cards and in My progress. Its own state per subject (the coral answer stays
  the corals').
- **"I'm at IMR" brings scientific names earlier** (Pierre, 2026-11-04): both names, scientific names early ("Which names a player
  learns"); the adaptive difficulty still holds them back, since they are hard.
- **Open all in two steps** (Pierre, 2026-11-04, later; replaces Claude's one-step proposal), both always optional and declinable:
  1. **"Danger zone"**: all the families and all the scientific genera (for a player learning common names only: all the families).
  2. Later, **only if the results show it is still too easy** (e.g. a high success over all the open genera after enough answers):
     **"Super Hyper Mega Danger Zone"**, all the species at once.
  Until species exist the first step opens the entries, as today.
- **Not now**: the calmer path above (entries, then species at Advanced, scientific names later because they are hard).
- The answer and Open all are synced with the player's fish progress (as the corals': `reefid-sync-fish-intro-offer`), shown in the admin player journey; Open all can be taken any time from My progress.
- **No struggling once everything is open.** The dynamic difficulty must hold an IMR player near the usual target:
  - photo difficulty, traps and the display schedule start from the player's level (`playerStart`), not from the hardest setting;
  - the draw keeps the `OPEN` share for units never asked (new species come in as results allow, not as a wall of 300 never-asked
    species);
  - checked with a learnsim fish profile before release (Checks).

## Fish basics (Pierre, 2026-11-04)

The fish twin of Coral basics (`proto/basics.js`, Learn's first tab for corals): a few short steps on real photos, one plain sentence
each, an optional one-question check, offered first to "I'm new to reef fish" and by the 40 / 60 "lower" card.

- **Content**: the **IMR fish presentation** first (its slides on anatomy, tail shapes, markings and the identification groups), so rule C2
  holds and the IMR wording is kept (rule C1).
- **The groups are the regional identification key's** (Pierre, 2026-11-04; rule S3): for the Indo-Pacific, the index of
  the 20 identification groups of *Reef Fish Identification – Tropical Pacific* (2nd edition), which the IMR course follows. The app
  shows the key's group numbers and titles (e.g. "7. Heavy Bodies/Large Lips"; no longer the 10 IMR shape groups), only the groups that
  hold entries in the game, in the book's order; where IMR's wording differs from the book's title, the book's title is shown. Credited
  to the book (the key's `cite` and `short`, `tools/fish_source.json` `keys`). Every fish family of any circle attaches to one of its
  groups (`tools/build_fish.py` checks it).
- **Body shape first** (Pierre, 2026-11-04): identification always starts with the body shape, which is what separates the
  identification groups (the book above groups fish by body shape). The module starts with body shape and the identification
  groups, then the vocabulary.
- **The dorsal fin is not a step of its own**: it is the second screen of the "Fins" step (Pierre, 2026-11-04).
- **IMR terms kept**: "Band", with a discreet "sources differ" note; the "heart-shaped" tail, a good *Dascyllus* indicator (IMR's term).
- **Photos and figures** (Pierre, 2026-11-04): never the IMR slide photos (most are not IMR's own, likely from ID books); photos with
  known rights (Pierre's, iNaturalist), diagrams and figures our own drawings.
- **Inspiration, never citation**: a local fish ID course Pierre has may inspire the order and the explanations; it is never quoted,
  cited or named, in the app or in the repo.
- **Public online sources** (FishBase and other references) fill gaps, **always cited**, in the "Other sources" way (rule C1).
- Its words become the fish glossary (underlined in cues and feedback), as Coral basics' words are for corals. Same component and
  format as Coral basics; its photos the easiest, most reference-like ones, whoever took them (rule P1, fish).

## What `fish.json` supports, and the gaps

Supported now:

- Species per entry, in commonness order (`cmi`, "Species order: the commonness index"; `r`, `cs` kept); 469 circle-1 species in circle-1 entries (2026-11-08: every species takes its family's circle, Q214; until then the 11 Dauin species of circle-1 entries were circle 3).
- PDF Latin name (`name`), WoRMS name (`now`, 28 species) and synonyms, iNaturalist id.
- English common name (`common`) for 419 of the 420 game species.
- Genus from the PDF name; IMR sub-entries with cues (`sub`).
- Presence near Dauin (`present.near`).
- Candidate photos per species (`fish-cand.json`: up to 30 observations each, life stage `st`, pre-sort phase `ph`).

Gaps before species questions ship:

- **Curated photos per species.** Since #614 and #674 the game reads the curated and judged photos per species on R2 (the stopgap only for a unit short of them). Species need their own curated set, enough to avoid
  photo memory; the fish pre-sort's automatic decisions (`FISHCHK`) make this workable. Targets: "Fish photos and the admin".
- **Species-level look-alikes**, with the cue that tells each side apart. Only entries have `look` today. Sources: "Fish photos and the
  admin"; how the cues are taught: "How cues are taught" there.
- **Duplicate common names**: "Twospot wrasse" is both *Halichoeres biocellatus* and *Oxycheilinus bimaculatus* (open question); also "Seagrass wrasse" (*Halichoeres papilionaceus*, *Novaculoides macrolepidotus*), Twotone / Two-tone wrasse (*H. prosopeion*, *Thalassoma amblycephalum*) and Blackstripe / Blackstriped cardinalfish (*Ostorhinchus nigrofasciatus*, *Cheilodipterus nigrotaeniatus*), each the PDF's or the Dauin source's name of both: settled, right for both species (Pierre, 2026-11-09, Q319).
- The three `check` names (likely PDF slips) to settle.
- The curated common names per species (1 to 3, or none for a species no reference names: "Common names"): published in `fish.json` `cn` (Q313); the species questions use them through `app.js` `cnShow` and `cnTypeNames`; the four shared PDF names right for both species (Q319).
- Fish answers are logged to the sheet from the first answer (Pierre, 2026-11-06; sheet v60 Subject, Rank, Taxon shown, Taxon answered, Species shown: ARCHITECTURE.md "Every subject's answers, at any rank"), but nothing is computed from them yet: no pooled photo difficulty, memory offsets or confusion scores for fish (`SUBJECTS` `replay: false`); those come with a per-subject `?stats=1`.

## Fish photos and the admin (Pierre, 2026-11-04)

Decided from the admin pooling study:

- **One subject switch** in the admin for everything, with each side's to-do count on it, and subject-neutral pages (ROADMAP "Admin: one
  subject switch, subject-neutral pages").
- **Photos per species**: start at 8 observations per circle-1 species, 12 for the PDF's 24 most sighted, cap 20. That is enough at entry
  (family) level; at species level Pierre expects **30 to 40 photos per species** soon, so players learn the species and not the photos,
  and to cover their variability (quality, individuals, profile or front, colour, partly hidden). The candidate cap since 2026-11-05
  (Pierre, Q36): 30 photos for a stable species, +10 per extra phase (juvenile, intermediate, male or terminal, female), at most 60, the
  search filling each phase (ARCHITECTURE.md "Fish candidates").
- **No IMR slides or photos for fish**: iNaturalist covers every IMR family and species. Also a rights question (Pierre, 2026-11-04):
  most photos of the IMR fish presentation are not IMR's own (likely taken from ID books); plenty of photos with known rights exist.
  Diagrams and figures are our own drawings.
- **Colour phases as photo tags**, not as sections.
- **Photo tags, colour loss** (`cast`): not blue against green (that depends on the water and the light) but a level of colour loss:
  none / slight (other colours still visible) / strong / monochrome (only blue or green: deep water or low light).
- **Crops**: the judging pass also proposes a crop for each photo.
- **Look-alike pairs** from the data (same genus, same IMR sub-entry), from IMR, from the players' confusions, **and from reference
  sites**. The **ID cues** that tell two species apart are searched online (FishBase and other references), triaged, the most relevant
  kept, and **always sourced** (rule C2).
- **How cues are taught** (Pierre, 2026-11-04): cues about a family itself, and cues taught **by comparison** with another family or
  species (learning by contrast). The cue content comes from public, sourced references.
- **Fish answers logged to the sheet from the very first second** (Pierre, 2026-11-06; sheet v60), at whatever rank was asked, with the species shown.

## Juveniles and colour phases

- Early, never a late stage (Pierre's ReefRecall rule). The easy photos come first: until 2026-11-06 an entry's questions showed only its very easy photos
  before Open Water (`model.js` `easyFirst`); since then (Pierre: "NO WALL", #660) the judged ease is only the photo's prior and the
  draw strongly favours the easy, reference-like photos at the start (docs/LEARNING.md "Fish: the starter core and judged
  photos"). A juvenile is one only where its entry or genus shows its juveniles early (the juvenile classes, below); elsewhere its judged
  ease is capped. No level gates them any more: a juvenile is in the pool from the start, its capped ease keeping it rare early in the draw; the staged path for juveniles, colour phases and dimorphism is a ROADMAP row (Pierre, 2026-11-07).
- **Juvenile classes** (2026-11-04, a research note with sources, classes and rules approved by Pierre; `fish.json` `juv`, from
  `tools/fish_source.json`, per entry and per genus or species for mixed entries; judging/FISH.md):
  - **Class A** (juveniles distinctive and recognisable: they help learn the family early): Spadefish (very tall fins:
    greatly elongated dorsal and anal fins; and, Pierre's observation, they look much bigger than they are: very long fins on
    a tiny body, the body growing while the overall height hardly changes), Sweetlips (head-down, wriggling swimming with
    exaggerated fin movements, bold creamy blotches), Boxfish (*Ostracion cubicus*: bright yellow with black spots, the same
    box shape). Pierre is a source for Spadefish and Sweetlips too.
  - **Show-early genera or species** of the mixed entries: *Dascyllus* (Damselfish), *Pomacanthus* (Angelfish), *Macolor*
    (Snapper), *Coris gaimard* and *Novaculichthys* (Wrasse), *Arothron stellatus* (Pufferfish).
  - **Class B** (nondescript, confusing, or resembling another family: taught later, with their explanation card): Parrotfish,
    Emperor; and the look-alike juveniles of mixed entries: *Acanthurus pyroferus* (resembles *Centropyge* pygmy angelfish),
    *Scolopsis bilineata* (resembles a fangblenny), *Plectropomus laevis* (resembles a toby), *Halichoeres* and *Thalassoma*
    (alike across species).
  - **Class C** (broadly like the adults) and **no source found** (Fusilier, Triggerfish, Soldierfish, Cardinalfish,
    Squirrelfish, Lizardfish, Sandperch: to ask an IMR trainer): the cap stays, provisionally.
  - Mimicry is a hypothesis in every case: written as "resembles" or "has been suggested", never as a fact (Pierre).
- The B and look-alike juveniles get their explanation card when they come in (below); the provisional caps go with the bootstrap.
- **Sex and colour phases are a species-level difficulty** (Pierre, 2026-11-04): an Anthias is easy to call an Anthias whatever its
  sex, a parrotfish a parrotfish (its family-level difficulty is telling it from a wrasse). At the family level the phase flag
  (`fish-photos.json` `jt` `p`, entries marked `dimorph`) caps nothing; it will matter for species questions.
- Supersedes the "not in the first questions" line of 2026-11-04 morning for phases and dimorphism (Pierre, later the same day): they
  are species-level difficulties, kept back no longer.
- **Introduced with an explanation** (Pierre, 2026-11-04): when a juvenile, a colour phase or a strongly dimorphic species first comes in,
  a card explains it, with photos side by side (adult and juvenile; male and female, or the phases), e.g. "Careful: this is the juvenile
  of X, it looks very different", or "this species' males and females can look very different". Possibly one per species.

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
- **Declared family groups** (Pierre, 2026-11-06, from experience; `tools/fish_source.json` `look`, ARCHITECTURE.md "Fish
  content"): Butterflyfishes ↔ Angelfishes; Snappers ↔ Coral Breams ↔ Emperors; Parrotfishes ↔ Wrasses (some wrasse
  species only: at species level the pair will hold only for those); Soldierfishes ↔ Squirrelfishes ↔ Cardinalfishes;
  Triggerfishes ↔ Filefishes. The seeds of the traps and the confusion groups until pooled fish answers exist.
- Candidates to define at species level, no species chosen yet (never invented): some dwarf angelfish against some dark
  damselfish; some yellow butterflyfish against some yellow rabbitfish (Pierre, 2026-11-04).
- Engine support comes with the species level and the logging of fish answers (ROADMAP).

## Formats and their order

The study behind these formats, and which ideas were adopted and why: [FORMATS.md](FORMATS.md).

1. Photo, then 4 entry names (built).
2. Typed entry name (built); "Again" and look-alike duels (built).
3. Photo, then 4 species names, in the name-display schedule.
4. Typed Latin species name (the schedule's last step and the exam).
5. **"Find the X"** (one name, 4 photos), **fish only**, slipped into the quiz like duels (a small share, spaced, never on a unit not met),
   **once the species photos are curated** (Pierre, 2026-11-03). Fish photos stay identifiable as small thumbnails; coral photos do not.
   **Built** (2026-11-14, Q321 D1) on the families, with the square tiles: 5% of the questions that could be one (`quiz.js` `FIND`,
   `planFind`), logged `quiz|f` (docs/LEARNING.md "Find the X slipped into the fish quiz"); the species once they are units.

Then (Pierre, 2026-11-09, Q321): Matrix (4 photos, 5 names), a separate fish game, families before species, after Find the X;
both show the square fish tiles (`judging/FISH.md` "The fish's box"). Later, not agreed yet: photo-to-trait (needs per-photo
trait tags), the 0-2 correct variant. The
coral Lab prototype of photo-to-trait, "Spot the feature" (`proto/spot.js`), stays in the Lab for now (Pierre, 2026-11-04).

## Parked

- **Timed mode** (fast classification, ReefRecall's "Safety Stop"): not for IMR, where video ID is done by pausing frame by frame, nor for
  casual learners. Kept for a possible future opening of the app to organisations that survey live on transects (Pierre, 2026-11-03).
- **Find the Critter** (tap a hidden fish in a wide reef photo): long term, no timer, needs annotated images.
- **Regional names** (local vernacular names): long term.

## My progress (fish)

Chosen by Pierre (2026-11-03) from the three mock-ups in the Lab (`#tools/fishprog`), so the page reads at every stage, from a beginner
on families only to an IMR RA with every species open:

- **One global fish progress score** (Pierre, 2026-11-04; replaces "the entry bar counts the entries only; species never enter it"): the
  headline % covers the whole path, from 0 (nothing known, nothing opened) to 100%.
  Reaching 100% on fish is expected to be much harder than on corals. The fish leaderboard uses it. The per-entry bars and the "Species
  named" / "Scientific name" counters stay, as detail.
  - **The scale** (Pierre, 2026-11-04, latest; replaces the 80 / 20 split of earlier that day, itself replacing a 20 / 30 / 50 split of
    the morning): **100% only for a player who masters both the common and the scientific names of every species** (the "fish god").
    Targets: every common name of every species and no scientific name ≈ **80%**; every scientific name and no common name ≈ **85%**.
  - **The formula** (proposed and approved by Pierre, 2026-11-04). Three layers, all from the progress engine's per-unit mastery
    (0 to 1, the same weighted moving average as corals):
    1. **Units**: each entry (family); each scientific genus; each species by scientific name; each listed common name (1 to 3 per
       species, "Common names"). A species' common-name mastery *C* is the mean of its listed names, so all of them are needed to reach 1.
    2. **Per species**: its scientific value is *S* = max(species mastery, ½ × its genus's mastery), so knowing a genus already gives
       half the scientific credit for each of its species. Its identification credit is
       **a·C + b·S + (1 − a − b)·C·S**: *a* with common names only, *b* with the scientific name only, 1 only with both (the C·S term).
    3. **Global**: **25% × the entries' mean mastery + 75% × the mean identification credit of every species in the game** (every
       circle since Pierre, 2026-11-06, Q175, until then circle 1 only; unopened species at 0, so the % is absolute, as for corals).
    - With these, *b* = 0.80 and *a* ≈ 0.73 put the targets exactly on 80% and 85%. Worked values: entries only 25%; entries and every
      genus 55%; every common name 80%; every scientific name 85%; every common name and every genus 90%; everything with both names 100%.
    - It is not additive across the branches (an additive split would put families alone near 65%), every right answer on either branch
      moves the score, and it needs no case per branch.
    - **Simulated** (2026-11-04, `tools/fishscore.js`, since retired, 5 seeds, a model of the path since the species level is not built;
      docs/LEARNING.md "Fish: the global score, simulated"): the anchors are exact; the entries give 25% within the first ~1,000
      answers (the fast start); the genus's half credit removes a flat stretch at 49% on the scientific branch; no long plateau
      on one branch or on both side by side. Two effects of the anchors themselves, not of *a* or *b*: a player who completes one
      branch and then starts the other gains its last 15-20 points 7-12 times slower per answer, and at equal effort a player
      learning both names scores below one learning a single kind for most of the path (at 30,000 simulated answers: 62% against
      80% common only). Rerun with `tools/learnsim.js` fish profiles once the species level exists.
    - **My progress** can show three bars under the headline %: Entries, Common names, Scientific names.
  - **Decided (Pierre, 2026-11-08, Q242) and built**: the formula above with two changes, picked from the re-simulation on
    today's bar and world (docs/LEARNING.md "Fish: the global score, built"), to honour "the score moves fast at the start
    and slowly after":
    - **Weights by commonness (A)**: each species weighs 1/√ of its rank by observers near Dauin (fish.json
      `present.dauinU`, its distinct Research Grade observers in the 40 km zone); tied counts share the mean of their ranks, so the species no one observed there
      (0) share the last ranks' mean and still count, the least (`core.js` `rankWeights`). Each family weighs the sum of
      its species' weights. The Entries part and the species credit are these weighted means.
    - **Square-root display (B)**: the % shown is 100 × √raw. Anchors: families only **50%**, families and every genus
      **74%**, every common name **89%**, every scientific name **92%**, every common name and every genus **95%**,
      everything **100%**. Today the genera exist for circle 1 only, so families and every genus of the game reach 67% (after #727).
    - Not C (circle weights).
    - **A species with no common name at all** (Pierre, 2026-11-08, Q247: "elles ne participeront pas à la branche nom
      commun"; 5 since #727, more with the nudibranchs): no common-name unit, out of the
      Common names component, and its credit is its scientific value alone (S), so it reaches 1 with its scientific name
      and 100% stays reachable.
    - **One computation, its components** (Pierre, 2026-11-08: "il faut qu'il y ait des scores par famille, par genre,
      par espèce ... qu'on arrive à découper les scores sur des composantes"): `core.js` `treeScore` returns the % shown,
      the raw score, the components (Entries, Genera, Common names, Scientific names own and with the genus credit, the
      species credit), the same per circle, and every unit's own bar (each family, genus, species × common / scientific:
      the bar that drives its levels and exam, unchanged). Every rule that reads a score reads one of these.
    - **Shown**: the header pill, My progress's ring and, under the name, three bars (Families, Common names, Scientific
      names: the components, the last one with the genus credit), the fish % achievements (every 10 points since Q259), the leaderboard
      (sheet v101), the update card. The species terms stay 0 until the species level exists; the genus credit is live
      for the genera a player has (the IMR genera, the opted-in ones).
    - **The path on the new scores** (Pierre, 2026-11-08: "il faut qu'on trouve une manière de caler le parcours sur nos
      nouvelles manières de calculer les progrès et les scores"): circle 3's offer reads the circle-1 Entries component
      at 55% (it was the plain mean of the circle-1 families at 50%; 55% is where the simulated players reach it at the
      same answer). The rest of the path reads per-unit levels and counts, unchanged.
    - **Pierre's answers** (2026-11-08, Q253-Q258): the switch is silent for current players, the ? text explains it
      (Q253: "pour l'instant on le passe en silencieux"); circle 3 at the circle-1 Entries component's 55% (Q254); the
      fish % achievements stay at 25% and 50% of the global score for now, the whole fish set to be redesigned around
      the global score (Q255, a proposal of its own: since done, Q259-Q264, "Achievements" below); the bar labels (Q256); the weighted bars with the genus credit in
      Scientific names (Q257), on one condition the formula guarantees and a test proves: a player who plays the genera
      and never a species cannot pass a set level (Scientific names at most 50%, the global % at most the "families and
      every genus" anchor, 74%); credit = S for a species with no common name (Q258).
  - The same scale for every player, whichever names they learn ("Which names a player learns"); the stages are the families of every
    circle (since the units migration, the book's families: 28 of circle 1, 1 of circle 2, 19 of circle 3) and their species; unopened
    units at 0. **Every circle counts** (Pierre, 2026-11-06, Q175; replaces "circles 2 and 3 never count"): the families and species of circles 2 and 3 are stages too, so 100% is further away and every fish player's % dropped once (fish in beta, accepted). They open after the IMR course's families (Q177: circle 2 by itself once every circle-1 family has been asked, circle 3 once the progress on circle 1 reaches 50%; `app.js` `fishGate`); the two opt-in settings are gone. **Circle 3 is an option** (Pierre, 2026-11-07 08:50): at that threshold a card asks "More fish families, beyond the IMR course?" (Open them / Not now, "Not now" on top); "Open them" lets its families open one at a time as usual, "Not now" keeps them closed, the card comes back once 200 answers later, then never, and My progress offers "Open the families beyond IMR (N families)" while it is off (`UNITS.fish` `opens`, `core.js` `openState`; the choice `beyond` in the quiz settings, synced). Circle-3 families **still count** in the fish % (Pierre, Q204: 100% is everything unlocked and known, circle 3 included; a player who declines has room left, and the global score with genera and species will add more). Circle-3 families already open stay open, and a player whose circle 3 already opened by itself is not asked. **Every family met, for now** (Pierre, 2026-11-12: "On lui dit qu'il a tout vu et ce qui vient ensuite", after a study found a player 121 answers with every family in play met before circle 3, then 143 with all 48 met, and the app silent): once every unit in play (`pool`, the scientific genera included when on) is met and asked and none may open now (`model.js` `mayOpen`), a calm card at the break at Next ("You’ve seen them all, for now") says so and what comes next, once per reason: circle 3 not reached (its N families come at about Open Water on average on the course's families: the Entries component's 55%, which no screen shows), circle 3 declined, once its offer will not come back (My progress opens it any time; Pierre, 2026-11-12, #851: no card right after a first "Not now", whose offer comes again 200 answers later), or nothing held back (the families still without a game photo, then Scientific names: turn them on, or their genera come at Advanced, else the mastery exams). Never while another card says what is next (the circle-3 and Scientific names offers, the back cards), in a visit's first answers, or near another prompt; the photo quiz only; seen on the device and on the account (`quiz.js` `allMetDue`, `app.js` `fishNextOf`, `UNITS.fish` `done`; ARCHITECTURE "Subjects"). The corals have none.
  - **A species is "named in Latin" once its scientific name's bar reaches Advanced** (Pierre, 2026-11-08, Q262), the same
    definition for the counter below and for the achievements.
  - **The Elo level stays alongside** as the player's overall level.
- **Default view, Slate rows (A)**: the 27 IMR entries in IMR order, each with its level bar, a thin bar of its species and the two
  counters, **"Species named: N"** (a species at Advanced) and **"Scientific name: M"** (its scientific name's bar at Advanced, Q262; "In Latin" in
  the first mock-up, renamed per the wording rule), as detail under the global score.
- **On top, the totals and short lists of the Dashboard (B)**: species met, named and in Latin as totals, and three short lists
  (Review first, Almost there, Just met), so a player with 300 species open still sees what to do next without scrolling them all.
- **Second view, Mosaic (C)**: one square per species inside its entry, for the collection effect, picked from the view selector at the
  bottom as the coral page's views.
- Shared by all three: the card (its ring shows the global score; levels, a one-line species summary), the "Open all" box while entries or
  species are still unopened, and a drill-down per entry (review and latest first, the rest capped; species not open counted, not listed).
- **"Mystery" tiles for units not met yet** (Pierre, 2026-11-04; ROADMAP): an entry or species the player has not met shows as a masked
  tile, for everyone on fish. On corals only for beginners (the first-launch answer "I'm new to corals"); RAs who had the IMR course and
  players who know corals well see the genera as today.

## Both subjects in one app (Pierre, 2026-11-04, answering the fish UX study)

- **Subject switch: two places, one state.** A Corals | Fish switch on Home **and** a subject chip in the header next to the logo on
  every page (on every page but Home since 2026-11-08: docs/DESIGN.md "Subject switch"); both read and set the same subject (`SUBJECT_KEY`). Shown **only to Pierre (the admin) until fish opens** to players.
  This relaxes rule U12 ("Home = two doors") by one row; docs/DESIGN.md "Subject switch".
- **Identify shows the current subject's tool only**: the Coral ID Key in coral mode, "Fish ID Key, coming soon" in fish mode; the
  other subject's tool is reached through the subject switch. (The study had proposed both keys side by side; Pierre found it odd.)
- **Opening fish to players**: **open to every player since 2026-11-06** (Pierre, Q158: "open fish to everyone now", during IMR's fish course), signed out included, the *beta* label kept (`core.js` `SUBJECTS` fish `open: 'all'`, sheet v67). Before, from 2026-11-04 (PR #540), to a group Pierre picked in the admin; the group mechanics stay for a subject set back to `open: 'group'` (docs/ARCHITECTURE.md "Opening", "The beta group").
- **Leaderboards separate per subject**, no merged ranking: corals as today (coral %, then Elo); fish by the global fish score ("My
  progress (fish)"), then the fish Elo. **Built** (sheet v95): the 🏆 page follows the subject switch; the fish board ranks by the fish %
  as My progress shows it (its ring: the fish global score since sheet v101, 2026-11-08), then the fish Elo (docs/ARCHITECTURE.md
  "Leaderboard").
- **Achievements** (rule L8: learning milestones, never time or days played; designed later, each one's timing checked with the real
  game before it is added):
  - about **14 general fish achievements** to start (families met, levels, mastery, species named, scientific names, Fish basics: the
    study's proposal). **Built** (2026-11-06; the list approved by Pierre, Q203, 2026-11-07): 14 on today's game (`core.js` `FISH_ACH`:
    families met, the IMR course's families met and mastered, families at Open Water / Advanced / Divemaster, Instructor, fish progress,
    scientific genera), their timing simulated (docs/LEARNING.md "Fish achievements, simulated"); species named and Fish basics
    come with those features;
  - **redesigned around the global score** (2026-11-08, Pierre's Q259-Q264; the full list, its names and timings in docs/LEARNING.md
    "Fish achievements, around the global score"): 33, of which 24 are built (the score every 10 points to 60%, fpct25
    retired; families; scientific genera at Open Water and at Advanced; the circles at Advanced) and 9 wait for the species
    level or Fish basics. **At the species level**: fsp1, fsp10, fsp50 (species named by a common name, at Advanced),
    fspsci1 (a first species named in Latin: its scientific name's bar at Advanced, Q262), fboth25 (25 species with both
    names at Advanced), fdauin20 ("Dauin's top 20": the 20 circle-1 species most seen near Dauin, Q261: circle 1 only for
    now, another top with circle 3 later), fpct70 and fpct100 ("Fish god": every name of every species), and Pierre's
    frequency-based ones (Q261): "I know the X fish most often seen" (circle 1, and every circle) and, for fun, "the X
    least often seen at Dauin" (the rank by observers near Dauin, `present.dauinU`, as the score's weights), X and names
    chosen when the species level is built;
  - plus a **separate set of harder, specific "hunt" achievements** for players who like to chase them: mastering a precise look-alike
    pair (Pierre's example: the pearlscale angelfish, *Centropyge vrolikii*, against the mimic surgeonfish, the juvenile of *Acanthurus
    pyroferus*), hard combinations, and tongue-in-cheek / wink ones. Kept apart from the general set so they never crowd it.
- **App icon**: done (Pierre chose C1 on 2026-11-06: a loupe over a coral fish and a brain coral; docs/ARCHITECTURE.md "App icon").

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
4. Species in the leaderboard and achievements. **Answered (Pierre, 2026-11-04)**: the fish leaderboard ranks by the global fish score
   ("My progress (fish)"), then the fish Elo; achievements: about 14 general fish ones plus a separate set of harder "hunt" ones, designed
   later ("Both subjects in one app").
5. **The fish exams, to be rethought** (Pierre, 2026-11-04; open, to design): an exam per species, or per entry (family)? Pierre's idea:
   a family's exam is about 20 questions on only the hard fish of that family, answered directly with the scientific name.
6. **The fish open-all card and the IMR answer.** **Answered (Pierre, 2026-11-04)**: "I'm at IMR" = both names, scientific names early
   (the adaptive difficulty still holds them back); Open all in two steps, "Danger zone" (families and genera) then, only if still too
   easy, "Super Hyper Mega Danger Zone" (all species) ("The fish welcome question and the IMR answer").

## Checks before release

- **learnsim fish profiles** (rules L11, L12, 5 seeds each): a beginner diver, an IMR RA ("I'm at IMR", then the open-all card), an expert;
  they also set the fish welcome answers' starting values and the answer from which each may get the open-all card.
  - IMR profile with everything open: right rate stays near the target (no lasting drop below the corals' range), Latin and typed Latin
    reached sooner than on the calm path.
  - RA level-1 path not slowed: entries reach Advanced at the same pace as on level 1 alone, within the seeds' spread.
  - Calm path: species open only after Advanced; Latin-only and typed Latin follow the schedule.
- **Held-out photos**: a fixed set per species and per entry never shown in practice, for a transfer check (recognition of unseen photos at
  the start and later) and to keep the exam honest. Pierre, 2026-11-04: fish first (many photos), corals later (few photos per genus);
  ROADMAP "A held-out photo set".
- **Real-log replay** once fish answers reach the sheet (rule L12); until then, say what was measured instead.
- Tests: `tests/draw.smoke.js` for the species draw (choices, display, the welcome answers and the open-all card), `tests/fish.test.js` for the data (no duplicate name
  among the choices of one question).
