# The Tree's sheet overlay: the stored shape, and seven questions before building

**Status: v2 (2026-11-15), waiting on Pierre (questions h-k, and two rule wordings).** Pierre answered (a), (b), (c)
and (e) on 2026-11-15 (Q359), and his answers widen the overlay. It now covers each instance's circles and look-alike
pairs, and the content editor's role: see [v2](#v2-2026-11-15-per-instance-content-and-roles) at the end. v1 below is
kept as written, except where a line says Q359 replaced it. This note is docs only and changes nothing in the app. v1
was written on `origin/main` at c2d241f, on 2026-11-14 during Pierre's night; v2 at 92292eca. Nothing was built.

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
  pairs are never edited in the admin. *Replaced by Q359 (2026-11-15):* the tree, the names, the key's groups and
  presence stay from the sources. Each instance's circles and look-alike pairs belong to that instance, and its content
  editor edits them (v2).
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

*Recommendation: as written.* *Answered otherwise (Q359): texts, circles and look-alike pairs are editable; presence
and names are not (v2).*

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

*Replaced by v2's step plan.*

1. **Format PR**: the slot lists in `SUBJECTS`, the apply function in `core.js` (app and admin), `tools/curplay.py`,
   the tests. No admin UI; `curation.json` untouched, so nothing changes for players.
2. **Admin PR**: the editor on the fish Tree node pages, the three states, Undo, Publish's count.
3. **Corals**: their slot list and node pages, with the Tree's corals step.

## v2 (2026-11-15): per-instance content and roles

### What Pierre answered (Q359, 2026-11-15; translated, his words in quotes)

- **(a) The IMR's own words are editable**, with the original kept and restorable. This changes what Q341 (a) recorded
  ("IMR-verbatim fields read-only"). The label stays as it is (v1's option B; see the integrator's calls below).
- **Who edits.** "You say admin, but we'll need to talk about different rights": editing a sheet's text is the right of
  the **content editor** role (ROADMAP "Roles, instances and cohorts", Q342), not of the admin as such.
- **(b) What is editable.**
  - The texts: yes.
  - **Circles: yes.** "Circles will necessarily be per instance … defined according to what IMR decided … it's the
    person in the organisation responsible for the content."
  - **Look-alike pairs: likely yes.** "It will depend on how people teach them." So the editor can add and withdraw
    them, and each instance decides whether to.
  - **Presence: no.** It follows from a parameter of the instance, its location. It stays computed by rule C8 around the
    instance's centre (`tools/instance.json`), never edited by hand.
  - **Names: no.** They stay from the sources; a separate study covers common-name sources and localisation.
- **(c) A stale edit: option A.** When the base changes after an edit, players keep the editor's text. The editor sees
  the new base beside it, with Keep mine, Take the new one, or Edit.
- **(e) Sources: option A.** A source is optional and encouraged, never required: "ideally the content editor will use
  AI agents to complete the content … we can encourage but not force". The editor prompts for a source when a fact is
  added.
- **Not answered:** (d), (f) and (g).
  - (d), where the map sits, comes back as question (i) below, because the instance changes it.
  - (f) and (g) become integrator's calls (below), as v1 recommended. Each is marked when it fixes a stored format.

### 1. Three layers: the sources, the instance, the editor

| Layer | What it holds | Where it is stored | Who writes it |
|---|---|---|---|
| **Sources** | The tree (WoRMS, the identification key in force), the names (rule S2), the key's groups (rule S3), presence near the instance's centre (rule C8), our own sourced sheet lines (fish `marks`, `life`, `apart`, `juv`; coral `crit`, `info`, `plain`…), and pairs from a published reference any instance may use (the Coral Finder's, with its rights tag) | `tools/fish_source.json` (its reference parts), `tools/fish_sheets.json`, the coral tools; built into `fish.json` and `data.json` | Agents, through PRs (rules C2, C5) |
| **The instance** | Its circles, its declared look-alike pairs and their words, its course texts (fish `cues` and `phase`, coral `imr` and `mn`), its tag (`imr`, `imrWith`, the sub-entries), its starter core (`start`), its reference list (the IMR PDF, a presence input), its centre | Today, mixed into the source files above, and `tools/instance.json` for the centre; later, the instance's own files that `tools/instance.json` names (step 5) | Agents, from the organisation's documents, through PRs |
| **The editor's edits** | Every change the instance's content editor makes: text slots, circles, pairs | The instance's curation, in each subject's part (question (i)) | The content editor, through the draft and Publish only (rule A1) |

- **What today's IMR content becomes: the IMR instance's layer.** That means the IMR presentation's circles, cues,
  phase lines and look-alike lines, the IMR Lecture 6 notes and mnemonics, the IMR lecture's coral pairs, and Pierre's
  declared fish groups (`fish_source.json` `look`; Pierre is the IMR instance's content person). It stays as files the
  build reads, with their sources (`lsrc`, the slides). It is **never moved into `curation.json`**:
  - that would be a script writing his curation (rule A1);
  - the IMR course would then show as a pile of edits;
  - a rebuild from the documents could no longer reach it.

  Nothing changes for players.
- **The built file is per instance.** `fish.json` and `data.json` are the sources plus the instance's layer, resolved
  at build, as today. They are the base that the edits' `was` and the three states (fresh, stale, absorbed) compare
  against. "Restore" goes back to that base. A second instance gets its own built files from the same sources and its
  own layer; their path is decided with that instance, and nothing stored changes for it.
- **Presence does not depend on the circle.** Read in `tools/build_fish.py` `needs_near` and counted on `fish.json` at
  92292eca: every species out for "not confirmed near Dauin" (4) is off the IMR list (`src` `dauin`) and needs that
  test in any circle. Every IMR-list species is near by rule C8's IMR-list reason. So a circle edit brings no species
  in and takes none out, and the build never needs the editor's circles. A circle edit cannot be a back door around
  rule C8.

### 2. The stored shape of the edits (v1's shape, extended)

```
curation.json  (the instance's curation: today the IMR instance's; question (i))
  content:                         the corals' part (their curation is the top level)
    nodes:   {"Acropora": {"imr": {"v": "…", "was": "…", "t": …}}}
    pairs:   {"Acropora|Montipora": {"v": null, "was": 1, "t": …}}
  fish:
    content:                       the fish part (SUBJECTS fish admin.cur)
      nodes:
        "f:Damselfishes": {"cues":   {"v": ["…"], "was": ["…"], "src": {"t": "…", "u": "…"}, "t": …, "by": "…"},
                           "circle": {"v": 2, "was": 1, "t": …}}
      pairs:
        "f:Angelfishes|f:Butterflyfishes": {"v": 1, "was": 1, "t": …}
        "f:Gobies|f:Blennies":             {"v": 1, "was": null, "src": {…}, "t": …}
```

- **One map, `content`, replaces v1's `sheet`**, because it now holds more than sheet text. Its entries keep v1's form
  `{v, was, src, t}`, plus `by` once editors other than Pierre publish (section 3).
- **`nodes`**: per node, per declared slot, as in v1. The text slots are v1's. **`circle` is one more slot**:
  - its value is one of the subject's circles, declared as subject data (fish: 1, 2, 3);
  - `v: null` hides it as any slot, which here means **in no circle**: off this instance's game, as the build already
    leaves a family with no circle;
  - the ranks that carry a circle are declared in `SUBJECTS` (fish: the families; a species takes its family's circle,
    Q214). The corals have no circles (rule S1: nothing names a subject).
- **`pairs`**: one entry per pair, keyed by the two node ids sorted in code-point order and joined by `|`, as the
  pooled confusion keys are.
  - `v: 1` means declared; `v: null` means withdrawn.
  - `was` is the base's value: 1 when the instance's layer declares the pair, `null` when it does not.
  - A pair joins two nodes of one rank, at the ranks where the subject declares pairs (fish: the families; corals: the
    genera).
  - The pair's words stay text slots on each node (`look/<other id>`, v1). Adding a pair may come with words, and the
    editor then asks for a source (Q359 (e)).
- **Text apart from structure.** Only `circle` slots and `pairs` change the game. The **structure stamp**, a short hash
  of the canonical JSON of the circles and pairs in force, is computed by one `core.js` function in the app, the admin
  and the sheet. It is never stored in `curation.json`, so two devices can never conflict on it. It tells each reader
  that the structure changed (section 4).
- **The players' copy** (`tools/curplay.py`) keeps `content` with `v` and `src`, and drops `was`, `t` and `by`, as v1
  said.
- **Undo, Restore and Publish** work as in v1: one draft step per Save; ↺ Restore removes the entry and leaves an empty
  map; Publish merges node by node, slot by slot and pair by pair (`merge3`).
- **A withdrawn pair keeps its photo pair** (`mont`, `fish.mont`): unused while the pair is withdrawn, back when the
  pair is restored (rule A1: nothing is deleted on his behalf).

**How each reader resolves the layers.**

- **The build** writes the sources plus the instance's layer, as today. It never applies the edits, and at most prints
  the entries a new base makes stale or absorbed (v1).
- **One function in `core.js`** applies the edits to the raw records, text and structure, before the units are made
  (`fishGen` and the coral units). The admin runs it on the draft, to show what is in force. The app runs it on the
  players' copy.
- **The sheet script runs the same function.** `Code.gs` embeds `core.js` (rule D3). Its replay's units come today from
  the raw `fish.json` on `main` (`subjGen_`, cached 6 hours; `fishReplayGen` reads `look` and `circle === 1`). It will
  apply the curation's `content` before making them. `curation.json` is already one of the fish pool's files that the
  sheet reads. The cache is keyed by the structure stamp, so the sheet never replays with an old structure for
  6 hours.
- **The app applies structure edits only once the sheet script that applies them is live** (rule D4). Before that, it
  applies the text edits only.
- **A node or pair that resolves to nothing** (a node renamed past the forwards table, a pair with one side gone) is
  orphaned: kept, not applied, and listed in the admin (v1).

### 3. Roles: who may edit, and how Publish records who changed what

**Today.** The admin page changes nothing without a GitHub token that can push to the repository. The sheet checks the
same token (`Code.gs` `isAdmin_`, docs/SECURITY.md). Publish commits `curation.json` with "(by <GitHub login>)" in its
message. Pierre is the only person who holds one. No roles study is in `docs/reviews/`: the roles plan is the ROADMAP row
"Roles, instances and cohorts" (Q342-Q349). Its steps are:

1. `can_()` and the audit tab;
2. cohorts and the trainer view;
3. the instance overlay;
4. the editors' relay;
5. better sign-in.

**Phase 0, before any roles step.** The editor ships in the admin behind the token. Pierre edits, as the IMR instance's
content person, and nobody else can. Rule A1 holds: edits go only through the draft and Publish, with Undo step by step
and no bulk reset. Nothing about roles is stored yet.

**Phase 1, roles step 1** (what must exist first: the sheet's roles table, each row an account, a role and a scope;
`can_(account, right, scope)`; an Audit tab).
- Pierre's account holds `content` on the `imr` instance (question (j)).
- Each Publish that carries `content` changes sends one audit row to the sheet. The row holds:
  - who: the account;
  - what: each node and slot or pair, before and after;
  - when, and the commit.
- The token still does the commit.

**Phase 2, roles step 4: the editors' relay** (Q348; what must exist first: step 1, the slot lists of step 1 below, and
question (k)).
- A content editor works on the same admin pages, signed in, with no GitHub token. Their Publish sends the draft's
  `content` changes to the sheet script, which:
  - checks `can_(account, 'content', instance)`;
  - validates each entry against the subject's declared slots (a known node, a known slot, the value's type and
    length, a circle among the declared ones, a pair inside one declared rank);
  - merges with `merge3` onto the latest file, as the admin does;
  - commits with the relay's own credential. No editor ever holds a token that can push (Q342).
- **The relay accepts the `content` map only.** Whether an editor may also curate photos belongs to the roles plan, not
  to this note.
- **Who changed what.**
  - The entry's `by` is the account's anonymous id.
  - The commit message says "(by a content editor, <anonymous id>)".
  - The person's name goes only in the sheet's Audit tab, which only admins read (rule D2: no staff or player name in
    the repository).
  - The admin shows "edited by" from the sheet.
- **The page never enforces.** The admin hides the editor from an account without the right, but only the sheet's
  check counts.

### 4. What editing circles and pairs does to the game

**What they drive today** (read in the code at 92292eca unless marked as a guess, rule W11):

| Change | What it moves |
|---|---|
| A family's **circle** | the path: circle 1 is the core that "I've had the IMR lecture" opens at once (`UNITS fish core`); circle 2 opens once every circle-1 family is met (`app.js` `fishGate`); circle 3 opens only after the player says yes, offered once the circle-1 part of the score reaches 55% (`fishC3`, `opens`) |
| | the scientific genus units, which exist only for circle-1 families (`app.js` `fishGenera`; the sheet's replay, `core.js` `fishReplayGen`) |
| | the global score's parts per circle, the headline %, the leaderboard (`treeScore`, rule D8) and the circle-3 threshold |
| | the achievements that read circles ("House reef", "Supporting cast": `FISH_ACH`) |
| | the offer card's words ("Beyond the IMR course"), which are IMR's (`UNITS fish opens`): another instance needs its own words for its circles (a data field, step 3) |
| A **pair** | the opening order: declared pairs always grouped (Q350 (f), `model.js` `declaredOf`) |
| | the traps among the choices (`model.js` choices; `CONF.LOOK` 0.3 against the family's 0.12 as the pooled confusion's prior) |
| | the duels (`UNITS fish pairs`: the Duel tab, the duels slipped into the quiz) |
| | the mastery exam's entry: a unit is asked beside each of its look-alikes first (Q129, `core.js` `looksLeft`, `model.js` `examLooks`) |
| | the progress itself: the replay's known mix-ups and the weight of an answer read the pair's prior (`core.js` `replayProgress` `prior`, `lookOf`) |
| | the Look-alikes pages and their photo pairs (`mont`) |
| | corals: the ★ rule, under which a starred genus opens after its look-alike reference (rule L5); a coral pair edit may change which genus that is (a guess, not read; to check in step 8) |

**Why a structure change needs a replay.** A player's bars are their answer log replayed under the rules (rule D9). If
the pairs or circles change and nothing is replayed:
- each device keeps bars built under the old structure, while its new answers count under the new one;
- the sheet replays with whatever structure it read;
- the two disagree until the next rules version, and the leaderboard follows the sheet.

Rule D5 cannot carry it: a rules version is an entry in `core.js` `RVS`, which is code, and an editor's Publish changes
no code. So the structure stamp plays that part: when the stamp a device applied differs from the sheet's, the sheet
replays that player's log under the structure in force. That is question (h).

**Is it reversible?**
- **The bars: yes.** The log is never changed. Undoing an edit gives the same structure, and the next replay gives the
  same bars back, up to the pooled statistics that moved meanwhile, as with any replay.
- A circle edit never changes a unit's id, so nothing moves in the log.
- A unit that leaves the slate keeps its record and its log. Its answers still replay: the replay reads `gen` only for
  the priors, `gen[t] || {}`. It is no longer shown or counted, and it comes back at the undo.

**What is not reversible: each flagged as costly to undo, so for Pierre (all one way, in the player's favour):**

1. **Learned marks and exams in progress stay.** The replay takes them from the saved copy (`core.js` `replayedOf`:
   "the replay does not decide the exam"). If a pair is withdrawn, a unit's exam can open sooner, because it no longer
   needs that pair compared. A mark passed then stays when the pair comes back.
2. **Achievements stay.** None is taken back (Q332, `MXL.QUIET`). If a weak family leaves circle 1, "House reef" can
   come at once for some players, and it stays when the family returns.
3. **Units opened stay open.** `mayOpen` gates only the units not open yet. A family moved into circle 1 and met stays
   open after it moves back to circle 3, even for a player who declined circle 3.
4. **Cards and offers seen stay seen.** That covers first-meeting cards and the circle-3 offer answered. The level's
   answer count never goes down (`replayedOf`).
5. **What was played meanwhile.** The questions, traps and duels drawn under the old structure are in the log as played.
   The leaderboard positions shown meanwhile were seen.

**The two cases asked.**
- **The editor withdraws a pair.** For every player, at their next sync:
  - traps, duels and the confusion groups stop pairing the two units;
  - the exam no longer waits for that pair;
  - the answers where one was among the other's choices are weighed again under the family or base prior.

  Bars move a little, up or down. How much was not measured (a guess: small, as the prior is one input of the
  known-mix-up term). Points 1-5 above apply. Restoring the pair gives the bars back at the next replay. Data never
  withdraw a declared pair (Q350 (f)); the instance's editor can, because the pair was the instance's declaration.
- **The editor moves a family between circles.**
  - What opens next follows the new circles. If the family moves into circle 1, a player already in circle 2 meets it
    first: circle 2's openings pause until then.
  - What is open stays open.
  - The score's parts, the headline % and the leaderboard move at the next replay.
  - Leaving circle 1 takes the family's scientific genera off the slate. Their records are kept, and they come back
    with it.
  - "In no circle" takes the family off the game and out of the %. Its records are kept.
  - Achievements already earned stay (point 2).

**Cost.** Each Publish that changes the structure makes every player's next sync a full replay, and the sheet's
15-minute trigger warms the leaderboards (rule D8). That was 13 accounts in the measure of 2026-11-09 (docs/LEARNING.md "The log, the only reference for progress"). The trigger
budget is 90 minutes a day on Pierre's account (Q353). So the admin sends structure edits in one Publish, and that
Publish asks for a confirmation saying it changes every player's path and progress (rule A2: only site-wide actions
confirm).

### 5. Questions for Pierre

**(h) When an instance's content editor changes its circles or look-alike pairs, what happens to players' progress?**
Players' bars depend on which units are look-alikes and in which circle (the traps, the exam's entry, the score's parts).
*Fixes a stored format: the structure stamp in the sheet's Replayed tabs and on each device. Costly to undo.*

- **A**: every player's progress is recalculated from their answers, silently, as for a new rules version (rules D5,
  D6, D8, D9). Bars may go down or up. Learned marks, achievements and units already open stay. Undoing the edit gives
  the same bars back at the next recalculation.
- **B**: only answers given after the change count under it, and past bars stay as they were. The phone and the sheet
  then disagree until the next rules version, and an undo cannot give the old bars back.
- **C**: the editor's circles and pairs change the path and the draw only. The progress keeps reading the instance's own
  circles and pairs from its documents. Nothing is recalculated, but a pair the editor added would count for the traps
  and not for the bar or the exam.

*Recommendation: A.* One reference for everyone, the answer log (rule D9). Every device, the sheet and the leaderboard
agree, and the bars are reversible. What stays (marks, achievements, open units) only ever favours the player. If A,
rules D5 and D8 get one line each (the wordings below).

**(i) Where an instance's content edits are stored** (v1's (d), with the instance added). *Fixes a stored format.*

- **A**: inside each instance's own curation, in each subject's part (`fish.content`; `content` at the top for the
  corals). The instance is the file: today's `curation.json` is the IMR instance's, and another instance gets its own
  curation. Nothing inside names an instance.
- **B**: one curation file for every instance, with a level per instance (`inst.imr.fish.content`).
- **C**: a separate content file per instance (`content-imr.json`), apart from the photo curation.

*Recommendation: A.* Q346 (a) already made `curation.json` the instance's: it changes only through a person who holds
that instance's content right. A keeps one Publish and one merge path. It follows how each subject's choices are already
split (`SUBJECTS` `admin.cur`), and the relay checks the map's path. B makes every instance's Publish rewrite one shared
file. C needs two Publish paths and two merges.

**(j) Who holds an instance's content right by default?** *Access (AGENTS.md: always asked).*

- **A**: the platform admin may edit every instance's content, as the GitHub token allows today.
- **B**: only the holders of that instance's content-editor role. The platform admin grants it to himself where needed:
  for IMR, at once, and the grant is logged.

*Recommendation: B.* Each organisation then sees exactly who may change its content, and who did. For IMR it costs one
grant. Until roles step 1 exists, the token stays the only gate (phase 0).

**(k) Is the pilot's sign-in (a name and a 4-digit code, Q349) enough for an editor to publish through the relay?**
*Access.* A content edit reaches every player of the instance. Today, five wrong codes lock a name for 10 minutes
(docs/SECURITY.md), so trying every code takes days, not minutes.

- **A**: yes, for the pilot. Every relay Publish shows in the admin's Inbox, and every edit can be undone one step at a
  time, with its original kept in `was`.
- **B**: no. Editors other than Pierre wait for the better sign-in (roles step 5).

*Recommendation: A for the pilot, B before a second organisation.* The pilot's editors are a few people Pierre knows.
Every edit can be undone and is traced, and B would hold the relay until step 5.

**Rule wordings to confirm** (no number: a rule's wording, its substance already decided):
- **C2**, one line added: "An instance's content editor's own words, pairs and circles carry a source when they give
  one; the editor asks for one when a fact is added (Q359 (e))."
- **D5**, one line added if (h) is A: "A change to an instance's circles or look-alike pairs replays every player's
  progress as a rules version does, keyed by the structure stamp instead of an `RVS` entry; rules D6 and D8 apply."

### 6. Integrator's calls (easy to correct, stated, not asked)

Marked **[format]** when the call fixes a stored format. Those calls go in the format PR's Decisions, so Pierre sees
them before it merges.

- **[format]** The map is named `content`, with `nodes` and `pairs`, and replaces v1's `sheet`.
- **[format]** The pair key is the two node ids in code-point order joined by `|`. `v` is 1 or `null`. The words are
  the node text slots `look/<other id>`.
- **[format]** `circle` is a node slot, its values declared per subject, and `null` means in no circle.
- **[format]** `by` is the account's anonymous id, from the relay step on. The name is kept only in the Audit tab.
- **[format]** A list slot is one value, replaced whole (v1's (g), option A).
- **[format]** The structure stamp is a hash of the canonical circles and pairs in force. It is stored in the sheet's
  Replayed tabs and on each device, never in `curation.json`.
- The nodes with no sheet in the app (WoRMS taxa `w:`, the genera the app sends on) are not editable in this step (v1's
  (f), option A). The format already takes any node id.
- An edited IMR text keeps the IMR label (v1's (a), option B). The original is one click away in the admin. Easy to
  correct.
- An editor's pair counts as a declared pair (Q350 (f): always grouped). Withdrawing one is the instance withdrawing its
  own declaration.
- The editor asks for a source when an empty slot is filled, a pair is added, or a fact (size, depth) is edited, and
  never requires one (Q359 (e)).
- The Coral Finder's pairs belong to the sources, with their rights tag. The IMR lecture's pairs and Pierre's fish
  groups belong to the IMR instance.
- A structure Publish confirms once, saying it changes every player's path and progress.
- A new instance with no layer of its own starts with one circle and no declared pair. It is not built now.
- **Not in this design:**
  - the coral slate (the numbered and starred genera, Millepora, the bonus genera) as instance content, and each
    instance's words for its circles: their own step and question, when a second instance comes;
  - names (the common-name study);
  - rule C8's "near Dauin" and "the IMR reference list" read as the instance's (the instance's-centre row).

### 7. Step plan (one PR each, in order)

1. **The format, text slots.** v1's step 1 under v2's names: the slot lists in `SUBJECTS`, the apply function in
   `core.js` for the text slots, `tools/curplay.py`, the tests. Nothing changes for players. *Needs:* question (i).
   `core.js` changes, so it needs a changes file (rule D3).
2. **The admin's text editor**, on the fish Tree node pages: the three states, Undo, Restore, the source prompt and the
   Publish count. *Needs:* step 1. Pierre edits through the token (phase 0).
3. **Structure in the apply:** the `circle` slot and `pairs`, the structure stamp, and each instance's words for its
   circles as data. The sheet applies the same function to its replay's units and keys its cache by the stamp. A
   changed stamp replays, and the boards follow (rule D8). The app is gated on that sheet version (rule D4). *Needs:*
   question (h); steps 1-2. It changes the sheet script.
4. **The admin's structure editor:** a circle on each family page, pairs added and withdrawn on the node pages and in
   the Look-alikes filter, and the Publish confirmation. *Needs:* step 3.
5. **The IMR instance's layer as its own files:** the IMR parts of `tools/fish_source.json` (circles, `look` groups and
   words, cues, phase lines, `start`) and the coral IMR fields move to the files that `tools/instance.json` names (an
   `id` and a `name` join its `centre`). The build composes them, and `fish.json` and `data.json` stay byte for byte
   (a test). *Needs:* nothing. It is easy to undo, and needed before a second instance.
6. **Roles step 1** (the roles plan): `can_()`, the roles table, the Audit tab, and the content audit row of the
   admin's Publish. *Needs:* question (j).
7. **The editors' relay** (roles step 4): Publish with no token for content editors, validation from the slot lists,
   `by`, the commit message, the Inbox line. *Needs:* steps 3 and 6, question (k).
8. **Corals:** their slot lists and pairs at the genus rank (checking the ★ rule, L5), with the Tree's coral step.
   *Needs:* steps 1-4.
