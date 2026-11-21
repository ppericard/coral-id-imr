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
- 3,176 photos in play gain `p`; 543 of them (54 species) are judged male or female, so they can now bring the card.
- The card shows once per subject and player (`quiz.js` `phaseSeen`), so a player who has seen it sees nothing new.

## Consequences

- The draw, the ease and "Learned" do not read the flag. They read the photo's phase (`core.js` `varKindOf`), which
  this change leaves as it is.
- The fish photos' re-judge for phases on the list is the next step (REE-52, measured first).
- `core.js` `phaseKind`'s comment and `Code.gs`'s copy still name only the dimorph entries. `core.js` was held by
  another PR; the comment is corrected with its next change.
- The admin's Phase row still shows only for an entry with IMR phase lines or `dimorph` (`admin-fish.js`, `admin.js`
  Photo review).
