# What a duplicate photo is: the fish `dup` extras looked at, and a proposed definition (2026-11-23)

Status: study, docs only (Linear REE-257, "Next action" steps 1 and 2). No judging record, data file, curation, sheet or
app code was changed. 100 `dup` photos were looked at beside their observation's `best`, the limit of rule P7, and none
was judged again. The photos are public iNaturalist images, downloaded at 500 px to a scratch directory outside the
repository and not kept. No API was searched. It is after 17:30 Manila (Rule 0): the questions are in section 4 and in
the PR, and none is asked in chat.

Labels (rule W11): **[measured]** counted by a script on the files of `main` @4a1aa353; **[looked]** my sort of the
100 pairs, one look each, no second judge; **[read]** read in a file or a rule; **[guess]** a judgement or an
extrapolation. Intervals are Wilson 95% intervals. They cover sampling error only, not the fuzzy edges of my sort.

## Why

Pierre, 2026-11-23 21:31 Manila (the issue): «qu'est-ce qu'on appelle réellement doublon? Si c'est une autre prise de
vue plus serrée ou plus large, est-ce que c'est vraiment un doublon? Ou est-ce que ça peut justement pas être une
variable, une variante utile? … si au final on se retrouve à écarter toutes les autres photos d'une même observation,
c'est un peu gênant.» The REE-252 study (PR #1504) found that 8,593 of the 10,494 further photos of multi-photo fish
observations (82%) were judged `dup` and stay out. The rubric (judging/FISH.md "Candidates", `keep`) lists another
side, phase, pose or light as `alt`, and a burst or the same framing as `dup`. Another zoom is in neither list. Q218
(2026-11-08): judge them with the others, see the duplicates, take them out.

## 1. Summary

- **Two thirds of the `dup` extras are not bursts.** Of 100 sampled pairs: a burst or the same framing 31 (23 to 41%),
  **another zoom 32 (24 to 42%)**, another angle, side or pose 29 (21 to 39%), other light 3, other 5 [looked].
  Another zoom is wider in 21 and closer in 11. Over the 8,583 sure `dup` extras, about **2,750 are another zoom**
  (2,030 to 3,580), and **5,240 another zoom or angle** (4,400 to 6,000) [guess: the sample's shares].
- **The current rubric already calls a third of them `alt`.** "Another side … pose … other light" is the `alt` list,
  and 32 of the 100 are just that [looked]. These `dup`s are mostly the weaker photo of the pair: mean ease 2.31
  against their best's 3.00 for another angle, and 1.66 against 2.44 for another zoom [measured]. So the judges seem
  to have read "adds something" as "is as good" [guess]. The definition below separates the two.
- **The recorded codes find most of them without an agent.** A `dup` whose code differs from its best's in size,
  whole or view is another zoom or angle in 41 of 48 sampled pairs (73 to 93%). Over all the extras that is 4,731
  photos, and 3,844 of them have a code that would let a sure `alt` into play [measured]. The other 3,852 have the
  same size, whole and view as their best. Only a look can sort those, and 21 of the 52 sampled (28 to 54%) differ.

## 2. The sample (step 1)

**Population.** `data/fish-cand.json` with `data/suggest.json` `"fish"` (`k` = keep, `u` = unsure). The population is
every further photo (not first in its observation, in file order, as in REE-252) judged `dup` with no unsure field:
**8,583** photos on 4,912 observations. With the 10 unsure ones that is REE-252's 8,593. Each has one `best` in its
observation [measured]. The draw was 100 photos, seed 257 (Python `random.Random(257).shuffle`).

**The look.** Each pair, best left and dup right, at iNaturalist's `medium` size (500 px, the judging sheets' size),
four pairs to a sheet. Each pair went to the first class that fits: B, a burst or the same framing (the fish moved a
little or turned its fins, at the same distance); Z, another zoom (the fish clearly larger or smaller in the frame);
A, another angle, side or pose (the other flank, head-on, from above, fins spread, hidden in a shelter); L, other
light (the same view under other light or colour); O, other. When a pair differed in two ways, the larger difference
decides [looked].

| Class | Pairs | Share (95% CI) | Of 8,583 (CI) | Dup ease / best ease (mean) | Code would enter play as `alt` |
| --- | ---: | --- | --- | --- | ---: |
| Burst or same framing | 31 | 31% (23 to 41) | ~2,660 | 2.00 / 2.13 | 25 |
| Another zoom (closer 11, wider 21) | 32 | 32% (24 to 42) | ~2,750 (2,030 to 3,580) | 1.66 / 2.44 | 22 |
| Another angle, side or pose | 29 | 29% (21 to 39) | ~2,490 (1,800 to 3,300) | 2.31 / 3.00 | 27 |
| Other light | 3 | 3% (1 to 9) | ~260 | 1.00 / 2.33 | 3 |
| Other | 5 | 5% (2 to 11) | ~430 | 1.60 / 1.40 | 3 |
| **Zoom or angle** | **61** | **61% (51 to 70)** | **~5,240 (4,400 to 6,000)** | | **49 (39 to 59%): ~4,210** |

"Code would enter play": the dup's recorded code has a count of `1`, `s` or `o` and no flag `a`. That is what a sure
`alt` needs (judging/FISH.md "What a sure judgement does") [read, measured]. The rest are out of the water, an
aquarium or measuring tank (`a`), or an unclear subject (`x`): 9 of the 100 are out of the water or in a tank.

**Typical pairs** (iNaturalist photo ids, dup / best, to open at `inaturalist.org/photos/<id>`):

- Burst or same framing: 682563722 / 682563692 (a lionfish, the same shot twice), 759736621 / 759736564 (a shrimp
  goby), 472495476 / 472495466 (a blenny in a bottle). A copy of the best with a red arrow drawn on it: 280081465 /
  280079122.
- Another zoom, closer: 481967571 / 481947946 (a whale shark, the flank and pectoral fin close), 724416221 /
  724416272 (a toby, the head and eye close). Wider: 635562052 / 635562017 (a goatfish school beside a trap),
  37355873 / 37355313 (a cardinalfish school over a reef flat).
- Another angle or pose: 55157629 / 42584787 (a frogfish head-on), 280939412 / 280938112 (a dragonet from the front,
  fins spread), 32306533 / 32306266 (a flathead from the side, the best from above).
- Other light: 639746473 / 639746416 (a frogfish in dim light). Other: 639973862 / 639973771 (the fish not in frame).

**What the codes can tell** [measured on the sample]:

| | Code differs from best (size, whole or view) | Same code |
| --- | ---: | ---: |
| Zoom or angle | 41 | 20 |
| Burst, light or other | 7 | 32 |

The size letter alone catches 19 of the 32 zooms. The view letter catches most changes of angle. A burst keeps its
best's code in 26 of 31.

## 3. A proposed definition (step 2)

One wording for every subject (rule S1), written on what it acts on: the second and later photos of one observation.
It is not applied. It is question (a) in section 4.

> **Several photos of one observation.** Judge each photo against the observation's `best` and the `alt`s already
> kept, on what it shows, never on how good it is: its code and ease say that.
> - `best`: the observation's most useful photo. Exactly one per observation (corals: per observation and view).
> - `alt`: the same animal or colony shown differently: another distance (closer, a detail the others do not show;
>   or wider, the animal smaller in its setting), another side, angle or pose, another phase, other light. A harder
>   photo can be an `alt`: its ease says it is harder.
> - `dup`: nothing the kept photos do not show: a burst, the same framing a few seconds or centimetres apart, the same
>   photo cropped, edited or annotated. Of two photos that differ from the kept ones in the same way, the better is
>   the `alt` and the other a `dup`.
>
> A photo whose subject cannot be made out is not a `dup`. Its code says so (fish and sea slugs: count `x`; corals:
> `exclude`).

**Where it goes.** judging/FISH.md "Candidates" `keep` (the definition replaces the two lists). judging/SEASLUG.md
`keep` already reads "as the fish's", so its words do not change. It applies only if the sea slugs take further photos
(REE-252 question (b)). judging/BRIEF.md (corals) `keep`: its `alt` already includes "another part of the colony,
another angle, the colony shape where the best shows the surface", so it gains the "never on how good it is" sentence
and the "same way" clause. The corals' main distances are separate views by design (rule P2). The definition could
live once as a photo rule in docs/rules/photos.md, with the three rubrics pointing to it. A new rule needs Pierre's OK
(docs/rules/README.md).

**What it would change** [read, guess where marked]:

- **Nothing until a pass.** Recorded `keep`s stay as they are.
- **In the game.** A sure `alt` enters play at any ease. An observation keeps one share of the draw whatever its photo
  count, and once any of its photos is shown the others lose the never-seen bonus (REE-252 section 2, `model.js`
  `photoSet`, `colonyMem`). So the extras add zoom and pose variety to observations the draw meets again. They do not
  add questions. Most of them are harder than their best (the ease column above).
- **On the fetch.** A further photo holds half an observation's room against its species' cap, and a sure `dup` frees
  it (`tools/fetch_fish.py` `obs_cost`, `sure_out`). About 4,200 new `alt`s would hold about 2,100 observations' worth
  of room. At the next refill, species near their cap would fetch fewer new observations [guess: how many species are
  at their cap was not counted].
- **The narrower choice** (option B in question (a)): only a closer zoom or another side becomes `alt`, and a wider
  photo stays `dup` unless the fish is still medium or large in the frame. That would take about a third of the
  zooms (11 of 32 are closer) [looked].

## 4. Questions for Pierre (not asked in chat, Rule 0)

**(a) What is a `dup`?** Context above. Options:

- A. The definition of section 3: another zoom, closer or wider, is an `alt`, and an `alt` is judged on what it shows,
  never on how good it is.
- B. Closer zoom and another side only; a wider shot stays `dup` unless the fish stays medium or large.
- C. Keep the rubric as it is, adding only that a `dup` is judged on what it shows.

Recommendation: **A**. It keeps the observations' extra views that his 21:05 and 21:31 words ask for, and their ease
already makes the draw show the harder ones later.

**(b) The pass (rule P7), if (a) is A or B.** It changes `keep` only, never a code. Three routes:

1. **Scripted, no agent:** every sure `dup` extra whose code differs from its best's in size, whole or view becomes
   `alt`. That is **4,731 photos** on 2,847 observations, of which 3,844 have a code that lets them into play. In the
   sample 41 of 48 of them (73 to 93%) are another zoom or angle, and the other 7 are bursts or other light. It needs
   no quota, only a script run of a few minutes. It is still a bulk change of judging records, so it waits for his OK.
   It misses the zooms and poses that kept their best's code.
2. **Agent, the remainder:** look again at the **3,852** sure `dup` extras with their best's code (2,752 observations,
   8,531 photos on their contact sheets), `keep` only. An agent is needed because the codes cannot tell a burst from
   a change of pose at the same size and view. In the sample, 21 of 52 differ, so about **1,560 more `alt`s** (1,090
   to 2,080). Cost [guess]: about 38 times this study's look of 100 pairs. That is some 710 to 800 contact sheets of
   12 tiles, several agent sessions.
3. **Agent, all of them:** look again at the 8,583 (4,912 observations, 14,441 photos on their sheets). This is the
   cleanest route, at under twice route 2's cost. Route 1's 7-in-48 bursts would then not come in.

Recommendation: **route 1 now** if he chooses A, then an agent check of 100 of its photos within P7 before they go to
the game. Route 2 only if he wants the last third. With option B, route 1 is narrowed to the dups whose size letter is
larger than their best's or whose view differs (to be counted then).

## Reproduce

Scripts in the session's scratch directory (`ree257/`), not committed. Inputs are the files of `main` @4a1aa353. Each
is run with `python3 -I`:

| Script | What it gives |
| --- | --- |
| `sample.py <worktree> sample.json 100 257` | the population (8,583) and the seeded sample, with each dup's and best's code and ease |
| `urls.py sample.json` | the 200 photo URLs at `medium` size, downloaded with `curl` to an empty directory |
| `pairs.py img sheets` | 25 sheets of 4 pairs, best left |
| `tally.py sample.json looked.json 8583` | section 2's table, intervals and examples; `looked.json` holds my class for each pair |
| `routes.py <worktree>` | section 4's route sizes over the whole population |
