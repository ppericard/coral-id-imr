# The fish phase flag comes from the cited phase list too, and the phase card names the list's sources

Date: 2026-11-21. PR: #1395. Rules or docs touched: judging/FISH.md "Tags", "The phase flag caps nothing"; docs/FISH_PATH.md
"Juveniles and colour phases"; tools/fish_phases.json `_doc`

## Context

The phase flag `p` marks every photo of a species whose sexes or colour phases look different. Until now the tool added
it only to the entries marked `dimorph` in `tools/fish_source.json`, where the IMR presentation's phase lines say so:
the Parrotfishes and the Anthias, 30 species. The flag decides one thing in the game: a photo judged male, female or
in a colour phase brings the sex or colour phase card ("Careful: this species' males and females can look very
different") only when it carries the flag (`core.js` `phaseKind`).

The cited phase list `tools/fish_phases.json` (#1342) records, for each species in play, whether a solid source
documents its sex or colour phases. It was read by no tool.

## Decision

- **The flag comes from either source.** A species' photos carry `p` when its entry is marked `dimorph`, or when the
  list's `sex` or `ip_tp` verdict is `yes` (`tools/fish_judge.py` `phase_flag`). Pierre, 2026-11-04 (the "Fish photo
  judging, next" row): species-level sex and colour-phase flags from a cited source, with explanation cards for
  juveniles and phases. Pierre, 2026-11-20 19:28: «la parole d'IMR, c'est pas la vérité absolue. C'est une source
  solide parmi d'autres sources solides».
  - A sub-adult alone (`sub` yes, no sex or initial and terminal phases) adds no flag. Such a photo keeps the juvenile
    card's "Sub-adult" (`quiz.js` `juvCard`).
  - A `conflict` adds no flag. It stays a point for Pierre (rule C5).
  - The two IMR `dimorph` species the list does not flag (*Calotomus spinidens*, *Pseudanthias cheirospilos*: both
    `unknown`, no source found) keep the flag from IMR.
- **The tool adds it everywhere the photo's tags are built.**
  - The judged candidates (`tools/judging_fish.py` `entry`; `data/suggest.json` re-applied with `judging_fish.py rep`:
    4,221 tags gained `p`, nothing else changed).
  - The reference photos (`tools/fish_game.py` `ref_play`).
  - Pierre's own tags at the build (`tools/fish_game.py` `phased`). The flag is the tool's, never typed, so a photo he
    tagged before the list flagged its species gets it too. Nothing in `curation.json` changes (rule A1).
- **The card names its source** (rule C2). `tools/build_fish.py` `phase_sources` writes the list's sources into
  `fish.json` species `phs` {k, src}.
  - The card shows them under the photos ("Source: Reef Life Survey").
  - It keeps the IMR lines on sexes or phases. An IMR family line on juveniles (the Angelfishes) is not shown on a sex
    card.
  - A species whose list verdict is the initial and terminal phases only (`k` `phase`: six wrasses) gets the title
    "this species' colour phases can look very different" (integrator's call, easy to correct).

Integrator's call, easy to correct: the card's source line and its wording; the `phs` field's format.

**Counts on the build of 2026-11-21** (`fish-game.json`):
- 97 species flagged by the list (89 sex, 8 initial and terminal phases only); 69 of them were not flagged before.
- 3,176 photos in play gain `p`; 543 of them (54 species) are judged or annotated male or female, so they can now
  bring the card.
- The card shows once per subject and player (`quiz.js` `phaseSeen`), so a player who has seen it sees nothing new.

## The photos re-judged for phases, measured first

The judging process and rubric are agreed (judging/FISH.md, `phase`); the judge is Opus 5.5 high. Only the reading
configuration was measured (docs/INTEGRATOR.md "A large judging or boxing pass is measured first").

- **Bench**: the 99 adult photos in play of flagged species on which Pierre set a phase in the admin (his phase is the
  gold), read blind (the sheets name the species and the list's quotes, never his phase, the observer's annotation or
  the photo's current phase). Threshold written before: precision 95% or more, coverage 70% or more.
  - 30 tiles of 260 px per sheet (the cheapest): precision 95.9% (70 of 73 tags), coverage 70.7%.
  - 12 tiles of 480 px (the usual fish sheet): precision 98.8% (79 of 80), coverage 79.8%. Read second, after the
    first reading's error list had been seen, so it is an upper bound.
  - The three errors of the cheap reading are subtle phases: two plain red *Paracheilinus carpenteri* Pierre calls
    male, one brownish *Halichoeres argus*.
  - The cheapest configuration passes, so it does the bulk.
- **The judge's rule**: a phase only where the species' quote lets the photo be read. Otherwise no tag, never `unsure`,
  which would take a photo in play out of the game.
  - No tag for species whose quote names no colour (*Genicanthus lamarck*: "different colors in mature adults only";
    *Amphiprion frenatus*), or whose differences do not tell one photo (*Epibulus brevis*).
  - No tag where the difference is too fine for a tile (*Parapercis clathrata*'s gill spot), or a matter of degree
    (*Thalassoma lunare*, "similar but more blue"; *T. hardwicke*, "similar with growth").
  - No tag on a *Rhinomuraena quaesita* with a yellow head on a blue body: between male and female, and its
    transitional stage is a point for Pierre (`data/points.json`, rule C5).
  - The species left untagged and why: `judging/fish-phase-rejudge.json` `untagged`.
  - Where both the sex and the initial and terminal phases are sourced, female and male; but for *Halichoeres
    hortulanus* the chequered initial phase is tagged `intermediate`. The observers call 7 of these photos male, and
    the initial phase covers both sexes.
- **Batch 1** (2026-11-21): the newly flagged species with the most photos first. Of the first 900 photos of the bulk
  list (30 sheets), 690 were read (23 sheets); 7 sheets (210 photos) were left unopened because their species get no tag
  from a tile (above), 18 of them photos of *Stethojulis strigiventer* and *Oxycheilinus bimaculatus*, still to read.
  - 314 phases written in 16 judging files (female 127, male 155, intermediate 24, terminal 8), then
    `judging_fish.py codes` (only `ph` changed in `data/suggest.json`) and `one`.
  - Every photo read, with its tag or none: `judging/fish-phase-rejudge.json`, so the next batch starts where this
    one stopped.
  - Drift: 5% of the tags (16 photos) re-read on 480 px tiles by the same reader soon after, all 16 the same (weak
    evidence).
  - Against the observers' iNaturalist sex annotations where they name one: 143 of 145 sex tags agree. 9 more are
    initial-phase tags where the observer wrote male.
  - Every unit these species belong to (species, genus, family) already had a sex or colour phase photo in play, from
    the observers' annotations. So no unit gains a new variant group, and no "Learned" mark can be taken by this batch.
- **Left**: about 2,600 photos of the bulk list (the other newly flagged species, then the IMR dimorph entries'
  photos with no phase judged), the 18 above included.
  - At 30 per sheet, about 90 sheet reads and 5% drift.
  - The 384 reference photos with no candidate copy have no phase field in `tools/fish_judge.json`, so a judged phase
    cannot be written for them yet.

## Consequences

- The draw, the ease and "Learned" do not read the flag. They read the photo's phase (`core.js` `varKindOf`), which
  this change leaves as it is. The re-judge adds phases; check each batch's units for a new variant group first.
- The rest of the re-judge goes on in batches as above (REE-52).
- `core.js` `phaseKind`'s comment and `Code.gs`'s copy still name only the dimorph entries. `core.js` was held by
  another PR; the comment is corrected with its next change.
- The admin's Phase row still shows only for an entry with IMR phase lines or `dimorph` (`admin-fish.js`, `admin.js`
  Photo review).
