# One Remove in the admin: one click, out for good, an Undo just after, one list to put a photo back

Date: 2026-11-21. PR: #1393. Rules or docs touched: A2 (docs/rules/admin.md), docs/spec/admin-photos.md,
docs/spec/admin-tree.md, docs/spec/admin.md, docs/spec/data.md, docs/spec/photos.md, the admin's help texts.

## Context

A photo had two ways out in the admin: the labelled Remove (a per-genus `hide` entry; the photo went back with the
candidates) and the corner × (an exclusion for good). Pierre could not tell them apart ("ça me gonfle qu'il y ait 2
mécanismes pas bien différenciés", 2026-11-20 06:58) and refused a two-click removal; the question stayed open until he
understood it was about taking photos out of the game.

## Decision

Pierre, 2026-11-21 05:48: «il faut un bouton remove, là en un clic la photo ne revient jamais, avec un undo juste après,
une liste des photos retirées pour en remettre si j'ai besoin. Oui, ça me va, ta proposition A me va.»

- One **Remove** per photo: one click, an exclusion (`exclude`: imports skip it, it never comes back by itself), the
  toast carries an **Undo** button (the same step as Ctrl+Z), and the Tree's one **Removed** list puts a photo back
  (**Put back**, through `data/excluded.json`).
- Integrator's call, easy to correct: the new Remove is the code the × ran; the labelled Remove sits in each tile's
  action row and the corner × is gone; the candidate swiper's × is titled Remove; one Removed row in Photo stats for the
  corals; Publish's summary says "removed photos".
- The photos an earlier Remove hid (`genera[g].hide`, as published) are not rewritten (rule A1, no bulk change to his
  curation): they stay in the same Removed list, their Put back deleting the entry; a new Remove of such a photo drops it.

## Consequences

`ACT.remove` (was `exclude`) and `ACT.unhide` (was `hide`) in `admin.js`, `toastUndo`, `RMBTN`, the shared list
(`admin-nodephotos.js` `npLists`). Corals only in this PR: the fish and sea-slug tiles keep their Remove (a rejected
mark) and ×, and have no Removed list yet (`NODE_PHOTOS` `tree`); they follow in a second step.
