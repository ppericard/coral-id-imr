# Subject rules: one engine, corals and fish

Pierre's standing rules on the subjects (corals, fish) and on fish content. The specs live in
[ARCHITECTURE.md](../ARCHITECTURE.md) "Subjects", "The beta group" and "Fish content", and in
[FISH_PATH.md](../FISH_PATH.md). The index of every rule is in [AGENTS.md](../../AGENTS.md#the-rules).

### S1

**A subject differs only by a field of `core.js` `SUBJECTS` or a function of `app.js` `UNITS`; the engine works on the
current subject (`SUBJ`, `P`, `Q`) and never names or tests which one it is** (`tests/subject-neutral.test.js` holds it,
each exception with its ROADMAP row). **Anything in beta, a subject or a feature, may open to a group first.** While its
access is "group" (a subject: `SUBJECTS` `open: 'group'`), only the admin and the members of its group see it; everyone
else keeps the default, their saved choice and progress kept (a subject: the subject switch, rule U12, shows only while a
player has two subjects or more, never in ⚙, and anyone else opens on the default subject; `app.js` `subjMine`,
`subjOpen`, `subjAt`). Once it opens to everyone (`open: 'all'`), its beta label may stay (`SUBJECTS` `beta`). The group
is managed in the admin (a subject's on its Players page; ARCHITECTURE.md "The beta group").
*Why:* one engine serves every subject cleanly; what is not ready for every player opens to a group first.
*Source:* Pierre, 2026-11-03 (one engine), 2026-11-04 (beta, its group), 2026-11-07 (a general rule for anything in beta).

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
A label the book does not print is added to a group only by Pierre's decision, its note saying so (the thresher sharks
in Sharks & Rays, 2026-11-08, Q232).
The keys are data (`tools/fish_source.json` `keys`, the one in force `deploy.key`): a deployment in another region uses
that region's key, a region with no key has no such rule, and adding one needs no code change.
*Why:* the book's index is the reference in every dive centre, so nobody questions the groups.
*Source:* Pierre, 2026-11-04; a label added by his decision, 2026-11-08 (Q232).
