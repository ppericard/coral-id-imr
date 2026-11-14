# The fish species level, step 1: what is decided, and four questions before building

**Status: waiting on Pierre (questions a-d).** This note is docs only and changes nothing in the app. It was written on
`origin/main` at 9faf628, on 2026-11-14 during Pierre's night, and nothing was built.

**Step 1** is branch A of the tree ([FISH_PATH.md](../FISH_PATH.md) "Levels"): photo questions answered with species
**common names**. A family's species open once the family reaches Advanced, one at a time, the most met around Dauin
first, inside their own family (ROADMAP "Fish mode", next step 2). Scientific species names (branch B, schedule steps
2-4) come after it.

Most of step 1 is designed. It cannot be built yet for two reasons. First, the key that stores a common name's progress
on devices has not been chosen (questions a, b). Second, the leaderboard's sheet script cannot hold species units
today (question c). Both are costly to undo: the first is device storage, a migration if changed; the second needs a
sheet script version first (rule D4). Question d settles the answer log.

## Decided already (not asked again, rule W7)

- **Opening**: a family's species open at its Advanced (80%), one at a time through the existing machinery (`OPEN`, the
  first-meeting card, `introHold`), in commonness order (`fish.json` species `cmi`; a family's `species` list is in that
  order). Each starts from its family's ability. Circles 2 and 3 follow the same rule once their family is open
  (FISH_PATH "Unlock rules").
- **Choices**: four names. Wrong choices get harder gradually (rule L7). They start with species of other families
  already met, then species of the same family, then the same genus or IMR sub-entry, then the player's own mix-ups. A
  species that shares the name shown is never a wrong choice (ROADMAP "Fish common names").
- **Feeding the families**: a wrong pick inside the same family never counts against the family. A wrong pick in
  another family counts against both families and both species (rule L2). A right answer counts on the species only
  (FISH_PATH "Questions and choices at the species level").
- **Names**: 1 to 3 listed names per species (`fish.json` `cn`). Mastery needs every listed name, shown one at a time
  in multiple choice. Typed answers accept the listed names only (`app.js` `cnShow`, `cnTypeNames`, already built). The
  3 species with no name have no common-name unit (Q247). A name two species list is right for both (Q319).
- **Score**: C is the mean of the species' common-name bars, inside `core.js` `treeScore` (Q242). This is already
  coded; only the units are missing (`fishScoreTree` gives `[]` for every species today).
- **Achievements**: fsp1, fsp10 and fsp50 count species named by a common name at Advanced (Q259-Q264). A milestone card
  marks the first species names unlocked (FISH_PATH "Name-display schedule", milestones).

## What was measured (rule W11)

- **Photos are ready.** Observations in play per species (`fish-game.json`, by `sp`):
  - circle 1, 471 species: median 24; 397 have 20 or more, 62 have 8-19, 10 have 1-7, 2 have none;
  - circle 3, 185 species: median 29; 2 have none.
  FISH_PATH's "curated photos per species" gap is closed for nearly every species.
- **Species ids are stable.** `s091` and the others are fixed by hand in `tools/fish_source.json`; no build renumbers
  them.
- **The order of the common-name lists is not stable.** `tools/fish_common.py` ranks the names by their counts in the
  references, so a rerun can reorder a list. Pierre also corrects the lists in use (Q313: "je corrige à l'usage").
- **46 of the 951 listed names hold an apostrophe** ("Talbot’s damsel", "Clark’s anemonefish"). An apostrophe fails the
  sheet's unit pattern (`Code.gs` `BOARD_U_`, and the log's unit check in `logAnswers_`). The curly one also fails the
  "Taxon shown" pattern, so such a name would be logged blank there.
- **A slug of letters and digits only is the key that fits.** Three patterns in `logAnswers_` each refuse a key that
  `G` alone would accept:
  - a space: Choices (`ch`) is the units joined by spaces, so a unit with a space makes the cell ambiguous;
  - a space: a duel's mode (`quiz-duel|A|B`) carries units, and `M` has no space;
  - a hyphen: Choices' pattern `CH` refuses it ("Striped poison-fang blenny mimic").

  The fitting key is the species id, a colon, then the name lower-cased with everything but letters and digits removed:
  `s091:ternatechromis`. For all 951 listed names it passes `G`, `CH`, `M` and `BOARD_U_`, is unique within its species
  and is at most 37 characters (the limit is 40). Today's units (`f:…`, `g:…`) hold no space or hyphen either.
- **The leaderboard tree overflows.** The sheet keeps the fish tree only up to 9,000 characters (`Code.gs`
  `boardTreeOk_`). With one entry per species and the keys above, the tree is about 34,600 characters for circle 1
  alone and about 48,700 for every circle. Even the shortest keys possible (`s091a`) give about 22,700 for circle 1.
  Today it fits only because species without units are packed by genus.
- **The tree goes with every save.** `sync.js` `syncSummary` puts `boards` in every save's summary, so a 49 KB tree would
  add about 49 KB to each save.
- **A rejected tree is dropped silently** (`boardUnitsSave_`), and the sheet keeps the last tree it accepted. So the
  leaderboard would keep ranking without species credit, while My progress (`treeScore` over the app's `UNITS` fish tree) would show it. The
  board and the ring would disagree.
- **The answer log needs no sheet change** for a unit like `s091:ternatechromis`, the rank word `species` or a mode
  suffix such as `|cn`: each fits its `logAnswers_` pattern, Choices and a duel's mode included. A key with a space or
  a hyphen would need one.

## Questions for Pierre

**(a) The key that stores a common name's progress on devices.** FISH_PATH decides one unit per listed name, but not
its key. Fish progress travels with the player's data and syncs between devices, so changing the key later is a
migration.

- **A**: species id and a slug of the name in letters and digits only, `s091:ternatechromis`. It survives a reordered
  list. A corrected or new name starts at 0, and a removed name drops out. A slug with spaces would break the log's
  Choices and duel cells.
- **B**: species id and position, `s091:1`. It is short, but a reordered or corrected list moves progress to the wrong
  name.
- **C**: one unit per species. This goes against "every listed name needed" (it would need a per-name field inside the
  record).

*Recommendation: A.*

**(b) How a species with several names is asked.** This applies to the 269 species with 2 or 3 names.

- **A**: each listed name is a unit in the draw. A species' names open together, on one card that shows them all, and
  the draw then favours the weaker name by itself, with no new mechanism (rule L11). The species still opens as one
  step ("one at a time"). This replaces the "asked least" rule that FISH_PATH and `cnShow` describe today; `cnShow` is
  kept only to break ties.
  A typed question asks one name's unit. If the player types another listed name of the same species, it is right and
  credits the name typed, while the name asked gets nothing.
- **B**: what FISH_PATH and `cnShow` describe today. The species is drawn and the name asked least is shown, crediting
  that name's unit. This needs a new notion, a unit holding sub-units for the Elo, the opening and the levels (rules L6,
  L11).

*Recommendation: A.*

**(c) The leaderboard with species.** A sheet script PR is needed before species count on the board.

- **A**: the sheet stores the tree over several script properties (about 49,000 characters, in chunks under the 9,000
  limit). The app sends the tree only when it changed (not with every save, as today) and sends species units only once
  the sheet reports that version (a new `*_SHEET` gate, rule D4); until then species are not opened.
- **B**: a compact tree that the sheet expands with its own copy of the species list. It is small on every save, but
  the sheet then has to keep a copy of the species list in step with the app.
- **C**: ship step 1 with species left out of the score and the board for now. This breaks "the fish board ranks by
  the % My progress shows", and the score would jump once species are added.

*Recommendation: A.* It is one PR on the `Code.gs` line (STATUS "Next" 1), then the app PR.

**(d) What a common-name answer logs.** The answer logs the name's unit (`s091:ternatechromis`, under (a) A) as the
unit asked, `species` as its rank, and the name shown in "Taxon shown" (blank for a curly apostrophe; the unit still
says which name). No new mode code is used in step 1, whose display is fixed. The display schedule's suffixes come
with scientific names. This is the format the fish replay and the Analyses will read later.

*Recommendation: as written.*

## Integrator's calls for the build PR (easy to correct; stated, not asked)

- **Display**: until the names choice exists (FISH_PATH "Which names a player learns"), every fish player gets
  common-name questions with each choice's scientific name in small type underneath. This is schedule step 1, so the
  two names get associated.
- **Typed answers**: the usual typed share (`TYPED`), on the listed names only (`cnTypeNames`).
- **No species exam yet** (FISH_PATH open question 5). A common-name bar tops out at 95%, and "named" is Advanced,
  which needs no exam.
- **Wording**: the milestone card's text, the species card's layout and the feedback lines.
- **Tests and checks**:
  - rule L11 level 2, in the app world and the rated world through `tests/slot.js`;
  - primary measure: the circle-1 families' Advanced pace is not slowed (FISH_PATH "Checks before release");
  - guardrails: success near the target, and the genus share;
  - rule L12: the real log;
  - rule S1: subject-neutral; species are units of rank `species` in `UNITS` fish, so no engine code names a subject.

## Out of step 1

- scientific species names (schedule steps 2-4);
- the half fault for a common name typed where the scientific name is asked (FISH_PATH open question 3);
- the species exams (open question 5);
- the names choice at the welcome and in ⚙;
- "Super Hyper Mega Danger Zone";
- species look-alike pairs and their cues;
- the juvenile and colour-phase explanation cards;
- Find the X (#885) and Matrix.

## A risk to keep in view

Scientific genera already take 70-84% of a simulated player's questions once accepted, and the families reach Advanced
2,300-3,300 answers later (#822; Q208 option C waits for Pierre). Species join the same draw, so the build PR's
primary check is the families' pace. A species share that crowds the families goes back to Pierre with Q208 C rather
than being patched with a new knob (rule L11).

## Order of work once answered

1. **Sheet PR** (if c is A): the chunked tree and its version, on the `Code.gs` line.
2. **App PR**:
   - the common-name units (a, b);
   - the opening under the new gate (rule D4);
   - the draw's choices, the species card, the feedback and the log (d);
   - the units in `fishScoreTree`;
   - fsp1, fsp10 and fsp50 with the milestone card;
   - the level 2 checks.
