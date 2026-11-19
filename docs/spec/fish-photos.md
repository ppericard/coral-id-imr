# Fish photos: sources, candidates and the photos in play

Where a fish photo comes from, the rules every source applies, how a candidate is judged, curated and put in play, and
the files on the way to the game (`fish-cand.json`, `tools/fish_refs.json`, `fish-game.json`, `fish-photos.json`).
This is the specification of what the code does now; why each part was decided is in
[docs/decisions/](../decisions/README.md) and the PRs. [DATA.md](../DATA.md) is the short table of the data files; the
fish content (`fish.json`: units, circles, presence, covers) is in [fish.md](fish.md); the judging rubric in
`judging/FISH.md`; the admin pages in [ARCHITECTURE.md](../ARCHITECTURE.md) "Admin back-office" ("Admin for every
subject"); the photo files and R2 in [ARCHITECTURE.md](../ARCHITECTURE.md) "Photos".

## Where fish photos come from (the sources and the area rule)

- **Sources**: iNaturalist observations (`tools/fetch_fish.py`, candidates), FishBase's underwater photos
  (`tools/fetch_fishbase.py`, candidates), and the photos reference sources use to represent a taxon
  (`tools/fish_refs.py`: iNaturalist's taxon cover and taxon-page photos, FishBase's main picture, into
  `tools/fish_refs.json`).
- **Rules**: from iNaturalist, Research Grade at the species level (Pierre's own observations named to the species count
  as that species even when Needs ID: rule S2), CC0, CC BY or CC BY-NC, never share-alike or ND, never captive, never
  annotated Dead; from FishBase, underwater photos under CC BY-NC as FishBase states it. Every source keeps the area
  rule.
- **The area**: abroad means the Indo-West Pacific only (`fetch_fish.py` `IWP`, a 30 S - 30 N, 90 E - 170 E box). A
  species confirmed near Dauin (`fish.json` `present.near`) takes its photos from anywhere in the Philippines and the
  box; any other species from the Philippines first, and from abroad only when it is confirmed in the Philippines
  (`present.ph`, rule C8; the iNaturalist search only once the Philippines are exhausted). Pierre's own observations
  come first, in the Philippines or the box.
- **On the way to the game**: candidates wait in `fish-cand.json` (admin only) and the reference photos in
  `tools/fish_refs.json`; once put in play (by Pierre in the admin, or by a sure judgement) they are downloaded with his
  crop, uploaded to R2 and listed in `fish-game.json` (`tools/fish_game.py`, the Candidate photos workflow). Nothing is
  shown from iNaturalist or FishBase: every fish photo in play is on R2.

## Candidates from iNaturalist (`tools/fetch_fish.py`)

Documented at the top of the tool; tests in `tests/fishphotos.test.js` (offline fixtures). Per species in the game of
the circle-1 entries (`--circle` for the other circles).

- **Identity**: Research Grade at the species level, or Pierre's own observations identified to the species even when
  Needs ID (rule S2, marked `ni: 1`). Never captive, never an observation annotated Dead.
- **Licences**: only CC0, CC BY and CC BY-NC; never share-alike (it would block a later commercial reuse) nor ND; each
  photo keeps its licence (`lic`), so a commercial version could keep only CC0 / CC BY and Pierre's own.
- **Abroad = the Indo-West Pacific only** (the region of the ID books IMR uses; other oceans have other colour forms):
  a bounding box, `IWP` = 30° S-30° N, 90° E-170° E (from the Andaman Sea and Sumatra to Vanuatu and New Caledonia, from
  Taiwan and the Ryukyus to the southern Great Barrier Reef; out: the Maldives, Sri Lanka, the Red Sea and East Africa,
  Fiji, Samoa, Hawaii, French Polynesia, mainland Japan), passed to every search abroad and checked again on each
  observation's coordinates (`in_iwp`), Pierre's own included.
- **Order** (`select`): Pierre's own observations first for every species, whatever their licence (asked for every
  species, not only those `fish.json` `present.own` counted at its last build, so a species he identified since gets
  them too); then, for a species confirmed near Dauin (`present.near`), photos from anywhere in the Philippines and the
  Indo-West Pacific, not by distance; for any other species, the Philippines first, nearest first (within 40 km of
  Dauin, within 250 km, the rest of the country), and abroad only for a species confirmed in the Philippines
  (`present.ph`, rule C8) once the Philippines are exhausted.
- **Variety on purpose**: no votes order and no quality filter (poor photos stand in for SVS video frames): the least
  represented observer and iNaturalist life stage first, then the licence as a tie-break (CC0 / CC BY before NC:
  [data.md › Photo rights](data.md#photo-rights)), then a fixed hash order of the observation. A photo that belongs to
  several iNaturalist observations is taken once, and an observation left with no photo of its own takes no room.

### The cap, weighted by phases

- **30 photos for a stable species, +10 per extra phase, at most 60** (`cap_of`; `BASE_CAP`, `PER_PHASE`, `MAX_CAP`).
  The extra phases are juvenile, intermediate phase (IMR's "intermediate", "sub-adult"; FishBase's initial phase), male
  or terminal phase, and female (`PHASES`), counted when recorded (`species_phases`, each with what records it): the IMR
  presentation's phase lines and `dimorph` mark of the species' entry (`imr`), the juvenile classes (`juv`: class A or
  B, or the genus or species named `early` / `late` in a mixed entry), a judging tag on one of its photos (`judged`: the
  juvenile flag `j` or the rubric's `phase`, candidates and game photos), the iNaturalist Life Stage or Sex annotation of
  at least 2 distinct candidate observations (`inat:N`, `MIN_ANNOT`: one stray annotation is not a phase), and FishBase's
  life stage on its underwater photos (`fishbase:N`).
- A species met only on the surprise cards (a `wink` entry's) holds at most `WINK_CAP` (5) whatever its phases
  (`species_room`, so the refill and FishBase find no room once it holds 5; `--topup` skips it).
- **Each extra phase holds 10 of them for photos of that phase** (`phase_room`: the room of a phase = 10 minus the photos
  it keeps of it, by `photo_phase`: the judging tags first, then the annotation `st`; a short room is shared out one
  photo at a time); the rest is free.
- **The search fills each phase first** (`fill`): one search per phase iNaturalist can filter (`INAT_PHASE`: Life Stage
  Juvenile, Sex Male, Sex Female; `term_id` / `term_value_id`) for every species with room in it, 20 taxa a request,
  paged by `id_above` (`phase_obs`, rule C7), the Philippines first, abroad (Indo-West Pacific) as for any photo from
  abroad; then the free room and the rooms of the phases iNaturalist cannot filter (intermediate: the judging tags say
  which they show) from the general searches. A phase's room iNaturalist cannot fill stays open for that phase (FishBase
  next, or a later run): never adults in a juvenile's place. The phase searches abroad open when the Philippines leave a
  phase's room short as `obs_cost` counts it.
- The cap counts usable photos (added, in by the pre-sort, or waiting); what is rejected, excluded or sent elsewhere, or
  set aside for sure by the pre-sort, frees room.
- **Every photo of an observation**, with no limit per observation: an observation brings all its photos, also one
  already among the candidates at the next run (but one with a photo Pierre sent elsewhere), and its photos count
  against the cap by weight (`obs_cost`): its first usable photo 1, each further one `EXTRA_W` (0.5), so one observation
  of many photos takes less room than as many observations (one of 20 photos takes 10.5); a short room cuts an
  observation to what fits (`obs_fit`). Once judged, its near-duplicates free their room (`sure_out`): the judging pass
  marks an observation's near-duplicates (`keep` `dup`, `judging/FISH.md`), whose contact sheets never split an
  observation (`tools/judging_fish.py` `pack`) and show first, as context, a photo of it Pierre already added (`added`;
  then at most one new `best`, none needed).
- **`--topup`** (`topup`, run by every `--refill` first, over all the species of its circles, whatever their room): the
  observations fetched under the former limit of 4 photos per observation (`OLD_LIMIT`: exactly 4 candidate records,
  none sent elsewhere) are asked again by id, 200 a request, and bring their other photos; one with exactly 4 photos on
  iNaturalist is asked again at each refill (about 2-3 requests a run).
- One function for both tools: `species_room` (cap, phases, photos kept per phase, room per phase).

### Requests and the cache

iNaturalist API v2 with only the fields used, about one request a second (`tools/inat.py`). The general searches of the
species with at most 150 observations in a search (`species_counts` says) are asked together, `taxon_id=a,b,c`, read to
their end, and each species' share answers its own search exactly (`prefetch`, `Net.virtual`; a species with more keeps
its own search). Every reply is cached, trimmed, in `tools/.cache/fish_photos.json` (not in the repository): a rerun is
offline and identical; `--refresh` asks again, `--offline` never asks; `--plan` prints offline per species its cap,
phases, photos kept per phase, room per phase and what a run would add per source and phase (`"caps"`: species per cap;
`"cached": false` for a species whose replies are not in the cache); `--only s091,t05`; `--cap N` one fixed cap for a
test or a one-off. Hosting: ROADMAP "Hosting capacity (watch)".

### Photo taxon

A species whose photos are best taken from another iNaturalist taxon (the Pacific form iNaturalist splits off while the
IMR list keeps the older name) carries `photoTaxon` `{inat, name, note, src, why}`, written in `tools/fish_source.json`
and copied as is into `fish.json` by `tools/build_fish.py`.

- Every photo search goes through `fetch_fish.py` `photo_taxon(s)` (that taxon, else the species' own `inat`): the
  general and phase searches, the covers (`--rep`), the top-up, and `tools/fish_refs.py`'s reference photos.
- Everything else stays the species' own: its IMR `name` on screen (rule C1), its `inat` for presence (rule C8: the
  IMR-named species' evidence; both species are confirmed near Dauin by the IMR list either way), commonness and the
  sheet's iNaturalist link; the candidates are the species' (`fish-<id>-cand-…`), their `t` iNaturalist's name.
- The admin says it under the species' name on its family page and on its Candidates card (`admin.js` `fishPtx`: "Photos
  from *X* (iNat), Pacific form; IMR name kept"). Each one is also a C5 point for an IMR trainer (`points.json`).
- Now: s088 *Chromis agilis* from *Pycnochromis pacifica* (1313512), s244 *Halichoeres marginatus* from *Halichoeres
  annularis* (1474879).

### Automatic refill

When a fish unit runs short of candidates the tools fetch more on their own, until there are none left to find (rule
W20; `fetch_fish.py --refill`, tests `tests/fishphotos.test.js`). The "Candidate photos" workflow's `fish` job, after
each Publish (and on manual dispatch), after the coral `photos` job, commits `fish-cand.json` and
`tools/fish_refill.json`.

- **Short** (`shortness`): a species under its cap (the room of `species_room`: the cap net of what Pierre rejected,
  excluded or sent elsewhere and of the pre-sort's sure set-asides), or with fewer than `EASY_NEED` (3) observations
  holding a very easy photo (ease ≥ `EASY_E`, 4, the ease under which `model.js` `RARE` holds a unit's photos back
  before Open Water; 3 as `RARE.FEW`) in play or
  sure to come (Pierre's adds, the pre-sort's sure adds `sure_add`, the mirror of `fishSure`'s adds, the game photos of
  `fish-photos.json`). Only room is refilled: a species short of easy photos at its cap stays as it is (the cap holds;
  its waiting candidates need the pass or Pierre), listed as `at_cap` by `--refill --plan`.
- **Which**: at most `REFILL_MAX` (40) species a run (rule C7: a few requests each, the general searches batched, plus
  the batched phase searches), the shortest first (short of easy photos with nothing waiting for the judging pass, then
  the largest share of the cap missing, then teaching order).
- **How**: `run` with the rules above (Research Grade or Pierre's own, the licences, never captive or Dead, the
  Philippines first, abroad the Indo-West Pacific only and only for a species confirmed in the Philippines; observations
  already in its list, photos already used anywhere and excluded photo ids are never taken again, so never what Pierre
  rejected, excluded or marked Not this); each general search is asked afresh (no stale cache) and read on (`pages`,
  `id_below`, up to `GEN_PAGES` = 5 pages of 200) while it brings fewer usable photos than the room; then FishBase
  (`fetch_fishbase.py`, offline) fills what iNaturalist left and `--rep` tags the covers, for the refilled species only.
- **Exhaustion** (`exhausted`, `tools/fish_refill.json` `end` {species: {at: day, parts}}): a part of the room ("free",
  the general searches; `juvenile`, `male`, `female`, the phase searches) still open after the run whose searches were
  read to their end (`ends`), or which got nothing, is searched to the end that day; the species is skipped while every
  open part of its room is in a record less than `RECHECK_DAYS` (30) old (a part opened since, a juvenile room for
  instance, is searched); a species filled loses its record.
- **Judging**: nothing is judged in the workflow (the pass is visual): the new candidates wait in `fish-cand.json` for
  the judging pass (`python3 tools/judging_fish.py todo`; the full `tools/brief.py` prints how many wait), whose sure
  decisions the admin's fish auto-sort applies at the next load, then Pierre's Publish (rule A1).

## Candidates from FishBase (`tools/fetch_fishbase.py`)

FishBase is the reference platform for fish, its photos well linked to the species: a second source of candidates,
documented at the top of the tool (tests `tests/fishbase.test.js`), with the same rules and the same curation (a
FishBase photo enters as a candidate, judged on `judging/FISH.md`, and reaches a game only through Pierre's Publish;
`tests/fishbase.test.js` fails on a FishBase game photo he did not add).

- **Source: FishBase's own data, never its pages**: the table `picturesmain` of the rfishbase snapshot
  (huggingface.co/datasets/cboettig/fishbase, v25.04, CC BY-NC, the FishBase team's export for rfishbase and the
  FishBase API), its underwater photos of every game species kept in `tools/fishbase_src.json` (one species per line:
  file, FishBase name, author, licence field, main picture, coordinates, country, locality, life stage, holotype /
  paratype). FishBase's robots.txt allows every user agent but AI-training crawlers
  (`Content-Signal: search=yes, ai-train=no, use=reference`), fishbase.org sits behind a browser challenge, and no terms-of-use page was found; so
  nothing is scraped: the photos stay on FishBase's www.fishbase.se mirror (`src`, remote `r: 1`, never committed;
  www.fishbase.de answers a browser's image request 500) and are downloaded only when they enter the game.
- **Rules**: picture type "underwater photo" only (never "photo", mostly specimens, nor tank, aquarium or public-aquarium
  photos, nor drawings); licence: only what FishBase states as CC BY-NC 4.0 (its `Copyright` field "non-commercial
  use", "free use" or the public-domain flag, whose photo pages all show CC BY-NC 4.0: the stricter of field and page is
  taken; "permission required" and empty, all rights reserved, never), so every FishBase candidate is `lic: cc-by-nc`;
  the Indo-West Pacific box on the photo's coordinates, or, without them, a country wholly inside it (`IWP_COUNTRIES`),
  abroad only for a species confirmed in the Philippines; the identification is FishBase's own (taken as given, like
  Research Grade).
- **Order and amount**: the cap of `fetch_fish.py` (`species_room`; one FishBase photo = one observation), run after it
  so FishBase fills the room iNaturalist leaves: each phase's room first with the photos FishBase labels with it
  (juvenile, initial phase, terminal phase, male, female), then the free room (a phase's room left unfilled stays open);
  within each, FishBase's main picture first, then the nearest.
- Records as the iNaturalist ones (`f` `fish-<species>-cand-fb-<file stem>`, `o` the FishBase photo page, `t`
  FishBase's name, `st` from FishBase's life stage) plus `via: "fishbase"`.

## Reference photos

A photo a reference source uses to represent the species is easy to identify, so it comes early in the quiz for a
beginner, and suits the sheets.

- **The flag** (`rep`): `rep: "fishbase"` on FishBase's main picture of the species, `rep: "inaturalist"` on a candidate
  that is its taxon's iNaturalist cover (default photo; `fetch_fish.py --rep`, 30 taxa a request), on candidates and
  sheet-only photos. The judging adds the flag `r` to the photo's tags and one ease point (`tools/fish_judge.py` `cap`,
  `REP_BONUS`; the caps applied after it; `judging/FISH.md` "Reference photos"), so once in play it reaches the beginner
  path through its ease (`model.js` `photoDiff`, the card cover); `python3 tools/judging_fish.py rep` applies the flag
  again to the judged candidates of `suggest.json` after a new tag.
- **The units' reference photos**: covers and first photos must be reference photos, whoever took them.
  `tools/fish_refs.py` (iNaturalist v1 taxa, 30 a request; v2 observation searches with only the fields used: the 200
  most faved Research Grade observations in the `IWP` box, then the 200 most faved anywhere while a taxon photo is
  missing, then an id window around the missing photo's estimated observation id, `obs_of`, since iNaturalist has no
  search by photo; cached in `tools/.cache/fish_refs.json`) writes `tools/fish_refs.json`, kept by species: the photos
  iNaturalist shows for each game species (its cover and every taxon-page photo whose licence the rules accept, never
  ND), circle-1 genus and family (the first; a genus's or family's: of a game species of the entry) that pass the game
  photo rules on their observation (one outside the box is listed under `away` with its rough region, never taken),
  plus FishBase's photos of each species that pass its rules (its main picture first, up to 3).
- `tools/fish_game.py` `ref_play` puts each judged one into its entry's game photos (`rep: "inaturalist"` /
  `"fishbase"` on a source's reference photos, `from` `cover` / `taxon` / `fishbase`, `via: "fishbase"`); a FishBase
  photo shows a "FishBase ↗" source pill after the answer (`app.js` `photoSrc`). They stay in play even on an entry that
  plays on Pierre's curated photos alone (`core.js` `treePhotos`).
- **Reference level** (`core.js` `refLevel`: a `rep` photo judged 4-5, or any photo judged 5 with the reference look)
  comes first in `easyRank` (covers, each list's first photos) and, when never seen, weighs the subject's `calib.ref`
  (3 for the fish, `core.js` `SUBJECTS`) in the draw (`model.js` `photoSet`). Tested in `tests/fish.test.js` and
  `tests/subjects.test.js`.

## `fish-cand.json`

Admin only, like `cand.json`: players never download it, and it is not in the `sw.js` shell.
`{"v": 1, "cand": {species id: [photo]}}`, one species per line (the `tools/datajson.py` `dump` layout), species in `fish.json` order.
Photo records have the coral candidates' shape: `f` (`fish-<species id>-cand-<iNat photo id>`), `a`, `lic`, `o`, `t`
(iNaturalist's taxon name), `own`, `loc` (dauin / ph / world, world = abroad in the Indo-West Pacific), `src` (the
original, shown straight from iNaturalist in the admin), `r: 1`, plus `st` (iNaturalist Life Stage / Sex annotations:
juvenile, adult, female, male; FishBase's life stage, with initial and terminal for its phases; a hint for the phase,
and the phase of the photo for the cap until a judging tag says otherwise) and `ni`. Nothing is downloaded and no photo
is committed; the photos in play are downloaded (R2, the four sizes) when they enter the game.

## The fish curation

`curation.json` `fish`, written only by the admin and published by Pierre's Publish, merged key by key like the rest
(`merge3`); the coral keys are never touched (`tests/fishcuration.test.js`). The coral key names under one key:

- `add{f: species id}` (in play for that species), `seen{f: 1}` (rejected), `exclude{f: reason}`;
- `out{f: species id | 'x'}`: Not this, the photo is that species' candidate, or out of every species ("A photo is in
  play" below);
- `names{name: {family id: 'off' | 'on' | 'often'}}`: Pierre's exceptions to the name index (not that family's name,
  that family's, that family's and gently corrected; read by `core.js` `treeNameIndex`; no admin editor yet, ROADMAP
  "Fish common names");
- `tags{f: jt}`, `ease{f: 1-5}`, `phase{f}`, `crop{f: [l, t, r, b]}` (the `judging/FISH.md` rubric's fields);
- `kept{f: set}` (a judging re-judge's proposal he answered Keep mine, by its set: `q308`, the light re-judge, or `one`,
  one judgement per photo; admin Photo review › Light proposals) and
  `kept{node id: 'cover:<his photo id>><the rule's photo id>'}` (a cover proposal he answered Keep mine, the pair of photo ids, `core.js` `treePid`; admin Photo review ›
  Cover proposals), both left out of `curation-play.json`;
- `auto{day: {f: code}}`: the fish auto-sort's log (`a` proposed in, `r` set aside, `?` a Check, `-` undone, `@t` the
  time of Pierre's answer);
- `genera`: his covers and featured photos ([fish.md › Covers](fish.md#covers)); `content`: the content editor's edits
  ([content.md](content.md)).

**`out` is Pierre's "Not this" only** (the iNaturalist experts can be wrong, and he must be able to say so): written by
his click, never by an agent or the auto-sort; it wins over an add, and a photo he marked so is never proposed again
(`fishRun` skips every photo he decided; `fetch_fish.py` keeps it known, so never fetches it again). Publish writes
`fish` with its maps sorted and empty ones left out (`admin.js` `fishOut`) and counts its changes (photos in play, set
aside, not this species, fish auto-sort decisions). `fetch_fish.py` honours `add`, `seen`, `exclude`, `out` and the
top-level `exclude` (by iNaturalist photo id) for its room count.

## The pre-sort

`tools/judging_fish.py`, run on request: **one fish judging vocabulary**, the rubric of `judging/FISH.md`
("Candidates"), **visual criteria only**: the species is the iNaturalist identification by human experts, taken as
given, never judged by the pass.

- Per candidate: the rubric's code (view, whole, light, colour loss 0-3, clarity, size, count, the juvenile /
  camouflage / out-of-water flags, ease 1-5), `keep` (best / alt / dup within its observation), an optional IMR sex or
  colour `phase` and a proposed crop. The import applies the rubric's caps and phase flag (`tools/fish_judge.py` `cap`,
  `juv_early`) and writes `suggest.json` `fish` {`jt`, `e`, `k`, `ph`, `c`, `u`, `n`}, the same `jt` and `e` as the game
  photos, so a photo keeps its tags when it moves from the candidates to the game.
- **Sure decisions** (`autosort.js` `fishSure`, the fish `autoSure`; no `u`): best or alt → add with its tags, ease,
  phase and crop, whatever the ease; dup, the subject not obvious (count `x`), other species one could take for the
  subject (count `k`) or out of the water (flag `a`) → reject; the legacy count `m` (other species, not sorted yet) →
  Pierre's, never added. They go through the coral auto-sort's path (the draft, the `auto` log, 1-in-20 Checks with
  `autoCheck`, agreement per field), and the sure adds are **in play by themselves**, hosted on R2 like his own adds
  ("The photos in play" below). `fetch_fish.py` `sure_out` mirrors the rejects for its room count
  (`tests/fishphotos.test.js` checks they agree).
- The pass goes family by family, the starter families first (ROADMAP "Species photos: agent pre-proposals");
  `python3 tools/judging_fish.py todo` lists the species whose candidates are not judged yet.
- **One judgement per photo**: a photo that is both a reference photo and a candidate (one `pid`) is judged once, in
  the candidate's `judging/fish/<species>.json` (code, keep, phase, doubts); `tools/fish_game.py` `inputs` reads that
  judgement for its reference copy too (`tools/fish_judge.py` `one_judgement`), `python3 tools/judging_fish.py one`
  copies it into `tools/fish_judge.json`, and `one --check` (`tests/onejudgement.test.js`) fails on a divergence
  (`judging/FISH.md` "One judgement per photo").

## The fish auto-sort

`autosort.js` `fishRun`, `fishCompare`; admin `fishAutoRun`. At each load of the admin by someone who can publish, when
`suggest.json` `fish` has judged candidates (only then is `fish-cand.json` fetched), the sure judgments (`fishSure`) go
into the draft's `fish` part exactly as Pierre's clicks would write them, one Undo step, sent by his Publish.

- Adds fill each species up to its target (`FISHT`: 8 observations, 12 for the PDF cheatsheet's 24 species, `fish.json`
  `cs`; 5 for a species met only on the surprise cards, a wink family's, `FISHT.wink`: `fishSpecies` marks it `wink` in
  the admin's species records, never stored; ROADMAP "Surprise-only species"; at most 20), one observation counting once,
  the easiest first, then the most reference-like (`core.js` `refScore`), whoever took the photo; the rest wait as
  candidates. Rejects are `seen`. A tag, ease, phase or crop Pierre gave stays his.
- About 1 candidate in 20 (`autoCheck`) is logged as a Check, not applied (his answer comes on the fish Candidates
  page). Agreement on keep (`fishCompare`: answered Checks and corrections of applied decisions), through the coral
  `autoState` (90% over the last 40, after 10): off = nothing applied, Checks go on.
- **Undo one by one** (rule A1): the Auto details (Candidates) list the fish auto decisions (the latest 30, then All),
  each with Undo (`fishAutoUndo`, `autosort.js` `fishUndo`): what the run wrote leaves the draft, and only that: the add
  while it still names the candidate's species, and the fields its log code lists (`a` + `t` tags, `e` ease, `p` phase,
  `c` crop: a value Pierre gave before the run was never written, so never listed; any admin action that sets one of
  these fields later goes through `fishOwn`, which takes the field off the list). Nothing is compared with the pass's
  judgment, which a new judging pass may replace. The log marks the decision undone (`-`): never applied again, counted
  in no agreement. Emptied maps stay as `{}` in the draft, so the Publish merge removes these entries only, never what
  another device published in the same map.

## The Fish Candidates page

`#fish/photos/candidates`, `admin-fish.js` `renderFishCand`; the pure rules in `autosort.js` `fishQueue`, `fishPlay`,
`fishAdd`, `fishReject`, `fishExclude`, tested in `tests/fishcand.test.js`. The coral swiper's twin, one candidate a
screen.

- **One phone screen**: at 390 × 844 the photo, its species and the decision buttons without scrolling, the demo banner
  included. The swiper's height is the screen under where the page starts (`--sw-top`, measured in `admin.js` `start`
  under the header, the tab row and the demo banner), the toggles on one line (a long chip ends in …), the Auto line
  folded behind its chip (`autoChip`, open or closed remembered in this browser, `reefid-admin-autoline`), the photos in
  play in one row that swipes sideways; the coral swiper shares all but the tiles.
- **Queue**: every candidate Pierre has not decided (added, rejected, excluded, Not this; an auto decision he undid comes
  back), **the thinnest species first** (observations in play over the species' target, `fishTarget`; its photos
  together), within a species the pass's best photo of an observation, another angle, not judged, a near-duplicate,
  then the easiest, then a reference photo (flag `r`), whoever took the photo (his own photos are never forced).
- **Stops at target**: a candidate that would add an observation to a species at its target waits (the chip "N at
  target" shows them; another photo of an observation in play still comes); a Check never waits. The pass's sure
  rejects the fish auto-sort did not apply (its keep off) are set aside (chip "N set aside"); "N not judged yet" reminds
  of the pass.
- A segment **All | Checks**: the Checks alone, **blind** (no judgment line, no suggested Add, no suggested crop; a
  Check tag), answered with the same buttons, after which a toast gives the auto-sort's answer.
- **Card**: the photo (remote, iNaturalist or FishBase; Pierre's crop, else the pass's; "Photo not loading" when its
  host fails), the species (scientific name, common name, IMR entry), its source (FishBase named), the iNaturalist /
  FishBase life stage (`st`) and link; above the bar the pass's judgment (`suggest.json` `fish`: keep, the rubric's tags
  in words, only what makes a photo harder, its phase, unsure fields, note, crop suggested) with its ease as a chip (the
  difficulty prior); **In play n/target** with the species' photos in play (most of them the auto-sort's proposals) as
  small tiles, each enlarged with **Out of play** (Pierre's ✕ Reject on it: off the species; a correction when the
  auto-sort proposed it, so it counts in the agreement). The species' teaching entry comes from `fish.json` `teach`
  (`fishLoad` `entry`).
- **Buttons**: ✕ Reject (← key; `seen`), Skip (→; this tab only), + Add (1; dashed when the pass would add it): in
  play for the species with the pass's tags, ease, phase and crop written beside it where Pierre has none (as the
  auto-sort writes its adds, so every photo in play carries its tags and ease for the game), and the × on the photo
  (`exclude`, for good). Each click one Undo step in `DRAFT.fish`, sent by Publish; never a coral key.
- **Auto**: the fish auto-sort's line above the card (in, set aside, Checks to answer, keep agreement and whether it is
  on), folded behind the **Auto** chip at the end of the chips' row as the corals', and its Details below it
  (disagreements, every decision still standing with Undo, `fishAutoUndo`), here and not on the coral Candidates.
- **Rows** under the judgment (`autosort.js` `fishSet`, `fishTag`, `fishNotThis`, `fishState`, `treePhotoOn`, `fishPhase`):
  Ease (5 easy … 1 hard) always; Phase (`judging/FISH.md` words: none, subadult, intermediate, terminal, female, male)
  only for an entry whose phases differ (`fish.json` `teach` `phase` lines or `dimorph`); and behind **Tags** (folded,
  remembered in this browser, `reefid-admin-ftags`; unfolded, the swiper keeps its one screen: the photo gives up room
  down to about a quarter of it and the tag rows scroll inside their own panel, Ease, the other rows and the decision
  buttons in view) the seven rubric tags and the Juvenile and Camouflage flags (the tool's `p` and `r` kept as they
  were). Pierre's value is pressed, the pass's dashed until he confirms or changes it (never shown on a Check); each
  click writes `tags` (the whole code with that tag changed), `ease` or `phase` (`''` = none, over the pass's) through
  `fishOwn`, so an Undo of the auto decision leaves his value; the card he is setting stays on screen until he decides,
  skips or moves it.
- **Crop**: the coral crop editor (`cropEditor(p, {start, save})`) on `fish.crop` (Full photo over a suggested crop kept
  as `[0, 0, 1, 1]`).
- **Not this** (Pierre's click only, never an agent's): a select with the other species of the entry first, then every
  game species (`fishLoad` `game`: a circle, not out), and No game species; `out {f: species id}` makes the photo that
  species' candidate (its add and rejection go with it; the card says "from" its first species, which it can go back
  to), `out {f: 'x'}` takes it out of every species.
- **A photo is in play** for a species when `add` names it, it is neither rejected nor excluded, and its `out`, if any,
  names that same species (`treePhotoOn`: the convention the game reads; the fish auto-sort counts its target with it too);
  `fishMine` stays the keep on its first species, so a Not this on an auto add counts as a correction in the agreement,
  and the auto-sort never proposes the photo again.
- **Missing phases first**: a candidate whose phase (`fishPhase`, as `tools/fetch_fish.py` `photo_phase`: Pierre's
  phase and tags when set, else the pass's phase tag, its juvenile flag, else the source's life stage or sex) none of
  its species' photos in play shows comes first in its species, tagged "new"; the copy of the pass's tags and phase that
  Add and the fish auto-sort write beside an add carries the source's phase when the pass gives none (`autosort.js`
  `fishCopy`: the `j` flag for a juvenile, else the phase word), so a juvenile by its source still counts as one once in
  play.

## The photos in play (`fish-game.json`, `tools/fish_game.py`)

Every fish photo in play is hosted on R2, whatever its route in; Pierre's curation only removes or corrects.

### What is in play

- **Pierre's adds**, and **in play by themselves** (`tools/fish_game.py` `in_play` adds them to his adds):
  1. every candidate judged sure (`cand_sure`: `autosort.js` `fishSure`'s add, i.e. no `unsure`, keep `best` or `alt`,
     on a sure judgement, `judged_sure`: valid tags, any ease 1-5, never count `x` nor flag `a`, and a count an
     automatic route may put in play, `core.js` `TREE_COUNT.play`: one fish `1`, several of its kind `s`, or other
     species in view with no risk of confusion `o`; never `k`, other species one could take for the subject, nor the
     legacy `m` until sorted: rule P3) that he has not decided on (added, rejected, excluded, moved), with its judged
     tags, ease and phase, the pass's proposed crop applied as the auto-sort would write it into his draft;
  2. the units' reference photos (`tools/fish_refs.json`) judged sure on the same rubric as a candidate, whatever their
     reference level: `tools/fish_judge.json` codes through `tools/fish_judge.py` `cap`, then `judged_sure` (a reference
     photo has no keep or unsure field: the reference-photo batches only write codes; other species one could take for
     the subject, an unclear subject or a fish out of the water stay out), unless the same photo is already in play
     (always out). One on an observation already in play (another photo of it) enters once judged against that
     observation's photos, like a candidate (`tools/fish_judge.json` `keep` {photo: best | alt | dup}: best or alt in,
     dup or not judged against them yet out; the game draws one observation a question, rule P4, so its photos share
     one draw). The reference level still orders them (`core.js` `refLevel`, `easyRank`, the draw's `calib.ref`); never
     the same photo twice (`pid`).

  Both are listed with `auto` (`cand` / `ref`; a reference photo keeps `from`), downloaded, cropped and written in the
  four sizes like his adds, and uploaded to R2 by the same workflow, which also runs on a change to
  `tools/fish_game.py`, so such a change is downloaded and uploaded at its merge.
- **Other species in view**: a photo whose count in force is other species one could take for the subject (`k`), or the
  legacy `m` not sorted yet, is never in play, his adds included. The count in force is his tag, his legacy `m` refined
  by the judging pass's `o` or `k` (`core.js` `treeCount`, `treeOther`; `tools/fish_game.py` `count_of`, `other_out`,
  `refined`, which writes the sorted count into the game record's `jt`); `core.js` `treePhotoIn` and `treePhotos` (the first
  photos too) read the same (his tag at once in the admin; the players' curation has no tags, `tools/curplay.py`, so
  the app reads the game record's `jt`), and the admin lists his adds so held out apart (Photos › Tree, "Other species,
  out of play", with Keep in play: count `o`).
- **In play** (`core.js` `treePhotoOn`; `fish_game.py` `fish_on` its copy, `tests/fishgame.test.js` checks they agree):
  `curation.json` `fish.add` names the species, the photo is neither rejected (`seen`) nor excluded, and its Not this
  (`out`), if set, names the same species; the top-level `exclude` (by name or photo id) too.
- **In play at play time** (`core.js` `treePhotoIn`, used by `treePhotos`; `fish_game.py` `fish_in` its copy,
  `tests/fishgame.test.js` checks they agree): his add (`treePhotoOn`), or an `auto` photo whose photo id (`treePid`) he did
  not reject, exclude or move with Not this (`treeGone`).
- **The species met only on the surprise cards keep 5 photos** (`wink_trim`, `WINK_KEEP`, `autosort.js` `FISHT.wink`):
  of their photos in play, his covers (at any rank), featured photos and own adds (not the auto-sort's) and the surprise
  card's photos (`fish.json` `wink.photos`, which `quiz.js` `winkPhoto` draws from) always, then the best in `core.js`
  `easyRank`'s order, a new observation first; the rest leaves `fish-game.json`. The candidate tools stop at 5 for them
  too (`tools/fetch_fish.py` `WINK_CAP`).

### Download and the runs

- **Download** (the Candidate photos workflow, `tools/fetch_approved.py --fish` after each Publish): each photo in play is
  fetched from its original in `fish-cand.json` (`src`: iNaturalist's photo hosts or FishBase's, `www.fishbase.se` and
  `www.fishbase.de`, only; FishBase is asked up to 4 times, 5 s, 10 s, 15 s apart, as it answers 500 at times, and after
  the others, one at a time), Pierre's crop applied (`fish.crop`; `[0, 0, 1, 1]` = none), saved in the four sizes by
  `tools/photos.py` `save()` into `r2-upload/`, never `img/` (it has an online original: R2 only), uploaded by
  `tools/r2_sync.sh r2-upload` before the commit, so `fish-game.json` never names a photo R2 lacks. A photo already
  downloaded is kept, downloaded again when its crop changes (`cr`, `iv` bumped, `app.js` `ver`); one that fails is left
  out until the next run; one no longer in play leaves the list (its files stay on R2, unused).
- **Batches**: at most `MAX` (5,000; `FISH_MAX`, `--max`) downloads a run, the reference photos first, then the starter
  entries' photos, circle 1's, the rest; what is left comes at the next run, and the game lists only photos already on
  R2 (the original stays the fallback, `core.js` `photoAway`). FishBase's mirror `www.fishbase.se` is an allowed host.
- `python3 tools/fish_game.py --plan` prints, offline, what a run would download (the sheet-only photos too), the
  expected R2 volume and the entries short of 5 very easy photos. The same run writes `fish-photos.json` from the new
  list (its first photos and the sheet-only photos, below); `--rewrite` writes both again, nothing downloaded.

### The record and the layout

- **Record**: `{f, o, src, a, lic, t, sp, loc, own, ar, e, jt, ph, cr, iv, via, rep}`, with no `r`, so `app.js`
  `img()` reads it from R2: `f` the candidate's name (`fish-<species>-cand-<id>` or `-cand-fb-<stem>`); `o` its
  observation, or the FishBase photo page; `src` the original (`core.js` `photoAway`'s fallback when R2 fails); `sp` the
  species it is in play for (after a Not this its new one), `t` then its `fish.json` name (WoRMS's, else the PDF's),
  never the identification Pierre corrected; `e` the ease (`fish.ease`, else `suggest.json` fish `e`); `jt` the tags
  (`fish.tags`, else the pass's); `ph` its phase (as `autosort.js` `fishPhase`).
- **Layout**: by teaching entry (the level-1 entry whose `species` holds the species), entries in `fish.json` order, an
  entry's photos by its species order, the easiest, then by name (never Pierre's own by priority; the app orders them
  with `core.js` `easyRank`); one photo per line, and an unchanged run writes the same bytes.
- **The file's short form**: a record's `o`, an iNaturalist observation, is written as its id alone, and its `src`, the
  original on iNaturalist's open-data bucket, as its extension alone when the photo is the record's own (the id in its
  name); FishBase and any other address stay whole (`tools/fish_short.py`, written by `tools/fish_game.py` `dumps`;
  `--rewrite` writes the file again in it, after a merge that took another copy). It saves about a third of the file
  (503 → 426 KB gzipped). Every reader gives the records back whole first: `core.js` `treeGameRead` (the app's
  `fishLoad`, the admin, the sheet's fish photo pools, `tools/ratedworld.js`, the tests and `tests/photostub.js`),
  `fish_short.full_doc` (`tools/fish_game.py` `load`, `tools/photos.py` `records`); a file in the whole form is read as
  it is (`tests/fishshort.test.js`). A page of an older version meeting the short file (a page left open across the
  deploy, whose own `?v=` request reaches the server when its worker has no copy) keeps every photo (its `src` is still
  set, and R2 serves it), but its fallback to the original and its observation link are broken until it updates (rule
  W3); an older sheet script reads the same photo pools (an observation's id groups its photos as its address did).

### In the game

`core.js` `treePhotos(first, game, cur)` is what `treeGen` takes (the app's `treeBuild` passes `CUR`): an entry plays on
its photos in play alone, however few of them are very easy; `first`, `fish-photos.json`'s first photos, only while
`game` is empty (before `fish-game.json` is in, or when it cannot come), filtered the same way. Pierre's curation
applies at once, before the workflow runs again: a curated photo shows only while in play (an Out of play, a Not this, a
Reject takes it out at the app's next curation read). With no curation loaded, the lists as they are. The admin's To do
indexes both lists (`admin.js` `fishAdmin`; the first photos are records of the game list). A FishBase game photo shows
its source pill after the answer (`app.js` `photoSrc`: author · FishBase ↗).

Tests: `tests/fishgame.test.js` (the pipeline on a fixture with a stub host: only photos in play, four files, the crop,
FishBase retried, the same bytes on a rerun, a recrop, an Out of play; `treePhotos`), `tests/photos.test.js` (rejected,
excluded and Not this photos never in the game), `tests/fishbase.test.js` (no FishBase game photo Pierre did not add),
`tests/fish.test.js` (codes and the rubric's caps where the ease is the pass's; 5 very easy photos per circle-1 entry in
the game).

## First photos (`fish-photos.json` "photos")

The app shows no fish photo straight from iNaturalist or FishBase (`r: 1`, `app.js` `img()`): the stopgap list of
remote photos is retired. `fish-photos.json` "photos" now holds the **first photos** (`tools/fish_game.py`
`first_photos`, `FIRST` 8 per entry, or one per family of the entry if more): the adults, Pierre's covers, a
watermarked photo (judged flag `w`) after the adults without one when one of its units (its genus or its family) has
one (the default cover, `app.js` `seenCover`, reads these photos until `fish-game.json` is in; his watermarked covers
stay first, rule A1), then `core.js` `easyRank`'s order: the reference-level photos (`refLevel`), the easiest. They are
written by the same run as `fish-game.json`, so they are the same records, already on R2, and read by `core.js`
`treePhotos` only while `fish-game.json` is not in (Home before it, or when it cannot come; a small file against the
full list).

- The 5-very-easy minimum is Pierre's for circle 1 (`tools/fish_judge.py` `WANT`): every circle-1 entry meets it on R2;
  the entries of circle 3 below it (`python3 tools/fish_game.py --plan` lists them) play on their curated photos alone.
- `tools/fish_photos.py` writes the sheet-only photos only (below). Pierre's own photos reach play as candidates
  (`tools/fetch_fish.py` `select` takes his observations first, within the species' room): this route applies rule P1.
- `tests/subjects.test.js` checks that `fish-photos.json` holds no remote photo (but a sheet-only photo just found,
  waiting for the next run) and that its first photos are `fish-game.json`'s records; `tests/fish.smoke.js`
  (`coldHome`) that a cold first launch on fish, `fish-game.json` held back, draws Home from them and asks nothing of
  iNaturalist or FishBase.
- `judging/FISH.md` is the rubric `tools/fish_judge.py` judges every fish photo on.

## Sheet-only photos (`fish-photos.json` `sheet`)

No exception to the rules for the game: a circle-1 species with no game photo nor candidate may keep a photo for its
sheet. `{species id: [photo]}` for the species of `tools/fish_photos.py` `SHEET` (`fish.json` ids; add one there),
written by `python3 tools/fish_photos.py` (the first photos kept as they are).

- **On R2**: a photo found is written remote (`r: 1`); the Candidate photos workflow downloads it in the four sizes and
  uploads it like a game photo (`tools/fish_game.py` `run`, `sheet_of`; the workflow also runs on a change to
  `fish-photos.json`), then lists it without `r`, its `src` kept as the fallback when R2 fails (`core.js` `photoAway`)
  and its credit, licence and links unchanged. A rerun of `tools/fish_photos.py` keeps a photo already downloaded
  (`keep_done`); a species with a photo in play loses its sheet-only photo at that run.
- **A sheet photo passes every game photo rule** (`sheet_ok`): licence CC0, CC BY or CC BY-NC (Pierre's own: any),
  Research Grade or Pierre's own identified to the species, taken in the Indo-West Pacific box of
  `tools/fetch_fish.py` (the Philippines inside it), never captive, never annotated Dead, checked on the observation that
  holds the photo.
- **Order**: the species' iNaturalist **cover** (the taxon's default photo), the taxon's other photos, then its
  observations in iNaturalist's order (Pierre's own with no priority), then **FishBase** (`tools/fetch_fishbase.py`, the
  same rules as its candidates), its main picture first; none, and the species stays without a photo (its sheet shows a
  generic fish drawing: ROADMAP "Fish sheets at three levels"). In practice it serves a species iNaturalist files under
  another one, so the candidate search (by the species' own observations) finds nothing. Two batched requests for all of
  them (the taxa, then their observations in the box).
- **Records** as the game photos' (`f`, `o`, `src` the original, `r: 1` until downloaded, `a`, `lic`, `t`, `sp`, `loc`,
  `ar`, `own`) plus **`use: 'ref'`** (sheet only, the corals' curation word), `from` (`cover` / `taxon` / `obs` /
  `fishbase`), `via: 'fishbase'` for a FishBase photo (`o` its FishBase photo page, `src` its image on www.fishbase.se,
  the credit "(c) author, via FishBase, some rights reserved (CC BY-NC 4.0)"), `rep` (the iNaturalist cover, FishBase's
  main picture) and `note` when iNaturalist files it under another species of `fish.json` (Pomacentrus armillatus:
  "Filed under Pomacentrus opisthostigma on iNaturalist, which lumps the two species (as WoRMS does)."; the name shown
  stays the PDF's, rule S2).
- **Never in a game**: `core.js` `treeGen` keeps every `use: 'ref'` photo out of an entry's `views.wide` wherever it is
  listed (so out of `model.js` `photoSet`, the cover, `app.js` `treeGenera`'s genus units and the winks: a unit with no
  game photo is never asked) and returns them by species as `sheet` (`app.js` `TREEU.sheet`), which the species sheets
  show among the species' photos (`learn.js` `treeSpPhotos`; the family hero falls back on them only when the species
  has no photo in play, `nodeCover`).
- Tests: `tests/subjects.test.js` (never a game photo nor a cover, licences, credit, the lumping note),
  `tests/fishphotos.test.js` (the rules and the order), `tests/fish.smoke.js` (never drawn in the real app).
- Other photo sources for a species still without one are Pierre's decision; *Chromis agilis* and *Halichoeres
  marginatus* take their candidates from their Pacific taxa ("Photo taxon" above).

## The tiles

For "Find the X" and Matrix: a photo in play whose tags pass the tile rule and that has the fish's box (the judging
pass's `bb`: `tools/fish_judge.json` `boxes`, a candidate's `suggest.json` `bb`) gets a fifth file on R2,
`img/<f>-x.webp`, a 360 px square cut around the fish (`tools/fish_game.py` `tile_crop`, `tile_write`), kept when the
fish fills 70% of it and its box is 320 px wide in the original; `fish-game.json` carries `bb` and `xc` (the square) or
`xn` (why none). `tools/photos.py --r2-tiles` lists them and `tools/r2_sync.sh` checks the bucket has each. Rubric and
thresholds: `judging/FISH.md` "The fish's box". Find the X reads them: `app.js` `UNITS` `tiles(n)` (a unit's game
photos with `xc`; none for the corals, so they never play it) and `tileSrc(p)` (the tile's address, `?x=` its square;
its 480 px photo once R2 has failed, a tile having no online original), `quiz.js` `planFind` (the question), `question`
(the four tiles as the choices, `.qstage.qfx`, `app.css` `.fxt`).

## Photos kept for the exam

No file holds fish photos out of play: each player's own reserve takes a few observations of a unit out of that player's
practice for their mastery exam, the same for every subject ([model.md › The exam's reserve](model.md#the-exams-reserve)).
