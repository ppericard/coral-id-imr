# The Tree names each subject's circles in its own words; the coral Look-alikes page reads the pairs in force

Date: 2026-11-21. PR: #1385. Rules or docs touched: S1, C2, A1; docs/spec/admin-tree.md, content.md, admin-photos.md; REE-186.

## Context

The Tree row (Pierre, 2026-11-13, Q339-Q341; Q359) left two parts after the builds' tree section (#1368): each instance's own words for its circles (the admin said "1", "2", "3", "None"), and the admin's coral Look-alikes page reading the look-alike pairs in force (it read the base's pairs, `classicPairs`, while the corals' Tree already edited the draft's pairs and the fish's page already read them).

## Decision

Integrator's calls, each easy to correct:

- **Words.** One declaration, `SUBJECTS` `admin.circles`, one reader, `admin-content.js` `circleLab`, for every subject with circles; the Tree's Structure box, its Circle tag and its rows read it. The words are the subject's own existing vocabulary (rule C2): the fish's "IMR course", "After the course", "Beyond the course" (what players read in the circle-3 offer card and the achievements; not the internal "SVS" word, Q182), the sea slugs' "Stars and most common", "Next most common", "Less common" (circle 1 holds the stars and the most common species, the next circles the next ones by commonness: Pierre, 2026-11-15, Q377; `docs/reviews/2026-11-15-seaslug-list.md` §1.6 and §4). A circle with no words shows its number alone. Admin only: the app's strings stay, and another instance's words are a data field for when a second instance comes (the design note's section 6), so no key is added to `fish.json` or the instance layer.
- **Pairs.** `montPairs` picks the pair list by the data shape the subject declares (`flat`: the corals' `classicPairsOf`, else the tree subjects'), over the file with the draft's pairs laid over it (`sheetFile`); the Look-alikes page lists the base's classic pairs less the withdrawn ones plus the added ones, marked, whatever their source: an added pair no IMR lecture or Coral Finder source compares is not on the public Look-alikes page (and the corals' Compare page shows no montage, as the corals have several views), so its picks show nowhere public until a source of that kind names the pair, and its row says so. The Tree's Look-alikes filter keeps the base's list plus the editor's entries, so a withdrawn pair's ↺ is reached. A withdrawn pair's photo picks stay in `curation.json` `mont`, unused (rule A1).
- Not done here: one montage page for every subject (the study's step 7, `renderMont` and `renderFishMont` stay two).

## Consequences

- `core.js` gains a field, so the embedded copy in `tools/sync/Code.gs` changes and the PR carries a changes file; nothing the script computes reads it.
- Players see nothing different.
