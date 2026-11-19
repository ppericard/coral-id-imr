# Every game mode for every subject: inventory and plan (2026-11-19)

Read-only study of `main` at `e109018ae` (fetched 2026-11-19 20:35 Manila). Pierre, 2026-11-19 20:34 Manila, Q437,
asked whether to open to fish and sea slugs the modes only the corals have (Compare, the pairs, the custom quiz, the
duel): «évidemment oui, il faut ouvrir tous les modes de jeu aux différentes matières, à toutes les matières. Et oui,
c'est du code commun.» This note lists every game mode and practice page, says for each subject whether it is open and
what blocks it where it is not, and lays out the smallest PRs that open the rest in shared code (rule S1). The first
PR (the Duel tab) is built beside this note.

**Short answer.** The shared engine already serves every subject in the quiz, typed questions, the exam, the duels
slipped into the quiz, the Again, Find the X and live. Four Practice and Learn pages were coral-only:
- the Duel tab, which needed only its page opened;
- the custom quiz, which saves under one fixed coral key and groups its tiles by the IMR lecture;
- Look-alikes with Compare, which read the coral photo views, Coral Finder sources and Coral ID Key criteria;
- Memory, which matches two views of one coral.

The gate was `core.js` `SUBJECTS` `pages`, which closed a page without saying why. The first PR adds `SUBJECTS`
`closed` (each page a subject lacks, with its reason) and a test that every mode is open or closed with a reason for
each subject.

## 1. Inventory

Kinds of blocker: **gate** (the `SUBJECTS` `pages` list, nothing else), **data** (a coral-only data field or path),
**code** (a subject-shaped read in the shared code), **UI** (no entry or coral words), **reason** (a declared reason,
stays closed).

| Mode or page | Corals | Fish | Sea slugs | What blocks it where closed | Where |
|---|---|---|---|---|---|
| Quiz (4 choices, typed, exam, Again, slipped duels) | open | open | open | none | `quiz.js` `quizPhoto`, `planPhoto`; `model.js` |
| Mastery exam (silent, rule L9) | open | open | open | none | `model.js` `examSet`; each subject's help names it |
| Typed questions | open | open | open | none | `UNITS` `names`, `norm` per subject |
| Find the X (slipped into the quiz) | closed, reason | open | closed, data | Corals: coral photos do not read as small thumbnails (`UNITS` `tiles` comment). Sea slugs: no square tile cut around the animal (`xc`) in `seaslug-game.json`; `tiles: () => []` with no comment | `app.js` `UNITS` `tiles`; `tools/fish_game.py` (the fish's `xc`) |
| **Duel tab** (`quiz-duel`) | open | **open (PR 1)** | **open (PR 1)** | Was gate only: the pairs (`UNITS` `pairs`) and `quizDuel`/`duelPick` were shared. Extra in PR 1: the ? text (`duelLede`), the relief card's words and its Compare button | `core.js` `SUBJECTS` `pages`; `quiz.js` |
| Custom quiz (`quiz-custom`) | open | closed | closed | data: one fixed key `reefid-sync-coral-custom` (`model.js` `CUSTOM.KEY`), merged and cleared for the corals only (`sync.js` ~469-474, ~1712). code: `cqGroups` reads `DATA.imrg`, `isBenthic`, `shownGroup`. UI: tiles, search, the select and the count print raw ids (`esc(n)`) and the word "genera"; coral help text | `quiz.js` `viewCustom`, `cqGroups`; `model.js` `CUSTOM`; `sync.js` |
| Look-alikes deck (`cmp`, Learn) | open | closed | closed | code: `classics` reads `model.js` `pairs()` (coral `DATA.gen` look); `montage` reads `DATA.gen[n].views` and `MONT_V`; `srcTag` knows only "IMR lecture" and "Coral Finder". The fish have sourced pairs (`look`, `lsrc`: the IMR fish presentation); the sea slugs `decl` | `learn.js` `viewLookalikes`, `montage`, `srcTag` |
| Compare (`cmp-A\|B`) | open | closed | closed | code: `viewCompare` reads `gameGenus`, `g.crit` and `critRef` (Coral ID Key criteria), `g.ig`, the three `VIEWS`, `DATA.cmp`. UI: the quiz feedback's "Compare them" hidden by a data-shape test (`quiz.js` `fbBody` `fish = !!g.name`) | `learn.js` `viewCompare`; `quiz.js` `fbBody` |
| Memory (`pairs`) | open | closed, reason | closed, reason | reason: it matches a colony photo with its corallites, two views of one unit; these subjects have one view (`SUBJECTS` `views`). A Memory for them is a different game (below) | `proto/pairs.js` |
| Basics (Learn step 0) | open | open | closed | content: no basics module written for the sea slugs | `SUBJECTS` `pages` `basics`; `proto/basics.js`, `proto/fishbasics.js` |
| Learn list and sheets | open | open | open | none | `UNITS` `list`, `sheet` |
| Identify | Coral ID Key | Fish ID Key, coming soon | the same page, coming soon | a separate ROADMAP row ("Fish ID Key for EventMeasure"); not a game mode | `UNITS` `identify`; `home.js` `viewFishKey` |
| Live (trainer and students) | open | open | open | none (`live.js` `liveSubjects`: every subject open to all) | `live.js` |
| Lab: Same or different? (#1241), Odd one out (#1253, open) | open | open | open | none: they run on the subject on screen | `proto/samediff.js`; #1253 |
| Lab: Type the genus, Blur reveal, Zoom ladder | open | closed | closed | code: `proto/lab.js` `labPlay` and `labNames` run them on the corals whatever the subject; Zoom ladder needs several views | `proto/type.js`, `reveal.js`, `zoom.js` |
| Lab: Coral ID Key, Elimination, Feature matrix, Feature gallery, Spot the feature, Size ruler, Anatomy, Mind map | open | closed, reason | closed, reason | reason: they read the corallite traits (`DATA.traits`, `trHas`) or the corallite anatomy, which no other subject has | `proto/*.js` |
| Lab: Look-alike web | open | closed | closed | code: reads `DATA.gen` look; any subject's pairs would do | `proto/web.js` |

The Lab tools are prototypes: they count nowhere and graduate only with Pierre's OK (rule U13). They are listed because
the question named them, not because Q437 asks to graduate them.

Declared look-alike pairs per subject, counted from the built files (`data.json` `gen` look; `fish.json` and
`seaslug.json` node `look`): corals 58 pairs over 39 genera, fish 21, sea slugs 10. Their data look-alikes (`model.js`
`dataLooks`, from iNaturalist) and the mimicry pairs come on top in the duels. A subject with no pair met yet sees the
Duel tab's empty note ("They start once you have met two of them in the quiz").

## 2. Plan: the smallest PRs, in order

Each estimate is measured agent time from `tools/effort.py` (first commit to green checks), its comparable PRs cited.
"Moves progress" follows rule D5: none of these PRs changes how an answer is scored or replayed. Each new page gets
answers that are scored exactly like those of the same page for the corals.

1. **The Duel tab for every subject** (built with this note).
   - `SUBJECTS` `pages` `quiz-duel` for the fish and the sea slugs, and `SUBJECTS` `closed` with `CLOSED_TREE`.
   - The tree subjects' ? text opens with the shared `quiz.js` `duelLede`. The relief card speaks of the subject's units
     and offers Compare them only where the subject has the page.
   - Tests: `tests/subjects.test.js` (every mode open or closed with its reason, a pair's address round-trips with
     tree ids, a Duel-tab answer is a two-choice contrast for any ids).
   - Feature, S: comparable to #1095, #1161, #1171, #1222, #1242: median 1.8 h (range 64 min-3.9 h).
2. **The custom quiz for every subject.**
   - The key per subject: `subjKey(SUBJ.id, 'custom')`, which is the corals' `reefid-sync-coral-custom` already, so
     the corals' saved selections stay. `sync.js` merges the latest selection and clears it at sign-out for each subject
     (`mergeSubject`, rule D7).
   - Units shown by `uname` and searched by `unameT`; the words from `SUBJ.one` and `SUBJ.many`.
   - The first view groups by the subject's own groups through one `UNITS` member: the corals' IMR lecture groups, the
     fish's ID-key groups (`TREEU.groups`), the sea slugs' families (as `learn.js` `viewFishList` `byRank` does).
   - The help text per subject, as PR 1's.
   - Tests: the key, the merge and clear per subject (`tests/custom.test.js`, `tests/sync.test.js`); the fish smoke
     opens the page and plays one question.
   - Feature, M: comparable to #986, #1056, #1159, #1204, #1218: median 60 min (range 30 min-1.7 h).
3. **Look-alikes and Compare for every subject.**
   - Pairs: `classics` reads a shared list of pairs, each subject's `UNITS` `pairs` filtered by `isClassic` on its own
     sourced pairs (`lsrc`: the IMR lecture, Coral Finder, the IMR fish presentation; the sea slugs' named sources).
   - Photos: `montage` and `viewCompare` read `GX(n).views` and `SUBJ.views` instead of `DATA.gen` and `VIEWS`. For a
     one-view subject, Compare shows a few photos of each unit side by side instead of one per view.
   - Sources: `srcTag` takes the source's own name.
   - Content: the criteria box only where a unit has `crit`.
   - The feedback's "Compare them" follows `SUBJECTS` `pages` (not the `fish` data-shape test). The fish and sea slug
     sheets' "Don't confuse with" may link to the comparison, as the coral sheet does.
   - Players see a new Learn tab; its layout for one view is the integrator's call, easy to correct.
   - Smoke at 390 px, light and dark.
   - Feature, L: comparable to #974, #1058, #1217, #1241, #1253: median 60 min (range 58 min-2.0 h).
4. **Lab tools that ask a unit, on the subject on screen**: Type the genus, Blur reveal, Look-alike web. They read the
   subject's units through `GX` and `unlocked`, as #1241 and #1253 do; `labPlay` stops forcing the corals for these.
   They stay Lab prototypes (rule U13). Built: [decision](../decisions/2026-11-20-lab-tools-every-subject.md). Feature, M: comparable to #986, #1056, #1159, #1204, #1218: median 60 min
   (range 30 min-1.7 h).
5. **Sea slug basics module**: the words of their ID marks (rhinophores, gills, cerata, mantle), sourced, as Fish basics
   is (`proto/fishbasics.js`). Content, M: comparable to #961, #972, #985, #1223, #1245: median 18 min (range 14
   min-18 min); the sourcing makes it longer (a guess).
6. **Sea slug Find the X**: the square tiles (`xc`) cut in `tools/seaslug_game.py` as `tools/fish_game.py` does, then
   `UNITS` `tiles` as the fish's. Checked 2026-11-20 (decision record `2026-11-20-slug-find-the-x.md`): no sea slug photo carries the animal's box
(0 of 3,014 in play; the rubric gives none) nor a usable crop, so the tool and `UNITS` are built on the fish's shared code
and no tile exists yet; the box pass is left. Content, M:
   comparable to #961, #972, #985, #1223, #1245: median 18 min (range 14 min-18 min).
7. **Memory for one-view subjects**: not planned until the game is defined (below).

PRs 2, 3 and 4 touch different files (the custom quiz in `quiz.js`, `model.js` and `sync.js`; `learn.js`; `proto/`)
and can run in parallel once PR 1 is merged (it adds `SUBJECTS` `closed`, which each of them edits by one line).

## 3. What stays closed, and why

- **Memory for the fish and the sea slugs.** It teaches that a colony and its corallites are one coral. A one-view
  subject has no such link. A Memory there would be a different game: for example, two photos of one family (two of its
  species, or a juvenile and an adult). That is a new game players would see, and Q437 does not describe it, so it is
  a question, not a build: "Memory pour les poissons et les limaces : associer deux photos d'une même famille (deux
  espèces, ou juvénile et adulte), ou le laisser aux coraux ?" It is for the integrator to ask, after Rule 0's window.
- **Find the X for the corals** (thumbnails) and **the corallite Lab tools** (traits): their reasons are in the code
  comments and in `CLOSED_TREE`'s Memory line. They are not `SUBJECTS` `pages`, so the `closed` test does not cover
  them.

## 4. What was checked and what was not (rule W11)

**Checked** (at `e109018ae`):
- `core.js`: `SUBJECTS` (`pages`, `views`), `routeOut`/`routeIn`, `kOf`, `contrastQ`.
- `app.js`: `MODES`, `showModes`, `subjPage`, `UNITS` (`pairs`, `tiles`, `help`, `identify`, `basics`), `route`.
- `quiz.js`: `quizDuel`, `planDuel`, `duelPick`, `reliefShow`, `quizCustom`, `viewCustom`, `cqGroups`, `gameHelp`,
  `fbBody`'s Compare link.
- `model.js`: `CUSTOM`, `pairs`, `isClassic`, `lsrcOf`.
- `learn.js`: `viewLookalikes`, `montage`, `viewCompare`.
- `progress.js`: `hrefPair`. `sync.js`: the custom key's merge and clear.
- `live.js`: `liveSubjects`, `liveLog`. `proto/lab.js`, and a grep of each `proto/*.js` for traits, `DATA.gen` and views.
- `tools/sync/Code.gs`: the duel mode in `renameLogEntry`.
- The pair counts, from the built files.
- Docs: rules S1, L4, L9, L11, D5, U13; `docs/spec/subjects.md`, `docs/spec/quiz.md`, `docs/spec/cards.md`; the modes
  and one-engine audits; ROADMAP "Game modes".

**Not checked:**
- the sea slug photos' framing boxes (PR 6);
- `admin*.js` beyond the Journey's "Custom quiz and Duel tab rows only for a subject with those pages";
- `proto/*.js` bodies beyond the grep;
- `examSet`'s body.

**Guesses, labelled:**
- the order by players' benefit;
- that the sea slug basics take longer than the median for content;
- that Compare for a one-view subject reads best as a few photos a side.
