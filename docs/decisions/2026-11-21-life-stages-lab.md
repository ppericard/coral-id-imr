# Life stages matched: a Lab prototype on the documented phases only, a stage shown and the same species at another stage among three, the source said

Date: 2026-11-21. PR: #1388. Rules or docs touched: L4, S1, U13, P4, P5, C2, C5; docs/spec/basics.md "The Lab"; REE-22.

## Context

Life stages matched is one of the four formats Pierre approved on 2026-11-18, as the multi-photo study (#1081) relays it (a
paraphrase: his own words are not in the repo): a Matrix variant, the juvenile, female and terminal male of one species matched to
each other. It goes in the Lab first; graduating needs his word (rule U13). The study's layout 1d is the screen: the 2 x 2, the
stage shown outlined in the first cell, the others the choices. The cited list of each game species' phases
(`tools/fish_phases.json`, [the decision](2026-11-20-fish-phases-sourced.md)) says which species have which stage.

## Decision

Built as the Lab prototype the issue describes (Tools › Life stages matched, `proto/lifestages.js`), nothing recorded, no rules
version, no sheet change. Choices made while building, none decided with Pierre, each easy to change (integrator's calls):

- **Only documented phases are asked (rules C2, C5).** A match needs a source for both stages: a species is asked when the list has
  a `yes` for the sexes' colours (`sex`) or the initial and terminal phases (`ip_tp`) and, for a juvenile, a `yes` for `juv`. A
  species whose sources disagree is left out whole (the game picks no side). 94 species in the list, 28 with two documented stages
  on photos in play today. The answer says the stage with the list's quote and its sources, More the stage shown with its own.
  A verdict's quotes describe one stage or several (Coris gaimard's sexes: a female's, a male's, then both), so a stage's name
  goes only over a quote that names that stage as a whole word, one naming it alone first (`lsQuote`); with none, the verdict's
  first quote under the verdict's name ("Female and male", "Juvenile and adult", "Initial and terminal phases"; "initial
  phase" is never read as the female: a source calls the juvenile so). A quote is said once per sheet. The verdict's sources
  are all said, the list not tying each quote to one of them. (The visual check of #1388 found "Male: Females have a bright
  yellow caudal fin" and one quote under both Male and Female: 89 of the 212 stage lines did not name their stage.)
- **How the list reaches the page.** `tools/` is not on the site, so `tools/fish_phases_site.py` writes `fish-phases.json` from the
  list (the species with an adult verdict, each verdict with all its quotes and all its sources, those the list separates with
  " | " or "; "; `--check` in `tests/fishphasesite.test.js` fails when they drift) and `UNITS.fish.phases` fetches it once,
  unversioned and outside the service worker's shell (as the sea slugs' files: 59 KB that not every device's install should
  carry for a Lab game). A file of its own,
  not a field of `fish.json` as `jd` (the juvenile card's list), so the fish build is not rerun for a Lab prototype.
- **The photos** are those `fish-game.json` tags with the phase (`ph`: juvenile, female, male), from the families the player has
  unlocked (rule L4), the draw's own choice where it gives one (`labShots`), else any photo of the stage; none of them framed on
  the fish's square cut (the tiles are all alike, no juvenile has the cut), four different observations (rule P4).
- **The pairs**: juvenile to female, juvenile to male, female to male (the study: "a juvenile or a female, then pick the adult or
  the male"). The wrong two are other species showing the stage to find, those of the same family first (the look-alikes), none
  of them the first's.
- **Nothing is named before the answer** (rule P5): the stage shown carries its own stage word only (it is the question), the
  species, the stages and the source come with the answer, the enlarged view only then.
- **Offered where a subject has a list**: `UNITS` `phases`, the fish's alone for now; the sea slugs' photos carry no phase and
  the corals' none.

## Consequences

- Tests: `tests/lifestages.test.js` (the drawing on stubs: documented stages only, the pair, the other species, four
  observations, the recorder grep, no subject named, the registration), `tests/fishphasesite.test.js` (the file against the
  list, conflicts left out, a verdict without a source refused) and `tests/lifestages.check.js`, played by the fish smoke
  (rounds at 390 and 1280 px, one screen in every state, no progress, log or answer count changed, no unit opened).
- `fish-phases.json` is a data file other code may follow once the game graduates: its shape (`species` by id with `name`, `juv`,
  `sex`, `ip_tp` each `{q: [quotes], s}`) is the integrator's call here and easy to change while only the Lab reads it.
- Left, for when Pierre has judged it by taps: scoring, the species whose photos carry no phase tag (the next judging pass,
  ROADMAP "Fish photo judging, next", re-judges phases on this list: more species will qualify), a "to its name" variant (the
  issue says "to each other or to its name": built is the match to each other; naming the species is the Matrix and the quiz).
