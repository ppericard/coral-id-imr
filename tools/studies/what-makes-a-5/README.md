# What makes a 5: the session page and its data (REE-275, REE-8)

Pierre's review session on the objective criteria of an ease of 5, prepared on 2026-11-24 for the reference-poses study's
question (b) (`docs/reviews/2026-11-24-reference-poses.md`, PR #1538). Kept here so his answers can be read back once
the scratchpad is gone (gold set 2's file was lost that way, REE-8). Reference only: not wired into CI.

**What it shows.** 46 photos in play whose recorded tags all read the reference look: 31 the judge typed 4 (13 fish in
profile, 3 Soles from above, 15 sea slugs) and 15 typed 5 as anchors. Corals have no ease, so none are shown. Nine
explicit criteria come first, the same for every photo (pose by body shape, whole, key characters, sharp, size,
colours, light, background, one subject). Each photo then shows every criterion marked ✓ or ✗ with a few words, the
grade the marks give (5 minus the number of ✗) and the grade the judge typed. Pierre agrees or disagrees per line or
for the photo (Pierre, 14:56: «J'ai besoin de critères explicites et de pré-jugement pour voir si je suis d'accord ou
pas»).

**Files.**

| File | What |
| --- | --- |
| `select.py` | draws the photos from the recorded codes, seeded (20261124) and stratified; nobody looked at a photo to choose it: `python3 -B -I tools/studies/what-makes-a-5/select.py . out.json` reproduces `set.json` on `main` of 2026-11-24 |
| `set.json` | the 46 photos: number, id, subject, entry, species, code, typed ease, R2 URLs |
| `prejudge.json` | the marks by eye: C3 and C8 (not in the tags), and every place the eye overrules a tag (checked on the 1,600 px file); one agent's reading, for this session only |
| `review.tpl.html`, `build.py` | the page: `python3 -B -I tools/studies/what-makes-a-5/build.py /path/out.html` (one file, photos from R2, mobile-first; never commit the built page) |
| `answers.py` | reads his answers back |

**Reading the answers back.** The page's "Copy answers" gives one line per photo he touched:
`n;photo id;marks;typed;A` when every mark is right and the photo deserves the marks' grade, otherwise
`n;photo id;marks;typed;D=C1:word|C8:word;G=his grade;N=note`. Dictated answers (`12 C1 non, il est de profil`) are
written in the same form by hand. Then `python3 -B -I tools/studies/what-makes-a-5/answers.py answers.txt` prints a
table (photo, marks, typed, his grade, the criteria he disagrees with, his words) and, per criterion, how often he
disagreed among the typed 4s and the typed 5s: the criteria he confirms and those where the pre-judgement goes wrong.
