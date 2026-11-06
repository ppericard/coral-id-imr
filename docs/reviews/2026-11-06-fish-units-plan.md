# Fish game units: book families, genera, species (plan, 2026-11-06)

**Status: a plan, no code. Its questions (§8) wait for Pierre.**

Pierre, 2026-11-06 13:04 (translated): "The game's units are NOT the IMR entries. The game's units are the families, the
genera and the species. How we present, or rather open, certain genera for people working at IMR is something else."
The families are **the book's families** (the family labels inside the 20 body-shape groups of the key in force, rule
S3), not always strict taxonomic families. Their name is the book's English name ("Damselfishes"); the scientific name or
names come below it, as a subtitle. Genera and species are precise taxa. *Amphiprion* goes into the Damselfishes;
*Diploprion* goes where the book files it (Soapfishes). For organisation, the book wins over the IMR course. The IMR
entries become an **overlay**: a way to open, prioritise or label units for IMR players.

The fish sheets study (#631, its §3.1 answered the same day) already uses this model for the sheets. This plan extends it
to the game, the progress, the log and the admin.

## 1. Audit: where fish code treats an IMR entry as a game unit

Checked by reading the code on `main` (82a35278) and #636's head (f2f99d0f), and counted from `fish.json` and the key's
labels (`tools/fish_source.json` `keys`) with a small script that walks each game species up the WoRMS tree in `fish.json`
`ref` to its first book label (the same walk as `tools/build_fish.py` `key_groups`).

| Where | What it does today | IMR entry as unit? |
|---|---|---|
| `fish.json` `teach` (built from `tools/fish_source.json` `teach`) | Level-1 nodes = the 27 IMR entries t01-t27 (+ circles 2-3, t28-t63, in the same shape); species attach to a node; `sub` = IMR sub-entries; `start` = t02, t03, t01, t06; `key.groups` without their labels | **Yes**: the only family-level structure |
| `core.js` `fishGen`, `fishNames`, `fishTypeNames` | One game unit per node (`gen[t01]`), IMR cues as `qt`, IMR `look`, IMR phase lines; `c1` = the 27 entries = the fish slate; typed names = IMR name, its parts, IMR's `fam` (Serranidae for Groupers *and* Anthias), WoRMS families, sub-entry names | **Yes** |
| `app.js` `fishGenera`, `UNITS.fish`, `rankOf` | Genus units `g:<Genus>` built per entry, `parent: t01`; a family's genera join at Advanced on the entry; duels from entry `look`; `rankOf` '' = entry | Genera are precise taxa; their parent is an entry |
| `core.js` `SUBJECTS` fish | `rank: 'family'` documented as "an IMR entry"; `one/many` "family/families" | **Yes** (the word is right, the unit is not) |
| Opening (`model.js` `openPick` `first`), FISH_PATH unlocks | Starter core = 4 entries; species open at the entry's Advanced; IMR sub-entries as "level 1b" | **Yes** |
| Progress, exam (`reefid-sync-fish-progress`, `EXAM`, `progPct`) | One record and one mastery exam per entry id; the fish % over the 27; FISH_PATH's global score "25% × the entries' mean" | **Yes** |
| Learn, families page (`learn.js` `viewFishList`) and help texts (`app.js` fish `help`) | One tile per entry by key group, "IMR names inside it"; "Name the fish family in the photo, as IMR names it" | **Yes** |
| Admin #636 (units page) | `unitList` = `fish.json` `teach`; pages `#fish/t02`; choices in `curation.json` `fish` `genera` keyed by entry id; the Validated list reads the entry's IMR phase lines; tab "Families" (`SUBJECTS` `many`) | **Yes** (unmerged: nothing published under that key yet) |
| Fish auto-sort and curation (`autosort.js` `fishRun`, `curation.json` `fish` `add/out/ease/tags/seen/crop/auto`, `fish-cand.json`) | Keyed by photo → species id; targets per species (`FISHT`) | **No**: already species-level |
| Stopgap game photos (`fish-photos.json`, `tools/fish_photos.py`) | Photos listed per entry (each with its species `sp`) | Per entry (moot once curated photos, #614) |
| Answer log (#630, sheet v60) | Rank `family` = an IMR entry; Genus shown / Answered / Choices hold `t01`…; Taxon shown `Damselfish`; Species shown = the PDF species (exact) | **Yes**, but each row also has its species |
| Tools | `fish_commonness.py` (`cmi` scaled within the entry), `fishscore.js`, `fetch_fish.py`, `judging_fish.py`, `fish_judge.py` (per entry) | Per entry |

**Counts (circle 1: 27 entries, 7 sub-entries, 94 genera, 340 species):**

- **26 of the 27 entries are one book family under another name** (Damselfish = Damselfishes, Bream = Coral Breams,
  Pufferfish = Puffers, Surgeonfish & Unicornfish = Surgeonfishes…). Damselfish covers the book's two labels
  Damselfishes and Damselfishes/Anemonefishes, one family by Pierre's ruling (WoRMS files *Amphiprion* directly under
  Pomacentridae, so the walk already gives Damselfishes).
- **1 entry crosses two book families**: Groupers = Groupers (13 species) + Soapfishes (*Diploprion bifasciatum*).
  So **28 book families** in circle 1.
- **Across taxonomic families (WoRMS)**: 2 entries, Groupers (Epinephelidae + Liopropomatidae) and Lizardfish
  (Synodontidae + Harpadontidae; one book family, Lizardfishes).
- **10 entries are a single genus** in the game (Spadefish *Platax*, Moorish Idol *Zanclus*, Rabbitfish *Siganus*,
  Bream *Scolopsis*, Sweetlips *Plectorhinchus*, Anthias *Pseudanthias*, Boxfish *Ostracion*, Lionfish *Pterois*,
  Soldierfish *Myripristis*, Sandperch *Parapercis*); **1 of them a single species** (Moorish Idol).
- **Of the 7 sub-entries, 6 are exactly one genus** (Chromis, Dascyllus, Pomacentrus, Anemonefish = *Amphiprion*,
  Bannerfish = *Heniochus*, Unicornfish = *Naso*); **1 spans three genera** (Surgeonfish = *Acanthurus*, *Ctenochaetus*,
  *Zebrasoma*): neither a family nor a genus. None is a single species.
- Genera: 33 of the 94 hold one species; with book families, 11 are the only genus of their family (#631).
- Circle 3 (not IMR, same structure): "Seahorses & pipefishes" and "Stonefishes & waspfishes" each span two book
  families; Thresher sharks (a wink) has no book label.

## 2. The anemonefish: one genus

**One genus, *Amphiprion*.** *Premnas* is no longer accepted:

- **WoRMS** (queried 2026-11-06): the genus *Premnas* is a "junior subjective synonym" of *Amphiprion* (record 204864,
  modified 2026-11-05, taxonomy source *Eschmeyer's Catalog of Fishes*, Fricke, Eschmeyer & Van der Laan 2026);
  *Premnas biaculeatus* (212768) is unaccepted, valid name ***Amphiprion biaculeatus*** (Bloch, 1790) (1605249).
- **Tang, Stiassny, Mayden & DeSalle 2021**, "Systematics of Damselfishes", *Ichthyology & Herpetology* 109: 258-318,
  [doi:10.1643/i2020105](https://doi.org/10.1643/i2020105): treat *Premnas* as a junior synonym of *Amphiprion* (read
  through secondary coverage, Coral Magazine; full text not read).
- Earlier and later molecular work agrees (via PubMed): Li et al. 2015, mitogenomes, "P. biaculeatus should be assigned
  to the genus *Amphiprion*", *PLoS ONE* 10: e0123894, [doi:10.1371/journal.pone.0123894](https://doi.org/10.1371/journal.pone.0123894);
  Somkham et al. 2025, *Braz. J. Biol.* 85: e297242, [doi:10.1590/1519-6984.297242](https://doi.org/10.1590/1519-6984.297242).
- **iNaturalist** follows: taxon 1277790 *Amphiprion biaculeatus* (Spine-cheek Clownfish), 124 Research Grade
  observations in the Philippines (one API call, 2026-11-06).
- In the repo: *biaculeatus* is not a game species (not on the IMR list); the 6 game anemonefish are all *Amphiprion*.
  The book (2015) predates the change, so where it names *Premnas*, the WoRMS name rules for the genus (rule S2), with
  "Premnas biaculeatus" accepted when typed.

## 3. Target model: what each layer stores

All built by `tools/build_fish.py` into `fish.json`, from the key's labels and the WoRMS tree it already holds; no hand
list of families.

- **Family** (the game's family rank; the book's family): `{id, name (the book's English label), sci (the label's taxa
  that hold game species: Lizardfishes = Synodontidae, Harpadontidae; Soapfishes = Diploprioninae), group (key group n),
  circle (its best species' circle), species (commonness order), genera, look (family ↔ family: IMR's lines mapped
  onto families, later the players' confusions), juv, phase}`. A game family with no book label (Thresher sharks, or a
  region with no key) falls back to its WoRMS family.
- **Genus**: `{id g:<Genus> (unchanged), family, species, names (PDF genus, WoRMS genera accepted when typed)}`.
- **Species**: as today, plus its `family` and genus.
- **IMR overlay** (today's `teach`, renamed): each IMR entry and sub-entry keeps its IMR words (name, `fam` as IMR writes
  it, cues, slides, look, phase lines, juveniles) and says which units it covers: `to: [unit ids]` (t01 → the
  Damselfishes; t01a → *Chromis*; t06a → *Acanthurus*, *Ctenochaetus*, *Zebrasoma*; t13 → the Groupers and *Diploprion*).
  It drives: the IMR priority in the opening (§5), the IMR name as a **label** on a unit ("IMR: Bannerfish" on
  *Heniochus*), the IMR names accepted when typed, and the IMR cues shown on the unit they describe, credited to IMR. On
  the Soapfishes, a neutral line "IMR course: taught with the Groupers" (rule C1: no correction).
- Circles stay per species (they already are); `fish.json` `start` names families.

## 4. How existing data maps

- **Progress** (`reefid-sync-fish-progress`, on the device and in the saved copy): migrated once at start-up (rule W3,
  as `core.js` `migrateIdKey`): t01 … t27 → their family ids (26 renames); t13 → the Groupers; the Soapfishes start
  unmet (a first-meeting card, started from the player's level like any new unit). Genus records `g:…` keep their ids
  (only *Diploprion*'s parent changes). Circles 2-3 the same way; the two split circle-3 nodes go to the larger family,
  the other starts unmet. The fish % then counts 28 families (a player who knew all 27 loses about 1/28 until the
  Soapfishes are learned): a rules version (rule D5) for the record. Fish is not replayed (`replay: false`), so no
  replay runs.
- **Answers logged** since v60 (today): the logged `family` rank becomes a **book family id**. The rows already logged:
  one sheet migration (`Code.gs` `ONCE_`, logged in the Deploy log) rewrites the fish rows' unit ids (Genus shown,
  Answered, Choices) and Taxon names from entry ids to family ids, one map per row so the row keeps what happened: t13
  means the family of the photo shown when the photo was t13's (from Species shown: a *Diploprion* photo makes every
  t13 of that row Soapfishes, so a right answer stays right and the shown family stays among the choices), else the
  Groupers; the 26 other entries map one to one. The Reports tab's units likewise. Question f.
- **Curation**: `curation.json` `fish` photo keys are per species: nothing moves. #636's `fish.genera` was never
  published: it is keyed by family id from the start.
- **Stopgap photos** (`fish-photos.json`): listed per family by `tools/fish_photos.py`, or left to die with #614.
- **Commonness** (`cmi`): rescaled within each family (only Diploprion's index moves: alone in its family).

## 5. The opening

- **Starter core**: the same four, now families: Butterflyfishes, Angelfishes, Damselfishes, Surgeonfishes.
- **The IMR overlay decides what is eligible and how soon; the confusion groups (#641) the order inside it** (#641 §3.4,
  its question h). "I'm at IMR": the families holding IMR-list species (circle 1, 28) first, the IMR sub-entry genera
  (the 6, plus the 3 under "Surgeonfish") with the scientific genera on from the start, labelled with their IMR name;
  among species, the IMR 24 most sighted first (`cs`, already in `cmi`). Other players: the same circle-1 families,
  without the IMR labels or the early genera.
- Unlocks unchanged in mechanism: a family's genera and species at its Advanced; one unit at a time (`OPEN`, `INTRO`).

## 6. The admin units page (#636) and its tab

- **Tab name: "Families" stays right** once the units are book families (`SUBJECTS` fish `many`).
- **The page** (needs a rework, not small, see §7): the list = book families by key group, English name first, the
  scientific name(s) below in small type; a family page `#fish/…/<family id>` = one block per **genus** (italic name,
  its IMR label if any, species count), inside it one row per **species** (common name first, scientific name below,
  observations against target); Feature / Cover / Remove / Not this / × unchanged (per photo and species);
  `fish.genera` keyed by family id; the Validated list per family (5 easy photos per family; the IMR phase lines of the
  entries the family covers, through the overlay).
- **What #636 needs first, whatever the units**: a rebase on `main` past #610 (admin addresses: `GROUPS`, `pageOf`,
  the hash scheme), #612 and #634 (merged as a squash; #636 still carries its unsquashed commit). GitHub reports it
  `dirty` (conflicts).

## 7. PRs in order, and what players see

| # | PR | Players see |
|---|---|---|
| 1 | This plan | Nothing |
| 2 | **Data**: `build_fish.py` emits the families (§3), each species' family, the overlay's `to`; `teach` kept as is until PR 4; `fish.json` rebuilt offline (`--regroup`); tests (every game species in exactly one family; 28 in circle 1; *Diploprion* in Soapfishes; *Amphiprion* in Damselfishes) | Nothing |
| 3 | **#636 rebased and reorganised** by family → genus → species (§6) | Nothing (admin only) |
| 4 | **Engine**: `fishGen` builds the family units; `fishGenera` parents are families; `start`; the one-time progress migration; `c1` = 28; typed names (book name, IMR names, scientific names); Learn's families page by book family (English name, scientific subtitle, IMR label); help texts; the logged `family` = family id; `Code.gs` `ONCE_` for the logged rows; `VERSION` bump | The families under the book's names ("Damselfishes", "Coral Breams", "Puffers"), IMR names as labels and accepted when typed; the Soapfishes as a new family; *Diploprion* no longer under the Groupers; their progress kept |
| 5 | **IMR overlay in the opening** (with #641's groups) | "I'm at IMR": IMR genera early, with their IMR names |
| 6 | Species questions, family sheets (#631) on the same layers | As designed in FISH_PATH and #631 |

PR 2 and PR 3 can start now and run in parallel; PR 4 after both. The public fish release (Sunday 2026-11-08) is the
timing question (h).

## 8. Questions for Pierre (each with a recommendation)

- **a. Family ids.** `f:` + the book's English label (`f:Damselfishes`), as genera are `g:Chromis`. *Recommendation*: yes.
- **b. Family names in the game.** The book's label as written, plural ("Damselfishes", "Puffers", "Coral Breams",
  "Moorish Idol"), the scientific name(s) below; IMR's name as a label ("IMR: Damselfish") and accepted when typed.
  *Recommendation*: yes.
- **c. A game family with no book label** (Thresher sharks today; any region with no key). *Recommendation*: its WoRMS
  family, the English name iNaturalist gives it, the scientific name below.
- **d. The Soapfishes as a new unit**, the Groupers keeping the old Groupers progress, the Soapfishes starting unmet.
  *Recommendation*: yes.
- **e. The fish % over 28 families** (a small drop for a player who knew all 27, until the Soapfishes are learned). Fish
  is in beta: no announcement beyond a rules version. *Recommendation*: yes.
- **f. The answers already logged** (since this morning's v60): rewrite their fish unit ids once to family ids (rule W3),
  rather than read old and new ids for ever. It rewrites logged data, so your OK. *Recommendation*: rewrite once.
- **g. A typed genus or IMR sub-entry name on a family question** ("Chromis" for Damselfishes): right, as today (finer
  and true). *Recommendation*: right.
- **h. Timing.** PRs 2-3 now (nothing visible); PR 4 right after the public flip, not in the release window, so the
  release ships on tested units and the migration moves everyone's ids once. *Recommendation*: after the flip; before
  it only if you prefer public players never to see the IMR entries.
- **i. Circle 3 follows the book too**: "Seahorses & pipefishes" and "Stonefishes & waspfishes" become two families each.
  *Recommendation*: yes.
- **j. Anemonefish**: genus *Amphiprion* only; *A. biaculeatus* (not on the IMR list) would join it, "Premnas
  biaculeatus" accepted when typed; the book's "Damselfishes/Anemonefishes" label makes no unit. *Recommendation*: yes.
- **k. The IMR course line on a moved taxon** (Diploprion on the Soapfishes: "IMR course: taught with the Groupers"),
  neutral, as a label. *Recommendation*: yes (rule C1).
