# A fish photo with a look-alike near its edge plays once a crop takes it out

Date: 2026-11-19. PR: #1223. Rules or docs touched: P3 (unchanged); judging/FISH.md "A proposed crop"; judging/SEASLUG.md
"Candidates"; spec/fish-photos.md "The photos in play"; ROADMAP "Fish photo judging, next".

## Context

In the gold set Pierre reviewed (2026-11-19, photos 10 and 23), a photo would be a good game photo once cropped: another
fish one could take for the subject sits at its edge, so the judge coded it `k` (other species one could take for the
subject) and rule P3 kept it out. Q430 asked whether the judge should only propose the crop and the photo wait for his
tap (A), or the photo enter play by itself, cropped, when the other fish leaves the frame entirely and the subject stays
whole and at least medium-sized (B).

## Decision

Pierre, 2026-11-19 14:42 Manila (Q430): B. «J'ai toujours dit de mettre en jeu les suggestions, surtout si elles peuvent
être corrigées à postériori, ce qui est le cas ici.»

- **No new field.** A sure judgement already entered play with its proposed crop (the candidate route since Q180, the
  reference route's `tools/fish_judge.json` `crops`), and the auto-sort already wrote that crop into Pierre's draft,
  which he undoes or redraws in the admin's crop editor (Full photo included). Only the count `k` kept such a photo out.
- **A code with a crop reads the photo as cropped**, so the judge codes the photo players will see. When a crop takes
  every fish one could take for the subject wholly out of the frame, the subject whole and at least medium in it, the
  judge proposes it and codes the cropped photo (`1`, `s` or `o`); at the least doubt, `unsure: ["crop"]`, and the photo
  waits for Pierre. A code still `k` stays out, crop or not: rule P3 holds as written.
- **The crop goes with the code**: a reference photo that is also a candidate takes its candidate judgement's crop when
  that gives one (`tools/fish_judge.py` `one_crops`), so it never enters by the reference route uncropped.
- **A crop keeps the whole fish**: where the judge also gives the fish's box, `tools/judging_fish.py --check` refuses a
  crop that cuts it (`tools/fish_game.py` `box_in`).
- **The integrator's calls**, each easy to correct: "at least medium" is read on the cropped photo (the photo players
  see); the fish only (the sea slugs' rubric keeps its crops as they were); earlier codes stand.

## Consequences

- No photo changes today: `tools/fish_game.py --plan` lists nothing to download. The 843 candidates coded `k` wait for
  a later judging pass, never a bulk re-judge from this PR.
- When Pierre picks Full photo on such a photo, the other fish comes back while the code still reads one fish: its count
  is then his to set (Tags), as any tag.
- The gold-set scorer compares codes: a judge's code read on a crop differs from one read on the whole photo.
