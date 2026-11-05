# Fish sheets: what each level should hold (study, 2026-11-05)

Read-only study for Pierre's request of 2026-11-05 (a sheet per fish taxon, at three levels: identification group, genus, species). Written from the point of view of a marine-biology educator who has built fish ID training for dive centres and survey teams. Nothing in the repository was changed.

Includes Pierre's addition of the same day: "about 3 photos" per species holds only when the species has no dimorphism or juvenile section. Juveniles often go through several phases (tiny juvenile, young "teen", young adult, adult), and sexual dimorphism can be just as layered (initial and terminal phases). The number of photos follows the number of phases to show, each phase with its own photos and description.

**Status: Pierre answered the 13 questions on 2026-11-06 (§9).** The summary, the family sheet (§3), the genus (§4), the species sheet (§5), the writing process (§6) and the order of work (§8) are updated to his answers. The main change: a **family sheet is one per family of the book** (an entry under one of its 20 shape groups), not one per IMR entry (§3.1). Q2 (the genus: a block or a page) waits on a mockup: `proto/fish-sheets.html`.

---

## 0. Summary

1. **Three levels, but not three equal sheets.** The level people learn from and that carries the teaching is the **family sheet**: one per **family of the book**, an entry under one of its 20 shape groups such as Butterflyfishes or Sweetlips (Pierre, Q1, 2026-11-06). The **species sheet** is short and mostly fed by data. Whether the **genus** is a *block on the family sheet* or a short page of its own is Q2, which Pierre decides on a mockup: 42 of the 94 circle-1 genera are either the only genus of their family (11) or hold a single species (31), so a separate page would repeat another sheet for them; a genus view adds something for the 52 genera with 2 or more species in a family with 2 or more genera.
2. **The words (Q1, answered 2026-11-06).** "Identification groups" are the book's **20 numbered body-shape groups** (e.g. "1. Disk-shaped/Colorful"), as the app already calls them; they get no sheet. **"Families" are the book's entries inside those groups** (Butterflyfishes, Angelfishes, Sweetlips…), not the IMR entries; one family can hold several genera. "Family" here is the grouping divers and the scientific community use in ID books, not the strict taxonomic rank (Sweetlips is a subfamily, Anthias a former one). Some IMR entries are genera inside a family: Chromis, Dascyllus and Pomacentrus are genera of the Damselfishes. The sheets: one per book family, then genus and species sheets inside it.
3. **Teach by contrast, at every level.** Good fish guides (and learning research on category learning) put look-alikes next to each other with the one mark that tells them apart. On each sheet, "How to tell it apart" matters more than a description.
4. **Species phases are first-class.** A species has an ordered list of the phases its sources name (juvenile, subadult or transitional, initial phase, terminal phase, female, male). Each phase gets its own photos (1-2) and a one-line description, so the photo count follows the phases (Pierre's addition). Phase names are the scientific terms the sources use, never invented: "teen" was Pierre's word, not a term to show (Q4).
5. **Mostly automatic at species level, mostly written at family level.** Names, photos (from the judging tags), presence, commonness, IMR flags, siblings, links and progress already exist in the data. Size and depth can be fetched once and cited. The writing is: one plain sentence per family, short sourced "key marks" for each species, a cue for each look-alike pair, and the phase descriptions.
6. **Corals and fish: shared components (Q12, yes), not one rigid template.** Reuse the coral sheet's building blocks (sticky name bar, my progress, hero and plain line, highlighted IMR tip box, "Don't confuse with" hub, photo strips, Other sources, report). Each subject keeps its own blocks: three views for corals; phases, size/depth and in-the-water cues for fish.
7. **Order of work** (§8): family sheet v1 from existing data → species sheet v1 automatic, with the "no photo" drawing → size/depth facts → the phase model → writing (key marks, look-alike cues: families first, then genera, then species, starting from what IMR provides; Pierre, Q7) → genus blocks or pages (Q2) → shared sheet components with the corals.

---

## 1. What I checked and how

- **Rules and specs read:** `AGENTS.md` (Rule 0; checked Manila time at the start, 10:11 Thursday, a normal working day), standing rules 1-3, 6, 6a-6g, 7, 10, 11, 16-20, 27c-27d; `docs/FISH_PATH.md` (whole file); `docs/ARCHITECTURE.md` "Subjects", "Fish content", "Fish candidates", "Photos per context"; the fish rows of `docs/ROADMAP.md` (Fish mode, look-alikes at any rank, admin plan PRs 5-11); `judging/FISH.md` (tag vocabulary and phase field).
- **Data inspected with small Python one-liners** (read-only): `fish.json` (47 teaching nodes, 467 species, 442 in the game, 340 in circle 1; the node fields `cues`, `look`, `phase`, `juv`, `sub`, `dimorph`, `sl`; the species fields `name`, `now`, `common`, `cmi`, `cs`, `present`, `pdf`). `tools/fish_source.json` `keys`: the 20 groups and their family labels. `fish-cand.json`: candidate counts and iNaturalist life-stage annotations. Counts used in this study come from those runs:
  - 27 circle-1 entries; 94 circle-1 genera; 10 genera are the only genus of their entry, 32 hold a single species, 52 have 2+ species in an entry with 2+ genera (counted per IMR entry; per book family, after Pierre's Q1 answer: §3.1).
  - Species per entry range from 1 (Moorish Idol) to 66 (Wrasse) and 55 (Damselfish).
  - Candidate photos: 5 circle-1 species have none (*Chromis agilis*, *Halichoeres chlorocephalus*, *H. marginatus*, *Pomacentrus armillatus*, *Siganus margaritiferus*: these need the "no photo" drawing); 138 circle-1 species have at least one candidate annotated "juvenile" on iNaturalist, which is a lower bound on species with a juvenile photo available, not a count of species whose juveniles look different.
- **The coral genus sheet:** read `learn.js` `viewGenus`, `myProg`, `lookHub` and `viewFishList` line by line. I tried to screenshot `#g-Acropora` at 390 px with headless Chrome on a local server, but the run hung (most likely on the remote photos through the proxy) and gave no image, so **the description of the coral sheet below comes from the code, not from a screenshot.** Partway through, the `governance` worktree was removed, so I carried on from the main checkout (`075ec4f3`).
- **External checks:** a web search on *Reef Fish Identification – Tropical Pacific* (2nd ed., 2015). Its publisher's description, as reported in listings, says: 20 identification groups based on visual or behavioural characteristics; each species with common, scientific and family names, size, description, visually distinctive features, habitat, behaviour, depth and distribution; arrows on the photos pointing at the features that tell similar species apart; similar species grouped together. **I did not see the book's pages**, so the exact section headings are unverified. Reef Life Survey species pages (through search results; the site refused a direct fetch): a short "identifying features" text often covering the juvenile, then max size, depth range and distribution. iNaturalist's `identifications/similar_species` endpoint, two calls with a User-Agent, one second apart (rule 6f), for *Chaetodon kleinii*:
  - Philippines only: 2 taxa, one of them *C. marleyi*, a South African species;
  - worldwide: 9 taxa, including the eastern Pacific *Johnrandallia nigrirostris*.

  So it can seed look-alikes but must be filtered by the presence rule (6g) and checked by a person.
- **From my own background, not checked here (labelled):** how FishBase, REEF, Fishes of Australia, Kuiter's and Lieske & Myers' guides lay out a species; the learning-science points (contrast between look-alikes, varied examples, few cues per category). Treat their exact wording as **my summary**.

---

## 2. Who the sheets are for, and what a good fish sheet does

**Learners:** RAs on phones (360-412 px). They learn to name fish quickly from SVS stereo-video frames, which they pause frame by frame in EventMeasure (FISH_PATH "Parked": no timed mode), and on dives. They range from beginners to experts. In EventMeasure they tag the **PDF scientific species name**, and they also measure **length**.

**What field guides and survey programmes do well** (from my background; the book's structure as far as public information allows):

| Resource | What it does that we should borrow | What we should not copy |
| --- | --- | --- |
| Allen et al. 2015 (the key) | Families grouped by body shape; one photo per phase; **arrows on the photo pointing at the deciding mark**; similar species on the same spread; size, depth, habitat and behaviour in a few lines | Its photos and text (copyright). We cite the group and pages only |
| Reef Life Survey | Short, diver-oriented identifying text, juvenile included; max size; depth; built for underwater visual census | Its photos (licence unclear); global distribution |
| REEF (fish ID training, from memory) | Training by families first, then the species "most likely seen"; tests on photos | Its Caribbean examples (rule 6e) |
| FishBase | Max length, depth range, habitat, country checklist (already used for presence) | Meristics (fin-ray counts), long biology texts: useless underwater |
| iNaturalist | Many photos, life-stage annotations, a "similar species" list built from identification disagreements | The page itself: Pierre explicitly does not want a copy |
| Learning research (summary) | Few cues per category, varied photos rather than one perfect photo, look-alikes side by side, cues tied to what the learner can actually see | Long descriptions read once |

**What a learner needs at each level:**

| Need | Family | Genus | Species |
| --- | --- | --- | --- |
| Body shape and how it moves (visible on video) | **Core** | – | – |
| The IMR cues (rule 3) | **Core** | IMR sub-entry cues where they exist | – (IMR has none per species) |
| Look-alikes and the deciding mark | Family vs family | Genus vs sibling genera | **Core**: species vs species, also across families |
| Colour pattern, key marks | Family pattern | Genus pattern | **Core** |
| Juveniles and phases | Whether the family's juveniles or phases differ | – | **Core, per phase** |
| Size, depth, habitat, behaviour | Range across the family | – | One line each |
| How common near Dauin | Which species to meet first | Most met species | Rank in its family |
| Names | IMR name, family | Scientific genus | PDF name, WoRMS name, 1-3 common names |

---

## 3. Level 1: the family sheet (one per family of the book; the fullest)

### 3.1 What a "group" is here

- The book's index has two levels: **20 numbered groups** by body shape, and **family labels** under each (`tools/fish_source.json` `keys[0].groups[].labels`). Pierre's examples ("angelfish, butterflyfish, sweetlips; often several genera, neither a family nor a genus") are labels. Sweetlips is a subfamily (Plectorhinchinae), Anthias a former subfamily, Lionfishes a subfamily (Pteroinae).
- **Pierre's answer (Q1, 2026-11-06): a family sheet is one per book family label**, not one per IMR entry. "Family" is the grouping divers and the scientific community use in ID books, even where modern phylogenetics would split it. The 20 shape groups get no sheet: their place is the families page (already ordered by them) and Fish basics ("body shape first"). See "Nice" below for a light group card.
- **How the IMR entries sit in the book families** (from `fish.json` and the key's labels, checked 2026-11-06 with a small script). Most circle-1 entries are one book family under another name (IMR "Bream" = Coral Breams, "Pufferfish" = Puffers, "Lionfish" = Lionfishes). The differences:
  - **IMR sub-entries that are genera inside a family:** Chromis, Dascyllus, Pomacentrus and Anemonefish (*Amphiprion*) in the Damselfishes; Bannerfish (*Heniochus*) in the Butterflyfishes; Unicornfish (*Naso*) in the Surgeonfishes. IMR's "Surgeonfish" sub-entry spans three genera (*Acanthurus*, *Ctenochaetus*, *Zebrasoma*): a heading over their genus blocks or rows, not a genus.
  - **Damselfishes/Anemonefishes:** the book's index has it as a label of its own beside Damselfishes. Open point: a genus (*Amphiprion*) on the Damselfishes sheet, or a family sheet of its own. Recommendation: a genus on the Damselfishes sheet (WoRMS files *Amphiprion* directly under Pomacentridae, IMR keeps it inside Damselfish, and the label reads as a sub-heading); the mockup shows it that way.
  - **IMR Groupers holds *Diploprion bifasciatum***, which the book's labels put under Soapfishes (Diploprioninae). Open point: a Soapfishes sheet (the book's family, Q1) or the Groupers sheet (IMR's entry). Recommendation: the Soapfishes sheet, as Q1 says, with a line that IMR teaches it with the groupers; the quiz keeps IMR's entry (rule C1), and the difference goes to `points.json` (rule C5).
  - **Circle 3:** "Seahorses & pipefishes" and "Stonefishes & waspfishes" each span two book labels (Seahorses, Pipefishes; Stonefishes, Waspfishes); "Morays & ribbon eels" is Morays, "Rays" Stingrays, "Reef sharks" Requiem Sharks; Thresher sharks has no group in the key (`keyWhy`). Which genus goes to which label in circle 3 is **not checked here** (WoRMS has moved the waspfishes between families).
  - Counts with the book families (circle 1, Damselfishes/Anemonefishes as one family, *Diploprion* on its own): 28 families, 94 genera, 340 species; 11 genera are the only genus of their family, 31 hold one species in a family of several genera, 52 hold 2 or more species in a family of several genera.

### 3.2 Content

**Must**

| # | Block | Content | Source | Automatic / written |
| --- | --- | --- | --- | --- |
| F1 | Name bar | The **scientific name first** (Q10: Chaetodontidae, Plectorhinchinae), then the common names (the book's label, IMR's name when it differs); WoRMS where it differs (`fam`, `wfam`, `altName`); key group "7. Heavy Bodies/Large Lips" with the key's `short` credit | `fish.json`, the key | Auto |
| F2 | My progress | The coral `myProg` line (level, %, what is still needed) | Engine | Auto |
| F3 | Hero photo + plain sentence | The cover (Q3: a reference or easy photo first, whoever took it; Pierre's own only when it is itself reference or easy), then one plain sentence of at most 30 words (shape, how it swims, size, a comparison), as coral `plain` | Photos auto; the sentence written from 2+ sources, the same method as `tools/plain_sources.json` | Written (28 lines for circle 1) |
| F4 | ID tips (IMR) | The IMR entry's `cues`, verbatim, in the highlighted box; slide numbers (`sl`) as the source | IMR presentation | Auto (exists) |
| F4b | Family ID marks (Q11) | The more precise family-level marks that identify the family, beyond IMR's cues, e.g. for the angelfishes the small spine sticking out on the cheek (preopercular spine) and nearly always some blue. Start from what IMR gives; each mark sourced | IMR first, then RLS, FishBase, the book (page) | **Written**: agent drafts, Pierre validates (Q7, the first writing priority) |
| F5 | How to tell it apart | One card per look-alike: our photo and theirs at the same size, side by side, with IMR's line (`look`: "Angelfish: spine on the gill cover, iridescent blue"). Then pairs from the players' confusions, labelled as such (as the corals' `dataLooks`). Later, the cross-family species pairs (some dwarf angelfish vs some dark damselfish), applied by photo | IMR; answer log; later sourced species pairs (FISH_PATH "Look-alikes at any rank") | Auto, plus written cues for new pairs |
| F6 | Genera in this family | **Block or page: Q2, decided on the mockup** (`proto/fish-sheets.html`). As a block: one per genus: the scientific name, its IMR sub-entry name and cues if it has one (Chromis: "Deeply forked tail…"), one written mark that separates it from its sibling genera, and a strip with one photo per species (commonness order, up to 6, "+N more"). Skipped when the family has a single genus (11 families in circle 1) | `fish.json` `sub`; the written mark sourced | Mostly auto; the genus mark written |
| F7 | Species in this family | Every species (Q5), one thumbnail each, in commonness order (`cmi`), the IMR 24 most sighted marked, the scientific name first then the common name (Q10), a tap opening the species sheet. There will be very many, so a filter, **on by default**, shows only the species opened for the player ("Opened for me"); one tap shows them all, so everything stays reachable (Q5). A species with no photo shows the drawing | `fish.json`, photos, the player's progress | Auto |
| F8 | Juveniles and phases | When the family's juveniles or phases differ: the IMR `phase` lines (verbatim) and the juvenile class trait (`juv.trait`, sourced, mimicry written as "resembles"), with 2-4 photos side by side (adult beside juvenile, IP beside TP). The same content as the "introduced with an explanation" card of FISH_PATH: **one source for both** | `fish.json` `phase`, `juv` | Auto (exists) |
| F9 | Behaviour, habitat, size (Q11) | 2-4 short lines on what can be seen at a distance or on a paused frame: swimming mode, alone, in pairs or schools, near the bottom or in mid-water, typical size range ("most 10-20 cm, up to 35 cm": computed from the species' max lengths, §5). Many of these are already IMR cues (Parrotfish "flapping like a bird", Chromis "schools above the coral"); the rest come from sources | IMR cues; RLS / FishBase; the book (cited by page) | Size range auto; lines written |
| F10 | Report a problem | `repBtn` | – | Auto |

**Nice**

- **Other sources** (dated, sourced notes, folded under "More details", as the coral `info`): where a source differs from IMR (rule C1). Q11's general information is behaviour, habitat and size (F9) plus the family ID marks (F4b), not trivia.
- **Its group in the key:** a small strip of the other families in the same shape group (the families page's group heading made tappable), so the learner sees its shape neighbours.
- **Mix-up line:** "you mixed them up ×N" on look-alike cards (exists for corals).
- **Line drawings with pointers** (our own, rule 7): a body outline with arrows on the IMR cues (gill-cover spine, two scalpels, heart-shaped tail). This is the book's arrow idea in our own drawings. Good value per hour for the families, and reusable in Fish basics.
- **In the key:** a link into the future Fish ID Key at this family.

**Not**

- No copied text or photos from the book or the local course (FISH_PATH: inspiration, never citation).
- No world distribution map, fisheries, aquarium or IUCN detail, no fin-ray or scale counts, no worldwide species counts.
- No long text: everything beyond F1-F5 sits below the first screen.
- No growth-form-style filter: the shape group is shown, never used to filter (rule 4's spirit).
- No IMR slide photos (rule 7, fish).

### 3.3 Photos (family)

- Nothing needs a family photo pool of its own. Everything is drawn from the species' curated photos:
  - hero: 1, a reference or easy photo first, whoever took it (Q3), profile, whole fish;
  - genus strips and species grid: one cover per species;
  - phase comparisons: 2-4, from the species phase photos;
  - look-alike cards: the other family's or species' cover.
- Until curated species photos exist (admin plan PR 7), the stopgap `fish-photos.json` and its judged tags (`e`, `jt`) are enough for a v1 (admin-only beta).

### 3.4 Wireframe (phone, 360-412 px)

The IMR lines are real (`fish.json` t02); the sizes and counts shown are placeholders.

```
[sticky bar]  Chaetodontidae · Butterflyfishes · 1 Disk-shaped/Colorful       ‹ ›
[my progress] ● Open Water 62% · Still needed: …
[hero photo, full width, tap = enlarge, credit in lightbox]
Plain sentence (body text, no label).
┌ ID tips (IMR) ───────────────────── slide 10 ┐
│ • Small terminal mouth: feeds on coral polyps │
│ • Dorsal, tail and anal fins curve into a disc│
│ • Black band over the eye …                   │
└───────────────────────────────────────────────┘
How to tell it apart
 [our photo | Angelfish photo]  "Angelfish: spine on the gill cover, iridescent blue"  IMR
 [our photo | …] Often mixed up by players
Genera (4)
 Chaetodon · 18 species — mark …       [6 thumbs →tap species] +12
 Heniochus = Bannerfish (IMR) — "No yellow on the saddle…"  [2 thumbs]
 …
Species (23)                 [✓ Opened for me · 6] [All species · 23]
 [3-column grid of thumbs, scientific name then common name; ★ = IMR 24 most sighted]
Family ID marks (written, sourced; Q11)
Juveniles and phases           (only when the family has them)
 [adult | juvenile] + IMR line + sourced trait
Behaviour, habitat, size       2-4 lines · most 12-20 cm, up to 30 cm
▸ More details (Other sources, its group in the key, references, Fish ID Key)
⚑ Report a problem with this sheet
```

On tablet and desktop: hero left, tip box and plain line right (as the coral `.hero` / `.idbox`). The grid has 4-6 columns, and no horizontal sliders (rule 20): strips wrap or fold behind "+N more".

---

## 4. Level 2: the genus (a block or a page: Q2, on the mockup)

Pierre wants genus sheets inside each family (Q1) and decides on a **mockup** whether they are blocks on the family sheet or short pages (Q2, 2026-11-06). The mockup, `proto/fish-sheets.html`, shows both options on real data for the Damselfishes (several genera with many species) and the Moorish Idol (one genus, one species). The content below is the same either way.

### 4.1 Why not a full sheet for every genus

- 94 circle-1 genera. In 11 book families the genus *is* the family (Platax, Siganus, Plectorhinchus, Pseudanthias, Scolopsis, Myripristis, Parapercis, Zanclus…), and 31 genera hold one species, so their page would repeat the species sheet. That leaves 52 genera where a genus view adds something (counts with the book families, §3.1; the first version of this study counted per IMR entry: 10, 32, 52).
- What a learner needs from a genus is **what sets it apart from its sibling genera**, which is a comparison best seen on the family sheet (F6), plus a feel for its range: one photo per species is more representative than 6 photos of whichever species has the most.
- The genus matters for branch B (scientific genus questions, `fishGenera`). The quiz's genus card already shows the IMR sub-entry's cues or its most met species, and can link to the block.

### 4.2 Content (block on the family sheet; the same content as a short page for the 52)

**Must**

- The scientific genus name (italic), and its IMR sub-entry name if it has one (Chromis, Dascyllus, Pomacentrus, Anemonefish = *Amphiprion*, Bannerfish = *Heniochus*, Unicornfish = *Naso*; IMR's "Surgeonfish" sub-entry spans *Acanthurus*, *Ctenochaetus* and *Zebrasoma*, so show it as a heading over those three).
- The IMR sub-entry cues (verbatim) where they exist.
- **One genus mark**: what sets it apart from its sibling genera in this family, sourced (written: agents draft, Pierre validates, after the family marks and before the species, Q7; about 52 lines, starting from IMR's sub-entry cues where they exist).
- **Representative photos**: one per species, most common first, up to 6 (Pierre's "about 6"), tap → species sheet. Automatic from the species covers.
- The number of species in the game; my progress on the genus unit if the player has the "Scientific names" set on.

**Nice**

- Sibling-genus look-alikes with photos (from the data: same family, `look` on the genus unit).
- The WoRMS note where the PDF genus differs (e.g. *Chromis agilis* now *Pycnochromis* in WoRMS: rule 6a, shown as "now … in WoRMS").

**Not**

- No separate description or behaviour text (it belongs to the family or the species).
- No page for a single-species genus (link straight to the species) or for the sole genus of a family (the family sheet is the genus page). The mockup shows what such a page would look like, so Pierre can judge it (Q2).

### 4.3 Wireframe (short page, phone)

```
[sticky bar] Chaetodon · genus · Chaetodontidae                         ‹ ›
[my progress on the genus, if Scientific names is on]
Mark: one line, source chip
[2×3 grid: one photo per species, names under]   +12 species → family sheet grid
Don't confuse with: Heniochus (mark) · Forcipiger (mark)   [thumbs]
```

---

## 5. Level 3: the species sheet (short; phases decide its length)

### 5.1 Content

**Must**

| # | Block | Content | Source | Automatic / written |
| --- | --- | --- | --- | --- |
| S1 | Names | The **scientific name first** (Q10): the **PDF name** (as EventMeasure names it, rule S2), then "now X in WoRMS" when it differs (`now`), then the 1-3 curated common names (`tools/fish_common.json` once Pierre validates it). Both kinds always visible on a sheet (a reference, not a quiz) | `fish.json`; `fish_common.json` | Auto |
| S2 | Badges | Its family (link) and genus (link); "IMR most sighted #12" (`cs`); "On the IMR reference list" (`pdf`); "Confirmed near Dauin" or "Not confirmed near Dauin" (rule 6g wording, never "never seen") | `fish.json` `present`, `cs`, `pdf` | Auto |
| S3 | Photos, adult or main form | **3**: (1) field-guide view; (2) another angle or light; (3) one **realistic** photo, oblique, small or with some colour loss, like a video frame. All from the curated photos by their judging tags. **Order (Q3): reference photos (`rep`) and easy photos (ease 4-5) first, whoever took them**; Pierre's own come first only when they are themselves reference or easy, never by priority. No IMR video frames for now (Q13) | Curated `fish.add` + `jt`, `e`, `rep` | Auto (picked by tags; Pierre can pin) |
| S4 | Key marks | 1-3 short marks that identify it on a photo, the deciding one first, each with its source. Our own words | RLS, FishBase, Fishes of Australia, the book (page), Kuiter; ≥2 sources | **Written** (the main writing load) |
| S5 | Phases (when the species has them) | One section **per phase the sources name**, in life order: e.g. *small juvenile → juvenile → subadult/transitional → adult*, or *initial phase → terminal phase*, or *female → male*. Each section: the phase name (the scientific term the source uses, Q4; never "teen"), a size range if the source gives one, **1-2 photos** of that phase, one description line ("white spots on brown; the adult pattern appears at about 10 cm"), source. **The photo count follows the phases**: about 3 + 1-2 per extra phase (Pierre, 2026-11-05) | Phase existence and wording from sources; photos from `jt` `j` and the `phase` tag | Photos auto once tagged; descriptions written |
| S6 | How to tell it apart | Species look-alikes **confirmed in the Philippines** (rules C6, C8), each with its photo beside ours and the deciding mark. Seeds: same genus or IMR sub-entry; the players' confusions (species to species once logged); iNaturalist `similar_species`, a good starting point (Q8), kept only for species present in the same region (the presence rule) and checked by a person; named by Pierre. Cross-family pairs included | Data + written cue, sourced | Seeds auto; cues written |
| S7 | Size and depth | "Up to X cm" (max total length) and "Y-Z m"; habitat in a few words (e.g. "reef slope, near branching coral") | Reef Life Survey first, else FishBase (Q6); each value with its source, dated | Fetched once, cached (new tool) |
| S8 | No photo | If the species has no usable photo: the **generic fish drawing** (child-like, one drawing for all), "No photo yet", and links to iNaturalist and FishBase | – | Auto |

**Nice**

- **Behaviour on video**, one line, only when it helps ID (e.g. "hovers head-down", "always in pairs", "rests on the bottom on its fins"), sourced.
- **Commonness near Dauin**: "3rd most met of 55 damselfish near Dauin" (rank by `cmi`, an index Pierre approved; a rank, not a new category).
- **My progress** on the species (common-name and scientific-name parts), once species questions exist.
- **Links**: iNaturalist taxon (`inat`), WoRMS (`ref`), FishBase.
- **Arrows on the field-guide photo** (the book's idea, our own overlay): a small SVG pointer on the deciding mark, stored as coordinates. High teaching value; costly per species, so the most sighted species first.

**Not**

- No copy of iNaturalist (no map, no seasonality chart, no taxonomy tree, no observation counts beyond the presence badge).
- No long biology, diet, reproduction or fisheries text; no IUCN status (not an ID need).
- No look-alike or doubt from a species not confirmed in the Philippines (rule 6e).
- No phase invented to fill a pattern: a species gets only the phases its sources describe and its photos show.

### 5.2 The phase model (Pierre's addition)

- **Data:** per species an ordered `phases` list:

  ```
  {id, label, sizes?, line, src, photos: [f…]}
  ```

  - `label` is the scientific term the source uses (Q4, 2026-11-06). The usual ones in Indo-Pacific guides (my background) are "juvenile", "subadult", "transitional", "initial phase", "terminal phase", "female", "male". IMR's presentation uses "sub-adult", "intermediate" and "terminal" (`fish.json` `phase`; the judging rubric's `phase` values are `subadult`, `intermediate`, `terminal`, `female`, `male`).
  - Where IMR has a term, keep it (rule 1); where a source splits finer (small juvenile vs juvenile), show that split only if it has photos.
  - The adult or main form is the default section (S3) and is not repeated.
- **Photos:**
  - the judging rubric already has the `j` flag and the `phase` field, and iNaturalist annotations (`st`: juvenile, male, female) are hints;
  - what is missing is **finer juvenile stages** (tiny, juvenile, subadult): add a stage field or extend `phase` with `subadult` for juveniles. That changes the rubric, so it is Pierre's call (his Q4 answer settled the terms, not this; still open).
  - The admin Candidates swiper already puts "missing phases first" (admin plan PR 5): the phase list per species gives it the target.
- **Count:** sheet photos per species = 3 + Σ (1-2 per extra phase). Parrotfish or wrasse with juvenile, IP and TP: about 6-8; *Pomacanthus* with juvenile, transitional and adult: about 6-7; most damselfish and cardinalfish: 3.
- **One source for three uses:** the species sheet's phase sections, the quiz's "introduced with an explanation" card (FISH_PATH), and the family sheet's F8 strip read the same data.
- **How many species need it:** unknown. Estimate, a guess: the 20 parrotfish, many of the 66 wrasse, the anthias, *Pomacanthus*, *Platax*, *Plectorhinchus*, some groupers, damselfish and pufferfish, so perhaps 80-150 of 340. Only 2 entries carry `dimorph` today, and 138 species have an iNaturalist "juvenile" candidate (not the same thing as a distinct juvenile).

### 5.3 Wireframe (phone)

Names, sizes, depths and lines below are layout placeholders, not checked facts about *C. kleinii*.

```
[sticky bar] Chaetodon kleinii · Butterflyfish › Chaetodon                ‹ ›
Sunburst butterflyfish · Klein's butterflyfish           (common names, 1-3)
[badges] ★ IMR most sighted #n · IMR list · Confirmed near Dauin
[photo 1, full width]           ← field-guide view (+ optional arrow)
[photo 2][photo 3]              ← other angle · realistic/video-like
Key marks
 • deciding mark (source)
 • second mark (source)
Up to 15 cm · 4-60 m · reef slope, often in pairs           (RLS)
How to tell it apart
 [ours | C. xxx]  "C. xxx has …, this one …"   (source)
Phases                                  (only if the species has them)
 Juvenile · up to 4 cm   [photo][photo]   line (source)
 Subadult                [photo]          line (source)
▸ More details (WoRMS / iNaturalist / FishBase links, other sources)
⚑ Report a problem
```

No-photo species: the drawing takes photo 1's place, "No photo yet", the rest of the sheet as usual (names, badges, any written marks, links).

---

## 6. Automatic vs written: the full inventory

| Item | Level | Status today | How |
| --- | --- | --- | --- |
| Names (PDF, WoRMS, common) | all | In `fish.json`; curated common names waiting on Pierre | Auto |
| Key group, family, genus, siblings, species lists | all | In `fish.json` | Auto |
| IMR cues, look-alike lines, phase lines, sub-entries, slides | family, genus | In `fish.json` | Auto, verbatim |
| Juvenile classes and traits (sourced) | family | In `fish.json` `juv` | Auto |
| Presence badges, IMR flags, commonness rank | species | In `fish.json` | Auto |
| Photos by role (hero, realistic, phase) | all | Judging tags exist (`e`, `jt`, `phase`); curation in progress | Auto pick from tags, Pierre's pins win |
| Players' confusions | all | Not logged for fish yet (admin plan PR 11) | Auto later |
| Size range per family | family | – | Computed from species sizes |
| Max size, depth, habitat words | species | – | **New fetch tool**, cached, each value with its source and date |
| iNaturalist similar species | species | – | Seed tool, presence-filtered, for writers only |
| Plain sentence | family | – | **Written**, 28 lines (circle 1), 2+ sources each |
| Family ID marks (Q11) | family | Partly in IMR cues | **Written**, sourced, first priority (Q7) |
| Behaviour, habitat, size lines (Q11) | family | Partly in IMR cues | **Written**, sourced |
| Genus mark | genus | Partly in IMR sub cues | **Written**, about 52 |
| Key marks | species | – | **Written**, 340 species × 1-3 lines |
| Look-alike cues (species pairs) | species | – | **Written**, one per pair |
| Phase list and lines | species | – | **Written** (phases from sources), photos tagged |
| Arrows / outline drawings | family, species | – | Drawn (our own), optional |

**Writing process (Q7, answered 2026-11-06): agents draft, Pierre validates and judges the quality.**

1. **Order: families first, then genera, then species**, each level starting from what IMR already provides (its cues, sub-entry cues, look-alike and phase lines).
2. An agent drafts the family ID marks and "don't confuse with" lines (then genus marks, then species key marks and look-alike cues, and phase lines), each line with 2+ sources and a presence check for every species it names (rules C6, C8, the test passed written down). iNaturalist "similar species" is a starting point for species look-alikes, kept only for species present in the same region (Q8).
3. Pierre validates each batch and judges its quality; once he is happy with the first ones, the process runs family by family, starting with the starter families (Butterflyfishes, Angelfishes, Damselfishes, Surgeonfishes).

The drafts are plain data (a `tools/fish_sheets.json` or fields in `fish_source.json`), built into `fish.json` like the rest.

---

## 7. Corals and fish: one sheet model?

- **The coral sheet today** (from `viewGenus`):
  1. sticky name bar;
  2. warning line (Millepora, starred);
  3. my progress;
  4. hero photo beside the plain line, ID tips (IMR) box and mnemonic, IMR lecture notes;
  5. the Coral ID Key criteria;
  6. "More details" (check with a trainer, Other sources, in the key, references);
  7. one photo row per view (colony, close-up, corallites; 3 featured + "N more");
  8. the "Don't confuse with" hub (same view for every look-alike, mix-up counts, compare links);
  9. report.
- **What fish can reuse as is:** 1, 3, 4 (hero, plain line, tip box), 6, 8 (with fish cards in place of views), 9, and the lightbox and credit rules (rule 11).
- **What differs:** corals have views at three distances, while fish have phases and a "realistic photo" role. Fish have levels (family → genus → species) and corals one (genus). Fish add size, depth and in-the-water lines.
- **Decided (Q12, 2026-11-06): homogeneous coral and fish sheet models, with shared components.** Build the fish sheets from **shared components** (bar, progress, hero+tips, look-alike hub, photo strip, More details, report) with subject-specific blocks, driven by the subject registry (`UNITS[id]`), never by a subject name in the code (rules 14a, 16). Do not refactor the coral sheet first: once the fish family sheet is stable, move the coral sheet onto the same components in its own PR, with the corals looking exactly as they do now.

---

## 8. Projects, in order

1. **Family sheet v1 (existing data only).**
   - one per book family (Q1); F1-F8 and F10, from `fish.json` and the curated or judged photos, ordered by Q3; the species filter "Opened for me", on by default (Q5); the genus as block or page once Pierre has chosen on the mockup (Q2);
   - the families page becomes the index (each family taps through to its sheet), and the first-meeting card links to it;
   - admin-only beta like the rest of fish.
   - No new writing, so it can ship once Pierre has approved the layout (screenshots).
2. **Species sheet v1 (automatic).**
   - S1-S3, S6 seeds (same genus, IMR sub, iNaturalist similar species in the same region), S8 with the drawing, links, commonness rank;
   - species grid on the family sheet;
   - needs curated species photos or, meanwhile, judged candidates (admin only).
   - The drawing: one SVG of our own.
3. **Facts tool:** max size, depth, habitat words, fetched once from Reef Life Survey then FishBase (Q6), cached, each value with its source, shown as "up to X cm"; the family size range. Batched and paced (rule C7's spirit for any API).
4. **Phase model:**
   - the `phases` list per species and the rubric's finer juvenile stages (Pierre's decision);
   - the swiper's "missing phases first" target;
   - phase sections on species sheets, F8 and the quiz's explanation card from one source.
5. **Writing pipeline (Q7: families first, then genera, then species; from what IMR provides):**
   - family plain sentences (28), family ID marks, "don't confuse with" lines, behaviour, habitat and size lines;
   - then genus marks (52);
   - then species key marks and look-alike cues family by family, the most sighted first.
   - Each batch with sources and presence tests; Pierre validates and judges the quality.
6. **Genus blocks or short genus pages** (Q2, the mockup's choice; after the scientific genera PR is settled), linked from the quiz's genus card.
7. **Shared sheet components with the corals** (refactor, corals unchanged).
8. **Later, optional:** outline drawings with pointers for the families; arrows on species photos (most sighted first); the light group card for the 20 shape groups; "Find the X" and other formats reading the same sheet data.

---

## 9. Questions for Pierre (answered 2026-11-06)

Each question as asked on 2026-11-05, with its recommendation, then Pierre's answer of 2026-11-06.

- **Q1. What an "identification group" sheet is.**
  - The app calls the book's 20 numbered shape groups "identification groups". Your examples are the family labels under them, which match the 27 IMR entries.
  - **Recommendation:** one sheet per IMR entry, called a *family sheet*; the 20 groups keep their name and get no sheet of their own (shown on the families page and in Fish basics).
  - **Answered 2026-11-06:** "identification groups" are the book's 20 body-shape groups; they need no sheet. **"Families" are the book's entries inside those shape groups, not the IMR entries**; one family can group several genera. The sheets to build: one per book family, then genus sheets and species sheets inside it. Some IMR entries are genera, not families (Chromis and Dascyllus are genera of the damselfish family). "Family" for fish here is not the strict taxonomic sense but the grouping divers and the scientific community commonly use, as in ID books, even where modern phylogenetics would split it. (§3.1 lists where the IMR entries and the book families differ, with two open points.)
- **Q2. The genus: a page or a block?**
  - **Recommendation:** a block on the family sheet for every genus (sibling contrast, one photo per species), plus a short page only for the 52 genera with 2+ species in an entry with 2+ genera. No page for single-species genera or for an entry's only genus.
  - **Answered 2026-11-06:** Pierre wants a **mockup** to decide: a family sheet with genus blocks and a short genus page, for (a) a family with several multi-species genera and (b) a family whose genus has one species. Built: `proto/fish-sheets.html` (Damselfishes and Moorish Idol, option A blocks, option B pages). **Open until he chooses.**
- **Q3. Species photos.**
  - **Recommendation:** 3 for the adult or main form, one of them a deliberately realistic, video-like photo, plus 1-2 per extra phase (your addition), picked from the judging tags with your pins winning.
  - **Answered 2026-11-06:** reference and easy photos first, whoever took them. Pierre's own photos only when they are themselves reference or easy, never by priority.
- **Q4. Phase names and stages.**
  - **Recommendation:** each species shows only the phases its sources name, under the source's term ("subadult"/"transitional" rather than "teen"; IMR's "sub-adult", "intermediate", "terminal" kept where IMR uses them).
  - Add a finer juvenile stage to the judging rubric so photos can fill each phase. Changing the rubric is your call.
  - **Answered 2026-11-06:** the scientific terms the sources use. "Teen" was his word, not a term to use. (The finer juvenile stage in the rubric was not part of the answer: still open.)
- **Q5. Species not yet open in a player's path.**
  - **Recommendation:** sheets show every species (a reference); opening them stays the quiz's job. No mystery tiles in Learn (they stay in My progress, as decided).
  - **Answered 2026-11-06:** sheets can show every species. There will be very many, so add a filter, **on by default**, e.g. "species opened for me". Everything stays reachable.
- **Q6. Size, depth and habitat facts.**
  - **Recommendation:** Reef Life Survey first (CC BY, written for divers), FishBase where RLS has none, each value with its source; "up to X cm" (max length), since that is what sources give.
  - **Answered 2026-11-06:** OK as recommended.
- **Q7. Who writes species key marks and look-alike cues.**
  - **Recommendation:** agent drafts with 2+ sources and a presence test per species named; you check a first family in the admin, then it becomes a decided process, the IMR 24 most sighted and the starter families first.
  - **Answered 2026-11-06:** agents draft key marks and "don't confuse with"; Pierre validates and judges the quality. Priority order: **families first, then genera, then species.** Start from what IMR already provides.
- **Q8. iNaturalist "similar species".**
  - **Recommendation:** use it only as a seed for writers, filtered by the presence rule and checked by a person. Never shown raw: the test call returned a South African and an eastern Pacific species.
  - **Answered 2026-11-06:** a good starting point, only for species present in the same region (the presence rule).
- **Q9. The "no photo" drawing.**
  - **Recommendation:** one generic child-like fish for every species, labelled "No photo yet". Not one drawing per body shape, which could be read as ID information.
  - **Answered 2026-11-06:** one generic "No photo yet" drawing for everyone.
- **Q10. Names on sheets.**
  - **Recommendation:** always both names on a sheet (it is a reference), ordered by the player's names choice; the PDF name first among scientific names, the WoRMS name as "now X in WoRMS".
  - **Answered 2026-11-06:** the **scientific name first**, then the common name(s).
- **Q11. "General information from other sources" on the family sheet.**
  - **Recommendation:** limited to what helps identify (behaviour, swimming, habitat, size) plus at most one memorable fact, sourced, behind "More details" when it is not ID-relevant.
  - **Answered 2026-11-06:** behaviour, habitat and size, **plus the more precise family-level ID marks**: e.g. for the angelfishes, the small spine sticking out on the cheek (preopercular spine) and nearly always some blue. Start from what IMR provides. (§3.2 F4b, F9.)
- **Q12. One sheet model for corals and fish.**
  - **Recommendation:** shared components, subject-specific blocks; fish first, then the coral sheet moved onto the components without visible change.
  - **Answered 2026-11-06:** yes, make the coral and fish sheet models homogeneous, with shared components.
- **Q13. "As seen on video" photos from IMR's own survey footage.**
  - SVS frames are exactly what RAs must recognise, and IMR's own footage is not the slide-photo rights problem of rule 7.
  - **Recommendation:** ask IMR whether frames from its own videos may be used; if yes, add one "on video" photo per family first, then per common species. Until then the "realistic photo" role (S3) stands in.
  - **Answered 2026-11-06:** no IMR video frames for now.

---

## 10. Guesses and limits, labelled

- The book's exact species-account headings: **not seen**. The structure above follows its publisher's description (as reported by listings) and my memory of the series.
- The number of species needing phase sections (80-150 of 340): **a guess**.
- RLS's text licence: **not verified**; its data are CC BY (as the repo already notes for the portal). FishBase's licence (CC BY-NC as I remember it): **to verify**. Facts such as a length or a depth are not copyrightable, but the source is cited all the same (rule 2).
- The coral sheet layout: **from code**, the screenshot failed.
- The learning-science points (contrast, varied examples, few cues): **my summary** as an educator, not a literature review done here.
