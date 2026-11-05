# Subject rules: one engine, corals and fish

Pierre's standing rules on the subjects (corals, fish) and on fish content. The specs live in
[ARCHITECTURE.md](../ARCHITECTURE.md) "Subjects", "The beta group" and "Fish content", and in
[FISH_PATH.md](../FISH_PATH.md). The index of every rule is in [AGENTS.md](../../AGENTS.md#the-rules).

### S1

**A subject differs only by a field of `core.js` `SUBJECTS` or a function of `app.js` `UNITS`; the engine works on the
current subject (`SUBJ`, `P`, `Q`) and never names or tests which one it is** (`tests/subject-neutral.test.js` holds it,
each exception with its ROADMAP row). A subject in beta (`SUBJECTS` `beta`: fish) is **the admin's only**: the subject
switch (rule U12: the Corals | Fish row on Home and its twin, the subject chip in the header) shows only while a player
has two subjects or more (`app.js` `subjMine`), so only to the admin until fish opens; never in ⚙; anyone else opens on
the corals whatever was saved (`app.js` `subjOpen`, `subjAt`), their saved choice and fish progress kept. **Except the
players of its group**, whom the admin adds on the subject's Players page (not one site-wide switch; sheet v48, details
in ARCHITECTURE.md "The beta group"). The leaderboard and achievements stay coral for now; fish answers are not logged
to the sheet yet. Fish winks (surprise cards, never counted) come for every fish player, circle 1 included.
*Why:* "fish in the app on the same engine as corals, cleanly"; a beta subject: "some things clearly aren't ready".
*Source:* Pierre, 2026-11-03 (engine, winks), 2026-11-04 (beta, its group).

### S2

**Fish names: the name shown and expected is the EventMeasure / IMR reference PDF name** (EventMeasure's fixed pick
list may lag WoRMS); the WoRMS accepted name is an indication beside it, and both are accepted when typed. A likely slip
in the PDF is kept and flagged for Pierre, never corrected (rule C1). **Pierre's own iNaturalist observations
(`ppericard`), two halves**: *photos*: his photos identified to the species stay usable as photos of that species even
when Needs ID (his only: he names a species only when nearly sure, otherwise he stops at the genus or the family);
*presence*: they no longer confirm on their own that a species is present, in the Philippines or near Dauin (rule C8:
he is one observer like anyone, Research Grade only); a species seen only as Needs ID near Dauin is "not confirmed near
Dauin", never "never seen". ARCHITECTURE.md "Fish content".
*Why (inferred):* the RAs label with EventMeasure's names; one presence rule for everyone (rule C8).
*Source:* Pierre, 2026-11-03 (names), 2026-11-04 (his observations).

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
*Why:* the book's index is "reference no. 1 in every dive centre", so nobody questions the groups.
*Source:* Pierre, 2026-11-04.
