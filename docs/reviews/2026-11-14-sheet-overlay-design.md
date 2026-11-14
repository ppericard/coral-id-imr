# The Tree's sheet overlay: the stored shape, and seven questions before building

**Status: waiting on Pierre (questions a-g).** This note is docs only and changes nothing in the app. It was written on
`origin/main` at c2d241f, on 2026-11-14 during Pierre's night, and nothing was built.

**The step.** Pierre edits a sheet's text (a family, genus or species sheet, at any level of the tree) from the admin,
and the edit is stored in `curation.json` as an overlay on top of the built content (ROADMAP "The Tree tab", Q341 (a),
2026-11-13). The row records the shape in one line: "an overlay in `curation.json` keyed by node id,
`{field: {v, src, was}}`, applied at load, IMR-verbatim fields read-only (rule C1), through draft + Publish". This note
makes that line precise. The stored shape is costly to undo: the app, the players' copy and the Publish merge will all
read it, and Pierre's own published edits will be written in it. So it waits for him.

## Decided already (not asked again, rule W7)

- **Where and how** (Q341 (a)): in `curation.json`, keyed by node id, one entry per field, `{v, src, was}`, applied at
  load, through the admin's draft and Publish.
- **Only Pierre's Publish writes it** (rule A1): no script, rebuild or PR. A rebuild of `fish.json` or `data.json`
  never changes an edit; at most it reports one.
- **Structure stays from the sources** (the Tree row; rules C2, S3): the tree, the names, the groups and the look-alike
  pairs are never edited in the admin.
- **Stable ids with a forwards table**, and **an overlay whose node is gone shows as orphaned, never dropped** (the
  Tree row).
- **Any subject** (rule S1; Pierre, 2026-11-13: "coraux, nudibranches ou plantes"): nothing in the format or its code
  may name a subject.
- **Undo is step by step, never a bulk reset** (rule A1; rule A2: one click with Undo, confirm only bulk).
- **Pierre corrects our own sheet lines in place** (the family marks, life and apart lines: Pierre, 2026-11-06 16:54;
  genus common names, 2026-11-07). The overlay is the way to do that from the admin instead of through an agent.

## What the sheets hold today (rule W11: counted on `fish.json` and `data.json` at c2d241f)

Readers were found by searching `app.js`, `core.js`, `learn.js`, `quiz.js` and `model.js` for each field.

**Fish family** (`fish.json` `families`, 67; built by `tools/build_fish.py` from `tools/fish_source.json`,
`tools/fish_sheets.json` and the key; sheet `learn.js` `fishFamily`):

| Field | Count | What it is | Who owns the words | Read beyond the sheet |
|---|---|---|---|---|
| `cues` | 27 | "ID tips (IMR)" | IMR presentation ("short English from the presentation"; whether word for word is **not checked**: a guess) | yes: the unit's `qt` (`core.js` `fishGen`), so quiz feedback and cards |
| `phase` | 5 | juvenile and phase lines | IMR presentation (as `cues`) | yes: quiz feedback "More" (`quiz.js`) |
| `look` text | 15 | IMR's line for a look-alike pair | IMR presentation, else Pierre's declared groups (`lsrc`) | the pair itself drives traps; the text is shown |
| `marks` | 66 | "Family ID marks" | ours, from `msrc` (`fish_sheets.json`) | yes: the unit's `qt` when it has no IMR cues (`app.js`) |
| `life` | 28 | "Behaviour, habitat, size" | ours, from `msrc` | no |
| `apart` | 7 | our line for a pair IMR gives no words for | ours, from `msrc` | no |
| `juv.note` | 27 | juveniles note, with `juv.src` | ours, sourced | no |
| `name`, `sci`, `imr`, `imrWith` | all | names and the IMR tag | the key, WoRMS, IMR | yes: typed answers, choices, the name index |

**Fish genus** (`genera`, 239; `fishGenus`, and its row on the family sheet): `cues` (8, "ID tips (IMR, …)", read as
the genus unit's `qt` too), `common` (20, with `csrc`; ours from `tools/fish_genus_names.json` or IMR), `root` (76,
name roots from The ETYFish Project, #901), `name`, `imr`.

**Fish species** (`species`, 670; `fishSpecies`): no free text today. `size` (651) and `depth` (646), each with its
source (Reef Life Survey, else FishBase); `name` (the IMR reference PDF, rule S2), `now` (WoRMS), `common` and `cn`
(curated common names: typed answers and the name index `vn`), `present` (computed, rule C8).

**Coral genus** (`data.json` `gen`, 39, and `x.gen`, 27 extra genera; `tools/build_extra.py` writes `x.gen`; sheet
`learn.js` `viewGenus`):

| Field | What it is | Who owns the words | Read beyond the sheet |
|---|---|---|---|
| `imr` | "IMR lecture notes" | IMR Lecture 6, verbatim (ARCHITECTURE "`data.json`") | yes: typed names ("formerly X" lines, `core.js` `typeNamesOf`) |
| `mn` | mnemonic | IMR slides and presenter notes | yes: quiz feedback |
| `qt` | "ID tips (IMR)" | ours, condensed from `imr` (`tools/id_tips.txt`) | yes: everywhere a tip is shown (rule C3) |
| `crit` | "Coral ID Key criteria" | ours, from Coral Finder, cited by page | yes: typed names, quiz feedback |
| `sum` | short description | ours | yes: quiz feedback |
| `plain` | the plain sentence | ours (`tools/apply_plain_sheets.py`) | yes: first-meeting card |
| `info` | "Other sources" | ours, sourced | no |
| `check` | "To check with an IMR trainer" | ours | no |
| `root` | name roots | ours, sourced | no |
| `lsrc` | look-alike line per pair | Coral Finder or IMR, cited | the look-alikes pages |

**So "sheet text" is not sheet-only.** Most text fields are also read by the quiz feedback, the cards and the typed
answers. Applying the overlay at load, on the records, before the units are made, is what keeps one text everywhere (an
edited ID tip shows the same on the sheet and in the feedback).

**A precedent.** On 2026-11-03 Pierre corrected four IMR wordings (Seriatopora, Lobactis, Heliofungia, Herpolitha:
lecture notes, mnemonic, `sum`, the tips; `tools/apply_imr_corrections.py`). That edited the base itself. The original
is recoverable only from git history and the script.

## The shape recommended: Q341 (a)'s line, made precise

```
curation.json
  sheet:                          the corals' part (their part of the curation is the top level)
    "Acropora":    {"plain": {"v": "…", "was": "…", "t": 1763130000000}}
  fish:
    sheet:                        the fish part (SUBJECTS fish admin.cur), beside fish.genera's covers
      "f:Damselfishes": {"marks": {"v": ["…", "…"], "was": ["…", "…"], "t": …},
                         "apart/f:Surgeonfishes": {"v": null, "was": "…", "t": …}}
      "s091":           {"note": {"v": "…", "src": {"t": "…", "u": "https://…"}, "was": null, "t": …}}
```

- **Keyed by the node's data id**, the one its covers use: `f:<Label>`, `g:<Genus>`, the species id `s091` (never the
  `s:<name>` address), a coral genus by its name. The map sits in the subject's part of the curation, found through
  `SUBJECTS` `admin.cur` as the flags are (`admin.js` `flagsOf`), so no code names a subject (rule S1).
- **Per slot.** A slot is a named place on a sheet that `learn.js` renders: a field of the record (`cues`, `marks`,
  `plain`…), or one line of a keyed field (`apart/<other id>`, `look/<other id>`, `lsrc/<other genus>`). The slots of
  each rank are **declared as subject data** (a `SUBJECTS` field listing, per rank, each slot, its type, string or list
  of strings, and its owner, ours or IMR's), never by code. "Add" fills a declared slot the base leaves empty; it never
  creates an arbitrary key.
- **One entry: `{v, src, was, t}`.**
  - `v`: the new value, the slot's type (a list slot is one list, replaced whole). **`v: null` hides the slot.** Replace,
    add and hide are one key, so two devices cannot publish a hide and a rewording at once (see Publish below).
  - `was`: the base value when he edited, `null` when the slot was empty (an add). It keeps the original recoverable
    and is the stale check, with no hash code to keep in step in JavaScript and Python.
  - `src`: optional, the source of what he wrote, `{t, u}` as `msrc` (question e).
  - `t`: when he edited (ms), as `points` `t`.
- **Applied at load** by one function in `core.js`: the app after the build and before the units are made
  (`fish.json` records before `fishGen`; `data.json` `gen` and `x.gen` before the coral units and the typed names); the
  admin with the same function, to show what is in force. A slot the subject does not declare, or a node that resolves to
  nothing, is never applied (the admin lists it).

**Three states of an entry**, computed in the admin (canonical JSON, as `merge3` compares):

| State | Test | The admin shows | Players see |
|---|---|---|---|
| fresh | base = `was` | his text, with ↺ Restore | his text |
| stale | base ≠ `was` and base ≠ `v` | the three texts (when he edited, now, his), with Keep mine (sets `was` to the base now), Take the new (removes his entry), Edit | question (c) |
| absorbed | base = `v` | "now in the base", one click to remove the entry | the same text either way |

Nothing changes on its own (rule A1): a rebuild that makes an entry stale or absorbed only shows it. `tools/build_fish.py`
(and the coral tools) may print the entries a new base makes stale, reading `curation.json`, never writing it. An
absorbed entry is the normal end when an agent folds his edit into `tools/fish_sheets.json`.

**Node ids** (what exists and what the Tree row promises):

- Species ids are stable and never reused (`tools/fish_source.json` `retired`).
- `f:` ids are made from the key's label (`f:MoorishIdol`), `g:` ids from the PDF name's first word. A relabelled family
  or renamed genus changes its id.
- The only forwards table today is `SUBJECTS` `renamed` (the old entries `t01` → `f:Damselfishes`, `core.js`
  `renamedId`). The overlay is read through it, so an entry under an old id applies to the new one. The forwards table
  the Tree row promises for `f:` and `g:` renames, merges and splits will serve covers and sheets alike.
- Until then, an entry whose id resolves to no node is **orphaned**: kept in `curation.json`, not applied, listed in the
  admin with its text (never dropped).
- **Nodes with no sheet in the app** are one category (question f): every WoRMS taxon `w:<AphiaID>` (#887: "a w: node
  stores nothing yet") and the genera the app sends elsewhere (`core.js` `fishTree` `go`: a genus with one species opens
  that species, the only genus of a family opens the family). A species is one node in both views: an edit made from
  the Key or from WoRMS is the same entry.

**The players' copy** (`tools/curplay.py`): it keeps `sheet` and `fish.sheet` with `v` and `src` (rule C2: a source
reaches the sheet), and drops `was` and `t`, which only the admin reads. `tests/curplay.test.js` then checks that no
player script reads them. If question (c) is answered B, the app needs `was` and the copy keeps it.

**Undo and Publish.**

- Each Save of a slot is one draft step (`saveDraft`), undone and redone like any click.
- ↺ Restore removes that slot's entry, in one click with Undo. It leaves the node's map, and the `sheet` map, as `{}` in
  the draft, never deleted: with the key gone, the next merge would drop what another device published in that map
  meanwhile (the empty-map rule: `admin.js` crop, `autosort.js`; `merge3` reads a missing map as removed). There is no
  "restore the whole sheet" (rule A1: no bulk reset).
- Publish merges node by node and slot by slot (`core.js` `merge3`), so two devices editing two slots of one sheet both
  keep their edit. An entry merges key by key; `v`, `was` and `t` are written together at every edit, so the same slot
  edited on two devices conflicts on `t` and Publish names it among the choices it replaced (`confNote`; mine wins, as
  everywhere).
- The confirm and the commit message count the edits per rank, as the covers are counted (`pubSummary`, `fuRanks`:
  "2 fish family sheet edits").

**Corals and other subjects (rule S1).** The format holds any subject: a node id of its tree, a slot its `SUBJECTS`
data declares. The corals need only their slot list (one rank, the genus, node id = the genus name) and the same apply
call on `data.json` `gen`. They join when the Tree's corals step brings their node pages. A nudibranch or plant subject
declares its own ranks and slots; its ids may be its backbone's.

**Roles and instances** (ROADMAP "Roles, instances and cohorts", Q342-Q349). Q346 (a) rewords A1: `curation.json`
changes only through a person holding the instance's content right, through draft + Publish. A content editor's sheet
edits are therefore this same overlay. The editors' relay (Q348) will validate before it commits: a slot list declared
in data lets it check each entry (known slot, value type, length) with no code per subject. Q347 (a) makes the IMR
content rules the IMR instance's policy, so which slots are IMR-owned belongs with that policy, read from data; another
instance keeps its own `sheet` map over the same base. If that step splits the curation per instance, the map moves
with it unchanged. Who edited (`by`) can be one more key when the relay's audit trail needs it; nothing in the shape
blocks it.

## Alternatives

1. **A hash instead of `was`** (`h`: a short hash of the base value). Smaller. But the original is then only in git,
   which is weaker for rule C1, and the same hash must be computed in JavaScript and Python.
2. **Inside the node's existing map**: `fish.genera[id].sheet` beside its cover, `genera[Genus].sheet` for the corals.
   One place per node, and renames move one entry. But `fishCurate` and the Publish count read those maps as photo
   choices, the coral `genera` map is named after one rank, and the players' copy must walk deeper. A separate `sheet`
   map keeps the photo code untouched.
3. **Per-line operations on list slots**: `{add: [lines]}` appended after the base lines, `{hide: [line]}` by text. An
   added line never goes stale when the base list changes. But this adds two more keys whose combinations `merge3` can
   mix, and hiding by text breaks when the line is reworded.

## Questions for Pierre

**(a) Editing the IMR's own words.** The ROADMAP records Q341 (a) as "IMR-verbatim fields read-only (rule C1)". The
brief for this note says that editing IMR text is Pierre's right, as long as the original stays visible or recoverable.
IMR's slots: the coral lecture notes (`imr`) and mnemonic (`mn`); the fish ID tips (`cues`), phase lines and IMR's
look-alike lines. The coral ID tips (`qt`) are our condensation, so they are ours either way.

- **A**: as recorded. IMR slots stay read-only. To say something else, he adds a `note` beside them (rule C1's
  "discreet, dated, sourced note").
- **B**: editable. The original stays in `was`, shown beside his text in the admin with ↺ Restore. Players see his text
  under the same IMR label, as with his four corrections of 2026-11-03. The sheet never says what the lecture said
  instead (rule C1: never visibly correct the trainers).
- **C**: editable, with the label changed ("ID tips (IMR, edited)") and the IMR original under More details.

*Recommendation: B.* It covers the slide slips rule C1 already leaves out, and the 2026-11-03 precedent, while keeping
every original one click away. It changes what Q341 (a) recorded, so it needs his yes.

**(b) What the overlay covers.** The declared slots are the text fields in the tables above. Names (`name`, `common`,
`cn`, `sci`, the IMR tag), look-alike pairs, traits, groups, circles and presence stay out: they are game data from the
sources, and they drive typed answers, choices and traps. Species have no text slot today, so each rank gets one new
slot, `note`, shown on its sheet.

*Recommendation: as written.*

**(c) A stale edit on players' screens** (the base changed after he edited).

- **A**: players keep his text; the admin flags it until he answers.
- **B**: players see the new base until he rechecks (the copy then carries `was`).

*Recommendation: A.* His choice stays his until he changes it (rule A1), and a stale edit is usually a wording he still
wants.

**(d) Where the map sits.**

- **A**: a `sheet` map in each subject's part (`sheet` at the top for the corals, `fish.sheet`).
- **B**: inside each node's existing map (alternative 2).
- **C**: one top-level map by subject id (`sheet.fish`, `sheet.coral`).

*Recommendation: A.* It follows how every subject's choices are already split (`SUBJECTS` `admin.cur`), and it keeps
the photo choices' code as it is.

**(e) How an edited slot is sourced on the sheet** (rule C2: every clue carries its source).

- **A**: `src` is optional and shown with the slot's existing sources when given. The editor asks for one when he
  fills an empty slot (an add) or edits a fact (size, depth).
- **B**: `src` always required.
- **C**: never shown; his edits are his.

*Recommendation: A.*

**(f) Nodes with no sheet in the app** (WoRMS taxa `w:`, and the genera the app sends to their species or family).

- **A**: not editable in this step. The format already accepts any node id, so allowing them later changes nothing
  stored.
- **B**: editable now, stored and shown in the admin only, until the app gives them a page.

*Recommendation: A.* An edit nobody can see is easy to forget once the base moves.

**(g) List slots** (ID tips, marks, lines).

- **A**: a list is one value, replaced whole.
- **B**: per-line operations (alternative 3).

*Recommendation: A.* It is simplest, `merge3` already treats a list as one choice, and the stale check covers a base
list that changes.

## Integrator's calls for the build PRs (easy to correct; stated, not asked)

- **The editor**: on each Tree node page, every declared slot with its text in force; ✎ opens a text box (one line per
  list item), Save or Cancel; ⊘ Hide; ↺ Restore. No text on the page beyond the slot names (rule A2).
- **Where the stale and orphaned entries show**: a count in the Tree bar, as the juvenile covers' count, linking to the
  first one.
- **The slot list's field name** in `SUBJECTS`, the function names, the tests: `tests/sheetoverlay.test.js` (apply,
  hide, add, orphaned, the three states, `merge3` on two devices), `tests/curplay.test.js`, a smoke on one edited
  family sheet.

## Order of work once answered

1. **Format PR**: the slot lists in `SUBJECTS`, the apply function in `core.js` (app and admin), `tools/curplay.py`,
   the tests. No admin UI; `curation.json` untouched, so nothing changes for players.
2. **Admin PR**: the editor on the fish Tree node pages, the three states, Undo, Publish's count.
3. **Corals**: their slot list and node pages, with the Tree's corals step.
