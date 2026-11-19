# Fish photos: a full-size look when the judge doubts; the juvenile re-rate's tag doubts settled

Date: 2026-11-19. PR: #1269. Rules or docs touched: judging/FISH.md "How to look" and the `a` flag;
docs/spec/fish-photos.md (the `a` flag); `judging/fish-watermark.json`; `judging/fish-tag-doubts.json` (the log).

## Context

The juvenile re-rate (#1254) looked again at its 656 photos at 4 or 5, each alone at 960 px. On 351 of them its notes
named a tag the kept code lacks; those codes still held the tags read on contact sheets. The doubts it listed were
softness 197, dim light 68, an oblique or top view 65, a watermark 50, a cut or hidden fish 46, colour loss 27, the
count 19, a small fish 16, an aquarium, screen or print 8, and camouflage 5. The list was built from free notes, so
some entries were not real doubts.

## Decision

- Pierre, 2026-11-19 20:57: «fais attention aux photos, que les photos vues en petite résolution, on peut passer à côté
  de problèmes, ou de qualité d'ailleurs, et donc effectivement, quand on a le doute, il ne faut pas hésiter à les voir
  en plus haute résolution.»
- The 351 photos were judged again on the whole code: every tag, the flags and the ease. Integrator's call, under the
  decided judging process.
- An aquarium, a screen or a print takes `a` and leaves play. Integrator's call: the candidates' fetch already refuses
  captive observations, and the gold set put screens under `a`.

## How

- **The looking**:
  - Each photo was seen alone at the largest size on R2: the 1,600 px file, or the original where it was smaller (43
    under 960 px).
  - The photos were blind (a number only) and shuffled. The 8 with an `a` doubt came first.
  - Faint text was checked in enlarged, contrast-raised bands.
- **The juvenile flag `j`** stays as kept. It cannot be judged blind to the species, and the observer's recorded life
  stage decides it.
- **Applied**: the codes were written into each photo's single judgement (`judging/fish/<species>.json`, else
  `tools/fish_judge.json`; `judging/seaslug/` for the 4 sea slugs). Then `judging_fish.py watermark`, `codes`, `rep`
  and `one` ran, plus `--subject seaslug codes`, and `seaslug-game.json` was rebuilt. `one --check` and
  `watermark --check` both show 0. `fish-game.json` takes only the `w` flag on the 56 newly tagged records, as a
  watermark pass does; the rest waits for the photos workflow.

## Results

- **Doubts** (501 rows, a photo once per tag): 255 confirmed and 246 rejected.

  | Doubt | Confirmed | Rejected |
  | --- | --- | --- |
  | Clarity | 147 | 50 |
  | Light | 10 | 58 |
  | View | 16 | 49 |
  | Watermark | 50 | 0 |
  | Whole | 8 | 38 |
  | Colour loss | 4 | 23 |
  | Count | 12 | 7 |
  | Size | 0 | 16 |
  | Aquarium, screen or print | 7 | 1 |
  | Camouflage | 1 | 4 |

- **Tags**: 277 of the 351 photos changed at least one tag.
  - Clarity: `s`→`m` 148; `s`→`b` 28 and `m`→`b` 2, which cap the ease at 2.
  - Size: `m`→`l` 115. None of these photos has a crop on R2, so this is a difference between judges, not
    resolution.
  - Colour loss: 1→0 57, 0→1 22.
  - View: `o`→`p` 47, `p`→`o` 20. The `p` wording changed at 16:28 that day (#1218); the kept tags are older.
  - Light: `g`→`d` 13.
  - Count: `1`→`o` 12.
  - Flags added: `w` 57 (7 of them beyond the listed doubts), `a` 8, the sea slugs' `f` 2, `c` 1.
- **Leave play**: 8 photos, all `a`.
  - 3 are plain: an aquarium twice and a photo of a screen.
  - 5 are likely aquariums, kept `unsure` with a note for Pierre.
  - None came into play. In the build's plan, 339 of the 347 fish photos stay in play.
- **Watermarks**: the 56 fish photos newly flagged are listed in `judging/fish-watermark.json` with what was seen.
  Home skips them.
- **Rule A1**: 24 of these photos have their tags or ease in `curation.json` (the auto-sort's copies), and those values
  win. None of the 8 photos that leave play is among them.

## The shift (a measure, no further pass run)

- **Ease after the caps, mean**:
  - Contact sheets: 4.07.
  - The re-rate's 960 px look: 3.17.
  - Full size: 3.51.
- **Full size against the sheets**: 159 photos the same, 144 one lower, 33 two lower, 15 one higher.
  - 184 photos are at 4-5 now, against 333 on the sheets.
- **Full size against 960 px**: 186 the same, 129 one higher, 9 two higher, 27 one lower.
  - The 960 px look could only lower an ease, so the +0.34 gap is one-sided: it is not a noise floor.
  - The re-rate's blind repeat on the sheets agreed exactly on 76%.
- **What it can conclude**:
  - The sample is biased: juveniles the sheets put at 4-5, which the 960 px look then doubted.
  - The sheets missed, at least, out of the 656 photos they put at 4-5:
    - softness on 150 (23%);
    - blur strong enough to cap the ease on 30 (5%);
    - 57 watermarks (9%);
    - 8 photos that should not be in play (1%).
  - Part of the tag changes is not resolution:
    - the `o`→`p` and part of the `b` calls follow the rubric of 16:28 (#1218);
    - `m`→`l` is a difference between judges.
  - This does not measure the photos in play at large. A full-size pass of all of them would need a random sample
    first.
