# Subject rules: one engine, corals and fish

Pierre's standing rules on the subjects (corals, fish) and on fish content. The specs live in
[ARCHITECTURE.md](../ARCHITECTURE.md) "Subjects", "The beta group" and "Fish content", and in
[FISH_PATH.md](../FISH_PATH.md). The index of every rule is in [AGENTS.md](../../AGENTS.md#the-rules).

### S1

**A subject differs only by a field of `core.js` `SUBJECTS` or a function of `app.js` `UNITS`; the engine works on the
current subject (`SUBJ`, `P`, `Q`) and never names or tests which one it is** (`tests/subject-neutral.test.js` holds it,
each exception with its ROADMAP row). A subject that opens to a group (`SUBJECTS` `open: 'group'`) is **the admin's only**: the subject
switch (rule U12: the Corals | Fish row on Home and its twin, the subject chip in the header) shows only while a player
has two subjects or more (`app.js` `subjMine`), so only to the admin while it is so; never in ⚙; anyone else opens on
the corals whatever was saved (`app.js` `subjOpen`, `subjAt`), their saved choice and fish progress kept. **Except the
players of its group**, whom the admin adds on the subject's Players page (not one site-wide switch; sheet v48, details
in ARCHITECTURE.md "The beta group"). Each subject has its own leaderboard (sheet v95) and its own achievements; fish answers are logged to the sheet (v60) but feed no statistic yet. Fish winks (surprise cards, never counted) come for every fish player, circle 1 included. Fish opened to every player on 2026-11-06 (`open: 'all'`, Q158), its beta label kept (`SUBJECTS` `beta`).
*Why:* fish run cleanly on the corals' engine; a subject not ready for every player opens to a group first.
*Source:* Pierre, 2026-11-03 (engine, winks), 2026-11-04 (beta, its group), 2026-11-06 (fish open to every player, Q158).

### S2

**Fish names: the IMR / EventMeasure reference PDF is a good reference, not an exhaustive one** (a hand-picked list of
species expected at Dauin, which may hold errors or names changed since; EventMeasure's fixed pick list may lag WoRMS).
For a species it lists, show its name with the WoRMS accepted name beside it, both accepted when typed; a species it does
not list uses the WoRMS name. A likely slip or an outdated name is flagged to Pierre (the admin's points list,
`points.json`, rule C5), never silently corrected (rule C1). **Pierre's own iNaturalist observations
(`ppericard`), two halves**: *photos*: his photos identified to the species stay usable as photos of that species even
when Needs ID (his only: he names a species only when nearly sure, otherwise he stops at the genus or the family);
*presence*: they no longer confirm on their own that a species is present, in the Philippines or near Dauin (rule C8:
he is one observer like anyone, Research Grade only); a species seen only as Needs ID near Dauin is "not confirmed near
Dauin", never "never seen". ARCHITECTURE.md "Fish content".
*Why:* the PDF is the RAs' reference at Dauin but only a selection, and names change; one presence rule for everyone
(rule C8).
*Source:* Pierre, 2026-11-03 (names), 2026-11-04 (his observations), 2026-11-05 (the PDF not exhaustive).

### S3

**Fish groups come from the regional identification key, within the region the key covers**, never from a list of our
own. For the Indo-Pacific the key is the index of the 20 identification groups of *Reef Fish Identification – Tropical
Pacific*, 2nd ed., which the IMR course follows: the app shows its group numbers and titles (not the 10 IMR shape
groups), credited to the book; the citation is written once, in the key, never copied into code or docs (the mechanics:
ARCHITECTURE.md "Fish content", "Identification groups"). **Every fish family added to any circle must attach to one of
the key's groups**: `tools/build_fish.py` fails, naming the node, when a node in the game has no group or spans two
without an explicit `keyGroup` (null with `keyWhy` only while a node waits for Pierre's decision; the build lists it).
The keys are data (`tools/fish_source.json` `keys`, the one in force `deploy.key`): a deployment in another region uses
that region's key, a region with no key has no such rule, and adding one needs no code change.
*Why:* the book's index is the reference in every dive centre, so nobody questions the groups.
*Source:* Pierre, 2026-11-04.
