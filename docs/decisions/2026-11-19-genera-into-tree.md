# The corals' Photos › Genera tab is folded into the Tree, its photo curation one shared section for every subject

Date: 2026-11-19. PR: #1214. Rules or docs touched: A1, A3, A4, S1, W3; docs/spec/admin-tree.md "The
node pages' photo curation, shared by every subject"; docs/spec/admin-photos.md; docs/spec/admin.md; ROADMAP "The Tree tab".

## Context

The admin's Photos group had two tabs for the corals: **Genera** (the older per-genus photo curation: a genus's photos per
view, Live; Hidden; Excluded) and **Tree** (the generic classification tree for any subject, Key and WoRMS views, node
pages), decided one Tree for every subject (Q339-Q341, 2026-11-13; Q359, 2026-11-15). They coexisted because the per-genus
curation was never moved into the Tree's genus page, which only showed the cover, what the genus needs and a link to the
Genera page. Pierre asked why both were still there.

## Decision

Pierre, 2026-11-19, 10:30: «Pourquoi on a encore Genera + Tree pour Coraux???». Then, 10:32: «A nouveau, le but est d'avoir
un code commun entre les matières, pas des codes pour chaque matière...» and, 10:33: «Il faut juste identifier les
spécificités de chaque matière et voir comment les implémenter, soit avec des paramètres, soit avec des bouts de codes
spécialisés».

- Genera is folded into the Tree's genus page and removed: a genus's photos per view and every tool of the old page on
  its Tree page, and the Removed from the site and Excluded lists (the old Hidden and Excluded views) as sections of any
  node page. Same one click, same Undo step, the admin's draft and Publish only (rule A1).
- The photo curation of a node page is one shared section (`admin-nodephotos.js`) for every subject's tree; each subject's
  specificity is a declared parameter or a small piece of code in one table, `NODE_PHOTOS`, under the unit rank, with its
  reason (the corals' three views per genus, the fish's species, ease and phases, the fish's Remove and Exclude with no
  inverse yet).
- The layout (the genus tools in the Tree page's bar and body, the lists as sections, the Tag… filters Removed photos and
  Excluded photos in place of the tab counters, the excluded photos naming no genus on the first root page of a view) is
  the integrator's call, easy to correct.
- Old addresses: none kept. A first version redirected `#photos/genera/…` to the Tree; Pierre, 2026-11-19, 11:14: «Pourquoi?
  C'est quoi le use case que t'imagines?». There is none (only he uses the admin; rule W3, no backward compatibility), so
  a `#photos/genera…` address is an unknown address like any other (`admRoute`).
- Not done here, kept as the next step: one tile and one body for the photos in play (the corals' views and the fish's
  species) and the fish's Removed and Excluded lists, which need their inverse (put back, restore) first; the shared section
  does not add a write the fish page does not have.

## Consequences

- `admin.js` loses the Genera tab, its genus page, `renderHidden`, `renderExcluded`, `LIVE`, `genusHash`, `lastGenus` and
  the tab counters; `genusHref` points at `#photos/tree/key/<Genus>`; the new file holds the shared section and the corals'
  live part (`coralLive`); `admin-coraltree.js` mounts them and adds the two tags.
- The fish and the sea slugs never had the Genera tab: nothing changes for them yet.
- Specified in docs/spec/admin-tree.md and docs/spec/admin-photos.md; tests: `tests/nodephotos.test.js`, the admin smoke's
  Tree and view filter parts.
