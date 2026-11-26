# IMR layer, round 3: the IMR content still in the shared files, and the Lab's lecture citations

Design note, docs only (REE-294). Written 2026-11-25 on `origin/main` 6eac0866; every `file:line` below is on that
commit. The guard `tests/orgwords.test.js`, the `ORG` course fields and the decision record
`docs/decisions/2026-11-25-org-course-words.md` exist only on the head of open PR #1575 (REE-34 PR 1), not on main.
Nothing is built here.

**Read for it:** REE-294; REE-34's scoping comment (2026-11-24 22:38 UTC, "Content leftovers") and the integrator's calls
of 2026-11-25 06:42 Manila; `docs/spec/data.md` "The instance's layer" and its "Not in the layer yet"; `tools/instance.py`,
`tools/instance.json`, `tools/instances/imr/`; the decision records of #1309
(`docs/decisions/2026-11-20-coral-slate-slides-tips-split.md`) and #1328
(`docs/decisions/2026-11-20-fish-slides-tag-split.md`); `tests/orgwords.test.js` on #1575's head; rules C1, C2, C5, C8,
S1-S3, D3-D5, W18, W22, W27. Pierre's direction: «les droits, ils me sont à moi à 100 %», with the option to license an
IMR edition to IMR (2026-11-08, #737).

**Not verified:** REE-93 and REE-247 (the lecture photos' second pass and credits page) are waiting for Pierre and were
read only for their scope. The organisation of a second instance (REE-37) is not designed here.

## Summary

- **The same pattern as #1309 and #1328 covers most of the list.** Fields move into `tools/instances/imr/`, and the
  build lays them back where the built files have always had them. `fish.json` and `data.json` stay byte for byte the
  same, `tests/instance.test.js` checks that, and players see nothing. Moving a field without changing it is the
  integrator's call, as it was for #1309 and #1328.
- **Moved in this round** (recommended):
  - the IMR names and family spellings of the 27 tagged fish entries and their sub-entries;
  - every node's PDF sections;
  - the PDF's per-species fields (`common` for the PDF species, `sec`, `pdf`, `cs`);
  - the species' `src: slides`;
  - the references of the lecture photos (`data.json` `course` and the lecture's `cmp` record);
  - a declaration of the IMR slate.
- **`deploy` goes to `tools/instance.json`, not to the IMR layer.** The key in force is the deployment's choice, like
  its `centre`, and is not IMR's content.
- **Not moved, with reasons:**
  - the fish tree itself (ids, `ref`, `not`, sub-entry ids, order): the base's identity of the entries;
  - the slate as runtime data (`BENTHIC` in `core/photos.js`): moving it changes a data format that the core, the sheet
    script and the tools follow.
- **The Lab's 49 lines are three kinds, not one.**
  - The course vocabulary and source names (28 lines) take their words from `ORG`.
  - The lecture sentences with their citation (21 lines) are content. Their citation names where the words came from
    (rule C2), so it must not follow `ORG`. They stay as literals listed in the guard's `KEEP`. A line that repeats a
    `data.json` `terms` definition reads it from there.
- **Four questions for Pierre**, lettered (a)-(d) for the integrator to number. None blocks the recommended PRs: each
  asks whether to make a costly change now, and the recommendation is "not now" or a rule wording.
- **Four PRs.** Three are tools-only and run in series. One is the Lab, after #1575. None touches `core.js`, `core/*.js`,
  `Code.gs`, `sync.js` or `model.js`.

## 1. The leftovers, one by one

Each entry says what the leftover is, where it lives, what reads it, where it should go, how it is laid back, the
migration, and what an edition without the IMR layer would see.

**The invariant of every move:**
- The built file stays byte for byte the same, checked by `tests/instance.test.js`. For the fish that means
  `build_fish.py --regroup --check`; for the corals, `data.json` with the layer's fields taken off and laid again.
- The base refuses a field that the layer owns. An edit made in the old place, or arriving by a merge, then stops the
  build instead of being lost (`tools/instance.py` `fish_compose` :116, `coral_conflicts` :269).
- A field laid into `data.json` has an anchor in `CORAL_AFTER` (`tools/instance.py:61`). The record's key order, and so
  the file's bytes, stay the same.

### 1.1 Fish teaching nodes: `name`, `fam`, `ref`, `pdf`, the tree

- **What.** `tools/fish_source.json` `teach` (:83-150) holds the 27 IMR entries, in the IMR fish presentation's order
  (circle 1), then our circles 2 and 3. Each entry has:
  - `id`;
  - `name` ("as IMR names it", `_doc` :12);
  - `fam` ("the family as IMR writes it");
  - `ref` and `not` (WoRMS names: which species it holds);
  - `pdf` (the IMR/EventMeasure PDF's section tokens);
  - `sub`, its sub-entries (`id`, `name`, `ref`).

  For circles 2-3, `name` and `fam` are ours. The IMR tag (`src: imr`) is already in the layer (#1328), and so are
  `circle`, `sign`, `sl`, `cues`, `look` and `phase`.
- **What reads it.**
  - `tools/build_fish.py`:
    - `teach_out` :1772-1782 writes `fish.json` `teach` `name` and `fam`, and `wfam` when WoRMS differs;
    - `add_families` :639 copies the tagged node's `name` into `families[].imr`, which players see as "IMR: Damselfish"
      (`learn.js:1112` `famIMR`), and into `genera[].imr`;
    - the cross-check report reads `pdf` (:1675-1676).
  - At run time, `core/tree.js:314` reads `teach` for `aka`, `often` and `level`, and `core/tree.js:594` reads it for
    the circles. The admin's Candidates card reads the entry (`admin.js:7436`). None of them reads `name` or `fam` to
    identify a unit: the families are keyed by the key's labels (`f:Damselfishes`).
- **Where it should live.** Three parts, each with its reason:
  - In `tools/instances/imr/fish.json` `nodes`: `name` and `fam` for the 27 tagged nodes and their sub-entries' `name`,
    plus `pdf` for every node (the PDF is IMR's list). `FISH_NODE` and `FISH_SUB` (`tools/instance.py:53-54`) gain
    them, mixed like `src`: the layer owns `name` and `fam` only on a node it tags.
  - In the base: `ref`, `not` and the tree (ids, sub-entry ids, order). They identify the entries and place every
    species. `ref` is our WoRMS mapping, not IMR's text.
  - Moving the entries themselves (the layer creating entries) is the format change #1328 left "for the step that
    comes with a second instance". It changes no built file, so it is not a question for Pierre, but it waits for
    REE-37: today there is no second tree to design it against.
- **Overlay.** `fish_compose` lays the fields by id, as it does for `sl`. The offline modes' `relay_head`
  (`build_fish.py:1342`) puts them back on `fish.json`, so `--regroup --check` covers them.
- **Migration.** A script reads `fish_source.json`, writes the fields into the layer with `layer_dumps` (one node per
  line), and drops them from the base. A full build is not needed: `--regroup --check` and the composed source must be
  equal as data before and after, as in #1328.
- **Without the layer.**
  - A tagged node has no `name`. The build falls back to its family's label from the key in force, the family's own
    `name`, which is a small change to `teach_out`. The `fam` falls back to the WoRMS family (`fams(u)`, :1761).
  - `families[].imr` is absent, as today without the tag. The typed names `fish.json` `vn` gathers from the entries
    (`tools/fish_names.py:67` `family_names`) lose IMR's names, so "Damselfish" is accepted only through the
    family's own label.
  - Nodes have no PDF cross-check.

### 1.2 The PDF's species fields: `common`, `sec`, `pdf`, `cs`

- **What.** `tools/fish_source.json` `species` (:151-) has 671 species. 366 come from the PDF (no `src`; the `_doc`
  gives `pdf` as the default) and carry:
  - `common`, the PDF's common name, "never corrected";
  - `sec`, the PDF section;
  - `pdf`, its pages;
  - `cs`, the rank on the PDF's cheatsheet (24 species).

  The other 305 (`dauin`, `wink`, `slides`) carry a `common` of ours.
- **Readers.** These fields are not just labels. Four of them change what a build decides:
  - **`pdf` is presence evidence.** Rule C8 (3) counts the IMR reference list as confirmation near Dauin:
    `build_fish.py:388` (`near_fields(..., "pdf" in s)` in `--near`), :1708 and :1716 (a species missing from
    iNaturalist is confirmed only by the list), and `tools/presence.py:42` `near_dauin(..., imr)`.
  - **`cs` orders the species.** `build_fish.py:1734` sorts by it, which sets each species' rank `r`. The fish photo
    targets read it (`autosort.js:125`, `TREET.top`), and so do `tools/learnsim.js`, `tools/ratedworld.js` and
    `tools/fish_commonness.py`.
  - **`common` shapes the fish score tree.** `core/score.js:83` and :88 pack a species with no common name apart. It is
    also typed and shown (`learn.js:1257` `spCommon`).
  - **A missing `src` reads as the PDF's.** The `_doc` gives `pdf` as the default, and `needs_near` (:355, read at
    :403 and :1721) asks near-Dauin confirmation only of `dauin` and `wink` species (or circle 3). These fields leave
    `src` alone, so that reading does not move.
  - `fish.json` copies `src`, `sec`, `pdf` and `cs` (:1749-1753). The players' pages show "IMR most sighted #n"
    (`learn.js:1331`, :1708) and "On the IMR reference list" (:1708, :1742).
- **Where it should live.** In the layer's `species` map, beside `sl`: `FISH_SPECIES` (`tools/instance.py:55`) gains
  `common` (for a species the layer marks as the PDF's), `sec`, `pdf` and `cs`. The base keeps our `common` for the
  305 others, and the compose stops on a species that gets `common` from both.
- **Overlay.**
  - The full build reads the composed source.
  - The offline modes copy these fields from `fish.json` as they are, so `relay_species` (:1355) must re-lay them, as
    it does `sl`.
  - `--near` reads `"pdf" in s` on `fish.json`, which still carries it.
- **Migration.** Mechanical, as above. The check is byte equality of `fish.json` plus the composed source equal as
  data.
- **Without the layer.** This is more than missing labels:
  - The 366 species have no PDF name, no section and no cheatsheet rank. Their order follows the source's.
  - The list stops confirming presence near Dauin. A PDF species that only the list confirmed then needs two
    Research Grade observers near the centre, or it goes out of the game (C8).
  - With no `common`, a species is packed apart in the score tree.

  These are consequences for a second edition and change nothing for IMR's. The wording of C8 (3) for another
  edition is question (c).

### 1.3 The species' `src: slides`

- **What.** Two species named only by the presentation (`tools/fish_source.json`: `Platax pinnatus`,
  `Pterois antennata`).
- **Readers.** `build_fish.py` `needs_near` (:355). `fish.json` `src`.
- **Where.** The layer's `species`, as the nodes' `imr` tag: the layer holds only that value, and the base keeps
  `dauin`, `wink` and `pdf`.
- **Without the layer.** The two species have no `src` and `fish.json` loses its `slides` mark. `needs_near` gives the
  same answer for no `src` as for `slides` (neither needs near-Dauin confirmation), so the build decides the same; an
  edition that does not teach the presentation would rather give them `dauin` in its own source.

### 1.4 The references of the lecture photos

- **What.**
  - `data.json` `course` (:46-81): 118 photo records over 34 genera, each with `f` (`imr-…` or `imrl-…`), `imr: true`,
    `slide` and `v`. Some also carry `a` and `pg`, the Corals of the World credit traced by
    `tools/apply_imr_sources.py` from `tools/imr_sources.json`.
  - The `cmp` record of the lecture (:147, `imrl-p8_i2`).
  - Two archived course records in `data/excluded.json`.
  - The photos themselves are in `img/` and on R2.
- **Readers.**
  - `core/curation.js:43-225`: Pierre's curation moves, hides and re-views course photos, and lecture photos join the
    game lists by view.
  - `app.js:2018` and :2026; `learn.js:573`, :831 and :969; `proto/basics.js:39` and :385; the admin.
  - Pierre's `curation.json` names 25 of these photo ids: a stored value, untouched by this note.
  - Writers: `tools/datajson.py` (`SPLIT`, :28) and about fifteen tools, among them `apply_imr_sources.py`,
    `apply_multi.py`, `apply_skeletons.py`, `excluded.py`, `fetch_approved.py`, `tag_origin.py` and `rights.py`.
- **Where.**
  - The records go to a new file in the layer, `tools/instances/imr/course.json` (`course` and `cmp`), so the coral
    layer file stays readable.
  - `tools/imr_sources.json` moves with them: it is about IMR's photos.
  - The photos stay where they are. Whether they stay in play is REE-93, which waits for Pierre's trigger.
- **Overlay, one writer.** With fifteen writers, refusing an edit (as `dump()` does for `ig` and `imr`) would break
  every tool. Instead:
  - `datajson.dump()` takes `course` and the lecture's `cmp` record off the data and writes them to the layer file;
  - `load()` composes them back.

  The tools keep reading and writing one `data.json`, and the split happens in the one writer (rule W16). This is the
  model W27 points to: one writer instead of a check in each tool.
- **Migration.** One run of `dump()`. `data.json` stays byte for byte the same, and `tests/imrsources.test.js` and
  `tests/instance.test.js` gain the layer.
- **Without the layer.**
  - Corals have no lecture photos: no "IMR lecture" strip on the genus sheet and no lecture comparison.
  - The game pools are smaller, by the photos the lecture gave each view.
  - Pierre's curation entries that name them have nothing to apply to. `core/curation.js:76` returns on a photo it
    cannot find in one place; that every path skips an unknown id is not verified here, and the PR's test checks it.

### 1.5 The coral slate's structure (`slateGenera()`)

- **What.** The IMR slate is the genera the games teach and the "IMR slate score" counts:
  - `data.json` `gen` keys in slate order, starred genera last (`app.js:2063`);
  - Millepora, from `x.gen` (`core/photos.js:9` `BENTHIC`).

  `core/photos.js:12` `slateOf` builds it and `gameOf` (:16) adds `BONUS` (:10), which is ours: Coral Finder genera
  common at Dauin. The slate number `n` (0 for a starred genus) is already in the layer (#1309), so the layer's `gen`
  keys are already the slate's genera.
- **Readers.**
  - `app.js:3206` `slateGenera` and :2303 `isBenthic`; `model.js` (11 calls of `slateGenera()`); `learn.js:369-378`.
  - The sheet script: `tools/sync/Code.gs:706-710` fetches `data.json` and calls its copy of `slateOf` and `gameOf` for
    the Learned count and the 45-genus scale (rule L6).
  - `tools/genera.py:21-23` parses `BENTHIC` and `BONUS` out of `core.js`.
  - Tests: `tests/genera.test.js`, `coraltree.test.js`, `coralcontent.test.js`, `calibset.test.js` and two smokes.
- **Recommended now: declare, check, change nothing at run time.**
  - The coral layer gains `slate: {"order": [...], "benthic": ["Millepora"]}`.
  - `tools/datajson.py --check` and `tests/instance.test.js` fail when `data.json` `gen` order or the core's `BENTHIC`
    differ from it.
  - The record of what IMR's slate is then lives in the layer, and nothing a player, the core or the sheet reads
    changes.
- **Not now: the slate as data.** Under this option `data.json` would carry `slate` and `core/photos.js` would read it
  instead of `BENTHIC`. That changes a data format the core, the sheet script's copy (a sheet version, rules D3-D4) and
  `tools/genera.py` follow. A genus moving between `gen` and `x.gen` would also change what stored progress means.
  This is question (a).
- **Without the layer.** Nothing changes until a second edition brings its own `data.json` `gen`. The check simply has
  nothing to compare.

### 1.6 `deploy`

- **What.** `tools/fish_source.json:58` `deploy: {region, key}`. Only `key` is read, by
  `build_fish.py:442-450` `key_in_force` (rule S3: "the one in force `deploy.key`"). `region` ("Dauin, Negros Oriental,
  Philippines") is read by nothing and repeats `tools/instance.json` `centre`.
- **Where.** `tools/instance.json` gains `key` (the id of the key in force), and `region` is dropped. The keys
  themselves stay in the source: they are the books' indexes, data for every region.
- **Overlay.** `key_in_force` reads `instance()["key"]`. `fish.json` `key` stays the same.
- **Rule text.** S3's mechanics clause names the field. It becomes "the one in force, `tools/instance.json` `key`".
  That is a move of where a field lives, not of the rule's substance, so it is the integrator's call, recorded in the
  PR.
- **Without it.** No key in force: no group rule, and the families carry no group, as for a region with no key today.

## 2. The Lab's lecture citations

The guard on #1575's head counts 49 Lab lines that write "IMR": anatomy 17, basics 10, idkey 9, fishbasics 4, fishkey 4,
map 3, cards 1 and spot 1. Read line by line, they fall into three kinds.

| Kind | Lines | Examples | Recommended |
| --- | --- | --- | --- |
| A. The course's vocabulary (23) | idkey 9, map 3, anatomy 3 (:314, :341, :371), basics 3 (:572, :810, :814), fishbasics 3 (:331, :432, :523), cards 1, spot 1 | "IMR lecture group", "IMR group 5", "IMR growth form", "Not on IMR list", "IMR genera", "the IMR course uses 7 growth forms", "the book the IMR course follows" | **Words from `ORG`** (`ORG.lecture`, `ORG.list`, `ORG.course` on #1575's head), as REE-34 PR 2 does for the players' pages. The same text for IMR. |
| B. Source names (5) | fishbasics 1 (:242 `DECK`), fishkey 4 | "IMR fish presentation (Lecture 10)", "the IMR reference PDF (EventMeasure)" | **Words from `ORG`** (`ORG.fishPres`; the PDF's name built on `ORG.short`). They name the edition's own source, so they follow the edition. |
| C. A lecture sentence and its citation (21) | anatomy 14 (:273-275, :292-294, :357, :359, :396, :409, :425, :438, :446, :477), basics 7 (:428, :530, :548, :561-564) | "Neighbouring corallites share a common wall (IMR Lecture 6).", "Costae absent (IMR).", "IMR tip: check its scale", `src: 'IMR Lecture 6: …'` | **Content, not `ORG`.** The citation says where the words came from (rule C2). Writing it from `ORG` would credit another organisation's lecture with IMR's words in a fork. |

**Recommendation for kind C:**
- **Lines that repeat a `terms` definition** (Septa, Costae, Wall, Coenosteum, Septo-costae: `proto/anatomy.js:409`,
  :425, :438, :446 and :477 against `data.json` `terms`, sourced "IMR Lecture 6, slide 13/14") read the definition and
  its source from `DATA.terms`. They then follow the glossary when it moves to the layer (Appendix). The Lab's text
  becomes the glossary's, which is the same sentence with the slide added: a Lab wording change, easy to correct.
- **The other lines** stay literal and move from `LEFT` to `KEEP` in `tests/orgwords.test.js`. Their reason: "a source
  citation (rule C2): the sentence comes from that lecture, whatever the edition". The guard then still fails on any
  new "IMR" in the Lab.
- **Moving those sentences into the layer** means a new key that the Lab pages read, a data format other code follows.
  That is question (d), recommended not now.

## 3. What needs Pierre, and what is the integrator's call

**The integrator's call** (easy to undo: a tooling move with the built files byte for byte the same, nothing players
see, the #1309 and #1328 precedent):
- every move in section 1 as recommended;
- the fallback name of an untagged node;
- `course` and `cmp` laid by the one writer;
- the slate's declaration and check;
- `deploy.key` into `tools/instance.json` and S3's mechanics clause;
- the Lab's kinds A and B from `ORG`;
- kind C's `terms` reads and its `KEEP` entries.

**Questions for Pierre** (lettered here; the integrator numbers them). Each one asks about a costly change. None
blocks the PRs in section 4.

- **(a) The coral slate as data.**
  - Context: IMR's slate (which genera, their order, Millepora) is written today in the shape of `data.json` and in a
    constant of the core. Making it data that the core reads changes a format the core, the sheet script and the tools
    follow, and touches what stored progress counts.
  - Options:
    - A, now: declare it in the IMR layer and check it, with no change at run time;
    - B, now: the core reads Millepora's place from `data.json` (a sheet version);
    - C, later: with a second edition (REE-37), the whole slate as data.
  - **Recommended: A now, B or C only when a second edition is real.**
- **(b) Where the lecture photos' references live.**
  - Context: the 118 lecture photo records can stay in `data.json`, laid from the IMR layer by the one writer, or leave
    for their own file that only an IMR edition loads. Leaving changes the data format that the core, the app, the
    admin and about fifteen tools follow.
  - Options:
    - A: stay in `data.json`, laid from the layer;
    - B: their own file now.
  - **Recommended: A.** B belongs with REE-93 (the photos' second pass) if he ever takes the photos out of play.
- **(c) The PDF as presence evidence in another edition.**
  - Context: rule C8 (3) counts "the IMR reference list (fish: the EventMeasure PDF)". After the move IMR's list sits in
    IMR's layer, so the rule stays true for IMR. For another edition, the question is whether its own list would count
    the same way.
  - Options:
    - A: reword C8 (3) as "the instance's reference list" (for IMR, the EventMeasure PDF);
    - B: keep it IMR's only.
  - **Recommended: A**, a wording that changes nothing for IMR. It is a rule change, so it is his. It can wait for
    REE-37.
- **(d) The Lab's lecture sentences.**
  - Context: 21 Lab lines quote the lecture with their citation.
  - Options:
    - A: they stay in the Lab's code, guarded as citations (those that repeat the glossary read it);
    - B: they move now into the IMR layer as a new data key that the Lab reads.
  - **Recommended: A.** B is a new data format for a prototype area, and nothing ships without the layer yet.

## 4. The PR plan

**Lanes.**
- No PR below touches `core.js`, `core/*.js`, `tools/sync/Code.gs`, `sync.js` or `model.js` (rule W27's sensitive
  files). They wait for nobody's lane.
- PRs 1-3 share `tools/instance.py`, `tests/instance.test.js` and `docs/spec/data.md`, so they run in series (rule
  W22: no stacked branches). #1575 also edits `docs/spec/data.md`: a PR opened before #1575 merges brings `origin/main`
  in by a merge commit.
- PR 4 needs #1575's `ORG` fields, so it starts after #1575 merges. It also changes the counts in
  `tests/orgwords.test.js`'s `LEFT`, as REE-34 PRs 2 and 4 do. Whichever merges second merges `main` and adjusts the
  count. That is expected, not a conflict of substance.

**Sizes**, as bands of lines changed, with the measured PRs they compare with (`tools/effort.py --like 1309,1328,1564`).

1. **Fish fields into the layer** (tools only, size L like #1328: 491 lines, 6 Codex rounds, agent time 11.5 h on
   #1328).
   - Covers 1.1 (`name`, `fam`, `pdf` on nodes), 1.2, 1.3 and 1.6.
   - Files: `tools/instance.py`, `tools/instances/imr/fish.json`, `tools/fish_source.json`, `tools/build_fish.py`
     (fallback name, `relay_species`, `key_in_force`), `tools/instance.json`, `tests/instance.test.js`,
     `tests/fish.test.js`. `tools/fish_names.py`, the one other tool that reads the base directly (:148), reads only
     its `keys` there and the entries' names from `fish.json`, so it needs no change.
   - Docs: `docs/spec/data.md`, `docs/spec/fish.md`, rule S3's clause, and a decision record.
   - **#1328's six rounds argue for cutting this PR in two** (rule W27): 1a covers species fields and `deploy`, 1b the
     node names, `fam` and `pdf`.
2. **Lecture photo references into the layer** (tools only, size M like #1309: 299 lines, agent time 1.5 h on #1309).
   - Covers 1.4.
   - Files: `tools/datajson.py` (`dump` and `load` route `course` and the lecture's `cmp`), `tools/instance.py`,
     `tools/instances/imr/course.json`, `tools/imr_sources.json` (moved), `tools/apply_imr_sources.py`,
     `tests/instance.test.js`, `tests/imrsources.test.js`, `docs/spec/data.md`, and a decision record.
3. **The slate's declaration** (tools and tests, size S, below #1564's 188 lines).
   - Covers 1.5 option A.
   - Files: `tools/instances/imr/coral.json` (`slate`), `tools/instance.py`, `tools/datajson.py` (`--check`),
     `tests/instance.test.js`, `docs/spec/data.md`.
   - It can ride with PR 2 if PR 2's Codex rounds stay short. Otherwise it goes on its own branch.
4. **The Lab** (pages and tests, size M like #1564: 188 lines, agent time 45 min on #1564), after #1575.
   - Kinds A and B from `ORG`; kind C's `terms` reads; the `KEEP` entries.
   - Files: `proto/anatomy.js`, `basics.js`, `idkey.js`, `fishbasics.js`, `fishkey.js`, `map.js`, `cards.js`,
     `spot.js`; `tests/orgwords.test.js`; `docs/spec/basics.md`.
   - Players see: the Lab's kind C lines that switch to the glossary gain their slide number. That is the integrator's
     call, easy to correct.
   - The `fishkey` smoke and the Lab pages' smokes run.

**Order.** 1a, 1b, 2 (with or without 3) in series, starting now. 4 runs in parallel once #1575 has merged.

**After round 3, still left for a second edition:** the tree in the layer, the slate as data, the lecture photos'
own file, and C8's wording (questions (a)-(c)). These are what REE-37 would design against a real second tree.

## Appendix: IMR-sourced content found beyond the list (not designed)

The scoping comment's list is not everything. Counted on `data.json` at 6eac0866, outside the fields the layer already
lays:

- `gen[].ap` and `apsrc`: our tell-apart lines with 98 source strings citing IMR Lecture 6 slides
  (`docs/spec/quiz.md` "Our tell-apart lines").
- `traits`: 18 clue sources citing the lecture.
- `terms`: 9 glossary definitions quoted from the lecture, with their slide.
- `tips`: the lecture's 4 observation questions (:83).
- `x`: 14 strings starting "IMR".

`terms` and `tips` are the lecture's own words and would follow the `qt` precedent of #1309 into the layer. `ap`,
`apsrc` and `traits` are ours with a citation, so they stay. The integrator places them, in a later round or as an
addition to PR 2.
