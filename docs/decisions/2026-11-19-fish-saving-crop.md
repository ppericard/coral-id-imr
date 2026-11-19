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

- No photo changed with #1223. Of the 846 candidates coded `k`, 87 were undecided, 694 set aside by the auto-sort
  (`seen`) and 65 are his adds held out (rule P3).
- **The re-judge of 2026-11-19** (the `k` pass): the 87 undecided were seen at 1,024 px on a 10 x 10 grid, and every
  crop drawn was looked at as players would see it, its edges at 3x on the original. 19 got a crop: 17 sure, which
  enter play cropped (`tools/fish_game.py --plan`: 17 to download), and 2 `unsure: ["crop"]` (a sliver at the edge).
  The 14 `dup` and the one out of the water stay out whatever the code: left as judged. The other 53 kept `k`: the
  look-alike overlaps or touches the subject, or the crop would be under 480 px wide in the original (the game's
  small size).
- **The 694 set aside are not re-judged**: no route takes them back. `autosort.js` `fishRun` never touches a photo already
  decided or logged (`seen`, log `r`), and `tools/fish_game.py` `in_play` keeps a `seen` photo out (`decided`,
  `gone_ids`). A crop reaches them, and his 65 adds, only through his curation (rule A1). His adds were counted, not
  changed: on 500 px sheets, a crop would clearly save about 14, and about 16 more with a tight crop (an estimate).
- 6 of the 19 carry an unanswered Check of the old reject (`?r`). Their answer compares with that stale proposal.
- When Pierre picks Full photo on such a photo, the other fish comes back while the code still reads one fish: its count
  is then his to set (Tags), as any tag.
- The gold-set scorer compares codes: a judge's code read on a crop differs from one read on the whole photo.
