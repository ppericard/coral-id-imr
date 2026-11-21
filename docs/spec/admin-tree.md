# The admin's Tree tab: every subject's classification and its node pages

Photos › Tree shows a subject's classification as a tree at the left and a page for every node at the right: one page
for every subject (`admin.js` `renderTree`), its trees and node pages from the subject's builder (the fish's and the sea
slugs' one builder, the corals' their own), all on the generic tree of `taxtree.js`. Its node
pages hold Pierre's photo choices (covers, featured photos, Not this, validation) and the content editor's Sheet and
Structure boxes. The shell (addresses, the subject switch, the tree subject in force) is in [admin.md](admin.md), the
other photo pages in [admin-photos.md](admin-photos.md); the data the pages edit is in [fish.md](fish.md),
[fish-photos.md](fish-photos.md) and [content.md](content.md). This is the specification of what the code does now; why
each part was decided is in [docs/decisions/](../decisions/README.md) and the PRs.

## The tab and its two views

Every subject's Tree is one page, `admin.js` `renderTree` (the study's step 4,
[reviews/2026-11-19-admin-one-engine.md](../reviews/2026-11-19-admin-one-engine.md) §5; Pierre, 2026-11-20: one admin
adapted to each subject). What differs between subjects is its **builder**, declared in one place, `admin.js`
`TREE_BUILD`, and picked by the data shape the subject declares (`SUBJECTS` `flat`: `treeShape`, `treeBuild`), never by
its rank or its name (rule S1; `tests/treebuild.test.js`): `flat`, a subject whose units are a flat list in `data.json`
(the corals: `admin-coraltree.js` `ctTree`, `ctRow`, `ctFilters`, its genus pages' photos `admin-nodephotos.js`
`coralLive`), and `tree`, a subject read from its files (the fish and the sea slugs: `fuTreeOf`, `fuWormsOf`, `fuRow`,
`fuFilters`, its node pages' photos). The trees themselves are never built in the admin: each subject's build writes
them ("The tree section", below) and every builder reads that file the same way. A builder gives its help, whether its
data is in and how to read it, a view's tree,
and one render's context: the Key's tree and the view's, the rows, the Tag… options, All | IMR (when the IMR course tags
some node), the content editor's data, and the node's own page (its cover, name, tools, why, body and binder) or none for
a page of its children's cards. The page draws the rest the same for every subject: the tree at the left, the bar (the
path, the selects, All | IMR, Tag…, the drill-down, the edits to check, the tree's problems), the + Pair box, the
Structure and Sheet boxes, the cards and the shared Removed list. Its views, in the tab's view switch, are
two classifications of the same leaves, one parent per node in each:

- **Key** `#fish/photos/tree/key/<node id>` (`#fish/photos/tree/key/f%3ADamselfishes`, `…/g%3AChromis`, `…/s091`; an
  address of the former Families tab is not kept, rule A4);
- **WoRMS** `#fish/photos/tree/worms/<node id>`.

None or an unknown id: the view's first node of the subject's broadest rank (`ranksOf`: a fish or sea slug family, a
coral genus), else its first root. The switch keeps a leaf (a species, a coral genus), the one node of both views.

### The Key view

The identification key's classification as a **collapsible tree** at the left (`fuTreeOf`, `treeMount`, `ttMount`):
each key group (`k:<its number>`, `k:none` for a family with none), its families, their genera and species (the species
in the game, as the family's page shows them), built with the generic tree ("The generic tree", below). Each row shows
its rank as a small grey word, its species and photos in play (a family's row: its cover, circle, what it needs,
✓ Validated, the draft's dot; a species its draft's dot: `fuRow`). The key groups unfold by default; ▸ / ▾ unfolds a node
(remembered per subject in this browser, `reefid-admin-tree-open-<subject>`), and a new address unfolds the way to its
node. The tree follows the WAI-ARIA tree pattern (`role=tree`, a flat list of `treeitem` with `aria-level`,
`aria-posinset`, `aria-setsize`, `aria-expanded`, one row in the Tab order: ↑ ↓ move, → unfolds then goes to the first
child, ← folds then goes to the parent, Home / End, `*` unfolds the siblings, Enter or Space opens the node's page).

### The WoRMS view

`fuWormsOf`: the reference taxonomy as a tree, the section's `worms` view (built from `fish.json` `ref`: WoRMS AphiaIDs,
each `{name, rank, parent}`, `tools/build_fish.py`) above the Key's own leaves (the species in the game, in the Key's
order): any depth and WoRMS's ranks in lower case (class, order, suborder, family, subfamily, tribe, genus; up to 8
levels), its problems (a reference or a parent missing, a cycle) counted in the bar (`.adm-ttprob`). None or an unknown
id: its first family. The bar's families' select lists WoRMS's families in the tree's order. The unfolded nodes are kept per view (`reefid-admin-tree-open-worms-<subject>`).

**Node ids**, one id space per view above the leaves: a species keeps its id (`s091`) and is **one node in both views**
(its page, its cover `curation.json fish genera[s091]`, its choices are the same); every taxon above it is `w:<AphiaID>`
(`w:125553` Pomacentridae, `w:126045` Chromis), never a Key id: the key's families and genera are not WoRMS's (Labridae
holds the Wrasses and the Parrotfishes, Holocentridae the Soldierfishes and the Squirrelfishes; Pycnochromis holds
species the key puts in Chromis), and `f:` / `g:` are the app's sheet ids.

A species' WoRMS page is its Key page (every choice through the Key's tree: its unit, its photos' paths) with the WoRMS
path, tree and selects around it. A **WoRMS taxon's page is read-only** (there is no data shape for a `w:` node): its
cover in force, always the default by the rule (`nodeCover` on its species' photos, as a Key node's; never a ★), and
its children's cards, each with its own cover in force; the bar's select lists WoRMS's families. The filters (below)
pass the Key's leaves, shown here with their WoRMS ancestors, so the same species in both views.

## Node pages

**Every node has a page of its own** (`renderTree`, the tree subjects' builder `TREE_BUILD` `tree`). The sticky bar
shows the path from the root above it (`.adm-crumbs`, each ancestor a link; `admin.js` `ttCrumbs`, every subject's), the
select of the view's nodes of the broadest rank (the families, in the tree's order, labelled by that rank: Family; none
chosen above them), All \| IMR, the tag select (`ttTagSel`), and the select of the node's children (`[data-ttkid]`, the
drill-down: on phones, where the tree is hidden, the way down to a family, a genus or a species; on every page with
children, a key group's included, at every width).

- A **key group** (any node above the unit rank) gets a light page: its children's cards (`.adm-tcard`, each its tree
  row: cover, names, counts, what it needs, ✓, the draft's dot), each opening its page.
- A **family, genus or species** (the unit, or a node under it: `taxtree.js` `ttNearest` finds its unit) shows its
  photos in play, one section per species under it inside one block per genus between them (any depth: `block`), each
  heading with its own cover in force (ringed when his) and its name opening its page, and on each species heading the
  candidates still waiting (`autosort.js` `fishWaiting` over the photos in play, as Coverage's). The bar shows its cover
  in force and why (`admin-covers.js` `nodeCover`, `nodeCoverWhy`: "Your ★ cover", else "Default: Most seen near
  <centre>: N observers" for a node with species under it, the default cover rule as `autosort.js` `fishCoverOf`; for a
  species "Default: its first photo (featured, then the easiest)", `autosort.js` `fishLeafCover`, as the app's sheets;
  his ★ on a juvenile or out of play said), with a link to Cover proposals while the rule's other pick of a node he
  covered is open ([admin-photos.md › Cover proposals](admin-photos.md#cover-proposals)); its species and photos in
  play.
- **★ Cover** on a photo sets the cover of the page's node (`fishTile` `o.lv`, its `data-cvk`: `curation.json`
  `fish.genera[<node id>].cover`, one Undo step, Publish names it rank by rank); each photo marks the covers it is
  (Family · Genus · Species cover). A node's photos (`fuNodePhotos`: the family's `fuFam` list, else its species' in the
  tree's order) are the ones Cover proposals reads too.
- **A family's page**: the book's family (English name, the scientific names below, an **IMR** tag on the families and
  genera in the IMR course, its IMR name in the tooltip), one block per genus and one section per species with its
  photos in play, featured first, then the game's order (the easiest, then the most reference-like: `core.js`
  `easyRank`), never by who took them (`autosort.js` `fishOrder`); Feature / ★ Cover / Remove / Not this / ×,
  ✓ Validated with what is missing (`fishNeeds`), a wink's card. Only the family's page has the wink card, ✓ Validated
  and what it needs; Feature, Remove, Not this and the rows Not this species and Other species, out of play keep their
  family's id on every page (those rows list the photos of the page's species). The family's choices are in
  `curation.json` `fish` `genera` `{family id: {cover, feat: {species id: [f]}, ok}}`; the families are read through
  `autosort.js` `fishUnits` from `fish.json` `families` / `genera`.
- **A wink family's species** (met only on the surprise cards: a few really good photos, not the whole stock) shows
  `FISHT.wink` (5) of its photos in play: its featured ones, then the surprise card's own (`wink.photos`, by photo id),
  then the page's order (`autosort.js` `fishWinkFold`), the rest behind its **N more** chip (`FU_WALL`, this tab);
  display only, every photo stays in play and counts (observations, covers, what it needs).

## The filters

All \| IMR filters the tree (shared with Coverage, `reefid-admin-fu-imr`) and, beside it, one **tag** (`[data-tttag]`,
`fuFilters`, its options by kind, each with the species it shows under All \| IMR, none disabled; on while chosen,
`.adm-ttag.on`), combined:

- **Circle** N (a unit's `circle`, one per value the units carry; the circle in force, `admin.js` `fuCircle`, with No
  circle for a family taken off the game);
- **Look-alikes** (any, or one pair the IMR course compares: `autosort.js` `fishPairs`, as Photos › Look-alikes;
  `fish.json` declares them between families only, so no genus or species pair; the pairs he withdrew or added are listed
  too, saying so: "Structure", below);
- **Needs photos** (a species under its target: its heading's warning);
- **Needs work** (a family whose ✓ Validated waits: `fishNeeds`);
- **Draft** (a node whose own choices changed since the published file: the rows' dot, each change on its node, a photo
  featured counted on its species, a photo's play, crop, rotation, ease, phase or tags on its species: `fuData`
  `dirty`).

Each tag is a test on a node of the Key at the rank its data has, read through the leaves (`taxtree.js` `ttPass`: a
leaf passes when it or a node above it carries every tag chosen), the view on screen showing those leaves and what leads
to them (`ttReach`, the node on screen always): the tree, the families' select, the cards and the drill-down follow it,
in both views; a family's page itself lists all its species. The tag is remembered per subject in this browser
(`reefid-admin-tree-tag-<subject>`; a tag no longer offered reads as none).

## The Sheet box

On a fish node page (`admin-content.js`): above a node's photos, on a family, a genus or a species the app gives a sheet
(`sheetOwn`: never a genus the app opens as its species or family, a wink family or anything in it, or a WoRMS taxon),
every slot its rank declares (`core.js` `SUBJECTS` `content`) with the text players see (`sheetSlots`, on `fish.json` as
built, `FISHC.raw`).

- ✎ Edit (a list one line per item; Source and Link, optional, asked once when an empty slot is filled: Save without
  source), ⊘ Hide, ↺ Restore (Original shows the base); a stale edit shows when edited, now and his, with Keep mine, Take
  the new and Edit; an absorbed one, Remove; an entry never applied shows with Remove. Each click is one draft step
  (`core.js` `contentSet`, `contentDrop`). The entries, their states and how they apply: [content.md](content.md).
- "N sheet edits to check" in the bar of every Tree page (`sheetWarn`, counted by `sheetTodo`: a stale entry, an entry
  never applied, the structure's too).
- Who may edit: `mayContent`, the one hook for the content right (the publishing token today; the sheet's roles, its
  `can_` rights, are to be asked there).
- The Sheet reads the look-alike lines with the draft's pairs in force (`sheetFile`: an added pair's line to fill, a
  withdrawn pair's words listed as never applied; the circles left out, so a family taken off the game keeps its sheet).

## Structure: circles and look-alike pairs

Above the Sheet on a family's page (not a wink family; `admin-content.js` `structBox`):

- its **Circle**: one segment per circle `SUBJECTS` `structure` declares, and None (in no circle); the one in force
  pressed (`circleRow`), each circle's number with its words under it (below); ↺ Restore, Original says the base;
  stale: Keep mine, Take the new; absorbed or never applied: Remove;
- its **Look-alikes** (`pairRows`): the base's pairs, either side's line, and his entries; Withdraw, ↺, Remove; Add a
  look-alike…: the other family, then Source and Link, asked once when left empty, never required.

Each click is one draft step (`core.js` `contentSet` on the `circle` slot, `contentPairSet`, `contentPairDrop`; the
pair key `contentPairKey`). The **Look-alikes filter** (Tag…) lists the pairs he withdrew or added, saying so, and carries
the same tools in the bar (`structBar`: + Pair under Any look-alike, two families chosen there, `structAdd`; one pair's
state and tools under its tag). A Publish that changes the structure (`structChanged`) confirms once, saying it changes
every player's path and progress (`ST_PUBLISH`, in the one Publish dialog), and counts "N fish circle edits" and
"N fish look-alike pair edits" apart from the sheet edits (`contentSummary`). What the structure does to the game:
[content.md › Structure](content.md#structure-circles-and-look-alike-pairs).

**Each subject's own words for its circles.** One declaration, `SUBJECTS` `admin.circles` `{circle: words}`, one reader,
`admin-content.js` `circleWord` / `circleLab`, for every subject that has circles (rule S1; the corals have none): the
fish's (1 IMR course, 2 After the course, 3 Beyond the course: what players already read, "the IMR course's families",
"right after the IMR course's", "beyond the IMR course"; the old "SVS" word is internal, Q182) and the sea slugs' (Stars and
most common, Next most common, Less common: circle 1 holds the stars and the most common species, the next circles the
next ones by commonness, Pierre, 2026-11-15, Q377). Shown beside the number wherever the Tree names
a circle: the Structure box's segments (the number, the words under it, the full "1 · IMR course" as its tooltip, in the
stale view and in "Original"), the **Circle** tag's options ("Circle 1 · IMR course") and the rows and cards' line
("circle 1 · IMR course"). A circle with no words, or a subject with none, shows its number alone, never a made-up word
(rule C2); `tests/structeditor.test.js` checks every circle the units of each subject carry has words. The app's own words
(the circle-3 offer card, the achievements) and the admin's other pages (Coverage, Players, Photo stats) are unchanged. The
words belong to the admin for now: another instance's own words are a data field for a second instance
([content.md › Structure](content.md#structure-circles-and-look-alike-pairs)).

## Names: the shared names of the name index

Under the Sheet on a family's page, where the built file has a name index (`fish.json` `vn`; a subject without one has no
box; `admin-content.js` `namesBox`), folded until opened (remembered in this browser, `reefid-admin-cnames`; open on its
own under the Shared names filter before he chose). It lists the **shared names** the family carries: a name the built
index (`core.js` `treeNameIndex`, without his exceptions) gives to two families or more, and every kind word (razorfish,
toby), each saying its role (kind word, N of M species; species; genus) and the other families that carry it. Each has
three choices, **Accepted** | **Often** | **Off**, the one in force pressed; a click on the pressed one brings the built
reading back. They write `curation.json` `fish` `names` (`{name: {family id: 'on' | 'often' | 'off'}}`, the format the
game already reads: `treeNameIndex`, `typeOff`; [fish.md › The name index](fish.md#the-name-index)) in the draft, one step
each (`namesPut`, `namesBind`), Undo and Publish as every curation (rule A1); the key is kept per name in its first
spelling, an emptied name goes, and Publish counts "N fish name exceptions" (`treeSummary`). **Accepted** gives the name to
the whole family whatever part of it the name designates, **Often** the same with the feedback naming the family gently,
**Off** takes it away from that family; a name he adds is shown as his. The **Shared names** filter (Tag…, group Names,
`fuFilters`) shows the families with at least one such name. What the editor does not do: a species' own list of names
(`fish.json` `cn`: remove, reorder, add) is read by the game from the build alone, so correcting it waits for a stored
format ([ROADMAP "Fish common names"](../ROADMAP.md)).

## The node pages' photo curation, shared by every subject

One implementation for every tree (`admin-nodephotos.js`; Pierre, 2026-11-19: "un code commun entre les matières",
subject differences as parameters or specialised pieces), which replaced the corals' Photos › Genera tab. Shared: a
node's **Removed** list (Pierre, 2026-11-21 05:48: one Remove, one click, an Undo just after, a list of the removed photos
to put one back): the photos removed for good (curation `exclude`) and the ones an earlier Remove took off the site (a published
`hide` entry), one tile and one **Put back** each, one click and one Undo step (`npLists`, `npBind`): a leaf's own, a group's or
a family's those of its leaves; the first root of a view also lists the removed photos no leaf has any more; the Tag… filter
**Removed photos** (`npCount`). Only the draft is written (rule A1). The specificities are declared in `NODE_PHOTOS`, by the data shape the
subject declares (`SUBJECTS` `flat`, `admin.js` `treeShape`, as the Tree's builders):

- **`live`**, the photos in play: the corals' `coralLive` (a section per view, 3 featured each, 2 or 3 zooms,
  Candidates, Not this genus); the fish's their builder's node page (`TREE_BUILD` `tree`: a section per species, ease
  and phase tags, ★ Cover at every rank). Different data (`genera[<genus>]`, `fish.genera[<node id>]`) and tiles; one
  body is a later step (the study's step 8).
- **`removed`, `excluded`**: the corals' `genera[g].hide` and top-level `exclude`; none for the fish yet: their Remove
  (`fish.seen`) returns the photo to Candidates and `fish.exclude` has no tested restore (next step).

## The corals' Tree

`#photos/tree/key/<node id>`, `#photos/tree/worms/<node id>` (`admin-coraltree.js`: its pure part `ctFilters` tested in
`tests/coraltree.test.js`, its admin part `ctTrees`, `ctTree`, `ctRow` read by the corals' builder, `admin.js`
`TREE_BUILD` `flat`; the trees are the corals' tree section, `data/coral-tree.json`, built by `tools/tree_section.py`
`coral_key`, `coral_worms` from `data.json` and `data/names.json` and checked against `core.js` `lectureGroup` and
`slateOf` in `tests/coraltree.test.js`; the tab is the corals' first Photos tab since the former Genera tab was folded
into it, 2026-11-19). None or an unknown id: the view's first genus (Acropora), as every subject's Tree opens on its
first node of its broadest rank. The leaves are the genera, every genus the admin has a page for (`data.json` `gen` and
`x.gen`), each its own name as id and one node in both views (a photo's species is only a name, never curated: no
species rank).

- **Key**: the IMR lecture groups (`data.json` `imrg`, `k:<n>`, rank group), each genus under the group the app shows it
  in (`core.js` `lectureGroup`: a ★ genus with most of its look-alikes, rule L5), numbered genera by number then the ★
  ones; `k:none` (No IMR group) holds Millepora, the bonus and Coral Finder key genera, the slate's first, then A-Z.
  Never the Coral Finder key (`data.json` `key`): its branches are growth forms (rule C4) and a genus sits in several of
  its boxes.
- **WoRMS**: the family WoRMS gives each genus (`data/names.json` `worms`, the extract `tools/taxonomy.py` writes), not the
  lecture's word (Pachyseris in Pachyseridae, Plerogyra in Plerogyridae); the extract holds each genus's AphiaID but no
  family's, so a family is `wf:<its name>` (rank family), never `w:`; a genus it lacks is a tree problem in the bar.
- **A group's or a family's page**: its genera's cards, each as its row on the genus list (cover, No. or ★, photos on
  the site, what it needs, ✓, the draft's dot); no cover above the genera (no stored shape there, and the fish's default
  rule needs observers per genus near the centre that the coral data does not hold).
- **A genus's page**: its cover and why (his ★ or the automatic one), what it needs, and every tool its own page
  had in the former Photos › Genera › Live (`admin-nodephotos.js` `coralLive`: its photos per view with Feature, ★
  Cover, Remove, Not this, Crop, quality and growth form, the zooms, ✓ Validated, the view filter, Candidates, Not
  this genus; [admin-photos.md › A genus's page](admin-photos.md#a-genuss-page-in-the-tree)), above them its Structure and
  Sheet (below), under them the shared Removed list. Its address is `genusHref`.
- **Filters**: All \| IMR (the slate, `core.js` `slateOf`) and Tag… (`ctFilters`: ★ Starred, Look-alikes any or one pair
  of `admin.js` `classicPairs` and of the draft's pair entries, `pairRows`, each saying added or withdrawn, as the
  fish's, Needs work, Candidates waiting, Draft, Removed photos, Excluded photos; never a growth form), read through the leaves as the fish's; the tag in
  `reefid-admin-tree-tag` (this browser). The bar's crumbs and tag select are the fish's (`admin.js` `ttCrumbs`,
  `ttTagSel`).
- **The corals' Sheet and Structure** (the same `admin-content.js` code over `data.json` as the admin holds it): on
  every genus page (`sheetOwn`: a subject with no `SUBJECTS` `sheets` has one sheet per node its slots reach), a
  **Structure** box with its **Look-alikes** alone (no circle: the slate is not the editor's) and the **Sheet** box with
  the corals' slots; the bar's count of edits to check, and the Look-alikes filter's + Pair and pair tools, as on the
  fish's Tree. A pair of the base whose withdrawal the ★ rule would hold (`core.js` `starHold`, rule L5: a starred
  genus's last surveyed look-alike) has its **Withdraw** off, titled "★ rule"; a held withdrawal reaching the draft by a
  merge shows "★ rule" with Remove and is counted to check. Publish counts "N coral genus sheet edits" and "N coral
  look-alike pair edits". Photos › Look-alikes reads the pairs in force, as the fish's page does (`admin-content.js`
  `montPairs`, by the shape the subject declares: the corals' `classicPairsOf` over `data.json` with the draft's pairs
  laid over it, `sheetFile`); the Look-alikes filter above lists the base's classic pairs (`classicPairs`) and the
  editor's entries, so a withdrawn pair's ↺ is reached
  ([admin-photos.md › Look-alikes](admin-photos.md#look-alikes)).

## The sea slugs

The sea slugs are a tree subject ([admin.md › The tree subjects](admin.md#the-tree-subjects)) with the fish's Tree and
photo tools on their own part of `curation.json`:

- Photos › Tree › Key | WoRMS: their reference taxonomy `seaslug.json` `ref` (from `tools/seaslug_worms.py`), built into
  their tree section (`data/seaslug-tree.json`, by `tools/seaslug_game.py` with the tree) like the fish's and read by the
  fish's `fuWormsOf`: a species with no published name yet sits under its genus's WoRMS node (the genus's `ref`; the
  build's `ttFromRef`'s `at`), and a genus-level leaf, which the admin adds at load, under the section's `at` for its genus;
  their families sit under their taxonomic groups
  (`seaslug.json` `taxa`, each family's `tgroup`). All | IMR shows only for a tree the IMR course names; a species with no
  common name shows by its scientific name alone.
- Photos › Candidates: the fish's swiper on `data/seaslug-cand.json`, with their own target (`SUBJECTS` `admin.target`, the
  game's cap) on each species and each genus-level list (`autosort.js` `fishSpecies(J, tgt)`, `fishTarget`,
  `admin-fish.js` `candSpecies`); no auto-sort, so the queue has no Checks switch; an egg-mass judgement (`{egg: 1}`) is
  set aside (`autosort.js` `fishSure`).
- Their rubric's tag rows on a photo's Tags and in words, and the view buttons of Photo review (`SUBJECTS` `admin.tags`,
  declared by each tree subject: the views, the light and the flags differ from the fish's, the rest comes from
  `core.js` `treeRubric`; read by `admin.js` `tagRows`, `tagFlags`, `tagWords`, `tagText`).
- The content editor's Sheet box on their Tree's node pages (`SUBJECTS` seaslug `content`; their structure:
  [content.md › The sea slugs' structure](content.md#the-sea-slugs-structure)), To do › Health, and their reported
  photos with the photo tools; a report's unit opens its genus's node (`repUnit`, the report's Open link: a unit narrower
  than the tree's families).
- **Genus-level photos** (`gl`, `sp` the genus's id; observations agreed at the genus only): a leaf of their own after
  their genus's species (`glId`, "*Genus* sp.", rank "genus level"; `leafSid` gives the unit a leaf's photos are in play
  for), their own row in the family's page (`fuFam`), counted in the genus's photos but never as a species, their
  ★ Cover the genus's (their path stops at the genus), Not this to a species of the family, and in a report's Attach
  list of the genus (`repUnitPhotos`, `core.js` `treeGlOf`).

## The generic tree (`taxtree.js`)

Pure functions with no DOM and no subject (rule S1), loaded by `admin.html`, tested in `tests/taxtree.test.js`, working
whatever the number of levels.

- A classification is a list of nodes
  `{id, name, rank (any word, or none), up (its parent's id in that classification, none for a root), …}`; one parent per node and per classification (the key, WoRMS: each its own tree); groups (IMR
  entries, circles, look-alikes) are tags read as filters, never extra parents.
- `ttBuild` builds the children index once (siblings in the order given) and reports what is wrong (a duplicate id left
  out, a parent not found or a cycle: the node becomes a root), never fixing it silently.
- `ttPath`, `ttUnder`, `ttLeaves` (the leaves: the subject's playable rank), `ttRoll` (a sum over the leaves at every
  node, once), `ttFirst`, `ttNearest` (the nearest node on the way up a test accepts: a node page's unit).
- `ttPass` (the leaves a set of filters lets through: a leaf passes a filter when it or a node above it passes the test,
  the set when it passes every one, so tags at different ranks combine and the leaves carry the result to another
  classification of the same leaves), `ttReach` (the nodes shown for those leaves in a tree: each with what leads to it,
  never a node with none under it, plus the node on screen), `ttShown` (one filter alone: the nodes a tag accepts, what
  leads to them and what is under them, through the two).
- `ttRows` (the rows on screen from what is open and shown, with the ARIA level, position and set size) and `ttKey` (the
  WAI-ARIA tree keys).
- `ttSection(sec, view)` reads a view of a subject's tree section (below): its nodes as `ttBuild` takes them (copies),
  the build's problems and `at`; the admin reads every subject's trees with it.
- `ttFromRef` builds the nodes of a classification from a reference table (a parent-pointer table keyed by the
  reference's own ids, `{key: {name, rank, parent}}`) above the subject's leaves: each leaf keeps its own id (two leaves
  may share one reference), each ancestor becomes one node once with the id and rank word the adapter maps (`o.id`,
  `o.rank`), and a leaf with no reference or one the table lacks, a parent the table lacks (the node becomes a root) and
  a cycle (through `ttBuild`) are reported. The admin no longer calls it: it is the JS reference of the build's Python
  port (`tools/tree_section.py` `from_ref`), which `tests/treesection.test.js` holds to it on the real data.
- It never assumes a number of levels or rank names: a subject's build turns its references into nodes ("The tree
  section", below).

## The tree section (`tools/tree_section.py`)

Pierre, 2026-11-13 (Q339-Q341): the Tree "works for any subject: each subject builds its own tree from its own
references". Each subject's build writes the subject's two classifications as a file of its own,
`data/<subject id>-tree.json` (`data/fish-tree.json`, `data/seaslug-tree.json`, `data/coral-tree.json`; admin only, in
the repository's `data/` as `names.json` and `fish-cand.json` are: players never download it, and `data.json`, `fish.json`
and `seaslug.json` keep their keys): `{"v": 1, "views": {"key": {"nodes"}, "worms": {"nodes", "problems", "at"}}}`, one
node per line. A node is `taxtree.js`'s own, `{id, name, rank, up}`, with what the rows read: for the tree subjects `sci`,
`it`, `unit`, `sid`, and `imr` / `imrWith` (the IMR course's tag, which the admin turns into the row's tag); for the
corals `genus`, `grp`, `num`, `slate`, `star`. `problems` are what hanging the leaves on the reference found (a leaf with
no reference, a reference or a parent the table lacks), shown in the bar with the tree's own; `at` says, for each genus of
the Key, the WoRMS node a genus-level leaf of its own hangs under.

- **One module builds them, one function reads them.** `tools/tree_section.py` holds the shared helpers (`from_ref`, the
  Python port of `ttFromRef`; the section's layout) and one adapter per data shape, listed in its `SUBJECTS` (a new
  subject adds its own and nothing else, rule S1): the tree subjects' (`tree_key`, `tree_worms`: `fish.json`, `seaslug.json`,
  one shape) and the corals' (`coral_key`, `coral_worms`: `data.json` and `data/names.json`). The admin reads a section
  through `taxtree.js` `ttSection`, builds nothing, and adds only what the sources cannot give: each node's unit record
  (`u`, `g`) and IMR tag from the units the page holds, and the genus-level leaves, which come from the candidates and the
  game's photos (`admin.js` `fuGlLeaves`).
- **When it is written.** By the tool that writes its source: `tools/build_fish.py` (after `fish.json`),
  `tools/seaslug_game.py` (after `seaslug.json`), `tools/taxonomy.py` (after `data/names.json`) and `tools/datajson.py`
  `dump` (after `data.json`); `python3 tools/tree_section.py` writes them all, `--check` fails on a section that is
  missing or is not what its sources give, which `tests/treesection.test.js` runs.
- **What is held.** `tests/treesection.test.js` holds the real sections to the shared JS functions (`autosort.js`
  `fishUnits`, `taxtree.js` `ttFromRef`, `ttBuild`) and `tests/coraltree.test.js` to `core.js` `lectureGroup` and
  `slateOf`; the admin's reader is run on made-up sections.
- **No section yet** (the file is missing): the Tree says so, with the command that writes it, and its other pages are
  not affected.
