# Fish content (`fish.json`)

The fish subject's content: its two trees, the game's units, the circles, names, presence, commonness, the
identification groups, and the covers each unit shows. This is the specification of what the code does now; why each
part was decided is in [docs/decisions/](../decisions/README.md), [FISH_PATH.md](../FISH_PATH.md) and the PRs.
[DATA.md](../DATA.md) is the short table of the data files; the fish photos (sources, candidates, the photos in play)
are in [fish-photos.md](fish-photos.md); the subject's place in the taxon model in
[ARCHITECTURE.md](../ARCHITECTURE.md) "Subjects (the taxon model)"; the content editor's edits laid over `fish.json` in
[content.md](content.md). The fish run on the same engine as the corals: the app reads the file through `core.js`
`treeGen`.

## Files

- `tools/fish_source.json` (hand-maintained, the sources' part; its `_doc` key explains every field): the regional
  identification keys (`keys`), the teaching nodes with their reference mapping, the species list in PDF order (its
  `id`, `name` and the other sources' common names), the circle-3 sources (`sources`) and the retired ids (`retired`).
- `tools/instance.json` `key`: the identification key in force, one of `keys`.
- The IMR instance's layer, `tools/instances/imr/fish.json`: each teaching node's circle, IMR tag (`src: imr`), dive-sign
  mark (`sign`), slides (`sl`), cues, look-alike lines and phase lines from the IMR fish presentation, the sub-entries'
  slides and cues, each species' presentation slide (`sl`), the PDF species' common name, section, pages and cheatsheet
  rank (`common`, `sec`, `pdf`, `cs`) and the presentation's own species (`src: slides`), the starter core `start` and
  the declared look-alike groups `look` ([data.md › The instance's layer](data.md#the-instances-layer)).
- `tools/build_fish.py`, the build, documented at its top: it reads the two, composed by `tools/instance.py`
  `fish_source`, and writes `fish.json`. `tests/fish.test.js` checks its structure.
- Only derived lists are in the repository, never the PDF or the slides.

## Two trees

- `ref`, the reference tree from WoRMS, keyed by AphiaID, from the WoRMS class down to the species:
  `{name, rank, parent, syn, inat, iname}`: `name` the accepted name; `rank` as WoRMS gives it (no fixed ranks,
  unranked clades kept, missing ranks skipped); `syn` the WoRMS synonyms, accepted when typed; `inat` the iNaturalist
  taxon id; `iname` iNaturalist's name when it differs.
- `teach`, the teaching tree: the 27 entries of the IMR presentation (level 1, circle 1) in its order, then the other
  circles; level 2 = species. Each node: `id` (stable, never the name), `name` (as IMR names it), `fam` (as IMR writes
  it; `wfam` the WoRMS families when they differ, e.g. Groupers: Epinephelidae), `group` (its group in the key in force),
  `level`, `circle`, `src` (imr / pdf / diver / wink), `wink`, `note`, `why` (circle 3: why divers want it), `ref` /
  `not` (the AphiaIDs it covers / leaves out), `species` (the ids of its species in the game, the most commonly met
  around Dauin first: "Commonness" below), `sl`, `cues`, `look` ([teaching id, how to tell it apart]), `phase`, `sub`
  (the sub-entries IMR names inside an entry: Chromis / Dascyllus / Pomacentrus / Anemonefish, Bannerfish, Surgeonfish /
  Unicornfish). The units are built from it (`core.js` `treeGen`), and the tools read it (`fish_photos.py`, the judging,
  the photo tools).

A species belongs to the node whose `ref` holds its nearest ancestor (the most specific wins), its genus being the genus
of its PDF name (Chromis agilis stays under Chromis though WoRMS has it in Pycnochromis).

## The game's units: families, genera, species

The game's units are not the IMR entries: the IMR course is a tag ([plan](../reviews/2026-11-06-fish-units-plan.md)).

- `tools/build_fish.py` `add_families` writes `families`: the identification key's family labels inside its 20
  groups, the book's English name, `sci` the scientific names they cover; each game species is placed by walking up
  `ref` to its first label (*Amphiprion* in the Damselfishes, *Diploprion* in the Soapfishes); ids are `f:` + the
  label's letters (`f:MoorishIdol`). It writes `genera` (`g:<Genus>`, the PDF name's first word, with its `family`) and
  gives each game species its `family` and `genus`.
- **The IMR tag**: `imr`, IMR's name, on the family that carries an IMR entry (with its slides `sl`, cues, look-alike
  lines as family ids, phase lines, juveniles) and on the genera an IMR sub-entry names (Anemonefish = *Amphiprion*,
  Bannerfish, Unicornfish, Surgeonfish on three genera; Chromis, Dascyllus, Pomacentrus); `imrWith` on a family whose
  species IMR teaches under another (the Soapfishes: Groupers).
- **Declared look-alikes beyond IMR**: the IMR instance's layer `look` ({src, key, groups of family ids, note}): the
  Butterflyfishes–Angelfishes, the Snappers–Coral Breams–Emperors, the Parrotfishes–Wrasses (some wrasse species only),
  the Soldierfishes–Squirrelfishes–Cardinalfishes and the Triggerfishes–Filefishes. Every pair of a group is a
  look-alike both ways, applied while its `key` is in force; each family's `lsrc` ({family id: source}, as `data.json`
  `gen` `lsrc`) names IMR's slide, then the declared source (`IMR fish presentation, slide 10 and Pierre, 2026-11-06`).
  A family id that is not a family stops the build. They seed the traps and the confusion groups until pooled fish
  answers exist (rule L7).
- **The game reads them**: `core.js` `treeGen` (one unit per family; the starter core is the families of `start`'s
  entries; typed names: the book's, IMR's and the scientific ones), `app.js` `treeGenera` (the genera inside their
  family), `model.js` `openPick` ("I'm at IMR" opens the IMR-tagged units first).
- Old entry ids saved on a device or in an account (t01) move to their family at every load (`app.js` `unitsRenamed`,
  `sync.js`: `core.js` `renameUnits`; Groupers keeps IMR's Groupers, the Soapfishes start unmet). `core.js`
  `FISH_RENAMED` holds each old entry id and the family holding most of its species (fish.json `families`; the
  [fish units plan](../reviews/2026-11-06-fish-units-plan.md)), `split` (the genera of an entry that went to another
  family) and `names` (each family's name); it is read through `SUBJECTS` `renamed` (`renamedId`, `renameUnits`,
  `renameLogEntry`), checked against fish.json by `tests/fishrename.test.js`, and kept while old ids may still arrive
  (an old app, a saved copy, the log).

## Circles

- **Circle 1**, the IMR core: the 27 entries, their species from the EventMeasure reference PDF "Common Filipino
  Fishes" and the slides. Silvery and pelagic families are not in circle 1.
- **Circle 2**: families seen sometimes on SVS video (among them the barracudas, trumpetfishes, shrimpfishes and
  sweepers).
- **Circle 3**, "beyond IMR", **not PDF-based**: the fish families divers want to recognise, muck diving above all
  (Pierre's list and Dauin dive guides, cited in `sources`), with every species of them confirmed near Dauin, in the
  PDF or not.
- Every circle is on the path and counts in the progress; circles 2 and 3 open after circle 1, and circle 3 opens only
  once the player says yes (asked by a card and in My progress), counting in the % either way (`UNITS.fish` `opens`;
  [LEARNING.md](../LEARNING.md) "Circles").
- **Winks** (`wink`): the whale shark and the pelagic thresher, unmistakable and fun to meet, a light bonus rather than
  ID training. A rare surprise card in the quiz, late and once per player (`quiz.js` `WINK.AT`: the first wink from 200
  fish answers, the second from 400); one photo, one of its 2-3 most beautiful (`wink.photos`:
  `tools/fish_wink_photos.json`, written by `tools/build_fish.py` `wink_photos`: those Pierre's curation left in the
  game, else the unit's easiest); its answer among 3 deliberately absurd choices taken from our own entries, each with a
  tongue-in-cheek label (`wink.choices`: [teaching id, label], e.g. "Damselfish (a well-fed one)" for the whale shark),
  then one friendly feedback line (`wink.right`, `wink.wrong`; Pierre validated the texts of both). Never counted in
  the progress, no effect on photo ratings.
- **A species is in its family's circle**: its teaching node's circle, whatever its source; a species off the IMR list
  (`src: dauin`, `wink`) comes in only once confirmed near Dauin, as every circle-3 species (`build_fish.py`
  `needs_near`).
- **Every species confirmed near Dauin of a game family is in the game**: every Research Grade fish species within 40
  km of Dauin (iNaturalist `species_counts` per class, names and families resolved on WoRMS) whose first key label is a
  game family and that 2 or more distinct observers saw. A few have no common name in any reference.
- **The soapfishes are one family, as in the book**: `f:Soapfishes` (the key's label, Grammistidae and
  Diploprioninae) holds *Diploprion bifasciatum* and the Grammistidae *Grammistes sexlineatus* and *Pogonoperca
  punctata*, all circle 1; the Groupers entry's references include Grammistidae so the build files them (the family by
  its key label), and the family keeps `imrWith` Groupers, without the Groupers' cues.
- **Each book label is its own family**: the triplefins and the convict blennies apart from the blennies, the dartfishes
  apart from the gobies. The Dartfishes are the key's own label, WoRMS subfamily Ptereleotrinae of Gobiidae, shown as
  *Ptereleotrinae*; the Gobies are the key's Gobies label, Gobiidae and Oxudercidae, without the dartfishes and the
  wormfishes (Microdesminae, not decided). The Thresher sharks are a label Pierre added ("Identification groups" below).

## Names: EventMeasure and the PDF first, WoRMS as an indication

EventMeasure's species come from a fixed pick list, probably the PDF's, which may lag WoRMS: the name shown and expected
is the PDF's (`name`); the WoRMS accepted name goes beside it (`now`, shown as "now X in WoRMS"), and typed answers
accept both (and the WoRMS synonyms). Two PDF species that WoRMS treats as one (Pomacentrus armillatus, P.
opisthostigma) stay two entries. Likely slips in the PDF (a spelling WoRMS does not know, two common-name typos) are
kept as written and flagged in `check` for Pierre to check against EventMeasure. Only by Pierre's decision is a PDF
spelling shown another way: the source row's `shown` (its reason and date in `shownWhy`) is the name shown, expected and
looked up in WoRMS, and the source's `name` keeps the PDF's (`tools/build_fish.py` `shown_name`). s278, "Neoniphon
argentus" in the PDF, is shown as *Neoniphon argenteus*, the spelling of FishBase, WoRMS and iNaturalist, with no "now"
note; typed, the PDF spelling reads as a slip of it (right, with the spelling step).

## Presence: confirmed

Rule C8 (the same scientific rigour for everyone, Pierre included), defined once in `tools/presence.py`.

- **Confirmed near Dauin** (`near`, its reasons in `nearBy`; `near_dauin`): `observers`, Research Grade observations
  within 40 km of the instance's centre by at least 2 distinct observers; or `imr`, the species is in the IMR reference
  list (the EventMeasure PDF "Common Filipino Fishes", `pdf` pages: what IMR uses as its reference for the fish seen at
  Dauin, despite its name).
- **Confirmed in the Philippines** (`ph`, its reasons in `phBy`; `ph_confirmed`): `observers`, Research Grade
  observations in the country (place 6873) by at least 3 distinct observers (`phU`, asked only when `rg` >= 3 and
  nothing else confirms it); `checklist`, at least one Research Grade observation in the country (`rg`) and FishBase's
  country checklist lists it (Table 1 "present", `chk`; `tools/presence_checklists.json`, names matched through the PDF
  name, the WoRMS name, iNaturalist's and the WoRMS synonyms): a checklist alone never brings in a species nobody
  observed; or `near`, confirmed near Dauin (so an IMR-list species is in the Philippines).
- **Pierre's own observations** (`ppericard`), two halves (rule S2): for **presence**, he is one observer like anyone
  else: his Research Grade observations count, his Needs ID ones confirm nothing on their own; for **photos**, his photos
  identified to the species stay usable as that species even when Needs ID (he names a species only when nearly sure),
  `own` counting them anywhere.
- `present` = `{dauin` (Research Grade observations within 40 km of Dauin), `dauinNI` (the Needs ID observations there:
  such a species is "not confirmed near Dauin", never "never seen"), `dauinU` (their distinct Research Grade observers),
  `near`, `nearBy`, `rg`, `phU`, `chk`, `ph`, `phBy`, `own``}`. Not used: the number of identifiers (a well-identified
  rare fish often has only two) and the date (recency says nothing about the identification).
- **Circle 3, and every species off the IMR list,** also need `near` (`build_fish.py` `needs_near`): such a species not
  confirmed near Dauin is out of the game (`out`: "not confirmed near Dauin"), kept in `fish.json`, taken out of its
  teaching node's lists (`tests/fish.test.js`).
- `python3 tools/build_fish.py --near` recomputes `dauinU`, `near` and `nearBy` on the existing `fish.json`, and with
  them `ph` and `phBy` (they depend on `near`; the national observers are asked when the rule needs them), taking out of
  the game a species no longer confirmed (the rest of the build unchanged; a species newly confirmed comes in with a
  full build, which applies the whole rule). `tests/presence.test.js` checks every species' `ph` against its own fields.
- The same rule decides the coral photos from abroad (`tools/fetch_local.py`'s last tier) and the admin's "out of rule"
  flag ([data.md › Presence of coral species](data.md#presence-of-coral-species-presencejson)).

## A species record

`{id, name, now, common, ref, inat, circle | out, r, cmi, present, src, sec, pdf, cs, sl, check, photoTaxon}`: `r` the
rank (the PDF cheatsheet's 24 most sighted first, then PDF order), `cmi` the commonness index within its entry (0-1),
`sec` the PDF section (`photoTaxon`: [fish-photos.md › Photo taxon](fish-photos.md#photo-taxon)). A species not confirmed in the Philippines,
or a PDF species whose family is in no circle, is out of the game (`out` says why, no `circle`) but stays in
`fish.json`: the Fish ID Key for EventMeasure holds every species of the PDF, unfiltered ([below](#the-fish-id-key-lab)).

## Curated common names

1 to 3 per species, none for a species no reference names (it has no common-name unit), published as selected
([FISH_PATH.md](../FISH_PATH.md) "Common names").

- `tools/fish_common.json` holds each game species' names, at most 3, every name with its sources: first the
  **main name**, iNaturalist's default English name (else FishBase's main English name, else `fish.json` `common`); then the
  species' own name, `common` (the PDF's, IMR's wording, rule C1), when it is not the main name already; then FishBase's
  and iNaturalist's main names when found in both, the most shared first. Spellings of one name are merged into `alt`
  (accepted when typed); `imr` is the place of the IMR name in the list, which a player at IMR sees first (every other
  player sees the main name first; both are always accepted); the regional standard names (the Australian ones) are
  accepted when typed, never shown. Its inputs, FishBase's and iNaturalist's English names per species, are in
  `tools/fish_common_src.json`; both are written by `tools/fish_common.py` (`--inat`, `--fishbase DIR`, then offline;
  `--check`, run by `tests/fish.test.js`).
- `tools/build_fish.py` `add_families` (every build path, `--regroup` the quickest offline) writes them into
  `fish.json`, species `cn`: `[[name shown, other spellings…], …]`. Two species may carry one name: nothing is dropped
  for it, each such name is flagged `shared` and listed in the file's top-level `shared` (name → species ids).
- **His own list for a species** (`curation.json` `fish` `cn`, `{species id: [1 to 3 names, the main first]}`; the
  sea slugs' part would read the same key from their own part, `SUBJECTS` `admin.cur`): `core.js` `treeCnApply`, run
  by `contentApply` on every path (the app's `treeBuild` into `TREEF`, the admin, the sheet's replay), lays each clean
  list (`treeCnClean`: 1 to 3 names with letters, none twice as typed names read them) over its species' `cn`
  (`treeCnLay`): a name the build lists in some spelling keeps its other spellings, a new one has none, the list's order
  is his, `cni` follows the IMR name to its place and goes when the list drops it, `cnr` stays. A species with no entry,
  an entry that is not a clean list or a species the file does not know keeps the built names; a species with no built
  list is left alone whatever the entry says, so a list never changes whether a species has a progress unit
  (`treeSpUnits`, `treeScoreTree`, `treeReplayGen`: the sheet needs no gate). The name index (`treeNameIndex`), the typed
  names and every `cnFirst` reader read the file in force (`TREEF`), so a name he takes out is no longer accepted when
  typed. `fish.json` is not changed: `vn` (the kind words) and `common` (the PDF's name) stay as built. Written in the
  admin's Common names box ([admin-tree.md](admin-tree.md#common-names-a-species-own-list)). Tests:
  `tests/fishcnames.test.js`, the Common names step of `tests/admin.smoke.js`.
- The game reads them through `app.js` `cnList`, `cnShow` (the name a multiple-choice question shows: the player's
  first, `cnFirst`), `cnTypeNames` (typed: only the listed names and their spellings, a name two species list right for
  the species asked, a kind word of `vn` known) and `cnAlso` (the species sheet's "Also used for …", `learn.js`
  `spAlso`), for the species level. `model.js` `choiceApart` keeps two choices of one label (`choiceKey`, letters only)
  off one question, `choiceKeys` keeps a wrong choice off any listed name of the target (a species unit's `also`), and
  `quiz.js` `duelPick` and `planDuel` never pair two units one label names (`choiceNames`: no duel "Brown damsel or
  Brown damsel?"). The genus questions' "common name" nudge (`typeOther`) and the family questions' name index read them
  too. Tests: `tests/fishcommon.test.js`.
- A unit labelled by its scientific name (a fish genus, any subject's genus) shows its common name in bold right
  after it on its first-meeting card, above the family line (`quiz.js` `introCard`, `app.js` `unitCname`: the
  record's `cname`, a genus's fish.json `common`, else its first English name; Pierre, 2026-11-20). Tests:
  `tests/scigenera.test.js`, `tests/fish.smoke.js`.

## The name index

[The study](../reviews/2026-11-09-shared-common-names.md).

- `fish.json` `vn`: the kind words of the species' names shown (razorfish, toby, spinefoot),
  `[[word, [[family id, role, n, of, [species ids]], …]], …]` (role `k` when at least 2 of the family's game species carry the word or all of
  them, `w` for one species' word; never a word of a "False …" name or a family's own name), written by
  `tools/fish_names.py` (offline summary; `--check`, run by `tests/fish.test.js`) through `tools/build_fish.py`
  `add_families` (every build path, `--commonness` included).
- The app completes it from `fish.json` itself (`core.js` `treeNameIndex`: `sp` a listed species name, `ss` a species'
  scientific name, `gs` a genus's, `gc` a genus's common name, each with `sc`, the species it designates) and Pierre's
  exceptions (`curation.json` `fish` `names`, set in the admin's Names box on a family's Tree page:
  [admin-tree.md › Names](admin-tree.md#names-the-shared-names-of-the-name-index)); `treeGen` `scopes` gives the IMR genera
  and sub-entries their species.
- `treeTypeNames` reads every name as the family it lifts to, with `sc` when it names part of it only (one key of a
  family read by two names takes the wider); `typeFits(m, t, sp)` says whether a reading names unit t as the photo shows
  it (sp: the photo's species, `quiz.js` from `app.js` `photoTaxon`; unknown: read as before). A name of part of the
  family not designating the photo is a mistake with no unit given (`quiz.js` `typeUnit`); a name several families share
  is right on each that it designates (`typeMatchIn` `shared`). Feedback lines: `quiz.js` `typeRead` (`typeSays`,
  `typeWhose`; "…, not this one.").

## Commonness

Each species of a teaching entry gets `cmi`, a commonness index within its entry, and the entry's `species` (and its
sub-entries') are in that order, so the species path opens the most commonly met first. Three signals: field counts near
Dauin (weight 3; `tools/fish_commonness.json` `field`, each source with its citation and licence: CCEF Siquijor 2025
presence per MPA, Ferrandis 2021 Dauin stereo-video counts), the IMR 24 most sighted (`cs`, weight 2), and iNaturalist
distinct observers within 40 km, 250 km and the Philippines (weight 1; `tools/fish_commonness_inat.json`), shrunk toward
the entry's mean with M = 5. Computed by `tools/fish_commonness.py` (`apply()`), written by `tools/build_fish.py` (the
full build, `--near`, `--commonness`; `--commonness --check`, run by `tests/fish.test.js`, fails when `fish.json` is not
as the index gives it). Method and biases: [FISH_PATH.md](../FISH_PATH.md) "Species order: the commonness index".

## Name roots of the fish genera

`fish.json` genera carry the same `root` as the coral genera (`p`, `fit`, `warn`, `src`:
[data.md › Name roots](data.md#name-roots)), read from The ETYFish Project (etyfish.org, C. Scharpf) into
`tools/fish_genus_roots.json` (`genera` {name: {page, ety (the start of its entry, verbatim), p, fit, warn}}, `skip`
{name: why}). `warn` (the name study's misleading root): the other families whose IMR cue the root names (a gill-cover
spine, barbels, a line or band, bone, blue, yellow, no visible teeth), each `[family name, one of its IMR cues
verbatim]`; 10 genera (Pomacentrus and Plectropomus: the Angelfishes' "Spine on the gill cover (opercular spine)").

- `tools/build_fish.py` `add_families` (`genus_root`) builds it on every rebuild (`--regroup` applies an edit offline)
  and stops when a meaning or word is not verbatim in `ety`, the parts do not spell the name, a warning names the
  genus's own family, a cue not verbatim in that family's or one of the genus's own (or comes with a `fit`; a family
  the key in force does not have is left aside, as another key's genus marks are, and `tests/roots.test.js` checks that
  every warning reaches `fish.json`), or a genus of any circle (1-3, all of `fish.json`'s) has neither a root nor a reason in `skip`. A fish part may have no word, or be another
  genus the entry names (fifth item `genus`: "the genus *Pomacentrus*") or the person it says the name honours
  (`honours`). A genus with no root is never an omission: its `skip` line says why (the root is a guess or unknown, has
  two meanings, names an old genus or reads against its own family's IMR cue: rules C1, C2). The genera
  a content editor's circle edit brings into circle 1 that have no root are listed by the build with that reason
  (`show_rootless`: after its reports, after `--regroup`, alone with `--rootless`;
  [content.md › Structure](content.md#structure-circles-and-look-alike-pairs)).
- Shown by the same `rootLine` (counting the shared ending among every fish genus, "among the fish") through `learn.js`
  `treeRoot`, on the one sheet the genus opens (`treeSheets` `go`): its genus page, its one species' sheet, or its
  family's sheet when it is that family's only genus; a warning names the families in plain text ("Careful: the name
  echoes the ID tip of Angelfishes (“Spine on the gill cover (opercular spine)”), not one of its own.").
- `tests/roots.test.js` (every meaning and word in the ETYFish entry, every genus rooted or skipped, every warning
  another family's cue verbatim, the build's refusals), `tests/fish.smoke.js` (Zanclus's species sheet, Amphiprion's and
  Pomacentrus's genus pages).

## Identification groups: the regional key

Rule S3: the fish groups come from the identification key of the deployment's region, never from a list of our own.

- `tools/fish_source.json` `keys` holds the keys (`id`, `region` {name, area}, `cite` the full citation, `short` its
  short form, `src`, `groups`: `n`, `title` exact, `pages`, `labels` [label as the key prints it, [WoRMS accepted names
  it covers], note]); the key in force is `tools/instance.json` `key` (`tools/instance.py` `fish_source` lays it as
  `deploy.key`): here the index of the 20 identification groups of *Reef Fish Identification – Tropical Pacific*,
  2nd ed., which the IMR course follows, transcribed from Pierre's screenshots of its index.
- `build_fish.py` gives each teaching node the group of the first key label met walking up WoRMS from each of its
  references (a subfamily label wins: Parrotfishes over Wrasses) and fails, naming the node, when a node in the game
  (any circle, winks aside) has no group or spans two, unless the source makes it explicit (`keyGroup` {key id: n};
  null with `keyWhy` while a node waits for Pierre, printed by the build; none waits now).
- A label the book does not print is added only by Pierre's decision, its note saying so: *Thresher sharks*
  (Alopiidae) in group 20, Sharks & Rays (seen on the reefs in the Philippines, at Malapascua above all), so the
  thresher wink has a group too.
- `fish.json` `key` = the key in force without its labels (`treeGen` `key`, `groups`); the app shows the key's numbers
  and titles, `cite` on the families page and `short` everywhere else (one edit changes both).
- `python3 tools/build_fish.py --regroup` applies the key to `fish.json` again offline from its own reference tree
  (after an edit of `keys`, the instance's `key` or `keyGroup`, or to settle a merge of `fish.json`); `--regroup
  --check` (run by `tests/fish.test.js`) fails when `fish.json` is not as the key gives it. A region with no key has no
  group rule (`tools/instance.json` `key` unset); a key for another region is data only.

## Starter core and judged photos

- `fish.json` `start` (from the IMR instance's layer, `tools/instances/imr/fish.json`) lists the circle-1 entries met
  first (`treeGen` marks them `first`, `model.js` `openPick` opens them before any other).
- `dimorph: true` on a teaching entry whose presentation phase lines say the sexes or colour phases differ (Parrotfish,
  Anthias).
- `juv` on every circle-1 entry: its juvenile class (A, B, C, mixed with `early` / `late` genera or species, ns),
  `trait`, Pierre's `obs`, `note` and sources (`src`, `by`), from a research note; `tools/fish_judge.py` caps the ease of
  a juvenile photo unless its entry is A or its species is in `early` (`judging/FISH.md`).
- `tools/fish_judge.json` `add` holds the photos a judging pass added for entries short of very easy ones (from
  `data/fish-cand.json`).
- Each judged photo carries `e` (ease 1-5), `jt` (its tags) and maybe `c` (a proposed crop `[l, t, r, b]`, never
  applied), written by `tools/fish_judge.py` from `tools/fish_judge.json` (rubric: `judging/FISH.md`;
  `tools/fish_photos.py` applies them again on a rebuild, `--check` tells whether the file is current).
- `treeGen` orders each entry's photos with `easyRank`: the easiest first, by the judged ease, then the most
  reference-like by their tags (`refScore`: the reference flag `r`, then profile, whole fish, good light, no colour loss,
  sharp, large, one fish), never by who took them; and makes the first the card's `cover`, so the families list, Home
  and the cards show it too. The app ranks them again on `model.js` `photoDiff` (`app.js` `rankPhotos`, at load and with
  each new photo statistics reply), so the players' ratings take over once fish answers are logged. `model.js` reads `e`
  in `photoDiff` (the prior), in the `RARE` cap (`rareCap`: until a unit reaches Open Water, its photos under ease 4,
  or its `RARE.FEW` easiest when it has fewer, make at most `RARE.SHARE` of the photos drawn) and in `easyTrust`
  ([LEARNING.md](../LEARNING.md) "Fish: the starter core and judged photos").

## Covers

### Pierre's choices per family in the app

`curation.json` `fish` `genera` `{unit id: {cover, feat: {species id: [f]}, ok}}` (the admin's Tree page, `autosort.js`
`treePick`) is applied after the build (`app.js` `treeBuild` → `treeCurate`, run again whenever the curation is):

- **★ Cover** becomes the unit's `coverP`, which `cover()` reads first (as a coral genus's), so the Learn families list,
  the family sheet's hero and its look-alike cards, the first-meeting cards, My progress, a wink's surprise card and
  Home show it (Home's landscape tiles and the Identify door's art only when it suits them, `home.js` `tilePhoto`; the
  Learn band shows, one a day, it or one of the family's reference photos that suit a tile, among those served from R2,
  `landPool`, `bandPhoto`, `dayPick`), while it is among the unit's game photos (`views.wide`, matched by photo id:
  `core.js` `treePid`), else the default cover (below); `rankPhotos` never takes his pick back.
- **Feature** becomes `featP` `{species id: [photo]}`, the photos still in play of that species in his order, which lead
  that species' photos on the sheets (`learn.js` `treeSpPhotos`), as the admin's page shows them (`treeOrder`).
- **A genus's and a species' ★ Cover** sit in the same map under their `fish.json` ids, `{cover}` only (`g:Chromis`,
  `s091`), set on the Tree tab's node pages: ★ Cover on a genus's or a species' own page sets that node's cover; ★ Cover
  elsewhere (a report, Health) sets the family's. The rank words are read from `core.js` `SUBJECTS` `sheets`, broadest
  first, never a list of our own (`admin.js` `ranksOf`, `fuRankOf`, rule S1). Each genus and species heading shows its
  cover in force (ringed when it is his pick), the tile marked (Family / Genus / Species cover) (`admin.js`
  `renderTree`, its node pages `TREE_BUILD` `tree`); Publish counts them apart, rank by rank (`pubSummary`: fish family, fish genus cover, fish species
  cover).
- **Another subject** (a nudibranch or plant key, or the corals at more than one rank) needs only data: its ranks in
  `SUBJECTS` `sheets`, its tree on its unit page (the fish page's `treeUnitsOf`: units, then nodes, then leaves), and its
  covers read by node id at build (as `treeCurate` does from `fish.json`); the keys, `treeCover`, `treeDrop` and the
  Publish summary take any rank. The corals today have one rank (the genus: their covers are `curation.json`
  `genera[n].cover`) and no unit page of this kind.
- In the app a genus unit (circle 1) takes its cover as its `coverP`, as a family (`cover()`: its Learn card,
  first-meeting card, My progress); a genus with no unit and a species get it in `TREEU.covers` `{id: photo}`, while it
  is in play as a photo of that genus or species. `learn.js` `genCover` (a genus's cover: `coverP`, else `TREEU.covers`)
  leads the genus's row on the family sheet (then the first photo of its other species) and its card among the sibling
  genera on a genus sheet (the genus sheet has no hero), and `treeSpPhotos` puts the species' cover first (then his
  featured photos, then the game's order): its tile, the first photo of its sheet.
- A photo leaving play (Remove, Not this, a count that takes it out, Out of play and Reject in Candidates:
  `autosort.js` `treeDrop`) leaves every cover and featured list it was in, one Undo step. Neither touches the games'
  photos or their order. `ok` (✓ Validated) is the admin's own. A candidate he adds and picks at once shows in the app
  once the Candidate photos workflow has put it in `fish-game.json`; until then the card keeps the cover as before.
- Tests: `tests/fishcovers.test.js`; `tests/fish.smoke.js` (the Learn cards and the family sheet's hero).

### A juvenile is never a cover

At any rank, picked or not: juvenile = its phase word (`autosort.js` `treeJuv`: `treePhase`, his phase and tags, else
the pass's, else the source's life stage; in the app a record's `ph`, which `tools/fish_game.py` writes the same way, or
its tags' juvenile flag: `app.js` `juvP`). Only the juvenile phase is barred: a male, female or intermediate photo is a
cover like any other. The default rule alone never takes a juvenile.

- **One exception, Pierre's own**: his ★ cover on a juvenile holds once he confirmed it (a juvenile can be far more
  popular and recognisable than the adults, the Boxfishes' yellow juvenile for one). The confirmation sits next to the
  cover, `curation.json` `fish` `genera` `{node id: {cover: f, coverJ: f}}` (through the draft and Publish, rule A1;
  `core.js` `merge3` merges it key by key), and holds while `coverJ` names the cover's photo under either name
  (`autosort.js` `treeCoverJ`), whatever the photo's tags say since, so it can be given before a judgement tags the photo
  juvenile; a new pick, taking it off, Remove or an accepted Cover proposal drop it (`treeCover`, `treeDrop`,
  `admin-covers.js` `coverAccept`).
- Every reader takes a confirmed one as his cover in force: `treeCoverOf`, `treeLeafCover` and the species ★ inside
  `treeCoverRule`; `nodeCover` (`by: 'mine'`, `jok`), the Cover proposals; the app's `treeCurate` (`app.js` `coverOk`:
  `coverP` and `TREEU.covers` marked `cj`), `seenCover`'s species pick, `learn.js` `spPhoto` and `spSheetPhotos`, Home's
  landscape tile (`home.js` `landOk`) and `tools/fish_game.py` `first_photos`.
- In the admin, ★ Cover on a juvenile tile asks first ("This photo is a juvenile. Use it as the cover anyway?":
  `admin-covers.js` `JUV_Q`; yes sets the cover with its confirmation, `treeCoverYes`, one Undo step). A pick on one he
  has not confirmed (a judgement made after his pick tagged it) is ignored (`treeCoverOf`, the headings) and flagged:
  "cover ignored" on the tile; "your ★ cover is now judged a juvenile: ignored until you confirm it" in its node's bar
  with the one-click "Juvenile: confirm as cover?" (`treeCoverJOk`); and "N ★ covers now juvenile" in the bar of every
  Tree page, linking to one (`admin-covers.js` `juvCovers`), its button then taking it off. The bar offers the same click
  while an open Light proposal would tag his ★ juvenile (`admin-light.js` `lightJOf`), and Accept on such a proposal
  asks the same question, naming the node (`lightCovers`; yes keeps the cover, confirmed in the same Undo step,
  `lightAccept`'s `keep`; no accepts the tags and leaves the cover ignored until he confirms it).
- The admin finds his pick as the app does, under its name, else the same photo under its other name (`autosort.js`
  `treePhotoAt`, `core.js` `treePid`: a reference photo `fi<id>` and its candidate copy `fish-<species>-cand-<id>` are one
  photo, and the game plays one copy). In the app `treeCurate` ignores an unconfirmed juvenile pick (no `coverP`, no
  `TREEU.covers`), and every default skips juveniles while the unit has another photo (the card's cover in `treeCurate`
  and `rankPhotos`, the family hero and look-alike cards, the sibling genus cards: `seenCover`; `adultFirst`: a species'
  one photo `spPhoto`, Home's landscape tiles `home.js` `tilePhoto`); a unit of juveniles only keeps its first; the
  species sheet shows its adults first, the juveniles apart (`learn.js` `spSheetPhotos`).

### A watermarked photo is never a default cover

Its flag `w` (`judging/FISH.md` "Watermark"), at any level, while the node has an adult photo without one: the app's
`seenCover` (the leaves compete on those, and his ★ cover of the leaf chosen is taken only without a watermark, kept or
not), `learn.js` `spPhoto` (`app.js` `coverFirst`, his species ★ first all the same) and the sheet's first photo, the
admin's `treeCoverRule` and `treeLeafCover` (`autosort.js` `treeWm`: the tags as the game reads them, `treeTagsMine`).

- His ★ cover on one stays his choice (rule A1), in force everywhere but Home (`home.js` `homeOk` skips it, kept or
  not).
- Its node page asks "Watermark: keep as cover?" (`admin-covers.js` `nodeCover`'s `wm`, `WM_ASK`): **Keep** records
  `curation.json` `fish` `genera` `{node id: {cover: f, coverW: f}}` beside the cover, as `coverJ` (`autosort.js`
  `treeCoverW`, `treeCoverWOk`; dropped with the pick by `treeCover`, `treeDrop`, `coverAccept`), and answers the node's
  open Cover proposal in the same Undo step (`coverWKeep`); **Choose another** opens Cover proposals, where the proposal
  of a watermarked cover he has not kept (`wm`) offers the rule's photo without one and stays open whatever an earlier
  Keep mine of the pair said (its Keep mine records `coverW` too). The app never reads `coverW`. A leaf has no proposal:
  its page offers Keep only, ★ Cover on another of its photos choosing another.

### The default cover of a node with leaves

When Pierre has picked no cover for a family or a genus, its cover is a photo of its leaf (for the fish, the species)
**most seen around the instance's centre by distinct observers** ([data.md › The instance's
centre](data.md#the-instances-centre)) **among its leaves with a reference-level photo** that is not a juvenile
(`core.js` `refLevel`), ties broken by the observations there, then by the easy order; then
**his ★ cover of that species** when he picked one in play (never overridden), else that species' easiest reference photo in the game's order
(`core.js` `easyRank`: the judged ease or the players' ratings, the licence breaking ties). A node with no reference
photo under it falls back on the most seen species with an adult photo (his ★ cover of it, else its easiest adult
photo); never a juvenile while the node has another photo; a node whose species carry no presence keeps the easy
order's first (ROADMAP "The Tree tab").

- The species most seen is read from `fish.json` `present` (`nearU` distinct Research Grade observers and `nearN`
  observations within the centre's radius, under their first names `dauinU` and `dauin` until the build writes the
  generic ones: `app.js` `nearSeen`, `autosort.js` `treeNear`). The counts are computed once, at build (rule L13); the
  app only compares them. A genus's "Most met here" line (`app.js` `treeGenera`) follows the commonness index, not
  these counts.
- One rule in two copies: the app's `app.js` `seenCover` (the card's photo: `treeCurate` without his pick, `rankPhotos`
  on the rated order; `learn.js` `nodeCover` over the species' photos in play, the sheet-only ones only when none is:
  the family sheet's hero, its look-alike cards, a genus sheet's sibling genus cards) and the admin's `autosort.js`
  `treeCoverOf` (the family's and the genus headings' default thumbs on the Tree page; the species records it reads
  registered by `admin-fish.js` through `treeSeenFrom`, since `admin.js` calls it with four arguments).
  `tests/fishcovers.test.js` holds them together on fixtures and, on the real files, checks that every unit without a
  pick shows its most seen species in the app and the admin alike.
- A species' own cover is its one leaf: his pick, else its easiest photo; his node picks stay as they are (the default
  never replaces a manual choice). The genus row's stack on a family sheet (one photo per species, commonness order) and
  Home's landscape tiles (a shape that suits the tile) do not read the default cover.
- **Corals**: a coral genus is both the unit and the leaf, so the rule leaves its cover as it is (rule P1's source
  order, then `applySlots`); it would apply to coral nodes above the genus (a family) once the Tree tab has them, which
  first needs each genus's distinct observers near the centre written at build (`data/presence.json` holds the coral
  species' presence in the Philippines, `ok`, `rg`, not counts near the centre; `tools/coral_presence.py` already asks
  iNaturalist for the counts around the centre and would keep them).

## The Fish ID Key (Lab)

`proto/fishkey.js`, `#tools/fishkey` (ROADMAP "Fish ID Key for EventMeasure"; in the Lab until Pierre's OK, rule U13:
Identify on the fish keeps "coming soon"): every species with `pdf`, out of the game too, nothing else; under the key's
groups (rule S3), then the family (its names, and its PDF section when the PDF names it otherwise), then the genus, in
this file's order; a PDF species with no family record last, under its PDF section. A row: the cover by the game's
rule (`app.js` `seenCover`; a tap enlarges its photos), the PDF name, WoRMS's beside it when it differs (rule S2), the
common name, the PDF page, its sheet. One search: every word typed starts a word of its PDF, WoRMS or synonym names,
common names, genus, family or PDF section. State in the address (`f=`, `q=`); data through `app.js` `treeHome` /
`treeLoad`; its subject declares `UNITS` `emkey` (rule S1), and the tool is offered only while that subject is open to
the player (its `on`, read by `proto/lab.js`). An enlarged photo's Report speaks the fish's words, about its family.
Checked by `tests/fishkey.test.js` and the pages smoke's
`fishkey` part.

## Rebuild

Edit `tools/fish_source.json` (or the instance's layer), then `python3 tools/build_fish.py` (it prints the PDF names
WoRMS has changed, the likely slips, the species out of the game, those confirmed by Pierre's observations only, the
WoRMS / iNaturalist mismatches and a PDF-section cross-check; `--dry` writes nothing), then
`node --test tests/fish.test.js`. Every WoRMS and iNaturalist reply is cached in `tools/.cache/fish.json` (git-ignored),
so a rerun is offline and identical; `--refresh` asks again (names and counts move), `--offline` never asks.
