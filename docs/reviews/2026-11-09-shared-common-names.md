# Shared common names: one rule set for every level (design study)

**Status: decided (Pierre, 2026-11-09).** Q319: the recommendations of decisions 1, 3, 4 and 5 (a shared name whose
owners include the photo's unit is right and explained, counts the same as the label; a wrong shared name counts against
the photo's family only, no mix-up recorded; the four PDF pairs accepted for both species with "Also used for…"); Q320:
decision 2's recommendation (the wider family-level acceptance published and corrected in use, like Q313); and the
three plain fixes of §6. Built in two PRs: the plain fixes (`claude/typed-names-fixes`), then the name index and the one
reading rule (`claude/names-index`). The study was read-only on `origin/main` at bf06972. Asked by Pierre: "think about common names that are sometimes shared by different families,
genera or species, and make me a coherent proposal on how to solve it and how to accept common names at the different
levels of the game, depending on the level being played."

Trigger: **razorfish**. It is the usual name of both Centriscidae species in the game (*Aeoliscus strigatus*, "Jointed
razorfish"; *Centriscus scutatus*, "Grooved razorfish"; family label Shrimpfishes, from the book's index, Allen et al.
2015) and of four *Iniistius* wrasses (Peacock, Fivefinger, Whitepatch, Blackspot razorfish; family Wrasses). Typed on a
family question today, "razorfish" is "not a family in the game: check the spelling", for both.

Every count below was measured by running the app's own matching code (`core.js` `fishGen`, `fishTypeNames`,
`typeMatchIn`, `typeDist`, `TYPE`) on `fish.json`, `fish-photos.json` and `tools/fish_source.json` at bf06972 (a scratch
script kept outside the repository). "Dauin obs." is `fish.json` `present.dauin` of the species concerned (the most observed one when several).

---

## 1. What the app does today

| Level | Multiple choice | Typed |
|---|---|---|
| Family (67 book families) | 4 book labels | `fishTypeNames`: book label, IMR name and its parts, scientific names, IMR sub-entries and their genera (Chromis, Anemonefish, Amphiprion: "a finer name, still right"), `aka` (Tang, Cowfish...), `often` (Clownfish, corrected gently, Q164), and the short forms without "fish" when unambiguous. Spelling tolerance (1 edit up to 6 letters, 2 beyond). A text close to two names: "Close to X and Y: which one? Check the spelling." |
| Scientific genus (branch B) | 4 genus names | Scientific genera only; a common or family name gets the Q237 nudge ("“Anemonefish” is a common name: this question needs a genus's scientific name"). |
| Species (not built) | one listed name, rotating (`app.js` `cnShow`) | listed names and their spellings only (`cnTypeNames`); a name two species list: "which one?". |

Species lists (`tools/fish_common.py`): 1 to 3 names, a name two game species share is dropped from the one that does not
own it (6 dropped today, all inside one family), a PDF name shared stays, flagged (4 pairs).

Corals: `data.json` has no common names (genus names, old names "formerly X", plain sentences). Nothing to resolve
there today; the rules below are written for any subject that has vernacular names (fish now, nudibranchs and benthos
later) and cost the corals nothing.

---

## 2. Measurements

664 game species, 1,295 accepted species-name forms (951 shown names + their recorded spellings), 1,289 distinct after
normalisation (letters only, last word singular). 67 families, 276 typed family forms today.

### Species names (full names, all spellings, plural/singular and "fish"-less short forms)

| Shared between | Names | Notes |
|---|---|---|
| (a) species of different families | **0** | `fish_common.py`'s drop rule already removed them. Short forms without "fish" add none. |
| (b) species of different genera, one family | **4 names** (5 spellings) | The four PDF pairs: Twospot wrasse (*Halichoeres biocellatus* 3 / *Oxycheilinus bimaculatus* 70 obs.), Twotone / Two-tone wrasse (*H. prosopeion* 9 / *Thalassoma amblycephalum* 3), Seagrass wrasse (*H. papilionaceus* 0 / *Novaculoides macrolepidotus* 10), Blackstripe(d) cardinalfish (*Ostorhinchus nigrofasciatus* 11 / *Cheilodipterus nigrotaeniatus* 0). |
| one genus | 0 | |
| within the typing tolerance (a typo away) | 11 pairs | 10 inside a family (Lemon / Neon damsel, Striated / Striped surgeonfish, Ringed / Winged pipefish...), 1 across families (Blue hana goby, a dartfish / Blueband goby). |

At species level the problem is small and already curated. **The problem is at family level**, where species names
and their head words are not used at all.

### Head words ("kind words") of the species names

The kind word of a shown name is its longest ending (1 to 3 words) that is a family label (game or book), else a label
ending its last word ("shrimpgoby" → goby), else its last word, singular; "False X" names have none (they say it is not
an X); the recorded alternative spellings are left out (they hold FishBase typos such as "Scrawled tilefish", "Anchor
trunkfish", which would leak other families' names).

- **129 kind words**; 73 are already a label of their only family (wrasse, grouper, damselfish...).
- (c) **4 shared by species of two families**, 68 species: **goby** (Gobies 48 of 50 species; Dartfishes 2 of 3: Blue
  hana goby, Blacktail goby), **razorfish** (Shrimpfishes 2 of 2; Wrasses 4 of 84), **bream** (Coral Breams 6 of 6, IMR's
  label "Bream"; Emperors 3 of 10: *Monotaxis* "bigeye bream", "Redfin bream", *Gnathodentex* "large-eye bream"),
  **thicklip** (Wrasses 2, *Hemigymnus*, genus name "Thicklips"; Sweetlips 1, "Lesson's thicklip").
- (c') **3 kind words of one family that are a book label of another family**: **batfish** (*Platax*, Spadefishes 4 of
  5; the book's Batfishes are Ogcocephalidae, not in the game), **basslet** (*Pseudanthias*, Anthias; the book's Basslets
  are Liopropomatinae), **dart** (*Trachinotus*, Jacks; Dartfishes).
- **Today's reading of the 129 at a family question**: 52 right; **18 right but sent to the spelling step** (a correct
  singular: seahorse, moray, grouper, hawkfish, sole...); **48 no answer** (toby, goby, blenny, razorfish, spinefoot,
  hind, sergeant, demoiselle, coris...); **6 "which one? check the spelling"** (pipefish, jawfish, soapfish with their
  own family among the two; batfish, hogfish, catfish without it); **5 read as another family by the spelling
  tolerance**: anglerfish → Angelfishes, firefish → Filefishes, tuskfish → Boxfishes, goldie → Soldierfishes, dart →
  Dartfishes. A wrong reading is a wrong answer that counts against both families and records a mix-up (rule L2).
- Full species names typed at a family question: of 951 shown names, **945 are no answer**; 6 are accepted (monotypic
  families: Moorish idol, Trumpetfish...).

### Family labels

- (d) Common labels, IMR names, `aka`, `often` shared exactly between two game families: **0**. Within the tolerance:
  7 pairs (Filefishes / Pipefishes, Jawfishes / Hawkfishes, Soapfishes / Goatfishes, Clownfish / Cowfish,
  Pomacentridae / Pomacanthidae / Monacanthidae / Priacanthidae). Because of them the singulars **Pipefish, Jawfish,
  Soapfish** are "which one?", and fishTypeNames drops the short form of "Surgeonfish & Unicornfish".
- (d) **6 scientific family names spanning several game families** (the book splits them), none in the typed index:
  Serranidae (Groupers, Soapfishes, Anthias: no answer), Holocentridae (Soldierfishes, Squirrelfishes: read as a typo
  of Holocentrinae, so wrong on a soldierfish), Syngnathidae (Seahorses, Pipefishes: read as Pipefishes, wrong on a
  seahorse), Scorpaenidae (Lionfishes, Scorpionfishes: read as Scorpionfishes), Synanceiidae (Stonefishes,
  Waspfishes), Gobiidae (Gobies, Dartfishes).
- Singular of the 67 book labels: **27 not read exactly** (24 sent to the spelling step, Pipefish / Jawfish / Soapfish
  "which one?", Goby / Blenny / Convict blenny no answer: the singular is only built for names ending in "fish").
- (e) A family label that is a species' full name: **8, all in the same family** (Moorish idol, Trumpetfish, Ghost
  pipefish, Stonefish, Whale shark, Cornetfish, Convict blenny): harmless. Across families: 0.
- Genus common names (#700) equal to a family label: **8 of 20** (Rabbitfishes, Emperors, Anthias, Boxfishes,
  Soldierfishes, Sandperches, Ghost pipefishes, Seahorses): one name at two ranks; harmless at a family question,
  told apart by the rank asked.

### The examples that matter most (Dauin first)

| Typed at a family question | Owners (species carrying it) | Dauin obs. | Today | Proposed |
|---|---|---|---|---|
| toby | Puffers 4/14 (*Canthigaster*) | 241 | no answer | right (kind word) |
| seahorse | Seahorses (label, singular) | 158 | spelling step | right, exact |
| moray | Morays 15/15 | 130 | spelling step | right, exact |
| anglerfish | Frogfishes 2/8 (*Antennarius*) | 108 | **read as Angelfishes: wrong, mix-up logged** | right |
| pipefish | Pipefishes 8/9 | 106 | "Close to Filefishes and Pipefishes" | right, exact |
| firefish | Lionfishes 2/7 (*Pterois*, *Parapterois*) | 91 | **read as Filefishes** | right |
| goby | Gobies 48/50, Dartfishes 2/3 | 88 | no answer | right for both (shared) |
| razorfish | Shrimpfishes 2/2 (circle 2, 19 obs.), Wrasses 4/84 (circle 1, 88) | 88 | no answer | right for both (shared) |
| blenny | Blennies 14/15 | 52 | no answer | right, exact |
| bream | Coral Breams 6/6 (IMR label), Emperors 3/10 (*Monotaxis*) | 45 / 4 | **on a *Monotaxis*: wrong (Coral Breams)** | right for both (shared) |
| spinefoot | Rabbitfishes 8/10 | 39 | no answer | right |
| hind | Groupers 10/20 (*Cephalopholis*) | 33 | no answer | right |
| sergeant, demoiselle | Damselfishes 2/66, 8/66 | 24, 19 | no answer | right |
| hogfish | Wrasses 3/84 (*Bodianus*) | 22 | "Close to Boxfishes and Frogfishes" | right |
| batfish | Spadefishes 4/5 (*Platax*) | 20 | "Close to Boxfishes, Goatfishes and Dartfishes" | right |
| Holocentridae | Soldierfishes, Squirrelfishes | | **on a soldierfish: wrong** | right for both (shared) |
| Syngnathidae | Seahorses, Pipefishes | | **on a seahorse: wrong** | right for both (shared) |
| Twospot wrasse (species question) | *H. biocellatus*, *O. bimaculatus* | 3 / 70 | "which one? check the spelling" | right for both, "also used for" |
| eel, shark | a book group (Eels; Sharks & Rays) | | no answer | nudge: "a group, not a family" |

---

## 3. How the references handle vernacular ambiguity (checked 2026-11-09)

- **FishBase** (Froese & Pauly, eds., www.fishbase.org) keeps a common name as a *record*: one name, one species, a
  language, a country and a type (vernacular, FAO, trade...). Its common-name search for "Razorfish" returns 7 English
  records: *Aeoliscus strigatus* (Australia, Malaysia, Papua New Guinea, Solomon Islands), *Centriscus scutatus*
  (Malaysia, **Philippines**) and one freshwater cyprinid (Uzbekistan). The *Iniistius* names are compounds ("Peacock
  razorfish"). Its family page reads "Centriscidae - Snipefishes and shrimpfishes". So bare "razorfish" is, in
  FishBase, a shrimpfish name; with a modifier it is also a wrasse name.
- **WoRMS** (WoRMS Editorial Board, www.marinespecies.org, `AphiaVernacularsByAphiaID`) attaches vernaculars to a
  taxon with their language: Centriscidae "snipefishes and shrimpfishes"; *Aeoliscus strigatus* "razorfish";
  *Iniistius pavo* "peacock razorfish". A vernacular is never a key in WoRMS: the AphiaID is.
- **iNaturalist** (api.inaturalist.org `/v1/taxa/autocomplete`) treats a typed common name as a search that returns
  **every taxon carrying it**, and shows which name matched beside the taxon's default name: "razorfish" returns 33
  taxa, among them *Aeoliscus strigatus* (default "Jointed Razorfish"), *Centriscus scutatus*, the family Labridae
  (matched "Razorfishes and Sandies"), the subfamily Xyrichtyinae, *Iniistius pavo* (matched "Blue Razorfish"),
  *Cymolutes torquatus*, *Novaculoides macrolepidotus* (matched "Seagrass Razorfish"). "batfish" returns 38, from
  *Platax* (genus default "Spadefishes", matched "Batfishes") and Ephippidae to Ogcocephalidae ("Batfishes") and
  *Monodactylus* ("Silver Batfish"). The observer then picks the taxon; the name alone never decides.
- **Standard name lists** that want one name per species get there by curation of their own list, not by refusing
  usage (the American Fisheries Society's *Common and Scientific Names of Fishes*, Page et al. 2013, asks that no two
  species share a name; from memory, not re-checked online in this study).

Four lessons, all four used below: (1) a vernacular is a **link between a name and a set of taxa**, never an
identifier; (2) each link has attributes (rank, how established, source); (3) an ambiguous name is **resolved against
the candidates**, not refused; (4) the curated list the app shows stays unique where it can (it already is at species
level, `fish_common.py`), while what a player may *type* follows usage.

---

## 4. The proposal

### 4.1 One name index per subject (data model)

The build (`tools/build_fish.py`, from a new `tools/fish_names.py` or an extension of `tools/fish_common.py`) writes
one index into `fish.json`, `vn`: every typed key (normalised: letters only, the last word made singular, so
"Groupers", "grouper", "Goby", "gobies" are one key; "fish" short forms as today, kept only when unambiguous) with its
**owners**, each `[taxon id, rank, role, n, of]`:

| Role | What | Shown? | Source |
|---|---|---|---|
| `label` | the book's label, IMR's name and parts (rule C1) | yes | `fish_source.json`, the key (rule S3) |
| `sci` | scientific names: the family's, its genera, its species (and the IMR / WoRMS family names spanning several book families: Holocentridae...) | yes | `fish.json` |
| `alt` | IMR sub-entries, `aka` (Tang, Leatherjacket), recorded spellings | no | `fish_source.json`, `fish_common.json` |
| `often` | a name in common use, gently corrected (Clownfish, Q164) | in the feedback | `fish_source.json` |
| `species` | a listed common name of a species (`cn`, every spelling) | at species level | `fish_common.json` (Q313) |
| `kind` | a kind word derived from the names shown (razorfish, toby, spinefoot), **owned by a family when at least 2 of its game species, or all of them, carry it** (93 of the 129 pass) | in the feedback | derived, `n` of `of` species |
| `group` | a word of an identification group's title that is no family's label (Eels, Sharks) | no | the key (rule S3) |

A kind word below the threshold (36, e.g. tuskfish, carried by one species of 84) stays in the index as *known*, so the
spelling tolerance never reads it as another family. Nothing is invented (rule C2): every key comes from the book, IMR,
FishBase, iNaturalist or WoRMS, with its source.

Curation: `curation.json` `names` (rule A1: only the admin's Publish writes it), keyed by name then owner: `off` (not
accepted for that owner), `often` (accepted, gently corrected), `main` (the owner the feedback names first). Only the
exceptions are stored; the build's output is the default. The index is subject-neutral data (rule S1): the engine reads
`vn`, never a fish word; the plural rules are a `SUBJECTS` field, like `typeDrop`.

### 4.2 One reading rule, every level

A typed text is first looked up **exactly** in the index (after normalisation); only if it is no key does the
spelling tolerance apply, as today. Its owners are then **lifted to the rank asked** (a species to its genus and its
family; a genus to its family): the set **C** of candidate units at that rank. The question also says which kinds of
names it takes (family: all; scientific genus: scientific only, Q237; species: listed common names).

1. **C = {the photo's unit}**: right.
2. **The photo's unit is in C with others** (a shared name: razorfish, goby, bream, Holocentridae, Twospot wrasse):
   right, and the feedback says the name is shared (decision 1).
3. **The photo's unit is not in C**: wrong. If C holds one unit B, it counts against both (rule L2, as today); if C
   holds several, it counts against the photo's unit only, with no mix-up recorded (decision 4).
4. **A name above the rank asked or of a kind the question does not take** (a group word at a family question; a
   family or common name at a genus question; a family name or a kind word at a species question): no answer, the
   nudge (Q237's pattern), never giving the answer away.
5. **Nothing close, or two names equally close by spelling only**: as today ("not a family in the game", "Close to
   Filefishes and Pipefishes: check the spelling"). "Which one?" is kept for spelling ties only, never for a name that
   is exactly right.

### 4.3 Level by level

**Family question, typed.** Accepted: the family's labels, scientific names, `alt`, `often` (as today); its genera's
and species' scientific names and listed common names (lifted: "Iniistius", "Peacock razorfish", "Black-saddled toby"
are right for their family, like Chromis today); its kind words (toby, spinefoot, hind, demoiselle, anglerfish,
firefish, hogfish, batfish, coris...). Shared (photo's family among C): goby, razorfish, bream, and the six scientific
names (Holocentridae, Syngnathidae...). Group words: eel, shark (nudge).

Feedback lines (wording to be shown to Pierre on screenshots):

- Shrimpfish photo, "razorfish": "✓ Yes, Shrimpfishes (often called razorfish)", then "“Razorfish” is also used for some
  wrasses (*Iniistius*)."
- *Iniistius* photo, "razorfish": "✓ Yes, Wrasses: this razorfish is a wrasse (*Iniistius*)", then "“Razorfish” is also
  used for the Shrimpfishes."
- Pipefish photo, "razorfish": "✗ No, it's Pipefishes", then "“Razorfish” names the Shrimpfishes and some wrasses." (no
  "Your answer would show" block: there is no single answer to show).
- Frogfish photo, "anglerfish": "✓ Yes, Frogfishes (anglerfish: a name of some of its species)".
- "eel": "“Eel” is an identification group (Eels), not one family: which family?" (no answer; logged in the refused
  tries, Q237).

**Family question, multiple choice.** Unchanged: the four book labels. The planned species line after every family
answer (ROADMAP "Show the species after a family or genus answer": "Peacock razorfish · *Iniistius pavo*") teaches the
shared names without a new line.

**Scientific genus question.** Unchanged (scientific names only, Q237); every index key that is a common name, kind
words included, gets the "common name" nudge (checked today: "razorfish", "toby", "goby" there read "not a genus in
the game: check the spelling", the message Q237 set out to remove, and "anglerfish" reads "is a family", through the
Angelfishes typo).

**Species question, common names (branch A, to build).** Typed: the listed names only (no kind word, no genus or
family name: those get the nudge "“Razorfish” names several species: this question needs the species' own name").
A shared listed name (the 4 PDF pairs) is right for each species that lists it: "✓ Yes, Twospot wrasse", then "Also
used for *Oxycheilinus bimaculatus*." Multiple choice: a species that shares a listed name with the photo's is never a
wrong choice in that question (today 4 pairs; the 11 typo-close pairs may stay, they read differently).

**Species question, scientific names.** Unchanged (a common name typed counts as half a fault, FISH_PATH).

**Corals.** No common names today; old names (`typeNamesOf`) follow the same index rule when one is shared.

### 4.4 Scoring

A right answer through a lifted, kind or shared name counts exactly as through the label (decision 3), as `often`
(Q164) and the finer names (Chromis, Anemonefish) do today: the player recognised the fish and the feedback names the
family. The effect is small (3 shared kind words, 6 shared scientific names, 4 species pairs) and the raw text is
already logged with every typed answer (`ty`, sheet v59), so an analysis can measure it later (rules A5, L12). Fish
answers are out of the sheet's replay (`SUBJECTS` `replay: false`): only answers given after the change are read the
new way.

### 4.5 Curation in the admin

The ROADMAP row "Fish common names" already plans a place to correct a species' list. Proposed, in the Fish admin
(rule A3: inside the existing fish species page, not a new tab): (1) on each species row, its listed names (remove,
reorder, add one of the recorded names), as planned; (2) a **"Shared names"** filter on the same page: every key with
several owners (today 3 kind words, 6 scientific names, 4 PDF pairs) and every kind word, each owner with one toggle
(accepted / often / off) and Undo (rule A2). Published without his prior check, corrected in use, as Q313 decided for
the lists (decision 2).

---

## 5. Decisions for Pierre

Each passes both numbering tests (it commits the game's rules and will be cited); the integrator numbers them.

1. **A typed name several families share, the photo's among them** (razorfish, goby, bream, Holocentridae):
   **(A) right, the feedback says it is shared** (recommended: the name is truly the photo's fish's name, as
   FishBase, WoRMS and iNaturalist record it; same treatment as Chromis or Clownfish today); (B) "which one?" listing
   the families, the tap graded; (C) refused, as today.
2. **What a family question accepts beyond today's names**: the lift of its genera's and species' names (scientific
   and listed common) and its kind words carried by 2+ of its species, published and corrected in use like the lists
   (Q313) (recommended); or Pierre validates the list of new kind words first (about 20 that are new words, not just
   singulars: toby, spinefoot, hind, demoiselle, sergeant, anglerfish, firefish, hogfish, batfish, coris...).
3. **Scoring**: a right answer by a lifted, kind or shared name counts the same as by the label (recommended); or
   right but never one of the exam's typed answers.
4. **A wrong answer by a name shared by several families**: counts against the photo's family only, no mix-up
   (recommended); or against every family that carries the name.
5. **The 4 PDF pairs at species level** (Twospot, Twotone, Seagrass wrasse, Blackstripe(d) cardinalfish, FISH_PATH
   "Gaps"): accepted for both species with "Also used for…" (recommended, the same rule as 1); or settled pair by pair.

## 6. Implementation (no decision needed)

The first three fix things that are plainly broken today and could ship as the integrator's call, the rest follows the
decisions:

- **Singular and plural read as one name** (27 book labels' singulars: "Grouper" asks to fix the spelling and then says
  "it's spelled Groupers"; "Goby", "Blenny" are no answer; "Pipefish" is "which one?").
- **An exact name before the spelling tolerance** (anglerfish read as Angelfishes, firefish as Filefishes, tuskfish as
  Boxfishes, Holocentridae as Squirrelfishes, Syngnathidae as Pipefishes on a seahorse: wrong answers with a mix-up).
- **"Which one? Check the spelling" only for spelling ties**; the genus nudge's common-name list gets the kind words.
- `tools/fish_names.py` (or `fish_common.py`): the index with owners, roles, `n`/`of`, sources; "False X" names and
  recorded misspellings never give a kind word; `--check`; a summary of the shared keys. `build_fish.py` writes `vn`.
- `core.js`: one `nameIndex` / `readName(text, rank)` replacing the ad hoc short forms of `fishTypeNames`; the verdict
  gains "shared"; the L2 exception of decision 4 in the answer scoring. A `tools/sync/changes/` file (rule D3); the
  integrator checks whether rule D5 applies (fish answers are not replayed today).
- `quiz.js` `typeBind`, `typeStep`, `fbBody`: the shared and lifted lines, the group nudge.
- `app.js` `cnTypeNames`, the species distractors (no co-owner of a shown name).
- `curation.json` `names` and the admin "Shared names" filter (rules A1, A2, A3, A4).
- Tests: razorfish on both families and on a third, goby on a dartfish, bream on *Monotaxis*, anglerfish, Holocentridae
  on a soldierfish, Grouper, eel; `tests/subjects.test.js`, `tests/typedrej.test.js`; `tests/subject-neutral.test.js`
  holds.
- Docs: FISH_PATH "Typed family names" and "Common names", ARCHITECTURE "Typed questions", the ROADMAP row.
