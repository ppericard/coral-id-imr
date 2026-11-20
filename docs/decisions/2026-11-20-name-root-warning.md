# A name root that echoes another unit's ID tip shows with a warning, never held back

Date: 2026-11-20. PR: #1308. Rules or docs touched: C1, C2; docs/spec/data.md "Name roots", docs/spec/fish.md "Name roots
of the fish genera", ROADMAP "Name roots".

## Context

The name study ([review](../reviews/2026-11-05-name-confusion-study.md), 5.2 and question d) proposed the roots of the
genus names on the sheets, sourced, "and a note where a root is shared or misleading". The shared ending got its line
in 2026-11-14 (-pora, -astrea); the roots whose meaning names the feature of another unit's IMR cue stayed in `skip`,
held back until the sheet could warn about them ([fish name roots](2026-11-19-fish-name-roots.md)).

## Decision

Pierre, 2026-11-14 (Q124 d), on the study's recommendations: "Je suis tes recommandations pour tout". A root whose
meaning echoes another unit's ID tip now shows on its sheet with a warning naming that unit and its tip, verbatim:
"Careful: the name echoes the ID tip of Angelfishes (“Spine on the gill cover (opercular spine)”), not one of its
own." The line only says whose tip it is, never that the genus lacks the feature (several do have it: Grammistes its
lines, Plectropomus its spines).

Choices made while building, not decided with Pierre, each easy to change (integrator's calls):

- **The data shape**: `root.warn`, a list of `[unit, its ID tip verbatim]`, never with `fit`; both builds stop on a unit
  that is the genus's own or unknown, or on a tip not verbatim in that unit's (a fish family's IMR cues, a coral
  genus's `qt`) or among the genus's own.
- **The wording** above; a coral genus is in italics, a fish family in plain text (the call passes how a unit is
  written, as it passes where the shared ending is counted: rule S1).
- **Which genera**: the 10 fish genera and 2 corals whose skip line said their root points to another unit's cue
  (Grammistes, Ostorhinchus, Caesio, Pomacentrus, Plectropomus, Pogonoperca, Taenianotus, Taeniura, Flavocaranx,
  Gnathanodon; Pocillopora, Favites), each with the units its skip line named. Left in `skip`: the roots that read
  against the genus's own family cue (Macropharyngodon, Choerodon, Gracila; Ablabys, whose allusion is also a guess),
  since a line beside an IMR cue that reads against it could read as a correction (rule C1); Taeniamia, whose second
  part is an old genus name; Pectinia, a meaning shared with Ctenactis, not an IMR cue.
- **The sources**: each fish root read again on its ETYFish page (one fetch per page, paced); Pocillopora from Jaeger
  1944 p. 180 ("pocul": "dim. *pocillum*, cup, bowl", which gives Pocillo-pora) and Favites from p. 89 ("fav": *favus*,
  a honey-comb), read on the page scans.

## Consequences

- 12 more genera show a root line, each with its warning; no change to the draw, the model or any record: no rules
  version (rule D5).
- `tests/roots.test.js` checks every warning against the data and the build's refusals; `tests/fish.smoke.js` the line
  on Pomacentrus's page.
- Still open: the species epithets (ROADMAP "Name roots").
