# Classic look-alike pairs around Dauin: fish, sea slugs, corals (study, 2026-11-18)

Pierre, 2026-11-18 (10:22 Manila), approving a new variant class, mimicry: a juvenile or an adult that resembles another
species comes in once both units are met and at Open Water, with its explanation card, and the pair is then drilled in
the look-alike formats. His example is the juvenile mimic surgeonfish (*Acanthurus pyroferus*) beside the pearl-scale
angelfish (*Centropyge vrolikii*). He added:

> "Il faudra prévoir des vrais cartes pour des paires de sosies classiques qu'on trouve ici couramment. Mimic filefish
> et Black saddled toby par exemple"

The pair he named is *Paraluteres prionurus* with *Canthigaster valentini*.

**What this note does.** It gives the list he asked for, with the reasons for each choice:

- the classic look-alike pairs seen around Dauin, for the fish and the sea slugs (§2 to §5);
- a check of the corals' classics deck against the local classics (§6);
- what was left out, and why (§7);
- whether our photos can show the marks (§8);
- one card mechanism for every subject (§9);
- what is Pierre's to validate (§10).

**Nothing enters the game.** No game file, tool or app code changes.

**Answered.** Pierre answered the four questions on 2026-11-18 (about 10:54-10:55 Manila), with a correction to (b),
and asked for an out-of-region warning: §10 quotes him, §1.2 and §9.5 carry his correction and his warning, and §6.2
what the Coral Finder says about the four starred genera.

**Labels** (rule W11):

- **[read]**: taken from the page or the PDF itself, and quoted;
- **[search]**: only a search result's excerpt, the page itself not read;
- **[repo]**: already in the repository with its own source (a family's or genus's sourced marks, an IMR cue, the sea slug
  survey's quotes);
- **[measured]**: counted from the repository's files;
- **[guess]**: my judgement.

**On mimicry** (FISH_PATH.md "Juveniles and colour phases": Pierre's rule): mimicry is a hypothesis unless the source
states it. So this note writes "resembles" in its own voice. Where a source says "mimic", the note attributes the word to
that source, for example "Randall (2005) describes it as a mimic".

## 1. Method

### 1.1 Data from the repository [measured]

All counts are from `main` at 00f82557, and were run twice with the same result; no data file read here changed up to 6fe951a3.

**Fish: who sees each species near Dauin.**

- `fish.json` species `present.dauinU`: the distinct Research Grade observers within 40 km of Dauin, the measure the
  global score's weights read. This note calls it **"observers near Dauin"**.
- `tools/fish_commonness_inat.json` (fetched 2026-11-08): distinct observers, Research Grade and Needs ID, within 40 km
  and in the Philippines. This note calls it **"PH observers"**.
- `cmi`, the commonness index, is not used: it ranks a species within its own entry and does not compare across
  families.

**Fish: photos.** The photos in play, as the app computes them: `core.js` `fishPhotos` over `fish-game.json` with
`curation.json`. For each species, the note counts three things from the judge's tag `jt` (judging/FISH.md):

- all its photos in play;
- its profile views, where the tag's first letter is `p`;
- its juvenile-tagged photos, where the tag's flags hold `j` or the record says `ph: juvenile`.

The juvenile tag says "a juvenile", not which colour form it shows: see §8.

**Sea slugs.** From `seaslug.json` species:

- `present.nearU`: Research Grade observers within 40 km of Dauin;
- `present.area`: Research Grade observers in the Philippines;
- the photos: the records in `seaslug-game.json`. Pierre has curated no sea slug photo yet, so there is no sea slug part
  in `curation.json`. Every species there has 12 photos, the photo target (study of 2026-11-15).

**Corals.** The classics deck as `learn.js` `classics()` computes it from `data.json`: the pairs whose `lsrc` begins
"IMR" or "Coral Finder p", minus those Pierre hid (`curation.json` `mont`).

### 1.2 "Commonly seen here"

Pierre asked for pairs "qu'on trouve ici couramment". A pair counts as common when **both** members have at least 5
observers near Dauin [guess: the threshold is mine].

- A classic pair whose second member is rarer stays in the list, flagged: the trap runs from the common species toward
  the rare one, so the card still helps.
- Pairs below the threshold on the resembling side, or with a member never observed near Dauin, are in §7.

**What the counts measure** (Pierre, 2026-11-18, answering (b): "'rare' parce que les gens ne les prennent pas
spécifiquement en photos. C'est le problème des mimics ^^ Mais globalement pas rares aux Philippines"):

- An iNaturalist observer count measures what people photograph and post, not how abundant a species is.
- A species that resembles another is undercounted most: divers take it for its model and do not photograph it for
  itself, or post it under the model's name.
- So these counts rank pairs and flag where photos may be short. They never drop a pair on their own: a pair leaves
  the list only when a source, Pierre or an IMR trainer says it is not met here.

### 1.3 Sources

The main source is **Randall J.E. 2005**, "A review of mimicry in marine fishes", *Zoological Studies* 44(3): 299-328,
<https://zoolstud.sinica.edu.tw/Journals/44.3/299.pdf>. It is the open review that discusses 98 cases of mimicry in
marine fishes; its full PDF was read [read].

The visible marks come from these public pages, each read and quoted [read] unless labelled otherwise:

- FishBase species summaries;
- Fishes of Australia;
- the Australian Museum;
- the Solitary Islands Underwater Research Group's species pages (SURG);
- "Fishes of the Maldives" (BOBP/MAG/021, in FAO's repository);
- two Wikipedia articles (one names the paper it relies on).

How the quotes were taken: the web pages were read through a page reader that returns the passages asked for, so a
long sentence sometimes came back in two segments, rejoined here with "..." where words were left out. Randall 2005
and the FAO guide were downloaded as PDFs and quoted from their text directly.

For the sea slugs, the note cites the quotes the survey already read (`tools/seaslug_lookalikes_source.json` and
`tools/seaslug_lookalikes_cand.json`) and the genus marks of `tools/seaslug_cues.json`, without fetching them again
[repo].

Reef Life Survey answered HTTP 403 to every request in this session, so its wording appears only as search excerpts.

## 2. The list: 27 pairs

The ranks in the right-hand column:

- **Today's units**: the fish families, plus a genus unit for each circle-1 scientific genus; the sea slug genera.
- **Per photo**: the pair links two units only through the photos of the resembling species (or of its juveniles), as
  FISH_PATH.md "Look-alikes at any rank" designs it (not built).
- **Species level**: the two members are in one unit today, so the pair matters only once species are units (#1041,
  species step 2).

| # | Pair | Kind | Observers near Dauin (each) | Circles | What it links today |
|---|---|---|---|---|---|
| M1 | *Acanthurus pyroferus* (juvenile) / *Centropyge vrolikii* | Juvenile resembles (Pierre's example) | 17 / 18 | 1 / 1 | Two families, per photo |
| M2 | *Paraluteres prionurus* / *Canthigaster valentini* | Adult resembles (Pierre's example) | **3** / 38 | 1 / 1 | Two families, per photo |
| M3 | *Aspidontus taeniatus* / *Labroides dimidiatus* | Adult resembles | 14 / 20 | 3 / 1 | Two families, per photo |
| M4 | *Plagiotremus rhinorhynchos* (juvenile) / *Labroides dimidiatus* | Juvenile resembles | 7 / 20 | 3 / 1 | Two families, per photo |
| M5 | *Petroscirtes breviceps* / *Meiacanthus grammistes* | Adult resembles | 26 / 11 | 3 / 3 | One family (no genus unit in circle 3): species level |
| M6 | *Scolopsis bilineata* (juvenile) / *Meiacanthus grammistes* | Juvenile resembles | 26 / 11 | 1 / 3 | Two families, per photo |
| M7 | *Pholidichthys leucotaenia* (juvenile) / *Plotosus lineatus* | Juvenile resembles | 10 / 48 | 3 / 3 | Two one-species families |
| C1 | *Heniochus diphreutes* / *H. acuminatus* | Confusion | 9 / **3** | 1 / 1 | Species level |
| C2 | *Zanclus cornutus* / *Heniochus* (both) | Confusion | 38 / 9 and 3 | 1 / 1 | Two families, **already declared** (IMR slide 13) |
| C3 | *Amphiprion perideraion* / *A. sandaracinos* | Confusion | 42 / 18 | 1 / 1 | Species level |
| C4 | *Chaetodon vagabundus* / *C. auriga* | Confusion | 17 / 7 | 1 / 1 | Species level |
| C5 | *Chaetodon ocellicaudus* / *C. melannotus* | Confusion | 8 / 5 | 1 / 1 | Species level |
| C6 | *Forcipiger flavissimus* / *F. longirostris* | Confusion | 13 / **2** | 1 / 1 | Species level |
| C7 | *Dascyllus aruanus* / *D. melanurus* | Confusion | 31 / **2** | 1 / 1 | Species level |
| C8 | *Abudefduf vaigiensis* / *A. sexfasciatus* | Confusion | 21 / 6 | 1 / 1 | Species level |
| C9 | *Chromis viridis* / *C. atripectoralis* | Confusion | 16 / 7 | 1 / 1 | Species level |
| C10 | *Pomacanthus imperator* (juvenile) / *P. semicirculatus* (juvenile) | Juvenile confusion | 24 / 7 | 1 / 1 | Species level |
| C11 | *Fistularia commersonii* / *Aulostomus chinensis* | Confusion | 17 / 26 | 3 / 2 | Two one-species families |
| C12 | *Pterois volitans* / *P. antennata* | Confusion | 41 / 31 | 1 / 1 | Species level |
| S1 | *Goniobranchus geometricus* / *Phyllidiella pustulosa* | Adult resembles | 30 / 10 | 1 / 2 | Two genera, **already declared** (Q390 D) |
| S2 | *Hexabranchus lacer* (juvenile) / *Hypselodoris maculosa* | Juvenile resembles | 9 / **1** | 1 / 3 | Two genera, **already declared**, for every photo |
| S3 | *Goniobranchus leopardus* (and *G. kuniei*) / *Hypselodoris tryoni* | Confusion | 15 (16) / 28 | 2 (1) / 1 | Two genera, **already declared** |
| S4 | *Chromodoris lochi* / *C. willani* (and *C. dianae*) | Confusion | 12 / 6 (1) | 1 / 1 (2) | Species level |
| S5 | *Phyllidia varicosa* / *P. elegans* and *P. coelestis* | Confusion | 31 / 17 and 17 | 1 / 1 | Species level |
| S6 | *Nembrotha kubaryana* / *N. cristata* | Confusion | 79 / 53 | 1 / 1 | Species level |
| S7 | *Hypselodoris apolegma* / *H. bullockii* | Confusion | 4 / 4 | 1 / 1 | Species level |
| S8 | *Hypselodoris decorata* / *H. maculosa* | Confusion | 8 / **1** | 2 / 3 | Species level |

**Every species in the table is in the game data.**

- Fish: `fish.json`, confirmed in the Philippines and near Dauin (`present.near`), with a circle.
- Sea slugs: `seaslug.json`, confirmed in the Philippines by rule C8.

The species named in the text but **not in the game data** are marked "not in our data" where they appear, and listed in
§7.3.

**Names** (rule S2):

- **Fish**: the `fish.json` name first, with WoRMS's name beside it where they differ.
  - *Centropyge vroliki* in `fish.json` is *C. vrolikii* in WoRMS.
  - *Pterois antennata* is *Pteropterus antennatus* in WoRMS, which takes C12 across two genera there.
- **Sea slugs**: iNaturalist's names, which WoRMS accepts.

**English names**:

- **Fish**: `fish.json` `common`, the first in each pair's heading below.
- **Sea slugs**: the first of `seaslug.json` `en`.

## 3. Fish: the pairs where a source says one resembles the other (M1-M7)

### M1. *Acanthurus pyroferus* (Mimic surgeonfish), juvenile, and *Centropyge vroliki* (*C. vrolikii*, Pearl-scaled angelfish)

- **Kind**: a juvenile that resembles an angelfish. The resemblance is stated as mimicry by:
  - Randall 2005, p. 320: "In the more western part of the Pacific, the young of Acanthurus pyroferus (Fig. 102)
    usually mimic Centropyge vrolikii" [read];
  - FishBase: "in Guam, juveniles mimic C. flavissimus but in Palau where this species is absent, they mimic C.
    vrolikii" [read].
- **Seen near Dauin**: 17 observers for the surgeonfish (PH observers 71), 18 for the angelfish (75).
- **Marks** [read]:
  1. The angelfish has a large spine at the lower corner of the cheek. Australian Museum, Pearlscale Angelfish: "can
     be distinguished by the presence of a large spine on the lower preopercular margin". This is also IMR's
     Angelfish cue, "Spine on the gill cover" [repo].
  2. The surgeonfish has a scalpel on the tail base (IMR's Surgeonfish cue [repo]), and the juvenile's tail is rounded.
     FishBase: "Caudal fin rounded in juveniles".
  3. The angelfish's colours: "brown to grey-green anteriorly and black posteriorly", with "blue margins" on the anal,
     caudal and rear dorsal fins, and "The iris, pectoral fin base and opercular margin are orange" (Australian Museum).
- **Photos**:
  - Surgeonfish: 51 in play, 18 juvenile-tagged (6 in profile).
  - Angelfish: 35 in play (19 in profile).
  - 16 of the 18 juvenile photos were taken outside the Philippines. Randall: in the central and eastern Pacific the
    juveniles resemble *C. flavissima* (not in our data), and "it would seem that the juvenile surgeonfish has the
    capability of mimicking either species of Centropyge". So which model each of our juvenile photos copies is
    **not verified** [guess: some may show the yellow *C. flavissima* form]. Pierre's eye on the 18 is needed before
    they serve this card. His answer (2026-11-18): "Merci de mettre un warning sur ces cas", the general warning of
    §9.5.
- **Already in the data**: the juvenile class B, "late" (`fish.json` Surgeonfishes `juv`), with its sources.

### M2. *Paraluteres prionurus* (Mimic filefish) and *Canthigaster valentini* (Black-saddled toby)

- **Kind**: an adult that resembles a toby, at every size.
  - FishBase, *P. prionurus*: "Mimic the poisonous puffer, Canthigaster valentini which it greatly resembles" [read].
  - Randall 2005, p. 317, citing Clark & Gohar 1953, Tyler 1966 and Caley & Schluter 2003 [read].
- **Seen near Dauin**: the filefish by **3 observers** (PH observers 40); the toby by 38 (174). The model is common here
  and the filefish is not [guess: a resembling species is often the rarer one]. Pierre named the pair himself.
- **Marks** [read]:
  1. The filefish's dorsal spine. Randall: "The filefishes of the genus Paraluteres are usually seen with the 1st
     dorsal fin fully depressed; once this fin is erect, the effect of mimicry is reduced". This is also IMR's
     Filefish cue, the locking spines [repo].
  2. The fins along the rear of the body. Randall: "The 2nd dorsal fin of Paraluteres is broader than that of
     Canthigaster, but it is nearly transparent".
     - FishBase's counts: 25-28 soft dorsal rays in the filefish, 9 in the toby.
     - On a photo this means a fin running along much of the filefish's back and belly, against the toby's small fin
       near the tail (my wording of the two counts).
  3. The toby's pattern: "A whitish toby with pale brown spots and four dark brown to blackish saddles", the middle two
     reaching the belly (Fishes of Australia, Blacksaddle Toby). The filefish: "a round dark blotch above origin of anal
     fin" (FishBase).
- **Photos**:
  - Filefish: 40 in play (22 in profile).
  - Toby: 43 in play (26 in profile).
  - The second mark needs the fins spread, which a profile view usually shows [guess].

### M3. *Aspidontus taeniatus* (False cleanerfish) and *Labroides dimidiatus* (Bluestreak cleaner wrasse)

- **Kind**: an adult that resembles the cleaner wrasse.
  - Randall 2005, p. 310 calls it "the Batesian blenny mimic Aspidontus taeniatus", also an aggressive mimic, and p.
    322 adds: "The Mimic Blenny matches the color the Cleaner Wrasse of the same size as it grows" [read].
  - FishBase: "Bears an amazing resemblance to the cleaner wrasse" [read].
- **Seen near Dauin**: 14 observers (PH observers 40) and 20 (134).
- **Marks** [read]:
  1. **The mouth**, the classic mark.
     - FishBase: "Distinguished from L. dimidiatus by the position of its mouth, which is terminal in the wrasse but
       under the snout in the blenny".
     - SURG, the same.
     - Already a Blennies mark in our data [repo].
  2. The wrasse's stripe "widens posteriorly", from the eye to the tail's edge (Australian Museum, Common
     Cleanerfish).
- **Photos**:
  - Blenny: 33 in play (13 in profile).
  - Wrasse: 42 (26 in profile).
  - The mouth needs a sharp side or three-quarter view of the head. A cropped close-up card would show it best [guess].
- **Circle**: the blenny is circle 3. The pair meets only the players whose circle 3 is open.

### M4. *Plagiotremus rhinorhynchos* (Bluestriped fangblenny), juvenile, and *Labroides dimidiatus*

- **Kind**: a juvenile that resembles the cleaner wrasse.
  - FishBase: "Juveniles mimic the cleaner wrasse Labroides dimidiatus" [read].
  - Randall 2005, p. 323-324: "this species is regarded as a mimic of Labroides dimidiatus, although as an adult ... it
    is not as precise a mimic as A. taeniatus", and Moland & Jones 2004 "found 92% of mimetic P. rhinorhinchos closely
    associated with juvenile L. dimidiatus" [read].
- **Seen near Dauin**: 7 observers (PH observers 59) and 20.
- **Marks** [read]:
  1. The fangblenny has two stripes: "2 blue stripes on body", with a body "ranging from black to yellow" (FishBase).
     The wrasse has one black stripe that widens to the tail (Australian Museum).
  2. The mouth under the snout, as every sabre-tooth blenny's (the Blennies mark [repo]) [guess: FishBase's page for
     this species does not say it].
- **Photos**: 39 in play, **5 juvenile-tagged (3 in profile)**. That is thin for the juvenile card. The wrasse's
  juveniles: 13 (6 in profile).
- **Circle**: 3.

### M5. *Petroscirtes breviceps* (Shorthead sabretooth blenny) and *Meiacanthus grammistes* (Striped fangblenny)

- **Kind**: an adult that resembles a venomous fangblenny.
  - FishBase, *P. breviceps*: "Mimic of Meiacanthus grammistes, which like all species of that genus possesses a pair
    of large grooved fangs" [read].
  - FishBase, *M. grammistes*: "is mimicked by another blenny Petroscirtes breviceps" [read].
  - Randall 2005, p. 308 [read].
- **Seen near Dauin**: 26 observers (PH observers 84) and 11 (66). Both common here.
- **Marks** [read]:
  1. *M. grammistes*: "the lined pattern on the body that ends in spots on the tail-fin base" (FishBase).
  2. *P. breviceps*: "Dark, broad stripe from snout through eye to caudal fin; stripe may be broken into segments", and
     "Highly variable in color" (FishBase).
  3. So, a few thin lines that break into spots at the tail, against one broad stripe, often broken. My reading of the
     two descriptions [guess]: no source read compares them in words.
- **Photos**: 31 in play (14 in profile) and 36 (27 in profile).
- **Circle**: both 3, one family, two genera with no genus unit: a species-level pair.

### M6. *Scolopsis bilineata* (Bridled monocle bream), juvenile, and *Meiacanthus grammistes*

- **Kind**: a juvenile that resembles a fangblenny.
  - Fishes of Australia, *S. bilineata*: "Juveniles mimic the Linespot Fangblenny, Meiacanthus grammistes which has
    venomous fangs" [read].
  - Randall 2005, p. 308: "Four different color forms of the bream mimic different species of Meiacanthus". *M.
    grammistes* is "the model for ... a third color form of juvenile Scolopsis bilineatus" (his fig. 47 is from Luzon)
    [read].
  - The bream's other forms, by Randall, resemble *M. oualanensis* (Fiji) and *M. smithi* (the Indian Ocean), and
    Smith-Vaniz et al. 2001 add *M. lineatus*: none is in our data. *M. vittatus*, in Papua New Guinea, is the model
    Randall gives for *Petroscirtes breviceps* and the young of *Scolopsis margaritifera* (p. 309-310), not for this
    bream.
- **Seen near Dauin**: 26 observers (PH observers 132) and 11.
- **Marks** [read]:
  1. The juvenile bream: "upper half of body black with two yellow stripes", and "midsides with a broad white
     indistinct stripe, anal fin with a black marking" (Fishes of Australia).
  2. The fangblenny's lines "end in spots on the tail-fin base" (FishBase).
  3. The blenny's "blunt, rounded head with the eyes high up" (our Blennies mark [repo]).
- **Photos**: 45 in play, **17 juvenile-tagged (13 in profile)**, the best supplied of these juveniles. 3 of them are from
  near Dauin and 4 more from the Philippines.
- **Already in the data**: class B, "late" (`fish.json` CoralBreams `juv`).

### M7. *Pholidichthys leucotaenia* (Convict blenny), juvenile, and *Plotosus lineatus* (Striped catfish)

- **Kind**: juveniles that resemble the venomous catfish, in shoals.
  - Randall 2005, p. 304: "Schooling juveniles of the Convictfish Pholidichthys leucotaenia (Fig. 27) look very
    much like schools of the juvenile venomous catfish Plotosus lineatus" [read].
  - FishBase: "Juveniles resemble the venomous striped catfish Plotosus lineatus" [read].
- **Seen near Dauin**: 10 observers (PH observers 48) and 48 (242).
- **Marks** [repo, from FishBase, Fishes of Australia, Reef Life Survey and the Australian Museum, each family's `msrc`]:
  1. The catfish has "Four pairs of whisker-like barbels around the mouth"; FishBase: "with 4 pairs of mouth barbels"
     [read].
  2. The catfish: "dark with two thin pale stripes". The young convict blenny: "black with a white stripe".
  3. Both have a long body with joined fins, so the body shape does not tell them apart [repo: both families' first
     marks].
- **Photos**:
  - Blenny: 47 in play, **37 juvenile-tagged** but only 8 in profile (schools seen from above or afar).
  - Catfish: 47 (10 in profile).
- **Circle**: both 3, and both families hold one species in our data. So a declared family pair would be the species
  pair, with no per-photo machinery.

## 4. Fish: plain confusions (C1-C12)

None of these is a mimicry case. They are classic confusions: two species of one genus, or two long tube-snouted fish.

### C1. *Heniochus diphreutes* (Schooling bannerfish) and *H. acuminatus* (Longfin bannerfish)

- **Seen near Dauin**: 9 observers (PH observers 45) and 3 (47).
- **Marks** [read], from the Australian Museum's Longfin Bannerfish page: the schooling bannerfish "looks very similar,
  but can be distinguished by a more rounded profile under the head and a shorter snout". It adds: "The second black band
  is located further forward on the anal fin".
  1. The profile under the head: more rounded in *H. diphreutes*.
  2. The snout: shorter in *H. diphreutes*.
  3. The second black band's position on the anal fin.
- The page's spine count (12 against 11) is not used: never a count on a card.
- Hobby forums say torn fin tips make the anal fin mark hard to use [search].
- **Photos**: 32 in play (19 in profile) and 38 (18 in profile).

### C2. *Zanclus cornutus* (Moorish idol) and the bannerfishes (*Heniochus*)

- **Already declared**: Butterflyfishes and Moorish idol, with IMR's line "Bannerfish: no yellow on the saddle" (IMR fish
  presentation, slide 13) [repo]. A card adds the photos, nothing in play.
- **Seen near Dauin**: 38 observers (PH observers 210); bannerfishes 9 and 3.
- **Marks**:
  1. IMR's cue "Yellow on the body and a yellow saddle" [repo].
  2. "Disc-shaped, very flat body; long tube-like snout with a small mouth" (our Moorish idol mark, from FishBase's family
     page [repo]). FishBase, species: "Tubular snout with a small mouth" [read].
  3. A black tail with a thin white edge, against the bannerfishes' yellow tail [search: a dive guide's excerpt only, so
     not a source for a card yet].
- **Photos**: 41 in play (26 in profile).

### C3. *Amphiprion perideraion* (Pink anemonefish) and *A. sandaracinos* (Orange anemonefish)

- **Seen near Dauin**: 42 observers (PH observers 184) and 18 (123).
- **Marks** [read], from Fishes of Australia, Orange Anemonefish:
  1. *A. sandaracinos* has "a white stripe beginning on the upper lip".
  2. *A. perideraion* "differs in having a narrow white band on the side of the head behind the eye".
- **Photos**: 35 in play (18 in profile) and 31 (24 in profile).

### C4. *Chaetodon vagabundus* (Vagabond butterflyfish) and *C. auriga* (Threadfin butterflyfish)

- **Seen near Dauin**: 17 observers (PH observers 74) and 7 (31).
- **Marks** [read], from SURG, *C. vagabundus*: "Similar looking Chaetodon auriga has crosshatching on the sides but
  does not have the black bar at the rear of the body nor on the trailing edge of the dorsal and anal fin".
  - That is one comparative mark.
  - The threadfin's dorsal filament and its spot were not found in the pages read (FishBase's summary has no colour
    text), so a second mark is still to source.
- **Photos**: 42 in play (19 in profile) and 27 (11 in profile).

### C5. *Chaetodon ocellicaudus* (Spot-tail butterflyfish) and *C. melannotus* (Black-backed butterflyfish)

- **Seen near Dauin**: 8 observers (PH observers 49) and 5 (27).
- **Marks** [read], from English Wikipedia, "Spot-tail butterflyfish" (its source not shown): "it differs only in the
  shape of the black mark on the caudal peduncle, in lacking a black mark on the chest, a lighter back".
  1. The shape of the black mark on the tail base.
  2. No black mark on the chest in *C. ocellicaudus*.
  3. A lighter back in *C. ocellicaudus*.
- FishBase's page answered HTTP 503: a second source is still to read.
- **Photos**: 36 in play (16 in profile) and 34 (21 in profile).

### C6. *Forcipiger flavissimus* (Longnose butterflyfish) and *F. longirostris* (Big longnose butterflyfish)

- **Seen near Dauin**: 13 observers (PH observers 75), and only **2** (19) for *F. longirostris*.
- **Marks** [read], from the Australian Museum, Longnose Butterflyfish: *F. longirostris* "can be distinguished by its
  longer snout, smaller mouth gape ... and by rows of small black spots on the breast". It adds: "These spots are
  unusually pale in the fish in the image."
  1. The longer snout.
  2. The smaller mouth gape.
  3. Rows of small black spots on the breast.
- **Photos**: 27 in play (20 in profile) and 33 (23 in profile).

### C7. *Dascyllus aruanus* (Humbug dascyllus) and *D. melanurus* (Blacktail humbug)

- **Seen near Dauin**: 31 observers (PH observers 131), and only **2** (24) for *D. melanurus*.
- **Marks** [read]:
  1. *D. melanurus* "has a black area over the outer two-thirds of the tail, which distinguishes it from D. aruanus"
     (FishBase).
  2. *D. aruanus* has a white tail [search: Reef Life Survey's excerpt; its page answered 403].
- **Photos**: 43 in play (33 in profile) and 37 (27 in profile).

### C8. *Abudefduf vaigiensis* (Indo-Pacific sergeant) and *A. sexfasciatus* (Scissortail sergeant)

- **Seen near Dauin**: 21 observers (PH observers 141) and 6 (93).
- **Marks** [read]:
  1. *A. sexfasciatus* has "a broad dark streak along each caudal-fin lobe" (Fishes of Australia, Scissortail
     Sergeant). *A. vaigiensis* has its "caudal fin without dark bands" (FishBase).
  2. *A. sexfasciatus* differs "from A. vaigiensis in lacking yellow colour on the upper sides" (Fishes of Australia).
     FishBase, *A. vaigiensis*: the back between the first and third bars "often yellow", "especially during courtship
     and nesting". So the yellow is a hint, not a rule.
- **Photos**: 42 in play (33 in profile) and 43 (33 in profile).

### C9. *Chromis viridis* (Blue-green chromis) and *C. atripectoralis* (Black-axil chromis)

- **Seen near Dauin**: 16 observers (PH observers 89) and 7 (32).
- **Marks** [read]:
  1. "The pectoral fin axil of C. atripectoralis is black", whereas "the upper base of the pectoral fin of C. viridis
     appears dusky due to the presence of black dots" (English Wikipedia, citing Froukh & Kochzius 2008, *Journal of
     Fish Biology*). FishBase only says: "Often confused with Chromis viridis".
  2. A single mark, and a small one: the black axil shows only when the pectoral fin is held out from the body [guess].
- **Photos**: 45 in play (30 in profile) and 35 (29 in profile). How many show the axil is not known without looking.

### C10. *Pomacanthus imperator* (Emperor angelfish) and *P. semicirculatus* (Semicircle angelfish), juveniles

- **Kind**: a confusion between the juveniles. The adults differ.
- **Seen near Dauin**: 24 observers (PH observers 47) and 7 (35).
- **Marks**:
  1. "Juveniles deep blue with curved circular white bands" (*P. imperator*), against "Juveniles dark blue with white
     and pale blue crescents on their sides" (*P. semicirculatus*). Source: "Fishes of the Maldives", BOBP/MAG/021,
     FAO, pp. 219-220 [read].
  2. The emperor's juvenile has a complete white ring toward the rear. Reef Life Survey on *P. semicirculatus*:
     "lacking complete circular marking of P. imperator" [search: its page answered 403].
- **Photos**:
  - *P. imperator*: 42 in play, **15 juvenile-tagged (9 in profile)**.
  - *P. semicirculatus*: 40 in play, **24 juvenile-tagged (18 in profile)**.
  - Enough for a juvenile card.
- *Pomacanthus* is already a "show early" juvenile genus (class A rule, `fish.json` Angelfishes `juv.early`). This pair
  would be the first card between two early juveniles.

### C11. *Fistularia commersonii* (Cornetfish) and *Aulostomus chinensis* (Trumpetfish)

- **Seen near Dauin**: 17 observers (PH observers 107) and 26 (154).
- **Marks** [repo: our family marks, from FishBase, Fishes of Australia and Reef Life Survey]:
  1. The cornetfish has a "forked tail with a long whip-like filament in the middle". The trumpetfish has a "rounded
     tail with no filament".
  2. The trumpetfish has "a row of separate small spines along the back" and "a small barbel under the chin". The
     cornetfish has a "smooth back without a row of spines".
- **Photos**: 42 in play (18 in profile) and 42 (19 in profile).
- Each is the only species of its family in our data (circles 3 and 2), so a declared family pair is this pair.

### C12. *Pterois volitans* (Common lionfish) and *P. antennata* (WoRMS *Pteropterus antennatus*, Spotfin lionfish)

- **Seen near Dauin**: 41 observers (PH observers 211) and 31 (206).
- **Marks** [read], from SURG, *P. antennata*:
  1. "Best distinguished from the Common Lionfish, P. volitans, by lacking flag-like membranes on extended pectoral fin
     rays".
  2. "Long white extended pectoral fin rays, with large dark spots in between, near the base of the pectoral fin".
  3. "Also has long tentacle with dark bands over each eye."
- **Photos**: 41 in play (14 in profile) and 42 (20 in profile). Lionfish are often seen from the front or above, and
  the pectoral fins show either way [guess].
- WoRMS puts the two in two genera. `fish.json` keeps both in *Pterois* (the IMR PDF's name, rule S2), so today it is a
  species-level pair.

## 5. Sea slugs (S1-S8)

The sea slug units are genera. The survey of 2026-11-17 found the pairs and their sources. Pierre's Q390 D (2026-11-17)
turned its pairs across genera into declared genus look-alikes (`seaslug.json` genera `look`, `lsrc`;
`tools/seaslug_game.py` `genus_looks`). The admin edits them since #1075 (2026-11-18).

So S1-S3 already shape play at the genus rank. S4-S8 sit inside one genus and wait for the species level. The pairs
below are the survey's best sourced ones (its §5 "Where they agree"), with the local counts. Every species has 12
photos.

### S1. *Goniobranchus geometricus* (Geometric Goniobranchus) and *Phyllidiella pustulosa* (Pustulose Wart Slug)

- **Kind**: an adult that resembles a phyllidiid, across two families.
  - Rudman's *C. geometrica* fact sheet: "the characteristic dorsal colour pattern, which resembles a phyllidiid".
  - Nudi Pixel lists it among the "Mimics of *Phyllidiella pustulosa*" [repo, survey §4].
- **Seen near Dauin**: 30 observers (PH 155) and 10 (61).
- **Marks** [repo: `tools/seaslug_cues.json`]:
  1. The phyllidiid has "No gill tuft on the back: the gills lie in a groove under the mantle edge" (Brunckhorst 1993,
     p. 9). The *Goniobranchus* carries the usual dorid gill plume on its back [guess: a feature of the family, not
     written in our cues].
  2. *Phyllidiella* has "Black rhinophores" (Brunckhorst 1993, key couplet 3, p. 26).
  3. *Goniobranchus* has "A broad mantle that overhangs the foot widely", and *G. geometricus* waves the mantle edge as
     it crawls (Rudman, our cues).
- **Not in our data**: *Paradoris liturata*, which Rudman calls "an almost perfect mimic of Phyllidiella pustulosa", is
  confirmed in the Philippines (9 observers) but is not a species of the game. The flatworm *Pseudoceros imitatus* is
  not a sea slug.

### S2. *Hexabranchus lacer* (Decumbent Spanish Dancer), juvenile, and *Hypselodoris maculosa* (Spotted Hypselodoris)

- **Kind**: a juvenile that resembles a chromodorid. Rudman 1999, of a juvenile **from Dauin**: "It has a remarkable
  resemblance to some purple spotted chromodorids such as Hypselodoris maculosa, Thorunna australis and Chromodoris
  decora" [repo].
- **Seen near Dauin**: *H. lacer* 9 observers (PH 64); *H. maculosa* only **1** (PH 26, circle 3).
  - *Thorunna australis* is confirmed in the Philippines but not in our data.
  - *C. decora* is not confirmed (rule C6: context only).
- **Marks** [repo]:
  1. *Hexabranchus*: "Gills set one by one into the back, never pulled into a pocket" (Rudman, our cues).
  2. *Hypselodoris*: "A tall body whose mantle barely overhangs the foot" (Rudman, our cues).
- **Photos**: *H. lacer* 17, of which **5 juvenile**. *H. maculosa* 12.
- **Today**: the declared genus pair *Hexabranchus* / *Hypselodoris* draws every Spanish dancer photo as a trap, while
  the source speaks of the juvenile only. The mimicry variant (§9.4) would make it a photo-level pair, as the survey
  §4 said ("a photo-level pair, for its juvenile photos").

### S3. *Goniobranchus leopardus* (Leopard Nudibranch) and *G. kuniei* (Kunie's Chromodoris), and *Hypselodoris tryoni* (Tryon's Hypselodoris)

- **Seen near Dauin**: 15 and 16 observers; *H. tryoni* 28.
- **Marks** [repo], from Rudman's *C. kuniei* sheet: "C. leopardus and C. kuniei can be distinguished from R. tryoni by
  the broad purple border ... and by the leopard-like multiple spots".
  1. The broad purple border of the mantle.
  2. The multiple, leopard-like spots.
  3. Wikipedia, *H. tryoni*: "it lacks the wide purple mantle edge line present in those species".
- Nudi Pixel has a card "*Goniobranchus leopardus* vs. *Hypselodoris tryoni*".

### S4. *Chromodoris lochi* (Loch's Chromodoris), *C. willani* (Willan's Chromodoris), *C. dianae* (Diana's Chromodoris)

- **Seen near Dauin**: 12, 6 and 1 observers (PH 158, 203, 52).
- **Marks**:
  - *C. dianae* against *C. lochi* [repo]. Rudman 2007: "the small white specks all over the mantle in C. dianae".
    Wikipedia: "the broken black lines, (as opposed to continuous)".
  - ***C. lochi* against *C. willani*: no visible mark found** in the sources read. Wikipedia says they "can be
    difficult to tell apart". iNaturalist counts 43 confusions worldwide.
  - So the most common pair here has no card yet. The guide (Gosliner, Valdés & Behrens 2018) is not online (survey §7).

### S5. *Phyllidia varicosa* (Varicose Wart Slug) and *P. elegans* (Elegant Phyllidia), *P. coelestis* (Sky Blue Phyllidia)

- **Seen near Dauin**: 31, 17 and 17 observers.
- **Marks** [repo], from Rudman's fact sheets after Brunckhorst 1993:
  1. *P. elegans* has pink colouring, which the other two lack.
  2. *P. coelestis* "has neither a foot stripe nor a median ridge". The median ridge shows from above.
- The foot stripe lies under the animal, so it is not a photo mark (`tools/seaslug_cues.json`'s own rule).

### S6. *Nembrotha kubaryana* (Dusky Nembrotha) and *N. cristata* (Crested Nembrotha)

- **Seen near Dauin**: 79 and 53 observers, the most seen sea slug pair here.
- **Marks** [repo]:
  1. Rudman: "A similarly coloured species, Nembrotha cristata lacks the orange border to the foot".
  2. Wikipedia: "the latter has no red-orange border on its foot". The border shows from the side.

### S7. *Hypselodoris apolegma* (Giant Hypselodoris) and *H. bullockii* (Bullock's Hypselodoris)

- **Seen near Dauin**: 4 and 4 observers (PH 105 and 90).
- **Marks** [repo]:
  1. Wikipedia: *H. apolegma* "is distinguished by a reticulate pattern gradually merging in to the pinkish purple".
  2. Rudman wondered whether it "may be a colour form" of *H. bullockii*. They are now two species (WoRMS).

### S8. *Hypselodoris decorata* (Triple-banded Split-tooth Dorid) and *H. maculosa*

- **Seen near Dauin**: 8 observers and **1**.
- **Marks** [repo]:
  1. Wikipedia: *H. maculosa* "can be distinguished from Hypselodoris decorata by having two instead of three rings on
     the rhinophores".
  2. Epstein et al. 2019, through GBIF: "the presence of three rather than two red rhinophoral rings".
  3. Rings are visible when the rhinophores are; this is a count of two against three, so it is the card's one count
     [guess: a ring count is as plain as a colour; Pierre may prefer none].

**Already decided, not in the 27**: *Hexabranchus lacer* and *H. sanguineus* (Q377), already in `seaslug.json` species
`look`.

## 6. Corals: does the classics deck cover the local classics?

### 6.1 The deck as it stands [measured]

`classics()` gives **20 pairs**. Pierre hid one in the admin (*Acropora* / *Cyphastrea*, `curation.json` `mont`), so
the deck shows 19.

- **IMR lecture**:
  - *Pocillopora* / *Stylophora*;
  - *Montipora* / *Porites*;
  - *Leptoria* / *Platygyra*;
  - *Goniastrea* / *Leptoria*;
  - *Fungia* / *Lobactis*;
  - *Dipsastraea* / *Favites*;
  - *Astrea* / *Favites*.
- **Coral Finder text**:
  - *Acropora* with *Anacropora*, *Echinopora* and *Cyphastrea* (the last hidden);
  - *Seriatopora* / *Stylophora*;
  - *Goniopora* / *Porites*;
  - *Astreopora* / *Cyphastrea*;
  - *Goniastrea* / *Platygyra*;
  - *Hydnophora* / *Montipora*;
  - *Danafungia* / *Fungia*;
  - *Fungia* / *Lithophyllon*;
  - *Danafungia* / *Lithophyllon*;
  - *Astrea* / *Dipsastraea*;
  - *Favites* / *Goniastrea*.

The faviids, the mushroom corals, *Porites* and its look-alikes, and the branching pocilloporids are covered: these are
the confusions the IMR lecture itself names.

### 6.2 The gap: four starred genera have no card

Four of the five **starred look-alikes** have no card. These genera are on the slate only because they look like
surveyed genera (AGENTS.md; rule L5).

- Their own star cards name their look-alikes (`core.js` `starRefs`).
- But each pair's `lsrc` is only "Same Coral Finder box", so `classics()` leaves it out by its rule (C2: only a pair a
  source compares in so many words).

The four:

| Starred genus | Its card's look-alike | `lsrc` today | The genus card's own words (`crit`) |
|---|---|---|---|
| *Alveopora* | *Goniopora* | Same box, "Polyps or vesicles extended by day" | "12 tentacles (24 in Goniopora)" |
| *Merulina* | *Hydnophora* | Same box, "Branch surface complex, angular, sculpted" | none comparing |
| *Halomitra* | *Herpolitha* | Same box, "Free-living: elongate and/or domed disc" | "lighter skeleton than Sandalolitha" (not a game genus) |
| *Duncanopsammia* | *Turbinaria*, *Tubastraea* | Same box ("Vases or tiers"; "No axial corallite > 2 mm") | "Corallites about 6 mm (Turbinaria 2-3 mm)" |

- *Cyphastrea*, the fifth, has its card (*Astreopora* / *Cyphastrea*).

**What the Coral Finder says** (Pierre, 2026-11-18, 10:55: "Techniquement tu as accès au pdf du coral finder dans mon
drive"). Read only, through the Google Drive connector; nothing copied, downloaded into the repository or sent out:

- **Coral Finder 2022** ("Coral Finder 2022.pdf", the edition the deck cites) is on his Drive, but it is 85 scanned
  pages with no text layer (HANDOVER "Coral Finder 2022"). The connector returns only page markers for it, and the
  whole file (51 MB) is too large to bring in as an image. So its pages could **not** be read.
- **An earlier printing** ("Coral finder.pdf", © Russell Kelley 2009, on the same Drive) has a text layer and was read.
  Its pages are numbered by look-alike page (1 to 29), not as the 2022 book. The 2022 pages below are the ones
  `data.json` `pages` gives each genus (mapped from the 2022 scan when the coral data was built).

| Pair | What the earlier printing says (our words, a short quotation at most) | 2022 page (`data.json` `pages`) | Classic? |
|---|---|---|---|
| *Alveopora* / *Goniopora* | Same page, "Large daytime expanded polyps": *Alveopora* polyps have 12 tentacles and a light skeleton; *Goniopora* has 24 tentacles and a denser skeleton. Each text names the other. | p. 71 (both) | **Yes**: the two are compared in words, as the genus cards' `crit` already say |
| *Halomitra* / *Herpolitha* | Same page, free-living with many mouths: *Herpolitha* elongate with an axial furrow and secondary mouths; *Halomitra* a light round dome with widely spaced corallites inclined to the margin. The page's comment sets them apart by shape: *Herpolitha* "like skateboards", the others "inverted bowls". | p. 65 (*Herpolitha*), p. 66 (*Halomitra*) | **Yes**, by the page's comment; which 2022 page carries it is to confirm |
| *Merulina* / *Hydnophora* | Different pages. *Merulina* is compared only with *Platygyra*, *Leptoria* and *Goniastrea* (plates, upgrowths, short valleys fanning out); *Hydnophora*'s massive page says "see also *Merulina*", a pointer to another book, not a comparison. | none shared (*Merulina* 12, 17, 51, 62, 75; *Hydnophora* 11, 41, 43) | **No** in this printing |
| *Duncanopsammia* / *Turbinaria* | The printing's *Duncanopsammia* is the branching *D. axifuga* (tubular corallites 10-14 mm), on the branching page beside *Tubastraea* and *Echinopora*, set against *Acropora*; *D. peltata* was still *Turbinaria peltata*, so no text compares the two genera. | p. 50 shared (vases or tiers); *Duncanopsammia* also 9 and 74 | **Not in this printing**; the 2022 page 50 may differ |

- **Proposed `lsrc` lines** for the two that qualify, in the deck's form (a follow-up data PR through
  `tools/datajson.py`, rule W16; the integrator's call, easy to correct, since `look` already holds both pairs and only
  the Learn deck reads the line's source):
  - *Alveopora* / *Goniopora*: "Coral Finder p. 71: Alveopora 12 tentacles, Goniopora 24".
  - *Halomitra* / *Herpolitha*: "Coral Finder p. 65-66: Herpolitha elongate, Halomitra a domed disc".
- **The other two stay out of the deck** until the 2022 pages are read (rule C2). Pierre's answer (d) asked for a point
  if the PDF could not be read: the point `coral-finder-starred-pages` in `points.json` (Inbox › To do › Points) asks
  him to look at the 2022 pages for *Merulina* / *Hydnophora* and *Duncanopsammia* / *Turbinaria*, and to confirm the
  page of the *Halomitra* comment.

Other local pairs that share only a box or an IMR group are not proposed:

- *Pavona* / *Pachyseris*, *Galaxea* / *Echinopora*, *Lobophyllia* / *Platygyra*, *Diploastrea* / *Dipsastraea*;
- *Ctenactis* / *Herpolitha*, the free-living pair.

They stay on the genus sheets and in duels, as the deck's rule says. No other source was read for corals: an outside
source cannot make a coral classic (rule C2).

*Millepora*, the fire coral, has no look-alike pair at all (`data.json` `x`). Whether the lecture compares it with a
branching or encrusting hard coral is a question for an IMR trainer, not for this note.

## 7. Considered and left out

### 7.1 In the data, few observers near Dauin [measured]

Few observers is not rarity (§1.2): these stay candidates, left out of the 27 only because no player is likely to
meet them soon, not because they are rare.

Mimicry pairs that a source states:

- ***Plectropomus laevis*** (Blacksaddle coral grouper), juvenile, with *Canthigaster valentini*.
  - Randall 2005, p. 316: the juvenile "closely resembles the small toxic toby".
  - FishBase: "Juveniles may mimic".
  - Fishes of Australia: "Juveniles mimic", citing Frisch 2006, "Are juvenile coral-trouts (Plectropomus) mimics of
    poisonous pufferfishes (Canthigaster) on coral reefs?" [read].
  - **0 observers near Dauin, 2 in the Philippines**. It is in the game through the IMR reference list. 47 photos, 12
    juvenile-tagged, all from outside the Philippines.
  - Already class B (`fish.json` Groupers `juv`).
  - A card could follow when the mimicry variant is built: the rule would treat it like M1 [guess].
- ***Anyperodon leucogrammicus*** (Slender grouper), juvenile, with female *Halichoeres*.
  - Randall 2005, p. 313-315: *H. leucurus*, *H. melanurus*, *H. richmondi*.
  - FishBase: the juveniles have "a blue-edged black spot (or double spot) at base of caudal fin and another at base of
    soft dorsal fin".
  - 2 observers near Dauin; *H. melanurus* 5, *H. richmondi* 2, *H. leucurus* 1.
- ***Plagiotremus laudandus*** (Bicolor fangblenny) with *Meiacanthus atrodorsalis* (Randall 2005, p. 307): 1 observer
  near Dauin.
- ***Cheilodipterus nigrotaeniatus*** (Blackstriped cardinalfish) with *M. grammistes* (Randall 2005, p. 308): 0
  observers, and 6 photos.

Plain confusions:

- *Amphiprion ocellaris* / *A. percula*, the most famous anemonefish pair. *A. percula* has **0 observers** near Dauin
  or in the Philippines in our counts and is in the game only through the IMR list. *A. ocellaris* has 61.
- *Chaetodon lineolatus* / *C. oxycephalus*: 0 and 3 observers.
- *Lutjanus kasmira* / *L. quinquelineatus*: 1 and 3.

### 7.2 No source found that pairs them, or marks too thin

- *Platax teira* / *P. orbicularis* / *P. boersii*.
  - Fishes of Australia gives *P. teira*'s "dark blotch below the pectoral fin".
  - No page read compares the three.
  - The batfishes' juveniles are already class A.
- *Chaetodon speculum* / *C. unimaculatus* (15 and 4 observers): not searched, for want of time [guess: a likely
  confusion].
- *Acanthurus japonicus* / *A. nigricans* (19 and 5): not searched, for the same reason.
- The *Hypselodoris*, *Goniobranchus* and *Chromodoris* pairs the survey found only in iNaturalist's counts (its §5 "Data
  only"): no mark found.

### 7.3 Named by a source, not in our data

**Fish**:

- *Centropyge flavissima*: the eastern-Pacific model of *A. pyroferus*, and its "C. flavissimus" in FishBase.
- *Calloplesiops altivelis*, the comet: McCosker 1977 compares its fright posture with the head of *Gymnothorax
  meleagris*, which is in our data (Randall 2005, p. 318).
- *Lutjanus bohar*, whose juveniles are compared with *Chromis* damselfishes (Randall 2005, p. 313).
- *Pseudochromis fuscus*, compared with *Pomacentrus* damselfishes (Randall 2005, p. 318).
- *Meiacanthus oualanensis*, *M. smithi* and *M. lineatus*, the bream's other models, and *M. vittatus*, another model
  of *Petroscirtes breviceps*.
- *Coris aygula*, *Siganus vulpinus*, *Epinephelus polyphekadion*, *Canthigaster coronata*, *Abudefduf bengalensis*:
  partners of classic confusions elsewhere, absent from our data.

**Sea slugs**:

- *Paradoris liturata* and *Thorunna australis*: confirmed in the Philippines, not species of the game.

**Not sea slugs**:

- the flatworm *Pseudoceros imitatus*;
- the juvenile sea cucumber *Pearsonothuria graeffei*, which resembles *Phyllidia varicosa* (survey §4).

**Not fish**: the flatworm shown beside juvenile *Platax pinnatus* (Randall 2005, figs 29-30, p. 305).

## 8. Can our photos show the marks?

**Counts**: every fish species of the 27 pairs has 27 to 57 photos in play, and every sea slug 12 to 17. No pair lacks
photos outright [measured]. What is short is the right photo for the mark.

**Juveniles that resemble another species**: the card needs juvenile photos.

| Species | Juvenile-tagged photos | In profile | Concern |
|---|---|---|---|
| *Scolopsis bilineata* | 17 | 13 | none |
| *Pholidichthys leucotaenia* | 37 | 8 | few profile views |
| *Pomacanthus imperator* | 15 | 9 | none |
| *P. semicirculatus* | 24 | 18 | none |
| *Acanthurus pyroferus* | 18 | 6 | the form copied is not verified (§3, M1) |
| *Plagiotremus rhinorhynchos* | 5 | 3 | short |
| *Hexabranchus lacer* | 5 | not counted | short |

- **The juvenile tag is not the resembling form.** The judge tags a juvenile by its colours against the adult's. It does not
  say which colour form, so for *A. pyroferus* someone has to look. Many species carry about 10 juvenile tags because the
  candidates workflow runs a juvenile search for each species (`tools/fish_refill.json` "parts"). The count measures
  supply, not mimicry [guess].
- **Marks that need a particular view** [guess: what each mark needs]:
  - the mouth of the two blennies that resemble the cleaner wrasse (M3, M4): a sharp side view of the head;
  - *Chromis atripectoralis*'s axil (C9): the pectoral fin held out;
  - the filefish's long soft fins (M2): the fins spread;
  - the *Nembrotha* foot border (S6): a side view;
  - the *Hypselodoris* rhinophore rings (S8): the rhinophores visible.
  - None of these can be counted from the tags: someone has to look at the photos.
  - Pierre picks the montage's two photos (`curation.json` `mont`, as for the corals), so the card can use the one good
    photo even when most do not show the mark.
- **No mark found for a pair** (S4: *C. lochi* / *C. willani*): photos alone do not make a card.

## 9. How the cards should work: one mechanism for every subject

### 9.1 One pair record [guess: the design is mine; the data shapes follow what exists]

- The corals keep theirs: `data.json` genus `look` and `lsrc`.
- The fish families keep `look` and `lsrc`.
- The sea slug genera have `look`, `lsrc` and `lkind` (Q390 D).

A species pair needs one shape for every subject. It is built by a tool from a hand-kept source file, as
`tools/seaslug_lookalikes_source.json` is:

- `a`, `b`: the two node ids, at any rank (species ids for the pairs here).
- `kind`: `resembles` (a source states mimicry) or `confused` (a plain confusion).
- `stage`: per side, `juvenile` or `all`. *A. pyroferus* is `juvenile`; *P. prionurus* is `all`.
- `marks`: 2 or 3 entries, each with its words, the side it belongs to, and its source.
- `src`: the sources, each with its quote, where it was read and when.

The checks follow `tools/seaslug_cues.py`:

- every mark has a source;
- no number on a card;
- both species are in the subject;
- the word "mimic" appears only inside a quote.

The pairs are then the instance's structure (Q359; `docs/reviews/2026-11-14-sheet-overlay-design.md` v2): editable in
the admin as #1075 made them for the sea slug genera, with the structure stamp and the replay.

### 9.2 One card

It is the corals' montage, extended:

- two photos in one view: for fish, the profile; for a `juvenile` side, a juvenile photo; Pierre's pick wins (`mont`);
- each species' marks under its photo;
- the source line;
- a word for the kind: "Resembles" or "Often confused".

It is shown in four places:

1. **Learn › Look-alikes**. Today the deck is coral-only (`learn.js` `viewLookalikes` reads `DATA.gen`). One deck for
   every subject reads the subject's pairs.
   - Until species step 2, a fish or sea slug card is information only: no draw and no progress reads it.
   - Like a genus sheet, it is the integrator's call, easy to correct.
2. **The first meeting of a photo of the mimicry class**: the explanation card Pierre asked for. `quiz.js` `phaseShow` already shows a
   juvenile beside its own adult; the mimicry card shows it beside its model, with the marks.
3. **After a wrong answer between the two**, as the corals' wrong-answer montage does.
4. **The drills**: the duel and "Again" for the pair, and Find the X once species are units.

### 9.3 Before and after species step 2 (#1041)

**Before**, the units are fish families (and circle-1 genera) and sea slug genera.

- A pair across two units can act **per photo**: a photo of the resembling species, or of its juveniles for a `juvenile`
  side, makes the model's unit a likely trap and duel partner. This is FISH_PATH.md "Look-alikes at any rank", view 2,
  designed on 2026-11-04 and not built.
- It never makes the two whole families look-alikes: not every surgeonfish against every angelfish.
- A pair inside one unit is a Learn card only.
- **Two exceptions** are whole-family pairs already: each family has one species in our data.
  - C11: Cornetfishes and Trumpetfishes.
  - M7: Convict blennies and Eel-tailed catfishes, though only the juveniles resemble each other.

**After**, the species are units and every pair links two species units:

- the declared pairs open close together (Q350);
- they are forced as traps, as declared pairs are (Q350 f);
- the players' answers then rank them as for every pair.

### 9.4 The mimicry variant (Pierre, 2026-11-18)

Today a variant photo's kind comes from `core.js` `varKindOf`. Its ramp comes from `VAR_AT`:

- class A juveniles from the start;
- other juveniles and phases from Open Water (0.5) to Advanced (0.8);
- class B, "late", at Advanced.

Pierre's rule adds a kind for the photos of a pair's resembling side (§9.1 `stage`). It comes in when two conditions hold:

- **its unit is at Open Water**: the ramp's start, 0.5;
- **the model's unit is met**.

What follows from it:

- Three juveniles now in class B (*A. pyroferus*, *S. bilineata*, *P. laevis*) would come in at Open Water instead of
  Advanced, once their model is met: Pierre's rule supersedes the class B timing for them.
- An adult that resembles another species (*P. prionurus*, *A. taeniatus*, *P. breviceps*) becomes a variant for all its photos.
- "Learned" asks a right answer on each variant group (Q391 b). Whether the mimicry kind is a group of its own or joins
  the juveniles is a design choice for the build [guess: join the juveniles for a juvenile; its own group for an
  adult one].
- **This moves the draw, so it moves progress**: a rules version (rule D5), the sheet's replay, and the check of rule
  L11 (the species step 2 plan's ~40 minutes of machine time sets the scale).

### 9.5 The out-of-region warning (Pierre, 2026-11-18)

Pierre, on the *A. pyroferus* juvenile photos: "Merci de mettre un warning sur ces cas". The case is general: some taxa
look different by region, according to a source (a regional mimic such as *A. pyroferus*, whose juveniles resemble *C.
vrolikii* in the western Pacific and *C. flavissima* farther east; a local colour form). A photo of such a taxon taken
outside the region shows a form players may never meet here. Built later, with the variant classes:

- **The flag**: a taxon whose look varies by region carries the reason and its source (for *A. pyroferus*, Randall 2005,
  p. 320-321, and FishBase), in the subject's source file, as `photoTaxon` already carries its reason and source.
- **The badge**: in the admin, every photo of such a taxon taken outside the Philippines region (its `loc`: `world`)
  shows a ⚠ badge with the reason and the source.
- **The default**: those photos stay out of the explanation cards (§9.2, the first meeting of a mimicry photo) and of
  the feature frames (the photos a card or a sheet puts forward to show a mark).
- **One click lifts it**: Pierre lifts the warning on a photo he has checked, as any other admin tag (one click with
  Undo, rule A2); the photo then serves cards and frames as any other.
- **What it does not do**: the photo stays in play and in the quiz; the warning only keeps it from teaching the
  regional form.
- **Who else**: the same flag serves any taxon a source describes as regional, fish or sea slug; none other is
  flagged in this study.

### 9.6 Effort, in agent time [guess]

| Step | Agent time |
|---|---|
| The pair source file for the 27 pairs, its build into `fish.json` / `seaslug.json` and its checks | about 2 h |
| The Look-alikes deck for every subject, reading the pairs, with photo choice by view and stage, plus the smoke part | about 3 h |
| The mimicry variant kind and its partner gate, the rules version, the L11 check (machine time apart) | about 3 to 4 h |
| The per-photo traps across units (FISH_PATH view 2) | about 3 h |
| Fish species pairs in the admin's structure editor (after #1075) | about 2 h |
| The out-of-region flag, its admin badge and its default (§9.5) | about 2 h |

The last three wait on species step 2's answers (Q394-Q398) where they touch species units.

## 10. What is Pierre's to validate, and his answers

**Rules that apply**:

- A pair that enters play is structure: it moves the draw, traps and duels, and the sheet replays every player on it
  (sheet overlay design v2).
- The mimicry kind moves progress (rule D5).

**Already decided**:

- the mimicry rule itself (Pierre, 2026-11-18, 10:22);
- the sea slug genus pairs (Q390 D);
- declared pairs forced (Q350).

**The integrator's call (easy to correct)**:

- the Look-alikes cards in Learn with no effect on play;
- their layout;
- the photo pick before Pierre's own.

**Pierre's answers** (2026-11-18, about 10:54-10:55 Manila, relayed by the integrator), to the questions this study
asked:

- **(a) Which pairs enter play**: "ok". M1-M7 enter play now as declared pairs; C1-C12 come with species step 2
  (#1041). C11 and M7, each between two one-species families, can be family pairs from now on.
- **(b) The pairs with a member few people photograph near Dauin** (M2's filefish, C1, C6, C7, S2, S8): yes, they stay,
  with his correction: "'rare' parce que les gens ne les prennent pas spécifiquement en photos. C'est le problème des
  mimics ^^ Mais globalement pas rares aux Philippines". §1.2 now says what the counts measure, and that they never drop
  a pair on their own.
- **(c) A card with one sourced mark**: "ok". One sourced mark is enough for a card; a pair with none (S4, *C. lochi* /
  *C. willani*) stays out of the deck until a mark is found.
- **(d) The four starred corals**: "ok" to a point, then (10:55) "Techniquement tu as accès au pdf du coral finder dans
  mon drive". The reading is in §6.2: two pairs qualify, the other two wait on the 2022 scan, in one point of
  `points.json`.
- **The *A. pyroferus* photos**: "Merci de mettre un warning sur ces cas": the general out-of-region warning of §9.5,
  built later with the variant classes.

## 11. Searches run and pages read

All on 2026-11-18, between 10:25 and 10:47 Manila (the clock read at the end).

- The queries hold only scientific names, English common names and general words: no photo, no address of ours, no
  repository or sheet data.
- No image search.
- The pages were requested one after another, at most three FishBase pages in one batch.

**Web searches** (17):

1. Randall 2005 "A review of mimicry in marine fishes" Zoological Studies
2. fishesofaustralia Centropyge vrolikii Pearlscale Angelfish
3. Plectropomus laevis juvenile black saddles yellow fins resembles Canthigaster valentini large mouth
4. fishesofaustralia Aspidontus taeniatus False Cleanerfish mouth underslung Labroides
5. fishesofaustralia Labroides dimidiatus Common Cleanerfish black stripe widens posteriorly
6. Heniochus diphreutes acuminatus distinguished shorter snout anal fin black band "diphreutes"
7. Moorish idol Zanclus cornutus distinguished from bannerfish Heniochus orange snout saddle tubular snout
   identification
8. Amphiprion sandaracinos stripe extends onto upper lip perideraion white bar behind head distinguish
9. fishesofaustralia Chaetodon vagabundus Vagabond Butterflyfish similar species Chaetodon auriga
10. Forcipiger longirostris flavissimus distinguished longer snout black dots chest identification Fishes of Australia
11. Dascyllus melanurus Blacktail Humbug distinguished from Dascyllus aruanus black caudal fin tail identification
12. Abudefduf sexfasciatus Scissortail Sergeant black stripe each caudal fin lobe identification
13. Chromis atripectoralis Black-axil Chromis differs from Chromis viridis black pectoral fin base axil Fishes of
    Australia
14. Platax teira distinguished black blotch anal fin pelvic fin Platax orbicularis boersii identification
15. Platax orbicularis Orbicular Batfish Fishes of Australia similar species Platax teira lacks dark blotch
16. juvenile Pomacanthus imperator concentric white circles semicirculatus juvenile curved white bars distinguish
17. Pterois antennata Spotfin Lionfish distinguished Pterois volitans pectoral fin rays white filaments spots membrane

**Pages read**:

- **Randall 2005**, the full PDF (Zoological Studies' site; read as text).
- **FishBase species summaries** (`fishbase.se/summary/<Genus-species>.html`):
  - *Aspidontus taeniatus*, *Paraluteres prionurus*, *Acanthurus pyroferus*, *Centropyge vrolikii*;
  - *Canthigaster valentini*, *Plectropomus laevis*, *Petroscirtes breviceps*, *Plagiotremus rhinorhynchos*;
  - *Labroides dimidiatus*, *Meiacanthus grammistes*, *Anyperodon leucogrammicus*, *Pholidichthys leucotaenia*;
  - *Plotosus lineatus*, *Heniochus diphreutes*, *Zanclus cornutus*, *Amphiprion sandaracinos*;
  - *A. perideraion*, *Dascyllus melanurus*, *Abudefduf sexfasciatus*, *A. vaigiensis*;
  - *Chromis atripectoralis*, *Chaetodon auriga*;
  - *Chaetodon ocellicaudus* (HTTP 503).
- **Fishes of Australia** (`fishesofaustralia.net.au/home/species/<n>`):
  - 644 (*C. vrolikii*), 4414 (one of the Groupers' juvenile sources in `fish.json`: a coral rockcod's page, with no
    word of *P. laevis*, probably cited there for the *Cephalopholis* sentence [guess]);
  - 618 (*S. bilineata*), 4517 (*P. laevis*), 861 (*C. valentini*);
  - 1278 (*A. sandaracinos*), 308 (*A. sexfasciatus*), 2210 (*P. teira*).
- **Australian Museum**:
  - read: Pearlscale Angelfish, Common Cleanerfish, Longfin Bannerfish (after a 301 from australianmuseum.net.au),
    Longnose Butterflyfish;
  - HTTP 404: Moorish Idol and Scissortail Sergeant (guessed addresses), and a first address for the Longfin Bannerfish.
- **SURG**: *Aspidontus taeniatus*, *Chaetodon vagabundus*, *Pterois antennata*.
- **English Wikipedia**: "Spot-tail butterflyfish", "Chromis atripectoralis".
- **FAO repository**: "Fishes of the Maldives" (BOBP/MAG/021), the angelfish part (`ad471e39.pdf`, two requests
  through a redirect); one HEAD request on a FAO guide PDF the repository already cites.
- **Pierre's Google Drive** (read only, the Google Drive connector, 2026-11-18 about 11:00 Manila): a title search for
  "Coral Finder"; "Coral Finder 2022.pdf" (page markers only: scanned, no text layer); "Coral finder.pdf" (the 2009
  printing, its text read; nothing saved in the repository).
- **Not readable**:
  - Reef Life Survey (*Aspidontus taeniatus*, *Labroides dimidiatus*: HTTP 403);
  - zoores.ac.cn (a rate-limit page, one request).
