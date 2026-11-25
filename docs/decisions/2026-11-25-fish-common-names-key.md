# A species' own common names: a `curation.json` `fish` `cn` key, laid over the built names by one reader

Date: 2026-11-25. PR: #1568. Rules or docs touched: A1, S1 (cited, unchanged); docs/FISH_PATH.md "Common names", docs/spec/fish.md,
docs/spec/admin-tree.md, docs/spec/fish-photos.md.

## Context

Each fish species carries 1 to 3 common names in `fish.json` (`cn`), selected by `tools/fish_common.py` and published
without Pierre's prior check: he corrects in use. The admin edited the shared names' exceptions (`fish` `names`) but not a
species' own list, which waited for a stored format (REE-33, ROADMAP "Fish common names").

## Decision

Pierre, 2026-11-21 05:40 Manila, Q444, on a species' own list of names kept in the curation: «Question 444, la liste de
noms communs propres à chaque espèce dans la curation. C'est un détail d'implémentation. Si tu penses que c'est le
mieux, oui.» The format is the integrator's call:

- `curation.json` `fish` `cn` `{species id: [1 to 3 names, the main first]}`, written only by the admin's draft and Publish
  (rule A1), one species a key so two devices' lists merge species by species.
- One reader, `core.js` `treeCnApply`, run by `contentApply`, so the app, the admin and the sheet's replay agree. It lays a
  clean list over the built `cn` of its species and nothing else; it never gives a species a list, so the species and
  score units, the replay and the leaderboards do not change and the sheet script needs no gate.
- The key is subject-neutral (the subject's own part, `SUBJECTS` `admin.cur`; a subject whose species list no names has no
  use for it): no exception under rule S1.

## Consequences

- The admin's Common names box on a species' page writes it ([admin-tree.md](../spec/admin-tree.md#common-names-a-species-own-list));
  what the game does with it is in [fish.md](../spec/fish.md#curated-common-names).
- A name he takes out is no longer accepted when typed; `vn` and `common` stay as built; a species the build gives no name
  cannot be given one this way (it would add a progress unit: a structure change, for Pierre).
- Chosen over a content-editor slot (`fish` `content`): its list type holds strings, not the build's `[name, spellings]`
  entries, and its states (stale, absorbed) would add nothing here, as Pierre's list replaces the built one for good.
