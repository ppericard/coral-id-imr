# Reference poses per subject: what makes a photo a 5

Study note (docs only, Linear REE-275), 2026-11-24. It changes no rubric, no code and no judgement. Counts come from
the recorded codes by [count.py](2026-11-24-reference-poses/count.py) (`python3 -B
docs/reviews/2026-11-24-reference-poses/count.py`, on `main` at cd4214f1); nothing was judged.

## 0. The request

Pierre, 2026-11-24 13:50 Manila: «Globalement je pense qu'une note de 5 (qui reste un apriori susceptible d'être faux)
doit être donné pour les photos qui cochent toutes les cases de photos d'identifications sur les livres d'ID ou les
sites de référence. Ca peut vouloir dire des poses de références différentes selon les sujets. Du coup la ou les poses
de références doivent être définies par sujet. Du coup, sur nos 3 sujets différents, qu'est-ce que tu penses être
la/les poses de référence, et les critères qui font des bonnes photos/observations de référence?»

At 14:06, on the integrator's proposal (from memory, unchecked): «A vérifier dans les sources, voire faire une étude
supplémentaire si besoin». On a pose that depends on body shape (a flatfish or a ray seen from above): «oui!».

These words are quoted from the integrator's brief: the answers ledger (docs/ANSWERS.md) held no entry for 13:50 or
14:06 when this note was written, so they could not be checked there.

The integrator's proposal, as given:

- **Fish:** the whole animal in side view, fins spread, sharp, natural colours, an adult in its typical colour pattern,
  filling a good part of the frame, on a plain background (FishBase plates, Randall and Allen guides); from above for
  flatfish and rays, maybe others (eels, garden eels).
- **Sea slugs:** the whole animal extended and crawling, from above or three-quarters above, rhinophores and gills
  visible, a sharp mantle pattern (Gosliner, Behrens & Valdés, "Nudibranch & Sea Slug Identification").
- **Corals:** a pair, the whole colony showing its growth form plus a close-up of the corallites (Veron, Corals of the
  World); for a genus, a whole, sharp colony close enough to read its form.
- **Common to all:** sharp, whole, well lit, natural colours, one unambiguous subject, no watermark.

## 1. What the sources show

Every source below is public and was fetched on 2026-11-24 with public query terms only (rule C2). **[read]** means
the page or file was downloaded and every quote below was checked word for word against its text (line breaks
aside). **[not read]** means it was not opened. The print guides the proposal names (Randall; Allen; Gosliner,
Behrens & Valdés; Veron's *Corals of the World* volumes) are **[not read]**: nothing here is attributed to them.
Several sources are from outside the Philippines; they are cited for how a photo is taken, never for a species' cue
(rule C6).

### 1.1 Fish

| Source | What it says |
| --- | --- |
| FishTrace WP2 protocol, Kullander & Norén, Swedish Museum of Natural History, version 4, 7 June 2003 ([PDF](https://fishreg.jrc.ec.europa.eu/static/documents/fishtrace/FishTrace_WP2_protocol.pdf)) **[read]** | For specimens: "Photographs must be taken of the left side of the specimen, except certain flatfishes. In flatfishes, the eyed side should be shown, with the gill opening down. Photographs should be taken in lateral aspect, and when relevant of other aspects (flatfishes: right and left side; anglerfishes: dorsal and ventral aspect). Fins should be spread as much as possible using alcohol-soaked cotton swabs and supports when relevant." Its background is "a neutral grey". |
| Florida Fish and Wildlife Conservation Commission, "Photo Tips for Properly Identifying Your Fish" ([page](https://myfwc.com/fishing/saltwater/outreach/photo-tips/)) **[read]** | "Be sure to clearly show as much of the fish as possible, including all fins." Per group: sharks, "one full side view of the entire shark and one top-down view of the head"; jacks, groupers and snappers, "one full side view of the entire fish and one side view of the head"; mackerels and tunas, "one full side view of the entire fish"; flounder, "one top-down view of the entire fish"; and for groupers and snappers "Body shape and depth clearly and accurately displayed. Keep the body of the fish perpendicular to the camera to accomplish this." |
| Redmap, "Identifying fishes" ([page](https://www.redmap.org.au/article/identifying-fishes/)) **[read]** | "So try and make sure that all fins are visible – so a side-on photo with all of the fins showing is best." On colour: "Fish can change colour within seconds, appear different when out of the water, with age, with gender, or with time of day". |
| FishBase manual, "Pictures in FishBase" (Froese, Atanacio & Pauly; [page](https://www.fishbase.se/manual/fishbasethe_pictures_table.htm)) **[read]** | The set it wants per species is not one plate: "one morphological drawing", a dead-fish photo, "one aquarium photo or drawing showing live colors, and one underwater photo showing the fish in its natural environment." |
| FAO species identification guide for the Western Central Pacific, batoid chapters: Dasyatidae, stingrays (Last & Compagno, p. 1479; [PDF](https://www.fao.org/4/x2401e/x2401e09.pdf)) and Rhinopteridae, cownose rays (Compagno & Last, p. 1520; [PDF](https://www.fao.org/4/x2401e/x2401e13.pdf)) **[read]**; the series title is from the chapters' running text, its title page not read | A ray's characters are read on its disc. Stingrays (our Rays entry is Dasyatidae): "Five small gill openings on underside of front half of pectoral disc, not visible in lateral view"; the key splits species on "Upper surface of disc with pronounced pattern of dark spots or reticulations" against "Upper surface mostly plain coloured". The cownose key does the same on "Dorsal surface of disc rough" against "Dorsal surface of disc smooth". These are specimen keys: no photo guideline for rays was read. |

What follows from them:

- **Right:** the whole fish in side view, all fins showing, the body square to the camera. The three photo guides
  read (FishTrace, FWC, Redmap) say so, and our profile `p` is that pose. FishBase and FAO give no photo rule.
- **Right, with sources:** the pose changes with body shape. Flatfish are shown from the eyed side, which is from above
  in the water (FishTrace, FWC). Anglerfishes are shown from above and below as well (FishTrace, specimens; probably
  the flattened monkfishes of European fisheries, **[guess]**, not our frogfishes, which belong to the same order but
  are not flattened). Sharks add a view of the head from above (FWC). Rays are read on the upper surface of the disc
  (FAO characters; a photo convention for rays is an inference, **[guess]**).
- **No source read** for eels or garden eels; our typical-look rule (judging/FISH.md "Caps") already judges them
  against how they are seen.
- **Wrong or incomplete:**
  - "Fins spread" and "a plain background" are specimen conventions (dead fish, grey board, swabs). FishBase itself
    asks for an underwater photo "in its natural environment". In the water, the sources ask for all fins *visible*.
  - "An adult in its typical colour pattern": Redmap warns that colour changes with age, sex and time of day, which is
    why a guide shows several. That supports showing the phases, not making a juvenile or a phase less than a 5. Our
    rubric decided the same (Q435, the phase flag caps nothing): see §2.
  - "FishBase plates" is not one look: FishBase's main picture can be a drawing, a specimen or an underwater photo.

### 1.2 Sea slugs

| Source | What it says |
| --- | --- |
| Great Southern Bioblitz, "Great Sea Slug Sunday" (2021; [page](https://greatsouthernbioblitz.org/post/sea-slug-sunday)) **[read]** | "Where possible, take images from above showing the entire animal. Additional images (which we recommend) can be taken from the side, and should also include close-ups of any key features (e.g. the front of the animal, gills, rhinophores [paired, sensory protrusions on the “head-end”])." Also: "Many have body parts that they retract when disturbed." and "Try to get as close to the subject as possible". A caption: "Chromodoris kuiteri - note the gills and rhinophores are visible and the whole body is included in the photo." |
| Victorian National Parks Association, Sea Slug Census ([page](https://vnpa.org.au/programs/sea-slug-census/)) **[read]** | "try to get a clear shot of the slug’s body from the side and/or include as many creature features (rhinophores, gills/cerata, oral tentacles) as possible." |
| MacroDivers, "How to Identify Nudibranchs" ([page](https://macrodivers-website.pages.dev/how-to-identify-nudibranchs.html)) **[read]** | "A blurred body with sharp rhinophores is often more useful than the reverse." and "identification often needs several angles. Try to capture the top, side, head, gills and the surrounding habitat." A diving site, the weakest source here. |
| Sea Slug Forum, *Chelidonura amoena* (Rudman 1998; [fact sheet](https://www.seaslugforum.net/factsheet/chelamoe)) **[read]** | A headshield slug's pattern is on its back: "the grey-black reticulate pattern restricted to the dorsal surface of the headshield and posterior shield, and to the small sections of the parapodia which fold over the dorsal surface of the body." |
| Carlson & Hoff, "The Identifiable *Elysia* from Guam", *Micronesica* ([PDF](https://micronesica.org/sites/default/files/carlsonhoff-5a.pdf)) **[read]** | Sacoglossans: "Members of the genus Elysia have no shell nor cerata, but have parapodial lobes extending upward from the body." One species is told "because of the color patterns inside the parapodia"; a figure shows "Elysia arena with parapodia opened." |
| Stoffels et al. 2016 and Brunckhorst 1993, already in the repository ([cues sources](2026-11-18-seaslug-cues-sources.md), [mode study](2026-11-15-nudibranch-mode-study.md) §5.2) **[read there]** | Phyllidiids: the dorsal tubercles are the characters; the oral tentacles (underneath) are "not photo features" in that note. |

What follows:

- **Right:** the whole animal from above is the first pose the census guides ask for, the rhinophores and gills
  showing, extended (they retract when disturbed).
- **Incomplete:** the side is the accepted second pose (Great Southern Bioblitz "additional", VNPA "from the side
  and/or"), and several angles are the norm. "Three-quarters above" (our `o`) is not named by any source read; it
  shows the back and a side together, so it is between the two. The sources stress sharp rhinophores over a sharp body.
- **By group** (the groups are the existing orders, rule C2):
  - Headshield slugs (Cephalaspidea, *Chelidonura*): the pattern sits on the back of the head and posterior shields,
    so **from above** (Sea Slug Forum).
  - Sacoglossans with parapodia (*Elysia*, *Thuridilla*): the parapodia's inner face carries characters, so **from
    above with the parapodia open**, and the outer face from the side (Carlson & Hoff, on *Elysia*; for *Thuridilla*
    an inference, **[guess]**). Sacoglossans with cerata (*Costasiella*): no pose source read.
  - Phyllidiids: **from above**, the tubercles (the repository's sources).
  - Aeolids: VNPA names cerata and oral tentacles with the side view; no source read says the side is *the* aeolid
    pose, **[guess]**.
  - Sidegill slugs (*Pleurobranchus*): no pose source read.
  - Sea hares (Aplysiida; none in circle 1, 73 photos in play): no pose source read.
- "Crawling" is supported only by a caption ("crawling on a flat surface ... allowing all of the key features to be
  included"); our tags do not record it.

### 1.3 Corals

| Source | What it says |
| --- | --- |
| Corals of the World, species pages ([*Favites abdita*](https://www.coralsoftheworld.org/species_factsheets/species_factsheet_summary/favites-abdita/), [*Heliofungia actiniformis*](https://www.coralsoftheworld.org/species_factsheets/species_factsheet_summary/heliofungia-actiniformis/)) **[read]** | A description reads the colony, then the corallites: "Colonies are massive, either rounded or hillocky and sometimes over one metre across. Corallites are rounded, with thick walls. Septa are straight, with exsert teeth." A mushroom coral is one polyp: "Polyps are solitary, free-living (except for juveniles) and flat, with a central mouth." |
| Henry et al., "A Guide to Common Stony Corals of Florida", UF/IFAS FA210 (2018; [PDF](https://edis.ifas.ufl.edu/publication/FA210/pdf)) **[read]** | "Two images accompanying each species profile provide a full-colony perspective and close-up of polyp and corallite structure." |
| BYOGUIDES workshops, on the Indo Pacific Coral Finder (Reef Builders, 2026-02-16; [page](https://reefbuilders.com/2026/02/16/byoguides-announces-new-workshops)) **[read]** | "to identify Indo Pacific hard corals to genus regardless of growth form." |
| NMITA Coral Identification Key, step 7 ([page](https://nmita.rsmas.miami.edu/idstep7.htm)) **[read]** | A key step on "Colony shape" and "corallite diameter" together. |

What follows:

- **Right:** the identification unit is a pair, the colony and its corallites (FA210's two images; Corals of the
  World's colony-then-corallite description). Our three views (rule P2) already hold both.
- **To qualify:** the colony view alone does not name a genus. The Coral Finder workshops teach the genus "regardless
  of growth form", and rule C4 says growth form is an entry point only. From that, **[guess]**: the most useful colony
  photo shows the form *and* enough surface to start reading the corallites, which is close to our `medium` view's
  role.
- **By growth form** (the 7 IMR forms, rule C4). No source read gives a pose per form; the lines below are the
  integrator-level reading of what each form needs to be read whole, all **[guess]** except the mushroom corals:
  - Branching: the whole thicket or colony, the branch tips readable (the axial corallites, for *Acropora*).
  - Tabulate: the table from the side (its stalk and flat top) or from above.
  - Encrusting: the colony's edge on its substrate; there is little shape beyond the surface.
  - Foliose/Plating: the plates or whorls, their edges and the corallites facing one way.
  - Massive and Submassive: the whole colony, its outline and surface.
  - Mushroom: one polyp; the whole polyp from above, mouth and septa visible, from Corals of the World's "solitary,
    free-living ... flat, with a central mouth".
- **Polyps extended:** the day-extended genera (rule C4's list) show their polyps, so a photo with polyps out is
  normal there (judging/BRIEF.md "Calibration"), though it is never quality 3 Good.

### 1.4 Common to all

Sharp, whole, the subject plain, its features visible: every source agrees. Two of the proposal's common criteria are
not in any source read: "no watermark" (none mentions one) and "natural colours" as a separate test (the fish sources
mention colour as variable; our colour-loss tag covers it).

## 2. Our rubrics today

| | Fish (judging/FISH.md) | Sea slugs (judging/SEASLUG.md) | Corals (judging/BRIEF.md) |
| --- | --- | --- | --- |
| Scale | ease 1-5 | ease 1-5 | no ease: quality 1-3 (fine detail), a view, a growth form |
| A 5 | profile, whole, good light (flash on dark included), sharp, large or medium, one fish or a school of it; "a field-guide photo"; every one met → 5 | dorsal, lateral or dorso-lateral, whole, good light, sharp, **large**, one sea slug, no `f`; "a field-guide photo" | — |
| Views capped | head-on, tail and **top** (`h`, `t`, `d`) at most 4 | head-on, rear at most 4; ventral at most 3; dorsal caps nothing | — |
| Other caps | partial at most 4; camouflage, out of water, night livery, strong colour loss at most 3; unclear subject, monochrome, strong blur at most 2 | the fish's, plus ventral | — |
| Caps nothing | juvenile `j` (Q435), phase `p`, watermark `w` (Q373), reference route `r`; in a typical-look family, partial and camouflage (Q456) | `j`, `w`, `f` | watermarks and logos are never a reason to lower (BRIEF "genus") |
| Reference level | `refLevel`: ease 4-5 and the tags `p1g0s`, size `l` or `m`, count `1` or `s`, no `j`, `c`, `a` (rule P1's "reference look": profile) | — | the views of rule P2 |

Where they agree with the sources:

- **Fish:** the profile, whole, sharp, the fish plain is the sources' pose and our 5. Our light rule (a flash on a dark
  background is good light, Q308) and our busy background as one mild shortfall (a 4) do not ask for a plain
  background, as the in-water sources do not.
- **Sea slugs:** dorsal and lateral are both 5, as the sources' "from above" plus "from the side"; `f` (rhinophores or
  gills withdrawn or hidden) keeps a photo from 5, as the sources ask for them extended. Our clarity tag reads
  sharpness "where the characters are (the head end with the rhinophores, the pattern)", as MacroDivers does.
- **Corals:** the colony and the corallites are separate views (rule P2), as the sources pair them.

Where they differ:

- **Fish seen from above.** Rule P1's reference look is the profile, and a top view `d` is at most 4 for every fish.
  For flatfish (our Soles) and rays the sources and Pierre's «oui!» make the view from above the reference pose, so
  today no sole or ray from above can be a 5. In play: 135 of the 141 Soles photos are `d` (96%), 72 of 132 Rays
  (55%), 42 of 81 Seamoths (52%), 45 of 99 Flying gurnards (45%); then Eel-tailed catfishes 34%, Reef sharks 24%,
  Shrimpfishes 22%. The typical-look rule (Q456) does not help here: it frees partial and camouflage, not the view.
  Soles and Seamoths are typical-look families already; Rays are not (32%, judging/FISH.md "Caps").
- **The Soles' 4s are the cap's.** The Soles were judged again this morning in the typical-look re-judge (#1493, Linear
  REE-246), with the `d` cap at 4 in force: 37 of their 49 reference-look `d` photos are typed 4, 12 at 3. A 4 typed
  under a cap of 4 says nothing on whether the judge saw a 5.
- **Sea slugs' three-quarters view** `o` is a 5 in our rubric (541 of the 1,460 sea slug 5s) but is named by no
  source read; it is not wrong, only unsourced.
- **Sea slug size.** Our 5 asks for a large animal (`l`), the fish's for large or medium. The "macro framing" rule was a
  **[guess]** in SEASLUG.md. Great Sea Slug Sunday's "as close to the subject as possible" is given for light and
  depth of field, not as a rule of what an identification photo is, so it does not settle the size; reading it as
  support is an inference. It is a per-subject difference not declared today (rule S1).
- **Corals have no 5.** Nothing ranks a coral photo as a field-guide reference beyond quality 3 in its view.
- **What a 5 does not record.** The fish's 5 also asks "colourful or with its family's shape and pattern plain to
  see", which no tag records. In play, 2,937 fish photos carry every reference-look tag in profile (`p1g0s`, `l` or
  `m`, `1` or `s`, no `j`, `c`, `a`): 1,366 are at 5, but **1,416 were typed 4** (and 155 at 3 or 2). The judges saw a
  shortfall the tags do not hold (a busy background, a slight turn within `p`, a pattern not plain). The same holds for
  the sea slugs: 341 photos with every reference tag in a good view at size `l`, no `f`, were typed 4.

What the proposal's common criteria would change against settled answers:

- **"No watermark"** contradicts Q373 (a watermark caps nothing; Home and the covers skip it instead): 195 fish and 238
  sea slug photos at 5 carry `w`.
- **"An adult in its typical colour pattern"** contradicts Q435 (a juvenile caps nothing) and the phase flag rule
  (rubric 3): 119 fish 5s are `j`, 300 carry the phase flag.
- **"Fins spread", "plain background", "extended, crawling"** have no tag, so they cannot be counted or applied
  without judging the photos again.

## 3. A proposal for Pierre

A 5 stays a prior: the photo's starting difficulty, which the players' answers replace (`model.js` `photoDiff`, rule
P1: "the answers decide it"). So the reference pose decides what a judge may call a 5; it never takes a photo out.

### 3.1 Fish

- **Reference pose by body shape.** The profile for most families. **From above** for the families whose usual look is
  from above, chosen by a declared rule like the typical-look one, never a hand list: options in question (a).
- **A 5:** the reference pose for its family, the whole fish with all fins visible, good light, sharp, large or medium,
  one fish or a school of it, its pattern plain; a juvenile, a phase and a watermark keep their current rules.
- **In the code** (once decided): `tools/fish_judge.py` `cap` stops capping `d` in those families, as `typical` frees
  partial and camouflage today (a second declared set beside `typical_look`, or the typical-look rule widened to count
  `d`; the first keeps each rule's meaning); `refLevel` and rule P1's "reference look" read the family's pose.

### 3.2 Sea slugs

- **Reference poses:** from above, whole, extended (first), and from the side (second); the three-quarters view stays a
  good view. By group, the sources favour from above for headshield slugs and phyllidiids, and from above with the
  parapodia open for *Elysia*-like sacoglossans: options in question (e).
- **A 5:** as today (a good view, whole, good light, sharp at the head end, large, rhinophores and gills showing), its
  size rule declared as a per-subject difference with its source (question (d)).

### 3.3 Corals

- **Reference observation:** the pair, one colony seen whole (its form readable) and its corallites sharp, as P2's
  views already hold.
- **A reference photo per view**, from what is already judged: a colony photo of quality 3 whose form is read (not
  `x`); a corallite photo of quality 3. The six day-extended genera are never quality 3 with polyps out (BRIEF
  "Calibration"), so for them the level would take quality 2 with polyps out, or they would have none; options in
  question (f). How many photos each view would hold was not counted here (the coral photos in play sit in
  `data.json` and in Pierre's curation, which this note's script does not read).

### 3.4 What a change would mean for photos already judged

A cap only lowers a typed ease; lifting a cap raises nothing by itself (judging/FISH.md "What the re-cap moved"). So:

- **Fish from above:** lifting the `d` cap in the from-above families raises nothing today. Every `d` photo there with
  the reference-look tags was typed 4 or less: Soles 49 (37 at 4, 12 at 3), Rays 5, Seamoths 9 (rule (a) option 1);
  Flying gurnards 11 more under option 2. Raising them is a re-judge of 63 to 74 photos. For the Soles it would be the
  second pass on the same photos since #1493 (Linear REE-246), whose 4s were typed under the cap.
- **Tags decide the 5** (question (b), option 2): a script would set 5 on every photo whose tags read the reference
  look: 1,416 fish in profile plus the from-above ones, 341 sea slugs. No agent judging, but it overrides 1,757 typed
  eases against the judges' eye. It could never write over the tags and ease Pierre set himself (`curation.json`,
  rule A1): some of these photos are his adds, which the count does not separate, so the script would leave those as
  a proposal for him.
- **Watermark or juvenile out of 5:** a script could lower 195 + 238 watermarked and 119 juvenile 5s; not recommended
  (question (c)).
- **Sea slug size `m` as the fish's:** 281 photos with every other reference tag were typed 4 at `m`; only a re-judge
  or a tags rule would raise them.
- **Rule P7:** any re-judge here (63 to 74 fish, 281 or 341 sea slugs, or a sample) counts toward the 100 photos of a
  pass and waits for his explicit OK, with the count, the reason and why an agent rather than a script.

## 4. Questions for Pierre

**(a) Which fish families take the view from above as their reference pose?**

1. A declared rule on the photos in play, as the typical look: at least half of a family's photos are `d`. Today:
   Soles (96%), Rays (55%), Seamoths (52%).
2. The same rule at 40%: adds Flying gurnards (45%).
3. Only the families a source read names: Soles (flatfish) and Rays.

*Recommendation: 1.* It follows the method of the typical look (a declared rule, no hand list), takes both sourced
groups and moves with the photos; the typical look's 50% line was declared by the REE-85 study and kept with Q456.
Seamoths come in on the data alone, with no source read.

**(b) What makes a 5: the judge's eye or the tags?**

1. The judge's eye, as today, with the reference pose per family written into the rubric. The 1,416 + 341
   reference-tagged photos typed 4 stay 4.
2. The tags decide: every photo whose tags read its group's reference pose is a 5, by script (Pierre's own tags left
   as a proposal for him, rule A1).
3. A sample first: Pierre sees about 30 of the reference-tagged photos typed 4 beside some 5s and says whether they
   look like a 5 (under 100 photos, rule P7).

*Recommendation: 3, then 1 or 2 by what he sees.* The judges marked something on half of the reference-tagged photos;
whether it is a real shortfall or caution is a fact his eye can settle on a sample.

**(c) Do a watermark, a juvenile or a sex or colour phase keep a photo from 5?**

1. No, as decided (Q373, Q435, rubric 3): a 5 says how easy the subject is to recognise; a juvenile or a phase shows
   in the species questions and the cards; Home and the covers skip watermarks.
2. Yes for the watermark only.
3. Yes for all three.

*Recommendation: 1.* No source read ties identification to a watermark, and Redmap's point that colour changes with
age and sex argues for showing them, not ranking them lower.

**(d) Sea slug size for a 5: large only, or large or medium as the fish?**

1. Large only, declared as a per-subject difference (rule S1), its reason the animals' small size; no source read
   makes it an identification rule.
2. Large or medium, as the fish (Pierre, 2026-11-24 06:45: «par défaut on fasse partout pareil»): the rubric's text
   changes; the 281 photos typed 4 at `m` stay 4 until a judged pass (rule P7) or a tags rule raises them.

*Recommendation: 2.* The size tag is already relative to the frame, so a small animal shot in macro is as large in it
as a fish; no source read gives a reason to differ, and his default is the same rule everywhere.

**(e) Sea slugs: one set of good views, or a preferred pose per group?**

1. One set: from above, from the side and three-quarters are all good views for every group (today).
2. Per group: from above only for headshield slugs and phyllidiids (the side at most 4 there).

*Recommendation: 1.* The census guides accept both for every group, the per-group sources are few, and circle 1 holds
2 headshield slugs; a per-group pose can come with the players' answers.

**(f) Corals: what is the reference photo?**

1. As today: quality and view, no reference level.
2. A reference level per view from the existing judgements: colony at quality 3 with its form read; corallites at
   quality 3; for the six day-extended genera, quality 2 with polyps out. Used for covers and first photos, as the
   fish's.
3. A reference observation: a colony whose colony and corallite photos both reach that level, shown first as a pair.

*Recommendation: 2*, then 3 once the observation pairs are counted. It reads only existing judgements (how many
photos it would hold per view and genus is not counted yet: the first step of the PR that builds it), follows rule P1
for every subject and keeps the pair the sources show.
