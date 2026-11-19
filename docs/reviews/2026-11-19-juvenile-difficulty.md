# Hard and easy fish juveniles: what the sources say (study, 2026-11-19)

Pierre, 2026-11-19 (14:42 Manila), on Q431. Q431 drops "juvenile = hard" and its 2/5 ease cap for the fish photos,
except class B juveniles and the look-alikes. He said «ok», and added:

> «Mais certains juvéniles sont difficiles parce qu'ils ne sont justement pas remarquables et qu'ils ne ressemblent pas
> du tout à l'adulte. Tu peux faire une étude avec des sources externes pour voir ce qui est connu comme "difficile" à
> identifier vs "facile"?»

**What this note does.** It reads external sources on reef fish juveniles. It answers two questions:

- which juveniles the sources call hard to identify, and which easy (§2);
- what makes them hard (§3).

It then proposes a rule the judging rubric can apply per species and per photo, to replace the blanket cap (§4). It
counts the project's juvenile photos in each class (§5) and says what the study can and cannot conclude (§6).

**Nothing enters the game.** No game file, tool, rubric or app code changes. The juvenile classes in
`tools/fish_source.json` `juv` and [judging/FISH.md](../../judging/FISH.md) stay as they are until Pierre answers §8.

**Labels** (rule W11), as in the [look-alike pairs study](2026-11-18-classic-lookalike-pairs.md):

- **[read]**: quoted from the page itself, as the fetch tool extracted it;
- **[search]**: only a search engine's excerpt or summary, the page itself not read;
- **[repo]**: already in the repository with its own source (`tools/fish_source.json` `juv`, `fish.json` `lookalikes`);
- **[measured]**: counted from the repository's files;
- **[guess]**: my judgement.

**On mimicry** (FISH_PATH.md "Juveniles and colour phases"), resemblance is a hypothesis. This note writes "resembles"
in its own voice. Where a source says "mimic", the word is attributed to that source.

**Presence** (rule C6): every species named as an example is in `fish.json` with the Philippines flag (`present.ph`),
by the checklist and the near-Dauin observers (`phBy`), read on 2026-11-19 [measured]. The Dauin observation counts
are given in §2. One pair a source names, *Chromis xanthura* with *C. opercularis*, is set aside: *C. opercularis* is
not in the project's list (§2.1).

## 1. The short answer

1. **Sources rarely rate difficulty.** They describe juvenile colours. A few say outright that a juvenile is easy, or
   that it is nearly identical to another species (§2.1, §2.2). No source found measures how often juveniles are
   misidentified.
2. **"Unlike the adult" alone does not make a juvenile hard.** Several juveniles that look nothing like their adults
   are called easy by the sources: *Bodianus axillaris* "easily recognized", *Thalassoma amblycephalum* "easily
   identified", besides the project's class A and early lists. What they share is a bold pattern of their own, together
   with the family's body shape [guess, from these cases].
3. **The hard ones fall into three kinds**, depending on what the juvenile lacks:
   - **the family's look**: it resembles another family, an object or another animal;
   - **the mark a finer rank teaches**: *Gomphosus* has no long snout yet, the horned *Naso* no horn yet;
   - **a pattern of its own**: it is nearly identical to a congener's juvenile.

   Pierre's case, "pas remarquables et ne ressemblent pas du tout à l'adulte", is the third kind, or the second.
4. **The difficulty depends on the rank asked.** Most of the "alike" statements in the sources concern telling a
   juvenile from its congeners. Such a juvenile still looks like its family, so it is not hard at the rank the fish
   games ask today, the IMR entries [guess]. One ease number serves every rank. So a cap set for a finer rank's
   difficulty holds back photos that are fine at the entry rank.
5. **The proposal (§4).** Keep the cap only for juveniles that a source says do not show their family's look. Note the
   finer-rank cases for the species questions, without a cap. Add one per-photo rubric line for the species no source
   covers.

## 2. What the sources say

The "Rank it is hard at" column is my reading of each source [guess].

### 2.1 Called hard, or alike, by a source

| Juvenile (Dauin obs.) | What the source says | Rank it is hard at | Label, source |
| --- | --- | --- | --- |
| *Iniistius pavo* (88) | "Small juveniles mimic drifting leaves and debris"; "elongate anterior dorsal-fin spines forming a 'flag'"; colour "from whitish with dark bars on the body, to overall brown" | Family: it resembles a leaf, not a wrasse | [read] Fishes of Australia (FoA) 296; Australian Museum (AM): "Juveniles appear to mimic dead drifting leaves" |
| *Antennarius maculatus* (108) | "Juveniles openly on reefs looking like nudibranchs" | Family: it resembles another animal | [read] FishBase |
| *Labropsis manabei* (0; Philippines) | "Juveniles nearly identical to juveniles of *Diproctacanthus*" | Genus and species: both are wrasses | [read] FishBase |
| *Bodianus mesothorax* (22) | Its juveniles "resemble" those of *B. axillaris*; they "have yellow rather than white spots" | Species: both are *Bodianus* | [read] FishBase, *B. mesothorax* and *B. axillaris* |
| *Gomphosus varius* (13) | "Small juveniles lack the elongate snout" (FishBase); "Their snout is less elongate than adults" (AM) | Genus: the bird snout is the genus's mark; still a wrasse | [read] FishBase; AM |
| *Naso unicornis* (16) | "horn first as a bump on forehead at a length of about 12 cm" | The Unicornfish sub-entry; still a surgeonfish | [read] FishBase |
| *Naso brevirostris* (4), *N. annulatus* | The horn starts at about 10 cm and about 20 cm | As above | [search] FoA; AM |
| Parrotfishes (class B) | Bellwood & Choat (1989) give "a rapid field identification guide" to the juvenile colour patterns of 24 species. "All species can be identified to the species level with the exception of two pairs of closely related species." Small juveniles are striped and alike across species | Species, and family against the wrasses | [read] the abstract; [repo] the class B note |
| Emperors (class B) | Wilson (1998): "The study is aimed as a guide to the identification of *Lethrinus* early juveniles." Pierre: early juveniles "share a few patterns of stripes and bands, told apart by close examination" | Species | [read] the abstract; [repo] Pierre, 2026-11-04 |
| *Chromis xanthura* (2) | "Juveniles of both species are very similar and difficult to tell apart" (with *C. opercularis*) | Species. **Set aside**: *C. opercularis* is not in the project's list | [read] FoA 331 |
| The look-alike pairs M1-M7 | One species resembles another, often only as a juvenile: *Acanthurus pyroferus*, *Scolopsis bilineata*, *Plectropomus laevis*, *Plagiotremus rhinorhynchos*, *Pholidichthys leucotaenia* | Family: it resembles another family | [repo] `fish.json` `lookalikes`, after Randall 2005 |

Neither class B abstract calls its juveniles hard. Both papers exist because the juveniles need a dedicated key: their
colours differ from the adults' and are told apart by close examination.

### 2.2 Called easy by a source

| Juvenile (Dauin obs.) | What the source says | Label, source |
| --- | --- | --- |
| *Bodianus axillaris* (3) | "Juveniles and females easily recognized by the generally black body with large white spots" | [read] FishBase |
| *Thalassoma amblycephalum* (3) | "Juveniles easily identified by the color pattern and rounded snout" | [read] FishBase |
| Class A: Spadefish, Sweetlips, *Ostracion cubicus* | Distinctive and recognisable; Pierre is a source for two of them | [repo] `fish_source.json` `juv` |
| Early: *Dascyllus*, *Pomacanthus*, *Macolor*, *Coris gaimard*, *Novaculichthys*, *Arothron stellatus* | Striking patterns: "still clearly *Dascyllus*", "clearly a puffer", *Novaculichthys* "unmistakable" | [repo] `fish_source.json` `juv` |

Two of these juveniles resemble an object: Spadefish and *Novaculichthys* (a resemblance to leaves or to drifting
seaweed has been suggested, [repo]). Pierre still placed them early. So resembling an object does not make a juvenile
hard by itself. It is hard when nothing in it can be taught as a mark [guess].

*Thalassoma amblycephalum* belongs to class B: *Halichoeres* and *Thalassoma* are B because their juveniles are "alike
across species". FishBase calls this one easy. Another juvenile of the same group, *Halichoeres hortulanus* (31), has
"alternating black and white bars on the body and a yellow-edged, black spot in the dorsal fin" (AM [read]). That is a
pattern of its own, though no source calls it easy.

### 2.3 Unlike the adult, with no difficulty word

These sources describe a juvenile that differs from its adult, but say nothing about how hard it is:

- *Neoglyphidodon melas* (19): "the juveniles are very pale blue with a yellow dorsal surface"; "Adults are a deep
  bluish-black" (FoA 359 [read]).
- *Lutjanus sebae* (12): "Juveniles and small adults have a dark red band from first dorsal spine through eye to tip of
  snout"; "Large adults become uniformly red" (FishBase [read]).
- *Acanthurus olivaceus* (2): "Body of adult dark grayish brown; juveniles yellow" (FishBase [read]).
- *Rhinomuraena quaesita* (33): "Juveniles all black"; the males have a yellow dorsal fin and the females change to a
  nearly all yellow colour (FishBase [read]).

None of these descriptions mentions a change of body shape [read], so I take them to keep their family's look
[guess]. By §4 they get no cap. They count as "no source" in §5, because no source rates them.

### 2.4 Where the sources are silent

FishBase pages describe no juvenile colour for several of the species with the most juvenile photos:

- *Abalistes stellatus* (25 juvenile photos);
- *Hologymnosus doliatus* (20);
- *Pomacentrus bankanensis* (20).

They mention juveniles only for their habitat or behaviour [read]. For *N. melas*, FishBase is silent, but FoA
describes the juvenile.

Reef Life Survey species pages refused the fetch (HTTP 403), so they were not read.

### 2.5 General sources

- **Why juveniles differ.** Nausicaá's ocean magazine gives two reasons. It says juveniles use "dull colours or a body
  that blends in with its surroundings" to escape predators. And "because they do not resemble adults, juvenile fish
  are not seen as rivals by adults of breeding age" [read].
- **A marine biologist's view.** Writing about Hawaii, a marine biologist says: "Even today after 2000 scuba dives in
  Hawaiian waters as a trained marine biologist I see baby fish I cannot identify" (T. Lilley, *The Garden Island*,
  2024-10-12 [read]). This is a popular source, and it names no Philippine species.
- **Visual census studies.** These measure counts and sizes, not juvenile identification. Thompson et al. (1997,
  *Marine Ecology Progress Series*) found that observer bias remained for some taxa even after training. They do not
  single out juveniles (abstract, read through the Consensus search).

## 3. What makes a juvenile hard: the candidates, checked

| Candidate | What the sources show | In the proposal |
| --- | --- | --- |
| Unremarkable, plain (Pierre's case) | Yes, at the species rank, where a source says the juveniles are nearly identical across the genus (*Labropsis* with *Diproctacanthus*, *Bodianus*, *Chromis xanthura*) or need a dedicated key (parrotfishes, emperors) | Finer rank (§4); class B keeps its cap as Q431 decided |
| Nothing like the adult | Not on its own: the bold, unlike-the-adult juveniles are called easy (§2.2) | No cap when the juvenile keeps its family's look |
| Lacks the mark a finer rank teaches | Yes: *Gomphosus* has no long snout yet, the horned *Naso* no horn yet. Hard at the rank whose card teaches that mark, not at the IMR entry | Finer rank (§4) |
| Resembles another family, an object or an animal | Yes when a source says so and the juvenile has no teachable mark of its own (*Iniistius pavo*, *Antennarius maculatus*, the M-pairs). Not when it has one (Spadefish, *Novaculichthys*) | Off class |
| Colour phases | A species-rank difficulty (Pierre, 2026-11-04, rubric 3: the phase flag caps nothing) | Unchanged |
| Small size | Already a per-photo tag: size `s`, and "a tiny fish" is listed at ease 2; camouflage `c` is capped at 3 | Unchanged: per photo, never per species |

## 4. The proposal: four classes and one rubric line

Each class is decided per species, or per genus where a source covers the genus, from a quoted source (rule C2). It is
stored as the juvenile classes are now: `tools/fish_source.json` `juv`, read by `tools/fish_judge.py` `juv_early`.

| Class | Criterion (from a source) | Ease cap | Draw timing | Examples |
| --- | --- | --- | --- | --- |
| **Off** | The juvenile does not show its family's look: it resembles another family, an object or another animal, and the source gives no mark of its own | 2, as now | Late, at Advanced, with its explanation card | Class B entries, the M-pair mimics, *Iniistius pavo*, *Antennarius maculatus* |
| **Finer rank** | Family look kept, but at a finer rank it is nearly identical to a congener's juvenile, or lacks the mark that rank's card teaches | None today; noted for the species questions | Normal | *Labropsis manabei*, *Bodianus mesothorax*, *Gomphosus varius*, *Naso unicornis*; *Halichoeres* and *Thalassoma* if Pierre agrees (§8 b) |
| **Bold** | A pattern of its own: the source calls it distinctive, easily recognised or unmistakable | None | Early, from the unit's first question | Class A, the early lists, *Bodianus axillaris*, *Thalassoma amblycephalum* |
| **Like** | Like the adult | None | Normal | Class C |

**One ease number serves every rank**, so a Finer-rank juvenile gets no cap. When species questions come, it can carry
its own difficulty at that rank (ROADMAP "Fish sheets at three levels"). Until then its source is kept as a `note`.

**The draw timing changes what players meet and when.** Off maps onto the `late` list and Bold onto `early` [read in
the code]: `core.js` `varKindOf` reads the same lists for the draw. `early` juveniles come from the unit's first
question, `late` ones at Advanced, the others from Open Water to Advanced. So the moves in §8 (b) and (c), and the Bold
additions, change when players meet these juveniles, not only their ease. That is why they are Pierre's. The proposal
adds no new data format. An entry with no `juv` record today would get one in the same format.

**No source** (most species, §5) gets no cap at species level, as Q431 decided. It gets one per-photo line for the
"Caps" section of [judging/FISH.md](../../judging/FISH.md):

> A juvenile whose outline cannot be read as a fish's of its family, as the family card shows it (no fish shape, or a
> shape the card does not show), is at most 2; a juvenile that shows its family's shape is judged like any other photo.

**A tension, named.** The rubric reads visual criteria only, and the judge never says whether a species is
recognisable. This line asks the judge to compare a photo's outline with the family card's shape. That is closer to
recognisability than the other tags. It stays on the outline: it never asks what the juvenile resembles, so no
resemblance is claimed without a source. The rubric already rates ease "for a beginner who has just seen the family's
card".

The sample test (§7) would show whether judges apply the line consistently. It would apply in the re-rating pass that
Q431 already calls for.

## 5. The project's juvenile photos in each class

Counted from `fish-game.json` (the photos in play, built 2026-11-19) [measured]. A juvenile photo is one with the
phase word `juvenile` or the `j` flag, as the app counts it (`app.js` `juvP`). Each species takes its class from its
teaching entry's `juv`. **3,057 juvenile photos of 369 species.**

STATUS gives "about 3,750 juvenile photos to re-rate" for Q431. That figure covers another pool and was not reconciled.

| Class today | Species | Photos | Proposed class |
| --- | ---: | ---: | --- |
| A and early | 30 | 500 | Bold |
| B entries (Parrotfish, Emperor) | 21 | 171 | Off |
| Late: the look-alike juveniles (*A. pyroferus*, *S. bilineata*, *P. laevis*) | 3 | 47 | Off |
| Late: *Halichoeres* and *Thalassoma*, except *T. amblycephalum* | 22 | 208 | Finer rank if Pierre agrees (§8 b), else Off |
| Late: *Thalassoma amblycephalum* | 1 | 13 | Bold |
| C | 42 | 238 | Like |
| Mixed entries, no source for the genus or species | 151 | 1,315 | No source: the rubric line, except the additions below |
| Entries with no `juv` data (circle 2 and newer entries) | 71 | 417 | No source: the rubric line, except the additions below |
| `ns` (no source found on 2026-11-04) | 28 | 148 | No source: the rubric line |
| **Total** | **369** | **3,057** | |

The study's sourced additions take these species out of "no source":

- **Off, newly sourced (2 species, 57 photos)**: *Iniistius pavo* 36 and *Antennarius maculatus* 21.
- **Off already under Q431 (2 species, 42 photos)**: the mimic side of the look-alike pairs outside the late lists
  (`fish.json` `lookalikes`, "a resembles b", the a side at the juvenile stage): *Pholidichthys leucotaenia* 37 and
  *Plagiotremus rhinorhynchos* 5. The model side, such as the young *Labroides dimidiatus* that *Plagiotremus*
  resembles, is not counted Off. Reading Q431's "look-alikes" as the mimics only is my assumption [guess].
- **Finer rank (6 species, 75 photos)**: *Labropsis manabei* 23, *Bodianus mesothorax* 16, *Gomphosus varius* 13,
  *Naso unicornis* 10, *N. annulatus* 10, *N. brevirostris* 3. Only the three *Naso* whose horn growth a source describes; the genus's other
  species stay "no source".
- **Bold (1 species, 21 photos)**: *Bodianus axillaris*.

**After the proposal**, 1,685 juvenile photos of 239 species (55%) still have no source. They rely on the rubric line.
The cap covers:

- 317 photos for sure: class B 171, the look-alike mimics 89, *Iniistius pavo* and *Antennarius maculatus* 57;
- 208 more if *Halichoeres* and *Thalassoma* stay in class B;
- whatever the rubric line catches among the 1,685.

## 6. What this study can and cannot conclude (rule A5)

**It can conclude:**

- which juveniles named by a source are called easy, nearly identical to another species, or like another animal or
  object;
- that "unlike the adult" does not predict "hard" in the sources read;
- that most "alike" statements are about the species rank.

**It cannot conclude:**

- **How hard a juvenile is for our players.** The sources describe looks. None measures identification errors by
  beginners. The players' answer log will measure it once juvenile photos are answered (rule L12; ROADMAP "Remove the
  fish easy-photos bootstrap": the sheet rates the photos from their answers).
- **Anything about the 239 species without a source.** No class can be claimed for them from this study.
- **Whether the rubric line catches the right photos.** That needs the sample test of AGENTS.md "Model choice by
  measurement" on a set of juvenile photos.

**Limits:**

- Coverage is thin. About 25 pages were read, and the work went by genus and by the species with the most juvenile
  photos.
- The [search] rows rest on a search engine's summary, not on the page itself.

iNaturalist was not used. A Juvenile annotation only records that someone recognised the juvenile, so it cannot show
difficulty. One proxy could measure it: the time a juvenile observation takes to reach Research Grade, against an
adult's, per species. As a study it would be comparable to #1186 and #1211 (about 1-2.4 h), with paced requests (rule
C7). It is an optional next step.

## 7. Estimate, in agent time

Measured with `tools/effort.py` on comparable merged PRs:

| Step | Agent time |
| --- | --- |
| Source the 239 species with no source, genus first (about 100 genera): FishBase and FoA pages, paced, the classes written to `tools/fish_source.json` `juv` with their quotes | Two or three PRs, each comparable to #1176 and #1085 (about 3 h each): 6-9 h |
| The rubric line and the class mapping in `judging/FISH.md` and `tools/fish_judge.py`, with a test | Comparable to #1072 and #1216 (5-10 min) for the code, plus the docs: under 1 h |
| The sample test of the rubric line (50-100 juvenile photos, strong model against a candidate) | Comparable to #1211: about 1 h |
| Re-rating the uncapped juvenile photos | Q431's pass, already planned; fewer photos than a full uncap |

## 8. For Pierre

(a) **The four classes and the rubric line (§4)** replace the blanket cap: Off capped and late; Finer rank, Bold and
Like uncapped; the species with no source judged per photo by the line.
_Recommendation: yes._

(b) ***Halichoeres* and *Thalassoma*.** Class B says their juveniles are "alike across species", which is a
species-rank difficulty. FishBase calls *T. amblycephalum*'s juveniles "easily identified". Move them to Finer rank?
That means uncapped for the IMR entries, noted for the species questions, and in the draw from Open Water instead of
Advanced. Or keep them in B, as Q431's «ok» leaves them?
_Recommendation: move them (208 photos); but Q431 kept B, so this is his call._

(c) ***Iniistius pavo* and *Antennarius maculatus* to Off** (capped, in the draw at Advanced), from the sources quoted
in §2.1; ***Bodianus axillaris* and *Thalassoma amblycephalum* to Bold** (uncapped, from the unit's first question).
_Recommendation: yes._

(d) **Sourcing the 239 species** (§7): now, or after the players' answers measure the juveniles?
_Recommendation: source now only the 20 genera with the most juvenile photos without a source, 889 of the 1,685
photos, one PR comparable to #1176 (about 3 h): *Pomacentrus* 185, *Lutjanus* 75, *Acanthurus* 60, *Neoglyphidodon*
53, *Chromis* 47, *Hologymnosus* 38, *Arothron* 38, *Macropharyngodon* 36, *Scolopsis* 35, *Iniistius* (other than *I.
pavo*) 34, *Epinephelus* 33, *Amphiprion* 32, *Amblyglyphidodon* 31, *Labroides* 31, *Coris* 31, *Stethojulis* 28,
*Oxycheilinus* 26, *Cephalopholis* 26, *Zebrasoma* 25, *Ctenochaetus* 25. Leave the rest to the rubric line and the
answer log._

## Sources

- Fishes of Australia, Blue Razorfish *Iniistius pavo*: <https://fishesofaustralia.net.au/home/species/296>
- Australian Museum, Blue Razorfish: <https://australian.museum/learn/animals/fishes/blue-razorfish-iniistius-pavo/>
- FishBase, *Antennarius maculatus*: <https://www.fishbase.se/summary/Antennarius-maculatus.html>
- FishBase, *Labropsis manabei*: <https://www.fishbase.se/summary/Labropsis-manabei.html>
- FishBase, *Bodianus axillaris*: <https://www.fishbase.se/summary/Bodianus-axillaris.html>
- FishBase, *Bodianus mesothorax*: <https://www.fishbase.se/summary/Bodianus-mesothorax.html>
- FishBase, *Thalassoma amblycephalum*: <https://fishbase.se/summary/5642>
- Australian Museum, Checkerboard Wrasse *Halichoeres hortulanus*:
  <https://australian.museum/learn/animals/fishes/checkerboard-wrasse-halichoeres-hortulanus-lacepede-1801/>
- FishBase, *Gomphosus varius*: <https://www.fishbase.se/summary/Gomphosus-varius.html>
- Australian Museum, Birdnose Wrasse: <https://australian.museum/learn/animals/fishes/birdnose-wrasse-gomphosus-varius/>
- FishBase, *Naso unicornis*: <https://www.fishbase.se/summary/naso-unicornis>
- Fishes of Australia, *Naso brevirostris* [search]: <https://fishesofaustralia.net.au/home/species/2195>; Australian
  Museum, *Naso annulatus* [search]: <https://australian.museum/learn/animals/fishes/ringtail-unicornfish-naso-annulatus/>
- Fishes of Australia, *Neoglyphidodon melas*: <https://fishesofaustralia.net.au/home/species/359>
- Fishes of Australia, *Chromis xanthura*: <https://fishesofaustralia.net.au/home/species/331>
- FishBase, *Lutjanus sebae*: <https://www.fishbase.se/summary/Lutjanus-sebae.html>
- FishBase, *Acanthurus olivaceus*: <https://www.fishbase.se/summary/Acanthurus-olivaceus.html>
- FishBase, *Rhinomuraena quaesita*: <https://www.fishbase.se/summary/Rhinomuraena-quaesita.html>
- FishBase, *Abalistes stellatus*, *Hologymnosus doliatus*, *Pomacentrus bankanensis* (no juvenile colour):
  <https://www.fishbase.se/summary/Abalistes-stellatus.html>,
  <https://www.fishbase.se/summary/Hologymnosus-doliatus.html>,
  <https://www.fishbase.se/summary/Pomacentrus-bankanensis.html>
- Bellwood, D. R. & Choat, J. H. (1989). A description of the juvenile phase colour patterns of 24 parrotfish species
  (family Scaridae) from the Great Barrier Reef, Australia. *Records of the Australian Museum* 41(1): 1-41:
  <https://journals.australian.museum/bellwood-and-choat-1989-rec-aust-mus-411-141/>
- Wilson, G. G. (1998). A description of the early juvenile colour patterns of eleven *Lethrinus* species (Pisces:
  Lethrinidae) from the Great Barrier Reef, Australia. *Records of the Australian Museum* 50(1): 55-83:
  <https://journals.australian.museum/wilson-1998-rec-aust-mus-501-5583/>
- Randall, J. E. (2005). A review of mimicry in marine fishes. *Zoological Studies* 44(3) [repo]:
  <https://zoolstud.sinica.edu.tw/Journals/44.3/299.pdf>
- Thompson, A. A. et al. (1997). Observer effects and training in underwater visual surveys of reef fishes. *Marine
  Ecology Progress Series* [abstract only].
- Nausicaá, "Why don't young fish look like adults?":
  <https://www.nausicaa.fr/en/the-ocean-magazine/why-dont-young-fish-look-adults>
- Lilley, T. (2024-10-12). Critter of the week, *The Garden Island*:
  <https://www.thegardenisland.com/2024/10/12/lifestyles/critter-reef-fish-baby-to-adult-color-change/>
